import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SFX } from '../utils/sfx';
import lunarSouthPoleBannerImg from '../assets/images/lunar_south_pole_banner_1794826491936.jpg';

interface LunarFlightAndLandingSimProps {
  initialOrbitLocked: boolean;
  initialLanded: boolean;
  navPrecisionPct: number;
  fuelReserveBonusPct: number;
  onOrbitLocked: () => void;
  onTouchdownConfirmed: () => void;
  onProceedToExplore: () => void;
}

type SimMode = 'space_flight' | 'lunar_descent' | 'landed';

interface SpaceShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // radians, 0 = pointing right (+X)
  fuel: number;
  gateCleared: boolean;
  captureTimer: number; // seconds inside lunar orbit zone at safe speed
  hitCooldown: number;
  statusMsg: string;
  failedReason: string | null;
}

interface LanderState {
  x: number;
  y: number; // center of lander body; legs touch y + 18
  vx: number;
  vy: number;
  tiltDeg: number; // negative = tilted left (pushes left), positive = tilted right
  angularVel: number;
  throttle: number; // 0..100
  fuel: number;
  dustParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>;
  crashReason: string | null;
}

interface HudReadout {
  // Space flight telemetry
  distKm: number;
  speedKmS: number;
  fuelPct: number;
  inZone: boolean;
  gateCleared: boolean;
  capturePct: number;
  spaceStatus: string;
  spaceFail: string | null;
  // Lunar descent telemetry
  altM: number;
  vSpdMs: number;
  hSpdMs: number;
  tiltDeg: number;
  throttlePct: number;
  overPad: boolean;
  crashReason: string | null;
}

const SPACE_W = 900;
const SPACE_H = 420;
const MOON_X = 775;
const MOON_Y = 210;
const MOON_R = 38;
const CAPTURE_INNER = 46;
const CAPTURE_OUTER = 138;
const GATE_X = 415;
const GATE_Y = 205;
const GATE_R = 48;
const CAPTURE_SPEED_LIMIT = 92; // displays as ~2.30 km/s

const DESCENT_W = 900;
const DESCENT_H = 440;
const PAD_X1 = 365;
const PAD_X2 = 625;
const PAD_Y = 392;
const SAFE_V_SPD_MS = 5.5;
const SAFE_H_SPD_MS = 4.5;
const SAFE_TILT_DEG = 16;

function terrainHeightAt(x: number): number {
  if (x >= PAD_X1 && x <= PAD_X2) return PAD_Y;
  if (x < PAD_X1) {
    const dist = PAD_X1 - x;
    return PAD_Y - 10 - Math.sin(x * 0.045) * 12 - Math.min(22, dist * 0.07);
  }
  const dist = x - PAD_X2;
  return PAD_Y - 8 - Math.cos(x * 0.05) * 12 - Math.min(24, dist * 0.07);
}

function createInitialSpaceShip(bonusFuel: number): SpaceShipState {
  return {
    x: 112,
    y: 222,
    vx: 38,
    vy: -2,
    angle: -0.04,
    fuel: Math.min(100, 92 + Math.round(bonusFuel * 0.4)),
    gateCleared: false,
    captureTimer: 0,
    hitCooldown: 0,
    statusMsg: 'Fly toward the Moon! Enter the dashed Orbit Ring and hold S / Brake to capture.',
    failedReason: null,
  };
}

function createInitialLander(bonusFuel: number): LanderState {
  return {
    x: 220,
    y: 82,
    vx: 20, // gentle orbital coast rightward toward the pad
    vy: 3,
    tiltDeg: -10,
    angularVel: 0,
    throttle: 42,
    fuel: Math.min(100, 94 + Math.round(bonusFuel * 0.35)),
    dustParticles: [],
    crashReason: null,
  };
}

