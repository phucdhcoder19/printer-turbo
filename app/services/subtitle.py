from pathlib import Path

def _group_words_into_segments(
    words: list[dict],
    max_words: int = 8,
    max_duration: float = 4.0
) -> list[dict]:
    """Gom các từ lẻ thành từng "đoạn" (segment) cho phụ đề.

    TẠI SAO cần gom? Nếu hiện từng CHỮ một thì phụ đề nhảy quá nhanh,
    không đọc kịp. Gom 5-8 chữ thành 1 dòng → vừa mắt, khớp giọng đọc.
    """
    segments = []
    current_words = [] 

    for word in words:
        current_words.append(word)
        # Nếu đã đủ số từ hoặc thời lượng, chốt 1 segment
        duration = current_words[-1]["end"] - current_words[0]["start"]
        if len(current_words) >= max_words or duration >= max_duration:
            segments.append({
                "text": " ".join(w["text"] for w in current_words),
                "start": current_words[0]["start"],
                "end": current_words[-1]["end"],
            })
            current_words = []

    # Phần dư cuối cùng — NGANG HÀNG với `for`, chỉ chạy 1 lần sau vòng lặp
    if current_words:
        segments.append({
            "text": " ".join(w["text"] for w in current_words),
            "start": current_words[0]["start"],
            "end": current_words[-1]["end"],
        })
    return segments

def _format_timestamp(seconds: float) -> str:
    """Đổi giây sang format SRT (hh:mm:ss,ms)."""
    ms = int((seconds - int(seconds)) * 1000)
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

def create_srt(subtitle_segments: list[dict], output_path: Path):
    lines = []
    for i, seg in enumerate(subtitle_segments, start=1):
        lines.append(str(i))                        # số thứ tự
        start = _format_timestamp(seg["start"])
        end = _format_timestamp(seg["end"])
        lines.append(f"{start} --> {end}")          # dòng thời gian (bắt buộc của SRT)
        lines.append(seg["text"])                   # nội dung phụ đề
        lines.append("")                            # dòng trống ngăn cách các segment
    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path


# ──────────────────────────────────────────────
# PUBLIC API — task.py (Phase 6) gọi hàm này
# ──────────────────────────────────────────────
def generate_subtitle_from_timestamps(
    word_timestamps: list[dict],
    output_path: Path,
) -> Path:
    """Public API: word timestamps (từ Phase 2) → file .srt"""
    segments = _group_words_into_segments(word_timestamps)
    return create_srt(segments, output_path)
