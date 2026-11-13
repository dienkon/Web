import { describe, expect, it } from 'vitest';
import { LiquidAppearanceField, type LiquidAppearanceInput } from '../src/simulation/effects/LiquidAppearanceField';
import { GasPlumeSystem, type GasPlumeInput } from '../src/simulation/effects/GasPlumeSystem';
import { GasCloudRepository } from '../src/simulation/effects/GasCloudRepository';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { retainedGasVisuals } from '../src/vfx/gasVisualState';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { PRNG } from '../src/core/rng';

const liquid: LiquidAppearanceInput = { color: '#ffffff', turbidity: 0, radius: 1, baseY: -1, fillY: 0 };
const dose = { ...liquid, color: '#2255cc', contact: [-0.55, 0, 0] };
function advance(field: LiquidAppearanceField, seconds: number, input: LiquidAppearanceInput, hz = 60) {
  for (let i = 0; i < Math.round(seconds * hz); i++) field.advance(1 / hz, input);
}
describe('contact-local liquid appearance transport', () => {
  it('colors the contact region first while the distant side retains its previous appearance', () => {
    const f = new LiquidAppearanceField(); f.advance(0, liquid); advance(f, 0.2, dose);
    expect(f.sample(0.22, 0.95, 0, 0)).toBeGreaterThan(0.8);
    expect(f.sample(0.22, 0.95, 0.5, 0)).toBeLessThan(0.25);
    expect(f.sample(0.85, 0.95, 0.5, 0)).toBeGreaterThan(0.9);
    expect(f.sample(0.22, 0.15, 0.5, 0)).toBeGreaterThan(f.sample(0.22, 0.95, 0.5, 0));
  });
  it('decolorizes locally rather than covering a colored solution with another opaque color', () => {
    const f = new LiquidAppearanceField(); f.advance(0, { ...liquid, color: '#6b1598' });
    advance(f, 0.2, { ...dose, color: '#ffffff' });
    expect(f.sample(0.22, 0.95, 0.5, 1)).toBeGreaterThan(f.sample(0.85, 0.95, 0.5, 1) + 0.5);
    advance(f, 14, { ...liquid, agitation: 0.8 });
    expect(f.sample(0.85, 0.15, 0.5, 1)).toBeGreaterThan(0.99);
  });
  it('grows suspended-product opacity at contact and freezes both pixels and revision when paused', () => {
    const f = new LiquidAppearanceField(); f.advance(0, liquid); advance(f, 0.2, { ...dose, turbidity: 0.8 });
    expect(f.sample(0.22, 0.95, 0.5, 3)).toBeGreaterThan(0.5);
    expect(f.sample(0.85, 0.95, 0.5, 3)).toBeLessThan(0.01);
    const pixels = [...f.pixels], revision = f.revision; f.advance(0, dose);
    expect([...f.pixels]).toEqual(pixels); expect(f.revision).toBe(revision);
  });
  it('shows a transient colored feed jet when the reaction endpoint remains colorless', () => {
    const f = new LiquidAppearanceField(); f.advance(0, liquid);
    advance(f, 0.2, { ...dose, color: '#ffffff', contactColor: '#78350f', reactionRate_s1: 7 });
    expect(f.sample(0.22, 0.98, 0.5, 1)).toBeLessThan(0.65);
    expect(f.sample(0.85, 0.98, 0.5, 1)).toBeGreaterThan(0.95);
    expect(f.sample(0.22, 0.4, 0.5, 1)).toBeGreaterThan(0.95);
    advance(f, 14, { ...liquid, agitation: 0.8 });
    expect(f.sample(0.22, 0.98, 0.5, 1)).toBeGreaterThan(0.99);
  });
  it('uses the same fixed-time solution at 30, 60 and 120 Hz and avoids uploading uniform idle water', () => {
    const run = (hz: number) => { const f = new LiquidAppearanceField(); f.advance(0, liquid); advance(f, 2, dose, hz); return f; };
    expect([...run(30).pixels]).toEqual([...run(120).pixels]); expect([...run(60).pixels]).toEqual([...run(120).pixels]);
    const idle = new LiquidAppearanceField(); idle.advance(0, liquid); const revision = idle.revision;
    advance(idle, 5, liquid); expect(idle.revision).toBe(revision);
  });
});

const profile = getVesselProfile('beaker', 100);
const gas: GasPlumeInput = { rate: 30, mol_s: 0.001, temperature_c: 25, ambient_c: 25, molarMass: 28.96,
  mouthY: profile.baseY + profile.H, mouthRadius: profile.mouthR, floorY: -2, wind_m_s: 0,
  chamber: { profile, bottomY: profile.baseY, sourcePoint: [0.3, -0.3, 0], sealed: true } };
