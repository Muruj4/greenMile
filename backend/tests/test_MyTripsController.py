"""
Unit & Integration tests for MyTripsController
Run with: pytest tests/test_MyTripsController.py -v
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

# ── Minimal app fixture ───────────────────────────────────────────────────────
from controllers.MyTripsController import router

app = FastAPI()
app.include_router(router)

# ── Helpers ───────────────────────────────────────────────────────────────────

def make_trip(**kwargs):
    """Return a mock TripDB-like object with sensible defaults."""
    trip = MagicMock()
    trip.id            = kwargs.get("id", 1)
    trip.origin        = kwargs.get("origin", "السلامه")
    trip.destination   = kwargs.get("destination", "الصفا")
    trip.city          = kwargs.get("city", "Jeddah")
    trip.vehicle_type  = kwargs.get("vehicle_type", "SUV")
    trip.fuel_type     = kwargs.get("fuel_type", "Petrol")
    trip.model_year    = kwargs.get("model_year", 2024)
    trip.route_summary = kwargs.get("route_summary", "طريق الملك عبدالعزيز")
    trip.distance_km   = kwargs.get("distance_km", 8.04)
    trip.duration_min  = kwargs.get("duration_min", 24)
    trip.color         = kwargs.get("color", "green")
    trip.co2           = kwargs.get("co2", 1200.5)
    trip.ch4           = kwargs.get("ch4", 0.032)
    trip.n2o           = kwargs.get("n2o", 0.018)
    trip.co2e          = kwargs.get("co2e", 1250.3)
    trip.created_at    = kwargs.get("created_at", datetime(2026, 4, 15, 10, 30, 0))
    trip.saved_by_role = kwargs.get("saved_by_role", "manager")
    trip.driver_id     = kwargs.get("driver_id", None)
    return trip

MOCK_USER = {"id": 1, "company_id": 1, "role": "manager"}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Unit Tests — filter logic
# ─────────────────────────────────────────────────────────────────────────────

class TestGetMyTripsFilters:

    def _make_db(self, trips):
        """Build a mock SQLAlchemy session that returns the given trips."""
        db = MagicMock()
        q  = MagicMock()
        db.query.return_value          = q
        q.filter.return_value          = q
        q.order_by.return_value        = q
        q.all.return_value             = trips
        return db

    def _call(self, db, **filters):
        from controllers.MyTripsController import get_my_trips
        import asyncio

        # Build dummy Query params
        class Q:
            pass

        result = get_my_trips(
            color        = filters.get("color"),
            city         = filters.get("city"),
            vehicle_type = filters.get("vehicle_type"),
            fuel_type    = filters.get("fuel_type"),
            date_range   = filters.get("date_range"),
            db           = db,
            user         = MOCK_USER,
        )
        return result

    def test_returns_all_trips_no_filters(self):
        trips = [make_trip(id=1), make_trip(id=2)]
        db = self._make_db(trips)
        result = self._call(db)
        assert result["total"] == 2
        assert len(result["trips"]) == 2

    def test_returns_empty_list_when_no_trips(self):
        db = self._make_db([])
        result = self._call(db)
        assert result["total"] == 0
        assert result["trips"] == []

    def test_serializes_trip_id(self):
        db = self._make_db([make_trip(id=42)])
        result = self._call(db)
        assert result["trips"][0]["id"] == 42

    def test_serializes_origin(self):
        db = self._make_db([make_trip(origin="الرياض")])
        result = self._call(db)
        assert result["trips"][0]["origin"] == "الرياض"

    def test_serializes_destination(self):
        db = self._make_db([make_trip(destination="جدة")])
        result = self._call(db)
        assert result["trips"][0]["destination"] == "جدة"

    def test_serializes_city(self):
        db = self._make_db([make_trip(city="Riyadh")])
        result = self._call(db)
        assert result["trips"][0]["city"] == "Riyadh"

    def test_serializes_vehicle_type(self):
        db = self._make_db([make_trip(vehicle_type="Truck")])
        result = self._call(db)
        assert result["trips"][0]["vehicle_type"] == "Truck"

    def test_serializes_fuel_type(self):
        db = self._make_db([make_trip(fuel_type="Diesel")])
        result = self._call(db)
        assert result["trips"][0]["fuel_type"] == "Diesel"

    def test_serializes_color(self):
        db = self._make_db([make_trip(color="orange")])
        result = self._call(db)
        assert result["trips"][0]["color"] == "orange"

    def test_serializes_co2e(self):
        db = self._make_db([make_trip(co2e=999.99)])
        result = self._call(db)
        assert result["trips"][0]["co2e"] == 999.99

    def test_serializes_distance_km(self):
        db = self._make_db([make_trip(distance_km=15.5)])
        result = self._call(db)
        assert result["trips"][0]["distance_km"] == 15.5

    def test_serializes_duration_min(self):
        db = self._make_db([make_trip(duration_min=45)])
        result = self._call(db)
        assert result["trips"][0]["duration_min"] == 45

    def test_serializes_created_at_as_iso_string(self):
        dt = datetime(2026, 4, 15, 10, 30, 0)
        db = self._make_db([make_trip(created_at=dt)])
        result = self._call(db)
        assert result["trips"][0]["created_at"] == dt.isoformat()

    def test_serializes_saved_by_role(self):
        db = self._make_db([make_trip(saved_by_role="driver")])
        result = self._call(db)
        assert result["trips"][0]["saved_by_role"] == "driver"

    def test_serializes_driver_id_none(self):
        db = self._make_db([make_trip(driver_id=None)])
        result = self._call(db)
        assert result["trips"][0]["driver_id"] is None

    def test_serializes_driver_id_value(self):
        db = self._make_db([make_trip(driver_id=5)])
        result = self._call(db)
        assert result["trips"][0]["driver_id"] == 5

    def test_total_matches_trips_length(self):
        trips = [make_trip(id=i) for i in range(7)]
        db = self._make_db(trips)
        result = self._call(db)
        assert result["total"] == len(result["trips"])

    def test_filter_by_color_passes_to_query(self):
        db = self._make_db([make_trip(color="green")])
        result = self._call(db, color="green")
        assert result["trips"][0]["color"] == "green"

    def test_filter_by_city_passes_to_query(self):
        db = self._make_db([make_trip(city="Jeddah")])
        result = self._call(db, city="Jeddah")
        assert result["trips"][0]["city"] == "Jeddah"

    def test_filter_by_vehicle_type_passes_to_query(self):
        db = self._make_db([make_trip(vehicle_type="Car")])
        result = self._call(db, vehicle_type="Car")
        assert result["trips"][0]["vehicle_type"] == "Car"

    def test_filter_by_fuel_type_passes_to_query(self):
        db = self._make_db([make_trip(fuel_type="Diesel")])
        result = self._call(db, fuel_type="Diesel")
        assert result["trips"][0]["fuel_type"] == "Diesel"

    def test_no_filter_returns_all(self):
        trips = [make_trip(color="green"), make_trip(color="red")]
        db = self._make_db(trips)
        result = self._call(db)
        assert result["total"] == 2


# ─────────────────────────────────────────────────────────────────────────────
# 2. Unit Tests — get_filter_options
# ─────────────────────────────────────────────────────────────────────────────

class TestGetFilterOptions:

    def _call(self, trips):
        from controllers.MyTripsController import get_filter_options
        db = MagicMock()
        q  = MagicMock()
        db.query.return_value   = q
        q.filter.return_value   = q
        q.all.return_value      = trips
        return get_filter_options(db=db, user=MOCK_USER)

    def test_returns_unique_cities(self):
        trips = [make_trip(city="Jeddah"), make_trip(city="Riyadh"), make_trip(city="Jeddah")]
        result = self._call(trips)
        assert result["cities"] == ["Jeddah", "Riyadh"]

    def test_returns_unique_vehicle_types(self):
        trips = [make_trip(vehicle_type="SUV"), make_trip(vehicle_type="Truck"), make_trip(vehicle_type="SUV")]
        result = self._call(trips)
        assert result["vehicle_types"] == ["SUV", "Truck"]

    def test_returns_unique_fuel_types(self):
        trips = [make_trip(fuel_type="Petrol"), make_trip(fuel_type="Diesel"), make_trip(fuel_type="Petrol")]
        result = self._call(trips)
        assert result["fuel_types"] == ["Diesel", "Petrol"]

    def test_returns_unique_colors(self):
        trips = [make_trip(color="green"), make_trip(color="red"), make_trip(color="green")]
        result = self._call(trips)
        assert result["colors"] == ["green", "red"]

    def test_returns_empty_lists_when_no_trips(self):
        result = self._call([])
        assert result["cities"]        == []
        assert result["vehicle_types"] == []
        assert result["fuel_types"]    == []
        assert result["colors"]        == []

    def test_cities_sorted_alphabetically(self):
        trips = [make_trip(city="Riyadh"), make_trip(city="Jeddah"), make_trip(city="Dammam")]
        result = self._call(trips)
        assert result["cities"] == sorted(result["cities"])

    def test_vehicle_types_sorted_alphabetically(self):
        trips = [make_trip(vehicle_type="Truck"), make_trip(vehicle_type="Car"), make_trip(vehicle_type="Bus")]
        result = self._call(trips)
        assert result["vehicle_types"] == sorted(result["vehicle_types"])

    def test_skips_none_city(self):
        trips = [make_trip(city=None), make_trip(city="Jeddah")]
        result = self._call(trips)
        assert None not in result["cities"]
        assert "Jeddah" in result["cities"]

    def test_skips_none_color(self):
        trips = [make_trip(color=None), make_trip(color="green")]
        result = self._call(trips)
        assert None not in result["colors"]


# ─────────────────────────────────────────────────────────────────────────────
# 3. Integration Tests — HTTP endpoints via TestClient
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_db_trips():
    return [
        make_trip(id=1, city="Jeddah",  color="green",  vehicle_type="SUV",   fuel_type="Petrol"),
        make_trip(id=2, city="Riyadh",  color="orange", vehicle_type="Truck", fuel_type="Diesel"),
        make_trip(id=3, city="Jeddah",  color="red",    vehicle_type="Car",   fuel_type="Petrol"),
    ]

def override_db(trips):
    from db.session import get_db
    def _get_db():
        db = MagicMock()
        q  = MagicMock()
        db.query.return_value   = q
        q.filter.return_value   = q
        q.order_by.return_value = q
        q.all.return_value      = trips
        yield db
    app.dependency_overrides[get_db] = _get_db

def override_user(user=MOCK_USER):
    from utils.auth_dep import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user

def clear_overrides():
    app.dependency_overrides.clear()


class TestMyTripsEndpoint:

    def setup_method(self):
        override_user()

    def teardown_method(self):
        clear_overrides()

    def test_get_my_trips_returns_200(self, client, mock_db_trips):
        override_db(mock_db_trips)
        response = client.get("/trips/my-trips")
        assert response.status_code == 200

    def test_get_my_trips_returns_total(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips").json()
        assert data["total"] == 3

    def test_get_my_trips_returns_trips_list(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips").json()
        assert len(data["trips"]) == 3

    def test_get_my_trips_trip_has_id(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips").json()
        assert "id" in data["trips"][0]

    def test_get_my_trips_trip_has_origin(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips").json()
        assert "origin" in data["trips"][0]

    def test_get_my_trips_trip_has_color(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips").json()
        assert "color" in data["trips"][0]

    def test_get_my_trips_trip_has_co2e(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips").json()
        assert "co2e" in data["trips"][0]

    def test_filter_by_color_green(self, client, mock_db_trips):
        green_only = [t for t in mock_db_trips if t.color == "green"]
        override_db(green_only)
        data = client.get("/trips/my-trips?color=green").json()
        assert all(t["color"] == "green" for t in data["trips"])

    def test_filter_by_city_jeddah(self, client, mock_db_trips):
        jeddah_only = [t for t in mock_db_trips if t.city == "Jeddah"]
        override_db(jeddah_only)
        data = client.get("/trips/my-trips?city=Jeddah").json()
        assert all(t["city"] == "Jeddah" for t in data["trips"])

    def test_filter_by_vehicle_type(self, client, mock_db_trips):
        suv_only = [t for t in mock_db_trips if t.vehicle_type == "SUV"]
        override_db(suv_only)
        data = client.get("/trips/my-trips?vehicle_type=SUV").json()
        assert all(t["vehicle_type"] == "SUV" for t in data["trips"])

    def test_filter_by_fuel_type(self, client, mock_db_trips):
        diesel_only = [t for t in mock_db_trips if t.fuel_type == "Diesel"]
        override_db(diesel_only)
        data = client.get("/trips/my-trips?fuel_type=Diesel").json()
        assert all(t["fuel_type"] == "Diesel" for t in data["trips"])

    def test_empty_result_returns_total_zero(self, client):
        override_db([])
        data = client.get("/trips/my-trips").json()
        assert data["total"] == 0
        assert data["trips"] == []

    def test_date_range_week_param_accepted(self, client, mock_db_trips):
        override_db(mock_db_trips)
        response = client.get("/trips/my-trips?date_range=week")
        assert response.status_code == 200

    def test_date_range_month_param_accepted(self, client, mock_db_trips):
        override_db(mock_db_trips)
        response = client.get("/trips/my-trips?date_range=month")
        assert response.status_code == 200

    def test_date_range_all_param_accepted(self, client, mock_db_trips):
        override_db(mock_db_trips)
        response = client.get("/trips/my-trips?date_range=all")
        assert response.status_code == 200

    def test_multiple_filters_combined(self, client, mock_db_trips):
        filtered = [t for t in mock_db_trips if t.city == "Jeddah" and t.color == "green"]
        override_db(filtered)
        data = client.get("/trips/my-trips?city=Jeddah&color=green").json()
        assert data["total"] == len(filtered)


class TestFilterOptionsEndpoint:

    def setup_method(self):
        override_user()

    def teardown_method(self):
        clear_overrides()

    def test_filters_endpoint_returns_200(self, client, mock_db_trips):
        override_db(mock_db_trips)
        response = client.get("/trips/my-trips/filters")
        assert response.status_code == 200

    def test_filters_returns_cities_key(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips/filters").json()
        assert "cities" in data

    def test_filters_returns_vehicle_types_key(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips/filters").json()
        assert "vehicle_types" in data

    def test_filters_returns_fuel_types_key(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips/filters").json()
        assert "fuel_types" in data

    def test_filters_returns_colors_key(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips/filters").json()
        assert "colors" in data

    def test_filters_cities_contains_jeddah(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips/filters").json()
        assert "Jeddah" in data["cities"]

    def test_filters_no_duplicate_cities(self, client, mock_db_trips):
        override_db(mock_db_trips)
        data = client.get("/trips/my-trips/filters").json()
        assert len(data["cities"]) == len(set(data["cities"]))

    def test_filters_empty_db_returns_empty_lists(self, client):
        override_db([])
        data = client.get("/trips/my-trips/filters").json()
        assert data["cities"]        == []
        assert data["vehicle_types"] == []
        assert data["fuel_types"]    == []
        assert data["colors"]        == []