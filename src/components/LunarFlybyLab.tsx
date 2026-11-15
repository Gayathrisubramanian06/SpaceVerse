import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluateLunarFuel,
  LUNAR_DEFAULT_FUEL_KG,
  LUNAR_DRY_MASS_KG,
  LUNAR_MAX_FUEL_KG,
  LUNAR_MIN_FUEL_KG,
  LUNAR_OPTIMAL_MAX_KG,
  LUNAR_OPTIMAL_MIN_KG,
  LUNAR_ROCKET_LIFT_LIMIT_KG,
} from '../utils/lunarFuelMath';
import { SFX } from '../utils/sfx';
import { LunarFlybyIllustrationSVG, PropulsionEngineerBadgeSVG } from './BadgesSVG';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

export interface Level5CompletionPayload {
  fuelKg: number;
  confirmedFuelConfig: boolean;
  flybySimulationCompleted: boolean;
  missionDurationSec: number;
}

export interface Level5RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  newStarBalance: number;
  propulsionUpgradeUnlocked: boolean;
}

interface LunarFlybyLabProps {
  visible: boolean;
  starCredits: number;
  alreadyCompleted: boolean;
  propulsionUpgradeUnlocked: boolean;
  onCompleteMission: (payload: Level5CompletionPayload) => Promise<Level5RewardResult>;
  onContinueToLevel6: () => void;
  onBackToAcademy: () => void;
  onExit: () => void;
  onOpenHandbook?: () => void;
}

type LabPhase = 'workbench' | 'launching' | 'victory';
type ProbeComponentId = 'propulsion' | 'tank' | 'solar' | 'antenna';
type TrajectoryViewMode = 'orbit' | 'curve';

interface ProbeComponentInfo {
  id: ProbeComponentId;
  title: string;
  spec: string;
}

const PROBE_COMPONENTS: Record<ProbeComponentId, ProbeComponentInfo> = {
  propulsion: {
    id: 'propulsion',
    title: 'Propulsion',
    spec: 'Lunar Bipropellant Thruster',
  },
  tank: {
    id: 'tank',
    title: 'Fuel Tank',
    spec: '10–100 kg Titanium Cell',
  },
  solar: {
    id: 'solar',
    title: 'Solar Wings',
    spec: 'Dual Photovoltaic Array',
  },
  antenna: {
    id: 'antenna',
    title: 'X-Band Dish',
    spec: 'Deep-Space Telemetry',
  },
};

const LAB_STARS = Array.from({ length: 90 }, (_, i) => ({
  x: ((i * 89 + 17) % 997) / 997,
  y: ((i * 173 + 29) % 991) / 991,
  r: 0.7 + ((i * 31) % 8) * 0.18,
  phase: i * 0.73,
}));

const ProbePartIconSVG: React.FC<{ id: ProbeComponentId; active: boolean }> = ({ id, active }) => {
  const stroke = active ? '#67e8f9' : '#94a3b8';
  switch (id) {
    case 'propulsion':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="17" y="6" width="14" height="8" rx="2" fill="#334155" stroke={stroke} strokeWidth="1.5" />
          <path d="M18 14 L12 31 L36 31 L30 14 Z" fill="#1e293b" stroke={stroke} strokeWidth="1.6" />
          <polygon points="17,32 31,32 24,44" fill="#38bdf8" opacity="0.85" />
          <polygon points="20,32 28,32 24,40" fill="#fef08a" />
        </svg>
      );
    case 'tank':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="14" y="7" width="20" height="34" rx="8" fill="#0f172a" stroke={stroke} strokeWidth="1.6" />
          <rect x="17" y="20" width="14" height="18" rx="5" fill="#10b981" opacity="0.85" />
          <line x1="14" y1="18" x2="34" y2="18" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 2" />
          <rect x="21" y="3" width="6" height="4" rx="1" fill="#64748b" />
        </svg>
      );
    case 'solar':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <rect x="5" y="16" width="15" height="16" rx="2" fill="#1d4ed8" stroke={stroke} strokeWidth="1.4" />
          <rect x="28" y="16" width="15" height="16" rx="2" fill="#1d4ed8" stroke={stroke} strokeWidth="1.4" />
          <rect x="20" y="19" width="8" height="10" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" />
          <line x1="12.5" y1="16" x2="12.5" y2="32" stroke="#93c5fd" strokeWidth="1" />
          <line x1="35.5" y1="16" x2="35.5" y2="32" stroke="#93c5fd" strokeWidth="1" />
        </svg>
      );
    case 'antenna':
      return (
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
          <path d="M12 24 A12 12 0 0 0 36 24" fill="#1e293b" stroke={stroke} strokeWidth="2" />
          <line x1="24" y1="24" x2="24" y2="14" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="24" cy="13" r="2.6" fill="#4fe3d4" />
          <path d="M17 9 Q24 4 31 9" stroke="#67e8f9" strokeWidth="1.5" fill="none" />
          <rect x="21" y="35" width="6" height="7" rx="1" fill="#475569" />
        </svg>
      );
  }
};

const PresetTrajectoryThumbSVG: React.FC<{ kind: 'light' | 'optimal' | 'heavy' }> = ({ kind }) => {
  if (kind === 'light') {
    return (
      <svg width="54" height="28" viewBox="0 0 54 28" fill="none">
        <circle cx="9" cy="18" r="5" fill="#0284c7" />
        <circle cx="44" cy="9" r="5" fill="#cbd5e1" />
        <path d="M14 16 Q28 24 47 25" stroke="#f87171" strokeWidth="2" strokeDasharray="3 2" fill="none" />
      </svg>
    );
  }
  if (kind === 'optimal') {
    return (
      <svg width="54" height="28" viewBox="0 0 54 28" fill="none">
        <circle cx="9" cy="18" r="5" fill="#0284c7" />
        <circle cx="44" cy="10" r="5" fill="#f8fafc" />
        <circle cx="44" cy="10" r="8" stroke="#34d399" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M13 15 Q28 3 49 6" stroke="#34d399" strokeWidth="2.2" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="54" height="28" viewBox="0 0 54 28" fill="none">
      <circle cx="9" cy="18" r="5" fill="#0284c7" />
      <circle cx="44" cy="10" r="5" fill="#cbd5e1" />
      <path d="M13 15 Q19 9 21 20" stroke="#f87171" strokeWidth="2" fill="none" />
      <line x1="18" y1="12" x2="24" y2="18" stroke="#f87171" strokeWidth="2" />
      <line x1="24" y1="12" x2="18" y2="18" stroke="#f87171" strokeWidth="2" />
    </svg>
  );
};

const RocketLiftVisualSVG: React.FC<{
  fuelKg: number;
  totalMassKg: number;
  liftLimitKg: number;
  tone: 'red' | 'yellow' | 'green';
  zone: string;
}> = ({ fuelKg, totalMassKg, liftLimitKg, tone, zone }) => {
  const isOverweight = totalMassKg > liftLimitKg;
  const loadPct = Math.min(100, Math.round((totalMassKg / liftLimitKg) * 100));
  const dryPct = Math.round((LUNAR_DRY_MASS_KG / liftLimitKg) * 100);
  const accent = tone === 'green' ? '#34d399' : tone === 'yellow' ? '#fbbf24' : '#f87171';

  return (
    <svg viewBox="0 0 280 128" className="w-full h-auto rounded-xl bg-[#040d1f] border border-cyan-400/25">
      {/* Subtle Blueprint Grid */}
      <line x1="0" y1="32" x2="280" y2="32" stroke="rgba(56,189,248,0.08)" />
      <line x1="0" y1="64" x2="280" y2="64" stroke="rgba(56,189,248,0.08)" />
      <line x1="0" y1="96" x2="280" y2="96" stroke="rgba(56,189,248,0.08)" />

      {/* Launch Pad 39X Base */}
      <rect x="20" y="108" width="96" height="10" rx="2" fill="#1e293b" stroke="#475569" />
      <rect x="28" y="34" width="7" height="74" rx="1.5" fill="#334155" />
      {/* Clamp Arms */}
      <path
        d={isOverweight ? 'M35 74 L56 74' : 'M35 74 L47 64'}
        stroke={isOverweight ? '#f87171' : '#34d399'}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Rocket Body */}
      <g transform={isOverweight ? 'translate(68, 22)' : 'translate(68, 16)'}>
        {/* Fairing Nose */}
        <path d="M-11 22 Q-11 4 0 0 Q11 4 11 22 Z" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.4" />
        {/* Cutaway Payload Bay (Dry + Fuel Mass) */}
        <rect x="-11" y="22" width="22" height="28" fill="#0f172a" stroke="#67e8f9" strokeWidth="1.3" />
        <rect x="-8" y="36" width="16" height="11" rx="2" fill="#f59e0b" opacity="0.9" />
        <rect
          x="-8"
          y={34 - Math.round((fuelKg / 100) * 10)}
          width="16"
          height={Math.max(2, Math.round((fuelKg / 100) * 10))}
          rx="1.5"
          fill={accent}
        />
        {/* Stage 1 Booster */}
        <rect x="-11" y="50" width="22" height="36" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
        <polygon points="-11,76 -18,88 -11,86" fill="#ef4444" />
        <polygon points="11,76 18,88 11,86" fill="#ef4444" />
        {/* Nozzle Glow */}
        {zone === 'optimal' && (
          <polygon points="-7,86 7,86 0,100" fill="#22d3ee" opacity="0.85" />
        )}
      </g>

      {/* Right Side Visual Lift Capacity Meter */}
      <text x="132" y="24" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold">
        PAD 39X LIFT CAPACITY
      </text>
      <text x="266" y="24" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="end">
        {totalMassKg} / {liftLimitKg} kg
      </text>

      {/* Stacked Mass Bar */}
      <rect x="132" y="34" width="134" height="18" rx="4" fill="#0f172a" stroke="#334155" />
      <rect
        x="133"
        y="35"
        width={Math.min(132, Math.round((dryPct / 100) * 132))}
        height="16"
        rx="3"
        fill="#f59e0b"
      />
      <rect
        x={133 + Math.min(132, Math.round((dryPct / 100) * 132))}
        y="35"
        width={Math.max(0, Math.min(132 - Math.round((dryPct / 100) * 132), Math.round(((loadPct - dryPct) / 100) * 132)))}
        height="16"
        rx="2"
        fill={accent}
      />
      {/* Limit Marker Line */}
      <line x1="265" y1="30" x2="265" y2="56" stroke="#f87171" strokeWidth="2" />

      {/* Legend Chips */}
      <rect x="132" y="62" width="8" height="8" rx="2" fill="#f59e0b" />
      <text x="144" y="69" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
        Dry {LUNAR_DRY_MASS_KG} kg
      </text>
      <rect x="204" y="62" width="8" height="8" rx="2" fill={accent} />
      <text x="216" y="69" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
        Fuel {fuelKg} kg
      </text>

      {/* Visual Status Badge */}
      <rect
        x="132"
        y="82"
        width="134"
        height="26"
        rx="6"
        fill={tone === 'green' ? 'rgba(16,185,129,0.18)' : tone === 'yellow' ? 'rgba(245,158,11,0.16)' : 'rgba(244,63,94,0.18)'}
        stroke={accent}
      />
      <text x="199" y="99" fill={accent} fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {isOverweight
          ? '✕ OVER 175 KG LIMIT'
          : zone === 'optimal'
          ? '✓ CLEAR FOR LIFTOFF'
          : zone === 'insufficient'
          ? '✕ DELTA-V TOO LOW'
          : '⚠ ADJUST FUEL'}
      </text>
    </svg>
  );
};

