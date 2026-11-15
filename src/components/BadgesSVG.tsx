import React from 'react';

export const RecruitBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="50%" stopColor="#f2c14e" />
        <stop offset="100%" stopColor="#b8860b" />
      </linearGradient>
      <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="navyBg" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#142c5c" />
        <stop offset="60%" stopColor="#081836" />
        <stop offset="100%" stopColor="#020919" />
      </radialGradient>
      <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#goldGrad)" filter="url(#badgeGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#silverGrad)" />
    <polygon points="100,18 166,40 166,118 100,174 34,118 34,40" fill="url(#navyBg)" />
    <circle cx="60" cy="55" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="140" cy="58" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="48" cy="85" r="1.2" fill="#fff" opacity="0.7" />
    <circle cx="152" cy="88" r="1.2" fill="#fff" opacity="0.7" />
    <circle cx="70" cy="110" r="1.2" fill="#fff" opacity="0.8" />
    <circle cx="130" cy="112" r="1.2" fill="#fff" opacity="0.8" />
    <ellipse cx="100" cy="88" rx="55" ry="18" stroke="url(#goldGrad)" strokeWidth="2.5" fill="none" transform="rotate(-20, 100, 88)" opacity="0.85" />
    <g transform="translate(100, 84)">
      <path d="M-4,18 Q0,38 0,42 Q0,38 4,18 Z" fill="#4fe3d4" opacity="0.85" />
      <path d="M-2,18 Q0,30 0,34 Q0,30 2,18 Z" fill="#fff" />
      <path d="M0,-34 C6,-24 8,-2 8,16 L-8,16 C-8,-2 -6,-24 0,-34 Z" fill="url(#silverGrad)" />
      <path d="M0,-34 C4,-26 5,-16 5,-10 L-5,-10 C-5,-16 -4,-26 0,-34 Z" fill="url(#goldGrad)" />
      <circle cx="0" cy="-2" r="3.2" fill="#081836" stroke="url(#goldGrad)" strokeWidth="1.2" />
      <path d="M-8,6 L-16,18 L-8,17 Z" fill="url(#goldGrad)" />
      <path d="M8,6 L16,18 L8,17 Z" fill="url(#goldGrad)" />
    </g>
    <g transform="translate(100, 150)">
      <path d="M-68,-12 L68,-12 L62,12 L-62,12 Z" fill="#040e24" stroke="url(#goldGrad)" strokeWidth="2" />
      <text x="0" y="4" fill="#ffffff" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" letterSpacing="1.5" textAnchor="middle">
        NEW RECRUIT
      </text>
    </g>
    <text x="100" y="34" fill="url(#goldGrad)" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="9" letterSpacing="2" textAnchor="middle">
      GALAXY-X
    </text>
  </svg>
);

export const SatelliteBuilderBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="satGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="45%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="satCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#4fe3d4" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
      <radialGradient id="satNavyGrad" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#142c5c" />
        <stop offset="60%" stopColor="#081836" />
        <stop offset="100%" stopColor="#020919" />
      </radialGradient>
      <filter id="satBadgeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Golden Outer Achievement Frame */}
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#satGoldGrad)" filter="url(#satBadgeGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#satCyanGrad)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#satNavyGrad)" />

    {/* Starfield Accents */}
    <circle cx="52" cy="52" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="148" cy="54" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="46" cy="84" r="1.3" fill="#fde047" opacity="0.85" />
    <circle cx="154" cy="88" r="1.3" fill="#4fe3d4" opacity="0.85" />
    <circle cx="64" cy="116" r="1.2" fill="#fff" opacity="0.8" />
    <circle cx="136" cy="116" r="1.2" fill="#fff" opacity="0.8" />

    {/* Orbital Trajectory Arc */}
    <ellipse cx="100" cy="86" rx="56" ry="18" stroke="url(#satGoldGrad)" strokeWidth="2" fill="none" transform="rotate(-18, 100, 86)" opacity="0.85" strokeDasharray="4 2" />

    {/* Left: Falcon-Inspired Orbital Launch Rocket */}
    <g transform="translate(69, 86) rotate(-14)">
      {/* Booster exhaust flame */}
      <polygon points="-4,26 4,26 0,38" fill="#fbbf24" />
      <polygon points="-2,26 2,26 0,33" fill="#ffffff" />
      {/* Aft landing legs (folded) */}
      <path d="M-7,12 L-10,25 L-6,25 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.7" />
      <path d="M7,12 L10,25 L6,25 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="0.7" />
      {/* First stage hull */}
      <rect x="-6" y="-2" width="12" height="27" rx="1.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
      {/* Interstage collar */}
      <rect x="-6.2" y="-8" width="12.4" height="6" fill="#0f172a" stroke="#4fe3d4" strokeWidth="0.7" />
      {/* Upper stage + payload fairing */}
      <rect x="-6" y="-16" width="12" height="8" fill="#e2e8f0" />
      <path d="M-6,-16 C-6,-28 0,-34 0,-34 C0,-34 6,-28 6,-16 Z" fill="#ffffff" stroke="#fde047" strokeWidth="1" />
      <line x1="0" y1="-34" x2="0" y2="-16" stroke="#94a3b8" strokeWidth="0.8" />
    </g>

    {/* Right: Orbital Earth Observation Satellite */}
    <g transform="translate(120, 78) rotate(12)">
      {/* Solar Wings */}
      <rect x="-32" y="-7" width="18" height="14" rx="1.5" fill="#1d4ed8" stroke="#38bdf8" strokeWidth="1.2" />
      <line x1="-23" y1="-7" x2="-23" y2="7" stroke="#93c5fd" strokeWidth="0.8" />
      <line x1="-14" y1="0" x2="-9" y2="0" stroke="#cbd5e1" strokeWidth="1.6" />
      <rect x="14" y="-7" width="18" height="14" rx="1.5" fill="#1d4ed8" stroke="#38bdf8" strokeWidth="1.2" />
      <line x1="23" y1="-7" x2="23" y2="7" stroke="#93c5fd" strokeWidth="0.8" />
      <line x1="9" y1="0" x2="14" y2="0" stroke="#cbd5e1" strokeWidth="1.6" />
      {/* Gold MLI Bus */}
      <rect x="-9" y="-10" width="18" height="20" rx="2.5" fill="url(#satGoldGrad)" stroke="#ffffff" strokeWidth="1.2" />
      <rect x="-5.5" y="-6" width="11" height="10" rx="1" fill="#0f172a" stroke="#4fe3d4" strokeWidth="0.8" />
      {/* Dish */}
      <path d="M-6,-12 Q0,-19 6,-12" stroke="#ffffff" strokeWidth="1.6" fill="none" />
      <line x1="0" y1="-10" x2="0" y2="-15" stroke="#4fe3d4" strokeWidth="1.3" />
      <circle cx="0" cy="-16" r="1.4" fill="#fde047" />
      {/* Camera aperture */}
      <circle cx="0" cy="12" r="2.2" fill="#38bdf8" stroke="#e2e8f0" strokeWidth="0.8" />
    </g>

    {/* Top GALAXY-X Branding */}
    <text x="100" y="34" fill="url(#satGoldGrad)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    {/* Bottom Ribbon */}
    <g transform="translate(100, 150)">
      <path d="M-72,-12 L72,-12 L65,12 L-65,12 Z" fill="#030b1c" stroke="url(#satGoldGrad)" strokeWidth="2.2" />
      <text x="0" y="4" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="10" letterSpacing="1.2" textAnchor="middle">
        SATELLITE BUILDER
      </text>
    </g>
  </svg>
);

