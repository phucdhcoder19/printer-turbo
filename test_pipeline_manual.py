# test_pipeline_manual.py — chạy TOÀN BỘ pipeline (Phase 1→6)
from app.models.schema import VideoParams, VideoAspect
from app.services.task import start
from app.services.state import state
from app.utils.utils import new_task_id

# Tạo 1 task mới
task_id = new_task_id()
print(f"Task ID: {task_id}\n")

params = VideoParams(
    topic="Cà phê Việt Nam",
    video_aspect=VideoAspect.portrait,   # 9:16
    voice_name="vi-VN-HoaiMyNeural",
    subtitle_enabled=True,
)

# Chạy pipeline (đồng bộ — sẽ chạy lần lượt 6 trạm, mất vài phút)
#
# 💡 MẸO: muốn test nhanh từng phần, đổi stop_at:
#   stop_at="audio"     → dừng sau khi có giọng đọc
#   stop_at="materials" → dừng sau khi tải clip
#   stop_at="video"     → chạy full (mặc định)
start(task_id, params, stop_at="video")

# In kết quả cuối
result = state.get_task(task_id)
print("\n===== KẾT QUẢ =====")
print("Trạng thái:", result.get("state"))
print("Tiến độ:", result.get("progress"), "%")
print("Thông báo:", result.get("message"))
if result.get("videos"):
    print("Video:", result["videos"][0])
if result.get("traceback"):
    print("\n--- LỖI CHI TIẾT ---")
    print(result["traceback"])
