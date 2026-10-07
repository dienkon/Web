/**
 * Procedural WebAudio sound generator for Lab Safety 3D
 * Synthesizes all SFX directly with AudioContext - zero external file dependencies!
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.5;
  private continuousSounds: Map<string, { stop: () => void }> = new Map();

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

  public setVolumes(sfx: number, music: number) {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.musicVolume = Math.max(0, Math.min(1, music));
  }

  public play(name: 'click' | 'success' | 'error' | 'snap' | 'pop' | 'chime' | 'shatter' | 'step' | 'fizz' | 'water' | 'complete') {
    try {
      this.initCtx();
      if (!this.ctx || this.sfxVolume <= 0) return;

      const now = this.ctx.currentTime;

      switch (name) {
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
          gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'snap': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.07);
          gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        }

        case 'complete':
        case 'success':
        case 'chime': {
          const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          freqs.forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.18 * this.sfxVolume, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.45);
          });
          break;
        }

        case 'error': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.setValueAtTime(140, now + 0.12);
          gain.gain.setValueAtTime(0.22 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.28);
          break;
        }

        case 'pop': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
          gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case 'shatter': {
          const bufferSize = this.ctx.sampleRate * 0.25;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(2400, now);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(now);
          break;
        }

        case 'step': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
          gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }

        case 'fizz': {
          const bufferSize = this.ctx.sampleRate * 0.4;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(3200, now);
          filter.Q.setValueAtTime(3, now);
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(now);
          break;
        }

        case 'water': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600 + Math.random() * 300, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
          gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
      }
    } catch {
      // Audio fallback is silent, never throws
    }
  }

  public startLoop(name: 'co2' | 'fire' | 'water_stream'): string {
    const id = `${name}_${Date.now()}`;
    try {
      this.initCtx();
      if (!this.ctx || this.sfxVolume <= 0) return id;

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      if (name === 'co2') {
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
      } else if (name === 'fire') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, this.ctx.currentTime);
      } else {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      }

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12 * this.sfxVolume, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();

      this.continuousSounds.set(id, {
        stop: () => {
          try {
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.05);
            setTimeout(() => noise.stop(), 50);
          } catch {}
        }
      });
    } catch {}
    return id;
  }

  public stopLoop(id: string) {
    const sound = this.continuousSounds.get(id);
    if (sound) {
      sound.stop();
      this.continuousSounds.delete(id);
    }
  }
}

export const soundManager = new SoundManager();

export type SoundEffect = 'click' | 'success' | 'error' | 'snap' | 'pop' | 'chime' | 'shatter' | 'step' | 'fizz' | 'water' | 'complete';

export const playSound = (name: SoundEffect) => {
  soundManager.play(name);
};
