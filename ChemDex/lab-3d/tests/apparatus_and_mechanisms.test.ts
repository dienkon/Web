import { describe, it, expect } from 'vitest';
import { VESSEL_GEOMETRIES } from '../src/sim/vessel';
import { getVesselInnerRadius, createVesselLatheGeometry } from '../src/vfx/materials/glass';
import { VesselType } from '../src/types/chemistry';
import { useAppStore, getSolidMorphology } from '../src/store/useAppStore';
import { evaluateLocalChemistry } from '../src/engine/chemistryEngine';

const ALL_17_VESSEL_TYPES: VesselType[] = [
  'beaker',
  'flask',
  'test_tube',
  'cylinder',
  'burette',
  'watch_glass',
  'evaporating_dish',
  'crucible',
  'petri_dish',
  'volumetric_flask',
  'separatory_funnel',
  'filter_funnel',
  'mortar_pestle',
  'condenser',
  'test_tube_rack',
  'wash_bottle',
  'tongs'
];

describe('Advanced Laboratory Apparatus: Presets & Geometry', () => {
  it('defines numerical quadrature profiles for all 17 physical vessel types in VESSEL_GEOMETRIES', () => {
    for (const type of ALL_17_VESSEL_TYPES) {
      if (type === 'burette') continue; // Burette has lathe geometry and radius profile in glass.ts
      const geom = VESSEL_GEOMETRIES[type as keyof typeof VESSEL_GEOMETRIES];
      expect(geom, `Missing geometry for ${type}`).toBeDefined();
      expect(geom.config.height_m).toBeGreaterThan(0);
      expect(geom.config.nominalCapacity_m3).toBeGreaterThan(0);
      expect(geom.radiusAtHeight(0.01)).toBeGreaterThan(0);
    }
  });

  it('computes accurate internal radii for all 17 vessel types across various liquid heights', () => {
    for (const type of ALL_17_VESSEL_TYPES) {
      const rBottom = getVesselInnerRadius(type, 0.1);
      const rMiddle = getVesselInnerRadius(type, 0.8);
      expect(rBottom, `Radius at bottom invalid for ${type}`).toBeGreaterThan(0);
      expect(rMiddle, `Radius at middle invalid for ${type}`).toBeGreaterThan(0);
    }
  });

  it('generates non-empty 3D lathe geometries for all vessel types', () => {
    for (const type of ALL_17_VESSEL_TYPES) {
      const { outer, inner } = createVesselLatheGeometry(type, 16);
      expect(outer.attributes.position.count).toBeGreaterThan(0);
      expect(inner.attributes.position.count).toBeGreaterThan(0);
    }
  });
});

