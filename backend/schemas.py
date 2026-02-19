from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AthleteCreate(BaseModel):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    weight: float | None = None
    height: float | None = None
    fitness_level: str | None = None
    goals: list[str] | None = None
    medical_conditions: str | None = None
    notes: str | None = None

    # Billing plan
    plan_type: str | None = None  # 'monthly' | 'on_demand'
    plan_sessions_per_week: int | None = None
    plan_monthly_price: float | None = None
    plan_on_demand_price: float | None = None


class AthleteUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    weight: float | None = None
    height: float | None = None
    fitness_level: str | None = None
    goals: list[str] | None = None
    medical_conditions: str | None = None
    notes: str | None = None

    # Billing plan
    plan_type: str | None = None
    plan_sessions_per_week: int | None = None
    plan_monthly_price: float | None = None
    plan_on_demand_price: float | None = None


class Athlete(AthleteCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None


class ExerciseCreate(BaseModel):
    name: str
    category: str | None = None
    muscle_groups: str | None = None
    equipment: str | None = None
    difficulty: str | None = None
    exercise_type: str | None = None
    sets_range: str | None = None
    reps_range: str | None = None
    description: str | None = None
    instructions: str | None = None
    tips: str | None = None
    video_url: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    muscle_groups: str | None = None
    equipment: str | None = None
    difficulty: str | None = None
    exercise_type: str | None = None
    sets_range: str | None = None
    reps_range: str | None = None
    description: str | None = None
    instructions: str | None = None
    tips: str | None = None
    video_url: str | None = None


class Exercise(ExerciseCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None


class TrainingSessionCreate(BaseModel):
    athlete_id: int
    session_name: str
    session_date: date
    session_time: str  # HH:MM or HH:MM:SS
    duration: int | None = None
    session_type: str | None = None
    session_notes: str | None = None
    status: str | None = "Scheduled"
    exercises: list[dict[str, Any]] | None = None


class TrainingSessionUpdate(BaseModel):
    athlete_id: int | None = None
    session_name: str | None = None
    session_date: date | None = None
    session_time: str | None = None
    duration: int | None = None
    session_type: str | None = None
    session_notes: str | None = None
    status: str | None = None
    exercises: list[dict[str, Any]] | None = None
    completed_data: dict[str, Any] | None = None
    completed_at: datetime | None = None


class TrainingSession(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    athlete_id: int
    session_name: str
    session_date: date
    session_time: str
    duration: int | None = None
    session_type: str | None = None
    session_notes: str | None = None
    status: str | None = None
    exercises: list[dict[str, Any]] | None = None
    completed_data: dict[str, Any] | None = None
    completed_at: datetime | None = None
    created_date: date | None = None

    athlete_first_name: str | None = None
    athlete_last_name: str | None = None


class EvaluationCreate(BaseModel):
    athlete_id: int
    evaluation_date: date
    weight: float | None = None
    muscle_percentage: float | None = None
    fat_percentage: float | None = None
    bone_percentage: float | None = None
    water_percentage: float | None = None
    notes: str | None = None


class EvaluationUpdate(BaseModel):
    athlete_id: int | None = None
    evaluation_date: date | None = None
    weight: float | None = None
    muscle_percentage: float | None = None
    fat_percentage: float | None = None
    bone_percentage: float | None = None
    water_percentage: float | None = None
    notes: str | None = None


class Evaluation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    athlete_id: int
    evaluation_date: date
    weight: float | None = None
    muscle_percentage: float | None = None
    fat_percentage: float | None = None
    bone_percentage: float | None = None
    water_percentage: float | None = None
    notes: str | None = None
    created_date: date | None = None

    athlete_first_name: str | None = None
    athlete_last_name: str | None = None


class ApiError(BaseModel):
    detail: str
    extra: dict[str, Any] | None = None


class IdResponse(BaseModel):
    id: int = Field(..., ge=1)


class PaymentAdjustmentCreate(BaseModel):
    athlete_id: int = Field(..., ge=1)
    applies_month: date
    amount: float
    reason: str | None = None
    related_session_id: int | None = Field(default=None, ge=1)


class PaymentAdjustment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    athlete_id: int
    applies_month: date
    amount: float
    reason: str | None = None
    related_session_id: int | None = None
    created_at: datetime | None = None


class PaymentMarkPaid(BaseModel):
    athlete_id: int = Field(..., ge=1)
    month: date
    paid_amount: float | None = None


class PaymentSummary(BaseModel):
    athlete_id: int
    athlete_first_name: str | None = None
    athlete_last_name: str | None = None

    plan_type: str | None = None
    plan_sessions_per_week: int | None = None
    plan_monthly_price: float | None = None
    plan_on_demand_price: float | None = None

    base_amount: float
    adjustments_total: float
    total_due: float

    status: str | None = None
    paid_amount: float | None = None
    paid_at: datetime | None = None
