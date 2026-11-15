import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CraterScanRecord,
  LUNAR_SOUTH_POLE_CRATERS,
  LunarCraterSpec,
} from '../utils/lunarWaterData';
import { SFX } from '../utils/sfx';

interface LunarSurfaceExplorer3DProps {
  craterScans: CraterScanRecord[];
  evidenceMeterPct: number;
  canDetectSubsurfaceIce: boolean;
  scanningCrater: boolean;
  hasIceCraterFound: boolean;
  onScanCrater: (crater: LunarCraterSpec) => void;
  onUpgradeInstruments: () => void;
  onProceedToTransmit: () => void;
}

interface CraterWorldNode {
  spec: LunarCraterSpec;
  x: number;
  z: number;
  radius: number;
}

const CRATER_NODES: CraterWorldNode[] = LUNAR_SOUTH_POLE_CRATERS.map((spec) => {
  // Spread across a 130m x 130m lunar south pole basin, keeping (0, 0) clear for touchdown lander
  let x = (spec.xPct - 50) * 1.45;
  let z = (spec.yPct - 50) * 1.45;
  if (Math.hypot(x, z) < 16) {
    x = 22;
    z = 26;
  }
  return {
    spec,
    x,
    z,
    radius: spec.id === 'cabeus_outcrop' ? 9.5 : 7.2,
  };
});

function moonHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  // Gentle rolling regolith + outer polar mountain rim beyond 74m
  let h =
    Math.sin(x * 0.055) * Math.cos(z * 0.055) * 0.9 +
    Math.sin(x * 0.14 + z * 0.11) * 0.25;

  if (r > 72) {
    const rimT = Math.min(1, (r - 72) / 36);
    h += rimT * rimT * 14 + Math.sin(Math.atan2(z, x) * 9) * rimT * 2.2;
  }

  // Carve real 3D crater bowls & raised rims for all 6 craters
  for (const node of CRATER_NODES) {
    const d = Math.hypot(x - node.x, z - node.z);
    if (d < node.radius * 1.55) {
      const u = d / node.radius;
      if (u < 1) {
        h -= (1 - u * u) * (node.spec.id === 'cabeus_outcrop' ? 2.6 : 1.75);
      } else {
        const rim = 1 - Math.abs(u - 1.18) / 0.37;
        if (rim > 0) h += rim * 0.85;
      }
    }
  }
  return h;
}

function createLunarRegolithTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6f7785';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const px = (i * 197 + 13) % 512;
    const py = (i * 331 + 47) % 512;
    const v = 86 + ((i * 29) % 58);
    ctx.fillStyle = `rgb(${v},${v + 3},${v + 9})`;
    ctx.fillRect(px, py, (i % 3) + 1, (i % 3) + 1);
  }
  for (let i = 0; i < 42; i++) {
    const cx = (i * 137 + 61) % 512;
    const cy = (i * 223 + 89) % 512;
    const cr = 5 + (i % 16);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(42, 48, 60, 0.38)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(190, 202, 220, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const LunarSurfaceExplorer3D: React.FC<LunarSurfaceExplorer3DProps> = ({
  craterScans,
  evidenceMeterPct,
  canDetectSubsurfaceIce,
  scanningCrater,
  hasIceCraterFound,
  onScanCrater,
  onUpgradeInstruments,
  onProceedToTransmit,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [roverPos, setRoverPos] = useState<{ x: number; z: number; yaw: number }>({
    x: 0,
    z: 9,
    yaw: 0,
  });
  const [nearbyCrater, setNearbyCrater] = useState<CraterWorldNode | null>(null);
  const [selectedViewCraterId, setSelectedViewCraterId] = useState<LunarCraterSpec['id'] | null>(
    null
  );

  // Refs synced cleanly into the WebGL loop
  const keysRef = useRef<Record<string, boolean>>({});
  const dpadRef = useRef<{ fwd: number; turn: number; hop: boolean }>({
    fwd: 0,
    turn: 0,
    hop: false,
  });
  const camYawOffsetRef = useRef(0);
  const camPitchRef = useRef(0.32);
  const dragLookRef = useRef<{ active: boolean; lx: number; ly: number }>({
    active: false,
    lx: 0,
    ly: 0,
  });
  const playerPhysicsRef = useRef({
    x: 0,
    z: 9,
    y: moonHeightAt(0, 9),
    vy: 0,
    yaw: 0,
    speed: 0,
    wheelAngle: 0,
  });
  const scanPulseRef = useRef<{ active: boolean; t: number; x: number; z: number }>({
    active: false,
    t: 0,
    x: 0,
    z: 0,
  });

  const craterScansRef = useRef(craterScans);
  craterScansRef.current = craterScans;
  const canDetectRef = useRef(canDetectSubsurfaceIce);
  canDetectRef.current = canDetectSubsurfaceIce;
  const scanningRef = useRef(scanningCrater);
  scanningRef.current = scanningCrater;
  const nearbyCraterRef = useRef<CraterWorldNode | null>(null);
  nearbyCraterRef.current = nearbyCrater;

  const onScanRef = useRef(onScanCrater);
  onScanRef.current = onScanCrater;

  const triggerScanNode = (node: CraterWorldNode) => {
    if (scanningRef.current) return;
    setSelectedViewCraterId(node.spec.id);
    scanPulseRef.current = {
      active: true,
      t: 0,
      x: node.x,
      z: node.z,
    };
    onScanRef.current(node.spec);
  };

  const handleWarpToCrater = (node: CraterWorldNode) => {
    SFX.navigate();
    const angle = Math.atan2(-node.x, -node.z);
    const px = node.x + Math.sin(angle) * (node.radius * 0.72);
    const pz = node.z + Math.cos(angle) * (node.radius * 0.72);
    playerPhysicsRef.current.x = px;
    playerPhysicsRef.current.z = pz;
    playerPhysicsRef.current.y = moonHeightAt(px, pz);
    playerPhysicsRef.current.vy = 0;
    playerPhysicsRef.current.yaw = Math.atan2(node.x - px, node.z - pz);
    camYawOffsetRef.current = 0;
    setSelectedViewCraterId(node.spec.id);
  };

  // Keyboard bindings (WASD / Arrows / Space hop / E scan)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keysRef.current[code] = true;
      if (code === 'Space') {
        e.preventDefault();
        const phys = playerPhysicsRef.current;
        const groundY = moonHeightAt(phys.x, phys.z);
        if (phys.y <= groundY + 0.12) {
          phys.vy = 5.4; // Low lunar gravity hop
          SFX.select();
        }
      }
      if (code === 'KeyE') {
        const near = nearbyCraterRef.current;
        if (near && !scanningRef.current) {
          e.preventDefault();
          setSelectedViewCraterId(near.spec.id);
          scanPulseRef.current = { active: true, t: 0, x: near.x, z: near.z };
          onScanRef.current(near.spec);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main Three.js Moon Surface World
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020612);
    scene.fog = new THREE.FogExp2(0x030816, 0.0068);

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.15, 360);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Mandatory studio environment map for metallic foil & rover steel
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Lighting: Low-angle Polar Sun + Blue Earthshine fill
    const hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.65);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xfff5db, 2.3);
    sunLight.position.set(70, 28, -52);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 210;
    sunLight.shadow.camera.left = -85;
    sunLight.shadow.camera.right = 85;
    sunLight.shadow.camera.top = 85;
    sunLight.shadow.camera.bottom = -85;
    scene.add(sunLight);

    // Track disposable resources cleanly
    const disposables: Array<{ dispose: () => void }> = [envTex];

    // 1. Starfield & Hanging Earth in the Lunar Sky
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = (i * 2.39996) % (Math.PI * 2);
      const phi = Math.acos(Math.min(1, Math.max(0.05, ((i * 73) % 100) / 100)));
      const rad = 185;
      starPos[i * 3] = rad * Math.sin(phi) * Math.cos(th);
      starPos[i * 3 + 1] = rad * Math.cos(phi) + 10;
      starPos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.9, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));
    disposables.push(starGeo, starMat);

    // Glowing Blue Earth above the South Pole horizon
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-48, 52, -130);
    const earthGeo = new THREE.SphereGeometry(9.5, 28, 28);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.85,
      roughness: 0.5,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);
    const earthHaloGeo = new THREE.SphereGeometry(10.6, 24, 24);
    const earthHaloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    earthGroup.add(new THREE.Mesh(earthHaloGeo, earthHaloMat));
    scene.add(earthGroup);
    disposables.push(earthGeo, earthMat, earthHaloGeo, earthHaloMat);

    // 2. Sculpted Lunar Terrain Surface (230m x 230m)
    const regolithTex = createLunarRegolithTexture();
    const terrainGeo = new THREE.PlaneGeometry(230, 230, 110, 110);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, moonHeightAt(vx, vz));
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: regolithTex,
      roughness: 0.92,
      metalness: 0.05,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    disposables.push(regolithTex, terrainGeo, terrainMat);

    // 3. Instanced Lunar Rocks & Polar Rim Boulders
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.88,
      metalness: 0.08,
    });
    const rockCount = 140;
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockInst.castShadow = !isSoftwareGl;
    rockInst.receiveShadow = !isSoftwareGl;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < rockCount; i++) {
      const ang = (i * 2.3999) % (Math.PI * 2);
      const dist = 14 + ((i * 37) % 68);
      const rx = Math.cos(ang) * dist;
      const rz = Math.sin(ang) * dist;
      const sc = 0.45 + ((i * 19) % 100) * 0.011;
      const ry = moonHeightAt(rx, rz) + sc * 0.28;
      dummy.position.set(rx, ry, rz);
      dummy.rotation.set(i * 0.7, i * 1.1, i * 0.4);
      dummy.scale.set(sc * 1.15, sc * 0.78, sc);
      dummy.updateMatrix();
      rockInst.setMatrixAt(i, dummy.matrix);
      const shade = 0.48 + ((i * 13) % 30) * 0.01;
      tint.setRGB(shade, shade + 0.02, shade + 0.05);
      rockInst.setColorAt(i, tint);
    }
    rockInst.instanceMatrix.needsUpdate = true;
    if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
    scene.add(rockInst);
    disposables.push(rockGeo, rockMat);

    // 4. Composite Landed Lunar Spacecraft at (0, 0)
    const landerGroup = new THREE.Group();
    const landerBaseY = moonHeightAt(0, 0);
    landerGroup.position.set(0, landerBaseY, 0);

    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.85,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.75,
    });
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.6,
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x4fe3d4,
      emissive: 0x4fe3d4,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    const busGeo = new THREE.CylinderGeometry(1.75, 1.95, 1.8, 8);
    const busMesh = new THREE.Mesh(busGeo, goldFoilMat);
    busMesh.position.y = 1.95;
    busMesh.castShadow = !isSoftwareGl;
    landerGroup.add(busMesh);

    const cabinGeo = new THREE.CylinderGeometry(1.1, 1.35, 1.3, 8);
    const cabinMesh = new THREE.Mesh(cabinGeo, steelMat);
    cabinMesh.position.y = 3.45;
    cabinMesh.castShadow = !isSoftwareGl;
    landerGroup.add(cabinMesh);

    const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.3, 8);
    const padGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.16, 12);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(Math.cos(a) * 1.95, 1.0, Math.sin(a) * 1.95);
      leg.rotation.z = Math.cos(a) * 0.45;
      leg.rotation.x = -Math.sin(a) * 0.45;
      landerGroup.add(leg);

      const pad = new THREE.Mesh(padGeo, goldFoilMat);
      pad.position.set(Math.cos(a) * 2.55, 0.08, Math.sin(a) * 2.55);
      landerGroup.add(pad);
    }

    const wingGeo = new THREE.BoxGeometry(2.8, 0.08, 1.1);
    const wingL = new THREE.Mesh(wingGeo, solarMat);
    wingL.position.set(-2.9, 3.2, 0);
    const wingR = new THREE.Mesh(wingGeo, solarMat);
    wingR.position.set(2.9, 3.2, 0);
    landerGroup.add(wingL, wingR);

    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.y = 4.65;
    const beaconGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 5.3;
    landerGroup.add(mast, beacon);

    // Warm landing pad floodlight
    const padLight = new THREE.PointLight(0xfbbf24, 3.5, 22);
    padLight.position.set(0, 4.5, 0);
    landerGroup.add(padLight);

    scene.add(landerGroup);
    disposables.push(
      goldFoilMat,
      steelMat,
      solarMat,
      beaconMat,
      busGeo,
      cabinGeo,
      legGeo,
      padGeo,
      wingGeo,
      mastGeo,
      beaconGeo
    );

    // 5. Explorable 3D Crater Beacons & Subsurface Ice Crystals
    const craterVisuals: Record<
      string,
      {
        ringMat: THREE.MeshBasicMaterial;
        pillarMat: THREE.MeshBasicMaterial;
        ring: THREE.Mesh;
        iceGroup: THREE.Group;
      }
    > = {};

    const beaconRingGeo = new THREE.RingGeometry(2.6, 3.2, 32);
    beaconRingGeo.rotateX(-Math.PI / 2);
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.45, 7.5, 12, 1, true);
    const crystalGeo = new THREE.OctahedronGeometry(0.55, 0);
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    disposables.push(beaconRingGeo, pillarGeo, crystalGeo, iceMat);

    CRATER_NODES.forEach((node) => {
      const cy = moonHeightAt(node.x, node.z);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(beaconRingGeo, ringMat);
      ring.position.set(node.x, cy + 0.18, node.z);
      scene.add(ring);

      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(node.x, cy + 3.8, node.z);
      scene.add(pillar);

      const iceGroup = new THREE.Group();
      iceGroup.position.set(node.x, cy + 0.2, node.z);
      for (let k = 0; k < 5; k++) {
        const cr = new THREE.Mesh(crystalGeo, iceMat);
        const a = (k / 5) * Math.PI * 2;
        cr.position.set(Math.cos(a) * 1.4, 0.3 + (k % 2) * 0.25, Math.sin(a) * 1.4);
        cr.scale.setScalar(0.75 + (k % 3) * 0.28);
        iceGroup.add(cr);
      }
      iceGroup.visible = false;
      scene.add(iceGroup);

      craterVisuals[node.spec.id] = { ringMat, pillarMat, ring, iceGroup };
      disposables.push(ringMat, pillarMat);
    });

    // 6. Composite 3D Lunar Rover Scout (Player Avatar)
    const roverGroup = new THREE.Group();
    const roverBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.45,
    });
    const roverAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.3,
    });

    const chassisGeo = new THREE.BoxGeometry(1.45, 0.55, 2.05);
    const chassis = new THREE.Mesh(chassisGeo, goldFoilMat);
    chassis.position.y = 0.72;
    chassis.castShadow = !isSoftwareGl;
    roverGroup.add(chassis);

    const deckGeo = new THREE.BoxGeometry(1.25, 0.24, 1.6);
    const deck = new THREE.Mesh(deckGeo, roverBodyMat);
    deck.position.y = 1.1;
    roverGroup.add(deck);

    const sensorMastGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8);
    const sensorMast = new THREE.Mesh(sensorMastGeo, steelMat);
    sensorMast.position.set(0, 1.55, 0.55);
    roverGroup.add(sensorMast);

    const camHeadGeo = new THREE.BoxGeometry(0.46, 0.24, 0.32);
    const camHead = new THREE.Mesh(camHeadGeo, roverAccentMat);
    camHead.position.set(0, 2.02, 0.58);
    roverGroup.add(camHead);

    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMeshes: THREE.Mesh[] = [];
    const wheelOffsets: [number, number][] = [
      [-0.86, 0.75],
      [0.86, 0.75],
      [-0.92, 0],
      [0.92, 0],
      [-0.86, -0.75],
      [0.86, -0.75],
    ];
    wheelOffsets.forEach(([wx, wz]) => {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.position.set(wx, 0.36, wz);
      wMesh.castShadow = !isSoftwareGl;
      roverGroup.add(wMesh);
      wheelMeshes.push(wMesh);
    });

    // Rover Front Scan Light
    const headLight = new THREE.SpotLight(0x4fe3d4, 5, 26, Math.PI / 4, 0.5);
    headLight.position.set(0, 1.9, 0.7);
    headLight.target.position.set(0, 0, 8);
    roverGroup.add(headLight, headLight.target);

    scene.add(roverGroup);
    disposables.push(
      roverBodyMat,
      roverAccentMat,
      wheelMat,
      chassisGeo,
      deckGeo,
      sensorMastGeo,
      camHeadGeo,
      wheelGeo
    );

    // 7. Expanding 3D Scan Wave Ring
    const scanWaveGeo = new THREE.RingGeometry(0.6, 1.15, 36);
    scanWaveGeo.rotateX(-Math.PI / 2);
    const scanWaveMat = new THREE.MeshBasicMaterial({
      color: 0x4fe3d4,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const scanWaveMesh = new THREE.Mesh(scanWaveGeo, scanWaveMat);
    scanWaveMesh.visible = false;
    scene.add(scanWaveMesh);
    disposables.push(scanWaveGeo, scanWaveMat);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const cw = Math.max(1, container.clientWidth || 800);
      const ch = Math.max(1, container.clientHeight || 460);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch, false);
    };
    window.addEventListener('resize', handleResize);
    const resizeObs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObs?.observe(container);

    // Game loop with THREE.Clock + SoftwareGL afterDraw pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let hudSyncAccum = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const phys = playerPhysicsRef.current;

      // Drive Controls (WASD / Arrow Keys + On-Screen D-Pad)
      const k = keysRef.current;
      const dpad = dpadRef.current;
      const fwdInput =
        (k['KeyW'] || k['ArrowUp'] ? 1 : 0) -
        (k['KeyS'] || k['ArrowDown'] ? 1 : 0) +
        dpad.fwd;
      const turnInput =
        (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) -
        (k['KeyD'] || k['ArrowRight'] ? 1 : 0) +
        dpad.turn;

      phys.yaw += turnInput * 2.15 * dt;
      const targetSpeed = fwdInput * 13.5;
      phys.speed += (targetSpeed - phys.speed) * Math.min(1, dt * 8);

      const nextX = phys.x + Math.sin(phys.yaw) * phys.speed * dt;
      const nextZ = phys.z + Math.cos(phys.yaw) * phys.speed * dt;

      // Keep inside natural South Pole basin perimeter (74m radius)
      const distOrigin = Math.hypot(nextX, nextZ);
      if (distOrigin < 74) {
        phys.x = nextX;
        phys.z = nextZ;
      }

      // Low-gravity lunar vertical physics
      const gY = moonHeightAt(phys.x, phys.z);
      phys.vy -= 4.2 * dt; // 1/6th Earth gravity!
      phys.y += phys.vy * dt;
      if (phys.y <= gY) {
        phys.y = gY;
        phys.vy = 0;
      }

      // Position & tilt rover gently with terrain slope
      roverGroup.position.set(phys.x, phys.y, phys.z);
      roverGroup.rotation.y = phys.yaw;
      const hFront = moonHeightAt(
        phys.x + Math.sin(phys.yaw) * 0.9,
        phys.z + Math.cos(phys.yaw) * 0.9
      );
      const hBack = moonHeightAt(
        phys.x - Math.sin(phys.yaw) * 0.9,
        phys.z - Math.cos(phys.yaw) * 0.9
      );
      roverGroup.rotation.x = Math.atan2(hBack - hFront, 1.8) * 0.7;

      phys.wheelAngle += phys.speed * dt * 2.2;
      wheelMeshes.forEach((wm) => {
        wm.rotation.x = phys.wheelAngle;
      });

      // Blinking Lander Beacon & Rotating Earth
      beaconMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 4.5) * 0.65;
      earthMesh.rotation.y = elapsed * 0.04;

      // Update crater beacon colors & reveal ice crystals when scanned
      let closestNode: CraterWorldNode | null = null;
      let closestDist = Infinity;
      for (const node of CRATER_NODES) {
        const d = Math.hypot(phys.x - node.x, phys.z - node.z);
        if (d < node.radius + 4.5 && d < closestDist) {
          closestDist = d;
          closestNode = node;
        }
        const vis = craterVisuals[node.spec.id];
        const rec = craterScansRef.current.find((r) => r.craterId === node.spec.id);
        const pulse = 1 + Math.sin(elapsed * 3.2 + node.x) * 0.08;
        vis.ring.scale.setScalar(pulse);
        if (rec) {
          const isIce = rec.hydrogenPpm >= 200 && canDetectRef.current;
          vis.ringMat.color.setHex(isIce ? 0x38bdf8 : 0x34d399);
          vis.pillarMat.color.setHex(isIce ? 0x38bdf8 : 0x34d399);
          vis.pillarMat.opacity = isIce ? 0.36 : 0.16;
          vis.iceGroup.visible = isIce;
          if (isIce) {
            vis.iceGroup.rotation.y = elapsed * 0.65;
          }
        } else {
          vis.ringMat.color.setHex(0xfbbf24);
          vis.pillarMat.color.setHex(0xfbbf24);
          vis.pillarMat.opacity = 0.22;
          vis.iceGroup.visible = false;
        }
      }

      // Animate expanding scan ring
      if (scanPulseRef.current.active) {
        scanPulseRef.current.t += dt * 1.4;
        const st = scanPulseRef.current.t;
        if (st >= 1) {
          scanPulseRef.current.active = false;
          scanWaveMesh.visible = false;
        } else {
          scanWaveMesh.visible = true;
          const sy = moonHeightAt(scanPulseRef.current.x, scanPulseRef.current.z) + 0.35;
          scanWaveMesh.position.set(scanPulseRef.current.x, sy, scanPulseRef.current.z);
          scanWaveMesh.scale.setScalar(1 + st * 9.5);
          scanWaveMat.opacity = (1 - st) * 0.9;
        }
      }

      // Over-shoulder 3rd-person camera follow
      const camYaw = phys.yaw + camYawOffsetRef.current;
      const camDist = 9.2;
      const camHeight = 4.2 + camPitchRef.current * 6.5;
      const targetCamX = phys.x - Math.sin(camYaw) * camDist;
      const targetCamZ = phys.z - Math.cos(camYaw) * camDist;
      const groundAtCam = moonHeightAt(targetCamX, targetCamZ);
      const targetCamY = Math.max(groundAtCam + 1.6, phys.y + camHeight);

      camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), Math.min(1, dt * 8));
      camera.lookAt(phys.x, phys.y + 1.4, phys.z);

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.08) {
        hudSyncAccum = 0;
        setRoverPos({ x: phys.x, z: phys.z, yaw: phys.yaw });
        setNearbyCrater(closestNode);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObs?.disconnect();
      window.removeEventListener('resize', handleResize);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const activeSpec =
    nearbyCrater?.spec ||
    (selectedViewCraterId
      ? LUNAR_SOUTH_POLE_CRATERS.find((c) => c.id === selectedViewCraterId) || null
      : null);
  const activeScan = activeSpec
    ? craterScans.find((r) => r.craterId === activeSpec.id) || null
    : null;

  // Nearest unscanned crater guidance arrow
  const nextUnscanned = useMemo(() => {
    const unscanned = CRATER_NODES.filter(
      (n) => !craterScans.some((r) => r.craterId === n.spec.id)
    );
    const pool = unscanned.length > 0 ? unscanned : CRATER_NODES;
    let best = pool[0];
    let bestDist = Infinity;
    for (const n of pool) {
      const d = Math.hypot(n.x - roverPos.x, n.z - roverPos.z);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    }
    return { node: best, dist: Math.round(bestDist) };
  }, [craterScans, roverPos.x, roverPos.z]);

  return (
    <div className="max-w-[1360px] w-full mx-auto flex flex-col gap-3">
      {/* Compact Animated Status & Evidence Bar */}
      <div className="rounded-2xl bg-[#071124] border border-cyan-400/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/45 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
            🌙 LUNAR SURFACE
          </span>
          <span className="font-display text-sm sm:text-base font-extrabold text-white">
            Drive &amp; Scan Polar Craters ({craterScans.length}/{CRATER_NODES.length})
          </span>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md min-w-[200px]">
          <span className="text-[11px] font-mono-tech font-bold text-slate-300 shrink-0">
            ICE EVIDENCE
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-emerald-400 transition-all duration-500"
              style={{ width: `${evidenceMeterPct}%` }}
            />
          </div>
          <span className="text-xs font-mono-tech font-extrabold text-[#4fe3d4] tabular-nums">
            {evidenceMeterPct}%
          </span>
        </div>

        <button
          type="button"
          disabled={!hasIceCraterFound || evidenceMeterPct < 75}
          onClick={() => {
            SFX.click();
            onProceedToTransmit();
          }}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wide transition ${
            hasIceCraterFound && evidenceMeterPct >= 75
              ? 'bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] hover:brightness-110 cursor-pointer shadow-[0_0_20px_rgba(79,227,212,0.4)]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {hasIceCraterFound && evidenceMeterPct >= 75
            ? 'Transmit Proof ▶'
            : 'Need ≥75% Ice Proof'}
        </button>
      </div>

      {!canDetectSubsurfaceIce && (
        <div className="rounded-xl bg-red-950/65 border border-red-400/50 px-4 py-2 flex items-center justify-between gap-3 text-xs font-bold text-red-200">
          <span>⚠ Optical camera cannot see buried ice inside dark craters!</span>
          <button
            type="button"
            onClick={onUpgradeInstruments}
            className="px-3 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white font-extrabold cursor-pointer shrink-0"
          >
            ← Upgrade Sensors
          </button>
        </div>
      )}

      {/* Main 3D Lunar Surface Exploration Viewport + Compact HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-9 relative rounded-2xl overflow-hidden border border-cyan-400/35 bg-[#020612] min-h-[430px] h-[56vh] max-h-[600px]">
          <div
            ref={mountRef}
            onPointerDown={(e) => {
              dragLookRef.current = { active: true, lx: e.clientX, ly: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!dragLookRef.current.active) return;
              const dx = e.clientX - dragLookRef.current.lx;
              const dy = e.clientY - dragLookRef.current.ly;
              dragLookRef.current = { active: true, lx: e.clientX, ly: e.clientY };
              camYawOffsetRef.current -= dx * 0.008;
              camPitchRef.current = Math.max(
                0.08,
                Math.min(0.85, camPitchRef.current + dy * 0.004)
              );
            }}
            onPointerUp={() => {
              dragLookRef.current.active = false;
            }}
            onPointerLeave={() => {
              dragLookRef.current.active = false;
            }}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          />

          {/* Top-Left Minimal Controls Chip */}
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5 text-[10px] font-mono-tech font-bold">
            <span className="px-2 py-1 rounded-lg bg-[#040d21]/85 border border-cyan-400/35 text-cyan-200">
              WASD / Arrows: Drive
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#040d21]/85 border border-cyan-400/35 text-cyan-200">
              Space: Low-G Hop
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#040d21]/85 border border-amber-400/35 text-amber-200">
              Drag: Look • [E] Scan
            </span>
          </div>

          {/* Top-Right Mini Lunar Surface Radar */}
          <div className="absolute top-3 right-3 w-32 h-32 rounded-full bg-[#040e22]/88 border-2 border-cyan-400/45 shadow-[0_0_24px_rgba(0,0,0,0.65)] overflow-hidden">
            <svg viewBox="-82 -82 164 164" className="w-full h-full">
              <circle cx="0" cy="0" r="76" stroke="#1e3a5f" strokeWidth="1" fill="none" />
              <circle cx="0" cy="0" r="42" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="3 3" fill="none" />
              {/* Lander at 0,0 */}
              <polygon points="0,-5 5,4 -5,4" fill="#fbbf24" />
              {/* 6 Craters */}
              {CRATER_NODES.map((n) => {
                const scanned = craterScans.find((r) => r.craterId === n.spec.id);
                const isIce = scanned && scanned.hydrogenPpm >= 200 && canDetectSubsurfaceIce;
                return (
                  <circle
                    key={n.spec.id}
                    cx={n.x}
                    cy={n.z}
                    r={scanned ? 5 : 4.5}
                    fill={isIce ? '#38bdf8' : scanned ? '#34d399' : '#f59e0b'}
                    stroke="#040d1d"
                    strokeWidth="1"
                  />
                );
              })}
              {/* Player Rover Arrow */}
              <g
                transform={`translate(${roverPos.x}, ${roverPos.z}) rotate(${
                  (-roverPos.yaw * 180) / Math.PI + 180
                })`}
              >
                <polygon points="0,-7 5,5 0,2 -5,5" fill="#4fe3d4" stroke="#ffffff" strokeWidth="1" />
              </g>
            </svg>
          </div>

          {/* Bottom-Left Touch / Click Drive Pad */}
          <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1 w-28 select-none">
            <div />
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.fwd = 1)}
              onPointerUp={() => (dpadRef.current.fwd = 0)}
              onPointerLeave={() => (dpadRef.current.fwd = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-black text-white cursor-pointer"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.turn = 1)}
              onPointerUp={() => (dpadRef.current.turn = 0)}
              onPointerLeave={() => (dpadRef.current.turn = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-black text-white cursor-pointer"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.fwd = -1)}
              onPointerUp={() => (dpadRef.current.fwd = 0)}
              onPointerLeave={() => (dpadRef.current.fwd = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-black text-white cursor-pointer"
            >
              ▼
            </button>
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.turn = -1)}
              onPointerUp={() => (dpadRef.current.turn = 0)}
              onPointerLeave={() => (dpadRef.current.turn = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-black text-white cursor-pointer"
            >
              ▶
            </button>
          </div>

          {/* Bottom-Center Context Action Prompt: [E] SCAN CRATER or Nearest Waypoint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {nearbyCrater ? (
              <button
                type="button"
                disabled={scanningCrater}
                onClick={() => triggerScanNode(nearbyCrater)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide shadow-[0_0_24px_rgba(79,227,212,0.55)] hover:brightness-110 cursor-pointer animate-pulse"
              >
                {scanningCrater
                  ? '📡 Scanning Subsurface...'
                  : `[E] SCAN ${nearbyCrater.spec.name.toUpperCase()}`}
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-[#040e22]/90 border border-amber-400/40 text-xs font-mono-tech font-bold text-amber-200 flex items-center gap-2">
                <span>🧭</span>
                <span>
                  {nextUnscanned.node.spec.name} ({nextUnscanned.dist}m)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Crater Telemetry & Fast-Jump Crater List (Low Text!) */}
        <aside className="lg:col-span-3 rounded-2xl bg-[#071124] border border-cyan-400/30 p-3.5 flex flex-col justify-between gap-3">
          <div className="space-y-3">
            {/* Active / Scanned Crater Live Readout */}
            {activeSpec && activeScan ? (
              <div className="p-3 rounded-xl bg-[#0a1832] border border-cyan-400/45 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-sm font-extrabold text-white truncate">
                    {activeSpec.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
                    {activeScan.confidencePct}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono-tech text-xs">
                  <div className="p-1.5 rounded-lg bg-[#050d1c]">
                    <div className="text-[9px] text-slate-400">💧 H₂</div>
                    <div className="font-extrabold text-[#38bdf8]">{activeScan.hydrogenPpm}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#050d1c]">
                    <div className="text-[9px] text-slate-400">🧊 ICE</div>
                    <div className="font-extrabold text-emerald-300">{activeScan.radarIcePct}%</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#050d1c]">
                    <div className="text-[9px] text-slate-400">🌡 TEMP</div>
                    <div className="font-extrabold text-amber-300">{activeScan.tempC}°</div>
                  </div>
                </div>
                {activeScan.scanCount < 2 && nearbyCrater?.spec.id === activeSpec.id && (
                  <button
                    type="button"
                    disabled={scanningCrater}
                    onClick={() => triggerScanNode(nearbyCrater)}
                    className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-[11px] font-extrabold text-[#4fe3d4] cursor-pointer"
                  >
                    Deep Re-Scan (+20%)
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#0a162d] border border-white/10 text-center text-xs font-bold text-slate-300">
                🎯 Drive to any glowing crater beacon &amp; press <span className="text-[#4fe3d4]">E</span>
              </div>
            )}

            {/* Quick Crater Waypoints */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-400 font-bold">
                POLAR CRATERS (DRIVE OR WARP)
              </div>
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                {CRATER_NODES.map((node) => {
                  const rec = craterScans.find((r) => r.craterId === node.spec.id);
                  const isIce = rec && rec.hydrogenPpm >= 200 && canDetectSubsurfaceIce;
                  const dist = Math.round(Math.hypot(node.x - roverPos.x, node.z - roverPos.z));
                  const isNear = nearbyCrater?.spec.id === node.spec.id;
                  return (
                    <div
                      key={node.spec.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                        isNear
                          ? 'bg-cyan-500/15 border-[#4fe3d4]'
                          : isIce
                          ? 'bg-sky-950/50 border-sky-400/50'
                          : rec
                          ? 'bg-emerald-950/35 border-emerald-400/40'
                          : 'bg-[#0a162d] border-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{node.spec.name}</div>
                        <div className="text-[10px] font-mono-tech text-slate-400">
                          {rec ? `${rec.hydrogenPpm} ppm • ${rec.tempC}°C` : `${dist}m away`}
                        </div>
                      </div>
                      {isNear ? (
                        <button
                          type="button"
                          disabled={scanningCrater}
                          onClick={() => triggerScanNode(node)}
                          className="px-2.5 py-1 rounded-lg bg-[#4fe3d4] text-[#041022] text-[10px] font-black uppercase cursor-pointer shrink-0"
                        >
                          Scan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleWarpToCrater(node)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-cyan-500/25 border border-white/15 text-[10px] font-bold text-cyan-200 cursor-pointer shrink-0"
                        >
                          Drive To
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
