# debug_llm_raw.py — test API GỐC của Ollama với think=False
import httpx
from app.config.config import config
from app.services.llm import _build_script_prompt

# API gốc Ollama: bỏ phần /v1 đi
base = (config.app.base_url or "http://localhost:11434/v1").rsplit("/v1", 1)[0]
url = base + "/api/chat"

resp = httpx.post(url, json={
    "model": config.app.model_name,
    "messages": [{"role": "user", "content": _build_script_prompt("Cà phê Việt Nam")}],
    "think": False,          # <-- tắt thinking (API gốc nhận tham số này)
    "stream": False,
    "options": {"temperature": 0.7, "num_predict": 2000},
}, timeout=120)

data = resp.json()
msg = data.get("message", {})
print("=== done_reason:", data.get("done_reason"))
print("=== thinking len:", len(msg.get("thinking") or ""))
print("=== content len:", len(msg.get("content") or ""))
print("=== content:")
print(msg.get("content"))
