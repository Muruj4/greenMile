import pytest
import math
import types
import numpy as np
import pandas as pd
from unittest.mock import MagicMock, patch, PropertyMock
from models.ai_models.recommendation_engine import GreenMileRecommendationEngine



def _make_label_encoder(classes):
   
    enc = MagicMock()
    enc.transform = lambda vals: [list(classes).index(v) for v in vals]
    return enc


@pytest.fixture
def engine():
   
    
    with patch("models.ai_models.recommendation_engine.joblib.load") as mock_load:

        reg_model = MagicMock()
        reg_model.predict = MagicMock(return_value=np.array([5.0]))

        clf_model = MagicMock()
        clf_model.predict = MagicMock(return_value=np.array(["Green"]))
        clf_model.predict_proba = MagicMock(
            return_value=np.array([[0.8, 0.15, 0.05]])
        )
        clf_model.classes_ = np.array(["Green", "Yellow", "Red"])

        label_encoders = {
            "Vehicle Type":        _make_label_encoder(["Truck", "Van", "Car"]),
            "Fuel Type":           _make_label_encoder(["Diesel", "Gasoline", "CNG", "Electric", "Hybrid"]),
            "Road Type":           _make_label_encoder(["Highway", "Urban", "Rural"]),
            "Traffic Conditions":  _make_label_encoder(["Light", "Moderate", "Heavy", "Severe"]),
            "City":                _make_label_encoder(["Riyadh", "Jeddah", "Dammam"]),
        }

        thresholds = {"Green": (0, 5), "Yellow": (5, 10), "Red": (10, 999)}

        # joblib.load is called 4 times in __init__; return objects in order
        mock_load.side_effect = [reg_model, clf_model, label_encoders, thresholds]

        eng = GreenMileRecommendationEngine(
            regression_model_path="reg.pkl",
            classification_model_path="clf.pkl",
            encoders_path="enc.pkl",
            thresholds_path="thr.pkl",
        )
        return eng


@pytest.fixture
def base_trip():
    return {
        "name": "Route A",
        "Distance_km": 20.0,
        "Speed": 60,
        "TrafficIndexLive": 3,
        "JamsCount": 2,
        "Hour": 9,
        "DayOfWeek": 1,
        "Month": 5,
        "IsWeekend": 0,
        "IsPeakHour": 1,
        "Temperature": 28.0,
        "Humidity": 50,
        "Wind Speed": 10,
        "Vehicle Type": "Truck",
        "Fuel Type": "Diesel",
        "Road Type": "Highway",
        "Traffic Conditions": "Light",
        "City": "Riyadh",
    }



# FUEL CALCULATION TESTS


class TestFuelCalculation:
    """Tests for calculate_fuel_consumption()"""

    def test_diesel_fuel_consumption(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=10.72, fuel_type="Diesel")
        # 10.72 / 2.68 ≈ 4.0 L
        assert result["fuel_unit"] == "L"
        assert abs(result["fuel_liters"] - 4.0) < 0.05
        assert result["fuel_cost_sar"] > 0

    def test_gasoline_fuel_consumption(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=2.31, fuel_type="Gasoline")
        # 2.31 / 2.31 = 1.0 L
        assert abs(result["fuel_liters"] - 1.0) < 0.01

    def test_cng_fuel_consumption(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=1.85, fuel_type="CNG")
        assert abs(result["fuel_liters"] - 1.0) < 0.01

    def test_electric_returns_zero(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=0.0, fuel_type="Electric")
        assert result["fuel_liters"] == 0.0
        assert result["fuel_cost_sar"] == 0.0
        assert result["fuel_unit"] == "kWh"

    def test_hybrid_fuel_consumption(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=3.0, fuel_type="Hybrid")
        assert result["fuel_unit"] == "L"
        assert result["fuel_liters"] > 0

    def test_unknown_fuel_type_falls_back_to_gasoline(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=2.31, fuel_type="Hydrogen")
        # Falls back to gasoline factor 2.31 → 1.0 L
        assert abs(result["fuel_liters"] - 1.0) < 0.01

    def test_zero_co2e_non_electric_returns_zero_liters(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=0.0, fuel_type="Diesel")
        assert result["fuel_liters"] == 0.0

    def test_large_co2e_value(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=1000.0, fuel_type="Diesel")
        assert result["fuel_liters"] == round(1000.0 / 2.68, 2)

    def test_result_is_rounded_to_2_dp(self, engine):
        result = engine.calculate_fuel_consumption(co2e_kg=5.555, fuel_type="Gasoline")
        # Check at most 2 decimal places
        assert result["fuel_liters"] == round(result["fuel_liters"], 2)
        assert result["fuel_cost_sar"] == round(result["fuel_cost_sar"], 2)



