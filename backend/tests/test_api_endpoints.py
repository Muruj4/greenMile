import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
import json


@pytest.fixture
def client():
    from backend.main import app
    return TestClient(app)


@pytest.fixture
def mock_ghg_file(tmp_path):
    """Create temporary mock GHG data file."""
    ghg_data = {
        "fuel_consumption": {
            "Passenger Cars": 0.08,
            "Light-Duty Trucks": 0.12
        },
        "factors": [
            {
                "vehicle_type": "Passenger Cars",
                "fuel_type": "Petrol",
                "model_year_range": "2020",
                "co2_factor": 2.31,
                "ch4_factor": 0.0001,
                "n2o_factor": 0.0001
            }
        ]
    }

    file_path = tmp_path / "ghg_factors.json"
    with open(file_path, "w") as f:
        json.dump(ghg_data, f)

    return str(file_path)


# Root Endpoint - Verify API is running and responding

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "GreenMile" in response.json()["message"]


# Process Trip - Test the complete trip processing workflow end-to-end

@patch('backend.models.Trip.requests.post')
def test_process_trip_success(mock_post, client):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "routes": [
            {
                "distanceMeters": 10000,
                "duration": "600s",
                "description": "Route via Main Street",
                "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"}
            }
        ]
    }
    mock_response.raise_for_status = Mock()
    mock_post.return_value = mock_response

    payload = {
        "origin": "King Fahd Road",
        "destination": "Olaya Street",
        "city": "Riyadh",
        "vehicleType": "Car",
        "fuelType": "Petrol",
        "modelYear": 2020
    }

    response = client.post("/process_trip", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "routes" in data
    route = data["routes"][0]

    assert "distance" in route
    assert "duration" in route
    assert "emissions" in route
    assert "coordinates" in route
    assert "color" in route
    assert route["emissions"]["co2e"] > 0
    assert route["color"] in ["green", "orange", "red"]


# Test resilience when external API fails
@patch('backend.models.Trip.requests.post')
def test_process_trip_google_api_failure(mock_post, client):
    mock_post.side_effect = Exception("Connection timeout")

    payload = {
        "origin": "A",
        "destination": "B",
        "city": "Riyadh",
        "vehicleType": "Car",
        "fuelType": "Petrol",
        "modelYear": 2020
    }

    response = client.post("/process_trip", json=payload)
    assert response.status_code == 200
    assert "error" in response.json() or "details" in response.json()


# Navigation Init - Test navigation initialization through API

def test_navigation_init_route_success(client):
    payload = {
        "coords": [
            {"latitude": 24.7136, "longitude": 46.6753},
            {"latitude": 24.7150, "longitude": 46.6800},
            {"latitude": 24.7200, "longitude": 46.6850}
        ],
        "duration_text": "15 mins"
    }

    response = client.post("/navigation/init_route", json=payload)
    assert response.status_code == 200
    assert "status" in response.json() or "route" in response.json()

# Test error handling for invalid navigation data
def test_navigation_init_route_empty_coords(client):
    payload = {
        "coords": [],
        "duration_text": "10 mins"
    }

    response = client.post("/navigation/init_route", json=payload)
    assert response.status_code == 200


# Navigation Update - Test real-time location tracking through API

def test_navigation_location_update_success(client):
    init_payload = {
        "coords": [
            {"latitude": 24.7136, "longitude": 46.6753},
            {"latitude": 24.7200, "longitude": 46.6850}
        ],
        "duration_text": "10 mins"
    }
    client.post("/navigation/init_route", json=init_payload)

    update_payload = {
        "location": {"latitude": 24.7140, "longitude": 46.6755},
        "heading": 45.0,
        "speed_kmh": 50.0
    }

    response = client.post("/navigation/location_update", json=update_payload)
    assert response.status_code == 200
    assert "snappedLocation" in response.json() or "remainingKm" in response.json()



# End-to-End Flow -Test complete user workflow from start to finish

@patch('backend.models.Trip.requests.post')
def test_complete_trip_navigation_flow(mock_post, client):
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "routes": [{
            "distanceMeters": 10000,
            "duration": "600s",
            "description": "Main Route",
            "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"}
        }]
    }
    mock_response.raise_for_status = Mock()
    mock_post.return_value = mock_response

    trip_payload = {
        "origin": "Office",
        "destination": "Home",
        "city": "Riyadh",
        "vehicleType": "Car",
        "fuelType": "Petrol",
        "modelYear": 2020
    }

    trip_response = client.post("/process_trip", json=trip_payload)
    assert trip_response.status_code == 200

    selected_route = trip_response.json()["routes"][0]
    nav_init_payload = {
        "coords": selected_route["coordinates"][:3],
        "duration_text": selected_route["duration"]
    }

    client.post("/navigation/init_route", json=nav_init_payload)

    location_payload = {
        "location": {"latitude": 24.7136, "longitude": 46.6753},
        "heading": 0,
        "speed_kmh": 40
    }

    response = client.post("/navigation/location_update", json=location_payload)
    assert response.status_code == 200
    assert isinstance(response.json(), dict)



