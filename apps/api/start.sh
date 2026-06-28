#!/bin/sh
set -e

# Render provides postgresql:// — SQLAlchemy async needs postgresql+asyncpg://
if [ -n "$DATABASE_URL" ]; then
  case "$DATABASE_URL" in
    postgresql://*) export DATABASE_URL="postgresql+asyncpg://${DATABASE_URL#postgresql://}" ;;
  esac
fi

echo "Running database migrations..."
alembic upgrade head

echo "Starting API on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
