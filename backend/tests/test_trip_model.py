import pytest
from unittest.mock import Mock, patch
from backend.models.Trip import Trip



@pytest.fixture
def mock_ghg_data():
    
    return {
        "fuel_consumption": {
            "Passenger Cars": 0.08,          
            "Light-Duty Trucks": 0.12,        
            "Medium- and Heavy-Duty Vehicles (Trucks)": 0.25,  
            "Motorcycles": 0.05               
        },
        "factors": [
            {
                "vehicle_type": "Passenger Cars",
                "fuel_type": "Petrol",
                "model_year_range": "2020",
                "co2_factor": 2.31,          
                "ch4_factor": 0.0001,         
                "n2o_factor": 0.0001         
            },
            {
                "vehicle_type": "Light-Duty Trucks",
                "fuel_type": "Diesel",
                "model_year_range": "2015",
                "co2_factor": 2.68,
                "ch4_factor": 0.00005,
                "n2o_factor": 0.00005
            }
        ]
    }



def test_map_vehicle_category(mock_ghg_data):

    # Create a Trip instance 
    trip = Trip(
        origin="A", 
        destination="B", 
        city="Riyadh",
        vehicleType="Car",  
        fuelType="Petrol",
        modelYear=2020,
        ghg_data=mock_ghg_data,
        api_key="fake_key"
    )
    
    assert trip.map_vehicle_category("Car") == "Passenger Cars"
    assert trip.map_vehicle_category("SUV") == "Light-Duty Trucks"
    assert trip.map_vehicle_category("Van") == "Light-Duty Trucks"
    assert trip.map_vehicle_category("Truck") == "Medium- and Heavy-Duty Vehicles (Trucks)"
    assert trip.map_vehicle_category("Motorcycle") == "Motorcycles"
    assert trip.map_vehicle_category("InvalidVehicle") is None 



def test_get_fuel_consumption_rate(mock_ghg_data):
   
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
    
    # Test valid category
    rate = trip.get_fuel_consumption_rate("Passenger Cars")
    assert rate == 0.08  
    
    # Test invalid category (raise error)
    with pytest.raises(ValueError, match="Fuel consumption rate missing"):
        trip.get_fuel_consumption_rate("NonexistentCategory")


def test_get_emissions_factors_exact_match(mock_ghg_data):
  
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
    
    factors = trip.get_emissions_factors("Passenger Cars", "Petrol", 2020)
    
    
    assert factors is not None
    assert factors["co2_factor"] == 2.31
    assert factors["ch4_factor"] == 0.0001
    assert factors["n2o_factor"] == 0.0001


def test_get_emissions_factors_no_match(mock_ghg_data):
   
    trip = Trip("A", "B", "Riyadh", "Car", "CNG", 2020, mock_ghg_data, "key")
    
    factors = trip.get_emissions_factors("Passenger Cars", "CNG", 2020)
    
    assert factors is None  



def test_get_closest_emissions_factors(mock_ghg_data):
   
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2018, mock_ghg_data, "key")
  
    factors = trip.get_closest_emissions_factors("Passenger Cars", "Petrol", 2018)
    
    assert factors is not None
    assert factors["model_year_range"] == "2020"  



def test_decode_polyline(mock_ghg_data):
   
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
    
    encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    
    decoded = trip.decode_polyline(encoded)
    
    assert len(decoded) > 0
    assert isinstance(decoded[0], tuple)
    assert len(decoded[0]) == 2  


#  Google API Call (Mocked)
@patch('backend.models.Trip.requests.post')  # Mock the requests.post function ..how? @patch replaces requests.post with a fake version, our code thinks it's talking to Google, but it's not

def test_fetch_routes_from_google_success(mock_post, mock_ghg_data):
  
    # Create fake API response (what Google would return)
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "routes": [
            {
                "distanceMeters": 5000,
                "duration": "300s",
                "description": "Route 1",
                "polyline": {"encodedPolyline": "_p~iF~ps|U"}
            }
        ]
    }
    mock_post.return_value = mock_response
    
    # Make the API call
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "fake_key")
    result = trip.fetch_routes_from_google()
    
    #  Check the request was made correctly
    assert mock_post.called  # Verify API was called
    assert "routes" in result  # Verify we got routes back
    assert len(result["routes"]) == 1


@patch('backend.models.Trip.requests.post')
def test_get_routes_complete_flow(mock_post, mock_ghg_data):

    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "routes": [
            {
                "distanceMeters": 10000,  
                "duration": "600s",
                "description": "Route A",
                "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"}
            },
            {
                "distanceMeters": 15000,  
                "duration": "900s",
                "description": "Route B",
                "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"}
            },
            {
                "distanceMeters": 12000,  
                "duration": "720s",
                "description": "Route C",
                "polyline": {"encodedPolyline": "_p~iF~ps|U_ulLnnqC"}
            }
        ]
    }
    mock_response.raise_for_status = Mock()
    mock_post.return_value = mock_response
    
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
    result = trip.get_routes()
    
    #  Verify complete processing
    assert "routes" in result
    assert len(result["routes"]) == 3
    
    route1 = result["routes"][0]
    assert route1["color"] == "green"
    assert "emissions" in route1
    assert route1["emissions"]["co2e"] > 0 
    
    assert result["routes"][0]["emissions"]["co2e"] < result["routes"][1]["emissions"]["co2e"]
    assert result["routes"][1]["emissions"]["co2e"] < result["routes"][2]["emissions"]["co2e"]
    
    for route in result["routes"]:
        assert "distance" in route
        assert "duration" in route
        assert "coordinates" in route
        assert "emissions" in route
        assert "color" in route


# System must reject invalid fuel types for specific vehicles
def test_get_routes_unsupported_fuel_type(mock_ghg_data):
   
    with patch('backend.models.Trip.requests.post') as mock_post:
        # Mock successful API call
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "routes": [{
                "distanceMeters": 5000,
                "duration": "300s",
                "description": "Test Route",
                "polyline": {"encodedPolyline": "_p~iF~ps|U"}
            }]
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response
        
        # Try with unsupported fuel type
        trip = Trip("A", "B", "Riyadh", "Car", "CNG", 2020, mock_ghg_data, "key")
        result = trip.get_routes()
        
        assert "error" in result
        assert "does not support fuel type" in result["error"]



@patch('backend.models.Trip.requests.post')
def test_emission_calculation_accuracy(mock_post, mock_ghg_data):
   
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "routes": [{
            "distanceMeters": 10000, 
            "duration": "600s",
            "description": "Test Route",
            "polyline": {"encodedPolyline": "_p~iF~ps|U"}
        }]
    }
    mock_response.raise_for_status = Mock()
    mock_post.return_value = mock_response
    
    trip = Trip("A", "B", "Riyadh", "Car", "Petrol", 2020, mock_ghg_data, "key")
    result = trip.get_routes()
    
    route = result["routes"][0]
    emissions = route["emissions"]
    
    distance_km = 10
    fuel_rate = 0.08  
    fuel_used = distance_km * fuel_rate 
    
    expected_co2 = fuel_used * 2.31  
    expected_ch4 = distance_km * 0.0001  
    expected_n2o = distance_km * 0.0001  
    expected_co2e = expected_co2 + (expected_ch4 * 25) + (expected_n2o * 298)
    
    # Allow small floating-point differences
    assert abs(emissions["co2"] - expected_co2) < 0.01
    assert abs(emissions["ch4"] - expected_ch4) < 0.00001
    assert abs(emissions["n2o"] - expected_n2o) < 0.00001
    assert abs(emissions["co2e"] - expected_co2e) < 0.01