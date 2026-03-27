import pytest
from backend.models.Navigation import Navigation



def test_init_route_success():
   
    nav = Navigation()
    
    coords = [
        {"latitude": 24.7136, "longitude": 46.6753},
        {"latitude": 24.7150, "longitude": 46.6800},
        {"latitude": 24.7200, "longitude": 46.6850}
    ]
    
    duration_text = "15 mins"
    
    result = nav.init_route(coords, duration_text)
    assert "total_km" in result
    assert "base_duration" in result
    assert "base_avg_speed" in result
    assert result["base_duration"] == 15
    assert result["total_km"] > 0


def test_init_route_empty_coordinates():
  
    nav = Navigation()
    
    # Updated to expect exception 
    with pytest.raises(ValueError):
        nav.init_route([], "15 mins")


def test_update_location_on_route():
   
    nav = Navigation()
    
    route_coords = [
        {"latitude": 24.7136, "longitude": 46.6753},
        {"latitude": 24.7150, "longitude": 46.6800},
        {"latitude": 24.7200, "longitude": 46.6850}
    ]
    nav.init_route(route_coords, "15 mins")
    
    current_location = {"latitude": 24.7140, "longitude": 46.6755}
    heading = 45.0  
    speed_kmh = 40.0  
    
    result = nav.update_location(current_location, heading, speed_kmh)
    
    assert "snappedLocation" in result
    assert "remainingKm" in result
    assert "etaMinutes" in result
    assert result["remainingKm"] >= 0 
    assert result["etaMinutes"] > 0  



def test_update_location_off_route():
    
   
    nav = Navigation()
    
    # Initialize route
    route_coords = [
        {"latitude": 24.7136, "longitude": 46.6753},
        {"latitude": 24.7150, "longitude": 46.6800},
        {"latitude": 24.7200, "longitude": 46.6850}
    ]
    nav.init_route(route_coords, "15 mins")
    
    # Driver is far from the route (1 km away)
    current_location = {"latitude": 25.7136, "longitude": 47.6753}
    
    result = nav.update_location(current_location, 0, 40)
    
  
    assert "snappedLocation" in result or "warning" in result



# Driver might be stopped at traffic light
def test_update_location_zero_speed():

    nav = Navigation()
    
    route_coords = [
        {"latitude": 24.7136, "longitude": 46.6753},
        {"latitude": 24.7200, "longitude": 46.6850}
    ]
    nav.init_route(route_coords, "10 mins")
    
    current_location = {"latitude": 24.7136, "longitude": 46.6753}
    
    # Vehicle is stopped 
    result = nav.update_location(current_location, 0, 0)
    
    # ETA should still be reasonable 
    assert result["etaMinutes"] > 0
    assert result["etaMinutes"] < 1000  # Sanity check



def test_remaining_distance_decreases():

    nav = Navigation()
    
    route_coords = [
        {"latitude": 24.7136, "longitude": 46.6753},  
        {"latitude": 24.7150, "longitude": 46.6800},  
        {"latitude": 24.7200, "longitude": 46.6850}   
    ]
    nav.init_route(route_coords, "15 mins")
    
    # Update at start position
    result1 = nav.update_location(route_coords[0], 0, 40)
    distance1 = result1["remainingKm"]
    
    # Update when closer to destination
    result2 = nav.update_location(route_coords[1], 0, 40)
    distance2 = result2["remainingKm"]
    
    # Distance should decrease as we get closer
    assert distance2 < distance1



def test_arrival_detection():
  
    nav = Navigation()
    
    destination = {"latitude": 24.7200, "longitude": 46.6850}
    
    route_coords = [
        {"latitude": 24.7136, "longitude": 46.6753},
        destination
    ]
    nav.init_route(route_coords, "10 mins")
    
    # Driver is at the destination
    result = nav.update_location(destination, 0, 10)
    
    # Remaining distance should be ~0 
    assert result["remainingKm"] < 0.05  



def test_heading_is_preserved():
    
    nav = Navigation()
    
    route_coords = [
        {"latitude": 24.7136, "longitude": 46.6753},
        {"latitude": 24.7200, "longitude": 46.6850}
    ]
    nav.init_route(route_coords, "10 mins")
    
    result = nav.update_location(route_coords[0], heading=135, speed_kmh=40)
    
    
    assert "snappedLocation" in result
    assert "error" not in result




def test_update_location_before_init():
    nav = Navigation()
    
    location = {"latitude": 24.7136, "longitude": 46.6753}

    # Expect failure because coords not initialized
    with pytest.raises(Exception):
        nav.update_location(location, 0, 40)