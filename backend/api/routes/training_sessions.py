from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend import db
from backend.schemas import IdResponse, TrainingSession, TrainingSessionCreate, TrainingSessionUpdate


router = APIRouter()


def _parse_time(value: str) -> str:
    v = (value or "").strip()
    if not v:
        raise ValueError("session_time is required")
    # Accept HH:MM and normalize to HH:MM:SS
    if len(v) == 5 and v[2] == ":":
        return v + ":00"
    return v


@router.get("", response_model=list[TrainingSession])
def list_training_sessions(
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    athlete_id: int | None = Query(default=None, ge=1),
    status: str | None = Query(default=None),
):
    where: list[str] = []
    params: list[Any] = []

    if start is not None and end is not None:
        where.append("ts.session_date BETWEEN %s AND %s")
        params.extend([start, end])
    elif start is not None:
        where.append("ts.session_date >= %s")
        params.append(start)
    elif end is not None:
        where.append("ts.session_date <= %s")
        params.append(end)

    if athlete_id is not None:
        where.append("ts.athlete_id = %s")
        params.append(athlete_id)

    if status is not None and status.strip():
        where.append("ts.status = %s")
        params.append(status.strip())

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    rows = db.fetch_all(
        f"""
        SELECT ts.*, a.first_name AS athlete_first_name, a.last_name AS athlete_last_name
        FROM training_sessions ts
        JOIN athletes a ON ts.athlete_id = a.id
        {where_sql}
        ORDER BY ts.session_date ASC, ts.session_time ASC
        """,
        tuple(params),
    )

    # Ensure time is serialized as string
    for r in rows:
        t = r.get("session_time")
        if t is not None and not isinstance(t, str):
            r["session_time"] = str(t)

    return rows


@router.post("", response_model=IdResponse)
def create_training_session(payload: TrainingSessionCreate):
    session_time = _parse_time(payload.session_time)

    session_id = db.execute_returning_id(
        """
        INSERT INTO training_sessions (
            athlete_id, session_name, session_date,
            session_time, duration, session_type,
            session_notes, exercises, status
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            payload.athlete_id,
            payload.session_name,
            payload.session_date,
            session_time,
            payload.duration,
            payload.session_type,
            payload.session_notes,
            db.json_param(payload.exercises or []),
            payload.status or "Scheduled",
        ),
    )

    return {"id": session_id}


@router.patch("/{session_id}")
def update_training_session(session_id: int, payload: TrainingSessionUpdate):
    existing = db.fetch_one("SELECT id FROM training_sessions WHERE id = %s", (session_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Training session not found")

    allowed = {
        "athlete_id": ("athlete_id", payload.athlete_id),
        "session_name": ("session_name", payload.session_name),
        "session_date": ("session_date", payload.session_date),
        "session_time": ("session_time", _parse_time(payload.session_time) if payload.session_time else None),
        "duration": ("duration", payload.duration),
        "session_type": ("session_type", payload.session_type),
        "session_notes": ("session_notes", payload.session_notes),
        "status": ("status", payload.status),
        "exercises": ("exercises", db.json_param(payload.exercises) if payload.exercises is not None else None),
        "completed_data": (
            "completed_data",
            db.json_param(payload.completed_data) if payload.completed_data is not None else None,
        ),
        "completed_at": ("completed_at", payload.completed_at),
    }

    set_clauses: list[str] = []
    params: list[Any] = []

    for _, (col, value) in allowed.items():
        if value is None:
            continue
        set_clauses.append(f"{col} = %s")
        params.append(value)

    if not set_clauses:
        return {"updated": False}

    params.append(session_id)
    db.execute(f"UPDATE training_sessions SET {', '.join(set_clauses)} WHERE id = %s", tuple(params))
    return {"updated": True}


@router.post("/{session_id}/complete")
def complete_training_session(session_id: int, completed_data: dict[str, Any]):
    existing = db.fetch_one("SELECT id FROM training_sessions WHERE id = %s", (session_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Training session not found")

    now = datetime.utcnow()
    db.execute(
        """
        UPDATE training_sessions
        SET status = 'Completed', completed_data = %s, completed_at = %s
        WHERE id = %s
        """,
        (db.json_param(completed_data), now, session_id),
    )
    return {"updated": True}


@router.delete("/{session_id}")
def delete_training_session(session_id: int):
    existing = db.fetch_one("SELECT id FROM training_sessions WHERE id = %s", (session_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Training session not found")
    db.execute("DELETE FROM training_sessions WHERE id = %s", (session_id,))
    return {"deleted": True}
