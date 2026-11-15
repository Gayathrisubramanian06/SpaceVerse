import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DEFAULT_LEVEL9_PROGRESS,
  LEVEL9_BADGE_LABEL,
  LEVEL9_MISSION_DURATION_SEC,
  LEVEL9_REWARD_SC,
  LEVEL9_STAGE_META,
  LEVEL9_VOICE_BRIEFING_SCRIPT,
  Level9Stage,
  StoredLevel9Progress,
} from '../utils/astronautRescueData';
import { formatCountdownClock } from '../utils/europaMissionData';
import { SFX } from '../utils/sfx';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';
import { SpaceRescueHeroBadgeSVG } from './BadgesSVG';

export interface Level9CompletionPayload {
  astronautLocated: boolean;
  commsEstablished: boolean;
  debrisNavigated: boolean;
  speedMatched: boolean;
  armCaptured: boolean;
  airlockSecured: boolean;
  oxygenRemainingPct: number;
  hullRemainingPct: number;
  secondsRemaining: number;
  timerExpired: boolean;
}

export interface Level9RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  newStarBalance: number;
}

interface AstronautRescueLabProps {
  visible: boolean;
  starCredits: number;
  alreadyCompleted: boolean;
  initialProgress?: StoredLevel9Progress;
  onOpenHandbook?: () => void;
  onSaveProgress?: (progress: StoredLevel9Progress) => void;
  onReplayReset?: () => void;
  onCompleteMission: (payload: Level9CompletionPayload) => Promise<Level9RewardResult>;
  onBackToLevelMap: () => void;
  onExit: () => void;
}

interface RadarObject {
  id: string;
  label: string;
  kind: 'astronaut' | 'satellite' | 'debris';
  angle: number;
  radius: number;
  angularSpeed: number;
  radialWobble: number;
  freqLabel: string;
}

const RADAR_OBJECTS: RadarObject[] = [
  {
    id: 'eva-astro',
    label: 'Unidentified EVA Suit',
    kind: 'astronaut',
    angle: 0.95,
    radius: 0.64,
    angularSpeed: 0.24,
    radialWobble: 0.04,
    freqLabel: '121.5 MHz · Pulse',
  },
  {
    id: 'sat-relay-1',
    label: 'Relay Sat-04',
    kind: 'satellite',
    angle: 2.55,
    radius: 0.48,
    angularSpeed: -0.18,
    radialWobble: 0.01,
    freqLabel: '2.4 GHz · Telemetry',
  },
  {
    id: 'sat-weather-2',
    label: 'Weather Sat-09',
    kind: 'satellite',
    angle: 4.4,
    radius: 0.78,
    angularSpeed: 0.14,
    radialWobble: 0.01,
    freqLabel: '8.2 GHz · Beacon',
  },
  {
    id: 'deb-solar',
    label: 'Loose Solar Wing',
    kind: 'debris',
    angle: 1.75,
    radius: 0.35,
    angularSpeed: 0.42,
    radialWobble: 0.03,
    freqLabel: 'Static Noise',
  },
  {
    id: 'deb-fairing',
    label: 'Fairing Fragment',
    kind: 'debris',
    angle: 3.55,
    radius: 0.72,
    angularSpeed: -0.36,
    radialWobble: 0.05,
    freqLabel: 'Static Noise',
  },
  {
    id: 'deb-booster',
    label: 'Spent Booster Cap',
    kind: 'debris',
    angle: 5.35,
    radius: 0.54,
    angularSpeed: 0.31,
    radialWobble: 0.03,
    freqLabel: 'Static Noise',
  },
  {
    id: 'deb-panel',
    label: 'Tumbling Alloy Plate',
    kind: 'debris',
    angle: 0.18,
    radius: 0.85,
    angularSpeed: -0.27,
    radialWobble: 0.02,
    freqLabel: 'Static Noise',
  },
];

interface DebrisEntity {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  rot: number;
  vRot: number;
  kind: 'panel' | 'rock' | 'tank' | 'o2' | 'repair';
}

