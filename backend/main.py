from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import json
import os

from controllers.TripController import TripController
from controllers.NavigationController import NavigationController
from controllers.AIController import AIController
from controllers.AuthController import AuthController


from utils.auth_dep import get_current_user
from db.session import get_db
from models.trip_db import TripDB
from schemas.auth_schemas import ManagerSignUp, DriverSignUp, SignIn

load_dotenv()

API_KEY = os.getenv("GOOGLE_DIRECTIONS_KEY")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GHG_DATA_PATH = os.path.join(BASE_DIR, "models", "ghg_factors.json")

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

# Controllers
trip_controller = TripController(API_KEY, GHG_DATA)
navigation_controller = NavigationController()
ai_controller = AIController()
auth_controller = AuthController()

# =========================
# AUTH ENDPOINTS
# =========================

@app.post("/auth/manager/signup")
def manager_signup(payload: ManagerSignUp, db: Session = Depends(get_db)):
    try:
        token = auth_controller.manager_signup(
            db, payload.name, payload.company, payload.email, payload.password
        )
        return {"token": token, "role": "manager"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/driver/signup")
def driver_signup(payload: DriverSignUp, db: Session = Depends(get_db)):
    try:
        token = auth_controller.driver_signup(
            db, payload.name, payload.company, payload.email, payload.password
        )
        return {"token": token, "role": "driver"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/signin")
def signin(payload: SignIn, db: Session = Depends(get_db)):
    try:
        token, role = auth_controller.signin(db, payload.email, payload.password)
        return {"token": token, "role": role}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# =========================
# TRIP ENDPOINTS
# =========================

@app.post("/process_trip")
def process_trip(payload: dict):
    """
    Receives trip info from TripScreen,
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
    

# =========================
# NAVIGATION ENDPOINTS
# =========================

@app.post("/navigation/init_route")
def init_route(payload: dict):
    try:
        coords = payload.get("coords")
        duration_text = payload.get("duration_text")
        route_data = navigation_controller.init_route(coords, duration_text)
        return {
            "status": "ok",
            "route": route_data
        }
    except Exception as e:
        return {
            "status": "error",
            "error": "Server error inside /navigation/init_route",
            "details": str(e),
        }


@app.post("/navigation/location_update")
def location_update(payload: dict):
    """
    Called every 1–2s from NavigationScreen when driver location updates.
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

# =========================
# AI ENDPOINTS
# =========================

@app.get("/ai/health")
def ai_health_check():
    """Check if AI models are loaded and ready"""
    return {
        "status": "healthy" if ai_controller.is_ready() else "unhealthy",
        "models_loaded": ai_controller.is_ready(),
        "message": "AI models ready" if ai_controller.is_ready() else "AI models not loaded"
    }


@app.post("/ai/analyze_routes")
def analyze_routes(payload: dict):
    """
    Analyze routes with AI and get recommendations.
    Expected payload:
    {
        "routes": [...],
        "trip_metadata": {...}
    }
    """
    try:
        if not ai_controller.is_ready():
            raise HTTPException(
                status_code=503,
                detail="AI models not loaded. Check server logs."
            )

        routes = payload.get("routes", [])
        trip_metadata = payload.get("trip_metadata", {})

        if not routes:
            raise HTTPException(status_code=400, detail="No routes provided")

        # Format routes for AI
        formatted_routes = []
        errors = []

        for i, route in enumerate(routes):
            try:
                formatted = ai_controller.format_route_for_ai(route, trip_metadata)
                formatted_routes.append(formatted)
            except Exception as e:
                errors.append(f"Route {i+1}: {str(e)}")
                continue

        if not formatted_routes:
            raise HTTPException(
                status_code=400,
                detail="Could not format any routes for AI analysis. Errors: " + "; ".join(errors)
            )

        analysis = ai_controller.compare_and_recommend(formatted_routes)

        return {
            "status": "success",
            "analysis": analysis
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

def parse_distance_km(distance_text: str) -> float:
    # examples: "12.3 km"
    try:
        return float(distance_text.replace("km", "").strip())
    except:
        return 0.0

def parse_duration_min(duration_text: str) -> int:
    # examples: "18 mins"
    t = duration_text.lower().replace("mins", "").replace("min", "").strip()
    try:
        return int(float(t))
    except:
        return 0

@app.post("/trips/save_selected")
def save_selected_trip(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        route = payload.get("route", {})
        emissions = route.get("emissions", {})

        trip = TripDB(
            saved_by_role=user["role"],
            saved_by_id=user["id"],
            company_id=user["company_id"],
            driver_id=user["id"] if user["role"] == "driver" else None,

            origin=payload["origin"],
            destination=payload["destination"],
            city=payload["city"],
            vehicle_type=payload["vehicleType"],
            fuel_type=payload["fuelType"],
            model_year=int(payload["modelYear"]),

            route_summary=route.get("summary", ""),
            distance_km=parse_distance_km(route.get("distance", "0")),
            duration_min=parse_duration_min(route.get("duration", "0")),
            coordinates=route.get("coordinates", []),

            co2=float(emissions.get("co2", 0)),
            ch4=float(emissions.get("ch4", 0)),
            n2o=float(emissions.get("n2o", 0)),
            co2e=float(emissions.get("co2e", 0)),

            color=route.get("color"),
        )

        db.add(trip)
        db.commit()
        db.refresh(trip)

        return {"status": "saved", "trip_id": trip.id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
# =========================
# ROOT
# =========================

@app.get("/")
def root():
    return {
        "message": "GreenMile Backend Running Successfully 🚀",
        "ai_enabled": ai_controller.is_ready(),
        "endpoints": {
            "auth_manager_signup": "/auth/manager/signup",
            "auth_driver_signup": "/auth/driver/signup",
            "auth_signin": "/auth/signin",
            "trip": "/process_trip",
            "navigation_init": "/navigation/init_route",
            "navigation_update": "/navigation/location_update",
            "ai_health": "/ai/health",
            "ai_analyze": "/ai/analyze_routes"
        }
    }