const FlightStageThumbSVG: React.FC<{ step: 1 | 2 | 3 | 4 }> = ({ step }) => {
  switch (step) {
    case 1:
      return (
        <svg width="44" height="32" viewBox="0 0 44 32" fill="none">
          <rect x="6" y="25" width="32" height="4" rx="1" fill="#334155" />
          <rect x="19" y="7" width="6" height="18" rx="2" fill="#e2e8f0" />
          <path d="M19 7 L22 2 L25 7 Z" fill="#38bdf8" />
          <rect x="12" y="10" width="3" height="15" fill="#475569" />
        </svg>
      );
    case 2:
      return (
        <svg width="44" height="32" viewBox="0 0 44 32" fill="none">
          <rect x="19" y="3" width="6" height="15" rx="2" fill="#f8fafc" />
          <polygon points="19,18 25,18 22,30" fill="#fb923c" />
          <polygon points="20.5,18 23.5,18 22,26" fill="#fef08a" />
        </svg>
      );
    case 3:
      return (
        <svg width="44" height="32" viewBox="0 0 44 32" fill="none">
          <rect x="8" y="18" width="11" height="6" rx="1.5" fill="#94a3b8" transform="rotate(-18 8 18)" />
          <line x1="21" y1="15" x2="26" y2="12" stroke="#4fe3d4" strokeWidth="1.5" strokeDasharray="2 2" />
          <rect x="27" y="7" width="9" height="7" rx="1.5" fill="#f59e0b" transform="rotate(-18 27 7)" />
        </svg>
      );
    case 4:
      return (
        <svg width="44" height="32" viewBox="0 0 44 32" fill="none">
          <circle cx="30" cy="16" r="9" fill="#e2e8f0" />
          <circle cx="28" cy="13" r="2" fill="#94a3b8" />
          <path d="M5 24 Q18 4 38 6" stroke="#34d399" strokeWidth="2" strokeDasharray="3 2" fill="none" />
          <circle cx="17" cy="12" r="2.5" fill="#34d399" />
        </svg>
      );
  }
};

