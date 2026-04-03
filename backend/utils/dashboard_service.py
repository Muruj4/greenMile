from sqlalchemy.orm import Session
from models.trip_db import TripDB as Trip
import json



def get_total_drivers(company_id: int, db: Session):
    return (
        db.query(Trip.driver_id)
        .filter(Trip.company_id == company_id, Trip.driver_id.isnot(None))
        .distinct()
        .count()
    )

def get_fuel_cost_savings_percentage(company_id: int, db: Session):
    trips = db.query(Trip)\
        .filter(Trip.company_id == company_id)\
        .all()

    total_red_cost = 0
    total_savings = 0

    fuel_price = 2.18  

    for trip in trips:
        if not trip.routes_json:
            continue

        routes = trip.routes_json.get("routes", [])

        green = next((r for r in routes if r.get("color") == "green"), None)
        red = next((r for r in routes if r.get("color") == "red"), None)

        if green and red:
            green_fuel = green.get("fuel_used_liters", 0)
            red_fuel = red.get("fuel_used_liters", 0)

            red_cost = red_fuel * fuel_price
            green_cost = green_fuel * fuel_price

            total_red_cost += red_cost
            total_savings += (red_cost - green_cost)

    if total_red_cost == 0:
        return 0

    return round((total_savings / total_red_cost) * 100, 2)