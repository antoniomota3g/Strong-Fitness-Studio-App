# Strong-Fitness-Studio-App

This repo is in migration from Streamlit to React + FastAPI.

## Prereqs
- Python 3.12
- Node.js 18+
- A Postgres database

## Configure DB
Set `DATABASE_URL` (recommended) using `.env`.

Important: [seed_database.py](seed_database.py) **truncates tables** and requires `--yes-delete-all-data`. Only run it against a dedicated DB.

- Copy `.env.example` → `.env`
- Update `DATABASE_URL`

Streamlit can also read credentials from `.streamlit/secrets.toml` (see `.streamlit/secrets.toml.example`).

### Option A: Use your existing Postgres container (safe)
To avoid messing up your other project, create a **separate database** (and optionally a separate user) inside that same Postgres server, then point this app to that DB.

Example (run inside your existing Postgres container / server):
- Create DB: `CREATE DATABASE strong_fitness_studio_app;`
- (Optional) Create user: `CREATE USER joana_app WITH PASSWORD '...';`
- Grant: `GRANT ALL PRIVILEGES ON DATABASE strong_fitness_studio_app TO joana_app;`

Then set `DATABASE_URL` to that DB name (note the `/strong_fitness_studio_app` at the end).

### Option B: Run an isolated Postgres just for this repo (recommended for safety)
This repo includes [docker-compose.yml](docker-compose.yml) which runs Postgres on port **5433** to avoid conflicting with any other local Postgres.

- Start DB: `docker compose up -d`
- Set `.env`:
	- `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/strong_fitness_studio_app`

### Create tables + seed (for the isolated DB)
- Create tables: `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/strong_fitness_studio_app poetry run python scripts/init_db.py`
- Seed data (DESTRUCTIVE): `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/strong_fitness_studio_app poetry run python seed_database.py --yes-delete-all-data`

## Run backend (FastAPI)
From repo root:
- `poetry install`
- `poetry run uvicorn backend.main:app --reload --port 8000`

API health check: `GET http://localhost:8000/health`

## Run frontend (React)
From repo root:
- `cd frontend`
- `npm install`
- `npm run dev`

Frontend: `http://localhost:5173`

## Run Streamlit (legacy)
From repo root:
- `poetry run streamlit run 🏠_Homepage.py`
