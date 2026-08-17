// Highly detailed, precise sound & music engine with zero-delay Web Audio synthesis

let bgMusic: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

// Retrieve settings safely from localStorage
export interface AudioSettings {
  sound: boolean;
  soundVolume: number;
  music: boolean;
  musicVolume: number;
}

export function getAudioSettings(): AudioSettings {
  const defaultSettings: AudioSettings = {
    sound: true,
    soundVolume: 80,
    music: true,
    musicVolume: 50,
  };
  
  try {
    const saved = localStorage.getItem('arena_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        sound: parsed.sound !== undefined ? parsed.sound : defaultSettings.sound,
        soundVolume: parsed.soundVolume !== undefined ? Number(parsed.soundVolume) : defaultSettings.soundVolume,
        music: parsed.music !== undefined ? parsed.music : defaultSettings.music,
        musicVolume: parsed.musicVolume !== undefined ? Number(parsed.musicVolume) : defaultSettings.musicVolume,
      };
    }
  } catch (e) {
    console.error("Failed to parse audio settings", e);
  }
  return defaultSettings;
}

// -----------------------------
// BACKGROUND MUSIC ENGINE (BGM)
// -----------------------------
export function initBGM() {
  if (typeof window === 'undefined') return;
  if (!bgMusic) {
    bgMusic = new Audio('/nhac-nen.mp3');
    bgMusic.loop = true;
    bgMusic.preload = 'auto';
  }
}

export function updateBGMState() {
  initBGM();
  if (!bgMusic) return;

  const settings = getAudioSettings();
  
  if (settings.music) {
    bgMusic.volume = (settings.musicVolume / 100) * 0.4; // Cap max volume slightly to keep it non-intrusive
    if (bgMusic.paused) {
      bgMusic.play().catch(() => {
        // Safe fallback if gesture is needed: retry on user click
        const startOnGesture = () => {
          if (bgMusic && getAudioSettings().music) {
            bgMusic.play().catch(console.error);
          }
          window.removeEventListener('click', startOnGesture);
        };
        window.addEventListener('click', startOnGesture);
      });
    }
  } else {
    bgMusic.pause();
  }
}

export function stopBGM() {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}

// -----------------------------
// WEB AUDIO SYNTHESIS ENGINE (SFX)
// -----------------------------
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume if suspended by browser security policy
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playCorrectSound() {
  const settings = getAudioSettings();
  if (!settings.sound) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = settings.soundVolume / 100;
  const now = ctx.currentTime;

  // Synthesize a beautiful double-tone chime (C5 to G5/E6)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'triangle';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(523.25, now); // C5
  osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6

  osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
  osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.2); // E6

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume * 0.25, now + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.4);
  osc2.stop(now + 0.4);
}

export function playIncorrectSound() {
  const settings = getAudioSettings();
  if (!settings.sound) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = settings.soundVolume / 100;
  const now = ctx.currentTime;

  // Synthesize a warning sliding frequency buzz
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(120, now + 0.25);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume * 0.15, now + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  // Add lowpass filter to make the sawtooth sound warm and non-harsh
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, now);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playTickSound() {
  const settings = getAudioSettings();
  if (!settings.sound) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = settings.soundVolume / 100;
  const now = ctx.currentTime;

  // Short, high-pitched mechanical transient click
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume * 0.1, now + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

export function playClickSound() {
  const settings = getAudioSettings();
  if (!settings.sound) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const volume = settings.soundVolume / 100;
  const now = ctx.currentTime;

  // Subdued pop button click
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume * 0.15, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}
