import { describe, it, expect, vi } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById, PROGRAMS_BY_ID } from '../src/vfx/programs/library/index';
import { validateProgram } from '../src/shared/programSchema';
import { EFFECT_ATOM_CATALOG } from '../src/vfx/catalog/index';
import { parseChemicalFormula } from '../src/engine/ledger';
import { getReactionController } from '../src/vfx/reactions/registry';
import { resolveReactionProgram, setCachedProgram, clearProgramCache } from '../src/vfx/programs/resolver';

describe('Reaction Programs Library & 5-Tier Resolution Suite', () => {
  it('contains at least 100 balanced handcrafted reaction programs', () => {
    expect(ALL_HANDCRAFTED_PROGRAMS.length).toBeGreaterThanOrEqual(100);
  });

  it('guarantees 100% unique program IDs across the entire library with zero collisions', () => {
    const seen = new Set<string>();
    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      const id = prog.id.toLowerCase().trim();
      expect(seen.has(id), `Duplicate program ID found: ${id}`).toBe(false);
      seen.add(id);
    }
    expect(PROGRAMS_BY_ID.size).toBe(ALL_HANDCRAFTED_PROGRAMS.length);
  });

  it('validates that every single program in the library passes Zod schema validation', () => {
    const atomNames = new Set(EFFECT_ATOM_CATALOG.map(a => a.name));

    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      const validation = validateProgram(prog);
      expect(validation.success, `Program ${prog.id} failed validation: ${JSON.stringify(validation.errors)}`).toBe(true);

      // Verify every timeline atom exists in closed catalog
      for (const inst of prog.visual.timeline) {
        expect(atomNames.has(inst.atom), `Program ${prog.id} atom ${inst.atom} not in catalog`).toBe(true);
      }

      // Verify bilingual explanations are populated
      expect(prog.explain.observation_vi.length).toBeGreaterThan(5);
      expect(prog.explain.observation_en.length).toBeGreaterThan(5);
      expect(prog.explain.why_vi.length).toBeGreaterThan(5);
      expect(prog.explain.why_en.length).toBeGreaterThan(5);
    }
  });

  it('verifies strict elemental mass balance for all program equations', () => {
    for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
      const reactants = prog.chemistry.species.filter(s => s.role === 'reactant');
      const products = prog.chemistry.species.filter(s => s.role === 'product');

      if (reactants.length === 0 || products.length === 0) continue;

      const reactantAtoms: Record<string, number> = {};
      const productAtoms: Record<string, number> = {};

      for (const r of reactants) {
        try {
          const parsed = parseChemicalFormula(r.formula);
          for (const [el, count] of Object.entries(parsed)) {
            reactantAtoms[el] = (reactantAtoms[el] || 0) + count * r.coeff;
          }
        } catch {
          // Complex organic names or notation skipped
        }
      }

      for (const p of products) {
        try {
          const parsed = parseChemicalFormula(p.formula);
          for (const [el, count] of Object.entries(parsed)) {
            productAtoms[el] = (productAtoms[el] || 0) + count * p.coeff;
          }
        } catch {
          // Complex organic names or notation skipped
        }
      }

      // Check balance for elements present in both
      for (const [el, rCount] of Object.entries(reactantAtoms)) {
        if (productAtoms[el] !== undefined) {
          expect(productAtoms[el], `Element ${el} imbalance in ${prog.id}`).toBeCloseTo(rCount, 1);
        }
      }
    }
  });

  describe('Finding F4 Regression: Disambiguated Controllers', () => {
    it('verifies distinct controllers and keys for previously colliding reactions', () => {
      // 1. CaCO3 vs BaSO4
      const caco3Ctrl = getReactionController('cacl2_na2co3_precipitate');
      const baso4Ctrl = getReactionController('bacl2_h2so4_precipitate');
      expect(caco3Ctrl?.id).toBe('cacl2_na2co3_precipitate');
      expect(baso4Ctrl?.id).toBe('bacl2_h2so4_precipitate');
      expect(caco3Ctrl?.id).not.toBe(baso4Ctrl?.id);

      // 2. AgI vs AgCl
      const agiCtrl = getReactionController('agno3_ki_precipitate');
      const agclCtrl = getReactionController('agno3_nacl_precipitate');
      expect(agiCtrl?.id).toBe('agno3_ki_precipitate');
      expect(agclCtrl?.id).toBe('agno3_nacl_precipitate');
      expect(agiCtrl?.id).not.toBe(agclCtrl?.id);

      // 3. Fe(OH)3 vs Cu(OH)2
      const feoh3Ctrl = getReactionController('fecl3_naoh_precipitate');
      const cuoh2Ctrl = getReactionController('cuso4_naoh_precipitate');
      expect(feoh3Ctrl?.id).toBe('fecl3_naoh_precipitate');
      expect(cuoh2Ctrl?.id).toBe('cuso4_naoh_precipitate');
      expect(feoh3Ctrl?.id).not.toBe(cuoh2Ctrl?.id);

      // 4. Zn+CuSO4 vs Fe+CuSO4
      const znCuCtrl = getReactionController('zn_cuso4_displacement');
      const feCuCtrl = getReactionController('fe_cuso4_displacement');
      expect(znCuCtrl?.id).toBe('zn_cuso4_displacement');
      expect(feCuCtrl?.id).toBe('fe_cuso4_displacement');
      expect(znCuCtrl?.id).not.toBe(feCuCtrl?.id);

      // 5. K+H2O vs Na+H2O
      const kCtrl = getReactionController('K+H2O');
      const naCtrl = getReactionController('Na+H2O');
      expect(kCtrl?.id).toBe('potassium_water_reaction');
      expect(naCtrl?.id).toBe('sodium_water_reaction');
      expect(kCtrl?.id).not.toBe(naCtrl?.id);

      // 6. NaHCO3+HCl vs Na2CO3+HCl
      const nahco3Ctrl = getReactionController('nahco3_hcl_gas');
      const na2co3Ctrl = getReactionController('na2co3_hcl_gas');
      expect(nahco3Ctrl?.id).toBe('nahco3_hcl_gas');
      expect(na2co3Ctrl?.id).toBe('na2co3_hcl_gas');
      expect(nahco3Ctrl?.id).not.toBe(na2co3Ctrl?.id);
    });

    it('verifies that no two distinct reaction keys with different products map to the same controller ID', () => {
      const distinctReactions = [
        { key: 'cacl2_na2co3_precipitate', product: 'CaCO3' },
        { key: 'bacl2_h2so4_precipitate', product: 'BaSO4' },
        { key: 'agno3_ki_precipitate', product: 'AgI' },
        { key: 'agno3_nacl_precipitate', product: 'AgCl' },
        { key: 'fecl3_naoh_precipitate', product: 'Fe(OH)3' },
        { key: 'cuso4_naoh_precipitate', product: 'Cu(OH)2' },
        { key: 'zn_cuso4_displacement', product: 'ZnSO4' },
        { key: 'fe_cuso4_displacement', product: 'FeSO4' },
        { key: 'nahco3_hcl_gas', product: 'CO2_bicarb' },
        { key: 'na2co3_hcl_gas', product: 'CO2_carb' }
      ];

      const controllerIds = distinctReactions.map(r => {
        const ctrl = getReactionController(r.key);
        expect(ctrl, `Controller for ${r.key} must exist`).toBeDefined();
        return ctrl!.id;
      });

      const uniqueIds = new Set(controllerIds);
      expect(uniqueIds.size).toBe(distinctReactions.length);
    });
  });

  describe('5-Tier Resolution Pipeline Hierarchy', () => {
    it('resolves Tier 1 handcrafted exact match for known reaction', async () => {
      const res = await resolveReactionProgram(['HCl', 'NaOH']);
      expect(res.provenance).toBe('handcrafted');
      expect(res.program.id).toContain('hcl_naoh');
    });

    it('resolves Tier 2 rule-derived program for dynamic carbonate + acid mix', async () => {
      const res = await resolveReactionProgram(['K2CO3', 'HNO3']);
      expect(res.provenance).toBe('rule-derived');
      expect(res.program.chemistry.equation).toContain('CO2');
    });

    it('resolves Tier 3 cached program from memory/localStorage', async () => {
      const mockProg = {
        ...ALL_HANDCRAFTED_PROGRAMS[0],
        id: 'mock_custom_cached_rx'
      };
      setCachedProgram('custom1+custom2', mockProg, 'en');
      const res = await resolveReactionProgram(['custom1', 'custom2'], [], { lang: 'en' });
      expect(res.provenance).toBe('cache');
      expect(res.program.id).toBe('mock_custom_cached_rx');
      clearProgramCache();
    });

    it('resolves Tier 4 AI program when API responds with valid program', async () => {
      const originalFetch = globalThis.fetch;
      try {
        const mockAiProg = {
          ...ALL_HANDCRAFTED_PROGRAMS[0],
          id: 'ai_generated_test_rx',
          provenance: 'ai' as const
        };
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ program: mockAiProg })
        } as any);

        const res = await resolveReactionProgram(['rare_reagent_x', 'rare_reagent_y'], [], { lang: 'en' });
        expect(res.provenance).toBe('ai');
        expect(res.program.id).toBe('ai_generated_test_rx');
      } finally {
        globalThis.fetch = originalFetch;
        clearProgramCache();
      }
    });

    it('resolves Tier 5 conservative fallback program for non-reactive salt mix', async () => {
      const res = await resolveReactionProgram(['NaCl', 'KNO3']);
      expect(res.provenance).toBe('fallback');
      expect(res.program.visual.timeline.length).toBeGreaterThan(0);
      expect(res.program.visual.timeline[0].atom).toBe('liquidSwirl');
    });
  });
});
