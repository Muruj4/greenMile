import pytest
import numpy as np
from unittest.mock import Mock, MagicMock,patch
from backend.controllers.TripController import TripController
from backend.controllers.NavigationController import NavigationController
from controllers.AIController import AIController


_AI_ENGINE_CLASS  = "controllers.AIController.GreenMileRecommendationEngine"
_JOBLIB_LOAD    = "models.ai_models.recommendation_engine.joblib.load"
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


def _mock_engine():
    """Return a fully-configured mock GreenMileRecommendationEngine."""
    engine = MagicMock()
    engine.predict_single_route.return_value = {
        "route_name": "Test Route",
        "predicted_co2e_kg": 5.0,
        "category": "Green",
        "probabilities": {"Green": 0.8, "Yellow": 0.15, "Red": 0.05},
        "fuel_consumption": {
            "fuel_liters": 1.87, "fuel_unit": "L", "fuel_cost_sar": 0.88
        },
        "meta": {
            "distance_km": 20.0, "traffic_conditions": "Light",
            "temperature": 28.0, "fuel_type": "Diesel",
        },
        "warnings": [],
    }
    engine.compare_routes.return_value = {
        "all_routes": [],
        "best_route":  {"route_name": "Route A", "predicted_co2e_kg": 5.0},
        "worst_route": {"route_name": "Route B", "predicted_co2e_kg": 10.0},
        "co2e_saving_kg": 5.0,
        "co2e_saving_percent": 50.0,
        "fuel_saving_liters": 1.87,
        "fuel_saving_percent": 50.0,
        "cost_saving_sar": 0.88,
        "reasons": ["Route A has lower emissions."],
        "recommendations": ["Choose Route A."],
        "generated_at": "2025-05-01 10:00:00",
    }
    return engine


@pytest.fixture
def ai_controller():
    """AIController with engine fully mocked — for unit tests."""
    with patch(_AI_ENGINE_CLASS, return_value=_mock_engine()):
        ctrl = AIController()
    return ctrl


@pytest.fixture
def ai_controller_no_engine():
    """AIController whose engine failed to load (engine = None)."""
    with patch(_AI_ENGINE_CLASS, side_effect=Exception("model files missing")):
        ctrl = AIController()
    return ctrl


@pytest.fixture
def sample_route_info():
    return {
        "summary": "King Fahd Road",
        "distance": "20.5 km",
        "duration": "25 mins",
        "trafficIndex": 15.0,
        "jamsCount": 2,
        "trafficConditions": "moderate",
    }


@pytest.fixture
def sample_trip_metadata():
    return {
        "vehicleType": "Car",
        "fuelType": "Gasoline",
        "city": "Riyadh",
        "temperature": 32.0,
        "humidity": 45.0,
        "windSpeed": 12.0,
    }


class TestAIControllerInit:
    """Unit tests for AIController.__init__ and is_ready()"""

    @pytest.mark.unit
    def test_is_ready_true_when_engine_loads(self, ai_controller):
        assert ai_controller.is_ready() is True

    @pytest.mark.unit
    def test_is_ready_false_when_engine_fails(self, ai_controller_no_engine):
        assert ai_controller_no_engine.is_ready() is False

    @pytest.mark.unit
    def test_engine_is_none_on_load_failure(self, ai_controller_no_engine):
        assert ai_controller_no_engine.engine is None

    @pytest.mark.unit
    def test_engine_is_not_none_on_success(self, ai_controller):
        assert ai_controller.engine is not None

    @pytest.mark.unit
    def test_engine_loaded_with_correct_model_paths(self):
        with patch(_AI_ENGINE_CLASS) as mock_cls:
            mock_cls.return_value = _mock_engine()
            AIController()
            kw = mock_cls.call_args[1]
            assert "regression_model.pkl"     in kw["regression_model_path"]
            assert "classification_model.pkl" in kw["classification_model_path"]
            assert "label_encoders.pkl"       in kw["encoders_path"]
            assert "category_thresholds.pkl"  in kw["thresholds_path"]


# parse_duration

