import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  CALIBRATION_EXPERIMENTS,
  celsiusToKelvin,
  DEFAULT_LEVEL6_PROGRESS,
  DEFAULT_PROBE_BUILD,
  EUROPA_LOCATIONS,
  EUROPA_MAX_BUDGET_SC,
  EUROPA_MAX_WEIGHT_KG,
  EUROPA_MISSION_DURATION_SEC,
  EuropaLocationSpec,
  evaluateProbeBuild,
  findProbeOption,
  formatCountdownClock,
  getTempColor,
  PROBE_CATEGORY_META,
  PROBE_COMPONENTS,
  ProbeCategoryId,
  SavedEuropaReading,
  SelectedProbeBuild,
  StoredLevel6Progress,
} from '../utils/europaMissionData';
import { LaunchSequenceStatus, RocketPartId } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { RocketAssemblyStage } from './RocketAssemblyStage';
import { LaunchpadPayloadStage } from './LaunchpadPayloadStage';
import { ThermalTelemetrySpecialistBadgeSVG } from './BadgesSVG';
import { EuropaSurfaceExplorer3D } from './EuropaSurfaceExplorer3D';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

export interface Level6CompletionPayload {
  probeBuild: SelectedProbeBuild;
  calibrationSolvedIds: number[];
  launchCompleted: boolean;
  landed: boolean;
  collectedReadings: SavedEuropaReading[];
  transmittedPackets: number;
  timerExpired: boolean;
}

export interface Level6RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  xpAwarded: number;
  newStarBalance: number;
  newXpBalance: number;
}

interface EuropaProbeLabProps {
  visible: boolean;
  starCredits: number;
  xp: number;
  alreadyCompleted: boolean;
  initialProgress?: StoredLevel6Progress;
  onSaveProgress: (progress: StoredLevel6Progress) => void;
  onReplayReset: () => void;
  onCompleteMission: (payload: Level6CompletionPayload) => Promise<Level6RewardResult>;
  onContinueToLevel7: () => void;
  onBackToLevelMap: () => void;
  onExit: () => void;
  onOpenHandbook?: () => void;
}

type EuropaStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STAGE_TABS: Array<{ id: EuropaStage; label: string }> = [
  { id: 0, label: 'Intro' },
  { id: 1, label: '1 Build' },
  { id: 2, label: '2 Calibrate' },
  { id: 3, label: '3 Launch' },
  { id: 4, label: '4 Land' },
  { id: 5, label: '5 Explore' },
  { id: 6, label: '6 Transmit' },
];

/* ========================================================
   COMPONENT CARD MINI SVG (VISUAL REPRESENTATION)
   ======================================================== */
const ComponentOptionVisualSVG: React.FC<{ optionId: string }> = ({ optionId }) => {
  if (optionId.startsWith('body_')) {
    const color =
      optionId === 'body_ti' ? '#38bdf8' : optionId === 'body_steel' ? '#64748b' : '#cbd5e1';
    return (
      <svg viewBox="0 0 64 48" className="w-14 h-11 shrink-0" fill="none">
        <polygon points="18,10 46,10 54,24 46,38 18,38 10,24" fill="#0b1830" stroke={color} strokeWidth="2.4" />
        <rect x="22" y="16" width="20" height="16" rx="2" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.2" />
        {optionId === 'body_ti' && <path d="M18 24 H46" stroke="#fde047" strokeWidth="1.5" strokeDasharray="3 2" />}
      </svg>
    );
  }
  if (optionId.startsWith('legs_')) {
    const color =
      optionId === 'legs_tri' ? '#34d399' : optionId === 'legs_quad' ? '#fbbf24' : '#94a3b8';
    return (
      <svg viewBox="0 0 64 48" className="w-14 h-11 shrink-0" fill="none">
        <rect x="20" y="12" width="24" height="10" rx="2" fill="#0f172a" stroke={color} strokeWidth="1.8" />
        {optionId === 'legs_skid' ? (
          <>
            <line x1="24" y1="22" x2="18" y2="36" stroke={color} strokeWidth="2.4" />
            <line x1="40" y1="22" x2="46" y2="36" stroke={color} strokeWidth="2.4" />
            <line x1="12" y1="37" x2="52" y2="37" stroke={color} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="22" y1="22" x2="11" y2="38" stroke={color} strokeWidth="2.4" />
            <line x1="42" y1="22" x2="53" y2="38" stroke={color} strokeWidth="2.4" />
            <line x1="32" y1="22" x2="32" y2="38" stroke={color} strokeWidth="2.2" />
            <ellipse cx="11" cy="39" rx="5" ry="2" fill={color} />
            <ellipse cx="53" cy="39" rx="5" ry="2" fill={color} />
            {optionId === 'legs_quad' && <ellipse cx="32" cy="39" rx="5" ry="2" fill={color} />}
          </>
        )}
      </svg>
    );
  }
  if (optionId.startsWith('sensor_')) {
    const color =
      optionId === 'sensor_rtd' ? '#4fe3d4' : optionId === 'sensor_ir' ? '#a78bfa' : '#f87171';
    return (
      <svg viewBox="0 0 64 48" className="w-14 h-11 shrink-0" fill="none">
        <rect x="27" y="6" width="10" height="26" rx="5" fill="#08142b" stroke={color} strokeWidth="2" />
        <circle cx="32" cy="35" r="7" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
        <rect x="30" y="14" width="4" height="19" rx="2" fill={color} />
        {optionId === 'sensor_ir' && (
          <path d="M16 14 Q22 20 16 26 M48 14 Q42 20 48 26" stroke={color} strokeWidth="1.6" />
        )}
      </svg>
    );
  }
  if (optionId.startsWith('bat_')) {
    const color =
      optionId === 'bat_li' ? '#34d399' : optionId === 'bat_heavy' ? '#38bdf8' : '#fb7185';
    return (
      <svg viewBox="0 0 64 48" className="w-14 h-11 shrink-0" fill="none">
        <rect x="14" y="13" width="32" height="22" rx="3" fill="#09152b" stroke={color} strokeWidth="2" />
        <rect x="46" y="19" width="4" height="10" rx="1" fill={color} />
        <rect x="18" y="17" width={optionId === 'bat_zinc' ? 8 : 24} height="14" rx="1.5" fill={color} fillOpacity="0.8" />
        <polygon points="32,16 27,24 31,24 29,32 36,22 32,22" fill="#fef08a" />
      </svg>
    );
  }
  if (optionId.startsWith('heat_')) {
    const color =
      optionId === 'heat_rhupulse' ? '#f59e0b' : optionId === 'heat_coil' ? '#ef4444' : '#94a3b8';
    return (
      <svg viewBox="0 0 64 48" className="w-14 h-11 shrink-0" fill="none">
        <rect x="12" y="12" width="40" height="24" rx="4" fill="#0b1528" stroke={color} strokeWidth="1.8" />
        <path d="M18 28 L23 18 L28 30 L33 18 L38 30 L43 18 L47 26" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // antenna
  const color =
    optionId === 'ant_hga' ? '#4fe3d4' : optionId === 'ant_phased' ? '#38bdf8' : '#f87171';
  return (
    <svg viewBox="0 0 64 48" className="w-14 h-11 shrink-0" fill="none">
      {optionId === 'ant_whip' ? (
        <>
          <line x1="32" y1="38" x2="32" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="11" r="3" fill={color} />
          <path d="M24 14 Q20 18 24 22" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
        </>
      ) : optionId === 'ant_phased' ? (
        <>
          <rect x="15" y="14" width="34" height="16" rx="2" fill="#09152b" stroke={color} strokeWidth="2" />
          <line x1="23" y1="14" x2="23" y2="30" stroke={color} strokeWidth="1.2" />
          <line x1="32" y1="14" x2="32" y2="30" stroke={color} strokeWidth="1.2" />
          <line x1="41" y1="14" x2="41" y2="30" stroke={color} strokeWidth="1.2" />
          <line x1="32" y1="30" x2="32" y2="40" stroke={color} strokeWidth="2.4" />
        </>
      ) : (
        <>
          <path d="M16 22 Q32 36 48 22" stroke={color} strokeWidth="2.8" fill="#0b1b38" />
          <line x1="32" y1="29" x2="32" y2="12" stroke="#e2e8f0" strokeWidth="1.8" />
          <circle cx="32" cy="12" r="2.6" fill="#fbbf24" />
          <path d="M22 10 Q32 4 42 10" stroke={color} strokeWidth="1.6" fill="none" />
        </>
      )}
    </svg>
  );
};

/* ========================================================
   LIVE ANIMATED PROBE ASSEMBLY PREVIEW SVG
   ======================================================== */
const LiveProbeAssemblySVG: React.FC<{
  build: SelectedProbeBuild;
  metrics: ReturnType<typeof evaluateProbeBuild>;
  pulseTick: number;
}> = ({ build, metrics, pulseTick }) => {
  const hullColor =
    build.body === 'body_ti' ? '#38bdf8' : build.body === 'body_steel' ? '#94a3b8' : '#cbd5e1';
  const antColor = metrics.isAntennaWeak ? '#f87171' : '#4fe3d4';
  const heaterGlow = metrics.isHeatingWeak ? '#60a5fa' : '#fb923c';
  const sensorColor = metrics.isSensorInaccurate ? '#fb7185' : '#34d399';
  const jitterOffset = metrics.isSensorInaccurate ? (pulseTick % 2 === 0 ? -1.8 : 1.8) : 0;

  return (
    <svg viewBox="0 0 260 210" className="w-full h-44 sm:h-48 select-none" fill="none">
      <defs>
        <radialGradient id="probeGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={metrics.isHeatingWeak ? '#38bdf8' : '#f59e0b'} stopOpacity="0.22" />
          <stop offset="100%" stopColor="#020817" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="130" cy="108" r="88" fill="url(#probeGlow)" />

      {/* Ground / Launch Scale Platform */}
      <rect
        x="48"
        y="176"
        width="164"
        height="14"
        rx="4"
        fill={metrics.isOverWeight ? '#450a0a' : '#0b1d3a'}
        stroke={metrics.isOverWeight ? '#ef4444' : '#38bdf8'}
        strokeWidth="2"
      />
      <text
        x="130"
        y="186"
        textAnchor="middle"
        fill={metrics.isOverWeight ? '#fca5a5' : '#7dd3fc'}
        fontSize="8.5"
        fontFamily="monospace"
        fontWeight="700"
      >
        {metrics.isOverWeight
          ? `OVERWEIGHT: ${metrics.totalWeightKg} KG (> 120 KG)`
          : `SCALE: ${metrics.totalWeightKg} / 120 KG`}
      </text>

      {/* Communication Antenna on Top */}
      {build.antenna === 'ant_whip' ? (
        <g>
          <line x1="130" y1="68" x2="130" y2="28" stroke={antColor} strokeWidth="2.8" />
          <circle cx="130" cy="26" r="4" fill={antColor} />
          <path d="M114 34 L106 28 M146 34 L154 28" stroke="#f87171" strokeWidth="1.8" strokeDasharray="3 3" />
        </g>
      ) : build.antenna === 'ant_phased' ? (
        <g>
          <line x1="130" y1="68" x2="130" y2="50" stroke={antColor} strokeWidth="3" />
          <rect x="98" y="30" width="64" height="20" rx="3" fill="#091a38" stroke={antColor} strokeWidth="2.2" />
          <path d="M114 22 Q130 10 146 22" stroke="#4fe3d4" strokeWidth="2" fill="none" />
          <path d="M104 15 Q130 0 156 15" stroke="#38bdf8" strokeWidth="1.6" fill="none" />
        </g>
      ) : (
        <g>
          <line x1="130" y1="68" x2="130" y2="52" stroke={antColor} strokeWidth="3" />
          <path d="M100 38 Q130 60 160 38" stroke={antColor} strokeWidth="3.2" fill="#0b1f3f" />
          <line x1="130" y1="48" x2="130" y2="28" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="130" cy="27" r="3" fill="#fbbf24" />
          <path d="M114 20 Q130 10 146 20" stroke="#4fe3d4" strokeWidth="1.8" fill="none" />
        </g>
      )}

      {/* Probe Body */}
      <g transform={`translate(0, ${metrics.isOverWeight ? 3 : 0})`}>
        <polygon
          points="90,68 170,68 182,102 170,134 90,134 78,102"
          fill="#0b1b38"
          stroke={hullColor}
          strokeWidth="3"
        />
        {/* Battery Cell Indicator Inside Body */}
        <rect
          x="93"
          y="80"
          width="32"
          height="20"
          rx="3"
          fill="#061124"
          stroke={metrics.isBatteryWeak ? '#fb7185' : '#34d399'}
          strokeWidth="1.6"
        />
        <rect
          x="96"
          y="83"
          width={
            metrics.isBatteryWeak
              ? pulseTick % 2 === 0
                ? 8
                : 4
              : Math.round((metrics.batteryCapacityPct / 100) * 26)
          }
          height="14"
          rx="1.5"
          fill={metrics.isBatteryWeak ? '#fb7185' : '#34d399'}
        />

        {/* Heater Coil Visual Inside Body */}
        <rect x="133" y="80" width="34" height="20" rx="3" fill="#061124" stroke={heaterGlow} strokeWidth="1.6" />
        <path
          d="M137 94 L142 84 L147 95 L152 84 L157 95 L162 84"
          stroke={heaterGlow}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Thermal Sensor Probe Tip Extending Below */}
        <g transform={`translate(${jitterOffset}, 0)`}>
          <rect x="125" y="134" width="10" height="30" rx="4" fill="#0b1830" stroke={sensorColor} strokeWidth="2" />
          <circle cx="130" cy="166" r="5" fill={sensorColor} />
        </g>

        {/* Body Label */}
        <text x="130" y="121" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="700">
          {findProbeOption('body', build.body).shortName.toUpperCase()}
        </text>
      </g>

      {/* Landing Legs */}
      {build.legs === 'legs_skid' ? (
        <g>
          <line x1="94" y1="130" x2="72" y2="168" stroke="#94a3b8" strokeWidth="3.5" />
          <line x1="166" y1="130" x2="188" y2="168" stroke="#94a3b8" strokeWidth="3.5" />
          <line x1="60" y1="170" x2="96" y2="170" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <line x1="164" y1="170" x2="200" y2="170" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <line x1="92" y1="130" x2="64" y2="171" stroke="#4fe3d4" strokeWidth="3.5" />
          <line x1="168" y1="130" x2="196" y2="171" stroke="#4fe3d4" strokeWidth="3.5" />
          <ellipse cx="64" cy="172" rx="10" ry="3.5" fill="#34d399" />
          <ellipse cx="196" cy="172" rx="10" ry="3.5" fill="#34d399" />
          {build.legs === 'legs_quad' && (
            <>
              <line x1="108" y1="134" x2="92" y2="171" stroke="#fbbf24" strokeWidth="3" />
              <line x1="152" y1="134" x2="168" y2="171" stroke="#fbbf24" strokeWidth="3" />
              <ellipse cx="92" cy="172" rx="8" ry="3" fill="#fbbf24" />
              <ellipse cx="168" cy="172" rx="8" ry="3" fill="#fbbf24" />
            </>
          )}
        </g>
      )}
    </svg>
  );
};

/* ========================================================
   ANIMATED LAB THERMOMETER PAIR FOR CALIBRATION
   ======================================================== */
const ThermometerColumn: React.FC<{
  title: string;
  tempC: number;
  accentColor: string;
  vibrate?: boolean;
  matched?: boolean;
}> = ({ title, tempC, accentColor, vibrate, matched }) => {
  // Map -250°C .. -100°C -> 10% .. 95% fill height
  const fillPct = Math.max(8, Math.min(96, ((tempC + 250) / 150) * 88 + 8));

  return (
    <div
      className={`flex flex-col items-center p-3.5 rounded-2xl border bg-[#07142b]/90 transition-all ${
        matched
          ? 'border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.35)]'
          : vibrate
          ? 'border-rose-400 animate-[shake_0.35s_ease-in-out]'
          : 'border-cyan-400/30'
      }`}
    >
      <div className="text-[10px] font-mono-tech uppercase tracking-wider text-slate-300 font-bold mb-2">
        {title}
      </div>
      <div className="relative w-12 h-40 rounded-full bg-[#030a18] border-2 border-slate-600 p-1.5 flex items-end justify-center overflow-hidden">
        {/* Tick marks */}
        <div className="absolute inset-y-3 left-1.5 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="w-2 h-[1px] bg-slate-500/70" />
          ))}
        </div>
        <div
          className="w-4 rounded-full transition-all duration-300 ease-out"
          style={{
            height: `${fillPct}%`,
            backgroundColor: matched ? '#34d399' : accentColor,
            boxShadow: `0 0 14px ${matched ? '#34d399' : accentColor}`,
          }}
        />
      </div>
      <div
        className="w-10 h-10 -mt-3 rounded-full border-2 border-slate-500 flex items-center justify-center"
        style={{ backgroundColor: matched ? '#064e3b' : '#091833' }}
      >
        <div
          className="w-6 h-6 rounded-full"
          style={{ backgroundColor: matched ? '#34d399' : accentColor }}
        />
      </div>
      <div
        className="mt-2 font-mono-tech text-xl font-black tabular-nums"
        style={{ color: matched ? '#6ee7b7' : accentColor }}
      >
        {tempC > 0 ? `+${tempC}` : tempC}°C
      </div>
    </div>
  );
};

