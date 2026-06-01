# app/config/config.py
import os
import shutil
from pathlib import Path

import tomli
import tomli_w
from pydantic import BaseModel

# ──────────────────────────────────────────────
# TẠI SAO dùng Pydantic cho config?
# → Tự validate kiểu dữ liệu (port phải là int, enable phải là bool)
# → Có default values rõ ràng
# → IDE autocomplete được (config.app.llm_provider)
# → Nếu dùng dict thường, typo key sẽ trả None âm thầm — rất khó debug
# ──────────────────────────────────────────────

class AppConfig(BaseModel):
    llm_provider: str = "openai"
    model_name: str = "gpt-4o-mini"
    api_key: str = ""
    language: str = "vi"
    video_concat_mode: str = "random"
    video_aspect: str = "9:16"
    video_clip_duration: int = 5
    threads: int = 4

class AzureConfig(BaseModel):
    speech_key: str = ""
    speech_region: str = "eastus"

class ProxyConfig(BaseModel):
    enable: bool = False
    http: str = ""
    https: str = ""

class UIConfig(BaseModel):
    language: str = "vi"


# ──────────────────────────────────────────────
# TẠI SAO gom tất cả vào 1 class?
# → Import 1 lần: from app.config import config
# → Truyền config object thay vì 10 biến rời rạc
# ──────────────────────────────────────────────

class Config:
    def __init__(self):
        self._config_path = Path("config.toml")
        self._example_path = Path("config.example.toml")
        self._ensure_config_exists()
        self._load()

    def _ensure_config_exists(self):
        """Auto-copy example → config.toml nếu chưa có.

        TẠI SAO? Người dùng clone repo về, chạy luôn không cần setup thủ công.
        config.toml nằm trong .gitignore nên mỗi người có bản riêng.
        """
        if not self._config_path.exists() and self._example_path.exists():
            shutil.copy(self._example_path, self._config_path)

    def _load(self):
        with open(self._config_path, "rb") as f:
            data = tomli.load(f)

        self.app = AppConfig(**data.get("app", {}))
        self.azure = AzureConfig(**data.get("azure", {}))
        self.proxy = ProxyConfig(**data.get("proxy", {}))
        self.ui = UIConfig(**data.get("ui", {}))

        # ──────────────────────────────────────────────
        # TẠI SAO hỗ trợ env var override?
        # → Khi chạy Docker, bạn không muốn sửa file config bên trong container
        # → Truyền env var lúc docker run dễ hơn nhiều
        # → Ưu tiên: env var > config.toml > default
        # ──────────────────────────────────────────────
        if os.getenv("MPT_APP_API_KEY"):
            self.app.api_key = os.getenv("MPT_APP_API_KEY")

    def save_config(self):
        """Ghi ngược config đã sửa vào file.

        TẠI SAO cần? WebUI cho phép user sửa API key, language ngay trên giao diện.
        Khi user click Save, gọi hàm này để persist.
        """
        data = {
            "app": self.app.model_dump(),
            "azure": self.azure.model_dump(),
            "proxy": self.proxy.model_dump(),
            "ui": self.ui.model_dump(),
        }
        with open(self._config_path, "wb") as f:
            tomli_w.dump(data, f)


# ──────────────────────────────────────────────
# TẠI SAO tạo instance ở module level?
# → Singleton pattern: cả app chỉ có 1 config object
# → Mọi nơi import đều nhận cùng 1 instance
# → Config được load 1 lần duy nhất khi app start
# ──────────────────────────────────────────────
config = Config()
