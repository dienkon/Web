import { parseFormula, normalizeFormula } from './formula.mjs';
import ionicComponents from '../ionic-components.generated.json' with {type:'json'};

export function structureFormula(value) {
  return normalizeFormula(
    String(value).replace(
      /\s*\((?:dil|conc|glacial|dilute|concentrated|solid|liquid|gas|ribbon|powder|granules|dust|filings|nail|turnings|foil|chips|carbon|\d+(?:\.\d+)?%)\)/gi,
      '',
    ),
  )
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻]+$/, '')
    .replace(/[+-]$/, '');
}

export const compositionKey = (formula) =>
  JSON.stringify(
    Object.entries(parseFormula(structureFormula(formula))).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );

const atom = (elem, x, y, z, extra = {}) => ({ elem, x, y, z, ...extra });

const vectors = {
  tetra: [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ].map((v) => v.map((x) => x / Math.sqrt(3))),
  planar: [
    [1, 0, 0],
    [-0.5, Math.sqrt(3) / 2, 0],
    [-0.5, -Math.sqrt(3) / 2, 0],
  ],
  linear: [
    [1, 0, 0],
    [-1, 0, 0],
  ],
  octa: [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
};

const COVALENT_RADII = {
  H: 0.32, He: 0.37, Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Ne: 0.58,
  Na: 1.4, Mg: 1.32, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Ar: 1.06,
  K: 1.65, Ca: 1.5, Sc: 1.44, Ti: 1.36, V: 1.34, Cr: 1.28, Mn: 1.29, Fe: 1.26, Co: 1.24, Ni: 1.21, Cu: 1.28, Zn: 1.22,
  Ga: 1.22, Ge: 1.2, As: 1.19, Se: 1.2, Br: 1.2, Kr: 1.16,
  Rb: 1.75, Sr: 1.65, Ag: 1.38, Cd: 1.4, In: 1.42, Sn: 1.39, Sb: 1.39, Te: 1.38, I: 1.39, Xe: 1.4,
  Cs: 1.9, Ba: 1.75, Pt: 1.36, Au: 1.36, Hg: 1.32, Pb: 1.46, Bi: 1.48,
};

function radiusOf(elem) {
  return COVALENT_RADII[elem] ?? 1.35;
}

function bondDist(a, b, order = 1) {
  const base = radiusOf(a) + radiusOf(b);
  if (order === 3) return Math.max(1.08, base * 0.79);
  if (order === 2) return Math.max(1.14, base * 0.87);
  return Math.max(0.74, base);
}

const same = (a, b) => compositionKey(a) === compositionKey(b);

function normVec(v) {
  const m = Math.hypot(v[0], v[1], v[2]);
  return m > 1e-8 ? [v[0] / m, v[1] / m, v[2] / m] : [1, 0, 0];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function buildAlkylCarboxylate(alkylCarbons, protonated = false, esterCarbons = 0) {
  const atoms = [];
  const bonds = [];
  // Carbonyl C at (0, 0, 0)
  atoms.push(atom('C', 0, 0, 0)); // 0
  // Double-bonded =O at (0.65, 1.02, 0)
  atoms.push(atom('O', 0.65, 1.02, 0)); // 1
  bonds.push({ a: 0, b: 1, order: 2 });
  // Single-bonded -O- at (0.72, -1.04, 0)
  atoms.push(atom('O', 0.72, -1.04, 0)); // 2
  bonds.push({ a: 0, b: 2, order: 1 });

  // Left side: H (if formate) or alkyl chain C_1..C_n
  if (alkylCarbons === 0) {
    atoms.push(atom('H', -1.09, 0.02, 0)); // 3
    bonds.push({ a: 0, b: 3, order: 1 });
  } else {
    let prevIdx = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < alkylCarbons; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      cx -= 1.26;
      cy += sign * 0.48;
      cz += sign * 0.68;
      const cIdx = atoms.length;
      atoms.push(atom('C', cx, cy, cz));
      bonds.push({ a: prevIdx, b: cIdx, order: 1 });

      const isTerminal = i === alkylCarbons - 1;
      const hDirs = isTerminal
        ? [
            [-0.85, sign * 0.45, 0.26],
            [0.15, sign * 0.88, -0.45],
            [0.15, -sign * 0.35, sign * 0.92],
          ]
        : [
            [0.1, sign * 0.85, -0.52],
            [0.1, -sign * 0.42, sign * 0.9],
          ];
      for (const hd of hDirs) {
        const nu = normVec(hd);
        const hIdx = atoms.length;
        atoms.push(atom('H', cx + nu[0] * 1.09, cy + nu[1] * 1.09, cz + nu[2] * 1.09));
        bonds.push({ a: cIdx, b: hIdx, order: 1 });
      }
      prevIdx = cIdx;
    }
  }

  // Right side of O(2): either anionic (donor = 2), -OH (protonated), or ester alkyl chain
  if (protonated) {
    const hIdx = atoms.length;
    atoms.push(atom('H', 1.66, -0.88, 0.15));
    bonds.push({ a: 2, b: hIdx, order: 1 });
  } else if (esterCarbons > 0) {
    let prevIdx = 2;
    let cx = 0.72;
    let cy = -1.04;
    let cz = 0;
    for (let i = 0; i < esterCarbons; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      cx += 1.24;
      cy -= sign * 0.45;
      cz += sign * 0.64;
      const cIdx = atoms.length;
      atoms.push(atom('C', cx, cy, cz));
      bonds.push({ a: prevIdx, b: cIdx, order: 1 });

      const isTerminal = i === esterCarbons - 1;
      const hDirs = isTerminal
        ? [
            [0.85, -sign * 0.45, 0.26],
            [-0.15, -sign * 0.88, -0.45],
            [-0.15, sign * 0.35, sign * 0.92],
          ]
        : [
            [-0.1, -sign * 0.85, -0.52],
            [-0.1, sign * 0.42, sign * 0.9],
          ];
      for (const hd of hDirs) {
        const nu = normVec(hd);
        const hIdx = atoms.length;
        atoms.push(atom('H', cx + nu[0] * 1.09, cy + nu[1] * 1.09, cz + nu[2] * 1.09));
        bonds.push({ a: cIdx, b: hIdx, order: 1 });
      }
      prevIdx = cIdx;
    }
  }

  return { atoms, bonds, donors: [2, 1] };
}

export function template(formula) {
  const f = structureFormula(formula);

  // Carboxylate anions directly by formula
  if (f === 'HCOO' || f === 'CHO2') return buildAlkylCarboxylate(0, false, 0);
  if (f === 'CH3COO' || f === 'C2H3O2') return buildAlkylCarboxylate(1, false, 0);
  if (f === 'C2H5COO' || f === 'C3H5O2') return buildAlkylCarboxylate(2, false, 0);
  if (f === 'C3H7COO' || f === 'C4H7O2') return buildAlkylCarboxylate(3, false, 0);

  // Dichromate Cr2O7^2- (two CrO3 tetrahedra bridged by central O)
  if (same(f, 'Cr2O7')) {
    const atoms = [
      atom('O', 0, 0.48, 0), // 0: bridging O
      atom('Cr', -1.56, -0.28, 0), // 1: left Cr
      atom('Cr', 1.56, -0.28, 0), // 2: right Cr
      atom('O', -1.62, -1.32, 1.24), // 3: =O
      atom('O', -1.62, -1.32, -1.24), // 4: =O
      atom('O', -2.88, 0.68, 0), // 5: -O- (donor)
      atom('O', 1.62, -1.32, 1.24), // 6: =O
      atom('O', 1.62, -1.32, -1.24), // 7: =O
      atom('O', 2.88, 0.68, 0), // 8: -O- (donor)
    ];
    const bonds = [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 1, b: 3, order: 2 },
      { a: 1, b: 4, order: 2 },
      { a: 1, b: 5, order: 1 },
      { a: 2, b: 6, order: 2 },
      { a: 2, b: 7, order: 2 },
      { a: 2, b: 8, order: 1 },
    ];
    return { atoms, bonds, donors: [5, 8, 3, 6] };
  }

  // Thiosulfate S2O3^2- (central S with =S, =O, and two -O-)
  if (same(f, 'S2O3')) {
    const t = vectors.tetra;
    const atoms = [
      atom('S', 0, 0, 0), // 0: central S
      atom('S', t[0][0] * 1.98, t[0][1] * 1.98, t[0][2] * 1.98), // 1: terminal =S
      atom('O', t[1][0] * 1.46, t[1][1] * 1.46, t[1][2] * 1.46), // 2: =O
      atom('O', t[2][0] * 1.51, t[2][1] * 1.51, t[2][2] * 1.51), // 3: -O-
      atom('O', t[3][0] * 1.51, t[3][1] * 1.51, t[3][2] * 1.51), // 4: -O-
    ];
    const bonds = [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
    ];
    return { atoms, bonds, donors: [3, 4, 1, 2] };
  }

  // Oxalate C2O4^2-
  if (same(f, 'C2O4')) {
    const atoms = [
      atom('C', -0.77, 0, 0), // 0
      atom('C', 0.77, 0, 0), // 1
      atom('O', -1.38, 1.06, 0.18), // 2: =O
      atom('O', -1.42, -1.09, -0.18), // 3: -O- (donor)
      atom('O', 1.38, -1.06, 0.18), // 4: =O
      atom('O', 1.42, 1.09, -0.18), // 5: -O- (donor)
    ];
    const bonds = [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 2 },
      { a: 0, b: 3, order: 1 },
      { a: 1, b: 4, order: 2 },
      { a: 1, b: 5, order: 1 },
    ];
    return { atoms, bonds, donors: [3, 5, 2, 4] };
  }

  // Bicarbonate HCO3^-
  if (same(f, 'HCO3')) {
    const p = vectors.planar;
    const atoms = [
      atom('C', 0, 0, 0), // 0
      atom('O', p[0][0] * 1.23, p[0][1] * 1.23, 0), // 1: =O
      atom('O', p[1][0] * 1.28, p[1][1] * 1.28, 0), // 2: -O- (donor)
      atom('O', p[2][0] * 1.35, p[2][1] * 1.35, 0), // 3: -OH
      atom('H', p[2][0] * 1.35 - 0.88, p[2][1] * 1.35 - 0.38, 0.15), // 4: H
    ];
    const bonds = [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
    ];
    return { atoms, bonds, donors: [2, 1] };
  }

  // Bisulfite HSO3^-
  if (same(f, 'HSO3')) {
    const t = vectors.tetra;
    const atoms = [
      atom('S', 0, 0, 0), // 0
      atom('O', t[0][0] * 1.46, t[0][1] * 1.46, t[0][2] * 1.46), // 1: =O
      atom('O', t[1][0] * 1.51, t[1][1] * 1.51, t[1][2] * 1.51), // 2: -O-
      atom('O', t[2][0] * 1.59, t[2][1] * 1.59, t[2][2] * 1.59), // 3: -OH
      atom('H', t[2][0] * 1.59 - 0.55, t[2][1] * 1.59 + 0.78, t[2][2] * 1.59 - 0.18), // 4: H
    ];
    const bonds = [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
    ];
    return { atoms, bonds, donors: [2, 1] };
  }

  // Bisulfate HSO4^-
  if (same(f, 'HSO4')) {
    const t = vectors.tetra;
    const atoms = [
      atom('S', 0, 0, 0), // 0
      atom('O', t[0][0] * 1.44, t[0][1] * 1.44, t[0][2] * 1.44), // 1: =O
      atom('O', t[1][0] * 1.44, t[1][1] * 1.44, t[1][2] * 1.44), // 2: =O
      atom('O', t[2][0] * 1.49, t[2][1] * 1.49, t[2][2] * 1.49), // 3: -O-
      atom('O', t[3][0] * 1.57, t[3][1] * 1.57, t[3][2] * 1.57), // 4: -OH
      atom('H', t[3][0] * 1.57 + 0.52, t[3][1] * 1.57 - 0.8, t[3][2] * 1.57 - 0.16), // 5: H
    ];
    const bonds = [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 4, b: 5, order: 1 },
    ];
    return { atoms, bonds, donors: [3, 1, 2] };
  }

  // Hydrogen phosphate HPO4^2-
  if (same(f, 'HPO4')) {
    const t = vectors.tetra;
    const atoms = [
      atom('P', 0, 0, 0), // 0
      atom('O', t[0][0] * 1.5, t[0][1] * 1.5, t[0][2] * 1.5), // 1: =O
      atom('O', t[1][0] * 1.54, t[1][1] * 1.54, t[1][2] * 1.54), // 2: -O-
      atom('O', t[2][0] * 1.54, t[2][1] * 1.54, t[2][2] * 1.54), // 3: -O-
      atom('O', t[3][0] * 1.59, t[3][1] * 1.59, t[3][2] * 1.59), // 4: -OH
      atom('H', t[3][0] * 1.59 + 0.55, t[3][1] * 1.59 - 0.78, t[3][2] * 1.59 - 0.15), // 5: H
    ];
    const bonds = [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 4, b: 5, order: 1 },
    ];
    return { atoms, bonds, donors: [2, 3, 1] };
  }

  // Dihydrogen phosphate H2PO4^-
  if (same(f, 'H2PO4')) {
    const t = vectors.tetra;
    const atoms = [
      atom('P', 0, 0, 0), // 0
      atom('O', t[0][0] * 1.5, t[0][1] * 1.5, t[0][2] * 1.5), // 1: =O
      atom('O', t[1][0] * 1.54, t[1][1] * 1.54, t[1][2] * 1.54), // 2: -O-
      atom('O', t[2][0] * 1.59, t[2][1] * 1.59, t[2][2] * 1.59), // 3: -OH
      atom('O', t[3][0] * 1.59, t[3][1] * 1.59, t[3][2] * 1.59), // 4: -OH
      atom('H', t[2][0] * 1.59 - 0.55, t[2][1] * 1.59 + 0.78, t[2][2] * 1.59 - 0.15), // 5
      atom('H', t[3][0] * 1.59 + 0.55, t[3][1] * 1.59 - 0.78, t[3][2] * 1.59 - 0.15), // 6
    ];
    const bonds = [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 3, b: 5, order: 1 },
      { a: 4, b: 6, order: 1 },
    ];
    return { atoms, bonds, donors: [2, 1] };
  }

  // Thiocyanate SCN^-
  if (same(f, 'SCN')) {
    return {
      atoms: [atom('S', -1.65, 0, 0), atom('C', 0, 0, 0), atom('N', 1.16, 0, 0)],
      bonds: [
        { a: 0, b: 1, order: 1 },
        { a: 1, b: 2, order: 3 },
      ],
      donors: [0, 2],
    };
  }

  // Cyanide CN^-
  if (same(f, 'CN')) {
    return {
      atoms: [atom('C', -0.58, 0, 0), atom('N', 0.58, 0, 0)],
      bonds: [{ a: 0, b: 1, order: 3 }],
      donors: [0, 1],
    };
  }

  // Hexacyanoferrate [Fe(CN)6]^4-/3-
  if (same(f, 'Fe(CN)6')) {
    const atoms = [atom('Fe', 0, 0, 0)];
    const bonds = [];
    const donors = [];
    for (const d of vectors.octa) {
      const cIdx = atoms.length;
      atoms.push(atom('C', d[0] * 1.92, d[1] * 1.92, d[2] * 1.92));
      const nIdx = atoms.length;
      atoms.push(atom('N', d[0] * 3.08, d[1] * 3.08, d[2] * 3.08));
      bonds.push({ a: 0, b: cIdx, order: 1 });
      bonds.push({ a: cIdx, b: nIdx, order: 3 });
      donors.push(nIdx);
    }
    return { atoms, bonds, donors };
  }

  // Tetrahydroxoaluminate [Al(OH)4]^- and tetrahydroxozincate [Zn(OH)4]^2-
  if (same(f, 'Al(OH)4') || same(f, 'Zn(OH)4')) {
    const m = f.startsWith('Al') ? 'Al' : 'Zn';
    const r = m === 'Al' ? 1.78 : 1.95;
    const atoms = [atom(m, 0, 0, 0)];
    const bonds = [];
    const donors = [];
    for (let i = 0; i < 4; i++) {
      const d = vectors.tetra[i];
      const oIdx = atoms.length;
      const ox = d[0] * r;
      const oy = d[1] * r;
      const oz = d[2] * r;
      atoms.push(atom('O', ox, oy, oz));
      const perp = normVec(cross(d, [0, 0, 1]));
      const hDir = normVec([d[0] * 0.5 + perp[0] * 0.86, d[1] * 0.5 + perp[1] * 0.86, d[2] * 0.5 + perp[2] * 0.86]);
      const hIdx = atoms.length;
      atoms.push(atom('H', ox + hDir[0] * 0.97, oy + hDir[1] * 0.97, oz + hDir[2] * 0.97));
      bonds.push({ a: 0, b: oIdx, order: 1 });
      bonds.push({ a: oIdx, b: hIdx, order: 1 });
      donors.push(oIdx);
    }
    return { atoms, bonds, donors };
  }

  // Standard polyatomic ions & VSEPR templates with realistic bond orders and donor indices
  const definitions = {
    H2O: ['O', ['H', 'H'], [[0.7907, 0, 0.6122], [-0.7907, 0, 0.6122]], 0.958, [1, 1], [0]],
    OH: ['O', ['H'], [[1, 0, 0]], 0.97, [1], [0]],
    H3O: ['O', ['H', 'H', 'H'], vectors.tetra.slice(0, 3), 0.99, [1, 1, 1], [0]],
    NH4: ['N', ['H', 'H', 'H', 'H'], vectors.tetra, 1.03, [1, 1, 1, 1], [1, 2, 3, 4]],
    NH3: ['N', ['H', 'H', 'H'], vectors.tetra.slice(0, 3), 1.02, [1, 1, 1], [0]],
    CH4: ['C', ['H', 'H', 'H', 'H'], vectors.tetra, 1.09, [1, 1, 1, 1], []],
    CO2: ['C', ['O', 'O'], [[1, 0, 0], [-1, 0, 0]], 1.16, [2, 2], [1, 2]],
    CO3: ['C', ['O', 'O', 'O'], vectors.planar, 1.28, [2, 1, 1], [2, 3, 1]],
    NO3: ['N', ['O', 'O', 'O'], vectors.planar, 1.24, [2, 1, 1], [2, 3, 1]],
    NO2: ['N', ['O', 'O'], [[0.84, 0.54, 0], [-0.84, 0.54, 0]], 1.23, [2, 1], [2, 1]],
    SO3: ['S', ['O', 'O', 'O'], vectors.tetra.slice(0, 3), 1.5, [2, 1, 1], [2, 3, 1]],
    SO4: ['S', ['O', 'O', 'O', 'O'], vectors.tetra, 1.48, [2, 2, 1, 1], [3, 4, 1, 2]],
    PO4: ['P', ['O', 'O', 'O', 'O'], vectors.tetra, 1.54, [2, 1, 1, 1], [2, 3, 4, 1]],
    CrO4: ['Cr', ['O', 'O', 'O', 'O'], vectors.tetra, 1.64, [2, 2, 1, 1], [3, 4, 1, 2]],
    MnO4: ['Mn', ['O', 'O', 'O', 'O'], vectors.tetra, 1.61, [2, 2, 2, 1], [4, 1, 2, 3]],
    ClO: ['Cl', ['O'], [[-1, 0, 0]], 1.69, [1], [1]],
    ClO2: ['Cl', ['O', 'O'], [[0.82, 0.57, 0], [-0.82, 0.57, 0]], 1.58, [2, 1], [2, 1]],
    ClO3: ['Cl', ['O', 'O', 'O'], vectors.tetra.slice(0, 3), 1.49, [2, 2, 1], [3, 1, 2]],
    BrO3: ['Br', ['O', 'O', 'O'], vectors.tetra.slice(0, 3), 1.65, [2, 2, 1], [3, 1, 2]],
    IO3: ['I', ['O', 'O', 'O'], vectors.tetra.slice(0, 3), 1.81, [2, 2, 1], [3, 1, 2]],
    ClO4: ['Cl', ['O', 'O', 'O', 'O'], vectors.tetra, 1.45, [2, 2, 2, 1], [4, 1, 2, 3]],
    IO4: ['I', ['O', 'O', 'O', 'O'], vectors.tetra, 1.78, [2, 2, 2, 1], [4, 1, 2, 3]],
    AlO2: ['Al', ['O', 'O'], [[0.86, 0.5, 0], [-0.86, 0.5, 0]], 1.74, [2, 1], [2, 1]],
    SiO3: ['Si', ['O', 'O', 'O'], vectors.planar, 1.62, [2, 1, 1], [2, 3, 1]],
  };

  const key = Object.keys(definitions).find((k) => same(k, f));
  if (!key) return null;
  const [center, neighbors, directions, length, orders, donors] = definitions[key];
  return {
    atoms: [
      atom(center, 0, 0, 0),
      ...neighbors.map((e, i) => atom(e, ...directions[i].map((v) => v * length))),
    ],
    bonds: neighbors.map((_, i) => ({ a: 0, b: i + 1, order: orders?.[i] ?? 1 })),
    donors: donors ?? neighbors.map((_, i) => i + 1),
  };
}

