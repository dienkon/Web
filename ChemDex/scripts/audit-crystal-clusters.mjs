import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Matrix4,Vector3} from 'three';
import {crystalDisplayClusters} from '../shared/chemistry/crystal-display-clusters.mjs';
import {periodicCrystalNeighbors,crystalCartesian} from '../shared/chemistry/crystal-neighbors.mjs';
import {buildPublishedCrystal,disposeCrystal} from '../js/three/published-crystal.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
const pointKey=p=>p.map(v=>v.toFixed(5)).join(',');
const imageKey=(i,shift)=>`${i}:${shift.join(',')}`;
const pairKey=(a,b)=>[pointKey(a),pointKey(b)].sort().join('|');
const affected=[],unchanged=[],sources=[];
let audited=0;
for(const catalog of ['crystal-catalog','wiki-crystal-models','substance-crystal-models','cod-crystal-models'])for(const meta of read(`data/${catalog}.json`).structures){
  const sourceBytes=fs.readFileSync(path.join(root,meta.data.slice(1))),data=JSON.parse(sourceBytes),before=JSON.stringify(data),rows=[];
  for(const repeat of [1,2]){
    const plan=crystalDisplayClusters(data,repeat);
    if(!plan.additions.length)continue;
    const group=buildPublishedCrystal(data,repeat,{instanced:true,showCell:false}),atoms=[],rods=[];
    group.traverse(mesh=>{
      if(mesh.atomInstances)mesh.atomInstances.forEach((atom,index)=>{
        if(atom.element==='Vacancy')return;
        const matrix=new Matrix4();mesh.getMatrixAt(index,matrix);
        const actual=new Vector3().setFromMatrixPosition(matrix).toArray(),expected=crystalCartesian(data,atom.fractional);
        assert.ok(actual.every((v,k)=>Math.abs(v-expected[k])<1e-5),`${meta.id}: rendered instance moved`);
        atoms.push(atom);
      });
      if(mesh.connectionInstances)rods.push(...mesh.connectionInstances);
    });
    const images=new Map(),points=new Set();
    for(const atom of atoms){
      const source=data.atoms[atom.sourceAtomIndex];assert.ok(source,meta.id+': missing source identity');
      assert.equal(atom.element,source.element);assert.equal(atom.occupancy,source.occupancy);
      assert.ok(atom.cellShift.every(Number.isInteger));assert.deepEqual(atom.fractional,source.fractional.map((v,k)=>v+atom.cellShift[k]));
      assert.deepEqual(atom.unitCellFractional,source.fractional);
      const key=imageKey(atom.sourceAtomIndex,atom.cellShift);assert.ok(!images.has(key),meta.id+': duplicate image');images.set(key,atom);
      const point=pointKey(atom.position);assert.ok(!points.has(point),meta.id+': coincident full atoms');points.add(point);
    }
    const rodKeys=new Set(rods.map(e=>pairKey(e.from,e.to))),adjacency=data.atoms.map(()=>[]);
    for(const edge of periodicCrystalNeighbors(data))adjacency[edge.a].push(edge);
    // Every added finite fragment is a whole copy: all its source neighbours
    // must exist, and every full rod must actually be included in the scene.
    for(const addition of plan.additions){
      const from=images.get(imageKey(addition.index,addition.shift));assert.ok(from);
      for(const edge of adjacency[addition.index]){
        const to=images.get(imageKey(edge.b,addition.shift.map((v,k)=>v+edge.shift[k])));assert.ok(to,`${meta.id}: incomplete boundary fragment`);
        assert.ok(rodKeys.has(pairKey(from.position,to.position)),`${meta.id}: missing full boundary rod`);
      }
    }
    for(let index=0;index<data.atoms.length;index++)for(let x=0;x<repeat;x++)for(let y=0;y<repeat;y++)for(let z=0;z<repeat;z++)assert.ok(images.has(imageKey(index,[x,y,z])),meta.id+': lost original cell image');
    for(const edge of plan.hydrogenBonds)assert.ok(points.has(pointKey(edge.from))&&points.has(pointKey(edge.to)),meta.id+': dangling hydrogen contact');
    const disabled=buildPublishedCrystal(data,repeat,{instanced:true,completeClusters:false});
    assert.equal(group.userData.boundaryCopies,plan.additions.length);assert.equal(disabled.userData.boundaryCopies,0);assert.equal(disabled.userData.completeClusters,false);
    assert.equal(group.userData.displayAtoms,disabled.userData.displayAtoms+plan.additions.length);
    rows.push({repeat,sourceSites:data.siteCount,displayAtoms:atoms.length,boundaryCopies:plan.additions.length,solidRods:rods.length,hydrogenContacts:plan.hydrogenBonds.length});
    disposeCrystal(disabled);disposeCrystal(group);
  }
  assert.equal(JSON.stringify(data),before,meta.id+': source mutated');
  if(rows.length){
    const bytes=fs.readFileSync(path.join(root,meta.model.slice(1))),doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    assert.ok(doc.nodes.some(n=>n.extras?.completeClusters===true&&n.extras.boundaryCopies===rows[0].boundaryCopies&&n.extras.originalSiteCount===data.siteCount),meta.id+': stale GLB');
    affected.push({id:meta.id,catalog,views:rows});
  }else unchanged.push(meta.id);
  sources.push({id:meta.id,sha256:crypto.createHash('sha256').update(sourceBytes).digest('hex')});audited++;
}
const directory=process.argv.find(arg=>arg.startsWith('--report-dir='))?.slice(13)??'.cache/crystal-cluster-audit';
const report=path.resolve(root,directory);fs.mkdirSync(report,{recursive:true});
fs.writeFileSync(path.join(report,'cluster-audit.json'),JSON.stringify({date:new Date().toISOString().slice(0,10),auditedStructures:audited,affected,unchanged,sources},null,2)+'\n');
console.log(JSON.stringify({auditedStructures:audited,completedStructures:affected.length,unchanged:unchanged.length,errors:0}));
