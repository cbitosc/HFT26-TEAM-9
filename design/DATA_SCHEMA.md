# Data Schemas & Forensic Demo Datasets

**Project:** ChronoSense Forensics (Spark Forensics)  
**Design Directory:** `design/DATA_SCHEMA.md`  

---

## 1. Master JSON Data Model: Case Object

Each case record in ChronoSense adheres to the following complete JSON structure:

```json
{
  "id": "CASE-101",
  "title": "Main St & 4th Ave Intersection Collision",
  "date": "2026-10-28T14:02:11Z",
  "location": "Junction of Main St & 4th Ave, Downtown Metro",
  "investigatingOfficer": {
    "name": "Det. Marcus Vance",
    "badge": "SPD-8842",
    "department": "Traffic Accident Investigation Bureau"
  },
  "status": "CONTRADICTION_FLAGGED",
  "overallConfidence": 0.91,
  "summary": {
    "executive": "At approximately 14:02:11 UTC, Vehicle A (Red Sedan) traveling westbound entered the 4-way signalized intersection at approximately 48 km/h. Concurrently, Vehicle B (Blue SUV) traveling southbound entered the intersection against a transitional yellow/red signal at 36 km/h. Vehicle A applied hard emergency braking 0.7 seconds prior to impact. The resulting T-bone impact occurred in the northwest quadrant of the intersection. Witness statement EV-002 alleging Vehicle A ran a red light was disproven by Dashcam EV-001 ground truth footage.",
    "observations": [
      "Vehicle A front dashcam recorded active solid green signal at timestamp 14:02:09.8 (EV-001).",
      "Vehicle A telemetry recorded brake line pressure spike from 0 bar to 85 bar at 14:02:10.5 (EV-003).",
      "Impact registered at 14:02:11.4 with peak lateral acceleration of 6.8G (EV-003)."
    ],
    "inferences": [
      "Vehicle B driver reaction latency estimated at 1.4 seconds based on absence of pre-impact skid marks (Confidence: 86%).",
      "Vehicle A pre-impact velocity estimated at 48.2 km/h ± 1.5 km/h using video optical flow (Confidence: 94%)."
    ]
  },
  "evidenceCount": {
    "video": 1,
    "audio": 1,
    "sensor": 1,
    "text": 1
  },
  "records": [
    {
      "id": "EV-001",
      "caseId": "CASE-101",
      "type": "VIDEO",
      "sourceName": "Dashcam Vehicle A (BlackVue 4K)",
      "timestampRecorded": "2026-10-28T14:02:00Z",
      "fileUrl": "/sample_evidence/dashcam_vehicle_a.mp4",
      "extractedObservations": [
        {
          "timestampSec": 0.0,
          "observation": "Vehicle A cruising at steady pace in westbound lane.",
          "confidence": 0.99,
          "isGroundTruth": true
        },
        {
          "timestampSec": 1.4,
          "observation": "Traffic light clearly visible: SOLID GREEN.",
          "confidence": 0.98,
          "isGroundTruth": true
        },
        {
          "timestampSec": 2.1,
          "observation": "Vehicle B (Blue SUV) enters peripheral view from right heading South.",
          "confidence": 0.95,
          "isGroundTruth": true
        },
        {
          "timestampSec": 2.8,
          "observation": "Impact occurred at intersection center.",
          "confidence": 0.99,
          "isGroundTruth": true
        }
      ]
    },
    {
      "id": "EV-002",
      "caseId": "CASE-101",
      "type": "AUDIO",
      "sourceName": "Pedestrian Witness Audio Statement",
      "timestampRecorded": "2026-10-28T14:06:15Z",
      "fileUrl": "/sample_evidence/witness_audio_01.mp3",
      "transcriptOrExtractedText": "I was standing right outside the coffee shop at the corner. The red car was flying down Main Street. I am pretty sure the red car had a red light and just blasted through without even trying to stop.",
      "extractedObservations": [
        {
          "timestampSec": 1.5,
          "observation": "Witness claims Vehicle A (Red car) violated red light.",
          "confidence": 0.62,
          "isGroundTruth": false
        }
      ]
    },
    {
      "id": "EV-003",
      "caseId": "CASE-101",
      "type": "SENSOR",
      "sourceName": "OBD-II CAN Telemetry Log (Vehicle A)",
      "timestampRecorded": "2026-10-28T14:02:11Z",
      "fileUrl": "/sample_evidence/telemetry_vehicle_a.csv",
      "extractedObservations": [
        {
          "timestampSec": 2.1,
          "observation": "Brake pedal switch engaged; ABS activated.",
          "confidence": 1.0,
          "isGroundTruth": true
        },
        {
          "timestampSec": 2.8,
          "observation": "Speed drop from 48 km/h to 14 km/h in 0.7 seconds.",
          "confidence": 1.0,
          "isGroundTruth": true
        }
      ]
    }
  ],
  "contradictions": [
    {
      "id": "CONF-001",
      "timestampSec": 1.4,
      "severity": "HIGH",
      "topic": "Traffic Light Signal at Intersection Entry",
      "claimA": {
        "sourceId": "EV-002",
        "sourceType": "AUDIO_WITNESS",
        "statement": "Witness statement claims Vehicle A (Red) ran a red light.",
        "credibility": 0.62
      },
      "claimB": {
        "sourceId": "EV-001",
        "sourceType": "VIDEO_DASHCAM",
        "statement": "Dashcam keyframe #412 shows solid GREEN signal for westbound traffic.",
        "credibility": 0.99
      },
      "systemResolution": "Direct ground-truth video refutes witness claim. Probable witness retrospective memory bias or line-of-sight obstruction."
    }
  ],
  "timeline": [
    {
      "id": "TL-001",
      "timeSec": 0.0,
      "isoTime": "14:02:08.6",
      "title": "Approach Phase",
      "description": "Vehicle A proceeding westbound at 50 km/h; Vehicle B approaching from North at 38 km/h.",
      "category": "MOVEMENT",
      "classification": "RAW_OBSERVATION",
      "confidenceScore": 0.98,
      "evidenceReferences": ["EV-001", "EV-003"],
      "hasContradiction": false
    },
    {
      "id": "TL-002",
      "timeSec": 1.4,
      "isoTime": "14:02:10.0",
      "title": "Signal Verification",
      "description": "Vehicle A encounters intersection. Signal state: GREEN.",
      "category": "SIGNAL_CHANGE",
      "classification": "RAW_OBSERVATION",
      "confidenceScore": 0.99,
      "evidenceReferences": ["EV-001"],
      "hasContradiction": true,
      "contradictionId": "CONF-001"
    },
    {
      "id": "TL-003",
      "timeSec": 2.1,
      "isoTime": "14:02:10.7",
      "title": "Hazard Detection & Emergency Braking",
      "description": "Vehicle A detects Vehicle B in path. Emergency brake applied (-7.2 m/s²).",
      "category": "BRAKE_ACTION",
      "classification": "RAW_OBSERVATION",
      "confidenceScore": 1.0,
      "evidenceReferences": ["EV-003"],
      "hasContradiction": false
    },
    {
      "id": "TL-004",
      "timeSec": 2.8,
      "isoTime": "14:02:11.4",
      "title": "Primary Collision Impact",
      "description": "Vehicle A front bumper collides with Vehicle B passenger side.",
      "category": "IMPACT",
      "classification": "RAW_OBSERVATION",
      "confidenceScore": 0.99,
      "evidenceReferences": ["EV-001", "EV-003"],
      "hasContradiction": false
    },
    {
      "id": "TL-005",
      "timeSec": 4.5,
      "isoTime": "14:02:13.1",
      "title": "Vehicles Come to Rest",
      "description": "Both vehicles come to a complete stop in the northwest quadrant.",
      "category": "POST_COLLISION",
      "classification": "INFERRED_HYPOTHESIS",
      "confidenceScore": 0.92,
      "evidenceReferences": ["EV-001"],
      "hasContradiction": false
    }
  ]
}
```

