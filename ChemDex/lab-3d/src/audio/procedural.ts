/**
 * procedural.ts - Fully procedural WebAudio synthesis engine driven by simulation physics.
 * 
 * Physical Models:
 * 1. Minnaert Resonance Bubble Acoustic Synthesis:
 *    f = 3.26 / R (Hz)
 *    Damped sinusoidal impulse: A · exp(-t / τ) · sin(2π f(t) t)
 *    Upward frequency chirp (+15%) during the first 1 ms.
 * 2. Air Column Resonance Pouring:
 *    Organ-pipe quarter-wave resonance: f = c_sound / (4 · L_air)
 *    Bandpass filter frequency sweeps upward as receiving vessel liquid level rises.
 * 3. Boiling Acoustic Landscape:
 *    - Degassing / Simmering: Sparse high-frequency subcooled collapse ticks.
 *    - Nucleate / Rolling Boil: Deep hydrodynamic rumble (80 - 250 Hz) + granular bubble bursts.
 * 4. Fizz & Gas Evolution:
 *    High-passed pink/white noise (fc > 4 kHz) with Poisson micro-clicks.
 * 5. Glassware Modal Synthesis:
 *    Inharmonic resonant modes: [1.0, 2.32, 4.25, 6.63] with exponential decay envelopes.
 * 
 * Units: SI internally (Hz, s, m, dB)
 */

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Active continuous synthesis nodes
  private boilNoiseNode: AudioBufferSourceNode | null = null;
  private boilGain: GainNode | null = null;
  private boilFilter: BiquadFilterNode | null = null;

  private fizzNoiseNode: AudioBufferSourceNode | null = null;
  private fizzGain: GainNode | null = null;

  private pourNoiseNode: AudioBufferSourceNode | null = null;
  private pourGain: GainNode | null = null;
  private pourFilter: BiquadFilterNode | null = null;

  private isRunning: boolean = false;

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupContinuousGenerators();
      this.isRunning = true;
    } catch {
      // Running in headless Node or WebAudio disabled
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0.0 : 0.7, this.ctx.currentTime);
    }
  }

  /**
   * Continuous looping white noise buffer generator
   */
  private createNoiseBuffer(durationSec: number = 2.0): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * durationSec, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2.0 - 1.0;
    }
    return buffer;
  }

  private setupContinuousGenerators(): void {
    if (!this.ctx || !this.masterGain) return;

    const noiseBuffer = this.createNoiseBuffer();
    if (!noiseBuffer) return;

    // 1. Boiling continuous rumble
    this.boilNoiseNode = this.ctx.createBufferSource();
    this.boilNoiseNode.buffer = noiseBuffer;
    this.boilNoiseNode.loop = true;

    this.boilFilter = this.ctx.createBiquadFilter();
    this.boilFilter.type = 'bandpass';
    this.boilFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.boilFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.boilGain = this.ctx.createGain();
    this.boilGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.boilNoiseNode.connect(this.boilFilter);
    this.boilFilter.connect(this.boilGain);
    this.boilGain.connect(this.masterGain);
    this.boilNoiseNode.start();

    // 2. Fizz continuous high-pass hiss
    this.fizzNoiseNode = this.ctx.createBufferSource();
    this.fizzNoiseNode.buffer = noiseBuffer;
    this.fizzNoiseNode.loop = true;

    const fizzFilter = this.ctx.createBiquadFilter();
    fizzFilter.type = 'highpass';
    fizzFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);

    this.fizzGain = this.ctx.createGain();
    this.fizzGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.fizzNoiseNode.connect(fizzFilter);
    fizzFilter.connect(this.fizzGain);
    this.fizzGain.connect(this.masterGain);
    this.fizzNoiseNode.start();

    // 3. Pour continuous resonant air column
    this.pourNoiseNode = this.ctx.createBufferSource();
    this.pourNoiseNode.buffer = noiseBuffer;
    this.pourNoiseNode.loop = true;

    this.pourFilter = this.ctx.createBiquadFilter();
    this.pourFilter.type = 'bandpass';
    this.pourFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
    this.pourFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.pourGain = this.ctx.createGain();
    this.pourGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.pourNoiseNode.connect(this.pourFilter);
    this.pourFilter.connect(this.pourGain);
    this.pourGain.connect(this.masterGain);
    this.pourNoiseNode.start();
  }

  /**
   * Trigger single Minnaert bubble pop sound
   * @param radiusM Bubble radius in meters (e.g. 0.001 - 0.005 m)
   */
  public playBubblePop(radiusM: number, gainScale: number = 1.0): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Minnaert frequency: f ≈ 3.26 / R
    const r = Math.max(0.0004, Math.min(0.008, radiusM));
    const baseFreq = 3.26 / r;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // +15% upward chirp during release
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.9, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.003);

    // Fast exponential decay envelope (τ ≈ 8 ms)
    const decaySec = 0.015;
    gain.gain.setValueAtTime(0.18 * gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decaySec);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + decaySec);
  }

  /**
   * Play glassware clink / stir modal sound
   */
  public playGlassClink(velocity: number = 0.5): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Inharmonic modal ratios for cylinder glass
    const baseFreq = 1450.0;
    const modes = [1.0, 2.32, 4.25, 6.63];
    const decays = [0.45, 0.25, 0.12, 0.06];

    for (let i = 0; i < modes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * modes[i], now);

      const amp = (0.15 / (i + 1)) * Math.min(1.0, velocity);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decays[i]);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + decays[i]);
    }
  }

  /**
   * Update continuous boiling rumble intensity
   */
  public updateBoilingState(isBoiling: boolean, powerRatio: number): void {
    if (!this.ctx || !this.boilGain || this.isMuted) return;
    const targetGain = isBoiling ? Math.min(0.35, 0.08 + powerRatio * 0.25) : 0.0;
    this.boilGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  /**
   * Update continuous fizz / gas evolution intensity
   */
  public updateFizzState(gasRateMolesPerS: number): void {
    if (!this.ctx || !this.fizzGain || this.isMuted) return;
    const targetGain = Math.min(0.4, gasRateMolesPerS * 15.0);
    this.fizzGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  /**
   * Update pouring pitch based on remaining air column length L_air (m)
   * f = c / (4 · L)
   */
  public updatePouringState(isPouring: boolean, emptyColumnLengthM: number): void {
    if (!this.ctx || !this.pourGain || !this.pourFilter || this.isMuted) return;

    if (!isPouring) {
      this.pourGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
      return;
    }

    const cSound = 343.0; // m/s
    const lAir = Math.max(0.02, emptyColumnLengthM);
    // Organ pipe pitch: f = c / (4 L)
    const resonantFreq = Math.min(3200.0, Math.max(450.0, cSound / (4.0 * lAir)));

    this.pourFilter.frequency.setTargetAtTime(resonantFreq, this.ctx.currentTime, 0.05);
    this.pourGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.05);
  }
}

export const proceduralAudio = new ProceduralAudioEngine();
