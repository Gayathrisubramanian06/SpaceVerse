export interface FacilityLocation {
  id: string;
  code: string;
  name: string;
  desc: string;
  badgeColor: string;
  target: { x: number; z: number };
  bounds: { x1: number; x2: number; z1: number; z2: number };
  yaw: number;
}

export type BriefingStationId = 'sah' | 'mcc' | 'srl' | 'mpr' | 'gsc' | 'lcc' | 'pnl';

export interface CampaignLevel {
  lvl: number;
  title: string;
  tag: string;
  sector: string;
  orbit: string;
  briefingStationId: BriefingStationId;
  briefingStationName: string;
  stationRoute: string[];
  t: number | string;
  b: number;
  credB: number;
  req: string[];
  displayReq: string[];
  goal: string;
  isLab?: boolean;
  labMode?:
    | 'satellite'
    | 'rocket'
    | 'orbit'
    | 'shake_freeze'
    | 'lunar_flyby'
    | 'europa_probe'
    | 'lunar_water'
    | 'astronaut_rescue';
  rewardText: string;
  unlockFeature?: string;
  icon: string;
  difficulty: string;
}

export interface SupplyCrate {
  k: string;
  n: string;
  m?: number;
  imp?: number;
  c: number;
  cred: number;
  x: number;
  mot?: boolean;
  subtitle: string;
}

export type SatSubsystemId =
  | 'bus'
  | 'solar'
  | 'battery'
  | 'antenna'
  | 'camera'
  | 'propulsion'
  | 'computer'
  | 'adcs'
  | 'thermal';

export interface SatComponentSpec {
  id: SatSubsystemId;
  sequenceStep: number;
  name: string;
  shortName: string;
  icon: string;
  targetId: string;
  targetName: string;
  anchorPos: { x: number; y: number; z: number };
  idealYaw: number;
  idealPitch: number;
  func: string;
  massKg: number;
  powerW: string;
  telemetryTag: string;
  correctNote: string;
  wrongNotes: Record<string, string>;
}

export type RocketPartId =
  | 'first_stage_structure'
  | 'first_stage_tanks'
  | 'first_stage_engines'
  | 'interstage'
  | 'second_stage_body'
  | 'second_stage_engine'
  | 'avionics'
  | 'grid_fins'
  | 'landing_legs'
  | 'payload_fairing';

export interface RocketComponentSpec {
  id: RocketPartId;
  sequenceStep: number;
  name: string;
  shortName: string;
  targetName: string;
  anchorPos: { x: number; y: number; z: number };
  idealYaw: number;
  idealPitch: number;
  func: string;
  massKg: number;
  telemetryTag: string;
  correctNote: string;
  wrongNotes: Record<string, string>;
}

export type LaunchSequenceStatus =
  | 'not_started'
  | 'countdown'
  | 'ignition'
  | 'ascent'
  | 'completed';

export interface Level1Progress {
  stage: 1 | 2 | 3 | 4 | 5;
  satParts: SatSubsystemId[];
  rocketParts: RocketPartId[];
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  stage4Done: boolean;
  stage5Done: boolean;
  launchStatus: LaunchSequenceStatus;
}

export const DEFAULT_LEVEL1_PROGRESS: Level1Progress = {
  stage: 1,
  satParts: [],
  rocketParts: [],
  stage1Done: false,
  stage2Done: false,
  stage3Done: false,
  stage4Done: false,
  stage5Done: false,
  launchStatus: 'not_started',
};

export interface Level2Progress {
  stage: 1 | 2 | 3 | 4;
  rocketParts: RocketPartId[];
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  stage4Done: boolean;
  launchStatus: LaunchSequenceStatus;
}

export const DEFAULT_LEVEL2_PROGRESS: Level2Progress = {
  stage: 1,
  rocketParts: [],
  stage1Done: false,
  stage2Done: false,
  stage3Done: false,
  stage4Done: false,
  launchStatus: 'not_started',
};

export type ProtectionPartId =
  | 'structural_reinforcement'
  | 'heavy_armor'
  | 'vibration_mounts'
  | 'thermal_insulation'
  | 'small_heater'
  | 'large_heater';

export interface ProtectionPartSpec {
  id: ProtectionPartId;
  name: string;
  shortName: string;
  massKg: number;
  powerW: number;
  vibrationBonus: number;
  targetZoneId: string;
  targetZoneName: string;
  purpose: string;
  category: 'vibration' | 'thermal';
  wrongZoneTip: string;
}

export interface Level4Progress {
  stage: 1 | 2 | 3 | 4 | 5;
  installedParts: ProtectionPartId[];
  totalMassKg: number;
  shakerResult: 'pending' | 'passed' | 'failed';
  shakerScore: number;
  shakerSignature: string;
  freezerResult: 'pending' | 'passed' | 'failed';
  freezerMinTempC: number | null;
  freezerFinalTempC: number | null;
  freezerSignature: string;
  finalQualified: boolean;
}

export const DEFAULT_LEVEL4_PROGRESS: Level4Progress = {
  stage: 1,
  installedParts: [],
  totalMassKg: 400,
  shakerResult: 'pending',
  shakerScore: 30,
  shakerSignature: '',
  freezerResult: 'pending',
  freezerMinTempC: null,
  freezerFinalTempC: null,
  freezerSignature: '',
  finalQualified: false,
};

import { DEFAULT_LEVEL6_PROGRESS, StoredLevel6Progress } from '../utils/europaMissionData';
import { DEFAULT_LEVEL8_PROGRESS, StoredLevel8Progress } from '../utils/lunarWaterData';
import { DEFAULT_LEVEL9_PROGRESS, StoredLevel9Progress } from '../utils/astronautRescueData';

export interface PlayerTransaction {
  id: string;
  key: string;
  type: string;
  amountStarCredits: number;
  amountGrantCredits: number;
  amountXp?: number;
  badge?: string;
  note: string;
  timestamp: string;
}

export interface PlayerState {
  userId: string;
  uid?: string;
  username?: string;
  email?: string;
  callsign: string;
  joined: boolean;
  trainingCompleted: boolean;
  currentCampaignLevel: number;
  currentMissionStage?: number;
  completedLevels: number[];
  unlockedLevels?: number[];
  levelStars?: Record<number, number>;
  totalStars?: number;
  levelScores: Record<number, number>;
  grantCredits: number;
  starCredits: number;
  xp: number;
  badges: string[];
  propulsionUpgradeUnlocked?: boolean;
  level5FlybyCompleted?: boolean;
  level5BestFuelKg?: number | null;
  unlockedStoreItems?: string[];
  rewardsCollected?: string[];
  transactions?: PlayerTransaction[];
  level1Progress?: Level1Progress;
  level2Progress?: Level2Progress;
  level4Progress?: Level4Progress;
  level6Progress?: StoredLevel6Progress;
  level7Progress?: StoredLevel8Progress;
  level8Progress?: StoredLevel9Progress;
  lastSavedAt?: string | null;
}

export const STORAGE_KEY = 'galaxy_x_player_save_v3';

