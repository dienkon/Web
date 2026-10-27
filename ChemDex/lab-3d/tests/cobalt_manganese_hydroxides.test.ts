import { describe, expect, it } from 'vitest';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';

describe('Co and Mn hydroxide identities', () => {
  it.each(['Co(OH)2', 'Mn(OH)2'])('%s matches the ledger appearance and preserves finite mass', substance => {
    const p = getPrecipitateProfile(substance);
    const program = ALL_HANDCRAFTED_PROGRAMS.find(x => x.visual.after.precipitate?.substance === substance)!;
    expect(program.visual.after.precipitate!.color).toBe(p.color);
    expect(program.chemistry.species.find(x => x.formula === substance)!.colorHex).toBe(p.color);
    expect(program.visual.timeline.some(x => x.atom === 'beerLambertFade')).toBe(false);
    const system = new PrecipitationSystem(40, substance);
    const params = { substance, precipitateAmount_g: 0.1, volume_ml: 100, temp_c: 25,
      viscosity_mPa_s: 1, density_g_ml: 1, radius: 1, liquidBottomY: 0, surfaceY: 1 };
    for (let i = 0; i < 200; i++) system.update(0.1, params);
    expect(system.profile.modelBasis).toBeUndefined();
    expect(system.representedMass_g).toBeCloseTo(0.1, 12);
    system.update(0.1, { ...params, precipitateAmount_g: 0 });
    expect(system.particles).toHaveLength(0);
    expect(system.representedMass_g).toBe(0);
  });
});