const ConfettiOverlay: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const colors = ['#22d3ee', '#4fe3d4', '#fbbf24', '#34d399', '#ffffff'];
    const pts = Array.from({ length: 85 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * 180,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 3.2,
      s: 4 + Math.random() * 5,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.13,
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
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-[5650]" />;
};

// Interactive Drag-to-Rotate + X-Ray Cutaway Lunar Exploration Probe Blueprint Canvas
const SpacecraftBlueprintCanvas: React.FC<{
  fuelPct: number;
  zoneTone: 'red' | 'yellow' | 'green';
  hoveredPart: ProbeComponentId | null;
  selectedPart: ProbeComponentId | null;
  autoRotate: boolean;
  cutawayMode: boolean;
  focusAngle: number | null;
  onSelectPart: (part: ProbeComponentId) => void;
  onHoverPart: (part: ProbeComponentId | null) => void;
}> = ({
  fuelPct,
  zoneTone,
  hoveredPart,
  selectedPart,
  autoRotate,
  cutawayMode,
  focusAngle,
  onSelectPart,
  onHoverPart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef<number>(0.45);
  const dragStateRef = useRef<{ active: boolean; moved: boolean; lastX: number }>({
    active: false,
    moved: false,
    lastX: 0,
  });
  const hotspotsRef = useRef<Array<{ id: ProbeComponentId; x: number; y: number; r: number }>>([]);

  useEffect(() => {
    if (focusAngle !== null) {
      angleRef.current = focusAngle;
    }
  }, [focusAngle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (autoRotate && focusAngle === null && !dragStateRef.current.active) {
        angleRef.current += dt * 0.55;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 + 6;
      const yaw = angleRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, w * 0.65);
      bg.addColorStop(0, '#0c2347');
      bg.addColorStop(1, '#040c1d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 20; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 20; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Holographic turntable base ellipse
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 78, 92, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, cy + 78, 118, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const activePart = hoveredPart || selectedPart;
      const toneColor =
        zoneTone === 'green' ? '#34d399' : zoneTone === 'yellow' ? '#fbbf24' : '#f87171';

      const wingSpan = 96 * Math.abs(cosY) + 18;
      const wingTiltY = sinY * 14;

      const drawSolarWing = (side: -1 | 1) => {
        const isHi = activePart === 'solar';
        ctx.save();
        const xStart = cx + side * 34;
        const xEnd = cx + side * (34 + wingSpan);
        const yTop = cy - 16 + side * wingTiltY;
        const yBot = cy + 16 + side * wingTiltY;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + side * 26, cy);
        ctx.lineTo(xStart, (yTop + yBot) / 2);
        ctx.stroke();

        const grad = ctx.createLinearGradient(xStart, yTop, xEnd, yBot);
        grad.addColorStop(0, '#1e3a8a');
        grad.addColorStop(0.5, '#2563eb');
        grad.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad;
        ctx.strokeStyle = isHi ? '#67e8f9' : '#38bdf8';
        ctx.lineWidth = isHi ? 2.6 : 1.5;

        ctx.beginPath();
        ctx.moveTo(xStart, yTop);
        ctx.lineTo(xEnd, yTop + side * wingTiltY * 0.35);
        ctx.lineTo(xEnd, yBot + side * wingTiltY * 0.35);
        ctx.lineTo(xStart, yBot);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
        ctx.lineWidth = 0.9;
        for (let k = 1; k <= 3; k++) {
          const frac = k / 4;
          const gx = xStart + (xEnd - xStart) * frac;
          const gy1 = yTop + side * wingTiltY * 0.35 * frac;
          const gy2 = yBot + side * wingTiltY * 0.35 * frac;
          ctx.beginPath();
          ctx.moveTo(gx, gy1);
          ctx.lineTo(gx, gy2);
          ctx.stroke();
        }
        ctx.restore();
      };

      if (sinY >= 0) {
        drawSolarWing(-1);
        drawSolarWing(1);
      } else {
        drawSolarWing(1);
        drawSolarWing(-1);
      }

      // Aft Propulsion System Nozzle
      const isPropHi = activePart === 'propulsion';
      ctx.save();
      const propGrad = ctx.createLinearGradient(cx - 18, cy + 32, cx + 18, cy + 62);
      propGrad.addColorStop(0, '#475569');
      propGrad.addColorStop(0.5, '#94a3b8');
      propGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = propGrad;
      ctx.strokeStyle = isPropHi ? '#67e8f9' : '#cbd5e1';
      ctx.lineWidth = isPropHi ? 2.6 : 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 32);
      ctx.lineTo(cx + 10, cy + 32);
      ctx.lineTo(cx + 20, cy + 62);
      ctx.lineTo(cx - 20, cy + 62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (zoneTone === 'green') {
        const pulse = 0.4 + 0.35 * Math.sin(now * 0.008);
        ctx.fillStyle = `rgba(34, 211, 238, ${pulse.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy + 62);
        ctx.lineTo(cx + 12, cy + 62);
        ctx.lineTo(cx, cy + 80);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Main Octagonal Gold Foil Bus (turns translucent in X-Ray Cutaway mode!)
      const isTankHi = activePart === 'tank';
      const busW = 58 + Math.abs(sinY) * 8;
      const busH = 66;
      ctx.save();
      ctx.globalAlpha = cutawayMode ? 0.35 : 1;
      const busGrad = ctx.createLinearGradient(cx - busW / 2, cy - busH / 2, cx + busW / 2, cy + busH / 2);
      busGrad.addColorStop(0, '#fcd34d');
      busGrad.addColorStop(0.5, '#d97706');
      busGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = busGrad;
      ctx.strokeStyle = cutawayMode ? '#38bdf8' : '#fef3c7';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(cx - busW / 2, cy - busH / 2, busW, busH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Internal Fuel Manifold Pipes visible in Cutaway mode
      if (cutawayMode) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 22);
        ctx.lineTo(cx - 18, cy + 28);
        ctx.lineTo(cx - 5, cy + 34);
        ctx.moveTo(cx + 18, cy - 22);
        ctx.lineTo(cx + 18, cy + 28);
        ctx.lineTo(cx + 5, cy + 34);
        ctx.stroke();
        ctx.restore();
      }

      // Cutaway Fuel Tank Window inside Bus
      const tankW = cutawayMode ? 34 : 30;
      const tankH = cutawayMode ? 48 : 42;
      const tankX = cx - tankW / 2;
      const tankY = cy - tankH / 2 + 2;
      ctx.fillStyle = '#061124';
      ctx.strokeStyle = isTankHi ? '#67e8f9' : '#38bdf8';
      ctx.lineWidth = isTankHi ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(tankX, tankY, tankW, tankH, 6);
      ctx.fill();
      ctx.stroke();

      const fillH = Math.max(3, ((tankH - 4) * fuelPct) / 100);
      ctx.fillStyle = toneColor;
      ctx.beginPath();
      ctx.roundRect(tankX + 2, tankY + tankH - 2 - fillH, tankW - 4, fillH, 4);
      ctx.fill();

      // Zenith High-Gain Antenna Dish
      const isAntHi = activePart === 'antenna';
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - busH / 2);
      ctx.lineTo(cx, cy - busH / 2 - 18);
      ctx.stroke();

      ctx.strokeStyle = isAntHi ? '#67e8f9' : '#f8fafc';
      ctx.lineWidth = isAntHi ? 3.5 : 2.6;
      ctx.beginPath();
      ctx.arc(cx, cy - busH / 2 - 34, 24, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(cx, cy - busH / 2 - 32, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const hotspots: Array<{ id: ProbeComponentId; x: number; y: number; r: number }> = [
        { id: 'antenna', x: cx, y: cy - busH / 2 - 26, r: 16 },
        { id: 'tank', x: cx, y: cy + 2, r: 18 },
        { id: 'solar', x: cx + (cosY >= 0 ? 74 : -74), y: cy, r: 18 },
        { id: 'propulsion', x: cx, y: cy + 48, r: 16 },
      ];
      hotspotsRef.current = hotspots;

      hotspots.forEach((hs) => {
        const hi = activePart === hs.id;
        ctx.save();
        ctx.strokeStyle = hi ? '#fef08a' : 'rgba(103, 232, 249, 0.7)';
        ctx.fillStyle = hi ? 'rgba(250, 204, 21, 0.25)' : 'rgba(6, 17, 36, 0.72)';
        ctx.lineWidth = hi ? 2 : 1.2;
        ctx.beginPath();
        ctx.arc(hs.x, hs.y, hi ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Subtle Drag Hint Tag
      ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('DRAG TO SPIN • CLICK PINS', 10, h - 10);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, cutawayMode, focusAngle, fuelPct, hoveredPart, selectedPart, zoneTone]);

  const findHotspotAt = (clientX: number, clientY: number): ProbeComponentId | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    for (const hs of hotspotsRef.current) {
      if (Math.hypot(x - hs.x, y - hs.y) <= hs.r + 6) {
        return hs.id;
      }
    }
    return null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={210}
      onPointerDown={(e) => {
        dragStateRef.current = { active: true, moved: false, lastX: e.clientX };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (dragStateRef.current.active) {
          const dx = e.clientX - dragStateRef.current.lastX;
          if (Math.abs(dx) > 2) dragStateRef.current.moved = true;
          angleRef.current += dx * 0.015;
          dragStateRef.current.lastX = e.clientX;
        } else {
          onHoverPart(findHotspotAt(e.clientX, e.clientY));
        }
      }}
      onPointerUp={(e) => {
        const wasMoved = dragStateRef.current.moved;
        dragStateRef.current.active = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        if (!wasMoved) {
          const hit = findHotspotAt(e.clientX, e.clientY);
          if (hit) {
            SFX.select();
            onSelectPart(hit);
          }
        }
      }}
      onMouseLeave={() => onHoverPart(null)}
      className="w-full h-auto rounded-xl border border-cyan-400/30 cursor-grab active:cursor-grabbing block touch-none"
    />
  );
};

// Live Earth -> Moon Trajectory Canvas with Interactive Pulse & Hover Telemetry
const TrajectoryPreviewCanvas: React.FC<{
  fuelKg: number;
  zone: ReturnType<typeof evaluateLunarFuel>['zone'];
  tone: 'red' | 'yellow' | 'green';
  pulseTrigger: number;
}> = ({ fuelKg, zone, tone, pulseTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerPctRef = useRef<number | null>(null);
  const pulseStartRef = useRef<number>(0);

  useEffect(() => {
    if (pulseTrigger > 0) {
      pulseStartRef.current = performance.now();
    }
  }, [pulseTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;
      const t = now * 0.001;

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, w, 0);
      bg.addColorStop(0, '#041024');
      bg.addColorStop(0.5, '#071734');
      bg.addColorStop(1, '#040c1c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars & subtle grid
      for (let i = 0; i < 40; i++) {
        const s = LAB_STARS[i];
        ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 24; x < w; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      const ex = 68;
      const ey = h * 0.64;
      const mx = w - 82;
      const my = h * 0.34;

      // Earth
      const eGlow = ctx.createRadialGradient(ex, ey, 16, ex, ey, 44);
      eGlow.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
      eGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = eGlow;
      ctx.beginPath();
      ctx.arc(ex, ey, 44, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.ellipse(ex - 6, ey - 5, 9, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ex + 8, ey + 6, 6, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Moon + Optimal Flyby Corridor Ring
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.36)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(mx, my, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const mGrad = ctx.createRadialGradient(mx - 6, my - 6, 4, mx, my, 22);
      mGrad.addColorStop(0, '#f8fafc');
      mGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(100,116,139,0.45)';
      ctx.beginPath();
      ctx.arc(mx - 6, my - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 6, my + 6, 5, 0, Math.PI * 2);
      ctx.fill();

      const strokeCol = tone === 'green' ? '#34d399' : tone === 'yellow' ? '#fbbf24' : '#f87171';

      let p0 = { x: ex + 22, y: ey - 14 };
      let p1 = { x: w * 0.46, y: h * 0.14 };
      let p2 = { x: mx + 36, y: my - 18 };

      if (zone === 'insufficient') {
        p0 = { x: ex + 24, y: ey - 8 };
        p1 = { x: w * 0.44, y: h * 0.78 };
        p2 = { x: w * 0.88, y: h * 0.88 };
      } else if (zone === 'low_margin') {
        p0 = { x: ex + 22, y: ey - 10 };
        p1 = { x: w * 0.48, y: h * 0.46 };
        p2 = { x: mx + 28, y: my + 34 };
      } else if (zone === 'high_margin') {
        p0 = { x: ex + 20, y: ey - 14 };
        p1 = { x: w * 0.42, y: h * 0.28 };
        p2 = { x: mx + 12, y: my - 32 };
      } else if (zone === 'overweight') {
        p0 = { x: ex + 24, y: ey - 6 };
        p1 = { x: ex + 58, y: ey - 40 };
        p2 = { x: ex + 76, y: ey + 14 };
      }

      ctx.save();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.lineDashOffset = zone === 'overweight' ? 0 : -t * 36;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      const pointOnArc = (prog: number) => {
        const u = 1 - prog;
        return {
          x: u * u * p0.x + 2 * u * prog * p1.x + prog * prog * p2.x,
          y: u * u * p0.y + 2 * u * prog * p1.y + prog * prog * p2.y,
        };
      };

      // Interactive Test Burn Pulse Wave
      const pulseElapsed = (now - pulseStartRef.current) / 1000;
      if (pulseStartRef.current > 0 && pulseElapsed >= 0 && pulseElapsed < 1.2) {
        const pulseProg = pulseElapsed / 1.2;
        const pt = pointOnArc(zone === 'overweight' ? Math.min(0.45, pulseProg) : pulseProg);
        ctx.save();
        ctx.fillStyle = strokeCol;
        ctx.shadowColor = strokeCol;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const activeProg = pointerPctRef.current !== null ? pointerPctRef.current : (t * 0.42) % 1;
      const probePt =
        zone === 'overweight'
          ? { x: ex + 32, y: ey - 18 + Math.sin(t * 9) * 1.8 }
          : pointOnArc(activeProg);

      // Probe marker
      ctx.fillStyle = strokeCol;
      ctx.beginPath();
      ctx.arc(probePt.x, probePt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Interactive hover HUD callout
      if (pointerPctRef.current !== null && zone !== 'overweight') {
        const distK = Math.round(pointerPctRef.current * 238);
        ctx.fillStyle = 'rgba(4, 13, 31, 0.9)';
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1;
        const bx = Math.min(w - 115, Math.max(12, probePt.x - 45));
        const by = Math.max(12, probePt.y - 34);
        ctx.beginPath();
        ctx.roundRect(bx, by, 92, 22, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${distK}k mi`, bx + 46, by + 15);
      }

      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#bae6fd';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', ex, ey + 40);
      ctx.fillText('MOON', mx, my + 38);

      ctx.textAlign = 'right';
      ctx.fillStyle = strokeCol;
      ctx.fillText(`FUEL: ${fuelKg} KG`, w - 12, 18);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [fuelKg, tone, zone]);

  return (
    <canvas
      ref={canvasRef}
      width={680}
      height={185}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left - 40) / (rect.width - 80)));
        pointerPctRef.current = frac;
      }}
      onMouseLeave={() => {
        pointerPctRef.current = null;
      }}
      className="w-full h-auto rounded-xl border border-cyan-400/25 cursor-crosshair block"
    />
  );
};

