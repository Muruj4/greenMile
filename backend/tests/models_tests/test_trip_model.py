import pytest
import requests
from unittest.mock import Mock, patch
from backend.models.Trip import Trip


@pytest.fixture
def mock_ghg_data():
    return {
        "fuel_consumption": {
            "Passenger Cars": 0.08,
            "Light-Duty Trucks": 0.12,
            "Medium- and Heavy-Duty Vehicles": 0.25,
            "Motorcycles": 0.05,
        },
        "factors": [
            {
                "vehicle_type": "Passenger Cars",
                "fuel_type": "Petrol",
                "model_year_range": "2020",
                "co2_factor": 2.31,
                "ch4_factor": 0.0001,
                "n2o_factor": 0.0001,
            },
            {
                "vehicle_type": "Light-Duty Trucks",
                "fuel_type": "Diesel",
                "model_year_range": "2015",
                "co2_factor": 2.68,
                "ch4_factor": 0.00005,
                "n2o_factor": 0.00005,
            },
        ],
    }


@pytest.fixture
def trip(mock_ghg_data):
    return Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "fake_key")


class TestTripUnit:
    def test_map_vehicle_category(self, trip):
        assert trip.map_vehicle_category("Car") == "Passenger Cars"
        assert trip.map_vehicle_category("SUV") == "Light-Duty Trucks"
        assert trip.map_vehicle_category("Van") == "Light-Duty Trucks"
        assert trip.map_vehicle_category("Truck") == "Medium- and Heavy-Duty Vehicles"
        assert trip.map_vehicle_category("Motorcycle") == "Motorcycles"
        assert trip.map_vehicle_category("InvalidVehicle") is None

    def test_get_fuel_consumption_rate_valid(self, trip):
        assert trip.get_fuel_consumption_rate("Passenger Cars") == 0.08

    def test_get_fuel_consumption_rate_invalid(self, trip):
        with pytest.raises(ValueError, match="Fuel consumption rate missing"):
            trip.get_fuel_consumption_rate("NonexistentCategory")

    def test_get_emissions_factors_exact_match(self, trip):
        factors = trip.get_emissions_factors("Passenger Cars", "Petrol", 2020)

        assert factors is not None
        assert factors["co2_factor"] == 2.31
        assert factors["ch4_factor"] == 0.0001
        assert factors["n2o_factor"] == 0.0001

    def test_get_emissions_factors_no_match(self, mock_ghg_data):
        t = Trip("A", "B", "Riyadh", "Car", "CNG", 2020, mock_ghg_data, "key")
        factors = t.get_emissions_factors("Passenger Cars", "CNG", 2020)
        assert factors is None

    def test_get_closest_emissions_factors(self, mock_ghg_data):
        t = Trip("A", "B", "Riyadh", "Car", "Petrol", 2018, mock_ghg_data, "key")
        factors = t.get_closest_emissions_factors("Passenger Cars", "Petrol", 2018)

        assert factors is not None
        assert factors["model_year_range"] == "2020"

    def test_decode_polyline(self, trip):
        encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
        decoded = trip.decode_polyline(encoded)

        assert len(decoded) > 0
        assert isinstance(decoded[0], tuple)
        assert len(decoded[0]) == 2

    def test_decode_polyline_invalid_raises_value_error(self, trip):
        with pytest.raises(ValueError, match="Failed to decode polyline"):
            trip.decode_polyline("invalid@@@")

    def test_get_emissions_factors_missing_category_raises_error(self, trip):
        with pytest.raises(ValueError, match="Vehicle category mapping failed"):
            trip.get_emissions_factors(None, "Petrol", 2020)

    def test_get_emissions_factors_missing_fuel_raises_error(self, trip):
        with pytest.raises(ValueError, match="Fuel type is missing"):
            trip.get_emissions_factors("Passenger Cars", None, 2020)

    def test_get_emissions_factors_missing_year_raises_error(self, trip):
        with pytest.raises(ValueError, match="Model year is missing"):
            trip.get_emissions_factors("Passenger Cars", "Petrol", None)


