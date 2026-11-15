import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  CraterScanRecord,
  DEFAULT_LEVEL8_PROGRESS,
  DEFAULT_LUNAR_BUILD,
  evaluateLunarSpacecraft,
  findLunarOption,
  LUNAR_CATEGORY_META,
  LUNAR_COMPONENTS,
  LUNAR_SOUTH_POLE_CRATERS,
  LUNAR_WATER_DURATION_SEC,
  LunarCategoryId,
  LunarCraterSpec,
  SelectedLunarBuild,
  StoredLevel8Progress,
} from '../utils/lunarWaterData';
import { formatCountdownClock } from '../utils/europaMissionData';
import { LaunchSequenceStatus, RocketPartId, STORE_ITEMS } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { RocketAssemblyStage } from './RocketAssemblyStage';
import { LaunchpadPayloadStage } from './LaunchpadPayloadStage';
import { LunarWaterExplorerBadgeSVG } from './BadgesSVG';
import { StoreItemIllustrationSVG } from './StoreItemIllustrationsSVG';
import { LunarSurfaceExplorer3D } from './LunarSurfaceExplorer3D';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

export interface Level8CompletionPayload {
  build: SelectedLunarBuild;
  fuelTestPassed: boolean;
  launchCompleted: boolean;
  navOrbitLocked: boolean;
  craterScans: CraterScanRecord[];
  evidenceMeterPct: number;
  transmittedPct: number;
  timerExpired: boolean;
}

export interface Level8RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  xpAwarded: number;
  newStarBalance: number;
  newXpBalance: number;
}

interface LunarWaterLabProps {
  visible: boolean;
  starCredits: number;
  xp: number;
  alreadyCompleted: boolean;
  unlockedStoreItems?: string[];
  initialProgress?: StoredLevel8Progress;
  onOpenStoreForLunar?: () => void;
  onOpenHandbook?: () => void;
  onSaveProgress: (progress: StoredLevel8Progress) => void;
  onReplayReset: () => void;
  onCompleteMission: (payload: Level8CompletionPayload) => Promise<Level8RewardResult>;
  onContinueToLevel8: () => void;
  onBackToLevelMap: () => void;
  onExit: () => void;
}

type Level8Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STAGE_TABS: Array<{ id: Level8Stage; label: string }> = [
  { id: 0, label: 'Intro' },
  { id: 1, label: '1 Design' },
  { id: 2, label: '2 Fuel Lab' },
  { id: 3, label: '3 Launch' },
  { id: 4, label: '4 Land' },
  { id: 5, label: '5 Moon 3D' },
  { id: 6, label: '6 Transmit' },
];

