from dotenv import load_dotenv
import os

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "interview_assistant")

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", 2))

KIMI_API_KEY = os.getenv("LLM_API_KEY")
KIMI_BASE_URL = os.getenv("LLM_BASE_URL", "https://code.newcli.com/droid/super")
KIMI_MODEL = os.getenv("LLM_MODEL", "claude-opus-4-7")

CHROMA_PATH = os.getenv("CHROMA_PATH", "./data/chroma")

XUNFEI_APP_ID = os.getenv("XUNFEI_APP_ID")
XUNFEI_SECRET_KEY = os.getenv("XUNFEI_SECRET_KEY")
