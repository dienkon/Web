import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {periodicCrystalNeighbors,crystalDisplayConnections,periodicWaterHydrogenBonds,crystalDisplayHydrogenBonds} from '../shared/chemistry/crystal-neighbors.mjs';
import {buildPublishedCrystal,disposeCrystal,fractionalPosition} from '../js/three/published-crystal.js';
const dataFor=id=>JSON.parse(fs.readFileSync(`assets/periodic-table/crystals/${id}.json`,'utf8'));

test('periodic neighbours recover standard Wiki coordination rather than joining every pair',()=>{
 for(const [id,expected]of [['halite',{Na:6,Cl:6}],['fluorite',{Ca:8,F:4}],['nguyen-to-si',{Si:4}],['nguyen-to-fe',{Fe:8}],['nguyen-to-al',{Al:12}],['nguyen-to-mg',{Mg:12}],['quartz',{Si:4,O:2}],['chat-solid-fluorine-alpha',{F:1}]]){
  const data=dataFor(id),edges=periodicCrystalNeighbors(data);
  data.atoms.forEach((a,i)=>assert.equal(edges.filter(e=>e.a===i).length,expected[a.element],`${id} ${a.label}`));
  if(id==='halite')for(const e of edges)assert.notEqual(data.atoms[e.a].element,data.atoms[e.b].element);
 }
 const cscl={basis:[[4,0,0],[0,4,0],[0,0,4]],atoms:[{element:'Cs',fractional:[0,0,0]},{element:'Cl',fractional:[.5,.5,.5]}]};
 const neighbours=periodicCrystalNeighbors(cscl);
 assert.deepEqual(cscl.atoms.map((_,i)=>neighbours.filter(e=>e.a===i).length),[8,8]);
 for(const e of neighbours)assert.notEqual(cscl.atoms[e.a].element,cscl.atoms[e.b].element);
});

test('periodic self-images connect primitive cells and skew edges clip to the actual fractional cell',()=>{
 const data={basis:[[3,1,0],[0,Math.sqrt(8),0],[0,0,3]],atoms:[{element:'Po',label:'Po1',occupancy:1,fractional:[0,0,0]}]};
 const edges=periodicCrystalNeighbors(data);assert.equal(edges.length,6);
 for(const repeat of [1,2]){
  const connections=crystalDisplayConnections(data,repeat);assert.ok(connections.length>0);
  const inverse=new THREE.Matrix3().set(...data.basis.flat()).invert();
  for(const edge of connections)for(const point of [edge.from,edge.to]){
   const f=new THREE.Vector3(...point).applyMatrix3(inverse);assert.ok(f.toArray().every(v=>v>=-1e-6&&v<=repeat+1e-6));
  }
 }
});

test('instancing preserves every source position and occupancy while substantially reducing drawable objects',()=>{
 const data=dataFor('cod-4504310'),before=JSON.stringify(data);
 const normal=buildPublishedCrystal(data,2),batched=buildPublishedCrystal(data,2,{instanced:true,showCell:false});
 const read=g=>{const atoms=[];g.traverse(n=>{if(n.userData.kind==='atom')atoms.push(...(n.atomInstances??[n.userData]));});return atoms.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));};
 assert.deepEqual(read(batched),read(normal));assert.equal(batched.userData.displaySpheres,normal.userData.displaySpheres);assert.equal(JSON.stringify(data),before);
 const count=g=>{let n=0;g.traverse(o=>{if(o.isMesh||o.isLineSegments)n++;});return n;};assert.ok(count(batched)<count(normal)/20);
 batched.traverse(mesh=>{if(!mesh.atomInstances)return;mesh.atomInstances.forEach((atom,i)=>{
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);const p=new THREE.Vector3().setFromMatrixPosition(matrix).toArray(),expected=fractionalPosition(data,atom.fractional);
  assert.ok(p.every((v,k)=>Math.abs(v-expected[k])<1e-5));
 });});
 disposeCrystal(normal);disposeCrystal(batched);
});

