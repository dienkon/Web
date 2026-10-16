import type { LessonSession } from './types';
import { auditLessonMass } from './chemistry/inventory';
import { getLessonSpecies } from './catalog/species';

export type LessonSeriesKey = 'progress' | 'temperature' | 'rate' | 'massError' | 'escapedMass';

export interface LessonSample {
  time: number;
  progress: number;
  temperature: number;
  rate: number;
  massError: number;
  escapedMass: number;
}

const SAMPLE_COLUMNS: LessonSeriesKey[] = ['progress', 'temperature', 'rate', 'massError', 'escapedMass'];

export class LessonHistory {
  readonly capacity: number;
  private readonly times: Float64Array;
  private readonly values: Record<LessonSeriesKey, Float64Array>;
  private cursor = 0;
  private count = 0;
  private previousTime = -Infinity;

  constructor(capacity = 600) {
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 10000) {
      throw new Error('Invalid lesson history capacity');
    }
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
    this.values = {
      progress: new Float64Array(capacity),
      temperature: new Float64Array(capacity),
      rate: new Float64Array(capacity),
      massError: new Float64Array(capacity),
      escapedMass: new Float64Array(capacity),
    };
  }

  get length(): number {
    return this.count;
  }

  sample(session: LessonSession): boolean {
    if (session.elapsed_s <= this.previousTime) return false;
    const audit = auditLessonMass(session.inventory, session.initialMass_g, getLessonSpecies);
    this.push({
      time: session.elapsed_s,
      progress: session.physicalProgress * 100,
      temperature: session.environment.temperature_c,
      rate: session.lastRate_mol_s * 1e6,
      massError: audit.error_g,
      escapedMass: audit.escaped_g,
    });
    return true;
  }

  push(sample: LessonSample): void {
    const entries = [sample.time, ...SAMPLE_COLUMNS.map(column => sample[column])];
    if (entries.some(value => !Number.isFinite(value))) return;
    if (sample.time < this.previousTime) return;
    this.times[this.cursor] = sample.time;
    for (const column of SAMPLE_COLUMNS) this.values[column][this.cursor] = sample[column];
    this.cursor = (this.cursor + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
    this.previousTime = sample.time;
  }

  at(index: number): LessonSample | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) return undefined;
    const start = (this.cursor - this.count + this.capacity) % this.capacity;
    const position = (start + index) % this.capacity;
    return {
      time: this.times[position],
      progress: this.values.progress[position],
      temperature: this.values.temperature[position],
      rate: this.values.rate[position],
      massError: this.values.massError[position],
      escapedMass: this.values.escapedMass[position],
    };
  }

  list(): LessonSample[] {
    const samples: LessonSample[] = [];
    for (let index = 0; index < this.count; index++) {
      const sample = this.at(index);
      if (sample) samples.push(sample);
    }
    return samples;
  }

  clear(): void {
    this.cursor = 0;
    this.count = 0;
    this.previousTime = -Infinity;
  }

  csv(): string {
    const rows = ['time_s,conversion_percent,temperature_c,rate_umol_s,mass_error_g,escaped_mass_g'];
    for (const sample of this.list()) {
      rows.push([sample.time, ...SAMPLE_COLUMNS.map(column => sample[column])]
        .map(value => Number(value.toPrecision(10))).join(','));
    }
    return rows.join('\n') + '\n';
  }
}

const histories = new Map<string, LessonHistory>();

export function getLessonHistory(sessionId: string): LessonHistory {
  let history = histories.get(sessionId);
  if (!history) {
    history = new LessonHistory();
    histories.set(sessionId, history);
  }
  return history;
}

export function removeLessonHistory(sessionId: string): void {
  histories.delete(sessionId);
}

export interface LessonPlotPoint {
  x: number;
  y: number;
  time: number;
  value: number;
}

export interface LessonPlot {
  points: LessonPlotPoint[];
  path: string;
  minimum: number;
  maximum: number;
  startTime: number;
  endTime: number;
}

export function buildLessonPlot(
  samples: LessonSample[],
  column: LessonSeriesKey,
  width: number,
  height: number,
): LessonPlot {
  const values = samples.filter(sample => Number.isFinite(sample.time) && Number.isFinite(sample[column]));
  if (!values.length) return { points: [], path: '', minimum: 0, maximum: 1, startTime: 0, endTime: 1 };
  let minimum = Math.min(...values.map(sample => sample[column]));
  let maximum = Math.max(...values.map(sample => sample[column]));
  if (column === 'progress') {
    minimum = 0;
    maximum = 100;
  } else if (column !== 'massError') {
    minimum = Math.min(0, minimum);
  }
  if (maximum - minimum < 1e-12) {
    const margin = Math.max(1e-8, Math.abs(maximum) * 0.1);
    minimum -= margin;
    maximum += margin;
  }
  const startTime = values[0].time;
  const endTime = Math.max(startTime + 1, values[values.length - 1].time);
  const padding = 8;
  const plotWidth = Math.max(1, width - padding * 2);
  const plotHeight = Math.max(1, height - padding * 2);
  const points = values.map(sample => ({
    x: padding + (sample.time - startTime) / (endTime - startTime) * plotWidth,
    y: height - padding - (sample[column] - minimum) / (maximum - minimum) * plotHeight,
    time: sample.time,
    value: sample[column],
  }));
  return {
    points,
    path: points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' '),
    minimum,
    maximum,
    startTime,
    endTime,
  };
}

export function nearestLessonPlotPoint(plot: LessonPlot, x: number): LessonPlotPoint | null {
  if (!plot.points.length) return null;
  let nearest = plot.points[0];
  let distance = Math.abs(nearest.x - x);
  for (const point of plot.points) {
    const current = Math.abs(point.x - x);
    if (current < distance) {
      nearest = point;
      distance = current;
    }
  }
  return nearest;
}
