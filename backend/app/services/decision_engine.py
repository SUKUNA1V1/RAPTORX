import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import numpy as np
import joblib
import tensorflow as tf
from tensorflow import keras
import warnings
warnings.filterwarnings("ignore")


class AccessDecisionEngine:
    """
    Combines Isolation Forest + Autoencoder to make
    real-time access control decisions.

    Decision thresholds (configurable):
        risk_score < GRANT_THRESHOLD  -> GRANTED
        risk_score < DENY_THRESHOLD   -> DELAYED
        risk_score >= DENY_THRESHOLD  -> DENIED
    """

    GRANT_THRESHOLD = float(os.getenv("GRANT_THRESHOLD", "0.30"))
    DENY_THRESHOLD = float(os.getenv("DENY_THRESHOLD", "0.60"))

    IF_WEIGHT = 0.3
    AE_WEIGHT = 0.7

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
        self.load_models()

    def load_models(self):
        print("Loading ML models...")
        errors = []

        try:
            if_path = os.path.join(self.models_dir, "isolation_forest.pkl")
            self.if_data = joblib.load(if_path)
            self.if_model = self.if_data["model"]
            print("Isolation Forest loaded")
        except Exception as e:
            errors.append(f"Isolation Forest: {e}")
            print(f"Isolation Forest failed: {e}")

        try:
            ae_path = os.path.join(self.models_dir, "autoencoder.keras")
            self.ae_model = keras.models.load_model(ae_path)
            self.ae_config = joblib.load(
                os.path.join(self.models_dir, "autoencoder_config.pkl")
            )
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
            geographic_impossibility,
            distance_between_scans_km,
            velocity_km_per_min,
            zone_clearance_mismatch,
            department_zone_mismatch,
            concurrent_session_detected,
        ) = features

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
        
        # NEW SPECIALIZED BADGE CLONING RULES
        # Rule 1: Quick succession + location mismatch (strong badge cloning signal)
        if time_since_last_access_min and time_since_last_access_min < 3 and not location_match:
            score += 0.50
        
        # Rule 2: Very high frequency + quick succession
        if time_since_last_access_min and time_since_last_access_min < 5 and access_frequency_24h > 15:
            score += 0.40
        
        # Rule 3: Geographic impossibility (near-instant deny)
        if geographic_impossibility:
            score += 0.80
        
        # Rule 4: Concurrent session detected (badge used in two places)
        if concurrent_session_detected:
            score += 0.80
        
        # Rule 5: Zone clearance mismatch in restricted area
        if zone_clearance_mismatch and is_restricted_area:
            score += 0.45

        return float(np.clip(score, 0.0, 1.0))

    def decide(self, features: list) -> dict:
        scores = self.compute_risk_score(features)

        if scores["combined_score"] is None:
            risk_score = self.rule_based_score(features)
            mode = "rule_based"
        else:
            risk_score = scores["combined_score"]
            mode = scores["mode"]

        if risk_score < self.GRANT_THRESHOLD:
            decision = "granted"
            reasoning = (
                f"Risk score {risk_score:.4f} below grant threshold {self.GRANT_THRESHOLD}"
            )
        elif risk_score < self.DENY_THRESHOLD:
            decision = "delayed"
            reasoning = f"Risk score {risk_score:.4f} in delay zone - guard notified"
        else:
            decision = "denied"
            reasoning = (
                f"Risk score {risk_score:.4f} above deny threshold {self.DENY_THRESHOLD}"
            )

        return {
            "decision": decision,
            "risk_score": round(risk_score, 4),
            "if_score": scores["if_score"],
            "ae_score": scores["ae_score"],
            "reasoning": reasoning,
            "mode": mode,
            "thresholds": {"grant": self.GRANT_THRESHOLD, "deny": self.DENY_THRESHOLD},
        }

    def status(self) -> dict:
        return {
            "is_loaded": self.is_loaded,
            "isolation_forest": self.if_model is not None,
            "autoencoder": self.ae_model is not None,
            "mode": "ensemble"
            if (self.if_model and self.ae_model)
            else "single_model"
            if self.is_loaded
            else "rule_based",
            "grant_threshold": self.GRANT_THRESHOLD,
            "deny_threshold": self.DENY_THRESHOLD,
            "if_weight": self.IF_WEIGHT,
            "ae_weight": self.AE_WEIGHT,
        }
