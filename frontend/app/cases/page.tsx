"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  Plus, 
  ArrowRight,
  Trash2
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { getStoredCases, DEFAULT_INDIAN_CASES, deleteCase, CaseDetail } from "@/lib/casesService";

export default function CasesPage() {
  const [cases, setCases] = useState<CaseDetail[]>(DEFAULT_INDIAN_CASES);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setCases(getStoredCases());
  }, []);

  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.caseNumber.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.filedBy.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-[#111111] font-sans">
      
      {/* Fixed Sidebar touching screen edges */}
      <Sidebar currentTab="cases" casesCount={cases.length} />

      {/* Fixed Topbar touching screen edges */}
      <TopHeader
        title="Cases"
        showSearch={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search case name, ID, officer..."
      />

      {/* Main Content Area starting after sidebar (260px) and topbar (72px + 32px breathing room) */}
      <main 
        style={{ marginLeft: "260px", paddingTop: "104px" }}
        className="ml-[260px] pt-[104px] px-6 sm:px-8 pb-12 min-h-screen"
      >
        <div className="space-y-6">
            
            {/* New Case Card (Blue Background with White Text to Differentiate) */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#0A66FF] via-[#1E40AF] to-[#2563EB] rounded-[24px] p-6 sm:p-7 shadow-lg shadow-blue-600/15 border border-blue-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative z-10">
                <span className="text-[13px] font-semibold text-blue-100 tracking-wide uppercase">
                  New Investigation Intake
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                  Register Incident Dossier
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-xl leading-relaxed">
                  Upload multi-format evidence (dashcam, audio notes, police files, sensor logs).
                </p>
              </div>

              <Link
                href="/cases/new"
                className="relative z-10 h-11 px-6 rounded-full bg-white text-[#0A66FF] hover:bg-blue-50 text-xs font-bold flex items-center justify-center gap-2 transition shrink-0 shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Case</span>
              </Link>
            </div>

            {/* List of Case Cards (24px radius white cards, 3-dot top-right, clean typography) */}
            <div className="space-y-4">
              {filteredCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="group block bg-white rounded-[24px] p-6 shadow-soft border border-slate-200/90 hover:border-[#111111] transition-all duration-200 card-hover-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold text-[#8A8A8A]">
                          {caseItem.caseNumber}
                        </span>
                        {caseItem.status === "Flagged Contradiction" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE0E0] text-[#C52A2A]">
                            Contradiction Flagged
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCF5E3] text-[#1A7A2E]">
                            Verified Consistent
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-[#111111] group-hover:text-[#0A66FF] transition">
                        {caseItem.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Delete case "${caseItem.name}" (${caseItem.caseNumber})?`)) {
                            const updated = deleteCase(caseItem.id);
                            setCases([...updated]);
                          }
                        }}
                        className="w-9 h-9 rounded-full bg-[#F5F5F3] hover:bg-rose-50 text-[#8A8A8A] hover:text-rose-600 flex items-center justify-center transition"
                        title="Delete Case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#8A8A8A] group-hover:bg-[#121212] group-hover:text-white transition">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#8A8A8A] mt-4 pt-4 border-t border-[#F5F5F3]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#8A8A8A]" />
                      <span>{caseItem.accidentDate}</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#8A8A8A]" />
                      <span className="text-[#111111] font-medium">{caseItem.address}</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8A8A8A]" />
                      <span>Officer: <strong className="text-[#111111] font-medium">{caseItem.filedBy}</strong></span>
                    </span>

                    <span className="ml-auto text-[11px] font-bold text-[#111111] bg-[#F5F5F3] px-3 py-1 rounded-full">
                      {caseItem.evidenceList.length} Evidence Source(s)
                    </span>
                  </div>
                </Link>
              ))}

              {filteredCases.length === 0 && (
                <div className="bg-white rounded-[24px] p-12 text-center border border-slate-200/90 shadow-soft space-y-2">
                  <FileText className="w-10 h-10 text-[#8A8A8A] mx-auto opacity-40" />
                  <h4 className="text-sm font-bold text-[#111111]">No Cases Found</h4>
                  <p className="text-xs text-[#8A8A8A]">Try adjusting your search query or register a new case.</p>
                </div>
              )}
            </div>

          </div>
      </main>
    </div>
  );
}
