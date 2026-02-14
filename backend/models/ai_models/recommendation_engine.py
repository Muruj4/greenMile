# recommendation_engine.py

import pandas as pd
import joblib
from datetime import datetime
from typing import Dict, List, Any, Tuple


class GreenMileRecommendationEngine:

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

        return {

            "route_name": route_data.get("name", "Unknown Route"),

            "predicted_co2e_kg": round(predicted_co2, 4),

            "category": predicted_category,

            "probabilities": category_probs,

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

        reasons = self._build_reasons(best, worst)

        recommendations = self._generate_recommendations(
            best,
            worst,
            predictions_sorted,
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
    def _build_reasons(self, best, worst):

        reasons = []

        reasons.append(
            f"Selected '{best['route_name']}' because it "
            f"has the lowest emissions "
            f"({best['predicted_co2e_kg']:.2f} kg CO2e)."
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

        return reasons

    # -----------------------------
    # Recommendations
    # -----------------------------
    def _generate_recommendations(
        self,
        best,
        worst,
        all_routes,
    ):

        recommendations = []

        best_temp = best["meta"]["temperature"]
        best_dist = best["meta"]["distance_km"]
        best_traffic = best["meta"]["traffic_conditions"]

        # FIXED: removed category
        recommendations.append(
            f"Choose '{best['route_name']}' "
            f"to minimize CO2e emissions "
            f"({best['predicted_co2e_kg']:.2f} kg)."
        )

        if best_temp > 35:

            recommendations.append(
                "High temperature detected. "
                "Use cooler delivery hours."
            )

        if best_traffic in ["Heavy", "Severe"]:

            recommendations.append(
                "Heavy traffic detected. "
                "Consider off-peak hours."
            )

        if best_dist > 30:

            recommendations.append(
                "Long distance trip. "
                "Maintain steady speed."
            )

        green_routes = [
            r for r in all_routes
            if r["category"] == "Green"
        ]

        if len(green_routes) > 1:

            recommendations.append(
                f"{len(green_routes)} eco-friendly routes available."
            )

        return recommendations

    # -----------------------------
    # Report
    # -----------------------------
    def generate_report(self, analysis):

        report = []

        report.append("GREENMILE REPORT")

        report.append(
            f"Best route: {analysis['best_route']['route_name']}"
        )

        report.append(
            f"Savings: {analysis['co2e_saving_kg']} kg"
        )

        return "\n".join(report)
