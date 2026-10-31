import osmGachibowliSnapshot from "./osmGachibowliSnapshot.json";
import * as THREE from "three";

export interface BuildingFootprint {
  id: string;
  points: Array<{ x: number; z: number }>;
  height: number;
  color?: number;
}

export interface TreeFeature {
  id: string;
  x: number;
  z: number;
  scale: number;
}

export interface OsmEnvironmentData {
  centerLat: number;
  centerLon: number;
  source: "OVERPASS_LIVE" | "OPENSTREETMAP_RECONSTRUCTION" | "PROCEDURAL_SYNTHESIS";
  buildingsCount: number;
  treesCount: number;
  buildings: BuildingFootprint[];
  trees: TreeFeature[];
}

/**
 * Projects GPS lat/lon to local Cartesian meters centered at (centerLat, centerLon)
 */
export function gpsToLocalMeters(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number
): { x: number; z: number } {
  const latRad = (centerLat * Math.PI) / 180;
  // 1 degree latitude ~= 110,540 meters
  // 1 degree longitude ~= 111,320 * cos(latitude) meters
  const x = (lon - centerLon) * (111320 * Math.cos(latRad));
  const z = -(lat - centerLat) * 110540;
  return { x, z };
}

/**
 * Generates deterministic fallback procedural surroundings if Overpass API is unavailable
 */
export function generateProceduralOsmData(centerLat: number, centerLon: number): OsmEnvironmentData {
  const buildings: BuildingFootprint[] = [];
  const trees: TreeFeature[] = [];

  // Corner Blocks surrounding intersection (North-West, North-East, South-West, South-East)
  // Push buildings far back (>36m) to prevent EVER obstructing roadway, vehicles, or collision zone
  const blocks = [
    { xMin: -75, xMax: -38, zMin: -75, zMax: -38 }, // NW (distant)
    { xMin: 38, xMax: 75, zMin: -75, zMax: -38 },  // NE (distant)
    { xMin: -75, xMax: -38, zMin: 38, zMax: 75 },  // SW (distant)
    { xMin: 38, xMax: 75, zMin: 38, zMax: 75 },   // SE (distant)
  ];

  const colors = [0xdcd6cb, 0xd5cfc3, 0xded9cd, 0xdfdacf];

  blocks.forEach((block, bIdx) => {
    // 2-3 buildings per quadrant block
    const width = (block.xMax - block.xMin) * 0.42;
    const depth = (block.zMax - block.zMin) * 0.42;

    const b1Points = [
      { x: block.xMin, z: block.zMin },
      { x: block.xMin + width, z: block.zMin },
      { x: block.xMin + width, z: block.zMin + depth },
      { x: block.xMin, z: block.zMin + depth },
    ];
    buildings.push({
      id: `proc-bld-${bIdx}-1`,
      points: b1Points,
      height: 9 + ((bIdx * 3 + 2) % 11),
      color: colors[bIdx % colors.length]
    });

    const b2Points = [
      { x: block.xMin + width + 4, z: block.zMin + 2 },
      { x: block.xMax, z: block.zMin + 2 },
      { x: block.xMax, z: block.zMax - 4 },
      { x: block.xMin + width + 4, z: block.zMax - 4 },
    ];
    buildings.push({
      id: `proc-bld-${bIdx}-2`,
      points: b2Points,
      height: 7 + ((bIdx * 4 + 5) % 9),
      color: colors[(bIdx + 1) % colors.length]
    });
  });

  // Trees lining the roadway curbs and corner sidewalks
  const treeOffsets = [
    // Westbound sidewalk row
    { x: -35, z: -11 }, { x: -25, z: -11 }, { x: -16, z: -11 },
    { x: -35, z: 11 }, { x: -25, z: 11 }, { x: -16, z: 11 },
    // Eastbound sidewalk row
    { x: 16, z: -11 }, { x: 26, z: -11 }, { x: 36, z: -11 },
    { x: 16, z: 11 }, { x: 26, z: 11 }, { x: 36, z: 11 },
    // North/South avenue sidewalks
    { x: -11, z: -35 }, { x: -11, z: -25 }, { x: -11, z: -16 },
    { x: 11, z: -35 }, { x: 11, z: -25 }, { x: 11, z: -16 },
    { x: -11, z: 16 }, { x: -11, z: 26 }, { x: -11, z: 36 },
    { x: 11, z: 16 }, { x: 11, z: 26 }, { x: 11, z: 36 },
  ];

  treeOffsets.forEach((pos, idx) => {
    trees.push({
      id: `proc-tree-${idx}`,
      x: pos.x,
      z: pos.z,
      scale: 0.85 + ((idx % 4) * 0.12)
    });
  });

  return {
    centerLat,
    centerLon,
    source: "PROCEDURAL_SYNTHESIS",
    buildingsCount: buildings.length,
    treesCount: trees.length,
    buildings,
    trees
  };
}

