import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    from backend.main import app
    return TestClient(app)


# =============================================================================
# Sprint 4 Integration Testing - AI Agent Endpoint
# Endpoint: POST /api/ai-agent/chat
# =============================================================================


# Test 1: Full integration flow works + Anthropic is called correctly
@patch("backend.controllers.AIAgentController.anthropic.Anthropic")
def test_ai_agent_chat_full_flow_success(mock_anthropic, client):

    mock_anthropic.return_value.messages.create.return_value.content = [
        type("obj", (object,), {"text": "Integration AI response"})
    ]

    payload = {
        "company_id": 1,
        "company_name": "Test Company",
        "message": "What are my total CO2 emissions?",
        "conversation_history": [],
        "dashboard_snapshot": {
            "totalTrips": 20,
            "totalDrivers": 6,
            "totalVehicles": 4,
            "totalCO2e": 300.5,
            "routeDistribution": {"green": 10, "orange": 5, "red": 5},
            "emissionsBreakdown": {"co2": 250, "ch4": 0.2, "n2o": 0.1},
            "get_fuel_cost_savings_percentage": 22
        }
    }

    response = client.post("/api/ai-agent/chat", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Integration output verification
    assert "reply" in data
    assert "updated_history" in data
    assert isinstance(data["reply"], str)
    assert isinstance(data["updated_history"], list)

    # Ensure Anthropic API was called (integration with external dependency mocked)
    assert mock_anthropic.called
    assert mock_anthropic.return_value.messages.create.called


# Test 2: Conversation history integration (history expands correctly)
@patch("backend.controllers.AIAgentController.anthropic.Anthropic")
def test_ai_agent_chat_conversation_history_integration(mock_anthropic, client):

    mock_anthropic.return_value.messages.create.return_value.content = [
        type("obj", (object,), {"text": "Follow-up integration reply"})
    ]

    payload = {
        "company_id": 2,
        "company_name": "GreenMile",
        "message": "Give me sustainability advice",
        "conversation_history": [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello! How can I help you?"}
        ],
        "dashboard_snapshot": {}
    }

    response = client.post("/api/ai-agent/chat", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert "updated_history" in data
    assert len(data["updated_history"]) == 4

    # Verify correct integration sequence of roles
    assert data["updated_history"][-2]["role"] == "user"
    assert data["updated_history"][-2]["content"] == payload["message"]

    assert data["updated_history"][-1]["role"] == "assistant"
    assert isinstance(data["updated_history"][-1]["content"], str)


# Test 3: Validation integration (missing required message returns 422)
def test_ai_agent_chat_validation_missing_message(client):

    payload = {
        "company_id": 1,
        "company_name": "Test Company",
        "conversation_history": [],
        "dashboard_snapshot": {}
    }

    response = client.post("/api/ai-agent/chat", json=payload)

    # FastAPI + Pydantic validation integration
    assert response.status_code == 422