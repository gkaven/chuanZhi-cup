import json
from fastapi import APIRouter, Depends, HTTPException
from backend.api.auth import current_user
from backend.utils.db import get_db

router = APIRouter()

@router.get("/report/{report_id}")
def get_report(report_id: int, user_id: int = Depends(current_user)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT * FROM eval_reports WHERE id=%s AND user_id=%s", (report_id, user_id))
            report = cur.fetchone()
            if not report:
                raise HTTPException(status_code=404, detail="报告不存在")
            if isinstance(report.get("report_json"), str):
                report["report_json"] = json.loads(report["report_json"])
            return report
    finally:
        db.close()

@router.get("/reports")
def list_reports(user_id: int = Depends(current_user)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, report_type, score, created_at FROM eval_reports WHERE user_id=%s ORDER BY created_at DESC LIMIT 20",
                (user_id,)
            )
            return cur.fetchall()
    finally:
        db.close()

@router.get("/sessions")
def list_sessions(user_id: int = Depends(current_user)):
    """列出用户所有历史会话"""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT session_id, messages_json, created_at FROM sessions WHERE user_id=%s ORDER BY created_at DESC LIMIT 30",
                (user_id,)
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                try:
                    msgs = json.loads(r["messages_json"] or "[]")
                except Exception:
                    msgs = []
                # 取第一条用户消息作为标题
                title = next((m["content"][:25] for m in msgs if m.get("role") == "user"), "新对话")
                result.append({
                    "session_id": r["session_id"],
                    "title": title,
                    "created_at": str(r["created_at"]),
                    "message_count": len(msgs),
                })
            return result
    finally:
        db.close()

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user_id: int = Depends(current_user)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("DELETE FROM sessions WHERE session_id=%s AND user_id=%s", (session_id, user_id))
            db.commit()
        return {"ok": True}
    finally:
        db.close()
    """加载指定会话的消息记录"""
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT messages_json FROM sessions WHERE session_id=%s AND user_id=%s",
                (session_id, user_id)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="会话不存在")
            try:
                msgs = json.loads(row["messages_json"] or "[]")
            except Exception:
                msgs = []
            return {"messages": msgs}
    finally:
        db.close()


