/**
 * index.ts — Effect Atom Master Catalog & Registry (§4, §2.5)
 * 
 * Aggregates all modular Effect Atoms (>= 110 distinct concrete physical atoms)
 * into a single unified registry, provides O(1) lookup by name, validates
 * atom instances in ReactionPrograms, and generates the lightweight digest
 * consumed by the AI Effect Director.
 */

import { EffectAtom, AtomName } from './types';

// Category 4.A: Liquid optics & color dynamics
import {
  colorFrontDiffusiveAtom,
  colorFrontAdvectiveAtom,
  beerLambertBlendAtom,
  indicatorTransitionAtom,
  fadeAbsorbanceAtom,
  multiStageColorLadderAtom,
  schlierenStreaksAtom,
  turbidityRiseAtom,
  tyndallBeamAtom,
  opalescenceNearCriticalAtom,
  thermochromicShiftAtom,
  equilibriumShiftLeChatelierAtom,
  pHGradientLayersAtom,
  fluorescenceUVAtom,
  chemiluminescenceAtom,
  oscillatingColorAtom,
  liesegangRingsAtom,
  liquidLayerStratificationAtom,
  liquidSwirlAtom,
  beerLambertFadeAtom,
  turbidityShiftAtom,
  fluorescenceGlowAtom,
  liquidPhaseSplitAtom
} from './atoms/liquidOptics';

// Category 4.B: Gas & bubble phenomena
import {
  nucleationSiteBubbleStreamAtom,
  fineEffervescenceCloudAtom,
  vigorousBoilBubblesAtom,
  bumpingSurgeAtom,
  bubblesClingToSolidAtom,
  solidFlotationByGasAtom,
  foamHeadAtom,
  foamClimbRunawayAtom,
  viscousFoamRopeAtom,
  burstAerosolSprayAtom,
  gasBalloonInflateAtom,
  gasSyringeCollectAtom,
  pneumaticTroughCollectionAtom,
  gasJarFillByDisplacementAtom,
  splintTestSetAtom,
  limewaterCloudingAtom,
  indicatorPaperTestsAtom,
  gasDissolutionHenryAtom,
  suckBackReverseFlowAtom,
  pressureBuildupAtom,
  nucleateBubblesAtom,
  effervescenceBurstAtom,
  buoyantGasPlumeAtom,
  heavyVaporPourAtom,
  headspaceFogAtom
} from './atoms/gasAtoms';

// Category 4.C: Vapor, smoke & fume phenomena (§4.0 physics)
import {
  hotSteamPlumeAtom,
  condensationFogOnWallsAtom,
  dryIceFogCascadeAtom,
  ammoniumChlorideSmokeAtom,
  hclFumingInHumidAirAtom,
  hno3FumingRedAtom,
  heavyYellowGreenChlorineAtom,
  bromineVaporLayerAtom,
  iodineVioletVaporAtom,
  no2BrownPlumeAtom,
  noToNo2AtMouthAtom,
  so2HazeMoistAtom,
  sulfurBlueFlameSmokeAtom,
  magnesiumOxideSmokeAtom,
  sodiumOxideSmokeAtom,
  steelWoolSparkShowerAtom,
  sootBlackSmokeAtom,
  sugarCarbonSnakeAtom,
  ammoniumDichromateVolcanoAtom,
  hydrogenPopFlashAtom,
  candleBurnPlumeAtom,
  heatHazeShimmerAtom
} from './atoms/fumeAtoms';

// Category 4.D: Solid phases, precipitates & crystals
import {
  fineMilkyPowderAtom,
  curdyClumpsAtom,
  rustFlocAtom,
  blueGelAtom,
  whiteGelatinousAmphotericAtom,
  goldenHexPlatesAtom,
  blackFineColloidAtom,
  yellowDensePowderAtom,
  colloidalSulfurHazeAtom,
  needleCrystalGrowthAtom,
  cubicCrystalGrowthAtom,
  octahedralCrystalGrowthAtom,
  hydrateBlueCrystalsAtom,
  crystalFernFrostAtom,
  dendriticMetalTreeAtom,
  silverMirrorWallAtom,
  copperPlatingCoatAtom,
  crystalSpikeBloomAtom,
  evaporationRimCrustAtom,
  ringStainOnWallAtom,
  sedimentBedCompactionAtom,
  sedimentAvalancheAtom,
  resuspensionCloudAtom,
  settlingFrontInterfaceAtom,
  floatingPrecipitateAtom,
  precipitateRedissolvingAtom,
  precipitateAgeingAtom,
  filterCakeFormationAtom,
  precipitateNucleationAtom,
  stokesSedimentationAtom,
  crystalGlitterAtom,
  surfaceDendriteGrowthAtom,
  metallicMirrorDepositAtom,
  solidErosionAtom
} from './atoms/solidAtoms';

