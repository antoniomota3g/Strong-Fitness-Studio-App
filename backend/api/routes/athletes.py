from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend import db
from backend.schemas import Athlete, AthleteCreate, AthleteUpdate, IdResponse


router = APIRouter()


def _goals_to_list(value):
    if value is None:
        return None
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        return [part.strip() for part in cleaned.split(",") if part.strip()]
    return [str(value)]


def _goals_to_text(value):
    if value is None:
        return None
    if isinstance(value, list):
        return ", ".join([str(v).strip() for v in value if str(v).strip()]) or None
    if isinstance(value, str):
        return value or None
    return str(value)


@router.get("", response_model=list[Athlete])
def list_athletes():
    rows = db.fetch_all("SELECT * FROM athletes ORDER BY first_name, last_name")
    for row in rows:
        row["goals"] = _goals_to_list(row.get("goals"))
    return rows


@router.post("", response_model=IdResponse)
def create_athlete(payload: AthleteCreate):
    athlete_id = db.execute_returning_id(
        """
        INSERT INTO athletes (
            first_name, last_name, email, phone, birth_date,
            gender, weight, height, fitness_level, goals, medical_conditions, notes
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            payload.first_name,
            payload.last_name,
            payload.email,
            payload.phone,
            payload.birth_date,
            payload.gender,
            payload.weight,
            payload.height,
            payload.fitness_level,
            _goals_to_text(payload.goals),
            payload.medical_conditions,
            payload.notes,
        ),
    )
    return {"id": athlete_id}


@router.delete("/{athlete_id}")
def delete_athlete(athlete_id: int):
    row = db.fetch_one("SELECT id FROM athletes WHERE id = %s", (athlete_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Athlete not found")
    db.execute("DELETE FROM athletes WHERE id = %s", (athlete_id,))
    return {"deleted": True}


@router.patch("/{athlete_id}")
def update_athlete(athlete_id: int, payload: AthleteUpdate):
    existing = db.fetch_one("SELECT id FROM athletes WHERE id = %s", (athlete_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Athlete not found")

    set_clauses: list[str] = []
    params: list[object] = []

    # Only update fields explicitly provided by the client. This allows clearing values by sending null.
    for field_name in payload.model_fields_set:
        if field_name == "goals":
            value = _goals_to_text(payload.goals)
            set_clauses.append("goals = %s")
            params.append(value)
            continue

        if field_name not in {
            "first_name",
            "last_name",
            "email",
            "phone",
            "birth_date",
            "gender",
            "weight",
            "height",
            "fitness_level",
            "medical_conditions",
            "notes",
            "plan_type",
            "plan_sessions_per_week",
            "plan_monthly_price",
            "plan_on_demand_price",
        }:
            continue

        value = getattr(payload, field_name)
        set_clauses.append(f"{field_name} = %s")
        params.append(value)

    if not set_clauses:
        return {"updated": False}

    params.append(athlete_id)

    try:
        db.execute(f"UPDATE athletes SET {', '.join(set_clauses)} WHERE id = %s", tuple(params))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"updated": True}
