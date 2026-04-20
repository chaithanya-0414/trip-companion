"""
WhatsApp webhook router — TripSync AI bot powered by Twilio.
Receives inbound messages, runs them through the AI agent, and replies.
"""

import os
import logging

from fastapi import APIRouter, Request, Response, Form
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse

from agent.trip_agent import get_agent_response
from services.whatsapp_service import format_for_whatsapp, send_message

logger = logging.getLogger("tripsync.whatsapp")

router = APIRouter()

# ─── Greeting keywords that trigger the welcome message ───────────────────────
_GREETING_WORDS = {"hi", "hello", "hey", "start", "/start", "help", "menu"}

# ─── Default trip ID for WhatsApp sessions (can be overridden per session) ────
_DEFAULT_TRIP_ID = os.getenv("WHATSAPP_DEFAULT_TRIP_ID", "TRIP001")

# ─── Per-phone session state: { phone: { trip_id, session_id } } ─────────────
_wa_sessions: dict[str, dict] = {}

GREETING = """Hello 🙋‍♀️ I'm *TripSync AI*, your smart group travel companion!

I help you manage trip logistics, expenses, and itinerary. As *admin* you have full access, including approving/rejecting expenses and updating the itinerary 📝.

What would you like to do? 🤔

1️⃣ Create a new itinerary 🗓️
2️⃣ Add a new expense 💸
3️⃣ View current expenses 📊
4️⃣ Calculate settlements 📈
5️⃣ Update the itinerary 📝
6️⃣ Approve / Reject expenses ✅❌
7️⃣ Get trip members 👥

Just tell me what you need — in plain English! 🙏"""


def _validate_twilio_signature(request_url: str, post_params: dict, signature: str) -> bool:
    """Validate X-Twilio-Signature to ensure the request is from Twilio."""
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not auth_token or auth_token == "your_auth_token_here":
        return True  # skip in dev mode
    validator = RequestValidator(auth_token)
    return validator.validate(request_url, post_params, signature)


def _twiml_reply(text: str) -> Response:
    """Return a TwiML response with a single message (≤1500 chars)."""
    resp = MessagingResponse()
    resp.message(text)
    return Response(content=str(resp), media_type="application/xml")


def _phone_to_uid(phone: str) -> str:
    """Derive a stable user uid from a WhatsApp phone string."""
    # Strip "whatsapp:" prefix and non-digit chars for a clean uid
    return "wa_" + "".join(filter(str.isdigit, phone))


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    From: str = Form(...),
    Body: str = Form(...),
    To: str = Form(default=""),
    NumMedia: int = Form(default=0),
):
    """
    Twilio webhook for inbound WhatsApp messages.
    Twilio POSTs form-encoded data; we reply with TwiML XML.
    """
    # ── Optional signature validation ────────────────────────────────────────
    signature = request.headers.get("X-Twilio-Signature", "")
    if signature:
        form_data = dict(await request.form())
        if not _validate_twilio_signature(str(request.url), form_data, signature):
            logger.warning("Invalid Twilio signature from %s", From)
            return Response(content="Forbidden", status_code=403)

    phone = From.strip()
    message = Body.strip()
    uid = _phone_to_uid(phone)

    logger.info("WhatsApp [%s]: %s", phone, message[:80])

    # ── Greeting detection ────────────────────────────────────────────────────
    if message.lower() in _GREETING_WORDS or phone not in _wa_sessions:
        _wa_sessions[phone] = {
            "session_id": uid,
            "trip_id": _DEFAULT_TRIP_ID,
        }
        return _twiml_reply(GREETING)

    # ── Trip-ID override: user can say "use trip TRIP002" ─────────────────────
    lower = message.lower()
    if lower.startswith("use trip "):
        new_trip = message.split(" ", 2)[-1].strip().upper()
        _wa_sessions[phone]["trip_id"] = new_trip
        return _twiml_reply(f"✅ Switched to trip *{new_trip}*. How can I help you?")

    session = _wa_sessions[phone]

    # ── Run AI agent ──────────────────────────────────────────────────────────
    try:
        result = await get_agent_response(
            message=message,
            session_id=session["session_id"],
            user_uid=uid,
            user_role="admin",
            trip_id=session["trip_id"],
        )
        raw = result.get("output", "Sorry, I couldn't process that. Please try again.")
    except Exception as e:
        logger.error("Agent error for %s: %s", phone, e, exc_info=True)
        raw = "❌ Sorry, something went wrong on my end. Please try again in a moment."

    formatted = format_for_whatsapp(raw)

    # ── For long responses: send extras via REST API, reply first chunk via TwiML
    from services.whatsapp_service import _split_message
    chunks = _split_message(formatted)

    if len(chunks) == 1:
        return _twiml_reply(chunks[0])

    # Send all but first chunk via REST (fire-and-forget), reply with first
    try:
        for chunk in chunks[1:]:
            send_message(phone, chunk)
    except Exception as e:
        logger.warning("Failed to send follow-up chunks: %s", e)

    return _twiml_reply(chunks[0])


@router.get("/webhook")
async def whatsapp_verify():
    """Health check for the webhook URL."""
    return {"status": "TripSync WhatsApp bot is running ✅"}