// Category 4.E: Metal & solid-surface reactions
import {
  metalDissolveWithBubblesAtom,
  pittingAndEtchingAtom,
  sodiumDartRunAtom,
  potassiumLilacFlameAtom,
  calciumSlowGasMilkyAtom,
  aluminumFoilInNaOHAtom,
  aluminumCopperChlorideDisplacementAtom,
  coppernitricMetalConsumeAtom,
  passivationAtom,
  tarnishAndPatinaAtom,
  rustFormationAtom,
  steelWoolBurnAtom,
  magnesiumRibbonBurnAtom,
  zincGranuleConsumptionAtom,
  coupledGalvanicCellAtom
} from './atoms/metalAtoms';

// Category 4.F: Thermal, thermodynamic & phase phenomena
import {
  exothermicGlowOverlayAtom,
  endothermicFrostAtom,
  boilingStagesAtom,
  superheatBurstAtom,
  iceMeltShrinkAtom,
  meltingSolidAtom,
  dissolutionHeatAtom,
  dilutionHeatConcAcidAtom,
  thermalShockCrackAtom,
  sublimationAtom,
  calorimetryCupAtom,
  hotPlateGlowAtom,
  boilingBumpingAtom,
  thermalSteamAtom,
  convectionCurrentsAtom,
  frostCreepAtom
} from './atoms/thermalAtoms';

// Category 4.G: Combustion, flames & light
import {
  flameColorByElementAtom,
  burnerFlameZonesAtom,
  ethanolBurnerFlameAtom,
  hydrogenFlameFaintAtom,
  flareLightCastAtom,
  afterimageBloomAtom,
  emberGlowingSolidAtom,
  sparkLauncherAtom,
  flashFireEthanolSpillAtom,
  splintFlameResponseAtom,
  combustionProductsAtom,
  luminolAndGlowstickAtom,
  flameConeAtom,
  pyrotechnicSparksAtom,
  incandescentGlowAtom,
  smokeBillowAtom
} from './atoms/combustionAtoms';

// Category 4.H: Kinetic, clock & oscillating reactions
import {
  iodineClockSwitchAtom,
  thiosulfateCrossDisappearAtom,
  landoltReactionFlashAtom,
  bzOscillatorAtom,
  blueBottleShakeAtom,
  chameleonMnO4Atom,
  catalyticDecompositionAtom,
  autocatalysisFrontAtom,
  enzymeFoamAtom,
  reactionDiffusionFrontAtom
} from './atoms/clockAtoms';

// Category 4.I: Camera, viewport & sensory
import {
  cameraTraumaShakeAtom,
  slowMoLayerAtom,
  hapticPulsesAtom,
  hudObservationToastsAtom,
  dangerOverlayAtom,
  cameraShakeAtom
} from './atoms/cameraAtoms';

import {
  proceduralSoundBankAtom,
  proceduralAcousticsAtom
} from './atoms/audioAtoms';

// Interface & Wall atoms
import {
  surfaceRippleAtom,
  meniscusDepressionAtom,
  cellularFoamGrowthAtom,
  worthingtonMicroJetAtom
} from './atoms/interfaceAtoms';

import {
  wallCondensationDropletsAtom,
  residueStainAtom
} from './atoms/wallAtoms';

