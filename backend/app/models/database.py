"""
CounselAI – SQLAlchemy ORM Models (async)
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, JSON, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from backend.app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DEBUG,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Base + Mixin ──────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserPlan(str, enum.Enum):
    FREE       = "free"
    PRO        = "pro"
    ENTERPRISE = "enterprise"


class AnalysisStatus(str, enum.Enum):
    QUEUED     = "queued"
    PROCESSING = "processing"
    COMPLETE   = "complete"
    FAILED     = "failed"


class RiskLevel(str, enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class ClauseType(str, enum.Enum):
    LIABILITY        = "liability"
    INDEMNIFICATION  = "indemnification"
    TERMINATION      = "termination"
    IP_OWNERSHIP     = "ip_ownership"
    CONFIDENTIALITY  = "confidentiality"
    PAYMENT          = "payment"
    DISPUTE          = "dispute"
    GOVERNING_LAW    = "governing_law"
    NON_COMPETE      = "non_compete"
    FORCE_MAJEURE    = "force_majeure"
    OTHER            = "other"


# ── User ──────────────────────────────────────────────────────────────────────

class User(TimestampMixin, Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    is_verified     = Column(Boolean, default=False, nullable=False)
    plan            = Column(Enum(UserPlan), default=UserPlan.FREE, nullable=False)
    analyses_this_month  = Column(Integer, default=0)
    analyses_reset_at    = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id   = Column(String(255), nullable=True)
    avatar_url           = Column(String(500), nullable=True)

    contracts      = relationship("Contract", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(TimestampMixin, Base):
    __tablename__ = "refresh_tokens"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked    = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


# ── Contract ──────────────────────────────────────────────────────────────────

class Contract(TimestampMixin, Base):
    __tablename__ = "contracts"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id          = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title             = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path         = Column(String(1000), nullable=True)
    file_size_bytes   = Column(Integer, nullable=True)
    mime_type         = Column(String(100), nullable=True)
    raw_text          = Column(Text, nullable=True)
    page_count        = Column(Integer, nullable=True)
    status            = Column(Enum(AnalysisStatus), default=AnalysisStatus.QUEUED)
    error_message     = Column(Text, nullable=True)

    owner    = relationship("User", back_populates="contracts")
    analysis = relationship("ContractAnalysis", back_populates="contract",
                            uselist=False, cascade="all, delete-orphan")


class ContractAnalysis(TimestampMixin, Base):
    __tablename__ = "contract_analyses"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id         = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    overall_risk        = Column(Enum(RiskLevel), nullable=True)
    risk_score          = Column(Float, nullable=True)        # 0–100
    summary             = Column(Text, nullable=True)
    contract_type       = Column(String(100), nullable=True)
    parties             = Column(JSON, nullable=True)
    governing_law       = Column(String(200), nullable=True)
    effective_date      = Column(String(100), nullable=True)
    expiry_date         = Column(String(100), nullable=True)
    key_obligations     = Column(JSON, nullable=True)
    recommendations     = Column(JSON, nullable=True)
    processing_time_sec = Column(Float, nullable=True)

    contract = relationship("Contract", back_populates="analysis")
    clauses  = relationship("ContractClause", back_populates="analysis",
                            cascade="all, delete-orphan")


class ContractClause(TimestampMixin, Base):
    __tablename__ = "contract_clauses"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id    = Column(UUID(as_uuid=True), ForeignKey("contract_analyses.id"), nullable=False)
    clause_type    = Column(Enum(ClauseType), nullable=False)
    title          = Column(String(300), nullable=False)
    original_text  = Column(Text, nullable=False)
    explanation    = Column(Text, nullable=False)
    risk_level     = Column(Enum(RiskLevel), nullable=False)
    risk_reasons   = Column(JSON, nullable=True)
    suggestions    = Column(JSON, nullable=True)
    position_start = Column(Integer, nullable=True)
    position_end   = Column(Integer, nullable=True)
    is_standard    = Column(Boolean, default=False)

    analysis = relationship("ContractAnalysis", back_populates="clauses")
