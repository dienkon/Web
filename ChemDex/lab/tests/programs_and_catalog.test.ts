import { describe, it, expect } from 'vitest';
import { EFFECT_ATOM_CATALOG, getEffectAtom } from '../src/vfx/catalog/index';
import { validateProgram, ReactionProgramSchema, ReactionProgram } from '../src/shared/programSchema';
import { 
  canonicalizeMorphology, 
  toLegacyMorphology, 
  CANONICAL_MORPHOLOGY_LIST,
  PrecipMorphology,
  GasSpecies,
  GAS_SPECIES_TABLE
} from '../src/vfx/catalog/vocab';
import * as fs from 'fs';
import * as path from 'path';

describe('Effect-Atom Catalog & Schema Verification Suite', () => {
  it('contains at least 110 closed Effect Atoms across all categories', () => {
    expect(EFFECT_ATOM_CATALOG).toBeDefined();
    expect(EFFECT_ATOM_CATALOG.length).toBeGreaterThanOrEqual(110);

    const categories = new Set(EFFECT_ATOM_CATALOG.map(a => a.category));
    expect(categories.size).toBeGreaterThanOrEqual(9);

    // Verify all atom names can be looked up
    for (const atom of EFFECT_ATOM_CATALOG) {
      expect(atom.name).toBeTruthy();
      expect(atom.summary_en).toBeTruthy();
      expect(atom.params).toBeDefined();
      expect(atom.gallery.length).toBeGreaterThanOrEqual(2);
      expect(getEffectAtom(atom.name)).toBe(atom);
    }
  });

  it('validates parameter specifications for default values and types', () => {
    for (const atom of EFFECT_ATOM_CATALOG) {
      for (const [paramName, spec] of Object.entries(atom.params)) {
        expect(spec.type).toBeDefined();
        expect(spec.default).toBeDefined();
        if (spec.type === 'number') {
          expect(typeof spec.default).toBe('number');
          if (spec.min !== undefined) {
            expect(spec.default).toBeGreaterThanOrEqual(spec.min);
          }
          if (spec.max !== undefined) {
            expect(spec.default).toBeLessThanOrEqual(spec.max);
          }
        } else if (spec.type === 'string') {
          expect(typeof spec.default).toBe('string');
        } else if (spec.type === 'boolean') {
          expect(typeof spec.default).toBe('boolean');
        }
      }
    }
  });

  it('matches generated catalog.digest.json with >= 110 atom definitions', () => {
    const digestPath = path.resolve(__dirname, '../server/generated/catalog.digest.json');
    expect(fs.existsSync(digestPath)).toBe(true);

    const raw = fs.readFileSync(digestPath, 'utf8');
    const digest = JSON.parse(raw);
    expect(Array.isArray(digest)).toBe(true);
    expect(digest.length).toBeGreaterThanOrEqual(110);

    for (const atom of digest) {
      expect(atom.name).toBeTruthy();
      expect(atom.category).toBeTruthy();
      expect(atom.paramSpecs).toBeDefined();
    }
  });

  it('validates canonical vocabularies and legacy morphology adapters', () => {
    expect(CANONICAL_MORPHOLOGY_LIST.length).toBeGreaterThanOrEqual(8);

    // Test bidirectional mapping
    expect(canonicalizeMorphology('FLOC')).toBe('floc');
    expect(canonicalizeMorphology('POWDER')).toBe('fine_powder');
    expect(canonicalizeMorphology('CURD')).toBe('curd');
    expect(canonicalizeMorphology('GEL')).toBe('gel');

    expect(toLegacyMorphology('floc')).toBe('FLOC');
    expect(toLegacyMorphology('fine_powder')).toBe('FINE_POWDER');
    expect(toLegacyMorphology('curd')).toBe('CURD');
  });

  it('validates gas species table completeness', () => {
    const knownGases: GasSpecies[] = ['H2', 'O2', 'CO2', 'SO2', 'NO2', 'NO', 'NH3', 'Cl2', 'H2S', 'C2H2', 'N2'];
    for (const gas of knownGases) {
      expect(GAS_SPECIES_TABLE[gas]).toBeDefined();
      expect(GAS_SPECIES_TABLE[gas].molarMass_g_mol).toBeGreaterThan(0);
      expect(GAS_SPECIES_TABLE[gas].relativeDensityAir).toBeGreaterThan(0);
    }
  });

  it('validates ReactionProgramSchema rejects invalid programs and passes valid ones', () => {
    const validProgram: ReactionProgram = {
      schema: 'chemdex.program/1',
      id: 'test_neutralization',
      provenance: 'handcrafted',
      chemistry: {
        equation: 'HCl + NaOH -> NaCl + H2O',
        species: [
          { formula: 'HCl', role: 'reactant', coeff: 1, phase: 'aq' },
          { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 'aq' },
          { formula: 'NaCl', role: 'product', coeff: 1, phase: 'aq' },
          { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
        ],
        kinetics: { model: 'instant', halfTime_s: 0.1 },
        hazards: []
      },
      visual: {
        duration_s: 4.0,
        timeline: [
          { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0, 0.5], intensity: 1.0, params: { speed: 1.2, color: '#f8fafc' } }
        ],
        after: {
          liquidColor: '#f8fafc',
          liquidOpacity: 0.95,
          turbidity: 0.0,
          gasesOffgassed: []
        }
      },
      explain: {
        observation_vi: 'Dung dịch trong suốt, tỏa nhiệt.',
        observation_en: 'Clear solution, exothermic heat release.',
        why_vi: 'Phản ứng trung hòa tạo nước.',
        why_en: 'Neutralization forming water.'
      },
      confidence: 1.0
    };

    const validated = validateProgram(validProgram);
    expect(validated.success).toBe(true);

    // Invalid schema test: invalid atom name and negative duration
    const invalidProgram = {
      ...validProgram,
      visual: {
        ...validProgram.visual,
        duration_s: -5.0,
        timeline: [
          { id: 'bad', atom: 'nonExistentAlienAtom', anchor: 'bulk', window: [0, 1], intensity: 1.0, params: {} }
        ]
      }
    };

    const invalidResult = validateProgram(invalidProgram);
    expect(invalidResult.success).toBe(false);
  });
});
