# Strong-Fitness-Studio-App

React + FastAPI fitness studio management app.

## Prereqs
- Python 3.12
- Node.js 18+
- A Postgres database

## Configure DB
Set `DATABASE_URL` (recommended) using `.env`.

Important: [seed_database.py](seed_database.py) **truncates tables** and requires `--yes-delete-all-data`. Only run it against a dedicated DB.

- Copy `.env.example` → `.env`
- Update `DATABASE_URL`

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

---

## Deploy (Free Hosting)

### 1. Database — Neon (free Postgres)
1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string (starts with `postgresql://...`)
3. Create tables + seed from your local machine:
   ```bash
   DATABASE_URL="<neon-connection-string>" poetry run python scripts/init_db.py
   DATABASE_URL="<neon-connection-string>" poetry run python seed_database.py --yes-delete-all-data
   ```

### 2. Backend — Render (free Docker web service)
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Render auto-detects the `Dockerfile`
4. Set environment variables in the Render dashboard:
   - `DATABASE_URL` = your Neon connection string
   - `CORS_ORIGINS` = your Vercel frontend URL (e.g. `https://strong-fitness.vercel.app`)
5. Deploy — the backend runs DB migrations automatically on startup

### 3. Frontend — Vercel (free static hosting)
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add environment variable:
   - `VITE_API_BASE_URL` = your Render backend URL (e.g. `https://strong-fitness-api.onrender.com`)
5. Deploy

### Notes
- **Render free tier** spins down after 15 min of inactivity. First request after sleep takes ~30s (cold start). Fine for demos.
- **Neon free tier** gives 0.5 GB storage — more than enough. Data persists across deploys.
- **Vercel** deploys instantly on every push to `main`.