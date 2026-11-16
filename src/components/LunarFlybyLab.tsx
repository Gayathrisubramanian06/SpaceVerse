import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluateLunarFuel,
  LUNAR_DEFAULT_FUEL_KG,
  LUNAR_MAX_FUEL_KG,
  LUNAR_MIN_FUEL_KG,
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

type LabPhase = 'stage1_prep' | 'stage1_ascent' | 'stage1_clear' | 'stage2_flight' | 'victory';

interface FailureState {
  stage: 1 | 2;
  code: string;
  title: string;
  metric: string;
}

interface ProbeShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // radians
  fuelKg: number;
  slingshotEntered: boolean;
  trail: Array<{ x: number; y: number }>;
}

const STAR_FIELD = Array.from({ length: 120 }, (_, i) => ({
  x: ((i * 89 + 17) % 997) / 997,
  y: ((i * 173 + 29) % 991) / 991,
  r: 0.6 + ((i * 31) % 9) * 0.16,
  speed: 0.4 + (i % 5) * 0.2,
  phase: i * 0.71,
}));

function computeDeltaVKmS(fuelKg: number, angleDeg: number): number {
  const totalMass = 100 + fuelKg;
  const massTerm = Math.log(totalMass / 100) * 8.4;
  const heavyPenalty = fuelKg > 65 ? (fuelKg - 65) * 0.11 : 0;
  const angleLoss = Math.abs(angleDeg) * 0.04;
  return Math.max(0.6, Math.round((massTerm - heavyPenalty - angleLoss) * 100) / 100);
}

function computeStage2ReserveKg(
  launchFuelKg: number,
  angleDeg: number,
  maxQPenaltyKg: number,
  cleanSep: boolean
): number {
  // Ideal fuel (45-65 kg) preserves ~25-33 kg; <45 kg leaves <=11 kg; >65 kg loses Δv to gravity drag.
  if (launchFuelKg < 45) {
    return Math.max(2, Math.round((launchFuelKg * 0.24 - maxQPenaltyKg) * 10) / 10);
  }
  if (launchFuelKg > 65) {
    const dragWaste = (launchFuelKg - 65) * 1.35;
    return Math.max(3, Math.round((13 - dragWaste - maxQPenaltyKg) * 10) / 10);
  }
  const baseReserve = 26 + (launchFuelKg - 45) * 0.34;
  const anglePenalty = Math.abs(angleDeg) * 0.28;
  const sepBonus = cleanSep ? 2.5 : 0;
  return Math.max(18, Math.round((baseReserve - anglePenalty - maxQPenaltyKg + sepBonus) * 10) / 10);
}

/* ========================================================
   ANIMATED PROBE HARDWARE + GIMBAL NOZZLE CANVAS
   ======================================================== */
const ProbeGimbalCanvas: React.FC<{
  fuelPct: number;
  angleDeg: number;
  cutaway: boolean;
}> = ({ fuelPct, angleDeg, cutaway }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const yawRef = useRef(0.45);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const propsRef = useRef({ fuelPct, angleDeg, cutaway });
  propsRef.current = { fuelPct, angleDeg, cutaway };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      if (!dragRef.current.active) {
        yawRef.current += dt * 0.45;
      }

      const { fuelPct: curFuelPct, angleDeg: curAngleDeg, cutaway: isCutaway } = propsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.48;
      const yaw = yawRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.65);
      bg.addColorStop(0, '#0c2345');
      bg.addColorStop(1, '#040a16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 24; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 24; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 72, 84, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const wingSpan = 80 * Math.abs(cosY) + 18;
      const wingTilt = sinY * 12;
      const drawWing = (side: -1 | 1) => {
        const xs = cx + side * 28;
        const xe = cx + side * (28 + wingSpan);
        const yt = cy - 13 + side * wingTilt;
        const yb = cy + 13 + side * wingTilt;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + side * 22, cy);
        ctx.lineTo(xs, (yt + yb) / 2);
        ctx.stroke();

        const wg = ctx.createLinearGradient(xs, yt, xe, yb);
        wg.addColorStop(0, '#1e3a8a');
        wg.addColorStop(1, '#2563eb');
        ctx.fillStyle = wg;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(xs, yt);
        ctx.lineTo(xe, yt + side * wingTilt * 0.3);
        ctx.lineTo(xe, yb + side * wingTilt * 0.3);
        ctx.lineTo(xs, yb);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      if (sinY >= 0) {
        drawWing(-1);
        drawWing(1);
      } else {
        drawWing(1);
        drawWing(-1);
      }

      // Gimbaled Nozzle rotating live with burn angle
      ctx.save();
      ctx.translate(cx, cy + 30);
      ctx.rotate((-curAngleDeg * Math.PI) / 180);

      const nozGrad = ctx.createLinearGradient(-14, 0, 14, 26);
      nozGrad.addColorStop(0, '#475569');
      nozGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = nozGrad;
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.lineTo(16, 25);
      ctx.lineTo(-16, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const flameLen = 13 + (curFuelPct / 100) * 18 + Math.sin(t * 24) * 3;
      const fg = ctx.createLinearGradient(0, 25, 0, 25 + flameLen);
      fg.addColorStop(0, '#e0f2fe');
      fg.addColorStop(0.45, '#06b6d4');
      fg.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-9, 25);
      ctx.lineTo(9, 25);
      ctx.lineTo(0, 25 + flameLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const bw = 52 + Math.abs(sinY) * 8;
      const bh = 60;
      ctx.save();
      ctx.globalAlpha = isCutaway ? 0.3 : 0.96;
      const busGrad = ctx.createLinearGradient(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2);
      busGrad.addColorStop(0, '#fbbf24');
      busGrad.addColorStop(1, '#92400e');
      ctx.fillStyle = busGrad;
      ctx.strokeStyle = isCutaway ? '#06b6d4' : '#fde68a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const tw = 26;
      const th = 40;
      const tx = cx - tw / 2;
      const ty = cy - th / 2 + 2;
      ctx.fillStyle = '#040a16';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 6);
      ctx.fill();
      ctx.stroke();

      const fillH = Math.max(3, ((th - 4) * curFuelPct) / 100);
      const slosh = Math.sin(t * 4.5) * 1.5;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(tx + 2, ty + th - 2 - fillH + slosh * 0.4, tw - 4, fillH, 4);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - bh / 2);
      ctx.lineTo(cx, cy - bh / 2 - 14);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy - bh / 2 - 27, 19, Math.PI * 0.18, Math.PI * 0.82);
      ctx.stroke();
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(cx, cy - bh / 2 - 25, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={186}
      onPointerDown={(e) => {
        dragRef.current = { active: true, lastX: e.clientX };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current.active) return;
        yawRef.current += (e.clientX - dragRef.current.lastX) * 0.015;
        dragRef.current.lastX = e.clientX;
      }}
      onPointerUp={(e) => {
        dragRef.current.active = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      className="w-full h-auto rounded-xl border border-slate-800 cursor-grab active:cursor-grabbing block touch-none"
    />
  );
};

/* ========================================================
   STAGE 1 CANVAS: PAD PREVIEW + INTERACTIVE THROTTLE ASCENT
   ======================================================== */
