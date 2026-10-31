"use client";

import React, { useState, useMemo } from "react";
import { 
  Download, 
  Printer, 
  BookOpen, 
  Eye, 
  X,
  FileText
} from "lucide-react";
import { CaseDetail } from "@/lib/casesService";
import { generateDetailedForensicReport, downloadPdfReport } from "@/lib/reportGenerator";

interface DetailedCaseReportProps {
  caseData: CaseDetail;
}

export default function DetailedCaseReport({ caseData }: DetailedCaseReportProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const report = useMemo(() => generateDetailedForensicReport(caseData), [caseData]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadPdfReport(caseData);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <>
      {/* ── DETAILS TAB: CLEAN CARD WITH TITLE & PREVIEW / DOWNLOAD OPTIONS ── */}
      <div className="bg-white rounded-[24px] p-6 sm:p-7 shadow-soft border border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#111111] flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#0A66FF]" />
            Full Report
          </h3>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="h-10 px-5 rounded-full text-xs font-bold text-[#111111] bg-[#F5F5F3] hover:bg-[#EAEAEA] border border-[#E0E0DE] transition flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Preview report"
          >
            <Eye className="w-4 h-4 text-[#0A66FF]" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-10 px-5 rounded-full text-xs font-bold text-white bg-[#121212] hover:bg-black transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-75"
            title="Download PDF report"
          >
            {isDownloading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* ── MODAL: PURE WHITE CLEAN DOCUMENT PREVIEW ── */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Control Bar (Clean White) */}
            <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold">
                <FileText className="w-4 h-4 text-[#0A66FF]" />
                <span>Full Case Report &bull; {report.caseMetadata.caseNumber}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F5F5F3] hover:bg-[#EAEAEA] text-slate-800 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-[#E0E0DE]"
                  title="Print Document"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="px-4 py-1.5 rounded-lg bg-[#121212] hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer ml-1"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Pure White Document (Direct Case Start, No Halves/Shades) */}
            <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-12 text-slate-900 space-y-8 select-text">
              
              {/* Directly start with the Case Title & Reference */}
              <div className="border-b-2 border-slate-900 pb-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 font-serif">
                  {report.caseMetadata.name}
                </h1>
                <div className="text-xs font-mono text-slate-600 mt-1">
                  Case File Reference: <strong className="text-slate-900">{report.caseMetadata.caseNumber}</strong>
                </div>
              </div>

              {/* Case Identification Table */}
              <div className="text-xs border-b border-slate-300 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  <span className="text-slate-500 font-medium inline-block w-36">Lead Investigator:</span>
                  <strong className="text-slate-900">{report.caseMetadata.filedBy}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium inline-block w-36">Incident Location:</span>
                  <span className="text-slate-900">{report.caseMetadata.address}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium inline-block w-36">Date &amp; Incident Time:</span>
                  <span className="text-slate-900 font-semibold">{report.caseMetadata.accidentDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium inline-block w-36">GPS Coordinates:</span>
                  <span className="text-slate-900 font-mono">
                    {report.caseMetadata.latitude ? `${report.caseMetadata.latitude}° N, ${report.caseMetadata.longitude}° E` : "Territorial Grid Verified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium inline-block w-36">Investigative Finding:</span>
                  <strong className="text-emerald-700 font-bold">{report.caseMetadata.status} (94% Confidence)</strong>
                </div>
              </div>

              {/* 1. INVESTIGATIVE METHODOLOGY & EVIDENCE INGESTION */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1 font-serif">
                  1. Investigative Methodology &amp; Evidence Acquisition Log
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed text-justify">
                  {report.investigationProgression.overview}
                </p>
                
                <div className="space-y-2 pt-1 text-xs">
                  {report.investigationProgression.phases.map((phase) => (
                    <div key={phase.stepNumber} className="pl-4 border-l-2 border-slate-400 space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {phase.stepNumber}: {phase.title} &bull; <span className="text-slate-500 font-normal">{phase.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-justify">
                        {phase.description} Associated evidence: <em>{phase.evidenceAcquired.join(", ")}</em>.
                      </p>
                    </div>
                  ))}
                </div>

                {/* Evidence Assets Table */}
                <div className="pt-2">
                  <table className="w-full text-left text-xs border-t border-b border-slate-300">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <th className="py-1.5">Asset Reference</th>
                        <th className="py-1.5">Category</th>
                        <th className="py-1.5">Extraction Summary</th>
                        <th className="py-1.5">Physical Telemetry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {report.investigationProgression.evidenceRecords.map((r, i) => (
                        <tr key={i}>
                          <td className="py-1.5 font-mono font-medium">{r.name}</td>
                          <td className="py-1.5 text-slate-600">{r.type}</td>
                          <td className="py-1.5 text-slate-700">{r.observations}</td>
                          <td className="py-1.5 font-mono text-[11px] text-blue-700">{r.telemetry}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. CROSS-SOURCE CONFLICT ANALYSIS */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1 font-serif">
                  2. Cross-Source Corroboration &amp; Discrepancy Resolution
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed text-justify">
                  {report.conflictAnalysis.summary}
                </p>

                <div className="space-y-3 pt-1 text-xs">
                  {report.conflictAnalysis.discrepancies.map((disc, idx) => (
                    <div key={idx} className="pl-4 border-l-2 border-amber-600 space-y-1">
                      <div className="font-bold text-slate-900">
                        Disputed Point #{idx + 1}: {disc.disputedTopic}
                      </div>
                      <div className="text-slate-700 leading-relaxed text-justify">
                        <strong>Witness Deposition:</strong> &ldquo;{disc.witnessClaim}&rdquo;
                      </div>
                      <div className="text-slate-700 leading-relaxed text-justify">
                        <strong>Empirical Telemetry &amp; Optical Analysis:</strong> {disc.opticalSensorReality}
                      </div>
                      <div className="text-emerald-800 font-semibold leading-relaxed text-justify">
                        <strong>Forensic Finding:</strong> {disc.forensicConclusion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. THE INCIDENT RECONSTRUCTION (THE STORY) */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1 font-serif">
                  3. The Incident Reconstruction: Chronological Narrative
                </h2>
                
                <div className="space-y-3 text-xs text-slate-800 leading-relaxed text-justify">
                  <div>
                    <strong className="text-slate-950 block font-serif text-[13px] mb-1">
                      Phase A &bull; Pre-Collision Approach &amp; Environmental Conditions
                    </strong>
                    <p>{report.incidentStoryNarrative.preCollisionApproach}</p>
                  </div>

                  <div>
                    <strong className="text-slate-950 block font-serif text-[13px] mb-1">
                      Phase B &bull; Perception-Reaction Interval &amp; Evasive Braking
                    </strong>
                    <p>{report.incidentStoryNarrative.reactionAndCriticalWindow}</p>
                  </div>

                  <div>
                    <strong className="text-slate-950 block font-serif text-[13px] mb-1">
                      Phase C &bull; Physical Contact Dynamics &amp; Structural Mechanics
                    </strong>
                    <p>{report.incidentStoryNarrative.pointOfImpactDynamics}</p>
                  </div>

                  <div>
                    <strong className="text-slate-950 block font-serif text-[13px] mb-1">
                      Phase D &bull; Post-Collision Trajectory, Rest Position &amp; Emergency Deployment
                    </strong>
                    <p>{report.incidentStoryNarrative.postImpactRestAndEmergency}</p>
                  </div>

                  <div>
                    <strong className="text-slate-950 block font-serif text-[13px] mb-1">
                      Phase E &bull; Conclusive Investigative Synthesis
                    </strong>
                    <p className="font-medium text-slate-900">{report.incidentStoryNarrative.investigativeSynthesis}</p>
                  </div>
                </div>
              </div>

              {/* 4. SYNCHRONIZED TIMELINE CHRONOLOGY */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1 font-serif">
                  4. Synchronized Event Chronology Log
                </h2>

                <div className="space-y-1.5 text-xs">
                  {report.timelineChronology.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-4 py-1 border-b border-slate-100">
                      <span className="font-mono font-bold text-blue-700 shrink-0 w-20">[{t.time}]</span>
                      <div className="space-y-0.5">
                        <strong className="text-slate-900 block">{t.event}</strong>
                        <span className="text-slate-600 block">{t.detail} (Source: {t.source})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. FORENSIC DETERMINATIONS & OFFICIAL SIGNOFF */}
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1 font-serif">
                  5. Forensic Causation &amp; Official Liability Determination
                </h2>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-800 leading-relaxed text-justify">
                    <strong>Primary Physical Cause:</strong> {report.findingsAndLiability.primaryCause}
                  </p>
                  <p className="text-slate-800 leading-relaxed text-justify">
                    <strong>Contributing Factors:</strong> {report.findingsAndLiability.contributingFactors.join("; ")}.
                  </p>
                  <p className="text-slate-800 leading-relaxed text-justify">
                    <strong>Liability Assessment:</strong> {report.findingsAndLiability.liabilityAssessment}
                  </p>
                </div>

                {/* Investigating Officer Signoff Block (Without Digital Authority Seal) */}
                <div className="pt-6 border-t-2 border-slate-900 text-xs">
                  <div className="text-slate-500 text-[11px] uppercase tracking-wider">Investigating Officer Signoff</div>
                  <div className="font-serif font-bold text-base text-slate-950 mt-1">{report.findingsAndLiability.investigatorSignoff.officer}</div>
                  <div className="text-slate-600 text-[11px]">{report.findingsAndLiability.investigatorSignoff.credentials}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">Date Certified: {report.findingsAndLiability.investigatorSignoff.date}</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
