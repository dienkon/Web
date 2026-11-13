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
const wiki=process.argv.includes('--wiki');
const substances=process.argv.includes('--substances');
const cod=process.argv.includes('--cod');
const allCrystals=process.argv.includes('--all-crystals');
const catalog=JSON.parse(await fs.readFile(path.join(root,allCrystals?'data/crystal-catalog.json':cod?'data/cod-crystal-models.json':substances?'data/substance-crystal-models.json':wiki?'data/wiki-crystal-models.json':'data/crystal-catalog.json'),'utf8'));
if(allCrystals)for(const file of ['wiki-crystal-models','substance-crystal-models','cod-crystal-models'])catalog.structures.push(...JSON.parse(await fs.readFile(path.join(root,`data/${file}.json`),'utf8')).structures);
const onlyId=process.argv.find(arg=>arg.startsWith('--id='))?.slice(5);
const ids=(onlyId??process.argv.find(arg=>arg.startsWith('--ids='))?.slice(6))?.split(',');
if(ids){const unknown=ids.filter(id=>!catalog.structures.some(meta=>meta.id===id));if(unknown.length)throw Error(`Unknown crystal IDs: ${unknown.join(', ')}`);catalog.structures=catalog.structures.filter(meta=>ids.includes(meta.id));}
const results=[];
for(const meta of catalog.structures){
 const data=JSON.parse(await fs.readFile(path.join(root,meta.data.slice(1)),'utf8'));
 const group=buildPublishedCrystal(data,1,{showCell:false,showConnections:true});
 const bytes=Buffer.from(await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true}));
 await fs.writeFile(path.join(root,meta.model.slice(1)),bytes);
 results.push({id:meta.id,amcsdId:meta.amcsdId,codId:meta.codId,bytes:bytes.length,sites:data.siteCount,displaySpheres:group.userData.displaySpheres,displayHydrogenBonds:group.userData.displayHydrogenBonds,hydrogenBondEvidence:group.userData.hydrogenBondEvidence,boundaryCopies:group.userData.boundaryCopies,completeClusters:group.userData.completeClusters});
 disposeCrystal(group);
}
const reportOverride=process.argv.find(arg=>arg.startsWith('--report-dir='))?.slice(13);
const report=path.join(root,reportOverride??(ids||allCrystals?`.cache/crystal-assets/${onlyId??(ids?'selected':'all')}`:cod?'docs/molecular-crystal-upgrade/2026-11-12':substances?'docs/learning-expansion/2026-11-12':wiki?'docs/application-crystal-review/2026-11-12':'docs/library-crystal-upgrade/2026-11-11'));
await fs.mkdir(report,{recursive:true});
await fs.writeFile(path.join(report,'crystal-generation.json'),JSON.stringify({structures:results,interpretation:'Published atomic positions or explicitly labelled reference prototype. Sphere size/color are display conventions; partial occupancies use sectors. Rods show distance-based display neighbours, not assigned chemical bond orders. Dashed hydrogen bonds reproduce source CIF geom_hbond tables when present; the geometric fallback is limited to fully occupied, ordered pure-water crystals.'},null,2)+'\n');
console.log(JSON.stringify({structures:results.length,bytes:results.reduce((sum,r)=>sum+r.bytes,0)}));
