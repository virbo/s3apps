import logging
import os
import tempfile
import urllib.parse
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Query,
    Header,
    BackgroundTasks,
    Depends
)
from fastapi.responses import StreamingResponse, FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.s3_client import S3Service, get_s3_service
from app.auth import get_current_user
from app.schemas import (
    FileListResponse,
    CreateFolderRequest,
    PresignedUrlResponse,
    BucketStatusResponse,
    MessageResponse,
    BatchDeleteRequest,
    BatchDownloadRequest
)

logger = logging.getLogger("files_router")
router = APIRouter(
    prefix="/api/files",
    tags=["Files"],
    dependencies=[Depends(get_current_user)]
)

def get_active_s3(
    header_id: Optional[str] = Header(None, alias="X-S3-Config-Id"),
    query_id: Optional[int] = Query(None, alias="s3_config_id"),
    db: Session = Depends(get_db)
) -> S3Service:
    """Dependency untuk mengambil instance S3Service sesuai S3 yang dipilih user."""
    config_id = None
    if header_id and header_id.isdigit():
        config_id = int(header_id)
    elif query_id is not None:
        config_id = query_id

    return get_s3_service(config_id=config_id, db=db)

@router.get("/health", response_model=BucketStatusResponse)
def get_health(s3: S3Service = Depends(get_active_s3)):
    """Cek status koneksi S3 dan bucket aktif."""
    return s3.check_connection()

@router.get("/list", response_model=FileListResponse)
def list_files(
    prefix: str = Query(default="", description="Folder prefix"),
    s3: S3Service = Depends(get_active_s3)
):
    """Mendapatkan daftar file dan folder dalam prefix tertentu."""
    try:
        items, total_files, total_folders, total_size = s3.list_objects(prefix=prefix)
        return FileListResponse(
            items=items,
            current_prefix=prefix.strip("/"),
            total_files=total_files,
            total_folders=total_folders,
            total_size_bytes=total_size
        )
    except Exception as e:
        logger.exception("Gagal mengambil daftar file di S3")
        raise HTTPException(status_code=500, detail=f"Gagal mengambil daftar file: {str(e)}")

@router.post("/upload", response_model=MessageResponse)
async def upload_files(
    files: List[UploadFile] = File(...),
    prefix: str = Form(default=""),
    s3: S3Service = Depends(get_active_s3)
):
    """Upload satu atau banyak file ke folder/prefix tertentu."""
    if not files:
        raise HTTPException(status_code=400, detail="Tidak ada file yang diunggah.")

    uploaded_names = []
    try:
        for file in files:
            contents = await file.read()
            size = len(contents)
            import io
            file_stream = io.BytesIO(contents)
            
            uploaded_path = s3.upload_file(
                file_data=file_stream,
                file_name=file.filename or "unnamed_file",
                size=size,
                content_type=file.content_type or "application/octet-stream",
                prefix=prefix
            )
            uploaded_names.append(uploaded_path)

        return MessageResponse(
            message=f"Berhasil mengunggah {len(uploaded_names)} file ke '{s3.config_name}'.",
            success=True
        )
    except Exception as e:
        logger.exception("Gagal mengunggah file ke S3")
        raise HTTPException(status_code=500, detail=f"Gagal mengunggah file: {str(e)}")

@router.post("/create-folder", response_model=MessageResponse)
def create_folder(
    req: CreateFolderRequest,
    s3: S3Service = Depends(get_active_s3)
):
    """Buat folder baru di bawah prefix saat ini."""
    if not req.folder_name or not req.folder_name.strip():
        raise HTTPException(status_code=400, detail="Nama folder tidak boleh kosong.")
    
    if "/" in req.folder_name or "\\" in req.folder_name:
        raise HTTPException(status_code=400, detail="Nama folder tidak boleh mengandung '/' atau '\\'.")

    try:
        created_path = s3.create_folder(folder_name=req.folder_name, prefix=req.prefix)
        return MessageResponse(
            message=f"Folder '{created_path}' berhasil dibuat di '{s3.config_name}'.",
            success=True
        )
    except Exception as e:
        logger.exception("Gagal membuat folder di S3")
        raise HTTPException(status_code=500, detail=f"Gagal membuat folder: {str(e)}")

