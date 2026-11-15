import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LEVEL2_PROGRESS,
  Level2Progress,
  ROCKET_COMPONENTS,
  RocketPartId,
} from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { LaunchpadPayloadStage, Level2RewardResult } from './LaunchpadPayloadStage';
import { RocketAssemblyStage } from './RocketAssemblyStage';
import { DirectorVanceVoiceBanner } from './DirectorVanceVoiceBanner';

export type { Level2RewardResult };

export interface Level2CompletionPayload {
  installedRocketParts: RocketPartId[];
  stage2LaunchpadDone: boolean;
  stage3PayloadDone: boolean;
  stage4LaunchDone: boolean;
  launchStatus: 'completed';
}

interface RocketLaunchLabProps {
  visible: boolean;
  starCredits: number;
  alreadyCompleted: boolean;
  initialProgress?: Level2Progress;
  onSaveProgress: (progress: Level2Progress) => void;
  onReplayReset: () => void;
  onCompleteMission: (payload: Level2CompletionPayload) => Promise<Level2RewardResult>;
  onContinueToLevel3: () => void;
  onBackToAcademy: () => void;
  onExit: () => void;
  onOpenHandbook?: () => void;
}

const LEVEL2_STAGE_TRACKER: { num: 1 | 2 | 3 | 4; label: string }[] = [
  { num: 1, label: '1. Rocket Assembly' },
  { num: 2, label: '2. Pad 39X Staging' },
  { num: 3, label: '3. Payload Fairing' },
  { num: 4, label: '4. Rocket Launch' },
];

