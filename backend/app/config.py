from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SECRET_KEY: str
    DECISION_THRESHOLD_GRANT: float = 0.3
    DECISION_THRESHOLD_DENY: float = 0.7
    ML_MODEL_PATH: str = "./app/ml/model.pkl"
    AUTOENCODER_MODEL_PATH: str = "./app/ml/autoencoder.pkl"


settings = Settings()
