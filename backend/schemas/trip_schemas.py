from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SaveSelectedTrip(BaseModel):
    # trip meta
    origin: str
    destination: str
    city: str
    vehicleType: str
    fuelType: str
    modelYear: int

    # selected route data 
    route: Dict[str, Any]