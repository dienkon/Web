import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parseCIF, symmetryOperator } from '../shared/chemistry/cif.mjs';
import { parseFormula } from '../shared/chemistry/formula.mjs';
import {periodicCrystalHydrogenBonds,crystalDisplayHydrogenBonds,crystalCartesian} from '../shared/chemistry/crystal-neighbors.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const catalog=read('data/cod-crystal-models.json');
const selections=read('data/cod-crystal-selections.json');
const dataFor=id=>read(`assets/periodic-table/crystals/cod-${id}.json`);

test('original pinned CIFs independently reproduce all COD positions, occupancy and full metric',()=>{
 assert.equal(catalog.structures.length,selections.length);
 for(const meta of catalog.structures){
  const data=read('.'+meta.data),raw=fs.readFileSync('.'+meta.cif);
  const selected=selections.find(s=>s.codId===meta.codId);
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),selected.sha256,meta.id);
  const parsed=parseCIF(raw.toString('utf8'));
  assert.equal(parsed.atoms.length,data.atoms.length,meta.id);
  assert.deepEqual(parsed.cell,data.cell,meta.id);
  assert.deepEqual(parsed.bonds,[]);
  for(const atom of data.atoms)assert.ok(parsed.atoms.some(a=>a.label===atom.label&&a.elem===atom.element&&Math.abs(a.occupancy-atom.occupancy)<1e-7&&Math.hypot(a.x-atom.position[0],a.y-atom.position[1],a.z-atom.position[2])<.001),meta.id+': '+atom.label);
  const counts=parseFormula(selected.formula);
  for(const [element,n]of Object.entries(counts))assert.ok(Math.abs(data.cellComposition[element]-n*data.formulaUnitsZ)<.015,meta.id+': '+element);
  assert.ok(meta.reference.authors.length&&meta.reference.title&&meta.reference.journal,meta.id);
  for(const field of ['model','preview'])assert.ok(fs.statSync('.'+meta[field]).size>100,meta.id+'.'+field);
 }
});

test('same-formula isomers and ions cannot inherit a crystal from another reviewed identity',()=>{
 const visuals=read('shared/substance-visuals.generated.json');
 assert.deepEqual(visuals['glucozo-c6h12o6'].crystals.filter(c=>c.codId).map(c=>c.codId),['5000067']);
 assert.deepEqual(visuals['fructozo-c6h12o6'].crystals.filter(c=>c.codId).map(c=>c.codId),['5000065']);
 for(const record of Object.values(visuals))for(const phase of record.crystals.filter(c=>c.codId))assert.ok(phase.subjectIds.includes(record.modelId),record.formula+': '+phase.codId);
 for(const record of Object.values(visuals).filter(v=>v.kind==='ion'))assert.ok(!record.crystals.some(c=>c.codId==='1008189'),'H2O2 is not hydroxide');
 const links=read('shared/crystal-links.generated.json');
 for(const record of Object.values(visuals).filter(v=>v.modelId&&v.crystals.length))for(const crystal of record.crystals)assert.ok(links[record.modelId].includes(crystal.id));
});

test('source CIF retains hydrogen and superseded phases stay excluded despite correct atom ratios',()=>{
 assert.deepEqual(dataFor('8104275').cellComposition,{O:2,Na:2,H:2});
 assert.deepEqual(dataFor('1548811').cellComposition,{Ni:1,O:2,H:2});
 assert.ok(!catalog.structures.some(c=>c.codId==='1010575'),'An obsolete structure is not accepted just because its atom ratio is correct');
 assert.ok(read('data/crystal-source-exclusions.json').some(c=>c.id==='1010575'&&c.references.some(s=>s.includes('PhysRevMaterials'))));
 const nickel=parseCIF(fs.readFileSync('assets/periodic-table/crystals/cod-1548811.cif','utf8'));
 assert.equal(nickel.atoms.length,5);assert.ok(nickel.expansionWarnings.some(w=>w.includes('làm tròn')));
 // Deprecated CIF tags have two incompatible conventions in real source files.
 const acetone=parseCIF(fs.readFileSync('assets/periodic-table/crystals/cod-7110463.cif','utf8'));
 assert.equal(acetone.atoms.length,40);assert.ok(acetone.expansionWarnings.some(w=>w.includes('thứ tự')));
});

test('all imported symmetry operators preserve measured metric and source GLB identity',()=>{
 const length=(basis,v)=>Math.hypot(...basis.map(row=>row.reduce((sum,a,i)=>sum+a*v[i],0)));
 for(const meta of catalog.structures){
  const data=read('.'+meta.data),v=[.137,.231,.359],original=length(data.basis,v);
  for(const expression of data.symmetryOperations){const op=symmetryOperator(expression),zero=op([0,0,0]);assert.ok(Math.abs(length(data.basis,op(v).map((n,i)=>n-zero[i]))-original)<.0002,meta.id);}
  const glb=fs.readFileSync('.'+meta.model),doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
  assert.ok(doc.nodes.some(n=>n.extras?.referenceId==='cod:'+meta.codId&&n.extras.spaceGroup===meta.spaceGroup),meta.id);
 }
});

test('source hydrogen-bond triplets reproduce reported methanol geometry with full periodic translations',()=>{
 const data=dataFor('4503066'),before=JSON.stringify(data),geometry=data.hydrogenBondGeometry,edges=periodicCrystalHydrogenBonds(data);
 assert.equal(geometry.origin,'source-cif');assert.equal(geometry.rows.length,1);assert.equal(edges.length,4);
 assert.deepEqual(geometry.rows[0].labels,['O1','H1','O1']);assert.deepEqual(geometry.rows[0].symmetry,['.','.','4_557']);
 assert.equal(geometry.rows[0].reported.distance_DA,'2.6929(11)');
 const image=(index,shift=[0,0,0])=>crystalCartesian(data,data.atoms[index].fractional.map((v,k)=>v+shift[k]));
 const subtract=(a,b)=>a.map((v,k)=>v-b[k]),distance=(a,b)=>Math.hypot(...subtract(a,b));
 for(const edge of edges){
  const h=image(edge.a),a=image(edge.b,edge.shift),d=image(edge.donor,edge.donorShift),dh=subtract(d,h),ah=subtract(a,h);
  const angle=Math.acos(dh.reduce((s,v,k)=>s+v*ah[k],0)/(Math.hypot(...dh)*Math.hypot(...ah)))*180/Math.PI;
  assert.equal(data.atoms[edge.a].label,'H1');assert.equal(data.atoms[edge.donor].element,'O');
  assert.ok(Math.abs(distance(d,a)-2.6929)<.0001);assert.ok(Math.abs(distance(h,a)-1.86)<.005);assert.ok(Math.abs(angle-174.1)<.05);
  assert.ok(Math.abs(distance(h,a)-edge.distance)<1e-10);assert.ok(Math.abs(angle-edge.angle)<1e-8);
 }
 const oxygens=data.atoms.flatMap((a,i)=>a.element==='O'?[i]:[]);
 for(const index of oxygens){assert.equal(edges.filter(e=>e.donor===index).length,1);assert.equal(edges.filter(e=>e.b===index).length,1);}
 assert.ok(edges.some(e=>e.shift.some(v=>v!==0)));
 assert.equal(crystalDisplayHydrogenBonds(data).length,8);assert.equal(crystalDisplayHydrogenBonds(data,2).length,48);
 assert.equal(JSON.stringify(data),before);
 for(const meta of catalog.structures.filter(c=>c.codId!=='4503066'))assert.equal(dataFor(meta.codId).hydrogenBondGeometry,undefined,'do not manufacture source tables');
});