/* ========================================================
   MAIN LEVEL 6 COMPONENT
   ======================================================== */
export const EuropaProbeLab: React.FC<EuropaProbeLabProps> = ({
  visible,
  starCredits,
  xp,
  alreadyCompleted,
  initialProgress,
  onSaveProgress,
  onReplayReset,
  onCompleteMission,
  onContinueToLevel7,
  onBackToLevelMap,
  onExit,
  onOpenHandbook,
}) => {
  const safeInit = initialProgress || DEFAULT_LEVEL6_PROGRESS;

  const [stage, setStage] = useState<EuropaStage>(safeInit.stage);
  const [probeBuild, setProbeBuild] = useState<SelectedProbeBuild>(
    safeInit.probeBuild || { ...DEFAULT_PROBE_BUILD }
  );
  const [activeBuildCat, setActiveBuildCat] = useState<ProbeCategoryId>('body');

  // Calibration state
  const [calibrationSolvedIds, setCalibrationSolvedIds] = useState<number[]>(
    safeInit.calibrationSolvedIds || []
  );
  const [activeCalIdx, setActiveCalIdx] = useState<number>(0);
  const [calOffsetInput, setCalOffsetInput] = useState<number>(0);
  const [calWrongAttempts, setCalWrongAttempts] = useState<Record<number, number>>({});
  const [calFeedback, setCalFeedback] = useState<{
    status: 'idle' | 'correct' | 'wrong';
    text: string;
  }>({ status: 'idle', text: '' });

  // Rocket & Launch state
  const [rocketParts, setRocketParts] = useState<RocketPartId[]>(
    (safeInit.rocketParts as RocketPartId[]) || []
  );
  const [rocketStage, setRocketStage] = useState<1 | 2 | 3 | 4>(safeInit.rocketStage || 1);
  const [launchCompleted, setLaunchCompleted] = useState<boolean>(Boolean(safeInit.launchCompleted));

  // Landing Challenge state
  const [landingSolved, setLandingSolved] = useState<{
    speed: boolean;
    tilt: boolean;
    thermal: boolean;
  }>(safeInit.landingSolved || { speed: false, tilt: false, thermal: false });
  const [retroThrustPct, setRetroThrustPct] = useState<number>(35);
  const [rcsTrimDeg, setRcsTrimDeg] = useState<number>(0);
  const [legsDeployed, setLegsDeployed] = useState<boolean>(false);
  const [heaterDutyPct, setHeaterDutyPct] = useState<number>(20);
  const [landingFeedback, setLandingFeedback] = useState<{
    type: 'neutral' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [touchdownAnimating, setTouchdownAnimating] = useState<boolean>(false);
  const [landed, setLanded] = useState<boolean>(Boolean(safeInit.landed));
  const [landingAltM, setLandingAltM] = useState<number>(safeInit.landed ? 0 : 840);

  // Europa Exploration state
  const [collectedReadings, setCollectedReadings] = useState<SavedEuropaReading[]>(
    safeInit.collectedReadings || []
  );
  const [, setProbePos] = useState<{ x: number; y: number }>({ x: 20, y: 58 });
  const [probingLoc, setProbingLoc] = useState<EuropaLocationSpec | null>(null);
  const [probeTravelPhase, setProbeTravelPhase] = useState<
    'idle' | 'moving' | 'drilling' | 'measured'
  >('idle');
  const [activeMeasuredTempC, setActiveMeasuredTempC] = useState<number | null>(null);
  const [activeDriftC, setActiveDriftC] = useState<number>(0);
  const [sensorStabilizedHere, setSensorStabilizedHere] = useState<boolean>(false);
  const [readingsPanelOpen, setReadingsPanelOpen] = useState<boolean>(false);

  // Earth Transmission state
  const [transmittedPackets, setTransmittedPackets] = useState<number>(
    safeInit.transmittedPackets || 0
  );
  const [transmitting, setTransmitting] = useState<boolean>(false);
  const [linkInterrupted, setLinkInterrupted] = useState<boolean>(false);
  const [missionSuccess, setMissionSuccess] = useState<boolean>(false);
  const [rewardResult, setRewardResult] = useState<Level6RewardResult | null>(null);

  // 12-Minute Persistent Timer + Director Vance Voice + Audio Mute
  const [missionStartedAtMs, setMissionStartedAtMs] = useState<number | null>(
    safeInit.missionStartedAtMs || null
  );
  const [missionDeadlineMs, setMissionDeadlineMs] = useState<number | null>(
    safeInit.missionDeadlineMs || null
  );
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (safeInit.missionDeadlineMs) {
      return Math.max(0, Math.ceil((safeInit.missionDeadlineMs - Date.now()) / 1000));
    }
    return EUROPA_MISSION_DURATION_SEC;
  });
  const [timerExpired, setTimerExpired] = useState<boolean>(Boolean(safeInit.timerExpired));
  const [timerWarningBanner, setTimerWarningBanner] = useState<string | null>(null);
  const warningsFiredRef = useRef<{ m5: boolean; m2: boolean; s30: boolean }>({
    m5: false,
    m2: false,
    s30: false,
  });

  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());
  const [pulseTick, setPulseTick] = useState<number>(0);

  const probeMetrics = useMemo(() => evaluateProbeBuild(probeBuild), [probeBuild]);

  // Pulse ticker only needed for Stage 1 live probe animations (avoid needless Stage 3 re-renders)
  useEffect(() => {
    if (!visible || stage !== 1) return;
    const id = window.setInterval(() => setPulseTick((t) => t + 1), 650);
    return () => window.clearInterval(id);
  }, [visible, stage]);

  // Sync from incoming initialProgress only when lab opens
  useEffect(() => {
    if (!visible) return;
    const src = initialProgress || DEFAULT_LEVEL6_PROGRESS;
    setStage(src.stage || 0);
    setProbeBuild(src.probeBuild || { ...DEFAULT_PROBE_BUILD });
    setCalibrationSolvedIds(src.calibrationSolvedIds || []);
    setRocketParts((src.rocketParts as RocketPartId[]) || []);
    setRocketStage(src.rocketStage || 1);
    setLaunchCompleted(Boolean(src.launchCompleted));
    setLandingSolved(src.landingSolved || { speed: false, tilt: false, thermal: false });
    setLanded(Boolean(src.landed));
    setLandingAltM(src.landed ? 0 : 840);
    setCollectedReadings(src.collectedReadings || []);
    setTransmittedPackets(src.transmittedPackets || 0);
    setMissionStartedAtMs(src.missionStartedAtMs || null);
    setMissionDeadlineMs(src.missionDeadlineMs || null);
    setTimerExpired(Boolean(src.timerExpired));
    if (src.missionDeadlineMs) {
      const left = Math.max(0, Math.ceil((src.missionDeadlineMs - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0 && !src.timerExpired && src.transmittedPackets < 5) {
        setTimerExpired(true);
      }
      warningsFiredRef.current = {
        m5: left <= 300,
        m2: left <= 120,
        s30: left <= 30,
      };
    } else {
      setRemainingSec(EUROPA_MISSION_DURATION_SEC);
      warningsFiredRef.current = { m5: false, m2: false, s30: false };
    }
    setMissionSuccess(false);
    setRewardResult(null);
    setLinkInterrupted(false);
    setTransmitting(false);
  }, [visible]); // only rehydrate when opened

  const onSaveProgressRef = useRef(onSaveProgress);
  onSaveProgressRef.current = onSaveProgress;
  const latestSnapshotRef = useRef<StoredLevel6Progress>({
    stage,
    probeBuild,
    calibrationSolvedIds,
    rocketParts,
    rocketStage,
    launchCompleted,
    landingSolved,
    landed,
    collectedReadings,
    transmittedPackets,
    missionStartedAtMs,
    missionDeadlineMs,
    timerExpired,
  });
  latestSnapshotRef.current = {
    stage,
    probeBuild,
    calibrationSolvedIds,
    rocketParts,
    rocketStage,
    launchCompleted,
    landingSolved,
    landed,
    collectedReadings,
    transmittedPackets,
    missionStartedAtMs,
    missionDeadlineMs,
    timerExpired,
  };

  // Persist progress snapshot safely without tearing down effects
  const persistSnapshot = useCallback((patch?: Partial<StoredLevel6Progress>) => {
    const next = {
      ...latestSnapshotRef.current,
      ...(patch || {}),
    };
    latestSnapshotRef.current = next;
    onSaveProgressRef.current(next);
  }, []);

  // 12-Minute Persistent Countdown Loop
  useEffect(() => {
    if (!visible || !missionDeadlineMs || missionSuccess || timerExpired) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((missionDeadlineMs - Date.now()) / 1000));
      setRemainingSec((prev) => (prev === left ? prev : left));

      if (left <= 300 && left > 120 && !warningsFiredRef.current.m5) {
        warningsFiredRef.current.m5 = true;
        SFX.tempWarningBeep();
        setTimerWarningBanner('5 MINUTES REMAINING — Keep progressing!');
      } else if (left <= 120 && left > 30 && !warningsFiredRef.current.m2) {
        warningsFiredRef.current.m2 = true;
        SFX.tempWarningBeep();
        setTimerWarningBanner('2 MINUTES REMAINING — Accelerate telemetry!');
      } else if (left <= 30 && left > 0 && !warningsFiredRef.current.s30) {
        warningsFiredRef.current.s30 = true;
        SFX.tempWarningBeep();
        setTimerWarningBanner('30 SECONDS REMAINING — Send data to Earth now!');
      }

      if (left <= 0 && !missionSuccess) {
        setTimerExpired(true);
        setTransmitting(false);
        SFX.snapWrong();
        persistSnapshot({ timerExpired: true });
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [missionDeadlineMs, missionSuccess, persistSnapshot, timerExpired, visible]);

  // Auto-dismiss warning toast after 6s
  useEffect(() => {
    if (!timerWarningBanner) return;
    const t = window.setTimeout(() => setTimerWarningBanner(null), 6000);
    return () => window.clearTimeout(t);
  }, [timerWarningBanner]);

  // Transmission packet streaming loop (Stage 6)
  useEffect(() => {
    if (!visible || stage !== 6 || !transmitting || linkInterrupted || timerExpired || missionSuccess) {
      return;
    }

    const packetIntervalMs = probeMetrics.isAntennaWeak ? 1550 : 920;
    const t = window.setTimeout(() => {
      const nextPkt = transmittedPackets + 1;

      // Weak antenna causes realistic interruption on packet 2 and 4 without losing delivered packets
      if (probeMetrics.isAntennaWeak && (nextPkt === 2 || nextPkt === 4)) {
        SFX.tempWarningBeep();
        setTransmittedPackets(nextPkt);
        setLinkInterrupted(true);
        setTransmitting(false);
        persistSnapshot({ transmittedPackets: nextPkt });
        return;
      }

      SFX.snapCorrect();
      setTransmittedPackets(nextPkt);
      persistSnapshot({ transmittedPackets: nextPkt });

      if (nextPkt >= 5) {
        setTransmitting(false);
        setMissionSuccess(true);
        SFX.levelComplete();
        window.setTimeout(() => SFX.badgeUnlock(), 250);
        onCompleteMission({
          probeBuild,
          calibrationSolvedIds,
          launchCompleted: true,
          landed: true,
          collectedReadings,
          transmittedPackets: 5,
          timerExpired: false,
        }).then((res) => setRewardResult(res));
      }
    }, packetIntervalMs);

    return () => window.clearTimeout(t);
  }, [
    calibrationSolvedIds,
    collectedReadings,
    linkInterrupted,
    missionSuccess,
    onCompleteMission,
    persistSnapshot,
    probeBuild,
    probeMetrics.isAntennaWeak,
    stage,
    timerExpired,
    transmittedPackets,
    transmitting,
    visible,
  ]);

  if (!visible) return null;

  const handleStartMission = () => {
    SFX.taskComplete();
    const now = Date.now();
    const deadline = now + EUROPA_MISSION_DURATION_SEC * 1000;
    setMissionStartedAtMs(now);
    setMissionDeadlineMs(deadline);
    setRemainingSec(EUROPA_MISSION_DURATION_SEC);
    setTimerExpired(false);
    warningsFiredRef.current = { m5: false, m2: false, s30: false };
    setStage(1);
    persistSnapshot({
      stage: 1,
      missionStartedAtMs: now,
      missionDeadlineMs: deadline,
      timerExpired: false,
    });
  };

  const handleRetryMission = () => {
    SFX.click();
    onReplayReset();
    setStage(0);
    setProbeBuild({ ...DEFAULT_PROBE_BUILD });
    setCalibrationSolvedIds([]);
    setActiveCalIdx(0);
    setCalOffsetInput(0);
    setCalWrongAttempts({});
    setCalFeedback({ status: 'idle', text: '' });
    setRocketParts([]);
    setRocketStage(1);
    setLaunchCompleted(false);
    setLandingSolved({ speed: false, tilt: false, thermal: false });
    setLanded(false);
    setLandingAltM(840);
    setTouchdownAnimating(false);
    setLandingFeedback(null);
    setCollectedReadings([]);
    setProbingLoc(null);
    setProbeTravelPhase('idle');
    setTransmittedPackets(0);
    setTransmitting(false);
    setLinkInterrupted(false);
    setMissionSuccess(false);
    setRewardResult(null);
    setMissionStartedAtMs(null);
    setMissionDeadlineMs(null);
    setRemainingSec(EUROPA_MISSION_DURATION_SEC);
    setTimerExpired(false);
    warningsFiredRef.current = { m5: false, m2: false, s30: false };
  };

  const handleSelectComponent = (category: ProbeCategoryId, optionId: string) => {
    if (launchCompleted) {
      SFX.snapWrong();
      return;
    }
    SFX.select();
    const nextBuild = { ...probeBuild, [category]: optionId };
    setProbeBuild(nextBuild);
    const nextEval = evaluateProbeBuild(nextBuild);
    if (nextEval.isOverWeight) {
      SFX.massWarningBeep();
    }
    persistSnapshot({ probeBuild: nextBuild });
  };

  const activeExp = CALIBRATION_EXPERIMENTS[activeCalIdx] || CALIBRATION_EXPERIMENTS[0];
  const correctedReading = activeExp.rawSensorTempC + calOffsetInput;
  const calDiff = correctedReading - activeExp.referenceTempC;
  const isCurrentExpSolved = calibrationSolvedIds.includes(activeExp.id);

  const handleCheckCalibration = () => {
    if (calDiff === 0) {
      SFX.snapCorrect();
      const updated = Array.from(new Set([...calibrationSolvedIds, activeExp.id]));
      setCalibrationSolvedIds(updated);
      setCalFeedback({
        status: 'correct',
        text: `${activeExp.label} calibrated! Sensor matches Reference (${activeExp.referenceTempC}°C).`,
      });
      persistSnapshot({ calibrationSolvedIds: updated });

      if (updated.length < CALIBRATION_EXPERIMENTS.length) {
        const nextUnsolved = CALIBRATION_EXPERIMENTS.findIndex((e) => !updated.includes(e.id));
        if (nextUnsolved >= 0) {
          window.setTimeout(() => {
            setActiveCalIdx(nextUnsolved);
            setCalOffsetInput(0);
            setCalFeedback({ status: 'idle', text: '' });
          }, 950);
        }
      }
    } else {
      SFX.snapWrong();
      const count = (calWrongAttempts[activeExp.id] || 0) + 1;
      setCalWrongAttempts((prev) => ({ ...prev, [activeExp.id]: count }));
      let msg = `Mismatch: Corrected sensor differs by ${calDiff > 0 ? `+${calDiff}` : calDiff}°C.`;
      if (count >= 2) {
        msg +=
          calDiff < 0
            ? ' Hint: Sensor reads too cold — slide offset higher.'
            : ' Hint: Sensor reads too warm — slide offset lower.';
      }
      setCalFeedback({ status: 'wrong', text: msg });
    }
  };

  // Landing Challenge calculations
  const landingResultSpeed = Math.max(0, Math.round(185 - retroThrustPct * 2.15));
  const netLandingTilt = Math.round(26 + rcsTrimDeg);
  const heaterDrawPct = Math.round(heaterDutyPct * (probeBuild.heater === 'heat_coil' ? 0.95 : 0.72));
  const remainingBatteryAtLanding = Math.max(
    0,
    Math.round(probeMetrics.batteryCapacityPct - heaterDrawPct * 0.45)
  );
  const internalElectronicsTempC = Math.round(
    -115 + heaterDutyPct * 1.45 + (probeMetrics.thermalShieldPct - 50) * 0.45
  );

  const handleTestSpeed = () => {
    if (landingResultSpeed >= 8 && landingResultSpeed <= 25) {
      SFX.snapCorrect();
      const next = { ...landingSolved, speed: true };
      setLandingSolved(next);
      setLandingFeedback({
        type: 'success',
        text: `Descent velocity stabilized at ${landingResultSpeed} m/s! Safe for Europa ice.`,
      });
      persistSnapshot({ landingSolved: next });
    } else if (landingResultSpeed > 25) {
      SFX.snapWrong();
      setLandingFeedback({
        type: 'error',
        text: `Too fast (${landingResultSpeed} m/s)! Increase retro-thrust to slow down safely.`,
      });
    } else {
      SFX.snapWrong();
      setLandingFeedback({
        type: 'error',
        text: `Over-braking (${landingResultSpeed} m/s)! Probe is stalling — ease off retro-thrust.`,
      });
    }
  };

  const handleTestAttitude = () => {
    if (!legsDeployed) {
      SFX.snapWrong();
      setLandingFeedback({
        type: 'error',
        text: 'Landing legs are retracted! Deploy landing legs before touchdown.',
      });
      return;
    }
    if (Math.abs(netLandingTilt) <= 4) {
      SFX.snapCorrect();
      const next = { ...landingSolved, tilt: true };
      setLandingSolved(next);
      setLandingFeedback({
        type: 'success',
        text: `Attitude balanced (${netLandingTilt}°) with landing legs locked!`,
      });
      persistSnapshot({ landingSolved: next });
    } else {
      SFX.snapWrong();
      setLandingFeedback({
        type: 'error',
        text: `Probe tilted (${netLandingTilt}°)! Adjust RCS attitude trim near 0°.`,
      });
    }
  };

  const handleTestThermal = () => {
    if (remainingBatteryAtLanding < 20) {
      SFX.tempWarningBeep();
      setLandingFeedback({
        type: 'error',
        text: `Battery overloaded (${remainingBatteryAtLanding}% left)! Lower heater duty slightly.`,
      });
      return;
    }
    if (internalElectronicsTempC >= -25 && internalElectronicsTempC <= 18) {
      SFX.heaterActivate();
      const next = { ...landingSolved, thermal: true };
      setLandingSolved(next);
      setLandingFeedback({
        type: 'success',
        text: `Electronics steady at ${internalElectronicsTempC}°C (${remainingBatteryAtLanding}% battery)!`,
      });
      persistSnapshot({ landingSolved: next });
    } else if (internalElectronicsTempC < -25) {
      SFX.tempWarningBeep();
      setLandingFeedback({
        type: 'error',
        text: `Cryo freeze warning (${internalElectronicsTempC}°C)! Increase heater output.`,
      });
    } else {
      SFX.snapWrong();
      setLandingFeedback({
        type: 'error',
        text: `Thermal overheat (${internalElectronicsTempC}°C)! Reduce heater duty.`,
      });
    }
  };

  const handleExecuteTouchdown = () => {
    if (touchdownAnimating || landed) return;
    SFX.playIgnitionBurst();
    setTouchdownAnimating(true);
    setLandingAltM(840);
    window.setTimeout(() => setLandingAltM(420), 450);
    window.setTimeout(() => setLandingAltM(110), 950);
    window.setTimeout(() => setLandingAltM(18), 1450);
    window.setTimeout(() => {
      SFX.taskComplete();
      setLandingAltM(0);
      setTouchdownAnimating(false);
      setLanded(true);
      setLandingFeedback({
        type: 'success',
        text: 'Touchdown confirmed on Europa! Click "Explore Europa in 3D ▶" to deploy the rover and collect 5 readings.',
      });
      persistSnapshot({ landed: true });
    }, 2100);
  };

  // Exploration location probe action (driven in 3D Explorer)
  const handleSelectEuropaSite = (loc: EuropaLocationSpec) => {
    if (probeTravelPhase === 'moving' || probeTravelPhase === 'drilling') return;
    SFX.select();
    setProbingLoc(loc);
    setProbeTravelPhase('drilling');
    setSensorStabilizedHere(false);
    setProbePos({ x: loc.mapX, y: loc.mapY });

    window.setTimeout(() => {
      const rawDrift = probeMetrics.isSensorInaccurate
        ? (Math.random() > 0.5 ? 1 : -1) * (5 + Math.floor(Math.random() * 5))
        : 0;
      setActiveDriftC(rawDrift);
      setActiveMeasuredTempC(loc.trueTempC + rawDrift);
      setProbeTravelPhase('measured');
      if (rawDrift === 0) SFX.snapCorrect();
      else SFX.tempWarningBeep();
    }, 650);
  };

  const handleStabilizeFieldSensor = () => {
    if (!probingLoc) return;
    SFX.snapCorrect();
    setActiveDriftC(0);
    setActiveMeasuredTempC(probingLoc.trueTempC);
    setSensorStabilizedHere(true);
  };

  const handleSaveEuropaReading = () => {
    if (!probingLoc || activeMeasuredTempC === null) return;
    SFX.taskComplete();
    const reading: SavedEuropaReading = {
      locationId: probingLoc.id,
      locationName: probingLoc.name,
      measuredTempC: activeMeasuredTempC,
      accurate: Math.abs(activeDriftC) <= 2,
      driftC: activeDriftC,
      savedAtIso: new Date().toISOString(),
    };
    const nextList = [
      ...collectedReadings.filter((r) => r.locationId !== probingLoc.id),
      reading,
    ];
    setCollectedReadings(nextList);
    setProbeTravelPhase('idle');
    persistSnapshot({ collectedReadings: nextList });
  };

  const isTimerCritical = remainingSec <= 30;
  const isTimerUrgent = remainingSec <= 120 && remainingSec > 30;
  const isTimerWarn = remainingSec <= 300 && remainingSec > 120;

  return (
    <div className="fixed inset-0 z-[5200] bg-[#020816] text-slate-100 flex flex-col overflow-hidden">
      {/* TOP TELEMETRY COMMAND BAR */}
      <header className="shrink-0 bg-[#061229]/95 border-b border-sky-400/25 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/45 flex items-center justify-center text-base shrink-0">
            🌡️
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono-tech tracking-widest uppercase text-sky-300 font-bold">
              LEVEL 06 • EUROPA DISCOVERY
            </div>
            <h1 className="font-display text-xs sm:text-sm font-extrabold text-white truncate">
              THERMOMETER TELEMETRY PROBE
            </h1>
          </div>
        </div>

        {/* Stage Stepper */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#030b1b] border border-white/10 rounded-xl p-1">
          {STAGE_TABS.map((tab) => {
            const active = stage === tab.id;
            const passed = stage > tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.id > stage && !(tab.id === 1 && missionDeadlineMs !== null)}
                onClick={() => {
                  if (tab.id <= stage && tab.id !== 3) {
                    SFX.click();
                    setStage(tab.id);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-tech font-bold whitespace-nowrap transition ${
                  active
                    ? 'bg-sky-400 text-[#031024]'
                    : passed
                    ? 'text-emerald-300 hover:bg-white/5 cursor-pointer'
                    : 'text-slate-500 cursor-default'
                }`}
              >
                {passed ? '✓ ' : ''}
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Voice Brief + 12-Min Countdown + Audio + Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <DirectorVanceVoiceBanner
            compact
            quote="Build a probe, land on Europa, discover its hidden temperatures, and send your findings to Earth!"
          />
          <div
            className={`px-3 py-1.5 rounded-xl border font-mono-tech text-xs sm:text-sm font-black tabular-nums flex items-center gap-1.5 ${
              missionDeadlineMs === null
                ? 'bg-[#081733] border-cyan-400/35 text-cyan-200'
                : isTimerCritical
                ? 'bg-red-950/90 border-red-400 text-red-200 animate-pulse'
                : isTimerUrgent
                ? 'bg-orange-950/85 border-orange-400 text-orange-200'
                : isTimerWarn
                ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                : 'bg-[#081733] border-emerald-400/45 text-emerald-200'
            }`}
          >
            <span>⏱</span>
            <span>{formatCountdownClock(remainingSec)}</span>
          </div>

          <button
            type="button"
            onClick={() => setMuted(SFX.toggleMute())}
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="w-9 h-9 rounded-xl bg-[#081733] border border-white/15 hover:border-sky-400/50 flex items-center justify-center text-sm cursor-pointer"
          >
            {muted ? '🔇' : '🔊'}
          </button>

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              className="px-3 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-xs font-bold text-amber-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              📖 Handbook
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              SFX.click();
              onExit();
            }}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer whitespace-nowrap"
          >
            Exit ✕
          </button>
        </div>
      </header>

      {/* Timer Warning Toast */}
      {timerWarningBanner && !timerExpired && (
        <div className="bg-amber-500/20 border-b border-amber-400/50 px-4 py-1.5 text-center text-xs font-mono-tech font-bold text-amber-200">
          ⚠ {timerWarningBanner}
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <main
        className={
          stage === 3
            ? 'flex-1 min-h-0 overflow-hidden relative flex flex-col'
            : 'flex-1 min-h-0 overflow-y-auto relative'
        }
      >
        {/* ============================================================
            STAGE 0: MISSION INTRODUCTION (EUROPA + DIRECTOR VANCE)
           ============================================================ */}
        {stage === 0 && (
          <div className="min-h-full relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            {/* Animated Deep-Space Europa Backdrop */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-orange-600/15 blur-3xl animate-pulse" />
              <div className="absolute -bottom-24 -right-24 w-[440px] h-[440px] rounded-full bg-sky-500/20 blur-3xl animate-pulse" />
              {/* Jupiter & Europa Animated Scene */}
              <svg
                viewBox="0 0 1000 500"
                className="w-full h-full object-cover opacity-55"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <radialGradient id="introEuropaGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#f0f9ff" />
                    <stop offset="55%" stopColor="#7dd3fc" />
                    <stop offset="100%" stopColor="#0f2d5e" />
                  </radialGradient>
                  <radialGradient id="introJupGrad" cx="40%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="55%" stopColor="#c2410c" />
                    <stop offset="100%" stopColor="#431407" />
                  </radialGradient>
                </defs>
                {/* Stars */}
                {Array.from({ length: 42 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={(i * 97) % 980}
                    cy={(i * 53) % 480}
                    r={(i % 3) * 0.6 + 0.8}
                    fill="#e0f2fe"
                    opacity={0.4 + (i % 4) * 0.15}
                  />
                ))}
                {/* Jupiter in distance */}
                <circle cx="170" cy="145" r="78" fill="url(#introJupGrad)" opacity="0.85" />
                <path d="M98 130 Q170 116 242 130" stroke="#fef3c7" strokeWidth="5" opacity="0.35" fill="none" />
                <path d="M100 156 Q170 170 240 156" stroke="#7c2d12" strokeWidth="6" opacity="0.4" fill="none" />
                {/* Europa Orb */}
                <circle cx="810" cy="310" r="145" fill="url(#introEuropaGrad)" stroke="#38bdf8" strokeWidth="2.5" />
                <path d="M685 265 Q805 235 935 280" stroke="#0369a1" strokeWidth="3" opacity="0.55" fill="none" />
                <path d="M675 335 Q815 370 942 325" stroke="#0284c7" strokeWidth="3.5" opacity="0.5" fill="none" />
                <path d="M760 175 Q825 305 785 445" stroke="#0c4a6e" strokeWidth="2.5" opacity="0.45" fill="none" />
              </svg>
            </div>

            {/* Foreground Briefing Card */}
            <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-[#07142c]/92 border border-sky-400/45 p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.88)] backdrop-blur-md">
              <DirectorVanceVoiceBanner
                speaker="DIRECTOR VANCE // EUROPA COMMAND"
                quote="Build a probe. Land on Europa. Discover its hidden temperatures. Send your findings to Earth!"
                autoPlayKey={visible && stage === 0 ? 'lvl6-europa-brief' : null}
              />

              {/* Compact Visual Icon Strip */}
              <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                {[
                  { icon: '🔧', label: 'Build Probe' },
                  { icon: '🌡️', label: 'Calibrate' },
                  { icon: '🚀', label: 'Launch' },
                  { icon: '🛬', label: 'Land' },
                  { icon: '🧭', label: '5 Scans' },
                  { icon: '📡', label: 'Transmit' },
                ].map((step) => (
                  <div
                    key={step.label}
                    className="p-2.5 rounded-xl bg-[#0b1c3d] border border-sky-400/25 flex flex-col items-center gap-1"
                  >
                    <span className="text-xl">{step.icon}</span>
                    <span className="text-[10px] font-bold text-slate-200 whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Constraints & Start Button */}
              <div className="mt-5 grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#040e21] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase font-mono-tech">Clock</div>
                  <div className="font-mono-tech font-extrabold text-amber-300 mt-0.5">12:00 MIN</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040e21] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase font-mono-tech">Build Limit</div>
                  <div className="font-mono-tech font-extrabold text-sky-300 mt-0.5">850 SC • 120 KG</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040e21] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase font-mono-tech">Reward</div>
                  <div className="font-mono-tech font-extrabold text-emerald-300 mt-0.5">★ 1,500 + 150 XP</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartMission}
                className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-[#38bdf8] via-[#4fe3d4] to-[#34d399] text-[#031024] font-display font-black text-sm sm:text-base tracking-wider uppercase shadow-[0_0_30px_rgba(79,227,212,0.45)] hover:brightness-110 transition cursor-pointer"
              >
                START MISSION ▶
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 1: INTERACTIVE PROBE BUILDING (DISCOVERY)
           ============================================================ */}
        {stage === 1 && (
          <div className="p-4 sm:p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Category Tabs & Selectable Component Cards */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {PROBE_CATEGORY_META.map((cat) => {
                  const selected = activeBuildCat === cat.id;
                  const chosen = findProbeOption(cat.id, probeBuild[cat.id]);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        SFX.click();
                        setActiveBuildCat(cat.id);
                      }}
                      className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer ${
                        selected
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.28)]'
                          : 'bg-[#08142b] border-white/10 hover:border-sky-400/40 text-slate-300'
                      }`}
                    >
                      <div className="text-[10px] font-mono-tech uppercase text-sky-300 font-bold">
                        {cat.label}
                      </div>
                      <div className="text-xs font-bold truncate max-w-[115px]">{chosen.shortName}</div>
                    </button>
                  );
                })}
              </div>

              {launchCompleted && (
                <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-400/45 text-xs text-sky-200 flex items-center justify-between gap-2">
                  <span>🚀 Probe already launched to Europa — hardware locked in transit.</span>
                  <button
                    type="button"
                    onClick={handleRetryMission}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    Replay ↺
                  </button>
                </div>
              )}

              {/* Neutral Selectable Component Cards (Zero Optimal Highlights!) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PROBE_COMPONENTS[activeBuildCat].map((opt) => {
                  const isChosen = probeBuild[activeBuildCat] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={launchCompleted}
                      onClick={() => handleSelectComponent(activeBuildCat, opt.id)}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition ${
                        launchCompleted ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isChosen
                          ? 'bg-[#0c2144] border-sky-400 ring-1 ring-sky-400/50'
                          : 'bg-[#071228] border-white/12 hover:border-sky-400/45'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <ComponentOptionVisualSVG optionId={opt.id} />
                          <span className="text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded bg-white/5 text-slate-200">
                            {isChosen ? 'INSTALLED' : 'SELECT'}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white">{opt.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{opt.summary}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5 text-xs font-mono-tech">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Weight</span>
                          <strong className="text-white tabular-nums">{opt.weightKg} kg</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Cost</span>
                          <strong className="text-amber-300 tabular-nums">★ {opt.costSc} SC</strong>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-400">{opt.metricLabel}</span>
                            <span className="text-sky-300 tabular-nums">{opt.metricValue}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className="h-full bg-sky-400 transition-all duration-300"
                              style={{ width: `${opt.metricValue}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Animated Probe & Telemetry Gauges */}
            <div className="lg:col-span-5 rounded-2xl bg-[#07132a] border border-sky-400/35 p-4 sm:p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-tech uppercase tracking-widest text-sky-300 font-bold">
                    LIVE PROBE TELEMETRY LAB
                  </span>
                  <span className="text-[10px] font-mono-tech text-slate-400">
                    TEST &amp; EXPERIMENT
                  </span>
                </div>

                <LiveProbeAssemblySVG
                  build={probeBuild}
                  metrics={probeMetrics}
                  pulseTick={pulseTick}
                />

                {/* Weight & Budget Bars */}
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      probeMetrics.isOverWeight
                        ? 'bg-red-950/60 border-red-400'
                        : 'bg-[#040c1d] border-white/10'
                    }`}
                  >
                    <div className="flex justify-between text-[10px] font-mono-tech">
                      <span className="text-slate-400">WEIGHT</span>
                      <span className={probeMetrics.isOverWeight ? 'text-red-300 font-bold' : 'text-emerald-300'}>
                        MAX {EUROPA_MAX_WEIGHT_KG} kg
                      </span>
                    </div>
                    <div
                      className={`text-lg font-mono-tech font-black tabular-nums ${
                        probeMetrics.isOverWeight ? 'text-red-300' : 'text-white'
                      }`}
                    >
                      {probeMetrics.totalWeightKg} kg
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 mt-1 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          probeMetrics.isOverWeight ? 'bg-red-500' : 'bg-emerald-400'
                        }`}
                        style={{
                          width: `${Math.min(100, (probeMetrics.totalWeightKg / EUROPA_MAX_WEIGHT_KG) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border ${
                      probeMetrics.isOverBudget
                        ? 'bg-red-950/60 border-red-400'
                        : 'bg-[#040c1d] border-white/10'
                    }`}
                  >
                    <div className="flex justify-between text-[10px] font-mono-tech">
                      <span className="text-slate-400">BUDGET LEFT</span>
                      <span className={probeMetrics.isOverBudget ? 'text-red-300 font-bold' : 'text-amber-300'}>
                        {EUROPA_MAX_BUDGET_SC} SC
                      </span>
                    </div>
                    <div
                      className={`text-lg font-mono-tech font-black tabular-nums ${
                        probeMetrics.isOverBudget ? 'text-red-300' : 'text-amber-300'
                      }`}
                    >
                      {probeMetrics.remainingBudgetSc} SC
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 mt-1 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          probeMetrics.isOverBudget ? 'bg-red-500' : 'bg-amber-400'
                        }`}
                        style={{
                          width: `${Math.min(100, (probeMetrics.totalCostSc / EUROPA_MAX_BUDGET_SC) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Subsystem Gauges with Animated Consequences */}
                <div className="mt-3 space-y-2 text-xs">
                  {[
                    {
                      label: 'Battery Capacity',
                      val: probeMetrics.batteryCapacityPct,
                      warn: probeMetrics.isBatteryWeak,
                      warnText: '⚠ DRAINING FAST',
                    },
                    {
                      label: 'Heating Capability',
                      val: probeMetrics.heatingCapabilityPct,
                      warn: probeMetrics.isHeatingWeak,
                      warnText: '❄ CRYO RISK',
                    },
                    {
                      label: 'Sensor Accuracy',
                      val: probeMetrics.sensorAccuracyPct,
                      warn: probeMetrics.isSensorInaccurate,
                      warnText: `〰 UNSTABLE (${pulseTick % 2 === 0 ? '-179°C' : '-163°C'})`,
                    },
                    {
                      label: 'Comms Signal',
                      val: probeMetrics.commsStrengthPct,
                      warn: probeMetrics.isAntennaWeak,
                      warnText: '⚡ BROKEN LINK',
                    },
                  ].map((g) => (
                    <div key={g.label} className="p-2 rounded-xl bg-[#040c1d] border border-white/10">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-semibold">{g.label}</span>
                        <span
                          className={`font-mono-tech font-bold tabular-nums ${
                            g.warn ? 'text-rose-300 animate-pulse' : 'text-emerald-300'
                          }`}
                        >
                          {g.warn ? g.warnText : `${g.val}% NOMINAL`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            g.warn ? 'bg-rose-400' : 'bg-[#4fe3d4]'
                          }`}
                          style={{ width: `${g.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch Readiness & Advance CTA */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                {!probeMetrics.canLaunch ? (
                  <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-400/50 text-xs text-red-200 space-y-0.5">
                    {probeMetrics.blockingReasons.map((r) => (
                      <div key={r}>✕ {r}</div>
                    ))}
                  </div>
                ) : (probeMetrics.isSensorInaccurate || probeMetrics.isAntennaWeak) && (
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-400/45 text-[11px] text-amber-200">
                    ⚠ Caution: Low-grade sensor/antenna will cause interference on Europa (you can still test &amp; manage it in field).
                  </div>
                )}

                <button
                  type="button"
                  disabled={!probeMetrics.canLaunch}
                  onClick={() => {
                    SFX.taskComplete();
                    setStage(2);
                    persistSnapshot({ stage: 2 });
                  }}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wide transition ${
                    probeMetrics.canLaunch
                      ? 'bg-gradient-to-r from-[#38bdf8] to-[#34d399] text-[#031024] hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  PROCEED TO SENSOR CALIBRATION ▶
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 2: INTERACTIVE SENSOR CALIBRATION (3 EXPERIMENTS)
           ============================================================ */}
        {stage === 2 && (
          <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
            {/* Experiment Selector Tabs */}
            <div className="grid grid-cols-3 gap-2.5">
              {CALIBRATION_EXPERIMENTS.map((exp, idx) => {
                const solved = calibrationSolvedIds.includes(exp.id);
                const active = idx === activeCalIdx;
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => {
                      SFX.click();
                      setActiveCalIdx(idx);
                      setCalOffsetInput(solved ? exp.correctOffsetC : 0);
                      setCalFeedback({ status: 'idle', text: '' });
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border-sky-400'
                        : solved
                        ? 'bg-emerald-950/40 border-emerald-400/50'
                        : 'bg-[#07142b] border-white/12 hover:border-sky-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono-tech font-bold">
                      <span className={solved ? 'text-emerald-300' : 'text-sky-300'}>
                        {exp.label.toUpperCase()}
                      </span>
                      <span>{solved ? '✓ PASS' : 'PENDING'}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5 truncate">
                      {exp.environmentTag}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hands-On Dual Thermometer Experiment Bench */}
            <div className="rounded-3xl bg-[#07142b] border border-sky-400/35 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 grid grid-cols-2 gap-3">
                <ThermometerColumn
                  title="Reference"
                  tempC={activeExp.referenceTempC}
                  accentColor="#38bdf8"
                  matched={calDiff === 0}
                />
                <ThermometerColumn
                  title="Corrected Sensor"
                  tempC={correctedReading}
                  accentColor={calDiff === 0 ? '#34d399' : '#fbbf24'}
                  vibrate={calFeedback.status === 'wrong'}
                  matched={calDiff === 0}
                />
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="grid grid-cols-3 gap-2.5 text-center font-mono-tech">
                  <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase">Reference</div>
                    <div className="text-base font-black text-sky-300 tabular-nums">
                      {activeExp.referenceTempC}°C
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase">Raw Sensor</div>
                    <div className="text-base font-black text-amber-300 tabular-nums">
                      {activeExp.rawSensorTempC}°C
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10">
                    <div className="text-[10px] text-slate-400 uppercase">Difference</div>
                    <div
                      className={`text-base font-black tabular-nums ${
                        calDiff === 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {calDiff > 0 ? `+${calDiff}` : calDiff}°C
                    </div>
                  </div>
                </div>

                {/* Offset Discovery Slider & Numeric Controls */}
                <div className="p-4 rounded-2xl bg-[#040d1e] border border-sky-400/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Sensor Offset (°C)</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          SFX.sliderTick();
                          setCalOffsetInput((v) => Math.max(-30, v - 1));
                          setCalFeedback({ status: 'idle', text: '' });
                        }}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-white cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={-30}
                        max={30}
                        value={calOffsetInput}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const clamped = Number.isFinite(raw) ? Math.max(-30, Math.min(30, Math.round(raw))) : 0;
                          setCalOffsetInput(clamped);
                          setCalFeedback({ status: 'idle', text: '' });
                        }}
                        className="w-16 text-center py-1 rounded-lg bg-[#081733] border border-sky-400/40 font-mono-tech font-bold text-white tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          SFX.sliderTick();
                          setCalOffsetInput((v) => Math.min(30, v + 1));
                          setCalFeedback({ status: 'idle', text: '' });
                        }}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={calOffsetInput}
                    onChange={(e) => {
                      SFX.sliderTick();
                      setCalOffsetInput(Number(e.target.value));
                      setCalFeedback({ status: 'idle', text: '' });
                    }}
                    className="w-full accent-[#4fe3d4] cursor-pointer"
                  />
                </div>

                {calFeedback.status !== 'idle' && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold ${
                      calFeedback.status === 'correct'
                        ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                        : 'bg-rose-950/70 border-rose-400 text-rose-200 animate-[shake_0.35s_ease-in-out]'
                    }`}
                  >
                    {calFeedback.status === 'correct' ? '✓ ' : '✕ '}
                    {calFeedback.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCheckCalibration}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] text-[#031024] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer"
                  >
                    {isCurrentExpSolved ? 'RE-VERIFY OFFSET ✓' : 'APPLY & TEST OFFSET'}
                  </button>

                  {calibrationSolvedIds.length >= CALIBRATION_EXPERIMENTS.length && (
                    <button
                      type="button"
                      onClick={() => {
                        SFX.taskComplete();
                        setStage(3);
                        persistSnapshot({ stage: 3 });
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#34d399] to-[#4fe3d4] text-[#031024] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer"
                    >
                      ASSEMBLE ROCKET ▶
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 3: ROCKET ASSEMBLY & ANIMATED LAUNCH (REUSED 3D SYSTEM)
           ============================================================ */}
        {stage === 3 && (
          <div className="flex-1 min-h-[480px] w-full flex flex-col overflow-hidden">
            {rocketStage === 1 ? (
              <RocketAssemblyStage
                initialInstalledParts={rocketParts}
                customCompletionCta="STAGE ON LAUNCHPAD 39X ▶"
                customNextStageLabel="Launchpad 39X Ready"
                onProgressChange={(parts: RocketPartId[]) => {
                  setRocketParts(parts);
                  persistSnapshot({ rocketParts: parts });
                }}
                onCompleteStage2={(parts: RocketPartId[]) => {
                  setRocketParts(parts);
                  setRocketStage(2);
                  persistSnapshot({ rocketParts: parts, rocketStage: 2 });
                }}
              />
            ) : (
              <LaunchpadPayloadStage
                mode={rocketStage === 2 ? 'stage3' : rocketStage === 3 ? 'stage4' : 'stage5'}
                starCredits={starCredits}
                alreadyCompleted={alreadyCompleted}
                hideCompletionCelebration
                enableStageSeparation
                customPayloadConfig={{
                  title: 'Europa Thermometer Probe',
                  subtitle: 'Drag your calibrated Europa probe onto the payload adapter.',
                  dropLabel: 'DRAG PROBE INTO FAIRING →',
                  integratedText: 'EUROPA PROBE LOCKED IN FAIRING!',
                  launchButtonLabel: '🚀 LAUNCH EUROPA PROBE',
                }}
                onCompleteStage3={() => {
                  setRocketStage(3);
                  persistSnapshot({ rocketStage: 3 });
                }}
                onCompleteStage4={() => {
                  setRocketStage(4);
                  persistSnapshot({ rocketStage: 4 });
                }}
                onLaunchStatusChange={() => {}}
                onCompleteAllStages={async () => {
                  setLaunchCompleted(true);
                  persistSnapshot({ launchCompleted: true });
                  return {
                    alreadyRewarded: true,
                    rewardAwarded: 0,
                    newStarBalance: starCredits,
                  };
                }}
                onFlightFinished={() => {
                  setLaunchCompleted(true);
                  setStage(4);
                  persistSnapshot({ launchCompleted: true, stage: 4 });
                }}
                onContinueToNextLevel={() => {}}
                onReplayLevel={() => {}}
                onBackToAcademy={() => {}}
              />
            )}
          </div>
        )}

        {/* ============================================================
            STAGE 4: INTERACTIVE EUROPA LANDING CHALLENGE
           ============================================================ */}
        {stage === 4 && (
          <div className="p-4 sm:p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Animated Europa Descent Visual */}
            <div className="lg:col-span-6 rounded-3xl bg-[#040c1e] border border-sky-400/35 p-4 flex flex-col justify-between relative overflow-hidden min-h-[370px]">
              <div className="flex items-center justify-between z-10 text-xs font-mono-tech">
                <span className="text-sky-300 font-bold">EUROPA TERMINAL DESCENT</span>
                <span
                  className={`font-bold tabular-nums ${
                    landed ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  ALT: {landingAltM} m
                </span>
              </div>

              <svg viewBox="0 0 400 280" className="w-full h-64 my-2">
                <defs>
                  <linearGradient id="euHorizon" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                  <radialGradient id="euJup" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="55%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>
                </defs>

                {/* Stars & Distant Jupiter */}
                {[
                  [34, 34, 1.3], [92, 58, 1.1], [150, 26, 1.5], [248, 38, 1.2], [360, 74, 1.4], [62, 118, 1.1],
                ].map(([sx, sy, sr], idx) => (
                  <circle key={idx} cx={sx} cy={sy} r={sr} fill="#e0f2fe" opacity="0.75" />
                ))}
                <g transform="translate(328, 48)">
                  <circle cx="0" cy="0" r="24" fill="url(#euJup)" opacity="0.88" />
                  <path d="M-22 -5 Q0 -10 22 -4" stroke="#fef3c7" strokeWidth="2.4" fill="none" opacity="0.55" />
                  <path d="M-21 7 Q0 3 21 8" stroke="#92400e" strokeWidth="2.4" fill="none" opacity="0.6" />
                </g>

                {/* Europa Icy Horizon */}
                <path
                  d="M0 230 Q100 214 200 225 Q300 238 400 220 L400 280 L0 280 Z"
                  fill="url(#euHorizon)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <path d="M40 248 Q180 232 340 254" stroke="#0369a1" strokeWidth="2" fill="none" />

                {/* Target Touchdown Ice Pad Ring */}
                <ellipse
                  cx="200"
                  cy="226"
                  rx="48"
                  ry="9"
                  fill={landed ? 'rgba(52,211,153,0.22)' : 'rgba(56,189,248,0.16)'}
                  stroke={landed ? '#34d399' : '#4fe3d4'}
                  strokeWidth="1.8"
                  strokeDasharray="6 4"
                />

                {/* Ice Crystal Dust Burst upon Touchdown */}
                {landed && (
                  <g>
                    <motion.ellipse
                      cx="158"
                      cy="226"
                      rx="18"
                      ry="5"
                      fill="#bae6fd"
                      initial={{ opacity: 0.9, scale: 0.4 }}
                      animate={{ opacity: [0.85, 0.25, 0.65], scale: [0.5, 1.35, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                    <motion.ellipse
                      cx="242"
                      cy="226"
                      rx="18"
                      ry="5"
                      fill="#bae6fd"
                      initial={{ opacity: 0.9, scale: 0.4 }}
                      animate={{ opacity: [0.85, 0.25, 0.65], scale: [0.5, 1.35, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  </g>
                )}

                {/* Animated Descending Probe */}
                <motion.g
                  animate={{
                    y: landed ? 190 : touchdownAnimating ? 186 : 64,
                    rotate: landingSolved.tilt || landed ? 0 : netLandingTilt * 0.65,
                  }}
                  transition={{ duration: touchdownAnimating ? 1.9 : 0.45, ease: 'easeInOut' }}
                >
                  <g transform="translate(200, 0)">
                    {/* Retro Exhaust Plume */}
                    {(retroThrustPct > 40 || touchdownAnimating) && !landed && (
                      <motion.polygon
                        points="-12,26 12,26 0,62"
                        fill="#38bdf8"
                        animate={{ opacity: [0.45, 0.98, 0.5], scaleY: [0.85, 1.25, 0.9] }}
                        transition={{ duration: 0.22, repeat: Infinity }}
                      />
                    )}
                    {/* Body */}
                    <rect
                      x="-24"
                      y="-18"
                      width="48"
                      height="36"
                      rx="6"
                      fill="#0b1f3f"
                      stroke={landingSolved.thermal ? '#34d399' : '#fbbf24'}
                      strokeWidth="2.5"
                    />
                    {/* Frost Overlay if Too Cold */}
                    {internalElectronicsTempC < -25 && (
                      <rect
                        x="-24"
                        y="-18"
                        width="48"
                        height="36"
                        rx="6"
                        fill="#bae6fd"
                        fillOpacity="0.35"
                      />
                    )}
                    {/* Dish */}
                    <path d="M-14 -24 Q0 -16 14 -24" stroke="#4fe3d4" strokeWidth="2.4" fill="none" />
                    {/* Deployed Landing Legs + Pads */}
                    {(legsDeployed || landed) && (
                      <>
                        <line x1="-20" y1="18" x2="-34" y2="36" stroke="#34d399" strokeWidth="3" />
                        <line x1="20" y1="18" x2="34" y2="36" stroke="#34d399" strokeWidth="3" />
                        <ellipse cx="-34" cy="36" rx="6" ry="2.5" fill="#4fe3d4" />
                        <ellipse cx="34" cy="36" rx="6" ry="2.5" fill="#4fe3d4" />
                      </>
                    )}
                  </g>
                </motion.g>
              </svg>

              {landingFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold z-10 ${
                    landingFeedback.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-400 text-rose-200'
                  }`}
                >
                  {landingFeedback.text}
                </div>
              )}
            </div>

            {/* Right: 3 Discovery Control Challenges */}
            <div className="lg:col-span-6 space-y-3.5">
              {/* 1. Speed Problem */}
              <div
                className={`p-4 rounded-2xl border ${
                  landingSolved.speed
                    ? 'bg-emerald-950/25 border-emerald-400/50'
                    : 'bg-[#07142b] border-white/15'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-white">1. Speed Control (185 m/s → Safe Touchdown)</span>
                  <span className="font-mono-tech text-sky-300 tabular-nums">
                    {landingResultSpeed} m/s {landingSolved.speed ? '✓' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={retroThrustPct}
                    onChange={(e) => setRetroThrustPct(Number(e.target.value))}
                    className="flex-1 accent-sky-400 cursor-pointer"
                  />
                  <span className="font-mono-tech text-xs w-12 text-right tabular-nums">
                    {retroThrustPct}%
                  </span>
                  <button
                    type="button"
                    onClick={handleTestSpeed}
                    className="px-3 py-1.5 rounded-lg bg-sky-400 text-[#031024] font-extrabold text-xs cursor-pointer whitespace-nowrap"
                  >
                    TEST SPEED
                  </button>
                </div>
              </div>

              {/* 2. Tilt Problem */}
              <div
                className={`p-4 rounded-2xl border ${
                  landingSolved.tilt
                    ? 'bg-emerald-950/25 border-emerald-400/50'
                    : 'bg-[#07142b] border-white/15'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-white">2. Tilt Stabilizer (+26° Drift)</span>
                  <span className="font-mono-tech text-amber-300 tabular-nums">
                    Tilt: {netLandingTilt}° {landingSolved.tilt ? '✓' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="range"
                    min={-30}
                    max={10}
                    value={rcsTrimDeg}
                    onChange={(e) => setRcsTrimDeg(Number(e.target.value))}
                    className="flex-1 min-w-[140px] accent-amber-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      setLegsDeployed((v) => !v);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                      legsDeployed
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-white/5 border-white/20 text-slate-300'
                    }`}
                  >
                    {legsDeployed ? 'Legs Deployed ✓' : 'Deploy Legs'}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestAttitude}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-[#031024] font-extrabold text-xs cursor-pointer whitespace-nowrap"
                  >
                    TEST TILT
                  </button>
                </div>
              </div>

              {/* 3. Temperature Problem */}
              <div
                className={`p-4 rounded-2xl border ${
                  landingSolved.thermal
                    ? 'bg-emerald-950/25 border-emerald-400/50'
                    : 'bg-[#07142b] border-white/15'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-white">3. Probe Thermal Balance</span>
                  <span className="font-mono-tech text-emerald-300 tabular-nums">
                    {internalElectronicsTempC}°C • Batt {remainingBatteryAtLanding}%{' '}
                    {landingSolved.thermal ? '✓' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={heaterDutyPct}
                    onChange={(e) => setHeaterDutyPct(Number(e.target.value))}
                    className="flex-1 accent-emerald-400 cursor-pointer"
                  />
                  <span className="font-mono-tech text-xs w-12 text-right tabular-nums">
                    {heaterDutyPct}%
                  </span>
                  <button
                    type="button"
                    onClick={handleTestThermal}
                    className="px-3 py-1.5 rounded-lg bg-emerald-400 text-[#031024] font-extrabold text-xs cursor-pointer whitespace-nowrap"
                  >
                    TEST THERMAL
                  </button>
                </div>
              </div>

              {!landed ? (
                <button
                  type="button"
                  disabled={!landingSolved.speed || !landingSolved.tilt || !landingSolved.thermal || touchdownAnimating}
                  onClick={handleExecuteTouchdown}
                  className={`w-full py-3.5 rounded-2xl font-display font-black text-sm uppercase tracking-wider transition ${
                    landingSolved.speed && landingSolved.tilt && landingSolved.thermal
                      ? 'bg-gradient-to-r from-[#34d399] to-[#4fe3d4] text-[#031024] hover:brightness-110 cursor-pointer shadow-[0_0_24px_rgba(52,211,153,0.4)]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {touchdownAnimating ? 'POWERED TOUCHDOWN IN PROGRESS...' : 'LAND ON EUROPA 🛬'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setStage(5);
                    persistSnapshot({ landed: true, stage: 5 });
                  }}
                  className="w-full py-3.5 rounded-2xl font-display font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#4fe3d4] to-[#34d399] text-[#031024] hover:brightness-110 cursor-pointer shadow-[0_0_26px_rgba(79,227,212,0.45)]"
                >
                  Explore Europa in 3D ▶
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 5: EXPLORE EUROPA (COLLECT 5 TEMPERATURE READINGS)
           ============================================================ */}
        {stage === 5 && (
          <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
            {/* Top Counter & Collapsible Readings Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#07142b] border border-sky-400/30 rounded-2xl px-4 py-3">
              <div>
                <span className="text-[10px] font-mono-tech uppercase tracking-widest text-sky-300 font-bold">
                  EUROPA SURFACE THERMOMETRY
                </span>
                <div className="text-sm font-extrabold text-white">
                  Readings Saved:{' '}
                  <span className="font-mono-tech text-emerald-300 tabular-nums">
                    {collectedReadings.length} / 5
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setReadingsPanelOpen((v) => !v)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  {readingsPanelOpen ? 'Hide Saved Log ▲' : `Saved Log (${collectedReadings.length}) ▼`}
                </button>

                {collectedReadings.length >= 5 && (
                  <button
                    type="button"
                    onClick={() => {
                      SFX.taskComplete();
                      setStage(6);
                      persistSnapshot({ stage: 6 });
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#34d399] to-[#4fe3d4] text-[#031024] font-extrabold text-xs uppercase tracking-wide hover:brightness-110 cursor-pointer"
                  >
                    TRANSMIT TO EARTH ▶
                  </button>
                )}
              </div>
            </div>

            {readingsPanelOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {EUROPA_LOCATIONS.map((loc) => {
                  const saved = collectedReadings.find((r) => r.locationId === loc.id);
                  return (
                    <div
                      key={loc.id}
                      className={`p-3 rounded-xl border text-xs ${
                        saved
                          ? 'bg-emerald-950/35 border-emerald-400/50'
                          : 'bg-[#061124] border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="font-bold text-white">{loc.name}</div>
                      <div className="font-mono-tech text-sm font-black mt-1" style={{ color: saved ? getTempColor(saved.measuredTempC) : '#64748b' }}>
                        {saved ? `${saved.measuredTempC}°C (${celsiusToKelvin(saved.measuredTempC)} K)` : 'Not scanned'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{loc.nasaContext}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <EuropaSurfaceExplorer3D
              collectedReadings={collectedReadings}
              probingLoc={probingLoc}
              probeTravelPhase={probeTravelPhase}
              activeMeasuredTempC={activeMeasuredTempC}
              activeDriftC={activeDriftC}
              sensorStabilizedHere={sensorStabilizedHere}
              onMeasureSite={handleSelectEuropaSite}
              onStabilizeSensor={handleStabilizeFieldSensor}
              onSaveReading={handleSaveEuropaReading}
              onTransmitToEarth={() => {
                SFX.taskComplete();
                setStage(6);
                persistSnapshot({ stage: 6 });
              }}
            />
          </div>
        )}

        {/* ============================================================
            STAGE 6: TRANSMIT DATA TO EARTH
           ============================================================ */}
        {stage === 6 && (
          <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
            {!missionSuccess ? (
              <div className="rounded-3xl bg-[#061228] border border-sky-400/40 p-5 sm:p-7 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-mono-tech uppercase tracking-widest text-sky-300 font-bold">
                      DEEP-SPACE TELEMETRY LINK • 628M KM
                    </div>
                    <h2 className="font-display text-lg sm:text-2xl font-black text-white">
                      TRANSMIT EUROPA DATA TO EARTH
                    </h2>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-[#030b1a] border border-emerald-400/40 font-mono-tech text-sm font-black text-emerald-300 tabular-nums">
                    PACKETS: {transmittedPackets} / 5
                  </div>
                </div>

                {/* Animated Europa -> Space Beam -> Earth Receiver */}
                <div className="rounded-2xl bg-[#030a18] border border-white/10 p-5 grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                  {/* Left: Europa & Rotating Antenna Probe */}
                  <div className="md:col-span-3 flex flex-col items-center text-center">
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-sky-200 to-blue-900 border-2 border-sky-300 flex items-center justify-center shadow-[0_0_24px_rgba(56,189,248,0.4)]">
                      <span
                        className={`text-3xl inline-block ${
                          transmitting ? 'animate-spin' : ''
                        }`}
                        style={{ animationDuration: '3.5s' }}
                      >
                        📡
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-white mt-2">Europa Probe</div>
                    <div className="text-[10px] font-mono-tech text-sky-300">
                      {probeMetrics.isAntennaWeak ? 'Low-Gain Link' : 'High-Gain X-Band'}
                    </div>
                  </div>

                  {/* Center: 5 Individual Data Packets Stream */}
                  <div className="md:col-span-6 space-y-2.5">
                    <div className="relative h-12 rounded-xl bg-[#07152e] border border-sky-400/25 flex items-center justify-around px-3">
                      {[1, 2, 3, 4, 5].map((pkt) => {
                        const delivered = transmittedPackets >= pkt;
                        const active = transmitting && transmittedPackets + 1 === pkt;
                        return (
                          <div
                            key={pkt}
                            className={`w-10 h-8 rounded-lg border font-mono-tech text-[11px] font-black flex items-center justify-center transition-all ${
                              delivered
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.45)]'
                                : active
                                ? 'bg-sky-500/30 border-sky-300 text-white animate-bounce'
                                : 'bg-[#040c1d] border-white/15 text-slate-500'
                            }`}
                          >
                            {delivered ? `✓ #${pkt}` : `#${pkt}`}
                          </div>
                        );
                      })}
                    </div>

                    {linkInterrupted && (
                      <div className="p-3 rounded-xl bg-amber-950/75 border border-amber-400 text-center space-y-2">
                        <div className="text-xs font-bold text-amber-200">
                          ⚠ Weak antenna signal interrupted at packet {transmittedPackets}/5. Collected readings are safe!
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            SFX.select();
                            setLinkInterrupted(false);
                            setTransmitting(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-amber-400 text-[#031024] font-extrabold text-xs uppercase cursor-pointer"
                        >
                          RECONNECT &amp; RESUME LINK ▶
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Earth & Mission Control */}
                  <div className="md:col-span-3 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-emerald-600 border-2 border-emerald-300 flex items-center justify-center shadow-[0_0_24px_rgba(52,211,153,0.35)]">
                      <span className="text-3xl">🌍</span>
                    </div>
                    <div className="text-xs font-extrabold text-white mt-2">Mission Control</div>
                    <div className="text-[10px] font-mono-tech text-emerald-300">
                      {transmittedPackets}/5 Confirmed
                    </div>
                  </div>
                </div>

                {/* Big Send Button */}
                {!linkInterrupted && (
                  <button
                    type="button"
                    disabled={transmitting || transmittedPackets >= 5}
                    onClick={() => {
                      SFX.taskComplete();
                      setTransmitting(true);
                    }}
                    className={`w-full py-4 rounded-2xl font-display font-black text-sm sm:text-base tracking-wider uppercase transition ${
                      transmitting
                        ? 'bg-sky-800/60 text-sky-200 cursor-wait'
                        : 'bg-gradient-to-r from-[#38bdf8] via-[#4fe3d4] to-[#34d399] text-[#031024] hover:brightness-110 cursor-pointer shadow-[0_0_28px_rgba(79,227,212,0.45)]'
                    }`}
                  >
                    {transmitting ? 'TRANSMITTING PACKETS TO EARTH...' : '📡 SEND DATA TO EARTH'}
                  </button>
                )}
              </div>
            ) : (
              /* MISSION ACCOMPLISHED SCREEN */
              <div className="rounded-3xl bg-[#07142b] border border-emerald-400/55 p-6 sm:p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.88)] animate-[popIn_0.35s_ease-out]">
                <div className="text-[11px] font-mono-tech font-extrabold uppercase tracking-[2.5px] text-emerald-400">
                  ALL 5 TEMPERATURE READINGS RECEIVED ON EARTH!
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
                  EUROPA TELEMETRY MISSION COMPLETE!
                </h2>

                <div className="my-4 flex justify-center">
                  <ThermalTelemetrySpecialistBadgeSVG size={156} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-xs mb-6">
                  <div className="p-3 rounded-xl bg-[#040d1e] border border-amber-400/35">
                    <div className="text-slate-400 text-[10px] uppercase">Star Credits</div>
                    <div className="font-mono-tech text-base font-black text-amber-300 mt-0.5">
                      {rewardResult && !rewardResult.alreadyRewarded
                        ? '+1,500 SC'
                        : alreadyCompleted
                        ? 'Already Claimed'
                        : '+1,500 SC'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040d1e] border border-emerald-400/35">
                    <div className="text-slate-400 text-[10px] uppercase">Engineering XP</div>
                    <div className="font-mono-tech text-base font-black text-emerald-300 mt-0.5">
                      {rewardResult && !rewardResult.alreadyRewarded
                        ? '+150 XP'
                        : alreadyCompleted
                        ? `Total ${xp} XP`
                        : '+150 XP'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#040d1e] border border-sky-400/35">
                    <div className="text-slate-400 text-[10px] uppercase">Badge &amp; Campaign</div>
                    <div className="font-bold text-sky-300 mt-0.5">
                      Level 7 Unlocked!
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onContinueToLevel7();
                    }}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#031024] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer"
                  >
                    CONTINUE TO LEVEL 7 ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      onBackToLevelMap();
                    }}
                    className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold uppercase text-white cursor-pointer"
                  >
                    LEVEL MAP
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryMission}
                    className="px-5 py-3.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-xs font-bold uppercase text-amber-200 cursor-pointer"
                  >
                    REPLAY ↺
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================
          TIMER EXPIRED FAILURE MODAL
         ============================================================ */}
      {timerExpired && !missionSuccess && (
        <div className="fixed inset-0 z-[5800] bg-black/82 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#190811] border border-red-400/60 p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.92)]">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-[11px] font-mono-tech uppercase tracking-widest text-red-300 font-bold">
              MISSION FAILED // TIME EXPIRED
            </div>
            <h2 className="font-display text-xl font-black text-white mt-1">
              12-MINUTE WINDOW CLOSED
            </h2>
            <p className="text-xs text-slate-300 mt-2">
              The Jovian radiation window closed before all 5 Europa readings arrived on Earth.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleRetryMission}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer"
              >
                RETRY MISSION ↺
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onBackToLevelMap();
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
              >
                RETURN TO LEVEL MAP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
