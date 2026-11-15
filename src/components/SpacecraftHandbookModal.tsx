import React, { useEffect, useRef, useState } from 'react';
import { HANDBOOK_LEVELS, HandbookLevelSection } from '../data/handbookData';
import { HandbookCoverSVG, HandbookLevelDiagramSVG } from './HandbookDiagramsSVG';
import { SFX } from '../utils/sfx';

interface SpacecraftHandbookModalProps {
  visible: boolean;
  playingLevel: number | null; // 1..8 when opened inside a level, null from hub
  initialLevel: number | null; // Opens directly to this level when inside a mission
  completedLevels: number[];
  cadetGuideActive?: boolean;
  onCompleteCadetGuide?: () => void;
  onGoToLevel?: (levelNum: number) => void;
  onClose: () => void;
}

const TOTAL_PAGES = 18; // Pages 1-2 = Contents, Pages 3-18 = Levels 1..8 (1 facing spread each)

export const SpacecraftHandbookModal: React.FC<SpacecraftHandbookModalProps> = ({
  visible,
  playingLevel,
  initialLevel,
  completedLevels,
  cadetGuideActive = false,
  onCompleteCadetGuide,
  onGoToLevel,
  onClose,
}) => {
  // page = 0: Cover, page = 1..18: Open Book
  const [page, setPage] = useState<number>(0);
  const [turnTick, setTurnTick] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [visitedChapters, setVisitedChapters] = useState<Set<number>>(() => new Set());
  const [practicedNav, setPracticedNav] = useState<boolean>(false);
  const [navQuizPicked, setNavQuizPicked] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const touchStartX = useRef<number | null>(null);
  const leftPageRef = useRef<HTMLDivElement | null>(null);
  const rightPageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setVisitedChapters(
      initialLevel && initialLevel >= 1 && initialLevel <= 8 ? new Set([initialLevel]) : new Set()
    );
    setPracticedNav(false);
    setNavQuizPicked(null);
    if (initialLevel && initialLevel >= 1 && initialLevel <= 8) {
      setPage(3 + (initialLevel - 1) * 2);
    } else {
      setPage(0);
    }
    setTurnTick((t) => t + 1);
  }, [visible, initialLevel]);

  const scrollPagesTop = () => {
    leftPageRef.current?.scrollTo({ top: 0 });
    rightPageRef.current?.scrollTo({ top: 0 });
  };

  const goToPage = (targetPage: number, markNav = false) => {
    const clamped = Math.max(0, Math.min(TOTAL_PAGES, targetPage));
    setPage(clamped);
    if (clamped >= 3) {
      const ch = Math.floor((clamped - 3) / 2) + 1;
      setVisitedChapters((prev) => {
        if (prev.size >= 1 && !prev.has(ch)) {
          setPracticedNav(true);
        }
        const next = new Set(prev);
        next.add(ch);
        return next;
      });
    }
    if (markNav) {
      setPracticedNav(true);
    }
    setTurnTick((t) => t + 1);
    scrollPagesTop();
  };

  const handleNext = () => {
    SFX.click();
    if (page === 0) {
      goToPage(1);
      return;
    }
    const step = isDesktop ? 2 : 1;
    const base = isDesktop ? (page % 2 === 1 ? page : page - 1) : page;
    if (base + step <= TOTAL_PAGES) {
      goToPage(base + step, true);
    }
  };

  const handlePrev = () => {
    SFX.click();
    if (page <= 1 || (isDesktop && page <= 2)) {
      goToPage(0);
      return;
    }
    const step = isDesktop ? 2 : 1;
    const base = isDesktop ? (page % 2 === 1 ? page : page - 1) : page;
    goToPage(Math.max(1, base - step), true);
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        SFX.click();
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!visible) return null;

  const leftPageNum = page === 0 ? 0 : page % 2 === 1 ? page : page - 1;
  const rightPageNum = page === 0 ? 0 : leftPageNum + 1;

  const levelForPage = (p: number): HandbookLevelSection | null => {
    if (p < 3 || p > TOTAL_PAGES) return null;
    const idx = Math.floor((p - 3) / 2);
    return HANDBOOK_LEVELS[idx] || null;
  };

  const currentSection = levelForPage(page);
  const stepOpenedContents = page >= 1;
  const stepVisitedChapter = visitedChapters.size >= 1;
  const stepNavigated = practicedNav || visitedChapters.size >= 2;
  const stepUnderstoodJump = navQuizPicked === 0;
  const allExamStepsDone =
    stepOpenedContents && stepVisitedChapter && stepNavigated && stepUnderstoodJump;

  const renderBookPage = (p: number) => {
    // Pages 1-2: Table of Contents
    if (p === 1) {
      return (
        <div className="space-y-3">
          <div className="border-b border-cyan-400/20 pb-2">
            <div className="text-[10px] font-mono-tech uppercase tracking-[2.5px] text-[#4fe3d4]">
              Table of Contents
            </div>
            <h2 className="font-display text-lg font-bold text-white mt-0.5">
              YOUR MISSION GUIDE
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Choose a mission and discover the science behind it.
            </p>
          </div>

          <div className="divide-y divide-white/8">
            {HANDBOOK_LEVELS.slice(0, 4).map((lvl) => {
              const isDone = completedLevels.includes(lvl.level);
              const isNow = playingLevel === lvl.level;
              return (
                <button
                  key={lvl.level}
                  type="button"
                  onClick={() => {
                    SFX.click();
                    goToPage(lvl.leftPage);
                  }}
                  className="w-full text-left py-2.5 px-1.5 -mx-1.5 rounded hover:bg-white/5 transition cursor-pointer group"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xs font-bold text-white group-hover:text-[#4fe3d4] transition">
                      {lvl.icon} Level {String(lvl.level).padStart(2, '0')} — {lvl.title}
                    </span>
                    <span className="flex-1 border-b border-dotted border-white/20 mx-1 hidden sm:block" />
                    <span className="text-[11px] font-mono-tech text-[#f2c14e] tabular-nums shrink-0">
                      {isNow ? 'Active · ' : isDone ? '✓ · ' : ''}p. {lvl.leftPage}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    {lvl.tocDescription}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (p === 2) {
      return (
        <div className="flex flex-col justify-between h-full gap-3">
          <div>
            <div className="border-b border-cyan-400/20 pb-2 mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-mono-tech uppercase tracking-[2px] text-slate-400">
                Missions 05 – 08
              </span>
              <span className="text-[10px] font-mono-tech text-slate-400">Pages</span>
            </div>

            <div className="divide-y divide-white/8">
              {HANDBOOK_LEVELS.slice(4, 8).map((lvl) => {
                const isDone = completedLevels.includes(lvl.level);
                const isNow = playingLevel === lvl.level;
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => {
                      SFX.click();
                      goToPage(lvl.leftPage);
                    }}
                    className="w-full text-left py-2.5 px-1.5 -mx-1.5 rounded hover:bg-white/5 transition cursor-pointer group"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-xs font-bold text-white group-hover:text-[#4fe3d4] transition">
                        {lvl.icon} Level {String(lvl.level).padStart(2, '0')} — {lvl.title}
                      </span>
                      <span className="flex-1 border-b border-dotted border-white/20 mx-1 hidden sm:block" />
                      <span className="text-[11px] font-mono-tech text-[#f2c14e] tabular-nums shrink-0">
                        {isNow ? 'Active · ' : isDone ? '✓ · ' : ''}p. {lvl.leftPage}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {lvl.tocDescription}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="border-t border-white/10 pt-2.5 text-[11px] text-slate-400 italic leading-relaxed">
            Designed using official NASA mission data provided—short, plain guides so you can flip
            to any mission mid-flight and understand what to do.
          </p>
        </div>
      );
    }

    const section = levelForPage(p);
    if (!section) return null;
    const isLeftSide = p % 2 === 1;

    // LEFT PAGE: Mission Goal, Simple Science, Key Parts
    if (isLeftSide) {
      return (
        <div className="space-y-3.5">
          <div className="border-b border-cyan-400/25 pb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono-tech uppercase tracking-[2px] text-[#4fe3d4]">
                {section.code} · {section.tier} Tier
              </div>
              <h3 className="font-display text-lg font-bold text-white mt-0.5">
                {section.icon} {section.title}
              </h3>
            </div>
            {playingLevel === null && onGoToLevel && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    onGoToLevel(section.level);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-[10px] uppercase tracking-wide hover:brightness-110 transition cursor-pointer shadow ${
                    cadetGuideActive
                      ? 'ring-2 ring-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
                      : ''
                  }`}
                >
                  🚀 Go to Level {String(section.level).padStart(2, '0')} ▶
                </button>
                {cadetGuideActive && (
                  <span className="text-[9px] font-mono-tech text-amber-300">
                    Direct Level Jump
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-300">
              What You Do
            </h4>
            <p className="text-xs sm:text-[13px] text-slate-100 leading-relaxed">
              {section.whatYouDo}
            </p>
          </div>

          <div className="border-t border-white/10 pt-2.5 space-y-1">
            <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-[#f2c14e]">
              The Simple Science — {section.bigIdeaTitle}
            </h4>
            <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
              {section.bigIdeaText}
            </p>
          </div>

          <div className="border-t border-white/10 pt-2.5 space-y-1.5">
            <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-[#4fe3d4]">
              Key Parts
            </h4>
            <ul className="space-y-1.5 text-xs">
              {section.parts.map((part) => (
                <li key={part.name} className="leading-snug">
                  <span className="font-semibold text-white">{part.name}</span>
                  <span className="text-slate-400"> — </span>
                  <span className="text-slate-200">{part.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    // RIGHT PAGE: Compact Diagram, How to Win, If Stuck, 1 Quick Question
    const q = section.quiz;
    const picked = quizAnswers[q.id];
    const isCorrect = picked === q.correctIndex;

    return (
      <div className="space-y-3">
        <figure className="space-y-1">
          <HandbookLevelDiagramSVG level={section.level} />
          <figcaption className="text-[10.5px] text-slate-400 italic text-center">
            {section.diagramCaption}
          </figcaption>
        </figure>

        <div className="border-t border-white/10 pt-2 space-y-1">
          <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-emerald-300">
            How to Complete
          </h4>
          <ol className="list-decimal list-inside space-y-0.5 text-xs text-slate-100 leading-snug">
            {section.howToWin.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-[11px] text-amber-200/90 italic pt-0.5">{section.cheatNote}</p>
        </div>

        <div className="border-t border-white/10 pt-2 space-y-1">
          <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-rose-300">
            Stuck? Try This
          </h4>
          <ul className="space-y-0.5 text-[11.5px] text-slate-200 leading-snug">
            {section.troubleshooting.map((item) => (
              <li key={item.stuck}>
                <span className="font-semibold text-white">{item.stuck}:</span> {item.fix}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 pt-2 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-display font-bold uppercase tracking-wider text-[#4fe3d4]">
              Quick Check
            </h4>
            {picked !== undefined && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  setQuizAnswers((prev) => {
                    const next = { ...prev };
                    delete next[q.id];
                    return next;
                  });
                }}
                className="text-[10px] font-mono-tech text-slate-400 hover:text-white underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-white leading-snug">{q.question}</div>
          <div className="space-y-0.5">
            {q.options.map((opt, optIdx) => {
              const selected = picked === optIdx;
              const letter = String.fromCharCode(65 + optIdx);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (optIdx === q.correctIndex) SFX.snapCorrect();
                    else SFX.snapWrong();
                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                  }}
                  className={`w-full text-left px-2 py-0.5 rounded text-[11px] leading-snug transition cursor-pointer ${
                    selected
                      ? isCorrect
                        ? 'bg-emerald-500/20 text-emerald-200 font-semibold'
                        : 'bg-rose-500/20 text-rose-200 font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="font-mono-tech text-slate-400 mr-1.5">{letter}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== undefined && (
            <p
              className={`text-[11px] leading-snug ${
                isCorrect ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isCorrect ? 'Correct — ' : 'Not quite — '}
              {q.explanation}
            </p>
          )}
        </div>
      </div>
    );
  };

  const isAtLastPage = isDesktop ? leftPageNum >= TOTAL_PAGES - 1 : page >= TOTAL_PAGES;
  const pageStatusLabel =
    page === 0
      ? 'Cover'
      : isDesktop
      ? `Pages ${leftPageNum}–${rightPageNum} of ${TOTAL_PAGES}`
      : `Page ${page} of ${TOTAL_PAGES}`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const dx = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > 52) {
          if (dx < 0) handleNext();
          else handlePrev();
        }
      }}
      className="fixed inset-0 z-[6500] bg-[#020714]/82 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-text"
    >
      {/* CLOSED BOOK COVER */}
      {page === 0 ? (
        <div
          key={`cover-${turnTick}`}
          className="relative w-full max-w-[380px] animate-[fadeSlideIn_0.2s_ease-out]"
        >
          <div className="relative rounded-r-2xl rounded-l-md bg-gradient-to-br from-[#0a1a3a] via-[#061128] to-[#040b1b] border border-cyan-400/45 border-r-[6px] border-r-[#1d3257] shadow-[0_24px_70px_rgba(0,0,0,0.9),6px_6px_0_rgba(148,163,184,0.16)] pl-7 pr-5 py-5 text-center overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#030816] via-[#122952] to-[#061128] border-r border-cyan-400/25" />

            <button
              type="button"
              onClick={() => {
                SFX.click();
                onClose();
              }}
              aria-label="Close Handbook"
              className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="text-[10px] font-mono-tech uppercase tracking-[3px] text-[#4fe3d4]">
              SPACEVERSE
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black text-white mt-1 leading-tight">
              SPACECRAFT ENGINEER&apos;S HANDBOOK
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/90 italic mt-1">
              &ldquo;Your Guide to Exploring the Universe&rdquo;
            </p>

            <div className="my-3.5">
              <HandbookCoverSVG />
            </div>

            <div className="border-y border-cyan-400/25 py-2 my-3 text-[11px] text-slate-200 leading-snug">
              Designed using official <span className="text-[#4fe3d4] font-semibold">NASA</span>{' '}
              data provided for all 8 missions.
            </div>

            {cadetGuideActive && (
              <div className="mb-3 rounded-xl bg-amber-400/12 border border-amber-400/50 px-3 py-2 text-left text-[11px] text-amber-100 leading-snug">
                <span className="font-mono-tech font-bold text-amber-300 uppercase block mb-0.5">
                  🎓 Cadet Training 7/8 — Handbook Navigation Exam (Step 1/4)
                </span>
                Click <strong className="text-[#4fe3d4]">OPEN HANDBOOK ▶</strong> below to inspect the Table of Contents and learn how to jump to any level.
              </div>
            )}

            <div className="flex flex-col gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  goToPage(1);
                }}
                className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-display font-extrabold text-xs tracking-wider uppercase hover:brightness-110 transition cursor-pointer ${
                  cadetGuideActive ? 'ring-2 ring-[#f2c14e] animate-[pulseTarget_1.2s_infinite]' : ''
                }`}
              >
                OPEN HANDBOOK ▶
              </button>

              {playingLevel !== null && (
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    goToPage(3 + (playingLevel - 1) * 2);
                  }}
                  className="w-full py-2 px-4 rounded-xl border border-emerald-400/45 bg-emerald-500/12 hover:bg-emerald-500/22 text-emerald-200 text-xs font-bold transition cursor-pointer"
                >
                  Open Level {String(playingLevel).padStart(2, '0')} Guide
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* OPEN BOOK SPREAD */
        <div className="w-full max-w-[860px] h-[min(90vh,655px)] flex flex-col gap-2">
          {cadetGuideActive && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[#091b38]/96 border border-amber-400/55 shadow-lg space-y-2 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] leading-snug text-slate-100">
                  <span className="font-mono-tech font-bold text-amber-300 uppercase mr-2">
                    🎓 TRAINING 7/8 // HANDBOOK NAVIGATION EXAM:
                  </span>
                  {!stepVisitedChapter ? (
                    <span>
                      Click any <strong className="text-[#4fe3d4]">Level (1–8)</strong> in the Table of Contents or the top <strong className="text-[#4fe3d4]">1–8</strong> tabs to open a mission chapter.
                    </span>
                  ) : !stepNavigated ? (
                    <span>
                      Now practice navigating: click <strong className="text-[#4fe3d4]">Next Page ▶</strong>, return to <strong className="text-[#4fe3d4]">Contents</strong>, or switch to another <strong className="text-[#4fe3d4]">1–8</strong> chapter tab.
                    </span>
                  ) : !stepUnderstoodJump ? (
                    <span>
                      Examine the <strong className="text-[#4fe3d4]">🚀 Go to Level</strong> button in the chapter header, then answer the quick check below.
                    </span>
                  ) : (
                    <span className="text-emerald-300 font-semibold">
                      Handbook navigation verified! You can jump to any level from the Handbook or continue to Task 8.
                    </span>
                  )}
                </div>

                {onCompleteCadetGuide && (
                  <button
                    type="button"
                    disabled={!allExamStepsDone}
                    onClick={() => {
                      SFX.click();
                      onCompleteCadetGuide();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-[11px] uppercase tracking-wide transition shrink-0 ${
                      allExamStepsDone
                        ? 'bg-gradient-to-r from-[#4fe3d4] to-[#34d399] text-[#041022] hover:brightness-110 cursor-pointer shadow-[0_0_16px_rgba(79,227,212,0.45)]'
                        : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {allExamStepsDone ? 'Complete Task 7 & Continue ❯' : 'Complete All 4 Steps'}
                  </button>
                )}
              </div>

              {/* 4-Step Examination Progress Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono-tech">
                {[
                  { label: '1. Open Contents', done: stepOpenedContents },
                  { label: '2. Open a Chapter', done: stepVisitedChapter },
                  { label: '3. Turn Page / Switch Tab', done: stepNavigated },
                  { label: '4. Level-Jump Check', done: stepUnderstoodJump },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`px-2 py-0.5 rounded border ${
                      item.done
                        ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-200 font-bold'
                        : 'bg-[#061126] border-white/15 text-slate-400'
                    }`}
                  >
                    {item.done ? '✓ ' : '○ '}
                    {item.label}
                  </span>
                ))}
              </div>

              {/* Step 4 Quick Understanding Check */}
              {stepVisitedChapter && stepNavigated && !stepUnderstoodJump && (
                <div className="pt-1.5 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold text-amber-200">
                    Quick Check: How can you jump directly to any mission level while reading the Handbook?
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {[
                      'Open a level chapter (Contents or 1–8) & click "🚀 Go to Level"',
                      'Close the Handbook and press Reset',
                      'Return to the Cover and flip backwards',
                    ].map((opt, idx) => {
                      const picked = navQuizPicked === idx;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setNavQuizPicked(idx);
                            if (idx === 0) SFX.snapCorrect();
                            else SFX.snapWrong();
                          }}
                          className={`text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] leading-snug transition cursor-pointer ${
                            picked && idx !== 0
                              ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                              : 'bg-[#061126] border-cyan-400/30 hover:border-cyan-300 text-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Top Book Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#07142b]/95 border border-cyan-400/30 text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display font-bold text-white text-xs truncate">
                📖 Spacecraft Engineer&apos;s Handbook
              </span>
              {playingLevel !== null && (
                <span className="hidden sm:inline text-[10px] font-mono-tech font-bold text-emerald-300 whitespace-nowrap">
                  · YOU ARE CURRENTLY PLAYING: LEVEL {String(playingLevel).padStart(2, '0')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  goToPage(0);
                }}
                className="px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer whitespace-nowrap"
              >
                Cover
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  goToPage(1, page >= 3);
                }}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  page <= 2
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Contents
              </button>
              <span className="text-white/15 px-0.5">|</span>
              {HANDBOOK_LEVELS.map((lvl) => {
                const active = currentSection?.level === lvl.level;
                const highlightTabs = cadetGuideActive && (!stepVisitedChapter || !stepNavigated);
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => {
                      SFX.click();
                      goToPage(lvl.leftPage);
                    }}
                    title={`Level ${lvl.level}: ${lvl.title}`}
                    className={`w-6 h-6 rounded text-[10px] font-mono-tech font-bold transition cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[#4fe3d4] text-[#041022]'
                        : playingLevel === lvl.level
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35'
                        : highlightTabs
                        ? 'bg-amber-400/15 text-amber-200 border border-amber-400/45 hover:bg-amber-400/30'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {lvl.level}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onClose();
                }}
                className="ml-1.5 px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-400/35 text-[11px] font-bold text-red-200 transition cursor-pointer whitespace-nowrap"
              >
                {playingLevel ? 'Resume ✕' : 'Close ✕'}
              </button>
            </div>
          </div>

          {playingLevel !== null && (
            <div className="sm:hidden text-center text-[10px] font-mono-tech font-bold text-emerald-300 shrink-0">
              YOU ARE CURRENTLY PLAYING: LEVEL {String(playingLevel).padStart(2, '0')}
            </div>
          )}

          {/* TWO FACING BOOK PAGES */}
          <div className="flex-1 min-h-0 p-1.5 sm:p-2 rounded-2xl bg-[#040b18] border border-cyan-400/35 shadow-[0_24px_70px_rgba(0,0,0,0.9)] flex">
            <div
              key={`spread-${isDesktop ? leftPageNum : page}-${turnTick}`}
              className="flex-1 min-h-0 rounded-xl border-x-[4px] border-[#1c3052] bg-[#08152b] grid grid-cols-1 md:grid-cols-2 relative overflow-hidden animate-[fadeSlideIn_0.18s_ease-out]"
            >
              {/* Center Spine Gutter */}
              <div className="hidden md:block pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-transparent via-black/55 to-transparent z-10" />
              <div className="hidden md:block pointer-events-none absolute inset-y-0 left-1/2 w-px bg-cyan-300/15 z-10" />

              {/* LEFT PAGE */}
              <div
                ref={leftPageRef}
                className="overflow-y-auto px-5 py-3.5 md:pr-7 flex flex-col justify-between bg-[#08152b] md:shadow-[inset_-12px_0_24px_rgba(2,6,18,0.45)]"
              >
                <div>{renderBookPage(isDesktop ? leftPageNum : page)}</div>
                <div className="pt-2 mt-2 border-t border-white/8 flex items-center justify-between text-[10px] font-mono-tech text-slate-400 tabular-nums shrink-0">
                  <span>p. {isDesktop ? leftPageNum : page}</span>
                  <span className="truncate">Spacecraft Engineer&apos;s Handbook</span>
                </div>
              </div>

              {/* RIGHT PAGE (Desktop) */}
              <div
                ref={rightPageRef}
                className="hidden md:flex flex-col justify-between overflow-y-auto px-5 py-3.5 md:pl-7 border-l border-white/5 bg-[#071327] shadow-[inset_12px_0_24px_rgba(2,6,18,0.45)]"
              >
                <div>{renderBookPage(rightPageNum)}</div>
                <div className="pt-2 mt-2 border-t border-white/8 flex items-center justify-between text-[10px] font-mono-tech text-slate-400 tabular-nums shrink-0">
                  <span className="truncate">
                    {currentSection ? currentSection.sectorTag : 'NASA Reference Edition'}
                  </span>
                  <span>p. {rightPageNum}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Page Turner */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#07142b]/95 border border-cyan-400/30 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/12 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap"
            >
              ◀ Previous Page
            </button>

            <div className="flex items-center gap-3">
              {page > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    goToPage(1);
                  }}
                  className="hidden sm:inline text-[11px] font-semibold text-amber-200/90 hover:text-amber-100 underline cursor-pointer"
                >
                  Contents
                </button>
              )}
              <span className="text-[11px] font-mono-tech text-[#4fe3d4] tabular-nums">
                {pageStatusLabel}
              </span>
            </div>

            <button
              type="button"
              disabled={isAtLastPage}
              onClick={handleNext}
              className="px-3 py-1 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-semibold text-[#4fe3d4] transition cursor-pointer whitespace-nowrap"
            >
              Next Page ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
