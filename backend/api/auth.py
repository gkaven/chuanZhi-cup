from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from backend.config import JWT_SECRET, JWT_EXPIRE_HOURS
from backend.utils.db import get_db

router = APIRouter()
pwd_context = CryptContext(schemes=["sha256_crypt"])
bearer = HTTPBearer()

class RegisterIn(BaseModel):
    username: str
    email: str
    password: str

class LoginIn(BaseModel):
    email: str
    password: str

def make_token(user_id: int):
    exp = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, JWT_SECRET, algorithm="HS256")

def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=["HS256"])
        return int(payload["sub"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
def register(data: RegisterIn):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email=%s", (data.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            cur.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s,%s,%s)",
                (data.username, data.email, pwd_context.hash(data.password))
            )
            db.commit()
            return {"message": "注册成功"}
    finally:
        db.close()

@router.post("/login")
def login(data: LoginIn):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id, password_hash FROM users WHERE email=%s", (data.email,))
            user = cur.fetchone()
            if not user or not pwd_context.verify(data.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="邮箱或密码错误")
            # 获取用户名
            cur.execute("SELECT username FROM users WHERE id=%s", (user["id"],))
            u = cur.fetchone()
            return {"access_token": make_token(user["id"]), "username": u["username"] if u else ""}
    finally:
        db.close()

@router.get("/me")
def me(user_id: int = Depends(current_user)):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id, username, email, role FROM users WHERE id=%s", (user_id,))
            return cur.fetchone()
    finally:
        db.close()