export const SatelliteIllustrationSVG: React.FC<{ className?: string }> = ({ className = 'w-20 h-14' }) => (
  <svg className={className} viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="illGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="illSolar" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    {/* Orbital arc */}
    <ellipse cx="80" cy="54" rx="70" ry="20" stroke="#4fe3d4" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 4" />
    {/* Left Solar Wing */}
    <rect x="12" y="38" width="38" height="24" rx="2" fill="url(#illSolar)" stroke="#38bdf8" strokeWidth="1.4" />
    <line x1="25" y1="38" x2="25" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="38" y1="38" x2="38" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="12" y1="50" x2="50" y2="50" stroke="#60a5fa" strokeWidth="1" />
    <line x1="50" y1="50" x2="64" y2="50" stroke="#cbd5e1" strokeWidth="2.5" />
    {/* Right Solar Wing */}
    <rect x="110" y="38" width="38" height="24" rx="2" fill="url(#illSolar)" stroke="#38bdf8" strokeWidth="1.4" />
    <line x1="122" y1="38" x2="122" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="135" y1="38" x2="135" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="110" y1="50" x2="148" y2="50" stroke="#60a5fa" strokeWidth="1" />
    <line x1="96" y1="50" x2="110" y2="50" stroke="#cbd5e1" strokeWidth="2.5" />
    {/* Octagonal Gold MLI Core */}
    <rect x="64" y="32" width="32" height="36" rx="4" fill="url(#illGold)" stroke="#f8fafc" strokeWidth="1.5" />
    <rect x="70" y="39" width="20" height="12" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
    <circle cx="76" cy="45" r="2" fill="#4fe3d4" />
    <circle cx="84" cy="45" r="2" fill="#f2c14e" />
    {/* Zenith Comms Dish */}
    <path d="M70,22 Q80,12 90,22" stroke="#f8fafc" strokeWidth="2.2" fill="none" />
    <line x1="80" y1="32" x2="80" y2="21" stroke="#4fe3d4" strokeWidth="2" />
    <circle cx="80" cy="17" r="2.2" fill="#fde047" />
    {/* Nadir Optical Lens */}
    <rect x="73" y="68" width="14" height="8" rx="1.5" fill="#1e293b" stroke="#4fe3d4" strokeWidth="1.2" />
    <circle cx="80" cy="74" r="3" fill="#38bdf8" />
  </svg>
);

export const RocketCommanderBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rcGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="rcFlame" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
      <radialGradient id="rcBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="65%" stopColor="#09152e" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
    </defs>
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#rcGold)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="#38bdf8" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#rcBg)" />
    <circle cx="52" cy="52" r="1.5" fill="#fff" opacity="0.85" />
    <circle cx="148" cy="56" r="1.5" fill="#fff" opacity="0.85" />
    <circle cx="58" cy="112" r="1.3" fill="#4fe3d4" />
    <circle cx="144" cy="110" r="1.3" fill="#fde047" />
    <path d="M40 112 Q100 130 160 112" stroke="#38bdf8" strokeWidth="2.5" fill="none" opacity="0.7" />
    <g transform="translate(100, 80)">
      <polygon points="-9,24 9,24 0,50" fill="url(#rcFlame)" />
      <rect x="-9" y="-12" width="18" height="36" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
      <rect x="-9" y="-18" width="18" height="6" fill="#0f172a" stroke="#4fe3d4" strokeWidth="0.9" />
      <path d="M-9,-18 C-9,-36 0,-44 0,-44 C0,-44 9,-36 9,-18 Z" fill="#f8fafc" stroke="url(#rcGold)" strokeWidth="1.2" />
      <path d="M-9,10 L-18,26 L-9,24 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.9" />
      <path d="M9,10 L18,26 L9,24 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.9" />
      <circle cx="0" cy="-2" r="3.5" fill="#38bdf8" />
    </g>
    <text x="100" y="34" fill="url(#rcGold)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>
    <g transform="translate(100, 150)">
      <path d="M-74,-12 L74,-12 L67,12 L-67,12 Z" fill="#030b1c" stroke="url(#rcGold)" strokeWidth="2.2" />
      <text x="0" y="4" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="9.5" letterSpacing="1.1" textAnchor="middle">
        LAUNCH COMMANDER
      </text>
    </g>
  </svg>
);