export const LunarFlightAndLandingSim: React.FC<LunarFlightAndLandingSimProps> = ({
  initialOrbitLocked,
  initialLanded,
  navPrecisionPct,
  fuelReserveBonusPct,
  onOrbitLocked,
  onTouchdownConfirmed,
  onProceedToExplore,
}) => {
  const [mode, setMode] = useState<SimMode>(() =>
    initialLanded ? 'landed' : initialOrbitLocked ? 'lunar_descent' : 'space_flight'
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spaceRef = useRef<SpaceShipState>(createInitialSpaceShip(fuelReserveBonusPct));
  const landerRef = useRef<LanderState>(createInitialLander(fuelReserveBonusPct));
  const keysRef = useRef<Record<string, boolean>>({});
  const pointerBtnRef = useRef<{
    left: boolean;
    right: boolean;
    thrust: boolean;
    retro: boolean;
    throttleUp: boolean;
    throttleDown: boolean;
  }>({
    left: false,
    right: false,
    thrust: false,
    retro: false,
    throttleUp: false,
    throttleDown: false,
  });

  const orbitLockedFiredRef = useRef(initialOrbitLocked);
  const landedFiredRef = useRef(initialLanded);
  const radarBeepedRef = useRef(false);

  const [hud, setHud] = useState<HudReadout>({
    distKm: 384400,
    speedKmS: 1.1,
    fuelPct: 90,
    inZone: false,
    gateCleared: false,
    capturePct: 0,
    spaceStatus: 'Fly through the Mid-Course Gate, then brake inside the Moon Orbit Ring.',
    spaceFail: null,
    altM: 12000,
    vSpdMs: 0.9,
    hSpdMs: 5.1,
    tiltDeg: -22,
    throttlePct: 38,
    overPad: false,
    crashReason: null,
  });

  const resetSpaceFlight = useCallback(() => {
    SFX.click();
    spaceRef.current = createInitialSpaceShip(fuelReserveBonusPct);
    orbitLockedFiredRef.current = false;
    setMode('space_flight');
  }, [fuelReserveBonusPct]);

  const resetLunarDescent = useCallback(() => {
    SFX.click();
    landerRef.current = createInitialLander(fuelReserveBonusPct);
    landedFiredRef.current = false;
    radarBeepedRef.current = false;
    setMode('lunar_descent');
  }, [fuelReserveBonusPct]);

  const announcedSimModeRef = useRef<SimMode | null>(null);
  useEffect(() => {
    if (announcedSimModeRef.current === mode) return;
    announcedSimModeRef.current = mode;
    if (mode === 'lunar_descent') {
      SFX.speakCue(
        'Lunar orbit locked! Control thruster tilt and brake gently to land upright on the Shackleton Flat Pad.'
      );
    }
  }, [mode]);

  // Keyboard listener (WASD + Arrows + Space)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Main 60fps flight & descent physics + canvas render loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudTick = 0;

    const stars = Array.from({ length: 78 }, (_, i) => ({
      x: (i * 137.5) % SPACE_W,
      y: (i * 73.1) % DESCENT_H,
      r: (i % 3) * 0.65 + 0.7,
      a: 0.35 + ((i * 19) % 60) / 100,
    }));

    const hazards = [
      { cx: 345, cy: 335, rx: 38, ry: 18, phase: 0.2 },
      { cx: 545, cy: 88, rx: 36, ry: 18, phase: 1.8 },
    ];

    const stepAndDraw = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const keys = keysRef.current;
      const ptr = pointerBtnRef.current;

      const turnLeft = keys['ArrowLeft'] || keys['KeyA'] || ptr.left;
      const turnRight = keys['ArrowRight'] || keys['KeyD'] || ptr.right;
      const thrustFwd = keys['ArrowUp'] || keys['KeyW'] || keys['Space'] || ptr.thrust;
      const thrustBack = keys['ArrowDown'] || keys['KeyS'] || ptr.retro;

      if (mode === 'space_flight' && ctx && canvas) {
        const s = spaceRef.current;
        const speed = Math.hypot(s.vx, s.vy);
        const distToMoon = Math.hypot(s.x - MOON_X, s.y - MOON_Y);
        const inCaptureZone = distToMoon >= CAPTURE_INNER && distToMoon <= CAPTURE_OUTER;

        if (!s.failedReason && !orbitLockedFiredRef.current) {
          // Attitude rotation
          const rotSpeed = navPrecisionPct >= 85 ? 2.4 : 2.8;
          if (turnLeft) s.angle -= rotSpeed * dt;
          if (turnRight) s.angle += rotSpeed * dt;

          // Main Burn along nose OR strong Retrograde Brake (real orbital braking!)
          if (thrustFwd && s.fuel > 0) {
            const accel = 95;
            s.vx += Math.cos(s.angle) * accel * dt;
            s.vy += Math.sin(s.angle) * accel * dt;
            s.fuel = Math.max(0, s.fuel - 4.5 * dt);
          }
          if (thrustBack && s.fuel > 0 && speed > 1.2) {
            const ux = s.vx / speed;
            const uy = s.vy / speed;
            const brake = 215;
            s.vx = Math.abs(s.vx) < brake * dt ? 0 : s.vx - ux * brake * dt;
            s.vy = Math.abs(s.vy) < brake * dt ? 0 : s.vy - uy * brake * dt;
            s.angle = Math.atan2(-uy, -ux);
            s.fuel = Math.max(0, s.fuel - 4.0 * dt);
          }

          // Gentle Lunar Gravity Well curve (smooth, never drags straight into crash)
          if (distToMoon < 240 && distToMoon > CAPTURE_INNER + 8) {
            const gPull = 38000 / Math.max(5200, distToMoon * distToMoon);
            s.vx += ((MOON_X - s.x) / distToMoon) * gPull * dt;
            s.vy += ((MOON_Y - s.y) / distToMoon) * gPull * dt;
          }

          // Soft space-corridor stabilization & safety buffer near Moon surface when braking
          s.vx *= 1 - 0.08 * dt;
          s.vy *= 1 - 0.08 * dt;
          if (distToMoon <= MOON_R + 18 && thrustBack) {
            // Retrograde firing near surface acts as orbital periapsis cushion
            const nx = (s.x - MOON_X) / Math.max(1, distToMoon);
            const ny = (s.y - MOON_Y) / Math.max(1, distToMoon);
            s.vx += nx * 85 * dt;
            s.vy += ny * 85 * dt;
          }

          s.x += s.vx * dt;
          s.y += s.vy * dt;

          // Gently keep within top/bottom navigation lane instead of unfair edge crash
          if (s.y < 24) {
            s.y = 24;
            s.vy = Math.abs(s.vy) * 0.4;
          } else if (s.y > SPACE_H - 24) {
            s.y = SPACE_H - 24;
            s.vy = -Math.abs(s.vy) * 0.4;
          }
          if (s.x < 24) {
            s.x = 24;
            s.vx = Math.max(10, Math.abs(s.vx) * 0.5);
          }

          if (s.hitCooldown > 0) s.hitCooldown = Math.max(0, s.hitCooldown - dt);

          // Mid-Course Checkpoint Gate (optional trajectory boost)
          if (!s.gateCleared && Math.hypot(s.x - GATE_X, s.y - GATE_Y) <= GATE_R + 16) {
            s.gateCleared = true;
            SFX.snapCorrect();
            s.statusMsg = 'MC-1 Gate cleared! Enter the Moon dashed ring and hold S / Brake.';
          }

          // Gentle micrometeoroid belt nudge (well off center lane)
          hazards.forEach((h, idx) => {
            const wobbleY = h.cy + Math.sin(now * 0.0014 + h.phase) * 12;
            const d = Math.hypot((s.x - h.cx) / h.rx, (s.y - wobbleY) / h.ry);
            if (d < 0.78 && s.hitCooldown <= 0) {
              s.hitCooldown = 1.4;
              s.fuel = Math.max(0, s.fuel - 4);
              s.vx *= 0.85;
              s.vy += idx === 0 ? -16 : 16;
              SFX.snapWrong();
              s.statusMsg = 'Skirted debris belt! Keep steering toward the Moon Capture Ring.';
            }
          });

          // Fail checks (only hard impact on Moon surface or flying past Moon edge)
          if (distToMoon <= MOON_R + 4) {
            s.failedReason = 'Flew straight into the Moon! Hold S / Brake as soon as you enter the dashed ring.';
            SFX.powerFailure();
          } else if (s.x > SPACE_W + 35) {
            s.failedReason = 'Flew past the Moon! Hold S / Brake earlier inside the dashed ring.';
            SFX.powerFailure();
          }

          // Orbit capture zone check (fast, responsive 0.42s lock!)
          if (inCaptureZone) {
            if (speed <= CAPTURE_SPEED_LIMIT) {
              s.captureTimer = Math.min(0.42, s.captureTimer + dt);
              s.statusMsg = 'Capturing Polar Orbit — Hold steady!';
              if (s.captureTimer >= 0.42 && !orbitLockedFiredRef.current) {
                orbitLockedFiredRef.current = true;
                SFX.sunlightRestored();
                onOrbitLocked();
                window.setTimeout(() => {
                  landerRef.current = createInitialLander(fuelReserveBonusPct);
                  setMode('lunar_descent');
                }, 480);
              }
            } else {
              s.captureTimer = Math.max(0, s.captureTimer - dt * 0.8);
              s.statusMsg = 'Inside Capture Ring! Hold S / 🛑 Brake to lock Moon Orbit!';
            }
          } else {
            s.captureTimer = Math.max(0, s.captureTimer - dt);
            if (distToMoon < 220) {
              s.statusMsg = 'Approaching Moon — get inside the dashed ring & hold S / 🛑 Brake!';
            }
          }
        }

        // === DRAW DEEP-SPACE NAVIGATION VIEW ===
        ctx.clearRect(0, 0, SPACE_W, SPACE_H);
        const bgGrad = ctx.createLinearGradient(0, 0, SPACE_W, SPACE_H);
        bgGrad.addColorStop(0, '#020714');
        bgGrad.addColorStop(0.55, '#040e24');
        bgGrad.addColorStop(1, '#07142e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, SPACE_W, SPACE_H);

        stars.forEach((st) => {
          ctx.fillStyle = `rgba(226, 232, 240, ${st.a})`;
          ctx.beginPath();
          ctx.arc(st.x, st.y % SPACE_H, st.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Earth Crescent (left)
        const earthGrad = ctx.createRadialGradient(34, 210, 8, 52, 224, 52);
        earthGrad.addColorStop(0, '#38bdf8');
        earthGrad.addColorStop(0.7, '#0284c7');
        earthGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = earthGrad;
        ctx.beginPath();
        ctx.arc(54, 224, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(79, 227, 212, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.ellipse(44, 214, 14, 9, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7dd3fc';
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EARTH LEO', 54, 282);

        // Planned Hohmann transfer reference curve (faint dotted guide)
        ctx.save();
        ctx.setLineDash([5, 7]);
        ctx.strokeStyle = 'rgba(79, 227, 212, 0.22)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(96, 224);
        ctx.quadraticCurveTo(GATE_X, GATE_Y - 12, MOON_X - 78, MOON_Y);
        ctx.stroke();
        ctx.restore();

        // Mid-Course Correction Gate
        ctx.save();
        ctx.beginPath();
        ctx.arc(GATE_X, GATE_Y, GATE_R, 0, Math.PI * 2);
        ctx.strokeStyle = s.gateCleared ? '#34d399' : '#38bdf8';
        ctx.lineWidth = s.gateCleared ? 3 : 2;
        ctx.setLineDash(s.gateCleared ? [] : [6, 5]);
        ctx.stroke();
        ctx.fillStyle = s.gateCleared ? 'rgba(52,211,153,0.12)' : 'rgba(56,189,248,0.08)';
        ctx.fill();
        ctx.fillStyle = s.gateCleared ? '#6ee7b7' : '#7dd3fc';
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.gateCleared ? 'MC-1 LOCKED ✓' : 'MC-1 WINDOW', GATE_X, GATE_Y - GATE_R - 8);
        ctx.restore();

        // Debris / Micrometeoroid Clusters
        hazards.forEach((h) => {
          const wy = h.cy + Math.sin(now * 0.0014 + h.phase) * 18;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(h.cx, wy, h.rx, h.ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.14)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(251, 113, 133, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          for (let r = 0; r < 6; r++) {
            const rx = h.cx + Math.cos(r * 1.1 + now * 0.001) * (h.rx * 0.55);
            const ry = wy + Math.sin(r * 1.5 + now * 0.0012) * (h.ry * 0.55);
            ctx.fillStyle = '#fda4af';
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5 + (r % 2), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#fda4af';
          ctx.font = '700 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DEBRIS BELT', h.cx, wy + h.ry + 12);
          ctx.restore();
        });

        // Lunar Capture Zone Ring
        const inZoneNow = distToMoon >= CAPTURE_INNER && distToMoon <= CAPTURE_OUTER;
        const speedOk = speed <= CAPTURE_SPEED_LIMIT;
        ctx.save();
        ctx.beginPath();
        ctx.arc(MOON_X, MOON_Y, CAPTURE_OUTER, 0, Math.PI * 2);
        ctx.strokeStyle = orbitLockedFiredRef.current
          ? '#34d399'
          : inZoneNow && speedOk
          ? '#4fe3d4'
          : inZoneNow
          ? '#fbbf24'
          : 'rgba(79, 227, 212, 0.5)';
        ctx.lineWidth = inZoneNow ? 2.8 : 1.8;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.fillStyle = inZoneNow && speedOk ? 'rgba(79,227,212,0.12)' : 'rgba(56,189,248,0.05)';
        ctx.fill();
        ctx.restore();

        // Moon Sphere
        const moonGrad = ctx.createRadialGradient(MOON_X - 12, MOON_Y - 12, 6, MOON_X, MOON_Y, MOON_R);
        moonGrad.addColorStop(0, '#f1f5f9');
        moonGrad.addColorStop(0.7, '#94a3b8');
        moonGrad.addColorStop(1, '#334155');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(MOON_X, MOON_Y, MOON_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(MOON_X - 12, MOON_Y - 8, 7, 0, Math.PI * 2);
        ctx.arc(MOON_X + 14, MOON_Y + 11, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MOON CAPTURE RING', MOON_X, MOON_Y + CAPTURE_OUTER + 16);

        // Velocity Vector Prediction Line (ahead of ship)
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.vx * 0.9, s.y + s.vy * 0.9);
        ctx.stroke();
        ctx.restore();

        // Draw Player Spacecraft
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        if ((thrustFwd || thrustBack) && s.fuel > 0) {
          const flameLen = 14 + Math.random() * 10;
          ctx.fillStyle = thrustBack ? '#fbbf24' : '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(-12, -4);
          ctx.lineTo(-12 - flameLen, 0);
          ctx.lineTo(-12, 4);
          ctx.closePath();
          ctx.fill();
        }
        // Solar wings
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(-5, -16, 8, 9);
        ctx.fillRect(-5, 7, 8, 9);
        // Gold foil bus + dish nose
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-10, -7, 18, 14, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4fe3d4';
        ctx.beginPath();
        ctx.moveTo(8, -6);
        ctx.lineTo(16, 0);
        ctx.lineTo(8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (hudTick % 4 === 0) {
          const km = Math.max(0, Math.round(((distToMoon - MOON_R) / (MOON_X - 96)) * 384400));
          setHud((prev) => ({
            ...prev,
            distKm: km,
            speedKmS: Number((speed * 0.025).toFixed(2)),
            fuelPct: Math.round(s.fuel),
            inZone: inZoneNow,
            gateCleared: s.gateCleared,
            capturePct: Math.round((s.captureTimer / 0.42) * 100),
            spaceStatus: s.statusMsg,
            spaceFail: s.failedReason,
          }));
        }
      } else if ((mode === 'lunar_descent' || mode === 'landed') && ctx && canvas) {
        const l = landerRef.current;

        if (mode === 'lunar_descent' && !l.crashReason && !landedFiredRef.current) {
          // Throttle control (up/down or preset)
          const thUp = thrustFwd || ptr.throttleUp;
          const thDown = thrustBack || ptr.throttleDown;
          if (thUp) l.throttle = Math.min(100, l.throttle + 58 * dt);
          if (thDown) l.throttle = Math.max(0, l.throttle - 62 * dt);

          // Pitch / Tilt steering + direct lateral RCS assist
          const pitchRate = navPrecisionPct >= 85 ? 46 : 54;
          if (turnLeft) {
            l.tiltDeg = Math.max(-30, l.tiltDeg - pitchRate * dt);
            l.vx -= 26 * dt;
          }
          if (turnRight) {
            l.tiltDeg = Math.min(30, l.tiltDeg + pitchRate * dt);
            l.vx += 26 * dt;
          }

          // Smooth Apollo SAS auto-leveling when turn keys released
          if (!turnLeft && !turnRight) {
            l.tiltDeg *= Math.max(0, 1 - 2.3 * dt);
          }

          // Real Rocket Descent Physics (Lunar gravity = 24 px/s²; 42% throttle balances gravity)
          const GRAVITY = 24;
          const MAX_THRUST = 57;
          const activeThrottle = l.fuel > 0 ? l.throttle / 100 : 0;
          const thrustMag = activeThrottle * MAX_THRUST;
          const rad = (l.tiltDeg * Math.PI) / 180;

          const ax = Math.sin(rad) * thrustMag;
          const ay = -Math.cos(rad) * thrustMag + GRAVITY;

          l.vx += ax * dt;
          l.vx *= Math.max(0, 1 - 0.18 * dt); // subtle RCS drift damping
          l.vy += ay * dt;
          l.x = Math.max(28, Math.min(DESCENT_W - 28, l.x + l.vx * dt));
          l.y = Math.max(24, l.y + l.vy * dt);

          if (activeThrottle > 0.02 && l.fuel > 0) {
            l.fuel = Math.max(0, l.fuel - activeThrottle * 3.4 * dt);
          }

          // Radar cue under 650m
          const groundY = terrainHeightAt(l.x);
          const altPx = Math.max(0, groundY - (l.y + 18));
          const altM = Math.round((altPx / (PAD_Y - 92)) * 12000);
          if (altM <= 650 && !radarBeepedRef.current) {
            radarBeepedRef.current = true;
            SFX.tempWarningBeep();
          }

          // Kick up lunar regolith dust when close to surface with thrust on
          if (altPx < 105 && activeThrottle > 0.15) {
            for (let d = 0; d < 2; d++) {
              l.dustParticles.push({
                x: l.x + (Math.random() - 0.5) * 20,
                y: groundY - 2,
                vx: (Math.random() - 0.5) * 90 + (l.x > 0 ? 0 : 0),
                vy: -Math.random() * 26 - 8,
                life: 0.55,
              });
            }
          }
          l.dustParticles = l.dustParticles
            .map((p) => ({
              ...p,
              x: p.x + p.vx * dt,
              y: p.y + p.vy * dt,
              vy: p.vy + 22 * dt,
              life: p.life - dt,
            }))
            .filter((p) => p.life > 0);

          // Touchdown check!
          if (l.y + 18 >= groundY) {
            l.y = groundY - 18;
            const vSpdMs = Math.abs(l.vy) * 0.15;
            const hSpdMs = Math.abs(l.vx) * 0.15;
            const onPad = l.x >= PAD_X1 + 8 && l.x <= PAD_X2 - 8;
            const tiltOk = Math.abs(l.tiltDeg) <= SAFE_TILT_DEG;

            if (!onPad) {
              l.crashReason = 'Touched down on jagged crater boulders instead of the flat LZ Pad!';
              SFX.powerFailure();
            } else if (vSpdMs > SAFE_V_SPD_MS) {
              l.crashReason = `Hard landing (${vSpdMs.toFixed(1)} m/s vertical — keep ≤ ${SAFE_V_SPD_MS} m/s)!`;
              SFX.powerFailure();
            } else if (hSpdMs > SAFE_H_SPD_MS) {
              l.crashReason = `Lateral skid (${hSpdMs.toFixed(1)} m/s horizontal — keep ≤ ${SAFE_H_SPD_MS} m/s)!`;
              SFX.powerFailure();
            } else if (!tiltOk) {
              l.crashReason = `Lander tilted ${Math.round(Math.abs(l.tiltDeg))}° on contact (keep within ±${SAFE_TILT_DEG}°)!`;
              SFX.powerFailure();
            } else {
              l.vx = 0;
              l.vy = 0;
              l.tiltDeg = 0;
              l.throttle = 0;
              landedFiredRef.current = true;
              SFX.sunlightRestored();
              SFX.levelComplete();
              onTouchdownConfirmed();
              setMode('landed');
            }
          }
        }

        // === DRAW POWERED LUNAR DESCENT SCENE ===
        ctx.clearRect(0, 0, DESCENT_W, DESCENT_H);
        const sky = ctx.createLinearGradient(0, 0, 0, DESCENT_H);
        sky.addColorStop(0, '#020612');
        sky.addColorStop(0.75, '#071124');
        sky.addColorStop(1, '#0f172a');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, DESCENT_W, DESCENT_H);

        stars.forEach((st) => {
          ctx.fillStyle = `rgba(241, 245, 249, ${st.a})`;
          ctx.beginPath();
          ctx.arc(st.x, st.y % 310, st.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Distant Earth glow on upper right
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(790, 72, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4fe3d4';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Moon South Pole Terrain Polygon
        ctx.beginPath();
        ctx.moveTo(0, DESCENT_H);
        for (let tx = 0; tx <= DESCENT_W; tx += 12) {
          ctx.lineTo(tx, terrainHeightAt(tx));
        }
        ctx.lineTo(DESCENT_W, DESCENT_H);
        ctx.closePath();
        const regGrad = ctx.createLinearGradient(0, 345, 0, DESCENT_H);
        regGrad.addColorStop(0, '#475569');
        regGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = regGrad;
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flat Landing Pad Beacon & Glide-Slope Beam
        const padCenter = (PAD_X1 + PAD_X2) / 2;
        const beamGrad = ctx.createLinearGradient(padCenter, 40, padCenter, PAD_Y);
        beamGrad.addColorStop(0, 'rgba(79, 227, 212, 0.02)');
        beamGrad.addColorStop(1, 'rgba(79, 227, 212, 0.16)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(PAD_X1 + 6, PAD_Y);
        ctx.lineTo(padCenter - 26, 20);
        ctx.lineTo(padCenter + 26, 20);
        ctx.lineTo(PAD_X2 - 6, PAD_Y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.fillRect(PAD_X1, PAD_Y - 3, PAD_X2 - PAD_X1, 5);
        ctx.fillStyle = '#4fe3d4';
        ctx.beginPath();
        ctx.arc(PAD_X1 + 6, PAD_Y - 6, 4, 0, Math.PI * 2);
        ctx.arc(PAD_X2 - 6, PAD_Y - 6, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6ee7b7';
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LZ SHACKLETON FLAT PAD', padCenter, PAD_Y + 20);

        // Regolith Dust Particles
        l.dustParticles.forEach((p) => {
          ctx.fillStyle = `rgba(203, 213, 225, ${Math.min(0.8, p.life * 1.4)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Radar Laser Dot onto Ground Directly Beneath Lander
        const gY = terrainHeightAt(l.x);
        const onPadNow = l.x >= PAD_X1 + 8 && l.x <= PAD_X2 - 8;
        ctx.save();
        ctx.strokeStyle = onPadNow ? 'rgba(52,211,153,0.45)' : 'rgba(251,191,36,0.35)';
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(l.x, l.y + 14);
        ctx.lineTo(l.x, gY);
        ctx.stroke();
        ctx.restore();

        // Draw Lander Module
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate((l.tiltDeg * Math.PI) / 180);

        // Descent Engine Exhaust Plume
        if (l.throttle > 4 && l.fuel > 0 && mode === 'lunar_descent' && !l.crashReason) {
          const pLen = 10 + (l.throttle / 100) * 34 + Math.random() * 6;
          const pGrad = ctx.createLinearGradient(0, 12, 0, 12 + pLen);
          pGrad.addColorStop(0, '#fef08a');
          pGrad.addColorStop(0.5, '#38bdf8');
          pGrad.addColorStop(1, 'rgba(56,189,248,0)');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.moveTo(-7, 12);
          ctx.lineTo(7, 12);
          ctx.lineTo(0, 12 + pLen);
          ctx.closePath();
          ctx.fill();
        }

        // RCS side puff visuals when turning
        if (turnLeft && mode === 'lunar_descent') {
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.moveTo(16, -6);
          ctx.lineTo(27, -9);
          ctx.lineTo(27, -3);
          ctx.closePath();
          ctx.fill();
        }
        if (turnRight && mode === 'lunar_descent') {
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.moveTo(-16, -6);
          ctx.lineTo(-27, -9);
          ctx.lineTo(-27, -3);
          ctx.closePath();
          ctx.fill();
        }

        // Landing Legs + Footpads
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-11, 7);
        ctx.lineTo(-20, 18);
        ctx.moveTo(11, 7);
        ctx.lineTo(20, 18);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-24, 17, 8, 3);
        ctx.fillRect(16, 17, 8, 3);

        // Descent Nozzle
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(-5, 8);
        ctx.lineTo(5, 8);
        ctx.lineTo(8, 13);
        ctx.lineTo(-8, 13);
        ctx.closePath();
        ctx.fill();

        // Gold Foil Descent Stage
        ctx.fillStyle = '#d97706';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-15, -3, 30, 11);
        ctx.strokeRect(-15, -3, 30, 11);

        // Upper Crew/Sensor Cabin + Dish
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#4fe3d4';
        ctx.beginPath();
        ctx.roundRect(-11, -15, 22, 12, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(0, -9, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (hudTick % 4 === 0) {
          const altPx = Math.max(0, gY - (l.y + 18));
          const altM = mode === 'landed' ? 0 : Math.max(0, Math.round((altPx / (PAD_Y - 92)) * 12000));
          setHud((prev) => ({
            ...prev,
            altM,
            vSpdMs: Number((Math.abs(l.vy) * 0.15).toFixed(1)),
            hSpdMs: Number((l.vx * 0.15).toFixed(1)),
            tiltDeg: Math.round(l.tiltDeg),
            throttlePct: Math.round(l.throttle),
            fuelPct: Math.round(l.fuel),
            overPad: onPadNow,
            crashReason: l.crashReason,
          }));
        }
      }

      hudTick += 1;
      rafId = requestAnimationFrame(stepAndDraw);
    };

    rafId = requestAnimationFrame(stepAndDraw);
    return () => cancelAnimationFrame(rafId);
  }, [fuelReserveBonusPct, mode, navPrecisionPct, onOrbitLocked, onTouchdownConfirmed]);

  const setHoldBtn = (
    field: keyof typeof pointerBtnRef.current,
    val: boolean
  ) => {
    pointerBtnRef.current[field] = val;
  };

  const setPresetThrottle = (pct: number) => {
    SFX.click();
    landerRef.current.throttle = pct;
  };

  const vOk = hud.vSpdMs <= SAFE_V_SPD_MS;
  const hOk = Math.abs(hud.hSpdMs) <= SAFE_H_SPD_MS;
  const tiltOk = Math.abs(hud.tiltDeg) <= SAFE_TILT_DEG;

  return (
    <div className="max-w-6xl w-full mx-auto rounded-2xl bg-[#071124] border border-cyan-400/35 p-4 sm:p-5 space-y-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      {/* Flight Director Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/40 shrink-0 hidden sm:block">
            <img
              src={lunarSouthPoleBannerImg}
              alt="Moon South Pole target"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/45 text-[10px] font-mono-tech font-bold text-[#4fe3d4]">
                {mode === 'space_flight'
                  ? 'PHASE 1 // CISLUNAR FLIGHT'
                  : mode === 'lunar_descent'
                  ? 'PHASE 2 // POWERED DESCENT'
                  : 'TOUCHDOWN CONFIRMED'}
              </span>
              {mode === 'lunar_descent' && (
                <button
                  type="button"
                  onClick={resetLunarDescent}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-[10px] font-mono-tech text-slate-300 cursor-pointer"
                >
                  ↺ Reset Descent
                </button>
              )}
              {mode === 'space_flight' && (
                <button
                  type="button"
                  onClick={resetSpaceFlight}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-[10px] font-mono-tech text-slate-300 cursor-pointer"
                >
                  ↺ Restart Transfer
                </button>
              )}
            </div>
            <h2 className="font-display text-base sm:text-lg font-extrabold text-white mt-0.5">
              {mode === 'space_flight'
                ? 'Pilot Through Cislunar Space & Brake Into Moon Orbit'
                : mode === 'lunar_descent'
                ? 'Fly Real Powered Descent & Land Upright on Flat Pad'
                : 'Lander Safely Down at Shackleton South Pole Rim!'}
            </h2>
          </div>
        </div>

        {/* Live Telemetry Pill Strip */}
        {mode === 'space_flight' ? (
          <div className="flex items-center gap-2 text-xs font-mono-tech tabular-nums">
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1.5">MOON</span>
              <strong className="text-cyan-300">{hud.distKm.toLocaleString()} km</strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1.5">VEL</span>
              <strong className={hud.speedKmS <= 2.3 ? 'text-emerald-300' : 'text-amber-300'}>
                {hud.speedKmS.toFixed(2)} km/s
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1.5">FUEL</span>
              <strong className={hud.fuelPct > 25 ? 'text-[#4fe3d4]' : 'text-rose-300'}>
                {hud.fuelPct}%
              </strong>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tech tabular-nums">
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1">ALT</span>
              <strong className="text-cyan-300">{hud.altM.toLocaleString()} m</strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1">V-SPD</span>
              <strong className={vOk ? 'text-emerald-300' : 'text-rose-300'}>
                {hud.vSpdMs.toFixed(1)} m/s
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1">H-SPD</span>
              <strong className={hOk ? 'text-emerald-300' : 'text-amber-300'}>
                {hud.hSpdMs > 0 ? `+${hud.hSpdMs.toFixed(1)}` : hud.hSpdMs.toFixed(1)} m/s
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1">TILT</span>
              <strong className={tiltOk ? 'text-emerald-300' : 'text-amber-300'}>
                {hud.tiltDeg}°
              </strong>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[#040a18] border border-white/10">
              <span className="text-slate-400 mr-1">FUEL</span>
              <strong className={hud.fuelPct > 20 ? 'text-[#4fe3d4]' : 'text-rose-300'}>
                {hud.fuelPct}%
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Main 60fps Flight & Powered Descent Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#020712]">
        <canvas
          ref={canvasRef}
          width={mode === 'space_flight' ? SPACE_W : DESCENT_W}
          height={mode === 'space_flight' ? SPACE_H : DESCENT_H}
          className="w-full h-auto block select-none"
        />

        {/* In-Canvas Proximity & Orbit Lock Prompt (Space Flight) */}
        {mode === 'space_flight' && hud.inZone && !hud.spaceFail && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-400/70 text-xs font-mono-tech font-extrabold text-emerald-200 flex items-center gap-2">
            <span>
              {hud.capturePct > 0
                ? `ORBIT LOCKING... ${hud.capturePct}%`
                : 'INSIDE MOON RING — HOLD S / BRAKE TO CAPTURE!'}
            </span>
          </div>
        )}

        {/* Descent Target Touchdown Checklist Overlay */}
        {mode === 'lunar_descent' && !hud.crashReason && (
          <div className="absolute top-3 left-3 flex flex-col gap-1 px-3 py-2 rounded-xl bg-[#040a18]/85 border border-white/15 text-[11px] font-mono-tech tabular-nums pointer-events-none">
            <div className={hud.overPad ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
              {hud.overPad ? '✓ Aligned over Flat Pad' : '○ Steer over Green LZ Pad'}
            </div>
            <div className={vOk ? 'text-emerald-300 font-bold' : 'text-rose-300'}>
              {vOk ? '✓' : '▲'} V-Spd ≤ {SAFE_V_SPD_MS} m/s
            </div>
            <div className={hOk ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
              {hOk ? '✓' : '▲'} H-Spd ≤ ±{SAFE_H_SPD_MS} m/s
            </div>
            <div className={tiltOk ? 'text-emerald-300 font-bold' : 'text-amber-300'}>
              {tiltOk ? '✓' : '▲'} Tilt ≤ ±{SAFE_TILT_DEG}°
            </div>
          </div>
        )}

        {/* Failure / Crash Retry Overlay */}
        {((mode === 'space_flight' && hud.spaceFail) || (mode === 'lunar_descent' && hud.crashReason)) && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-2xl bg-[#071124] border border-rose-400/60 p-5 text-center space-y-3 shadow-2xl">
              <div className="text-3xl">⚠️</div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-rose-200">
                {mode === 'space_flight' ? 'Orbital Transfer Failed' : 'Lunar Touchdown Abort'}
              </h3>
              <p className="text-xs text-slate-200">
                {mode === 'space_flight' ? hud.spaceFail : hud.crashReason}
              </p>
              <button
                type="button"
                onClick={mode === 'space_flight' ? resetSpaceFlight : resetLunarDescent}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-[#041022] font-extrabold text-xs uppercase tracking-wide cursor-pointer hover:brightness-110"
              >
                {mode === 'space_flight'
                  ? 'Retry Cislunar Flight ▶'
                  : 'Retry Powered Descent (12,000 m) ▶'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tactile Pilot Control Deck (Keyboard + Hold Buttons) */}
      {mode === 'space_flight' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-6 p-3 rounded-xl bg-[#040a18] border border-white/10 text-xs text-slate-200">
            <div className="font-bold text-[#4fe3d4] mb-0.5">Flight Computer</div>
            <div>{hud.spaceStatus}</div>
            <div className="text-[11px] font-mono-tech text-slate-400 mt-1">
              Keys: ←/→ (A/D) Steer · ↑/W/Space Thrust · ↓/S Retrograde Brake
            </div>
          </div>

          <div className="md:col-span-6 grid grid-cols-4 gap-2 select-none">
            <button
              type="button"
              onMouseDown={() => setHoldBtn('left', true)}
              onMouseUp={() => setHoldBtn('left', false)}
              onMouseLeave={() => setHoldBtn('left', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('left', true); }}
              onTouchEnd={() => setHoldBtn('left', false)}
              className="py-3 rounded-xl bg-[#0b1933] hover:bg-cyan-500/20 active:bg-cyan-500/35 border border-cyan-400/35 text-xs font-extrabold text-white cursor-pointer"
            >
              ↺ Left (A)
            </button>
            <button
              type="button"
              onMouseDown={() => setHoldBtn('right', true)}
              onMouseUp={() => setHoldBtn('right', false)}
              onMouseLeave={() => setHoldBtn('right', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('right', true); }}
              onTouchEnd={() => setHoldBtn('right', false)}
              className="py-3 rounded-xl bg-[#0b1933] hover:bg-cyan-500/20 active:bg-cyan-500/35 border border-cyan-400/35 text-xs font-extrabold text-white cursor-pointer"
            >
              ↻ Right (D)
            </button>
            <button
              type="button"
              onMouseDown={() => setHoldBtn('thrust', true)}
              onMouseUp={() => setHoldBtn('thrust', false)}
              onMouseLeave={() => setHoldBtn('thrust', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('thrust', true); }}
              onTouchEnd={() => setHoldBtn('thrust', false)}
              className="py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] active:brightness-125 text-[#041022] text-xs font-extrabold cursor-pointer"
            >
              🔥 Burn (W)
            </button>
            <button
              type="button"
              onMouseDown={() => setHoldBtn('retro', true)}
              onMouseUp={() => setHoldBtn('retro', false)}
              onMouseLeave={() => setHoldBtn('retro', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('retro', true); }}
              onTouchEnd={() => setHoldBtn('retro', false)}
              className="py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:brightness-110 text-[#041022] text-xs font-extrabold cursor-pointer"
            >
              🛑 Brake (S)
            </button>
          </div>
        </div>
      )}

      {mode === 'lunar_descent' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Throttle Bar + Presets (Apollo Hover ~42%) */}
          <div className="lg:col-span-7 p-3 rounded-xl bg-[#040a18] border border-cyan-400/25 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-tech tabular-nums">
              <span className="font-bold text-white">
                Descent Throttle{' '}
                <span className="text-slate-400 font-normal">(~42% balances 1/6th Moon gravity)</span>
              </span>
              <strong className="text-sm text-[#4fe3d4]">{hud.throttlePct}%</strong>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={hud.throttlePct}
                onChange={(e) => {
                  landerRef.current.throttle = Number(e.target.value);
                }}
                className="flex-1 accent-[#4fe3d4] cursor-pointer"
              />
              {[0, 42, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPresetThrottle(pct)}
                  className="px-2.5 py-1 rounded-lg bg-[#0b1933] hover:bg-cyan-500/25 border border-white/15 text-[11px] font-mono-tech font-bold text-slate-200 cursor-pointer"
                >
                  {pct === 42 ? 'Hover' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Pitch & Throttle Hold Controls */}
          <div className="lg:col-span-5 grid grid-cols-4 gap-2 select-none">
            <button
              type="button"
              onMouseDown={() => setHoldBtn('left', true)}
              onMouseUp={() => setHoldBtn('left', false)}
              onMouseLeave={() => setHoldBtn('left', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('left', true); }}
              onTouchEnd={() => setHoldBtn('left', false)}
              className="py-3 rounded-xl bg-[#0b1933] hover:bg-cyan-500/20 active:bg-cyan-500/35 border border-cyan-400/35 text-xs font-extrabold text-white cursor-pointer"
            >
              ↶ Tilt L (A)
            </button>
            <button
              type="button"
              onMouseDown={() => setHoldBtn('right', true)}
              onMouseUp={() => setHoldBtn('right', false)}
              onMouseLeave={() => setHoldBtn('right', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('right', true); }}
              onTouchEnd={() => setHoldBtn('right', false)}
              className="py-3 rounded-xl bg-[#0b1933] hover:bg-cyan-500/20 active:bg-cyan-500/35 border border-cyan-400/35 text-xs font-extrabold text-white cursor-pointer"
            >
              ↷ Tilt R (D)
            </button>
            <button
              type="button"
              onMouseDown={() => setHoldBtn('throttleUp', true)}
              onMouseUp={() => setHoldBtn('throttleUp', false)}
              onMouseLeave={() => setHoldBtn('throttleUp', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('throttleUp', true); }}
              onTouchEnd={() => setHoldBtn('throttleUp', false)}
              className="py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] active:brightness-125 text-[#041022] text-xs font-extrabold cursor-pointer"
            >
              ▲ Burn (W)
            </button>
            <button
              type="button"
              onMouseDown={() => setHoldBtn('throttleDown', true)}
              onMouseUp={() => setHoldBtn('throttleDown', false)}
              onMouseLeave={() => setHoldBtn('throttleDown', false)}
              onTouchStart={(e) => { e.preventDefault(); setHoldBtn('throttleDown', true); }}
              onTouchEnd={() => setHoldBtn('throttleDown', false)}
              className="py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#041022] text-xs font-extrabold cursor-pointer"
            >
              ▼ Cut (S)
            </button>
          </div>
        </div>
      )}

      {mode === 'landed' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="px-4 py-2.5 rounded-xl bg-emerald-950/55 border border-emerald-400/60 text-xs font-extrabold text-emerald-200">
            🛬 CONTACT LIGHT — ENGINE STOP! Clean powered landing on Shackleton Flat Pad ({hud.fuelPct}% fuel left).
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={resetLunarDescent}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 cursor-pointer"
            >
              Replay Descent
            </button>
            <button
              type="button"
              onClick={onProceedToExplore}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-emerald-400 text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 cursor-pointer shadow-[0_0_20px_rgba(79,227,212,0.4)]"
            >
              Explore Moon in 3D ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