const Stage1AscentCanvas: React.FC<{
  phase: LabPhase;
  altitudeKm: number;
  throttlePct: number;
  burnAngleDeg: number;
  inMaxQ: boolean;
  stageSepDone: boolean;
  stageSepReady: boolean;
  failure: FailureState | null;
}> = ({
  phase,
  altitudeKm,
  throttlePct,
  burnAngleDeg,
  inMaxQ,
  stageSepDone,
  stageSepReady,
  failure,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    phase,
    altitudeKm,
    throttlePct,
    burnAngleDeg,
    inMaxQ,
    stageSepDone,
    stageSepReady,
    failure,
  });
  stateRef.current = {
    phase,
    altitudeKm,
    throttlePct,
    burnAngleDeg,
    inMaxQ,
    stageSepDone,
    stageSepReady,
    failure,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const s = stateRef.current;
      const t = now * 0.001;
      const w = canvas.width;
      const h = canvas.height;

      // Sky transitions cleanly from twilight pad blue -> stratosphere -> orbital black
      const altFrac = Math.min(1, s.altitudeKm / 160);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (altFrac < 0.45) {
        skyGrad.addColorStop(0, '#040a18');
        skyGrad.addColorStop(0.6, '#0b1e3b');
        skyGrad.addColorStop(1, '#123154');
      } else {
        skyGrad.addColorStop(0, '#020611');
        skyGrad.addColorStop(1, '#061124');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars fade in with altitude (and scroll downward during climb)
      const starVisibility = s.phase === 'stage1_prep' ? 0.45 : Math.min(1, 0.25 + altFrac * 0.9);
      const scrollY = s.phase === 'stage1_ascent' ? s.altitudeKm * 6.5 : 0;
      for (const st of STAR_FIELD) {
        const sx = st.x * w;
        const sy = ((st.y * h + scrollY * st.speed) % h + h) % h;
        const alpha = starVisibility * (0.3 + 0.5 * Math.sin(t * 2 + st.phase));
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0.08, alpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Curved glowing Earth horizon rising into view above 85 km
      if (s.altitudeKm > 75) {
        const hVis = Math.min(1, (s.altitudeKm - 75) / 85);
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${(0.55 * hVis).toFixed(2)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(w * 0.5, h + 460 - hVis * 110, 520, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.restore();
      }

      // Max-Q Turbulence atmospheric band overlay
      if (s.inMaxQ && s.phase === 'stage1_ascent') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) {
          const sx = ((i * 73 + t * 80) % w);
          const sy = ((t * 420 + i * 31) % h);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + 28);
          ctx.stroke();
        }
      }

      // Pad & Tower receding cleanly during initial climb
      const padDrop = s.phase === 'stage1_prep' ? 0 : Math.min(360, s.altitudeKm * 22);
      const groundY = h * 0.84 + padDrop;
      if (groundY < h + 160) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, groundY, w, h - groundY + 180);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w * 0.36, groundY - 10, w * 0.28, 12);
        // Launch tower
        ctx.fillStyle = '#334155';
        ctx.fillRect(w * 0.38, groundY - 190, 16, 180);
        // Retractable Umbilical arms
        const clampOpen = s.phase === 'stage1_prep' ? 0 : 1;
        ctx.strokeStyle = s.failure?.code === 'OVERWEIGHT' ? '#f43f5e' : '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.38 + 16, groundY - 82);
        ctx.lineTo(w * 0.38 + (clampOpen ? 36 : 74), groundY - (clampOpen ? 106 : 82));
        ctx.stroke();
      }

      // Rocket position & realistic vibration
      const isOverweight = s.failure?.code === 'OVERWEIGHT';
      const vibAmp =
        s.phase === 'stage1_prep'
          ? 0
          : isOverweight
          ? 5.5
          : (s.throttlePct / 100) * (s.inMaxQ ? 3.5 : 1.6);
      const rx = w * 0.5 + Math.sin(now * 0.08) * vibAmp;
      const ry =
        s.phase === 'stage1_prep'
          ? h * 0.62
          : isOverweight
          ? h * 0.61 - Math.abs(Math.sin(t * 4)) * 12
          : h * 0.54 - Math.min(70, altFrac * 70);

      // Animated Launch Smoke Plume on Pad / Low Altitude
      if (s.phase === 'stage1_ascent' && s.altitudeKm < 28 && s.throttlePct > 0) {
        for (let i = 0; i < 16; i++) {
          const age = (t * 2.1 + i * 0.17) % 1;
          const sx = rx + Math.sin(i * 1.9) * (16 + age * 85);
          const sy = ry + 84 + age * 90;
          ctx.fillStyle = isOverweight
            ? `rgba(244, 63, 94, ${(0.38 * (1 - age)).toFixed(2)})`
            : `rgba(203, 213, 225, ${(0.34 * (1 - age)).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 10 + age * 26, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Separated Booster Stage 1 (drops away & tumbles smoothly once stageSepDone)
      const sepShiftY = s.stageSepDone ? Math.min(260, (s.altitudeKm - 75) * 8 + 45) : 0;
      const sepShiftX = s.stageSepDone ? -Math.min(70, sepShiftY * 0.3) : 0;

      if (!s.stageSepDone || sepShiftY < 240) {
        ctx.save();
        ctx.translate(rx + sepShiftX, ry + 26 + sepShiftY);
        ctx.rotate(s.stageSepDone ? -0.42 : (s.burnAngleDeg * Math.PI) / 360);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-14, 0, 28, 72);
        // Side fins
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-14, 48);
        ctx.lineTo(-28, 76);
        ctx.lineTo(-14, 72);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(14, 48);
        ctx.lineTo(28, 76);
        ctx.lineTo(14, 72);
        ctx.closePath();
        ctx.fill();

        // Main Booster Flame
        if (s.phase === 'stage1_ascent' && !s.stageSepDone && s.throttlePct > 0 && !isOverweight) {
          const fl = 28 + (s.throttlePct / 100) * 62 + Math.sin(now * 0.09) * 14;
          const fg = ctx.createLinearGradient(0, 72, 0, 72 + fl);
          fg.addColorStop(0, '#ffffff');
          fg.addColorStop(0.3, s.throttlePct > 100 ? '#38bdf8' : '#fde047');
          fg.addColorStop(0.7, '#f97316');
          fg.addColorStop(1, 'rgba(249,115,22,0)');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.moveTo(-11, 72);
          ctx.lineTo(11, 72);
          ctx.lineTo(0, 72 + fl);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Upper Stage & Payload Fairing
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate((s.burnAngleDeg * Math.PI) / 360);

      // Interstage ring
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-14, 16, 28, 10);
      // Upper body
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-14, -18, 28, 34);
      // Nose fairing
      ctx.beginPath();
      ctx.moveTo(-14, -18);
      ctx.quadraticCurveTo(-14, -48, 0, -58);
      ctx.quadraticCurveTo(14, -48, 14, -18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Upper stage vacuum engine flame after Stage Sep
      if (s.stageSepDone && s.phase === 'stage1_ascent' && s.throttlePct > 0) {
        const ufl = 24 + (s.throttlePct / 100) * 34 + Math.sin(now * 0.08) * 6;
        const ufg = ctx.createLinearGradient(0, 26, 0, 26 + ufl);
        ufg.addColorStop(0, '#e0f2fe');
        ufg.addColorStop(0.45, '#06b6d4');
        ufg.addColorStop(1, 'rgba(6,182,212,0)');
        ctx.fillStyle = ufg;
        ctx.beginPath();
        ctx.moveTo(-9, 26);
        ctx.lineTo(9, 26);
        ctx.lineTo(0, 26 + ufl);
        ctx.closePath();
        ctx.fill();
      }

      // Stage Separation Pulse Ring when ready
      if (s.stageSepReady && !s.stageSepDone && s.phase === 'stage1_ascent') {
        const pulse = 28 + Math.sin(t * 10) * 5;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(0, 21, pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Max-Q Aero Cone around fairing
      if (s.inMaxQ && s.phase === 'stage1_ascent') {
        ctx.save();
        ctx.strokeStyle = s.throttlePct > 95 ? 'rgba(244,63,94,0.75)' : 'rgba(251,191,36,0.55)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(rx - 44, ry + 10);
        ctx.quadraticCurveTo(rx, ry - 76, rx + 44, ry + 10);
        ctx.stroke();
        ctx.restore();
      }
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={880}
      height={440}
      className="w-full h-full object-cover rounded-2xl border border-slate-800 block"
    />
  );
};

/* ========================================================
   STAGE 2 CANVAS: REAL-TIME CISLUNAR NAVIGATION & SLINGSHOT
   ======================================================== */
const Stage2CislunarCanvas: React.FC<{
  shipRef: React.MutableRefObject<ProbeShip>;
  burning: boolean;
  braking: boolean;
  throttleMode: 'eco' | 'nom' | 'max';
}> = ({ shipRef, burning, braking, throttleMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputVisualRef = useRef({ burning, braking, throttleMode });
  inputVisualRef.current = { burning, braking, throttleMode };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const t = now * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      const ship = shipRef.current;
      const vis = inputVisualRef.current;

      // Deep space background
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#040814');
      bg.addColorStop(0.6, '#071226');
      bg.addColorStop(1, '#030712');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (const s of STAR_FIELD) {
        const sx = s.x * w;
        const sy = s.y * h;
        const alpha = 0.25 + 0.5 * Math.sin(t * 1.8 + s.phase);
        ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Navigation Grid
      ctx.strokeStyle = 'rgba(148,163,184,0.06)';
      ctx.lineWidth = 1;
      for (let gx = 44; gx < w; gx += 64) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 44; gy < h; gy += 64) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Earth (x=88, y=240)
      const ex = 88;
      const ey = h * 0.5;
      const eg = ctx.createRadialGradient(ex, ey, 22, ex, ey, 62);
      eg.addColorStop(0, 'rgba(56,189,248,0.34)');
      eg.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, 62, 0, Math.PI * 2);
      ctx.fill();

      const eCore = ctx.createRadialGradient(ex - 10, ey - 10, 6, ex, ey, 34);
      eCore.addColorStop(0, '#38bdf8');
      eCore.addColorStop(0.7, '#0284c7');
      eCore.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = eCore;
      ctx.beginPath();
      ctx.arc(ex, ey, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(52,211,153,0.72)';
      ctx.beginPath();
      ctx.ellipse(ex - 8, ey - 6, 11, 7, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ex + 9, ey + 7, 8, 9, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Moon & Gravity Slingshot Corridor (x=680, y=230)
      const mx = 680;
      const my = h * 0.48;
      const mr = 32;

      // Lunar Gravity Well & Slingshot Corridor Arc (wider, clear visual target)
      ctx.save();
      ctx.strokeStyle = ship.slingshotEntered ? 'rgba(52,211,153,0.28)' : 'rgba(6,182,212,0.25)';
      ctx.lineWidth = 54;
      ctx.beginPath();
      ctx.arc(mx, my, 96, -Math.PI * 0.78, Math.PI * 0.78);
      ctx.stroke();

      ctx.strokeStyle = ship.slingshotEntered ? '#34d399' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(mx, my, 96, -Math.PI * 0.78, Math.PI * 0.78);
      ctx.stroke();
      ctx.restore();

      // Generous Departure Slingshot Zone on Far Side (x >= 790)
      const gateX = 815;
      const gateGlow = ctx.createLinearGradient(785, 0, w, 0);
      gateGlow.addColorStop(0, 'rgba(52,211,153,0)');
      gateGlow.addColorStop(1, ship.slingshotEntered ? 'rgba(52,211,153,0.22)' : 'rgba(6,182,212,0.1)');
      ctx.fillStyle = gateGlow;
      ctx.fillRect(785, 45, w - 785, h - 90);

      ctx.save();
      ctx.strokeStyle = ship.slingshotEntered ? '#34d399' : 'rgba(103,232,249,0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(gateX, 60);
      ctx.lineTo(gateX, h - 60);
      ctx.stroke();
      ctx.restore();

      // Moon Core
      const mg = ctx.createRadialGradient(mx - 9, my - 9, 5, mx, my, mr);
      mg.addColorStop(0, '#f8fafc');
      mg.addColorStop(0.7, '#94a3b8');
      mg.addColorStop(1, '#334155');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(51,65,85,0.45)';
      [
        { dx: -9, dy: -7, cr: 6 },
        { dx: 8, dy: 9, cr: 7 },
        { dx: -5, dy: 12, cr: 4 },
      ].forEach((c) => {
        ctx.beginPath();
        ctx.arc(mx + c.dx, my + c.dy, c.cr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Live Forward Orbital Trajectory Predictor (turns bright green when trajectory enters Slingshot Corridor safely!)
      const predPts: Array<{ x: number; y: number }> = [];
      let px = ship.x;
      let py = ship.y;
      let pvx = ship.vx;
      let pvy = ship.vy;
      let predHitsMoon = false;
      let predEntersCorridor = false;
      predPts.push({ x: px, y: py });
      for (let step = 0; step < 80; step++) {
        const dxE = ex - px;
        const dyE = ey - py;
        const dE2 = Math.max(2800, dxE * dxE + dyE * dyE);
        const dE = Math.sqrt(dE2);
        const pullE = 38000 / dE2;
        pvx += (dxE / dE) * pullE * 0.08;
        pvy += (dyE / dE) * pullE * 0.08;

        const dxM = mx - px;
        const dyM = my - py;
        const dM2 = Math.max(1200, dxM * dxM + dyM * dyM);
        const dM = Math.sqrt(dM2);
        const pullM = 220000 / dM2;
        pvx += (dxM / dM) * pullM * 0.08;
        pvy += (dyM / dM) * pullM * 0.08;

        px += pvx * 0.08;
        py += pvy * 0.08;
        predPts.push({ x: px, y: py });
        if (dM <= mr + 6) {
          predHitsMoon = true;
          break;
        }
        if (dM >= 40 && dM <= 150 && px > mx - 80) {
          predEntersCorridor = true;
        }
        if (dE < 34 || px > w + 20 || py < -20 || py > h + 20) break;
      }

      ctx.save();
      ctx.strokeStyle = predHitsMoon
        ? 'rgba(244,63,94,0.75)'
        : predEntersCorridor
        ? 'rgba(52,211,153,0.78)'
        : 'rgba(56,189,248,0.48)';
      ctx.lineWidth = predEntersCorridor ? 2.2 : 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      predPts.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();

      // Flight Trail
      if (ship.trail.length > 1) {
        ctx.strokeStyle = 'rgba(6,182,212,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ship.trail.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // Probe Spacecraft
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Main thruster flame
      if (vis.burning && ship.fuelKg > 0.05) {
        const fLen = (vis.throttleMode === 'max' ? 32 : vis.throttleMode === 'nom' ? 23 : 15) + Math.sin(now * 0.07) * 4;
        const fg = ctx.createLinearGradient(-10, 0, -10 - fLen, 0);
        fg.addColorStop(0, '#e0f2fe');
        fg.addColorStop(0.45, vis.throttleMode === 'max' ? '#fbbf24' : '#06b6d4');
        fg.addColorStop(1, 'rgba(6,182,212,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(-9, -4);
        ctx.lineTo(-9, 4);
        ctx.lineTo(-9 - fLen, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Forward Retro Brake RCS puffs
      if (vis.braking && ship.fuelKg > 0.05) {
        ctx.fillStyle = 'rgba(251,191,36,0.85)';
        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(10, 3);
        ctx.lineTo(22 + Math.sin(now * 0.08) * 3, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Solar Wings + Gold Core
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-3, -17, 6, 11);
      ctx.fillRect(-3, 6, 6, 11);
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.3;
      ctx.fillRect(-8, -6, 16, 12);
      ctx.strokeRect(-8, -6, 16, 12);
      ctx.restore();

      // Minimal Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', ex, ey + 50);
      ctx.fillText('MOON', mx, my + 48);
      ctx.fillStyle = ship.slingshotEntered ? '#34d399' : '#67e8f9';
      ctx.fillText('EXIT CORRIDOR', gateX, 46);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [shipRef]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={460}
      className="w-full h-full object-cover rounded-2xl border border-slate-800 block"
    />
  );
};

/* ========================================================
   MAIN LEVEL 5 COMPONENT — TWO INTERACTIVE STAGES
   ======================================================== */
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
  const [phase, setPhase] = useState<LabPhase>('stage1_prep');
  const [fuelKg, setFuelKg] = useState<number>(LUNAR_DEFAULT_FUEL_KG);
  const [burnAngleDeg, setBurnAngleDeg] = useState<number>(5);
  const [cutawayMode, setCutawayMode] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());

  // Stage 1 Ascent Live Telemetry
  const [throttlePct, setThrottlePct] = useState<number>(85);
  const [altitudeKm, setAltitudeKm] = useState<number>(0);
  const [ascentVelKmS, setAscentVelKmS] = useState<number>(0);
  const [ascentFuelLeft, setAscentFuelLeft] = useState<number>(LUNAR_DEFAULT_FUEL_KG);
  const [inMaxQ, setInMaxQ] = useState<boolean>(false);
  const [stageSepReady, setStageSepReady] = useState<boolean>(false);
  const [stageSepDone, setStageSepDone] = useState<boolean>(false);
  const [stage2StartingFuel, setStage2StartingFuel] = useState<number>(26);

  // Stage 2 Live Telemetry
  const [stage2FuelLeft, setStage2FuelLeft] = useState<number>(26);
  const [stage2SpeedKmS, setStage2SpeedKmS] = useState<number>(1.8);
  const [moonDistMm, setMoonDistMm] = useState<number>(384);
  const [slingshotLocked, setSlingshotLocked] = useState<boolean>(false);
  const [throttleMode, setThrottleMode] = useState<'eco' | 'nom' | 'max'>('nom');
  const [isBurningUI, setIsBurningUI] = useState<boolean>(false);
  const [isBrakingUI, setIsBrakingUI] = useState<boolean>(false);

  const [failure, setFailure] = useState<FailureState | null>(null);
  const [rewardResult, setRewardResult] = useState<Level5RewardResult | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const tankDragRef = useRef(false);
  const labOpenedAtRef = useRef<number>(Date.now());
  const submittingRef = useRef(false);
  const launchAudioRef = useRef<ReturnType<typeof SFX.createRocketLaunchAudio> | null>(null);
  const announcedCueRef = useRef<string | null>(null);

  // Physics Refs for Stage 1 & Stage 2
  const throttlePctRef = useRef<number>(85);
  const stageSepDoneRef = useRef<boolean>(false);
  const stageSepReadyRef = useRef<boolean>(false);
  const throttleModeRef = useRef<'eco' | 'nom' | 'max'>('nom');
  const controlsRef = useRef({ left: false, right: false, burn: false, brake: false });

  const shipRef = useRef<ProbeShip>({
    x: 132,
    y: 230,
    vx: 44,
    vy: 0,
    angle: 0,
    fuelKg: 26,
    slingshotEntered: false,
    trail: [],
  });

  const evaluation = useMemo(() => evaluateLunarFuel(fuelKg), [fuelKg]);
  const deltaVKmS = useMemo(() => computeDeltaVKmS(fuelKg, burnAngleDeg), [fuelKg, burnAngleDeg]);

  const stopAudio = useCallback(() => {
    if (launchAudioRef.current) {
      launchAudioRef.current.stop();
      launchAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      stopAudio();
      announcedCueRef.current = null;
      SFX.cancelSpeech();
      return;
    }
    setPhase('stage1_prep');
    setFuelKg(LUNAR_DEFAULT_FUEL_KG);
    setBurnAngleDeg(5);
    setThrottlePct(85);
    throttlePctRef.current = 85;
    setAltitudeKm(0);
    setAscentVelKmS(0);
    setStageSepDone(false);
    stageSepDoneRef.current = false;
    setStageSepReady(false);
    stageSepReadyRef.current = false;
    setFailure(null);
    setRewardResult(null);
    setCompletionError(null);
    setMuted(SFX.isMuted());
    labOpenedAtRef.current = Date.now();
    submittingRef.current = false;
  }, [visible, stopAudio]);

  // Voice-only cues between stages
  useEffect(() => {
    if (!visible) return;
    if (announcedCueRef.current === phase) return;
    announcedCueRef.current = phase;

    if (phase === 'stage1_prep') {
      SFX.speakCue(
        'Stage 1: Fuel Lab and Orbital Ascent. Calibrate your propellant load and burn angle, then launch and manage throttle into orbit.'
      );
    } else if (phase === 'stage1_clear') {
      SFX.speakCue('Stage 1 complete. Earth orbit achieved. Proceed to Stage 2 cislunar navigation.');
    } else if (phase === 'stage2_flight') {
      SFX.speakCue(
        'Stage 2: Cislunar Transfer. Use thrust, attitude steering, and braking to thread the lunar slingshot corridor and reach the exit gate.'
      );
    }
  }, [visible, phase]);

  // Keyboard bindings for Stage 1 & Stage 2
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'stage1_ascent') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          const next = Math.min(115, throttlePctRef.current + 10);
          throttlePctRef.current = next;
          setThrottlePct(next);
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          const next = Math.max(0, throttlePctRef.current - 10);
          throttlePctRef.current = next;
          setThrottlePct(next);
        } else if (e.code === 'Space' && stageSepReadyRef.current && !stageSepDoneRef.current) {
          e.preventDefault();
          stageSepDoneRef.current = true;
          setStageSepDone(true);
          SFX.snapCorrect();
        }
      } else if (phase === 'stage2_flight') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') controlsRef.current.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') controlsRef.current.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
          e.preventDefault();
          controlsRef.current.burn = true;
          setIsBurningUI(true);
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          controlsRef.current.brake = true;
          setIsBrakingUI(true);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') controlsRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') controlsRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        controlsRef.current.burn = false;
        setIsBurningUI(false);
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        controlsRef.current.brake = false;
        setIsBrakingUI(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [visible, phase]);

  const handleFuelChange = (val: number) => {
    const next = Math.max(LUNAR_MIN_FUEL_KG, Math.min(LUNAR_MAX_FUEL_KG, Math.round(val)));
    setFuelKg(next);
    SFX.sliderTick((next - LUNAR_MIN_FUEL_KG) / (LUNAR_MAX_FUEL_KG - LUNAR_MIN_FUEL_KG));
  };

  const handleTankPointer = (clientY: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0.1, Math.min(1, (rect.bottom - clientY) / rect.height));
    handleFuelChange(Math.round(frac * LUNAR_MAX_FUEL_KG));
  };

  const handleStartStage1 = () => {
    SFX.click();
    SFX.playIgnitionBurst();
    setFailure(null);
    setAltitudeKm(0);
    setAscentVelKmS(0);
    setAscentFuelLeft(fuelKg);
    setThrottlePct(85);
    throttlePctRef.current = 85;
    setInMaxQ(false);
    setStageSepReady(false);
    stageSepReadyRef.current = false;
    setStageSepDone(false);
    stageSepDoneRef.current = false;
    setPhase('stage1_ascent');
  };

  const handleStartStage2 = useCallback(
    (reserveKg: number) => {
      SFX.click();
      setFailure(null);
      const driftRad = (burnAngleDeg * Math.PI) / 180;
      const startSpeed = 30;
      shipRef.current = {
        x: 168,
        y: 222,
        vx: Math.cos(driftRad) * startSpeed,
        vy: Math.sin(driftRad) * startSpeed * 0.9,
        angle: driftRad,
        fuelKg: reserveKg,
        slingshotEntered: false,
        trail: [{ x: 168, y: 222 }],
      };
      setStage2FuelLeft(reserveKg);
      setStage2SpeedKmS(Math.round((startSpeed / 26) * 100) / 100);
      setMoonDistMm(384);
      setSlingshotLocked(false);
      setThrottleMode('nom');
      throttleModeRef.current = 'nom';
      controlsRef.current = { left: false, right: false, burn: false, brake: false };
      setIsBurningUI(false);
      setIsBrakingUI(false);
      setPhase('stage2_flight');
    },
    [burnAngleDeg]
  );

  // STAGE 1 REAL-TIME ASCENT LOOP (~12–14s interactive throttle & stage separation)
  useEffect(() => {
    if (!visible || phase !== 'stage1_ascent' || failure) return;

    const audio = SFX.createRocketLaunchAudio();
    launchAudioRef.current = audio;
    audio.setPhase('liftoff');

    let raf = 0;
    let last = performance.now();
    let alt = 0;
    let vel = 0.2;
    let liveFuel = fuelKg;
    let maxQWasteKg = 0;
    let clock = 0;
    let sepVoiceSpoken = false;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;

      // Check 175 kg Rocket Lift Limit physically on Pad 39X
      if (evaluation.totalMassKg > evaluation.rocketLiftLimitKg && clock >= 1.8) {
        SFX.massWarningBeep();
        SFX.snapWrong();
        stopAudio();
        setFailure({
          stage: 1,
          code: 'OVERWEIGHT',
          title: 'PAD OVERLOAD — TOO HEAVY',
          metric: `${evaluation.totalMassKg} kg > ${evaluation.rocketLiftLimitKg} kg Lift Capacity`,
        });
        return;
      }

      const thr = throttlePctRef.current;
      const massFactor = 145 / Math.max(110, evaluation.totalMassKg);
      const maxQActive = alt >= 28 && alt <= 62;
      setInMaxQ(maxQActive);

      // Fuel burn rate scales with throttle; running >95% in Max-Q wastes reserve propellant
      const burnRate = (thr / 100) * (fuelKg * 0.042) * (maxQActive && thr > 95 ? 1.55 : 1);
      if (maxQActive && thr > 95) {
        maxQWasteKg += dt * 1.1;
      }

      liveFuel = Math.max(0, liveFuel - burnRate * dt);
      setAscentFuelLeft(Math.round(liveFuel * 10) / 10);

      // Climb rate & velocity (~9-11s brisk interactive climb)
      const thrustAccel = liveFuel > 0.1 ? (thr / 100) * 1.45 * massFactor : 0;
      const gravityDrag = stageSepDoneRef.current ? 0.25 : 0.42;
      vel = Math.max(0.1, vel + (thrustAccel - gravityDrag) * dt);
      alt += vel * 4.3 * dt;

      setAltitudeKm(Math.round(alt * 10) / 10);
      setAscentVelKmS(Math.round(vel * 100) / 100);

      // Enable Stage Sep around 74 km
      if (alt >= 74 && !stageSepReadyRef.current) {
        stageSepReadyRef.current = true;
        setStageSepReady(true);
        audio.setPhase('ascent');
        if (!sepVoiceSpoken) {
          sepVoiceSpoken = true;
          SFX.speakCue('Stage 1 booster burnout. Trigger Stage Separation now!');
        }
      }

      // Check if fuel ran completely dry before orbit (ultra-low fuel < 22 kg)
      if (liveFuel <= 0.1 && alt < 155) {
        SFX.snapWrong();
        stopAudio();
        setFailure({
          stage: 1,
          code: 'MECO_DRY',
          title: 'BOOSTER RAN OUT OF FUEL',
          metric: `Reached ${Math.round(alt)} / 160 km orbit · Increase launch fuel`,
        });
        return;
      }

      // Orbit Insertion Complete at 160 km
      if (alt >= 160) {
        stopAudio();
        SFX.snapCorrect();
        const reserveKg = computeStage2ReserveKg(
          fuelKg,
          burnAngleDeg,
          maxQWasteKg,
          stageSepDoneRef.current
        );
        setStage2StartingFuel(reserveKg);
        setPhase('stage1_clear');
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopAudio();
    };
  }, [visible, phase, failure, fuelKg, burnAngleDeg, evaluation.totalMassKg, evaluation.rocketLiftLimitKg, stopAudio]);

  // STAGE 2 REAL-TIME CISLUNAR NAVIGATION & SLINGSHOT LOOP
  useEffect(() => {
    if (!visible || phase !== 'stage2_flight' || failure) return;

    let raf = 0;
    let last = performance.now();
    let frameCounter = 0;
    const moonX = 680;
    const moonY = 220.8;
    const moonR = 32;
    const gateX = 815;

    const failStage2 = (code: string, title: string, metric: string) => {
      SFX.snapWrong();
      setFailure({ stage: 2, code, title, metric });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ship = shipRef.current;
      const ctrl = controlsRef.current;

      // Attitude Rotation
      const rotSpeed = 2.6;
      if (ctrl.left) ship.angle -= rotSpeed * dt;
      if (ctrl.right) ship.angle += rotSpeed * dt;

      // Fuel Consumption & Thrust (Eco is most fuel-efficient; heavy probe >65kg has lower thrust/weight)
      const thrustMult =
        throttleModeRef.current === 'eco' ? 0.78 : throttleModeRef.current === 'max' ? 1.38 : 1.0;
      const fuelBurnMult =
        throttleModeRef.current === 'eco' ? 0.62 : throttleModeRef.current === 'max' ? 1.55 : 1.0;
      const massEfficiency = fuelKg > 65 ? 140 / Math.max(155, evaluation.totalMassKg) : 1;

      if (ctrl.burn && ship.fuelKg > 0.05) {
        const accel = 25 * thrustMult * massEfficiency;
        ship.vx += Math.cos(ship.angle) * accel * dt;
        ship.vy += Math.sin(ship.angle) * accel * dt;
        ship.fuelKg = Math.max(0, ship.fuelKg - 5.4 * fuelBurnMult * dt);
      }

      if (ctrl.brake && ship.fuelKg > 0.05) {
        const spd = Math.hypot(ship.vx, ship.vy) || 1;
        const brakeDecel = Math.min(spd, 28 * dt);
        ship.vx -= (ship.vx / spd) * brakeDecel;
        ship.vy -= (ship.vy / spd) * brakeDecel;
        ship.fuelKg = Math.max(0, ship.fuelKg - 3.2 * dt);
      }

      // Earth Gravity Pull (centered at 88, 230)
      const dxE = 88 - ship.x;
      const dyE = 230 - ship.y;
      const distE = Math.hypot(dxE, dyE);
      if (distE > 34) {
        const pullE = 38000 / Math.max(2800, distE * distE);
        ship.vx += (dxE / distE) * pullE * dt;
        ship.vy += (dyE / distE) * pullE * dt;
      }

      // Moon Gravitational Pull (smooth slingshot curve)
      const dxM = moonX - ship.x;
      const dyM = moonY - ship.y;
      const distM = Math.hypot(dxM, dyM);
      if (distM > moonR) {
        const pull = 220000 / Math.max(1200, distM * distM);
        ship.vx += (dxM / distM) * pull * dt;
        ship.vy += (dyM / distM) * pull * dt;
      }

      // Gentle speed cap so orbital trajectories stay crisp and readable
      const speedNow = Math.hypot(ship.vx, ship.vy);
      if (speedNow > 135) {
        ship.vx *= 135 / speedNow;
        ship.vy *= 135 / speedNow;
      }

      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;

      // Track trail
      frameCounter++;
      if (frameCounter % 3 === 0) {
        ship.trail.push({ x: ship.x, y: ship.y });
        if (ship.trail.length > 90) ship.trail.shift();
        setStage2FuelLeft(Math.round(ship.fuelKg * 10) / 10);
        setStage2SpeedKmS(Math.round((speedNow / 24) * 100) / 100);
        setMoonDistMm(Math.max(0, Math.round(((distM - moonR) / 560) * 384)));
      }

      // Earth Re-entry Check (if fuel exhausted and pulled back into Earth)
      if (distE <= 36) {
        failStage2(
          'REENTRY',
          'PULLED BACK TO EARTH',
          `Insufficient TLI burn fuel · Launch fuel was ${fuelKg} kg`
        );
        return;
      }

      // Moon Collision Check
      if (distM <= moonR + 4) {
        failStage2(
          'IMPACT',
          'LUNAR SURFACE IMPACT',
          'Approach altitude dropped onto lunar crater rim'
        );
        return;
      }

      // Slingshot Corridor Lock (within 38–155 px around Moon)
      if (!ship.slingshotEntered && distM >= 38 && distM <= 155 && ship.x > moonX - 95) {
        ship.slingshotEntered = true;
        setSlingshotLocked(true);
        SFX.snapCorrect();
      }

      // Out of Fuel Stall Check (if fuel hits 0 and probe stalls or falls back before reaching Moon)
      if (ship.fuelKg <= 0.05 && ship.x < gateX - 60 && (speedNow < 26 || ship.vx < 0)) {
        failStage2(
          'OUT_OF_FUEL',
          'PROPELLANT DEPLETED IN CISLUNAR SPACE',
          `Ran dry before slingshot · Launch fuel was ${fuelKg} kg`
        );
        return;
      }

      // Victory Check: Slingshot Corridor Entered + Crossed Far-Side Departure Corridor!
      if (ship.slingshotEntered && ship.x >= gateX && ship.y >= 55 && ship.y <= 405) {
        if (!submittingRef.current) {
          submittingRef.current = true;
          const elapsedSec = Math.max(18, Math.round((Date.now() - labOpenedAtRef.current) / 1000));
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
              submittingRef.current = false;
              setCompletionError('Verification failed. Retry Stage 1 fuel configuration.');
            });
        }
        return;
      }

      // Off-Map Space Drift Failure (check after Victory corridor)
      if (ship.x < -30 || ship.x > 930 || ship.y < -30 || ship.y > 490) {
        if (ship.fuelKg <= 0.1) {
          failStage2(
            'OUT_OF_FUEL',
            'FUEL EXHAUSTED — DRIFTED OFF TARGET',
            `Insufficient fuel reserve from ${fuelKg} kg launch load`
          );
        } else {
          failStage2(
            'OFF_COURSE',
            'ESCAPED CISLUNAR CORRIDOR',
            'Trajectory missed the Moon gravity-assist corridor'
          );
        }
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, phase, failure, fuelKg, evaluation.fuelKg, onCompleteMission]);

  if (!visible) return null;

  const isStage2 = phase === 'stage2_flight';

  return (
    <div className="fixed inset-0 z-[5400] bg-[#040A16] text-slate-100 flex flex-col overflow-hidden">
      {/* CLEAN 3-ZONE TOP BAR */}
      <header className="h-14 px-4 md:px-6 bg-[#071022] border-b border-slate-800 flex items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono-tech font-semibold text-cyan-400 whitespace-nowrap">
            Level 05
          </span>
          <span className="text-slate-600">·</span>
          <h1 className="font-display text-sm md:text-base font-bold text-white truncate">
            Lunar Flyby Propulsion Lab
          </h1>
          <span className="hidden md:inline text-slate-600">·</span>
          <span className="hidden md:inline font-mono-tech text-xs text-amber-300 font-semibold whitespace-nowrap">
            {phase === 'victory'
              ? 'Mission Complete'
              : isStage2
              ? 'Stage 2 of 2 · Cislunar Flight'
              : 'Stage 1 of 2 · Fuel & Ascent'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <DirectorVanceVoiceBanner
            compact
            quote={
              isStage2
                ? 'Steer with A/D, burn with W/Space, and thread the lunar slingshot exit gate.'
                : 'Adjust fuel valves and burn angle, then manage throttle through orbit insertion.'
            }
          />
          <span className="hidden sm:inline font-mono-tech text-xs font-semibold text-amber-300 tabular-nums whitespace-nowrap">
            ★ {starCredits.toLocaleString()} SC
          </span>
          <button
            type="button"
            onClick={() => {
              const m = SFX.toggleMute();
              setMuted(m);
              launchAudioRef.current?.setMuted(m);
            }}
            aria-label="Toggle Audio"
            className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-sm cursor-pointer"
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
              className="px-3.5 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              Handbook
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              stopAudio();
              onExit();
            }}
            className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            Exit
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        {phase !== 'victory' && (
          <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-stretch">
            {/* LEFT INTERACTIVE FUEL & PROPULSION CONSOLE */}
            <section className="rounded-2xl bg-[#081326] border border-slate-800 p-4 flex flex-col justify-between gap-4">
              {phase === 'stage1_prep' && (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Probe Hardware</span>
                        <button
                          type="button"
                          onClick={() => {
                            SFX.select();
                            setCutawayMode((c) => !c);
                          }}
                          className="text-xs font-mono-tech text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        >
                          {cutawayMode ? 'Exterior' : 'Cutaway'}
                        </button>
                      </div>
                      <ProbeGimbalCanvas
                        fuelPct={evaluation.fuelPct}
                        angleDeg={burnAngleDeg}
                        cutaway={cutawayMode}
                      />
                    </div>

                    {/* Explicit Tactile Fuel Controls (Tank Drag + Slider + Valve Step Buttons) */}
                    <div className="grid grid-cols-[88px_1fr] gap-3 items-center pt-1">
                      <div
                        onPointerDown={(e) => {
                          tankDragRef.current = true;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          handleTankPointer(e.clientY, e.currentTarget);
                        }}
                        onPointerMove={(e) => {
                          if (tankDragRef.current) {
                            handleTankPointer(e.clientY, e.currentTarget);
                          }
                        }}
                        onPointerUp={(e) => {
                          tankDragRef.current = false;
                          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                            e.currentTarget.releasePointerCapture(e.pointerId);
                          }
                        }}
                        className="relative w-20 h-40 mx-auto rounded-xl bg-[#040A16] border border-cyan-500/40 overflow-hidden select-none touch-none cursor-ns-resize"
                      >
                        <div
                          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cyan-600 via-cyan-500 to-sky-300 transition-all duration-100"
                          style={{ height: `${evaluation.fuelPct}%` }}
                        >
                          <div className="h-1 w-full bg-white/60" />
                        </div>
                        <div className="absolute inset-x-0 bottom-1.5 text-center text-[11px] font-mono-tech font-bold text-white drop-shadow pointer-events-none">
                          {fuelKg} kg
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-slate-300">Fuel Load</span>
                            <span className="font-mono-tech text-xl font-bold text-cyan-300 tabular-nums">
                              {fuelKg} <span className="text-xs text-slate-400 font-normal">kg</span>
                            </span>
                          </div>
                          <input
                            type="range"
                            min={LUNAR_MIN_FUEL_KG}
                            max={LUNAR_MAX_FUEL_KG}
                            value={fuelKg}
                            onChange={(e) => handleFuelChange(Number(e.target.value))}
                            className="w-full accent-cyan-400 cursor-pointer"
                          />
                          <div className="grid grid-cols-4 gap-1.5">
                            {[-5, -1, 1, 5].map((delta) => (
                              <button
                                key={delta}
                                type="button"
                                onClick={() => handleFuelChange(fuelKg + delta)}
                                className="py-1 rounded-lg bg-[#040A16] hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 font-mono-tech text-xs font-bold text-slate-200 cursor-pointer"
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-slate-300">Burn Angle</span>
                            <span className="font-mono-tech text-xl font-bold text-amber-300 tabular-nums">
                              {burnAngleDeg > 0 ? `+${burnAngleDeg}` : burnAngleDeg}°
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-15}
                            max={15}
                            value={burnAngleDeg}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setBurnAngleDeg(v);
                              SFX.sliderTick((v + 15) / 30);
                            }}
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setBurnAngleDeg((v) => Math.max(-15, v - 1))}
                              className="py-1 rounded-lg bg-[#040A16] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 font-mono-tech text-xs font-bold text-slate-200 cursor-pointer"
                            >
                              -1°
                            </button>
                            <button
                              type="button"
                              onClick={() => setBurnAngleDeg(0)}
                              className="py-1 rounded-lg bg-[#040A16] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 font-mono-tech text-xs font-bold text-slate-300 cursor-pointer"
                            >
                              0°
                            </button>
                            <button
                              type="button"
                              onClick={() => setBurnAngleDeg((v) => Math.min(15, v + 1))}
                              className="py-1 rounded-lg bg-[#040A16] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 font-mono-tech text-xs font-bold text-slate-200 cursor-pointer"
                            >
                              +1°
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center font-mono-tech tabular-nums">
                      <div>
                        <div className="text-[11px] text-slate-400">Mass</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {evaluation.totalMassKg} / {evaluation.rocketLiftLimitKg} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Dry Core</div>
                        <div className="text-sm font-bold text-slate-300 mt-0.5">100 kg</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Delta-V</div>
                        <div className="text-sm font-bold text-cyan-400 mt-0.5">{deltaVKmS} km/s</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartStage1}
                    className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040A16] font-extrabold text-sm tracking-wide uppercase transition cursor-pointer"
                  >
                    Launch Stage 1 ▶
                  </button>
                </>
              )}

              {/* STAGE 1 LIVE THROTTLE & FUEL CONSOLE (ACTIVE DURING ASCENT!) */}
              {(phase === 'stage1_ascent' || phase === 'stage1_clear') && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono-tech uppercase text-cyan-400 font-bold">
                        Stage 1 Fuel Telemetry
                      </span>
                      <span className="text-xs font-mono-tech text-slate-400 tabular-nums">
                        {Math.round(altitudeKm)} / 160 km
                      </span>
                    </div>

                    {/* Live Fuel Drain Tank */}
                    <div className="p-4 rounded-xl bg-[#040A16] border border-slate-800 space-y-3">
                      <div className="flex items-baseline justify-between font-mono-tech tabular-nums">
                        <span className="text-xs text-slate-400">Tank Remaining</span>
                        <span className="text-2xl font-bold text-cyan-300">
                          {ascentFuelLeft.toFixed(1)} kg
                        </span>
                      </div>
                      <div className="h-3.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-all duration-100"
                          style={{
                            width: `${Math.min(100, Math.round((ascentFuelLeft / Math.max(1, fuelKg)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Interactive Engine Throttle Control */}
                    <div className="p-4 rounded-xl bg-[#040A16] border border-slate-800 space-y-3">
                      <div className="flex items-baseline justify-between font-mono-tech tabular-nums">
                        <span className="text-xs text-slate-300 font-semibold">Engine Throttle</span>
                        <span
                          className={`text-lg font-bold ${
                            throttlePct > 95 && inMaxQ ? 'text-rose-400' : 'text-amber-300'
                          }`}
                        >
                          {throttlePct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={115}
                        value={throttlePct}
                        disabled={phase === 'stage1_clear'}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          throttlePctRef.current = v;
                          setThrottlePct(v);
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: 'CUT', val: 0 },
                          { label: 'ECO', val: 55 },
                          { label: 'NOM', val: 85 },
                          { label: 'MAX', val: 115 },
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            disabled={phase === 'stage1_clear'}
                            onClick={() => {
                              SFX.select();
                              throttlePctRef.current = p.val;
                              setThrottlePct(p.val);
                            }}
                            className={`py-2 rounded-lg font-mono-tech text-xs font-bold border cursor-pointer ${
                              Math.abs(throttlePct - p.val) <= 10
                                ? 'bg-amber-400 text-[#040A16] border-amber-300'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Max-Q & Ascent Gauges */}
                    <div className="grid grid-cols-2 gap-2.5 font-mono-tech tabular-nums">
                      <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                        <div className="text-[11px] text-slate-400">Velocity</div>
                        <div className="text-base font-bold text-white mt-0.5">{ascentVelKmS} km/s</div>
                      </div>
                      <div
                        className={`p-3 rounded-xl border ${
                          inMaxQ
                            ? 'bg-amber-500/15 border-amber-400/60'
                            : 'bg-[#040A16] border-slate-800'
                        }`}
                      >
                        <div className="text-[11px] text-slate-400">Aero Stress</div>
                        <div
                          className={`text-base font-bold mt-0.5 ${
                            inMaxQ ? 'text-amber-300' : 'text-emerald-400'
                          }`}
                        >
                          {inMaxQ ? 'MAX-Q' : 'NOMINAL'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      stopAudio();
                      setFailure(null);
                      setPhase('stage1_prep');
                    }}
                    className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wide cursor-pointer"
                  >
                    Abort &amp; Adjust Fuel
                  </button>
                </>
              )}

              {/* STAGE 2 LIVE PROBE FUEL & ENGINE CONTROLS */}
              {phase === 'stage2_flight' && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono-tech uppercase text-cyan-400 font-bold">
                        Stage 2 · Deep Space Fuel
                      </span>
                      <span
                        className={`text-xs font-mono-tech font-bold ${
                          slingshotLocked ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {slingshotLocked ? 'SLINGSHOT LOCKED' : 'APPROACH'}
                      </span>
                    </div>

                    {/* Live Probe Fuel Tank */}
                    <div className="p-4 rounded-xl bg-[#040A16] border border-slate-800 space-y-2.5">
                      <div className="flex items-baseline justify-between font-mono-tech tabular-nums">
                        <span className="text-xs text-slate-400">Probe Propellant</span>
                        <span
                          className={`text-2xl font-bold ${
                            stage2FuelLeft <= 4 ? 'text-rose-400' : 'text-cyan-300'
                          }`}
                        >
                          {stage2FuelLeft.toFixed(1)} kg
                        </span>
                      </div>
                      <div className="h-3.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            stage2FuelLeft <= 4
                              ? 'bg-rose-500'
                              : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((stage2FuelLeft / Math.max(1, stage2StartingFuel)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Burn Mixture / Power Mode Selector */}
                    <div className="p-4 rounded-xl bg-[#040A16] border border-slate-800 space-y-2.5">
                      <div className="text-xs text-slate-300 font-semibold">Fuel Flow Rate</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { id: 'eco', label: 'ECO 65%' },
                            { id: 'nom', label: 'NOM 100%' },
                            { id: 'max', label: 'MAX 145%' },
                          ] as const
                        ).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              SFX.select();
                              throttleModeRef.current = m.id;
                              setThrottleMode(m.id);
                            }}
                            className={`py-2 rounded-lg font-mono-tech text-xs font-bold border cursor-pointer ${
                              throttleMode === m.id
                                ? 'bg-cyan-500 text-[#040A16] border-cyan-300'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Space Flight Telemetry */}
                    <div className="grid grid-cols-2 gap-2.5 font-mono-tech tabular-nums">
                      <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                        <div className="text-[11px] text-slate-400">Speed</div>
                        <div className="text-base font-bold text-white mt-0.5">
                          {stage2SpeedKmS.toFixed(2)} km/s
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                        <div className="text-[11px] text-slate-400">Moon Dist</div>
                        <div className="text-base font-bold text-cyan-300 mt-0.5">{moonDistMm} Mm</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      setFailure(null);
                      setPhase('stage1_prep');
                    }}
                    className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wide cursor-pointer"
                  >
                    Reconfigure Stage 1 Fuel
                  </button>
                </>
              )}
            </section>

            {/* RIGHT INTERACTIVE STAGE CANVAS & TACTILE FLIGHT CONTROLS */}
            <section className="rounded-2xl bg-[#081326] border border-slate-800 p-4 flex flex-col gap-3 min-h-[480px]">
              {/* Top Telemetry Ribbon */}
              <div className="flex items-center justify-between gap-4 text-xs font-mono-tech tabular-nums px-1">
                <span className="font-semibold text-white">
                  {phase === 'stage1_prep'
                    ? 'Pad 39X · Ready for Fuel Check'
                    : phase === 'stage1_ascent'
                    ? `Stage 1 Ascent · ${Math.round(altitudeKm)} km`
                    : phase === 'stage1_clear'
                    ? 'Earth Parking Orbit Established'
                    : slingshotLocked
                    ? 'Stage 2 · Thread Exit Gate'
                    : 'Stage 2 · Cislunar Trajectory'}
                </span>
                <span className="text-cyan-400 font-semibold">
                  {isStage2
                    ? `Fuel ${stage2FuelLeft.toFixed(1)} kg · Δv ${deltaVKmS} km/s`
                    : `Fuel ${fuelKg} kg · Angle ${burnAngleDeg > 0 ? `+${burnAngleDeg}` : burnAngleDeg}°`}
                </span>
              </div>

              {/* Main Animated Viewport */}
              <div className="relative flex-1 min-h-[340px]">
                {isStage2 ? (
                  <Stage2CislunarCanvas
                    shipRef={shipRef}
                    burning={isBurningUI}
                    braking={isBrakingUI}
                    throttleMode={throttleMode}
                  />
                ) : (
                  <Stage1AscentCanvas
                    phase={phase}
                    altitudeKm={altitudeKm}
                    throttlePct={throttlePct}
                    burnAngleDeg={burnAngleDeg}
                    inMaxQ={inMaxQ}
                    stageSepDone={stageSepDone}
                    stageSepReady={stageSepReady}
                    failure={failure}
                  />
                )}

                {/* Stage 1 Booster Separation Button */}
                {phase === 'stage1_ascent' && stageSepReady && !stageSepDone && !failure && (
                  <div className="absolute bottom-5 inset-x-0 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        stageSepDoneRef.current = true;
                        setStageSepDone(true);
                        SFX.snapCorrect();
                      }}
                      className="px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#040A16] font-extrabold text-sm uppercase tracking-wider shadow-lg cursor-pointer animate-pulse"
                    >
                      Trigger Stage Sep [Space]
                    </button>
                  </div>
                )}

                {/* Stage 1 -> Stage 2 Transition Card */}
                {phase === 'stage1_clear' && (
                  <div className="absolute inset-0 bg-[#040A16]/75 backdrop-blur-xs rounded-2xl flex items-center justify-center p-4">
                    <div className="max-w-sm w-full rounded-2xl bg-[#081326] border border-cyan-500/60 p-6 text-center space-y-4">
                      <div className="text-xs font-mono-tech font-bold uppercase text-cyan-400">
                        Stage 1 Complete
                      </div>
                      <h3 className="font-display text-xl font-bold text-white">
                        Earth Orbit Achieved
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5 font-mono-tech tabular-nums text-xs">
                        <div className="p-2.5 rounded-lg bg-[#040A16] border border-slate-800">
                          <div className="text-slate-400">Stage 2 Fuel</div>
                          <div className="text-base font-bold text-cyan-300 mt-0.5">
                            {stage2StartingFuel} kg
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#040A16] border border-slate-800">
                          <div className="text-slate-400">Entry Angle</div>
                          <div className="text-base font-bold text-amber-300 mt-0.5">
                            {burnAngleDeg > 0 ? `+${burnAngleDeg}` : burnAngleDeg}°
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartStage2(stage2StartingFuel)}
                        className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040A16] font-extrabold text-sm uppercase tracking-wide cursor-pointer"
                      >
                        Enter Stage 2: Cislunar Flight ▶
                      </button>
                    </div>
                  </div>
                )}

                {/* Failure Overlay */}
                {failure && (
                  <div className="absolute inset-0 bg-[#040A16]/80 backdrop-blur-xs rounded-2xl flex items-center justify-center p-4">
                    <div className="max-w-sm w-full rounded-2xl bg-[#081326] border border-rose-500/60 p-6 text-center space-y-4">
                      <div className="text-xs font-mono-tech font-bold uppercase text-rose-400">
                        ✖ {failure.code.replace(/_/g, ' ')}
                      </div>
                      <h3 className="font-display text-lg font-bold text-white">{failure.title}</h3>
                      <p className="font-mono-tech text-xs text-slate-300 tabular-nums">
                        {failure.metric}
                      </p>
                      <div className="flex flex-col gap-2">
                        {failure.stage === 2 && (
                          <button
                            type="button"
                            onClick={() => handleStartStage2(stage2StartingFuel)}
                            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040A16] font-extrabold text-xs uppercase tracking-wide cursor-pointer"
                          >
                            Retry Stage 2 Flight
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            SFX.click();
                            setFailure(null);
                            setPhase('stage1_prep');
                          }}
                          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#040A16] font-extrabold text-xs uppercase tracking-wide cursor-pointer"
                        >
                          Adjust Stage 1 Fuel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {completionError && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200 flex items-center justify-between">
                    <span>{completionError}</span>
                    <button
                      type="button"
                      onClick={() => {
                        submittingRef.current = false;
                        setCompletionError(null);
                        setFailure(null);
                        setPhase('stage1_prep');
                      }}
                      className="px-3 py-1 rounded bg-rose-500 text-white font-bold cursor-pointer"
                    >
                      Stage 1
                    </button>
                  </div>
                )}
              </div>

              {/* STAGE 2 TACTILE COCKPIT FLIGHT CONTROLS BAR */}
              {isStage2 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <button
                    type="button"
                    onPointerDown={() => {
                      controlsRef.current.left = true;
                    }}
                    onPointerUp={() => {
                      controlsRef.current.left = false;
                    }}
                    onPointerLeave={() => {
                      controlsRef.current.left = false;
                    }}
                    className="py-3 rounded-xl bg-[#040A16] hover:bg-cyan-500/20 active:bg-cyan-500 active:text-[#040A16] border border-slate-700 font-mono-tech text-xs font-bold text-slate-200 cursor-pointer select-none"
                  >
                    ↺ Steer Left (A)
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => {
                      controlsRef.current.right = true;
                    }}
                    onPointerUp={() => {
                      controlsRef.current.right = false;
                    }}
                    onPointerLeave={() => {
                      controlsRef.current.right = false;
                    }}
                    className="py-3 rounded-xl bg-[#040A16] hover:bg-cyan-500/20 active:bg-cyan-500 active:text-[#040A16] border border-slate-700 font-mono-tech text-xs font-bold text-slate-200 cursor-pointer select-none"
                  >
                    Steer Right (D) ↻
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => {
                      controlsRef.current.burn = true;
                      setIsBurningUI(true);
                    }}
                    onPointerUp={() => {
                      controlsRef.current.burn = false;
                      setIsBurningUI(false);
                    }}
                    onPointerLeave={() => {
                      controlsRef.current.burn = false;
                      setIsBurningUI(false);
                    }}
                    className={`py-3 rounded-xl border font-mono-tech text-xs font-extrabold cursor-pointer select-none ${
                      isBurningUI
                        ? 'bg-cyan-400 text-[#040A16] border-cyan-300'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-400/60'
                    }`}
                  >
                    🔥 Burn Fuel (W)
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => {
                      controlsRef.current.brake = true;
                      setIsBrakingUI(true);
                    }}
                    onPointerUp={() => {
                      controlsRef.current.brake = false;
                      setIsBrakingUI(false);
                    }}
                    onPointerLeave={() => {
                      controlsRef.current.brake = false;
                      setIsBrakingUI(false);
                    }}
                    className={`py-3 rounded-xl border font-mono-tech text-xs font-extrabold cursor-pointer select-none ${
                      isBrakingUI
                        ? 'bg-amber-400 text-[#040A16] border-amber-300'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-400/50'
                    }`}
                  >
                    ● Retro Brake (S)
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* VICTORY SUMMARY */}
        {phase === 'victory' && (
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#081326] border border-emerald-500/50 p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <div className="text-xs font-mono-tech font-semibold text-emerald-400">
                  Level 05 Complete
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-black text-white">
                  Lunar Flyby Achieved
                </h2>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <LunarFlybyIllustrationSVG className="w-36 h-24 hidden sm:block" />
                <PropulsionEngineerBadgeSVG size={108} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono-tech tabular-nums">
              <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Launch Fuel</div>
                <div className="text-lg font-bold text-cyan-400 mt-0.5">{fuelKg} kg</div>
              </div>
              <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Mass</div>
                <div className="text-lg font-bold text-white mt-0.5">{evaluation.totalMassKg} kg</div>
              </div>
              <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Fuel Remaining</div>
                <div className="text-lg font-bold text-amber-300 mt-0.5">
                  {stage2FuelLeft.toFixed(1)} kg
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#040A16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Reward</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5">
                  {rewardResult?.alreadyRewarded || alreadyCompleted
                    ? 'Claimed ✓'
                    : `+★ ${(rewardResult?.rewardAwarded ?? 1000).toLocaleString()} SC`}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onContinueToLevel6();
                }}
                className="flex-1 py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#040A16] font-extrabold text-sm uppercase tracking-wide cursor-pointer"
              >
                Continue to Level 6 ▶
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onExit();
                }}
                className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
              >
                Space Center
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onBackToAcademy();
                }}
                className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase cursor-pointer"
              >
                Level Map
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
