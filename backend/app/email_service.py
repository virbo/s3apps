import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from app.models import SMTPConfig

logger = logging.getLogger("email_service")

class EmailService:
    @staticmethod
    def get_smtp_config(db: Session) -> Optional[SMTPConfig]:
        """Ambil konfigurasi SMTP yang aktif dari database."""
        return db.query(SMTPConfig).filter(SMTPConfig.is_active == True).first()

    @classmethod
    def send_email(
        cls,
        db: Session,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str = ""
    ) -> Tuple[bool, str]:
        """Kirim email menggunakan konfigurasi SMTP dari database."""
        config = cls.get_smtp_config(db)
        if not config or not config.host:
            logger.warning("SMTP belum dikonfigurasi.")
            return False, "SMTP belum dikonfigurasi di Pengaturan Email."

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{config.from_name} <{config.from_email}>"
            msg["To"] = to_email

            if body_text:
                msg.attach(MIMEText(body_text, "plain"))
            if body_html:
                msg.attach(MIMEText(body_html, "html"))

            if config.use_ssl:
                server = smtplib.SMTP_SSL(config.host, config.port, timeout=10)
            else:
                server = smtplib.SMTP(config.host, config.port, timeout=10)
                if config.use_tls:
                    server.starttls()

            if config.username and config.password:
                server.login(config.username, config.password)

            server.sendmail(config.from_email, [to_email], msg.as_string())
            server.quit()
            logger.info(f"Email berhasil dikirim ke {to_email}")
            return True, "Email berhasil dikirim."
        except Exception as e:
            logger.exception(f"Gagal mengirim email ke {to_email}: {e}")
            return False, f"Gagal mengirim email: {str(e)}"

    @classmethod
    def send_verification_email(
        cls,
        db: Session,
        to_email: str,
        code: str
    ) -> Tuple[bool, str]:
        """Kirim kode konfirmasi aktivasi email baru."""
        subject = f"Kode Konfirmasi Email: {code}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0284c7; margin-bottom: 8px;">Konfirmasi Perubahan Email</h2>
            <p style="color: #475569; font-size: 14px;">Anda menerima email ini karena ada permintaan untuk memperbarui alamat email akun S3 File Manager Anda.</p>
            <div style="background-color: #f0f9ff; border: 1px dashed #0284c7; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0369a1;">{code}</span>
            </div>
            <p style="color: #64748b; font-size: 12px;">Kode ini berlaku selama 15 menit. Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
        </div>
        """
        body_text = f"Kode konfirmasi email Anda adalah: {code}. Kode ini berlaku selama 15 menit."
        return cls.send_email(db, to_email, subject, body_html, body_text)

email_service = EmailService()
