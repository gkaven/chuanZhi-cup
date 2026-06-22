import json
from openai import OpenAI
from backend.config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL
from backend.utils.db import get_db

client = OpenAI(api_key=KIMI_API_KEY, base_url=KIMI_BASE_URL)

QUESTION_GEN_PROMPT = """你是一个专业的面试官。根据以下简历内容，生成个性化面试题。

要求：
- 基础题5道：考察简历中的技能点
- 项目题3道：针对简历项目经历深挖
- 综合题2道：行为面试/情景题

输出严格JSON格式：
{
  "target_position": "岗位名称",
  "questions": [
    {"type": "technical", "difficulty": "medium", "question": "题目", "key_points": ["要点1"]}
  ]
}"""

def run(resume_text: str, rag_context: str = "") -> dict:
    from backend.rag.knowledge_base import search
    if not rag_context:
        # 从简历提取关键词做 RAG 检索
        results = search("interview_guide", resume_text[:200], n_results=3)
        rag_context = "\n".join(results)

    prompt = f"简历内容：\n{resume_text[:2000]}"
    if rag_context:
        prompt += f"\n\n参考面试题库：\n{rag_context[:1000]}"

    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": QUESTION_GEN_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        return json.loads(resp.choices[0].message.content.strip())
    except Exception as e:
        return {"error": f"生成失败: {str(e)}", "questions": []}
