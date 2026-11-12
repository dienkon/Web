import { normalizeFormula, parseFormula } from './formula.mjs';

// Deliberately limited to implemented presets. Matching all reactants AND products
// prevents plausible-looking but unsupported equations opening an unrelated lab.
export const LAB_REACTIONS = [
  ['acid_base_titration', 'HCl + NaOH -> NaCl + H2O'],
  ['golden_rain_synthesis', 'Pb(NO3)2 + 2KI -> PbI2 + 2KNO3'],
  ['co2_gas_production', 'CaCO3 + 2HCl -> CaCl2 + CO2 + H2O'],
  ['single_displacement_copper', 'Fe + CuSO4 -> FeSO4 + Cu'],
  ['mass_conservation_bacl2_na2so4', 'BaCl2 + Na2SO4 -> BaSO4 + 2NaCl'],
  ['catalytic_oxygen_prep', '2H2O2 -> 2H2O + O2'],
  ['thermal_decomp_cuoh2', 'Cu(OH)2 -> CuO + H2O'],
  ['redox_gas_cu_hno3', 'Cu + 4HNO3 -> Cu(NO3)2 + 2NO2 + 2H2O'],
  ['alkali_metal_water_na', '2Na + 2H2O -> 2NaOH + H2'],
  ['agcl_curdy_precipitation', 'AgNO3 + NaCl -> AgCl + NaNO3'],
  ['zn_hcl_hydrogen_production', 'Zn + 2HCl -> ZnCl2 + H2'],
];

export function parseStudyEquation(value) {
  const raw = String(value ?? '').replace(/[₀-₉]/g, c => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
    .replace(/[↑↓]/g, '').replace(/\\(?:ce|mathrm)\{([^{}]*)\}/g, '$1');
  const sides = raw.split(/\s*(?:->|→|⟶|=)\s*/);
  if (sides.length !== 2) return null; // equilibrium/ionic/nuclear schemes need separate protocols
  try {
    const parsed = sides.map(side => side.split(/\s*\+\s*/).map(term => {
      const match = term.trim().match(/^(\d+(?:\.\d+)?)?\s*(.+)$/);
      if (!match) throw Error('Empty term');
      const formula = normalizeFormula(match[2]);
      const coefficient = Number(match[1] ?? 1);
      const atoms = parseFormula(formula);
      if (!(coefficient > 0 && coefficient <= 10000)) throw Error('Invalid coefficient');
      return { formula, coefficient, atoms };
    }));
    const totals = parsed.map(side => side.reduce((out, term) => {
      for (const [symbol, count] of Object.entries(term.atoms)) out[symbol] = (out[symbol] ?? 0) + count * term.coefficient;
      return out;
    }, {}));
    if (Object.keys({...totals[0], ...totals[1]}).some(e => Math.abs((totals[0][e] ?? 0) - (totals[1][e] ?? 0)) > 1e-7)) return null;
    return parsed;
  } catch { return null; }
}

const signature = parsed => parsed.map(side => {
  const merged = new Map();
  side.forEach(t => merged.set(t.formula, (merged.get(t.formula) ?? 0) + t.coefficient));
  return [...merged].sort(([a], [b]) => a.localeCompare(b));
});

export function resolveLabExperiment(equation, kind = 'chemical') {
  if (kind && kind !== 'chemical') return null;
  const parsed = parseStudyEquation(equation);
  if (!parsed) return null;
  const actual = signature(parsed);
  for (const [id, reference] of LAB_REACTIONS) {
    const expected = signature(parseStudyEquation(reference));
    let scale;
    const matches = actual.every((side, i) => side.length === expected[i].length && side.every(([formula, coefficient], j) => {
      const [other, amount] = expected[i][j];
      const ratio = coefficient / amount;
      scale ??= ratio;
      return formula === other && Math.abs(ratio - scale) < 1e-7;
    }));
    if (matches) return { id, href: `/lab-3d/?experiment=${encodeURIComponent(id)}`, equation: reference };
  }
  return null;
}