const LunarPartIconSVG: React.FC<{ optionId: string }> = ({ optionId }) => {
  const accent = optionId.includes('comp') || optionId.includes('neutron') || optionId.includes('hga') || optionId.includes('dual') || optionId.includes('biprop') || optionId.includes('star') || optionId.includes('cryo')
    ? '#4fe3d4'
    : optionId.includes('ti') || optionId.includes('heavy') || optionId.includes('ir') || optionId.includes('helix')
    ? '#fbbf24'
    : '#94a3b8';

  if (optionId.startsWith('l_body_')) {
    return (
      <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
        <polygon points="15,8 41,8 48,22 41,36 15,36 8,22" fill="#09162d" stroke={accent} strokeWidth="2.2" />
        <rect x="20" y="14" width="16" height="16" rx="2" fill={accent} fillOpacity="0.24" stroke={accent} strokeWidth="1.2" />
      </svg>
    );
  }
  if (optionId.startsWith('l_inst_')) {
    return (
      <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
        <rect x="14" y="12" width="28" height="18" rx="3" fill="#09162d" stroke={accent} strokeWidth="2" />
        <circle cx="28" cy="21" r="6" stroke={accent} strokeWidth="1.6" />
        <path d="M22 30 L16 40 H40 L34 30" fill={accent} fillOpacity="0.22" />
      </svg>
    );
  }
  if (optionId.startsWith('l_comms_')) {
    return (
      <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
        <path d="M14 26 Q28 11 42 26 Z" fill="#0b1830" stroke={accent} strokeWidth="2" />
        <line x1="28" y1="26" x2="28" y2="38" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M20 11 Q28 5 36 11" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (optionId.startsWith('l_pow_')) {
    return (
      <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
        <rect x="6" y="14" width="16" height="16" rx="2" fill="#1d4ed8" stroke={accent} strokeWidth="1.5" />
        <rect x="34" y="14" width="16" height="16" rx="2" fill="#1d4ed8" stroke={accent} strokeWidth="1.5" />
        <path d="M27 14 L23 22 H29 L25 30" stroke="#fde047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (optionId.startsWith('l_prop_')) {
    return (
      <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
        <rect x="20" y="9" width="16" height="12" rx="2" fill="#1e293b" stroke={accent} strokeWidth="1.8" />
        <polygon points="21,21 35,21 39,34 17,34" fill="#0b1830" stroke={accent} strokeWidth="1.8" />
        <path d="M24 34 Q28 42 32 34" fill="#38bdf8" />
      </svg>
    );
  }
  if (optionId.startsWith('l_nav_')) {
    return (
      <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
        <circle cx="28" cy="22" r="13" fill="#09162d" stroke={accent} strokeWidth="2" />
        <polygon points="28,12 31,22 28,26 25,22" fill="#4fe3d4" />
        <circle cx="28" cy="22" r="2" fill="#fef08a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 44" className="w-12 h-9 shrink-0" fill="none">
      <rect x="18" y="8" width="20" height="28" rx="8" fill="#09162d" stroke={accent} strokeWidth="2" />
      <rect x="21" y="18" width="14" height="14" rx="4" fill="#38bdf8" fillOpacity="0.65" />
    </svg>
  );
};

/* ========================================================
   ANIMATED LUNAR ORBITER PREVIEW
   ======================================================== */
const AnimatedLunarOrbiterSVG: React.FC<{
  build: SelectedLunarBuild;
  metrics: ReturnType<typeof evaluateLunarSpacecraft>;
  fuelHighlight?: boolean;
  fuelTestRunning?: boolean;
  equippedStoreGear?: string[];
}> = ({ build, metrics, fuelHighlight, fuelTestRunning, equippedStoreGear = [] }) => {
  const hullStroke =
    build.body === 'l_body_comp' ? '#4fe3d4' : build.body === 'l_body_ti' ? '#fbbf24' : '#cbd5e1';
  const fuelRatio = Math.min(1, metrics.fuelMassKg / Math.max(1, metrics.maxTankFuelKg));
  const wingSpan = build.power === 'l_pow_strip' ? 24 : build.power === 'l_pow_dual' ? 42 : 52;
  const fuelColor =
    metrics.fuelExperimentStatus === 'red'
      ? '#ef4444'
      : metrics.fuelExperimentStatus === 'yellow'
      ? '#fbbf24'
      : '#38bdf8';

  return (
    <svg viewBox="0 0 280 205" className="w-full max-w-[270px] mx-auto" fill="none">
      <rect x="4" y="4" width="272" height="197" rx="16" fill="#050e20" stroke="#1e3a5f" strokeWidth="1.5" />
      {/* Twinkling background stars */}
      <circle cx="28" cy="28" r="1.4" fill="#e2e8f0" className="animate-pulse" />
      <circle cx="245" cy="34" r="1.5" fill="#4fe3d4" className="animate-pulse" />
      <circle cx="44" cy="144" r="1.2" fill="#fde047" className="animate-pulse" />
      <circle cx="236" cy="136" r="1.3" fill="#38bdf8" className="animate-pulse" />

      {/* Distant Moon Horizon */}
      <path d="M20 198 Q140 156 260 198" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />

      <motion.g
        animate={
          fuelTestRunning
            ? { y: [0, -2.5, 1.5, -2, 0], x: [-1, 1, -1, 0] }
            : { y: [0, -4, 0] }
        }
        transition={{
          duration: fuelTestRunning ? 0.35 : 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Solar Arrays */}
        <rect x={115 - wingSpan} y="82" width={wingSpan - 3} height="28" rx="3" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.6" />
        <rect x="168" y="82" width={wingSpan - 3} height="28" rx="3" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.6" />
        <line x1="112" y1="96" x2="117" y2="96" stroke="#cbd5e1" strokeWidth="3" />
        <line x1="163" y1="96" x2="168" y2="96" stroke="#cbd5e1" strokeWidth="3" />

        {/* Main Orbiter Hull + Animated Fuel Tank Cutaway */}
        <rect x="115" y="64" width="50" height="66" rx="7" fill="#0b1830" stroke={hullStroke} strokeWidth="2.8" />
        {/* Fuel Tank Gauge inside Body */}
        <rect x="125" y="74" width="30" height="40" rx="5" fill="#020617" stroke={fuelHighlight ? '#38bdf8' : '#475569'} strokeWidth="1.5" />
        <motion.rect
          animate={{
            y: 76 + Math.round((1 - fuelRatio) * 36),
            height: Math.max(4, Math.round(fuelRatio * 36)),
          }}
          transition={{ duration: 0.35 }}
          x="127"
          width="26"
          rx="3"
          fill={fuelColor}
        />
        {/* Rising propellant bubbles when highlighted or testing */}
        {(fuelHighlight || fuelTestRunning) && (
          <>
            <motion.circle
              cx="134"
              cy="108"
              r="1.7"
              fill="#e0f2fe"
              animate={{ cy: [108, 84], opacity: [0.9, 0] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            <motion.circle
              cx="145"
              cy="110"
              r="1.5"
              fill="#bae6fd"
              animate={{ cy: [110, 82], opacity: [0.85, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: 0.35 }}
            />
          </>
        )}
        <text x="140" y="99" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
          {metrics.fuelMassKg}kg
        </text>

        {/* Top Dish + Signal Pulse */}
        {build.comms === 'l_comms_hga' ? (
          <path d="M122 54 Q140 38 158 54 Z" fill="#09162d" stroke="#4fe3d4" strokeWidth="2.2" />
        ) : (
          <line x1="140" y1="64" x2="140" y2="38" stroke="#fbbf24" strokeWidth="2.4" />
        )}
        <motion.path
          d="M128 32 Q140 24 152 32"
          stroke="#4fe3d4"
          strokeWidth="1.6"
          strokeLinecap="round"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />

        {/* Mounted Store Gear Hull Badges */}
        {equippedStoreGear.length > 0 && (
          <g>
            <rect x="118" y="117" width="44" height="11" rx="3" fill="#052e2b" stroke="#34d399" strokeWidth="1.2" />
            <text x="140" y="125" textAnchor="middle" fill="#6ee7b7" fontSize="6.8" fontFamily="monospace" fontWeight="900">
              +{equippedStoreGear.length} GEAR
            </text>
          </g>
        )}

        {/* Bottom Engine Bell & Ignition / Ice Radar Scan Cone */}
        <polygon points="128,130 152,130 157,145 123,145" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.6" />
        {fuelTestRunning && (
          <motion.polygon
            points="129,145 151,145 140,178"
            fill={metrics.fuelExperimentStatus === 'red' ? '#ef4444' : '#38bdf8'}
            animate={{ opacity: [0.45, 0.95, 0.5], scaleY: [0.85, 1.15, 0.9] }}
            transition={{ duration: 0.25, repeat: Infinity }}
          />
        )}
        {metrics.canDetectSubsurfaceIce && !fuelTestRunning && (
          <motion.path
            d="M132 145 L110 184 H170 L148 145 Z"
            fill="#38bdf8"
            animate={{ opacity: [0.12, 0.34, 0.12] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        )}
      </motion.g>

      <text x="140" y="191" textAnchor="middle" fill={metrics.isOverWeight ? '#f87171' : '#94a3b8'} fontSize="10" fontFamily="monospace" fontWeight="700">
        {metrics.totalMassKg}/{metrics.liftLimitKg} kg • Δv {metrics.travelCapabilityPct}%
      </text>
    </svg>
  );
};

export const LunarWaterLab: React.FC<LunarWaterLabProps> = ({
  visible,
  starCredits,
  xp,
  alreadyCompleted,
  unlockedStoreItems = [],
  initialProgress,
  onOpenStoreForLunar,
  onSaveProgress,
  onReplayReset,
  onCompleteMission,
  onContinueToLevel8,
  onBackToLevelMap,
  onExit,
  onOpenHandbook,
}) => {
  const saved = initialProgress || DEFAULT_LEVEL8_PROGRESS;
  const level8StoreItems = useMemo(
    () => STORE_ITEMS.filter((item) => item.id.startsWith('lvl8_')),
    []
  );
  const lunarGearCount = useMemo(
    () => unlockedStoreItems.filter((id) => id.startsWith('lvl8_')).length,
    [unlockedStoreItems]
  );

  const [stage, setStage] = useState<Level8Stage>(saved.stage ?? 0);
  const [build, setBuild] = useState<SelectedLunarBuild>(saved.build || DEFAULT_LUNAR_BUILD);
  const [equippedStoreGear, setEquippedStoreGear] = useState<string[]>(
    saved.equippedStoreGear || []
  );
  const [dragHoverOrbiter, setDragHoverOrbiter] = useState(false);
  const [justDroppedGearId, setJustDroppedGearId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<LunarCategoryId>('body');
  const [fuelTestPassed, setFuelTestPassed] = useState<boolean>(Boolean(saved.fuelTestPassed));
  const [fuelTestRunning, setFuelTestRunning] = useState(false);

  // Stage 3 Rocket Reuse
  const [rocketParts, setRocketParts] = useState<RocketPartId[]>(
    (saved.rocketParts as RocketPartId[]) || []
  );
  const [rocketStage, setRocketStage] = useState<1 | 2 | 3 | 4>(saved.rocketStage || 1);
  const [launchCompleted, setLaunchCompleted] = useState<boolean>(
    Boolean(saved.launchCompleted)
  );
  const [, setLaunchStatus] = useState<LaunchSequenceStatus>(
    saved.launchCompleted ? 'completed' : 'not_started'
  );

  // Stage 4 Navigation & Lunar Landing
  const [navHeadingDeg, setNavHeadingDeg] = useState<number>(saved.navHeadingDeg ?? 14);
  const [navOrbitLocked, setNavOrbitLocked] = useState<boolean>(Boolean(saved.navOrbitLocked));
  const [navFlightPct, setNavFlightPct] = useState<number>(saved.navOrbitLocked ? 100 : 12);
  const [navBurning, setNavBurning] = useState(false);
  const [landingPhase, setLandingPhase] = useState<'idle' | 'descending' | 'landed'>(
    saved.craterScans && saved.craterScans.length > 0 ? 'landed' : 'idle'
  );
  const [landingAltM, setLandingAltM] = useState<number>(12000);
  const [navMessage, setNavMessage] = useState<{
    tone: 'neutral' | 'warn' | 'ok';
    text: string;
  }>({
    tone: 'neutral',
    text: 'Trim heading toward 0° corridor, then ignite LOI burn.',
  });

  // Stage 5 Crater Exploration
  const [craterScans, setCraterScans] = useState<CraterScanRecord[]>(saved.craterScans || []);
  const [evidenceMeterPct, setEvidenceMeterPct] = useState<number>(saved.evidenceMeterPct || 0);
  const [, setActiveCraterId] = useState<LunarCraterSpec['id'] | null>(null);
  const [scanningCrater, setScanningCrater] = useState(false);

  // Stage 6 Transmit
  const [transmittedPct, setTransmittedPct] = useState<number>(saved.transmittedPct || 0);
  const [transmissionInterrupted, setTransmissionInterrupted] = useState<boolean>(
    Boolean(saved.transmissionInterrupted)
  );
  const [transmitting, setTransmitting] = useState(false);
  const [txDone, setTxDone] = useState<boolean>((saved.transmittedPct || 0) >= 100);

  // Timer & Voice
  const [missionStartedAtMs, setMissionStartedAtMs] = useState<number | null>(
    saved.missionStartedAtMs ?? null
  );
  const [missionDeadlineMs, setMissionDeadlineMs] = useState<number | null>(
    saved.missionDeadlineMs ?? null
  );
  const [timerExpired, setTimerExpired] = useState<boolean>(Boolean(saved.timerExpired));
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (saved.missionDeadlineMs) {
      return Math.max(0, Math.ceil((saved.missionDeadlineMs - Date.now()) / 1000));
    }
    return LUNAR_WATER_DURATION_SEC;
  });
  const [timerWarningBanner, setTimerWarningBanner] = useState<string | null>(null);
  const warnedMarksRef = useRef<Set<number>>(new Set());

  const [muted, setMuted] = useState(() => SFX.isMuted());
  const [submittingReward, setSubmittingReward] = useState(false);
  const [rewardResult, setRewardResult] = useState<Level8RewardResult | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const wasVisibleRef = useRef(false);
  useEffect(() => {
    if (visible && !wasVisibleRef.current && initialProgress) {
      setStage(initialProgress.stage ?? 0);
      setBuild(initialProgress.build || DEFAULT_LUNAR_BUILD);
      setEquippedStoreGear(initialProgress.equippedStoreGear || []);
      setFuelTestPassed(Boolean(initialProgress.fuelTestPassed));
      setRocketParts((initialProgress.rocketParts as RocketPartId[]) || []);
      setRocketStage(initialProgress.rocketStage || 1);
      setLaunchCompleted(Boolean(initialProgress.launchCompleted));
      setNavHeadingDeg(initialProgress.navHeadingDeg ?? 14);
      setNavOrbitLocked(Boolean(initialProgress.navOrbitLocked));
      setNavFlightPct(initialProgress.navOrbitLocked ? 100 : 12);
      setCraterScans(initialProgress.craterScans || []);
      setEvidenceMeterPct(initialProgress.evidenceMeterPct || 0);
      setTransmittedPct(initialProgress.transmittedPct || 0);
      setTransmissionInterrupted(Boolean(initialProgress.transmissionInterrupted));
      setTxDone((initialProgress.transmittedPct || 0) >= 100);
      setMissionStartedAtMs(initialProgress.missionStartedAtMs ?? null);
      setMissionDeadlineMs(initialProgress.missionDeadlineMs ?? null);
      setTimerExpired(Boolean(initialProgress.timerExpired));
      if (initialProgress.missionDeadlineMs) {
        setSecondsLeft(Math.max(0, Math.ceil((initialProgress.missionDeadlineMs - Date.now()) / 1000)));
      } else {
        setSecondsLeft(LUNAR_WATER_DURATION_SEC);
      }
    }
    wasVisibleRef.current = visible;
  }, [visible, initialProgress]);

  const metrics = useMemo(
    () => evaluateLunarSpacecraft(build, equippedStoreGear),
    [build, equippedStoreGear]
  );

  const onSaveProgressRef = useRef(onSaveProgress);
  onSaveProgressRef.current = onSaveProgress;
  const latestProgressRef = useRef<StoredLevel8Progress>({
    stage,
    build,
    equippedStoreGear,
    fuelTestPassed,
    rocketParts,
    rocketStage,
    launchCompleted,
    navHeadingDeg,
    navOrbitLocked,
    craterScans,
    evidenceMeterPct,
    transmittedPct,
    transmissionInterrupted,
    missionStartedAtMs,
    missionDeadlineMs,
    timerExpired,
  });
  latestProgressRef.current = {
    stage,
    build,
    equippedStoreGear,
    fuelTestPassed,
    rocketParts,
    rocketStage,
    launchCompleted,
    navHeadingDeg,
    navOrbitLocked,
    craterScans,
    evidenceMeterPct,
    transmittedPct,
    transmissionInterrupted,
    missionStartedAtMs,
    missionDeadlineMs,
    timerExpired,
  };

  const persistProgress = useCallback(
    (overrides?: Partial<StoredLevel8Progress>) => {
      onSaveProgressRef.current({
        ...latestProgressRef.current,
        ...overrides,
      });
    },
    []
  );

  // Persistent timer loop
  useEffect(() => {
    if (!visible || !missionDeadlineMs || rewardResult || txDone) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((missionDeadlineMs - Date.now()) / 1000));
      setSecondsLeft((prev) => (prev === rem ? prev : rem));
      [300, 120, 30].forEach((mark) => {
        if (rem <= mark && rem > 0 && !warnedMarksRef.current.has(mark)) {
          warnedMarksRef.current.add(mark);
          SFX.tempWarningBeep();
          setTimerWarningBanner(
            mark === 300
              ? '5 MINUTES LEFT — Stay on polar window!'
              : mark === 120
              ? '2 MINUTES LEFT — Scan craters & transmit findings!'
              : '30 SECONDS LEFT — Earth DSN pass closing!'
          );
          window.setTimeout(() => setTimerWarningBanner(null), 4800);
        }
      });
      if (rem <= 0 && !timerExpired) {
        setTimerExpired(true);
        SFX.powerFailure();
        persistProgress({ timerExpired: true });
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [missionDeadlineMs, persistProgress, rewardResult, timerExpired, txDone, visible]);

  const handleStartMission = () => {
    SFX.click();
    const now = Date.now();
    const deadline = now + LUNAR_WATER_DURATION_SEC * 1000;
    warnedMarksRef.current.clear();
    setMissionStartedAtMs(now);
    setMissionDeadlineMs(deadline);
    setSecondsLeft(LUNAR_WATER_DURATION_SEC);
    setTimerExpired(false);
    setStage(1);
    persistProgress({
      stage: 1,
      missionStartedAtMs: now,
      missionDeadlineMs: deadline,
      timerExpired: false,
    });
  };

  const handleSelectComponent = (cat: LunarCategoryId, id: string) => {
    SFX.select();
    const next = { ...build, [cat]: id };
    setBuild(next);
    setFuelTestPassed(false);
    persistProgress({ build: next, fuelTestPassed: false });
  };

  const handleFuelSliderChange = (kg: number) => {
    SFX.sliderTick((kg - 25) / 70);
    const next = { ...build, fuelMassKg: kg };
    setBuild(next);
    setFuelTestPassed(false);
    persistProgress({ build: next, fuelTestPassed: false });
  };

  const handleRunFuelMassExperiment = () => {
    if (fuelTestRunning) return;
    setFuelTestRunning(true);
    SFX.shakerStart();
    window.setTimeout(() => {
      setFuelTestRunning(false);
      if (metrics.fuelExperimentStatus === 'green') {
        SFX.shakerPass();
        setFuelTestPassed(true);
        persistProgress({ fuelTestPassed: true });
      } else if (metrics.fuelExperimentStatus === 'yellow') {
        // Yellow is risky but allow user either to optimize or confirm if lift/fuel still marginal? Prompt says Red=cannot proceed, Yellow=risky, Green=passes test
        SFX.tempWarningBeep();
        setFuelTestPassed(false);
        persistProgress({ fuelTestPassed: false });
      } else {
        SFX.shakerFail();
        setFuelTestPassed(false);
        persistProgress({ fuelTestPassed: false });
      }
    }, 1050);
  };

  // Stage 4 Navigation Transfer
  const corridorHalfWidth = metrics.navPrecisionPct >= 85 ? 5 : 3;
  const inCaptureCorridor = Math.abs(navHeadingDeg) <= corridorHalfWidth;

  const handleExecuteNavBurn = () => {
    if (navBurning || navOrbitLocked) return;
    setNavBurning(true);
    SFX.orbitStart();
    setNavFlightPct(68);

    window.setTimeout(() => {
      setNavBurning(false);
      if (inCaptureCorridor) {
        setNavFlightPct(100);
        setNavOrbitLocked(true);
        SFX.sunlightRestored();
        setNavMessage({
          tone: 'ok',
          text: 'Lunar Orbit Insertion burn complete — Polar orbit locked over South Pole craters!',
        });
        persistProgress({ navHeadingDeg, navOrbitLocked: true });
      } else {
        setNavFlightPct(35);
        SFX.snapWrong();
        setNavMessage({
          tone: 'warn',
          text:
            navHeadingDeg > 0
              ? 'Trajectory drifted right of lunar gravity well! Steer heading closer to 0°.'
              : 'Trajectory drifted left of lunar gravity well! Adjust heading back toward center.',
        });
        persistProgress({ navHeadingDeg, navOrbitLocked: false });
      }
    }, 1350);
  };

  // Stage 5 Crater Exploration
  const handleScanCrater = (crater: LunarCraterSpec) => {
    if (scanningCrater) return;
    setActiveCraterId(crater.id);
    setScanningCrater(true);
    SFX.heaterActivate();

    window.setTimeout(() => {
      setScanningCrater(false);
      const existing = craterScans.find((r) => r.craterId === crater.id);
      const scanCount = Math.min(2, (existing?.scanCount || 0) + 1);
      const instBoost = metrics.instrumentCapabilityPct >= 85 ? 96 : metrics.instrumentCapabilityPct >= 70 ? 80 : 42;
      const conf = Math.min(99, Math.round(instBoost * (scanCount >= 2 ? 1.0 : 0.78)));

      const hydrogenReading = metrics.canDetectSubsurfaceIce
        ? Math.round(crater.baseHydrogenPpm * (scanCount >= 2 ? 1.0 : 0.94))
        : 18;
      const radarReading = metrics.canDetectSubsurfaceIce ? crater.baseRadarIcePct : 20;

      const updatedRecord: CraterScanRecord = {
        craterId: crater.id,
        craterName: crater.name,
        scanCount,
        confidencePct: conf,
        hydrogenPpm: hydrogenReading,
        radarIcePct: radarReading,
        tempC: crater.surfaceTempC,
        recordedAsEvidence: Boolean(existing?.recordedAsEvidence) || (crater.hasStrongIceEvidence && metrics.canDetectSubsurfaceIce),
      };

      const nextScans = existing
        ? craterScans.map((r) => (r.craterId === crater.id ? updatedRecord : r))
        : [...craterScans, updatedRecord];

      // Evidence meter accumulates meaningful crater evidence; cold-trap discovery contributes major spike
      const rawScore = nextScans.reduce((sum, rec) => {
        const spec = LUNAR_SOUTH_POLE_CRATERS.find((c) => c.id === rec.craterId);
        const w = spec?.evidenceWeight || 14;
        const mult = rec.scanCount >= 2 ? 1.2 : 1.0;
        return sum + (metrics.canDetectSubsurfaceIce ? w * mult : 5);
      }, 0);
      const nextMeter = Math.min(100, Math.round(rawScore));

      setCraterScans(nextScans);
      setEvidenceMeterPct(nextMeter);

      if (crater.hasStrongIceEvidence && metrics.canDetectSubsurfaceIce) {
        SFX.sunlightRestored();
      } else {
        SFX.snapCorrect();
      }

      persistProgress({ craterScans: nextScans, evidenceMeterPct: nextMeter });
    }, 950);
  };

  const hasIceCraterFound = useMemo(
    () =>
      craterScans.some((r) => {
        const spec = LUNAR_SOUTH_POLE_CRATERS.find((c) => c.id === r.craterId);
        return Boolean(spec?.hasStrongIceEvidence) && metrics.canDetectSubsurfaceIce;
      }),
    [craterScans, metrics.canDetectSubsurfaceIce]
  );

  // Stage 6 Transmit Discovery Data to Earth
  const finishTransmission = useCallback(async () => {
    setTransmitting(false);
    setTransmittedPct(100);
    setTransmissionInterrupted(false);
    setTxDone(true);
    SFX.levelComplete();
    SFX.badgeUnlock();
    persistProgress({
      transmittedPct: 100,
      transmissionInterrupted: false,
    });

    setSubmittingReward(true);
    try {
      const res = await onCompleteMission({
        build,
        fuelTestPassed,
        launchCompleted: true,
        navOrbitLocked: true,
        craterScans,
        evidenceMeterPct,
        transmittedPct: 100,
        timerExpired,
      });
      setRewardResult(res);
    } finally {
      setSubmittingReward(false);
    }
  }, [
    build,
    craterScans,
    evidenceMeterPct,
    fuelTestPassed,
    onCompleteMission,
    persistProgress,
    timerExpired,
  ]);

  const handleStartOrResumeTransmit = () => {
    if (transmitting || txDone) return;
    setTransmitting(true);
    SFX.orbitStart();

    if (transmittedPct === 0) {
      window.setTimeout(() => setTransmittedPct(28), 550);
      window.setTimeout(() => {
        if (metrics.isCommsWeak) {
          // Weak antenna stalls earlier cleanly
          setTransmitting(false);
          setTransmittedPct(44);
          setTransmissionInterrupted(true);
          SFX.snapWrong();
          persistProgress({ transmittedPct: 44, transmissionInterrupted: true });
        } else {
          // Normal crater rim shadow dip -> player realigns dish & resumes
          setTransmitting(false);
          setTransmittedPct(58);
          setTransmissionInterrupted(true);
          SFX.tempWarningBeep();
          persistProgress({ transmittedPct: 58, transmissionInterrupted: true });
        }
      }, 1350);
      return;
    }

    // Resume after realign
    setTransmissionInterrupted(false);
    window.setTimeout(() => setTransmittedPct(84), 600);
    window.setTimeout(() => {
      void finishTransmission();
    }, 1300);
  };

  const handleFullReset = () => {
    SFX.click();
    setStage(0);
    setBuild({ ...DEFAULT_LUNAR_BUILD });
    setEquippedStoreGear([]);
    setFuelTestPassed(false);
    setRocketParts([]);
    setRocketStage(1);
    setLaunchCompleted(false);
    setLaunchStatus('not_started');
    setNavHeadingDeg(14);
    setNavOrbitLocked(false);
    setNavFlightPct(12);
    setLandingPhase('idle');
    setLandingAltM(12000);
    setCraterScans([]);
    setEvidenceMeterPct(0);
    setActiveCraterId(null);
    setTransmittedPct(0);
    setTransmissionInterrupted(false);
    setTxDone(false);
    setRewardResult(null);
    setMissionStartedAtMs(null);
    setMissionDeadlineMs(null);
    setSecondsLeft(LUNAR_WATER_DURATION_SEC);
    setTimerExpired(false);
    warnedMarksRef.current.clear();
    onReplayReset();
  };

  const handleExecuteLandingBurn = () => {
    if (landingPhase !== 'idle') return;
    setLandingPhase('descending');
    setLandingAltM(12000);
    SFX.orbitStart();
    window.setTimeout(() => setLandingAltM(6500), 450);
    window.setTimeout(() => setLandingAltM(1800), 950);
    window.setTimeout(() => {
      setLandingAltM(0);
      setLandingPhase('landed');
      SFX.sunlightRestored();
    }, 1550);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-[#030916]/98 backdrop-blur-md flex flex-col overflow-hidden text-slate-100">
      {/* TOP COMMAND HEADER */}
      <header className="shrink-0 px-3 sm:px-5 py-2.5 bg-[#071124] border-b border-cyan-400/25 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono-tech font-bold text-[#4fe3d4] shrink-0">
            LEVEL 07
          </span>
          <h1 className="font-display text-sm sm:text-base font-extrabold text-white truncate">
            LUNAR WATER HUNT
          </h1>
          <div className="hidden lg:flex items-center gap-1 ml-3">
            {STAGE_TABS.map((t) => {
              const unlocked =
                t.id === 0 ||
                (t.id === 1 && missionStartedAtMs !== null) ||
                (t.id === 2 && missionStartedAtMs !== null) ||
                (t.id === 3 && fuelTestPassed) ||
                (t.id === 4 && launchCompleted) ||
                (t.id === 5 && navOrbitLocked) ||
                (t.id === 6 && hasIceCraterFound && evidenceMeterPct >= 75);
              const active = stage === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (!unlocked) return;
                    SFX.click();
                    setStage(t.id);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    active
                      ? 'bg-[#4fe3d4] text-[#041022]'
                      : unlocked
                      ? 'bg-white/5 hover:bg-white/15 text-slate-200 cursor-pointer'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DirectorVanceVoiceBanner
            compact
            quote="Water ice is hidden inside the Moon's dark craters! Build your orbiter, explore the South Pole, and transmit the proof!"
          />
          <div
            className={`px-2.5 py-1 rounded-lg border font-mono-tech text-xs font-extrabold tabular-nums flex items-center gap-1.5 ${
              secondsLeft <= 30
                ? 'bg-red-950/80 border-red-400 text-red-200 animate-pulse'
                : secondsLeft <= 120
                ? 'bg-amber-950/70 border-amber-400 text-amber-200'
                : 'bg-[#0b1933] border-cyan-400/35 text-[#4fe3d4]'
            }`}
          >
            <span>⏱</span>
            <span>{formatCountdownClock(secondsLeft)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0b1933] border border-amber-400/30 text-xs font-mono-tech font-bold text-amber-300 tabular-nums">
            <span>★ {starCredits.toLocaleString()} SC</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-300">⚡ {xp.toLocaleString()} XP</span>
          </div>

          {onOpenStoreForLunar && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenStoreForLunar();
              }}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#f2c14e] to-[#f97316] text-[#051022] font-extrabold text-xs uppercase tracking-wide shadow-[0_0_16px_rgba(249,115,22,0.35)] hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🛒</span>
              <span>Store</span>
            </button>
          )}

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              title="Open Spacecraft Engineer's Handbook"
              className="px-2.5 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/28 border border-cyan-400/50 text-[#4fe3d4] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>📖</span>
              <span className="hidden sm:inline">Handbook</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const m = SFX.toggleMute();
              setMuted(m);
            }}
            className="w-8 h-8 rounded-lg bg-[#0b1933] border border-white/15 hover:border-cyan-400/45 flex items-center justify-center text-sm cursor-pointer"
          >
            {muted ? '🔇' : '🔊'}
          </button>

          <button
            type="button"
            onClick={() => {
              SFX.click();
              setShowExitConfirm(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
          >
            Exit
          </button>
        </div>
      </header>

      {timerWarningBanner && (
        <div className="bg-amber-500/20 border-b border-amber-400/60 px-4 py-1.5 text-center text-xs font-extrabold text-amber-200 animate-pulse">
          ⚠ {timerWarningBanner}
        </div>
      )}

      <main
        className={`flex-1 min-h-0 flex flex-col p-3 sm:p-5 ${
          stage === 3 ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {/* STAGE 0: ANIMATED LUNAR SOUTH POLE BRIEFING */}
        {stage === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl w-full mx-auto rounded-3xl bg-[#071124] border border-cyan-400/35 p-4 sm:p-5 shadow-2xl space-y-4"
          >
            <div className="relative rounded-2xl bg-gradient-to-b from-[#061229] via-[#071734] to-[#030814] border border-cyan-400/25 p-2 sm:p-3 overflow-hidden">
              <svg viewBox="0 0 680 230" className="w-full h-48 sm:h-56" fill="none">
                <defs>
                  <radialGradient id="lwlMoonGrad" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="60%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#334155" />
                  </radialGradient>
                </defs>
                {/* Twinkling Stars */}
                <circle cx="65" cy="40" r="1.8" fill="#fef08a" className="animate-pulse" />
                <circle cx="145" cy="86" r="1.4" fill="#38bdf8" className="animate-pulse" />
                <circle cx="240" cy="34" r="1.6" fill="#4fe3d4" className="animate-pulse" />
                <circle cx="560" cy="42" r="1.8" fill="#ffffff" className="animate-pulse" />
                <circle cx="615" cy="140" r="1.5" fill="#4fe3d4" className="animate-pulse" />

                {/* Distant Earth */}
                <circle cx="78" cy="148" r="26" fill="#0284c7" stroke="#4fe3d4" strokeWidth="1.6" />
                <path d="M68 140 C76 134, 84 144, 79 152 C72 156, 64 149, 68 140 Z" fill="#34d399" />
                <text x="78" y="190" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="700">
                  EARTH LAUNCH
                </text>

                {/* Lunar South Pole Orb */}
                <circle cx="455" cy="116" r="88" fill="url(#lwlMoonGrad)" stroke="#cbd5e1" strokeWidth="1.8" />
                {/* Dark Shadowed Polar Craters with Shimmering Hidden Ice */}
                <ellipse cx="428" cy="172" rx="22" ry="9" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
                <ellipse cx="472" cy="178" rx="19" ry="8.5" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" className="animate-pulse" />
                <circle cx="472" cy="178" r="4" fill="#7dd3fc" className="animate-ping" />
                <ellipse cx="502" cy="160" rx="14" ry="7" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
                <rect x="355" y="206" width="200" height="18" rx="9" fill="#07152a" stroke="#38bdf8" strokeWidth="1" />
                <text x="455" y="218" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontFamily="monospace" fontWeight="800">
                  ❄ POLAR SHADOW CRATERS
                </text>

                {/* Animated Spacecraft Gliding Along Lunar Transfer Arc */}
                <path d="M104 134 Q225 32 346 88" stroke="#4fe3d4" strokeWidth="2.5" strokeDasharray="6 4" />
                <motion.g
                  animate={{ x: [-22, 18, -22], y: [8, -6, 8] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <g transform="translate(268, 66) rotate(12)">
                    <rect x="-18" y="-4" width="12" height="8" rx="1" fill="#2563eb" stroke="#93c5fd" strokeWidth="1" />
                    <rect x="6" y="-4" width="12" height="8" rx="1" fill="#2563eb" stroke="#93c5fd" strokeWidth="1" />
                    <rect x="-7" y="-7" width="14" height="14" rx="2.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="0" cy="0" r="14" stroke="#4fe3d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                  </g>
                </motion.g>
              </svg>
            </div>

            {/* Director Vance Animated Voice Briefing */}
            <div className="space-y-3">
              <DirectorVanceVoiceBanner
                speaker="DIRECTOR VANCE // VOICE BRIEFING"
                quote="Water ice is hidden inside the Moon’s dark craters! Build your orbiter, explore the South Pole, and transmit the proof!"
                autoPlayKey={visible && stage === 0 ? 'lvl7-water-brief' : null}
              />

              {/* Visual Step Strip */}
              <div className="grid grid-cols-6 gap-1.5 text-center text-[10px] font-mono-tech font-bold">
                {[
                  { icon: '🛠️', label: 'Design' },
                  { icon: '⛽', label: 'Fuel' },
                  { icon: '🚀', label: 'Launch' },
                  { icon: '🧭', label: 'Orbit' },
                  { icon: '❄️', label: 'Craters' },
                  { icon: '📡', label: 'Send' },
                ].map((step) => (
                  <div
                    key={step.label}
                    className="py-1.5 px-1 rounded-xl bg-[#0b1830] border border-white/10 text-slate-300"
                  >
                    <div className="text-sm leading-none">{step.icon}</div>
                    <div className="mt-1 truncate">{step.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tech">
                <span className="px-2.5 py-1 rounded-lg bg-[#0b1830] border border-white/10 text-cyan-200">
                  ⏱ 10:00 Window
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#0b1830] border border-white/10 text-emerald-300">
                  🏆 +★ 1,500 SC
                </span>
                {onOpenStoreForLunar && (
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onOpenStoreForLunar();
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/45 text-amber-200 font-bold cursor-pointer"
                  >
                    🛒 Store ({lunarGearCount}/{level8StoreItems.length})
                  </button>
                )}
              </div>

              {missionStartedAtMs ? (
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setStage(1);
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-sm uppercase tracking-wide cursor-pointer"
                >
                  Resume Lunar Hunt ▶
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartMission}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] via-[#38bdf8] to-emerald-400 text-[#041022] font-extrabold text-sm uppercase tracking-wide shadow-[0_0_24px_rgba(79,227,212,0.4)] hover:brightness-110 transition cursor-pointer"
                >
                  START MISSION (10:00) ▶
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* STAGE 1: SPACECRAFT DESIGN + ANIMATED STORE GEAR DRAG & DROP SIDE PANEL */}
        {stage === 1 && (
          <div className="max-w-[1380px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT: 7 Component Categories */}
            <div className="lg:col-span-5 rounded-2xl bg-[#071124] border border-cyan-400/25 p-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {LUNAR_CATEGORY_META.map((cat) => {
                  const isAct = activeCategory === cat.id;
                  const chosen = findLunarOption(cat.id, build[cat.id]);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        SFX.click();
                        setActiveCategory(cat.id);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isAct
                          ? 'bg-[#4fe3d4] text-[#041022] border-cyan-200'
                          : 'bg-[#0b1830] hover:bg-[#102242] text-slate-200 border-white/10'
                      }`}
                    >
                      <span>{cat.shortLabel}</span>
                      <span
                        className={`text-[10px] font-mono-tech ${
                          isAct ? 'text-[#041022]/80' : 'text-cyan-300'
                        }`}
                      >
                        • {chosen.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {LUNAR_COMPONENTS[activeCategory].map((opt) => {
                  const selected = build[activeCategory] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectComponent(activeCategory, opt.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                        selected
                          ? 'bg-cyan-500/15 border-[#4fe3d4] shadow-[0_0_18px_rgba(79,227,212,0.2)]'
                          : 'bg-[#0a162d] hover:bg-[#0f203f] border-white/10'
                      }`}
                    >
                      <LunarPartIconSVG optionId={opt.id} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-sm text-white">{opt.name}</span>
                          <div className="flex items-center gap-2 text-[11px] font-mono-tech tabular-nums">
                            <span className="text-slate-300">{opt.weightKg} kg</span>
                            <span className="text-amber-300">★ {opt.costSc}</span>
                            <span className="px-1.5 py-0.5 rounded bg-[#061022] border border-cyan-400/25 text-[#4fe3d4]">
                              {opt.metricDisplay}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CENTER: Animated Lunar Orbiter Drop Zone + Compact Telemetry */}
            <div className="lg:col-span-4 rounded-2xl bg-[#071124] border border-cyan-400/25 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-tech font-bold uppercase text-[#4fe3d4]">
                    LIVE ORBITER TWIN
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold ${
                      metrics.readyForFuelTest
                        ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                        : 'bg-amber-500/20 border border-amber-400/50 text-amber-200'
                    }`}
                  >
                    {metrics.readyForFuelTest ? 'FUEL LAB READY' : 'TUNING NEEDED'}
                  </span>
                </div>

                {/* Drag & Drop Target around Animated Lunar Orbiter */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragHoverOrbiter(true);
                  }}
                  onDragLeave={() => setDragHoverOrbiter(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragHoverOrbiter(false);
                    const gearId = e.dataTransfer.getData('text/plain');
                    if (
                      gearId &&
                      unlockedStoreItems.includes(gearId) &&
                      !equippedStoreGear.includes(gearId)
                    ) {
                      SFX.snapCorrect();
                      const nextGear = [...equippedStoreGear, gearId];
                      setEquippedStoreGear(nextGear);
                      setJustDroppedGearId(gearId);
                      window.setTimeout(() => setJustDroppedGearId(null), 1300);
                      persistProgress({ equippedStoreGear: nextGear });
                    }
                  }}
                  className={`relative rounded-2xl p-1 transition-all ${
                    dragHoverOrbiter
                      ? 'ring-2 ring-[#4fe3d4] bg-cyan-500/10 shadow-[0_0_28px_rgba(79,227,212,0.45)] scale-[1.02]'
                      : justDroppedGearId
                      ? 'ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.4)]'
                      : ''
                  }`}
                >
                  <AnimatedLunarOrbiterSVG
                    build={build}
                    metrics={metrics}
                    equippedStoreGear={equippedStoreGear}
                  />
                  {dragHoverOrbiter && (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-[#4fe3d4] flex items-center justify-center bg-[#040d1d]/55">
                      <span className="px-3 py-1 rounded-full bg-[#4fe3d4] text-[#041022] font-mono-tech text-xs font-black uppercase animate-bounce">
                        ⬇ DROP TO MOUNT
                      </span>
                    </div>
                  )}
                </div>

                {/* Equipped Store Gear Chips */}
                {equippedStoreGear.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {equippedStoreGear.map((gid) => {
                      const spec = level8StoreItems.find((s) => s.id === gid);
                      if (!spec) return null;
                      return (
                        <button
                          key={gid}
                          type="button"
                          onClick={() => {
                            SFX.click();
                            const nextGear = equippedStoreGear.filter((id) => id !== gid);
                            setEquippedStoreGear(nextGear);
                            persistProgress({ equippedStoreGear: nextGear });
                          }}
                          title="Click to unequip"
                          className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-[10px] font-bold text-emerald-200 flex items-center gap-1 cursor-pointer hover:bg-rose-500/20 hover:border-rose-400/50"
                        >
                          <span>{spec.icon}</span>
                          <span>{spec.name}</span>
                          <span className="opacity-60">✕</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech tabular-nums">
                  <div
                    className={`p-2 rounded-xl border ${
                      metrics.isOverWeight
                        ? 'bg-red-950/50 border-red-400 text-red-200'
                        : 'bg-[#0a162d] border-white/10 text-white'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase">Mass</div>
                    <div className="text-sm font-extrabold mt-0.5">
                      {metrics.totalMassKg}/{metrics.liftLimitKg} kg
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      metrics.isOverBudget
                        ? 'bg-red-950/50 border-red-400 text-red-200'
                        : 'bg-[#0a162d] border-white/10 text-amber-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase">Budget Left</div>
                    <div className="text-sm font-extrabold mt-0.5">
                      ★ {metrics.remainingBudgetSc} SC
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      metrics.isPowerWeak
                        ? 'bg-red-950/50 border-red-400 text-red-200'
                        : 'bg-[#0a162d] border-white/10 text-emerald-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase">Power</div>
                    <div className="text-sm font-extrabold mt-0.5">
                      {metrics.powerCapacityW}W / {metrics.powerDrawW}W
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      metrics.isCommsWeak || metrics.isInstrumentWeak
                        ? 'bg-amber-950/40 border-amber-400/50 text-amber-200'
                        : 'bg-[#0a162d] border-white/10 text-cyan-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase">Comms / Ice</div>
                    <div className="text-sm font-extrabold mt-0.5">
                      {metrics.commsStrengthPct}% • {metrics.instrumentCapabilityPct}%
                    </div>
                  </div>
                </div>

                {metrics.warnings.length > 0 && (
                  <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-400/40 space-y-0.5">
                    {metrics.warnings.map((w, i) => (
                      <div key={i} className="text-[11px] font-bold text-amber-200">
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={metrics.isOverBudget}
                onClick={() => {
                  SFX.click();
                  setStage(2);
                  persistProgress({ stage: 2 });
                }}
                className={`w-full py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wide transition ${
                  !metrics.isOverBudget
                    ? 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] hover:brightness-110 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {metrics.isOverBudget ? 'Over Budget' : 'Fuel Lab ▶'}
              </button>
            </div>

            {/* RIGHT SIDE PANEL: ANIMATED STORE GEAR DRAG & DROP DOCK */}
            <aside className="lg:col-span-3 rounded-2xl bg-[#071124] border border-amber-400/35 p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono-tech uppercase tracking-wider text-amber-300 font-bold">
                    STORE GEAR DOCK
                  </div>
                  <div className="text-xs font-extrabold text-white">Drag Onto Orbiter</div>
                </div>
                {onOpenStoreForLunar && (
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onOpenStoreForLunar();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#f2c14e] to-[#f97316] text-[#051022] text-[10px] font-black uppercase cursor-pointer hover:brightness-110"
                  >
                    🛒 Store
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[430px] overflow-y-auto pr-0.5">
                {level8StoreItems.map((item) => {
                  const owned = unlockedStoreItems.includes(item.id);
                  const equipped = equippedStoreGear.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      draggable={owned && !equipped}
                      onDragStart={(e) => {
                        if (!owned || equipped) return;
                        e.dataTransfer.setData('text/plain', item.id);
                        e.dataTransfer.effectAllowed = 'copy';
                        SFX.select();
                      }}
                      onClick={() => {
                        if (!owned) {
                          SFX.click();
                          onOpenStoreForLunar?.();
                          return;
                        }
                        if (!equipped) {
                          SFX.snapCorrect();
                          const nextGear = [...equippedStoreGear, item.id];
                          setEquippedStoreGear(nextGear);
                          setJustDroppedGearId(item.id);
                          window.setTimeout(() => setJustDroppedGearId(null), 1300);
                          persistProgress({ equippedStoreGear: nextGear });
                        }
                      }}
                      className={`p-2 rounded-xl border transition-all flex items-center gap-2.5 ${
                        equipped
                          ? 'bg-emerald-950/35 border-emerald-400/60'
                          : owned
                          ? 'bg-[#0b1b38] hover:border-[#4fe3d4] hover:scale-[1.02] border-cyan-400/35 cursor-grab active:cursor-grabbing'
                          : 'bg-[#060e20] border-white/10 opacity-75 cursor-pointer hover:border-amber-400/50'
                      }`}
                    >
                      <div className="w-14 h-10 rounded-lg overflow-hidden border border-white/10 bg-[#040a16] shrink-0 pointer-events-none">
                        <StoreItemIllustrationSVG itemId={item.id} unlocked={owned} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <div className="text-xs font-extrabold text-white truncate">
                          {item.icon} {item.name}
                        </div>
                        <div className="mt-0.5 text-[10px] font-mono-tech font-bold">
                          {equipped ? (
                            <span className="text-emerald-300">✓ MOUNTED</span>
                          ) : owned ? (
                            <span className="text-[#4fe3d4]">✋ DRAG OR TAP</span>
                          ) : (
                            <span className="text-amber-300">🔒 ★ {item.priceStarCredits} SC</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* STAGE 2: ANIMATED FUEL & MASS EXPERIMENT */}
        {stage === 2 && (
          <div className="max-w-5xl w-full mx-auto rounded-2xl bg-[#071124] border border-cyan-400/30 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
                  FUEL LAB
                </span>
                <h2 className="font-display text-base sm:text-lg font-extrabold text-white">
                  Fuel &amp; Lift Thrust Sim
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  setStage(1);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
              >
                ← Design
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-5">
                <AnimatedLunarOrbiterSVG
                  build={build}
                  metrics={metrics}
                  fuelHighlight
                  fuelTestRunning={fuelTestRunning}
                  equippedStoreGear={equippedStoreGear}
                />
              </div>

              <div className="md:col-span-7 space-y-3.5">
                <div className="p-4 rounded-2xl bg-[#0a162d] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono-tech">
                    <span className="text-slate-300 font-bold">⛽ FUEL LOAD</span>
                    <span className="text-lg font-extrabold text-[#4fe3d4] tabular-nums">
                      {metrics.fuelMassKg} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={95}
                    step={1}
                    value={metrics.fuelMassKg}
                    onChange={(e) => handleFuelSliderChange(Number(e.target.value))}
                    className="w-full accent-[#4fe3d4] cursor-pointer"
                  />

                  {/* Animated Thrust & Lift Gauges */}
                  <div className="space-y-2 text-[11px] font-mono-tech">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400">LIFT MASS</span>
                        <strong className={metrics.isOverWeight ? 'text-red-300' : 'text-emerald-300'}>
                          {metrics.totalMassKg}/{metrics.liftLimitKg} kg
                        </strong>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                        <motion.div
                          animate={{ width: `${Math.min(100, (metrics.totalMassKg / metrics.liftLimitKg) * 100)}%` }}
                          className={`h-full rounded-full ${metrics.isOverWeight ? 'bg-red-500' : 'bg-emerald-400'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400">TRAVEL Δv</span>
                        <strong className={metrics.isFuelTooLow ? 'text-red-300' : 'text-[#4fe3d4]'}>
                          {metrics.travelCapabilityPct}%
                        </strong>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                        <motion.div
                          animate={{ width: `${Math.min(100, metrics.travelCapabilityPct)}%` }}
                          className={`h-full rounded-full ${metrics.isFuelTooLow ? 'bg-red-500' : 'bg-[#4fe3d4]'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs font-bold ${
                    metrics.fuelExperimentStatus === 'green'
                      ? 'bg-emerald-950/50 border-emerald-400/60 text-emerald-200'
                      : metrics.fuelExperimentStatus === 'yellow'
                      ? 'bg-amber-950/50 border-amber-400/60 text-amber-200'
                      : 'bg-red-950/50 border-red-400/60 text-red-200'
                  }`}
                >
                  <span className="uppercase font-mono-tech mr-2">
                    [{metrics.fuelExperimentStatus.toUpperCase()}]
                  </span>
                  {metrics.fuelExperimentReason}
                </div>

                <div className="flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    whileTap={!fuelTestRunning ? { scale: 0.96 } : undefined}
                    disabled={fuelTestRunning}
                    onClick={handleRunFuelMassExperiment}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-[#041022] font-extrabold text-xs uppercase tracking-wide hover:brightness-110 cursor-pointer disabled:opacity-60"
                  >
                    {fuelTestRunning ? '🔥 Firing Thrust Sim...' : 'Run Fuel Test ▶'}
                  </motion.button>

                  <button
                    type="button"
                    disabled={!fuelTestPassed || !metrics.readyForFuelTest}
                    onClick={() => {
                      SFX.click();
                      setStage(3);
                      persistProgress({ stage: 3 });
                    }}
                    className={`flex-1 py-3 px-5 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wide transition ${
                      fuelTestPassed && metrics.readyForFuelTest
                        ? 'bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] hover:brightness-110 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {fuelTestPassed && metrics.readyForFuelTest
                      ? 'Launch Rocket ▶'
                      : !fuelTestPassed
                      ? 'Pass Fuel Test First'
                      : 'Fix Warnings First'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: REUSE LEVEL 1/2 3D ROCKET ASSEMBLY & LAUNCHPAD */}
        {stage === 3 && (
          <div className="max-w-6xl w-full mx-auto flex-1 min-h-[520px] flex flex-col rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#040a18] relative">
            {rocketStage === 1 ? (
              <RocketAssemblyStage
                initialInstalledParts={rocketParts}
                externalInstalledParts={rocketParts}
                customCompletionCta="Proceed to Pad 39X Staging ▶"
                customNextStageLabel="NEXT: STAGE LUNAR EXPLORER"
                onProgressChange={(parts) => {
                  setRocketParts(parts);
                  persistProgress({ rocketParts: parts });
                }}
                onCompleteStage2={(parts) => {
                  setRocketParts(parts);
                  setRocketStage(2);
                  persistProgress({ rocketParts: parts, rocketStage: 2 });
                }}
              />
            ) : (
              <LaunchpadPayloadStage
                mode={
                  rocketStage === 2 ? 'stage3' : rocketStage === 3 ? 'stage4' : 'stage5'
                }
                starCredits={starCredits}
                alreadyCompleted={alreadyCompleted}
                customPayloadConfig={{
                  title: 'LUNAR WATER EXPLORER SPACECRAFT',
                  subtitle: 'Mate Polar Orbiter Payload Inside Launch Fairing',
                  dropLabel: 'DROP LUNAR ORBITER',
                  integratedText: 'Lunar Water Explorer Sealed — Ready for Polar Launch!',
                  launchButtonLabel: 'IGNITE LUNAR LAUNCH (3-2-1)',
                }}
                enableStageSeparation
                hideCompletionCelebration
                onFlightFinished={() => {
                  setLaunchCompleted(true);
                  setStage(4);
                  persistProgress({
                    launchCompleted: true,
                    rocketStage: 4,
                    stage: 4,
                  });
                }}
                onCompleteStage3={() => {
                  setRocketStage(3);
                  persistProgress({ rocketStage: 3 });
                }}
                onCompleteStage4={() => {
                  setRocketStage(4);
                  persistProgress({ rocketStage: 4 });
                }}
                onLaunchStatusChange={(st) => setLaunchStatus(st)}
                onCompleteAllStages={async () => ({
                  alreadyRewarded: true,
                  rewardAwarded: 0,
                  newStarBalance: starCredits,
                })}
                onContinueToNextLevel={() => {
                  setLaunchCompleted(true);
                  setStage(4);
                }}
                onReplayLevel={() => setRocketStage(1)}
                onBackToAcademy={onBackToLevelMap}
              />
            )}
          </div>
        )}

        {/* STAGE 4: TRANS-LUNAR NAVIGATION & ANIMATED TOUCHDOWN DESCENT */}
        {stage === 4 && (
          <div className="max-w-5xl w-full mx-auto rounded-2xl bg-[#071124] border border-cyan-400/30 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
                  {navOrbitLocked ? 'TOUCHDOWN DESCENT' : 'LUNAR TRANSFER'}
                </span>
                <h2 className="font-display text-base sm:text-lg font-extrabold text-white">
                  {navOrbitLocked ? 'Land at Moon South Pole' : 'Lock Polar Capture Corridor'}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#0b1830] border border-white/10 text-xs font-mono-tech text-cyan-200">
                {navOrbitLocked ? `ALT ${landingAltM.toLocaleString()} m` : `Window ±${corridorHalfWidth}°`}
              </span>
            </div>

            {!navOrbitLocked ? (
              <>
                <div className="rounded-2xl bg-[#040a16] border border-cyan-400/25 overflow-hidden">
                  <svg viewBox="0 0 700 245" className="w-full h-52 sm:h-60" fill="none">
                    <circle cx="80" cy="175" r="34" fill="#0284c7" stroke="#4fe3d4" strokeWidth="2" />
                    <path d="M64 165 C74 157, 86 169, 78 181 C70 185, 60 177, 64 165 Z" fill="#34d399" />
                    <text x="80" y="226" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontFamily="monospace" fontWeight="700">
                      EARTH
                    </text>

                    <circle
                      cx="590"
                      cy="90"
                      r="48"
                      stroke={inCaptureCorridor ? '#34d399' : '#fbbf24'}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      opacity="0.75"
                    />
                    <circle cx="590" cy="90" r="28" fill="#cbd5e1" stroke="#f8fafc" strokeWidth="1.5" />
                    <circle cx="582" cy="82" r="5" fill="#94a3b8" />
                    <circle cx="600" cy="98" r="7" fill="#64748b" />
                    <text x="590" y="154" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="monospace" fontWeight="700">
                      MOON POLE
                    </text>

                    <path
                      d={`M114 161 Q340 ${105 + navHeadingDeg * 3.8} 590 ${90 + navHeadingDeg * 4.5}`}
                      stroke={inCaptureCorridor ? '#4fe3d4' : '#f87171'}
                      strokeWidth="3"
                      strokeDasharray="7 4"
                    />

                    {(() => {
                      const t = navFlightPct / 100;
                      const sx = 114 + (590 - 114) * t;
                      const ctrlY = 105 + navHeadingDeg * 3.8;
                      const endY = 90 + navHeadingDeg * 4.5;
                      const sy =
                        (1 - t) * (1 - t) * 161 +
                        2 * (1 - t) * t * ctrlY +
                        t * t * endY;
                      return (
                        <g transform={`translate(${sx}, ${sy})`}>
                          <circle r="10" fill="#4fe3d4" opacity="0.25" className="animate-ping" />
                          <circle r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0a162d] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono-tech">
                    <span className="text-slate-300 font-bold">HEADING TRIM</span>
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        inCaptureCorridor ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {navHeadingDeg > 0 ? `+${navHeadingDeg}°` : `${navHeadingDeg}°`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-18}
                    max={18}
                    step={1}
                    disabled={navBurning}
                    value={navHeadingDeg}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      SFX.sliderTick((val + 18) / 36);
                      setNavHeadingDeg(val);
                    }}
                    className="w-full accent-[#4fe3d4] cursor-pointer"
                  />
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs font-bold ${
                    navMessage.tone === 'warn'
                      ? 'bg-red-950/50 border-red-400/50 text-red-200'
                      : 'bg-[#0b1830] border-white/15 text-slate-200'
                  }`}
                >
                  {navMessage.text}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={navBurning}
                    onClick={handleExecuteNavBurn}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer"
                  >
                    {navBurning ? 'Firing LOI Burn...' : 'Lock Lunar Orbit ▶'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Animated Lunar Lander Touchdown Scene */}
                <div className="rounded-2xl bg-[#040a16] border border-cyan-400/30 overflow-hidden p-3">
                  <svg viewBox="0 0 680 230" className="w-full h-52 sm:h-60" fill="none">
                    <circle cx="95" cy="40" r="1.6" fill="#e2e8f0" className="animate-pulse" />
                    <circle cx="230" cy="28" r="1.4" fill="#38bdf8" className="animate-pulse" />
                    <circle cx="520" cy="44" r="1.8" fill="#fef08a" className="animate-pulse" />
                    {/* Distant Earth */}
                    <circle cx="585" cy="52" r="20" fill="#0284c7" stroke="#4fe3d4" strokeWidth="1.5" />
                    {/* Lunar Regolith Surface */}
                    <path d="M0 198 Q180 182 340 196 Q500 208 680 188 L680 230 L0 230 Z" fill="#334155" stroke="#64748b" strokeWidth="2" />
                    <ellipse cx="340" cy="200" rx="64" ry="8" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.4" strokeDasharray="5 4" />

                    {/* Animated Descending Lander */}
                    <motion.g
                      animate={{
                        y: landingPhase === 'landed' ? 124 : landingPhase === 'descending' ? [18, 124] : 18,
                      }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    >
                      <g transform="translate(340, 40)">
                        {/* Retro-Thruster Plume while descending */}
                        {landingPhase === 'descending' && (
                          <motion.polygon
                            points="-10,16 10,16 0,48"
                            fill="#38bdf8"
                            animate={{ opacity: [0.5, 1, 0.5], scaleY: [0.85, 1.2, 0.9] }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                          />
                        )}
                        {/* Lander Legs */}
                        <line x1="-14" y1="10" x2="-24" y2="28" stroke="#cbd5e1" strokeWidth="2.5" />
                        <line x1="14" y1="10" x2="24" y2="28" stroke="#cbd5e1" strokeWidth="2.5" />
                        <rect x="-28" y="27" width="8" height="3" rx="1" fill="#fbbf24" />
                        <rect x="20" y="27" width="8" height="3" rx="1" fill="#fbbf24" />
                        {/* Gold Descent Stage & Cabin */}
                        <rect x="-18" y="-4" width="36" height="16" rx="3" fill="#d97706" stroke="#fde047" strokeWidth="1.5" />
                        <rect x="-12" y="-18" width="24" height="14" rx="4" fill="#e2e8f0" stroke="#4fe3d4" strokeWidth="1.5" />
                        <circle cx="0" cy="-11" r="3.5" fill="#0ea5e9" />
                      </g>
                    </motion.g>
                  </svg>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold ${
                      landingPhase === 'landed'
                        ? 'bg-emerald-950/50 border-emerald-400/60 text-emerald-200'
                        : 'bg-cyan-950/40 border-cyan-400/40 text-cyan-200'
                    }`}
                  >
                    {landingPhase === 'landed'
                      ? '🛬 TOUCHDOWN CONFIRMED — Rover Ready!'
                      : landingPhase === 'descending'
                      ? '🔥 Firing Retro-Thrusters...'
                      : '🎯 Orbit Locked — Ready for Moon Landing'}
                  </div>

                  {landingPhase !== 'landed' ? (
                    <button
                      type="button"
                      disabled={landingPhase === 'descending'}
                      onClick={handleExecuteLandingBurn}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer disabled:opacity-60"
                    >
                      {landingPhase === 'descending' ? 'Landing...' : 'Land on Moon 🛬'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        SFX.click();
                        setStage(5);
                        persistProgress({ stage: 5 });
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer shadow-[0_0_20px_rgba(79,227,212,0.4)]"
                    >
                      Explore Moon in 3D ▶
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* STAGE 5: EXPLORE WHOLE LUNAR SURFACE IN 3D & SCAN CRATERS */}
        {stage === 5 && (
          <LunarSurfaceExplorer3D
            craterScans={craterScans}
            evidenceMeterPct={evidenceMeterPct}
            canDetectSubsurfaceIce={metrics.canDetectSubsurfaceIce}
            scanningCrater={scanningCrater}
            hasIceCraterFound={hasIceCraterFound}
            onScanCrater={handleScanCrater}
            onUpgradeInstruments={() => setStage(1)}
            onProceedToTransmit={() => {
              setStage(6);
              persistProgress({ stage: 6 });
            }}
          />
        )}

        {/* STAGE 6: TRANSMIT DISCOVERY DATA TO EARTH */}
        {stage === 6 && (
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#071124] border border-cyan-400/35 p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono-tech uppercase text-[#4fe3d4] font-bold">
                  STAGE 6 // DEEP SPACE DOWNLINK
                </div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                  Transmit Lunar Water Ice Findings to Earth
                </h2>
              </div>
              <span className="font-mono-tech text-sm font-extrabold text-[#4fe3d4]">
                {transmittedPct}%
              </span>
            </div>

            {/* Animated Spacecraft -> Earth Packet Link */}
            <div className="rounded-2xl bg-[#040a16] border border-cyan-400/25 p-3">
              <svg viewBox="0 0 640 200" className="w-full h-44 sm:h-52" fill="none">
                <circle cx="96" cy="104" r="34" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" />
                <g transform="translate(152, 92)">
                  <rect x="-12" y="-7" width="24" height="14" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" />
                  <path d="M12 -10 Q24 0 12 10" stroke="#4fe3d4" strokeWidth="2.5" fill="none" />
                </g>

                <line
                  x1="176"
                  y1="92"
                  x2="516"
                  y2="104"
                  stroke={transmissionInterrupted ? '#fbbf24' : txDone ? '#34d399' : '#38bdf8'}
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
                {transmitting && (
                  <circle r="7" fill="#4fe3d4">
                    <animateMotion dur="0.9s" repeatCount="indefinite" path="M176,92 L516,104" />
                  </circle>
                )}

                <circle cx="556" cy="104" r="32" fill="#0284c7" stroke="#4fe3d4" strokeWidth="2" />
                <path d="M544 92 C552 86, 564 96, 558 106 C548 112, 540 104, 544 92 Z" fill="#34d399" />
                <text x="556" y="152" textAnchor="middle" fill="#4fe3d4" fontSize="10" fontFamily="monospace" fontWeight="700">
                  MISSION CONTROL DSN
                </text>
              </svg>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  transmissionInterrupted
                    ? 'bg-amber-400'
                    : txDone
                    ? 'bg-emerald-400'
                    : 'bg-[#4fe3d4]'
                }`}
                style={{ width: `${transmittedPct}%` }}
              />
            </div>

            {transmissionInterrupted && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-400/50 text-xs font-bold text-amber-200">
                ⚠ Weak South-Pole Crater Rim Signal! Your collected crater evidence stays buffered safely — realign the dish and resume transmission.
              </div>
            )}

            {!txDone ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={transmitting || submittingReward}
                  onClick={handleStartOrResumeTransmit}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer"
                >
                  {transmitting
                    ? 'Streaming Science Packets...'
                    : transmissionInterrupted
                    ? 'Re-Align Dish & Resume ▶'
                    : 'SEND DATA TO EARTH ▶'}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-r from-cyan-950/80 via-[#081936] to-emerald-950/60 border border-emerald-400/60 p-5 flex flex-col sm:flex-row items-center gap-5">
                <LunarWaterExplorerBadgeSVG size={118} />
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono-tech font-bold text-emerald-300">
                    DOWNLINK 100% VERIFIED
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-extrabold text-white">
                    LUNAR WATER ICE EVIDENCE SUCCESSFULLY TRANSMITTED!
                  </h3>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs font-mono-tech font-bold">
                    <span className="px-2.5 py-1 rounded bg-[#071124] border border-amber-400/40 text-amber-300">
                      {rewardResult?.alreadyRewarded ? 'Already Claimed ✓' : '+★ 1,500 Star Credits'}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#071124] border border-emerald-400/40 text-emerald-300">
                      {rewardResult?.alreadyRewarded ? 'Mastered ✓' : '+200 Engineering XP'}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#071124] border border-cyan-400/40 text-[#4fe3d4]">
                      Lunar Water Explorer Badge
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onContinueToLevel8();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] font-extrabold text-xs uppercase tracking-wide hover:brightness-110 cursor-pointer"
                  >
                    Continue to Level 8 ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onBackToLevelMap();
                    }}
                    className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
                  >
                    Level Map
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* TIMEOUT MODAL */}
      {timerExpired && !txDone && (
        <div className="fixed inset-0 z-[5200] bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#071124] border border-red-400/60 p-6 text-center space-y-4">
            <div className="text-4xl">🌑⏱</div>
            <h2 className="font-display text-xl font-extrabold text-red-300">
              MISSION WINDOW EXPIRED!
            </h2>
            <p className="text-xs text-slate-300">
              Your polar downlink window closed before evidence reached Earth. Retry with a fresh 10-minute window!
            </p>
            <div className="flex gap-2.5 justify-center">
              <button
                type="button"
                onClick={handleFullReset}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs uppercase cursor-pointer"
              >
                Retry Mission (10:00) ▶
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXIT MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[5200] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#071124] border border-cyan-400/35 p-5 text-center space-y-4">
            <h3 className="font-display text-base font-extrabold text-white">
              Leave Lunar Water Hunt?
            </h3>
            <p className="text-xs text-slate-300">
              Your spacecraft design, crater scans, and timer stay saved automatically.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleFullReset}
                className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-xs font-bold text-amber-200 cursor-pointer"
              >
                Reset Level 7
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2 rounded-xl bg-red-500/25 border border-red-400/50 text-xs font-bold text-red-200 cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
