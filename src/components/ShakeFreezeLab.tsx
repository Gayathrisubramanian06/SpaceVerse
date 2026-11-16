import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LEVEL4_PROGRESS,
  LEVEL4_BASE_MASS_KG,
  LEVEL4_MAX_MASS_KG,
  LEVEL4_PROTECTION_PARTS,
  LEVEL4_SHAKER_BASE_SCORE,
  LEVEL4_SHAKER_PASS_SCORE,
  Level4Progress,
  ProtectionPartId,
  ProtectionPartSpec,
} from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { ThermalProtectionEngineerBadgeSVG } from './BadgesSVG';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

export interface Level4RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  xpAwarded: number;
  newStarBalance: number;
  newXpBalance: number;
}

export interface Level4CompletionPayload {
  installedParts: ProtectionPartId[];
  shakerScore: number;
  freezerMinTempC: number;
  freezerFinalTempC: number;
}

interface ShakeFreezeLabProps {
  visible: boolean;
  starCredits: number;
  xp: number;
  alreadyCompleted: boolean;
  initialProgress?: Level4Progress;
  onSaveProgress: (progress: Level4Progress) => void;
  onReplayReset: () => void;
  onCompleteMission: (payload: Level4CompletionPayload) => Promise<Level4RewardResult>;
  onContinueToLevel5: () => void;
  onBackToAcademy: () => void;
  onExit: () => void;
  onOpenHandbook?: () => void;
}

const SHAKER_PART_IDS: ProtectionPartId[] = [
  'structural_reinforcement',
  'heavy_armor',
  'vibration_mounts',
];
const FREEZER_PART_IDS: ProtectionPartId[] = [
  'thermal_insulation',
  'small_heater',
  'large_heater',
];

function computeShakerSignature(parts: ProtectionPartId[]): string {
  return parts
    .filter((id) => SHAKER_PART_IDS.includes(id))
    .slice()
    .sort()
    .join(',');
}

function computeFreezerSignature(parts: ProtectionPartId[]): string {
  return parts
    .filter((id) => FREEZER_PART_IDS.includes(id))
    .slice()
    .sort()
    .join(',');
}

function computeShakerScore(parts: ProtectionPartId[]): number {
  let bonus = 0;
  for (const id of parts) {
    const spec = LEVEL4_PROTECTION_PARTS.find((p) => p.id === id);
    if (spec) bonus += spec.vibrationBonus;
  }
  return LEVEL4_SHAKER_BASE_SCORE + bonus;
}

function computeMassKg(parts: ProtectionPartId[]): number {
  let added = 0;
  for (const id of parts) {
    const spec = LEVEL4_PROTECTION_PARTS.find((p) => p.id === id);
    if (spec) added += spec.massKg;
  }
  return LEVEL4_BASE_MASS_KG + added;
}

function computeHeaterWatts(parts: ProtectionPartId[]): number {
  let w = 0;
  for (const id of parts) {
    const spec = LEVEL4_PROTECTION_PARTS.find((p) => p.id === id);
    if (spec) w += spec.powerW;
  }
  return w;
}

// Educational cryo-vac thermal constants
const CRYO_START_TEMP_C = 20;
const CRYO_CHAMBER_TEMP_C = -80;
const CRYO_MIN_SAFE_C = -20;
const CRYO_MAX_SAFE_C = 50;
const CRYO_DURATION_SEC = 60;

const ConfettiCanvas: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const colors = ['#4fe3d4', '#38bdf8', '#fbbf24', '#f97316', '#ffffff'];
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * 180,
      vx: (Math.random() - 0.5) * 2.6,
      vy: 2 + Math.random() * 3.4,
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

const DROP_ZONES: {
  id: string;
  label: string;
  accepts: ProtectionPartId;
  xPct: number;
  yPct: number;
}[] = [
  {
    id: 'zone-frame',
    label: 'Frame Truss',
    accepts: 'structural_reinforcement',
    xPct: 50,
    yPct: 26,
  },
  {
    id: 'zone-armor',
    label: 'Outer Armor',
    accepts: 'heavy_armor',
    xPct: 24,
    yPct: 50,
  },
  {
    id: 'zone-insulation',
    label: 'MLI Blanket',
    accepts: 'thermal_insulation',
    xPct: 76,
    yPct: 50,
  },
  {
    id: 'zone-small-heater',
    label: 'Aux Heater',
    accepts: 'small_heater',
    xPct: 37,
    yPct: 68,
  },
  {
    id: 'zone-large-heater',
    label: 'Main Heater',
    accepts: 'large_heater',
    xPct: 63,
    yPct: 68,
  },
  {
    id: 'zone-mounts',
    label: 'Iso Mounts',
    accepts: 'vibration_mounts',
    xPct: 50,
    yPct: 83,
  },
];

// Crisp SVG mini icon per protection hardware module
const ProtectionPartIconSVG: React.FC<{ id: ProtectionPartId }> = ({ id }) => {
  if (id === 'structural_reinforcement') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <rect x="3" y="3" width="22" height="22" rx="4" fill="#06142e" stroke="#4fe3d4" strokeWidth="1.8" />
        <line x1="6" y1="6" x2="22" y2="22" stroke="#4fe3d4" strokeWidth="1.8" />
        <line x1="22" y1="6" x2="6" y2="22" stroke="#4fe3d4" strokeWidth="1.8" />
      </svg>
    );
  }
  if (id === 'heavy_armor') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <path d="M14 3L23 7V14C23 19.5 19 23.5 14 25C9 23.5 5 19.5 5 14V7L14 3Z" fill="#475569" stroke="#e2e8f0" strokeWidth="1.8" />
        <path d="M14 7L19 9.5V14C19 17.5 16.8 20 14 21.2C11.2 20 9 17.5 9 14V9.5L14 7Z" fill="#1e293b" />
      </svg>
    );
  }
  if (id === 'vibration_mounts') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <rect x="6" y="4" width="16" height="4" rx="1.5" fill="#38bdf8" />
        <path d="M9 9L19 12L9 15L19 18L9 21" stroke="#fde047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="21" width="16" height="4" rx="1.5" fill="#0284c7" />
      </svg>
    );
  }
  if (id === 'thermal_insulation') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <rect x="4" y="5" width="20" height="18" rx="4" fill="#d97706" stroke="#fef08a" strokeWidth="1.8" />
        <path d="M7 11L12 9L17 13L21 10" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M7 17L13 15L18 19L21 16" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'small_heater') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <rect x="4" y="6" width="20" height="16" rx="4" fill="#271005" stroke="#fb923c" strokeWidth="1.8" />
        <path d="M8 14L11 10L14 18L17 10L20 14" stroke="#fde047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
      <rect x="3" y="5" width="22" height="18" rx="4" fill="#431407" stroke="#f97316" strokeWidth="2" />
      <path d="M6 14L9 9L12 19L15 9L18 19L22 14" stroke="#fef08a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Reusable animated Communications Satellite SVG reflecting installed protection hardware
