import { createHash } from 'node:crypto';

const fail = message => { throw new Error(message); };
const radii = { H: .31, C: .76, N: .71, O: .66 };
export function readTopology(raw) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!lines[3]?.includes('V2000')) fail('Expected V2000 topology');
  const count = Number(lines[3].slice(0, 3)), bondCount = Number(lines[3].slice(3, 6));
  if (!Number.isInteger(count) || count < 2 || count > 100 || !Number.isInteger(bondCount) || bondCount < 1) fail('Invalid atom/bond count');
  const atoms = lines.slice(4, 4 + count).map(line => ({ element: line.slice(31, 34).trim() }));
  const bonds = lines.slice(4 + count, 4 + count + bondCount).map(line => ({
    a: Number(line.slice(0, 3)) - 1, b: Number(line.slice(3, 6)) - 1, order: Number(line.slice(6, 9)),
  }));
  if (atoms.length !== count || bonds.some(b => !Number.isInteger(b.a) || !Number.isInteger(b.b) || b.a < 0 || b.b < 0 || b.a >= count || b.b >= count || b.a === b.b || ![1, 2, 3, 4].includes(b.order))) fail('Invalid topology');
  if (bonds.length !== bondCount || new Set(bonds.map(b => [b.a, b.b].sort((a,c)=>a-c).join(':'))).size !== bondCount) fail('Duplicate or missing topology bonds');
  // Coordinates and the title/program header may change on replay; chemical
  // identity, atom fields, bond orders, stereochemistry and charges may not.
  const end = lines.findIndex((line, i) => i >= 4 + count + bondCount && line === 'M  END');
  if (end < 0) fail('Missing M END');
  const identity = [lines[3], ...lines.slice(4, 4 + count).map(line => line.slice(30)), ...lines.slice(4 + count, end + 1)].join('\n');
  return { lines, atoms, bonds, hash: createHash('sha256').update(identity).digest('hex') };
}

export function geometricAdjacency(atoms) {
  const edges = [];
  for (const a of atoms) if (!radii[a.element] || ![a.x, a.y, a.z].every(Number.isFinite)) fail('Unsupported or invalid reference atom');
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const a = atoms[i], b = atoms[j], distance = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (distance < .45) fail('Overlapping reference atoms');
    // This establishes candidate adjacency only. Bond orders are preserved
    // from the pinned topology, then checked against NIST's bond-type counts.
    if (distance <= 1.22 * (radii[a.element] + radii[b.element])) edges.push({ a: i, b: j });
  }
  return edges;
}
const adjacency = (count, edges) => {
  const result = Array.from({ length: count }, () => new Set());
  for (const { a, b } of edges) { result[a].add(b); result[b].add(a); }
  return result;
};
export function matchReference(topology, geometry) {
  if (topology.hash !== geometry.topologySha256) fail('Pinned chemical topology changed');
  const n = topology.atoms.length;
  if (n !== geometry.atoms.length) fail('Reference atom count mismatch');
  const targetEdges = geometricAdjacency(geometry.atoms);
  if (targetEdges.length !== topology.bonds.length) fail('Reference connectivity differs');
  const original = adjacency(n, topology.bonds), target = adjacency(n, targetEdges);
  const signature = (atoms, graph, i) => `${atoms[i].element}:${[...graph[i]].map(j => atoms[j].element).sort().join(',')}`;
  const candidates = topology.atoms.map((_, i) => geometry.atoms.map((_, j) => j).filter(j => signature(topology.atoms, original, i) === signature(geometry.atoms, target, j)));
  const order = [...Array(n).keys()].sort((a, b) => candidates[a].length - candidates[b].length || original[b].size - original[a].size || a - b);
  const mapping = Array(n).fill(-1), used = new Set();
  function visit(depth) {
    if (depth === n) return true;
    const i = order[depth];
    for (const j of candidates[i]) {
      if (used.has(j) || mapping.some((k, p) => k >= 0 && original[i].has(p) !== target[j].has(k))) continue;
      mapping[i] = j; used.add(j);
      if (visit(depth + 1)) return true;
      mapping[i] = -1; used.delete(j);
    }
    return false;
  }
  if (!visit(0)) fail('No element/connectivity-preserving atom mapping');
  validateReference(geometry, topology, mapping);
  return mapping;
}