export const DEFAULT_PLAYER_STATE: PlayerState = {
  userId: '',
  uid: '',
  username: '',
  email: '',
  callsign: 'Explorer-01',
  joined: false,
  trainingCompleted: false,
  currentCampaignLevel: 1,
  currentMissionStage: 0,
  completedLevels: [],
  unlockedLevels: [1],
  levelStars: {},
  totalStars: 0,
  levelScores: {},
  grantCredits: 500,
  starCredits: 500,
  xp: 0,
  badges: [],
  propulsionUpgradeUnlocked: false,
  level5FlybyCompleted: false,
  level5BestFuelKg: null,
  unlockedStoreItems: [],
  rewardsCollected: [],
  transactions: [],
  level1Progress: { ...DEFAULT_LEVEL1_PROGRESS },
  level2Progress: { ...DEFAULT_LEVEL2_PROGRESS },
  level4Progress: { ...DEFAULT_LEVEL4_PROGRESS },
  level6Progress: { ...DEFAULT_LEVEL6_PROGRESS },
  level7Progress: { ...DEFAULT_LEVEL8_PROGRESS },
  level8Progress: { ...DEFAULT_LEVEL9_PROGRESS },
  lastSavedAt: null,
};

export function createFreshPlayerState(uid = '', username = '', email = ''): PlayerState {
  return {
    ...DEFAULT_PLAYER_STATE,
    userId: uid,
    uid,
    username,
    email,
    callsign: username || 'Explorer-01',
    completedLevels: [],
    unlockedLevels: [1],
    levelStars: {},
    levelScores: {},
    badges: [],
    unlockedStoreItems: [],
    rewardsCollected: [],
    transactions: [],
    level1Progress: { ...DEFAULT_LEVEL1_PROGRESS },
    level2Progress: { ...DEFAULT_LEVEL2_PROGRESS },
    level4Progress: { ...DEFAULT_LEVEL4_PROGRESS },
    level6Progress: {
      ...DEFAULT_LEVEL6_PROGRESS,
      probeBuild: { ...DEFAULT_LEVEL6_PROGRESS.probeBuild },
      landingSolved: { ...DEFAULT_LEVEL6_PROGRESS.landingSolved },
      collectedReadings: [],
      calibrationSolvedIds: [],
      rocketParts: [],
    },
    level7Progress: {
      ...DEFAULT_LEVEL8_PROGRESS,
      build: { ...DEFAULT_LEVEL8_PROGRESS.build },
      rocketParts: [...DEFAULT_LEVEL8_PROGRESS.rocketParts],
      craterScans: [],
    },
    level8Progress: { ...DEFAULT_LEVEL9_PROGRESS },
    lastSavedAt: null,
  };
}

export function clearAllLocalPlayerCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('galaxy_x_')) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('galaxy_x_')) {
        sessionKeys.push(k);
      }
    }
    for (const k of sessionKeys) {
      sessionStorage.removeItem(k);
    }
  } catch {
    // ignore storage errors
  }
}

export function getSavedUserId(): string {
  return '';
}

export function setSavedUserId(_userId: string): void {
  // No-op: active user identity is strictly derived from Firebase Authentication UID.
}

export function loadPlayerData(): PlayerState {
  return createFreshPlayerState();
}

export function savePlayerData(_state: PlayerState): void {
  // No-op: progress is persisted directly to Cloud Firestore for authenticated UIDs only.
}

export interface WelcomeStoryChapter {
  tag: string;
  badgeText: string;
  speaker: string;
  visual: 'constellation' | 'satellite' | 'europa' | 'rocket';
  main: string;
  sub: string;
  voiceLine: string;
  tip: string;
}

export const WELCOME_MESSAGES: WelcomeStoryChapter[] = [
  {
    tag: 'CHAPTER 01 // DEEP SPACE TRANSMISSION',
    badgeText: 'GALAXY-X SUMMONS',
    speaker: 'DIRECTOR VANCE // GALAXY-X COMMAND',
    visual: 'constellation',
    main: 'Welcome to SPACEVERSE, Commander!',
    sub: 'Earth’s orbital fleet needs a lead mission engineer. Your telemetry exam just cleared you for entrance into the elite GALAXY-X Research Facility.',
    voiceLine:
      'Welcome to SPACEVERSE, Commander! Earth’s orbital fleet needs a lead mission engineer, and your credentials just cleared you for the GALAXY-X Research Facility.',
    tip: 'Every kilogram, watt, and trajectory decision across 8 missions will be yours to command.',
  },
  {
    tag: 'CHAPTER 02 // ORBITAL ARCHITECTURE',
    badgeText: 'CLEANROOM & TELEMETRY',
    speaker: 'DIRECTOR VANCE // SATELLITE OPS',
    visual: 'satellite',
    main: 'From Cleanroom Blueprints to Orbit',
    sub: 'Inside GALAXY-X, you will assemble 9-part satellites, command rocket launches on Pad 39X, and keep batteries alive through Earth’s dark shadow.',
    voiceLine:
      'Inside GALAXY-X, you will assemble precision satellites, command rocket launches on Pad 39X, and keep orbital power alive through Earth’s dark eclipse.',
    tip: 'Smart spacecraft design balances mass, solar power, thermal shielding, and propulsion.',
  },
  {
    tag: 'CHAPTER 03 // DEEP SPACE FRONTIER',
    badgeText: 'MOON · EUROPA · RESCUE',
    speaker: 'DIRECTOR VANCE // DEEP SPACE COMMAND',
    visual: 'europa',
    main: 'Explore Frozen Worlds & Save Lives in Orbit',
    sub: 'Plot fuel-balanced lunar flybys, hunt hidden water ice in lunar craters, land cryo probes on Europa, and execute an emergency astronaut rescue.',
    voiceLine:
      'Beyond Earth orbit, you will plot fuel-balanced lunar flybys, hunt hidden water ice on the Moon, land on Europa, and command an emergency astronaut rescue!',
    tip: 'Earn StarCredits, stars, equipment upgrades, and explorer badges on every mission.',
  },
  {
    tag: 'CHAPTER 04 // COMMISSIONING CLEARANCE',
    badgeText: '500 CR + 500 SC',
    speaker: 'DIRECTOR VANCE // LAUNCHPAD CONTROL',
    visual: 'rocket',
    main: 'Your Legacy Among the Stars Starts Now',
    sub: 'Accept your recruitment commission to claim your New Recruit Badge, 500 Grant Credits, and 500 Star Credits, then step onto the facility floor.',
    voiceLine:
      'Your legacy among the stars starts now, Explorer! Accept your commission to claim your starting credits, New Recruit badge, and enter the GALAXY-X facility.',
    tip: 'Your progress, badges, and StarCredits save automatically to your cloud profile.',
  },
];

