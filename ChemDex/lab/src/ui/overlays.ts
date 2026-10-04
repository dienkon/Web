/**
 * overlays.ts - UI state overlays: Conservation tracking, physical probe readouts,
 * reaction extent progress, and educational safety badges.
 * 
 * Invariants Tracked:
 * 1. Element & Mass Conservation error: < 1e-3 relative per minute.
 * 2. Charge Neutrality error: |Σ z_i · c_i| < 1e-6 M.
 * 3. Energy Conservation balance: ΔE = Q_in - Q_out - Q_latent.
 * 4. Educational Safety Badges: "Do not attempt at home" for alkali metals, thermite, NO2.
 */

export interface SimulationHUDStats {
  fps: number;
  simCpuMs: number;
  activeParticles: number;
  massErrorRelative: number;
  chargeErrorMolar: number;
  energyErrorRelative: number;
  tier: 'A' | 'B' | 'C';
}

export interface VesselProbeData {
  temperatureC: number;
  thermometerLagC: number;
  pH: number;
  volumeMl: number;
  massG: number;
  activeReactionName?: string;
  reactionExtentPercent?: number;
  hazardBadge?: string;
}

export class ThermometerProbe {
  private displayTempC: number = 20.0;
  private tauLagSec: number = 2.5; // 2.5 s glass-bulb thermal response lag

  public update(dt: number, actualTempC: number): number {
    if (dt <= 0) return this.displayTempC;
    // dT_disp/dt = (T_actual - T_disp) / τ
    this.displayTempC += ((actualTempC - this.displayTempC) / this.tauLagSec) * dt;
    return this.displayTempC;
  }

  public getTemperature(): number {
    return this.displayTempC;
  }
}

export function formatHazardBadge(hazards: string[]): { title: string; warningText: string; isDangerous: boolean } | null {
  if (!hazards || hazards.length === 0) return null;

  const isExplosive = hazards.includes('explosive') || hazards.includes('reactive');
  const isToxic = hazards.includes('toxic') || hazards.includes('poison');

  if (isExplosive) {
    return {
      title: 'DANGEROUS REACTION - DO NOT ATTEMPT AT HOME',
      warningText: 'Vigorous exothermic reaction releasing hydrogen gas or heat. Controlled simulation only.',
      isDangerous: true,
    };
  }

  if (isToxic) {
    return {
      title: 'HAZARDOUS SUBSTANCE - FUME HOOD REQUIRED',
      warningText: 'Reaction evolves toxic gas (e.g. NO2, SO2, Cl2). In real laboratories, always conduct inside a certified fume hood.',
      isDangerous: true,
    };
  }

  return null;
}
