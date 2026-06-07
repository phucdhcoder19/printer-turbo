# app/asgi.py — điểm lắp ráp FastAPI app
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.controllers.v1.video import router as video_router

app = FastAPI(title="MoneyPrinterTurbo API", version="1.0.0")

# ──────────────────────────────────────────────
# CORS: cho phép React (:5173) và NestJS (:3000) gọi sang.
# Dev để "*" cho tiện; production nên giới hạn domain cụ thể.
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các API endpoints
app.include_router(video_router)


@app.get("/")
def health():
    """Endpoint kiểm tra app sống — NestJS/React có thể ping."""
    return {"status": "ok", "service": "MoneyPrinterTurbo API"}


# ──────────────────────────────────────────────
# Phục vụ file output (video, audio, subtitle) qua HTTP.
# VD: storage/tasks/abc123/final.mp4 → GET /tasks/abc123/final.mp4
# StaticFiles yêu cầu thư mục PHẢI tồn tại trước khi mount.
# ──────────────────────────────────────────────
tasks_dir = Path("storage/tasks")
tasks_dir.mkdir(parents=True, exist_ok=True)
app.mount("/tasks", StaticFiles(directory=str(tasks_dir)), name="tasks")
