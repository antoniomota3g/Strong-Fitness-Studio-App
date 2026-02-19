FROM python:3.12-slim

WORKDIR /app

# Install poetry
RUN pip install --no-cache-dir poetry

# Copy dependency files first (better Docker cache)
COPY pyproject.toml poetry.lock ./

# Install dependencies (no virtualenv inside container)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --only main

# Copy application code
COPY backend/ backend/
COPY scripts/ scripts/

# Run DB migrations on startup, then start uvicorn
CMD sh -c "python scripts/init_db.py && uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"
