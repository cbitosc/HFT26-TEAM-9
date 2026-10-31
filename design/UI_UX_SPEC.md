# UI/UX Specification & Wireframe Blueprint

**Project:** ChronoSense Forensics (Spark Forensics)  
**Design Directory:** `design/UI_UX_SPEC.md`  

---

## 1. Visual Identity & Design System

### 1.1 Color Palette ("Forensic Darkroom" Theme)
The application adopts an authoritative, high-contrast digital forensics aesthetic:

| Role | Color Name | Hex Code | Tailwind Equivalent | Usage |
|---|---|---|---|---|
| **Background Dark** | Carbon Black | `#090D16` | `bg-slate-950` | Primary app background |
| **Surface / Card** | Forensic Slate | `#121826` | `bg-slate-900/90` | Cards, panels, sidebars, modals |
| **Borders** | Subtle Zinc | `#1E293B` | `border-slate-800` | Grid dividers, card outlines |
| **Primary Accent** | Electric Cyan | `#06B6D4` | `text-cyan-400`, `bg-cyan-500` | Active tabs, timeline progress, primary CTAs |
| **Verified Fact** | Evidence Emerald | `#10B981` | `text-emerald-400`, `bg-emerald-500/10` | "RAW_OBSERVATION", high confidence (>=90%) |
| **Contradiction** | Alert Rose | `#F43F5E` | `text-rose-400`, `bg-rose-500/10` | Conflicting testimony, red lights, impact points |
| **Inference / Warn** | Hypothesis Amber| `#F59E0B` | `text-amber-400`, `bg-amber-500/10` | "INFERRED_HYPOTHESIS", moderate confidence (<80%) |

### 1.2 Typography
- **Headings**: `Inter` / `Plus Jakarta Sans`, Semibold / Bold
- **Body & Data**: `Inter` regular / medium
- **Timestamps & Coordinates**: `JetBrains Mono` or standard monospace (`font-mono`) for precision telemetry and timestamps.

---

## 2. Page 1: Landing Page (`/`)

### Wireframe Layout:
```
┌────────────────────────────────────────────────────────────────────────┐
│  [LOGO] ChronoSense                                 [GitHub] [Docs]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                      AI-POWERED ACCIDENT FORENSICS                     │
│               Reconstruct Truth from Fragmented Chaos.                │
│                                                                        │
│   Ingest video, witness audio, and telemetry. Automatically resolve    │
│   contradictions, track vehicle trajectories, and produce court-ready  │
│   chronological reconstructions.                                       │
│                                                                        │
│       [ Launch Forensics Studio -> ]    [ Explore Sample Case ]        │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Multi-Source     │  │ Contradiction    │  │ 3D Trajectory    │      │
│  │ Evidence Ingest  │  │ Matrix Engine    │  │ Reconstruction   │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Page 2: Main Dashboard / Case Hub (`/dashboard`)

### Wireframe Layout:
```
┌────────────────────────────────────────────────────────────────────────┐
│ [LOGO] ChronoSense Forensics      [🔍 Search case, officer, location]  │
│                                            [⚡ Filter: All | Flagged]  │
├────────────────────────────────────────────────────────────────────────┤
│ INCIDENT CASES (Active Investigations)                                 │
│                                                                        │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │  + CREATE CASE       │  │ CASE #101            │  │ CASE #102      │ │
│ │                      │  │ Main St & 4th Ave    │  │ Highway 101    │ │
│ │  [Drop evidence here │  │ ⚠️ 1 Contradiction   │  │ Rear-End       │ │
│ │   Video / Audio /    │  │ Conf: 91%            │  │ Conf: 84%      │ │
│ │   Sensor CSV]        │  │ 4 Records Ingested   │  │ 3 Records      │ │
│ │                      │  │                      │  │                │ │
│ │  [ + Start Intake ]  │  │ [ Open Workspace -> ]│  │ [ Open -> ]    │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### "+ Create Case" Modal Workflow:
1. **Modal Header**: `Initiate Forensic Incident Case`
2. **Metadata Inputs**: Case Title, Date/Time, Location, Investigating Officer Name.
3. **Upload Zones**:
   - 📹 Dashcam/CCTV Video (`.mp4`, `.mov`)
   - 🎙️ Witness Audio Statement (`.mp3`, `.wav`) or Text Input box
   - 📊 Vehicle Telemetry / Sensor CSV (`.csv`)
4. **Quick Demo Button**: `⚡ Load Pre-packaged Hackathon Sample` (Fills all inputs instantly).
5. **Action**: `[ Run Multi-Source Analysis ]` -> Shows animated progress spinner ("Analyzing video keyframes with Featherless...", "Transcribing witness statements with Groq...", "Synthesizing trajectory coordinates...") -> Redirects directly to the new case workspace!

---

## 4. Page 3: Case Workspace (`/cases/[id]`)

The Case Workspace features a **Persistent Left Sidebar** and an **Active Content Panel**:

