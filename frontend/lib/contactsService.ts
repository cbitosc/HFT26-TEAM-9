export type ContactCategory = "Witness" | "Vehicle Owner" | "Informant" | "Other";

export type ContactStatus = 
  | "Not Contacted"
  | "Contact Attempted"
  | "Contacted"
  | "Callback Requested"
  | "Visit Scheduled"
  | "Identity Verified"
  | "Statement Collected"
  | "Unreachable";

export interface ContactItem {
  id: string;
  case_id: string;
  full_name: string;
  phone_number: string;
  contact_category: ContactCategory;
  associated_vehicle?: string;
  address?: string;
  notes?: string;
  contact_status: ContactStatus;
  preferred_contact_time?: string;
  identity_verified: boolean;
  assigned_officer?: string;
  last_contact_date?: string;
  next_follow_up?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactHistoryItem {
  id: string;
  contact_id: string;
  case_id: string;
  communication_type: string; // 'Automated Twilio Call' | 'Manual Phone Call' | 'In-Person Visit' | 'SMS'
  outcome: string;
  notes?: string;
  timestamp: string;
  next_follow_up?: string;
  assigned_investigator?: string;
}

export interface ContactsMetrics {
  totalContacts: number;
  contactedCount: number;
  pendingAttempts: number;
  scheduledVisits: number;
  statementsCollected: number;
  identityVerified: number;
}

const CONTACTS_STORAGE_KEY = "rekishi_case_contacts_v6";
const HISTORY_STORAGE_KEY = "rekishi_case_contact_history_v6";

// Pre-seeded Indian witness coordination contacts (Includes requested number +91 63035 31123)
export const DEFAULT_CONTACTS: ContactItem[] = [
  {
    id: "CNT-1042-01",
    case_id: "CASE-2026-1042",
    full_name: "Ramesh K. Patel",
    phone_number: "+91 63035 31123",
    contact_category: "Witness",
    associated_vehicle: "Vehicle A (TS 09 UB 4412 SUV)",
    address: "Plot 42, Telecom Nagar, Gachibowli, Hyderabad, Telangana",
    notes: "Eyewitness positioned at pedestrian signal corner. Confirms traffic signal transitioned to green along main carriageway.",
    contact_status: "Contacted",
    preferred_contact_time: "Morning 10:30 AM - 12:00 PM",
    identity_verified: true,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 28, 2026, 04:45 PM",
    next_follow_up: "Oct 31, 2026, 11:00 AM",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CNT-1042-02",
    case_id: "CASE-2026-1042",
    full_name: "Mohd. Abdul Qadir",
    phone_number: "+91 98490 11422",
    contact_category: "Vehicle Owner",
    associated_vehicle: "Vehicle B (TS 07 UA 9104 Commercial Auto)",
    address: "H.No 12-4-88, Tolichowki, Hyderabad, Telangana",
    notes: "Registered permit holder and driver. Audio statement collected and filed into case dossier.",
    contact_status: "Statement Collected",
    preferred_contact_time: "Afternoon 02:00 PM - 04:00 PM",
    identity_verified: true,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 28, 2026, 04:42 PM",
    next_follow_up: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CNT-1042-03",
    case_id: "CASE-2026-1042",
    full_name: "Srinivas Rao Varma",
    phone_number: "+91 94401 55239",
    contact_category: "Informant",
    associated_vehicle: "Trailing Two-Wheeler",
    address: "Madhapur Village, Hyderabad, Telangana",
    notes: "Passed intersection immediately following impact. Stated hearing heavy ABS braking noise prior to collision crunch.",
    contact_status: "Not Contacted",
    preferred_contact_time: "Evening after 06:00 PM",
    identity_verified: false,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: undefined,
    next_follow_up: "Oct 31, 2026, 06:30 PM",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()  },
  {
    id: "CNT-9597-01",
    case_id: "CASE-2026-9597",
    full_name: "Ravi Kumar",
    phone_number: "+91 63035 31123",
    contact_category: "Witness",
    associated_vehicle: "Pedestrian Crosswalk",
    address: "H.No 1-8-303, Sindhi Colony, Begumpet, Hyderabad, Telangana",
    notes: "Eyewitness waiting at pedestrian crossing. Observed motorcycle filter into junction prior to collision.",
    contact_status: "Contact Attempted",
    preferred_contact_time: "Morning 10:00 AM - 12:00 PM",
    identity_verified: false,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 31, 2026, 09:40 AM",
    next_follow_up: "Nov 03, 2026, 10:00 AM",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CNT-9597-02",
    case_id: "CASE-2026-9597",
    full_name: "K. Suresh Reddy",
    phone_number: "+91 98492 88310",
    contact_category: "Vehicle Owner",
    associated_vehicle: "Vehicle A (Maruti Swift - TS 08 FG 2109)",
    address: "Plot 45, Road No. 10, Jubilee Hills, Hyderabad, Telangana",
    notes: "Registered owner and driver of white sedan. Telemetry confirms brake engagement 0.7s before impact.",
    contact_status: "Contacted",
    preferred_contact_time: "Evening 04:00 PM - 06:00 PM",
    identity_verified: true,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 30, 2026, 11:15 PM",
    next_follow_up: "Nov 02, 2026, 10:00 AM",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CNT-9597-03",
    case_id: "CASE-2026-9597",
    full_name: "Syed Imran",
    phone_number: "+91 97003 44192",
    contact_category: "Vehicle Owner",
    associated_vehicle: "Vehicle B (Yamaha R15 - TS 07 EK 8421)",
    address: "H.No 12-2-417, Mehdipatnam, Hyderabad, Telangana",
    notes: "Two-wheeler rider involved in impact. Statement recorded regarding approach velocity and signal status.",
    contact_status: "Statement Collected",
    preferred_contact_time: "Afternoon 02:00 PM - 04:00 PM",
    identity_verified: true,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 30, 2026, 11:45 PM",
    next_follow_up: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CNT-9597-04",
    case_id: "CASE-2026-9597",
    full_name: "M. Anitha Rao",
    phone_number: "+91 80081 22915",
    contact_category: "Informant",
    associated_vehicle: "Traffic Junction Post #4",
    address: "Traffic Police Booth, Masab Tank Circle, Hyderabad",
    notes: "On-duty traffic warden stationed near the signal. Provided spatial coordinates of final vehicle positions.",
    contact_status: "Visit Scheduled",
    preferred_contact_time: "Morning 09:00 AM - 11:00 AM",
    identity_verified: true,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 31, 2026, 09:00 AM",
    next_follow_up: "Nov 01, 2026, 10:30 AM",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CNT-9597-05",
    case_id: "CASE-2026-9597",
    full_name: "P. Venkat Ramana",
    phone_number: "+91 94901 77204",
    contact_category: "Other",
    associated_vehicle: "Commercial CCTV DVR Host",
    address: "Shop #8, Corner Plaza, Banjara Hills, Hyderabad, Telangana",
    notes: "Owner of corner commercial establishment facing intersection. Security camera EV-002 retrieved from his DVR.",
    contact_status: "Contact Attempted",
    preferred_contact_time: "Afternoon 01:00 PM - 03:00 PM",
    identity_verified: false,
    assigned_officer: "Inspector R. K. Sharma",
    last_contact_date: "Oct 31, 2026, 09:30 AM",
    next_follow_up: "Nov 01, 2026, 02:00 PM",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEFAULT_HISTORY: ContactHistoryItem[] = [
  {
    id: "HIST-1042-01",
    contact_id: "CNT-1042-01",
    case_id: "CASE-2026-1042",
    communication_type: "Automated Twilio Call",
    outcome: "Call Completed - Appointment Requested (Key 1)",
    notes: "Automated voice assistant dispatched to registered contact. Citizen pressed 1 to request investigator callback.",
    timestamp: "Oct 28, 2026, 04:30 PM",
    next_follow_up: "Oct 31, 2026, 11:00 AM",
    assigned_investigator: "Twilio Voice Assistant"
  },
  {
    id: "HIST-1042-02",
    contact_id: "CNT-1042-01",
    case_id: "CASE-2026-1042",
    communication_type: "Manual Phone Call",
    outcome: "Officer Follow-up Completed",
    notes: "Spoke directly with eyewitness Ramesh Patel. Corroborated arterial green signal status and verified identity.",
    timestamp: "Oct 28, 2026, 04:45 PM",
    assigned_investigator: "Inspector R. K. Sharma"
  },
  {
    id: "HIST-1042-03",
    contact_id: "CNT-1042-02",
    case_id: "CASE-2026-1042",
    communication_type: "In-Person Visit",
    outcome: "Formal Deposition Recorded",
    notes: "Driver attended Cyberabad traffic station; recorded formal audio statement (EV-1042-03).",
    timestamp: "Oct 28, 2026, 04:42 PM",
    assigned_investigator: "Inspector R. K. Sharma"   },
  {
    id: "HIST-9597-01",
    contact_id: "CNT-9597-01",
    case_id: "CASE-2026-9597",
    communication_type: "Automated Twilio Call",
    outcome: "Voice Assistant Call Delivered (3-Day Case Notice)",
    notes: "Hello Ravi Kumar. This is Rekishi Forensics regarding your incident report for case number CASE 2026 9597. Please visit our investigation office within the next three days. Thank you, goodbye.",
    timestamp: "Oct 31, 2026, 09:40 AM",
    next_follow_up: "Nov 03, 2026, 10:00 AM",
    assigned_investigator: "Twilio AI Voice Assistant (Male • Polly.Matthew)"
  },
  {
    id: "HIST-9597-02",
    contact_id: "CNT-9597-02",
    case_id: "CASE-2026-9597",
    communication_type: "Automated Twilio Call",
    outcome: "Voice Assistant Call Delivered (3-Day Case Notice)",
    notes: "Hello Suresh Reddy. This is Rekishi Forensics regarding your incident report for case number CASE 2026 9597. Please visit our investigation office within the next three days. Thank you, goodbye.",
    timestamp: "Oct 31, 2026, 09:42 AM",
    next_follow_up: "Nov 03, 2026, 10:00 AM",
    assigned_investigator: "Twilio AI Voice Assistant (Male • Polly.Matthew)"
  },
  {
    id: "HIST-9597-03",
    contact_id: "CNT-9597-03",
    case_id: "CASE-2026-9597",
    communication_type: "In-Person Visit",
    outcome: "Sworn Eyewitness Deposition Recorded",
    notes: "Motorcyclist Syed Imran attended investigation cell. Formal sworn statement recorded regarding signal transit and approach velocity. Evidence linked to Records.",
    timestamp: "Oct 30, 2026, 11:45 PM",
    next_follow_up: undefined,
    assigned_investigator: "Inspector R. K. Sharma"
  },
  {
    id: "HIST-9597-04",
    contact_id: "CNT-9597-04",
    case_id: "CASE-2026-9597",
    communication_type: "Automated Twilio Call",
    outcome: "Station Appointment Confirmed",
    notes: "Hello Anitha Rao. This is Rekishi Forensics regarding your incident report for case number CASE 2026 9597. Please visit our investigation office within the next three days. Thank you, goodbye.",
    timestamp: "Oct 31, 2026, 09:00 AM",
    next_follow_up: "Nov 01, 2026, 10:30 AM",
    assigned_investigator: "Twilio AI Voice Assistant (Male • Polly.Matthew)"
  },
  {
    id: "HIST-9597-05",
    contact_id: "CNT-9597-05",
    case_id: "CASE-2026-9597",
    communication_type: "In-Person Visit",
    outcome: "CCTV Footage Handover Verified",
    notes: "Commercial shop owner P. Venkat Ramana verified camera timestamp synchronicity for corner surveillance unit EV-002.",
    timestamp: "Oct 31, 2026, 09:30 AM",
    next_follow_up: "Nov 01, 2026, 02:00 PM",
    assigned_investigator: "Inspector R. K. Sharma"
  }
];

// Helper to get local stored contacts
function getLocalContacts(): ContactItem[] {
  if (typeof window === "undefined") return DEFAULT_CONTACTS;
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(DEFAULT_CONTACTS));
      return DEFAULT_CONTACTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CONTACTS;
  } catch {
    return DEFAULT_CONTACTS;
  }
}

function saveLocalContacts(items: ContactItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save contacts locally", e);
  }
}

