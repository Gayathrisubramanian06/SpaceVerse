import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  celsiusToKelvin,
  ChamberTrialReport,
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
  runProbeChamberSimulation,
  SavedEuropaReading,
  SelectedProbeBuild,
  serializeProbeBuild,
  StoredLevel6Progress,
} from '../utils/europaMissionData';
import { LaunchSequenceStatus, RocketPartId } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { RocketAssemblyStage } from './RocketAssemblyStage';
import { LaunchpadPayloadStage } from './LaunchpadPayloadStage';
import { ThermalTelemetrySpecialistBadgeSVG } from './BadgesSVG';
import { EuropaSurfaceExplorer3D } from './EuropaSurfaceExplorer3D';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';
import europaCryoChamberImg from '../assets/images/europa_cryo_chamber_1794826146103.jpg';
import europaIceBannerImg from '../assets/images/europa_ice_banner_1794826147558.jpg';
import probeHardwareCadImg from '../assets/images/probe_hardware_cad_1794826148814.jpg';
import cryoSensorRigImg from '../assets/images/cryo_sensor_rig_1794826149062.jpg';

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
  { id: 1, label: '1 Build' },
  { id: 3, label: '2 Launch' },
  { id: 4, label: '3 Land' },
  { id: 5, label: '4 Explore' },
  { id: 6, label: '5 Transmit' },
];

/* ========================================================
   SUBSYSTEM SLOT ICON SVG
   ======================================================== */
const SubsystemCategoryIconSVG: React.FC<{ category: ProbeCategoryId; active?: boolean }> = ({
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
  if (category === 'legs') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="9" y="6" width="14" height="6" rx="2" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <line x1="11" y1="12" x2="5" y2="25" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="21" y1="12" x2="27" y2="25" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="16" y1="12" x2="16" y2="25" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="5" cy="26" rx="3" ry="1.5" fill={stroke} />
        <ellipse cx="27" cy="26" rx="3" ry="1.5" fill={stroke} />
      </svg>
    );
  }
  if (category === 'sensor') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="12" y="4" width="8" height="17" rx="4" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <circle cx="16" cy="23" r="4.5" fill={stroke} fillOpacity="0.35" stroke={stroke} strokeWidth="1.8" />
        <line x1="16" y1="9" x2="16" y2="21" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (category === 'battery') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="5" y="9" width="20" height="14" rx="2.5" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <rect x="25" y="13" width="3" height="6" rx="1" fill={stroke} />
        <polygon points="16,11 12,17 15.5,17 14,22 19,15.5 15.5,15.5" fill="#fbbf24" />
      </svg>
    );
  }
  if (category === 'heater') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="5" y="7" width="22" height="18" rx="3" fill="#081733" stroke={stroke} strokeWidth="1.8" />
        <path d="M9 20 L12.5 12 L16 20 L19.5 12 L23 19" stroke="#fb923c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
      <path d="M7 14 Q16 24 25 14" stroke={stroke} strokeWidth="2.2" fill="#081733" />
      <line x1="16" y1="19" x2="16" y2="7" stroke="#e2e8f0" strokeWidth="1.6" />
      <circle cx="16" cy="7" r="2" fill="#fbbf24" />
      <path d="M10 5 Q16 1 22 5" stroke={stroke} strokeWidth="1.4" fill="none" />
    </svg>
  );
};

/* ========================================================
   TELEMETRY MICRO-INSTRUMENT GRAPHIC SVG
   ======================================================== */
const TelemetryInstrumentSVG: React.FC<{
  kind: 'temp' | 'power' | 'sensor' | 'rf';
  tone: 'idle' | 'ok' | 'warn' | 'fail';
}> = ({ kind, tone }) => {
  const color =
    tone === 'ok'
      ? '#34d399'
      : tone === 'warn'
      ? '#fbbf24'
      : tone === 'fail'
      ? '#fb7185'
      : '#64748b';
  if (kind === 'temp') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="12" y="4" width="8" height="17" rx="4" fill="#030b1b" stroke={color} strokeWidth="1.6" />
        <circle cx="16" cy="23" r="4.5" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1.6" />
        <line x1="16" y1={tone === 'fail' ? 16 : 9} x2="16" y2="23" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
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
  if (kind === 'sensor') {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
        <rect x="3" y="6" width="26" height="20" rx="3" fill="#030b1b" stroke={color} strokeWidth="1.4" />
        <path
          d={tone === 'warn' ? 'M6 16 L10 9 L14 23 L18 8 L22 22 L26 15' : 'M6 16 Q11 10 16 16 T26 16'}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
      <circle cx="8" cy="24" r="3" fill={color} />
      <path d="M8 17 A7 7 0 0 1 15 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11 A13 13 0 0 1 21 24" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={tone === 'warn' ? 0.3 : 1} />
      <path d="M8 5 A19 19 0 0 1 27 24" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={tone === 'warn' || tone === 'idle' ? 0.25 : 1} />
    </svg>
  );
};

/* ========================================================
   LARGE HARDWARE ILLUSTRATION SVG (CARDS)
   ======================================================== */
