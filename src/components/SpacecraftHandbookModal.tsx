import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

const TAB_COLORS = [
  '#e07a5f', // L1 coral
  '#f2a65a', // L2 amber
  '#81b29a', // L3 sage
  '#5e8b7e', // L4 teal
  '#4ea8de', // L5 sky
  '#7678ed', // L6 indigo
  '#d97757', // L7 terracotta
  '#c95d63', // L8 crimson
];

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
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
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

  const goToPage = (targetPage: number, markNav = false, dirHint?: 'next' | 'prev') => {
    const clamped = Math.max(0, Math.min(TOTAL_PAGES, targetPage));
    if (clamped !== page) {
      SFX.pageTurn();
      setFlipDir(dirHint ?? (clamped >= page ? 'next' : 'prev'));
    } else {
      SFX.click();
    }
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
    if (page === 0) {
      goToPage(1, false, 'next');
      return;
    }
    const step = isDesktop ? 2 : 1;
    const base = isDesktop ? (page % 2 === 1 ? page : page - 1) : page;
    if (base + step <= TOTAL_PAGES) {
      goToPage(base + step, true, 'next');
    }
  };

  const handlePrev = () => {
    if (page <= 1 || (isDesktop && page <= 2)) {
      goToPage(0, false, 'prev');
      return;
    }
    const step = isDesktop ? 2 : 1;
    const base = isDesktop ? (page % 2 === 1 ? page : page - 1) : page;
    goToPage(Math.max(1, base - step), true, 'prev');
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

  const graphPaperStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(to right, rgba(164, 134, 96, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(164, 134, 96, 0.14) 1px, transparent 1px)',
    backgroundSize: '18px 18px',
  };

  const renderBookPage = (p: number) => {
    // Pages 1-2: Table of Contents
    if (p === 1) {
      return (
        <div className="space-y-3 text-[#2b1d12]">
          <div className="border-b-2 border-[#b48a5a]/45 pb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono-tech uppercase tracking-[2.4px] text-[#9a3412] font-bold">
                FIELD INDEX // CONTENTS
              </div>
              <h2 className="font-display text-lg sm:text-xl font-black text-[#2b1d12] mt-0.5">
                YOUR MISSION GUIDE
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full border-2 border-[#9a3412]/50 bg-[#e9d5b5] text-[9px] font-mono-tech font-black text-[#9a3412] rotate-[-4deg]">
              NASA DATA
            </span>
          </div>

          <div className="divide-y divide-[#b48a5a]/25">
            {HANDBOOK_LEVELS.slice(0, 4).map((lvl) => {
              const isDone = completedLevels.includes(lvl.level);
              const isNow = playingLevel === lvl.level;
              return (
                <button
                  key={lvl.level}
                  type="button"
                  onClick={() => goToPage(lvl.leftPage)}
                  className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-[#d6be96]/40 transition cursor-pointer group"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xs sm:text-[13px] font-extrabold text-[#2b1d12] group-hover:text-[#9a3412] transition">
                      {lvl.icon} Level {String(lvl.level).padStart(2, '0')} — {lvl.title}
                    </span>
                    <span className="flex-1 border-b border-dotted border-[#8c6843]/45 mx-1.5 hidden sm:block" />
                    <span className="text-[11px] font-mono-tech font-bold text-[#0f766e] tabular-nums shrink-0">
                      {isNow ? 'Active · ' : isDone ? '✓ · ' : ''}p. {lvl.leftPage}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5c4330] mt-0.5 leading-snug">
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
        <div className="flex flex-col justify-between h-full gap-3 text-[#2b1d12]">
          <div>
            <div className="border-b-2 border-[#b48a5a]/45 pb-2 mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-mono-tech font-bold uppercase tracking-[2px] text-[#6d4c33]">
                MISSIONS 05 – 08
              </span>
              <span className="text-[10px] font-mono-tech font-bold text-[#6d4c33]">PAGE INDEX</span>
            </div>

            <div className="divide-y divide-[#b48a5a]/25">
              {HANDBOOK_LEVELS.slice(4, 8).map((lvl) => {
                const isDone = completedLevels.includes(lvl.level);
                const isNow = playingLevel === lvl.level;
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => goToPage(lvl.leftPage)}
                    className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-[#d6be96]/40 transition cursor-pointer group"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-xs sm:text-[13px] font-extrabold text-[#2b1d12] group-hover:text-[#9a3412] transition">
                        {lvl.icon} Level {String(lvl.level).padStart(2, '0')} — {lvl.title}
                      </span>
                      <span className="flex-1 border-b border-dotted border-[#8c6843]/45 mx-1.5 hidden sm:block" />
                      <span className="text-[11px] font-mono-tech font-bold text-[#0f766e] tabular-nums shrink-0">
                        {isNow ? 'Active · ' : isDone ? '✓ · ' : ''}p. {lvl.leftPage}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5c4330] mt-0.5 leading-snug">
                      {lvl.tocDescription}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative rounded-xl bg-[#ead9bc] border border-[#b48a5a]/50 p-3 shadow-inner">
            <span className="absolute -top-2 right-4 px-2 py-0.5 bg-[#d6be96] text-[9px] font-mono-tech font-bold text-[#5c4330] rotate-2 border border-[#b48a5a]/40">
              NOTE
            </span>
            <p className="text-[11px] text-[#4a3525] italic leading-relaxed">
              Click any level row, use the colorful side bookmark tabs, or flip with Next / Previous Page to study spacecraft systems mid-mission.
            </p>
          </div>
        </div>
      );
    }

    const section = levelForPage(p);
    if (!section) return null;
    const isLeftSide = p % 2 === 1;
    const isDone = completedLevels.includes(section.level);

    // LEFT PAGE: Mission Goal, Simple Science, Key Parts
    if (isLeftSide) {
      return (
        <div className="space-y-3 text-[#2b1d12]">
          <div className="border-b-2 border-[#b48a5a]/45 pb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-tech font-extrabold uppercase tracking-[2px] text-[#9a3412]">
                  {section.code} · {section.tier}
                </span>
                {isDone && (
                  <span className="px-1.5 py-0.5 rounded bg-[#0f766e]/15 border border-[#0f766e]/40 text-[9px] font-mono-tech font-black text-[#0f766e]">
                    CLEARED ✓
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg font-black text-[#2b1d12] mt-0.5">
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
                  className={`px-2.5 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-[#fefae0] font-extrabold text-[10px] uppercase tracking-wide transition cursor-pointer shadow ${
                    cadetGuideActive
                      ? 'ring-2 ring-[#d97706] animate-[pulseTarget_1.2s_infinite]'
                      : ''
                  }`}
                >
                  🚀 Go to Level {String(section.level).padStart(2, '0')} ▶
                </button>
                {cadetGuideActive && (
                  <span className="text-[9px] font-mono-tech font-bold text-[#9a3412]">
                    Direct Level Jump
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-[#7c2d12]">
              What You Do
            </h4>
            <p className="text-xs sm:text-[13px] text-[#2b1d12] leading-relaxed font-medium">
              {section.whatYouDo}
            </p>
          </div>

          <div className="rounded-xl bg-[#efe1c6] border border-[#b48a5a]/45 p-2.5 space-y-1">
            <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-[#0f766e]">
              The Simple Science — {section.bigIdeaTitle}
            </h4>
            <p className="text-xs sm:text-[12.5px] text-[#3e2b1d] leading-relaxed">
              {section.bigIdeaText}
            </p>
          </div>

          <div className="border-t border-[#b48a5a]/35 pt-2 space-y-1.5">
            <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-[#7c2d12]">
              Key Field Parts
            </h4>
            <ul className="space-y-1.5 text-xs">
              {section.parts.map((part) => (
                <li key={part.name} className="leading-snug flex items-start gap-1.5">
                  <span className="text-[#9a3412] font-bold">▸</span>
                  <div>
                    <span className="font-extrabold text-[#2b1d12]">{part.name}</span>
                    <span className="text-[#6d4c33]"> — </span>
                    <span className="text-[#4a3525]">{part.meaning}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    // RIGHT PAGE: Taped Blueprint Photo, How to Complete, Troubleshooting, Quick Check
    const q = section.quiz;
    const picked = quizAnswers[q.id];
    const isCorrect = picked === q.correctIndex;

    return (
      <div className="space-y-3 text-[#2b1d12]">
        {/* Taped / Paperclipped Technical Diagram Polaroid */}
        <figure className="relative bg-[#0b1930] p-2 rounded-lg border-2 border-[#d4be98] shadow-[2px_4px_10px_rgba(43,29,18,0.22)]">
          {/* Masking tape strips */}
          <span className="pointer-events-none absolute -top-2 left-4 w-10 h-3 bg-[#e6d19c]/85 rotate-[-6deg] border border-[#b89f68]/40" />
          <span className="pointer-events-none absolute -top-2 right-5 w-10 h-3 bg-[#e6d19c]/85 rotate-[7deg] border border-[#b89f68]/40" />
          <HandbookLevelDiagramSVG level={section.level} />
          <figcaption className="text-[10px] text-[#cbd5e1] italic text-center pt-1 font-mono-tech">
            {section.diagramCaption}
          </figcaption>
        </figure>

        <div className="border-t border-[#b48a5a]/35 pt-2 space-y-1">
          <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-[#0f766e]">
            How to Complete
          </h4>
          <ol className="list-decimal list-inside space-y-0.5 text-xs text-[#2b1d12] leading-snug font-medium">
            {section.howToWin.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-[11px] text-[#9a3412] font-semibold italic pt-0.5">
            ★ {section.cheatNote}
          </p>
        </div>

        <div className="border-t border-[#b48a5a]/35 pt-2 space-y-1">
          <h4 className="text-[11px] font-display font-black uppercase tracking-wider text-[#991b1b]">
            Stuck? Field Fixes
          </h4>
          <ul className="space-y-0.5 text-[11.5px] text-[#3e2b1d] leading-snug">
            {section.troubleshooting.map((item) => (
              <li key={item.stuck}>
                <span className="font-bold text-[#2b1d12]">{item.stuck}:</span> {item.fix}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-[#efe1c6] border border-[#b48a5a]/45 p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-[10.5px] font-display font-black uppercase tracking-wider text-[#0f766e]">
              Quick Field Quiz
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
                className="text-[10px] font-mono-tech text-[#7c2d12] hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-[#2b1d12] leading-snug">{q.question}</div>
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
                        ? 'bg-[#0f766e]/20 text-[#064e3b] font-bold'
                        : 'bg-[#dc2626]/18 text-[#7f1d1d] font-bold'
                      : 'text-[#3e2b1d] hover:bg-[#d6be96]/50'
                  }`}
                >
                  <span className="font-mono-tech font-bold text-[#7c2d12] mr-1.5">{letter}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== undefined && (
            <p
              className={`text-[11px] font-semibold leading-snug ${
                isCorrect ? 'text-[#065f46]' : 'text-[#991b1b]'
              }`}
            >
              {isCorrect ? '✓ Correct — ' : '✖ Not quite — '}
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
      ? 'Closed Cover'
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
      className="fixed inset-0 z-[6500] bg-[#040914]/82 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-text"
    >
      {/* CLOSED BOOK COVER (Leather & Brass Journal Cover) */}
      {page === 0 ? (
        <motion.div
          key={`cover-${turnTick}`}
          initial={{ rotateY: -22, opacity: 0.4, scale: 0.96 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ perspective: 1200 }}
          className="relative w-full max-w-[395px]"
        >
          {/* Brass Leather Clasp Strap on Right */}
          <div className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-12 rounded-r-xl bg-[#7c512c] border-2 border-[#3f2511] shadow-lg flex items-center justify-center z-20">
            <div className="w-3 h-3 rounded-full bg-[#e5b869] border border-[#5c3a1e]" />
          </div>

          <div className="relative rounded-r-2xl rounded-l-md bg-gradient-to-br from-[#6b4423] via-[#533318] to-[#3c230f] border-[3px] border-[#2e1a0b] border-r-[8px] border-r-[#d6be96] shadow-[0_24px_70px_rgba(0,0,0,0.9),8px_8px_0_rgba(245,232,208,0.22)] pl-8 pr-6 py-6 text-center overflow-hidden">
            {/* Spine stitching & brass corner brackets */}
            <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-[#2e1a0b] via-[#5d391c] to-[#3c230f] border-r-2 border-dashed border-[#d4a359]/45" />
            <div className="absolute top-0 right-0 w-7 h-7 border-b-2 border-l-2 border-[#e5b869]/60 rounded-bl-lg bg-[#c59648]/25" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-t-2 border-l-2 border-[#e5b869]/60 rounded-tl-lg bg-[#c59648]/25" />

            <button
              type="button"
              onClick={() => {
                SFX.click();
                onClose();
              }}
              aria-label="Close Handbook"
              className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold text-[#f5e8d0]/80 hover:text-white hover:bg-black/25 transition cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="text-[10px] font-mono-tech uppercase tracking-[3px] text-[#f3cb78] font-bold">
              SPACEVERSE FIELD JOURNAL
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black text-[#fff7e6] mt-1 leading-tight drop-shadow">
              SPACECRAFT ENGINEER&apos;S HANDBOOK
            </h1>
            <p className="text-xs sm:text-sm text-[#f3cb78] italic mt-1">
              &ldquo;Your Guide to Exploring the Universe&rdquo;
            </p>

            <div className="my-4 p-2 rounded-xl bg-[#0b1930]/80 border-2 border-[#e5b869]/45 shadow-inner">
              <HandbookCoverSVG />
            </div>

            <div className="border-y border-[#e5b869]/35 py-2 my-3 text-[11px] text-[#f5e8d0] leading-snug">
              Field reference edition · Official{' '}
              <span className="text-[#f3cb78] font-bold">NASA</span> mission data for Levels 1–8.
            </div>

            {cadetGuideActive && (
              <div className="mb-3 rounded-xl bg-[#2a1a0a]/90 border border-[#f3cb78]/65 px-3 py-2 text-left text-[11px] text-[#fef3c7] leading-snug">
                <span className="font-mono-tech font-bold text-[#f3cb78] uppercase block mb-0.5">
                  🎓 Cadet Training 7/8 — Handbook Navigation Exam (Step 1/4)
                </span>
                Click <strong className="text-[#4fe3d4]">OPEN HANDBOOK ▶</strong> below to turn open the Table of Contents.
              </div>
            )}

            <div className="flex flex-col gap-2 mt-3">
              <button
                type="button"
                onClick={() => goToPage(1, false, 'next')}
                className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f3cb78] to-[#e09f3e] text-[#2b1a0c] font-display font-black text-xs tracking-wider uppercase hover:brightness-110 transition cursor-pointer shadow-lg ${
                  cadetGuideActive ? 'ring-2 ring-[#4fe3d4] animate-[pulseTarget_1.2s_infinite]' : ''
                }`}
              >
                OPEN HANDBOOK ▶
              </button>

              {playingLevel !== null && (
                <button
                  type="button"
                  onClick={() => goToPage(3 + (playingLevel - 1) * 2, false, 'next')}
                  className="w-full py-2 px-4 rounded-xl border border-[#e5b869]/50 bg-black/25 hover:bg-black/40 text-[#fef3c7] text-xs font-bold transition cursor-pointer"
                >
                  Flip to Level {String(playingLevel).padStart(2, '0')} ▶
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        /* OPEN RING-BINDER FIELD JOURNAL SPREAD */
        <div className="w-full max-w-[930px] h-[min(92vh,685px)] flex flex-col gap-2">
          {cadetGuideActive && (
            <div className="px-3.5 py-2.5 rounded-xl bg-[#091b38]/96 border border-amber-400/55 shadow-lg space-y-2 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] leading-snug text-slate-100">
                  <span className="font-mono-tech font-bold text-amber-300 uppercase mr-2">
                    🎓 TRAINING 7/8 // HANDBOOK NAVIGATION EXAM:
                  </span>
                  {!stepVisitedChapter ? (
                    <span>
                      Click any <strong className="text-[#4fe3d4]">Level (1–8)</strong> in the Contents or the bookmark tabs to turn to a chapter.
                    </span>
                  ) : !stepNavigated ? (
                    <span>
                      Now practice turning pages: click <strong className="text-[#4fe3d4]">Next Page ▶</strong>, return to <strong className="text-[#4fe3d4]">Contents</strong>, or pick another chapter tab.
                    </span>
                  ) : !stepUnderstoodJump ? (
                    <span>
                      Examine the <strong className="text-[#4fe3d4]">🚀 Go to Level</strong> button at the top-right of the left page, then answer below.
                    </span>
                  ) : (
                    <span className="text-emerald-300 font-semibold">
                      Handbook navigation verified! Jump to any level from the Handbook or finish Task 7.
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

              {stepVisitedChapter && stepNavigated && !stepUnderstoodJump && (
                <div className="pt-1.5 border-t border-white/10 flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold text-amber-200">
                    Quick Check: How can you jump directly to any mission level while reading the Handbook?
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {[
                      'Open a level chapter (Contents or tabs) & click "🚀 Go to Level"',
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

          {/* Top Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#2a190c]/95 border border-[#c69553]/50 text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display font-bold text-[#fff5e1] text-xs truncate">
                📖 Spacecraft Engineer&apos;s Field Journal
              </span>
              {playingLevel !== null && (
                <span className="hidden sm:inline text-[10px] font-mono-tech font-bold text-[#86efac] whitespace-nowrap">
                  · PLAYING LEVEL {String(playingLevel).padStart(2, '0')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => goToPage(0, false, 'prev')}
                className="px-2 py-1 rounded text-[11px] font-semibold text-[#f5e8d0] hover:text-white hover:bg-white/10 transition cursor-pointer whitespace-nowrap"
              >
                Cover
              </button>
              <button
                type="button"
                onClick={() => goToPage(1, page >= 3)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                  page <= 2
                    ? 'bg-[#f3cb78] text-[#2a190c] font-bold'
                    : 'text-[#f5e8d0] hover:text-white hover:bg-white/10'
                }`}
              >
                Contents
              </button>
              <span className="text-white/20 px-0.5">|</span>
              {HANDBOOK_LEVELS.map((lvl) => {
                const active = currentSection?.level === lvl.level;
                const highlightTabs = cadetGuideActive && (!stepVisitedChapter || !stepNavigated);
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => goToPage(lvl.leftPage)}
                    title={`Level ${lvl.level}: ${lvl.title}`}
                    className={`w-6 h-6 rounded text-[10px] font-mono-tech font-bold transition cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[#4fe3d4] text-[#041022]'
                        : playingLevel === lvl.level
                        ? 'bg-emerald-500/30 text-emerald-200'
                        : highlightTabs
                        ? 'bg-amber-400/25 text-amber-200 border border-amber-400/60'
                        : 'text-[#f5e8d0] hover:bg-white/15'
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
                className="ml-1.5 px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/35 border border-red-400/45 text-[11px] font-bold text-red-100 transition cursor-pointer whitespace-nowrap"
              >
                {playingLevel ? 'Resume ✕' : 'Close ✕'}
              </button>
            </div>
          </div>

          {/* PHYSICAL LEATHER-BOUND RING BINDER + STICK-OUT SIDE TABS */}
          <div className="flex-1 min-h-0 flex items-stretch relative pr-0 md:pr-8">
            {/* Stick-Out Right Edge Bookmark Tabs (Desktop) */}
            <div className="hidden md:flex flex-col justify-center gap-1.5 absolute right-0 top-6 bottom-6 w-9 z-0">
              {HANDBOOK_LEVELS.map((lvl, idx) => {
                const active = currentSection?.level === lvl.level;
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => goToPage(lvl.leftPage)}
                    title={`Turn to Level ${lvl.level}: ${lvl.title}`}
                    style={{ backgroundColor: TAB_COLORS[idx] }}
                    className={`h-10 rounded-r-lg border-y border-r border-[#3b2312]/60 shadow-md flex items-center justify-center font-mono-tech text-[11px] font-black text-[#fffaf0] transition-transform cursor-pointer ${
                      active ? 'translate-x-1.5 ring-2 ring-[#fff5e1]' : '-translate-x-1 hover:translate-x-0.5 opacity-90'
                    }`}
                  >
                    {String(lvl.level).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {/* Leather Cover Board & Brass Corners */}
            <div className="flex-1 min-h-0 relative rounded-2xl bg-gradient-to-br from-[#6d4524] via-[#543419] to-[#3f2511] border-[3px] border-[#2b180a] p-2.5 sm:p-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.92)] flex z-10">
              {/* Left Buckle Tab */}
              <div className="hidden sm:flex pointer-events-none absolute -left-3.5 top-1/2 -translate-y-1/2 w-5 h-10 rounded-l-lg bg-[#6b4423] border-2 border-[#2b180a] items-center justify-center shadow">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e5b869]" />
              </div>

              {/* Brass corner bumpers */}
              <div className="pointer-events-none absolute top-1 left-1 w-6 h-6 border-t-[3px] border-l-[3px] border-[#d4a359] rounded-tl-xl" />
              <div className="pointer-events-none absolute bottom-1 left-1 w-6 h-6 border-b-[3px] border-l-[3px] border-[#d4a359] rounded-bl-xl" />
              <div className="pointer-events-none absolute top-1 right-1 w-6 h-6 border-t-[3px] border-r-[3px] border-[#d4a359] rounded-tr-xl" />
              <div className="pointer-events-none absolute bottom-1 right-1 w-6 h-6 border-b-[3px] border-r-[3px] border-[#d4a359] rounded-br-xl" />

              {/* Book Block (Cream Graph-Paper Spread + 3D Flipping Page Leaf) */}
              <div
                style={{ perspective: 1500 }}
                className="flex-1 min-h-0 rounded-xl border border-[#9a7852] bg-[#d8c3a0] grid grid-cols-1 md:grid-cols-2 relative overflow-hidden shadow-inner"
              >
                {/* Realistic 3D Turning Page Leaf Effect */}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`flip-${turnTick}`}
                    initial={{
                      rotateY: flipDir === 'next' ? 0 : -180,
                      opacity: 0.72,
                    }}
                    animate={{
                      rotateY: flipDir === 'next' ? -180 : 0,
                      opacity: 0,
                    }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      transformOrigin: 'left center',
                      ...graphPaperStyle,
                    }}
                    className="hidden md:block pointer-events-none absolute inset-y-0 left-1/2 right-0 bg-[#f6ebd8] border-l border-[#a48660]/50 shadow-[-12px_0_28px_rgba(43,29,18,0.35)] z-30"
                  />
                </AnimatePresence>

                {/* Center Ring-Binder Spine & Metallic C-Rings */}
                <div className="hidden md:flex pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-12 flex-col justify-evenly items-center z-20">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 bg-gradient-to-r from-[#2b1d12]/25 via-[#2b1d12]/55 to-[#2b1d12]/25" />
                  {[0, 1, 2, 3, 4, 5].map((ring) => (
                    <div key={ring} className="relative flex items-center justify-center w-11 h-4">
                      {/* Punched holes */}
                      <span className="absolute left-0.5 w-2.5 h-2.5 rounded-full bg-[#3f2511] border border-[#a48660]/50" />
                      <span className="absolute right-0.5 w-2.5 h-2.5 rounded-full bg-[#3f2511] border border-[#a48660]/50" />
                      {/* Brass/Bronze Binder Ring */}
                      <div className="w-9 h-2.5 rounded-full bg-gradient-to-b from-[#d4a359] via-[#9c6f34] to-[#5c3a1e] border border-[#2e1a0b] shadow-md" />
                    </div>
                  ))}
                </div>

                {/* LEFT CREAM GRAPH-PAPER PAGE */}
                <div
                  ref={leftPageRef}
                  style={graphPaperStyle}
                  className="overflow-y-auto px-5 py-4 md:pr-9 flex flex-col justify-between bg-[#f7ecda] md:shadow-[inset_-14px_0_24px_rgba(92,58,30,0.16)]"
                >
                  <motion.div
                    key={`left-content-${leftPageNum}-${turnTick}`}
                    initial={{ opacity: 0.45, x: flipDir === 'next' ? 12 : -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    {renderBookPage(isDesktop ? leftPageNum : page)}
                  </motion.div>
                  <div className="pt-2 mt-3 border-t border-[#b48a5a]/35 flex items-center justify-between text-[10px] font-mono-tech font-bold text-[#7c5c3e] tabular-nums shrink-0">
                    <span>p. {isDesktop ? leftPageNum : page}</span>
                    <span className="truncate">Spacecraft Engineer&apos;s Handbook</span>
                  </div>
                </div>

                {/* RIGHT CREAM GRAPH-PAPER PAGE (Desktop) */}
                <div
                  ref={rightPageRef}
                  style={graphPaperStyle}
                  className="hidden md:flex flex-col justify-between overflow-y-auto px-5 py-4 md:pl-9 border-l border-[#b48a5a]/35 bg-[#f3e5cd] shadow-[inset_14px_0_24px_rgba(92,58,30,0.16)]"
                >
                  <motion.div
                    key={`right-content-${rightPageNum}-${turnTick}`}
                    initial={{ opacity: 0.45, x: flipDir === 'next' ? 12 : -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    {renderBookPage(rightPageNum)}
                  </motion.div>
                  <div className="pt-2 mt-3 border-t border-[#b48a5a]/35 flex items-center justify-between text-[10px] font-mono-tech font-bold text-[#7c5c3e] tabular-nums shrink-0">
                    <span className="truncate">
                      {currentSection ? currentSection.sectorTag : 'NASA Reference Edition'}
                    </span>
                    <span>p. {rightPageNum}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Physical Page Turner Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#2a190c]/95 border border-[#c69553]/50 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              className="px-3.5 py-1.5 rounded-lg bg-[#543419] hover:bg-[#6d4524] border border-[#c69553]/45 text-xs font-bold text-[#fff5e1] transition cursor-pointer whitespace-nowrap"
            >
              ◀ Previous Page
            </button>

            <div className="flex items-center gap-3">
              {page > 2 && (
                <button
                  type="button"
                  onClick={() => goToPage(1, false, 'prev')}
                  className="hidden sm:inline text-[11px] font-bold text-[#f3cb78] hover:text-[#fff5e1] underline cursor-pointer"
                >
                  Contents
                </button>
              )}
              <span className="text-[11px] font-mono-tech font-bold text-[#f5e8d0] tabular-nums">
                {pageStatusLabel}
              </span>
            </div>

            <button
              type="button"
              disabled={isAtLastPage}
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#f3cb78] to-[#e09f3e] hover:brightness-110 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-black text-[#2b1a0c] transition cursor-pointer whitespace-nowrap"
            >
              Next Page ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
