"""Tests for the /users router."""

from services import firebase_service as fb


USER_PAYLOAD = {
    "uid": "user_abc",
    "name": "Test User",
    "email": "test@trip.com",
    "role": "user",
}


# ─── GET /users ──────────────────────────────────────────────────────────────

def test_get_users_empty(client, auth_headers):
    r = client.get("/users", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["users"] == []
    assert data["count"] == 0


def test_get_users_returns_registered(client, auth_headers):
    client.post("/users/register", json=USER_PAYLOAD, headers=auth_headers)
    r = client.get("/users", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["users"][0]["email"] == "test@trip.com"


# ─── POST /users/register ─────────────────────────────────────────────────────

def test_register_user_success(client, auth_headers):
    r = client.post("/users/register", json=USER_PAYLOAD, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "Test User" in data["message"]


def test_register_admin_user(client, auth_headers):
    payload = {**USER_PAYLOAD, "uid": "admin_01", "role": "admin"}
    r = client.post("/users/register", json=payload, headers=auth_headers)
    assert r.status_code == 200
    assert "admin" in r.json()["message"]


def test_register_invalid_role(client, auth_headers):
    payload = {**USER_PAYLOAD, "role": "superuser"}
    r = client.post("/users/register", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_register_missing_name(client, auth_headers):
    payload = {"uid": "u1", "email": "a@b.com", "role": "user"}
    r = client.post("/users/register", json=payload, headers=auth_headers)
    assert r.status_code == 422


# ─── GET /users/me ───────────────────────────────────────────────────────────

def test_get_me_no_profile(client, auth_headers):
    r = client.get("/users/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    # Dev user uid
    assert data["uid"] == "dev-user"


def test_get_me_returns_profile(client, auth_headers):
    # Seed a profile for the dev-user
    fb._mem_store["users"]["dev-user"] = {
        "id": "dev-user",
        "name": "Dev Admin",
        "email": "dev@tripsync.local",
        "role": "admin",
    }
    r = client.get("/users/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Dev Admin"
    assert data["role"] == "admin"
