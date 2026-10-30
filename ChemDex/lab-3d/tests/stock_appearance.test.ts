import { describe, expect, it } from 'vitest';
import { CHEMICAL_DATABASE, getSolidMorphology, findChemical } from '../src/data/chemicals';
import { COLORLESS_STOCKS, stockPhase, stockSolidMaterial } from '../src/science/stockAppearance';
import { createStockSolidGeometry, geometryVolume, stockSolidChunkCount } from '../src/components/three/stockSolidGeometry';
import { createPowderPileGeometry } from '../src/components/three/powderPileGeometry';
import { liquidOpacity } from '../src/science/liquidOptics';
import { stockLiquidAliquot } from '../src/engine/stockAddition';
import { PRECIPITATES_DATABASE } from '../src/data/precipitates';
import { getPrecipitateProfile, PRECIPITATE_PROFILES } from '../src/simulation/core/SimulationConfig';
import { createPrecipitateGeometry } from '../src/simulation/render/precipitateGeometry';
import { precipitatePackingFraction } from '../src/science/precipitatePacking';
import { cylinderSedimentThickness } from '../src/simulation/effects/sedimentGeometry';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { identifySpecies, matchesReagent } from '../src/science/speciesIdentity';
import { readComposition } from '../src/science/balance';
import { computeMolarMass, LedgerEngine } from '../src/engine/ledger';
import type { VesselState } from '../src/types/chemistry';

