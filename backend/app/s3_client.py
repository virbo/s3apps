import io
import logging
from datetime import timedelta
from typing import Generator, List, Tuple, Optional
from minio import Minio
from minio.error import S3Error
from sqlalchemy.orm import Session
from app.config import get_settings
from app.schemas import FileItem, BucketStatusResponse
from app.models import S3Config

logger = logging.getLogger("s3_client")

class S3Service:
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket_name: str,
        secure: bool = True,
        region: Optional[str] = None,
        config_id: Optional[int] = None,
        config_name: Optional[str] = None
    ):
        self.endpoint = endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket_name = bucket_name
        self.secure = secure
        self.region = region.strip() if (region and region.strip()) else None
        self.config_id = config_id
        self.config_name = config_name or bucket_name

        self.client = Minio(
            endpoint=self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure,
            region=self.region
        )

    @classmethod
    def from_s3_config(cls, conf: S3Config) -> "S3Service":
        return cls(
            endpoint=conf.endpoint,
            access_key=conf.access_key,
            secret_key=conf.secret_key,
            bucket_name=conf.bucket_name,
            secure=conf.secure,
            region=conf.region,
            config_id=conf.id,
            config_name=conf.name
        )

    @classmethod
    def from_settings(cls) -> "S3Service":
        s = get_settings()
        return cls(
            endpoint=s.S3_ENDPOINT,
            access_key=s.S3_ACCESS_KEY,
            secret_key=s.S3_SECRET_KEY,
            bucket_name=s.S3_BUCKET_NAME,
            secure=s.S3_SECURE,
            region=s.S3_REGION,
            config_id=None,
            config_name="Default Storage (.env)"
        )

    @staticmethod
    def test_credentials(
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket_name: str,
        secure: bool = True,
        region: Optional[str] = None
    ) -> Tuple[bool, bool, str]:
        """Uji koneksi kredensial S3 sebelum disimpan."""
        clean_region = region.strip() if (region and region.strip()) else None
        try:
            client = Minio(
                endpoint=endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=secure,
                region=clean_region
            )
            exists = client.bucket_exists(bucket_name)
            if exists:
                msg = f"Koneksi berhasil! Bucket '{bucket_name}' ditemukan."
            else:
                msg = f"Terhubung ke endpoint, tetapi bucket '{bucket_name}' belum ada."
            return True, exists, msg
        except Exception as e:
            return False, False, f"Gagal terhubung: {str(e)}"

    def check_connection(self) -> BucketStatusResponse:
        """Cek koneksi ke server S3/MinIO dan ketersediaan bucket saat ini."""
        try:
            exists = self.client.bucket_exists(self.bucket_name)
            msg = (
                f"Terhubung dengan sukses ke bucket '{self.bucket_name}'."
                if exists
                else f"Bucket '{self.bucket_name}' tidak ditemukan di {self.endpoint}."
            )
            return BucketStatusResponse(
                bucket_name=self.bucket_name,
                connected=True,
                exists=exists,
                endpoint=self.endpoint,
                message=msg,
                config_id=self.config_id,
                config_name=self.config_name
            )
        except Exception as e:
            logger.exception(f"Error checking S3 connection for {self.endpoint}")
            return BucketStatusResponse(
                bucket_name=self.bucket_name,
                connected=False,
                exists=False,
                endpoint=self.endpoint,
                message=str(e),
                config_id=self.config_id,
                config_name=self.config_name
            )

    def list_objects(self, prefix: str = "") -> Tuple[List[FileItem], int, int, int]:
        """Daftar file dan folder berdasarkan prefix."""
        clean_prefix = prefix.strip("/")
        if clean_prefix:
            clean_prefix += "/"

        objects = self.client.list_objects(
            self.bucket_name,
            prefix=clean_prefix,
            recursive=False
        )

        items: List[FileItem] = []
        total_files = 0
        total_folders = 0
        total_size_bytes = 0

        for obj in objects:
            if obj.is_dir:
                folder_full_path = obj.object_name
                parts = folder_full_path.rstrip("/").split("/")
                folder_name = parts[-1] if parts else folder_full_path
                items.append(
                    FileItem(
                        name=folder_name,
                        full_path=folder_full_path,
                        size=0,
                        last_modified=None,
                        content_type="directory",
                        is_dir=True
                    )
                )
                total_folders += 1
            else:
                if obj.object_name.endswith("/") and (obj.size == 0 or obj.size is None):
                    continue

                parts = obj.object_name.split("/")
                file_name = parts[-1]
                size = obj.size or 0
                items.append(
                    FileItem(
                        name=file_name,
                        full_path=obj.object_name,
                        size=size,
                        last_modified=obj.last_modified,
                        content_type=obj.content_type,
                        is_dir=False
                    )
                )
                total_files += 1
                total_size_bytes += size

        items.sort(key=lambda x: (not x.is_dir, x.name.lower()))
        return items, total_files, total_folders, total_size_bytes

    def upload_file(self, file_data: io.BytesIO, file_name: str, size: int, content_type: str, prefix: str = "") -> str:
        """Upload file ke bucket pada path/prefix tertentu."""
        clean_prefix = prefix.strip("/")
        if clean_prefix:
            object_name = f"{clean_prefix}/{file_name}"
        else:
            object_name = file_name

        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=file_data,
            length=size,
            content_type=content_type or "application/octet-stream"
        )
        return object_name

    def create_folder(self, folder_name: str, prefix: str = "") -> str:
        """Buat folder virtual di S3."""
        clean_folder = folder_name.strip("/").strip()
        clean_prefix = prefix.strip("/")
        
        if clean_prefix:
            folder_path = f"{clean_prefix}/{clean_folder}/"
        else:
            folder_path = f"{clean_folder}/"

        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=folder_path,
            data=io.BytesIO(b""),
            length=0,
            content_type="application/x-directory"
        )
        return folder_path

    def get_object_stream(self, object_name: str) -> Tuple[Generator[bytes, None, None], int, str]:
        """Stream object untuk download."""
        response = self.client.get_object(self.bucket_name, object_name)
        stat = self.client.stat_object(self.bucket_name, object_name)
        
        def iterfile() -> Generator[bytes, None, None]:
            try:
                for chunk in response.stream(32 * 1024):
                    yield chunk
            finally:
                response.close()
                response.release_conn()

        return iterfile(), stat.size, stat.content_type or "application/octet-stream"

    def get_presigned_url(self, object_name: str, expires_seconds: int = 3600) -> str:
        """Presigned URL untuk file."""
        return self.client.presigned_get_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            expires=timedelta(seconds=expires_seconds)
        )

    def delete_object(self, object_name: str, is_dir: bool = False):
        """Hapus object tunggal atau folder beserta isinya."""
        if is_dir or object_name.endswith("/"):
            prefix = object_name if object_name.endswith("/") else f"{object_name}/"
            objects_to_delete = self.client.list_objects(self.bucket_name, prefix=prefix, recursive=True)
            for obj in objects_to_delete:
                self.client.remove_object(self.bucket_name, obj.object_name)
        else:
            self.client.remove_object(self.bucket_name, object_name)

    def batch_delete(self, items: List[Tuple[str, bool]]) -> int:
        """Hapus banyak file/folder secara batch."""
        count = 0
        for path, is_dir in items:
            self.delete_object(object_name=path, is_dir=is_dir)
            count += 1
        return count

    def create_zip_archive(self, items: List[Tuple[str, bool]], output_path: str):
        """Kemas daftar file/folder ke arsip ZIP."""
        import zipfile
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
            for path, is_dir in items:
                if is_dir or path.endswith("/"):
                    prefix = path if path.endswith("/") else f"{path}/"
                    parent_parts = prefix.rstrip("/").split("/")
                    parent_prefix = "/".join(parent_parts[:-1]) + "/" if len(parent_parts) > 1 else ""

                    objects = self.client.list_objects(self.bucket_name, prefix=prefix, recursive=True)
                    for obj in objects:
                        if obj.object_name.endswith("/") and (obj.size == 0 or obj.size is None):
                            continue
                        
                        arcname = obj.object_name
                        if parent_prefix and arcname.startswith(parent_prefix):
                            arcname = arcname[len(parent_prefix):]

                        response = self.client.get_object(self.bucket_name, obj.object_name)
                        try:
                            data = response.read()
                            zip_file.writestr(arcname, data)
                        finally:
                            response.close()
                            response.release_conn()
                else:
                    arcname = path.split("/")[-1]
                    response = self.client.get_object(self.bucket_name, path)
                    try:
                        data = response.read()
                        zip_file.writestr(arcname, data)
                    finally:
                        response.close()
                        response.release_conn()

def get_s3_service(
    config_id: Optional[int] = None,
    db: Optional[Session] = None
) -> S3Service:
    """
    Factory untuk mendapatkan S3Service berdasarkan config_id atau default.
    Mendukung multi-S3 secara dinamis.
    """
    if db is not None:
        if config_id is not None:
            conf = db.query(S3Config).filter(S3Config.id == config_id).first()
            if conf:
                return S3Service.from_s3_config(conf)
        
        # Jika tidak ada config_id spesifik, cari yang is_default=True
        default_conf = db.query(S3Config).filter(S3Config.is_default == True).first()
        if default_conf:
            return S3Service.from_s3_config(default_conf)

        # Jika belum ada default, ambil config pertama
        first_conf = db.query(S3Config).order_by(S3Config.id.asc()).first()
        if first_conf:
            return S3Service.from_s3_config(first_conf)

    # Fallback ke konfigurasi .env
    return S3Service.from_settings()
