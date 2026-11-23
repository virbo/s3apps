#!/bin/bash

# Pastikan proses dihentikan saat Ctrl+C
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "🚀 Menjalankan S3 File Manager..."

# Cari port backend dari .env jika ada, default ke 8000
PORT_BACKEND=$(grep -E '^BACKEND_PORT=' .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ' || echo "8000")
if [ -z "$PORT_BACKEND" ]; then
  PORT_BACKEND=8000
fi

# 1. Jalankan Backend FastAPI
echo "📦 Memulai Backend FastAPI di port $PORT_BACKEND..."
PYTHONPATH=backend ./backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT_BACKEND --reload &
BACKEND_PID=$!

# Tunggu sejenak agar backend siap
sleep 2

# 2. Jalankan Frontend Vite
echo "💻 Memulai Frontend Vite..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "✅ Kedua layanan berjalan!"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: http://localhost:$PORT_BACKEND"
echo "   - API Swagger Docs: http://localhost:$PORT_BACKEND/docs"
echo "Tekan Ctrl+C untuk menghentikan semua layanan."

wait
