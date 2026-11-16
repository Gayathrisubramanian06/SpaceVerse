import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlayerState, STORE_ITEMS, StoreItemSpec, StoreMissionGroup } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { StoreItemIllustrationSVG } from './StoreItemIllustrationsSVG';

interface GalaxyStoreReturnContext {
  levelNum: number;
  levelTitle: string;
  requiredItemId?: string;
}

interface GalaxyStoreModalProps {
  visible: boolean;
  playerState: PlayerState;
  initialTab?: FilterTab;
  returnContext?: GalaxyStoreReturnContext | null;
  onContinueToLevel?: (levelNum: number) => void;
  onClose: () => void;
  onPurchaseItem: (item: StoreItemSpec) => Promise<{ ok: boolean; message: string }>;
}

type FilterTab = 'all' | StoreMissionGroup;

interface DeductionBurst {
  id: number;
  amount: number;
  itemName: string;
}

export const GalaxyStoreModal: React.FC<GalaxyStoreModalProps> = ({
  visible,
  playerState,
  initialTab,
  returnContext,
  onContinueToLevel,
  onClose,
  onPurchaseItem,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab || 'level_7');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [deductionBursts, setDeductionBursts] = useState<DeductionBurst[]>([]);

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    } else if (visible && !initialTab && !returnContext) {
      setActiveTab('level_7');
    }
  }, [visible, initialTab, returnContext]);

  // Animated rolling Star Credits counter
  const [displayStar, setDisplayStar] = useState<number>(playerState.starCredits);
  const displayStarRef = useRef<number>(playerState.starCredits);
  const prevStarRef = useRef<number>(playerState.starCredits);
  const [walletFlash, setWalletFlash] = useState<'idle' | 'spend' | 'error'>('idle');

  useEffect(() => {
    const from = displayStarRef.current;
    const to = playerState.starCredits;
    if (from === to) return;

    if (to < from) {
      setWalletFlash('spend');
      const flashTimer = window.setTimeout(() => setWalletFlash('idle'), 700);
      const start = performance.now();
      const duration = 620;
      let raf = 0;

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(from + (to - from) * eased);
        displayStarRef.current = val;
        setDisplayStar(val);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          displayStarRef.current = to;
          setDisplayStar(to);
        }
      };
      raf = requestAnimationFrame(step);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(flashTimer);
      };
    }

    displayStarRef.current = to;
    setDisplayStar(to);
  }, [playerState.starCredits]);

  useEffect(() => {
    prevStarRef.current = playerState.starCredits;
  }, [playerState.starCredits]);

  const unlockedSet = useMemo(
    () => new Set(playerState.unlockedStoreItems ?? []),
    [playerState.unlockedStoreItems]
  );

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return STORE_ITEMS;
    return STORE_ITEMS.filter((item) => item.missionGroup === activeTab);
  }, [activeTab]);

  if (!visible) return null;

  const totalCount = STORE_ITEMS.length;
  const unlockedCount = STORE_ITEMS.filter((i) => unlockedSet.has(i.id)).length;
  const lvl7Count = STORE_ITEMS.filter((i) => i.missionGroup === 'level_7').length;
  const lvl7Unlocked = STORE_ITEMS.filter(
    (i) => i.missionGroup === 'level_7' && unlockedSet.has(i.id)
  ).length;
  const requiredSpec = returnContext?.requiredItemId
    ? STORE_ITEMS.find((i) => i.id === returnContext.requiredItemId) || null
    : null;
  const isRequiredUnlocked = requiredSpec ? unlockedSet.has(requiredSpec.id) : true;

  const handleBuy = async (item: StoreItemSpec) => {
    if (unlockedSet.has(item.id) || buyingId) return;
    setBuyingId(item.id);
    setErrorBanner(null);

    const result = await onPurchaseItem(item);

    if (result.ok) {
      const burstId = Date.now();
      setDeductionBursts((prev) => [
        ...prev,
        { id: burstId, amount: item.priceStarCredits, itemName: item.name },
      ]);
      setJustUnlockedId(item.id);
      window.setTimeout(() => {
        setDeductionBursts((prev) => prev.filter((b) => b.id !== burstId));
      }, 1350);
      window.setTimeout(() => {
        setJustUnlockedId((cur) => (cur === item.id ? null : cur));
      }, 1600);
    } else {
      setWalletFlash('error');
      setErrorBanner(result.message);
      window.setTimeout(() => setWalletFlash('idle'), 550);
    }
    setBuyingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[5800] bg-black/82 backdrop-blur-sm flex items-center justify-center p-3 md:p-5"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="w-full max-w-5xl max-h-[90vh] rounded-3xl bg-[#050c1c] border border-cyan-400/45 shadow-[0_28px_80px_rgba(0,0,0,0.92)] flex flex-col overflow-hidden"
      >
        {/* Header with Animated Wallet Deduction */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0a1936] via-[#0e2348] to-[#0a1936] border-b border-cyan-400/35 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -6, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-11 h-11 rounded-2xl bg-[#061126] border-2 border-amber-400/75 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(251,191,36,0.35)]"
            >
              🛒
            </motion.div>
            <div>
              <div className="text-[10px] font-mono-tech uppercase tracking-[2px] text-[#4fe3d4]">
                GALAXY-X ARMORY
              </div>
              <h2 className="font-display text-base md:text-lg font-extrabold text-white leading-tight">
                MISSION GEAR STORE
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Animated Star Credits Wallet Pill */}
            <div className="relative">
              <motion.div
                animate={
                  walletFlash === 'spend'
                    ? {
                        scale: [1, 1.14, 0.96, 1],
                        boxShadow: [
                          '0 0 0px rgba(251,191,36,0)',
                          '0 0 26px rgba(244,63,94,0.85)',
                          '0 0 18px rgba(79,227,212,0.5)',
                          '0 0 0px rgba(251,191,36,0)',
                        ],
                      }
                    : walletFlash === 'error'
                    ? { x: [0, -5, 5, -4, 4, 0] }
                    : {}
                }
                transition={{ duration: 0.55 }}
                className={`px-3.5 py-1.5 rounded-full border flex items-center gap-1.5 text-xs font-mono-tech font-extrabold transition-colors ${
                  walletFlash === 'spend'
                    ? 'bg-rose-950/80 border-rose-400 text-amber-200'
                    : walletFlash === 'error'
                    ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                    : 'bg-[#061126] border-amber-400/55 text-amber-300'
                }`}
              >
                <span className="text-sm">★</span>
                <span className="tabular-nums text-sm">{displayStar.toLocaleString()} SC</span>
              </motion.div>

              {/* Floating Money Deduction Popups */}
              <AnimatePresence>
                {deductionBursts.map((burst) => (
                  <motion.div
                    key={burst.id}
                    initial={{ opacity: 0, y: 4, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [-2, -16, -34, -46], scale: [0.85, 1.15, 1, 0.9] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 whitespace-nowrap px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-white font-mono-tech text-xs font-black shadow-[0_6px_20px_rgba(244,63,94,0.65)] border border-amber-200/70"
                  >
                    -★ {burst.amount.toLocaleString()} SC
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Unlock Meter Pill */}
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/45 flex items-center gap-2 text-xs font-mono-tech font-bold text-emerald-300">
              <span>🔓</span>
              <span className="tabular-nums">
                {unlockedCount}/{totalCount}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                SFX.click();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Visual Filter Tabs + Progress Bar */}
        <div className="px-5 py-2.5 bg-[#071228] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                SFX.select();
                setActiveTab('level_7');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                activeTab === 'level_7'
                  ? 'bg-sky-400 text-[#031224] border-sky-300'
                  : 'bg-[#0b1833] text-sky-200 border-sky-400/30 hover:border-sky-400/65'
              }`}
            >
              🌕 Lvl 7: Lunar ({lvl7Unlocked}/{lvl7Count})
            </button>
            <button
              type="button"
              onClick={() => {
                SFX.select();
                setActiveTab('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#4fe3d4] text-[#041022] border-[#4fe3d4]'
                  : 'bg-[#0b1833] text-slate-300 border-white/15 hover:border-cyan-400/50'
              }`}
            >
              🛸 All ({unlockedCount}/{totalCount})
            </button>
          </div>

          {/* Visual Progress Pip Strip */}
          <div className="flex items-center gap-1.5">
            {STORE_ITEMS.map((it) => {
              const owned = unlockedSet.has(it.id);
              return (
                <span
                  key={it.id}
                  title={it.name}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    owned
                      ? 'w-4 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Mission Return Banner when opened from a Level Briefing */}
        {returnContext && (
          <div className="mx-5 mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#0b1f3f] via-[#0e2648] to-[#081934] border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-[0_0_24px_rgba(251,191,36,0.16)]">
            <div className="flex items-center gap-3 min-w-0">
              {requiredSpec && (
                <div className="w-16 h-12 rounded-xl overflow-hidden border border-white/15 bg-[#040b18] shrink-0">
                  <StoreItemIllustrationSVG itemId={requiredSpec.id} unlocked={isRequiredUnlocked} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-[10px] font-mono-tech font-extrabold text-amber-300 uppercase">
                    LEVEL 0{returnContext.levelNum} REQUISITION
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-extrabold uppercase border ${
                      isRequiredUnlocked
                        ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                    }`}
                  >
                    {isRequiredUnlocked
                      ? '✓ READY TO PLAY'
                      : `🔒 SELECT & BUY (${requiredSpec ? `★ ${requiredSpec.priceStarCredits} SC` : 'BELOW'})`}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                  {returnContext.levelTitle}
                  {requiredSpec ? ` — ${requiredSpec.icon} ${requiredSpec.name}` : ''}
                </div>
              </div>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                SFX.click();
                if (onContinueToLevel) {
                  onContinueToLevel(returnContext.levelNum);
                } else {
                  onClose();
                }
              }}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wide transition cursor-pointer shrink-0 ${
                isRequiredUnlocked
                  ? 'bg-gradient-to-r from-emerald-400 via-[#4fe3d4] to-sky-400 text-[#041022] shadow-[0_0_22px_rgba(52,211,153,0.55)] animate-pulse'
                  : 'bg-[#09152b] hover:bg-[#112446] border border-cyan-400/45 text-cyan-200'
              }`}
            >
              CONTINUE TO LEVEL 0{returnContext.levelNum} ▶
            </motion.button>
          </div>
        )}

        {/* Compact Error Toast */}
        <AnimatePresence>
          {errorBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mt-2.5 px-4 py-2 rounded-xl border bg-rose-500/15 border-rose-400/50 text-rose-200 text-xs font-bold flex items-center justify-between"
            >
              <span>⚠ {errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-[11px] opacity-75 hover:opacity-100 cursor-pointer ml-3"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Showcase Item Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isUnlocked = unlockedSet.has(item.id);
              const isJustUnlocked = justUnlockedId === item.id;
              const isMissionRequired = returnContext?.requiredItemId === item.id;
              const canAfford = playerState.starCredits >= item.priceStarCredits;
              const isBuying = buyingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={
                    isJustUnlocked
                      ? {
                          opacity: 1,
                          y: 0,
                          scale: [1, 1.04, 1],
                          boxShadow: [
                            '0 0 0px rgba(52,211,153,0)',
                            '0 0 36px rgba(52,211,153,0.75)',
                            '0 0 20px rgba(52,211,153,0.25)',
                          ],
                        }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  transition={{ duration: 0.45 }}
                  whileHover={{ y: -3 }}
                  className={`relative rounded-2xl border p-3.5 flex flex-col justify-between gap-2.5 overflow-hidden transition-colors ${
                    isUnlocked
                      ? 'bg-gradient-to-b from-[#0b2339] to-[#071526] border-emerald-400/65 shadow-[0_0_24px_rgba(52,211,153,0.16)]'
                      : isMissionRequired
                      ? 'bg-gradient-to-b from-[#1a1628] to-[#081124] border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_28px_rgba(251,191,36,0.28)]'
                      : 'bg-gradient-to-b from-[#0a162d] to-[#060f20] border-slate-600/45'
                  }`}
                >
                  {/* Unlock Shimmer Sweep Animation */}
                  {isJustUnlocked && (
                    <div
                      className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent z-20"
                      style={{ animation: 'shimmerSweep 0.85s ease-out forwards' }}
                    />
                  )}

                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 z-10 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono-tech font-bold uppercase tracking-wider border bg-sky-400/15 text-sky-300 border-sky-400/35">
                        🌕 LVL 7 LUNAR
                      </span>
                      {isMissionRequired && !isUnlocked && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-[#1b0e00] text-[9px] font-mono-tech font-black uppercase tracking-wider animate-pulse">
                          ★ REQUIRED
                        </span>
                      )}
                    </div>

                    <motion.span
                      key={isUnlocked ? 'unlocked' : 'locked'}
                      initial={isJustUnlocked ? { scale: 1.4, rotate: -10 } : false}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold uppercase border ${
                        isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/55'
                          : 'bg-slate-800/90 text-slate-300 border-slate-500/50'
                      }`}
                    >
                      {isUnlocked ? '🔓 UNLOCKED' : '🔒 LOCKED'}
                    </motion.span>
                  </div>

                  {/* Large Animated SVG Visual Stage */}
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#040b18]">
                    <div
                      className={
                        isUnlocked ? 'animate-[floatHover_3.6s_ease-in-out_infinite]' : ''
                      }
                    >
                      <StoreItemIllustrationSVG itemId={item.id} unlocked={isUnlocked} />
                    </div>

                    {/* Locked Vault Overlay */}
                    {!isUnlocked && (
                      <div className="pointer-events-none absolute inset-0 bg-slate-950/32 flex items-end justify-end p-2">
                        <motion.div
                          animate={{ scale: [1, 1.08, 1] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-8 h-8 rounded-xl bg-[#060f20]/90 border border-slate-400/50 flex items-center justify-center text-sm shadow-lg"
                        >
                          🔒
                        </motion.div>
                      </div>
                    )}

                    {/* Floating -SC Deduction Stamp on Card When Just Bought */}
                    <AnimatePresence>
                      {isJustUnlocked && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6, y: 12 }}
                          animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.15, 1, 0.95], y: [12, -6, -18, -30] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.25 }}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
                        >
                          <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 text-white font-mono-tech text-xs font-black shadow-[0_0_24px_rgba(251,191,36,0.7)] border border-white/60">
                            -★ {item.priceStarCredits} SC • UNLOCKED!
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Minimal Title & Micro-Tag */}
                  <div className="z-10">
                    <h3 className="font-display text-sm font-extrabold text-white leading-tight truncate">
                      {item.icon} {item.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#050c1b] border border-cyan-400/20 text-[10px] font-mono-tech text-[#4fe3d4]">
                        {item.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#050c1b] border border-white/10 text-[10px] text-slate-300 truncate">
                        {item.roleTag}
                      </span>
                    </div>
                  </div>

                  {/* Price & Animated Unlock Button */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 z-10">
                    <div className="font-mono-tech text-xs font-extrabold text-amber-300 tabular-nums">
                      ★ {item.priceStarCredits.toLocaleString()} SC
                    </div>

                    {isUnlocked ? (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-extrabold uppercase tracking-wide">
                        ✓ Owned
                      </div>
                    ) : (
                      <motion.button
                        type="button"
                        whileTap={canAfford && !isBuying ? { scale: 0.93 } : undefined}
                        disabled={!canAfford || isBuying}
                        onClick={() => handleBuy(item)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition ${
                          canAfford && !isBuying
                            ? 'bg-gradient-to-r from-[#f2c14e] to-[#f59e0b] text-[#051022] hover:brightness-110 shadow-[0_6px_18px_rgba(245,158,11,0.35)] cursor-pointer'
                            : 'bg-slate-800 text-slate-400 border border-white/10 cursor-not-allowed'
                        }`}
                      >
                        {isBuying
                          ? '...'
                          : canAfford
                          ? `Buy ★ ${item.priceStarCredits}`
                          : `🔒 ★ ${item.priceStarCredits}`}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
