import pytest
from fastapi.testclient import TestClient
from main import app  
from unittest.mock import patch

client = TestClient(app)


# Test 1: Dashboard data extraction works
@patch("controllers.AIAgentController.anthropic.Anthropic")
def test_dashboard_data_extraction(mock_anthropic):
    mock_anthropic.return_value.messages.create.return_value.content = [
        type("obj", (object,), {"text": "Test AI response"})
    ]

    response = client.post("/api/ai-agent/chat", json={
        "company_id": 1,
        "company_name": "Test Company",
        "message": "What are my emissions?",
        "conversation_history": [],
        "dashboard_snapshot": {
            "totalTrips": 10,
            "totalDrivers": 5,
            "totalVehicles": 3,
            "totalCO2e": 120.5,
            "routeDistribution": {"green": 4, "orange": 3, "red": 3},
            "emissionsBreakdown": {"co2": 100, "ch4": 0.1, "n2o": 0.05},
            "get_fuel_cost_savings_percentage": 15
        }
    })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "updated_history" in data


# Test 2: Missing dashboard values default to zero
@patch("controllers.AIAgentController.anthropic.Anthropic")
def test_missing_dashboard_values(mock_anthropic):
    mock_anthropic.return_value.messages.create.return_value.content = [
        type("obj", (object,), {"text": "Test AI response"})
    ]
    response = client.post("/api/ai-agent/chat", json={
        "company_id": 1,
        "company_name": "Test Company",
        "message": "Give me insights",
        "conversation_history": [],
        "dashboard_snapshot": {}  # empty snapshot
    })

    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "updated_history" in data


# Test 3: Response structure is correct
@patch("controllers.AIAgentController.anthropic.Anthropic")
def test_chat_response_structure(mock_anthropic):
    mock_anthropic.return_value.messages.create.return_value.content = [
        type("obj", (object,), {"text": "Test AI response"})
    ]

    response = client.post("/api/ai-agent/chat", json={
        "company_id": 1,
        "company_name": "Test Company",
        "message": "Hello",
        "conversation_history": [],
        "dashboard_snapshot": {}
    })

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data["reply"], str)
    assert isinstance(data["updated_history"], list)

    assert len(data["updated_history"]) >= 2