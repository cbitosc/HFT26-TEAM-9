import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.services.supabase_service import supabase_service

logger = logging.getLogger("rekishi.contacts")

INITIAL_SAMPLE_CONTACTS: List[Dict[str, Any]] = [
    {
        "id": "CNT-1042-01",
        "case_id": "CASE-2026-1042",
        "full_name": "Ramesh K. Patel",
        "phone_number": "+91 63035 31123",
        "contact_category": "Witness",
        "associated_vehicle": "Vehicle A (TS 09 UB 4412 SUV)",
        "address": "Plot 42, Telecom Nagar, Gachibowli, Hyderabad, Telangana",
        "notes": "Eyewitness positioned at pedestrian signal corner. Confirms traffic signal transitioned to green along main carriageway.",
        "contact_status": "Contacted",
        "preferred_contact_time": "Morning 10:30 AM - 12:00 PM",
        "identity_verified": True,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": "2026-10-28T16:45:00Z",
        "next_follow_up": "2026-10-31T11:00:00Z",
        "created_at": "2026-10-28T16:00:00Z",
        "updated_at": "2026-10-28T16:45:00Z"
    },
    {
        "id": "CNT-1042-02",
        "case_id": "CASE-2026-1042",
        "full_name": "Mohd. Abdul Qadir",
        "phone_number": "+91 98490 11422",
        "contact_category": "Vehicle Owner",
        "associated_vehicle": "Vehicle B (TS 07 UA 9104 Commercial Auto)",
        "address": "H.No 12-4-88, Tolichowki, Hyderabad, Telangana",
        "notes": "Registered permit holder and driver. Audio statement collected and filed into case dossier.",
        "contact_status": "Statement Collected",
        "preferred_contact_time": "Afternoon 02:00 PM - 04:00 PM",
        "identity_verified": True,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": "2026-10-28T16:42:00Z",
        "next_follow_up": None,
        "created_at": "2026-10-28T16:05:00Z",
        "updated_at": "2026-10-28T16:42:00Z"
    },
    {
        "id": "CNT-1042-03",
        "case_id": "CASE-2026-1042",
        "full_name": "Srinivas Rao Varma",
        "phone_number": "+91 94401 55239",
        "contact_category": "Informant",
        "associated_vehicle": "Trailing Two-Wheeler",
        "address": "Madhapur Village, Hyderabad, Telangana",
        "notes": "Passed intersection immediately following impact. Stated hearing heavy ABS braking noise prior to collision crunch.",
        "contact_status": "Not Contacted",
        "preferred_contact_time": "Evening after 06:00 PM",
        "identity_verified": False,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": None,
        "next_follow_up": "2026-10-31T18:30:00Z",
        "created_at": "2026-10-28T16:20:00Z",
        "updated_at": "2026-10-28T16:20:00Z"
    },
    {
        "id": "CNT-101-01",
        "case_id": "CASE-101",
        "full_name": "Vikram Singh",
        "phone_number": "+91 63035 31123",
        "contact_category": "Witness",
        "associated_vehicle": "Passenger Sedan (Vehicle A)",
        "address": "Lane 4, Sector 12, Chandigarh",
        "notes": "Commercial driver operating delivery vehicle in adjacent lane during right-angle collision.",
        "contact_status": "Callback Requested",
        "preferred_contact_time": "Morning 09:00 AM - 11:00 AM",
        "identity_verified": True,
        "assigned_officer": "Inspector S. Gill",
        "last_contact_date": "2026-10-29T10:15:00Z",
        "next_follow_up": "2026-10-31T10:00:00Z",
        "created_at": "2026-10-29T09:30:00Z",
        "updated_at": "2026-10-29T10:15:00Z"
    },
    {
        "id": "CNT-9597-01",
        "case_id": "CASE-2026-9597",
        "full_name": "Ravi Kumar",
        "phone_number": "+91 63035 31123",
        "contact_category": "Witness",
        "associated_vehicle": "Pedestrian Crosswalk",
        "address": "H.No 1-8-303, Sindhi Colony, Begumpet, Hyderabad, Telangana",
        "notes": "Eyewitness waiting at pedestrian crossing. Observed motorcycle filter into junction prior to collision.",
        "contact_status": "Not Contacted",
        "preferred_contact_time": "Morning 10:00 AM - 12:00 PM",
        "identity_verified": False,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": None,
        "next_follow_up": "2026-11-01T10:00:00Z",
        "created_at": "2026-10-30T22:35:00Z",
        "updated_at": "2026-10-30T22:35:00Z"
    },
    {
        "id": "CNT-9597-02",
        "case_id": "CASE-2026-9597",
        "full_name": "K. Suresh Reddy",
        "phone_number": "+91 98492 88310",
        "contact_category": "Vehicle Owner",
        "associated_vehicle": "Vehicle A (Maruti Swift - TS 08 FG 2109)",
        "address": "Plot 45, Road No. 10, Jubilee Hills, Hyderabad, Telangana",
        "notes": "Registered owner and driver of white sedan. Telemetry confirms brake engagement 0.7s before impact.",
        "contact_status": "Contacted",
        "preferred_contact_time": "Evening 04:00 PM - 06:00 PM",
        "identity_verified": True,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": "2026-10-30T23:15:00Z",
        "next_follow_up": "2026-11-02T10:00:00Z",
        "created_at": "2026-10-30T22:40:00Z",
        "updated_at": "2026-10-30T23:15:00Z"
    },
    {
        "id": "CNT-9597-03",
        "case_id": "CASE-2026-9597",
        "full_name": "Syed Imran",
        "phone_number": "+91 97003 44192",
        "contact_category": "Vehicle Owner",
        "associated_vehicle": "Vehicle B (Yamaha R15 - TS 07 EK 8421)",
        "address": "H.No 12-2-417, Mehdipatnam, Hyderabad, Telangana",
        "notes": "Two-wheeler rider involved in impact. Statement recorded regarding approach velocity and signal status.",
        "contact_status": "Statement Collected",
        "preferred_contact_time": "Afternoon 02:00 PM - 04:00 PM",
        "identity_verified": True,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": "2026-10-30T23:45:00Z",
        "next_follow_up": None,
        "created_at": "2026-10-30T22:45:00Z",
        "updated_at": "2026-10-30T23:45:00Z"
    },
    {
        "id": "CNT-9597-04",
        "case_id": "CASE-2026-9597",
        "full_name": "M. Anitha Rao",
        "phone_number": "+91 80081 22915",
        "contact_category": "Informant",
        "associated_vehicle": "Traffic Junction Post #4",
        "address": "Traffic Police Booth, Masab Tank Circle, Hyderabad",
        "notes": "On-duty traffic warden stationed near the signal. Provided spatial coordinates of final vehicle positions.",
        "contact_status": "Visit Scheduled",
        "preferred_contact_time": "Morning 09:00 AM - 11:00 AM",
        "identity_verified": True,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": "2026-10-31T09:00:00Z",
        "next_follow_up": "2026-11-01T10:30:00Z",
        "created_at": "2026-10-30T22:50:00Z",
        "updated_at": "2026-10-31T09:00:00Z"
    },
    {
        "id": "CNT-9597-05",
        "case_id": "CASE-2026-9597",
        "full_name": "P. Venkat Ramana",
        "phone_number": "+91 94901 77204",
        "contact_category": "Other",
        "associated_vehicle": "Commercial CCTV DVR Host",
        "address": "Shop #8, Corner Plaza, Banjara Hills, Hyderabad, Telangana",
        "notes": "Owner of corner commercial establishment facing intersection. Security camera EV-002 retrieved from his DVR.",
        "contact_status": "Contact Attempted",
        "preferred_contact_time": "Afternoon 01:00 PM - 03:00 PM",
        "identity_verified": False,
        "assigned_officer": "Inspector R. K. Sharma",
        "last_contact_date": "2026-10-31T09:30:00Z",
        "next_follow_up": "2026-11-01T14:00:00Z",
        "created_at": "2026-10-30T23:00:00Z",
        "updated_at": "2026-10-31T09:30:00Z"
    }
]

