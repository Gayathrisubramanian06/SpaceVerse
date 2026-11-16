import React from 'react';

interface StoreItemIllustrationProps {
  itemId: string;
  unlocked: boolean;
  className?: string;
}

export const StoreItemIllustrationSVG: React.FC<StoreItemIllustrationProps> = ({
  itemId,
  unlocked,
  className = 'w-full h-36',
}) => {
  const glowOpacity = unlocked ? 1 : 0.72;

  return (
    <svg
      viewBox="0 0 260 140"
      className={`${className} select-none overflow-visible`}
      style={{ opacity: glowOpacity }}
    >
      <defs>
        <radialGradient id={`bg-${itemId}`} cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor={itemId.startsWith('lvl7') ? '#7c2d12' : '#0c4a6e'} stopOpacity="0.45" />
          <stop offset="65%" stopColor="#08152e" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#040b18" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="goldFoil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="cyanBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4fe3d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Cosmic showcase stage backdrop */}
      <rect width="260" height="140" rx="14" fill={`url(#bg-${itemId})`} />
      {/* Subtle Blueprint Grid */}
      <g stroke="#38bdf8" strokeOpacity="0.1" strokeWidth="1">
        <line x1="0" y1="35" x2="260" y2="35" />
        <line x1="0" y1="70" x2="260" y2="70" />
        <line x1="0" y1="105" x2="260" y2="105" />
        <line x1="65" y1="0" x2="65" y2="140" />
        <line x1="130" y1="0" x2="130" y2="140" />
        <line x1="195" y1="0" x2="195" y2="140" />
      </g>
      {/* Twinkling stars */}
      <circle cx="24" cy="22" r="1.4" fill="#fff" opacity="0.7" />
      <circle cx="232" cy="26" r="1.8" fill="#bae6fd" opacity="0.8" />
      <circle cx="44" cy="116" r="1.3" fill="#fde68a" opacity="0.75" />
      <circle cx="222" cy="108" r="1.5" fill="#fff" opacity="0.65" />

      {/* 1. RTG NUCLEAR POWER CORE */}
      {itemId === 'lvl7_rtg_core' && (
        <g transform="translate(130, 72)">
          {/* Pulsing Nuclear Energy Halo */}
          <circle cx="0" cy="0" r="42" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 5" opacity="0.55">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="10s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="0" r="30" fill="#f97316" opacity="0.14">
            <animate attributeName="r" values="28;36;28" dur="2.2s" repeatCount="indefinite" />
          </circle>
          {/* Cooling Radiator Fins */}
          {[-28, -18, -8, 8, 18, 28].map((fx) => (
            <rect key={fx} x={fx - 2} y="-30" width="4" height="60" rx="1.5" fill="#475569" stroke="#94a3b8" strokeWidth="0.8" />
          ))}
          {/* Main RTG Cylindrical Core */}
          <rect x="-18" y="-34" width="36" height="68" rx="6" fill="url(#metalGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Glowing Plutonium Core Window */}
          <rect x="-10" y="-18" width="20" height="36" rx="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="7" fill="#fbbf24">
            <animate attributeName="opacity" values="0.65;1;0.65" dur="1.4s" repeatCount="indefinite" />
          </circle>
          {/* Radiation / Electric Output Nodes */}
          <path d="M-4 -28 L4 -28 L0 -22 Z" fill="#4fe3d4" />
          <path d="M-4 28 L4 28 L0 22 Z" fill="#4fe3d4" />
        </g>
      )}

      {/* 2. MOI BRAKING THRUSTER UNIT */}
      {itemId === 'lvl7_moi_thrusters' && (
        <g transform="translate(130, 62)">
          {/* Mars Orbital Arc */}
          <circle cx="0" cy="74" r="58" fill="#c2410c" opacity="0.35" stroke="#fb923c" strokeWidth="1.5" />
          {/* Engine Manifold & Gimbal Mount */}
          <rect x="-34" y="-34" width="68" height="22" rx="5" fill="url(#goldFoil)" stroke="#fde68a" strokeWidth="1.4" />
          <rect x="-22" y="-42" width="44" height="10" rx="3" fill="#334155" stroke="#94a3b8" />
          {/* Twin De Laval Braking Nozzles */}
          {[-18, 18].map((nx) => (
            <g key={nx} transform={`translate(${nx}, -12)`}>
              <polygon points="-8,0 8,0 14,24 -14,24" fill="url(#metalGrad)" stroke="#e2e8f0" strokeWidth="1.2" />
              {/* Animated Braking Flame */}
              <polygon points="-10,24 10,24 0,62" fill="url(#flameGrad)">
                <animate attributeName="points" values="-10,24 10,24 0,58;-12,24 12,24 0,68;-10,24 10,24 0,58" dur="0.45s" repeatCount="indefinite" />
              </polygon>
            </g>
          ))}
        </g>
      )}

      {/* 3. MARS HIGH-RESOLUTION CAMERA */}
      {itemId === 'lvl7_hires_camera' && (
        <g transform="translate(130, 68)">
          {/* Martian Terrain Arc Below */}
          <path d="M-95 56 Q0 32 95 56" fill="#9a3412" opacity="0.45" stroke="#fb923c" strokeWidth="1.5" />
          {/* Optical Scan Cone */}
          <polygon points="-14,12 14,12 42,50 -42,50" fill="url(#cyanBeam)" opacity="0.45">
            <animate attributeName="opacity" values="0.25;0.55;0.25" dur="2s" repeatCount="indefinite" />
          </polygon>
          {/* Telescope Barrel */}
          <rect x="-34" y="-32" width="68" height="32" rx="6" fill="url(#metalGrad)" stroke="#e2e8f0" strokeWidth="1.4" />
          <rect x="-24" y="0" width="48" height="14" rx="3" fill="#1e293b" stroke="#4fe3d4" strokeWidth="1.3" />
          {/* Sapphire Lens */}
          <ellipse cx="0" cy="14" rx="18" ry="5" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.4" />
          <circle cx="-6" cy="-16" r="4" fill="#4fe3d4">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <rect x="8" y="-22" width="18" height="12" rx="2" fill="url(#goldFoil)" />
        </g>
      )}

      {/* 4. MARTIAN ATMOSPHERIC SENSOR */}
      {itemId === 'lvl7_atmos_sensor' && (
        <g transform="translate(130, 70)">
          {/* Atmospheric Gas Waves */}
          <path d="M-85 -14 Q-40 -26 0 -14 T85 -14" fill="none" stroke="#fb923c" strokeWidth="2" opacity="0.55">
            <animate attributeName="d" values="M-85 -14 Q-40 -26 0 -14 T85 -14;M-85 -14 Q-40 -2 0 -14 T85 -14;M-85 -14 Q-40 -26 0 -14 T85 -14" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M-85 18 Q-40 6 0 18 T85 18" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.5">
            <animate attributeName="d" values="M-85 18 Q-40 6 0 18 T85 18;M-85 18 Q-40 30 0 18 T85 18;M-85 18 Q-40 6 0 18 T85 18" dur="2.6s" repeatCount="indefinite" />
          </path>
          {/* Spectrometer Housing */}
          <rect x="-32" y="-24" width="64" height="48" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.6" />
          <rect x="-46" y="-8" width="14" height="16" rx="2" fill="url(#metalGrad)" />
          <rect x="32" y="-8" width="14" height="16" rx="2" fill="url(#metalGrad)" />
          {/* Live Spectral Bars */}
          {[-18, -9, 0, 9, 18].map((bx, i) => (
            <rect key={bx} x={bx - 2.5} y={-10 + (i % 2) * 4} width="5" height={20 - (i % 2) * 4} rx="1.5" fill={i % 2 === 0 ? '#4fe3d4' : '#fbbf24'}>
              <animate attributeName="height" values="10;26;12;22;10" dur={`${1.1 + i * 0.22}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
      )}

      {/* 5. MARS SURFACE RADAR MAPPER */}
      {itemId === 'lvl7_surface_mapper' && (
        <g transform="translate(130, 70)">
          {/* Martian Ridges */}
          <path d="M-95 44 L-55 24 L-20 38 L15 18 L52 34 L95 22 L95 54 L-95 54 Z" fill="#9a3412" opacity="0.55" stroke="#f97316" strokeWidth="1.4" />
          {/* Sweeping SAR Radar Beam */}
          <polygon points="0,-16 -46,42 46,42" fill="url(#cyanBeam)" opacity="0.45">
            <animateTransform attributeName="transform" type="rotate" values="-16 0 -16;16 0 -16;-16 0 -16" dur="3.4s" repeatCount="indefinite" />
          </polygon>
          {/* Orbiter Bus & Radar Dish */}
          <rect x="-26" y="-36" width="52" height="18" rx="4" fill="url(#goldFoil)" stroke="#fde68a" strokeWidth="1.3" />
          <path d="M-24 -16 Q0 -2 24 -16" fill="none" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="0" cy="-16" r="4" fill="#4fe3d4" />
        </g>
      )}

      {/* 6. DEEP-SPACE X-BAND EARTH RELAY */}
      {itemId === 'lvl7_earth_relay' && (
        <g transform="translate(130, 72)">
          {/* Distant Blue Earth Target */}
          <circle cx="68" cy="-28" r="14" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
          <path d="M62 -32 Q69 -28 73 -22" stroke="#34d399" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Pulsing X-Band Radio Arcs */}
          {[1, 2, 3].map((r, i) => (
            <path
              key={r}
              d={`M ${-8 + i * 16} ${-8 - i * 8} A ${18 + i * 10} ${18 + i * 10} 0 0 1 ${6 + i * 16} ${10 - i * 8}`}
              fill="none"
              stroke="#4fe3d4"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <animate attributeName="opacity" values="0.15;1;0.15" dur="1.6s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
            </path>
          ))}
          {/* High-Gain Dish */}
          <g transform="translate(-44, 12) rotate(-35)">
            <path d="M-26 -8 Q0 18 26 -8 Z" fill="url(#metalGrad)" stroke="#f8fafc" strokeWidth="1.4" />
            <line x1="0" y1="6" x2="0" y2="-22" stroke="#cbd5e1" strokeWidth="2.2" />
            <circle cx="0" cy="-23" r="4" fill="#fbbf24" />
            <rect x="-10" y="10" width="20" height="14" rx="3" fill="url(#goldFoil)" />
          </g>
        </g>
      )}

      {/* 7. LUNAR NEUTRON SPECTROMETER */}
      {itemId === 'lvl8_neutron_spec' && (
        <g transform="translate(130, 70)">
          {/* Shadowed Lunar Crater Floor with Ice Glow */}
          <ellipse cx="0" cy="40" rx="74" ry="15" fill="#1e293b" stroke="#64748b" strokeWidth="1.4" />
          <ellipse cx="0" cy="40" rx="36" ry="7" fill="#38bdf8" opacity="0.45">
            <animate attributeName="opacity" values="0.3;0.75;0.3" dur="2s" repeatCount="indefinite" />
          </ellipse>
          {/* Neutron Detection Rings */}
          <circle cx="0" cy="24" r="14" fill="none" stroke="#4fe3d4" strokeWidth="1.6">
            <animate attributeName="r" values="8;26;8" dur="2.1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.1;0.9" dur="2.1s" repeatCount="indefinite" />
          </circle>
          {/* Spectrometer Unit */}
          <rect x="-24" y="-34" width="48" height="28" rx="6" fill="url(#metalGrad)" stroke="#e2e8f0" strokeWidth="1.4" />
          <rect x="-14" y="-26" width="28" height="12" rx="3" fill="#0f172a" stroke="#4fe3d4" />
          <circle cx="0" cy="-20" r="3.5" fill="#38bdf8" />
          <rect x="-8" y="-6" width="16" height="10" rx="2" fill="url(#goldFoil)" />
        </g>
      )}

      {/* 8. DUAL-BAND ICE PENETRATING RADAR */}
      {itemId === 'lvl8_ice_radar' && (
        <g transform="translate(130, 70)">
          {/* Layered Subsurface Regolith */}
          <rect x="-90" y="28" width="180" height="26" rx="4" fill="#1e293b" stroke="#64748b" />
          <path d="M-85 40 Q-25 34 20 42 T85 38" stroke="#38bdf8" strokeWidth="2.5" fill="none" opacity="0.8" />
          {/* Radar Dipole Wings */}
          <rect x="-68" y="-24" width="136" height="5" rx="2.5" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1" />
          <rect x="-18" y="-34" width="36" height="22" rx="4" fill="url(#goldFoil)" stroke="#fde68a" strokeWidth="1.3" />
          {/* Penetrating Echo Arcs */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M ${-22 - i * 10} ${-4 + i * 10} Q 0 ${8 + i * 14} ${22 + i * 10} ${-4 + i * 10}`}
              fill="none"
              stroke="#4fe3d4"
              strokeWidth="2"
            >
              <animate attributeName="opacity" values="0.15;1;0.15" dur="1.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </path>
          ))}
        </g>
      )}

      {/* 9. CRYO-INFRARED CRATER MAPPER */}
      {itemId === 'lvl8_ir_mapper' && (
        <g transform="translate(130, 70)">
          {/* South Pole Thermal Contours */}
          <ellipse cx="0" cy="36" rx="68" ry="16" fill="none" stroke="#818cf8" strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="0" cy="36" rx="44" ry="10" fill="none" stroke="#38bdf8" strokeWidth="1.8" opacity="0.75" />
          <ellipse cx="0" cy="36" rx="22" ry="5" fill="#4fe3d4" opacity="0.45">
            <animate attributeName="opacity" values="0.35;0.85;0.35" dur="1.8s" repeatCount="indefinite" />
          </ellipse>
          {/* Cryo-IR Optical Turret */}
          <rect x="-26" y="-36" width="52" height="28" rx="6" fill="#0f172a" stroke="#818cf8" strokeWidth="1.5" />
          <circle cx="0" cy="-22" r="9" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />
          <circle cx="0" cy="-22" r="4" fill="#4fe3d4">
            <animate attributeName="r" values="3;5.5;3" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <polygon points="-10,-8 10,-8 28,34 -28,34" fill="url(#cyanBeam)" opacity="0.35" />
        </g>
      )}

      {/* 10. HEAVY LUNAR LAUNCH CAPACITY KIT */}
      {itemId === 'lvl8_heavy_rocket_kit' && (
        <g transform="translate(130, 72)">
          {/* Side Heavy Boosters */}
          <rect x="-26" y="-12" width="12" height="44" rx="4" fill="url(#metalGrad)" stroke="#cbd5e1" />
          <rect x="14" y="-12" width="12" height="44" rx="4" fill="url(#metalGrad)" stroke="#cbd5e1" />
          {/* Core Stage & Fairing */}
          <rect x="-12" y="-30" width="24" height="62" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" />
          <path d="M-12 -30 Q0 -54 12 -30 Z" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1.2" />
          <rect x="-12" y="-6" width="24" height="6" fill="#0f172a" />
          {/* Launch Thrust Plumes */}
          {[-20, 0, 20].map((px) => (
            <polygon key={px} points={`${px - 5},32 ${px + 5},32 ${px},56`} fill="url(#flameGrad)">
              <animate attributeName="points" values={`${px - 5},32 ${px + 5},32 ${px},50;${px - 6},32 ${px + 6},32 ${px},60;${px - 5},32 ${px + 5},32 ${px},50`} dur="0.4s" repeatCount="indefinite" />
            </polygon>
          ))}
        </g>
      )}

      {/* 11. LUNAR ORBIT BRAKING & FUEL MANIFOLD */}
      {itemId === 'lvl8_loi_propulsion' && (
        <g transform="translate(130, 70)">
          {/* Dual Propellant Tanks */}
          <circle cx="-26" cy="-6" r="20" fill="url(#metalGrad)" stroke="#38bdf8" strokeWidth="1.6" />
          <circle cx="26" cy="-6" r="20" fill="url(#goldFoil)" stroke="#fde68a" strokeWidth="1.6" />
          {/* Fuel Level Glow */}
          <circle cx="-26" cy="-6" r="10" fill="#38bdf8" opacity="0.65">
            <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="26" cy="-6" r="10" fill="#fbbf24" opacity="0.65">
            <animate attributeName="r" values="8;12;8" dur="2s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          {/* Central Valve & Braking Nozzle */}
          <line x1="-26" y1="14" x2="26" y2="14" stroke="#4fe3d4" strokeWidth="3" />
          <rect x="-10" y="6" width="20" height="16" rx="4" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.5" />
          <polygon points="-8,22 8,22 12,38 -12,38" fill="url(#metalGrad)" stroke="#e2e8f0" />
          <polygon points="-8,38 8,38 0,55" fill="url(#flameGrad)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
          </polygon>
        </g>
      )}

      {/* 12. DEEP-SPACE RELAY TRANSCEIVER */}
      {itemId === 'lvl8_crew_comms' && (
        <g transform="translate(130, 70)">
          {/* Orbiting Sync Ring */}
          <circle cx="0" cy="0" r="36" fill="none" stroke="#4fe3d4" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.65">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="12s" repeatCount="indefinite" />
          </circle>
          {/* Link Lines to 4 Relay Channels */}
          <g stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.65">
            <line x1="0" y1="0" x2="-46" y2="-26" />
            <line x1="0" y1="0" x2="46" y2="-26" />
            <line x1="0" y1="0" x2="-46" y2="26" />
            <line x1="0" y1="0" x2="46" y2="26" />
          </g>
          {/* Central Hub */}
          <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#4fe3d4" strokeWidth="2" />
          <circle cx="0" cy="0" r="6" fill="#4fe3d4">
            <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          {/* 4 Relay Frequency Nodes */}
          {[
            { x: -46, y: -26, color: '#f97316', label: 'CH1' },
            { x: 46, y: -26, color: '#38bdf8', label: 'CH2' },
            { x: -46, y: 26, color: '#a78bfa', label: 'CH3' },
            { x: 46, y: 26, color: '#34d399', label: 'CH4' },
          ].map((n) => (
            <g key={n.label} transform={`translate(${n.x}, ${n.y})`}>
              <circle cx="0" cy="0" r="12" fill="#09152b" stroke={n.color} strokeWidth="2" />
              <text x="0" y="3.5" textAnchor="middle" fill={n.color} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                {n.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};
