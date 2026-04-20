"""Tests for the /chat router. The AI agent is mocked."""

from unittest.mock import patch, AsyncMock


MOCK_AGENT_RESPONSE = {
    "output": "Added expense successfully.",
    "tool_calls": [],
}


def test_chat_success(client, auth_headers):
    with patch("routers.chat.get_agent_response", new=AsyncMock(return_value=MOCK_AGENT_RESPONSE)):
        r = client.post(
            "/chat",
            json={"message": "Add ₹500 for lunch", "session_id": "s1", "trip_id": "TRIP001"},
            headers=auth_headers,
        )
    assert r.status_code == 200
    data = r.json()
    assert data["response"] == "Added expense successfully."
    assert data["session_id"] == "s1"


def test_chat_missing_message(client, auth_headers):
    r = client.post("/chat", json={"session_id": "s1"}, headers=auth_headers)
    assert r.status_code == 422


def test_chat_empty_message_accepted(client, auth_headers):
    """Empty string is valid schema-wise; agent handles it."""
    with patch("routers.chat.get_agent_response", new=AsyncMock(return_value=MOCK_AGENT_RESPONSE)):
        r = client.post(
            "/chat",
            json={"message": "", "session_id": "s1"},
            headers=auth_headers,
        )
    assert r.status_code == 200


def test_chat_returns_tool_calls(client, auth_headers):
    agent_resp = {"output": "Done", "tool_calls": [{"name": "add_expense", "args": {}}]}
    with patch("routers.chat.get_agent_response", new=AsyncMock(return_value=agent_resp)):
        r = client.post(
            "/chat",
            json={"message": "Add expense", "session_id": "s1"},
            headers=auth_headers,
        )
    assert r.status_code == 200
    assert r.json()["tool_calls"][0]["name"] == "add_expense"


def test_chat_agent_error_returns_500(client, auth_headers):
    with patch("routers.chat.get_agent_response", new=AsyncMock(side_effect=RuntimeError("LLM error"))):
        r = client.post(
            "/chat",
            json={"message": "hello", "session_id": "s1"},
            headers=auth_headers,
        )
    assert r.status_code == 500
