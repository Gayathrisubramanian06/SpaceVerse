import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import {
  CAMPAIGN_LEVELS,
  CampaignLevel,
  clearAllLocalPlayerCaches,
  CRATES,
  createFreshPlayerState,
  DEFAULT_LEVEL1_PROGRESS,
  DEFAULT_LEVEL2_PROGRESS,
  DEFAULT_LEVEL4_PROGRESS,
  FacilityLocation,
  getCurrentLocation,
  Level1Progress,
  Level2Progress,
  Level4Progress,
  LOCATIONS,
  PlayerState,
  STORE_ITEMS,
  StoreItemSpec,
  SupplyCrate,
} from './data/spaceverseData';
import {
  computeDerivedProgress,
  createPlayerProfileInFirestore,
  deletePlayerDataFromFirestore,
  formatAuthErrorMessage,
  loadPlayerProfileFromFirestore,
  savePlayerProfileToFirestore,
} from './services/firestoreProfileService';
import { AuthGateModal, AuthViewMode } from './components/AuthGateModal';
import {
  buildDSNGroundStation,
  buildHangarShowcaseSatellite,
  buildLaunchControlComplex,
  buildLaunchPadAndDetailedRocket,
  buildMissionControlCenter,
  buildMissionPlanningHoloTable,
  buildPropulsionNavigationLab,
  buildResearchLabBench,
  buildSupplyCrateModel,
  ColliderCircle,
  CrateVisualHandle,
  createSectorSignSprite,
  RocketVisualHandle,
} from './three/facilityModels';
import { makeFloorTexture, makeHangarFloorTexture } from './three/proceduralTextures';
import { SFX } from './utils/sfx';
import { FacilityMap, MapMissionTarget } from './components/FacilityMap';
import { GalaxyStoreModal } from './components/GalaxyStoreModal';
import { DirectorVanceVoiceBanner } from './components/DirectorVanceVoiceBanner';
import {
  CampaignDirectoryModal,
  ExplorerDossierModal,
  IntroSplash,
  MissionBriefingModal,
  RecruitBadgeModal,
  SubsystemExplorerModal,
  TrainingCompleteModal,
  TrainingIntroModal,
  TutorialTaskModal,
  WelcomeOverlay,
} from './components/Modals';
import {
  Level3CompletionPayload,
  Level3RewardResult,
  OrbitPowerLab,
} from './components/OrbitPowerLab';
import {
  Level2CompletionPayload,
  Level2RewardResult,
  RocketLaunchLab,
} from './components/RocketLaunchLab';
import {
  Level1CompletionPayload,
  Level1RewardResult,
  SatelliteAssemblyLab,
} from './components/SatelliteAssemblyLab';
import {
  Level4CompletionPayload,
  Level4RewardResult,
  ShakeFreezeLab,
} from './components/ShakeFreezeLab';
import {
  Level5CompletionPayload,
  Level5RewardResult,
  LunarFlybyLab,
} from './components/LunarFlybyLab';
import {
  EuropaProbeLab,
  Level6CompletionPayload,
  Level6RewardResult,
} from './components/EuropaProbeLab';
import {
  Level8CompletionPayload,
  Level8RewardResult,
  LunarWaterLab,
} from './components/LunarWaterLab';
import {
  DEFAULT_LEVEL6_PROGRESS,
  StoredLevel6Progress,
} from './utils/europaMissionData';
import {
  DEFAULT_LEVEL8_PROGRESS,
  StoredLevel8Progress,
} from './utils/lunarWaterData';
import {
  AstronautRescueLab,
  Level9CompletionPayload,
  Level9RewardResult,
} from './components/AstronautRescueLab';
import {
  DEFAULT_LEVEL9_PROGRESS,
  LEVEL9_BADGE_ID,
  LEVEL9_REWARD_SC,
  StoredLevel9Progress,
} from './utils/astronautRescueData';
import { SpacecraftHandbookModal } from './components/SpacecraftHandbookModal';

interface InteractableZone {
  x: number;
  z: number;
  r: number;
  text: () => string | null;
  act: () => void;
}

const TUT_TASK_META: Record<number, { instr: string; hint: string }> = {
  1: {
    instr: 'TASK 1: Click the Facility Radar map in the top-right corner (or press M).',
    hint: 'Expands the GALAXY-X complex blueprint and sector fast-travel directory.',
  },
  2: {
    instr: 'TASK 2: Travel to Ground Station and inspect the Parabolic Antenna.',
    hint: 'Open Map (M) → Ground Station → click the dish or walk close and press E.',
  },
  3: {
    instr: 'TASK 3: Visit Spacecraft Assembly Hangar and inspect the Showcase Satellite.',
    hint: 'Click the detailed satellite on the pedestal or press E next to it.',
  },
  4: {
    instr: 'TASK 4: Visit Scientific Research Lab and click any Instrument Pedestal.',
    hint: 'Inspect Thermometer, Barometer, or Camera in the SRL cleanroom.',
  },
  5: {
    instr: 'TASK 5: Visit Mission Control Center and inspect the Telemetry Wall.',
    hint: 'Click the central live telemetry screen or press E at the console.',
  },
  6: {
    instr: 'TASK 6: Click the Grant Credits (₡) & Star Credits (★) readout in the top bar.',
    hint: 'Review operational funding and payload mass vs. propulsion trade-offs.',
  },
  7: {
    instr: 'TASK 7: Open 📖 Handbook and complete the Handbook Navigation Examination.',
    hint: 'Practice opening Contents, switching chapters (1–8), turning pages, and understanding how to jump directly to any level.',
  },
  8: {
    instr: 'TASK 8: Open 🚀 Missions in the top bar to pick and go to any Level.',
    hint: 'Explore the 8-level Space Mission Roadmap and launch or travel to any mission.',
  },
};

