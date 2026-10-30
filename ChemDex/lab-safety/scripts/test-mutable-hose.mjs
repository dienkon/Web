import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
await mkdir('.browser-review/hose-tests',{recursive:true});
const outfile=path.resolve('.browser-review/hose-tests/geometry.mjs');
await build({entryPoints:['src/components/3d/fps/MutableTubeGeometry.ts'],outfile,bundle:true,packages:'external',platform:'node',format:'esm',logLevel:'warning'});
const {MutableTubeGeometry}=await import(pathToFileURL(outfile).href);
const hose=new MutableTubeGeometry(),position=hose.attributes.position,normal=hose.attributes.normal,index=hose.index,uv=hose.attributes.uv;
const curves=[
 [[.3,-.2,-.6],[.1,-.36,-.6],[-.14,-.3,-.65],[-.2,-.19,-.72]],
 [[0,0,0],[.02,-.25,0],[.4,-.3,.2],[.5,0,.1]],
 [[0,0,0],[0,.2,0],[0,.4,0],[0,.6,0]],
 [[0,0,0],[.2,0,0],[.4,0,0],[.6,0,0]],
 [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
].map(points=>points.map(p=>new THREE.Vector3(...p)));
let referenceCoordinates=0,finiteCoordinates=0,normalChecks=0;
for(const points of curves){
 hose.update(points);
 const reference=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.006,6,false);
 const actual=hose.attributes.position.array,expected=reference.attributes.position.array;
 const degenerate=points.every(p=>p.equals(points[0]));
 for(let i=0;i<actual.length;i++){assert(Number.isFinite(actual[i]));finiteCoordinates++;if(!degenerate){assert(Math.abs(actual[i]-expected[i])<.00001,`tube differs by more than .01 mm at ${i}: ${actual[i]} vs ${expected[i]}`);referenceCoordinates++;}}
 for(let i=0;i<normal.count;i++){assert(Math.abs(new THREE.Vector3().fromBufferAttribute(normal,i).length()-1)<.00001,'normal must stay finite and unit length');normalChecks++;}
 for(let ring of [0,16]){
  const center=new THREE.Vector3();for(let j=0;j<6;j++)center.add(new THREE.Vector3().fromBufferAttribute(position,ring*7+j));center.multiplyScalar(1/6);
  assert(center.distanceTo(points[ring===0?0:3])<.000001,'tube end misses connector');
 }
 reference.dispose();
}
const points=curves[0].map(p=>p.clone());
for(let i=0;i<1000;i++){points[1].y=-.36+Math.sin(i*.02)*.1;hose.update(points);assert.equal(hose.attributes.position,position);assert.equal(hose.attributes.normal,normal);assert.equal(hose.index,index);assert.equal(hose.attributes.uv,uv);}
const version=position.version;assert.equal(hose.update(points),false);assert.equal(position.version,version,'stationary hose uploads another buffer');
assert(hose.boundingSphere.radius>0&&Number.isFinite(hose.boundingSphere.radius));
hose.dispose();
const result={passed:true,referenceCoordinates,finiteCoordinates,normalChecks,persistentBufferUpdates:1000,endpointChecks:curves.length*2};
await mkdir('docs/room-upgrade',{recursive:true});await writeFile('docs/room-upgrade/hose-geometry-checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
