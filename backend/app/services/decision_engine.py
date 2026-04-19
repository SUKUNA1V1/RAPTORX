import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import hashlib
import json
import logging
import threading
import numpy as np
import joblib
import tensorflow as tf
from tensorflow import keras
from datetime import datetime, timezone
import warnings
warnings.filterwarnings("ignore")

try:
    from model_registry import resolve_model_artifact_path
except Exception:
    def resolve_model_artifact_path(artifact_filename: str, model_key: str | None = None, models_dir: str = "ml/models") -> str:
        return os.path.join(models_dir, artifact_filename)


class AccessDecisionEngine:
    """
    Combines Isolation Forest + Autoencoder to make
    real-time access control decisions.

    Decision thresholds (loaded from model files, with env var override):
        risk_score < grant_threshold  -> GRANTED
        risk_score < deny_threshold   -> DELAYED
        risk_score >= deny_threshold  -> DENIED
    
    Thread Safety:
        - Model loading protected by class-level lock (one-time initialization)
        - Predictions protected by instance-level RLock (re-entrant for nested calls)
        - Safe for concurrent FastAPI requests
    """

    IF_WEIGHT = 0.3
    AE_WEIGHT = 0.7
    
    # Class-level lock for thread-safe model initialization
    _init_lock = threading.Lock()
    _initialized = False

    def __init__(self, models_dir=None):
        if models_dir is None:
            base = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            )
            models_dir = os.path.join(base, "ml", "models")
        self.models_dir = models_dir
        self.if_model = None
        self.ae_model = None
        self.if_data = None
        self.ae_config = None
        self.is_loaded = False
        # Instance-level thresholds (loaded from model files)
        self.grant_threshold = 0.30
        self.deny_threshold = 0.70
        # Instance-level RLock for thread-safe predictions (allows re-entrant access)
        self._predict_lock = threading.RLock()
        self.audit_logger = self._build_audit_logger()
        # Load models with thread safety using double-checked locking pattern
        with AccessDecisionEngine._init_lock:
            if not AccessDecisionEngine._initialized:
                self.load_models()
                self._load_thresholds()
                AccessDecisionEngine._initialized = True
            else:
                # Models already loaded by another thread, verify they're accessible
                self._load_models_verify()
                self._load_thresholds()

    def _build_audit_logger(self) -> logging.Logger:
        logger = logging.getLogger("raptorx.access_audit")
        if logger.handlers:
            return logger

        base = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )
        logs_dir = os.path.join(base, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, "access_decisions_audit.log")

        logger.setLevel(logging.INFO)
        handler = logging.FileHandler(log_path, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        logger.propagate = False
        return logger

    def _hash_features(self, values: list | None) -> str | None:
        """Hash feature vector for audit purposes.
        
        Silently returns None on error to prevent audit hashing from blocking access decisions.
        Logs error for debugging purposes.
        """
        if values is None:
            return None
        try:
            arr = np.asarray(values, dtype=float)
            payload = ",".join(f"{v:.6f}" for v in arr.tolist())
            return hashlib.sha256(payload.encode("utf-8")).hexdigest()
        except Exception as e:
            logging.warning(f"Failed to hash features: {e}", exc_info=False)
            return None

    def _emit_audit(
        self,
        event_type: str,
        decision: dict,
        features: list | None = None,
        raw_features: list | None = None,
        audit_context: dict | None = None,
    ) -> None:
        """Emit audit log entry for decision tracking.
        
        Silently fails on errors to prevent audit logging from blocking access decisions.
        Logs errors for debugging and monitoring.
        """
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
        except Exception as e:
            # Never fail access flow because of audit logging errors, but log the failure
            logging.error(f"Audit logging failed: {e}", exc_info=False)

    def load_models(self):
        print("Loading ML models...")
        errors = []

        try:
            if_path = resolve_model_artifact_path("isolation_forest.pkl", "isolation_forest", self.models_dir)
            self.if_data = joblib.load(if_path)
            self.if_model = self.if_data["model"]
            print("Isolation Forest loaded")
        except Exception as e:
            errors.append(f"Isolation Forest: {e}")
            print(f"Isolation Forest failed: {e}")

        try:
            ae_path = resolve_model_artifact_path("autoencoder.keras", "autoencoder", self.models_dir)
            ae_cfg_path = resolve_model_artifact_path("autoencoder_config.pkl", "autoencoder", self.models_dir)
            self.ae_model = keras.models.load_model(ae_path)
            self.ae_config = joblib.load(ae_cfg_path)
            print("Autoencoder loaded")
        except Exception as e:
            errors.append(f"Autoencoder: {e}")
            print(f"Autoencoder failed: {e}")

        if self.if_model and self.ae_model:
            self.is_loaded = True
            print("All models loaded - full ensemble active")
        elif self.if_model:
            self.is_loaded = True
            print("Only Isolation Forest loaded - single model")
        elif self.ae_model:
            self.is_loaded = True
            print("Only Autoencoder loaded - single model")
        else:
            print("No models loaded - rule-based decisions")

    def _load_thresholds(self) -> None:
        """Load optimized thresholds from saved model files with env var override."""
        default_grant = 0.30
        default_deny = 0.70
        
        # Try to load from ensemble config first
        try:
            ensemble_path = resolve_model_artifact_path("ensemble_config.pkl", "ensemble", self.models_dir)
            if os.path.exists(ensemble_path):
                ensemble = joblib.load(ensemble_path)
                loaded_grant = ensemble.get("best_threshold") or ensemble.get("grant_threshold")
                loaded_deny = ensemble.get("deny_threshold")
                
                if loaded_grant is not None:
                    self.grant_threshold = float(loaded_grant)
                    print(f"Loaded grant threshold from ensemble_config: {self.grant_threshold:.2f}")
                
                if loaded_deny is not None:
                    self.deny_threshold = float(loaded_deny)
                    print(f"Loaded deny threshold from ensemble_config: {self.deny_threshold:.2f}")
                
                if loaded_grant is not None or loaded_deny is not None:
                    # Validate that grant < deny
                    if self.grant_threshold >= self.deny_threshold:
                        print(f"⚠ Warning: grant_threshold ({self.grant_threshold}) >= deny_threshold ({self.deny_threshold})")
                        self.deny_threshold = min(0.99, self.grant_threshold + 0.25)
                        print(f"  Adjusted deny_threshold to: {self.deny_threshold:.2f}")
                    return
        except Exception as e:
            print(f"Could not load ensemble thresholds: {e}")
        
        # Fall back to isolation forest
        if self.if_data:
            loaded_grant = self.if_data.get("best_threshold")
            loaded_deny = self.if_data.get("deny_threshold")
            
            if loaded_grant is not None:
                self.grant_threshold = float(loaded_grant)
                print(f"Loaded grant threshold from isolation_forest: {self.grant_threshold:.2f}")
            
            if loaded_deny is not None:
                self.deny_threshold = float(loaded_deny)
                print(f"Loaded deny threshold from isolation_forest: {self.deny_threshold:.2f}")
            
            if loaded_grant is not None or loaded_deny is not None:
                # Validate that grant < deny
                if self.grant_threshold >= self.deny_threshold:
                    print(f"⚠ Warning: grant_threshold ({self.grant_threshold}) >= deny_threshold ({self.deny_threshold})")
                    self.deny_threshold = min(0.99, self.grant_threshold + 0.25)
                    print(f"  Adjusted deny_threshold to: {self.deny_threshold:.2f}")
                return
        
        # Allow env var override for both thresholds
        env_grant = os.getenv("DECISION_THRESHOLD_GRANT") or os.getenv("GRANT_THRESHOLD")
        env_deny = os.getenv("DECISION_THRESHOLD_DENY") or os.getenv("DENY_THRESHOLD")
        
        if env_grant:
            self.grant_threshold = float(env_grant)
            print(f"Override grant threshold from env var: {self.grant_threshold:.2f}")
        
        if env_deny:
            self.deny_threshold = float(env_deny)
            print(f"Override deny threshold from env var: {self.deny_threshold:.2f}")
        
        # Final validation
        if self.grant_threshold >= self.deny_threshold:
            print(f"⚠ Warning: grant_threshold ({self.grant_threshold}) >= deny_threshold ({self.deny_threshold})")
            self.deny_threshold = min(0.99, self.grant_threshold + 0.25)
            print(f"  Adjusted deny_threshold to: {self.deny_threshold:.2f}")
        
        # If nothing loaded, use defaults
        if self.grant_threshold == 0.30 and self.deny_threshold == 0.70:
            print(f"Using default thresholds: grant={default_grant}, deny={default_deny}")

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

    def compute_risk_score(self, features: list) -> dict:
        X = np.array(features).reshape(1, -1)

        if_score = None
        ae_score = None

        if self.if_model:
            try:
                raw = self.if_model.decision_function(X)[0]
                min_s = self.if_data["min_score"]
                max_s = self.if_data["max_score"]
                if_score = float(np.clip(1 - (raw - min_s) / (max_s - min_s), 0, 1))
            except Exception as e:
                print(f"IF scoring failed: {e}")

        if self.ae_model:
            try:
                recon = self.ae_model.predict(X, verbose=0)
                error = float(np.mean(np.power(X - recon, 2)))
                min_e = self.ae_config["min_error"]
                max_e = self.ae_config["max_error"]
                ae_score = float(np.clip((error - min_e) / (max_e - min_e), 0, 1))
            except Exception as e:
                print(f"AE scoring failed: {e}")

        if if_score is not None and ae_score is not None:
            combined = self.IF_WEIGHT * if_score + self.AE_WEIGHT * ae_score
            mode = "ensemble"
        elif if_score is not None:
            combined = if_score
            mode = "isolation_forest_only"
        elif ae_score is not None:
            combined = ae_score
            mode = "autoencoder_only"
        else:
            combined = None
            mode = "rule_based"

        return {
            "if_score": round(if_score, 4) if if_score is not None else None,
            "ae_score": round(ae_score, 4) if ae_score is not None else None,
            "combined_score": round(combined, 4) if combined is not None else None,
            "mode": mode,
        }

    def rule_based_score(self, features: list) -> float:
        (
            hour,
            day_of_week,
            is_weekend,
            access_frequency_24h,
            time_since_last_access_min,
            location_match,
            role_level,
            is_restricted_area,
            is_first_access_today,
            sequential_zone_violation,
            access_attempt_count,
            time_of_week,
            hour_deviation_from_norm,
        ) = features

        score = 0.0

        if hour < 6 or hour > 22:
            score += 0.35
        if is_weekend and role_level == 1:
            score += 0.20
        if not location_match:
            score += 0.20
        if is_restricted_area and role_level < 3:
            score += 0.30
        if access_frequency_24h > 10:
            score += 0.25
        if time_since_last_access_min is not None and time_since_last_access_min < 5:
            score += 0.30
        if sequential_zone_violation:
            score += 0.20
        if access_attempt_count > 2:
            score += 0.15

        return float(np.clip(score, 0.0, 1.0))

    @staticmethod
    def _clone_risk_bump(features: list) -> float:
        (
            hour,
            day_of_week,
            is_weekend,
            access_frequency_24h,
            time_since_last_access_min,
            location_match,
            role_level,
            is_restricted_area,
            is_first_access_today,
            sequential_zone_violation,
            access_attempt_count,
            time_of_week,
            hour_deviation_from_norm,
        ) = features

        bump = 0.0
        if time_since_last_access_min is not None and time_since_last_access_min < 5 and sequential_zone_violation:
            bump += 0.25
        if time_since_last_access_min is not None and time_since_last_access_min < 5 and not location_match:
            bump += 0.15
        if time_since_last_access_min is not None and time_since_last_access_min <= 1 and sequential_zone_violation:
            bump += 0.25
        return float(np.clip(bump, 0.0, 0.5))

    def decide(
        self,
        features: list,
        raw_features: list | None = None,
        audit_context: dict | None = None,
    ) -> dict:
        """
        Make access control decision based on features (THREAD-SAFE).
        
        Args:
            features: 13 or 19-element feature vector
            raw_features: Unscaled features for contextual decisions
            audit_context: Optional dict with request context for audit trail
            
        Returns:
            dict with decision, risk_score, reasoning, etc.
        
        Note: ML model predictions are protected by re-entrant lock to ensure
        thread-safe access to model instances for concurrent FastAPI requests.
        """
        # CRITICAL SECTION: Model prediction (protected by re-entrant lock)
        with self._predict_lock:
            scores = self.compute_risk_score(features)

        if scores["combined_score"] is None:
            risk_source = raw_features if raw_features is not None else features
            risk_score = self.rule_based_score(risk_source)
            mode = "rule_based"
        else:
            risk_score = scores["combined_score"]
            mode = scores["mode"]

        clone_bump = 0.0
        if raw_features is not None:
            clone_bump = self._clone_risk_bump(raw_features)
            if clone_bump:
                risk_score = float(np.clip(risk_score + clone_bump, 0.0, 1.0))

        if risk_score < self.grant_threshold:
            decision = "granted"
            reasoning = (
                f"Risk score {risk_score:.4f} below grant threshold {self.grant_threshold}"
            )
        elif risk_score < self.deny_threshold:
            decision = "delayed"
            reasoning = f"Risk score {risk_score:.4f} in delay zone - guard notified"
        else:
            decision = "denied"
            reasoning = (
                f"Risk score {risk_score:.4f} above deny threshold {self.deny_threshold}"
            )

        if clone_bump:
            reasoning = f"{reasoning} (clone risk +{clone_bump:.2f})"

        result = {
            "decision": decision,
            "risk_score": round(risk_score, 4),
            "if_score": scores["if_score"],
            "ae_score": scores["ae_score"],
            "reasoning": reasoning,
            "mode": mode,
            "thresholds": {"grant": self.grant_threshold, "deny": self.deny_threshold},
        }
        self._emit_audit(
            event_type="decision",
            decision=result,
            features=features,
            raw_features=raw_features,
            audit_context=audit_context,
        )
        return result

    def audit_decision(
        self,
        decision: dict,
        features: list | None = None,
        raw_features: list | None = None,
        audit_context: dict | None = None,
        event_type: str = "decision_fallback",
    ) -> None:
        self._emit_audit(
            event_type=event_type,
            decision=decision,
            features=features,
            raw_features=raw_features,
            audit_context=audit_context,
        )

    def status(self) -> dict:
        if_path = os.path.join(self.models_dir, "isolation_forest.pkl")
        ae_path = os.path.join(self.models_dir, "autoencoder.keras")
        ae_cfg_path = os.path.join(self.models_dir, "autoencoder_config.pkl")

        return {
            "is_loaded": self.is_loaded,
            "isolation_forest": self.if_model is not None,
            "autoencoder": self.ae_model is not None,
            "if_artifact_found": os.path.exists(if_path),
            "ae_artifact_found": os.path.exists(ae_path) and os.path.exists(ae_cfg_path),
            "mode": "ensemble"
            if (self.if_model and self.ae_model)
            else "single_model"
            if self.is_loaded
            else "rule_based",
            "grant_threshold": self.grant_threshold,
            "deny_threshold": self.deny_threshold,
            "if_weight": self.IF_WEIGHT,
            "ae_weight": self.AE_WEIGHT,
        }
