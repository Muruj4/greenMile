from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import datetime, timedelta
from typing import Optional
from db.session import get_db
from utils.auth_dep import get_current_user
from models.trip_db import TripDB

router = APIRouter()


@router.get("/trips/my-trips")
def get_my_trips(
    color:        Optional[str] = Query(None, description="green / orange / red"),
    city:         Optional[str] = Query(None, description="Filter by city"),
    vehicle_type: Optional[str] = Query(None, description="Filter by vehicle type"),
    fuel_type:    Optional[str] = Query(None, description="Petrol / Diesel"),
    date_range:   Optional[str] = Query(None, description="week / month / all"),
    db:           Session       = Depends(get_db),
    user:         dict          = Depends(get_current_user),
):
    company_id = user["company_id"]

    query = db.query(TripDB).filter(TripDB.company_id == company_id)

    if color:
        query = query.filter(TripDB.color == color.lower().strip())

    if city:
        query = query.filter(TripDB.city == city.strip())

    if vehicle_type:
        query = query.filter(TripDB.vehicle_type == vehicle_type.strip())

    if fuel_type:
        query = query.filter(TripDB.fuel_type == fuel_type.strip())

    if date_range == "week":
        since = datetime.utcnow() - timedelta(days=7)
        query = query.filter(TripDB.created_at >= since)
    elif date_range == "month":
        now = datetime.utcnow()
        query = query.filter(
            extract("month", TripDB.created_at) == now.month,
            extract("year",  TripDB.created_at) == now.year,
        )

    trips = query.order_by(TripDB.created_at.desc()).all()

    result = []
    for trip in trips:
        result.append({
            "id":            trip.id,
            "origin":        trip.origin,
            "destination":   trip.destination,
            "city":          trip.city,
            "vehicle_type":  trip.vehicle_type,
            "fuel_type":     trip.fuel_type,
            "model_year":    trip.model_year,
            "route_summary": trip.route_summary,
            "distance_km":   trip.distance_km,
            "duration_min":  trip.duration_min,
            "color":         trip.color,
            "co2":           trip.co2,
            "ch4":           trip.ch4,
            "n2o":           trip.n2o,
            "co2e":          trip.co2e,
            "created_at":    trip.created_at.isoformat() if trip.created_at else None,
            "saved_by_role": trip.saved_by_role,
            "driver_id":     trip.driver_id,
        })

    return {
        "total": len(result),
        "trips": result,
    }


@router.get("/trips/my-trips/filters")
def get_filter_options(
    db:   Session = Depends(get_db),
    user: dict    = Depends(get_current_user),
):
    company_id = user["company_id"]

    trips = db.query(TripDB).filter(TripDB.company_id == company_id).all()

    cities        = sorted(set(t.city         for t in trips if t.city))
    vehicle_types = sorted(set(t.vehicle_type for t in trips if t.vehicle_type))
    fuel_types    = sorted(set(t.fuel_type    for t in trips if t.fuel_type))
    colors        = sorted(set(t.color        for t in trips if t.color))

    return {
        "cities":        cities,
        "vehicle_types": vehicle_types,
        "fuel_types":    fuel_types,
        "colors":        colors,
    }