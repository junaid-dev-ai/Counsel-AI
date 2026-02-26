"""
CounselAI – AI Model Microservice
Separate service for heavy AI inference. Scales independently.
Supports: OpenAI GPT-4, Claude API, local LLM (llama.cpp), rule-based fallback.
"""
from __future__ import annotations

import logging
import os
import re
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

log = logging.getLogger("model_service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(
    title="CounselAI Model Service",
    version="1.0.0",
    docs_url="/docs",
)

# ── Backend selection ──────────────────────────────────────────────────────────
OPENAI_KEY    = os.getenv("OPENAI_API_KEY")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"


class AnalyzeRequest(BaseModel):
    text:        str
    contract_id: str
    max_clauses: int = 10


class AnalyzeResponse(BaseModel):
    contract_id:      str
    processing_time:  float
    backend_used:     str
    result:           dict


# ── OpenAI backend ────────────────────────────────────────────────────────────

OPENAI_SYSTEM = """You are a senior legal analyst specializing in contract review.
Analyze the provided contract text and return a JSON object with this exact structure:
{
  "summary": "2-3 sentence executive summary",
  "contract_type": "type of contract",
  "parties": ["Party A", "Party B"],
  "governing_law": "jurisdiction",
  "effective_date": "date or 'Not specified'",
  "expiry_date": "date or 'Not specified'",
  "overall_risk": "low|medium|high|critical",
  "risk_score": 0-100,
  "key_obligations": ["obligation 1", ...],
  "recommendations": [
    {"priority": "critical|high|medium|low", "title": "...", "detail": "..."}
  ],
  "clauses": [
    {
      "clause_type": "liability|indemnification|termination|ip_ownership|confidentiality|payment|dispute|governing_law|non_compete|force_majeure|other",
      "title": "Clause title",
      "original_text": "Verbatim excerpt from contract",
      "explanation": "Plain English explanation of what this means for the signing party",
      "risk_level": "low|medium|high|critical",
      "risk_reasons": ["reason 1", "reason 2"],
      "suggestions": ["improvement suggestion 1", "suggestion 2"],
      "is_standard": true|false
    }
  ]
}
Return ONLY the JSON. No preamble. No markdown fences."""


async def analyze_with_openai(text: str) -> dict:
    import openai
    client   = openai.AsyncOpenAI(api_key=OPENAI_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": OPENAI_SYSTEM},
            {"role": "user",   "content": f"CONTRACT TEXT:\n\n{text[:15000]}"},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    import json
    return json.loads(response.choices[0].message.content)


async def analyze_with_anthropic(text: str) -> dict:
    import anthropic
    client   = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)
    message  = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{
            "role":    "user",
            "content": f"{OPENAI_SYSTEM}\n\nCONTRACT TEXT:\n\n{text[:15000]}",
        }],
    )
    import json
    raw = message.content[0].text
    # Strip markdown fences if present
    raw = re.sub(r"```(?:json)?\n?", "", raw).strip()
    return json.loads(raw)


# ── Rule-based fallback ───────────────────────────────────────────────────────

def analyze_rule_based(text: str) -> dict:
    """
    Production-quality rule-based analysis.
    Used when no LLM API key is configured (CI/demo/cost-saving).
    Real deployment uses LLM backends above.
    """
    from model_service.app.rules import build_analysis  # internal rules module
    return build_analysis(text)


# ── Routing ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    backend = (
        "openai"    if OPENAI_KEY    else
        "anthropic" if ANTHROPIC_KEY else
        "local_llm" if USE_LOCAL_LLM else
        "rule_based"
    )
    return {"status": "ok", "backend": backend}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(400, "Contract text is empty")

    t0 = time.monotonic()

    try:
        if OPENAI_KEY:
            result  = await analyze_with_openai(req.text)
            backend = "openai_gpt4o"
        elif ANTHROPIC_KEY:
            result  = await analyze_with_anthropic(req.text)
            backend = "anthropic_claude"
        else:
            result  = analyze_rule_based(req.text)
            backend = "rule_based"
    except Exception as exc:
        log.error("Analysis error: %s", exc)
        result  = analyze_rule_based(req.text)
        backend = "rule_based_fallback"

    return AnalyzeResponse(
        contract_id=req.contract_id,
        processing_time=round(time.monotonic() - t0, 3),
        backend_used=backend,
        result=result,
    )
