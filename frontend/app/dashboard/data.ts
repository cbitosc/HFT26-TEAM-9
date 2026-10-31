export interface CaseItem {
  id: string;
  name: string;
  date: string;
  address: string;
  officer: string;
  department: string;
  status: "Flagged Contradiction" | "Verified Consistent" | "In Review";
  evidenceCounts: {
    video: number;
    audio: number;
    sensor: number;
  };
  confidence: number;
  description?: string;
}

export const INITIAL_CASES: CaseItem[] = [
  {
    id: "CASE-101",
    name: "Main St & 4th Ave Intersection Collision",
    date: "Oct 28, 2026 - 14:02 UTC",
    address: "Junction of Main St & 4th Ave, Downtown Metro",
    officer: "Det. Marcus Vance",
    department: "Traffic Accident Investigation Bureau",
    status: "Flagged Contradiction",
    evidenceCounts: { video: 1, audio: 1, sensor: 1 },
    confidence: 91,
    description: "T-bone collision at signalized intersection. Conflicting witness testimony regarding red light vs solid green dashcam evidence."
  },
  {
    id: "CASE-102",
    name: "Highway 101 Northbound Multi-Vehicle Rear-End",
    date: "Oct 29, 2026 - 09:15 UTC",
    address: "Interstate 101, Mile Marker 42.4",
    officer: "Sgt. Sarah Jenkins",
    department: "Highway Patrol Forensic Division",
    status: "Verified Consistent",
    evidenceCounts: { video: 2, audio: 1, sensor: 2 },
    confidence: 88,
    description: "Chain reaction braking incident. OBD telemetry corroborates brake pressure drop and vehicle deceleration sequence."
  },
  {
    id: "CASE-103",
    name: "Pine & Elm Boulevard Pedestrian Impact Study",
    date: "Oct 30, 2026 - 18:40 UTC",
    address: "Crosswalk at Pine St & Elm Blvd",
    officer: "Insp. Dev Patel",
    department: "Urban Transit Safety Unit",
    status: "In Review",
    evidenceCounts: { video: 1, audio: 2, sensor: 0 },
    confidence: 76,
    description: "Low-light intersection incident. Analyzing CCTV footage and 911 audio calls regarding crosswalk signal timings."
  }
];

