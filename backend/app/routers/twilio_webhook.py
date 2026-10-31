import logging
from typing import Optional
from fastapi import APIRouter, Request, Form, Response, Query
from app.services.twilio_service import twilio_service
from app.core.config import settings

logger = logging.getLogger("rekishi.twilio_router")

router = APIRouter(prefix="/api/twilio", tags=["Twilio Telephony"])

@router.get("/info")
def get_twilio_info(request: Request):
    """
    Returns Twilio integration status, registered webhook endpoints, and setup instructions.
    """
    host = request.base_url._url.rstrip("/")
    return {
        "configured": twilio_service.is_configured(),
        "fromNumber": settings.TWILIO_PHONE_NUMBER or "Pending Configuration",
        "accountSidSet": bool(settings.TWILIO_ACCOUNT_SID),
        "voiceType": "Male (Polly.Matthew)",
        "webhooks": {
            "voiceWebhook": f"{host}/api/twilio/voice-webhook",
            "gatherCallback": f"{host}/api/twilio/gather-callback",
            "statusCallback": f"{host}/api/twilio/status-callback"
        },
        "instructions": (
            "To connect live Twilio calling: Paste TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "and TWILIO_PHONE_NUMBER in backend/.env. If testing via cellular network, "
            "configure your Twilio Phone Number Voice Webhook URL to point to /api/twilio/voice-webhook."
        )
    }

@router.api_route("/voice-webhook", methods=["GET", "POST"])
async def voice_webhook(
    request: Request,
    contact_id: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    name: Optional[str] = Query(None)
):
    """
    Twilio Voice Webhook: Invoked when a call is answered by contact.
    Emits male-voice greeting and DTMF Gather prompt.
    """
    logger.info(f"[Twilio Webhook] Voice webhook received for Contact ID '{contact_id}' (Case: {case_id})")
    twiml = twilio_service.generate_initial_twiml(
        contact_name=name or "Witness",
        contact_id=contact_id or "UNKNOWN",
        case_id=case_id or "UNKNOWN"
    )
    return Response(content=twiml, media_type="application/xml")

@router.api_route("/gather-callback", methods=["GET", "POST"])
async def gather_callback(
    request: Request,
    contact_id: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None)
):
    """
    DTMF Keypad Callback: Processes user input (1 for Callback, 2 for Unavailable).
    Updates contact status and communication audit trail.
    """
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form)
    except Exception:
        pass

    digits = form_data.get("Digits", "")
    logger.info(f"[Twilio Webhook] Gather callback for Contact '{contact_id}'. Digits pressed: '{digits}'")

    # Update contact record and log communication history in contacts service
    from app.services.contacts_service import contacts_service
    if contact_id:
        if digits == "1":
            contacts_service.update_contact_status(
                contact_id=contact_id,
                new_status="Callback Requested",
                officer="Twilio Voice Assistant",
                note="Automated Voice Assistant: Contact pressed 1. Requested investigator callback / appointment slot."
            )
            contacts_service.log_history(
                contact_id=contact_id,
                case_id=case_id or "",
                comm_type="Automated Twilio Call",
                outcome="Call Answered - Callback Requested (Key 1)",
                notes="Citizen indicated availability and requested callback from investigating officer.",
                assigned_officer="Twilio Voice Assistant"
            )
        elif digits == "2":
            contacts_service.update_contact_status(
                contact_id=contact_id,
                new_status="Contact Attempted",
                officer="Twilio Voice Assistant",
                note="Automated Voice Assistant: Contact pressed 2. Currently unavailable."
            )
            contacts_service.log_history(
                contact_id=contact_id,
                case_id=case_id or "",
                comm_type="Automated Twilio Call",
                outcome="Call Answered - Busy / Unavailable (Key 2)",
                notes="Citizen indicated they are currently unavailable; follow-up scheduled.",
                assigned_officer="Twilio Voice Assistant"
            )

    twiml = twilio_service.generate_gather_twiml(digits)
    return Response(content=twiml, media_type="application/xml")

@router.api_route("/status-callback", methods=["GET", "POST"])
async def status_callback(
    request: Request,
    contact_id: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None)
):
    """
    Twilio Call Status Webhook: Logs final call duration and status.
    """
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form)
    except Exception:
        pass

    call_status = form_data.get("CallStatus", "completed")
    call_duration = form_data.get("CallDuration", "0")
    logger.info(f"[Twilio Webhook] Status callback for Contact '{contact_id}': Status={call_status}, Duration={call_duration}s")

    from app.services.contacts_service import contacts_service
    if contact_id and call_status in ["completed", "no-answer", "busy", "failed"]:
        outcome = (
            f"Call {call_status.title()} (Duration: {call_duration}s)"
            if call_status == "completed"
            else f"Call {call_status.title()} / No Answer"
        )
        contacts_service.log_history(
            contact_id=contact_id,
            case_id=case_id or "",
            comm_type="Automated Twilio Call",
            outcome=outcome,
            notes=f"Cellular voice dispatch final status: {call_status}. Audio duration: {call_duration} seconds.",
            assigned_officer="Twilio Voice Assistant"
        )

    return {"received": True, "callStatus": call_status}