# ENCODING TESTS


class TestSafeEncode:
    """Tests for _safe_encode()"""

    def test_valid_encoding_returns_integer_no_warning(self, engine):
        code, warn = engine._safe_encode("Fuel Type", "Diesel")
        assert isinstance(code, int)
        assert warn == ""

    def test_missing_encoder_returns_zero_with_warning(self, engine):
        code, warn = engine._safe_encode("NonExistentCol", "value")
        assert code == 0
        assert "Missing encoder" in warn

    def test_unknown_value_returns_zero_with_warning(self, engine):
        # Patch the encoder to raise on transform
        engine.label_encoders["Fuel Type"].transform = MagicMock(side_effect=Exception("unknown"))
        code, warn = engine._safe_encode("Fuel Type", "Rocket Fuel")
        assert code == 0
        assert "Unknown value" in warn or warn != ""

    def test_all_known_fuel_types_encode_without_warning(self, engine):
        for ft in ["Diesel", "Gasoline", "CNG", "Electric", "Hybrid"]:
            _, warn = engine._safe_encode("Fuel Type", ft)
            assert warn == "", f"Unexpected warning for {ft}: {warn}"



# FEATURE PREPARATION TESTS


class TestPrepareFeatures:
   # Tests for prepare_trip_features()

    def test_returns_dataframe_with_correct_columns(self, engine, base_trip):
        df, warnings = engine.prepare_trip_features(base_trip)
        assert isinstance(df, pd.DataFrame)
        assert list(df.columns) == engine.feature_columns

    def test_no_warnings_for_valid_trip(self, engine, base_trip):
        _, warnings = engine.prepare_trip_features(base_trip)
        assert warnings == []

    def test_missing_numeric_features_default_to_zero(self, engine):
        minimal_trip = {
            "Vehicle Type": "Car", "Fuel Type": "Gasoline",
            "Road Type": "Urban", "Traffic Conditions": "Light", "City": "Riyadh",
        }
        df, _ = engine.prepare_trip_features(minimal_trip)
        assert df["Distance_km"].iloc[0] == 0
        assert df["Speed"].iloc[0] == 0

    def test_unknown_city_produces_warning(self, engine, base_trip):
        trip = dict(base_trip)
        trip["City"] = "UnknownCity"
        # Force encoder to raise
        engine.label_encoders["City"].transform = MagicMock(side_effect=Exception("unknown"))
        _, warnings = engine.prepare_trip_features(trip)
        assert len(warnings) > 0

    def test_encoded_columns_present(self, engine, base_trip):
        df, _ = engine.prepare_trip_features(base_trip)
        assert "Fuel Type_encoded" in df.columns
        assert "City_encoded" in df.columns

    def test_dataframe_has_exactly_one_row(self, engine, base_trip):
        df, _ = engine.prepare_trip_features(base_trip)
        assert len(df) == 1



#  SINGLE ROUTE PREDICTION TESTS


