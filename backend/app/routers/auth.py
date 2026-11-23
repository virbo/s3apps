import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.auth import (
    verify_password,
    hash_password,
    create_access_token,
    get_current_user
)
from app.schemas import (
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    TokenResponse,
    MessageResponse
)

logger = logging.getLogger("auth_router")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Autentikasi pengguna dan mengembalikan token JWT."""
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password yang Anda masukkan salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun Anda dinonaktifkan."
        )

    settings = get_settings()
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "id": user.id},
        expires_delta=access_token_expires
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=UserResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Pendaftaran pengguna baru."""
    clean_email = req.email.strip().lower()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar. Silakan login atau gunakan email lain."
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password minimal 6 karakter."
        )

    new_user = User(
        email=clean_email,
        full_name=req.full_name.strip() if req.full_name else None,
        hashed_password=hash_password(req.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Mendapatkan data pengguna yang sedang login."""
    return UserResponse.model_validate(current_user)
