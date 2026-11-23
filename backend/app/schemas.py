from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class FileItem(BaseModel):
    name: str
    full_path: str
    size: int = 0
    last_modified: Optional[datetime] = None
    content_type: Optional[str] = None
    is_dir: bool = False

class FileListResponse(BaseModel):
    items: List[FileItem]
    current_prefix: str
    total_files: int
    total_folders: int
    total_size_bytes: int

class CreateFolderRequest(BaseModel):
    folder_name: str
    prefix: str = ""

class PresignedUrlResponse(BaseModel):
    url: str
    expires_seconds: int

class BucketStatusResponse(BaseModel):
    bucket_name: str
    connected: bool
    exists: bool
    endpoint: str
    message: Optional[str] = None
    config_id: Optional[int] = None
    config_name: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True
    dev_code: Optional[str] = None # Untuk mempermudah dev/testing jika SMTP belum aktif

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    is_active: bool
    needs_initial_setup: bool = False

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class BatchDeleteItem(BaseModel):
    path: str
    is_dir: bool = False

class BatchDeleteRequest(BaseModel):
    items: List[BatchDeleteItem]

class BatchDownloadItem(BaseModel):
    path: str
    is_dir: bool = False

class BatchDownloadRequest(BaseModel):
    items: List[BatchDownloadItem]
    zip_name: Optional[str] = "download.zip"

# --- Multi S3 Schemas ---
class S3ConfigCreate(BaseModel):
    name: str
    endpoint: str
    access_key: str
    secret_key: str
    bucket_name: str
    region: Optional[str] = None
    secure: bool = True
    is_default: bool = False

class S3ConfigUpdate(BaseModel):
    name: Optional[str] = None
    endpoint: Optional[str] = None
    access_key: Optional[str] = None
    secret_key: Optional[str] = None
    bucket_name: Optional[str] = None
    region: Optional[str] = None
    secure: Optional[bool] = None
    is_default: Optional[bool] = None

class S3ConfigResponse(BaseModel):
    id: int
    name: str
    endpoint: str
    access_key: str
    bucket_name: str
    region: Optional[str] = None
    secure: bool
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True

class S3TestRequest(BaseModel):
    endpoint: str
    access_key: str
    secret_key: str
    bucket_name: str
    region: Optional[str] = None
    secure: bool = True

class S3TestResponse(BaseModel):
    connected: bool
    exists: bool
    message: str

# --- SMTP Schemas ---
class SMTPConfigRequest(BaseModel):
    host: str
    port: int = 587
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: str
    from_name: str = "S3 File Manager"
    use_tls: bool = True
    use_ssl: bool = False

class SMTPConfigResponse(BaseModel):
    id: Optional[int] = None
    host: str = ""
    port: int = 587
    username: Optional[str] = None
    from_email: str = ""
    from_name: str = "S3 File Manager"
    use_tls: bool = True
    use_ssl: bool = False
    is_configured: bool = False

    class Config:
        from_attributes = True

class SMTPTestRequest(BaseModel):
    target_email: str

# --- Profile & Security Schemas ---
class RequestEmailChangeRequest(BaseModel):
    new_email: str

class ConfirmEmailChangeRequest(BaseModel):
    code: str
    new_password: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class InitialWizardSetupRequest(BaseModel):
    new_email: str
    verification_code: str
    new_password: str
    s3_config: Optional[S3ConfigCreate] = None