// Known salt / ionic decomposition for formulas without explicit `record.ions`
function inferSaltIons(formula) {
  const f = structureFormula(formula);
  const directMap = {
    KMnO4: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'MnO4', count: 1, charge: -1 }],
    K2Cr2O7: [{ formula: 'K', count: 2, charge: 1 }, { formula: 'Cr2O7', count: 1, charge: -2 }],
    Na2Cr2O7: [{ formula: 'Na', count: 2, charge: 1 }, { formula: 'Cr2O7', count: 1, charge: -2 }],
    Na2S2O3: [{ formula: 'Na', count: 2, charge: 1 }, { formula: 'S2O3', count: 1, charge: -2 }],
    KSCN: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'SCN', count: 1, charge: -1 }],
    NaSCN: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'SCN', count: 1, charge: -1 }],
    NH4SCN: [{ formula: 'NH4', count: 1, charge: 1 }, { formula: 'SCN', count: 1, charge: -1 }],
    KCN: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'CN', count: 1, charge: -1 }],
    NaCN: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'CN', count: 1, charge: -1 }],
    Na2HPO4: [{ formula: 'Na', count: 2, charge: 1 }, { formula: 'HPO4', count: 1, charge: -2 }],
    K2HPO4: [{ formula: 'K', count: 2, charge: 1 }, { formula: 'HPO4', count: 1, charge: -2 }],
    NaH2PO4: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'H2PO4', count: 1, charge: -1 }],
    KH2PO4: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'H2PO4', count: 1, charge: -1 }],
    NaHSO3: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'HSO3', count: 1, charge: -1 }],
    KHSO3: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'HSO3', count: 1, charge: -1 }],
    NaHSO4: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'HSO4', count: 1, charge: -1 }],
    KHSO4: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'HSO4', count: 1, charge: -1 }],
    KIO3: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'IO3', count: 1, charge: -1 }],
    NaIO3: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'IO3', count: 1, charge: -1 }],
    KClO3: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'ClO3', count: 1, charge: -1 }],
    NaClO3: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'ClO3', count: 1, charge: -1 }],
    KClO4: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'ClO4', count: 1, charge: -1 }],
    NaClO: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'ClO', count: 1, charge: -1 }],
    KNO2: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'NO2', count: 1, charge: -1 }],
    NaNO2: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'NO2', count: 1, charge: -1 }],
    NaAlO2: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'AlO2', count: 1, charge: -1 }],
    'NaAl(OH)4': [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'Al(OH)4', count: 1, charge: -1 }],
    'Na2Zn(OH)4': [{ formula: 'Na', count: 2, charge: 1 }, { formula: 'Zn(OH)4', count: 1, charge: -2 }],
    'K4[Fe(CN)6]': [{ formula: 'K', count: 4, charge: 1 }, { formula: 'Fe(CN)6', count: 1, charge: -4 }],
    'K3[Fe(CN)6]': [{ formula: 'K', count: 3, charge: 1 }, { formula: 'Fe(CN)6', count: 1, charge: -3 }],
    'Al2(SO4)3': [{ formula: 'Al', count: 2, charge: 3 }, { formula: 'SO4', count: 3, charge: -2 }],
    'Fe2(SO4)3': [{ formula: 'Fe', count: 2, charge: 3 }, { formula: 'SO4', count: 3, charge: -2 }],
    'Cr2(SO4)3': [{ formula: 'Cr', count: 2, charge: 3 }, { formula: 'SO4', count: 3, charge: -2 }],
    NaOH: [{ formula: 'Na', count: 1, charge: 1 }, { formula: 'OH', count: 1, charge: -1 }],
    KOH: [{ formula: 'K', count: 1, charge: 1 }, { formula: 'OH', count: 1, charge: -1 }],
    LiOH: [{ formula: 'Li', count: 1, charge: 1 }, { formula: 'OH', count: 1, charge: -1 }],
  };
  return directMap[f] ?? ionicComponents.entries[f] ?? null;
}