function crateDisplayName(k: string): string {
  const found = CRATES.find((c) => c.k === k);
  return found ? found.n : k;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Authenticated Firebase User & Cloud Profile State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [enteredFacility, setEnteredFacility] = useState(false);
  const [authViewMode, setAuthViewMode] = useState<AuthViewMode>('login');
  const activeUidRef = useRef<string | null>(null);
  const registeringUidRef = useRef<string | null>(null);
  const cloudSaveTimerRef = useRef<number | null>(null);

  // Persistent Player State (always bound strictly to logged-in UID)
  const [playerState, setPlayerState] = useState<PlayerState>(() => createFreshPlayerState());
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;

  // Onboarding & Modals State
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(started);
  startedRef.current = started;

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTrainingIntro, setShowTrainingIntro] = useState(false);
  const [showTrainingComplete, setShowTrainingComplete] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapExpandedRef = useRef(mapExpanded);
  mapExpandedRef.current = mapExpanded;

  const [completedTaskModal, setCompletedTaskModal] = useState<number | null>(null);
  const [showSubsystemExplorer, setShowSubsystemExplorer] = useState(false);
  const [briefingModalLevel, setBriefingModalLevel] = useState<CampaignLevel | null>(null);
  const briefingModalOpenRef = useRef(false);
  briefingModalOpenRef.current = briefingModalLevel !== null;
  const [satLabOpen, setSatLabOpen] = useState(false);
  const satLabOpenRef = useRef(satLabOpen);
  satLabOpenRef.current = satLabOpen;
  const [rocketLabOpen, setRocketLabOpen] = useState(false);
  const rocketLabOpenRef = useRef(rocketLabOpen);
  rocketLabOpenRef.current = rocketLabOpen;
  const [orbitLabOpen, setOrbitLabOpen] = useState(false);
  const orbitLabOpenRef = useRef(orbitLabOpen);
  orbitLabOpenRef.current = orbitLabOpen;
  const [shakeFreezeLabOpen, setShakeFreezeLabOpen] = useState(false);
  const shakeFreezeLabOpenRef = useRef(shakeFreezeLabOpen);
  shakeFreezeLabOpenRef.current = shakeFreezeLabOpen;
  const [lunarFlybyLabOpen, setLunarFlybyLabOpen] = useState(false);
  const lunarFlybyLabOpenRef = useRef(lunarFlybyLabOpen);
  lunarFlybyLabOpenRef.current = lunarFlybyLabOpen;
  const [europaLabOpen, setEuropaLabOpen] = useState(false);
  const europaLabOpenRef = useRef(europaLabOpen);
  europaLabOpenRef.current = europaLabOpen;
  const [lunarWaterLabOpen, setLunarWaterLabOpen] = useState(false);
  const lunarWaterLabOpenRef = useRef(lunarWaterLabOpen);
  lunarWaterLabOpenRef.current = lunarWaterLabOpen;
  const [astronautRescueLabOpen, setAstronautRescueLabOpen] = useState(false);
  const astronautRescueLabOpenRef = useRef(astronautRescueLabOpen);
  astronautRescueLabOpenRef.current = astronautRescueLabOpen;
  const [handbookOpen, setHandbookOpen] = useState(false);
  const handbookOpenRef = useRef(handbookOpen);
  handbookOpenRef.current = handbookOpen;
  const [handbookPlayingLevel, setHandbookPlayingLevel] = useState<number | null>(null);
  const [handbookInitialLevel, setHandbookInitialLevel] = useState<number | null>(null);
  const openHandbookFromHub = useCallback(() => {
    setHandbookPlayingLevel(null);
    setHandbookInitialLevel(null);
    setHandbookOpen(true);
  }, []);
  const openHandbookForLevel = useCallback((lvlNum: number) => {
    setHandbookPlayingLevel(lvlNum);
    setHandbookInitialLevel(lvlNum);
    setHandbookOpen(true);
  }, []);
  const [pnlTransitionActive, setPnlTransitionActive] = useState(false);
  const pnlTransitionRef = useRef<{
    startTime: number;
    durationMs: number;
    startPos: THREE.Vector3;
    startYaw: number;
    startPitch: number;
  } | null>(null);
  const [legacyKarmanMode, setLegacyKarmanMode] = useState(false);
  const legacyKarmanRef = useRef(false);
  legacyKarmanRef.current = legacyKarmanMode;
  const [storeOpen, setStoreOpen] = useState(false);
  const storeOpenRef = useRef(storeOpen);
  storeOpenRef.current = storeOpen;
  const [storeInitialTab, setStoreInitialTab] = useState<'all' | 'level_7'>('level_7');
  const [storeReturnContext, setStoreReturnContext] = useState<{
    levelNum: number;
    levelTitle: string;
    requiredItemId?: string;
  } | null>(null);

  const modalOverlayOpenRef = useRef(false);
  modalOverlayOpenRef.current =
    !authUser ||
    !enteredFacility ||
    showWelcome ||
    showBadgeModal ||
    showTrainingIntro ||
    showTrainingComplete ||
    showCampaignModal ||
    showProfileModal ||
    mapExpanded ||
    completedTaskModal !== null ||
    showSubsystemExplorer ||
    briefingModalLevel !== null ||
    satLabOpen ||
    rocketLabOpen ||
    orbitLabOpen ||
    shakeFreezeLabOpen ||
    lunarFlybyLabOpen ||
    europaLabOpen ||
    lunarWaterLabOpen ||
    astronautRescueLabOpen ||
    handbookOpen ||
    pnlTransitionActive ||
    storeOpen;

  // Tutorial & Campaign Gameplay React State (for clean HUD re-renders)
  const [tutStep, setTutStep] = useState<number>(0);
  const tutStepRef = useRef(tutStep);
  tutStepRef.current = tutStep;

  const [activeLevelIdx, setActiveLevelIdx] = useState<number>(0);

  const [missionPhase, setMissionPhase] = useState<number>(0); // 0: briefing, 1: assembly, 2: on pad, 3: debrief

  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set());
  const [selectedMotor, setSelectedMotor] = useState<string | null>(null);
  const [flightScore, setFlightScore] = useState<number>(0);
  const [isFlying, setIsFlying] = useState<boolean>(false);

  const [currentLoc, setCurrentLoc] = useState<FacilityLocation>(() => getCurrentLocation(-21, 10));
  const currentLocRef = useRef<FacilityLocation>(currentLoc);
  currentLocRef.current = currentLoc;
  const [promptText, setPromptText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<{ text: string; until: number }>({ text: '', until: 0 });
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());

  // Animated HUD Currency Deduction & Store Unlock Feedback
  const [displayGrant, setDisplayGrant] = useState<number>(playerState.grantCredits);
  const [displayStar, setDisplayStar] = useState<number>(playerState.starCredits);
  const displayGrantRef = useRef<number>(playerState.grantCredits);
  const displayStarRef = useRef<number>(playerState.starCredits);
  const prevGrantRef = useRef<number>(playerState.grantCredits);
  const prevStarRef = useRef<number>(playerState.starCredits);
  const prevUnlockedCountRef = useRef<number>((playerState.unlockedStoreItems ?? []).length);
  const [hudBursts, setHudBursts] = useState<
    Array<{ id: number; text: string; tone: 'grant' | 'star' }>
  >([]);
  const [hudFlash, setHudFlash] = useState<'idle' | 'grant' | 'star'>('idle');
  const [storeBadgePulse, setStoreBadgePulse] = useState<boolean>(false);

  useEffect(() => {
    const prev = prevGrantRef.current;
    const next = playerState.grantCredits;
    prevGrantRef.current = next;
    const from = displayGrantRef.current;

    if (next < prev) {
      const spent = prev - next;
      const id = Date.now() + Math.random();
      setHudBursts((b) => [...b, { id, text: `-₡ ${spent.toLocaleString()}`, tone: 'grant' }]);
      setHudFlash('grant');
      const flashTimer = window.setTimeout(() => setHudFlash('idle'), 700);
      const burstTimer = window.setTimeout(() => {
        setHudBursts((b) => b.filter((item) => item.id !== id));
      }, 1400);

      const start = performance.now();
      const duration = 560;
      let raf = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(from + (next - from) * eased);
        displayGrantRef.current = val;
        setDisplayGrant(val);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          displayGrantRef.current = next;
          setDisplayGrant(next);
        }
      };
      raf = requestAnimationFrame(step);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(flashTimer);
        clearTimeout(burstTimer);
      };
    }

    displayGrantRef.current = next;
    setDisplayGrant(next);
  }, [playerState.grantCredits]);

  useEffect(() => {
    const prev = prevStarRef.current;
    const next = playerState.starCredits;
    prevStarRef.current = next;
    const from = displayStarRef.current;

    if (next < prev) {
      const spent = prev - next;
      const id = Date.now() + Math.random();
      setHudBursts((b) => [...b, { id, text: `-★ ${spent.toLocaleString()} SC`, tone: 'star' }]);
      setHudFlash('star');
      const flashTimer = window.setTimeout(() => setHudFlash('idle'), 750);
      const burstTimer = window.setTimeout(() => {
        setHudBursts((b) => b.filter((item) => item.id !== id));
      }, 1450);

      const start = performance.now();
      const duration = 620;
      let raf = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(from + (next - from) * eased);
        displayStarRef.current = val;
        setDisplayStar(val);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          displayStarRef.current = next;
          setDisplayStar(next);
        }
      };
      raf = requestAnimationFrame(step);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(flashTimer);
        clearTimeout(burstTimer);
      };
    }

    displayStarRef.current = next;
    setDisplayStar(next);
  }, [playerState.starCredits]);

  useEffect(() => {
    const count = (playerState.unlockedStoreItems ?? []).length;
    if (count > prevUnlockedCountRef.current) {
      setStoreBadgePulse(true);
      const t = window.setTimeout(() => setStoreBadgePulse(false), 950);
      prevUnlockedCountRef.current = count;
      return () => clearTimeout(t);
    }
    prevUnlockedCountRef.current = count;
  }, [playerState.unlockedStoreItems]);

  const UPPER_VIEW_HEIGHT = 3.6;
  const camYRef = useRef<number>(UPPER_VIEW_HEIGHT);

  // Mutable Simulation Refs (always start in Mission Planning Room facing the Earth hologram globe)
  const playerPosRef = useRef<{ x: number; z: number }>({ x: -21, z: 10 });
  const lookRef = useRef<{ yaw: number; pitch: number }>({ yaw: Math.PI / 2, pitch: -0.11 });

  const resetPlayerToMprGlobe = useCallback(() => {
    playerPosRef.current = { x: -21, z: 10 };
    lookRef.current = { yaw: Math.PI / 2, pitch: -0.11 };
    camYRef.current = UPPER_VIEW_HEIGHT;
    if (cameraRef.current) {
      cameraRef.current.position.set(-21, UPPER_VIEW_HEIGHT, 10);
      cameraRef.current.rotation.order = 'YXZ';
      cameraRef.current.rotation.set(-0.11, Math.PI / 2, 0);
    }
    setCurrentLoc(getCurrentLocation(-21, 10));
  }, []);
  const missionTargetRef = useRef<MapMissionTarget | null>(null);
  const simRef = useRef<{
    n: number;
    phase: number;
    items: Set<string>;
    mot: string | null;
    flying: boolean;
    score: number;
    t0: number;
    altTarget: number;
    flightAlt: number;
    flightMass: number;
    flightCost: number;
    extraCount: number;
  }>({
    n: activeLevelIdx,
    phase: 0,
    items: new Set(),
    mot: null,
    flying: false,
    score: 0,
    t0: 0,
    altTarget: 70,
    flightAlt: 0,
    flightMass: 20,
    flightCost: 0,
    extraCount: 0,
  });

  // Three.js Object Refs accessed by callbacks
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const crateHandlesRef = useRef<CrateVisualHandle[]>([]);
  const rocketHandleRef = useRef<RocketVisualHandle | null>(null);
  const targetRingRef = useRef<THREE.Mesh | null>(null);
  const tutBeaconRef = useRef<THREE.Group | null>(null);
  const currentInteractRef = useRef<InteractableZone | null>(null);
  const joyDotRef = useRef<HTMLDivElement | null>(null);
  const joyWrapRef = useRef<HTMLDivElement | null>(null);

  const authFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication required');
    }
    const token = await currentUser.getIdToken();
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }, []);

  const persistStateToFirestore = useCallback(
    (stateToSave: PlayerState, options?: { immediate?: boolean; stageOverride?: number }) => {
      const uid = activeUidRef.current;
      if (!uid || (stateToSave.uid && stateToSave.uid !== uid)) return;

      const runSave = async () => {
        try {
          const savedIso = await savePlayerProfileToFirestore(
            uid,
            stateToSave,
            options?.stageOverride
          );
          setPlayerState((prev) =>
            prev.uid === uid ? { ...prev, lastSavedAt: savedIso } : prev
          );
        } catch {
          // Firestore error reporter handles diagnostics
        }
      };

      if (options?.immediate) {
        if (cloudSaveTimerRef.current !== null) {
          window.clearTimeout(cloudSaveTimerRef.current);
          cloudSaveTimerRef.current = null;
        }
        void runSave();
        return;
      }

      if (cloudSaveTimerRef.current !== null) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }
      cloudSaveTimerRef.current = window.setTimeout(() => {
        cloudSaveTimerRef.current = null;
        void runSave();
      }, 550);
    },
    []
  );

  const enrichDerivedPlayerState = useCallback((candidate: PlayerState): PlayerState => {
    const derived = computeDerivedProgress(candidate);
    const parsedLevelStars: Record<number, number> = {};
    for (const [k, v] of Object.entries(derived.levelStars)) {
      parsedLevelStars[Number(k)] = v;
    }
    return {
      ...candidate,
      unlockedLevels: derived.unlockedLevels,
      levelStars: parsedLevelStars,
      totalStars: derived.totalStars,
      rewardsCollected: derived.rewardsCollected,
      currentMissionStage: derived.currentMissionStage,
    };
  }, []);

  const updatePlayer = useCallback(
    (
      updater: (prev: PlayerState) => PlayerState,
      persistMode: 'debounced' | 'immediate' | 'none' = 'debounced'
    ) => {
      setPlayerState((prev) => {
        const next = enrichDerivedPlayerState(updater(prev));
        playerStateRef.current = next;
        if (persistMode !== 'none') {
          persistStateToFirestore(next, { immediate: persistMode === 'immediate' });
        }
        return next;
      });
    },
    [enrichDerivedPlayerState, persistStateToFirestore]
  );

  const applyServerPlayer = useCallback(
    (serverPlayer: PlayerState, syncCloud = true) => {
      setPlayerState((prev) => {
        const uid = activeUidRef.current || prev.uid || serverPlayer.uid || serverPlayer.userId;
        const merged = enrichDerivedPlayerState({
          ...prev,
          ...serverPlayer,
          userId: uid,
          uid,
          username: prev.username || serverPlayer.username || serverPlayer.callsign,
          email: prev.email || serverPlayer.email || '',
        });
        playerStateRef.current = merged;
        if (syncCloud) {
          persistStateToFirestore(merged, { immediate: true });
        }
        return merged;
      });
    },
    [enrichDerivedPlayerState, persistStateToFirestore]
  );

  const applyRestoredProfileToSession = useCallback(
    (profile: PlayerState) => {
      const normalized = enrichDerivedPlayerState(profile);
      setPlayerState(normalized);
      playerStateRef.current = normalized;

      const lvlIdx = Math.max(
        0,
        Math.min(CAMPAIGN_LEVELS.length - 1, (normalized.currentCampaignLevel || 1) - 1)
      );
      setActiveLevelIdx(lvlIdx);
      simRef.current.n = lvlIdx;
      simRef.current.items.clear();
      simRef.current.mot = null;
      simRef.current.phase = 0;
      setSelectedItems(new Set());
      setSelectedMotor(null);
      setMissionPhase(0);
      setTutStep(0);
      resetPlayerToMprGlobe();
    },
    [enrichDerivedPlayerState, resetPlayerToMprGlobe]
  );

  const syncWithServer = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!auth.currentUser) return;
      try {
        const res = await authFetch('/api/player/sync', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) applyServerPlayer(data.player, true);
        }
      } catch {
        // Firestore auto-save retains cloud state
      }
    },
    [applyServerPlayer, authFetch]
  );

  // Firebase Auth Session Listener & Firestore Cloud Progress Loader
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (cloudSaveTimerRef.current !== null) {
          window.clearTimeout(cloudSaveTimerRef.current);
          cloudSaveTimerRef.current = null;
        }
        activeUidRef.current = null;
        setAuthUser(null);
        setAuthLoading(false);
        setProfileLoading(false);
        setEnteredFacility(false);
        setStarted(false);
        setShowWelcome(false);
        setShowProfileModal(false);
        setShowCampaignModal(false);
        setShowBadgeModal(false);
        setShowTrainingIntro(false);
        setShowTrainingComplete(false);
        setCompletedTaskModal(null);
        setShowSubsystemExplorer(false);
        setBriefingModalLevel(null);
        setSatLabOpen(false);
        setRocketLabOpen(false);
        setOrbitLabOpen(false);
        setShakeFreezeLabOpen(false);
        setLunarFlybyLabOpen(false);
        setEuropaLabOpen(false);
        setLunarWaterLabOpen(false);
        setAstronautRescueLabOpen(false);
        setStoreOpen(false);
        setHandbookOpen(false);
        clearAllLocalPlayerCaches();
        resetPlayerToMprGlobe();
        const fresh = createFreshPlayerState();
        setPlayerState(fresh);
        playerStateRef.current = fresh;
        return;
      }

      setAuthUser(user);
      setAuthLoading(false);
      activeUidRef.current = user.uid;

      // If AuthGateModal is mid-registration (pending or active UID), let onRegistrationComplete finish
      if (
        registeringUidRef.current === '__pending__' ||
        registeringUidRef.current === user.uid
      ) {
        return;
      }

      setProfileLoading(true);
      try {
        clearAllLocalPlayerCaches();
        let profile = await loadPlayerProfileFromFirestore(user.uid);
        if (!profile) {
          await new Promise((r) => setTimeout(r, 450));
          profile = await loadPlayerProfileFromFirestore(user.uid);
        }
        if (!profile) {
          const rawCandidate =
            (user.displayName && user.displayName.trim()) ||
            (user.email ? user.email.split('@')[0] : '') ||
            `Explorer_${user.uid.slice(0, 6)}`;
          let sanitized = rawCandidate.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
          if (sanitized.length < 3) {
            sanitized = `Explorer_${user.uid.slice(0, 6)}`;
          }
          try {
            profile = await createPlayerProfileInFirestore(
              user.uid,
              sanitized,
              user.email || ''
            );
          } catch {
            const uniqueFallback = `${sanitized.slice(0, 17)}_${user.uid.slice(0, 5)}`;
            profile = await createPlayerProfileInFirestore(
              user.uid,
              uniqueFallback,
              user.email || ''
            );
          }
        }

        if (activeUidRef.current !== user.uid) return;
        applyRestoredProfileToSession(profile);
        if (!profile.joined) {
          setShowWelcome(true);
        }

        // Keep Express server registry & database synchronized with Firestore profile
        const token = await user.getIdToken();
        if (profile.username && (profile.email || user.email)) {
          await fetch('/api/auth/sync-username', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              username: profile.username,
              email: profile.email || user.email || '',
            }),
          }).catch(() => {});
        }
        await fetch('/api/player/hydrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }).catch(() => {});
      } catch {
        // Error diagnostics handled by handleFirestoreError
      } finally {
        setProfileLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (cloudSaveTimerRef.current !== null) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, [applyRestoredProfileToSession, resetPlayerToMprGlobe]);

  const say = useCallback((text: string, ms = 3600) => {
    setToastMsg({ text, until: performance.now() + ms });
  }, []);

  useEffect(() => {
    if (!toastMsg.text) return;
    const remaining = Math.max(0, toastMsg.until - performance.now());
    const id = window.setTimeout(() => {
      setToastMsg((prev) => (performance.now() >= prev.until ? { text: '', until: 0 } : prev));
    }, remaining + 20);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const syncCrateColors = useCallback(() => {
    const { items, mot } = simRef.current;
    crateHandlesRef.current.forEach((h) => {
      const active = h.crate.mot ? mot === h.crate.k : items.has(h.crate.k);
      h.setSelected(active);
    });
    rocketHandleRef.current?.updateConfiguration(items, mot);
  }, []);

  const calcVehicle = useCallback(() => {
    const items = [...simRef.current.items].map((k) => CRATES.find((c) => c.k === k)).filter(Boolean) as SupplyCrate[];
    const motor = CRATES.find((c) => c.k === simRef.current.mot) ?? null;
    const mass = 20 + items.reduce((acc, x) => acc + (x.m || 0), 0);
    const cost = items.reduce((acc, x) => acc + x.c, 0) + (motor ? motor.c : 0);
    const baseAlt = motor && motor.imp ? (1.5 * motor.imp) / mass : 0;
    const curLvl = CAMPAIGN_LEVELS[simRef.current.n]?.lvl ?? 1;
    const stageMult = legacyKarmanRef.current
      ? 1
      : curLvl === 6
      ? 1.25
      : curLvl >= 7
      ? 2.1
      : 1;
    const alt = baseAlt * stageMult;
    return { p: items, m: motor, mass, cost, alt, stageMult };
  }, []);

  // ========================================================
  // CADET TRAINING STATE MACHINE
  // ========================================================
  const updateBeaconForStep = useCallback((step: number, completed: boolean) => {
    const beacon = tutBeaconRef.current;
    if (!beacon) return;
    if (completed || step <= 0) {
      beacon.visible = false;
      return;
    }
    if (step === 2) {
      beacon.position.set(-40, 6.4, 10);
      beacon.userData.baseY = 6.4;
      beacon.visible = true;
    } else if (step === 3) {
      beacon.position.set(22, 5.2, -6);
      beacon.userData.baseY = 5.2;
      beacon.visible = true;
    } else if (step === 4) {
      beacon.position.set(-9, 4.4, -25);
      beacon.userData.baseY = 4.4;
      beacon.visible = true;
    } else if (step === 5) {
      beacon.position.set(-34, 6.0, -24);
      beacon.userData.baseY = 6.0;
      beacon.visible = true;
    } else {
      beacon.visible = false;
    }
  }, []);

  const startCadetTraining = useCallback(() => {
    updatePlayer((p) => ({ ...p, trainingCompleted: false }));
    setTutStep(1);
    updateBeaconForStep(1, false);
    say('Cadet Orientation Started: Follow the highlighted Academy objective!', 4000);
  }, [say, updateBeaconForStep, updatePlayer]);

  const completeTutTask = useCallback(
    (taskNum: number) => {
      if (tutStepRef.current !== taskNum) return;
      if (tutBeaconRef.current) tutBeaconRef.current.visible = false;
      setTimeout(() => SFX.taskComplete(), 80);
      if (taskNum === 3) {
        setShowSubsystemExplorer(true);
      } else {
        setCompletedTaskModal(taskNum);
      }
    },
    []
  );

  const finishAllTraining = useCallback(() => {
    setTutStep(0);
    updateBeaconForStep(0, true);
    updatePlayer((p) => ({ ...p, trainingCompleted: true }), 'immediate');
    authFetch('/api/player/training', {
      method: 'POST',
      body: JSON.stringify({ trainingCompleted: true }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.player) applyServerPlayer(data.player, true);
      })
      .catch(() => {});
    SFX.badgeUnlock();
    setShowTrainingComplete(true);
  }, [applyServerPlayer, authFetch, updateBeaconForStep, updatePlayer]);

  const skipTutorial = useCallback(() => {
    setShowTrainingIntro(false);
    setCompletedTaskModal(null);
    setShowSubsystemExplorer(false);
    setTutStep(0);
    updateBeaconForStep(0, true);
    updatePlayer((p) => ({ ...p, trainingCompleted: true }), 'immediate');
    authFetch('/api/player/training', {
      method: 'POST',
      body: JSON.stringify({ trainingCompleted: true }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.player) applyServerPlayer(data.player, true);
      })
      .catch(() => {});
    say('Orientation skipped. Mission Campaign Directory unlocked!', 4000);
    setShowCampaignModal(true);
  }, [applyServerPlayer, authFetch, say, updateBeaconForStep, updatePlayer]);

  // ========================================================
  // MAP & NAVIGATION
  // ========================================================
  const closeMap = useCallback(() => {
    setMapExpanded(false);
  }, []);

  const openMap = useCallback(() => {
    setMapExpanded(true);
    if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 1) {
      completeTutTask(1);
    }
  }, [completeTutTask]);

  const navigateToLocation = useCallback(
    (locId: string) => {
      const loc = LOCATIONS.find((l) => l.id === locId);
      if (!loc) return;
      SFX.navigate();
      playerPosRef.current = { x: loc.target.x, z: loc.target.z };
      const defaultPitch = -0.11;
      lookRef.current = { yaw: loc.yaw, pitch: defaultPitch };
      if (cameraRef.current) {
        cameraRef.current.position.set(loc.target.x, camYRef.current, loc.target.z);
      }
      setCurrentLoc(loc);
      setMapExpanded(false);
      say(`Navigated to ${loc.name}`);
      if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 2 && locId === 'gsc') {
        say('Ground Station reached! Click the high-gain dish or press E near it.', 4200);
      }
    },
    [say]
  );

  const teleportPoint = useCallback(
    (wx: number, wz: number) => {
      SFX.navigate();
      playerPosRef.current = { x: wx, z: wz };
      if (cameraRef.current) {
        cameraRef.current.position.set(wx, camYRef.current, wz);
      }
      const loc = getCurrentLocation(wx, wz);
      setCurrentLoc(loc);
      setMapExpanded(false);
      say(`Navigated to ${loc.name}`);
    },
    [say]
  );

  // ========================================================
  // GAMEPLAY ACTIONS (CRATES, PAD LOAD, LAUNCH, MCC)
  // ========================================================
  const takeCrate = useCallback(
    (crate: SupplyCrate) => {
      if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 4) {
        completeTutTask(4);
      }
      const s = simRef.current;
      const isTaking = crate.mot ? s.mot !== crate.k : !s.items.has(crate.k);

      let nextGrantCredits = playerStateRef.current.grantCredits;
      if (isTaking) {
        if (playerStateRef.current.grantCredits < crate.cred) {
          say(
            `Insufficient Grant Credits! Need ₡${crate.cred.toLocaleString()} (Available: ₡${playerStateRef.current.grantCredits.toLocaleString()})`,
            4000
          );
          SFX.snapWrong();
          return;
        }
        nextGrantCredits -= crate.cred;
        updatePlayer((p) => ({ ...p, grantCredits: Math.max(0, p.grantCredits - crate.cred) }));
      } else {
        nextGrantCredits += crate.cred;
        updatePlayer((p) => ({ ...p, grantCredits: p.grantCredits + crate.cred }));
      }
      void syncWithServer({ grantCredits: Math.max(0, nextGrantCredits) });

      if (crate.mot) {
        s.mot = s.mot === crate.k ? null : crate.k;
        setSelectedMotor(s.mot);
      } else {
        if (s.items.has(crate.k)) s.items.delete(crate.k);
        else s.items.add(crate.k);
        setSelectedItems(new Set(s.items));
      }

      SFX.select();
      syncCrateColors();
      const nowSelected = crate.mot ? s.mot === crate.k : s.items.has(crate.k);
      say(
        nowSelected
          ? `${crate.n} acquired (-₡${crate.cred.toLocaleString()})`
          : `${crate.n} returned (+₡${crate.cred.toLocaleString()})`
      );
    },
    [completeTutTask, say, syncCrateColors, syncWithServer, updatePlayer]
  );

  const loadRocketOnPad = useCallback(() => {
    const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
    if (M.isLab && !legacyKarmanRef.current) {
      if (M.labMode === 'rocket') setRocketLabOpen(true);
      else if (M.labMode === 'orbit') setOrbitLabOpen(true);
      else if (M.labMode === 'shake_freeze') setShakeFreezeLabOpen(true);
      else if (M.labMode === 'lunar_flyby') setLunarFlybyLabOpen(true);
      else if (M.labMode === 'europa_probe') setEuropaLabOpen(true);
      else if (M.labMode === 'lunar_water') setLunarWaterLabOpen(true);
      else if (M.labMode === 'astronaut_rescue') setAstronautRescueLabOpen(true);
      else setSatLabOpen(true);
      return;
    }
    const r = calcVehicle();
    const missing = M.req.filter((k) => !simRef.current.items.has(k));
    if (missing.length > 0) {
      SFX.snapWrong();
      say(`Missing required payload: ${missing.map(crateDisplayName).join(', ')}`, 4000);
      return;
    }
    if (!simRef.current.mot) {
      SFX.snapWrong();
      say('Select a rocket propulsion motor in the Assembly Hangar first.', 3800);
      return;
    }
    if (r.cost > M.b) {
      SFX.snapWrong();
      say(`Over mission budget by ${r.cost - M.b}M! Return a component.`, 4200);
      return;
    }

    simRef.current.phase = 2;
    setMissionPhase(2);
    if (rocketHandleRef.current) {
      rocketHandleRef.current.group.visible = true;
      rocketHandleRef.current.updateConfiguration(simRef.current.items, simRef.current.mot);
    }
    SFX.snapCorrect();
    say('Rocket staged on Launch Pad! Proceed to Launch Control Complex (LCC) console.', 4500);
  }, [calcVehicle, say]);

  const initiateLaunch = useCallback(() => {
    const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
    const r = calcVehicle();
    simRef.current.flying = true;
    simRef.current.t0 = performance.now();
    simRef.current.flightAlt = r.alt;
    simRef.current.flightMass = r.mass;
    simRef.current.flightCost = r.cost;
    simRef.current.altTarget = typeof M.t === 'number' ? M.t : 70;
    simRef.current.extraCount = r.p.filter((x) => !M.req.includes(x.k)).length;
    setIsFlying(true);
    SFX.navigate();
  }, [calcVehicle]);

  const enterPropulsionLab = useCallback(() => {
    if (lunarFlybyLabOpenRef.current || pnlTransitionRef.current) return;
    SFX.navigate();
    const cam = cameraRef.current;
    pnlTransitionRef.current = {
      startTime: performance.now(),
      durationMs: 650,
      startPos: cam
        ? cam.position.clone()
        : new THREE.Vector3(playerPosRef.current.x, camYRef.current, playerPosRef.current.z),
      startYaw: lookRef.current.yaw,
      startPitch: lookRef.current.pitch,
    };
    setPnlTransitionActive(true);
  }, []);

  const routeToFacilityLevel = useCallback(
    (idx: number, customBanner?: string) => {
      const lvl = CAMPAIGN_LEVELS[idx];
      if (!lvl) return;
      setSatLabOpen(false);
      setRocketLabOpen(false);
      setOrbitLabOpen(false);
      setShakeFreezeLabOpen(false);
      setLunarFlybyLabOpen(false);
      setEuropaLabOpen(false);
      setLunarWaterLabOpen(false);
      setAstronautRescueLabOpen(false);
      legacyKarmanRef.current = false;
      setLegacyKarmanMode(false);
      simRef.current.n = idx;
      simRef.current.items.clear();
      simRef.current.mot = null;
      simRef.current.phase = 0;
      setActiveLevelIdx(idx);
      setSelectedItems(new Set());
      setSelectedMotor(null);
      setMissionPhase(0);
      setBriefingModalLevel(null);
      if (rocketHandleRef.current) rocketHandleRef.current.group.visible = false;
      syncCrateColors();
      updatePlayer((p) => ({ ...p, currentCampaignLevel: lvl.lvl }));
      void syncWithServer({ currentCampaignLevel: lvl.lvl });
      setShowCampaignModal(false);
      say(
        customBanner ||
          `Level 0${lvl.lvl} active — go to ${lvl.briefingStationName} and press E!`,
        5200
      );
    },
    [say, syncCrateColors, syncWithServer, updatePlayer]
  );

  const handleSelectCampaignLevel = useCallback(
    (idx: number) => {
      const lvl = CAMPAIGN_LEVELS[idx];
      if (!lvl) return;
      legacyKarmanRef.current = false;
      setLegacyKarmanMode(false);
      simRef.current.n = idx;
      simRef.current.items.clear();
      simRef.current.mot = null;
      simRef.current.phase = 0;
      setActiveLevelIdx(idx);
      setSelectedItems(new Set());
      setSelectedMotor(null);
      setMissionPhase(0);
      setBriefingModalLevel(null);
      if (rocketHandleRef.current) rocketHandleRef.current.group.visible = false;
      syncCrateColors();
      if (!playerStateRef.current.trainingCompleted || tutStepRef.current > 0) {
        setTutStep(0);
        updateBeaconForStep(0, true);
        setShowTrainingIntro(false);
        setCompletedTaskModal(null);
        setShowSubsystemExplorer(false);
        updatePlayer(
          (p) => ({
            ...p,
            trainingCompleted: true,
            currentCampaignLevel: lvl.lvl,
          }),
          'immediate'
        );
        authFetch('/api/player/training', {
          method: 'POST',
          body: JSON.stringify({ trainingCompleted: true }),
        }).catch(() => {});
      } else {
        updatePlayer((p) => ({ ...p, currentCampaignLevel: lvl.lvl }));
      }
      void syncWithServer({ currentCampaignLevel: lvl.lvl });
      setShowCampaignModal(false);
      setSatLabOpen(false);
      setRocketLabOpen(false);
      setOrbitLabOpen(false);
      setShakeFreezeLabOpen(false);
      setLunarFlybyLabOpen(false);
      setEuropaLabOpen(false);
      setLunarWaterLabOpen(false);
      setAstronautRescueLabOpen(false);
      say(
        `Level 0${lvl.lvl} selected! Walk or use Map [M] to go to ${lvl.briefingStationName}, then press E for briefing.`,
        5600
      );
    },
    [authFetch, say, syncCrateColors, syncWithServer, updateBeaconForStep, updatePlayer]
  );

  const handlePlayLegacyKarman = useCallback(() => {
    const idx = 4;
    legacyKarmanRef.current = true;
    setLegacyKarmanMode(true);
    simRef.current.n = idx;
    simRef.current.items.clear();
    simRef.current.mot = null;
    simRef.current.phase = 1;
    setActiveLevelIdx(idx);
    setSelectedItems(new Set());
    setSelectedMotor(null);
    setMissionPhase(1);
    setBriefingModalLevel(null);
    if (rocketHandleRef.current) rocketHandleRef.current.group.visible = false;
    syncCrateColors();
    if (!playerStateRef.current.trainingCompleted || tutStepRef.current > 0) {
      setTutStep(0);
      updateBeaconForStep(0, true);
      setShowTrainingIntro(false);
      setCompletedTaskModal(null);
      setShowSubsystemExplorer(false);
      updatePlayer((p) => ({ ...p, trainingCompleted: true }), 'immediate');
      authFetch('/api/player/training', {
        method: 'POST',
        body: JSON.stringify({ trainingCompleted: true }),
      }).catch(() => {});
    }
    setShowCampaignModal(false);
    setSatLabOpen(false);
    setRocketLabOpen(false);
    setOrbitLabOpen(false);
    setShakeFreezeLabOpen(false);
    setLunarFlybyLabOpen(false);
    setEuropaLabOpen(false);
    setLunarWaterLabOpen(false);
    setAstronautRescueLabOpen(false);
    say(
      'Legacy Kármán Line Flight (125 km) active! Collect Barometer + Camera in SRL, select Motor in SAH, then stage on Launch Pad.',
      5800
    );
  }, [authFetch, say, syncCrateColors, updateBeaconForStep, updatePlayer]);

  const handleSaveLevel1Progress = useCallback(
    (progress: Level1Progress) => {
      updatePlayer((p) => ({
        ...p,
        currentCampaignLevel: Math.max(p.currentCampaignLevel, 1),
        currentMissionStage: progress.stage ?? p.currentMissionStage,
        level1Progress: progress,
      }));
      authFetch('/api/levels/1/progress', {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }).catch(() => {});
    },
    [authFetch, updatePlayer]
  );

  const handleReplayResetLevel1 = useCallback(() => {
    const fresh: Level1Progress = { ...DEFAULT_LEVEL1_PROGRESS };
    updatePlayer(
      (p) => ({
        ...p,
        level1Progress: fresh,
      }),
      'immediate'
    );
    authFetch('/api/levels/1/progress', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});
  }, [authFetch, updatePlayer]);

  const handleCompleteLevel1 = useCallback(
    async (payload: Level1CompletionPayload): Promise<Level1RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/1/complete', {
          method: 'POST',
          body: JSON.stringify({
            installedSatParts: payload.installedSatParts,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
            };
          }
        }
      } catch {
        // Fallback cleanly to Firestore sync if API unreachable
      }

      const firstTime = !current.completedLevels.includes(1);
      const rewardAwarded = firstTime ? 1000 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(1) ? p.completedLevels : [...p.completedLevels, 1];
          return {
            ...p,
            starCredits: p.completedLevels.includes(1) ? p.starCredits : p.starCredits + 1000,
            completedLevels: completed,
            levelScores: { ...p.levelScores, 1: 1000 },
            badges: p.badges.includes('SATELLITE_BUILDER')
              ? p.badges
              : [...p.badges, 'SATELLITE_BUILDER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 2),
            level1Progress: {
              ...DEFAULT_LEVEL1_PROGRESS,
              stage: 1,
              satParts: payload.installedSatParts,
              stage1Done: true,
            },
          };
        },
        'immediate'
      );

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        newStarBalance: nextStarBalance,
      };
    },
    [applyServerPlayer, authFetch, updatePlayer]
  );

  const handleSaveLevel2Progress = useCallback(
    (progress: Level2Progress) => {
      updatePlayer((p) => ({
        ...p,
        currentMissionStage: progress.stage ?? p.currentMissionStage,
        level2Progress: progress,
      }));
      authFetch('/api/levels/2/progress', {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }).catch(() => {});
    },
    [authFetch, updatePlayer]
  );

  const handleReplayResetLevel2 = useCallback(() => {
    const fresh: Level2Progress = { ...DEFAULT_LEVEL2_PROGRESS };
    updatePlayer(
      (p) => ({
        ...p,
        level2Progress: fresh,
      }),
      'immediate'
    );
    authFetch('/api/levels/2/progress', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});
  }, [authFetch, updatePlayer]);

  const handleCompleteLevel2 = useCallback(
    async (payload: Level2CompletionPayload): Promise<Level2RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/2/complete', {
          method: 'POST',
          body: JSON.stringify({
            installedRocketParts: payload.installedRocketParts,
            stage2LaunchpadDone: payload.stage2LaunchpadDone,
            stage3PayloadDone: payload.stage3PayloadDone,
            stage4LaunchDone: payload.stage4LaunchDone,
            launchStatus: payload.launchStatus,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
            };
          }
        }
      } catch {
        // Fallback if server offline
      }

      const firstTime = !current.completedLevels.includes(2);
      const rewardAwarded = firstTime ? 1000 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(2) ? p.completedLevels : [...p.completedLevels, 2];
          return {
            ...p,
            starCredits: p.completedLevels.includes(2) ? p.starCredits : p.starCredits + 1000,
            completedLevels: completed,
            levelScores: { ...p.levelScores, 2: 1000 },
            badges: p.badges.includes('ROCKET_COMMANDER')
              ? p.badges
              : [...p.badges, 'ROCKET_COMMANDER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 3),
            level2Progress: {
              stage: 4,
              rocketParts: payload.installedRocketParts,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: true,
              launchStatus: 'completed',
            },
          };
        },
        'immediate'
      );

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        newStarBalance: nextStarBalance,
      };
    },
    [applyServerPlayer, authFetch, updatePlayer]
  );

  const handleCompleteLevel3 = useCallback(
    async (payload: Level3CompletionPayload): Promise<Level3RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/3/complete', {
          method: 'POST',
          body: JSON.stringify({
            solarCapacityW: payload.solarCapacityW,
            batteryCapacityWh: payload.batteryCapacityWh,
            enteredShadow: payload.enteredShadow,
            exitedShadow: payload.exitedShadow,
            minBatteryWh: payload.minBatteryWh,
            finalBatteryWh: payload.finalBatteryWh,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
            };
          }
        }
      } catch {
        // Fallback if server offline
      }

      const firstTime = !current.completedLevels.includes(3);
      const rewardAwarded = firstTime ? 1000 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(3) ? p.completedLevels : [...p.completedLevels, 3];
          return {
            ...p,
            starCredits: p.completedLevels.includes(3) ? p.starCredits : p.starCredits + 1000,
            completedLevels: completed,
            levelScores: { ...p.levelScores, 3: 1000 },
            badges: p.badges.includes('ORBIT_POWER_ENGINEER')
              ? p.badges
              : [...p.badges, 'ORBIT_POWER_ENGINEER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 4),
          };
        },
        'immediate'
      );

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        newStarBalance: nextStarBalance,
      };
    },
    [applyServerPlayer, authFetch, updatePlayer]
  );

  const handleSaveLevel4Progress = useCallback(
    (progress: Level4Progress) => {
      updatePlayer((p) => ({
        ...p,
        currentMissionStage: progress.stage ?? p.currentMissionStage,
        level4Progress: progress,
      }));
      authFetch('/api/levels/4/progress', {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }).catch(() => {});
    },
    [authFetch, updatePlayer]
  );

  const handleReplayResetLevel4 = useCallback(() => {
    const fresh: Level4Progress = { ...DEFAULT_LEVEL4_PROGRESS };
    updatePlayer(
      (p) => ({
        ...p,
        level4Progress: fresh,
      }),
      'immediate'
    );
    authFetch('/api/levels/4/progress', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});
  }, [authFetch, updatePlayer]);

  const handleCompleteLevel4 = useCallback(
    async (payload: Level4CompletionPayload): Promise<Level4RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/4/complete', {
          method: 'POST',
          body: JSON.stringify({
            installedParts: payload.installedParts,
            shakerScore: payload.shakerScore,
            freezerMinTempC: payload.freezerMinTempC,
            freezerFinalTempC: payload.freezerFinalTempC,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              xpAwarded: Number(data.xpAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
              newXpBalance: Number(data.player.xp ?? 0),
            };
          }
        }
      } catch {
        // Fallback if server offline
      }

      const firstTime = !current.completedLevels.includes(4);
      const rewardAwarded = firstTime ? 750 : 0;
      const xpAwarded = firstTime ? 100 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;
      const nextXpBalance = (current.xp ?? 0) + xpAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(4) ? p.completedLevels : [...p.completedLevels, 4];
          return {
            ...p,
            starCredits: p.completedLevels.includes(4) ? p.starCredits : p.starCredits + 750,
            xp: p.completedLevels.includes(4) ? p.xp ?? 0 : (p.xp ?? 0) + 100,
            completedLevels: completed,
            levelScores: { ...p.levelScores, 4: 750 },
            badges: p.badges.includes('THERMAL_PROTECTION_ENGINEER')
              ? p.badges
              : [...p.badges, 'THERMAL_PROTECTION_ENGINEER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 5),
          };
        },
        'immediate'
      );

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        xpAwarded,
        newStarBalance: nextStarBalance,
        newXpBalance: nextXpBalance,
      };
    },
    [applyServerPlayer, authFetch, updatePlayer]
  );

  const handleCompleteLevel5 = useCallback(
    async (payload: Level5CompletionPayload): Promise<Level5RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/5/complete', {
          method: 'POST',
          body: JSON.stringify({
            fuelKg: payload.fuelKg,
            confirmedFuelConfig: payload.confirmedFuelConfig,
            flybySimulationCompleted: payload.flybySimulationCompleted,
            missionDurationSec: payload.missionDurationSec,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            if (!data.alreadyRewarded) {
              say(
                'PROPULSION UPGRADE UNLOCKED! +★ 1,000 Star Credits & Propulsion Engineer Badge!',
                5400
              );
            }
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
              propulsionUpgradeUnlocked: Boolean(data.player.propulsionUpgradeUnlocked),
            };
          }
        }
      } catch {
        // Fallback cleanly to cloud sync if API unreachable
      }

      const firstTime = !current.completedLevels.includes(5);
      const rewardAwarded = firstTime ? 1000 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(5)
            ? p.completedLevels
            : [...p.completedLevels, 5];
          return {
            ...p,
            starCredits: p.completedLevels.includes(5) ? p.starCredits : p.starCredits + 1000,
            completedLevels: completed,
            levelScores: { ...p.levelScores, 5: Math.max(p.levelScores[5] || 0, 1000) },
            badges: p.badges.includes('PROPULSION_ENGINEER')
              ? p.badges
              : [...p.badges, 'PROPULSION_ENGINEER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 6),
            propulsionUpgradeUnlocked: true,
            level5FlybyCompleted: true,
            level5BestFuelKg: payload.fuelKg,
          };
        },
        'immediate'
      );

      if (firstTime) {
        say(
          'PROPULSION UPGRADE UNLOCKED! +★ 1,000 Star Credits & Propulsion Engineer Badge!',
          5400
        );
      }

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        newStarBalance: nextStarBalance,
        propulsionUpgradeUnlocked: true,
      };
    },
    [applyServerPlayer, authFetch, say, updatePlayer]
  );

  const handleSaveLevel6Progress = useCallback(
    (progress: StoredLevel6Progress) => {
      updatePlayer((p) => ({
        ...p,
        currentMissionStage: progress.stage ?? p.currentMissionStage,
        level6Progress: progress,
      }));
      authFetch('/api/levels/6/progress', {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }).catch(() => {});
    },
    [authFetch, updatePlayer]
  );

  const handleReplayResetLevel6 = useCallback(() => {
    const fresh: StoredLevel6Progress = {
      ...DEFAULT_LEVEL6_PROGRESS,
      landingSolved: { speed: false, tilt: false, thermal: false },
    };
    updatePlayer(
      (p) => ({
        ...p,
        level6Progress: fresh,
      }),
      'immediate'
    );
    authFetch('/api/levels/6/progress', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});
  }, [authFetch, updatePlayer]);

  const handleCompleteLevel6 = useCallback(
    async (payload: Level6CompletionPayload): Promise<Level6RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/6/complete', {
          method: 'POST',
          body: JSON.stringify({ ...payload }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            if (!data.alreadyRewarded) {
              say(
                'THERMAL TELEMETRY SPECIALIST UNLOCKED! +★ 1,500 SC & +150 XP!',
                5400
              );
            }
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              xpAwarded: Number(data.xpAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
              newXpBalance: Number(data.player.xp ?? 0),
            };
          }
        }
      } catch {
        // Fallback if server offline
      }

      const firstTime = !current.completedLevels.includes(6);
      const rewardAwarded = firstTime ? 1500 : 0;
      const xpAwarded = firstTime ? 150 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;
      const nextXpBalance = (current.xp ?? 0) + xpAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(6)
            ? p.completedLevels
            : [...p.completedLevels, 6];
          return {
            ...p,
            starCredits: p.completedLevels.includes(6) ? p.starCredits : p.starCredits + 1500,
            xp: p.completedLevels.includes(6) ? p.xp ?? 0 : (p.xp ?? 0) + 150,
            completedLevels: completed,
            levelScores: { ...p.levelScores, 6: Math.max(p.levelScores[6] || 0, 1500) },
            badges: p.badges.includes('THERMAL_TELEMETRY_SPECIALIST')
              ? p.badges
              : [...p.badges, 'THERMAL_TELEMETRY_SPECIALIST'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 7),
          };
        },
        'immediate'
      );

      if (firstTime) {
        say('THERMAL TELEMETRY SPECIALIST UNLOCKED! +★ 1,500 SC & +150 XP!', 5400);
      }

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        xpAwarded,
        newStarBalance: nextStarBalance,
        newXpBalance: nextXpBalance,
      };
    },
    [applyServerPlayer, authFetch, say, updatePlayer]
  );

  // Level 7: Lunar Water Hunt handlers
  const handleSaveLevel7Progress = useCallback(
    (progress: StoredLevel8Progress) => {
      updatePlayer((p) => ({
        ...p,
        currentMissionStage: progress.stage ?? p.currentMissionStage,
        level7Progress: progress,
      }));
      authFetch('/api/levels/7/progress', {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }).catch(() => {});
    },
    [authFetch, updatePlayer]
  );

  const handleReplayResetLevel7 = useCallback(() => {
    const fresh: StoredLevel8Progress = {
      ...DEFAULT_LEVEL8_PROGRESS,
      build: { ...DEFAULT_LEVEL8_PROGRESS.build },
      rocketParts: [...DEFAULT_LEVEL8_PROGRESS.rocketParts],
      craterScans: [],
    };
    updatePlayer(
      (p) => ({
        ...p,
        level7Progress: fresh,
      }),
      'immediate'
    );
    authFetch('/api/levels/7/progress', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});
  }, [authFetch, updatePlayer]);

  const handleCompleteLevel7 = useCallback(
    async (payload: Level8CompletionPayload): Promise<Level8RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/7/complete', {
          method: 'POST',
          body: JSON.stringify({
            build: payload.build,
            fuelTestPassed: payload.fuelTestPassed,
            launchCompleted: payload.launchCompleted,
            navOrbitLocked: payload.navOrbitLocked,
            craterScans: payload.craterScans,
            evidenceMeterPct: payload.evidenceMeterPct,
            transmittedPct: payload.transmittedPct,
            timerExpired: payload.timerExpired,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            if (!data.alreadyRewarded) {
              say(
                'LUNAR WATER EXPLORER UNLOCKED! +★ 1,500 Star Credits & +200 XP!',
                5400
              );
            }
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              xpAwarded: Number(data.xpAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
              newXpBalance: Number(data.player.xp ?? 0),
            };
          }
        }
      } catch {
        // Fallback if server unreachable
      }

      const firstTime = !current.completedLevels.includes(7);
      const rewardAwarded = firstTime ? 1500 : 0;
      const xpAwarded = firstTime ? 200 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;
      const nextXpBalance = (current.xp ?? 0) + xpAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(7)
            ? p.completedLevels
            : [...p.completedLevels, 7];
          return {
            ...p,
            starCredits: p.completedLevels.includes(7) ? p.starCredits : p.starCredits + 1500,
            xp: p.completedLevels.includes(7) ? p.xp ?? 0 : (p.xp ?? 0) + 200,
            completedLevels: completed,
            levelScores: {
              ...p.levelScores,
              7: Math.max(p.levelScores[7] || 0, 1500),
            },
            badges: p.badges.includes('LUNAR_WATER_EXPLORER')
              ? p.badges
              : [...p.badges, 'LUNAR_WATER_EXPLORER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 8),
          };
        },
        'immediate'
      );

      if (firstTime) {
        say('LUNAR WATER EXPLORER UNLOCKED! +★ 1,500 Star Credits & +200 XP!', 5400);
      }

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        xpAwarded,
        newStarBalance: nextStarBalance,
        newXpBalance: nextXpBalance,
      };
    },
    [applyServerPlayer, authFetch, say, updatePlayer]
  );

  // Level 8: Rescue the Lost Astronaut handlers
  const handleSaveLevel8Progress = useCallback(
    (progress: StoredLevel9Progress) => {
      updatePlayer((p) => ({
        ...p,
        currentMissionStage: progress.stage ?? p.currentMissionStage,
        level8Progress: progress,
      }));
      authFetch('/api/levels/8/progress', {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }).catch(() => {});
    },
    [authFetch, updatePlayer]
  );

  const handleReplayResetLevel8 = useCallback(() => {
    const fresh: StoredLevel9Progress = { ...DEFAULT_LEVEL9_PROGRESS };
    updatePlayer(
      (p) => ({
        ...p,
        level8Progress: fresh,
      }),
      'immediate'
    );
    authFetch('/api/levels/8/progress', {
      method: 'POST',
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});
  }, [authFetch, updatePlayer]);

  const handleCompleteLevel8 = useCallback(
    async (payload: Level9CompletionPayload): Promise<Level9RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await authFetch('/api/levels/8/complete', {
          method: 'POST',
          body: JSON.stringify({
            astronautLocated: payload.astronautLocated,
            commsEstablished: payload.commsEstablished,
            debrisNavigated: payload.debrisNavigated,
            speedMatched: payload.speedMatched,
            armCaptured: payload.armCaptured,
            airlockSecured: payload.airlockSecured,
            oxygenRemainingPct: payload.oxygenRemainingPct,
            hullRemainingPct: payload.hullRemainingPct,
            secondsRemaining: payload.secondsRemaining,
            timerExpired: payload.timerExpired,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player, true);
            if (!data.alreadyRewarded) {
              say(
                'SPACE RESCUE HERO UNLOCKED! +★ 1,000 Science Credits!',
                5400
              );
            }
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
            };
          }
        }
      } catch {
        // Fallback if server unreachable
      }

      const firstTime = !current.completedLevels.includes(8);
      const rewardAwarded = firstTime ? LEVEL9_REWARD_SC : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;

      updatePlayer(
        (p) => {
          const completed = p.completedLevels.includes(8)
            ? p.completedLevels
            : [...p.completedLevels, 8];
          return {
            ...p,
            starCredits: p.completedLevels.includes(8)
              ? p.starCredits
              : p.starCredits + LEVEL9_REWARD_SC,
            completedLevels: completed,
            levelScores: {
              ...p.levelScores,
              8: Math.max(p.levelScores[8] || 0, LEVEL9_REWARD_SC),
            },
            badges: p.badges.includes(LEVEL9_BADGE_ID)
              ? p.badges
              : [...p.badges, LEVEL9_BADGE_ID],
            currentCampaignLevel: 8,
          };
        },
        'immediate'
      );

      if (firstTime) {
        say('SPACE RESCUE HERO UNLOCKED! +★ 1,000 Science Credits!', 5400);
      }

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        newStarBalance: nextStarBalance,
      };
    },
    [applyServerPlayer, authFetch, say, updatePlayer]
  );

  // Account Management Handlers (Logout, Change Password, Forgot Password, Delete Account)
  const handleLogout = useCallback(async () => {
    SFX.cancelSpeech();
    if (cloudSaveTimerRef.current !== null && activeUidRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
      await savePlayerProfileToFirestore(activeUidRef.current, playerStateRef.current).catch(
        () => {}
      );
    }
    setAuthViewMode('login');
    setShowProfileModal(false);
    setShowCampaignModal(false);
    setShowWelcome(false);
    setEnteredFacility(false);
    setStarted(false);
    setTutStep(0);
    clearAllLocalPlayerCaches();
    await signOut(auth).catch(() => {});
  }, []);

  const handleChangePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ ok: boolean; message: string }> => {
      const user = auth.currentUser;
      const email = user?.email || playerStateRef.current.email || '';
      if (!user || !email) {
        return { ok: false, message: 'No authenticated user session found.' };
      }
      try {
        const credential = EmailAuthProvider.credential(email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        return { ok: true, message: 'Password updated successfully.' };
      } catch (err) {
        return { ok: false, message: formatAuthErrorMessage(err) };
      }
    },
    []
  );

  const handleForgotPasswordForProfile = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const email = auth.currentUser?.email || playerStateRef.current.email || '';
    if (!email) {
      return { ok: false, message: 'No email address associated with this account.' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        ok: true,
        message: `Password reset email dispatched to ${email}.`,
      };
    } catch (err) {
      return { ok: false, message: formatAuthErrorMessage(err) };
    }
  }, []);

  const handleDeleteAccount = useCallback(
    async (currentPassword: string): Promise<{ ok: boolean; message: string }> => {
      const user = auth.currentUser;
      const email = user?.email || playerStateRef.current.email || '';
      const username = playerStateRef.current.username || user?.displayName || '';
      if (!user || !email) {
        return { ok: false, message: 'No authenticated user session found.' };
      }
      try {
        const credential = EmailAuthProvider.credential(email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        if (cloudSaveTimerRef.current !== null) {
          window.clearTimeout(cloudSaveTimerRef.current);
          cloudSaveTimerRef.current = null;
        }
        await deletePlayerDataFromFirestore(user.uid, username);
        await authFetch('/api/auth/delete-account', { method: 'POST' }).catch(() => {});
        await deleteUser(user);

        activeUidRef.current = null;
        setAuthViewMode('login');
        setShowProfileModal(false);
        setEnteredFacility(false);
        setStarted(false);
        clearAllLocalPlayerCaches();
        const fresh = createFreshPlayerState();
        setPlayerState(fresh);
        playerStateRef.current = fresh;
        return { ok: true, message: 'Account deleted permanently.' };
      } catch (err) {
        return { ok: false, message: formatAuthErrorMessage(err) };
      }
    },
    [authFetch]
  );

  const handlePurchaseStoreItem = useCallback(
    async (item: StoreItemSpec): Promise<{ ok: boolean; message: string }> => {
      const current = playerStateRef.current;
      const unlocked = current.unlockedStoreItems ?? [];
      if (unlocked.includes(item.id)) {
        return { ok: true, message: `${item.name} is already unlocked.` };
      }

      try {
        const res = await authFetch('/api/store/purchase', {
          method: 'POST',
          body: JSON.stringify({
            itemId: item.id,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.player) {
          applyServerPlayer(data.player, true);
          SFX.taskComplete();
          say(`Unlocked ${item.name}!`, 3600);
          return {
            ok: true,
            message: `Unlocked ${item.name} (-★ ${item.priceStarCredits.toLocaleString()} SC)`,
          };
        }
        if (data?.error) {
          SFX.snapWrong();
          return { ok: false, message: String(data.error) };
        }
      } catch {
        // Network error fallback only when authenticated
      }

      if (current.starCredits < item.priceStarCredits) {
        SFX.snapWrong();
        return {
          ok: false,
          message: `Insufficient Star Credits. Need ★ ${item.priceStarCredits.toLocaleString()} SC.`,
        };
      }

      updatePlayer(
        (p) => {
          const prevItems = p.unlockedStoreItems ?? [];
          if (prevItems.includes(item.id)) return p;
          return {
            ...p,
            starCredits: p.starCredits - item.priceStarCredits,
            unlockedStoreItems: [...prevItems, item.id],
          };
        },
        'immediate'
      );
      SFX.taskComplete();
      say(`Unlocked ${item.name}!`, 3600);
      return {
        ok: true,
        message: `Unlocked ${item.name} (-★ ${item.priceStarCredits.toLocaleString()} SC)`,
      };
    },
    [applyServerPlayer, authFetch, say, updatePlayer]
  );

  // ========================================================
  // INTRO SPLASH TIMER (2.6s)
  // ========================================================
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  // ========================================================
  // THREE.JS FACILITY SCENE & ANIMATION LOOP
  // ========================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x0b1322);
    sc.fog = new THREE.FogExp2(0x0b1322, 0.0085);

    const initW = Math.max(1, container.clientWidth || window.innerWidth);
    const initH = Math.max(1, container.clientHeight || window.innerHeight);
    const cam = new THREE.PerspectiveCamera(62, initW / initH, 0.1, 1200);
    cam.position.set(playerPosRef.current.x, camYRef.current, playerPosRef.current.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0);
    cameraRef.current = cam;

    const ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    ren.domElement.style.width = '100%';
    ren.domElement.style.height = '100%';
    ren.domElement.style.display = 'block';
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.setSize(initW, initH, false);
    ren.toneMapping = THREE.ACESFilmicToneMapping;
    ren.toneMappingExposure = 1.05;
    container.appendChild(ren.domElement);

    const pmrem = new THREE.PMREMGenerator(ren);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    sc.environment = envTex;

    const SOL: ColliderCircle[] = [];
    const INT: InteractableZone[] = [];

    const addBoxCollider = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35 })
      );
      mesh.position.set(x, y, z);
      sc.add(mesh);
      return mesh;
    };

    // Lighting
    const hemi = new THREE.HemisphereLight(0xd9eeff, 0x162238, 0.65);
    sc.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff4e0, 1.15);
    dir.position.set(20, 42, 18);
    sc.add(dir);

    const hangarGlow = new THREE.PointLight(0x4fe3d4, 1.0, 28);
    hangarGlow.position.set(22, 7, -6);
    sc.add(hangarGlow);

    // Facility Floor & Color Sector Guidance Paths
    const floorMat = new THREE.MeshStandardMaterial({
      map: makeFloorTexture(),
      roughness: 0.48,
      metalness: 0.35,
    });
    const facilityFloor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), floorMat);
    facilityFloor.rotation.x = -Math.PI / 2;
    facilityFloor.position.set(0, 0, -8);
    sc.add(facilityFloor);

    const addFloorPath = (x: number, z: number, w: number, d: number, color: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ color })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      sc.add(m);
    };
    addFloorPath(-2, -5, 96, 1.4, 0x4fe3d4);
    addFloorPath(-34, -13, 1.2, 16, 0x38bdf8);
    addFloorPath(-8, -13, 1.2, 16, 0x34d399);
    addFloorPath(24, -13, 1.2, 16, 0xfbbf24);
    addFloorPath(-28, 2, 1.2, 14, 0x818cf8);
    addFloorPath(24, 0, 1.2, 10, 0xf87171);
    addFloorPath(-2, 8, 1.2, 14, 0x4fe3d4);
    addFloorPath(-40, 2, 1.2, 14, 0x38bdf8);
    addFloorPath(38, 9, 18, 1.2, 0x22d3ee);

    // Ceiling & Overhead Light Panels (with Silo cutout over pad at x=36, z=-12)
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 80),
      new THREE.MeshStandardMaterial({ color: 0x131a28, roughness: 0.85 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 14, -8);
    sc.add(ceiling);

    const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xdff6ff });
    for (let x = -44; x <= 44; x += 22) {
      for (let z = -30; z <= 14; z += 22) {
        if (x >= 20 && z <= -8) continue;
        const lp = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), lightPanelMat);
        lp.rotation.x = Math.PI / 2;
        lp.position.set(x, 13.9, z);
        sc.add(lp);
        const pl = new THREE.PointLight(0xdff6ff, 0.45, 32);
        pl.position.set(x, 12.5, z);
        sc.add(pl);
      }
    }

    const siloRing = new THREE.Mesh(
      new THREE.RingGeometry(10, 16, 36),
      new THREE.MeshStandardMaterial({ color: 0x30394a, roughness: 0.5, metalness: 0.6 })
    );
    siloRing.rotation.x = Math.PI / 2;
    siloRing.position.set(36, 13.92, -12);
    sc.add(siloRing);

    // Exterior Facility Walls & Structural Partitions
    addBoxCollider(120, 14, 2, 0x202838, 0, 7, -38);
    addBoxCollider(120, 14, 2, 0x202838, 0, 7, 22);
    addBoxCollider(2, 14, 62, 0x202838, -56, 7, -8);
    addBoxCollider(2, 14, 62, 0x202838, 56, 7, -8);

    const addPillar = (x: number, z: number) => {
      addBoxCollider(2.5, 14, 2.5, 0x2e394e, x, 7, z);
      addBoxCollider(2.62, 1.5, 2.62, 0xf2c14e, x, 2, z);
      SOL.push({ x, z, r: 2.2 });
    };
    addPillar(-20, -5);
    addPillar(4, -5);
    addPillar(-20, -28);
    addPillar(4, -28);
    addPillar(-4, 10);
    addPillar(6, 10);

    // Sector divider walls
    addBoxCollider(1.6, 14, 16, 0x252e40, -20, 7, -26);
    addBoxCollider(1.6, 6, 14, 0x252e40, -20, 11, -11);
    SOL.push({ x: -20, z: -26, r: 8.5 });

    addBoxCollider(1.6, 14, 16, 0x252e40, 4, 7, -26);
    addBoxCollider(1.6, 6, 14, 0x252e40, 4, 11, -11);
    SOL.push({ x: 4, z: -26, r: 8.5 });

    addBoxCollider(24, 14, 1.6, 0x252e40, -42, 7, -2);
    addBoxCollider(20, 14, 1.6, 0x252e40, -12, 7, -2);
    addBoxCollider(12, 14, 1.6, 0x252e40, 40, 7, -2);
    SOL.push({ x: -42, z: -2, r: 12 });
    SOL.push({ x: -12, z: -2, r: 10 });
    SOL.push({ x: 40, z: -2, r: 6 });

    addBoxCollider(2, 14, 16, 0x252e40, 0, 7, 10);
    SOL.push({ x: 0, z: 10, r: 8.5 });

    // Tutorial 3D Waypoint Beacon
    const tutBeacon = new THREE.Group();
    const beaconCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x4fe3d4 })
    );
    beaconCone.rotation.x = Math.PI;
    const beaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    beaconRing.rotation.x = Math.PI / 2;
    tutBeacon.add(beaconCone, beaconRing);
    tutBeacon.visible = false;
    sc.add(tutBeacon);
    tutBeaconRef.current = tutBeacon;

    // SECTOR 1: ENTRANCE
    addBoxCollider(10, 6, 0.8, 0x1e283c, -2, 3, 20.6);
    addBoxCollider(6, 1.15, 2, 0x27344c, -2, 0.58, 12);
    SOL.push({ x: -2, z: 12, r: 3 });
    sc.add(createSectorSignSprite('NASA SPACE CENTER ENTRANCE', -2, 8.5, 20.6, 12, '#4fe3d4'));

    // SECTOR 2: GROUND STATION
    const dsn = buildDSNGroundStation();
    sc.add(dsn.group);
    SOL.push({ x: -40, z: 10, r: 3.5 });
    SOL.push({ x: -36, z: 8, r: 2.5 });
    sc.add(createSectorSignSprite('GROUND STATION COMMUNICATIONS', -40, 8.5, 20.6, 12, '#38bdf8'));

    // SECTOR 3: MISSION CONTROL CENTER
    const mcc = buildMissionControlCenter();
    sc.add(mcc.group);
    SOL.push({ x: -34, z: -24, r: 4 });
    SOL.push({ x: -34, z: -28.5, r: 4 });
    sc.add(createSectorSignSprite('MISSION CONTROL CENTER', -34, 8.5, -32, 12, '#38bdf8'));

    // SECTOR 4: SCIENTIFIC RESEARCH LAB
    const srlBench = buildResearchLabBench();
    sc.add(srlBench);
    SOL.push({ x: -8, z: -32, r: 8 });
    sc.add(createSectorSignSprite('SCIENTIFIC RESEARCH LABORATORY', -8, 8.5, -34, 13, '#34d399'));

    // SECTOR 5: SPACECRAFT ASSEMBLY HANGAR & LAUNCH PAD
    const hgrPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 30),
      new THREE.MeshStandardMaterial({ map: makeHangarFloorTexture(), roughness: 0.35, metalness: 0.45 })
    );
    hgrPlate.rotation.x = -Math.PI / 2;
    hgrPlate.position.set(28, 0.01, -16);
    sc.add(hgrPlate);

    const padData = buildLaunchPadAndDetailedRocket();
    sc.add(padData.padGroup);
    sc.add(padData.rocket.group);
    rocketHandleRef.current = padData.rocket;
    SOL.push({ x: 30, z: -12, r: 1.5 });
    SOL.push({ x: 36, z: -12, r: 2.2 });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.15, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(36, 40, -12);
    ring.visible = false;
    sc.add(ring);
    targetRingRef.current = ring;

    const showcaseSat = buildHangarShowcaseSatellite();
    sc.add(showcaseSat);
    SOL.push({ x: 22, z: -6, r: 2.2 });
    sc.add(createSectorSignSprite('SPACECRAFT ASSEMBLY HANGAR', 24, 9, -34, 14, '#fbbf24'));

    // SECTOR 6: MISSION PLANNING ROOM
    const mpr = buildMissionPlanningHoloTable();
    sc.add(mpr.group);
    SOL.push({ x: -28, z: 10, r: 4.5 });
    sc.add(createSectorSignSprite('MISSION PLANNING ROOM', -28, 8, 20.8, 12, '#818cf8'));

    // SECTOR 7: LAUNCH CONTROL COMPLEX
    const lcc = buildLaunchControlComplex();
    sc.add(lcc);
    SOL.push({ x: 24, z: 4, r: 2.8 });
    sc.add(createSectorSignSprite('LAUNCH CONTROL COMPLEX', 24, 6.8, 4.8, 9, '#f87171'));

    // SECTOR 8: PROPULSION & NAVIGATION LAB (Level 5 Lunar Flyby + Upgrade Display)
    const pnl = buildPropulsionNavigationLab();
    sc.add(pnl.group);
    SOL.push({ x: 48, z: 9, r: 2.6 });
    SOL.push({ x: 48, z: 3.5, r: 1.8 });
    sc.add(createSectorSignSprite('PROPULSION & NAVIGATION LAB', 46, 8.5, 20.6, 12, '#22d3ee'));
    sc.add(createSectorSignSprite('PROPULSION UPGRADE BAY', 48, 4.4, 3.5, 7.2, '#34d399'));

    // SUPPLY CRATES & MOTORS (Detailed multi-part instruments & De Laval nozzle motors)
    const crateHandles: CrateVisualHandle[] = [];
    CRATES.forEach((crate) => {
      const handle = buildSupplyCrateModel(crate);
      sc.add(handle.group);
      crateHandles.push(handle);

      const labelText = crate.mot
        ? `${crate.n}  •  ${crate.imp} thrust  •  ₡${crate.cred.toLocaleString()}`
        : `${crate.n}  •  ${crate.m} kg  •  ₡${crate.cred.toLocaleString()}`;
      sc.add(
        createSectorSignSprite(labelText, crate.x, crate.mot ? 4.9 : 3.7, -25, 6.4, crate.mot ? '#fbbf24' : '#38bdf8')
      );

      SOL.push({ x: crate.x, z: -25, r: 1.6 });
      INT.push({
        x: crate.x,
        z: -25,
        r: 4.4,
        text: () => {
          const isTraining = !playerStateRef.current.trainingCompleted && tutStepRef.current > 0;
          if (isTraining) {
            return tutStepRef.current === 4 ? `Press E: inspect ${crate.n}` : null;
          }
          const M = CAMPAIGN_LEVELS[simRef.current.n];
          if ((!M?.isLab || legacyKarmanRef.current) && simRef.current.phase === 1) {
            const active = crate.mot ? simRef.current.mot === crate.k : simRef.current.items.has(crate.k);
            return `${active ? 'Press E: return ' : 'Press E: requisition '}${crate.n}`;
          }
          return null;
        },
        act: () => {
          const isTraining = !playerStateRef.current.trainingCompleted && tutStepRef.current > 0;
          const M = CAMPAIGN_LEVELS[simRef.current.n];
          if (isTraining) {
            if (tutStepRef.current === 4) takeCrate(crate);
            return;
          }
          if ((!M?.isLab || legacyKarmanRef.current) && simRef.current.phase === 1) {
            takeCrate(crate);
          }
        },
      });
    });
    crateHandlesRef.current = crateHandles;

    // PROXIMITY INTERACTION ZONES
    // 1. Mission Control Center (MCC)
    INT.push({
      x: -34,
      z: -20,
      r: 12,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
          return tutStepRef.current === 5 ? 'Press E: Inspect Mission Monitoring Screens' : null;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
        if (simRef.current.phase === 0 && M.briefingStationId === 'mcc') {
          return `Press E: Level 0${M.lvl} Briefing (MCC)`;
        }
        if (M.labMode === 'astronaut_rescue' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 08 Rescue the Lost Astronaut (MCC)';
        }
        if (simRef.current.phase === 3 && !M.isLab) {
          return 'Press E: Debrief & Advance Campaign';
        }
        return null;
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
          if (tutStepRef.current === 5) completeTutTask(5);
          return;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
        if (simRef.current.phase === 0 && M.briefingStationId === 'mcc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M.labMode === 'astronaut_rescue' && simRef.current.phase >= 1) {
          SFX.click();
          setAstronautRescueLabOpen(true);
        } else if (simRef.current.phase === 3 && !M.isLab) {
          const completedLvl = simRef.current.n + 1;
          const nextLvl =
            simRef.current.n < CAMPAIGN_LEVELS.length - 1
              ? simRef.current.n + 2
              : playerStateRef.current.currentCampaignLevel;
          updatePlayer((p) => {
            const nextCompleted = p.completedLevels.includes(completedLvl)
              ? p.completedLevels
              : [...p.completedLevels, completedLvl];
            return { ...p, completedLevels: nextCompleted, currentCampaignLevel: nextLvl };
          });
          void syncWithServer({ completedLevel: completedLvl, currentCampaignLevel: nextLvl });
          if (simRef.current.n < CAMPAIGN_LEVELS.length - 1) {
            simRef.current.n += 1;
            setActiveLevelIdx(simRef.current.n);
          }
          simRef.current.items.clear();
          simRef.current.mot = null;
          simRef.current.phase = 0;
          setSelectedItems(new Set());
          setSelectedMotor(null);
          setMissionPhase(0);
          syncCrateColors();
          SFX.levelComplete();
          setShowCampaignModal(true);
          say(`Level 0${completedLvl} Complete! Select your next mission from the Level Map.`, 4500);
        }
      },
    });

    // 2. Launch Pad Staging Trigger
    INT.push({
      x: 36,
      z: -12,
      r: 12,
      text: () => {
        const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
        if (M.isLab || simRef.current.phase === 0) return null;
        if (simRef.current.phase === 1) return 'Press E: Stage Rocket on Launch Pad';
        if (simRef.current.phase === 2 && !simRef.current.flying) return 'Press E: Unload Rocket';
        return null;
      },
      act: () => {
        if (simRef.current.phase === 1) loadRocketOnPad();
        else if (simRef.current.phase === 2) {
          simRef.current.phase = 1;
          setMissionPhase(1);
          if (rocketHandleRef.current) rocketHandleRef.current.group.visible = false;
          say('Rocket returned to hangar staging.');
        }
      },
    });

    // 3. Launch Control Complex (LCC) Console Trigger (Level 2 Briefing/Lab + Rocket Launch)
    INT.push({
      x: 24,
      z: 4,
      r: 7.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return null;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'lcc') {
          return `Press E: Level 0${M.lvl} Briefing (LCC)`;
        }
        if (M?.labMode === 'rocket' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 02 Rocket Launch Lab';
        }
        if (simRef.current.phase === 2 && !simRef.current.flying) {
          return 'Press E: INITIATE LAUNCH';
        }
        return null;
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'lcc') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        if (M?.labMode === 'rocket' && simRef.current.phase >= 1) {
          SFX.click();
          setRocketLabOpen(true);
          return;
        }
        if (simRef.current.phase === 2 && !simRef.current.flying) {
          initiateLaunch();
        }
      },
    });

    // 4. Ground Station Dish Trigger (GSC Briefing + Level 3 Orbit Lab + Telemetry)
    INT.push({
      x: -38,
      z: 8,
      r: 8.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
          return tutStepRef.current === 2 ? 'Press E: Explore Communication Antenna' : null;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'gsc') {
          return `Press E: Level 0${M.lvl} Briefing (GSC Dish)`;
        }
        if (M?.labMode === 'europa_probe' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 06 Europa Probe Lab (GSC)';
        }
        if (M?.labMode === 'orbit' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 03 Orbit & Power Sim';
        }
        return 'Press E: Inspect Antenna Telemetry';
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
          if (tutStepRef.current === 2) completeTutTask(2);
          return;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'gsc') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        if (M?.labMode === 'europa_probe' && simRef.current.phase >= 1) {
          SFX.click();
          setEuropaLabOpen(true);
          return;
        }
        if (M?.labMode === 'orbit' && simRef.current.phase >= 1) {
          SFX.click();
          setOrbitLabOpen(true);
          return;
        }
        SFX.select();
        say('Ground Station DSN Antenna: S/X-Band Uplink & Downlink nominal.');
      },
    });

    // 5. Hangar Test Spacecraft Trigger (SAH Briefing + Level 1 Lab Entry)
    INT.push({
      x: 22,
      z: -6,
      r: 7.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
          return tutStepRef.current === 3 ? 'Press E: Inspect Spacecraft Subsystems' : null;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'sah') {
          return `Press E: Level 0${M.lvl} Briefing (SAH Hangar)`;
        }
        if (M?.labMode === 'satellite' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 01 Satellite Assembly Lab';
        }
        return null;
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
          if (tutStepRef.current === 3) completeTutTask(3);
          return;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'sah') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        if (M?.labMode === 'satellite' && simRef.current.phase >= 1) {
          SFX.click();
          setSatLabOpen(true);
        } else {
          SFX.select();
          say('Spacecraft Assembly Hangar (SAH): Level 01 Satellite Assembly Bay.');
        }
      },
    });

    // 6. Scientific Research Lab (SRL) Briefing Station
    INT.push({
      x: -8,
      z: -22,
      r: 9.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return null;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'srl') {
          return `Press E: Level 0${M.lvl} Briefing (SRL Lab)`;
        }
        return null;
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'srl') {
          SFX.select();
          setBriefingModalLevel(M);
        }
      },
    });

    // 7. Mission Planning Room (MPR) Holo-Table Briefing & Level 4 / Level 7 Triggers
    INT.push({
      x: -28,
      z: 10,
      r: 8.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return null;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'mpr') {
          return `Press E: Level 0${M.lvl} Briefing (MPR Holo-Table)`;
        }
        if (M?.labMode === 'lunar_water' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 07 Lunar Water Hunt (MPR)';
        }
        if (M?.labMode === 'shake_freeze' && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 04 Shake & Freeze Lab';
        }
        return 'Press E: Inspect Orbital Trajectory Holo-Table';
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'mpr') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        if (M?.labMode === 'lunar_water' && simRef.current.phase >= 1) {
          SFX.click();
          setLunarWaterLabOpen(true);
          return;
        }
        if (M?.labMode === 'shake_freeze' && simRef.current.phase >= 1) {
          SFX.click();
          setShakeFreezeLabOpen(true);
          return;
        }
        SFX.select();
        say(`Mission Planning Room: Target ${M?.t} km — ${M?.sector}`);
      },
    });

    // 8. Propulsion & Navigation Lab (PNL) Entrance & Level 5 Lunar Flyby Workbench
    INT.push({
      x: 48,
      z: 9,
      r: 8.8,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return null;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (M?.labMode === 'lunar_flyby' && !legacyKarmanRef.current) {
          if (simRef.current.phase === 0) {
            return 'Press E: Level 05 Briefing (PNL Lab)';
          }
          return 'Press E: Enter Propulsion & Navigation Lab (Level 05)';
        }
        return 'Press E: Enter Propulsion & Navigation Lab';
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (M?.labMode === 'lunar_flyby' && !legacyKarmanRef.current && simRef.current.phase === 0) {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        enterPropulsionLab();
      },
    });

    // 9. Propulsion Upgrade Pedestal Display Inspection
    INT.push({
      x: 48,
      z: 3.5,
      r: 5.2,
      text: () =>
        !playerStateRef.current.trainingCompleted && tutStepRef.current > 0
          ? null
          : 'Press E: Inspect Propulsion Upgrade Display',
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) return;
        SFX.select();
        if (playerStateRef.current.propulsionUpgradeUnlocked) {
          say('PROPULSION UPGRADE UNLOCKED: High-Efficiency Lunar Bipropellant Thruster Online!', 4600);
        } else {
          say('Propulsion Upgrade Locked — Complete Level 5 Lunar Flyby (45–65 kg) to unlock.', 4400);
        }
      },
    });

    // ========================================================
    // INPUT, RAYCASTING & CAMERA CONTROLS
    // ========================================================
    const keys: Record<string, boolean> = {};
    let jx = 0;
    let jz = 0;
    let jid: number | null = null;
    let lid: number | null = null;
    let jo: [number, number] = [0, 0];
    let lp: [number, number] = [0, 0];
    let downPt: [number, number] = [0, 0];

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    const cv = ren.domElement;

    const isUiBlocking3D = () =>
      !startedRef.current || modalOverlayOpenRef.current;

    const handle3DObjectClick = () => {
      if (isUiBlocking3D() || simRef.current.flying) return;
      const M = CAMPAIGN_LEVELS[simRef.current.n];
      const isTraining = !playerStateRef.current.trainingCompleted && tutStepRef.current > 0;

      if (raycaster.intersectObjects(dsn.group.children, true).length > 0) {
        if (isTraining) {
          if (tutStepRef.current === 2) completeTutTask(2);
        } else if (simRef.current.phase === 0 && M?.briefingStationId === 'gsc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M?.labMode === 'europa_probe' && simRef.current.phase >= 1) {
          SFX.click();
          setEuropaLabOpen(true);
        } else if (M?.labMode === 'orbit' && simRef.current.phase >= 1) {
          SFX.click();
          setOrbitLabOpen(true);
        } else {
          SFX.select();
          say('Ground Station Telemetry Antenna: Tracking active.');
        }
        return;
      }

      if (raycaster.intersectObjects(lcc.children, true).length > 0) {
        if (isTraining) return;
        if (simRef.current.phase === 0 && M?.briefingStationId === 'lcc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M?.labMode === 'rocket' && simRef.current.phase >= 1) {
          SFX.click();
          setRocketLabOpen(true);
        } else if (simRef.current.phase === 2 && !simRef.current.flying) {
          initiateLaunch();
        } else {
          SFX.select();
          say('Launch Control Complex (LCC): Flight telemetry desk active.');
        }
        return;
      }

      if (raycaster.intersectObjects(showcaseSat.children, true).length > 0) {
        if (isTraining) {
          if (tutStepRef.current === 3) completeTutTask(3);
        } else if (simRef.current.phase === 0 && M?.briefingStationId === 'sah') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M?.labMode === 'satellite' && simRef.current.phase >= 1) {
          SFX.click();
          setSatLabOpen(true);
        } else {
          SFX.select();
          say('Spacecraft Assembly Hangar (SAH): Level 01 Satellite Assembly Bay.');
        }
        return;
      }

      for (const h of crateHandles) {
        if (raycaster.intersectObject(h.hitMesh, false).length > 0) {
          if (isTraining) {
            if (tutStepRef.current === 4) takeCrate(h.crate);
          } else if ((!M?.isLab || legacyKarmanRef.current) && simRef.current.phase === 1) {
            takeCrate(h.crate);
          } else {
            SFX.select();
            say(`${h.crate.n} (${h.crate.subtitle}) — Used in Kármán Line Flight & Cadet Training.`);
          }
          return;
        }
      }

      if (raycaster.intersectObjects(srlBench.children, true).length > 0) {
        if (isTraining) return;
        if (simRef.current.phase === 0 && M?.briefingStationId === 'srl') {
          SFX.select();
          setBriefingModalLevel(M);
        } else {
          SFX.select();
          say('Scientific Research Lab: Cleanroom sensor calibration bench.');
        }
        return;
      }

      if (raycaster.intersectObjects(mpr.group.children, true).length > 0) {
        if (isTraining) return;
        if (simRef.current.phase === 0 && M?.briefingStationId === 'mpr') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M?.labMode === 'lunar_water' && simRef.current.phase >= 1) {
          SFX.click();
          setLunarWaterLabOpen(true);
        } else if (M?.labMode === 'shake_freeze' && simRef.current.phase >= 1) {
          SFX.click();
          setShakeFreezeLabOpen(true);
        } else {
          SFX.select();
          say(`Mission Planning Room: Target ${M?.t} km — ${M?.sector}`);
        }
        return;
      }

      if (raycaster.intersectObjects(pnl.workbenchGroup.children, true).length > 0) {
        if (isTraining) return;
        if (M?.labMode === 'lunar_flyby' && !legacyKarmanRef.current && simRef.current.phase === 0) {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        enterPropulsionLab();
        return;
      }

      if (raycaster.intersectObjects(pnl.upgradeGroup.children, true).length > 0) {
        SFX.select();
        if (playerStateRef.current.propulsionUpgradeUnlocked) {
          say('PROPULSION UPGRADE UNLOCKED: High-Efficiency Lunar Bipropellant Thruster Online!', 4600);
        } else {
          say('Propulsion Upgrade Locked — Complete Level 5 Lunar Flyby (45–65 kg) to unlock.', 4400);
        }
        return;
      }

      if (raycaster.intersectObject(mcc.screenMesh, false).length > 0) {
        if (isTraining) {
          if (tutStepRef.current === 5) completeTutTask(5);
        } else if (simRef.current.phase === 0 && M?.briefingStationId === 'mcc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M?.labMode === 'astronaut_rescue' && simRef.current.phase >= 1) {
          SFX.click();
          setAstronautRescueLabOpen(true);
        } else {
          SFX.select();
          say('Mission Control Video Wall: Live orbital telemetry streaming.');
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isUiBlocking3D()) return;
      cv.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45) {
        jid = e.pointerId;
        jo = [e.clientX, e.clientY];
        if (joyWrapRef.current) {
          joyWrapRef.current.style.display = 'block';
          joyWrapRef.current.style.left = `${e.clientX - 45}px`;
          joyWrapRef.current.style.top = `${e.clientY - 45}px`;
        }
      } else {
        lid = e.pointerId;
        lp = [e.clientX, e.clientY];
        downPt = [e.clientX, e.clientY];
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isUiBlocking3D()) return;
      if (e.pointerId === jid) {
        const dx = e.clientX - jo[0];
        const dy = e.clientY - jo[1];
        const m = Math.min(1, Math.hypot(dx, dy) / 45);
        const a = Math.atan2(dy, dx);
        jx = Math.cos(a) * m;
        jz = Math.sin(a) * m;
        if (joyDotRef.current) {
          joyDotRef.current.style.transform = `translate(${jx * 30}px, ${jz * 30}px)`;
        }
      } else if (e.pointerId === lid) {
        lookRef.current.yaw -= (e.clientX - lp[0]) * 0.005;
        lookRef.current.pitch = Math.max(-1.3, Math.min(1.3, lookRef.current.pitch - (e.clientY - lp[1]) * 0.005));
        lp = [e.clientX, e.clientY];
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === jid) {
        jid = null;
        jx = 0;
        jz = 0;
        if (joyWrapRef.current) joyWrapRef.current.style.display = 'none';
      }
      if (e.pointerId === lid) {
        if (Math.hypot(e.clientX - downPt[0], e.clientY - downPt[1]) < 8) {
          mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
          mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
          raycaster.setFromCamera(mouseVec, cam);
          handle3DObjectClick();
        }
        lid = null;
      }
    };

    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === 'escape') {
        closeMap();
        setShowCampaignModal(false);
        setShowProfileModal(false);
        setCompletedTaskModal(null);
        setBriefingModalLevel(null);
        setStoreOpen(false);
        return;
      }
      if (
        satLabOpenRef.current ||
        rocketLabOpenRef.current ||
        orbitLabOpenRef.current ||
        shakeFreezeLabOpenRef.current ||
        lunarFlybyLabOpenRef.current ||
        europaLabOpenRef.current ||
        lunarWaterLabOpenRef.current ||
        astronautRescueLabOpenRef.current ||
        handbookOpenRef.current ||
        pnlTransitionRef.current ||
        briefingModalOpenRef.current ||
        storeOpenRef.current
      )
        return;
      if (k === 'e' && startedRef.current && !simRef.current.flying && !modalOverlayOpenRef.current && currentInteractRef.current) {
        currentInteractRef.current.act();
      }
      if (k === 'm' && startedRef.current) {
        if (mapExpandedRef.current) closeMap();
        else openMap();
      }
      if (k === 'c' && startedRef.current) {
        setShowCampaignModal((v) => !v);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      const w = Math.max(1, container.clientWidth || window.innerWidth);
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      ren.setSize(w, h, false);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => onResize()) : null;
    resizeObserver?.observe(container);
    const rafResizeId = requestAnimationFrame(onResize);

    // ========================================================
    // MAIN RENDER & FLIGHT SIMULATION LOOP
    // ========================================================
    let last = performance.now();
    let lastLocUpdate = 0;
    let rafId = 0;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Ambient animated facility machinery
      mcc.updateScreen(now);
      mpr.earthGlobe.rotation.y += 0.008;
      mpr.orbitRing.rotation.z += 0.015;
      const orbAng = now * 0.0014;
      mpr.orbitSat.position.set(-28 + Math.cos(orbAng) * 2.45, 2.75 + Math.sin(orbAng) * 1.1, 10 + Math.sin(orbAng) * 1.9);

      const craneZ = -12 + Math.sin(now * 0.0006) * 5;
      padData.gantryHoist.position.z = craneZ;
      padData.craneHoistCable.position.z = craneZ;
      padData.hoistBeacon.position.z = craneZ;
      (padData.hoistBeacon.material as THREE.MeshBasicMaterial).color.setHex(
        Math.sin(now * 0.005) > 0 ? 0x4fe3d4 : 0x0ea5e9
      );

      dsn.dishElevation.rotation.x = 0.65 + Math.sin(now * 0.0005) * 0.14;
      dsn.dishAzimuth.rotation.y = Math.sin(now * 0.0003) * 0.3;
      showcaseSat.rotation.y += 0.007;
      hangarGlow.intensity = 0.75 + Math.sin(now * 0.003) * 0.25;
      pnl.updateUpgrade(Boolean(playerStateRef.current.propulsionUpgradeUnlocked), now);

      const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
      const s = simRef.current;

      // Dynamic 3D Waypoint Beacon & Map Mission Route Target: Cadet Training OR Active Mission Station
      if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
        if (tutBeacon.visible) {
          const baseY = typeof tutBeacon.userData.baseY === 'number' ? tutBeacon.userData.baseY : 5.2;
          tutBeacon.position.y = baseY + Math.sin(now * 0.005) * 0.22;
          tutBeacon.rotation.y += 0.025;
        }
        const step = tutStepRef.current;
        if (step === 2) missionTargetRef.current = { x: -40, z: 10, label: 'GSC Dish' };
        else if (step === 3) missionTargetRef.current = { x: 22, z: -6, label: 'SAH Satellite' };
        else if (step === 4) missionTargetRef.current = { x: -9, z: -25, label: 'SRL Bench' };
        else if (step === 5) missionTargetRef.current = { x: -34, z: -24, label: 'MCC Wall' };
        else missionTargetRef.current = null;
      } else if (
        (playerStateRef.current.trainingCompleted || tutStepRef.current === 0) &&
        startedRef.current &&
        !s.flying &&
        !satLabOpenRef.current &&
        !rocketLabOpenRef.current &&
        !orbitLabOpenRef.current &&
        !shakeFreezeLabOpenRef.current &&
        !lunarFlybyLabOpenRef.current &&
        !europaLabOpenRef.current &&
        !lunarWaterLabOpenRef.current &&
        !astronautRescueLabOpenRef.current &&
        !handbookOpenRef.current &&
        !pnlTransitionRef.current &&
        !briefingModalOpenRef.current
      ) {
        let bx = 22;
        let by = 5.2;
        let bz = -6;
        let targetLabel = 'SAH Briefing';
        let showBeacon = true;

        if (s.phase === 0 && !legacyKarmanRef.current) {
          if (M.briefingStationId === 'sah') {
            bx = 22; by = 5.2; bz = -6; targetLabel = `SAH Briefing (L${M.lvl})`;
          } else if (M.briefingStationId === 'lcc') {
            bx = 24; by = 4.8; bz = 4; targetLabel = `LCC Briefing (L${M.lvl})`;
          } else if (M.briefingStationId === 'mcc') {
            bx = -34; by = 6.0; bz = -24; targetLabel = `MCC Briefing (L${M.lvl})`;
          } else if (M.briefingStationId === 'srl') {
            bx = -8; by = 5.2; bz = -26; targetLabel = `SRL Briefing (L${M.lvl})`;
          } else if (M.briefingStationId === 'mpr') {
            bx = -28; by = 5.4; bz = 10; targetLabel = `MPR Briefing (L${M.lvl})`;
          } else if (M.briefingStationId === 'gsc') {
            bx = -40; by = 6.4; bz = 10; targetLabel = `GSC Briefing (L${M.lvl})`;
          } else if (M.briefingStationId === 'pnl') {
            bx = 48; by = 5.4; bz = 9; targetLabel = `PNL Lab Entrance (L${M.lvl})`;
          }
        } else if (s.phase === 1 && M.isLab && !legacyKarmanRef.current) {
          if (M.labMode === 'rocket') {
            bx = 24; by = 4.8; bz = 4; targetLabel = 'LCC Rocket Lab';
          } else if (M.labMode === 'orbit') {
            bx = -40; by = 6.4; bz = 10; targetLabel = 'GSC Orbit Sim';
          } else if (M.labMode === 'shake_freeze') {
            bx = -28; by = 5.4; bz = 10; targetLabel = 'MPR Shake & Freeze Lab';
          } else if (M.labMode === 'lunar_flyby') {
            bx = 48; by = 5.4; bz = 9; targetLabel = 'Propulsion & Navigation Lab';
          } else if (M.labMode === 'europa_probe') {
            bx = -40; by = 6.4; bz = 10; targetLabel = 'GSC Europa Probe Lab';
          } else if (M.labMode === 'lunar_water') {
            bx = -28; by = 5.4; bz = 10; targetLabel = 'MPR Lunar Water Hunt';
          } else if (M.labMode === 'astronaut_rescue') {
            bx = -34; by = 6.0; bz = -24; targetLabel = 'MCC Astronaut Rescue';
          } else {
            bx = 22; by = 5.2; bz = -6; targetLabel = 'SAH Assembly Lab';
          }
        } else if (s.phase === 1 && (!M.isLab || legacyKarmanRef.current)) {
          if (M.req.some((k) => !s.items.has(k))) {
            bx = -8; by = 5.2; bz = -26; targetLabel = 'SRL Sensors';
          } else if (!s.mot) {
            bx = 17; by = 5.2; bz = -25; targetLabel = 'SAH Motors';
          } else {
            bx = 36; by = 7.2; bz = -12; targetLabel = 'Launch Pad';
          }
        } else if (s.phase === 2) {
          bx = 24; by = 4.8; bz = 4; targetLabel = 'LCC Launch';
        } else if (s.phase === 3) {
          bx = -34; by = 6.0; bz = -24; targetLabel = 'MCC Debrief';
        } else {
          showBeacon = false;
        }

        tutBeacon.visible = showBeacon;
        missionTargetRef.current = showBeacon ? { x: bx, z: bz, label: targetLabel } : null;
        if (showBeacon) {
          tutBeacon.position.set(bx, by + Math.sin(now * 0.005) * 0.25, bz);
          tutBeacon.rotation.y += 0.025;
        }
      } else {
        tutBeacon.visible = false;
      }

      // Target altitude ring visibility
      const showRing =
        (!M.isLab || legacyKarmanRef.current) &&
        (playerStateRef.current.trainingCompleted || tutStepRef.current === 0) &&
        (simRef.current.phase === 1 || simRef.current.phase === 2);
      ring.visible = showRing;
      ring.position.y = typeof M.t === 'number' ? M.t * 1.2 : 40;

      // Player Movement vs Showcase Camera
      if (startedRef.current && !s.flying && !modalOverlayOpenRef.current) {
        let f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - jz;
        let r = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + jx;
        const len = Math.hypot(f, r);
        if (len > 1) {
          f /= len;
          r /= len;
        }

        const P = playerPosRef.current;
        const yaw = lookRef.current.yaw;
        P.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * 7.8 * dt;
        P.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * 7.8 * dt;

        for (const o of SOL) {
          const dx = P.x - o.x;
          const dz = P.z - o.z;
          const d = Math.hypot(dx, dz) || 0.01;
          if (d < o.r + 0.7) {
            P.x = o.x + (dx / d) * (o.r + 0.7);
            P.z = o.z + (dz / d) * (o.r + 0.7);
          }
        }
        P.x = Math.max(-53, Math.min(53, P.x));
        P.z = Math.max(-35, Math.min(19, P.z));

        const targetCamY = UPPER_VIEW_HEIGHT;
        camYRef.current += (targetCamY - camYRef.current) * Math.min(1, dt * 10);
        cam.position.set(P.x, camYRef.current, P.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0);

        if (now - lastLocUpdate > 160) {
          lastLocUpdate = now;
          const loc = getCurrentLocation(P.x, P.z);
          setCurrentLoc((prev) => (prev.id === loc.id ? prev : loc));
        }
      } else if (startedRef.current && !s.flying && pnlTransitionRef.current) {
        // Short smooth camera transition into Propulsion & Navigation Lab without mutating player spot or eye level
        for (const k of Object.keys(keys)) keys[k] = false;
        const tr = pnlTransitionRef.current;
        const t = Math.min(1, (now - tr.startTime) / tr.durationMs);
        const ease = 1 - Math.pow(1 - t, 3);
        const dest = new THREE.Vector3(44.2, 3.05, 9);
        cam.position.lerpVectors(tr.startPos, dest, ease);
        cam.lookAt(48, 2.25, 9);
        if (t >= 1) {
          pnlTransitionRef.current = null;
          setPnlTransitionActive(false);
          setLunarFlybyLabOpen(true);
        }
      } else if (startedRef.current && !s.flying && modalOverlayOpenRef.current) {
        // Freeze held keys and preserve exact spot, eye level, and room while joining missions or viewing modals/labs
        for (const k of Object.keys(keys)) keys[k] = false;
        const P = playerPosRef.current;
        cam.position.set(P.x, camYRef.current, P.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0);
      } else if (!startedRef.current) {
        const t = now * 0.00035;
        cam.position.set(Math.sin(t) * 16 - 4, 3.6 + Math.sin(t * 0.7) * 0.8, Math.cos(t) * 14 - 2);
        cam.lookAt(Math.sin(t + 0.5) * 6 + 6, 2.8, Math.cos(t + 0.5) * 8 - 14);
      }

      // Rocket Flight Ascent Physics
      if (s.flying) {
        const e = (now - s.t0) / 1000;
        if (e < 3) {
          setToastMsg({ text: `T-MINUS ${Math.ceil(3 - e)}`, until: now + 350 });
          padData.rocket.flame.visible = e > 2.3;
        } else {
          const k = Math.min(1, (e - 3) / 4.5);
          const curAlt = s.flightAlt * (1 - Math.pow(1 - k, 3));
          padData.rocket.group.position.y = 0.52 + curAlt * 1.2;
          padData.rocket.flame.visible = k < 1;
          padData.rocket.flame.scale.set(1, 0.85 + Math.sin(now * 0.04) * 0.2, 1);
          setToastMsg({ text: `ALTITUDE: ${curAlt.toFixed(0)} km`, until: now + 350 });
          cam.lookAt(36, padData.rocket.group.position.y + 5, -12);

          if (k >= 1) {
            s.flying = false;
            padData.rocket.flame.visible = false;
            setIsFlying(false);
            const ok = s.flightAlt >= s.altTarget;
            const curMission = CAMPAIGN_LEVELS[s.n] || CAMPAIGN_LEVELS[0];
            if (ok) {
              const left = Math.max(0, curMission.b - s.flightCost);
              const pts = 100 + s.extraCount * 25 + left * 2;
              const earnGrant = 2500 + pts * 10;
              const earnStar = 20;
              s.score += pts;
              setFlightScore(s.score);
              s.phase = 3;
              setMissionPhase(3);
              SFX.levelComplete();
              const nextGrant = playerStateRef.current.grantCredits + earnGrant;
              updatePlayer((p) => ({
                ...p,
                grantCredits: p.grantCredits + earnGrant,
                starCredits: p.starCredits + earnStar,
                levelScores: {
                  ...p.levelScores,
                  [curMission.lvl]: Math.max(p.levelScores[curMission.lvl] || 0, pts),
                },
              }));
              void syncWithServer({
                grantCredits: nextGrant,
                flightRewardStar: earnStar,
                flightRewardGrant: earnGrant,
                flightTxKey: `flight:${curMission.lvl}:${Math.round(s.t0)}`,
                levelScores: { [curMission.lvl]: pts },
                note: `Level ${curMission.lvl} Launch Completion`,
              });
              setToastMsg({
                text: `Mission Success! ${s.flightAlt.toFixed(0)} km reached. +${pts} pts (+₡${earnGrant.toLocaleString()}, +★${earnStar})`,
                until: now + 6200,
              });
            } else {
              s.phase = 1;
              setMissionPhase(1);
              SFX.snapWrong();
              setToastMsg({
                text: `Apogee fell short: ${s.flightAlt.toFixed(0)} km of ${s.altTarget} km. Upgrade motor impulse or reduce mass.`,
                until: now + 7000,
              });
            }

            window.setTimeout(() => {
              padData.rocket.group.position.y = 0.52;
              padData.rocket.group.visible = false;
            }, 3400);
          }
        }
      }

      // Check proximity interactables
      let bestZone: InteractableZone | null = null;
      let bestDist = 1e9;
      let nextPrompt = '';
      if (
        startedRef.current &&
        !s.flying &&
        !satLabOpenRef.current &&
        !rocketLabOpenRef.current &&
        !orbitLabOpenRef.current &&
        !shakeFreezeLabOpenRef.current &&
        !lunarFlybyLabOpenRef.current &&
        !europaLabOpenRef.current &&
        !lunarWaterLabOpenRef.current &&
        !astronautRescueLabOpenRef.current &&
        !handbookOpenRef.current &&
        !pnlTransitionRef.current &&
        !briefingModalOpenRef.current
      ) {
        const P = playerPosRef.current;
        for (const z of INT) {
          const t = z.text();
          if (!t) continue;
          const d = Math.hypot(P.x - z.x, P.z - z.z);
          if (d < z.r && d < bestDist) {
            bestDist = d;
            bestZone = z;
            nextPrompt = t;
          }
        }
      }
      currentInteractRef.current = bestZone;
      setPromptText((prev) => (prev === nextPrompt ? prev : nextPrompt));

      ren.render(sc, cam);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(rafResizeId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cv.removeEventListener('pointerdown', onPointerDown);
      cv.removeEventListener('pointermove', onPointerMove);
      cv.removeEventListener('pointerup', onPointerUp);
      cv.removeEventListener('pointercancel', onPointerUp);
      sc.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
      envTex.dispose();
      pmrem.dispose();
      ren.dispose();
      if (container.contains(ren.domElement)) {
        container.removeChild(ren.domElement);
      }
    };
  }, [closeMap, completeTutTask, enterPropulsionLab, initiateLaunch, loadRocketOnPad, openMap, say, syncCrateColors, syncWithServer, takeCrate, updatePlayer]);

  // Derived HUD metrics
  const activeMission = CAMPAIGN_LEVELS[activeLevelIdx] || CAMPAIGN_LEVELS[0];
  const vehicleCalc = (() => {
    const items = [...selectedItems].map((k) => CRATES.find((c) => c.k === k)).filter(Boolean) as SupplyCrate[];
    const motor = CRATES.find((c) => c.k === selectedMotor) ?? null;
    const mass = 20 + items.reduce((a, x) => a + (x.m || 0), 0);
    const cost = items.reduce((a, x) => a + x.c, 0) + (motor ? motor.c : 0);
    const baseAlt = motor && motor.imp ? (1.5 * motor.imp) / mass : 0;
    const stageMult = legacyKarmanMode
      ? 1
      : activeMission.lvl === 6
      ? 1.25
      : activeMission.lvl >= 7
      ? 2.1
      : 1;
    return { items, motor, mass, cost, alt: baseAlt * stageMult, stageMult };
  })();

  const inStagingSector =
    currentLoc.id === 'sah' ||
    currentLoc.id === 'srl' ||
    currentLoc.id === 'lcc' ||
    selectedItems.size > 0 ||
    selectedMotor !== null;
  const trainingActive = !playerState.trainingCompleted && tutStep > 0;
  const anyLabOpen =
    satLabOpen ||
    rocketLabOpen ||
    orbitLabOpen ||
    shakeFreezeLabOpen ||
    lunarFlybyLabOpen ||
    europaLabOpen ||
    lunarWaterLabOpen ||
    astronautRescueLabOpen;
  const showToast = toastMsg.text && performance.now() < toastMsg.until;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020612] text-[#e8eefc]">
      {/* 3D WebGL Facility Canvas */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full z-0" />

      {/* Top Aerospace Command Bar */}
      {started && (
        <header className="fixed top-2.5 left-3 right-3 z-30 h-12 px-3.5 rounded-xl bg-[#071124]/92 border border-cyan-400/25 shadow-[0_10px_28px_rgba(0,0,0,0.65)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-extrabold text-xs sm:text-sm tracking-wider text-[#4fe3d4] truncate">
              SPACEVERSE <span className="text-slate-500 hidden sm:inline">//</span>{' '}
              <span className="text-slate-200 hidden sm:inline">GALAXY-X</span>
            </span>

            <button
              onClick={() => {
                SFX.click();
                setShowCampaignModal(true);
              }}
              className={`ml-1 sm:ml-3 px-2.5 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/28 border text-[#4fe3d4] text-[11px] font-bold transition cursor-pointer shrink-0 ${
                tutStep === 8 && !playerState.trainingCompleted
                  ? 'border-2 border-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
                  : 'border-cyan-400/45'
              }`}
            >
              🚀 Missions
            </button>

            <button
              onClick={() => {
                SFX.click();
                startCadetTraining();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/12 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 text-[11px] font-bold transition cursor-pointer hidden md:inline-flex items-center gap-1 shrink-0"
            >
              🎓 Cadet Training
            </button>

            <button
              onClick={() => {
                SFX.click();
                if (mapExpanded) closeMap();
                else openMap();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/15 text-slate-200 text-[11px] font-bold transition cursor-pointer hidden lg:inline-flex items-center gap-1 shrink-0"
            >
              🗺 Map
            </button>

            <button
              type="button"
              onClick={() => {
                SFX.click();
                openHandbookFromHub();
              }}
              className={`px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/28 border text-amber-200 text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                tutStep === 7 && !playerState.trainingCompleted
                  ? 'border-2 border-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
                  : 'border-amber-400/45'
              }`}
            >
              📖 Handbook
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Clickable Currency Readout (Task 6 target) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  if (!playerState.trainingCompleted && tutStep === 6) {
                    completeTutTask(6);
                  } else {
                    setShowProfileModal(true);
                  }
                }}
                title="Grant Credits & Star Credits"
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0b1933] border text-xs font-mono-tech font-bold transition-all duration-300 cursor-pointer ${
                  hudFlash === 'star'
                    ? 'border-rose-400 bg-rose-950/50 shadow-[0_0_18px_rgba(244,63,94,0.45)] scale-[0.98]'
                    : hudFlash === 'grant'
                    ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_18px_rgba(251,191,36,0.4)] scale-[0.98]'
                    : tutStep === 6 && !playerState.trainingCompleted
                    ? 'border-2 border-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
                    : 'border-cyan-400/30 hover:border-cyan-400/60'
                }`}
              >
                <span className="text-[#4fe3d4] tabular-nums">₡ {displayGrant.toLocaleString()}</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-300 tabular-nums">★ {displayStar.toLocaleString()}</span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-emerald-300 tabular-nums hidden sm:inline">⚡ {(playerState.xp ?? 0).toLocaleString()} XP</span>
              </button>

              <AnimatePresence>
                {hudBursts.map((burst, idx) => (
                  <motion.div
                    key={burst.id}
                    initial={{ opacity: 0, y: 0, scale: 0.85 }}
                    animate={{ opacity: 1, y: 26 + idx * 24, scale: 1.06 }}
                    exit={{ opacity: 0, y: 48 + idx * 24, scale: 0.9 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                    className={`pointer-events-none absolute right-0 top-1/2 z-50 px-2.5 py-1 rounded-lg border text-[11px] font-mono-tech font-extrabold shadow-xl whitespace-nowrap ${
                      burst.tone === 'star'
                        ? 'bg-rose-950/95 border-rose-400/75 text-rose-200 shadow-[0_6px_18px_rgba(244,63,94,0.4)]'
                        : 'bg-amber-950/95 border-amber-400/75 text-amber-200 shadow-[0_6px_18px_rgba(251,191,36,0.35)]'
                    }`}
                  >
                    {burst.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {playerState.propulsionUpgradeUnlocked && (
              <button
                type="button"
                onClick={() => {
                  SFX.select();
                  setShowProfileModal(true);
                }}
                title="Propulsion Upgrade Unlocked — View Explorer Dossier"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-[11px] font-bold transition cursor-pointer hidden xl:inline-flex items-center gap-1"
              >
                <span>⚡</span>
                <span>Propulsion Upgrade</span>
              </button>
            )}

            <button
              onClick={() => {
                SFX.click();
                setShowProfileModal(true);
              }}
              title="Open Player Profile Dashboard & Account Management"
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/15 text-slate-200 text-[11px] font-bold transition cursor-pointer hidden sm:inline-flex items-center gap-1"
            >
              <span>👤</span>
              <span className="max-w-[96px] truncate">
                {playerState.username || playerState.callsign || 'Profile'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                SFX.click();
                setStoreInitialTab('level_7');
                setStoreReturnContext(null);
                setStoreOpen(true);
              }}
              title="Open GALAXY-X Gear Store"
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold transition-all duration-300 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                storeBadgePulse
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100 scale-105 shadow-[0_0_20px_rgba(52,211,153,0.55)]'
                  : 'bg-amber-400/18 hover:bg-amber-400/30 border-amber-400/55 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
              }`}
            >
              <span>🛒 Store</span>
              <span className="px-1.5 py-0.5 rounded bg-[#061126] text-[10px] font-mono-tech text-[#4fe3d4] tabular-nums">
                {(playerState.unlockedStoreItems ?? []).length}/{STORE_ITEMS.length}
              </span>
            </button>

            <button
              onClick={() => {
                const next = SFX.toggleMute();
                setMuted(next);
              }}
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition cursor-pointer ${
                muted
                  ? 'bg-red-500/15 border-red-400/40 text-red-300'
                  : 'bg-[#0b1933] border-cyan-400/30 text-[#4fe3d4]'
              }`}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </header>
      )}

      {/* Persistent Top-Right Store Button when Labs/Modals Cover Main Header */}
      {started &&
        !storeOpen &&
        (anyLabOpen ||
          showCampaignModal ||
          showProfileModal ||
          mapExpanded ||
          briefingModalLevel !== null ||
          showBadgeModal ||
          showTrainingIntro ||
          showTrainingComplete ||
          completedTaskModal !== null ||
          showSubsystemExplorer) && (
          <div className="fixed top-[60px] right-3 z-[5700]">
            <button
              type="button"
              onClick={() => {
                SFX.click();
                setStoreInitialTab('level_7');
                setStoreReturnContext(null);
                setStoreOpen(true);
              }}
              title="Open GALAXY-X Gear Store"
              className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold shadow-[0_8px_24px_rgba(0,0,0,0.75)] flex items-center gap-2 transition-all duration-300 cursor-pointer ${
                hudFlash === 'star'
                  ? 'bg-rose-950/95 border-rose-400 text-rose-100 scale-95'
                  : storeBadgePulse
                  ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100 scale-105'
                  : 'bg-[#07142b]/95 hover:bg-[#0d2144] border-amber-400/60 text-amber-200'
              }`}
            >
              <span>🛒 Store</span>
              <span className="px-1.5 py-0.5 rounded bg-[#050c1c] border border-amber-400/35 text-[10px] font-mono-tech text-amber-300 tabular-nums">
                ★ {displayStar.toLocaleString()}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] font-mono-tech text-emerald-300 tabular-nums">
                {(playerState.unlockedStoreItems ?? []).length}/{STORE_ITEMS.length}
              </span>
            </button>
            <AnimatePresence>
              {hudBursts
                .filter((b) => b.tone === 'star')
                .map((burst, idx) => (
                  <motion.div
                    key={burst.id}
                    initial={{ opacity: 0, y: 0, scale: 0.85 }}
                    animate={{ opacity: 1, y: 24 + idx * 24, scale: 1.05 }}
                    exit={{ opacity: 0, y: 44 + idx * 24, scale: 0.9 }}
                    transition={{ duration: 0.75, ease: 'easeOut' }}
                    className="pointer-events-none absolute right-0 top-1/2 px-2.5 py-1 rounded-lg bg-rose-950/95 border border-rose-400/75 text-rose-200 text-[11px] font-mono-tech font-extrabold shadow-xl whitespace-nowrap"
                  >
                    {burst.text}
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}

      {/* Facility Radar Minimap + Expanded Map Modal */}
      {started && (
        <FacilityMap
          playerPosRef={playerPosRef}
          playerYawRef={lookRef}
          missionTargetRef={missionTargetRef}
          currentLoc={currentLoc}
          mapExpanded={mapExpanded}
          tutStep={tutStep}
          trainingCompleted={playerState.trainingCompleted}
          onOpenMap={openMap}
          onCloseMap={closeMap}
          onNavigateToLocation={navigateToLocation}
          onTeleportPoint={teleportPoint}
        />
      )}

      {/* Always-Accessible Spacecraft Engineer's Handbook Docked Directly Below Minimap */}
      {started && !anyLabOpen && (
        <button
          type="button"
          onClick={() => {
            SFX.click();
            openHandbookFromHub();
          }}
          title="Open Spacecraft Engineer's Handbook"
          className={`fixed top-[236px] right-3 z-20 w-[196px] rounded-xl bg-[#07152e]/92 hover:bg-[#0d2248] backdrop-blur-md border px-3 py-2 text-left transition hover:scale-[1.02] cursor-pointer shadow-[0_10px_28px_rgba(0,0,0,0.65)] flex items-center justify-between gap-2 ${
            tutStep === 7 && !playerState.trainingCompleted
              ? 'border-2 border-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
              : 'border-amber-400/55 hover:border-amber-300'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">📖</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-display font-extrabold text-amber-200 truncate">
                HANDBOOK
              </span>
              <span className="block text-[9px] font-mono-tech text-[#4fe3d4] truncate">
                ENGINEER&apos;S GUIDE
              </span>
            </span>
          </span>
          <span className="text-[10px] font-mono-tech font-bold text-amber-300 shrink-0">
            OPEN ▶
          </span>
        </button>
      )}

      {/* Cadet Training Progress HUD (Top-Center during training) */}
      {started && trainingActive && (
        <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 w-[min(460px,92vw)] rounded-xl bg-[#071124]/95 border border-cyan-400/50 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-mono-tech text-[11px] font-bold uppercase tracking-wider text-[#4fe3d4]">
              FLIGHT ACADEMY // TRAINING {tutStep - 1}/8
            </span>
            <button
              onClick={() => {
                SFX.click();
                skipTutorial();
              }}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-300 cursor-pointer"
            >
              Skip ✕
            </button>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/10 mb-2">
            <div
              className="h-full bg-gradient-to-r from-[#4fe3d4] to-[#34d399] transition-all duration-300"
              style={{ width: `${((tutStep - 1) / 8) * 100}%` }}
            />
          </div>
          <div className="text-xs font-bold text-white leading-snug">
            {TUT_TASK_META[tutStep]?.instr}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{TUT_TASK_META[tutStep]?.hint}</div>
        </div>
      )}

      {/* Left Mission Directive HUD (Compact Graphic Room Guidance) */}
      {started && !trainingActive && (
        <aside className="fixed top-[68px] left-3 z-20 w-[min(320px,calc(100vw-24px))] rounded-xl bg-[#071124]/92 border border-cyan-400/25 shadow-[0_10px_28px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="px-3.5 py-2 bg-[#0b1830] border-b border-cyan-400/20 flex items-center justify-between gap-2 text-[11px] font-mono-tech">
            <span className="font-bold text-[#4fe3d4] tracking-wider">MISSION OBJECTIVE</span>
            <div className="flex items-center gap-2">
              <DirectorVanceVoiceBanner
                compact
                quote={activeMission.goal}
                autoPlayKey={
                  started && !trainingActive && (!activeMission.isLab || legacyKarmanMode)
                    ? `hud-lvl-${activeMission.lvl}`
                    : null
                }
              />
              <span className="font-bold text-amber-300">
                LEVEL {String(activeMission.lvl).padStart(2, '0')}
              </span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{activeMission.icon}</span>
              <span className="truncate">{activeMission.title}</span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#050d1d] border border-cyan-400/25 text-[10px]">
              <span className="text-slate-400 uppercase font-mono-tech">
                {missionPhase === 0 ? 'Target Room' : 'Active Room'}
              </span>
              <span className="font-bold text-amber-300 truncate">
                📍 {legacyKarmanMode ? 'SRL → SAH → Launch Pad (125 km)' : activeMission.briefingStationName}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mt-2 leading-snug">
              {legacyKarmanMode
                ? [
                    '',
                    'Legacy Kármán Flight: SRL Barometer + Camera → SAH motor → Stage at Launch Pad.',
                    'Go to LCC console & press E to ignite 125 km Kármán launch!',
                    'Return to MCC console & press E to debrief.',
                  ][missionPhase] || 'SRL sensors → SAH motor → Stage at Launch Pad.'
                : missionPhase === 0
                ? `Travel to ${activeMission.briefingStationId.toUpperCase()} room & press E.`
                : activeMission.labMode === 'rocket'
                ? 'Press E at LCC console or click below to enter Rocket Launch Lab.'
                : activeMission.labMode === 'orbit'
                ? 'Press E at GSC dish or click below to launch Orbit & Power Sim.'
                : activeMission.labMode === 'shake_freeze'
                ? 'Press E at MPR Holo-Table or click below to enter Shake & Freeze Lab.'
                : activeMission.labMode === 'lunar_flyby'
                ? 'Press E at PNL workbench or click below to enter Propulsion & Navigation Lab.'
                : activeMission.labMode === 'europa_probe'
                ? 'Press E at GSC dish or click below to enter Europa Probe Lab.'
                : activeMission.labMode === 'lunar_water'
                ? 'Press E at MPR or click below to open Level 07 Lunar Water Hunt.'
                : activeMission.labMode === 'astronaut_rescue'
                ? 'Press E at MCC or click below to launch Level 08 Astronaut Rescue.'
                : activeMission.labMode === 'satellite'
                ? 'Press E at SAH or click below to enter Satellite Assembly Lab.'
                : [
                    '',
                    'SRL sensors → SAH motor → Stage at Launch Pad.',
                    'Go to LCC console & press E to ignite launch!',
                    'Return to MCC console & press E to complete level.',
                  ][missionPhase]}
            </p>

            {activeMission.isLab && !legacyKarmanMode && missionPhase >= 1 && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  if (activeMission.labMode === 'rocket') setRocketLabOpen(true);
                  else if (activeMission.labMode === 'orbit') setOrbitLabOpen(true);
                  else if (activeMission.labMode === 'shake_freeze') setShakeFreezeLabOpen(true);
                  else if (activeMission.labMode === 'lunar_flyby') enterPropulsionLab();
                  else if (activeMission.labMode === 'europa_probe') setEuropaLabOpen(true);
                  else if (activeMission.labMode === 'lunar_water') setLunarWaterLabOpen(true);
                  else if (activeMission.labMode === 'astronaut_rescue') setAstronautRescueLabOpen(true);
                  else setSatLabOpen(true);
                }}
                className="mt-2.5 w-full py-2 rounded-lg bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
              >
                {activeMission.labMode === 'rocket'
                  ? 'Open Rocket Launch Lab ▶'
                  : activeMission.labMode === 'orbit'
                  ? 'Open Orbit Power Sim ▶'
                  : activeMission.labMode === 'shake_freeze'
                  ? 'Open Shake & Freeze Lab ▶'
                  : activeMission.labMode === 'lunar_flyby'
                  ? 'Enter Propulsion & Navigation Lab ▶'
                  : activeMission.labMode === 'europa_probe'
                  ? 'Open Level 06 Europa Probe ▶'
                  : activeMission.labMode === 'lunar_water'
                  ? 'Open Level 07 Lunar Water ▶'
                  : activeMission.labMode === 'astronaut_rescue'
                  ? 'Open Level 08 Astronaut Rescue ▶'
                  : 'Open Satellite Lab ▶'}
              </button>
            )}

            {(!activeMission.isLab || legacyKarmanMode) && (
              <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-slate-400 text-[10px]">Target</div>
                  <strong className="text-white font-mono-tech">{activeMission.t} km</strong>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Budget</div>
                  <strong className="text-[#4fe3d4] font-mono-tech">{activeMission.b}M</strong>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Sensors</div>
                  <strong className="text-amber-300 truncate block">
                    {activeMission.req.map(crateDisplayName).join(', ')}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Right Rocket Manifest Card (Positioned cleanly below Handbook button, never overlaps) */}
      {started && !trainingActive && inStagingSector && (!activeMission.isLab || legacyKarmanMode) && (() => {
        const budgetCeiling = activeMission.b;
        return (
          <aside className="fixed top-[298px] right-3 z-20 w-[212px] rounded-xl bg-[#071124]/92 border border-cyan-400/25 p-3 shadow-[0_10px_28px_rgba(0,0,0,0.6)] text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
              <span className="font-bold text-white">🚀 Rocket Manifest</span>
              <span
                className={`text-[10px] font-mono-tech font-bold ${
                  vehicleCalc.cost > budgetCeiling ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {vehicleCalc.cost > budgetCeiling ? 'OVER' : 'NOMINAL'}
              </span>
            </div>
            <div className="space-y-1 text-[11px] font-mono-tech">
              <div className="flex justify-between text-slate-300">
                <span>Dry Mass:</span>
                <b className="text-white tabular-nums">{vehicleCalc.mass} kg</b>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Cost:</span>
                <b
                  className={`tabular-nums ${
                    vehicleCalc.cost > budgetCeiling ? 'text-red-400' : 'text-[#4fe3d4]'
                  }`}
                >
                  {vehicleCalc.cost}M / {budgetCeiling}M
                </b>
              </div>
              {!legacyKarmanMode && vehicleCalc.stageMult > 1 && (
                <div className="flex justify-between text-slate-300">
                  <span>Stage Boost:</span>
                  <b className="text-amber-300 tabular-nums">x{vehicleCalc.stageMult.toFixed(2)}</b>
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span>Apogee:</span>
                <b className="text-white tabular-nums">
                  {vehicleCalc.motor ? `${vehicleCalc.alt.toFixed(0)} km` : 'No Motor'}
                </b>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Score:</span>
                <b className="text-amber-300 tabular-nums">{flightScore} pts</b>
              </div>
            </div>
          </aside>
        );
      })()}

      {/* Center Status Toast */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-25 px-4 py-2 rounded-xl bg-[#061124]/95 border border-cyan-400/45 text-xs sm:text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.75)] text-center max-w-[90vw]">
          {toastMsg.text}
        </div>
      )}

      {/* Proximity Action Prompt [E] */}
      {started && promptText && !anyLabOpen && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-25 px-4 py-2 rounded-xl bg-amber-400/18 border border-[#f2c14e] text-amber-200 text-xs sm:text-sm font-extrabold tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
          {promptText}
        </div>
      )}

      {/* Bottom Controls Hint + Action, View Height & Fullscreen Buttons */}
      {started && !anyLabOpen && (
        <>
          <div className="fixed bottom-3 left-3 z-20 hidden sm:block px-3 py-1.5 rounded-lg bg-[#071022]/85 border border-white/10 text-[11px] text-slate-400">
            WASD Move • Drag Look • Click 3D Objects or press <kbd className="text-[#4fe3d4]">E</kbd> • Map{' '}
            <kbd className="text-[#4fe3d4]">M</kbd>
          </div>

          <div className="fixed bottom-3 right-3 z-20 flex items-center gap-2">
            <button
              onClick={() => {
                if (started && !isFlying && currentInteractRef.current) {
                  SFX.click();
                  currentInteractRef.current.act();
                }
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                promptText
                  ? 'bg-[#4fe3d4] text-[#041022] border-[#4fe3d4]'
                  : 'bg-[#071124]/85 text-slate-400 border-white/15 opacity-50'
              }`}
            >
              Interact [E]
            </button>
            <button
              onClick={() => {
                SFX.click();
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                else document.documentElement.requestFullscreen?.().catch(() => {});
              }}
              className="px-3 py-2 rounded-xl bg-[#071124]/85 border border-white/15 hover:border-cyan-400/45 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              ⛶
            </button>
          </div>
        </>
      )}

      {/* Touch Virtual Joystick */}
      <div
        ref={joyWrapRef}
        className="fixed hidden z-20 w-[90px] h-[90px] rounded-full border-2 border-cyan-400/45 bg-cyan-400/10 pointer-events-none"
      >
        <div
          ref={joyDotRef}
          className="w-8 h-8 rounded-full bg-[#4fe3d4]/80 absolute top-1/2 left-1/2 -mt-4 -ml-4"
        />
      </div>

      {/* ONBOARDING & CAMPAIGN MODALS */}
      <IntroSplash visible={showSplash} />

      <AuthGateModal
        showSplash={showSplash}
        showWelcome={showWelcome}
        authUser={authUser}
        authLoading={authLoading}
        profileLoading={profileLoading}
        enteredFacility={enteredFacility}
        playerState={playerState}
        initialMode={authViewMode}
        onBeginRegistration={(uid) => {
          registeringUidRef.current = uid;
        }}
        onRegistrationComplete={(profile) => {
          registeringUidRef.current = null;
          activeUidRef.current = profile.uid || profile.userId;
          applyRestoredProfileToSession(profile);
        }}
        onRegistrationAbort={() => {
          registeringUidRef.current = null;
        }}
        onContinueGame={() => {
          syncCrateColors();
          if (!playerStateRef.current.joined) {
            setShowWelcome(true);
          } else {
            setEnteredFacility(true);
            setStarted(true);
            say(
              `Welcome back, ${playerStateRef.current.username || playerStateRef.current.callsign}! Progress restored (Level ${playerStateRef.current.currentCampaignLevel}).`,
              4200
            );
          }
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        onLogout={handleLogout}
      />

      <WelcomeOverlay
        visible={showWelcome && Boolean(authUser)}
        onAccept={async () => {
          syncCrateColors();
          setShowWelcome(false);
          setEnteredFacility(true);
          setStarted(true);
          const wasJoined = playerStateRef.current.joined;
          try {
            const res = await authFetch('/api/player/recruit', {
              method: 'POST',
              body: JSON.stringify({
                callsign: playerStateRef.current.username || playerStateRef.current.callsign,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.player) {
                applyServerPlayer(data.player, true);
                if (!data.alreadyAwarded || !wasJoined) {
                  SFX.badgeUnlock();
                  setShowBadgeModal(true);
                } else if (!data.player.trainingCompleted) {
                  setShowTrainingIntro(true);
                } else {
                  say(`Welcome back to GALAXY-X, ${data.player.username || data.player.callsign}!`, 3800);
                }
                return;
              }
            }
          } catch {
            // Firestore fallback below
          }

          if (!wasJoined) {
            updatePlayer(
              (p) => ({
                ...p,
                joined: true,
                grantCredits: Math.max(p.grantCredits, 500),
                starCredits: Math.max(p.starCredits, 500),
                badges: p.badges.includes('NEW_RECRUIT') ? p.badges : [...p.badges, 'NEW_RECRUIT'],
              }),
              'immediate'
            );
            SFX.badgeUnlock();
            setShowBadgeModal(true);
          } else if (!playerStateRef.current.trainingCompleted) {
            setShowTrainingIntro(true);
          } else {
            say('Welcome back to GALAXY-X Research Facility, Explorer!', 3800);
          }
        }}
      />

      <RecruitBadgeModal
        visible={showBadgeModal}
        onClaim={() => {
          setShowBadgeModal(false);
          if (!playerState.trainingCompleted) setShowTrainingIntro(true);
          else setShowCampaignModal(true);
        }}
      />

      <TrainingIntroModal
        visible={showTrainingIntro}
        onBegin={() => {
          setShowTrainingIntro(false);
          startCadetTraining();
        }}
        onSkip={skipTutorial}
      />

      <TutorialTaskModal
        taskNum={completedTaskModal}
        onContinue={() => {
          const doneNum = completedTaskModal;
          setCompletedTaskModal(null);
          if (doneNum && doneNum < 6) {
            const next = doneNum + 1;
            setTutStep(next);
            updateBeaconForStep(next, false);
          } else if (doneNum === 6) {
            setTutStep(7);
            updateBeaconForStep(7, false);
            say('Task 7: Open the glowing 📖 Handbook button to examine & practice navigating the Handbook!', 5000);
          }
        }}
      />

      <SubsystemExplorerModal
        visible={showSubsystemExplorer}
        onClose={!playerState.trainingCompleted && tutStep === 3 ? undefined : () => setShowSubsystemExplorer(false)}
        onComplete={() => {
          setShowSubsystemExplorer(false);
          if (!playerState.trainingCompleted && tutStep === 3) {
            setTutStep(4);
            updateBeaconForStep(4, false);
          }
        }}
      />

      <TrainingCompleteModal
        visible={showTrainingComplete}
        onViewCampaign={() => {
          setShowTrainingComplete(false);
          setShowCampaignModal(true);
        }}
      />

      <CampaignDirectoryModal
        visible={showCampaignModal}
        playerState={playerState}
        activeLevelIdx={activeLevelIdx}
        tutStep={tutStep}
        cadetGuideActive={!playerState.trainingCompleted && tutStep === 8}
        onCompleteCadetGuide={() => {
          setShowCampaignModal(false);
          finishAllTraining();
        }}
        onClose={() => setShowCampaignModal(false)}
        onStartTraining={startCadetTraining}
        onSelectLevel={handleSelectCampaignLevel}
        onPlayLegacyKarman={handlePlayLegacyKarman}
      />

      <ExplorerDossierModal
        visible={showProfileModal}
        playerState={playerState}
        onClose={() => setShowProfileModal(false)}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
        onForgotPassword={handleForgotPasswordForProfile}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* STATION MISSION BRIEFING MODAL (Press E at Station) */}
      <MissionBriefingModal
        level={briefingModalLevel}
        onClose={() => setBriefingModalLevel(null)}
        onAccept={() => {
          const lvl = briefingModalLevel;
          setBriefingModalLevel(null);
          if (!lvl) return;
          simRef.current.phase = 1;
          setMissionPhase(1);
          if (lvl.labMode === 'satellite') {
            setSatLabOpen(true);
          } else if (lvl.labMode === 'rocket') {
            setRocketLabOpen(true);
          } else if (lvl.labMode === 'orbit') {
            setOrbitLabOpen(true);
          } else if (lvl.labMode === 'shake_freeze') {
            setShakeFreezeLabOpen(true);
          } else if (lvl.labMode === 'lunar_flyby') {
            enterPropulsionLab();
          } else if (lvl.labMode === 'europa_probe') {
            setEuropaLabOpen(true);
          } else if (lvl.labMode === 'lunar_water') {
            setLunarWaterLabOpen(true);
          } else if (lvl.labMode === 'astronaut_rescue') {
            setAstronautRescueLabOpen(true);
          } else {
            say(
              `Level 0${lvl.lvl} cleared! SRL sensors → SAH motor → Launch Pad.`,
              5200
            );
          }
        }}
      />

      {/* LEVEL 1: SATELLITE ASSEMBLY LAB (SAH) */}
      <SatelliteAssemblyLab
        visible={satLabOpen}
        starCredits={playerState.starCredits}
        alreadyCompleted={playerState.completedLevels.includes(1)}
        initialProgress={playerState.level1Progress}
        onSaveProgress={handleSaveLevel1Progress}
        onReplayReset={handleReplayResetLevel1}
        onCompleteMission={handleCompleteLevel1}
        onContinueToLevel2={() => {
          routeToFacilityLevel(1, 'Level 1 Complete! Choose your next level on the Level Map.');
          setShowCampaignModal(true);
        }}
        onBackToAcademy={() => {
          setSatLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setSatLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(1)}
      />

      {/* LEVEL 2: ROCKET ASSEMBLY & ORBITAL LAUNCH LAB (LCC) */}
      <RocketLaunchLab
        visible={rocketLabOpen}
        starCredits={playerState.starCredits}
        alreadyCompleted={playerState.completedLevels.includes(2)}
        initialProgress={playerState.level2Progress}
        onSaveProgress={handleSaveLevel2Progress}
        onReplayReset={handleReplayResetLevel2}
        onCompleteMission={handleCompleteLevel2}
        onContinueToLevel3={() => {
          routeToFacilityLevel(2, 'Level 2 Complete! Choose your next level on the Level Map.');
          setShowCampaignModal(true);
        }}
        onBackToAcademy={() => {
          setRocketLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setRocketLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(2)}
      />

      {/* LEVEL 3: ORBIT AND POWER MANAGEMENT SIMULATION (GSC) */}
      <OrbitPowerLab
        visible={orbitLabOpen}
        starCredits={playerState.starCredits}
        alreadyCompleted={playerState.completedLevels.includes(3)}
        onCompleteMission={handleCompleteLevel3}
        onContinueToLevel4={() => {
          routeToFacilityLevel(3, 'Level 3 Complete! Choose your next level on the Level Map.');
          setShowCampaignModal(true);
        }}
        onBackToAcademy={() => {
          setOrbitLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setOrbitLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(3)}
      />

      {/* LEVEL 4: THE SHAKE & FREEZE TEST (MPR) */}
      <ShakeFreezeLab
        visible={shakeFreezeLabOpen}
        starCredits={playerState.starCredits}
        xp={playerState.xp ?? 0}
        alreadyCompleted={playerState.completedLevels.includes(4)}
        initialProgress={playerState.level4Progress}
        onSaveProgress={handleSaveLevel4Progress}
        onReplayReset={handleReplayResetLevel4}
        onCompleteMission={handleCompleteLevel4}
        onContinueToLevel5={() => {
          routeToFacilityLevel(4, 'Level 4 Complete! Choose your next level on the Level Map.');
          setShowCampaignModal(true);
        }}
        onBackToAcademy={() => {
          setShakeFreezeLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setShakeFreezeLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(4)}
      />

      {/* PROPULSION & NAVIGATION LAB CAMERA ENTRY TRANSITION */}
      {pnlTransitionActive && (
        <div className="fixed inset-0 z-[5400] pointer-events-none flex items-center justify-center bg-gradient-to-b from-cyan-950/30 via-transparent to-[#030a18]/75 animate-pulse">
          <div className="px-6 py-4 rounded-2xl bg-[#040d21]/90 border border-cyan-400/60 text-center shadow-[0_0_40px_rgba(34,211,238,0.35)]">
            <div className="text-[10px] font-mono-tech uppercase tracking-[3px] text-cyan-300">
              SPACE CENTER BASE // SECTOR PNL
            </div>
            <div className="font-display text-base sm:text-lg font-extrabold text-white mt-1">
              ENTERING PROPULSION &amp; NAVIGATION LAB...
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 5: LUNAR FLYBY – FUEL MATH (PROPULSION & NAVIGATION LAB) */}
      <LunarFlybyLab
        visible={lunarFlybyLabOpen}
        starCredits={playerState.starCredits}
        alreadyCompleted={playerState.completedLevels.includes(5)}
        propulsionUpgradeUnlocked={Boolean(playerState.propulsionUpgradeUnlocked)}
        onCompleteMission={handleCompleteLevel5}
        onContinueToLevel6={() => {
          routeToFacilityLevel(5, 'Level 5 Complete! Hard Mode Levels 6–8 Unlocked on the Level Map!');
          setShowCampaignModal(true);
        }}
        onBackToAcademy={() => {
          setLunarFlybyLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setLunarFlybyLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(5)}
      />

      {/* LEVEL 6: THERMOMETER TELEMETRY PROBE (EUROPA INTERACTIVE DISCOVERY) */}
      <EuropaProbeLab
        visible={europaLabOpen}
        starCredits={playerState.starCredits}
        xp={playerState.xp ?? 0}
        alreadyCompleted={playerState.completedLevels.includes(6)}
        initialProgress={playerState.level6Progress}
        onSaveProgress={handleSaveLevel6Progress}
        onReplayReset={handleReplayResetLevel6}
        onCompleteMission={handleCompleteLevel6}
        onContinueToLevel7={() => {
          routeToFacilityLevel(
            6,
            'Level 6 Complete! Level 7 Unlocked — Go to Mission Planning Room (MPR) and press E!'
          );
          setShowCampaignModal(true);
        }}
        onBackToLevelMap={() => {
          setEuropaLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setEuropaLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(6)}
      />

      {/* LEVEL 7: LUNAR WATER HUNT (INTERACTIVE DISCOVERY MODE) */}
      <LunarWaterLab
        visible={lunarWaterLabOpen}
        starCredits={playerState.starCredits}
        xp={playerState.xp ?? 0}
        alreadyCompleted={playerState.completedLevels.includes(7)}
        unlockedStoreItems={playerState.unlockedStoreItems}
        initialProgress={playerState.level7Progress}
        onOpenStoreForLunar={() => {
          setStoreInitialTab('level_7');
          setStoreReturnContext({
            levelNum: 7,
            levelTitle: 'Lunar Water Hunt',
          });
          setStoreOpen(true);
        }}
        onSaveProgress={handleSaveLevel7Progress}
        onReplayReset={handleReplayResetLevel7}
        onCompleteMission={handleCompleteLevel7}
        onContinueToLevel8={() => {
          routeToFacilityLevel(
            7,
            'Level 7 Complete! Level 8 Unlocked — Go to Mission Control Center (MCC) and press E!'
          );
          setShowCampaignModal(true);
        }}
        onBackToLevelMap={() => {
          setLunarWaterLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setLunarWaterLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(7)}
      />

      {/* LEVEL 8: RESCUE THE LOST ASTRONAUT (MCC) */}
      <AstronautRescueLab
        visible={astronautRescueLabOpen}
        starCredits={playerState.starCredits}
        alreadyCompleted={playerState.completedLevels.includes(8)}
        initialProgress={playerState.level8Progress}
        onSaveProgress={handleSaveLevel8Progress}
        onReplayReset={handleReplayResetLevel8}
        onCompleteMission={handleCompleteLevel8}
        onBackToLevelMap={() => {
          setAstronautRescueLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setAstronautRescueLabOpen(false)}
        onOpenHandbook={() => openHandbookForLevel(8)}
      />

      {/* GALAXY-X REQUISITION STORE (Level 7 Unlockable Gear) */}
      <GalaxyStoreModal
        visible={storeOpen}
        playerState={playerState}
        initialTab={storeInitialTab}
        returnContext={storeReturnContext}
        onContinueToLevel={(levelNum) => {
          setStoreOpen(false);
          setStoreReturnContext(null);
          if (levelNum === 7) {
            setLunarWaterLabOpen(true);
          }
        }}
        onClose={() => {
          setStoreOpen(false);
          setStoreReturnContext(null);
        }}
        onPurchaseItem={handlePurchaseStoreItem}
      />

      {/* INTERACTIVE SPACECRAFT ENGINEER'S HANDBOOK */}
      <SpacecraftHandbookModal
        visible={handbookOpen}
        playingLevel={handbookPlayingLevel}
        initialLevel={handbookInitialLevel}
        completedLevels={playerState.completedLevels}
        cadetGuideActive={!playerState.trainingCompleted && tutStep === 7}
        onCompleteCadetGuide={() => {
          setHandbookOpen(false);
          SFX.taskComplete();
          setTutStep(8);
          updateBeaconForStep(8, false);
          say('Task 8: Click the glowing 🚀 Missions button to open and jump to any level!', 5000);
        }}
        onGoToLevel={(levelNum) => {
          setHandbookOpen(false);
          if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 7) {
            setTutStep(0);
            updateBeaconForStep(0, true);
            updatePlayer((p) => ({ ...p, trainingCompleted: true }));
          }
          handleSelectCampaignLevel(levelNum - 1);
        }}
        onClose={() => setHandbookOpen(false)}
      />
    </div>
  );
}
