# app/services/video.py
from pathlib import Path

# moviepy 2.x: import thẳng từ "moviepy", KHÔNG còn "moviepy.editor"
from moviepy import (
    VideoFileClip, AudioFileClip, TextClip,
    CompositeVideoClip, CompositeAudioClip,
    concatenate_videoclips,
)


def _target_resolution(aspect: str) -> tuple[int, int]:
    """Đổi tỉ lệ '9:16' → độ phân giải cụ thể (1080x1920).

    TẠI SAO 1080x1920? Đây là chuẩn Full HD dọc, hợp TikTok/Reels/Shorts:
    đủ nét trên điện thoại mà file không quá nặng.
    """
    resolutions = {
        "9:16": (1080, 1920),
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
    }
    return resolutions.get(aspect, (1080, 1920))

def preprocess_video(
    input_path: Path,
    output_path: Path,
    target_aspect: str = "9:16",
    clip_duration: int = 5,
) -> Path:
    """Cắt + crop + resize 1 clip về đúng khung 9:16.

    TẠI SAO crop từ giữa? Chủ thể chính của video thường ở giữa.
    Crop từ góc dễ mất chủ thể.
    """
    clip = VideoFileClip(str(input_path))

    # Cắt lấy 5 giây ở GIỮA clip
    # (moviepy 1.x: .subclip  →  2.x đổi thành .subclipped)
    if clip.duration > clip_duration:
        start = (clip.duration - clip_duration) / 2
        clip = clip.subclipped(start, start + clip_duration)

    target_w, target_h = _target_resolution(target_aspect)
    target_ratio = target_w / target_h
    current_ratio = clip.w / clip.h

    # Crop về đúng tỉ lệ (1.x: .crop → 2.x: .cropped)
    if current_ratio > target_ratio:
        # Video quá RỘNG → cắt bớt 2 bên
        new_w = int(clip.h * target_ratio)
        x_center = clip.w / 2
        clip = clip.cropped(x1=int(x_center - new_w / 2),
                            x2=int(x_center + new_w / 2))
    elif current_ratio < target_ratio:
        # Video quá CAO → cắt bớt trên/dưới
        new_h = int(clip.w / target_ratio)
        y_center = clip.h / 2
        clip = clip.cropped(y1=int(y_center - new_h / 2),
                            y2=int(y_center + new_h / 2))

    # Resize về chuẩn (1.x: .resize → 2.x: .resized)
    clip = clip.resized((target_w, target_h))

    # Bỏ tiếng gốc của clip stock (1.x: audio=False → 2.x: .without_audio())
    clip = clip.without_audio()

    clip.write_videofile(str(output_path), codec="libx264", fps=30, preset="medium")
    clip.close()
    return output_path


def combine_videos(
    clips: list[Path],
    output_path: Path,
    target_duration: float = 60.0,
) -> Path:
    """Nối nhiều clip cho đến khi đủ độ dài bằng giọng đọc.

    TẠI SAO cần target_duration? Audio (giọng đọc) dài 60s thì video cũng
    phải 60s. Nếu tổng clip ngắn hơn → lặp lại clip cho đủ.
    """
    import random

    video_clips = []
    total = 0.0

    shuffled = list(clips)
    random.shuffle(shuffled)   # xáo trộn cho video đỡ bị lặp pattern

    idx = 0
    while total < target_duration:
        path = shuffled[idx % len(shuffled)]
        clip = VideoFileClip(str(path))
        remaining = target_duration - total
        if clip.duration > remaining:
            clip = clip.subclipped(0, remaining)   # cắt cho khớp phần còn thiếu
        video_clips.append(clip)
        total += clip.duration
        idx += 1

    final = concatenate_videoclips(video_clips, method="compose")
    final.write_videofile(str(output_path), codec="libx264", fps=30)

    for c in video_clips:
        c.close()
    final.close()
    return output_path


def generate_video(
    video_path: Path,
    audio_path: Path,
    subtitle_path: Path,
    output_path: Path,
    bgm_path: Path = None,
    bgm_volume: float = 0.3,
    font: str = "C:/Windows/Fonts/arial.ttf",   # font có sẵn trên Windows, hỗ trợ tiếng Việt
    font_size: int = 60,
    font_color: str = "white",
    stroke_color: str = "black",
    stroke_width: int = 2,
    subtitle_position: str = "bottom",
) -> Path:
    """Ghép video + giọng đọc + phụ đề + nhạc nền → file final.mp4."""
    import pysrt

    video = VideoFileClip(str(video_path))
    audio = AudioFileClip(str(audio_path))

    # ----- Dán phụ đề -----
    subtitle_clips = []
    if subtitle_path and Path(subtitle_path).exists():
        subs = pysrt.open(str(subtitle_path))
        y_positions = {
            "bottom": video.h * 0.8,
            "center": video.h * 0.5,
            "top": video.h * 0.15,
        }
        y_pos = y_positions.get(subtitle_position, video.h * 0.8)

        for sub in subs:
            start = sub.start.ordinal / 1000   # pysrt cho mili-giây → đổi sang giây
            end = sub.end.ordinal / 1000

            # moviepy 2.x: TextClip BẮT BUỘC có font (đường dẫn file),
            # dùng font_size (không phải fontsize), và dùng Pillow nên
            # KHÔNG cần ImageMagick.
            txt = (
                TextClip(
                    font=font,
                    text=sub.text,
                    font_size=font_size,
                    color=font_color,
                    stroke_color=stroke_color,
                    stroke_width=stroke_width,
                    method="caption",                 # tự xuống dòng khi dài
                    size=(int(video.w * 0.9), None),  # rộng 90% video
                )
                .with_position(("center", y_pos))     # 1.x: set_position → 2.x: with_position
                .with_start(start)                    # set_start → with_start
                .with_duration(end - start)           # set_duration → with_duration
            )
            subtitle_clips.append(txt)

    final_video = CompositeVideoClip([video] + subtitle_clips)

    # ----- Trộn âm thanh: giọng đọc + nhạc nền -----
    if bgm_path and Path(bgm_path).exists():
        bgm = AudioFileClip(str(bgm_path))
        if bgm.duration < audio.duration:
            # Nhạc ngắn hơn giọng đọc → lặp cho đủ
            from moviepy import concatenate_audioclips
            n = int(audio.duration / bgm.duration) + 1
            bgm = concatenate_audioclips([bgm] * n)
        bgm = bgm.subclipped(0, audio.duration).with_volume_scaled(bgm_volume)
        # 1.x: volumex → 2.x: with_volume_scaled
        mixed_audio = CompositeAudioClip([audio, bgm])
    else:
        mixed_audio = audio

    final_video = final_video.with_audio(mixed_audio).with_duration(audio.duration)

    final_video.write_videofile(
        str(output_path),
        codec="libx264",
        audio_codec="aac",
        fps=30,
        preset="medium",
    )

    video.close()
    audio.close()
    final_video.close()
    return output_path
