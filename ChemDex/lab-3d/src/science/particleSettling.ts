function dragMultiplier(re: number): number {
  return re < 1000 ? 1 + 0.15 * re ** 0.687 : 0.44 * re / 24;
}

/** Isolated rigid-sphere terminal slip, Schiller–Naumann drag. Positive is
 * downward. This is an equivalent-sphere approximation for flakes and gels.
 * https://cpp.openfoam.org/v12/SchillerNaumann_8C_source.html
 */
export function sphereSettlingSpeed(radius_m: number, particleDensity_kg_m3: number,
  fluidDensity_kg_m3: number, viscosity_Pa_s: number): number {
  if (![radius_m, particleDensity_kg_m3, fluidDensity_kg_m3, viscosity_Pa_s].every(Number.isFinite)
    || radius_m <= 0 || particleDensity_kg_m3 <= 0 || fluidDensity_kg_m3 <= 0 || viscosity_Pa_s <= 0) return 0;
  const delta = particleDensity_kg_m3 - fluidDensity_kg_m3;
  if (delta === 0) return 0;
  const stokes = 2 * Math.abs(delta) * 9.80665 * radius_m ** 2 / (9 * viscosity_Pa_s);
  const rePerSpeed = 2 * radius_m * fluidDensity_kg_m3 / viscosity_Pa_s;
  let lo = 0, hi = stokes;
  for (let i = 0; i < 40; i++) {
    const speed = (lo + hi) / 2, re = speed * rePerSpeed;
    const correction = dragMultiplier(re);
    if (speed * correction > stokes) hi = speed; else lo = speed;
  }
  return Math.sign(delta) * (lo + hi) / 2;
}

/** Stokes response time divided by the drag multiplier at a frozen slip.
 * Exact linear-drag timescale at Re -> 0; local approximation at finite Re.
 * Uses physical sphere mass, never a representative glyph's inventory mass. */
export function sphereDragResponseTime(radius_m: number, particleDensity_kg_m3: number,
  fluidDensity_kg_m3: number, viscosity_Pa_s: number, slip_m_s: number): number {
  if (![radius_m, particleDensity_kg_m3, fluidDensity_kg_m3, viscosity_Pa_s, slip_m_s].every(Number.isFinite)
    || radius_m <= 0 || particleDensity_kg_m3 <= 0 || fluidDensity_kg_m3 <= 0 || viscosity_Pa_s <= 0) return 0;
  const re = 2 * radius_m * fluidDensity_kg_m3 * Math.abs(slip_m_s) / viscosity_Pa_s;
  return 2 * particleDensity_kg_m3 * radius_m ** 2 / (9 * viscosity_Pa_s * dragMultiplier(re));
}

/** Analytic constant-target, frozen-drag response over one step. Position uses
 * the integrated velocity, avoiding Euler drift when dt is larger than tau. */
export function particleResponseFactors(dt_s: number, responseTime_s: number) {
  if (!(dt_s > 0) || !Number.isFinite(dt_s)) return { relaxation: 0, initialTime_s: 0, targetTime_s: 0 };
  if (!(responseTime_s > 0) || !Number.isFinite(responseTime_s)) {
    return { relaxation: 1, initialTime_s: 0, targetTime_s: dt_s };
  }
  const x = dt_s / responseTime_s;
  const relaxation = -Math.expm1(-x);
  // dt - tau*(1-exp(-dt/tau)) loses precision for very short steps.
  const targetTime_s = x < 1e-3
    ? dt_s * x * (0.5 - x / 6 + x * x / 24 - x ** 3 / 120)
    : dt_s - responseTime_s * relaxation;
  return { relaxation, initialTime_s: dt_s - targetTime_s, targetTime_s };
}