// These layouts count components; they do not predict crystal coordination.
function componentDefinitionMatches(parts, formula, allowCharge = false) {
  try {
    const counts = {}; let charge = 0;
    for (const part of parts) {
      if (!Number.isInteger(part.count) || part.count < 1 || !Number.isInteger(part.charge)) return false;
      for (const [element, n] of Object.entries(parseFormula(structureFormula(part.formula)))) counts[element] = (counts[element] ?? 0) + n * part.count;
      charge += part.count * part.charge;
    }
    const key = c => JSON.stringify(Object.entries(c).sort(([a], [b]) => a.localeCompare(b)));
    return (allowCharge || charge === 0) && key(counts) === key(parseFormula(structureFormula(formula)));
  } catch { return false; }
}

function buildComponentLayout(parts) {
  const total = parts.reduce((n, part) => n + part.count, 0);
  if (total > 1000) throw new Error('Quá nhiều nhóm để hiển thị.');
  const units = [];
  for (const part of parts) {
    let known = template(part.formula);
    if (part.formula === 'O2' && part.charge === -2) known = {
      atoms: [atom('O', -.745, 0, 0), atom('O', .745, 0, 0)], bonds: [{a: 0, b: 1, order: 1}],
    };
    const model = known ?? composition(part.formula);
    const bounds = ['x', 'y', 'z'].map(axis => [Math.min(...model.atoms.map(a => a[axis])), Math.max(...model.atoms.map(a => a[axis]))]);
    for (let i = 0; i < part.count; i++) units.push({part, model, bounds, connectivity: model.atoms.length === 1 ? 'monatomic' : known ? 'idealized' : 'composition'});
  }
  const columns = Math.ceil(Math.sqrt(total)), width = Math.max(0, ...units.map(u => u.bounds[0][1] - u.bounds[0][0])) + 3.6;
  const height = Math.max(0, ...units.map(u => u.bounds[1][1] - u.bounds[1][0])) + 3.6;
  const atoms = [], bonds = [], groups = [];
  units.forEach(({part, model, bounds, connectivity}, id) => {
    const offset = atoms.length, shift = [(id % columns) * width, -Math.floor(id / columns) * height, 0];
    for (const a of model.atoms) atoms.push({...a, ...Object.fromEntries(['x', 'y', 'z'].map((axis, k) => [axis, a[axis] - (bounds[k][0] + bounds[k][1]) / 2 + shift[k]])), componentGroup: id});
    for (const b of model.bonds) bonds.push({...b, a: b.a + offset, b: b.b + offset});
    groups.push({id, formula: part.formula, charge: part.charge, connectivity, atomIndices: model.atoms.map((_, i) => offset + i)});
  });
  return {atoms, bonds, groups};
}

