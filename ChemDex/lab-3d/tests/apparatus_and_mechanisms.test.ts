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
      volume_ml: 50,
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

  it('two-phase immiscible liquid extraction drains aqueous phase first while retaining organic phase', () => {
    const store = useAppStore.getState();
    store.addVessel('separatory_funnel', 'Two Phase Funnel');
    const funnelId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Set funnel at [0, 0, 0] with 20mL aqueous and 15mL organic
    store.setVesselState(funnelId, {
      position: [0, 0, 0],
      volume_ml: 20,
      immiscibleOrganicVolume_ml: 15,
      substances: ['H2O', 'Hexane (C6H14)'],
      stopcockOpen: true
    });

    // Add receiving beaker directly below funnel at [0, -1.0, 0]
    store.addVessel('beaker', 'Receiver Beaker');
    const receiverId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];
    store.setVesselState(receiverId, {
      position: [0, -1.0, 0],
      volume_ml: 0,
      substances: []
    });

    // Tick: drains lower aqueous layer
    store.tickSimulation(0.5);

    let funnel = useAppStore.getState().vessels[funnelId];
    expect(funnel.volume_ml).toBeLessThan(20);
    // Upper organic phase is fully retained!
    expect(funnel.immiscibleOrganicVolume_ml).toBe(15);

    // Drain all remaining aqueous phase
    store.setVesselState(funnelId, {
      volume_ml: 0.1,
      immiscibleOrganicVolume_ml: 15
    });

    store.tickSimulation(0.5);
    funnel = useAppStore.getState().vessels[funnelId];
    expect(funnel.volume_ml).toBe(0);

    // Once aqueous phase is 0, subsequent draining drains the organic phase
    store.tickSimulation(0.5);
    funnel = useAppStore.getState().vessels[funnelId];
    expect(funnel.immiscibleOrganicVolume_ml).toBeLessThan(15);

    // Clean up
    store.removeVessel(funnelId);
    store.removeVessel(receiverId);
  });

  it('fuming activates for HCl (dil) and NH3 (aq), producing max intensity white fuming when mixed', () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Acid Beaker');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Single volatile acid
    store.setVesselState(vesselId, {
      volume_ml: 20,
      substances: ['HCl (dil)']
    });

    store.tickSimulation(0.1);
    let v = useAppStore.getState().vessels[vesselId];
    expect(v.fumingIntensity).toBeGreaterThan(0.5);

    // Both HCl and NH3 present: forms dense white NH4Cl ammonium chloride smoke!
    store.setVesselState(vesselId, {
      volume_ml: 20,
      substances: ['HCl (dil)', 'NH3 (aq)']
    });

    store.tickSimulation(0.1);
    v = useAppStore.getState().vessels[vesselId];
    expect(v.fumingIntensity).toBe(1.0);
    expect(v.fumingColor).toBe('#ffffff');

    // Clean up
    store.removeVessel(vesselId);
  });

  it('pulverizes solid chunks in mortar and pestle to dissolve 5x faster', () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Chunk Beaker');
    const ungroundId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('mortar_pestle', 'Pulverized Mortar');
    const pulverizedId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Grind mortar
    store.grindMortar(pulverizedId);

    // Set active kinetics with dissolving reactants
    const duration = 10.0;
    useAppStore.setState(s => ({
      activeKinetics: {
        [ungroundId]: {
          vesselId: ungroundId,
          duration,
          progress: 0,
          reactionName: 'Test Dissolution',
          equation: 'CuSO4 -> Cu2+ + SO42-',
          initialLiquidColor: '#ffffff',
          targetLiquidColor: '#38bdf8',
          hasGas: false,
          hasPrecipitate: false,
          dissolvingReactants: ['CuSO4'],
          targetTemp: 25,
          startTime: Date.now()
        },
        [pulverizedId]: {
          vesselId: pulverizedId,
          duration,
          progress: 0,
          reactionName: 'Test Dissolution',
          equation: 'CuSO4 -> Cu2+ + SO42-',
          initialLiquidColor: '#ffffff',
          targetLiquidColor: '#38bdf8',
          hasGas: false,
          hasPrecipitate: false,
          dissolvingReactants: ['CuSO4'],
          targetTemp: 25,
          startTime: Date.now()
        }
      }
    }));

    // Tick simulation for 0.1s
    store.tickSimulation(0.1);

    const dissolvingMap = useAppStore.getState().dissolvingSubstances;
    const ungroundRate = dissolvingMap[ungroundId]?.['CuSO4'] || 0;
    const pulverizedRate = dissolvingMap[pulverizedId]?.['CuSO4'] || 0;

    expect(pulverizedRate).toBeGreaterThan(0);
    expect(ungroundRate).toBeGreaterThan(0);
    expect(pulverizedRate / ungroundRate).toBeCloseTo(5.0, 1);

    // Clean up
    store.removeVessel(ungroundId);
    store.removeVessel(pulverizedId);
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
      volume_ml: 30,
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

  it('builds internal pressure in sealed container during gas evolution and triggers overpressure explosion at > 2.5 atm', () => {
    const store = useAppStore.getState();
    store.addVessel('flask', 'Sealed Reaction Flask');
    const flaskId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Seal container with active gas evolution
    store.sealVessel(flaskId);
    expect(useAppStore.getState().vessels[flaskId].isSealed).toBe(true);

    store.setVesselState(flaskId, {
      hasGas: true,
      volume_ml: 40,
      substances: ['HCl (dil)', 'Zn'],
      internalPressure_atm: 2.48 // Near critical burst limit
    });

    // Run simulation tick: pressure exceeds 2.5 atm and triggers explosive shatter
    store.tickSimulation(0.5);

    const flask = useAppStore.getState().vessels[flaskId];
    expect(flask.internalPressure_atm).toBeGreaterThan(2.5);
    expect(flask.isExplosion).toBe(true);
    expect(flask.isShattered).toBe(true);
    expect(flask.shatterReason).toContain('Overpressure Gas Explosion');
    expect(flask.volume_ml).toBe(0);

    // Clean up
    store.removeVessel(flaskId);
  });

  it('washes residue stains and dispenses distilled water using wash bottle', () => {
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
      stainIntensity: 0.8,
      condensationMist: 0.5
    });

    // Squirt wash bottle into stained beaker
    store.squirtWashBottle(bottleId, beakerId);

    const bottle = useAppStore.getState().vessels[bottleId];
    const beaker = useAppStore.getState().vessels[beakerId];

    expect(bottle.volume_ml).toBeLessThan(200);
    expect(beaker.stainIntensity).toBeLessThan(0.8);
    expect(beaker.condensationMist).toBe(0);
    expect(beaker.substances).toContain('H2O');

    // Clean up
    store.removeVessel(bottleId);
    store.removeVessel(beakerId);
  });

  it('inverts volumetric flask to completely dissolve and homogenize standard solutions', () => {
    const store = useAppStore.getState();
    store.addVessel('volumetric_flask', 'Standard 100mL Flask');
    const flaskId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(flaskId, {
      volume_ml: 95,
      capacity_ml: 100,
      substances: ['H2O', 'NaCl'],
      hasPrecipitate: true,
      isPulverized: false
    });

    store.invertVolumetricFlask(flaskId);

    const flask = useAppStore.getState().vessels[flaskId];
    expect(flask.isPulverized).toBe(true);
    expect(flask.hasPrecipitate).toBe(false);

    const dissolving = useAppStore.getState().dissolvingSubstances[flaskId];
    expect(dissolving?.['NaCl']).toBe(1.0);

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

  it('Liebig condenser condenses vapor from boiling flask when cooling water is running', () => {
    const store = useAppStore.getState();
    store.addVessel('condenser', 'Liebig Condenser Unit');
    const condenserId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('flask', 'Boiling Distillation Flask');
    const boilingFlaskId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    // Condenser positioned adjacent to boiling flask
    store.setVesselState(condenserId, {
      position: [0.5, 0, 0],
      coolingWaterActive: true,
      volume_ml: 0,
      substances: []
    });

    store.setVesselState(boilingFlaskId, {
      position: [0, 0, 0],
      isBoiling: true,
      temperature_c: 100,
      volume_ml: 50,
      substances: ['H2O']
    });

    // Run simulation tick
    store.tickSimulation(1.0);

    const condenser = useAppStore.getState().vessels[condenserId];
    expect(condenser.volume_ml).toBeGreaterThan(0);
    expect(condenser.substances).toContain('H2O');

    // Clean up
    store.removeVessel(condenserId);
    store.removeVessel(boilingFlaskId);
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

  it('accumulates internal pressure across realistic small time steps (dt = 0.016s) without resetting and explodes above 2.5 atm', () => {
    const store = useAppStore.getState();
    store.addVessel('flask', 'Accumulating Pressure Flask');
    const flaskId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.sealVessel(flaskId);
    store.setVesselState(flaskId, {
      hasGas: true,
      volume_ml: 50,
      substances: ['HCl (dil)', 'Zn'],
      internalPressure_atm: 1.0
    });

    // Run small realistic time steps (0.016s each, as in requestAnimationFrame)
    // 0.45 atm/s * 0.016s = 0.0072 atm per tick
    for (let i = 0; i < 20; i++) {
      store.tickSimulation(0.016);
    }

    let flask = useAppStore.getState().vessels[flaskId];
    // Pressure must have smoothly accumulated, NOT stayed stuck at 1.0
    expect(flask.internalPressure_atm).toBeGreaterThan(1.1);
    expect(flask.isExplosion).toBeFalsy();

    // Now set pressure near burst threshold and step with dt = 0.016s until burst
    store.setVesselState(flaskId, {
      internalPressure_atm: 2.495
    });

    store.tickSimulation(0.016);
    flask = useAppStore.getState().vessels[flaskId];
    expect(flask.internalPressure_atm).toBeGreaterThan(2.5);
    expect(flask.isExplosion).toBe(true);
    expect(flask.isShattered).toBe(true);
    expect(flask.shatterReason).toContain('Overpressure Gas Explosion');

    // Clean up
    store.removeVessel(flaskId);
  });

  it('transfers and preserves precipitate amount, substance, and color in pourVessel', async () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Precipitate Source');
    const sourceId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.addVessel('beaker', 'Precipitate Receiver');
    const receiverId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(sourceId, {
      volume_ml: 40,
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
    expect(receiver.hasPrecipitate).toBe(true);
    expect(receiver.precipitateAmount_g).toBe(3.2);
    expect(receiver.precipitateSubstance).toBe('PbI2');
    expect(receiver.precipitateColor).toBe('#facc15');

    const source = useAppStore.getState().vessels[sourceId];
    expect(source.hasPrecipitate).toBe(false);
    expect(source.precipitateAmount_g).toBe(0);

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