/**
 * Queries OSM Overpass API for building footprints and tree vectors, with reliable fallback
 */
export async function fetchOsmSurroundings(
  centerLat: number,
  centerLon: number
): Promise<OsmEnvironmentData> {
  // Directly load real OpenStreetMap geometry for Gachibowli ORR junction corridor
  const isGachibowli = Math.abs(centerLat - 17.440598) < 0.08 && Math.abs(centerLon - 78.360779) < 0.08;
  if (isGachibowli && osmGachibowliSnapshot) {
    return {
      ...(osmGachibowliSnapshot as unknown as OsmEnvironmentData),
      centerLat,
      centerLon,
      source: "OPENSTREETMAP_RECONSTRUCTION"
    };
  }
  const delta = 0.0012; // ~130 meter radius bounding box
  const bbox = `${centerLat - delta},${centerLon - delta},${centerLat + delta},${centerLon + delta}`;
  const overpassQuery = `[out:json][timeout:4];(way["building"](${bbox});node["natural"="tree"](${bbox}););out body;>;out skel qt;`;
  
  // Fast French Overpass API mirror (https://openstreetmap.fr) with resilient fallbacks
  const endpoints = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      const elements = data.elements || [];

      // Node lookup map
      const nodeMap = new Map<number, { lat: number; lon: number }>();
      elements.forEach((el: { id: number; type: string; lat?: number; lon?: number }) => {
        if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") {
          nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
        }
      });

      const buildings: BuildingFootprint[] = [];
      const trees: TreeFeature[] = [];

      elements.forEach((el: { id: number; type: string; tags?: Record<string, string>; nodes?: number[]; lat?: number; lon?: number }) => {
        if (el.type === "way" && el.tags?.building && el.nodes && el.nodes.length >= 3) {
          const points: Array<{ x: number; z: number }> = [];
          el.nodes.forEach((nId) => {
            const coords = nodeMap.get(nId);
            if (coords) {
              const local = gpsToLocalMeters(coords.lat, coords.lon, centerLat, centerLon);
              // Filter to within 75m of the intersection
              if (Math.abs(local.x) < 75 && Math.abs(local.z) < 75) {
                points.push(local);
              }
            }
          });

          if (points.length >= 3) {
            let height = 8;
            if (el.tags["building:levels"]) {
              height = Math.max(4, parseFloat(el.tags["building:levels"]) * 3.2);
            } else if (el.tags.height) {
              height = Math.max(4, parseFloat(el.tags.height));
            }
            buildings.push({
              id: `osm-bld-${el.id}`,
              points,
              height
            });
          }
        } else if (el.type === "node" && el.tags?.natural === "tree" && typeof el.lat === "number" && typeof el.lon === "number") {
          const local = gpsToLocalMeters(el.lat, el.lon, centerLat, centerLon);
          if (Math.abs(local.x) < 70 && Math.abs(local.z) < 70) {
            trees.push({
              id: `osm-tree-${el.id}`,
              x: local.x,
              z: local.z,
              scale: 1.0
            });
          }
        }
      });

      if (buildings.length > 0 || trees.length > 0) {
        return {
          centerLat,
          centerLon,
          source: "OVERPASS_LIVE",
          buildingsCount: buildings.length,
          treesCount: trees.length,
          buildings,
          trees
        };
      }
    } catch {
      // try next endpoint or fallback
    }
  }

  // Fallback to high-fidelity procedural generation if Overpass is unreachable
  return generateProceduralOsmData(centerLat, centerLon);
}

