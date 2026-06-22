import json
from openai import OpenAI
from backend.config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL
from backend.utils.db import get_db
from backend.utils.file_parser import parse_resume

client = OpenAI(api_key=KIMI_API_KEY, base_url=KIMI_BASE_URL)

EVAL_PROMPT = """你是一个专业的简历评估专家。请对以下简历进行全面评估。

评估维度：
1. 完整性（姓名/联系方式/教育/工作经历/技能）
2. 格式规范（长度、结构清晰度）
3. 内容质量（描述是否量化、与岗位匹配度）

输出严格的JSON格式：
{
  "score": 85,
  "completeness": {"score": 90, "missing": []},
  "format": {"score": 80, "suggestions": []},
  "ai_suggestions": ["建议1", "建议2"]
}"""

def check_duplicate(text: str) -> dict:
    """TF-IDF 简单查重"""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT parsed_text FROM resume_templates LIMIT 500")
            templates = [r["parsed_text"] for r in cur.fetchall()]
    finally:
        db.close()

    if not templates:
        return {"is_template": False, "similarity": 0.0}

    try:
        vec = TfidfVectorizer(analyzer="char", ngram_range=(2, 3))
        matrix = vec.fit_transform([text] + templates)
        sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
        max_sim = float(np.max(sims))
        return {"is_template": max_sim > 0.8, "similarity": round(max_sim, 3)}
    except Exception:
        return {"is_template": False, "similarity": 0.0}

def run(resume_id: int, file_path: str, user_id: int) -> dict:
    # 如果 file_path 为空，从数据库查
    if not file_path:
        db = get_db()
        try:
            with db.cursor() as cur:
                cur.execute("SELECT file_path, parsed_content FROM resumes WHERE id=%s", (resume_id,))
                row = cur.fetchone()
                if row:
                    file_path = row["file_path"] or ""
                    if row.get("parsed_content"):
                        text = row["parsed_content"]
                        if text.strip():
                            return _eval(text, resume_id, user_id)
        finally:
            db.close()

    text = parse_resume(file_path)
    if not text.strip():
        # 回退：使用上传时已解析并存入数据库的内容
        db2 = get_db()
        try:
            with db2.cursor() as cur:
                cur.execute("SELECT parsed_content FROM resumes WHERE id=%s", (resume_id,))
                row = cur.fetchone()
                if row and row.get("parsed_content") and row["parsed_content"].strip():
                    text = row["parsed_content"]
                else:
                    return {"error": "简历解析失败，请检查文件格式"}
        finally:
            db2.close()
    return _eval(text, resume_id, user_id)

def _eval(text: str, resume_id: int, user_id: int) -> dict:

    # 规则评估
    fields = {"姓名": any(k in text for k in ["姓名", "：", ":"]),
              "联系方式": any(k in text for k in ["电话", "邮箱", "手机"]),
              "教育经历": any(k in text for k in ["教育", "学历", "大学", "学院"]),
              "工作经历": any(k in text for k in ["工作", "经历", "任职", "公司"]),
              "技能": any(k in text for k in ["技能", "擅长", "熟悉", "掌握"])}
    missing = [k for k, v in fields.items() if not v]
    completeness_score = int((len(fields) - len(missing)) / len(fields) * 100)

    # 查重
    dup = check_duplicate(text)

    # 大模型深度评估
    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": EVAL_PROMPT},
                {"role": "user", "content": f"简历内容：\n{text[:3000]}"}
            ],
            temperature=0.3,
            max_tokens=800,
        )
        ai_result = json.loads(resp.choices[0].message.content.strip())
    except Exception as e:
        ai_result = {"score": completeness_score, "ai_suggestions": [f"AI评估失败: {str(e)}"]}

    report = {
        "score": ai_result.get("score", completeness_score),
        "completeness": {"score": completeness_score, "missing": missing},
        "duplicate_check": dup,
        "ai_suggestions": ai_result.get("ai_suggestions", []),
        "format": ai_result.get("format", {}),
    }

    # 存库
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "UPDATE resumes SET parsed_content=%s WHERE id=%s",
                (text[:10000], resume_id)
            )
            cur.execute(
                "INSERT INTO eval_reports (user_id, resume_id, report_type, report_json, score) VALUES (%s,%s,%s,%s,%s)",
                (user_id, resume_id, "resume_eval", json.dumps(report, ensure_ascii=False), report["score"])
            )
            db.commit()
            report["report_id"] = cur.lastrowid
    finally:
        db.close()

    return report
