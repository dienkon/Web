import { normalizeFormula } from '../../chemistry/core/formula';
import { isElementBalancedReaction } from '../../chemistry/core/ledger';
import { runSimulationCycle } from '../../chemistry/reactions/engine';
import { REACTION_DATABASE } from '../../chemistry/reactions/reactionDatabase';
import { generateReactionFromGemini } from '../../services/geminiService';
import { soundEngine } from '../../services/soundEngine';
import { pushSnapshot } from '../labStoreHelpers';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type AiSlice = Pick<LabStoreState, 'triggerGeminiReactionCheck'>;

export const createAiSlice: LabSliceCreator<AiSlice> = (set, get) => ({
  triggerGeminiReactionCheck: async (vesselId) => {
    const eq = get().equipment[vesselId];
    if (!eq || eq.contents.length < 2) return false;
    const formulas = eq.contents.map(c => c.formula);

    try {
      const aiRes = await generateReactionFromGemini(
        formulas,
        eq.temperature_c,
        eq.isOn || false,
        eq.volume_ml
      );

      if (get().equipment[vesselId] !== eq || get().simulationPaused) return false;
      if (aiRes && aiRes.isReaction && aiRes.reactionDefinition) {
        const rx = {
          ...aiRes.reactionDefinition,
          provenance: aiRes.reactionDefinition.provenance ?? ('ai-unverified' as const),
        };
        if (!isElementBalancedReaction(rx)) return false;

        const vesselFormulas = new Set(eq.contents.map(c => normalizeFormula(c.formula)));
        const hasRequiredReactants = rx.reactants.every((r) => {
          const norm = normalizeFormula(r.formula);
          return norm === 'H2O' || vesselFormulas.has(norm);
        });
        if (!hasRequiredReactants) return false;

        const exists = REACTION_DATABASE.some(r => r.id === rx.id);
        if (!exists) {
          REACTION_DATABASE.push(rx);
        }

        const sim = runSimulationCycle(eq.contents, eq.volume_ml, eq.temperature_c, eq.isOn || false);
        const totalContentMass = sim.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);
        const newTotalMass = (eq.tare_g || 0) + totalContentMass;

        if (sim.hasGas) soundEngine.fizz(1.5);
        soundEngine.success();

        set(state => ({
          ...pushSnapshot(state),
          equipment: {
            ...state.equipment,
            [vesselId]: {
              ...eq,
              contents: sim.updatedContents,
              mass_g: Math.round(newTotalMass * 100) / 100,
              temperature_c: sim.finalTemperature_c,
              ph: sim.finalPh,
              liquidColorHex: sim.finalLiquidColorHex,
              hasPrecipitate: sim.hasPrecipitate,
              precipitateColorHex: sim.precipitateInfo?.colorHex,
              precipitateSubstance: sim.precipitateInfo?.formula,
              precipitateMass_g: sim.precipitateInfo?.mass_g,
              precipitateMorphology: sim.precipitateInfo?.morphology,
              hasGas: sim.hasGas,
              effervescenceSpeed: sim.gasInfo?.effervescenceSpeed,
              isBoiling: sim.isBoiling,
              isAiUnverifiedReaction: true,
              activeReactionLabel: `${rx.equation || rx.name_vi} (AI – chưa kiểm chứng)`,
            },
          },
          history: [
            ...state.history,
            {
              id: `log_${Date.now()}`,
              timestamp: Date.now(),
              actionType: 'REACTION',
              details_en: `[AI – unverified] Predicted Reaction: ${rx.name_en} (${rx.equation})`,
              details_vi: `[AI – chưa kiểm chứng] Phản ứng dự đoán: ${rx.name_vi} (${rx.equation})`,
              vesselId,
              measurements: {
                volume_ml: eq.volume_ml,
                temperature_c: sim.finalTemperature_c,
                ph: sim.finalPh,
              },
            },
          ],
        }));

        get().checkStepProgress();
        return true;
      }
    } catch (err) {
      console.warn('[Gemini reaction check failed]:', err);
    }
    return false;
  },
});
