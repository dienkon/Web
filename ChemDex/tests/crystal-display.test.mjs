import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {periodicCrystalNeighbors,crystalDisplayConnections} from '../shared/chemistry/crystal-neighbors.mjs';
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
