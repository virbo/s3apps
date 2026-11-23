import random
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, hash_password, verify_password
from app.models import User, S3Config, SMTPConfig
from app.s3_client import S3Service
from app.email_service import email_service
from app.schemas import (
    S3ConfigCreate,
    S3ConfigUpdate,
    S3ConfigResponse,
    S3TestRequest,
    S3TestResponse,
    SMTPConfigRequest,
    SMTPConfigResponse,
    SMTPTestRequest,
    RequestEmailChangeRequest,
    ConfirmEmailChangeRequest,
    ChangePasswordRequest,
    InitialWizardSetupRequest,
    MessageResponse
)

logger = logging.getLogger("settings_router")
router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"],
    dependencies=[Depends(get_current_user)]
)

# ==============================================================================
# 1. Multi S3 Storage Settings
# ==============================================================================

@router.get("/s3", response_model=List[S3ConfigResponse])
def list_s3_configs(db: Session = Depends(get_db)):
    """Mengambil semua konfigurasi S3 yang tersimpan."""
    configs = db.query(S3Config).order_by(S3Config.is_default.desc(), S3Config.id.asc()).all()
    return configs

@router.post("/s3", response_model=S3ConfigResponse)
def create_s3_config(req: S3ConfigCreate, db: Session = Depends(get_db)):
    """Menambahkan konfigurasi S3 baru."""
    # Cek apakah nama sudah digunakan
    existing = db.query(S3Config).filter(S3Config.name == req.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Nama S3 '{req.name}' sudah digunakan.")

    # Jika is_default True, set yang lain jadi False
    is_first = db.query(S3Config).count() == 0
    is_def = req.is_default or is_first

    if is_def:
        db.query(S3Config).update({S3Config.is_default: False})

    new_config = S3Config(
        name=req.name.strip(),
        endpoint=req.endpoint.strip(),
        access_key=req.access_key.strip(),
        secret_key=req.secret_key.strip(),
        bucket_name=req.bucket_name.strip(),
        region=req.region.strip() if req.region else None,
        secure=req.secure,
        is_default=is_def
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config

@router.put("/s3/{config_id}", response_model=S3ConfigResponse)
def update_s3_config(config_id: int, req: S3ConfigUpdate, db: Session = Depends(get_db)):
    """Memperbarui konfigurasi S3 yang ada."""
    conf = db.query(S3Config).filter(S3Config.id == config_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Konfigurasi S3 tidak ditemukan.")

    if req.name is not None:
        name_clean = req.name.strip()
        existing = db.query(S3Config).filter(S3Config.name == name_clean, S3Config.id != config_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Nama S3 '{name_clean}' sudah digunakan.")
        conf.name = name_clean

    if req.endpoint is not None:
        conf.endpoint = req.endpoint.strip()
    if req.access_key is not None:
        conf.access_key = req.access_key.strip()
    if req.secret_key is not None and req.secret_key.strip():
        conf.secret_key = req.secret_key.strip()
    if req.bucket_name is not None:
        conf.bucket_name = req.bucket_name.strip()
    if req.region is not None:
        conf.region = req.region.strip() if req.region else None
    if req.secure is not None:
        conf.secure = req.secure
    if req.is_default is True:
        db.query(S3Config).update({S3Config.is_default: False})
        conf.is_default = True

    db.commit()
    db.refresh(conf)
    return conf

@router.delete("/s3/{config_id}", response_model=MessageResponse)
def delete_s3_config(config_id: int, db: Session = Depends(get_db)):
    """Menghapus konfigurasi S3."""
    conf = db.query(S3Config).filter(S3Config.id == config_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Konfigurasi S3 tidak ditemukan.")

    was_default = conf.is_default
    db.delete(conf)
    db.commit()

    # Jika yang dihapus adalah default, set S3 pertama sebagai default baru
    if was_default:
        first = db.query(S3Config).order_by(S3Config.id.asc()).first()
        if first:
            first.is_default = True
            db.commit()

    return MessageResponse(message=f"Konfigurasi S3 '{conf.name}' berhasil dihapus.")

@router.post("/s3/{config_id}/default", response_model=MessageResponse)
def set_default_s3(config_id: int, db: Session = Depends(get_db)):
    """Menjadikan S3 ini sebagai default aktif."""
    conf = db.query(S3Config).filter(S3Config.id == config_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Konfigurasi S3 tidak ditemukan.")

    db.query(S3Config).update({S3Config.is_default: False})
    conf.is_default = True
    db.commit()

    return MessageResponse(message=f"'{conf.name}' sekarang disetel sebagai storage default.")

@router.post("/s3/test", response_model=S3TestResponse)
def test_s3_connection(req: S3TestRequest):
    """Menguji koneksi ke S3 tanpa menyimpannya terlebih dahulu."""
    connected, exists, msg = S3Service.test_credentials(
        endpoint=req.endpoint.strip(),
        access_key=req.access_key.strip(),
        secret_key=req.secret_key.strip(),
        bucket_name=req.bucket_name.strip(),
        secure=req.secure,
        region=req.region
    )
    return S3TestResponse(connected=connected, exists=exists, message=msg)


# ==============================================================================
# 2. SMTP / Email Settings
# ==============================================================================

@router.get("/smtp", response_model=SMTPConfigResponse)
def get_smtp_settings(db: Session = Depends(get_db)):
    """Mengambil konfigurasi SMTP saat ini."""
    config = db.query(SMTPConfig).filter(SMTPConfig.is_active == True).first()
    if not config:
        return SMTPConfigResponse(
            host="",
            port=587,
            username="",
            from_email="",
            from_name="S3 File Manager",
            use_tls=True,
            use_ssl=False,
            is_configured=False
        )
    return SMTPConfigResponse(
        id=config.id,
        host=config.host,
        port=config.port,
        username=config.username,
        from_email=config.from_email,
        from_name=config.from_name,
        use_tls=config.use_tls,
        use_ssl=config.use_ssl,
        is_configured=bool(config.host and config.from_email)
    )

@router.post("/smtp", response_model=MessageResponse)
def save_smtp_settings(req: SMTPConfigRequest, db: Session = Depends(get_db)):
    """Menyimpan atau memperbarui konfigurasi SMTP."""
    config = db.query(SMTPConfig).first()
    if not config:
        config = SMTPConfig()
        db.add(config)

    config.host = req.host.strip()
    config.port = req.port
    config.username = req.username.strip() if req.username else None
    if req.password is not None and req.password != "":
        config.password = req.password
    config.from_email = req.from_email.strip()
    config.from_name = req.from_name.strip()
    config.use_tls = req.use_tls
    config.use_ssl = req.use_ssl
    config.is_active = True
    config.updated_at = datetime.utcnow()

    db.commit()
    return MessageResponse(message="Pengaturan SMTP berhasil disimpan.")

@router.post("/smtp/test", response_model=MessageResponse)
def test_smtp_settings(req: SMTPTestRequest, db: Session = Depends(get_db)):
    """Kirim email uji coba untuk memverifikasi pengaturan SMTP."""
    target = req.target_email.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Alamat email target harus diisi.")

    success, msg = email_service.send_email(
        db,
        to_email=target,
        subject="Uji Coba Pengiriman Email - S3 File Manager",
        body_html="<p>Halo! Ini adalah email uji coba dari <strong>S3 File Manager</strong>. Konfigurasi SMTP Anda berfungsi dengan baik.</p>",
        body_text="Halo! Ini adalah email uji coba dari S3 File Manager. Konfigurasi SMTP Anda berfungsi dengan baik."
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return MessageResponse(message=f"Email uji coba berhasil dikirim ke {target}!")


# ==============================================================================
# 3. Profile & Security (Ganti Email & Password, Wizard)
# ==============================================================================

@router.post("/profile/request-email-change", response_model=MessageResponse)
def request_email_change(
    req: RequestEmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengirimkan kode verifikasi 6-digit ke email baru yang diinginkan."""
    new_email = req.new_email.strip().lower()
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Format email tidak valid.")

    if new_email == current_user.email:
        raise HTTPException(status_code=400, detail="Email baru sama dengan email saat ini.")

    # Cek apakah email sudah dipakai user lain
    existing = db.query(User).filter(User.email == new_email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email tersebut sudah digunakan oleh akun lain.")

    # Generate 6-digit code
    code = f"{random.randint(100000, 999999)}"
    current_user.pending_email = new_email
    current_user.email_verification_code = code
    current_user.email_verification_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    # Kirim email
    sent, msg = email_service.send_verification_email(db, new_email, code)

    # Catatan: Jika SMTP belum aktif, dev_code dikembalikan agar setup tidak macet
    dev_hint = code if not sent else None

    return MessageResponse(
        message=f"Kode konfirmasi telah dikirim ke {new_email}." if sent else f"Catatan: {msg}",
        success=True,
        dev_code=dev_hint
    )

@router.post("/profile/confirm-email-change", response_model=MessageResponse)
def confirm_email_change(
    req: ConfirmEmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Memverifikasi kode 6-digit dan mengaktifkan email baru."""
    if not current_user.pending_email or not current_user.email_verification_code:
        raise HTTPException(status_code=400, detail="Tidak ada permintaan perubahan email yang aktif.")

    if datetime.utcnow() > (current_user.email_verification_expires or datetime.utcnow()):
        raise HTTPException(status_code=400, detail="Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.")

    if req.code.strip() != current_user.email_verification_code.strip():
        raise HTTPException(status_code=400, detail="Kode verifikasi salah.")

    # Sukses: perbarui email
    old_email = current_user.email
    new_email = current_user.pending_email
    current_user.email = new_email
    current_user.pending_email = None
    current_user.email_verification_code = None
    current_user.email_verification_expires = None

    if req.new_password and len(req.new_password.strip()) >= 6:
        current_user.hashed_password = hash_password(req.new_password.strip())

    db.commit()
    return MessageResponse(message=f"Email berhasil diperbarui dari {old_email} ke {new_email}.")

@router.post("/profile/change-password", response_model=MessageResponse)
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mengubah password pengguna dengan memverifikasi password lama."""
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password lama yang Anda masukkan salah.")

    if len(req.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter.")

    current_user.hashed_password = hash_password(req.new_password.strip())
    db.commit()
    return MessageResponse(message="Password berhasil diubah.")

@router.post("/profile/complete-wizard", response_model=MessageResponse)
def complete_wizard_setup(
    req: InitialWizardSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Menyelesaikan form wizard onboarding:
    1. Verifikasi kode konfirmasi dan aktifkan email baru + password baru
    2. Simpan konfigurasi S3 awal jika disertakan
    3. Nonaktifkan status needs_initial_setup
    """
    # 1. Validasi kode email
    if not current_user.pending_email or current_user.pending_email != req.new_email.strip().lower():
        raise HTTPException(status_code=400, detail="Alamat email tidak cocok dengan permintaan verifikasi.")

    if req.verification_code.strip() != current_user.email_verification_code:
        raise HTTPException(status_code=400, detail="Kode konfirmasi email salah.")

    if len(req.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter.")

    # 2. Update user
    current_user.email = current_user.pending_email
    current_user.pending_email = None
    current_user.email_verification_code = None
    current_user.email_verification_expires = None
    current_user.hashed_password = hash_password(req.new_password.strip())
    current_user.needs_initial_setup = False

    # 3. Simpan S3 jika ada
    if req.s3_config:
        s3_data = req.s3_config
        existing_s3 = db.query(S3Config).filter(S3Config.name == s3_data.name.strip()).first()
        if not existing_s3:
            db.query(S3Config).update({S3Config.is_default: False})
            new_s3 = S3Config(
                name=s3_data.name.strip(),
                endpoint=s3_data.endpoint.strip(),
                access_key=s3_data.access_key.strip(),
                secret_key=s3_data.secret_key.strip(),
                bucket_name=s3_data.bucket_name.strip(),
                region=s3_data.region.strip() if s3_data.region else None,
                secure=s3_data.secure,
                is_default=True
            )
            db.add(new_s3)

    db.commit()
    return MessageResponse(message="Setup wizard berhasil diselesaikan! Selamat datang di S3 File Manager.")