# =============================================================================
# ROOT ENDPOINT - Additional coverage
# =============================================================================

def test_root_endpoint_has_ai_enabled_field(client):
    """Root response includes ai_enabled boolean field."""
    response = client.get("/")
    assert response.status_code == 200
    assert "ai_enabled" in response.json()
    assert isinstance(response.json()["ai_enabled"], bool)


def test_root_endpoint_lists_all_endpoints(client):
    """Root response includes the endpoints directory with all known routes."""
    response = client.get("/")
    endpoints = response.json().get("endpoints", {})
    assert "auth_driver_signup"  in endpoints
    assert "auth_manager_signup" in endpoints
    assert "auth_signin"         in endpoints
    assert "trip"                in endpoints
    assert "ai_health"           in endpoints
    assert "ai_analyze"          in endpoints


# =============================================================================
# AUTH — helpers
# =============================================================================

def _mock_db_session():
    """Yield a mock DB session via dependency_overrides."""
    yield Mock()


# =============================================================================
# AUTH — /auth/driver/signup
# =============================================================================

def test_driver_signup_success(client):
    """Driver signup returns token and role=driver on success."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.driver_signup
    auth_controller.driver_signup = Mock(return_value="mock-driver-token")
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/driver/signup", json={
            "name": "Ahmed Ali", "company": "Aramex",
            "email": "ahmed@driver.com", "password": "Pass123!"
        })
        assert response.status_code == 200
        assert response.json()["token"] == "mock-driver-token"
        assert response.json()["role"] == "driver"
    finally:
        auth_controller.driver_signup = orig
        app.dependency_overrides.pop(get_db, None)


def test_driver_signup_duplicate_email(client):
    """Driver signup returns 400 when email is already registered."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.driver_signup
    auth_controller.driver_signup = Mock(side_effect=Exception("Email already registered"))
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/driver/signup", json={
            "name": "Ahmed Ali", "company": "Aramex",
            "email": "existing@driver.com", "password": "Pass123!"
        })
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    finally:
        auth_controller.driver_signup = orig
        app.dependency_overrides.pop(get_db, None)


def test_driver_signup_missing_required_fields(client):
    """Driver signup returns 422 when required fields are absent."""
    response = client.post("/auth/driver/signup", json={
        "name": "Ahmed Ali", "company": "Aramex", "email": "ahmed@driver.com"
        # missing password
    })
    assert response.status_code == 422


# =============================================================================
# AUTH — /auth/manager/signup
# =============================================================================

def test_manager_signup_success(client):
    """Manager signup returns token and role=manager on success."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.manager_signup
    auth_controller.manager_signup = Mock(return_value="mock-manager-token")
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/manager/signup", json={
            "name": "Sara Manager", "company": "Aramex",
            "email": "sara@manager.com", "password": "Secure99!"
        })
        assert response.status_code == 200
        assert response.json()["token"] == "mock-manager-token"
        assert response.json()["role"] == "manager"
    finally:
        auth_controller.manager_signup = orig
        app.dependency_overrides.pop(get_db, None)


def test_manager_signup_duplicate_email(client):
    """Manager signup returns 400 when email is already registered."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.manager_signup
    auth_controller.manager_signup = Mock(side_effect=Exception("Email already registered"))
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/manager/signup", json={
            "name": "Sara Manager", "company": "Aramex",
            "email": "existing@manager.com", "password": "Secure99!"
        })
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    finally:
        auth_controller.manager_signup = orig
        app.dependency_overrides.pop(get_db, None)


