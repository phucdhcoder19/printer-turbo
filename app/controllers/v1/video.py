# app/controllers/v1/video.py
from fastapi import APIRouter, HTTPException

from app.models.schema import TaskVideoRequest, VideoParams, TaskResponse
from app.models.const import TASK_STATE_PROCESSING
from app.services.state import state
from app.controllers.manager.task_manager import task_manager
from app.utils.utils import new_task_id

router = APIRouter(prefix="/api/v1", tags=["video"])


def _request_to_params(req: TaskVideoRequest) -> VideoParams:
    """Đổi request từ API → VideoParams nội bộ (object trung tâm của pipeline)."""
    return VideoParams(
        topic=req.topic,
        voice_name=req.voice_name,
        voice_rate=req.voice_rate,
        bgm_file=req.bgm_file or "",
        video_aspect=req.video_aspect,
        video_concat_mode=req.video_concat_mode,
        subtitle_enabled=req.subtitle_enabled,
    )


def _submit(req: TaskVideoRequest, stop_at: str) -> TaskResponse:
    """Tạo task_id, khởi tạo trạng thái, đẩy vào hàng đợi nền → trả về ngay.

    TẠI SAO trả về ngay thay vì đợi video xong?
    → Render mất 2-10 phút → nếu đợi thì HTTP timeout.
    → Pattern chuẩn: trả task_id ngay → client poll GET /tasks/{id}.
    """
    task_id = new_task_id()
    params = _request_to_params(req)

    state.update_task(task_id, TASK_STATE_PROCESSING, progress=0)
    task_manager.submit(task_id, params, stop_at=stop_at)

    return TaskResponse(task_id=task_id, state=TASK_STATE_PROCESSING, progress=0)


# ──────────────────────────────────────────────
# Cùng 1 pipeline, khác nhau ở stop_at (xem app/services/task.py)
# ──────────────────────────────────────────────

@router.post("/videos", response_model=TaskResponse)
def create_video(req: TaskVideoRequest):
    """Chạy full pipeline → final.mp4"""
    return _submit(req, stop_at="video")


@router.post("/audio", response_model=TaskResponse)
def create_audio(req: TaskVideoRequest):
    """Chỉ tạo tới giọng đọc (audio.mp3) rồi dừng."""
    return _submit(req, stop_at="audio")


@router.post("/subtitle", response_model=TaskResponse)
def create_subtitle(req: TaskVideoRequest):
    """Chỉ tạo tới phụ đề (subtitle.srt) rồi dừng."""
    return _submit(req, stop_at="subtitle")


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: str):
    """Client poll endpoint này mỗi 2-3 giây để xem task xong chưa."""
    task_data = state.get_task(task_id)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(task_id=task_id, **task_data)
