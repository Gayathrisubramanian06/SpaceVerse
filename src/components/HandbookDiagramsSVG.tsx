import React from 'react';

export const HandbookCoverSVG: React.FC = () => (
  <svg viewBox="0 0 420 215" className="w-full h-auto max-w-[260px] mx-auto" fill="none">
    <defs>
      <radialGradient id="hbCoverGlow" cx="50%" cy="50%" r="54%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
        <stop offset="65%" stopColor="#0f172a" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#020617" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hbPlanetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="55%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#082f49" />
      </linearGradient>
    </defs>

    <circle cx="210" cy="110" r="105" fill="url(#hbCoverGlow)" />

    {/* Starfield */}
    {[
      [42, 28, 1.4],
      [94, 54, 1.1],
      [158, 22, 1.6],
      [276, 26, 1.4],
      [348, 46, 1.6],
      [382, 98, 1.2],
      [352, 184, 1.4],
      [58, 178, 1.4],
      [118, 192, 1.0],
      [302, 192, 1.3],
    ].map(([cx, cy, r], idx) => (
      <circle key={idx} cx={cx} cy={cy} r={r} fill="#bae6fd" opacity="0.82" />
    ))}

    {/* Orbital Rings */}
    <circle cx="210" cy="110" r="82" stroke="#38bdf8" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="4 4" />
    <ellipse cx="210" cy="110" rx="132" ry="44" transform="rotate(-14 210 110)" stroke="#4fe3d4" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="6 4" />
    <ellipse cx="210" cy="110" rx="104" ry="33" transform="rotate(18 210 110)" stroke="#f2c14e" strokeOpacity="0.45" strokeWidth="1.2" />

    {/* Earth Core */}
    <circle cx="210" cy="110" r="42" fill="url(#hbPlanetGrad)" stroke="#7dd3fc" strokeWidth="1.6" />
    <path d="M184 96 Q200 88 212 98 T236 104 Q228 120 212 125 T188 114 Z" fill="#34d399" opacity="0.55" />
    <path d="M198 126 Q212 134 226 130 Q218 143 203 142 Z" fill="#34d399" opacity="0.45" />
    <circle cx="210" cy="110" r="46" stroke="#38bdf8" strokeOpacity="0.32" strokeWidth="2" />

    {/* Moon */}
    <circle cx="326" cy="54" r="12" fill="#cbd5e1" stroke="#f8fafc" strokeWidth="1.2" />
    <circle cx="322" cy="51" r="2.6" fill="#94a3b8" />
    <circle cx="330" cy="58" r="2" fill="#94a3b8" />

    {/* Rocket Launching */}
    <g transform="translate(92 70) rotate(-32)">
      <path d="M0 -22 C6 -13 7 -2 7 10 L-7 10 C-7 -2 -6 -13 0 -22 Z" fill="#e2e8f0" stroke="#4fe3d4" strokeWidth="1.4" />
      <polygon points="0,-22 4.5,-13 -4.5,-13" fill="#f2c14e" />
      <polygon points="-7,3 -12,13 -7,10" fill="#38bdf8" />
      <polygon points="7,3 12,13 7,10" fill="#38bdf8" />
      <circle cx="0" cy="-4" r="2.8" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1" />
      <path d="M-3.5 11 L0 23 L3.5 11 Z" fill="#fb923c" />
    </g>

    {/* Observation Satellite */}
    <g transform="translate(314 142) rotate(16)">
      <rect x="-25" y="-6" width="16" height="12" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
      <rect x="9" y="-6" width="16" height="12" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
      <rect x="-7" y="-8" width="14" height="16" rx="3" fill="#f2c14e" stroke="#fde68a" strokeWidth="1.2" />
      <path d="M-4 -8 Q0 -14 4 -8" stroke="#4fe3d4" strokeWidth="1.5" />
      <line x1="0" y1="-11" x2="0" y2="-16" stroke="#4fe3d4" strokeWidth="1.3" />
    </g>
  </svg>
);