export const OrbitPowerEngineerBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="opeGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="opeCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#4fe3d4" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
      <radialGradient id="opeBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#122b57" />
        <stop offset="65%" stopColor="#071530" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
      <linearGradient id="opeEarthLit" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="48%" stopColor="#0284c7" />
        <stop offset="56%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <filter id="opeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Badge Shield Frame */}
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#opeGold)" filter="url(#opeGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#opeCyan)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#opeBg)" />

    {/* Star Accents */}
    <circle cx="48" cy="52" r="1.4" fill="#fde047" />
    <circle cx="152" cy="54" r="1.4" fill="#fff" />
    <circle cx="46" cy="108" r="1.2" fill="#4fe3d4" />
    <circle cx="154" cy="104" r="1.3" fill="#38bdf8" />

    {/* Orbital Ring */}
    <ellipse cx="100" cy="86" rx="54" ry="20" stroke="#4fe3d4" strokeWidth="2.2" fill="none" transform="rotate(-16, 100, 86)" strokeDasharray="5 3" opacity="0.9" />

    {/* Center Rotating Earth (Day Left / Night Right) */}
    <circle cx="100" cy="86" r="24" fill="url(#opeEarthLit)" stroke="#4fe3d4" strokeWidth="1.5" />
    <path d="M84 74 C90 70, 95 76, 92 84 C88 89, 81 86, 84 74 Z" fill="#34d399" opacity="0.9" />
    <path d="M88 92 C94 90, 98 96, 94 103 C89 102, 85 97, 88 92 Z" fill="#22c55e" opacity="0.85" />
    <circle cx="111" cy="82" r="1.1" fill="#fbbf24" />
    <circle cx="115" cy="91" r="1.1" fill="#fbbf24" />
    <circle cx="108" cy="95" r="0.9" fill="#fde047" />

    {/* Orbiting Satellite with Glowing Solar Panels (Top-Left Sunlit Position) */}
    <g transform="translate(64, 66) rotate(-18)">
      <rect x="-20" y="-4.5" width="12" height="9" rx="1" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.1" />
      <rect x="8" y="-4.5" width="12" height="9" rx="1" fill="#fbbf24" stroke="#fef08a" strokeWidth="1.1" />
      <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#eab308" stroke="#ffffff" strokeWidth="1.1" />
      <circle cx="0" cy="0" r="2" fill="#4fe3d4" />
    </g>

    {/* High-Tech Battery Energy Emblem (Bottom-Right Orbit Anchor) */}
    <g transform="translate(141, 102)">
      <rect x="-11" y="-8" width="22" height="15" rx="2.5" fill="#041124" stroke="#34d399" strokeWidth="1.6" />
      <rect x="11" y="-3.5" width="3" height="6" rx="1" fill="#34d399" />
      <rect x="-8" y="-5" width="13" height="9" rx="1" fill="#34d399" />
      <polygon points="1,-5 -3,0 0,0 -1,5 4,-1 1,-1" fill="#fde047" />
    </g>

    {/* Top GALAXY-X Branding */}
    <text x="100" y="34" fill="url(#opeGold)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    {/* Bottom Ribbon */}
    <g transform="translate(100, 150)">
      <path d="M-76,-12 L76,-12 L69,12 L-69,12 Z" fill="#030b1c" stroke="url(#opeGold)" strokeWidth="2.2" />
      <text x="0" y="3.8" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.6" letterSpacing="0.85" textAnchor="middle">
        ORBIT POWER ENGINEER
      </text>
    </g>
  </svg>
);

export const RocketLaunchIllustrationSVG: React.FC<{ className?: string }> = ({ className = 'w-24 h-16' }) => (
  <svg className={className} viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rlFlame" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="45%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Pad & Gantry */}
    <rect x="26" y="84" width="108" height="6" rx="2" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
    <rect x="44" y="24" width="10" height="60" fill="#334155" stroke="#64748b" strokeWidth="1" />
    <line x1="54" y1="36" x2="72" y2="36" stroke="#4fe3d4" strokeWidth="2" />
    {/* Exhaust Plume */}
    <polygon points="73,68 87,68 92,90 68,90" fill="url(#rlFlame)" />
    {/* Two-stage Rocket */}
    <rect x="73" y="36" width="14" height="32" rx="1.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
    <rect x="73" y="30" width="14" height="6" fill="#0f172a" stroke="#4fe3d4" strokeWidth="0.8" />
    <path d="M73,30 C73,16 80,10 80,10 C80,10 87,16 87,30 Z" fill="#ffffff" stroke="#fbbf24" strokeWidth="1.2" />
    <path d="M73,58 L65,70 L73,68 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
    <path d="M87,58 L95,70 L87,68 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
  </svg>
);

export const EarthOrbitIllustrationSVG: React.FC<{ className?: string }> = ({ className = 'w-28 h-20' }) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eoSun" cx="0%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#fffbeb" />
        <stop offset="45%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="eoEarth" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="48%" stopColor="#0284c7" />
        <stop offset="56%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    {/* Left Sun Glow */}
    <circle cx="8" cy="55" r="34" fill="url(#eoSun)" />
    <circle cx="4" cy="55" r="14" fill="#fef08a" />
    {/* Sunlight Rays */}
    <line x1="22" y1="36" x2="62" y2="36" stroke="#fde047" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
    <line x1="24" y1="55" x2="62" y2="55" stroke="#fde047" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="4 4" />
    <line x1="22" y1="74" x2="62" y2="74" stroke="#fde047" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
    {/* Earth Shadow Cone */}
    <polygon points="96,29 175,18 175,92 96,81" fill="#020617" opacity="0.55" />
    {/* Circular Orbit Ring */}
    <circle cx="96" cy="55" r="44" stroke="#4fe3d4" strokeWidth="2" strokeDasharray="5 3" opacity="0.85" />
    {/* Earth Sphere */}
    <circle cx="96" cy="55" r="25" fill="url(#eoEarth)" stroke="#38bdf8" strokeWidth="1.5" />
    <path d="M80 44 C87 40, 91 48, 88 55 C83 59, 77 54, 80 44 Z" fill="#34d399" opacity="0.9" />
    <path d="M84 62 C90 60, 93 66, 90 73 C85 72, 81 67, 84 62 Z" fill="#22c55e" opacity="0.85" />
    <circle cx="109" cy="49" r="1.2" fill="#fbbf24" />
    <circle cx="113" cy="59" r="1.2" fill="#fbbf24" />
    <circle cx="106" cy="64" r="1" fill="#fde047" />
    {/* Sunlit Satellite on Orbit */}
    <g transform="translate(65, 24) rotate(-25)">
      <rect x="-18" y="-4" width="11" height="8" rx="1" fill="#fbbf24" stroke="#fef08a" strokeWidth="1" />
      <rect x="7" y="-4" width="11" height="8" rx="1" fill="#fbbf24" stroke="#fef08a" strokeWidth="1" />
      <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="#eab308" stroke="#fff" strokeWidth="1" />
      <circle cx="0" cy="0" r="1.8" fill="#4fe3d4" />
    </g>
  </svg>
);

export const ThermalProtectionEngineerBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tpeOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="48%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="tpeBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <radialGradient id="tpeBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#10254b" />
        <stop offset="65%" stopColor="#071329" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
      <filter id="tpeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Hexagonal Shield Outer Frame */}
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#tpeOrangeGrad)" filter="url(#tpeGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#tpeBlueGrad)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#tpeBg)" />

    {/* Dual Thermal & Cryo Ring */}
    <path d="M52 86 A48 48 0 0 1 148 86" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4" fill="none" opacity="0.85" />
    <path d="M52 86 A48 48 0 0 0 148 86" stroke="#f97316" strokeWidth="3" strokeDasharray="6 4" fill="none" opacity="0.85" />

    {/* Protective Armor Shield Surrounding Satellite */}
    <path
      d="M66 64 L100 50 L134 64 L130 105 L100 122 L70 105 Z"
      fill="#0d1e3b"
      fillOpacity="0.85"
      stroke="url(#tpeBlueGrad)"
      strokeWidth="2.5"
    />

    {/* Center Protected Communications Satellite */}
    <g transform="translate(100, 84)">
      {/* Solar Panels */}
      <rect x="-34" y="-7" width="18" height="14" rx="1.5" fill="#1d4ed8" stroke="#38bdf8" strokeWidth="1.2" />
      <rect x="16" y="-7" width="18" height="14" rx="1.5" fill="#1d4ed8" stroke="#38bdf8" strokeWidth="1.2" />
      <line x1="-16" y1="0" x2="-11" y2="0" stroke="#cbd5e1" strokeWidth="2" />
      <line x1="11" y1="0" x2="16" y2="0" stroke="#cbd5e1" strokeWidth="2" />
      {/* Reinforced MLI Core */}
      <rect x="-11" y="-12" width="22" height="24" rx="3" fill="url(#tpeOrangeGrad)" stroke="#ffffff" strokeWidth="1.3" />
      {/* Heater Coil Symbol inside Core */}
      <path d="M-5 -4 L-2 4 L1 -4 L4 4 L7 -4" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Top Comms Dish */}
      <path d="M-7 -15 Q0 -23 7 -15" stroke="#f8fafc" strokeWidth="2" fill="none" />
      <line x1="0" y1="-12" x2="0" y2="-19" stroke="#38bdf8" strokeWidth="1.5" />
    </g>

    {/* Left: Cryo Snowflake / Cold Test Symbol */}
    <g transform="translate(50, 86)" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round">
      <line x1="0" y1="-9" x2="0" y2="9" />
      <line x1="-8" y1="-4.5" x2="8" y2="4.5" />
      <line x1="-8" y1="4.5" x2="8" y2="-4.5" />
    </g>

    {/* Right: Thermometer & Thermal Symbol */}
    <g transform="translate(150, 86)">
      <rect x="-3.5" y="-12" width="7" height="18" rx="3.5" fill="#071329" stroke="#f97316" strokeWidth="1.6" />
      <circle cx="0" cy="8" r="5" fill="#f97316" stroke="#fde047" strokeWidth="1.2" />
      <rect x="-1.5" y="-5" width="3" height="12" rx="1.5" fill="#fde047" />
    </g>

    {/* Top GALAXY-X Branding */}
    <text x="100" y="33" fill="#7dd3fc" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    {/* Bottom Ribbon */}
    <g transform="translate(100, 150)">
      <path d="M-78,-12 L78,-12 L71,12 L-71,12 Z" fill="#030b1c" stroke="url(#tpeOrangeGrad)" strokeWidth="2.2" />
      <text x="0" y="3.5" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="7.4" letterSpacing="0.55" textAnchor="middle">
        THERMAL PROTECTION ENGINEER
      </text>
    </g>
  </svg>
);

export const ShakeFreezeIllustrationSVG: React.FC<{ className?: string }> = ({ className = 'w-28 h-20' }) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left Half: Orange Heat & Shaker Waves */}
    <path d="M22 36 Q14 55 22 74" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M32 42 Q26 55 32 68" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    {/* Right Half: Cryo Ice Blue Zone */}
    <path d="M158 36 Q166 55 158 74" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M148 42 Q154 55 148 68" stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    {/* Protective Armor Hexagon */}
    <polygon points="90,16 126,34 126,76 90,94 54,76 54,34" fill="#0a1936" stroke="#38bdf8" strokeWidth="2" />
    {/* Solar Wings */}
    <rect x="34" y="47" width="22" height="16" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
    <rect x="124" y="47" width="22" height="16" rx="2" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
    {/* Armored Satellite Core */}
    <rect x="74" y="37" width="32" height="36" rx="4" fill="#d97706" stroke="#fef08a" strokeWidth="1.6" />
    {/* Heater Coil Icon */}
    <path d="M81 55 L85 48 L89 62 L93 48 L97 55" stroke="#fef08a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Dish */}
    <path d="M80 28 Q90 20 100 28" stroke="#f8fafc" strokeWidth="2" fill="none" />
    <line x1="90" y1="37" x2="90" y2="27" stroke="#4fe3d4" strokeWidth="1.8" />
  </svg>
);

export type StoryVisualKind =
  | 'satellite'
  | 'rocket'
  | 'orbit'
  | 'shake_freeze'
  | 'lunar'
  | 'europa'
  | 'tanker'
  | 'infrared'
  | 'mars_rtg'
  | 'constellation'
  | 'solar_flare';

export const EuropaIllustrationSVG: React.FC<{ className?: string }> = ({ className = 'w-28 h-20' }) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="euIceBall" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f0f9ff" />
        <stop offset="55%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </radialGradient>
      <radialGradient id="euJup" cx="40%" cy="40%" r="65%">
        <stop offset="0%" stopColor="#fed7aa" />
        <stop offset="60%" stopColor="#c2410c" />
        <stop offset="100%" stopColor="#431407" />
      </radialGradient>
    </defs>
    {/* Distant Jupiter */}
    <circle cx="32" cy="30" r="18" fill="url(#euJup)" opacity="0.9" />
    <path d="M15 27 Q32 23 49 27" stroke="#fef3c7" strokeWidth="1.5" opacity="0.55" />
    <path d="M16 34 Q32 37 48 34" stroke="#7c2d12" strokeWidth="1.8" opacity="0.6" />
    {/* Europa Ice Moon */}
    <circle cx="114" cy="56" r="36" fill="url(#euIceBall)" stroke="#38bdf8" strokeWidth="1.6" />
    {/* Fractured Ice Lineae */}
    <path d="M84 44 Q112 36 144 50" stroke="#0369a1" strokeWidth="1.4" opacity="0.7" />
    <path d="M80 62 Q114 70 146 58" stroke="#0284c7" strokeWidth="1.6" opacity="0.65" />
    <path d="M98 25 Q116 55 104 88" stroke="#0c4a6e" strokeWidth="1.2" opacity="0.55" />
    {/* Thermometer Probe on Rim */}
    <g transform="translate(76, 56) rotate(-25)">
      <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.2" />
      <line x1="-8" y1="6" x2="-13" y2="14" stroke="#cbd5e1" strokeWidth="1.8" />
      <line x1="8" y1="6" x2="13" y2="14" stroke="#cbd5e1" strokeWidth="1.8" />
      <line x1="0" y1="6" x2="0" y2="18" stroke="#4fe3d4" strokeWidth="2.2" />
      <path d="M-5 -10 Q0 -16 5 -10" stroke="#4fe3d4" strokeWidth="1.6" fill="none" />
    </g>
  </svg>
);

