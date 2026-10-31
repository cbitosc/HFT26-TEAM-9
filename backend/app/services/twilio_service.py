import logging
import urllib.parse
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("rekishi.twilio")

class TwilioService:
    """
    Twilio Telephony & Voice Assistant Service for Case-Based Witness Coordination.
    - Automated telephone dispatch for witness/contact follow-up
    - TwiML generation using male voice ('man' / 'Polly.Matthew')
    - Interactive DTMF Gather callback handler (Press 1 for Callback, Press 2 for Unavailable)
    - Resilient simulation mode when API credentials are pending configuration
    """

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.base_url = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
        self._client = None

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    def get_client(self):
        if not self.is_configured():
            return None
        if not self._client:
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                logger.error(f"[Twilio] Failed to initialize client: {e}")
                return None
        return self._client

    def generate_initial_twiml(self, contact_name: str, contact_id: str, case_id: str) -> str:
        """
        Generates court-compliant TwiML greeting using Polly.Matthew male voice:
        1. Identifies as Rekishi Forensics automated case coordination assistant
        2. Announces specific case number
        3. Requests attendance within three days
        """
        clean_name = contact_name or "Citizen"
        if case_id and case_id != "UNKNOWN":
            spoken_case = case_id.replace("-", " ")
            case_phrase = f"for case number {spoken_case}"
        else:
            case_phrase = "for your official incident dossier"

        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Response>'
            '<Pause length="1"/>'
            '<Say voice="Polly.Matthew">'
            f'Hello {clean_name}. This is Rekishi Forensics regarding your incident report {case_phrase}. '
            'Please visit our investigation office within the next three days. '
            'Thank you, goodbye.'
            '</Say>'
            '<Pause length="1"/>'
            '<Hangup/>'
            '</Response>'
        )
        return twiml

    def generate_gather_twiml(self, digit: str) -> str:
        """
        Generates dynamic response according to DTMF key pressed by contact.
        """
        if digit == "1":
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew">
        Thank you. Your request for an investigator callback has been logged in the official case dossier. An authorized officer will contact you during preferred hours. Goodbye.
    </Say>
    <Hangup/>
</Response>"""
        elif digit == "2":
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew">
        Thank you for letting us know. We have noted that you are currently unavailable and will attempt contact at another time. Goodbye.
    </Say>
    <Hangup/>
</Response>"""
        else:
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew">
        Invalid selection received. An investigator will follow up with you directly. Thank you, goodbye.
    </Say>
    <Hangup/>
</Response>"""
        return twiml

    def initiate_call(
        self,
        contact_id: str,
        case_id: str,
        to_number: str,
        contact_name: str,
        host_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Triggers cellular network call via Twilio Voice API.
        If Twilio credentials are not yet entered, runs realistic simulation.
        """
        client = self.get_client()
        base_url = (host_override or self.base_url).rstrip("/")
        voice_url = f"{base_url}/api/twilio/voice-webhook?contact_id={urllib.parse.quote(contact_id)}&case_id={urllib.parse.quote(case_id)}&name={urllib.parse.quote(contact_name)}"
        status_url = f"{base_url}/api/twilio/status-callback?contact_id={urllib.parse.quote(contact_id)}&case_id={urllib.parse.quote(case_id)}"

        if not client or not self.from_number:
            logger.info(f"[Twilio] Credentials not active in backend/.env. Executing realistic simulation call to {to_number} for {contact_name}.")
            return {
                "success": True,
                "mode": "simulated",
                "contactId": contact_id,
                "caseId": case_id,
                "toNumber": to_number,
                "contactName": contact_name,
                "callSid": f"SIM_CA{contact_id[-6:]}_{case_id[-4:]}",
                "status": "queued",
                "voice": "Polly.Matthew (Male)",
                "webhookUrl": voice_url,
                "message": (
                    f"Automated voice call simulated for {contact_name} ({to_number}). "
                    f"To dispatch live cellular network calls, add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
                    f"and TWILIO_PHONE_NUMBER into backend/.env."
                )
            }

        try:
            # Normalize telephone format
            clean_to = to_number.strip().replace(" ", "").replace("-", "")
            if not clean_to.startswith("+"):
                clean_to = f"+91{clean_to}" if len(clean_to) == 10 else f"+{clean_to}"

            is_localhost = "localhost" in base_url or "127.0.0.1" in base_url
            twiml_content = self.generate_initial_twiml(contact_name, contact_id, case_id)

            call_kwargs = {
                "to": clean_to,
                "from_": self.from_number
            }
            if is_localhost:
                # Use echo webhook for local development to ensure compatibility with Twilio Trial accounts
                # (Trial accounts disallow direct inline 'twiml' parameter)
                echo_url = "https://twimlets.com/echo?Twiml=" + urllib.parse.quote(twiml_content)
                call_kwargs["url"] = echo_url
            else:
                call_kwargs["url"] = voice_url
                call_kwargs["status_callback"] = status_url
                call_kwargs["status_callback_event"] = ["initiated", "ringing", "answered", "completed"]
                call_kwargs["status_callback_method"] = "POST"

            call = client.calls.create(**call_kwargs)

            logger.info(f"[Twilio] Live call dispatched successfully! Call SID: {call.sid}")
            return {
                "success": True,
                "mode": "live",
                "contactId": contact_id,
                "caseId": case_id,
                "toNumber": clean_to,
                "fromNumber": self.from_number,
                "callSid": call.sid,
                "status": call.status,
                "voice": "Polly.Matthew (Male)",
                "webhookUrl": voice_url,
                "message": f"Twilio voice call dispatched to {clean_to}. Call SID: {call.sid}."
            }
        except Exception as e:
            logger.error(f"[Twilio] Failed to dispatch live call to {to_number}: {e}")
            return {
                "success": False,
                "mode": "error",
                "error": str(e),
                "message": f"Twilio dispatch error: {e}. Check number formatting (+91...) or verify verified caller ID."
            }

twilio_service = TwilioService()

