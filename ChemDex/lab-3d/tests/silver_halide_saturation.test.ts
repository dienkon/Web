import { describe, expect, it } from 'vitest';
import { silverHalideProgramExtent, silverChlorideKsp } from '../src/science/silverChloridePrecipitation';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import type { VesselState } from '../src/types/chemistry';
describe('Separate bromide and iodide saturation limits', () => {
  it.each([['Br', 'agno3_kbr', 1e-8], ['I', 'agno3_ki', 1e-10]] as const)('%s uses its own equilibrium constant and finite amount', (halide, id, trace) => {
    const sample = (n: number) => {
      const contents = [{ formula: 'H2O', phase: 'l', moles: 5, mass_g: 90.075 },
        ...['AgNO3', `K${halide}`].map(formula => ({ formula, phase: 'aq', moles: n, mass_g: n * computeMolarMass(formula) }))];
      return { id, contents, temperature_c: 25, volume_ml: 100, ph: 7,
        mass_g: contents.reduce((s, c) => s + c.mass_g, 0), capacity_ml: 250 } as VesselState;
    };
    const program = getProgramById(id)!, dilute = sample(trace);
    expect(silverHalideProgramExtent(id, dilute.contents, 100, 25)).toBe(0);
    expect(planStudioProgram(program, dilute, 'vi').kinetics).toBeNull();
    expect(applyProgramToLedger(program, dilute, 1).hasPrecipitate).toBeFalsy();
    const initial = sample(1e-4), x = silverHalideProgramExtent(id, initial.contents, 100, 25)!;
    expect(x).toBeGreaterThan(0);
    expect((1e-4 - x) ** 2 / 0.01 / silverChlorideKsp(25, halide)!).toBeCloseTo(1, 6);
    const end = applyProgramToLedger(program, initial, 1);
    expect(end.contents!.find(c => c.formula === `Ag${halide}`)!.moles).toBeCloseTo(x, 12);
    expect(end.contents!.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(initial.mass_g, 9);
  });
});
