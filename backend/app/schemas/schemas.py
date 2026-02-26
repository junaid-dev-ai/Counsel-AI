"""
CounselAI – Pydantic Schemas
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email:     EmailStr
    full_name: str = Field(..., min_length=2, max_length=120)
    password:  str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id:                  UUID
    email:               str
    full_name:           str
    plan:                str
    is_verified:         bool
    analyses_this_month: int
    created_at:          datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)


# ── Contract ──────────────────────────────────────────────────────────────────

class ContractOut(BaseModel):
    id:               UUID
    title:            str
    original_filename: str
    file_size_bytes:  Optional[int]
    page_count:       Optional[int]
    status:           str
    error_message:    Optional[str]
    created_at:       datetime

    model_config = {"from_attributes": True}


class ClauseOut(BaseModel):
    id:            UUID
    clause_type:   str
    title:         str
    original_text: str
    explanation:   str
    risk_level:    str
    risk_reasons:  Optional[List[str]]
    suggestions:   Optional[List[str]]
    is_standard:   bool

    model_config = {"from_attributes": True}


class RecommendationOut(BaseModel):
    priority: str
    title:    str
    detail:   str


class AnalysisOut(BaseModel):
    id:                  UUID
    overall_risk:        Optional[str]
    risk_score:          Optional[float]
    summary:             Optional[str]
    contract_type:       Optional[str]
    parties:             Optional[List[str]]
    governing_law:       Optional[str]
    effective_date:      Optional[str]
    expiry_date:         Optional[str]
    key_obligations:     Optional[List[str]]
    recommendations:     Optional[List[dict]]
    processing_time_sec: Optional[float]
    clauses:             List[ClauseOut] = []

    model_config = {"from_attributes": True}


class ContractDetailOut(ContractOut):
    analysis: Optional[AnalysisOut] = None


# ── Stats ─────────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_contracts:   int
    completed:         int
    critical_risk:     int
    high_risk:         int
    avg_risk_score:    float
    plan:              str
    analyses_used:     int
    analyses_limit:    int
