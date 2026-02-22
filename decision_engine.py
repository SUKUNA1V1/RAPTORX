import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"]  = "2"

import hashlib
import json
import logging
import threading
import numpy as np
import joblib
import tensorflow as tf
from tensorflow import keras
from datetime import datetime, timezone
from model_registry import resolve_model_artifact_path
import warnings
warnings.filterwarnings("ignore")

# ============================================================
# DECISION ENGINE
# ============================================================
# Purpose: Combine model outputs and business rules into final access decisions.
class AccessDecisionEngine:
    """
    Combines Isolation Forest + Autoencoder to make
    real-time access control decisions.

    Decision thresholds (configurable):
        risk_score < GRANT_THRESHOLD  → GRANTED
        risk_score < DENY_THRESHOLD   → DELAYED
        risk_score >= DENY_THRESHOLD  → DENIED
    
    Thread Safety:
        - Model loading protected by class-level lock (one-time initialization)
        - Predictions protected by instance-level RLock (re-entrant for nested calls)
        - Audit logging wrapped in try/except to prevent exceptions from blocking access flow
    """

    # Default thresholds — can be overridden via env vars or DB
    GRANT_THRESHOLD = float(os.getenv("GRANT_THRESHOLD", "0.30"))
    DENY_THRESHOLD  = float(os.getenv("DENY_THRESHOLD",  "0.60"))

    # Ensemble weights (from Phase 4.5 best result)
    IF_WEIGHT = 0.3
    AE_WEIGHT = 0.7
    EXPECTED_FEATURE_COUNT = 19
    MODEL_FEATURE_COUNT = 13
    
    # Class-level lock for thread-safe model initialization
    _init_lock = threading.Lock()
    _initialized = False

    def __init__(self, models_dir="ml/models"):
        self.models_dir  = models_dir
        self.if_model    = None
        self.ae_model    = None
        self.if_data     = None
        self.ae_config   = None
        self.is_loaded   = False
        # Instance-level RLock for thread-safe predictions (allows re-entrant access)
        self._predict_lock = threading.RLock()
        self.audit_logger = self._build_audit_logger()
        self._validate_thresholds()
        # Load models with thread safety using double-checked locking pattern
        with AccessDecisionEngine._init_lock:
            if not AccessDecisionEngine._initialized:
                self.load_models()
                AccessDecisionEngine._initialized = True
            else:
                # Models already loaded by another thread, verify they're accessible
                self._load_models_verify()

    def _build_audit_logger(self) -> logging.Logger:
        logger = logging.getLogger("raptorx.local_access_audit")
        if logger.handlers:
            return logger

        logs_dir = "logs"
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, "access_decisions_audit.log")

        logger.setLevel(logging.INFO)
        handler = logging.FileHandler(log_path, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        logger.propagate = False
        return logger

    def _hash_features(self, values: list | None) -> str | None:
        if values is None:
            return None
        try:
            arr = np.asarray(values, dtype=float)
            payload = ",".join(f"{v:.6f}" for v in arr.tolist())
            return hashlib.sha256(payload.encode("utf-8")).hexdigest()
        except Exception:
            return None

    def _emit_audit(
        self,
        event_type: str,
        decision: dict,
        features: list | None = None,
        raw_features: list | None = None,
        audit_context: dict | None = None,
    ) -> None:
        try:
            entry = {
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "event_type": event_type,
                "decision": decision.get("decision"),
                "risk_score": decision.get("risk_score"),
                "if_score": decision.get("if_score"),
                "ae_score": decision.get("ae_score"),
                "mode": decision.get("mode"),
                "reasoning": decision.get("reasoning"),
                "thresholds": decision.get("thresholds", {}),
                "features_scaled_len": len(features) if features is not None else None,
                "features_raw_len": len(raw_features) if raw_features is not None else None,
                "features_scaled_sha256": self._hash_features(features),
                "features_raw_sha256": self._hash_features(raw_features),
                "context": audit_context or {},
            }
            self.audit_logger.info(json.dumps(entry, ensure_ascii=False))
        except Exception:
            pass

    def _validate_thresholds(self) -> None:
        if not (0.0 <= self.GRANT_THRESHOLD <= 1.0):
            raise ValueError(f"GRANT_THRESHOLD must be in [0, 1], got {self.GRANT_THRESHOLD}")
        if not (0.0 <= self.DENY_THRESHOLD <= 1.0):
            raise ValueError(f"DENY_THRESHOLD must be in [0, 1], got {self.DENY_THRESHOLD}")
        if self.GRANT_THRESHOLD >= self.DENY_THRESHOLD:
            raise ValueError(
                f"GRANT_THRESHOLD ({self.GRANT_THRESHOLD}) must be smaller than DENY_THRESHOLD ({self.DENY_THRESHOLD})"
            )

    def _load_models_verify(self) -> None:
        """Verify models from first initialization are accessible (for concurrent initialization)."""
        try:
            if_path = resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest", self.models_dir)
            self.if_data = joblib.load(if_path)
            self.if_model = self.if_data["model"]
            
            ae_path = resolve_model_artifact_path("autoencoder.keras", "autoencoder", self.models_dir)
            ae_cfg_path = resolve_model_artifact_path("autoencoder_config.pkl", "autoencoder", self.models_dir)
            self.ae_model = keras.models.load_model(ae_path)
            self.ae_config = joblib.load(ae_cfg_path)
            
            self.is_loaded = bool(self.if_model and self.ae_model)
        except Exception as e:
            print(f"Warning: Failed to verify model loading after concurrent init: {e}")
            self.is_loaded = False

    def _validate_features(self, features, name: str) -> list[float]:
        if features is None:
            raise ValueError(f"{name} cannot be None")

        if not isinstance(features, (list, tuple, np.ndarray)):
            raise TypeError(f"{name} must be a list/tuple/ndarray, got {type(features).__name__}")

        if len(features) != self.EXPECTED_FEATURE_COUNT:
            raise ValueError(
                f"{name} must contain exactly {self.EXPECTED_FEATURE_COUNT} values, got {len(features)}"
            )

        try:
            arr = np.asarray(features, dtype=float)
        except Exception as exc:
            raise ValueError(f"{name} contains non-numeric values") from exc

        if not np.isfinite(arr).all():
            raise ValueError(f"{name} contains NaN or infinite values")

        return arr.tolist()

    # ============================================================
    # LOAD MODELS
    # ============================================================
    # Purpose: Load model artifacts and configure runtime fallback mode.
    def load_models(self):
        print("Loading ML models...")
        errors = []

        # Load Isolation Forest
        try:
            if_path       = resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest", self.models_dir)
            self.if_data  = joblib.load(if_path)
            self.if_model = self.if_data["model"]
            print(f"  Isolation Forest loaded")
        except Exception as e:
            errors.append(f"Isolation Forest: {e}")
            print(f"  Isolation Forest failed: {e}")

        # Load Autoencoder
        try:
            ae_path        = resolve_model_artifact_path("autoencoder.keras", "autoencoder", self.models_dir)
            ae_config_path = resolve_model_artifact_path("autoencoder_config.pkl", "autoencoder", self.models_dir)
            self.ae_model  = keras.models.load_model(ae_path)
            self.ae_config = joblib.load(ae_config_path)
            print(f"  Autoencoder loaded")
        except Exception as e:
            errors.append(f"Autoencoder: {e}")
            print(f"  Autoencoder failed: {e}")

        if self.if_model and self.ae_model:
            self.is_loaded = True
            print("All models loaded — full ensemble active\n")
        elif self.if_model:
            self.is_loaded = True
            print("Only Isolation Forest loaded — running single model\n")
        elif self.ae_model:
            self.is_loaded = True
            print("Only Autoencoder loaded — running single model\n")
        else:
            print("No models loaded — falling back to rule-based decisions\n")

    # ============================================================
    # BADGE CLONING DETECTOR (Quick Win #3)
    # ============================================================
    # Purpose: Add dedicated high-confidence checks for cloned badge behavior.
    def detect_badge_cloning(self, features: list) -> dict:
        """
        Specialized detector for physically impossible travel scenarios.
        Uses all 19 features including direct location/velocity data.
        Returns cloning probability and reason.
        """
        # Features 0-12: core features
        (hour, day_of_week, is_weekend, access_frequency_24h,
         time_since_last_access_min, location_match, role_level,
         is_restricted_area, is_first_access_today,
         sequential_zone_violation, access_attempt_count,
         time_of_week, hour_deviation_from_norm) = features[:13]
        
        # Features 13-18: location/velocity features
        (geographic_impossibility, distance_between_scans_km,
         velocity_km_per_min, zone_clearance_mismatch,
         department_zone_mismatch, concurrent_session_detected) = features[13:19]
        
        cloning_score = 0.0
        reasons = []
        
        # HARD RULE 1: Concurrent session = definitive cloning (100% confidence)
        if concurrent_session_detected:
            cloning_score += 0.95
            reasons.append("CRITICAL: Badge used simultaneously at multiple locations")
        
        # HARD RULE 2: Impossible velocity (physically impossible travel)
        if velocity_km_per_min > 1.0:  # > 60 km/h is impossible for humans
            cloning_score += 0.85
            reasons.append(f"CRITICAL: Impossible velocity {velocity_km_per_min:.1f} km/min (>60 km/h)")
        
        # HARD RULE 3: Geographic impossibility flag
        if geographic_impossibility:
            cloning_score += 0.70
            reasons.append(f"Physical impossibility detected (distance: {distance_between_scans_km:.1f} km)")
        
        # Rule 4: Very short gap + location mismatch
        if time_since_last_access_min and time_since_last_access_min < 3 and not location_match:
            cloning_score += 0.50
            reasons.append(f"Location change in {time_since_last_access_min} min")
        
        # Rule 5: High frequency + short gaps
        if access_frequency_24h > 15 and time_since_last_access_min and time_since_last_access_min < 5:
            cloning_score += 0.40
            reasons.append("Abnormally rapid repeated access")
        
        # Rule 6: Zone clearance violation
        if zone_clearance_mismatch:
            cloning_score += 0.35
            reasons.append("Insufficient clearance for zone")
        
        return {
            "is_cloning": cloning_score > 0.5,
            "cloning_score": min(cloning_score, 1.0),
            "reasons": reasons
        }

    # ============================================================
    # COMPUTE RISK SCORE
    # ============================================================
    # Purpose: Compute normalized model risk scores and combine them.
    def compute_risk_score(self, features: list) -> dict:
        """
        Compute ensemble risk score from feature vector.

        Args:
            features: list of 19 values in FEATURE_COLS order
            (models expect only first 13 for ML scoring)

        Returns:
            dict with if_score, ae_score, combined_score
        """
        validated_features = self._validate_features(features, "features")

        # Extract only first 13 features for the ML models
        X = np.array(validated_features[:self.MODEL_FEATURE_COUNT]).reshape(1, -1)

        if_score = None
        ae_score = None

        # Isolation Forest score
        if self.if_model:
            try:
                raw       = self.if_model.decision_function(X)[0]
                min_s     = self.if_data["min_score"]
                max_s     = self.if_data["max_score"]
                if_score  = float(np.clip(1 - (raw - min_s) / (max_s - min_s), 0, 1))
            except Exception as e:
                print(f"IF scoring failed: {e}")

        # Autoencoder score
        if self.ae_model:
            try:
                recon     = self.ae_model.predict(X, verbose=0)
                error     = float(np.mean(np.power(X - recon, 2)))
                min_e     = self.ae_config["min_error"]
                max_e     = self.ae_config["max_error"]
                ae_score  = float(np.clip((error - min_e) / (max_e - min_e), 0, 1))
            except Exception as e:
                print(f"AE scoring failed: {e}")

        # Combine scores
        if if_score is not None and ae_score is not None:
            combined = self.IF_WEIGHT * if_score + self.AE_WEIGHT * ae_score
            mode     = "ensemble"
        elif if_score is not None:
            combined = if_score
            mode     = "isolation_forest_only"
        elif ae_score is not None:
            combined = ae_score
            mode     = "autoencoder_only"
        else:
            combined = None
            mode     = "rule_based"

        return {
            "if_score":       round(if_score,  4) if if_score  is not None else None,
            "ae_score":       round(ae_score,  4) if ae_score  is not None else None,
            "combined_score": round(combined,  4) if combined  is not None else None,
            "mode":           mode
        }

    # ============================================================
    # RULE-BASED FALLBACK
    # ============================================================
    # Purpose: Provide deterministic scoring when ML models are unavailable.
    def rule_based_score(self, features: list) -> float:
        """
        Rule-based scoring using all 19 features.
        Returns a risk score between 0-1.
        """
        validated_features = self._validate_features(features, "features")

        # Features 0-12: core
        (hour, day_of_week, is_weekend, access_frequency_24h,
         time_since_last_access_min, location_match, role_level,
         is_restricted_area, is_first_access_today,
         sequential_zone_violation, access_attempt_count,
         time_of_week, hour_deviation_from_norm) = validated_features[:13]
        
        # Features 13-18: location/velocity
        (geographic_impossibility, distance_between_scans_km,
         velocity_km_per_min, zone_clearance_mismatch,
         department_zone_mismatch, concurrent_session_detected) = validated_features[13:19]

        score = 0.0

        # Hard rules (high confidence)
        if concurrent_session_detected:
            score += 0.90
        if velocity_km_per_min > 1.0:
            score += 0.80
        if geographic_impossibility:
            score += 0.70
        
        # Medium confidence rules
        if hour < 6 or hour > 22:
            score += 0.35
        if is_weekend and role_level == 1:
            score += 0.20
        if not location_match:
            score += 0.20
        if is_restricted_area and role_level < 3:
            score += 0.30
        if zone_clearance_mismatch:
            score += 0.25
        if access_frequency_24h > 10:
            score += 0.25
        if time_since_last_access_min and time_since_last_access_min < 5:
            score += 0.30
        if sequential_zone_violation:
            score += 0.20
        if access_attempt_count > 2:
            score += 0.15
        if department_zone_mismatch:
            score += 0.15

        return float(np.clip(score, 0.0, 1.0))

    # ============================================================
    # MAKE DECISION
    # ============================================================
    # Purpose: Convert risk scores into granted, delayed, or denied outcomes.
    def decide(self, features: list, features_unscaled: list = None, audit_context: dict | None = None) -> dict:
        """
        Main decision function — called for every access attempt (THREAD-SAFE).
        
        Args:
            features: list of 19 scaled values
            features_unscaled: list of 19 unscaled values (for hard rule violations)
            audit_context: Optional dict with request context for audit trail

        Returns:
            dict with decision, risk_score, reasoning, etc.
        
        Note: ML model predictions are protected by re-entrant lock to ensure
        thread-safe access to model instances. Hard rules and validation run
        without locks as they are stateless.
        """
        # Validate inputs (quick path, no lock needed)
        validated_scaled = self._validate_features(features, "features")

        # Use unscaled features for hard physical rules
        if features_unscaled is None:
            validated_unscaled = validated_scaled
        else:
            validated_unscaled = self._validate_features(features_unscaled, "features_unscaled")
        
        # HARD RULES FIRST — these override all threshold logic (stateless, no lock needed)
        # These use UNSCALED values (raw physical measurements)
        if len(validated_unscaled) >= self.EXPECTED_FEATURE_COUNT:
            concurrent_session = validated_unscaled[18]
            velocity_km_per_min = validated_unscaled[15]
            
            if concurrent_session:
                result = {
                    "decision":    "denied",
                    "risk_score":  1.0,
                    "if_score":    None,
                    "ae_score":    None,
                    "reasoning":   "HARD RULE VIOLATION: Badge used simultaneously at multiple locations",
                    "mode":        "hard_rule",
                    "thresholds": {
                        "grant": self.GRANT_THRESHOLD,
                        "deny":  self.DENY_THRESHOLD
                    }
                }
                self._emit_audit(
                    event_type="decision_hard_rule",
                    decision=result,
                    features=validated_scaled,
                    raw_features=validated_unscaled,
                    audit_context=audit_context,
                )
                return result
            
            if velocity_km_per_min > 1.0:
                result = {
                    "decision":    "denied",
                    "risk_score":  1.0,
                    "if_score":    None,
                    "ae_score":    None,
                    "reasoning":   f"HARD RULE VIOLATION: Impossible velocity {velocity_km_per_min:.1f} km/min (>60 km/h)",
                    "mode":        "hard_rule",
                    "thresholds": {
                        "grant": self.GRANT_THRESHOLD,
                        "deny":  self.DENY_THRESHOLD
                    }
                }
                self._emit_audit(
                    event_type="decision_hard_rule",
                    decision=result,
                    features=validated_scaled,
                    raw_features=validated_unscaled,
                    audit_context=audit_context,
                )
                return result
        
        # CRITICAL SECTION: Model prediction (protected by re-entrant lock)
        with self._predict_lock:
            # Get scores
            scores = self.compute_risk_score(validated_scaled)

        # Fallback to rule-based if models unavailable
        if scores["combined_score"] is None:
            risk_score = self.rule_based_score(validated_scaled)
            mode       = "rule_based"
        else:
            risk_score = scores["combined_score"]
            mode       = scores["mode"]

        # Apply decision thresholds
        if risk_score < self.GRANT_THRESHOLD:
            decision  = "granted"
            reasoning = f"Risk score {risk_score:.4f} below grant threshold {self.GRANT_THRESHOLD}"
        elif risk_score < self.DENY_THRESHOLD:
            decision  = "delayed"
            reasoning = f"Risk score {risk_score:.4f} in delay zone — guard notified"
        else:
            decision  = "denied"
            reasoning = f"Risk score {risk_score:.4f} above deny threshold {self.DENY_THRESHOLD}"

        result = {
            "decision":    decision,
            "risk_score":  round(risk_score, 4),
            "if_score":    scores["if_score"],
            "ae_score":    scores["ae_score"],
            "reasoning":   reasoning,
            "mode":        mode,
            "thresholds": {
                "grant": self.GRANT_THRESHOLD,
                "deny":  self.DENY_THRESHOLD
            }
        }
        self._emit_audit(
            event_type="decision",
            decision=result,
            features=validated_scaled,
            raw_features=validated_unscaled,
            audit_context=audit_context,
        )
        return result

    # ============================================================
    # STATUS
    # ============================================================
    # Purpose: Expose runtime readiness and threshold configuration.
    def status(self) -> dict:
        return {
            "is_loaded":        self.is_loaded,
            "isolation_forest": self.if_model is not None,
            "autoencoder":      self.ae_model is not None,
            "mode":             "ensemble" if (self.if_model and self.ae_model)
                                else "single_model" if self.is_loaded
                                else "rule_based",
            "grant_threshold":  self.GRANT_THRESHOLD,
            "deny_threshold":   self.DENY_THRESHOLD,
            "if_weight":        self.IF_WEIGHT,
            "ae_weight":        self.AE_WEIGHT,
        }


# ============================================================
# TEST THE DECISION ENGINE
# ============================================================
# Purpose: Run local smoke tests that demonstrate expected decision behavior.
if __name__ == "__main__":

    print("=" * 60)
    print("Testing Decision Engine")
    print("=" * 60)

    engine = AccessDecisionEngine()
    print("Engine status:", engine.status())

    # Feature order (19 features):
    # [0-12]  Core: hour, day_of_week, is_weekend, access_frequency_24h,
    #        time_since_last_access_min, location_match, role_level,
    #        is_restricted_area, is_first_access_today, sequential_zone_violation,
    #        access_attempt_count, time_of_week, hour_deviation_from_norm
    # [13-18] Location/Velocity: geographic_impossibility, distance_between_scans_km,
    #        velocity_km_per_min, zone_clearance_mismatch, department_zone_mismatch,
    #        concurrent_session_detected
    
    # Create a scaler from raw training data to normalize test features
    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler
    
    FEATURE_COLS_19 = [
        "hour", "day_of_week", "is_weekend", "access_frequency_24h",
        "time_since_last_access_min", "location_match", "role_level",
        "is_restricted_area", "is_first_access_today", "sequential_zone_violation",
        "access_attempt_count", "time_of_week", "hour_deviation_from_norm",
        "geographic_impossibility", "distance_between_scans_km", "velocity_km_per_min",
        "zone_clearance_mismatch", "department_zone_mismatch", "concurrent_session_detected"
    ]
    
    # Fit scaler on RAW training data (from data/raw, not data/processed)
    train_df = pd.read_csv(os.path.join("data/raw", "train.csv"))
    X_train = train_df[FEATURE_COLS_19].values
    scaler = MinMaxScaler()
    scaler.fit(X_train)  # Fit on raw data to get correct min/max ranges

    test_cases = [
        {
            "name":     "Normal employee @ 9AM weekday",
            "features": [9, 0, 0, 3, 120, 1, 1, 0, 1, 0, 0, 9, 0.5, 0, 0.2, 0.002, 0, 0, 0]
        },
        {
            "name":     "Admin @ server room (normal)",
            "features": [10, 1, 0, 2, 180, 1, 3, 1, 0, 0, 0, 34, 0.3, 0, 0.3, 0.002, 0, 0, 0]
        },
        {
            "name":     "After hours 2AM access",
            "features": [2, 1, 0, 8, 15, 0, 1, 1, 0, 1, 3, 26, 5.0, 0, 0.5, 0.033, 1, 1, 0]
        },
        {
            "name":     "Badge cloning - 2min gap, 50km travel",
            "features": [9, 0, 0, 18, 2, 0, 1, 0, 0, 1, 5, 9, 4.0, 1, 50.0, 25.0, 0, 0, 1]
        },
        {
            "name":     "CRITICAL - Impossible velocity 120km/min",
            "features": [14, 2, 0, 12, 1, 0, 2, 0, 0, 1, 4, 38, 3.5, 1, 120.0, 120.0, 1, 0, 0]
        },
        {
            "name":     "CRITICAL - Concurrent session detected",
            "features": [9, 5, 1, 15, 3, 0, 1, 1, 0, 1, 4, 53, 6.0, 0, 10.0, 3.33, 1, 1, 1]
        },
    ]

    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)

    for case in test_cases:
        # Scale test features using the 13-feature scaler
        features_scaled = scaler.transform([case["features"]])[0].tolist()
        # Pass BOTH scaled (for ML models) and unscaled (for hard rules)
        result = engine.decide(features_scaled, features_unscaled=case["features"])

        print(f"\n{case['name']}")
        print(f"  Decision   : {result['decision'].upper()}")
        print(f"  Risk Score : {result['risk_score']:.4f}")
        print(f"  IF Score   : {result['if_score']}")
        print(f"  AE Score   : {result['ae_score']}")
        print(f"  Mode       : {result['mode']}")
        print(f"  Reasoning  : {result['reasoning']}")

    print("\nPhase 4.6 COMPLETE — Decision Engine ready!")
    print("Ready for Phase 4.7 — Integrate into FastAPI backend!")