# app/utils/utils.py
import uuid
from pathlib import Path


def new_task_id() -> str:
    """Tạo task ID unique.

    TẠI SAO uuid4? Vì nó random, không cần DB sequence, không conflict khi
    chạy nhiều instance. Lấy 8 ký tự đầu cho ngắn gọn (đủ unique cho app nhỏ).
    """
    return uuid.uuid4().hex[:8]


def task_dir(task_id: str) -> Path:
    """Thư mục chứa output của 1 task.

    TẠI SAO mỗi task 1 thư mục riêng?
    → Dễ dọn dẹp (xóa cả folder)
    → Không conflict tên file giữa các task
    → Biết ngay task nào tạo file nào
    """
    path = Path(f"storage/tasks/{task_id}")
    path.mkdir(parents=True, exist_ok=True)
    return path


def storage_dir() -> Path:
    path = Path("storage")
    path.mkdir(parents=True, exist_ok=True)
    return path


def resource_dir() -> Path:
    return Path("resource")


def font_dir() -> Path:
    return resource_dir() / "fonts"


def song_dir() -> Path:
    return resource_dir() / "songs"
