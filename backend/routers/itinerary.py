"""Itinerary router — create and manage day-wise trip plans."""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ItineraryCreate, DayPlan
from services import firebase_service as fb
from routers.deps import get_current_user, require_admin
from agent.trip_agent import generate_itinerary_with_agent

router = APIRouter()


@router.post("/create")
async def create_itinerary(data: ItineraryCreate, user=Depends(get_current_user)):
    try:
        plan = await generate_itinerary_with_agent(
            destination=data.destination,
            duration_days=data.duration_days,
            group_size=data.group_size,
            budget_per_person=data.budget_per_person,
            preferences=data.preferences,
            start_date=data.start_date,
        )
        fb.save_itinerary(data.trip_id, plan)
        return {
            "success": True,
            "trip_id": data.trip_id,
            "plan": plan,
            "message": f"✅ {data.duration_days}-day itinerary for {data.destination} created!",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}")
async def get_itinerary(trip_id: str, user=Depends(get_current_user)):
    data = fb.load_itinerary(trip_id)
    if not data:
        raise HTTPException(status_code=404, detail="Itinerary not found for this trip.")
    return {"trip_id": trip_id, **data}


@router.put("/{trip_id}/day/{day}")
async def update_itinerary_day(
    trip_id: str, day: int, changes: dict, admin=Depends(require_admin)
):
    try:
        fb.update_itinerary_day(trip_id, day, changes)
        return {"success": True, "message": f"Day {day} updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
