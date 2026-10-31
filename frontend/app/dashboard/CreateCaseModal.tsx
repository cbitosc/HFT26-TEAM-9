"use client";

import React, { useState } from "react";
import { X, Video, Mic, FileSpreadsheet, Sparkles, CheckCircle2 } from "lucide-react";
import { CaseItem } from "./data";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: CaseItem) => void;
}

export default function CreateCaseModal({ isOpen, onClose, onCaseCreated }: CreateCaseModalProps) {
  const [caseName, setCaseName] = useState("");
  const [address, setAddress] = useState("");
  const [officer, setOfficer] = useState("");
  const [department, setDepartment] = useState("Traffic Forensics Division");
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [audioInput, setAudioInput] = useState<string | null>(null);
  const [sensorFile, setSensorFile] = useState<string | null>(null);
  const [witnessText, setWitnessText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");

  if (!isOpen) return null;

  const handleFillDemo = () => {
    setCaseName("Grand Ave & 7th St Side-Impact Incident");
    setAddress("Junction of Grand Ave & 7th St, West District");
    setOfficer("Det. Elena Rostova");
    setDepartment("Metropolitan Police Accident Forensics");
    setVideoFile("dashcam_grand_ave_front.mp4 (1080p 60fps)");
    setAudioInput("911_call_witness_audio.wav (01:42)");
    setWitnessText("Witness states the white sedan made an abrupt turn without signaling into incoming lane.");
    setSensorFile("telemetry_speed_abs_log.csv (100Hz)");
  };

  const handleAnalyzeAndSave = () => {
    if (!caseName) return;

    setIsAnalyzing(true);
    setAnalysisStep("1/3 Extracting keyframes with Featherless Vision...");

    setTimeout(() => {
      setAnalysisStep("2/3 Transcribing & checking contradictions with Groq...");
    }, 1000);

    setTimeout(() => {
      setAnalysisStep("3/3 Generating synchronized 3D trajectory frames...");
    }, 2000);

    setTimeout(() => {
      const generatedId = `CASE-${Math.floor(104 + Math.random() * 900)}`;
      const newCase: CaseItem = {
        id: generatedId,
        name: caseName,
        date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC",
        address: address || "Urban Road Sector 4",
        officer: officer || "Det. Unassigned",
        department: department,
        status: witnessText ? "Flagged Contradiction" : "Verified Consistent",
        evidenceCounts: {
          video: videoFile ? 1 : 0,
          audio: (audioInput || witnessText) ? 1 : 0,
          sensor: sensorFile ? 1 : 0,
        },
        confidence: 89,
        description: witnessText || "Multi-source forensic collision record ingested."
      };

      setIsAnalyzing(false);
      onCaseCreated(newCase);
      onClose();
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Create Forensic Incident Case
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingest multi-source evidence (Video, Audio/Text statements, Sensor telemetry)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Demo Fill Banner */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs text-blue-900 font-medium">
                Want to test immediately? Load a pre-configured multi-source scenario.
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm shrink-0"
            >
              Fill Demo Data
            </button>
          </div>

          {/* Incident Details Inputs */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Case Information
            </label>
            <input
              type="text"
              placeholder="Case Name (e.g., Grand Ave & 7th St Side-Impact)"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Incident Location / Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
              <input
                type="text"
                placeholder="Lead Investigating Officer"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
          </div>

          {/* Evidence Intake Zones */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Multi-Source Evidence Ingestion
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Video Intake */}
              <div
                onClick={() => setVideoFile("dashcam_incident_footage_front.mp4")}
                className={`p-3.5 border rounded-xl cursor-pointer transition flex flex-col justify-between ${
                  videoFile
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-blue-400 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Video / Dashcam</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {videoFile ? videoFile : "Click to attach .mp4 / .mov"}
                </p>
                {videoFile && (
                  <span className="text-[10px] text-blue-700 font-semibold mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" /> Attached
                  </span>
                )}
              </div>

              {/* Audio Intake */}
              <div
                onClick={() => setAudioInput("witness_audio_statement_01.wav")}
                className={`p-3.5 border rounded-xl cursor-pointer transition flex flex-col justify-between ${
                  audioInput
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-blue-400 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Witness Audio</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {audioInput ? audioInput : "Click to attach .wav / .mp3"}
                </p>
                {audioInput && (
                  <span className="text-[10px] text-blue-700 font-semibold mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" /> Attached
                  </span>
                )}
              </div>

              {/* Sensor Intake */}
              <div
                onClick={() => setSensorFile("vehicle_telemetry_100hz.csv")}
                className={`p-3.5 border rounded-xl cursor-pointer transition flex flex-col justify-between ${
                  sensorFile
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-200 hover:border-blue-400 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Telemetry CSV</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {sensorFile ? sensorFile : "Click to attach .csv sensor log"}
                </p>
                {sensorFile && (
                  <span className="text-[10px] text-blue-700 font-semibold mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" /> Attached
                  </span>
                )}
              </div>
            </div>

            {/* Written Witness Statement */}
            <div className="pt-1">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Written Witness Account / Field Officer Notes:
              </label>
              <textarea
                rows={2}
                placeholder="Enter eyewitness description, officer notes, or conflicting statements..."
                value={witnessText}
                onChange={(e) => setWitnessText(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer / Analysis Action */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!caseName || isAnalyzing}
            onClick={handleAnalyzeAndSave}
            className={`px-6 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm ${
              !caseName || isAnalyzing
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{analysisStep || "Analyzing..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze & Save Incident</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

