"""Tests for the /settlements router."""

from services import firebase_service as fb


def _seed_expenses(trip_id: str, expenses: list):
    """Helper: insert expenses directly into mem-store."""
    import uuid
    for e in expenses:
        eid = str(uuid.uuid4())
        fb._mem_store["expenses"][eid] = {"id": eid, "tripId": trip_id, **e}


# ─── GET /settlements/calculate/{trip_id} ─────────────────────────────────────

def test_calculate_empty_trip(client, auth_headers, seeded_trip):
    r = client.get(f"/settlements/calculate/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["settlements"] == []
    assert data["summary"]["total"] == 0


def test_calculate_simple_split(client, auth_headers, seeded_trip):
    _seed_expenses(seeded_trip, [
        {"amount": 200, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "approved"},
    ])
    r = client.get(f"/settlements/calculate/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["settlements"]) == 1
    assert data["settlements"][0]["from"] == "Bob"
    assert data["settlements"][0]["to"] == "Alice"
    assert data["settlements"][0]["amount"] == 100.0
    assert data["summary"]["total"] == 200


def test_calculate_excludes_rejected(client, auth_headers, seeded_trip):
    _seed_expenses(seeded_trip, [
        {"amount": 200, "paidBy": "Alice", "splitAmong": ["Alice", "Bob"], "status": "approved"},
        {"amount": 500, "paidBy": "Bob",   "splitAmong": ["Alice", "Bob"], "status": "rejected"},
    ])
    r = client.get(f"/settlements/calculate/{seeded_trip}", headers=auth_headers)
    data = r.json()
    assert data["summary"]["total"] == 200


def test_calculate_persists_to_store(client, auth_headers, seeded_trip):
    _seed_expenses(seeded_trip, [
        {"amount": 300, "paidBy": "Alice", "splitAmong": ["Alice", "Bob", "Charlie"], "status": "approved"},
    ])
    client.get(f"/settlements/calculate/{seeded_trip}", headers=auth_headers)

    # Now load should return the persisted settlements
    r2 = client.get(f"/settlements/{seeded_trip}", headers=auth_headers)
    assert r2.status_code == 200
    assert len(r2.json()["settlements"]) == 2


# ─── GET /settlements/{trip_id} ──────────────────────────────────────────────

def test_get_settlements_empty(client, auth_headers, seeded_trip):
    r = client.get(f"/settlements/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["settlements"] == []


def test_get_settlements_returns_saved(client, auth_headers, seeded_trip):
    fb._mem_store["settlements"][seeded_trip] = {
        "settlements": [
            {"from": "Bob", "to": "Alice", "amount": 100.0, "settled": False}
        ]
    }
    r = client.get(f"/settlements/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["settlements"][0]["from"] == "Bob"


# ─── POST /settlements/{trip_id}/mark-settled ─────────────────────────────────

def test_mark_settled_success(client, auth_headers, seeded_trip):
    fb._mem_store["settlements"][seeded_trip] = {
        "settlements": [
            {"from": "Bob", "to": "Alice", "amount": 100.0, "settled": False}
        ]
    }
    payload = {"from": "Bob", "to": "Alice", "amount": 100.0}
    r = client.post(f"/settlements/{seeded_trip}/mark-settled", json=payload, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_mark_settled_updates_flag(client, auth_headers, seeded_trip):
    fb._mem_store["settlements"][seeded_trip] = {
        "settlements": [
            {"from": "Bob", "to": "Alice", "amount": 100.0, "settled": False}
        ]
    }
    client.post(
        f"/settlements/{seeded_trip}/mark-settled",
        json={"from": "Bob", "to": "Alice"},
        headers=auth_headers,
    )
    r = client.get(f"/settlements/{seeded_trip}", headers=auth_headers)
    assert r.json()["settlements"][0]["settled"] is True


def test_mark_settled_only_matches_correct_pair(client, auth_headers, seeded_trip):
    fb._mem_store["settlements"][seeded_trip] = {
        "settlements": [
            {"from": "Bob",     "to": "Alice",   "amount": 100.0, "settled": False},
            {"from": "Charlie", "to": "Alice",   "amount": 50.0,  "settled": False},
        ]
    }
    client.post(
        f"/settlements/{seeded_trip}/mark-settled",
        json={"from": "Bob", "to": "Alice"},
        headers=auth_headers,
    )
    r = client.get(f"/settlements/{seeded_trip}", headers=auth_headers)
    settled = {s["from"]: s["settled"] for s in r.json()["settlements"]}
    assert settled["Bob"] is True
    assert settled["Charlie"] is False
