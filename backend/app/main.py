from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.models import User, S3Config
from app.auth import hash_password
from app.routers.files import router as files_router
from app.routers.auth import router as auth_router
from app.routers.settings import router as settings_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inisialisasi tabel dan migrasi di database
    try:
        from app.database import run_migrations
        run_migrations()
        db = SessionLocal()
        admin_email = settings.DEFAULT_ADMIN_EMAIL.strip().lower()
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            # Akun default pertama kali membutuhkan setup wizard
            admin_user = User(
                email=admin_email,
                full_name=settings.DEFAULT_ADMIN_NAME,
                hashed_password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                is_active=True,
                needs_initial_setup=True
            )
            db.add(admin_user)
            db.commit()
            print(f"✅ Akun default berhasil diinisialisasi: {admin_email} (needs_initial_setup=True)")
        
        # Inisialisasi default S3 config dari .env jika tabel s3_configs masih kosong
        if db.query(S3Config).count() == 0 and settings.S3_ENDPOINT:
            initial_s3 = S3Config(
                name="Primary S3 Storage",
                endpoint=settings.S3_ENDPOINT,
                access_key=settings.S3_ACCESS_KEY,
                secret_key=settings.S3_SECRET_KEY,
                bucket_name=settings.S3_BUCKET_NAME,
                region=settings.S3_REGION,
                secure=settings.S3_SECURE,
                is_default=True
            )
            db.add(initial_s3)
            db.commit()
            print(f"✅ S3 Config awal berhasil diinisialisasi dari .env: {initial_s3.name}")

        db.close()
    except Exception as e:
        print(f"⚠️ Peringatan database saat startup: {e}")
    yield

app = FastAPI(
    title="S3 File Manager API",
    description="FastAPI service for S3 object management with Multi-S3 & PostgreSQL Auth",
    version="1.2.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if settings.ALLOWED_ORIGINS == "*":
    origins = ["*"]
else:
    origins.extend([o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(settings_router)

@app.get("/")
def root():
    return {
        "app": "S3 File Manager API",
        "status": "online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
