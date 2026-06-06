# app/services/llm.py
import json
import re
from openai import OpenAI
from app.config.config import config


def _build_script_prompt(topic: str, language: str = "vi") -> str:
    """
    TẠI SAO prompt phải có cấu trúc rõ ràng?

    LLM trả về text tự do → rất khó parse. Nếu bạn bảo "viết kịch bản"
    thì nó có thể trả về 1 đoạn văn, hoặc có tiêu đề, hoặc
     có gạch đầu dòng.

    Giải pháp: yêu cầu trả về JSON array → parse chính xác, mỗi phần tử
    là 1 câu/đoạn → dễ chia thành subtitle segments sau này.
    """
    return f"""Bạn là biên kịch video ngắn chuyên nghiệp.
Viết kịch bản cho video ngắn (60-90 giây) về chủ đề: "{topic}"

YÊU CẦU:
- Ngôn ngữ: {language}
- Giọng văn: tự nhiên, hấp dẫn, dễ hiểu
- Cấu trúc: mở đầu gây tò mò → thân bài thông tin → kết bài ấn tượng
- Mỗi câu ngắn gọn (dưới 20 từ) vì sẽ hiển thị làm subtitle

TRẢ VỀ: chỉ JSON array các câu, KHÔNG có text khác.
Ví dụ: ["Câu mở đầu.", "Câu thứ hai.", "Câu kết."]
"""


def _build_terms_prompt(topic: str, script: str, amount: int = 5) -> str:
    """
    TẠI SAO cần search terms riêng, không dùng thẳng topic?

    Topic = "Cà phê Việt Nam" → search Pexels chỉ ra video về "Vietnam coffee"
    Nhưng kịch bản có thể nói về: pha chế, nông dân, hạt cà phê, quán cafe, buổi sáng

    Search terms đa dạng → video đa dạng → video cuối hấp dẫn hơn.
    Yêu cầu tiếng Anh vì Pexels/Pixabay search tiếng Anh tốt hơn nhiều.
    """
    return f"""Dựa trên kịch bản video sau, tạo {amount} từ khóa tìm kiếm video stock.

Chủ đề: {topic}
Kịch bản: {script}

YÊU CẦU:
- Từ khóa bằng tiếng Anh (vì search trên Pexels/Pixabay)
- Mỗi từ khóa 1-3 từ, cụ thể, visual (có thể quay video được)
- Đa dạng: không lặp lại ý

TRẢ VỀ: chỉ JSON array, ví dụ: ["coffee beans", "morning routine", "cafe shop"]
"""


# ──────────────────────────────────────────────
# TẠI SAO dùng pattern if/elif dispatch thay vì class inheritance?
#
# Project gốc hỗ trợ ~20 LLM providers. Nếu dùng class:
#   class OpenAIProvider(BaseLLM): ...
#   class GeminiProvider(BaseLLM): ...
#   → 20 files, 20 classes, factory pattern, registry
#
# if/elif đơn giản hơn nhiều cho use case này vì:
# → Mỗi provider chỉ khác 3-5 dòng (URL, auth, format)
# → Không cần polymorphism phức tạp
# → Thêm provider mới = thêm 1 elif block
# → Dễ đọc: mở file lên thấy hết tất cả providers
#
# Trade-off: file sẽ dài khi có 20+ providers, nhưng đó là OK
# vì mỗi block độc lập, không ảnh hưởng nhau.
# ──────────────────────────────────────────────

def _call_llm(prompt: str) -> str:
    """Gọi LLM và trả về text response."""
    provider = config.app.llm_provider

    if provider == "ollama":
        # Ollama expose OpenAI-compatible API tại /v1 — BẮT BUỘC có /v1,
        # vì OpenAI SDK sẽ nối "/chat/completions" vào sau base_url.
        base_url = config.app.base_url or "http://localhost:11434/v1"
        client = OpenAI(
            base_url=base_url,
            api_key=config.app.api_key or "ollama",  # Ollama không check key
        )
        resp = client.chat.completions.create(
            model=config.app.model_name,
            messages=[{"role": "user", "content"
            : prompt}],
            temperature=0.7,      # sáng tạo vừa phải
            # qwen3 là model "thinking": phần suy luận nằm ở trường `reasoning`
            # riêng và CŨNG ăn vào token budget. Để 2000 thì nó nghĩ chưa xong
            # đã hết quota → content rỗng. Cho rộng 8000 để vừa nghĩ vừa xuất JSON.
            max_tokens=8000,
        )
        return resp.choices[0].message.content.strip()

    # elif provider == "gemini":
    #     ...
    # elif provider == "ollama":
    #     ...

    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")


def _parse_json_response(text: str) -> list:
    """
    TẠI SAO cần hàm parse riêng?

    LLM thường trả về JSON bọc trong ```json ... ``` hoặc kèm text thừa.
    Riêng model "thinking" như qwen3 còn trả về <think>...</think> trước JSON.
    Hàm này dọn sạch rồi trích đúng JSON array trong response.
    """
    text = text.strip()

    # Bỏ block reasoning <think>...</think> của qwen3 và các model thinking khác.
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Bỏ markdown code fences nếu có
    if text.startswith("```"):
        text = text.split("\n", 1)[1]  # bỏ dòng ```json
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback: trích phần JSON array [...] đầu tiên trong text thừa.
        match = re.search(r"\[.*\]", text, flags=re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


# ──────────────────────────────────────────────
# PUBLIC API — 2 hàm này được gọi bởi pipeline
# ──────────────────────────────────────────────

def generate_script(topic: str, language: str = "vi") -> list[str]:
    """Topic → danh sách câu kịch bản."""
    prompt = _build_script_prompt(topic, language)
    response = _call_llm(prompt)
    return _parse_json_response(response)


def generate_terms(topic: str, script_text: str, amount: int = 5) -> list[str]:
    """Topic + script → danh sách search terms tiếng Anh."""
    prompt = _build_terms_prompt(topic, script_text, amount)
    response = _call_llm(prompt)
    return _parse_json_response(response)
