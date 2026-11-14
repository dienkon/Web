import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeMolarMass, parseChemicalFormula } from '../core/formula';
import { countElementalAtoms, isElementBalancedReaction } from '../core/ledger';
import { runSimulationCycle } from '../reactions/engine';
import {
  ALL_COMPILED_REACTIONS,
  ensureCatalogCompiled,
  type CompiledReactionEntry,
} from '../reactions/curriculumAndCatalogCompiler';
import { REACTION_DATABASE } from '../reactions/reactionDatabase';
import { validateGeminiReactionPayload } from '../../services/geminiService';
import { useLabStore } from '../../store/useLabStore';
import type { SubstanceQuantity } from '../../types/chemistry';

function isSymbolicPolymerFormula(formula: string): boolean {
  return /\)\s*n$/i.test(formula.trim()) || formula.includes('*');
}

function buildStoichiometricInputs(rx: CompiledReactionEntry): {
  contents: SubstanceQuantity[];
  volume_ml: number;
  temp_c: number;
  isHeated: boolean;
} {
  const hasAq = rx.reactants.some((r) => r.state === 'aq') || rx.products.some((p) => p.state === 'aq');
  const contents: SubstanceQuantity[] = [];

  for (const r of rx.reactants) {
    const moles = 0.04 * r.coefficient;
    const mm = computeMolarMass(r.formula);
    const existing = contents.find(
      (c) => c.formula.toUpperCase() === r.formula.toUpperCase() && c.state === r.state
    );
    if (existing) {
      existing.moles += moles;
      existing.mass_g += moles * mm;
    } else {
      contents.push({
        formula: r.formula,
        moles,
        mass_g: moles * mm,
        state: r.state,
        ...(r.state === 'aq' ? { concentration_M: 1.0 } : {}),
      });
    }
  }

  if (hasAq && !contents.some((c) => c.formula.toUpperCase() === 'H2O')) {
    const waterMass = 50;
    contents.push({
      formula: 'H2O',
      moles: waterMass / computeMolarMass('H2O'),
      mass_g: waterMass,
      state: 'l',
    });
  }

  if (rx.requiresCatalyst && rx.catalystFormula) {
    const cat = rx.catalystFormula.trim();
    if (!contents.some((c) => c.formula.toUpperCase() === cat.toUpperCase()) && Object.keys(parseChemicalFormula(cat)).length > 0) {
      const catMoles = 0.01;
      contents.push({
        formula: cat,
        moles: catMoles,
        mass_g: catMoles * computeMolarMass(cat),
        state: cat === 'H2SO4' ? 'aq' : 's',
      });
    }
  }

  const temp_c = Math.max(25, rx.minTemp_c ?? (rx.requiresHeating ? 120 : 25));
  const isHeated = Boolean(rx.requiresHeating || (rx.minTemp_c ?? 25) > 35);
  return { contents, volume_ml: hasAq ? 50 : 0, temp_c, isHeated };
}

