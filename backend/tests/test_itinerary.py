"""Tests for the /itinerary router. The AI agent is mocked to avoid LLM calls."""

import pytest
from unittest.mock import AsyncMock, patch
from services import firebase_service as fb

MOCK_PLAN = [
    {
        "day": 1,
        "date": "2025-01-01",
        "title": "Arrival",
        "activities": [
            {"time": "10:00", "name": "Check-in", "type": "stay", "cost": 0, "notes": ""},
        ],
    }
]


# ─── GET /itinerary/{trip_id} ─────────────────────────────────────────────────

def test_get_itinerary_not_found(client, auth_headers, seeded_trip):
    r = client.get(f"/itinerary/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_get_itinerary_returns_saved(client, auth_headers, seeded_trip):
    fb._mem_store["itineraries"][seeded_trip] = {"plan": MOCK_PLAN}
    r = client.get(f"/itinerary/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["trip_id"] == seeded_trip
    assert len(data["plan"]) == 1
    assert data["plan"][0]["day"] == 1


# ─── POST /itinerary/create ──────────────────────────────────────────────────

def test_create_itinerary_calls_agent(client, auth_headers, seeded_trip):
    with patch(
        "routers.itinerary.generate_itinerary_with_agent",
        new=AsyncMock(return_value=MOCK_PLAN),
    ):
        payload = {
            "trip_id": seeded_trip,
            "destination": "Goa, India",
            "duration_days": 1,
            "group_size": 4,
        }
        r = client.post("/itinerary/create", json=payload, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["trip_id"] == seeded_trip
    assert len(data["plan"]) == 1


def test_create_itinerary_persists_plan(client, auth_headers, seeded_trip):
    with patch(
        "routers.itinerary.generate_itinerary_with_agent",
        new=AsyncMock(return_value=MOCK_PLAN),
    ):
        client.post(
            "/itinerary/create",
            json={"trip_id": seeded_trip, "destination": "Goa", "duration_days": 1, "group_size": 4},
            headers=auth_headers,
        )

    r = client.get(f"/itinerary/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["plan"][0]["title"] == "Arrival"


def test_create_itinerary_duration_too_long(client, auth_headers, seeded_trip):
    payload = {
        "trip_id": seeded_trip,
        "destination": "Goa",
        "duration_days": 25,  # max is 21
        "group_size": 4,
    }
    r = client.post("/itinerary/create", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_create_itinerary_group_too_small(client, auth_headers, seeded_trip):
    payload = {
        "trip_id": seeded_trip,
        "destination": "Goa",
        "duration_days": 3,
        "group_size": 1,  # min is 2
    }
    r = client.post("/itinerary/create", json=payload, headers=auth_headers)
    assert r.status_code == 422


# ─── PUT /itinerary/{trip_id}/day/{day} ──────────────────────────────────────

def test_update_itinerary_day_success(client, auth_headers, seeded_trip):
    fb._mem_store["itineraries"][seeded_trip] = {"plan": MOCK_PLAN}
    changes = {"title": "Updated Day 1"}
    r = client.put(f"/itinerary/{seeded_trip}/day/1", json=changes, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_update_itinerary_day_persists(client, auth_headers, seeded_trip):
    fb._mem_store["itineraries"][seeded_trip] = {"plan": MOCK_PLAN}
    client.put(f"/itinerary/{seeded_trip}/day/1", json={"title": "Modified"}, headers=auth_headers)

    r = client.get(f"/itinerary/{seeded_trip}", headers=auth_headers)
    plan = r.json()["plan"]
    assert plan[0]["title"] == "Modified"
