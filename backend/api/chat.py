import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from backend.api.auth import current_user
from backend.utils.redis_client import get_redis
from backend.utils.db import get_db
from backend.agents.master_agent import detect_intent
import uuid

router = APIRouter()

class ChatIn(BaseModel):
    session_id: Optional[str] = None
    message: str
    attachments: Optional[list] = []

def _save_session_to_db(user_id: int, session_id: str, history: list):
    """持久化会话到 MySQL"""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                """INSERT INTO sessions (user_id, session_id, messages_json)
                   VALUES (%s,%s,%s)
                   ON DUPLICATE KEY UPDATE messages_json=%s""",
                (user_id, session_id,
                 json.dumps(history[-50:], ensure_ascii=False),
                 json.dumps(history[-50:], ensure_ascii=False))
            )
            db.commit()
    finally:
        db.close()

@router.get("/sessions")
def list_sessions(user_id: int = Depends(current_user)):
    """列出用户所有会话"""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT session_id, messages_json, created_at FROM sessions WHERE user_id=%s ORDER BY created_at DESC LIMIT 20",
                (user_id,)
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                msgs = json.loads(r["messages_json"] or "[]")
                # 取第一条用户消息作为标题
                title = next((m["content"][:30] for m in msgs if m.get("role") == "user"), "新会话")
                result.append({
                    "session_id": r["session_id"],
                    "title": title,
                    "created_at": str(r["created_at"]),
                    "msg_count": len(msgs),
                })
            return result
    finally:
        db.close()

@router.get("/sessions/{session_id}")
def get_session(session_id: str, user_id: int = Depends(current_user)):
    """获取指定会话的消息历史"""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT messages_json FROM sessions WHERE session_id=%s AND user_id=%s",
                (session_id, user_id)
            )
            row = cur.fetchone()
            if not row:
                return []
            return json.loads(row["messages_json"] or "[]")
    finally:
        db.close()

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user_id: int = Depends(current_user)):
    """删除指定会话"""
    db = get_db()
    r = get_redis()
    try:
        with db.cursor() as cur:
            cur.execute("DELETE FROM sessions WHERE session_id=%s AND user_id=%s", (session_id, user_id))
            db.commit()
        r.delete(f"session:{user_id}:{session_id}")
        return {"ok": True}
    finally:
        db.close()