describe('Gemini AI Reaction Validation Gate', () => {
  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
  });

  it('rejects unbalanced equations and malformed formulas without entering simulation', () => {
    const unbalanced = validateGeminiReactionPayload(
      {
        isReaction: true,
        reaction: {
          equation: 'H2 + O2 -> H2O',
          reactants: [
            { formula: 'H2', coefficient: 1, state: 'g' },
            { formula: 'O2', coefficient: 1, state: 'g' },
          ],
          products: [{ formula: 'H2O', coefficient: 1, state: 'l' }],
        },
      },
      ['H2', 'O2']
    );
    expect(unbalanced).toBeNull();

    const invalidFormula = validateGeminiReactionPayload(
      {
        isReaction: true,
        reaction: {
          equation: 'Xyz + H2O -> XyzOH',
          reactants: [{ formula: 'NotAChemical123', coefficient: 1, state: 'aq' }],
          products: [{ formula: 'StillInvalid', coefficient: 1, state: 'aq' }],
        },
      },
      ['NotAChemical123']
    );
    expect(invalidFormula).toBeNull();
  });

  it('rejects hallucinated reactants absent from the vessel and never fabricates -25 kJ/mol', () => {
    const hallucinated = validateGeminiReactionPayload(
      {
        isReaction: true,
        reaction: {
          equation: 'H2SO4 + 2NaOH -> Na2SO4 + 2H2O',
          reactants: [
            { formula: 'H2SO4', coefficient: 1, state: 'aq' },
            { formula: 'NaOH', coefficient: 2, state: 'aq' },
          ],
          products: [
            { formula: 'Na2SO4', coefficient: 1, state: 'aq' },
            { formula: 'H2O', coefficient: 2, state: 'l' },
          ],
        },
      },
      ['HCl', 'NaOH']
    );
    expect(hallucinated).toBeNull();

    const validNoEnthalpy = validateGeminiReactionPayload(
      {
        isReaction: true,
        reaction: {
          id: 'rx_ai_hbr_koh_test',
          equation: 'HBr + KOH -> KBr + H2O',
          reactants: [
            { formula: 'HBr', coefficient: 1, state: 'aq' },
            { formula: 'KOH', coefficient: 1, state: 'aq' },
          ],
          products: [
            { formula: 'KBr', coefficient: 1, state: 'aq' },
            { formula: 'H2O', coefficient: 1, state: 'l' },
          ],
        },
      },
      ['HBr', 'KOH']
    );
    expect(validNoEnthalpy).not.toBeNull();
    expect(validNoEnthalpy!.deltaH_kJ_mol).toBe(0);
    expect(validNoEnthalpy!.provenance).toBe('ai-unverified');
  });

  it('gates triggerGeminiReactionCheck in useLabStore and labels accepted AI reactions as unverified', async () => {
    const store = useLabStore.getState();
    const id = store.addEquipment('beaker');
    store.injectCustomSubstance(id, 'RbOH', 'aq', 25, 2.0);
    store.injectCustomSubstance(id, 'CsBr', 'aq', 25, 2.0);

    const dbCountBefore = REACTION_DATABASE.length;
    const origFetch = globalThis.fetch;

    try {
      // 1. Unbalanced AI proposal must be rejected cleanly
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      isReaction: true,
                      reaction: {
                        id: 'rx_ai_bad_rbcs',
                        equation: 'RbOH + CsBr -> RbBr',
                        reactants: [
                          { formula: 'RbOH', coefficient: 1, state: 'aq' },
                          { formula: 'CsBr', coefficient: 1, state: 'aq' },
                        ],
                        products: [{ formula: 'RbBr', coefficient: 1, state: 'aq' }],
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }) as unknown as typeof fetch;

      const rejected = await useLabStore.getState().triggerGeminiReactionCheck(id);
      expect(rejected).toBe(false);
      expect(REACTION_DATABASE.length).toBe(dbCountBefore);

      // 2. Balanced metathesis proposal on a fresh cache key is accepted with ai-unverified provenance & UI badge flag
      const id2 = useLabStore.getState().addEquipment('beaker');
      useLabStore.getState().injectCustomSubstance(id2, 'RbOH', 'aq', 25, 2.0);
      useLabStore.getState().injectCustomSubstance(id2, 'CsI', 'aq', 25, 2.0);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      isReaction: true,
                      reaction: {
                        id: 'rx_ai_good_rbcs',
                        equation: 'RbOH + CsI -> CsOH + RbI',
                        name_en: 'Alkali Ion Exchange',
                        name_vi: 'Trao đổi ion kiềm',
                        reactants: [
                          { formula: 'RbOH', coefficient: 1, state: 'aq' },
                          { formula: 'CsI', coefficient: 1, state: 'aq' },
                        ],
                        products: [
                          { formula: 'CsOH', coefficient: 1, state: 'aq' },
                          { formula: 'RbI', coefficient: 1, state: 'aq' },
                        ],
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }) as unknown as typeof fetch;

      const accepted = await useLabStore.getState().triggerGeminiReactionCheck(id2);
      expect(accepted).toBe(true);

      const vessel = useLabStore.getState().equipment[id2];
      expect(vessel.isAiUnverifiedReaction).toBe(true);
      expect(vessel.activeReactionLabel).toContain('AI – chưa kiểm chứng');
      const lastLog = useLabStore.getState().history.at(-1)!;
      expect(lastLog.details_vi).toContain('AI – chưa kiểm chứng');
    } finally {
      globalThis.fetch = origFetch;
      const idx = REACTION_DATABASE.findIndex((r) => r.id === 'rx_ai_good_rbcs');
      if (idx !== -1) REACTION_DATABASE.splice(idx, 1);
    }
  });
});

describe('Strict Elemental & Mass Conservation Invariant across All Compiled Reactions', () => {
  beforeAll(async () => {
    await ensureCatalogCompiled();
  });

  it('conserves every element (<= 1e-9 mol) and total mass across all simulatable compiled reactions', () => {
    let checked = 0;
    const violations: string[] = [];

    for (const rx of ALL_COMPILED_REACTIONS) {
      if (
        rx.reactants.some((r) => isSymbolicPolymerFormula(r.formula)) ||
        rx.products.some((p) => isSymbolicPolymerFormula(p.formula))
      ) {
        continue;
      }

      const { contents, volume_ml, temp_c, isHeated } = buildStoichiometricInputs(rx);
      const beforeAtoms = countElementalAtoms(contents);
      const beforeMass_g = contents.reduce((sum, c) => sum + c.mass_g, 0);

      // Run in closed vessel mode (isOpen = false) so all evolved gases stay accounted in updatedContents
      const sim = runSimulationCycle(contents, volume_ml, temp_c, isHeated, false, {
        oxygenFraction: 0.21,
      });

      const afterAtoms = countElementalAtoms(sim.updatedContents);
      const afterMass_g = sim.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);

      const ranIds = sim.reactionsOccurred.map((r) => r.reactionId).join(',');
      const allElements = new Set([...Object.keys(beforeAtoms), ...Object.keys(afterAtoms)]);
      for (const el of allElements) {
        const diff = Math.abs((beforeAtoms[el] ?? 0) - (afterAtoms[el] ?? 0));
        if (diff > 1e-9) {
          violations.push(`${rx.id} (${rx.equation}) [ran=${ranIds}] element ${el} discrepancy=${diff}`);
          break;
        }
      }

      const massDiff = Math.abs(beforeMass_g - afterMass_g);
      if (massDiff > 1e-6) {
        violations.push(`${rx.id} (${rx.equation}) [ran=${ranIds}] mass discrepancy=${massDiff} g`);
      }

      checked++;
    }

    expect(checked).toBeGreaterThanOrEqual(1400);
    expect(violations).toEqual([]);
  });

  it('keeps curated REACTION_DATABASE element-balanced', () => {
    const unbalanced = REACTION_DATABASE.filter((rx) => !isElementBalancedReaction(rx)).map(
      (rx) => `${rx.id} (${rx.equation})`
    );
    expect(unbalanced).toEqual([]);
  });
});
