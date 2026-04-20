"""Chat router — conversational AI agent endpoint."""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ChatMessage
from agent.trip_agent import get_agent_response
from routers.deps import get_current_user

router = APIRouter()


@router.post("")
async def chat(message: ChatMessage, user=Depends(get_current_user)):
    try:
        response = await get_agent_response(
            message=message.message,
            session_id=message.session_id or user["uid"],
            user_uid=user["uid"],
            user_role=user.get("role", "user"),
            trip_id=message.trip_id,
        )
        return {
            "response": response.get("output", ""),
            "tool_calls": response.get("tool_calls", []),
            "session_id": message.session_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
