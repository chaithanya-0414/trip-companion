"""Tests for the /trips router."""


# ─── GET /trips/{trip_id} ─────────────────────────────────────────────────────

def test_get_trip_found(client, auth_headers, seeded_trip):
    r = client.get(f"/trips/{seeded_trip}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Test Trip"
    assert data["destination"] == "Goa, India"


def test_get_trip_not_found(client, auth_headers):
    r = client.get("/trips/UNKNOWN_TRIP", headers=auth_headers)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


# ─── PUT /trips/{trip_id} ─────────────────────────────────────────────────────

def test_update_trip_success(client, auth_headers, seeded_trip):
    payload = {"name": "Updated Trip", "destination": "Manali, India"}
    r = client.put(f"/trips/{seeded_trip}", json=payload, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_update_trip_persists(client, auth_headers, seeded_trip):
    client.put(f"/trips/{seeded_trip}", json={"name": "New Name"}, headers=auth_headers)
    r = client.get(f"/trips/{seeded_trip}", headers=auth_headers)
    assert r.json()["name"] == "New Name"


def test_update_new_trip_creates_entry(client, auth_headers):
    payload = {"name": "Brand New Trip", "destination": "Kerala"}
    r = client.put("/trips/NEWTRIP", json=payload, headers=auth_headers)
    assert r.status_code == 200

    r2 = client.get("/trips/NEWTRIP", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["name"] == "Brand New Trip"
