import os
from pathlib import Path
from dotenv import dotenv_values
from pydantic import BaseModel
from typing import Optional

# Mencari .env di root project (s3apps/.env) atau local working dir
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
LOCAL_ENV = Path(".env")

class Settings(BaseModel):
    # S3 / MinIO
    S3_ENDPOINT: str = "localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "my-bucket"
    S3_SECURE: bool = False
    S3_REGION: Optional[str] = None

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # Database PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/s3app_db"

    # JWT Authentication
    JWT_SECRET_KEY: str = "s3apps-secret-key-super-secure-change-in-prod-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Default Admin
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_NAME: str = "Administrator"

def get_settings() -> Settings:
    file_vals = {}
    if ENV_PATH.exists():
        file_vals = dotenv_values(ENV_PATH)
    elif LOCAL_ENV.exists():
        file_vals = dotenv_values(LOCAL_ENV)

    def get_val(key: str, default: str = "") -> str:
        v = file_vals.get(key)
        if v is not None and v != "":
            return str(v)
        v_env = os.environ.get(key)
        if v_env is not None and v_env != "":
            return str(v_env)
        return default

    secure_raw = get_val("S3_SECURE", "false")
    secure = str(secure_raw).lower() in ("true", "1", "yes")

    port_raw = get_val("BACKEND_PORT", "8000")
    try:
        port = int(port_raw)
    except ValueError:
        port = 8000

    jwt_expire_raw = get_val("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    try:
        jwt_expire = int(jwt_expire_raw)
    except ValueError:
        jwt_expire = 1440

    region_raw = get_val("S3_REGION", "")
    region = region_raw.strip() if region_raw.strip() else None

    # Bangun DATABASE_URL jika tidak diberikan utuh
    default_db_url = "postgresql://postgres:postgres@localhost:5432/s3app_db"
    db_url = get_val("DATABASE_URL", "")
    if not db_url:
        pg_user = get_val("POSTGRES_USER", "postgres")
        pg_pass = get_val("POSTGRES_PASSWORD", "postgres")
        pg_host = get_val("POSTGRES_HOST", "localhost")
        pg_port = get_val("POSTGRES_PORT", "5432")
        pg_db = get_val("POSTGRES_DB", "s3app_db")
        db_url = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

    return Settings(
        S3_ENDPOINT=get_val("S3_ENDPOINT", "localhost:9000"),
        S3_ACCESS_KEY=get_val("S3_ACCESS_KEY", "minioadmin"),
        S3_SECRET_KEY=get_val("S3_SECRET_KEY", "minioadmin"),
        S3_BUCKET_NAME=get_val("S3_BUCKET_NAME", "my-bucket"),
        S3_SECURE=secure,
        S3_REGION=region,
        BACKEND_HOST=get_val("BACKEND_HOST", "0.0.0.0"),
        BACKEND_PORT=port,
        ALLOWED_ORIGINS=get_val("ALLOWED_ORIGINS", "*"),
        DATABASE_URL=db_url or default_db_url,
        JWT_SECRET_KEY=get_val("JWT_SECRET_KEY", "s3apps-secret-key-super-secure-change-in-prod-2026"),
        JWT_ALGORITHM=get_val("JWT_ALGORITHM", "HS256"),
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES=jwt_expire,
        DEFAULT_ADMIN_EMAIL=get_val("DEFAULT_ADMIN_EMAIL", "admin@example.com"),
        DEFAULT_ADMIN_PASSWORD=get_val("DEFAULT_ADMIN_PASSWORD", "admin123"),
        DEFAULT_ADMIN_NAME=get_val("DEFAULT_ADMIN_NAME", "Administrator"),
    )
