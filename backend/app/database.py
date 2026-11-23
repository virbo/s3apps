import logging
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

logger = logging.getLogger("database")
Base = declarative_base()

def ensure_database_exists(db_url: str):
    """Pastikan database postgres sudah dibuat, jika belum buat otomatis."""
    try:
        parsed = urlparse(db_url)
        db_name = parsed.path.lstrip("/")
        if not db_name:
            return

        conn = psycopg2.connect(
            dbname="postgres",
            user=parsed.username or "postgres",
            password=parsed.password or "postgres",
            host=parsed.hostname or "localhost",
            port=parsed.port or 5432
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (db_name,))
        exists = cur.fetchone()
        if not exists:
            cur.execute(f'CREATE DATABASE "{db_name}"')
            logger.info(f"Database '{db_name}' berhasil dibuat secara otomatis.")
        
        cur.close()
        conn.close()
    except Exception as e:
        logger.warning(f"Catatan saat pengecekan database: {e}")

settings = get_settings()
ensure_database_exists(settings.DATABASE_URL)

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migrations():
    """Jalankan DDL migrasi otomatis untuk kolom/tabel baru."""
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_initial_setup BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(32);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;"))
            conn.commit()
    except Exception as e:
        logger.warning(f"Migrasi database: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
