import { expect, it } from 'vitest';
import { bulkAqueousConcentrations } from '../src/science/liquidLayers';

it('uses current aqueous phase volume and sums the bulk solution inventory', () => {
  const result = bulkAqueousConcentrations({ volume_ml: 30, immiscibleOrganicVolume_ml: 10, contents: [
    { formula: 'HCl (dil)', moles: .0015, mass_g: .05469, phase: 'aq', concentration_M: 1 },
    { formula: 'HCl (dil)', moles: .0005, mass_g: .01823, state: 'aq' },
    { formula: 'HCl (dil)', moles: .2, mass_g: 7.292, phase: 'aq', location: 'foam' },
    { formula: 'I2', moles: .005, mass_g: 1.269, phase: 'aq', liquidLayer: 'organic' },
    { formula: 'AgCl', moles: .003, mass_g: .43, phase: 's', concentration_M: 4 },
    { formula: 'H2O', moles: 1, mass_g: 18, phase: 'l' },
  ] });
  expect([...result.keys()]).toEqual(['HCl (dil)']);
  expect(result.get('HCl (dil)')).toBeCloseTo(.1, 12);
  expect(bulkAqueousConcentrations({ volume_ml: 0, contents: [] }).size).toBe(0);
});
