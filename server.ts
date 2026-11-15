import express, { NextFunction, Request, Response } from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { evaluateLunarFuel, isValidLunarFuelValue } from './src/utils/lunarFuelMath.ts';
import {
  CALIBRATION_EXPERIMENTS,
  DEFAULT_LEVEL6_PROGRESS,
  DEFAULT_PROBE_BUILD,
  EUROPA_LOCATIONS,
  EUROPA_MAX_BUDGET_SC,
  EUROPA_MAX_WEIGHT_KG,
  EUROPA_MISSION_DURATION_SEC,
  evaluateProbeBuild,
  StoredLevel6Progress,
} from './src/utils/europaMissionData.ts';
import {
  DEFAULT_LEVEL8_PROGRESS,
  DEFAULT_LUNAR_BUILD,
  evaluateLunarSpacecraft,
  LUNAR_SOUTH_POLE_CRATERS,
  LUNAR_WATER_DURATION_SEC,
  StoredLevel8Progress,
} from './src/utils/lunarWaterData.ts';
import {
  DEFAULT_LEVEL9_PROGRESS,
  LEVEL9_BADGE_ID,
  LEVEL9_MISSION_DURATION_SEC,
  LEVEL9_REWARD_SC,
  Level9Stage,
  StoredLevel9Progress,
} from './src/utils/astronautRescueData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_DIR = path.join(__dirname, '.data');
const DB_FILE = path.join(DB_DIR, 'galaxyx-db.json');
const AUTH_REGISTRY_FILE = path.join(DB_DIR, 'auth-registry.json');
const FIREBASE_CONFIG_FILE = path.join(__dirname, 'firebase-applet-config.json');

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  try {
    const raw = fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FirebaseAppletConfig>;
    return {
      projectId: String(parsed.projectId || ''),
      apiKey: String(parsed.apiKey || ''),
      firestoreDatabaseId: String(parsed.firestoreDatabaseId || '(default)'),
    };
  } catch {
    return { projectId: '', apiKey: '', firestoreDatabaseId: '(default)' };
  }
}

const FIREBASE_CONFIG = loadFirebaseConfig();
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthenticatedRequest extends Request {
  authUid: string;
  authEmail: string;
  authToken: string;
}

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Google x509 certs: ${resp.status}`);
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  certsExpiresAt = now + Math.max(60, maxAgeSec) * 1000;
  cachedCerts = (await resp.json()) as Record<string, string>;
  return cachedCerts;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
  }>(payloadB64);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token algorithm or missing key ID.');
  }
  const projectId = FIREBASE_CONFIG.projectId;
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error('Invalid Firebase token audience.');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Invalid Firebase token issuer.');
  }
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) {
    throw new Error('Invalid Firebase token subject.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Firebase ID token issued in the future.');
  }

  const certs = await getGooglePublicCerts();
  let cert = certs[header.kid];
  if (!cert) {
    certsExpiresAt = 0;
    const freshCerts = await getGooglePublicCerts();
    cert = freshCerts[header.kid];
  }
  if (!cert) {
    throw new Error('Signing certificate not found for Firebase token.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const sigNorm = sigB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigBuf = Buffer.from(
    sigNorm.padEnd(sigNorm.length + ((4 - (sigNorm.length % 4)) % 4), '='),
    'base64'
  );
  if (!verifier.verify(cert, sigBuf)) {
    throw new Error('Firebase ID token signature verification failed.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
  };
}

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  const token = match[1].trim();
  try {
    const verified = await verifyFirebaseIdToken(token);
    (req as AuthenticatedRequest).authUid = verified.uid;
    (req as AuthenticatedRequest).authEmail = verified.email;
    (req as AuthenticatedRequest).authToken = token;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Invalid or expired authentication session.',
    });
  }
}

interface AuthRegistryEntry {
  uid: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthRegistrySchema {
  usernames: Record<string, AuthRegistryEntry>;
}

function ensureAuthRegistry(): AuthRegistrySchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUTH_REGISTRY_FILE)) {
    const initial: AuthRegistrySchema = { usernames: {} };
    fs.writeFileSync(AUTH_REGISTRY_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(AUTH_REGISTRY_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AuthRegistrySchema>;
    return {
      usernames:
        parsed.usernames && typeof parsed.usernames === 'object' ? parsed.usernames : {},
    };
  } catch {
    return { usernames: {} };
  }
}

function saveAuthRegistry(reg: AuthRegistrySchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const tmpFile = `${AUTH_REGISTRY_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(reg, null, 2), 'utf8');
  fs.renameSync(tmpFile, AUTH_REGISTRY_FILE);
}

const REQUIRED_LEVEL_1_SAT_PARTS = [
  'bus',
  'solar',
  'battery',
  'antenna',
  'camera',
  'propulsion',
  'computer',
  'adcs',
  'thermal',
] as const;

const REQUIRED_LEVEL_1_ROCKET_PARTS = [
  'first_stage_structure',
  'first_stage_tanks',
  'first_stage_engines',
  'interstage',
  'second_stage_body',
  'second_stage_engine',
  'avionics',
  'grid_fins',
  'landing_legs',
  'payload_fairing',
] as const;

export type StoredLaunchSequenceStatus =
  | 'not_started'
  | 'countdown'
  | 'ignition'
  | 'ascent'
  | 'completed';

export interface StoredLevel1Progress {
  stage: 1 | 2 | 3 | 4 | 5;
  satParts: string[];
  rocketParts: string[];
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  stage4Done: boolean;
  stage5Done: boolean;
  launchStatus: StoredLaunchSequenceStatus;
}

const DEFAULT_LEVEL1_PROGRESS: StoredLevel1Progress = {
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

export interface StoredLevel2Progress {
  stage: 1 | 2 | 3 | 4;
  rocketParts: string[];
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  stage4Done: boolean;
  launchStatus: StoredLaunchSequenceStatus;
}

const DEFAULT_LEVEL2_PROGRESS: StoredLevel2Progress = {
  stage: 1,
  rocketParts: [],
  stage1Done: false,
  stage2Done: false,
  stage3Done: false,
  stage4Done: false,
  launchStatus: 'not_started',
};

const LEVEL4_BASE_MASS_KG = 400;
const LEVEL4_MAX_MASS_KG = 500;
const LEVEL4_SHAKER_BASE_SCORE = 30;
const LEVEL4_SHAKER_PASS_SCORE = 70;

const LEVEL4_PART_META = {
  structural_reinforcement: { massKg: 20, powerW: 0, vibrationBonus: 25 },
  heavy_armor: { massKg: 40, powerW: 0, vibrationBonus: 15 },
  vibration_mounts: { massKg: 15, powerW: 0, vibrationBonus: 35 },
  thermal_insulation: { massKg: 10, powerW: 0, vibrationBonus: 0 },
  small_heater: { massKg: 5, powerW: 30, vibrationBonus: 0 },
  large_heater: { massKg: 15, powerW: 80, vibrationBonus: 0 },
} as const;

type Level4PartId = keyof typeof LEVEL4_PART_META;

export interface StoredLevel4Progress {
  stage: 1 | 2 | 3 | 4 | 5;
  installedParts: Level4PartId[];
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

const DEFAULT_LEVEL4_PROGRESS: StoredLevel4Progress = {
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

export interface RewardTransaction {
  id: string;
  key: string;
  type:
    | 'NEW_RECRUIT'
    | 'LEVEL_1_COMPLETION'
    | 'LEVEL_2_COMPLETION'
    | 'LEVEL_3_COMPLETION'
    | 'LEVEL_4_COMPLETION'
    | 'LEVEL_5_COMPLETION'
    | 'LEVEL_6_COMPLETION'
    | 'LEVEL_7_COMPLETION'
    | 'LEVEL_8_COMPLETION'
    | 'LEVEL_9_COMPLETION'
    | 'MISSION_REWARD'
    | 'PURCHASE'
    | 'REFUND';
  amountStarCredits: number;
  amountGrantCredits: number;
  amountXp?: number;
  badge?: string;
  note: string;
  timestamp: string;
}

export interface StoredPlayerRecord {
  userId: string;
  uid?: string;
  username?: string;
  email?: string;
  callsign: string;
  joined: boolean;
  trainingCompleted: boolean;
  currentCampaignLevel: number;
  currentMissionStage: number;
  completedLevels: number[];
  unlockedLevels: number[];
  levelStars: Record<number, number>;
  totalStars: number;
  levelScores: Record<number, number>;
  grantCredits: number;
  starCredits: number;
  xp: number;
  badges: string[];
  propulsionUpgradeUnlocked: boolean;
  level5FlybyCompleted: boolean;
  level5BestFuelKg: number | null;
  unlockedStoreItems: string[];
  rewardsCollected: string[];
  transactions: RewardTransaction[];
  level1Progress: StoredLevel1Progress;
  level2Progress: StoredLevel2Progress;
  level4Progress: StoredLevel4Progress;
  level6Progress: StoredLevel6Progress;
  level7Progress: StoredLevel8Progress;
  level8Progress: StoredLevel9Progress;
  updatedAt: string;
}

const STORE_ITEM_CATALOG: Record<string, { name: string; priceStarCredits: number }> = {
  lvl8_neutron_spec: { name: 'Lunar Neutron Spectrometer', priceStarCredits: 450 },
  lvl8_ice_radar: { name: 'Dual-Band Ice Penetrating Radar', priceStarCredits: 400 },
  lvl8_ir_mapper: { name: 'Cryo-Infrared Crater Mapper', priceStarCredits: 350 },
  lvl8_heavy_rocket_kit: { name: 'Heavy Lunar Launch Capacity Kit', priceStarCredits: 550 },
  lvl8_loi_propulsion: { name: 'Lunar Orbit Braking & Fuel Manifold', priceStarCredits: 400 },
  lvl8_crew_comms: { name: 'Deep-Space Relay Transceiver', priceStarCredits: 300 },
};

interface DatabaseSchema {
  users: Record<string, StoredPlayerRecord>;
}

function ensureDb(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = { users: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
    };
  } catch {
    return { users: {} };
  }
}

function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function normalizeUserId(raw?: string): string {
  const cleaned = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_@.-]/g, '')
    .slice(0, 128);
  return cleaned;
}

