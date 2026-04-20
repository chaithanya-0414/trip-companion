"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ─── User ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    uid: str
    name: str
    email: str
    role: Literal["admin", "user"] = "user"
    avatar: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = None


# ─── Expense ──────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    trip_id: str
    amount: float = Field(..., gt=0)
    paid_by: str
    category: Literal["food", "travel", "stay", "misc", "activity"]
    description: Optional[str] = None
    proof_url: Optional[str] = None
    day: Optional[int] = None


class ExpenseUpdate(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    amount: float
    paid_by: str
    category: str
    description: Optional[str]
    proof_url: Optional[str]
    status: str
    day: Optional[int]
    created_at: Optional[str]


# ─── Itinerary ────────────────────────────────────────────────────────────────

class ActivityItem(BaseModel):
    time: str
    activity: str
    type: Literal["breakfast", "lunch", "dinner", "travel", "attraction", "stay", "misc"] = "misc"
    notes: Optional[str] = None
    cost_estimate: Optional[float] = None


class DayPlan(BaseModel):
    day: int
    date: Optional[str] = None
    location: str
    theme: Optional[str] = None
    activities: List[ActivityItem]
    travel_notes: Optional[str] = None


class ItineraryCreate(BaseModel):
    trip_id: str
    destination: str
    duration_days: int = Field(..., ge=1, le=21)
    group_size: int = Field(..., ge=2, le=50)
    budget_per_person: Optional[float] = None
    preferences: Optional[str] = None
    start_date: Optional[str] = None


class ItineraryResponse(BaseModel):
    trip_id: str
    plan: List[DayPlan]


# ─── Trip ─────────────────────────────────────────────────────────────────────

class TripMeta(BaseModel):
    trip_id: str
    title: str
    destination: str
    start_date: Optional[str]
    end_date: Optional[str]
    duration_days: int
    group_size: int
    budget_total: Optional[float]
    admin_uid: str


class TripMetaUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: Optional[int] = None
    group_size: Optional[int] = None
    budget_total: Optional[float] = None


# ─── Settlement ───────────────────────────────────────────────────────────────

class Settlement(BaseModel):
    from_person: str = Field(alias="from")
    to_person: str = Field(alias="to")
    amount: float
    settled: bool = False

    class Config:
        populate_by_name = True


class SettlementsResponse(BaseModel):
    trip_id: str
    settlements: List[dict]
    summary: dict


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    trip_id: Optional[str] = None
