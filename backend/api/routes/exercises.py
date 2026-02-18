from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend import db
from backend.schemas import Exercise, ExerciseCreate, ExerciseUpdate, IdResponse


router = APIRouter()


@router.get("", response_model=list[Exercise])
def list_exercises():
    return db.fetch_all("SELECT * FROM exercises ORDER BY name")


@router.post("", response_model=IdResponse)
def create_exercise(payload: ExerciseCreate):
    exercise_id = db.execute_returning_id(
        """
        INSERT INTO exercises (
            name, category, muscle_groups, equipment,
            difficulty, description, instructions, video_url
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            payload.name,
            payload.category,
            payload.muscle_groups,
            payload.equipment,
            payload.difficulty,
            payload.description,
            payload.instructions,
            payload.video_url,
        ),
    )
    return {"id": exercise_id}


@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: int):
    row = db.fetch_one("SELECT id FROM exercises WHERE id = %s", (exercise_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.execute("DELETE FROM exercises WHERE id = %s", (exercise_id,))
    return {"deleted": True}


@router.patch("/{exercise_id}")
def update_exercise(exercise_id: int, payload: ExerciseUpdate):
    existing = db.fetch_one("SELECT id FROM exercises WHERE id = %s", (exercise_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Exercise not found")

    allowed_fields = {
        "name",
        "category",
        "muscle_groups",
        "equipment",
        "difficulty",
        "description",
        "instructions",
        "video_url",
    }

    set_clauses: list[str] = []
    params: list[object] = []

    for field_name in payload.model_fields_set:
        if field_name not in allowed_fields:
            continue
        value = getattr(payload, field_name)
        set_clauses.append(f"{field_name} = %s")
        params.append(value)

    if not set_clauses:
        return {"updated": False}

    params.append(exercise_id)
    db.execute(f"UPDATE exercises SET {', '.join(set_clauses)} WHERE id = %s", tuple(params))
    return {"updated": True}