const ComponentOptionVisualSVG: React.FC<{ optionId: string }> = ({ optionId }) => {
  if (optionId.startsWith('body_')) {
    const isAerogel = optionId === 'body_ti';
    const isSteel = optionId === 'body_steel';
    const primary = isAerogel ? '#38bdf8' : isSteel ? '#94a3b8' : '#cbd5e1';
    const accent = isAerogel ? '#f59e0b' : isSteel ? '#64748b' : '#38bdf8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-28 select-none" fill="none">
        <defs>
          <linearGradient id={`hull_${optionId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isAerogel ? '#0ea5e9' : isSteel ? '#475569' : '#64748b'} stopOpacity="0.55" />
            <stop offset="100%" stopColor="#09152b" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="96" rx="58" ry="8" fill="#020617" opacity="0.65" />
        {/* Outer octagonal probe fuselage */}
        <polygon
          points="56,22 144,22 168,58 144,94 56,94 32,58"
          fill={`url(#hull_${optionId})`}
          stroke={primary}
          strokeWidth={isSteel ? '4' : '2.6'}
        />
        {/* Inner structural layer / insulation blanket */}
        {isAerogel ? (
          <>
            <polygon
              points="64,30 136,30 156,58 136,86 64,86 44,58"
              fill="#f59e0b"
              fillOpacity="0.16"
              stroke="#fbbf24"
              strokeWidth="1.6"
              strokeDasharray="5 3"
            />
            <rect x="74" y="42" width="52" height="32" rx="4" fill="#07152e" stroke="#4fe3d4" strokeWidth="1.6" />
            <line x1="74" y1="58" x2="126" y2="58" stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="3 2" />
            <circle cx="88" cy="50" r="3" fill="#4fe3d4" />
            <circle cx="112" cy="50" r="3" fill="#4fe3d4" />
          </>
        ) : isSteel ? (
          <>
            <polygon
              points="64,30 136,30 156,58 136,86 64,86 44,58"
              fill="#1e293b"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            {[46, 62, 138, 154].map((bx, i) => (
              <circle key={i} cx={bx} cy="58" r="2.6" fill="#e2e8f0" />
            ))}
            <rect x="76" y="42" width="48" height="32" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.8" />
            <line x1="82" y1="48" x2="118" y2="48" stroke="#64748b" strokeWidth="2" />
            <line x1="82" y1="68" x2="118" y2="68" stroke="#64748b" strokeWidth="2" />
          </>
        ) : (
          <>
            <rect x="70" y="40" width="60" height="36" rx="3" fill="#08142b" stroke={accent} strokeWidth="1.5" />
            <line x1="56" y1="22" x2="70" y2="40" stroke="#94a3b8" strokeWidth="1.2" opacity="0.6" />
            <line x1="144" y1="22" x2="130" y2="40" stroke="#94a3b8" strokeWidth="1.2" opacity="0.6" />
            <circle cx="84" cy="58" r="4" fill="#38bdf8" fillOpacity="0.45" />
            <rect x="96" y="50" width="24" height="16" rx="2" fill="#1e3a8a" stroke="#7dd3fc" strokeWidth="1" />
          </>
        )}
      </svg>
    );
  }

  if (optionId.startsWith('legs_')) {
    const isTri = optionId === 'legs_tri';
    const isQuad = optionId === 'legs_quad';
    const color = isTri ? '#34d399' : isQuad ? '#fbbf24' : '#94a3b8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-28 select-none" fill="none">
        <ellipse cx="100" cy="100" rx="70" ry="6" fill="#020617" opacity="0.65" />
        {/* Lower chassis mounting ring */}
        <rect x="64" y="20" width="72" height="18" rx="4" fill="#0b1b38" stroke={color} strokeWidth="2" />
        <line x1="72" y1="29" x2="128" y2="29" stroke={color} strokeWidth="1.2" strokeDasharray="4 3" />
        {optionId === 'legs_skid' ? (
          <>
            <line x1="74" y1="38" x2="54" y2="90" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="126" y1="38" x2="146" y2="90" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="34" y1="92" x2="166" y2="92" stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
          </>
        ) : isTri ? (
          <>
            <line x1="72" y1="38" x2="38" y2="92" stroke={color} strokeWidth="4" strokeLinecap="round" />
            <line x1="128" y1="38" x2="162" y2="92" stroke={color} strokeWidth="4" strokeLinecap="round" />
            <line x1="100" y1="38" x2="100" y2="94" stroke="#4fe3d4" strokeWidth="3.5" strokeLinecap="round" />
            {/* Gold foil shock joints */}
            <circle cx="55" cy="65" r="4.5" fill="#fbbf24" />
            <circle cx="145" cy="65" r="4.5" fill="#fbbf24" />
            <circle cx="100" cy="66" r="4" fill="#fbbf24" />
            {/* Ice cleats */}
            <ellipse cx="38" cy="94" rx="13" ry="4" fill={color} />
            <ellipse cx="162" cy="94" rx="13" ry="4" fill={color} />
            <ellipse cx="100" cy="96" rx="12" ry="3.5" fill="#4fe3d4" />
          </>
        ) : (
          <>
            <line x1="68" y1="38" x2="34" y2="92" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <line x1="132" y1="38" x2="166" y2="92" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <line x1="84" y1="38" x2="68" y2="95" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            <line x1="116" y1="38" x2="132" y2="95" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="34" cy="93" rx="12" ry="4" fill={color} />
            <ellipse cx="166" cy="93" rx="12" ry="4" fill={color} />
            <ellipse cx="68" cy="96" rx="10" ry="3.5" fill="#cbd5e1" />
            <ellipse cx="132" cy="96" rx="10" ry="3.5" fill="#cbd5e1" />
          </>
        )}
      </svg>
    );
  }

  if (optionId.startsWith('sensor_')) {
    const isRtd = optionId === 'sensor_rtd';
    const isIr = optionId === 'sensor_ir';
    const color = isRtd ? '#4fe3d4' : isIr ? '#a78bfa' : '#f87171';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-28 select-none" fill="none">
        {isIr ? (
          <>
            <rect x="64" y="24" width="72" height="46" rx="8" fill="#0b1730" stroke={color} strokeWidth="2.4" />
            <circle cx="84" cy="47" r="13" fill="#1e1b4b" stroke="#c4b5fd" strokeWidth="2" />
            <circle cx="84" cy="47" r="6" fill="#a78bfa" />
            <circle cx="116" cy="47" r="13" fill="#1e1b4b" stroke="#c4b5fd" strokeWidth="2" />
            <circle cx="116" cy="47" r="6" fill="#38bdf8" />
            <path d="M74 78 L64 98 M126 78 L136 98 M100 78 L100 102" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
          </>
        ) : isRtd ? (
          <>
            {/* Sapphire sheath + platinum RTD coil */}
            <rect x="74" y="14" width="52" height="14" rx="3" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1.8" />
            <rect x="86" y="28" width="28" height="50" rx="12" fill="#071732" stroke="#4fe3d4" strokeWidth="2.4" />
            <path d="M93 38 H107 M93 46 H107 M93 54 H107 M93 62 H107" stroke="#bae6fd" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="100" cy="86" r="12" fill="#4fe3d4" fillOpacity="0.28" stroke="#4fe3d4" strokeWidth="2.2" />
            <circle cx="100" cy="86" r="5" fill="#4fe3d4" />
          </>
        ) : (
          <>
            <rect x="84" y="16" width="32" height="18" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.8" />
            <line x1="94" y1="34" x2="98" y2="82" stroke="#fbbf24" strokeWidth="2.6" />
            <line x1="106" y1="34" x2="102" y2="82" stroke={color} strokeWidth="2.6" />
            <circle cx="100" cy="86" r="7" fill={color} stroke="#fecaca" strokeWidth="1.6" />
          </>
        )}
      </svg>
    );
  }

  if (optionId.startsWith('bat_')) {
    const isLi = optionId === 'bat_li';
    const isHeavy = optionId === 'bat_heavy';
    const color = isLi ? '#34d399' : isHeavy ? '#38bdf8' : '#fb7185';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-28 select-none" fill="none">
        {isHeavy ? (
          <>
            <rect x="38" y="24" width="124" height="68" rx="8" fill="#07152e" stroke={color} strokeWidth="2.4" />
            <rect x="48" y="34" width="46" height="48" rx="4" fill="#0c254d" stroke="#7dd3fc" strokeWidth="1.8" />
            <rect x="106" y="34" width="46" height="48" rx="4" fill="#0c254d" stroke="#7dd3fc" strokeWidth="1.8" />
            <rect x="54" y="42" width="34" height="32" rx="2" fill={color} fillOpacity="0.7" />
            <rect x="112" y="42" width="34" height="32" rx="2" fill={color} fillOpacity="0.7" />
            <line x1="94" y1="58" x2="106" y2="58" stroke="#fbbf24" strokeWidth="3.5" />
          </>
        ) : isLi ? (
          <>
            <rect x="46" y="26" width="102" height="64" rx="8" fill="#06192e" stroke={color} strokeWidth="2.5" />
            <rect x="148" y="44" width="9" height="28" rx="2" fill={color} />
            <rect x="56" y="36" width="24" height="44" rx="3" fill={color} fillOpacity="0.82" />
            <rect x="85" y="36" width="24" height="44" rx="3" fill={color} fillOpacity="0.82" />
            <rect x="114" y="36" width="24" height="44" rx="3" fill={color} fillOpacity="0.82" />
            <polygon points="102,38 92,59 100,59 96,78 111,55 102,55" fill="#fef08a" />
          </>
        ) : (
          <>
            <rect x="64" y="32" width="66" height="52" rx="6" fill="#09152b" stroke={color} strokeWidth="2.2" />
            <rect x="130" y="46" width="7" height="24" rx="2" fill={color} />
            <rect x="72" y="40" width="22" height="36" rx="2" fill={color} fillOpacity="0.7" />
            <polygon points="103,42 95,58 101,58 98,74 109,55 103,55" fill="#fde047" />
          </>
        )}
      </svg>
    );
  }

  if (optionId.startsWith('heat_')) {
    const isPulse = optionId === 'heat_rhupulse';
    const isCoil = optionId === 'heat_coil';
    const color = isPulse ? '#f59e0b' : isCoil ? '#ef4444' : '#94a3b8';
    return (
      <svg viewBox="0 0 200 116" className="w-full h-28 select-none" fill="none">
        <rect x="38" y="22" width="124" height="72" rx="10" fill="#08152b" stroke={color} strokeWidth="2.2" />
        {isPulse ? (
          <>
            {/* Closed-loop cryo-pulse radiator pipe + thermostat */}
            <rect x="52" y="34" width="96" height="48" rx="18" fill="none" stroke="#f59e0b" strokeWidth="5.5" />
            <rect x="66" y="44" width="68" height="28" rx="10" fill="#451a03" stroke="#fbbf24" strokeWidth="1.8" />
            <circle cx="100" cy="58" r="9" fill="#fb923c" />
            <path d="M52 58 H40 M148 58 H160" stroke="#fbbf24" strokeWidth="3" />
          </>
        ) : isCoil ? (
          <>
            {[56, 74, 92, 110, 128, 144].map((x) => (
              <rect key={x} x={x - 4} y="32" width="8" height="52" rx="2" fill="#b45309" stroke="#ef4444" strokeWidth="1.6" />
            ))}
            <line x1="48" y1="58" x2="152" y2="58" stroke="#fca5a5" strokeWidth="3" />
          </>
        ) : (
          <>
            <path
              d="M52 72 L64 42 L76 74 L88 42 L100 74 L112 42 L124 74 L136 42 L148 68"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    );
  }

  // Antenna
  const isDish = optionId === 'ant_hga';
  const isPhased = optionId === 'ant_phased';
  const color = isDish ? '#4fe3d4' : isPhased ? '#38bdf8' : '#f87171';
  return (
    <svg viewBox="0 0 200 116" className="w-full h-28 select-none" fill="none">
      {optionId === 'ant_whip' ? (
        <>
          <rect x="88" y="82" width="24" height="16" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.8" />
          <line x1="100" y1="82" x2="100" y2="20" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="18" r="5" fill={color} />
          <path d="M78 30 Q68 42 78 54 M122 30 Q132 42 122 54" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
        </>
      ) : isPhased ? (
        <>
          <rect x="46" y="28" width="108" height="48" rx="5" fill="#081733" stroke={color} strokeWidth="2.4" />
          {[68, 90, 112, 134].map((x) => (
            <line key={x} x1={x} y1="28" x2={x} y2="76" stroke={color} strokeWidth="1.4" opacity="0.7" />
          ))}
          <line x1="46" y1="52" x2="154" y2="52" stroke={color} strokeWidth="1.4" opacity="0.7" />
          <line x1="100" y1="76" x2="100" y2="98" stroke={color} strokeWidth="4" />
          <path d="M72 18 Q100 6 128 18" stroke="#7dd3fc" strokeWidth="2" />
        </>
      ) : (
        <>
          {/* Parabolic X-Band High-Gain Dish */}
          <path d="M52 54 Q100 94 148 54" stroke={color} strokeWidth="4.5" fill="#0b2042" />
          <path d="M64 56 Q100 80 136 56" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
          <line x1="100" y1="74" x2="100" y2="100" stroke="#94a3b8" strokeWidth="4" />
          <line x1="100" y1="72" x2="100" y2="30" stroke="#e2e8f0" strokeWidth="2.5" />
          <line x1="72" y1="58" x2="100" y2="30" stroke="#cbd5e1" strokeWidth="1.4" opacity="0.75" />
          <line x1="128" y1="58" x2="100" y2="30" stroke="#cbd5e1" strokeWidth="1.4" opacity="0.75" />
          <circle cx="100" cy="28" r="4.5" fill="#fbbf24" />
          <path d="M74 19 Q100 7 126 19" stroke={color} strokeWidth="2" />
          <path d="M84 26 Q100 18 116 26" stroke={color} strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
};

/* ========================================================
   INTERACTIVE PROBE ASSEMBLY SCHEMATIC (CLICKABLE SUBSYSTEMS)
   ======================================================== */
const LiveProbeAssemblySVG: React.FC<{
  build: SelectedProbeBuild;
  activeCat: ProbeCategoryId;
  onSelectCat: (cat: ProbeCategoryId) => void;
  testedReport: ChamberTrialReport | null;
  chamberTesting: boolean;
  chamberPhaseIdx: number;
  pulseTick: number;
}> = ({
  build,
  activeCat,
  onSelectCat,
  testedReport,
  chamberTesting,
  chamberPhaseIdx,
  pulseTick,
}) => {
  const bodyOpt = findProbeOption('body', build.body);
  const legOpt = findProbeOption('legs', build.legs);
  const sensorOpt = findProbeOption('sensor', build.sensor);
  const batOpt = findProbeOption('battery', build.battery);
  const heatOpt = findProbeOption('heater', build.heater);
  const antOpt = findProbeOption('antenna', build.antenna);

  const isTestedCurrent = Boolean(testedReport && testedReport.buildKey === serializeProbeBuild(build));
  const thermalFault = isTestedCurrent && !testedReport!.thermalPassed;
  const powerFault = isTestedCurrent && !testedReport!.powerPassed;
  const massFault = isTestedCurrent && !testedReport!.massPassed;
  const sensorWarn = isTestedCurrent && testedReport!.sensorAdvisory;
  const antWarn = isTestedCurrent && testedReport!.antennaAdvisory;

  const hullColor =
    build.body === 'body_ti' ? '#38bdf8' : build.body === 'body_steel' ? '#94a3b8' : '#cbd5e1';
  const antColor = antWarn ? '#fb7185' : isTestedCurrent ? '#4fe3d4' : '#38bdf8';
  const heaterGlow = thermalFault ? '#60a5fa' : isTestedCurrent ? '#fb923c' : '#38bdf8';
  const sensorColor = sensorWarn ? '#fb7185' : isTestedCurrent ? '#34d399' : '#38bdf8';
  const jitterOffset = sensorWarn ? (pulseTick % 2 === 0 ? -1.8 : 1.8) : 0;

  const hotspotRing = (cat: ProbeCategoryId) =>
    activeCat === cat ? '#4fe3d4' : 'rgba(148, 163, 184, 0.55)';

  return (
    <svg viewBox="0 0 500 280" className="w-full h-56 sm:h-64 lg:h-68 select-none relative z-10" fill="none">
      <defs>
        <radialGradient id="probeChamberGlow" cx="50%" cy="50%" r="55%">
          <stop
            offset="0%"
            stopColor={
              chamberTesting
                ? '#38bdf8'
                : thermalFault
                ? '#60a5fa'
                : isTestedCurrent && testedReport?.certified
                ? '#34d399'
                : '#0ea5e9'
            }
            stopOpacity={chamberTesting ? '0.32' : '0.18'}
          />
          <stop offset="100%" stopColor="#020817" stopOpacity="0" />
        </radialGradient>
        <pattern id="blueprintGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Subtle engineering grid over chamber photo */}
      <rect x="0" y="0" width="500" height="280" rx="12" fill="url(#blueprintGrid)" />
      <circle cx="250" cy="140" r="128" fill="url(#probeChamberGlow)" />

      {/* Chamber scan sweep line when simulating */}
      {chamberTesting && (
        <rect
          x="130"
          y={40 + ((chamberPhaseIdx * 48 + pulseTick * 18) % 195)}
          width="240"
          height="3"
          fill="#4fe3d4"
          opacity="0.7"
        />
      )}

      {/* Ground / Scale Platform */}
      <rect
        x="150"
        y="240"
        width="200"
        height="22"
        rx="4"
        fill={massFault ? '#450a0a' : '#081833'}
        stroke={massFault ? '#f87171' : '#38bdf8'}
        strokeWidth="1.8"
      />
      <text
        x="250"
        y="255"
        textAnchor="middle"
        fill={massFault ? '#fca5a5' : '#bae6fd'}
        fontSize="10"
        fontFamily="monospace"
        fontWeight="700"
      >
        {chamberTesting
          ? `CHAMBER TEST PHASE ${chamberPhaseIdx + 1} / 4`
          : isTestedCurrent
          ? `MEASURED MASS: ${testedReport!.totalWeightKg} KG`
          : 'CLICK ANY CALLOUT OR PART TO CONFIGURE'}
      </text>

      {/* ==================== PROBE SUBSYSTEMS (CENTERED AT X=250) ==================== */}

      {/* 06. COMM ANTENNA (Top) */}
      <g className="cursor-pointer" onClick={() => onSelectCat('antenna')}>
        {activeCat === 'antenna' && (
          <circle cx="250" cy="52" r="34" stroke="#4fe3d4" strokeWidth="1.4" strokeDasharray="4 3" />
        )}
        {build.antenna === 'ant_whip' ? (
          <g>
            <line x1="250" y1="88" x2="250" y2="34" stroke={antColor} strokeWidth="3.2" />
            <circle cx="250" cy="31" r="4.5" fill={antColor} />
            {antWarn && (
              <path d="M232 42 L222 35 M268 42 L278 35" stroke="#fb7185" strokeWidth="2" strokeDasharray="3 3" />
            )}
          </g>
        ) : build.antenna === 'ant_phased' ? (
          <g>
            <line x1="250" y1="88" x2="250" y2="66" stroke={antColor} strokeWidth="3.2" />
            <rect x="210" y="42" width="80" height="24" rx="3" fill="#091a38" stroke={antColor} strokeWidth="2.4" />
            <line x1="230" y1="42" x2="230" y2="66" stroke={antColor} strokeWidth="1.2" opacity="0.7" />
            <line x1="250" y1="42" x2="250" y2="66" stroke={antColor} strokeWidth="1.2" opacity="0.7" />
            <line x1="270" y1="42" x2="270" y2="66" stroke={antColor} strokeWidth="1.2" opacity="0.7" />
            <path d="M226 32 Q250 18 274 32" stroke={antColor} strokeWidth="1.8" fill="none" />
          </g>
        ) : (
          <g>
            <line x1="250" y1="88" x2="250" y2="68" stroke={antColor} strokeWidth="3.2" />
            <path d="M214 52 Q250 76 286 52" stroke={antColor} strokeWidth="3.2" fill="#0b1f3f" />
            <line x1="250" y1="62" x2="250" y2="38" stroke="#e2e8f0" strokeWidth="2.2" />
            <circle cx="250" cy="36" r="3.5" fill="#fbbf24" />
            <path d="M230 28 Q250 16 270 28" stroke={antColor} strokeWidth="1.8" fill="none" />
          </g>
        )}
      </g>

      {/* 01. PROBE BODY */}
      <g
        className="cursor-pointer"
        transform={`translate(0, ${massFault ? 3 : 0})`}
        onClick={() => onSelectCat('body')}
      >
        <polygon
          points="196,88 304,88 320,132 304,176 196,176 180,132"
          fill="#0b1b38"
          stroke={activeCat === 'body' ? '#4fe3d4' : hullColor}
          strokeWidth={activeCat === 'body' ? '3.5' : '2.8'}
        />
        {build.body === 'body_ti' && (
          <polygon
            points="202,94 298,94 312,132 298,170 202,170 188,132"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
        )}
        {thermalFault && (
          <polygon
            points="196,88 304,88 320,132 304,176 196,176 180,132"
            fill="#bae6fd"
            fillOpacity="0.16"
          />
        )}
        <text x="250" y="162" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace" fontWeight="700">
          {bodyOpt.shortName.toUpperCase()}
        </text>
      </g>

      {/* 04. BATTERY (Inside Body Left) */}
      <g className="cursor-pointer" onClick={() => onSelectCat('battery')}>
        <rect
          x="202"
          y="106"
          width="42"
          height="28"
          rx="4"
          fill="#061124"
          stroke={activeCat === 'battery' ? '#4fe3d4' : powerFault ? '#fb7185' : '#38bdf8'}
          strokeWidth={activeCat === 'battery' ? '2.4' : '1.8'}
        />
        <rect
          x="207"
          y="111"
          width={powerFault ? (pulseTick % 2 === 0 ? 10 : 5) : 32}
          height="18"
          rx="2"
          fill={powerFault ? '#fb7185' : isTestedCurrent ? '#34d399' : '#38bdf8'}
          fillOpacity="0.85"
        />
      </g>

      {/* 05. HEATER (Inside Body Right) */}
      <g className="cursor-pointer" onClick={() => onSelectCat('heater')}>
        <rect
          x="256"
          y="106"
          width="42"
          height="28"
          rx="4"
          fill="#061124"
          stroke={activeCat === 'heater' ? '#4fe3d4' : heaterGlow}
          strokeWidth={activeCat === 'heater' ? '2.4' : '1.8'}
        />
        <path
          d="M262 126 L268 113 L274 127 L280 113 L286 127 L292 114"
          stroke={heaterGlow}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* 03. TEMPERATURE SENSOR (Extending Bottom Center) */}
      <g
        className="cursor-pointer"
        transform={`translate(${jitterOffset}, 0)`}
        onClick={() => onSelectCat('sensor')}
      >
        <rect
          x="243"
          y="176"
          width="14"
          height="38"
          rx="6"
          fill="#0b1830"
          stroke={activeCat === 'sensor' ? '#4fe3d4' : sensorColor}
          strokeWidth={activeCat === 'sensor' ? '2.6' : '2'}
        />
        <circle cx="250" cy="218" r="7" fill={sensorColor} />
      </g>

      {/* 02. LANDING LEGS */}
      <g className="cursor-pointer" onClick={() => onSelectCat('legs')}>
        {build.legs === 'legs_skid' ? (
          <g>
            <line x1="202" y1="170" x2="176" y2="226" stroke={activeCat === 'legs' ? '#4fe3d4' : '#94a3b8'} strokeWidth="4" />
            <line x1="298" y1="170" x2="324" y2="226" stroke={activeCat === 'legs' ? '#4fe3d4' : '#94a3b8'} strokeWidth="4" />
            <line x1="160" y1="229" x2="202" y2="229" stroke={activeCat === 'legs' ? '#4fe3d4' : '#cbd5e1'} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="298" y1="229" x2="340" y2="229" stroke={activeCat === 'legs' ? '#4fe3d4' : '#cbd5e1'} strokeWidth="4.5" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <line x1="200" y1="170" x2="166" y2="230" stroke={activeCat === 'legs' ? '#4fe3d4' : '#34d399'} strokeWidth="4" />
            <line x1="300" y1="170" x2="334" y2="230" stroke={activeCat === 'legs' ? '#4fe3d4' : '#34d399'} strokeWidth="4" />
            <ellipse cx="166" cy="231" rx="12" ry="4" fill="#34d399" />
            <ellipse cx="334" cy="231" rx="12" ry="4" fill="#34d399" />
            {build.legs === 'legs_quad' && (
              <>
                <line x1="222" y1="176" x2="202" y2="230" stroke="#fbbf24" strokeWidth="3.2" />
                <line x1="278" y1="176" x2="298" y2="230" stroke="#fbbf24" strokeWidth="3.2" />
                <ellipse cx="202" cy="231" rx="9" ry="3.5" fill="#fbbf24" />
                <ellipse cx="298" cy="231" rx="9" ry="3.5" fill="#fbbf24" />
              </>
            )}
          </g>
        )}
      </g>

      {/* ==================== INTERACTIVE ENGINEERING CALLOUTS ==================== */}
      {/* Top-Right: 06 Antenna */}
      <g className="cursor-pointer" onClick={() => onSelectCat('antenna')}>
        <polyline points="274,48 338,26 354,26" stroke={hotspotRing('antenna')} strokeWidth="1.2" />
        <rect x="354" y="11" width="136" height="30" rx="5" fill="#040d1e" stroke={hotspotRing('antenna')} strokeWidth="1.2" />
        <text x="362" y="23" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="700">06 ANTENNA</text>
        <text x="362" y="35" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{antOpt.shortName}</text>
      </g>

      {/* Top-Left: 01 Probe Body */}
      <g className="cursor-pointer" onClick={() => onSelectCat('body')}>
        <polyline points="184,116 148,58 134,58" stroke={hotspotRing('body')} strokeWidth="1.2" />
        <rect x="10" y="42" width="124" height="32" rx="5" fill="#040d1e" stroke={hotspotRing('body')} strokeWidth="1.2" />
        <text x="18" y="55" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="700">01 PROBE BODY</text>
        <text x="18" y="67" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{bodyOpt.shortName}</text>
      </g>

      {/* Mid-Left: 04 Battery */}
      <g className="cursor-pointer" onClick={() => onSelectCat('battery')}>
        <polyline points="202,120 134,120" stroke={hotspotRing('battery')} strokeWidth="1.2" />
        <rect x="10" y="104" width="124" height="32" rx="5" fill="#040d1e" stroke={hotspotRing('battery')} strokeWidth="1.2" />
        <text x="18" y="117" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="700">04 BATTERY</text>
        <text x="18" y="129" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{batOpt.shortName}</text>
      </g>

      {/* Mid-Right: 05 Heater */}
      <g className="cursor-pointer" onClick={() => onSelectCat('heater')}>
        <polyline points="298,120 354,120" stroke={hotspotRing('heater')} strokeWidth="1.2" />
        <rect x="354" y="104" width="136" height="32" rx="5" fill="#040d1e" stroke={hotspotRing('heater')} strokeWidth="1.2" />
        <text x="362" y="117" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="700">05 HEATER</text>
        <text x="362" y="129" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{heatOpt.shortName}</text>
      </g>

      {/* Bottom-Left: 02 Landing Legs */}
      <g className="cursor-pointer" onClick={() => onSelectCat('legs')}>
        <polyline points="178,196 146,196 134,196" stroke={hotspotRing('legs')} strokeWidth="1.2" />
        <rect x="10" y="180" width="124" height="32" rx="5" fill="#040d1e" stroke={hotspotRing('legs')} strokeWidth="1.2" />
        <text x="18" y="193" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="700">02 LANDING LEGS</text>
        <text x="18" y="205" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{legOpt.shortName}</text>
      </g>

      {/* Bottom-Right: 03 Temperature Sensor */}
      <g className="cursor-pointer" onClick={() => onSelectCat('sensor')}>
        <polyline points="257,212 332,196 354,196" stroke={hotspotRing('sensor')} strokeWidth="1.2" />
        <rect x="354" y="180" width="136" height="32" rx="5" fill="#040d1e" stroke={hotspotRing('sensor')} strokeWidth="1.2" />
        <text x="362" y="193" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="700">03 TEMP SENSOR</text>
        <text x="362" y="205" fill="#f8fafc" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">{sensorOpt.shortName}</text>
      </g>
    </svg>
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
  const normalizedInitStage: EuropaStage =
    safeInit.stage === 2 ? 3 : safeInit.stage || 1;

  const [stage, setStage] = useState<EuropaStage>(normalizedInitStage);
  const [probeBuild, setProbeBuild] = useState<SelectedProbeBuild>(
    safeInit.probeBuild || { ...DEFAULT_PROBE_BUILD }
  );
  const [activeBuildCat, setActiveBuildCat] = useState<ProbeCategoryId>('body');
  const [chamberTesting, setChamberTesting] = useState<boolean>(false);
  const [chamberPhaseIdx, setChamberPhaseIdx] = useState<number>(0);
  const [testedReport, setTestedReport] = useState<ChamberTrialReport | null>(() => {
    if (normalizedInitStage >= 3 || safeInit.launchCompleted) {
      return runProbeChamberSimulation(safeInit.probeBuild || DEFAULT_PROBE_BUILD, 1);
    }
    return null;
  });
  const [trialHistory, setTrialHistory] = useState<ChamberTrialReport[]>([]);

  // Preserved in saved payload for compatibility
  const [calibrationSolvedIds, setCalibrationSolvedIds] = useState<number[]>(
    safeInit.calibrationSolvedIds || []
  );

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

  // Pulse ticker only needed for Stage 1 live probe animations
  useEffect(() => {
    if (!visible || stage !== 1) return;
    const id = window.setInterval(() => setPulseTick((t) => t + 1), chamberTesting ? 260 : 650);
    return () => window.clearInterval(id);
  }, [visible, stage, chamberTesting]);

  // Sync from incoming initialProgress only when lab opens
  useEffect(() => {
    if (!visible) {
      SFX.cancelSpeech();
      return;
    }
    const src = initialProgress || DEFAULT_LEVEL6_PROGRESS;
    const nextStage: EuropaStage = src.stage === 2 ? 3 : src.stage || 1;
    setStage(nextStage);
    const restoredBuild = src.probeBuild || { ...DEFAULT_PROBE_BUILD };
    setProbeBuild(restoredBuild);
    setChamberTesting(false);
    setChamberPhaseIdx(0);
    setTestedReport(
      nextStage >= 3 || src.launchCompleted
        ? runProbeChamberSimulation(restoredBuild, 1)
        : null
    );
    setTrialHistory([]);
    setCalibrationSolvedIds(src.calibrationSolvedIds || []);
    setRocketParts((src.rocketParts as RocketPartId[]) || []);
    setRocketStage(src.rocketStage || 1);
    setLaunchCompleted(Boolean(src.launchCompleted));
    setLandingSolved(src.landingSolved || { speed: false, tilt: false, thermal: false });
    setLanded(Boolean(src.landed));
    setLandingAltM(src.landed ? 0 : 840);
    setCollectedReadings(src.collectedReadings || []);
    setTransmittedPackets(src.transmittedPackets || 0);

    const now = Date.now();
    const startMs = src.missionStartedAtMs || now;
    const deadlineMs = src.missionDeadlineMs || now + EUROPA_MISSION_DURATION_SEC * 1000;
    setMissionStartedAtMs(startMs);
    setMissionDeadlineMs(deadlineMs);
    setTimerExpired(Boolean(src.timerExpired));
    const left = Math.max(0, Math.ceil((deadlineMs - now) / 1000));
    setRemainingSec(left);
    if (left <= 0 && !src.timerExpired && src.transmittedPackets < 5) {
      setTimerExpired(true);
    }
    warningsFiredRef.current = {
      m5: left <= 300,
      m2: left <= 120,
      s30: left <= 30,
    };
    setMissionSuccess(false);
    setRewardResult(null);
    setLinkInterrupted(false);
    setTransmitting(false);
  }, [visible]); // only rehydrate when opened

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
      1: 'Stage 1, Europa Probe Workbench. Choose 6 cryo subsystems under 120 kilograms and 850 Star Credits, then run the Chamber Test.',
      3: 'Stage 2, Heavy Rocket Assembly. Stack the launch vehicle and stage your certified Europa probe.',
      4: 'Stage 3, Europa Descent. Tune braking thrust, tilt trim, and cabin heating to land safely on the ice crust.',
      5: 'Stage 4, Surface Exploration. Fly your cryo drone across all 5 Europa sites to capture temperature scans.',
      6: 'Stage 5, Deep Space Downlink. Stream all 5 discovery packets back to Earth Mission Control.',
    };
    const msg = cues[effective];
    if (msg) SFX.speakCue(msg);
  }, [visible, stage]);

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

  const handleRetryMission = () => {
    SFX.click();
    onReplayReset();
    const now = Date.now();
    const deadline = now + EUROPA_MISSION_DURATION_SEC * 1000;
    setStage(1);
    setProbeBuild({ ...DEFAULT_PROBE_BUILD });
    setChamberTesting(false);
    setChamberPhaseIdx(0);
    setTestedReport(null);
    setTrialHistory([]);
    setCalibrationSolvedIds([]);
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
    setMissionStartedAtMs(now);
    setMissionDeadlineMs(deadline);
    setRemainingSec(EUROPA_MISSION_DURATION_SEC);
    setTimerExpired(false);
    warningsFiredRef.current = { m5: false, m2: false, s30: false };
  };

  const handleSelectComponent = (category: ProbeCategoryId, optionId: string) => {
    if (launchCompleted || chamberTesting) {
      SFX.snapWrong();
      return;
    }
    SFX.select();
    const nextBuild = { ...probeBuild, [category]: optionId };
    setProbeBuild(nextBuild);
    persistSnapshot({ probeBuild: nextBuild });
  };

  const handleRunChamberTest = () => {
    if (chamberTesting) return;
    SFX.shakerStart();
    setChamberTesting(true);
    setChamberPhaseIdx(0);
    window.setTimeout(() => setChamberPhaseIdx(1), 320);
    window.setTimeout(() => setChamberPhaseIdx(2), 640);
    window.setTimeout(() => setChamberPhaseIdx(3), 960);
    window.setTimeout(() => {
      const nextTrialNum = trialHistory.length + 1;
      const report = runProbeChamberSimulation(probeBuild, nextTrialNum);
      setChamberTesting(false);
      setTestedReport(report);
      setTrialHistory((prev) => [report, ...prev].slice(0, 5));
      if (report.certified) {
        SFX.shakerPass();
      } else {
        SFX.snapWrong();
      }
    }, 1280);
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
            STAGE 1: GRAPHICS-FIRST PROBE HANGAR & CRYO TEST BENCH
           ============================================================ */}
        {stage === 1 && (() => {
          const currentBuildKey = serializeProbeBuild(probeBuild);
          const isCurrentTested = Boolean(testedReport && testedReport.buildKey === currentBuildKey);
          const currentReport = isCurrentTested ? testedReport : null;
          const activeMeta =
            PROBE_CATEGORY_META.find((c) => c.id === activeBuildCat) || PROBE_CATEGORY_META[0];
          const chamberPhaseLabels = [
            'Mass & Grant Check',
            '-170°C Cryo Soak',
            'Power Load Draw',
            'Sensor & RF Sweep',
          ];

          const hardwareStudioThumb =
            activeBuildCat === 'sensor' || activeBuildCat === 'antenna'
              ? cryoSensorRigImg
              : probeHardwareCadImg;

          return (
            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 min-h-full flex flex-col gap-3.5">
              {/* Compact Visual Banner Header */}
              <div className="relative rounded-2xl overflow-hidden border border-sky-400/25 bg-[#07132a] px-5 py-3 flex flex-wrap items-center justify-between gap-4">
                <img
                  src={europaIceBannerImg}
                  alt="Europa mission horizon"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#07132a]/95 via-[#07132a]/85 to-[#07132a]/95 pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3.5">
                  <div className="w-12 h-9 rounded-lg overflow-hidden border border-sky-400/40 shrink-0 hidden sm:block">
                    <img
                      src={probeHardwareCadImg}
                      alt="Probe CAD schematic"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Europa Probe Hangar
                    </h2>
                    <div className="text-xs text-sky-200/80">Equip 6 parts · Run Cryo Test</div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-5 shrink-0 font-mono-tech text-xs tabular-nums">
                  <div className="flex items-center gap-2 bg-[#040d1e]/85 border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400">Mass</span>
                    <strong className="text-sm text-white">{probeMetrics.totalWeightKg} kg</strong>
                  </div>
                  <div className="flex items-center gap-2 bg-[#040d1e]/85 border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400">Cost</span>
                    <strong className="text-sm text-amber-300">★ {probeMetrics.totalCostSc}</strong>
                  </div>
                  <div className="flex items-center gap-2 bg-[#040d1e]/85 border border-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-slate-400">Tests</span>
                    <strong className="text-sm text-sky-300">{trialHistory.length}</strong>
                  </div>
                </div>
              </div>

              {launchCompleted && (
                <div className="px-4 py-2 rounded-xl bg-sky-950/60 border border-sky-400/40 text-xs text-sky-200 flex items-center justify-between gap-3">
                  <span>Hardware locked in transit</span>
                  <button
                    type="button"
                    onClick={handleRetryMission}
                    className="px-3 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 font-bold text-xs cursor-pointer shrink-0"
                  >
                    Replay ↺
                  </button>
                </div>
              )}

              {/* Main Asymmetric Hangar Layout */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* LEFT COLUMN (7/12): Graphic Subsystem Icons + Large Visual Hardware Cards + Cryo Strip */}
                <div className="lg:col-span-7 flex flex-col gap-3.5 min-w-0">
                  {/* 6-Subsystem Icon Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PROBE_CATEGORY_META.map((cat) => {
                      const selected = activeBuildCat === cat.id;
                      const chosen = findProbeOption(cat.id, probeBuild[cat.id]);
                      const flagged = currentReport?.affectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            SFX.click();
                            setActiveBuildCat(cat.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                            selected
                              ? 'bg-sky-500/18 border-sky-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.18)]'
                              : flagged
                              ? 'bg-rose-950/30 border-rose-400/50 text-slate-200 hover:border-rose-300'
                              : 'bg-[#07132a] border-white/12 hover:border-sky-400/45 text-slate-200'
                          }`}
                        >
                          <SubsystemCategoryIconSVG category={cat.id} active={selected} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-mono-tech">
                              <span className="text-sky-300 font-semibold truncate">{cat.label}</span>
                              {flagged ? (
                                <span className="text-rose-300 font-bold shrink-0">▲</span>
                              ) : currentReport?.certified ? (
                                <span className="text-emerald-300 font-bold shrink-0">●</span>
                              ) : null}
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white truncate">
                              {chosen.shortName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-tech tabular-nums">
                              {chosen.weightKg}kg · ★{chosen.costSc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Subsystem Visual Cards (Graphics-First, Zero Paragraphs) */}
                  <div className="rounded-2xl bg-[#07132a] border border-white/12 p-4 space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <SubsystemCategoryIconSVG category={activeMeta.id} active />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          {activeMeta.slotCode}. {activeMeta.label}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono-tech text-slate-400">
                        Select 1 module
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {PROBE_COMPONENTS[activeBuildCat].map((opt) => {
                        const isChosen = probeBuild[activeBuildCat] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={launchCompleted || chamberTesting}
                            onClick={() => handleSelectComponent(activeBuildCat, opt.id)}
                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-3 transition ${
                              launchCompleted || chamberTesting
                                ? 'opacity-75 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              isChosen
                                ? 'bg-[#0b2042] border-sky-400 ring-1 ring-sky-400/45 shadow-[0_0_24px_rgba(56,189,248,0.16)]'
                                : 'bg-[#040d1e] border-white/12 hover:border-sky-400/45'
                            }`}
                          >
                            {/* Large Visual Graphic Stage */}
                            <div className="relative rounded-xl overflow-hidden bg-[#020816] border border-white/10 px-2 py-2.5 flex items-center justify-center">
                              <img
                                src={hardwareStudioThumb}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none"
                              />
                              <div className="relative z-10 w-full">
                                <ComponentOptionVisualSVG optionId={opt.id} />
                              </div>
                              <span
                                className={`absolute top-2 right-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  isChosen
                                    ? 'bg-sky-400 text-[#031024]'
                                    : 'bg-slate-900/85 text-slate-300 border border-white/10'
                                }`}
                              >
                                {isChosen ? '✓ Equipped' : 'Equip'}
                              </span>
                            </div>

                            {/* Minimal Hardware Label & Numeric Specs Only */}
                            <div className="space-y-2 px-0.5">
                              <div>
                                <h4 className="text-sm font-bold text-white leading-tight">
                                  {opt.name}
                                </h4>
                                <div className="text-[11px] font-mono-tech text-sky-300/85 mt-0.5 truncate">
                                  {opt.specValue}
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

                  {/* Compact Cryo Chamber Launch & Visual Trial Strip */}
                  <div className="flex-1 rounded-2xl bg-[#07132a] border border-white/12 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-11 rounded-lg overflow-hidden border border-sky-400/35 shrink-0">
                          <img
                            src={europaCryoChamberImg}
                            alt="Cryogenic vacuum chamber"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Cryo Chamber Lab</h3>
                          <div className="text-[11px] text-slate-400">
                            {chamberTesting
                              ? chamberPhaseLabels[chamberPhaseIdx]
                              : `${trialHistory.length} trial${trialHistory.length === 1 ? '' : 's'} logged`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={chamberTesting || launchCompleted}
                        onClick={handleRunChamberTest}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition whitespace-nowrap shrink-0 ${
                          chamberTesting || launchCompleted
                            ? 'bg-sky-900/60 text-sky-200 cursor-wait border border-sky-400/30'
                            : 'bg-sky-400 hover:bg-sky-300 text-[#031024] cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                        }`}
                      >
                        {chamberTesting ? `Testing (${chamberPhaseIdx + 1}/4)...` : 'Run Cryo Test'}
                      </button>
                    </div>

                    {chamberTesting ? (
                      <div className="grid grid-cols-4 gap-2">
                        {chamberPhaseLabels.map((lbl, idx) => (
                          <div
                            key={lbl}
                            className={`px-2.5 py-2 rounded-lg border text-[11px] font-mono-tech text-center transition ${
                              idx <= chamberPhaseIdx
                                ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                                : 'bg-[#040d1e] border-white/10 text-slate-500'
                            }`}
                          >
                            {lbl}
                          </div>
                        ))}
                      </div>
                    ) : trialHistory.length === 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { img: probeHardwareCadImg, label: '01 Chassis' },
                          { img: cryoSensorRigImg, label: '02 Sensors' },
                          { img: europaCryoChamberImg, label: '03 -170°C Test' },
                          { img: europaIceBannerImg, label: '04 Europa Spec' },
                        ].map((card) => (
                          <div
                            key={card.label}
                            className="relative h-14 rounded-xl overflow-hidden border border-white/10 bg-[#040d1e]"
                          >
                            <img
                              src={card.img}
                              alt={card.label}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-50"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#020816] via-[#020816]/30 to-transparent" />
                            <span className="absolute bottom-1.5 left-2 text-[10px] font-mono-tech font-bold text-slate-200">
                              {card.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {trialHistory.map((trial) => {
                          const isCurrentRow = trial.buildKey === currentBuildKey;
                          return (
                            <div
                              key={trial.trialNumber}
                              className={`px-3 py-2 rounded-xl border text-xs font-mono-tech tabular-nums flex items-center gap-2.5 ${
                                isCurrentRow
                                  ? trial.certified
                                    ? 'bg-emerald-950/45 border-emerald-400/60 text-emerald-200'
                                    : 'bg-rose-950/45 border-rose-400/60 text-rose-200'
                                  : 'bg-[#040d1e] border-white/10 text-slate-300'
                              }`}
                            >
                              <span className="font-bold">#{trial.trialNumber}</span>
                              <span>{trial.totalWeightKg}kg</span>
                              <span className={trial.thermalPassed ? 'text-emerald-300' : 'text-rose-300'}>
                                {trial.observedCoreTempC}°C
                              </span>
                              <span className={trial.powerPassed ? 'text-emerald-300' : 'text-rose-300'}>
                                {trial.observedPowerMinutes}m
                              </span>
                              <span className="font-bold">
                                {trial.certified ? '✓ PASS' : '✖ FAIL'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN (5/12): Photographic Cryo Chamber + Interactive Blueprint + Graphic Gauges */}
                <div className="lg:col-span-5 rounded-2xl bg-[#07132a] border border-sky-400/30 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white">Cryo Chamber Rig</h3>
                      <span
                        className={`text-xs font-mono-tech font-bold whitespace-nowrap ${
                          chamberTesting
                            ? 'text-sky-300'
                            : currentReport?.certified
                            ? 'text-emerald-300'
                            : currentReport
                            ? 'text-rose-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {chamberTesting
                          ? '● Simulating...'
                          : currentReport?.certified
                          ? '● Certified'
                          : currentReport
                          ? '✖ Fault Found'
                          : '▲ Untested'}
                      </span>
                    </div>

                    {/* Chamber Image Backdrop + Clickable Probe SVG */}
                    <div className="relative rounded-2xl overflow-hidden border border-sky-400/25 bg-[#020816]">
                      <img
                        src={europaCryoChamberImg}
                        alt="Europa cryogenic vacuum test chamber"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-radial from-[#020816]/40 via-[#020816]/75 to-[#020816]/92 pointer-events-none" />
                      <LiveProbeAssemblySVG
                        build={probeBuild}
                        activeCat={activeBuildCat}
                        onSelectCat={(cat) => {
                          SFX.click();
                          setActiveBuildCat(cat);
                        }}
                        testedReport={testedReport}
                        chamberTesting={chamberTesting}
                        chamberPhaseIdx={chamberPhaseIdx}
                        pulseTick={pulseTick}
                      />
                    </div>

                    {/* 4 Graphic Telemetry Instruments (Hidden until Cryo Test Runs!) */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-mono-tech tabular-nums">
                      <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10 flex items-center gap-2.5">
                        <TelemetryInstrumentSVG
                          kind="temp"
                          tone={
                            !currentReport
                              ? 'idle'
                              : currentReport.thermalPassed
                              ? 'ok'
                              : 'fail'
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Bay Temp</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.thermalPassed
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {currentReport ? `${currentReport.observedCoreTempC}°C` : 'Untested'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10 flex items-center gap-2.5">
                        <TelemetryInstrumentSVG
                          kind="power"
                          tone={
                            !currentReport
                              ? 'idle'
                              : currentReport.powerPassed
                              ? 'ok'
                              : 'fail'
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Battery Hold</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.powerPassed
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {currentReport ? `${currentReport.observedPowerMinutes} min` : 'Untested'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10 flex items-center gap-2.5">
                        <TelemetryInstrumentSVG
                          kind="sensor"
                          tone={
                            !currentReport
                              ? 'idle'
                              : currentReport.sensorAdvisory
                              ? 'warn'
                              : 'ok'
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Sensor Drift</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.sensorAdvisory
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {currentReport ? `±${currentReport.observedSensorDriftC}°C` : 'Untested'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#040d1e] border border-white/10 flex items-center gap-2.5">
                        <TelemetryInstrumentSVG
                          kind="rf"
                          tone={
                            !currentReport
                              ? 'idle'
                              : currentReport.antennaAdvisory
                              ? 'warn'
                              : 'ok'
                          }
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-400">Earth RF</div>
                          <div
                            className={`text-xs sm:text-sm font-bold truncate ${
                              !currentReport
                                ? 'text-slate-500'
                                : currentReport.antennaAdvisory
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {currentReport ? `${currentReport.observedSignalDbm} dBm` : 'Untested'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Concise Findings (Only After Cryo Test Runs) */}
                    {currentReport && (currentReport.findings.length > 0 || currentReport.advisories.length > 0) && (
                      <div className="space-y-1.5 text-[11px]">
                        {currentReport.findings.map((f, i) => (
                          <div
                            key={`f-${i}`}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-400/45 text-rose-200"
                          >
                            ✖ {f}
                          </div>
                        ))}
                        {currentReport.advisories.map((a, i) => (
                          <div
                            key={`a-${i}`}
                            className="px-3 py-1.5 rounded-lg bg-amber-950/55 border border-amber-400/40 text-amber-200"
                          >
                            ▲ {a}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Primary Action CTA */}
                  <div className="pt-2 border-t border-white/10">
                    {!currentReport ? (
                      <button
                        type="button"
                        disabled={chamberTesting || launchCompleted}
                        onClick={handleRunChamberTest}
                        className="w-full py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-[#031024] font-extrabold text-sm uppercase tracking-wide transition cursor-pointer"
                      >
                        {chamberTesting ? 'Running Cryo Test...' : 'Run Cryo Chamber Test'}
                      </button>
                    ) : !currentReport.certified ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed"
                      >
                        Swap Flagged Parts &amp; Re-Test
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          SFX.taskComplete();
                          setStage(3);
                          persistSnapshot({ stage: 3 });
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#34d399] text-[#031024] font-extrabold text-sm uppercase tracking-wide hover:brightness-110 transition cursor-pointer"
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
                  subtitle: 'Drag your certified Europa probe onto the payload adapter.',
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
          <div className="p-4 sm:p-6 max-w-[1440px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
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
