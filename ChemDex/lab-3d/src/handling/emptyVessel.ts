import type { SubstanceContent, VesselState } from '../types/chemistry';

/** Collect the current specimen, including independent wall-water inventory.
 * This adds no rinse water and leaves the same apparatus at its current pose
 * and temperature. Historical atmosphere/energy receipts remain intact. */
export function collectVesselContents(vessel: VesselState) {
  const wall = vessel.wallCondensation;
  const wallWater_g = (wall?.inner_g ?? 0) + (wall?.outer_g ?? 0);
  if (![vessel.mass_g, vessel.volume_ml, wall?.inner_g ?? 0, wall?.outer_g ?? 0].every(value => Number.isFinite(value) && value >= 0)
    || vessel.contents.some(row => ![row.mass_g, row.moles].every(value => Number.isFinite(value) && value >= 0))) return null;
  const recordedMass_g = vessel.contents.reduce((sum, row) => sum + row.mass_g, 0);
  if (Math.abs(recordedMass_g - vessel.mass_g) > Math.max(1e-6, vessel.mass_g * 1e-4)) return null;
  const contents: SubstanceContent[] = vessel.contents.filter(row => row.mass_g > 0 || row.moles > 0)
    .map(row => ({ ...row, location: 'bulk' }));
  if (wallWater_g > 0) contents.push({ formula: 'H2O', phase: 'l', location: 'bulk',
    mass_g: wallWater_g, moles: wallWater_g / 18.015, volume_ml: wallWater_g });
  const empty: VesselState = { ...vessel,
    contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0,
    effectSampleRevision: (vessel.effectSampleRevision ?? 0) + 1,
    stockMotion: { tick: 0, grains: [] }, dynamicSolids: [], dynamicLoad_g: 0,
    liquidMotion: undefined, liquidColor: undefined, liquidOpacity: undefined, liquidOptics: undefined,
    density_g_ml: undefined, viscosity_mPa_s: undefined, turbidity: 0,
    studioProgramId: undefined, studioMorphologyType: undefined, studioSpecimenVariant: undefined,
    ignitedProgramId: undefined, lastReactionId: undefined, reactionProgress: 0, programHeatApplied_J: 0,
    gasFlux: undefined, hydrogenCombustion: undefined, gasReplayBlocked: false,
    effectHeatInput_W: 0, effectHeatHandle: undefined, effectsEnvironment: undefined,
    thermalHeatingPower_W: 0, thermalModelLimit: undefined,
    hasPrecipitate: false, precipitateAmount_g: 0, precipitateColor: undefined,
    precipitateSubstance: undefined, precipitateMorphology: undefined,
    precipitateOutflow_g: undefined, precipitateCohortOutflow_g: undefined, leadIodidePhaseHistory: undefined,
    hasGas: false, gasColor: undefined, gasRate: 0, isBoiling: false, boilingIntensity: 0,
    foam_ml: 0, iceVolume_ml: 0, inversionRemaining_s: 0, isExplosion: false,
    recentPourContact: undefined, overflow_ml: 0, overflowTimestamp: undefined,
    wallCoating_ml: 0, wallCoatingMass_g: 0, outerWallCoating_ml: 0, outerWallCoatingMass_g: 0,
    filterPaperResidue_g: 0, filterPaperResidueSubstance: undefined,
    immiscibleOrganicVolume_ml: 0, immiscibleOrganicColor: undefined,
    stainIntensity: 0, stainColor: undefined, stainHeight: undefined, residues: [],
    condensationMist: 0, isSuperheated: false, bumpingSurge: false, isPulverized: false,
    fumingIntensity: 0, fumingColor: undefined, solidMorphology: undefined,
    isFiltrating: false, stopcockOpen: false, flowStatus: undefined,
    sealedHeadspace: undefined, internalPressureModel: 'ambient',
    internalPressure_atm: vessel.environment?.pressure_atm ?? 1,
    evaporationRate_g_s: 0, waterVaporOutflow_g_s: 0, waterVaporPartialPressure_Pa: 0,
    waterVaporCarrier_mol_s: 0, vaporSourceId: undefined,
    wallCondensation: wall ? { ...wall, inner_g: 0, outer_g: 0, innerBeads: [], outerBeads: [] } : undefined,
    ph: 7, phModel: undefined, phReferenceTemperature_c: undefined,
  };
  return { vessel: empty, contents, mass_g: vessel.mass_g + wallWater_g };
}