export const StoryChapterVisualSVG: React.FC<{ kind: StoryVisualKind; className?: string }> = ({
  kind,
  className = 'w-44 h-28',
}) => {
  if (kind === 'satellite') return <SatelliteIllustrationSVG className={className} />;
  if (kind === 'rocket') return <RocketLaunchIllustrationSVG className={className} />;
  if (kind === 'orbit') return <EarthOrbitIllustrationSVG className={className} />;
  if (kind === 'shake_freeze') return <ShakeFreezeIllustrationSVG className={className} />;
  if (kind === 'europa') return <EuropaIllustrationSVG className={className} />;

  if (kind === 'lunar') {
    return (
      <svg className={className} viewBox="0 0 180 110" fill="none">
        <circle cx="128" cy="56" r="34" fill="#cbd5e1" />
        <path d="M128 22 A34 34 0 0 1 128 90 A22 34 0 0 0 128 22 Z" fill="#475569" opacity="0.65" />
        <circle cx="118" cy="46" r="6" fill="#94a3b8" />
        <circle cx="136" cy="68" r="8" fill="#64748b" />
        {/* South Pole Ice Crystal */}
        <circle cx="128" cy="84" r="5" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.2" />
        {/* Trajectory Arc from Earth */}
        <circle cx="28" cy="66" r="14" fill="#0284c7" stroke="#4fe3d4" strokeWidth="1.5" />
        <path d="M40 56 Q80 16 112 40" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 4" fill="none" />
        <polygon points="109,34 118,42 108,44" fill="#fbbf24" />
      </svg>
    );
  }

  if (kind === 'tanker') {
    return (
      <svg className={className} viewBox="0 0 180 110" fill="none">
        <rect x="26" y="42" width="44" height="26" rx="5" fill="#0ea5e9" stroke="#7dd3fc" strokeWidth="1.6" />
        <line x1="70" y1="55" x2="104" y2="55" stroke="#4fe3d4" strokeWidth="3" strokeDasharray="4 3" />
        <rect x="108" y="40" width="42" height="30" rx="5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.6" />
        <circle cx="48" cy="55" r="6" fill="#fef08a" />
        <circle cx="129" cy="55" r="6" fill="#38bdf8" />
      </svg>
    );
  }

  if (kind === 'infrared') {
    return (
      <svg className={className} viewBox="0 0 180 110" fill="none">
        <circle cx="90" cy="55" r="32" fill="#082f49" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="90" cy="55" r="18" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
        <circle cx="90" cy="55" r="7" fill="#ef4444" stroke="#fde047" strokeWidth="1.5" />
        <circle cx="145" cy="36" r="9" fill="#64748b" />
        <circle cx="145" cy="36" r="14" stroke="#f97316" strokeWidth="1.2" strokeDasharray="3 3" />
      </svg>
    );
  }

  if (kind === 'mars_rtg') {
    return (
      <svg className={className} viewBox="0 0 180 110" fill="none">
        <circle cx="122" cy="58" r="32" fill="#c2410c" stroke="#fb923c" strokeWidth="2" />
        <circle cx="114" cy="48" r="6" fill="#9a3412" />
        <circle cx="132" cy="66" r="8" fill="#7c2d12" />
        <rect x="34" y="42" width="38" height="26" rx="4" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.8" />
        <circle cx="53" cy="55" r="7" fill="#f97316" />
      </svg>
    );
  }

  if (kind === 'constellation') {
    return (
      <svg className={className} viewBox="0 0 180 110" fill="none">
        <circle cx="90" cy="58" r="22" fill="#ea580c" stroke="#fdba74" strokeWidth="1.8" />
        <polygon points="90,14 42,84 138,84" stroke="#4fe3d4" strokeWidth="1.8" strokeDasharray="5 4" fill="none" />
        <circle cx="90" cy="14" r="6" fill="#38bdf8" />
        <circle cx="42" cy="84" r="6" fill="#38bdf8" />
        <circle cx="138" cy="84" r="6" fill="#38bdf8" />
      </svg>
    );
  }

  // solar_flare
  return (
    <svg className={className} viewBox="0 0 180 110" fill="none">
      <circle cx="24" cy="55" r="24" fill="#f59e0b" />
      <path d="M48 34 Q75 55 48 76" stroke="#fde047" strokeWidth="3" fill="none" />
      <path d="M98 22 Q74 55 98 88" stroke="#38bdf8" strokeWidth="3.5" fill="none" />
      <rect x="114" y="42" width="36" height="26" rx="4" fill="#1e293b" stroke="#4fe3d4" strokeWidth="1.8" />
    </svg>
  );
};

export const LunarFlybyIllustrationSVG: React.FC<{ className?: string }> = ({
  className = 'w-28 h-20',
}) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="lfiEarth" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </radialGradient>
      <radialGradient id="lfiMoon" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#64748b" />
      </radialGradient>
    </defs>
    {/* Earth */}
    <circle cx="32" cy="70" r="18" fill="url(#lfiEarth)" stroke="#4fe3d4" strokeWidth="1.5" />
    <path d="M24 62 C29 58, 36 63, 33 70 C28 74, 21 71, 24 62 Z" fill="#34d399" opacity="0.88" />
    {/* Moon */}
    <circle cx="140" cy="40" r="22" fill="url(#lfiMoon)" stroke="#cbd5e1" strokeWidth="1.4" />
    <circle cx="133" cy="34" r="4.5" fill="#94a3b8" opacity="0.65" />
    <circle cx="147" cy="47" r="6" fill="#64748b" opacity="0.55" />
    {/* Flyby Transfer Trajectory */}
    <path
      d="M46 58 Q88 10 158 24"
      stroke="#22d3ee"
      strokeWidth="2.4"
      strokeDasharray="5 3"
      fill="none"
    />
    <polygon points="154,19 164,25 153,28" fill="#4fe3d4" />
    {/* Probe */}
    <g transform="translate(96, 28) rotate(-18)">
      <rect x="-14" y="-3.5" width="9" height="7" rx="1" fill="#2563eb" stroke="#93c5fd" strokeWidth="0.9" />
      <rect x="5" y="-3.5" width="9" height="7" rx="1" fill="#2563eb" stroke="#93c5fd" strokeWidth="0.9" />
      <rect x="-5" y="-5" width="10" height="10" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
      <polygon points="-3,5 3,5 0,11" fill="#38bdf8" />
    </g>
  </svg>
);

