"""
CounselAI Model Service – Rule-based Analysis Engine
Production-quality NLP analysis using regex + heuristics.
Used as fallback when LLM API keys are not configured.
"""
from __future__ import annotations

import re
from typing import Any


def _extract_parties(text: str) -> list[str]:
    patterns = [
        r'between\s+([A-Z][^,\n]+?)\s+(?:\([""]?(?:Company|Client|Provider|Contractor|the "?Company"?)[""]?\)|,)',
        r'"(Client|Service Provider|Company|Contractor|Vendor|Supplier|Licensor|Licensee)"',
    ]
    parties = []
    for p in patterns:
        matches = re.findall(p, text[:2000])
        parties.extend(matches[:2])
    return list(dict.fromkeys(parties))[:2] or ["Party A", "Party B"]


def _extract_date(text: str, keywords: list[str]) -> str:
    pattern = r"\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},?\s+\d{4})\b"
    for kw in keywords:
        idx = text.lower().find(kw)
        if idx != -1:
            snippet = text[idx:idx+100]
            m       = re.search(pattern, snippet)
            if m:
                return m.group(1)
    return "Not specified"


def _detect_clause(text: str, keywords: list[str], window: int = 400) -> str | None:
    tl = text.lower()
    for kw in keywords:
        idx = tl.find(kw)
        if idx != -1:
            return text[max(0, idx - 20): idx + window].strip()
    return None


