# app/services/material.py
import httpx
from pathlib import Path
from app.config.config import config


def _search_pexels(
    query: str,
    aspect: str = "9:16",
    per_page: int = 5,
) -> list[dict]:
    """Tìm video trên Pexels theo từ khóa + đúng tỉ lệ khung hình.

    TẠI SAO lọc theo aspect? Video TikTok là 9:16 (dọc). Nếu lấy video
    ngang (16:9) rồi cắt → mất nội dung 2 bên. Pexels cho lọc 'orientation'
    nên ta lấy đúng loại ngay từ đầu.
    """
    url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": config.app.pexels_api_key}

    # Đổi tỉ lệ "9:16" → tên orientation mà Pexels hiểu
    orientation_map = {
        "9:16": "portrait",
        "16:9": "landscape",
        "1:1": "square",
    }
    orientation = orientation_map.get(aspect, "portrait")

    resp = httpx.get(url, headers=headers, params={
        "query": query,
        "orientation": orientation,
        "per_page": per_page,
        "size": "medium",   # medium ~1280px, đủ nét cho video ngắn
    })
    resp.raise_for_status()   # nếu key sai / lỗi mạng → báo lỗi ngay
    data = resp.json()

    # Trích ra URL tải + thông tin từng video
    results = []
    for video in data.get("videos", []):
        files = video.get("video_files", [])
        if not files:
            continue
        # Chọn file có độ phân giải cao nhất
        best = max(files, key=lambda f: f.get("height", 0))
        results.append({
            "id": video["id"],
            "url": best["link"],
            "width": best.get("width", 0),
            "height": best.get("height", 0),
            "duration": video.get("duration", 0),
        })
    return results

def download_video(url: str, output_path: Path) -> Path:
    """Tải 1 video về disk.

    TẠI SAO dùng stream=True? File video lớn (50-200MB). Nếu nạp hết
    vào RAM rồi mới ghi → tốn bộ nhớ. stream đọc từng khúc nhỏ rồi
    ghi ngay → tiết kiệm RAM.
    """
    with httpx.stream("GET", url, follow_redirects=True) as resp:
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in resp.iter_bytes(chunk_size=8192):
                f.write(chunk)
    return output_path

# ──────────────────────────────────────────────
# PUBLIC API — task.py (Phase 6) gọi hàm này
# ──────────────────────────────────────────────
def download_materials(
    terms: list[str],
    task_dir: Path,
    aspect: str = "9:16",
    clips_per_term: int = 2,
) -> list[Path]:
    """search terms → tải các clip → trả về danh sách đường dẫn.

    TẠI SAO dùng seen_ids (set)? Cùng 1 video có thể xuất hiện ở nhiều
    từ khóa. set giúp tránh tải trùng → tiết kiệm mạng + video không lặp hình.
    """
    materials_dir = task_dir / "materials"
    materials_dir.mkdir(exist_ok=True)

    downloaded = []
    seen_ids = set()

    for term in terms:
        results = _search_pexels(term, aspect=aspect, per_page=clips_per_term)
        for video_info in results:
            if video_info["id"] in seen_ids:
                continue
            seen_ids.add(video_info["id"])

            output = materials_dir / f"{video_info['id']}.mp4"
            download_video(video_info["url"], output)
            downloaded.append(output)

    return downloaded
