import json, hashlib, hmac, base64, time, requests, os
from openai import OpenAI
from backend.config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL, XUNFEI_APP_ID, XUNFEI_SECRET_KEY
from backend.utils.db import get_db

client = OpenAI(api_key=KIMI_API_KEY, base_url=KIMI_BASE_URL)

SPLIT_PROMPT = """根据以下面试对话（已标注角色），提取所有问答对。
面试官的话是问题，求职者的话是回答。
输出严格JSON格式：
{"qa_pairs": [{"question": "面试官问题", "answer": "求职者回答"}]}"""

EVAL_PROMPT = """你是面试评估专家。评估求职者的回答质量。
参考资料：{context}

输出JSON：{{"accuracy": "accurate|partial|wrong", "score": 75, "reference": "标准要点", "suggestion": "改进建议"}}"""

OVERALL_PROMPT = """你是专业面试评估专家。根据以下面试问答评估结果，给出综合评价。
输出JSON：{{"overall_score": 75, "strengths": ["优点1"], "improvements": ["改进点1"], "summary": "综合评价"}}"""

def _get_file_hash(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()

def run(audio_path: str, user_id: int) -> dict:
    # 去重：检查同一文件是否已处理
    file_hash = _get_file_hash(audio_path)
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, report_json FROM eval_reports WHERE user_id=%s AND report_type='audio_analysis' AND JSON_EXTRACT(report_json,'$.file_hash')=%s LIMIT 1",
                (user_id, file_hash)
            )
            existing = cur.fetchone()
            if existing:
                report = json.loads(existing["report_json"])
                report["report_id"] = existing["id"]
                report["cached"] = True
                return report
    finally:
        db.close()

    # Step1: ASR 转写（含角色分离）
    try:
        transcript, role_transcript = _xunfei_asr(audio_path)
    except Exception as e:
        return {"error": f"语音转写失败，请检查网络: {str(e)}"}

    # Step2: 问答分离（使用角色标注文本）
    qa_pairs = []
    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": SPLIT_PROMPT},
                {"role": "user", "content": role_transcript or transcript}
            ],
            temperature=0.1, max_tokens=2000,
        )
        content = resp.choices[0].message.content
        try:
            qa_pairs = json.loads(content)["qa_pairs"]
        except Exception:
            qa_pairs = []
    except Exception as e:
        # LLM 失败时不中断，继续用空问答对生成报告
        pass

    # Step3: 逐题评估
    questions = []
    for qa in qa_pairs:
        context = _rag_search(qa["question"])
        try:
            r = client.chat.completions.create(
                model=KIMI_MODEL,
                messages=[{"role": "user", "content":
                    EVAL_PROMPT.format(context=context) +
                    f"\n问题：{qa['question']}\n回答：{qa['answer']}"}],
                temperature=0.2, max_tokens=400,
            )
            try:
                eval_result = json.loads(r.choices[0].message.content)
            except Exception:
                eval_result = {"accuracy": "unknown", "score": 60, "reference": "", "suggestion": ""}
        except Exception:
            eval_result = {"accuracy": "unknown", "score": 0, "reference": "", "suggestion": "评估失败，请检查网络"}

        questions.append({**qa, **eval_result})
        _save_question(qa["question"], user_id)

    # Step4: 综合评分
    overall = int(sum(q.get("score", 0) for q in questions) / max(len(questions), 1))
    strengths, improvements, summary = [], [], ""
    try:
        r2 = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[{"role": "user", "content":
                OVERALL_PROMPT + f"\n问答评估结果：{json.dumps(questions[:5], ensure_ascii=False)}"}],
            temperature=0.3, max_tokens=500,
        )
        try:
            ov = json.loads(r2.choices[0].message.content)
            overall = ov.get("overall_score", overall)
            strengths = ov.get("strengths", [])
            improvements = ov.get("improvements", [])
            summary = ov.get("summary", "")
        except Exception:
            pass
    except Exception:
        pass

    report = {
        "transcript": transcript,
        "role_transcript": role_transcript,
        "questions": questions,
        "overall_score": overall,
        "strengths": strengths,
        "improvements": improvements,
        "summary": summary,
        "file_hash": file_hash,
    }

    # 存库
    db2 = get_db()
    try:
        with db2.cursor() as cur:
            cur.execute(
                "INSERT INTO eval_reports (user_id, report_type, report_json, score) VALUES (%s,%s,%s,%s)",
                (user_id, "audio_analysis", json.dumps(report, ensure_ascii=False), overall)
            )
            db2.commit()
            report["report_id"] = cur.lastrowid
    finally:
        db2.close()

    return report

