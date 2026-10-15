import { describe, it, expect, beforeEach } from 'vitest';
import { useLabStore } from '../store/useLabStore';
import { EXPERIMENTS_CATALOG } from '../data/experiments';

describe('End-to-End Scientific Experiment Integration Suite', () => {
  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
    useLabStore.getState().selectExperiment(null);
  });

  describe('Milestone Vertical Slice: End-to-End Neutralization Flow', () => {
    it('executes: Add beaker -> Add 50mL HCl -> Add 50mL NaOH -> Neutralization -> pH 7 -> History recorded', () => {
      const store = useLabStore.getState();

      // 1. Add Beaker
      const beakerId = store.addEquipment('beaker');
      let beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker).toBeDefined();
      expect(beaker.volume_ml).toBe(0);

      // 2. Add 50 mL of 0.1 M HCl
      useLabStore.getState().addChemicalToEquipment(beakerId, 'chem-hcl', 50);
      beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.volume_ml).toBe(50);
      expect(beaker.ph).toBeCloseTo(1.0, 1);
      expect(beaker.contents.some(c => c.formula === 'HCl')).toBe(true);

      // 3. Add 50 mL of 0.1 M NaOH
      useLabStore.getState().addChemicalToEquipment(beakerId, 'chem-naoh', 50);
      beaker = useLabStore.getState().equipment[beakerId];

      // 4. Verify Neutralization Outcome
      expect(beaker.volume_ml).toBe(100);
      expect(beaker.ph).toBeCloseTo(7.0, 1);
      expect(beaker.contents.some(c => c.formula === 'NaCl')).toBe(true);
      expect(beaker.temperature_c).toBeGreaterThan(25.0); // Exothermic rise

      // 5. Verify History / Notebook Records
      const history = useLabStore.getState().history;
      expect(history.length).toBeGreaterThanOrEqual(3);
      const lastAction = history[history.length - 1];
      expect(lastAction.actionType).toBe('ADD_CHEMICAL');
      expect(lastAction.measurements?.volume_ml).toBe(100);
      expect(lastAction.measurements?.ph).toBeCloseTo(7.0, 1);
    });
  });

  describe('Experiment 2: Acid-Base Titration & Phenolphthalein Endpoint', () => {
    it('detects pink endpoint when NaOH reaches equivalence with phenolphthalein present', () => {
      const store = useLabStore.getState();
      const flaskId = store.addEquipment('erlenmeyer_flask');

      // Add 25 mL 0.1 M HCl and Phenolphthalein indicator
      store.addChemicalToEquipment(flaskId, 'chem-hcl', 25);
      store.addChemicalToEquipment(flaskId, 'chem-phenolphthalein', 2);

      let flask = useLabStore.getState().equipment[flaskId];
      // Below pH 8.2 -> Colorless
      expect(flask.liquidColorHex).toBe('#f8fafc');

      // Add 26 mL 0.1 M NaOH (slight excess past equivalence point)
      store.addChemicalToEquipment(flaskId, 'chem-naoh', 26);
      flask = useLabStore.getState().equipment[flaskId];

      // Excess base -> pH > 8.2 -> Vibrant pink/magenta
      expect(flask.ph).toBeGreaterThan(8.2);
      expect(flask.liquidColorHex).toBe('#ec4899');
    });
  });

  describe('Experiment 3: Silver Chloride Precipitation', () => {
    it('forms AgCl precipitate and validates mass conservation', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      store.addChemicalToEquipment(beakerId, 'chem-agno3', 20);
      store.addChemicalToEquipment(beakerId, 'chem-nacl', 20);

      const beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.hasPrecipitate).toBe(true);
      expect(beaker.precipitateSubstance).toBe('AgCl');
      expect(beaker.precipitateColorHex).toBe('#ffffff');
      expect(beaker.precipitateMass_g).toBeGreaterThan(0.2);
    });
  });

  describe('Experiment 4: Copper(II) Hydroxide Precipitation and Thermal Dehydration', () => {
    it('forms gelatinous blue Cu(OH)2 precipitate and decomposes into black CuO when heated', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      store.addChemicalToEquipment(beakerId, 'chem-cuso4', 30);
      store.addChemicalToEquipment(beakerId, 'chem-naoh', 60);

      let beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.hasPrecipitate).toBe(true);
      expect(beaker.precipitateSubstance).toBe('Cu(OH)2');
      expect(beaker.precipitateColorHex).toBe('#38bdf8'); // Blue

      // Heat beaker over burner
      store.toggleHeat(beakerId);
      beaker = useLabStore.getState().equipment[beakerId];

      expect(beaker.hasPrecipitate).toBe(true);
      expect(beaker.precipitateSubstance).toBe('CuO');
      expect(beaker.precipitateColorHex).toBe('#18181b'); // Black
    });
  });

  describe('Experiment 5: Carbonate Gas Evolution', () => {
    it('produces CO2 bubbles and tracks effervescence', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      store.addChemicalToEquipment(beakerId, 'chem-nahco3', 40);
      store.addChemicalToEquipment(beakerId, 'chem-hcl', 20);

      const beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.hasGas).toBe(true);
      expect(beaker.effervescenceSpeed).toBe('vigorous');
    });
  });

  describe('Experiment 6: Dilution C1V1 = C2V2', () => {
    it('dilutes 25 mL 0.1 M CuSO4 with 25 mL H2O to 50 mL 0.05 M', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      store.addChemicalToEquipment(beakerId, 'chem-cuso4', 25);
      let beaker = useLabStore.getState().equipment[beakerId];
      const initialItem = beaker.contents.find(c => c.formula === 'CuSO4');
      expect(initialItem?.concentration_M).toBeCloseTo(0.1, 2);

      // Add 25 mL H2O
      store.addChemicalToEquipment(beakerId, 'chem-h2o', 25);
      beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.volume_ml).toBe(50);
      const dilutedItem = beaker.contents.find(c => c.formula === 'CuSO4');
      expect(dilutedItem?.concentration_M).toBeCloseTo(0.05, 2);
    });
  });

  describe('Experiment 7: Calorimetry (Heat of Neutralization)', () => {
    it('measures temperature rise from exothermic neutralization enthalpy', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      store.addChemicalToEquipment(beakerId, 'chem-hcl', 50);
      const initialTemp = useLabStore.getState().equipment[beakerId].temperature_c;

      store.addChemicalToEquipment(beakerId, 'chem-naoh', 50);
      const finalTemp = useLabStore.getState().equipment[beakerId].temperature_c;

      expect(finalTemp).toBeGreaterThan(initialTemp);
      expect(finalTemp - initialTemp).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('Experiment 8: Barium Sulfate Milky Precipitation', () => {
    it('forms milky white BaSO4 precipitate insoluble in acid', () => {
      const store = useLabStore.getState();
      const tubeId = store.addEquipment('test_tube');

      store.addChemicalToEquipment(tubeId, 'chem-bacl2', 15);
      store.addChemicalToEquipment(tubeId, 'chem-na2so4', 15);

      const tube = useLabStore.getState().equipment[tubeId];
      expect(tube.hasPrecipitate).toBe(true);
      expect(tube.precipitateSubstance).toBe('BaSO4');
      expect(tube.precipitateColorHex).toBe('#ffffff');
    });
  });

  describe('Experiment 9: Zinc and Acid Single Displacement', () => {
    it('reacts zinc metal with HCl releasing hydrogen bubbles', () => {
      const store = useLabStore.getState();
      const tubeId = store.addEquipment('test_tube');

      store.addChemicalToEquipment(tubeId, 'chem-hcl', 20);
      store.addChemicalToEquipment(tubeId, 'chem-zn', 0, 1.0); // 1.0 g solid zinc

      const tube = useLabStore.getState().equipment[tubeId];
      expect(tube.hasGas).toBe(true);
      expect(tube.effervescenceSpeed).toBe('instant');
    });
  });

  describe('Experiment 10: Multi-Indicator Testing', () => {
    it('transitions Universal Indicator color between acidic red and alkaline violet', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      // Acid + Universal indicator -> Red
      store.addChemicalToEquipment(beakerId, 'chem-hcl', 25);
      store.addChemicalToEquipment(beakerId, 'chem-universal-indicator', 2);
      let beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.ph).toBeLessThan(2.0);
      expect(beaker.liquidColorHex).toBe('#dc2626'); // Red

      // Add excess base -> Purple
      store.addChemicalToEquipment(beakerId, 'chem-naoh', 50);
      beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.ph).toBeGreaterThan(11.0);
      expect(beaker.liquidColorHex).toBe('#7c3aed'); // Violet
    });
  });

  describe('Analytical Balance & Burette Operations', () => {
    it('supports tare functionality on balance and dropwise transfer from burette', () => {
      const store = useLabStore.getState();
      const balanceId = store.addEquipment('analytical_balance');

      // Tare balance
      store.tareEquipment(balanceId);
      expect(useLabStore.getState().equipment[balanceId].tare_g).toBe(0);

      // Burette dispensing
      const buretteId = store.addEquipment('burette', 200, 50);
      const flaskId = store.addEquipment('erlenmeyer_flask', 200, 200);

      store.addChemicalToEquipment(buretteId, 'chem-naoh', 50);
      const initialBuretteVol = useLabStore.getState().equipment[buretteId].volume_ml;
      expect(initialBuretteVol).toBe(50);

      // Toggle stopcock to dispense aliquot into flask underneath
      store.toggleBuretteStopcock(buretteId);

      expect(useLabStore.getState().equipment[buretteId].volume_ml).toBeLessThan(50);
      expect(useLabStore.getState().equipment[flaskId].volume_ml).toBeGreaterThan(0);
    });
  });

  describe('Material Transfer & Conservation Invariants', () => {
    it('accurately transfers proportional liquid volume and chemical moles between vessels', () => {
      const store = useLabStore.getState();
      const sourceId = store.addEquipment('beaker');
      const targetId = store.addEquipment('erlenmeyer_flask');

      // Add 100 mL of 0.1 M NaCl to source
      store.addChemicalToEquipment(sourceId, 'chem-nacl', 100);
      const srcInitial = useLabStore.getState().equipment[sourceId];
      const initialMoles = srcInitial.contents[0].moles;

      // Transfer 40 mL from source to target
      store.transferMaterial(sourceId, targetId, 40);

      const srcFinal = useLabStore.getState().equipment[sourceId];
      const tgtFinal = useLabStore.getState().equipment[targetId];

      expect(srcFinal.volume_ml).toBeCloseTo(60, 1);
      expect(tgtFinal.volume_ml).toBeCloseTo(40, 1);

      // Total moles must be strictly conserved
      const srcMoles = srcFinal.contents[0]?.moles || 0;
      const tgtMoles = tgtFinal.contents[0]?.moles || 0;
      expect(srcMoles + tgtMoles).toBeCloseTo(initialMoles, 4);
    });
  });

  describe('Undo and Redo Physical State Fidelity', () => {
    it('restores exact chemical quantities and equipment placement on undo/redo', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      store.addChemicalToEquipment(beakerId, 'chem-hcl', 50);
      expect(useLabStore.getState().equipment[beakerId].volume_ml).toBe(50);

      // Undo addition of chemical
      useLabStore.getState().undo();
      expect(useLabStore.getState().equipment[beakerId].volume_ml).toBe(0);

      // Redo addition
      useLabStore.getState().redo();
      expect(useLabStore.getState().equipment[beakerId].volume_ml).toBe(50);
    });
  });
});
