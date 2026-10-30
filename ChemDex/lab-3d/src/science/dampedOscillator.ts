/** Exact constant-force step for x'' + 2*zeta*omega*x' + omega²*x = force.
 * Input/output use one consistent displacement unit and seconds. This is a
 * reduced slosh oscillator, not a solution of the full liquid free surface. */
export function stepDampedOscillator(x: number, velocity: number, dt: number,
  omega: number, zeta: number, force = 0): { x: number; velocity: number } {
  if (![x, velocity, dt, omega, zeta, force].every(Number.isFinite) || dt <= 0 || omega <= 0 || zeta < 0) return { x, velocity };
  const equilibrium = force / (omega * omega), y = x - equilibrium;
  if (Math.abs(zeta - 1) < 1e-8) {
    const c = velocity + omega * y, decay = Math.exp(-omega * dt);
    return { x: equilibrium + decay * (y + c * dt), velocity: decay * (velocity - omega * c * dt) };
  }
  if (zeta < 1) {
    const alpha = zeta * omega, w = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-alpha * dt), c = Math.cos(w * dt), s = Math.sin(w * dt);
    return { x: equilibrium + decay * (y * c + (velocity + alpha * y) / w * s),
      velocity: decay * (velocity * c - (alpha * velocity + omega * omega * y) / w * s) };
  }
  const root = Math.sqrt(zeta * zeta - 1), sum = zeta + root;
  const r1 = -omega / sum, r2 = -omega * sum;
  const a = (velocity - r2 * y) / (r1 - r2), b = y - a;
  const e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt);
  return { x: equilibrium + a * e1 + b * e2, velocity: r1 * a * e1 + r2 * b * e2 };
}

/** Preserve a smoothing coefficient authored for 60 Hz across simulation dt. */
export function frameSmoothing(alphaAt60Hz: number, dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(alphaAt60Hz) || alphaAt60Hz <= 0) return 0;
  if (alphaAt60Hz >= 1) return 1;
  return -Math.expm1(Math.log1p(-alphaAt60Hz) * 60 * dt);
}