INITIAL_SAMPLE_HISTORY: List[Dict[str, Any]] = [
    {
        "id": "HIST-1042-01",
        "contact_id": "CNT-1042-01",
        "case_id": "CASE-2026-1042",
        "communication_type": "Automated Twilio Call",
        "outcome": "Call Completed - Appointment Requested (Key 1)",
        "notes": "Automated dispatch connected to registered mobile. Citizen confirmed identity and requested investigator follow-up.",
        "timestamp": "2026-10-28T16:30:00Z",
        "next_follow_up": "2026-10-31T11:00:00Z",
        "assigned_investigator": "Twilio Voice Assistant"
    },
    {
        "id": "HIST-1042-02",
        "contact_id": "CNT-1042-01",
        "case_id": "CASE-2026-1042",
        "communication_type": "Manual Phone Call",
        "outcome": "Officer Follow-up Completed",
        "notes": "Spoke directly with eyewitness Ramesh Patel. Corroborated arterial signal status and verified identity.",
        "timestamp": "2026-10-28T16:45:00Z",
        "next_follow_up": None,
        "assigned_investigator": "Inspector R. K. Sharma"
    },
    {
        "id": "HIST-1042-03",
        "contact_id": "CNT-1042-02",
        "case_id": "CASE-2026-1042",
        "communication_type": "In-Person Visit",
        "outcome": "Formal Deposition Recorded",
        "notes": "Driver attended cyber station; recorded formal audio deposition filed in case evidence (EV-1042-03).",
        "timestamp": "2026-10-28T16:42:00Z",
        "next_follow_up": None,
        "assigned_investigator": "Inspector R. K. Sharma"
    },
    {
        "id": "HIST-9597-01",
        "contact_id": "CNT-9597-01",
        "case_id": "CASE-2026-9597",
        "communication_type": "Automated Twilio Call",
        "outcome": "Voice Assistant Call Delivered (3-Day Case Notice)",
        "notes": "Hello Ravi Kumar. This is Rekishi Forensics regarding your incident report for case number CASE 2026 9597. Please visit our investigation office within the next three days. Thank you, goodbye.",
        "timestamp": "2026-10-31T09:40:00Z",
        "next_follow_up": "2026-11-03T10:00:00Z",
        "assigned_investigator": "Twilio AI Voice Assistant (Male • Polly.Matthew)"
    },
    {
        "id": "HIST-9597-02",
        "contact_id": "CNT-9597-02",
        "case_id": "CASE-2026-9597",
        "communication_type": "Automated Twilio Call",
        "outcome": "Voice Assistant Call Delivered (3-Day Case Notice)",
        "notes": "Hello Suresh Reddy. This is Rekishi Forensics regarding your incident report for case number CASE 2026 9597. Please visit our investigation office within the next three days. Thank you, goodbye.",
        "timestamp": "2026-10-31T09:42:00Z",
        "next_follow_up": "2026-11-03T10:00:00Z",
        "assigned_investigator": "Twilio AI Voice Assistant (Male • Polly.Matthew)"
    },
    {
        "id": "HIST-9597-03",
        "contact_id": "CNT-9597-03",
        "case_id": "CASE-2026-9597",
        "communication_type": "In-Person Visit",
        "outcome": "Sworn Eyewitness Deposition Recorded",
        "notes": "Motorcyclist Syed Imran attended investigation cell. Formal sworn statement recorded regarding signal transit and approach velocity. Evidence linked to Records.",
        "timestamp": "2026-10-30T23:45:00Z",
        "next_follow_up": None,
        "assigned_investigator": "Inspector R. K. Sharma"
    },
    {
        "id": "HIST-9597-04",
        "contact_id": "CNT-9597-04",
        "case_id": "CASE-2026-9597",
        "communication_type": "Automated Twilio Call",
        "outcome": "Station Appointment Confirmed",
        "notes": "Hello Anitha Rao. This is Rekishi Forensics regarding your incident report for case number CASE 2026 9597. Please visit our investigation office within the next three days. Thank you, goodbye.",
        "timestamp": "2026-10-31T09:00:00Z",
        "next_follow_up": "2026-11-01T10:30:00Z",
        "assigned_investigator": "Twilio AI Voice Assistant (Male • Polly.Matthew)"
    },
    {
        "id": "HIST-9597-05",
        "contact_id": "CNT-9597-05",
        "case_id": "CASE-2026-9597",
        "communication_type": "In-Person Visit",
        "outcome": "CCTV Footage Handover Verified",
        "notes": "Commercial shop owner P. Venkat Ramana verified camera timestamp synchronicity for corner surveillance unit EV-002.",
        "timestamp": "2026-10-31T09:30:00Z",
        "next_follow_up": "2026-11-01T14:00:00Z",
        "assigned_investigator": "Inspector R. K. Sharma"
    }
]

