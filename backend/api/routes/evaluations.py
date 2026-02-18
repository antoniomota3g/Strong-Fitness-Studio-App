from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend import db
from backend.schemas import Evaluation, EvaluationCreate, EvaluationUpdate, IdResponse


router = APIRouter()


@router.get("", response_model=list[Evaluation])
def list_evaluations(
    athlete_id: int | None = Query(default=None, ge=1),
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
):
    where: list[str] = []
    params: list[Any] = []

    if athlete_id is not None:
        where.append("e.athlete_id = %s")
        params.append(athlete_id)

    if start is not None and end is not None:
        where.append("e.evaluation_date BETWEEN %s AND %s")
        params.extend([start, end])
    elif start is not None:
        where.append("e.evaluation_date >= %s")
        params.append(start)
    elif end is not None:
        where.append("e.evaluation_date <= %s")
        params.append(end)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    return db.fetch_all(
        f"""
        SELECT e.*, a.first_name AS athlete_first_name, a.last_name AS athlete_last_name
        FROM evaluations e
        JOIN athletes a ON e.athlete_id = a.id
        {where_sql}
        ORDER BY e.evaluation_date DESC
        """,
        tuple(params),
    )


@router.post("", response_model=IdResponse)
def create_evaluation(payload: EvaluationCreate):
    evaluation_id = db.execute_returning_id(
        """
        INSERT INTO evaluations (
            athlete_id, evaluation_date, weight,
            muscle_percentage, fat_percentage,
            bone_percentage, water_percentage, notes
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            payload.athlete_id,
            payload.evaluation_date,
            payload.weight,
            payload.muscle_percentage,
            payload.fat_percentage,
            payload.bone_percentage,
            payload.water_percentage,
            payload.notes,
        ),
    )
    return {"id": evaluation_id}


@router.delete("/{evaluation_id}")
def delete_evaluation(evaluation_id: int):
    existing = db.fetch_one("SELECT id FROM evaluations WHERE id = %s", (evaluation_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    db.execute("DELETE FROM evaluations WHERE id = %s", (evaluation_id,))
    return {"deleted": True}


@router.patch("/{evaluation_id}")
def update_evaluation(evaluation_id: int, payload: EvaluationUpdate):
    existing = db.fetch_one("SELECT id FROM evaluations WHERE id = %s", (evaluation_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    set_clauses: list[str] = []
    params: list[object] = []

    allowed_fields = {
        "athlete_id",
        "evaluation_date",
        "weight",
        "muscle_percentage",
        "fat_percentage",
        "bone_percentage",
        "water_percentage",
        "notes",
    }

    # Only update fields explicitly provided by the client. This allows clearing values by sending null.
    for field_name in payload.model_fields_set:
        if field_name not in allowed_fields:
            continue
        value = getattr(payload, field_name)
        set_clauses.append(f"{field_name} = %s")
        params.append(value)

    if not set_clauses:
        return {"updated": False}

    params.append(evaluation_id)

    try:
        db.execute(f"UPDATE evaluations SET {', '.join(set_clauses)} WHERE id = %s", tuple(params))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"updated": True}