export const LOCATIONS: FacilityLocation[] = [
  {
    id: 'sce',
    code: 'SCE',
    name: 'NASA Space Center Entrance',
    desc: 'Where the player enters GALAXY-X and begins training.',
    badgeColor: '#4fe3d4',
    target: { x: -2, z: 12 },
    bounds: { x1: -16, x2: 12, z1: 6, z2: 20 },
    yaw: Math.PI,
  },
  {
    id: 'gsc',
    code: 'GSC',
    name: 'Ground Station',
    desc: 'Where spacecraft communications and telemetry are tracked.',
    badgeColor: '#38bdf8',
    target: { x: -40, z: 4 },
    bounds: { x1: -52, x2: -24, z1: 2, z2: 20 },
    yaw: Math.PI,
  },
  {
    id: 'mcc',
    code: 'MCC',
    name: 'Mission Control Center',
    desc: 'Where the player monitors and manages active space missions.',
    badgeColor: '#38bdf8',
    target: { x: -34, z: -18 },
    bounds: { x1: -52, x2: -20, z1: -36, z2: -8 },
    yaw: 0,
  },
  {
    id: 'srl',
    code: 'SRL',
    name: 'Scientific Research Laboratory',
    desc: 'Where scientific payload instruments are selected and tested.',
    badgeColor: '#34d399',
    target: { x: -8, z: -18 },
    bounds: { x1: -20, x2: 4, z1: -36, z2: -8 },
    yaw: 0,
  },
  {
    id: 'sah',
    code: 'SAH',
    name: 'Spacecraft Assembly Hangar',
    desc: 'Where the player designs, builds, and stages spacecraft.',
    badgeColor: '#fbbf24',
    target: { x: 22, z: -11.5 },
    bounds: { x1: 4, x2: 52, z1: -36, z2: -2 },
    yaw: Math.PI,
  },
  {
    id: 'mpr',
    code: 'MPR',
    name: 'Mission Planning Room',
    desc: 'Where mission planning and orbital trajectory review take place.',
    badgeColor: '#818cf8',
    target: { x: -21, z: 10 },
    bounds: { x1: -42, x2: -4, z1: -2, z2: 16 },
    yaw: Math.PI / 2,
  },
  {
    id: 'lcc',
    code: 'LCC',
    name: 'Launch Control Complex',
    desc: 'Where the player prepares, sequences, and launches rockets.',
    badgeColor: '#f87171',
    target: { x: 24, z: 10 },
    bounds: { x1: 6, x2: 36, z1: -2, z2: 18 },
    yaw: 0,
  },
  {
    id: 'pnl',
    code: 'PNL',
    name: 'Propulsion & Navigation Lab',
    desc: 'Where fuel balance, spacecraft mass, and lunar flyby trajectories are engineered.',
    badgeColor: '#22d3ee',
    target: { x: 42, z: 9 },
    bounds: { x1: 36, x2: 55, z1: -2, z2: 20 },
    yaw: -Math.PI / 2,
  },
];

export function getCurrentLocation(x: number, z: number): FacilityLocation {
  for (const loc of LOCATIONS) {
    const b = loc.bounds;
    if (x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2) return loc;
  }
  return {
    id: 'corridor',
    code: 'HALL',
    name: 'Central Concourse',
    desc: 'Inter-facility corridor connecting all research sectors.',
    badgeColor: '#94a3b8',
    target: { x: 0, z: -5 },
    bounds: { x1: -54, x2: 54, z1: -36, z2: 20 },
    yaw: 0,
  };
}