@router.get("/download")
def download_file(
    path: str = Query(..., description="Path lengkap object di S3"),
    s3: S3Service = Depends(get_active_s3)
):
    """Download file langsung via streaming response."""
    try:
        stream, size, content_type = s3.get_object_stream(path)
        filename = path.split("/")[-1]
        encoded_filename = urllib.parse.quote(filename)
        
        headers = {
            "Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}",
            "Content-Length": str(size),
            "Content-Type": content_type
        }
        return StreamingResponse(stream, headers=headers, media_type=content_type)
    except Exception as e:
        logger.exception(f"Gagal mengunduh file {path}")
        raise HTTPException(status_code=404, detail=f"File tidak ditemukan atau gagal diunduh: {str(e)}")

@router.get("/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_url(
    path: str = Query(..., description="Path lengkap object di S3"),
    expires: int = Query(default=3600, description="Masa berlaku URL dalam detik"),
    s3: S3Service = Depends(get_active_s3)
):
    """Dapatkan temporary presigned URL untuk file."""
    try:
        url = s3.get_presigned_url(path, expires_seconds=expires)
        return PresignedUrlResponse(url=url, expires_seconds=expires)
    except Exception as e:
        logger.exception(f"Gagal membuat presigned URL untuk {path}")
        raise HTTPException(status_code=500, detail=f"Gagal membuat presigned URL: {str(e)}")

@router.delete("/delete", response_model=MessageResponse)
def delete_item(
    path: str = Query(..., description="Path object atau folder"),
    is_dir: bool = Query(default=False, description="Apakah target adalah folder"),
    s3: S3Service = Depends(get_active_s3)
):
    """Hapus file atau folder beserta isinya."""
    try:
        s3.delete_object(object_name=path, is_dir=is_dir)
        item_type = "Folder" if is_dir else "File"
        return MessageResponse(
            message=f"{item_type} '{path}' berhasil dihapus dari '{s3.config_name}'.",
            success=True
        )
    except Exception as e:
        logger.exception(f"Gagal menghapus {path}")
        raise HTTPException(status_code=500, detail=f"Gagal menghapus: {str(e)}")

@router.post("/batch-delete", response_model=MessageResponse)
def batch_delete_items(
    req: BatchDeleteRequest,
    s3: S3Service = Depends(get_active_s3)
):
    """Hapus banyak file dan/atau folder sekaligus."""
    if not req.items:
        raise HTTPException(status_code=400, detail="Tidak ada item yang dipilih untuk dihapus.")
    try:
        items_to_delete = [(it.path, it.is_dir) for it in req.items]
        deleted_count = s3.batch_delete(items_to_delete)
        return MessageResponse(
            message=f"Berhasil menghapus {deleted_count} item dari '{s3.config_name}'.",
            success=True
        )
    except Exception as e:
        logger.exception("Gagal melakukan batch delete")
        raise HTTPException(status_code=500, detail=f"Gagal menghapus item: {str(e)}")

def remove_temp_file(filepath: str):
    """Helper untuk menghapus file zip temporary setelah didownload."""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        logger.warning(f"Gagal menghapus temp file {filepath}: {str(e)}")

@router.post("/batch-download")
def batch_download_zip(
    req: BatchDownloadRequest,
    background_tasks: BackgroundTasks,
    s3: S3Service = Depends(get_active_s3)
):
    """
    Mengemas daftar file dan folder yang dipilih ke dalam file ZIP
    dan mengunduhnya sebagai streaming response.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="Tidak ada item yang dipilih untuk diunduh.")

    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip_path = temp_zip.name
    temp_zip.close()

    try:
        items_to_zip = [(it.path, it.is_dir) for it in req.items]
        s3.create_zip_archive(items_to_zip, temp_zip_path)

        zip_filename = req.zip_name or "download.zip"
        if not zip_filename.endswith(".zip"):
            zip_filename += ".zip"

        encoded_filename = urllib.parse.quote(zip_filename)
        headers = {
            "Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"
        }

        background_tasks.add_task(remove_temp_file, temp_zip_path)

        return FileResponse(
            path=temp_zip_path,
            filename=zip_filename,
            media_type="application/zip",
            headers=headers
        )
    except Exception as e:
        remove_temp_file(temp_zip_path)
        logger.exception("Gagal membuat zip batch download")
        raise HTTPException(status_code=500, detail=f"Gagal membuat file ZIP: {str(e)}")
