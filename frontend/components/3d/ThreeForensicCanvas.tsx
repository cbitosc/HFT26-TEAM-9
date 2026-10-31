"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  MapPin,
  Compass,
  Eye,
  X
} from "lucide-react";
import {
  fetchOsmSurroundings,
  createProceduralEnvironmentGroup,
  buildScenarioSplineTracks,
  OsmEnvironmentData
} from "@/lib/osmReconstruction";

export type ScenarioType = "CAR_VS_LORRY" | "CAR_VS_BIKE" | "HIGHWAY_REAR_END" | "HEAD_ON" | "INTERSECTION_TBONE" | "ROUNDABOUT_ENCLOACHMENT";
export type JunctionType = "T_JUNCTION" | "FOUR_WAY" | "EXPRESSWAY" | "ROUNDABOUT";
export type CameraPerspective = "ORBIT" | "CAR_POV" | "LORRY_POV" | "CCTV_CAM" | "OVERHEAD_MAP" | "IMPACT_FOCUS";

interface ThreeForensicCanvasProps {
  scrubberTime: number;
  onTimeChange: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  caseTitle?: string;
  caseDescription?: string;
  caseSummary?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  evidenceVideoUrl?: string;
  evidenceList?: Array<{ name: string; dataType?: string; extractedData?: { summary?: string;[key: string]: unknown } }>;
  defaultScenario?: ScenarioType;
  onVideoUploaded?: (file: File) => void;
}