const vector = (a, b) => [a.x - b.x, a.y - b.y, a.z - b.z];
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
export function internalValue(kind, atoms) {
  if (kind === 'r') return Math.hypot(...vector(atoms[0], atoms[1]));
  if (kind === 'a') {
    const u = vector(atoms[0], atoms[1]), v = vector(atoms[2], atoms[1]);
    return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (Math.hypot(...u) * Math.hypot(...v))))) * 180 / Math.PI;
  }
  if (kind === 'd') {
    const b = vector(atoms[2], atoms[1]), u = cross(vector(atoms[1], atoms[0]), b), v = cross(b, vector(atoms[3], atoms[2]));
    return Math.atan2(dot(cross(u, v), b) / Math.hypot(...b), dot(u, v)) * 180 / Math.PI;
  }
  fail('Unsupported internal coordinate');
}

export function validateReference(geometry, topology, mapping) {
  if (!geometry.internalCoordinates?.length || !geometry.bondTypes?.length) fail('Incomplete reference parameters');
  if (geometry.atoms.some(a => !new RegExp(`^${a.element}\\d+$`).test(a.label))) fail('Invalid source atom labels');
  const labels = new Map(geometry.atoms.map(a => [Number(a.label.match(/\d+$/)?.[0]), a]));
  if (labels.size !== geometry.atoms.length) fail('Duplicate source atom labels');
  for (const row of geometry.internalCoordinates) {
    const kind = row[0][0], count = { r: 2, a: 3, d: 4 }[kind];
    if (!count) fail('Unknown source internal coordinate');
    const indices = row.slice(2, 2 + count).map(Number);
    // Some source angles use a fictitious X atom on a symmetry axis. Keep
    // those source rows, but do not pretend that X is a measured atom.
    if (indices.some(i => !labels.has(i))) {
      if (!/symmetry axis/i.test(row[7] ?? '')) fail('Missing source atom in internal coordinate');
      continue;
    }
    const actual = internalValue(kind, indices.map(i => labels.get(i))), expected = Number(row[1]);
    const precision = (row[1].split('.')[1] ?? '').length;
    // Half a unit in the printed last digit plus bounded Cartesian rounding.
    const tolerance = .5 * 10 ** -precision + (kind === 'r' ? .0002 : .03);
    const delta = kind === 'd' ? Math.abs(((actual - expected + 540) % 360) - 180) : Math.abs(actual - expected);
    if (!Number.isFinite(delta) || delta > tolerance) fail(`${geometry.cid} source ${row[0]} [${indices}] disagrees with Cartesian table: ${actual} vs ${expected}`);
  }
  const key = (a, b, order) => `${[a, b].sort().join('')}:${order}`;
  const expected = new Map(geometry.bondTypes.map(([description, count]) => {
    const m = description.match(/^([A-Z][a-z]?)([-=#:])([A-Z][a-z]?)$/);
    if (!m) fail('Unknown source bond type');
    return [key(m[1], m[3], { '-': 1, '=': 2, '#': 3, ':': 4 }[m[2]]), Number(count)];
  }));
  const actual = new Map();
  for (const b of topology.bonds) {
    let bondOrder = b.order;
    const a = geometry.atoms[mapping[b.a]].element, c = geometry.atoms[mapping[b.b]].element;
    // Benzene's source uses aromatic C:C; the input SDF uses a Kekule ring.
    // Limit this equivalence to the explicitly selected benzene identity.
    if (geometry.cid === 241 && a === 'C' && c === 'C' && [1, 2, 4].includes(bondOrder)) bondOrder = 4;
    const k = key(a, c, bondOrder); actual.set(k, (actual.get(k) ?? 0) + 1);
  }
  if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) fail('Source bond-type counts differ from pinned chemical identity');
}

export function applyReference(raw, geometry) {
  const topology = readTopology(raw), mapping = matchReference(topology, geometry), lines = [...topology.lines];
  mapping.forEach((j, i) => {
    const atom = geometry.atoms[j];
    lines[i + 4] = [atom.x, atom.y, atom.z].map(v => v.toFixed(4).padStart(10)).join('') + lines[i + 4].slice(30);
  });
  lines[1] = 'ChemDex / NIST SRD 101 reference 3D';
  return { raw: lines.join('\n'), mapping: mapping.map(j => geometry.atoms[j].label) };
}