function buildHydrate(rawFormula, suppliedIons) {
  const match = String(rawFormula).trim().replace(/•/g, '·').match(/^(.+?)[·.](\d*)H2O$/i);
  if (!match) return null;
  const base = structureFormula(match[1]), waterCount = Number(match[2] || 1);
  if (!waterCount || waterCount > 512) return null;
  const parts = suppliedIons?.length && componentDefinitionMatches(suppliedIons, base) ? suppliedIons : inferSaltIons(base) ?? [{formula: base, charge: 0, count: 1}];
  return buildComponentLayout([...parts, {formula: 'H2O', charge: 0, count: waterCount}]);
}

// Build inorganic oxides, peroxides, oxyacids, and binary molecules
function buildInorganicMolecule(formula) {
  const f = structureFormula(formula);
  const counts = parseFormula(f);
  const symbols = Object.keys(counts);

  // Homonuclear diatomics & polyatomics: H2, O2, N2, F2, Cl2, Br2, I2, O3, P4, S8
  if (symbols.length === 1) {
    const elem = symbols[0];
    const n = counts[elem];
    if (n === 2) {
      const order = elem === 'N' ? 3 : elem === 'O' ? 2 : 1;
      const d = bondDist(elem, elem, order);
      return {
        atoms: [atom(elem, -d / 2, 0, 0), atom(elem, d / 2, 0, 0)],
        bonds: [{ a: 0, b: 1, order }],
      };
    }
    if (elem === 'O' && n === 3) {
      return {
        atoms: [atom('O', 0, 0.44, 0), atom('O', -1.08, -0.22, 0), atom('O', 1.08, -0.22, 0)],
        bonds: [
          { a: 0, b: 1, order: 2 },
          { a: 0, b: 2, order: 1 },
        ],
      };
    }
    if (elem === 'P' && n === 4) {
      const r = 1.35;
      return {
        atoms: vectors.tetra.map((v) => atom('P', v[0] * r, v[1] * r, v[2] * r)),
        bonds: [
          { a: 0, b: 1, order: 1 },
          { a: 0, b: 2, order: 1 },
          { a: 0, b: 3, order: 1 },
          { a: 1, b: 2, order: 1 },
          { a: 1, b: 3, order: 1 },
          { a: 2, b: 3, order: 1 },
        ],
      };
    }
  }

  // Oxalic acid H2C2O4
  if (same(f, 'H2C2O4')) {
    const ox = template('C2O4');
    const atoms = [...ox.atoms];
    const bonds = [...ox.bonds];
    const h1 = atoms.length;
    atoms.push(atom('H', -2.35, -0.95, -0.25));
    bonds.push({ a: 3, b: h1, order: 1 });
    const h2 = atoms.length;
    atoms.push(atom('H', 2.35, 0.95, -0.25));
    bonds.push({ a: 5, b: h2, order: 1 });
    return { atoms, bonds };
  }

  // Sulfurous acid H2SO3
  if (same(f, 'H2SO3')) {
    const t = vectors.tetra;
    const atoms = [
      atom('S', 0, 0, 0), // 0
      atom('O', t[0][0] * 1.46, t[0][1] * 1.46, t[0][2] * 1.46), // 1: =O
      atom('O', t[1][0] * 1.6, t[1][1] * 1.6, t[1][2] * 1.6), // 2: -OH
      atom('O', t[2][0] * 1.6, t[2][1] * 1.6, t[2][2] * 1.6), // 3: -OH
      atom('H', t[1][0] * 1.6 + 0.55, t[1][1] * 1.6 - 0.78, t[1][2] * 1.6 + 0.15), // 4
      atom('H', t[2][0] * 1.6 - 0.55, t[2][1] * 1.6 + 0.78, t[2][2] * 1.6 - 0.15), // 5
    ];
    return {
      atoms,
      bonds: [
        { a: 0, b: 1, order: 2 },
        { a: 0, b: 2, order: 1 },
        { a: 0, b: 3, order: 1 },
        { a: 2, b: 4, order: 1 },
        { a: 3, b: 5, order: 1 },
      ],
    };
  }

  // Hydrogen peroxide H2O2
  if (same(f, 'H2O2')) {
    return {
      atoms: [
        atom('O', -0.73, 0, 0),
        atom('O', 0.73, 0, 0),
        atom('H', -1.02, 0.88, 0.25),
        atom('H', 1.02, -0.45, 0.8),
      ],
      bonds: [
        { a: 0, b: 1, order: 1 },
        { a: 0, b: 2, order: 1 },
        { a: 1, b: 3, order: 1 },
      ],
    };
  }

  // Binary compounds (2 elements)
  if (symbols.length === 2) {
    // Diatomic heteronuclear: HF, HCl, HBr, HI, CO, NO, CuO, CaO, MgO, FeO, ZnO, BaO, SrO, MnO, CoO, NiO, CdO, PbO, FeS, CuS, ZnS, etc.
    if (counts[symbols[0]] === 1 && counts[symbols[1]] === 1) {
      const [e1, e2] = symbols;
      const isHX = e1 === 'H' || e2 === 'H';
      const order =
        same(f, 'CO') ? 3 : !isHX && (e1 === 'O' || e2 === 'O' || e1 === 'S' || e2 === 'S') ? 2 : 1;
      const d = bondDist(e1, e2, order);
      return {
        atoms: [atom(e1, -d / 2, 0, 0), atom(e2, d / 2, 0, 0)],
        bonds: [{ a: 0, b: 1, order }],
      };
    }

    // Oxides and Sulfides M_a O_b / M_a S_b
    const chalc = symbols.find((s) => s === 'O' || s === 'S');
    const other = symbols.find((s) => s !== chalc);
    if (chalc && other && other !== 'H' && other !== 'C') {
      const mCount = counts[other];
      const oCount = counts[chalc];

      // M O2 (SO2, MnO2, SiO2, TiO2, NO2, PbO2, SnO2)
      if (mCount === 1 && oCount === 2) {
        const d = bondDist(other, chalc, 2);
        const isBent = ['S', 'Se', 'N', 'O'].includes(other);
        const dirs = isBent ? [[0.86, 0.5, 0], [-0.86, 0.5, 0]] : [[1, 0, 0], [-1, 0, 0]];
        return {
          atoms: [
            atom(other, 0, 0, 0),
            atom(chalc, dirs[0][0] * d, dirs[0][1] * d, 0),
            atom(chalc, dirs[1][0] * d, dirs[1][1] * d, 0),
          ],
          bonds: [
            { a: 0, b: 1, order: 2 },
            { a: 0, b: 2, order: 2 },
          ],
        };
      }

      // M O3 (SO3, CrO3, WO3)
      if (mCount === 1 && oCount === 3) {
        const d = bondDist(other, chalc, 2);
        return {
          atoms: [
            atom(other, 0, 0, 0),
            ...vectors.planar.map((v) => atom(chalc, v[0] * d, v[1] * d, 0)),
          ],
          bonds: [
            { a: 0, b: 1, order: 2 },
            { a: 0, b: 2, order: 2 },
            { a: 0, b: 3, order: 2 },
          ],
        };
      }

      // M2 O (Na2O, K2O, Li2O, Ag2O, N2O, Cu2O)
      if (mCount === 2 && oCount === 1) {
        const d = bondDist(other, chalc, 1);
        return {
          atoms: [
            atom(chalc, 0, 0.35, 0),
            atom(other, -d * 0.85, -0.35, 0),
            atom(other, d * 0.85, -0.35, 0),
          ],
          bonds: [
            { a: 0, b: 1, order: 1 },
            { a: 0, b: 2, order: 1 },
          ],
        };
      }

      // M2 O3 (Fe2O3, Al2O3, Cr2O3, B2O3, N2O3, As2O3) — bridged O=M-O-M=O
      if (mCount === 2 && oCount === 3) {
        const dBridge = bondDist(other, chalc, 1);
        const dTerm = bondDist(other, chalc, 2);
        return {
          atoms: [
            atom(chalc, 0, 0.55, 0), // 0: bridging O
            atom(other, -dBridge * 0.84, -0.3, 0), // 1: M1
            atom(other, dBridge * 0.84, -0.3, 0), // 2: M2
            atom(chalc, -dBridge * 0.84 - dTerm * 0.78, 0.45, 0.45), // 3: terminal =O
            atom(chalc, dBridge * 0.84 + dTerm * 0.78, 0.45, -0.45), // 4: terminal =O
          ],
          bonds: [
            { a: 0, b: 1, order: 1 },
            { a: 0, b: 2, order: 1 },
            { a: 1, b: 3, order: 2 },
            { a: 2, b: 4, order: 2 },
          ],
        };
      }

      // M2 O5 (P2O5, N2O5, V2O5) — O2M-O-MO2
      if (mCount === 2 && oCount === 5) {
        const dBridge = bondDist(other, chalc, 1);
        const dTerm = bondDist(other, chalc, 2);
        return {
          atoms: [
            atom(chalc, 0, 0.55, 0), // 0: bridging O
            atom(other, -dBridge * 0.86, -0.25, 0), // 1: M1
            atom(other, dBridge * 0.86, -0.25, 0), // 2: M2
            atom(chalc, -dBridge * 0.86 - dTerm * 0.65, 0.55, dTerm * 0.65),
            atom(chalc, -dBridge * 0.86 - dTerm * 0.65, -1.05, -dTerm * 0.65),
            atom(chalc, dBridge * 0.86 + dTerm * 0.65, 0.55, -dTerm * 0.65),
            atom(chalc, dBridge * 0.86 + dTerm * 0.65, -1.05, dTerm * 0.65),
          ],
          bonds: [
            { a: 0, b: 1, order: 1 },
            { a: 0, b: 2, order: 1 },
            { a: 1, b: 3, order: 2 },
            { a: 1, b: 4, order: 2 },
            { a: 2, b: 5, order: 2 },
            { a: 2, b: 6, order: 2 },
          ],
        };
      }
    }
  }

  return null;
}

