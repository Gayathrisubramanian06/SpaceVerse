import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  celsiusToKelvin,
  EUROPA_LOCATIONS,
  EuropaLocationSpec,
  getTempColor,
  SavedEuropaReading,
} from '../utils/europaMissionData';
import { SFX } from '../utils/sfx';

interface EuropaSurfaceExplorer3DProps {
  collectedReadings: SavedEuropaReading[];
  probingLoc: EuropaLocationSpec | null;
  probeTravelPhase: 'idle' | 'moving' | 'drilling' | 'measured';
  activeMeasuredTempC: number | null;
  activeDriftC: number;
  sensorStabilizedHere: boolean;
  onMeasureSite: (loc: EuropaLocationSpec) => void;
  onStabilizeSensor: () => void;
  onSaveReading: () => void;
  onTransmitToEarth: () => void;
}

interface EuropaWorldNode {
  spec: EuropaLocationSpec;
  x: number;
  z: number;
  radius: number;
}

const EUROPA_NODES: EuropaWorldNode[] = EUROPA_LOCATIONS.map((spec) => {
  // Spread across a 130m x 130m Europa icy crust basin, keeping (0,0) clear for probe lander
  let x = (spec.mapX - 50) * 1.45;
  let z = (spec.mapY - 50) * 1.35;
  if (spec.id === 'landing_site') {
    x = -16;
    z = 14;
  } else if (Math.hypot(x, z) < 15) {
    x = 20;
    z = -18;
  }
  return {
    spec,
    x,
    z,
    radius: spec.id === 'deep_ice' ? 8.5 : 7.2,
  };
});

function europaHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  // Icy chaos terrain + tectonic double-ridge crests + outer frost basin rim
  let h =
    Math.sin(x * 0.065) * Math.cos(z * 0.06) * 0.72 +
    Math.sin(x * 0.17 - z * 0.13) * 0.22;

  // Tectonic double-ridge fracture running through the Ice Ridge site
  const ridgeDist = Math.abs(z + 24 - Math.sin(x * 0.05) * 6);
  if (ridgeDist < 7.5) {
    const t = 1 - ridgeDist / 7.5;
    h += Math.sin(t * Math.PI) * 1.45;
  }

  if (r > 72) {
    const rimT = Math.min(1, (r - 72) / 36);
    h += rimT * rimT * 13 + Math.cos(Math.atan2(z, x) * 10) * rimT * 2.1;
  }

  for (const node of EUROPA_NODES) {
    const d = Math.hypot(x - node.x, z - node.z);
    if (d < node.radius * 1.4) {
      const u = d / node.radius;
      if (node.spec.id === 'deep_ice') {
        if (u < 1) h -= (1 - u * u) * 2.2;
      } else if (node.spec.id === 'ice_ridge') {
        if (u < 1) h += (1 - u * u) * 1.1;
      } else if (u < 1) {
        h -= (1 - u * u) * 0.45;
      }
    }
  }
  return h;
}

function createEuropaIceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#9bd0f5');
  grad.addColorStop(0.55, '#68a6d6');
  grad.addColorStop(1, '#3b73a8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle frost crystals
  for (let i = 0; i < 5500; i++) {
    const px = (i * 199 + 17) % 512;
    const py = (i * 337 + 53) % 512;
    const bright = 175 + ((i * 23) % 75);
    ctx.fillStyle = `rgba(${bright - 25}, ${bright}, 255, 0.35)`;
    ctx.fillRect(px, py, (i % 3) + 1, (i % 2) + 1);
  }

  // Crisscrossed reddish-brown & cyan Europa lineae fractures
  for (let i = 0; i < 26; i++) {
    const y0 = (i * 47) % 512;
    const y1 = (y0 + 95 + (i % 5) * 29) % 512;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(170, (y0 + y1) / 2 - 22, 340, (y0 + y1) / 2 + 24, 512, y1);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(134, 78, 66, 0.42)' : 'rgba(210, 244, 255, 0.45)';
    ctx.lineWidth = i % 3 === 0 ? 3.2 : 1.8;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createJupiterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bands = [
    { y: 0, h: 32, c: '#c9a989' },
    { y: 32, h: 24, c: '#e5cdb2' },
    { y: 56, h: 28, c: '#b87d56' },
    { y: 84, h: 36, c: '#f2dfca' },
    { y: 120, h: 28, c: '#c77c4e' },
    { y: 148, h: 34, c: '#edd5b8' },
    { y: 182, h: 26, c: '#9e6847' },
    { y: 208, h: 48, c: '#cdb091' },
  ];
  for (const b of bands) {
    ctx.fillStyle = b.c;
    ctx.fillRect(0, b.y, 512, b.h);
  }
  // Great Red Spot
  ctx.beginPath();
  ctx.ellipse(310, 152, 36, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c85838';
  ctx.fill();
  ctx.strokeStyle = '#f3d2b3';
  ctx.lineWidth = 3;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const EuropaSurfaceExplorer3D: React.FC<EuropaSurfaceExplorer3DProps> = ({
  collectedReadings,
  probingLoc,
  probeTravelPhase,
  activeMeasuredTempC,
  activeDriftC,
  sensorStabilizedHere,
  onMeasureSite,
  onStabilizeSensor,
  onSaveReading,
  onTransmitToEarth,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [roverPos, setRoverPos] = useState<{ x: number; z: number; yaw: number }>({
    x: 0,
    z: 9,
    yaw: 0,
  });
  const [nearbyNode, setNearbyNode] = useState<EuropaWorldNode | null>(null);

  const keysRef = useRef<Record<string, boolean>>({});
  const dpadRef = useRef<{ fwd: number; turn: number }>({ fwd: 0, turn: 0 });
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
    y: europaHeightAt(0, 9),
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

  const collectedRef = useRef(collectedReadings);
  collectedRef.current = collectedReadings;
  const travelPhaseRef = useRef(probeTravelPhase);
  travelPhaseRef.current = probeTravelPhase;
  const nearbyNodeRef = useRef<EuropaWorldNode | null>(null);
  nearbyNodeRef.current = nearbyNode;

  const onMeasureRef = useRef(onMeasureSite);
  onMeasureRef.current = onMeasureSite;

  const isBusy = probeTravelPhase === 'moving' || probeTravelPhase === 'drilling';
  const busyRef = useRef(isBusy);
  busyRef.current = isBusy;

  const triggerMeasureNode = (node: EuropaWorldNode) => {
    if (busyRef.current) return;
    scanPulseRef.current = {
      active: true,
      t: 0,
      x: node.x,
      z: node.z,
    };
    onMeasureRef.current(node.spec);
  };

  const handleWarpToSite = (node: EuropaWorldNode) => {
    if (busyRef.current) return;
    SFX.navigate();
    const angle = Math.atan2(-node.x, -node.z);
    const px = node.x + Math.sin(angle) * (node.radius * 0.72);
    const pz = node.z + Math.cos(angle) * (node.radius * 0.72);
    playerPhysicsRef.current.x = px;
    playerPhysicsRef.current.z = pz;
    playerPhysicsRef.current.y = europaHeightAt(px, pz);
    playerPhysicsRef.current.vy = 0;
    playerPhysicsRef.current.yaw = Math.atan2(node.x - px, node.z - pz);
    camYawOffsetRef.current = 0;
    scanPulseRef.current = {
      active: true,
      t: 0,
      x: node.x,
      z: node.z,
    };
    onMeasureRef.current(node.spec);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keysRef.current[code] = true;
      if (code === 'Space') {
        e.preventDefault();
        const phys = playerPhysicsRef.current;
        const groundY = europaHeightAt(phys.x, phys.z);
        if (phys.y <= groundY + 0.14) {
          phys.vy = 5.6; // Europa 0.134g floaty hop
          SFX.select();
        }
      }
      if (code === 'KeyE') {
        const near = nearbyNodeRef.current;
        if (near && !busyRef.current) {
          e.preventDefault();
          scanPulseRef.current = { active: true, t: 0, x: near.x, z: near.z };
          onMeasureRef.current(near.spec);
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
    scene.background = new THREE.Color(0x020816);
    scene.fog = new THREE.FogExp2(0x041026, 0.0065);

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.15, 380);

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

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.72);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
    sunLight.position.set(-75, 34, -42);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 210;
    sunLight.shadow.camera.left = -85;
    sunLight.shadow.camera.right = 85;
    sunLight.shadow.camera.top = 85;
    sunLight.shadow.camera.bottom = -85;
    scene.add(sunLight);

    const disposables: Array<{ dispose: () => void }> = [envTex];

    // 1. Starfield + Jupiter + Io in Europa's Sky
    const starCount = 950;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const th = (i * 2.39996) % (Math.PI * 2);
      const phi = Math.acos(Math.min(1, Math.max(0.05, ((i * 73) % 100) / 100)));
      const rad = 190;
      starPos[i * 3] = rad * Math.sin(phi) * Math.cos(th);
      starPos[i * 3 + 1] = rad * Math.cos(phi) + 12;
      starPos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.9, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));
    disposables.push(starGeo, starMat);

    // Banded Jupiter looming in the sky
    const jupiterTex = createJupiterTexture();
    const jupiterGroup = new THREE.Group();
    jupiterGroup.position.set(52, 54, -140);
    const jupGeo = new THREE.SphereGeometry(22, 32, 32);
    const jupMat = new THREE.MeshStandardMaterial({
      map: jupiterTex,
      emissive: 0x3f2414,
      emissiveIntensity: 0.35,
      roughness: 0.65,
      metalness: 0.05,
    });
    const jupMesh = new THREE.Mesh(jupGeo, jupMat);
    jupMesh.rotation.z = 0.08;
    jupiterGroup.add(jupMesh);

    const jupHaloGeo = new THREE.SphereGeometry(23.8, 24, 24);
    const jupHaloMat = new THREE.MeshBasicMaterial({
      color: 0xfdba74,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
    });
    jupiterGroup.add(new THREE.Mesh(jupHaloGeo, jupHaloMat));
    scene.add(jupiterGroup);
    disposables.push(jupiterTex, jupGeo, jupMat, jupHaloGeo, jupHaloMat);

    // Distant volcanic Io
    const ioGeo = new THREE.SphereGeometry(2.8, 16, 16);
    const ioMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.35,
      roughness: 0.8,
    });
    const ioMesh = new THREE.Mesh(ioGeo, ioMat);
    ioMesh.position.set(8, 66, -155);
    scene.add(ioMesh);
    disposables.push(ioGeo, ioMat);

    // 2. Sculpted Icy Europa Terrain (230m x 230m) + Terminator Darkness on East Side
    const iceTex = createEuropaIceTexture();
    const terrainGeo = new THREE.PlaneGeometry(230, 230, 110, 110);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const colorTmp = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, europaHeightAt(vx, vz));
      // Darken terrain past the east terminator (x > 16)
      const shadowFade = vx > 12 ? Math.max(0.28, 1 - (vx - 12) / 55) : 1;
      colorTmp.setRGB(shadowFade * 0.92, shadowFade * 0.97, shadowFade);
      colors[i * 3] = colorTmp.r;
      colors[i * 3 + 1] = colorTmp.g;
      colors[i * 3 + 2] = colorTmp.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: iceTex,
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.12,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    disposables.push(iceTex, terrainGeo, terrainMat);

    // 3. Instanced Ice Spires & Pressure-Ridge Monoliths
    const spireGeo = new THREE.ConeGeometry(0.85, 2.2, 6);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.2,
    });
    const spireCount = 135;
    const spireInst = new THREE.InstancedMesh(spireGeo, spireMat, spireCount);
    spireInst.castShadow = !isSoftwareGl;
    spireInst.receiveShadow = !isSoftwareGl;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < spireCount; i++) {
      const ang = (i * 2.3999) % (Math.PI * 2);
      const dist = 14 + ((i * 37) % 66);
      const rx = Math.cos(ang) * dist;
      const rz = Math.sin(ang) * dist;
      const sc = 0.4 + ((i * 19) % 100) * 0.011;
      const ry = europaHeightAt(rx, rz) + sc * 0.7;
      dummy.position.set(rx, ry, rz);
      dummy.rotation.set((i % 5) * 0.14 - 0.25, i * 1.1, ((i * 3) % 5) * 0.14 - 0.25);
      dummy.scale.set(sc, sc * (0.9 + (i % 3) * 0.35), sc);
      dummy.updateMatrix();
      spireInst.setMatrixAt(i, dummy.matrix);
      const isEastShadow = rx > 18;
      tint.setRGB(
        isEastShadow ? 0.35 : 0.68,
        isEastShadow ? 0.52 : 0.88,
        isEastShadow ? 0.72 : 1
      );
      spireInst.setColorAt(i, tint);
    }
    spireInst.instanceMatrix.needsUpdate = true;
    if (spireInst.instanceColor) spireInst.instanceColor.needsUpdate = true;
    scene.add(spireInst);
    disposables.push(spireGeo, spireMat);

    // 4. Composite Landed Europa Thermal Probe at (0, 0)
    const landerGroup = new THREE.Group();
    landerGroup.position.set(0, europaHeightAt(0, 0), 0);

    const cryoShieldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.85,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.32,
      metalness: 0.78,
    });
    const cryoCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x4fe3d4,
      emissive: 0x4fe3d4,
      emissiveIntensity: 1.5,
    });

    const busGeo = new THREE.CylinderGeometry(1.6, 1.85, 1.65, 8);
    const busMesh = new THREE.Mesh(busGeo, cryoShieldMat);
    busMesh.position.y = 1.85;
    busMesh.castShadow = !isSoftwareGl;
    landerGroup.add(busMesh);

    const dishGeo = new THREE.CylinderGeometry(1.1, 0.25, 0.55, 16);
    const dishMesh = new THREE.Mesh(dishGeo, steelMat);
    dishMesh.position.y = 3.15;
    landerGroup.add(dishMesh);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.25, 8);
    const padGeo = new THREE.CylinderGeometry(0.45, 0.55, 0.16, 12);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(Math.cos(a) * 1.85, 0.95, Math.sin(a) * 1.85);
      leg.rotation.z = Math.cos(a) * 0.45;
      leg.rotation.x = -Math.sin(a) * 0.45;
      landerGroup.add(leg);

      const pad = new THREE.Mesh(padGeo, cryoCyanMat);
      pad.position.set(Math.cos(a) * 2.45, 0.08, Math.sin(a) * 2.45);
      landerGroup.add(pad);
    }

    const mastGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8);
    const mast = new THREE.Mesh(mastGeo, steelMat);
    mast.position.y = 3.95;
    const beaconGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 4.55;
    landerGroup.add(mast, beacon);

    const padLight = new THREE.PointLight(0x38bdf8, 4.0, 24);
    padLight.position.set(0, 4.4, 0);
    landerGroup.add(padLight);
    scene.add(landerGroup);

    disposables.push(
      cryoShieldMat,
      steelMat,
      cryoCyanMat,
      beaconMat,
      busGeo,
      dishGeo,
      legGeo,
      padGeo,
      mastGeo,
      beaconGeo
    );

    // 5. Explorable 3D Europa Thermometry Beacons & Borehole Glow
    const siteVisuals: Record<
      string,
      {
        ringMat: THREE.MeshBasicMaterial;
        pillarMat: THREE.MeshBasicMaterial;
        ring: THREE.Mesh;
        probePin: THREE.Group;
      }
    > = {};

    const beaconRingGeo = new THREE.RingGeometry(2.5, 3.1, 32);
    beaconRingGeo.rotateX(-Math.PI / 2);
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.42, 7.2, 12, 1, true);
    const pinGeo = new THREE.CylinderGeometry(0.14, 0.08, 1.5, 10);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      metalness: 0.6,
    });
    disposables.push(beaconRingGeo, pillarGeo, pinGeo, pinMat);

    EUROPA_NODES.forEach((node) => {
      const cy = europaHeightAt(node.x, node.z);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(beaconRingGeo, ringMat);
      ring.position.set(node.x, cy + 0.18, node.z);
      scene.add(ring);

      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(node.x, cy + 3.7, node.z);
      scene.add(pillar);

      const probePin = new THREE.Group();
      probePin.position.set(node.x, cy + 0.75, node.z);
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      probePin.add(pinMesh);
      probePin.visible = false;
      scene.add(probePin);

      siteVisuals[node.spec.id] = { ringMat, pillarMat, ring, probePin };
      disposables.push(ringMat, pillarMat);
    });

    // 6. Composite 3D Cryo-Thermal Rover (Player Avatar)
    const roverGroup = new THREE.Group();
    const roverBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.5,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.35,
    });

    const chassisGeo = new THREE.BoxGeometry(1.45, 0.55, 2.05);
    const chassis = new THREE.Mesh(chassisGeo, cryoShieldMat);
    chassis.position.y = 0.72;
    chassis.castShadow = !isSoftwareGl;
    roverGroup.add(chassis);

    const deckGeo = new THREE.BoxGeometry(1.25, 0.24, 1.6);
    const deck = new THREE.Mesh(deckGeo, roverBodyMat);
    deck.position.y = 1.1;
    roverGroup.add(deck);

    // Extending Thermometer Drill Arm on Rover Front
    const drillArmGroup = new THREE.Group();
    drillArmGroup.position.set(0, 0.95, 1.05);
    const drillRodGeo = new THREE.CylinderGeometry(0.06, 0.04, 1.4, 8);
    const drillRod = new THREE.Mesh(drillRodGeo, cryoCyanMat);
    drillRod.position.set(0, -0.25, 0.35);
    drillRod.rotation.x = 0.65;
    drillArmGroup.add(drillRod);
    roverGroup.add(drillArmGroup);

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

    const headLight = new THREE.SpotLight(0x38bdf8, 5.5, 28, Math.PI / 4, 0.5);
    headLight.position.set(0, 1.85, 0.7);
    headLight.target.position.set(0, 0, 8);
    roverGroup.add(headLight, headLight.target);
    scene.add(roverGroup);

    disposables.push(roverBodyMat, wheelMat, chassisGeo, deckGeo, drillRodGeo, wheelGeo);

    // 7. Expanding 3D Thermometer Pulse Wave
    const scanWaveGeo = new THREE.RingGeometry(0.6, 1.15, 36);
    scanWaveGeo.rotateX(-Math.PI / 2);
    const scanWaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const scanWaveMesh = new THREE.Mesh(scanWaveGeo, scanWaveMat);
    scanWaveMesh.visible = false;
    scene.add(scanWaveMesh);
    disposables.push(scanWaveGeo, scanWaveMat);

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

      const k = keysRef.current;
      const dpad = dpadRef.current;
      const fwdInput =
        (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0) + dpad.fwd;
      const turnInput =
        (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) - (k['KeyD'] || k['ArrowRight'] ? 1 : 0) + dpad.turn;

      phys.yaw += turnInput * 2.15 * dt;
      const targetSpeed = fwdInput * 13.5;
      phys.speed += (targetSpeed - phys.speed) * Math.min(1, dt * 8);

      const nextX = phys.x + Math.sin(phys.yaw) * phys.speed * dt;
      const nextZ = phys.z + Math.cos(phys.yaw) * phys.speed * dt;
      if (Math.hypot(nextX, nextZ) < 74) {
        phys.x = nextX;
        phys.z = nextZ;
      }

      const gY = europaHeightAt(phys.x, phys.z);
      phys.vy -= 3.9 * dt; // Low Europa surface gravity (~0.134g)
      phys.y += phys.vy * dt;
      if (phys.y <= gY) {
        phys.y = gY;
        phys.vy = 0;
      }

      roverGroup.position.set(phys.x, phys.y, phys.z);
      roverGroup.rotation.y = phys.yaw;
      const hFront = europaHeightAt(
        phys.x + Math.sin(phys.yaw) * 0.9,
        phys.z + Math.cos(phys.yaw) * 0.9
      );
      const hBack = europaHeightAt(
        phys.x - Math.sin(phys.yaw) * 0.9,
        phys.z - Math.cos(phys.yaw) * 0.9
      );
      roverGroup.rotation.x = Math.atan2(hBack - hFront, 1.8) * 0.7;

      // Animate extending thermometer probe when drilling
      if (travelPhaseRef.current === 'drilling') {
        drillArmGroup.rotation.x = 0.55 + Math.sin(elapsed * 18) * 0.08;
      } else {
        drillArmGroup.rotation.x = 0;
      }

      phys.wheelAngle += phys.speed * dt * 2.2;
      wheelMeshes.forEach((wm) => {
        wm.rotation.x = phys.wheelAngle;
      });

      beaconMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 4.5) * 0.65;
      jupMesh.rotation.y = elapsed * 0.02;

      let closestNode: EuropaWorldNode | null = null;
      let closestDist = Infinity;
      for (const node of EUROPA_NODES) {
        const d = Math.hypot(phys.x - node.x, phys.z - node.z);
        if (d < node.radius + 4.5 && d < closestDist) {
          closestDist = d;
          closestNode = node;
        }
        const vis = siteVisuals[node.spec.id];
        const saved = collectedRef.current.find((r) => r.locationId === node.spec.id);
        const pulse = 1 + Math.sin(elapsed * 3.2 + node.x) * 0.08;
        vis.ring.scale.setScalar(pulse);
        if (saved) {
          vis.ringMat.color.setHex(0x34d399);
          vis.pillarMat.color.setHex(0x34d399);
          vis.pillarMat.opacity = 0.22;
          vis.probePin.visible = true;
          vis.probePin.rotation.y = elapsed * 0.8;
        } else {
          vis.ringMat.color.setHex(0xfbbf24);
          vis.pillarMat.color.setHex(0xfbbf24);
          vis.pillarMat.opacity = 0.26;
          vis.probePin.visible = false;
        }
      }

      if (scanPulseRef.current.active) {
        scanPulseRef.current.t += dt * 1.35;
        const st = scanPulseRef.current.t;
        if (st >= 1) {
          scanPulseRef.current.active = false;
          scanWaveMesh.visible = false;
        } else {
          scanWaveMesh.visible = true;
          const sy = europaHeightAt(scanPulseRef.current.x, scanPulseRef.current.z) + 0.35;
          scanWaveMesh.position.set(scanPulseRef.current.x, sy, scanPulseRef.current.z);
          scanWaveMesh.scale.setScalar(1 + st * 9.5);
          scanWaveMat.opacity = (1 - st) * 0.9;
        }
      }

      const camYaw = phys.yaw + camYawOffsetRef.current;
      const camDist = 9.2;
      const camHeight = 4.2 + camPitchRef.current * 6.5;
      const targetCamX = phys.x - Math.sin(camYaw) * camDist;
      const targetCamZ = phys.z - Math.cos(camYaw) * camDist;
      const groundAtCam = europaHeightAt(targetCamX, targetCamZ);
      const targetCamY = Math.max(groundAtCam + 1.6, phys.y + camHeight);

      camera.position.lerp(
        new THREE.Vector3(targetCamX, targetCamY, targetCamZ),
        Math.min(1, dt * 8)
      );
      camera.lookAt(phys.x, phys.y + 1.4, phys.z);

      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.08) {
        hudSyncAccum = 0;
        setRoverPos({ x: phys.x, z: phys.z, yaw: phys.yaw });
        setNearbyNode(closestNode);
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

  const nextUnscanned = useMemo(() => {
    const unscanned = EUROPA_NODES.filter(
      (n) => !collectedReadings.some((r) => r.locationId === n.spec.id)
    );
    const pool = unscanned.length > 0 ? unscanned : EUROPA_NODES;
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
  }, [collectedReadings, roverPos.x, roverPos.z]);

  const savedHere = probingLoc
    ? collectedReadings.find((r) => r.locationId === probingLoc.id) || null
    : null;

  return (
    <div className="max-w-[1360px] w-full mx-auto flex flex-col gap-3">
      {/* Compact Europa Surface Status Bar */}
      <div className="rounded-2xl bg-[#071124] border border-sky-400/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 text-[10px] font-mono-tech font-bold text-sky-300">
            🧊 EUROPA 3D SURFACE
          </span>
          <span className="font-display text-sm sm:text-base font-extrabold text-white">
            Drive &amp; Measure Surface Temperatures ({collectedReadings.length}/5)
          </span>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-sm min-w-[180px]">
          <span className="text-[11px] font-mono-tech font-bold text-slate-300 shrink-0">
            SITES SAVED
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#38bdf8] to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (collectedReadings.length / 5) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono-tech font-extrabold text-emerald-300 tabular-nums">
            {collectedReadings.length}/5
          </span>
        </div>

        <button
          type="button"
          disabled={collectedReadings.length < 5}
          onClick={() => {
            SFX.taskComplete();
            onTransmitToEarth();
          }}
          className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wide transition ${
            collectedReadings.length >= 5
              ? 'bg-gradient-to-r from-[#34d399] to-[#4fe3d4] text-[#031024] hover:brightness-110 cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.45)]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {collectedReadings.length >= 5
            ? 'TRANSMIT TO EARTH ▶'
            : `Need ${5 - collectedReadings.length} More`}
        </button>
      </div>

      {/* Main 3D Europa Surface Viewport + Thermometer Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-sky-400/35 bg-[#020816] min-h-[430px] h-[56vh] max-h-[600px]">
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
            <span className="px-2 py-1 rounded-lg bg-[#040d21]/85 border border-sky-400/35 text-sky-200">
              WASD / Arrows: Drive
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#040d21]/85 border border-sky-400/35 text-sky-200">
              Space: Low-G Hop
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#040d21]/85 border border-amber-400/35 text-amber-200">
              Drag: Look • [E] Measure
            </span>
          </div>

          {/* Top-Right Mini Europa Radar */}
          <div className="absolute top-3 right-3 w-32 h-32 rounded-full bg-[#040e22]/88 border-2 border-sky-400/45 shadow-[0_0_24px_rgba(0,0,0,0.65)] overflow-hidden">
            <svg viewBox="-82 -82 164 164" className="w-full h-full">
              <circle cx="0" cy="0" r="76" stroke="#1e3a5f" strokeWidth="1" fill="none" />
              <circle cx="0" cy="0" r="42" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="3 3" fill="none" />
              {/* Lander at 0,0 */}
              <polygon points="0,-5 5,4 -5,4" fill="#38bdf8" />
              {EUROPA_NODES.map((n) => {
                const saved = collectedReadings.find((r) => r.locationId === n.spec.id);
                return (
                  <circle
                    key={n.spec.id}
                    cx={n.x}
                    cy={n.z}
                    r={saved ? 5 : 4.5}
                    fill={saved ? '#34d399' : '#f59e0b'}
                    stroke="#040d1d"
                    strokeWidth="1"
                  />
                );
              })}
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
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-black text-white cursor-pointer"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.turn = 1)}
              onPointerUp={() => (dpadRef.current.turn = 0)}
              onPointerLeave={() => (dpadRef.current.turn = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-black text-white cursor-pointer"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.fwd = -1)}
              onPointerUp={() => (dpadRef.current.fwd = 0)}
              onPointerLeave={() => (dpadRef.current.fwd = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-black text-white cursor-pointer"
            >
              ▼
            </button>
            <button
              type="button"
              onPointerDown={() => (dpadRef.current.turn = -1)}
              onPointerUp={() => (dpadRef.current.turn = 0)}
              onPointerLeave={() => (dpadRef.current.turn = 0)}
              className="h-8 rounded-lg bg-[#07152e]/85 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-black text-white cursor-pointer"
            >
              ▶
            </button>
          </div>

          {/* Bottom-Center Context Prompt */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {nearbyNode ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => triggerMeasureNode(nearbyNode)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#38bdf8] to-emerald-400 text-[#031024] font-extrabold text-xs sm:text-sm uppercase tracking-wide shadow-[0_0_24px_rgba(56,189,248,0.55)] hover:brightness-110 cursor-pointer animate-pulse whitespace-nowrap"
              >
                {probeTravelPhase === 'drilling'
                  ? '🌡️ Drilling Cryo Thermometer...'
                  : `[E] MEASURE ${nearbyNode.spec.name.toUpperCase()}`}
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-[#040e22]/90 border border-amber-400/40 text-xs font-mono-tech font-bold text-amber-200 flex items-center gap-2 whitespace-nowrap">
                <span>🧭</span>
                <span>
                  {nextUnscanned.node.spec.name} ({nextUnscanned.dist}m)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Probe Thermometer Console + 5 Quick Site Waypoints */}
        <aside className="lg:col-span-4 rounded-2xl bg-[#07142b] border border-sky-400/35 p-4 flex flex-col justify-between gap-3">
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-mono-tech uppercase tracking-widest text-sky-300 font-bold">
                PROBE THERMOMETER CONSOLE
              </div>
              <h3 className="font-display text-base font-extrabold text-white mt-0.5">
                {probingLoc ? probingLoc.name : 'Drive to Any Europa Beacon'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {probingLoc
                  ? probingLoc.regionType
                  : 'Drive the cryo-rover or click Drive To on any site below.'}
              </p>
            </div>

            {probeTravelPhase === 'moving' && (
              <div className="p-3.5 rounded-xl bg-[#040d1e] border border-sky-400/30 text-center text-xs text-sky-200 font-mono-tech animate-pulse">
                ROVER MOVING TO {probingLoc?.name.toUpperCase()}...
              </div>
            )}

            {probeTravelPhase === 'drilling' && (
              <div className="p-3.5 rounded-xl bg-[#040d1e] border border-cyan-400/40 text-center text-xs text-cyan-200 font-mono-tech animate-pulse">
                EXTENDING THERMOMETER INTO ICE CRUST...
              </div>
            )}

            {probeTravelPhase === 'measured' && activeMeasuredTempC !== null && probingLoc && (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-[#040d1e] border border-sky-400/35 text-center">
                  <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                    Measured Temperature
                  </div>
                  <div
                    className="font-mono-tech text-3xl font-black tabular-nums mt-0.5"
                    style={{ color: getTempColor(activeMeasuredTempC) }}
                  >
                    {activeMeasuredTempC}°C
                  </div>
                  <div className="text-[11px] font-mono-tech text-slate-300 tabular-nums">
                    {celsiusToKelvin(activeMeasuredTempC)} Kelvin
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-900 mt-2.5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          10,
                          Math.min(100, ((activeMeasuredTempC + 230) / 110) * 100)
                        )}%`,
                        backgroundColor: getTempColor(activeMeasuredTempC),
                      }}
                    />
                  </div>
                </div>

                {activeDriftC !== 0 && !sensorStabilizedHere && (
                  <div className="p-2.5 rounded-xl bg-amber-950/75 border border-amber-400 text-xs text-amber-200 space-y-1.5">
                    <div>⚠ Thermocouple drift (±{Math.abs(activeDriftC)}°C noise).</div>
                    <button
                      type="button"
                      onClick={onStabilizeSensor}
                      className="w-full py-1.5 rounded-lg bg-amber-400 text-[#031024] font-extrabold text-[11px] uppercase cursor-pointer"
                    >
                      RE-ZERO &amp; STABILIZE SENSOR
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onSaveReading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#34d399] to-[#4fe3d4] text-[#031024] font-extrabold text-xs uppercase tracking-wide hover:brightness-110 cursor-pointer"
                >
                  {savedHere ? `UPDATE READING (${probingLoc.name}) ✓` : `SAVE READING (${probingLoc.name}) ✓`}
                </button>
              </div>
            )}

            {/* 5 Europa Surface Spots */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-400 font-bold">
                EUROPA SITES (DRIVE OR WARP)
              </div>
              <div className="space-y-1.5 max-h-[245px] overflow-y-auto pr-0.5">
                {EUROPA_NODES.map((node) => {
                  const rec = collectedReadings.find((r) => r.locationId === node.spec.id);
                  const dist = Math.round(Math.hypot(node.x - roverPos.x, node.z - roverPos.z));
                  const isNear = nearbyNode?.spec.id === node.spec.id;
                  return (
                    <div
                      key={node.spec.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                        isNear
                          ? 'bg-sky-500/18 border-sky-300'
                          : rec
                          ? 'bg-emerald-950/40 border-emerald-400/45'
                          : 'bg-[#040d1e] border-white/10'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {rec ? '✓ ' : ''}
                          {node.spec.name}
                        </div>
                        <div className="text-[10px] font-mono-tech text-slate-400">
                          {rec ? `${rec.measuredTempC}°C (${celsiusToKelvin(rec.measuredTempC)} K)` : `${dist}m away`}
                        </div>
                      </div>
                      {isNear ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => triggerMeasureNode(node)}
                          className="px-2.5 py-1 rounded-lg bg-[#4fe3d4] text-[#041022] text-[10px] font-black uppercase cursor-pointer shrink-0"
                        >
                          Measure
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleWarpToSite(node)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-sky-500/25 border border-white/15 text-[10px] font-bold text-sky-200 cursor-pointer shrink-0 disabled:opacity-50"
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
