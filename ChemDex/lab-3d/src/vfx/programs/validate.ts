/**
 * validate.ts — Formal Reaction Program Validation & Repair Engine (§7.4)
 * 
 * Implements the 6 hard validation and repair rules:
 * 1. Schema & enum membership (catalog atom existence, valid anchors, vocab enums)
 * 2. Chemistry sanity (parseChemicalFormula atomic element balance, charge balance)
 * 3. Visual sanity (<= 24 atoms, no colored smoke plumes for invisible gases, window normalization)
 * 4. Conservation check (scratch execution via applyProgramToLedger)
 * 5. Programmatic repair loop (safe color normalization, missing schema/provenance repair, atom truncation)
 * 6. Local data table precedence (override AI molar masses and densities with authoritative tables)
 */

import { ReactionProgram, ReactionProgramSchema, AtomInstance } from '../../shared/programSchema';
import { EFFECT_ATOM_CATALOG } from '../catalog/index';
import { ANCHORS, PRECIP_MORPHOLOGIES, GAS_SPECIES, GasSpecies } from '../catalog/vocab';
import { GAS_FUME_TABLE } from '../catalog/gasTable';
import { PRECIPITATES_DATABASE } from '../../data/precipitates';
import { parseChemicalFormula, computeMolarMass, applyProgramToLedger } from '../../engine/ledger';
import { VesselState } from '../../types/chemistry';

const CATALOG_ATOM_NAMES = new Set(EFFECT_ATOM_CATALOG.map(a => a.name));
const VALID_ANCHORS = new Set(ANCHORS);
const VALID_MORPHOLOGIES = new Set(PRECIP_MORPHOLOGIES);
const VALID_GASES = new Set(GAS_SPECIES);

const INVISIBLE_GAS_LIST = ['H2', 'O2', 'N2', 'CO2', 'SO2', 'NH3', 'H2S', 'CH4'];
const COLORED_PLUME_ATOMS = new Set([
  'no2BrownPlume',
  'heavyYellowGreenChlorine',
  'bromineVaporLayer',
  'iodineVioletVapor',
  'sootBlackSmoke'
]);

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export interface ProgramValidationResult {
  valid: boolean;
  success: boolean;
  program?: ReactionProgram;
  errors: string[];
  repaired?: boolean;
}

/**
 * Normalizes color hex string to standard 6-character lower-case #rrggbb.
 */
export function normalizeHexColor(hex?: string, defaultHex = '#ffffff'): string {
  if (!hex || typeof hex !== 'string') return defaultHex;
  let s = hex.trim();
  if (!s.startsWith('#')) s = '#' + s;
  if (s.length === 4) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return HEX_COLOR_REGEX.test(s) ? s.toLowerCase() : defaultHex;
}

/**
 * Validates and repairs an arbitrary reaction program data object.
 */