// Build organic molecules (esters, carboxylic acids, alcohols, glycerol, starch unit, methyl orange, alkanes, alkenes, alkynes)
function buildOrganicMolecule(formula) {
  const f = structureFormula(formula);
  const counts = parseFormula(f);

  // 1. Condensed Esters: R1COOR2 (HCOOCH3 .. C3H7COOC4H9)
  const esterMatch = f.match(/^(H|C\d*H\d+)COO(C\d*H\d+)$/);
  if (esterMatch) {
    const r1 = esterMatch[1];
    const r2 = esterMatch[2];
    const n1 = r1 === 'H' ? 0 : Number(r1.match(/^C(\d*)/)?.[1] || 1);
    const n2 = Number(r2.match(/^C(\d*)/)?.[1] || 1);
    const model = buildAlkylCarboxylate(n1, false, n2);
    const actual = {};
    for (const a of model.atoms) actual[a.elem] = (actual[a.elem] ?? 0) + 1;
    if (JSON.stringify(Object.entries(actual).sort()) === JSON.stringify(Object.entries(counts).sort())) {
      return model;
    }
  }

  // 2. Condensed Carboxylic Acids: RCOOH (HCOOH, CH3COOH, C2H5COOH, C3H7COOH)
  const acidMatch = f.match(/^(H|C\d*H\d+)COOH$/);
  if (acidMatch) {
    const r1 = acidMatch[1];
    const n1 = r1 === 'H' ? 0 : Number(r1.match(/^C(\d*)/)?.[1] || 1);
    const model = buildAlkylCarboxylate(n1, true, 0);
    const actual = {};
    for (const a of model.atoms) actual[a.elem] = (actual[a.elem] ?? 0) + 1;
    if (JSON.stringify(Object.entries(actual).sort()) === JSON.stringify(Object.entries(counts).sort())) {
      return model;
    }
  }

  // 3. Glycerol C3H5(OH)3 / C3H8O3
  if (f === 'C3H5(OH)3' || same(f, 'C3H8O3')) {
    const atoms = [
      atom('C', -1.26, -0.25, 0), // 0: C1
      atom('C', 0, 0.55, 0), // 1: C2
      atom('C', 1.26, -0.25, 0), // 2: C3
      atom('O', -2.38, 0.62, 0.25), // 3: O1
      atom('O', 0, 1.42, 1.12), // 4: O2
      atom('O', 2.38, 0.62, -0.25), // 5: O3
      atom('H', -3.18, 0.12, 0.42), // 6: HO1
      atom('H', 0.78, 1.98, 1.18), // 7: HO2
      atom('H', 3.18, 0.12, -0.42), // 8: HO3
      atom('H', -1.28, -0.92, 0.88), // 9: H on C1
      atom('H', -1.28, -0.92, -0.88), // 10: H on C1
      atom('H', 0, 1.18, -0.92), // 11: H on C2
      atom('H', 1.28, -0.92, 0.88), // 12: H on C3
      atom('H', 1.28, -0.92, -0.88), // 13: H on C3
    ];
    const bonds = [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 1, b: 4, order: 1 },
      { a: 2, b: 5, order: 1 },
      { a: 3, b: 6, order: 1 },
      { a: 4, b: 7, order: 1 },
      { a: 5, b: 8, order: 1 },
      { a: 0, b: 9, order: 1 },
      { a: 0, b: 10, order: 1 },
      { a: 1, b: 11, order: 1 },
      { a: 2, b: 12, order: 1 },
      { a: 2, b: 13, order: 1 },
    ];
    return { atoms, bonds };
  }

  // 4. Starch repeating glucopyranose unit C6H10O5
  if (same(f, 'C6H10O5')) {
    // 6-membered chair pyranose ring (C1-C2-C3-C4-C5-O5) + C6 + O1,O2,O3,O6 + 10 H
    const atoms = [
      atom('C', 1.25, -0.68, 0.22), // 0: C1
      atom('C', 1.25, 0.78, -0.24), // 1: C2
      atom('C', 0, 1.48, 0.26), // 2: C3
      atom('C', -1.25, 0.72, -0.22), // 3: C4
      atom('C', -1.18, -0.74, 0.24), // 4: C5
      atom('O', 0.04, -1.35, -0.22), // 5: O5 (ring oxygen)
      atom('C', -2.42, -1.52, -0.18), // 6: C6 (exocyclic CH2)
      atom('O', 2.42, -1.35, -0.22), // 7: O1
      atom('O', 2.42, 1.45, 0.22), // 8: O2
      atom('O', 0, 2.84, -0.18), // 9: O3
      atom('O', -3.6, -0.88, 0.25), // 10: O6
      // 10 Hydrogens
      atom('H', 1.25, -0.72, 1.31), // 11: H(C1)
      atom('H', 1.25, 0.82, -1.33), // 12: H(C2)
      atom('H', 0, 1.48, 1.35), // 13: H(C3)
      atom('H', -1.28, 0.76, -1.31), // 14: H(C4)
      atom('H', -1.18, -0.76, 1.33), // 15: H(C5)
      atom('H', -2.42, -2.52, 0.28), // 16: H1(C6)
      atom('H', -2.42, -1.62, -1.27), // 17: H2(C6)
      atom('H', 3.18, 0.92, 0.48), // 18: H(O2)
      atom('H', -0.78, 3.32, 0.12), // 19: H(O3)
      atom('H', -4.36, -1.4, 0.02), // 20: H(O6)
    ];
    const bonds = [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 1 },
      { a: 5, b: 0, order: 1 },
      { a: 4, b: 6, order: 1 },
      { a: 0, b: 7, order: 1 },
      { a: 7, b: 3, order: 1 }, // anhydro 1,4-bridge representing repeating unit connectivity
      { a: 1, b: 8, order: 1 },
      { a: 2, b: 9, order: 1 },
      { a: 6, b: 10, order: 1 },
      { a: 0, b: 11, order: 1 },
      { a: 1, b: 12, order: 1 },
      { a: 2, b: 13, order: 1 },
      { a: 3, b: 14, order: 1 },
      { a: 4, b: 15, order: 1 },
      { a: 6, b: 16, order: 1 },
      { a: 6, b: 17, order: 1 },
      { a: 8, b: 18, order: 1 },
      { a: 9, b: 19, order: 1 },
      { a: 10, b: 20, order: 1 },
    ];
    return { atoms, bonds };
  }

  // 5. Methyl Orange C14H14N3NaO3S: (CH3)2N-C6H4-N=N-C6H4-SO3Na
  if (same(f, 'C14H14N3NaO3S')) {
    const atoms = [];
    const bonds = [];
    // Azo bridge N0=N1 near center
    atoms.push(atom('N', -0.55, -0.25, 0)); // 0: N_azo_1
    atoms.push(atom('N', 0.55, 0.25, 0)); // 1: N_azo_2
    bonds.push({ a: 0, b: 1, order: 2 });

    // Left benzene ring (center at x = -3.2, y = -0.25)
    const r = 1.39;
    const leftCenter = [-3.25, -0.25, 0];
    const leftAngles = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);
    const leftC = [];
    for (let i = 0; i < 6; i++) {
      const idx = atoms.length;
      leftC.push(idx);
      atoms.push(atom('C', leftCenter[0] + Math.cos(leftAngles[i]) * r, leftCenter[1] + Math.sin(leftAngles[i]) * r, 0));
    }
    for (let i = 0; i < 6; i++) {
      bonds.push({ a: leftC[i], b: leftC[(i + 1) % 6], order: i % 2 === 0 ? 2 : 1 });
    }
    bonds.push({ a: 0, b: leftC[0], order: 1 });
    // H on left ring C[1], C[2], C[4], C[5]
    for (const ci of [1, 2, 4, 5]) {
      const hIdx = atoms.length;
      atoms.push(
        atom(
          'H',
          leftCenter[0] + Math.cos(leftAngles[ci]) * (r + 1.08),
          leftCenter[1] + Math.sin(leftAngles[ci]) * (r + 1.08),
          0,
        ),
      );
      bonds.push({ a: leftC[ci], b: hIdx, order: 1 });
    }
    // Para -N(CH3)2 on leftC[3]
    const nMeIdx = atoms.length;
    atoms.push(atom('N', leftCenter[0] - r - 1.38, leftCenter[1], 0));
    bonds.push({ a: leftC[3], b: nMeIdx, order: 1 });
    for (const s of [1, -1]) {
      const cMeIdx = atoms.length;
      const mx = leftCenter[0] - r - 2.12;
      const my = leftCenter[1] + s * 1.22;
      const mz = s * 0.25;
      atoms.push(atom('C', mx, my, mz));
      bonds.push({ a: nMeIdx, b: cMeIdx, order: 1 });
      const hOffsets = [
        [-0.85, s * 0.65, 0.22],
        [0.2, s * 0.85, -0.65],
        [-0.25, s * 0.15, s * 1.02],
      ];
      for (const ho of hOffsets) {
        const hIdx = atoms.length;
        atoms.push(atom('H', mx + ho[0], my + ho[1], mz + ho[2]));
        bonds.push({ a: cMeIdx, b: hIdx, order: 1 });
      }
    }

    // Right benzene ring (center at x = +3.25, y = +0.25)
    const rightCenter = [3.25, 0.25, 0];
    const rightAngles = [180, 120, 60, 0, 300, 240].map((d) => (d * Math.PI) / 180);
    const rightC = [];
    for (let i = 0; i < 6; i++) {
      const idx = atoms.length;
      rightC.push(idx);
      atoms.push(atom('C', rightCenter[0] + Math.cos(rightAngles[i]) * r, rightCenter[1] + Math.sin(rightAngles[i]) * r, 0));
    }
    for (let i = 0; i < 6; i++) {
      bonds.push({ a: rightC[i], b: rightC[(i + 1) % 6], order: i % 2 === 0 ? 2 : 1 });
    }
    bonds.push({ a: 1, b: rightC[0], order: 1 });
    for (const ci of [1, 2, 4, 5]) {
      const hIdx = atoms.length;
      atoms.push(
        atom(
          'H',
          rightCenter[0] + Math.cos(rightAngles[ci]) * (r + 1.08),
          rightCenter[1] + Math.sin(rightAngles[ci]) * (r + 1.08),
          0,
        ),
      );
      bonds.push({ a: rightC[ci], b: hIdx, order: 1 });
    }
    // Para -SO3Na on rightC[3]
    const sIdx = atoms.length;
    const sx = rightCenter[0] + r + 1.76;
    const sy = rightCenter[1];
    atoms.push(atom('S', sx, sy, 0));
    bonds.push({ a: rightC[3], b: sIdx, order: 1 });
    const o1Idx = atoms.length;
    atoms.push(atom('O', sx + 0.55, sy + 1.22, 0.58));
    bonds.push({ a: sIdx, b: o1Idx, order: 2 });
    const o2Idx = atoms.length;
    atoms.push(atom('O', sx + 0.55, sy - 1.22, 0.58));
    bonds.push({ a: sIdx, b: o2Idx, order: 2 });
    const o3Idx = atoms.length;
    atoms.push(atom('O', sx + 0.92, sy, -1.18));
    bonds.push({ a: sIdx, b: o3Idx, order: 1 });
    const naIdx = atoms.length;
    atoms.push(atom('Na', sx + 2.48, sy, -1.65));
    bonds.push({ a: o3Idx, b: naIdx, order: 1 });

    return { atoms, bonds };
  }

  // 6. Alkanes, 1-Alkenes, 1-Alkynes, and saturated Alcohols (C_n H_m [O])
  const keys = Object.keys(counts);
  const nC = counts.C ?? 0;
  const nH = counts.H ?? 0;
  const nO = counts.O ?? 0;

  // Saturated Alcohols C_n H_{2n+2} O (or CH3CH2...OH)
  if (nC >= 1 && nO === 1 && keys.length === 3 && nH === 2 * nC + 2) {
    const atoms = [];
    const bonds = [];
    let prevIdx = -1;
    for (let i = 0; i < nC; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      const cx = i * 1.27;
      const cy = sign * 0.44;
      const cz = sign * 0.25;
      const cIdx = atoms.length;
      atoms.push(atom('C', cx, cy, cz));
      if (prevIdx >= 0) bonds.push({ a: prevIdx, b: cIdx, order: 1 });
      const hDirs =
        i === 0 && nC > 1
          ? [
              [-0.88, 0.42, 0.2],
              [0.12, 0.88, -0.45],
              [0.12, -0.38, 0.92],
            ]
          : i === 0 && nC === 1
            ? [
                [-0.88, 0.42, 0.2],
                [-0.25, 0.88, -0.45],
                [-0.25, -0.82, 0.52],
              ]
            : [
                [0.1, sign * 0.88, -0.46],
                [0.1, -sign * 0.4, sign * 0.91],
              ];
      for (const hd of hDirs) {
        const nu = normVec(hd);
        const hIdx = atoms.length;
        atoms.push(atom('H', cx + nu[0] * 1.09, cy + nu[1] * 1.09, cz + nu[2] * 1.09));
        bonds.push({ a: cIdx, b: hIdx, order: 1 });
      }
      prevIdx = cIdx;
    }
    const lastC = atoms[prevIdx];
    const oIdx = atoms.length;
    atoms.push(atom('O', lastC.x + 1.24, lastC.y - 0.52, lastC.z + 0.35));
    bonds.push({ a: prevIdx, b: oIdx, order: 1 });
    const hIdx = atoms.length;
    atoms.push(atom('H', lastC.x + 2.08, lastC.y - 0.12, lastC.z + 0.58));
    bonds.push({ a: oIdx, b: hIdx, order: 1 });
    return { atoms, bonds };
  }

  // Hydrocarbons C_n H_m (nC >= 2, <= 60)
  if (keys.length === 2 && nC >= 2 && nC <= 60 && nH >= 2) {
    // Alkane: C_n H_{2n+2}
    // Alkene: C_n H_{2n}
    // Alkyne: C_n H_{2n-2}
    const firstBondOrder = nH === 2 * nC + 2 ? 1 : nH === 2 * nC ? 2 : nH === 2 * nC - 2 ? 3 : 0;
    if (firstBondOrder > 0) {
      const atoms = [];
      const bonds = [];
      for (let i = 0; i < nC; i++) {
        const sign = i % 2 === 0 ? 1 : -1;
        let cx = i * 1.28;
        let cy = sign * 0.45;
        let cz = sign * 0.22;
        if (i === 0) {
          cx = 0;
          cy = 0;
          cz = 0;
        } else if (i === 1) {
          cx = firstBondOrder === 3 ? 1.2 : firstBondOrder === 2 ? 1.34 : 1.53;
          cy = 0;
          cz = 0;
        }
        const cIdx = atoms.length;
        atoms.push(atom('C', cx, cy, cz));
        if (i > 0) {
          bonds.push({ a: i - 1, b: cIdx, order: i === 1 ? firstBondOrder : 1 });
        }
      }

      // Attach hydrogens to each carbon to match exact valence & total H
      for (let i = 0; i < nC; i++) {
        const c = atoms[i];
        let hCount = 2;
        if (i === 0) {
          hCount = 4 - firstBondOrder;
        } else if (i === 1) {
          hCount = (nC === 2 ? 4 : 3) - firstBondOrder;
        } else if (i === nC - 1) {
          hCount = 3;
        }

        const sign = i % 2 === 0 ? 1 : -1;
        let hDirs = [];
        if (i === 0) {
          if (hCount === 1) hDirs = [[-1, 0, 0]];
          else if (hCount === 2) hDirs = [[-0.5, 0.866, 0], [-0.5, -0.866, 0]];
          else hDirs = [[-0.86, 0.48, 0.18], [-0.28, -0.88, 0.38], [-0.28, 0.35, -0.9]];
        } else if (i === 1 && firstBondOrder > 1) {
          if (hCount === 1) hDirs = [[0.5, 0.866, 0]];
          else if (hCount === 2) hDirs = [[0.5, 0.866, 0], [0.5, -0.866, 0]];
        } else if (i === nC - 1) {
          hDirs = [
            [0.86, -sign * 0.45, 0.22],
            [-0.18, sign * 0.88, -0.44],
            [-0.18, -sign * 0.38, sign * 0.91],
          ];
        } else {
          hDirs = [
            [0.08, sign * 0.88, -0.46],
            [0.08, -sign * 0.4, sign * 0.91],
          ];
        }

        for (let k = 0; k < hCount; k++) {
          const nu = normVec(hDirs[k]);
          const hIdx = atoms.length;
          atoms.push(atom('H', c.x + nu[0] * 1.09, c.y + nu[1] * 1.09, c.z + nu[2] * 1.09));
          bonds.push({ a: i, b: hIdx, order: 1 });
        }
      }
      return { atoms, bonds };
    }
  }

  return null;
}

