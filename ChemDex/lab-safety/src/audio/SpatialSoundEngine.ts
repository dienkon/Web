/**
 * SpatialSoundEngine.ts
 * 3D Spatial Audio & Ambient Acoustics for ChemDex Laboratory Safety FPS
 * 100% Procedural Web Audio API with zero external file dependencies!
 */

import { playerCoords } from '../store/useStore';

class SpatialSoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  // Ambient Fume Hood Drone
  private fumeHoodSource: AudioNode | null = null;
  private isFumeHoodPlaying = false;

  // Extinguisher Hiss Loop
  private hissSource: AudioNode | null = null;
  private hissGain: GainNode | null = null;
  private isHissing = false;

  // Fire Alarm Siren
  private alarmOsc: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;
  private isAlarmPlaying = false;

  // Footstep Timer
  private lastStepTime = 0;

  constructor() {
    // Lazy initialize on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.ambientGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Updates listener position in 3D space from player coordinates
   */
  public updateListener(x: number, y: number, z: number, forwardX: number, forwardZ: number) {
    if (!this.ctx || !this.ctx.listener) return;
    const l = this.ctx.listener;
    const now = this.ctx.currentTime;

    if (l.positionX) {
      l.positionX.setValueAtTime(x, now);
      l.positionY.setValueAtTime(y + 1.6, now);
      l.positionZ.setValueAtTime(z, now);
      l.forwardX.setValueAtTime(forwardX, now);
      l.forwardY.setValueAtTime(0, now);
      l.forwardZ.setValueAtTime(forwardZ, now);
      l.upX.setValueAtTime(0, now);
      l.upY.setValueAtTime(1, now);
      l.upZ.setValueAtTime(0, now);
    } else {
      // Legacy WebAudio fallback
      (l as any).setPosition(x, y + 1.6, z);
      (l as any).setOrientation(forwardX, 0, forwardZ, 0, 1, 0);
    }
  }

  /**
   * Plays a 3D localized sound at specific world coordinates
   */
  public playAt(
    name: 'fizz' | 'snap' | 'shatter' | 'pop' | 'step',
    position: [number, number, number],
    volumeMultiplier = 1.0
  ) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.5;
    panner.maxDistance = 25;
    panner.rolloffFactor = 1.2;

    panner.positionX.setValueAtTime(position[0], now);
    panner.positionY.setValueAtTime(position[1], now);
    panner.positionZ.setValueAtTime(position[2], now);
    panner.connect(this.sfxGain);

    if (name === 'fizz') {
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      noise.start(now);
    } else if (name === 'step') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);

      gain.gain.setValueAtTime(0.12 * volumeMultiplier, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  /**
   * Footsteps generator synced to movement speed
   */
  public tickFootsteps(isMoving: boolean, isRunning: boolean) {
    if (!isMoving) return;
    const now = performance.now();
    const interval = isRunning ? 270 : 420;

    if (now - this.lastStepTime > interval) {
      this.lastStepTime = now;
      this.playAt('step', playerCoords.position, isRunning ? 1.3 : 0.9);
    }
  }

  /**
   * Starts continuous ambient Fume Hood ventilation hum
   */
  public startFumeHoodAmbient() {
    this.initContext();
    if (!this.ctx || !this.ambientGain || this.isFumeHoodPlaying) return;

    const bufferSize = this.ctx.sampleRate * 2.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);

    const panner = this.ctx.createPanner();
    panner.positionX.setValueAtTime(8.8, this.ctx.currentTime);
    panner.positionY.setValueAtTime(1.8, this.ctx.currentTime);
    panner.positionZ.setValueAtTime(-3.5, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(panner);
    panner.connect(this.ambientGain);

    noise.start();
    this.fumeHoodSource = noise;
    this.isFumeHoodPlaying = true;
  }

  /**
   * Starts high-pressure CO2 Extinguisher hiss sound loop
   */
  public startExtinguisherHiss() {
    this.initContext();
    if (!this.ctx || this.isHissing) return;

    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    this.hissSource = noise;
    this.hissGain = gain;
    this.isHissing = true;
  }

  public stopExtinguisherHiss() {
    if (!this.isHissing || !this.ctx || !this.hissGain) return;
    try {
      this.hissGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      setTimeout(() => {
        if (this.hissSource) {
          (this.hissSource as any).stop?.();
          this.hissSource = null;
        }
        this.isHissing = false;
      }, 100);
    } catch {
      this.isHissing = false;
    }
  }

  /**
   * Triggers emergency fire alarm siren
   */
  public triggerAlarm(active: boolean) {
    this.initContext();
    if (!this.ctx) return;

    if (active && !this.isAlarmPlaying) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      // Two-tone warble (800Hz <-> 600Hz)
      const now = this.ctx.currentTime;
      for (let i = 0; i < 20; i++) {
        osc.frequency.setValueAtTime(850, now + i * 0.5);
        osc.frequency.setValueAtTime(620, now + i * 0.5 + 0.25);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      this.alarmOsc = osc;
      this.alarmGain = gain;
      this.isAlarmPlaying = true;
    } else if (!active && this.isAlarmPlaying) {
      if (this.alarmOsc) {
        this.alarmOsc.stop();
        this.alarmOsc = null;
      }
      this.isAlarmPlaying = false;
    }
  }
}

export const spatialSound = new SpatialSoundEngine();
