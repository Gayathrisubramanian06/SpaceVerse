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
  LunarSimTrialReport,
  runLunarOrbiterSimulation,
  SelectedLunarBuild,
  serializeLunarBuild,
  StoredLevel8Progress,
} from '../utils/lunarWaterData';
import { formatCountdownClock } from '../utils/europaMissionData';
import { LaunchSequenceStatus, RocketPartId, STORE_ITEMS } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { RocketAssemblyStage } from './RocketAssemblyStage';
import { LaunchpadPayloadStage } from './LaunchpadPayloadStage';
import { LunarWaterExplorerBadgeSVG } from './BadgesSVG';
import { LunarSurfaceExplorer3D } from './LunarSurfaceExplorer3D';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';
import { LunarFlightAndLandingSim } from './LunarFlightAndLandingSim';
import lunarSouthPoleBannerImg from '../assets/images/lunar_south_pole_banner_1794826491936.jpg';
import lunarOrbiterHangarImg from '../assets/images/lunar_orbiter_hangar_1794826493343.jpg';
import lunarOrbiterHardwareImg from '../assets/images/lunar_orbiter_hardware_1794826493439.jpg';
import lunarThrusterPropellantImg from '../assets/images/lunar_thruster_propellant_1794826493618.jpg';

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
  { id: 1, label: '1 Build & Sim' },
  { id: 3, label: '2 Launch' },
  { id: 4, label: '3 Orbit & Land' },
  { id: 5, label: '4 Moon 3D' },
  { id: 6, label: '5 Transmit' },
];

/* ========================================================
   SUBSYSTEM SLOT ICON SVG
   ======================================================== */
const LunarCategoryIconSVG: React.FC<{ category: LunarCategoryId; active?: boolean }> = ({
  category,
  active,
}) => {
  const stroke = active ? '#4fe3d4' : '#7dd3fc';
  if (category === 'body') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <polygon points="9,6 23,6 28,16 23,26 9,26 4,16" fill="#081733" stroke={stroke} strokeWidth="2" />
        <rect x="11" y="11" width="10" height="10" rx="2" fill={stroke} fillOpacity="0.25" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (category === 'instruments') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="7" y="6" width="18" height="12" rx="2.5" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <circle cx="16" cy="12" r="3.5" fill={stroke} fillOpacity="0.35" stroke={stroke} strokeWidth="1.5" />
        <path d="M11 18 L6 27 H26 L21 18" fill={stroke} fillOpacity="0.22" />
      </svg>
    );
  }
  if (category === 'comms') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <path d="M7 14 Q16 24 25 14" stroke={stroke} strokeWidth="2.2" fill="#081733" />
        <line x1="16" y1="19" x2="16" y2="7" stroke="#e2e8f0" strokeWidth="1.6" />
        <circle cx="16" cy="7" r="2" fill="#fbbf24" />
        <path d="M10 5 Q16 1 22 5" stroke={stroke} strokeWidth="1.4" />
      </svg>
    );
  }
  if (category === 'power') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="2" y="10" width="10" height="12" rx="1.5" fill="#1d4ed8" stroke={stroke} strokeWidth="1.4" />
        <rect x="20" y="10" width="10" height="12" rx="1.5" fill="#1d4ed8" stroke={stroke} strokeWidth="1.4" />
        <polygon points="17,8 13,16 16.5,16 15,24 20,15 16.5,15" fill="#fbbf24" />
      </svg>
    );
  }
  if (category === 'propulsion') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="11" y="5" width="10" height="7" rx="1.5" fill="#1e293b" stroke={stroke} strokeWidth="1.6" />
        <polygon points="11,12 21,12 24,22 8,22" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <path d="M12 22 Q16 29 20 22" fill="#38bdf8" />
      </svg>
    );
  }
  if (category === 'navigation') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <circle cx="16" cy="16" r="10" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <polygon points="16,8 18.5,16 16,19 13.5,16" fill="#4fe3d4" />
        <circle cx="16" cy="16" r="2" fill="#fbbf24" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
      <rect x="9" y="5" width="14" height="22" rx="6" fill="#081733" stroke={stroke} strokeWidth="1.8" />
      <rect x="11.5" y="13" width="9" height="11" rx="3" fill="#38bdf8" fillOpacity="0.8" />
    </svg>
  );
};

/* ========================================================
   TELEMETRY MICRO-INSTRUMENT GRAPHIC SVG
   ======================================================== */
const LunarTelemetryGaugeSVG: React.FC<{
  kind: 'mass' | 'power' | 'optics' | 'flight';
  tone: 'idle' | 'ok' | 'fail';
}> = ({ kind, tone }) => {
  const color = tone === 'ok' ? '#34d399' : tone === 'fail' ? '#fb7185' : '#64748b';
  if (kind === 'mass') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="5" y="21" width="22" height="5" rx="2" fill="#030b1b" stroke={color} strokeWidth="1.6" />
        <polygon points="10,21 22,21 20,11 12,11" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.6" />
        <circle cx="16" cy="8" r="2.5" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'power') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="4" y="9" width="21" height="14" rx="2.5" fill="#030b1b" stroke={color} strokeWidth="1.6" />
        <rect x="25" y="13" width="3" height="6" rx="1" fill={color} />
        <rect x="7" y="12" width={tone === 'fail' ? 5 : tone === 'idle' ? 9 : 15} height="8" rx="1" fill={color} fillOpacity="0.85" />
      </svg>
    );
  }
  if (kind === 'optics') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <circle cx="16" cy="14" r="8" fill="#030b1b" stroke={color} strokeWidth="1.6" />
        <circle cx="16" cy="14" r="3.5" fill={color} fillOpacity="0.65" />
        <path d="M10 21 L6 28 H26 L22 21" fill={color} fillOpacity="0.22" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
      <circle cx="8" cy="24" r="3" fill={color} />
      <path d="M8 17 A7 7 0 0 1 15 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11 A13 13 0 0 1 21 24" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={tone === 'fail' ? 0.3 : 1} />
      <path d="M8 5 A19 19 0 0 1 27 24" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={tone !== 'ok' ? 0.25 : 1} />
    </svg>
  );
};

/* ========================================================
   LARGE HARDWARE ILLUSTRATION SVG (CARDS)
   ======================================================== */
