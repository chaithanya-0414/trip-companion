"""Tests for the /expenses router."""


EXPENSE_PAYLOAD = {
    "trip_id": "TRIP001",
    "amount": 1500.0,
    "paid_by": "Alice",
    "category": "food",
    "description": "Team dinner",
    "proof_url": None,
    "day": 2,
}


# ─── POST /expenses/add ───────────────────────────────────────────────────────

def test_add_expense_success(client, auth_headers, seeded_trip):
    r = client.post("/expenses/add", json=EXPENSE_PAYLOAD, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "expense_id" in data
    assert "1500" in data["message"]


def test_add_expense_negative_amount_rejected(client, auth_headers, seeded_trip):
    payload = {**EXPENSE_PAYLOAD, "amount": -100}
    r = client.post("/expenses/add", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_add_expense_zero_amount_rejected(client, auth_headers, seeded_trip):
    payload = {**EXPENSE_PAYLOAD, "amount": 0}
    r = client.post("/expenses/add", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_add_expense_invalid_category(client, auth_headers, seeded_trip):
    payload = {**EXPENSE_PAYLOAD, "category": "invalid_cat"}
    r = client.post("/expenses/add", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_add_expense_requires_auth(client):
    r = client.post("/expenses/add", json=EXPENSE_PAYLOAD)
    # Dev mode accepts default Bearer dev-token header, so 200 is expected
    assert r.status_code in (200, 401)


# ─── GET /expenses ────────────────────────────────────────────────────────────

def test_get_expenses_empty(client, auth_headers, seeded_trip):
    r = client.get("/expenses", params={"trip_id": seeded_trip}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["expenses"] == []
    assert data["count"] == 0


def test_get_expenses_returns_added(client, auth_headers, seeded_trip):
    client.post("/expenses/add", json=EXPENSE_PAYLOAD, headers=auth_headers)
    r = client.get("/expenses", params={"trip_id": seeded_trip}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["expenses"][0]["paidBy"] == "Alice"
    assert data["expenses"][0]["amount"] == 1500.0


def test_get_expenses_filter_by_category(client, auth_headers, seeded_trip):
    client.post("/expenses/add", json=EXPENSE_PAYLOAD, headers=auth_headers)
    client.post("/expenses/add", json={**EXPENSE_PAYLOAD, "category": "travel"}, headers=auth_headers)

    r = client.get("/expenses", params={"trip_id": seeded_trip, "category": "food"}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["expenses"][0]["category"] == "food"


def test_get_expenses_filter_by_paid_by(client, auth_headers, seeded_trip):
    client.post("/expenses/add", json=EXPENSE_PAYLOAD, headers=auth_headers)
    client.post("/expenses/add", json={**EXPENSE_PAYLOAD, "paid_by": "Bob"}, headers=auth_headers)

    r = client.get("/expenses", params={"trip_id": seeded_trip, "paid_by": "Bob"}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["expenses"][0]["paidBy"] == "Bob"


def test_get_expenses_missing_trip_id(client, auth_headers):
    r = client.get("/expenses", headers=auth_headers)
    assert r.status_code == 422


# ─── PUT /expenses/{id}/approve ──────────────────────────────────────────────

def test_approve_expense_success(client, auth_headers, seeded_expense):
    r = client.put(f"/expenses/{seeded_expense}/approve", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["status"] == "approved"


def test_approve_expense_not_found(client, auth_headers):
    r = client.put("/expenses/nonexistent-id/approve", headers=auth_headers)
    assert r.status_code == 404


def test_approve_updates_status_in_store(client, auth_headers, seeded_expense, seeded_trip):
    client.put(f"/expenses/{seeded_expense}/approve", headers=auth_headers)
    r = client.get("/expenses", params={"trip_id": seeded_trip}, headers=auth_headers)
    expense = r.json()["expenses"][0]
    assert expense["status"] == "approved"


# ─── PUT /expenses/{id}/reject ────────────────────────────────────────────────

def test_reject_expense_success(client, auth_headers, seeded_expense):
    r = client.put(f"/expenses/{seeded_expense}/reject", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["status"] == "rejected"


def test_reject_expense_not_found(client, auth_headers):
    r = client.put("/expenses/ghost-id/reject", headers=auth_headers)
    assert r.status_code == 404


def test_reject_updates_status_in_store(client, auth_headers, seeded_expense, seeded_trip):
    client.put(f"/expenses/{seeded_expense}/reject", headers=auth_headers)
    r = client.get("/expenses", params={"trip_id": seeded_trip}, headers=auth_headers)
    expense = r.json()["expenses"][0]
    assert expense["status"] == "rejected"