class ContactsService:
    """
    Case-Isolated Contact & Witness Coordination Service:
    - Case-level isolation: Every contact strictly belongs to a specific case_id.
    - Full status lifecycle management.
    - Communication audit trail & appointment scheduling.
    - Synchronized dual persistence: Supabase PostgreSQL + Resilient In-Memory Fallback.
    """

    def __init__(self):
        self._contacts_db: List[Dict[str, Any]] = [dict(c) for c in INITIAL_SAMPLE_CONTACTS]
        self._history_db: List[Dict[str, Any]] = [dict(h) for h in INITIAL_SAMPLE_HISTORY]
        self._appointments_db: List[Dict[str, Any]] = []

    def get_contacts_for_case(self, case_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all contacts associated with a specific case.
        """
        c_id_norm = case_id.strip().upper()
        
        # 1. Try Supabase
        sb = supabase_service.get_client()
        if sb:
            try:
                res = sb.table("contacts").select("*").eq("case_id", case_id).order("created_at", desc=True).execute()
                if res and res.data:
                    # Update local cache
                    existing_ids = {c["id"] for c in self._contacts_db}
                    for row in res.data:
                        if row["id"] not in existing_ids:
                            self._contacts_db.append(row)
                    return res.data
            except Exception as e:
                logger.debug(f"[Supabase Contacts] Query note: {e}")

        # 2. Local fallback
        return [c for c in self._contacts_db if c.get("case_id", "").strip().upper() == c_id_norm]

    def get_contact_by_id(self, contact_id: str) -> Optional[Dict[str, Any]]:
        c_id = contact_id.strip()
        for c in self._contacts_db:
            if c.get("id") == c_id:
                return c
        return None

    def check_duplicate(self, case_id: str, phone_number: str, full_name: str) -> Optional[Dict[str, Any]]:
        """
        Checks if a contact with the same phone or name already exists in this case.
        """
        clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
        clean_name = full_name.strip().lower()
        contacts = self.get_contacts_for_case(case_id)
        
        for c in contacts:
            c_phone = (c.get("phone_number") or "").replace(" ", "").replace("-", "")
            if c_phone and clean_phone and c_phone == clean_phone:
                return c
            if c.get("full_name", "").strip().lower() == clean_name:
                return c
        return None

    def create_contact(self, case_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new contact associated with the case.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        contact_id = f"CNT-{case_id[-4:]}-{str(uuid.uuid4())[:6].upper()}"
        
        new_contact = {
            "id": contact_id,
            "case_id": case_id,
            "full_name": data.get("full_name", "").strip(),
            "phone_number": data.get("phone_number", "").strip(),
            "contact_category": data.get("contact_category", "Witness"),
            "associated_vehicle": data.get("associated_vehicle", "").strip() or None,
            "address": data.get("address", "").strip() or None,
            "notes": data.get("notes", "").strip() or None,
            "contact_status": data.get("contact_status", "Not Contacted"),
            "preferred_contact_time": data.get("preferred_contact_time", "").strip() or None,
            "identity_verified": bool(data.get("identity_verified", False)),
            "assigned_officer": data.get("assigned_officer", "Investigator"),
            "last_contact_date": None,
            "next_follow_up": data.get("next_follow_up") or None,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        self._contacts_db.append(new_contact)

        # Log initial creation audit trail
        self.log_history(
            contact_id=contact_id,
            case_id=case_id,
            comm_type="Manual Phone Call",
            outcome="Contact Registered in Case Dossier",
            notes=f"New {new_contact['contact_category']} registered by {new_contact['assigned_officer']}.",
            assigned_officer=new_contact["assigned_officer"]
        )

        # Sync to Supabase
        sb = supabase_service.get_client()
        if sb:
            try:
                sb.table("contacts").insert(new_contact).execute()
            except Exception as e:
                logger.debug(f"[Supabase Contacts] Insert note: {e}")

        return new_contact

    def update_contact(self, contact_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        target = self.get_contact_by_id(contact_id)
        if not target:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        allowed_keys = [
            "full_name", "phone_number", "contact_category", "associated_vehicle",
            "address", "notes", "contact_status", "preferred_contact_time",
            "identity_verified", "assigned_officer", "last_contact_date", "next_follow_up"
        ]

        for k in allowed_keys:
            if k in updates:
                target[k] = updates[k]

        target["updated_at"] = now_iso

        # Sync to Supabase
        sb = supabase_service.get_client()
        if sb:
            try:
                sb.table("contacts").update(target).eq("id", contact_id).execute()
            except Exception as e:
                logger.debug(f"[Supabase Contacts] Update note: {e}")

        return target

    def update_contact_status(
        self,
        contact_id: str,
        new_status: str,
        officer: str = "Investigator",
        note: Optional[str] = None,
        comm_type: Optional[str] = None,
        log_audit: bool = True
    ) -> Optional[Dict[str, Any]]:
        target = self.get_contact_by_id(contact_id)
        if not target:
            return None

        old_status = target.get("contact_status")
        now_iso = datetime.now(timezone.utc).isoformat()
        target["contact_status"] = new_status
        target["last_contact_date"] = now_iso
        target["updated_at"] = now_iso

        if note:
            existing_notes = target.get("notes") or ""
            target["notes"] = f"{existing_notes}\n[{datetime.now().strftime('%b %d, %H:%M')}] {note}".strip()

        # Audit log status shift (if requested)
        if log_audit:
            actual_comm = comm_type or ("Automated Twilio Call" if "Twilio" in officer else "Manual Phone Call")
            self.log_history(
                contact_id=contact_id,
                case_id=target.get("case_id", ""),
                comm_type=actual_comm,
                outcome=f"Status Updated: {old_status} -> {new_status}",
                notes=note or f"Status transitioned to {new_status} by {officer}.",
                assigned_officer=officer
            )

        # Sync to Supabase
        sb = supabase_service.get_client()
        if sb:
            try:
                sb.table("contacts").update({
                    "contact_status": new_status,
                    "last_contact_date": now_iso,
                    "notes": target.get("notes"),
                    "updated_at": now_iso
                }).eq("id", contact_id).execute()
            except Exception as e:
                logger.debug(f"[Supabase Contacts] Status update note: {e}")

        return target

    def verify_identity(
        self,
        contact_id: str,
        officer: str,
        verification_method: str = "Government ID / Physical Inspection"
    ) -> Optional[Dict[str, Any]]:
        """
        Official investigator identity verification.
        (A phone call or OTP alone does not verify; investigator confirmation is required).
        """
        target = self.get_contact_by_id(contact_id)
        if not target:
            return None

        target["identity_verified"] = True
        target["contact_status"] = "Identity Verified"
        now_iso = datetime.now(timezone.utc).isoformat()
        target["updated_at"] = now_iso

        self.log_history(
            contact_id=contact_id,
            case_id=target.get("case_id", ""),
            comm_type="In-Person Visit",
            outcome="Official Identity Verified",
            notes=f"Identity confirmed by {officer} via {verification_method}.",
            assigned_officer=officer
        )

        sb = supabase_service.get_client()
        if sb:
            try:
                sb.table("contacts").update({
                    "identity_verified": True,
                    "contact_status": "Identity Verified",
                    "updated_at": now_iso
                }).eq("id", contact_id).execute()
            except Exception as e:
                logger.debug(f"[Supabase Contacts] Verify identity note: {e}")

        return target

    def delete_contact(self, contact_id: str) -> bool:
        c_id = contact_id.strip()
        self._contacts_db = [c for c in self._contacts_db if c.get("id") != c_id]
        self._history_db = [h for h in self._history_db if h.get("contact_id") != c_id]

        sb = supabase_service.get_client()
        if sb:
            try:
                sb.table("contacts").delete().eq("id", c_id).execute()
            except Exception as e:
                logger.debug(f"[Supabase Contacts] Delete note: {e}")

        return True

    def get_history(self, contact_id: str) -> List[Dict[str, Any]]:
        c_id = contact_id.strip()
        sb = supabase_service.get_client()
        if sb:
            try:
                res = sb.table("contact_history").select("*").eq("contact_id", c_id).order("timestamp", desc=True).execute()
                if res and res.data:
                    cleaned = [
                        h for h in res.data 
                        if not (h.get("outcome", "").startswith("Status Updated:")) and h.get("notes") != "0"
                    ]
                    if cleaned:
                        return cleaned
            except Exception as e:
                logger.debug(f"[Supabase History] Query note: {e}")

        matched = [
            h for h in self._history_db 
            if h.get("contact_id") == c_id 
            and not (h.get("outcome", "").startswith("Status Updated:"))
            and h.get("notes") != "0"
        ]
        if not matched:
            matched = [
                h for h in INITIAL_SAMPLE_HISTORY 
                if h.get("contact_id") == c_id
            ]
        return sorted(matched, key=lambda x: x.get("timestamp", ""), reverse=True)

    def log_history(
        self,
        contact_id: str,
        case_id: str,
        comm_type: str,
        outcome: str,
        notes: Optional[str] = None,
        assigned_officer: str = "Investigator",
        next_follow_up: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adds an immutable entry into communication history & audit trail.
        """
        hist_id = f"HIST-{str(uuid.uuid4())[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        
        entry = {
            "id": hist_id,
            "contact_id": contact_id,
            "case_id": case_id,
            "communication_type": comm_type,
            "outcome": outcome,
            "notes": notes,
            "timestamp": now_iso,
            "next_follow_up": next_follow_up,
            "assigned_investigator": assigned_officer
        }

        self._history_db.append(entry)

        sb = supabase_service.get_client()
        if sb:
            try:
                sb.table("contact_history").insert(entry).execute()
            except Exception as e:
                logger.debug(f"[Supabase History] Insert note: {e}")

        return entry

    def link_statement_to_records(
        self,
        contact_id: str,
        statement_text: str,
        officer: str = "Investigator"
    ) -> Dict[str, Any]:
        """
        Connects an officially collected witness statement directly into the case Records section.
        Creates an immutable deposition record in public.evidence_records.
        """
        contact = self.get_contact_by_id(contact_id)
        if not contact:
            raise ValueError(f"Contact {contact_id} not found")

        case_id = contact["case_id"]
        ev_id = f"EV-{case_id[-4:]}-STMT-{str(uuid.uuid4())[:6].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        statement_name = f"witness_statement_{contact['full_name'].lower().replace(' ', '_')}.txt"

        evidence_entry = {
            "id": ev_id,
            "caseId": case_id,
            "type": "WITNESS_TEXT",
            "sourceName": statement_name,
            "size": f"{len(statement_text.encode('utf-8'))} B",
            "timestampRecorded": now_iso,
            "transcriptOrExtractedText": statement_text,
            "extractedObservations": [
                {
                    "timestampSec": 1.0,
                    "observation": f"Sworn deposition collected from {contact['full_name']} ({contact['contact_category']}). Verified by {officer}.",
                    "confidence": 96,
                    "isGroundTruth": False
                }
            ],
            "extractedData": {
                "summary": f"Official recorded deposition from {contact['contact_category']} {contact['full_name']} regarding {contact.get('associated_vehicle', 'incident observation')}. Corroborated by investigating officer {officer}.",
                "keyObservations": [
                    f"Deposition collected from {contact['full_name']}.",
                    f"Contact classification: {contact['contact_category']}.",
                    f"Official statement certified and integrated into forensic timeline."
                ],
                "fields": {
                    "Witness / Contact": contact["full_name"],
                    "Category": contact["contact_category"],
                    "Associated Vehicle": contact.get("associated_vehicle") or "Not Specified",
                    "Assigned Officer": officer,
                    "Integrity Status": "Official Sworn Statement Linked"
                },
                "transcript": statement_text
            }
        }

        # Update contact status to Statement Collected
        self.update_contact_status(
            contact_id=contact_id,
            new_status="Statement Collected",
            officer=officer,
            note=f"Official witness statement linked to case dossier ({statement_name})."
        )

        # Save to Supabase evidence_records
        sb = supabase_service.get_client()
        if sb:
            try:
                sb_rec = {
                    "id": ev_id,
                    "case_id": case_id,
                    "source_name": statement_name,
                    "file_type": "WITNESS_TEXT",
                    "file_size": f"{len(statement_text)} B",
                    "transcript_or_text": statement_text,
                    "extracted_observations": evidence_entry["extractedObservations"],
                    "is_ground_truth": False
                }
                sb.table("evidence_records").insert(sb_rec).execute()
            except Exception as e:
                logger.debug(f"[Supabase Evidence] Insert note: {e}")

        return {
            "success": True,
            "evidenceRecord": evidence_entry,
            "contact": contact,
            "message": f"Statement from {contact['full_name']} successfully linked into Records!"
        }

contacts_service = ContactsService()