const LunarPartIconSVG: React.FC<{ optionId: string }> = ({ optionId }) => {
  if (optionId.startsWith('l_body_')) {
    const isComp = optionId === 'l_body_comp';
    const isTi = optionId === 'l_body_ti';
    const stroke = isComp ? '#4fe3d4' : isTi ? '#fbbf24' : '#cbd5e1';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
        <polygon
          points="56,22 144,22 168,58 144,94 56,94 32,58"
          fill="#07152e"
          stroke={stroke}
          strokeWidth={isTi ? '4' : '2.6'}
        />
        {isComp ? (
          <>
            <polygon points="65,30 135,30 155,58 135,86 65,86 45,58" fill="#4fe3d4" fillOpacity="0.14" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="5 3" />
            <rect x="78" y="42" width="44" height="32" rx="4" fill="#040d1e" stroke="#4fe3d4" strokeWidth="1.6" />
          </>
        ) : isTi ? (
          <>
            <polygon points="65,30 135,30 155,58 135,86 65,86 45,58" fill="#fbbf24" fillOpacity="0.14" stroke="#f59e0b" strokeWidth="2.2" />
            {[46, 62, 138, 154].map((x) => (
              <circle key={x} cx={x} cy="58" r="3" fill="#fde047" />
            ))}
          </>
        ) : (
          <rect x="74" y="40" width="52" height="36" rx="3" fill="#0b1d3d" stroke="#94a3b8" strokeWidth="1.6" />
        )}
      </svg>
    );
  }
  if (optionId.startsWith('l_inst_')) {
    const isNeutron = optionId === 'l_inst_neutron';
    const isIr = optionId === 'l_inst_ir';
    const stroke = isNeutron ? '#4fe3d4' : isIr ? '#fbbf24' : '#94a3b8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
        <rect x="64" y="20" width="72" height="36" rx="6" fill="#07152e" stroke={stroke} strokeWidth="2.4" />
        <circle cx="100" cy="38" r="11" fill="#040d1e" stroke={stroke} strokeWidth="2" />
        <circle cx="100" cy="38" r="5" fill={stroke} />
        {isNeutron ? (
          <>
            <path d="M74 56 L50 100 H150 L126 56 Z" fill="#4fe3d4" fillOpacity="0.18" />
            <path d="M62 76 Q100 92 138 76" stroke="#4fe3d4" strokeWidth="2" strokeDasharray="4 3" />
            <path d="M54 90 Q100 106 146 90" stroke="#38bdf8" strokeWidth="2" />
          </>
        ) : isIr ? (
          <>
            <path d="M80 56 L66 96 H134 L120 56 Z" fill="#f59e0b" fillOpacity="0.18" />
            <line x1="100" y1="56" x2="100" y2="96" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 3" />
          </>
        ) : (
          <path d="M86 56 L76 92 H124 L114 56 Z" fill="#94a3b8" fillOpacity="0.16" />
        )}
      </svg>
    );
  }
  if (optionId.startsWith('l_comms_')) {
    const isHga = optionId === 'l_comms_hga';
    const isHelix = optionId === 'l_comms_helix';
    const stroke = isHga ? '#4fe3d4' : isHelix ? '#fbbf24' : '#f87171';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
        {optionId === 'l_comms_whip' ? (
          <>
            <rect x="86" y="78" width="28" height="16" rx="3" fill="#0b1730" stroke="#94a3b8" strokeWidth="1.8" />
            <line x1="100" y1="78" x2="100" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
            <circle cx="100" cy="18" r="5" fill={stroke} />
          </>
        ) : isHelix ? (
          <>
            <line x1="100" y1="92" x2="100" y2="26" stroke="#94a3b8" strokeWidth="3.5" />
            <path d="M84 68 C116 68, 84 52, 116 52 C84 52, 116 36, 100 26" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M52 54 Q100 94 148 54" stroke={stroke} strokeWidth="4.5" fill="#0a1f42" />
            <line x1="100" y1="74" x2="100" y2="28" stroke="#e2e8f0" strokeWidth="2.4" />
            <circle cx="100" cy="26" r="4.5" fill="#fbbf24" />
            <path d="M76 17 Q100 6 124 17" stroke={stroke} strokeWidth="2" />
          </>
        )}
      </svg>
    );
  }
  if (optionId.startsWith('l_pow_')) {
    const isDual = optionId === 'l_pow_dual';
    const isHeavy = optionId === 'l_pow_heavy';
    const stroke = isDual ? '#4fe3d4' : isHeavy ? '#fbbf24' : '#94a3b8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
        {optionId === 'l_pow_strip' ? (
          <>
            <rect x="66" y="34" width="68" height="48" rx="6" fill="#07152e" stroke={stroke} strokeWidth="2" />
            <rect x="76" y="44" width="48" height="12" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
            <rect x="76" y="62" width="48" height="12" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
          </>
        ) : (
          <>
            <rect x="24" y="34" width="56" height="46" rx="4" fill="#1d4ed8" stroke={stroke} strokeWidth="2" />
            <rect x="120" y="34" width="56" height="46" rx="4" fill="#1d4ed8" stroke={stroke} strokeWidth="2" />
            <line x1="80" y1="57" x2="120" y2="57" stroke="#cbd5e1" strokeWidth="3.5" />
            <rect x="86" y="38" width="28" height="38" rx="4" fill="#07152e" stroke={stroke} strokeWidth="2" />
            <polygon points="102,43 94,57 100,57 97,71 108,54 102,54" fill="#fef08a" />
          </>
        )}
      </svg>
    );
  }
  if (optionId.startsWith('l_prop_')) {
    const isBiprop = optionId === 'l_prop_biprop';
    const isHeavy = optionId === 'l_prop_heavy';
    const stroke = isBiprop ? '#4fe3d4' : isHeavy ? '#fbbf24' : '#94a3b8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
        {isHeavy ? (
          <>
            <rect x="54" y="20" width="92" height="22" rx="4" fill="#1e293b" stroke={stroke} strokeWidth="2" />
            <polygon points="62,42 88,42 96,76 54,76" fill="#0b1830" stroke={stroke} strokeWidth="2.2" />
            <polygon points="112,42 138,42 146,76 104,76" fill="#0b1830" stroke={stroke} strokeWidth="2.2" />
            <path d="M62 76 Q75 104 88 76" fill="#fb923c" />
            <path d="M112 76 Q125 104 138 76" fill="#fb923c" />
          </>
        ) : (
          <>
            <rect x="74" y="18" width="52" height="24" rx="4" fill="#1e293b" stroke={stroke} strokeWidth="2.2" />
            <polygon points="78,42 122,42 134,78 66,78" fill="#0b1830" stroke={stroke} strokeWidth="2.4" />
            <path d="M78 78 Q100 110 122 78" fill={isBiprop ? '#38bdf8' : '#94a3b8'} />
          </>
        )}
      </svg>
    );
  }
  if (optionId.startsWith('l_nav_')) {
    const isStar = optionId === 'l_nav_star';
    const isDual = optionId === 'l_nav_dual';
    const stroke = isStar ? '#4fe3d4' : isDual ? '#fbbf24' : '#94a3b8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
        <circle cx="100" cy="58" r="34" fill="#07152e" stroke={stroke} strokeWidth="2.4" />
        <circle cx="100" cy="58" r="22" stroke={stroke} strokeWidth="1.2" strokeDasharray="4 3" />
        <polygon points="100,32 108,58 100,72 92,58" fill="#4fe3d4" />
        <circle cx="100" cy="58" r="5" fill="#fbbf24" />
        {isStar && (
          <>
            <circle cx="52" cy="30" r="3" fill="#fef08a" />
            <circle cx="148" cy="36" r="2.5" fill="#38bdf8" />
            <line x1="100" y1="58" x2="52" y2="30" stroke="#4fe3d4" strokeWidth="1.2" strokeDasharray="3 3" />
          </>
        )}
      </svg>
    );
  }
  // Fuel tank
  const isCryo = optionId === 'l_fuel_cryo';
  const isDual = optionId === 'l_fuel_dual';
  const stroke = isCryo ? '#4fe3d4' : isDual ? '#fbbf24' : '#94a3b8';
  return (
    <svg viewBox="0 0 200 116" className="w-full h-24 select-none" fill="none">
      {isDual ? (
        <>
          <rect x="46" y="22" width="44" height="72" rx="16" fill="#07152e" stroke={stroke} strokeWidth="2.4" />
          <rect x="110" y="22" width="44" height="72" rx="16" fill="#07152e" stroke={stroke} strokeWidth="2.4" />
          <rect x="53" y="42" width="30" height="44" rx="10" fill="#38bdf8" fillOpacity="0.65" />
          <rect x="117" y="42" width="30" height="44" rx="10" fill="#38bdf8" fillOpacity="0.65" />
          <line x1="90" y1="58" x2="110" y2="58" stroke="#fbbf24" strokeWidth="3.5" />
        </>
      ) : (
        <>
          <rect x="66" y="16" width="68" height="84" rx="26" fill="#07152e" stroke={stroke} strokeWidth="2.6" />
          <rect x="74" y={isCryo ? 36 : 48} width="52" height={isCryo ? 54 : 42} rx="18" fill="#38bdf8" fillOpacity="0.72" />
        </>
      )}
    </svg>
  );
};

/* ========================================================
   INTERACTIVE CLICKABLE + DROP-TARGET LUNAR ORBITER BLUEPRINT
   ======================================================== */
