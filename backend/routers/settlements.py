"""Settlements router — calculate and manage debt settlements."""

from fastapi import APIRouter, HTTPException, Depends, Body
from services import firebase_service as fb
from services.settlement_engine import calculate_settlements, get_expense_summary
from routers.deps import get_current_user

router = APIRouter()


@router.get("/calculate/{trip_id}")
async def calculate_trip_settlements(trip_id: str, user=Depends(get_current_user)):
    try:
        expenses = fb.get_expenses({})
        trip_expenses = [e for e in expenses if e.get("tripId") == trip_id]

        settlements = calculate_settlements(trip_expenses)
        summary = get_expense_summary(trip_expenses)

        # Persist calculated settlements
        fb.save_settlements(trip_id, settlements)

        return {
            "trip_id": trip_id,
            "settlements": settlements,
            "summary": summary,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trip_id}")
async def get_settlements(trip_id: str, user=Depends(get_current_user)):
    settlements = fb.load_settlements(trip_id)
    return {"trip_id": trip_id, "settlements": settlements}


@router.post("/{trip_id}/mark-settled")
async def mark_settled(
    trip_id: str,
    settlement: dict = Body(...),
    user=Depends(get_current_user),
):
    try:
        settlements = fb.load_settlements(trip_id)
        updated = []
        for s in settlements:
            if s.get("from") == settlement.get("from") and s.get("to") == settlement.get("to"):
                updated.append({**s, "settled": True})
            else:
                updated.append(s)
        fb.save_settlements(trip_id, updated)
        return {"success": True, "message": "Settlement marked as paid."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