// General valence-guided 3D molecular graph builder for arbitrary formulas up to 250 atoms
function buildValenceGraph(formula) {
  const counts = parseFormula(structureFormula(formula));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total <= 1 || total > 250) return null;

  const MONOVALENT = new Set(['H', 'F', 'Cl', 'Br', 'I', 'Li', 'Na', 'K', 'Rb', 'Cs']);
  const VALENCE = {
    C: 4, Si: 4, Ge: 4, Sn: 4, Pb: 4,
    N: 3, P: 5, As: 3, Sb: 3, Bi: 3,
    O: 2, S: 6, Se: 4, Te: 4,
    B: 3, Al: 3, Ga: 3, In: 3,
    Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Zn: 2, Cd: 2, Hg: 2, Cu: 2, Ni: 2, Co: 2, Mn: 4, Fe: 3, Cr: 3,
  };

  const backboneElems = [];
  const terminalElems = [];
  for (const [elem, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      if (MONOVALENT.has(elem)) terminalElems.push(elem);
      else backboneElems.push(elem);
    }
  }

  // If all atoms are monovalent (e.g. NaH, LiCl, H2), connect in pairs
  if (backboneElems.length === 0) {
    const atoms = [];
    const bonds = [];
    for (let i = 0; i < terminalElems.length; i++) {
      const elem = terminalElems[i];
      atoms.push(atom(elem, i * 1.6, (i % 2) * 0.4, 0));
      if (i > 0) bonds.push({ a: i - 1, b: i, order: 1 });
    }
    return { atoms, bonds };
  }

  // Sort backbone so higher-valence centers (C, P, S, Si, metals, N, O) form the core spine
  backboneElems.sort((a, b) => (VALENCE[b] ?? 2) - (VALENCE[a] ?? 2));
  const atoms = [];
  const bonds = [];

  for (let i = 0; i < backboneElems.length; i++) {
    const elem = backboneElems[i];
    const sign = i % 2 === 0 ? 1 : -1;
    const x = i * 1.38;
    const y = sign * 0.48;
    const z = ((i % 3) - 1) * 0.35;
    atoms.push(atom(elem, x, y, z));
    if (i > 0) {
      bonds.push({ a: i - 1, b: i, order: 1 });
    }
  }

  // Distribute terminal atoms across backbone atoms around tetrahedral/octahedral directions
  const bCount = backboneElems.length;
  for (let t = 0; t < terminalElems.length; t++) {
    const tElem = terminalElems[t];
    const parentIdx = t % bCount;
    const parent = atoms[parentIdx];
    const localSlot = Math.floor(t / bCount);
    const angle = (localSlot * 2.39996) + parentIdx * 0.8;
    const dz = ((localSlot % 3) - 1) * 0.65;
    const dir = normVec([Math.cos(angle), Math.sin(angle), dz]);
    const dist = bondDist(parent.elem, tElem, 1);
    const tIdx = atoms.length;
    atoms.push(
      atom(
        tElem,
        parent.x + dir[0] * dist,
        parent.y + dir[1] * dist,
        parent.z + dir[2] * dist,
      ),
    );
    bonds.push({ a: parentIdx, b: tIdx, order: 1 });
  }

  return { atoms, bonds };
}

