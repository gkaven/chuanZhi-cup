from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.api.auth import current_user
from backend.utils.db import get_db

router = APIRouter()

def require_admin(user_id: int = Depends(current_user)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT role FROM users WHERE id=%s", (user_id,))
            user = cur.fetchone()
            if not user or user["role"] != "admin":
                raise HTTPException(status_code=403, detail="需要管理员权限")
        return user_id
    finally:
        db.close()

class QuestionIn(BaseModel):
    category: Optional[str] = None
    difficulty: Optional[str] = "medium"
    question_text: str
    answer_text: Optional[str] = None

@router.get("/questions")
def list_questions(page: int = 1, size: int = 20, category: Optional[str] = None,
                   user_id: int = Depends(require_admin)):
    db = get_db()
    try:
        with db.cursor() as cur:
            where = "WHERE category=%s" if category else ""
            params = (category, (page-1)*size, size) if category else ((page-1)*size, size)
            cur.execute(f"SELECT * FROM questions {where} ORDER BY created_at DESC LIMIT %s,%s", params)
            items = cur.fetchall()
            cur.execute(f"SELECT COUNT(*) as total FROM questions {where}", (category,) if category else ())
            total = cur.fetchone()["total"]
        return {"items": items, "total": total, "page": page}
    finally:
        db.close()

@router.post("/questions")
def create_question(data: QuestionIn, user_id: int = Depends(require_admin)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "INSERT INTO questions (category, difficulty, question_text, answer_text, source) VALUES (%s,%s,%s,%s,%s)",
                (data.category, data.difficulty, data.question_text, data.answer_text, "admin")
            )
            db.commit()
            return {"id": cur.lastrowid}
    finally:
        db.close()

@router.delete("/questions/{qid}")
def delete_question(qid: int, user_id: int = Depends(require_admin)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("DELETE FROM questions WHERE id=%s", (qid,))
            db.commit()
        return {"ok": True}
    finally:
        db.close()

@router.get("/users")
def list_users(page: int = 1, size: int = 20, user_id: int = Depends(require_admin)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT %s,%s",
                        ((page-1)*size, size))
            items = cur.fetchall()
            cur.execute("SELECT COUNT(*) as total FROM users")
            total = cur.fetchone()["total"]
        return {"items": items, "total": total}
    finally:
        db.close()

@router.patch("/users/{uid}")
def update_user_role(uid: int, data: dict, user_id: int = Depends(require_admin)):
    role = data.get("role")
    if role not in ("user", "admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="角色只能是 user 或 admin")
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("UPDATE users SET role=%s WHERE id=%s", (role, uid))
            db.commit()
        return {"ok": True}
    finally:
        db.close()

@router.get("/analytics")
def analytics(user_id: int = Depends(require_admin)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT COUNT(*) as total FROM users")
            total_users = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) as total FROM eval_reports")
            total_reports = cur.fetchone()["total"]
            cur.execute("SELECT COUNT(*) as total FROM questions")
            total_questions = cur.fetchone()["total"]
            cur.execute("SELECT report_type, COUNT(*) as cnt FROM eval_reports GROUP BY report_type")
            by_type = cur.fetchall()
            cur.execute("SELECT AVG(score) as avg_score FROM eval_reports WHERE score IS NOT NULL")
            avg_score = cur.fetchone()["avg_score"]
        return {
            "total_users": total_users,
            "total_reports": total_reports,
            "total_questions": total_questions,
            "reports_by_type": by_type,
            "avg_score": round(float(avg_score or 0), 1),
        }
    finally:
        db.close()
