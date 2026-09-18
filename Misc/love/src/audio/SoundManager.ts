// Web Audio API Sound Synthesizer & Audio Controller

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private backgroundAudio: HTMLAudioElement | null = null;
  private synthMusicPlaying: boolean = false;
  private synthMusicTimer: number | null = null;
  private currentNoteIndex: number = 0;

  constructor() {
    // Attempt to read mute state from storage
    const savedMute = localStorage.getItem('love_story_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('love_story_muted', String(this.isMuted));
    if (this.isMuted) {
      if (this.backgroundAudio) this.backgroundAudio.pause();
      this.stopSynthMelody();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('love_story_muted', String(muted));
    if (this.isMuted) {
      if (this.backgroundAudio) this.backgroundAudio.pause();
      this.stopSynthMelody();
    }
  }

  // Sound effect: Soft UI Click
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Sound effect: Hover Tick
  public playHover() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(950, now + 0.03);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // Sound effect: Typewriter Letter Key
  public playTyping() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const randomFreq = 340 + Math.random() * 80;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(randomFreq, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Sound effect: Heartbeat (Lubb-Dubb)
  public playHeartbeat() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // First thump (Lubb)
    this.playThump(now, 62, 40, 0.28, 0.16);
    // Second thump (Dubb)
    this.playThump(now + 0.24, 75, 45, 0.22, 0.18);
  }

  private playThump(time: number, startFreq: number, endFreq: number, volume: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Sound effect: Magical Chime / Reveal
  public playChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  // Sound effect: Heart Burst / Celebration
  public playBurst() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880, 1108.73]; // A major sparkle
    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const time = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.75);
    });
  }

  // Sound effect: Fireworks crackle & boom
  public playFireworks() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep resonance boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);

    // Sparkles
    setTimeout(() => {
      this.playBurst();
    }, 150);
  }

  // Sound effect: Page transition whoosh
  public playTransition() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Ambient Romantic Synth Melody (for when no external mp3 is provided)
  public startSynthMelody() {
    if (this.synthMusicPlaying || this.isMuted) return;
    this.initContext();
    this.synthMusicPlaying = true;

    // Romantic dreamy arpeggio notes (F#m7 -> Bm7 -> E7 -> A)
    const sequence = [
      369.99, 440.00, 554.37, 659.25, // F#4, A4, C#5, E5
      493.88, 587.33, 739.99, 880.00, // B4, D5, F#5, A5
      329.63, 415.30, 493.88, 659.25, // E4, G#4, B4, E5
      440.00, 554.37, 659.25, 880.00, // A4, C#5, E5, A5
    ];

    const playStep = () => {
      if (!this.synthMusicPlaying || this.isMuted || !this.ctx) return;
      const freq = sequence[this.currentNoteIndex % sequence.length];
      this.currentNoteIndex++;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.95);

      this.synthMusicTimer = window.setTimeout(playStep, 600);
    };

    playStep();
  }

  public stopSynthMelody() {
    this.synthMusicPlaying = false;
    if (this.synthMusicTimer !== null) {
      clearTimeout(this.synthMusicTimer);
      this.synthMusicTimer = null;
    }
  }

  // External audio music playback
  public playCustomAudio(url: string) {
    if (this.isMuted) return;
    this.stopSynthMelody();
    if (!this.backgroundAudio) {
      this.backgroundAudio = new Audio(url);
      this.backgroundAudio.loop = true;
    } else {
      this.backgroundAudio.src = url;
    }
    this.backgroundAudio.play().catch(() => {
      // Fallback to synth if autoplay or audio load blocked
      this.startSynthMelody();
    });
  }

  public stopAudio() {
    this.stopSynthMelody();
    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
    }
  }

  public isMusicActive(): boolean {
    return this.synthMusicPlaying || (this.backgroundAudio !== null && !this.backgroundAudio.paused);
  }
}

export const soundManager = new SoundManager();
