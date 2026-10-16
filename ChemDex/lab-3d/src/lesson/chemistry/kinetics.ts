import type { LessonDefinition, LessonEnvironment, LessonSession } from '../types';
import { lessonConditionsReady } from './conditions';
import { limitingLessonExtent } from './inventory';

export interface LessonRateResult {
  extent_mol: number;
  rate_mol_s: number;
  progress: number;
  reason: 'ready' | 'conditions' | 'depleted' | 'equilibrium' | 'paused';
}

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function lessonTargetExtent(definition: LessonDefinition, maximum: number): number {
  const targetConversion = definition.reversible?.targetConversion ?? 1;
  return maximum * bounded(targetConversion, 0, 1);
}

export function lessonMixingFactor(environment: LessonEnvironment): number {
  if (!environment.mixed) return 0;
  return environment.stirring ? 1.35 : 1;
}

export function lessonThermalFactor(
  definition: LessonDefinition,
  environment: LessonEnvironment,
): number {
  const gate = definition.conditions.find(condition => condition.kind === 'temperature');
  const reference = gate?.minimum ?? 25;
  const offset = (environment.temperature_c - reference) / 50;
  if (definition.model === 'heat_activated') {
    return bounded(1 + offset * 0.35, 0.5, 2);
  }
  if (definition.model === 'enzyme_limited') {
    const optimum = 32.5;
    const distance = Math.abs(environment.temperature_c - optimum);
    return bounded(1 - distance / 30, 0.1, 1);
  }
  return 1;
}

export function integrateLessonRate(
  definition: LessonDefinition,
  session: LessonSession,
  dt: number,
): LessonRateResult {
  const progress = session.maxExtent_mol > 0 ? session.extent_mol / session.maxExtent_mol : 0;
  const inactive = ['paused', 'stopped', 'complete'].includes(session.status);
  if (inactive || !Number.isFinite(dt) || dt <= 0) {
    return { extent_mol: 0, rate_mol_s: 0, progress, reason: 'paused' };
  }
  if (!lessonConditionsReady(session.conditionResults)) {
    return { extent_mol: 0, rate_mol_s: 0, progress, reason: 'conditions' };
  }
  const available = limitingLessonExtent(session.inventory, definition.reactants);
  if (available <= 1e-12 || session.maxExtent_mol <= 0) {
    return { extent_mol: 0, rate_mol_s: 0, progress, reason: 'depleted' };
  }
  const target = lessonTargetExtent(definition, session.maxExtent_mol);
  const remaining = Math.max(0, target - session.extent_mol);
  if (remaining <= Math.max(1e-12, target * 1e-7)) {
    return { extent_mol: 0, rate_mol_s: 0, progress, reason: 'equilibrium' };
  }
  const duration = Math.max(1, definition.duration_s);
  const mixing = lessonMixingFactor(session.environment);
  const thermal = lessonThermalFactor(definition, session.environment);
  let normalizedRate = 1 / duration;
  switch (definition.model) {
    case 'surface_limited':
      normalizedRate *= 0.65 + 0.7 * Math.cbrt(Math.max(0, 1 - progress));
      break;
    case 'heat_activated':
      normalizedRate *= 0.8 + 0.4 * bounded(progress * 4, 0, 1);
      break;
    case 'enzyme_limited':
      normalizedRate *= 0.5 + 0.5 * Math.sin(Math.PI * bounded(progress, 0, 1));
      break;
    case 'mixing_limited':
      normalizedRate *= 1.2 - 0.4 * bounded(progress, 0, 1);
      break;
  }
  if (definition.reversible) {
    normalizedRate *= bounded(remaining / Math.max(target * 0.15, 1e-12), 0.08, 1);
  }
  const rate = session.maxExtent_mol * normalizedRate * mixing * thermal;
  const extent = Math.min(available, remaining, rate * Math.min(dt, 0.1));
  return {
    extent_mol: Math.max(0, extent),
    rate_mol_s: dt > 0 ? extent / dt : 0,
    progress: session.maxExtent_mol > 0
      ? (session.extent_mol + extent) / session.maxExtent_mol
      : 0,
    reason: 'ready',
  };
}

export function lessonRateLabel(definition: LessonDefinition): string {
  switch (definition.model) {
    case 'surface_limited':
      return 'Diễn biến trên bề mặt chất rắn; tốc độ hiển thị là mô hình định tính.';
    case 'enzyme_limited':
      return 'Quá trình enzym được rút gọn thời gian; không phải số đo tốc độ lên men.';
    case 'heat_activated':
      return 'Chỉ tiến triển khi đủ điều kiện nhiệt; thời gian hiển thị được rút gọn.';
    case 'mixing_limited':
      return 'Mô hình tiếp xúc và trộn; không dùng đồng hồ mô phỏng làm dữ liệu thực nghiệm.';
  }
}

export function remainingLessonSeconds(definition: LessonDefinition, session: LessonSession): number | null {
  if (session.lastRate_mol_s <= 1e-15) return null;
  const target = lessonTargetExtent(definition, session.maxExtent_mol);
  return Math.max(0, target - session.extent_mol) / session.lastRate_mol_s;
}
