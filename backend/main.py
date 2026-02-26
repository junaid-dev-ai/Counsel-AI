"""
CounselAI – FastAPI Application
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.api.v1.endpoints import auth, contracts

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("CounselAI API v%s starting", settings.APP_VERSION)
    yield
    logging.info("CounselAI API shutting down")


app = FastAPI(
    title="CounselAI API",
    description="AI-powered legal contract analysis — review contracts in minutes, not hours.",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Authentication"])
app.include_router(contracts.router, prefix="/api/v1/contracts",  tags=["Contracts"])


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/", tags=["System"])
async def root():
    return {
        "product": "CounselAI",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
    }