function composition(formula) {
  const counts = parseFormula(structureFormula(formula));
  const count = Object.values(counts).reduce((a, b) => a + b, 0);
  if (count > 2000)
    throw new Error('Công thức vượt giới hạn 2.000 nguyên tử. Hãy nhập đơn vị cấu tạo nhỏ hơn.');
  const atoms = [];
  const side = Math.ceil(Math.cbrt(count));
  for (const [elem, n] of Object.entries(counts))
    for (let i = 0; i < n; i++) {
      const k = atoms.length;
      atoms.push(
        atom(
          elem,
          (k % side) * 2.5,
          (Math.floor(k / side) % side) * 2.5,
          Math.floor(k / (side * side)) * 2.5,
        ),
      );
    }
  return { atoms, bonds: [] };
}

function idealMolecule(formula) {
  if (['H2O', 'NH3', 'CH4', 'CO2'].some((f) => same(f, formula))) return template(formula);
  const counts = parseFormula(formula);
  const symbols = Object.keys(counts);
  if (symbols.length !== 2) return null;
  const central = symbols.find(
    (s) =>
      counts[s] === 1 &&
      ['Be', 'B', 'C', 'Si', 'P', 'S', 'Se', 'Xe', 'Kr', 'Cl', 'Br', 'I'].includes(s),
  );
  if (!central) return null;
  const ligand = symbols.find((s) => s !== central);
  const n = counts[ligand];
  if (!['H', 'F', 'Cl', 'Br', 'I'].includes(ligand)) return null;
  const family = {
    Be: [2], B: [3], C: [4], Si: [4], P: [3, 5], S: [2, 4, 6], Se: [2, 4, 6],
    Xe: [2, 4, 6], Kr: [2], Cl: [3], Br: [3, 5], I: [3, 5, 7],
  };
  if (!family[central].includes(n) || n > 6) return null;
  const shapes = {
    2: vectors.linear,
    3: vectors.planar,
    4: vectors.tetra,
    5: [...vectors.planar, [0, 0, 1], [0, 0, -1]],
    6: vectors.octa,
  };
  let directions = shapes[n];
  if (['P'].includes(central) && n === 3) directions = vectors.tetra.slice(0, 3);
  if (['S', 'Se'].includes(central) && n === 2) directions = vectors.tetra.slice(0, 2);
  if (['S', 'Se'].includes(central) && n === 4)
    directions = [[1, 0, 0], [-0.5, Math.sqrt(3) / 2, 0], [0, 0, 1], [0, 0, -1]];
  if (['Cl', 'Br', 'I'].includes(central) && n === 3)
    directions = [[1, 0, 0], [0, 0, 1], [0, 0, -1]];
  if (['Br', 'I'].includes(central) && n === 5)
    directions = [...vectors.octa.slice(0, 4), [0, 0, 1]];
  if (central === 'Xe' && n === 4) directions = vectors.octa.slice(0, 4);
  const length = bondDist(central, ligand, 1);
  return {
    atoms: [
      atom(central, 0, 0, 0),
      ...directions.map((d) => atom(ligand, ...d.map((v) => v * length))),
    ],
    bonds: directions.map((_, i) => ({ a: 0, b: i + 1, order: 1 })),
  };
}