test('ordered ice II has two donated and two accepted hydrogen contacts per oxygen, separate from covalent O-H rods',()=>{
 const data=dataFor('chat-ice-ii'),before=JSON.stringify(data),edges=periodicWaterHydrogenBonds(data),covalent=periodicCrystalNeighbors(data);
 assert.equal(edges.length,24);
 data.atoms.forEach((atom,i)=>{
  assert.equal(covalent.filter(e=>e.a===i).length,atom.element==='O'?2:1);
  if(atom.element==='O'){
   assert.equal(edges.filter(e=>e.donor===i).length,2);
   assert.equal(edges.filter(e=>e.b===i).length,2);
  }else assert.equal(edges.filter(e=>e.a===i).length,1);
 });
 assert.ok(edges.some(e=>e.shift.some(v=>v!==0)), 'network must cross the cell boundary');
 for(const edge of edges){assert.ok(edge.angle>177&&edge.angle<180);assert.ok(edge.donorAcceptorDistance>2.76&&edge.donorAcceptorDistance<2.84);}
 const inverse=new THREE.Matrix3().set(...data.basis.flat()).invert();
 for(const repeat of [1,2]){
  const display=crystalDisplayHydrogenBonds(data,repeat);assert.ok(display.length>=24*repeat**3);
  for(const edge of display)for(const point of [edge.from,edge.to])assert.ok(new THREE.Vector3(...point).applyMatrix3(inverse).toArray().every(v=>v>=-1e-6&&v<=repeat+1e-6));
  const group=buildPublishedCrystal(data,repeat,{instanced:true,showCell:false}),links=group.children.find(c=>c.userData.kind==='hydrogen-bonds');
  assert.equal(group.userData.displayHydrogenBonds,display.length);assert.equal(links.children.length,1);assert.ok(links.children[0].isInstancedMesh);assert.ok(links.children[0].count>display.length);
  disposeCrystal(group);
 }
 const hidden=buildPublishedCrystal(data,1,{showHydrogenBonds:false});assert.equal(hidden.children.find(c=>c.userData.kind==='hydrogen-bonds').visible,false);disposeCrystal(hidden);
 assert.equal(JSON.stringify(data),before,'source positions and occupancy remain unchanged');
});

test('water hydrogen contacts require the donor direction and unambiguous, fully occupied water molecules',()=>{
 const fixture=coordinates=>({basis:[[10,0,0],[0,10,0],[0,0,10]],atoms:coordinates.map(([element,x,y,z])=>({element,occupancy:1,fractional:[x,y,z].map(v=>(v/10+1)%1)}))});
 const coordinates=[['O',0,0,0],['H',.96,0,0],['H',-.24,.93,0],['O',2.8,0,0],['H',3.76,0,0],['H',2.56,.93,0]];
 const data=fixture(coordinates);assert.equal(periodicWaterHydrogenBonds(data).length,1);
 const rotated=structuredClone(coordinates);rotated[1]=['H',0,.96,0];assert.equal(periodicWaterHydrogenBonds(fixture(rotated)).length,0,'short O···O alone is insufficient');
 const shifted=fixture(coordinates.map(([e,x,y,z])=>[e,x+6,y+4,z+3]));assert.equal(periodicWaterHydrogenBonds(shifted).length,1,'the same contact survives a change of periodic origin');
 const missing=structuredClone(data);missing.atoms.pop();assert.deepEqual(periodicWaterHydrogenBonds(missing),[]);
 const partial=structuredClone(data);partial.atoms[1].occupancy=.5;assert.deepEqual(periodicWaterHydrogenBonds(partial),[]);
 const ambiguous=fixture([['O',0,0,0],['H',.96,0,0],['H',-.24,.93,0],['O',2,0,0],['H',2.96,0,0],['H',1.76,.93,0]]);assert.deepEqual(periodicWaterHydrogenBonds(ambiguous),[]);
 for(const id of ['cod-4503066','cod-4504310','halite','chat-brucite'])assert.deepEqual(periodicWaterHydrogenBonds(dataFor(id)),[],`${id}: do not apply a pure-water convention to other substances`);
});