export const ALL_EFFECT_ATOMS: EffectAtom[] = [
  // 4.A Liquid Optics (23)
  colorFrontDiffusiveAtom,
  colorFrontAdvectiveAtom,
  beerLambertBlendAtom,
  indicatorTransitionAtom,
  fadeAbsorbanceAtom,
  multiStageColorLadderAtom,
  schlierenStreaksAtom,
  turbidityRiseAtom,
  tyndallBeamAtom,
  opalescenceNearCriticalAtom,
  thermochromicShiftAtom,
  equilibriumShiftLeChatelierAtom,
  pHGradientLayersAtom,
  fluorescenceUVAtom,
  chemiluminescenceAtom,
  oscillatingColorAtom,
  liesegangRingsAtom,
  liquidLayerStratificationAtom,
  liquidSwirlAtom,
  beerLambertFadeAtom,
  turbidityShiftAtom,
  fluorescenceGlowAtom,
  liquidPhaseSplitAtom,

  // 4.B Gas & Bubble (25)
  nucleationSiteBubbleStreamAtom,
  fineEffervescenceCloudAtom,
  vigorousBoilBubblesAtom,
  bumpingSurgeAtom,
  bubblesClingToSolidAtom,
  solidFlotationByGasAtom,
  foamHeadAtom,
  foamClimbRunawayAtom,
  viscousFoamRopeAtom,
  burstAerosolSprayAtom,
  gasBalloonInflateAtom,
  gasSyringeCollectAtom,
  pneumaticTroughCollectionAtom,
  gasJarFillByDisplacementAtom,
  splintTestSetAtom,
  limewaterCloudingAtom,
  indicatorPaperTestsAtom,
  gasDissolutionHenryAtom,
  suckBackReverseFlowAtom,
  pressureBuildupAtom,
  nucleateBubblesAtom,
  effervescenceBurstAtom,
  buoyantGasPlumeAtom,
  heavyVaporPourAtom,
  headspaceFogAtom,

  // 4.C Vapor, Smoke & Fume (22)
  hotSteamPlumeAtom,
  condensationFogOnWallsAtom,
  dryIceFogCascadeAtom,
  ammoniumChlorideSmokeAtom,
  hclFumingInHumidAirAtom,
  hno3FumingRedAtom,
  heavyYellowGreenChlorineAtom,
  bromineVaporLayerAtom,
  iodineVioletVaporAtom,
  no2BrownPlumeAtom,
  noToNo2AtMouthAtom,
  so2HazeMoistAtom,
  sulfurBlueFlameSmokeAtom,
  magnesiumOxideSmokeAtom,
  sodiumOxideSmokeAtom,
  steelWoolSparkShowerAtom,
  sootBlackSmokeAtom,
  sugarCarbonSnakeAtom,
  ammoniumDichromateVolcanoAtom,
  hydrogenPopFlashAtom,
  candleBurnPlumeAtom,
  heatHazeShimmerAtom,

  // 4.D Solid Phase & Crystals (34)
  fineMilkyPowderAtom,
  curdyClumpsAtom,
  rustFlocAtom,
  blueGelAtom,
  whiteGelatinousAmphotericAtom,
  goldenHexPlatesAtom,
  blackFineColloidAtom,
  yellowDensePowderAtom,
  colloidalSulfurHazeAtom,
  needleCrystalGrowthAtom,
  cubicCrystalGrowthAtom,
  octahedralCrystalGrowthAtom,
  hydrateBlueCrystalsAtom,
  crystalFernFrostAtom,
  dendriticMetalTreeAtom,
  silverMirrorWallAtom,
  copperPlatingCoatAtom,
  crystalSpikeBloomAtom,
  evaporationRimCrustAtom,
  ringStainOnWallAtom,
  sedimentBedCompactionAtom,
  sedimentAvalancheAtom,
  resuspensionCloudAtom,
  settlingFrontInterfaceAtom,
  floatingPrecipitateAtom,
  precipitateRedissolvingAtom,
  precipitateAgeingAtom,
  filterCakeFormationAtom,
  precipitateNucleationAtom,
  stokesSedimentationAtom,
  crystalGlitterAtom,
  surfaceDendriteGrowthAtom,
  metallicMirrorDepositAtom,
  solidErosionAtom,

  // 4.E Metal Reactions (15)
  metalDissolveWithBubblesAtom,
  pittingAndEtchingAtom,
  sodiumDartRunAtom,
  potassiumLilacFlameAtom,
  calciumSlowGasMilkyAtom,
  aluminumFoilInNaOHAtom,
  aluminumCopperChlorideDisplacementAtom,
  coppernitricMetalConsumeAtom,
  passivationAtom,
  tarnishAndPatinaAtom,
  rustFormationAtom,
  steelWoolBurnAtom,
  magnesiumRibbonBurnAtom,
  zincGranuleConsumptionAtom,
  coupledGalvanicCellAtom,

  // 4.F Thermal & Phase (16)
  exothermicGlowOverlayAtom,
  endothermicFrostAtom,
  boilingStagesAtom,
  superheatBurstAtom,
  iceMeltShrinkAtom,
  meltingSolidAtom,
  dissolutionHeatAtom,
  dilutionHeatConcAcidAtom,
  thermalShockCrackAtom,
  sublimationAtom,
  calorimetryCupAtom,
  hotPlateGlowAtom,
  boilingBumpingAtom,
  thermalSteamAtom,
  convectionCurrentsAtom,
  frostCreepAtom,

  // 4.G Combustion & Light (16)
  flameColorByElementAtom,
  burnerFlameZonesAtom,
  ethanolBurnerFlameAtom,
  hydrogenFlameFaintAtom,
  flareLightCastAtom,
  afterimageBloomAtom,
  emberGlowingSolidAtom,
  sparkLauncherAtom,
  flashFireEthanolSpillAtom,
  splintFlameResponseAtom,
  combustionProductsAtom,
  luminolAndGlowstickAtom,
  flameConeAtom,
  pyrotechnicSparksAtom,
  incandescentGlowAtom,
  smokeBillowAtom,

  // 4.H Kinetic & Clocks (10)
  iodineClockSwitchAtom,
  thiosulfateCrossDisappearAtom,
  landoltReactionFlashAtom,
  bzOscillatorAtom,
  blueBottleShakeAtom,
  chameleonMnO4Atom,
  catalyticDecompositionAtom,
  autocatalysisFrontAtom,
  enzymeFoamAtom,
  reactionDiffusionFrontAtom,

  // 4.I Camera & Audio (8)
  cameraTraumaShakeAtom,
  slowMoLayerAtom,
  hapticPulsesAtom,
  hudObservationToastsAtom,
  dangerOverlayAtom,
  cameraShakeAtom,
  proceduralSoundBankAtom,
  proceduralAcousticsAtom,

  // Interface & Wall (6)
  surfaceRippleAtom,
  meniscusDepressionAtom,
  cellularFoamGrowthAtom,
  worthingtonMicroJetAtom,
  wallCondensationDropletsAtom,
  residueStainAtom
];

