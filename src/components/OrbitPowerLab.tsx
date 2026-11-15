import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SFX } from '../utils/sfx';
import { OrbitPowerEngineerBadgeSVG } from './BadgesSVG';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

export interface Level3RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  newStarBalance: number;
}

export interface Level3CompletionPayload {
  solarCapacityW: number;
  batteryCapacityWh: number;
  enteredShadow: boolean;
  exitedShadow: boolean;
  minBatteryWh: number;
  finalBatteryWh: number;
}

interface OrbitPowerLabProps {
  visible: boolean;
  starCredits: number;
  alreadyCompleted: boolean;
  onCompleteMission: (payload: Level3CompletionPayload) => Promise<Level3RewardResult>;
  onContinueToLevel4: () => void;
  onBackToAcademy: () => void;
  onExit: () => void;
  onOpenHandbook?: () => void;
}

interface BatteryOption {
  id: 'small' | 'medium' | 'large';
  name: string;
  capacityWh: 300 | 500 | 800;
  costLabel: 'Low' | 'Medium' | 'High';
  costCredits: number;
  massKg: number;
  tag: string;
}

const BATTERY_OPTIONS: BatteryOption[] = [
  {
    id: 'small',
    name: 'SMALL BATTERY',
    capacityWh: 300,
    costLabel: 'Low',
    costCredits: 1200,
    massKg: 18,
    tag: 'Light reserve cell',
  },
  {
    id: 'medium',
    name: 'MEDIUM BATTERY',
    capacityWh: 500,
    costLabel: 'Medium',
    costCredits: 2400,
    massKg: 30,
    tag: 'Balanced orbital pack',
  },
  {
    id: 'large',
    name: 'LARGE BATTERY',
    capacityWh: 800,
    costLabel: 'High',
    costCredits: 4000,
    massKg: 48,
    tag: 'Deep eclipse bank',
  },
];

const SATELLITE_CONSUMPTION_W = 110;
const BASE_BUS_MASS_KG = 64;
const ORBIT_PERIOD_SEC = 32; // Full circle in 32s -> ~8.8s full eclipse shadow
const SIM_HOURS_PER_SEC = 0.37; // 8.8s * 0.37 h/s * 110W ≈ 358 Wh eclipse demand
const INITIAL_CHARGE_RATIO = 0.65;

// Stylized world landmass ellipses [lonDeg (-180..180), latDeg (-75..75), rxDeg, ryDeg, color]
const CONTINENT_BLOBS: [number, number, number, number, string][] = [
  [-105, 42, 26, 18, '#22c55e'],
  [-92, 22, 16, 14, '#16a34a'],
  [-62, -16, 18, 22, '#22c55e'],
  [-55, -36, 10, 14, '#15803d'],
  [12, 49, 20, 11, '#22c55e'],
  [22, 14, 21, 18, '#4ade80'],
  [26, -15, 14, 18, '#16a34a'],
  [78, 48, 36, 16, '#22c55e'],
  [98, 26, 24, 16, '#4ade80'],
  [136, -24, 17, 13, '#84cc16'],
  [-42, 71, 14, 7, '#e2e8f0'],
];

const STAR_SEEDS = Array.from({ length: 110 }, (_, i) => ({
  x: ((i * 73 + 19) % 997) / 997,
  y: ((i * 151 + 41) % 991) / 991,
  r: 0.7 + ((i * 29) % 10) * 0.16,
  phase: i * 0.65,
}));

const ConfettiCanvas: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const colors = ['#4fe3d4', '#38bdf8', '#fbbf24', '#34d399', '#ffffff'];
    const pts = Array.from({ length: 95 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 2.8,
      vy: 2 + Math.random() * 3.5,
      s: 4 + Math.random() * 5,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.14,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > c.height + 20) {
          p.y = -15;
          p.x = Math.random() * c.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.65);
        ctx.restore();
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-[5550]" />;
};

const BatteryIconSVG: React.FC<{ optionId: BatteryOption['id']; active: boolean }> = ({
  optionId,
  active,
}) => {
  const accent = optionId === 'small' ? '#fbbf24' : optionId === 'medium' ? '#38bdf8' : '#34d399';
  const cellStroke = optionId === 'small' ? '#d97706' : optionId === 'medium' ? '#0284c7' : '#059669';
  const cellCount = optionId === 'small' ? 2 : optionId === 'medium' ? 4 : 6;
  const packWidth = optionId === 'small' ? 38 : optionId === 'medium' ? 56 : 74;
  const startX = (92 - packWidth) / 2;

  return (
    <svg width="88" height="58" viewBox="0 0 92 58" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`batBody-${optionId}`} x1="0" y1="8" x2="0" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#081326" />
        </linearGradient>
        <linearGradient id={`batCell-${optionId}`} x1="0" y1="18" x2="0" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={cellStroke} />
        </linearGradient>
      </defs>

      {/* Positive / Negative High-Voltage Spacecraft Terminals */}
      <rect x={startX + 6} y="6" width="8" height="6" rx="1.5" fill="#ef4444" stroke="#fca5a5" strokeWidth="0.8" />
      <rect x={startX + packWidth - 14} y="6" width="8" height="6" rx="1.5" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="0.8" />

      {/* Orange HV Busbar Arc */}
      <path
        d={`M ${startX + 10} 11 C ${startX + 18} 3, ${startX + packWidth - 18} 3, ${startX + packWidth - 10} 11`}
        stroke="#f97316"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Main Titanium Battery Module Housing */}
      <rect
        x={startX}
        y="12"
        width={packWidth}
        height="40"
        rx="5"
        fill={`url(#batBody-${optionId})`}
        stroke={active ? '#4fe3d4' : '#64748b'}
        strokeWidth={active ? '2.2' : '1.5'}
      />

      {/* Side Mounting Flanges */}
      <rect x={startX - 3} y="22" width="3" height="20" rx="1" fill="#475569" />
      <rect x={startX + packWidth} y="22" width="3" height="20" rx="1" fill="#475569" />

      {/* Li-Ion Power Cells */}
      {Array.from({ length: cellCount }).map((_, idx) => {
        const innerPad = 6;
        const gap = 3;
        const cellW = (packWidth - innerPad * 2 - gap * (cellCount - 1)) / cellCount;
        const cx = startX + innerPad + idx * (cellW + gap);
        return (
          <g key={idx}>
            <rect
              x={cx}
              y="19"
              width={cellW}
              height="26"
              rx="2"
              fill={`url(#batCell-${optionId})`}
              stroke="#0f172a"
              strokeWidth="0.8"
            />
            <rect
              x={cx + cellW * 0.22}
              y="16.5"
              width={cellW * 0.56}
              height="2.5"
              rx="0.8"
              fill="#fbbf24"
            />
            {/* Specular highlight */}
            <rect
              x={cx + 1.2}
              y="21"
              width={Math.max(1.2, cellW * 0.25)}
              height="21"
              rx="0.8"
              fill="#ffffff"
              opacity="0.32"
            />
          </g>
        );
      })}

      {/* Bottom Telemetry Status Strip */}
      <rect x={startX + 6} y="47" width={packWidth - 12} height="2.4" rx="1.2" fill={active ? '#4fe3d4' : accent} opacity="0.85" />
    </svg>
  );
};

