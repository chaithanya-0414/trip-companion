"""
Firebase Admin SDK Service
Handles server-side Firestore reads/writes and ID token verification.
When firebase-service-account.json is missing, runs in DEV MODE
(no actual db persistence — useful for testing the UI without Firebase).
"""

import os
import firebase_admin
from firebase_admin import credentials, auth
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ─── Initialization ───────────────────────────────────────────────────────────

_FIREBASE_OK = False
_db = None

def _init_firebase():
    global _FIREBASE_OK, _db
    if _FIREBASE_OK:
        return True

    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
        if os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {
                    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "")
                })
                _FIREBASE_OK = True
                print("Firebase initialized from service account.")
            except Exception as e:
                print(f"Firebase init error: {e}")
                _FIREBASE_OK = False
        else:
            print("WARNING: firebase-service-account.json not found. Running in DEV MODE (no persistence).")
            _FIREBASE_OK = False
    else:
        _FIREBASE_OK = True

    if _FIREBASE_OK:
        from firebase_admin import firestore
        _db = firestore.client()

    return _FIREBASE_OK


def _get_db():
    """Lazy-load Firestore client."""
    _init_firebase()
    return _db


# ─── In-memory fallback store for dev mode ───────────────────────────────────
_mem_store = {
    "users": {},
    "expenses": {},
    "itineraries": {},
    "trips": {},
    "settlements": {},
}
import uuid


# ─── Token Verification ───────────────────────────────────────────────────────

def verify_token(id_token: str) -> dict:
    """Verify Firebase ID token. In dev mode, accept any token as uid=dev-user."""
    _init_firebase()
    if not _FIREBASE_OK:
        # Dev mode: decode token as a fake uid
        return {"uid": "dev-user", "email": "dev@tripsync.local"}
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        raise ValueError(f"Invalid token: {str(e)}")


def get_user_role(uid: str) -> str:
    """Fetch user role from Firestore (or mem-store in dev mode)."""
    db = _get_db()
    if db is None:
        # Dev mode: everyone is admin for ease of testing
        return "admin"
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        return doc.to_dict().get("role", "user")
    return "user"


# ─── Users ────────────────────────────────────────────────────────────────────

def get_all_users() -> list:
    db = _get_db()
    if db is None:
        return list(_mem_store["users"].values())
    docs = db.collection("users").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def create_user_profile(uid: str, data: dict):
    db = _get_db()
    record = {**data, "role": data.get("role", "user"), "createdAt": datetime.utcnow().isoformat()}
    if db is None:
        _mem_store["users"][uid] = {"id": uid, **record}
        return
    db.collection("users").document(uid).set(record)


def get_user_profile(uid: str) -> dict:
    db = _get_db()
    if db is None:
        return _mem_store["users"].get(uid, {})
    doc = db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else {}


# ─── Expenses ─────────────────────────────────────────────────────────────────

def add_expense(data: dict) -> str:
    db = _get_db()
    record = {**data, "status": "pending", "createdAt": datetime.utcnow().isoformat()}
    if db is None:
        eid = str(uuid.uuid4())
        _mem_store["expenses"][eid] = {"id": eid, **record}
        return eid
    doc_ref = db.collection("expenses").add(record)
    return doc_ref[1].id


def get_expenses(filters: dict = None) -> list:
    db = _get_db()
    if filters is None:
        filters = {}
    if db is None:
        items = list(_mem_store["expenses"].values())
        if filters.get("category"):
            items = [e for e in items if e.get("category") == filters["category"]]
        if filters.get("paid_by"):
            items = [e for e in items if e.get("paidBy") == filters["paid_by"]]
        return sorted(items, key=lambda x: x.get("createdAt", ""), reverse=True)
    from firebase_admin import firestore as fs
    query = db.collection("expenses").order_by("createdAt", direction=fs.Query.DESCENDING)
    if filters.get("category"):
        query = query.where("category", "==", filters["category"])
    if filters.get("paid_by"):
        query = query.where("paidBy", "==", filters["paid_by"])
    docs = query.stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def update_expense_status(expense_id: str, status: str):
    db = _get_db()
    if db is None:
        if expense_id in _mem_store["expenses"]:
            _mem_store["expenses"][expense_id]["status"] = status
        return
    db.collection("expenses").document(expense_id).update({
        "status": status,
        "updatedAt": datetime.utcnow().isoformat(),
    })


def get_expense_by_id(expense_id: str) -> dict:
    db = _get_db()
    if db is None:
        return _mem_store["expenses"].get(expense_id)
    doc = db.collection("expenses").document(expense_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


# ─── Itinerary ────────────────────────────────────────────────────────────────

def save_itinerary(trip_id: str, plan: list):
    db = _get_db()
    record = {"plan": plan, "updatedAt": datetime.utcnow().isoformat()}
    if db is None:
        _mem_store["itineraries"][trip_id] = record
        return
    db.collection("itineraries").document(trip_id).set(record)


def load_itinerary(trip_id: str) -> dict:
    db = _get_db()
    if db is None:
        return _mem_store["itineraries"].get(trip_id, {})
    doc = db.collection("itineraries").document(trip_id).get()
    return doc.to_dict() if doc.exists else {}


def update_itinerary_day(trip_id: str, day: int, changes: dict):
    db = _get_db()
    if db is None:
        data = _mem_store["itineraries"].get(trip_id, {})
        plan = data.get("plan", [])
        updated = [d if d.get("day") != day else {**d, **changes} for d in plan]
        _mem_store["itineraries"][trip_id] = {**data, "plan": updated}
        return
    doc_ref = db.collection("itineraries").document(trip_id)
    doc = doc_ref.get()
    if not doc.exists:
        return
    plan = doc.to_dict().get("plan", [])
    updated = [d if d.get("day") != day else {**d, **changes} for d in plan]
    doc_ref.update({"plan": updated, "updatedAt": datetime.utcnow().isoformat()})


# ─── Trips ────────────────────────────────────────────────────────────────────

def save_trip_meta(trip_id: str, meta: dict):
    db = _get_db()
    record = {**meta, "updatedAt": datetime.utcnow().isoformat()}
    if db is None:
        _mem_store["trips"][trip_id] = record
        return
    db.collection("trips").document(trip_id).set(record)


def get_trip_meta(trip_id: str) -> dict:
    db = _get_db()
    if db is None:
        return _mem_store["trips"].get(trip_id, {})
    doc = db.collection("trips").document(trip_id).get()
    return {"id": doc.id, **doc.to_dict()} if doc.exists else {}


# ─── Settlements ──────────────────────────────────────────────────────────────

def save_settlements(trip_id: str, settlements: list):
    db = _get_db()
    record = {"settlements": settlements, "updatedAt": datetime.utcnow().isoformat()}
    if db is None:
        _mem_store["settlements"][trip_id] = record
        return
    db.collection("settlements").document(trip_id).set(record)


def load_settlements(trip_id: str) -> list:
    db = _get_db()
    if db is None:
        return _mem_store["settlements"].get(trip_id, {}).get("settlements", [])
    doc = db.collection("settlements").document(trip_id).get()
    return doc.to_dict().get("settlements", []) if doc.exists else []
