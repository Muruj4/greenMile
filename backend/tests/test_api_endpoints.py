import pytest
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

