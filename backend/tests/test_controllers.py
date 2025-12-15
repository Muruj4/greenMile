import pytest
from unittest.mock import Mock, patch
from backend.controllers.TripController import TripController
from backend.controllers.NavigationController import NavigationController

#a
@pytest.fixture
def mock_ghg_data():
    return {
        "fuel_consumption": {
            "Passenger Cars": 0.08,
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



def test_trip_controller_process_trip_success(mock_ghg_data):
   
    controller = TripController(api_key="test_key", ghg_data=mock_ghg_data)
    
   # Mock the Trip model's get_routes method
    with patch('backend.controllers.TripController.Trip') as MockTrip:
        mock_trip_instance = Mock()
        mock_trip_instance.get_routes.return_value = {
            "routes": [
                {
                    "distance": "10 km",
                    "duration": "15 mins",
                    "emissions": {"co2e": 2.5},
                    "color": "green"
                }
            ]
        }
        MockTrip.return_value = mock_trip_instance
        
        # Call controller
        result = controller.process_trip(
            origin="LocationA",
            destination="LocationB",
            city="Riyadh",
            vehicleType="Car",
            fuelType="Petrol",
            modelYear=2020
        )
        
        MockTrip.assert_called_once()  
        mock_trip_instance.get_routes.assert_called_once()  
        
        # Check result is returned correctly
        assert "routes" in result
        assert len(result["routes"]) == 1



def test_trip_controller_handles_model_exception(mock_ghg_data):
    
    # Test TripController handles exceptions from Trip model
 
    controller = TripController(api_key="test_key", ghg_data=mock_ghg_data)
    
    with patch('backend.controllers.TripController.Trip') as MockTrip:
        mock_trip_instance = Mock()

       # Simulate model raising an error
        mock_trip_instance.get_routes.side_effect = Exception("Model failure")
        MockTrip.return_value = mock_trip_instance
        
        result = controller.process_trip(
            origin="A", destination="B", city="Riyadh",
            vehicleType="Car", fuelType="Petrol", modelYear=2020
        )
        
        # Error is caught and returned
        assert "error" in result
        assert "Trip processing failed" in result["error"]
        assert "Model failure" in result["details"]



def test_trip_controller_passes_all_parameters(mock_ghg_data):
   
    controller = TripController(api_key="secret_key", ghg_data=mock_ghg_data)
    
    with patch('backend.controllers.TripController.Trip') as MockTrip:
        mock_trip_instance = Mock()
        mock_trip_instance.get_routes.return_value = {"routes": []}
        MockTrip.return_value = mock_trip_instance
        
        controller.process_trip(
            origin="Point A",
            destination="Point B",
            city="Jeddah",
            vehicleType="SUV",
            fuelType="Diesel",
            modelYear=2018
        )
        
        MockTrip.assert_called_once_with(
            "Point A",          
            "Point B",           
            "Jeddah",            
            "SUV",               
            "Diesel",            
            2018,                
            mock_ghg_data,
            "secret_key"         
        )


#
def test_navigation_controller_init_route():
   
    controller = NavigationController()
    
    with patch.object(controller.nav, 'init_route') as mock_init:
        mock_init.return_value = {"status": "initialized"}
        
        coords = [
            {"latitude": 24.7136, "longitude": 46.6753},
            {"latitude": 24.7200, "longitude": 46.6850}
        ]
        duration_text = "15 mins"
        
        result = controller.init_route(coords, duration_text)
        
        mock_init.assert_called_once_with(coords, duration_text)
        assert result["status"] == "initialized"



def test_navigation_controller_location_update():
   
    controller = NavigationController()
    
    with patch.object(controller.nav, 'update_location') as mock_update:
        mock_update.return_value = {
            "snappedLocation": {"latitude": 24.7136, "longitude": 46.6753},
            "remainingKm": 5.2,
            "etaMinutes": 8
        }
        
        location = {"latitude": 24.7140, "longitude": 46.6755}
        heading = 45.0
        speed_kmh = 60.0
        
        result = controller.location_update(location, heading, speed_kmh)
        
        mock_update.assert_called_once_with(location, heading, speed_kmh)
        assert "snappedLocation" in result
        assert result["remainingKm"] == 5.2



def test_navigation_controller_init_route_error():
    
    # Test error handling when Navigation.init_route fails
    
    controller = NavigationController()
    
    with patch.object(controller.nav, 'init_route') as mock_init:
        # Simulate model error
        mock_init.side_effect = Exception("Invalid route data")
        
        try:
            result = controller.init_route([], "10 mins")
            
        except Exception as e:
        
            assert "Invalid route data" in str(e)



def test_navigation_controller_location_update_error():
    # Test error handling when Navigation.update_location fails
    
    
    controller = NavigationController()
    
    with patch.object(controller.nav, 'update_location') as mock_update:
        mock_update.side_effect = Exception("GPS signal lost")
        
        location = {"latitude": 24.7136, "longitude": 46.6753}
        
        try:
            result = controller.location_update(location, 0, 40)
        except Exception as e:
            assert "GPS signal lost" in str(e)


#
def test_trip_controller_initialization(mock_ghg_data):
    # Test TripController stores API key and GHG data on init
    
   
    api_key = "test_api_key_12345"
    
    controller = TripController(api_key=api_key, ghg_data=mock_ghg_data)
    
    assert controller.api_key == api_key
    assert controller.ghg_data == mock_ghg_data


def test_navigation_controller_initialization():
    
    controller = NavigationController()
    
    assert controller.nav is not None
    assert hasattr(controller.nav, 'init_route')
    assert hasattr(controller.nav, 'update_location')


# 
def test_trip_controller_does_not_modify_result(mock_ghg_data):
    
   # Test that controller returns model result without modification
    

    controller = TripController(api_key="key", ghg_data=mock_ghg_data)
    
    with patch('backend.controllers.TripController.Trip') as MockTrip:
        model_response = {
            "routes": [{"distance": "10 km"}],
            "metadata": {"processingTime": 123},
            "customField": "custom value"
        }
        
        mock_trip_instance = Mock()
        mock_trip_instance.get_routes.return_value = model_response
        MockTrip.return_value = mock_trip_instance
        
        result = controller.process_trip(
            "A", "B", "Riyadh", "Car", "Petrol", 2020
        )
        
        assert result == model_response
        assert "routes" in result
        assert "metadata" in result
        assert "customField" in result