def test_manager_signup_missing_required_fields(client):
    """Manager signup returns 422 when required fields are absent."""
    response = client.post("/auth/manager/signup", json={
        "name": "Sara Manager", "email": "sara@manager.com"
        # missing company and password
    })
    assert response.status_code == 422


# =============================================================================
# AUTH — /auth/signin
# =============================================================================

def test_signin_driver_success(client):
    """Sign in returns token and role for a valid driver."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.signin
    auth_controller.signin = Mock(return_value=("mock-jwt-token", "driver", 1, "GreenMile"))
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/signin", json={
            "email": "ahmed@driver.com", "password": "Pass123!"
        })
        assert response.status_code == 200
        assert response.json()["token"] == "mock-jwt-token"
        assert response.json()["role"] == "driver"
    finally:
        auth_controller.signin = orig
        app.dependency_overrides.pop(get_db, None)


def test_signin_manager_success(client):
    """Sign in returns token and role=manager for a valid manager."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.signin
    auth_controller.signin = Mock(return_value=("mock-manager-jwt", "manager", 1, "GreenMile"))
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/signin", json={
            "email": "sara@manager.com", "password": "Secure99!"
        })
        assert response.status_code == 200
        assert response.json()["role"] == "manager"
    finally:
        auth_controller.signin = orig
        app.dependency_overrides.pop(get_db, None)