@router.post("/chat")
def chat(data: ChatIn, user_id: int = Depends(current_user)):
    session_id = data.session_id or str(uuid.uuid4())
    r = get_redis()
    history_key = f"session:{user_id}:{session_id}"
    history = json.loads(r.get(history_key) or "[]")
    history.append({"role": "user", "content": data.message})

    def stream():
        try:
            result = detect_intent(data.message, data.attachments or [])
        except Exception:
            result = {"intent": "chat", "confidence": 0.5}
        intent = result.get("intent", "chat")
        confidence = result.get("confidence", 0)

        yield f"data: {json.dumps({'type': 'routing', 'agent': intent, 'message': f'意图识别完成：{intent}（置信度 {confidence:.0%}）'}, ensure_ascii=False)}\n\n"

        reply = ""

        if intent == "resume_eval" and confidence >= 0.6:
            attachment = next((a for a in (data.attachments or []) if a.get("type") in ("resume", "pdf", "docx")), None)
            if attachment:
                from backend.agents import resume_agent
                yield f"data: {json.dumps({'type': 'progress', 'step': 'dispatch', 'agent': 'resume_eval', 'message': '调度简历评估 Agent...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'parsing', 'agent': 'resume_eval', 'message': '解析简历文件内容...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'rule_check', 'agent': 'resume_eval', 'message': '规则评估：完整性 + 格式检查...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'dup_check', 'agent': 'resume_eval', 'message': '模板查重检测（TF-IDF 向量比对）...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'ai_eval', 'agent': 'resume_eval', 'message': 'AI 深度评估中（调用大模型）...'}, ensure_ascii=False)}\n\n"
                report = resume_agent.run(attachment["resume_id"], attachment["file_path"], user_id)
                if "error" in report:
                    yield f"data: {json.dumps({'type': 'error', 'message': report['error']}, ensure_ascii=False)}\n\n"
                else:
                    reply = f"简历评估完成，综合评分：{report['score']}分"
                    yield f"data: {json.dumps({'type': 'result', 'report': report, 'message': reply}, ensure_ascii=False)}\n\n"
            else:
                reply = "请上传您的简历文件（PDF或Word格式）"
                yield f"data: {json.dumps({'type': 'result', 'message': reply}, ensure_ascii=False)}\n\n"

        elif intent == "audio_analysis" and confidence >= 0.6:
            attachment = next((a for a in (data.attachments or []) if a.get("type") in ("audio", "mp3", "wav", "m4a")), None)
            if attachment:
                from backend.agents import audio_agent
                yield f"data: {json.dumps({'type': 'progress', 'step': 'dispatch', 'agent': 'audio_analysis', 'message': '调度录音分析 Agent...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'asr', 'agent': 'audio_analysis', 'message': '讯飞 ASR 语音转文字中...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'qa_split', 'agent': 'audio_analysis', 'message': '大模型提取问答对...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'rag', 'agent': 'audio_analysis', 'message': 'RAG 检索面试宝典知识库...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'eval', 'agent': 'audio_analysis', 'message': '逐题评估答案准确性...'}, ensure_ascii=False)}\n\n"
                report = audio_agent.run(attachment["file_path"], user_id)
                if "error" in report:
                    yield f"data: {json.dumps({'type': 'error', 'message': report['error']}, ensure_ascii=False)}\n\n"
                else:
                    reply = f"录音分析完成，综合评分：{report['overall_score']}分"
                    yield f"data: {json.dumps({'type': 'result', 'report': report, 'message': reply}, ensure_ascii=False)}\n\n"
            else:
                reply = "请上传面试录音文件（mp3/wav/m4a格式）"
                yield f"data: {json.dumps({'type': 'result', 'message': reply}, ensure_ascii=False)}\n\n"

        elif intent == "question_gen" and confidence >= 0.6:
            attachment = next((a for a in (data.attachments or []) if a.get("type") in ("resume", "pdf", "docx")), None)
            if attachment:
                from backend.agents import question_agent
                from backend.utils.file_parser import parse_resume
                yield f"data: {json.dumps({'type': 'progress', 'step': 'dispatch', 'agent': 'question_gen', 'message': '调度面试题生成 Agent...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'parse', 'agent': 'question_gen', 'message': '解析简历提取关键信息...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'rag', 'agent': 'question_gen', 'message': 'RAG 检索面试宝典 + 历史题库...'}, ensure_ascii=False)}\n\n"
                yield f"data: {json.dumps({'type': 'progress', 'step': 'gen', 'agent': 'question_gen', 'message': '大模型生成个性化面试题...'}, ensure_ascii=False)}\n\n"
                text = parse_resume(attachment["file_path"])
                result = question_agent.run(text)
                reply = f"已为您生成{len(result.get('questions', []))}道面试题"
                yield f"data: {json.dumps({'type': 'result', 'report': result, 'message': reply}, ensure_ascii=False)}\n\n"
            else:
                reply = "请上传您的简历文件以生成个性化面试题"
                yield f"data: {json.dumps({'type': 'result', 'message': reply}, ensure_ascii=False)}\n\n"

        elif intent == "cover_letter":
            from backend.agents.extra_agents import cover_letter
            yield f"data: {json.dumps({'type': 'progress', 'step': 'dispatch', 'agent': 'cover_letter', 'message': '调度求职信生成 Agent...'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'progress', 'step': 'match', 'agent': 'cover_letter', 'message': '分析简历与岗位匹配点...'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'progress', 'step': 'write', 'agent': 'cover_letter', 'message': '大模型生成个性化求职信...'}, ensure_ascii=False)}\n\n"
            position = next((a.get("position", "") for a in (data.attachments or [])), "") or "目标岗位"
            company = next((a.get("company", "") for a in (data.attachments or [])), "") or "目标公司"
            attachment = next((a for a in (data.attachments or []) if a.get("type") in ("resume",)), None)
            resume_text = ""
            if attachment:
                from backend.utils.file_parser import parse_resume
                resume_text = parse_resume(attachment["file_path"])
            reply = cover_letter(resume_text, position, company)
            yield f"data: {json.dumps({'type': 'result', 'message': reply}, ensure_ascii=False)}\n\n"

        elif intent == "salary_negotiation":
            from backend.agents.extra_agents import salary_negotiation
            yield f"data: {json.dumps({'type': 'progress', 'step': 'dispatch', 'agent': 'salary_negotiation', 'message': '调度薪资谈判 Agent...'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'progress', 'step': 'market', 'agent': 'salary_negotiation', 'message': '检索市场薪资数据...'}, ensure_ascii=False)}\n\n"
            result = salary_negotiation(position=data.message, city="", years=0, current_salary="")
            reply = json.dumps(result, ensure_ascii=False)
            yield f"data: {json.dumps({'type': 'result', 'report': result, 'message': '薪资参考已生成'}, ensure_ascii=False)}\n\n"

        elif intent == "career_plan":
            from backend.agents.extra_agents import career_plan
            yield f"data: {json.dumps({'type': 'progress', 'step': 'dispatch', 'agent': 'career_plan', 'message': '调度职业规划 Agent...'}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'progress', 'step': 'analyze', 'agent': 'career_plan', 'message': '分析用户背景与目标...'}, ensure_ascii=False)}\n\n"
            result = career_plan(data.message)
            reply = json.dumps(result, ensure_ascii=False)
            yield f"data: {json.dumps({'type': 'result', 'report': result, 'message': '职业规划已生成'}, ensure_ascii=False)}\n\n"

        else:
            # 闲聊兜底
            from openai import OpenAI
            from backend.config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL
            try:
                llm = OpenAI(api_key=KIMI_API_KEY, base_url=KIMI_BASE_URL)
                msgs = [{"role": "system", "content": "你是智能面试助手，帮助大学生求职。"}] + history[-10:]
                resp = llm.chat.completions.create(model=KIMI_MODEL, messages=msgs, max_tokens=500)
                reply = resp.choices[0].message.content
            except Exception as e:
                reply = f"AI 服务暂时不可用，请检查网络或稍后重试。（{str(e)[:60]}）"
            yield f"data: {json.dumps({'type': 'result', 'message': reply}, ensure_ascii=False)}\n\n"

        # 先保存再发 [DONE]，防止客户端断开后代码不执行
        history.append({"role": "assistant", "content": reply})
        r.setex(history_key, 86400 * 7, json.dumps(history[-20:], ensure_ascii=False))
        _save_session_to_db(user_id, session_id, history)
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"X-Session-Id": session_id})
