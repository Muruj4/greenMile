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
app = FastAPI()

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
