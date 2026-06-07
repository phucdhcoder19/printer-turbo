from pathlib import Path
from app.services.video import preprocess_video, combine_videos

mats = Path("storage/tasks/test_material/materials")
clips = sorted(mats.glob("*.mp4"))
print(f"Tìm thấy {len(clips)} clip gốc")

out_dir = Path("storage/tasks/test_video")
out_dir.mkdir(parents=True, exist_ok=True)

# Nắn từng clip về khung dọc 9:16
processed = []
for i, c in enumerate(clips):
    out = out_dir / f"processed_{i}.mp4"
    print(f"  Đang xử lý {c.name} ...")
    preprocess_video(c, out, "9:16", clip_duration=5)
    processed.append(out)

# Nối lại thành 1 video ~20 giây
combined = out_dir / "combined.mp4"
combine_videos(processed, combined, target_duration=20.0)
print(f"✅ Xong! Mở xem: {combined}")
