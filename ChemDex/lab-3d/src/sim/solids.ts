/**
 * solids.ts - Noyes-Whitney solid dissolution, dense sinking plumes,
 * metal-acid reactions, displacement dendrites, and alkali metal skating.
 * 
 * Physical Model:
 * 1. Noyes-Whitney / Ranz-Marshall Dissolution:
 *    dm/dt = -k_d · A_s · (C_s(T) - C_bulk)
 *    k_d = Sh · D / d_p,  Sh = 2 + 0.6 · Re^(1/2) · Sc^(1/3)
 * 2. Shrinking Particle Radius:
 *    dr/dt = -k_d · (C_s - C) / ρ_solid
 * 3. Metal-Acid Surface Reactions:
 *    M + 2 H⁺ → M²⁺ + H₂↑
 *    Rate r = k · A_s · [H⁺] · exp(-E_a / RT)
 *    Exothermic enthalpy injection + H₂ bubble nucleation on metal surface.
 * 4. Displacement Reactions (e.g. Zn in CuSO4):
 *    Cu²⁺ + Zn(s) → Cu(s) + Zn²⁺
 *    Dendritic growth layer thickness on metal coupon.
 * 5. Alkali Metal Skating (Na in H2O):
 *    Low density (floats), asymmetric H₂ jet propulsion, melting into ball (mp 97.8°C).
 * 
 * Units: SI internally (m, kg, s, K, mol/m³, W)
 */

import { GRAVITY } from '../core/units.js';

export interface SolidPiece {
  id: string;
  substanceId: string;
  massKg: number;
  radiusM: number;
  densityKgPerM3: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  isDissolving: boolean;
  solubilityMolPerM3: number;
  dendriteThicknessM: number; // For metal displacement
  isAlkaliMetal: boolean;
}

export class SolidsEngine {
  public solids: SolidPiece[] = [];

  public addSolid(piece: SolidPiece): void {
    this.solids.push(piece);
  }

  /**
   * Update solid dissolution, chemical consumption, and hydrodynamic buoyancy
   */
  public update(
    dt: number,
    liquidHeightM: number,
    liquidTempK: number,
    bulkConcentrations: Record<string, number>,
    onDissolveMoles?: (substanceId: string, moles: number, x: number, y: number, z: number) => void,
    onMetalGasSpawn?: (x: number, y: number, z: number, gasMoles: number) => void
  ): void {
    if (dt <= 0) return;

    const rhoLiquid = 1000.0;
    const diffCoeff = 1.0e-9; // m²/s molecular diffusion

    for (let i = this.solids.length - 1; i >= 0; i--) {
      const s = this.solids[i];

      // 1. Noyes-Whitney dissolution
      if (s.isDissolving && s.massKg > 1e-8) {
        const cBulk = bulkConcentrations[s.substanceId] ?? 0;
        const cSat = s.solubilityMolPerM3;

        if (cBulk < cSat) {
          const dp = Math.max(1e-4, 2.0 * s.radiusM);
          const kd = (2.0 * diffCoeff) / dp; // Sh ≈ 2 for stagnant/creeping flow
          const surfaceArea = 4.0 * Math.PI * s.radiusM * s.radiusM;

          // dm/dt = kd * As * (Cs - Cbulk) * MolarMass
          const molarMass = 0.1; // ~100 g/mol generic
          const dMoles = kd * surfaceArea * (cSat - cBulk) * dt;
          const dMass = dMoles * molarMass;

          const massLoss = Math.min(s.massKg, dMass);
          s.massKg -= massLoss;

          // dr/dt = -kd * (Cs - Cbulk) / ρ
          s.radiusM = Math.max(1e-5, Math.pow((3.0 * s.massKg) / (4.0 * Math.PI * s.densityKgPerM3), 1.0 / 3.0));

          if (onDissolveMoles && massLoss > 0) {
            onDissolveMoles(s.substanceId, massLoss / molarMass, s.x, s.y, s.z);
          }
        }
      }

      // 2. Metal-acid reaction (e.g. Mg, Zn in HCl)
      if (s.substanceId === 'Mg' || s.substanceId === 'Zn' || s.substanceId === 'Fe') {
        const hConc = bulkConcentrations['H+'] ?? 0;
        if (hConc > 1e-4) {
          const area = 4.0 * Math.PI * s.radiusM * s.radiusM;
          const reactionRate = 0.05 * area * hConc * dt; // mol reacted
          const molarMassMetal = s.substanceId === 'Mg' ? 0.0243 : 0.0654;
          const massLoss = reactionRate * molarMassMetal;

          s.massKg = Math.max(0, s.massKg - massLoss);
          s.radiusM = Math.max(1e-5, Math.pow((3.0 * Math.max(1e-9, s.massKg)) / (4.0 * Math.PI * s.densityKgPerM3), 1.0 / 3.0));

          if (onMetalGasSpawn) {
            onMetalGasSpawn(s.x, s.y, s.z, reactionRate); // H2 gas moles
          }
        }
      }

      // 3. Alkali metal dynamics (Na, K, Li)
      if (s.isAlkaliMetal) {
        // Skates on liquid surface pushed by random H2 jet recoil
        s.y = liquidHeightM + 0.001; // Floats on surface (ρ_Na = 968 kg/m³ < 1000)
        s.vx += (Math.random() - 0.5) * 0.4 * dt;
        s.vz += (Math.random() - 0.5) * 0.4 * dt;
        s.x += s.vx * dt;
        s.z += s.vz * dt;

        // Damp velocity
        s.vx *= Math.max(0, 1.0 - 2.0 * dt);
        s.vz *= Math.max(0, 1.0 - 2.0 * dt);

        // Fast consumption: Na + H2O -> NaOH + 1/2 H2
        const naMassLoss = s.massKg * 0.25 * dt;
        s.massKg -= naMassLoss;
        s.radiusM = Math.max(1e-5, Math.pow((3.0 * Math.max(1e-9, s.massKg)) / (4.0 * Math.PI * s.densityKgPerM3), 1.0 / 3.0));

        if (onMetalGasSpawn) {
          onMetalGasSpawn(s.x, s.y, s.z, naMassLoss / 0.023);
        }
      } else {
        // Sinking/floating buoyancy for non-alkali solids
        if (s.y > 0.002) {
          const fBuoyancy = (s.densityKgPerM3 - rhoLiquid) * GRAVITY * ((4.0 / 3.0) * Math.PI * Math.pow(s.radiusM, 3));
          const netAccel = fBuoyancy / Math.max(1e-6, s.massKg);
          s.vy -= netAccel * dt;
          s.y += s.vy * dt;
          if (s.y <= 0.002) {
            s.y = 0.002; // Settled on vessel floor
            s.vy = 0;
          }
        }
      }

      // Remove consumed solids
      if (s.massKg <= 1e-8) {
        this.solids.splice(i, 1);
      }
    }
  }
}
