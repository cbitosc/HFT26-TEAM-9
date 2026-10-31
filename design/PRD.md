# Product Requirements Document (PRD)

**Project Name:** ChronoSense Forensics (Spark Forensics)  
**Hackathon Team:** Team Spark (`HFT26-TEAM-9`)  
**Track:** Computer Vision & Intelligent Systems  
**Problem Statement:** AI-Powered Timeline Reconstruction for Road Accident Forensics  
**Status:** Approved & Finalized  
**Version:** 1.0.0  

---

## 1. Executive Summary & Problem Definition

### 1.1 The Problem
Traffic accident forensic investigations are hindered by fragmented, heterogeneous, and conflicting evidence:
- **Dashcam & CCTV footage** is often incomplete, blurry, or captured from compromised angles.
- **Eyewitness testimony** is inherently subjective, prone to memory distortion, and frequently contradictory (e.g., conflicting traffic light colors or vehicle speeds).
- **Vehicle Telemetry / Sensor data** (OBD-II, CAN bus, accelerometer) is isolated in proprietary formats without visual context.
- **Time Inconsistency**: Time stamps across dashcams, 911 call logs, and witness interviews are unsynchronized, creating chronological ambiguity.

### 1.2 Our Solution
**ChronoSense Forensics** is an end-to-end, multi-source digital forensics workspace. It ingests video, audio testimony, written witness statements, and sensor telemetry. Powered by a dual-AI pipeline (**Featherless AI** for visual understanding and timeline synthesis; **Groq** for instantaneous audio transcription and contradiction reasoning), ChronoSense builds a synchronized chronological master timeline, flags discrepancies with explicit confidence metrics, clearly separates raw observations from probabilistic inferences, and presents an interactive 3D top-down visual reconstruction.

---

## 2. Core Value Propositions & Hackathon Compliance

| Hackathon Requirement | ChronoSense Implementation | PRD Feature Anchor |
|---|---|---|
| **1. Multi-source evidence ingestion** | Drag-and-drop ingest for dashcam video (`.mp4`), witness voice notes (`.mp3`/`.wav`), written statements, and telemetry CSV. | `FR-1`, `FR-5` |
| **2. Extract events, timestamps & movements** | Computer vision keyframe parsing + Whisper voice transcription + telemetry speed/acceleration parsing. | `FR-2` |
| **3. Chronological incident timeline** | Master normalized time axis ($t=0.0s$ to $t=N.Ns$) syncing all evidence streams. | `FR-3` |
| **4. Identify contradictions & evidence gaps** | Automated Contradiction & Gap Matrix with severity flags and missing-evidence detectors. | `FR-4` |
| **5. Traceability & Observation vs. Inference** | Every timeline point cites source evidence and explicit tags: `[FACT: RAW OBSERVATION]` vs. `[HYPOTHESIS: AI INFERENCE]` with confidence ratings. | `FR-4`, `FR-6` |
| **Bonus: Annotated visual reconstruction** | Interactive 3D WebGL intersection playback with multi-angle cameras and a synchronized timeline scrubber. | `FR-7` |

---

## 3. User Personas & Target Audience

### 3.1 Primary Persona: Police Forensic Investigator & Accident Reconstructionist
- **Goals**: Rapidly assemble multiple witness statements and dashcam footage into an undisputed chronological record; prepare court-admissible forensic reports.
- **Pain Points**: Spending 8+ hours manually cross-checking witness claims against time-stamped video frames.

### 3.2 Secondary Persona: Insurance Fraud & Claims Adjuster
- **Goals**: Quickly identify fraudulent or contradictory claims (e.g., driver claims they braked early, but telemetry/footage proves zero braking).

---

## 4. User Journey & Navigation Flow

The platform is designed around a 3-tier intuitive flow:

```
[ 1. Landing Page ]
        │
        ▼ (Click "Launch Forensics Studio")
[ 2. Main Case Hub / Dashboard ]
   ├── [+ Create New Incident] Card -> Modal: Upload Video, Audio, Text, CSV -> Click "Analyze"
   └── [Case Card Grid] -> Click any case (e.g. Case #101, Case #102)
        │
        ▼
[ 3. Case Workspace ] (Dedicated multi-view workspace with 3 core tabs)
   ├── Tab 1: [ Details ]
   │      - Incident Metadata & Officer Details
   │      - Automated AI Executive Summary
   │      - Contradiction & Evidence Gap Alert Banner
   │      - [ + Add Evidence ] Button (Dynamically updates timeline & contradictions)
   │
   ├── Tab 2: [ Records ]
   │      - Categorized repository of all uploaded media
   │      - Audio transcripts (Groq Whisper), Video Keyframes (Featherless), Telemetry logs
   │      - Observation vs. Inference tags with confidence percentages
   │
   └── Tab 3: [ Visual ]
          - Full-screen / viewport 3D top-down reconstruction (Three.js)
          - Vehicles moving along AI-estimated trajectory splines
          - Synchronized timeline scrubber at the bottom (00:00 to 00:10)
          - Camera switcher: Top-down Bird's Eye | Vehicle A POV | Free 3D Orbit
```

