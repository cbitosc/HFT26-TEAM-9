import logging
import re
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger("rekishi.supabase")

class SupabaseService:
    """
    Supabase Cloud Integration Service for Rekishi Forensics:
    - Evidence Object Storage (Videos, Images, Documents, Audio, Sensors)
    - Persistent PostgreSQL Database for Cases, Evidence Records, and Timelines
    - Automatic graceful fallback if credentials are not configured yet
    """

    def __init__(self):
        self.url = settings.SUPABASE_URL
        # Prefer service role key for backend administration/bypass, fallback to anon key
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        self.bucket = settings.SUPABASE_BUCKET or "evidence-media"
        self._client = None
        self._initialized = False

    def is_configured(self) -> bool:
        """
        Returns True if a valid Supabase project URL and key are provided.
        """
        if not self.url or not self.key:
            return False
        if "your_supabase" in self.url.lower() or "your_supabase" in self.key.lower():
            return False
        if not self.url.startswith("http://") and not self.url.startswith("https://"):
            return False
        return True

    def get_client(self):
        """
        Lazily initializes and returns the Supabase client.
        Returns None if credentials are missing or invalid.
        """
        if self._initialized:
            return self._client

        if not self.is_configured():
            return None

        try:
            from supabase import create_client, Client
            self._client: Client = create_client(self.url, self.key)
            self._initialized = True
            logger.info(f"[Supabase] Connected successfully to project {self.url} (Bucket: {self.bucket})")
            return self._client
        except Exception as e:
            logger.warning(f"[Supabase] Client initialization failed: {e}. Operating in local offline mode.")
            self._client = None
            return None

    def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        folder: str = "evidence"
    ) -> Optional[str]:
        """
        Uploads an evidence file (Image, Video, Document, Audio, CSV) to Supabase Storage.
        Returns the public URL of the uploaded asset, or None on failure/unconfigured.
        """
        client = self.get_client()
        if not client:
            logger.info(f"[Supabase] Not configured; file '{filename}' kept in local storage.")
            return None

        try:
            # Clean filename: replace spaces and special characters
            clean_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
            storage_path = f"{folder}/{clean_filename}"

            # Attempt upload with overwrite/upsert enabled
            res = client.storage.from_(self.bucket).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )

            # Retrieve public URL for uploaded object
            public_url_res = client.storage.from_(self.bucket).get_public_url(storage_path)
            public_url = public_url_res if isinstance(public_url_res, str) else getattr(public_url_res, "public_url", str(public_url_res))
            
            logger.info(f"[Supabase] File '{filename}' successfully uploaded to storage: {public_url}")
            return public_url
        except Exception as e:
            logger.error(f"[Supabase] Failed to upload '{filename}' to bucket '{self.bucket}': {e}")
            return None

    def save_case(self, case_data: Dict[str, Any]) -> bool:
        """
        Persists a case dossier to the Supabase 'cases' table.
        Also synchronizes its evidence records and timeline entries.
        """
        client = self.get_client()
        if not client:
            return False

        try:
            case_id = case_data.get("id") or case_data.get("caseNumber")
            if not case_id:
                return False

            summary = case_data.get("summary")
            if isinstance(summary, str):
                summary_json = {"executive": summary}
            elif isinstance(summary, dict):
                summary_json = summary
            else:
                summary_json = {}

            row = {
                "id": str(case_id).strip(),
                "name": case_data.get("name") or case_data.get("title") or "Untitled Incident Dossier",
                "case_number": case_data.get("caseNumber") or case_id,
                "location": case_data.get("location") or case_data.get("address") or "Unspecified Sector",
                "address": case_data.get("address") or case_data.get("location") or "Unspecified Sector",
                "accident_date": case_data.get("accidentDate") or case_data.get("date") or "2026-10-31 14:00 UTC",
                "filed_by": case_data.get("filedBy") or case_data.get("officer") or "Det. Marcus Vance",
                "department": case_data.get("department", "Traffic Accident Investigation Bureau"),
                "witness_statement": case_data.get("witnessStatement") or case_data.get("description") or "",
                "description": case_data.get("description") or "",
                "status": case_data.get("status", "Verified Consistent"),
                "confidence": case_data.get("confidence", 90),
                "summary": summary_json,
                "scenario": case_data.get("scenario", "INTERSECTION_TBONE"),
                "trajectory": case_data.get("trajectory", []),
                "contradictions": case_data.get("contradictions", []),
                "evidence_counts": case_data.get("evidenceCounts", {"video": 0, "audio": 0, "sensor": 0, "text": 0})
            }

            client.table("cases").upsert(row).execute()
            logger.info(f"[Supabase] Case '{case_id}' successfully saved to 'cases' table.")

            # Sync Evidence Records
            records = case_data.get("records") or case_data.get("evidenceList") or []
            for rec in records:
                self.save_evidence_record(case_id, rec)

            # Sync Timeline Events
            timeline = case_data.get("timeline") or case_data.get("timelineEvents") or []
            if timeline:
                self.save_timeline_entries(case_id, timeline)

            return True
        except Exception as e:
            logger.error(f"[Supabase] Error saving case {case_data.get('id')}: {e}")
            return False

    def save_evidence_record(self, case_id: str, record: Dict[str, Any]) -> bool:
        """
        Inserts or updates an evidence record in the 'evidence_records' table.
        """
        client = self.get_client()
        if not client:
            return False

        try:
            rec_id = record.get("id") or f"EV-{case_id}-{hash(record.get('sourceName', '')) % 10000}"
            file_type = (record.get("type") or record.get("dataType") or "DOCUMENT").upper()
            
            row = {
                "id": str(rec_id),
                "case_id": str(case_id),
                "source_name": record.get("sourceName") or record.get("name") or "Unnamed Evidence Source",
                "file_type": file_type,
                "file_size": str(record.get("size") or ""),
                "storage_path": record.get("storagePath"),
                "public_url": record.get("fileUrl") or record.get("publicUrl"),
                "transcript_or_text": record.get("transcriptOrExtractedText") or record.get("content") or "",
                "extracted_observations": record.get("extractedObservations") or [],
                "is_ground_truth": bool(record.get("isGroundTruth", False))
            }

            client.table("evidence_records").upsert(row).execute()
            return True
        except Exception as e:
            logger.error(f"[Supabase] Error saving evidence record {record.get('id')}: {e}")
            return False

    def save_timeline_entries(self, case_id: str, entries: List[Dict[str, Any]]) -> bool:
        """
        Saves a list of timeline events to the 'timeline_entries' table.
        """
        client = self.get_client()
        if not client or not entries:
            return False

        try:
            rows = []
            for idx, entry in enumerate(entries):
                e_id = entry.get("id") or f"TL-{case_id}-{idx + 1}"
                rows.append({
                    "id": str(e_id),
                    "case_id": str(case_id),
                    "time_sec": float(entry.get("timeSec", idx * 1.0)),
                    "iso_time": str(entry.get("isoTime") or entry.get("accidentTime") or ""),
                    "title": entry.get("title") or f"Kinematic Event {idx + 1}",
                    "description": entry.get("description") or "",
                    "category": entry.get("category", "MOVEMENT"),
                    "classification": entry.get("classification", "RAW_OBSERVATION"),
                    "confidence": entry.get("confidence") or entry.get("confidenceScore", 95),
                    "has_contradiction": bool(entry.get("hasContradiction", False)),
                    "evidence_references": entry.get("evidenceReferences") or []
                })

            client.table("timeline_entries").upsert(rows).execute()
            return True
        except Exception as e:
            logger.error(f"[Supabase] Error saving timeline entries for case {case_id}: {e}")
            return False

    def list_cases(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches all cases from the Supabase database.
        """
        client = self.get_client()
        if not client:
            return []

        try:
            query = client.table("cases").select("*").order("created_at", desc=True)
            if status and status != "ALL":
                query = query.eq("status", status)
            res = query.execute()
            return res.data or []
        except Exception as e:
            logger.error(f"[Supabase] Error listing cases: {e}")
            return []

    def get_case(self, case_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a full case dossier including evidence records and timeline entries.
        """
        client = self.get_client()
        if not client:
            return None

        try:
            # Query case
            res = client.table("cases").select("*").or_(f"id.eq.{case_id},case_number.eq.{case_id}").execute()
            if not res.data:
                return None
            case_data = res.data[0]

            # Query evidence records
            ev_res = client.table("evidence_records").select("*").eq("case_id", case_data["id"]).execute()
            case_data["records"] = ev_res.data or []

            # Query timeline entries
            tl_res = client.table("timeline_entries").select("*").eq("case_id", case_data["id"]).order("time_sec").execute()
            case_data["timeline"] = tl_res.data or []

            return case_data
        except Exception as e:
            logger.error(f"[Supabase] Error retrieving case {case_id}: {e}")
            return None

    def delete_case(self, case_id: str) -> bool:
        """
        Permanently deletes a case and all cascaded evidence/timeline rows from Supabase.
        """
        client = self.get_client()
        if not client:
            return False

        try:
            client.table("cases").delete().or_(f"id.eq.{case_id},case_number.eq.{case_id}").execute()
            logger.info(f"[Supabase] Case '{case_id}' deleted from database.")
            return True
        except Exception as e:
            logger.error(f"[Supabase] Error deleting case {case_id}: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """
        Returns the operational status of the Supabase integration.
        """
        configured = self.is_configured()
        masked_url = ""
        if self.url and len(self.url) > 12:
            masked_url = self.url[:12] + "..." + self.url[-8:]

        client = self.get_client() if configured else None
        connected = bool(client is not None)

        return {
            "configured": configured,
            "connected": connected,
            "supabaseUrl": masked_url if configured else None,
            "bucket": self.bucket,
            "status": "CONNECTED" if connected else ("AWAITING_CREDENTIALS" if not configured else "ERROR"),
            "schemaAvailable": True,
            "schemaPath": "supabase_schema.sql"
        }

supabase_service = SupabaseService()

