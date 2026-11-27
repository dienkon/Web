import type { TitrationPoint } from '../types/chemistry';
import { csvCell } from '../utils/csv';

const PLOT_LIMIT = 800;

export interface TitrationRun {
  id: string | null;
  points: TitrationPoint[];
}

export interface TitrationSlope {
  readonly start_ml: number;
  readonly end_ml: number;
  readonly volumeAdded_ml: number;
  readonly slope: number | null;
}

export function titrationRuns(history: readonly TitrationPoint[], vesselId: string | null): TitrationRun[] {
  if (!vesselId) return [];
  const runs = new Map<string | null, TitrationRun>();
  for (const point of history) {
    if (point.vesselId !== vesselId) continue;
    const id = point.runId ?? null;
    const run = runs.get(id);
    if (run) run.points.push(point);
    else runs.set(id, { id, points: [point] });
  }
  return [...runs.values()];
}

/** Keep bucket boundaries, extrema and gaps in recording order. */
function compactPlot<T>(points: readonly T[], ordinate: (point: T) => number | null): readonly T[] {
  if (points.length <= PLOT_LIMIT) return points;

  const anchors: number[] = [];
  const bucketSize = Math.ceil(points.length / (PLOT_LIMIT / 8));
  for (let start = 0; start < points.length; start += bucketSize) {
    const end = Math.min(points.length, start + bucketSize);
    let low = -1, high = -1, min = Infinity, max = -Infinity;
    for (let i = start; i < end; i++) {
      const value = ordinate(points[i]);
      if (value === null) continue;
      if (value < min) { min = value; low = i; }
      if (value > max) { max = value; high = i; }
    }
    const bucket = [start, end - 1];
    if (low !== -1) bucket.push(low, high);
    anchors.push(...[...new Set(bucket)].sort((a, b) => a - b));
  }

  const plot = [points[anchors[0]]];
  for (let i = 1; i < anchors.length; i++) {
    const previous = anchors[i - 1], next = anchors[i];
    if (ordinate(points[previous]) !== null && ordinate(points[next]) !== null) {
      for (let j = previous + 1; j < next; j++) {
        if (ordinate(points[j]) !== null) continue;
        plot.push(points[j]);
        break;
      }
    }
    plot.push(points[next]);
  }
  return plot;
}

export function titrationPlot(points: readonly TitrationPoint[]): readonly TitrationPoint[] {
  return compactPlot(points, point => point.ph);
}

/** The first difference belongs at the midpoint of two consecutive readings. */
export function titrationSlopes(points: readonly TitrationPoint[]): TitrationSlope[] {
  const intervals: TitrationSlope[] = [];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1], next = points[i];
    const start_ml = previous.volumeAdded_ml, end_ml = next.volumeAdded_ml;
    const volumeAdded_ml = start_ml / 2 + end_ml / 2;
    const delta_ml = end_ml - start_ml;
    const comparable = delta_ml > 0 && Number.isFinite(delta_ml)
      && previous.outcome !== 'spilled' && next.outcome !== 'spilled'
      && previous.sampleRevision === next.sampleRevision
      && (previous.phBasis ?? null) === (next.phBasis ?? null);
    const slope = comparable && previous.ph !== null && next.ph !== null
      ? (next.ph - previous.ph) / delta_ml : NaN;
    intervals.push({ start_ml, end_ml, volumeAdded_ml, slope: Number.isFinite(slope) ? slope : null });
  }
  return intervals;
}

export function titrationSlopePlot(intervals: readonly TitrationSlope[]): readonly TitrationSlope[] {
  return compactPlot(intervals, interval => interval.slope);
}

/** A measured peak needs a single strongest band and valid measurements on both sides. */
export function titrationTransition(intervals: readonly TitrationSlope[]) {
  let maximumSlope = 0;
  for (const { slope } of intervals) {
    if (slope !== null && Math.abs(slope) > Math.abs(maximumSlope)) maximumSlope = slope;
  }
  if (maximumSlope === 0) return null;

  const magnitude = Math.abs(maximumSlope);
  const tolerance = magnitude * 1e-9;
  let first = -1, last = -1;
  for (let i = 0; i < intervals.length; i++) {
    const { slope } = intervals[i];
    if (slope === null || magnitude - Math.abs(slope) > tolerance) continue;
    if (Math.sign(slope) !== Math.sign(maximumSlope) || (last !== -1 && i !== last + 1)) return null;
    if (first === -1) first = i;
    last = i;
  }
  if (intervals[first - 1]?.slope == null || intervals[last + 1]?.slope == null) return null;
  return { start_ml: intervals[first].start_ml, end_ml: intervals[last].end_ml, slope: maximumSlope };
}

/** Export source rows. Old saves omit metadata that was never recorded. */
export function titrationCSV(points: readonly TitrationPoint[]): string {
  const header = 'vessel_id,cumulative_dispensed_ml,drop_dispensed_ml,pH,sample_temperature_c,pH_basis,pH_reference_temperature_c,reagent,concentration_mol_l,outcome,recorded_at_utc,run_id';
  const rows = points.map(point => {
    const recordedAt = new Date(point.timestamp);
    return [point.vesselId, point.volumeAdded_ml, point.dispensedVolume_ml, point.ph, point.temperature_c,
      point.phBasis, point.phReferenceTemperature_c, point.reagentFormula, point.concentration_M, point.outcome,
      Number.isFinite(recordedAt.getTime()) ? recordedAt.toISOString() : '', point.runId,
    ].map(csvCell).join(',');
  });
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}
