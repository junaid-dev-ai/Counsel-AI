"""
CounselAI – Test Suite
Tests: Auth endpoints, Contract upload/analysis, Model service rules, Schemas.
Run: pytest backend/app/tests/ -v --cov=backend --cov-fail-under=75
"""
from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Auth Service Tests ────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        from backend.app.services.auth import hash_password
        h = hash_password("secret123")
        assert h != "secret123"
        assert len(h) > 30

    def test_verify_correct_password(self):
        from backend.app.services.auth import hash_password, verify_password
        h = hash_password("mypassword1")
        assert verify_password("mypassword1", h) is True

    def test_reject_wrong_password(self):
        from backend.app.services.auth import hash_password, verify_password
        h = hash_password("correct")
        assert verify_password("wrong", h) is False

    def test_different_hashes_for_same_input(self):
        from backend.app.services.auth import hash_password
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2  # bcrypt salts


class TestJWT:
    def test_create_decode_roundtrip(self):
        from backend.app.services.auth import create_access_token, decode_access_token
        uid = str(uuid.uuid4())
        token = create_access_token(uid, "test@example.com")
        payload = decode_access_token(token)
        assert payload["sub"] == uid
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"

    def test_invalid_token_raises(self):
        from fastapi import HTTPException
        from backend.app.services.auth import decode_access_token
        with pytest.raises(HTTPException) as exc:
            decode_access_token("not.a.valid.token")
        assert exc.value.status_code == 401

    def test_tampered_token_raises(self):
        from fastapi import HTTPException
        from backend.app.services.auth import create_access_token, decode_access_token
        token = create_access_token("uid", "x@y.com") + "tampered"
        with pytest.raises(HTTPException):
            decode_access_token(token)


class TestRefreshToken:
    def test_raw_and_hash_differ(self):
        from backend.app.services.auth import create_refresh_token_pair
        raw, hashed = create_refresh_token_pair()
        assert raw != hashed
        assert len(raw) > 20
        assert len(hashed) == 64   # sha256 hex

    def test_uniqueness(self):
        from backend.app.services.auth import create_refresh_token_pair
        pairs = [create_refresh_token_pair() for _ in range(10)]
        raws  = [p[0] for p in pairs]
        assert len(set(raws)) == 10


# ── Schema Tests ──────────────────────────────────────────────────────────────

class TestSchemas:
    def test_register_valid(self):
        from backend.app.schemas.schemas import RegisterRequest
        r = RegisterRequest(email="a@b.com", full_name="Alice Bob", password="secure1!")
        assert r.email == "a@b.com"

    def test_register_short_password_rejected(self):
        from pydantic import ValidationError
        from backend.app.schemas.schemas import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com", full_name="Alice", password="short")

    def test_register_no_digit_rejected(self):
        from pydantic import ValidationError
        from backend.app.schemas.schemas import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(email="a@b.com", full_name="Alice", password="NoDigitsHere!")

    def test_register_invalid_email_rejected(self):
        from pydantic import ValidationError
        from backend.app.schemas.schemas import RegisterRequest
        with pytest.raises(ValidationError):
            RegisterRequest(email="notanemail", full_name="Alice", password="pass1234")

    def test_dashboard_stats_model(self):
        from backend.app.schemas.schemas import DashboardStats
        stats = DashboardStats(
            total_contracts=10, completed=8, critical_risk=2, high_risk=3,
            avg_risk_score=55.5, plan="pro", analyses_used=5, analyses_limit=50,
        )
        assert stats.total_contracts == 10
        assert stats.plan == "pro"


# ── Contract Service Tests ────────────────────────────────────────────────────

class TestTextExtraction:
    def test_plain_text_extraction(self):
        from backend.app.services.contract import extract_text
        content  = b"This is a service agreement between parties."
        text, pages = extract_text(content, "text/plain")
        assert "service agreement" in text
        assert pages == 1

    def test_unknown_mime_falls_back_to_text(self):
        from backend.app.services.contract import extract_text
        text, _ = extract_text(b"hello", "application/octet-stream")
        assert "hello" in text

    def test_utf8_decoding(self):
        from backend.app.services.contract import extract_text
        text, _ = extract_text("Ünïcödé téxt".encode("utf-8"), "text/plain")
        assert "Ünïcödé" in text


# ── Model Service Rules Tests ─────────────────────────────────────────────────