class TestAIParseDuration:
    """Unit tests for AIController._parse_duration()"""

    @pytest.mark.unit
    def test_minutes_only(self, ai_controller):
        assert ai_controller._parse_duration("30 mins") == 30.0

    @pytest.mark.unit
    def test_minutes_singular(self, ai_controller):
        assert ai_controller._parse_duration("1 min") == 1.0

    @pytest.mark.unit
    def test_hours_only(self, ai_controller):
        assert ai_controller._parse_duration("2 hours") == 120.0

    @pytest.mark.unit
    def test_hours_and_minutes(self, ai_controller):
        assert ai_controller._parse_duration("1 hour 30 mins") == 90.0

    @pytest.mark.unit
    def test_hours_and_minutes_no_space(self, ai_controller):
        assert ai_controller._parse_duration("2hours 15mins") == 135.0

    @pytest.mark.unit
    def test_zero_duration_returns_default(self, ai_controller):
        assert ai_controller._parse_duration("0 mins") == 30.0

    @pytest.mark.unit
    def test_empty_string_returns_default(self, ai_controller):
        assert ai_controller._parse_duration("") == 30.0

    @pytest.mark.unit
    def test_nonsense_string_returns_default(self, ai_controller):
        assert ai_controller._parse_duration("fast ride") == 30.0

    @pytest.mark.unit
    def test_returns_float(self, ai_controller):
        assert isinstance(ai_controller._parse_duration("45 mins"), float)

    @pytest.mark.unit
    def test_case_insensitive(self, ai_controller):
        assert ai_controller._parse_duration("45 MINS") == 45.0

    @pytest.mark.unit
    def test_large_duration(self, ai_controller):
        assert ai_controller._parse_duration("5 hours") == 300.0


# determine_road_type