export const AstronautRescueLab: React.FC<AstronautRescueLabProps> = ({
  visible,
  starCredits,
  alreadyCompleted,
  initialProgress,
  onSaveProgress,
  onReplayReset,
  onCompleteMission,
  onBackToLevelMap,
  onExit,
  onOpenHandbook,
}) => {
  // Core Mission State
  const [stage, setStage] = useState<Level9Stage>(() => {
    const raw = Number(initialProgress?.stage ?? 0);
    return (raw >= 5 ? 5 : raw > 0 ? raw : 0) as Level9Stage;
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(LEVEL9_MISSION_DURATION_SEC);
  const [oxygenPct, setOxygenPct] = useState<number>(() => initialProgress?.oxygenPct ?? 100);
  const [hullPct, setHullPct] = useState<number>(() => initialProgress?.hullPct ?? 100);
  const [missionStartedAtMs, setMissionStartedAtMs] = useState<number | null>(
    () => initialProgress?.missionStartedAtMs ?? null
  );
  const [missionDeadlineMs, setMissionDeadlineMs] = useState<number | null>(
    () => initialProgress?.missionDeadlineMs ?? null
  );
  const [failedReason, setFailedReason] = useState<'oxygen' | 'hull' | 'timer' | null>(
    () => initialProgress?.failedReason ?? null
  );

  // Stage completion flags
  const [astronautLocated, setAstronautLocated] = useState<boolean>(
    () => initialProgress?.astronautLocated ?? false
  );
  const [coordinatesLabel, setCoordinatesLabel] = useState<string>(
    () => initialProgress?.coordinatesLabel ?? ''
  );
  const [commsEstablished, setCommsEstablished] = useState<boolean>(
    () => initialProgress?.commsEstablished ?? false
  );
  const [debrisNavigated, setDebrisNavigated] = useState<boolean>(
    () => initialProgress?.debrisNavigated ?? false
  );
  const [speedMatched, setSpeedMatched] = useState<boolean>(
    () => initialProgress?.speedMatched ?? false
  );
  const [armCaptured, setArmCaptured] = useState<boolean>(
    () => initialProgress?.armCaptured ?? false
  );
  const [airlockSecured, setAirlockSecured] = useState<boolean>(
    () => initialProgress?.airlockSecured ?? false
  );

  // Victory / Reward State
  const [victoryOpen, setVictoryOpen] = useState<boolean>(false);
  const [claimingReward, setClaimingReward] = useState<boolean>(false);
  const [rewardResult, setRewardResult] = useState<Level9RewardResult | null>(null);
  const [stageBanner, setStageBanner] = useState<string>('');

  // Stage 1: Radar State
  const [radarTime, setRadarTime] = useState<number>(0);
  const [selectedBlipId, setSelectedBlipId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);

  // Stage 2: Comms Frequency State
  const TARGET_FREQ = 134.6;
  const TARGET_PHASE = 215;
  const [freqMhz, setFreqMhz] = useState<number>(118.2);
  const [phaseDeg, setPhaseDeg] = useState<number>(95);
  const [commsHoldPct, setCommsHoldPct] = useState<number>(0);

  // Stage 3: Debris Flight Canvas State
  const flightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [flightProgressPct, setFlightProgressPct] = useState<number>(0);
  const [flightHitFlash, setFlightHitFlash] = useState<boolean>(false);
  const flightControlRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean; boost: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
  });

  // Stage 4: Speed Match State
  const [shipSpeedMs, setShipSpeedMs] = useState<number>(22.4);
  const [astroSpeedMs, setAstroSpeedMs] = useState<number>(14.2);
  const [speedHoldPct, setSpeedHoldPct] = useState<number>(0);

  // Stage 5: Robotic Arm State
  const [armAngleDeg, setArmAngleDeg] = useState<number>(-28);
  const [armExtendPct, setArmExtendPct] = useState<number>(38);
  const [wristTiltDeg, setWristTiltDeg] = useState<number>(24);
  const [armBobTime, setArmBobTime] = useState<number>(0);
  const [clawSnapFlash, setClawSnapFlash] = useState<boolean>(false);
  const [isAutoRetracting, setIsAutoRetracting] = useState<boolean>(false);
  const [retractAnimPct, setRetractAnimPct] = useState<number>(0);
  const capturePoseRef = useRef<{
    angleDeg: number;
    extendPct: number;
    wristDeg: number;
  } | null>(null);

  const wasVisibleRef = useRef<boolean>(false);
  const onSaveProgressRef = useRef(onSaveProgress);
  onSaveProgressRef.current = onSaveProgress;

  const latestProgressRef = useRef<StoredLevel9Progress>({
    stage,
    missionStartedAtMs,
    missionDeadlineMs,
    oxygenPct,
    hullPct,
    astronautLocated,
    coordinatesLabel,
    commsEstablished,
    debrisNavigated,
    speedMatched,
    armCaptured,
    airlockSecured,
    failedReason,
  });
  latestProgressRef.current = {
    stage,
    missionStartedAtMs,
    missionDeadlineMs,
    oxygenPct,
    hullPct,
    astronautLocated,
    coordinatesLabel,
    commsEstablished,
    debrisNavigated,
    speedMatched,
    armCaptured,
    airlockSecured,
    failedReason,
  };

  // Hydrate only when modal transitions from closed -> open
  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      SFX.cancelSpeech();
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;

    if (initialProgress) {
      const rawStage = Number(initialProgress.stage ?? 0);
      const safeStage = (rawStage >= 5 ? 5 : rawStage > 0 ? rawStage : 0) as Level9Stage;
      setStage(safeStage);
      setMissionStartedAtMs(initialProgress.missionStartedAtMs);
      setMissionDeadlineMs(initialProgress.missionDeadlineMs);
      setOxygenPct(initialProgress.oxygenPct);
      setHullPct(initialProgress.hullPct);
      setAstronautLocated(initialProgress.astronautLocated);
      setCoordinatesLabel(initialProgress.coordinatesLabel);
      setCommsEstablished(initialProgress.commsEstablished);
      setDebrisNavigated(initialProgress.debrisNavigated);
      setSpeedMatched(initialProgress.speedMatched);
      setArmCaptured(initialProgress.armCaptured);
      setAirlockSecured(initialProgress.airlockSecured);
      setFailedReason(initialProgress.failedReason);
      setIsAutoRetracting(false);
      setRetractAnimPct(initialProgress.armCaptured ? 100 : 0);
      if (initialProgress.missionDeadlineMs && safeStage > 0 && !initialProgress.airlockSecured) {
        const rem = Math.max(0, Math.ceil((initialProgress.missionDeadlineMs - Date.now()) / 1000));
        setSecondsLeft(rem);
        if (rem <= 0 && !initialProgress.failedReason) {
          setFailedReason('timer');
        }
      } else {
        setSecondsLeft(LEVEL9_MISSION_DURATION_SEC);
      }
    }
  }, [visible, initialProgress]);

  // Stable persist helper (never changes identity across renders)
  const persistProgress = useCallback((overrides?: Partial<StoredLevel9Progress>) => {
    const next: StoredLevel9Progress = {
      ...latestProgressRef.current,
      ...overrides,
    };
    latestProgressRef.current = next;
    onSaveProgressRef.current?.(next);
  }, []);

  // Shared Emergency Countdown + Oxygen Drain Loop (active during stages 1..5 until capture/victory or failure)
  useEffect(() => {
    if (!visible || stage === 0 || victoryOpen || failedReason !== null || airlockSecured || isAutoRetracting) {
      return;
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (missionDeadlineMs) {
        const rem = Math.max(0, Math.ceil((missionDeadlineMs - now) / 1000));
        setSecondsLeft(rem);
        if (rem <= 0) {
          SFX.powerFailure();
          SFX.speakCue('Emergency timer expired! Astronaut rescue failed.');
          setFailedReason('timer');
          persistProgress({ failedReason: 'timer' });
          return;
        }
      }
      const drainRate = armCaptured ? 0 : 0.41; // ~100% over 240s
      setOxygenPct((prev) => Math.max(0, Number((prev - drainRate).toFixed(2))));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [airlockSecured, armCaptured, failedReason, isAutoRetracting, missionDeadlineMs, persistProgress, stage, victoryOpen, visible]);

  // Oxygen failure trigger
  useEffect(() => {
    if (!visible || stage === 0 || victoryOpen || failedReason !== null || airlockSecured || isAutoRetracting) {
      return;
    }
    if (oxygenPct <= 0) {
      SFX.powerFailure();
      SFX.speakCue('Critical alert! Astronaut oxygen depleted.');
      setFailedReason('oxygen');
      persistProgress({ oxygenPct: 0, failedReason: 'oxygen' });
    }
  }, [airlockSecured, failedReason, isAutoRetracting, oxygenPct, persistProgress, stage, victoryOpen, visible]);

  // Hull failure trigger
  useEffect(() => {
    if (!visible || stage === 0 || victoryOpen || failedReason !== null) return;
    if (hullPct <= 0) {
      SFX.powerFailure();
      SFX.speakCue('Hull integrity lost! Rescue craft disabled.');
      setFailedReason('hull');
      persistProgress({ hullPct: 0, failedReason: 'hull' });
    }
  }, [failedReason, hullPct, persistProgress, stage, victoryOpen, visible]);

  // Reset / Retry Mission
  const handleRetryMission = useCallback(() => {
    SFX.cancelSpeech();
    SFX.click();
    setStage(0);
    setSecondsLeft(LEVEL9_MISSION_DURATION_SEC);
    setOxygenPct(100);
    setHullPct(100);
    setMissionStartedAtMs(null);
    setMissionDeadlineMs(null);
    setFailedReason(null);
    setAstronautLocated(false);
    setCoordinatesLabel('');
    setCommsEstablished(false);
    setDebrisNavigated(false);
    setSpeedMatched(false);
    setArmCaptured(false);
    setAirlockSecured(false);
    setVictoryOpen(false);
    setRewardResult(null);
    setSelectedBlipId(null);
    setScanProgress(0);
    setFreqMhz(118.2);
    setPhaseDeg(95);
    setCommsHoldPct(0);
    setFlightProgressPct(0);
    setShipSpeedMs(22.4);
    setSpeedHoldPct(0);
    setArmAngleDeg(-28);
    setArmExtendPct(38);
    setWristTiltDeg(24);
    setClawSnapFlash(false);
    setIsAutoRetracting(false);
    setRetractAnimPct(0);
    capturePoseRef.current = null;
    setStageBanner('');
    onReplayReset?.();
  }, [onReplayReset]);

  const handleStartRescueMission = useCallback(() => {
    SFX.cancelSpeech();
    SFX.orbitStart();
    const now = Date.now();
    const deadline = now + LEVEL9_MISSION_DURATION_SEC * 1000;
    setMissionStartedAtMs(now);
    setMissionDeadlineMs(deadline);
    setSecondsLeft(LEVEL9_MISSION_DURATION_SEC);
    setOxygenPct(100);
    setHullPct(100);
    setFailedReason(null);
    setStage(1);
    setStageBanner('Scan orbital radar blips to isolate the astronaut life-sign!');
    SFX.speakCue('Rescue mission started! Scan the radar to locate the astronaut.');
    persistProgress({
      stage: 1,
      missionStartedAtMs: now,
      missionDeadlineMs: deadline,
      oxygenPct: 100,
      hullPct: 100,
      failedReason: null,
    });
  }, [persistProgress]);

  // ==========================================================
  // STAGE 1: RADAR ANIMATION & SCAN
  // ==========================================================
  useEffect(() => {
    if (!visible || stage !== 1 || failedReason) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setRadarTime((t) => t + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [failedReason, stage, visible]);

  const selectedRadarObj = useMemo(
    () => RADAR_OBJECTS.find((o) => o.id === selectedBlipId) ?? null,
    [selectedBlipId]
  );

  // Hold-scan auto-fill when astronaut blip selected
  useEffect(() => {
    if (!visible || stage !== 1 || failedReason || astronautLocated) return;
    if (selectedBlipId !== 'eva-astro') {
      setScanProgress(0);
      return;
    }
    const id = window.setInterval(() => {
      setScanProgress((p) => Math.min(100, p + 8));
    }, 80);
    return () => window.clearInterval(id);
  }, [astronautLocated, failedReason, selectedBlipId, stage, visible]);

  const handleLockAstronautCoords = () => {
    if (selectedBlipId !== 'eva-astro' || scanProgress < 100) return;
    SFX.snapCorrect();
    const coords = 'LEO-4 · X:+418.4 km · Y:-127.9 km · Z:+62.1 km';
    setAstronautLocated(true);
    setCoordinatesLabel(coords);
    setStageBanner('Coordinates locked! Tune radio to establish voice contact.');
    SFX.speakCue('Life sign confirmed! Coordinates locked. Establish radio contact.');
    setStage(2);
    persistProgress({
      stage: 2,
      astronautLocated: true,
      coordinatesLabel: coords,
    });
  };

  // ==========================================================
  // STAGE 2: FREQUENCY MATCHING
  // ==========================================================
  const signalLockPct = useMemo(() => {
    const freqDiff = Math.abs(freqMhz - TARGET_FREQ);
    const phaseDiff = Math.abs(phaseDeg - TARGET_PHASE);
    const freqScore = Math.max(0, 1 - freqDiff / 12);
    const phaseScore = Math.max(0, 1 - phaseDiff / 110);
    return Math.round((freqScore * 0.62 + phaseScore * 0.38) * 100);
  }, [freqMhz, phaseDeg]);

  useEffect(() => {
    if (!visible || stage !== 2 || failedReason || commsEstablished) return;
    const id = window.setInterval(() => {
      setCommsHoldPct((prev) => {
        if (signalLockPct >= 90) {
          return Math.min(100, prev + 12);
        }
        return Math.max(0, prev - 10);
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [commsEstablished, failedReason, signalLockPct, stage, visible]);

  const handleEstablishComms = useCallback(() => {
    if (signalLockPct < 90) {
      SFX.snapWrong();
      return;
    }
    SFX.sunlightRestored();
    setCommsEstablished(true);
    setStageBanner('Voice link active! Pilot through the debris field to reach the astronaut.');
    SFX.speakCue('Radio contact established! Navigate carefully through the debris field.');
    setStage(3);
    persistProgress({
      stage: 3,
      commsEstablished: true,
    });
  }, [persistProgress, signalLockPct]);

  // ==========================================================
  // STAGE 3: DEBRIS FIELD NAVIGATION (FIRST-PERSON COCKPIT)
  // ==========================================================
  useEffect(() => {
    if (!visible || stage !== 3 || failedReason || debrisNavigated) return;
    const canvas = flightCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 680;
    const H = 360;
    const FOCAL = 250;
    const HORIZON_Y = H * 0.44;

    // Cockpit spacecraft position & attitude in orbital corridor
    let camX = 0;
    let camY = 0;
    let camVx = 0;
    let camVy = 0;
    let rollRad = 0;
    let pitchOffset = 0;
    let invulnTimer = 0;
    let hitShake = 0;
    let distanceM = 0;
    const TARGET_DISTANCE_M = 1100;
    let nextId = 1;
    let spawnTimer = 0.8;
    let pickupTimer = 2.6;
    let animTime = 0;

    // Optional direct pointer-steering inside windshield
    const pointerSteer = { active: false, normX: 0, normY: 0 };

    // 3D Starfield streaming past cockpit windshield
    const stars = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 2.8,
      y: (Math.random() - 0.5) * 2.0,
      z: 0.12 + Math.random() * 1.35,
      size: 0.8 + Math.random() * 1.4,
      tint: Math.random() > 0.7 ? '#bae6fd' : '#ffffff',
    }));

    // Initial distant obstacles placed gently off-center so pilot has clear reaction time
    const entities: DebrisEntity[] = [
      { id: nextId++, x: -0.34, y: -0.14, z: 0.96, vx: 0.02, vy: 0.01, vz: 0.21, r: 0.14, rot: 0.2, vRot: 0.85, kind: 'panel' },
      { id: nextId++, x: 0.36, y: 0.16, z: 1.32, vx: -0.02, vy: -0.01, vz: 0.22, r: 0.13, rot: 1.0, vRot: -1.1, kind: 'rock' },
    ];

    const clearControls = () => {
      flightControlRef.current = { up: false, down: false, left: false, right: false, boost: false };
      pointerSteer.active = false;
    };
    clearControls();

    const updatePointerSteer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((clientY - rect.top) / rect.height - 0.45) * 2;
      pointerSteer.normX = Math.max(-1, Math.min(1, nx));
      pointerSteer.normY = Math.max(-1, Math.min(1, ny));
    };

    const onCanvasPointerDown = (e: PointerEvent) => {
      pointerSteer.active = true;
      updatePointerSteer(e.clientX, e.clientY);
    };
    const onCanvasPointerMove = (e: PointerEvent) => {
      if (!pointerSteer.active) return;
      updatePointerSteer(e.clientX, e.clientY);
    };
    const onCanvasPointerUp = () => {
      pointerSteer.active = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (e.key === 'ArrowUp') e.preventDefault();
        flightControlRef.current.up = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (e.key === 'ArrowDown') e.preventDefault();
        flightControlRef.current.down = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (e.key === 'ArrowLeft') e.preventDefault();
        flightControlRef.current.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (e.key === 'ArrowRight') e.preventDefault();
        flightControlRef.current.right = true;
      }
      if (e.key === 'Shift') flightControlRef.current.boost = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') flightControlRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') flightControlRef.current.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') flightControlRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') flightControlRef.current.right = false;
      if (e.key === 'Shift') flightControlRef.current.boost = false;
    };

    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    window.addEventListener('pointermove', onCanvasPointerMove);
    window.addEventListener('pointerup', onCanvasPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearControls);

    let raf = 0;
    let last = performance.now();
    let finished = false;
    let lastReportedPct = -1;

    const project = (wx: number, wy: number, wz: number) => {
      const dx = wx - camX;
      const dy = wy - camY;
      const cosR = Math.cos(-rollRad);
      const sinR = Math.sin(-rollRad);
      const rx = dx * cosR - dy * sinR;
      const ry = dx * sinR + dy * cosR;
      const safeZ = Math.max(0.05, wz);
      return {
        sx: W * 0.5 + (rx / safeZ) * FOCAL,
        sy: HORIZON_Y + pitchOffset + (ry / safeZ) * FOCAL,
        scale: 1 / safeZ,
      };
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      animTime += dt;
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - dt);
      if (hitShake > 0) hitShake = Math.max(0, hitShake - dt * 3.5);

      const ctrl = flightControlRef.current;
      let steerX = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
      let steerY = (ctrl.down ? 1 : 0) - (ctrl.up ? 1 : 0);

      if (pointerSteer.active && steerX === 0 && steerY === 0) {
        steerX = Math.abs(pointerSteer.normX) > 0.08 ? pointerSteer.normX : 0;
        steerY = Math.abs(pointerSteer.normY) > 0.08 ? pointerSteer.normY : 0;
      }

      const steerSpd = ctrl.boost ? 0.92 : 0.74;
      const targetVx = steerX * steerSpd;
      const targetVy = steerY * steerSpd * 0.85;
      camVx += (targetVx - camVx) * Math.min(1, dt * 8.5);
      camVy += (targetVy - camVy) * Math.min(1, dt * 8.5);

      camX = Math.max(-0.78, Math.min(0.78, camX + camVx * dt));
      camY = Math.max(-0.52, Math.min(0.52, camY + camVy * dt));

      // Cockpit bank/roll & pitch feedback (positive rollRad = banking right)
      const targetRoll = camVx * 0.28;
      const targetPitch = -camVy * 22;
      rollRad += (targetRoll - rollRad) * Math.min(1, dt * 8);
      pitchOffset += (targetPitch - pitchOffset) * Math.min(1, dt * 8);

      const cruiseRate = ctrl.boost ? 128 : 82;
      distanceM = Math.min(TARGET_DISTANCE_M, distanceM + cruiseRate * dt);
      const pct = Math.min(100, Math.round((distanceM / TARGET_DISTANCE_M) * 100));
      if (pct !== lastReportedPct) {
        lastReportedPct = pct;
        setFlightProgressPct(pct);
      }

      // Slower, well-spaced debris spawning (~4.5 - 6s travel time to windshield)
      spawnTimer -= dt;
      if (spawnTimer <= 0 && distanceM < TARGET_DISTANCE_M - 100) {
        spawnTimer = 1.05 + Math.random() * 0.65;
        const kinds: Array<'panel' | 'rock' | 'tank'> = ['panel', 'rock', 'tank'];
        const biasTowardPlayer = Math.random() < 0.45;
        const spawnX = biasTowardPlayer
          ? Math.max(-0.78, Math.min(0.78, camX + (Math.random() - 0.5) * 0.45))
          : (Math.random() - 0.5) * 1.65;
        const spawnY = biasTowardPlayer
          ? Math.max(-0.52, Math.min(0.52, camY + (Math.random() - 0.5) * 0.35))
          : (Math.random() - 0.5) * 1.1;

        entities.push({
          id: nextId++,
          x: spawnX,
          y: spawnY,
          z: 1.38,
          vx: (Math.random() - 0.5) * 0.04,
          vy: (Math.random() - 0.5) * 0.03,
          vz: 0.18 + Math.random() * 0.07, // Slow, readable forward closing speed
          r: 0.11 + Math.random() * 0.045,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 1.4,
          kind: kinds[Math.floor(Math.random() * kinds.length)],
        });
      }

      // Spawn O2 / Hull repair pickups
      pickupTimer -= dt;
      if (pickupTimer <= 0 && distanceM < TARGET_DISTANCE_M - 120) {
        pickupTimer = 4.2 + Math.random() * 2.0;
        entities.push({
          id: nextId++,
          x: (Math.random() - 0.5) * 1.1,
          y: (Math.random() - 0.5) * 0.72,
          z: 1.35,
          vx: 0,
          vy: 0,
          vz: 0.19,
          r: 0.1,
          rot: 0,
          vRot: 1.2,
          kind: Math.random() > 0.45 ? 'o2' : 'repair',
        });
      }

      // Update entities & windshield-plane collisions
      const speedMul = ctrl.boost ? 1.45 : 1;
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        ent.x += ent.vx * dt;
        ent.y += ent.vy * dt;
        ent.z -= ent.vz * speedMul * dt;
        ent.rot += ent.vRot * dt;

        // Check collision as entity passes cockpit windshield plane
        if (ent.z <= 0.16 && ent.z >= 0.04) {
          const dist = Math.hypot(ent.x - camX, ent.y - camY);
          const hitThreshold = ent.kind === 'o2' || ent.kind === 'repair' ? ent.r + 0.17 : ent.r + 0.1;
          if (dist < hitThreshold) {
            if (ent.kind === 'o2') {
              SFX.snapCorrect();
              setOxygenPct((o) => Math.min(100, Number((o + 9).toFixed(1))));
              entities.splice(i, 1);
              continue;
            } else if (ent.kind === 'repair') {
              SFX.taskComplete();
              setHullPct((h) => Math.min(100, h + 12));
              entities.splice(i, 1);
              continue;
            } else if (invulnTimer <= 0) {
              invulnTimer = 0.9;
              hitShake = 1;
              SFX.snapWrong();
              setFlightHitFlash(true);
              window.setTimeout(() => setFlightHitFlash(false), 260);
              setHullPct((h) => Math.max(0, h - 16));
              entities.splice(i, 1);
              continue;
            }
          }
        }

        if (ent.z < 0.04) {
          entities.splice(i, 1);
        }
      }

      // =======================================
      // RENDER FIRST-PERSON COCKPIT VIEWPORT
      // =======================================
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (hitShake > 0) {
        ctx.translate((Math.random() - 0.5) * 9 * hitShake, (Math.random() - 0.5) * 9 * hitShake);
      } else if (ctrl.boost) {
        ctx.translate(Math.sin(animTime * 48) * 1.1, Math.cos(animTime * 42) * 1.1);
      }

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#020714');
      bg.addColorStop(0.55, '#051128');
      bg.addColorStop(1, '#081d3f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Tilting Earth atmospheric horizon curve
      ctx.save();
      ctx.translate(W * 0.5, HORIZON_Y + pitchOffset);
      ctx.rotate(-rollRad);
      const earthGrad = ctx.createRadialGradient(0, 395 - camY * 50, 210, 0, 395 - camY * 50, 440);
      earthGrad.addColorStop(0, 'rgba(14,165,233,0.42)');
      earthGrad.addColorStop(0.58, 'rgba(56,189,248,0.22)');
      earthGrad.addColorStop(1, 'rgba(4,12,31,0)');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(0, 395 - camY * 50, 440, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(79,227,212,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 395 - camY * 50, 315, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();

      // 3D Starfield streaming past windshield
      stars.forEach((st) => {
        const prevZ = st.z;
        st.z -= (ctrl.boost ? 0.62 : 0.24) * dt;
        if (st.z <= 0.08) {
          st.x = (Math.random() - 0.5) * 2.8;
          st.y = (Math.random() - 0.5) * 2.0;
          st.z = 1.38;
          return;
        }
        const p = project(st.x, st.y, st.z);
        if (p.sx < -20 || p.sx > W + 20 || p.sy < -20 || p.sy > H + 20) return;
        const alpha = Math.min(0.95, Math.max(0.15, 1.35 - st.z));
        ctx.globalAlpha = alpha;
        if (ctrl.boost) {
          const pPrev = project(st.x, st.y, prevZ + 0.04);
          ctx.strokeStyle = st.tint;
          ctx.lineWidth = Math.max(1, st.size * 0.75);
          ctx.beginPath();
          ctx.moveTo(pPrev.sx, pPrev.sy);
          ctx.lineTo(p.sx, p.sy);
          ctx.stroke();
        } else {
          ctx.fillStyle = st.tint;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, Math.min(2.6, st.size * (0.65 / st.z)), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Target Astronaut silhouette appearing ahead in the distance from 70% approach
      if (pct >= 70) {
        const az = Math.max(0.24, 1.25 - ((pct - 70) / 30) * 0.98);
        const ax = Math.sin(animTime * 1.6) * 0.06;
        const ay = Math.cos(animTime * 2.1) * 0.04;
        const ap = project(ax, ay, az);
        const s = Math.min(1.6, ap.scale * 0.48);
        ctx.save();
        ctx.translate(ap.sx, ap.sy);
        ctx.scale(s, s);
        ctx.strokeStyle = '#4fe3d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, -9, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-4.5, -11, 9, 4.5);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-6.5, -1, 13, 15);
        ctx.restore();
      }

      // Draw Debris & Pickups back-to-front (painter's order)
      const sortedEntities = [...entities].sort((a, b) => b.z - a.z);
      let threatLevel = 0;

      sortedEntities.forEach((ent) => {
        const p = project(ent.x, ent.y, ent.z);
        const drawR = Math.max(4, ent.r * p.scale * FOCAL);
        const depthAlpha = Math.min(1, Math.max(0.25, (1.42 - ent.z) * 2.2));
        const laneDist = Math.hypot(ent.x - camX, ent.y - camY);
        const isPickup = ent.kind === 'o2' || ent.kind === 'repair';
        const inDangerLane = !isPickup && ent.z < 0.72 && laneDist < ent.r + 0.16;
        if (inDangerLane) {
          threatLevel = Math.max(threatLevel, 1 - ent.z / 0.72);
        }

        ctx.save();
        ctx.globalAlpha = depthAlpha;
        ctx.translate(p.sx, p.sy);

        // Tactical lane bracket around incoming objects in front of cockpit
        if (inDangerLane) {
          ctx.strokeStyle = ent.z < 0.36 ? '#f43f5e' : '#fbbf24';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, drawR + 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isPickup && ent.z < 1.1) {
          ctx.strokeStyle = ent.kind === 'o2' ? '#38bdf8' : '#34d399';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, drawR + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.rotate(ent.rot);
        if (ent.kind === 'o2') {
          ctx.fillStyle = '#0ea5e9';
          ctx.strokeStyle = '#67e8f9';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-drawR, -drawR, drawR * 2, drawR * 2, Math.max(3, drawR * 0.4));
          ctx.fill();
          ctx.stroke();
          if (drawR > 9) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(drawR * 0.8)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('O₂', 0, 1);
          }
        } else if (ent.kind === 'repair') {
          ctx.fillStyle = '#059669';
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-drawR, -drawR, drawR * 2, drawR * 2, Math.max(3, drawR * 0.4));
          ctx.fill();
          ctx.stroke();
          if (drawR > 9) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(drawR * 0.95)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', 0, 1);
          }
        } else if (ent.kind === 'panel') {
          ctx.fillStyle = '#1e3a8a';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = Math.max(1.2, drawR * 0.08);
          ctx.fillRect(-drawR * 1.15, -drawR * 0.62, drawR * 2.3, drawR * 1.24);
          ctx.strokeRect(-drawR * 1.15, -drawR * 0.62, drawR * 2.3, drawR * 1.24);
          ctx.beginPath();
          ctx.moveTo(0, -drawR * 0.62);
          ctx.lineTo(0, drawR * 0.62);
          ctx.stroke();
        } else if (ent.kind === 'tank') {
          ctx.fillStyle = '#475569';
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = Math.max(1.2, drawR * 0.09);
          ctx.beginPath();
          ctx.roundRect(-drawR * 0.85, -drawR * 0.68, drawR * 1.7, drawR * 1.36, Math.max(3, drawR * 0.35));
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = '#64748b';
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.max(1.2, drawR * 0.08);
          ctx.beginPath();
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * Math.PI * 2;
            const rad = drawR * (k % 2 === 0 ? 1 : 0.72);
            if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
            else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      // =======================================
      // HOLOGRAPHIC WINDSHIELD HUD RETICLE
      // =======================================
      ctx.save();
      ctx.translate(W * 0.5, HORIZON_Y);
      ctx.strokeStyle = threatLevel > 0.45 ? 'rgba(244,63,94,0.8)' : 'rgba(79,227,212,0.55)';
      ctx.lineWidth = 1.6;
      // Artificial horizon wings rotating with spacecraft roll
      ctx.save();
      ctx.rotate(-rollRad);
      ctx.beginPath();
      ctx.moveTo(-48, 0);
      ctx.lineTo(-22, 0);
      ctx.lineTo(-16, 6);
      ctx.moveTo(48, 0);
      ctx.lineTo(22, 0);
      ctx.lineTo(16, 6);
      ctx.stroke();
      ctx.restore();

      // Fixed center boresight crosshair
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(-17, 0);
      ctx.lineTo(-11, 0);
      ctx.moveTo(11, 0);
      ctx.lineTo(17, 0);
      ctx.moveTo(0, -17);
      ctx.lineTo(0, -11);
      ctx.stroke();

      if (pointerSteer.active) {
        const px = pointerSteer.normX * (W * 0.34);
        const py = pointerSteer.normY * (H * 0.32);
        ctx.strokeStyle = 'rgba(79,227,212,0.5)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#4fe3d4';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (threatLevel > 0.45) {
        ctx.fillStyle = '#fb7185';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▲ DEBRIS IN FLIGHT PATH — STEER CLEAR ▲', 0, -26);
      }
      ctx.restore();

      // Invulnerability shield tint on windshield after scrape
      if (invulnTimer > 0 && Math.floor(animTime * 14) % 2 === 0) {
        ctx.fillStyle = 'rgba(244,63,94,0.16)';
        ctx.fillRect(0, 0, W, H);
      }

      // =======================================
      // INTERIOR COCKPIT CANOPY FRAME & YOKE
      // =======================================
      // Top canopy brow & side A-pillars
      ctx.fillStyle = '#081224';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(W - 44, H);
      ctx.lineTo(W - 92, 46);
      ctx.lineTo(W * 0.5 + 95, 22);
      ctx.lineTo(W * 0.5 - 95, 22);
      ctx.lineTo(92, 46);
      ctx.lineTo(44, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Inner metallic strut rim highlights
      ctx.strokeStyle = 'rgba(56,189,248,0.38)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, H - 52);
      ctx.lineTo(92, 46);
      ctx.lineTo(W * 0.5 - 95, 22);
      ctx.lineTo(W * 0.5 + 95, 22);
      ctx.lineTo(W - 92, 46);
      ctx.lineTo(W - 44, H - 52);
      ctx.stroke();

      // Subtle canopy glass glare
      ctx.strokeStyle = 'rgba(186,230,253,0.1)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(118, 42);
      ctx.lineTo(186, 98);
      ctx.stroke();

      // Bottom Cockpit Dashboard Cowling
      ctx.fillStyle = '#09152b';
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H - 44);
      ctx.lineTo(135, H - 58);
      ctx.lineTo(W - 135, H - 58);
      ctx.lineTo(W, H - 44);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(79,227,212,0.4)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Left Cockpit Instrument Screen (Speed & Distance Remaining)
      ctx.fillStyle = '#040b18';
      ctx.strokeStyle = 'rgba(56,189,248,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(148, H - 49, 130, 38, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ctrl.boost ? 'THRUST: TURBO' : 'THRUST: CRUISE', 156, H - 35);
      ctx.fillStyle = ctrl.boost ? '#fbbf24' : '#4fe3d4';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`${Math.max(0, Math.round(TARGET_DISTANCE_M - distanceM))}m TO EVA`, 156, H - 19);

      // Right Cockpit Mini Proximity Radar Scope
      ctx.fillStyle = '#040b18';
      ctx.strokeStyle = 'rgba(56,189,248,0.45)';
      ctx.beginPath();
      ctx.roundRect(W - 278, H - 49, 130, 38, 6);
      ctx.fill();
      ctx.stroke();
      const radarCx = W - 252;
      const radarCy = H - 30;
      ctx.strokeStyle = 'rgba(79,227,212,0.35)';
      ctx.beginPath();
      ctx.arc(radarCx, radarCy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#4fe3d4';
      ctx.beginPath();
      ctx.arc(radarCx, radarCy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      entities.forEach((ent) => {
        if (ent.z > 1.25) return;
        const rx = Math.max(-11, Math.min(11, (ent.x - camX) * 14));
        const ry = Math.max(-11, Math.min(11, (ent.y - camY) * 14));
        ctx.fillStyle = ent.kind === 'o2' || ent.kind === 'repair' ? '#34d399' : '#fb7185';
        ctx.beginPath();
        ctx.arc(radarCx + rx, radarCy + ry, 2.1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FWD RADAR', W - 230, H - 34);
      ctx.fillStyle = threatLevel > 0.45 ? '#fb7185' : '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(threatLevel > 0.45 ? 'AVOID!' : 'CORRIDOR OK', W - 230, H - 19);

      // Center Animated Spacecraft Steering Yoke (rotates & shifts with pilot steering!)
      const yokeShiftX = camVx * 14;
      const yokeShiftY = camVy * 9;
      ctx.save();
      ctx.translate(W * 0.5 + yokeShiftX, H - 22 + yokeShiftY);
      ctx.rotate(rollRad * 1.55);
      // Column
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7, 4, 14, 28);
      // Yoke butterfly handles
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-36, -6);
      ctx.quadraticCurveTo(-22, 10, 0, 8);
      ctx.quadraticCurveTo(22, 10, 36, -6);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-36, -6);
      ctx.lineTo(-33, -15);
      ctx.moveTo(36, -6);
      ctx.lineTo(33, -15);
      ctx.stroke();
      // Center hub badge
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#4fe3d4';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-14, -4, 28, 16, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      if (distanceM >= TARGET_DISTANCE_M && !finished) {
        finished = true;
        SFX.levelComplete();
        setDebrisNavigated(true);
        setStageBanner('Astronaut zone reached! Match spacecraft speed to prepare grapple.');
        SFX.speakCue('Debris cleared! Match your spacecraft speed with the drifting astronaut.');
        setStage(4);
        persistProgress({
          stage: 4,
          debrisNavigated: true,
        });
        return;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      clearControls();
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      window.removeEventListener('pointermove', onCanvasPointerMove);
      window.removeEventListener('pointerup', onCanvasPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearControls);
    };
  }, [debrisNavigated, failedReason, persistProgress, stage, visible]);

  // ==========================================================
  // STAGE 4: MATCH SPACECRAFT SPEED
  // ==========================================================
  const shipSpeedRef = useRef<number>(shipSpeedMs);
  shipSpeedRef.current = shipSpeedMs;

  useEffect(() => {
    if (!visible || stage !== 4 || failedReason || speedMatched) return;
    let t = 0;
    let completed = false;
    const id = window.setInterval(() => {
      t += 0.12;
      const targetDrift = Number((14.2 + Math.sin(t * 0.8) * 0.25).toFixed(1));
      setAstroSpeedMs(targetDrift);
      const diff = Math.abs(shipSpeedRef.current - targetDrift);
      setSpeedHoldPct((prev) => {
        if (diff <= 0.45) {
          const next = Math.min(100, prev + 6);
          if (next >= 100 && !completed) {
            completed = true;
            window.setTimeout(() => {
              SFX.snapCorrect();
              setSpeedMatched(true);
              setStageBanner('Velocity synchronized! Align the robotic arm to capture the astronaut.');
              SFX.speakCue('Speed matched! Deploy and align the robotic arm.');
              setStage(5);
              persistProgress({
                stage: 5,
                speedMatched: true,
              });
            }, 0);
          }
          return next;
        }
        return Math.max(0, prev - 5);
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [failedReason, persistProgress, speedMatched, stage, visible]);

  const relativeDeltaV = Number((shipSpeedMs - astroSpeedMs).toFixed(1));

  // ==========================================================
  // STAGE 5: ROBOTIC ARM CAPTURE & AUTO-RETRACTION COMPLETION
  // ==========================================================
  const handleCompleteAndCelebrate = useCallback(async () => {
    setAirlockSecured(true);
    setVictoryOpen(true);
    SFX.levelComplete();
    SFX.badgeUnlock();
    SFX.speakCue('Mission successful! Astronaut rescued! Space Rescue Hero badge unlocked.');
    setClaimingReward(true);
    try {
      const result = await onCompleteMission({
        astronautLocated: true,
        commsEstablished: true,
        debrisNavigated: true,
        speedMatched: true,
        armCaptured: true,
        airlockSecured: true,
        oxygenRemainingPct: Math.round(oxygenPct),
        hullRemainingPct: Math.round(hullPct),
        secondsRemaining: secondsLeft,
        timerExpired: false,
      });
      setRewardResult(result);
    } finally {
      setClaimingReward(false);
    }
  }, [hullPct, onCompleteMission, oxygenPct, secondsLeft]);

  useEffect(() => {
    if (!visible || stage !== 5 || failedReason || armCaptured || isAutoRetracting) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setArmBobTime((t) => t + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armCaptured, failedReason, isAutoRetracting, stage, visible]);

  // Automatic robotic arm retraction animation once captured
  useEffect(() => {
    if (!visible || stage !== 5 || !isAutoRetracting) return;
    const durationMs = 2300;
    const startMs = performance.now();
    let raf = 0;
    let done = false;

    const animateRetract = (now: number) => {
      const rawT = Math.min(1, (now - startMs) / durationMs);
      const eased =
        rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      setRetractAnimPct(Math.round(eased * 100));

      if (rawT < 1) {
        raf = requestAnimationFrame(animateRetract);
      } else if (!done) {
        done = true;
        setClawSnapFlash(false);
        setIsAutoRetracting(false);
        setAirlockSecured(true);
        persistProgress({
          stage: 5,
          armCaptured: true,
          airlockSecured: true,
        });
        void handleCompleteAndCelebrate();
      }
    };

    raf = requestAnimationFrame(animateRetract);
    return () => cancelAnimationFrame(raf);
  }, [handleCompleteAndCelebrate, isAutoRetracting, persistProgress, stage, visible]);

  // Robotic arm kinematics (SVG viewBox 600 x 320)
  // Base pivot at (115, 175)
  const astroTargetPos = useMemo(() => {
    const x = 445 + Math.sin(armBobTime * 1.4) * 10;
    const y = 148 + Math.cos(armBobTime * 1.8) * 14;
    return { x, y };
  }, [armBobTime]);

  const armGeometry = useMemo(() => {
    const baseX = 115;
    const baseY = 175;
    const retractFactor = isAutoRetracting
      ? retractAnimPct / 100
      : armCaptured
      ? Math.max(retractAnimPct / 100, airlockSecured ? 1 : 0)
      : 0;
    const rawAngle =
      retractFactor > 0 ? capturePoseRef.current?.angleDeg ?? armAngleDeg : armAngleDeg;
    const rawExtend =
      retractFactor > 0 ? capturePoseRef.current?.extendPct ?? armExtendPct : armExtendPct;
    const rawWrist =
      retractFactor > 0 ? capturePoseRef.current?.wristDeg ?? wristTiltDeg : wristTiltDeg;

    const rad1 = (rawAngle * Math.PI) / 180;
    const seg1Len = 125 + (rawExtend / 100) * 65;
    const rawElbowX = baseX + Math.cos(rad1) * seg1Len;
    const rawElbowY = baseY + Math.sin(rad1) * seg1Len;

    const rad2 = ((rawAngle * 0.45 + rawWrist * 0.7) * Math.PI) / 180;
    const seg2Len = 105 + (rawExtend / 100) * 85;
    const rawTipX = rawElbowX + Math.cos(rad2) * seg2Len;
    const rawTipY = rawElbowY + Math.sin(rad2) * seg2Len;

    // Smoothly telescope the articulated arm & captured astronaut straight inside CREW BAY (center x=56, y=184)
    const targetElbowX = 88;
    const targetElbowY = 176;
    const targetTipX = 40;
    const targetTipY = 184;

    const elbowX = rawElbowX + (targetElbowX - rawElbowX) * retractFactor;
    const elbowY = rawElbowY + (targetElbowY - rawElbowY) * retractFactor;
    const tipX = rawTipX + (targetTipX - rawTipX) * retractFactor;
    const tipY = rawTipY + (targetTipY - rawTipY) * retractFactor;
    const effectiveWrist = rawWrist * (1 - retractFactor);

    const distToAstro = Math.hypot(rawTipX - (astroTargetPos.x - 16), rawTipY - astroTargetPos.y);
    const wristError = Math.abs(wristTiltDeg - 4);
    const distScore = Math.max(0, 1 - distToAstro / 130);
    const wristScore = Math.max(0, 1 - wristError / 48);
    const alignmentPct = Math.round((distScore * 0.76 + wristScore * 0.24) * 100);

    return {
      baseX,
      baseY,
      elbowX,
      elbowY,
      tipX,
      tipY,
      effectiveWrist,
      distToAstro,
      alignmentPct,
      retractFactor,
    };
  }, [airlockSecured, armAngleDeg, armCaptured, armExtendPct, astroTargetPos, isAutoRetracting, retractAnimPct, wristTiltDeg]);

  const handleGrabAstronaut = useCallback(() => {
    if (isAutoRetracting || armCaptured) return;
    if (armGeometry.alignmentPct < 84 || armGeometry.distToAstro > 34) {
      SFX.snapWrong();
      setStageBanner('Align the robotic claw closer to the glowing EVA grab ring!');
      return;
    }
    capturePoseRef.current = {
      angleDeg: armAngleDeg,
      extendPct: armExtendPct,
      wristDeg: wristTiltDeg,
    };
    SFX.snapCorrect();
    setClawSnapFlash(true);
    setArmCaptured(true);
    setRetractAnimPct(0);
    setIsAutoRetracting(true);
    setStageBanner('Astronaut captured! Robotic arm automatically retracting into rescue bay...');
    SFX.speakCue('Astronaut captured! Retracting robotic arm automatically.');
    persistProgress({
      stage: 5,
      armCaptured: true,
    });
  }, [
    armAngleDeg,
    armCaptured,
    armExtendPct,
    armGeometry.alignmentPct,
    armGeometry.distToAstro,
    isAutoRetracting,
    persistProgress,
    wristTiltDeg,
  ]);

  // Keyboard shortcuts for Stage 4 & Stage 5
  useEffect(() => {
    if (!visible || failedReason) return;
    const onKey = (e: KeyboardEvent) => {
      if (stage === 4) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          setShipSpeedMs((v) => Math.max(5, Number((v - 0.5).toFixed(1))));
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          setShipSpeedMs((v) => Math.min(30, Number((v + 0.5).toFixed(1))));
        }
      } else if (stage === 5 && !armCaptured && !isAutoRetracting) {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowUp') {
          setArmAngleDeg((a) => Math.max(-55, a - 3));
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowDown') {
          setArmAngleDeg((a) => Math.min(55, a + 3));
        } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowRight') {
          setArmExtendPct((p) => Math.min(100, p + 4));
        } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowLeft') {
          setArmExtendPct((p) => Math.max(20, p - 4));
        } else if (e.key === 'q' || e.key === 'Q') {
          setWristTiltDeg((w) => Math.max(-45, w - 4));
        } else if (e.key === 'e' || e.key === 'E') {
          setWristTiltDeg((w) => Math.min(45, w + 4));
        } else if (e.key === ' ') {
          e.preventDefault();
          handleGrabAstronaut();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armCaptured, failedReason, handleGrabAstronaut, isAutoRetracting, stage, visible]);

  if (!visible) return null;

  const timerTone =
    secondsLeft <= 25
      ? 'border-rose-500/80 bg-rose-500/20 text-rose-200 animate-pulse'
      : secondsLeft <= 60
      ? 'border-amber-400/75 bg-amber-500/15 text-amber-200'
      : 'border-cyan-400/45 bg-[#061329] text-[#4fe3d4]';

  const oxygenTone =
    oxygenPct <= 22 ? 'bg-rose-500' : oxygenPct <= 50 ? 'bg-amber-400' : 'bg-[#4fe3d4]';
  const hullTone =
    hullPct <= 30 ? 'bg-rose-500' : hullPct <= 60 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="fixed inset-0 z-[2650] bg-[#020714]/96 flex flex-col overflow-hidden text-white">
      {/* TOP TELEMETRY & NAVIGATION BAR */}
      <header className="px-3 sm:px-5 py-2.5 bg-gradient-to-r from-[#07142b] via-[#0c1e40] to-[#07142b] border-b border-cyan-400/30 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-400/50 flex items-center justify-center text-lg shrink-0">
            🧑‍🚀
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono-tech font-bold uppercase tracking-[1.8px] text-rose-300 truncate">
              LEVEL 08 · SINGLE-PLAYER RESCUE OPS
            </div>
            <h1 className="font-display text-sm sm:text-base font-extrabold text-white truncate">
              LEVEL 8 – RESCUE THE LOST ASTRONAUT
            </h1>
          </div>
        </div>

        {/* Shared Live Mission Gauges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Emergency Countdown */}
          <div className={`px-2.5 py-1 rounded-xl border text-xs font-mono-tech font-extrabold flex items-center gap-1.5 tabular-nums ${timerTone}`}>
            <span>⏱</span>
            <span>{formatCountdownClock(secondsLeft)}</span>
          </div>

          {/* Oxygen Meter */}
          <div className="px-2.5 py-1 rounded-xl bg-[#061226] border border-cyan-400/35 flex items-center gap-2 min-w-[116px]">
            <span className="text-[10px] font-mono-tech font-bold text-cyan-200">O₂</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${oxygenTone}`}
                style={{ width: `${Math.max(0, Math.min(100, oxygenPct))}%` }}
              />
            </div>
            <span className="text-[11px] font-mono-tech font-extrabold tabular-nums text-white">
              {Math.ceil(oxygenPct)}%
            </span>
          </div>

          {/* Hull Integrity */}
          <div className="px-2.5 py-1 rounded-xl bg-[#061226] border border-emerald-400/35 flex items-center gap-2 min-w-[116px]">
            <span className="text-[10px] font-mono-tech font-bold text-emerald-200">HULL</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${hullTone}`}
                style={{ width: `${Math.max(0, Math.min(100, hullPct))}%` }}
              />
            </div>
            <span className="text-[11px] font-mono-tech font-extrabold tabular-nums text-white">
              {Math.ceil(hullPct)}%
            </span>
          </div>

          <DirectorVanceVoiceBanner
            compact
            accentColor="amber"
            quote={LEVEL9_VOICE_BRIEFING_SCRIPT}
          />

          <div className="hidden md:flex px-2.5 py-1 rounded-xl bg-[#061226] border border-amber-400/35 items-center gap-1 text-xs font-mono-tech font-bold text-amber-300 tabular-nums">
            <span>★</span>
            <span>{starCredits.toLocaleString()} SC</span>
          </div>

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              title="Open Spacecraft Engineer's Handbook"
              className="px-2.5 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/28 border border-cyan-400/50 text-[#4fe3d4] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>📖</span>
              <span className="hidden sm:inline">Handbook</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              onExit();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/20 text-xs font-bold text-slate-200 transition cursor-pointer whitespace-nowrap"
          >
            Exit ✕
          </button>
        </div>
      </header>

      {/* STAGE PROGRESS STEPPER BAR */}
      <div className="px-3 sm:px-5 py-2 bg-[#040c1e] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {LEVEL9_STAGE_META.map((item) => {
          const isCurrent = stage === item.id;
          const isDone =
            (item.id === 0 && stage > 0) ||
            (item.id === 1 && astronautLocated) ||
            (item.id === 2 && commsEstablished) ||
            (item.id === 3 && debrisNavigated) ||
            (item.id === 4 && speedMatched) ||
            (item.id === 5 && armCaptured && airlockSecured);
          const canJump = item.id === 0 || isDone || item.id <= stage;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!canJump || stage === 0}
              onClick={() => {
                if (!canJump || stage === 0) return;
                SFX.select();
                setStage(item.id);
              }}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono-tech font-bold whitespace-nowrap transition shrink-0 ${
                isCurrent
                  ? 'bg-[#4fe3d4]/20 border-[#4fe3d4] text-[#4fe3d4] shadow-[0_0_12px_rgba(79,227,212,0.25)]'
                  : isDone
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 cursor-pointer'
                  : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isDone && !isCurrent ? '✓ ' : ''}
              {item.short}
            </button>
          );
        })}
        {stageBanner && stage > 0 && (
          <div className="ml-auto hidden lg:block text-xs font-semibold text-cyan-200 truncate pl-3">
            {stageBanner}
          </div>
        )}
      </div>

      {/* MAIN INTERACTIVE VIEWPORT */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <div className="max-w-6xl mx-auto h-full">
          {/* =====================================================
              STAGE 0: EMERGENCY MISSION INTRODUCTION & VOICE BRIEFING
             ===================================================== */}
          {stage === 0 && (
            <div className="max-w-5xl mx-auto rounded-3xl bg-[#050e22] border border-rose-500/50 overflow-hidden p-4 sm:p-5 flex flex-col gap-3.5 shadow-[0_0_55px_rgba(244,63,94,0.18)]">
              {/* Emergency Alert Header + Key Mission Metrics */}
              <motion.div
                animate={{ opacity: [1, 0.84, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="rounded-2xl bg-rose-500/18 border border-rose-400/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono-tech font-extrabold tracking-widest text-rose-300 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black">
                      SOS
                    </span>
                    <span>EMERGENCY ALERT – CRITICAL · 1 PLAYER</span>
                  </div>
                  <div className="font-display text-base sm:text-lg font-extrabold text-white mt-0.5">
                    ASTRONAUT DISCONNECTED FROM SPACECRAFT!
                  </div>
                </div>

                {/* Time, Reward & Badge Chips */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-400/60 text-xs font-mono-tech font-extrabold text-rose-200 tabular-nums"
                  >
                    ⏱ {formatCountdownClock(LEVEL9_MISSION_DURATION_SEC)}
                  </motion.div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-950/70 border border-amber-400/55 text-xs font-mono-tech font-extrabold text-amber-300 tabular-nums">
                    ★ +{LEVEL9_REWARD_SC} SC
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-400/50 text-[11px] font-mono-tech font-extrabold text-emerald-300 flex items-center gap-1.5">
                    <SpaceRescueHeroBadgeSVG size={22} />
                    <span>{LEVEL9_BADGE_LABEL}</span>
                  </div>
                </div>
              </motion.div>

              {/* Animated Space Control Room Window: Earth, ISS, Floating Astronaut, Rescue Craft */}
              <div className="relative h-[250px] sm:h-[290px] rounded-2xl bg-[#030917] border border-cyan-400/25 overflow-hidden">
                <svg viewBox="0 0 640 310" className="w-full h-full object-cover" fill="none">
                  <defs>
                    <radialGradient id="l9EarthGrad" cx="38%" cy="25%" r="72%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="55%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#062850" />
                    </radialGradient>
                    <radialGradient id="l9AlertGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Twinkling Starfield */}
                  {[
                    [48, 42, 1.5], [125, 86, 1.2], [210, 34, 1.7], [312, 58, 1.3],
                    [425, 28, 1.6], [538, 62, 1.4], [595, 118, 1.8], [86, 152, 1.3],
                    [268, 134, 1.2], [492, 148, 1.5], [568, 224, 1.2], [38, 210, 1.5],
                  ].map(([x, y, r], i) => (
                    <circle key={i} cx={x} cy={y} r={r} fill={i % 2 === 0 ? '#bae6fd' : '#fef08a'} opacity="0.8">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />
                    </circle>
                  ))}

                  {/* Animated Rotating Earth Horizon */}
                  <g>
                    <circle cx="320" cy="435" r="245" fill="url(#l9EarthGrad)" />
                    <ellipse cx="320" cy="435" rx="254" ry="254" stroke="#4fe3d4" strokeOpacity="0.38" strokeWidth="4" />
                    <path d="M180 245 Q245 225 290 255 Q235 280 180 245 Z" fill="#34d399" opacity="0.55">
                      <animateTransform attributeName="transform" type="translate" values="-20 0; 30 0; -20 0" dur="18s" repeatCount="indefinite" />
                    </path>
                    <path d="M360 232 Q425 220 465 252 Q405 272 360 232 Z" fill="#34d399" opacity="0.5">
                      <animateTransform attributeName="transform" type="translate" values="-25 0; 25 0; -25 0" dur="22s" repeatCount="indefinite" />
                    </path>
                    <path d="M120 265 Q320 212 520 265" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" strokeDasharray="34 28">
                      <animate attributeName="stroke-dashoffset" values="0;120" dur="14s" repeatCount="indefinite" />
                    </path>
                  </g>

                  {/* International Space Station (Top Left) */}
                  <motion.g
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <g transform="translate(150, 92) rotate(-11)">
                      <rect x="-85" y="-3" width="170" height="6" rx="2" fill="#94a3b8" />
                      {[-76, -54, 34, 56].map((sx, idx) => (
                        <g key={idx}>
                          <rect x={sx} y="-38" width="16" height="32" rx="1.5" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
                          <rect x={sx} y="6" width="16" height="32" rx="1.5" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
                        </g>
                      ))}
                      <rect x="-24" y="-12" width="48" height="24" rx="6" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                      <rect x="-9" y="-22" width="18" height="44" rx="5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.4" />
                      <path d="M24 4 Q48 16 68 8" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
                      <circle cx="68" cy="8" r="3" fill="#f43f5e" />
                    </g>
                  </motion.g>

                  {/* Rescue Spacecraft (Bottom Left Standby) */}
                  <motion.g
                    animate={{ x: [0, 6, 0], y: [0, -5, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <g transform="translate(148, 204) rotate(-8)">
                      <polygon points="-24,-6 -44,0 -24,6" fill="#38bdf8" opacity="0.8" />
                      <rect x="-22" y="-12" width="40" height="24" rx="7" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                      <polygon points="18,-10 34,-4 34,4 18,10" fill="#0ea5e9" />
                      <rect x="-6" y="-6" width="14" height="12" rx="3" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.4" />
                      <path d="M28 0 L52 -8 L66 -2" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                    </g>
                  </motion.g>

                  {/* Drifting Astronaut with SOS Beacon (Right Side) */}
                  <motion.g
                    animate={{ x: [0, 14, 4, 14, 0], y: [0, -10, 6, -8, 0], rotate: [-8, 12, -4, 10, -8] }}
                    transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: '475px 135px' }}
                  >
                    <circle cx="475" cy="135" r="46" fill="url(#l9AlertGlow)" />
                    <circle cx="475" cy="135" r="28" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="5 4">
                      <animate attributeName="r" values="24;36;24" dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <g transform="translate(475, 135)">
                      <rect x="-15" y="-10" width="8" height="22" rx="3" fill="#94a3b8" />
                      <rect x="-10" y="-10" width="20" height="24" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                      <circle cx="0" cy="-20" r="10.5" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.6" />
                      <rect x="-6.5" y="-23" width="13" height="7" rx="3" fill="#fbbf24" />
                      <path d="M-10 -4 L-22 -14 M10 -4 L22 -12" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                      <path d="M-5 14 L-9 26 M5 14 L10 25" stroke="#f8fafc" strokeWidth="4.2" strokeLinecap="round" />
                      <circle cx="0" cy="-1" r="3" fill="#f43f5e" />
                    </g>
                  </motion.g>
                </svg>

                {/* Mission Control Room Telemetry Overlay */}
                <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tech">
                  <span className="px-2.5 py-1 rounded-lg bg-[#051024]/90 border border-cyan-400/35 text-cyan-200">
                    ISS ORBIT · 408 KM ALTITUDE
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['📡 Radar', '📻 Comms', '☄️ Debris', '⚡ Speed', '🦾 Grab & Reel In'].map((step) => (
                      <span
                        key={step}
                        className="px-2 py-0.5 rounded-md bg-[#051024]/88 border border-white/15 text-[10px] font-bold text-slate-200"
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Director Vance Voice Briefing */}
              <DirectorVanceVoiceBanner
                speaker="DIRECTOR VANCE // VOICE BRIEFING"
                quote={LEVEL9_VOICE_BRIEFING_SCRIPT}
                autoPlayKey={visible && stage === 0 ? 'lvl9-emergency-voice-brief' : null}
                accentColor="amber"
              />

              {/* Emergency Launch Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleStartRescueMission}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#f43f5e] via-[#f59e0b] to-[#4fe3d4] text-[#041022] font-display font-black text-sm sm:text-base tracking-wide uppercase shadow-[0_10px_28px_rgba(244,63,94,0.35)] cursor-pointer"
                >
                  START RESCUE MISSION ▶
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.cancelSpeech();
                    SFX.click();
                    onBackToLevelMap();
                  }}
                  className="sm:w-56 py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-slate-300 uppercase cursor-pointer"
                >
                  Return to Level Map
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              STAGE 1: LOCATE THE MISSING ASTRONAUT (RADAR)
             ===================================================== */}
          {stage === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4 items-stretch">
              <div className="rounded-3xl bg-[#050e20] border border-cyan-400/35 p-4 flex flex-col items-center justify-center">
                <div className="text-xs font-mono-tech font-bold text-[#4fe3d4] mb-2">
                  STAGE 1 · TAP RADAR BLIPS TO SCAN FOR A LIFE-SIGN
                </div>
                <svg viewBox="0 0 400 400" className="w-full max-w-[380px] aspect-square select-none">
                  <defs>
                    <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#072238" />
                      <stop offset="100%" stopColor="#030b19" />
                    </radialGradient>
                    <linearGradient id="sweepGrad" x1="50%" y1="50%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4fe3d4" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#4fe3d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <circle cx="200" cy="200" r="186" fill="url(#radarBg)" stroke="#38bdf8" strokeWidth="2.2" />
                  {[60, 115, 168].map((r) => (
                    <circle key={r} cx="200" cy="200" r={r} stroke="#1e3a5f" strokeWidth="1.2" strokeDasharray="4 4" fill="none" />
                  ))}
                  <line x1="14" y1="200" x2="386" y2="200" stroke="#1e3a5f" strokeWidth="1" />
                  <line x1="200" y1="14" x2="200" y2="386" stroke="#1e3a5f" strokeWidth="1" />

                  {/* Sweeping Radar Beam */}
                  <g transform={`rotate(${(radarTime * 85) % 360} 200 200)`}>
                    <path d="M200 200 L200 18 A182 182 0 0 1 285 38 Z" fill="url(#sweepGrad)" />
                    <line x1="200" y1="200" x2="200" y2="18" stroke="#4fe3d4" strokeWidth="2" />
                  </g>

                  {/* Center ISS */}
                  <circle cx="200" cy="200" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="200" y="218" textAnchor="middle" fill="#bae6fd" fontSize="9" fontFamily="monospace">
                    ISS
                  </text>

                  {/* Moving Objects */}
                  {RADAR_OBJECTS.map((obj) => {
                    const ang = obj.angle + radarTime * obj.angularSpeed;
                    const rad = (obj.radius + Math.sin(radarTime * 2 + obj.angle) * obj.radialWobble) * 165;
                    const bx = 200 + Math.cos(ang) * rad;
                    const by = 200 + Math.sin(ang) * rad;
                    const isSel = selectedBlipId === obj.id;
                    const color =
                      obj.kind === 'astronaut'
                        ? '#f43f5e'
                        : obj.kind === 'satellite'
                        ? '#38bdf8'
                        : '#f59e0b';
                    return (
                      <g
                        key={obj.id}
                        onClick={() => {
                          SFX.select();
                          setSelectedBlipId(obj.id);
                          setScanProgress(0);
                        }}
                        className="cursor-pointer"
                      >
                        <circle cx={bx} cy={by} r={isSel ? 18 : 14} fill="transparent" />
                        {isSel && (
                          <circle
                            cx={bx}
                            cy={by}
                            r="15"
                            stroke="#4fe3d4"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            fill="none"
                          />
                        )}
                        {obj.kind === 'astronaut' && (
                          <circle cx={bx} cy={by} r="11" stroke="#f43f5e" strokeOpacity="0.5" strokeWidth="1.5" fill="none">
                            <animate attributeName="r" values="7;15;7" dur="1.4s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle cx={bx} cy={by} r={isSel ? 6.5 : 5} fill={color} stroke="#ffffff" strokeWidth="1.3" />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Right: Signal Inspector */}
              <div className="rounded-3xl bg-[#071329] border border-cyan-400/35 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-mono-tech font-bold text-[#4fe3d4] uppercase">
                      Signal Analyzer
                    </div>
                    <h2 className="font-display text-xl font-extrabold text-white mt-0.5">
                      Isolate Astronaut Life-Sign
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Click blips on the radar to inspect their signature. Satellites ping telemetry, debris is static—find the pulsing EVA heartbeat!
                    </p>
                  </div>

                  {/* Selected Target Card */}
                  <div className="rounded-2xl bg-[#050e20] border border-white/12 p-4 space-y-3">
                    {!selectedRadarObj ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        Select any moving blip on the radar screen to scan it.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-sm text-white">
                            {selectedRadarObj.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold ${
                              selectedRadarObj.kind === 'astronaut'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-400/35'
                            }`}
                          >
                            {selectedRadarObj.freqLabel}
                          </span>
                        </div>

                        {/* Live Signature Animation */}
                        <div className="h-16 rounded-xl bg-[#030814] border border-cyan-400/20 flex items-center justify-center overflow-hidden px-3">
                          {selectedRadarObj.kind === 'astronaut' ? (
                            <svg viewBox="0 0 220 44" className="w-full h-11" fill="none">
                              <path
                                d="M0 22 H40 L50 8 L58 36 L66 14 L74 22 H120 L130 8 L138 36 L146 14 L154 22 H220"
                                stroke="#34d399"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : selectedRadarObj.kind === 'satellite' ? (
                            <svg viewBox="0 0 220 44" className="w-full h-11" fill="none">
                              <path
                                d="M0 22 Q27 6 55 22 T110 22 T165 22 T220 22"
                                stroke="#38bdf8"
                                strokeWidth="2.2"
                              />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 220 44" className="w-full h-11" fill="none">
                              <path
                                d="M0 22 L18 14 L32 30 L48 16 L68 28 L90 12 L112 31 L136 16 L160 28 L188 15 L220 22"
                                stroke="#f59e0b"
                                strokeWidth="1.8"
                                strokeDasharray="3 2"
                              />
                            </svg>
                          )}
                        </div>

                        {selectedRadarObj.kind === 'astronaut' ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono-tech">
                              <span className="text-emerald-300 font-bold">BIOMETRIC PULSE DETECTED!</span>
                              <span className="text-[#4fe3d4] font-extrabold">{scanProgress}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#4fe3d4] to-emerald-400 transition-all duration-100"
                                style={{ width: `${scanProgress}%` }}
                              />
                            </div>
                            {scanProgress >= 100 && (
                              <div className="text-xs font-mono-tech text-cyan-200 bg-cyan-500/10 border border-cyan-400/35 rounded-lg px-3 py-2">
                                COORDS: LEO-4 · X:+418.4 · Y:-127.9 · Z:+62.1 km
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2">
                            {selectedRadarObj.kind === 'satellite'
                              ? 'Mechanical relay ping only—keep scanning for the red pulsing SOS blip!'
                              : 'Cold metallic debris—no life-sign detected. Try another blip!'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={selectedBlipId !== 'eva-astro' || scanProgress < 100}
                  onClick={handleLockAstronautCoords}
                  className={`w-full py-3.5 px-4 rounded-xl font-display font-extrabold text-sm uppercase transition ${
                    selectedBlipId === 'eva-astro' && scanProgress >= 100
                      ? 'bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] shadow-[0_8px_24px_rgba(52,211,153,0.35)] hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {selectedBlipId === 'eva-astro' && scanProgress >= 100
                    ? 'LOCK COORDINATES & ESTABLISH COMMS ▶'
                    : 'SCANNING FOR ASTRONAUT LIFE-SIGN...'}
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              STAGE 2: ESTABLISH COMMUNICATION (FREQUENCY MATCHER)
             ===================================================== */}
          {stage === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4 items-stretch">
              <div className="rounded-3xl bg-[#050e20] border border-cyan-400/35 p-5 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono-tech font-bold text-[#4fe3d4] uppercase">
                      STAGE 2 · RADIO WAVE OSCILLOSCOPE
                    </div>
                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                      Match Carrier Frequency &amp; Phase
                    </h2>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-xl font-mono-tech text-xs font-extrabold border ${
                      signalLockPct >= 90
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                    }`}
                  >
                    LOCK: {signalLockPct}%
                  </div>
                </div>

                {/* Live Dual-Wave SVG Oscilloscope */}
                <div className="rounded-2xl bg-[#030917] border border-cyan-400/25 p-4">
                  <svg viewBox="0 0 520 180" className="w-full h-44" fill="none">
                    <line x1="0" y1="90" x2="520" y2="90" stroke="#1e293b" strokeWidth="1.2" />
                    <line x1="260" y1="10" x2="260" y2="170" stroke="#1e293b" strokeWidth="1.2" />
                    {/* Target Astronaut Carrier Wave */}
                    <path
                      d={Array.from({ length: 53 }, (_, i) => {
                        const x = i * 10;
                        const y = 90 + Math.sin((i * 0.34) + (TARGET_PHASE * Math.PI) / 180) * 52;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                      }).join(' ')}
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.85"
                    />
                    {/* Player Tuned Wave */}
                    <path
                      d={Array.from({ length: 53 }, (_, i) => {
                        const x = i * 10;
                        const freqRatio = 0.34 * (freqMhz / TARGET_FREQ);
                        const y = 90 + Math.sin(i * freqRatio + (phaseDeg * Math.PI) / 180) * 52;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
                      }).join(' ')}
                      stroke={signalLockPct >= 90 ? '#34d399' : '#38bdf8'}
                      strokeWidth="3.2"
                    />
                  </svg>
                  <div className="flex justify-between text-[11px] font-mono-tech mt-1 text-slate-400">
                    <span className="text-amber-300">--- Astronaut SOS Carrier ({TARGET_FREQ} MHz)</span>
                    <span className={signalLockPct >= 90 ? 'text-emerald-300' : 'text-sky-300'}>
                      ━━ Your Transceiver ({freqMhz.toFixed(1)} MHz)
                    </span>
                  </div>
                </div>

                {/* Tactile Tuner Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#091833] border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300 font-bold">FREQUENCY</span>
                      <span className="text-[#4fe3d4] font-extrabold tabular-nums">{freqMhz.toFixed(1)} MHz</span>
                    </div>
                    <input
                      type="range"
                      min={110}
                      max={150}
                      step={0.2}
                      value={freqMhz}
                      onChange={(e) => setFreqMhz(Number(e.target.value))}
                      className="w-full accent-[#4fe3d4] cursor-pointer"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          SFX.sliderTick();
                          setFreqMhz((f) => Math.max(110, Number((f - 0.4).toFixed(1))));
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-bold cursor-pointer"
                      >
                        -0.4 MHz
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          SFX.sliderTick();
                          setFreqMhz((f) => Math.min(150, Number((f + 0.4).toFixed(1))));
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-bold cursor-pointer"
                      >
                        +0.4 MHz
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#091833] border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300 font-bold">PHASE ALIGN</span>
                      <span className="text-amber-300 font-extrabold tabular-nums">{phaseDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={phaseDeg}
                      onChange={(e) => setPhaseDeg(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          SFX.sliderTick();
                          setPhaseDeg((p) => Math.max(0, p - 10));
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-bold cursor-pointer"
                      >
                        -10°
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          SFX.sliderTick();
                          setPhaseDeg((p) => Math.min(360, p + 10));
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-bold cursor-pointer"
                      >
                        +10°
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Astronaut Radio Portrait & Lock Button */}
              <div className="rounded-3xl bg-[#071329] border border-cyan-400/35 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#050e20] border border-cyan-400/25 p-4 text-center space-y-2">
                    <motion.div
                      animate={signalLockPct >= 90 ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-20 h-20 mx-auto rounded-2xl bg-[#091b3a] border-2 border-[#4fe3d4] flex items-center justify-center text-4xl"
                    >
                      👩‍🚀
                    </motion.div>
                    <div className="font-display font-extrabold text-sm text-white">
                      {signalLockPct >= 90 ? '“I hear you! Please hurry!”' : '“...static... tether broke... help...”'}
                    </div>
                    <div className="text-[11px] font-mono-tech text-cyan-200">
                      {coordinatesLabel || 'LEO-4 · X:+418.4 · Y:-127.9 · Z:+62.1 km'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-center">
                    <div className="p-3 rounded-xl bg-[#091833] border border-cyan-400/25">
                      <div className="text-[10px] font-mono-tech text-slate-400">ASTRONAUT O₂</div>
                      <div className="font-mono-tech text-lg font-extrabold text-[#4fe3d4] tabular-nums">
                        {Math.ceil(oxygenPct)}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#091833] border border-rose-400/25">
                      <div className="text-[10px] font-mono-tech text-slate-400">COUNTDOWN</div>
                      <div className="font-mono-tech text-lg font-extrabold text-rose-300 tabular-nums">
                        {formatCountdownClock(secondsLeft)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300">Signal Stabilization</span>
                      <span className="text-emerald-300 font-bold">{commsHoldPct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-150"
                        style={{ width: `${commsHoldPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={signalLockPct < 90}
                  onClick={handleEstablishComms}
                  className={`w-full py-3.5 px-4 rounded-xl font-display font-extrabold text-sm uppercase transition ${
                    signalLockPct >= 90
                      ? 'bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] shadow-[0_8px_24px_rgba(52,211,153,0.35)] hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {signalLockPct >= 90
                    ? 'ESTABLISH COMMS & FLY THROUGH DEBRIS ▶'
                    : 'TUNE TO ≥ 90% SIGNAL LOCK'}
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              STAGE 3: NAVIGATE THROUGH SPACE DEBRIS
             ===================================================== */}
          {stage === 3 && (
            <div className="rounded-3xl bg-[#050e20] border border-cyan-400/35 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono-tech font-bold text-[#4fe3d4] uppercase">
                    STAGE 3 · DEBRIS FIELD FLIGHT
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                    Dodge Space Debris &amp; Grab O₂ / Repair Pickups
                  </h2>
                </div>
                <div className="flex items-center gap-3 min-w-[210px]">
                  <span className="text-xs font-mono-tech font-bold text-amber-300">
                    APPROACH: {flightProgressPct}%
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-[#4fe3d4] to-emerald-400 transition-all duration-150"
                      style={{ width: `${flightProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`relative rounded-2xl overflow-hidden border-2 transition-colors ${
                  flightHitFlash ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6)]' : 'border-cyan-400/35'
                }`}
              >
                <canvas
                  ref={flightCanvasRef}
                  width={680}
                  height={360}
                  className="w-full h-auto block bg-[#040c1f] cursor-crosshair touch-none"
                />
                {debrisNavigated && (
                  <div className="absolute inset-0 bg-[#040c1f]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono-tech text-xs font-extrabold">
                      ✓ DEBRIS FIELD CLEARED
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        SFX.select();
                        setStage(4);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] font-display font-black text-xs uppercase cursor-pointer"
                    >
                      PROCEED TO SPEED MATCH ▶
                    </button>
                  </div>
                )}
              </div>

              {/* Tactile Flight Controls (Mouse/Touch + Keyboard Hint) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#08152e] border border-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  {[
                    { key: 'up', label: '▲ Pitch Up' },
                    { key: 'down', label: '▼ Pitch Down' },
                    { key: 'left', label: '◀ Bank Left' },
                    { key: 'right', label: '▶ Bank Right' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      onPointerDown={() => {
                        flightControlRef.current[btn.key as 'up' | 'down' | 'left' | 'right'] = true;
                      }}
                      onPointerUp={() => {
                        flightControlRef.current[btn.key as 'up' | 'down' | 'left' | 'right'] = false;
                      }}
                      onPointerLeave={() => {
                        flightControlRef.current[btn.key as 'up' | 'down' | 'left' | 'right'] = false;
                      }}
                      onPointerCancel={() => {
                        flightControlRef.current[btn.key as 'up' | 'down' | 'left' | 'right'] = false;
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/30 active:bg-cyan-400/45 border border-cyan-400/40 text-xs font-bold text-white select-none cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-xs text-slate-400 font-mono-tech">
                    Steer: Drag Viewport / WASD / Arrows · Shift Boost
                  </span>
                  <button
                    type="button"
                    onPointerDown={() => {
                      flightControlRef.current.boost = true;
                    }}
                    onPointerUp={() => {
                      flightControlRef.current.boost = false;
                    }}
                    onPointerLeave={() => {
                      flightControlRef.current.boost = false;
                    }}
                    onPointerCancel={() => {
                      flightControlRef.current.boost = false;
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/35 active:bg-amber-400/50 border border-amber-400/60 text-xs font-extrabold text-amber-200 uppercase select-none cursor-pointer"
                  >
                    ⚡ Turbo Boost
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              STAGE 4: MATCH SPACECRAFT SPEED
             ===================================================== */}
          {stage === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4 items-stretch">
              <div className="rounded-3xl bg-[#050e20] border border-cyan-400/35 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono-tech font-bold text-[#4fe3d4] uppercase">
                    STAGE 4 · ORBITAL RENDEZVOUS
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                    Match Spacecraft Speed With Drifting Astronaut
                  </h2>
                </div>

                {/* Animated Rendezvous Side-by-Side Scene */}
                <div className="rounded-2xl bg-[#030917] border border-cyan-400/25 p-4 relative overflow-hidden">
                  <svg viewBox="0 0 540 200" className="w-full h-48" fill="none">
                    {/* Speed streaks based on relative deltaV */}
                    {[30, 75, 125, 165].map((sy, idx) => (
                      <motion.line
                        key={idx}
                        x1="540"
                        y1={sy}
                        x2={500 - Math.min(80, Math.abs(relativeDeltaV) * 8)}
                        y2={sy}
                        stroke="#38bdf8"
                        strokeOpacity="0.35"
                        strokeWidth="2"
                        animate={{ x1: [540, 0], x2: [490, -50] }}
                        transition={{
                          duration: Math.max(0.35, 1.8 - Math.min(1.3, Math.abs(relativeDeltaV) * 0.14)),
                          repeat: Infinity,
                          ease: 'linear',
                          delay: idx * 0.15,
                        }}
                      />
                    ))}

                    {/* Rescue Spacecraft */}
                    <motion.g
                      animate={{
                        x: Math.max(-75, Math.min(75, relativeDeltaV * 8)),
                      }}
                      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                    >
                      <g transform="translate(175, 115)">
                        <rect x="-32" y="-16" width="60" height="32" rx="8" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2.2" />
                        <polygon points="28,-14 48,-5 48,5 28,14" fill="#0ea5e9" />
                        <rect x="-8" y="-8" width="18" height="16" rx="4" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.4" />
                        <text x="-2" y="42" fill="#bae6fd" fontSize="11" fontFamily="monospace" textAnchor="middle">
                          CRAFT: {shipSpeedMs.toFixed(1)} m/s
                        </text>
                      </g>
                    </motion.g>

                    {/* Drifting Astronaut */}
                    <motion.g
                      animate={{ y: [0, -6, 0, 5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <g transform="translate(390, 108)">
                        <circle cx="0" cy="-14" r="10" fill="#ffffff" stroke="#fbbf24" strokeWidth="1.6" />
                        <rect x="-5" y="-17" width="10" height="6" rx="2" fill="#f59e0b" />
                        <rect x="-8" y="-4" width="16" height="20" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                        <text x="0" y="48" fill="#fde68a" fontSize="11" fontFamily="monospace" textAnchor="middle">
                          ASTRO: {astroSpeedMs.toFixed(1)} m/s
                        </text>
                      </g>
                    </motion.g>
                  </svg>
                </div>

                {/* Thruster Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      SFX.sliderTick(0.2);
                      setShipSpeedMs((v) => Math.max(5, Number((v - 1.5).toFixed(1))));
                    }}
                    className="py-3 px-3 rounded-xl bg-rose-500/18 hover:bg-rose-500/32 border border-rose-400/50 text-xs font-extrabold text-rose-200 cursor-pointer"
                  >
                    ◀◀ Brake -1.5
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.sliderTick(0.4);
                      setShipSpeedMs((v) => Math.max(5, Number((v - 0.3).toFixed(1))));
                    }}
                    className="py-3 px-3 rounded-xl bg-sky-500/18 hover:bg-sky-500/32 border border-sky-400/50 text-xs font-extrabold text-sky-200 cursor-pointer"
                  >
                    ◀ Fine -0.3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.sliderTick(0.6);
                      setShipSpeedMs((v) => Math.min(30, Number((v + 0.3).toFixed(1))));
                    }}
                    className="py-3 px-3 rounded-xl bg-sky-500/18 hover:bg-sky-500/32 border border-sky-400/50 text-xs font-extrabold text-sky-200 cursor-pointer"
                  >
                    Fine +0.3 ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.sliderTick(0.85);
                      setShipSpeedMs((v) => Math.min(30, Number((v + 1.5).toFixed(1))));
                    }}
                    className="py-3 px-3 rounded-xl bg-amber-500/18 hover:bg-amber-500/32 border border-amber-400/50 text-xs font-extrabold text-amber-200 cursor-pointer"
                  >
                    Thrust +1.5 ▶▶
                  </button>
                </div>
              </div>

              {/* Right: Relative Speed Meter & Sync Ring */}
              <div className="rounded-3xl bg-[#071329] border border-cyan-400/35 p-5 flex flex-col justify-between gap-4 text-center">
                <div className="space-y-3">
                  <div className="text-[11px] font-mono-tech font-bold text-slate-400 uppercase">
                    Relative Speed Indicator (Δv)
                  </div>
                  <div
                    className={`py-5 rounded-2xl border-2 font-mono-tech ${
                      Math.abs(relativeDeltaV) <= 0.45
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-400/50 text-amber-300'
                    }`}
                  >
                    <div className="text-4xl font-black tabular-nums">
                      {relativeDeltaV > 0 ? `+${relativeDeltaV.toFixed(1)}` : relativeDeltaV.toFixed(1)} m/s
                    </div>
                    <div className="text-xs font-bold mt-1">
                      {Math.abs(relativeDeltaV) <= 0.45
                        ? 'SAFE SYNC BAND! HOLD STEADY...'
                        : relativeDeltaV > 0
                        ? 'TOO FAST — FIRE RETRO BRAKES'
                        : 'TOO SLOW — APPLY FORWARD THRUST'}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300">Velocity Sync Lock</span>
                      <span className="text-emerald-300 font-bold">{speedHoldPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-150"
                        style={{ width: `${speedHoldPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-[#050e20] border border-white/10 rounded-xl p-3">
                  Keep <strong className="text-white">Δv within ±0.4 m/s</strong> for ~2 seconds to lock orbital formation! (Keys: A / D)
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              STAGE 5: ROBOTIC ARM CAPTURE & AUTOMATIC RETRACTION
             ===================================================== */}
          {stage === 5 && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 items-stretch">
              <div className="rounded-3xl bg-[#050e20] border border-cyan-400/35 p-4 sm:p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono-tech font-bold text-[#4fe3d4] uppercase">
                      STAGE 5 · ROBOTIC GRAPPLE &amp; AUTO-RETRACTION
                    </div>
                    <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                      {isAutoRetracting
                        ? 'Reeling Astronaut Safely Into Rescue Bay...'
                        : armCaptured
                        ? 'Astronaut Safely Retrieved!'
                        : 'Align the Robotic Arm & Capture the Astronaut'}
                    </h2>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-xl font-mono-tech text-xs font-extrabold border ${
                      isAutoRetracting || armCaptured
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : armGeometry.alignmentPct >= 84 && armGeometry.distToAstro <= 34
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                    }`}
                  >
                    {isAutoRetracting
                      ? `RETRACTING: ${retractAnimPct}%`
                      : armCaptured
                      ? 'SECURED: 100%'
                      : `ALIGN: ${armGeometry.alignmentPct}%`}
                  </div>
                </div>

                {/* Robotic Arm Canvas/SVG Viewport */}
                <div className="rounded-2xl bg-[#030917] border border-cyan-400/25 overflow-hidden relative">
                  <svg viewBox="0 0 600 320" className="w-full h-72 select-none" fill="none">
                    {/* Background stars */}
                    <circle cx="80" cy="48" r="1.4" fill="#ffffff" opacity="0.7" />
                    <circle cx="310" cy="36" r="1.6" fill="#4fe3d4" opacity="0.7" />
                    <circle cx="520" cy="64" r="1.4" fill="#fde047" opacity="0.7" />

                    {/* Rescue Spacecraft Bay (Left) */}
                    <rect x="-12" y="95" width="128" height="160" rx="16" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
                    <rect
                      x="18"
                      y="128"
                      width="76"
                      height="94"
                      rx="8"
                      fill={isAutoRetracting || armCaptured ? '#062c2b' : '#09152a'}
                      stroke={isAutoRetracting || armCaptured ? '#34d399' : '#4fe3d4'}
                      strokeWidth="1.8"
                    />
                    <text x="56" y="143" textAnchor="middle" fill="#4fe3d4" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                      CREW BAY
                    </text>

                    {/* Bay Hatch Door (slides open during retraction, closes once secured >= 88%) */}
                    {(() => {
                      const hatchClosed = (!isAutoRetracting && !armCaptured) || armGeometry.retractFactor >= 0.88;
                      const retractComplete = armCaptured && armGeometry.retractFactor >= 0.88;
                      return (
                        <rect
                          x="104"
                          y={hatchClosed ? 136 : 114}
                          width="8"
                          height={hatchClosed ? 78 : 22}
                          rx="3"
                          fill={retractComplete ? '#34d399' : '#38bdf8'}
                          opacity="0.9"
                        />
                      );
                    })()}
                    <circle cx="115" cy="175" r="11" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />

                    {/* Floating or Captured Astronaut attached smoothly to claw during retraction */}
                    {(() => {
                      const captured = isAutoRetracting || armCaptured;
                      const renderAstroX = captured ? armGeometry.tipX + 16 : astroTargetPos.x;
                      const renderAstroY = captured ? armGeometry.tipY : astroTargetPos.y;
                      return (
                        <g transform={`translate(${renderAstroX}, ${renderAstroY})`}>
                          {!captured && (
                            <circle
                              cx="-16"
                              cy="0"
                              r="18"
                              stroke={
                                armGeometry.alignmentPct >= 84 && armGeometry.distToAstro <= 34
                                  ? '#34d399'
                                  : '#f43f5e'
                              }
                              strokeWidth="2.2"
                              strokeDasharray="5 4"
                            />
                          )}
                          <circle cx="-16" cy="0" r="5" fill={captured ? '#34d399' : '#4fe3d4'} />
                          {/* Astronaut */}
                          <rect x="-10" y="-12" width="22" height="28" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                          <circle cx="1" cy="-24" r="12" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.6" />
                          <rect x="-6" y="-27" width="14" height="8" rx="3" fill="#fbbf24" />
                          <path d="M-10 -4 L-16 0 M12 -4 L20 6" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                          <path d="M-4 16 L-7 30 M7 16 L11 30" stroke="#f8fafc" strokeWidth="4.2" strokeLinecap="round" />
                        </g>
                      );
                    })()}

                    {/* Articulated Robotic Arm */}
                    <line
                      x1={armGeometry.baseX}
                      y1={armGeometry.baseY}
                      x2={armGeometry.elbowX}
                      y2={armGeometry.elbowY}
                      stroke="#cbd5e1"
                      strokeWidth="11"
                      strokeLinecap="round"
                    />
                    <line
                      x1={armGeometry.baseX}
                      y1={armGeometry.baseY}
                      x2={armGeometry.elbowX}
                      y2={armGeometry.elbowY}
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx={armGeometry.elbowX} cy={armGeometry.elbowY} r="9" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />

                    <line
                      x1={armGeometry.elbowX}
                      y1={armGeometry.elbowY}
                      x2={armGeometry.tipX}
                      y2={armGeometry.tipY}
                      stroke="#e2e8f0"
                      strokeWidth="8.5"
                      strokeLinecap="round"
                    />

                    {/* Robotic Claw */}
                    <g
                      transform={`translate(${armGeometry.tipX}, ${armGeometry.tipY}) rotate(${armGeometry.effectiveWrist})`}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r="8"
                        fill={
                          clawSnapFlash || isAutoRetracting || armCaptured || (armGeometry.alignmentPct >= 84 && armGeometry.distToAstro <= 34)
                            ? '#34d399'
                            : '#4fe3d4'
                        }
                      />
                      <path
                        d={
                          clawSnapFlash || isAutoRetracting || armCaptured
                            ? 'M4 -6 L16 -2 L10 0 M4 6 L16 2 L10 0'
                            : 'M4 -7 L17 -12 M4 7 L17 12'
                        }
                        stroke="#fef08a"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>

                  {isAutoRetracting && (
                    <div className="px-4 py-2.5 bg-emerald-950/90 border-t border-emerald-400/40 flex items-center gap-3">
                      <span className="text-[11px] font-mono-tech font-bold text-emerald-300 whitespace-nowrap">
                        AUTO-RETRACTING ARM
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#4fe3d4] to-emerald-400 transition-all duration-75"
                          style={{ width: `${retractAnimPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono-tech font-extrabold text-white tabular-nums">
                        {retractAnimPct}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Arm Joint Controls */}
              <div className="rounded-3xl bg-[#071329] border border-cyan-400/35 p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-[#050e20] border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300 font-bold">ROTATION (A / D)</span>
                      <span className="text-[#4fe3d4] font-extrabold tabular-nums">{armAngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={-55}
                      max={55}
                      disabled={isAutoRetracting || armCaptured}
                      value={armAngleDeg}
                      onChange={(e) => setArmAngleDeg(Number(e.target.value))}
                      className="w-full accent-[#4fe3d4] cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#050e20] border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300 font-bold">EXTENSION (W / S)</span>
                      <span className="text-sky-300 font-extrabold tabular-nums">{armExtendPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      disabled={isAutoRetracting || armCaptured}
                      value={armExtendPct}
                      onChange={(e) => setArmExtendPct(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#050e20] border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs font-mono-tech">
                      <span className="text-slate-300 font-bold">CLAW TILT (Q / E)</span>
                      <span className="text-amber-300 font-extrabold tabular-nums">{wristTiltDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      disabled={isAutoRetracting || armCaptured}
                      value={wristTiltDeg}
                      onChange={(e) => setWristTiltDeg(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  <div className="text-xs text-slate-300 bg-[#091833] border border-cyan-400/20 rounded-xl p-3">
                    {isAutoRetracting
                      ? '🟢 Grapple locked! Automatically retracting robotic arm into crew bay...'
                      : armCaptured
                      ? '🟢 Astronaut safely secured inside crew bay!'
                      : armGeometry.alignmentPct >= 84 && armGeometry.distToAstro <= 34
                      ? '🟢 Target aligned inside grapple zone! Press CAPTURE ASTRONAUT (or Space)!'
                      : 'Move the claw tip onto the pulsing grab ring until alignment turns green (≥ 84%).'}
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={isAutoRetracting || armCaptured}
                  onClick={handleGrabAstronaut}
                  className={`w-full py-4 px-4 rounded-xl font-display font-black text-sm uppercase transition ${
                    isAutoRetracting
                      ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 cursor-wait'
                      : armCaptured
                      ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 cursor-default'
                      : armGeometry.alignmentPct >= 84 && armGeometry.distToAstro <= 34
                      ? 'bg-gradient-to-r from-emerald-400 to-[#4fe3d4] text-[#041022] shadow-[0_8px_26px_rgba(52,211,153,0.4)] cursor-pointer'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 cursor-pointer'
                  }`}
                >
                  {isAutoRetracting
                    ? `RETRACTING ARM (${retractAnimPct}%)...`
                    : armCaptured
                    ? '✓ ASTRONAUT CAPTURED'
                    : '🦾 CAPTURE ASTRONAUT (SPACE)'}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          MISSION FAILURE OVERLAY
         ===================================================== */}
      <AnimatePresence>
        {failedReason !== null && !victoryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2700] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl bg-[#0b1224] border-2 border-rose-500/70 p-6 text-center space-y-4 shadow-[0_24px_70px_rgba(244,63,94,0.3)]"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border border-rose-400/60 flex items-center justify-center text-3xl">
                🚨
              </div>
              <div>
                <div className="text-xs font-mono-tech font-bold uppercase tracking-widest text-rose-400">
                  EMERGENCY RESCUE ABORTED
                </div>
                <h2 className="font-display text-2xl font-black text-white mt-1">
                  MISSION FAILED
                </h2>
                <p className="text-sm text-slate-300 mt-2">
                  {failedReason === 'oxygen'
                    ? 'The astronaut’s EVA oxygen supply reached 0%.'
                    : failedReason === 'hull'
                    ? 'Space debris impacts reduced rescue craft hull integrity to 0%.'
                    : 'The emergency rescue countdown timer expired before airlock docking.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono-tech">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400 text-[10px]">TIMER</div>
                  <div className="font-bold text-rose-300">{formatCountdownClock(secondsLeft)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400 text-[10px]">O₂</div>
                  <div className="font-bold text-cyan-300">{Math.ceil(oxygenPct)}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400 text-[10px]">HULL</div>
                  <div className="font-bold text-emerald-300">{Math.ceil(hullPct)}%</div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRetryMission}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f43f5e] to-[#f59e0b] text-white font-display font-black text-sm uppercase cursor-pointer hover:brightness-110 transition"
                >
                  RETRY MISSION ↺
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.cancelSpeech();
                    SFX.click();
                    onBackToLevelMap();
                  }}
                  className="w-full py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/20 text-xs font-bold text-slate-200 uppercase cursor-pointer"
                >
                  RETURN TO LEVEL SELECTION
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          FULL-SCREEN VICTORY CELEBRATION & REWARD OVERLAY
         ===================================================== */}
      <AnimatePresence>
        {victoryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2750] bg-[#020817]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            {/* Playful Animated Confetti Stars */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              {Array.from({ length: 18 }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -30, x: `${(i * 19) % 100}%`, opacity: 0 }}
                  animate={{
                    y: ['0vh', '105vh'],
                    rotate: [0, 360],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 3.2 + (i % 4) * 0.6,
                    repeat: Infinity,
                    delay: (i % 6) * 0.25,
                  }}
                  className="absolute text-lg"
                >
                  {i % 3 === 0 ? '★' : i % 3 === 1 ? '✨' : '🛸'}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.88, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-xl rounded-3xl bg-gradient-to-b from-[#0b1f44] to-[#050f24] border-2 border-amber-400/75 p-6 sm:p-8 text-center space-y-5 shadow-[0_28px_80px_rgba(251,191,36,0.28)]"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-mono-tech text-xs font-extrabold">
                ✓ ASTRONAUT RETRIEVED · CREW SAFE
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-black text-white leading-tight">
                MISSION SUCCESSFUL – ASTRONAUT RESCUED!
              </h2>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.6, repeat: Infinity }}
                className="flex justify-center"
              >
                <SpaceRescueHeroBadgeSVG size={146} />
              </motion.div>

              {/* Shared Reward Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-4 rounded-2xl bg-[#071329] border border-amber-400/50">
                  <div className="text-[10px] font-mono-tech uppercase text-slate-400">
                    Science Credits Reward
                  </div>
                  <div className="font-mono-tech text-2xl font-black text-amber-300 mt-1">
                    {claimingReward
                      ? 'Syncing...'
                      : rewardResult?.alreadyRewarded || alreadyCompleted
                      ? '+0 SC (Already Earned)'
                      : `+${LEVEL9_REWARD_SC} SC`}
                  </div>
                  {rewardResult && (
                    <div className="text-[11px] text-slate-300 mt-0.5 tabular-nums">
                      Balance: ★ {rewardResult.newStarBalance.toLocaleString()} SC
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-[#071329] border border-cyan-400/50">
                  <div className="text-[10px] font-mono-tech uppercase text-slate-400">
                    Badge Unlocked
                  </div>
                  <div className="font-display text-base font-black text-[#4fe3d4] mt-1">
                    {LEVEL9_BADGE_LABEL}
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">
                    Saved to Explorer Dossier
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono-tech">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400 text-[10px]">TIME LEFT</div>
                  <div className="font-bold text-white">{formatCountdownClock(secondsLeft)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400 text-[10px]">O₂ LEFT</div>
                  <div className="font-bold text-[#4fe3d4]">{Math.ceil(oxygenPct)}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-slate-400 text-[10px]">HULL</div>
                  <div className="font-bold text-emerald-300">{Math.ceil(hullPct)}%</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    SFX.cancelSpeech();
                    SFX.click();
                    onBackToLevelMap();
                  }}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-display font-black text-xs sm:text-sm uppercase cursor-pointer hover:brightness-110 transition"
                >
                  CAMPAIGN COMPLETE — LEVEL MAP
                </button>
                <button
                  type="button"
                  onClick={handleRetryMission}
                  className="px-4 py-3.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/45 text-amber-200 font-bold text-xs uppercase cursor-pointer"
                >
                  Replay ↺
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