export const RocketLaunchLab: React.FC<RocketLaunchLabProps> = ({
  visible,
  starCredits,
  alreadyCompleted,
  initialProgress,
  onSaveProgress,
  onReplayReset,
  onCompleteMission,
  onContinueToLevel3,
  onBackToAcademy,
  onExit,
  onOpenHandbook,
}) => {
  const [progress, setProgress] = useState<Level2Progress>(() => ({
    ...DEFAULT_LEVEL2_PROGRESS,
    ...(initialProgress || {}),
  }));
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const prevVisibleRef = useRef<boolean>(false);

  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (!justOpened) return;

    const saved = initialProgress
      ? { ...DEFAULT_LEVEL2_PROGRESS, ...initialProgress }
      : { ...DEFAULT_LEVEL2_PROGRESS };

    let effective: Level2Progress =
      saved.stage4Done && saved.launchStatus === 'completed'
        ? { ...DEFAULT_LEVEL2_PROGRESS }
        : saved;

    if (effective.stage === 4 && effective.launchStatus !== 'completed') {
      const prereqsOk = effective.stage1Done && effective.stage2Done && effective.stage3Done;
      effective = prereqsOk
        ? { ...effective, launchStatus: 'not_started' }
        : { ...DEFAULT_LEVEL2_PROGRESS };
    }
    setProgress(effective);
    setShowEntryBriefing(effective.stage === 1 && effective.rocketParts.length === 0);
  }, [visible, initialProgress]);

  const [showEntryBriefing, setShowEntryBriefing] = useState<boolean>(
    () => (initialProgress?.stage ?? 1) === 1 && (initialProgress?.rocketParts?.length ?? 0) === 0
  );

  if (!visible) return null;

  const activeStage = progress.stage;

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#030816] text-[#e8eefc] select-none">
      {/* Top Workshop Bar */}
      <div className="h-[56px] px-4 md:px-6 bg-[#071124] border-b border-cyan-400/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded bg-amber-400/15 border border-amber-400/45 text-amber-300 text-[11px] font-bold tracking-wider uppercase shrink-0">
            LEVEL 02
          </span>
          <h2 className="font-display text-sm md:text-base font-extrabold tracking-wide text-white truncate">
            ROCKET ASSEMBLY &amp; LAUNCH // LCC BAY
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DirectorVanceVoiceBanner
            compact
            accentColor="amber"
            quote="Assemble the launch vehicle, roll out to Pad 39X, pack the payload fairing, and command liftoff!"
          />

          <div className="flex items-center gap-2 bg-[#0b1933] border border-amber-400/30 px-3 py-1.5 rounded-lg">
            <span className="text-amber-300 text-sm">⭐</span>
            <span className="font-mono-tech font-bold text-amber-300 text-xs tabular-nums">
              {starCredits.toLocaleString()} SC
            </span>
          </div>

          {onOpenHandbook && (
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenHandbook();
              }}
              className="px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              📖 Handbook
            </button>
          )}

          <button
            onClick={() => {
              SFX.cancelSpeech();
              SFX.stopAllLaunchAudio();
              SFX.click();
              onBackToAcademy();
            }}
            className="px-3 py-1.5 rounded-lg border border-cyan-400/35 bg-cyan-400/10 hover:bg-cyan-400/20 text-[#4fe3d4] text-xs font-bold transition cursor-pointer hidden sm:inline-flex"
          >
            Academy
          </button>

          <button
            onClick={() => {
              SFX.cancelSpeech();
              SFX.stopAllLaunchAudio();
              SFX.click();
              onExit();
            }}
            className="px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold transition cursor-pointer"
          >
            Facility ✕
          </button>
        </div>
      </div>

      {/* 4-Stage Visual Tracker Header */}
      <div className="bg-[#050d1d] border-b border-cyan-400/20 px-3 md:px-6 py-2 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-6xl mx-auto">
          {LEVEL2_STAGE_TRACKER.map((item) => {
            const isCompleted =
              (item.num === 1 && progress.stage1Done) ||
              (item.num === 2 && progress.stage2Done) ||
              (item.num === 3 && progress.stage3Done) ||
              (item.num === 4 && progress.stage4Done);
            const isCurrent = activeStage === item.num && !isCompleted;

            return (
              <div
                key={item.num}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-2 transition ${
                  isCompleted
                    ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                    : isCurrent
                    ? 'bg-cyan-400/15 border-[#4fe3d4] text-white shadow-[0_0_14px_rgba(79,227,212,0.22)]'
                    : 'bg-[#081326] border-white/10 text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-mono-tech font-extrabold flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500 text-[#03120b]'
                      : isCurrent
                      ? 'bg-[#4fe3d4] text-[#041022]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : item.num}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {activeStage === 1 ? (
        <RocketAssemblyStage
          initialInstalledParts={progress.rocketParts}
          onProgressChange={(parts) => {
            const next: Level2Progress = { ...progressRef.current, rocketParts: parts };
            setProgress(next);
            onSaveProgress(next);
          }}
          onCompleteStage2={(parts) => {
            const next: Level2Progress = {
              ...progressRef.current,
              stage: 2,
              rocketParts: parts,
              stage1Done: true,
            };
            setProgress(next);
            onSaveProgress(next);
          }}
        />
      ) : (
        <LaunchpadPayloadStage
          mode={activeStage === 2 ? 'stage3' : activeStage === 3 ? 'stage4' : 'stage5'}
          starCredits={starCredits}
          alreadyCompleted={alreadyCompleted}
          onCompleteStage3={() => {
            const next: Level2Progress = {
              ...progressRef.current,
              stage: 3,
              stage1Done: true,
              stage2Done: true,
            };
            setProgress(next);
            onSaveProgress(next);
          }}
          onCompleteStage4={() => {
            const next: Level2Progress = {
              ...progressRef.current,
              stage: 4,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: false,
              launchStatus: 'not_started',
            };
            setProgress(next);
            onSaveProgress(next);
          }}
          onLaunchStatusChange={(status) => {
            const next: Level2Progress = {
              ...progressRef.current,
              stage: 4,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: status === 'completed',
              launchStatus: status,
            };
            setProgress(next);
            onSaveProgress(next);
          }}
          onCompleteAllStages={async () => {
            const allRocket =
              progressRef.current.rocketParts.length === ROCKET_COMPONENTS.length
                ? progressRef.current.rocketParts
                : ROCKET_COMPONENTS.map((c) => c.id);
            const done: Level2Progress = {
              stage: 4,
              rocketParts: allRocket,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: true,
              launchStatus: 'completed',
            };
            setProgress(done);
            return onCompleteMission({
              installedRocketParts: allRocket,
              stage2LaunchpadDone: true,
              stage3PayloadDone: true,
              stage4LaunchDone: true,
              launchStatus: 'completed',
            });
          }}
          onContinueToNextLevel={() => {
            SFX.stopAllLaunchAudio();
            onContinueToLevel3();
          }}
          onReplayLevel={() => {
            SFX.stopAllLaunchAudio();
            const fresh = { ...DEFAULT_LEVEL2_PROGRESS };
            setProgress(fresh);
            onReplayReset();
          }}
          onBackToAcademy={() => {
            SFX.stopAllLaunchAudio();
            onBackToAcademy();
          }}
        />
      )}

      {showEntryBriefing && (
        <div className="fixed inset-0 z-[5550] bg-[#020816]/84 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#07142b] border border-amber-400/50 p-5 sm:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.92)] space-y-4 animate-[popIn_0.28s_ease-out]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono-tech font-bold uppercase tracking-[2.4px] text-amber-300">
                LEVEL 02 // VOICE BRIEFING
              </span>
              <span className="px-2.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-[10px] font-mono-tech font-bold text-amber-300">
                PAD 39X &amp; LCC BAY
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-black text-white">
              ROCKET ASSEMBLY &amp; LAUNCH
            </h3>
            <DirectorVanceVoiceBanner
              speaker="DIRECTOR VANCE // LAUNCH CONTROL"
              quote="Assemble all 10 rocket modules, roll out to Pad 39X, pack your satellite inside the fairing, and command liftoff!"
              autoPlayKey={visible && showEntryBriefing ? 'lvl2-entry-brief' : null}
              accentColor="amber"
            />
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  SFX.cancelSpeech();
                  SFX.click();
                  setShowEntryBriefing(false);
                }}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-[#f2c14e] to-[#f97316] text-[#041022] font-extrabold text-xs sm:text-sm uppercase tracking-wide hover:brightness-110 transition cursor-pointer"
              >
                Start Rocket Assembly ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
