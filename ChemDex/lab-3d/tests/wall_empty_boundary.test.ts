import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { transportWallBeads } from '../src/engine/wallDropletTransport';

type Input = Parameters<typeof transportWallBeads>[0];
const { fixtures } = JSON.parse(readFileSync(new URL('./fixtures/wall_empty_boundary.json', import.meta.url), 'utf8')) as {
  fixtures: { name: string; input: Input; expected: unknown }[];
};
// Captured from the unoptimized model at 1d2d935a. Compare complete diagnostics,
// enthalpy receipts and seeded site coordinates, not just aggregate zero mass.
const serializable = (value: unknown) => JSON.parse(JSON.stringify(value));

describe('empty exterior wall transport', () => {
  it.each(fixtures)('$name preserves the previous complete transport result', ({ input, expected }) => {
    expect(serializable(transportWallBeads(input))).toEqual(expected);
  });

  it('still nucleates finite water when a previously dry wall cools below dew point', () => {
    const warm = fixtures.find(fixture => fixture.name === 'dry-preserved-layout')!.input;
    const dry = transportWallBeads(warm);
    const cold = fixtures.find(fixture => fixture.name === 'cold-nucleation')!.input;
    const nucleated = transportWallBeads({ ...cold, previous: dry.beads });
    expect(nucleated.condensed_g).toBeGreaterThan(0);
    expect(nucleated.retained_g + nucleated.drained_g + nucleated.evaporated_g).toBeCloseTo(nucleated.condensed_g, 15);
    expect(nucleated.condensationReceivedEnergy_J).toBeCloseTo(nucleated.condensed_g
      * cold.condensationBoundary!.vaporSpecificEnthalpy_J_g, 14);
  });
});
