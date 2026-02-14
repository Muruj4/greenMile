# recommendation_engine.py

import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from typing import Dict, List, Any, Tuple


class GreenMileRecommendationEngine:
    """
    Layer 3: Prescriptive layer (Hybrid)
    - Uses ML outputs from L1 (regression) and L2 (classification)
    - Applies decision logic + rules to generate recommendations
    """

    def __init__(
        self,
        regression_model_path: str = "regression_model.pkl",
        classification_model_path: str = "classification_model.pkl",
        encoders_path: str = "label_encoders.pkl",
        thresholds_path: str = "category_thresholds.pkl",
    ):
        # Load trained artifacts
        self.regression_model = joblib.load(regression_model_path)
        self.classification_model = joblib.load(classification_model_path)
        self.label_encoders = joblib.load(encoders_path)
        self.thresholds = joblib.load(thresholds_path)

        # Must match training feature order exactly
        self.feature_columns = [
            "Distance_km", "Speed", "TrafficIndexLive", "JamsCount",
            "Hour", "DayOfWeek", "Month", "IsWeekend", "IsPeakHour",
            "Temperature", "Humidity", "Wind Speed",
            "Vehicle Type_encoded", "Fuel Type_encoded",
            "Road Type_encoded", "Traffic Conditions_encoded", "City_encoded"
        ]

        # Used for stable ordering
        self.class_labels = list(self.classification_model.classes_)

    # -----------------------------
    # Encoding + Feature Preparation
    # -----------------------------
    def _safe_encode(self, col_name: str, value: Any) -> Tuple[int, str]:
        """
        Encode a categorical value using saved LabelEncoder.
        If unknown, fallback to 0 and return a warning message.
        """
        encoder = self.label_encoders.get(col_name)
        if encoder is None:
            return 0, f"Missing encoder for '{col_name}'. Used fallback=0."

        try:
            encoded = int(encoder.transform([value])[0])
            return encoded, ""
        except Exception:
            return 0, f"Unknown {col_name}='{value}'. Used fallback=0."

    def prepare_trip_features(self, trip_data: Dict[str, Any]) -> Tuple[pd.DataFrame, List[str]]:
        """
        Convert raw trip dict into a single-row DataFrame in the correct feature order.
        Returns:
          - features_df
          - warnings (list of strings)
        """
        warnings: List[str] = []
        trip_encoded = dict(trip_data)

        categorical_cols = ["Vehicle Type", "Fuel Type", "Road Type", "Traffic Conditions", "City"]
        for col in categorical_cols:
            if col in trip_encoded:
                encoded_value, warn = self._safe_encode(col, trip_encoded[col])
                trip_encoded[f"{col}_encoded"] = encoded_value
                if warn:
                    warnings.append(warn)

        # Ensure all required features exist
        for f in self.feature_columns:
            if f not in trip_encoded:
                trip_encoded[f] = 0
                warnings.append(f"Missing feature '{f}'. Used default=0.")

        features_df = pd.DataFrame([trip_encoded])[self.feature_columns]
        return features_df, warnings

    # -----------------------------
    # Prediction (Layer 1 + Layer 2)
    # -----------------------------
    def predict_single_route(self, route_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict emissions + category + probabilities for a single route.
        """
        features, warnings = self.prepare_trip_features(route_data)

        # Layer 1 regression
        predicted_co2 = float(self.regression_model.predict(features)[0])

        # Layer 2 classification
        predicted_category = str(self.classification_model.predict(features)[0])
        proba = self.classification_model.predict_proba(features)[0]
        category_probs = {cls: float(p) for cls, p in zip(self.class_labels, proba)}

        return {
            "route_name": route_data.get("name", "Unknown Route"),
            "predicted_co2e_kg": round(predicted_co2, 4),
            "category": predicted_category,
            "probabilities": category_probs,
            "meta": {
                "distance_km": float(route_data.get("Distance_km", 0)),
                "traffic_conditions": route_data.get("Traffic Conditions", "Unknown"),
                "temperature": float(route_data.get("Temperature", 0)),
            },
            "warnings": warnings
        }

    # -----------------------------
    # Decision + Recommendation (Hybrid logic)
    # -----------------------------
    def compare_routes(self, routes_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Compare routes, select best, compute savings, and generate recommendations.
        Returns JSON-like dict ready for your app.
        """
        if not routes_list:
            raise ValueError("routes_list is empty.")

        predictions = [self.predict_single_route(r) for r in routes_list]

        # Sort: best = lowest emissions
        predictions_sorted = sorted(predictions, key=lambda x: x["predicted_co2e_kg"])
        best = predictions_sorted[0]
        worst = predictions_sorted[-1]

        co2_savings = worst["predicted_co2e_kg"] - best["predicted_co2e_kg"]
        savings_percent = (
            (co2_savings / worst["predicted_co2e_kg"] * 100)
            if worst["predicted_co2e_kg"] > 0 else 0.0
        )

        reasons = self._build_reasons(best, worst)
        recs = self._generate_recommendations(best, worst, predictions_sorted)

        return {
            "all_routes": predictions_sorted,
            "best_route": best,
            "worst_route": worst,
            "co2e_saving_kg": round(co2_savings, 4),
            "co2e_saving_percent": round(savings_percent, 2),
            "reasons": reasons,
            "recommendations": recs,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    def _build_reasons(self, best: Dict[str, Any], worst: Dict[str, Any]) -> List[str]:
        reasons: List[str] = []

        reasons.append(
            f"Selected '{best['route_name']}' because it has the lowest predicted emissions "
            f"({best['predicted_co2e_kg']:.2f} kg CO2e)."
        )

        best_cat = best["category"]
        conf = best["probabilities"].get(best_cat, 0.0) * 100
        reasons.append(f"Model confidence for category '{best_cat}' is {conf:.1f}%.")

        diff = worst["predicted_co2e_kg"] - best["predicted_co2e_kg"]
        reasons.append(
            f"Compared to '{worst['route_name']}' ({worst['predicted_co2e_kg']:.2f} kg), "
            f"this reduces emissions by {diff:.2f} kg."
        )

        return reasons

    def _generate_recommendations(
        self,
        best: Dict[str, Any],
        worst: Dict[str, Any],
        all_routes: List[Dict[str, Any]]
    ) -> List[str]:
        recommendations: List[str] = []

        best_temp = best["meta"].get("temperature", 0.0)
        best_traffic = str(best["meta"].get("traffic_conditions", "Unknown"))
        best_dist = best["meta"].get("distance_km", 0.0)

        # Main action
        recommendations.append(
            f"Choose '{best['route_name']}' to minimize CO2e emissions "
            f"({best['predicted_co2e_kg']:.2f} kg, category: {best['category']})."
        )

        # Temperature rule
        if best_temp > 35:
            recommendations.append(
                "High temperature detected (>35°C). Consider cooler delivery hours to reduce AC-related fuel use."
            )
        elif 0 < best_temp < 15:
            recommendations.append(
                "Low temperature detected (<15°C). Avoid long idling; warm up briefly then drive smoothly."
            )

        # Traffic rule
        if best_traffic in ["Heavy", "Severe"]:
            recommendations.append(
                "Traffic is heavy. If possible, shift delivery to off-peak hours to reduce stop-and-go emissions."
            )

        # Distance rule
        if best_dist < 5:
            recommendations.append(
                f"Short trip ({best_dist:.1f} km). Consider bundling with nearby deliveries to improve efficiency."
            )
        elif best_dist > 30:
            recommendations.append(
                f"Long trip ({best_dist:.1f} km). Maintain steady speed and avoid aggressive acceleration."
            )

        # Multiple eco options
        green_routes = [r for r in all_routes if r["category"] == "Green"]
        if len(green_routes) > 1:
            recommendations.append(
                f"There are {len(green_routes)} Green routes. Any of them is an environmentally responsible choice."
            )

        return recommendations

    # -----------------------------
    # Optional report (text output)
    # -----------------------------
    def generate_report(self, analysis_result: Dict[str, Any]) -> str:
        best = analysis_result["best_route"]
        worst = analysis_result["worst_route"]

        report: List[str] = []
        report.append("GREENMILE ROUTE ANALYSIS REPORT")
        report.append("-" * 70)
        report.append(f"Routes analyzed: {len(analysis_result['all_routes'])}")
        report.append(f"Best route:      {best['route_name']}")
        report.append(f"Worst route:     {worst['route_name']}")
        report.append(
            f"Savings:         {analysis_result['co2e_saving_kg']:.2f} kg CO2e "
            f"({analysis_result['co2e_saving_percent']:.1f}%)"
        )
        report.append("")
        report.append("Best route details:")
        report.append(f"  Predicted CO2e: {best['predicted_co2e_kg']:.2f} kg")
        report.append(f"  Category:       {best['category']}")
        conf = best["probabilities"].get(best["category"], 0.0) * 100
        report.append(f"  Confidence:     {conf:.1f}%")
        report.append("")
        report.append("Reasons:")
        for r in analysis_result.get("reasons", []):
            report.append(f"  - {r}")
        report.append("")
        report.append("Recommendations:")
        for i, rec in enumerate(analysis_result.get("recommendations", []), 1):
            report.append(f"  {i}. {rec}")
        report.append("")
        report.append(f"Generated at: {analysis_result.get('generated_at', '')}")

        return "\n".join(report)
