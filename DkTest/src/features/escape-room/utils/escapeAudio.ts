/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Web Audio API synthesizer for DkTEST Escape Room
 * Zero asset dependencies, zero network requests, instant playback.
 */

class EscapeAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem("dktest_escape_audio_muted");
      this.isMuted = saved === "true";
    } catch {
      this.isMuted = false;
    }
  }

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      // AudioContext might be restricted until user interaction
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem("dktest_escape_audio_muted", String(muted));
    } catch {}
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Click / Tap UI sound
   */
  public playClick(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  /**
   * Inspecting an object / opening drawer
   */
  public playInspect(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  /**
   * New clue or item discovered (harmonic ascending shimmer)
   */
  public playClueFound(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.07;
        const endTime = startTime + 0.25;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch {}
  }

  /**
   * Mechanism unlock or keypad success
   */
  public playUnlock(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      // Mechanical snap
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = "square";
      snapOsc.frequency.setValueAtTime(180, now);
      snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      snapGain.gain.setValueAtTime(0.2, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.09);

      // Harmonious chime
      const chimeNotes = [440, 554.37, 659.25, 880];
      chimeNotes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + 0.08 + i * 0.06;
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {}
  }

  /**
   * Wrong code / error buzz
   */
  public playError(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      [140, 110].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.12;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.1);
      });
    } catch {}
  }

  /**
   * Grand Victory Fanfare
   */
  public playVictory(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      // Arpeggio leading to triumphant chord
      const chords = [
        { time: 0.0, freq: 523.25 }, // C5
        { time: 0.15, freq: 659.25 }, // E5
        { time: 0.3, freq: 783.99 },  // G5
        { time: 0.45, freq: 1046.5 }, // C6
        { time: 0.65, freq: 1318.51 }, // E6
      ];

      chords.forEach((c) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + c.time;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(c.freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    } catch {}
  }
}

export const escapeAudio = new EscapeAudioSystem();