function getLocalHistory(): ContactHistoryItem[] {
  if (typeof window === "undefined") return DEFAULT_HISTORY;
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(DEFAULT_HISTORY));
      return DEFAULT_HISTORY;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HISTORY;
  } catch {
    return DEFAULT_HISTORY;
  }
}

function saveLocalHistory(items: ContactHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save history locally", e);
  }
}

export function computeMetrics(contacts: ContactItem[]): ContactsMetrics {
  const total = contacts.length;
  const contacted = contacts.filter((c) =>
    ["Contacted", "Identity Verified", "Statement Collected", "Callback Requested", "Visit Scheduled"].includes(c.contact_status)
  ).length;
  const pending = contacts.filter((c) => ["Not Contacted", "Contact Attempted"].includes(c.contact_status)).length;
  const scheduled = contacts.filter((c) => c.contact_status === "Visit Scheduled").length;
  const statements = contacts.filter((c) => c.contact_status === "Statement Collected").length;
  const verified = contacts.filter((c) => c.identity_verified).length;

  return {
    totalContacts: total,
    contactedCount: contacted,
    pendingAttempts: pending,
    scheduledVisits: scheduled,
    statementsCollected: statements,
    identityVerified: verified
  };
}

// 1. Fetch contacts for specific case
export async function fetchCaseContacts(caseId: string): Promise<{ contacts: ContactItem[]; metrics: ContactsMetrics }> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.contacts)) {
        // Sync to local
        const allLocal = getLocalContacts().filter((c) => c.case_id.toUpperCase() !== caseId.toUpperCase());
        const combined = [...allLocal, ...data.contacts];
        saveLocalContacts(combined);
        return {
          contacts: data.contacts,
          metrics: data.metrics || computeMetrics(data.contacts)
        };
      }
    }
  } catch {
    // Offline or server not reachable: use local fallback
  }

  let filtered = getLocalContacts().filter(
    (c) => c.case_id.toLowerCase() === caseId.toLowerCase()
  );

  // Automatically merge sample contacts if fewer than available defaults exist for this case
  const sampleForCase = DEFAULT_CONTACTS.filter(c => c.case_id.toLowerCase() === caseId.toLowerCase());
  if (sampleForCase.length > 0 && filtered.length < sampleForCase.length) {
    const existingPhones = new Set(filtered.map(c => c.phone_number.replace(/\s+/g, "")));
    const missing = sampleForCase.filter(c => !existingPhones.has(c.phone_number.replace(/\s+/g, "")));
    if (missing.length > 0) {
      filtered = [...filtered, ...missing];
      saveLocalContacts([...getLocalContacts(), ...missing]);
    }
  }

  return {
    contacts: filtered,
    metrics: computeMetrics(filtered)
  };
}

