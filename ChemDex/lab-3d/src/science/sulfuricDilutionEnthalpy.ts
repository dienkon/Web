import type { SubstanceContent } from '../types/chemistry';
import { sameMolecularFormula } from './speciesIdentity';
import { WATER_CP_J_G_K } from '../engine/waterProperties';

const H2SO4_MOLAR_MASS_G = 98.079;
const H2O_MOLAR_MASS_G = 18.01528;
const H2SO4_CP_J_G_K = 1.42; // Concentrated H2SO4(l) ~25 °C reference heat capacity.

/**
 * Empirical integral enthalpy of dilution (-ΔH_int, kJ/mol H2SO4) for
 * H2SO4(l) + n H2O(l) -> H2SO4·nH2O(aq) at 25 °C reference.
 * Rational fit to NBS / Perry's tabulated integral dilution data:
 *   n=1 -> ~26.7 kJ/mol, n=2 -> ~39.3 kJ/mol, n=5 -> ~55.0 kJ/mol,
 *   n=10 -> ~63.3 kJ/mol, n->inf -> ~74.7 kJ/mol (finite-dilution plateau;
 *   excludes ultra-dilute HSO4- dissociation tail beyond n > 100).
 * Marked as 25 °C reference approximation; not activity-calibrated at elevated T.
 */
export function sulfuricDilutionEnthalpyKJPerMol(waterToAcidMoleRatio: number): number {
  if (!Number.isFinite(waterToAcidMoleRatio) || waterToAcidMoleRatio <= 0) return 0;
  return (74.7 * waterToAcidMoleRatio) / (waterToAcidMoleRatio + 1.798);
}

/**
 * Computes heat released (J, positive = exothermic) when diluting `acidMoles`
 * of H2SO4 from `initialWaterMoles` to `initialWaterMoles + addedWaterMoles`.
 */
export function sulfuricDilutionHeatJ(
  acidMoles: number,
  initialWaterMoles: number,
  addedWaterMoles: number,
): number {
  if (![acidMoles, initialWaterMoles, addedWaterMoles].every(Number.isFinite)) return 0;
  if (acidMoles <= 0 || initialWaterMoles < 0 || addedWaterMoles <= 0) return 0;
  const n1 = initialWaterMoles / acidMoles;
  const n2 = (initialWaterMoles + addedWaterMoles) / acidMoles;
  const dH_kJ_mol = Math.max(0, sulfuricDilutionEnthalpyKJPerMol(n2) - sulfuricDilutionEnthalpyKJPerMol(n1));
  return acidMoles * dH_kJ_mol * 1000;
}

export interface AcidDilutionOrderAssessment {
  applicable: boolean;
  waterIntoConcentratedAcid: boolean;
  heatReleased_J: number;
  adiabaticDeltaT_K: number;
  localContactDeltaT_K: number;
  warning_vi?: string;
  warning_en?: string;
}

function sumAcidAndWater(contents: readonly SubstanceContent[]) {
  let h2so4_mol = 0;
  let h2o_mol = 0;
  for (const item of contents) {
    if (item.location && item.location !== 'bulk') continue;
    if (!Number.isFinite(item.moles) || item.moles <= 0) continue;
    if (sameMolecularFormula(item.formula, 'H2SO4')) h2so4_mol += item.moles;
    else if (sameMolecularFormula(item.formula, 'H2O')) h2o_mol += item.moles;
  }
  return { h2so4_mol, h2o_mol };
}

/**
 * Evaluates thermal release and mixing-order hazard when combining a receiving
 * vessel and an incoming liquid dose containing H2SO4 and H2O.
 * Adding small water into concentrated H2SO4 concentrates the steep initial
 * differential enthalpy into a tiny surface water layer -> high local ΔT spike.
 */
export function assessAcidDilutionOrderHazard(
  receivingContents: readonly SubstanceContent[],
  incomingContents: readonly SubstanceContent[],
): AcidDilutionOrderAssessment {
  const recv = sumAcidAndWater(receivingContents);
  const inc = sumAcidAndWater(incomingContents);
  const totalAcid = recv.h2so4_mol + inc.h2so4_mol;
  const totalWater = recv.h2o_mol + inc.h2o_mol;
  if (!(totalAcid > 1e-12) || !(totalWater > 1e-12)) {
    return { applicable: false, waterIntoConcentratedAcid: false, heatReleased_J: 0, adiabaticDeltaT_K: 0, localContactDeltaT_K: 0 };
  }

  // Only count heat of dilution beyond the already-hydrated starting mixtures.
  const hBefore =
    (recv.h2so4_mol > 1e-12 ? recv.h2so4_mol * sulfuricDilutionEnthalpyKJPerMol(recv.h2o_mol / recv.h2so4_mol) : 0) +
    (inc.h2so4_mol > 1e-12 ? inc.h2so4_mol * sulfuricDilutionEnthalpyKJPerMol(inc.h2o_mol / inc.h2so4_mol) : 0);
  const hAfter = totalAcid * sulfuricDilutionEnthalpyKJPerMol(totalWater / totalAcid);
  const heatReleased_J = Math.max(0, (hAfter - hBefore) * 1000);

  const bulkCapacity_J_K = totalWater * H2O_MOLAR_MASS_G * WATER_CP_J_G_K + totalAcid * H2SO4_MOLAR_MASS_G * H2SO4_CP_J_G_K;
  const adiabaticDeltaT_K = bulkCapacity_J_K > 0 ? heatReleased_J / bulkCapacity_J_K : 0;

  const recvMassAcid = recv.h2so4_mol * H2SO4_MOLAR_MASS_G;
  const recvMassWater = recv.h2o_mol * H2O_MOLAR_MASS_G;
  const recvAcidMassFrac = recvMassAcid + recvMassWater > 0 ? recvMassAcid / (recvMassAcid + recvMassWater) : 0;
  const waterIntoConcentratedAcid = recv.h2so4_mol > 1e-6 && recvAcidMassFrac >= 0.70 && inc.h2o_mol > 1e-6 && inc.h2so4_mol <= inc.h2o_mol * 0.05;

  // When lighter water floats atop dense concentrated H2SO4, initial hydration heat
  // concentrates in the incoming water interface rather than the whole acid bulk.
  const interfaceCapacity_J_K = waterIntoConcentratedAcid
    ? Math.max(1e-6, inc.h2o_mol * H2O_MOLAR_MASS_G * WATER_CP_J_G_K + Math.min(recv.h2so4_mol, inc.h2o_mol) * H2SO4_MOLAR_MASS_G * H2SO4_CP_J_G_K)
    : bulkCapacity_J_K;
  const localContactDeltaT_K = interfaceCapacity_J_K > 0 ? heatReleased_J / interfaceCapacity_J_K : 0;

  return {
    applicable: heatReleased_J > 0,
    waterIntoConcentratedAcid,
    heatReleased_J,
    adiabaticDeltaT_K,
    localContactDeltaT_K,
    ...(waterIntoConcentratedAcid ? {
      warning_vi: 'Cảnh báo an toàn: Rót nước vào H2SO4 đặc tỏa nhiệt mạnh tại lớp bề mặt, dễ gây sôi cục bộ và bắn axit. Luôn rót từ từ axit vào nước.',
      warning_en: 'Safety warning: Adding water into concentrated H2SO4 concentrates dilution heat in the surface layer, risking localized boiling/spattering. Always add acid slowly to water.',
    } : {}),
  };
}
