from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend import db
from backend.schemas import (
    IdResponse,
    PaymentAdjustment,
    PaymentAdjustmentCreate,
    PaymentMarkPaid,
    PaymentSummary,
)


router = APIRouter()


def _month_start(value: date) -> date:
    return date(value.year, value.month, 1)


def _prev_month_range(month: date) -> tuple[date, date]:
    start = _month_start(month)
    if start.month == 1:
        prev_start = date(start.year - 1, 12, 1)
    else:
        prev_start = date(start.year, start.month - 1, 1)

    if prev_start.month == 12:
        next_start = date(prev_start.year + 1, 1, 1)
    else:
        next_start = date(prev_start.year, prev_start.month + 1, 1)

    prev_end = next_start.fromordinal(next_start.toordinal() - 1)
    return prev_start, prev_end


def _dec(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _plan_base_amount(month: date, athlete_row: dict[str, Any]) -> Decimal:
    plan_type = (athlete_row.get("plan_type") or "monthly").strip().lower()

    if plan_type == "monthly":
        return _dec(athlete_row.get("plan_monthly_price"))

    # on_demand: base = completed sessions * per-session price
    if plan_type == "on_demand":
        per_session = _dec(athlete_row.get("plan_on_demand_price"))
        if per_session == 0:
            return Decimal("0")

        month_start = _month_start(month)
        if month_start.month == 12:
            next_month = date(month_start.year + 1, 1, 1)
        else:
            next_month = date(month_start.year, month_start.month + 1, 1)
        month_end = next_month.fromordinal(next_month.toordinal() - 1)

        row = db.fetch_one(
            """
            SELECT COUNT(*)::int AS cnt
            FROM training_sessions
            WHERE athlete_id = %s
              AND session_date BETWEEN %s AND %s
              AND status = 'Completed'
            """,
            (athlete_row["id"], month_start, month_end),
        )
        cnt = int(row["cnt"]) if row and row.get("cnt") is not None else 0
        return per_session * Decimal(cnt)

    return Decimal("0")


@router.get("", response_model=list[PaymentSummary])
def list_payments(month: date = Query(..., description="First day of the month (YYYY-MM-01)")):
    month = _month_start(month)

    athletes = db.fetch_all(
        """
        SELECT id, first_name, last_name,
               plan_type, plan_sessions_per_week, plan_monthly_price, plan_on_demand_price
        FROM athletes
        ORDER BY first_name, last_name
        """
    )

    # Preload adjustments totals for that month
    adj_rows = db.fetch_all(
        """
        SELECT athlete_id, COALESCE(SUM(amount), 0) AS total
        FROM payment_adjustments
        WHERE applies_month = %s
        GROUP BY athlete_id
        """,
        (month,),
    )
    adj_map = {int(r["athlete_id"]): _dec(r["total"]) for r in adj_rows}

    # Preload payments rows
    pay_rows = db.fetch_all(
        """
        SELECT athlete_id, status, paid_amount, paid_at
        FROM payments
        WHERE month = %s
        """,
        (month,),
    )
    pay_map = {int(r["athlete_id"]): r for r in pay_rows}

    out: list[PaymentSummary] = []
    for a in athletes:
        base = _plan_base_amount(month, {"id": a["id"], **a})
        adjustments = adj_map.get(int(a["id"]), Decimal("0"))
        total_due = base + adjustments

        p = pay_map.get(int(a["id"]))
        out.append(
            PaymentSummary(
                athlete_id=int(a["id"]),
                athlete_first_name=a.get("first_name"),
                athlete_last_name=a.get("last_name"),
                plan_type=a.get("plan_type"),
                plan_sessions_per_week=a.get("plan_sessions_per_week"),
                plan_monthly_price=float(a["plan_monthly_price"]) if a.get("plan_monthly_price") is not None else None,
                plan_on_demand_price=float(a["plan_on_demand_price"]) if a.get("plan_on_demand_price") is not None else None,
                base_amount=float(base),
                adjustments_total=float(adjustments),
                total_due=float(total_due),
                status=p.get("status") if p else None,
                paid_amount=float(p["paid_amount"]) if p and p.get("paid_amount") is not None else None,
                paid_at=p.get("paid_at") if p else None,
            )
        )

    return out


@router.get("/adjustments", response_model=list[PaymentAdjustment])
def list_adjustments(
    month: date = Query(..., description="First day of the month (YYYY-MM-01)"),
    athlete_id: int | None = Query(default=None, ge=1),
):
    month = _month_start(month)

    where = ["applies_month = %s"]
    params: list[Any] = [month]

    if athlete_id is not None:
        where.append("athlete_id = %s")
        params.append(athlete_id)

    return db.fetch_all(
        f"""
        SELECT *
        FROM payment_adjustments
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC, id DESC
        """,
        tuple(params),
    )


@router.post("/adjustments", response_model=IdResponse)
def create_adjustment(payload: PaymentAdjustmentCreate):
    new_id = db.execute_returning_id(
        """
        INSERT INTO payment_adjustments (athlete_id, applies_month, amount, reason, related_session_id)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            payload.athlete_id,
            _month_start(payload.applies_month),
            payload.amount,
            payload.reason,
            payload.related_session_id,
        ),
    )
    return {"id": new_id}


@router.delete("/adjustments/{adjustment_id}")
def delete_adjustment(adjustment_id: int):
    row = db.fetch_one("SELECT id FROM payment_adjustments WHERE id = %s", (adjustment_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    db.execute("DELETE FROM payment_adjustments WHERE id = %s", (adjustment_id,))
    return {"deleted": True}


@router.post("/mark-paid")
def mark_paid(payload: PaymentMarkPaid):
    month = _month_start(payload.month)

    # Ensure athlete exists
    row = db.fetch_one("SELECT id FROM athletes WHERE id = %s", (payload.athlete_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Athlete not found")

    paid_amount = payload.paid_amount

    existing = db.fetch_one("SELECT id FROM payments WHERE athlete_id = %s AND month = %s", (payload.athlete_id, month))
    if existing:
        db.execute(
            """
            UPDATE payments
            SET status = 'paid', paid_amount = %s, paid_at = NOW()
            WHERE athlete_id = %s AND month = %s
            """,
            (paid_amount, payload.athlete_id, month),
        )
    else:
        db.execute(
            """
            INSERT INTO payments (athlete_id, month, status, paid_amount, paid_at)
            VALUES (%s,%s,'paid',%s,NOW())
            """,
            (payload.athlete_id, month, paid_amount),
        )

    return {"updated": True}


@router.post("/auto-credit")
def auto_credit_from_cancelled(
    month: date = Query(..., description="Apply credits to this month (YYYY-MM-01)"),
    athlete_id: int | None = Query(default=None, ge=1),
):
    """Create credit adjustments for cancelled sessions in the previous month.

    Heuristic:
    - monthly plans: credit per cancelled session = monthly_price / (sessions_per_week * 4)
    - on_demand plans: credit per cancelled session = on_demand_price

    Only creates credits for cancelled sessions that don't already have an adjustment linked.
    """

    month = _month_start(month)
    prev_start, prev_end = _prev_month_range(month)

    where = ["ts.status = 'Cancelled'", "ts.session_date BETWEEN %s AND %s"]
    params: list[Any] = [prev_start, prev_end]

    if athlete_id is not None:
        where.append("ts.athlete_id = %s")
        params.append(athlete_id)

    sessions = db.fetch_all(
        f"""
        SELECT ts.id, ts.athlete_id
        FROM training_sessions ts
        WHERE {' AND '.join(where)}
        ORDER BY ts.session_date ASC
        """,
        tuple(params),
    )

    created = 0
    for s in sessions:
        # skip if already credited
        existing = db.fetch_one(
            """
            SELECT id FROM payment_adjustments
            WHERE related_session_id = %s
              AND applies_month = %s
            """,
            (s["id"], month),
        )
        if existing:
            continue

        a = db.fetch_one(
            """
            SELECT id, plan_type, plan_sessions_per_week, plan_monthly_price, plan_on_demand_price
            FROM athletes
            WHERE id = %s
            """,
            (s["athlete_id"],),
        )
        if not a:
            continue

        plan_type = (a.get("plan_type") or "monthly").strip().lower()
        amount = Decimal("0")

        if plan_type == "monthly":
            monthly_price = _dec(a.get("plan_monthly_price"))
            spw = a.get("plan_sessions_per_week")
            denom = Decimal(str(int(spw))) * Decimal("4") if spw else Decimal("0")
            if monthly_price != 0 and denom != 0:
                amount = -(monthly_price / denom)
        elif plan_type == "on_demand":
            per_session = _dec(a.get("plan_on_demand_price"))
            if per_session != 0:
                amount = -per_session

        if amount == 0:
            continue

        db.execute(
            """
            INSERT INTO payment_adjustments (athlete_id, applies_month, amount, reason, related_session_id)
            VALUES (%s,%s,%s,%s,%s)
            """,
            (s["athlete_id"], month, float(amount), "Crédito por sessão cancelada (mês anterior)", s["id"]),
        )
        created += 1

    return {"created": created}
