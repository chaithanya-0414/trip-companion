"""
Shared fixtures for TripSync backend tests.
Uses FastAPI TestClient in DEV MODE (no Firebase credentials → in-memory store).
"""

import sys
import os
import pytest
import copy

# Ensure backend/ is on sys.path so relative imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from main import app
from services import firebase_service as fb

# ── Snapshots of an empty mem-store ──────────────────────────────────────────
_EMPTY_STORE = {
    "users": {},
    "expenses": {},
    "itineraries": {},
    "trips": {},
    "settlements": {},
}


@pytest.fixture(autouse=True)
def reset_mem_store():
    """Reset in-memory store before every test."""
    fb._mem_store.clear()
    fb._mem_store.update(copy.deepcopy(_EMPTY_STORE))
    yield
    fb._mem_store.clear()
    fb._mem_store.update(copy.deepcopy(_EMPTY_STORE))


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Dev-mode bearer token — accepted by verify_token() without Firebase."""
    return {"Authorization": "Bearer dev-token"}


@pytest.fixture
def seeded_trip(client, auth_headers):
    """Seed a trip and return its ID."""
    fb._mem_store["trips"]["TRIP001"] = {
        "id": "TRIP001",
        "name": "Test Trip",
        "destination": "Goa, India",
        "startDate": "2025-01-01",
        "endDate": "2025-01-05",
        "groupSize": 4,
        "budget": 50000,
    }
    return "TRIP001"


@pytest.fixture
def seeded_expense(seeded_trip):
    """Seed an expense and return its ID."""
    import uuid
    eid = str(uuid.uuid4())
    fb._mem_store["expenses"][eid] = {
        "id": eid,
        "tripId": seeded_trip,
        "amount": 1000,
        "paidBy": "Alice",
        "category": "food",
        "description": "Lunch",
        "status": "pending",
        "createdAt": "2025-01-02T12:00:00",
        "splitAmong": ["Alice", "Bob"],
    }
    return eid