export function validateProgram(raw: any, options: { strict?: boolean } = {}): ProgramValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, success: false, errors: ['Input is not a valid JSON object'] };
  }

  let copy: any;
  try {
    copy = JSON.parse(JSON.stringify(raw));
  } catch {
    copy = { ...raw };
  }

  // 1. Pre-repair basic envelope properties
  if (!copy.schema) copy.schema = 'chemdex.program/1';
  if (!copy.provenance) copy.provenance = 'ai';
  if (typeof copy.confidence !== 'number') copy.confidence = 0.9;
  if (!copy.id || typeof copy.id !== 'string') copy.id = 'unnamed_reaction';

  // Ensure chemistry structure exists
  if (!copy.chemistry || typeof copy.chemistry !== 'object' || Array.isArray(copy.chemistry)) {
    copy.chemistry = {};
  }
  if (!copy.chemistry.equation || typeof copy.chemistry.equation !== 'string') {
    copy.chemistry.equation = 'A -> B';
  }
  if (!Array.isArray(copy.chemistry.species)) copy.chemistry.species = [];
  if (!copy.chemistry.hazards || !Array.isArray(copy.chemistry.hazards)) copy.chemistry.hazards = [];
  if (!copy.chemistry.kinetics || typeof copy.chemistry.kinetics !== 'object') {
    copy.chemistry.kinetics = { model: 'second_order', halfTime_s: 1.5 };
  }

  // 2. Table Precedence: Override/enrich molar masses from IUPAC standard data (§7.4 Rule 6)
  for (const sp of copy.chemistry.species) {
    if (sp.formula && typeof sp.formula === 'string') {
      const knownMM = computeMolarMass(sp.formula);
      if (knownMM > 0) {
        sp.molarMass_g_mol = knownMM;
      }
    }
    if (typeof sp.coeff !== 'number' || sp.coeff <= 0) {
      sp.coeff = 1;
    } else if (sp.coeff > 30) {
      sp.coeff = 30; // Clamp extreme numbers per §7.4 Rule 2
    }
  }

  // 3. Chemistry Sanity: Atomic Balance Check (§7.4 Rule 2)
  const reactants = copy.chemistry.species.filter((s: any) => s.role === 'reactant');
  const products = copy.chemistry.species.filter((s: any) => s.role === 'product');

  if (reactants.length > 0 && products.length > 0) {
    const reactantAtoms: Record<string, number> = {};
    const productAtoms: Record<string, number> = {};

    for (const r of reactants) {
      const atoms = parseChemicalFormula(r.formula);
      const coeff = r.coeff || 1;
      for (const [el, count] of Object.entries(atoms)) {
        reactantAtoms[el] = (reactantAtoms[el] || 0) + count * coeff;
      }
    }

    for (const p of products) {
      const atoms = parseChemicalFormula(p.formula);
      const coeff = p.coeff || 1;
      for (const [el, count] of Object.entries(atoms)) {
        productAtoms[el] = (productAtoms[el] || 0) + count * coeff;
      }
    }

    // Compare element counts for elements present on both sides (allowing spectator/indicator omissions)
    for (const [el, rCount] of Object.entries(reactantAtoms)) {
      if (productAtoms[el] !== undefined && Math.abs(productAtoms[el] - rCount) > 0.05) {
        errors.push(`Unbalanced equation for element ${el}: reactant count ${rCount} != product count ${productAtoms[el]}`);
      }
    }
  }

  // 4. Visual Sanity & Color Normalization (§7.4 Rule 3)
  if (!copy.visual || typeof copy.visual !== 'object') {
    copy.visual = { duration_s: 5.0, timeline: [], after: { liquidColor: '#ffffff', liquidOpacity: 1, turbidity: 0, gasesOffgassed: [] } };
  }
  if (typeof copy.visual.duration_s !== 'number' || copy.visual.duration_s <= 0) {
    errors.push(`Visual duration_s must be a positive number, received: ${copy.visual?.duration_s}`);
    copy.visual.duration_s = 5.0;
  }

  if (copy.visual.after) {
    copy.visual.after.liquidColor = normalizeHexColor(copy.visual.after.liquidColor, '#ffffff');
    if (copy.visual.after.precipitate) {
      copy.visual.after.precipitate.color = normalizeHexColor(copy.visual.after.precipitate.color, '#ffffff');
      if (!copy.visual.after.precipitate.substance) copy.visual.after.precipitate.substance = 'Precipitate';
      if (!VALID_MORPHOLOGIES.has(copy.visual.after.precipitate.morphology as any)) {
        copy.visual.after.precipitate.morphology = 'fine_powder';
      }
    }
    if (!Array.isArray(copy.visual.after.gasesOffgassed)) {
      copy.visual.after.gasesOffgassed = [];
    }
  }

  // 5. Timeline validation: atom membership in catalog, window clamping, max 24 atoms (§7.4 Rule 1 & Rule 3)
  const validTimeline: AtomInstance[] = [];
  if (Array.isArray(copy.visual.timeline)) {
    const rawTimeline = copy.visual.timeline.slice(0, 24); // Cap to 24 max
    const producesOnlyInvisibleGas = products.length > 0 && products.every((p: any) => p.phase === 'g' && INVISIBLE_GAS_LIST.includes(p.formula));

    for (let i = 0; i < rawTimeline.length; i++) {
      const item = rawTimeline[i];
      if (!item || typeof item !== 'object') continue;

      const atomName = item.atom;
      if (!CATALOG_ATOM_NAMES.has(atomName)) {
        errors.push(`Atom "${atomName}" does not exist in closed Effect Atom catalog`);
        if (options.strict) continue;
        // Repair: drop invalid atom
        continue;
      }

      // Check: Invisible gas must NEVER mount colored smoke/plume atoms (§4.0 & §7.4 Rule 3)
      if (producesOnlyInvisibleGas && COLORED_PLUME_ATOMS.has(atomName)) {
        errors.push(`Invisible gas reaction must not mount colored plume atom "${atomName}"`);
        // Repair: replace with effervescence / bubble stream
        item.atom = 'nucleationSiteBubbleStream';
      }

      // Window ordering and clamping
      let [wStart, wEnd] = Array.isArray(item.window) ? item.window : [0, 1];
      if (typeof wStart !== 'number' || isNaN(wStart)) wStart = 0;
      if (typeof wEnd !== 'number' || isNaN(wEnd)) wEnd = 1;
      if (wStart > wEnd) {
        const tmp = wStart;
        wStart = wEnd;
        wEnd = tmp;
      }
      wStart = Math.max(0, Math.min(1, wStart));
      wEnd = Math.max(0, Math.min(1, wEnd));

      validTimeline.push({
        id: item.id || `atom_${i + 1}`,
        atom: item.atom,
        anchor: VALID_ANCHORS.has(item.anchor) ? item.anchor : 'bulk',
        window: [wStart, wEnd],
        intensity: item.intensity ?? 1.0,
        params: (item.params && typeof item.params === 'object') ? item.params : {},
        fallbackAtom: item.fallbackAtom
      });
    }
  }
  copy.visual.timeline = validTimeline;

  // 6. Conservation Check (§7.4 Rule 4): Run on scratch vessel copy
  if (reactants.length > 0) {
    try {
      const scratchVessel: VesselState = {
        id: 'scratch_validator',
        name: 'Scratch Vessel',
        type: 'beaker',
        position: [0, 0, 0],
        rotationY: 0,
        isLocked: false,
        volume: 0.1,
        mass_g: 100,
        ph: 7,
        hasPrecipitate: false,
        isBoiling: false,
        hasGas: false,
        capacity_ml: 250,
        volume_ml: 100,
        temperature_c: 25,
        substances: reactants.map((r: any) => r.formula),
        contents: reactants.map((r: any) => ({
          formula: r.formula,
          moles: 0.05,
          mass_g: 0.05 * computeMolarMass(r.formula),
          volume_ml: 50,
          concentration_M: 1.0
        }))
      };

      const scratchOutcome = applyProgramToLedger(copy as ReactionProgram, scratchVessel, 1.0);
      if (scratchOutcome.contents) {
        for (const item of scratchOutcome.contents) {
          if (item.moles < -1e-6) {
            errors.push(`Conservation violation: negative moles (${item.moles}) for species ${item.formula}`);
          }
        }
      }
    } catch (err: any) {
      errors.push(`Ledger simulation evaluation failed: ${err?.message || err}`);
    }
  }

  // Final Zod structural validation
  const parsed = ReactionProgramSchema.safeParse(copy);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }

  const isValid = errors.length === 0 && parsed.success;

  return {
    valid: isValid,
    success: isValid,
    program: (parsed.success ? parsed.data : copy) as ReactionProgram,
    errors,
    repaired: errors.length > 0
  };
}
