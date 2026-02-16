# recommendation_engine.py

import pandas as pd
import joblib
from datetime import datetime
from typing import Dict, List, Any, Tuple


class GreenMileRecommendationEngine:
    
    # Fuel consumption factors (kg CO2e per liter of fuel)
    FUEL_CO2_FACTORS = {
        "Diesel": 2.68,      # kg CO2e per liter
        "Gasoline": 2.31,    # kg CO2e per liter
        "CNG": 1.85,         # kg CO2e per liter equivalent
        "Electric": 0.0,     # No direct emissions
        "Hybrid": 1.50,      # Average between gas and electric
    }
    
    # Average fuel costs (SAR per liter) - Used internally only for backend calculations
    FUEL_COSTS_SAR = {
        "Diesel": 0.47,
        "Gasoline": 2.18,
        "CNG": 1.25,
        "Electric": 0.18,    # per kWh equivalent
        "Hybrid": 1.50,
    }

    def __init__(
        self,
        regression_model_path="regression_model.pkl",
        classification_model_path="classification_model.pkl",
        encoders_path="label_encoders.pkl",
        thresholds_path="category_thresholds.pkl",
    ):

        self.regression_model = joblib.load(regression_model_path)
        self.classification_model = joblib.load(classification_model_path)
        self.label_encoders = joblib.load(encoders_path)
        self.thresholds = joblib.load(thresholds_path)

        self.feature_columns = [
            "Distance_km", "Speed", "TrafficIndexLive", "JamsCount",
            "Hour", "DayOfWeek", "Month", "IsWeekend", "IsPeakHour",
            "Temperature", "Humidity", "Wind Speed",
            "Vehicle Type_encoded", "Fuel Type_encoded",
            "Road Type_encoded", "Traffic Conditions_encoded", "City_encoded"
        ]

        self.class_labels = list(self.classification_model.classes_)

    # -----------------------------
    # Fuel Calculations
    # -----------------------------
    def calculate_fuel_consumption(self, co2e_kg, fuel_type):
        """
        Calculate fuel consumption from CO2e emissions
        
        Args:
            co2e_kg: CO2e emissions in kilograms
            fuel_type: Type of fuel used
            
        Returns:
            dict with fuel_liters and fuel_cost
        """
        co2_factor = self.FUEL_CO2_FACTORS.get(fuel_type, 2.31)  # Default to Gasoline
        
        if co2_factor == 0:  # Electric vehicle
            return {
                "fuel_liters": 0.0,
                "fuel_cost_sar": 0.0,
                "fuel_unit": "kWh"
            }
        
        # Calculate liters of fuel
        fuel_liters = co2e_kg / co2_factor
        
        # Calculate cost
        fuel_cost = fuel_liters * self.FUEL_COSTS_SAR.get(fuel_type, 2.18)
        
        return {
            "fuel_liters": round(fuel_liters, 2),
            "fuel_cost_sar": round(fuel_cost, 2),
            "fuel_unit": "L"
        }

    # -----------------------------
    # Encoding
    # -----------------------------
    def _safe_encode(self, col_name, value):

        encoder = self.label_encoders.get(col_name)

        if encoder is None:
            return 0, f"Missing encoder for '{col_name}'"

        try:
            return int(encoder.transform([value])[0]), ""
        except:
            return 0, f"Unknown value '{value}' for {col_name}"

    # -----------------------------
    # Feature preparation
    # -----------------------------
    def prepare_trip_features(self, trip_data):

        warnings = []
        trip_encoded = dict(trip_data)

        categorical_cols = [
            "Vehicle Type",
            "Fuel Type",
            "Road Type",
            "Traffic Conditions",
            "City",
        ]

        for col in categorical_cols:

            if col in trip_encoded:

                encoded, warn = self._safe_encode(
                    col,
                    trip_encoded[col],
                )

                trip_encoded[f"{col}_encoded"] = encoded

                if warn:
                    warnings.append(warn)

        for f in self.feature_columns:

            if f not in trip_encoded:
                trip_encoded[f] = 0

        features_df = pd.DataFrame([trip_encoded])[self.feature_columns]

        return features_df, warnings

    # -----------------------------
    # Prediction
    # -----------------------------
    def predict_single_route(self, route_data):

        features, warnings = self.prepare_trip_features(route_data)

        predicted_co2 = float(
            self.regression_model.predict(features)[0]
        )

        predicted_category = str(
            self.classification_model.predict(features)[0]
        )

        proba = self.classification_model.predict_proba(features)[0]

        category_probs = {
            cls: float(p)
            for cls, p in zip(self.class_labels, proba)
        }
        
        # Calculate fuel consumption
        fuel_type = route_data.get("Fuel Type", "Gasoline")
        fuel_data = self.calculate_fuel_consumption(predicted_co2, fuel_type)

        return {

            "route_name": route_data.get("name", "Unknown Route"),

            "predicted_co2e_kg": round(predicted_co2, 4),

            "category": predicted_category,

            "probabilities": category_probs,
            
            "fuel_consumption": fuel_data,

            "meta": {

                "distance_km":
                    float(route_data.get("Distance_km", 0)),

                "traffic_conditions":
                    route_data.get(
                        "Traffic Conditions",
                        "Unknown",
                    ),

                "temperature":
                    float(route_data.get("Temperature", 0)),
                
                "fuel_type":
                    fuel_type,
            },

            "warnings": warnings,
        }

    # -----------------------------
    # Compare routes
    # -----------------------------
    def compare_routes(self, routes_list):

        predictions = [
            self.predict_single_route(r)
            for r in routes_list
        ]

        predictions_sorted = sorted(
            predictions,
            key=lambda x: x["predicted_co2e_kg"]
        )

        best = predictions_sorted[0]
        worst = predictions_sorted[-1]

        savings = (
            worst["predicted_co2e_kg"]
            - best["predicted_co2e_kg"]
        )

        savings_percent = (
            savings / worst["predicted_co2e_kg"] * 100
            if worst["predicted_co2e_kg"] > 0 else 0
        )
        
        # Calculate fuel savings
        fuel_saved_liters = (
            worst["fuel_consumption"]["fuel_liters"] - 
            best["fuel_consumption"]["fuel_liters"]
        )
        
        fuel_saved_percent = (
            (fuel_saved_liters / worst["fuel_consumption"]["fuel_liters"] * 100)
            if worst["fuel_consumption"]["fuel_liters"] > 0 else 0
        )
        
        cost_saved_sar = (
            worst["fuel_consumption"]["fuel_cost_sar"] - 
            best["fuel_consumption"]["fuel_cost_sar"]
        )

        reasons = self._build_reasons(best, worst, fuel_saved_liters)

        recommendations = self._generate_recommendations(
            best,
            worst,
            predictions_sorted,
            fuel_saved_liters,
        )

        return {

            "all_routes": predictions_sorted,

            "best_route": best,

            "worst_route": worst,

            "co2e_saving_kg": round(savings, 4),

            "co2e_saving_percent": round(
                savings_percent,
                2
            ),
            
            "fuel_saving_liters": round(fuel_saved_liters, 2),
            
            "fuel_saving_percent": round(fuel_saved_percent, 2),
            
            "cost_saving_sar": round(cost_saved_sar, 2),

            "reasons": reasons,

            "recommendations": recommendations,

            "generated_at":
                datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
        }

    # -----------------------------
    # Reasons
    # -----------------------------
    def _build_reasons(self, best, worst, fuel_saved):

        reasons = []

        reasons.append(
            f"Selected '{best['route_name']}' because it "
            f"has the lowest emissions "
            f"({best['predicted_co2e_kg']:.2f} kg CO₂e)."
        )

        diff = (
            worst["predicted_co2e_kg"]
            - best["predicted_co2e_kg"]
        )

        reasons.append(
            f"This reduces emissions by "
            f"{diff:.2f} kg compared to "
            f"'{worst['route_name']}'."
        )
        
        # Add fuel savings (no cost)
        if fuel_saved > 0:
            fuel_unit = best["fuel_consumption"]["fuel_unit"]
            fuel_percent = (fuel_saved / worst["fuel_consumption"]["fuel_liters"]) * 100 if worst["fuel_consumption"]["fuel_liters"] > 0 else 0
            reasons.append(
                f"You'll save {fuel_saved:.2f} {fuel_unit} of fuel "
                f"({fuel_percent:.1f}%)."
            )

        return reasons

    # -----------------------------
    # Recommendations
    # -----------------------------
    def _generate_recommendations(
        self,
        best,
        worst,
        all_routes,
        fuel_saved,
    ):

        recommendations = []

        best_temp = best["meta"]["temperature"]
        best_dist = best["meta"]["distance_km"]
        best_traffic = best["meta"]["traffic_conditions"]
        fuel_unit = best["fuel_consumption"]["fuel_unit"]

        # Main recommendation with fuel savings (no cost)
        if fuel_saved > 0:
            fuel_percent = (fuel_saved / worst["fuel_consumption"]["fuel_liters"]) * 100 if worst["fuel_consumption"]["fuel_liters"] > 0 else 0
            recommendations.append(
                f"Choose '{best['route_name']}' to save "
                f"{fuel_saved:.2f} {fuel_unit} of fuel "
                f"({fuel_percent:.1f}%) and reduce emissions by "
                f"{best['predicted_co2e_kg']:.2f} kg CO₂e."
            )
        else:
            recommendations.append(
                f"Choose '{best['route_name']}' "
                f"to minimize CO₂e emissions "
                f"({best['predicted_co2e_kg']:.2f} kg)."
            )

        if best_temp > 35:

            recommendations.append(
                "High temperature detected. "
                "Use cooler delivery hours to reduce fuel consumption."
            )

        if best_traffic in ["Heavy", "Severe"]:

            recommendations.append(
                "Heavy traffic detected. "
                "Consider off-peak hours to save fuel and time."
            )

        if best_dist > 30:

            recommendations.append(
                "Long distance trip. "
                "Maintain steady speed (80-90 km/h) for optimal fuel efficiency."
            )

        green_routes = [
            r for r in all_routes
            if r["category"] == "Green"
        ]

        if len(green_routes) > 1:

            recommendations.append(
                f"{len(green_routes)} eco-friendly routes available. "
                f"All provide excellent fuel efficiency."
            )
        
 
        return recommendations

    # -----------------------------
    # Report
    # -----------------------------
    def generate_report(self, analysis):

        report = []

        report.append("=" * 50)
        report.append("GREENMILE RECOMMENDATION REPORT")
        report.append("=" * 50)
        report.append("")

        report.append(f"🏆 Best Route: {analysis['best_route']['route_name']}")
        report.append(f"   CO₂e Emissions: {analysis['best_route']['predicted_co2e_kg']:.2f} kg")
        report.append(f"   Fuel: {analysis['best_route']['fuel_consumption']['fuel_liters']:.2f} L")
        report.append("")

        report.append(f"💰 Savings (vs worst route):")
        report.append(f"   CO₂e: {analysis['co2e_saving_kg']:.2f} kg ({analysis['co2e_saving_percent']:.1f}%)")
        report.append(f"   Fuel: {analysis['fuel_saving_liters']:.2f} L ({analysis['fuel_saving_percent']:.1f}%)")
        report.append("")

        report.append("📋 Recommendations:")
        for i, rec in enumerate(analysis['recommendations'], 1):
            report.append(f"   {i}. {rec}")
        
        report.append("")
        report.append("=" * 50)
        report.append(f"Generated: {analysis['generated_at']}")
        report.append("=" * 50)

        return "\n".join(report)