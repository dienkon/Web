/**
 * index.ts — Master Reaction Programs Library
 * 
 * Aggregates all handcrafted programs and provides fast indexation
 * by canonical reaction keys and reactant pairs.
 */

import { ReactionProgram } from '../../../shared/programSchema';
import { ACID_BASE_PROGRAMS } from './acidBasePrograms';
import { PRECIPITATION_PROGRAMS } from './precipitationPrograms';
import { GAS_EVOLUTION_PROGRAMS } from './gasEvolutionPrograms';
import { REDOX_DISPLACEMENT_PROGRAMS } from './redoxDisplacementPrograms';
import { COMPLEXATION_EQUILIBRIA_PROGRAMS } from './complexationEquilibriaPrograms';
import { COMBUSTION_PYROTECHNIC_PROGRAMS } from './combustionPyrotechnicPrograms';
import { THERMAL_SAFETY_PROGRAMS } from './thermalDecompositionSafetyPrograms';
import { COORDINATION_PROGRAMS } from './coordinationPrograms';
import { INORGANIC_ANALYSIS_PROGRAMS } from './inorganicAnalysisPrograms';
import { REDOX_TITRATION_PROGRAMS } from './redoxTitrationPrograms';
import { GAS_GENERATION_PROGRAMS } from './gasGenerationPrograms';
import { PHYSICAL_SOLUTION_PROGRAMS } from './physicalSolutionPrograms';

export const ALL_HANDCRAFTED_PROGRAMS: ReactionProgram[] = [
  ...ACID_BASE_PROGRAMS,
  ...PRECIPITATION_PROGRAMS,
  ...GAS_EVOLUTION_PROGRAMS,
  ...REDOX_DISPLACEMENT_PROGRAMS,
  ...COMPLEXATION_EQUILIBRIA_PROGRAMS,
  ...COMBUSTION_PYROTECHNIC_PROGRAMS,
  ...THERMAL_SAFETY_PROGRAMS,
  ...COORDINATION_PROGRAMS,
  ...INORGANIC_ANALYSIS_PROGRAMS,
  ...REDOX_TITRATION_PROGRAMS,
  ...GAS_GENERATION_PROGRAMS,
  ...PHYSICAL_SOLUTION_PROGRAMS
];

export const PROGRAMS_BY_ID = new Map<string, ReactionProgram>();
for (const p of ALL_HANDCRAFTED_PROGRAMS) {
  PROGRAMS_BY_ID.set(p.id.toLowerCase().trim(), p);
}

export function getProgramById(id: string): ReactionProgram | undefined {
  if (!id) return undefined;
  const normalized = id.toLowerCase().trim().replace(/[\s\(\)]/g, '').replace(/\+/g, '_');
  if (PROGRAMS_BY_ID.has(normalized)) return PROGRAMS_BY_ID.get(normalized);

  // Exact ID check
  return PROGRAMS_BY_ID.get(id.toLowerCase().trim());
}

export function getAllHandcraftedPrograms(): ReactionProgram[] {
  return ALL_HANDCRAFTED_PROGRAMS;
}
