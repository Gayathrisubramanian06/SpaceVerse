import React, { useEffect, useState } from 'react';
import {
  CAMPAIGN_LEVELS,
  CampaignLevel,
  PlayerState,
  STORE_ITEMS,
  WELCOME_MESSAGES,
} from '../data/spaceverseData';
import { KeyRound, LogOut, ShieldAlert, Trash2 } from 'lucide-react';
import { storyTransitions } from '../data/storyTransitions';
import { SFX } from '../utils/sfx';
import {
  LunarWaterExplorerBadgeSVG,
  OrbitPowerEngineerBadgeSVG,
  PropulsionEngineerBadgeSVG,
  RecruitBadgeSVG,
  RocketCommanderBadgeSVG,
  SatelliteBuilderBadgeSVG,
  SpaceRescueHeroBadgeSVG,
  StoryChapterVisualSVG,
  ThermalProtectionEngineerBadgeSVG,
  ThermalTelemetrySpecialistBadgeSVG,
} from './BadgesSVG';
import { SpaceCampaignMap } from './SpaceCampaignMap';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

/* ========================================================
   1. SPACEVERSE INTRO SPLASH (2.6s)
   ======================================================== */
export const IntroSplash: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-[#020612] flex flex-col items-center justify-center p-6">
      <div className="text-[11px] font-mono-tech uppercase tracking-[4px] text-[#4fe3d4]/80 mb-3">
        GALAXY-X AEROSPACE COMPLEX // INITIALIZING
      </div>
      <h1 className="font-display text-4xl sm:text-6xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[#4fe3d4] via-[#e8eefc] to-[#38bdf8] drop-shadow-[0_0_28px_rgba(79,227,212,0.55)] text-center">
        SPACEVERSE
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 tracking-widest uppercase mt-2">
        Space Research &amp; Mission Engineering Facility
      </p>
      <div className="w-64 sm:w-80 h-1.5 rounded-full bg-slate-900 border border-cyan-400/30 mt-7 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#4fe3d4] to-[#38bdf8] animate-[introLoad_2.5s_ease-out_forwards]" />
      </div>
    </div>
  );
};

/* ========================================================
   2. 4-STEP TYPEWRITER WELCOME OVERLAY
   ======================================================== */
