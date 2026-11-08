/**
 * Headspace Pressure (Ideal Gas Law PV = nRT), Cork Pop, Thermal Shock Glass Shattering,
 * Superheating Bumping Surges, Wall Condensation, and Evaporative Solute Stains for ChemDex 2D
 *
 * Full parity with lab-3d's headspacePressure.ts, shatterInventory.ts, and wallCondensation.ts.
 */

import { EquipmentState, SpillPuddle } from '../types/equipment';
import { normalizeFormula } from '../chemistry/core/formula';

export const R_L_ATM_MOL_K = 0.082057;
export const STANDARD_TEMP_K = 298.15;
export const CORK_POP_PRESSURE_ATM = 1.8;
export const GLASS_RUPTURE_PRESSURE_ATM = 2.8;
export const THERMAL_SHOCK_DELTA_T_C = 120.0;

export interface VesselPhysicsHazardResult {
  internalPressure_atm: number;
  freeGasMoles: number;
  isSealed: boolean;
  isShattered: boolean;
  corkPopped: boolean;
  shatterReason_vi?: string;
  shatterReason_en?: string;
  wallCondensation: number;
  bumpingIntensity: number;
  superheat_c: number;
  evaporativeStain?: EquipmentState['evaporativeStain'];
  spillCreated?: SpillPuddle;
}

/**
 * Computes headspace pressure via Ideal Gas Law PV = nRT for sealed vessels,
 * checks for cork pop (> 1.8 atm) or glass rupture (> 2.8 atm), thermal shock,
 * inner wall condensation beads, and evaporative solute rings.
 */
