"""
WhatsApp webhook router — TripSync AI bot powered by Twilio.
Receives inbound messages, runs them through the AI agent, and replies.
"""

import os
import asyncio
import logging

from fastapi import APIRouter, Request, Response, Form
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse

from agent.trip_agent import get_agent_response
from services.whatsapp_service import format_for_whatsapp, send_message, _split_message
from services import firebase_service as fb

logger = logging.getLogger("tripsync.whatsapp")
router = APIRouter()

_DEFAULT_TRIP_ID = os.getenv("WHATSAPP_DEFAULT_TRIP_ID", "TRIP001")
_AGENT_TIMEOUT   = int(os.getenv("WHATSAPP_AGENT_TIMEOUT", "25"))

GREETING = (
    "Hello 🙋‍♀️ I'm *TripSync AI*, your smart group travel companion!\n\n"
    "I manage trip expenses, itineraries, settlements & more. "
    "As *admin* you have full access 🔑\n\n"
    "Just talk to me in plain English — no commands needed! 🗣️\n\n"
    "💡 *Try:*\n"
    "• _Show me all expenses_\n"
    "• _Add ₹500 dinner paid by Rahul_\n"
    "• _Plan a 3-day Goa trip for 10 people_\n"
    "• _Who owes whom?_\n"
    "• _Approve expense <id>_\n"
    "• _Show the itinerary_\n\n"
    "What would you like to do? 🙏"
)


# ─── Session storage — module-level so it persists within a warm Vercel instance ─
# Stored inside Firebase's _mem_store so it shares lifetime with the rest of app state.
def _sessions() -> dict:
    return fb._mem_store.setdefault("_wa_sessions", {})


def _validate_signature(url: str, params: dict, sig: str) -> bool:
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not token or token.startswith("your_auth"):
        return True  # dev mode — skip validation
    return RequestValidator(token).validate(url, params, sig)


def _twiml(text: str) -> Response:
    """Wrap text in TwiML MessagingResponse (max 1500 chars per Twilio best-practice)."""
    resp = MessagingResponse()
    resp.message(text[:1500])
    return Response(content=str(resp), media_type="application/xml")


def _empty_twiml() -> Response:
    """Return empty TwiML (no reply) — used when we already sent via REST API."""
    return Response(content=str(MessagingResponse()), media_type="application/xml")


def _phone_uid(phone: str) -> str:
    return "wa_" + "".join(c for c in phone if c.isdigit())


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(default=""),
    To: str  = Form(default=""),
    NumMedia: int = Form(default=0),
):
    """
    Twilio POSTs form-encoded data here when a WhatsApp message arrives.
    We reply with TwiML XML (first chunk) and push extra chunks via REST API.
    """
    # ── Signature validation (skipped in dev) ────────────────────────────────
    sig = request.headers.get("X-Twilio-Signature", "")
    if sig:
        form_data = dict(await request.form())
        if not _validate_signature(str(request.url), form_data, sig):
            logger.warning("Invalid Twilio signature from %s", From)
            return Response(content="Forbidden", status_code=403)

    phone   = From.strip()
    message = (Body or "").strip()
    uid     = _phone_uid(phone)
    store   = _sessions()
    is_new  = phone not in store

    # ── Session init ─────────────────────────────────────────────────────────
    if is_new:
        store[phone] = {"trip_id": _DEFAULT_TRIP_ID, "session_id": uid}

    session = store[phone]

    # ── Trip-switch command ───────────────────────────────────────────────────
    if message.lower().startswith("use trip "):
        tid = message.split(None, 2)[-1].strip().upper()
        store[phone]["trip_id"] = tid
        return _twiml(f"✅ Switched to trip *{tid}*. How can I help you?")

    # ── Empty body ────────────────────────────────────────────────────────────
    if not message:
        return _twiml("I didn't catch that — please send a text message 😊")

    normalized = message.lower().strip()

    # ── Greeting / menu ───────────────────────────────────────────────────────
    if normalized in {"hi", "hello", "hey", "start", "/start", "menu", "help"}:
        if is_new:
            # New user: send greeting and set session — nothing else to do
            return _twiml(GREETING)
        else:
            # Returning user asking for menu
            return _twiml(GREETING)

    # ── First non-greeting message from a new user → greet first, then answer ─
    if is_new:
        try:
            send_message(phone, GREETING)
        except Exception:
            pass  # best-effort; don't block the actual response

    # ── Run AI agent ──────────────────────────────────────────────────────────
    try:
        result = await asyncio.wait_for(
            get_agent_response(
                message=message,
                session_id=session["session_id"],
                user_uid=uid,
                user_role="admin",
                trip_id=session["trip_id"],
            ),
            timeout=_AGENT_TIMEOUT,
        )
        raw = result.get("output") or "I couldn't process that. Could you rephrase? 🤔"
    except asyncio.TimeoutError:
        logger.warning("Agent timed out for %s", phone)
        raw = (
            "⏳ That's taking longer than expected — "
            "the AI is still thinking! Please try again in a moment."
        )
    except Exception as e:
        logger.error("Agent error [%s]: %s", phone, e, exc_info=True)
        raw = (
            f"❌ Something went wrong: {str(e)[:300]}\n\n"
            "Please rephrase your request or try again."
        )

    formatted = format_for_whatsapp(raw)
    chunks    = _split_message(formatted)

    if len(chunks) == 1:
        return _twiml(chunks[0])

    # Multiple chunks: return first via TwiML, send rest via REST API
    try:
        for chunk in chunks[1:]:
            send_message(phone, chunk)
    except Exception as e:
        logger.warning("Could not send follow-up chunks: %s", e)

    return _twiml(chunks[0])


@router.get("/webhook")
async def whatsapp_health():
    return {"status": "TripSync WhatsApp bot is running ✅"}
