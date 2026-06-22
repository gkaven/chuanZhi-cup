import json
from openai import OpenAI
from backend.config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL

client = OpenAI(api_key=KIMI_API_KEY, base_url=KIMI_BASE_URL)

INTENT_PROMPT = """你是一个意图识别助手。根据用户消息和附件类型，判断用户意图。

支持的意图：
- resume_eval: 简历评估
- audio_analysis: 面试录音分析
- question_gen: 面试题生成
- cover_letter: 求职信生成
- salary_negotiation: 薪资谈判
- career_plan: 职业规划
- chat: 闲聊/其他

附件类型参考：pdf/docx → 简历相关，mp3/wav/m4a → 录音分析

只输出JSON，格式：{"intent": "xxx", "confidence": 0.95}"""

def detect_intent(message: str, attachments: list) -> dict:
    attach_desc = ""
    if attachments:
        types = [a.get("type", "") for a in attachments]
        attach_desc = f"\n附件类型: {', '.join(types)}"

    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": INTENT_PROMPT},
                {"role": "user", "content": f"用户消息: {message}{attach_desc}"}
            ],
            temperature=0.1,
            max_tokens=50,
        )
        return json.loads(resp.choices[0].message.content.strip())
    except Exception:
        # 降级：根据附件类型推断
        if attachments:
            t = attachments[0].get("type", "")
            if t in ("resume", "pdf", "docx"):
                return {"intent": "resume_eval", "confidence": 0.6}
            if t in ("audio", "mp3", "wav", "m4a"):
                return {"intent": "audio_analysis", "confidence": 0.6}
        return {"intent": "chat", "confidence": 0.5}
