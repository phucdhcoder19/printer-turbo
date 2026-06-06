from pathlib import Path
from app.services.material import download_materials

terms = ["coffee beans", "vietnamese coffee"]
out_dir = Path("storage/tasks/test_material")
out_dir.mkdir(parents=True, exist_ok=True)

paths = download_materials(terms, out_dir)
print(f"Đã tải {len(paths)} video:")
for p in paths:
    print(f"  - {p} ({p.stat().st_size / 1024 / 1024:.1f} MB)")
