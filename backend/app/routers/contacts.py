import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Request

from app.services.contacts_service import contacts_service
from app.services.twilio_service import twilio_service

logger = logging.getLogger("rekishi.contacts_router")

router = APIRouter(prefix="/api/cases/{case_id}/contacts", tags=["Case Contacts & Witness Coordination"])

class CreateContactRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Full name of witness, owner, or informant")
    phone_number: str = Field(..., min_length=6, description="Contact phone number (e.g. +91 63035 31123)")
    contact_category: str = Field("Witness", description="Witness, Vehicle Owner, Informant, Other")
    associated_vehicle: Optional[str] = Field(None, description="Optional associated vehicle identifier")
    address: Optional[str] = Field(None, description="Residential or business address")
    notes: Optional[str] = Field(None, description="Investigator notes / scene observations")
    contact_status: Optional[str] = Field("Not Contacted", description="Initial contact status")
    preferred_contact_time: Optional[str] = Field(None, description="e.g. Morning 10:00 AM - 12:00 PM")
    assigned_officer: Optional[str] = Field("Inspector", description="Assigned investigator")
    allow_duplicate: Optional[bool] = Field(False, description="Allow adding even if potential duplicate exists")

class UpdateContactRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    contact_category: Optional[str] = None
    associated_vehicle: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    contact_status: Optional[str] = None
    preferred_contact_time: Optional[str] = None
    assigned_officer: Optional[str] = None
    identity_verified: Optional[bool] = None
    next_follow_up: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    status: str
    officer: Optional[str] = "Investigator"
    notes: Optional[str] = None

class LogHistoryRequest(BaseModel):
    communication_type: str = Field("Manual Phone Call", description="Manual Phone Call, Automated Twilio Call, In-Person Visit, SMS")
    outcome: str = Field(..., description="Call outcome or meeting result")
    notes: Optional[str] = None
    assigned_officer: Optional[str] = "Investigator"
    next_follow_up: Optional[str] = None

class CallContactRequest(BaseModel):
    mode: str = Field("automated", description="'automated' (Twilio) or 'manual'")
    officer: Optional[str] = "Investigator"
    notes: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None

class VerifyIdentityRequest(BaseModel):
    officer: str = Field(..., description="Name of authorized verifying officer")
    verification_method: Optional[str] = "Government Photo ID Physical Verification"

class LinkStatementRequest(BaseModel):
    statement_text: str = Field(..., min_length=10, description="Sworn deposition text")
    officer: Optional[str] = "Investigator"

@router.get("")
def list_case_contacts(case_id: str):
    """
    Returns all contacts associated with a specific case, along with dashboard KPI metrics.
    """
    contacts = contacts_service.get_contacts_for_case(case_id)
    
    # Calculate case-level metrics
    total = len(contacts)
    contacted = sum(1 for c in contacts if c.get("contact_status") in ["Contacted", "Identity Verified", "Statement Collected", "Callback Requested", "Visit Scheduled"])
    pending = sum(1 for c in contacts if c.get("contact_status") in ["Not Contacted", "Contact Attempted"])
    scheduled_visits = sum(1 for c in contacts if c.get("contact_status") == "Visit Scheduled")
    statements_collected = sum(1 for c in contacts if c.get("contact_status") == "Statement Collected")
    identity_verified = sum(1 for c in contacts if c.get("identity_verified") is True)

    return {
        "caseId": case_id,
        "metrics": {
            "totalContacts": total,
            "contactedCount": contacted,
            "pendingAttempts": pending,
            "scheduledVisits": scheduled_visits,
            "statementsCollected": statements_collected,
            "identityVerified": identity_verified
        },
        "contacts": contacts
    }

@router.post("")
def add_case_contact(case_id: str, payload: CreateContactRequest):
    """
    Creates a new contact for the specified case.
    Validates duplicates by telephone number and name within the same case.
    """
    # Check for duplicate within the same case
    duplicate = contacts_service.check_duplicate(case_id, payload.phone_number, payload.full_name)
    if duplicate and not payload.allow_duplicate:
        return {
            "success": False,
            "isDuplicateWarning": True,
            "duplicateContact": duplicate,
            "message": (
                f"A contact named '{duplicate['full_name']}' with number '{duplicate['phone_number']}' "
                f"already exists in this case dossier (ID: {duplicate['id']}). "
                f"Confirm if you wish to proceed."
            )
        }

    contact = contacts_service.create_contact(case_id, payload.model_dump())
    return {
        "success": True,
        "contact": contact,
        "message": f"Contact '{contact['full_name']}' successfully added to case {case_id}."
    }

@router.get("/{contact_id}")
def get_contact(case_id: str, contact_id: str):
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")
    return contact

@router.put("/{contact_id}")
def update_contact(case_id: str, contact_id: str, payload: UpdateContactRequest):
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")
    
    updated = contacts_service.update_contact(contact_id, payload.model_dump(exclude_unset=True))
    return {
        "success": True,
        "contact": updated,
        "message": f"Contact '{updated['full_name']}' updated."
    }

@router.patch("/{contact_id}/status")
def update_contact_status(case_id: str, contact_id: str, payload: StatusUpdateRequest):
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")

    updated = contacts_service.update_contact_status(
        contact_id=contact_id,
        new_status=payload.status,
        officer=payload.officer or "Investigator",
        note=payload.notes
    )
    return {
        "success": True,
        "contact": updated,
        "message": f"Status updated to '{payload.status}'."
    }

