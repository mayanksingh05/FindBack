"""Application configuration and environment settings."""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://findback_user:findback_pass@localhost:5432/findback_db"

    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # LLM Settings
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""

    # Embedding Models
    TEXT_EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    IMAGE_EMBEDDING_MODEL: str = "ViT-B-32"
    IMAGE_EMBEDDING_PRETRAINED: str = "laion2b_s34b_b79k"

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Matching Thresholds
    TEXT_SIMILARITY_WEIGHT: float = 0.4
    IMAGE_SIMILARITY_WEIGHT: float = 0.4
    METADATA_WEIGHT: float = 0.2
    MATCH_THRESHOLD: float = 0.60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
