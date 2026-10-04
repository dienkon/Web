import { z } from 'zod';

export const EffectTypeSchema = z.enum([
  'COLOR_CHANGE',
  'PRECIPITATE',
  'GAS',
  'BOIL',
  'EXPLOSION',
  'CLEAR'
]);

export const MixResultSchema = z.object({
  reaction_id: z.string().optional(),
  summary: z.string(),
  equation: z.string(),
  ionic_equation: z.string().optional(),
  conditions: z.string().optional(),
  reactants: z.array(z.string()),
  products: z.array(z.string()),
  safety_notes: z.string(),
  observable_changes: z.string(),
  
  new_vessel_state: z.object({
    liquid_color: z.string().optional(),
    liquid_level: z.number(),
    has_precipitate: z.boolean().default(false),
    precipitate_color: z.string().optional(),
    is_boiling: z.boolean().default(false),
    has_gas: z.boolean().default(false),
    gas_color: z.string().optional(),
    is_explosion: z.boolean().default(false)
  }),
  
  effects: z.array(z.object({
    type: EffectTypeSchema,
    duration: z.number(),
    color: z.string().optional()
  })).default([]),
  
  confidence: z.number().min(0).max(1),
  is_dangerous: z.boolean().default(false),
  warning_message: z.string().optional()
});

export type MixResult = z.infer<typeof MixResultSchema>;
export type EffectType = z.infer<typeof EffectTypeSchema>;

