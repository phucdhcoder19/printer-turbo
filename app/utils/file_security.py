# app/utils/file_security.py
from pathlib import Path


def resolve_path_within_directory(base_dir: Path, filename: str) -> Path:
    """Giải đường dẫn an toàn, đảm bảo vẫn nằm TRONG base_dir.

    TẠI SAO cần hàm này?

    Nếu user gửi filename = "../../etc/passwd"
      → Path("storage/tasks") / "../../etc/passwd" = "/etc/passwd"
      → LỘ FILE HỆ THỐNG!

    Hàm này resolve path thật rồi kiểm tra nó vẫn nằm trong base_dir.
    Đây là chống path traversal attack — BẮT BUỘC cho mọi endpoint
    nhận filename từ user.
    """
    base_resolved = base_dir.resolve()
    resolved = (base_resolved / filename).resolve()

    # Python 3.9+: dùng is_relative_to để kiểm tra an toàn
    if not resolved.is_relative_to(base_resolved):
        raise ValueError(f"Path traversal detected: {filename}")

    return resolved
