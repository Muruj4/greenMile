from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from dotenv import load_dotenv

from controllers.TripController import TripController

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GOOGLE_DIRECTIONS_KEY")
# Load GHG factors JSON
GHG_DATA_PATH = "models/ghg_factors.json"
with open(GHG_DATA_PATH, "r", encoding="utf-8") as file:
    GHG_DATA = json.load(file)
# Initialize FastAPI
app = FastAPI(debug=True)
# Allow frontend access 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


trip_controller = TripController(API_KEY, GHG_DATA)


@app.post("/process_trip")
def process_trip(payload: dict):
    try:
        origin = payload.get("origin")
        destination = payload.get("destination")
        city = payload.get("city")
        vehicleType = payload.get("vehicleType")
        fuelType = payload.get("fuelType")
        modelYear = payload.get("modelYear")

        return trip_controller.process_trip(
            origin=origin,
            destination=destination,
            city=city,
            vehicleType=vehicleType,
            fuelType=fuelType,
            modelYear=modelYear
        )

    except Exception as e:
        return {"error": "Server error", "details": str(e)}


# ====== ✅ ENDPOINTS الخاصة بالملاحة Navigation ======

@app.post("/navigation/init_route")
def init_route(payload: dict):
    """يستقبل coords + duration_text من الفرونت إند أو من /process_trip"""
    try:
        coords = payload.get("coords", [])          # [{latitude, longitude}, ...]
        duration_text = payload.get("duration_text", "")  # "32 mins"
        return navigation_controller.init_route(coords, duration_text)
    except Exception as e:
        return {"error": "Server error", "details": str(e)}


@app.post("/navigation/location_update")
def location_update(payload: dict):
    """يستقبل location الحالية + heading + السرعة ويعيد remainingKm + ETA"""
    try:
        location = payload.get("location")  # {latitude, longitude}
        heading = payload.get("heading", 0)
        speed_kmh = payload.get("speed_kmh", 0)
        return navigation_controller.location_update(location, heading, speed_kmh)
    except Exception as e:
        return {"error": "Server error", "details": str(e)}
