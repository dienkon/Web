import type { TitrationPoint } from '../types/chemistry';

const PLOT_LIMIT = 800;

/** Keep the start, end and pH extrema of each bucket in recording order.
 * Insert a missing reading anywhere decimation would otherwise bridge a gap. */
export function titrationPlot(points: readonly TitrationPoint[]): readonly TitrationPoint[] {
  if (points.length <= PLOT_LIMIT) return points;

  const anchors: number[] = [];
  const bucketSize = Math.ceil(points.length / (PLOT_LIMIT / 8));
  for (let start = 0; start < points.length; start += bucketSize) {
    const end = Math.min(points.length, start + bucketSize);
    let low = -1, high = -1;
    for (let i = start; i < end; i++) {
      const ph = points[i].ph;
      if (ph === null) continue;
      if (low === -1 || ph < points[low].ph!) low = i;
      if (high === -1 || ph > points[high].ph!) high = i;
    }
    const bucket = [start, end - 1];
    if (low !== -1) bucket.push(low, high);
    anchors.push(...[...new Set(bucket)].sort((a, b) => a - b));
  }

  const plot = [points[anchors[0]]];
  for (let i = 1; i < anchors.length; i++) {
    const previous = anchors[i - 1], next = anchors[i];
    if (points[previous].ph !== null && points[next].ph !== null) {
      for (let j = previous + 1; j < next; j++) {
        if (points[j].ph !== null) continue;
        plot.push(points[j]);
        break;
      }
    }
    plot.push(points[next]);
  }
  return plot;
}

function csvCell(value: string | number | null | undefined): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value !== 'string' || !value) return '';
  // Treat text from old/imported saves as data in spreadsheet readers.
  const text = /^[\s\uFEFF]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Export source rows. Old saves omit metadata that was never recorded. */
export function titrationCSV(points: readonly TitrationPoint[]): string {
  const header = 'vessel_id,cumulative_dispensed_ml,drop_dispensed_ml,pH,sample_temperature_c,pH_basis,pH_reference_temperature_c,reagent,concentration_mol_l,outcome,recorded_at_utc';
  const rows = points.map(point => {
    const recordedAt = new Date(point.timestamp);
    return [point.vesselId, point.volumeAdded_ml, point.dispensedVolume_ml, point.ph, point.temperature_c,
      point.phBasis, point.phReferenceTemperature_c, point.reagentFormula, point.concentration_M, point.outcome,
      Number.isFinite(recordedAt.getTime()) ? recordedAt.toISOString() : '',
    ].map(csvCell).join(',');
  });
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}