interface WelcomeOverlayProps {
  visible: boolean;
  onAccept: () => void;
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ visible, onAccept }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [mainTyped, setMainTyped] = useState('');
  const [subTyped, setSubTyped] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentMsg = WELCOME_MESSAGES[stepIdx] || WELCOME_MESSAGES[0];

  useEffect(() => {
    if (visible) {
      setStepIdx(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setMainTyped('');
    setSubTyped('');
    setIsTyping(true);

    let mainPos = 0;
    let subPos = 0;
    let t1: number | undefined;
    let t2: number | undefined;

    const tickMain = () => {
      if (mainPos < currentMsg.main.length) {
        mainPos += 1;
        setMainTyped(currentMsg.main.slice(0, mainPos));
        t1 = window.setTimeout(tickMain, 20);
      } else {
        tickSub();
      }
    };

    const tickSub = () => {
      if (subPos < currentMsg.sub.length) {
        subPos += 1;
        setSubTyped(currentMsg.sub.slice(0, subPos));
        t2 = window.setTimeout(tickSub, 11);
      } else {
        setIsTyping(false);
      }
    };

    t1 = window.setTimeout(tickMain, 70);
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [visible, stepIdx, currentMsg]);

  if (!visible) return null;

  const isFinal = stepIdx === WELCOME_MESSAGES.length - 1;

  const handleAction = () => {
    SFX.click();
    if (isTyping) {
      setMainTyped(currentMsg.main);
      setSubTyped(currentMsg.sub);
      setIsTyping(false);
      return;
    }
    if (!isFinal) {
      SFX.cancelSpeech();
      setStepIdx((prev) => prev + 1);
    } else {
      SFX.cancelSpeech();
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-[900] bg-gradient-to-b from-[#030816]/85 via-[#030816]/72 to-[#030816]/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-[#071329]/96 border border-cyan-400/45 p-5 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.88)] my-auto animate-[popIn_0.28s_ease-out]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-mono-tech font-bold tracking-widest text-[#4fe3d4] truncate">
              {currentMsg.tag}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/35 text-[10px] font-mono-tech font-bold text-[#4fe3d4] shrink-0">
              {currentMsg.badgeText}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              {WELCOME_MESSAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Story chapter ${i + 1}`}
                  onClick={() => {
                    SFX.select();
                    SFX.cancelSpeech();
                    setStepIdx(i);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i <= stepIdx ? 'w-6 bg-[#4fe3d4]' : 'w-2 bg-slate-700 hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>
            {!isFinal && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  SFX.cancelSpeech();
                  setStepIdx(WELCOME_MESSAGES.length - 1);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-[#4fe3d4] cursor-pointer pl-1"
              >
                Skip ⏭
              </button>
            )}
          </div>
        </div>

        {/* Visual Storytelling Scene */}
        <div className="rounded-2xl bg-[#040c1d] border border-cyan-400/25 p-3 mb-3.5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12)_0%,transparent_70%)] pointer-events-none" />
          <StoryChapterVisualSVG kind={currentMsg.visual} className="w-44 h-24 sm:w-52 sm:h-28 relative z-10" />
        </div>

        {/* Director Vance Animated Voice Briefing */}
        <DirectorVanceVoiceBanner
          speaker={currentMsg.speaker}
          quote={currentMsg.voiceLine}
          autoPlayKey={visible ? `welcome-story-${stepIdx}` : null}
          accentColor={isFinal ? 'amber' : 'cyan'}
        />

        {/* Narrative Headline & Body */}
        <div className="mt-4">
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-white min-h-[30px] leading-snug">
            {mainTyped}
            {mainTyped.length < currentMsg.main.length && (
              <span className="text-[#4fe3d4] animate-[blinkCaret_0.8s_infinite]">▌</span>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 min-h-[42px] leading-relaxed">
            {subTyped}
            {(mainTyped.length === currentMsg.main.length || !isTyping) && (
              <span className="text-[#4fe3d4] animate-[blinkCaret_0.8s_infinite]">▌</span>
            )}
          </p>

          <div className="mt-3 px-3 py-2 rounded-xl bg-[#0b1b38] border border-cyan-400/25 text-[11px] sm:text-xs text-[#4fe3d4] font-semibold">
            💡 {currentMsg.tip}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  SFX.cancelSpeech();
                  setStepIdx((prev) => Math.max(0, prev - 1));
                }}
                className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                ‹ Back
              </button>
            )}
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {isTyping
                ? 'Click Continue to fast-forward'
                : `Chapter ${stepIdx + 1} of ${WELCOME_MESSAGES.length}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className={`px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm tracking-wide transition cursor-pointer shadow-lg ${
              isFinal
                ? 'bg-gradient-to-r from-[#f2c14e] to-[#f59e0b] text-[#051022] hover:brightness-110'
                : 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] hover:brightness-110'
            }`}
          >
            {isFinal ? 'ACCEPT INVITATION ★' : 'CONTINUE ❯'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================
   3. RECRUITMENT BADGE AWARD MODAL (Preserves 500 SC + New Recruit Badge)
   ======================================================== */
export const RecruitBadgeModal: React.FC<{ visible: boolean; onClaim: () => void }> = ({
  visible,
  onClaim,
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-cyan-400/45 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.85)] animate-[popIn_0.35s_ease-out]">
        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4]">
          CREDENTIAL ISSUED
        </div>
        <h2 className="font-display text-xl font-extrabold text-amber-300 mt-1">
          GALAXY-X NEW RECRUIT BADGE
        </h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Commission approved! Starting research grants and Star Credits have been credited to your account.
        </p>

        <div className="my-5 flex justify-center">
          <RecruitBadgeSVG size={164} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/30">
            <div className="text-slate-400 text-[10px] uppercase">Grant Credits</div>
            <div className="font-mono-tech text-base font-extrabold text-[#4fe3d4] mt-0.5 tabular-nums">
              ₡ 500
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-amber-400/30">
            <div className="text-slate-400 text-[10px] uppercase">Star Credits</div>
            <div className="font-mono-tech text-base font-extrabold text-amber-300 mt-0.5 tabular-nums">
              ★ 500 SC
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            SFX.click();
            onClaim();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
        >
          Proceed to Cadet Orientation ❯
        </button>
      </div>
    </div>
  );
};

/* ========================================================
   4. CADET TRAINING INTRO & COMPLETE MODALS
   ======================================================== */
export const TrainingIntroModal: React.FC<{
  visible: boolean;
  onBegin: () => void;
  onSkip: () => void;
}> = ({ visible, onBegin, onSkip }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#07142b] border border-cyan-400/45 p-6 md:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4]">
          FLIGHT ACADEMY BRIEFING
        </div>
        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1">
          CADET PRACTICE INITIATED
        </h2>
        <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
          Master 8 hands-on training stations across GALAXY-X—from 3D hardware labs to the Engineer&apos;s Handbook and Mission Level Launcher.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-xl">🗺️</div>
            <div className="font-bold text-white mt-1">WASD / Map</div>
            <div className="text-[10px] text-slate-400">Move &amp; fast-travel</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-xl">🛰️</div>
            <div className="font-bold text-white mt-1">Hardware Labs</div>
            <div className="text-[10px] text-slate-400">6 3D station tests</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-amber-400/35">
            <div className="text-xl">📖</div>
            <div className="font-bold text-white mt-1">Handbook</div>
            <div className="text-[10px] text-slate-400">Navigate &amp; jump levels</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-emerald-400/35">
            <div className="text-xl">🚀</div>
            <div className="font-bold text-white mt-1">Level Launcher</div>
            <div className="text-[10px] text-slate-400">Open any level 1–8</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              SFX.click();
              onBegin();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
          >
            BEGIN PRACTICE ▶
          </button>
          <button
            onClick={() => {
              SFX.click();
              onSkip();
            }}
            className="px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs tracking-wide uppercase transition cursor-pointer"
          >
            SKIP TUTORIAL ❯
          </button>
        </div>
      </div>
    </div>
  );
};

export const TrainingCompleteModal: React.FC<{
  visible: boolean;
  onViewCampaign: () => void;
}> = ({ visible, onViewCampaign }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-emerald-400/50 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.85)] animate-[popIn_0.35s_ease-out]">
        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-emerald-400">
          8 / 8 SYSTEMS VERIFIED
        </div>
        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1.5">
          CADET TRAINING COMPLETED!
        </h2>
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
          You&apos;ve explored the facility, mastered the hardware labs, learned the Engineer&apos;s Handbook, and know how to open any mission level.
        </p>

        <div className="my-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-xs text-emerald-200 font-semibold">
          Unlocked Credential: Mission Architect Certification &amp; Training Academy Levels
        </div>

        <button
          onClick={() => {
            SFX.click();
            onViewCampaign();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#34d399] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
        >
          OPEN TRAINING ACADEMY ▶
        </button>
      </div>
    </div>
  );
};

/* ========================================================
   5. INTERACTIVE PRACTICE MODALS (RE-EXPORTED)
   ======================================================== */
export { SubsystemExplorerModal, TutorialTaskModal } from './TrainingInteractiveModals';

/* ========================================================
   6. TRAINING ACADEMY / 10-LEVEL CAMPAIGN SELECTION SCREEN
   ======================================================== */
interface CampaignDirectoryModalProps {
  visible: boolean;
  playerState: PlayerState;
  activeLevelIdx: number;
  tutStep: number;
  cadetGuideActive?: boolean;
  onCompleteCadetGuide?: () => void;
  onClose: () => void;
  onStartTraining: () => void;
  onSelectLevel: (idx: number) => void;
  onPlayLegacyKarman?: () => void;
}

export const CampaignDirectoryModal: React.FC<CampaignDirectoryModalProps> = ({
  visible,
  playerState,
  activeLevelIdx,
  tutStep,
  cadetGuideActive = false,
  onCompleteCadetGuide,
  onClose,
  onStartTraining,
  onSelectLevel,
  onPlayLegacyKarman,
}) => {
  if (!visible) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[2000] bg-black/82 flex items-center justify-center p-2 md:p-4"
    >
      <SpaceCampaignMap
        playerState={playerState}
        activeLevelIdx={activeLevelIdx}
        tutStep={tutStep}
        cadetGuideActive={cadetGuideActive}
        onCompleteCadetGuide={onCompleteCadetGuide}
        onClose={onClose}
        onStartTraining={onStartTraining}
        onSelectLevel={onSelectLevel}
        onPlayLegacyKarman={onPlayLegacyKarman}
      />
    </div>
  );
};

/* ========================================================
   6B. STATION MISSION BRIEFING MODAL (Press E at Station)
   ======================================================== */
export const MissionBriefingModal: React.FC<{
  level: CampaignLevel | null;
  onAccept: () => void;
  onClose: () => void;
}> = ({ level, onAccept, onClose }) => {
  useEffect(() => {
    return () => {
      SFX.cancelSpeech();
    };
  }, [level?.lvl]);

  if (!level) return null;

  const story = storyTransitions.find((s) => s.id === `level_${level.lvl}`);
  const leadVisual = story?.chapters?.[0]?.visual || 'satellite';
  const voiceQuote = story?.transmissionText || level.goal;

  const enterButtonLabel =
    level.labMode === 'lunar_water'
      ? 'ENTER LUNAR WATER LAB ▶'
      : level.labMode === 'astronaut_rescue'
      ? 'ENTER ASTRONAUT RESCUE ▶'
      : level.labMode === 'europa_probe'
      ? 'ENTER EUROPA PROBE LAB ▶'
      : level.labMode === 'lunar_flyby'
      ? 'ENTER PROPULSION & NAVIGATION LAB ▶'
      : level.labMode === 'shake_freeze'
      ? 'ENTER SHAKE & FREEZE LAB ▶'
      : level.labMode === 'rocket'
      ? 'ENTER ROCKET LAUNCH BAY ▶'
      : level.labMode === 'orbit'
      ? 'ENTER ORBIT POWER SIM ▶'
      : level.isLab
      ? 'ENTER SATELLITE LAB ▶'
      : 'ACCEPT & ENTER FACILITY ▶';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.cancelSpeech();
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[2200] bg-black/84 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#07142b] border border-cyan-400/50 p-6 md:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.9)] animate-[popIn_0.25s_ease-out]">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-mono-tech font-bold uppercase tracking-wider">
            📍 {level.briefingStationName}
          </span>
          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4] mt-3">
          LEVEL {String(level.lvl).padStart(2, '0')} // MISSION BRIEFING
        </div>
        <h2 className="font-display text-lg md:text-2xl font-extrabold text-white mt-0.5 flex items-center gap-2">
          <span>{level.icon}</span>
          <span>{level.title}</span>
        </h2>

        {/* Single Visual & Voice Briefing Card */}
        <div className="mt-3.5 rounded-2xl bg-[#050e20] border border-cyan-400/35 p-4 md:p-5 space-y-3">
          <div className="py-1 flex justify-center">
            <StoryChapterVisualSVG kind={leadVisual} className="w-44 h-28" />
          </div>

          <DirectorVanceVoiceBanner
            speaker={story?.speaker || 'DIRECTOR VANCE // VOICE BRIEFING'}
            quote={voiceQuote}
            autoPlayKey={`brief-${level.lvl}`}
          />
        </div>

        {/* 3 Visual Metric Tiles */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-slate-400 text-[10px] uppercase">{level.isLab ? 'Focus' : 'Apogee'}</div>
            <div className="font-mono-tech font-extrabold text-white mt-0.5 truncate">
              {level.isLab ? level.orbit : `${level.t} km`}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-slate-400 text-[10px] uppercase">{level.isLab ? 'Mode' : 'Budget'}</div>
            <div className="font-mono-tech font-extrabold text-[#4fe3d4] mt-0.5 truncate">
              {level.difficulty}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-amber-400/25">
            <div className="text-slate-400 text-[10px] uppercase">Reward</div>
            <div className="font-bold text-amber-300 mt-0.5 truncate">
              {level.labMode === 'shake_freeze'
                ? '★ 750 SC + 100 XP'
                : level.labMode === 'europa_probe'
                ? '★ 1,500 SC + 150 XP'
                : level.labMode === 'lunar_water'
                ? '★ 1,500 SC + 200 XP'
                : level.labMode === 'astronaut_rescue'
                ? '★ 1,000 SC + Badge'
                : level.isLab
                ? '★ 1,000 SC + Badge'
                : `${level.credB.toLocaleString()} Grant`}
            </div>
          </div>
        </div>

        {/* Accept / Close Actions */}
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.taskComplete();
              onAccept();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
          >
            {enterButtonLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              onClose();
            }}
            className="px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================
   7. LEVEL 2 INTRODUCTION SCREEN (Visual Rocket Bay Intro)
   ======================================================== */
export const Level2IntroModal: React.FC<{
  visible: boolean;
  onStartLevel2: () => void;
  onBackToAcademy: () => void;
}> = ({ visible, onStartLevel2, onBackToAcademy }) => {
  const lvl2 = CAMPAIGN_LEVELS[1];
  if (!visible || !lvl2) return null;

  return (
    <div className="fixed inset-0 z-[2200] bg-black/82 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#07142b] border border-cyan-400/50 p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.88)] animate-[popIn_0.3s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4]">
            NEXT FACILITY ROOM // UNLOCKED
          </span>
          <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
            LCC READY
          </span>
        </div>

        <div className="my-3 flex justify-center">
          <StoryChapterVisualSVG kind="rocket" className="w-36 h-24" />
        </div>

        <h2 className="font-display text-xl font-extrabold text-white mb-3">
          {lvl2.title}
        </h2>

        <DirectorVanceVoiceBanner
          quote={lvl2.goal}
          autoPlayKey={visible ? 'lvl2-intro-modal' : null}
        />

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {lvl2.stationRoute.map((s, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-[#0b1b38] border border-cyan-400/25 text-[11px] text-cyan-200">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              onStartLevel2();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
          >
            GO TO LCC ROOM ▶
          </button>
          <button
            onClick={() => {
              SFX.cancelSpeech();
              SFX.click();
              onBackToAcademy();
            }}
            className="px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
          >
            Academy
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================
   8. PLAYER PROFILE DASHBOARD & ACCOUNT MANAGEMENT MODAL
   ======================================================== */
export const ExplorerDossierModal: React.FC<{
  visible: boolean;
  playerState: PlayerState;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; message: string }>;
  onForgotPassword: () => Promise<{ ok: boolean; message: string }>;
  onDeleteAccount: (currentPassword: string) => Promise<{ ok: boolean; message: string }>;
}> = ({
  visible,
  playerState,
  onClose,
  onLogout,
  onChangePassword,
  onForgotPassword,
  onDeleteAccount,
}) => {
  const [accountPanel, setAccountPanel] = useState<'none' | 'password' | 'delete'>('none');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [busyAction, setBusyAction] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setAccountPanel('none');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setDeletePassword('');
      setDeleteConfirmText('');
      setFeedback(null);
    }
  }, [visible]);

  if (!visible) return null;

  const satCertified =
    playerState.badges.includes('SATELLITE_BUILDER') || playerState.completedLevels.includes(1);
  const rocketCertified =
    playerState.badges.includes('ROCKET_COMMANDER') || playerState.completedLevels.includes(2);
  const orbitPowerCertified =
    playerState.badges.includes('ORBIT_POWER_ENGINEER') || playerState.completedLevels.includes(3);
  const thermalCertified =
    playerState.badges.includes('THERMAL_PROTECTION_ENGINEER') ||
    playerState.completedLevels.includes(4);
  const propulsionCertified =
    playerState.badges.includes('PROPULSION_ENGINEER') ||
    Boolean(playerState.level5FlybyCompleted);
  const thermalTelemetryCertified =
    playerState.badges.includes('THERMAL_TELEMETRY_SPECIALIST') ||
    playerState.completedLevels.includes(6);
  const lunarWaterCertified =
    playerState.badges.includes('LUNAR_WATER_EXPLORER') ||
    playerState.completedLevels.includes(7);
  const spaceRescueCertified =
    playerState.badges.includes('SPACE_RESCUE_HERO') ||
    playerState.completedLevels.includes(8);
  const propulsionUpgradeUnlocked = Boolean(playerState.propulsionUpgradeUnlocked);

  const completedSet = new Set(
    playerState.completedLevels.filter((n) => n >= 1 && n <= 8)
  );
  const completedDisplayCount = completedSet.size;
  const missionPct = Math.round((completedDisplayCount / 8) * 100);

  const levelStarsMap: Record<number, number> = {};
  for (let lvl = 1; lvl <= 8; lvl++) {
    const raw =
      playerState.levelStars?.[lvl] ??
      (playerState.levelStars as Record<string, number> | undefined)?.[String(lvl)] ??
      0;
    levelStarsMap[lvl] = completedSet.has(lvl) ? Math.max(3, Number(raw) || 0) : Number(raw) || 0;
  }
  const totalStars = Object.values(levelStarsMap).reduce((sum, s) => sum + s, 0);

  const unlockedSet = new Set<number>([1, ...(playerState.unlockedLevels ?? [1])]);
  for (const lvl of completedSet) {
    if (lvl + 1 <= 8) unlockedSet.add(lvl + 1);
  }

  const ownedGearItems = STORE_ITEMS.filter((item) =>
    (playerState.unlockedStoreItems ?? []).includes(item.id)
  );
  const recentTransactions = [...(playerState.transactions ?? [])].reverse().slice(0, 8);
  const displayUsername = playerState.username || playerState.callsign || 'Explorer-01';
  const lastSavedDisplay = playerState.lastSavedAt
    ? new Date(playerState.lastSavedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Synced on activity';

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPassword.length < 6) {
      setFeedback({ ok: false, text: 'New password must be at least 6 characters.' });
      SFX.snapWrong();
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFeedback({ ok: false, text: 'New passwords do not match.' });
      SFX.snapWrong();
      return;
    }
    setBusyAction(true);
    try {
      const res = await onChangePassword(currentPassword, newPassword);
      setFeedback({ ok: res.ok, text: res.message });
      if (res.ok) {
        SFX.taskComplete();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setAccountPanel('none');
      } else {
        SFX.snapWrong();
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleForgotClick = async () => {
    setFeedback(null);
    setBusyAction(true);
    try {
      const res = await onForgotPassword();
      setFeedback({ ok: res.ok, text: res.message });
      if (res.ok) SFX.taskComplete();
      else SFX.snapWrong();
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setFeedback({ ok: false, text: 'Type DELETE exactly to confirm account deletion.' });
      SFX.snapWrong();
      return;
    }
    if (!deletePassword) {
      setFeedback({ ok: false, text: 'Enter your current password to verify deletion.' });
      SFX.snapWrong();
      return;
    }
    setBusyAction(true);
    try {
      const res = await onDeleteAccount(deletePassword);
      if (!res.ok) {
        setFeedback({ ok: false, text: res.message });
        SFX.snapWrong();
      }
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[2500] bg-black/82 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#071124] border border-cyan-400/35 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.88)]">
        {/* Header: Profile Identity */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <RecruitBadgeSVG size={62} />
            <div>
              <div className="text-[10px] font-mono-tech uppercase tracking-widest text-[#4fe3d4]">
                FIRESTORE CLOUD PROFILE // {displayUsername}
              </div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                EXPLORER PROFILE DASHBOARD
              </h2>
              <p className="text-xs text-slate-400">
                {playerState.email ? `${playerState.email} • ` : ''}
                Last Saved: <span className="text-slate-300">{lastSavedDisplay}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                SFX.click();
                await onLogout();
              }}
              className="px-3 py-1.5 rounded-lg border border-rose-400/40 bg-rose-500/15 hover:bg-rose-500/28 text-xs font-bold text-rose-200 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
            >
              Close ✕
            </button>
          </div>
        </div>

        {/* Overall Mission Progress Bar */}
        <div className="p-3.5 rounded-xl bg-[#0b1830] border border-cyan-400/25 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
            <span className="font-bold text-white">
              Overall Mission Progress: {completedDisplayCount} / 8 Levels Completed ({missionPct}%)
            </span>
            <span className="font-mono-tech text-[11px] text-[#4fe3d4]">
              Active: Level {String(playerState.currentCampaignLevel).padStart(2, '0')} • Stage{' '}
              {playerState.currentMissionStage ?? 0}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#4fe3d4] via-[#38bdf8] to-[#34d399] transition-all duration-300"
              style={{ width: `${missionPct}%` }}
            />
          </div>
        </div>

        {/* Core Currencies & Stars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-[#0b1830] border border-amber-400/25">
            <div className="text-[10px] uppercase text-slate-400">Total StarCredits</div>
            <div className="font-mono-tech text-sm sm:text-base font-extrabold text-amber-300 tabular-nums">
              ★ {playerState.starCredits.toLocaleString()} SC
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1830] border border-yellow-400/25">
            <div className="text-[10px] uppercase text-slate-400">Total Stars</div>
            <div className="font-mono-tech text-sm sm:text-base font-extrabold text-yellow-300 tabular-nums">
              ⭐ {totalStars} / 24
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1830] border border-cyan-400/25">
            <div className="text-[10px] uppercase text-slate-400">Grant Credits</div>
            <div className="font-mono-tech text-sm sm:text-base font-extrabold text-[#4fe3d4] tabular-nums">
              ₡ {playerState.grantCredits.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1830] border border-emerald-400/25">
            <div className="text-[10px] uppercase text-slate-400">Engineering XP</div>
            <div className="font-mono-tech text-sm sm:text-base font-extrabold text-emerald-300 tabular-nums">
              ⚡ {(playerState.xp ?? 0).toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* 8-Level Completion & Stars Breakdown */}
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
          Campaign Levels &amp; Earned Stars
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {CAMPAIGN_LEVELS.map((lvl) => {
            const done = completedSet.has(lvl.lvl);
            const unlocked = unlockedSet.has(lvl.lvl);
            const stars = levelStarsMap[lvl.lvl] ?? 0;
            return (
              <div
                key={lvl.lvl}
                className={`p-2.5 rounded-xl border text-xs ${
                  done
                    ? 'bg-emerald-500/10 border-emerald-400/45'
                    : unlocked
                    ? 'bg-[#0b1830] border-cyan-400/30'
                    : 'bg-[#060d1c] border-white/10 opacity-55'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono-tech font-bold text-[10px] text-[#4fe3d4]">
                    LVL 0{lvl.lvl}
                  </span>
                  <span className="text-amber-300 text-[11px] tracking-tighter">
                    {'★'.repeat(stars)}
                    <span className="text-slate-600">{'☆'.repeat(Math.max(0, 3 - stars))}</span>
                  </span>
                </div>
                <div className="text-[11px] font-bold text-white truncate mt-0.5">
                  {lvl.icon} {lvl.title.replace(/^LEVEL \d+\s*[–:-]\s*/i, '')}
                </div>
                <div className="text-[9px] font-mono-tech mt-0.5 text-slate-400">
                  {done ? '● COMPLETED' : unlocked ? '○ UNLOCKED' : '🔒 LOCKED'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Earned Badges & Certifications */}
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
          Unlocked Badges &amp; Certifications ({playerState.badges.length})
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border text-center flex flex-col items-center ${
              playerState.joined || playerState.badges.includes('NEW_RECRUIT')
                ? 'border-cyan-400/35'
                : 'border-white/10 opacity-45 grayscale'
            }`}
          >
            <RecruitBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">NEW RECRUIT</div>
            <div className="text-[9px] font-bold text-[#4fe3d4] mt-0.5">
              {playerState.joined || playerState.badges.includes('NEW_RECRUIT')
                ? '● CERTIFIED'
                : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              playerState.trainingCompleted ? '' : 'opacity-45 grayscale'
            }`}
          >
            <RecruitBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">ARCHITECT</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                playerState.trainingCompleted ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {playerState.trainingCompleted ? '● UNLOCKED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              satCertified ? '' : 'opacity-45 grayscale'
            }`}
          >
            <SatelliteBuilderBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">SAT BUILDER</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                satCertified ? 'text-[#4fe3d4]' : 'text-slate-500'
              }`}
            >
              {satCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              rocketCertified ? '' : 'opacity-45 grayscale'
            }`}
          >
            <RocketCommanderBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">COMMANDER</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                rocketCertified ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {rocketCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              orbitPowerCertified ? '' : 'opacity-45 grayscale'
            }`}
          >
            <OrbitPowerEngineerBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">ORBIT POWER</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                orbitPowerCertified ? 'text-emerald-300' : 'text-slate-500'
              }`}
            >
              {orbitPowerCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              thermalCertified ? '' : 'opacity-45 grayscale'
            }`}
          >
            <ThermalProtectionEngineerBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">THERMAL SHIELD</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                thermalCertified ? 'text-orange-300' : 'text-slate-500'
              }`}
            >
              {thermalCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border text-center flex flex-col items-center ${
              propulsionCertified ? 'border-cyan-400/50' : 'border-white/10 opacity-45 grayscale'
            }`}
          >
            <PropulsionEngineerBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">PROPULSION ENG</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                propulsionCertified ? 'text-cyan-300' : 'text-slate-500'
              }`}
            >
              {propulsionCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border text-center flex flex-col items-center ${
              thermalTelemetryCertified ? 'border-sky-400/60' : 'border-white/10 opacity-45 grayscale'
            }`}
          >
            <ThermalTelemetrySpecialistBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">EUROPA TELEMETRY</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                thermalTelemetryCertified ? 'text-sky-300' : 'text-slate-500'
              }`}
            >
              {thermalTelemetryCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border text-center flex flex-col items-center ${
              lunarWaterCertified ? 'border-cyan-400/60' : 'border-white/10 opacity-45 grayscale'
            }`}
          >
            <LunarWaterExplorerBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">LUNAR WATER EXP</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                lunarWaterCertified ? 'text-cyan-300' : 'text-slate-500'
              }`}
            >
              {lunarWaterCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl bg-[#0b1830] border text-center flex flex-col items-center ${
              spaceRescueCertified ? 'border-amber-400/60' : 'border-white/10 opacity-45 grayscale'
            }`}
          >
            <SpaceRescueHeroBadgeSVG size={48} />
            <div className="text-[10px] font-bold text-white mt-1.5">SPACE RESCUE HERO</div>
            <div
              className={`text-[9px] font-bold mt-0.5 ${
                spaceRescueCertified ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {spaceRescueCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>
        </div>

        {/* Equipment Upgrades & Collected Rewards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-[#0b1830] border border-cyan-400/25">
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-cyan-300 font-bold mb-1.5">
              Equipment Upgrades &amp; Requisition Gear ({ownedGearItems.length}/{STORE_ITEMS.length})
            </div>
            <div className="text-xs font-bold text-white mb-2">
              {propulsionUpgradeUnlocked
                ? `🚀 Propulsion Upgrade Active (${playerState.level5BestFuelKg ?? 55} kg optimal fuel)`
                : 'Propulsion Upgrade: Complete Level 5 to unlock'}
            </div>
            {ownedGearItems.length === 0 ? (
              <div className="text-[11px] text-slate-400">
                No Galaxy-X Store gear unlocked yet. Visit the Store to spend StarCredits.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ownedGearItems.map((gear) => (
                  <span
                    key={gear.id}
                    className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/35 text-[10px] font-bold text-cyan-200"
                  >
                    {gear.icon} {gear.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b1830] border border-amber-400/25">
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-amber-300 font-bold mb-1.5">
              Collected Rewards &amp; Ledger ({(playerState.rewardsCollected ?? []).length})
            </div>
            {recentTransactions.length === 0 && (playerState.rewardsCollected ?? []).length === 0 ? (
              <div className="text-[11px] text-slate-400">
                Complete levels or accept your recruit commission to collect rewards.
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 text-[11px] text-slate-200 border-b border-white/5 pb-1 last:border-0"
                  >
                    <span className="truncate">{tx.note || tx.key || tx.type}</span>
                    <span
                      className={`font-mono-tech font-bold shrink-0 ${
                        tx.amountStarCredits >= 0 ? 'text-amber-300' : 'text-rose-300'
                      }`}
                    >
                      {tx.amountStarCredits >= 0 ? '+' : ''}
                      {tx.amountStarCredits} SC
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(playerState.rewardsCollected ?? []).map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-[10px] font-mono-tech text-amber-200"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account Management Section */}
        <div className="p-4 rounded-xl bg-[#060d1c] border border-white/15">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                Account Management &amp; Security
              </div>
              <div className="text-[11px] text-slate-400">
                Firebase UID: <span className="font-mono-tech text-slate-300">{playerState.uid || playerState.userId}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyAction}
                onClick={() => {
                  SFX.click();
                  setFeedback(null);
                  setAccountPanel((p) => (p === 'password' ? 'none' : 'password'));
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/40 text-[#4fe3d4] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => {
                  SFX.click();
                  void handleForgotClick();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 text-xs font-bold cursor-pointer"
              >
                Forgot Password Reset
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => {
                  SFX.click();
                  setFeedback(null);
                  setAccountPanel((p) => (p === 'delete' ? 'none' : 'delete'));
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/28 border border-rose-400/45 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`mb-3 p-2.5 rounded-lg border text-xs ${
                feedback.ok
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {accountPanel === 'password' && (
            <form
              onSubmit={handlePasswordSubmit}
              className="mt-2 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="px-3 py-2 rounded-lg bg-[#0b172e] border border-cyan-400/30 text-xs text-white focus:outline-none focus:border-[#4fe3d4]"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
                className="px-3 py-2 rounded-lg bg-[#0b172e] border border-cyan-400/30 text-xs text-white focus:outline-none focus:border-[#4fe3d4]"
                required
              />
              <div className="flex gap-2">
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0b172e] border border-cyan-400/30 text-xs text-white focus:outline-none focus:border-[#4fe3d4]"
                  required
                />
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-3.5 py-2 rounded-lg bg-[#4fe3d4] text-[#041022] text-xs font-extrabold cursor-pointer shrink-0 disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {accountPanel === 'delete' && (
            <form
              onSubmit={handleDeleteSubmit}
              className="mt-2 pt-3 border-t border-rose-400/30 bg-rose-950/20 p-3 rounded-xl space-y-2.5"
            >
              <div className="flex items-start gap-2 text-xs text-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  This permanently deletes your Firebase Authentication account, Firestore profile,
                  badges, stars, and all StarCredits. Type <strong>DELETE</strong> and enter your
                  password to confirm.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="px-3 py-2 rounded-lg bg-[#0b172e] border border-rose-400/40 text-xs text-white focus:outline-none"
                  required
                />
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Current password"
                  className="px-3 py-2 rounded-lg bg-[#0b172e] border border-rose-400/40 text-xs text-white focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-extrabold uppercase cursor-pointer disabled:opacity-60"
                >
                  {busyAction ? 'Deleting...' : 'Confirm Delete Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
