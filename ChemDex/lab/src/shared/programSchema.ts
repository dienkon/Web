/**
 * programSchema.ts — Reaction Program Schema & Validation Engine
 * 
 * Formal data contract for declarative Reaction Programs.
 * Provides Zod validator, JSON schema exporter for Gemini,
 * and robust program repair/validation helpers.
 */

import { z } from 'zod';
import { Phase, PrecipMorphology, GasSpecies, Anchor } from '../vfx/catalog/vocab';

export type GhsTag =
  | 'GHS01_explosive'
  | 'GHS02_flammable'
  | 'GHS03_oxidizer'
  | 'GHS04_compressed_gas'
  | 'GHS05_corrosive'
  | 'GHS06_toxic'
  | 'GHS07_harmful'
  | 'GHS08_health_hazard'
  | 'GHS09_environmental';

export type SpeciesRoleType = 'reactant' | 'product' | 'catalyst' | 'spectator';

export interface SpeciesRole {
  formula: string;
  name_en?: string;
  name_vi?: string;
  role: SpeciesRoleType;
  coeff: number;
  phase: Phase;
  molarMass_g_mol?: number;
  colorHex?: string;
  density_g_ml?: number;
  hazards?: GhsTag[];
}

export type KineticsModel =
  | 'instant'
  | 'first_order'
  | 'second_order'
  | 'autocatalytic'
  | 'induction_then_fast'
  | 'oscillatory'
  | 'diffusion_limited'
  | 'surface_limited'
  | 'heat_activated';

export interface Kinetics {
  model: KineticsModel;
  halfTime_s: number;
  induction_s?: number;
  q10?: number;
  stirSensitivity?: number;
  period_s?: number;
}

export type CurveType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'pulse' | 'plateau';

export interface AtomInstance {
  id: string;
  atom: string; // Must exist in Effect Atom catalog
  anchor: Anchor;
  window: [number, number]; // [start, end] normalized 0..1
  startOn?:
    | { species: string; moleFractionConsumed: number }
    | { event: 'pourImpact' | 'heat>T' | 'stir' | 'shake' | 'tilt' | 'seal' | 'open' };
  intensity: number | {
    bind: string;
    gain?: number;
    curve?: CurveType;
  };
  params: Record<string, number | string | boolean | number[]>;
  fallbackAtom?: string;
}

export interface AfterState {
  liquidColor: string;
  liquidOpacity: number;
  turbidity: number;
  precipitate?: {
    substance: string;
    morphology: PrecipMorphology;
    color: string;
    mass_g: 'fromLedger' | number;
  };
  residues?: Array<{
    where: 'wall' | 'bottom' | 'rim' | 'outside' | 'stopper' | 'filter';
    kind: string;
    color: string;
    amount: number;
  }>;
  solidsRemaining?: Array<{
    formula: string;
    mass_g: 'fromLedger' | number;
    morphologyChange?: string;
  }>;
  gasesOffgassed: Array<{
    species: GasSpecies | string;
    mol: 'fromLedger' | number;
    escaped: boolean;
  }>;
}

export interface ReactionProgram {
  schema: 'chemdex.program/1';
  id: string;
  provenance: 'handcrafted' | 'rule-derived' | 'ai' | 'fallback';
  controller?: string;
  chemistry: {
    equation: string;
    ionic?: string;
    species: SpeciesRole[];
    deltaH_kJ_per_mol?: number | null;
    kinetics: Kinetics;
    conditions?: {
      minTemp_c?: number;
      catalyst?: string;
      light?: boolean;
      medium?: string;
      sealed?: boolean;
    };
    hazards?: GhsTag[];
    warning_vi?: string;
    warning_en?: string;
  };
  visual: {
    duration_s: number;
    timeWarp?: {
      physical_s: number;
      note_vi?: string;
      note_en?: string;
    };
    timeline: AtomInstance[];
    after: AfterState;
  };
  explain: {
    observation_vi: string;
    observation_en: string;
    why_vi: string;
    why_en: string;
  };
  confidence: number;
}

// -------------------------------------------------------------
// Zod Schema Definitions
// -------------------------------------------------------------

const HexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const SpeciesRoleSchema = z.object({
  formula: z.string(),
  name_en: z.string().optional(),
  name_vi: z.string().optional(),
  role: z.enum(['reactant', 'product', 'catalyst', 'spectator']),
  coeff: z.number().positive(),
  phase: z.enum(['s', 'l', 'g', 'aq']),
  molarMass_g_mol: z.number().positive().optional(),
  colorHex: z.string().regex(HexColorRegex).optional(),
  density_g_ml: z.number().positive().optional(),
  hazards: z.array(z.string()).optional()
});

export const KineticsSchema = z.object({
  model: z.enum([
    'instant',
    'first_order',
    'second_order',
    'autocatalytic',
    'induction_then_fast',
    'oscillatory',
    'diffusion_limited',
    'surface_limited',
    'heat_activated'
  ]),
  halfTime_s: z.number().nonnegative(),
  induction_s: z.number().nonnegative().optional(),
  q10: z.number().positive().default(2.0).optional(),
  stirSensitivity: z.number().min(0).max(1).optional(),
  period_s: z.number().positive().optional()
});

export const AtomInstanceSchema = z.object({
  id: z.string(),
  atom: z.string(),
  anchor: z.string(),
  window: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  startOn: z.union([
    z.object({ species: z.string(), moleFractionConsumed: z.number().min(0).max(1) }),
    z.object({ event: z.enum(['pourImpact', 'heat>T', 'stir', 'shake', 'tilt', 'seal', 'open']) })
  ]).optional(),
  intensity: z.union([
    z.number().min(0),
    z.object({
      bind: z.string(),
      gain: z.number().optional(),
      curve: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'pulse', 'plateau']).optional()
    })
  ]).default(1.0),
  params: z.record(z.string(), z.any()).default({}),
  fallbackAtom: z.string().optional()
});

export const AfterStateSchema = z.object({
  liquidColor: z.string().regex(HexColorRegex).default('#ffffff'),
  liquidOpacity: z.number().min(0).max(1).default(1.0),
  turbidity: z.number().min(0).max(1).default(0.0),
  precipitate: z.object({
    substance: z.string(),
    morphology: z.string(),
    color: z.string().regex(HexColorRegex),
    mass_g: z.union([z.literal('fromLedger'), z.number().nonnegative()]).default('fromLedger')
  }).optional(),
  residues: z.array(z.object({
    where: z.enum(['wall', 'bottom', 'rim', 'outside', 'stopper', 'filter']),
    kind: z.string(),
    color: z.string().regex(HexColorRegex),
    amount: z.number().nonnegative()
  })).optional(),
  solidsRemaining: z.array(z.object({
    formula: z.string(),
    mass_g: z.union([z.literal('fromLedger'), z.number().nonnegative()]),
    morphologyChange: z.string().optional()
  })).optional(),
  gasesOffgassed: z.array(z.object({
    species: z.string(),
    mol: z.union([z.literal('fromLedger'), z.number().nonnegative()]),
    escaped: z.boolean().default(true)
  })).default([])
});

export const ReactionProgramSchema = z.object({
  schema: z.literal('chemdex.program/1').default('chemdex.program/1'),
  id: z.string().min(1),
  provenance: z.enum(['handcrafted', 'rule-derived', 'ai', 'fallback']),
  controller: z.string().optional(),
  chemistry: z.object({
    equation: z.string(),
    ionic: z.string().optional(),
    species: z.array(SpeciesRoleSchema),
    deltaH_kJ_per_mol: z.number().nullable().optional(),
    kinetics: KineticsSchema,
    conditions: z.object({
      minTemp_c: z.number().optional(),
      catalyst: z.string().optional(),
      light: z.boolean().optional(),
      medium: z.string().optional(),
      sealed: z.boolean().optional()
    }).optional(),
    hazards: z.array(z.string()).default([]),
    warning_vi: z.string().optional(),
    warning_en: z.string().optional()
  }),
  visual: z.object({
    duration_s: z.number().positive().default(5.0),
    timeWarp: z.object({
      physical_s: z.number().positive(),
      note_vi: z.string().optional(),
      note_en: z.string().optional()
    }).optional(),
    timeline: z.array(AtomInstanceSchema).max(24),
    after: AfterStateSchema
  }),
  explain: z.object({
    observation_vi: z.string().default(''),
    observation_en: z.string().default(''),
    why_vi: z.string().default(''),
    why_en: z.string().default('')
  }),
  confidence: z.number().min(0).max(1).default(1.0)
});

export { validateProgram, normalizeHexColor, type ProgramValidationResult } from '../vfx/programs/validate';