export const OrbitPowerLab: React.FC<OrbitPowerLabProps> = ({
  visible,
  starCredits,
  alreadyCompleted,
  onCompleteMission,
  onContinueToLevel4,
  onBackToAcademy,
  onExit,
  onOpenHandbook,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Configuration State
  const [configOpen, setConfigOpen] = useState<boolean>(true);
  const [solarW, setSolarW] = useState<number>(150);
  const [solarConfigured, setSolarConfigured] = useState<boolean>(false);
  const [selectedBatteryId, setSelectedBatteryId] = useState<BatteryOption['id'] | null>(null);
  const selectedBattery = useMemo(
    () => BATTERY_OPTIONS.find((b) => b.id === selectedBatteryId) ?? null,
    [selectedBatteryId]
  );

  // Orbit Placement & Simulation Lifecycle State
  const [inOrbit, setInOrbit] = useState<boolean>(false);
  const [orbitAngle, setOrbitAngle] = useState<number>(Math.PI * 0.85);
  const [simStatus, setSimStatus] = useState<
    'setup' | 'running' | 'paused' | 'failed' | 'completed'
  >('setup');
  const [restartConfirmOpen, setRestartConfirmOpen] = useState<boolean>(false);

  // Placement & Status Feedback Banner
  const [feedback, setFeedback] = useState<{
    title: string;
    detail: string;
    tone: 'cyan' | 'green' | 'amber' | 'red';
  } | null>({
    title: 'ORBIT & POWER MISSION READY',
    detail: 'Click the floating satellite to configure power, then drag it into the glowing circular orbit.',
    tone: 'cyan',
  });

  // Live Telemetry
  const [batteryWh, setBatteryWh] = useState<number>(0);
  const [isInShadow, setIsInShadow] = useState<boolean>(false);
  const [simElapsedSec, setSimElapsedSec] = useState<number>(0);
  const [orbitalProgressPct, setOrbitalProgressPct] = useState<number>(0);
  const [sunlightRestoredBanner, setSunlightRestoredBanner] = useState<boolean>(false);
  const [eclipseSurvivedBanner, setEclipseSurvivedBanner] = useState<boolean>(false);
  const [rewardOutcome, setRewardOutcome] = useState<Level3RewardResult | null>(null);
  const [showEntryBriefing, setShowEntryBriefing] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      setShowEntryBriefing(true);
    } else {
      setShowEntryBriefing(false);
    }
  }, [visible]);

  // Audio Controls
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());
  const [volume, setVolume] = useState<number>(() => Math.round(SFX.getVolume() * 100));
  const ambienceRef = useRef<{
    setMuted: (m: boolean) => void;
    setVolume: (v: number) => void;
    stop: () => void;
  } | null>(null);

  // Canvas & Drag Geometry Refs
  const geomRef = useRef({
    cx: 400,
    cy: 280,
    rEarth: 98,
    rOrbit: 132,
    floatX: 170,
    floatY: 120,
    satX: 170,
    satY: 120,
  });
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    hoverValidOrbit: boolean | null;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
    hoverValidOrbit: null,
  });

  // Mutable Simulation Refs for 60fps loop accuracy
  const selectedBatteryRef = useRef<BatteryOption | null>(selectedBattery);
  selectedBatteryRef.current = selectedBattery;
  const orbitAngleRef = useRef<number>(orbitAngle);
  orbitAngleRef.current = orbitAngle;
  const onCompleteMissionRef = useRef(onCompleteMission);
  onCompleteMissionRef.current = onCompleteMission;
  const prevVisibleRef = useRef<boolean>(false);

  const simStateRef = useRef({
    simStatus: 'setup' as 'setup' | 'running' | 'paused' | 'failed' | 'completed',
    inOrbit: false,
    orbitAngle: Math.PI * 0.85,
    orbitProgressAccum: 0,
    earthRotDeg: -35,
    solarW: 150,
    batteryCapacityWh: 0,
    batteryWh: 0,
    minBatteryWh: 9999,
    simElapsedSec: 0,
    wasInShadow: false,
    seenSunlit: false,
    enteredShadowFromSun: false,
    shadowTimerSec: 0,
    exitedShadow: false,
    completionQueued: false,
    lowBeepAccum: 0,
  });

  // Keep synchronous refs updated
  simStateRef.current.simStatus = simStatus;
  simStateRef.current.inOrbit = inOrbit;
  simStateRef.current.solarW = solarW;
  simStateRef.current.batteryCapacityWh = selectedBattery?.capacityWh ?? 0;

  // Compute satellite engineering specs (Solar panel mass, total mass, and estimated cost)
  const specs = useMemo(() => {
    const panelMass = Math.round(solarW * 0.14);
    const panelCost = solarW * 12;
    const batMass = selectedBattery?.massKg ?? 0;
    const batCost = selectedBattery?.costCredits ?? 0;
    return {
      panelMass,
      panelCost,
      batMass,
      batCost,
      totalMassKg: BASE_BUS_MASS_KG + panelMass + batMass,
      totalCost: 2200 + panelCost + batCost,
    };
  }, [solarW, selectedBattery]);

  // Reset entire state when Level 3 opens (uses ref so battery clicks never re-trigger reset)
  const resetSimulationState = useCallback((preserveConfig = false) => {
    ambienceRef.current?.stop();
    ambienceRef.current = null;
    if (!preserveConfig) {
      setSolarW(150);
      setSolarConfigured(false);
      setSelectedBatteryId(null);
      setConfigOpen(true);
    }
    const cap = preserveConfig ? selectedBatteryRef.current?.capacityWh ?? 0 : 0;
    const initWh = Math.round(cap * INITIAL_CHARGE_RATIO);

    setInOrbit(false);
    setOrbitAngle(Math.PI * 0.85);
    orbitAngleRef.current = Math.PI * 0.85;
    setSimStatus('setup');
    setRestartConfirmOpen(false);
    setBatteryWh(initWh);
    setIsInShadow(false);
    setSimElapsedSec(0);
    setOrbitalProgressPct(0);
    setSunlightRestoredBanner(false);
    setEclipseSurvivedBanner(false);
    setRewardOutcome(null);

    simStateRef.current = {
      ...simStateRef.current,
      simStatus: 'setup',
      inOrbit: false,
      orbitAngle: Math.PI * 0.85,
      orbitProgressAccum: 0,
      batteryCapacityWh: cap,
      batteryWh: initWh,
      minBatteryWh: initWh || 9999,
      simElapsedSec: 0,
      wasInShadow: false,
      seenSunlit: false,
      enteredShadowFromSun: false,
      shadowTimerSec: 0,
      exitedShadow: false,
      completionQueued: false,
      lowBeepAccum: 0,
    };

    setFeedback({
      title: preserveConfig ? 'CONFIGURATION UNLOCKED' : 'ORBIT & POWER MISSION READY',
      detail: preserveConfig
        ? 'Adjust solar panels & battery, then drag your satellite onto the cyan circular orbit.'
        : 'Click the floating satellite to open power configuration, then drag it into circular orbit.',
      tone: 'cyan',
    });
  }, []);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      resetSimulationState(false);
    } else if (!visible) {
      ambienceRef.current?.stop();
      ambienceRef.current = null;
    }
    prevVisibleRef.current = visible;
    return () => {
      ambienceRef.current?.stop();
      ambienceRef.current = null;
    };
  }, [visible, resetSimulationState]);

  // Update initial battery charge whenever battery selection changes before orbit starts
  const handleSelectBattery = useCallback(
    (opt: BatteryOption) => {
      if (simStatus !== 'setup') return;
      SFX.select();
      setSelectedBatteryId(opt.id);
      const initWh = Math.round(opt.capacityWh * INITIAL_CHARGE_RATIO);
      setBatteryWh(initWh);
      simStateRef.current.batteryCapacityWh = opt.capacityWh;
      simStateRef.current.batteryWh = initWh;
      simStateRef.current.minBatteryWh = initWh;
      setFeedback({
        title: `${opt.name} SELECTED (${opt.capacityWh} Wh)`,
        detail: `Initial pre-launch charge: ${initWh} Wh (${Math.round(INITIAL_CHARGE_RATIO * 100)}%).`,
        tone: 'cyan',
      });
    },
    [simStatus]
  );

  const handleSolarChange = useCallback(
    (val: number) => {
      if (simStatus !== 'setup') return;
      setSolarW(val);
      setSolarConfigured(true);
      simStateRef.current.solarW = val;
      SFX.sliderTick((val - 50) / 200);
    },
    [simStatus]
  );

  // Helper: check if orbital angle is in Earth's shadow (Sun is on the LEFT, light travels -> RIGHT)
  const checkAngleInShadow = (ang: number, rEarth: number, rOrbit: number): boolean => {
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    // Right hemisphere behind Earth & inside cylindrical umbra
    return cosA > 0 && Math.abs(rOrbit * sinA) < rEarth;
  };

  // Start Orbital Simulation
  const canStartOrbit = solarConfigured && selectedBattery !== null && inOrbit && simStatus === 'setup';

  const handleStartOrbit = useCallback(() => {
    if (!canStartOrbit || !selectedBattery) return;
    const initWh = Math.round(selectedBattery.capacityWh * INITIAL_CHARGE_RATIO);
    const g = geomRef.current;
    const startShadow = checkAngleInShadow(orbitAngle, g.rEarth, g.rOrbit);

    simStateRef.current = {
      ...simStateRef.current,
      simStatus: 'running',
      inOrbit: true,
      orbitAngle,
      orbitProgressAccum: 0,
      solarW,
      batteryCapacityWh: selectedBattery.capacityWh,
      batteryWh: initWh,
      minBatteryWh: initWh,
      simElapsedSec: 0,
      wasInShadow: startShadow,
      seenSunlit: !startShadow,
      enteredShadowFromSun: false,
      shadowTimerSec: 0,
      exitedShadow: false,
      completionQueued: false,
      lowBeepAccum: 0,
    };

    setBatteryWh(initWh);
    setSimElapsedSec(0);
    setOrbitalProgressPct(0);
    setIsInShadow(startShadow);
    setConfigOpen(false);
    setSimStatus('running');
    SFX.orbitStart();
    ambienceRef.current?.stop();
    ambienceRef.current = SFX.createSpaceAmbience();

    setFeedback({
      title: startShadow ? "SATELLITE ENTERED EARTH'S SHADOW" : 'SUNLIGHT DETECTED',
      detail: startShadow
        ? "Your satellite has entered Earth's shadow. Solar power generation has stopped (0 W). Battery power is now being used."
        : solarW > SATELLITE_CONSUMPTION_W
        ? `Solar panels are receiving sunlight. Power generation: ${solarW} W. Battery status: CHARGING.`
        : `Solar panels receiving sunlight (${solarW} W), below 110 W consumption — battery discharging slowly.`,
      tone: startShadow ? 'amber' : solarW > SATELLITE_CONSUMPTION_W ? 'green' : 'amber',
    });
  }, [canStartOrbit, orbitAngle, selectedBattery, solarW]);

  const handlePauseResume = useCallback(() => {
    if (simStatus === 'running') {
      SFX.click();
      setSimStatus('paused');
      simStateRef.current.simStatus = 'paused';
      ambienceRef.current?.stop();
      ambienceRef.current = null;
    } else if (simStatus === 'paused') {
      SFX.click();
      setSimStatus('running');
      simStateRef.current.simStatus = 'running';
      ambienceRef.current = SFX.createSpaceAmbience();
    }
  }, [simStatus]);

  const handleRedesign = useCallback(() => {
    SFX.click();
    resetSimulationState(true);
    setConfigOpen(true);
  }, [resetSimulationState]);

  const handleToggleMute = useCallback(() => {
    const next = SFX.toggleMute();
    setMuted(next);
    ambienceRef.current?.setMuted(next);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    setVolume(pct);
    const norm = pct / 100;
    SFX.setVolume(norm);
    ambienceRef.current?.setVolume(norm);
    if (pct > 0 && SFX.isMuted()) {
      const m = SFX.setMuted(false);
      setMuted(m);
      ambienceRef.current?.setMuted(m);
    }
  }, []);

  // Main 60FPS Space Environment Render + Physics Simulation Loop
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let uiSyncAccum = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      // Dynamic geometry layout
      const cx = w * 0.52;
      const cy = h * 0.5;
      const minDim = Math.min(w, h);
      const rEarth = Math.max(66, Math.min(134, minDim * 0.24));
      const rOrbit = rEarth * 1.32; // Low Earth Orbit: ~27.4% eclipse behind Earth
      const floatX = Math.max(76, cx - rOrbit - 82);
      const floatY = Math.max(88, cy - rOrbit * 0.72);

      const s = simStateRef.current;

      // 1. Update Earth Rotation & Orbital Physics
      const isPaused = s.simStatus === 'paused' || s.simStatus === 'failed';
      if (!isPaused) {
        s.earthRotDeg = (s.earthRotDeg + dt * 11) % 360;
      }

      const angularSpeed = (Math.PI * 2) / ORBIT_PERIOD_SEC;
      if (s.simStatus === 'running') {
        s.simElapsedSec += dt;
        s.orbitAngle = (s.orbitAngle + angularSpeed * dt) % (Math.PI * 2);
        s.orbitProgressAccum += angularSpeed * dt;

        const shadowNow = checkAngleInShadow(s.orbitAngle, rEarth, rOrbit);
        if (!shadowNow) {
          s.seenSunlit = true;
        }
        if (shadowNow && !s.wasInShadow) {
          s.wasInShadow = true;
          if (s.seenSunlit) {
            s.enteredShadowFromSun = true;
          }
          s.shadowTimerSec = 0;
          SFX.eclipseEnter();
          setIsInShadow(true);
          setFeedback({
            title: "SATELLITE ENTERED EARTH'S SHADOW",
            detail:
              "Your satellite has entered Earth's shadow. Solar power generation has stopped (0 W). Battery power is now being used.",
            tone: 'amber',
          });
        }

        if (shadowNow) {
          s.shadowTimerSec += dt;
        }

        // Strict energy math: never auto-fill!
        const solarGenNow = shadowNow ? 0 : s.solarW;
        const netPowerW = solarGenNow - SATELLITE_CONSUMPTION_W;
        const dtSimHours = dt * SIM_HOURS_PER_SEC;
        s.batteryWh = Math.max(0, Math.min(s.batteryCapacityWh, s.batteryWh + netPowerW * dtSimHours));
        s.minBatteryWh = Math.min(s.minBatteryWh, s.batteryWh);

        // Low-battery alarm beep (<20%)
        const pctNow = s.batteryCapacityWh > 0 ? s.batteryWh / s.batteryCapacityWh : 0;
        if (pctNow > 0 && pctNow < 0.2) {
          s.lowBeepAccum += dt;
          if (s.lowBeepAccum >= 1.3) {
            s.lowBeepAccum = 0;
            SFX.lowBatteryBeep();
          }
        } else {
          s.lowBeepAccum = 0;
        }

        // Failure condition: battery reaches 0
        if (s.batteryWh <= 0.01) {
          s.batteryWh = 0;
          s.simStatus = 'failed';
          setBatteryWh(0);
          setSimStatus('failed');
          ambienceRef.current?.stop();
          ambienceRef.current = null;
          SFX.powerFailure();
          setFeedback({
            title: 'MISSION FAILED – POWER FAILURE',
            detail: "Your satellite could not survive Earth's shadow because its battery capacity was insufficient.",
            tone: 'red',
          });
        } else if (s.wasInShadow && !shadowNow) {
          // Exited Earth shadow back into sunlight!
          s.wasInShadow = false;
          setIsInShadow(false);
          SFX.sunlightRestored();

          if (s.enteredShadowFromSun && s.shadowTimerSec >= 4.2 && !s.completionQueued) {
            // Full eclipse survived!
            s.completionQueued = true;
            s.exitedShadow = true;
            setSunlightRestoredBanner(true);
            setFeedback({
              title: 'SUNLIGHT RESTORED!',
              detail:
                "Your satellite has exited Earth's shadow. Solar power generation has resumed, and the battery is being recharged.",
              tone: 'green',
            });

            const finalSnapshot: Level3CompletionPayload = {
              solarCapacityW: s.solarW,
              batteryCapacityWh: s.batteryCapacityWh,
              enteredShadow: true,
              exitedShadow: true,
              minBatteryWh: Math.round(s.minBatteryWh * 10) / 10,
              finalBatteryWh: Math.round(s.batteryWh * 10) / 10,
            };

            window.setTimeout(() => {
              setEclipseSurvivedBanner(true);
            }, 650);

            window.setTimeout(() => {
              s.simStatus = 'completed';
              setSimStatus('completed');
              ambienceRef.current?.stop();
              ambienceRef.current = null;
              SFX.levelComplete();
              window.setTimeout(() => SFX.badgeUnlock(), 220);
              void onCompleteMissionRef.current(finalSnapshot).then((res) => {
                setRewardOutcome(res);
              });
            }, 2000);
          } else {
            // Exited initial shadow segment (if dropped inside shadow); must survive full eclipse next!
            setFeedback({
              title: 'SUNLIGHT DETECTED',
              detail:
                s.solarW > SATELLITE_CONSUMPTION_W
                  ? `Solar panels are receiving sunlight. Power generation: ${s.solarW} W. Battery status: CHARGING.`
                  : `Solar panels below ${SATELLITE_CONSUMPTION_W} W load — battery still draining!`,
              tone: s.solarW > SATELLITE_CONSUMPTION_W ? 'green' : 'amber',
            });
          }
        }

        uiSyncAccum += dt;
        if (uiSyncAccum >= 0.08) {
          uiSyncAccum = 0;
          setBatteryWh(s.batteryWh);
          setSimElapsedSec(s.simElapsedSec);
          setOrbitalProgressPct(
            Math.min(100, Math.round(((s.orbitProgressAccum % (Math.PI * 2)) / (Math.PI * 2)) * 100))
          );
          setOrbitAngle(s.orbitAngle);
          setIsInShadow(shadowNow);
        }
      } else if (s.simStatus === 'completed') {
        s.orbitAngle = (s.orbitAngle + angularSpeed * 0.45 * dt) % (Math.PI * 2);
      }

      // Compute active satellite screen coordinates
      let satX = floatX;
      let satY = floatY + Math.sin(now * 0.0028) * 7;
      if (dragRef.current.active && dragRef.current.moved) {
        satX = dragRef.current.curX;
        satY = dragRef.current.curY;
      } else if (s.inOrbit) {
        const ang = s.simStatus === 'setup' ? orbitAngleRef.current : s.orbitAngle;
        satX = cx + Math.cos(ang) * rOrbit;
        satY = cy + Math.sin(ang) * rOrbit;
      }
      geomRef.current = { cx, cy, rEarth, rOrbit, floatX, floatY, satX, satY };

      const satInShadowVisual =
        s.inOrbit && !dragRef.current.active
          ? checkAngleInShadow(s.simStatus === 'setup' ? orbitAngleRef.current : s.orbitAngle, rEarth, rOrbit)
          : false;

      // ======================================================
      // 2. DRAW DEEP SPACE BACKDROP & STARS
      // ======================================================
      const bgGrad = ctx.createRadialGradient(w * 0.08, cy, 20, cx, cy, w * 0.9);
      bgGrad.addColorStop(0, '#101d3b');
      bgGrad.addColorStop(0.45, '#050b1c');
      bgGrad.addColorStop(1, '#020510');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      STAR_SEEDS.forEach((st, idx) => {
        const twinkle = 0.45 + 0.55 * Math.sin(now * 0.002 + st.phase);
        ctx.fillStyle = idx % 4 === 0 ? '#fde68a' : idx % 3 === 0 ? '#bae6fd' : '#ffffff';
        ctx.globalAlpha = twinkle * 0.8;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ======================================================
      // 3. DRAW VISIBLE SUN ON LEFT SIDE & DIRECTIONAL SUNRAYS
      // ======================================================
      const sunX = -rEarth * 0.25;
      const sunY = cy;
      const sunCorona = ctx.createRadialGradient(sunX, sunY, rEarth * 0.35, sunX, sunY, rEarth * 2.5);
      sunCorona.addColorStop(0, 'rgba(255, 250, 210, 0.95)');
      sunCorona.addColorStop(0.22, 'rgba(251, 191, 36, 0.55)');
      sunCorona.addColorStop(0.55, 'rgba(245, 158, 11, 0.14)');
      sunCorona.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunCorona;
      ctx.beginPath();
      ctx.arc(sunX, sunY, rEarth * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Sun Limb Edge Visible on the Left
      const sunCore = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, rEarth * 0.62);
      sunCore.addColorStop(0, '#ffffff');
      sunCore.addColorStop(0.6, '#fef08a');
      sunCore.addColorStop(1, '#f59e0b');
      ctx.fillStyle = sunCore;
      ctx.beginPath();
      ctx.arc(sunX, sunY, rEarth * 0.62, 0, Math.PI * 2);
      ctx.fill();

      // Sunbeams travelling Left -> Right (clipped out behind Earth's shadow cone!)
      ctx.save();
      for (let i = -3; i <= 3; i++) {
        const ry = cy + i * (rEarth * 0.34);
        const stopsBehindEarth = Math.abs(ry - cy) < rEarth;
        const endX = stopsBehindEarth ? cx : w * 0.95;
        const rayGrad = ctx.createLinearGradient(0, ry, endX, ry);
        rayGrad.addColorStop(0, 'rgba(254, 240, 138, 0.24)');
        rayGrad.addColorStop(0.65, 'rgba(253, 224, 71, 0.08)');
        rayGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -(now * 0.035);
        ctx.beginPath();
        ctx.moveTo(16, ry);
        ctx.lineTo(endX, ry);
        ctx.stroke();
      }
      ctx.restore();

      // ======================================================
      // 4. EARTH'S SHADOW CONE (ECLIPSE ZONE TO RIGHT OF EARTH)
      // ======================================================
      const shadowGrad = ctx.createLinearGradient(cx, cy, cx + rOrbit * 1.65, cy);
      shadowGrad.addColorStop(0, 'rgba(2, 6, 20, 0.82)');
      shadowGrad.addColorStop(0.65, 'rgba(2, 6, 22, 0.58)');
      shadowGrad.addColorStop(1, 'rgba(2, 6, 22, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rEarth, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx + rOrbit * 1.65, cy + rEarth * 1.04);
      ctx.lineTo(cx + rOrbit * 1.65, cy - rEarth * 1.04);
      ctx.closePath();
      ctx.fill();

      // Subtle Shadow Label inside eclipse arc
      ctx.save();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText("EARTH'S SHADOW", cx + rOrbit + 14, cy + 4);
      ctx.restore();

      // ======================================================
      // 5. CIRCULAR ORBITAL PATH AROUND EARTH
      // ======================================================
      ctx.save();
      const hoverStatus = dragRef.current.active ? dragRef.current.hoverValidOrbit : null;
      const orbitColor =
        hoverStatus === true
          ? '#34d399'
          : hoverStatus === false
          ? '#f87171'
          : dragRef.current.active
          ? '#4fe3d4'
          : '#38bdf8';

      // Soft outer glow band when dragging satellite
      if (dragRef.current.active) {
        ctx.strokeStyle = hoverStatus ? 'rgba(52, 211, 153, 0.25)' : 'rgba(79, 227, 212, 0.16)';
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.arc(cx, cy, rOrbit, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = orbitColor;
      ctx.globalAlpha = dragRef.current.active ? 0.92 : 0.62;
      ctx.lineWidth = dragRef.current.active ? 3 : 2;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -(now * 0.015);
      ctx.beginPath();
      ctx.arc(cx, cy, rOrbit, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ======================================================
      // 6. LARGE ANIMATED ROTATING EARTH WITH DAY-NIGHT LIGHTING
      // ======================================================
      // Outer Blue Atmosphere Glow
      const atmoGrad = ctx.createRadialGradient(cx, cy, rEarth * 0.85, cx, cy, rEarth * 1.24);
      atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.36)');
      atmoGrad.addColorStop(0.55, 'rgba(14, 165, 233, 0.14)');
      atmoGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rEarth * 1.24, 0, Math.PI * 2);
      ctx.fill();

      // Clip interior of Earth sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rEarth, 0, Math.PI * 2);
      ctx.clip();

      // Base illuminated blue ocean sphere (left-lit)
      const oceanGrad = ctx.createRadialGradient(
        cx - rEarth * 0.45,
        cy - rEarth * 0.22,
        rEarth * 0.1,
        cx,
        cy,
        rEarth * 1.15
      );
      oceanGrad.addColorStop(0, '#38bdf8');
      oceanGrad.addColorStop(0.55, '#0284c7');
      oceanGrad.addColorStop(1, '#073668');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(cx - rEarth, cy - rEarth, rEarth * 2, rEarth * 2);

      // Rotating Continents (projected on front hemisphere)
      CONTINENT_BLOBS.forEach(([lon0, lat0, rxDeg, ryDeg, color]) => {
        let lon = ((lon0 + s.earthRotDeg + 540) % 360) - 180;
        if (Math.abs(lon) > 105) return;
        const lonRad = (lon * Math.PI) / 180;
        const latRad = (lat0 * Math.PI) / 180;
        const px = cx + Math.sin(lonRad) * Math.cos(latRad) * rEarth;
        const py = cy - Math.sin(latRad) * rEarth;
        const rx = Math.max(3, (rxDeg / 90) * rEarth * Math.cos(lonRad));
        const ry = Math.max(3, (ryDeg / 90) * rEarth);

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Subtle warm city light dots if continent rotates onto the night side (lon > 8 deg)
        if (lon > 4) {
          ctx.fillStyle = '#fbbf24';
          ctx.globalAlpha = Math.min(0.85, (lon - 4) / 28);
          ctx.beginPath();
          ctx.arc(px - rx * 0.25, py - ry * 0.18, 1.5, 0, Math.PI * 2);
          ctx.arc(px + rx * 0.2, py + ry * 0.15, 1.8, 0, Math.PI * 2);
          ctx.arc(px, py - ry * 0.3, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Subtle atmospheric cloud wisps rotating slightly faster
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      for (let cIdx = 0; cIdx < 5; cIdx++) {
        const cLon = (((cIdx * 72 - 140 + s.earthRotDeg * 1.18) + 540) % 360) - 180;
        if (Math.abs(cLon) >= 88) continue;
        const clRad = (cLon * Math.PI) / 180;
        const cLat = ((cIdx % 3) - 1) * 28;
        const cpx = cx + Math.sin(clRad) * rEarth * 0.85;
        const cpy = cy - (cLat / 90) * rEarth;
        const cRx = Math.max(1.5, rEarth * 0.24 * Math.cos(clRad));
        const cRy = Math.max(1.5, rEarth * 0.05);
        ctx.beginPath();
        ctx.ellipse(cpx, cpy, cRx, cRy, -0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crisp Day-Night Terminator Shadow on Right Half of Earth
      const terminatorGrad = ctx.createLinearGradient(cx - rEarth * 0.15, cy, cx + rEarth * 0.45, cy);
      terminatorGrad.addColorStop(0, 'rgba(2, 6, 20, 0)');
      terminatorGrad.addColorStop(0.32, 'rgba(12, 26, 62, 0.35)');
      terminatorGrad.addColorStop(0.54, 'rgba(3, 8, 26, 0.86)');
      terminatorGrad.addColorStop(1, 'rgba(2, 5, 16, 0.94)');
      ctx.fillStyle = terminatorGrad;
      ctx.fillRect(cx - rEarth, cy - rEarth, rEarth * 2, rEarth * 2);

      // Re-draw crisp night-side city lights on top of dark hemisphere shadow!
      CONTINENT_BLOBS.forEach(([lon0, lat0, rxDeg, ryDeg]) => {
        const lon = ((lon0 + s.earthRotDeg + 540) % 360) - 180;
        if (lon < 8 || lon > 88) return;
        const lonRad = (lon * Math.PI) / 180;
        const latRad = (lat0 * Math.PI) / 180;
        const px = cx + Math.sin(lonRad) * Math.cos(latRad) * rEarth;
        const py = cy - Math.sin(latRad) * rEarth;
        const rx = (rxDeg / 90) * rEarth * Math.cos(lonRad);
        const ry = (ryDeg / 90) * rEarth;
        ctx.fillStyle = '#fde047';
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.arc(px - rx * 0.2, py, 1.4, 0, Math.PI * 2);
        ctx.arc(px + rx * 0.22, py + ry * 0.2, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.restore();

      // Lit blue rim highlight on left edge of Earth
      ctx.save();
      const rimGrad = ctx.createLinearGradient(cx - rEarth, cy, cx + rEarth, cy);
      rimGrad.addColorStop(0, 'rgba(125, 211, 252, 0.85)');
      rimGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.25)');
      rimGrad.addColorStop(1, 'rgba(15, 23, 42, 0.35)');
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rEarth, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Subtle photon absorption beam hitting solar panels when sunlit
      if (!satInShadowVisual && s.simStatus !== 'failed' && (s.simStatus === 'running' || s.simStatus === 'completed' || s.inOrbit)) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(Math.max(12, satX - 110), satY, satX, satY);
        beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0.42)');
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -(now * 0.05);
        [-10, 0, 10].forEach((dy) => {
          ctx.beginPath();
          ctx.moveTo(Math.max(12, satX - 110), satY + dy);
          ctx.lineTo(satX - 10, satY + dy * 0.4);
          ctx.stroke();
        });
        ctx.restore();
      }

      // ======================================================
      // 7. SATELLITE WITH DYNAMIC SOLAR WINGS & LIGHTING
      // ======================================================
      ctx.save();
      ctx.translate(satX, satY);

      // Keep panels oriented smoothly along orbital tangent (or upright when staging)
      const tilt =
        s.inOrbit && !dragRef.current.active
          ? (s.simStatus === 'setup' ? orbitAngleRef.current : s.orbitAngle) + Math.PI / 2
          : -0.22;
      ctx.rotate(tilt);

      // Dynamic solar wing dimensions driven by Solar Slider (50 W .. 250 W)
      const wingRatio = (s.solarW - 50) / 200; // 0 .. 1
      const wingLen = 14 + wingRatio * 20; // 14px .. 34px per side
      const wingH = 10 + wingRatio * 6; // 10px .. 16px

      const isFailed = s.simStatus === 'failed';
      const isLit = !satInShadowVisual && !isFailed;

      // Halo glow around satellite
      if (!s.inOrbit && s.simStatus === 'setup') {
        const pulseR = 32 + Math.sin(now * 0.005) * 5;
        ctx.strokeStyle = 'rgba(79, 227, 212, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isLit && (s.simStatus === 'running' || s.simStatus === 'completed')) {
        // Golden solar activation glow
        const panelGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, wingLen + 20);
        panelGlow.addColorStop(0, 'rgba(253, 224, 71, 0.32)');
        panelGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = panelGlow;
        ctx.beginPath();
        ctx.arc(0, 0, wingLen + 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connecting struts
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-wingLen - 10, 0);
      ctx.lineTo(wingLen + 10, 0);
      ctx.stroke();

      // Left & Right Solar Wings
      const panelFill = isFailed
        ? '#1e293b'
        : isLit && (s.simStatus === 'running' || s.simStatus === 'completed')
        ? '#eab308'
        : isLit
        ? '#2563eb'
        : '#0f172a';
      const panelBorder = isFailed
        ? '#ef4444'
        : isLit && (s.simStatus === 'running' || s.simStatus === 'completed')
        ? '#fef08a'
        : isLit
        ? '#60a5fa'
        : '#334155';

      [-1, 1].forEach((side) => {
        const xStart = side === -1 ? -10 - wingLen : 10;
        ctx.fillStyle = panelFill;
        ctx.strokeStyle = panelBorder;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(xStart, -wingH / 2, wingLen, wingH, 2);
        ctx.fill();
        ctx.stroke();

        // PV cell grid lines
        ctx.strokeStyle = isLit ? 'rgba(255,255,255,0.35)' : 'rgba(148,163,184,0.2)';
        ctx.lineWidth = 0.8;
        const cells = Math.max(2, Math.round(2 + wingRatio * 3));
        for (let c = 1; c < cells; c++) {
          const cxLine = xStart + (wingLen / cells) * c;
          ctx.beginPath();
          ctx.moveTo(cxLine, -wingH / 2);
          ctx.lineTo(cxLine, wingH / 2);
          ctx.stroke();
        }
      });

      // Gold Foil Satellite Bus Body
      ctx.fillStyle = isFailed ? '#334155' : '#f59e0b';
      ctx.strokeStyle = isFailed ? '#ef4444' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-9, -10, 18, 20, 3);
      ctx.fill();
      ctx.stroke();

      // Status LED on Satellite Core
      ctx.fillStyle = isFailed
        ? '#ef4444'
        : isLit
        ? '#4fe3d4'
        : '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Small parabolic dish
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -13, 5, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      ctx.restore();

      // Floating Prompt Label under unstaged satellite
      if (!s.inOrbit && s.simStatus === 'setup' && !dragRef.current.active) {
        ctx.save();
        ctx.fillStyle = '#4fe3d4';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO CONFIGURE • DRAG TO ORBIT', satX, satY + 42);
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [visible]);

  // Pointer Interaction: Click Satellite (Opens Config) OR Drag-and-Drop Into Orbit
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (simStatus !== 'setup') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    const { satX, satY } = geomRef.current;
    if (Math.hypot(lx - satX, ly - satY) <= 52) {
      canvas.setPointerCapture(e.pointerId);
      dragRef.current = {
        active: true,
        moved: false,
        startX: lx,
        startY: ly,
        curX: lx,
        curY: ly,
        hoverValidOrbit: null,
      };
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    if (!d.moved && Math.hypot(lx - d.startX, ly - d.startY) > 6) {
      d.moved = true;
      SFX.select();
    }
    d.curX = lx;
    d.curY = ly;

    if (d.moved) {
      const { cx, cy, rOrbit } = geomRef.current;
      const dist = Math.hypot(lx - cx, ly - cy);
      d.hoverValidOrbit = Math.abs(dist - rOrbit) <= 38;
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const wasMoved = d.moved;
    const lx = d.curX;
    const ly = d.curY;
    dragRef.current.active = false;
    dragRef.current.moved = false;
    dragRef.current.hoverValidOrbit = null;

    if (!wasMoved) {
      // Clicked the satellite -> Open Power Configuration Panel!
      SFX.select();
      setConfigOpen(true);
      setFeedback({
        title: 'SATELLITE POWER CONFIGURATION',
        detail: 'Adjust Solar Panel wattage (50–250 W) and choose a Battery capacity card.',
        tone: 'cyan',
      });
      return;
    }

    // Dropped satellite: validate distance to orbital ring
    const { cx, cy, rOrbit } = geomRef.current;
    const dist = Math.hypot(lx - cx, ly - cy);
    if (Math.abs(dist - rOrbit) <= 38) {
      const ang = Math.atan2(ly - cy, lx - cx);
      setOrbitAngle(ang);
      simStateRef.current.orbitAngle = ang;
      setInOrbit(true);
      simStateRef.current.inOrbit = true;
      SFX.snapCorrect();
      setFeedback({
        title: '✓ SATELLITE SUCCESSFULLY PLACED IN ORBIT!',
        detail: selectedBattery && solarConfigured
          ? 'All systems configured. Press START ORBIT to test eclipse survival!'
          : 'Complete Solar & Battery configuration in the panel, then press START ORBIT.',
        tone: 'green',
      });
    } else {
      setInOrbit(false);
      simStateRef.current.inOrbit = false;
      SFX.snapWrong();
      setFeedback({
        title: '✕ INVALID ORBIT PLACEMENT',
        detail:
          dist < rOrbit - 38
            ? 'Too close to Earth atmosphere! Drag the satellite onto the glowing cyan orbit ring.'
            : 'Too far from orbit path! Drop the satellite directly along the circular cyan orbit.',
        tone: 'red',
      });
    }
  };

  if (!visible) return null;

  const maxCap = selectedBattery?.capacityWh ?? 0;
  const batteryPct = maxCap > 0 ? Math.max(0, Math.min(100, Math.round((batteryWh / maxCap) * 100))) : 0;
  const activeGenerationW =
    simStatus === 'failed'
      ? 0
      : simStatus === 'setup'
      ? solarW
      : isInShadow
      ? 0
      : solarW;

  const batteryColorClass =
    batteryPct > 50
      ? 'from-emerald-400 to-cyan-400'
      : batteryPct > 20
      ? 'from-amber-400 to-yellow-300'
      : 'from-red-500 to-orange-500 animate-pulse';

  const solarFeedbackText =
    solarW >= 150
      ? `Excellent! Your solar panels can now generate ${solarW} W when exposed to sufficient sunlight.`
      : solarW >= 110
      ? `Marginal: Generates ${solarW} W in sunlight — barely covers ${SATELLITE_CONSUMPTION_W} W consumption (slow battery recharge).`
      : `Low Output (${solarW} W): Less than ${SATELLITE_CONSUMPTION_W} W consumption — battery drains even in sunlight!`;

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#020612] text-[#e8eefc] select-none">
      {/* TOP BAR */}
      <div className="h-[56px] px-3 md:px-6 bg-[#071124] border-b border-cyan-400/30 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2.5 py-1 rounded bg-cyan-400/15 border border-cyan-400/45 text-[#4fe3d4] text-[11px] font-bold tracking-wider uppercase shrink-0">
            LEVEL 03
          </span>
          <h2 className="font-display text-xs sm:text-sm md:text-base font-extrabold tracking-wide text-white truncate">
            ORBIT AND POWER MANAGEMENT
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DirectorVanceVoiceBanner
            compact
            quote="Balance solar wing wattage and battery capacity so your satellite never runs out of power in Earth's shadow!"
          />

          {/* Audio Mute & Volume */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0b1933] border border-cyan-400/25">
            <button
              type="button"
              onClick={handleToggleMute}
              className="text-xs font-bold text-[#4fe3d4] hover:text-white cursor-pointer"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Simulation volume"
              className="w-16 accent-[#4fe3d4] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#0b1933] border border-amber-400/30 px-2.5 py-1 rounded-lg">
            <span className="text-amber-300 text-xs">★</span>
            <span className="font-mono-tech font-bold text-amber-300 text-xs tabular-nums">
              {starCredits.toLocaleString()} SC
            </span>
          </div>

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              className="px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              📖 Handbook
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              ambienceRef.current?.stop();
              onBackToAcademy();
            }}
            className="hidden md:inline-flex px-3 py-1.5 rounded-lg border border-cyan-400/35 bg-cyan-400/10 hover:bg-cyan-400/20 text-[#4fe3d4] text-xs font-bold transition cursor-pointer"
          >
            Academy
          </button>

          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              ambienceRef.current?.stop();
              onExit();
            }}
            className="px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold transition cursor-pointer"
          >
            Exit ✕
          </button>
        </div>
      </div>

      {/* MAIN SPACE SIMULATION WORKSPACE */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        {/* LEFT/CENTER: ANIMATED EARTH + SUN + ORBIT CANVAS */}
        <div className="relative min-h-[360px] overflow-hidden bg-[#020510]">
          <canvas
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            className={`w-full h-full block touch-none ${
              simStatus === 'setup' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
          />

          {/* Top-Left Instruction & Orbital Status Banner */}
          {feedback && simStatus !== 'completed' && (
            <div
              className={`absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md rounded-xl border px-3.5 py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-colors ${
                feedback.tone === 'green'
                  ? 'bg-[#052319]/92 border-emerald-400/75 text-emerald-100'
                  : feedback.tone === 'amber'
                  ? 'bg-[#251806]/92 border-amber-400/80 text-amber-100'
                  : feedback.tone === 'red'
                  ? 'bg-[#2a0810]/94 border-red-400 text-red-100'
                  : 'bg-[#07142b]/92 border-cyan-400/55 text-slate-100'
              }`}
            >
              <div
                className={`text-[10px] font-mono-tech font-extrabold tracking-widest uppercase ${
                  feedback.tone === 'green'
                    ? 'text-emerald-300'
                    : feedback.tone === 'amber'
                    ? 'text-amber-300'
                    : feedback.tone === 'red'
                    ? 'text-red-300'
                    : 'text-[#4fe3d4]'
                }`}
              >
                {feedback.title}
              </div>
              <div className="text-xs leading-snug mt-0.5">{feedback.detail}</div>
            </div>
          )}

          {/* Bottom Sunlight Restored / Eclipse Survived Cinematic Callout */}
          {(sunlightRestoredBanner || eclipseSurvivedBanner) && simStatus !== 'completed' && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 px-6 py-3 rounded-2xl bg-[#05261b]/95 border-2 border-emerald-400 text-center shadow-[0_0_40px_rgba(52,211,153,0.55)] animate-[popIn_0.3s_ease-out] max-w-[92%]">
              <div className="font-display text-base md:text-xl font-black text-emerald-300 tracking-wider">
                {eclipseSurvivedBanner ? '✓ ECLIPSE SURVIVED!' : '☀ SUNLIGHT RESTORED!'}
              </div>
              <div className="text-[11px] text-emerald-100 mt-0.5">
                {eclipseSurvivedBanner
                  ? 'Excellent engineering! Your satellite survived Earth’s shadow and remains operational.'
                  : 'Solar power generation resumed — recharging orbital batteries.'}
              </div>
            </div>
          )}

          {/* Simulation Failure Overlay ("MISSION FAILED – POWER FAILURE") */}
          {simStatus === 'failed' && (
            <div className="absolute inset-0 z-30 bg-black/72 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-[#1f0810]/96 border-2 border-red-500 p-6 text-center shadow-[0_20px_60px_rgba(239,68,68,0.35)] animate-[popIn_0.28s_ease-out]">
                <div className="text-4xl mb-2">🪫</div>
                <div className="text-[11px] font-mono-tech font-extrabold uppercase tracking-[2px] text-red-400">
                  ORBITAL CRITICAL ALERT
                </div>
                <h3 className="font-display text-xl font-black text-white mt-1">
                  MISSION FAILED – POWER FAILURE
                </h3>
                <p className="text-xs sm:text-sm text-red-100/90 mt-2.5 leading-relaxed">
                  Your satellite could not survive Earth&apos;s shadow because its battery capacity was insufficient.
                </p>
                <div className="mt-4 p-3 rounded-xl bg-black/35 border border-red-400/30 text-xs font-mono-tech flex justify-between text-slate-300">
                  <span>Solar: {solarW} W</span>
                  <span>Battery: {selectedBattery?.capacityWh ?? 0} Wh</span>
                  <span className="text-red-400 font-bold">0% LEFT</span>
                </div>
                <button
                  type="button"
                  onClick={handleRedesign}
                  className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm uppercase tracking-wider shadow-lg hover:brightness-110 transition cursor-pointer"
                >
                  REDESIGN SATELLITE ↺
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: TELEMETRY + SATELLITE POWER CONFIGURATION */}
        <div className="bg-[#060f20] border-t lg:border-t-0 lg:border-l border-cyan-400/25 p-3 flex flex-col gap-2.5 overflow-y-auto">
          {/* Live Telemetry Card */}
          <div className="shrink-0 p-3 rounded-xl bg-[#091730] border border-cyan-400/35 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-tech font-extrabold uppercase tracking-widest text-[#4fe3d4]">
                LIVE TELEMETRY
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold ${
                  simStatus === 'failed'
                    ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                    : simStatus === 'paused'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                    : isInShadow && simStatus === 'running'
                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/50'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40'
                }`}
              >
                {simStatus === 'failed'
                  ? 'POWER LOSS'
                  : simStatus === 'paused'
                  ? 'PAUSED'
                  : simStatus === 'setup'
                  ? 'STAGING'
                  : isInShadow
                  ? 'EARTH SHADOW'
                  : 'SUNLIGHT'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#050d1d] border border-white/10">
                <div className="text-[10px] text-slate-400">Solar Generation</div>
                <div
                  className={`font-mono-tech font-extrabold text-sm tabular-nums ${
                    activeGenerationW > 0 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  {activeGenerationW} W
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#050d1d] border border-white/10">
                <div className="text-[10px] text-slate-400">Power Consumption</div>
                <div className="font-mono-tech font-extrabold text-sm text-sky-300 tabular-nums">
                  {SATELLITE_CONSUMPTION_W} W
                </div>
              </div>
            </div>

            {/* Battery Storage Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold">
                  Battery ({maxCap > 0 ? `${Math.round(batteryWh)} / ${maxCap} Wh` : 'Select Battery'})
                </span>
                <strong className="font-mono-tech text-white tabular-nums">{batteryPct}%</strong>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-white/15 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${batteryColorClass} transition-all duration-150`}
                  style={{ width: `${batteryPct}%` }}
                />
              </div>
              {(simStatus === 'running' || simStatus === 'paused') && (
                <div className="mt-1.5 space-y-1 text-[10px] font-mono-tech">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      Orbit Progress: <strong className="text-[#4fe3d4] tabular-nums">{orbitalProgressPct}%</strong>
                    </span>
                    <span
                      className={
                        isInShadow
                          ? 'text-red-300 font-bold'
                          : activeGenerationW > SATELLITE_CONSUMPTION_W
                          ? 'text-emerald-300 font-bold'
                          : 'text-amber-300 font-bold'
                      }
                    >
                      {isInShadow
                        ? `DRAINING (-${SATELLITE_CONSUMPTION_W} W)`
                        : activeGenerationW > SATELLITE_CONSUMPTION_W
                        ? `CHARGING (+${activeGenerationW - SATELLITE_CONSUMPTION_W} W)`
                        : `DEFICIT (${activeGenerationW - SATELLITE_CONSUMPTION_W} W)`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Operating Status: <strong className="text-emerald-300">ACTIVE</strong></span>
                    <span className="tabular-nums">Time: {simElapsedSec.toFixed(1)}s</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] font-mono-tech text-slate-400">
              <span>Sat Mass: {specs.totalMassKg} kg</span>
              <span>Cost: ₡ {specs.totalCost.toLocaleString()}</span>
            </div>
          </div>

          {/* SATELLITE POWER CONFIGURATION PANEL (Opens on satellite click or toggle button; collapses during orbit) */}
          <div className="shrink-0 rounded-xl bg-[#091730] border border-cyan-400/35">
            <button
              type="button"
              onClick={() => {
                SFX.click();
                setConfigOpen((v) => !v);
              }}
              className="w-full px-3.5 py-2 bg-[#0c1e3e] rounded-t-xl border-b border-cyan-400/25 flex items-center justify-between cursor-pointer"
            >
              <span className="text-[11px] font-display font-extrabold text-[#4fe3d4] tracking-wider uppercase">
                SATELLITE POWER CONFIGURATION
              </span>
              <span className="text-xs text-slate-300">{configOpen ? '▾' : '▸'}</span>
            </button>

            {!configOpen && simStatus === 'setup' && (
              <div className="p-2.5 text-[11px] text-slate-300 flex items-center justify-between gap-2 bg-[#071328] rounded-b-xl">
                <span>Click the floating satellite in space or open settings to configure solar &amp; battery.</span>
                <button
                  type="button"
                  onClick={() => {
                    SFX.select();
                    setConfigOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/45 text-[#4fe3d4] font-bold shrink-0 cursor-pointer"
                >
                  Configure
                </button>
              </div>
            )}

            {configOpen && (
              <div className="p-3 space-y-3">
                {/* 1. SOLAR PANEL POWER SLIDER (50 W - 250 W, Initial 150 W, Step 10 W) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tech font-bold text-amber-300">
                      SOLAR PANEL CAPACITY: {solarW} W
                    </span>
                    <button
                      type="button"
                      disabled={simStatus !== 'setup'}
                      onClick={() => {
                        SFX.select();
                        setSolarConfigured(true);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                        solarConfigured
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-cyan-400/15 border-cyan-400/50 text-[#4fe3d4] hover:bg-cyan-400/25'
                      }`}
                    >
                      {solarConfigured ? '✓ SET' : 'CONFIRM'}
                    </button>
                  </div>

                  <input
                    type="range"
                    min={50}
                    max={250}
                    step={10}
                    disabled={simStatus !== 'setup'}
                    value={solarW}
                    onChange={(e) => handleSolarChange(Number(e.target.value))}
                    aria-label="Solar Panel Capacity Watts"
                    className="w-full accent-[#fbbf24] cursor-pointer disabled:opacity-50"
                  />

                  <div className="flex justify-between text-[10px] font-mono-tech text-slate-400">
                    <span>50 W</span>
                    <span>150 W</span>
                    <span>250 W</span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">{solarFeedbackText}</p>
                </div>

                {/* Live Information Panel */}
                <div className="px-2.5 py-1.5 rounded-lg bg-[#061124] border border-cyan-400/25 flex items-center justify-between text-[10px] font-mono-tech">
                  <span>
                    <span className="text-slate-400">Panel: </span>
                    <strong className="text-amber-300 tabular-nums">{solarW} W</strong>
                  </span>
                  <span>
                    <span className="text-slate-400">Mass: </span>
                    <strong className="text-white tabular-nums">{specs.panelMass} kg</strong>
                  </span>
                  <span>
                    <span className="text-slate-400">Cost: </span>
                    <strong className="text-amber-200 tabular-nums">₡{specs.panelCost.toLocaleString()}</strong>
                  </span>
                </div>

                {/* 2. BATTERY CAPACITY VISUAL IMAGE SELECTOR */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-tech font-bold uppercase tracking-wider text-[#4fe3d4]">
                      SELECT BATTERY PACK
                    </span>
                    {selectedBattery && (
                      <span className="text-[10px] font-mono-tech font-bold text-emerald-300">
                        ✓ {selectedBattery.capacityWh} Wh
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {BATTERY_OPTIONS.map((opt) => {
                      const active = selectedBatteryId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={simStatus !== 'setup'}
                          onClick={() => handleSelectBattery(opt)}
                          title={`${opt.name} (${opt.capacityWh} Wh • +${opt.massKg} kg • ${opt.costLabel} cost)`}
                          aria-label={`${opt.name} ${opt.capacityWh} Wh`}
                          className={`relative p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-60 ${
                            active
                              ? 'bg-cyan-400/18 border-[#4fe3d4] shadow-[0_0_16px_rgba(79,227,212,0.32)]'
                              : 'bg-[#061124] border-white/15 hover:border-cyan-400/60 hover:bg-[#091936]'
                          }`}
                        >
                          {active && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#4fe3d4] text-[#041022] text-[10px] font-black flex items-center justify-center">
                              ✓
                            </span>
                          )}
                          <BatteryIconSVG optionId={opt.id} active={active} />
                          <span
                            className={`text-[11px] font-mono-tech font-extrabold tabular-nums ${
                              active ? 'text-[#4fe3d4]' : 'text-slate-200'
                            }`}
                          >
                            {opt.capacityWh} Wh
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PRE-LAUNCH CHECKLIST + CONTROLS (START ORBIT / PAUSE / RESUME / RESTART) */}
          <div className="shrink-0 mt-auto space-y-2 pt-0.5">
            {simStatus === 'setup' && (
              <>
                <div className="p-2.5 rounded-xl bg-[#050d1d] border border-white/10 text-[11px] space-y-1">
                  <div className={solarConfigured ? 'text-emerald-300' : 'text-slate-400'}>
                    {solarConfigured ? '✓' : '○'} 1. Configure solar panel capacity ({solarW} W)
                  </div>
                  <div className={selectedBattery ? 'text-emerald-300' : 'text-slate-400'}>
                    {selectedBattery ? '✓' : '○'} 2. Select battery capacity (
                    {selectedBattery ? `${selectedBattery.capacityWh} Wh` : 'Pending'})
                  </div>
                  <div className={inOrbit ? 'text-emerald-300' : 'text-slate-400'}>
                    {inOrbit ? '✓' : '○'} 3. Drag satellite into circular orbit path
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canStartOrbit}
                  onClick={handleStartOrbit}
                  className={`w-full py-3.5 rounded-xl font-display font-extrabold text-xs md:text-sm tracking-wider uppercase transition ${
                    canStartOrbit
                      ? 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] shadow-[0_0_24px_rgba(79,227,212,0.4)] hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {canStartOrbit ? '🛰️ START ORBIT ▶' : 'COMPLETE ALL 3 STEPS TO START'}
                </button>
              </>
            )}

            {(simStatus === 'running' || simStatus === 'paused') && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="py-3 rounded-xl bg-amber-400/18 hover:bg-amber-400/28 border border-amber-400/55 text-amber-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  {simStatus === 'paused' ? '▶ RESUME' : '⏸ PAUSE'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setRestartConfirmOpen(true);
                  }}
                  className="py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/20 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  ↺ RESTART
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RESTART CONFIRMATION MODAL */}
      {restartConfirmOpen && (
        <div className="fixed inset-0 z-[5600] bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#07142b] border border-cyan-400/45 p-5 text-center shadow-2xl animate-[popIn_0.2s_ease-out]">
            <h4 className="font-display text-base font-extrabold text-white">
              RESTART SIMULATION?
            </h4>
            <p className="text-xs text-slate-300 mt-1.5">
              This will reset orbital progress and unlock your solar &amp; battery settings.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  setRestartConfirmOpen(false);
                }}
                className="py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  resetSimulationState(true);
                  setConfigOpen(true);
                }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] text-xs font-extrabold cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISSION 003 COMPLETION CELEBRATION MODAL */}
      {simStatus === 'completed' && (
        <>
          <ConfettiCanvas />
          <div className="fixed inset-0 z-[5600] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[#07142b]/95 border border-amber-400/60 p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.92)] animate-[popIn_0.35s_ease-out]">
              <div className="text-[11px] font-mono-tech font-extrabold uppercase tracking-[2.5px] text-emerald-400">
                MISSION 003 COMPLETED!
              </div>
              <h3 className="font-display text-xl md:text-2xl font-extrabold text-amber-300 mt-1">
                CONGRATULATIONS!
              </h3>
              <p className="text-xs text-slate-200 mt-2">
                You are now recognised as an{' '}
                <strong className="text-[#4fe3d4]">ORBIT POWER ENGINEER!</strong>
              </p>

              <div className="my-3 flex justify-center animate-[popIn_0.45s_ease-out]">
                <OrbitPowerEngineerBadgeSVG size={146} />
              </div>

              <div className="rounded-xl bg-[#0b1b38] border border-cyan-400/35 p-3.5 mb-4 text-xs space-y-1.5 text-left">
                <div className="flex justify-between items-center text-slate-200">
                  <span>⭐ Star Credits Reward:</span>
                  <strong className="text-amber-300 font-mono-tech">
                    {rewardOutcome && !rewardOutcome.alreadyRewarded
                      ? '+1,000 STAR CREDITS'
                      : alreadyCompleted
                      ? 'Already Claimed (+0 SC Replay)'
                      : '+1,000 STAR CREDITS'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-200">
                  <span>🏅 Achievement Badge:</span>
                  <strong className="text-[#4fe3d4]">ORBIT POWER ENGINEER</strong>
                </div>
                <div className="flex justify-between items-center text-slate-200">
                  <span>🚀 Campaign Progress:</span>
                  <strong className="text-emerald-300">Level 4 Unlocked!</strong>
                </div>
                <div className="pt-1.5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-slate-400">Updated Star Balance:</span>
                  <strong className="text-amber-300 font-mono-tech text-sm tabular-nums">
                    ★ {(rewardOutcome?.newStarBalance ?? starCredits).toLocaleString()} SC
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    onContinueToLevel4();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase shadow-lg hover:brightness-110 transition cursor-pointer"
                >
                  RETURN TO LEVEL MAP ▶
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      resetSimulationState(true);
                      setConfigOpen(true);
                    }}
                    className="py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-bold text-xs tracking-wide uppercase transition cursor-pointer"
                  >
                    REPLAY LEVEL 3 ↺
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onBackToAcademy();
                    }}
                    className="py-2.5 rounded-xl bg-cyan-400/12 hover:bg-cyan-400/22 border border-cyan-400/40 text-[#4fe3d4] font-bold text-xs tracking-wide uppercase transition cursor-pointer"
                  >
                    BACK TO ACADEMY
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {showEntryBriefing && simStatus === 'setup' && (
        <div className="fixed inset-0 z-[5550] bg-[#020816]/84 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#07142b] border border-cyan-400/50 p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.92)] space-y-4 animate-[popIn_0.28s_ease-out]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono-tech font-bold uppercase tracking-[2.4px] text-[#4fe3d4]">
                LEVEL 03 // VOICE BRIEFING
              </span>
              <span className="px-2.5 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/40 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
                ORBITAL POWER SIM
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-black text-white">
              ORBIT AND POWER MANAGEMENT
            </h3>
            <DirectorVanceVoiceBanner
              speaker="DIRECTOR VANCE // GROUND STATION POWER"
              quote="Balance solar wing wattage and battery capacity so your satellite never runs out of power in Earth's shadow!"
              autoPlayKey={visible && showEntryBriefing ? 'lvl3-entry-brief' : null}
            />
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  SFX.cancelSpeech();
                  SFX.click();
                  setShowEntryBriefing(false);
                }}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 transition cursor-pointer"
              >
                Enter Orbit Simulator ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