def build_analysis(text: str) -> dict[str, Any]:
    tl       = text.lower()
    clauses  = []
    word_cnt = len(text.split())

    # ── Clause detection rules ────────────────────────────────────────────────

    if snippet := _detect_clause(tl, ["intellectual property", "work product", "invention"]):
        clauses.append({
            "clause_type":   "ip_ownership",
            "title":         "Intellectual Property Assignment",
            "original_text": snippet[:400],
            "explanation":   "This clause determines who owns the deliverables and any inventions created during the engagement. Broad assignment language can capture your pre-existing tools.",
            "risk_level":    "critical" if "all" in snippet[:200].lower() and "pre-existing" not in snippet[:200].lower() else "high",
            "risk_reasons":  ["Potential transfer of pre-existing background IP", "May restrict reuse of similar work for other clients"],
            "suggestions":   ["Add explicit Background IP carve-out", "Restrict assignment to purpose-built deliverables only"],
            "is_standard":   False,
        })

    if snippet := _detect_clause(tl, ["non-compete", "noncompete", "non compete", "not compete"]):
        months_m = re.search(r"(\d+)\s*months?", snippet)
        months   = int(months_m.group(1)) if months_m else 12
        clauses.append({
            "clause_type":   "non_compete",
            "title":         "Non-Compete Restriction",
            "original_text": snippet[:400],
            "explanation":   f"Prevents you from working with competitors for {months} months post-termination. Restrictions beyond 12 months are often challenged in court.",
            "risk_level":    "critical" if months > 18 else "high" if months > 12 else "medium",
            "risk_reasons":  [f"{months}-month duration limits future opportunities", "Scope may be broader than the specific engagement"],
            "suggestions":   ["Negotiate to 6 months with named-competitor restriction only", "Add carve-out for pre-existing client relationships"],
            "is_standard":   months <= 12,
        })

    if snippet := _detect_clause(tl, ["limitation of liability", "not be liable", "no liability", "maximum liability"]):
        cap_m   = re.search(r"\$[\d,]+", snippet)
        cap_str = cap_m.group(0) if cap_m else "an unspecified amount"
        clauses.append({
            "clause_type":   "liability",
            "title":         "Limitation of Liability",
            "original_text": snippet[:400],
            "explanation":   f"Caps financial responsibility at {cap_str}. If this is below the contract value or your potential exposure, you bear significant uncompensated risk.",
            "risk_level":    "high",
            "risk_reasons":  ["Cap may be inadequate relative to contract value", "Consequential damages typically excluded"],
            "suggestions":   ["Negotiate cap to minimum of total fees paid", "Carve out gross negligence from liability limits"],
            "is_standard":   True,
        })

    if snippet := _detect_clause(tl, ["terminat", "cancel", "end of the agreement"]):
        days_m  = re.search(r"(\d+)\s*days?", snippet)
        days    = int(days_m.group(1)) if days_m else 30
        clauses.append({
            "clause_type":   "termination",
            "title":         "Termination Provisions",
            "original_text": snippet[:400],
            "explanation":   f"Either party can end the agreement with {days} days notice. Short notice periods risk stranding work-in-progress and unpaid effort.",
            "risk_level":    "medium" if days >= 30 else "high",
            "risk_reasons":  [f"{days}-day notice may be insufficient for complex projects"],
            "suggestions":   ["Extend to 30+ days", "Add milestone-completion requirement before termination takes effect"],
            "is_standard":   days >= 30,
        })

    if snippet := _detect_clause(tl, ["confidential", "non-disclosure", "nda", "proprietary information"]):
        years_m = re.search(r"(\d+)\s*years?", snippet)
        years   = int(years_m.group(1)) if years_m else 3
        clauses.append({
            "clause_type":   "confidentiality",
            "title":         "Confidentiality & Non-Disclosure",
            "original_text": snippet[:400],
            "explanation":   f"Requires {years}-year confidentiality post-termination. Standard for business information; ensure public-domain carve-outs exist.",
            "risk_level":    "low" if years <= 5 else "medium",
            "risk_reasons":  [] if years <= 5 else [f"{years}-year NDA is above industry norm"],
            "suggestions":   ["Confirm carve-out for publicly known information", "Limit to specific categories of information where possible"],
            "is_standard":   years <= 5,
        })

    if snippet := _detect_clause(tl, ["payment", "invoice", "fee", "compensation"]):
        clauses.append({
            "clause_type":   "payment",
            "title":         "Payment Terms",
            "original_text": snippet[:400],
            "explanation":   "Defines when and how you get paid. Net-30 is industry standard; longer terms hurt cash flow.",
            "risk_level":    "medium" if "net-45" in snippet.lower() or "net 45" in snippet.lower() else "low",
            "risk_reasons":  ["Extended payment terms impact cash flow"],
            "suggestions":   ["Negotiate milestone payments for longer projects", "Add 1.5% monthly interest on overdue invoices"],
            "is_standard":   True,
        })

    if snippet := _detect_clause(tl, ["governing law", "jurisdiction", "arbitration", "dispute resolution"]):
        clauses.append({
            "clause_type":   "governing_law",
            "title":         "Governing Law & Disputes",
            "original_text": snippet[:400],
            "explanation":   "Determines which laws apply and where disputes are resolved. Fixed-venue arbitration may require expensive out-of-state legal representation.",
            "risk_level":    "medium",
            "risk_reasons":  ["Fixed venue may require costly remote representation"],
            "suggestions":   ["Negotiate remote/virtual arbitration option", "Consider mediation-first clause to reduce costs"],
            "is_standard":   True,
        })

    # ── Scoring ────────────────────────────────────────────────────────────────

    critical = sum(1 for c in clauses if c["risk_level"] == "critical")
    high     = sum(1 for c in clauses if c["risk_level"] == "high")
    medium   = sum(1 for c in clauses if c["risk_level"] == "medium")

    risk_score = min(100, critical * 30 + high * 15 + medium * 7 + len(clauses) * 2)
    overall    = (
        "critical" if risk_score >= 65 else
        "high"     if risk_score >= 40 else
        "medium"   if risk_score >= 20 else
        "low"
    )

    parties     = _extract_parties(text)
    eff_date    = _extract_date(text, ["effective date", "commencement", "start date"])
    expiry_date = _extract_date(text, ["expiry", "expires", "termination date", "end date"])

    gov_m = re.search(r"laws?\s+of\s+([\w\s]+?)(?:\.|,)", text, re.IGNORECASE)
    gov   = gov_m.group(1).strip().title() if gov_m else "Not specified"

    return {
        "summary": (
            f"This {word_cnt}-word contract contains {len(clauses)} analyzed clauses. "
            f"{'Critical risks identified — do not sign without legal review.' if critical else 'Review highlighted clauses before signing.'}"
        ),
        "contract_type":   "Professional Services Agreement",
        "parties":         parties,
        "governing_law":   gov,
        "effective_date":  eff_date,
        "expiry_date":     expiry_date,
        "overall_risk":    overall,
        "risk_score":      float(risk_score),
        "key_obligations": [
            "Deliver contracted services per agreed specifications",
            "Maintain confidentiality of all proprietary information",
            "Comply with IP assignment obligations upon payment",
        ],
        "recommendations": [
            *(
                [{
                    "priority": "critical",
                    "title":    c["title"],
                    "detail":   c["suggestions"][0] if c.get("suggestions") else "Seek legal review",
                }]
                for c in clauses if c["risk_level"] == "critical"
            ),
            *(
                [{
                    "priority": "high",
                    "title":    c["title"],
                    "detail":   c["suggestions"][0] if c.get("suggestions") else "Negotiate this clause",
                }]
                for c in clauses if c["risk_level"] == "high"
            ),
        ][:5],
        "clauses": clauses,
    }
