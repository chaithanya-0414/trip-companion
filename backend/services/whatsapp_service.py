"""
WhatsApp service — Twilio client wrapper for TripSync AI bot.
Handles sending messages, formatting, and chunking long responses.
"""

import os
import re
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None

WHATSAPP_MAX_LEN = 1500  # conservative limit (hard limit is 4096)


def _get_client() -> Client:
    global _client
    if _client is None:
        sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        if not sid or not token:
            raise RuntimeError("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set.")
        _client = Client(sid, token)
    return _client


def send_message(to: str, body: str) -> None:
    """Send one or more WhatsApp messages to `to` (e.g. 'whatsapp:+91XXXXXXXXXX')."""
    from_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "")
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"
    client = _get_client()
    for chunk in _split_message(body):
        client.messages.create(from_=from_number, to=to, body=chunk)


def format_for_whatsapp(text: str) -> str:
    """Convert markdown-style formatting to WhatsApp-compatible text."""
    # Bold: **text** or __text__ → *text*
    text = re.sub(r"\*\*(.+?)\*\*", r"*\1*", text)
    text = re.sub(r"__(.+?)__", r"*\1*", text)
    # Italic: *text* (single) already fine; _text_ → _text_ (already whatsapp)
    # Strikethrough: ~~text~~ → ~text~
    text = re.sub(r"~~(.+?)~~", r"~\1~", text)
    # Code blocks → monospace
    text = re.sub(r"```[\w]*\n?([\s\S]*?)```", r"`\1`", text)
    # Headers: ## Title → *Title*
    text = re.sub(r"^#{1,3}\s+(.+)$", r"*\1*", text, flags=re.MULTILINE)
    # Remove HTML tags if any
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


def _split_message(text: str, max_len: int = WHATSAPP_MAX_LEN) -> list[str]:
    """Split text into chunks at paragraph boundaries, never mid-sentence."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    paragraphs = text.split("\n\n")
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 <= max_len:
            current = f"{current}\n\n{para}".lstrip("\n")
        else:
            if current:
                chunks.append(current.strip())
            # If a single paragraph exceeds max_len, split at sentence boundary
            if len(para) > max_len:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                current = ""
                for s in sentences:
                    if len(current) + len(s) + 1 <= max_len:
                        current = f"{current} {s}".lstrip()
                    else:
                        if current:
                            chunks.append(current.strip())
                        current = s
            else:
                current = para

    if current:
        chunks.append(current.strip())

    return [c for c in chunks if c]
