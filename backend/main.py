"""FastAPI application entry point."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.init_db import init_db
from backend.seed import seed_database
from backend.auth import router as auth_router
from backend.reports import router as reports_router
from backend.matching import router as matching_router
from backend.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables & seed demo data on startup
    try:
        init_db()
        seed_database()
    except Exception as e:
        print(f"Startup DB init/seed warning: {e}")
    yield


app = FastAPI(
    title="FindBack API",
    description="Smart College Lost & Found Platform with Vector Search & Image Similarity",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware for React Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded photos
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(matching_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "project": "FindBack",
        "status": "online",
        "docs": "/docs",
        "phase": "Phase 3 (Semantic AI Matching & Vector Search Engine)",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "FindBack Backend"}
