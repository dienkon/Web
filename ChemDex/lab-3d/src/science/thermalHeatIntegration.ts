/** Integrate dE/dt = P - K*(T(E)-T_air), with the actual phase-state
 * temperature at net heat E. RK4 step doubling resolves continuous phase
 * boundaries instead of evaluating heat loss on a fictitious sensible rise.
 * Returns undefined on numerical failure; no partial material state is committed.
 */
export function integrateThermalHeat(p: { duration_s: number; inputPower_W: number;
  conductance_W_K: number; ambient_c: number; temperatureAtHeat: (energy_J: number) => number }): number | undefined {
  if (![p.duration_s, p.inputPower_W, p.conductance_W_K, p.ambient_c].every(Number.isFinite)
    || p.duration_s < 0 || p.inputPower_W < 0 || p.conductance_W_K < 0) return undefined;
  const rate = (e: number) => p.inputPower_W - p.conductance_W_K * (p.temperatureAtHeat(e) - p.ambient_c);
  const rk = (e: number, h: number) => {
    const k1 = rate(e), k2 = rate(e + h * k1 / 2), k3 = rate(e + h * k2 / 2), k4 = rate(e + h * k3);
    return e + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
  };
  let time = 0, energy = 0, h = p.duration_s;
  for (let iteration = 0; time < p.duration_s && iteration < 2048; iteration++) {
    h = Math.min(h, p.duration_s - time);
    if (!(h > 0) || time + h === time) return undefined;
    const full = rk(energy, h), half = rk(rk(energy, h / 2), h / 2);
    if (!Number.isFinite(full) || !Number.isFinite(half)) return undefined;
    const error = Math.abs(half - full) / 15;
    const tolerance = 1e-8 + 1e-10 * Math.max(Math.abs(energy), Math.abs(half), p.inputPower_W * p.duration_s);
    if (error <= tolerance) {
      energy = half + (half - full) / 15; time += h;
    }
    const factor = error === 0 ? 5 : Math.max(0.2, Math.min(5, 0.9 * (tolerance / error) ** 0.2));
    h *= factor;
  }
  return time >= p.duration_s ? energy : undefined;
}
