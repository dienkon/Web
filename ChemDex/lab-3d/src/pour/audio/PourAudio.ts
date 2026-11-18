import { useAppStore } from '../../store/useAppStore';

class PourAudioManager {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Starts procedural laminar pouring sound with pitch governed by air column height.
   */
  public startPourStream(initialPitchHz: number = 320): void {
    const { soundEnabled, isSimulationPaused } = useAppStore.getState();
    if (!soundEnabled || isSimulationPaused || this.noiseNode) return;
    try {
      const ctx = this.initContext();
      if (!this.noiseBuffer) {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
        }
        this.noiseBuffer = buffer;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      // 2. Resonant bandpass filter representing liquid vessel cavity
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(initialPitchHz, ctx.currentTime);
      filter.Q.setValueAtTime(4.5, ctx.currentTime);

      // 3. Gain envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.setTargetAtTime(0.18, ctx.currentTime, 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.onended = () => {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      noise.start();
      this.noiseNode = noise;
      this.filterNode = filter;
      this.gainNode = gain;
    } catch {
      // Audio context might be blocked prior to user interaction
    }
  }

  /**
   * Modulates sound pitch and volume as the vessel fills up.
   * As fill ratio increases from 0 to 1, cavity frequency shifts from ~300 Hz up to ~1100 Hz.
   */
  public updateFillRatio(fillRatio: number, flowRate_ml_s: number): void {
    if (!this.ctx || !this.noiseNode) return;
    try {
      const now = this.ctx.currentTime;
      // Pitch rises as air column shortens: f ~ 1 / L
      const targetFreq = 300 + Math.pow(Math.max(0, Math.min(1, fillRatio)), 1.5) * 850;
      this.filterNode?.frequency.setTargetAtTime(targetFreq, now, 0.05);

      // Volume modulates with flow rate
      const targetGain = Math.max(0.01, Math.min(0.25, (flowRate_ml_s / 30) * 0.18));
      this.gainNode?.gain.setTargetAtTime(targetGain, now, 0.05);
    } catch {}
  }

  /**
   * Stops pouring stream smoothly.
   */
  public stopPourStream(): void {
    const noise = this.noiseNode, filter = this.filterNode, gain = this.gainNode;
    if (!this.ctx || !noise || !gain) return;
    // A quick restart owns new nodes while this one finishes its fade.
    this.noiseNode = null;
    this.filterNode = null;
    this.gainNode = null;
    try {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.015);
      noise.stop(now + 0.08);
    } catch {
      noise.disconnect();
      filter?.disconnect();
      gain.disconnect();
    }
  }

  /**
   * Plays a crisp droplet impact sound ("plink / drip") for indicator pipettes.
   */
  public playDrop(frequency: number = 880): void {
    if (!useAppStore.getState().soundEnabled) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  /**
   * Plays a bottle glug pulse ("bloop") for narrow-neck bottles.
   */
  public playGlug(): void {
    if (!useAppStore.getState().soundEnabled) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }
}

export const pourAudio = new PourAudioManager();
