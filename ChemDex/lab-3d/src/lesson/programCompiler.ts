import type { AtomInstance, ReactionProgram, SpeciesRole } from '../shared/programSchema';
import type { LessonDefinition, LessonEffect } from './types';
import { LESSON_DEFINITIONS } from './catalog';
import { getLessonSpecies } from './catalog/species';

function compileLessonEffect(effect: LessonEffect, index: number, definition: LessonDefinition): AtomInstance | null {
  const common = {
    id: `${definition.id}_effect_${index}`,
    window: [effect.onset, effect.end] as [number, number],
    intensity: 1,
  };
  switch (effect.kind) {
    case 'color':
      return {
        ...common,
        atom: 'beerLambertFade',
        anchor: 'bulk',
        params: { startColor: definition.initialColor, endColor: definition.finalColor, opticalPath_cm: 2 },
      };
    case 'precipitation':
      return {
        ...common,
        atom: 'precipitateNucleation',
        anchor: 'bulk',
        params: { morphology: 'fine_powder', color: effect.color, nucleationRate: 25 },
      };
    case 'dissolution':
      return {
        ...common,
        atom: 'solidErosion',
        anchor: 'bottom',
        params: { initialShape: 'granule', erosionRate: 0.05, color: effect.color },
      };
    case 'bubbles':
      return {
        ...common,
        atom: 'nucleateBubbles',
        anchor: effect.location === 'surface' ? 'meniscus' : 'bottom',
        params: {
          bubbleRate: 15,
          meanRadius_mm: 1,
          gasSpecies: effect.species ? getLessonSpecies(effect.species).formula : 'CO2',
        },
      };
    case 'flame':
      return {
        ...common,
        atom: 'flameCone',
        anchor: 'meniscus',
        params: { color: effect.color, intensity: 0.6, height: 0.3 },
      };
    case 'deposition':
      return {
        ...common,
        atom: 'metallicMirrorDeposit',
        anchor: 'wall',
        params: { metalColor: effect.color, coverage: 0.5 },
      };
    case 'phase_separation':
      return {
        ...common,
        atom: 'liquidPhaseSplit',
        anchor: 'bulk',
        params: { upperColor: effect.color, lowerColor: '#f8fafc', splitRatio: 0.2 },
      };
    case 'condensation':
      return {
        ...common,
        atom: 'wallCondensationDroplets',
        anchor: 'wall',
        params: { color: '#e2e8f0', density: 0.2 },
      };
    case 'invisible':
      return null;
  }
}

export function compileLessonProgram(definition: LessonDefinition): ReactionProgram {
  const species: SpeciesRole[] = [];
  for (const term of definition.reactants) {
    const entry = getLessonSpecies(term.species);
    species.push({
      formula: entry.formula,
      name_vi: entry.name_vi,
      role: 'reactant',
      coeff: term.coefficient,
      phase: entry.phase,
      molarMass_g_mol: entry.molarMass,
      colorHex: entry.color,
    });
  }
  for (const term of definition.products) {
    const entry = getLessonSpecies(term.species);
    species.push({
      formula: entry.formula,
      name_vi: entry.name_vi,
      role: 'product',
      coeff: term.coefficient,
      phase: entry.phase,
      molarMass_g_mol: entry.molarMass,
      colorHex: entry.color,
    });
  }
  const precipitate = definition.effects.find(effect => effect.kind === 'precipitation' && effect.species);
  const temperature = definition.conditions.find(condition => condition.kind === 'temperature');
  const catalyst = definition.conditions.find(condition => condition.kind === 'catalyst');
  return {
    schema: 'chemdex.program/1',
    id: definition.id,
    provenance: 'handcrafted',
    chemistry: {
      equation: definition.equation,
      species,
      deltaH_kJ_per_mol: null,
      kinetics: {
        model: definition.model === 'heat_activated' ? 'heat_activated' : 'first_order',
        halfTime_s: definition.duration_s / 2,
        stirSensitivity: 0.35,
      },
      conditions: {
        minTemp_c: temperature?.minimum,
        catalyst: catalyst?.value,
        medium: definition.conditions.some(condition => condition.kind === 'acidic')
          ? 'acidic'
          : definition.conditions.some(condition => condition.kind === 'alkaline') ? 'alkaline' : undefined,
      },
      warning_vi: definition.safety_vi,
    },
    visual: {
      duration_s: definition.duration_s,
      timeline: definition.effects
        .map((effect, index) => compileLessonEffect(effect, index, definition))
        .filter((effect): effect is AtomInstance => effect !== null),
      after: {
        liquidColor: definition.finalColor,
        liquidOpacity: 0.15,
        turbidity: definition.finalTurbidity,
        ...(precipitate?.species ? {
          precipitate: {
            substance: getLessonSpecies(precipitate.species).formula,
            morphology: 'fine_powder' as const,
            color: precipitate.color,
            mass_g: 'fromLedger' as const,
          },
        } : {}),
        gasesOffgassed: definition.products
          .filter(term => getLessonSpecies(term.species).phase === 'g')
          .map(term => ({ species: getLessonSpecies(term.species).formula, mol: 'fromLedger' as const, escaped: true })),
      },
    },
    explain: {
      observation_vi: definition.observation_vi,
      observation_en: definition.observation_vi,
      why_vi: definition.explanation_vi,
      why_en: definition.explanation_vi,
    },
    confidence: 0.85,
  };
}

export const LESSON_PROGRAMS = LESSON_DEFINITIONS.map(compileLessonProgram);
export const LESSON_PROGRAM_IDS = new Set(LESSON_PROGRAMS.map(program => program.id));