function recomputeDerivedServerFields(player: StoredPlayerRecord): StoredPlayerRecord {
  const completedSet = new Set<number>();
  for (const lvl of player.completedLevels || []) {
    const n = Math.floor(Number(lvl));
    if (Number.isFinite(n) && n >= 1 && n <= 8) completedSet.add(n);
  }
  player.completedLevels = Array.from(completedSet).sort((a, b) => a - b);

  const unlockedSet = new Set<number>([1]);
  for (const lvl of player.unlockedLevels || []) {
    const n = Math.floor(Number(lvl));
    if (Number.isFinite(n) && n >= 1 && n <= 8) unlockedSet.add(n);
  }
  for (const lvl of player.completedLevels) {
    if (lvl + 1 <= 8) unlockedSet.add(lvl + 1);
  }
  unlockedSet.add(Math.max(1, Math.min(8, Math.floor(player.currentCampaignLevel || 1))));
  player.unlockedLevels = Array.from(unlockedSet).sort((a, b) => a - b);

  const stars: Record<number, number> = { ...(player.levelStars || {}) };
  for (const lvl of player.completedLevels) {
    stars[lvl] = Math.max(stars[lvl] || 0, 3);
  }
  player.levelStars = stars;
  player.totalStars = Object.values(stars).reduce((sum, s) => sum + Math.max(0, Math.min(3, Math.floor(Number(s || 0)))), 0);

  const rewards = new Set<string>(player.rewardsCollected || []);
  for (const tx of player.transactions || []) {
    if (tx.key) rewards.add(tx.key);
  }
  if (player.joined) rewards.add('NEW_RECRUIT');
  for (const lvl of player.completedLevels) {
    rewards.add(`LEVEL_${lvl}_COMPLETE`);
  }
  player.rewardsCollected = Array.from(rewards).slice(0, 100);

  const cur = player.currentCampaignLevel;
  player.currentMissionStage =
    cur === 1
      ? player.level1Progress?.stage || 0
      : cur === 2
      ? player.level2Progress?.stage || 0
      : cur === 4
      ? player.level4Progress?.stage || 0
      : cur === 6
      ? player.level6Progress?.stage || 0
      : cur === 7
      ? player.level7Progress?.stage || 0
      : cur === 8
      ? player.level8Progress?.stage || 0
      : player.currentMissionStage || 0;

  return player;
}

function getOrCreatePlayer(
  db: DatabaseSchema,
  userId: string,
  callsign?: string,
  email?: string
): StoredPlayerRecord {
  const id = normalizeUserId(userId);
  if (!db.users[id]) {
    const cleanCallsign = callsign?.trim() || 'Explorer-01';
    db.users[id] = {
      userId: id,
      uid: id,
      username: callsign?.trim() || '',
      email: email || '',
      callsign: cleanCallsign,
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
      level7Progress: { ...DEFAULT_LEVEL8_PROGRESS, build: { ...DEFAULT_LUNAR_BUILD } },
      level8Progress: { ...DEFAULT_LEVEL9_PROGRESS },
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
  }
  const p = db.users[id];
  p.uid = id;
  if (callsign?.trim()) {
    p.callsign = callsign.trim();
    if (!p.username) p.username = callsign.trim();
  }
  if (email && !p.email) {
    p.email = email;
  }
  p.currentCampaignLevel = Math.max(1, Math.min(8, Number(p.currentCampaignLevel || 1)));
  if (Array.isArray(p.completedLevels)) {
    p.completedLevels = p.completedLevels.filter((l) => l >= 1 && l <= 8);
  } else {
    p.completedLevels = [];
  }
  if (typeof p.xp !== 'number') p.xp = 0;
  if (typeof p.propulsionUpgradeUnlocked !== 'boolean') p.propulsionUpgradeUnlocked = false;
  if (typeof p.level5FlybyCompleted !== 'boolean') p.level5FlybyCompleted = false;
  if (p.level5BestFuelKg === undefined) p.level5BestFuelKg = null;
  if (!Array.isArray(p.unlockedStoreItems)) p.unlockedStoreItems = [];
  if (!Array.isArray(p.rewardsCollected)) p.rewardsCollected = [];
  if (!p.levelStars || typeof p.levelStars !== 'object') p.levelStars = {};
  if (!Array.isArray(p.unlockedLevels)) p.unlockedLevels = [1];

  p.level1Progress = p.level1Progress
    ? { ...DEFAULT_LEVEL1_PROGRESS, ...p.level1Progress }
    : { ...DEFAULT_LEVEL1_PROGRESS };
  p.level2Progress = p.level2Progress
    ? { ...DEFAULT_LEVEL2_PROGRESS, ...p.level2Progress }
    : { ...DEFAULT_LEVEL2_PROGRESS };
  p.level4Progress = p.level4Progress
    ? { ...DEFAULT_LEVEL4_PROGRESS, ...p.level4Progress }
    : { ...DEFAULT_LEVEL4_PROGRESS };
  p.level6Progress = p.level6Progress
    ? { ...DEFAULT_LEVEL6_PROGRESS, ...p.level6Progress }
    : { ...DEFAULT_LEVEL6_PROGRESS };

  if (!p.level7Progress || !('craterScans' in (p.level7Progress as unknown as Record<string, unknown>))) {
    p.level7Progress = { ...DEFAULT_LEVEL8_PROGRESS, build: { ...DEFAULT_LUNAR_BUILD } };
  } else {
    p.level7Progress = {
      ...DEFAULT_LEVEL8_PROGRESS,
      ...p.level7Progress,
      build: { ...DEFAULT_LUNAR_BUILD, ...(p.level7Progress.build || {}) },
    };
  }
  if (!p.level8Progress || !('astronautLocated' in (p.level8Progress as unknown as Record<string, unknown>))) {
    p.level8Progress = { ...DEFAULT_LEVEL9_PROGRESS };
  } else {
    p.level8Progress = { ...DEFAULT_LEVEL9_PROGRESS, ...p.level8Progress };
  }
  delete (p as unknown as Record<string, unknown>).level9Progress;
  return recomputeDerivedServerFields(p);
}

type FirestoreRestValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreRestValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreRestValue> } };