@router.delete("/{contact_id}")
def delete_contact(case_id: str, contact_id: str):
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")

    contacts_service.delete_contact(contact_id)
    return {
        "success": True,
        "message": f"Contact '{contact['full_name']}' deleted from case."
    }

@router.get("/{contact_id}/history")
def get_contact_history(case_id: str, contact_id: str):
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")

    history = contacts_service.get_history(contact_id)
    return {
        "contactId": contact_id,
        "caseId": case_id,
        "history": history
    }

@router.post("/{contact_id}/history")
def add_contact_history(case_id: str, contact_id: str, payload: LogHistoryRequest):
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")

    entry = contacts_service.log_history(
        contact_id=contact_id,
        case_id=case_id,
        comm_type=payload.communication_type,
        outcome=payload.outcome,
        notes=payload.notes,
        assigned_officer=payload.assigned_officer or "Investigator",
        next_follow_up=payload.next_follow_up
    )
    return {
        "success": True,
        "historyEntry": entry,
        "message": "Communication record logged in audit trail."
    }

@router.post("/{contact_id}/call")
def trigger_call(case_id: str, contact_id: str, payload: CallContactRequest, request: Request):
    """
    Triggers automated telephone call via Twilio Voice API, or records manual call attempt.
    """
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact:
        if payload.phone_number:
            contact = {
                "id": contact_id,
                "case_id": case_id,
                "full_name": payload.full_name or "Witness",
                "phone_number": payload.phone_number,
                "contact_status": "Not Contacted"
            }
            contacts_service.create_contact(case_id, contact)
        else:
            raise HTTPException(status_code=404, detail="Contact not found for this case")

    if payload.mode == "manual":
        # Log manual call
        contacts_service.update_contact_status(
            contact_id=contact_id,
            new_status="Contact Attempted",
            officer=payload.officer or "Investigator",
            note=payload.notes or "Manual telephone call initiated from investigator device."
        )
        entry = contacts_service.log_history(
            contact_id=contact_id,
            case_id=case_id,
            comm_type="Manual Phone Call",
            outcome="Manual Call Initiated",
            notes=payload.notes or f"Manual phone call dialed to {contact['phone_number']} by {payload.officer}.",
            assigned_officer=payload.officer or "Investigator"
        )
        return {
            "success": True,
            "mode": "manual",
            "telUrl": f"tel:{contact['phone_number']}",
            "contact": contact,
            "historyEntry": entry,
            "message": f"Manual call logged. Dialing {contact['phone_number']}..."
        }

    # Automated Twilio Voice call
    host_override = str(request.base_url).rstrip("/")
    dispatch_res = twilio_service.initiate_call(
        contact_id=contact_id,
        case_id=case_id,
        to_number=contact["phone_number"],
        contact_name=contact["full_name"],
        host_override=host_override
    )

    # Generate the actual conversation transcript delivered to the contact
    clean_name = contact.get("full_name") or "Citizen"
    clean_case = case_id if case_id and case_id != "UNKNOWN" else "101"
    spoken_case = clean_case.replace("-", " ")
    conversation_script = (
        f'Hello {clean_name}. This is Rekishi Forensics regarding your incident report '
        f'for case number {spoken_case}. Please visit our investigation office within '
        f'the next three days. Thank you, goodbye.'
    )

    # Update contact status without generating a duplicate log entry
    contacts_service.update_contact_status(
        contact_id=contact_id,
        new_status="Contact Attempted",
        officer="Twilio Voice Assistant",
        note=f"Voice Assistant: Delivered 3-day notice for case {clean_case}.",
        comm_type="Automated Twilio Call",
        log_audit=False
    )

    # Log the single, clear history entry containing the actual conversation!
    contacts_service.log_history(
        contact_id=contact_id,
        case_id=case_id,
        comm_type="Automated Twilio Call",
        outcome="Voice Assistant Call Delivered (3-Day Case Notice)",
        notes=conversation_script,
        assigned_officer="Twilio Voice Assistant (Male • Polly.Matthew)"
    )

    return {
        "success": dispatch_res.get("success", True),
        "twilioResult": dispatch_res,
        "contact": contacts_service.get_contact_by_id(contact_id),
        "message": dispatch_res.get("message")
    }

@router.post("/{contact_id}/verify-identity")
def verify_identity(case_id: str, contact_id: str, payload: VerifyIdentityRequest):
    """
    Official identity verification approved by investigator.
    """
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")

    updated = contacts_service.verify_identity(
        contact_id=contact_id,
        officer=payload.officer,
        verification_method=payload.verification_method or "Official Government ID Verification"
    )
    return {
        "success": True,
        "contact": updated,
        "message": f"Identity of '{updated['full_name']}' officially verified by {payload.officer}."
    }

@router.post("/{contact_id}/link-statement")
def link_statement(case_id: str, contact_id: str, payload: LinkStatementRequest):
    """
    Links collected witness statement directly to the case's evidence list in Records!
    """
    contact = contacts_service.get_contact_by_id(contact_id)
    if not contact or contact.get("case_id", "").upper() != case_id.upper():
        raise HTTPException(status_code=404, detail="Contact not found for this case")

    res = contacts_service.link_statement_to_records(
        contact_id=contact_id,
        statement_text=payload.statement_text,
        officer=payload.officer or "Investigator"
    )
    return res

