import { particleResponseFactors } from './particleSettling';

export type BubbleInterfaceMobility = 'mobile' | 'immobile';

/** Cd*Re avoids the Re=0 singularity. Mobile: spherical clean-interface Mei
 * et al. correlation; immobile: equivalent rigid-sphere Schiller–Naumann.
 * Neither branch solves surfactant transport, deformation or wall effects. */
export function bubbleDragCdRe(re: number, mobility: BubbleInterfaceMobility = 'immobile'): number {
  if (!Number.isFinite(re) || re < 0) return NaN;
  if (mobility === 'mobile') {
    const root = Math.sqrt(re);
    return 16 * (16 + 3.315 * root + 3 * re) / (16 + 3.315 * root + re);
  }
  return re < 1000 ? 24 * (1 + 0.15 * re ** 0.687) : 0.44 * re;
}

/** SI terminal slip of an isolated spherical bubble. Negligible gas density
 * is the default approximation for dilute gas in water near atmospheric P. */
export function bubbleTerminalSpeed(radius_m: number, liquidDensity_kg_m3: number, viscosity_Pa_s: number,
  mobility: BubbleInterfaceMobility = 'immobile', gasDensity_kg_m3 = 0): number {
  if (![radius_m, liquidDensity_kg_m3, viscosity_Pa_s, gasDensity_kg_m3].every(Number.isFinite)
    || radius_m <= 0 || liquidDensity_kg_m3 <= 0 || viscosity_Pa_s <= 0 || gasDensity_kg_m3 < 0) return 0;
  const delta = liquidDensity_kg_m3 - gasDensity_kg_m3;
  if (delta <= 0) return 0;
  const target = 16 * delta * 9.80665 * radius_m ** 2 / (3 * viscosity_Pa_s);
  let low = 0, high = target / bubbleDragCdRe(0, mobility);
  const rePerSpeed = 2 * radius_m * liquidDensity_kg_m3 / viscosity_Pa_s;
  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2;
    if (middle * bubbleDragCdRe(middle * rePerSpeed, mobility) > target) high = middle; else low = middle;
  }
  return (low + high) / 2;
}

/** Local frozen-drag response with spherical added mass C_A=1/2. Gas mass
 * alone would incorrectly give essentially instantaneous bubble acceleration. */
export function bubbleResponseTime(radius_m: number, liquidDensity_kg_m3: number, viscosity_Pa_s: number,
  slip_m_s: number, mobility: BubbleInterfaceMobility = 'immobile', gasDensity_kg_m3 = 0): number {
  if (![radius_m, liquidDensity_kg_m3, viscosity_Pa_s, slip_m_s, gasDensity_kg_m3].every(Number.isFinite)
    || radius_m <= 0 || liquidDensity_kg_m3 <= 0 || viscosity_Pa_s <= 0 || gasDensity_kg_m3 < 0) return 0;
  const re = 2 * radius_m * liquidDensity_kg_m3 * Math.abs(slip_m_s) / viscosity_Pa_s;
  return (gasDensity_kg_m3 + 0.5 * liquidDensity_kg_m3) * 16 * radius_m ** 2
    / (3 * viscosity_Pa_s * bubbleDragCdRe(re, mobility));
}

/** Constant carrier velocity/terminal-slip response, with analytic displacement.
 * Nonlinear drag is frozen at at least terminal slip for this small substep. */
export function advanceBubbleMotion(position: [number, number, number], velocity: [number, number, number],
  fluidVelocity: [number, number, number], radius_m: number, density: number, viscosity: number,
  dt: number, mobility: BubbleInterfaceMobility = 'immobile') {
  if (![...position, ...velocity, ...fluidVelocity, radius_m, density, viscosity, dt].every(Number.isFinite)
    || dt <= 0 || radius_m <= 0 || density <= 0 || viscosity <= 0) {
    return { position: [...position] as [number, number, number], velocity: [...velocity] as [number, number, number],
      terminal_m_s: 0, responseTime_s: 0 };
  }
  const terminal = bubbleTerminalSpeed(radius_m, density, viscosity, mobility);
  const slip = Math.max(terminal, Math.hypot(...velocity.map((u, i) => u - fluidVelocity[i])));
  const tau = bubbleResponseTime(radius_m, density, viscosity, slip, mobility);
  const f = particleResponseFactors(dt, tau);
  const target = [fluidVelocity[0], fluidVelocity[1] + terminal, fluidVelocity[2]];
  return { position: position.map((x, i) => x + velocity[i] * f.initialTime_s + target[i] * f.targetTime_s) as [number, number, number],
    velocity: velocity.map((u, i) => u + (target[i] - u) * f.relaxation) as [number, number, number],
    terminal_m_s: terminal, responseTime_s: tau };
}
