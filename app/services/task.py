# app/services/task.py
import json
import traceback
from pathlib import Path

from app.config.config import config
from app.models.const import (
    TASK_STATE_PROCESSING,
    TASK_STATE_COMPLETE,
    TASK_STATE_FAILED,
)
from app.models.schema import VideoParams
from app.services import llm, voice, subtitle, material, video
from app.services.state import state
from app.utils.utils import task_dir


# ──────────────────────────────────────────────
# TẠI SAO có tham số stop_at?
#
# Cùng 1 pipeline phục vụ nhiều mục đích:
#   stop_at="video"    → chạy full (mặc định)
#   stop_at="audio"    → chỉ tạo tới giọng đọc rồi dừng
#   stop_at="subtitle" → chỉ tạo tới phụ đề rồi dừng
#
# Thay vì viết nhiều hàm riêng → 1 hàm + stop_at (DRY, nhất quán).
# ──────────────────────────────────────────────


def start(task_id: str, params: VideoParams, stop_at: str = "video"):
    """Chạy pipeline đầy đủ. Được gọi bởi API/WebUI (thường trên thread nền)."""
    td = task_dir(task_id)

    try:
        # ──── STAGE 1: Script ────
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=10,
                          message="Đang tạo kịch bản...")
        if not params.script:
            sentences = llm.generate_script(params.topic, config.app.language)
            params.script = " ".join(sentences)
            # Lưu ra file để debug / xem lại
            (td / "script.json").write_text(
                json.dumps(sentences, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        if stop_at == "script":
            state.update_task(task_id, TASK_STATE_COMPLETE, progress=100,
                              message="Xong (chỉ kịch bản).")
            return

        # ──── STAGE 2: Terms ────
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=20,
                          message="Đang tạo từ khóa tìm kiếm...")
        if not params.terms:
            params.terms = llm.generate_terms(params.topic, params.script)
        if stop_at == "terms":
            state.update_task(task_id, TASK_STATE_COMPLETE, progress=100,
                              message="Xong (chỉ từ khóa).")
            return

        # ──── STAGE 3: Audio (giọng đọc) ────
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=30,
                          message="Đang tạo giọng đọc...")
        audio_path = td / "audio.mp3"
        word_timestamps = voice.generate_audio(
            text=params.script,
            output_path=audio_path,
            voice=params.voice_name,
            rate=params.voice_rate,
            volume=params.voice_volume,
        )
        if stop_at == "audio":
            state.update_task(task_id, TASK_STATE_COMPLETE, progress=100,
                              message="Xong (chỉ giọng đọc).")
            return

        # ──── STAGE 4: Subtitle (phụ đề) ────
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=45,
                          message="Đang tạo phụ đề...")
        subtitle_path = td / "subtitle.srt"
        if params.subtitle_enabled:
            subtitle.generate_subtitle_from_timestamps(word_timestamps, subtitle_path)
        if stop_at == "subtitle":
            state.update_task(task_id, TASK_STATE_COMPLETE, progress=100,
                              message="Xong (chỉ phụ đề).")
            return

        # ──── STAGE 5: Materials (tải video) ────
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=55,
                          message="Đang tải video clips...")
        clip_paths = material.download_materials(
            terms=params.terms,
            task_dir=td,
            aspect=params.video_aspect.value,
        )
        if stop_at == "materials":
            state.update_task(task_id, TASK_STATE_COMPLETE, progress=100,
                              message="Xong (chỉ tải clips).")
            return

        # ──── STAGE 6: Video (ghép) ────
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=70,
                          message="Đang xử lý video clips...")

        # 6a. Lấy độ dài audio để biết video cần dài bao nhiêu
        from moviepy import AudioFileClip
        audio_clip = AudioFileClip(str(audio_path))
        target_duration = audio_clip.duration
        audio_clip.close()

        # 6b. Nắn từng clip về khung dọc
        processed_clips = []
        for clip_path in clip_paths:
            out = td / f"processed-{clip_path.stem}.mp4"
            video.preprocess_video(clip_path, out,
                                   params.video_aspect.value,
                                   params.video_clip_duration)
            processed_clips.append(out)

        # 6c. Nối các clip thành 1 video khớp độ dài audio
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=80,
                          message="Đang ghép video...")
        combined_path = td / "combined.mp4"
        video.combine_videos(processed_clips, combined_path,
                             target_duration=target_duration)

        # 6d. Render cuối: hình + tiếng + chữ + nhạc nền
        state.update_task(task_id, TASK_STATE_PROCESSING, progress=90,
                          message="Đang render video cuối cùng...")
        final_path = td / "final.mp4"
        video.generate_video(
            video_path=combined_path,
            audio_path=audio_path,
            subtitle_path=subtitle_path if params.subtitle_enabled else None,
            output_path=final_path,
            bgm_path=Path(params.bgm_file) if params.bgm_file else None,
            bgm_volume=params.bgm_volume,
            font_size=params.font_size,
            font_color=params.font_color,
            stroke_color=params.stroke_color,
            stroke_width=int(params.stroke_width),
            subtitle_position=params.subtitle_position,
        )

        state.update_task(task_id, TASK_STATE_COMPLETE, progress=100,
                          message="Hoàn thành!", videos=[str(final_path)])

    except Exception as e:
        # Bắt MỌI lỗi → ghi trạng thái FAILED thay vì để app sập im lặng
        state.update_task(task_id, TASK_STATE_FAILED, progress=0,
                          message=f"Lỗi: {e}",
                          traceback=traceback.format_exc())