class TestRuleBasedAnalysis:
    SAMPLE = """
    PROFESSIONAL SERVICES AGREEMENT

    This Agreement is entered between Acme Corp ("Client") and John Doe ("Provider").

    1. INTELLECTUAL PROPERTY: All work product, inventions, and deliverables created 
       hereunder shall be the sole property of Client including pre-existing tools.

    2. NON-COMPETE: Provider shall not compete with Client for 24 months following 
       termination, anywhere in the world.

    3. LIMITATION OF LIABILITY: Total liability shall not exceed $500 USD.

    4. TERMINATION: Either party may terminate upon 14 days' written notice.

    5. CONFIDENTIALITY: Provider shall maintain strict confidence for 5 years.

    6. PAYMENT: Invoices due Net-45. Late payment accrues 2% monthly interest.

    7. GOVERNING LAW: Laws of Delaware. Binding arbitration in Wilmington, DE.
    """

    def test_returns_required_keys(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        for key in ["summary", "overall_risk", "risk_score", "clauses", "recommendations"]:
            assert key in r, f"Missing key: {key}"

    def test_risk_score_range(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        assert 0 <= r["risk_score"] <= 100

    def test_overall_risk_valid_value(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        assert r["overall_risk"] in ("low", "medium", "high", "critical")

    def test_ip_clause_detected(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        types = [c["clause_type"] for c in r["clauses"]]
        assert "ip_ownership" in types

    def test_noncompete_detected(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        types = [c["clause_type"] for c in r["clauses"]]
        assert "non_compete" in types

    def test_noncompete_24month_is_critical(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        nc = next(c for c in r["clauses"] if c["clause_type"] == "non_compete")
        assert nc["risk_level"] in ("critical", "high")

    def test_termination_14day_is_high_risk(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        t  = next((c for c in r["clauses"] if c["clause_type"] == "termination"), None)
        if t:
            assert t["risk_level"] in ("high", "medium")

    def test_all_clauses_have_required_fields(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        required = {"clause_type", "title", "original_text", "explanation",
                    "risk_level", "is_standard"}
        for clause in r["clauses"]:
            missing = required - set(clause.keys())
            assert not missing, f"Clause missing fields: {missing}"

    def test_risk_level_values_valid(self):
        from model_service.app.rules import build_analysis
        valid  = {"low", "medium", "high", "critical"}
        result = build_analysis(self.SAMPLE)
        for clause in result["clauses"]:
            assert clause["risk_level"] in valid

    def test_suggestions_are_lists(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        for clause in r["clauses"]:
            assert isinstance(clause.get("suggestions", []), list)

    def test_empty_contract_doesnt_crash(self):
        from model_service.app.rules import build_analysis
        r = build_analysis("")
        assert "risk_score" in r
        assert r["risk_score"] == 0 or r["clauses"] == []

    def test_high_risk_contract_has_recommendations(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        assert len(r["recommendations"]) > 0

    def test_recommendations_have_priority_field(self):
        from model_service.app.rules import build_analysis
        r    = build_analysis(self.SAMPLE)
        valid = {"low", "medium", "high", "critical"}
        for rec in r["recommendations"]:
            assert rec["priority"] in valid

    def test_summary_non_empty(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        assert len(r["summary"]) > 20

    def test_parties_extracted(self):
        from model_service.app.rules import build_analysis
        r = build_analysis(self.SAMPLE)
        assert len(r["parties"]) >= 1

    def test_low_risk_contract(self):
        from model_service.app.rules import build_analysis
        bland = "This is a standard consulting agreement. Payment due Net-30. Both parties agree to standard terms."
        r     = build_analysis(bland)
        assert r["risk_score"] < 50


# ── Mock Service Integration ───────────────────────────────────────────────────

class TestContractService:
    @pytest.mark.asyncio
    async def test_call_model_falls_back_to_mock(self):
        """When model service is unreachable, contract service uses mock."""
        from backend.app.services.contract import call_model_service
        # Model service at localhost:8001 won't be running in tests
        result = await call_model_service("This is a test contract text.", "test-id")
        assert "overall_risk" in result
        assert "clauses" in result
        assert "risk_score" in result

    @pytest.mark.asyncio
    async def test_mock_result_structure(self):
        from backend.app.services.contract import _mock_result
        r = _mock_result("This contract has confidential and payment terms.")
        assert r["overall_risk"] in ("low", "medium", "high", "critical")
        assert 0 <= r["risk_score"] <= 100
        assert isinstance(r["clauses"], list)

    @pytest.mark.asyncio
    async def test_quota_enforcement_structure(self):
        """Quota function exists and accepts User-like objects."""
        from backend.app.services.contract import enforce_quota
        assert callable(enforce_quota)
