from pydantic import BaseModel

class DashboardKPIResponse(BaseModel):
    totalDrivers: int
    get_fuel_cost_savings_percentage: float 