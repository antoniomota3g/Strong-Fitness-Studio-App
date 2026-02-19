#!/usr/bin/env python3
"""Seed the Strong Fitness Studio database with mock data.

This script DELETES existing data (TRUNCATE) and inserts enough mock rows to
exercise most app features:
- Athletes, Exercises
- Scheduled sessions (for Calendar + starting sessions)
- Completed sessions with realistic exercises + completed_data (for Analysis + prefills)
- Evaluations (for Avaliação)

Safety:
- Requires explicit confirmation flag: --yes-delete-all-data

Usage:
  python seed_database.py --yes-delete-all-data
  python seed_database.py --yes-delete-all-data --seed 123
"""

from __future__ import annotations

import argparse
import json
import os
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any

import psycopg2
from psycopg2.extras import Json


def _json_default(value: Any):
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    return str(value)


def _json_dumps(value: Any) -> str:
    return json.dumps(value, default=_json_default, ensure_ascii=False)


def _connect():
    """Connect using DATABASE_URL env var."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL env var is required. "
            "Example: DATABASE_URL=postgresql://postgres:postgres@localhost:5433/strong_fitness_studio_app"
        )
    return psycopg2.connect(database_url)


@dataclass(frozen=True)
class SeedConfig:
    seed: int
    athletes: int
    exercises: int
    completed_sessions_per_athlete: int
    scheduled_sessions_per_athlete: int


FIRST_NAMES = [
    "Joana",
    "Miguel",
    "Inês",
    "Tiago",
    "Rita",
    "André",
    "Beatriz",
    "Sofia",
    "Pedro",
    "Carolina",
    "Gonçalo",
    "Marta",
]

LAST_NAMES = [
    "Silva",
    "Santos",
    "Ferreira",
    "Pereira",
    "Oliveira",
    "Costa",
    "Rodrigues",
    "Martins",
    "Jesus",
    "Sousa",
    "Fernandes",
    "Gomes",
]

# Options matching the frontend UI choices.
ATHLETE_GENDERS = ["Masculino", "Feminino", "Outro"]
ATHLETE_FITNESS_LEVELS = ["Iniciante", "Intermediário", "Avançado", "Profissional"]
ATHLETE_GOALS = [
    "Perda de Peso",
    "Ganho de Massa Muscular",
    "Força",
    "Resistência",
    "Flexibilidade",
    "Condição Física Geral",
    "Performance Desportiva",
]

EXERCISE_CATEGORIES = [
    "Força",
    "Cardio",
    "Flexibilidade",
    "Equilíbrio",
    "Pliometria",
    "Funcional",
    "Levantamento Olímpico",
]
EXERCISE_MUSCLE_GROUPS = [
    "Peito",
    "Costas",
    "Ombros",
    "Bíceps",
    "Tríceps",
    "Antebraços",
    "Core/Abdominais",
    "Quadríceps",
    "Isquiotibiais",
    "Glúteos",
    "Gémeos",
    "Corpo Inteiro",
]
EXERCISE_DIFFICULTIES = ["Iniciante", "Intermediário", "Avançado", "Especialista"]
EXERCISE_EQUIPMENT = [
    "Nenhum (Peso Corporal)",
    "Barbell",
    "Dumbbells",
    "Kettlebell",
    "Resistance Bands",
    "Cable Machine",
    "Banco",
    "Pull-up Bar",
    "Medicine Ball",
    "TRX",
    "Smith Machine",
    "Leg Press Machine",
    "Outra Máquina",
]
EXERCISE_TYPES = ["Composto", "Isolamento", "Cardio", "Alongamento"]

SESSION_TYPES = [
    "Treino de Força",
    "Cardio",
    "HIIT",
    "Flexibilidade",
    "Misto",
    "Específico de Desporto",
    "Recuperação",
]


EXERCISE_CATALOG = [
    {
        "name": "Agachamento",
        "category": "Força",
        "muscles": ["Quadríceps", "Glúteos", "Core/Abdominais"],
        "equipment": ["Barbell"],
        "difficulty": "Intermediário",
        "exercise_type": "Composto",
    },
    {
        "name": "Peso Morto",
        "category": "Força",
        "muscles": ["Costas", "Isquiotibiais", "Glúteos", "Core/Abdominais"],
        "equipment": ["Barbell"],
        "difficulty": "Intermediário",
        "exercise_type": "Composto",
    },
    {
        "name": "Supino",
        "category": "Força",
        "muscles": ["Peito", "Tríceps", "Ombros"],
        "equipment": ["Barbell", "Banco"],
        "difficulty": "Intermediário",
        "exercise_type": "Composto",
    },
    {
        "name": "Remada",
        "category": "Força",
        "muscles": ["Costas", "Bíceps"],
        "equipment": ["Dumbbells"],
        "difficulty": "Iniciante",
        "exercise_type": "Composto",
    },
    {
        "name": "Press Militar",
        "category": "Força",
        "muscles": ["Ombros", "Tríceps"],
        "equipment": ["Barbell"],
        "difficulty": "Intermediário",
        "exercise_type": "Composto",
    },
    {
        "name": "Pull-up",
        "category": "Força",
        "muscles": ["Costas", "Bíceps"],
        "equipment": ["Pull-up Bar"],
        "difficulty": "Avançado",
        "exercise_type": "Composto",
    },
    {
        "name": "Flexões",
        "category": "Funcional",
        "muscles": ["Peito", "Tríceps", "Ombros"],
        "equipment": ["Nenhum (Peso Corporal)"],
        "difficulty": "Iniciante",
        "exercise_type": "Composto",
    },
    {
        "name": "Afundos",
        "category": "Funcional",
        "muscles": ["Quadríceps", "Glúteos"],
        "equipment": ["Dumbbells"],
        "difficulty": "Intermediário",
        "exercise_type": "Composto",
    },
    {
        "name": "Leg Press",
        "category": "Força",
        "muscles": ["Quadríceps", "Glúteos"],
        "equipment": ["Leg Press Machine"],
        "difficulty": "Iniciante",
        "exercise_type": "Composto",
    },
    {
        "name": "Curl Bíceps",
        "category": "Força",
        "muscles": ["Bíceps"],
        "equipment": ["Dumbbells"],
        "difficulty": "Iniciante",
        "exercise_type": "Isolamento",
    },
    {
        "name": "Tríceps Corda",
        "category": "Força",
        "muscles": ["Tríceps"],
        "equipment": ["Cable Machine"],
        "difficulty": "Iniciante",
        "exercise_type": "Isolamento",
    },
    {
        "name": "Elevação Lateral",
        "category": "Força",
        "muscles": ["Ombros"],
        "equipment": ["Dumbbells"],
        "difficulty": "Iniciante",
        "exercise_type": "Isolamento",
    },
    {
        "name": "Prancha",
        "category": "Funcional",
        "muscles": ["Core/Abdominais"],
        "equipment": ["Nenhum (Peso Corporal)"],
        "difficulty": "Iniciante",
        "exercise_type": "Alongamento",
    },
    {
        "name": "Abdominal",
        "category": "Funcional",
        "muscles": ["Core/Abdominais"],
        "equipment": ["Nenhum (Peso Corporal)"],
        "difficulty": "Iniciante",
        "exercise_type": "Alongamento",
    },
    {
        "name": "Corrida",
        "category": "Cardio",
        "muscles": ["Corpo Inteiro"],
        "equipment": ["Outra Máquina"],
        "difficulty": "Iniciante",
        "exercise_type": "Cardio",
    },
    {
        "name": "Bicicleta",
        "category": "Cardio",
        "muscles": ["Corpo Inteiro"],
        "equipment": ["Outra Máquina"],
        "difficulty": "Iniciante",
        "exercise_type": "Cardio",
    },
    {
        "name": "Remo",
        "category": "Cardio",
        "muscles": ["Corpo Inteiro"],
        "equipment": ["Outra Máquina"],
        "difficulty": "Intermediário",
        "exercise_type": "Cardio",
    },
]


def _pick_unique_names(rng: random.Random, n: int) -> list[tuple[str, str]]:
    names: set[tuple[str, str]] = set()
    attempts = 0
    while len(names) < n and attempts < 10_000:
        attempts += 1
        names.add((rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)))
    if len(names) < n:
        raise RuntimeError("Could not generate enough unique athlete names")
    return list(names)


def _rand_phone(rng: random.Random) -> str:
    return f"9{rng.randint(10_000_000, 99_999_999)}"


def _rand_email(first: str, last: str, rng: random.Random) -> str:
    suffix = rng.randint(1, 999)
    base = f"{first}.{last}.{suffix}".lower()
    return base.replace(" ", "") + "@example.com"


def _make_planned_exercise(
    exercise_name: str, idx: int, rng: random.Random
) -> dict[str, Any]:
    sets = rng.choice([3, 4, 5])
    reps = rng.choice(["8", "10", "12", "8-12", "10-12"])
    rest = rng.choice([60, 75, 90, 120])
    weight = rng.choice(["", "10kg", "20kg", "30kg", "40kg", "50kg", "RPE 7", "RPE 8"])
    return {
        "exercise_idx": idx,
        "exercise_name": exercise_name,
        "sets": sets,
        "reps": reps,
        "rest": rest,
        "weight": weight,
    }


def _with_actuals(planned: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    updated = planned.copy()
    # Keep mostly consistent but add some variability.
    updated["actual_sets"] = planned.get("sets")
    updated["actual_reps"] = planned.get("reps")
    updated["actual_rest"] = planned.get("rest")
    planned_weight = planned.get("weight") or ""
    updated["actual_weight"] = planned_weight

    status = rng.choices(
        population=["completed", "failed", "skipped"],
        weights=[0.85, 0.10, 0.05],
        k=1,
    )[0]
    updated["status"] = status
    updated["exercise_notes"] = rng.choice(
        [
            "",
            "Boa execução.",
            "Última série mais difícil.",
            "Ajustar carga na próxima.",
            "Fadiga elevada hoje.",
        ]
    )

    # Sometimes tweak weight/reps.
    if status == "completed" and rng.random() < 0.30:
        updated["actual_reps"] = rng.choice([planned.get("reps"), "+1 rep", "-1 rep"])
    if status == "completed" and rng.random() < 0.25:
        updated["actual_weight"] = rng.choice(
            [planned_weight, "+2.5kg", "+5kg", "-2.5kg"]
        )

    return updated


def _make_completed_progress(
    session_exercises: list[dict[str, Any]], started_at: datetime, rng: random.Random
):
    exercises_progress = []
    for ex in session_exercises:
        planned_sets = ex.get("sets")
        planned_reps = ex.get("reps")
        planned_rest = ex.get("rest")
        planned_weight = ex.get("weight", "")

        status = ex.get("status", "completed")
        completed_at = None
        if status in ("completed", "failed"):
            completed_at = started_at + timedelta(minutes=rng.randint(8, 18))

        exercises_progress.append(
            {
                "exercise_idx": ex.get("exercise_idx", 0),
                "exercise_name": ex.get("exercise_name"),
                "planned_sets": planned_sets,
                "planned_reps": planned_reps,
                "planned_weight": planned_weight,
                "planned_rest": planned_rest,
                "status": status,
                "actual_sets": ex.get("actual_sets", planned_sets),
                "actual_reps": ex.get("actual_reps", planned_reps),
                "actual_weight": ex.get("actual_weight", planned_weight),
                "actual_rest": ex.get("actual_rest", planned_rest),
                "notes": ex.get("exercise_notes", ""),
                "completed_at": completed_at,
            }
        )

    return {
        "started_at": started_at,
        "exercises": exercises_progress,
    }


def _truncate_all(cur):
    cur.execute(
        """
        TRUNCATE TABLE training_sessions, evaluations, exercises, athletes
        RESTART IDENTITY CASCADE;
        """
    )


def main():
    parser = argparse.ArgumentParser(description="Seed Strong Fitness Studio database")
    parser.add_argument(
        "--yes-delete-all-data",
        action="store_true",
        help="Required. Actually truncates all tables before inserting mock data.",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--athletes", type=int, default=8)
    parser.add_argument(
        "--exercises",
        type=int,
        default=len(EXERCISE_CATALOG),
        help="How many standard catalog exercises to insert (capped to catalog size).",
    )
    parser.add_argument("--completed-sessions-per-athlete", type=int, default=10)
    parser.add_argument("--scheduled-sessions-per-athlete", type=int, default=8)
    args = parser.parse_args()

    if not args.yes_delete_all_data:
        print("Refusing to run: this script deletes ALL data.")
        print("Re-run with: --yes-delete-all-data")
        raise SystemExit(2)

    cfg = SeedConfig(
        seed=args.seed,
        athletes=args.athletes,
        exercises=min(args.exercises, len(EXERCISE_CATALOG)),
        completed_sessions_per_athlete=args.completed_sessions_per_athlete,
        scheduled_sessions_per_athlete=args.scheduled_sessions_per_athlete,
    )

    if args.exercises > len(EXERCISE_CATALOG):
        print(
            f"ℹ️  Requested {args.exercises} exercises, but only {len(EXERCISE_CATALOG)} standard exercises exist. Seeding {len(EXERCISE_CATALOG)}."
        )

    rng = random.Random(cfg.seed)

    # Ensure tables exist (uses scripts/init_db DDL)
    import sys

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scripts"))
    from init_db import main as init_db_main

    init_db_main()

    conn = _connect()
    try:
        conn.autocommit = False
        cur = conn.cursor()

        _truncate_all(cur)

        # Athletes
        athlete_ids: list[int] = []
        for first, last in _pick_unique_names(rng, cfg.athletes):
            birth = date(1990, 1, 1) + timedelta(days=rng.randint(0, 12_000))
            weight = round(rng.uniform(55, 95), 1)
            height = round(rng.uniform(1.55, 1.95), 2)
            fitness_level = rng.choice(ATHLETE_FITNESS_LEVELS)
            goals = rng.sample(
                ATHLETE_GOALS, k=rng.randint(1, min(3, len(ATHLETE_GOALS)))
            )

            cur.execute(
                """
                INSERT INTO athletes (first_name, last_name, email, phone, birth_date, gender,
                                    weight, height, fitness_level, goals, medical_conditions, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
                """,
                (
                    first,
                    last,
                    _rand_email(first, last, rng),
                    _rand_phone(rng),
                    birth,
                    rng.choice(ATHLETE_GENDERS),
                    weight,
                    height,
                    fitness_level,
                    ", ".join(goals),
                    rng.choice(["", "Asma", "Dor lombar ocasional", ""]),
                    rng.choice(
                        [
                            "",
                            "",
                            "Prefere treinar de manhã.",
                            "Disponível apenas à noite.",
                            "Vai de férias em agosto — pausar plano.",
                            "Quer preparar-se para uma corrida de 10km.",
                            "Começou recentemente, precisa de acompanhamento extra.",
                            "Atleta muito motivado, pode aumentar intensidade.",
                        ]
                    ),
                ),
            )
            athlete_ids.append(cur.fetchone()[0])

        # Exercises
        # Insert only the curated standard catalog (no generic 'Exercício N' rows).
        base = EXERCISE_CATALOG.copy()
        rng.shuffle(base)
        exercise_rows: list[tuple[str, ...]] = []

        for item in base[: min(len(base), cfg.exercises)]:
            exercise_rows.append(
                (
                    item["name"],
                    item["category"],
                    ", ".join(
                        [m for m in item["muscles"] if m in EXERCISE_MUSCLE_GROUPS]
                    ),
                    ", ".join(
                        [e for e in item["equipment"] if e in EXERCISE_EQUIPMENT]
                    ),
                    item["difficulty"],
                    item.get("exercise_type", ""),
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                )
            )

        cur.executemany(
            """
            INSERT INTO exercises (name, category, muscle_groups, equipment, difficulty,
                                 exercise_type, sets_range, reps_range,
                                 description, instructions, tips, video_url)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            exercise_rows,
        )

        exercise_names = [row[0] for row in exercise_rows]

        # Evaluations (2 per athlete)
        today = date.today()
        for athlete_id in athlete_ids:
            # older
            older_date = today - timedelta(days=rng.randint(30, 180))
            cur.execute(
                """
                INSERT INTO evaluations (athlete_id, evaluation_date, weight, muscle_percentage,
                                       fat_percentage, bone_percentage, water_percentage, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    athlete_id,
                    older_date,
                    round(rng.uniform(55, 95), 1),
                    round(rng.uniform(30, 48), 1),
                    round(rng.uniform(12, 28), 1),
                    round(rng.uniform(2.5, 4.0), 2),
                    round(rng.uniform(45, 60), 1),
                    "Avaliação inicial (mock).",
                ),
            )
            # recent
            recent_date = today - timedelta(days=rng.randint(0, 21))
            cur.execute(
                """
                INSERT INTO evaluations (athlete_id, evaluation_date, weight, muscle_percentage,
                                       fat_percentage, bone_percentage, water_percentage, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    athlete_id,
                    recent_date,
                    round(rng.uniform(55, 95), 1),
                    round(rng.uniform(30, 50), 1),
                    round(rng.uniform(10, 30), 1),
                    round(rng.uniform(2.5, 4.0), 2),
                    round(rng.uniform(45, 60), 1),
                    "Avaliação recente (mock).",
                ),
            )

        # Training sessions
        inserted_sessions = 0

        # Completed sessions (past)
        for athlete_id in athlete_ids:
            for i in range(cfg.completed_sessions_per_athlete):
                days_ago = rng.randint(3, 60)
                s_date = today - timedelta(days=days_ago)
                s_time = time(
                    hour=rng.choice([7, 8, 9, 18, 19, 20]),
                    minute=rng.choice([0, 15, 30, 45]),
                )

                selected_exercises = rng.sample(
                    exercise_names, k=min(5, len(exercise_names))
                )
                planned = [
                    _make_planned_exercise(name, idx=j, rng=rng)
                    for j, name in enumerate(selected_exercises)
                ]
                completed_exercises = [_with_actuals(ex, rng) for ex in planned]

                started_at = datetime.combine(s_date, s_time) - timedelta(
                    minutes=rng.randint(0, 10)
                )
                completed_at = datetime.combine(s_date, s_time) + timedelta(
                    minutes=rng.randint(45, 75)
                )

                progress = _make_completed_progress(
                    completed_exercises, started_at=started_at, rng=rng
                )

                cur.execute(
                    """
                    INSERT INTO training_sessions (
                        athlete_id, session_name, session_date, session_time,
                        duration, session_type, session_notes, status,
                        exercises, completed_data, completed_at
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        athlete_id,
                        rng.choice(
                            [
                                "Treino de Força",
                                "Treino Full Body",
                                "Treino Superior",
                                "Treino Inferior",
                            ]
                        ),
                        s_date,
                        s_time,
                        rng.choice([45, 60, 75]),
                        rng.choice(SESSION_TYPES),
                        rng.choice(
                            ["", "Boa sessão.", "Fadiga alta.", "Foco em técnica."]
                        ),
                        "Completed",
                        Json(completed_exercises, dumps=_json_dumps),
                        Json(progress, dumps=_json_dumps),
                        completed_at,
                    ),
                )
                inserted_sessions += 1

        # Scheduled sessions (future)
        for athlete_id in athlete_ids:
            for i in range(cfg.scheduled_sessions_per_athlete):
                days_ahead = rng.randint(1, 21)
                s_date = today + timedelta(days=days_ahead)
                s_time = time(
                    hour=rng.choice([7, 8, 9, 18, 19, 20]),
                    minute=rng.choice([0, 15, 30, 45]),
                )

                selected_exercises = rng.sample(
                    exercise_names, k=min(5, len(exercise_names))
                )
                planned = [
                    _make_planned_exercise(name, idx=j, rng=rng)
                    for j, name in enumerate(selected_exercises)
                ]

                cur.execute(
                    """
                    INSERT INTO training_sessions (
                        athlete_id, session_name, session_date, session_time,
                        duration, session_type, session_notes, status, exercises
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        athlete_id,
                        rng.choice(
                            ["Sessão Planeada", "Treino Agendado", "Sessão Técnica"]
                        ),
                        s_date,
                        s_time,
                        rng.choice([45, 60, 75]),
                        rng.choice(SESSION_TYPES),
                        "",
                        "Scheduled",
                        Json(planned, dumps=_json_dumps),
                    ),
                )
                inserted_sessions += 1

            # One cancelled session
            cancel_date = today + timedelta(days=rng.randint(1, 14))
            cancel_time = time(hour=18, minute=0)
            cur.execute(
                """
                INSERT INTO training_sessions (
                    athlete_id, session_name, session_date, session_time,
                    duration, session_type, session_notes, status, exercises
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    athlete_id,
                    "Sessão Cancelada (mock)",
                    cancel_date,
                    cancel_time,
                    60,
                    rng.choice(SESSION_TYPES),
                    "Cancelada para testar estados.",
                    "Cancelled",
                    Json([], dumps=_json_dumps),
                ),
            )
            inserted_sessions += 1

        conn.commit()

        cur.execute("SELECT COUNT(*) FROM athletes")
        athletes_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM exercises")
        exercises_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM training_sessions")
        sessions_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM evaluations")
        evals_count = cur.fetchone()[0]

        print("✅ Database seeded successfully")
        print(f"- Athletes: {athletes_count}")
        print(f"- Exercises: {exercises_count}")
        print(f"- Training sessions: {sessions_count} (inserted {inserted_sessions})")
        print(f"- Evaluations: {evals_count}")
        print(
            "\nRun the FastAPI backend: poetry run uvicorn backend.main:app --reload --port 8000"
        )

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
