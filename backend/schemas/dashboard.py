from pydantic import BaseModel
from typing import Dict


class DashboardKPIResponse(BaseModel):
    totalDrivers: int
    get_fuel_cost_savings_percentage: float

    totalTrips: int
    totalVehicles: int
    totalCO2e: float
    routeDistribution: Dict[str, int]
    emissionsBreakdown: Dict[str, float]