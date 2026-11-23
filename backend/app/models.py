from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    needs_initial_setup = Column(Boolean, default=False)
    
    # Email change confirmation
    pending_email = Column(String(255), nullable=True)
    email_verification_code = Column(String(32), nullable=True)
    email_verification_expires = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class S3Config(Base):
    __tablename__ = "s3_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. "Kilat Storage Utama", "AWS Production"
    endpoint = Column(String(255), nullable=False)
    access_key = Column(String(255), nullable=False)
    secret_key = Column(String(255), nullable=False)
    bucket_name = Column(String(255), nullable=False)
    region = Column(String(100), nullable=True)
    secure = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SMTPConfig(Base):
    __tablename__ = "smtp_configs"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=587)
    username = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True)
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), default="S3 File Manager")
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
