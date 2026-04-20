"""
TripSync AI — FastAPI Backend
Entry point with CORS, auth middleware, and all routers mounted.
"""

import os
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from routers import expenses, itinerary, users, settlements, chat, trips, whatsapp

app = FastAPI(
    title="TripSync AI API",
    description="AI-powered group travel companion backend",
    version="1.0.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
_origins_stripped = [o.strip() for o in _raw_origins]
_wildcard = "*" in _origins_stripped

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard else _origins_stripped,
    # credentials=True is incompatible with allow_origins=["*"] per CORS spec
    allow_credentials=not _wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(chat.router,        prefix="/chat",        tags=["Chat"])
app.include_router(expenses.router,    prefix="/expenses",    tags=["Expenses"])
app.include_router(itinerary.router,   prefix="/itinerary",   tags=["Itinerary"])
app.include_router(users.router,       prefix="/users",       tags=["Users"])
app.include_router(settlements.router, prefix="/settlements", tags=["Settlements"])
app.include_router(trips.router,       prefix="/trips",       tags=["Trips"])
app.include_router(whatsapp.router,    prefix="/whatsapp",    tags=["WhatsApp"])


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "TripSync AI API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# ─── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("tripsync").error("Unhandled exception at %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "path": str(request.url)},
    )


# ─── DEV: Seed dummy data ─────────────────────────────────────────────────────
@app.post("/dev/seed", tags=["Dev"])
def seed_dev_data():
    """Populate in-memory store with realistic test data for dev preview."""
    from services import firebase_service as fb
    from datetime import datetime, timedelta
    import uuid

    base = datetime(2024, 12, 15)

    # Members
    members = [
        {"name": "Rahul Sharma",  "email": "rahul@trip.com",  "role": "admin"},
        {"name": "Riya Mehta",    "email": "riya@trip.com",   "role": "user"},
        {"name": "Arjun Patel",   "email": "arjun@trip.com",  "role": "user"},
        {"name": "Sneha Kapoor",  "email": "sneha@trip.com",  "role": "user"},
        {"name": "Vikram Nair",   "email": "vikram@trip.com", "role": "user"},
    ]
    for i, m in enumerate(members):
        uid = f"user_{i}"
        fb._mem_store["users"][uid] = {"id": uid, **m, "createdAt": base.isoformat()}

    # Trip meta
    fb._mem_store["trips"]["TRIP001"] = {
        "id": "TRIP001", "name": "Manali Workation",
        "destination": "Manali, India", "startDate": "2024-12-18",
        "endDate": "2024-12-22", "groupSize": 12, "budget": 150000,
        "updatedAt": base.isoformat(),
    }

    # Expenses
    expenses_data = [
        {"description": "Flight tickets BOM-GOA (12 pax)", "amount": 84000, "category": "travel",   "paidBy": "Rahul Sharma",  "status": "approved", "daysAgo": 5},
        {"description": "Hotel Seaside Palms (4 nights)",   "amount": 48000, "category": "stay",     "paidBy": "Rahul Sharma",  "status": "approved", "daysAgo": 4},
        {"description": "Group dinner at Martin's Corner",   "amount":  3600, "category": "food",     "paidBy": "Riya Mehta",    "status": "pending",  "daysAgo": 2},
        {"description": "Dudhsagar waterfall jeep safari",  "amount":  6000, "category": "activity", "paidBy": "Arjun Patel",   "status": "pending",  "daysAgo": 2},
        {"description": "Goa casino night entry (6 pax)",   "amount":  7200, "category": "activity", "paidBy": "Vikram Nair",   "status": "rejected", "daysAgo": 1},
        {"description": "Breakfast buffet Day 2",            "amount":  2400, "category": "food",     "paidBy": "Sneha Kapoor",  "status": "pending",  "daysAgo": 1},
        {"description": "Local taxi day 1",                  "amount":  1800, "category": "travel",   "paidBy": "Arjun Patel",   "status": "approved", "daysAgo": 3},
        {"description": "Beach shack lunch",                 "amount":  2100, "category": "food",     "paidBy": "Riya Mehta",    "status": "approved", "daysAgo": 2},
        {"description": "Snorkeling trip (12 pax)",          "amount":  9600, "category": "activity", "paidBy": "Rahul Sharma",  "status": "pending",  "daysAgo": 0},
        {"description": "Spice plantation tour",             "amount":  3000, "category": "activity", "paidBy": "Sneha Kapoor",  "status": "approved", "daysAgo": 1},
    ]
    for e in expenses_data:
        eid = str(uuid.uuid4())
        created = (base + timedelta(days=5 - e["daysAgo"])).isoformat()
        fb._mem_store["expenses"][eid] = {
            "id": eid, "tripId": "TRIP001",
            "description": e["description"], "amount": e["amount"],
            "category": e["category"], "paidBy": e["paidBy"],
            "status": e["status"], "createdAt": created,
            "splitAmong": [m["name"] for m in members],
        }

    # Itinerary
    fb._mem_store["itineraries"]["TRIP001"] = {
        "plan": [
            {
                "day": 1, "date": "2024-12-18", "title": "Arrival & North Goa",
                "activities": [
                    {"time": "10:00", "name": "Land at GOA Airport", "type": "travel", "cost": 0, "notes": "Domestic terminal"},
                    {"time": "13:00", "name": "Check-in Hotel Seaside Palms", "type": "stay", "cost": 0, "notes": "Candolim Beach road"},
                    {"time": "15:00", "name": "Calangute & Baga Beach walk", "type": "activity", "cost": 0, "notes": "Sunset photo spots"},
                    {"time": "20:00", "name": "Dinner at Infantaria Bakery", "type": "food", "cost": 300, "notes": "Per person"},
                ]
            },
            {
                "day": 2, "date": "2024-12-19", "title": "South Goa & Dudhsagar",
                "activities": [
                    {"time": "07:00", "name": "Buffet Breakfast", "type": "food", "cost": 200, "notes": "Hotel"},
                    {"time": "09:00", "name": "Dudhsagar Waterfall Jeep Safari", "type": "activity", "cost": 500, "notes": "Book in advance"},
                    {"time": "14:00", "name": "Spice Plantation Lunch Tour", "type": "food", "cost": 250, "notes": "Includes lunch"},
                    {"time": "20:00", "name": "Martin's Corner Dinner", "type": "food", "cost": 300, "notes": "Famous for seafood"},
                ]
            },
            {
                "day": 3, "date": "2024-12-20", "title": "Water Sports & Leisure",
                "activities": [
                    {"time": "08:00", "name": "Beach Shack Breakfast", "type": "food", "cost": 175, "notes": "Arambol beach"},
                    {"time": "10:00", "name": "Snorkeling Trip", "type": "activity", "cost": 800, "notes": "Grande Island"},
                    {"time": "15:00", "name": "Free time shopping — Anjuna Market", "type": "activity", "cost": 0, "notes": "Flea market"},
                    {"time": "21:00", "name": "Rooftop BBQ dinner", "type": "food", "cost": 400, "notes": "Hotel terrace"},
                ]
            },
            {
                "day": 4, "date": "2024-12-21", "title": "Old Goa & Cultural Day",
                "activities": [
                    {"time": "09:00", "name": "Basilica of Bom Jesus", "type": "activity", "cost": 0, "notes": "UNESCO site"},
                    {"time": "11:00", "name": "Fontainhas Latin Quarter", "type": "activity", "cost": 0, "notes": "Heritage walk"},
                    {"time": "13:00", "name": "Viva Panjim lunch", "type": "food", "cost": 250, "notes": "Authentic Goan"},
                    {"time": "20:00", "name": "Farewell dinner cruise", "type": "food", "cost": 1200, "notes": "Mandovi River"},
                ]
            },
            {
                "day": 5, "date": "2024-12-22", "title": "Departure",
                "activities": [
                    {"time": "08:00", "name": "Last breakfast & checkout", "type": "food", "cost": 0, "notes": ""},
                    {"time": "11:00", "name": "Depart GOA Airport", "type": "travel", "cost": 0, "notes": "T2 terminal"},
                ]
            },
        ],
        "updatedAt": base.isoformat(),
    }

    total_exp = sum(e["amount"] for e in expenses_data)
    return {
        "ok": True,
        "seeded": {
            "members": len(members),
            "expenses": len(expenses_data),
            "total_expenses": total_exp,
            "itinerary_days": 5,
            "trip": "Manali Workathon (TRIP001)",
        }
    }