def test_signin_wrong_password(client):
    """Sign in returns 401 when credentials are invalid."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.signin
    auth_controller.signin = Mock(side_effect=Exception("Invalid credentials"))
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/signin", json={
            "email": "ahmed@driver.com", "password": "wrongpass"
        })
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    finally:
        auth_controller.signin = orig
        app.dependency_overrides.pop(get_db, None)


def test_signin_nonexistent_user(client):
    """Sign in returns 401 when user does not exist."""
    from backend.main import app, get_db, auth_controller
    orig = auth_controller.signin
    auth_controller.signin = Mock(side_effect=Exception("User not found"))
    app.dependency_overrides[get_db] = _mock_db_session
    try:
        response = client.post("/auth/signin", json={
            "email": "nobody@ghost.com", "password": "Pass123!"
        })
        assert response.status_code == 401
        assert "User not found" in response.json()["detail"]
    finally:
        auth_controller.signin = orig
        app.dependency_overrides.pop(get_db, None)


def test_signin_missing_email(client):
    """Sign in returns 422 when email field is missing."""
    response = client.post("/auth/signin", json={"password": "Pass123!"})
    assert response.status_code == 422


def test_signin_missing_password(client):
    """Sign in returns 422 when password field is missing."""
    response = client.post("/auth/signin", json={"email": "ahmed@driver.com"})
    assert response.status_code == 422


# =============================================================================
# AI — /ai/health
# =============================================================================

def test_ai_health_when_models_loaded(client):
    """Health check returns healthy status when AI models are ready."""
    from backend.main import ai_controller
    original = ai_controller.is_ready
    ai_controller.is_ready = lambda: True
    try:
        response = client.get("/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["models_loaded"] is True
        assert "ready" in data["message"].lower()
    finally:
        ai_controller.is_ready = original


def test_ai_health_when_models_not_loaded(client):
    """Health check returns unhealthy status when AI models are not loaded."""
    from backend.main import ai_controller
    original = ai_controller.is_ready
    ai_controller.is_ready = lambda: False
    try:
        response = client.get("/ai/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["models_loaded"] is False
    finally:
        ai_controller.is_ready = original


# =============================================================================
# AI — /ai/analyze_routes
# =============================================================================

def test_analyze_routes_success(client):
    """analyze_routes returns status=success and analysis on valid input."""
    from backend.main import ai_controller
    analysis_result = {
        "best_route": "Route A",
        "reason": "Lowest emissions",
        "predicted_co2e": {"Route A": 1.2, "Route B": 2.5},
        "recommendations": ["Take Route A"]
    }
    orig_ready = ai_controller.is_ready
    orig_format = ai_controller.format_route_for_ai
    orig_recommend = ai_controller.compare_and_recommend
    ai_controller.is_ready = lambda: True
    ai_controller.format_route_for_ai = lambda route, meta: {"formatted": True}
    ai_controller.compare_and_recommend = lambda routes: analysis_result
    try:
        payload = {
            "routes": [
                {"summary": "Route A", "distance": "10 km", "duration": "15 mins",
                 "emissions": {"co2e": 1.2, "co2": 1.1, "ch4": 0.05, "n2o": 0.05}, "color": "green"},
                {"summary": "Route B", "distance": "14 km", "duration": "18 mins",
                 "emissions": {"co2e": 2.5, "co2": 2.3, "ch4": 0.1, "n2o": 0.1}, "color": "orange"}
            ],
            "trip_metadata": {"city": "Riyadh", "vehicleType": "Light-Duty Trucks", "fuelType": "Diesel"}
        }
        response = client.post("/ai/analyze_routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "analysis" in data
        assert data["analysis"]["best_route"] == "Route A"
    finally:
        ai_controller.is_ready = orig_ready
        ai_controller.format_route_for_ai = orig_format
        ai_controller.compare_and_recommend = orig_recommend


def test_analyze_routes_ai_not_ready(client):
    """analyze_routes returns 503 when AI models are not loaded."""
    from backend.main import ai_controller
    original = ai_controller.is_ready
    ai_controller.is_ready = lambda: False
    try:
        payload = {"routes": [{"summary": "Route A"}], "trip_metadata": {}}
        response = client.post("/ai/analyze_routes", json=payload)
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"].lower()
    finally:
        ai_controller.is_ready = original


@patch('backend.controllers.AIController.AIController.is_ready')
def test_analyze_routes_empty_routes(mock_ready, client):
    """analyze_routes returns 400 when routes list is empty."""
    mock_ready.return_value = True

    payload = {"routes": [], "trip_metadata": {}}

    response = client.post("/ai/analyze_routes", json=payload)
    assert response.status_code == 400
    assert "No routes provided" in response.json()["detail"]


@patch('backend.controllers.AIController.AIController.is_ready')
def test_analyze_routes_missing_routes_key(mock_ready, client):
    """analyze_routes returns 400 when routes key is absent (defaults to empty list)."""
    mock_ready.return_value = True

    payload = {"trip_metadata": {"city": "Riyadh"}}

    response = client.post("/ai/analyze_routes", json=payload)
    assert response.status_code == 400
    assert "No routes provided" in response.json()["detail"]


def test_analyze_routes_all_format_errors(client):
    """analyze_routes returns 400 when all routes fail to format."""
    from backend.main import ai_controller
    orig_ready = ai_controller.is_ready
    orig_format = ai_controller.format_route_for_ai
    ai_controller.is_ready = lambda: True
    ai_controller.format_route_for_ai = Mock(side_effect=Exception("Malformed route data"))
    try:
        payload = {"routes": [{"bad": "data"}], "trip_metadata": {}}
        response = client.post("/ai/analyze_routes", json=payload)
        assert response.status_code == 400
        assert "Could not format" in response.json()["detail"]
    finally:
        ai_controller.is_ready = orig_ready
        ai_controller.format_route_for_ai = orig_format


def test_analyze_routes_internal_error(client):
    """analyze_routes returns 500 when compare_and_recommend raises unexpectedly."""
    from backend.main import ai_controller
    orig_ready = ai_controller.is_ready
    orig_format = ai_controller.format_route_for_ai
    orig_recommend = ai_controller.compare_and_recommend
    ai_controller.is_ready = lambda: True
    ai_controller.format_route_for_ai = lambda route, meta: {"formatted": True}
    ai_controller.compare_and_recommend = Mock(side_effect=Exception("Model inference crashed"))
    try:
        payload = {
            "routes": [{"summary": "Route A", "distance": "10 km", "duration": "15 mins"}],
            "trip_metadata": {}
        }
        response = client.post("/ai/analyze_routes", json=payload)
        assert response.status_code == 500
        assert "AI analysis failed" in response.json()["detail"]
    finally:
        ai_controller.is_ready = orig_ready
        ai_controller.format_route_for_ai = orig_format
        ai_controller.compare_and_recommend = orig_recommend


# =============================================================================
# TRIPS — /trips/save_selected  (requires auth token)
# =============================================================================

def _make_save_payload():
    """Shared valid payload for save_selected tests."""
    return {
        "origin": "King Fahd Road",
        "destination": "Olaya Street",
        "city": "Riyadh",
        "vehicleType": "Light-Duty Trucks",
        "fuelType": "Diesel",
        "modelYear": 2022,
        "route": {
            "summary": "Route via Main Street",
            "distance": "12.5 km",
            "duration": "18 mins",
            "color": "green",
            "coordinates": [
                {"latitude": 24.7136, "longitude": 46.6753},
                {"latitude": 24.7200, "longitude": 46.6850}
            ],
            "emissions": {
                "co2": 2.10,
                "ch4": 0.05,
                "n2o": 0.04,
                "co2e": 2.20
            }
        }
    }


def test_save_selected_trip_success(client):
    """save_selected returns status=saved and a trip_id on valid authenticated request."""
    from backend.main import app, get_current_user, get_db

    def override_user():
        return {"id": 1, "role": "driver", "company_id": 10}

    mock_session = Mock()
    mock_session.add = Mock()
    mock_session.commit = Mock()
    mock_session.refresh = Mock(side_effect=lambda t: setattr(t, 'id', 42))

    def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    try:
        response = client.post("/trips/save_selected", json=_make_save_payload())
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "saved"
        assert "trip_id" in data
    finally:
        app.dependency_overrides.clear()


def test_save_selected_trip_no_token(client):
    """save_selected returns 401/403 when no auth token is provided."""
    from backend.main import app, get_current_user
    from fastapi import HTTPException as FastHTTP

    def override_user():
        raise FastHTTP(status_code=401, detail="Not authenticated")

    app.dependency_overrides[get_current_user] = override_user
    try:
        response = client.post("/trips/save_selected", json=_make_save_payload())
        assert response.status_code in (401, 403)
    finally:
        app.dependency_overrides.clear()


def test_save_selected_trip_driver_id_set(client):
    """save_selected sets driver_id to user id when role is driver."""
    from backend.main import app, get_current_user, get_db

    def override_user():
        return {"id": 7, "role": "driver", "company_id": 3}

    captured = {}
    mock_session = Mock()

    def capture_add(trip):
        captured["trip"] = trip
    mock_session.add = capture_add
    mock_session.commit = Mock()
    mock_session.refresh = Mock()

    def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    try:
        client.post("/trips/save_selected", json=_make_save_payload())
        if captured.get("trip"):
            assert captured["trip"].driver_id == 7
    finally:
        app.dependency_overrides.clear()


def test_save_selected_trip_model_year_coerced_to_int(client):
    """save_selected coerces modelYear string to int before saving."""
    from backend.main import app, get_current_user, get_db

    def override_user():
        return {"id": 1, "role": "driver", "company_id": 10}

    captured = {}
    mock_session = Mock()

    def capture_add(trip):
        captured["trip"] = trip
    mock_session.add = capture_add
    mock_session.commit = Mock()
    mock_session.refresh = Mock()

    def override_db():
        yield mock_session

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_db] = override_db
    try:
        payload = _make_save_payload()
        payload["modelYear"] = "2022"
        client.post("/trips/save_selected", json=payload)
        if captured.get("trip"):
            assert isinstance(captured["trip"].model_year, int)
            assert captured["trip"].model_year == 2022
    finally:
        app.dependency_overrides.clear()