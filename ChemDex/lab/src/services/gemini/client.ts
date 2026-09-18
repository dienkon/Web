import { ReactionResult } from '../../types/reaction';
import { ReactionResultZodSchema } from './schema';

export class GeminiReactionService {
  /**
   * Calls secure server API proxy to query Gemini AI with structured schema
   */
  public static async resolveUnknownReaction(
    canonicalKey: string,
    context: {
      reactants: { chemicalId: string; formula: string; amount: number; unit: string }[];
      isHeating: boolean;
      currentPh: number | null;
      temperatureC: number;
    }
  ): Promise<ReactionResult | null> {
    try {
      const response = await fetch('/api/reaction/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalKey,
          context
        })
      });

      if (!response.ok) {
        console.warn('[GeminiReactionService] Backend returned error status:', response.status);
        return null;
      }

      const rawData = await response.json();
      const parseResult = ReactionResultZodSchema.safeParse(rawData);

      if (!parseResult.success) {
        console.error('[GeminiReactionService] Schema validation failed:', parseResult.error);
        return null;
      }

      return {
        ...parseResult.data,
        provenance: 'tier4_gemini',
        createdAt: Date.now()
      };
    } catch (err) {
      console.warn('[GeminiReactionService] Network or execution error:', err);
      return null;
    }
  }
}
