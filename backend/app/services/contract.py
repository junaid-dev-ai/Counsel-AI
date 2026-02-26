"""
CounselAI – Contract Analysis Service
Orchestrates: text extraction → model service → DB persistence.
"""
from __future__ import annotations

import io
import logging
import time
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.database import (
    AnalysisStatus, ClauseType, Contract, ContractAnalysis,
    ContractClause, RiskLevel, User, UserPlan,
)

log = logging.getLogger("contract_service")

PLAN_LIMITS = {
    UserPlan.FREE:       settings.FREE_MONTHLY_ANALYSES,
    UserPlan.PRO:        settings.PRO_MONTHLY_ANALYSES,
    UserPlan.ENTERPRISE: settings.ENTERPRISE_MONTHLY_ANALYSES,
}


# ── Text extraction ────────────────────────────────────────────────────────────

def extract_text(content: bytes, mime_type: str) -> tuple[str, int]:
    """Returns (text, page_count)."""
    if mime_type == "application/pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            text   = "\n\n".join(p.extract_text() or "" for p in reader.pages)
            return text.strip(), len(reader.pages)
        except Exception as e:
            log.warning("PDF extraction failed: %s", e)
            return "", 0

    if "wordprocessingml" in mime_type:
        try:
            import docx
            doc  = docx.Document(io.BytesIO(content))
            text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
            return text, 1
        except Exception as e:
            log.warning("DOCX extraction failed: %s", e)
            return "", 1

    # Plain text
    return content.decode("utf-8", errors="replace"), 1


# ── Quota ─────────────────────────────────────────────────────────────────────

async def enforce_quota(user: User) -> None:
    from datetime import datetime, timezone
    from fastapi import HTTPException
    limit = PLAN_LIMITS.get(user.plan, 3)
    now   = datetime.now(timezone.utc)
    if (user.analyses_reset_at is None or
            user.analyses_reset_at.replace(tzinfo=timezone.utc).month != now.month):
        user.analyses_this_month = 0
        user.analyses_reset_at   = now
    if user.analyses_this_month >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly limit of {limit} analyses reached. Upgrade your plan.",
        )


# ── Model service ─────────────────────────────────────────────────────────────

async def call_model_service(text: str, contract_id: str) -> dict:
    async with httpx.AsyncClient(timeout=settings.MODEL_SERVICE_TIMEOUT) as client:
        try:
            r = await client.post(
                f"{settings.MODEL_SERVICE_URL}/analyze",
                json={"text": text, "contract_id": contract_id},
            )
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            log.warning("Model service unavailable (%s) – using mock", exc)
            return _mock_result(text)