export function generateStructure(record) {
  let model;
  let mode;
  let note;
  const rawFormula = String(record.formula ?? '');
  const formula = structureFormula(rawFormula);
  const counts = parseFormula(formula);
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalCount > 2000)
    throw new Error('Công thức vượt giới hạn 2.000 nguyên tử. Hãy nhập đơn vị cấu tạo nhỏ hơn.');

  // Treat covalent hydrogen halides (HF, HCl, HBr, HI, H2S) as molecules even if reaction-catalog listed ions
  const isCovalentAcidGas = ['HF', 'HCl', 'HBr', 'HI', 'H2S'].includes(formula);
  const effectiveIons = !isCovalentAcidGas
    ? record.ions?.length
      ? record.ions
      : inferSaltIons(formula)
    : null;

  const hydrateModel = buildHydrate(rawFormula, record.ions);
  const networkSolid = ['SiO2','SiC','BN','B2O3','GeO2','P2O5'].includes(formula);

  if (Object.keys(counts).length === 1 && Object.values(counts)[0] === 1) {
    model = composition(formula);
    mode = 'atom';
    note = 'Nguyên tử riêng lẻ trong không gian 3D; đại diện cho đơn vị nguyên tố cơ bản.';
  } else if(networkSolid) {
    model=composition(formula);mode='composition';
    note='Thành phần theo công thức của chất có mạng liên tục. Mở mục Tinh thể để xem cách sắp xếp nguyên tử trong pha rắn; các vị trí ở đây chỉ giúp đếm thành phần.';
  } else if (hydrateModel) {
    model = hydrateModel;
    mode = 'ions';
    note =
      'Thành phần chất ngậm nước theo đúng tỉ lệ công thức. Các nhóm và H2O được tách để quan sát; vị trí tương đối là minh họa. Mở Tinh thể để xem phối trí và cách xếp theo dữ liệu công bố.';
  } else if (effectiveIons?.length) {
    if(componentDefinitionMatches(effectiveIons,formula,record.kind==='ion')){
      model=buildComponentLayout(effectiveIons);mode='ions';
      note='Thành phần ion theo tỉ lệ công thức. Liên kết bên trong nhóm được minh họa bằng khung cấu tạo; vị trí giữa các nhóm được bố trí để dễ xem. Mở Tinh thể để xem cách xếp trong pha rắn. Điện tích ghi cho toàn nhóm.';
    }else{
      model=composition(formula);mode='composition';
      note='Thành phần nguyên tử theo công thức. Chưa xác nhận được bộ nhóm ion cân bằng cho hồ sơ này; xem dữ liệu tinh thể có nguồn để khảo sát cấu trúc.';
    }
  } else if (template(formula)) {
    model = template(formula);
    mode = 'idealized';
    note =
      'Hình học VSEPR 3D chuẩn hóa: thể hiện đầy đủ liên kết đơn, liên kết đôi/ba và góc liên kết đặc trưng của phân tử hoặc ion đa nguyên tử.';
  } else if (idealMolecule(formula)) {
    model = idealMolecule(formula);
    mode = 'idealized';
    note =
      'Hình học phân tử VSEPR 3D chuẩn hóa với độ dài và góc liên kết đặc trưng theo bán kính cộng hóa trị của nguyên tử trung tâm và phối tử.';
  } else if (buildInorganicMolecule(formula)) {
    model = buildInorganicMolecule(formula);
    mode = 'idealized';
    note =
      'Mô hình cấu trúc phân tử & cầu nối oxit/axit vô cơ 3D: thể hiện trực quan các liên kết đơn, liên kết đôi và cầu nối nguyên tử theo hóa trị thực tế.';
  } else if (buildOrganicMolecule(formula)) {
    model = buildOrganicMolecule(formula);
    mode = 'idealized';
    note =
      'Mô hình cấu trúc phân tử hữu cơ 3D: thể hiện bộ khung cacbon lai hóa sp³/sp²/sp, nhóm chức đặc trưng và toàn bộ các liên kết cộng hóa trị.';
  } else if (buildValenceGraph(formula)) {
    model = buildValenceGraph(formula);
    mode = 'composition';
    note =
      'Mô hình khung liên kết hóa trị 3D: kết nối đầy đủ tất cả nguyên tử của công thức theo hóa trị và bán kính cộng hóa trị chuẩn.';
  } else {
    model = composition(formula);
    mode = 'composition';
    note =
      'Mô hình thành phần nguyên tử 3D cho đại phân tử kích thước lớn: bảo toàn đầy đủ số lượng nguyên tử của công thức.';
  }

  if (model.atoms.length > 2000)
    throw new Error('Công thức vượt giới hạn 2.000 nguyên tử.');
  for (const axis of ['x', 'y', 'z']) {
    const mean =
      model.atoms.reduce((n, a) => n + a[axis], 0) / model.atoms.length;
    for (const a of model.atoms) a[axis] -= mean;
  }
  return {
    atoms: model.atoms,
    bonds: model.bonds,
    ...(model.groups?{groups:model.groups,componentLayout:true}:{}),
    mode,
    note: record.modelNote ? record.modelNote + ' ' + note : note,
    format: 'sdf',
    dimension: '3d',
    generated: true,
  };
}

export function toSDF(model, title = 'ChemDex illustration') {
  const lines = [
    title.replace(/[\r\n]/g, ' '),
    '  ChemDex          3D',
    '',
    '  0  0  0     0  0            999 V3000',
    'M  V30 BEGIN CTAB',
    `M  V30 COUNTS ${model.atoms.length} ${model.bonds.length} 0 0 0`,
    'M  V30 BEGIN ATOM',
  ];
  model.atoms.forEach((a, i) =>
    lines.push(
      `M  V30 ${i + 1} ${a.elem} ${a.x.toFixed(5)} ${a.y.toFixed(5)} ${a.z.toFixed(5)} 0`,
    ),
  );
  lines.push('M  V30 END ATOM', 'M  V30 BEGIN BOND');
  model.bonds.forEach((b, i) =>
    lines.push(`M  V30 ${i + 1} ${b.order ?? 1} ${b.a + 1} ${b.b + 1}`),
  );
  lines.push(
    'M  V30 END BOND',
    'M  V30 END CTAB',
    'M  END',
    '> <CHEMDEX_MODEL_NOTE>',
    model.note ?? 'Mô hình minh họa',
    '',
    ...(model.groups?['> <CHEMDEX_COMPONENTS>',JSON.stringify(model.groups),'','> <CHEMDEX_CHARGE_SCOPE>','Whole-group charges in CHEMDEX_COMPONENTS; atom-level formal charges are not assigned.','']:[]),
    '$$$$',
  );
  return lines.join('\n');
}
