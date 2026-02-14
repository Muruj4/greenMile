import os
import sys
from typing import List, Dict, Any
from datetime import datetime


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.ai_models.recommendation_engine import GreenMileRecommendationEngine

# Controller to handle AI predictions and recommendations.
class AIController:
 
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        models_dir = os.path.join(base_dir, "models", "ai_models", "trained_models")
        
        try:
            self.engine = GreenMileRecommendationEngine(
                regression_model_path=os.path.join(models_dir, "regression_model.pkl"),
                classification_model_path=os.path.join(models_dir, "classification_model.pkl"),
                encoders_path=os.path.join(models_dir, "label_encoders.pkl"),
                thresholds_path=os.path.join(models_dir, "category_thresholds.pkl")
            )
            print("✓ AI models loaded successfully")
        except Exception as e:
            print(f"✗ Failed to load AI models: {e}")
            self.engine = None
    
    # Check if AI models are loaded
    def is_ready(self) -> bool:
        
        return self.engine is not None
    
    def format_route_for_ai(self, 
                           route_info: Dict[str, Any],
                           trip_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert route format to AI model format.
        
        Args:
            route_info: Route data from your system (summary, distance, duration, etc.)
            trip_metadata: Trip info (vehicle, fuel, city, etc.)
            
        Returns:
            Dictionary formatted for AI model
        """
        now = datetime.now()
        
        try:
            # Extract distance in km
            distance_text = str(route_info.get("distance", "0 km"))
            distance_km = float(distance_text.replace("km", "").replace(",", "").strip())
            
            # Extract duration and calculate speed
            duration_text = str(route_info.get("duration", "0 mins"))
            duration_mins = self._parse_duration(duration_text)
            
            if duration_mins > 0:
                speed = (distance_km / (duration_mins / 60))
                speed = min(speed, 120.0)
            else:
                speed = 50.0
            
            # Get traffic info
            traffic_index = float(route_info.get("trafficIndex", 20.0))
            jams_count = int(route_info.get("jamsCount", 0))
            
            # Map traffic conditions
            traffic_map = {
                "light": "Light",
                "moderate": "Moderate",
                "heavy": "Heavy",
                "severe": "Heavy"
            }
            
            traffic_condition_raw = route_info.get("trafficConditions", "moderate")
            if isinstance(traffic_condition_raw, str):
                traffic_condition = traffic_map.get(traffic_condition_raw.lower(), "Moderate")
            else:
                traffic_condition = "Moderate"
            
            # Determine road type
            road_type = self._determine_road_type(route_info)
            
            # Build formatted route
            formatted = {
                "name": str(route_info.get("summary", "Route")),
                "Distance_km": distance_km,
                "Speed": speed,
                "TrafficIndexLive": traffic_index,
                "JamsCount": jams_count,
                "Hour": now.hour,
                "DayOfWeek": now.weekday(),
                "Month": now.month,
                "IsWeekend": 1 if now.weekday() >= 5 else 0,
                "IsPeakHour": 1 if now.hour in [7, 8, 9, 17, 18, 19] else 0,
                "Temperature": float(trip_metadata.get("temperature", 28.0)),
                "Humidity": float(trip_metadata.get("humidity", 40.0)),
                "Wind Speed": float(trip_metadata.get("windSpeed", 10.0)),
                "Vehicle Type": str(trip_metadata.get("vehicleType", "Light-Duty Trucks")),
                "Fuel Type": str(trip_metadata.get("fuelType", "Diesel")),
                "Road Type": road_type,
                "Traffic Conditions": traffic_condition,
                "City": str(trip_metadata.get("city", "Riyadh"))
            }
            
            print(f"✓ Formatted route: {formatted['name']}")
            return formatted
            
        except Exception as e:
            print(f"✗ Error formatting route: {e}")
            print(f"  Route data: {route_info}")
            raise Exception(f"Failed to format route: {str(e)}")
    
    def _parse_duration(self, duration_text: str) -> float:
        try:
            duration_text = str(duration_text).lower()
            total_mins = 0.0
            
            if "hour" in duration_text:
                hours_part = duration_text.split("hour")[0].strip()
                hours_str = ''.join(filter(str.isdigit, hours_part))
                if hours_str:
                    hours = int(hours_str)
                    total_mins += hours * 60
                
                remaining = duration_text.split("hour")[1] if len(duration_text.split("hour")) > 1 else ""
                if "min" in remaining:
                    mins_str = ''.join(filter(str.isdigit, remaining))
                    if mins_str:
                        total_mins += int(mins_str)
            
            elif "min" in duration_text:
                mins_str = ''.join(filter(str.isdigit, duration_text))
                if mins_str:
                    total_mins = int(mins_str)
            
            return float(total_mins) if total_mins > 0 else 30.0
            
        except Exception as e:
            print(f"Warning: Could not parse duration '{duration_text}': {e}")
            return 30.0
    
    def _determine_road_type(self, route_info: Dict[str, Any]) -> str:
        """Determine road type from route info"""
        try:
            summary = str(route_info.get("summary", "")).lower()
            
            if any(word in summary for word in ["highway", "freeway", "طريق سريع", "طريق"]):
                return "Highway"
            elif any(word in summary for word in ["rural", "countryside", "ريفي"]):
                return "Rural"
            else:
                return "Urban"
        except:
            return "Urban"
    
    def predict_single_route(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
      
        if not self.engine:
            raise Exception("AI models not loaded")
        
        return self.engine.predict_single_route(route_data)
    
    def compare_and_recommend(self, routes_list: List[Dict[str, Any]]) -> Dict[str, Any]:

        if not self.engine:
            raise Exception("AI models not loaded")
        
        if not routes_list:
            raise ValueError("No routes provided")
        
        return self.engine.compare_routes(routes_list)