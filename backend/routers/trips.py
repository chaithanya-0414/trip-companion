"""Trips router — manage trip metadata."""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import TripMeta
from services import firebase_service as fb
from routers.deps import get_current_user, require_admin

router = APIRouter()

@router.get("/{trip_id}")
async def get_trip_meta(trip_id: str, user=Depends(get_current_user)):
    data = fb.get_trip_meta(trip_id)
    if not data:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return data

@router.put("/{trip_id}")
async def update_trip_meta(trip_id: str, data: dict, admin=Depends(require_admin)):
    try:
        fb.save_trip_meta(trip_id, data)
        return {"success": True, "message": "Trip updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