function decodeFirestoreRestValue(val: FirestoreRestValue | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((item) => decodeFirestoreRestValue(item));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      out[k] = decodeFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

async function hydratePlayerFromFirestoreRest(
  db: DatabaseSchema,
  uid: string,
  idToken: string,
  fallbackEmail = ''
): Promise<StoredPlayerRecord> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_CONFIG.projectId
    )}/databases/${encodeURIComponent(
      FIREBASE_CONFIG.firestoreDatabaseId
    )}/documents/players/${encodeURIComponent(uid)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (resp.ok) {
      const docJson = (await resp.json()) as { fields?: Record<string, FirestoreRestValue> };
      if (docJson.fields) {
        const decoded: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(docJson.fields)) {
          decoded[k] = decodeFirestoreRestValue(v);
        }
        const username = String(decoded.username || decoded.callsign || 'Explorer-01');
        const email = String(decoded.email || fallbackEmail || '');
        const base = getOrCreatePlayer(db, uid, username, email);
        const merged: StoredPlayerRecord = {
          ...base,
          userId: uid,
          uid,
          username,
          email,
          callsign: String(decoded.callsign || username),
          joined: Boolean(decoded.joined),
          trainingCompleted: Boolean(decoded.trainingCompleted),
          currentCampaignLevel: Math.max(1, Math.min(8, Number(decoded.currentCampaignLevel || base.currentCampaignLevel || 1))),
          currentMissionStage: Number(decoded.currentMissionStage ?? base.currentMissionStage ?? 0),
          completedLevels: Array.isArray(decoded.completedLevels)
            ? (decoded.completedLevels as number[]).filter((n) => n >= 1 && n <= 8)
            : base.completedLevels,
          unlockedLevels: Array.isArray(decoded.unlockedLevels)
            ? (decoded.unlockedLevels as number[]).filter((n) => n >= 1 && n <= 8)
            : base.unlockedLevels,
          levelStars:
            decoded.levelStars && typeof decoded.levelStars === 'object'
              ? (decoded.levelStars as Record<number, number>)
              : base.levelStars,
          levelScores:
            decoded.levelScores && typeof decoded.levelScores === 'object'
              ? (decoded.levelScores as Record<number, number>)
              : base.levelScores,
          grantCredits: Number(decoded.grantCredits ?? base.grantCredits),
          starCredits: Number(decoded.starCredits ?? base.starCredits),
          xp: Number(decoded.xp ?? base.xp),
          badges: Array.isArray(decoded.badges) ? (decoded.badges as string[]).map(String) : base.badges,
          propulsionUpgradeUnlocked: Boolean(decoded.propulsionUpgradeUnlocked),
          level5FlybyCompleted: Boolean(decoded.level5FlybyCompleted),
          level5BestFuelKg:
            typeof decoded.level5BestFuelKg === 'number' ? decoded.level5BestFuelKg : null,
          unlockedStoreItems: Array.isArray(decoded.unlockedStoreItems)
            ? (decoded.unlockedStoreItems as string[]).map(String)
            : base.unlockedStoreItems,
          rewardsCollected: Array.isArray(decoded.rewardsCollected)
            ? (decoded.rewardsCollected as string[]).map(String)
            : base.rewardsCollected,
          transactions: Array.isArray(decoded.transactions)
            ? (decoded.transactions as RewardTransaction[])
            : base.transactions,
          level1Progress:
            decoded.level1Progress && typeof decoded.level1Progress === 'object'
              ? { ...DEFAULT_LEVEL1_PROGRESS, ...(decoded.level1Progress as Partial<StoredLevel1Progress>) }
              : base.level1Progress,
          level2Progress:
            decoded.level2Progress && typeof decoded.level2Progress === 'object'
              ? { ...DEFAULT_LEVEL2_PROGRESS, ...(decoded.level2Progress as Partial<StoredLevel2Progress>) }
              : base.level2Progress,
          level4Progress:
            decoded.level4Progress && typeof decoded.level4Progress === 'object'
              ? { ...DEFAULT_LEVEL4_PROGRESS, ...(decoded.level4Progress as Partial<StoredLevel4Progress>) }
              : base.level4Progress,
          level6Progress:
            decoded.level6Progress && typeof decoded.level6Progress === 'object'
              ? { ...DEFAULT_LEVEL6_PROGRESS, ...(decoded.level6Progress as Partial<StoredLevel6Progress>) }
              : base.level6Progress,
          level7Progress:
            decoded.level7Progress && typeof decoded.level7Progress === 'object'
              ? { ...DEFAULT_LEVEL8_PROGRESS, ...(decoded.level7Progress as Partial<StoredLevel8Progress>) }
              : base.level7Progress,
          level8Progress:
            decoded.level8Progress && typeof decoded.level8Progress === 'object'
              ? { ...DEFAULT_LEVEL9_PROGRESS, ...(decoded.level8Progress as Partial<StoredLevel9Progress>) }
              : base.level8Progress,
          updatedAt: new Date().toISOString(),
        };
        db.users[uid] = recomputeDerivedServerFields(merged);
        saveDb(db);

        // Keep private username registry synchronized across container restarts
        if (username && email) {
          const unameLower = username.toLowerCase();
          const reg = ensureAuthRegistry();
          if (!reg.usernames[unameLower] || reg.usernames[unameLower].uid === uid) {
            reg.usernames[unameLower] = {
              uid,
              username,
              email,
              createdAt: reg.usernames[unameLower]?.createdAt || new Date().toISOString(),
            };
            saveAuthRegistry(reg);
          }
        }
        return db.users[uid];
      }
    }
  } catch {
    // Fall back to server local record if Firestore REST read is unavailable
  }
  return getOrCreatePlayer(db, uid, undefined, fallbackEmail);
}

