# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM python:3.11-slim AS deps

WORKDIR /deps
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

RUN useradd -m -u 1000 appuser
WORKDIR /app

COPY --from=deps /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# Optional: set LLM backend via env
# ENV OPENAI_API_KEY=""
# ENV ANTHROPIC_API_KEY=""

USER appuser
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

CMD ["uvicorn", "model_service.app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
