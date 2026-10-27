import { describe, expect, it } from 'vitest';
import { cylinderSedimentThickness } from '../src/simulation/effects/sedimentGeometry';

describe('Preview sediment uses physical bed volume', () => {
  it('reconstructs mass from density, packing and geometry in the shared 3.5 cm scale', () => {
    const radius = 0.4, mass = 0.01, density = 4.5;
    const thickness = cylinderSedimentThickness(radius, mass, density);
    expect(Math.PI * (radius * 3.5) ** 2 * thickness * 3.5 * density * 0.65).toBeCloseTo(mass, 14);
    expect(cylinderSedimentThickness(radius, mass / 1e6, density)).toBeCloseTo(thickness / 1e6, 16);
    expect(cylinderSedimentThickness(radius * 2, mass, density)).toBeCloseTo(thickness / 4, 14);
  });
  it('has no phantom bed for zero or invalid inventory', () => {
    for (const amount of [0, -1, NaN, Infinity]) expect(cylinderSedimentThickness(1, amount, 4.5)).toBe(0);
    expect(cylinderSedimentThickness(0, 1, 4.5)).toBe(0);
  });
});