describe('Physical Mechanisms & Store Actions', () => {
  it('triggers thermal shock shattering when adding cold liquid to dry glassware above 180°C', () => {
    const store = useAppStore.getState();
    store.addVessel('flask', 'Thermal Shock Test Flask');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Set dry vessel to 210°C
    store.setVesselState(vesselId, {
      volume_ml: 0,
      temperature_c: 210
    });

    // Attempt to pour water into superheated dry vessel
    store.mixSubstances(vesselId, 'H2O', 25);

    const testVessel = useAppStore.getState().vessels[vesselId];
    expect(testVessel.isShattered).toBe(true);
    expect(testVessel.shatterReason).toContain('Thermal Shock');
    expect(testVessel.volume_ml).toBe(0);

    // Clean up
    store.removeVessel(vesselId);
  });

  it('replaces shattered vessel with intact clean vessel', () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Shattered Beaker');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.shatterVessel(vesselId, 'Accidental mechanical impact');
    expect(useAppStore.getState().vessels[vesselId].isShattered).toBe(true);

    store.replaceShatteredVessel(vesselId);
    const repaired = useAppStore.getState().vessels[vesselId];
    expect(repaired.isShattered).toBe(false);
    expect(repaired.shatterReason).toBeUndefined();
    expect(repaired.temperature_c).toBe(25);

    // Clean up
    store.removeVessel(vesselId);
  });

  it('pulverizes solid chunks in mortar and pestle into fine powder', () => {
    const store = useAppStore.getState();
    store.addVessel('mortar_pestle', 'Agate Mortar');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    expect(useAppStore.getState().vessels[vesselId].isPulverized).toBeFalsy();

    store.setVesselState(vesselId, { substances: ['NaCl'], contents: [{ formula: 'NaCl', phase: 's', mass_g: 1, moles: 1 / 58.44 }] });
    store.grindMortar(vesselId);
    const pulverized = useAppStore.getState().vessels[vesselId];
    expect(pulverized.isPulverized).toBe(true);
    expect(pulverized.precipitateMorphology).toBe('POWDER');

    // Clean up
    store.removeVessel(vesselId);
  });

  it('toggles stopcock valve on separatory funnel', () => {
    const store = useAppStore.getState();
    store.addVessel('separatory_funnel', 'Extraction Funnel');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    expect(useAppStore.getState().vessels[vesselId].stopcockOpen).toBeFalsy();

    store.toggleStopcock(vesselId);
    expect(useAppStore.getState().vessels[vesselId].stopcockOpen).toBe(true);

    store.toggleStopcock(vesselId);
    expect(useAppStore.getState().vessels[vesselId].stopcockOpen).toBe(false);

    // Clean up
    store.removeVessel(vesselId);
  });

  it('cleans evaporative waterline stains completely', () => {
    const store = useAppStore.getState();
    store.addVessel('evaporating_dish', 'Stained Dish');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(vesselId, {
      stainIntensity: 0.85,
      stainColor: '#b45309',
      condensationMist: 0.6
    });

    store.cleanVesselStain(vesselId);
    const cleaned = useAppStore.getState().vessels[vesselId];
    expect(cleaned.stainIntensity).toBe(0);
    expect(cleaned.stainColor).toBeUndefined();
    expect(cleaned.condensationMist).toBe(0);

    // Clean up
    store.removeVessel(vesselId);
  });

  it('evaluates oxidation reaction producing CuSO4 and gas when heated', () => {
    const result = evaluateLocalChemistry(
      ['Cu', 'H2SO4 (conc)'],
      20,
      80, // Heated to 80°C
      true,
      'en'
    );

    expect(result).not.toBeNull();
    expect(result!.products).toContain('CuSO4');
    expect(result!.products).toContain('SO2');
    expect(result!.new_vessel_state.has_gas).toBe(true);
  });

  it('separatory funnel stopcock draining runs at 25°C room temp without burners lit', () => {
    const store = useAppStore.getState();
    store.addVessel('separatory_funnel', 'Room Temp Funnel');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(vesselId, {
      volume_ml: 50, mass_g: 50, contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }],
      temperature_c: 25,
      substances: ['H2O'],
      stopcockOpen: true
    });

    expect(useAppStore.getState().vessels[vesselId].volume_ml).toBe(50);

    // Tick simulation at 25°C without any burner lit
    store.tickSimulation(0.5);

    const afterTick = useAppStore.getState().vessels[vesselId];
    expect(afterTick.volume_ml).toBeLessThan(50);

    // Clean up
    store.removeVessel(vesselId);
  });

  it('drains the finite aqueous lower layer before a lighter organic layer', () => {
    const store=useAppStore.getState();store.addVessel('separatory_funnel','Two phases');
    const id=useAppStore.getState().vesselIds.at(-1)!;
    store.addVessel('beaker','Receiver');const target=useAppStore.getState().vesselIds.at(-1)!;
    store.setVesselState(id,{position:[0,1,0],volume_ml:35,mass_g:29.9,immiscibleOrganicVolume_ml:15,stopcockOpen:true,
      contents:[{formula:'H2O',phase:'l',moles:20/18.015,mass_g:20},{formula:'C6H14',phase:'l',liquidLayer:'organic',moles:9.9/86.178,mass_g:9.9}],
      substances:['H2O','C6H14'],flowReceiverId:target});
    store.setVesselState(target,{position:[0,0,0],volume_ml:0,mass_g:0,contents:[],substances:[]});
    store.tickSimulation(0.1);
    expect(useAppStore.getState().vessels[id].volume_ml).toBeLessThan(35);
    expect(useAppStore.getState().vessels[id].immiscibleOrganicVolume_ml).toBe(15);
    store.setVesselState(id,{volume_ml:15.1,mass_g:10,contents:[{formula:'H2O',phase:'l',mass_g:0.1,moles:0.1/18.015},
      {formula:'C6H14',phase:'l',liquidLayer:'organic',moles:9.9/86.178,mass_g:9.9}]});
    store.tickSimulation(0.1);
    expect(useAppStore.getState().vessels[id].volume_ml).toBeCloseTo(15,10);
    store.tickSimulation(0.1);
    expect(useAppStore.getState().vessels[id].immiscibleOrganicVolume_ml).toBeLessThan(15);
    store.removeVessel(id);store.removeVessel(target);
  });

  it('does not generate dense fumes merely from aqueous acid/ammonia labels', () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Aqueous Acid');
    const id = useAppStore.getState().vesselIds.at(-1)!;
    store.setVesselState(id, { volume_ml: 20, substances: ['HCl (dil)'], fumingIntensity: 0.85 });
    store.tickSimulation(0.1);
    expect(useAppStore.getState().vessels[id].fumingIntensity).toBe(0);
    store.setVesselState(id, { substances: ['HCl (dil)', 'NH3(aq)'] });
    store.tickSimulation(0.1);
    expect(useAppStore.getState().vessels[id].fumingIntensity).toBe(0);
    store.removeVessel(id);
  });

  it('does not pulverize an empty mortar or generate solid inventory', () => {
    const store = useAppStore.getState();
    store.addVessel('mortar_pestle', 'Empty Mortar');
    const id = useAppStore.getState().vesselIds.at(-1)!;
    const before = useAppStore.getState().vessels[id];
    store.grindMortar(id);
    expect(useAppStore.getState().vessels[id]).toEqual(before);
    store.removeVessel(id);
  });

  it('triggers thermal shock glass shattering in pourVessel when cold liquid is poured into hot dry glassware (>= 180°C)', async () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Cold Source');
    const sourceId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('flask', 'Hot Dry Target');
    const targetId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(sourceId, {
      volume_ml: 25,
      substances: ['H2O'],
      liquidColor: '#38bdf8'
    });

    store.setVesselState(targetId, {
      volume_ml: 0,
      temperature_c: 200,
      substances: []
    });

    await store.pourVessel(sourceId, targetId, 10);

    const targetVessel = useAppStore.getState().vessels[targetId];
    expect(targetVessel.isShattered).toBe(true);
    expect(targetVessel.shatterReason).toContain('Thermal Shock');

    // Clean up
    store.removeVessel(sourceId);
    store.removeVessel(targetId);
  });
});

