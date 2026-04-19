from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    # NOTE: Decision thresholds are now loaded dynamically from DecisionEngine
    # They are loaded from ensemble_config.pkl, isolation_forest.pkl, or env vars
    # These settings are deprecated and kept only for backward compatibility
    # To override thresholds, use environment variables instead:
    # - DECISION_THRESHOLD_GRANT (default: loaded from models or 0.3)
    # - DECISION_THRESHOLD_DENY (default: loaded from models or 0.7)
    DECISION_THRESHOLD_GRANT: float = 0.3  # Deprecated - use env vars or auto-tuning
    DECISION_THRESHOLD_DENY: float = 0.7   # Deprecated - use env vars or auto-tuning
    ML_MODEL_PATH: str = "./app/ml/model.pkl"
    AUTOENCODER_MODEL_PATH: str = "./app/ml/autoencoder.pkl"
    
    # JWT settings
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # TOTP/MFA settings
    TOTP_ISSUER: str = "RaptorX"
    
    # Brute-force protection
    LOGIN_ATTEMPT_WINDOW_MINUTES: int = 15
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 30


settings = Settings()
