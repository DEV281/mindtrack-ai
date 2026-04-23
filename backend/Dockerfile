FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y \
    gcc g++ libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*
COPY requirements-deploy.txt requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1
CMD ["sh", "-c", "if [ -f alembic.ini ]; then python -m alembic upgrade head; fi && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --access-log"]
