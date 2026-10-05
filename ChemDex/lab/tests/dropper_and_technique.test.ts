import { describe, it, expect } from 'vitest';
import { 
  calculateTatesDropVolume, 
  willDropperDripSpontaneously, 
  calculateBalanceReading 
} from '../src/handling/DropperTools';

describe('Technique Tools: Tate Law Droplet Physics & Balance Realism (K7.1 & K7.5)', () => {
  it('accurately computes drop volumes for water vs ethanol using Tate law', () => {
    // Water drop volume
    const waterDrop = calculateTatesDropVolume({
      surfaceTension_N_m: 0.0728,
      density_g_ml: 1.0,
      tipRadius_mm: 1.6, // standard glass dropper tip radius
      temperature_c: 25
    });

    // Standard water drop is ~0.045 - 0.05 mL (~20-22 drops/mL)
    expect(waterDrop.dropVolume_ml).toBeGreaterThan(0.04);
    expect(waterDrop.dropVolume_ml).toBeLessThan(0.06);
    expect(waterDrop.dropsPerMl).toBeGreaterThanOrEqual(18);
    expect(waterDrop.dropsPerMl).toBeLessThanOrEqual(24);

    // Ethanol (lower surface tension ~0.0223 N/m)
    const ethanolDrop = calculateTatesDropVolume({
      surfaceTension_N_m: 0.0223,
      density_g_ml: 0.789,
      tipRadius_mm: 1.6,
      temperature_c: 25
    });

    // Ethanol produces smaller drops (~0.02 - 0.025 mL) -> more drops per mL (~40-50)
    expect(ethanolDrop.dropVolume_ml).toBeLessThan(waterDrop.dropVolume_ml * 0.6);
    expect(ethanolDrop.dropsPerMl).toBeGreaterThan(waterDrop.dropsPerMl * 1.5);
  });

  it('detects spontaneous dripping when heated or over-tilted past horizontal', () => {
    // Room temp upright: does not drip without bulb press
    expect(willDropperDripSpontaneously(0, 25, false)).toBe(false);

    // Warm body heat / heated pipette (T = 42°C): air expansion forces drip
    expect(willDropperDripSpontaneously(0, 42, false)).toBe(true);

    // Over-tilted past 90 degrees: drips due to gravity
    expect(willDropperDripSpontaneously(Math.PI * 0.6, 25, false)).toBe(true);
  });

  it('simulates balance draft shield drift and warm-vessel convection uplift', () => {
    const trueMass = 25.0000;

    // Closed draft shield at room temp -> exact stable reading
    const stable = calculateBalanceReading(trueMass, true, 25, 42);
    expect(stable.isStabilized).toBe(true);
    expect(stable.displayedMass_g).toBeCloseTo(25.0000, 3);

    // Open draft shield -> drafts create noise drift
    const openDraft = calculateBalanceReading(trueMass, false, 25, 42);
    expect(openDraft.isStabilized).toBe(false);
    expect(Math.abs(openDraft.drift_mg)).toBeGreaterThan(0.1);

    // Hot vessel (65°C) produces convection uplift (apparent mass loss)
    const hotReading = calculateBalanceReading(trueMass, true, 65, 42);
    expect(hotReading.displayedMass_g).toBeLessThan(trueMass);
    expect(hotReading.drift_mg).toBeLessThan(0); // negative due to uplift
  });
});
