import type { FlameEmissionState } from '../types/chemistry';

/** Qualitative observed colors, not monochromatic wavelength-to-RGB conversion.
 * https://edu.rsc.org/resources/flame-tests-using-metal-salts/1875.article
 * Copper flame colors include molecular emitters; K's near-IR doublet alone
 * does not explain its visible lilac appearance. RGB values are illustrative. */
export const FLAME_TEST_COLORS: Record<string, { color: string; observation: string }> = {
  Li: { color: '#ef4444', observation: 'Đỏ thẫm' },
  Na: { color: '#f59e0b', observation: 'Vàng' },
  K: { color: '#c084fc', observation: 'Tím nhạt' },
  Ca: { color: '#ea580c', observation: 'Đỏ cam' },
  Cu: { color: '#10b981', observation: 'Xanh lục–lam' },
  Ba: { color: '#84cc16', observation: 'Xanh lục' },
};

export function createFlameEmission(element: string, startedAt_ms: number, duration_s = 7.5): FlameEmissionState | null {
  const appearance = Object.prototype.hasOwnProperty.call(FLAME_TEST_COLORS, element) ? FLAME_TEST_COLORS[element] : null;
  if (!appearance || !Number.isFinite(startedAt_ms) || startedAt_ms < 0 || !Number.isFinite(duration_s)
    || duration_s <= 0 || duration_s > 30) return null;
  return { element, color: appearance.color, startedAt_ms, duration_s };
}

/** Absolute monotonic age makes the envelope independent of frame rate and
 * mount time. The visual sample has an explicit end, never an asymptotic tail. */
export function sampleFlameEmission(emission: FlameEmissionState | undefined, now_ms: number) {
  if (!emission || !Number.isFinite(now_ms) || !Number.isFinite(emission.startedAt_ms)
    || !Number.isFinite(emission.duration_s) || emission.duration_s <= 0 || emission.duration_s > 30) return 0;
  const age = (now_ms - emission.startedAt_ms) / 1000;
  if (age < 0 || age >= emission.duration_s) return 0;
  const fadeIn = Math.min(0.12, emission.duration_s / 4);
  const fadeOut = Math.min(0.8, emission.duration_s / 4);
  return Math.max(0, Math.min(1, age / fadeIn, (emission.duration_s - age) / fadeOut));
}

export function flameEmissionExpired(emission: FlameEmissionState, now_ms: number) {
  return !Number.isFinite(now_ms) || !Number.isFinite(emission.startedAt_ms) || !Number.isFinite(emission.duration_s)
    || emission.duration_s <= 0 || emission.duration_s > 30 || now_ms >= emission.startedAt_ms + emission.duration_s * 1000;
}
