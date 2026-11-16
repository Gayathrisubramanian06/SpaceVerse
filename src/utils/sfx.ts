// Web Audio API synthesizer for SPACEVERSE aerospace UI, assembly, and rocket launch effects

export type LaunchAudioPhase = 'ignition' | 'liftoff' | 'ascent' | 'space';

export interface RocketLaunchAudioHandle {
  setPhase: (phase: LaunchAudioPhase) => void;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  stop: () => void;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.85;
  private lastClickTime = 0;
  private activeLaunchAudio: RocketLaunchAudioHandle | null = null;

  constructor() {
    try {
      if (localStorage.getItem('gx_sound_muted') === '1') {
        this.muted = true;
      }
      const savedVol = localStorage.getItem('gx_sound_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!Number.isNaN(parsed)) {
          this.volume = Math.max(0, Math.min(1, parsed));
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private play(notes: [number, number, number][], type: OscillatorType, vol: number): void {
    if (this.muted || this.volume <= 0.001) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const scaledVol = Math.max(0.0002, vol * this.volume);
    const t = ctx.currentTime;
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t + start);
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(scaledVol, t + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.02);
    });
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): boolean {
    this.muted = muted;
    try {
      localStorage.setItem('gx_sound_muted', this.muted ? '1' : '0');
    } catch {
      // ignore
    }
    if (this.muted) {
      this.cancelSpeech();
    }
    this.activeLaunchAudio?.setMuted(this.muted);
    return this.muted;
  }

  toggleMute(): boolean {
    return this.setMuted(!this.muted);
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(vol: number): number {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('gx_sound_volume', String(this.volume));
    } catch {
      // ignore
    }
    this.activeLaunchAudio?.setVolume(this.volume);
    return this.volume;
  }

  cancelSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore speech synthesis errors
    }
  }

  speakCue(text: string): void {
    if (this.muted || this.volume <= 0.02) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.96;
        utter.pitch = 0.85;
        utter.volume = Math.min(1, this.volume);
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // fallback silently if browser blocks speech synthesis
    }
  }

  countdownBeep(count: 3 | 2 | 1): void {
    const freqMap: Record<3 | 2 | 1, number> = {
      3: 660,
      2: 740,
      1: 880,
    };
    const freq = freqMap[count];
    this.play(
      [
        [freq, 0, 0.14],
        [freq * 0.5, 0.02, 0.2],
      ],
      'triangle',
      0.16
    );
    const word = count === 3 ? 'Three' : count === 2 ? 'Two' : 'One';
    this.speakCue(word);
  }

  playIgnitionBurst(): void {
    this.speakCue('Ignition, liftoff!');
    if (this.muted || this.volume <= 0.001) return;
    const ctx = this.getCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dur = 0.9;
    const sampleRate = ctx.sampleRate;
    const len = Math.floor(sampleRate * dur);
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.45));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, t);
    filter.frequency.exponentialRampToValueAtTime(210, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.32 * this.volume, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /**
   * Starts a continuous procedural multi-phase rocket engine roar + sub-bass rumble.
   * Caller must invoke .stop() on completion or unmount.
   */
  createRocketLaunchAudio(): RocketLaunchAudioHandle {
    this.activeLaunchAudio?.stop();

    const ctx = this.getCtx();
    if (!ctx) {
      const noop: RocketLaunchAudioHandle = {
        setPhase: () => {},
        setVolume: () => {},
        setMuted: () => {},
        stop: () => {},
      };
      this.activeLaunchAudio = noop;
      return noop;
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.muted ? 0 : 0.001, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Pink-weighted noise buffer for realistic rocket acoustic crackle & exhaust roar
    const bufferLen = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      output[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.18) * 1.4));
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'lowpass';
    bandpass.frequency.setValueAtTime(240, ctx.currentTime);
    bandpass.Q.setValueAtTime(0.8, ctx.currentTime);

    const rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(42, ctx.currentTime);

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(95, ctx.currentTime);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.32, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.42, ctx.currentTime);

    noiseSrc.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(masterGain);

    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(masterGain);

    noiseSrc.start();
    rumbleOsc.start();

    let stopped = false;
    let currentPhaseFactor = 0.7;

    const applyGain = () => {
      if (stopped) return;
      const target = this.muted ? 0 : this.volume * currentPhaseFactor;
      masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
    };

    const handle: RocketLaunchAudioHandle = {
      setPhase: (phase) => {
        if (stopped) return;
        const now = ctx.currentTime;
        if (phase === 'ignition') {
          currentPhaseFactor = 0.75;
          bandpass.frequency.setTargetAtTime(260, now, 0.18);
          rumbleOsc.frequency.setTargetAtTime(44, now, 0.15);
        } else if (phase === 'liftoff') {
          currentPhaseFactor = 0.95;
          bandpass.frequency.setTargetAtTime(460, now, 0.25);
          rumbleOsc.frequency.setTargetAtTime(54, now, 0.2);
        } else if (phase === 'ascent') {
          currentPhaseFactor = 0.65;
          bandpass.frequency.setTargetAtTime(340, now, 0.4);
          rumbleOsc.frequency.setTargetAtTime(48, now, 0.4);
        } else {
          // Space transition — fades into quiet vacuum
          currentPhaseFactor = 0.08;
          bandpass.frequency.setTargetAtTime(140, now, 0.6);
          rumbleOsc.frequency.setTargetAtTime(34, now, 0.5);
        }
        applyGain();
      },
      setVolume: () => applyGain(),
      setMuted: () => applyGain(),
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
          window.setTimeout(() => {
            try {
              noiseSrc.stop();
              rumbleOsc.stop();
              noiseSrc.disconnect();
              rumbleOsc.disconnect();
              masterGain.disconnect();
            } catch {
              // ignore cleanup errors
            }
          }, 180);
        } catch {
          // ignore
        }
        if (this.activeLaunchAudio === handle) {
          this.activeLaunchAudio = null;
        }
      },
    };

    this.activeLaunchAudio = handle;
    handle.setPhase('ignition');
    return handle;
  }

  stopAllLaunchAudio(): void {
    this.activeLaunchAudio?.stop();
    this.cancelSpeech();
  }

  click(): void {
    const now = Date.now();
    if (now - this.lastClickTime < 60) return;
    this.lastClickTime = now;
    this.play(
      [
        [520, 0, 0.055],
        [780, 0.04, 0.045],
      ],
      'square',
      0.05
    );
  }

  select(): void {
    this.play(
      [
        [380, 0, 0.04],
        [570, 0.03, 0.065],
      ],
      'sine',
      0.08
    );
  }

  snapCorrect(): void {
    this.play(
      [
        [587, 0, 0.07],
        [880, 0.07, 0.11],
        [1174, 0.14, 0.16],
      ],
      'triangle',
      0.11
    );
  }

  snapWrong(): void {
    this.play(
      [
        [180, 0, 0.09],
        [140, 0.09, 0.1],
      ],
      'sawtooth',
      0.08
    );
  }

  taskComplete(): void {
    this.play(
      [
        [523, 0, 0.12],
        [659, 0.11, 0.13],
        [784, 0.22, 0.22],
      ],
      'sine',
      0.12
    );
  }

  levelComplete(): void {
    this.play(
      [
        [523, 0, 0.14],
        [659, 0.12, 0.14],
        [784, 0.24, 0.14],
        [1047, 0.36, 0.3],
      ],
      'triangle',
      0.13
    );
  }

  badgeUnlock(): void {
    this.play(
      [
        [784, 0, 0.1],
        [988, 0.09, 0.1],
        [1175, 0.18, 0.1],
        [1568, 0.27, 0.24],
      ],
      'sine',
      0.12
    );
  }

  navigate(): void {
    if (this.muted || this.volume <= 0.001) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.22);
    gain.gain.setValueAtTime(0.1 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  sliderTick(ratio = 0.5): void {
    const freq = 340 + Math.max(0, Math.min(1, ratio)) * 380;
    this.play([[freq, 0, 0.035]], 'sine', 0.05);
  }

  orbitStart(): void {
    this.play(
      [
        [293, 0, 0.12],
        [440, 0.08, 0.14],
        [587, 0.16, 0.22],
      ],
      'triangle',
      0.11
    );
  }

  eclipseEnter(): void {
    this.play(
      [
        [420, 0, 0.16],
        [310, 0.14, 0.2],
        [210, 0.28, 0.3],
      ],
      'sine',
      0.11
    );
  }

  sunlightRestored(): void {
    this.play(
      [
        [523, 0, 0.1],
        [659, 0.09, 0.11],
        [880, 0.18, 0.16],
        [1046, 0.28, 0.24],
      ],
      'sine',
      0.12
    );
  }

  lowBatteryBeep(): void {
    this.play(
      [
        [720, 0, 0.07],
        [540, 0.09, 0.08],
      ],
      'square',
      0.06
    );
  }

  powerFailure(): void {
    this.play(
      [
        [260, 0, 0.18],
        [185, 0.16, 0.22],
        [120, 0.32, 0.36],
      ],
      'sawtooth',
      0.1
    );
  }

  createSpaceAmbience(): { setMuted: (m: boolean) => void; setVolume: (v: number) => void; stop: () => void } {
    const ctx = this.getCtx();
    if (!ctx) {
      return { setMuted: () => {}, setVolume: () => {}, stop: () => {} };
    }
    const master = ctx.createGain();
    master.gain.setValueAtTime(this.muted ? 0 : Math.max(0.001, 0.045 * this.volume), ctx.currentTime);
    master.connect(ctx.destination);

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(55, ctx.currentTime);

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(110, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(190, ctx.currentTime);

    const gainB = ctx.createGain();
    gainB.gain.setValueAtTime(0.35, ctx.currentTime);

    oscA.connect(filter);
    oscB.connect(gainB);
    gainB.connect(filter);
    filter.connect(master);

    oscA.start();
    oscB.start();

    let stopped = false;
    const sync = () => {
      if (stopped) return;
      const target = this.muted ? 0 : 0.045 * this.volume;
      master.gain.setTargetAtTime(target, ctx.currentTime, 0.15);
    };

    return {
      setMuted: () => sync(),
      setVolume: () => sync(),
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
          window.setTimeout(() => {
            try {
              oscA.stop();
              oscB.stop();
              oscA.disconnect();
              oscB.disconnect();
              master.disconnect();
            } catch {
              // ignore cleanup errors
            }
          }, 220);
        } catch {
          // ignore
        }
      },
    };
  }
  shakerStart(): void {
    this.play(
      [
        [140, 0, 0.14],
        [210, 0.1, 0.16],
        [320, 0.22, 0.18],
      ],
      'sawtooth',
      0.08
    );
  }

  shakerPass(): void {
    this.play(
      [
        [523, 0, 0.12],
        [659, 0.1, 0.12],
        [784, 0.2, 0.2],
        [1046, 0.32, 0.28],
      ],
      'triangle',
      0.12
    );
  }

  shakerFail(): void {
    this.play(
      [
        [240, 0, 0.15],
        [180, 0.13, 0.18],
        [120, 0.26, 0.3],
      ],
      'sawtooth',
      0.1
    );
  }

  freezerDoor(): void {
    if (this.muted || this.volume <= 0.001) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.45;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.16));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(1.4, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.03);
    this.play([[110, 0.08, 0.14]], 'sine', 0.12);
  }

  heaterActivate(): void {
    this.play(
      [
        [280, 0, 0.08],
        [420, 0.07, 0.14],
      ],
      'triangle',
      0.09
    );
  }

  massWarningBeep(): void {
    this.play(
      [
        [330, 0, 0.08],
        [240, 0.09, 0.12],
      ],
      'square',
      0.07
    );
  }

  tempWarningBeep(): void {
    this.play(
      [
        [880, 0, 0.06],
        [660, 0.08, 0.08],
      ],
      'square',
      0.06
    );
  }

  createShakerAudio(): {
    setIntensity: (intensity: number) => void;
    setMuted: (m: boolean) => void;
    setVolume: (v: number) => void;
    stop: () => void;
  } {
    const ctx = this.getCtx();
    if (!ctx) {
      return { setIntensity: () => {}, setMuted: () => {}, setVolume: () => {}, stop: () => {} };
    }
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(34, ctx.currentTime);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(68, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, ctx.currentTime);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(master);
    osc.start();
    osc2.start();

    let stopped = false;
    let curIntensity = 0.25;
    const sync = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      const targetGain = this.muted ? 0 : (0.04 + curIntensity * 0.14) * this.volume;
      master.gain.setTargetAtTime(targetGain, now, 0.06);
      osc.frequency.setTargetAtTime(28 + curIntensity * 48, now, 0.08);
      osc2.frequency.setTargetAtTime(56 + curIntensity * 96, now, 0.08);
      filter.frequency.setTargetAtTime(120 + curIntensity * 380, now, 0.08);
    };
    sync();

    return {
      setIntensity: (intensity: number) => {
        curIntensity = Math.max(0, Math.min(1, intensity));
        sync();
      },
      setMuted: () => sync(),
      setVolume: () => sync(),
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
          window.setTimeout(() => {
            try {
              osc.stop();
              osc2.stop();
              osc.disconnect();
              osc2.disconnect();
              master.disconnect();
            } catch {
              // ignore cleanup errors
            }
          }, 160);
        } catch {
          // ignore
        }
      },
    };
  }

  createFreezerAmbience(): {
    setMuted: (m: boolean) => void;
    setVolume: (v: number) => void;
    stop: () => void;
  } {
    const ctx = this.getCtx();
    if (!ctx) {
      return { setMuted: () => {}, setVolume: () => {}, stop: () => {} };
    }
    const master = ctx.createGain();
    master.gain.setValueAtTime(this.muted ? 0 : Math.max(0.001, 0.05 * this.volume), ctx.currentTime);
    master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(520, ctx.currentTime);
    bp.Q.setValueAtTime(2.6, ctx.currentTime);

    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(92, ctx.currentTime);
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.35, ctx.currentTime);

    src.connect(bp);
    bp.connect(master);
    hum.connect(humGain);
    humGain.connect(master);

    src.start();
    hum.start();

    let stopped = false;
    const sync = () => {
      if (stopped) return;
      const target = this.muted ? 0 : 0.05 * this.volume;
      master.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
    };

    return {
      setMuted: () => sync(),
      setVolume: () => sync(),
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
          window.setTimeout(() => {
            try {
              src.stop();
              hum.stop();
              src.disconnect();
              hum.disconnect();
              master.disconnect();
            } catch {
              // ignore
            }
          }, 180);
        } catch {
          // ignore
        }
      },
    };
  }

  /**
   * Realistic paper book page-turn rustle & soft settle.
   */
  pageTurn(): void {
    if (this.muted || this.volume <= 0.001) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.24;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const env = Math.sin(Math.PI * p) * (0.65 + 0.35 * Math.sin(p * Math.PI * 5));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.setValueAtTime(1.4, t);
    bp.frequency.setValueAtTime(1400, t);
    bp.frequency.exponentialRampToValueAtTime(620, t + 0.12);
    bp.frequency.exponentialRampToValueAtTime(1950, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24 * this.volume, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const SFX = new SoundEngine();
