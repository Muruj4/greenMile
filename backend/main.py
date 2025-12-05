# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from dotenv import load_dotenv


from controllers.TripController import TripController
from controllers.NavigationController import NavigationController


load_dotenv()
API_KEY = os.getenv("GOOGLE_DIRECTIONS_KEY")

GHG_DATA_PATH = "models/ghg_factors.json"
with open(GHG_DATA_PATH, "r", encoding="utf-8") as file:
    GHG_DATA = json.load(file)

app = FastAPI(debug=True)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


trip_controller = TripController(API_KEY, GHG_DATA)
navigation_controller = NavigationController()


@app.post("/process_trip")
def process_trip(payload: dict):
    """
    This endpoint receives trip info from TripScreen,
    calculates routes + emissions via Google Directions API + GHG model.
    """
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
            modelYear=modelYear,
        )

    except Exception as e:
        return {
            "error": "Server error inside /process_trip",
            "details": str(e),
        }


@app.post("/navigation/init_route")
def init_route(payload: dict):
    """
    Called from RoutesScreen before entering NavigationScreen.
    This initializes the Navigation Model (Python) with:
    - route coordinates
    - duration_text (from Google)
    """
    try:
        coords = payload.get("coords")
        duration_text = payload.get("duration_text")

        return navigation_controller.init_route(coords, duration_text)

    except Exception as e:
        return {
            "error": "Server error inside /navigation/init_route",
            "details": str(e),
        }


@app.post("/navigation/location_update")
def location_update(payload: dict):
    """
    Called every 1–2s from NavigationScreen when driver location updates.
    Backend computes:
    - snapped location
    - remaining distance
    - ETA
    - speed
    """
    try:
        location = payload.get("location")     
        heading = payload.get("heading")      
        speed_kmh = payload.get("speed_kmh") 

        return navigation_controller.location_update(location, heading, speed_kmh)

    except Exception as e:
        return {
            "error": "Server error inside /navigation/location_update",
            "details": str(e),
        }


@app.get("/")
def root():
    return {"message": "GreenMile Backend Running Successfully 🚀"}
