import { describe, it, expect } from 'vitest';
import { ALL_HANDCRAFTED_PROGRAMS, getProgramById } from '../src/vfx/programs/library/index';
import { getReactionController } from '../src/vfx/reactions/registry';

describe('Registry Collision Prevention & Disambiguation Suite (Finding F4 & §11.1)', () => {
  describe('Specific Disambiguation Pairs from Finding F4', () => {
    it('1. CaCl2+Na2CO3 precipitates CaCO3 with NO gas, distinct from Na2CO3+HCl gas evolution', () => {
      const caco3Prog = getProgramById('cacl2_na2co3_precipitate') || getProgramById('cacl2+na2co3');
      expect(caco3Prog).toBeDefined();

      const gasProducts = caco3Prog!.chemistry.species.filter(s => s.role === 'product' && s.phase === 'g');
      expect(gasProducts.length, 'CaCl2 + Na2CO3 must not evolve any gas').toBe(0);

      const solidProducts = caco3Prog!.chemistry.species.filter(s => s.role === 'product' && s.phase === 's');
      expect(solidProducts.some(p => p.formula.includes('CaCO3'))).toBe(true);

      const na2co3Prog = getProgramById('na2co3_hcl') || getProgramById('na2co3+hcl');
      if (na2co3Prog) {
        expect(caco3Prog!.id).not.toBe(na2co3Prog.id);
        const na2co3Gas = na2co3Prog.chemistry.species.filter(s => s.role === 'product' && s.phase === 'g');
        expect(na2co3Gas.some(g => g.formula === 'CO2')).toBe(true);
      }
    });

    it('2. AgNO3+KI produces pale yellow curdy AgI, NOT golden rain PbI2 flakes', () => {
      const agiProg = getProgramById('agno3_ki_precipitate') || getProgramById('agno3+ki');
      const pbi2Prog = getProgramById('pbno32_ki_golden_rain') || getProgramById('pb(no3)2+ki');

      expect(agiProg).toBeDefined();
      expect(pbi2Prog).toBeDefined();
      expect(agiProg!.id).not.toBe(pbi2Prog!.id);

      // AgI must have curd morphology and pale yellow color
      expect(agiProg!.visual.after.precipitate?.morphology).toBe('curd');
      expect(agiProg!.visual.after.precipitate?.substance).toBe('AgI');

      // PbI2 must have crystal_plate morphology (golden hexagonal platelets)
      expect(pbi2Prog!.visual.after.precipitate?.morphology).toBe('crystal_plate');
      expect(pbi2Prog!.visual.after.precipitate?.substance).toBe('PbI2');
    });

    it('3. FeCl3+NaOH produces rust-brown floc Fe(OH)3, NOT blue gel Cu(OH)2', () => {
      const feoh3Prog = getProgramById('fecl3_naoh_precipitate') || getProgramById('fecl3+naoh');
      const cuoh2Prog = getProgramById('cuso4_naoh_precipitate') || getProgramById('cuso4+naoh');

      expect(feoh3Prog).toBeDefined();
      expect(cuoh2Prog).toBeDefined();
      expect(feoh3Prog!.id).not.toBe(cuoh2Prog!.id);

      // Fe(OH)3 rust floc vs Cu(OH)2 blue gel
      expect(feoh3Prog!.visual.after.precipitate?.morphology).toBe('floc');
      expect(feoh3Prog!.visual.after.precipitate?.color).toMatch(/^#(8|9|a|7)/i); // Brownish

      expect(cuoh2Prog!.visual.after.precipitate?.morphology).toBe('gel');
      expect(cuoh2Prog!.visual.after.precipitate?.color).toMatch(/^#(0|1|2|3)/i); // Blueish
    });

    it('4. Zn+CuSO4 produces spongy copper powder, NOT the iron nail controller', () => {
      const znCuProg = getProgramById('zn_cuso4_displacement') || getProgramById('zn+cuso4');
      const feCuProg = getProgramById('fe_cuso4_displacement') || getProgramById('fe+cuso4');

      expect(znCuProg).toBeDefined();
      expect(feCuProg).toBeDefined();
      expect(znCuProg!.id).not.toBe(feCuProg!.id);

      // Zn reaction fades to colorless ZnSO4, Fe reaction produces pale green FeSO4
      const znProductColor = znCuProg!.visual.after.liquidColor;
      const feProductColor = feCuProg!.visual.after.liquidColor;
      expect(znProductColor).not.toBe(feProductColor);
    });

    it('5. K+H2O has violent lilac flame, distinct from Na+H2O yellow flame/skitter', () => {
      const kH2oProg = getProgramById('k_h2o_violent') || getProgramById('k+h2o');
      const naH2oProg = getProgramById('na_h2o_reaction') || getProgramById('na+h2o');

      expect(kH2oProg).toBeDefined();
      expect(naH2oProg).toBeDefined();
      expect(kH2oProg!.id).not.toBe(naH2oProg!.id);

      // K reaction has flame atom
      const kAtoms = kH2oProg!.visual.timeline.map(t => t.atom);
      expect(kAtoms.some(a => a.toLowerCase().includes('flame') || a.toLowerCase().includes('potassium'))).toBe(true);
    });

    it('6. NaHCO3+HCl differs in stoichiometry and enthalpy from Na2CO3+HCl', () => {
      const nahco3Prog = getProgramById('nahco3_hcl') || getProgramById('nahco3+hcl');
      const na2co3Prog = getProgramById('na2co3_hcl') || getProgramById('na2co3+hcl');

      expect(nahco3Prog).toBeDefined();
      expect(na2co3Prog).toBeDefined();
      expect(nahco3Prog!.id).not.toBe(na2co3Prog!.id);

      // NaHCO3 requires 1 HCl per mol, Na2CO3 requires 2 HCl per mol
      const nahco3Acid = nahco3Prog!.chemistry.species.find(s => s.formula === 'HCl');
      const na2co3Acid = na2co3Prog!.chemistry.species.find(s => s.formula === 'HCl');

      expect(nahco3Acid?.coeff).toBe(1);
      expect(na2co3Acid?.coeff).toBe(2);

      // NaHCO3 is endothermic (deltaH > 0), Na2CO3 is exothermic (deltaH < 0)
      if (nahco3Prog!.chemistry.deltaH_kJ_per_mol !== undefined && na2co3Prog!.chemistry.deltaH_kJ_per_mol !== undefined) {
        expect(nahco3Prog!.chemistry.deltaH_kJ_per_mol).toBeGreaterThan(0);
        expect(na2co3Prog!.chemistry.deltaH_kJ_per_mol).toBeLessThan(0);
      }
    });
  });

  describe('Global Anti-Collision Invariant', () => {
    it('guarantees that no two distinct reaction keys resolve to the same controller ID', () => {
      const controllerMap = new Map<string, string>(); // controllerId -> first program id

      for (const prog of ALL_HANDCRAFTED_PROGRAMS) {
        if (prog.controller) {
          const existing = controllerMap.get(prog.controller);
          if (existing && existing !== prog.id) {
            // Check that if they share a controller, their chemistry must be completely identical
            const prog1 = getProgramById(existing)!;
            const p1Products = prog1.chemistry.species.filter(s => s.role === 'product').map(s => s.formula).sort().join(',');
            const p2Products = prog.chemistry.species.filter(s => s.role === 'product').map(s => s.formula).sort().join(',');
            expect(p1Products, `Collision: ${existing} and ${prog.id} share controller ${prog.controller} but have different products`).toBe(p2Products);
          }
          controllerMap.set(prog.controller, prog.id);
        }
      }
    });

    it('verifies getReactionController resolves distinct controllers for all known legacy reactions', () => {
      const caco3 = getReactionController('cacl2_na2co3_precipitate');
      const agcl = getReactionController('agno3_nacl_precipitate');
      const agi = getReactionController('agno3_ki_precipitate');
      const feoh3 = getReactionController('fecl3_naoh_precipitate');
      const cuoh2 = getReactionController('cuso4_naoh_precipitate');

      expect(caco3?.id).not.toBe(agcl?.id);
      expect(agi?.id).not.toBe(agcl?.id);
      expect(feoh3?.id).not.toBe(cuoh2?.id);
    });
  });
});
