"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { 
  Clock, 
  Database, 
  FileCheck2,
  MoreHorizontal
} from "lucide-react";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<"overview" | "workflow" | "timeline" | "evidence">("overview");

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-[#111111] font-sans">
      
      {/* Fixed Sidebar touching screen edges */}
      <Sidebar currentTab="docs" />

      {/* Fixed Topbar touching screen edges */}
      <TopHeader title="Documentation" showSearch={false} />

      {/* Main Content Area starting after sidebar (260px) and topbar (72px + 32px breathing room) */}
      <main 
        style={{ marginLeft: "260px", paddingTop: "104px" }}
        className="ml-[260px] pt-[104px] px-6 sm:px-8 pb-12 min-h-screen space-y-6"
      >
            
            {/* Pill Navigation Tabs matching Reference Aesthetic */}
            <div className="bg-white rounded-[24px] p-2.5 shadow-soft border border-[#F0F0F0] flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSection("overview")}
                className={`h-9 px-5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-2 ${
                  activeSection === "overview"
                    ? "bg-[#121212] text-white shadow-sm"
                    : "text-[#8A8A8A] hover:text-[#111111] hover:bg-[#F5F8FF]"
                }`}
              >
                <span>System Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("workflow")}
                className={`h-9 px-5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-2 ${
                  activeSection === "workflow"
                    ? "bg-[#121212] text-white shadow-sm"
                    : "text-[#8A8A8A] hover:text-[#111111] hover:bg-[#F5F8FF]"
                }`}
              >
                <span>Case Workflow</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("timeline")}
                className={`h-9 px-5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-2 ${
                  activeSection === "timeline"
                    ? "bg-[#121212] text-white shadow-sm"
                    : "text-[#8A8A8A] hover:text-[#111111] hover:bg-[#F5F8FF]"
                }`}
              >
                <span>Dual Timeline Methodology</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("evidence")}
                className={`h-9 px-5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-2 ${
                  activeSection === "evidence"
                    ? "bg-[#121212] text-white shadow-sm"
                    : "text-[#8A8A8A] hover:text-[#111111] hover:bg-[#F5F8FF]"
                }`}
              >
                <span>Supported Formats & Ingestion</span>
              </button>
            </div>

            {/* Section 1: System Overview */}
            {activeSection === "overview" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-soft border border-[#F0F0F0] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium text-[#8A8A8A]">
                        Forensics Architecture
                      </span>
                      <h2 className="text-xl font-extrabold text-[#111111] mt-0.5">
                        About REKISHI Intelligence System
                      </h2>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#555555] leading-relaxed">
                    REKISHI is an incident investigation and multi-source evidence reconstruction system designed for traffic safety teams, law enforcement investigators, and forensic claims analysts. It resolves the problem of fragmented evidence by merging dashcam video, eyewitness audio recordings, police panchnama documents, and vehicle sensor logs into a single synchronized case dossier.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-2">
                      <div className="text-xs font-bold text-[#111111] flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#0A66FF]" /> Multi-Source Intake
                      </div>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed">
                        Accepts files in any standard format without prior conversion. Audio, video, PDF reports, and telemetry logs are ingested seamlessly.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-2">
                      <div className="text-xs font-bold text-[#111111] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#1A7A2E]" /> Dual Timeline Sync
                      </div>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed">
                        Correlates real-world incident occurrence times with system upload timestamps to maintain an unalterable chain of custody.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-2">
                      <div className="text-xs font-bold text-[#111111] flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-[#6366F1]" /> Dynamic Auto-Summary
                      </div>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed">
                        Whenever new evidence is submitted, the case brief is automatically re-synthesized to reflect newly corroborated facts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Case Workflow Guide */}
            {activeSection === "workflow" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-soft border border-[#F0F0F0] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium text-[#8A8A8A]">
                        Operational Standard Operating Procedure
                      </span>
                      <h2 className="text-xl font-extrabold text-[#111111] mt-0.5">
                        Investigation Lifecycle Workflow
                      </h2>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] flex items-start gap-4">
                      <span className="w-7 h-7 rounded-full bg-[#121212] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#111111]">Register Case Dossier</h3>
                        <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                          Navigate to Cases and click <strong className="text-[#111111]">New Case</strong>. Fill in the incident title, investigating officer details, incident occurrence time, and assigned geographical location coordinates.
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] flex items-start gap-4">
                      <span className="w-7 h-7 rounded-full bg-[#121212] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#111111]">Ingest Initial Evidence</h3>
                        <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                          Attach available media during registration or later in the <strong className="text-[#111111]">Records</strong> tab. Drag-and-drop multiple files simultaneously (e.g. CCTV MP4, eyewitness voice note M4A, or police panchnama PDF).
                        </p>
                      </div>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] flex items-start gap-4">
                      <span className="w-7 h-7 rounded-full bg-[#121212] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-[#111111]">Continuous Auto-Synthesis</h3>
                        <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                          As each piece of evidence is verified, REKISHI updates the Brief Summary and adds chronological milestones to the dual timeline. Contradictions between witness testimony and objective sensor logs are flagged automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Dual Timeline Methodology */}
            {activeSection === "timeline" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-soft border border-[#F0F0F0] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium text-[#8A8A8A]">
                        Forensic Integrity Standard
                      </span>
                      <h2 className="text-xl font-extrabold text-[#111111] mt-0.5">
                        The Dual Timeline Concept
                      </h2>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#555555] leading-relaxed">
                    Forensic investigations frequently fail in legal proceedings when evidence timestamps are confused with incident occurrence timestamps. REKISHI strictly enforces a dual-track timeline architecture:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF3FF] text-[#0A66FF]">
                          Track A
                        </span>
                        <span className="text-xs font-bold text-[#111111]">Incident Event Timeline</span>
                      </div>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed">
                        The reconstructed physical sequence of what transpired on the road (e.g. 23:15 IST brake failure, 23:18 IST barrier collision). Extracted from dashcam timestamps, telemetry logs, and witness statements.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F5F5F3] text-[#111111] border border-[#EEEEEC]">
                          Track B
                        </span>
                        <span className="text-xs font-bold text-[#111111]">System Ingestion Ledger</span>
                      </div>
                      <p className="text-xs text-[#8A8A8A] leading-relaxed">
                        The cryptographic intake timestamp recorded when an evidence file was uploaded to REKISHI. Guarantees non-repudiation and proves chain-of-custody compliance for court admissibility.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Supported Formats & Ingestion */}
            {activeSection === "evidence" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-soft border border-[#F0F0F0] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium text-[#8A8A8A]">
                        Multi-Modal Capabilities
                      </span>
                      <h2 className="text-xl font-extrabold text-[#111111] mt-0.5">
                        Supported Data Formats
                      </h2>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF3FF] text-[#0A66FF] inline-block">
                        Video
                      </span>
                      <div className="text-xs font-bold text-[#111111] pt-1">MP4, AVI, MOV, MKV</div>
                      <p className="text-xs text-[#8A8A8A]">
                        Dashcam footage, surveillance feeds, highway camera exports.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F8FD] text-[#0284C7] inline-block">
                        Audio
                      </span>
                      <div className="text-xs font-bold text-[#111111] pt-1">MP3, WAV, M4A, AAC</div>
                      <p className="text-xs text-[#8A8A8A]">
                        Emergency 112 calls, eyewitness audio testimony, police voice notes.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFEAEA] text-[#E11D48] inline-block">
                        Documents
                      </span>
                      <div className="text-xs font-bold text-[#111111] pt-1">PDF, DOC, DOCX</div>
                      <p className="text-xs text-[#8A8A8A]">
                        FIR copies, police panchnama sheets, hospital medicolegal certificates.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#6366F1] inline-block">
                        Telemetry
                      </span>
                      <div className="text-xs font-bold text-[#111111] pt-1">CSV, JSON, CAN-Bus</div>
                      <p className="text-xs text-[#8A8A8A]">
                        Vehicle speed logs, ABS braking activation, airbag deployment triggers.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FAF5FF] text-[#9333EA] inline-block">
                        Images
                      </span>
                      <div className="text-xs font-bold text-[#111111] pt-1">JPG, PNG, WEBP, TIFF</div>
                      <p className="text-xs text-[#8A8A8A]">
                        High-resolution crash site photos, skid mark records, tire tread shots.
                      </p>
                    </div>

                    <div className="p-5 rounded-[20px] bg-[#F5F8FF] border border-[#EEEEEC] space-y-1.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#D97706] inline-block">
                        Scripts
                      </span>
                      <div className="text-xs font-bold text-[#111111] pt-1">PY, JS, SH, SQL</div>
                      <p className="text-xs text-[#8A8A8A]">
                        Reconstruction scripts and physics simulation logs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

      </main>
    </div>
  );
}