---

## 5. Functional Requirements (FR)

### FR-1: Multi-Source Evidence Ingestion
- **FR-1.1**: The system shall accept video formats (`.mp4`, `.mov`, `.avi`, webm).
- **FR-1.2**: The system shall accept audio files (`.mp3`, `.wav`, `.m4a`) or direct text inputs for witness accounts.
- **FR-1.3**: The system shall accept numerical sensor records (`.csv`, `.json`) containing timestamps, speed, brake pedal status, and acceleration.
- **FR-1.4**: The system shall provide built-in "One-Click Demo Case Presets" so users/judges can load complete scenarios without uploading large files manually.

### FR-2: Multimodal Feature & Event Extraction
- **FR-2.1**: Video keyframe extraction at dynamic motion intervals using OpenCV.
- **FR-2.2**: Visual object classification (vehicle type, color, lane, license plate, signal state) via Featherless Vision models (`Qwen2-VL` / `LLaVA-1.5`).
- **FR-2.3**: High-accuracy speech-to-text transcription for witness statements using Groq `whisper-large-v3`.
- **FR-2.4**: Sensor data parsing into normalized speed and deceleration curves.

### FR-3: Chronological Master Timeline Engine
- **FR-3.1**: The system shall align all events onto a single normalized timeline starting at $T_{0}$ (pre-incident) through $T_{\text{impact}}$ to $T_{\text{post-incident}}$.
- **FR-3.2**: Each timeline node shall record: timestamp, event description, involved entities, and source evidence IDs.

### FR-4: Contradiction & Discrepancy Matrix
- **FR-4.1**: The system shall automatically cross-reference witness statements against video and sensor ground truth.
- **FR-4.2**: Contradictions shall be classified by severity (`HIGH_CONFLICT`, `MODERATE_DISCREPANCY`, `EVIDENCE_GAP`).
  * *Example Conflict*: Witness B claims Vehicle A had green light; Dashcam Frame #120 proves traffic light was solid red.
- **FR-4.3**: Identify **Evidence Gaps** (e.g., "3.5-second blind spot between Camera 1 and Camera 2").

### FR-5: Evidence Traceability & Uncertainty Quantification
- **FR-5.1**: Every assertion shall be explicitly designated as either:
  * `RAW_OBSERVATION` (Direct sensor or vision detection, e.g. "Brake lights activated at 14:02:11.4").
  * `INFERRED_HYPOTHESIS` (Model-calculated conclusion, e.g. "Estimated vehicle speed prior to braking was ~48 km/h").
- **FR-5.2**: Explicit confidence scores ($0\% - 100\%$) attached to all inferences.
- **FR-5.3**: A mandatory forensic disclaimer: *"System outputs communicate probabilistic uncertainty and are intended for investigative support, not definitive legal adjudication."*

### FR-6: Dynamic Evidence Injection ("Add Evidence")
- **FR-6.1**: Inside the `Details` tab, users can click `Add Evidence` to submit newly discovered audio, text, or video.
- **FR-6.2**: The system shall re-evaluate the incident timeline, re-calculate contradiction scores, and update the executive summary in real time.

### FR-7: 3D Visual Reconstruction & Synchronized Scrubber
- **FR-7.1**: WebGL 3D canvas displaying an intersection with marked lanes, crosswalks, and vehicle bounding boxes/models.
- **FR-7.2**: Bottom interactive timeline scrubber allowing the investigator to drag forward/backward in time.
- **FR-7.3**: Vehicle positions, rotation angles, and brake indicators shall update smoothly in real time as the scrubber is moved.
- **FR-7.4**: Camera view toggle: Bird's-Eye (Orthographic/Top-Down), Driver POV, Free Orbit.
- **FR-7.5**: Collision impact timestamp indicator with visual uncertainty radius ring.

---

## 6. Non-Functional Requirements (NFR)

- **NFR-1 (Performance & Responsiveness)**: The 3D reconstruction must render at a consistent $\ge 45\text{ FPS}$ on standard browser hardware without dedicated gaming GPUs.
- **NFR-2 (Inference Latency)**: Groq transcription and contradiction checks must respond in $< 3\text{ seconds}$.
- **NFR-3 (Offline Fallback & Resilience)**: All pre-loaded demo cases must function seamlessly offline using cached responses if API keys or network fail during judge evaluation.
- **NFR-4 (UI Polish & Theme)**: Dark-mode modern forensic aesthetic (Slate-900 / Zinc-900 palette, Emerald for verified observations, Amber/Rose for contradictions).
- **NFR-5 (Modularity)**: Clean code separation between presentation, AI engine, and design documentation.

---

## 7. Success Criteria & Evaluation Rubric Alignment

1. **Completeness**: All 5 core requirements + bonus visual reconstruction fully operational.
2. **Speed & Polish**: Fluid navigation between Dashboard, Case Details, Records, and 3D Visual.
3. **Forensic Integrity**: Clear separation of facts vs. hypotheses, highlighting contradictory witness testimonies.
4. **Judge Appeal**: Zero friction "1-Click Demo" experience demonstrating instant AI reasoning.