export const PropulsionEngineerBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="peGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="peCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="50%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <radialGradient id="peBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#0f2b56" />
        <stop offset="65%" stopColor="#07142b" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
      <filter id="peGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#peCyan)" filter="url(#peGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#peGold)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#peBg)" />

    <circle cx="50" cy="52" r="1.4" fill="#fde047" />
    <circle cx="150" cy="54" r="1.4" fill="#ffffff" />
    <circle cx="48" cy="108" r="1.3" fill="#22d3ee" />
    <circle cx="152" cy="108" r="1.3" fill="#4fe3d4" />

    {/* Earth -> Moon Flyby Arc */}
    <circle cx="58" cy="104" r="13" fill="#0284c7" stroke="#4fe3d4" strokeWidth="1.5" />
    <path d="M52 99 C57 95, 62 100, 59 106 C54 108, 50 104, 52 99 Z" fill="#34d399" />

    <circle cx="142" cy="64" r="16" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.4" />
    <circle cx="137" cy="59" r="3.2" fill="#94a3b8" />
    <circle cx="146" cy="69" r="4.2" fill="#64748b" />

    <path d="M68 92 Q96 46 154 46" stroke="#22d3ee" strokeWidth="2.4" strokeDasharray="5 3" fill="none" />

    {/* Lunar Probe + Fuel Nozzle */}
    <g transform="translate(102, 74) rotate(-24)">
      <polygon points="-5,14 5,14 0,30" fill="#38bdf8" />
      <polygon points="-2.5,14 2.5,14 0,24" fill="#fef08a" />
      <rect x="-24" y="-5" width="14" height="10" rx="1.5" fill="#1d4ed8" stroke="#67e8f9" strokeWidth="1.2" />
      <rect x="10" y="-5" width="14" height="10" rx="1.5" fill="#1d4ed8" stroke="#67e8f9" strokeWidth="1.2" />
      <rect x="-9" y="-9" width="18" height="20" rx="3" fill="url(#peGold)" stroke="#ffffff" strokeWidth="1.3" />
      <rect x="-5" y="-5" width="10" height="12" rx="1.5" fill="#07142b" stroke="#22d3ee" strokeWidth="1" />
      <rect x="-3" y="-1" width="6" height="6" rx="1" fill="#34d399" />
      <path d="M-6 -12 Q0 -19 6 -12" stroke="#f8fafc" strokeWidth="1.8" fill="none" />
      <line x1="0" y1="-9" x2="0" y2="-16" stroke="#22d3ee" strokeWidth="1.4" />
    </g>

    <text x="100" y="34" fill="#67e8f9" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    <g transform="translate(100, 150)">
      <path d="M-76,-12 L76,-12 L69,12 L-69,12 Z" fill="#030b1c" stroke="url(#peCyan)" strokeWidth="2.2" />
      <text x="0" y="3.8" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.6" letterSpacing="0.9" textAnchor="middle">
        PROPULSION ENGINEER
      </text>
    </g>
  </svg>
);

export const MarsIllustrationSVG: React.FC<{ className?: string }> = ({
  className = 'w-28 h-20',
}) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="miEarth" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </radialGradient>
      <radialGradient id="miMars" cx="35%" cy="35%" r="68%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="55%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </radialGradient>
    </defs>
    {/* Distant Earth */}
    <circle cx="26" cy="74" r="14" fill="url(#miEarth)" stroke="#4fe3d4" strokeWidth="1.2" />
    <path d="M20 69 C24 66, 29 70, 27 76 C23 79, 18 75, 20 69 Z" fill="#34d399" opacity="0.85" />
    {/* Transfer Arc */}
    <path d="M38 64 Q88 18 124 44" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 3" fill="none" />
    {/* Mars & Capture Ring */}
    <ellipse cx="136" cy="52" rx="34" ry="15" stroke="#4fe3d4" strokeWidth="1.6" strokeDasharray="4 3" transform="rotate(-18 136 52)" />
    <circle cx="136" cy="52" r="24" fill="url(#miMars)" stroke="#fdba74" strokeWidth="1.5" />
    <circle cx="128" cy="44" r="4.5" fill="#9a3412" opacity="0.65" />
    <circle cx="144" cy="58" r="6" fill="#7c2d12" opacity="0.55" />
    <path d="M126 31 Q136 27 146 31" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
    {/* RTG Science Orbiter */}
    <g transform="translate(88, 30) rotate(-14)">
      <rect x="-7" y="-5" width="14" height="10" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.1" />
      <rect x="-15" y="-2.5" width="8" height="5" rx="1" fill="#334155" stroke="#fbbf24" strokeWidth="1" />
      <circle cx="-11" cy="0" r="1.5" fill="#fde047" />
      <path d="M7 -4 L12 0 L7 4" stroke="#4fe3d4" strokeWidth="1.4" fill="none" />
    </g>
  </svg>
);