export const CRATES: SupplyCrate[] = [
  { k: 't', n: 'Thermometer', m: 3, c: 5, cred: 500, x: -14, subtitle: 'Cryo-Thermal Probe' },
  { k: 'b', n: 'Barometer', m: 4, c: 8, cred: 800, x: -9, subtitle: 'MEMS Pressure Manifold' },
  { k: 'c', n: 'Camera', m: 8, c: 15, cred: 1500, x: -4, subtitle: 'Multispectral Imager' },
  { k: 's', n: 'Spark-S', imp: 600, c: 20, cred: 2000, x: 8, mot: true, subtitle: 'Light Solid Stage' },
  { k: 'm', n: 'Ridge-M', imp: 1500, c: 45, cred: 4500, x: 14, mot: true, subtitle: 'Medium Booster Stage' },
  { k: 'x', n: 'Crest-X', imp: 2200, c: 65, cred: 6500, x: 20, mot: true, subtitle: 'High-Impulse Core' },
  { k: 'l', n: 'Titan-L', imp: 3000, c: 90, cred: 9000, x: 26, mot: true, subtitle: 'Heavy-Lift Cluster' },
];

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    lvl: 1,
    title: 'LEVEL 1 – SATELLITE ASSEMBLY',
    tag: 'SPACECRAFT ASSEMBLY HANGAR',
    sector: 'SAH Cleanroom Bay',
    orbit: 'LEO Observation',
    briefingStationId: 'sah',
    briefingStationName: 'Spacecraft Assembly Hangar (SAH)',
    stationRoute: ['SAH Cleanroom (Press E)', 'Assemble 9 Subsystems', 'Verify Satellite Core'],
    t: 'Satellite',
    b: 60,
    credB: 6000,
    req: ['t'],
    displayReq: ['9-Part Earth Observation Satellite'],
    goal: 'Assemble all 9 essential satellite subsystems in the Spacecraft Assembly Hangar.',
    isLab: true,
    labMode: 'satellite',
    rewardText: '★ 1,000 Star Credits + Satellite Builder Badge',
    icon: '🛰️',
    difficulty: 'Easy • Interactive 3D Lab',
  },
  {
    lvl: 2,
    title: 'LEVEL 2 – ROCKET ASSEMBLY & LAUNCH',
    tag: 'LAUNCH CONTROL COMPLEX',
    sector: 'Pad 39X & LCC Bay',
    orbit: 'Orbital Insertion',
    briefingStationId: 'lcc',
    briefingStationName: 'Launch Control Complex (LCC)',
    stationRoute: [
      'LCC Console (Press E)',
      '10-Part Rocket Build',
      'Pad Positioning',
      'Payload Fairing',
      'Rocket Launch',
    ],
    t: 'Orbital Launch',
    b: 80,
    credB: 8000,
    req: ['t', 'c'],
    displayReq: ['10 Rocket Modules', 'Pad Staging', 'Payload Fairing', 'Ignition'],
    goal: 'Build your 10-part launch vehicle, stage on Pad 39X, seal the satellite payload, and launch into space.',
    isLab: true,
    labMode: 'rocket',
    rewardText: '★ 1,000 Star Credits + Launch Commander Badge',
    icon: '🚀',
    difficulty: 'Easy • 4-Stage Launch Lab',
  },
  {
    lvl: 3,
    title: 'LEVEL 3 – ORBIT AND POWER MANAGEMENT',
    tag: 'GROUND STATION TELEMETRY',
    sector: 'Low Earth Orbit (GSC)',
    orbit: 'Sunlit + Eclipse Cycle',
    briefingStationId: 'gsc',
    briefingStationName: 'Ground Station (GSC)',
    stationRoute: [
      'GSC Dish (Press E)',
      'Configure Solar & Battery',
      'Drag Into Orbit',
      'Survive Earth Shadow',
    ],
    t: 'Sun + Shadow',
    b: 100,
    credB: 10000,
    req: ['t', 'b'],
    displayReq: ['Solar Wing (50–250 W)', 'Battery Pack (Wh)', 'Orbital Insertion'],
    goal: "Design a satellite power system, place your satellite in Earth's orbit and ensure that it survives the darkness of Earth's shadow.",
    isLab: true,
    labMode: 'orbit',
    rewardText: '★ 1,000 Star Credits + Orbit Power Engineer Badge',
    icon: '⚡',
    difficulty: 'Easy • Orbital Power Sim',
  },
  {
    lvl: 4,
    title: 'LEVEL 4 – THE SHAKE & FREEZE TEST',
    tag: 'ENVIRONMENTAL TEST LAB',
    sector: 'Shaker & Cryo-Vac Bays (MPR)',
    orbit: 'Armor & Heaters',
    briefingStationId: 'mpr',
    briefingStationName: 'Mission Planning Room (MPR)',
    stationRoute: [
      'MPR Briefing (E)',
      'Protection Assembly',
      'Shaker Table Test',
      'Freezer Room Test',
      'Final Qualification',
    ],
    t: 'Shake + Freeze',
    b: 110,
    credB: 11000,
    req: ['t', 'b'],
    displayReq: ['Mass ≤ 500 kg', 'Shaker ≥ 70 pts', 'Cryo Temp ≥ -20°C'],
    goal: 'Protect your communications satellite with armor, mounts, insulation, and heaters within 500 kg.',
    isLab: true,
    labMode: 'shake_freeze',
    rewardText: '★ 750 SC + 100 XP + Thermal Protection Badge',
    icon: '🛡️',
    difficulty: 'Medium • 5-Stage Env Test',
  },
  {
    lvl: 5,
    title: 'LEVEL 5: LUNAR FLYBY – FUEL MATH',
    tag: 'PROPULSION & NAVIGATION LAB',
    sector: 'Lunar Transfer (238,000 mi)',
    orbit: 'Fuel Balance (45–65 kg)',
    briefingStationId: 'pnl',
    briefingStationName: 'Propulsion & Navigation Lab (PNL)',
    stationRoute: [
      'PNL Briefing (Press E)',
      'Inspect Probe & Tank',
      'Balance Fuel (45–65 kg)',
      'Confirm & Launch Lunar Flyby',
    ],
    t: 125,
    b: 125,
    credB: 12500,
    req: ['b', 'c'],
    displayReq: ['Dry Mass 100 kg', 'Lift Limit 175 kg', 'Optimal Fuel 45–65 kg'],
    goal: 'Find the perfect fuel balance. Reach the Moon without exceeding your rocket’s lifting capacity.',
    isLab: true,
    labMode: 'lunar_flyby',
    rewardText: '★ 1,000 SC + Propulsion Upgrade + Propulsion Engineer Badge',
    unlockFeature: 'Propulsion Upgrade + Hard Deep-Space Mode Unlocked',
    icon: '🌕',
    difficulty: 'Medium • Fuel Math & Flyby',
  },
  {
    lvl: 6,
    title: 'LEVEL 6: THERMOMETER TELEMETRY PROBE',
    tag: 'EUROPA DISCOVERY MISSION',
    sector: 'Europa Ice Surface (628M km)',
    orbit: '12m Probe Discovery',
    briefingStationId: 'gsc',
    briefingStationName: 'Ground Station (GSC)',
    stationRoute: [
      'Director Vance Briefing',
      'Build & Chamber Test Probe',
      'Assemble & Launch',
      'Europa Landing & 5 Scans',
      'Transmit to Earth',
    ],
    t: 'Europa Ice',
    b: 120,
    credB: 1500,
    req: ['t', 'b', 'c'],
    displayReq: ['Budget ≤ 850 SC', 'Weight ≤ 120 kg', '5 Europa Readings'],
    goal: 'Build a probe. Land on Europa. Discover its hidden temperatures. Send your findings to Earth!',
    isLab: true,
    labMode: 'europa_probe',
    rewardText: '★ 1,500 SC + 150 XP + Thermal Telemetry Specialist Badge',
    unlockFeature: 'Thermal Telemetry Specialist Badge + Level 7 Lunar Water Hunt Unlocked',
    icon: '🌡️',
    difficulty: 'Hard • 12m Discovery Mode',
  },
  {
    lvl: 7,
    title: 'LEVEL 7: LUNAR WATER HUNT',
    tag: 'LUNAR SOUTH POLE EXPEDITION',
    sector: 'Moon South Pole Craters',
    orbit: '10m Crater Discovery',
    briefingStationId: 'mpr',
    briefingStationName: 'Mission Planning Room (MPR)',
    stationRoute: [
      'Lunar Briefing',
      'Design Orbiter',
      'Fuel & Mass Experiment',
      'Rocket Launch',
      'Navigate, Scan & Transmit',
    ],
    t: 'Lunar Ice',
    b: 1150,
    credB: 1500,
    req: ['t', 'c'],
    displayReq: ['Budget ≤ 1,150 SC', 'Lift ≤ 195 kg', 'Crater Ice Evidence'],
    goal: 'Scientists suspect water ice is hidden inside the Moon’s dark craters. Design your spacecraft, reach the Moon, and discover the evidence!',
    isLab: true,
    labMode: 'lunar_water',
    rewardText: '★ 1,500 SC + 200 XP + Lunar Water Explorer Badge',
    unlockFeature: 'Lunar Water Explorer Badge + Level 8 Unlocked',
    icon: '🌑',
    difficulty: 'Hard • 10m Polar Hunt',
  },
  {
    lvl: 8,
    title: 'LEVEL 8 – RESCUE THE LOST ASTRONAUT',
    tag: 'ISS EMERGENCY EVA RESCUE',
    sector: 'ISS Low Earth Orbit (408 km)',
    orbit: '4m Emergency Rescue',
    briefingStationId: 'mcc',
    briefingStationName: 'Mission Control Center (MCC)',
    stationRoute: [
      'Voice Briefing',
      '1 Radar Scan',
      '2 Radio Link',
      '3 Debris Flight',
      '4 Speed Match',
      '5 Robotic Arm',
    ],
    t: 'ISS Rescue',
    b: 1000,
    credB: 1000,
    req: ['t', 'b', 'c'],
    displayReq: ['Radar Lock', 'Debris Dodge', 'Speed Match', 'Robotic Arm'],
    goal: "An astronaut's safety tether disconnected during an ISS spacewalk! Locate them, navigate debris, match speed, and capture them safely.",
    isLab: true,
    labMode: 'astronaut_rescue',
    rewardText: '★ 1,000 SC + SPACE RESCUE HERO Badge',
    unlockFeature: 'SPACE RESCUE HERO Badge + Campaign Mastered!',
    icon: '🧑‍🚀',
    difficulty: 'Hard • 5-Stage EVA Rescue',
  },
];

