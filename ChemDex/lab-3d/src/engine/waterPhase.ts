import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { WATER_CP_J_G_K, ICE_CP_J_G_K, WATER_FUSION_J_G, ICE_DENSITY_G_ML, VESSEL_HEAT_CAPACITY_J_K } from './waterProperties';
import { occupiedLiquidVolume } from '../handling/solidOccupancy';
import { neutralPhAtTemperature } from '../science/aqueousTemperature';

export function waterPhaseMasses(vessel: Pick<VesselState, 'contents'>) {
  let liquid_g = 0, ice_g = 0;
  for (const item of vessel.contents) {
    if (!sameMolecularFormula(item.formula, 'H2O') || item.mass_g <= 0) continue;
    if ((item.phase ?? item.state ?? 'l') === 'l') liquid_g += item.mass_g;
    if ((item.phase ?? item.state) === 's') ice_g += item.mass_g;
  }
  return { liquid_g, ice_g };
}

/** Pure condensed water only. No invented 0 °C freezing point for salt/acid mixtures.
 * Constant heat capacities and phase equilibrium; no supercooling or ice nucleation. */
export function equilibrateWaterIce(vessel: VesselState, heat_J: number) {
  const nonempty = vessel.contents.filter(item => item.moles > 1e-12 && item.mass_g > 0);
  if (!nonempty.length || nonempty.some(item => !sameMolecularFormula(item.formula, 'H2O')
    || !['l', 's'].includes(item.phase ?? item.state ?? 'l')) || vessel.isSealed) return null;
  const { liquid_g, ice_g } = waterPhaseMasses(vessel);
  if (ice_g === 0 && vessel.temperature_c >= 0 && heat_J >= 0) return null;
  const total = liquid_g + ice_g;
  const initialCapacity = VESSEL_HEAT_CAPACITY_J_K + liquid_g * WATER_CP_J_G_K + ice_g * ICE_CP_J_G_K;
  const enthalpy = initialCapacity * vessel.temperature_c - ice_g * WATER_FUSION_J_G + heat_J;
  const minimum = -273.15 * (VESSEL_HEAT_CAPACITY_J_K + total * ICE_CP_J_G_K) - total * WATER_FUSION_J_G;
  const represented = Math.max(minimum, enthalpy);
  const outsideModel_J = enthalpy - represented;
  let temperature_c = 0, frozen = 0;
  if (represented >= 0) temperature_c = represented / (VESSEL_HEAT_CAPACITY_J_K + total * WATER_CP_J_G_K);
  else if (represented <= -total * WATER_FUSION_J_G) {
    frozen = total;
    temperature_c = (represented + total * WATER_FUSION_J_G) / (VESSEL_HEAT_CAPACITY_J_K + total * ICE_CP_J_G_K);
  } else frozen = -represented / WATER_FUSION_J_G;
  const liquid = Math.max(0, total - frozen);
  const totalMoles = nonempty.reduce((sum, item) => sum + item.moles, 0);
  const contents = vessel.contents.filter(item => !nonempty.includes(item));
  if (liquid > 1e-12) contents.push({ formula: 'H2O', phase: 'l', mass_g: liquid, moles: totalMoles * liquid / total });
  if (frozen > 1e-12) contents.push({ formula: 'H2O', phase: 's', mass_g: frozen, moles: totalMoles * frozen / total });
  const fusionEnergy_J = (liquid - liquid_g) * WATER_FUSION_J_G;
  return { contents, temperature_c, volume_ml: liquid, iceVolume_ml: frozen / ICE_DENSITY_G_ML,
    fusionEnergy_J, outsideModel_J };
}

/** Known water volume, including reaction water in a previously dry vessel.
 * Do not infer a solution density for unknown aqueous/organic mixtures. */
export function materializeWaterVolume(vessel: VesselState): VesselState {
  const fluid = vessel.contents.filter(item => item.moles > 1e-12
    && ['l', 'aq'].includes(item.phase ?? item.state ?? ''));
  if (!fluid.length || fluid.some(item => !sameMolecularFormula(item.formula, 'H2O'))) return vessel;
  const volume_ml = fluid.reduce((sum, item) => sum + item.mass_g, 0);
  return Math.abs(volume_ml - vessel.volume_ml) > 1e-12
    ? { ...vessel, volume_ml, volume: volume_ml / vessel.capacity_ml } : vessel;
}

export function liquidSurfaceVolume(vessel: Pick<VesselState, 'contents' | 'volume_ml' | 'capacity_ml' | 'type' | 'iceVolume_ml'>): number {
  return occupiedLiquidVolume(vessel);
}

export function createIceWaterSample(shell: VesselState): VesselState {
  if (shell.capacity_ml < 20 + 5 / ICE_DENSITY_G_ML) throw new Error('Dụng cụ không đủ sức chứa nước–đá.');
  return { ...shell, name: 'Mẫu ảo: 20 g nước + 5 g đá', studioProgramId: undefined,
    studioSpecimenVariant: undefined, contents: [
      { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 },
      { formula: 'H2O', phase: 's', mass_g: 5, moles: 5 / 18.015 },
    ], substances: ['H2O'], mass_g: 25, volume_ml: 20, volume: 20 / shell.capacity_ml,
    temperature_c: 0, ph: neutralPhAtTemperature(0)!, phModel: 'ideal_aqueous_temperature',
    phReferenceTemperature_c: 0, iceVolume_ml: 5 / ICE_DENSITY_G_ML,
    thermalEnergyOutsideModel_J: 0, thermalModelLimit: undefined, programHeatApplied_J: 0,
    hasGas: false, isBoiling: false, hasPrecipitate: false, foam_ml: 0, escapedGas_g: {}, evaporated_ml: 0,
    liquidColor: '#f8fafc' };
}
