from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import Json, RealDictCursor, register_default_json, register_default_jsonb

from backend.settings import settings


@contextmanager
def get_conn() -> Iterator[psycopg2.extensions.connection]:
    conn = psycopg2.connect(settings.database_url)
    try:
        register_default_json(conn, loads=json.loads)
        register_default_jsonb(conn, loads=json.loads)
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


def fetch_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute_returning_id(sql: str, params: tuple[Any, ...]) -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            new_id = cur.fetchone()[0]
            return int(new_id)


def execute(sql: str, params: tuple[Any, ...] = ()) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)


def json_param(value: Any) -> Json:
    return Json(value)