def _xunfei_asr(audio_path: str) -> tuple:
    """讯飞语音转写 REST API，返回 (plain_transcript, role_transcript)"""
    url = "https://raasr.xfyun.cn/v2/api"

    def get_signature():
        ts = str(int(time.time()))
        m = hashlib.md5()
        m.update((XUNFEI_APP_ID + ts).encode())
        md5 = m.hexdigest()
        sig = hmac.new(XUNFEI_SECRET_KEY.encode(), md5.encode(), hashlib.sha1)
        return base64.b64encode(sig.digest()).decode(), ts

    sig, ts = get_signature()

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    # 上传任务 — 参数放 URL query string，音频放 body（octet-stream）
    # roleType=1 开启角色分离
    upload_resp = requests.post(
        f"{url}/upload",
        params={
            "appId": XUNFEI_APP_ID,
            "signa": sig,
            "ts": ts,
            "fileSize": len(audio_bytes),
            "fileName": os.path.basename(audio_path),
            "duration": "200",
            "roleType": 1,
        },
        data=audio_bytes,
        headers={"Content-Type": "application/octet-stream"},
        timeout=30,
    )
    result = upload_resp.json()
    if result.get("code") != "000000":
        raise Exception(f"ASR上传失败: {result.get('descInfo')}")

    order_id = result["content"]["orderId"]

    # 轮询结果（最多等60秒）
    for _ in range(12):
        time.sleep(5)
        sig2, ts2 = get_signature()
        query_resp = requests.post(
            f"{url}/getResult",
            params={"appId": XUNFEI_APP_ID, "signa": sig2, "ts": ts2, "orderId": order_id},
            timeout=10,
        )
        qr = query_resp.json()
        if qr.get("code") != "000000":
            continue
        order_info = qr.get("content", {}).get("orderInfo", {})
        status = order_info.get("status")
        if status == 4:  # 完成
            order_result = json.loads(qr["content"]["orderResult"])
            plain_lines = []
            role_lines = []
            role_map = {}  # rl编号 → 角色名（0=面试官, 1=求职者）

            for lattice in order_result.get("lattice", []):
                json_1best = json.loads(lattice.get("json_1best", "{}"))
                st = json_1best.get("st", {})
                rl = st.get("rl", "")  # 角色编号
                for rt in st.get("rt", []):
                    text = "".join(
                        cw.get("w", "")
                        for ws in rt.get("ws", [])
                        for cw in ws.get("cw", [])
                    )
                    if text.strip():
                        plain_lines.append(text)
                        # 角色标注：偶数编号=面试官，奇数=求职者（讯飞默认）
                        role_name = "面试官" if str(rl) in ("0", "2", "4") else "求职者"
                        role_lines.append(f"【{role_name}】{text}")

            plain = "\n".join(plain_lines)
            role = "\n".join(role_lines)
            return plain, role
        if status == -1:
            raise Exception("ASR转写失败")

    raise Exception("ASR超时，请检查网络")

def _rag_search(question: str) -> str:
    """从面试宝典向量检索相关内容"""
    from backend.rag.knowledge_base import search
    results = search("interview_guide", question, n_results=3)
    return "\n".join(results) if results else "暂无参考资料"

def _save_question(question: str, user_id: int):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM questions WHERE question_text=%s", (question,))
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO questions (question_text, source) VALUES (%s,%s)",
                    (question, f"audio_user_{user_id}")
                )
                db.commit()
    finally:
        db.close()
