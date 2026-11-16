import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  createFreshPlayerState,
  DEFAULT_LEVEL1_PROGRESS,
  DEFAULT_LEVEL2_PROGRESS,
  DEFAULT_LEVEL4_PROGRESS,
  PlayerState,
  PlayerTransaction,
} from '../data/spaceverseData';
import { DEFAULT_LEVEL6_PROGRESS } from '../utils/europaMissionData';
import { DEFAULT_LEVEL8_PROGRESS, DEFAULT_LUNAR_BUILD } from '../utils/lunarWaterData';
import { DEFAULT_LEVEL9_PROGRESS } from '../utils/astronautRescueData';

export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,24}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) {
    return null as T;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export function deriveMissionStage(player: Partial<PlayerState>, stageOverride?: number): number {
  if (typeof stageOverride === 'number' && Number.isFinite(stageOverride)) {
    return clampInt(stageOverride, 0, 20, 0);
  }
  const lvl = clampInt(player.currentCampaignLevel, 1, 8, 1);
  if (lvl === 1) return clampInt(player.level1Progress?.stage, 0, 20, 0);
  if (lvl === 2) return clampInt(player.level2Progress?.stage, 0, 20, 0);
  if (lvl === 4) return clampInt(player.level4Progress?.stage, 0, 20, 0);
  if (lvl === 6) return clampInt(player.level6Progress?.stage, 0, 20, 0);
  if (lvl === 7) return clampInt(player.level7Progress?.stage, 0, 20, 0);
  if (lvl === 8) return clampInt(player.level8Progress?.stage, 0, 20, 0);
  return clampInt(player.currentMissionStage, 0, 20, 0);
}

export function computeDerivedProgress(player: Partial<PlayerState>, stageOverride?: number) {
  const completedSet = new Set<number>();
  if (Array.isArray(player.completedLevels)) {
    for (const raw of player.completedLevels) {
      const n = Math.floor(Number(raw));
      if (Number.isFinite(n) && n >= 1 && n <= 8) {
        completedSet.add(n);
      }
    }
  }
  const completedLevels = Array.from(completedSet).sort((a, b) => a - b);

  const unlockedSet = new Set<number>([1]);
  if (Array.isArray(player.unlockedLevels)) {
    for (const raw of player.unlockedLevels) {
      const n = Math.floor(Number(raw));
      if (Number.isFinite(n) && n >= 1 && n <= 8) {
        unlockedSet.add(n);
      }
    }
  }
  for (const lvl of completedLevels) {
    if (lvl + 1 <= 8) unlockedSet.add(lvl + 1);
  }
  const currentCampaignLevel = clampInt(player.currentCampaignLevel, 1, 8, 1);
  unlockedSet.add(currentCampaignLevel);
  const unlockedLevels = Array.from(unlockedSet).sort((a, b) => a - b).slice(0, 8);

  const levelStarsMap: Record<string, number> = {};
  if (player.levelStars && typeof player.levelStars === 'object') {
    for (const [k, v] of Object.entries(player.levelStars)) {
      const lvl = Math.floor(Number(k));
      if (lvl >= 1 && lvl <= 8) {
        levelStarsMap[String(lvl)] = clampInt(v, 0, 3, 0);
      }
    }
  }
  for (const lvl of completedLevels) {
    levelStarsMap[String(lvl)] = Math.max(levelStarsMap[String(lvl)] || 0, 3);
  }
  const totalStars = clampInt(
    Object.values(levelStarsMap).reduce((sum, s) => sum + s, 0),
    0,
    24,
    0
  );

  const levelScoresMap: Record<string, number> = {};
  if (player.levelScores && typeof player.levelScores === 'object') {
    for (const [k, v] of Object.entries(player.levelScores)) {
      const lvl = Math.floor(Number(k));
      if (lvl >= 1 && lvl <= 8 && Number.isFinite(Number(v))) {
        levelScoresMap[String(lvl)] = clampInt(v, 0, 10000000, 0);
      }
    }
  }

  const badges = Array.from(
    new Set((Array.isArray(player.badges) ? player.badges : []).map((b) => String(b).slice(0, 64)).filter(Boolean))
  ).slice(0, 32);

  const unlockedStoreItems = Array.from(
    new Set(
      (Array.isArray(player.unlockedStoreItems) ? player.unlockedStoreItems : [])
        .map((id) => String(id).slice(0, 64))
        .filter(Boolean)
    )
  ).slice(0, 32);

  const transactions: PlayerTransaction[] = (Array.isArray(player.transactions) ? player.transactions : [])
    .slice(-100)
    .map((tx) => ({
      id: String(tx.id || `tx_${Date.now()}`),
      key: String(tx.key || ''),
      type: String(tx.type || 'MISSION_REWARD'),
      amountStarCredits: Math.floor(Number(tx.amountStarCredits || 0)),
      amountGrantCredits: Math.floor(Number(tx.amountGrantCredits || 0)),
      ...(tx.amountXp !== undefined ? { amountXp: Math.floor(Number(tx.amountXp)) } : {}),
      ...(tx.badge ? { badge: String(tx.badge) } : {}),
      note: String(tx.note || ''),
      timestamp: String(tx.timestamp || new Date().toISOString()),
    }));

  const rewardsSet = new Set<string>(
    (Array.isArray(player.rewardsCollected) ? player.rewardsCollected : [])
      .map((r) => String(r).slice(0, 128))
      .filter(Boolean)
  );
  for (const tx of transactions) {
    if (tx.key) {
      rewardsSet.add(tx.key.slice(0, 128));
    }
  }
  if (player.joined) rewardsSet.add('NEW_RECRUIT');
  for (const lvl of completedLevels) {
    rewardsSet.add(`LEVEL_${lvl}_COMPLETE`);
  }
  const rewardsCollected = Array.from(rewardsSet).slice(0, 100);

  const rawFuel = player.level5BestFuelKg;
  const level5BestFuelKg =
    typeof rawFuel === 'number' && Number.isFinite(rawFuel) && rawFuel >= 0 && rawFuel <= 500
      ? Math.round(rawFuel * 10) / 10
      : null;

  const currentMissionStage = deriveMissionStage(player, stageOverride);

  return {
    joined: Boolean(player.joined),
    trainingCompleted: Boolean(player.trainingCompleted),
    currentCampaignLevel,
    currentMissionStage,
    completedLevels,
    unlockedLevels,
    levelStars: levelStarsMap,
    totalStars,
    levelScores: levelScoresMap,
    grantCredits: clampInt(player.grantCredits, 0, 10000000, 500),
    starCredits: clampInt(player.starCredits, 0, 10000000, 500),
    xp: clampInt(player.xp, 0, 10000000, 0),
    badges,
    propulsionUpgradeUnlocked: Boolean(player.propulsionUpgradeUnlocked),
    level5FlybyCompleted: Boolean(player.level5FlybyCompleted),
    level5BestFuelKg,
    unlockedStoreItems,
    rewardsCollected,
    transactions: stripUndefinedDeep(transactions),
    level1Progress: stripUndefinedDeep({
      ...DEFAULT_LEVEL1_PROGRESS,
      ...(player.level1Progress || {}),
    }),
    level2Progress: stripUndefinedDeep({
      ...DEFAULT_LEVEL2_PROGRESS,
      ...(player.level2Progress || {}),
    }),
    level4Progress: stripUndefinedDeep({
      ...DEFAULT_LEVEL4_PROGRESS,
      ...(player.level4Progress || {}),
    }),
    level6Progress: stripUndefinedDeep({
      ...DEFAULT_LEVEL6_PROGRESS,
      ...(player.level6Progress || {}),
    }),
    level7Progress: stripUndefinedDeep({
      ...DEFAULT_LEVEL8_PROGRESS,
      ...(player.level7Progress || {}),
      build: {
        ...DEFAULT_LUNAR_BUILD,
        ...(player.level7Progress?.build || {}),
      },
    }),
    level8Progress: stripUndefinedDeep({
      ...DEFAULT_LEVEL9_PROGRESS,
      ...(player.level8Progress || {}),
    }),
  };
}

function timestampToIso(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return null;
}

export async function checkUsernameReservedInFirestore(username: string): Promise<boolean> {
  const usernameLower = username.trim().toLowerCase();
  if (!usernameLower) return false;
  const path = `usernames/${usernameLower}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', usernameLower));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createPlayerProfileInFirestore(
  uid: string,
  username: string,
  email: string
): Promise<PlayerState> {
  const existingProfile = await loadPlayerProfileFromFirestore(uid);
  if (existingProfile) {
    return existingProfile;
  }

  const cleanUsername = username.trim().slice(0, 24);
  const usernameLower = cleanUsername.toLowerCase();
  const cleanEmail = email.trim().slice(0, 160);
  const cleanCallsign = cleanUsername.slice(0, 64) || 'Explorer-01';

  let usernameAlreadyOwnedByUid = false;
  const usernamePath = `usernames/${usernameLower}`;
  try {
    const existingUname = await getDoc(doc(db, 'usernames', usernameLower));
    if (existingUname.exists()) {
      if (existingUname.data()?.uid !== uid) {
        throw new Error('USERNAME_ALREADY_TAKEN');
      }
      usernameAlreadyOwnedByUid = true;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_ALREADY_TAKEN') {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, usernamePath);
  }

  const fresh = createFreshPlayerState(uid, cleanUsername, cleanEmail);
  const progressPayload = computeDerivedProgress(fresh);

  const playerPath = `players/${uid}`;
  try {
    const batch = writeBatch(db);
    if (!usernameAlreadyOwnedByUid) {
      batch.set(doc(db, 'usernames', usernameLower), {
        uid,
        username: cleanUsername,
        createdAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'players', uid), {
      uid,
      username: cleanUsername,
      usernameLower,
      email: cleanEmail,
      callsign: cleanCallsign,
      ...progressPayload,
      createdAt: serverTimestamp(),
      lastSavedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, playerPath);
  }

  return {
    ...fresh,
    ...progressPayload,
    levelStars: Object.fromEntries(
      Object.entries(progressPayload.levelStars).map(([k, v]) => [Number(k), v])
    ),
    levelScores: Object.fromEntries(
      Object.entries(progressPayload.levelScores).map(([k, v]) => [Number(k), v])
    ),
    lastSavedAt: new Date().toISOString(),
  };
}

export async function loadPlayerProfileFromFirestore(uid: string): Promise<PlayerState | null> {
  const path = `players/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'players', uid));
    if (!snap.exists()) {
      return null;
    }
    const raw = snap.data() as Record<string, unknown>;
    const username = String(raw.username || raw.callsign || 'Explorer-01');
    const email = String(raw.email || '');
    const base = createFreshPlayerState(uid, username, email);

    const parsedLevelScores: Record<number, number> = {};
    if (raw.levelScores && typeof raw.levelScores === 'object') {
      for (const [k, v] of Object.entries(raw.levelScores as Record<string, unknown>)) {
        const lvl = Number(k);
        const val = Number(v);
        if (Number.isFinite(lvl) && Number.isFinite(val)) {
          parsedLevelScores[lvl] = val;
        }
      }
    }

    const parsedLevelStars: Record<number, number> = {};
    if (raw.levelStars && typeof raw.levelStars === 'object') {
      for (const [k, v] of Object.entries(raw.levelStars as Record<string, unknown>)) {
        const lvl = Number(k);
        const val = Number(v);
        if (Number.isFinite(lvl) && Number.isFinite(val)) {
          parsedLevelStars[lvl] = clampInt(val, 0, 3, 0);
        }
      }
    }

    const hydrated: PlayerState = {
      ...base,
      userId: uid,
      uid,
      username,
      email,
      callsign: String(raw.callsign || username),
      joined: Boolean(raw.joined),
      trainingCompleted: Boolean(raw.trainingCompleted),
      currentCampaignLevel: clampInt(raw.currentCampaignLevel, 1, 8, 1),
      currentMissionStage: clampInt(raw.currentMissionStage, 0, 20, 0),
      completedLevels: Array.isArray(raw.completedLevels)
        ? raw.completedLevels.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 8)
        : [],
      unlockedLevels: Array.isArray(raw.unlockedLevels)
        ? raw.unlockedLevels.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 8)
        : [1],
      levelStars: parsedLevelStars,
      totalStars: clampInt(raw.totalStars, 0, 24, 0),
      levelScores: parsedLevelScores,
      grantCredits: clampInt(raw.grantCredits, 0, 10000000, 500),
      starCredits: clampInt(raw.starCredits, 0, 10000000, 500),
      xp: clampInt(raw.xp, 0, 10000000, 0),
      badges: Array.isArray(raw.badges) ? raw.badges.map(String) : [],
      propulsionUpgradeUnlocked: Boolean(raw.propulsionUpgradeUnlocked),
      level5FlybyCompleted: Boolean(raw.level5FlybyCompleted),
      level5BestFuelKg:
        typeof raw.level5BestFuelKg === 'number' && Number.isFinite(raw.level5BestFuelKg)
          ? raw.level5BestFuelKg
          : null,
      unlockedStoreItems: Array.isArray(raw.unlockedStoreItems)
        ? raw.unlockedStoreItems.map(String)
        : [],
      rewardsCollected: Array.isArray(raw.rewardsCollected)
        ? raw.rewardsCollected.map(String)
        : [],
      transactions: Array.isArray(raw.transactions)
        ? (raw.transactions as PlayerTransaction[])
        : [],
      level1Progress: {
        ...DEFAULT_LEVEL1_PROGRESS,
        ...((raw.level1Progress as Record<string, unknown>) || {}),
      } as PlayerState['level1Progress'],
      level2Progress: {
        ...DEFAULT_LEVEL2_PROGRESS,
        ...((raw.level2Progress as Record<string, unknown>) || {}),
      } as PlayerState['level2Progress'],
      level4Progress: {
        ...DEFAULT_LEVEL4_PROGRESS,
        ...((raw.level4Progress as Record<string, unknown>) || {}),
      } as PlayerState['level4Progress'],
      level6Progress: {
        ...DEFAULT_LEVEL6_PROGRESS,
        ...((raw.level6Progress as Record<string, unknown>) || {}),
      } as PlayerState['level6Progress'],
      level7Progress: {
        ...DEFAULT_LEVEL8_PROGRESS,
        ...((raw.level7Progress as Record<string, unknown>) || {}),
        build: {
          ...DEFAULT_LUNAR_BUILD,
          ...(((raw.level7Progress as Record<string, unknown>)?.build as Record<string, unknown>) || {}),
        },
      } as PlayerState['level7Progress'],
      level8Progress: {
        ...DEFAULT_LEVEL9_PROGRESS,
        ...((raw.level8Progress as Record<string, unknown>) || {}),
      } as PlayerState['level8Progress'],
      lastSavedAt: timestampToIso(raw.lastSavedAt) || timestampToIso(raw.updatedAt),
    };

    const derived = computeDerivedProgress(hydrated);
    return {
      ...hydrated,
      unlockedLevels: derived.unlockedLevels,
      totalStars: derived.totalStars,
      rewardsCollected: derived.rewardsCollected,
      levelStars: Object.fromEntries(
        Object.entries(derived.levelStars).map(([k, v]) => [Number(k), v])
      ),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function savePlayerProfileToFirestore(
  uid: string,
  player: PlayerState,
  stageOverride?: number
): Promise<string> {
  if (!uid) {
    throw new Error('Cannot save profile without authenticated UID.');
  }
  const path = `players/${uid}`;
  const progressPayload = computeDerivedProgress(player, stageOverride);
  try {
    await updateDoc(doc(db, 'players', uid), {
      ...progressPayload,
      lastSavedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return new Date().toISOString();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePlayerDataFromFirestore(
  uid: string,
  username?: string
): Promise<void> {
  const playerPath = `players/${uid}`;
  try {
    await deleteDoc(doc(db, 'players', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, playerPath);
  }

  const usernameLower = (username || '').trim().toLowerCase();
  if (usernameLower) {
    const unamePath = `usernames/${usernameLower}`;
    try {
      const snap = await getDoc(doc(db, 'usernames', usernameLower));
      if (snap.exists() && snap.data()?.uid === uid) {
        await deleteDoc(doc(db, 'usernames', usernameLower));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, unamePath);
    }
  }
}

export function formatAuthErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists.';
  }
  if (raw.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return 'Invalid username/email or password.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (raw.includes('auth/requires-recent-login')) {
    return 'Please verify your current password to perform this sensitive security action.';
  }
  if (
    raw.includes('auth/operation-not-allowed') ||
    raw.includes('CONFIGURATION_NOT_FOUND') ||
    raw.includes('PASSWORD_LOGIN_DISABLED')
  ) {
    return 'Email/Password sign-in is not yet enabled in Firebase Console Authentication Providers.';
  }
  if (raw.includes('USERNAME_ALREADY_TAKEN')) {
    return 'That username is already claimed by another explorer. Choose a unique username.';
  }
  return raw;
}
