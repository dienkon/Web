import type { PhysicalBubble } from '../core/SimulationTypes';

/** Migrate legacy one-label packets and equilibrate gas temperature to the
 * prescribed bulk liquid. Neither operation creates moles of a component. */
export function synchronizeBubbleGas(b: PhysicalBubble, temperature_c: number) {
  const total = b.gasPV_scene3_Pa ?? (b.nucleationPressure_Pa ?? 101325) * b.baseRadius ** 3;
  const vapor = b.vaporPV_scene3_Pa ?? (b.noncondensablePV_scene3_Pa !== undefined
    ? Math.max(0, total - b.noncondensablePV_scene3_Pa) : b.source === 'vapor' ? total : 0);
  const other = b.noncondensablePV_scene3_Pa ?? Math.max(0, total - vapor);
  const previousKelvin = Number.isFinite(b.temperature) && b.temperature > -273.15 ? b.temperature + 273.15 : temperature_c + 273.15;
  const factor = (temperature_c + 273.15) / previousKelvin;
  b.vaporPV_scene3_Pa = Math.max(0, vapor * factor);
  b.noncondensablePV_scene3_Pa = Math.max(0, other * factor);
  b.temperature = temperature_c;
  updateBubbleSource(b);
}

export function updateBubbleSource(b: PhysicalBubble) {
  const vapor = b.vaporPV_scene3_Pa ?? 0, other = b.noncondensablePV_scene3_Pa ?? 0;
  b.gasPV_scene3_Pa = vapor + other;
  b.source = vapor > 0 ? other > 0 ? 'mixed' : 'vapor' : 'reaction';
}

/** Merge at one common temperature. The short-step centroid is weighted by
 * gas content; each component's K/T is conserved even across legacy packets. */
export function mergeBubbleGas(a: PhysicalBubble, b: PhysicalBubble) {
  synchronizeBubbleGas(a, a.temperature);
  synchronizeBubbleGas(b, a.temperature);
  const left = a.gasPV_scene3_Pa!, right = b.gasPV_scene3_Pa!, sum = left + right;
  const fraction = sum > 0 ? right / sum : 0;
  for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz'] as const) a[key] += (b[key] - a[key]) * fraction;
  a.vaporPV_scene3_Pa! += b.vaporPV_scene3_Pa!;
  a.noncondensablePV_scene3_Pa! += b.noncondensablePV_scene3_Pa!;
  updateBubbleSource(a);
  b.merged = true;
}