const AnimatedLunarOrbiterSVG: React.FC<{
  build: SelectedLunarBuild;
  metrics: ReturnType<typeof evaluateLunarSpacecraft>;
  activeCategory?: LunarCategoryId;
  onSelectCategory?: (cat: LunarCategoryId) => void;
  fuelTestRunning?: boolean;
  simPhaseIdx?: number;
  simReport?: LunarSimTrialReport | null;
  equippedStoreGear?: string[];
}> = ({
  build,
  metrics,
  activeCategory = 'body',
  onSelectCategory,
  fuelTestRunning,
  simPhaseIdx = 0,
  simReport,
  equippedStoreGear = [],
}) => {
  const hullStroke =
    build.body === 'l_body_comp' ? '#4fe3d4' : build.body === 'l_body_ti' ? '#fbbf24' : '#cbd5e1';
  const fuelRatio = Math.min(1, metrics.fuelMassKg / Math.max(1, metrics.maxTankFuelKg));
  const wingSpan = build.power === 'l_pow_strip' ? 28 : build.power === 'l_pow_dual' ? 54 : 66;
  const isCurrentSim = Boolean(simReport && simReport.buildKey === serializeLunarBuild(build, equippedStoreGear));
  const fuelColor = isCurrentSim && !simReport!.fuelPassed ? '#fb7185' : '#38bdf8';

  const bodyOpt = findLunarOption('body', build.body);
  const instOpt = findLunarOption('instruments', build.instruments);
  const commsOpt = findLunarOption('comms', build.comms);
  const powerOpt = findLunarOption('power', build.power);
  const propOpt = findLunarOption('propulsion', build.propulsion);
  const navOpt = findLunarOption('navigation', build.navigation);
  const fuelOpt = findLunarOption('fuel', build.fuel);

  const ringFor = (cat: LunarCategoryId) =>
    activeCategory === cat ? '#4fe3d4' : 'rgba(148, 163, 184, 0.55)';

  return (
    <svg viewBox="0 0 500 285" className="w-full h-60 sm:h-72 select-none relative z-10" fill="none">
      <defs>
        <pattern id="lunarGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(79,227,212,0.08)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="500" height="285" rx="12" fill="url(#lunarGrid)" />

      {/* Simulation scan sweep */}
      {fuelTestRunning && (
        <rect
          x="130"
          y={45 + simPhaseIdx * 45}
          width="240"
          height="3"
          fill="#4fe3d4"
          opacity="0.75"
        />
      )}

      {/* Turntable Scale Base */}
      <rect
        x="150"
        y="246"
        width="200"
        height="22"
        rx="4"
        fill={isCurrentSim && !simReport!.massPassed ? '#450a0a' : '#081833'}
        stroke={isCurrentSim && !simReport!.massPassed ? '#f87171' : '#38bdf8'}
        strokeWidth="1.6"
      />
      <text
        x="250"
        y="261"
        textAnchor="middle"
        fill={isCurrentSim && !simReport!.massPassed ? '#fca5a5' : '#bae6fd'}
        fontSize="10"
        fontFamily="monospace"
        fontWeight="700"
      >
        {fuelTestRunning
          ? `SIM PHASE ${simPhaseIdx + 1} / 4`
          : `ORBITER MASS: ${metrics.totalMassKg} KG`}
      </text>

      {/* ==================== ORBITER ASSEMBLY (CENTER X=250) ==================== */}
      <motion.g
        animate={
          fuelTestRunning ? { y: [0, -2, 1.5, -1, 0] } : { y: [0, -3, 0] }
        }
        transition={{
          duration: fuelTestRunning ? 0.35 : 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* 04. SOLAR POWER WINGS */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('power');
          }}
        >
          <rect
            x={214 - wingSpan}
            y="108"
            width={wingSpan - 4}
            height="38"
            rx="4"
            fill="#1d4ed8"
            stroke={activeCategory === 'power' ? '#4fe3d4' : '#60a5fa'}
            strokeWidth={activeCategory === 'power' ? '2.8' : '1.8'}
          />
          <rect
            x="290"
            y="108"
            width={wingSpan - 4}
            height="38"
            rx="4"
            fill="#1d4ed8"
            stroke={activeCategory === 'power' ? '#4fe3d4' : '#60a5fa'}
            strokeWidth={activeCategory === 'power' ? '2.8' : '1.8'}
          />
          <line x1="210" y1="127" x2="216" y2="127" stroke="#cbd5e1" strokeWidth="3.5" />
          <line x1="284" y1="127" x2="290" y2="127" stroke="#cbd5e1" strokeWidth="3.5" />
        </g>

        {/* 03. COMMS DISH / MAST */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('comms');
          }}
        >
          {build.comms === 'l_comms_hga' ? (
            <>
              <path
                d="M222 68 Q250 88 278 68"
                stroke={activeCategory === 'comms' ? '#4fe3d4' : '#38bdf8'}
                strokeWidth="3.2"
                fill="#0b1f3f"
              />
              <line x1="250" y1="78" x2="250" y2="54" stroke="#e2e8f0" strokeWidth="2" />
              <circle cx="250" cy="52" r="3" fill="#fbbf24" />
            </>
          ) : build.comms === 'l_comms_helix' ? (
            <>
              <line x1="250" y1="84" x2="250" y2="48" stroke="#fbbf24" strokeWidth="3" />
              <path d="M240 68 C260 68, 240 58, 260 58" stroke="#4fe3d4" strokeWidth="2.2" />
            </>
          ) : (
            <line
              x1="250"
              y1="84"
              x2="250"
              y2="48"
              stroke={activeCategory === 'comms' ? '#4fe3d4' : '#f87171'}
              strokeWidth="3"
            />
          )}
        </g>

        {/* 01. SPACECRAFT BODY */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('body');
          }}
        >
          <rect
            x="216"
            y="84"
            width="68"
            height="86"
            rx="9"
            fill="#0b1830"
            stroke={activeCategory === 'body' ? '#4fe3d4' : hullStroke}
            strokeWidth={activeCategory === 'body' ? '3.4' : '2.6'}
          />
        </g>

        {/* 07. FUEL TANK CUTAWAY INSIDE BODY */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('fuel');
          }}
        >
          <rect
            x="227"
            y="96"
            width="46"
            height="56"
            rx="8"
            fill="#020817"
            stroke={activeCategory === 'fuel' ? '#4fe3d4' : '#475569'}
            strokeWidth={activeCategory === 'fuel' ? '2.4' : '1.6'}
          />
          <motion.rect
            animate={{
              y: 99 + Math.round((1 - fuelRatio) * 50),
              height: Math.max(6, Math.round(fuelRatio * 50)),
            }}
            transition={{ duration: 0.3 }}
            x="230"
            width="40"
            rx="5"
            fill={fuelColor}
          />
          <text x="250" y="130" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="800">
            {metrics.fuelMassKg}kg
          </text>
        </g>

        {/* 06. STAR TRACKER / NAVIGATION SENSOR (Top-right shoulder) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('navigation');
          }}
        >
          <circle
            cx="275"
            cy="92"
            r="7"
            fill="#09162d"
            stroke={activeCategory === 'navigation' ? '#4fe3d4' : '#fbbf24'}
            strokeWidth="2"
          />
          <circle cx="275" cy="92" r="2.5" fill="#4fe3d4" />
        </g>

        {/* 02. ICE INSTRUMENT SCANNER + CONE */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('instruments');
          }}
        >
          <rect
            x="230"
            y="168"
            width="40"
            height="12"
            rx="3"
            fill="#09162d"
            stroke={activeCategory === 'instruments' ? '#4fe3d4' : '#38bdf8'}
            strokeWidth="1.8"
          />
          {build.instruments !== 'l_inst_cam' && (
            <motion.path
              d="M236 180 L212 224 H288 L264 180 Z"
              fill={build.instruments === 'l_inst_neutron' ? '#4fe3d4' : '#fbbf24'}
              animate={{ opacity: [0.1, 0.28, 0.1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}
        </g>

        {/* 05. THRUSTER NOZZLE */}
        <g
          className="cursor-pointer"
          onClick={() => {
            SFX.click();
            onSelectCategory?.('propulsion');
          }}
        >
          <polygon
            points="237,180 263,180 270,200 230,200"
            fill="#1e293b"
            stroke={activeCategory === 'propulsion' ? '#4fe3d4' : '#94a3b8'}
            strokeWidth="2"
          />
          {fuelTestRunning && (
            <motion.polygon
              points="238,200 262,200 250,236"
              fill="#38bdf8"
              animate={{ opacity: [0.45, 0.95, 0.5], scaleY: [0.85, 1.15, 0.9] }}
              transition={{ duration: 0.25, repeat: Infinity }}
            />
          )}
        </g>

        {equippedStoreGear.length > 0 && (
          <g>
            <rect x="220" y="156" width="60" height="12" rx="3" fill="#052e2b" stroke="#34d399" strokeWidth="1.2" />
            <text x="250" y="165" textAnchor="middle" fill="#6ee7b7" fontSize="7.5" fontFamily="monospace" fontWeight="900">
              +{equippedStoreGear.length} UPGRADE
            </text>
          </g>
        )}
      </motion.g>

      {/* ==================== INTERACTIVE ENGINEERING CALLOUTS ==================== */}
      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('body'); }}>
        <polyline points="216,96 146,34 128,34" stroke={ringFor('body')} strokeWidth="1.2" />
        <rect x="8" y="18" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('body')} strokeWidth="1.2" />
        <text x="16" y="30" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">01 BODY</text>
        <text x="16" y="42" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{bodyOpt.shortName}</text>
      </g>

      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('power'); }}>
        <polyline points="170,124 128,96" stroke={ringFor('power')} strokeWidth="1.2" />
        <rect x="8" y="78" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('power')} strokeWidth="1.2" />
        <text x="16" y="90" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">04 SOLAR POWER</text>
        <text x="16" y="102" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{powerOpt.shortName}</text>
      </g>

      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('fuel'); }}>
        <polyline points="227,138 128,154" stroke={ringFor('fuel')} strokeWidth="1.2" />
        <rect x="8" y="138" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('fuel')} strokeWidth="1.2" />
        <text x="16" y="150" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">07 FUEL TANK</text>
        <text x="16" y="162" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{fuelOpt.shortName}</text>
      </g>

      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('instruments'); }}>
        <polyline points="230,174 146,214 128,214" stroke={ringFor('instruments')} strokeWidth="1.2" />
        <rect x="8" y="198" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('instruments')} strokeWidth="1.2" />
        <text x="16" y="210" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">02 ICE SENSOR</text>
        <text x="16" y="222" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{instOpt.shortName}</text>
      </g>

      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('comms'); }}>
        <polyline points="274,62 356,34 372,34" stroke={ringFor('comms')} strokeWidth="1.2" />
        <rect x="372" y="18" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('comms')} strokeWidth="1.2" />
        <text x="380" y="30" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">03 ANTENNA</text>
        <text x="380" y="42" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{commsOpt.shortName}</text>
      </g>

      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('navigation'); }}>
        <polyline points="282,92 372,94" stroke={ringFor('navigation')} strokeWidth="1.2" />
        <rect x="372" y="78" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('navigation')} strokeWidth="1.2" />
        <text x="380" y="90" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">06 GUIDANCE</text>
        <text x="380" y="102" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{navOpt.shortName}</text>
      </g>

      <g className="cursor-pointer" onClick={() => { SFX.click(); onSelectCategory?.('propulsion'); }}>
        <polyline points="266,190 356,214 372,214" stroke={ringFor('propulsion')} strokeWidth="1.2" />
        <rect x="372" y="198" width="120" height="30" rx="5" fill="#040d1e" stroke={ringFor('propulsion')} strokeWidth="1.2" />
        <text x="380" y="210" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="700">05 THRUSTER</text>
        <text x="380" y="222" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{propOpt.shortName}</text>
      </g>
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

  const normalizedSavedStage: Level8Stage =
    saved.stage === 2 ? 1 : saved.stage || 1;
  const [stage, setStage] = useState<Level8Stage>(normalizedSavedStage);
  const [build, setBuild] = useState<SelectedLunarBuild>(saved.build || DEFAULT_LUNAR_BUILD);
  const [equippedStoreGear, setEquippedStoreGear] = useState<string[]>(
    saved.equippedStoreGear || []
  );
  const [dragHoverOrbiter, setDragHoverOrbiter] = useState(false);
  const [justDroppedGearId, setJustDroppedGearId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<LunarCategoryId>('body');
  const [fuelTestPassed, setFuelTestPassed] = useState<boolean>(Boolean(saved.fuelTestPassed));
  const [fuelTestRunning, setFuelTestRunning] = useState(false);
  const [simPhaseIdx, setSimPhaseIdx] = useState(0);
  const [simReport, setSimReport] = useState<LunarSimTrialReport | null>(() => {
    if (saved.fuelTestPassed || normalizedSavedStage >= 3) {
      return runLunarOrbiterSimulation(
        saved.build || DEFAULT_LUNAR_BUILD,
        saved.equippedStoreGear || [],
        1
      );
    }
    return null;
  });
  const [simHistory, setSimHistory] = useState<LunarSimTrialReport[]>([]);

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

  // Stage 4 Navigation & Powered Lunar Landing
  const [navHeadingDeg, setNavHeadingDeg] = useState<number>(saved.navHeadingDeg ?? 14);
  const [navOrbitLocked, setNavOrbitLocked] = useState<boolean>(Boolean(saved.navOrbitLocked));
  const [landingPhase, setLandingPhase] = useState<'idle' | 'descending' | 'landed'>(
    saved.craterScans && saved.craterScans.length > 0 ? 'landed' : 'idle'
  );

  // Stage 5 Crater Exploration
  const [craterScans, setCraterScans] = useState<CraterScanRecord[]>(saved.craterScans || []);
  const [evidenceMeterPct, setEvidenceMeterPct] = useState<number>(saved.evidenceMeterPct || 0);
  const [, setActiveCraterId] = useState<LunarCraterSpec['id'] | null>(null);
  const [scanningCrater, setScanningCrater] = useState(false);

  // Stage 6 Transmit (5-packet Earth DSN link + interactive dish pointing)
  const [transmittedPct, setTransmittedPct] = useState<number>(saved.transmittedPct || 0);
  const [transmissionInterrupted, setTransmissionInterrupted] = useState<boolean>(
    Boolean(saved.transmissionInterrupted)
  );
  const [transmitting, setTransmitting] = useState(false);
  const [txDone, setTxDone] = useState<boolean>((saved.transmittedPct || 0) >= 100);
  const [dishAimDeg, setDishAimDeg] = useState<number>(-16);
  const [dsnTargetDeg, setDsnTargetDeg] = useState<number>(() =>
    (saved.transmittedPct || 0) >= 40 ? 15 : 0
  );

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
    if (!visible) {
      SFX.cancelSpeech();
    } else if (!wasVisibleRef.current && initialProgress) {
      const nextStage: Level8Stage =
        initialProgress.stage === 2 ? 1 : initialProgress.stage || 1;
      setStage(nextStage);
      setBuild(initialProgress.build || DEFAULT_LUNAR_BUILD);
      setEquippedStoreGear(initialProgress.equippedStoreGear || []);
      setFuelTestPassed(Boolean(initialProgress.fuelTestPassed));
      setSimReport(
        initialProgress.fuelTestPassed || nextStage >= 3
          ? runLunarOrbiterSimulation(
              initialProgress.build || DEFAULT_LUNAR_BUILD,
              initialProgress.equippedStoreGear || [],
              1
            )
          : null
      );
      setSimHistory([]);
      setRocketParts((initialProgress.rocketParts as RocketPartId[]) || []);
      setRocketStage(initialProgress.rocketStage || 1);
      setLaunchCompleted(Boolean(initialProgress.launchCompleted));
      setNavHeadingDeg(initialProgress.navHeadingDeg ?? 14);
      setNavOrbitLocked(Boolean(initialProgress.navOrbitLocked));
      setLandingPhase(
        initialProgress.craterScans && initialProgress.craterScans.length > 0 ? 'landed' : 'idle'
      );
      setCraterScans(initialProgress.craterScans || []);
      setEvidenceMeterPct(initialProgress.evidenceMeterPct || 0);
      setTransmittedPct(initialProgress.transmittedPct || 0);
      setTransmissionInterrupted(Boolean(initialProgress.transmissionInterrupted));
      setTransmitting(false);
      setTxDone((initialProgress.transmittedPct || 0) >= 100);
      setDsnTargetDeg((initialProgress.transmittedPct || 0) >= 40 ? 15 : 0);
      const now = Date.now();
      const startMs = initialProgress.missionStartedAtMs ?? now;
      const deadlineMs = initialProgress.missionDeadlineMs ?? now + LUNAR_WATER_DURATION_SEC * 1000;
      setMissionStartedAtMs(startMs);
      setMissionDeadlineMs(deadlineMs);
      setTimerExpired(Boolean(initialProgress.timerExpired));
      setSecondsLeft(Math.max(0, Math.ceil((deadlineMs - now) / 1000)));
    }
    wasVisibleRef.current = visible;
  }, [visible, initialProgress]);

  const announcedStageRef = useRef<number | null>(null);
  useEffect(() => {
    if (!visible) {
      announcedStageRef.current = null;
      return;
    }
    const effective = stage === 0 ? 1 : stage;
    if (announcedStageRef.current === effective) return;
    announcedStageRef.current = effective;
    const cues: Record<number, string> = {
      1: 'Stage 1, Lunar Orbiter Hangar. Configure your spacecraft parts, tune the fuel load, and pass the Flight Sim test.',
      3: 'Stage 2, Heavy Rocket Staging. Assemble the launch rocket and seal your lunar orbiter inside the fairing.',
      4: 'Stage 3, Cislunar Spaceflight. Fly through the mid-course gate and brake gently inside the Moon orbit capture ring.',
      5: 'Stage 4, Moon South Pole. Fly over and scan shadowed polar craters until ice evidence reaches 75 percent.',
      6: 'Stage 5, Deep Space Downlink. Point the high-gain dish toward Earth and transmit all 5 lunar water packets.',
    };
    const msg = cues[effective];
    if (msg) SFX.speakCue(msg);
  }, [visible, stage]);

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

  const handleRunOrbiterSim = () => {
    if (fuelTestRunning) return;
    setFuelTestRunning(true);
    setSimPhaseIdx(0);
    SFX.shakerStart();
    window.setTimeout(() => setSimPhaseIdx(1), 280);
    window.setTimeout(() => setSimPhaseIdx(2), 560);
    window.setTimeout(() => setSimPhaseIdx(3), 840);
    window.setTimeout(() => {
      const nextTrialNum = simHistory.length + 1;
      const report = runLunarOrbiterSimulation(build, equippedStoreGear, nextTrialNum);
      setFuelTestRunning(false);
      setSimReport(report);
      setSimHistory((prev) => [report, ...prev].slice(0, 4));
      if (report.passed) {
        SFX.shakerPass();
        setFuelTestPassed(true);
        persistProgress({ fuelTestPassed: true });
      } else {
        SFX.shakerFail();
        setFuelTestPassed(false);
        persistProgress({ fuelTestPassed: false });
      }
    }, 1150);
  };

  // Stage 4 is handled by interactive <LunarFlightAndLandingSim />

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

  const transmittedPackets = Math.min(5, Math.round(transmittedPct / 20));
  const aimOffsetDeg = Math.abs(dishAimDeg - dsnTargetDeg);
  const dishSignalPct = Math.max(
    8,
    Math.min(
      100,
      Math.round(100 - aimOffsetDeg * 3.8 - (metrics.isCommsWeak ? 18 : 0))
    )
  );
  const isDishLocked = aimOffsetDeg <= 5;

  // Packet-by-packet deep space streaming loop (like Level 6)
  useEffect(() => {
    if (
      !visible ||
      stage !== 6 ||
      !transmitting ||
      transmissionInterrupted ||
      timerExpired ||
      txDone
    ) {
      return;
    }

    if (!isDishLocked) {
      setTransmitting(false);
      setTransmissionInterrupted(true);
      SFX.tempWarningBeep();
      return;
    }

    const packetIntervalMs = metrics.isCommsWeak ? 1450 : 900;
    const t = window.setTimeout(() => {
      const nextPkt = Math.min(5, transmittedPackets + 1);
      const nextPct = nextPkt * 20;

      // After Packet 2 confirms, Moon rotation drifts Earth DSN target to +15° -> player tracks & resumes!
      if (nextPkt === 2 && dsnTargetDeg === 0) {
        SFX.tempWarningBeep();
        setTransmittedPct(nextPct);
        setDsnTargetDeg(15);
        setTransmissionInterrupted(true);
        setTransmitting(false);
        persistProgress({ transmittedPct: nextPct, transmissionInterrupted: true });
        return;
      }

      SFX.snapCorrect();
      setTransmittedPct(nextPct);
      persistProgress({ transmittedPct: nextPct, transmissionInterrupted: false });

      if (nextPkt >= 5) {
        void finishTransmission();
      }
    }, packetIntervalMs);

    return () => window.clearTimeout(t);
  }, [
    dishAimDeg,
    dsnTargetDeg,
    finishTransmission,
    isDishLocked,
    metrics.isCommsWeak,
    persistProgress,
    stage,
    timerExpired,
    transmissionInterrupted,
    transmittedPackets,
    transmitting,
    txDone,
    visible,
  ]);

  const handleStartOrResumeTransmit = () => {
    if (transmitting || txDone || !isDishLocked) return;
    setTransmissionInterrupted(false);
    setTransmitting(true);
    SFX.orbitStart();
  };

  const handleFullReset = () => {
    SFX.click();
    const now = Date.now();
    const deadline = now + LUNAR_WATER_DURATION_SEC * 1000;
    setStage(1);
    setBuild({ ...DEFAULT_LUNAR_BUILD });
    setEquippedStoreGear([]);
    setFuelTestPassed(false);
    setFuelTestRunning(false);
    setSimPhaseIdx(0);
    setSimReport(null);
    setSimHistory([]);
    setRocketParts([]);
    setRocketStage(1);
    setLaunchCompleted(false);
    setLaunchStatus('not_started');
    setNavHeadingDeg(14);
    setNavOrbitLocked(false);
    setLandingPhase('idle');
    setCraterScans([]);
    setEvidenceMeterPct(0);
    setActiveCraterId(null);
    setTransmittedPct(0);
    setTransmissionInterrupted(false);
    setTransmitting(false);
    setTxDone(false);
    setDishAimDeg(-16);
    setDsnTargetDeg(0);
    setRewardResult(null);
    setMissionStartedAtMs(now);
    setMissionDeadlineMs(deadline);
    setSecondsLeft(LUNAR_WATER_DURATION_SEC);
    setTimerExpired(false);
    warnedMarksRef.current.clear();
    onReplayReset();
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

        {/* STAGE 1: INTERACTIVE LUNAR ORBITER HANGAR + FUEL PUMP + FLIGHT SIM */}
        {stage === 1 && (() => {
          const currentBuildKey = serializeLunarBuild(build, equippedStoreGear);
          const isCurrentTested = Boolean(simReport && simReport.buildKey === currentBuildKey);
          const currentReport = isCurrentTested ? simReport : null;
          const activeMeta =
            LUNAR_CATEGORY_META.find((c) => c.id === activeCategory) || LUNAR_CATEGORY_META[0];
          const simPhaseLabels = [
            'Lift Mass Scale',
            'Eclipse Solar Draw',
            'Shadow Crater Scan',
            'Moon Burn & RF Link',
          ];
          const unlockedGearItems = level8StoreItems.filter((item) =>
            unlockedStoreItems.includes(item.id)
          );
          const cardBackdropImg =
            activeCategory === 'propulsion' || activeCategory === 'fuel'
              ? lunarThrusterPropellantImg
              : lunarOrbiterHardwareImg;

          return (
            <div className="max-w-[1440px] w-full mx-auto flex flex-col gap-3.5">
              {/* Compact Visual Hangar Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-cyan-400/25 bg-[#071124] px-5 py-3 flex flex-wrap items-center justify-between gap-4">
                <img
                  src={lunarSouthPoleBannerImg}
                  alt="Lunar South Pole crater horizon"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#071124]/95 via-[#071124]/85 to-[#071124]/95 pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3.5">
                  <div className="w-12 h-9 rounded-lg overflow-hidden border border-cyan-400/40 shrink-0 hidden sm:block">
                    <img
                      src={lunarOrbiterHardwareImg}
                      alt="Orbiter CAD preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Lunar Orbiter Hangar
                    </h2>
                    <div className="text-xs text-cyan-200/80">
                      Snap 7 parts · Pump fuel · Run Flight Sim
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-4 shrink-0 font-mono-tech text-xs tabular-nums">
                  <div className="flex items-center gap-2 bg-[#040a18]/85 border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400">Mass</span>
                    <strong className="text-sm text-white">{metrics.totalMassKg} kg</strong>
                  </div>
                  <div className="flex items-center gap-2 bg-[#040a18]/85 border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400">Cost</span>
                    <strong className="text-sm text-amber-300">★ {metrics.totalCostSc}</strong>
                  </div>
                  <div className="flex items-center gap-2 bg-[#040a18]/85 border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400">Fuel</span>
                    <strong className="text-sm text-[#4fe3d4]">{metrics.fuelMassKg} kg</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* LEFT COLUMN (7/12): 7 Subsystem Slots + Large Visual Drag/Click Cards + Fuel Pump */}
                <div className="lg:col-span-7 flex flex-col gap-3.5 min-w-0">
                  {/* 7-Subsystem Icon Rack */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LUNAR_CATEGORY_META.map((cat) => {
                      const isAct = activeCategory === cat.id;
                      const chosen = findLunarOption(cat.id, build[cat.id]);
                      const flagged = currentReport?.affectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            SFX.click();
                            setActiveCategory(cat.id);
                          }}
                          className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                            isAct
                              ? 'bg-cyan-500/18 border-[#4fe3d4] text-white shadow-[0_0_16px_rgba(79,227,212,0.18)]'
                              : flagged
                              ? 'bg-rose-950/30 border-rose-400/50 text-slate-200 hover:border-rose-300'
                              : 'bg-[#071124] border-white/12 hover:border-cyan-400/45 text-slate-200'
                          }`}
                        >
                          <LunarCategoryIconSVG category={cat.id} active={isAct} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono-tech">
                              <span className="text-[#4fe3d4] font-semibold truncate">{cat.shortLabel}</span>
                              {flagged ? (
                                <span className="text-rose-300 font-bold shrink-0">▲</span>
                              ) : currentReport?.passed ? (
                                <span className="text-emerald-300 font-bold shrink-0">●</span>
                              ) : null}
                            </div>
                            <div className="text-xs font-bold text-white truncate">{chosen.shortName}</div>
                            <div className="text-[10px] text-slate-400 font-mono-tech tabular-nums">
                              {chosen.weightKg}kg · ★{chosen.costSc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Hardware Cards (Drag onto Orbiter OR Click to Equip) */}
                  <div className="rounded-2xl bg-[#071124] border border-white/12 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <LunarCategoryIconSVG category={activeMeta.id} active />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          {activeMeta.label}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono-tech text-slate-400">
                        Click or Drag to Mount
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {LUNAR_COMPONENTS[activeCategory].map((opt) => {
                        const selected = build[activeCategory] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            draggable={!fuelTestRunning}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', `part:${activeCategory}:${opt.id}`);
                              e.dataTransfer.effectAllowed = 'copy';
                              SFX.select();
                            }}
                            onClick={() => handleSelectComponent(activeCategory, opt.id)}
                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition cursor-pointer ${
                              selected
                                ? 'bg-[#0b2042] border-[#4fe3d4] ring-1 ring-[#4fe3d4]/45 shadow-[0_0_20px_rgba(79,227,212,0.16)]'
                                : 'bg-[#040a18] border-white/12 hover:border-cyan-400/45'
                            }`}
                          >
                            <div className="relative rounded-xl overflow-hidden bg-[#020712] border border-white/10 px-2 py-2 flex items-center justify-center">
                              <img
                                src={cardBackdropImg}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
                              />
                              <div className="relative z-10 w-full pointer-events-none">
                                <LunarPartIconSVG optionId={opt.id} />
                              </div>
                              <span
                                className={`absolute top-2 right-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  selected
                                    ? 'bg-[#4fe3d4] text-[#041022]'
                                    : 'bg-slate-900/85 text-slate-300 border border-white/10'
                                }`}
                              >
                                {selected ? '✓ Mounted' : 'Mount'}
                              </span>
                            </div>

                            <div className="space-y-1.5 px-0.5">
                              <div>
                                <h4 className="text-sm font-bold text-white leading-tight">
                                  {opt.name}
                                </h4>
                                <div className="text-[11px] font-mono-tech text-cyan-300/85 mt-0.5 truncate">
                                  {opt.metricDisplay}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-tech tabular-nums">
                                <span className="text-slate-200 font-bold">{opt.weightKg} kg</span>
                                <span className="text-amber-300 font-bold">★ {opt.costSc} SC</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Propellant Pump + Optional Store Upgrades */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Fuel Load Interactive Pump */}
                    <div className="sm:col-span-7 rounded-2xl bg-[#071124] border border-cyan-400/25 p-3.5 flex items-center gap-3.5">
                      <div className="w-16 h-14 rounded-xl overflow-hidden border border-cyan-400/35 shrink-0 bg-[#030814]">
                        <img
                          src={lunarThrusterPropellantImg}
                          alt="Cryogenic propellant tank"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono-tech tabular-nums">
                          <span className="font-bold text-white">Propellant Load</span>
                          <span className="text-sm font-extrabold text-[#4fe3d4]">
                            {metrics.fuelMassKg} / {metrics.maxTankFuelKg} kg
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={fuelTestRunning || metrics.fuelMassKg <= 20}
                            onClick={() => handleFuelSliderChange(Math.max(20, metrics.fuelMassKg - 5))}
                            className="w-7 h-7 rounded-lg bg-[#040a18] border border-white/15 hover:border-[#4fe3d4] text-xs font-bold text-white cursor-pointer disabled:opacity-40"
                          >
                            -5
                          </button>
                          <input
                            type="range"
                            min={20}
                            max={95}
                            step={1}
                            disabled={fuelTestRunning}
                            value={metrics.fuelMassKg}
                            onChange={(e) => handleFuelSliderChange(Number(e.target.value))}
                            className="flex-1 accent-[#4fe3d4] cursor-pointer"
                          />
                          <button
                            type="button"
                            disabled={fuelTestRunning || metrics.fuelMassKg >= 95}
                            onClick={() => handleFuelSliderChange(Math.min(95, metrics.fuelMassKg + 5))}
                            className="w-7 h-7 rounded-lg bg-[#040a18] border border-white/15 hover:border-[#4fe3d4] text-xs font-bold text-white cursor-pointer disabled:opacity-40"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Optional Store Gear Strip */}
                    <div className="sm:col-span-5 rounded-2xl bg-[#071124] border border-amber-400/25 p-3.5 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-200">
                          Bonus Gear ({unlockedGearItems.length}/{level8StoreItems.length})
                        </span>
                        {onOpenStoreForLunar && (
                          <button
                            type="button"
                            onClick={() => {
                              SFX.click();
                              onOpenStoreForLunar();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/45 text-amber-200 text-[11px] font-bold cursor-pointer"
                          >
                            🛒 Store
                          </button>
                        )}
                      </div>
                      {unlockedGearItems.length === 0 ? (
                        <div className="text-[11px] text-slate-400">
                          Optional upgrades available in Store
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {unlockedGearItems.map((item) => {
                            const equipped = equippedStoreGear.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                draggable={!equipped}
                                onDragStart={(e) => {
                                  if (equipped) return;
                                  e.dataTransfer.setData('text/plain', item.id);
                                  SFX.select();
                                }}
                                onClick={() => {
                                  SFX.snapCorrect();
                                  const next = equipped
                                    ? equippedStoreGear.filter((g) => g !== item.id)
                                    : [...equippedStoreGear, item.id];
                                  setEquippedStoreGear(next);
                                  setFuelTestPassed(false);
                                  persistProgress({ equippedStoreGear: next, fuelTestPassed: false });
                                }}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                                  equipped
                                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                                    : 'bg-[#040a18] border-white/15 text-slate-200 hover:border-[#4fe3d4]'
                                }`}
                              >
                                {item.icon} {equipped ? '✓ Mounted' : 'Mount'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN (5/12): Interactive Drop-Zone Hangar Rig + Telemetry Gauges + Sim */}
                <div className="lg:col-span-5 rounded-2xl bg-[#071124] border border-cyan-400/30 p-4 flex flex-col justify-between gap-3.5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Interactive Orbiter Rig
                      </h3>
                      <span
                        className={`text-xs font-mono-tech font-bold ${
                          fuelTestRunning
                            ? 'text-[#4fe3d4]'
                            : currentReport?.passed
                            ? 'text-emerald-300'
                            : currentReport
                            ? 'text-rose-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {fuelTestRunning
                          ? '● Simulating...'
                          : currentReport?.passed
                          ? '● Flight Ready'
                          : currentReport
                          ? '✖ Needs Fix'
                          : '▲ Untested'}
                      </span>
                    </div>

                    {/* Photographic Hangar Turntable + Clickable/Droppable Orbiter Blueprint */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragHoverOrbiter(true);
                      }}
                      onDragLeave={() => setDragHoverOrbiter(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragHoverOrbiter(false);
                        const payload = e.dataTransfer.getData('text/plain');
                        if (payload.startsWith('part:')) {
                          const [, cat, optId] = payload.split(':');
                          handleSelectComponent(cat as LunarCategoryId, optId);
                          setJustDroppedGearId(optId);
                          window.setTimeout(() => setJustDroppedGearId(null), 900);
                        } else if (
                          payload &&
                          unlockedStoreItems.includes(payload) &&
                          !equippedStoreGear.includes(payload)
                        ) {
                          SFX.snapCorrect();
                          const nextGear = [...equippedStoreGear, payload];
                          setEquippedStoreGear(nextGear);
                          setFuelTestPassed(false);
                          setJustDroppedGearId(payload);
                          window.setTimeout(() => setJustDroppedGearId(null), 900);
                          persistProgress({ equippedStoreGear: nextGear, fuelTestPassed: false });
                        }
                      }}
                      className={`relative rounded-2xl overflow-hidden border transition-all bg-[#020712] ${
                        dragHoverOrbiter
                          ? 'border-[#4fe3d4] ring-2 ring-[#4fe3d4] scale-[1.01]'
                          : justDroppedGearId
                          ? 'border-emerald-400 ring-2 ring-emerald-400/50'
                          : 'border-cyan-400/25'
                      }`}
                    >
                      <img
                        src={lunarOrbiterHangarImg}
                        alt="Lunar spacecraft integration turntable"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-[#020816]/55 via-[#020816]/70 to-[#020816]/90 pointer-events-none" />
                      <AnimatedLunarOrbiterSVG
                        build={build}
                        metrics={metrics}
                        activeCategory={activeCategory}
                        onSelectCategory={setActiveCategory}
                        fuelTestRunning={fuelTestRunning}
                        simPhaseIdx={simPhaseIdx}
                        simReport={currentReport}
                        equippedStoreGear={equippedStoreGear}
                      />
                      {dragHoverOrbiter && (
                        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#030b1b]/55 border-2 border-dashed border-[#4fe3d4]">
                          <span className="px-3.5 py-1.5 rounded-xl bg-[#4fe3d4] text-[#041022] font-mono-tech text-xs font-extrabold">
                            ⬇ DROP TO MOUNT
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4 Visual Flight Sim Gauges (Revealed Only When Tested!) */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-mono-tech tabular-nums">
                      <div className="p-2.5 rounded-xl bg-[#040a18] border border-white/10 flex items-center gap-2.5">
                        <LunarTelemetryGaugeSVG
                          kind="mass"
                          tone={!currentReport ? 'idle' : currentReport.massPassed ? 'ok' : 'fail'}
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Lift Scale</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.massPassed
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {currentReport
                              ? `${currentReport.totalMassKg}/${currentReport.liftLimitKg} kg`
                              : 'Untested'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#040a18] border border-white/10 flex items-center gap-2.5">
                        <LunarTelemetryGaugeSVG
                          kind="power"
                          tone={!currentReport ? 'idle' : currentReport.powerPassed ? 'ok' : 'fail'}
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Eclipse Power</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.powerPassed
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {currentReport
                              ? `${currentReport.powerCapacityW}W / ${currentReport.powerDrawW}W`
                              : 'Untested'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#040a18] border border-white/10 flex items-center gap-2.5">
                        <LunarTelemetryGaugeSVG
                          kind="optics"
                          tone={!currentReport ? 'idle' : currentReport.sensorPassed ? 'ok' : 'fail'}
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Shadow Ice</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.sensorPassed
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {currentReport
                              ? currentReport.sensorPassed
                                ? 'Detected ✓'
                                : 'Blind ✖'
                              : 'Untested'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#040a18] border border-white/10 flex items-center gap-2.5">
                        <LunarTelemetryGaugeSVG
                          kind="flight"
                          tone={
                            !currentReport
                              ? 'idle'
                              : currentReport.commsPassed && currentReport.fuelPassed
                              ? 'ok'
                              : 'fail'
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Orbit + RF</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.commsPassed && currentReport.fuelPassed
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {currentReport
                              ? !currentReport.commsPassed
                                ? 'Weak RF ✖'
                                : !currentReport.fuelPassed
                                ? 'Low Δv ✖'
                                : 'Locked ✓'
                              : 'Untested'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Simulation Phase Indicator or Concise Failure Chips */}
                    {fuelTestRunning ? (
                      <div className="grid grid-cols-4 gap-1.5">
                        {simPhaseLabels.map((lbl, idx) => (
                          <div
                            key={lbl}
                            className={`px-2 py-1.5 rounded-lg border text-[10px] font-mono-tech text-center ${
                              idx <= simPhaseIdx
                                ? 'bg-cyan-500/20 border-[#4fe3d4] text-cyan-200 font-bold'
                                : 'bg-[#040a18] border-white/10 text-slate-500'
                            }`}
                          >
                            {lbl}
                          </div>
                        ))}
                      </div>
                    ) : currentReport && currentReport.findings.length > 0 ? (
                      <div className="space-y-1 text-[11px]">
                        {currentReport.findings.map((f, i) => (
                          <div
                            key={i}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-400/45 text-rose-200"
                          >
                            ✖ {f}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {simHistory.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono-tech tabular-nums">
                        <span className="text-slate-400 mr-1">Trials:</span>
                        {simHistory.map((item) => (
                          <span
                            key={item.trialNumber}
                            className={`px-2 py-0.5 rounded border ${
                              item.passed
                                ? 'bg-emerald-950/50 border-emerald-400/50 text-emerald-300'
                                : 'bg-rose-950/40 border-rose-400/40 text-rose-200'
                            }`}
                          >
                            #{item.trialNumber} {item.passed ? '✓' : '✖'} {item.totalMassKg}kg · Δv {item.travelCapabilityPct}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary Simulation / Launch CTA */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {!currentReport ? (
                      <button
                        type="button"
                        disabled={fuelTestRunning}
                        onClick={handleRunOrbiterSim}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-sm uppercase tracking-wide hover:brightness-110 transition cursor-pointer"
                      >
                        {fuelTestRunning ? 'Running Flight Sim...' : 'Run Flight Sim'}
                      </button>
                    ) : !currentReport.passed ? (
                      <button
                        type="button"
                        onClick={handleRunOrbiterSim}
                        className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#041022] font-extrabold text-sm uppercase tracking-wide transition cursor-pointer"
                      >
                        Re-Run Flight Sim
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          SFX.taskComplete();
                          setFuelTestPassed(true);
                          setStage(3);
                          persistProgress({ fuelTestPassed: true, stage: 3 });
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] font-extrabold text-sm uppercase tracking-wide hover:brightness-110 transition cursor-pointer"
                      >
                        Proceed to Rocket Launch ▶
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* STAGE 4: INTERACTIVE CISLUNAR FLIGHT & REAL POWERED LUNAR DESCENT */}
        {stage === 4 && (
          <LunarFlightAndLandingSim
            initialOrbitLocked={navOrbitLocked}
            initialLanded={landingPhase === 'landed'}
            navPrecisionPct={metrics.navPrecisionPct}
            fuelReserveBonusPct={Math.max(0, metrics.travelCapabilityPct - 68)}
            onOrbitLocked={() => {
              setNavHeadingDeg(0);
              setNavOrbitLocked(true);
              persistProgress({ navHeadingDeg: 0, navOrbitLocked: true });
            }}
            onTouchdownConfirmed={() => {
              setLandingPhase('landed');
            }}
            onProceedToExplore={() => {
              SFX.click();
              setStage(5);
              persistProgress({ stage: 5 });
            }}
          />
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

        {/* STAGE 6: INTERACTIVE 5-PACKET DEEP-SPACE DOWNLINK WITH DISH TRACKING */}
        {stage === 6 && (
          <div className="max-w-5xl w-full mx-auto rounded-2xl bg-[#071124] border border-cyan-400/35 p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <div className="text-[10px] font-mono-tech uppercase tracking-widest text-[#4fe3d4] font-bold">
                  STAGE 6 // DEEP-SPACE TELEMETRY LINK · 384,400 KM
                </div>
                <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white">
                  Aim High-Gain Dish &amp; Stream 5 Water-Ice Packets to Earth
                </h2>
              </div>
              <div className="flex items-center gap-2 font-mono-tech text-xs font-extrabold tabular-nums">
                <div
                  className={`px-3 py-1.5 rounded-xl border ${
                    isDishLocked
                      ? 'bg-emerald-950/60 border-emerald-400/60 text-emerald-300'
                      : 'bg-amber-950/50 border-amber-400/50 text-amber-300'
                  }`}
                >
                  SIGNAL: {dishSignalPct}%
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-[#030b1a] border border-cyan-400/40 text-[#4fe3d4]">
                  PACKETS: {transmittedPackets} / 5
                </div>
              </div>
            </div>

            {!txDone ? (
              <>
                {/* Visual Moon Dish -> 5 Packets -> Moving Earth DSN Link */}
                <div className="rounded-2xl bg-[#030a18] border border-cyan-400/25 p-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-4">
                  {/* Left: Moon + Live Rotating Orbiter Dish Beam */}
                  <div className="lg:col-span-5 rounded-xl bg-[#020712] border border-white/10 p-2">
                    <svg viewBox="0 0 360 190" className="w-full h-44" fill="none">
                      {/* Moon Sphere */}
                      <circle cx="52" cy="95" r="34" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" />
                      <circle cx="42" cy="85" r="6" fill="#64748b" />
                      <circle cx="62" cy="108" r="8" fill="#64748b" />
                      <text x="52" y="148" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace" fontWeight="700">
                        SOUTH POLE
                      </text>

                      {/* Target Earth Receiver Position (rotates vertically with dsnTargetDeg) */}
                      {(() => {
                        const earthY = 95 + dsnTargetDeg * 2.4;
                        const beamEndY = 95 + dishAimDeg * 2.4;
                        return (
                          <>
                            {/* Faint Target Corridor */}
                            <polygon
                              points={`112,95 304,${earthY - 14} 304,${earthY + 14}`}
                              fill="rgba(52,211,153,0.06)"
                              stroke="rgba(52,211,153,0.28)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />

                            {/* Live Player Dish Beam Cone */}
                            <polygon
                              points={`112,95 300,${beamEndY - 22} 300,${beamEndY + 22}`}
                              fill={isDishLocked ? 'rgba(79,227,212,0.22)' : 'rgba(251,191,36,0.16)'}
                              stroke={isDishLocked ? '#4fe3d4' : '#fbbf24'}
                              strokeWidth="1.6"
                              strokeDasharray={transmitting ? 'none' : '5 4'}
                            />

                            {/* Orbiter + Rotating Parabolic Dish */}
                            <g transform={`translate(96, 95) rotate(${dishAimDeg * 0.7})`}>
                              <rect x="-12" y="-7" width="20" height="14" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.3" />
                              <path d="M10 -12 Q22 0 10 12" stroke="#4fe3d4" strokeWidth="3" fill="none" />
                              <line x1="16" y1="0" x2="22" y2="0" stroke="#f8fafc" strokeWidth="1.5" />
                            </g>

                            {/* Animated Streaming Packet Dot */}
                            {transmitting && isDishLocked && (
                              <circle r="5.5" fill="#34d399">
                                <animateMotion
                                  dur="0.75s"
                                  repeatCount="indefinite"
                                  path={`M114,95 L298,${earthY}`}
                                />
                              </circle>
                            )}

                            {/* Earth DSN Receiver */}
                            <circle cx="314" cy={earthY} r="24" fill="#0284c7" stroke={isDishLocked ? '#34d399' : '#38bdf8'} strokeWidth="2.2" />
                            <path
                              d={`M305 ${earthY - 8} C312 ${earthY - 14}, 322 ${earthY - 4}, 316 ${earthY + 5} C309 ${earthY + 9}, 302 ${earthY + 2}, 305 ${earthY - 8} Z`}
                              fill="#34d399"
                            />
                            <text x="314" y={earthY + 38} textAnchor="middle" fill="#4fe3d4" fontSize="9" fontFamily="monospace" fontWeight="700">
                              EARTH DSN ({dsnTargetDeg > 0 ? `+${dsnTargetDeg}°` : `${dsnTargetDeg}°`})
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Right: 5 Individual Data Packets Stream + Link Status */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono-tech">
                      <span className="text-slate-300 font-bold">SCIENCE DATA PACKET STREAM</span>
                      <span className={isDishLocked ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                        {isDishLocked
                          ? '● EARTH DSN LOCKED'
                          : `▲ AIM DISH TOWARD ${dsnTargetDeg > 0 ? `+${dsnTargetDeg}°` : `${dsnTargetDeg}°`}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 p-3 rounded-xl bg-[#07152e] border border-cyan-400/25">
                      {[
                        { pkt: 1, tag: 'H₂ ppm' },
                        { pkt: 2, tag: 'Radar' },
                        { pkt: 3, tag: 'Cryo °C' },
                        { pkt: 4, tag: 'Depth' },
                        { pkt: 5, tag: 'Ice Proof' },
                      ].map(({ pkt, tag }) => {
                        const delivered = transmittedPackets >= pkt;
                        const active = transmitting && transmittedPackets + 1 === pkt;
                        return (
                          <div
                            key={pkt}
                            className={`py-2.5 px-1.5 rounded-xl border text-center font-mono-tech transition-all ${
                              delivered
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                                : active
                                ? 'bg-cyan-500/30 border-[#4fe3d4] text-white animate-bounce'
                                : 'bg-[#040c1d] border-white/15 text-slate-400'
                            }`}
                          >
                            <div className="text-xs font-black">{delivered ? `✓ #${pkt}` : `#${pkt}`}</div>
                            <div className="text-[10px] mt-0.5 truncate">{tag}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Interactive Dish Azimuth Control Deck */}
                    <div className="p-3.5 rounded-xl bg-[#040a18] border border-cyan-400/30 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono-tech tabular-nums">
                        <span className="font-bold text-white">High-Gain Dish Pointing</span>
                        <span className={isDishLocked ? 'text-emerald-300 font-extrabold' : 'text-amber-300 font-extrabold'}>
                          Aim: {dishAimDeg > 0 ? `+${dishAimDeg}°` : `${dishAimDeg}°`} (Target {dsnTargetDeg > 0 ? `+${dsnTargetDeg}°` : `${dsnTargetDeg}°`})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            SFX.click();
                            setDishAimDeg((d) => Math.max(-28, d - 4));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0b1933] border border-white/15 hover:border-[#4fe3d4] text-xs font-bold text-white cursor-pointer"
                        >
                          -4°
                        </button>
                        <input
                          type="range"
                          min={-28}
                          max={28}
                          step={1}
                          value={dishAimDeg}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            SFX.sliderTick((val + 28) / 56);
                            setDishAimDeg(val);
                          }}
                          className="flex-1 accent-[#4fe3d4] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            SFX.click();
                            setDishAimDeg((d) => Math.min(28, d + 4));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0b1933] border border-white/15 hover:border-[#4fe3d4] text-xs font-bold text-white cursor-pointer"
                        >
                          +4°
                        </button>
                      </div>
                    </div>

                    {transmissionInterrupted && (
                      <div className="p-3 rounded-xl bg-amber-950/65 border border-amber-400/60 text-xs font-bold text-amber-200">
                        ⚠ Lunar orbit shifted Earth DSN to {dsnTargetDeg > 0 ? `+${dsnTargetDeg}°` : `${dsnTargetDeg}°`}! Delivered packets ({transmittedPackets}/5) stay saved — sweep Dish Aim onto Earth &amp; resume!
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar + Interactive Stream Action Button */}
                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${
                      transmissionInterrupted
                        ? 'bg-amber-400'
                        : 'bg-gradient-to-r from-[#4fe3d4] to-emerald-400'
                    }`}
                    style={{ width: `${transmittedPct}%` }}
                  />
                </div>

                <button
                  type="button"
                  disabled={transmitting || submittingReward || !isDishLocked}
                  onClick={handleStartOrResumeTransmit}
                  className={`w-full py-3.5 rounded-2xl font-display font-black text-sm sm:text-base tracking-wider uppercase transition ${
                    !isDishLocked
                      ? 'bg-slate-800/80 border border-amber-400/40 text-amber-200 cursor-not-allowed'
                      : transmitting
                      ? 'bg-cyan-800/70 text-cyan-100 cursor-wait'
                      : 'bg-gradient-to-r from-[#4fe3d4] via-[#38bdf8] to-emerald-400 text-[#041022] hover:brightness-110 cursor-pointer shadow-[0_0_24px_rgba(79,227,212,0.4)]'
                  }`}
                >
                  {!isDishLocked
                    ? `📡 AIM DISH TO ${dsnTargetDeg > 0 ? `+${dsnTargetDeg}°` : `${dsnTargetDeg}°`} TO LOCK EARTH DSN`
                    : transmitting
                    ? `STREAMING PACKET #${Math.min(5, transmittedPackets + 1)} OF 5 TO EARTH...`
                    : transmittedPackets > 0
                    ? `📡 RESUME PACKET STREAM (${transmittedPackets}/5) ▶`
                    : '📡 TRANSMIT 5 DATA PACKETS TO EARTH ▶'}
                </button>
              </>
            ) : (
              <div className="rounded-2xl bg-gradient-to-r from-cyan-950/80 via-[#081936] to-emerald-950/60 border border-emerald-400/60 p-5 flex flex-col sm:flex-row items-center gap-5">
                <LunarWaterExplorerBadgeSVG size={118} />
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono-tech font-bold text-emerald-300">
                    ALL 5 PACKETS VERIFIED ON EARTH DSN
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
