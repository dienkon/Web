/**
 * types.ts — Effect Atom Contract & Engine Interfaces
 * 
 * Defines the contract every Effect Atom module must implement,
 * enabling modular composition, strict parameter validation,
 * zero-allocation pooling, and automatic AI catalog digest generation.
 */

import { Anchor, PrecipMorphology, GasSpecies } from './vocab';

export type AtomCategory =
  | 'liquidOptics'
  | 'gas'
  | 'solidPhase'
  | 'thermal'
  | 'interface'
  | 'combustion'
  | 'light'
  | 'metal'
  | 'camera'
  | 'audio'
  | 'wall';

export type AtomName =
  | 'liquidSwirl'
  | 'beerLambertFade'
  | 'turbidityShift'
  | 'fluorescenceGlow'
  | 'liquidPhaseSplit'
  | 'nucleateBubbles'
  | 'effervescenceBurst'
  | 'buoyantGasPlume'
  | 'heavyVaporPour'
  | 'headspaceFog'
  | 'precipitateNucleation'
  | 'stokesSedimentation'
  | 'crystalGlitter'
  | 'surfaceDendriteGrowth'
  | 'metallicMirrorDeposit'
  | 'solidErosion'
  | 'boilingBumping'
  | 'thermalSteam'
  | 'convectionCurrents'
  | 'frostCreep'
  | 'flameCone'
  | 'pyrotechnicSparks'
  | 'incandescentGlow'
  | 'smokeBillow'
  | 'surfaceRipple'
  | 'meniscusDepression'
  | 'cellularFoamGrowth'
  | 'worthingtonMicroJet'
  | 'wallCondensationDroplets'
  | 'residueStain'
  | 'proceduralAcoustics'
  | 'cameraShake'
  | (string & {});

export type LedgerBinding =
  | `rate:${string}`
  | `amount:${string}`
  | 'heatRate'
  | 'turbidity'
  | 'temperature'
  | 'pressure'
  | 'gasHoldup'
  | 'foam_ml'
  | `supersaturation:${string}`;

export interface ParamFieldSpec<T = any> {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default: T;
  options?: string[];
  description: string;
}

export type ParamSpec<P> = {
  [K in keyof P]: ParamFieldSpec<P[K]>;
};

export interface AtomCtx {
  vesselId: string;
  position: [number, number, number];
  dimensions: {
    radius: number;
    height: number;
    liquidY: number;
    mouthY: number;
  };
  timeScale: number;
  seed: number;
}

export interface LedgerView {
  time_s: number;
  temperature_c: number;
  pressure_atm: number;
  pH: number;
  turbidity: number;
  liquidColor: string;
  gasHoldup: number;
  foam_ml: number;
  speciesAmounts: Record<string, number>; // moles
  speciesRates: Record<string, number>;   // mol/s
  heatRate_W: number;
}

export interface VesselPatch {
  liquidColor?: string;
  liquidOpacity?: number;
  turbidity?: number;
  foam_ml?: number;
  temperature_c?: number;
  hasGas?: boolean;
  gasRate?: number;
  gasColor?: string;
  hasPrecipitate?: boolean;
  precipitateColor?: string;
  precipitateMorphology?: string;
  fumingIntensity?: number;
  condensationMist?: number;
  residues?: Array<{ where: string; kind: string; color: string; amount: number }>;
}

export interface AtomHandle {
  atom: AtomName;
  instanceId: string;
  alive: boolean;
  poolRef?: any;
  custom?: any;
}

export interface GalleryEntry {
  title: string;
  description: string;
  params: Record<string, any>;
  duration_s?: number;
}

export interface EffectAtom<P = Record<string, any>> {
  name: AtomName;
  version: number;
  category: AtomCategory;
  summary_en: string;
  useWhen: string[];
  avoidWhen: string[];
  params: ParamSpec<P>;
  budget: {
    particles?: number;
    drawCalls?: number;
    shaderCost: 1 | 2 | 3;
  };
  anchorsAllowed: Anchor[];
  ledgerInputs?: LedgerBinding[];
  mount(ctx: AtomCtx, p: P): AtomHandle;
  update(h: AtomHandle, dt: number, s: LedgerView): void;
  writeBack?(h: AtomHandle, vessel: VesselPatch): void;
  dispose(h: AtomHandle): void;
  gallery: GalleryEntry[];
  tests: string[];
}
