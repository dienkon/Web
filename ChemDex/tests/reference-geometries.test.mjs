import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { readTopology, applyReference, internalValue, geometricAdjacency } from '../scripts/lib/reference-geometry.mjs';
import { readSDF } from '../platform/viewer-canvas.js';

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const geometries = json('shared/nist-geometries.json');
const selections = json('data/nist-geometry-selections.json');
const compounds = json('shared/compounds.json');
const raw = cid => fs.readFileSync(`shared/structures/${cid}.sdf`, 'utf8');

test('all pinned experimental references retain their source bytes, chemical topology and atom mapping', () => {
  assert.equal(geometries.length, 13);
  assert.equal(new Set(geometries.map(g => g.cid)).size, 13);
  for (const g of geometries) {
    const selection = selections.entries.find(s => s.cid === g.cid);
    assert.equal(createHash('sha256').update(fs.readFileSync(g.snapshot)).digest('hex'), selection.sourceSha256);
    assert.equal(g.sourceSha256, selection.sourceSha256);
    assert.equal(g.cas, selection.cas);
    assert.equal(g.phase, 'gas'); assert.equal(g.coordinateUnit, 'angstrom');
    const before = readTopology(raw(g.cid)), applied = applyReference(raw(g.cid), g), after = readTopology(applied.raw);
    assert.equal(after.hash, before.hash); assert.equal(before.hash, selection.topologySha256);
    assert.equal(applied.raw, applyReference(applied.raw, g).raw, `idempotence ${g.cid}`);
    assert.equal(applied.raw, raw(g.cid).replace(/\r\n/g, '\n'), `applied source ${g.cid}`);
    const structure = compounds.find(c => c.cid === g.cid).structure;
    assert.deepEqual(structure.referenceGeometry.atoms, applied.mapping);
    assert.equal(structure.coordinateType, 'experimental');
    assert.equal(structure.source, g.source);
    for (const row of g.internalCoordinates) assert.ok(g.references.some(r => r.id === row[6]), `missing internal-parameter citation ${g.cid}`);
  }
});

test('methanol mapping follows the OH bond when equivalent element rows are permuted', () => {
  const g = structuredClone(geometries.find(g => g.cid === 887));
  g.atoms = [g.atoms[5], g.atoms[3], g.atoms[1], g.atoms[0], g.atoms[4], g.atoms[2]];
  const applied = applyReference(raw(887), g), model = readSDF(applied.raw);
  const oxygen = model.atoms.findIndex(a => a.elem === 'O');
  const hydroxyl = model.bonds.find(b => (b.a === oxygen && model.atoms[b.b].elem === 'H') || (b.b === oxygen && model.atoms[b.a].elem === 'H'));
  const hydrogen = hydroxyl.a === oxygen ? hydroxyl.b : hydroxyl.a;
  assert.equal(applied.mapping[hydrogen], 'H6');
  assert.ok(Math.abs(internalValue('r', [model.atoms[oxygen], model.atoms[hydrogen]]) - .956) < .0002);
  for (const b of model.bonds.filter(b => model.atoms[b.a].elem === 'C' || model.atoms[b.b].elem === 'C')) {
    const a = model.atoms[b.a], c = model.atoms[b.b];
    if (a.elem === 'H' || c.elem === 'H') assert.ok(Math.abs(internalValue('r', [a, c]) - 1.096) < .0002);
  }
});

test('same-formula constitutional isomers cannot exchange coordinates', () => {
  const butane = readTopology(raw(7843)), isobutane = readSDF(raw(6360));
  const wrong = {
    cid: 6360, topologySha256: butane.hash,
    atoms: isobutane.atoms.map((a, i) => ({ ...a, element: a.elem, label: a.elem + (i + 1) })),
  };
  assert.equal(butane.atoms.length, wrong.atoms.length);
  assert.equal(butane.bonds.length, geometricAdjacency(wrong.atoms).length);
  assert.throws(() => applyReference(raw(7843), wrong), /No element\/connectivity-preserving atom mapping/);
});

test('coordinate importer rejects altered topology, bond order, incomplete atoms and contradictory source parameters', () => {
  const reference = geometries.find(g => g.cid === 887);
  const changed = raw(887).replace('  1  2  1', '  1  2  2');
  assert.throws(() => applyReference(changed, reference), /topology changed/);
  const wrongOrders = { ...reference, topologySha256: readTopology(changed).hash };
  assert.throws(() => applyReference(changed, wrongOrders), /bond-type counts/);
  const missing = structuredClone(reference); missing.atoms.pop();
  assert.throws(() => applyReference(raw(887), missing), /atom count/);
  const inconsistent = structuredClone(reference); inconsistent.internalCoordinates[0][1] = '1.200';
  assert.throws(() => applyReference(raw(887), inconsistent), /disagrees with Cartesian/);
  const coincident = structuredClone(reference); coincident.atoms[5] = { ...coincident.atoms[5], x: coincident.atoms[1].x, y: coincident.atoms[1].y, z: coincident.atoms[1].z };
  assert.throws(() => applyReference(raw(887), coincident), /Overlapping/);
});

test('reference bond lengths, planar benzene and torsional convention match independent expected geometry', () => {
  const expected = [[783, .7414], [947, 1.0976], [977, 1.2075], [281, 1.1282]];
  for (const [cid, length] of expected) assert.ok(Math.abs(internalValue('r', readSDF(raw(cid)).atoms) - length) < 1e-8);
  const benzene = readSDF(raw(241));
  assert.ok(benzene.atoms.every(a => a.z === 0));
  for (const b of benzene.bonds.filter(b => benzene.atoms[b.a].elem === 'C' && benzene.atoms[b.b].elem === 'C')) assert.ok(Math.abs(internalValue('r', [benzene.atoms[b.a], benzene.atoms[b.b]]) - 1.397) < .0001);
  assert.deepEqual(benzene.bonds.filter(b => b.order === 2).length, 3);
  const points = [[0,1,0],[0,0,0],[1,0,0],[1,1,0]].map(([x,y,z])=>({x,y,z}));
  assert.equal(internalValue('d', points), 0);
  points[3] = {x:1,y:0,z:1}; assert.equal(Math.abs(internalValue('d', points)), 90);
  points[3] = {x:1,y:-1,z:0}; assert.equal(Math.abs(internalValue('d', points)), 180);
});