---

## 2. 3D Trajectory Time-Series Sample (`TrajectoryFrame[]`)

Used by the Three.js 3D engine to render vehicle positions smoothly as the user scrubs the timeline slider:

```json
[
  {
    "timeSec": 0.0,
    "vehicles": {
      "carA": { "x": -45.0, "z": 0.0, "speedKmh": 50.0, "headingDeg": 90.0, "braking": false, "uncertaintyRadiusMeters": 0.3 },
      "carB": { "x": 0.0, "z": -40.0, "speedKmh": 38.0, "headingDeg": 180.0, "braking": false, "uncertaintyRadiusMeters": 0.4 }
    },
    "trafficLights": { "northSouth": "YELLOW", "eastWest": "GREEN" },
    "isImpactPoint": false
  },
  {
    "timeSec": 1.4,
    "vehicles": {
      "carA": { "x": -25.5, "z": 0.0, "speedKmh": 49.0, "headingDeg": 90.0, "braking": false, "uncertaintyRadiusMeters": 0.4 },
      "carB": { "x": 0.0, "z": -25.2, "speedKmh": 38.0, "headingDeg": 180.0, "braking": false, "uncertaintyRadiusMeters": 0.5 }
    },
    "trafficLights": { "northSouth": "RED", "eastWest": "GREEN" },
    "isImpactPoint": false
  },
  {
    "timeSec": 2.1,
    "vehicles": {
      "carA": { "x": -15.8, "z": 0.0, "speedKmh": 41.0, "headingDeg": 90.0, "braking": true, "uncertaintyRadiusMeters": 0.5 },
      "carB": { "x": 0.0, "z": -17.8, "speedKmh": 37.0, "headingDeg": 180.0, "braking": false, "uncertaintyRadiusMeters": 0.6 }
    },
    "trafficLights": { "northSouth": "RED", "eastWest": "GREEN" },
    "isImpactPoint": false
  },
  {
    "timeSec": 2.8,
    "vehicles": {
      "carA": { "x": -2.1, "z": 0.0, "speedKmh": 18.0, "headingDeg": 93.0, "braking": true, "uncertaintyRadiusMeters": 0.8 },
      "carB": { "x": 0.0, "z": -1.5, "speedKmh": 32.0, "headingDeg": 184.0, "braking": false, "uncertaintyRadiusMeters": 0.8 }
    },
    "trafficLights": { "northSouth": "RED", "eastWest": "GREEN" },
    "isImpactPoint": true
  },
  {
    "timeSec": 4.5,
    "vehicles": {
      "carA": { "x": 3.2, "z": 2.4, "speedKmh": 0.0, "headingDeg": 115.0, "braking": true, "uncertaintyRadiusMeters": 0.9 },
      "carB": { "x": 4.8, "z": 6.1, "speedKmh": 0.0, "headingDeg": 205.0, "braking": true, "uncertaintyRadiusMeters": 1.1 }
    },
    "trafficLights": { "northSouth": "RED", "eastWest": "GREEN" },
    "isImpactPoint": false
  }
]
```