export const HandbookLevelDiagramSVG: React.FC<{ level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }> = ({
  level,
}) => {
  switch (level) {
    case 1:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          {/* Left Solar Wing */}
          <rect x="34" y="66" width="96" height="38" rx="4" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="66" y1="66" x2="66" y2="104" stroke="#60a5fa" strokeOpacity="0.55" />
          <line x1="98" y1="66" x2="98" y2="104" stroke="#60a5fa" strokeOpacity="0.55" />
          <line x1="130" y1="85" x2="164" y2="85" stroke="#94a3b8" strokeWidth="3" />

          {/* Right Solar Wing */}
          <rect x="290" y="66" width="96" height="38" rx="4" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="322" y1="66" x2="322" y2="104" stroke="#60a5fa" strokeOpacity="0.55" />
          <line x1="354" y1="66" x2="354" y2="104" stroke="#60a5fa" strokeOpacity="0.55" />
          <line x1="256" y1="85" x2="290" y2="85" stroke="#94a3b8" strokeWidth="3" />

          {/* Gold MLI Bus */}
          <rect x="164" y="50" width="92" height="70" rx="8" fill="#ca8a04" fillOpacity="0.25" stroke="#f2c14e" strokeWidth="2" />
          <text x="210" y="79" textAnchor="middle" fill="#4fe3d4" fontSize="8" fontFamily="monospace" fontWeight="bold">OBC + BATT</text>
          <text x="210" y="96" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontFamily="monospace" fontWeight="bold">ADCS + MLI</text>

          {/* Top Dish Antenna */}
          <path d="M186 42 Q210 24 234 42" stroke="#4fe3d4" strokeWidth="2.2" fill="#082f49" />
          <line x1="210" y1="50" x2="210" y2="33" stroke="#94a3b8" strokeWidth="2" />

          {/* Bottom Camera + Thrusters */}
          <rect x="197" y="120" width="26" height="14" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <polygon points="174,120 184,120 181,132 177,132" fill="#fb923c" />
          <polygon points="236,120 246,120 243,132 239,132" fill="#fb923c" />

          <g fontFamily="monospace" fontSize="8.5" fontWeight="bold">
            <text x="82" y="56" textAnchor="middle" fill="#7dd3fc">SOLAR WINGS</text>
            <text x="338" y="56" textAnchor="middle" fill="#7dd3fc">SOLAR WINGS</text>
            <text x="210" y="18" textAnchor="middle" fill="#4fe3d4">RADIO DISH</text>
            <text x="210" y="156" textAnchor="middle" fill="#38bdf8">CAMERA &amp; THRUSTERS</text>
          </g>
        </svg>
      );

    case 2:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <path d="M310 58 Q362 64 386 85 Q362 106 310 112 Z" fill="#1e293b" stroke="#f2c14e" strokeWidth="2" />
          <circle cx="336" cy="85" r="8" fill="#4fe3d4" fillOpacity="0.3" stroke="#4fe3d4" strokeDasharray="2 2" />
          <rect x="234" y="60" width="76" height="50" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <text x="272" y="88" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="bold">STAGE 2</text>
          <rect x="206" y="60" width="28" height="50" fill="#334155" stroke="#fb923c" strokeWidth="1.6" strokeDasharray="3 2" />
          <rect x="78" y="58" width="128" height="54" rx="5" fill="#0f172a" stroke="#4fe3d4" strokeWidth="2" />
          <text x="142" y="89" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="bold">STAGE 1 BOOSTER</text>
          <path d="M64 70 L28 76 L64 82 Z" fill="#fb923c" opacity="0.85" />
          <path d="M64 90 L28 96 L64 102 Z" fill="#fbbf24" opacity="0.85" />

          <g fontFamily="monospace" fontSize="8.5" fontWeight="bold">
            <text x="142" y="36" textAnchor="middle" fill="#4fe3d4">1. HEAVY BOOSTER SEPARATES</text>
            <text x="346" y="36" textAnchor="middle" fill="#f2c14e">FAIRING (SATELLITE)</text>
            <text x="210" y="148" textAnchor="middle" fill="#7dd3fc">2. LIGHT STAGE 2 REACHES ~7.8 KM/S ORBIT</text>
          </g>
        </svg>
      );

    case 3:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <circle cx="38" cy="85" r="20" fill="#fbbf24" />
          {[55, 75, 95, 115].map((y, i) => (
            <line key={i} x1="64" y1={y} x2="174" y2={y} stroke="#fde047" strokeOpacity="0.4" strokeWidth="1.4" strokeDasharray="4 3" />
          ))}
          <polygon points="210,45 420,28 420,142 210,125" fill="#020617" fillOpacity="0.82" />
          <ellipse cx="210" cy="85" rx="86" ry="60" stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="6 4" />
          <circle cx="210" cy="85" r="38" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.6" />
          <path d="M210 47 A38 38 0 0 1 210 123 Z" fill="#082f49" opacity="0.72" />
          <text x="210" y="88" textAnchor="middle" fill="#e0f2fe" fontSize="8.5" fontFamily="monospace" fontWeight="bold">EARTH</text>
          <rect x="198" y="20" width="24" height="10" rx="2" fill="#f2c14e" />
          <rect x="290" y="80" width="14" height="14" rx="2" fill="#fb7185" />

          <g fontFamily="monospace" fontSize="8" fontWeight="bold">
            <text x="72" y="28" fill="#fde047">SUNLIGHT: RECHARGE (&gt;110 W)</text>
            <text x="340" y="54" textAnchor="middle" fill="#fb7185">SHADOW: DRAIN (~358 Wh)</text>
            <text x="210" y="160" textAnchor="middle" fill="#4fe3d4">LEO ~90 MIN LAP · GEO 35,786 KM</text>
          </g>
        </svg>
      );

    case 4:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <rect x="20" y="18" width="180" height="122" rx="8" fill="#08152e" stroke="#fb923c" strokeWidth="1.4" />
          <text x="110" y="36" textAnchor="middle" fill="#fdba74" fontSize="8.5" fontFamily="monospace" fontWeight="bold">1. LAUNCH SHAKER</text>
          <rect x="64" y="112" width="92" height="14" rx="3" fill="#334155" />
          <path d="M78 112 L84 98 M142 112 L136 98" stroke="#4fe3d4" strokeWidth="2.8" />
          <rect x="78" y="60" width="64" height="38" rx="5" fill="#0f172a" stroke="#f2c14e" strokeWidth="1.8" />
          <text x="110" y="83" textAnchor="middle" fill="#4fe3d4" fontSize="8" fontFamily="monospace" fontWeight="bold">SCORE ≥ 70</text>

          <rect x="220" y="18" width="180" height="122" rx="8" fill="#08152e" stroke="#38bdf8" strokeWidth="1.4" />
          <text x="310" y="36" textAnchor="middle" fill="#7dd3fc" fontSize="8.5" fontFamily="monospace" fontWeight="bold">2. -80°C CRYO FREEZE</text>
          <rect x="266" y="56" width="88" height="48" rx="6" fill="#0f172a" stroke="#fde047" strokeWidth="2" strokeDasharray="4 3" />
          <text x="310" y="84" textAnchor="middle" fill="#fed7aa" fontSize="8" fontFamily="monospace" fontWeight="bold">FOIL + HEATER</text>
          <text x="310" y="126" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="monospace" fontWeight="bold">KEEP ≥ -20°C</text>

          <text x="210" y="158" textAnchor="middle" fill="#4fe3d4" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            TOTAL WEIGHT LIMIT: MAX 500 KG
          </text>
        </svg>
      );

    case 5:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <circle cx="76" cy="92" r="24" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.8" />
          <text x="76" y="95" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">EARTH</text>
          <circle cx="336" cy="70" r="16" fill="#cbd5e1" stroke="#f8fafc" strokeWidth="1.6" />
          <text x="336" y="98" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontFamily="monospace" fontWeight="bold">MOON</text>

          <path d="M100 84 Q168 62 204 92" stroke="#fb7185" strokeWidth="1.6" strokeDasharray="4 4" />
          <text x="172" y="110" textAnchor="middle" fill="#fda4af" fontSize="7.5" fontFamily="monospace">&lt;45 kg: Falls short</text>

          <path d="M90 68 Q124 40 144 62" stroke="#fbbf24" strokeWidth="1.6" strokeDasharray="3 3" />
          <text x="122" y="34" textAnchor="middle" fill="#fde68a" fontSize="7.5" fontFamily="monospace">&gt;65 kg: Too heavy</text>

          <path d="M98 88 C176 38, 314 28, 366 64 C390 82, 342 114, 286 98 C206 78, 146 112, 96 112" stroke="#34d399" strokeWidth="2.5" />
          <text x="236" y="28" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            SWEET SPOT: 45–65 KG FUEL
          </text>
          <text x="210" y="154" textAnchor="middle" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
            FREE-RETURN LOOP AROUND THE MOON
          </text>
        </svg>
      );

    case 6:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <circle cx="44" cy="64" r="18" fill="#fbbf24" />
          <text x="44" y="96" textAnchor="middle" fill="#fde68a" fontSize="8" fontFamily="monospace">SUN</text>

          <circle cx="122" cy="64" r="8" fill="#38bdf8" />
          <text x="122" y="88" textAnchor="middle" fill="#7dd3fc" fontSize="7.5" fontFamily="monospace">EARTH</text>

          <path d="M136 64 Q236 40 344 64" stroke="#4fe3d4" strokeWidth="1.6" strokeDasharray="5 4" />
          <text x="240" y="38" textAnchor="middle" fill="#4fe3d4" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            ~40 MIN RADIO DELAY EACH WAY
          </text>

          <circle cx="360" cy="64" r="14" fill="#bae6fd" stroke="#e0f2fe" strokeWidth="1.4" />
          <text x="360" y="92" textAnchor="middle" fill="#bae6fd" fontSize="7.5" fontFamily="monospace">EUROPA (5.2× FAR)</text>

          <text x="210" y="128" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            SUNLIGHT IS 27× WEAKER → USE RTG / COLD BATTERY + DISH
          </text>
          <text x="210" y="148" textAnchor="middle" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
            CAPS: ≤ 120 KG WEIGHT · ≤ 850 SC · SCAN 4 ICE SITES
          </text>
        </svg>
      );

    case 7:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <line x1="18" y1="58" x2="402" y2="80" stroke="#fde047" strokeWidth="1.8" strokeDasharray="6 4" />
          <text x="90" y="50" fill="#fde047" fontSize="8" fontFamily="monospace" fontWeight="bold">LOW GRAZING SUNLIGHT</text>

          <path d="M24 100 L110 78 L166 138 L254 138 L310 78 L396 100 L396 150 L24 150 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.8" />
          <ellipse cx="210" cy="138" rx="44" ry="7" fill="#38bdf8" fillOpacity="0.65" stroke="#bae6fd" strokeWidth="1.2" />
          <text x="210" y="126" textAnchor="middle" fill="#bae6fd" fontSize="8" fontFamily="monospace" fontWeight="bold">DARK ICE (-190°C)</text>

          <rect x="194" y="28" width="32" height="16" rx="4" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.6" />
          <polygon points="210,44 176,134 244,134" fill="#4fe3d4" fillOpacity="0.14" stroke="#4fe3d4" strokeOpacity="0.45" strokeDasharray="3 3" />

          <text x="210" y="20" textAnchor="middle" fill="#4fe3d4" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            NEUTRON / CRYO-IR SENSOR (≤ 195 KG)
          </text>
          <text x="210" y="164" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="monospace" fontWeight="bold">
            ISRU: MOON ICE → WATER + OXYGEN + FUEL
          </text>
        </svg>
      );

    case 8:
      return (
        <svg viewBox="0 0 420 170" className="w-full h-auto max-h-[135px] mx-auto" fill="none">
          <rect width="420" height="170" rx="10" fill="#040c1f" />
          <rect x="46" y="68" width="74" height="38" rx="7" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.8" />
          <text x="83" y="91" textAnchor="middle" fill="#4fe3d4" fontSize="8" fontFamily="monospace" fontWeight="bold">RESCUE CRAFT</text>
          <polygon points="46,79 26,83 46,87" fill="#38bdf8" />

          <polyline points="120,87 180,76 238,90 266,86" stroke="#f2c14e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M266 79 L278 81 L273 86 L278 91 L266 93" stroke="#f2c14e" strokeWidth="2" />

          <circle cx="302" cy="79" r="9" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="294" y="89" width="16" height="19" rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.3" />
          <text x="302" y="124" textAnchor="middle" fill="#fda4af" fontSize="8" fontFamily="monospace" fontWeight="bold">ASTRONAUT</text>

          <text x="210" y="30" textAnchor="middle" fill="#34d399" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            MATCH RELATIVE SPEED ≈ 0 M/S BEFORE GRABBING
          </text>
          <text x="210" y="154" textAnchor="middle" fill="#f2c14e" fontSize="8" fontFamily="monospace" fontWeight="bold">
            RADAR → RADIO → DEBRIS → SPEED MATCH → AUTO RETRACT
          </text>
        </svg>
      );
  }
};
