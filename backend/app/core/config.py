from functools import lru_cache
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central application configuration loaded from environment variables and .env file.
    Follows 12-factor app methodology.
    """
    PROJECT_NAME: str = "AcneVision AI: Real-Time Acne Detection System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "capacitor://localhost",
        "http://localhost",
    ]

    # AI/ML Inference Model Settings (Ultralytics YOLOv8 / YOLO11)
    MODEL_PATH: str = "weights/best_yolo11n_acne.pt"
    MODEL_CONFIDENCE_THRESHOLD: float = 0.35
    MODEL_IOU_THRESHOLD: float = 0.45
    MODEL_DEVICE: str = "cpu"  # "cpu", "cuda", "mps"
    MODEL_HALF_PRECISION: bool = False
    INFERENCE_MAX_WORKERS: int = 8
    TARGET_INFERENCE_LATENCY_MS: float = 100.0

    # External Classifier Microservice Handoff (FR-09)
    CLASSIFIER_SERVICE_URL: str = "http://localhost:8001/api/v1/classify"
    CLASSIFIER_TIMEOUT_SECONDS: float = 10.0
    CLASSIFIER_FALLBACK_ENABLED: bool = True

    # Security & UU PDP Compliance (Undang-Undang Pelindungan Data Pribadi)
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    STORE_FACIAL_IMAGES_ON_DISK: bool = False  # Strictly keep in memory to protect biometric data

    # Authentication & JWT Configuration
    JWT_SECRET: str = "acnevision-super-secret-jwt-key-2026-secure"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    SQLITE_DB_PATH: str = "acnevision_users.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """Returns cached application settings instance."""
    return Settings()

