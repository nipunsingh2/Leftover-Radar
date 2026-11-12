import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

root_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(root_dir / ".env")

class Settings:
    PROJECT_NAME: str = "Leftover Radar"
    PROJECT_VERSION: str = "2.0.0"
    API_PREFIX: str = os.getenv("API_BASE_URL", "/api")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "leftover_radar")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # CORS
    raw_cors: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000")
    CORS_ORIGINS: List[str] = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]

    # Newsvendor cost parameters
    DEFAULT_WASTE_COST: float = float(os.getenv("DEFAULT_WASTE_COST", "30.0"))
    DEFAULT_STOCKOUT_COST: float = float(os.getenv("DEFAULT_STOCKOUT_COST", "70.0"))
    DEFAULT_BUFFER_CAP_PERCENT: float = float(os.getenv("DEFAULT_BUFFER_CAP_PERCENT", "0.15"))

    # Paths
    ROOT_DIR: Path = root_dir
    MODEL_DIR: Path = root_dir / "backend" / "models"
    MODEL_PATH: Path = root_dir / "backend" / "models" / "demand_model.joblib"
    METRICS_PATH: Path = root_dir / "backend" / "models" / "model_metrics.json"

settings = Settings()