// Interactive Click/Drag Fuel vs Reach Curve Canvas
const FuelCurveCanvas: React.FC<{
  fuelKg: number;
  onSelectFuel: (kg: number) => void;
}> = ({ fuelKg, onSelectFuel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padL = 44;
    const padR = 20;
    const padT = 18;
    const padB = 30;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const xForFuel = (kg: number) => padL + ((kg - LUNAR_MIN_FUEL_KG) / (LUNAR_MAX_FUEL_KG - LUNAR_MIN_FUEL_KG)) * plotW;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#040e22';
    ctx.fillRect(0, 0, w, h);

    // Optimal Band (45 - 65 kg)
    const optX1 = xForFuel(LUNAR_OPTIMAL_MIN_KG);
    const optX2 = xForFuel(LUNAR_OPTIMAL_MAX_KG);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    ctx.fillRect(optX1, padT, optX2 - optX1, plotH);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(optX1, padT, optX2 - optX1, plotH);
    ctx.setLineDash([]);

    // Overweight Zone (>75 kg)
    const overX = xForFuel(76);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
    ctx.fillRect(overX, padT, padL + plotW - overX, plotH);

    // Curve (Bell efficiency peaking in 45-65 kg and dropping to 0 past 75 kg)
    ctx.beginPath();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let kg = LUNAR_MIN_FUEL_KG; kg <= LUNAR_MAX_FUEL_KG; kg++) {
      const x = xForFuel(kg);
      let score = 0;
      if (kg < 45) {
        score = Math.max(0.08, ((kg - 10) / 35) * 0.85);
      } else if (kg <= 65) {
        score = 0.96 - Math.abs(kg - 55) * 0.005;
      } else if (kg <= 75) {
        score = 0.85 - ((kg - 65) / 10) * 0.35;
      } else {
        score = 0.06;
      }
      const y = padT + plotH * (1 - score);
      if (kg === LUNAR_MIN_FUEL_KG) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Active Fuel Marker
    const ev = evaluateLunarFuel(fuelKg);
    const curX = xForFuel(fuelKg);
    let curScore = 0;
    if (fuelKg < 45) curScore = Math.max(0.08, ((fuelKg - 10) / 35) * 0.85);
    else if (fuelKg <= 65) curScore = 0.96 - Math.abs(fuelKg - 55) * 0.005;
    else if (fuelKg <= 75) curScore = 0.85 - ((fuelKg - 65) / 10) * 0.35;
    else curScore = 0.06;
    const curY = padT + plotH * (1 - curScore);

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    const dotCol = ev.tone === 'green' ? '#34d399' : ev.tone === 'yellow' ? '#fbbf24' : '#f87171';
    ctx.fillStyle = dotCol;
    ctx.beginPath();
    ctx.arc(curX, curY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    [10, 30, 45, 55, 65, 75, 100].forEach((tick) => {
      ctx.fillStyle = tick >= 45 && tick <= 65 ? '#34d399' : tick > 75 ? '#f87171' : '#94a3b8';
      ctx.fillText(`${tick}kg`, xForFuel(tick), h - 10);
    });
    ctx.fillStyle = '#34d399';
    ctx.fillText('OPTIMAL FLYBY WINDOW', (optX1 + optX2) / 2, padT + 14);
    ctx.fillStyle = '#f87171';
    ctx.fillText('OVER 175 KG', (overX + padL + plotW) / 2, padT + 14);
  }, [fuelKg]);

  const pickFuelAtClientX = (clientX: number, target: HTMLCanvasElement) => {
    const rect = target.getBoundingClientRect();
    const padL = 44;
    const padR = 20;
    const relX = ((clientX - rect.left) / rect.width) * target.width;
    const frac = Math.max(0, Math.min(1, (relX - padL) / (target.width - padL - padR)));
    onSelectFuel(Math.round(LUNAR_MIN_FUEL_KG + frac * (LUNAR_MAX_FUEL_KG - LUNAR_MIN_FUEL_KG)));
  };

  return (
    <canvas
      ref={canvasRef}
      width={680}
      height={185}
      onPointerDown={(e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        pickFuelAtClientX(e.clientX, e.currentTarget);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) pickFuelAtClientX(e.clientX, e.currentTarget);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      className="w-full h-auto rounded-xl border border-cyan-400/25 cursor-pointer block touch-none"
    />
  );
};

// Full Cinematic Lunar Flyby Simulation Canvas
const FlybyCinematicCanvas: React.FC<{
  progressPct: number;
  stageIndex: number;
}> = ({ progressPct, stageIndex }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const p = Math.max(0, Math.min(1, progressPct / 100));

    const skyMix = Math.min(1, Math.max(0, (p - 0.22) / 0.28));
    const rTop = Math.round(11 * (1 - skyMix) + 3 * skyMix);
    const gTop = Math.round(35 * (1 - skyMix) + 8 * skyMix);
    const bTop = Math.round(78 * (1 - skyMix) + 22 * skyMix);
    const rBot = Math.round(28 * (1 - skyMix) + 5 * skyMix);
    const gBot = Math.round(74 * (1 - skyMix) + 14 * skyMix);
    const bBot = Math.round(132 * (1 - skyMix) + 34 * skyMix);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, `rgb(${rTop},${gTop},${bTop})`);
    skyGrad.addColorStop(1, `rgb(${rBot},${gBot},${bBot})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const starAlpha = Math.min(1, 0.15 + skyMix * 0.85);
    for (const s of LAB_STARS) {
      ctx.fillStyle = `rgba(241, 245, 249, ${(starAlpha * 0.85).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (p < 0.52) {
      const groundDrop = Math.max(0, (p - 0.30) / 0.22) * 180;
      const rocketLift = Math.max(0, (p - 0.30) / 0.22);
      const rx = w * 0.5 + rocketLift * 24;
      const ry = h * 0.72 - rocketLift * 145;

      if (groundDrop < 170) {
        ctx.save();
        ctx.translate(0, groundDrop);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, h * 0.82, w, h * 0.22);
        ctx.fillStyle = '#334155';
        ctx.fillRect(w * 0.35, h * 0.79, w * 0.3, 12);
        ctx.fillStyle = '#475569';
        ctx.fillRect(w * 0.41, h * 0.36, 14, h * 0.44);
        ctx.restore();
      }

      if (p >= 0.18) {
        const flicker = Math.sin(performance.now() * 0.05) * 6;
        for (let i = 0; i < 8; i++) {
          const sx = rx + (i - 3.5) * 18 + Math.sin(i + p * 20) * 6;
          const sy = Math.min(h * 0.82 + groundDrop, ry + 56 + (i % 3) * 8);
          ctx.fillStyle = 'rgba(203, 213, 225, 0.38)';
          ctx.beginPath();
          ctx.arc(sx, sy, 14 + (i % 3) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        const flameGrad = ctx.createLinearGradient(rx, ry + 36, rx, ry + 115 + flicker);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.35, '#fde047');
        flameGrad.addColorStop(0.75, '#f97316');
        flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(rx - 10, ry + 36);
        ctx.lineTo(rx + 10, ry + 36);
        ctx.lineTo(rx + 2, ry + 112 + flicker);
        ctx.closePath();
        ctx.fill();
      }

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(rocketLift * 0.22);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-10, -28, 20, 62);
      ctx.strokeRect(-10, -28, 20, 62);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10.5, -36, 21, 9);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-10, -56, 20, 20);
      ctx.beginPath();
      ctx.moveTo(-10, -56);
      ctx.quadraticCurveTo(-10, -78, 0, -86);
      ctx.quadraticCurveTo(10, -78, 10, -56);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(-20, 36);
      ctx.lineTo(-10, 34);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, 18);
      ctx.lineTo(20, 36);
      ctx.lineTo(10, 34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      const spaceProg = (p - 0.52) / 0.48;

      const er = Math.max(18, 72 - spaceProg * 54);
      const ex = w * 0.24 - spaceProg * 95;
      const ey = h * 0.78 + spaceProg * 45;
      const earthGrad = ctx.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.1, ex, ey, er);
      earthGrad.addColorStop(0, '#38bdf8');
      earthGrad.addColorStop(0.7, '#0284c7');
      earthGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();

      const mr = 22 + Math.min(1, spaceProg * 1.2) * 58;
      const mx = w * 0.84 - Math.max(0, spaceProg - 0.45) * 140;
      const my = h * 0.36;
      const moonGrad = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.12, mx, my, mr);
      moonGrad.addColorStop(0, '#f8fafc');
      moonGrad.addColorStop(0.68, '#cbd5e1');
      moonGrad.addColorStop(1, '#475569');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.beginPath();
      ctx.arc(mx - mr * 0.28, my - mr * 0.16, mr * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + mr * 0.22, my + mr * 0.24, mr * 0.22, 0, Math.PI * 2);
      ctx.fill();

      if (spaceProg < 0.35) {
        const bx = w * 0.32 - spaceProg * 160;
        const by = h * 0.65 + spaceProg * 95;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-0.6 - spaceProg * 1.8);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-6, -18, 12, 36);
        ctx.restore();
      }

      let probeX = w * 0.35;
      let probeY = h * 0.62;
      let probeAngle = -0.5;
      if (spaceProg < 0.65) {
        const u = spaceProg / 0.65;
        probeX = w * 0.32 + u * (mx - mr * 1.4 - w * 0.32);
        probeY = h * 0.64 - Math.sin(u * Math.PI * 0.5) * (h * 0.24);
        probeAngle = -0.45 + u * 0.25;
      } else {
        const f = (spaceProg - 0.65) / 0.35;
        const arcAngle = Math.PI * 1.15 + f * Math.PI * 0.95;
        probeX = mx + Math.cos(arcAngle) * (mr + 26);
        probeY = my + Math.sin(arcAngle) * (mr + 22);
        probeAngle = arcAngle + Math.PI * 0.5;
      }

      ctx.save();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ex + er * 0.5, ey - er * 0.4);
      ctx.quadraticCurveTo(w * 0.45, h * 0.24, probeX, probeY);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(probeX, probeY);
      ctx.rotate(probeAngle);
      if (stageIndex >= 4 && stageIndex <= 6) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-12, -3);
        ctx.lineTo(-12, 3);
        ctx.lineTo(-28, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-4, -24, 8, 16);
      ctx.strokeRect(-4, -24, 8, 16);
      ctx.fillRect(-4, 8, 8, 16);
      ctx.strokeRect(-4, 8, 8, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fef08a';
      ctx.fillRect(-9, -8, 18, 16);
      ctx.strokeRect(-9, -8, 18, 16);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(11, 0, 7, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.restore();
    }
  }, [progressPct, stageIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={860}
      height={340}
      className="w-full h-auto rounded-2xl border border-cyan-400/35 shadow-[inset_0_0_32px_rgba(14,165,233,0.2)] block"
    />
  );
};

