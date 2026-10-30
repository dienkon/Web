import type { LiquidAliquot } from '../handling/aliquot';
import type { VesselState } from '../types/chemistry';
import type { ReactionProgram } from '../shared/programSchema';
import { getProgramById } from '../vfx/programs/library';
import { findHandcraftedProgram } from '../vfx/programs/resolver';
import { aqueousContactHalfTime } from './contactKinetics';
import { applyProgramToLedger } from './ledger';
import { aqueousWaterBoundary } from '../science/aqueousWaterBoundary';
import { WATER_CP_J_G_K } from './waterProperties';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { projectAqueousSolution } from './aqueousProjection';

/** Existing authored aqueous relaxation, carried with a finite liquid sample.
 * Gas evolution, non-aqueous media, activation/surface kinetics and phase
 * crossings need their own boundaries; this model does not guess those sinks. */
export function aliquotContactProgramSupported(program: ReactionProgram): boolean {
  const reactants = program.chemistry.species.filter(s => s.role === 'reactant');
  const products = program.chemistry.species.filter(s => s.role === 'product');
  const changesMolecules = [...reactants, ...products].some(species =>
    reactants.filter(s => sameMolecularFormula(s.formula, species.formula)).reduce((n, s) => n + s.coeff, 0)
    !== products.filter(s => sameMolecularFormula(s.formula, species.formula)).reduce((n, s) => n + s.coeff, 0));
  return aqueousContactHalfTime({ program }) !== null
    && program.provenance !== 'fallback'
    && !['indicator', 'emission', 'dilution'].includes(program.chemistry.representation ?? '')
    && changesMolecules
    && !program.chemistry.species.some(s => s.role === 'product' && s.phase === 'g');
}

function referenceVessel(sample: LiquidAliquot): VesselState {
  const vessel: VesselState = { id: 'transport_sample', name: 'Finite liquid sample', type: 'beaker', capacity_ml: Math.max(1, sample.volume_ml),
    position: [0, 0, 0], rotationY: 0, isLocked: false, contents: sample.contents,
    substances: sample.substances, mass_g: sample.mass_g, volume_ml: sample.volume_ml, volume: 1,
    temperature_c: sample.temperature_c, ph: 7, liquidColor: sample.color,
    hasGas: false, hasPrecipitate: false, isBoiling: false, programHeatApplied_J: 0 };
  return { ...vessel, ...projectAqueousSolution(vessel) };
}

export function prepareAliquotContact(sample: LiquidAliquot, preferredProgramId?: string): LiquidAliquot {
  if (sample.reactionProgramId !== undefined) return sample;
  if (!(sample.volume_ml > 0) || !(sample.mass_g > 0) || (sample.organicVolume_ml ?? 0) > 0
    || !sample.contents.some(c => sameMolecularFormula(c.formula, 'H2O') && c.phase === 'l' && c.mass_g > 0))
    return { ...sample, reactionProgramId: null };
  const preferred = preferredProgramId ? getProgramById(preferredProgramId) : undefined;
  const candidate = preferred && aliquotContactProgramSupported(preferred) ? preferred : findHandcraftedProgram(sample.substances, sample.contents,
    { temperature_c: sample.temperature_c, volume_ml: sample.volume_ml, isHeated: false, isSealed: false });
  return { ...sample, reactionProgramId: candidate && aliquotContactProgramSupported(candidate) ? candidate.id : null };
}

/** For a uniformly arriving interval [a,b], average exp(-k*t) analytically.
 * a=b is a held sample's single exposure age. This prevents a large transport
 * step from reacting early arrivals up to the end of that entire step. */
export function meanContactConversion(halfTime_s: number, from_s: number, to_s = from_s): number {
  const k = Math.LN2 / halfTime_s, span = to_s - from_s;
  const remaining = Math.exp(-k * from_s) * (span > 1e-12 ? -Math.expm1(-k * span) / (k * span) : 1);
  return Math.max(0, Math.min(1, 1 - remaining));
}

export function evolveAliquotContact(input: LiquidAliquot, from_s: number, to_s = from_s): LiquidAliquot {
  if (![from_s, to_s].every(Number.isFinite) || from_s < 0 || to_s < from_s || to_s === 0) return input;
  const sample = prepareAliquotContact(input), program = sample.reactionProgramId ? getProgramById(sample.reactionProgramId) : undefined;
  if (!program || !aliquotContactProgramSupported(program) || !(sample.mass_g > 0)) return sample;
  const halfTime = aqueousContactHalfTime({ program })!;
  const reference = referenceVessel(sample);
  const next = applyProgramToLedger(program, reference, meanContactConversion(halfTime, from_s, to_s), { deferThermal: true });
  const heat = next.programHeatApplied_J ?? 0;
  // Adiabatic water-like sample reference. No fictitious 33.2 J/K beaker is
  // carried by a flying sample/pipette. Carrier/ambient exchange is uncalibrated.
  const temperature_c = sample.temperature_c + heat / (sample.mass_g * WATER_CP_J_G_K);
  const projected = { ...reference, ...next, temperature_c };
  const boundary = aqueousWaterBoundary(projected);
  // Unknown solution VLE does not grant an infinite liquid-only domain. Use
  // the water reference ceiling when no supported solution boundary exists.
  const ceiling = Number.isFinite(boundary.boiling_c) ? Math.min(boundary.boiling_c, boundary.pureBoiling_c) : boundary.pureBoiling_c;
  if (!Number.isFinite(temperature_c) || !Number.isFinite(ceiling) || temperature_c < 0 || temperature_c >= ceiling)
    return { ...sample, contactChemistryLimit: 'phase_boundary' };
  const contents = next.contents ?? sample.contents;
  const remaining = program.chemistry.species.filter(s => s.role === 'reactant').every(s => contents.some(c =>
    sameMolecularFormula(c.formula, s.formula) && (!c.phase || c.phase === s.phase) && c.moles > 1e-12));
  return { ...sample, contents, temperature_c, color: projectAqueousSolution(projected)?.liquidColor ?? next.liquidColor ?? sample.color,
    substances: [...new Set(contents.filter(c => c.moles > 1e-12).map(c => c.formula))],
    reactionProgramId: remaining ? program.id : null, contactChemistryLimit: undefined };
}
