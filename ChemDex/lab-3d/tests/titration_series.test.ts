import { describe, expect, it } from 'vitest';
import { titrationCSV, titrationPlot, titrationRuns } from '../src/handling/titrationSeries';
import type { TitrationPoint } from '../src/types/chemistry';

const point = (i: number, ph: number | null): TitrationPoint => ({
  vesselId: 'beaker_1', volumeAdded_ml: i / 20, ph, color: '#fff', temperature_c: 22, timestamp: i,
});

describe('titration recording and display', () => {
  it('uses original points for short curves and caps long plots without bridging missing readings', () => {
    const short = [point(1, 2), point(2, null), point(3, 7)];
    expect(titrationPlot(short)).toBe(short);
    const samples = Array.from({ length: 10_000 }, (_, i) =>
      point(i, i === 12 ? null : i === 22 ? 13 : i === 75 ? 1 : 5)
    );
    const plot = titrationPlot(samples);
    expect(plot.length).toBeLessThanOrEqual(800);
    expect(plot[0]).toBe(samples[0]);
    expect(plot.at(-1)).toBe(samples.at(-1));
    expect(plot).toContain(samples[12]);
    expect(plot).toContain(samples[22]);
    expect(plot).toContain(samples[75]);
    expect(plot.map(row => row.timestamp)).toEqual(plot.map(row => row.timestamp).sort((a, b) => a - b));
    const alternating = samples.map((row, i) => ({ ...row, ph: i % 2 ? 5 : null }));
    const alternatePlot = titrationPlot(alternating);
    for (let i = 1; i < alternatePlot.length; i++) {
      const previous = alternatePlot[i - 1], current = alternatePlot[i];
      if (previous.ph !== null && current.ph !== null) expect(current.timestamp - previous.timestamp).toBe(1);
    }
  });

  it('exports the raw points and leaves unknown pH or legacy metadata blank', () => {
    const old = point(1, null);
    const current: TitrationPoint = { ...point(2, 6.12345), dispensedVolume_ml: .023, outcome: 'received',
      reagentFormula: 'NaOH', concentration_M: .1, phBasis: 'ideal_aqueous_temperature', phReferenceTemperature_c: 22, runId: 'run-5' };
    const csv = titrationCSV([old, current, { ...point(3, 4), vesselId: ' =1+1', reagentFormula: 'A,"B"' }]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/recorded_at_utc,run_id$/);
    expect(lines[1]).toBe('"beaker_1",0.05,,,22,,,,,,"1970-01-01T00:00:00.001Z",');
    expect(lines[2]).toBe('"beaker_1",0.1,0.023,6.12345,22,"ideal_aqueous_temperature",22,"NaOH",0.1,"received","1970-01-01T00:00:00.002Z","run-5"');
    expect(lines[3]).toContain(`"' =1+1"`);
    expect(lines[3]).toContain('"A,""B"""');
  });

  it('groups interleaved records by receiver and run while preserving unassigned legacy readings', () => {
    const legacy = point(1, 7);
    const runA = { ...point(2, 8), runId: 'A' };
    const runB = { ...point(3, 5), runId: 'B' };
    const other = { ...point(4, 3), vesselId: 'beaker_2', runId: 'A' };
    const next = { ...point(5, 6), runId: 'B' };
    expect(titrationRuns([legacy, runA, runB, other, next], 'beaker_1')).toEqual([
      { id: null, points: [legacy] }, { id: 'A', points: [runA] }, { id: 'B', points: [runB, next] },
    ]);
  });
});
