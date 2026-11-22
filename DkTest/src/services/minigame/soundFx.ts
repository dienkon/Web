/**
 * Lightweight Web Audio API sound synthesizer for Minigame events.
 * Zero external audio assets needed, respects mute toggle, safe in SSR/test environments.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playRaceStartFanfare(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6 bugle call
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.11);
    gain.gain.setValueAtTime(0.001, now + idx * 0.11);
    gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.11 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + (idx === 3 ? 0.42 : 0.12));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.11);
    osc.stop(now + idx * 0.11 + (idx === 3 ? 0.45 : 0.14));
  });
}

export function playGallopTick(muted = false, isBee = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = isBee ? "sawtooth" : "sine";
  osc.frequency.setValueAtTime(isBee ? 240 + Math.random() * 40 : 120 + Math.random() * 35, now);
  osc.frequency.exponentialRampToValueAtTime(isBee ? 190 : 55, now + 0.06);
  gain.gain.setValueAtTime(isBee ? 0.025 : 0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

export function playDiceShakeTick(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(320 + Math.random() * 260, now);
  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

export function playVictoryChime(muted = false) {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0.001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.58);
  });
}
