# backend/schemas/ai_schemas.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AIRouteInput(BaseModel):
    """Schema for route data sent to AI"""
    routes: List[Dict[str, Any]]
    trip_metadata: Dict[str, Any]

class AIRecommendationResponse(BaseModel):
    """Schema for AI recommendations response"""
    best_route: Dict[str, Any]
    worst_route: Dict[str, Any]
    all_routes: List[Dict[str, Any]]
    co2e_saving_kg: float
    co2e_saving_percent: float
    reasons: List[str]
    recommendations: List[str]
    generated_at: str