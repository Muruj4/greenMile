import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch
from backend.controllers.DashboardController import router


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def mock_db():
    return object()


@patch("backend.controllers.DashboardController.get_emissions_breakdown_current_month")
@patch("backend.controllers.DashboardController.get_route_distribution_current_month")
@patch("backend.controllers.DashboardController.get_total_co2e_current_month")
@patch("backend.controllers.DashboardController.get_total_vehicles")
@patch("backend.controllers.DashboardController.get_total_trips")
@patch("backend.controllers.DashboardController.get_total_drivers")
@patch("backend.controllers.DashboardController.get_fuel_cost_savings_percentage")
def test_get_dashboard_returns_expected_response(
    mock_savings,
    mock_drivers,
    mock_trips,
    mock_vehicles,
    mock_total_co2e,
    mock_route_distribution,
    mock_emissions_breakdown,
    client,
):
    mock_drivers.return_value = 5
    mock_savings.return_value = 18.5
    mock_trips.return_value = 20
    mock_vehicles.return_value = 3
    mock_total_co2e.return_value = 1200.75
    mock_route_distribution.return_value = {
        "green": 10,
        "orange": 6,
        "red": 4,
    }
    mock_emissions_breakdown.return_value = {
        "co2": 1000.12,
        "ch4": 0.1234,
        "n2o": 0.0456,
    }

    response = client.get("/dashboard/1")

    assert response.status_code == 200
    assert response.json() == {
        "totalDrivers": 5,
        "get_fuel_cost_savings_percentage": 18.5,
        "totalTrips": 20,
        "totalVehicles": 3,
        "totalCO2e": 1200.75,
        "routeDistribution": {
            "green": 10,
            "orange": 6,
            "red": 4,
        },
        "emissionsBreakdown": {
            "co2": 1000.12,
            "ch4": 0.1234,
            "n2o": 0.0456,
        },
    }


@patch("backend.controllers.DashboardController.get_emissions_breakdown_current_month")
@patch("backend.controllers.DashboardController.get_route_distribution_current_month")
@patch("backend.controllers.DashboardController.get_total_co2e_current_month")
@patch("backend.controllers.DashboardController.get_total_vehicles")
@patch("backend.controllers.DashboardController.get_total_trips")
@patch("backend.controllers.DashboardController.get_total_drivers")
@patch("backend.controllers.DashboardController.get_fuel_cost_savings_percentage")
def test_get_dashboard_contains_all_required_keys(
    mock_savings,
    mock_drivers,
    mock_trips,
    mock_vehicles,
    mock_total_co2e,
    mock_route_distribution,
    mock_emissions_breakdown,
    client,
):
    mock_drivers.return_value = 0
    mock_savings.return_value = 0.0
    mock_trips.return_value = 0
    mock_vehicles.return_value = 0
    mock_total_co2e.return_value = 0.0
    mock_route_distribution.return_value = {
        "green": 0,
        "orange": 0,
        "red": 0,
    }
    mock_emissions_breakdown.return_value = {
        "co2": 0.0,
        "ch4": 0.0,
        "n2o": 0.0,
    }

    response = client.get("/dashboard/99")

    assert response.status_code == 200

    data = response.json()
    assert "totalDrivers" in data
    assert "get_fuel_cost_savings_percentage" in data
    assert "totalTrips" in data
    assert "totalVehicles" in data
    assert "totalCO2e" in data
    assert "routeDistribution" in data
    assert "emissionsBreakdown" in data