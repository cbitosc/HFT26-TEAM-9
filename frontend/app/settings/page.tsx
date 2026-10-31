"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { 
  CheckCircle2, 
  Save, 
  MoreHorizontal
} from "lucide-react";

export default function SettingsPage() {
  const [autoExtract, setAutoExtract] = useState(true);
  const [timeFormat, setTimeFormat] = useState("dual");
  const [auditLogging, setAuditLogging] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-[#111111] font-sans">
      
      {/* Fixed Sidebar touching screen edges */}
      <Sidebar currentTab="settings" />

      {/* Fixed Topbar touching screen edges */}
      <TopHeader title="Settings" showSearch={false} />

      {/* Main Content Area starting after sidebar (260px) and topbar (72px + 32px breathing room) */}
      <main 
        style={{ marginLeft: "260px", paddingTop: "104px" }}
        className="ml-[260px] pt-[104px] px-6 sm:px-8 pb-12 min-h-screen"
      >
        <div className="max-w-5xl space-y-6">

          {/* Preferences Card */}
          <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-soft border border-[#F0F0F0] space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-medium text-[#8A8A8A]">
                  Configuration & Preferences
                </span>
                <h2 className="text-xl font-extrabold text-[#111111] mt-0.5">
                  System Settings
                </h2>
                <p className="text-xs text-[#8A8A8A] mt-0.5">
                  Configure processing behaviors and default forensic timeline presentation.
                </p>
              </div>

              <button className="w-8 h-8 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#8A8A8A] hover:text-[#111111] transition">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              
              {/* Auto Metadata Extraction */}
              <div className="flex items-center justify-between p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] hover:border-[#111111] transition">
                <div className="pr-4">
                  <label className="text-xs font-bold text-[#111111] block">
                    Automatic Evidence Extraction
                  </label>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    Extract timestamps and file metadata immediately upon intake.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoExtract}
                    onChange={(e) => setAutoExtract(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E5E5E0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#121212]"></div>
                </label>
              </div>

              {/* Timeline Display Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] hover:border-[#111111] transition">
                <div>
                  <label className="text-xs font-bold text-[#111111] block">
                    Default Timeline Format
                  </label>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    Format used across synchronization charts and visual telemetry scrubbers.
                  </p>
                </div>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="h-10 px-4 text-xs bg-white border border-[#E5E5E0] rounded-full text-[#111111] font-semibold focus:outline-none focus:border-[#111111] cursor-pointer"
                >
                  <option value="dual">Dual Timestamps (Accident vs Upload)</option>
                  <option value="accident">Accident Time Only (Elapsed T+)</option>
                  <option value="system">Upload Time Only (System Intake)</option>
                </select>
              </div>

              {/* Audit Logging */}
              <div className="flex items-center justify-between p-4 rounded-[18px] bg-[#F5F8FF] border border-[#EEEEEC] hover:border-[#111111] transition">
                <div className="pr-4">
                  <label className="text-xs font-bold text-[#111111] block">
                    Forensic Immutable Audit Logging
                  </label>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    Record immutable forensic integrity trails for each file upload and AI analysis.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={auditLogging}
                    onChange={(e) => setAuditLogging(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E5E5E0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#121212]"></div>
                </label>
              </div>

            </div>

            <div className="pt-4 border-t border-[#F0F0F0] flex items-center justify-between">
              <span className="text-xs text-[#8A8A8A]">
                Preferences automatically persist to local configuration.
              </span>
              <button
                type="button"
                onClick={handleSave}
                className="h-11 px-6 bg-[#121212] hover:bg-black text-white text-xs font-bold rounded-full transition flex items-center gap-2 shadow-sm"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Preferences Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
