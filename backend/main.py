from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from dotenv import load_dotenv
from controllers.TripController import TripController
from controllers.NavigationController import NavigationController
from controllers.AIController import AIController

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

trip_controller = TripController(API_KEY, GHG_DATA)
navigation_controller = NavigationController()
ai_controller = AIController()


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

# AI ENDPOINTS

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
        "trip_metadata": {
            "city": "Riyadh",
            "vehicleType": "Light-Duty Trucks",
            "fuelType": "Diesel",
            ...
        }
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

        print(f"\n{'='*70}")
        print(f"AI ANALYSIS REQUEST")
        print(f"{'='*70}")
        print(f"Received {len(routes)} routes")
        print(f"Trip metadata: {trip_metadata}")

        if not routes:
            raise HTTPException(status_code=400, detail="No routes provided")

        # Format routes for AI
        formatted_routes = []
        errors = []
        
        for i, route in enumerate(routes):
            try:
                print(f"\n--- Processing Route {i+1} ---")
                print(f"Route summary: {route.get('summary', 'Unknown')}")
                print(f"Route distance: {route.get('distance', 'Unknown')}")
                print(f"Route duration: {route.get('duration', 'Unknown')}")
                
                formatted = ai_controller.format_route_for_ai(route, trip_metadata)
                formatted_routes.append(formatted)
                print(f"✓ Successfully formatted route {i+1}")
                
            except Exception as e:
                error_msg = f"Route {i+1}: {str(e)}"
                errors.append(error_msg)
                print(f"✗ {error_msg}")
                continue

        if not formatted_routes:
            error_detail = "Could not format any routes for AI analysis. Errors: " + "; ".join(errors)
            print(f"\n✗ FAILED: {error_detail}\n")
            raise HTTPException(status_code=400, detail=error_detail)

        print(f"\n✓ Successfully formatted {len(formatted_routes)} routes")
        print(f"--- Running AI Analysis ---")

        # Get AI recommendations
        analysis = ai_controller.compare_and_recommend(formatted_routes)

        print(f"✓ AI Analysis Complete")
        print(f"  Best route: {analysis['best_route']['route_name']}")
        print(f"  Savings: {analysis['co2e_saving_kg']:.2f} kg CO2e")
        print(f"{'='*70}\n")

        return {
            "status": "success",
            "analysis": analysis
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"\n✗ ERROR in /ai/analyze_routes: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

@app.get("/")
def root():
    return {
        "message": "GreenMile Backend Running Successfully 🚀",
        "ai_enabled": ai_controller.is_ready(),
        "endpoints": {
            "trip": "/process_trip",
            "navigation_init": "/navigation/init_route",
            "navigation_update": "/navigation/location_update",
            "ai_health": "/ai/health",
            "ai_analyze": "/ai/analyze_routes"
        }
    }