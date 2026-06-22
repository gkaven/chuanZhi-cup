from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import auth, chat, upload, report, admin

app = FastAPI(title="智能面试助手")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(chat.router, prefix="/api")
app.include_router(upload.router, prefix="/api/upload")
app.include_router(report.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")

@app.get("/")
def health():
    return {"status": "ok"}
