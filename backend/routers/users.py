"""Users router — register and list trip members."""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import UserCreate
from services import firebase_service as fb
from routers.deps import get_current_user, require_admin

router = APIRouter()


@router.get("")
async def get_users(user=Depends(get_current_user)):
    try:
        users = fb.get_all_users()
        return {"users": users, "count": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register_user(data: UserCreate, admin=Depends(require_admin)):
    try:
        fb.create_user_profile(data.uid, {
            "name": data.name,
            "email": data.email,
            "role": data.role,
            "avatar": data.avatar,
        })
        return {"success": True, "message": f"User {data.name} registered as {data.role}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    profile = fb.get_user_profile(user["uid"])
    return {"uid": user["uid"], "role": user.get("role", "user"), **profile}
