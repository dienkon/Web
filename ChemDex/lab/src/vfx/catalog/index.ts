/**
 * index.ts — Effect Atom Master Catalog & Registry
 * 
 * Aggregates all modular Effect Atoms into a single registry,
 * provides fast lookup by name, validates atom instances in ReactionPrograms,
 * and generates the lightweight digest consumed by LLM prompt directors.
 */

import { EffectAtom, AtomName } from './types';
import {
  liquidSwirlAtom,
  beerLambertFadeAtom,
  turbidityShiftAtom,
  fluorescenceGlowAtom,
  liquidPhaseSplitAtom
} from './atoms/liquidOptics';
import {
  nucleateBubblesAtom,
  effervescenceBurstAtom,
  buoyantGasPlumeAtom,
  heavyVaporPourAtom,
  headspaceFogAtom
} from './atoms/gasAtoms';
import {
  precipitateNucleationAtom,
  stokesSedimentationAtom,
  crystalGlitterAtom,
  surfaceDendriteGrowthAtom,
  metallicMirrorDepositAtom,
  solidErosionAtom
} from './atoms/solidAtoms';
import {
  boilingBumpingAtom,
  thermalSteamAtom,
  convectionCurrentsAtom,
  frostCreepAtom
} from './atoms/thermalAtoms';
import {
  flameConeAtom,
  pyrotechnicSparksAtom,
  incandescentGlowAtom,
  smokeBillowAtom
} from './atoms/combustionAtoms';
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
import { proceduralAcousticsAtom } from './atoms/audioAtoms';
import { cameraShakeAtom } from './atoms/cameraAtoms';

export const ALL_EFFECT_ATOMS: EffectAtom[] = [
  liquidSwirlAtom,
  beerLambertFadeAtom,
  turbidityShiftAtom,
  fluorescenceGlowAtom,
  liquidPhaseSplitAtom,
  nucleateBubblesAtom,
  effervescenceBurstAtom,
  buoyantGasPlumeAtom,
  heavyVaporPourAtom,
  headspaceFogAtom,
  precipitateNucleationAtom,
  stokesSedimentationAtom,
  crystalGlitterAtom,
  surfaceDendriteGrowthAtom,
  metallicMirrorDepositAtom,
  solidErosionAtom,
  boilingBumpingAtom,
  thermalSteamAtom,
  convectionCurrentsAtom,
  frostCreepAtom,
  flameConeAtom,
  pyrotechnicSparksAtom,
  incandescentGlowAtom,
  smokeBillowAtom,
  surfaceRippleAtom,
  meniscusDepressionAtom,
  cellularFoamGrowthAtom,
  worthingtonMicroJetAtom,
  wallCondensationDropletsAtom,
  residueStainAtom,
  proceduralAcousticsAtom,
  cameraShakeAtom
];

export const EFFECT_ATOM_CATALOG = ALL_EFFECT_ATOMS;

const ATOMS_BY_NAME = new Map<string, EffectAtom>();
for (const atom of ALL_EFFECT_ATOMS) {
  ATOMS_BY_NAME.set(atom.name, atom);
}

export function getEffectAtom(name: string): EffectAtom | undefined {
  return ATOMS_BY_NAME.get(name);
}

export function getAllEffectAtoms(): EffectAtom[] {
  return ALL_EFFECT_ATOMS;
}

export interface CatalogDigestEntry {
  name: string;
  category: string;
  summary_en: string;
  useWhen: string[];
  avoidWhen: string[];
  anchorsAllowed: string[];
  paramSpecs: Record<string, { type: string; default: any; min?: number; max?: number; description: string }>;
  exampleParams: Record<string, any>;
}

/**
 * Builds the compact JSON digest consumed by the Gemini AI Effect-Director.
 */
export function buildCatalogDigest(): CatalogDigestEntry[] {
  return ALL_EFFECT_ATOMS.map(atom => {
    const paramSpecs: Record<string, any> = {};
    for (const [key, spec] of Object.entries(atom.params)) {
      paramSpecs[key] = {
        type: spec.type,
        default: spec.default,
        min: spec.min,
        max: spec.max,
        description: spec.description
      };
    }

    return {
      name: atom.name,
      category: atom.category,
      summary_en: atom.summary_en,
      useWhen: atom.useWhen,
      avoidWhen: atom.avoidWhen,
      anchorsAllowed: atom.anchorsAllowed,
      paramSpecs,
      exampleParams: atom.gallery[0]?.params || {}
    };
  });
}
