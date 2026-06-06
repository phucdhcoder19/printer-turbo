# app/services/voice.py
import asyncio
import edge_tts
from pathlib import Path


# ──────────────────────────────────────────────
# TẠI SAO hàm internal là async nhưng public API là sync?
#
# edge_tts là thư viện async (dùng aiohttp gọi WebSocket tới Microsoft).
# Nhưng pipeline (task.py) chạy sync, tuần tự trên background thread.
# Nếu để hàm public là async, mọi caller phải dùng await → lằng nhằng.
#
# Giải pháp: hàm internal _generate_with_edge là async, hàm public
# generate_audio dùng asyncio.run() để "bắc cầu" sync → async.
# ──────────────────────────────────────────────


def _fmt_percent(value: float) -> str:
    """Đổi hệ số (1.0 = bình thường) sang dạng '+0%' / '-20%' mà Edge TTS cần.

    Edge TTS không nhận số 1.0, 1.2... mà nhận chuỗi phần trăm:
      rate=1.0  → "+0%"   (tốc độ gốc)
      rate=1.2  → "+20%"  (nhanh hơn 20%)
      rate=0.8  → "-20%"  (chậm hơn 20%)
    """
    pct = int(round((value - 1) * 100))
    return f"+{pct}%" if pct >= 0 else f"{pct}%"


async def _generate_with_edge(
    text: str,
    voice: str,
    rate: float,
    volume: float,
    output_path: Path,
) -> list[dict]:
    """Tạo audio + thu thập word timestamps.

    Returns: list các dict {"text": str, "start": float, "end": float}
    """
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=_fmt_percent(rate),
        volume=_fmt_percent(volume),
    )

    word_timestamps = []

    # ──────────────────────────────────────────
    # TẠI SAO dùng stream() thay vì save()?
    #
    # communicate.save("out.mp3") chỉ lưu audio, KHÔNG cho timestamps.
    # communicate.stream() trả về TỪNG chunk, gồm 2 loại:
    #   - type="audio":        dữ liệu MP3 (ghi vào file)
    #   - type="WordBoundary": timestamp của từng từ (ta cần cái này)
    #
    # Ta cần CẢ HAI nên bắt buộc dùng stream().
    # ──────────────────────────────────────────
    with open(output_path, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Edge TTS tính thời gian bằng đơn vị 100-nanosecond.
                # Chia 10_000_000 để đổi sang GIÂY.
                start = chunk["offset"] / 10_000_000
                duration = chunk["duration"] / 10_000_000
                word_timestamps.append({
                    "text": chunk["text"],
                    "start": start,
                    "end": start + duration,
                })

    return word_timestamps


# ──────────────────────────────────────────────
# PUBLIC API — hàm này được task.py (Phase 6) gọi
# ──────────────────────────────────────────────

def generate_audio(
    text: str,
    output_path: Path,
    voice: str = "vi-VN-HoaiMyNeural",
    rate: float = 1.0,
    volume: float = 1.0,
) -> list[dict]:
    """Public API: text → file audio + word timestamps.

    TẠI SAO trả về timestamps chứ không chỉ lưu audio?
    → Timestamps được Phase 3 dùng để tạo phụ đề khớp giọng đọc.
    → Tránh phải chạy Whisper (tốn vài GB RAM + chậm).
    """
    return asyncio.run(
        _generate_with_edge(text, voice, rate, volume, Path(output_path))
    )
