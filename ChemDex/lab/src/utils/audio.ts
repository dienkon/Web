// Web Audio API Procedural Sound Synthesizer for Virtual Chemistry Lab
// 100% self-contained, no external audio files required

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Liquid pouring / water stream sound
  public playLiquidPour(durationSec: number = 1.2) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // White noise with soft pink-like slope
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Resonant bandpass filter sweeping downward like water filling
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + durationSec);
      filter.Q.value = 4.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + durationSec - 0.2);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      noise.stop(this.ctx.currentTime + durationSec);
    } catch {
      // Ignore audio failure
    }
  }

  // Solid powder / crystal drop (gentle muffled taps)
  public playSolidDrop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      for (let j = 0; j < 4; j++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + j * 0.08 + Math.random() * 0.03;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320 + Math.random() * 120, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.06);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.07);
      }
    } catch {}
  }

  // Effervescent bubbling / fizzing reaction sound
  public playFizzBubble(durationSec: number = 2.0) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Burst of tiny randomized high-frequency pops
      const now = this.ctx.currentTime;
      const popCount = Math.floor(durationSec * 22);

      for (let i = 0; i < popCount; i++) {
        const t = now + (i / popCount) * durationSec + (Math.random() * 0.05);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const startFreq = 1400 + Math.random() * 1600;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(startFreq + 500, t + 0.025);

        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.03);
      }
    } catch {}
  }

  // Glass clink / tap sound
  public playGlassClink() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.35);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    } catch {}
  }

  // Stirring vortex sound
  public playStir() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.linearRampToValueAtTime(420, t + 0.4);
      osc.frequency.linearRampToValueAtTime(260, t + 0.8);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.86);
    } catch {}
  }

  // Critical hazard warning alarm
  public playWarningAlarm() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      [0, 0.25, 0.5].forEach((offset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t + offset);
        osc.frequency.linearRampToValueAtTime(660, t + offset + 0.15);

        gain.gain.setValueAtTime(0.15, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + offset);
        osc.stop(t + offset + 0.2);
      });
    } catch {}
  }

  // Droplet detachment & water plop sound
  public playDroplet() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {}
  }

  // Alcohol burner / Bunsen burner ignition click & soft whoosh
  public playBurnerIgnite() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Click snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch {}
  }

  // Authentic Minnaert acoustic bubble synthesis
  // f = (1 / 2πR) * sqrt(3γ P0 / ρ) ≈ 3260 / R_mm (Hz)
  public playMinnaertBubble(radius_mm: number = 2.5, isBurst: boolean = true, volume: number = 0.16) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const clampedR = Math.max(0.6, Math.min(10.0, radius_mm));
      const f0 = Math.max(320, Math.min(4800, 3260 / clampedR));

      // 1. Film rupture high-frequency micro-click (0 - 1.5ms)
      if (isBurst) {
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(f0 * 2.2, t);
        clickOsc.frequency.exponentialRampToValueAtTime(f0 * 3.5, t + 0.003);

        clickGain.gain.setValueAtTime(volume * 0.7, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.004);

        clickOsc.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        clickOsc.start(t);
        clickOsc.stop(t + 0.005);
      }

      // 2. Cavity volumetric resonance with upward chirp (expanding cavity as neck pinches/film retracts)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      // Minnaert chirp: frequency rises slightly as bubble detaches or cavity shrinks
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.14, t + 0.035);

      // Acoustic decay time: Q factor ~ 12-20
      const durationSec = Math.max(0.02, Math.min(0.09, 14.0 / f0));
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + durationSec + 0.005);
    } catch {}
  }

  // Realistic skittering sodium metal sizzling hiss with random hydrogen pops
  public playSodiumSizzlePop(durationSec: number = 0.4, popProbability: number = 0.65) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // High-frequency turbulent hiss
      const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.25;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400 + Math.random() * 800, t);
      filter.Q.value = 2.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + durationSec);

      // Stochastic hydrogen bubble pop
      if (Math.random() < popProbability) {
        this.playMinnaertBubble(1.2 + Math.random() * 1.6, true, 0.14);
      }
    } catch {}
  }

  // Explosive pop or miniature chemical detonation
  public playPop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // Sharp impulse thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Success chime for experiment completion
  public playSuccess() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.1);
        gain.gain.setValueAtTime(0.12, t + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t + idx * 0.1);
        osc.stop(t + idx * 0.1 + 0.36);
      });
    } catch {}
  }

  // Convective nucleate boiling sound (low-frequency thermal rumble + stochastic vapor bubble bursts)
  public playBoil(durationSec: number = 2.0, intensity: number = 1.0) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // 1. Low rumbling convection noise (140-280Hz)
      const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180 + intensity * 120, t);
      filter.Q.value = 1.8;

      const gain = this.ctx.createGain();
      const vol = Math.min(0.2, 0.08 * intensity);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + durationSec);

      // 2. Intermittent hollow steam bubble bursts ("bóp bóp như thiệt")
      const burstCount = Math.floor(durationSec * (5 + intensity * 8));
      for (let i = 0; i < burstCount; i++) {
        const popTime = t + (i / burstCount) * durationSec + (Math.random() * 0.08 - 0.04);
        if (popTime < t || popTime >= t + durationSec) continue;
        const radiusMm = 2.0 + Math.random() * 5.0 * intensity;
        this.playMinnaertBubble(radiusMm, true, Math.min(0.22, 0.06 + intensity * 0.08));
      }
    } catch {}
  }

  // Glass vessel shatter / explosion crash
  public playGlassShatter() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Initial explosive crack
      const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.6), this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const hpFilter = this.ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(1200, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      noise.connect(hpFilter);
      hpFilter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);

      // 2. High-frequency glass shard tinkles
      const freqs = [2800, 3400, 4200, 5100, 6300];
      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();
        const startTime = t + 0.02 + idx * 0.035 + Math.random() * 0.02;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f + (Math.random() * 200 - 100), startTime);
        oscGain.gain.setValueAtTime(0.12 / (idx + 1), startTime);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);
        osc.connect(oscGain);
        oscGain.connect(this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {}
  }

  // Pestle grinding rough friction in porcelain mortar
  public playPestleGrind(durationSec: number = 0.5) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin((i / bufferSize) * Math.PI * 6));
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(650, t);
      bp.frequency.linearRampToValueAtTime(1100, t + durationSec);
      bp.Q.value = 2.5;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + durationSec);
      source.connect(bp);
      bp.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
    } catch {}
  }

  // Boiling bumping surge: sudden explosive vapor expansion & splashing
  public playBumpingSurge() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Heavy low frequency thump
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);
      oscGain.gain.setValueAtTime(0.28, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);

      // Splash droplet spray
      this.playLiquidPour(0.35);
      this.playMinnaertBubble(7.5, true, 0.25);
    } catch {}
  }

  // Violent chemical or glassware explosion
  public playExplosion() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Deep sub-bass concussive blast
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.45);
      oscGain.gain.setValueAtTime(0.45, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);

      // 2. High-energy explosive noise burst
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3800, t);
      lp.frequency.exponentialRampToValueAtTime(250, t + 0.55);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);

      noise.connect(lp);
      lp.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    } catch {}
  }

  // Lab bench sponge / towel wipe sound (frictional squeak & swipe)
  public playSpongeWipe() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const duration = 0.28;

      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        const env = Math.sin(progress * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.25;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1200, t);
      bp.frequency.exponentialRampToValueAtTime(2200, t + duration * 0.5);
      bp.frequency.exponentialRampToValueAtTime(800, t + duration);
      bp.Q.value = 3.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
      gain.gain.linearRampToValueAtTime(0.001, t + duration);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
    } catch {}
  }

  // Convenient aliases
  public playPour(durationSec: number = 1.2) { this.playLiquidPour(durationSec); }
  public playPowder() { this.playSolidDrop(); }
  public playFizz(durationSec: number = 2.0) { this.playFizzBubble(durationSec); }
  public playAlarm() { this.playWarningAlarm(); }
  public playTap() { this.playGlassClink(); }
  public playDrop() { this.playDroplet(); }
  public playIgnite() { this.playBurnerIgnite(); }
  public playBoilBubble() { this.playMinnaertBubble(3.5, true, 0.15); }
  public playShatter() { this.playGlassShatter(); }
  public playGrind() { this.playPestleGrind(); }
  public playBumping() { this.playBumpingSurge(); }
  public playWipe() { this.playSpongeWipe(); }
}

export const labSound = new SoundEngine();

