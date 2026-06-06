# app/models/schema.py
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# TẠI SAO dùng Enum cho các giá trị cố định?
# → Nếu dùng str, người dùng có thể truyền "portait" (typo) → bug âm thầm
# → Enum validate tại thời điểm tạo object → lỗi sớm, rõ ràng
# → IDE autocomplete: VideoAspect. → thấy ngay các lựa chọn
# ──────────────────────────────────────────────

class VideoAspect(str, Enum):
    portrait = "9:16"
    landscape = "16:9"
    square = "1:1"

class VideoConcatMode(str, Enum):
    random = "random"
    sequential = "sequential"

class VideoTransitionMode(str, Enum):
    none = "none"
    fade = "fade"
    slide = "slide"


# ──────────────────────────────────────────────
# VideoParams là object TRUNG TÂM của toàn bộ project
#
# TẠI SAO gom hết vào 1 object?
# → Pipeline có 6 bước, mỗi bước cần một vài params khác nhau
# → Nếu truyền params rời: generate_script(topic, language, llm_provider, model_name)
#   rồi generate_audio(text, voice_name, voice_rate, voice_volume)
#   → danh sách params dài, dễ thiếu, khó maintain
# → Gom vào 1 object: mỗi bước tự lấy field mình cần từ params
# → Thêm field mới không cần sửa function signature của 6 bước
# ──────────────────────────────────────────────

class VideoParams(BaseModel):
    # --- Script ---
    topic: str = ""
    script: str = ""                          # output của bước 1
    terms: list[str] = Field(default_factory=list)  # output của bước 2

    # --- Audio ---
    voice_name: str = "vi-VN-HoaiMyNeural"
    voice_rate: float = 1.0
    voice_volume: float = 1.0
    bgm_file: str = ""
    bgm_volume: float = 0.3

    # --- Video ---
    video_aspect: VideoAspect = VideoAspect.portrait
    video_concat_mode: VideoConcatMode = VideoConcatMode.random
    video_transition: VideoTransitionMode = VideoTransitionMode.none
    video_clip_duration: int = 5

    # --- Subtitle ---
    subtitle_enabled: bool = True
    subtitle_position: str = "bottom"         # top, center, bottom
    font_name: str = "STHeitiMedium.ttc"
    font_size: int = 60
    font_color: str = "#FFFFFF"
    stroke_color: str = "#000000"
    stroke_width: float = 1.5

    # --- Material ---
    video_source: str = "pexels"              # pexels, pixabay, local
    video_materials: list[str] = Field(default_factory=list)  # local file paths


# ──────────────────────────────────────────────
# Request/Response models cho API
#
# TẠI SAO không dùng thẳng VideoParams làm request body?
# → API chỉ nhận MỘT PHẦN fields (user không cần set script, terms — đó là output)
# → Response cần thêm task_id, status — VideoParams không có
# → Tách ra giúp API docs (Swagger) rõ ràng: "gửi gì, nhận gì"
# ──────────────────────────────────────────────

class TaskVideoRequest(BaseModel):
    """Body của POST /api/v1/videos"""
    topic: str
    voice_name: Optional[str] = "vi-VN-HoaiMyNeural"
    voice_rate: Optional[float] = 1.0
    bgm_file: Optional[str] = ""
    video_aspect: Optional[VideoAspect] = VideoAspect.portrait
    video_concat_mode: Optional[VideoConcatMode] = VideoConcatMode.random
    subtitle_enabled: Optional[bool] = True

class TaskResponse(BaseModel):
    """Response của GET /api/v1/tasks/{task_id}"""
    task_id: str
    state: str                # processing, complete, failed
    progress: int             # 0-100
    message: str = ""
    videos: list[str] = Field(default_factory=list)  # URLs khi xong