export const SAT_COMPONENTS: SatComponentSpec[] = [
  {
    id: 'bus',
    sequenceStep: 1,
    name: 'Satellite Bus / Structural Frame',
    shortName: 'Bus Frame',
    icon: '🛸',
    targetId: 'target-bus',
    targetName: 'Central Chassis Core',
    anchorPos: { x: 0.0, y: -0.05, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.2,
    func: 'Provides the main structural chassis that houses internal avionics and supports every mounted subsystem.',
    massKg: 125,
    powerW: '0 W',
    telemetryTag: 'CORE STRUCTURE',
    correctNote:
      'Correct placement! The octagonal Satellite Bus & Structural Frame is locked to the assembly stand core, ready to support all subsystems.',
    wrongNotes: {
      solar: 'Incorrect position! The structural bus belongs at the central assembly stand core, not on an external wing yoke.',
      battery: 'Incorrect position! The main bus chassis is the central frame itself, not just the forward battery recess.',
      antenna: 'Incorrect position! The heavy spacecraft bus anchors at the center, not on top of the communications mast.',
      camera: 'Incorrect position! The structural core must seat directly onto the assembly adapter ring.',
      computer: 'Incorrect position! The main chassis spans the central core, while the avionics slot holds the computer.',
      adcs: 'Incorrect position! Mount the primary Satellite Bus at the central core ring.',
      thermal: 'Incorrect position! The structural bus belongs at the central chassis core before side radiators.',
      propulsion: 'Incorrect position! The aft bulkhead is reserved for thrusters; seat the main bus at the center.',
    },
  },
  {
    id: 'solar',
    sequenceStep: 4,
    name: 'Solar Panels',
    shortName: 'Solar Panels',
    icon: '🔆',
    targetId: 'target-solar',
    targetName: 'Lateral Solar Wing Yoke',
    anchorPos: { x: -1.68, y: 0.08, z: 0.0 },
    idealYaw: 0.3,
    idealPitch: 0.22,
    func: 'Converts sunlight into electrical energy to power the satellite throughout its orbit.',
    massKg: 42,
    powerW: '+1,450 W',
    telemetryTag: 'EPS SOLAR BUS',
    correctNote:
      'Correct placement! Solar panels are successfully installed on the lateral wing yokes to generate 1.45 kW of orbital power.',
    wrongNotes: {
      bus: 'Incorrect position! Solar wings must deploy outward from the lateral side yokes to catch sunlight cleanly.',
      battery: 'Incorrect position! Solar panels need external exposure to sunlight — they cannot operate inside the internal power bay.',
      antenna: 'Incorrect position! Placing solar wings on the zenith comms mast would block radio links and unbalance the spacecraft.',
      camera: 'Incorrect position! Solar panels cannot obstruct the Earth-facing nadir optical telescope aperture.',
      computer: 'Incorrect position! Solar wings mount on external lateral deployer yokes, not inside the shielded avionics bay.',
      adcs: 'Incorrect position! Solar wings require external articulation arms, not the internal reaction wheel bay.',
      thermal: 'Incorrect position! That flank bay houses thermal louvers; mount solar panels on the lateral wing yoke.',
      propulsion: 'Incorrect position! Thruster exhaust plumes would scorch solar cells. Mount them on the lateral wing yokes.',
    },
  },
  {
    id: 'battery',
    sequenceStep: 2,
    name: 'Battery',
    shortName: 'Battery Pack',
    icon: '🔋',
    targetId: 'target-battery',
    targetName: 'Internal Power Storage Bay',
    anchorPos: { x: 0.0, y: 0.34, z: 0.92 },
    idealYaw: 0.08,
    idealPitch: 0.16,
    func: 'Stores electrical energy so the satellite can continue operating when sunlight is unavailable.',
    massKg: 28,
    powerW: '840 Wh',
    telemetryTag: 'ECLIPSE RESERVE',
    correctNote:
      'Correct placement! The Li-ion battery pack is secured inside the internal power storage bay for orbital eclipse power.',
    wrongNotes: {
      bus: 'Incorrect position! Seat the battery specifically inside the forward internal power storage bay.',
      solar: 'Incorrect position! Batteries need thermal regulation inside the bus — mounting them on external wings exposes them to extreme cold.',
      antenna: 'Incorrect position! Heavy Li-ion packs belong near the center of mass, not suspended on the upper comms mast.',
      camera: 'Incorrect position! The nadir optical deck is reserved for the telescope aperture, not chemical battery cells.',
      computer: 'Incorrect position! That bay houses radiation-hardened flight processors — place the battery in the central power bay.',
      adcs: 'Incorrect position! The reaction wheel bay is calibrated for flywheels, not high-voltage battery packs.',
      thermal: 'Incorrect position! The side louver deck radiates waste heat; the battery fits inside the forward power bay.',
      propulsion: 'Incorrect position! Mounting batteries next to hydrazine thrusters risks thermal runaway.',
    },
  },
  {
    id: 'antenna',
    sequenceStep: 6,
    name: 'Communication Antenna',
    shortName: 'Comms Antenna',
    icon: '📡',
    targetId: 'target-antenna',
    targetName: 'Zenith Communication Mast',
    anchorPos: { x: 0.0, y: 1.48, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.32,
    func: 'Receives commands and sends telemetry and scientific information between the satellite and ground stations.',
    massKg: 18,
    powerW: '-85 W',
    telemetryTag: 'X-BAND LINK',
    correctNote:
      'Correct placement! The communication antenna is mounted on the zenith mast for clear ground station telemetry.',
    wrongNotes: {
      bus: 'Incorrect position! The antenna must be installed high on its designated zenith communication mounting point.',
      solar: 'Incorrect position! The antenna must be installed at its designated zenith communication mast, not on solar array rails.',
      battery: 'Incorrect position! RF signals cannot radiate efficiently from inside the internal power bay.',
      camera: 'Incorrect position! The nadir port aims downward at Earth imagery; the communication antenna mounts on top.',
      computer: 'Incorrect position! Placing high-power RF transmitters in the avionics bay causes electromagnetic interference.',
      adcs: 'Incorrect position! The parabolic dish needs unobstructed skyward clearance on the top zenith mast.',
      thermal: 'Incorrect position! Side thermal louvers block line-of-sight; place the dish on the zenith communication mast.',
      propulsion: 'Incorrect position! Rocket exhaust on the aft bulkhead would destroy the antenna feed horn.',
    },
  },
  {
    id: 'camera',
    sequenceStep: 5,
    name: 'Camera / Scientific Payload',
    shortName: 'Science Camera',
    icon: '📷',
    targetId: 'target-camera',
    targetName: 'Nadir Earth Observation Port',
    anchorPos: { x: 0.0, y: -1.32, z: 0.0 },
    idealYaw: 0.25,
    idealPitch: -0.25,
    func: 'Captures images of Earth and gathers scientific data for environmental and planetary observation.',
    massKg: 35,
    powerW: '-140 W',
    telemetryTag: 'OPTICAL PAYLOAD',
    correctNote:
      'Correct placement! The scientific camera is aligned along the downward Earth observation port.',
    wrongNotes: {
      bus: 'Incorrect position! Align the optical telescope cleanly on the bottom nadir observation port.',
      solar: 'Incorrect position! Precision optics require a rigid structural nadir mount, not flexible solar wings.',
      battery: 'Incorrect position! A camera lens cannot observe Earth from inside the enclosed battery bay.',
      antenna: 'Incorrect position! Mounting the telescope on the top mast aims it into deep space instead of toward Earth.',
      computer: 'Incorrect position! Optical trains require an unobstructed nadir baffle window, not an avionics enclosure.',
      adcs: 'Incorrect position! The camera must face directly downward along the nadir Earth-pointing axis.',
      thermal: 'Incorrect position! Side radiator plates do not point along the nadir Earth-imaging axis.',
      propulsion: 'Incorrect position! Thruster combustion residue would contaminate and blind the sapphire lens.',
    },
  },
  {
    id: 'propulsion',
    sequenceStep: 9,
    name: 'Propulsion System',
    shortName: 'Propulsion',
    icon: '🚀',
    targetId: 'target-propulsion',
    targetName: 'Aft Propulsion Bulkhead',
    anchorPos: { x: 0.0, y: 0.05, z: -0.98 },
    idealYaw: 2.75,
    idealPitch: 0.2,
    func: 'Generates controlled thrust to adjust the satellite orbit, perform maneuvers, and maintain altitude.',
    massKg: 46,
    powerW: '-40 W',
    telemetryTag: 'ΔV 420 m/s',
    correctNote:
      'Correct placement! The propulsion tanks and thruster nozzles are locked to the aft propulsion bulkhead.',
    wrongNotes: {
      bus: 'Incorrect position! Propulsion thrusters must exhaust cleanly off the rear aft bulkhead.',
      solar: 'Incorrect position! Firing thrusters on solar wings would shear off the panels and spin the satellite.',
      battery: 'Incorrect position! Rocket nozzles must exhaust into open space, not inside the battery compartment.',
      antenna: 'Incorrect position! Exhaust plumes on the zenith mast would melt the communication dish.',
      camera: 'Incorrect position! Firing thrusters across the optical telescope would destroy the lens.',
      computer: 'Incorrect position! High thruster heat must remain isolated on the aft bulkhead away from avionics.',
      adcs: 'Incorrect position! Main thrusters mount on the rear aft bulkhead aligned with the center of mass.',
      thermal: 'Incorrect position! Place propulsion nozzles on the aft bulkhead, not over the side thermal radiator.',
    },
  },
  {
    id: 'computer',
    sequenceStep: 3,
    name: 'On-board Computer',
    shortName: 'On-board CPU',
    icon: '💻',
    targetId: 'target-computer',
    targetName: 'Shielded Avionics Bay',
    anchorPos: { x: -0.72, y: 0.28, z: 0.68 },
    idealYaw: -0.52,
    idealPitch: 0.2,
    func: 'Executes flight software, processes sensor telemetry, and coordinates all onboard satellite operations.',
    massKg: 14,
    powerW: '-65 W',
    telemetryTag: 'FLIGHT OBC',
    correctNote:
      'Correct placement! The radiation-hardened on-board computer is seated inside the shielded avionics bay.',
    wrongNotes: {
      bus: 'Incorrect position! Route the flight processor into the dedicated shielded avionics bay.',
      solar: 'Incorrect position! Sensitive avionics silicon needs aluminum shielding, not external solar rails.',
      battery: 'Incorrect position! That compartment holds power storage cells, not flight processing boards.',
      antenna: 'Incorrect position! Exposing the flight computer on the top mast leaves it vulnerable to cosmic radiation.',
      camera: 'Incorrect position! The bottom nadir optical deck must remain clear for the Earth camera.',
      adcs: 'Incorrect position! High-RPM reaction wheel vibrations can fatigue solder joints — use the shielded avionics bay.',
      thermal: 'Incorrect position! Mount the OBC in the shielded avionics bay, not externally on the side radiator.',
      propulsion: 'Incorrect position! Thruster soak-back heat would exceed processor thermal limits.',
    },
  },
  {
    id: 'adcs',
    sequenceStep: 7,
    name: 'Attitude Control System',
    shortName: 'ADCS System',
    icon: '🔄',
    targetId: 'target-adcs',
    targetName: 'ADCS Reaction Wheel Bay',
    anchorPos: { x: 0.72, y: -0.22, z: 0.68 },
    idealYaw: 0.58,
    idealPitch: 0.16,
    func: 'Uses reaction wheels and star trackers to orient and stabilize the satellite accurately in space.',
    massKg: 21,
    powerW: '-95 W',
    telemetryTag: '3-AXIS ADCS',
    correctNote:
      'Correct placement! 3-axis ADCS reaction wheels and star tracker are locked into the attitude control bay.',
    wrongNotes: {
      bus: 'Incorrect position! Install the reaction wheel assembly in the right-forward ADCS bay.',
      solar: 'Incorrect position! Spinning momentum wheels on flexible solar wings would induce severe oscillation.',
      battery: 'Incorrect position! The battery bay lacks rigid torque mounts needed for 3-axis flywheels.',
      antenna: 'Incorrect position! Placing high-speed gyroscopes on the comms mast would shear the gimbal.',
      camera: 'Incorrect position! The nadir optical port is exclusively for Earth-observation optics.',
      computer: 'Incorrect position! The avionics bay is for low-vibration electronics, not spinning momentum wheels.',
      thermal: 'Incorrect position! Reaction wheels mount internally near the center of mass, not on the exterior radiator.',
      propulsion: 'Incorrect position! Isolate precision ADCS flywheels from aft thruster vibrations and heat.',
    },
  },
  {
    id: 'thermal',
    sequenceStep: 8,
    name: 'Thermal Control System',
    shortName: 'Thermal Control',
    icon: '🌡️',
    targetId: 'target-thermal',
    targetName: 'Thermal Radiator Flank',
    anchorPos: { x: 1.02, y: -0.25, z: 0.15 },
    idealYaw: -1.35,
    idealPitch: 0.18,
    func: 'Regulates satellite temperatures with MLI blankets and radiator louvers against extreme solar heat and deep-space cold.',
    massKg: 16,
    powerW: '-25 W',
    telemetryTag: 'TCS LOUVERS',
    correctNote:
      'Correct placement! Thermal radiator louvers and heat pipes are mounted to reject excess avionics heat safely into space.',
    wrongNotes: {
      bus: 'Incorrect position! Radiator louvers must face clear open space along the side thermal flank.',
      solar: 'Incorrect position! Thermal radiators require a fixed shadowed flank, not rotating solar array rails.',
      battery: 'Incorrect position! Radiators need external deep-space exposure to reject heat, not inside the closed battery bay.',
      antenna: 'Incorrect position! Do not mount heat-pipe louvers on top of the zenith communication mast.',
      camera: 'Incorrect position! Thermal louvers must never obstruct the downward nadir optical lens.',
      computer: 'Incorrect position! Mount the external radiator panel on the side thermal flank to vent avionics heat.',
      adcs: 'Incorrect position! That bay holds reaction wheels; thermal control louvers mount on the side radiator flank.',
      propulsion: 'Incorrect position! Placing delicate radiator louvers directly behind thrusters risks exhaust damage.',
    },
  },
];

// Simplified educational Falcon 9-inspired two-stage orbital launch vehicle configuration
export const ROCKET_COMPONENTS: RocketComponentSpec[] = [
  {
    id: 'first_stage_structure',
    sequenceStep: 1,
    name: 'First-Stage Booster Structure',
    shortName: 'Booster Hull',
    targetName: 'Lower Booster Core',
    anchorPos: { x: 0.0, y: -1.45, z: 0.42 },
    idealYaw: 0.3,
    idealPitch: 0.06,
    func: 'Primary cylindrical aluminum-lithium airframe that transfers launch thrust loads from the engines through the first stage.',
    massKg: 14800,
    telemetryTag: 'STAGE 1 HULL',
    correctNote:
      'Correct placement! The First-Stage Booster Structure is locked onto the strongback assembly spine.',
    wrongNotes: {
      first_stage_tanks: 'Incorrect position! Mount the outer booster airframe shell around the lower stage core, not just the internal tank bay.',
      first_stage_engines: 'Incorrect position! The booster structure sits above the aft thrust mount, while engine bells attach at the bottom.',
      interstage: 'Incorrect position! The lower booster hull spans the main lower section beneath the carbon interstage collar.',
      second_stage_body: 'Incorrect position! The massive first-stage hull belongs on the lower section, not the smaller upper stage.',
      payload_fairing: 'Incorrect position! The heavy booster airframe supports the base of the rocket, not the nose cone.',
    },
  },
  {
    id: 'first_stage_tanks',
    sequenceStep: 2,
    name: 'First-Stage Propellant Tanks',
    shortName: 'Stage 1 Tanks',
    targetName: 'Lower Cryo Tank Bay',
    anchorPos: { x: 0.0, y: -2.05, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.05,
    func: 'Stores supercooled liquid oxygen and rocket-grade kerosene fuel for the nine first-stage main engines.',
    massKg: 6400,
    telemetryTag: 'LOX / RP-1 BAY',
    correctNote:
      'Correct placement! Dual first-stage LOX and kerosene propellant tanks are secured inside the booster bay.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! Internal propellant tanks mount inside the lower booster bay above the engine manifold.',
      second_stage_body: 'Incorrect position! First-stage propellant tanks belong in the lower booster section, not in the upper second stage.',
      payload_fairing: 'Incorrect position! The nose cone houses spacecraft payload, never main booster fuel tanks.',
    },
  },
  {
    id: 'first_stage_engines',
    sequenceStep: 3,
    name: 'First-Stage Engine Cluster',
    shortName: '9-Engine Cluster',
    targetName: 'Aft Octaweb Mount',
    anchorPos: { x: 0.0, y: -3.28, z: 0.0 },
    idealYaw: 0.3,
    idealPitch: 0.14,
    func: 'Nine sea-level rocket engine bells arranged in an octagonal cluster to lift the launch vehicle off the pad.',
    massKg: 4200,
    telemetryTag: '9x LIFTOFF THRUST',
    correctNote:
      'Correct placement! The 9-engine cluster and Octaweb heat shield are bolted cleanly to the base of the first stage.',
    wrongNotes: {
      interstage: 'Incorrect position! Liftoff engines must exhaust downward from the very bottom of the first stage.',
      second_stage_engine: 'Incorrect position! The upper interstage houses the single vacuum nozzle; the 9-engine cluster bolts to the bottom aft bulkhead.',
      payload_fairing: 'Incorrect position! Mounting engines at the nose cone would fire downward into the rocket body.',
    },
  },
  {
    id: 'interstage',
    sequenceStep: 4,
    name: 'Interstage',
    shortName: 'Interstage',
    targetName: 'Stage 1–2 Junction',
    anchorPos: { x: 0.0, y: 0.56, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.04,
    func: 'Hollow carbon-composite cylinder connecting the first and second stages and shielding the upper-stage engine until separation.',
    massKg: 1100,
    telemetryTag: 'STAGE SEP RING',
    correctNote:
      'Correct placement! The carbon-composite Interstage bridges the first and second stages with pneumatic pushers.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! The interstage joins the top of Stage 1 to Stage 2 in the middle of the rocket.',
      second_stage_body: 'Incorrect position! Place the black interstage collar at the junction just below the second stage.',
      payload_fairing: 'Incorrect position! The interstage belongs between stages in the middle, not on top as a nose fairing.',
    },
  },
  {
    id: 'second_stage_engine',
    sequenceStep: 5,
    name: 'Second-Stage Vacuum Engine',
    shortName: 'Vacuum Engine',
    targetName: 'Interstage Vacuum Bay',
    anchorPos: { x: 0.0, y: 0.68, z: 0.44 },
    idealYaw: 0.1,
    idealPitch: 0.05,
    func: 'Single wide-bell engine optimized for near-vacuum flight to push the satellite all the way into target orbit.',
    massKg: 750,
    telemetryTag: 'VACUUM NOZZLE',
    correctNote:
      'Correct placement! The Second-Stage Vacuum Engine is suspended inside the interstage cavity ready for stage separation.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! The wide vacuum bell nozzle operates on the second stage above the interstage, not on the sea-level aft pad mount.',
      avionics: 'Incorrect position! The vacuum engine bell mounts under the second-stage tank bulkhead, not in the forward avionics ring.',
      payload_fairing: 'Incorrect position! Exhaust nozzles never mount inside the satellite payload fairing.',
    },
  },
  {
    id: 'second_stage_body',
    sequenceStep: 6,
    name: 'Second-Stage Structure & Propellant Tanks',
    shortName: 'Stage 2 Body',
    targetName: 'Upper Stage Section',
    anchorPos: { x: 0.0, y: 1.56, z: 0.0 },
    idealYaw: 0.3,
    idealPitch: 0.02,
    func: 'Upper rocket stage airframe and pressurized propellant tanks that carry the payload after first-stage separation.',
    massKg: 4100,
    telemetryTag: 'STAGE 2 TANKS',
    correctNote:
      'Correct placement! The Second-Stage Structure and Propellant Tanks are stacked directly onto the interstage collar.',
    wrongNotes: {
      first_stage_structure: 'Incorrect position! The upper second-stage section stacks above the middle interstage, not down on the lower booster.',
      first_stage_tanks: 'Incorrect position! That lower bay holds first-stage booster tanks; mount the second stage above the interstage.',
      payload_fairing: 'Incorrect position! The second-stage propellant section sits directly below the fairing, not at the pointed tip.',
    },
  },
  {
    id: 'avionics',
    sequenceStep: 7,
    name: 'Flight Computer / Avionics',
    shortName: 'Flight Avionics',
    targetName: 'Upper Guidance Ring',
    anchorPos: { x: 0.0, y: 2.26, z: 0.38 },
    idealYaw: 0.12,
    idealPitch: -0.05,
    func: 'Triple-redundant guidance computer, inertial navigation unit, and flight telemetry controller guiding ascent.',
    massKg: 140,
    telemetryTag: 'GNC AVIONICS',
    correctNote:
      'Correct placement! Flight Computer and inertial guidance avionics are integrated into the upper guidance collar.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! Sensitive guidance computers must be mounted in the upper avionics ring away from engine exhaust heat.',
      landing_legs: 'Incorrect position! Avionics mount cleanly inside the upper guidance collar near the payload adapter.',
    },
  },
  {
    id: 'grid_fins',
    sequenceStep: 8,
    name: 'Grid Fins',
    shortName: 'Grid Fins',
    targetName: 'Upper Booster Collar',
    anchorPos: { x: -0.58, y: 0.12, z: 0.0 },
    idealYaw: 0.45,
    idealPitch: 0.08,
    func: 'Deployable titanium lattice aerodynamic fins mounted near the top of the first stage to steer the booster during atmospheric reentry.',
    massKg: 320,
    telemetryTag: 'REENTRY STEERING',
    correctNote:
      'Correct placement! Four titanium Grid Fins are hinged around the upper collar of the first-stage booster.',
    wrongNotes: {
      landing_legs: 'Incorrect position! Grid fins belong near the TOP of the first stage for aerodynamic steering, while landing legs mount at the bottom.',
      payload_fairing: 'Incorrect position! Grid fins steer the returning booster stage, not the orbital nose fairing.',
    },
  },
  {
    id: 'landing_legs',
    sequenceStep: 9,
    name: 'Landing Legs',
    shortName: 'Landing Legs',
    targetName: 'Lower Booster Flanks',
    anchorPos: { x: 0.58, y: -2.45, z: 0.0 },
    idealYaw: -0.4,
    idealPitch: 0.12,
    func: 'Four folded carbon-fiber telescopic legs around the base of the first stage that deploy right before vertical booster touchdown.',
    massKg: 1850,
    telemetryTag: 'RECOVERY GEAR',
    correctNote:
      'Correct placement! Four stowed Landing Legs are locked along the lower flanks of the first-stage booster.',
    wrongNotes: {
      grid_fins: 'Incorrect position! Landing legs must mount at the BOTTOM flanks of the booster to support touchdown, not at the upper collar.',
      second_stage_body: 'Incorrect position! Only the reusable first-stage booster carries landing legs; the second stage stays in space.',
    },
  },
  {
    id: 'payload_fairing',
    sequenceStep: 10,
    name: 'Payload Fairing / Nose Cone',
    shortName: 'Nose Fairing',
    targetName: 'Top Nose Fairing Mount',
    anchorPos: { x: 0.0, y: 3.15, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: -0.08,
    func: 'Aerodynamic split clamshell nose cone that shields the satellite from air drag, acoustic vibration, and atmospheric heating during liftoff.',
    massKg: 1900,
    telemetryTag: 'CLAMSHELL FAIRING',
    correctNote:
      'Correct placement! The split clamshell Payload Fairing / Nose Cone caps the second stage, ready for satellite payload integration.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! The aerodynamic nose cone caps the very top of the rocket, not the bottom aft engines.',
      interstage: 'Incorrect position! Place the clamshell nose fairing at the very top above the second stage and avionics ring.',
    },
  },
];

