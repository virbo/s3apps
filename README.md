# S3 File Manager (FastAPI + React Vite + MinIO + PostgreSQL)

Aplikasi web modern untuk manajemen file di S3 (AWS S3, MinIO, atau compatible S3 storage) yang dilengkapi dengan sistem autentikasi login (PostgreSQL + JWT), upload, download streaming, navigasi folder/prefix bertingkat, pembuatan folder baru, share presigned URL, dan download massal dalam format ZIP.

---

## 🌟 Fitur Utama

- **Onboarding Setup Wizard**: Saat aplikasi pertama kali dijalankan dan login dengan akun default, otomatis muncul form wizard berurutan:
  1. **Konfigurasi Server Email (SMTP)**: Menyiapkan SMTP host, port, username, password, dan uji coba pengiriman email.
  2. **Akun & Keamanan**: Mengubah email default (kode konfirmasi otomatis dikirim melalui server SMTP yang telah diatur) dan menetapkan password baru.
  3. **Konfigurasi Penyimpanan S3**: Menyiapkan penyimpanan S3 pertama dan menguji koneksi secara real-time.
- **Dukungan Multi-S3 Storage**: Mendukung penyimpanan banyak konfigurasi S3 sekaligus.
- **S3 Switcher Langsung di Navbar**: Pengguna dapat berganti active storage S3 secara instan langsung dari dropdown Navbar tanpa harus masuk ke halaman pengaturan.
- **Halaman Pengaturan Lengkap**:
  - **Kelola Multi S3**: Tambah, ubah, hapus, set default, dan uji koneksi S3.
  - **Akun & Keamanan**: Ganti email (dengan verifikasi email) dan ganti password.
  - **Pengaturan Email (SMTP)**: Konfigurasi host, port, username, password, TLS/SSL, dan fitur uji coba pengiriman email (Test Email).
- **Autentikasi & Otorisasi Pengguna**: Berbasis JWT dan database PostgreSQL. Seluruh endpoint file dilindungi dengan aman.
- **Hierarchical Storage & Batch Operations**: Drag-and-drop upload, breadcrumb subfolder, download langsung, presigned URL, hapus massal, dan download massal dalam format ZIP.

---

## 📂 Struktur Proyek

```text
s3apps/
├── .env                  # SINGLE SOURCE OF TRUTH KONFIGURASI
├── .env.example          # Template referensi konfigurasi
├── .gitignore            # Git ignore rule
├── docker-compose.yml    # Docker Compose (Backend + Frontend)
├── start.sh              # Script peluncur otomatis manual
├── backend/
│   ├── app/
│   │   ├── config.py     # Pydantic Settings (membaca root .env / os.environ)
│   │   ├── main.py       # FastAPI app & CORS configuration
│   │   ├── routers/
│   │   │   └── files.py  # Endpoints REST API
│   │   ├── s3_client.py  # MinIO Client wrapper (upload, download, list, delete, zip)
│   │   └── schemas.py    # Pydantic models
│   ├── Dockerfile        # Container image backend FastAPI
│   ├── .dockerignore
│   ├── requirements.txt
│   └── venv/             # Python Virtual Environment (untuk manual)
├── frontend/
│   ├── src/
│   │   ├── components/   # Navbar, Breadcrumb, FileList, FileUploadModal, dll.
│   │   ├── services/     # Axios client API
│   │   ├── types/        # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile        # Multi-stage container image frontend (Node -> Nginx)
│   ├── .dockerignore
│   ├── nginx.conf        # Konfigurasi Nginx untuk SPA & caching
│   ├── vite.config.ts    # Dikonfigurasi membaca .env dari root (envDir: '../')
│   └── package.json
└── README.md
```

---

---

## ⚙️ Konfigurasi (`.env`)

Edit file `.env` di root project sesuai kredensial S3 / MinIO Anda:

```env
# --- MinIO / S3 Storage Credentials ---
S3_ENDPOINT=localhost:9000
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET_NAME=my-bucket
S3_SECURE=false
S3_REGION=us-east-1

# --- Backend Configuration ---
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# --- Frontend Configuration ---
VITE_API_BASE_URL=http://localhost:8000
FRONTEND_PORT=5173
```

---

## 🚀 Cara Menjalankan

Aplikasi ini dapat dijalankan dengan dua cara: **Via Docker (Sangat Mudah)** atau **Secara Manual**.

### Opsi A: Menggunakan Docker (Rekomendasi)

Pastikan konfigurasi di `.env` sudah sesuai, kemudian jalankan:

```bash
# Build dan jalankan semua container di background
docker compose up --build -d

# Untuk melihat log
docker compose logs -f

# Untuk menghentikan layanan
docker compose down
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Opsi B: Menjalankan Secara Manual

#### Cara Cepat (Script Peluncur Otomatis):
```bash
./start.sh
```

#### Cara Terpisah (Manual per Service):

**1. Menjalankan Backend (FastAPI):**
```bash
cd backend
source venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Atau langsung dari root:
```bash
PYTHONPATH=backend ./backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**2. Menjalankan Frontend (React + Vite):**
Buka terminal kedua di root project:
```bash
cd frontend
npm run dev
```

- Aplikasi web dapat diakses di: [http://localhost:5173](http://localhost:5173)

---

## 📡 Daftar Endpoint REST API

### Autentikasi
| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login pengguna dan peroleh access token JWT |
| `POST` | `/api/auth/register` | Pendaftaran pengguna baru |
| `GET` | `/api/auth/me` | Profil pengguna aktif (Authorization: Bearer) |

### Manajemen File S3 (Memerlukan Login)
| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/api/files/health` | Cek status koneksi MinIO & ketersediaan bucket |
| `GET` | `/api/files/list?prefix=` | Daftar file dan folder dalam prefix tertentu |
| `POST` | `/api/files/upload` | Upload satu atau banyak file ke prefix aktif |
| `POST` | `/api/files/create-folder` | Buat folder virtual baru di bawah prefix |
| `GET` | `/api/files/download?path=` | Unduh file via direct streaming response |
| `GET` | `/api/files/presigned-url?path=` | Buat temporary presigned URL untuk file |
| `DELETE` | `/api/files/delete?path=&is_dir=` | Hapus file atau folder beserta isinya |
| `POST` | `/api/files/batch-delete` | Hapus banyak file dan folder sekaligus |
| `POST` | `/api/files/batch-download` | Download massal file/folder dalam format ZIP |
