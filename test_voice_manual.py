# test_voice_manual.py — tự chạy để kiểm tra Phase 2 (giọng đọc)
from pathlib import Path
from app.services.voice import generate_audio

text = "Bạn có biết Việt Nam là nước xuất khẩu cà phê lớn thứ hai thế giới không?"
output = Path("test_output.mp3")

print("Đang tạo giọng đọc (gọi tới Microsoft Edge TTS, cần internet)...\n")
timestamps = generate_audio(text, output)

print(f"✅ Audio đã lưu: {output} ({output.stat().st_size / 1024:.1f} KB)")
print(f"\nWord timestamps ({len(timestamps)} từ) — 10 từ đầu:")
for w in timestamps[:10]:
    print(f"  [{w['start']:.2f}s - {w['end']:.2f}s] {w['text']}")

print("\n👉 Mở file test_output.mp3 bằng trình nghe nhạc để kiểm tra giọng.")
