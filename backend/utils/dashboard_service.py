
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from datetime import datetime
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

def get_total_trips(company_id: int, db: Session):
    return (
        db.query(Trip)
        .filter(Trip.company_id == company_id)
        .count()
    )

def get_total_vehicles(company_id: int, db: Session):
    """
    ترجع عدد أنواع المركبات المختلفة المستخدمة في الشركة.
    تعتمد على vehicle_type مع distinct.
    ليست شهرية.
    """
    return (
        db.query(Trip.vehicle_type)
        .filter(
            Trip.company_id == company_id,
            Trip.vehicle_type.isnot(None)
        )
        .distinct()
        .count()
    )


def get_total_co2e_current_month(company_id: int, db: Session):
    """
    ترجع إجمالي CO2e للشركة في الشهر الحالي فقط.
    تعتمد على:
    - company_id
    - created_at
    - co2e
    """
    now = datetime.now()

    total = (
        db.query(func.coalesce(func.sum(Trip.co2e), 0))
        .filter(
            Trip.company_id == company_id,
            extract("month", Trip.created_at) == now.month,
            extract("year", Trip.created_at) == now.year
        )
        .scalar()
    )

    return round(float(total), 2)

def get_route_distribution_current_month(company_id: int, db: Session):
    """
    ترجع توزيع الرحلات حسب اللون في الشهر الحالي:
    green / orange / red

    تعتمد على:
    - company_id
    - created_at
    - color
    """
    now = datetime.now()

    trips = (
        db.query(Trip.color)
        .filter(
            Trip.company_id == company_id,
            extract("month", Trip.created_at) == now.month,
            extract("year", Trip.created_at) == now.year,
            Trip.color.isnot(None)
        )
        .all()
    )

    distribution = {
        "green": 0,
        "orange": 0,
        "red": 0
    }

    for (color,) in trips:
        color = str(color).strip().lower()

        if color == "green":
            distribution["green"] += 1
        elif color in ["orange", "yellow"]:
            distribution["orange"] += 1
        elif color == "red":
            distribution["red"] += 1

    return distribution


def get_emissions_breakdown_current_month(company_id: int, db: Session):
    """
    ترجع مجموع الغازات للشركة في الشهر الحالي:
    CO2 / CH4 / N2O

    تعتمد على:
    - company_id
    - created_at
    - co2
    - ch4
    - n2o
    """
    now = datetime.now()

    result = (
        db.query(
            func.coalesce(func.sum(Trip.co2), 0),
            func.coalesce(func.sum(Trip.ch4), 0),
            func.coalesce(func.sum(Trip.n2o), 0),
        )
        .filter(
            Trip.company_id == company_id,
            extract("month", Trip.created_at) == now.month,
            extract("year", Trip.created_at) == now.year
        )
        .first()
    )

    total_co2, total_ch4, total_n2o = result

    return {
        "co2": round(float(total_co2), 2),
        "ch4": round(float(total_ch4), 4),
        "n2o": round(float(total_n2o), 4),
    }


