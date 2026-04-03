from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.dashboard import DashboardKPIResponse
from utils.dashboard_service import (
    get_fuel_cost_savings_percentage,
    get_total_drivers,

)
router = APIRouter()

@router.get("/dashboard/{company_id}")
def get_dashboard(company_id: int, db: Session = Depends(get_db)):
    return {
        "totalDrivers": get_total_drivers(company_id, db),
        "get_fuel_cost_savings_percentage": get_fuel_cost_savings_percentage(company_id, db),
    }