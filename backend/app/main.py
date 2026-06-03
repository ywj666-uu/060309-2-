from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import auth, users, cases, trial_sessions, groups, submissions, scores, reports, ws
import app.services.trial_service  # noqa: F401 - registers auto-advance callback

app = FastAPI(
    title="Mock Court Debate System",
    description="线上模拟法庭辩论系统",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cases.router)
app.include_router(trial_sessions.router)
app.include_router(groups.router)
app.include_router(submissions.router)
app.include_router(scores.router)
app.include_router(reports.router)
app.include_router(ws.router)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "mock-court-api"}
