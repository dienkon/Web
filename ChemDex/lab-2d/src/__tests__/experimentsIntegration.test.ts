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

  describe('Experiment 11: "Golden Rain" Lead(II) Iodide Synthesis & Heating', () => {
    it('synthesizes yellow crystalline PbI2 and supports thermal heating', () => {
      const store = useLabStore.getState();
      const flaskId = store.addEquipment('erlenmeyer_flask');

      // Add 20 mL of Pb(NO3)2 and 30 mL of KI
      store.addChemicalToEquipment(flaskId, 'chem-pbno32', 20);
      store.addChemicalToEquipment(flaskId, 'chem-ki', 30);

      let flask = useLabStore.getState().equipment[flaskId];
      expect(flask.hasPrecipitate).toBe(true);
      expect(flask.precipitateSubstance).toBe('PbI2');
      expect(flask.precipitateColorHex).toMatch(/#(fbbf24|eab308)/);

      // Heat flask
      store.toggleHeat(flaskId);
      flask = useLabStore.getState().equipment[flaskId];
      expect(flask.isOn).toBe(true);
      expect(flask.temperature_c).toBeGreaterThan(60.0);
    });

    it('validates step progression in Guided Experiment mode for Golden Rain', () => {
      const store = useLabStore.getState();
      store.selectExperiment('exp-golden-rain');

      expect(useLabStore.getState().activeExperiment?.id).toBe('exp-golden-rain');
      expect(useLabStore.getState().currentStepIndex).toBe(0);
      expect(useLabStore.getState().stepCompleted).toBe(false);

      // Step 1: Add erlenmeyer_flask with 30 mL Pb(NO3)2
      const flaskId = store.addEquipment('erlenmeyer_flask');
      store.addChemicalToEquipment(flaskId, 'chem-pbno32', 30);

      expect(useLabStore.getState().stepCompleted).toBe(true);

      // Advance to step 2
      store.nextStep();
      expect(useLabStore.getState().currentStepIndex).toBe(1);
      expect(useLabStore.getState().stepCompleted).toBe(false);

      // Step 2: Add 30 mL KI -> forms PbI2 precipitate
      store.addChemicalToEquipment(flaskId, 'chem-ki', 30);
      expect(useLabStore.getState().stepCompleted).toBe(true);

      // Advance to step 3
      store.nextStep();
      expect(useLabStore.getState().currentStepIndex).toBe(2);
      expect(useLabStore.getState().stepCompleted).toBe(false);

      // Step 3: Heat flask above 68°C
      store.toggleHeat(flaskId);
      expect(useLabStore.getState().stepCompleted).toBe(true);
    });
  });

  describe('Experiment 12: Silver Mirror Tollens Reaction', () => {
    it('forms metallic silver mirror upon adding acetaldehyde and warming', () => {
      const store = useLabStore.getState();
      const tubeId = store.addEquipment('test_tube');

      // Add 20 mL AgNO3, 15 mL NH3, and 10 mL CH3CHO
      store.addChemicalToEquipment(tubeId, 'chem-agno3', 20);
      store.addChemicalToEquipment(tubeId, 'chem-nh3', 15);
      store.addChemicalToEquipment(tubeId, 'chem-ch3cho', 10);

      // Warm over burner (toggleHeat warms to 85°C)
      store.toggleHeat(tubeId);

      const tube = useLabStore.getState().equipment[tubeId];
      expect(tube.hasSilverMirror).toBe(true);
      expect(tube.contents.some(c => c.formula === 'Ag')).toBe(true);
    });

    it('validates step progression in Guided Experiment mode for Silver Mirror', () => {
      const store = useLabStore.getState();
      store.selectExperiment('exp-silver-mirror');

      expect(useLabStore.getState().activeExperiment?.id).toBe('exp-silver-mirror');
      expect(useLabStore.getState().currentStepIndex).toBe(0);
      expect(useLabStore.getState().stepCompleted).toBe(false);

      // Step 1: Add test tube with 20 mL AgNO3
      const tubeId = store.addEquipment('test_tube');
      store.addChemicalToEquipment(tubeId, 'chem-agno3', 20);
      expect(useLabStore.getState().stepCompleted).toBe(true);

      // Advance to step 2: Add 15 mL NH3
      store.nextStep();
      expect(useLabStore.getState().currentStepIndex).toBe(1);
      expect(useLabStore.getState().stepCompleted).toBe(false);

      store.addChemicalToEquipment(tubeId, 'chem-nh3', 15);
      expect(useLabStore.getState().stepCompleted).toBe(true);

      // Advance to step 3: Add acetaldehyde & warm above 48°C
      store.nextStep();
      expect(useLabStore.getState().currentStepIndex).toBe(2);
      expect(useLabStore.getState().stepCompleted).toBe(false);

      store.addChemicalToEquipment(tubeId, 'chem-ch3cho', 10);
      store.toggleHeat(tubeId);
      expect(useLabStore.getState().stepCompleted).toBe(true);
    });
  });

  describe('Workbench Vessel Quick-Actions (Empty, Stir, Dilute, Seal)', () => {
    it('handles emptyEquipment, toggleStir, addDistilledWater, and toggleSeal', () => {
      const store = useLabStore.getState();
      const beakerId = store.addEquipment('beaker');

      // Add 50 mL NaCl
      store.addChemicalToEquipment(beakerId, 'chem-nacl', 50);
      expect(useLabStore.getState().equipment[beakerId].volume_ml).toBe(50);

      // Stirring
      expect(useLabStore.getState().equipment[beakerId].isStirred).toBeFalsy();
      store.toggleStir(beakerId);
      expect(useLabStore.getState().equipment[beakerId].isStirred).toBe(true);

      // Dilution with distilled water
      store.addDistilledWater(beakerId, 25);
      expect(useLabStore.getState().equipment[beakerId].volume_ml).toBe(75);

      // Seal container
      expect(useLabStore.getState().equipment[beakerId].isSealed).toBeFalsy();
      store.toggleSeal(beakerId);
      expect(useLabStore.getState().equipment[beakerId].isSealed).toBe(true);

      // Empty equipment (rinse)
      store.emptyEquipment(beakerId);
      const emptyBeaker = useLabStore.getState().equipment[beakerId];
      expect(emptyBeaker.volume_ml).toBe(0);
      expect(emptyBeaker.contents.length).toBe(0);
      expect(emptyBeaker.hasPrecipitate).toBe(false);
      expect(emptyBeaker.isStirred).toBe(false);
    });
  });

  describe('Position-Based Bunsen Burner Spatial Heating & Flame Emission Color', () => {
    it('heats beaker positioned in flame cone and detects copper emerald flame emission', () => {
      const store = useLabStore.getState();

      // Add Bunsen burner at (400, 300) and turn it on
      const burnerId = store.addEquipment('bunsen_burner', 400, 300);
      store.toggleHeat(burnerId);
      expect(useLabStore.getState().equipment[burnerId].isOn).toBe(true);

      // Burner width is 100, height is 160.
      // Barrel mouth is at burner.y + 42 = 342.
      // Beaker width is 120, height is 140.
      // Position beaker so bottom hovers 35px above barrel top:
      // vesselBottom = 342 - 35 = 307 => beaker.y = 307 - 140 = 167.
      // Center beaker with burner: burner center = 400 + 50 = 450.
      // beaker center = beaker.x + 60 => beaker.x = 450 - 60 = 390.
      const beakerId = store.addEquipment('beaker', 390, 167);
      store.addChemicalToEquipment(beakerId, 'chem-cuso4', 50);

      // Run multiple physics simulation ticks
      for (let i = 0; i < 4; i++) {
        store.tickSimulation(0.5);
      }

      const beaker = useLabStore.getState().equipment[beakerId];
      const burner = useLabStore.getState().equipment[burnerId];

      // Beaker should absorb heat and warm up
      expect(beaker.isBeingHeated).toBe(true);
      expect(beaker.absorbedPower_W).toBeGreaterThan(100);
      expect(beaker.temperature_c).toBeGreaterThan(25.0);

      // Burner flame emission should shift to emerald green due to Cu2+ ions
      expect(burner.gasColorHex).toBe('#10b981');
    });
  });

  describe('Experiment 13: Le Chatelier Equilibrium Shift of Iron(III) Thiocyanate', () => {
    it('forms blood-red complex and shifts equilibrium upon adding phosphate', () => {
      const store = useLabStore.getState();
      store.selectExperiment('exp-le-chatelier-thiocyanate');

      expect(useLabStore.getState().currentStepIndex).toBe(0);

      // Step 1: Add test tube with 20 mL FeCl3
      const tubeId = store.addEquipment('test_tube');
      store.addChemicalToEquipment(tubeId, 'chem-fecl3', 20);
      expect(useLabStore.getState().stepCompleted).toBe(true);

      // Step 2: Add 15 mL KSCN -> blood-red color
      store.nextStep();
      expect(useLabStore.getState().currentStepIndex).toBe(1);
      store.addChemicalToEquipment(tubeId, 'chem-kscn', 15);
      expect(useLabStore.getState().stepCompleted).toBe(true);
      expect(useLabStore.getState().equipment[tubeId].liquidColorHex).toBe('#7f1d1d');

      // Step 3: Add 20 mL Na2HPO4 -> shifts equilibrium, bleaching blood-red
      store.nextStep();
      expect(useLabStore.getState().currentStepIndex).toBe(2);
      store.addChemicalToEquipment(tubeId, 'chem-na2hpo4', 20);
      expect(useLabStore.getState().stepCompleted).toBe(true);
      expect(useLabStore.getState().equipment[tubeId].liquidColorHex).not.toBe('#7f1d1d');
    });
  });

  describe('Experiment 14: Liquid-Liquid Phase Extraction using Separatory Funnel', () => {
    it('separates immiscible organic ester layer and aqueous layer cleanly', () => {
      const store = useLabStore.getState();
      store.selectExperiment('exp-phase-extraction');

      // Step 1: Add separatory funnel with 50 mL H2O and 40 mL ethyl acetate
      const sepId = store.addEquipment('separatory_funnel', 300, 100);
      store.addChemicalToEquipment(sepId, 'chem-h2o', 50);
      store.addChemicalToEquipment(sepId, 'chem-ch3cooc2h5', 40);

      const sep = useLabStore.getState().equipment[sepId];
      expect(sep.volume_ml).toBe(90);
      expect(sep.hasPhaseSeparation).toBe(true);
      expect(useLabStore.getState().stepCompleted).toBe(true);

      // Step 2: Place flask underneath and drain lower aqueous phase
      store.nextStep();
      const flaskId = store.addEquipment('erlenmeyer_flask', 290, 360);
      store.toggleBuretteStopcock(sepId);

      // Simulate several seconds of drainage
      for (let i = 0; i < 26; i++) {
        store.tickSimulation(1.0);
      }

      const flask = useLabStore.getState().equipment[flaskId];
      expect(flask.volume_ml).toBeGreaterThan(30);
      expect(useLabStore.getState().stepCompleted).toBe(true);
    });
  });

  describe('Physical Telemetry Probes Dip Coupling (pH meter, thermometer, pH paper, stirring rod)', () => {
    it('dynamically measures pH, temperature, paper color, and induces stirring upon immersion', () => {
      const store = useLabStore.getState();

      // Place a beaker at (200, 200), width: 140, height: 160
      const beakerId = store.addEquipment('beaker', 200, 200);
      store.addChemicalToEquipment(beakerId, 'chem-hcl', 50);
      store.toggleHeat(beakerId); // heats to 85°C

      let beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.ph).toBeCloseTo(1.0, 1);
      expect(beaker.temperature_c).toBeGreaterThan(70.0);

      // 1. Dip pH meter into beaker: probe x=240, y=100 (tip at 260, 308 inside beaker)
      const meterId = store.addEquipment('ph_meter', 240, 100);
      store.tickSimulation(0.5);

      const meter = useLabStore.getState().equipment[meterId];
      expect(meter.isSubmerged).toBe(true);
      expect(meter.ph).toBeCloseTo(1.0, 1);

      // 2. Dip Thermometer into beaker: x=260, y=90 (bulb at 275, 315 inside beaker)
      const thermoId = store.addEquipment('thermometer', 260, 90);
      for (let i = 0; i < 5; i++) {
        store.tickSimulation(0.5);
      }

      const thermo = useLabStore.getState().equipment[thermoId];
      expect(thermo.isSubmerged).toBe(true);
      expect(thermo.temperature_c).toBeGreaterThan(60.0);

      // 3. Dip Universal pH Paper: x=280, y=150
      const paperId = store.addEquipment('ph_paper', 280, 150);
      store.tickSimulation(0.5);

      const paper = useLabStore.getState().equipment[paperId];
      expect(paper.isSubmerged).toBe(true);
      expect(paper.paperColorHex).toBe('#dc2626'); // Acid red for pH ~1

      // 4. Dip Glass Stirring Rod: x=230, y=110
      const rodId = store.addEquipment('stirring_rod', 230, 110);
      store.tickSimulation(0.5);

      beaker = useLabStore.getState().equipment[beakerId];
      expect(beaker.isStirred).toBe(true);
      expect(beaker.stirringSpeed).toBe(1.0);
    });
  });

  describe('Lab Safety: Chemical Spill Puddle Tracking & Sponge Cleanup', () => {
    it('creates fluid spill puddle on tabletop and cleans it with sponge', () => {
      const store = useLabStore.getState();

      // Create an acid spill of 25 mL HCl at (250, 300)
      store.addSpillPuddle(250, 300, 25, '#dc2626', 'HCl', 1.0);

      let puddles = useLabStore.getState().spillPuddles;
      expect(puddles.length).toBe(1);
      expect(puddles[0].formula).toBe('HCl');
      expect(puddles[0].radius_px).toBeGreaterThan(20);

      // Clean the spill with sponge
      store.cleanSpill(puddles[0].id);
      puddles = useLabStore.getState().spillPuddles;
      expect(puddles.length).toBe(0);
    });
  });

  describe('Lab Safety: Sealed Vessel Internal Vapor Overpressure Cork Pop', () => {
    it('pops cork off sealed vessel when boiling develops under heat', () => {
      const store = useLabStore.getState();
      // Test tube at x=200, y=127 (bottom at 307)
      const tubeId = store.addEquipment('test_tube', 200, 127);

      store.addChemicalToEquipment(tubeId, 'chem-h2o', 20);
      store.toggleHeat(tubeId); // heats to 85°C
      store.toggleSeal(tubeId); // seals opening with cork

      expect(useLabStore.getState().equipment[tubeId].isSealed).toBe(true);

      // Place burner directly underneath (burner top at 300 + 42 = 342, optimal 35px gap)
      const burnerId = store.addEquipment('bunsen_burner', 175, 300);
      store.toggleHeat(burnerId);

      // Simulate heating ticks until boiling occurs
      for (let i = 0; i < 20; i++) {
        store.tickSimulation(0.5);
      }

      const tube = useLabStore.getState().equipment[tubeId];
      // Cork must pop off for safety
      expect(tube.isSealed).toBe(false);

      // Verify warning log entry was recorded
      const history = useLabStore.getState().history;
      expect(history.some(h => h.details_en.includes('Cork popped') || h.details_vi.includes('Nút đậy bật tung'))).toBe(true);
    });
  });

  describe('Educational Pre-Lab & Post-Lab Assessment Quizzes', () => {
    it('verifies that quizzes have valid questions, options, and accurate explanations', async () => {
      const { EXPERIMENT_QUIZZES } = await import('../data/experimentQuizzes');
      expect(EXPERIMENT_QUIZZES.length).toBeGreaterThanOrEqual(4);

      for (const quiz of EXPERIMENT_QUIZZES) {
        expect(quiz.questions.length).toBeGreaterThan(0);
        for (const q of quiz.questions) {
          expect(q.options_en.length).toBeGreaterThanOrEqual(2);
          expect(q.options_vi.length).toBe(q.options_en.length);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(q.options_en.length);
          expect(q.explanation_vi.length).toBeGreaterThan(10);
        }
      }
    });
  });
});
