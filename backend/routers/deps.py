"""
Auth dependency helper — extracts and verifies Firebase ID token.
In dev mode (no Firebase credentials), accepts any Bearer token.
"""

import os
from fastapi import Header, HTTPException
from services.firebase_service import verify_token, get_user_role


async def get_current_user(authorization: str = Header(default="Bearer dev-token")):
    """Extract user from Bearer token. In dev mode returns a test user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = authorization.split(" ", 1)[1]
    try:
        decoded = verify_token(token)
        decoded["role"] = get_user_role(decoded["uid"])
        return decoded
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


async def require_admin(authorization: str = Header(default="Bearer dev-token")):
    """Require admin role. In dev mode, always grants admin."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = authorization.split(" ", 1)[1]
    try:
        decoded = verify_token(token)
        role = get_user_role(decoded["uid"])
        if role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required.")
        decoded["role"] = role
        return decoded
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
