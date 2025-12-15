

import pytest
import sys
import os


#  Allows pytest to import backend modules correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import json
from fastapi.testclient import TestClient


#  Test API Client
@pytest.fixture
def client():
 
    from backend.main import app
    return TestClient(app)


@pytest.fixture
def sample_route_coords():

    return [
        {"latitude": 24.7136, "longitude": 46.6753},  
        {"latitude": 24.7150, "longitude": 46.6800},  
        {"latitude": 24.7200, "longitude": 46.6850}   
    ]






@pytest.fixture
def sample_trip_data():

    return {
        "origin": "King Khalid International Airport",
        "destination": "Kingdom Centre",
        "city": "Riyadh",
        "vehicleType": "Car",
        "fuelType": "Petrol",
        "modelYear": 2020
    }



def pytest_configure(config):
   
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )


# 
# Test data cleanup 
@pytest.fixture(autouse=True)
def reset_navigation_state():
    
    yield
   


@pytest.fixture
def mock_env_vars(monkeypatch):
    
    def _set_env_vars(env_dict):
        for key, value in env_dict.items():
            monkeypatch.setenv(key, value)
    
    return _set_env_vars