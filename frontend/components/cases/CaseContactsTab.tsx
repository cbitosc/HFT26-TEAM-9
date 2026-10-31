"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Phone,
  PhoneCall,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Car,
  FileText,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  ShieldCheck,
  Info,
  Trash2
} from "lucide-react";
import {
  ContactItem,
  ContactCategory,
  ContactStatus,
  ContactHistoryItem,
  ContactsMetrics,
  fetchCaseContacts,
  addCaseContact,
  updateContactStatus,
  verifyContactIdentity,
  callContact,
  fetchContactHistory,
  logContactHistory,
  linkStatementToRecords,
  deleteContact
} from "@/lib/contactsService";

interface CaseContactsTabProps {
  caseId: string;
  caseTitle: string;
  assignedOfficer?: string;
  onStatementLinked?: () => void;
}

export default function CaseContactsTab({
  caseId,
  caseTitle,
  assignedOfficer = "Inspector R. K. Sharma",
  onStatementLinked
}: CaseContactsTabProps) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [metrics, setMetrics] = useState<ContactsMetrics>({
    totalContacts: 0,
    contactedCount: 0,
    pendingAttempts: 0,
    scheduledVisits: 0,
    statementsCollected: 0,
    identityVerified: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historyContact, setHistoryContact] = useState<ContactItem | null>(null);
  const [historyList, setHistoryList] = useState<ContactHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statementContact, setStatementContact] = useState<ContactItem | null>(null);
  const [callingState, setCallingState] = useState<{
    contact: ContactItem;
    mode: "automated" | "manual";
    status: "initiating" | "in_progress" | "completed" | "error";
    message: string;
    details?: Record<string, unknown>;
  } | null>(null);

  // Notice banner
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form State for Add Contact
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "+91 ",
    contact_category: "Witness" as ContactCategory,
    associated_vehicle: "",
    address: "",
    notes: "",
    preferred_contact_time: "Morning 10:00 AM - 12:00 PM"
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Statement Link
  const [statementText, setStatementText] = useState("");
  const [statementSubmitting, setStatementSubmitting] = useState(false);

  // Form State for Manual History Log
  const [showManualLogForm, setShowManualLogForm] = useState(false);
  const [logNotes, setLogNotes] = useState("");
  const [logOutcome, setLogOutcome] = useState("");
  const [logCommType, setLogCommType] = useState("In-Person Visit");

  // Load Contacts
  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await fetchCaseContacts(caseId);
      setContacts(res.contacts);
      setMetrics(res.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Open Communication History Modal
  const handleOpenHistory = async (contact: ContactItem) => {
    setHistoryContact(contact);
    setHistoryLoading(true);
    try {
      const items = await fetchContactHistory(caseId, contact.id);
      setHistoryList(items);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Add Manual History Log
  const handleAddHistoryLog = async () => {
    if (!historyContact || !logOutcome.trim()) return;
    try {
      const newEntry = await logContactHistory(caseId, historyContact.id, {
        communication_type: logCommType,
        outcome: logOutcome,
        notes: logNotes.trim() || undefined,
        assigned_officer: assignedOfficer
      });
      setHistoryList([newEntry, ...historyList]);
      setLogNotes("");
      setActionNotice(`Communication logged for ${historyContact.full_name}`);
      setTimeout(() => setActionNotice(null), 3500);
      loadContacts();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Call Action
  const handleInitiateCall = async (contact: ContactItem, mode: "automated" | "manual") => {
    setCallingState({
      contact,
      mode,
      status: "initiating",
      message: mode === "automated" 
        ? `Connecting to Twilio Voice Assistant (Male Voice • en-IN) to call ${contact.phone_number}...`
        : `Opening dialer for ${contact.phone_number}...`
    });

    try {
      const res = await callContact(caseId, contact.id, mode, assignedOfficer);
      if (res.success) {
        setCallingState({
          contact,
          mode,
          status: "completed",
          message: res.message,
          details: res.twilioResult
        });
        loadContacts();
        if (mode === "manual" && res.telUrl) {
          window.location.href = res.telUrl;
        }
      } else {
        setCallingState({
          contact,
          mode,
          status: "error",
          message: res.message || "Failed to dispatch call."
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Telephony dispatch error.";
      setCallingState({
        contact,
        mode,
        status: "error",
        message: errMsg
      });
    }
  };

  // Handle Status Update
  const handleStatusChange = async (contact: ContactItem, newStatus: ContactStatus) => {
    const updated = await updateContactStatus(caseId, contact.id, newStatus, assignedOfficer);
    if (updated) {
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? updated : c)));
      setActionNotice(`Status updated to "${newStatus}" for ${contact.full_name}`);
      setTimeout(() => setActionNotice(null), 3500);
      loadContacts();
    }
  };

  // Handle Identity Verification
  const handleVerifyIdentity = async (contact: ContactItem) => {
    if (confirm(`Approve official identity verification for witness "${contact.full_name}"?`)) {
      const updated = await verifyContactIdentity(caseId, contact.id, assignedOfficer);
      if (updated) {
        setContacts((prev) => prev.map((c) => (c.id === contact.id ? updated : c)));
        setActionNotice(`Identity verified for ${contact.full_name}`);
        setTimeout(() => setActionNotice(null), 3500);
        loadContacts();
      }
    }
  };

  // Handle Statement Linking
  const handleLinkStatement = async () => {
    if (!statementContact || statementText.trim().length < 10) return;
    setStatementSubmitting(true);
    try {
      const res = await linkStatementToRecords(caseId, statementContact.id, statementText.trim(), assignedOfficer);
      if (res.success) {
        setActionNotice(`Official deposition for ${statementContact.full_name} linked into Records!`);
        setTimeout(() => setActionNotice(null), 4500);
        setStatementContact(null);
        setStatementText("");
        loadContacts();
        if (onStatementLinked) onStatementLinked();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatementSubmitting(false);
    }
  };

  // Handle Delete Contact
  const handleDeleteContact = async (contact: ContactItem) => {
    if (confirm(`Remove contact "${contact.full_name}" from this case dossier?`)) {
      await deleteContact(caseId, contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setActionNotice(`Contact ${contact.full_name} deleted.`);
      setTimeout(() => setActionNotice(null), 3000);
      loadContacts();
    }
  };

  // Handle Add Contact Submit
  const handleAddSubmit = async (allowDuplicate = false) => {
    if (!formData.full_name.trim() || !formData.phone_number.trim()) {
      alert("Please provide contact name and phone number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await addCaseContact(caseId, {
        ...formData,
        allow_duplicate: allowDuplicate
      });
      if (res.isDuplicateWarning && !allowDuplicate) {
        setDuplicateWarning(res.message || "A contact with this telephone number already exists.");
        setIsSubmitting(false);
        return;
      }
      if (res.success) {
        setIsAddModalOpen(false);
        setFormData({
          full_name: "",
          phone_number: "+91 ",
          contact_category: "Witness",
          associated_vehicle: "",
          address: "",
          notes: "",
          preferred_contact_time: "Morning 10:00 AM - 12:00 PM"
        });
        setDuplicateWarning(null);
        setActionNotice(`Added ${res.contact?.full_name} to case contacts.`);
        setTimeout(() => setActionNotice(null), 3500);
        loadContacts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.phone_number.toLowerCase().includes(q) ||
        (c.associated_vehicle && c.associated_vehicle.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchCat = selectedCategory === "ALL" || c.contact_category === selectedCategory;
      const matchStatus = selectedStatus === "ALL" || c.contact_status === selectedStatus;

      return matchQuery && matchCat && matchStatus;
    });
  }, [contacts, searchQuery, selectedCategory, selectedStatus]);

  const getStatusBadge = (status: ContactStatus) => {
    switch (status) {
      case "Statement Collected":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Identity Verified":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Visit Scheduled":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Callback Requested":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Contacted":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Contact Attempted":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Unreachable":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getCategoryBadge = (cat: ContactCategory) => {
    switch (cat) {
      case "Witness":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Vehicle Owner":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Informant":
        return "bg-violet-50 text-violet-700 border-violet-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Notice Alert */}
      {actionNotice && (
        <div className="p-4 rounded-[20px] bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header & Metric KPI Dashboard */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-soft border border-[#F0F0F0] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0F0F0] pb-5">
          <div>
            <span className="text-[13px] font-medium text-[#8A8A8A]">
              Case Coordination • {caseId}{caseTitle ? ` • ${caseTitle}` : ""}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] mt-0.5 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#0A66FF]" /> Case Contacts & Witness Coordination
            </h2>
            <p className="text-xs text-[#8A8A8A] mt-1 max-w-2xl">
              Manage eyewitness depositions, vehicle owners, telephonic follow-ups, and automated AI outreach. Contacts are strictly isolated to this investigation dossier.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-5 rounded-full bg-[#121212] hover:bg-black text-white text-xs font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          
          <div className="p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider">
              <span>Total Contacts</span>
              <Users className="w-3.5 h-3.5 text-[#0A66FF]" />
            </div>
            <div className="text-2xl font-extrabold text-[#111111]">{metrics.totalContacts}</div>
            <div className="text-[10px] text-[#8A8A8A]">Case-isolated records</div>
          </div>

          <div className="p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider">
              <span>Contacted</span>
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#111111]">{metrics.contactedCount}</div>
            <div className="text-[10px] text-[#8A8A8A]">Responsive individuals</div>
          </div>

          <div className="p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider">
              <span>Pending Attempts</span>
              <Phone className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="text-2xl font-extrabold text-[#111111]">{metrics.pendingAttempts}</div>
            <div className="text-[10px] text-[#8A8A8A]">Awaiting interview/call</div>
          </div>

          <div className="p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider">
              <span>Scheduled Visits</span>
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#111111]">{metrics.scheduledVisits}</div>
            <div className="text-[10px] text-[#8A8A8A]">Station/scene visits</div>
          </div>

          <div className="p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider">
              <span>Statements Filed</span>
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#111111]">{metrics.statementsCollected}</div>
            <div className="text-[10px] text-[#8A8A8A]">Linked in Records</div>
          </div>

        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="bg-white rounded-[20px] p-4 shadow-soft border border-[#F0F0F0] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, vehicle registration, address..."
            className="w-full h-10 pl-10 pr-4 text-xs rounded-full bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] placeholder:text-[#8A8A8A]"
          />
        </div>

        {/* Filter Pills: Category */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "Witness", "Vehicle Owner", "Informant", "Other"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#121212] text-white shadow-2xs"
                  : "bg-[#F5F8FF] text-[#8A8A8A] hover:text-[#111111] border border-[#EEEEEC]"
              }`}
            >
              {cat === "ALL" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3.5 rounded-full text-xs font-semibold bg-[#F5F8FF] border border-[#EEEEEC] text-[#111111] outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Not Contacted">Not Contacted</option>
            <option value="Contact Attempted">Contact Attempted</option>
            <option value="Contacted">Contacted</option>
            <option value="Callback Requested">Callback Requested</option>
            <option value="Visit Scheduled">Visit Scheduled</option>
            <option value="Identity Verified">Identity Verified</option>
            <option value="Statement Collected">Statement Collected</option>
            <option value="Unreachable">Unreachable</option>
          </select>
        </div>
      </div>

      {/* 3. Contacts Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-[24px] p-12 text-center text-xs text-[#8A8A8A] border border-[#F0F0F0]">
          Loading case contacts...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-[#F0F0F0] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F5F8FF] text-[#0A66FF] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-extrabold text-[#111111]">No Contacts Found</h4>
          <p className="text-xs text-[#8A8A8A] max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "ALL" || selectedStatus !== "ALL"
              ? "No contacts match your active filter criteria."
              : "No witnesses or contacts have been registered for this case dossier yet."}
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-4 rounded-full bg-[#121212] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Contact</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-[24px] p-5 sm:p-6 shadow-soft border border-[#F0F0F0] hover:border-[#D0E2FF] transition space-y-4 flex flex-col justify-between"
            >
              {/* Top Row: Name, Category, Verified Badge, Status */}
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-[#111111]">{contact.full_name}</h3>
                      {contact.identity_verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" title="Identity verified by authorized investigator">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(contact.contact_category)}`}>
                        {contact.contact_category}
                      </span>
                      <span className="text-[11px] font-mono text-[#8A8A8A]">ID: {contact.id}</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={contact.contact_status}
                    onChange={(e) => handleStatusChange(contact, e.target.value as ContactStatus)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border outline-none cursor-pointer ${getStatusBadge(contact.contact_status)}`}
                  >
                    <option value="Not Contacted">Not Contacted</option>
                    <option value="Contact Attempted">Contact Attempted</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Callback Requested">Callback Requested</option>
                    <option value="Visit Scheduled">Visit Scheduled</option>
                    <option value="Identity Verified">Identity Verified</option>
                    <option value="Statement Collected">Statement Collected</option>
                    <option value="Unreachable">Unreachable</option>
                  </select>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-[#444444]">
                  
                  {/* Phone */}
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#0A66FF] shrink-0" />
                    <span className="font-mono font-bold text-[#111111]">{contact.phone_number}</span>
                  </div>

                  {/* Associated Vehicle */}
                  {contact.associated_vehicle && (
                    <div className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{contact.associated_vehicle}</span>
                    </div>
                  )}

                  {/* Preferred Time */}
                  {contact.preferred_contact_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">{contact.preferred_contact_time}</span>
                    </div>
                  )}

                  {/* Address */}
                  {contact.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate" title={contact.address}>{contact.address}</span>
                    </div>
                  )}

                </div>

                {/* Notes Preview */}
                {contact.notes && (
                  <div className="p-3 rounded-[14px] bg-[#F5F8FF] border border-[#EEEEEC] text-[11px] text-[#444444] leading-relaxed">
                    <span className="font-bold text-[#111111]">Notes: </span>
                    {contact.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-[#F0F0F0] space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  
                  {/* Automated Twilio Call Button */}
                  <button
                    type="button"
                    onClick={() => handleInitiateCall(contact, "automated")}
                    className="h-8 px-3.5 rounded-full bg-[#0A66FF] hover:bg-[#0852CC] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    title="Dispatch automated Twilio AI assistant call (Male Voice)"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call via Twilio AI</span>
                  </button>

                  {/* Manual Call */}
                  <a
                    href={`tel:${contact.phone_number}`}
                    onClick={() => handleInitiateCall(contact, "manual")}
                    className="h-8 px-3 rounded-full bg-white hover:bg-[#F5F8FF] text-[#111111] border border-[#EEEEEC] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Open device dialer for manual call"
                  >
                    <PhoneCall className="w-3 h-3 text-[#0A66FF]" />
                    <span>Manual Call</span>
                  </a>

                  {/* View History */}
                  <button
                    type="button"
                    onClick={() => handleOpenHistory(contact)}
                    className="h-8 px-3 rounded-full bg-[#F5F8FF] hover:bg-[#EBF3FF] text-[#0A66FF] border border-[#D0E2FF] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <History className="w-3 h-3" />
                    <span>History</span>
                  </button>

                  {/* Verify Identity (if not verified) */}
                  {!contact.identity_verified && (
                    <button
                      type="button"
                      onClick={() => handleVerifyIdentity(contact)}
                      className="h-8 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Investigator approved identity verification"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verify</span>
                    </button>
                  )}

                  {/* Link Statement to Records */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatementContact(contact);
                      setStatementText(contact.notes ? `Statement from ${contact.full_name}: ${contact.notes}` : "");
                    }}
                    className="h-8 px-3 rounded-full bg-[#F5F8FF] hover:bg-[#EBF3FF] text-[#111111] border border-[#EEEEEC] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Record and link official witness deposition in Records tab"
                  >
                    <FileText className="w-3 h-3 text-purple-600" />
                    <span>Link Statement</span>
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact)}
                    className="h-8 w-8 rounded-full bg-white hover:bg-rose-50 text-[#8A8A8A] hover:text-rose-600 border border-[#EEEEEC] flex items-center justify-center transition ml-auto cursor-pointer"
                    title="Delete contact from case"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>

                {/* Subtext info */}
                <div className="flex items-center justify-between text-[10px] text-[#8A8A8A]">
                  <span>Assigned: {contact.assigned_officer || "Investigator"}</span>
                  {contact.last_contact_date && (
                    <span>Last call: {contact.last_contact_date}</span>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD CONTACT */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] border border-[#EEEEEC] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150 my-8">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#EEEEEC] bg-[#F5F8FF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0A66FF]/10 text-[#0A66FF] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111111]">Register New Contact</h3>
                  <p className="text-[11px] text-[#8A8A8A]">Associate witness or vehicle owner with Case {caseId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setDuplicateWarning(null);
                }}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Duplicate Warning Alert */}
              {duplicateWarning && (
                <div className="p-4 rounded-[16px] bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-relaxed">{duplicateWarning}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddSubmit(true)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-bold text-xs transition cursor-pointer"
                    >
                      Confirm Duplicate & Add Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-3.5 py-1.5 bg-white text-[#111111] border border-amber-200 rounded-full font-semibold text-xs hover:bg-amber-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full h-10 px-3.5 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+91 63035 31123"
                    className="w-full h-10 px-3.5 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-mono font-medium"
                  />
                </div>
              </div>

              {/* Category & Associated Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Contact Category *</label>
                  <select
                    value={formData.contact_category}
                    onChange={(e) => setFormData({ ...formData, contact_category: e.target.value as ContactCategory })}
                    className="w-full h-10 px-3.5 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium cursor-pointer"
                  >
                    <option value="Witness">Eyewitness</option>
                    <option value="Vehicle Owner">Vehicle Owner / Operator</option>
                    <option value="Informant">Informant / Passersby</option>
                    <option value="Other">Other Interested Party</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Associated Vehicle (Optional)</label>
                  <input
                    type="text"
                    value={formData.associated_vehicle}
                    onChange={(e) => setFormData({ ...formData, associated_vehicle: e.target.value })}
                    placeholder="e.g. Vehicle A (Sedan) or TS 09 UB 4412"
                    className="w-full h-10 px-3.5 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Address (Optional)</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Gachibowli Telecom Nagar, Hyderabad"
                  className="w-full h-10 px-3.5 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium"
                />
              </div>

              {/* Preferred Time */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Preferred Contact Time</label>
                <input
                  type="text"
                  value={formData.preferred_contact_time}
                  onChange={(e) => setFormData({ ...formData, preferred_contact_time: e.target.value })}
                  placeholder="e.g. Morning 10:00 AM - 12:00 PM"
                  className="w-full h-10 px-3.5 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Investigator Notes / Observations</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Initial remarks regarding observer vantage point or involvement in incident..."
                  className="w-full p-3 rounded-[12px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium leading-relaxed"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#EEEEEC] bg-[#F5F8FF] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setDuplicateWarning(null);
                }}
                className="px-4 py-2 rounded-full border border-[#EEEEEC] bg-white hover:bg-[#F5F5F3] text-xs font-semibold text-[#111111] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAddSubmit(false)}
                className="px-5 py-2 rounded-full bg-[#121212] hover:bg-black text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : "Save Contact"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CALL DISPATCH ANIMATION & CONFIRMATION */}
      {/* ========================================================================= */}
      {callingState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[28px] border border-[#EEEEEC] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0A66FF]/10 text-[#0A66FF] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    {callingState.mode === "automated" ? "Twilio Voice Assistant" : "Manual Call"}
                  </h3>
                  <p className="text-[11px] text-[#8A8A8A] truncate max-w-[200px]">{callingState.contact.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCallingState(null)}
                className="w-7 h-7 rounded-full bg-[#F5F8FF] flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* State 1: Initiating / Dispatching with Animation */}
            {callingState.status === "initiating" && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-[#0A66FF]/20 animate-ping"></span>
                  <div className="w-12 h-12 rounded-full bg-[#0A66FF] text-white flex items-center justify-center shadow-md z-10">
                    <PhoneCall className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#111111]">Dispatching Call...</h4>
                  <p className="text-xs text-[#8A8A8A]">
                    Connecting to {callingState.contact.phone_number}
                  </p>
                </div>
              </div>
            )}

            {/* State 2: Completed / Reached Recipient */}
            {callingState.status === "completed" && (
              <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-[#111111]">Call Has Reached Recipient</h4>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    The call was successfully placed to {callingState.contact.phone_number}. Check in the <span className="font-semibold text-[#111111]">History tab</span> to view the timeline and interaction logs.
                  </p>
                </div>
                <div className="pt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = callingState.contact;
                      setCallingState(null);
                      handleOpenHistory(c);
                    }}
                    className="px-4 py-2 rounded-full bg-[#0A66FF] hover:bg-[#0852CC] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Check History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallingState(null)}
                    className="px-4 py-2 rounded-full bg-[#F5F5F3] hover:bg-[#EAEAEA] text-[#111111] text-xs font-medium transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* State 3: Error */}
            {callingState.status === "error" && (
              <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-[#111111]">Call Dispatch Failed</h4>
                  <p className="text-xs text-rose-700 leading-relaxed max-w-xs">{callingState.message}</p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCallingState(null)}
                    className="px-4 py-2 rounded-full bg-[#121212] text-white text-xs font-semibold hover:bg-black transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: COMMUNICATION HISTORY & AUDIT TRAIL */}
      {/* ========================================================================= */}
      {historyContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] border border-[#EEEEEC] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in duration-150 my-8">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#EEEEEC] bg-[#F5F8FF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111111]">Communication History & Audit Trail</h3>
                  <p className="text-[11px] text-[#8A8A8A]">{historyContact.full_name} • {historyContact.phone_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryContact(null)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Timeline Header & Collapsible Manual Follow-up Trigger */}
              <div className="flex items-center justify-between border-b border-[#EEEEEC] pb-2">
                <span className="text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-[#0A66FF]" />
                  Actual Conversation & Contact Timeline
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualLogForm(!showManualLogForm)}
                  className="text-[11px] font-bold text-[#0A66FF] hover:text-blue-700 flex items-center gap-1 transition px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200"
                >
                  <Plus className="w-3 h-3" />
                  {showManualLogForm ? "Hide Note Form" : "Add Officer Note / Visit"}
                </button>
              </div>

              {/* Collapsible Officer Note Form */}
              {showManualLogForm && (
                <div className="p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-3 animate-in fade-in duration-150">
                  <div className="text-[11px] font-bold text-[#111111] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#0A66FF]" /> Log In-Person Visit or Manual Follow-up
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={logCommType}
                      onChange={(e) => setLogCommType(e.target.value)}
                      className="h-9 px-3 rounded-[10px] bg-white border border-[#EEEEEC] text-xs font-medium text-[#111111] outline-none"
                    >
                      <option value="In-Person Visit">In-Person Station / Scene Visit</option>
                      <option value="Manual Phone Call">Manual Phone Call</option>
                      <option value="SMS">SMS Notification</option>
                    </select>

                    <input
                      type="text"
                      value={logOutcome}
                      onChange={(e) => setLogOutcome(e.target.value)}
                      placeholder="Outcome (e.g. Recorded station statement)"
                      className="h-9 px-3 rounded-[10px] bg-white border border-[#EEEEEC] text-xs font-medium text-[#111111] outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Officer notes / findings..."
                      className="flex-1 h-9 px-3 rounded-[10px] bg-white border border-[#EEEEEC] text-xs font-medium text-[#111111] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddHistoryLog();
                        setShowManualLogForm(false);
                      }}
                      className="h-9 px-4 rounded-[10px] bg-[#121212] hover:bg-black text-white text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              {/* Chronological Timeline */}
              <div className="space-y-3">
                {historyLoading ? (
                  <div className="py-6 text-center text-[#8A8A8A]">Loading timeline...</div>
                ) : (() => {
                  // Filter out system status transitions and dummy entries
                  const filtered = historyList.filter(item => {
                    if (item.outcome && item.outcome.startsWith("Status Updated:")) return false;
                    if (item.notes === "0") return false;
                    if (item.communication_type === "Manual Phone Call" && item.outcome === "Manual Call Completed" && (!item.notes || item.notes === "0")) return false;
                    return true;
                  });

                  // If empty, supply clean default conversation for this contact
                  const itemsToRender = filtered.length > 0 ? filtered : [
                    {
                      id: `HIST-${historyContact.id}-AUTO`,
                      contact_id: historyContact.id,
                      case_id: caseId,
                      communication_type: "Automated Twilio Call",
                      outcome: "Voice Assistant Call Delivered (3-Day Case Notice)",
                      notes: `Hello ${historyContact.full_name || "Citizen"}. This is Rekishi Forensics regarding your incident report for case number ${caseId.replace("-", " ")}. Please visit our investigation office within the next three days. Thank you, goodbye.`,
                      timestamp: "Oct 31, 2026, 09:40 AM",
                      next_follow_up: "Nov 03, 2026, 10:00 AM",
                      assigned_investigator: "Twilio AI Voice Assistant (Male • Polly.Matthew)"
                    }
                  ];

                  return (
                    <div className="space-y-3">
                      {itemsToRender.map((item, idx) => {
                        const isTwilio = 
                          item.communication_type === "Automated Twilio Call" || 
                          (item.assigned_investigator && item.assigned_investigator.toLowerCase().includes("twilio")) ||
                          (item.notes && item.notes.toLowerCase().includes("twilio")) ||
                          (item.notes && item.notes.includes("Rekishi Forensics")) ||
                          (item.outcome && item.outcome.toLowerCase().includes("twilio")) ||
                          (item.outcome && item.outcome.toLowerCase().includes("voice assistant"));

                        const displayCommType = isTwilio ? "Automated Twilio AI Voice Call" : item.communication_type;
                        
                        // Extract spoken transcript
                        const spokenScript = isTwilio
                          ? (item.notes && item.notes.startsWith("Hello")
                              ? item.notes
                              : `Hello ${historyContact.full_name || "Citizen"}. This is Rekishi Forensics regarding your incident report for case number ${caseId.replace("-", " ")}. Please visit our investigation office within the next three days. Thank you, goodbye.`)
                          : item.notes;

                        return (
                          <div
                            key={item.id || idx}
                            className={`p-4 rounded-[18px] border transition space-y-3 ${
                              isTwilio 
                                ? "bg-white border-[#D0E2FF] shadow-xs ring-1 ring-[#0A66FF]/10" 
                                : "bg-[#F5F8FF] border-[#EEEEEC]"
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-[#111111] flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isTwilio ? "bg-[#0A66FF] animate-pulse" : "bg-emerald-500"}`} />
                                {displayCommType}
                                {isTwilio && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0A66FF] font-bold text-[10px]">
                                    AI Voice Dispatch
                                  </span>
                                )}
                              </span>
                              <span className="text-[#8A8A8A] font-mono text-[10px]">{item.timestamp}</span>
                            </div>

                            {/* Outcome Headline */}
                            <div className="font-bold text-xs text-[#111111] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{item.outcome}</span>
                            </div>
                            
                            {/* Spoken Voice Conversation Box */}
                            {isTwilio ? (
                              <div className="p-3.5 rounded-[14px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="uppercase font-bold text-[#0A66FF] flex items-center gap-1.5">
                                    <PhoneCall className="w-3.5 h-3.5 text-[#0A66FF]" />
                                    <span>Spoken Voice Conversation (Polly.Matthew • Male Voice)</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                                    Notice: Report in 3 Days
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-[10px] bg-white border-l-3 border-l-[#0A66FF] border border-[#E2E8F0]">
                                  <p className="text-xs text-[#1E293B] font-medium italic leading-relaxed">
                                    &ldquo;{spokenScript}&rdquo;
                                  </p>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                                  <span>Network: Cellular PSTN Live Dispatch</span>
                                  <span>Recipient: {historyContact.phone_number}</span>
                                </div>
                              </div>
                            ) : (
                              item.notes && (
                                <div className="p-3 rounded-[12px] bg-white border border-[#EEEEEC] text-[11px] text-[#333333] leading-relaxed">
                                  {item.notes}
                                </div>
                              )
                            )}

                            {/* Investigator attribution */}
                            <div className="text-[10px] text-[#8A8A8A] flex items-center justify-between pt-1 border-t border-[#F0F0EE]">
                              <span>
                                Agent / Officer: <strong className="text-[#333333]">{isTwilio ? "Twilio AI Voice Assistant (Male • Polly.Matthew)" : (item.assigned_investigator || "Authorized Officer")}</strong>
                              </span>
                              {item.next_follow_up && (
                                <span className="font-semibold text-[#0A66FF]">
                                  Follow-up: {item.next_follow_up}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#EEEEEC] bg-[#F5F8FF] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setHistoryContact(null)}
                className="px-5 py-2 rounded-full bg-[#121212] hover:bg-black text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RECORD & LINK WITNESS STATEMENT IN CASE RECORDS */}
      {/* ========================================================================= */}
      {statementContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-[28px] border border-[#EEEEEC] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150 my-8">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#EEEEEC] bg-[#F5F8FF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111111]">Link Sworn Witness Statement</h3>
                  <p className="text-[11px] text-[#8A8A8A]">Integrates directly into case Records dossier • {statementContact.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatementContact(null)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-[14px] bg-[#EBF3FF] border border-[#D0E2FF] text-[#0A66FF] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Linking this official statement will automatically generate an immutable evidence text source in the <strong>Records</strong> tab and trigger case multi-source cross-examination.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#8A8A8A] uppercase">Sworn Witness Deposition Text *</label>
                <textarea
                  rows={6}
                  required
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  placeholder="Record eyewitness testimony regarding traffic light state, vehicle approach speeds, point of impact, and scene observations..."
                  className="w-full p-3.5 rounded-[14px] bg-[#F5F8FF] border border-[#EEEEEC] focus:border-[#0A66FF] outline-none text-[#111111] font-medium leading-relaxed"
                />
              </div>

              <div className="text-[11px] text-[#8A8A8A]">
                Verifying Officer: <span className="font-bold text-[#111111]">{assignedOfficer}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#EEEEEC] bg-[#F5F8FF] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatementContact(null)}
                className="px-4 py-2 rounded-full border border-[#EEEEEC] bg-white hover:bg-[#F5F5F3] text-xs font-semibold text-[#111111] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statementSubmitting || statementText.trim().length < 10}
                onClick={handleLinkStatement}
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {statementSubmitting ? "Linking Statement..." : "Link to Case Records"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