async function resolveAuthenticatedPlayer(
  db: DatabaseSchema,
  authReq: AuthenticatedRequest,
  callsign?: string
): Promise<StoredPlayerRecord> {
  if (db.users[authReq.authUid]) {
    return getOrCreatePlayer(db, authReq.authUid, callsign, authReq.authEmail);
  }
  return hydratePlayerFromFirestoreRest(
    db,
    authReq.authUid,
    authReq.authToken,
    authReq.authEmail
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  const httpServer = http.createServer(app);

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'spaceverse-galaxy-x' });
  });

  // ========================================================
  // SECURE AUTHENTICATION & USERNAME LOOKUP ENDPOINTS
  // ========================================================
  app.post('/api/auth/check-username', (req, res) => {
    const username = String(req.body?.username || '').trim();
    if (!USERNAME_REGEX.test(username)) {
      res.json({
        valid: false,
        available: false,
        error: 'Username must be 3–24 characters using letters, numbers, underscores, or hyphens.',
      });
      return;
    }
    const reg = ensureAuthRegistry();
    const taken = Boolean(reg.usernames[username.toLowerCase()]);
    res.json({
      valid: true,
      available: !taken,
      error: taken ? 'That username is already taken.' : undefined,
    });
  });

  app.post('/api/auth/register-username', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const username = String(req.body?.username || '').trim();
    const email = (authReq.authEmail || String(req.body?.email || '').trim()).toLowerCase();

    if (!USERNAME_REGEX.test(username)) {
      res.status(400).json({ error: 'Invalid username format.' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }

    const unameLower = username.toLowerCase();
    const reg = ensureAuthRegistry();
    const existing = reg.usernames[unameLower];
    if (existing && existing.uid !== authReq.authUid) {
      res.status(409).json({ error: 'Username is already claimed by another player.' });
      return;
    }

    reg.usernames[unameLower] = {
      uid: authReq.authUid,
      username,
      email,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    saveAuthRegistry(reg);

    const db = ensureDb();
    const player = getOrCreatePlayer(db, authReq.authUid, username, email);
    player.username = username;
    player.email = email;
    player.callsign = username;
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ ok: true, player });
  });

  app.post('/api/auth/sync-username', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const username = String(req.body?.username || '').trim();
    const email = (authReq.authEmail || String(req.body?.email || '').trim()).toLowerCase();
    if (USERNAME_REGEX.test(username) && EMAIL_REGEX.test(email)) {
      const unameLower = username.toLowerCase();
      const reg = ensureAuthRegistry();
      if (!reg.usernames[unameLower] || reg.usernames[unameLower].uid === authReq.authUid) {
        reg.usernames[unameLower] = {
          uid: authReq.authUid,
          username,
          email,
          createdAt: reg.usernames[unameLower]?.createdAt || new Date().toISOString(),
        };
        saveAuthRegistry(reg);
      }
    }
    res.json({ ok: true });
  });

  // Trusted server-side username -> account verification (never leaks private mappings or passwords)
  app.post('/api/auth/login-username', async (req, res) => {
    const identifier = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    let resolvedEmail = '';
    if (identifier.includes('@') && EMAIL_REGEX.test(identifier)) {
      resolvedEmail = identifier.toLowerCase();
    } else {
      const reg = ensureAuthRegistry();
      const entry = reg.usernames[identifier.toLowerCase()];
      if (!entry) {
        res.status(401).json({ error: 'Invalid username or password.' });
        return;
      }
      resolvedEmail = entry.email;
    }

    try {
      const verifyResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(
          FIREBASE_CONFIG.apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: resolvedEmail,
            password,
            returnSecureToken: false,
          }),
        }
      );

      if (!verifyResp.ok) {
        const errBody = (await verifyResp.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        const code = errBody?.error?.message || '';
        if (
          code.includes('OPERATION_NOT_ALLOWED') ||
          code.includes('CONFIGURATION_NOT_FOUND') ||
          code.includes('PASSWORD_LOGIN_DISABLED')
        ) {
          res.status(400).json({
            error:
              'Email/Password sign-in is not yet enabled in Firebase Console Authentication Providers.',
          });
          return;
        }
        if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
          res.status(429).json({
            error: 'Too many unsuccessful login attempts. Please try again shortly.',
          });
          return;
        }
        res.status(401).json({ error: 'Invalid username or password.' });
        return;
      }

      res.json({ ok: true, email: resolvedEmail });
    } catch {
      res.status(502).json({ error: 'Authentication verification service unavailable.' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const identifier = String(req.body?.identifier || '').trim();
    if (!identifier) {
      res.status(400).json({ error: 'Please enter your username or email address.' });
      return;
    }

    let resolvedEmail = '';
    if (identifier.includes('@') && EMAIL_REGEX.test(identifier)) {
      resolvedEmail = identifier.toLowerCase();
    } else {
      const reg = ensureAuthRegistry();
      const entry = reg.usernames[identifier.toLowerCase()];
      if (entry) resolvedEmail = entry.email;
    }

    if (resolvedEmail && FIREBASE_CONFIG.apiKey) {
      try {
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(
            FIREBASE_CONFIG.apiKey
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email: resolvedEmail,
            }),
          }
        );
      } catch {
        // Silent to prevent user enumeration
      }
    }

    res.json({
      ok: true,
      message:
        'If an account matches that username or email, a password reset link has been sent.',
    });
  });

  app.post('/api/auth/delete-account', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const reg = ensureAuthRegistry();
    for (const [unameLower, entry] of Object.entries(reg.usernames)) {
      if (entry.uid === authReq.authUid) {
        delete reg.usernames[unameLower];
      }
    }
    saveAuthRegistry(reg);

    const db = ensureDb();
    delete db.users[authReq.authUid];
    saveDb(db);

    res.json({ ok: true });
  });

  // ========================================================
  // AUTHENTICATED PLAYER PROFILE & PROGRESS HYDRATION
  // ========================================================
  app.get('/api/player/session', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = db.users[authReq.authUid]
      ? getOrCreatePlayer(db, authReq.authUid, undefined, authReq.authEmail)
      : await hydratePlayerFromFirestoreRest(db, authReq.authUid, authReq.authToken, authReq.authEmail);
    res.json({ player });
  });

  app.post('/api/player/hydrate', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await hydratePlayerFromFirestoreRest(
      db,
      authReq.authUid,
      authReq.authToken,
      authReq.authEmail
    );
    res.json({ player });
  });

  // Idempotent New Recruit commission (awards 500 SC + NEW_RECRUIT badge once per user)
  app.post('/api/player/recruit', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const db = ensureDb();
    const player = db.users[userId]
      ? getOrCreatePlayer(db, userId, req.body?.callsign, authReq.authEmail)
      : await hydratePlayerFromFirestoreRest(db, userId, authReq.authToken, authReq.authEmail);

    const txKey = `${userId}:NEW_RECRUIT`;
    const alreadyRecruited =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.joined;

    if (!alreadyRecruited) {
      player.joined = true;
      player.grantCredits = Math.max(player.grantCredits, 500);
      player.starCredits = Math.max(player.starCredits, 500);
      if (!player.badges.includes('NEW_RECRUIT')) {
        player.badges.push('NEW_RECRUIT');
      }
      player.transactions.push({
        id: `tx_${Date.now()}_recruit`,
        key: txKey,
        type: 'NEW_RECRUIT',
        amountStarCredits: 500,
        amountGrantCredits: 500,
        badge: 'NEW_RECRUIT',
        note: 'GALAXY-X New Recruit Commission',
        timestamp: new Date().toISOString(),
      });
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player, alreadyAwarded: alreadyRecruited });
  });

  // Mark Cadet Orientation Training completed
  app.post('/api/player/training', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const trainingCompleted = Boolean(req.body?.trainingCompleted);
    const db = ensureDb();
    const player = db.users[userId]
      ? getOrCreatePlayer(db, userId, undefined, authReq.authEmail)
      : await hydratePlayerFromFirestoreRest(db, userId, authReq.authToken, authReq.authEmail);

    player.trainingCompleted = trainingCompleted;
    if (trainingCompleted && !player.badges.includes('MISSION_ARCHITECT')) {
      player.badges.push('MISSION_ARCHITECT');
    }
    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ player });
  });

  // Persist mid-level stage progress for Level 1 (5-stage mission) or reset on replay
  app.post('/api/levels/1/progress', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (req.body?.reset === true) {
      player.level1Progress = { ...DEFAULT_LEVEL1_PROGRESS };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: 1 | 2 | 3 | 4 | 5 =
        stageRaw === 5 ? 5 : stageRaw === 4 ? 4 : stageRaw === 3 ? 3 : stageRaw === 2 ? 2 : 1;

      const satParts = Array.isArray(incoming.satParts)
        ? Array.from(new Set<string>(incoming.satParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_SAT_PARTS as readonly string[]).includes(p)
          )
        : player.level1Progress.satParts;

      const rocketParts = Array.isArray(incoming.rocketParts)
        ? Array.from(new Set<string>(incoming.rocketParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_ROCKET_PARTS as readonly string[]).includes(p)
          )
        : player.level1Progress.rocketParts;

      const rawLaunchStatus = String(incoming.launchStatus || 'not_started');
      const launchStatus: StoredLaunchSequenceStatus =
        rawLaunchStatus === 'countdown' ||
        rawLaunchStatus === 'ignition' ||
        rawLaunchStatus === 'ascent' ||
        rawLaunchStatus === 'completed'
          ? rawLaunchStatus
          : 'not_started';

      player.level1Progress = {
        stage,
        satParts,
        rocketParts,
        stage1Done: Boolean(incoming.stage1Done) && satParts.length === REQUIRED_LEVEL_1_SAT_PARTS.length,
        stage2Done: Boolean(incoming.stage2Done) && rocketParts.length === REQUIRED_LEVEL_1_ROCKET_PARTS.length,
        stage3Done: Boolean(incoming.stage3Done),
        stage4Done: Boolean(incoming.stage4Done),
        stage5Done: Boolean(incoming.stage5Done) && launchStatus === 'completed',
        launchStatus,
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 1 (Satellite Assembly) completion (+1000 SC & SATELLITE_BUILDER once per user)
  app.post('/api/levels/1/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const satRaw = Array.isArray(req.body?.installedSatParts)
      ? req.body.installedSatParts
      : Array.isArray(req.body?.installedParts)
      ? req.body.installedParts
      : [];

    const uniqueSat = new Set(satRaw.map((p: unknown) => String(p)));
    const hasAllNineSat = REQUIRED_LEVEL_1_SAT_PARTS.every((reqPart) => uniqueSat.has(reqPart));

    if (!hasAllNineSat) {
      res.status(400).json({
        error: 'Incomplete Level 1 mission. All 9 satellite subsystems must be assembled before claiming rewards.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    player.level1Progress = {
      ...player.level1Progress,
      stage: 1,
      satParts: [...REQUIRED_LEVEL_1_SAT_PARTS],
      stage1Done: true,
    };

    const txKey = `${userId}:LEVEL_1_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(1);

    let rewardAwarded = 0;

    if (!alreadyRewarded) {
      rewardAwarded = 1000;
      player.starCredits += 1000;
      if (!player.completedLevels.includes(1)) {
        player.completedLevels.push(1);
      }
      if (!player.badges.includes('SATELLITE_BUILDER')) {
        player.badges.push('SATELLITE_BUILDER');
      }
      player.levelScores[1] = Math.max(player.levelScores[1] || 0, 1000);
      player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 2);

      player.transactions.push({
        id: `tx_${Date.now()}_lvl1`,
        key: txKey,
        type: 'LEVEL_1_COMPLETION',
        amountStarCredits: 1000,
        amountGrantCredits: 0,
        badge: 'SATELLITE_BUILDER',
        note: 'Level 1: Satellite Assembly Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      badgeAwarded: 'SATELLITE_BUILDER',
    });
  });

  // Persist mid-level stage progress for Level 2 (Rocket Assembly -> Launch)
  app.post('/api/levels/2/progress', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (req.body?.reset === true) {
      player.level2Progress = { ...DEFAULT_LEVEL2_PROGRESS };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: 1 | 2 | 3 | 4 =
        stageRaw === 4 ? 4 : stageRaw === 3 ? 3 : stageRaw === 2 ? 2 : 1;

      const rocketParts = Array.isArray(incoming.rocketParts)
        ? Array.from(new Set<string>(incoming.rocketParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_ROCKET_PARTS as readonly string[]).includes(p)
          )
        : player.level2Progress.rocketParts;

      const rawLaunchStatus = String(incoming.launchStatus || 'not_started');
      const launchStatus: StoredLaunchSequenceStatus =
        rawLaunchStatus === 'countdown' ||
        rawLaunchStatus === 'ignition' ||
        rawLaunchStatus === 'ascent' ||
        rawLaunchStatus === 'completed'
          ? rawLaunchStatus
          : 'not_started';

      player.level2Progress = {
        stage,
        rocketParts,
        stage1Done: Boolean(incoming.stage1Done) && rocketParts.length === REQUIRED_LEVEL_1_ROCKET_PARTS.length,
        stage2Done: Boolean(incoming.stage2Done),
        stage3Done: Boolean(incoming.stage3Done),
        stage4Done: Boolean(incoming.stage4Done) && launchStatus === 'completed',
        launchStatus,
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 2 (Rocket Assembly & Orbital Launch) completion (+1000 SC & ROCKET_COMMANDER once per user)
  app.post('/api/levels/2/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const rocketRaw = Array.isArray(req.body?.installedRocketParts) ? req.body.installedRocketParts : [];
    const uniqueRocket = new Set(rocketRaw.map((p: unknown) => String(p)));

    const hasAllTenRocket = REQUIRED_LEVEL_1_ROCKET_PARTS.every((reqPart) => uniqueRocket.has(reqPart));
    const launchpadDone = Boolean(req.body?.stage2LaunchpadDone ?? req.body?.stage3LaunchpadDone);
    const payloadDone = Boolean(req.body?.stage3PayloadDone ?? req.body?.stage4PayloadDone);
    const launchDone =
      Boolean(req.body?.stage4LaunchDone ?? req.body?.stage5LaunchDone) ||
      req.body?.launchStatus === 'completed';

    if (!hasAllTenRocket || !launchpadDone || !payloadDone || !launchDone) {
      res.status(400).json({
        error:
          'Incomplete Level 2 mission. Rocket assembly (10 modules), launchpad positioning, payload fairing integration, and rocket launch must be completed.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    player.level2Progress = {
      stage: 4,
      rocketParts: [...REQUIRED_LEVEL_1_ROCKET_PARTS],
      stage1Done: true,
      stage2Done: true,
      stage3Done: true,
      stage4Done: true,
      launchStatus: 'completed',
    };

    const txKey = `${userId}:LEVEL_2_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(2);

    let rewardAwarded = 0;

    if (!alreadyRewarded) {
      rewardAwarded = 1000;
      player.starCredits += 1000;
      if (!player.completedLevels.includes(2)) {
        player.completedLevels.push(2);
      }
      if (!player.badges.includes('ROCKET_COMMANDER')) {
        player.badges.push('ROCKET_COMMANDER');
      }
      player.levelScores[2] = Math.max(player.levelScores[2] || 0, 1000);
      player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 3);

      player.transactions.push({
        id: `tx_${Date.now()}_lvl2`,
        key: txKey,
        type: 'LEVEL_2_COMPLETION',
        amountStarCredits: 1000,
        amountGrantCredits: 0,
        badge: 'ROCKET_COMMANDER',
        note: 'Level 2: Rocket Assembly & Orbital Launch Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      badgeAwarded: 'ROCKET_COMMANDER',
    });
  });

  // Server-validated Level 3 (Orbit & Power Management) completion (+1000 SC & ORBIT_POWER_ENGINEER once per user)
  app.post('/api/levels/3/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const solarCapacityW = Number(req.body?.solarCapacityW);
    const batteryCapacityWh = Number(req.body?.batteryCapacityWh);
    const enteredShadow = Boolean(req.body?.enteredShadow);
    const exitedShadow = Boolean(req.body?.exitedShadow);
    const minBatteryWh = Number(req.body?.minBatteryWh);
    const finalBatteryWh = Number(req.body?.finalBatteryWh);

    const validSolar = !Number.isNaN(solarCapacityW) && solarCapacityW >= 50 && solarCapacityW <= 250;
    const validBattery = batteryCapacityWh === 300 || batteryCapacityWh === 500 || batteryCapacityWh === 800;
    const survivedEclipse =
      enteredShadow &&
      exitedShadow &&
      !Number.isNaN(minBatteryWh) &&
      minBatteryWh > 0 &&
      !Number.isNaN(finalBatteryWh) &&
      finalBatteryWh > 0;

    if (!validSolar || !validBattery || !survivedEclipse) {
      res.status(400).json({
        error:
          'Incomplete Level 3 mission. Satellite must enter Earth shadow, maintain positive battery reserves throughout eclipse, and re-enter sunlight.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    const txKey = `${userId}:LEVEL_3_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(3);

    let rewardAwarded = 0;

    if (!alreadyRewarded) {
      rewardAwarded = 1000;
      player.starCredits += 1000;
      if (!player.completedLevels.includes(3)) {
        player.completedLevels.push(3);
      }
      if (!player.badges.includes('ORBIT_POWER_ENGINEER')) {
        player.badges.push('ORBIT_POWER_ENGINEER');
      }
      player.levelScores[3] = Math.max(player.levelScores[3] || 0, 1000);
      player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 4);

      player.transactions.push({
        id: `tx_${Date.now()}_lvl3`,
        key: txKey,
        type: 'LEVEL_3_COMPLETION',
        amountStarCredits: 1000,
        amountGrantCredits: 0,
        badge: 'ORBIT_POWER_ENGINEER',
        note: 'Level 3: Orbit & Power Management Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      badgeAwarded: 'ORBIT_POWER_ENGINEER',
    });
  });

  // Persist mid-level stage progress for Level 4 (Shake & Freeze Test) or reset on replay
  app.post('/api/levels/4/progress', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (req.body?.reset === true) {
      player.level4Progress = { ...DEFAULT_LEVEL4_PROGRESS };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: 1 | 2 | 3 | 4 | 5 =
        stageRaw === 5 ? 5 : stageRaw === 4 ? 4 : stageRaw === 3 ? 3 : stageRaw === 2 ? 2 : 1;

      const validPartIds = Object.keys(LEVEL4_PART_META) as Level4PartId[];
      const installedParts: Level4PartId[] = Array.isArray(incoming.installedParts)
        ? Array.from(new Set<string>(incoming.installedParts.map((p: unknown) => String(p)))).filter(
            (p): p is Level4PartId => validPartIds.includes(p as Level4PartId)
          )
        : player.level4Progress.installedParts;

      const totalMassKg =
        LEVEL4_BASE_MASS_KG +
        installedParts.reduce((sum, p) => sum + (LEVEL4_PART_META[p]?.massKg || 0), 0);

      const shakerScore =
        LEVEL4_SHAKER_BASE_SCORE +
        installedParts.reduce((sum, p) => sum + (LEVEL4_PART_META[p]?.vibrationBonus || 0), 0);

      const shakerSignature = installedParts
        .filter((p) => p === 'structural_reinforcement' || p === 'heavy_armor' || p === 'vibration_mounts')
        .sort()
        .join(',');

      const freezerSignature = installedParts
        .filter((p) => p === 'thermal_insulation' || p === 'small_heater' || p === 'large_heater')
        .sort()
        .join(',');

      const rawShakerRes = String(incoming.shakerResult || 'pending');
      const shakerResult: 'pending' | 'passed' | 'failed' =
        rawShakerRes === 'passed' && shakerScore >= LEVEL4_SHAKER_PASS_SCORE && totalMassKg <= LEVEL4_MAX_MASS_KG
          ? 'passed'
          : rawShakerRes === 'failed'
          ? 'failed'
          : 'pending';

      const rawFreezerRes = String(incoming.freezerResult || 'pending');
      const hasThermalPassParts =
        installedParts.includes('thermal_insulation') &&
        (installedParts.includes('small_heater') || installedParts.includes('large_heater'));
      const minTempNum = incoming.freezerMinTempC !== null && incoming.freezerMinTempC !== undefined
        ? Number(incoming.freezerMinTempC)
        : null;
      const finalTempNum = incoming.freezerFinalTempC !== null && incoming.freezerFinalTempC !== undefined
        ? Number(incoming.freezerFinalTempC)
        : null;

      const freezerResult: 'pending' | 'passed' | 'failed' =
        rawFreezerRes === 'passed' &&
        hasThermalPassParts &&
        totalMassKg <= LEVEL4_MAX_MASS_KG &&
        minTempNum !== null &&
        !Number.isNaN(minTempNum) &&
        minTempNum >= -20
          ? 'passed'
          : rawFreezerRes === 'failed'
          ? 'failed'
          : 'pending';

      const finalQualified =
        shakerResult === 'passed' && freezerResult === 'passed' && totalMassKg <= LEVEL4_MAX_MASS_KG;

      player.level4Progress = {
        stage,
        installedParts,
        totalMassKg,
        shakerResult,
        shakerScore,
        shakerSignature,
        freezerResult,
        freezerMinTempC: minTempNum,
        freezerFinalTempC: finalTempNum,
        freezerSignature,
        finalQualified,
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 4 (Shake & Freeze Test) completion (+750 SC, +100 XP, THERMAL_PROTECTION_ENGINEER once per user)
  app.post('/api/levels/4/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const validPartIds = Object.keys(LEVEL4_PART_META) as Level4PartId[];
    const partsRaw = Array.isArray(req.body?.installedParts) ? req.body.installedParts : [];
    const installedParts: Level4PartId[] = Array.from(
      new Set<string>(partsRaw.map((p: unknown) => String(p)))
    ).filter((p): p is Level4PartId => validPartIds.includes(p as Level4PartId));

    const totalMassKg =
      LEVEL4_BASE_MASS_KG +
      installedParts.reduce((sum, p) => sum + LEVEL4_PART_META[p].massKg, 0);
    const shakerScore =
      LEVEL4_SHAKER_BASE_SCORE +
      installedParts.reduce((sum, p) => sum + LEVEL4_PART_META[p].vibrationBonus, 0);

    const shakerPassed =
      shakerScore >= LEVEL4_SHAKER_PASS_SCORE &&
      (req.body?.shakerPassed === undefined || Boolean(req.body?.shakerPassed));
    const minTempC = Number(req.body?.freezerMinTempC ?? req.body?.minTempC);
    const finalTempC = Number(req.body?.freezerFinalTempC ?? req.body?.finalTempC);

    const hasThermalSetup =
      installedParts.includes('thermal_insulation') &&
      (installedParts.includes('small_heater') || installedParts.includes('large_heater'));
    const validTemps =
      !Number.isNaN(minTempC) &&
      minTempC >= -20 &&
      !Number.isNaN(finalTempC) &&
      finalTempC >= -20 &&
      finalTempC <= 50;
    const freezerPassed =
      req.body?.freezerPassed === undefined ? validTemps && hasThermalSetup : Boolean(req.body?.freezerPassed);

    if (totalMassKg > LEVEL4_MAX_MASS_KG || !shakerPassed || !freezerPassed || !hasThermalSetup || !validTemps) {
      res.status(400).json({
        error:
          'Incomplete Level 4 qualification. Satellite must be <= 500 kg, pass Shaker Table (>= 70), and survive the 60s Freezer Test at or above -20°C.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    const shakerSignature = installedParts
      .filter((p) => p === 'structural_reinforcement' || p === 'heavy_armor' || p === 'vibration_mounts')
      .sort()
      .join(',');
    const freezerSignature = installedParts
      .filter((p) => p === 'thermal_insulation' || p === 'small_heater' || p === 'large_heater')
      .sort()
      .join(',');

    player.level4Progress = {
      stage: 5,
      installedParts,
      totalMassKg,
      shakerResult: 'passed',
      shakerScore,
      shakerSignature,
      freezerResult: 'passed',
      freezerMinTempC: Math.round(minTempC * 10) / 10,
      freezerFinalTempC: Math.round(finalTempC * 10) / 10,
      freezerSignature,
      finalQualified: true,
    };

    const txKey = `${userId}:LEVEL_4_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(4);

    let rewardAwarded = 0;
    let xpAwarded = 0;

    if (!alreadyRewarded) {
      rewardAwarded = 750;
      xpAwarded = 100;
      player.starCredits += 750;
      player.xp = (player.xp || 0) + 100;
      if (!player.completedLevels.includes(4)) {
        player.completedLevels.push(4);
      }
      if (!player.badges.includes('THERMAL_PROTECTION_ENGINEER')) {
        player.badges.push('THERMAL_PROTECTION_ENGINEER');
      }
      player.levelScores[4] = Math.max(player.levelScores[4] || 0, 750);
      player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 5);

      player.transactions.push({
        id: `tx_${Date.now()}_lvl4`,
        key: txKey,
        type: 'LEVEL_4_COMPLETION',
        amountStarCredits: 750,
        amountGrantCredits: 0,
        amountXp: 100,
        badge: 'THERMAL_PROTECTION_ENGINEER',
        note: 'Level 4: Shake & Freeze Qualification Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      xpAwarded,
      badgeAwarded: 'THERMAL_PROTECTION_ENGINEER',
    });
  });

  // Server-validated Level 5 (Lunar Flyby – Fuel Math) completion
  // Awards +1000 SC, unlocks Propulsion Upgrade, awards PROPULSION_ENGINEER badge, and unlocks Level 6 once per user
  app.post('/api/levels/5/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const rawFuelKg = Number(req.body?.fuelKg);
    const confirmedFuelConfig = Boolean(req.body?.confirmedFuelConfig);
    const flybySimulationCompleted = Boolean(req.body?.flybySimulationCompleted);
    const missionDurationSec = Number(req.body?.missionDurationSec ?? 0);

    if (
      !isValidLunarFuelValue(rawFuelKg) ||
      !confirmedFuelConfig ||
      !flybySimulationCompleted ||
      !Number.isFinite(missionDurationSec) ||
      missionDurationSec < 1
    ) {
      res.status(400).json({
        error:
          'Incomplete Level 5 mission. Select a valid fuel allocation (45–65 kg), confirm configuration, and finish the lunar flyby simulation.',
      });
      return;
    }

    const evaluation = evaluateLunarFuel(rawFuelKg);
    if (!evaluation.isOptimal) {
      res.status(400).json({
        error: `Fuel allocation ${evaluation.fuelKg} kg is not optimal (${evaluation.headline}). Must be between 45 and 65 kg.`,
        evaluation,
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    const txKey = `${userId}:LEVEL_5_FLYBY_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.level5FlybyCompleted === true;

    let rewardAwarded = 0;

    player.level5FlybyCompleted = true;
    player.propulsionUpgradeUnlocked = true;
    player.level5BestFuelKg = evaluation.fuelKg;

    if (!player.completedLevels.includes(5)) {
      player.completedLevels.push(5);
    }
    if (!player.badges.includes('PROPULSION_ENGINEER')) {
      player.badges.push('PROPULSION_ENGINEER');
    }
    player.levelScores[5] = Math.max(player.levelScores[5] || 0, 1000);
    player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 6);

    if (!alreadyRewarded) {
      rewardAwarded = 1000;
      player.starCredits += 1000;
      player.transactions.push({
        id: `tx_${Date.now()}_lvl5`,
        key: txKey,
        type: 'LEVEL_5_COMPLETION',
        amountStarCredits: 1000,
        amountGrantCredits: 0,
        badge: 'PROPULSION_ENGINEER',
        note: `Level 5: Lunar Flyby – Fuel Math (${evaluation.fuelKg} kg Optimal Fuel + Propulsion Upgrade)`,
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      propulsionUpgradeUnlocked: true,
      badgeAwarded: 'PROPULSION_ENGINEER',
      evaluation,
    });
  });

  // Persist Level 6 (Europa Thermometer Telemetry Probe) stage & 12-minute countdown state
  app.post('/api/levels/6/progress', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (req.body?.reset === true) {
      player.level6Progress = {
        ...DEFAULT_LEVEL6_PROGRESS,
        probeBuild: { ...DEFAULT_PROBE_BUILD },
        landingSolved: { speed: false, tilt: false, thermal: false },
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 =
        stageRaw === 6
          ? 6
          : stageRaw === 5
          ? 5
          : stageRaw === 4
          ? 4
          : stageRaw === 3
          ? 3
          : stageRaw === 2
          ? 2
          : stageRaw === 1
          ? 1
          : 0;

      const probeBuild = {
        body: String(incoming.probeBuild?.body || player.level6Progress.probeBuild.body || DEFAULT_PROBE_BUILD.body),
        legs: String(incoming.probeBuild?.legs || player.level6Progress.probeBuild.legs || DEFAULT_PROBE_BUILD.legs),
        sensor: String(incoming.probeBuild?.sensor || player.level6Progress.probeBuild.sensor || DEFAULT_PROBE_BUILD.sensor),
        battery: String(incoming.probeBuild?.battery || player.level6Progress.probeBuild.battery || DEFAULT_PROBE_BUILD.battery),
        heater: String(incoming.probeBuild?.heater || player.level6Progress.probeBuild.heater || DEFAULT_PROBE_BUILD.heater),
        antenna: String(incoming.probeBuild?.antenna || player.level6Progress.probeBuild.antenna || DEFAULT_PROBE_BUILD.antenna),
      };

      const calibrationSolvedIds = Array.isArray(incoming.calibrationSolvedIds)
        ? Array.from(new Set<number>(incoming.calibrationSolvedIds.map((id: unknown) => Number(id)))).filter((id) =>
            CALIBRATION_EXPERIMENTS.some((ex) => ex.id === id)
          )
        : player.level6Progress.calibrationSolvedIds;

      const rocketParts = Array.isArray(incoming.rocketParts)
        ? Array.from(new Set<string>(incoming.rocketParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_ROCKET_PARTS as readonly string[]).includes(p)
          )
        : player.level6Progress.rocketParts;

      const rsRaw = Number(incoming.rocketStage);
      const rocketStage: 1 | 2 | 3 | 4 =
        rsRaw === 4 ? 4 : rsRaw === 3 ? 3 : rsRaw === 2 ? 2 : 1;

      const validLocationIds = new Set(EUROPA_LOCATIONS.map((loc) => loc.id));
      const collectedReadings = Array.isArray(incoming.collectedReadings)
        ? (incoming.collectedReadings as unknown[])
            .filter((r: unknown): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
            .filter((r: Record<string, unknown>) =>
              validLocationIds.has(String(r.locationId) as (typeof EUROPA_LOCATIONS)[number]['id'])
            )
            .map((r: Record<string, unknown>) => ({
              locationId: String(r.locationId) as (typeof EUROPA_LOCATIONS)[number]['id'],
              locationName: String(r.locationName || ''),
              measuredTempC: Number(r.measuredTempC),
              accurate: Boolean(r.accurate),
              driftC: Number(r.driftC || 0),
              savedAtIso: String(r.savedAtIso || new Date().toISOString()),
            }))
        : player.level6Progress.collectedReadings;

      const missionStartedAtMs =
        typeof incoming.missionStartedAtMs === 'number' && Number.isFinite(incoming.missionStartedAtMs)
          ? incoming.missionStartedAtMs
          : player.level6Progress.missionStartedAtMs;
      const missionDeadlineMs =
        typeof incoming.missionDeadlineMs === 'number' && Number.isFinite(incoming.missionDeadlineMs)
          ? incoming.missionDeadlineMs
          : missionStartedAtMs
          ? missionStartedAtMs + EUROPA_MISSION_DURATION_SEC * 1000
          : player.level6Progress.missionDeadlineMs;

      player.level6Progress = {
        stage,
        probeBuild,
        calibrationSolvedIds,
        rocketParts,
        rocketStage,
        launchCompleted: Boolean(incoming.launchCompleted),
        landingSolved: {
          speed: Boolean(incoming.landingSolved?.speed),
          tilt: Boolean(incoming.landingSolved?.tilt),
          thermal: Boolean(incoming.landingSolved?.thermal),
        },
        landed: Boolean(incoming.landed),
        collectedReadings,
        transmittedPackets: Math.max(0, Math.min(5, Math.floor(Number(incoming.transmittedPackets ?? 0)))),
        missionStartedAtMs,
        missionDeadlineMs,
        timerExpired: Boolean(incoming.timerExpired),
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 6 (Thermometer Telemetry Probe - Europa) completion
  // Awards +1500 SC, +150 XP, THERMAL_TELEMETRY_SPECIALIST badge, and unlocks Level 7 once per user
  app.post('/api/levels/6/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const probeBuild = {
      body: String(req.body?.probeBuild?.body || ''),
      legs: String(req.body?.probeBuild?.legs || ''),
      sensor: String(req.body?.probeBuild?.sensor || ''),
      battery: String(req.body?.probeBuild?.battery || ''),
      heater: String(req.body?.probeBuild?.heater || ''),
      antenna: String(req.body?.probeBuild?.antenna || ''),
    };
    const evalMetrics = evaluateProbeBuild(probeBuild);

    const calibrationSolvedIds = Array.isArray(req.body?.calibrationSolvedIds)
      ? req.body.calibrationSolvedIds.map((x: unknown) => Number(x))
      : [];
    const allCalibrated = CALIBRATION_EXPERIMENTS.every((ex) => calibrationSolvedIds.includes(ex.id));

    const launchCompleted = Boolean(req.body?.launchCompleted);
    const landed = Boolean(req.body?.landed);
    const collectedIds = new Set(
      Array.isArray(req.body?.collectedReadings)
        ? req.body.collectedReadings.map((r: { locationId?: string }) => String(r?.locationId || ''))
        : []
    );
    const allReadingsCollected = EUROPA_LOCATIONS.every((loc) => collectedIds.has(loc.id));
    const transmittedPackets = Number(req.body?.transmittedPackets ?? 0);
    const timerExpired = Boolean(req.body?.timerExpired);

    if (
      evalMetrics.totalWeightKg > EUROPA_MAX_WEIGHT_KG ||
      evalMetrics.totalCostSc > EUROPA_MAX_BUDGET_SC ||
      !evalMetrics.canLaunch ||
      !allCalibrated ||
      !launchCompleted ||
      !landed ||
      !allReadingsCollected ||
      transmittedPackets < 5 ||
      timerExpired
    ) {
      res.status(400).json({
        error:
          'Incomplete Level 6 Europa mission. Ensure valid probe build (<=120 kg, <=850 SC), all 3 calibrations, launch, safe Europa landing, 5 collected site readings, and all 5 transmitted Earth packets within the 12-minute countdown.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    const txKey = `${userId}:LEVEL_6_EUROPA_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(6);

    let rewardAwarded = 0;
    let xpAwarded = 0;

    if (!player.completedLevels.includes(6)) {
      player.completedLevels.push(6);
    }
    if (!player.badges.includes('THERMAL_TELEMETRY_SPECIALIST')) {
      player.badges.push('THERMAL_TELEMETRY_SPECIALIST');
    }
    player.levelScores[6] = Math.max(player.levelScores[6] || 0, 1500);
    player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 7);

    if (!alreadyRewarded) {
      rewardAwarded = 1500;
      xpAwarded = 150;
      player.starCredits += 1500;
      player.xp = (player.xp || 0) + 150;
      player.transactions.push({
        id: `tx_${Date.now()}_lvl6`,
        key: txKey,
        type: 'LEVEL_6_COMPLETION',
        amountStarCredits: 1500,
        amountGrantCredits: 0,
        amountXp: 150,
        badge: 'THERMAL_TELEMETRY_SPECIALIST',
        note: 'Level 6: Europa Thermometer Telemetry Probe Completion Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      xpAwarded,
      badgeAwarded: 'THERMAL_TELEMETRY_SPECIALIST',
    });
  });

  // Persist Level 7 (Lunar Water Hunt) stage & 10-minute countdown state
  app.post('/api/levels/7/progress', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (req.body?.reset === true) {
      player.level7Progress = {
        ...DEFAULT_LEVEL8_PROGRESS,
        build: { ...DEFAULT_LUNAR_BUILD },
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 =
        stageRaw === 6
          ? 6
          : stageRaw === 5
          ? 5
          : stageRaw === 4
          ? 4
          : stageRaw === 3
          ? 3
          : stageRaw === 2
          ? 2
          : stageRaw === 1
          ? 1
          : 0;

      const build = {
        body: String(incoming.build?.body || player.level7Progress.build.body || DEFAULT_LUNAR_BUILD.body),
        instruments: String(incoming.build?.instruments || player.level7Progress.build.instruments || DEFAULT_LUNAR_BUILD.instruments),
        comms: String(incoming.build?.comms || player.level7Progress.build.comms || DEFAULT_LUNAR_BUILD.comms),
        power: String(incoming.build?.power || player.level7Progress.build.power || DEFAULT_LUNAR_BUILD.power),
        propulsion: String(incoming.build?.propulsion || player.level7Progress.build.propulsion || DEFAULT_LUNAR_BUILD.propulsion),
        navigation: String(incoming.build?.navigation || player.level7Progress.build.navigation || DEFAULT_LUNAR_BUILD.navigation),
        fuel: String(incoming.build?.fuel || player.level7Progress.build.fuel || DEFAULT_LUNAR_BUILD.fuel),
        fuelMassKg: Math.max(20, Math.min(95, Number(incoming.build?.fuelMassKg ?? player.level7Progress.build.fuelMassKg ?? 40))),
      };

      const rocketParts = Array.isArray(incoming.rocketParts)
        ? Array.from(new Set<string>(incoming.rocketParts.map((p: unknown) => String(p)))).filter((p) =>
            (REQUIRED_LEVEL_1_ROCKET_PARTS as readonly string[]).includes(p)
          )
        : player.level7Progress.rocketParts;

      const rsRaw = Number(incoming.rocketStage);
      const rocketStage: 1 | 2 | 3 | 4 =
        rsRaw === 4 ? 4 : rsRaw === 3 ? 3 : rsRaw === 2 ? 2 : 1;

      const validCraterIds = new Set(LUNAR_SOUTH_POLE_CRATERS.map((c) => c.id));
      const craterScans = Array.isArray(incoming.craterScans)
        ? (incoming.craterScans as unknown[])
            .filter((r: unknown): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
            .filter((r: Record<string, unknown>) =>
              validCraterIds.has(String(r.craterId) as (typeof LUNAR_SOUTH_POLE_CRATERS)[number]['id'])
            )
            .map((r: Record<string, unknown>) => ({
              craterId: String(r.craterId) as (typeof LUNAR_SOUTH_POLE_CRATERS)[number]['id'],
              craterName: String(r.craterName || ''),
              scanCount: Math.max(1, Math.min(2, Number(r.scanCount || 1))),
              confidencePct: Number(r.confidencePct || 0),
              hydrogenPpm: Number(r.hydrogenPpm || 0),
              radarIcePct: Number(r.radarIcePct || 0),
              tempC: Number(r.tempC || -150),
              recordedAsEvidence: Boolean(r.recordedAsEvidence),
            }))
        : player.level7Progress.craterScans;

      const missionStartedAtMs =
        typeof incoming.missionStartedAtMs === 'number' && Number.isFinite(incoming.missionStartedAtMs)
          ? incoming.missionStartedAtMs
          : player.level7Progress.missionStartedAtMs;
      const missionDeadlineMs =
        typeof incoming.missionDeadlineMs === 'number' && Number.isFinite(incoming.missionDeadlineMs)
          ? incoming.missionDeadlineMs
          : missionStartedAtMs
          ? missionStartedAtMs + LUNAR_WATER_DURATION_SEC * 1000
          : player.level7Progress.missionDeadlineMs;

      player.level7Progress = {
        stage,
        build,
        fuelTestPassed: Boolean(incoming.fuelTestPassed),
        rocketParts,
        rocketStage,
        launchCompleted: Boolean(incoming.launchCompleted),
        navHeadingDeg: Number(incoming.navHeadingDeg ?? 14),
        navOrbitLocked: Boolean(incoming.navOrbitLocked),
        craterScans,
        evidenceMeterPct: Math.max(0, Math.min(100, Math.round(Number(incoming.evidenceMeterPct ?? 0)))),
        transmittedPct: Math.max(0, Math.min(100, Math.round(Number(incoming.transmittedPct ?? 0)))),
        transmissionInterrupted: Boolean(incoming.transmissionInterrupted),
        missionStartedAtMs,
        missionDeadlineMs,
        timerExpired: Boolean(incoming.timerExpired),
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 7 (Lunar Water Hunt) completion
  // Awards +1500 SC, +200 XP, LUNAR_WATER_EXPLORER badge, and unlocks Level 8 once per user
  app.post('/api/levels/7/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const build = {
      body: String(req.body?.build?.body || ''),
      instruments: String(req.body?.build?.instruments || ''),
      comms: String(req.body?.build?.comms || ''),
      power: String(req.body?.build?.power || ''),
      propulsion: String(req.body?.build?.propulsion || ''),
      navigation: String(req.body?.build?.navigation || ''),
      fuel: String(req.body?.build?.fuel || ''),
      fuelMassKg: Number(req.body?.build?.fuelMassKg ?? 0),
    };
    const metrics = evaluateLunarSpacecraft(build);
    const fuelTestPassed = Boolean(req.body?.fuelTestPassed);
    const launchCompleted = Boolean(req.body?.launchCompleted);
    const navOrbitLocked = Boolean(req.body?.navOrbitLocked);
    const evidenceMeterPct = Number(req.body?.evidenceMeterPct ?? 0);
    const transmittedPct = Number(req.body?.transmittedPct ?? 0);
    const timerExpired = Boolean(req.body?.timerExpired);
    const scannedIds = new Set(
      Array.isArray(req.body?.craterScans)
        ? req.body.craterScans.map((r: { craterId?: string }) => String(r?.craterId || ''))
        : []
    );
    const foundStrongIceCrater = LUNAR_SOUTH_POLE_CRATERS.some(
      (c) => c.hasStrongIceEvidence && scannedIds.has(c.id)
    );

    if (
      metrics.isOverBudget ||
      metrics.isOverWeight ||
      metrics.isOverTankCapacity ||
      metrics.isPowerWeak ||
      metrics.isCommsWeak ||
      metrics.isInstrumentWeak ||
      metrics.fuelExperimentStatus !== 'green' ||
      !fuelTestPassed ||
      !launchCompleted ||
      !navOrbitLocked ||
      !foundStrongIceCrater ||
      evidenceMeterPct < 75 ||
      transmittedPct < 100 ||
      timerExpired
    ) {
      res.status(400).json({
        error:
          'Incomplete Level 7 Lunar Water Hunt mission. Ensure valid spacecraft & green fuel balance, rocket launch, LOI orbit capture, crater ice evidence (≥75%), and 100% Earth transmission before timeout.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    const txKey = `${userId}:LEVEL_7_LUNAR_WATER_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(7);

    let rewardAwarded = 0;
    let xpAwarded = 0;

    if (!player.completedLevels.includes(7)) {
      player.completedLevels.push(7);
    }
    if (!player.badges.includes('LUNAR_WATER_EXPLORER')) {
      player.badges.push('LUNAR_WATER_EXPLORER');
    }
    player.levelScores[7] = Math.max(player.levelScores[7] || 0, 1500);
    player.currentCampaignLevel = Math.max(player.currentCampaignLevel || 1, 8);

    if (!alreadyRewarded) {
      rewardAwarded = 1500;
      xpAwarded = 200;
      player.starCredits += 1500;
      player.xp = (player.xp || 0) + 200;
      player.transactions.push({
        id: `tx_${Date.now()}_lvl7`,
        key: txKey,
        type: 'LEVEL_7_COMPLETION',
        amountStarCredits: 1500,
        amountGrantCredits: 0,
        amountXp: 200,
        badge: 'LUNAR_WATER_EXPLORER',
        note: 'Level 7: Lunar Water Hunt Completion Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      xpAwarded,
      badgeAwarded: 'LUNAR_WATER_EXPLORER',
    });
  });

  // Persist Level 8 (Rescue the Lost Astronaut) mission stage & oxygen/hull/countdown state
  app.post('/api/levels/8/progress', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (req.body?.reset === true) {
      player.level8Progress = { ...DEFAULT_LEVEL9_PROGRESS };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
      res.json({ player });
      return;
    }

    const incoming = req.body?.progress;
    if (incoming && typeof incoming === 'object') {
      const stageRaw = Number(incoming.stage);
      const stage: Level9Stage =
        stageRaw >= 5
          ? 5
          : stageRaw === 4
          ? 4
          : stageRaw === 3
          ? 3
          : stageRaw === 2
          ? 2
          : stageRaw === 1
          ? 1
          : 0;

      const missionStartedAtMs =
        typeof incoming.missionStartedAtMs === 'number' && Number.isFinite(incoming.missionStartedAtMs)
          ? incoming.missionStartedAtMs
          : player.level8Progress.missionStartedAtMs;
      const missionDeadlineMs =
        typeof incoming.missionDeadlineMs === 'number' && Number.isFinite(incoming.missionDeadlineMs)
          ? incoming.missionDeadlineMs
          : missionStartedAtMs
          ? missionStartedAtMs + LEVEL9_MISSION_DURATION_SEC * 1000
          : player.level8Progress.missionDeadlineMs;

      const failedRaw = incoming.failedReason;
      const failedReason: 'oxygen' | 'hull' | 'timer' | null =
        failedRaw === 'oxygen' || failedRaw === 'hull' || failedRaw === 'timer' ? failedRaw : null;

      player.level8Progress = {
        stage,
        missionStartedAtMs,
        missionDeadlineMs,
        oxygenPct: Math.max(0, Math.min(100, Number(incoming.oxygenPct ?? player.level8Progress.oxygenPct ?? 100))),
        hullPct: Math.max(0, Math.min(100, Number(incoming.hullPct ?? player.level8Progress.hullPct ?? 100))),
        astronautLocated: Boolean(incoming.astronautLocated),
        coordinatesLabel: String(incoming.coordinatesLabel || ''),
        commsEstablished: Boolean(incoming.commsEstablished),
        debrisNavigated: Boolean(incoming.debrisNavigated),
        speedMatched: Boolean(incoming.speedMatched),
        armCaptured: Boolean(incoming.armCaptured),
        airlockSecured: Boolean(incoming.airlockSecured),
        failedReason,
      };
      recomputeDerivedServerFields(player);
      player.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    res.json({ player });
  });

  // Server-validated Level 8 (Rescue the Lost Astronaut) completion
  // Awards +1000 SC and SPACE_RESCUE_HERO badge once per user without duplication
  app.post('/api/levels/8/complete', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const astronautLocated = Boolean(req.body?.astronautLocated);
    const commsEstablished = Boolean(req.body?.commsEstablished);
    const debrisNavigated = Boolean(req.body?.debrisNavigated);
    const speedMatched = Boolean(req.body?.speedMatched);
    const armCaptured = Boolean(req.body?.armCaptured);
    const airlockSecured = Boolean(req.body?.airlockSecured ?? armCaptured);
    const timerExpired = Boolean(req.body?.timerExpired);
    const oxygenRemainingPct = Number(req.body?.oxygenRemainingPct ?? 0);
    const hullRemainingPct = Number(req.body?.hullRemainingPct ?? 0);

    if (
      !astronautLocated ||
      !commsEstablished ||
      !debrisNavigated ||
      !speedMatched ||
      !armCaptured ||
      !airlockSecured ||
      timerExpired ||
      oxygenRemainingPct <= 0 ||
      hullRemainingPct <= 0
    ) {
      res.status(400).json({
        error:
          'Incomplete Level 8 Rescue mission. Ensure all 5 rescue stages are completed before oxygen, hull, or the countdown expires.',
      });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    const txKey = `${userId}:LEVEL_8_ASTRONAUT_RESCUE_COMPLETE`;
    const alreadyRewarded =
      player.transactions.some((tx) => tx.key === txKey) ||
      player.rewardsCollected.includes(txKey) ||
      player.completedLevels.includes(8);

    let rewardAwarded = 0;

    if (!player.completedLevels.includes(8)) {
      player.completedLevels.push(8);
    }
    if (!player.badges.includes(LEVEL9_BADGE_ID)) {
      player.badges.push(LEVEL9_BADGE_ID);
    }
    player.levelScores[8] = Math.max(player.levelScores[8] || 0, LEVEL9_REWARD_SC);
    player.currentCampaignLevel = 8;

    if (!alreadyRewarded) {
      rewardAwarded = LEVEL9_REWARD_SC;
      player.starCredits += LEVEL9_REWARD_SC;
      player.transactions.push({
        id: `tx_${Date.now()}_lvl8`,
        key: txKey,
        type: 'LEVEL_8_COMPLETION',
        amountStarCredits: LEVEL9_REWARD_SC,
        amountGrantCredits: 0,
        badge: LEVEL9_BADGE_ID,
        note: 'Level 8: Rescue the Lost Astronaut Completion Reward',
        timestamp: new Date().toISOString(),
      });
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      player,
      alreadyRewarded,
      rewardAwarded,
      badgeAwarded: LEVEL9_BADGE_ID,
    });
  });

  // Update Grant/Star credits & campaign progress for Levels 2-8
  app.post('/api/player/sync', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (typeof req.body?.grantCredits === 'number' && req.body.grantCredits >= 0) {
      player.grantCredits = Math.floor(req.body.grantCredits);
    }
    if (typeof req.body?.currentCampaignLevel === 'number') {
      player.currentCampaignLevel = Math.max(1, Math.min(8, Math.floor(req.body.currentCampaignLevel)));
    }
    if (typeof req.body?.completedLevel === 'number' && req.body.completedLevel >= 2) {
      const lvl = Math.floor(req.body.completedLevel);
      if (!player.completedLevels.includes(lvl)) {
        player.completedLevels.push(lvl);
      }
    }
    if (typeof req.body?.flightRewardStar === 'number' && req.body.flightRewardStar > 0) {
      const flightTxKey = req.body?.flightTxKey ? String(req.body.flightTxKey) : null;
      const dup = flightTxKey
        ? player.transactions.some((t) => t.key === flightTxKey) ||
          player.rewardsCollected.includes(flightTxKey)
        : false;
      if (!dup) {
        const starAmt = Math.min(5000, Math.floor(req.body.flightRewardStar));
        player.starCredits += starAmt;
        if (flightTxKey) {
          player.transactions.push({
            id: `tx_${Date.now()}_flight`,
            key: flightTxKey,
            type: 'MISSION_REWARD',
            amountStarCredits: starAmt,
            amountGrantCredits: Math.floor(req.body?.flightRewardGrant || 0),
            note: String(req.body?.note || 'Flight Mission Reward'),
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
    if (req.body?.levelScores && typeof req.body.levelScores === 'object') {
      for (const [k, v] of Object.entries(req.body.levelScores)) {
        const numK = Number(k);
        const numV = Number(v);
        if (!Number.isNaN(numK) && !Number.isNaN(numV)) {
          player.levelScores[numK] = Math.max(player.levelScores[numK] || 0, numV);
        }
      }
    }

    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ player });
  });

  // Server-authoritative Store Purchase for Level 7 & Level 8 Unlockable Gear
  app.post('/api/store/purchase', requireAuth, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUid;
    const itemId = String(req.body?.itemId || '').trim();
    const spec = STORE_ITEM_CATALOG[itemId];
    if (!spec) {
      res.status(400).json({ error: 'Unknown store item.' });
      return;
    }

    const db = ensureDb();
    const player = await resolveAuthenticatedPlayer(db, authReq);

    if (player.unlockedStoreItems.includes(itemId)) {
      res.json({ player, purchasedItemId: itemId, alreadyUnlocked: true });
      return;
    }

    if (player.starCredits < spec.priceStarCredits) {
      res.status(400).json({
        error: `Insufficient Star Credits. Need ★ ${spec.priceStarCredits} SC (Available: ★ ${player.starCredits} SC).`,
        player,
      });
      return;
    }

    player.starCredits -= spec.priceStarCredits;
    player.unlockedStoreItems.push(itemId);
    player.transactions.push({
      id: `tx_${Date.now()}_store_${itemId}`,
      key: `${userId}:STORE:${itemId}`,
      type: 'PURCHASE',
      amountStarCredits: -spec.priceStarCredits,
      amountGrantCredits: 0,
      note: `Store Unlock: ${spec.name}`,
      timestamp: new Date().toISOString(),
    });
    recomputeDerivedServerFields(player);
    player.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ player, purchasedItemId: itemId, alreadyUnlocked: false });
  });


  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SPACEVERSE // GALAXY-X server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SPACEVERSE server:', err);
  process.exit(1);
});
