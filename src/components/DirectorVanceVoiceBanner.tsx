import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SFX } from '../utils/sfx';

interface DirectorVanceVoiceBannerProps {
  speaker?: string;
  quote: string;
  autoPlayKey?: string | number | null;
  compact?: boolean;
  accentColor?: 'cyan' | 'amber';
}

export const DirectorVanceVoiceAvatarSVG: React.FC<{
  speaking: boolean;
  sizeClass?: string;
}> = ({ speaking, sizeClass = 'w-16 h-16 sm:w-20 sm:h-20' }) => (
  <svg viewBox="0 0 132 132" className={`${sizeClass} shrink-0`} fill="none">
    <circle cx="66" cy="66" r="60" fill="#091833" stroke="#38bdf8" strokeWidth="2.8" />
    <path
      d="M22 118 C26 92 48 88 66 88 C84 88 106 92 110 118 Z"
      fill="#1e3a8a"
      stroke="#60a5fa"
      strokeWidth="1.5"
    />
    <rect x="57" y="72" width="18" height="16" rx="5" fill="#eab38c" />
    <ellipse cx="66" cy="54" rx="22" ry="24" fill="#f1c29b" stroke="#c28c68" strokeWidth="1.2" />
    <path
      d="M44 50 C44 29 58 23 68 24 C81 25 89 34 89 50 C85 38 74 36 64 36 C55 36 48 40 44 50 Z"
      fill="#334155"
    />
    <rect x="49" y="47" width="13" height="9" rx="3" fill="#0f172a" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
    <rect x="70" y="47" width="13" height="9" rx="3" fill="#0f172a" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
    <line x1="62" y1="51" x2="70" y2="51" stroke="#38bdf8" strokeWidth="1.4" />
    <circle cx="55.5" cy="51.5" r="2" fill="#0f172a" />
    <circle cx="76.5" cy="51.5" r="2" fill="#0f172a" />
    <path d="M42 54 A24 24 0 0 1 90 54" stroke="#4fe3d4" strokeWidth="2.6" fill="none" />
    <rect x="39" y="48" width="6.5" height="15" rx="3" fill="#0f172a" stroke="#4fe3d4" strokeWidth="1.4" />
    <circle cx="62" cy="70" r="2.8" fill={speaking ? '#34d399' : '#4fe3d4'} />
    {speaking ? (
      <ellipse cx="66" cy="66" rx="5.5" ry="3.2" fill="#7c2d12" className="animate-pulse" />
    ) : (
      <path d="M60 66 Q66 69 72 66" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" fill="none" />
    )}
    {speaking && (
      <>
        <path
          d="M97 49 Q106 60 97 71"
          stroke="#4fe3d4"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="animate-ping"
        />
        <path
          d="M104 44 Q115 60 104 76"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="animate-pulse"
        />
      </>
    )}
  </svg>
);

export const DirectorVanceVoiceBanner: React.FC<DirectorVanceVoiceBannerProps> = ({
  speaker = 'DIRECTOR VANCE // VOICE BRIEFING',
  quote,
  autoPlayKey,
  compact = false,
  accentColor = 'cyan',
}) => {
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef<number | null>(null);

  const playVoice = useCallback(
    (textToSpeak: string) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (SFX.isMuted()) {
        setSpeaking(false);
        return;
      }
      setSpeaking(true);
      SFX.speakCue(textToSpeak);
      const approxMs = Math.max(2600, Math.min(18000, textToSpeak.length * 68));
      timerRef.current = window.setTimeout(() => {
        setSpeaking(false);
      }, approxMs);
    },
    []
  );

  const stopVoice = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    SFX.cancelSpeech();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (!autoPlayKey) return;
    const t = window.setTimeout(() => playVoice(quote), 220);
    return () => {
      window.clearTimeout(t);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      SFX.cancelSpeech();
    };
  }, [autoPlayKey, quote, playVoice]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      SFX.cancelSpeech();
    };
  }, []);

  const borderCls =
    accentColor === 'amber' ? 'border-amber-400/40' : 'border-cyan-400/35';
  const labelCls =
    accentColor === 'amber' ? 'text-amber-300' : 'text-[#4fe3d4]';

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => (speaking ? stopVoice() : playVoice(quote))}
        className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
          speaking
            ? 'bg-cyan-500/20 border-[#4fe3d4] text-[#4fe3d4] shadow-[0_0_14px_rgba(79,227,212,0.3)]'
            : 'bg-[#0b1933] hover:bg-[#112448] border-cyan-400/35 text-cyan-200'
        }`}
        title="Play / Stop Mission Voice Briefing"
      >
        <span>{speaking ? '⏹' : '🔊'}</span>
        <span className="hidden sm:inline">{speaking ? 'Briefing...' : 'Voice Brief'}</span>
        <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
          {[0, 1, 2].map((bar) => (
            <motion.span
              key={bar}
              animate={
                speaking ? { height: ['30%', '100%', '40%', '90%', '30%'] } : { height: '30%' }
              }
              transition={{
                duration: 0.5,
                repeat: speaking ? Infinity : 0,
                delay: bar * 0.1,
              }}
              className={`w-0.5 rounded-full ${speaking ? 'bg-[#4fe3d4]' : 'bg-cyan-300/60'}`}
            />
          ))}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-3.5 p-3.5 rounded-2xl bg-[#0b1830] border ${borderCls}`}
    >
      <DirectorVanceVoiceAvatarSVG speaking={speaking} />
      <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] sm:text-[11px] font-mono-tech font-bold uppercase tracking-wider truncate ${labelCls}`}>
              {speaker}
            </span>
            <div className="flex items-end gap-0.5 h-3.5 shrink-0" aria-hidden="true">
              {[0, 1, 2, 3].map((bar) => (
                <motion.span
                  key={bar}
                  animate={
                    speaking
                      ? { height: ['25%', '100%', '40%', '90%', '30%'] }
                      : { height: '25%' }
                  }
                  transition={{
                    duration: 0.55,
                    repeat: speaking ? Infinity : 0,
                    delay: bar * 0.1,
                  }}
                  className={`w-1 rounded-full ${speaking ? 'bg-[#4fe3d4]' : 'bg-slate-600'}`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => (speaking ? stopVoice() : playVoice(quote))}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer shrink-0 ${
              speaking
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                : 'bg-cyan-400/15 hover:bg-cyan-400/25 border-cyan-400/45 text-[#4fe3d4]'
            }`}
          >
            {speaking ? '⏹ Stop Voice' : '🔊 Voice Brief'}
          </button>
        </div>
        <p className="font-display text-sm sm:text-base font-extrabold text-white leading-snug">
          “{quote}”
        </p>
      </div>
    </div>
  );
};