export const EFFECT_ATOM_CATALOG = ALL_EFFECT_ATOMS;

const ATOMS_BY_NAME = new Map<string, EffectAtom>();
for (const atom of ALL_EFFECT_ATOMS) {
  ATOMS_BY_NAME.set(atom.name, atom);
}

export function getEffectAtom(name: string): EffectAtom | undefined {
  return ATOMS_BY_NAME.get(name);
}

export function hasEffectAtom(name: string): boolean {
  return ATOMS_BY_NAME.has(name);
}

/**
 * Generates the compact JSON digest structure for LLM prompts (§2.5, §7.3).
 */
export function buildCatalogDigest(): Array<{
  name: string;
  category: string;
  summary_en: string;
  useWhen: string[];
  avoidWhen: string[];
  anchorsAllowed: string[];
  paramSpecs: Record<string, any>;
  example: any;
}> {
  return ALL_EFFECT_ATOMS.map((a) => ({
    name: a.name,
    category: a.category,
    summary_en: a.summary_en,
    useWhen: a.useWhen,
    avoidWhen: a.avoidWhen,
    anchorsAllowed: a.anchorsAllowed,
    paramSpecs: Object.fromEntries(
      Object.entries(a.params).map(([k, v]) => [
        k,
        {
          type: v.type,
          min: v.min,
          max: v.max,
          default: v.default,
          unit: v.unit,
          description: v.description,
        },
      ])
    ),
    example: a.gallery[0] || { title: a.name, params: {} }
  }));
}