class TestAIDetermineRoadType:
    """Unit tests for AIController._determine_road_type()"""

    @pytest.mark.unit
    def test_highway_keyword(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": "King Fahd Highway"}) == "Highway"

    @pytest.mark.unit
    def test_freeway_keyword(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": "Northern Freeway"}) == "Highway"

    @pytest.mark.unit
    def test_rural_keyword(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": "rural road"}) == "Rural"


    @pytest.mark.unit
    def test_urban_default(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": "King Abdullah Street"}) == "Urban"

    @pytest.mark.unit
    def test_empty_summary_returns_urban(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": ""}) == "Urban"

    @pytest.mark.unit
    def test_missing_summary_returns_urban(self, ai_controller):
        assert ai_controller._determine_road_type({}) == "Urban"

    @pytest.mark.unit
    def test_case_insensitive_highway(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": "HIGHWAY 40"}) == "Highway"

    @pytest.mark.unit
    def test_highway_takes_priority_over_rural(self, ai_controller):
        assert ai_controller._determine_road_type({"summary": "highway rural road"}) == "Highway"


# format_route_for_ai

class TestAIFormatRoute:
    """Unit tests for AIController.format_route_for_ai()"""

    @pytest.mark.unit
    def test_returns_dict(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        assert isinstance(result, dict)

    @pytest.mark.unit
    def test_all_required_keys_present(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        required = [
            "name", "Distance_km", "Speed", "TrafficIndexLive", "JamsCount",
            "Hour", "DayOfWeek", "Month", "IsWeekend", "IsPeakHour",
            "Temperature", "Humidity", "Wind Speed",
            "Vehicle Type", "Fuel Type", "Road Type", "Traffic Conditions", "City",
        ]
        for key in required:
            assert key in result, f"Missing key: {key}"

    @pytest.mark.unit
    def test_distance_parsed_correctly(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "20.5 km", "duration": "30 mins"}
        result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["Distance_km"] == 20.5

    @pytest.mark.unit
    def test_distance_with_comma(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "1,200 km", "duration": "30 mins"}
        result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["Distance_km"] == 1200.0

    @pytest.mark.unit
    def test_speed_calculated_from_distance_and_duration(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "60 km", "duration": "60 mins"}
        result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert abs(result["Speed"] - 60.0) < 0.1

    @pytest.mark.unit
    def test_speed_capped_at_120(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "200 km", "duration": "30 mins"}
        result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["Speed"] <= 120.0

    @pytest.mark.unit
    def test_speed_default_when_duration_zero(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "20 km", "duration": "0 mins"}
        result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["Speed"] == 40.0

    @pytest.mark.unit
    def test_traffic_light_mapped(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins", "trafficConditions": "light"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Traffic Conditions"] == "Light"

    @pytest.mark.unit
    def test_traffic_moderate_mapped(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins", "trafficConditions": "moderate"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Traffic Conditions"] == "Moderate"

    @pytest.mark.unit
    def test_traffic_heavy_mapped(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins", "trafficConditions": "heavy"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Traffic Conditions"] == "Heavy"

    @pytest.mark.unit
    def test_traffic_severe_maps_to_heavy(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins", "trafficConditions": "severe"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Traffic Conditions"] == "Heavy"

    @pytest.mark.unit
    def test_unknown_traffic_defaults_to_moderate(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins", "trafficConditions": "chaos"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Traffic Conditions"] == "Moderate"

    @pytest.mark.unit
    def test_non_string_traffic_defaults_to_moderate(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins", "trafficConditions": 999}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Traffic Conditions"] == "Moderate"

    @pytest.mark.unit
    def test_road_type_highway_detected(self, ai_controller, sample_trip_metadata):
        route = {"summary": "King Fahd Highway", "distance": "10 km", "duration": "10 mins"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Road Type"] == "Highway"

    @pytest.mark.unit
    def test_road_type_urban_default(self, ai_controller, sample_trip_metadata):
        route = {"summary": "Olaya Street", "distance": "5 km", "duration": "10 mins"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["Road Type"] == "Urban"

    @pytest.mark.unit
    def test_vehicle_type_from_metadata(self, ai_controller, sample_route_info):
        meta = {"vehicleType": "Truck", "fuelType": "Diesel", "city": "Jeddah"}
        assert ai_controller.format_route_for_ai(sample_route_info, meta)["Vehicle Type"] == "Truck"

    @pytest.mark.unit
    def test_fuel_type_from_metadata(self, ai_controller, sample_route_info):
        meta = {"vehicleType": "Car", "fuelType": "Electric", "city": "Riyadh"}
        assert ai_controller.format_route_for_ai(sample_route_info, meta)["Fuel Type"] == "Electric"

    @pytest.mark.unit
    def test_city_from_metadata(self, ai_controller, sample_route_info):
        meta = {"vehicleType": "Car", "fuelType": "Gasoline", "city": "Dammam"}
        assert ai_controller.format_route_for_ai(sample_route_info, meta)["City"] == "Dammam"

    @pytest.mark.unit
    def test_temperature_from_metadata(self, ai_controller, sample_route_info):
        meta = {"vehicleType": "Car", "fuelType": "Diesel", "city": "Riyadh", "temperature": 40.0}
        assert ai_controller.format_route_for_ai(sample_route_info, meta)["Temperature"] == 40.0

    @pytest.mark.unit
    def test_default_temperature_when_missing(self, ai_controller, sample_route_info):
        assert ai_controller.format_route_for_ai(sample_route_info, {})["Temperature"] == 28.0

    @pytest.mark.unit
    def test_default_vehicle_type_when_missing(self, ai_controller, sample_route_info):
        assert ai_controller.format_route_for_ai(sample_route_info, {})["Vehicle Type"] == "Light-Duty Trucks"

    @pytest.mark.unit
    def test_default_fuel_type_when_missing(self, ai_controller, sample_route_info):
        assert ai_controller.format_route_for_ai(sample_route_info, {})["Fuel Type"] == "Diesel"

    @pytest.mark.unit
    def test_default_city_when_missing(self, ai_controller, sample_route_info):
        assert ai_controller.format_route_for_ai(sample_route_info, {})["City"] == "Riyadh"

    @pytest.mark.unit
    def test_route_summary_used_as_name(self, ai_controller, sample_trip_metadata):
        route = {"summary": "My Custom Route", "distance": "10 km", "duration": "15 mins"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["name"] == "My Custom Route"

    @pytest.mark.unit
    def test_default_name_when_summary_missing(self, ai_controller, sample_trip_metadata):
        route = {"distance": "10 km", "duration": "15 mins"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["name"] == "Route"

    @pytest.mark.unit
    def test_is_weekend_is_0_or_1(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        assert result["IsWeekend"] in (0, 1)

    @pytest.mark.unit
    def test_is_peak_hour_is_0_or_1(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        assert result["IsPeakHour"] in (0, 1)

    @pytest.mark.unit
    def test_hour_between_0_and_23(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        assert 0 <= result["Hour"] <= 23

    @pytest.mark.unit
    def test_day_of_week_between_0_and_6(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        assert 0 <= result["DayOfWeek"] <= 6

    @pytest.mark.unit
    def test_month_between_1_and_12(self, ai_controller, sample_route_info, sample_trip_metadata):
        result = ai_controller.format_route_for_ai(sample_route_info, sample_trip_metadata)
        assert 1 <= result["Month"] <= 12

    @pytest.mark.unit
    def test_invalid_distance_raises_exception(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "not_a_number km", "duration": "15 mins"}
        with pytest.raises(Exception, match="Failed to format route"):
            ai_controller.format_route_for_ai(route, sample_trip_metadata)

    @pytest.mark.unit
    def test_traffic_index_default_when_missing(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["TrafficIndexLive"] == 20.0

    @pytest.mark.unit
    def test_jams_count_default_when_missing(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins"}
        assert ai_controller.format_route_for_ai(route, sample_trip_metadata)["JamsCount"] == 0

    @pytest.mark.unit
    def test_peak_hour_at_8am(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins"}
        with patch("controllers.AIController.datetime") as mock_dt:
            mock_dt.now.return_value = MagicMock(hour=8, weekday=lambda: 1, month=5)
            result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["IsPeakHour"] == 1

    @pytest.mark.unit
    def test_not_peak_hour_at_2pm(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins"}
        with patch("controllers.AIController.datetime") as mock_dt:
            mock_dt.now.return_value = MagicMock(hour=14, weekday=lambda: 1, month=5)
            result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["IsPeakHour"] == 0

    @pytest.mark.unit
    def test_is_weekend_on_saturday(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins"}
        with patch("controllers.AIController.datetime") as mock_dt:
            mock_dt.now.return_value = MagicMock(hour=10, weekday=lambda: 5, month=5)
            result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["IsWeekend"] == 1

    @pytest.mark.unit
    def test_not_weekend_on_friday(self, ai_controller, sample_trip_metadata):
        route = {"summary": "R", "distance": "10 km", "duration": "15 mins"}
        with patch("controllers.AIController.datetime") as mock_dt:
            mock_dt.now.return_value = MagicMock(hour=10, weekday=lambda: 4, month=5)
            result = ai_controller.format_route_for_ai(route, sample_trip_metadata)
        assert result["IsWeekend"] == 0


# predict_single_route 

class TestAIPredictSingleRoute:
    """Unit tests for AIController.predict_single_route()"""

    @pytest.fixture
    def formatted_route(self):
        return {
            "name": "Route A", "Distance_km": 20.0, "Speed": 60,
            "TrafficIndexLive": 15.0, "JamsCount": 1, "Hour": 9,
            "DayOfWeek": 1, "Month": 5, "IsWeekend": 0, "IsPeakHour": 1,
            "Temperature": 28.0, "Humidity": 40.0, "Wind Speed": 10.0,
            "Vehicle Type": "Car", "Fuel Type": "Gasoline",
            "Road Type": "Urban", "Traffic Conditions": "Light", "City": "Riyadh",
        }

    @pytest.mark.unit
    def test_calls_engine_predict(self, ai_controller, formatted_route):
        ai_controller.predict_single_route(formatted_route)
        ai_controller.engine.predict_single_route.assert_called_once_with(formatted_route)

    @pytest.mark.unit
    def test_returns_engine_result(self, ai_controller, formatted_route):
        result = ai_controller.predict_single_route(formatted_route)
        assert result["route_name"] == "Test Route"
        assert result["category"] == "Green"

    @pytest.mark.unit
    def test_raises_when_engine_not_loaded(self, ai_controller_no_engine, formatted_route):
        with pytest.raises(Exception, match="AI models not loaded"):
            ai_controller_no_engine.predict_single_route(formatted_route)

    @pytest.mark.unit
    def test_engine_exception_propagates(self, ai_controller, formatted_route):
        ai_controller.engine.predict_single_route.side_effect = RuntimeError("model error")
        with pytest.raises(RuntimeError, match="model error"):
            ai_controller.predict_single_route(formatted_route)


#compare_and_recommend 

class TestAICompareAndRecommend:
    """Unit tests for AIController.compare_and_recommend()"""

    @pytest.fixture
    def two_routes(self):
        base = {
            "name": "R", "Distance_km": 20.0, "Speed": 60,
            "TrafficIndexLive": 15.0, "JamsCount": 1, "Hour": 9,
            "DayOfWeek": 1, "Month": 5, "IsWeekend": 0, "IsPeakHour": 1,
            "Temperature": 28.0, "Humidity": 40.0, "Wind Speed": 10.0,
            "Vehicle Type": "Car", "Fuel Type": "Gasoline",
            "Road Type": "Urban", "Traffic Conditions": "Light", "City": "Riyadh",
        }
        return [{**base, "name": "Route A"}, {**base, "name": "Route B"}]

    @pytest.mark.unit
    def test_calls_engine_compare_routes(self, ai_controller, two_routes):
        ai_controller.compare_and_recommend(two_routes)
        ai_controller.engine.compare_routes.assert_called_once_with(two_routes)

    @pytest.mark.unit
    def test_returns_engine_result(self, ai_controller, two_routes):
        result = ai_controller.compare_and_recommend(two_routes)
        assert result["best_route"]["route_name"] == "Route A"
        assert result["co2e_saving_percent"] == 50.0

    @pytest.mark.unit
    def test_raises_when_engine_not_loaded(self, ai_controller_no_engine, two_routes):
        with pytest.raises(Exception, match="AI models not loaded"):
            ai_controller_no_engine.compare_and_recommend(two_routes)

    @pytest.mark.unit
    def test_raises_value_error_for_empty_list(self, ai_controller):
        with pytest.raises(ValueError, match="No routes provided"):
            ai_controller.compare_and_recommend([])

    @pytest.mark.unit
    def test_engine_exception_propagates(self, ai_controller, two_routes):
        ai_controller.engine.compare_routes.side_effect = RuntimeError("compare failed")
        with pytest.raises(RuntimeError, match="compare failed"):
            ai_controller.compare_and_recommend(two_routes)

    @pytest.mark.unit
    def test_single_route_list_accepted(self, ai_controller, two_routes):
        ai_controller.compare_and_recommend([two_routes[0]])
        ai_controller.engine.compare_routes.assert_called_once()




    enc = MagicMock()
    enc.transform = lambda vals: [list(classes).index(v) for v in vals]
    return enc


@pytest.fixture
def integrated_ai_controller():
    """
    AIController backed by a REAL GreenMileRecommendationEngine.
    Only joblib.load is patched — no .pkl files needed.
    """
    reg_model = MagicMock()
    reg_model.predict = MagicMock(return_value=np.array([5.0]))

    clf_model = MagicMock()
    clf_model.predict = MagicMock(return_value=np.array(["Green"]))
    clf_model.predict_proba = MagicMock(return_value=np.array([[0.8, 0.15, 0.05]]))
    clf_model.classes_ = np.array(["Green", "Yellow", "Red"])

    label_encoders = {
        "Vehicle Type":       _make_label_encoder(["Truck", "Van", "Car", "Light-Duty Trucks"]),
        "Fuel Type":          _make_label_encoder(["Diesel", "Gasoline", "CNG", "Electric", "Hybrid"]),
        "Road Type":          _make_label_encoder(["Highway", "Urban", "Rural"]),
        "Traffic Conditions": _make_label_encoder(["Light", "Moderate", "Heavy", "Severe"]),
        "City":               _make_label_encoder(["Riyadh", "Jeddah", "Dammam"]),
    }
    thresholds = {"Green": (0, 5), "Yellow": (5, 10), "Red": (10, 999)}

    with patch(_JOBLIB_LOAD) as mock_load:
        mock_load.side_effect = [reg_model, clf_model, label_encoders, thresholds]
        ctrl = AIController()

    ctrl._reg_model = reg_model
    ctrl._clf_model = clf_model
    return ctrl


@pytest.fixture
def int_route_info():
    return {
        "summary": "King Fahd Road",
        "distance": "20.5 km",
        "duration": "25 mins",
        "trafficIndex": 15.0,
        "jamsCount": 2,
        "trafficConditions": "moderate",
    }


@pytest.fixture
def int_trip_metadata():
    return {
        "vehicleType": "Car",
        "fuelType": "Gasoline",
        "city": "Riyadh",
        "temperature": 30.0,
        "humidity": 45.0,
        "windSpeed": 12.0,
    }


class TestAIIntegration:
    """
    Integration tests — AIController + real GreenMileRecommendationEngine.
    Verifies the complete flow from raw route data through to AI output.
    """

    @pytest.mark.integration
    def test_full_flow_format_then_predict(
        self, integrated_ai_controller, int_route_info, int_trip_metadata
    ):
        formatted = integrated_ai_controller.format_route_for_ai(int_route_info, int_trip_metadata)
        result    = integrated_ai_controller.predict_single_route(formatted)

        assert "predicted_co2e_kg" in result
        assert "category" in result
        assert result["category"] in ["Green", "Yellow", "Red"]

    @pytest.mark.integration
    def test_full_flow_format_then_compare(
        self, integrated_ai_controller, int_trip_metadata
    ):
        fmt_a = integrated_ai_controller.format_route_for_ai(
            {"summary": "King Fahd Highway", "distance": "20 km",
             "duration": "20 mins", "trafficConditions": "light"},
            int_trip_metadata,
        )
        fmt_b = integrated_ai_controller.format_route_for_ai(
            {"summary": "Olaya Street", "distance": "20 km",
             "duration": "40 mins", "trafficConditions": "heavy"},
            int_trip_metadata,
        )
        result = integrated_ai_controller.compare_and_recommend([fmt_a, fmt_b])

        assert "best_route"      in result
        assert "worst_route"     in result
        assert "co2e_saving_kg"  in result
        assert result["co2e_saving_kg"] >= 0

    @pytest.mark.integration
    def test_prediction_co2e_is_non_negative_float(
        self, integrated_ai_controller, int_route_info, int_trip_metadata
    ):
        formatted = integrated_ai_controller.format_route_for_ai(int_route_info, int_trip_metadata)
        result    = integrated_ai_controller.predict_single_route(formatted)
        assert isinstance(result["predicted_co2e_kg"], float)
        assert result["predicted_co2e_kg"] >= 0

    @pytest.mark.integration
    def test_probabilities_sum_to_one(
        self, integrated_ai_controller, int_route_info, int_trip_metadata
    ):
        formatted = integrated_ai_controller.format_route_for_ai(int_route_info, int_trip_metadata)
        result    = integrated_ai_controller.predict_single_route(formatted)
        assert abs(sum(result["probabilities"].values()) - 1.0) < 1e-6

    @pytest.mark.integration
    def test_compare_savings_non_negative(
        self, integrated_ai_controller, int_trip_metadata
    ):
        call_count = [0]
        def vary(features):
            call_count[0] += 1
            return np.array([5.0]) if call_count[0] == 1 else np.array([10.0])
        integrated_ai_controller._reg_model.predict = vary

        fmt_a = integrated_ai_controller.format_route_for_ai(
            {"summary": "Highway 40", "distance": "30 km", "duration": "20 mins"},
            int_trip_metadata,
        )
        fmt_b = integrated_ai_controller.format_route_for_ai(
            {"summary": "City Centre", "distance": "10 km", "duration": "30 mins"},
            int_trip_metadata,
        )
        result = integrated_ai_controller.compare_and_recommend([fmt_a, fmt_b])
        assert result["fuel_saving_liters"]  >= 0
        assert result["co2e_saving_percent"] >= 0

    @pytest.mark.integration
    def test_fuel_consumption_present_in_full_flow(
        self, integrated_ai_controller, int_route_info, int_trip_metadata
    ):
        formatted = integrated_ai_controller.format_route_for_ai(int_route_info, int_trip_metadata)
        result    = integrated_ai_controller.predict_single_route(formatted)
        assert "fuel_consumption" in result
        assert "fuel_liters" in result["fuel_consumption"]

    @pytest.mark.integration
    def test_is_ready_true_with_real_engine(self, integrated_ai_controller):
        assert integrated_ai_controller.is_ready() is True

    @pytest.mark.integration
    def test_highway_route_road_type_and_prediction(
        self, integrated_ai_controller, int_trip_metadata
    ):
        route     = {"summary": "King Fahd Highway", "distance": "50 km", "duration": "30 mins"}
        formatted = integrated_ai_controller.format_route_for_ai(route, int_trip_metadata)
        assert formatted["Road Type"] == "Highway"

        result = integrated_ai_controller.predict_single_route(formatted)
        assert "predicted_co2e_kg" in result
        assert result["predicted_co2e_kg"] >= 0

