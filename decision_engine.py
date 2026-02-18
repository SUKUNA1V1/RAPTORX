import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"]  = "2"

import numpy as np
import joblib
import tensorflow as tf
from tensorflow import keras
import warnings
warnings.filterwarnings("ignore")

# ============================================================
# DECISION ENGINE
# ============================================================
class AccessDecisionEngine:
    """
    Combines Isolation Forest + Autoencoder to make
    real-time access control decisions.

    Decision thresholds (configurable):
        risk_score < GRANT_THRESHOLD  → GRANTED
        risk_score < DENY_THRESHOLD   → DELAYED
        risk_score >= DENY_THRESHOLD  → DENIED
    """

    # Default thresholds — can be overridden via env vars or DB
    GRANT_THRESHOLD = float(os.getenv("GRANT_THRESHOLD", "0.30"))
    DENY_THRESHOLD  = float(os.getenv("DENY_THRESHOLD",  "0.60"))

    # Ensemble weights (from Phase 4.5 best result)
    IF_WEIGHT = 0.3
    AE_WEIGHT = 0.7

    def __init__(self, models_dir="ml/models"):
        self.models_dir  = models_dir
        self.if_model    = None
        self.ae_model    = None
        self.if_data     = None
        self.ae_config   = None
        self.is_loaded   = False
        self.load_models()

    # ============================================================
    # LOAD MODELS
    # ============================================================
    def load_models(self):
        print("🔄 Loading ML models...")
        errors = []

        # Load Isolation Forest
        try:
            if_path       = os.path.join(self.models_dir, "isolation_forest.pkl")
            self.if_data  = joblib.load(if_path)
            self.if_model = self.if_data["model"]
            print(f"  ✅ Isolation Forest loaded")
        except Exception as e:
            errors.append(f"Isolation Forest: {e}")
            print(f"  ❌ Isolation Forest failed: {e}")

        # Load Autoencoder
        try:
            ae_path        = os.path.join(self.models_dir, "autoencoder.keras")
            self.ae_model  = keras.models.load_model(ae_path)
            self.ae_config = joblib.load(
                os.path.join(self.models_dir, "autoencoder_config.pkl")
            )
            print(f"  ✅ Autoencoder loaded")
        except Exception as e:
            errors.append(f"Autoencoder: {e}")
            print(f"  ❌ Autoencoder failed: {e}")

        if self.if_model and self.ae_model:
            self.is_loaded = True
            print("✅ All models loaded — full ensemble active\n")
        elif self.if_model:
            self.is_loaded = True
            print("⚠️  Only Isolation Forest loaded — running single model\n")
        elif self.ae_model:
            self.is_loaded = True
            print("⚠️  Only Autoencoder loaded — running single model\n")
        else:
            print("❌ No models loaded — falling back to rule-based decisions\n")

    # ============================================================
    # BADGE CLONING DETECTOR (Quick Win #3)
    # ============================================================
    def detect_badge_cloning(self, features: list) -> dict:
        """
        Specialized detector for physically impossible travel scenarios.
        Returns cloning probability and reason.
        """
        (hour, day_of_week, is_weekend, access_frequency_24h,
         time_since_last_access_min, location_match, role_level,
         is_restricted_area, is_first_access_today,
         sequential_zone_violation, access_attempt_count,
         time_of_week, hour_deviation_from_norm,
         geographic_impossibility, distance_between_scans_km,
         velocity_km_per_min, zone_clearance_mismatch,
         department_zone_mismatch, concurrent_session_detected) = features
        
        cloning_score = 0.0
        reasons = []
        
        # Check 1: Impossible velocity (most reliable)
        if velocity_km_per_min > 1.0:  # > 60 km/h
            cloning_score += 0.80
            reasons.append(f"Impossible velocity: {velocity_km_per_min:.1f} km/min")
        
        # Check 2: Concurrent session (definitive)
        if concurrent_session_detected:
            cloning_score += 0.90
            reasons.append("Badge used simultaneously at another location")
        
        # Check 3: Very short gap + location mismatch
        if time_since_last_access_min < 3 and not location_match:
            cloning_score += 0.50
            reasons.append(f"Location change in {time_since_last_access_min} min")
        
        # Check 4: High frequency + short gaps
        if access_frequency_24h > 15 and time_since_last_access_min < 5:
            cloning_score += 0.40
            reasons.append("Abnormally rapid repeated access")
        
        return {
            "is_cloning": cloning_score > 0.5,
            "cloning_score": min(cloning_score, 1.0),
            "reasons": reasons
        }

    # ============================================================
    # COMPUTE RISK SCORE
    # ============================================================
    def compute_risk_score(self, features: list) -> dict:
        """
        Compute ensemble risk score from feature vector.

        Args:
            features: list of 19 values in FEATURE_COLS order

        Returns:
            dict with if_score, ae_score, combined_score
        """
        X = np.array(features).reshape(1, -1)

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
                print(f"⚠️  IF scoring failed: {e}")

        # Autoencoder score
        if self.ae_model:
            try:
                recon     = self.ae_model.predict(X, verbose=0)
                error     = float(np.mean(np.power(X - recon, 2)))
                min_e     = self.ae_config["min_error"]
                max_e     = self.ae_config["max_error"]
                ae_score  = float(np.clip((error - min_e) / (max_e - min_e), 0, 1))
            except Exception as e:
                print(f"⚠️  AE scoring failed: {e}")

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
    def rule_based_score(self, features: list) -> float:
        """
        Enhanced rule-based scoring with badge cloning detection.
        Returns a risk score between 0-1.
        """
        (hour, day_of_week, is_weekend, access_frequency_24h,
         time_since_last_access_min, location_match, role_level,
         is_restricted_area, is_first_access_today,
         sequential_zone_violation, access_attempt_count,
         time_of_week, hour_deviation_from_norm,
         geographic_impossibility, distance_between_scans_km,
         velocity_km_per_min, zone_clearance_mismatch,
         department_zone_mismatch, concurrent_session_detected) = features

        score = 0.0

        # Original rules
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
        if time_since_last_access_min and time_since_last_access_min < 5:
            score += 0.30
        if sequential_zone_violation:
            score += 0.20
        if access_attempt_count > 2:
            score += 0.15

        # NEW: Badge cloning detection rules (HIGH PRIORITY - Quick Win #3)
        if geographic_impossibility:
            score += 0.80  # Near-instant deny
        if concurrent_session_detected:
            score += 0.80  # Definitive cloning
        if velocity_km_per_min > 1.0:
            score += 0.60  # Impossible travel speed
        if time_since_last_access_min < 3 and not location_match:
            score += 0.50  # Rapid location change
        if time_since_last_access_min < 5 and access_frequency_24h > 15:
            score += 0.40  # Suspicious rapid access

        # NEW: Unauthorized zone detection rules (Quick Win #3)
        if zone_clearance_mismatch and is_restricted_area:
            score += 0.45  # Wrong clearance for zone
        if department_zone_mismatch and is_restricted_area:
            score += 0.35  # Wrong department for zone
        if not location_match and is_restricted_area and role_level == 1:
            score += 0.40  # Low-level in restricted area

        return float(np.clip(score, 0.0, 1.0))

    # ============================================================
    # MAKE DECISION
    # ============================================================
    def decide(self, features: list) -> dict:
        """
        Main decision function — called for every access attempt.

        Returns:
            {
                decision:      "granted" | "delayed" | "denied"
                risk_score:    float 0-1
                if_score:      float 0-1
                ae_score:      float 0-1
                reasoning:     str explaining why
                mode:          str (ensemble | rule_based | etc)
                thresholds:    dict
            }
        """
        # Get scores
        scores = self.compute_risk_score(features)

        # Fallback to rule-based if models unavailable
        if scores["combined_score"] is None:
            risk_score = self.rule_based_score(features)
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

        return {
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

    # ============================================================
    # STATUS
    # ============================================================
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
if __name__ == "__main__":

    print("=" * 60)
    print("Testing Decision Engine")
    print("=" * 60)

    engine = AccessDecisionEngine()
    print("Engine status:", engine.status())

    # Feature order (19 features):
    # hour, day_of_week, is_weekend, access_frequency_24h,
    # time_since_last_access_min, location_match, role_level,
    # is_restricted_area, is_first_access_today,
    # sequential_zone_violation, access_attempt_count,
    # time_of_week, hour_deviation_from_norm,
    # geographic_impossibility, distance_between_scans_km, velocity_km_per_min,
    # zone_clearance_mismatch, department_zone_mismatch, concurrent_session_detected

    # Load scaler to normalize features
    import joblib as jl
    scaler = jl.load("ml/models/scaler.pkl")

    test_cases = [
        {
            "name":     "✅ Normal employee — 9AM weekday",
            "features": [9, 0, 0, 3, 120, 1, 1, 0, 1, 0, 0, 9,  0.5, 0, 0.2, 0.002, 0, 0, 0]
        },
        {
            "name":     "✅ Admin — server room access",
            "features": [10, 1, 0, 2, 180, 1, 3, 1, 0, 0, 0, 34, 0.3, 0, 0.3, 0.002, 0, 0, 0]
        },
        {
            "name":     "⚠️  After hours — 2AM access",
            "features": [2, 1, 0, 8, 15,  0, 1, 1, 0, 1, 3, 26, 5.0, 0, 0.5, 0.033, 1, 1, 0]
        },
        {
            "name":     "⚠️  Weekend + restricted area",
            "features": [3, 6, 1, 15, 5,  0, 1, 1, 0, 1, 4, 147, 6.0, 0, 0.4, 0.080, 1, 1, 0]
        },
        {
            "name":     "❌ Badge cloning — 2 min gap, 50km travel",
            "features": [9, 0, 0, 18, 2,  0, 1, 0, 0, 1, 5, 9,  4.0, 1, 50.0, 25.0, 0, 0, 1]
        },
        {
            "name":     "❌ High frequency + restricted",
            "features": [2, 5, 1, 30, 3,  0, 1, 1, 0, 1, 6, 53, 7.0, 0, 10.0, 3.33, 1, 1, 0]
        },
    ]

    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)

    for case in test_cases:
        # Scale features before passing to engine
        features_scaled = scaler.transform([case["features"]])[0].tolist()
        result          = engine.decide(features_scaled)

        decision_icon = {"granted": "🟢", "delayed": "🟡", "denied": "🔴"}
        icon          = decision_icon[result["decision"]]

        print(f"\n{case['name']}")
        print(f"  Decision   : {icon} {result['decision'].upper()}")
        print(f"  Risk Score : {result['risk_score']:.4f}")
        print(f"  IF Score   : {result['if_score']}")
        print(f"  AE Score   : {result['ae_score']}")
        print(f"  Mode       : {result['mode']}")
        print(f"  Reasoning  : {result['reasoning']}")

    print("\n🎉 Phase 4.6 COMPLETE — Decision Engine ready!")
    print("➡️  Ready for Phase 4.7 — Integrate into FastAPI backend!")