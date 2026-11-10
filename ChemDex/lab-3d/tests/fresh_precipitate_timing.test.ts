import { describe, expect, it } from 'vitest';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { sphereSettlingSpeed } from '../src/science/particleSettling';
import { getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { suspensionCloudiness } from '../src/science/suspensionCloudiness';

const params = { temp_c: 25, density_g_ml: 1, viscosity_mPa_s: 1, volume_ml: 50,
  radius: 0.8, liquidBottomY: 0, surfaceY: 1, precipitateAmount_g: 0.1, agitation: 0, heatPower_W: 0 };
describe('Fresh precipitates form suspension before a sediment bed', () => {
  it.each(['BaSO4', 'AgCl', 'AgBr', 'AgI', 'Cu(OH)2', 'Fe(OH)3', 'Al(OH)3', 'Zn(OH)2', 'CaCO3', 'PbI2'])('%s does not create a floor-wide bed in the first five seconds', formula => {
    const s = new PrecipitationSystem(80, formula, new PRNG(9));
    for (let i = 0; i < 100; i++) s.update(0.05, { ...params, substance: formula });
    expect(s.sedimentBed.amount_g).toBeLessThan(0.001);
    expect(s.cloudiness).toBeGreaterThan(0);
    expect(s.representedMass_g).toBeCloseTo(0.1, 12);
  });
  it('enlarging representative glyphs does not advance physical bed contact', () => {
    const a = new PrecipitationSystem(40, 'BaSO4', new PRNG(6));
    const b = new PrecipitationSystem(40, 'BaSO4', new PRNG(6));
    a.profile = { ...a.profile, displayRadius_scene: 0.001 };
    b.profile = { ...b.profile, displayRadius_scene: 0.5 };
    for (let i = 0; i < 40; i++) { a.update(0.05, params); b.update(0.05, params); }
    expect(a.sedimentBed.amount_g).toBe(b.sedimentBed.amount_g);
    expect(a.particles.map(p => [p.x, p.y, p.z, p.physicalRadius_m])).toEqual(b.particles.map(p => [p.x, p.y, p.z, p.physicalRadius_m]));
  });
  it('retains a separate fast-settling recrystallized PbI2 route', () => {
    const fine = getPrecipitateProfile('PbI2'), plates = getPrecipitateProfile('PbI2', 'CRYSTAL_PLATE');
    const speed = (p: typeof fine) => sphereSettlingSpeed(p.baseParticleRadius_mm * 1e-3, p.particleDensity_g_cm3 * 1000, 1000, 0.001);
    expect(speed(plates)).toBeGreaterThan(speed(fine) * 100);
  });
  it('dilution reduces cloudiness for the same suspended mass', () => {
    expect(suspensionCloudiness(0.01, 100, 0.9)).toBeLessThan(suspensionCloudiness(0.01, 10, 0.9));
  });
});