class TestPredictSingleRoute:
    #Tests for predict_single_route()

    def test_returns_required_keys(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        for key in ["route_name", "predicted_co2e_kg", "category", "probabilities",
                    "fuel_consumption", "meta", "warnings"]:
            assert key in result

    def test_co2e_is_float(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        assert isinstance(result["predicted_co2e_kg"], float)

    def test_co2e_rounded_to_4dp(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        assert result["predicted_co2e_kg"] == round(result["predicted_co2e_kg"], 4)

    def test_category_is_string(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        assert isinstance(result["category"], str)

    def test_probabilities_sum_to_one(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        total = sum(result["probabilities"].values())
        assert abs(total - 1.0) < 1e-6

    def test_probabilities_contain_all_classes(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        for cls in ["Green", "Yellow", "Red"]:
            assert cls in result["probabilities"]

    def test_fuel_consumption_included(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        assert "fuel_liters" in result["fuel_consumption"]

    def test_meta_contains_correct_values(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        assert result["meta"]["distance_km"] == 20.0
        assert result["meta"]["fuel_type"] == "Diesel"

    def test_route_name_fallback(self, engine, base_trip):
        trip = dict(base_trip)
        del trip["name"]
        result = engine.predict_single_route(trip)
        assert result["route_name"] == "Unknown Route"

    def test_electric_vehicle_zero_fuel(self, engine, base_trip):
        trip = dict(base_trip)
        trip["Fuel Type"] = "Electric"
        # Make regression predict 0 for electric
        engine.regression_model.predict = MagicMock(return_value=np.array([0.0]))
        result = engine.predict_single_route(trip)
        assert result["fuel_consumption"]["fuel_liters"] == 0.0

    def test_warnings_list_present(self, engine, base_trip):
        result = engine.predict_single_route(base_trip)
        assert isinstance(result["warnings"], list)



# ROUTE COMPARISON TESTS

class TestCompareRoutes:
    #Tests for compare_routes()

    @pytest.fixture
    def two_routes(self, base_trip):
        route_b = dict(base_trip)
        route_b["name"] = "Route B"
        route_b["Distance_km"] = 35.0
        return [base_trip, route_b]

    def test_returns_required_keys(self, engine, two_routes):
        # Make Route B dirtier
        call_count = [0]
        def varying_predict(features):
            call_count[0] += 1
            return np.array([5.0]) if call_count[0] == 1 else np.array([10.0])
        engine.regression_model.predict = varying_predict

        result = engine.compare_routes(two_routes)
        for key in ["all_routes", "best_route", "worst_route",
                    "co2e_saving_kg", "co2e_saving_percent",
                    "fuel_saving_liters", "fuel_saving_percent",
                    "cost_saving_sar", "reasons", "recommendations", "generated_at"]:
            assert key in result

    def test_best_route_has_lowest_co2(self, engine, two_routes):
        emissions = iter([5.0, 10.0])
        engine.regression_model.predict = lambda _: np.array([next(emissions)])
        result = engine.compare_routes(two_routes)
        assert result["best_route"]["predicted_co2e_kg"] <= result["worst_route"]["predicted_co2e_kg"]

    def test_co2_saving_is_difference(self, engine, two_routes):
        emissions = iter([5.0, 10.0])
        engine.regression_model.predict = lambda _: np.array([next(emissions)])
        result = engine.compare_routes(two_routes)
        expected = round(10.0 - 5.0, 4)
        assert result["co2e_saving_kg"] == expected

    def test_saving_percent_between_0_and_100(self, engine, two_routes):
        emissions = iter([5.0, 10.0])
        engine.regression_model.predict = lambda _: np.array([next(emissions)])
        result = engine.compare_routes(two_routes)
        assert 0 <= result["co2e_saving_percent"] <= 100

    def test_all_routes_sorted_ascending(self, engine, two_routes):
        emissions = iter([10.0, 5.0])  # deliberately reversed
        engine.regression_model.predict = lambda _: np.array([next(emissions)])
        result = engine.compare_routes(two_routes)
        co2_values = [r["predicted_co2e_kg"] for r in result["all_routes"]]
        assert co2_values == sorted(co2_values)

    def test_single_route_comparison(self, engine, base_trip):
        """Comparing one route: saving should be 0."""
        result = engine.compare_routes([base_trip])
        assert result["co2e_saving_kg"] == 0.0
        assert result["best_route"] == result["worst_route"]

    def test_identical_routes_zero_saving(self, engine, base_trip):
        result = engine.compare_routes([base_trip, dict(base_trip)])
        assert result["co2e_saving_kg"] == 0.0

    def test_generated_at_is_string(self, engine, two_routes):
        result = engine.compare_routes(two_routes)
        assert isinstance(result["generated_at"], str)

    def test_fuel_saving_liters_non_negative(self, engine, two_routes):
        emissions = iter([5.0, 10.0])
        engine.regression_model.predict = lambda _: np.array([next(emissions)])
        result = engine.compare_routes(two_routes)
        assert result["fuel_saving_liters"] >= 0

    def test_three_routes_ranked_correctly(self, engine, base_trip):
        routes = [
            {**base_trip, "name": "R1"},
            {**base_trip, "name": "R2"},
            {**base_trip, "name": "R3"},
        ]
        emissions = iter([8.0, 3.0, 15.0])
        engine.regression_model.predict = lambda _: np.array([next(emissions)])
        result = engine.compare_routes(routes)
        assert result["best_route"]["route_name"] == "R2"
        assert result["worst_route"]["route_name"] == "R3"



# REASONS & RECOMMENDATIONS TESTS


class TestReasonsAndRecommendations:
# Tests for _build_reasons() and _generate_recommendations()

    def _make_prediction(self, co2, route_name, temperature=25, distance=20,
                         traffic="Light", fuel_liters=2.0, category="Green"):
        return {
            "route_name": route_name,
            "predicted_co2e_kg": co2,
            "category": category,
            "probabilities": {"Green": 1.0},
            "fuel_consumption": {"fuel_liters": fuel_liters, "fuel_unit": "L", "fuel_cost_sar": 1.0},
            "meta": {
                "distance_km": distance,
                "traffic_conditions": traffic,
                "temperature": temperature,
                "fuel_type": "Diesel",
            },
            "warnings": [],
        }

    def test_reasons_mention_best_route_name(self, engine):
        best = self._make_prediction(5.0, "Best Route")
        worst = self._make_prediction(10.0, "Worst Route", fuel_liters=4.0)
        reasons = engine._build_reasons(best, worst, fuel_saved=2.0)
        assert any("Best Route" in r for r in reasons)

    def test_reasons_mention_emission_reduction(self, engine):
        best = self._make_prediction(5.0, "A")
        worst = self._make_prediction(10.0, "B", fuel_liters=4.0)
        reasons = engine._build_reasons(best, worst, fuel_saved=2.0)
        assert any("5.00 kg" in r or "reduces emissions" in r for r in reasons)

    def test_fuel_saving_reason_included_when_positive(self, engine):
        best = self._make_prediction(5.0, "A")
        worst = self._make_prediction(10.0, "B", fuel_liters=4.0)
        reasons = engine._build_reasons(best, worst, fuel_saved=2.0)
        assert any("save" in r.lower() for r in reasons)

    def test_no_fuel_saving_reason_when_zero(self, engine):
        best = self._make_prediction(5.0, "A")
        worst = self._make_prediction(5.0, "B")
        reasons = engine._build_reasons(best, worst, fuel_saved=0.0)
        # Should NOT include a fuel saving sentence
        assert not any("save" in r.lower() and "fuel" in r.lower() for r in reasons)

    def test_high_temp_recommendation(self, engine):
        best = self._make_prediction(5.0, "A", temperature=40)
        worst = self._make_prediction(10.0, "B", fuel_liters=4.0)
        recs = engine._generate_recommendations(best, worst, [best, worst], fuel_saved=2.0)
        assert any("temperature" in r.lower() for r in recs)

    def test_heavy_traffic_recommendation(self, engine):
        best = self._make_prediction(5.0, "A", traffic="Heavy")
        worst = self._make_prediction(10.0, "B", fuel_liters=4.0)
        recs = engine._generate_recommendations(best, worst, [best, worst], fuel_saved=2.0)
        assert any("traffic" in r.lower() for r in recs)

    def test_long_distance_recommendation(self, engine):
        best = self._make_prediction(5.0, "A", distance=50)
        worst = self._make_prediction(10.0, "B", fuel_liters=4.0)
        recs = engine._generate_recommendations(best, worst, [best, worst], fuel_saved=2.0)
        assert any("speed" in r.lower() or "distance" in r.lower() for r in recs)

    def test_multiple_green_routes_recommendation(self, engine):
        green1 = self._make_prediction(3.0, "A", category="Green")
        green2 = self._make_prediction(4.0, "B", category="Green", fuel_liters=1.5)
        all_routes = [green1, green2]
        recs = engine._generate_recommendations(green1, green2, all_routes, fuel_saved=0.5)
        assert any("eco-friendly" in r.lower() or "green" in r.lower() for r in recs)

    def test_no_high_temp_recommendation_at_normal_temp(self, engine):
        best = self._make_prediction(5.0, "A", temperature=25)
        worst = self._make_prediction(10.0, "B", fuel_liters=4.0)
        recs = engine._generate_recommendations(best, worst, [best, worst], fuel_saved=2.0)
        assert not any("temperature" in r.lower() for r in recs)



#REPORT GENERATION TESTS

class TestGenerateReport:
    #Tests for generate_report()

    @pytest.fixture
    def sample_analysis(self):
        return {
            "best_route": {
                "route_name": "Highway Express",
                "predicted_co2e_kg": 4.5,
                "fuel_consumption": {"fuel_liters": 1.68, "fuel_unit": "L"},
            },
            "worst_route": {"route_name": "City Road"},
            "co2e_saving_kg": 3.2,
            "co2e_saving_percent": 41.6,
            "fuel_saving_liters": 1.19,
            "fuel_saving_percent": 41.5,
            "cost_saving_sar": 0.56,
            "recommendations": ["Take Highway Express.", "Avoid peak hours."],
            "generated_at": "2025-05-01 10:00:00",
        }

    def test_report_is_string(self, engine, sample_analysis):
        report = engine.generate_report(sample_analysis)
        assert isinstance(report, str)

    def test_report_contains_best_route_name(self, engine, sample_analysis):
        report = engine.generate_report(sample_analysis)
        assert "Highway Express" in report

    def test_report_contains_co2_saving(self, engine, sample_analysis):
        report = engine.generate_report(sample_analysis)
        assert "3.20" in report or "3.2" in report

    def test_report_contains_all_recommendations(self, engine, sample_analysis):
        report = engine.generate_report(sample_analysis)
        assert "Take Highway Express." in report
        assert "Avoid peak hours." in report

    def test_report_contains_generated_at(self, engine, sample_analysis):
        report = engine.generate_report(sample_analysis)
        assert "2025-05-01 10:00:00" in report

    def test_report_has_separator_lines(self, engine, sample_analysis):
        report = engine.generate_report(sample_analysis)
        assert "=" * 10 in report

    def test_empty_recommendations_does_not_crash(self, engine, sample_analysis):
        sample_analysis["recommendations"] = []
        report = engine.generate_report(sample_analysis)
        assert isinstance(report, str)



# EDGE CASES & BOUNDARY TESTS

class TestEdgeCases:

    def test_negative_co2_prediction_handled(self, engine, base_trip):
        """Model predicts negative CO2 (shouldn't happen, but test resilience)."""
        engine.regression_model.predict = MagicMock(return_value=np.array([-1.0]))
        result = engine.predict_single_route(base_trip)
        # Should not crash; value preserved
        assert result["predicted_co2e_kg"] == round(-1.0, 4)

    def test_very_large_co2_prediction(self, engine, base_trip):
        engine.regression_model.predict = MagicMock(return_value=np.array([9999.0]))
        result = engine.predict_single_route(base_trip)
        assert result["predicted_co2e_kg"] == 9999.0

    def test_worst_route_zero_co2_saving_percent(self, engine, base_trip):
        """When worst CO2 = 0, saving percent should be 0 (no division by zero)."""
        engine.regression_model.predict = MagicMock(return_value=np.array([0.0]))
        result = engine.compare_routes([base_trip, dict(base_trip)])
        assert result["co2e_saving_percent"] == 0.0

    def test_all_fuel_type_constants_present(self, engine):
        expected = {"Diesel", "Gasoline", "CNG", "Electric", "Hybrid"}
        assert expected == set(engine.FUEL_CO2_FACTORS.keys())
        assert expected == set(engine.FUEL_COSTS_SAR.keys())

    def test_co2_factors_are_positive_or_zero(self, engine):
        for fuel, factor in engine.FUEL_CO2_FACTORS.items():
            assert factor >= 0, f"Negative CO2 factor for {fuel}"

    def test_fuel_costs_are_positive(self, engine):
        for fuel, cost in engine.FUEL_COSTS_SAR.items():
            assert cost > 0, f"Non-positive cost for {fuel}"

    def test_feature_columns_count(self, engine):
        assert len(engine.feature_columns) == 17

    def test_class_labels_derived_from_model(self, engine):
        assert set(engine.class_labels) == {"Green", "Yellow", "Red"}

    def test_severe_traffic_triggers_recommendation(self, engine, base_trip):
        trip = dict(base_trip)
        trip["Traffic Conditions"] = "Severe"
        trip["name"] = "Severe Route"
        engine.regression_model.predict = MagicMock(return_value=np.array([5.0]))
        result = engine.compare_routes([trip])
        recs = result["recommendations"]
        assert any("traffic" in r.lower() or "off-peak" in r.lower() for r in recs)

    def test_predict_uses_fuel_type_from_trip(self, engine, base_trip):
        trip_gas = dict(base_trip)
        trip_gas["Fuel Type"] = "Gasoline"
        result = engine.predict_single_route(trip_gas)
        assert result["meta"]["fuel_type"] == "Gasoline"
