import os, uuid, shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from backend.api.auth import current_user
from backend.utils.db import get_db

router = APIRouter()
UPLOAD_DIR = "./data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_file(file: UploadFile, subdir: str) -> tuple[str, str]:
    ext = os.path.splitext(file.filename)[1]
    file_id = str(uuid.uuid4())
    path = os.path.join(UPLOAD_DIR, subdir, f"{file_id}{ext}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return file_id, path

RESUME_EXTS = (".pdf", ".docx", ".doc", ".txt", ".md")
AUDIO_EXTS = (".mp3", ".wav", ".m4a")

@router.post("/resume")
def upload_resume(file: UploadFile = File(...), user_id: int = Depends(current_user)):
    if not any(file.filename.lower().endswith(e) for e in RESUME_EXTS):
        raise HTTPException(status_code=400, detail="仅支持 PDF/Word/TXT/MD 格式")
    file_id, path = save_file(file, "resumes")
    # 立即解析文本
    from backend.utils.file_parser import parse_resume
    parsed = parse_resume(path)
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("INSERT INTO resumes (user_id, file_path, parsed_content) VALUES (%s,%s,%s)",
                        (user_id, path, parsed[:10000]))
            db.commit()
            resume_id = cur.lastrowid
    finally:
        db.close()
    return {"file_id": file_id, "resume_id": resume_id, "file_path": path, "parsed_length": len(parsed)}

@router.post("/audio")
def upload_audio(file: UploadFile = File(...), user_id: int = Depends(current_user)):
    if not any(file.filename.lower().endswith(e) for e in AUDIO_EXTS):
        raise HTTPException(status_code=400, detail="仅支持 mp3/wav/m4a 格式")
    file_id, path = save_file(file, "audio")
    return {"file_id": file_id, "file_path": path}