describe('Individual stock state and appearance coverage', () => {
  it('has one unambiguous definition per full stock identity', () => {
    const identities = CHEMICAL_DATABASE.map(c => c.formula.toLowerCase());
    expect(new Set(identities).size).toBe(identities.length);
  });
  it.each(CHEMICAL_DATABASE.filter(c => c.type === 'liquid'))('dispenses $formula in its declared stock phase with finite solvent', c => {
    const dose = stockLiquidAliquot(c, c.formula, 1, 25);
    expect(dose.contents[0].phase).toBe(stockPhase(c));
    expect(dose.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(c.density!, 10);
    expect(dose.contents.every(row => row.mass_g >= 0 && Number.isFinite(row.moles))).toBe(true);
    if (COLORLESS_STOCKS.has(c.formula)) expect(dose.color).toBe('#ffffff');
  });
  it.each(CHEMICAL_DATABASE.filter(c => c.type === 'solid'))('builds a closed material-volume model for $formula', c => {
    expect(stockPhase(c)).toBe('s');
    expect(c.density).toBeGreaterThan(0);
    const morphology = getSolidMorphology(c.formula);
    const geometry = createStockSolidGeometry(morphology, c.formula);
    expect(geometryVolume(geometry)).toBeCloseTo(1, 5);
    expect(geometry.boundingSphere!.radius).toBeGreaterThan(0);
    const material = stockSolidMaterial(c, morphology);
    if (!['Fe', 'Cu', 'Zn', 'Mg', 'Al', 'Na', 'K'].some(m => c.formula === m || c.formula.startsWith(m + ' ('))
      && morphology !== 'LUSTROUS_PLATES') expect(material.metalness).toBe(0);
    geometry.dispose();
  });
  it('keeps a nail, foil, ribbon and filings distinct, and preserves hydrate stoichiometry', () => {
    expect(stockSolidChunkCount('NAIL')).toBe(1);
    expect(stockSolidChunkCount('FILINGS')).toBeGreaterThan(stockSolidChunkCount('RIBBON'));
    expect(getSolidMorphology('Fe (nail)')).toBe('NAIL');
    expect(getSolidMorphology('Fe (filings)')).toBe('FILINGS');
    expect(getSolidMorphology('Al (foil)')).toBe('FOIL');
    expect(getSolidMorphology('Mg (ribbon)')).toBe('RIBBON');
    expect(findChemical('CuSO4·5H2O').molarMass).toBe(249.677);
    expect(findChemical('CuSO4').type).toBe('liquid');
    expect(findChemical('CuSO4 (s)').color).toBe('#f5f3ed');
    expect(getSolidMorphology('CuSO4')).toBe('POWDER');
    expect(findChemical('NaOH').type).toBe('liquid');
    expect(findChemical('NaOH (solid)').type).toBe('solid');
    expect(findChemical('I2').color).toBe('#302e36');
  });
  it('uses the molecular identity of stock forms in reactions without erasing hydrate water', () => {
    for (const [stock, molecular] of [['Fe (nail)', 'Fe'], ['Mg (powder)', 'Mg'], ['Al (foil)', 'Al'], ['C (Carbon)', 'C']]) {
      expect(identifySpecies(stock).formula).toBe(molecular);
      expect(readComposition(stock)).toEqual(readComposition(molecular));
      expect(computeMolarMass(stock)).toBe(computeMolarMass(molecular));
      expect(matchesReagent(stock, molecular)).toBe(true);
    }
    expect(identifySpecies('CuSO4·5H2O').formula).toBe('CuSO4·5H2O');
    expect(matchesReagent('NaOH (solid)', 'NaOH(aq)')).toBe(false);
    expect(findChemical('NaOH(s)').type).toBe('solid');
    expect(findChemical('Fe(nail)').solidMorphology).toBe('NAIL');
  });
  it('keeps explicit stock phases when constructing the conservation ledger', () => {
    const ledger = LedgerEngine.createLedgerFromVessel({ contents: [
      { formula: 'Fe (nail)', phase: 's', mass_g: 1, moles: 1 / 55.845 },
      { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 },
      { formula: 'HCl (dil)', phase: 'aq', mass_g: 0.3646, moles: 0.01 },
    ] } as VesselState);
    expect(ledger.inventory['Fe (nail)'].phase).toBe('s');
    expect(ledger.inventory.H2O.phase).toBe('l');
    expect(ledger.inventory['HCl (dil)'].phase).toBe('aq');
  });
  it.each(['beaker', 'test_tube', 'flask'])('powder volume in %s follows the dose, including the rounded floor', type => {
    const geometry = createPowderPileGeometry(type, 0.02, 0.25);
    const smaller = createPowderPileGeometry(type, 0.002, 0.25);
    // 48-sided revolution differs from the analytical circular integral by <1%.
    expect(geometryVolume(geometry) / 0.02).toBeCloseTo(1, 2);
    expect(geometryVolume(smaller) / 0.002).toBeCloseTo(1, 2);
    expect(geometryVolume(geometry) / geometryVolume(smaller)).toBeCloseTo(10, 4);
    geometry.dispose(); smaller.dispose();
  });
});

describe('Species-specific precipitate optics and packing', () => {
  it.each(Object.values(PRECIPITATES_DATABASE))('has a named runtime profile for $formula, without a surrogate chemical', p => {
    expect(getPrecipitateProfile(p.formula).modelBasis).not.toBe('generic_fallback');
    expect(getPrecipitateProfile(p.formula).id).toBe(p.formula);
  });
  it.each(Object.values(PRECIPITATE_PROFILES))('contains the $id glyph inside its transport envelope and conserves packed-bed mass', p => {
    const geometry = createPrecipitateGeometry(p);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) expect(Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i))).toBeLessThanOrEqual(1);
    const packing = precipitatePackingFraction(p), radius = 0.4, mass = 0.02;
    const thickness = cylinderSedimentThickness(radius, mass, p.particleDensity_g_cm3, packing);
    const cmPerSceneUnit = METERS_PER_SCENE_UNIT * 100;
    expect(thickness * Math.PI * radius ** 2 * cmPerSceneUnit ** 3 * packing * p.particleDensity_g_cm3).toBeCloseTo(mass, 12);
    geometry.dispose();
  });
  it('keeps cold lead iodide powder separate from plate crystallization', () => {
    expect(getPrecipitateProfile('PbI2').morphology).toBe('fine_powder');
    expect(getPrecipitateProfile('PbI2', 'CRYSTAL_PLATE').morphology).toBe('crystalline');
    expect(precipitatePackingFraction(getPrecipitateProfile('Fe(OH)3'))).toBeLessThan(precipitatePackingFraction(getPrecipitateProfile('BaSO4')));
  });
  it('reveals submerged material through clear liquid and raises opacity with suspended material', () => {
    expect(liquidOpacity('#ffffff', 0)).toBeLessThan(0.2);
    expect(liquidOpacity('#ffffff', 1)).toBeCloseTo(0.96);
    expect(liquidOpacity('#2563eb', 0)).toBeGreaterThan(liquidOpacity('#ffffff', 0));
    expect(liquidOpacity('#ffffff', 0, true)).toBeLessThan(0.25);
  });
});
