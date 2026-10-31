"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  Upload, 
  FileText, 
  Video, 
  Mic, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Code, 
  X, 
  Navigation,
  CheckCircle2
} from "lucide-react";
import { generateNextCaseNumber, createNewCase } from "@/lib/casesService";

interface UploadedFilePreview {
  name: string;
  size: string;
  type: string;
  fileUrl?: string;
}

export default function CreateNewCasePage() {
  const router = useRouter();

  const [caseName, setCaseName] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [filedBy, setFiledBy] = useState("");
  const [filedDate, setFiledDate] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [accidentDate, setAccidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [sources, setSources] = useState<UploadedFilePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [showCoordinatePicker, setShowCoordinatePicker] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);

  useEffect(() => {
    setCaseNumber(generateNextCaseNumber());
    const now = new Date();
    setFiledDate(now.toISOString().slice(0, 16));
    const accidentTime = new Date(now.getTime() - 60 * 60 * 1000);
    setAccidentDate(accidentTime.toISOString().slice(0, 16));
  }, []);

  const [uploadedRealFiles, setUploadedRealFiles] = useState<File[]>([]);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    const newFiles: UploadedFilePreview[] = [];
    const addedReal: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
      let blobUrl: string | undefined = undefined;
      if (f.type.includes("video") || /\.(mp4|mov|avi|webm)$/i.test(f.name)) {
        blobUrl = URL.createObjectURL(f);
      }
      newFiles.push({
        name: f.name,
        size: `${sizeMb} MB`,
        type: f.type || "application/octet-stream",
        fileUrl: blobUrl
      });
      addedReal.push(f);
    }
    setUploadedRealFiles((prev) => [...prev, ...addedReal]);
    setSources((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setGeoLocating(false);
        if (!address) {
          setAddress(`GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
        }
      },
      () => {
        setGeoLocating(false);
        setLatitude(17.3850);
        setLongitude(78.4867);
      }
    );
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim()) return;

    setIsSubmitting(true);
    try {
      let aiSummary: string | undefined = undefined;
      let aiScenario: string | undefined = undefined;

      // 1. Register base case in backend
      try {
        const res = await fetch("http://localhost:8000/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: caseName.trim(),
            caseNumber: caseNumber,
            location: address.trim() || "Unspecified City Sector",
            address: address.trim() || "Unspecified City Sector",
            date: accidentDate,
            accidentDate: accidentDate,
            officer: filedBy.trim(),
            filedBy: filedBy.trim(),
            witnessStatement: description.trim(),
            description: description.trim(),
            sources: sources || []
          })
        });
        if (res.ok) {
          const data = await res.json();
          aiSummary = data.summary?.executive || data.summary;
          aiScenario = data.scenario;
        }
      } catch {
        // Continue with resilient local fallback
      }

      // 2. Upload video stream if provided (runs YOLOv8 detection and stores to Supabase)
      const vidFile = uploadedRealFiles.find(f => f.type.includes("video") || /\.(mp4|mov|avi|webm)$/i.test(f.name));
      if (vidFile) {
        const formData = new FormData();
        formData.append("file", vidFile);
        try {
          const res = await fetch(`http://localhost:8000/api/cases/${caseNumber}/upload-video`, {
            method: "POST",
            body: formData
          });
          if (res.ok) {
            const data = await res.json();
            aiSummary = data.summary?.executive || data.summary;
            aiScenario = data.scenario;
          }
        } catch {
          // fallback gracefully
        }
      }

      // 3. Upload non-video evidence files (images, documents, text notes, audio, csv) to Supabase Storage
      const otherFiles = uploadedRealFiles.filter(f => !f.type.includes("video") && !/\.(mp4|mov|avi|webm)$/i.test(f.name));
      if (otherFiles.length > 0) {
        for (const f of otherFiles) {
          try {
            const formData = new FormData();
            formData.append("file", f);
            const res = await fetch(`http://localhost:8000/api/cases/${caseNumber}/upload-evidence`, {
              method: "POST",
              body: formData
            });
            if (res.ok) {
              const d = await res.json();
              if (d.summary) {
                aiSummary = d.summary?.executive || d.summary;
              }
            }
          } catch {
            // resilient fallback
          }
        }
      }

      // 4. Save and index dossier
      createNewCase({
        name: caseName.trim(),
        caseNumber: caseNumber,
        filedBy: filedBy.trim() || "Investigator",
        filedDate: filedDate,
        address: address.trim() || "Unspecified Location",
        latitude: latitude,
        longitude: longitude,
        accidentDate: accidentDate,
        description: description.trim(),
        sources: sources,
        summary: aiSummary,
        scenario: aiScenario
      });

      router.push(`/cases/${caseNumber}`);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const getSourceIcon = (fileName: string) => {
    const fn = fileName.toLowerCase();
    if (fn.endsWith(".mp4") || fn.endsWith(".mov") || fn.endsWith(".avi")) return <Video className="w-4 h-4 text-[#0A66FF]" />;
    if (fn.endsWith(".mp3") || fn.endsWith(".wav") || fn.endsWith(".m4a")) return <Mic className="w-4 h-4 text-[#0A66FF]" />;
    if (fn.endsWith(".pdf")) return <FileText className="w-4 h-4 text-[#111111]" />;
    if (fn.endsWith(".csv") || fn.endsWith(".json")) return <FileSpreadsheet className="w-4 h-4 text-[#1A7A2E]" />;
    if (fn.endsWith(".png") || fn.endsWith(".jpg") || fn.endsWith(".jpeg")) return <ImageIcon className="w-4 h-4 text-[#8A8A8A]" />;
    if (fn.endsWith(".py") || fn.endsWith(".sh") || fn.endsWith(".js")) return <Code className="w-4 h-4 text-[#111111]" />;
    return <FileText className="w-4 h-4 text-[#8A8A8A]" />;
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-[#111111] p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header & Back Button */}
        <div className="flex items-center justify-between">
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white text-[#111111] border border-[#EAEAEA] hover:bg-[#F5F8FF] transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
          </Link>

          <span className="text-xs font-mono font-bold text-[#8A8A8A]">
            {caseNumber}
          </span>
        </div>

        <form onSubmit={handleCreateCase} className="space-y-6">
          
          {/* Card 1: Case Information (24px radius, soft shadow, pure white) */}
          <div className="bg-white rounded-[24px] p-8 shadow-soft border border-[#F0F0F0] space-y-6">
            <div className="border-b border-[#F5F5F3] pb-4">
              <span className="text-[13px] font-medium text-[#8A8A8A]">
                Registration
              </span>
              <h2 className="text-xl font-extrabold text-[#111111] mt-0.5">
                Case Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Case Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outer Ring Road Intersection Incident"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  className="w-full h-11 px-4 bg-[#F5F8FF] border border-[#EAEAEA] rounded-[14px] text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Case Number
                </label>
                <input
                  type="text"
                  readOnly
                  value={caseNumber}
                  className="w-full h-11 px-4 bg-[#F5F5F3] border border-[#EAEAEA] rounded-[14px] text-xs font-mono font-bold text-[#8A8A8A] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Filed By
                </label>
                <input
                  type="text"
                  placeholder="Officer name"
                  value={filedBy}
                  onChange={(e) => setFiledBy(e.target.value)}
                  className="w-full h-11 px-4 bg-[#F5F8FF] border border-[#EAEAEA] rounded-[14px] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Filed Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={filedDate}
                  onChange={(e) => setFiledDate(e.target.value)}
                  className="w-full h-11 px-4 bg-[#F5F8FF] border border-[#EAEAEA] rounded-[14px] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Accident Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={accidentDate}
                  onChange={(e) => setAccidentDate(e.target.value)}
                  className="w-full h-11 px-4 bg-[#F5F8FF] border border-[#EAEAEA] rounded-[14px] text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition"
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#111111]">
                    Assigned Address / Location
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCoordinatePicker(!showCoordinatePicker)}
                    className="text-xs text-[#0A66FF] font-semibold hover:underline"
                  >
                    {showCoordinatePicker ? "Hide Map Coordinates" : "Add / Edit Map Coordinates"}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="w-4 h-4 text-[#8A8A8A]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter street, road junction, or landmark"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-[#F5F8FF] border border-[#EAEAEA] rounded-[14px] text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111] transition"
                  />
                </div>

                {showCoordinatePicker && (
                  <div className="p-4 bg-[#F5F8FF] rounded-[18px] border border-[#EAEAEA] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111]">GPS Coordinates</span>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={geoLocating}
                        className="text-xs px-3 py-1.5 rounded-full bg-white border border-[#EAEAEA] text-[#111111] hover:bg-[#F5F5F3] font-medium flex items-center gap-1.5 transition"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#0A66FF]" />
                        {geoLocating ? "Locating..." : "Use Current GPS"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#8A8A8A] uppercase">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 17.4401"
                          value={latitude !== undefined ? latitude : ""}
                          onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full h-9 px-3 bg-white border border-[#EAEAEA] rounded-[10px] text-xs font-mono text-[#111111] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#8A8A8A] uppercase">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 78.3489"
                          value={longitude !== undefined ? longitude : ""}
                          onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full h-9 px-3 bg-white border border-[#EAEAEA] rounded-[10px] text-xs font-mono text-[#111111] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Description & Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter initial incident description, conditions, or vehicles involved..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-[#F5F8FF] border border-[#EAEAEA] rounded-[16px] text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111] transition"
                />
              </div>

            </div>
          </div>

          {/* Card 2: Upload Sources (24px radius, soft dropzone) */}
          <div className="bg-white rounded-[24px] p-8 shadow-soft border border-[#F0F0F0] space-y-4">
            <div className="border-b border-[#F5F5F3] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[13px] font-medium text-[#8A8A8A]">Evidence Files</span>
                <h3 className="text-xl font-extrabold text-[#111111] mt-0.5">Upload Sources</h3>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#F5F5F3] text-[#111111] rounded-full">
                {sources.length} Attached
              </span>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesAdded(e.dataTransfer.files);
              }}
              onClick={() => {
                const el = document.getElementById("file-upload-input");
                if (el) el.click();
              }}
              className={`p-8 border-2 border-dashed rounded-[20px] text-center transition cursor-pointer ${
                isDragging
                  ? "border-[#0A66FF] bg-blue-50/40"
                  : "border-[#EAEAEA] hover:border-[#111111] bg-[#F5F8FF] hover:bg-white"
              }`}
            >
              <input
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />
              <Upload className="w-8 h-8 text-[#111111] mx-auto mb-2" />
              <div className="text-xs font-bold text-[#111111]">
                Drag and drop files here, or <span className="text-[#0A66FF] underline">browse</span>
              </div>
              <p className="text-[11px] text-[#8A8A8A] mt-1">
                Audio, Video, PDF, Images, Telemetry CSV, Text files
              </p>
            </div>

            {sources.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-[14px] bg-[#F5F8FF] border border-[#EAEAEA] text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      {getSourceIcon(src.name)}
                      <div className="truncate">
                        <div className="font-bold text-[#111111] truncate">{src.name}</div>
                        <span className="text-[10px] text-[#8A8A8A]">{src.size}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(idx)}
                      className="p-1.5 rounded-full hover:bg-white text-[#8A8A8A] hover:text-[#C52A2A] transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/cases"
              className="px-6 py-3 rounded-full text-xs font-semibold text-[#8A8A8A] hover:text-[#111111] transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !caseName.trim()}
              className="h-12 px-8 rounded-full bg-[#121212] hover:bg-black text-white text-xs font-bold transition shadow-sm"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Case</span>
                </div>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
