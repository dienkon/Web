import fs from 'node:fs/promises';
import path from 'node:path';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {buildPublishedCrystal,disposeCrystal} from '../js/three/published-crystal.js';
const root=path.resolve(import.meta.dirname,'..');
// GLTFExporter uses the browser FileReader interface for its binary chunk.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
};
const catalog=JSON.parse(await fs.readFile(path.join(root,'data/crystal-catalog.json'),'utf8'));
const results=[];
for(const meta of catalog.structures){
 const data=JSON.parse(await fs.readFile(path.join(root,meta.data.slice(1)),'utf8'));
 const group=buildPublishedCrystal(data);
 const bytes=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true}));
 await fs.writeFile(path.join(root,meta.model.slice(1)),bytes);
 results.push({id:meta.id,amcsdId:meta.amcsdId,bytes:bytes.length,sites:data.siteCount,displaySpheres:group.userData.displaySpheres});
 disposeCrystal(group);
}
await fs.writeFile(path.join(root,'docs/library-crystal-upgrade/2026-11-11/crystal-generation.json'),JSON.stringify({structures:results,interpretation:'Published atomic positions and unit-cell metric. Sphere size/color are display conventions; partial occupancies use sectors. No specimen surface or inferred bonds.'},null,2)+'\n');
console.log(JSON.stringify({structures:results.length,bytes:results.reduce((sum,r)=>sum+r.bytes,0)}));
