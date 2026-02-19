#!/usr/bin/env python3
"""Create Strong Fitness Studio tables in Postgres.

Uses DATABASE_URL if set. Otherwise uses DB_* env vars.
Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

Examples:
  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/strong_fitness_studio_app \
    python scripts/init_db.py
"""

from __future__ import annotations

import os

import psycopg2


def _get_database_url() -> str:
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return database_url

    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5433")
    dbname = os.environ.get("DB_NAME", "strong_fitness_studio_app")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


DDL = [
    """
    CREATE TABLE IF NOT EXISTS athletes (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        birth_date DATE,
        gender VARCHAR(20),
        weight DECIMAL(5,2),
        height DECIMAL(5,2),
        fitness_level VARCHAR(50),
        goals TEXT,
        medical_conditions TEXT,
        notes TEXT,
        plan_type VARCHAR(20) DEFAULT 'monthly',
        plan_sessions_per_week INTEGER,
        plan_monthly_price DECIMAL(10,2),
        plan_on_demand_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100),
        muscle_groups TEXT,
        equipment TEXT,
        difficulty VARCHAR(50),
        exercise_type VARCHAR(50),
        sets_range VARCHAR(50),
        reps_range VARCHAR(50),
        description TEXT,
        instructions TEXT,
        tips TEXT,
        video_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS training_sessions (
        id SERIAL PRIMARY KEY,
        athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
        session_name VARCHAR(200) NOT NULL,
        session_date DATE NOT NULL,
        session_time TIME NOT NULL,
        duration INTEGER,
        session_type VARCHAR(100),
        session_notes TEXT,
        status VARCHAR(50) DEFAULT 'Scheduled',
        exercises JSONB,
        completed_data JSONB,
        completed_at TIMESTAMP,
        created_date DATE DEFAULT CURRENT_DATE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        athlete_id INTEGER REFERENCES athletes(id) ON DELETE CASCADE,
        evaluation_date DATE NOT NULL,
        weight DECIMAL(5,2),
        muscle_percentage DECIMAL(5,2),
        fat_percentage DECIMAL(5,2),
        bone_percentage DECIMAL(5,2),
        water_percentage DECIMAL(5,2),
        notes TEXT,
        created_date DATE DEFAULT CURRENT_DATE
    )
    """,
]

# Migrations for existing databases — adds columns that were introduced after
# the initial CREATE TABLE. Safe to run repeatedly (IF NOT EXISTS).
MIGRATIONS = [
    "ALTER TABLE athletes ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'monthly'",
    "ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_sessions_per_week INTEGER",
    "ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_monthly_price DECIMAL(10,2)",
    "ALTER TABLE athletes ADD COLUMN IF NOT EXISTS plan_on_demand_price DECIMAL(10,2)",
    "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_type VARCHAR(50)",
    "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS sets_range VARCHAR(50)",
    "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS reps_range VARCHAR(50)",
    "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tips TEXT",
]


def main() -> int:
    database_url = _get_database_url()
    print(f"Connecting to: {database_url}")

    conn = psycopg2.connect(database_url)
    try:
        with conn:
            with conn.cursor() as cur:
                for stmt in DDL:
                    cur.execute(stmt)
                for stmt in MIGRATIONS:
                    cur.execute(stmt)
        print("✅ Tables are ready.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