export const MarsExplorerBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="meGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="48%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="meCopper" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>
      <radialGradient id="meBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#2c1220" />
        <stop offset="60%" stopColor="#140c24" />
        <stop offset="100%" stopColor="#040714" />
      </radialGradient>
      <radialGradient id="meMars" cx="35%" cy="35%" r="68%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="55%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
      <filter id="meGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Gold & Metallic Outer Shield */}
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#meGold)" filter="url(#meGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#meCopper)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#meBg)" />

    {/* Starfield */}
    <circle cx="48" cy="52" r="1.5" fill="#fef08a" />
    <circle cx="152" cy="54" r="1.5" fill="#ffffff" />
    <circle cx="46" cy="108" r="1.2" fill="#4fe3d4" />
    <circle cx="154" cy="106" r="1.3" fill="#fdba74" />

    {/* Orbit Ellipse */}
    <ellipse cx="100" cy="86" rx="58" ry="20" stroke="#4fe3d4" strokeWidth="2.2" fill="none" transform="rotate(-18, 100, 86)" strokeDasharray="5 3" opacity="0.9" />

    {/* Mars Planet */}
    <circle cx="100" cy="86" r="28" fill="url(#meMars)" stroke="#fdba74" strokeWidth="1.8" />
    <path d="M88 61 Q100 57 112 61" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <circle cx="88" cy="82" r="5.5" fill="#9a3412" opacity="0.65" />
    <circle cx="111" cy="95" r="7" fill="#7f1d1d" opacity="0.55" />
    <circle cx="103" cy="76" r="3.5" fill="#9a3412" opacity="0.55" />

    {/* RTG Mars Science Orbiter */}
    <g transform="translate(138, 66) rotate(-22)">
      <rect x="-18" y="-3" width="10" height="6" rx="1.2" fill="#334155" stroke="#fbbf24" strokeWidth="1.2" />
      <circle cx="-13" cy="0" r="1.8" fill="#fde047" />
      <rect x="-7" y="-7" width="15" height="14" rx="2.5" fill="url(#meGold)" stroke="#ffffff" strokeWidth="1.2" />
      <circle cx="0" cy="0" r="2.6" fill="#4fe3d4" />
      <path d="M8 -5 Q14 0 8 5" stroke="#f8fafc" strokeWidth="1.8" fill="none" />
    </g>

    {/* Top GALAXY-X Header */}
    <text x="100" y="34" fill="url(#meGold)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    {/* Bottom Ribbon */}
    <g transform="translate(100, 150)">
      <path d="M-74,-12 L74,-12 L67,12 L-67,12 Z" fill="#070514" stroke="url(#meGold)" strokeWidth="2.2" />
      <text x="0" y="4" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="10" letterSpacing="1.2" textAnchor="middle">
        MARS EXPLORER
      </text>
    </g>
  </svg>
);

export const ThermalTelemetrySpecialistBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ttsCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="ttsGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <radialGradient id="ttsBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#0e2a55" />
        <stop offset="65%" stopColor="#06142c" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
      <radialGradient id="ttsEuropa" cx="35%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#f0f9ff" />
        <stop offset="55%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </radialGradient>
      <filter id="ttsGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#ttsCyan)" filter="url(#ttsGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#ttsGold)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#ttsBg)" />

    <circle cx="48" cy="54" r="1.4" fill="#bae6fd" />
    <circle cx="152" cy="54" r="1.4" fill="#fef08a" />
    <circle cx="46" cy="108" r="1.3" fill="#4fe3d4" />
    <circle cx="154" cy="106" r="1.3" fill="#38bdf8" />

    {/* Europa Sphere */}
    <circle cx="96" cy="90" r="28" fill="url(#ttsEuropa)" stroke="#7dd3fc" strokeWidth="1.6" />
    <path d="M72 82 Q96 74 120 86" stroke="#0369a1" strokeWidth="1.6" opacity="0.7" />
    <path d="M71 96 Q96 104 122 93" stroke="#0c4a6e" strokeWidth="1.4" opacity="0.6" />

    {/* Precision Cryo Thermometer + Signal Waves */}
    <g transform="translate(132, 74)">
      <rect x="-6" y="-22" width="12" height="36" rx="6" fill="#061124" stroke="#4fe3d4" strokeWidth="1.8" />
      <circle cx="0" cy="18" r="9" fill="#061124" stroke="#4fe3d4" strokeWidth="1.8" />
      <circle cx="0" cy="18" r="5.5" fill="#38bdf8" />
      <rect x="-2.4" y="-8" width="4.8" height="24" rx="2" fill="#38bdf8" />
      <path d="M12 -18 Q18 -12 12 -6" stroke="#fbbf24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M17 -23 Q26 -12 17 -1" stroke="#4fe3d4" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>

    <text x="100" y="34" fill="#bae6fd" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    <g transform="translate(100, 150)">
      <path d="M-80,-12 L80,-12 L73,12 L-73,12 Z" fill="#030b1c" stroke="url(#ttsCyan)" strokeWidth="2.2" />
      <text x="0" y="3.8" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="7.4" letterSpacing="0.65" textAnchor="middle">
        THERMAL TELEMETRY SPEC
      </text>
    </g>
  </svg>
);

export const LunarWaterIllustrationSVG: React.FC<{ className?: string }> = ({
  className = 'w-28 h-20',
}) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="lwiMoon" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="55%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#334155" />
      </radialGradient>
    </defs>
    {/* Lunar South Pole Orbiter */}
    <circle cx="94" cy="58" r="36" fill="url(#lwiMoon)" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* Dark polar crater + ice pocket */}
    <ellipse cx="94" cy="83" rx="18" ry="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
    <ellipse cx="94" cy="84" rx="9" ry="4" fill="#38bdf8" opacity="0.8" />
    {/* Orbiting ice-hunter spacecraft */}
    <g transform="translate(46, 32) rotate(-18)">
      <rect x="-13" y="-3" width="8" height="6" rx="1" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="5" y="-3" width="8" height="6" rx="1" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="-5" y="-5" width="10" height="10" rx="2" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
      <path d="M2 5 L38 42 L26 48 Z" fill="#38bdf8" opacity="0.32" />
    </g>
    <circle cx="32" cy="18" r="1.4" fill="#fef08a" />
    <circle cx="152" cy="24" r="1.4" fill="#38bdf8" />
  </svg>
);

export const MarsRescueCommanderBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mrcGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="mrcFlame" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fdba74" />
        <stop offset="55%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#9a3412" />
      </linearGradient>
      <radialGradient id="mrcBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#2e1320" />
        <stop offset="65%" stopColor="#140b24" />
        <stop offset="100%" stopColor="#040714" />
      </radialGradient>
      <filter id="mrcGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#mrcGold)" filter="url(#mrcGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#mrcFlame)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#mrcBg)" />

    <circle cx="48" cy="52" r="1.4" fill="#fef08a" />
    <circle cx="152" cy="54" r="1.4" fill="#34d399" />

    {/* Solar storm arc + Green restored relay link */}
    <path d="M52 60 Q100 32 148 60" stroke="#34d399" strokeWidth="2.8" fill="none" strokeDasharray="4 3" />
    <circle cx="52" cy="62" r="5" fill="#4fe3d4" stroke="#ffffff" strokeWidth="1.2" />
    <circle cx="148" cy="62" r="5" fill="#34d399" stroke="#ffffff" strokeWidth="1.2" />

    {/* Mars Planet + Surface Rover Beacon */}
    <circle cx="100" cy="96" r="28" fill="#c2410c" stroke="#fdba74" strokeWidth="1.8" />
    <circle cx="90" cy="90" r="5" fill="#9a3412" />
    <circle cx="110" cy="103" r="6.5" fill="#7c2d12" />

    {/* Rescue Satellite at apex */}
    <g transform="translate(100, 52)">
      <rect x="-18" y="-3" width="9" height="6" rx="1" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="9" y="-3" width="9" height="6" rx="1" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="-7" y="-6" width="14" height="12" rx="2" fill="url(#mrcGold)" stroke="#ffffff" strokeWidth="1.2" />
      <circle cx="0" cy="0" r="2.5" fill="#34d399" />
    </g>

    <text x="100" y="33" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    <g transform="translate(100, 150)">
      <path d="M-80,-12 L80,-12 L73,12 L-73,12 Z" fill="#070514" stroke="url(#mrcGold)" strokeWidth="2.2" />
      <text x="0" y="3.8" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="7.4" letterSpacing="0.55" textAnchor="middle">
        MARS RESCUE COMMANDER
      </text>
    </g>
  </svg>
);

