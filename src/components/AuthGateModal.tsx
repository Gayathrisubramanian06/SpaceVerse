import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { Eye, EyeOff, KeyRound, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { auth, firebaseAppConfig } from '../firebase';
import { CAMPAIGN_LEVELS, PlayerState } from '../data/spaceverseData';
import {
  checkUsernameReservedInFirestore,
  createPlayerProfileInFirestore,
  EMAIL_REGEX,
  formatAuthErrorMessage,
  USERNAME_REGEX,
} from '../services/firestoreProfileService';
import { SFX } from '../utils/sfx';

export type AuthViewMode = 'login' | 'register' | 'forgot';

interface AuthGateModalProps {
  showSplash: boolean;
  showWelcome?: boolean;
  authUser: User | null;
  authLoading: boolean;
  profileLoading: boolean;
  enteredFacility: boolean;
  playerState: PlayerState;
  initialMode?: AuthViewMode;
  onBeginRegistration: (uid: string) => void;
  onRegistrationComplete: (profile: PlayerState) => void;
  onRegistrationAbort: () => void;
  onContinueGame: () => void;
  onOpenProfile: () => void;
  onLogout: () => Promise<void>;
}

const FIREBASE_AUTH_PROVIDERS_URL = `https://console.firebase.google.com/project/${firebaseAppConfig.projectId}/authentication/providers`;

function formatSavedTime(iso: string | null | undefined): string {
  if (!iso) return 'New account — ready for commissioning';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Cloud synced';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  showSplash,
  showWelcome = false,
  authUser,
  authLoading,
  profileLoading,
  enteredFacility,
  playerState,
  initialMode = 'login',
  onBeginRegistration,
  onRegistrationComplete,
  onRegistrationAbort,
  onContinueGame,
  onOpenProfile,
  onLogout,
}) => {
  const [mode, setMode] = useState<AuthViewMode>(initialMode);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Registration form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');

  // Status feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [needsProviderEnable, setNeedsProviderEnable] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Hide while intro splash or storytelling overlay is active, or once user has entered the facility
  if (showSplash || showWelcome || (authUser && enteredFacility)) {
    return null;
  }

  const clearBanners = () => {
    setErrorMsg('');
    setInfoMsg('');
    setNeedsProviderEnable(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearBanners();
    const identifier = loginUsername.trim();
    if (!identifier || !loginPassword) {
      setErrorMsg('Please enter both your username and password.');
      SFX.snapWrong();
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch('/api/auth/login-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password: loginPassword }),
      });
      const data = (await resp.json().catch(() => null)) as {
        ok?: boolean;
        email?: string;
        error?: string;
      } | null;

      if (!resp.ok || !data?.ok || !data?.email) {
        const msg = data?.error || 'Invalid username or password.';
        if (msg.includes('Firebase Console')) {
          setNeedsProviderEnable(true);
        }
        setErrorMsg(msg);
        SFX.snapWrong();
        return;
      }

      await signInWithEmailAndPassword(auth, data.email, loginPassword);
      setLoginPassword('');
      SFX.taskComplete();
    } catch (err) {
      const formatted = formatAuthErrorMessage(err);
      if (formatted.includes('Firebase Console')) {
        setNeedsProviderEnable(true);
      }
      setErrorMsg(formatted);
      SFX.snapWrong();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearBanners();

    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!USERNAME_REGEX.test(cleanUsername)) {
      setErrorMsg(
        'Username must be 3–24 characters using letters, numbers, underscores (_), or hyphens (-).'
      );
      SFX.snapWrong();
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      SFX.snapWrong();
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      SFX.snapWrong();
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please confirm your password carefully.');
      SFX.snapWrong();
      return;
    }

    setSubmitting(true);
    let createdUser: User | null = null;
    try {
      // 1. Check username uniqueness against backend registry first
      const checkRes = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });
      const checkJson = (await checkRes.json().catch(() => null)) as {
        valid?: boolean;
        available?: boolean;
        error?: string;
      } | null;

      if (checkRes.ok && checkJson && !checkJson.available) {
        setErrorMsg(checkJson.error || 'That username is already taken.');
        SFX.snapWrong();
        return;
      }

      // 2. Lock onAuthStateChanged before creating the Firebase Auth user so it cannot race
      onBeginRegistration('__pending__');
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
      createdUser = cred.user;
      onBeginRegistration(createdUser.uid);

      // 3. Double-check Firestore usernames directory once signed in
      const reservedInFirestore = await checkUsernameReservedInFirestore(cleanUsername).catch(
        () => false
      );
      if (reservedInFirestore) {
        await createdUser.delete().catch(() => {});
        onRegistrationAbort();
        setErrorMsg('That username is already claimed by another explorer. Choose a unique username.');
        SFX.snapWrong();
        return;
      }

      await updateProfile(createdUser, { displayName: cleanUsername });

      // 4. Create individual Firestore player profile + unique username lock doc
      await createPlayerProfileInFirestore(
        createdUser.uid,
        cleanUsername,
        cleanEmail
      );

      // 5. Register username -> account mapping in private server registry
      try {
        const idToken = await createdUser.getIdToken();
        await fetch('/api/auth/register-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            username: cleanUsername,
            email: cleanEmail,
          }),
        });
      } catch {
        // Non-fatal: sync-username also reconciles on next auth session
      }

      // 6. Sign out so the newly registered explorer logs in explicitly before starting the story
      await signOut(auth).catch(() => {});
      onRegistrationAbort();

      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setLoginUsername(cleanUsername);
      setLoginPassword('');
      setMode('login');
      setInfoMsg(
        `Account "${cleanUsername}" created! Please log in with your username and password to begin your GALAXY-X mission.`
      );
      SFX.badgeUnlock();
    } catch (err) {
      if (createdUser) {
        await createdUser.delete().catch(() => {});
      }
      onRegistrationAbort();
      const formatted = formatAuthErrorMessage(err);
      if (formatted.includes('Firebase Console')) {
        setNeedsProviderEnable(true);
      }
      setErrorMsg(formatted);
      SFX.snapWrong();
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearBanners();
    const id = forgotIdentifier.trim();
    if (!id) {
      setErrorMsg('Enter your registered username or email address.');
      SFX.snapWrong();
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id }),
      });
      const data = (await resp.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (EMAIL_REGEX.test(id)) {
        await sendPasswordResetEmail(auth, id).catch(() => {});
      }
      setInfoMsg(
        data?.message ||
          'If an account matches that username or email, a password reset link has been sent.'
      );
      SFX.taskComplete();
    } catch {
      setErrorMsg('Unable to request password reset right now.');
      SFX.snapWrong();
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearBanners();
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      SFX.taskComplete();
    } catch (err) {
      const formatted = formatAuthErrorMessage(err);
      setErrorMsg(formatted);
      SFX.snapWrong();
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state while Firebase Auth initializes or Firestore profile hydrates
  if (authLoading || (authUser && profileLoading)) {
    return (
      <div className="fixed inset-0 z-[2400] bg-[#020816]/88 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-cyan-400/45 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
          <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2.5px] text-[#4fe3d4]">
            SPACEVERSE // GALAXY-X CLOUD SYNC
          </div>
          <h2 className="font-display text-lg font-extrabold text-white mt-2">
            VERIFYING EXPLORER CREDENTIALS...
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Retrieving your encrypted Firestore mission profile and telemetry checkpoints.
          </p>
          <div className="mt-5 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-white/10">
            <div className="h-full w-2/3 bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated player -> Continue Game screen (Requirement 5.6)
  if (authUser && !enteredFacility) {
    const completedCount = Math.min(
      8,
      playerState.completedLevels.filter((n) => n >= 1 && n <= 8).length
    );
    const totalStars = playerState.totalStars ?? completedCount * 3;
    const activeLvl =
      CAMPAIGN_LEVELS.find((l) => l.lvl === playerState.currentCampaignLevel) || CAMPAIGN_LEVELS[0];
    const displayName = playerState.username || authUser.displayName || playerState.callsign;
    const isBrandNew = !playerState.joined && completedCount === 0 && playerState.starCredits === 0;

    return (
      <div className="fixed inset-0 z-[2400] bg-[#020816]/86 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-[#07142b] border border-cyan-400/50 p-6 md:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.92)] animate-[popIn_0.28s_ease-out]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono-tech font-bold uppercase tracking-[2.4px] text-[#4fe3d4] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                CLOUD PROFILE AUTHENTICATED
              </div>
              <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1">
                {isBrandNew ? `WELCOME, ${displayName}` : `WELCOME BACK, ${displayName}`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{playerState.email || authUser.email}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                SFX.click();
                await onLogout();
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/28 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

          {/* Saved Progress Summary */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0b1830] border border-amber-400/30">
              <div className="text-[10px] uppercase text-slate-400">StarCredits</div>
              <div className="font-mono-tech text-sm font-extrabold text-amber-300 tabular-nums mt-0.5">
                ★ {playerState.starCredits.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0b1830] border border-cyan-400/30">
              <div className="text-[10px] uppercase text-slate-400">Levels</div>
              <div className="font-mono-tech text-sm font-extrabold text-[#4fe3d4] tabular-nums mt-0.5">
                {completedCount} / 8
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0b1830] border border-yellow-400/30">
              <div className="text-[10px] uppercase text-slate-400">Total Stars</div>
              <div className="font-mono-tech text-sm font-extrabold text-yellow-300 tabular-nums mt-0.5">
                ⭐ {totalStars} / 24
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0b1830] border border-emerald-400/30">
              <div className="text-[10px] uppercase text-slate-400">Badges</div>
              <div className="font-mono-tech text-sm font-extrabold text-emerald-300 tabular-nums mt-0.5">
                🏅 {playerState.badges.length}
              </div>
            </div>
          </div>

          {/* Restored Mission Checkpoint */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#050d1e] border border-cyan-400/25">
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-slate-400 uppercase">
              <span>Current Assignment</span>
              <span className="text-emerald-300">
                Stage {playerState.currentMissionStage ?? 0}
              </span>
            </div>
            <div className="text-sm font-extrabold text-white mt-1 flex items-center gap-2">
              <span>{activeLvl.icon}</span>
              <span className="truncate">{activeLvl.title}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between gap-2">
              <span>Last Saved: {formatSavedTime(playerState.lastSavedAt)}</span>
              <span className="text-[#4fe3d4] font-mono-tech">
                ₡ {playerState.grantCredits.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onContinueGame();
              }}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs sm:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
            >
              {isBrandNew ? 'Begin Commissioning ▶' : 'Continue Game ▶'}
            </button>
            <button
              type="button"
              onClick={() => {
                SFX.click();
                onOpenProfile();
              }}
              className="px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/15 text-slate-200 text-xs font-bold uppercase cursor-pointer"
            >
              👤 Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Login / Registration / Forgot Password Gate
  return (
    <div className="fixed inset-0 z-[2400] bg-[#020816]/88 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-cyan-400/50 p-6 md:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.92)] animate-[popIn_0.28s_ease-out] my-auto">
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="text-[10px] font-mono-tech font-bold uppercase tracking-[2.5px] text-[#4fe3d4]">
            SPACEVERSE // GALAXY-X FLIGHT PORTAL
          </div>
          <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1.5">
            {mode === 'login'
              ? 'EXPLORER LOGIN'
              : mode === 'register'
              ? 'CREATE EXPLORER ACCOUNT'
              : 'RECOVER PASSWORD'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Sign in with your unique explorer username to restore your cloud progress.'
              : mode === 'register'
              ? 'Register a dedicated cloud profile to save levels, StarCredits, stars, and badges.'
              : 'Enter your username or email to receive a Firebase password reset link.'}
          </p>
        </div>

        {/* Mode Tabs (Login / Create Account) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#040b18] border border-white/10 mb-5">
            <button
              type="button"
              onClick={() => {
                SFX.click();
                clearBanners();
                setMode('login');
              }}
              className={`py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#4fe3d4] text-[#041022]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                SFX.click();
                clearBanners();
                setMode('register');
              }}
              className={`py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#4fe3d4] text-[#041022]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>
        )}

        {/* Inline Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-400/50 text-xs text-rose-200 leading-relaxed">
            <div className="font-bold">{errorMsg}</div>
            {needsProviderEnable && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-black/45 border border-amber-400/35 text-[11px] text-amber-100 space-y-1.5">
                <div className="font-bold text-amber-300">
                  Enable Email/Password or use Google Sign-In below:
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-200">
                  <li>
                    Open{' '}
                    <span className="font-mono-tech">{firebaseAppConfig.projectId}</span>{' '}
                    Authentication → Sign-in method in Firebase Console and enable{' '}
                    <strong>Email/Password</strong>
                  </li>
                  <li>
                    Click <strong>Save</strong>, then return here and submit again
                  </li>
                </ol>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={FIREBASE_AUTH_PROVIDERS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-[#4fe3d4] text-[#041022] font-extrabold text-[11px] hover:brightness-110 transition"
                  >
                    Open Firebase Console ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(FIREBASE_AUTH_PROVIDERS_URL).catch(() => {});
                      setInfoMsg('Firebase Console URL copied to clipboard.');
                    }}
                    className="px-2.5 py-1 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 font-bold text-[11px] hover:bg-cyan-400/20 cursor-pointer"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-xs text-emerald-200 leading-relaxed">
            {infoMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter your explorer username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                >
                  {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs sm:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Authenticating...' : 'Login ▶'}
            </button>

            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  clearBanners();
                  setForgotIdentifier(loginUsername);
                  setMode('forgot');
                }}
                className="text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  clearBanners();
                  setMode('register');
                }}
                className="text-[#4fe3d4] hover:underline font-bold cursor-pointer"
              >
                Create New Account
              </button>
            </div>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Username (Unique)
              </label>
              <input
                type="text"
                autoComplete="username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. Nova_Pilot01 (3–24 chars)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="explorer@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showRegPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label={showRegPw ? 'Hide password' : 'Show password'}
                >
                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Confirm Password
              </label>
              <input
                type={showRegPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 mt-1 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#34d399] text-[#041022] font-extrabold text-xs sm:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Creating Cloud Profile...' : 'Create Account ▶'}
            </button>

            <div className="pt-1 text-center text-xs text-slate-400">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  clearBanners();
                  setMode('login');
                }}
                className="text-[#4fe3d4] hover:underline font-bold cursor-pointer"
              >
                Login with Username
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-slate-300 mb-1">
                Username or Email
              </label>
              <input
                type="text"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder="Enter your explorer username or email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4fe3d4]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-[#041022] font-extrabold text-xs sm:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              {submitting ? 'Sending Reset Link...' : 'Send Password Reset Email'}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  clearBanners();
                  setMode('login');
                }}
                className="text-xs text-[#4fe3d4] hover:underline font-bold cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
        {/* Pre-enabled Google Sign-In option */}
        {mode !== 'forgot' && (
          <div className="mt-4 pt-3.5 border-t border-white/10">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                SFX.click();
                void handleGoogleSignIn();
              }}
              className="w-full py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/20 text-white text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              <span>Continue with Google (Pre-enabled)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