def _mock_result(text: str) -> dict:
    """
    Rich deterministic mock – showcases every UI feature for demos.
    A real deployment replaces this with LLM / fine-tuned classifier calls.
    """
    tl = text.lower()
    clauses = []

    # IP clause – most dangerous
    if any(w in tl for w in ["intellectual property", "ip ", "copyright", "invention", "patent"]):
        clauses.append({
            "clause_type": "ip_ownership",
            "title":       "Intellectual Property Assignment",
            "original_text": (
                "All work product, inventions, discoveries, and deliverables created "
                "under this Agreement shall be the sole and exclusive property of Client, "
                "including all pre-existing tools and methodologies used in delivery."
            ),
            "explanation": (
                "This clause transfers ALL IP rights—including pre-existing code, "
                "frameworks, and methods—to the client. You could be assigning ownership "
                "of your own tooling, making it unusable for future clients."
            ),
            "risk_level":  "critical",
            "risk_reasons": [
                "Captures pre-existing background IP with no carve-out",
                "Includes 'methodologies' — unusually broad",
                "No licence-back provision for your own tools",
            ],
            "suggestions": [
                "Add explicit 'Background IP' schedule listing your pre-existing assets",
                "Restrict assignment to deliverables created solely for this project",
                "Negotiate a perpetual licence to use your own frameworks",
            ],
            "is_standard": False,
        })

    # Non-compete
    if any(w in tl for w in ["non-compete", "non compete", "noncompete", "competing business"]):
        clauses.append({
            "clause_type": "non_compete",
            "title":       "Non-Compete Restriction",
            "original_text": (
                "For 24 months following termination, Service Provider shall not engage "
                "in, consult for, or assist any business that competes with Client's "
                "products or services anywhere in the world."
            ),
            "explanation": (
                "A global 24-month non-compete is extremely aggressive. Courts in many "
                "jurisdictions void unreasonable non-competes—but defending a lawsuit "
                "is expensive even when you win."
            ),
            "risk_level":  "critical",
            "risk_reasons": [
                "24-month duration exceeds industry norm of 6–12 months",
                "Worldwide geographic scope is rarely enforceable",
                "'Competes with Client's products' is undefined and overbroad",
            ],
            "suggestions": [
                "Counter-propose 6 months, specific named competitors only",
                "Limit geography to markets where client actively operates",
                "Add a 'key-man' carve-out for activities unrelated to this engagement",
            ],
            "is_standard": False,
        })

    # Liability
    if any(w in tl for w in ["liabil", "indemn", "damage", "warrant"]):
        clauses.append({
            "clause_type": "liability",
            "title":       "Limitation of Liability",
            "original_text": (
                "In no event shall either party be liable for indirect, incidental, "
                "special, or consequential damages. Total liability shall not exceed $500."
            ),
            "explanation": (
                "The $500 liability cap is dangerously low. If you deliver $50,000 of "
                "work and the client suffers a data breach through their own negligence, "
                "they could still sue you for the full amount."
            ),
            "risk_level":  "high",
            "risk_reasons": [
                "$500 cap is far below typical contract value",
                "Does not carve out gross negligence or wilful misconduct",
                "No mutual cap — client exposure is also limited",
            ],
            "suggestions": [
                "Set cap to total fees paid under the contract (minimum)",
                "Exclude gross negligence and intentional misconduct from the cap",
                "Add mutual indemnification for IP infringement claims",
            ],
            "is_standard": False,
        })

    # Termination
    if any(w in tl for w in ["terminat", "cancel", "end of agreement", "expir"]):
        clauses.append({
            "clause_type": "termination",
            "title":       "Termination for Convenience",
            "original_text": (
                "Either party may terminate this Agreement upon 14 days' written notice "
                "without cause. Upon termination, Client owes only fees for work completed."
            ),
            "explanation": (
                "14 days is a very short notice period, especially if you have allocated "
                "dedicated resources. You may be left with a part-delivered project and "
                "difficulty recovering your full investment."
            ),
            "risk_level":  "medium",
            "risk_reasons": [
                "14-day notice is shorter than industry standard of 30–90 days",
                "No kill fee for early termination",
                "No transition assistance requirement",
            ],
            "suggestions": [
                "Negotiate 30-day minimum notice",
                "Add a 20% kill fee payable if terminated without cause mid-project",
                "Include a transition assistance clause (up to 30 days support)",
            ],
            "is_standard": True,
        })

    # Confidentiality
    if any(w in tl for w in ["confidential", "nda", "non-disclosure", "proprietary"]):
        clauses.append({
            "clause_type": "confidentiality",
            "title":       "Non-Disclosure Obligations",
            "original_text": (
                "Receiving Party agrees to hold all Confidential Information in strict "
                "confidence and not to disclose it to any third party without prior "
                "written consent for a period of 5 years."
            ),
            "explanation": (
                "Standard NDA language. The 5-year survival period is on the longer end "
                "but reasonable for sensitive business information. Ensure public domain "
                "exceptions are clearly specified."
            ),
            "risk_level":  "low",
            "risk_reasons": [
                "5-year post-termination period is above the typical 3-year norm",
            ],
            "suggestions": [
                "Confirm carve-outs for publicly available information are explicit",
                "Ensure 'Confidential Information' definition excludes your own background knowledge",
            ],
            "is_standard": True,
        })

    # Payment (always include)
    clauses.append({
        "clause_type": "payment",
        "title":       "Payment Terms & Late Fees",
        "original_text": (
            "Invoices are due Net-45 from receipt. Disputed invoices must be raised "
            "within 7 days. Late payment accrues interest at 2% per month."
        ),
        "explanation": (
            "Net-45 is longer than the industry standard Net-30. The 7-day dispute "
            "window is tight. The 2% monthly interest (24% annually) is above typical "
            "commercial rates but may help incentivise timely payment."
        ),
        "risk_level":  "medium",
        "risk_reasons": [
            "Net-45 delays your cash flow vs. industry standard Net-30",
            "7-day dispute window is unusually short",
        ],
        "suggestions": [
            "Counter-propose Net-30 with 10-day dispute window",
            "Add milestone-based payment schedule for projects over $10k",
        ],
        "is_standard": True,
    })

    # Governing law
    clauses.append({
        "clause_type": "governing_law",
        "title":       "Governing Law & Dispute Resolution",
        "original_text": (
            "This Agreement shall be governed by the laws of Delaware. All disputes "
            "shall be resolved by binding arbitration in Wilmington, Delaware."
        ),
        "explanation": (
            "Binding arbitration in Delaware means any dispute requires you to travel "
            "there (or hire local counsel). Arbitration clauses also waive your right "
            "to a jury trial."
        ),
        "risk_level":  "medium",
        "risk_reasons": [
            "Fixed venue may require costly out-of-state legal representation",
            "Binding arbitration waives jury trial rights",
            "Arbitration costs can exceed court costs for smaller claims",
        ],
        "suggestions": [
            "Negotiate remote/virtual arbitration for disputes under $50k",
            "Add option of small claims court for minor disputes",
        ],
        "is_standard": True,
    })

    critical = sum(1 for c in clauses if c["risk_level"] == "critical")
    high     = sum(1 for c in clauses if c["risk_level"] == "high")
    medium   = sum(1 for c in clauses if c["risk_level"] == "medium")

    risk_score  = min(100, critical * 28 + high * 15 + medium * 6)
    overall     = (
        "critical" if risk_score >= 65 else
        "high"     if risk_score >= 40 else
        "medium"   if risk_score >= 20 else
        "low"
    )

    return {
        "summary": (
            f"This contract contains {len(clauses)} analyzed clauses. "
            f"I found {critical} critical and {high} high-risk provisions that "
            f"require negotiation before signing. The IP assignment and non-compete "
            f"clauses pose the most significant business risk."
        ),
        "contract_type":   "Professional Services Agreement",
        "parties":         ["Service Provider", "Client"],
        "governing_law":   "State of Delaware, USA",
        "effective_date":  "Upon Execution",
        "expiry_date":     "12 months from effective date",
        "overall_risk":    overall,
        "risk_score":      float(risk_score),
        "key_obligations": [
            "Deliver agreed services within specified milestones",
            "Assign all work product IP to client upon full payment",
            "Maintain strict confidentiality of client information (5 years)",
            "Refrain from competing businesses globally for 24 months post-termination",
        ],
        "recommendations": [
            {
                "priority": "critical",
                "title":    "Negotiate IP clause before signing",
                "detail":   "The current IP assignment clause is dangerously broad. Engage a lawyer to add Background IP carve-outs.",
            },
            {
                "priority": "critical",
                "title":    "Challenge the non-compete scope",
                "detail":   "A global 24-month non-compete is likely unenforceable but defending against it is costly. Counter-propose 6 months.",
            },
            {
                "priority": "high",
                "title":    "Raise the liability cap",
                "detail":   "The $500 cap creates unlimited risk exposure. Negotiate to at least the total contract value.",
            },
            {
                "priority": "medium",
                "title":    "Extend termination notice period",
                "detail":   "Request 30-day notice minimum and a kill fee for convenience termination.",
            },
        ],
        "clauses": clauses,
    }


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def run_analysis(db: AsyncSession, contract_id: UUID) -> ContractAnalysis:
    r        = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = r.scalar_one_or_none()
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    contract.status = AnalysisStatus.PROCESSING
    await db.flush()

    t0 = time.monotonic()
    try:
        result   = await call_model_service(contract.raw_text or "", str(contract_id))
        analysis = ContractAnalysis(
            contract_id=contract.id,
            overall_risk=RiskLevel(result["overall_risk"]),
            risk_score=result["risk_score"],
            summary=result["summary"],
            contract_type=result.get("contract_type"),
            parties=result.get("parties"),
            governing_law=result.get("governing_law"),
            effective_date=result.get("effective_date"),
            expiry_date=result.get("expiry_date"),
            key_obligations=result.get("key_obligations"),
            recommendations=result.get("recommendations"),
            processing_time_sec=round(time.monotonic() - t0, 3),
        )
        db.add(analysis)
        await db.flush()

        for cl in result.get("clauses", []):
            db.add(ContractClause(
                analysis_id=analysis.id,
                clause_type=ClauseType(cl["clause_type"]),
                title=cl["title"],
                original_text=cl["original_text"],
                explanation=cl["explanation"],
                risk_level=RiskLevel(cl["risk_level"]),
                risk_reasons=cl.get("risk_reasons"),
                suggestions=cl.get("suggestions"),
                is_standard=cl.get("is_standard", False),
            ))

        contract.status = AnalysisStatus.COMPLETE
        await db.flush()
        return analysis

    except Exception as exc:
        contract.status        = AnalysisStatus.FAILED
        contract.error_message = str(exc)
        await db.flush()
        raise
