import { describe, it, expect } from 'vitest';
import { supernatantColor } from '../src/science/supernatantAppearance';
import type { SubstanceContent } from '../src/types/chemistry';
import type { VesselState } from '../src/types/chemistry';
import { partitionBarite } from '../src/engine/baritePhase';
const item = (formula: string, phase: string, moles = 0.001): SubstanceContent => ({ formula, phase, moles, mass_g: 1 });
const water = item('H2O', 'l', 5);
describe('Dissolved color is independent of precipitate color', () => {
  it('keeps the liquid clear through partial and complete barite dissolution', () => {
    for (const moles of [1e-8, 1e-4]) {
      let v = { contents: [{ ...water, mass_g: 90 },
        { formula: 'BaSO4', phase: 's', moles, mass_g: moles * 233.39 }],
        mass_g: 90 + moles * 233.39, temperature_c: 25, volume_ml: 100,
        capacity_ml: 250, liquidColor: '#ffffff' } as VesselState;
      for (let i = 0; i < 800; i++) v = { ...v, ...partitionBarite(v, 0.1) };
      expect(v.contents.some(c => c.formula === 'BaSO4' && c.phase === 'aq')).toBe(true);
      expect(supernatantColor(v.contents, v.volume_ml)).toBe('#f8fafc');
      if (moles === 1e-8) expect(v.precipitateAmount_g).toBe(0);
    }
  });
  it('ignores material outside the bulk and refuses malformed dissolved amounts', () => {
    const bulk = [water, item('CuSO4', 'aq')];
    expect(supernatantColor([...bulk, { ...item('FeCl3', 'aq'), location: 'foam' }], 100))
      .toBe(supernatantColor(bulk, 100));
    for (const moles of [NaN, Infinity, -0.1]) {
      expect(supernatantColor([water, item('CuSO4', 'aq', moles)], 100)).toBeNull();
    }
    expect(supernatantColor([item('H2O', 'aq')], 100)).toBeNull();
  });
  it.each(['AgCl', 'AgBr', 'AgI', 'PbI2', 'BaSO4'])('%s does not stain the colorless supernatant', formula => {
    expect(supernatantColor([water, item('KNO3', 'aq'), item(formula, 's')], 100)).toBe('#f8fafc');
  });
  it('keeps dissolved copper blue beside white BaSO4 and becomes paler on dilution', () => {
    const contents = [water, item('CuCl2', 'aq'), item('BaSO4', 's')];
    const blue = supernatantColor(contents, 100)!;
    expect(blue).not.toBe('#f8fafc');
    expect(supernatantColor(contents.filter(x => x.phase !== 's'), 100)).toBe(blue);
    expect(parseInt(supernatantColor(contents, 200)!.slice(1, 3), 16)).toBeGreaterThan(parseInt(blue.slice(1, 3), 16));
  });
  it('does not erase indicators, complexes, unknown solutes or unsupported concentrated chloride', () => {
    for (const formula of ['phenolphthalein', 'Cu(NH3)4SO4', 'FeCl3', 'NH3']) {
      expect(supernatantColor([water, item(formula, 'aq')], 100)).toBeNull();
    }
    expect(supernatantColor([water, item('CuCl2', 'aq'), item('HCl', 'aq', 0.1)], 100)).toBeNull();
    expect(supernatantColor([item('CuSO4', 's')], 100)).toBeNull();
  });
});
