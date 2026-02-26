"""Initial schema — all tables

Revision ID: 001_initial
Revises:
Create Date: 2024-01-01 00:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("plan", sa.String(20), nullable=False, server_default="free"),
        sa.Column("analyses_this_month", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("analyses_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── refresh_tokens ────────────────────────────────────────────────────────
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    # ── contracts ─────────────────────────────────────────────────────────────
    op.create_table(
        "contracts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=True),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contracts_owner_id", "contracts", ["owner_id"])

    # ── contract_analyses ─────────────────────────────────────────────────────
    op.create_table(
        "contract_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("overall_risk", sa.String(20), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("contract_type", sa.String(100), nullable=True),
        sa.Column("parties", postgresql.JSON(), nullable=True),
        sa.Column("governing_law", sa.String(200), nullable=True),
        sa.Column("effective_date", sa.String(100), nullable=True),
        sa.Column("expiry_date", sa.String(100), nullable=True),
        sa.Column("key_obligations", postgresql.JSON(), nullable=True),
        sa.Column("recommendations", postgresql.JSON(), nullable=True),
        sa.Column("processing_time_sec", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contract_analyses_contract_id", "contract_analyses", ["contract_id"], unique=True)

    # ── contract_clauses ──────────────────────────────────────────────────────
    op.create_table(
        "contract_clauses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("analysis_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contract_analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clause_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("risk_reasons", postgresql.JSON(), nullable=True),
        sa.Column("suggestions", postgresql.JSON(), nullable=True),
        sa.Column("position_start", sa.Integer(), nullable=True),
        sa.Column("position_end", sa.Integer(), nullable=True),
        sa.Column("is_standard", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contract_clauses_analysis_id", "contract_clauses", ["analysis_id"])


def downgrade() -> None:
    op.drop_table("contract_clauses")
    op.drop_table("contract_analyses")
    op.drop_table("contracts")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