export const LunarWaterExplorerBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lweCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a5f3fc" />
        <stop offset="50%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="lweGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <radialGradient id="lweBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#0f294d" />
        <stop offset="65%" stopColor="#061229" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
      <filter id="lweGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#lweCyan)" filter="url(#lweGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#lweGold)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#lweBg)" />

    <circle cx="48" cy="52" r="1.4" fill="#a5f3fc" />
    <circle cx="152" cy="54" r="1.4" fill="#fef08a" />

    {/* Lunar South Pole Orb */}
    <circle cx="100" cy="92" r="29" fill="#cbd5e1" stroke="#7dd3fc" strokeWidth="1.6" />
    <ellipse cx="100" cy="109" rx="14" ry="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
    {/* Water Droplet / Ice Crystal Icon */}
    <path d="M100 72 C100 72 112 88 112 96 A12 12 0 1 1 88 96 C88 88 100 72 100 72 Z" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />
    <circle cx="96" cy="95" r="2.5" fill="#ffffff" opacity="0.8" />

    {/* Orbit Track */}
    <ellipse cx="100" cy="86" rx="52" ry="18" stroke="#4fe3d4" strokeWidth="1.8" strokeDasharray="5 3" fill="none" transform="rotate(-16 100 86)" />

    <text x="100" y="33" fill="#a5f3fc" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    <g transform="translate(100, 150)">
      <path d="M-78,-12 L78,-12 L71,12 L-71,12 Z" fill="#030b1c" stroke="url(#lweCyan)" strokeWidth="2.2" />
      <text x="0" y="3.8" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="7.6" letterSpacing="0.55" textAnchor="middle">
        LUNAR WATER EXPLORER
      </text>
    </g>
  </svg>
);

export const AstronautRescueIllustrationSVG: React.FC<{ className?: string }> = ({
  className = 'w-28 h-20',
}) => (
  <svg className={className} viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ariEarth" cx="30%" cy="80%" r="75%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="20" r="1.4" fill="#fef08a" />
    <circle cx="152" cy="18" r="1.4" fill="#4fe3d4" />
    <circle cx="96" cy="14" r="1.2" fill="#ffffff" />
    {/* Earth horizon */}
    <path d="M8 106 Q90 66 172 106 Z" fill="url(#ariEarth)" opacity="0.65" />
    <path d="M8 106 Q90 66 172 106" stroke="#4fe3d4" strokeWidth="1.8" fill="none" />
    {/* Rescue Spacecraft + Robotic Arm */}
    <g transform="translate(46, 50) rotate(-8)">
      <rect x="-18" y="-10" width="32" height="20" rx="5" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.6" />
      <polygon points="14,-10 26,-4 26,4 14,10" fill="#38bdf8" />
      <rect x="-10" y="-5" width="12" height="10" rx="2" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1" />
      <path d="M24 0 L52 -6 L72 2" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="52" cy="-6" r="2.5" fill="#fef08a" />
    </g>
    {/* Drifting Astronaut */}
    <g transform="translate(132, 46) rotate(14)">
      <rect x="-8" y="-8" width="16" height="18" rx="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.4" />
      <circle cx="0" cy="-14" r="8" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.4" />
      <rect x="-5" y="-17" width="10" height="6" rx="2.5" fill="#fbbf24" />
      <circle cx="0" cy="0" r="3" fill="#f43f5e" />
      <path d="M-12 -2 L-18 4 M12 -2 L18 4" stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  </svg>
);

export const SpaceRescueHeroBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="srhGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="srhCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <radialGradient id="srhBg" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#1b2b58" />
        <stop offset="65%" stopColor="#091530" />
        <stop offset="100%" stopColor="#020817" />
      </radialGradient>
      <filter id="srhGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#srhGold)" filter="url(#srhGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#srhCyan)" />
    <polygon points="100,17 167,40 167,118 100,176 33,118 33,40" fill="url(#srhBg)" />

    <circle cx="48" cy="52" r="1.5" fill="#fef08a" />
    <circle cx="152" cy="54" r="1.5" fill="#67e8f9" />
    <circle cx="46" cy="108" r="1.3" fill="#fda4af" />
    <circle cx="154" cy="108" r="1.3" fill="#4fe3d4" />

    {/* Curved Earth Horizon inside Shield */}
    <path d="M48 118 Q100 94 152 118" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.85" />
    <path d="M56 122 Q100 102 144 122" stroke="#34d399" strokeWidth="1.5" fill="none" opacity="0.55" />

    {/* Robotic Rescue Arm + Rescued Astronaut */}
    <path d="M52 96 L78 82 L94 88" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="78" cy="82" r="3.5" fill="#fef08a" />
    <g transform="translate(114, 78) rotate(-10)">
      <rect x="-11" y="-10" width="22" height="24" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
      <circle cx="0" cy="-18" r="10" fill="#ffffff" stroke="#4fe3d4" strokeWidth="1.6" />
      <rect x="-6.5" y="-21" width="13" height="7" rx="3" fill="url(#srhGold)" />
      <rect x="-5" y="-4" width="10" height="8" rx="2" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1" />
      <circle cx="0" cy="0" r="2.2" fill="#34d399" />
      <path d="M-11 -4 L-19 2 M11 -4 L19 -12" stroke="#f8fafc" strokeWidth="3.2" strokeLinecap="round" />
    </g>

    <text x="100" y="34" fill="url(#srhGold)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>

    <g transform="translate(100, 150)">
      <path d="M-78,-12 L78,-12 L71,12 L-71,12 Z" fill="#030b1c" stroke="url(#srhGold)" strokeWidth="2.2" />
      <text x="0" y="3.8" fill="#fef08a" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.2" letterSpacing="0.8" textAnchor="middle">
        SPACE RESCUE HERO
      </text>
    </g>
  </svg>
);