/**
 * Builds 3D Meshes from OSM Environment Data using Three.js ExtrudeGeometry and Low-Poly Primitives
 */
export function createProceduralEnvironmentGroup(data: OsmEnvironmentData): THREE.Group {
  const group = new THREE.Group();
  group.name = "OSM_ENVIRONMENT_GROUP";

  // Sleek architectural materials
  const defaultBldMat = new THREE.MeshStandardMaterial({
    color: 0xdcd6cb,
    roughness: 0.85,
    metalness: 0.04
  });

  const roofCapMat = new THREE.MeshStandardMaterial({
    color: 0xede8df,
    roughness: 0.9,
    metalness: 0.02
  });

  const hvacMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.6,
    metalness: 0.25
  });

  const glassBandMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.85
  });

  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.9,
    roughness: 0.2
  });

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7
  });

  // Architectural Trees: Dual-tiered tapered box canopies
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c3c26,
    roughness: 0.92
  });
  const foliageLowerMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.65
  });
  const foliageUpperMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.55
  });

  // 1. Extrude Buildings with architectural roof caps, window ribbon bands, and rooftop structures
  data.buildings.forEach((bld) => {
    if (bld.points.length < 3) return;

    try {
      const shape = new THREE.Shape();
      shape.moveTo(bld.points[0].x, -bld.points[0].z);
      for (let i = 1; i < bld.points.length; i++) {
        shape.lineTo(bld.points[i].x, -bld.points[i].z);
      }
      shape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: bld.height,
        bevelEnabled: true,
        bevelThickness: 0.15,
        bevelSize: 0.15,
        bevelSegments: 1
      };

      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(-Math.PI / 2);

      const mat = bld.color
        ? new THREE.MeshStandardMaterial({ color: bld.color, roughness: 0.85, metalness: 0.04 })
        : defaultBldMat;

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Inset roof top cap
      const roofSettings: THREE.ExtrudeGeometryOptions = {
        depth: 0.25,
        bevelEnabled: false
      };
      const roofGeom = new THREE.ExtrudeGeometry(shape, roofSettings);
      roofGeom.rotateX(-Math.PI / 2);
      roofGeom.translate(0, bld.height, 0);
      const roofMesh = new THREE.Mesh(roofGeom, roofCapMat);
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      group.add(roofMesh);

      // Compute bounding box for architectural facade ribbons & rooftop equipment
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      bld.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      });

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const widthX = Math.abs(maxX - minX);
      const depthZ = Math.abs(maxZ - minZ);

      // Rooftop HVAC mechanical penthouse
      if (widthX > 8 && depthZ > 8 && bld.height > 8) {
        const hvacW = Math.min(10, widthX * 0.4);
        const hvacD = Math.min(10, depthZ * 0.4);
        const hvacMesh = new THREE.Mesh(new THREE.BoxGeometry(hvacW, 1.8, hvacD), hvacMat);
        hvacMesh.position.set(centerX, bld.height + 0.9, centerZ);
        hvacMesh.castShadow = true;
        group.add(hvacMesh);

        // Communications antenna mast
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.0, 8), antennaMat);
        mast.position.set(centerX, bld.height + 3.8, centerZ);
        group.add(mast);
      }

      // Horizontal glass ribbon window bands on prominent facades
      if (bld.height >= 8 && widthX >= 6) {
        for (let y = 3.6; y < bld.height - 1.5; y += 3.2) {
          // North/South glass ribbons
          const glassBandN = new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.85, 0.9, 0.15), glassBandMat);
          glassBandN.position.set(centerX, y, minZ - 0.05);
          group.add(glassBandN);

          const glassBandS = new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.85, 0.9, 0.15), glassBandMat);
          glassBandS.position.set(centerX, y, maxZ + 0.05);
          group.add(glassBandS);
        }
      }

      // Ground floor entrance canopy facing road
      const entranceZ = centerZ > 0 ? minZ : maxZ;
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(Math.min(7, widthX * 0.5), 0.25, 2.2), doorMat);
      canopy.position.set(centerX, 2.8, entranceZ + (centerZ > 0 ? -1.0 : 1.0));
      canopy.castShadow = true;
      group.add(canopy);

    } catch {
      // Gracefully handle any degenerate polygon
    }
  });

  // 2. Spawn Modern Architectural Tapered Trees (Trunk + Lower Box + Upper Tapered Box)
  const trunkGeom = new THREE.BoxGeometry(0.34, 1.4, 0.34);
  trunkGeom.translate(0, 0.7, 0);

  const foliageLowerGeom = new THREE.BoxGeometry(1.65, 1.5, 1.65);
  foliageLowerGeom.translate(0, 2.0, 0);

  const foliageUpperGeom = new THREE.BoxGeometry(1.15, 1.8, 1.15);
  foliageUpperGeom.translate(0, 3.4, 0);

  data.trees.forEach((t) => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(t.x, 0, t.z);
    treeGroup.scale.set(t.scale, t.scale, t.scale);

    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    const lowerFoliage = new THREE.Mesh(foliageLowerGeom, foliageLowerMat);
    lowerFoliage.castShadow = true;
    lowerFoliage.receiveShadow = true;
    treeGroup.add(lowerFoliage);

    const upperFoliage = new THREE.Mesh(foliageUpperGeom, foliageUpperMat);
    upperFoliage.castShadow = true;
    upperFoliage.receiveShadow = true;
    treeGroup.add(upperFoliage);

    group.add(treeGroup);
  });

  return group;
}