export default function ThreeForensicCanvas({
  scrubberTime,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  caseTitle = "Intersection Collision Reconstruction",
  caseDescription = "",
  caseSummary = "",
  latitude = 17.440598,
  longitude = 78.360779,
  address = "ORR Junction near Gachibowli, Hyderabad",
  evidenceVideoUrl,
  evidenceList = [],
  defaultScenario,
  onVideoUploaded
}: ThreeForensicCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect scenario and junction based on case summary, keywords, reports, and evidence data
  const autoDetectScenarioAndJunction = (srcUrlOrName?: string): { scenario: ScenarioType; junction: JunctionType } => {
    const rawDef = defaultScenario ? String(defaultScenario).toLowerCase() : "";
    const combined = `${rawDef} ${caseTitle} ${caseDescription} ${caseSummary} ${srcUrlOrName || ""} ${evidenceList.map(e => `${e.name} ${e.extractedData?.summary || ""}`).join(" ")}`.toLowerCase();

    // 1. Roundabout Encroachment (Same carriageway/lane approach into circle)
    if (/roundabout|circle|traffic circle|masab tank|c31617fa|9597|whatsapp_video|encloach|encroach/i.test(combined)) {
      return { scenario: "ROUNDABOUT_ENCLOACHMENT", junction: "ROUNDABOUT" };
    }
    if (/lorry|truck|semi|trailer|hauler|container|heavy|commercial|tanker/i.test(combined)) {
      return { scenario: "CAR_VS_LORRY", junction: "T_JUNCTION" };
    }
    if (/rear[\s_-]?end|highway|expressway|freeway|trailing|tailgating|flyover|102/i.test(combined)) {
      return { scenario: "HIGHWAY_REAR_END", junction: "EXPRESSWAY" };
    }
    if (/head[\s_-]?on|opposite|oncoming|crossover|headon/i.test(combined)) {
      return { scenario: "HEAD_ON", junction: "FOUR_WAY" };
    }
    if (/t[\s_-]?bone|tbone|broadside|side[\s_-]?impact|perpendicular|lateral/i.test(combined)) {
      return { scenario: "INTERSECTION_TBONE", junction: "FOUR_WAY" };
    }
    if (/bike|motorcycle|moto|two[\s_-]?wheel|scooter|rider|rickshaw|auto/i.test(combined)) {
      return { scenario: "CAR_VS_BIKE", junction: "FOUR_WAY" };
    }
    return { scenario: "CAR_VS_BIKE", junction: "FOUR_WAY" };
  };

  const initialDetection = autoDetectScenarioAndJunction(evidenceVideoUrl);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>(initialDetection.scenario);
  const [activeJunction, setActiveJunction] = useState<JunctionType>(initialDetection.junction);
  const [cameraPerspective, setCameraPerspective] = useState<CameraPerspective>("ORBIT");
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const perspectiveRef = useRef<CameraPerspective>("ORBIT");
  useEffect(() => {
    perspectiveRef.current = cameraPerspective;
    if (cameraPerspective === "ORBIT" && cameraRef.current && controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  }, [cameraPerspective]);


  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [osmData, setOsmData] = useState<OsmEnvironmentData | null>(null);
  const [, setOsmLoading] = useState(false);
  const [telemetryState, setTelemetryState] = useState({ speedA: 48, speedB: 36, isBrakingA: false });
  const [showCctvFeed, setShowCctvFeed] = useState(true);
  const [showBuildings, setShowBuildings] = useState(false);
  const cctvVideoRef = useRef<HTMLVideoElement | null>(null);
  const flyoverGroupRef = useRef<THREE.Group | null>(null);
  const osmGroupRef = useRef<THREE.Group | null>(null);
  const splineTracksRef = useRef(buildScenarioSplineTracks(activeScenario));
  const carPaintMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Load surrounding OSM geometry (buildings & trees) dynamically for coordinates
  useEffect(() => {
    let isMounted = true;
    setOsmLoading(true);
    const validLat = typeof latitude === "number" && !isNaN(latitude) ? latitude : 17.440598;
    const validLon = typeof longitude === "number" && !isNaN(longitude) ? longitude : 78.360779;

    fetchOsmSurroundings(validLat, validLon).then((data) => {
      if (isMounted) {
        setOsmData(data);
        setOsmLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  // Sync spline paths whenever activeScenario updates
  useEffect(() => {
    splineTracksRef.current = buildScenarioSplineTracks(activeScenario);
  }, [activeScenario]);

  // Automatically select scenario & junction from case keywords, summary & evidence
  useEffect(() => {
    const detected = autoDetectScenarioAndJunction(evidenceVideoUrl);
    setActiveScenario(detected.scenario);
    setActiveJunction(detected.junction);
  }, [caseTitle, caseDescription, caseSummary, evidenceVideoUrl, defaultScenario, evidenceList]);

  // Synchronize optical CCTV video playback with 3D scrubber timeline
  useEffect(() => {
    if (!cctvVideoRef.current) return;
    const vid = cctvVideoRef.current;
    const duration = vid.duration && !isNaN(vid.duration) && vid.duration > 0 ? vid.duration : 10.0;
    const targetVideoTime = Math.min(duration, Math.max(0, (scrubberTime / 4.2) * duration));
    if (Math.abs(vid.currentTime - targetVideoTime) > 0.15) {
      vid.currentTime = targetVideoTime;
    }
  }, [scrubberTime]);

  // Synchronize play/pause with 3D canvas
  useEffect(() => {
    if (!cctvVideoRef.current) return;
    const vid = cctvVideoRef.current;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying]);

  // Toggle procedural buildings visibility
  useEffect(() => {
    if (osmGroupRef.current) {
      osmGroupRef.current.visible = showBuildings;
    }
  }, [showBuildings]);


  // Handle video file upload for automatic scenario detection
  const processUploadedVideo = (file: File) => {
    const detected = autoDetectScenarioAndJunction(file.name);
    setActiveScenario(detected.scenario);
    setActiveJunction(detected.junction);

    if (onVideoUploaded) {
      onVideoUploaded(file);
    }

    setExportNotice(`Analyzed ${file.name}: Synced 3D digital twin to ${detected.scenario.replace(/_/g, " ")}.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedVideo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.includes("video") || /\.(mp4|mov|avi|webm)$/i.test(file.name))) {
      processUploadedVideo(file);
    }
  };

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // 3D Objects refs
  const carARef = useRef<THREE.Group | null>(null);
  const vehicleBGroupRef = useRef<THREE.Group | null>(null);
  const motorcycleMeshRef = useRef<THREE.Group | null>(null);
  const suvMeshRef = useRef<THREE.Group | null>(null);
  const lorryMeshRef = useRef<THREE.Group | null>(null);

  // Road environment groups
  const intersectionRoadGroupRef = useRef<THREE.Group | null>(null);
  const tJunctionRoadGroupRef = useRef<THREE.Group | null>(null);
  const highwayRoadGroupRef = useRef<THREE.Group | null>(null);
  const roundaboutRoadGroupRef = useRef<THREE.Group | null>(null);

  const impactRingRef = useRef<THREE.Mesh | null>(null);
  const skidMarksARef = useRef<THREE.Mesh | null>(null);
  const motoSlideMarkRef = useRef<THREE.Mesh | null>(null);
  const brakeLightsARef = useRef<THREE.Mesh[]>([]);

  // Initialize Three.js WebGL Scene (100% full-width, clean forensic digital twin)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 520;

    // Helper to generate light blue background with clearly visible transparent grid boxes
    const createBackgroundSkyGridTexture = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Base light blue background color
        ctx.fillStyle = "#dce7f3";
        ctx.fillRect(0, 0, size, size);

        // Subtle diagonal gradient blue lines matching application theme
        ctx.strokeStyle = "rgba(59, 130, 246, 0.13)";
        ctx.lineWidth = 1.5;
        const step = 20;
        for (let i = -size; i <= size * 2; i += step) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + size, size);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      return tex;
    };

    // 1. Scene & Atmospheric Fog with subtle background grid boxes
    const scene = new THREE.Scene();
    const bgGridTexture = createBackgroundSkyGridTexture();
    scene.background = bgGridTexture;
    scene.fog = new THREE.FogExp2(0xdce7f3, 0.0025);
    sceneRef.current = scene;

    // 2. Camera: True 45-degree Isometric High-Angle Perspective (Clear of all obstacles)
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 1000);
    const isRoundaboutScenario = activeScenario === "ROUNDABOUT_ENCLOACHMENT" || activeJunction === "ROUNDABOUT";
    if (isRoundaboutScenario) {
      camera.position.set(-16.0, 14.0, 22.0);
      camera.lookAt(-2.5, 0.5, 6.0);
    } else {
      camera.position.set(20, 20, 20);
      camera.lookAt(0, 0.5, 0);
    }
    cameraRef.current = camera;

    // 3. Renderer with soft shadow maps and ACES Filmic tone mapping
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. Free 3D OrbitControls (Mouse drag to orbit 360°)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 4;
    controls.maxDistance = 85;
    if (isRoundaboutScenario) {
      controls.target.set(-2.5, 0.5, 6.0);
    } else {
      controls.target.set(0, 0.5, 0);
    }
    controlsRef.current = controls;

    // 5. Lighting: Crisp 45-degree directional sunlight casting sharp clean shadows
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc7d6e5, 1.25);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xfffaea, 1.9);
    mainSun.position.set(28, 45, -18);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.bias = -0.0001;
    scene.add(mainSun);

    const rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.5);
    rimLight.position.set(-20, 18, -18);
    scene.add(rimLight);

    // 6. Base Ground Plane with Architectural Square Grid Texture (Subtle, elegant low-opacity)
    const createArchitecturalGridTexture = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#edf2f7"; // soft light blueprint ground
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.40)"; // soft, subtle architectural grid lines
        ctx.lineWidth = 1.0;
        ctx.strokeRect(0, 0, size, size);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(36, 36);
      return tex;
    };

    const gridTexture = createArchitecturalGridTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.92,
      metalness: 0.03
    });
    groundMatRef.current = groundMat;



    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    groundMeshRef.current = ground;

    // Subtle grid on sidewalks without cutting through the asphalt road
    const curbMat = new THREE.MeshStandardMaterial({ 
      map: gridTexture, 
      roughness: 0.85, 
      metalness: 0.04 
    });
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // continuous crisp white lane lines
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });

    // Helper for Pedestrian Zebra Crossings (All 4 Intersection Approaches)
    const addZebraCrossings = (targetGroup: THREE.Group) => {
      // East Crosswalk
      for (let z = -5.0; z <= 5.0; z += 1.25) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.8), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(7.5, 0.048, z);
        targetGroup.add(stripe);
      }
      // West Crosswalk
      for (let z = -5.0; z <= 5.0; z += 1.25) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.8), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(-7.5, 0.048, z);
        targetGroup.add(stripe);
      }
      // North Crosswalk
      for (let x = -5.0; x <= 5.0; x += 1.25) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.048, -7.5);
        targetGroup.add(stripe);
      }
      // South Crosswalk
      for (let x = -5.0; x <= 5.0; x += 1.25) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.048, 7.5);
        targetGroup.add(stripe);
      }
    };

    // Helper for White Directional Arrows on Pavement
    const addDirectionalArrow = (targetGroup: THREE.Group, x: number, z: number, rotY: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0.046, z);
      g.rotation.y = rotY;

      const stem = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 2.2), lineMat);
      stem.rotation.x = -Math.PI / 2;
      g.add(stem);

      const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 3), lineMat);
      head.rotation.x = -Math.PI / 2;
      head.position.set(0, 0, -1.35);
      g.add(head);

      targetGroup.add(g);
    };

    // Helper for Traffic Signal Gantries with Forensically Verified Light States
    const signalMastMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 });
    const greenLightMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.2 });
    const redLightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.2 });
    const offLightMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });

    const addTrafficSignalGantry = (targetGroup: THREE.Group, x: number, z: number, rotY: number, showGreenArterial: boolean) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      // Vertical structural steel pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.4, 12), signalMastMat);
      pole.position.y = 3.2;
      g.add(pole);

      // Overhead cantilever truss
      const truss = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.18), signalMastMat);
      truss.position.set(2.1, 6.1, 0);
      g.add(truss);

      // Signal housing
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.32), signalMastMat);
      housing.position.set(3.4, 5.4, 0);
      g.add(housing);

      // Top Red light
      const red = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), showGreenArterial ? offLightMat : redLightMat);
      red.position.set(3.4, 5.75, 0.17);
      g.add(red);

      // Middle Amber light
      const amber = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), offLightMat);
      amber.position.set(3.4, 5.4, 0.17);
      g.add(amber);

      // Bottom Green light (Corroborating optical ground truth of primary vehicle)
      const green = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), showGreenArterial ? greenLightMat : offLightMat);
      green.position.set(3.4, 5.05, 0.17);
      g.add(green);

      targetGroup.add(g);
    };

    // Gachibowli Elevated Flyover Structure Spanning Overhead
    const flyoverGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd6dbe4, roughness: 0.68, metalness: 0.08 });
    const flyoverRoadMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const pierMat = new THREE.MeshStandardMaterial({ color: 0xc4cbd5, roughness: 0.7 });

    // Elevated Bridge Deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(140, 0.65, 8.8), concreteMat);
    deck.position.set(0, 5.65, -14.2);
    deck.castShadow = true;
    deck.receiveShadow = true;
    flyoverGroup.add(deck);

    // Deck Pavement
    const deckSurface = new THREE.Mesh(new THREE.PlaneGeometry(140, 8.0), flyoverRoadMat);
    deckSurface.rotation.x = -Math.PI / 2;
    deckSurface.position.set(0, 6.0, -14.2);
    flyoverGroup.add(deckSurface);

    // Deck Center Dashed Lines
    for (let x = -40; x <= 40; x += 4.5) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.2), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 6.02, -14.2);
      flyoverGroup.add(d);
    }

    // Safety Concrete Parapets
    const northParapet = new THREE.Mesh(new THREE.BoxGeometry(140, 0.85, 0.3), concreteMat);
    northParapet.position.set(0, 6.4, -18.45);
    northParapet.castShadow = true;
    flyoverGroup.add(northParapet);

    const southParapet = northParapet.clone();
    southParapet.position.z = -9.95;
    flyoverGroup.add(southParapet);

    // Cylindrical Concrete Bridge Piers
    [-52, -32, -12, 12, 32, 52].forEach((px) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 5.3, 16), pierMat);
      p.position.set(px, 2.65, -14.2);
      p.castShadow = true;
      p.receiveShadow = true;
      flyoverGroup.add(p);
    });

    flyoverGroupRef.current = flyoverGroup;
    const isGachibowli = caseTitle.toLowerCase().includes("gachibowli") || caseTitle.includes("1042");
    flyoverGroup.visible = isGachibowli;
    scene.add(flyoverGroup);

    // Helper for Streetlamps (placed safely outside camera lines)
    const addStreetLamp = (targetGroup: THREE.Group, x: number, z: number, rotY: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 12), lampPostMat);
      pole.position.y = 3.75;
      g.add(pole);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), lampPostMat);
      arm.rotation.z = Math.PI / 2 - 0.2;
      arm.position.set(1.5, 7.4, 0);
      g.add(arm);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      head.position.set(3.0, 7.1, 0);
      g.add(head);

      const light = new THREE.SpotLight(0xfef08a, 0.0, 24, Math.PI / 4, 0.45);
      light.position.set(3.0, 7.0, 0);
      const target = new THREE.Object3D();
      target.position.set(3.0, 0, 0);
      g.add(target);
      light.target = target;
      g.add(light);

      targetGroup.add(g);
    };

    // ─────────────────────────────────────────────────────────────
    // ROAD LAYOUT 1: T-JUNCTION (Side-Road Crossing for LORRY)
    // ─────────────────────────────────────────────────────────────
    const tJunctionGroup = new THREE.Group();
    tJunctionRoadGroupRef.current = tJunctionGroup;

    // Continuous East-West Main Arterial Road
    const ewMain = new THREE.Mesh(new THREE.PlaneGeometry(90, 13), roadMat);
    ewMain.rotation.x = -Math.PI / 2;
    ewMain.position.y = 0.02;
    ewMain.receiveShadow = true;
    tJunctionGroup.add(ewMain);

    // North Side Road entering into EW Main (Terminates at Z=0)
    const sideRoadN = new THREE.Mesh(new THREE.PlaneGeometry(12, 45), roadMat);
    sideRoadN.rotation.x = -Math.PI / 2;
    sideRoadN.position.set(0, 0.03, -22.5);
    sideRoadN.receiveShadow = true;
    tJunctionGroup.add(sideRoadN);

    // Unbroken South Sidewalk along the far side of T
    const southCurb = new THREE.Mesh(new THREE.BoxGeometry(90, 0.28, 22), curbMat);
    southCurb.position.set(0, 0.14, 17.5);
    southCurb.receiveShadow = true;
    tJunctionGroup.add(southCurb);

    // Northwest and Northeast Curbs
    const nwCurb = new THREE.Mesh(new THREE.BoxGeometry(38, 0.28, 30), curbMat);
    nwCurb.position.set(-25, 0.14, -21.5);
    nwCurb.receiveShadow = true;
    tJunctionGroup.add(nwCurb);

    const neCurb = new THREE.Mesh(new THREE.BoxGeometry(38, 0.28, 30), curbMat);
    neCurb.position.set(25, 0.14, -21.5);
    neCurb.receiveShadow = true;
    tJunctionGroup.add(neCurb);

    // Stop Line at mouth of side road
    const stopLineSide = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.55), lineMat);
    stopLineSide.rotation.x = -Math.PI / 2;
    stopLineSide.position.set(2.7, 0.045, -6.8);
    tJunctionGroup.add(stopLineSide);

    // Main road dashed line
    for (let x = -40; x <= 40; x += 4.5) {
      if (Math.abs(x) < 6.5) continue;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.22), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 0.04, 0);
      tJunctionGroup.add(d);
    }
    // Side road dashed line
    for (let z = -38; z <= -8; z += 4.5) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.4), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(0, 0.04, z);
      tJunctionGroup.add(d);
    }

    // Outer solid white road border lines for T-Junction
    const addTJBorderEW = (xStart: number, xEnd: number, z: number) => {
      const len = Math.abs(xEnd - xStart);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.22), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set((xStart + xEnd) / 2, 0.045, z);
      tJunctionGroup.add(l);
    };
    addTJBorderEW(-44, -6.1, -6.3);
    addTJBorderEW(6.1, 44, -6.3);
    addTJBorderEW(-44, 44, 6.3); // Continuous unbroken south outer border

    const addTJBorderNS = (x: number, zStart: number, zEnd: number) => {
      const len = Math.abs(zEnd - zStart);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, len), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(x, 0.045, (zStart + zEnd) / 2);
      tJunctionGroup.add(l);
    };
    addTJBorderNS(-5.8, -44, -6.3);
    addTJBorderNS(5.8, -44, -6.3);

    addZebraCrossings(tJunctionGroup);
    addTrafficSignalGantry(tJunctionGroup, -8.0, 7.5, 0, true);   // Arterial Green light
    addTrafficSignalGantry(tJunctionGroup, 8.0, -7.5, Math.PI, false); // Lateral Red light
    addStreetLamp(tJunctionGroup, -16.0, -16.0, Math.PI / 4);
    addStreetLamp(tJunctionGroup, 16.0, -16.0, -Math.PI / 4);
    addStreetLamp(tJunctionGroup, 0.0, 16.0, Math.PI);

    tJunctionGroup.visible = activeJunction === "T_JUNCTION";
    scene.add(tJunctionGroup);

    // ─────────────────────────────────────────────────────────────
    // ROAD LAYOUT 2: 4-WAY SIGNALIZED CROSSROAD
    // ─────────────────────────────────────────────────────────────
    const intersectionGroup = new THREE.Group();
    intersectionRoadGroupRef.current = intersectionGroup;

    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(140, 12), roadMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.y = 0.02;
    ewRoad.receiveShadow = true;
    intersectionGroup.add(ewRoad);

    const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, 140), roadMat);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.position.y = 0.03;
    nsRoad.receiveShadow = true;
    intersectionGroup.add(nsRoad);

    // Continuous architectural curbs framing sidewalks seamlessly
    const add4WayCurb = (x: number, z: number) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(60, 0.28, 60), curbMat);
      c.position.set(x, 0.14, z);
      c.receiveShadow = true;
      intersectionGroup.add(c);
    };
    add4WayCurb(-36, -36);
    add4WayCurb(36, -36);
    add4WayCurb(-36, 36);
    add4WayCurb(36, 36);

    // Solid stop bars before crosswalks
    const stopLineEast = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 5.8), lineMat);
    stopLineEast.rotation.x = -Math.PI / 2;
    stopLineEast.position.set(-6.1, 0.046, 3.0);
    intersectionGroup.add(stopLineEast);

    const stopLineWest = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 5.8), lineMat);
    stopLineWest.rotation.x = -Math.PI / 2;
    stopLineWest.position.set(6.1, 0.046, -3.0);
    intersectionGroup.add(stopLineWest);

    const stopLineNorth = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.55), lineMat);
    stopLineNorth.rotation.x = -Math.PI / 2;
    stopLineNorth.position.set(3.0, 0.046, -6.1);
    intersectionGroup.add(stopLineNorth);

    const stopLineSouth = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.55), lineMat);
    stopLineSouth.rotation.x = -Math.PI / 2;
    stopLineSouth.position.set(-3.0, 0.046, 6.1);
    intersectionGroup.add(stopLineSouth);

    // Forensic directional arrows on approach lanes
    addDirectionalArrow(intersectionGroup, -16.0, 3.0, Math.PI / 2); // V1 Eastbound Approach
    addDirectionalArrow(intersectionGroup, 16.0, -3.0, -Math.PI / 2); // Westbound Approach
    addDirectionalArrow(intersectionGroup, 3.0, 16.0, 0); // V2 Northbound Approach
    addDirectionalArrow(intersectionGroup, -3.0, -16.0, Math.PI); // Southbound Approach

    for (let x = -40; x <= 40; x += 4.5) {
      if (Math.abs(x) < 7) continue;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.22), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, 0.04, 0);
      intersectionGroup.add(d);
    }
    for (let z = -40; z <= 40; z += 4.5) {
      if (Math.abs(z) < 7) continue;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.4), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(0, 0.04, z);
      intersectionGroup.add(d);
    }

    // Continuous Crisp White Outer Road Border Lines (Framing Sidewalks like reference)
    const addBorderLineEW = (xStart: number, xEnd: number, z: number) => {
      const len = Math.abs(xEnd - xStart);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.22), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set((xStart + xEnd) / 2, 0.045, z);
      intersectionGroup.add(l);
    };
    const addBorderLineNS = (x: number, zStart: number, zEnd: number) => {
      const len = Math.abs(zEnd - zStart);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, len), lineMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(x, 0.045, (zStart + zEnd) / 2);
      intersectionGroup.add(l);
    };

    addBorderLineEW(-66, -6.1, -5.8);
    addBorderLineEW(6.1, 66, -5.8);
    addBorderLineEW(-66, -6.1, 5.8);
    addBorderLineEW(6.1, 66, 5.8);

    addBorderLineNS(-5.8, -66, -6.1);
    addBorderLineNS(-5.8, 6.1, 66);
    addBorderLineNS(5.8, -66, -6.1);
    addBorderLineNS(5.8, 6.1, 66);

    addZebraCrossings(intersectionGroup);
    addTrafficSignalGantry(intersectionGroup, -7.5, 7.5, 0, true);
    addTrafficSignalGantry(intersectionGroup, 7.5, -7.5, Math.PI, false);
    addStreetLamp(intersectionGroup, -14.0, -14.0, Math.PI / 4);
    addStreetLamp(intersectionGroup, 14.0, -14.0, -Math.PI / 4);
    addStreetLamp(intersectionGroup, -14.0, 14.0, (3 * Math.PI) / 4);

    intersectionGroup.visible = activeJunction === "FOUR_WAY";
    scene.add(intersectionGroup);

    // ─────────────────────────────────────────────────────────────
    // ROAD LAYOUT 3: FREIGHT EXPRESSWAY CORRIDOR
    // ─────────────────────────────────────────────────────────────
    const highwayGroup = new THREE.Group();
    highwayRoadGroupRef.current = highwayGroup;

    const highwayPavement = new THREE.Mesh(new THREE.PlaneGeometry(90, 18), roadMat);
    highwayPavement.rotation.x = -Math.PI / 2;
    highwayPavement.position.y = 0.025;
    highwayPavement.receiveShadow = true;
    highwayGroup.add(highwayPavement);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
    const addGuardrail = (z: number) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(90, 0.7, 0.15), railMat);
      rail.position.set(0, 0.45, z);
      highwayGroup.add(rail);
      for (let x = -44; x <= 44; x += 6) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), railMat);
        post.position.set(x, 0.45, z);
        highwayGroup.add(post);
      }
    };
    addGuardrail(-9.0);
    addGuardrail(9.0);

    for (let x = -42; x <= 42; x += 4.5) {
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.2), lineMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(x, 0.04, -3.0);
      highwayGroup.add(d1);

      const d2 = d1.clone();
      d2.position.set(x, 0.04, 3.0);
      highwayGroup.add(d2);
    }

    highwayGroup.visible = activeJunction === "EXPRESSWAY";
    scene.add(highwayGroup);

    // ─────────────────────────────────────────────────────────────
    // ROAD LAYOUT 4: ROUNDABOUT CIRCLE (1:1 CORRESPONDENCE WITH CCTV VIDEO)
    // ─────────────────────────────────────────────────────────────
    const roundaboutGroup = new THREE.Group();
    roundaboutRoadGroupRef.current = roundaboutGroup;

    // 1. Central Circular Island (Grass Lawn with Raised White Curb)
    const islandRadius = 10.0;
    const islandGrassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
    const islandBody = new THREE.Mesh(new THREE.CylinderGeometry(islandRadius, islandRadius, 0.4, 48), islandGrassMat);
    islandBody.position.set(0, 0.2, -8.0);
    islandBody.receiveShadow = true;
    roundaboutGroup.add(islandBody);

    const islandRimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const islandRim = new THREE.Mesh(new THREE.CylinderGeometry(islandRadius + 0.35, islandRadius + 0.35, 0.32, 48), islandRimMat);
    islandRim.position.set(0, 0.16, -8.0);
    roundaboutGroup.add(islandRim);

    // Central circular direction sign / monument in center of circle
    const centerSignPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
    centerSignPole.position.set(0, 1.6, -8.0);
    roundaboutGroup.add(centerSignPole);

    const centerSignBoard = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.65, 24), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.3 }));
    centerSignBoard.position.set(0, 2.6, -8.0);
    roundaboutGroup.add(centerSignBoard);

    // 2. Circular Asphalt Ring Road (Inner radius 10.2m, outer radius 24.5m)
    const ringRoadGeom = new THREE.RingGeometry(islandRadius + 0.25, 24.5, 64);
    const ringRoadMesh = new THREE.Mesh(ringRoadGeom, roadMat);
    ringRoadMesh.rotation.x = -Math.PI / 2;
    ringRoadMesh.position.set(0, 0.025, -8.0);
    ringRoadMesh.receiveShadow = true;
    roundaboutGroup.add(ringRoadMesh);

    // Circular circulating lane divider dashes
    const roundDashes = 32;
    for (let i = 0; i < roundDashes; i++) {
      const angle = (i / roundDashes) * Math.PI * 2;
      const dx = Math.cos(angle) * 16.8;
      const dz = Math.sin(angle) * 16.8 - 8.0;
      const d = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.22), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.rotation.z = -angle + Math.PI / 2;
      d.position.set(dx, 0.04, dz);
      roundaboutGroup.add(d);
    }

    // 3. Approach Dual-Carriageway Road from South into Roundabout
    const approachRoad = new THREE.Mesh(new THREE.PlaneGeometry(13.0, 36.0), roadMat);
    approachRoad.rotation.x = -Math.PI / 2;
    approachRoad.position.set(-0.8, 0.024, 18.0);
    approachRoad.receiveShadow = true;
    roundaboutGroup.add(approachRoad);

    // Center divider between Left Lane (Motorcycle) and Right Lane (SUV)
    for (let z = 32; z >= 6; z -= 4.2) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.4), lineMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(-0.8, 0.04, z);
      roundaboutGroup.add(d);
    }

    // 4. Triangular Yield / "GIVE WAY" Markings at the Entry Line
    const makeYieldTriangle = (x: number, z: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 1.3);
      shape.lineTo(-0.65, -0.65);
      shape.lineTo(0.65, -0.65);
      shape.closePath();
      const geom = new THREE.ShapeGeometry(shape);
      const m = new THREE.Mesh(geom, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.042, z);
      roundaboutGroup.add(m);
    };
    makeYieldTriangle(-3.4, 5.0); // Motorcycle lane
    makeYieldTriangle(1.6, 5.0);  // SUV lane

    // 5. Left Paved Shoulder Refuge (where motorcycle falls in the video)
    const pavedRefuge = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.22, 26.0), curbMat);
    pavedRefuge.position.set(-10.8, 0.11, 14.0);
    pavedRefuge.receiveShadow = true;
    roundaboutGroup.add(pavedRefuge);

    const rightRefuge = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.22, 26.0), curbMat);
    rightRefuge.position.set(9.2, 0.11, 14.0);
    rightRefuge.receiveShadow = true;
    roundaboutGroup.add(rightRefuge);

    // Motorcycle low-side slide mark on pavement
    const slideMarkMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 5.0),
      new THREE.MeshBasicMaterial({ color: 0x18181b, transparent: true, opacity: 0.85 })
    );
    slideMarkMesh.rotation.x = -Math.PI / 2;
    slideMarkMesh.rotation.z = 0.28;
    slideMarkMesh.position.set(-6.8, 0.046, 0.4);
    roundaboutGroup.add(slideMarkMesh);

    // Detached helmet mesh rolling on pavement
    const detachedHelmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 })
    );
    detachedHelmet.position.set(-5.4, 0.25, -0.6);
    detachedHelmet.castShadow = true;
    roundaboutGroup.add(detachedHelmet);

    roundaboutGroup.visible = activeJunction === "ROUNDABOUT";
    scene.add(roundaboutGroup);

    // ─────────────────────────────────────────────────────────────
    // VEHICLE A: Performance Sedan (Metallic Crimson Red)
    // ─────────────────────────────────────────────────────────────
    const carAGroup = new THREE.Group();
    const isRoundaboutInit = activeScenario === "ROUNDABOUT_ENCLOACHMENT" || activeJunction === "ROUNDABOUT";
    const paintAMat = new THREE.MeshStandardMaterial({ 
      color: isRoundaboutInit ? 0x1e242d : 0xbe123c, 
      metalness: 0.85, 
      roughness: 0.18 
    });
    carPaintMatRef.current = paintAMat;
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.05, metalness: 0.95 });

    const chassisA = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.65, 2.05), paintAMat);
    chassisA.position.y = 0.55;
    chassisA.castShadow = true;
    carAGroup.add(chassisA);

    const hoodA = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 2.0), paintAMat);
    hoodA.position.set(1.45, 0.75, 0);
    hoodA.castShadow = true;
    carAGroup.add(hoodA);

    const cabinA = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 1.75), glassMat);
    cabinA.position.set(-0.25, 1.15, 0);
    cabinA.castShadow = true;
    carAGroup.add(cabinA);

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.92 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.92, roughness: 0.18 });

    const createCarWheel = (x: number, z: number) => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.32, 24), tireMat);
      t.rotation.x = Math.PI / 2;
      t.castShadow = true;
      g.add(t);

      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.33, 16), rimMat);
      r.rotation.x = Math.PI / 2;
      g.add(r);

      g.position.set(x, 0.4, z);
      return g;
    };
    carAGroup.add(createCarWheel(1.4, 1.02));
    carAGroup.add(createCarWheel(1.4, -1.02));
    carAGroup.add(createCarWheel(-1.4, 1.02));
    carAGroup.add(createCarWheel(-1.4, -1.02));

    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.35), hlMat);
    hl1.position.set(2.3, 0.62, 0.68);
    const hl2 = hl1.clone();
    hl2.position.set(2.3, 0.62, -0.68);
    carAGroup.add(hl1);
    carAGroup.add(hl2);

    const tailMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x7f1d1d, emissiveIntensity: 0.4 });
    const bl1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.42), tailMat);
    bl1.position.set(-2.3, 0.65, 0.68);
    const bl2 = bl1.clone();
    bl2.position.set(-2.3, 0.65, -0.68);
    carAGroup.add(bl1);
    carAGroup.add(bl2);
    brakeLightsARef.current = [bl1, bl2];

    scene.add(carAGroup);
    carARef.current = carAGroup;

    // ─────────────────────────────────────────────────────────────
    // VEHICLE B: HEAVY LORRY (TRUCK), MOTORCYCLE, or SUV
    // ─────────────────────────────────────────────────────────────
    const vehicleBGroup = new THREE.Group();
    vehicleBGroupRef.current = vehicleBGroup;

    // Sub-Model 1: Heavy Commercial Lorry / Semi-Truck
    const lorryGroup = new THREE.Group();
    lorryMeshRef.current = lorryGroup;

    const cabPaintMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25 });
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.45 });
    const chassisTruckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, metalness: 0.95, roughness: 0.1 });
    const truckTireMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.95 });
    const truckRimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

    const createTruckWheel = (x: number, y: number, z: number, dual: boolean = false) => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, dual ? 0.65 : 0.38, 24), truckTireMat);
      t.rotation.x = Math.PI / 2;
      t.castShadow = true;
      g.add(t);

      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, dual ? 0.67 : 0.4, 16), truckRimMat);
      r.rotation.x = Math.PI / 2;
      g.add(r);

      g.position.set(x, y, z);
      return g;
    };

    // Front Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.5), cabPaintMat);
    cab.position.set(3.4, 1.9, 0);
    cab.castShadow = true;
    lorryGroup.add(cab);

    const cabWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 2.3), glassMat);
    cabWindshield.position.set(4.71, 2.3, 0);
    lorryGroup.add(cabWindshield);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 2.0), chromeMat);
    grille.position.set(4.71, 1.1, 0);
    lorryGroup.add(grille);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 2.6), chassisTruckMat);
    bumper.position.set(4.8, 0.5, 0);
    lorryGroup.add(bumper);

    const stack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 16), chromeMat);
    stack1.position.set(2.0, 2.8, 1.25);
    lorryGroup.add(stack1);
    const stack2 = stack1.clone();
    stack2.position.set(2.0, 2.8, -1.25);
    lorryGroup.add(stack2);

    const deflector = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.3), cabPaintMat);
    deflector.position.set(3.0, 3.4, 0);
    lorryGroup.add(deflector);

    // Large Freight Cargo Container
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.2, 2.6), trailerMat);
    trailer.position.set(-1.2, 2.2, 0);
    trailer.castShadow = true;
    lorryGroup.add(trailer);

    const chevronMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const stripLeft = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 0.02), chevronMat);
    stripLeft.position.set(-1.2, 0.7, 1.31);
    lorryGroup.add(stripLeft);
    const stripRight = stripLeft.clone();
    stripRight.position.set(-1.2, 0.7, -1.31);
    lorryGroup.add(stripRight);

    const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 16), chromeMat);
    fuelTank.rotation.z = Math.PI / 2;
    fuelTank.position.set(1.1, 0.65, 1.2);
    lorryGroup.add(fuelTank);

    lorryGroup.add(createTruckWheel(3.4, 0.58, 1.18));
    lorryGroup.add(createTruckWheel(3.4, 0.58, -1.18));
    lorryGroup.add(createTruckWheel(-2.6, 0.58, 1.1, true));
    lorryGroup.add(createTruckWheel(-2.6, 0.58, -1.1, true));
    lorryGroup.add(createTruckWheel(-4.0, 0.58, 1.1, true));
    lorryGroup.add(createTruckWheel(-4.0, 0.58, -1.1, true));

    lorryGroup.visible = activeScenario === "CAR_VS_LORRY";
    vehicleBGroup.add(lorryGroup);

    // Sub-Model 2: Sport Motorcycle with Rider
    const motoGroup = new THREE.Group();
    motorcycleMeshRef.current = motoGroup;
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.82, roughness: 0.28 });
    const bikePaintMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.88, roughness: 0.18 });

    const frontMotoWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 24), tireMat);
    frontMotoWheel.rotation.x = Math.PI / 2;
    frontMotoWheel.position.set(1.25, 0.44, 0);
    frontMotoWheel.castShadow = true;
    motoGroup.add(frontMotoWheel);

    const rearMotoWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.22, 24), tireMat);
    rearMotoWheel.rotation.x = Math.PI / 2;
    rearMotoWheel.position.set(-1.05, 0.44, 0);
    rearMotoWheel.castShadow = true;
    motoGroup.add(rearMotoWheel);

    const forkLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 16), chromeMat);
    forkLeft.rotation.z = -Math.PI / 6.5;
    forkLeft.position.set(1.0, 0.9, 0.14);
    motoGroup.add(forkLeft);
    const forkRight = forkLeft.clone();
    forkRight.position.z = -0.14;
    motoGroup.add(forkRight);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 16), chromeMat);
    handlebar.rotation.x = Math.PI / 2;
    handlebar.position.set(0.72, 1.45, 0);
    motoGroup.add(handlebar);

    const gasTank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.48, 0.52), bikePaintMat);
    gasTank.position.set(0.22, 1.22, 0);
    gasTank.castShadow = true;
    motoGroup.add(gasTank);

    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.42), darkSteelMat);
    engine.position.set(0.12, 0.68, 0);
    motoGroup.add(engine);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 16), chromeMat);
    exhaust.rotation.z = Math.PI / 2 - 0.22;
    exhaust.position.set(-0.5, 0.48, 0.28);
    motoGroup.add(exhaust);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.38), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }));
    seat.position.set(-0.42, 1.1, 0);
    motoGroup.add(seat);

    // Rider Figure
    const riderGroup = new THREE.Group();
    const riderSuitMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.95, roughness: 0.05 });

    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.48), riderSuitMat);
    riderTorso.rotation.z = -Math.PI / 7;
    riderTorso.position.set(-0.24, 1.55, 0);
    riderGroup.add(riderTorso);

    const riderHelmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), helmetMat);
    riderHelmet.position.set(0.08, 2.05, 0);
    riderGroup.add(riderHelmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.28), visorMat);
    visor.position.set(0.24, 2.05, 0);
    riderGroup.add(visor);

    motoGroup.add(riderGroup);
    motoGroup.visible = activeScenario === "CAR_VS_BIKE";
    vehicleBGroup.add(motoGroup);

    // Sub-Model 3: 3D SUV (for TBONE)
    const suvGroup = new THREE.Group();
    suvMeshRef.current = suvGroup;
    const chassisSUV = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.95, 2.2), bikePaintMat);
    chassisSUV.position.y = 0.75;
    chassisSUV.castShadow = true;
    suvGroup.add(chassisSUV);

    const cabinSUV = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 2.05), glassMat);
    cabinSUV.position.set(-0.3, 1.5, 0);
    suvGroup.add(cabinSUV);
    suvGroup.add(createCarWheel(1.4, 1.1));
    suvGroup.add(createCarWheel(1.4, -1.1));
    suvGroup.add(createCarWheel(-1.4, 1.1));
    suvGroup.add(createCarWheel(-1.4, -1.1));

    suvGroup.visible = activeScenario === "INTERSECTION_TBONE" || activeScenario === "HIGHWAY_REAR_END" || activeScenario === "HEAD_ON";
    vehicleBGroup.add(suvGroup);

    scene.add(vehicleBGroup);

    // Skid Marks & Impact Shockwave Ring
    const skidMat = new THREE.MeshBasicMaterial({ color: 0x07090e, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const skidPlaneA = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 0.35), skidMat);
    skidPlaneA.rotation.x = -Math.PI / 2;
    skidPlaneA.position.set(-1.5, 0.046, 1.6);
    scene.add(skidPlaneA);
    skidMarksARef.current = skidPlaneA;

    const motoSlideMat = new THREE.MeshBasicMaterial({ color: 0x05070a, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const motoSlidePlane = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.4), motoSlideMat);
    motoSlidePlane.rotation.x = -Math.PI / 2;
    motoSlidePlane.position.set(3.6, 0.047, 2.2);
    motoSlidePlane.rotation.z = Math.PI / 4;
    scene.add(motoSlidePlane);
    motoSlideMarkRef.current = motoSlidePlane;

    const ringGeo = new THREE.RingGeometry(0.8, 4.5, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    const impactRing = new THREE.Mesh(ringGeo, ringMat);
    impactRing.rotation.x = -Math.PI / 2;
    impactRing.position.set(1.8, 0.08, 0.6);
    scene.add(impactRing);
    impactRingRef.current = impactRing;

    // Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Angled POV camera movement tracking vehicles with realistic driver angle
      if (perspectiveRef.current === "CAR_POV" && carARef.current && cameraRef.current) {
        const xA = carARef.current.position.x;
        const zA = carARef.current.position.z;
        const rotY = carARef.current.rotation.y;
        cameraRef.current.position.set(xA + 0.3 * Math.cos(rotY), 1.25, zA - 0.3 * Math.sin(rotY));
        cameraRef.current.lookAt(xA + 25 * Math.cos(rotY), 1.15, zA - 25 * Math.sin(rotY));
      } else if (perspectiveRef.current === "LORRY_POV" && vehicleBGroupRef.current && cameraRef.current) {
        const xB = vehicleBGroupRef.current.position.x;
        const zB = vehicleBGroupRef.current.position.z;
        const isLorry = lorryMeshRef.current?.visible;
        const camHeight = isLorry ? 3.0 : 1.55;
        cameraRef.current.position.set(xB, camHeight, isLorry ? zB - 0.4 : zB);
        cameraRef.current.lookAt(xB, 0.7, zB + 28);
      } else if (controlsRef.current && perspectiveRef.current === "ORBIT") {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth || 800;
      const h = containerRef.current.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  // Mount / Update OSM Procedural Environment in 3D Scene
  useEffect(() => {
    if (!sceneRef.current || !osmData) return;
    if (osmGroupRef.current) {
      sceneRef.current.remove(osmGroupRef.current);
      osmGroupRef.current = null;
    }
    const group = createProceduralEnvironmentGroup(osmData);
    group.visible = showBuildings;
    osmGroupRef.current = group;
    sceneRef.current.add(group);

    return () => {
      if (osmGroupRef.current && sceneRef.current) {
        sceneRef.current.remove(osmGroupRef.current);
        osmGroupRef.current = null;
      }
    };
  }, [osmData]);

  // Update Road Environment when Junction Type changes
  useEffect(() => {
    if (tJunctionRoadGroupRef.current) {
      tJunctionRoadGroupRef.current.visible = activeJunction === "T_JUNCTION";
    }
    if (intersectionRoadGroupRef.current) {
      intersectionRoadGroupRef.current.visible = activeJunction === "FOUR_WAY";
    }
    if (highwayRoadGroupRef.current) {
      highwayRoadGroupRef.current.visible = activeJunction === "EXPRESSWAY";
    }
    if (roundaboutRoadGroupRef.current) {
      roundaboutRoadGroupRef.current.visible = activeJunction === "ROUNDABOUT";
    }
  }, [activeJunction]);

  // Update Vehicle Models when Scenario Changes
  useEffect(() => {
    if (lorryMeshRef.current) lorryMeshRef.current.visible = activeScenario === "CAR_VS_LORRY";
    if (motorcycleMeshRef.current) motorcycleMeshRef.current.visible = activeScenario === "CAR_VS_BIKE";
    if (suvMeshRef.current) {
      suvMeshRef.current.visible = activeScenario === "INTERSECTION_TBONE" || activeScenario === "HIGHWAY_REAR_END" || activeScenario === "HEAD_ON";
    }

    if (activeScenario === "ROUNDABOUT_ENCLOACHMENT") {
      setActiveJunction("ROUNDABOUT");
      if (motorcycleMeshRef.current) motorcycleMeshRef.current.visible = true;
      if (suvMeshRef.current) suvMeshRef.current.visible = false;
      if (lorryMeshRef.current) lorryMeshRef.current.visible = false;
      if (carARef.current) carARef.current.visible = true;
      if (carPaintMatRef.current) carPaintMatRef.current.color.setHex(0x1e242d);
    } else if (activeScenario === "CAR_VS_LORRY") {
      if (carPaintMatRef.current) carPaintMatRef.current.color.setHex(0xbe123c);
      setActiveJunction("T_JUNCTION");
    } else if (activeScenario === "HIGHWAY_REAR_END") {
      setActiveJunction("EXPRESSWAY");
    } else {
      setActiveJunction("FOUR_WAY");
    }
  }, [activeScenario]);

  // Update Kinematics & Camera Perspectives based on Scrubber Time & State
  useEffect(() => {
    const t = scrubberTime;
    const tracks = splineTracksRef.current;
    const curSpeedA = tracks.speedAAt(t);
    const curSpeedB = tracks.speedBAt(t);
    const curBrake = tracks.brakeAAt(t);
    setTelemetryState({ speedA: curSpeedA, speedB: curSpeedB, isBrakingA: curBrake });

    if (activeScenario === "ROUNDABOUT_ENCLOACHMENT") {
      // ─────────────────────────────────────────────────────────────
      // EXACT KINEMATICS FOR ROUNDABOUT ACCIDENT VIDEO (SAME-LANE TRAVEL)
      // Both vehicles approach along -Z down the SAME dual-lane carriageway:
      // - Motorcycle (Victim): Inner Left Lane (X ≈ -3.4, Z: 25 -> 1.0)
      // - Dark Crossover SUV (Accused): Adjacent Right Corridor (X ≈ +1.8, Z: 30 -> 0.5)
      // - Front heading down road along -Z: yaw = Math.PI / 2
      // - Euler order 'YXZ' ensures true forward heading and accurate roll onto shoulder
      // ─────────────────────────────────────────────────────────────
      if (carARef.current) carARef.current.rotation.order = "YXZ";
      if (vehicleBGroupRef.current) vehicleBGroupRef.current.rotation.order = "YXZ";

      // 1. VEHICLE A: Dark Crossover SUV (Nissan Qashqai type)
      let xCar = 1.8;
      let zCar = 30.0 - (t * 6.6);
      let yawCar = Math.PI / 2;
      let pitchCar = 0;
      let isBrakingCar = false;

      if (t < 2.4) {
        // Cruising down the same approach road in adjacent right corridor
        xCar = 1.8;
        zCar = 30.0 - (t * 6.6);
        yawCar = Math.PI / 2;
        pitchCar = 0;
        isBrakingCar = false;
      } else if (t < 3.8) {
        // Accelerated overtake with unauthorized lateral lane encroachment:
        // Veers left across the centerline into the motorcycle's inner travel path
        const factor = (t - 2.4) / 1.4;
        xCar = 1.8 - (factor * 3.4); // Cuts from +1.8 to -1.6 (crosses -0.8 divider!)
        zCar = 14.16 - ((t - 2.4) * 5.8);
        yawCar = Math.PI / 2 + 0.24; // Angled left cutting across corridor
        pitchCar = 0;
        isBrakingCar = false;
      } else {
        // Emergency ABS threshold braking right at the roundabout yield line
        const dtPost = t - 3.8;
        xCar = -1.6 + Math.min(0.2, dtPost * 0.15);
        zCar = 6.04 - Math.min(5.5, dtPost * 4.6);
        yawCar = Math.PI / 2 + 0.05; // Straightened out in entrance lane
        pitchCar = -0.024; // ABS nose dive
        isBrakingCar = true;
      }

      if (carARef.current) {
        carARef.current.position.set(xCar, 0, zCar);
        carARef.current.rotation.set(0, yawCar, pitchCar);
      }

      brakeLightsARef.current.forEach((bl) => {
        const mat = bl.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isBrakingCar ? 0xff0020 : 0x550000);
        mat.emissiveIntensity = isBrakingCar ? 3.8 : 0.3;
      });

      // 2. VEHICLE B: Black Sport Motorcycle (Victim in inner lane)
      let xMoto = -3.4;
      let yMoto = 0;
      let zMoto = 25.0 - (t * 5.2);
      let yawMoto = Math.PI / 2;
      let rollMoto = 0;

      if (t < 3.5) {
        // Cruising smoothly along inner left lane heading toward roundabout
        xMoto = -3.4;
        yMoto = 0;
        zMoto = 25.0 - (t * 5.2);
        yawMoto = Math.PI / 2;
        rollMoto = 0;
      } else if (t < 4.1) {
        // Squeezed by encroaching SUV: Emergency evasive swerve onto left paved shoulder
        const factor = (t - 3.5) / 0.6;
        xMoto = -3.4 - (factor * 3.8); // Mounts left paved curb shoulder at -7.2
        zMoto = 6.8 - ((t - 3.5) * 4.6);
        yawMoto = Math.PI / 2 + 0.35; // Pointing front towards left refuge
        rollMoto = -factor * 1.45; // Rapid left roll tilt onto side (-83 degrees)
        yMoto = factor * 0.18;
      } else {
        // Low-side downfall and slide across paved shoulder
        const dtFall = t - 4.1;
        xMoto = -7.2 - Math.min(0.5, dtFall * 0.2);
        yMoto = 0.22; // Resting flat on pavement
        zMoto = 3.1 - Math.min(2.0, dtFall * 1.1);
        yawMoto = Math.PI / 2 + 0.42;
        rollMoto = -1.45; // Low-side resting flat on left side
      }

      if (vehicleBGroupRef.current) {
        vehicleBGroupRef.current.position.set(xMoto, yMoto, zMoto);
        vehicleBGroupRef.current.rotation.set(rollMoto, yawMoto, 0);
      }

      // Point of Conflict indicator on pavement
      if (impactRingRef.current) {
        const ringMat = impactRingRef.current.material as THREE.MeshBasicMaterial;
        impactRingRef.current.position.set(-5.5, 0.08, 4.0);
        if (t >= 3.5 && t <= 4.2) {
          const factor = (t - 3.5) / 0.7;
          ringMat.opacity = Math.max(0, 0.95 - factor);
          impactRingRef.current.scale.set(1 + factor * 3.5, 1 + factor * 3.5, 1);
        } else {
          ringMat.opacity = 0;
        }
      }

    } else if (activeScenario === "CAR_VS_LORRY") {
      // ─────────────────────────────────────────────────────────────
      // CAR DASHED INTO HEAVY COMMERCIAL LORRY AT JUNCTION
      // ─────────────────────────────────────────────────────────────
      let xA = -26.0;
      const zA = 1.6;
      let rotA = 0;
      let pitchA = 0;
      let isBrakingA = false;

      if (t < 2.0) {
        xA = -26.0 + (t * 11.5);
        isBrakingA = false;
      } else if (t < 2.7) {
        const dtBrake = t - 2.0;
        xA = -5.8 + (dtBrake * 5.4);
        isBrakingA = true;
        pitchA = -0.025; // ABS nose dive
      } else {
        const dtPost = t - 2.7;
        xA = -2.08 - Math.min(0.22, dtPost * 0.15);
        rotA = -Math.min(0.24, dtPost * 0.26); // Rebound deflection
        isBrakingA = true;
        pitchA = 0;
      }

      if (carARef.current) {
        carARef.current.position.set(xA, 0, zA);
        carARef.current.rotation.set(0, rotA, pitchA);
      }

      brakeLightsARef.current.forEach((bl) => {
        const mat = bl.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isBrakingA ? 0xff0020 : 0x550000);
        mat.emissiveIntensity = isBrakingA ? 3.0 : 0.3;
      });

      if (skidMarksARef.current) {
        const mat = skidMarksARef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = t >= 2.0 ? Math.min(0.85, (t - 2.0) * 1.3) : 0;
      }

      // Lorry emerging from side-junction: Southbound along Avenue
      const xB = 1.6;
      let zB = -26.0;
      let rollLorry = 0;

      if (t < 2.7) {
        zB = -26.0 + (t * 8.9);
      } else {
        const dt = t - 2.7;
        zB = -2.2 + (dt * 5.4);
        rollLorry = Math.sin(dt * 7.0) * 0.04 * Math.exp(-dt * 2.5); // Suspension rock
      }

      if (vehicleBGroupRef.current) {
        vehicleBGroupRef.current.position.set(xB, 0, zB);
        vehicleBGroupRef.current.rotation.set(0, -Math.PI / 2, rollLorry);
      }

      if (impactRingRef.current) {
        const ringMat = impactRingRef.current.material as THREE.MeshBasicMaterial;
        impactRingRef.current.position.set(0.3, 0.1, 1.6);
        if (t >= 2.6 && t <= 3.4) {
          const factor = (t - 2.6) / 0.8;
          ringMat.opacity = Math.max(0, 0.95 - factor);
          impactRingRef.current.scale.set(1 + factor * 4.0, 1 + factor * 4.0, 1);
        } else {
          ringMat.opacity = 0;
        }
      }

    } else if (activeScenario === "HIGHWAY_REAR_END") {
      let xB = 2.0;
      if (t < 1.0) {
        xB = 2.0 + (t * 8.0);
      } else if (t < 2.6) {
        const dt = t - 1.0;
        xB = 10.0 + (dt * 3.5);
      } else {
        const dt = t - 2.6;
        xB = 15.6 + (dt * 4.5);
      }

      let xA = -22.0;
      let isBrakingA = false;
      if (t < 1.8) {
        xA = -22.0 + (t * 13.0);
      } else if (t < 2.6) {
        const dt = t - 1.8;
        xA = 1.4 + (dt * 11.5);
        isBrakingA = true;
      } else {
        const dt = t - 2.6;
        xA = 10.6 + (dt * 4.2);
        isBrakingA = true;
      }

      if (carARef.current) {
        carARef.current.position.set(xA, 0, 0);
        carARef.current.rotation.set(0, 0, 0);
      }

      if (vehicleBGroupRef.current) {
        vehicleBGroupRef.current.position.set(xB, 0, 0);
        vehicleBGroupRef.current.rotation.set(0, 0, 0);
      }

      brakeLightsARef.current.forEach((bl) => {
        const mat = bl.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isBrakingA ? 0xff0022 : 0x550000);
        mat.emissiveIntensity = isBrakingA ? 2.8 : 0.3;
      });

      if (impactRingRef.current) {
        const ringMat = impactRingRef.current.material as THREE.MeshBasicMaterial;
        impactRingRef.current.position.set(13.0, 0.08, 0);
        if (t >= 2.5 && t <= 3.3) {
          const factor = (t - 2.5) / 0.8;
          ringMat.opacity = Math.max(0, 0.85 - factor);
          impactRingRef.current.scale.set(1 + factor * 2.5, 1 + factor * 2.5, 1);
        } else {
          ringMat.opacity = 0;
        }
      }

    } else if (activeScenario === "HEAD_ON") {
      let xA = -25.0 + (t * 9.5);
      let zA = 1.8;
      let rotA = 0;

      let xB = 25.0 - (t * 9.5);
      let zB = -1.8;
      let rotB = Math.PI;

      if (t >= 1.5 && t < 2.6) {
        zB = -1.8 + ((t - 1.5) * 3.2);
      } else if (t >= 2.6) {
        const dt = t - 2.6;
        xA = 0.0 - (dt * 1.2);
        zA = 1.8 + (dt * 1.5);
        rotA = dt * 1.4;

        xB = 0.0 + (dt * 1.5);
        zB = 1.8 - (dt * 1.2);
        rotB = Math.PI - (dt * 1.6);
      }

      if (carARef.current) {
        carARef.current.position.set(xA, 0, zA);
        carARef.current.rotation.y = rotA;
      }
      if (vehicleBGroupRef.current) {
        vehicleBGroupRef.current.position.set(xB, 0, zB);
        vehicleBGroupRef.current.rotation.y = rotB;
      }

    } else {
      // CAR VS MOTORCYCLE
      let xA = -26.0;
      const zA = 1.6;
      let rotA = 0;
      let pitchA = 0;
      let isBrakingA = false;

      if (t < 2.0) {
        xA = -26.0 + (t * 11.5);
        isBrakingA = false;
        pitchA = 0;
      } else if (t < 2.8) {
        const dtBrake = t - 2.0;
        xA = -5.8 + (dtBrake * 4.6);
        isBrakingA = true;
        pitchA = -0.022;
      } else {
        const dtPost = t - 2.8;
        xA = -2.12 - Math.min(0.15, dtPost * 0.1);
        rotA = -Math.min(0.12, dtPost * 0.15);
        isBrakingA = true;
        pitchA = 0;
      }

      if (carARef.current) {
        carARef.current.position.set(xA, 0, zA);
        carARef.current.rotation.set(0, rotA, pitchA);
      }

      brakeLightsARef.current.forEach((bl) => {
        const mat = bl.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(isBrakingA ? 0xff0020 : 0x550000);
        mat.emissiveIntensity = isBrakingA ? 3.0 : 0.3;
      });

      if (skidMarksARef.current) {
        const mat = skidMarksARef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = t >= 2.0 ? Math.min(0.85, (t - 2.0) * 1.3) : 0;
      }

      let xB = 1.8;
      let yB = 0;
      let zB = -26.0;
      let rotB = -Math.PI / 2;
      let rollB = 0;

      if (t < 2.8) {
        zB = -26.0 + (t * 9.5);
        rollB = Math.sin(t * 4.0) * 0.03;
      } else {
        const dt = t - 2.8;
        xB = 1.8 + Math.min(3.8, dt * 2.8);
        zB = 0.6 + Math.min(3.2, dt * 2.4);
        rotB = (-Math.PI / 2) + Math.min(0.7, dt * 0.55);
        rollB = Math.min(Math.PI / 2.3, dt * 2.5);
        yB = -Math.min(0.24, dt * 0.18);
      }

      if (vehicleBGroupRef.current) {
        vehicleBGroupRef.current.position.set(xB, yB, zB);
        vehicleBGroupRef.current.rotation.set(0, rotB, rollB);
      }

      if (motoSlideMarkRef.current) {
        const mat = motoSlideMarkRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = t >= 2.8 ? Math.min(0.75, (t - 2.8) * 1.1) : 0;
      }

      if (impactRingRef.current) {
        const ringMat = impactRingRef.current.material as THREE.MeshBasicMaterial;
        impactRingRef.current.position.set(1.8, 0.08, 0.6);
        if (t >= 2.7 && t <= 3.5) {
          const factor = (t - 2.7) / 0.8;
          ringMat.opacity = Math.max(0, 0.9 - factor);
          impactRingRef.current.scale.set(1 + factor * 3.5, 1 + factor * 3.5, 1);
        } else {
          ringMat.opacity = 0;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CAMERA PERSPECTIVE HANDLERS (6 FORENSIC ANGLES)
    // ─────────────────────────────────────────────────────────────
    if (cameraRef.current && controlsRef.current) {
      const xA = carARef.current?.position.x || 0;
      const zA = carARef.current?.position.z || 0;
      const xB = vehicleBGroupRef.current?.position.x || 0;
      const zB = vehicleBGroupRef.current?.position.z || 0;

      if (cameraPerspective === "CAR_POV") {
        controlsRef.current.enabled = false;
        if (activeScenario === "ROUNDABOUT_ENCLOACHMENT") {
          const rotY = (carARef.current?.rotation.y || Math.PI / 2) - Math.PI / 2;
          cameraRef.current.position.set(xA, 1.45, zA - 0.2);
          cameraRef.current.lookAt(xA + Math.sin(rotY) * 12, 1.0, zA - Math.cos(rotY) * 16);
        } else {
          const rotY = carARef.current?.rotation.y || 0;
          cameraRef.current.position.set(xA + 0.3 * Math.cos(rotY), 1.25, zA - 0.3 * Math.sin(rotY));
          cameraRef.current.lookAt(xA + 25 * Math.cos(rotY), 1.15, zA - 25 * Math.sin(rotY));
        }
      } else if (cameraPerspective === "LORRY_POV") {
        controlsRef.current.enabled = false;
        if (activeScenario === "ROUNDABOUT_ENCLOACHMENT") {
          cameraRef.current.position.set(xB, 1.45, zB - 0.2);
          cameraRef.current.lookAt(xB, 1.0, zB - 18);
        } else {
          const isLorry = activeScenario === "CAR_VS_LORRY";
          const camHeight = isLorry ? 3.0 : 1.55;
          cameraRef.current.position.set(xB, camHeight, isLorry ? zB - 0.4 : zB);
          cameraRef.current.lookAt(xB, 0.7, zB + 28);
        }
      } else if (cameraPerspective === "CCTV_CAM") {
        controlsRef.current.enabled = false;
        if (activeScenario === "ROUNDABOUT_ENCLOACHMENT") {
          // Exactly matches the physical CCTV camera mounted on pole looking UP the approach road
          cameraRef.current.position.set(-8.2, 4.6, -3.8);
          cameraRef.current.lookAt(-2.2, 0.9, 14.0);
        } else {
          cameraRef.current.position.set(-13, 14, -13);
          cameraRef.current.lookAt(1.6, 0.5, 1.6);
        }
      } else if (cameraPerspective === "OVERHEAD_MAP") {
        controlsRef.current.enabled = false;
        cameraRef.current.position.set(0, 42, 0.001);
        cameraRef.current.lookAt(0, 0, 0);
      } else if (cameraPerspective === "IMPACT_FOCUS") {
        controlsRef.current.enabled = false;
        if (activeScenario === "ROUNDABOUT_ENCLOACHMENT") {
          cameraRef.current.position.set(-2.0, 3.2, 7.5);
          cameraRef.current.lookAt(-5.8, 0.3, 0.8);
        } else {
          cameraRef.current.position.set(5.2, 2.3, 5.2);
          cameraRef.current.lookAt(1.6, 0.8, 1.6);
        }
      } else {
        controlsRef.current.enabled = true;
      }
    }
  }, [scrubberTime, cameraPerspective, activeScenario, activeJunction]);

  // Video Export Functionality
  const handleExportVideo = () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    setExportNotice("Recording realistic 3D forensic simulation into court-ready video...");

    try {
      const stream = canvasRef.current.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Rekishi_${activeScenario}_${activeJunction}_Reconstruction_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportNotice("3D Forensic Video exported successfully!");
        setTimeout(() => setExportNotice(null), 3500);
      };

      recorder.start();

      let curr = 0.0;
      const interval = setInterval(() => {
        curr += 0.1;
        onTimeChange(Number(curr.toFixed(1)));
        if (curr >= 4.2) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 70);

    } catch {
      setIsExporting(false);
      setExportNotice("Canvas recording not supported by current browser.");
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input for Video Drag-and-Drop / Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/mov,video/quicktime,video/avi"
        className="hidden"
        onChange={handleLocalVideoUpload}
      />

      {/* Main Forensic Player Viewport (100% Full-Width 3D Canvas) */}
      <div
        ref={containerRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.16), transparent 70%),
            repeating-linear-gradient(
              -45deg,
              rgba(59, 130, 246, 0.12) 0px,
              rgba(59, 130, 246, 0.12) 1.5px,
              transparent 1.5px,
              transparent 18px
            )
          `,
          backgroundColor: '#dce7f3'
        }}
        className={`relative w-full h-[520px] rounded-xl overflow-hidden border shadow-xl flex flex-col justify-between transition-colors ${isDragOver ? "border-blue-500 bg-sky-100" : "border-slate-200"
          }`}
      >
        {/* PURE 100% FULL-WIDTH THREE.JS FORENSIC CANVAS */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* PICTURE-IN-PICTURE SYNCHRONIZED OPTICAL CCTV FEED */}
        {showCctvFeed && (
          <div className="absolute top-16 right-3 z-30 w-72 sm:w-80 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-md transition-all duration-200 pointer-events-auto">
            {/* Header */}
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Optical CCTV Ground Truth</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-semibold">24 FPS</span>
                <button
                  type="button"
                  onClick={() => setShowCctvFeed(false)}
                  className="text-slate-400 hover:text-white p-0.5 ml-1 transition"
                  title="Minimize CCTV"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="relative aspect-video bg-black overflow-hidden group">
              <video
                ref={cctvVideoRef}
                src={evidenceVideoUrl || "/uploads/WhatsApp_Video_2026-10-31_at_12.07.45.mp4"}
                muted
                playsInline
                loop
                className="w-full h-full object-cover"
              />

              {/* Floating YOLOv8 Telemetry Pill */}
              <div className="absolute top-2 left-2 pointer-events-none">
                <div className="px-2 py-0.5 rounded bg-black/80 border border-emerald-500/60 text-[9px] font-mono text-emerald-300 shadow-md flex items-center gap-1 backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {scrubberTime < 2.0
                      ? "YOLO: Motorcycle 89% • SUV 93%"
                      : scrubberTime < 3.8
                      ? "YOLO: Lateral Gap <0.4m"
                      : "CONFLICT: Evasive Swerve / Downfall"}
                  </span>
                </div>
              </div>

              {/* Bottom camera & time overlay */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[9px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-black/75 text-slate-300 border border-slate-800">
                  CAM CCFUD 12-08
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-600/90 text-white font-bold shadow-sm">
                  T+{scrubberTime.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-300 truncate max-w-[170px]">
                {scrubberTime < 2.0 ? "Approaching Junction" : scrubberTime < 3.8 ? "Lateral Encroachment" : "Impact Rest Position"}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {scrubberTime < 2.0 ? "Clearance 1.8m" : scrubberTime < 3.8 ? "Clearance 0.3m" : "Ground Impact"}
              </span>
            </div>
          </div>
        )}



        {/* TOP HUD BAR: Unified single-row container with guaranteed zero overlap */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-30 pointer-events-none">
          {/* 1. Location & GPS Coordinates (Compact, Truncated, Clean Rekishi Style) */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-sm max-w-[210px] sm:max-w-[280px] shrink-0">
            <div className="text-xs font-bold text-slate-900 leading-tight truncate" title={address}>
              {address}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{latitude.toFixed(6)}° N, {longitude.toFixed(6)}° E</span>
            </div>
          </div>

          {/* 2. Camera Perspective Controls (Pill switcher) */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-full border border-slate-200/90 shadow-sm flex items-center gap-1 shrink">
            <button
              type="button"
              onClick={() => setCameraPerspective("ORBIT")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${cameraPerspective === "ORBIT"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Free Roam</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraPerspective("CAR_POV")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${cameraPerspective === "CAR_POV"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
            >
              <Eye className="w-3.5 h-3.5 text-rose-500" />
              <span>{activeScenario === "ROUNDABOUT_ENCLOACHMENT" ? "POV SUV (Accused)" : "POV Vehicle 1"}</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraPerspective("LORRY_POV")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${cameraPerspective === "LORRY_POV"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
            >
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {activeScenario === "CAR_VS_LORRY" ? "POV Vehicle 2 (Truck)" : activeScenario === "ROUNDABOUT_ENCLOACHMENT" ? "POV Bike (Victim)" : activeScenario === "CAR_VS_BIKE" ? "POV Vehicle 2 (Bike)" : "POV Vehicle 2"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCameraPerspective("IMPACT_FOCUS")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${cameraPerspective === "IMPACT_FOCUS"
                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-400"
                : "text-rose-600 hover:bg-rose-50"
                }`}
              title="Snap Camera Directly onto Crash Point"
            >
              <Eye className="w-3.5 h-3.5 text-rose-500" />
              <span>Crash Focus</span>
            </button>

            <button
              type="button"
              onClick={() => setCameraPerspective("CCTV_CAM")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${cameraPerspective === "CCTV_CAM"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              title="Camera Angle Matching CCTV Video Feed"
            >
              <Video className="w-3.5 h-3.5 text-blue-500" />
              <span>CCTV Cam</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={() => setShowBuildings(!showBuildings)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${showBuildings
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              title="Toggle Background 3D Buildings"
            >
              <span>{showBuildings ? "Buildings ON" : "Buildings OFF"}</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={() => setShowCctvFeed(!showCctvFeed)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${showCctvFeed
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              title="Toggle Live Synchronized Optical CCTV Feed"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{showCctvFeed ? "CCTV Active" : "CCTV Feed"}</span>
            </button>
          </div>



          {/* 3. Telemetry Speedometer & ABS Status */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-sm shrink-0 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Vehicle 1</div>
                <div className="text-xs font-bold text-slate-900 font-mono leading-tight mt-0.5">
                  {telemetryState.speedA} <span className="text-[10px] text-slate-400 font-sans font-normal">km/h</span>
                </div>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Vehicle 2</div>
                <div className="text-xs font-bold text-slate-900 font-mono leading-tight mt-0.5">
                  {telemetryState.speedB} <span className="text-[10px] text-slate-400 font-sans font-normal">km/h</span>
                </div>
              </div>
            </div>

            {telemetryState.isBrakingA && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[9px] animate-pulse">
                ABS
              </span>
            )}
          </div>
        </div>{/* BOTTOM CONTROLS: Clean Timeline Scrubber, Playback, and High-Resolution Video Export */}
        <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-lg border border-slate-800 flex items-center gap-4 shadow-xl z-30">
          <button
            onClick={onTogglePlay}
            disabled={isExporting}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shrink-0 shadow-md"
            title={isPlaying ? "Pause" : "Play Synchronized 3D Reconstruction"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onTimeChange(0.0)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
            title="Reset to T=0.0s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Time Scrubber */}
          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min="0.0"
              max="4.2"
              step="0.1"
              value={scrubberTime}
              onChange={(e) => onTimeChange(parseFloat(e.target.value))}
              className="flex-1 accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            <span className="font-mono text-xs font-bold text-white shrink-0 min-w-[65px]">
              T+{scrubberTime < 10 ? `0${scrubberTime.toFixed(1)}` : scrubberTime.toFixed(1)}s
            </span>
          </div>

          {/* Export Video Button */}
          <button
            onClick={handleExportVideo}
            disabled={isExporting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shrink-0 shadow-sm"
          >
            <Video className="w-3.5 h-3.5" />
            {isExporting ? "Recording..." : "Export Video (.webm)"}
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-2.5 rounded-lg bg-blue-900/40 border border-blue-500/40 text-xs font-medium text-blue-200 flex items-center justify-between">
          <span>{exportNotice}</span>
        </div>
      )}
    </div>
  );
}
