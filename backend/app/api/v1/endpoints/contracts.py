"""
CounselAI – Contract Endpoints
Upload, trigger analysis, list & retrieve.
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.models.database import (
    AnalysisStatus, Contract, ContractAnalysis, RiskLevel, User, UserPlan, get_db,
)
from backend.app.schemas.schemas import (
    AnalysisOut, ContractDetailOut, ContractOut, DashboardStats,
)
from backend.app.services.auth import get_current_user
from backend.app.services.contract import enforce_quota, extract_text, run_analysis

router = APIRouter()


async def _get_contract_or_404(contract_id: UUID, user: User,
                                db: AsyncSession) -> Contract:
    r = await db.execute(
        select(Contract)
        .where(Contract.id == contract_id, Contract.owner_id == user.id)
        .options(selectinload(Contract.analysis).selectinload(ContractAnalysis.clauses))
    )
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    return c


@router.post("/upload", response_model=ContractOut, status_code=202)
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await enforce_quota(user)

    mime = file.content_type or "application/octet-stream"
    if mime not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"Unsupported file type: {mime}")

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

    text, pages = extract_text(content, mime)

    # Persist file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id    = str(uuid.uuid4())
    save_path  = upload_dir / f"{file_id}_{file.filename}"
    with open(save_path, "wb") as f:
        f.write(content)

    contract = Contract(
        owner_id=user.id,
        title=Path(file.filename or "contract").stem.replace("_", " ").title(),
        original_filename=file.filename or "unknown",
        file_path=str(save_path),
        file_size_bytes=len(content),
        mime_type=mime,
        raw_text=text,
        page_count=pages,
        status=AnalysisStatus.QUEUED,
    )
    db.add(contract)
    await db.flush()

    user.analyses_this_month += 1

    background_tasks.add_task(_analyze_background, str(contract.id))
    return contract


async def _analyze_background(contract_id: str) -> None:
    """Run analysis in background after HTTP response is sent."""
    from backend.app.models.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await run_analysis(db, UUID(contract_id))
            await db.commit()
        except Exception as exc:
            await db.rollback()
            import logging
            logging.getLogger("contracts").error("Background analysis failed: %s", exc)


@router.get("/", response_model=List[ContractOut])
async def list_contracts(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = await db.execute(
        select(Contract)
        .where(Contract.owner_id == user.id)
        .order_by(Contract.created_at.desc())
        .offset(skip).limit(limit)
    )
    return r.scalars().all()


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = await db.execute(
        select(Contract).where(Contract.owner_id == user.id)
    )
    contracts = r.scalars().all()

    completed = [c for c in contracts if c.status == AnalysisStatus.COMPLETE]
    critical  = high = 0
    risk_sum  = 0.0

    for c in completed:
        if c.analysis:
            if c.analysis.overall_risk == RiskLevel.CRITICAL:
                critical += 1
            elif c.analysis.overall_risk == RiskLevel.HIGH:
                high += 1
            if c.analysis.risk_score:
                risk_sum += c.analysis.risk_score

    avg_risk  = round(risk_sum / max(len(completed), 1), 1)
    limit_map = {
        UserPlan.FREE: settings.FREE_MONTHLY_ANALYSES,
        UserPlan.PRO:  settings.PRO_MONTHLY_ANALYSES,
        UserPlan.ENTERPRISE: settings.ENTERPRISE_MONTHLY_ANALYSES,
    }

    return DashboardStats(
        total_contracts=len(contracts),
        completed=len(completed),
        critical_risk=critical,
        high_risk=high,
        avg_risk_score=avg_risk,
        plan=user.plan.value,
        analyses_used=user.analyses_this_month,
        analyses_limit=limit_map.get(user.plan, 3),
    )


@router.get("/{contract_id}", response_model=ContractDetailOut)
async def get_contract(
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _get_contract_or_404(contract_id, user, db)


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    c = await _get_contract_or_404(contract_id, user, db)
    await db.delete(c)


@router.post("/{contract_id}/reanalyze", response_model=ContractOut, status_code=202)
async def reanalyze_contract(
    contract_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await enforce_quota(user)
    c = await _get_contract_or_404(contract_id, user, db)
    if c.analysis:
        await db.delete(c.analysis)
    c.status        = AnalysisStatus.QUEUED
    c.error_message = None
    user.analyses_this_month += 1
    await db.flush()
    background_tasks.add_task(_analyze_background, str(contract_id))
    return c
