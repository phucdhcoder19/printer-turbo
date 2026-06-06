# test_llm_manual.py — chạy bằng tay để kiểm tra Phase 1 (LLM)
from app.services.llm import generate_script, generate_terms

topic = "Cà phê Việt Nam"

print("Đang gọi LLM sinh kịch bản (chờ chút, model chạy local)...\n")
script = generate_script(topic)
print("=== SCRIPT ===")
for i, sentence in enumerate(script):
    print(f"  {i+1}. {sentence}")

script_text = " ".join(script)
terms = generate_terms(topic, script_text)
print("\n=== SEARCH TERMS ===")
for term in terms:
    print(f"  - {term}")

print("\n✅ Phase 1 hoạt động!")
