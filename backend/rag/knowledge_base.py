"""
RAG 知识库 — 使用 MySQL 关键词检索，无需下载任何模型
"""
from backend.utils.db import get_db

def add_documents(collection_name: str, docs: list[str], ids: list[str], metadatas: list[dict] = None):
    """写入 interview_guide 表"""
    if collection_name != "interview_guide":
        return
    db = get_db()
    try:
        with db.cursor() as cur:
            for i, doc in enumerate(docs):
                meta = (metadatas or [{}])[i]
                cur.execute(
                    "INSERT IGNORE INTO interview_guide (id, category, topic, content) VALUES (%s,%s,%s,%s)",
                    (ids[i], meta.get("category", ""), meta.get("topic", ""), doc)
                )
        db.commit()
    finally:
        db.close()

def search(collection_name: str, query: str, n_results: int = 3) -> list[str]:
    """MySQL LIKE 关键词检索"""
    if collection_name == "interview_guide":
        table, col = "interview_guide", "content"
    elif collection_name == "questions":
        table, col = "questions", "question_text"
    else:
        return []
    db = get_db()
    try:
        with db.cursor() as cur:
            # 取查询词前10字做关键词匹配
            keyword = f"%{query[:20]}%"
            cur.execute(f"SELECT {col} FROM {table} WHERE {col} LIKE %s LIMIT %s", (keyword, n_results))
            rows = cur.fetchall()
            return [r[col] for r in rows] if rows else []
    except Exception:
        return []
    finally:
        db.close()

def get_collection(name: str):
    """兼容旧调用，返回 None"""
    return None