export const LEVEL4_BASE_MASS_KG = 400;
export const LEVEL4_MAX_MASS_KG = 500;
export const LEVEL4_SHAKER_BASE_SCORE = 30;
export const LEVEL4_SHAKER_PASS_SCORE = 70;

export const LEVEL4_PROTECTION_PARTS: ProtectionPartSpec[] = [
  {
    id: 'structural_reinforcement',
    name: 'LIGHTWEIGHT STRUCTURAL REINFORCEMENT',
    shortName: 'Structural Frame',
    massKg: 20,
    powerW: 0,
    vibrationBonus: 25,
    targetZoneId: 'zone-frame',
    targetZoneName: 'Structural Frame Trusses',
    purpose: 'Strengthens chassis ribs against launch bending (+25 Vibration).',
    category: 'vibration',
    wrongZoneTip: 'Structural struts lock onto the Structural Frame Trusses along the satellite core.',
  },
  {
    id: 'heavy_armor',
    name: 'HEAVY ARMOR PLATES',
    shortName: 'Heavy Armor',
    massKg: 40,
    powerW: 0,
    vibrationBonus: 15,
    targetZoneId: 'zone-armor',
    targetZoneName: 'Outer Bus Armor Bays',
    purpose: 'Heavy physical shielding against debris and acoustic shock (+15 Vibration).',
    category: 'vibration',
    wrongZoneTip: 'Armor plates bolt onto the Outer Bus Armor Bays on the exterior flanks.',
  },
  {
    id: 'vibration_mounts',
    name: 'VIBRATION ISOLATION MOUNTS',
    shortName: 'Isolation Mounts',
    massKg: 15,
    powerW: 0,
    vibrationBonus: 35,
    targetZoneId: 'zone-mounts',
    targetZoneName: 'Avionics Deck Mounts',
    purpose: 'Dampens violent launch vibration on sensitive electronics (+35 Vibration).',
    category: 'vibration',
    wrongZoneTip: 'Isolation mounts cushion the Avionics Deck Mounts at the base adapter ring.',
  },
  {
    id: 'thermal_insulation',
    name: 'THERMAL INSULATION BLANKETS',
    shortName: 'Thermal Blanket',
    massKg: 10,
    powerW: 0,
    vibrationBonus: 0,
    targetZoneId: 'zone-insulation',
    targetZoneName: 'Outer MLI Thermal Skin',
    purpose: 'Reflective gold MLI wrap slows freezing heat loss in space.',
    category: 'thermal',
    wrongZoneTip: 'Insulation blankets wrap around the Outer MLI Thermal Skin of the bus.',
  },
  {
    id: 'small_heater',
    name: 'SMALL ELECTRICAL HEATER',
    shortName: 'Small Heater',
    massKg: 5,
    powerW: 30,
    vibrationBonus: 0,
    targetZoneId: 'zone-small-heater',
    targetZoneName: 'Aux Electronics Heater Bay',
    purpose: 'Generates moderate warmth (30 W) for sensitive avionics.',
    category: 'thermal',
    wrongZoneTip: 'Install the small heater inside the Aux Electronics Heater Bay.',
  },
  {
    id: 'large_heater',
    name: 'LARGE ELECTRICAL HEATER',
    shortName: 'Large Heater',
    massKg: 15,
    powerW: 80,
    vibrationBonus: 0,
    targetZoneId: 'zone-large-heater',
    targetZoneName: 'Primary Thermal Bus Bay',
    purpose: 'High-output heater (80 W) with stronger power demand.',
    category: 'thermal',
    wrongZoneTip: 'Install the large heater inside the Primary Thermal Bus Bay.',
  },
];

