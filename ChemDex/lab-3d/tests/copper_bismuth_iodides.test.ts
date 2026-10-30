import { describe, expect, it } from 'vitest';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { supernatantColor } from '../src/science/supernatantAppearance';

describe('Copper and bismuth iodide suspensions', () => {
  it.each(['CuI', 'BiI3'])('%s conserves finite mass through emission and removal', substance => {
    const s = new PrecipitationSystem(40, substance);
    const p = { substance, precipitateAmount_g: 0.1, volume_ml: 100, temp_c: 25,
      viscosity_mPa_s: 1, density_g_ml: 1, radius: 1, liquidBottomY: 0, surfaceY: 1 };
    for (let i = 0; i < 100; i++) s.update(0.1, p);
    expect(s.profile.id).toBe(substance);
    expect(s.profile.modelBasis).toBeUndefined();
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
    s.update(0.1, { ...p, precipitateAmount_g: 0 });
    expect(s.particles).toHaveLength(0);
    expect(s.representedMass_g).toBe(0);
  });
  it('keeps off-white CuI separate from the iodine-colored liquid', () => {
    const program = ALL_HANDCRAFTED_PROGRAMS.find(p => p.visual.after.precipitate?.substance === 'CuI')!;
    const solid = getPrecipitateProfile('CuI');
    expect(program.visual.after.precipitate!.color).toBe(solid.color);
    expect(program.visual.after.liquidColor).not.toBe(solid.color);
    expect(solid.color).not.toBe(getPrecipitateProfile('AgI').color);
    expect(getPrecipitateProfile('BiI₃(s)').id).toBe('BiI3');
    // The limited colorless-supernatant model must preserve the iodine model.
    expect(supernatantColor([{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90 },
      { formula: 'I2', phase: 'aq', moles: 0.001, mass_g: 0.254 }], 100)).toBeNull();
  });
});