```
┌─────────────────┬──────────────────────────────────────────────────────┐
│ [← Back to Hub] │ [Active Tab Content Area]                            │
│                 │                                                      │
│ CASE #101       │                                                      │
│ High-Impact     │                                                      │
│ Junction Crash  │                                                      │
│ ────────────────│                                                      │
│ [📄 Details]    │                                                      │
│ [📁 Records]    │                                                      │
│ [🎥 Visual 3D]  │                                                      │
│ ────────────────│                                                      │
│ Status: Active  │                                                      │
│ Conf: 91%       │                                                      │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

### 4.1 Tab 1: `Details` View

```
┌────────────────────────────────────────────────────────────────────────┐
│ CASE #101: Main St & 4th Ave Intersection Collision                    │
│ Officer: Det. Marcus Vance | Date: Oct 28, 2026 14:02:11               │
│                                             [ ➕ ADD NEW EVIDENCE ]   │
├────────────────────────────────────────────────────────────────────────┤
│ 🚨 CONTRADICTION & GAP ALERTS                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Conflict Detected: Traffic Light Signal State                   │ │
│ │   • Witness A (Audio EV-002): "Vehicle A sped through a red light." │ │
│ │   • Dashcam Frame #412 (EV-001): Traffic light was solid GREEN.     │ │
│ │   • AI Resolution: Video ground truth disproves witness claim.     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 📋 EXECUTIVE FORENSIC SUMMARY                                          │
│ At 14:02:11.45, Vehicle A (Red Sedan) traveling westbound entered the   │
│ intersection on an illuminated green signal at 48 km/h. Vehicle B       │
│ (Blue SUV) traveling northbound failed to yield during signal change,  │
│ resulting in an offset lateral impact.                                 │
├────────────────────────────────────────────────────────────────────────┤
│ 🔬 FACT vs. INFERENCE AUDIT LOG                                        │
│ • [FACT: VIDEO] Vehicle A brake lights activated 0.8s prior to impact. │
│ • [INFERENCE: 86%] Driver reaction latency calculated at 1.1s.         │
│ • [FACT: SENSOR] Impact deceleration spike measured at 6.8G.          │
└────────────────────────────────────────────────────────────────────────┘
```

> **Dynamic "Add Evidence" Action**:
> Clicking `[ ➕ ADD NEW EVIDENCE ]` opens a dropzone to submit supplemental witness accounts or phone logs. Upon submission, the Contradiction Box, Summary, and Timeline immediately re-render to reflect the updated case intelligence.

---

### 4.2 Tab 2: `Records` View

A forensic media catalogue listing all inputs with extraction metadata:

```
┌────────────────────────────────────────────────────────────────────────┐
│ INGESTED EVIDENCE RECORDS (4 Files)                                    │
├────────────────────────────────────────────────────────────────────────┤
│ [📹 VIDEO] Dashcam Vehicle A (BlackVue 4K)                             │
│   • Recorded: 14:02:00 - 14:02:20 | Source: Front Windshield           │
│   • Featherless VLM Extraction: 2 Vehicles tracked, Impact at T=2.8s   │
│   • Ground Truth Confidence: 99%                                       │
│                                                                        │
│ [🎙️ AUDIO] Witness Statement (Pedestrian at Corner)                   │
│   • Recorded: 14:05:30 (Post-Crash) | Format: Voice Memo               │
│   • Groq Whisper Transcript: "I heard the screech and saw the blue SUV│
│     try to cross..."                                                   │
│   • Credibility Rating: 68% (Partial visual obstruction noted)         │
│                                                                        │
│ [📊 SENSOR] OBD-II Telemetry Log (Vehicle A)                          │
│   • Ingest: 100Hz Speed & Braking CSV                                  │
│   • Initial Speed: 52 km/h | Deceleration at impact: -14.2 m/s²        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Tab 3: `Visual` View (3D Reconstruction Screen)

The premier bonus deliverable:

```
┌────────────────────────────────────────────────────────────────────────┐
│  CAMERA: [ 👁️ Bird's-Eye (Forensic) ]  [ 🚗 Driver POV ]  [ 🌐 Orbit ] │
│  SPEED: 1.0x | IMPACT TIME: 00:02.80 | STATUS: Collision Detected      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                        3D WEBGL VIEWPORT                               │
│                                                                        │
│                   Vehicle B [Blue SUV]                                 │
│                          │                                             │
│                          ▼  (Heading South)                            │
│                  ─────────┼──────────                                  │
│  Vehicle A ──▶ [COLLISION POINT 💥]                                    │
│  [Red Sedan]     ─────────┼──────────                                  │
│                           │                                            │
│                 Uncertainty Radius (±0.8m)                             │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  SYNCHRONIZED TIMELINE SCRUBBER                                        │
│  [ ▶ Play ] [ ⏪ ] [ ⏩ ]   00:00.00 ──────────●────────── 00:08.00    │
│                                      ▲                                 │
│                           [ 💥 Impact at 02.8s ]                       │
│  Events at 00:02.80:                                                   │
│  • Vehicle A speed: 28 km/h | Vehicle B speed: 32 km/h                 │
│  • Lateral collision registered | ⚠️ Witness A statement contradiction │
└────────────────────────────────────────────────────────────────────────┘
```