describe('Authentic Solid Chemical Morphologies & Interactive Apparatus Usability', () => {
  it('correctly maps all solid chemicals to authentic crystalline or particulate morphologies', () => {
    // Metals & physical mechanical states
    expect(getSolidMorphology('Mg')).toBe('RIBBON');
    expect(getSolidMorphology('Cu')).toBe('TURNINGS');
    expect(getSolidMorphology('Fe')).toBe('FILINGS');
    expect(getSolidMorphology('Zn')).toBe('GRANULES');
    expect(getSolidMorphology('Al')).toBe('RIBBON');

    // Pellets & chips
    expect(getSolidMorphology('NaOH')).toBe('PELLET');
    expect(getSolidMorphology('KOH')).toBe('PELLET');
    expect(getSolidMorphology('CaCO3')).toBe('POWDER');
    expect(getSolidMorphology('CaCO3 (chips)')).toBe('CHIPS');

    // Distinct crystalline structures
    expect(getSolidMorphology('NaCl')).toBe('CUBIC_CRYSTAL');
    expect(getSolidMorphology('KMnO4')).toBe('PRISMATIC_CRYSTAL');
    expect(getSolidMorphology('K2Cr2O7')).toBe('TABULAR_CRYSTAL');
    expect(getSolidMorphology('CuSO4')).toBe('HYDRATE_CRYSTAL');
    expect(getSolidMorphology('CuSO4.5H2O')).toBe('HYDRATE_CRYSTAL');
    expect(getSolidMorphology('I2')).toBe('LUSTROUS_PLATES');

    // Insoluble precipitates and powders
    expect(getSolidMorphology('BaSO4')).toBe('POWDER');
    expect(getSolidMorphology('PbI2')).toBe('POWDER');
    expect(getSolidMorphology('AgCl')).toBe('POWDER');
    expect(getSolidMorphology('MnO2')).toBe('POWDER');
    expect(getSolidMorphology('Fe2O3')).toBe('POWDER');
  });

  it('performs gravity filtration with filter funnel, collecting precipitate residue on filter paper and draining filtrate into receiver', () => {
    const store = useAppStore.getState();
    store.addVessel('filter_funnel', 'Gravity Filter Funnel');
    const funnelId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('beaker', 'Filtrate Receiver Beaker');
    const receiverId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Place receiver directly under funnel away from default workbench vessels
    store.setVesselState(funnelId, {
      position: [4.0, 1.0, 4.0],
      volume_ml: 30, mass_g: 32.5, contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30/18.015 }, { formula: 'BaSO4', phase: 's', mass_g: 2.5, moles: 2.5/233.383 }],
      substances: ['H2O', 'BaSO4'],
      hasPrecipitate: true,
      precipitateAmount_g: 2.5,
      precipitateSubstance: 'BaSO4'
    });

    store.setVesselState(receiverId, {
      position: [4.0, 0, 4.0],
      volume_ml: 0,
      substances: []
    });

    // Run simulation tick
    store.tickSimulation(1.0);

    const funnel = useAppStore.getState().vessels[funnelId];
    const receiver = useAppStore.getState().vessels[receiverId];

    // Funnel volume decreased as liquid drained through filter paper
    expect(funnel.volume_ml).toBeLessThan(30);
    expect(funnel.isFiltrating).toBe(true);

    // Residue retained on filter paper
    expect(funnel.filterPaperResidue_g).toBeGreaterThan(0);
    expect(funnel.filterPaperResidueSubstance).toBe('BaSO4');

    // Receiver beaker received liquid filtrate
    expect(receiver.volume_ml).toBeGreaterThan(0);
    expect(receiver.substances).toContain('H2O');

    // Clean up
    store.removeVessel(funnelId);
    store.removeVessel(receiverId);
  });

  it('does not generate pressure or rupture from a hasGas flag alone', () => {
    const store = useAppStore.getState();
    store.addVessel('flask', 'Sealed Flask');
    const id = useAppStore.getState().vesselIds.at(-1)!;
    store.setVesselState(id, { isSealed: true, hasGas: true, volume_ml: 40,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 40, moles: 40/18.015 }],
      mass_g: 40, temperature_c: 25, internalPressure_atm: 1 });
    for (let i=0;i<10;i++) store.tickSimulation(0.1);
    const flask = useAppStore.getState().vessels[id];
    expect(flask.internalPressure_atm).toBeCloseTo(1, 12);
    expect(flask.isExplosion).toBeFalsy();
    expect(flask.isShattered).toBeFalsy();
    expect(flask.volume_ml).toBe(40);
    store.removeVessel(id);
  });

  it('dispenses actual wash-bottle water without claiming an insoluble stain disappeared', () => {
    const store = useAppStore.getState();
    store.addVessel('wash_bottle', 'PE Wash Bottle');
    const bottleId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('beaker', 'Stained Beaker');
    const beakerId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(bottleId, {
      volume_ml: 200,
      capacity_ml: 250,
      substances: ['H2O']
    });

    store.setVesselState(beakerId, {
      volume_ml: 10,
      mass_g: 10,
      substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 }],
      stainIntensity: 0.8,
      condensationMist: 0.5
    });

    // Squirt wash bottle into stained beaker
    store.squirtWashBottle(bottleId, beakerId);

    const bottle = useAppStore.getState().vessels[bottleId];
    const beaker = useAppStore.getState().vessels[beakerId];

    expect(bottle.volume_ml).toBeLessThan(200);
    expect(beaker.stainIntensity).toBe(0.8);
    expect(beaker.mass_g + bottle.mass_g).toBeCloseTo(210, 10);
    expect(beaker.contents.find(item => item.formula === 'H2O')?.mass_g).toBeCloseTo(15, 10);
    expect(beaker.substances).toContain('H2O');

    // Clean up
    store.removeVessel(bottleId);
    store.removeVessel(beakerId);
  });

  it('inverts a stoppered volumetric flask without deleting excess solute', () => {
    const store = useAppStore.getState();
    store.addVessel('volumetric_flask', 'Standard 100mL Flask');
    const flaskId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(flaskId, {
      volume_ml: 95,
      isSealed: true,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 95, moles: 95 / 18.015 }, { formula: 'NaCl', phase: 's', mass_g: 50, moles: 50 / 58.44 }],
      capacity_ml: 100,
      substances: ['H2O', 'NaCl'],
      hasPrecipitate: true,
      isPulverized: false
    });

    store.invertVolumetricFlask(flaskId);

    const flask = useAppStore.getState().vessels[flaskId];
    expect(flask.isPulverized).toBe(false);
    expect(flask.hasPrecipitate).toBe(true);
    expect(flask.contents.find(x => x.formula === 'NaCl')?.mass_g).toBe(50);

    const dissolving = useAppStore.getState().dissolvingSubstances[flaskId];
    expect(dissolving?.['NaCl'] ?? 0).toBe(0);

    // Clean up
    store.removeVessel(flaskId);
  });

  it('manages test tube placement in test tube rack slots and links spatial movement', () => {
    const store = useAppStore.getState();
    store.addVessel('test_tube_rack', 'Wooden Tube Rack');
    const rackId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('test_tube', 'Tube Alpha');
    const tubeId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(rackId, { position: [1.0, 0, 1.0] });

    // Place tube in rack
    store.placeTestTubeInRack(rackId, tubeId);

    let rack = useAppStore.getState().vessels[rackId];
    let tube = useAppStore.getState().vessels[tubeId];
    expect(rack.slottedTestTubeIds).toContain(tubeId);
    // Tube position snapped to slot in rack
    expect(tube.position[0]).toBeCloseTo(1.0 - 0.65, 2);

    // Move rack to new position
    store.setVesselState(rackId, { position: [2.0, 0, 3.0] });

    tube = useAppStore.getState().vessels[tubeId];
    // Slotted test tube automatically moves with the rack!
    expect(tube.position[0]).toBeCloseTo(2.0 - 0.65, 2);
    expect(tube.position[2]).toBeCloseTo(3.0, 2);

    // Remove tube from rack
    store.removeTestTubeFromRack(rackId, tubeId);
    rack = useAppStore.getState().vessels[rackId];
    expect(rack.slottedTestTubeIds).not.toContain(tubeId);

    // Clean up
    store.removeVessel(rackId);
    store.removeVessel(tubeId);
  });

  it('grips and translates vessels with stainless steel laboratory tongs', () => {
    const store = useAppStore.getState();
    store.addVessel('tongs', 'Lab Crucible Tongs');
    const tongsId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('crucible', 'Hot Porcelain Crucible');
    const crucibleId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(crucibleId, { position: [0.5, 0, 0.5], temperature_c: 450 });

    // Grip crucible with tongs
    store.toggleGripWithTongs(tongsId, crucibleId);

    let tongs = useAppStore.getState().vessels[tongsId];
    let crucible = useAppStore.getState().vessels[crucibleId];
    expect(tongs.grippedVesselId).toBe(crucibleId);
    expect(crucible.heldByTongsId).toBe(tongsId);

    // Move tongs to a new position
    store.setVesselState(tongsId, { position: [1.5, 0.4, 2.0] });

    crucible = useAppStore.getState().vessels[crucibleId];
    // Gripped crucible translates with the tongs!
    expect(crucible.position[0]).toBeCloseTo(1.5, 2);
    expect(crucible.position[2]).toBeCloseTo(2.0, 2);

    // Release crucible
    store.toggleGripWithTongs(tongsId, crucibleId);
    tongs = useAppStore.getState().vessels[tongsId];
    crucible = useAppStore.getState().vessels[crucibleId];
    expect(tongs.grippedVesselId).toBeUndefined();
    expect(crucible.heldByTongsId).toBeUndefined();

    // Clean up
    store.removeVessel(tongsId);
    store.removeVessel(crucibleId);
  });

  it('collects only finite vapor from an explicitly connected water source', () => {
    const store=useAppStore.getState();
    store.addVessel('condenser','Condenser');const receiver=useAppStore.getState().vesselIds.at(-1)!;
    store.addVessel('flask','Water source');const source=useAppStore.getState().vesselIds.at(-1)!;
    store.setVesselState(receiver,{ coolingWaterActive:true,vaporSourceId:source,volume_ml:0,mass_g:0,contents:[],substances:[] });
    store.setVesselState(source,{ temperature_c:105,volume_ml:50,mass_g:50,substances:['H2O'],
      contents:[{formula:'H2O',phase:'l',moles:50/18.015,mass_g:50}] });
    store.tickSimulation(0.1);
    const state=useAppStore.getState();
    expect(state.vessels[receiver].volume_ml).toBeGreaterThan(0);
    expect(state.vessels[receiver].mass_g+state.vessels[source].mass_g
      +(state.vessels[source].wallCondensation?.inner_g ?? 0)).toBeCloseTo(50,10);
    expect(state.vessels[receiver].contents[0].moles*18.015).toBeCloseTo(state.vessels[receiver].mass_g,10);
    store.removeVessel(receiver);store.removeVessel(source);
  });

  it('synchronizes 3D spatial dragging in updateVesselPosition for slotted tubes and gripped vessels, with auto-unslot and auto-release', () => {
    const store = useAppStore.getState();
    // 1. Rack and tube movement sync
    store.addVessel('test_tube_rack', 'Moving Rack');
    const rackId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];
    store.addVessel('test_tube', 'Slotted Tube');
    const tubeId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(rackId, { position: [0, 0, 0] });
    store.placeTestTubeInRack(rackId, tubeId);

    const initialTubePos = useAppStore.getState().vessels[tubeId].position;
    // Drag rack via updateVesselPosition
    store.updateVesselPosition(rackId, [2.0, 0, 1.5]);

    let movedTube = useAppStore.getState().vessels[tubeId];
    expect(movedTube.position[0]).toBeCloseTo(initialTubePos[0] + 2.0, 2);
    expect(movedTube.position[2]).toBeCloseTo(initialTubePos[2] + 1.5, 2);

    // Drag tube far away (> 1.2m): should auto-unslot
    store.updateVesselPosition(tubeId, [10.0, 0, 10.0]);
    let rack = useAppStore.getState().vessels[rackId];
    expect(rack.slottedTestTubeIds).not.toContain(tubeId);

    // 2. Tongs and gripped crucible sync
    store.addVessel('tongs', 'Moving Tongs');
    const tongsId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];
    store.addVessel('crucible', 'Gripped Crucible');
    const crucibleId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(tongsId, { position: [0, 0, 0] });
    store.setVesselState(crucibleId, { position: [0, 0, 0] });
    store.toggleGripWithTongs(tongsId, crucibleId);

    // Drag tongs via updateVesselPosition
    store.updateVesselPosition(tongsId, [3.0, 0.2, -1.0]);
    let movedCrucible = useAppStore.getState().vessels[crucibleId];
    expect(movedCrucible.position[0]).toBeCloseTo(3.0, 2);
    expect(movedCrucible.position[2]).toBeCloseTo(-1.0, 2);

    // Drag crucible far away (> 1.0m): should auto-release tongs grip
    store.updateVesselPosition(crucibleId, [10.0, 0, 10.0]);
    let tongs = useAppStore.getState().vessels[tongsId];
    expect(tongs.grippedVesselId).toBeUndefined();

    // Clean up
    store.removeVessel(rackId);
    store.removeVessel(tubeId);
    store.removeVessel(tongsId);
    store.removeVessel(crucibleId);
  });

  it('holds pressure constant for a finite gas inventory and changes when actual gas is added', () => {
    const store=useAppStore.getState();store.addVessel('flask','Finite gas');
    const id=useAppStore.getState().vesselIds.at(-1)!;
    store.setVesselState(id,{isSealed:true,hasGas:true,temperature_c:25,volume_ml:50,mass_g:50,
      contents:[{formula:'H2O',phase:'l',moles:50/18.015,mass_g:50},{formula:'H2',phase:'g',moles:0.002,mass_g:0.004032}] });
    store.tickSimulation(0.016);const first=useAppStore.getState().vessels[id].internalPressure_atm!;
    for(let i=0;i<20;i++)store.tickSimulation(0.016);
    expect(useAppStore.getState().vessels[id].internalPressure_atm).toBeCloseTo(first,10);
    store.setVesselState(id,{contents:[{formula:'H2O',phase:'l',moles:50/18.015,mass_g:50},{formula:'H2',phase:'g',moles:0.004,mass_g:0.008064}]});
    store.tickSimulation(0.016);
    expect(useAppStore.getState().vessels[id].internalPressure_atm).toBeGreaterThan(first);
    expect(useAppStore.getState().vessels[id].isExplosion).toBeFalsy();
    store.removeVessel(id);
  });

  it('decants supernatant while preserving the settled precipitate in its source', async () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Precipitate Source');
    const sourceId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('beaker', 'Precipitate Receiver');
    const receiverId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(sourceId, {
      volume_ml: 40,
      mass_g: 43.2,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 40, moles: 40 / 18.015 }, { formula: 'PbI2', phase: 's', mass_g: 3.2, moles: 3.2 / 461.01 }],
      substances: ['H2O', 'PbI2'],
      hasPrecipitate: true,
      precipitateAmount_g: 3.2,
      precipitateSubstance: 'PbI2',
      precipitateColor: '#facc15',
      precipitateMorphology: 'POWDER'
    });

    store.setVesselState(receiverId, {
      volume_ml: 0,
      substances: []
    });

    // Pour 40mL from source into receiver
    await store.pourVessel(sourceId, receiverId, 40);

    const receiver = useAppStore.getState().vessels[receiverId];
    expect(receiver.hasPrecipitate).toBe(false);
    expect(receiver.contents.some(x => x.formula === 'PbI2')).toBe(false);
    expect(receiver.mass_g).toBeCloseTo(40, 8);

    const source = useAppStore.getState().vessels[sourceId];
    expect(source.hasPrecipitate).toBe(true);
    expect(source.precipitateAmount_g).toBe(3.2);
    expect(source.contents.find(x => x.formula === 'PbI2')?.mass_g).toBe(3.2);
    expect(source.mass_g).toBeCloseTo(3.2, 8);

    // Clean up
    store.removeVessel(sourceId);
    store.removeVessel(receiverId);
  });

  it('allocates the first free physical slot in test tube rack when non-sequential tubes are inserted and removed', () => {
    const store = useAppStore.getState();
    store.addVessel('test_tube_rack', 'Slot Rack');
    const rackId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('test_tube', 'Tube 1');
    const tube1 = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];
    store.addVessel('test_tube', 'Tube 2');
    const tube2 = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];
    store.addVessel('test_tube', 'Tube 3');
    const tube3 = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(rackId, { position: [0, 0, 0] });

    // Place tube 1 (slot 0) and tube 2 (slot 1)
    store.placeTestTubeInRack(rackId, tube1);
    store.placeTestTubeInRack(rackId, tube2);

    expect(useAppStore.getState().vessels[tube1].position[0]).toBeCloseTo(-0.65, 2);
    expect(useAppStore.getState().vessels[tube2].position[0]).toBeCloseTo(-0.22, 2);

    // Remove tube 1 (frees slot 0, slot 1 remains occupied by tube 2)
    store.removeTestTubeFromRack(rackId, tube1);

    // Now insert tube 3: it must get the freed slot 0 (-0.65), NOT slot 1 (-0.22)!
    store.placeTestTubeInRack(rackId, tube3);
    expect(useAppStore.getState().vessels[tube3].position[0]).toBeCloseTo(-0.65, 2);

    // Clean up
    store.removeVessel(rackId);
    store.removeVessel(tube1);
    store.removeVessel(tube2);
    store.removeVessel(tube3);
  });

  it('accurately resolves chemical morphology fallbacks without classifying general sodium/potassium salts as pellets', () => {
    // General sodium/potassium compounds must NOT be PELLET
    expect(getSolidMorphology('NaHCO3')).toBe('POWDER');
    expect(getSolidMorphology('KMnO4')).toBe('PRISMATIC_CRYSTAL');
    expect(getSolidMorphology('NaCl')).toBe('CUBIC_CRYSTAL');
    expect(getSolidMorphology('K2Cr2O7')).toBe('TABULAR_CRYSTAL');

    // Hydroxides and pure alkali metals are PELLET
    expect(getSolidMorphology('NaOH')).toBe('PELLET');
    expect(getSolidMorphology('KOH')).toBe('PELLET');
    expect(getSolidMorphology('Na')).toBe('PELLET');
    expect(getSolidMorphology('K')).toBe('PELLET');

    // Hydrate crystals
    expect(getSolidMorphology('CoCl2.6H2O')).toBe('HYDRATE_CRYSTAL');
    expect(getSolidMorphology('NiSO4.6H2O')).toBe('HYDRATE_CRYSTAL');
    expect(getSolidMorphology('FeSO4.7H2O')).toBe('HYDRATE_CRYSTAL');
    expect(getSolidMorphology('CuSO4.5H2O')).toBe('HYDRATE_CRYSTAL');
  });
});