export interface VehicleSplineTracks {
  splineA: THREE.CatmullRomCurve3;
  splineB: THREE.CatmullRomCurve3;
  speedAAt: (t: number) => number;
  speedBAt: (t: number) => number;
  brakeAAt: (t: number) => boolean;
}

export function buildScenarioSplineTracks(scenario: string): VehicleSplineTracks {
  if (scenario === "ROUNDABOUT_ENCLOACHMENT" || scenario === "ROUNDABOUT") {
    // Exact reconstruction of the uploaded accident video (Car vs Motorcycle at Roundabout):
    // Approach road entering counter-clockwise roundabout circle.
    // Vehicle A: Dark Crossover SUV (Vehicle B in report) in right lane overtaking & encroaching left into bike lane
    // Vehicle B: Black Motorcycle (Vehicle A in report) in inner left lane forced into evasive swerve onto shoulder
    const splineA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.4, 0, 28.0),
      new THREE.Vector3(1.4, 0, 19.0),
      new THREE.Vector3(0.8, 0, 11.0),
      new THREE.Vector3(-0.4, 0, 5.0),
      new THREE.Vector3(-1.8, 0, 1.8),  // Leftward lane encroachment directly into bike corridor
      new THREE.Vector3(-1.4, 0, -0.6), // Emergency ABS threshold braking
      new THREE.Vector3(-0.8, 0, -3.0)  // Complete stop inside roundabout
    ]);

    const splineB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.2, 0, 26.0),
      new THREE.Vector3(-3.2, 0, 18.0),
      new THREE.Vector3(-3.3, 0, 11.0),
      new THREE.Vector3(-3.8, 0, 5.0),
      new THREE.Vector3(-5.2, 0, 1.8),  // Evasive swerve to avoid being hit
      new THREE.Vector3(-6.6, 0, 0.4),  // Low-side fall & slide onto shoulder
      new THREE.Vector3(-7.4, 0, -0.8)  // Final rest position on paved shoulder
    ]);

    return {
      splineA,
      splineB,
      speedAAt: (t) => (t < 2.0 ? 44 : t < 3.8 ? 50 : t < 4.5 ? 12 : 0),
      speedBAt: (t) => (t < 3.8 ? 38 : t < 4.2 ? 18 : 0),
      brakeAAt: (t) => t >= 3.9 && t <= 4.8
    };
  } else   if (scenario === "CAR_VS_LORRY") {
    // Car moves westbound along highway; Lorry crosses from north side-junction
    const splineA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-28.0, 0, 1.6),
      new THREE.Vector3(-14.0, 0, 1.6),
      new THREE.Vector3(0.0, 0, 1.6),   // Braking zone
      new THREE.Vector3(1.6, 0, 1.6),   // Impact Apex
      new THREE.Vector3(4.8, 0, 2.4),   // Post-collision deflection
    ]);

    const splineB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.6, 0, -28.0),
      new THREE.Vector3(1.6, 0, -14.0),
      new THREE.Vector3(1.6, 0, 0.0),
      new THREE.Vector3(1.6, 0, 1.6),   // Impact Apex
      new THREE.Vector3(1.8, 0, 4.2),   // Post-collision slide
    ]);

    return {
      splineA,
      splineB,
      speedAAt: (t) => (t < 2.0 ? 48 : t < 2.7 ? 18 : 0),
      speedBAt: (t) => (t < 2.7 ? 32 : 0),
      brakeAAt: (t) => t >= 1.9 && t <= 2.7
    };
  } else if (scenario === "HIGHWAY_REAR_END") {
    // Both vehicles travelling in tandem along same lane; rear vehicle impacts lead vehicle
    const splineA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-25.0, 0, 0),
      new THREE.Vector3(-10.0, 0, 0),
      new THREE.Vector3(4.0, 0, 0),
      new THREE.Vector3(11.0, 0, 0),    // Rear-end collision point
      new THREE.Vector3(16.5, 0, 0),
    ]);

    const splineB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.0, 0, 0),
      new THREE.Vector3(8.0, 0, 0),
      new THREE.Vector3(10.5, 0, 0),
      new THREE.Vector3(11.0, 0, 0),    // Lead car impacted
      new THREE.Vector3(18.0, 0, 0),
    ]);

    return {
      splineA,
      splineB,
      speedAAt: (t) => (t < 1.8 ? 54 : t < 2.6 ? 26 : 0),
      speedBAt: (t) => (t < 1.2 ? 38 : t < 2.6 ? 12 : 0),
      brakeAAt: (t) => t >= 1.8
    };
  } else {
    // CAR_VS_BIKE / INTERSECTION_TBONE (Angle crossing)
    const splineA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-26.0, 0, 1.6),
      new THREE.Vector3(-12.0, 0, 1.6),
      new THREE.Vector3(0.0, 0, 1.6),
      new THREE.Vector3(1.6, 0, 1.6),   // Impact
      new THREE.Vector3(5.2, 0, 2.2),
    ]);

    const splineB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.6, 0, -25.0),
      new THREE.Vector3(1.6, 0, -10.0),
      new THREE.Vector3(1.6, 0, 0.5),
      new THREE.Vector3(1.6, 0, 1.6),   // Impact
      new THREE.Vector3(3.6, 0, 5.0),
    ]);

    return {
      splineA,
      splineB,
      speedAAt: (t) => (t < 2.0 ? 46 : t < 2.7 ? 16 : 0),
      speedBAt: (t) => (t < 2.7 ? 36 : 0),
      brakeAAt: (t) => t >= 1.9 && t <= 2.7
    };
  }
}

