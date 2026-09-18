import { z } from 'zod';

export const ReactionResultZodSchema = z.object({
  id: z.string(),
  canonicalKey: z.string(),
  schemaVersion: z.number().default(1),
  equation: z.string(),
  ionicEquation: z.string().optional(),
  netIonicEquation: z.string().optional(),
  reactionTypeVi: z.string(),
  conditionsVi: z.string().optional(),
  reactants: z.array(z.object({
    chemicalId: z.string(),
    formula: z.string(),
    coefficient: z.number(),
    state: z.enum(['aq', 's', 'l', 'g'])
  })),
  products: z.array(z.object({
    chemicalId: z.string(),
    formula: z.string(),
    coefficient: z.number(),
    state: z.enum(['aq', 's', 'l', 'g'])
  })),
  observations: z.object({
    phenomenonVi: z.string(),
    liquidColor: z.object({
      r: z.number(),
      g: z.number(),
      b: z.number(),
      a: z.number(),
      hex: z.string().optional()
    }),
    precipitate: z.object({
      chemicalId: z.string(),
      formula: z.string(),
      nameVi: z.string(),
      colorHex: z.string(),
      type: z.enum(['crystalline', 'gelatinous', 'fine_powder', 'metallic']),
      descriptionVi: z.string()
    }).nullable(),
    gas: z.object({
      chemicalId: z.string(),
      formula: z.string(),
      nameVi: z.string(),
      bubbleRate: z.number(),
      descriptionVi: z.string()
    }).nullable(),
    temperatureChangeC: z.number().default(0),
    resultingPhEstimate: z.number().nullable().default(null)
  }),
  educationalExplanationVi: z.object({
    titleVi: z.string(),
    summaryVi: z.string(),
    detailVi: z.string(),
    realWorldApplicationVi: z.string().optional()
  }),
  safetyAdviceVi: z.object({
    level: z.enum(['NOTICE', 'WARNING', 'CRITICAL']),
    messageVi: z.string(),
    ppeRecommendedVi: z.array(z.string()),
    wasteHandlingVi: z.string()
  })
});

export type ValidatedReaction = z.infer<typeof ReactionResultZodSchema>;
