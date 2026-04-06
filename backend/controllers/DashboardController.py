from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from schemas.dashboard import DashboardKPIResponse
from utils.dashboard_service import (
    get_fuel_cost_savings_percentage,
    get_total_drivers,
    get_total_trips,
    get_total_vehicles,
    get_total_co2e_current_month,
    get_route_distribution_current_month,
    get_emissions_breakdown_current_month,
)

router = APIRouter()


@router.get("/dashboard/{company_id}", response_model=DashboardKPIResponse)
def get_dashboard(company_id: int, db: Session = Depends(get_db)):
    return {
        "totalDrivers": get_total_drivers(company_id, db),
        "get_fuel_cost_savings_percentage": get_fuel_cost_savings_percentage(company_id, db),

        "totalTrips": get_total_trips(company_id, db),
        "totalVehicles": get_total_vehicles(company_id, db),
        "totalCO2e": get_total_co2e_current_month(company_id, db),
        "routeDistribution": get_route_distribution_current_month(company_id, db),
        "emissionsBreakdown": get_emissions_breakdown_current_month(company_id, db),
    }