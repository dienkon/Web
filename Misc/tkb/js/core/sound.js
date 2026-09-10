/**
 * Sound Engine - High Quality Web Audio API Synthesizer
 * Zero external assets needed, runs 100% offline, crisp and instant feedback.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.volume = 0.7;

    // Load sound preference from localStorage if available
    try {
      const saved = localStorage.getItem("tkb_sound_enabled");
      if (saved !== null) {
        this.soundEnabled = saved === "true";
      }
    } catch (e) {
      // Ignore
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  isSupported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
    try {
      localStorage.setItem("tkb_sound_enabled", String(this.soundEnabled));
    } catch (e) {
      // Ignore
    }
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  toggleSound() {
    this.setSoundEnabled(!this.soundEnabled);
    if (this.soundEnabled) {
      this.playChime();
    }
    return this.soundEnabled;
  }

  /**
   * Helper to play a smooth synth tone
   */
  playTone(freq, type = "sine", duration = 0.5, delay = 0, gainLevel = 0.3) {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel * this.volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Crisp resonant dual-tone bell / chime (Apple / Google style)
   */
  playBell() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Resonant fundamental + harmonics
    const tones = [
      { freq: 880, dur: 1.2, gain: 0.35 },
      { freq: 1320, dur: 1.0, gain: 0.2 },
      { freq: 1760, dur: 0.8, gain: 0.15 },
    ];

    tones.forEach(({ freq, dur, gain }) => {
      this.playTone(freq, "sine", dur, 0, gain);
    });
  }

  /**
   * Gentle reminder chime (e.g. toggle confirmation or notification)
   */
  playChime() {
    if (!this.soundEnabled) return;
    this.playTone(659.25, "sine", 0.4, 0, 0.25); // E5
    this.playTone(987.77, "sine", 0.6, 0.08, 0.3); // B5
  }

  /**
   * Period Start Announcement (Cheerful 3-note ascending chime: C5 -> E5 -> G5)
   */
  playPeriodStart() {
    if (!this.soundEnabled) return;
    const now = 0;
    this.playTone(523.25, "sine", 0.45, now, 0.25); // C5
    this.playTone(659.25, "sine", 0.45, now + 0.12, 0.28); // E5
    this.playTone(783.99, "sine", 0.8, now + 0.24, 0.35); // G5
  }

  /**
   * Period End Announcement (Gentle descending finish chime: G5 -> E5 -> C5)
   */
  playPeriodEnd() {
    if (!this.soundEnabled) return;
    const now = 0;
    this.playTone(783.99, "sine", 0.45, now, 0.3); // G5
    this.playTone(659.25, "sine", 0.45, now + 0.14, 0.26); // E5
    this.playTone(523.25, "sine", 0.9, now + 0.28, 0.32); // C5
  }

  /**
   * Celebration Fanfare (4-note triumphant chord when completing activities)
   */
  playCelebration() {
    if (!this.soundEnabled) return;
    const now = 0;
    this.playTone(523.25, "triangle", 0.35, now, 0.25); // C5
    this.playTone(659.25, "triangle", 0.35, now + 0.1, 0.28); // E5
    this.playTone(783.99, "triangle", 0.35, now + 0.2, 0.3); // G5
    this.playTone(1046.5, "sine", 0.9, now + 0.3, 0.38); // C6
  }
}

export const soundEngine = new SoundEngine();