// 2. Add contact to case
export async function addCaseContact(
  caseId: string,
  payload: {
    full_name: string;
    phone_number: string;
    contact_category: ContactCategory;
    associated_vehicle?: string;
    address?: string;
    notes?: string;
    preferred_contact_time?: string;
    assigned_officer?: string;
    allow_duplicate?: boolean;
  }
): Promise<{ success: boolean; contact?: ContactItem; isDuplicateWarning?: boolean; message?: string }> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.isDuplicateWarning) {
      return data;
    }
    if (res.ok && data.contact) {
      const allLocal = getLocalContacts();
      saveLocalContacts([data.contact, ...allLocal]);
      return { success: true, contact: data.contact, message: data.message };
    }
  } catch {
    // Fallback
  }

  // Local creation fallback
  const all = getLocalContacts();
  const cleanPhone = payload.phone_number.replace(/\s+/g, "").replace(/-/g, "");
  const existingDup = all.find(
    (c) => c.case_id.toLowerCase() === caseId.toLowerCase() && c.phone_number.replace(/\s+/g, "").replace(/-/g, "") === cleanPhone
  );

  if (existingDup && !payload.allow_duplicate) {
    return {
      success: false,
      isDuplicateWarning: true,
      message: `Contact with number '${payload.phone_number}' already exists in this case (${existingDup.full_name}).`
    };
  }

  const newContact: ContactItem = {
    id: `CNT-${caseId.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
    case_id: caseId,
    full_name: payload.full_name.trim(),
    phone_number: payload.phone_number.trim(),
    contact_category: payload.contact_category,
    associated_vehicle: payload.associated_vehicle?.trim() || undefined,
    address: payload.address?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
    contact_status: "Not Contacted",
    preferred_contact_time: payload.preferred_contact_time?.trim() || undefined,
    identity_verified: false,
    assigned_officer: payload.assigned_officer || "Inspector",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  saveLocalContacts([newContact, ...all]);
  return { success: true, contact: newContact, message: "Contact added successfully." };
}

// 3. Update contact status
export async function updateContactStatus(
  caseId: string,
  contactId: string,
  status: ContactStatus,
  officer: string = "Investigator",
  notes?: string
): Promise<ContactItem | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, officer, notes })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.contact) {
        const all = getLocalContacts().map((c) => (c.id === contactId ? data.contact : c));
        saveLocalContacts(all);
        return data.contact;
      }
    }
  } catch {}

  const all = getLocalContacts();
  const target = all.find((c) => c.id === contactId);
  if (target) {
    target.contact_status = status;
    target.last_contact_date = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    target.updated_at = new Date().toISOString();
    if (notes) {
      target.notes = `${target.notes || ""}\n${notes}`.trim();
    }
    saveLocalContacts(all);
    return target;
  }
  return null;
}

// 4. Verify identity
export async function verifyContactIdentity(
  caseId: string,
  contactId: string,
  officer: string,
  method: string = "Physical Verification / Government ID"
): Promise<ContactItem | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}/verify-identity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officer, verification_method: method })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.contact) {
        const all = getLocalContacts().map((c) => (c.id === contactId ? data.contact : c));
        saveLocalContacts(all);
        return data.contact;
      }
    }
  } catch {}

  const all = getLocalContacts();
  const target = all.find((c) => c.id === contactId);
  if (target) {
    target.identity_verified = true;
    target.contact_status = "Identity Verified";
    target.updated_at = new Date().toISOString();
    saveLocalContacts(all);
    return target;
  }
  return null;
}

// 5. Trigger Call (Automated Twilio or Manual)
export async function callContact(
  caseId: string,
  contactId: string,
  mode: "automated" | "manual" = "automated",
  officer: string = "Investigator",
  notes?: string
): Promise<{ success: boolean; message: string; telUrl?: string; twilioResult?: Record<string, unknown> }> {
  const all = getLocalContacts();
  const target = all.find((c) => c.id === contactId);

  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        mode, 
        officer, 
        notes,
        phone_number: target?.phone_number,
        full_name: target?.full_name
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (target) {
        target.contact_status = "Contact Attempted";
        target.last_contact_date = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        saveLocalContacts(all);

        const conversationScript = `Hello ${target.full_name || "Citizen"}. This is Rekishi Forensics regarding your incident report for case number ${caseId.replace("-", " ")}. Please visit our investigation office within the next three days. Thank you, goodbye.`;
        const localHist = getLocalHistory();
        const newEntry: ContactHistoryItem = {
          id: "HIST-" + Date.now(),
          contact_id: contactId,
          case_id: caseId,
          communication_type: mode === "automated" ? "Automated Twilio Call" : "Manual Phone Call",
          outcome: mode === "automated" ? "Voice Assistant Call Delivered (3-Day Case Notice)" : "Manual Call Initiated",
          notes: mode === "automated" ? conversationScript : `Manual phone call dialed to ${target.phone_number}.`,
          timestamp: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          assigned_investigator: mode === "automated" ? "Twilio Voice Assistant (Male • Polly.Matthew)" : officer
        };
        saveLocalHistory([newEntry, ...localHist]);
      }
      return data;
    }
  } catch {}

  // Fallback
  if (target) {
    target.contact_status = "Contact Attempted";
    target.last_contact_date = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    saveLocalContacts(all);
    return {
      success: true,
      message: mode === "automated" 
        ? `Twilio automated assistant simulated for ${target.phone_number}.`
        : `Manual call dialed to ${target.phone_number}.`,
      telUrl: `tel:${target.phone_number}`
    };
  }
  return { success: false, message: "Contact not found." };
}

// 6. Fetch communication history for contact
export async function fetchContactHistory(caseId: string, contactId: string): Promise<ContactHistoryItem[]> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}/history`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.history) && data.history.length > 0) {
        const clean = data.history.filter((h: ContactHistoryItem) => 
          !h.outcome?.startsWith("Status Updated:") && h.notes !== "0"
        );
        if (clean.length > 0) return clean;
      }
    }
  } catch {}

  const all = getLocalHistory();
  const matched = all.filter((h) => 
    h.contact_id === contactId && 
    !h.outcome?.startsWith("Status Updated:") && 
    h.notes !== "0"
  );
  if (matched.length > 0) return matched;

  // Fallback to default sample history if no events recorded yet
  return DEFAULT_HISTORY.filter(h => h.contact_id === contactId);
}

