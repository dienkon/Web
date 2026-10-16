import type {
  LessonDefinition,
  LessonEffect,
  LessonSession,
  LessonVisualState,
} from '../types';
import type { SpeciesLookup } from './inventory';

export function clampLessonUnit(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function lessonSmoothstep(value: number): number {
  const t = clampLessonUnit(value);
  return t * t * (3 - 2 * t);
}

function colorChannels(hex: string): [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return [1, 1, 1];
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function blendLessonColor(start: string, end: string, fraction: number): string {
  const left = colorChannels(start);
  const right = colorChannels(end);
  const t = clampLessonUnit(fraction);
  const channels = left.map((channel, index) => {
    const linearStart = Math.pow(channel, 2.2);
    const linearEnd = Math.pow(right[index], 2.2);
    return Math.round(Math.pow(linearStart * (1 - t) + linearEnd * t, 1 / 2.2) * 255);
  });
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function lessonEffectEnvelope(effect: LessonEffect, progress: number): number {
  if (progress < effect.onset) return 0;
  if (effect.persists && progress >= effect.peak) return 1;
  if (progress >= effect.end) return 0;
  if (progress <= effect.peak) {
    return lessonSmoothstep((progress - effect.onset) / Math.max(1e-6, effect.peak - effect.onset));
  }
  return 1 - lessonSmoothstep((progress - effect.peak) / Math.max(1e-6, effect.end - effect.peak));
}

export function emptyLessonVisuals(color = '#f8fafc'): LessonVisualState {
  return {
    color,
    turbidity: 0,
    gasRate_mol_s: 0,
    gasSpecies: null,
    precipitate_g: 0,
    precipitateColor: '#ffffff',
    solidRemaining_g: 0,
    solidColor: '#ffffff',
    flame: 0,
    flameColor: '#60a5fa',
    deposition: 0,
    phaseSplit: 0,
    condensation: 0,
    dissolution: 0,
    activeEffects: [],
  };
}

export function deriveLessonVisuals(
  definition: LessonDefinition,
  session: LessonSession,
  lookup: SpeciesLookup,
): LessonVisualState {
  const target = definition.reversible?.targetConversion ?? 1;
  const progress = clampLessonUnit(session.physicalProgress / Math.max(target, 1e-9));
  const visuals = emptyLessonVisuals(blendLessonColor(
    definition.initialColor,
    definition.finalColor,
    lessonSmoothstep(progress),
  ));
  // Completion refers to the limiting reagent, not to disappearance of every
  // colored reactant. Excess bromine must therefore retain its own absorption.
  for (const term of definition.reactants) {
    const species = lookup(term.species);
    if (species.phase !== 'aq' && species.phase !== 'l') continue;
    const colored = definition.effects.some(effect => effect.kind === 'color' && effect.species === term.species);
    const item = session.inventory.find(entry => entry.species === term.species);
    if (!colored || !item || item.initial_mol <= 0) continue;
    const remaining = clampLessonUnit(item.amount_mol / item.initial_mol);
    visuals.color = blendLessonColor(definition.finalColor, definition.initialColor, remaining);
  }
  const reacting = session.status === 'running' && session.lastRate_mol_s > 0;
  for (const effect of definition.effects) {
    const envelope = lessonEffectEnvelope(effect, progress);
    if (envelope > 0.001) visuals.activeEffects.push(effect);
    const species = effect.species ? lookup(effect.species) : null;
    const item = effect.species
      ? session.inventory.find(entry => entry.species === effect.species)
      : null;
    switch (effect.kind) {
      case 'precipitation':
        if (species && item) {
          visuals.precipitate_g += item.amount_mol * species.molarMass;
          visuals.precipitateColor = effect.color;
          visuals.turbidity = Math.max(visuals.turbidity, envelope * definition.finalTurbidity);
        }
        break;
      case 'dissolution':
        visuals.dissolution = Math.max(visuals.dissolution, progress);
        break;
      case 'bubbles': {
        const coefficient = definition.products.find(term => term.species === effect.species)?.coefficient ?? 1;
        visuals.gasRate_mol_s += reacting ? session.lastRate_mol_s * coefficient : 0;
        visuals.gasSpecies = effect.species ?? null;
        break;
      }
      case 'flame':
        visuals.flame = reacting ? Math.max(0.15, envelope) : 0;
        visuals.flameColor = effect.color;
        break;
      case 'deposition':
        visuals.deposition = progress;
        break;
      case 'phase_separation':
        visuals.phaseSplit = session.environment.stirring ? envelope * 0.15 : envelope;
        break;
      case 'condensation':
        visuals.condensation = envelope;
        break;
      case 'color':
      case 'invisible':
        break;
    }
  }
  for (const term of definition.reactants) {
    const species = lookup(term.species);
    if (species.phase !== 's') continue;
    const item = session.inventory.find(entry => entry.species === term.species);
    if (!item || item.amount_mol <= 0) continue;
    visuals.solidRemaining_g += item.amount_mol * species.molarMass;
    visuals.solidColor = species.color;
  }
  if (session.status === 'complete') {
    visuals.flame = 0;
    visuals.gasRate_mol_s = 0;
    visuals.turbidity = definition.finalTurbidity;
  }
  return visuals;
}

export function lessonParticleBudget(
  gasRate_mol_s: number,
  multiplier: number,
  hardLimit: number,
): number {
  if (gasRate_mol_s <= 0 || multiplier <= 0 || hardLimit <= 0) return 0;
  const normalized = Math.sqrt(Math.min(1, gasRate_mol_s / 0.0005));
  return Math.max(1, Math.min(hardLimit, Math.round((8 + 40 * normalized) * multiplier)));
}

export function lessonObservationAtProgress(definition: LessonDefinition, progress: number): string {
  let observation = definition.checkpoints[0]?.observation_vi ?? definition.observation_vi;
  for (const checkpoint of definition.checkpoints) {
    if (progress >= checkpoint.progress) observation = checkpoint.observation_vi;
  }
  return observation;
}