describe('smoke starts in the vessel headspace', () => {
  it('keeps every packet inside an unvented sealed vessel and grows it continuously', () => {
    const s = new GasPlumeSystem(64, new PRNG(2)); s.update(0.4, gas);
    expect(s.particles.length).toBeGreaterThan(0); expect(s.particles.every(p => p.y < gas.mouthY)).toBe(true);
    const first = s.particles[0], size = first.size;
    s.update(1, { ...gas, rate: 0, mol_s: 0 });
    expect(first.size).toBeGreaterThan(size);
    expect(s.particles.every(p => !p.released && p.y + p.size <= gas.mouthY + 1e-9
      && Math.hypot(p.x, p.z) + p.size <= profile.r(p.y) + 1e-9)).toBe(true);
    const paused = JSON.stringify(s.particles); s.update(0, gas); expect(JSON.stringify(s.particles)).toBe(paused);
    // Removing the lid cannot teleport old packets directly into the room.
    s.update(0.1, { ...gas, rate: 0, mol_s: 0, chamber: { ...gas.chamber!, sealed: false } });
    expect(s.particles.every(p => !p.released && p.y < gas.mouthY)).toBe(true);
  });
  it('allows a finite delayed escape only through the explicit outlet, without replaying its source', () => {
    const repo = new GasCloudRepository(), input = { ...gas, chamber: { ...gas.chamber!, vent: [0, 1.42, -0.35] as const } };
    const source = { vesselId: 'v', revision: 1, receipt: {}, seconds: 0.2, species: 'NH4Cl', input };
    repo.advance(0.2, [source]); const cloud = [...repo.clouds.values()][0];
    expect(cloud.system.particles.every(p => !p.released && p.y < gas.mouthY)).toBe(true);
    for (let i = 0; i < 200; i++) repo.advance(1 / 60, [source]);
    expect(cloud.acceptedExhaust_mol).toBeCloseTo(0.0002, 12);
    expect(cloud.system.particles.some(p => p.released)).toBe(true);
    for (const p of cloud.system.particles.filter(p => !p.released && p.y > gas.mouthY)) {
      expect(p.x).toBeCloseTo(0, 9); expect(p.z).toBeCloseTo(-0.35, 9);
    }
  });
  it('shows retained colored gas but never invents smoke for colorless CO2', () => {
    const e = new AutoExperiment('nh3_hcl', false);
    expect(retainedGasVisuals({ ...e.sample, gasFlux: { dt_s: 1, generated_mol_s: { NO2: 0.001, CO2: 0.001 }, escaped_mol_s: {} } }).map(g => g.formula)).toEqual(['NO2']);
  });
  it('moves retained smoke with the vessel after production stops without creating more material', () => {
    const repo = new GasCloudRepository(), source = { vesselId: 'v', revision: 1, receipt: {}, seconds: 0.2, species: 'NH4Cl', input: gas };
    repo.advance(0.2, [source]); const cloud = [...repo.clouds.values()][0], n = cloud.system.particles.length;
    repo.advance(0.1, [{ ...source, input: { ...gas, rate: 0, mol_s: 0, sourceToWorld: ([x, y, z]) => [x + 5, y, z] } }]);
    expect(cloud.acceptedExhaust_mol).toBeCloseTo(0.0002, 12);
    expect(cloud.system.particles.length).toBe(n);
    expect(cloud.system.particles.every(p => p.x > 4)).toBe(true);
  });
  it('creates the NH3/HCl white product inside the capped automatic receiver before any outside plume', () => {
    const e = new AutoExperiment('nh3_hcl');
    // A finite source receipt can precede the first visible aerosol particle.
    for (let i = 0; i < 4000 && ![...e.clouds.clouds.values()].some(c => c.system.particles.length); i++) e.tick(1 / 60);
    expect(e.error).toBeNull();
    for (let i = 0; i < 24; i++) e.tick(1 / 60);
    const packets = [...e.clouds.clouds.values()].flatMap(c => c.system.particles);
    expect(packets.length).toBeGreaterThan(0);
    expect(packets.every(p => !!p.chamber && !p.released && p.y < 2.04)).toBe(true);
    expect(e.sample.contents.some(c => c.formula === 'NH4Cl' && c.mass_g > 0)).toBe(true);
    const product_g = e.sample.contents.filter(c => c.formula === 'NH4Cl').reduce((sum, c) => sum + c.mass_g, 0);
    expect(e.aerosolSuspended_g + e.aerosolDeposited_g).toBeCloseTo(product_g, 9);
    expect(e.aerosolDeposited_g).toBeLessThan(product_g * 0.1);
  });
});
