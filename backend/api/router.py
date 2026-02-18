from __future__ import annotations

from fastapi import APIRouter

from backend.api.routes.athletes import router as athletes_router
from backend.api.routes.exercises import router as exercises_router
from backend.api.routes.evaluations import router as evaluations_router
from backend.api.routes.health import router as health_router
from backend.api.routes.payments import router as payments_router
from backend.api.routes.training_sessions import router as training_sessions_router


api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(athletes_router, prefix="/athletes", tags=["athletes"])
api_router.include_router(exercises_router, prefix="/exercises", tags=["exercises"])
api_router.include_router(training_sessions_router, prefix="/training-sessions", tags=["training-sessions"])
api_router.include_router(evaluations_router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])
