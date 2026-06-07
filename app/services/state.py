# app/services/state.py
#
# TẠI SAO tách state thành module riêng?
#
# Trạng thái task (progress, message) được ĐỌC/GHI từ NHIỀU NƠI:
#   → pipeline (task.py) GHI: "đang xử lý bước 3, 45%"
#   → API controller ĐỌC: GET /tasks/{id} → trả về progress
#   → WebUI ĐỌC: hiển thị thanh progress
#
# Nếu để state nằm trong task.py thì controller phải import task.py
# → kéo theo import tất cả services (nặng, dễ vòng lặp import).
# Tách riêng → controller chỉ import state.py (nhẹ).

from app.models.const import TASK_STATE_PROCESSING


class MemoryState:
    """Lưu trạng thái các task trong RAM (dict đơn giản).

    TẠI SAO MemoryState? Chạy 1 instance, dữ liệu trong RAM, đơn giản nhất.
    Sau này muốn scale nhiều tiến trình thì thay bằng RedisState (chung Redis).
    """

    def __init__(self):
        self._tasks = {}

    def update_task(self, task_id: str, state: str, progress: int = 0, **kwargs):
        """Ghi/cập nhật trạng thái 1 task.

        **kwargs cho phép đính kèm dữ liệu tùy ý: message, videos, traceback...
        """
        if task_id not in self._tasks:
            self._tasks[task_id] = {}
        self._tasks[task_id].update(state=state, progress=progress, **kwargs)

    def get_task(self, task_id: str) -> dict:
        """Đọc trạng thái 1 task (trả về dict rỗng nếu không có)."""
        return self._tasks.get(task_id, {})


# Singleton — cả app dùng chung 1 bảng trạng thái
state = MemoryState()