const CommsSatelliteDiagramSVG: React.FC<{
  installedParts: ProtectionPartId[];
  shakeOffsetX?: number;
  shakeOffsetY?: number;
  shakeRotDeg?: number;
  heaterGlowActive?: boolean;
  frostLevel?: number;
  compact?: boolean;
}> = ({
  installedParts,
  shakeOffsetX = 0,
  shakeOffsetY = 0,
  shakeRotDeg = 0,
  heaterGlowActive = false,
  frostLevel = 0,
  compact = false,
}) => {
  const hasFrame = installedParts.includes('structural_reinforcement');
  const hasArmor = installedParts.includes('heavy_armor');
  const hasMounts = installedParts.includes('vibration_mounts');
  const hasInsulation = installedParts.includes('thermal_insulation');
  const hasSmallHeater = installedParts.includes('small_heater');
  const hasLargeHeater = installedParts.includes('large_heater');

  return (
    <svg
      viewBox="0 0 380 260"
      className={compact ? 'w-full h-44 select-none' : 'w-full h-64 md:h-72 select-none'}
      fill="none"
    >
      <defs>
        <linearGradient id="l4Solar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="l4Bus" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hasInsulation ? '#f59e0b' : '#475569'} />
          <stop offset="50%" stopColor={hasInsulation ? '#d97706' : '#334155'} />
          <stop offset="100%" stopColor={hasInsulation ? '#92400e' : '#1e293b'} />
        </linearGradient>
        <radialGradient id="l4HeatGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g
        transform={`translate(${190 + shakeOffsetX}, ${134 + shakeOffsetY}) rotate(${shakeRotDeg})`}
      >
        {/* Active heater aura when running */}
        {heaterGlowActive && (hasSmallHeater || hasLargeHeater) && (
          <circle cx="0" cy="0" r={hasLargeHeater ? 68 : 50} fill="url(#l4HeatGlow)" />
        )}

        {/* Left & Right Solar Wings */}
        <g>
          <line x1="-130" y1="0" x2="-46" y2="0" stroke="#94a3b8" strokeWidth="4" />
          <line x1="46" y1="0" x2="130" y2="0" stroke="#94a3b8" strokeWidth="4" />
          <rect
            x="-158"
            y="-26"
            width="92"
            height="52"
            rx="4"
            fill="url(#l4Solar)"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <rect
            x="66"
            y="-26"
            width="92"
            height="52"
            rx="4"
            fill="url(#l4Solar)"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          {/* Solar grid ribs */}
          {[-135, -112, -89].map((x) => (
            <line key={x} x1={x} y1="-26" x2={x} y2="26" stroke="#60a5fa" strokeOpacity="0.35" />
          ))}
          {[89, 112, 135].map((x) => (
            <line key={x} x1={x} y1="-26" x2={x} y2="26" stroke="#60a5fa" strokeOpacity="0.35" />
          ))}
          <line x1="-158" y1="0" x2="-66" y2="0" stroke="#60a5fa" strokeOpacity="0.35" />
          <line x1="66" y1="0" x2="158" y2="0" stroke="#60a5fa" strokeOpacity="0.35" />
        </g>

        {/* Structural Reinforcement Cross Trusses */}
        {hasFrame && (
          <g>
            <rect
              x="-54"
              y="-56"
              width="108"
              height="112"
              rx="10"
              stroke="#4fe3d4"
              strokeWidth="3.2"
              strokeDasharray="8 4"
            />
            <line x1="-48" y1="-48" x2="48" y2="48" stroke="#4fe3d4" strokeWidth="2.5" strokeOpacity="0.85" />
            <line x1="48" y1="-48" x2="-48" y2="48" stroke="#4fe3d4" strokeWidth="2.5" strokeOpacity="0.85" />
          </g>
        )}

        {/* Heavy Armor Side Flanks */}
        {hasArmor && (
          <g>
            <polygon
              points="-58,-42 -44,-48 -44,48 -58,42"
              fill="#64748b"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            <polygon
              points="58,-42 44,-48 44,48 58,42"
              fill="#64748b"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Main Communications Satellite Bus (+ optional Gold MLI Blanket) */}
        <rect
          x="-46"
          y="-48"
          width="92"
          height="96"
          rx="9"
          fill="url(#l4Bus)"
          stroke={hasInsulation ? '#fde047' : '#94a3b8'}
          strokeWidth={hasInsulation ? 3 : 2}
        />

        {/* MLI Foil Crinkle Pattern */}
        {hasInsulation && (
          <g stroke="#fef08a" strokeOpacity="0.45" strokeWidth="1.2">
            <path d="M-38 -32 L-16 -24 L4 -34 L28 -22 L38 -30" />
            <path d="M-38 -6 L-12 2 L14 -8 L38 0" />
            <path d="M-38 22 L-14 30 L12 20 L38 28" />
          </g>
        )}

        {/* Internal Electronics Core Window */}
        <rect
          x="-28"
          y="-22"
          width="56"
          height="36"
          rx="5"
          fill="#071329"
          stroke="#38bdf8"
          strokeWidth="1.6"
        />
        <circle cx="-14" cy="-6" r="4" fill="#34d399" />
        <circle cx="0" cy="-6" r="4" fill="#4fe3d4" />
        <rect x="10" y="-12" width="12" height="12" rx="2" fill="#1e40af" stroke="#60a5fa" />

        {/* Small Heater Coil */}
        {hasSmallHeater && (
          <g transform="translate(-18, 28)">
            <rect
              x="-14"
              y="-9"
              width="28"
              height="18"
              rx="4"
              fill="#1f1206"
              stroke={heaterGlowActive ? '#fb923c' : '#f59e0b'}
              strokeWidth="1.8"
            />
            <path
              d="M-8 0 L-4 -5 L0 5 L4 -5 L8 0"
              stroke={heaterGlowActive ? '#fde047' : '#fb923c'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Large Heater Coil */}
        {hasLargeHeater && (
          <g transform="translate(18, 28)">
            <rect
              x="-18"
              y="-10"
              width="36"
              height="20"
              rx="4"
              fill="#271005"
              stroke={heaterGlowActive ? '#fde047' : '#f97316'}
              strokeWidth="2"
            />
            <path
              d="M-12 0 L-7 -6 L-2 6 L3 -6 L8 6 L13 0"
              stroke={heaterGlowActive ? '#fef08a' : '#fb923c'}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Top High-Gain Communications Dish */}
        <line x1="0" y1="-48" x2="0" y2="-70" stroke="#cbd5e1" strokeWidth="4" />
        <path
          d="M-34 -78 Q0 -54 34 -78 Z"
          fill="#e2e8f0"
          stroke="#4fe3d4"
          strokeWidth="2"
        />
        <line x1="0" y1="-67" x2="0" y2="-92" stroke="#4fe3d4" strokeWidth="2.5" />
        <circle cx="0" cy="-94" r="4" fill="#4fe3d4" />

        {/* Bottom Payload Adapter & Vibration Isolation Mounts */}
        <rect x="-26" y="48" width="52" height="12" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
        {hasMounts && (
          <g>
            {/* Spring-Damper Pistons */}
            {[-20, 0, 20].map((x) => (
              <g key={x} transform={`translate(${x}, 60)`}>
                <rect x="-5" y="0" width="10" height="16" rx="3" fill="#0ea5e9" stroke="#e0f2fe" strokeWidth="1.5" />
                <path d="M-4 4 L4 7 L-4 10 L4 13" stroke="#fef08a" strokeWidth="1.6" />
              </g>
            ))}
          </g>
        )}

        {/* Cryo Frost Rim Overlay during freezing */}
        {frostLevel > 0.15 && (
          <rect
            x="-50"
            y="-52"
            width="100"
            height="104"
            rx="11"
            stroke="#bae6fd"
            strokeWidth="3"
            strokeOpacity={Math.min(0.85, frostLevel)}
            strokeDasharray="10 6"
          />
        )}
      </g>
    </svg>
  );
};

export const ShakeFreezeLab: React.FC<ShakeFreezeLabProps> = ({
  visible,
  starCredits,
  xp,
  alreadyCompleted,
  initialProgress,
  onSaveProgress,
  onReplayReset,
  onCompleteMission,
  onContinueToLevel5,
  onBackToAcademy,
  onExit,
  onOpenHandbook,
}) => {
  const initial = initialProgress || DEFAULT_LEVEL4_PROGRESS;

  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(() =>
    initial.stage && initial.stage > 1 ? initial.stage : 2
  );
  const [installedParts, setInstalledParts] = useState<ProtectionPartId[]>(
    () => initial.installedParts || []
  );
  const [shakerResult, setShakerResult] = useState<'pending' | 'passed' | 'failed'>(
    () => initial.shakerResult || 'pending'
  );
  const [shakerScore, setShakerScore] = useState<number>(() => initial.shakerScore ?? 30);
  const [shakerSignature, setShakerSignature] = useState<string>(
    () => initial.shakerSignature || ''
  );

  const [freezerResult, setFreezerResult] = useState<'pending' | 'passed' | 'failed'>(
    () => initial.freezerResult || 'pending'
  );
  const [freezerMinTempC, setFreezerMinTempC] = useState<number | null>(
    () => initial.freezerMinTempC ?? null
  );
  const [freezerFinalTempC, setFreezerFinalTempC] = useState<number | null>(
    () => initial.freezerFinalTempC ?? null
  );
  const [freezerSignature, setFreezerSignature] = useState<string>(
    () => initial.freezerSignature || ''
  );

  // Audio controls
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());
  const [volumePct, setVolumePct] = useState<number>(() => Math.round(SFX.getVolume() * 100));

  // Assembly drag-and-drop & feedback state
  const satDropRef = useRef<HTMLDivElement | null>(null);
  const [draggingPart, setDraggingPart] = useState<ProtectionPartSpec | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [wrongZoneId, setWrongZoneId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<ProtectionPartId | null>(null);
  const [assemblyFeedback, setAssemblyFeedback] = useState<{
    type: 'info' | 'ok' | 'err';
    text: string;
  }>({
    type: 'info',
    text: 'Drag protection modules onto matching satellite bays. Keep total mass ≤ 500 kg!',
  });

  // Hydrate persisted Level 4 progress when lab opens or account switches
  const prevVisRef = useRef<boolean>(false);
  useEffect(() => {
    if (visible && !prevVisRef.current) {
      const p = initialProgress || DEFAULT_LEVEL4_PROGRESS;
      setStage(p.stage && p.stage > 1 ? p.stage : 2);
      setInstalledParts(p.installedParts || []);
      setShakerResult(p.shakerResult || 'pending');
      setShakerScore(p.shakerScore ?? 30);
      setShakerSignature(p.shakerSignature || '');
      setFreezerResult(p.freezerResult || 'pending');
      setFreezerMinTempC(p.freezerMinTempC ?? null);
      setFreezerFinalTempC(p.freezerFinalTempC ?? null);
      setFreezerSignature(p.freezerSignature || '');
      setRewardState(null);
      setCompletionModalOpen(false);
    }
    prevVisRef.current = visible;
  }, [visible, initialProgress]);

  const announcedStageRef = useRef<number | null>(null);
  useEffect(() => {
    if (!visible) {
      announcedStageRef.current = null;
      SFX.cancelSpeech();
      return;
    }
    const effectiveStage = stage === 1 ? 2 : stage;
    if (announcedStageRef.current === effectiveStage) return;
    announcedStageRef.current = effectiveStage;
    const cues: Record<number, string> = {
      2: 'Protection Assembly. Select structural braces, insulation, and heaters onto the satellite while keeping total mass at or under 500 kilograms.',
      3: 'Shaker Table Test. Start the 15-second vibration shaker run to verify launch structural survival.',
      4: 'Cryo Freezer Test. Monitor satellite electronics in the minus 80 degree cryo chamber and keep internal temperature above minus 20 degrees.',
      5: 'Environmental qualification complete! Both launch vibration and cryogenic freeze tests passed.',
    };
    const msg = cues[effectiveStage];
    if (msg) SFX.speakCue(msg);
  }, [visible, stage]);

  // Stage 3: Shaker Table simulation state
  const [shakerRunning, setShakerRunning] = useState(false);
  const [shakerProgressPct, setShakerProgressPct] = useState(0);
  const [shakerFreqHz, setShakerFreqHz] = useState(0);
  const [shakerIntensity, setShakerIntensity] = useState(0);
  const [shakerJitter, setShakerJitter] = useState<{ x: number; y: number; rot: number }>({
    x: 0,
    y: 0,
    rot: 0,
  });
  const shakerAudioRef = useRef<ReturnType<typeof SFX.createShakerAudio> | null>(null);

  // Stage 4: Freezer Room simulation state
  const [freezerStatus, setFreezerStatus] = useState<
    'idle' | 'running' | 'paused' | 'passed' | 'failed'
  >('idle');
  const [freezerTempC, setFreezerTempC] = useState<number>(CRYO_START_TEMP_C);
  const [freezerElapsedSec, setFreezerElapsedSec] = useState<number>(0);
  const [freezerMinObservedC, setFreezerMinObservedC] = useState<number>(CRYO_START_TEMP_C);
  const [freezerSpeed, setFreezerSpeed] = useState<1 | 2>(1);
  const [tempHistory, setTempHistory] = useState<{ t: number; temp: number }[]>([
    { t: 0, temp: CRYO_START_TEMP_C },
  ]);
  const freezerAmbienceRef = useRef<ReturnType<typeof SFX.createFreezerAmbience> | null>(null);

  // Stage 5: Qualification & Completion Reward
  const [rewardState, setRewardState] = useState<Level4RewardResult | null>(null);
  const [submittingReward, setSubmittingReward] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  // Derived metrics
  const totalMassKg = useMemo(() => computeMassKg(installedParts), [installedParts]);
  const addedMassKg = totalMassKg - LEVEL4_BASE_MASS_KG;
  const overMassLimit = totalMassKg > LEVEL4_MAX_MASS_KG;
  const liveVibrationScore = useMemo(() => computeShakerScore(installedParts), [installedParts]);
  const heaterWatts = useMemo(() => computeHeaterWatts(installedParts), [installedParts]);
  const hasInsulation = installedParts.includes('thermal_insulation');
  const hasSmallHeater = installedParts.includes('small_heater');
  const hasLargeHeater = installedParts.includes('large_heater');

  const currentShakerSig = useMemo(() => computeShakerSignature(installedParts), [installedParts]);
  const currentFreezerSig = useMemo(
    () => computeFreezerSignature(installedParts),
    [installedParts]
  );

  const shakerValidPassed =
    shakerResult === 'passed' &&
    shakerScore >= LEVEL4_SHAKER_PASS_SCORE &&
    shakerSignature === currentShakerSig;

  const freezerValidPassed =
    freezerResult === 'passed' &&
    freezerMinTempC !== null &&
    freezerMinTempC >= CRYO_MIN_SAFE_C &&
    freezerSignature === currentFreezerSig;

  const isAllQualified = shakerValidPassed && freezerValidPassed && !overMassLimit;

  // Persist helper
  const persistProgress = useCallback(
    (overrides?: Partial<Level4Progress>) => {
      const nextParts = overrides?.installedParts ?? installedParts;
      const nextMass = computeMassKg(nextParts);
      const nextShakerRes = overrides?.shakerResult ?? shakerResult;
      const nextFreezerRes = overrides?.freezerResult ?? freezerResult;
      const nextQualified =
        nextShakerRes === 'passed' &&
        nextFreezerRes === 'passed' &&
        nextMass <= LEVEL4_MAX_MASS_KG;

      const payload: Level4Progress = {
        stage: overrides?.stage ?? stage,
        installedParts: nextParts,
        totalMassKg: nextMass,
        shakerResult: nextShakerRes,
        shakerScore: overrides?.shakerScore ?? shakerScore,
        shakerSignature: overrides?.shakerSignature ?? shakerSignature,
        freezerResult: nextFreezerRes,
        freezerMinTempC:
          overrides && 'freezerMinTempC' in overrides
            ? (overrides.freezerMinTempC ?? null)
            : freezerMinTempC,
        freezerFinalTempC:
          overrides && 'freezerFinalTempC' in overrides
            ? (overrides.freezerFinalTempC ?? null)
            : freezerFinalTempC,
        freezerSignature: overrides?.freezerSignature ?? freezerSignature,
        finalQualified: overrides?.finalQualified ?? nextQualified,
      };
      onSaveProgress(payload);
    },
    [
      freezerFinalTempC,
      freezerMinTempC,
      freezerResult,
      freezerSignature,
      installedParts,
      onSaveProgress,
      shakerResult,
      shakerScore,
      shakerSignature,
      stage,
    ]
  );

  // Clean up continuous oscillators whenever component hides, changes stage, or unmounts
  const stopAllLabAudio = useCallback(() => {
    shakerAudioRef.current?.stop();
    shakerAudioRef.current = null;
    freezerAmbienceRef.current?.stop();
    freezerAmbienceRef.current = null;
  }, []);

  useEffect(() => {
    if (!visible) {
      stopAllLabAudio();
      setShakerRunning(false);
      setFreezerStatus((prev) => (prev === 'running' ? 'paused' : prev));
    }
    return () => {
      stopAllLabAudio();
    };
  }, [visible, stopAllLabAudio]);

  // Stop shaker/freezer audio if user switches away from Stage 3 / 4
  useEffect(() => {
    if (stage !== 3 && shakerAudioRef.current) {
      shakerAudioRef.current.stop();
      shakerAudioRef.current = null;
      setShakerRunning(false);
    }
    if (stage !== 4 && freezerAmbienceRef.current) {
      freezerAmbienceRef.current.stop();
      freezerAmbienceRef.current = null;
      setFreezerStatus((prev) => (prev === 'running' ? 'paused' : prev));
    }
  }, [stage]);

  // Apply smart part install + test signature invalidation
  const applyPartsChange = useCallback(
    (nextParts: ProtectionPartId[]) => {
      const nextMass = computeMassKg(nextParts);
      const nextShakerSig = computeShakerSignature(nextParts);
      const nextFreezerSig = computeFreezerSignature(nextParts);

      let nextShakerRes = shakerResult;
      let nextShakerScore = shakerScore;
      let nextShakerSavedSig = shakerSignature;
      if (shakerResult !== 'pending' && nextShakerSig !== shakerSignature) {
        nextShakerRes = 'pending';
        nextShakerScore = computeShakerScore(nextParts);
        nextShakerSavedSig = '';
      }

      let nextFreezerRes = freezerResult;
      let nextFreezerMin = freezerMinTempC;
      let nextFreezerFinal = freezerFinalTempC;
      let nextFreezerSavedSig = freezerSignature;
      if (freezerResult !== 'pending' && nextFreezerSig !== freezerSignature) {
        nextFreezerRes = 'pending';
        nextFreezerMin = null;
        nextFreezerFinal = null;
        nextFreezerSavedSig = '';
        setFreezerStatus('idle');
        setFreezerTempC(CRYO_START_TEMP_C);
        setFreezerElapsedSec(0);
        setTempHistory([{ t: 0, temp: CRYO_START_TEMP_C }]);
      }

      if (nextMass > LEVEL4_MAX_MASS_KG) {
        SFX.massWarningBeep();
      }

      setInstalledParts(nextParts);
      setShakerResult(nextShakerRes);
      setShakerScore(nextShakerScore);
      setShakerSignature(nextShakerSavedSig);
      setFreezerResult(nextFreezerRes);
      setFreezerMinTempC(nextFreezerMin);
      setFreezerFinalTempC(nextFreezerFinal);
      setFreezerSignature(nextFreezerSavedSig);

      persistProgress({
        installedParts: nextParts,
        shakerResult: nextShakerRes,
        shakerScore: nextShakerScore,
        shakerSignature: nextShakerSavedSig,
        freezerResult: nextFreezerRes,
        freezerMinTempC: nextFreezerMin,
        freezerFinalTempC: nextFreezerFinal,
        freezerSignature: nextFreezerSavedSig,
      });
    },
    [
      freezerFinalTempC,
      freezerMinTempC,
      freezerResult,
      freezerSignature,
      persistProgress,
      shakerResult,
      shakerScore,
      shakerSignature,
    ]
  );

  const attemptInstallInZone = useCallback(
    (part: ProtectionPartSpec, zoneId: string) => {
      if (installedParts.includes(part.id)) {
        setAssemblyFeedback({
          type: 'info',
          text: `${part.shortName} is already installed on the satellite.`,
        });
        return;
      }

      if (part.targetZoneId !== zoneId) {
        SFX.snapWrong();
        setWrongZoneId(zoneId);
        window.setTimeout(() => {
          setWrongZoneId((prev) => (prev === zoneId ? null : prev));
        }, 900);
        setAssemblyFeedback({
          type: 'err',
          text: `Wrong bay! ${part.wrongZoneTip}`,
        });
        return;
      }

      const nextParts = [...installedParts, part.id];
      const nextMass = computeMassKg(nextParts);
      SFX.snapCorrect();
      if (part.powerW > 0) SFX.heaterActivate();
      applyPartsChange(nextParts);
      setSelectedPartId(null);

      if (nextMass > LEVEL4_MAX_MASS_KG) {
        setAssemblyFeedback({
          type: 'err',
          text: `Installed ${part.shortName}, but mass (${nextMass} kg) exceeds 500 kg! Remove another part before testing.`,
        });
      } else {
        setAssemblyFeedback({
          type: 'ok',
          text: `✓ ${part.shortName} locked onto ${part.targetZoneName}! (${nextMass} / ${LEVEL4_MAX_MASS_KG} kg)`,
        });
      }
    },
    [applyPartsChange, installedParts]
  );

  const removeInstalledPart = useCallback(
    (id: ProtectionPartId) => {
      const part = LEVEL4_PROTECTION_PARTS.find((p) => p.id === id);
      const nextParts = installedParts.filter((x) => x !== id);
      SFX.click();
      applyPartsChange(nextParts);
      setAssemblyFeedback({
        type: 'info',
        text: `Removed ${part?.shortName || id}. Protection mass adjusted.`,
      });
    },
    [applyPartsChange, installedParts]
  );

  // Pointer drag tracking across the viewport for smooth mouse & touch drag-and-drop
  useEffect(() => {
    if (!draggingPart) return;

    const findHoveredZone = (clientX: number, clientY: number): string | null => {
      const container = satDropRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      const xPct = ((clientX - rect.left) / rect.width) * 100;
      const yPct = ((clientY - rect.top) / rect.height) * 100;

      let bestZone: string | null = null;
      let bestDist = 18; // Generous 18% hit radius inside diagram
      for (const z of DROP_ZONES) {
        const d = Math.hypot(xPct - z.xPct, yPct - z.yPct);
        if (d < bestDist) {
          bestDist = d;
          bestZone = z.id;
        }
      }
      return bestZone;
    };

    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
      setHoveredZoneId(findHoveredZone(e.clientX, e.clientY));
    };

    const onUp = (e: PointerEvent) => {
      const targetZone = findHoveredZone(e.clientX, e.clientY);
      if (targetZone) {
        attemptInstallInZone(draggingPart, targetZone);
      } else {
        setHoveredZoneId(null);
      }
      setDraggingPart(null);
      setDragPos(null);
      setHoveredZoneId(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [attemptInstallInZone, draggingPart]);

  // ========================================================
  // STAGE 3: SHAKER TABLE ANIMATION & EVALUATION LOOP
  // ========================================================
  useEffect(() => {
    if (!shakerRunning || stage !== 3) return;
    SFX.shakerStart();
    const audio = SFX.createShakerAudio();
    shakerAudioRef.current = audio;

    const totalMs = 6400;
    const t0 = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(1, elapsed / totalMs);
      const hz = Math.round(10 + progress * 55); // 10 Hz -> 65 Hz ramp
      const envelope = Math.sin(progress * Math.PI * 0.92 + 0.15);
      const damperReduction = Math.min(0.6, (liveVibrationScore - 30) / 110);
      const amp = (8 + envelope * 14) * (1 - damperReduction * 0.55);

      setShakerProgressPct(Math.round(progress * 100));
      setShakerFreqHz(hz);
      setShakerIntensity(Math.round(25 + envelope * 75));
      setShakerJitter({
        x: Math.sin(elapsed * 0.095) * amp,
        y: Math.cos(elapsed * 0.13) * (amp * 0.48),
        rot: Math.sin(elapsed * 0.08) * (amp * 0.24),
      });
      audio?.setIntensity(0.2 + envelope * 0.75);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        audio?.stop();
        shakerAudioRef.current = null;
        setShakerRunning(false);
        setShakerJitter({ x: 0, y: 0, rot: 0 });
        const score = computeShakerScore(installedParts);
        const passed = score >= LEVEL4_SHAKER_PASS_SCORE && !overMassLimit;
        const sig = computeShakerSignature(installedParts);

        if (passed) {
          SFX.shakerPass();
          setShakerResult('passed');
          setShakerScore(score);
          setShakerSignature(sig);
          persistProgress({
            stage: 3,
            shakerResult: 'passed',
            shakerScore: score,
            shakerSignature: sig,
          });
        } else {
          SFX.shakerFail();
          setShakerResult('failed');
          setShakerScore(score);
          setShakerSignature(sig);
          persistProgress({
            stage: 3,
            shakerResult: 'failed',
            shakerScore: score,
            shakerSignature: sig,
          });
        }
      }
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      audio?.stop();
      if (shakerAudioRef.current === audio) shakerAudioRef.current = null;
    };
  }, [installedParts, liveVibrationScore, overMassLimit, persistProgress, shakerRunning, stage]);

  // ========================================================
  // STAGE 4: FREEZER ROOM THERMAL SIMULATION LOOP
  // ========================================================
  const freezerTempRef = useRef<number>(CRYO_START_TEMP_C);
  const freezerElapsedRef = useRef<number>(0);
  const freezerMinRef = useRef<number>(CRYO_START_TEMP_C);
  const lastTempWarnRef = useRef<number>(0);

  const resetFreezerRun = useCallback(() => {
    freezerAmbienceRef.current?.stop();
    freezerAmbienceRef.current = null;
    freezerTempRef.current = CRYO_START_TEMP_C;
    freezerElapsedRef.current = 0;
    freezerMinRef.current = CRYO_START_TEMP_C;
    setFreezerTempC(CRYO_START_TEMP_C);
    setFreezerElapsedSec(0);
    setFreezerMinObservedC(CRYO_START_TEMP_C);
    setTempHistory([{ t: 0, temp: CRYO_START_TEMP_C }]);
    setFreezerStatus('idle');
  }, []);

  useEffect(() => {
    if (freezerStatus !== 'running' || stage !== 4) return;
    const amb = SFX.createFreezerAmbience();
    freezerAmbienceRef.current = amb;

    let lastNow = performance.now();
    let lastSampleT = freezerElapsedRef.current;
    let raf = 0;

    const kCool = hasInsulation ? 0.0092 : 0.024;
    const heatingEffect =
      hasSmallHeater && hasLargeHeater ? 1.3 : hasLargeHeater ? 1.05 : hasSmallHeater ? 0.48 : 0;

    const step = (now: number) => {
      const realDt = Math.min(0.08, (now - lastNow) / 1000);
      lastNow = now;
      // Smooth 4x real-time acceleration (60 simulated sec takes 15s at 1x, 7.5s at 2x)
      const simDt = realDt * (freezerSpeed === 2 ? 8 : 4);

      const nextT = Math.min(CRYO_DURATION_SEC, freezerElapsedRef.current + simDt);
      const curTemp = freezerTempRef.current;
      const coolingEffect = kCool * (curTemp - CRYO_CHAMBER_TEMP_C);
      const nextTemp = curTemp + (heatingEffect - coolingEffect) * simDt;

      freezerElapsedRef.current = nextT;
      freezerTempRef.current = nextTemp;
      if (nextTemp < freezerMinRef.current) {
        freezerMinRef.current = nextTemp;
      }

      if ((nextTemp < CRYO_MIN_SAFE_C || nextTemp > CRYO_MAX_SAFE_C) && now - lastTempWarnRef.current > 1800) {
        lastTempWarnRef.current = now;
        SFX.tempWarningBeep();
      }

      setFreezerElapsedSec(nextT);
      setFreezerTempC(Number(nextTemp.toFixed(1)));
      setFreezerMinObservedC(Number(freezerMinRef.current.toFixed(1)));

      if (nextT - lastSampleT >= 1.2 || nextT >= CRYO_DURATION_SEC) {
        lastSampleT = nextT;
        setTempHistory((prev) => [...prev, { t: nextT, temp: Number(nextTemp.toFixed(1)) }]);
      }

      const frozenOut = nextTemp < CRYO_MIN_SAFE_C || nextTemp > CRYO_MAX_SAFE_C;
      if (frozenOut || nextT >= CRYO_DURATION_SEC) {
        amb?.stop();
        freezerAmbienceRef.current = null;
        const minC = Number(freezerMinRef.current.toFixed(1));
        const finalC = Number(nextTemp.toFixed(1));
        const passed =
          !frozenOut &&
          minC >= CRYO_MIN_SAFE_C &&
          finalC >= CRYO_MIN_SAFE_C &&
          finalC <= CRYO_MAX_SAFE_C &&
          !overMassLimit;
        const sig = computeFreezerSignature(installedParts);

        if (passed) {
          SFX.shakerPass();
          setFreezerStatus('passed');
          setFreezerResult('passed');
          setFreezerMinTempC(minC);
          setFreezerFinalTempC(finalC);
          setFreezerSignature(sig);
          persistProgress({
            stage: 4,
            freezerResult: 'passed',
            freezerMinTempC: minC,
            freezerFinalTempC: finalC,
            freezerSignature: sig,
          });
        } else {
          SFX.shakerFail();
          setFreezerStatus('failed');
          setFreezerResult('failed');
          setFreezerMinTempC(minC);
          setFreezerFinalTempC(finalC);
          setFreezerSignature(sig);
          persistProgress({
            stage: 4,
            freezerResult: 'failed',
            freezerMinTempC: minC,
            freezerFinalTempC: finalC,
            freezerSignature: sig,
          });
        }
        return;
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      amb?.stop();
      if (freezerAmbienceRef.current === amb) freezerAmbienceRef.current = null;
    };
  }, [
    freezerSpeed,
    freezerStatus,
    hasInsulation,
    hasLargeHeater,
    hasSmallHeater,
    installedParts,
    overMassLimit,
    persistProgress,
    stage,
  ]);

  // Trigger Final Reward Submission automatically upon entering Stage 5 when qualified
  const handleFinalizeQualification = useCallback(async () => {
    if (!isAllQualified || submittingReward || rewardState) return;
    setSubmittingReward(true);
    try {
      const res = await onCompleteMission({
        installedParts,
        shakerScore,
        freezerMinTempC: freezerMinTempC ?? CRYO_MIN_SAFE_C,
        freezerFinalTempC: freezerFinalTempC ?? CRYO_START_TEMP_C,
      });
      setRewardState(res);
      SFX.badgeUnlock();
      setCompletionModalOpen(true);
    } finally {
      setSubmittingReward(false);
    }
  }, [
    freezerFinalTempC,
    freezerMinTempC,
    installedParts,
    isAllQualified,
    onCompleteMission,
    rewardState,
    shakerScore,
    submittingReward,
  ]);

  useEffect(() => {
    if (stage === 5 && isAllQualified && !rewardState && !submittingReward) {
      void handleFinalizeQualification();
    }
  }, [handleFinalizeQualification, isAllQualified, rewardState, stage, submittingReward]);

  if (!visible) return null;

  const goStage = (targetStage: 1 | 2 | 3 | 4 | 5) => {
    SFX.click();
    setStage(targetStage);
    persistProgress({ stage: targetStage });
  };

  const handleFullReplay = () => {
    SFX.click();
    stopAllLabAudio();
    onReplayReset();
    setStage(2);
    setInstalledParts([]);
    setShakerResult('pending');
    setShakerScore(LEVEL4_SHAKER_BASE_SCORE);
    setShakerSignature('');
    setFreezerResult('pending');
    setFreezerMinTempC(null);
    setFreezerFinalTempC(null);
    setFreezerSignature('');
    setRewardState(null);
    setCompletionModalOpen(false);
    resetFreezerRun();
    setAssemblyFeedback({
      type: 'info',
      text: 'Workbench cleared for replay! Choose a balanced protection setup within 500 kg.',
    });
  };

  // Temperature line chart polyline calculation
  const chartPoints = tempHistory
    .map((pt) => {
      const x = 36 + (pt.t / CRYO_DURATION_SEC) * 324;
      // Map +50°C .. -80°C into y=16..136
      const norm = (50 - pt.temp) / 130;
      const y = Math.max(12, Math.min(140, 16 + norm * 120));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const minSafeY = 16 + ((50 - CRYO_MIN_SAFE_C) / 130) * 120; // -20°C line

  return (
    <div className="fixed inset-0 z-[2600] bg-[#040a18] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* TOP COMMAND HEADER */}
      <header className="h-14 px-3 md:px-5 bg-[#07132a] border-b border-cyan-400/30 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-400/50 text-orange-300 font-mono-tech text-[10px] font-bold">
            LVL 04
          </span>
          <h1 className="font-display text-xs sm:text-sm md:text-base font-extrabold tracking-wide text-white truncate">
            THE SHAKE &amp; FREEZE TEST
          </h1>
          <span className="hidden lg:inline text-[11px] font-mono-tech text-[#4fe3d4]">
            // MPR ENVIRONMENTAL LAB
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Audio Volume & Mute */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0b1b38] border border-cyan-400/25">
            <button
              type="button"
              onClick={() => {
                const next = SFX.toggleMute();
                setMuted(next);
                shakerAudioRef.current?.setMuted(next);
                freezerAmbienceRef.current?.setMuted(next);
              }}
              className="text-sm cursor-pointer"
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volumePct}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolumePct(v);
                SFX.setVolume(v / 100);
                shakerAudioRef.current?.setVolume(v / 100);
                freezerAmbienceRef.current?.setVolume(v / 100);
                if (v > 0 && muted) {
                  const next = SFX.toggleMute();
                  setMuted(next);
                  shakerAudioRef.current?.setMuted(next);
                  freezerAmbienceRef.current?.setMuted(next);
                }
              }}
              className="w-16 accent-[#4fe3d4] cursor-pointer"
            />
          </div>

          <DirectorVanceVoiceBanner
            compact
            quote="Protect our 400 kilogram satellite from launch shaking and minus 80 degree cryo space, keeping total mass under 500 kilograms!"
          />

          <div className="px-2.5 py-1 rounded-lg bg-[#0b1b38] border border-amber-400/35 font-mono-tech text-xs font-bold text-amber-300 tabular-nums">
            ★ {starCredits.toLocaleString()} SC
          </div>
          <div className="hidden md:flex px-2.5 py-1 rounded-lg bg-[#0b1b38] border border-cyan-400/35 font-mono-tech text-xs font-bold text-[#4fe3d4] tabular-nums">
            ⚡ {xp.toLocaleString()} XP
          </div>

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-xs font-bold text-amber-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              📖 Handbook
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              stopAllLabAudio();
              onBackToAcademy();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
          >
            Academy
          </button>
          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              stopAllLabAudio();
              onExit();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 text-xs font-bold text-red-200 cursor-pointer"
          >
            Exit ✕
          </button>
        </div>
      </header>

      {/* 4-STAGE VISUAL PROGRESS STEPPER */}
      <nav className="px-3 md:px-6 py-2 bg-[#061024] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
        {[
          { num: 2 as const, label: '1. Protection Assembly' },
          { num: 3 as const, label: '2. Shaker Test' },
          { num: 4 as const, label: '3. Freezer Test' },
          { num: 5 as const, label: '4. Qualification' },
        ].map((step, i) => {
          const isCurrent = stage === step.num || (stage === 1 && step.num === 2);
          const isDone =
            (step.num === 2 && installedParts.length > 0 && !overMassLimit && stage > 2) ||
            (step.num === 3 && shakerValidPassed) ||
            (step.num === 4 && freezerValidPassed) ||
            (step.num === 5 && isAllQualified);
          const clickable =
            step.num === 2 ||
            (step.num === 3 && !overMassLimit && installedParts.length > 0) ||
            (step.num === 4 && shakerValidPassed && !overMassLimit) ||
            (step.num === 5 && isAllQualified);

          return (
            <React.Fragment key={step.num}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && goStage(step.num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition ${
                  isCurrent
                    ? 'bg-[#4fe3d4] text-[#041022] border-[#4fe3d4]'
                    : isDone
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/25 cursor-pointer'
                    : clickable
                    ? 'bg-[#0b1830] text-slate-200 border-white/15 hover:border-cyan-400/50 cursor-pointer'
                    : 'bg-[#081226] text-slate-500 border-white/5 cursor-not-allowed'
                }`}
              >
                {isDone && !isCurrent ? '✓ ' : ''}
                {step.label}
              </button>
              {i < 3 && <span className="text-slate-600 font-bold">›</span>}
            </React.Fragment>
          );
        })}
      </nav>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 md:p-5">


        {/* ============================================================
            STAGE 2: SATELLITE PROTECTION ASSEMBLY
           ============================================================ */}
        {stage === 2 && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr_300px] gap-4">
            {/* LEFT: DRAGGABLE PROTECTION PARTS */}
            <section className="rounded-2xl bg-[#07142b] border border-cyan-400/30 p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono-tech font-bold uppercase text-[#4fe3d4]">
                  Protection Components (6)
                </span>
                <span className="text-[10px] text-slate-400">Drag or Click</span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[62vh] pr-0.5">
                {LEVEL4_PROTECTION_PARTS.map((part) => {
                  const isInstalled = installedParts.includes(part.id);
                  const isSelected = selectedPartId === part.id;
                  return (
                    <div
                      key={part.id}
                      onPointerDown={(e) => {
                        if (isInstalled) return;
                        // Allow pointer drag while also supporting click-select fallback
                        setSelectedPartId(part.id);
                        setDraggingPart(part);
                        setDragPos({ x: e.clientX, y: e.clientY });
                      }}
                      className={`p-2.5 rounded-xl border transition ${
                        isInstalled
                          ? 'bg-emerald-500/12 border-emerald-400/45'
                          : isSelected
                          ? 'bg-cyan-400/15 border-[#4fe3d4] cursor-grab active:cursor-grabbing'
                          : 'bg-[#0b1b38] border-white/12 hover:border-cyan-400/50 cursor-grab active:cursor-grabbing'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <ProtectionPartIconSVG id={part.id} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold text-white leading-snug">
                              {part.name}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1 font-mono-tech text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-[#050e20] text-amber-300 font-bold tabular-nums">
                                +{part.massKg} kg
                              </span>
                              {part.vibrationBonus > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#050e20] text-[#4fe3d4] font-bold">
                                  +{part.vibrationBonus} Vib
                                </span>
                              )}
                              {part.powerW > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-[#050e20] text-orange-300 font-bold">
                                  {part.powerW} W
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isInstalled ? (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => removeInstalledPart(part.id)}
                            className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 text-[10px] font-bold text-red-200 shrink-0 cursor-pointer"
                          >
                            Remove ✕
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-cyan-400/15 text-[#4fe3d4] text-[10px] font-bold shrink-0">
                            DRAG
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1.5 leading-snug">
                        {part.purpose}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* CENTER: INTERACTIVE SATELLITE DROP WORKBENCH */}
            <section className="rounded-2xl bg-[#07142b] border border-cyan-400/35 p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-[10px] font-mono-tech font-bold uppercase text-[#4fe3d4]">
                    COMMUNICATIONS SATELLITE WORKBENCH
                  </div>
                  <div className="text-xs text-slate-300">
                    {selectedPartId
                      ? `Selected: ${LEVEL4_PROTECTION_PARTS.find((p) => p.id === selectedPartId)?.shortName} — click matching bay or drag`
                      : `${installedParts.length} / 6 protection modules fitted`}
                  </div>
                </div>
                {alreadyCompleted && (
                  <button
                    type="button"
                    onClick={handleFullReplay}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-slate-300 cursor-pointer"
                  >
                    Clear Workbench ↺
                  </button>
                )}
              </div>

              {/* Satellite Visual + Interactive Snap Drop Zones */}
              <div
                ref={satDropRef}
                className="relative rounded-2xl bg-[#050e20] border border-cyan-400/30 p-3 min-h-[290px] flex items-center justify-center"
              >
                <CommsSatelliteDiagramSVG installedParts={installedParts} heaterGlowActive />

                {DROP_ZONES.map((zone) => {
                  const occupyingPart = LEVEL4_PROTECTION_PARTS.find((p) => p.id === zone.accepts);
                  const isFilled = installedParts.includes(zone.accepts);
                  const isHover = hoveredZoneId === zone.id;
                  const isWrong = wrongZoneId === zone.id;
                  const isMatchSelected = selectedPartId === zone.accepts;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => {
                        if (isFilled) {
                          removeInstalledPart(zone.accepts);
                          return;
                        }
                        if (selectedPartId) {
                          const part = LEVEL4_PROTECTION_PARTS.find((p) => p.id === selectedPartId);
                          if (part) attemptInstallInZone(part, zone.id);
                        } else if (occupyingPart) {
                          setAssemblyFeedback({
                            type: 'info',
                            text: `${zone.label} Bay accepts: ${occupyingPart.shortName} (+${occupyingPart.massKg} kg). Drag or select it from the left.`,
                          });
                        }
                      }}
                      style={{ left: `${zone.xPct}%`, top: `${zone.yPct}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-lg transition cursor-pointer whitespace-nowrap ${
                        isWrong
                          ? 'bg-red-500 text-white border-red-200 scale-110 animate-pulse'
                          : isFilled
                          ? 'bg-emerald-500/85 text-[#041022] border-emerald-200'
                          : isHover
                          ? 'bg-[#4fe3d4] text-[#041022] border-white scale-110'
                          : isMatchSelected
                          ? 'bg-amber-400/30 text-amber-100 border-amber-300 animate-pulse'
                          : 'bg-[#091834]/90 text-cyan-200 border-cyan-400/55 hover:border-white'
                      }`}
                    >
                      {isWrong ? `✕ Wrong Bay` : isFilled ? `✓ ${zone.label} ✕` : `+ ${zone.label}`}
                    </button>
                  );
                })}
              </div>

              {/* Assembly Feedback Banner */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  assemblyFeedback.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : assemblyFeedback.type === 'err'
                    ? 'bg-red-500/15 border-red-400/50 text-red-200'
                    : 'bg-[#0b1b38] border-cyan-400/30 text-slate-200'
                }`}
              >
                {assemblyFeedback.text}
              </div>
            </section>

            {/* RIGHT: LIVE MASS METER, TELEMETRY & PROCEED CTA */}
            <aside className="rounded-2xl bg-[#07142b] border border-cyan-400/30 p-4 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                {/* Mass Meter */}
                <div className="p-3.5 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-300">SATELLITE MASS</span>
                    <span
                      className={`font-mono-tech font-extrabold tabular-nums ${
                        overMassLimit
                          ? 'text-red-400'
                          : totalMassKg >= 475
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {totalMassKg} / {LEVEL4_MAX_MASS_KG} kg
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        overMassLimit
                          ? 'bg-red-500'
                          : totalMassKg >= 475
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width: `${Math.min(100, (totalMassKg / LEVEL4_MAX_MASS_KG) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[11px] font-mono-tech text-slate-400">
                    <span>Remaining: {Math.max(0, LEVEL4_MAX_MASS_KG - totalMassKg)} kg</span>
                    <span>Added: +{addedMassKg} kg</span>
                  </div>

                  {overMassLimit && (
                    <div className="mt-2.5 p-2 rounded-lg bg-red-500/20 border border-red-400 text-xs font-extrabold text-red-200 text-center">
                      ⚠ WEIGHT LIMIT EXCEEDED! Redesign under 500 kg.
                    </div>
                  )}
                </div>

                {/* Protection Metrics Summary */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-white/10 flex items-center justify-between">
                    <span className="text-slate-300">Vibration Protection</span>
                    <span
                      className={`font-mono-tech font-extrabold tabular-nums ${
                        liveVibrationScore >= LEVEL4_SHAKER_PASS_SCORE
                          ? 'text-emerald-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {liveVibrationScore} / {LEVEL4_SHAKER_PASS_SCORE}+ pts
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-white/10 flex items-center justify-between">
                    <span className="text-slate-300">Thermal Protection</span>
                    <span
                      className={`font-bold ${
                        hasInsulation ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {hasInsulation ? '✓ MLI BLANKET' : 'NONE'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-white/10 flex items-center justify-between">
                    <span className="text-slate-300">Heater Power</span>
                    <span className="font-mono-tech font-extrabold text-orange-300 tabular-nums">
                      {heaterWatts} W
                    </span>
                  </div>

                  {/* Installed Chips */}
                  <div className="p-2.5 rounded-xl bg-[#050e20] border border-white/10">
                    <div className="text-[10px] font-mono-tech text-slate-400 uppercase mb-1.5">
                      Installed Modules ({installedParts.length})
                    </div>
                    {installedParts.length === 0 ? (
                      <div className="text-[11px] text-slate-500">No protection installed yet</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {installedParts.map((pid) => {
                          const spec = LEVEL4_PROTECTION_PARTS.find((p) => p.id === pid);
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => removeInstalledPart(pid)}
                              className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-bold text-emerald-200 hover:bg-red-500/20 hover:border-red-400/50 cursor-pointer"
                              title="Click to remove"
                            >
                              {spec?.shortName || pid} ✕
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={overMassLimit || installedParts.length === 0}
                onClick={() => goStage(3)}
                className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wide transition ${
                  overMassLimit || installedParts.length === 0
                    ? 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] shadow-[0_8px_24px_rgba(79,227,212,0.35)] hover:brightness-110 cursor-pointer'
                }`}
              >
                {overMassLimit
                  ? 'REDUCE MASS TO ≤ 500 KG'
                  : installedParts.length === 0
                  ? 'ADD PROTECTION FIRST'
                  : 'CONTINUE TO SHAKER TEST ▶'}
              </button>
            </aside>
          </div>
        )}

        {/* ============================================================
            STAGE 3: SHAKER TABLE TEST
           ============================================================ */}
        {stage === 3 && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
            {/* LEFT: HYDRAULIC SHAKER RIG ANIMATION */}
            <section className="rounded-2xl bg-[#07142b] border border-cyan-400/35 p-4 md:p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono-tech font-bold uppercase text-orange-300">
                    TEST LAB A // HYDRAULIC RIG
                  </div>
                  <h2 className="font-display text-lg font-extrabold text-white">
                    SHAKER TABLE TEST
                  </h2>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono-tech font-bold border ${
                    shakerRunning
                      ? 'bg-orange-500/20 border-orange-400 text-orange-200 animate-pulse'
                      : shakerValidPassed
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : shakerResult === 'failed'
                      ? 'bg-red-500/20 border-red-400 text-red-200'
                      : 'bg-slate-800 border-white/15 text-slate-300'
                  }`}
                >
                  {shakerRunning
                    ? 'TESTING...'
                    : shakerValidPassed
                    ? 'PASSED ✓'
                    : shakerResult === 'failed'
                    ? 'FAILED ✕'
                    : 'STANDBY'}
                </span>
              </div>

              {/* Hydraulic Shaker Platform Visual + Live Vibration Wave */}
              <div className="relative rounded-2xl bg-[#040c1b] border border-cyan-400/25 p-4 flex flex-col items-center justify-end min-h-[300px] overflow-hidden">
                {/* Oscilloscope SVG trace */}
                <svg viewBox="0 0 300 44" className="w-full h-11 mb-1 opacity-85">
                  <path
                    d={Array.from({ length: 30 }, (_, idx) => {
                      const x = idx * 10.3;
                      const ampWave = shakerRunning ? Math.max(4, shakerIntensity * 0.16) : 2;
                      const y = 22 + Math.sin(idx * 1.1 + shakerProgressPct * 0.45) * ampWave;
                      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(' ')}
                    stroke={shakerRunning ? '#fb923c' : '#4fe3d4'}
                    strokeWidth="2.2"
                    fill="none"
                  />
                </svg>

                <CommsSatelliteDiagramSVG
                  installedParts={installedParts}
                  shakeOffsetX={shakerJitter.x}
                  shakeOffsetY={shakerJitter.y}
                  shakeRotDeg={shakerJitter.rot}
                />

                {/* Shaker Clamp Table + Hydraulic Pistons */}
                <div
                  className="w-64 h-4 rounded bg-gradient-to-r from-slate-600 via-amber-400 to-slate-600 border border-white/30 shadow-lg"
                  style={{
                    transform: `translate(${shakerJitter.x * 0.6}px, ${shakerJitter.y * 0.5}px)`,
                  }}
                />
                <div className="w-56 flex justify-around">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-5 h-7 bg-slate-700 border-x border-cyan-400/40"
                    />
                  ))}
                </div>
                <div className="w-72 h-3 rounded-t bg-slate-800 border-t border-cyan-400/30" />
              </div>

              {/* Oscilloscope Wave + Frequency Progress */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono-tech">
                <div className="p-3 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Frequency</div>
                  <div className="text-lg font-extrabold text-[#4fe3d4] tabular-nums">
                    {shakerFreqHz} Hz
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Vibration Intensity</div>
                  <div className="text-lg font-extrabold text-orange-300 tabular-nums">
                    {shakerIntensity}%
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono-tech text-slate-300 mb-1">
                  <span>Test Progress</span>
                  <span className="tabular-nums">{shakerProgressPct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-[#4fe3d4] transition-all duration-100"
                    style={{ width: `${shakerProgressPct}%` }}
                  />
                </div>
              </div>
            </section>

            {/* RIGHT: SHAKER SCORE, DIAGNOSTICS & EDUCATION */}
            <section className="rounded-2xl bg-[#07142b] border border-cyan-400/30 p-4 md:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-[#050e20] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono-tech uppercase text-slate-400">
                      VIBRATION RESISTANCE
                    </div>
                    <div className="font-mono-tech text-2xl font-black text-white tabular-nums">
                      {liveVibrationScore}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {LEVEL4_SHAKER_PASS_SCORE} req
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono-tech text-xs text-slate-300">
                    <div>Base: {LEVEL4_SHAKER_BASE_SCORE} pts</div>
                    <div className="text-[#4fe3d4]">
                      Added: +{liveVibrationScore - LEVEL4_SHAKER_BASE_SCORE} pts
                    </div>
                  </div>
                </div>

                {shakerValidPassed && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-xs text-emerald-100 space-y-1">
                    <div className="font-extrabold text-emerald-300">
                      ✓ SHAKER TABLE TEST PASSED!
                    </div>
                    <p>Structure held firm up to 65 Hz liftoff shaking.</p>
                  </div>
                )}

                {shakerResult === 'failed' && !shakerRunning && (
                  <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-400/50 text-xs text-red-100 space-y-1">
                    <div className="font-extrabold text-red-300">
                      ✕ SHAKER TABLE TEST FAILED! ({shakerScore} / 70 pts)
                    </div>
                    <p>
                      Needs stronger damping! Add Vibration Isolation Mounts (+35) or Structural
                      Reinforcement (+25).
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25 space-y-1">
                  <div className="text-xs font-extrabold text-[#4fe3d4]">
                    Why is vibration testing important?
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Launch rockets shake violently. Mounts and reinforced frames protect sensitive
                    electronics before reaching space.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={shakerRunning || overMassLimit}
                  onClick={() => {
                    setShakerProgressPct(0);
                    setShakerRunning(true);
                  }}
                  className={`w-full py-3 rounded-xl font-extrabold text-xs md:text-sm uppercase tracking-wide transition ${
                    shakerRunning || overMassLimit
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-400 to-amber-400 text-[#041022] hover:brightness-110 cursor-pointer'
                  }`}
                >
                  {shakerRunning
                    ? 'SHAKER RUNNING...'
                    : shakerValidPassed
                    ? 'RE-RUN SHAKER TEST ↺'
                    : 'START SHAKER TABLE TEST ▶'}
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={shakerRunning}
                    onClick={() => goStage(2)}
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    ‹ REDESIGN SATELLITE
                  </button>
                  <button
                    type="button"
                    disabled={!shakerValidPassed || shakerRunning}
                    onClick={() => goStage(4)}
                    className={`py-2.5 rounded-xl font-extrabold text-xs uppercase transition ${
                      shakerValidPassed && !shakerRunning
                        ? 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] hover:brightness-110 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    CONTINUE TO FREEZER TEST ▶
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            STAGE 4: FREEZER ROOM TEST (CRYO-VAC CHAMBER)
           ============================================================ */}
        {stage === 4 && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4">
            {/* LEFT: FROSTED CRYO CHAMBER */}
            <section className="rounded-2xl bg-[#06132b] border border-sky-400/40 p-4 md:p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] font-mono-tech font-bold uppercase text-sky-300">
                    TEST LAB B // -80°C CRYO-VAC CHAMBER
                  </div>
                  <h2 className="font-display text-lg font-extrabold text-white">
                    FREEZER ROOM TEST
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFreezerSpeed((s) => (s === 1 ? 2 : 1))}
                    className="px-2.5 py-1 rounded-lg bg-[#0b1d3e] border border-sky-400/40 font-mono-tech text-xs font-bold text-sky-200 cursor-pointer"
                  >
                    {freezerSpeed}x Speed
                  </button>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono-tech font-bold border ${
                      freezerStatus === 'running'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 animate-pulse'
                        : freezerValidPassed
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : freezerStatus === 'failed' || freezerResult === 'failed'
                        ? 'bg-red-500/20 border-red-400 text-red-200'
                        : 'bg-slate-800 border-white/15 text-slate-300'
                    }`}
                  >
                    {freezerStatus === 'running'
                      ? 'FREEZING'
                      : freezerStatus === 'paused'
                      ? 'PAUSED'
                      : freezerValidPassed
                      ? 'PASSED ✓'
                      : freezerStatus === 'failed' || freezerResult === 'failed'
                      ? 'FAILED ✕'
                      : 'READY'}
                  </span>
                </div>
              </div>

              {/* Frosted Cryo Chamber + Thermometer Gauge Visual */}
              <div
                className="relative rounded-2xl border border-sky-300/35 p-4 flex items-center justify-center gap-3 min-h-[270px] overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle at 50% 35%, rgba(56,189,248,0.22), rgba(4,12,28,0.98) 72%)',
                }}
              >
                {/* Ice Crystal Particles */}
                <div className="absolute inset-0 pointer-events-none opacity-65">
                  {[12, 28, 44, 62, 78, 90].map((leftPct, i) => (
                    <span
                      key={i}
                      style={{ left: `${leftPct}%`, top: `${12 + (i % 3) * 26}%` }}
                      className="absolute text-sky-200/70 text-xs"
                    >
                      ❄
                    </span>
                  ))}
                </div>

                {/* Vertical Thermometer Gauge SVG */}
                <svg viewBox="0 0 42 180" className="w-10 h-44 shrink-0 relative z-10">
                  <rect x="14" y="10" width="14" height="140" rx="7" fill="#041022" stroke="#38bdf8" strokeWidth="1.8" />
                  <circle cx="21" cy="158" r="14" fill="#041022" stroke="#38bdf8" strokeWidth="1.8" />
                  {(() => {
                    const norm = Math.max(0.05, Math.min(1, (freezerTempC + 80) / 130));
                    const fillH = norm * 130;
                    const fillColor =
                      freezerTempC < CRYO_MIN_SAFE_C
                        ? '#ef4444'
                        : freezerTempC < 0
                        ? '#38bdf8'
                        : '#f97316';
                    return (
                      <>
                        <rect
                          x="17"
                          y={146 - fillH}
                          width="8"
                          height={fillH + 6}
                          rx="4"
                          fill={fillColor}
                        />
                        <circle cx="21" cy="158" r="9.5" fill={fillColor} />
                      </>
                    );
                  })()}
                  {/* -20C safe line marker */}
                  <line x1="10" y1="86" x2="32" y2="86" stroke="#f87171" strokeWidth="1.8" strokeDasharray="3 2" />
                </svg>

                <div className="flex-1 flex flex-col items-center relative z-10">
                  <CommsSatelliteDiagramSVG
                    installedParts={installedParts}
                    heaterGlowActive={freezerStatus === 'running' || heaterWatts > 0}
                    frostLevel={Math.max(0, (CRYO_START_TEMP_C - freezerTempC) / 60)}
                  />
                  <div className="mt-1 px-3 py-1 rounded-full bg-[#040d1e]/90 border border-sky-400/35 text-[10px] font-mono-tech text-sky-200 text-center">
                    Chamber: -80°C • Safe Floor: -20°C • Educational Thermal Model
                  </div>
                </div>
              </div>

              {/* Live Telemetry Strip */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono-tech">
                <div className="p-2.5 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="text-[10px] text-slate-400">CORE TEMP</div>
                  <div
                    className={`text-base font-extrabold tabular-nums ${
                      freezerTempC < CRYO_MIN_SAFE_C
                        ? 'text-red-400'
                        : freezerTempC < 0
                        ? 'text-sky-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {freezerTempC.toFixed(1)}°C
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="text-[10px] text-slate-400">HEATER</div>
                  <div className="text-base font-extrabold text-orange-300 tabular-nums">
                    {heaterWatts > 0 ? `${heaterWatts} W ON` : 'OFF'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="text-[10px] text-slate-400">BLANKET</div>
                  <div
                    className={`text-sm font-extrabold ${
                      hasInsulation ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {hasInsulation ? 'MLI ON' : 'NONE'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="text-[10px] text-slate-400">TIMER</div>
                  <div className="text-base font-extrabold text-white tabular-nums">
                    {Math.floor(freezerElapsedSec)}/{CRYO_DURATION_SEC}s
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT: LIVE TEMPERATURE GRAPH, CONTROLS & EXPLANATION */}
            <section className="rounded-2xl bg-[#07142b] border border-cyan-400/30 p-4 md:p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                {/* Live Temperature SVG Chart */}
                <div className="p-3 rounded-xl bg-[#050e20] border border-white/10">
                  <div className="flex justify-between text-[10px] font-mono-tech text-slate-400 mb-1">
                    <span>CORE TEMPERATURE (°C vs TIME)</span>
                    <span className="tabular-nums">Min: {freezerMinObservedC.toFixed(1)}°C</span>
                  </div>
                  <svg viewBox="0 0 375 152" className="w-full h-36">
                    <rect
                      x="36"
                      y="16"
                      width="324"
                      height={minSafeY - 16}
                      fill="#10b981"
                      fillOpacity="0.1"
                    />
                    <line
                      x1="36"
                      y1={minSafeY}
                      x2="360"
                      y2={minSafeY}
                      stroke="#f87171"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text x="4" y="21" fill="#94a3b8" fontSize="9">
                      +50°
                    </text>
                    <text x="4" y={minSafeY + 3} fill="#f87171" fontSize="9" fontWeight="bold">
                      -20°
                    </text>
                    <text x="4" y="138" fill="#38bdf8" fontSize="9">
                      -80°
                    </text>
                    <polyline
                      fill="none"
                      stroke="#4fe3d4"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPoints}
                    />
                  </svg>
                </div>

                {freezerValidPassed && freezerStatus !== 'running' && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-xs text-emerald-100">
                    <div className="font-extrabold text-emerald-300">
                      ✓ FREEZER ROOM TEST PASSED!
                    </div>
                    <p className="mt-0.5">
                      Safe electronics remained ≥ -20°C across the full 60s cryo test!
                    </p>
                  </div>
                )}

                {(freezerStatus === 'failed' || (freezerResult === 'failed' && freezerStatus === 'idle')) && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/50 text-xs text-red-100 space-y-2">
                    <div>
                      <div className="font-extrabold text-red-300">
                        ✕ FREEZER ROOM TEST FAILED!
                      </div>
                      <p className="mt-0.5">
                        Core dropped below -20°C! Combine <strong>Thermal Insulation</strong> with an{' '}
                        <strong>Electrical Heater</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goStage(2)}
                      className="px-3 py-1.5 rounded-lg bg-red-400/20 hover:bg-red-400/35 border border-red-300/50 text-[11px] font-extrabold text-red-100 uppercase cursor-pointer"
                    >
                      REDESIGN SATELLITE ↺
                    </button>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#0b1b38] border border-sky-400/25 space-y-1">
                  <div className="text-xs font-extrabold text-sky-300">
                    Why do satellites need heaters &amp; insulation?
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Insulation blankets slow heat loss like a thermos, while electrical heaters
                    warm vital electronics in deep freeze.
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  {freezerStatus === 'idle' || freezerStatus === 'passed' || freezerStatus === 'failed' ? (
                    <button
                      type="button"
                      disabled={overMassLimit}
                      onClick={() => {
                        resetFreezerRun();
                        SFX.freezerDoor();
                        window.setTimeout(() => setFreezerStatus('running'), 80);
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-[#4fe3d4] text-[#041022] font-extrabold text-xs md:text-sm uppercase tracking-wide hover:brightness-110 transition cursor-pointer"
                    >
                      {freezerValidPassed ? 'RE-RUN FREEZER TEST ↺' : 'START FREEZER TEST ▶'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setFreezerStatus((s) => (s === 'running' ? 'paused' : 'running'))
                      }
                      className="flex-1 py-3 rounded-xl bg-amber-400 text-[#041022] font-extrabold text-xs md:text-sm uppercase tracking-wide cursor-pointer"
                    >
                      {freezerStatus === 'running' ? 'PAUSE TEST ❚❚' : 'RESUME TEST ▶'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={resetFreezerRun}
                    className="px-4 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    RESTART
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => goStage(2)}
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    ‹ REDESIGN SATELLITE
                  </button>
                  <button
                    type="button"
                    disabled={!isAllQualified}
                    onClick={() => goStage(5)}
                    className={`py-2.5 rounded-xl font-extrabold text-xs uppercase transition ${
                      isAllQualified
                        ? 'bg-gradient-to-r from-emerald-400 to-[#4fe3d4] text-[#041022] hover:brightness-110 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Final Qualification ▶
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            STAGE 5: FINAL QUALIFICATION & LEARNING SUMMARY
           ============================================================ */}
        {stage === 5 && (
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#07142b] border border-emerald-400/50 p-6 md:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.75)] text-center space-y-5">
            <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2.5px] text-emerald-300">
              STAGE 4 // FINAL SATELLITE QUALIFICATION
            </div>

            {isAllQualified ? (
              <>
                <h2 className="font-display text-2xl md:text-3xl font-black text-white">
                  ALL ENVIRONMENTAL TESTS PASSED!
                </h2>
                <p className="text-sm font-bold text-[#4fe3d4]">
                  YOUR SATELLITE IS READY FOR ITS JOURNEY INTO SPACE!
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-black text-amber-300">
                  SATELLITE QUALIFICATION FAILED!
                </h2>
                <p className="text-xs text-slate-300">
                  Shaker Test, Freezer Test, and 500 kg Mass Limit must all pass together.
                </p>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
              <div
                className={`p-3.5 rounded-xl border ${
                  shakerValidPassed
                    ? 'bg-emerald-500/12 border-emerald-400/45'
                    : 'bg-red-500/12 border-red-400/45'
                }`}
              >
                <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                  Shaker Table Test
                </div>
                <div className="font-extrabold text-sm text-white mt-1">
                  {shakerValidPassed ? 'PASSED ✓' : 'FAILED ✕'}
                </div>
                <div className="text-xs font-mono-tech text-emerald-300 mt-0.5 tabular-nums">
                  {shakerScore} pts (≥ 70)
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  freezerValidPassed
                    ? 'bg-emerald-500/12 border-emerald-400/45'
                    : 'bg-red-500/12 border-red-400/45'
                }`}
              >
                <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                  Freezer Room Test
                </div>
                <div className="font-extrabold text-sm text-white mt-1">
                  {freezerValidPassed ? 'PASSED ✓' : 'FAILED ✕'}
                </div>
                <div className="text-xs font-mono-tech text-sky-300 mt-0.5 tabular-nums">
                  Min: {freezerMinTempC !== null ? `${freezerMinTempC.toFixed(1)}°C` : '--'}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  !overMassLimit
                    ? 'bg-emerald-500/12 border-emerald-400/45'
                    : 'bg-red-500/12 border-red-400/45'
                }`}
              >
                <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                  Satellite Mass
                </div>
                <div className="font-extrabold text-sm text-white mt-1">
                  {!overMassLimit ? 'PASSED ✓' : 'OVER LIMIT ✕'}
                </div>
                <div className="text-xs font-mono-tech text-amber-300 mt-0.5 tabular-nums">
                  {totalMassKg} / 500 kg
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  isAllQualified
                    ? 'bg-emerald-500/15 border-emerald-400'
                    : 'bg-red-500/15 border-red-400'
                }`}
              >
                <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                  Final Qualification
                </div>
                <div className="font-extrabold text-sm text-white mt-1">
                  {isAllQualified ? 'PASSED ✓' : 'FAILED ✕'}
                </div>
                <div className="text-xs font-mono-tech text-[#4fe3d4] mt-0.5">
                  {isAllQualified ? 'FLIGHT CERTIFIED' : 'REDESIGN NEEDED'}
                </div>
              </div>
            </div>

            {/* What You Learned */}
            <div className="p-4 rounded-xl bg-[#050e20] border border-cyan-400/25 text-left">
              <div className="text-xs font-mono-tech font-bold uppercase text-[#4fe3d4] mb-2">
                WHAT YOU LEARNED
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
                <div className="p-2.5 rounded-lg bg-[#0b1b38]">
                  <strong className="text-white block mb-0.5">Vibration Control</strong>
                  Mounts &amp; light trusses dampen launch shaking better than heavy armor alone.
                </div>
                <div className="p-2.5 rounded-lg bg-[#0b1b38]">
                  <strong className="text-white block mb-0.5">Thermal Defense</strong>
                  Gold MLI blankets trap heat so heaters stay efficient in freezing space.
                </div>
                <div className="p-2.5 rounded-lg bg-[#0b1b38]">
                  <strong className="text-white block mb-0.5">Mass &amp; Power Balance</strong>
                  Smart aerospace design meets every safety goal under the 500 kg ceiling.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {isAllQualified ? (
                <button
                  type="button"
                  onClick={() => setCompletionModalOpen(true)}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#f2c14e] to-[#f97316] text-[#041022] font-extrabold text-xs md:text-sm uppercase cursor-pointer"
                >
                  VIEW MISSION CREDENTIAL ★
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goStage(2)}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm uppercase cursor-pointer"
                >
                  REDESIGN AND RETRY ↺
                </button>
              )}
              <button
                type="button"
                onClick={handleFullReplay}
                className="px-5 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 uppercase cursor-pointer"
              >
                Replay Level 4 ↺
              </button>
            </div>
          </div>
        )}
      </main>

      {/* DRAGGING GHOST UNDER POINTER */}
      {draggingPart && dragPos && (
        <div
          style={{ left: dragPos.x + 12, top: dragPos.y + 12 }}
          className="fixed z-[3000] pointer-events-none px-3 py-1.5 rounded-xl bg-[#07142b]/95 border-2 border-[#4fe3d4] text-xs font-extrabold text-white shadow-[0_12px_30px_rgba(0,0,0,0.85)]"
        >
          {draggingPart.shortName} (+{draggingPart.massKg} kg)
        </div>
      )}

      {/* CELEBRATION & REWARD MODAL */}
      {completionModalOpen && (
        <>
          <ConfettiCanvas />
          <div className="fixed inset-0 z-[5600] bg-black/82 flex items-center justify-center p-4">
            <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-[#07142b] border border-amber-400/55 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.9)] animate-[popIn_0.35s_ease-out]">
              <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2.5px] text-[#4fe3d4]">
                MISSION 004 COMPLETED!
              </div>
              <h2 className="font-display text-xl md:text-2xl font-black text-amber-300 mt-1">
                CONGRATULATIONS, ENGINEER!
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Your protected communications satellite is flying safely into space!
              </p>

              {/* Floating Safe Satellite + Badge */}
              <div className="my-3 grid grid-cols-2 gap-2 items-center rounded-xl bg-[#050e20] border border-cyan-400/25 p-2">
                <div className="animate-[floatHover_3.6s_ease-in-out_infinite]">
                  <CommsSatelliteDiagramSVG installedParts={installedParts} heaterGlowActive compact />
                </div>
                <div className="flex justify-center">
                  <ThermalProtectionEngineerBadgeSVG size={126} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0b1b38] border border-amber-400/35">
                  <div className="text-[10px] uppercase text-slate-400">Star Credits</div>
                  <div className="font-mono-tech text-base font-extrabold text-amber-300 tabular-nums">
                    {rewardState?.alreadyRewarded ? 'Already Claimed' : '+750 SC'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/35">
                  <div className="text-[10px] uppercase text-slate-400">Engineering XP</div>
                  <div className="font-mono-tech text-base font-extrabold text-[#4fe3d4] tabular-nums">
                    {rewardState?.alreadyRewarded ? 'Certified ✓' : '+100 XP'}
                  </div>
                </div>
              </div>

              <div className="mb-4 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-xs font-bold text-emerald-200">
                🔓 Level 5 Unlocked in Training Academy
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    stopAllLabAudio();
                    setCompletionModalOpen(false);
                    onContinueToLevel5();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm uppercase cursor-pointer"
                >
                  RETURN TO LEVEL MAP ▶
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleFullReplay}
                    className="py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 uppercase cursor-pointer"
                  >
                    Replay Level 4 ↺
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      stopAllLabAudio();
                      setCompletionModalOpen(false);
                      onBackToAcademy();
                    }}
                    className="py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 uppercase cursor-pointer"
                  >
                    Back to Academy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