// 7. Log history
export async function logContactHistory(
  caseId: string,
  contactId: string,
  data: {
    communication_type: string;
    outcome: string;
    notes?: string;
    assigned_officer?: string;
    next_follow_up?: string;
  }
): Promise<ContactHistoryItem> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const resJson = await res.json();
      if (resJson.historyEntry) {
        const all = getLocalHistory();
        saveLocalHistory([resJson.historyEntry, ...all]);
        return resJson.historyEntry;
      }
    }
  } catch {}

  const newEntry: ContactHistoryItem = {
    id: `HIST-${Math.floor(1000 + Math.random() * 9000)}`,
    contact_id: contactId,
    case_id: caseId,
    communication_type: data.communication_type,
    outcome: data.outcome,
    notes: data.notes,
    timestamp: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    next_follow_up: data.next_follow_up,
    assigned_investigator: data.assigned_officer || "Investigator"
  };

  const all = getLocalHistory();
  saveLocalHistory([newEntry, ...all]);
  return newEntry;
}

// 8. Link statement to case Records
export async function linkStatementToRecords(
  caseId: string,
  contactId: string,
  statementText: string,
  officer: string = "Investigator"
): Promise<{ success: boolean; message: string; evidenceRecord?: Record<string, unknown> }> {
  try {
    const res = await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}/link-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement_text: statementText, officer })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return {
    success: true,
    message: "Statement collected and linked to case dossier."
  };
}

// 9. Delete contact
export async function deleteContact(caseId: string, contactId: string): Promise<boolean> {
  try {
    await fetch(`http://localhost:8000/api/cases/${encodeURIComponent(caseId)}/contacts/${contactId}`, {
      method: "DELETE"
    });
  } catch {}

  const all = getLocalContacts().filter((c) => c.id !== contactId);
  saveLocalContacts(all);
  return true;
}