export type StoreMissionGroup = 'level_7';

export interface StoreItemSpec {
  id: string;
  name: string;
  icon: string;
  missionGroup: StoreMissionGroup;
  missionLabel: string;
  roleTag: string;
  category: string;
  priceStarCredits: number;
  description: string;
  specs: string;
}

export const STORE_ITEMS: StoreItemSpec[] = [
  // Level 7: Lunar Water Hunt Hardware
  {
    id: 'lvl8_neutron_spec',
    name: 'Lunar Neutron Spectrometer',
    icon: '🔬',
    missionGroup: 'level_7',
    missionLabel: 'LEVEL 7 • LUNAR WATER HUNT',
    roleTag: 'Science & Comms',
    category: 'Water-Ice Detection',
    priceStarCredits: 450,
    description:
      'Detects hydrogen signatures consistent with possible water ice inside permanently shadowed south-pole lunar craters.',
    specs: 'Polar Crater Scan • Hydrogen Flux Sensor',
  },
  {
    id: 'lvl8_ice_radar',
    name: 'Dual-Band Ice Penetrating Radar',
    icon: '📡',
    missionGroup: 'level_7',
    missionLabel: 'LEVEL 7 • LUNAR WATER HUNT',
    roleTag: 'Science & Comms Officer',
    category: 'Water-Ice Detection',
    priceStarCredits: 400,
    description:
      'Synthetic-aperture radar instrument for probing regolith layers in shadowed south-pole craters.',
    specs: 'Subsurface Scan • Crater Ice Mapping',
  },
  {
    id: 'lvl8_ir_mapper',
    name: 'Cryo-Infrared Crater Mapper',
    icon: '🌡️',
    missionGroup: 'level_7',
    missionLabel: 'LEVEL 7 • LUNAR WATER HUNT',
    roleTag: 'Science & Comms Officer',
    category: 'Thermal Mapping',
    priceStarCredits: 350,
    description:
      'Ultra-cold thermal infrared sensor measuring cryogenic temperatures inside permanently shadowed lunar craters.',
    specs: 'Cryo-IR Array • South Pole Cold Traps',
  },
  {
    id: 'lvl8_heavy_rocket_kit',
    name: 'Heavy Lunar Launch Capacity Kit',
    icon: '🚀',
    missionGroup: 'level_7',
    missionLabel: 'LEVEL 7 • LUNAR WATER HUNT',
    roleTag: 'Propulsion & Design',
    category: 'Launch Vehicle',
    priceStarCredits: 550,
    description:
      'Upgraded launch vehicle payload rating to carry both lunar spacecraft dry mass and Lunar Orbit Insertion propellant.',
    specs: 'High Payload Margin • Earth-to-Moon Transfer',
  },
  {
    id: 'lvl8_loi_propulsion',
    name: 'Lunar Orbit Braking & Fuel Manifold',
    icon: '⛽',
    missionGroup: 'level_7',
    missionLabel: 'LEVEL 7 • LUNAR WATER HUNT',
    roleTag: 'Flight Dynamics & Propulsion',
    category: 'LOI Braking',
    priceStarCredits: 400,
    description:
      'Precision propulsion and propellant valve controller for trajectory corrections and Lunar Orbit Insertion capture.',
    specs: 'Dual-Fuel Budget • LOI Velocity Shedding',
  },
  {
    id: 'lvl8_crew_comms',
    name: 'Deep-Space Relay Transceiver',
    icon: '📡',
    missionGroup: 'level_7',
    missionLabel: 'LEVEL 7 • LUNAR WATER HUNT',
    roleTag: 'Deep-Space Comms',
    category: 'Deep-Space Link',
    priceStarCredits: 300,
    description:
      'Multi-channel mission transceiver linking Propulsion, Spacecraft Design, Flight Dynamics, and Science telemetry to Earth.',
    specs: 'Quad-Channel Sync • Deep-Space Telemetry',
  },
];