class TestTripIntegration:
    @patch("backend.models.Trip.requests.post")
    def test_fetch_routes_from_google_success(self, mock_post, mock_ghg_data):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "routes": [
                {
                    "distanceMeters": 5000,
                    "duration": "300s",
                    "description": "Route 1",
                    "polyline": {"encodedPolyline": "_p~iF~ps|U"},
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        t = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "fake_key")
        result = t.fetch_routes_from_google()

        assert mock_post.called
        assert "routes" in result
        assert len(result["routes"]) == 1

    @patch("backend.models.Trip.requests.post")
    def test_fetch_routes_from_google_failure(self, mock_post, mock_ghg_data):
        mock_post.side_effect = requests.exceptions.RequestException("Connection failed")

        t = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "fake_key")
        result = t.fetch_routes_from_google()

        assert "error" in result
        assert "Failed to contact Google Directions API" in result["error"]
        assert "Connection failed" in result["details"]

    @patch("backend.models.Trip.requests.post")
    def test_get_routes_complete_flow(self, mock_post, mock_ghg_data):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "routes": [
                {
                    "distanceMeters": 10000,
                    "duration": "600s",
                    "description": "Route A",
                    "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"},
                },
                {
                    "distanceMeters": 15000,
                    "duration": "900s",
                    "description": "Route B",
                    "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"},
                },
                {
                    "distanceMeters": 12000,
                    "duration": "720s",
                    "description": "Route C",
                    "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"},
                },
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        t = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
        result = t.get_routes()

        assert "routes" in result
        assert len(result["routes"]) == 3

        for route in result["routes"]:
            assert "summary" in route
            assert "distance_km" in route
            assert "duration_min" in route
            assert "distance" in route
            assert "duration" in route
            assert "coordinates" in route
            assert "fuel_used_liters" in route
            assert "emissions" in route
            assert "color" in route

        assert result["routes"][0]["color"] == "green"
        assert result["routes"][1]["color"] == "orange"
        assert result["routes"][2]["color"] == "red"

        assert result["routes"][0]["emissions"]["co2e"] < result["routes"][1]["emissions"]["co2e"]
        assert result["routes"][1]["emissions"]["co2e"] < result["routes"][2]["emissions"]["co2e"]

    @patch("backend.models.Trip.requests.post")
    def test_get_routes_unsupported_fuel_type(self, mock_post, mock_ghg_data):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "routes": [
                {
                    "distanceMeters": 5000,
                    "duration": "300s",
                    "description": "Test Route",
                    "polyline": {"encodedPolyline": "_p~iF~ps|U"},
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        t = Trip("A", "B", "Riyadh", "Car", "CNG", 2020, mock_ghg_data, "key")
        result = t.get_routes()

        assert "error" in result
        assert "does not support fuel type" in result["error"]

    @patch("backend.models.Trip.requests.post")
    def test_get_routes_returns_google_error_when_routes_missing(self, mock_post, mock_ghg_data):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok"}
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        t = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
        result = t.get_routes()

        assert result["error"] == "Google returned no routes"

    @patch("backend.models.Trip.requests.post")
    def test_emission_calculation_accuracy(self, mock_post, mock_ghg_data):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "routes": [
                {
                    "distanceMeters": 10000,
                    "duration": "600s",
                    "description": "Test Route",
                    "polyline": {"encodedPolyline": "_p~iF~ps|U"},
                }
            ]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        t = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
        result = t.get_routes()

        route = result["routes"][0]
        emissions = route["emissions"]

        distance_km = 10
        fuel_rate = 0.08
        fuel_used = distance_km * fuel_rate

        expected_co2 = fuel_used * 2.31
        expected_ch4 = distance_km * 0.0001
        expected_n2o = distance_km * 0.0001
        expected_co2e = expected_co2 + (expected_ch4 * 25) + (expected_n2o * 298)

        assert abs(route["fuel_used_liters"] - fuel_used) < 0.001
        assert abs(emissions["co2"] - expected_co2) < 0.01
        assert abs(emissions["ch4"] - expected_ch4) < 0.00001
        assert abs(emissions["n2o"] - expected_n2o) < 0.00001
        assert abs(emissions["co2e"] - expected_co2e) < 0.01