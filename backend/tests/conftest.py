# backend/tests/conftest.py
"""
Pytest Configuration File

PURPOSE: Shared test fixtures and configuration for all test files
- Fixtures defined here are automatically available in all test files
- No need to import them
- Reduces code duplication

WHY conftest.py:
- Pytest automatically discovers this file
- Centralized test configuration
- Shared setup code
"""

import pytest
import sys
import os

# Add backend directory to Python path
# WHY: Allows pytest to import backend modules correctly
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
    """
    Provides function to mock environment variables
    
    USAGE:
        def test_example(mock_env_vars):
            mock_env_vars({"GOOGLE_API_KEY": "test_key"})
    
    WHY:
    - Tests shouldn't use real API keys
    - Isolates tests from environment
    """
    def _set_env_vars(env_dict):
        for key, value in env_dict.items():
            monkeypatch.setenv(key, value)
    
    return _set_env_vars