export const LunarFlybyLab: React.FC<LunarFlybyLabProps> = ({
  visible,
  starCredits,
  alreadyCompleted,
  onCompleteMission,
  onContinueToLevel6,
  onBackToAcademy,
  onExit,
  onOpenHandbook,
}) => {
  const [phase, setPhase] = useState<LabPhase>('workbench');
  const [fuelKg, setFuelKg] = useState<number>(LUNAR_DEFAULT_FUEL_KG);
  const [hoveredPart, setHoveredPart] = useState<ProbeComponentId | null>(null);
  const [selectedPart, setSelectedPart] = useState<ProbeComponentId>('tank');
  const [autoRotateProbe, setAutoRotateProbe] = useState<boolean>(true);
  const [cutawayMode, setCutawayMode] = useState<boolean>(false);
  const [focusAngle, setFocusAngle] = useState<number | null>(null);
  const [trajView, setTrajView] = useState<TrajectoryViewMode>('orbit');
  const [pulseTrigger, setPulseTrigger] = useState<number>(0);

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [showEntryBriefing, setShowEntryBriefing] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());
  const [volume, setVolume] = useState<number>(() => SFX.getVolume());

  // Launch & Flyby Simulation state
  const [simProgress, setSimProgress] = useState<number>(0);
  const [countdownLabel, setCountdownLabel] = useState<string>('T-3');
  const [simStageText, setSimStageText] = useState<string>('Rocket Armed on Pad 39X');
  const [simStageIdx, setSimStageIdx] = useState<number>(0);
  const [simAborted, setSimAborted] = useState<boolean>(false);

  // Completion & Rewards state
  const [missionElapsedSec, setMissionElapsedSec] = useState<number>(0);
  const [rewardResult, setRewardResult] = useState<Level5RewardResult | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const tankDragRef = useRef<boolean>(false);
  const labOpenedAtRef = useRef<number>(Date.now());
  const prevZoneRef = useRef<string>('insufficient');
  const submittingRef = useRef<boolean>(false);
  const launchAudioRef = useRef<ReturnType<typeof SFX.createRocketLaunchAudio> | null>(null);

  const evaluation = useMemo(() => evaluateLunarFuel(fuelKg), [fuelKg]);

  const stopLaunchAudio = useCallback(() => {
    if (launchAudioRef.current) {
      launchAudioRef.current.stop();
      launchAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      stopLaunchAudio();
      return;
    }
    setPhase('workbench');
    setFuelKg(LUNAR_DEFAULT_FUEL_KG);
    setConfirmOpen(false);
    setShowEntryBriefing(true);
    setSimProgress(0);
    setSimAborted(false);
    setRewardResult(null);
    setCompletionError(null);
    setCutawayMode(false);
    setTrajView('orbit');
    setMuted(SFX.isMuted());
    setVolume(SFX.getVolume());
    labOpenedAtRef.current = Date.now();
    prevZoneRef.current = evaluateLunarFuel(LUNAR_DEFAULT_FUEL_KG).zone;
    submittingRef.current = false;
  }, [visible, stopLaunchAudio]);

  useEffect(() => {
    if (!visible || phase !== 'workbench') return;
    const prev = prevZoneRef.current;
    if (prev !== evaluation.zone) {
      prevZoneRef.current = evaluation.zone;
      if (evaluation.zone === 'optimal') {
        SFX.snapCorrect();
      } else if (evaluation.zone === 'overweight') {
        SFX.massWarningBeep();
      }
    }
  }, [evaluation.zone, phase, visible]);

  const handleFuelChange = useCallback((nextVal: number) => {
    const clamped = Math.max(LUNAR_MIN_FUEL_KG, Math.min(LUNAR_MAX_FUEL_KG, Math.round(nextVal)));
    setFuelKg(clamped);
    setConfirmOpen(false);
    SFX.sliderTick();
  }, []);

  const handleTankPointer = useCallback(
    (clientY: number, el: HTMLDivElement) => {
      const rect = el.getBoundingClientRect();
      const pctFromBottom = Math.max(0.1, Math.min(1, (rect.bottom - clientY) / rect.height));
      handleFuelChange(Math.round(pctFromBottom * LUNAR_MAX_FUEL_KG));
    },
    [handleFuelChange]
  );

  const handleToggleMute = () => {
    const next = SFX.toggleMute();
    setMuted(next);
    launchAudioRef.current?.setMuted(next);
  };

  const handleVolumeChange = (nextVol: number) => {
    SFX.setVolume(nextVol);
    setVolume(SFX.getVolume());
    launchAudioRef.current?.setVolume(SFX.getVolume());
  };

  // Cinematic Launch -> Lunar Flyby Simulation Loop
  useEffect(() => {
    if (!visible || phase !== 'launching' || simAborted) return;

    const totalDurationMs = 13200;
    const startMs = performance.now();
    let lastCountdown = -1;
    let ignited = false;
    let stageSepBeeped = false;
    let completedSent = false;

    const audio = SFX.createRocketLaunchAudio();
    launchAudioRef.current = audio;

    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - startMs;
      const pct = Math.min(100, (elapsed / totalDurationMs) * 100);
      setSimProgress(pct);

      if (pct < 6) {
        setSimStageIdx(0);
        setCountdownLabel('T-3');
        setSimStageText('Rocket Armed on Pad 39X');
        if (lastCountdown !== 3) {
          lastCountdown = 3;
          SFX.countdownBeep(3);
        }
      } else if (pct < 12) {
        setSimStageIdx(0);
        setCountdownLabel('T-2');
        setSimStageText('Propellant Pressurized');
        if (lastCountdown !== 2) {
          lastCountdown = 2;
          SFX.countdownBeep(2);
        }
      } else if (pct < 18) {
        setSimStageIdx(0);
        setCountdownLabel('T-1');
        setSimStageText('Ignition Armed');
        if (lastCountdown !== 1) {
          lastCountdown = 1;
          SFX.countdownBeep(1);
        }
      } else if (pct < 30) {
        setSimStageIdx(1);
        setCountdownLabel('IGNITION');
        setSimStageText('Main Engine Ignition');
        if (!ignited) {
          ignited = true;
          SFX.playIgnitionBurst();
          audio.setPhase('ignition');
        }
      } else if (pct < 42) {
        setSimStageIdx(2);
        setCountdownLabel('LIFTOFF');
        setSimStageText('Clearing Pad 39X Tower');
        audio.setPhase('liftoff');
      } else if (pct < 52) {
        setSimStageIdx(3);
        setCountdownLabel('ASCENT');
        setSimStageText('Atmospheric Ascent');
        audio.setPhase('ascent');
      } else if (pct < 62) {
        setSimStageIdx(4);
        setCountdownLabel('STAGE SEP');
        setSimStageText('Probe Fairing Deployed');
        if (!stageSepBeeped) {
          stageSepBeeped = true;
          SFX.snapCorrect();
        }
        audio.setPhase('space');
      } else if (pct < 82) {
        setSimStageIdx(5);
        setCountdownLabel('TRANSIT');
        setSimStageText('Lunar Transfer Cruise');
      } else if (pct < 99.5) {
        setSimStageIdx(6);
        setCountdownLabel('FLYBY');
        setSimStageText('Executing Close Lunar Flyby');
      } else {
        setSimStageIdx(7);
        setCountdownLabel('SUCCESS');
        setSimStageText('Lunar Flyby Complete');
      }

      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else if (!completedSent) {
        completedSent = true;
        stopLaunchAudio();
        if (!submittingRef.current) {
          submittingRef.current = true;
          const elapsedSec = Math.max(12, Math.round((Date.now() - labOpenedAtRef.current) / 1000));
          setMissionElapsedSec(elapsedSec);
          SFX.levelComplete();
          void onCompleteMission({
            fuelKg: evaluation.fuelKg,
            confirmedFuelConfig: true,
            flybySimulationCompleted: true,
            missionDurationSec: elapsedSec,
          })
            .then((res) => {
              setRewardResult(res);
              setPhase('victory');
            })
            .catch(() => {
              setCompletionError('Unable to verify mission reward right now. Please retry.');
            });
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopLaunchAudio();
    };
  }, [evaluation.fuelKg, onCompleteMission, phase, simAborted, stopLaunchAudio, visible]);

  if (!visible) return null;

  const activeComponent = PROBE_COMPONENTS[hoveredPart || selectedPart];
  const toneStyles =
    evaluation.tone === 'green'
      ? {
          border: 'border-emerald-400/60',
          bg: 'bg-emerald-500/12',
          badge: 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200',
          text: 'text-emerald-300',
          icon: '✓',
        }
      : evaluation.tone === 'yellow'
      ? {
          border: 'border-amber-400/60',
          bg: 'bg-amber-500/12',
          badge: 'bg-amber-500/20 border-amber-400/60 text-amber-200',
          text: 'text-amber-300',
          icon: '⚠',
        }
      : {
          border: 'border-rose-400/60',
          bg: 'bg-rose-500/12',
          badge: 'bg-rose-500/20 border-rose-400/60 text-rose-200',
          text: 'text-rose-300',
          icon: '✕',
        };

  const fuelBurnFactor = Math.min(0.84, (simProgress / 100) * 0.84);
  const fuelRemainingKg = Math.max(
    Math.round(evaluation.fuelKg * 0.16 * 10) / 10,
    Math.round(evaluation.fuelKg * (1 - fuelBurnFactor) * 10) / 10
  );
  const distanceToMoonMiles = Math.max(
    1200,
    Math.round(238000 * (1 - Math.max(0, (simProgress - 28) / 72) * 0.995))
  );

  return (
    <div className="fixed inset-0 z-[5400] bg-[#030a18] text-[#e8eefc] flex flex-col overflow-hidden">
      {phase === 'victory' && <ConfettiOverlay />}

      {/* TOP LAB COMMAND BAR */}
      <header className="h-14 px-4 md:px-6 bg-[#07142b]/95 border-b border-cyan-400/35 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-400/15 border border-cyan-400/45 text-[10px] font-mono-tech font-bold text-[#4fe3d4] shrink-0">
            PNL LAB // LEVEL 05
          </span>
          <h1 className="font-display text-xs sm:text-sm md:text-base font-extrabold text-white tracking-wide truncate">
            LEVEL 5: LUNAR FLYBY – FUEL MATH
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DirectorVanceVoiceBanner
            compact
            quote="Solve the rocket fuel equation! Load just enough propellant to reach the Moon without exceeding lift limits."
          />

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#050e20] border border-amber-400/40 text-xs font-mono-tech font-bold text-amber-300 tabular-nums">
            <span>★</span>
            <span>{starCredits.toLocaleString()} SC</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#050e20] border border-cyan-400/25">
            <button
              type="button"
              onClick={handleToggleMute}
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
              className="text-sm leading-none cursor-pointer text-cyan-200 hover:text-white"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Lab sound volume"
              className="w-14 accent-cyan-400 cursor-pointer"
            />
          </div>

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/40 text-xs font-bold text-amber-200 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              📖 Handbook
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              stopLaunchAudio();
              onExit();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            Exit Lab
          </button>
        </div>
      </header>

      {/* MAIN LAB BODY */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 pb-12 bg-[radial-gradient(ellipse_at_top,#0c2249_0%,#040c1d_65%,#020612_100%)]">
        {/* PHASE 1: INTERACTIVE WORKBENCH */}
        {phase === 'workbench' && (
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* SECTION A: INTERACTIVE PROBE INSPECTOR */}
              <section className="rounded-2xl bg-[#07142b]/92 border border-cyan-400/35 p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-extrabold text-white">
                    Lunar Probe Blueprint
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        SFX.select();
                        setCutawayMode((c) => !c);
                      }}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                        cutawayMode
                          ? 'bg-cyan-400/20 border-cyan-300 text-cyan-100'
                          : 'bg-[#0c1d3d] border-cyan-400/35 text-cyan-200'
                      }`}
                    >
                      {cutawayMode ? 'Exterior' : 'Cutaway'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        SFX.select();
                        setAutoRotateProbe((r) => !r);
                        setFocusAngle(null);
                      }}
                      className="px-2 py-1 rounded-lg bg-[#0c1d3d] border border-cyan-400/35 text-[10px] font-bold text-cyan-200 hover:border-cyan-300 cursor-pointer"
                    >
                      {autoRotateProbe && focusAngle === null ? 'Pause' : 'Spin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        SFX.select();
                        setFocusAngle(0.45);
                        setAutoRotateProbe(true);
                        window.setTimeout(() => setFocusAngle(null), 50);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <SpacecraftBlueprintCanvas
                  fuelPct={evaluation.fuelPct}
                  zoneTone={evaluation.tone}
                  hoveredPart={hoveredPart}
                  selectedPart={selectedPart}
                  autoRotate={autoRotateProbe}
                  cutawayMode={cutawayMode}
                  focusAngle={focusAngle}
                  onSelectPart={(p) => setSelectedPart(p)}
                  onHoverPart={(p) => setHoveredPart(p)}
                />

                {/* 4 Illustrated Subsystem Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROBE_COMPONENTS) as ProbeComponentId[]).map((id) => {
                    const comp = PROBE_COMPONENTS[id];
                    const active = (hoveredPart || selectedPart) === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onMouseEnter={() => setHoveredPart(id)}
                        onMouseLeave={() => setHoveredPart(null)}
                        onClick={() => {
                          SFX.select();
                          setSelectedPart(id);
                        }}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                          active
                            ? 'bg-cyan-400/18 border-cyan-400 text-cyan-100'
                            : 'bg-[#050e20] border-white/10 text-slate-300 hover:border-cyan-400/40'
                        }`}
                      >
                        <div className="shrink-0">
                          <ProbePartIconSVG id={id} active={active} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-extrabold truncate">{comp.title}</div>
                          <div className="text-[9px] text-slate-400 truncate">{comp.spec}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-2 rounded-xl bg-[#040d1f] border border-cyan-400/25 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#4fe3d4]">{activeComponent.title}</span>
                  <span className="text-[11px] font-mono-tech text-slate-300">{activeComponent.spec}</span>
                </div>
              </section>

              {/* SECTION B: DRAGGABLE FUEL TANK & VISUAL PRESETS */}
              <section className="rounded-2xl bg-[#07142b]/92 border border-cyan-400/35 p-4 flex flex-col justify-between gap-3 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-extrabold text-white">
                    Propellant Tank
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-mono-tech font-extrabold ${toneStyles.badge}`}>
                    {toneStyles.icon} {evaluation.statusBadge}
                  </span>
                </div>

                {/* Click/Drag Tank + Quick Visual Presets */}
                <div className="grid grid-cols-[118px_1fr] gap-3.5 items-center p-3 rounded-2xl bg-[#040d1f] border border-cyan-400/25">
                  <div
                    onPointerDown={(e) => {
                      tankDragRef.current = true;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      handleTankPointer(e.clientY, e.currentTarget);
                    }}
                    onPointerMove={(e) => {
                      if (tankDragRef.current) handleTankPointer(e.clientY, e.currentTarget);
                    }}
                    onPointerUp={(e) => {
                      tankDragRef.current = false;
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                    }}
                    title="Drag up or down to fill tank"
                    className="relative mx-auto w-24 h-48 rounded-2xl bg-[#020817] border-2 border-cyan-400/55 overflow-hidden shadow-[inset_0_0_24px_rgba(14,165,233,0.22)] cursor-ns-resize select-none touch-none"
                  >
                    {/* Optimal 45-65 kg Band */}
                    <div
                      className="absolute inset-x-0 border-y border-dashed border-emerald-300/80 bg-emerald-400/14 pointer-events-none z-10"
                      style={{
                        bottom: `${LUNAR_OPTIMAL_MIN_KG}%`,
                        height: `${LUNAR_OPTIMAL_MAX_KG - LUNAR_OPTIMAL_MIN_KG}%`,
                      }}
                    >
                      <span className="absolute right-1 top-0.5 text-[8px] font-mono-tech font-bold text-emerald-200">
                        45–65
                      </span>
                    </div>

                    {/* Liquid Fuel Level */}
                    <div
                      className={`absolute inset-x-0 bottom-0 transition-all duration-150 ${
                        evaluation.tone === 'green'
                          ? 'bg-gradient-to-t from-emerald-600 via-emerald-400 to-cyan-300'
                          : evaluation.tone === 'yellow'
                          ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-300'
                          : 'bg-gradient-to-t from-rose-700 via-rose-500 to-orange-400'
                      }`}
                      style={{ height: `${evaluation.fuelPct}%` }}
                    >
                      <div className="h-1.5 w-full bg-white/50" />
                    </div>

                    {[25, 50, 75].map((tick) => (
                      <div
                        key={tick}
                        className="absolute left-0 w-3 border-t border-white/35 z-10 pointer-events-none"
                        style={{ bottom: `${tick}%` }}
                      />
                    ))}

                    <div className="absolute inset-x-0 top-2 text-center z-10 text-[10px] font-mono-tech font-extrabold text-white drop-shadow pointer-events-none">
                      {evaluation.fuelPct}%
                    </div>
                    <div className="absolute inset-x-0 bottom-1.5 text-center z-10 text-[8px] font-mono-tech font-bold text-white/80 pointer-events-none">
                      DRAG TANK
                    </div>
                  </div>

                  {/* Right Side: Numeric Readout + 3 Illustrated Preset Cards */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className={`font-mono-tech text-3xl font-black tabular-nums ${toneStyles.text}`}>
                        {evaluation.fuelKg} kg
                      </span>
                      <span className="text-[11px] font-bold text-slate-300">{evaluation.tankLevelLabel}</span>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { kg: 30, label: '30 kg', tag: 'Light', kind: 'light' as const },
                        { kg: 55, label: '55 kg', tag: 'Target', kind: 'optimal' as const },
                        { kg: 85, label: '85 kg', tag: 'Heavy', kind: 'heavy' as const },
                      ].map((preset) => {
                        const isSelected = evaluation.fuelKg === preset.kg;
                        return (
                          <button
                            key={preset.kg}
                            type="button"
                            onClick={() => handleFuelChange(preset.kg)}
                            className={`w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-400/18 border-cyan-400 text-white'
                                : 'bg-[#081734] border-white/10 text-slate-300 hover:border-cyan-400/45'
                            }`}
                          >
                            <div className="text-left">
                              <div className="text-xs font-mono-tech font-extrabold">{preset.label}</div>
                              <div className="text-[9px] text-slate-400 uppercase">{preset.tag}</div>
                            </div>
                            <PresetTrajectoryThumbSVG kind={preset.kind} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Fuel Slider & Fine Stepper */}
                <div className="space-y-2 p-3 rounded-xl bg-[#040d1f] border border-cyan-400/30">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFuelChange(evaluation.fuelKg - 1)}
                      disabled={evaluation.fuelKg <= LUNAR_MIN_FUEL_KG}
                      aria-label="Decrease fuel by 1 kg"
                      className="w-8 h-8 rounded-lg bg-[#0b1b38] border border-cyan-400/35 text-sm font-extrabold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-35 cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={LUNAR_MIN_FUEL_KG}
                      max={LUNAR_MAX_FUEL_KG}
                      step={1}
                      value={evaluation.fuelKg}
                      onChange={(e) => handleFuelChange(Number(e.target.value))}
                      aria-label="Spacecraft fuel allocation in kilograms"
                      className="flex-1 accent-cyan-400 cursor-pointer h-2"
                    />
                    <button
                      type="button"
                      onClick={() => handleFuelChange(evaluation.fuelKg + 1)}
                      disabled={evaluation.fuelKg >= LUNAR_MAX_FUEL_KG}
                      aria-label="Increase fuel by 1 kg"
                      className="w-8 h-8 rounded-lg bg-[#0b1b38] border border-cyan-400/35 text-sm font-extrabold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-35 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono-tech text-slate-400">
                    <span>10 kg</span>
                    <span className="text-emerald-300 font-bold">45–65 kg</span>
                    <span>100 kg</span>
                  </div>
                </div>
              </section>

              {/* SECTION C: VISUAL ROCKET LIFT & MASS TELEMETRY */}
              <section className="rounded-2xl bg-[#07142b]/92 border border-cyan-400/35 p-4 flex flex-col justify-between gap-3 shadow-xl">
                <div className="space-y-2.5">
                  <h2 className="font-display text-sm font-extrabold text-white">
                    Rocket Lift &amp; Mass
                  </h2>

                  {/* Visual Rocket on Pad 39X SVG */}
                  <RocketLiftVisualSVG
                    fuelKg={evaluation.fuelKg}
                    totalMassKg={evaluation.totalMassKg}
                    liftLimitKg={evaluation.rocketLiftLimitKg}
                    tone={evaluation.tone}
                    zone={evaluation.zone}
                  />

                  {/* Compact 4-Tile Telemetry */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-mono-tech text-slate-400 uppercase">Dry</span>
                      <span className="font-mono-tech font-extrabold text-white tabular-nums">
                        {evaluation.dryMassKg} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#040d1f] border border-cyan-400/30 flex items-center justify-between">
                      <span className="text-[10px] font-mono-tech text-cyan-300 uppercase">Fuel</span>
                      <span className="font-mono-tech font-extrabold text-[#4fe3d4] tabular-nums">
                        {evaluation.fuelKg} kg
                      </span>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-[#040d1f] border ${toneStyles.border} flex items-center justify-between`}>
                      <span className="text-[10px] font-mono-tech text-slate-400 uppercase">Total</span>
                      <span className={`font-mono-tech font-extrabold tabular-nums ${toneStyles.text}`}>
                        {evaluation.totalMassKg} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-mono-tech text-slate-400 uppercase">Margin</span>
                      <span className={`font-mono-tech font-extrabold tabular-nums ${toneStyles.text}`}>
                        {evaluation.payloadMarginKg >= 0 ? `+${evaluation.payloadMarginKg}` : evaluation.payloadMarginKg} kg
                      </span>
                    </div>
                  </div>

                  {/* Single-Line Status Banner */}
                  <div className={`px-3 py-2.5 rounded-xl border ${toneStyles.border} ${toneStyles.bg} flex items-center justify-between gap-2`}>
                    <span className={`text-xs font-display font-extrabold tracking-wide ${toneStyles.text}`}>
                      {toneStyles.icon} {evaluation.headline}
                    </span>
                  </div>
                </div>

                {/* Launch Confirm Action */}
                <button
                  type="button"
                  disabled={!evaluation.isOptimal}
                  onClick={() => {
                    if (!evaluation.isOptimal) return;
                    SFX.taskComplete();
                    setConfirmOpen(true);
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide uppercase transition ${
                    evaluation.isOptimal
                      ? 'bg-gradient-to-r from-emerald-400 to-[#4fe3d4] text-[#041022] shadow-[0_8px_24px_rgba(52,211,153,0.35)] hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800/90 text-slate-400 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  {evaluation.isOptimal ? 'CONFIRM & LAUNCH ▶' : 'BALANCE FUEL (45–65 KG)'}
                </button>
              </section>
            </div>

            {/* INTERACTIVE EARTH -> MOON TRAJECTORY & CURVE VIEWPORT */}
            <section className="rounded-2xl bg-[#07142b]/92 border border-cyan-400/35 p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#040d1f] border border-cyan-400/25">
                    <button
                      type="button"
                      onClick={() => {
                        SFX.select();
                        setTrajView('orbit');
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        trajView === 'orbit'
                          ? 'bg-cyan-400/20 text-[#4fe3d4] border border-cyan-400/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Orbital Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        SFX.select();
                        setTrajView('curve');
                      }}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        trajView === 'curve'
                          ? 'bg-cyan-400/20 text-[#4fe3d4] border border-cyan-400/50'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fuel Curve
                    </button>
                  </div>

                  <span className={`text-xs font-mono-tech font-bold ${toneStyles.text}`}>
                    {evaluation.trajectoryLabel}
                  </span>
                </div>

                {trajView === 'orbit' && (
                  <button
                    type="button"
                    onClick={() => {
                      SFX.playIgnitionBurst();
                      setPulseTrigger((n) => n + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/45 text-[11px] font-bold text-[#4fe3d4] cursor-pointer"
                  >
                    ⚡ Test Burn Pulse
                  </button>
                )}
              </div>

              {trajView === 'orbit' ? (
                <TrajectoryPreviewCanvas
                  fuelKg={evaluation.fuelKg}
                  zone={evaluation.zone}
                  tone={evaluation.tone}
                  pulseTrigger={pulseTrigger}
                />
              ) : (
                <FuelCurveCanvas fuelKg={evaluation.fuelKg} onSelectFuel={handleFuelChange} />
              )}

              {/* 4 Illustrated Flight Sequence Mini-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { step: 1 as const, label: '1. Pad 39X' },
                  { step: 2 as const, label: '2. Liftoff' },
                  { step: 3 as const, label: '3. Stage Sep' },
                  { step: 4 as const, label: '4. Moon Flyby' },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="px-3 py-2 rounded-xl bg-[#040d1f] border border-white/10 flex items-center gap-2.5"
                  >
                    <FlightStageThumbSVG step={item.step} />
                    <span className="text-xs font-bold text-slate-200">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* FUEL CONFIGURATION APPROVED MODAL */}
        {phase === 'workbench' && confirmOpen && evaluation.isOptimal && (
          <div className="fixed inset-0 z-[5500] bg-black/78 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#071630] border-2 border-emerald-400/65 p-6 shadow-[0_24px_72px_rgba(0,0,0,0.92)] space-y-4 text-center">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono-tech font-extrabold text-emerald-300">
                  ✓ READY FOR LAUNCH
                </span>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setConfirmOpen(false);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <LunarFlybyIllustrationSVG className="w-40 h-24 mx-auto" />

              <h3 className="font-display text-xl font-extrabold text-white">
                FUEL LOCKED FOR FLYBY
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-emerald-400/35">
                  <div className="text-[10px] text-slate-400 uppercase">Fuel</div>
                  <div className="font-mono-tech font-extrabold text-emerald-300 text-base tabular-nums">
                    {evaluation.fuelKg} kg
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-cyan-400/35">
                  <div className="text-[10px] text-slate-400 uppercase">Mass</div>
                  <div className="font-mono-tech font-extrabold text-white text-base tabular-nums">
                    {evaluation.totalMassKg} kg
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-cyan-400/35">
                  <div className="text-[10px] text-slate-400 uppercase">Margin</div>
                  <div className="font-mono-tech font-extrabold text-[#4fe3d4] text-base tabular-nums">
                    +{evaluation.payloadMarginKg} kg
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setConfirmOpen(false);
                    setSimAborted(false);
                    setSimProgress(0);
                    setPhase('launching');
                  }}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-400 via-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-[0_10px_28px_rgba(34,211,238,0.35)] hover:brightness-110 transition cursor-pointer"
                >
                  START LUNAR JOURNEY ▶
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setConfirmOpen(false);
                  }}
                  className="px-4 py-3.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 uppercase cursor-pointer"
                >
                  Adjust
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: CINEMATIC LAUNCH & LUNAR FLYBY SEQUENCE */}
        {phase === 'launching' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="rounded-3xl bg-[#07142b]/95 border border-cyan-400/45 p-4 sm:p-6 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-lg bg-cyan-400/20 border border-cyan-400/55 font-mono-tech text-xs font-extrabold text-[#4fe3d4]">
                    {countdownLabel}
                  </span>
                  <span className="text-sm sm:text-base font-display font-extrabold text-white">
                    {simStageText}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    stopLaunchAudio();
                    setSimAborted(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-400/45 text-[11px] font-bold text-rose-200 cursor-pointer"
                >
                  Abort &amp; Retry
                </button>
              </div>

              <FlybyCinematicCanvas progressPct={simProgress} stageIndex={simStageIdx} />

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono-tech">
                  <span className="text-cyan-300 font-bold">LUNAR FLYBY PROGRESS</span>
                  <span className="text-white font-extrabold tabular-nums">
                    {Math.round(simProgress)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-900 border border-cyan-400/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#4fe3d4] via-sky-400 to-emerald-400 transition-all duration-100"
                    style={{ width: `${simProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Progress</div>
                  <div className="font-mono-tech font-extrabold text-white tabular-nums mt-0.5">
                    {Math.round(simProgress)}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Fuel Selected</div>
                  <div className="font-mono-tech font-extrabold text-[#4fe3d4] tabular-nums mt-0.5">
                    {evaluation.fuelKg} kg
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Fuel Remaining</div>
                  <div className="font-mono-tech font-extrabold text-emerald-300 tabular-nums mt-0.5">
                    {fuelRemainingKg.toFixed(1)} kg
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Total Mass</div>
                  <div className="font-mono-tech font-extrabold text-white tabular-nums mt-0.5">
                    {evaluation.totalMassKg} kg
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase">Moon Distance</div>
                  <div className="font-mono-tech font-extrabold text-amber-300 tabular-nums mt-0.5">
                    {distanceToMoonMiles.toLocaleString()} mi
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#040d1f] border border-emerald-400/35">
                  <div className="text-[10px] text-slate-400 uppercase">Corridor</div>
                  <div className="font-mono-tech font-extrabold text-emerald-300 mt-0.5 truncate">
                    ON TARGET
                  </div>
                </div>
              </div>

              {(simAborted || completionError) && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-400/55 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-rose-100 font-semibold">
                    {completionError || 'Simulation paused before lunar flyby completion.'}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        SFX.click();
                        submittingRef.current = false;
                        setCompletionError(null);
                        setSimAborted(false);
                        setSimProgress(0);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-400 text-[#041022] font-extrabold text-xs uppercase cursor-pointer"
                    >
                      RETRY
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        SFX.click();
                        setSimAborted(false);
                        setPhase('workbench');
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs uppercase cursor-pointer"
                    >
                      Back to Lab
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 3: CLEAN VISUAL VICTORY SUMMARY */}
        {phase === 'victory' && (
          <div className="max-w-4xl mx-auto space-y-4 pb-4">
            <div className="rounded-3xl bg-[#07152e]/95 border-2 border-emerald-400/55 p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] space-y-5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="space-y-2 text-center md:text-left">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono-tech font-extrabold text-emerald-300 tracking-widest uppercase">
                    ✓ LEVEL 5 CLEARED
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
                    LUNAR FLYBY SUCCESSFUL!
                  </h2>
                  <p className="text-sm text-slate-200 max-w-md">
                    Mission complete! Your probe nailed the fuel balance and executed a clean flyby past the Moon.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <LunarFlybyIllustrationSVG className="w-36 h-24 hidden sm:block" />
                  <PropulsionEngineerBadgeSVG size={114} />
                </div>
              </div>

              {/* Mission Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-xl bg-[#040d1f] border border-cyan-400/30">
                  <div className="text-[10px] text-slate-400 uppercase">Final Fuel</div>
                  <div className="font-mono-tech font-extrabold text-[#4fe3d4] text-base tabular-nums mt-0.5">
                    {evaluation.fuelKg} kg
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#040d1f] border border-cyan-400/30">
                  <div className="text-[10px] text-slate-400 uppercase">Total Mass</div>
                  <div className="font-mono-tech font-extrabold text-white text-base tabular-nums mt-0.5">
                    {evaluation.totalMassKg} kg
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#040d1f] border border-emerald-400/30">
                  <div className="text-[10px] text-slate-400 uppercase">Payload Margin</div>
                  <div className="font-mono-tech font-extrabold text-emerald-300 text-base tabular-nums mt-0.5">
                    +{evaluation.payloadMarginKg} kg
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#040d1f] border border-emerald-400/30">
                  <div className="text-[10px] text-slate-400 uppercase">Trajectory</div>
                  <div className="font-mono-tech font-extrabold text-emerald-300 text-sm mt-0.5">
                    LUNAR FLYBY ✓
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#040d1f] border border-white/15">
                  <div className="text-[10px] text-slate-400 uppercase">Time</div>
                  <div className="font-mono-tech font-extrabold text-white text-base tabular-nums mt-0.5">
                    {missionElapsedSec}s
                  </div>
                </div>
              </div>

              {/* Rewards Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-amber-500/12 border border-amber-400/45">
                  <div className="text-[10px] font-mono-tech uppercase text-amber-300 font-bold">
                    Star Credits Reward
                  </div>
                  <div className="font-mono-tech text-xl font-black text-amber-300 tabular-nums mt-1">
                    {rewardResult?.alreadyRewarded || alreadyCompleted
                      ? 'Already Claimed ✓'
                      : `+★ ${(rewardResult?.rewardAwarded ?? 1000).toLocaleString()} SC`}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 tabular-nums">
                    Balance: ★ {(rewardResult?.newStarBalance ?? starCredits).toLocaleString()} SC
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/12 border border-cyan-400/50">
                  <div className="text-[10px] font-mono-tech uppercase text-cyan-300 font-bold">
                    Space Center Upgrade
                  </div>
                  <div className="text-sm font-extrabold text-white mt-1">
                    🚀 PROPULSION UPGRADE UNLOCKED!
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Lunar Transfer Drive active in Space Center.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-400/50">
                  <div className="text-[10px] font-mono-tech uppercase text-emerald-300 font-bold">
                    Credential &amp; Campaign
                  </div>
                  <div className="text-sm font-extrabold text-white mt-1">
                    Propulsion Engineer Badge
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-1">
                    Level 5 Complete • Level 6 Unlocked!
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    onContinueToLevel6();
                  }}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs sm:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
                >
                  Continue to Level 6 ▶
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    onExit();
                  }}
                  className="px-5 py-3.5 rounded-xl bg-emerald-500/18 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-bold text-xs sm:text-sm uppercase cursor-pointer"
                >
                  Return to Space Center
                </button>
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    onBackToAcademy();
                  }}
                  className="px-5 py-3.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 font-bold text-xs sm:text-sm uppercase cursor-pointer"
                >
                  Level Map
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showEntryBriefing && phase === 'workbench' && (
        <div className="fixed inset-0 z-[5550] bg-[#020816]/84 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#07142b] border border-cyan-400/50 p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.92)] space-y-4 animate-[popIn_0.28s_ease-out]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono-tech font-bold uppercase tracking-[2.4px] text-[#4fe3d4]">
                LEVEL 05 // VOICE BRIEFING
              </span>
              <span className="px-2.5 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/40 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
                PROPULSION & FUEL LAB
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-black text-white">
              LUNAR FLYBY – FUEL MATH
            </h3>
            <DirectorVanceVoiceBanner
              speaker="DIRECTOR VANCE // LUNAR FLIGHT DYNAMICS"
              quote="Solve the rocket fuel equation! Load just enough propellant to reach the Moon without exceeding lift limits."
              autoPlayKey={visible && showEntryBriefing ? 'lvl5-entry-brief' : null}
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
                Enter Fuel Lab ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
