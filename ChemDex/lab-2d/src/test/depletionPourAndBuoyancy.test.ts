import { describe, it, expect, beforeEach } from 'vitest';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { kineticRuntime2D, prepareVesselSimulation, stepVesselKineticTick } from '../chemistry/reactions/kineticsSolver';
import { computeParticleBuoyancy, getPrecipitateProfile2D } from '../chemistry/physical/precipitateProfiles';
import { useLabStore } from '../store/useLabStore';
import { EquipmentState } from '../types/equipment';

function makeTestBeaker(id = 'beaker_test'): EquipmentState {
  return {
    id,
    name: '250 mL Beaker',
    name_vi: 'Cốc thủy tinh 250 mL',
    type: 'beaker',
    x: 120,
    y: 120,
    width: 140,
    height: 160,
    capacity_ml: 250,
    isContainer: true,
    temperature_c: 25,
    contents: [],
    volume_ml: 0,
    mass_g: 95,
    tare_g: 95,
    ph: 7,
  };
}

describe('Lab-3D Parity: Reactant Depletion, Escaped Gas Loss, External Pouring & Precipitate Buoyancy', () => {
  beforeEach(() => {
    kineticRuntime2D.resetAll();
    useLabStore.getState().resetWorkbench();
  });

  it('keeps initialMass_g locked while solid Zn continuously shrinks to 0 and halts gas on completion', () => {
    useLabStore.getState().setRealtimeKinetics(true);
    const id = useLabStore.getState().addEquipment('beaker', 100, 100);
    // chem-hcl is 0.1 M stock: 100 mL HCl = 0.01 mol, so 0.2 g Zn (~0.00306 mol) is limiting (needs 0.00612 mol HCl)
    useLabStore.getState().addChemicalToEquipment(id, 'chem-hcl', 100, 0);
    useLabStore.getState().addChemicalToEquipment(id, 'chem-zn', 0, 0.2);

    const startEq = useLabStore.getState().equipment[id];
    const startChunk = startEq.solidChunks?.find((c) => c.formula.toUpperCase() === 'ZN');
    expect(startChunk).toBeDefined();
    expect(startChunk!.initialMass_g).toBeCloseTo(0.2, 2);

    let midSeen = false;
    let midInitialMass = 0;
    let midMass = 0;

    // Advance kinetics in 0.4s increments for 16s total
    for (let i = 0; i < 40; i++) {
      useLabStore.getState().tickSimulation(0.4);
      const cur = useLabStore.getState().equipment[id];
      const chunk = cur.solidChunks?.find((c) => c.formula.toUpperCase() === 'ZN');
      if (chunk && chunk.mass_g < 0.16 && chunk.mass_g > 0.02 && !midSeen) {
        midSeen = true;
        midInitialMass = chunk.initialMass_g;
        midMass = chunk.mass_g;
      }
    }

    expect(midSeen).toBe(true);
    // Initial mass must NEVER shrink down with remaining mass!
    expect(midInitialMass).toBeCloseTo(0.2, 2);
    expect(midMass).toBeLessThan(0.16);

    const finalEq = useLabStore.getState().equipment[id];
    // Zn completely consumed -> solid chunk disappears, gas evolution stops cleanly
    const endZn = finalEq.contents.find((c) => c.formula.toUpperCase() === 'ZN');
    expect(endZn?.mass_g ?? 0).toBeLessThan(0.001);
    expect(finalEq.solidChunks?.find((c) => c.formula.toUpperCase() === 'ZN')).toBeUndefined();
    expect(finalEq.hasGas).toBe(false);
    expect(finalEq.foamHead_mm ?? 0).toBe(0);
    // Theoretical H2 evolved from 0.003059 mol Zn = ~0.00617 g H2
    expect(finalEq.totalEscapedGas_g ?? 0).toBeGreaterThan(0.005);
    expect(useLabStore.getState().workbenchEscapedGas_g['H2'] ?? 0).toBeGreaterThan(0.005);
  });

  it('deducts escaped CO2 gas mass and records vessel + workbench escapedGas_g when CaCO3 dissolves in HCl', () => {
    const vessel = makeTestBeaker('b_caco3');
    const sim = runSimulationCycle(
      [
        { formula: 'CaCO3', moles: 0.02, mass_g: 2.002, state: 's' },
        { formula: 'HCl', moles: 0.1, mass_g: 3.646, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25,
      false,
      true
    );

    // 0.02 mol CO2 * 44.01 g/mol = ~0.880 g CO2 escaped in an open vessel
    expect(sim.escapedGas_g?.CO2).toBeGreaterThan(0.8);
    expect(sim.escapedGas_g?.CO2).toBeLessThan(0.95);
    expect(sim.updatedContents.some((c) => c.formula === 'CO2')).toBe(false);

    // Prepare + complete in kinetics mode checks mass delta directly on vessel
    const prep = prepareVesselSimulation(vessel, sim.updatedContents, 50, 25, false, true, undefined, false);
    expect(prep.simResult.updatedContents.length).toBeGreaterThan(0);

    useLabStore.getState().setRealtimeKinetics(false);
    const eqId = useLabStore.getState().addEquipment('beaker', 100, 100);
    // 100 mL of 0.1 M HCl = 0.01 mol -> reacts with 0.005 mol CaCO3 (0.50 g) evolving ~0.22 g CO2
    useLabStore.getState().addChemicalToEquipment(eqId, 'chem-hcl', 100, 0);
    const massBeforeCaCO3 = useLabStore.getState().equipment[eqId].mass_g;
    useLabStore.getState().addChemicalToEquipment(eqId, 'chem-caco3', 0, 0.5);
    const eqAfter = useLabStore.getState().equipment[eqId];

    // Mass after must be strictly LESS than (massBefore + 0.5) by the escaped CO2 mass (~0.22g)!
    expect(eqAfter.mass_g).toBeLessThan(massBeforeCaCO3 + 0.35);
    expect(eqAfter.totalEscapedGas_g ?? 0).toBeGreaterThan(0.18);
    expect(useLabStore.getState().workbenchEscapedGas_g['CO2'] ?? 0).toBeGreaterThan(0.18);
  });

  it('reduces aqueous volume_ml proportionally when H2O itself is consumed as a reactant', () => {
    const vessel: EquipmentState = {
      ...makeTestBeaker('b_h2o_loss'),
      volume_ml: 40,
      contents: [
        { formula: 'Na', moles: 0.2, mass_g: 4.598, state: 's' },
        { formula: 'H2O', moles: 2.22, mass_g: 40, state: 'l' },
      ],
      initialSolidMassByFormula: { NA: 4.598 },
    };

    prepareVesselSimulation(vessel, vessel.contents, vessel.volume_ml, 25, false, true, undefined, true);
    let cur = { ...vessel };
    for (let i = 0; i < 40; i++) {
      const k = stepVesselKineticTick(cur, 0.3, true);
      if (k.changed && k.simPartial) {
        cur = { ...cur, ...k.simPartial };
      }
    }

    expect(cur.volume_ml).toBeLessThan(39);
    expect(cur.hasGas).toBe(false);
  });

  it('computes Archimedes + hydrophobic precipitate buoyancy: sinking dense salts vs floating soap curds & bubble-buoyed solids', () => {
    // Heavy mineral precipitates sink
    expect(getPrecipitateProfile2D('BaSO4')?.effectiveWetDensity_g_cm3).toBeGreaterThan(2.0);
    expect(computeParticleBuoyancy('BaSO4', 1.0, false).buoyancy).toBe('sink');
    expect(computeParticleBuoyancy('PbI2', 1.0, false).buoyancy).toBe('sink');

    // Colloidal gels stay suspended near neutral buoyancy
    expect(computeParticleBuoyancy('Cu(OH)2', 1.0, false).buoyancy).toBe('suspend');

    // Soap scum Ca(C17H35COO)2 floats above aqueous column even with zero gas
    expect(computeParticleBuoyancy('Ca(C17H35COO)2', 1.0, false).buoyancy).toBe('float');

    // Hydrophobic sulfur floats; high-entrainment CaCO3 floats during active bubbling and sinks cleanly after gas ceases
    expect(computeParticleBuoyancy('S', 1.0, false).buoyancy).toBe('float');
    expect(computeParticleBuoyancy('CaCO3', 1.0, true).buoyancy).toBe('float');
    expect(computeParticleBuoyancy('CaCO3', 1.0, false).buoyancy).toBe('sink');
    expect(computeParticleBuoyancy('Mg(OH)2', 1.0, true).buoyancy).toBe('float');
    expect(computeParticleBuoyancy('Mg(OH)2', 1.0, false).buoyancy).toBe('suspend');

    // Verify full CaCl2 + C17H35COONa soap-scum reaction carries buoyancy = 'float'
    const soapSim = runSimulationCycle(
      [
        { formula: 'CaCl2', moles: 0.01, mass_g: 1.11, state: 'aq' },
        { formula: 'C17H35COONa', moles: 0.02, mass_g: 6.13, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25
    );
    expect(soapSim.hasPrecipitate).toBe(true);
    expect(soapSim.precipitateInfo?.formula).toBe('Ca(C17H35COO)2');
    expect(soapSim.precipitateLayers?.[0]?.buoyancy).toBe('float');
  });

  it('gradually animates & delivers external drag-from-sidebar reagent doses across tickSimulation', () => {
    useLabStore.getState().setRealtimeKinetics(false);
    const id = useLabStore.getState().addEquipment('beaker', 100, 100);
    useLabStore.getState().addChemicalToEquipment(id, 'chem-h2o', 40, 0);

    useLabStore.getState().triggerExternalChemicalPour(id, 'chem-phenolphthalein', 2, 0, -0.3);
    expect(useLabStore.getState().activeExternalDoses.length).toBe(1);
    expect(useLabStore.getState().activeExternalDoses[0].deliveryMode).toBe('dropper');

    // Step animation until complete
    for (let i = 0; i < 30; i++) {
      useLabStore.getState().tickSimulation(0.08);
    }

    expect(useLabStore.getState().activeExternalDoses.length).toBe(0);
    const eq = useLabStore.getState().equipment[id];
    expect(eq.contents.some((c) => c.formula.toUpperCase() === 'PHENOLPHTHALEIN')).toBe(true);
    expect(eq.volume_ml).toBeGreaterThan(41.5);
  });
});
