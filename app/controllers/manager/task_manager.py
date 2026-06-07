# app/controllers/manager/task_manager.py
#
# TẠI SAO không dùng Celery?
# → Celery cần Redis/RabbitMQ broker, setup phức tạp cho project nhỏ.
# → Ta chỉ cần chạy vài task song song, không cần distributed queue.
# → ThreadPoolExecutor đủ dùng, không cần cài thêm gì.

from concurrent.futures import ThreadPoolExecutor

from app.models.schema import VideoParams
from app.services.task import start as start_task


class InMemoryTaskManager:
    def __init__(self, max_workers: int = 3):
        """
        TẠI SAO giới hạn max_workers = 3?
        → Render video rất tốn CPU + RAM.
        → 3 task song song đã dùng gần hết 1 server trung bình.
        → Nhiều hơn → dễ tràn RAM hoặc quá chậm.
        """
        self._executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit(self, task_id: str, params: VideoParams, stop_at: str = "video"):
        """Đẩy task vào hàng đợi, chạy trên thread nền → trả về NGAY (không chặn)."""
        self._executor.submit(start_task, task_id, params, stop_at)


# Singleton — cả app dùng chung 1 task manager
task_manager = InMemoryTaskManager()