export function stepVesselPressureAndDamage(
  eq: EquipmentState,
  dt: number,
  prevTemp_c: number,
  boilingPoint_c = 100.0
): VesselPhysicsHazardResult {
  const clampedDt = Math.max(0.001, Math.min(0.5, dt));
  let isSealed = Boolean(eq.isSealed);
  let isShattered = Boolean(eq.isShattered);
  let corkPopped = false;
  let shatterReason_vi: string | undefined;
  let shatterReason_en: string | undefined;

  // 1. Sum evolved gas moles trapped in vessel if sealed
  const evolvedGasMoles = eq.contents
    .filter(c => c.state === 'g')
    .reduce((sum, c) => sum + Math.max(0, c.moles), 0);
  let freeGasMoles = isSealed ? Math.max(eq.freeGasMoles ?? 0, evolvedGasMoles) : 0;

  // Headspace volume in Liters (minimum 5 mL headspace so pressure stays physical)
  const headspace_ml = Math.max(5.0, (eq.capacity_ml || 250) - eq.volume_ml);
  const headspace_L = headspace_ml / 1000.0;
  const temp_K = Math.max(273.15, eq.temperature_c + 273.15);

  // Baseline air moles trapped at 1 atm, 298.15 K
  const baselineAirMoles = (1.0 * headspace_L) / (R_L_ATM_MOL_K * STANDARD_TEMP_K);

  // If sealed and boiling, water vapor contributes additional steam moles
  if (isSealed && eq.temperature_c > 95 && eq.volume_ml > 0.5) {
    freeGasMoles += clampedDt * 0.0008 * Math.max(0, (eq.temperature_c - 95) / 10);
  }

  let internalPressure_atm = 1.0;
  if (isSealed && !isShattered) {
    internalPressure_atm = ((baselineAirMoles + freeGasMoles) * R_L_ATM_MOL_K * temp_K) / headspace_L;
    internalPressure_atm = Math.round(internalPressure_atm * 100) / 100;

    if (internalPressure_atm >= GLASS_RUPTURE_PRESSURE_ATM) {
      isShattered = true;
      isSealed = false;
      freeGasMoles = 0;
      internalPressure_atm = 1.0;
      shatterReason_vi = `Nổ vỡ bình thủy tinh do áp suất khí vượt ngưỡng bền (${GLASS_RUPTURE_PRESSURE_ATM} atm)!`;
      shatterReason_en = `Glass vessel shattered due to excessive internal gas pressure (> ${GLASS_RUPTURE_PRESSURE_ATM} atm)!`;
    } else if (internalPressure_atm >= CORK_POP_PRESSURE_ATM) {
      // Cork pops off safely unless clamped/locked
      if (!eq.isLocked) {
        corkPopped = true;
        isSealed = false;
        freeGasMoles = 0;
        internalPressure_atm = 1.0;
      }
    }
  } else {
    freeGasMoles = 0;
    internalPressure_atm = 1.0;
  }

  // 2. Thermal Shock Check (rapid ΔT > 120°C or dry heating past 260°C)
  const deltaT = Math.abs(eq.temperature_c - prevTemp_c);
  if (!isShattered) {
    if (deltaT >= THERMAL_SHOCK_DELTA_T_C) {
      isShattered = true;
      shatterReason_vi = `Nứt vỡ thủy tinh do sốc nhiệt đột ngột (ΔT = ${Math.round(deltaT)}°C)!`;
      shatterReason_en = `Glassware shattered from severe thermal shock (ΔT = ${Math.round(deltaT)}°C)!`;
    } else if (eq.isBeingHeated && eq.volume_ml <= 0.05 && eq.temperature_c >= 260) {
      isShattered = true;
      shatterReason_vi = 'Nứt vỡ bình thủy tinh do đun khan ở nhiệt độ quá cao (> 260°C)!';
      shatterReason_en = 'Glassware cracked and shattered from dry overheating (> 260°C)!';
    }
  }

  // 3. Superheating & Bumping Surge (when rapidly heated near boiling without stirring)
  let superheat_c = eq.superheat_c ?? 0;
  let bumpingIntensity = 0;
  if (eq.isBeingHeated && eq.volume_ml > 2 && !eq.isStirred && eq.temperature_c >= boilingPoint_c - 1.5) {
    superheat_c = Math.min(4.0, superheat_c + clampedDt * 0.8);
    if (superheat_c >= 2.2) {
      bumpingIntensity = Math.min(1.0, (superheat_c - 1.5) / 2.5);
      superheat_c = 0.4; // Release superheat in a sudden vapor bump
    }
  } else {
    superheat_c = Math.max(0, superheat_c - clampedDt * 1.5);
  }

  // 4. Inner Wall Condensation Droplets (forms when T > 55°C and liquid present)
  let wallCondensation = eq.wallCondensation ?? 0;
  if (eq.volume_ml > 0.5 && eq.temperature_c >= 55) {
    const targetCond = Math.min(1.0, (eq.temperature_c - 50) / 50);
    wallCondensation = wallCondensation + (targetCond - wallCondensation) * Math.min(1, clampedDt * 0.6);
  } else {
    wallCondensation = Math.max(0, wallCondensation - clampedDt * 0.25);
  }

  // 5. Evaporative Solute Stain Ring (when water boils dry leaving dissolved salt crust)
  let evaporativeStain = eq.evaporativeStain;
  if (eq.volume_ml <= 0.15 && (eq.totalEvaporated_ml ?? 0) > 1.0) {
    const solute = eq.contents.find(c => normalizeFormula(c.formula) !== 'H2O' && c.moles > 1e-5);
    if (solute) {
      evaporativeStain = {
        colorHex: eq.liquidColorHex || '#f8fafc',
        height_mm: 6,
        formula: solute.formula,
        opacity: 0.78,
      };
    }
  }

  // 6. If vessel just shattered and had liquid/contents, dump inventory into a tabletop SpillPuddle
  let spillCreated: SpillPuddle | undefined;
  if (isShattered && !eq.isShattered && eq.volume_ml > 0.1) {
    const primarySolute = eq.contents.find(c => normalizeFormula(c.formula) !== 'H2O') ?? eq.contents[0];
    spillCreated = {
      id: `spill_shatter_${eq.id}_${Date.now()}`,
      x: eq.x + eq.width / 2,
      y: eq.y + eq.height - 6,
      colorHex: eq.liquidColorHex || '#38bdf8',
      volume_ml: eq.volume_ml,
      formula: primarySolute?.formula || 'H2O',
      contents: eq.contents.filter(c => c.state !== 'g').map(c => ({ ...c })),
      temperature_c: eq.temperature_c,
      ph: eq.ph,
      hasGlassShards: true,
      radius_px: Math.min(95, 28 + Math.sqrt(eq.volume_ml) * 5.5),
      timestamp: Date.now(),
    };
  }

  return {
    internalPressure_atm,
    freeGasMoles,
    isSealed,
    isShattered,
    corkPopped,
    shatterReason_vi,
    shatterReason_en,
    wallCondensation,
    bumpingIntensity,
    superheat_c,
    evaporativeStain,
    spillCreated,
  };
}
