import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseCIF} from '../shared/chemistry/cif.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=read('data/crystal-catalog.json'),errors=[],structures=[];
if(fs.existsSync(path.join(root,'data/wiki-crystal-models.json'))){
 const extra=read('data/wiki-crystal-models.json');catalog.structures.push(...extra.structures);Object.assign(catalog.elements,extra.elements);
}
const check=(ok,text)=>{if(!ok)errors.push(text);};
const local=url=>path.join(root,url.replace(/^\//,''));
for(const meta of catalog.structures){
 try{
  const data=read(meta.data.slice(1)),parsed=parseCIF(fs.readFileSync(local(meta.cif),'utf8'));
  check(parsed.atoms.length===data.atoms.length,`${meta.id}: expanded atom count`);
  check(data.amcsdId===meta.amcsdId,`${meta.id}: reference mismatch`);
  const glb=fs.readFileSync(local(meta.model));
  check(glb.readUInt32LE(0)===0x46546c67&&glb.readUInt32LE(8)===glb.length,`${meta.id}: GLB header`);
  const document=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
  check(document.nodes.some(node=>meta.referenceId?node.extras?.referenceId===meta.referenceId:node.extras?.amcsdId===meta.amcsdId),`${meta.id}: GLB attribution`);
  for(const accessor of document.accessors)check(accessor.count>0&&[...(accessor.min??[]),...(accessor.max??[])].every(Number.isFinite),`${meta.id}: finite geometry`);
  const png=fs.readFileSync(local(meta.preview));check(png.readUInt32BE(16)===640&&png.readUInt32BE(20)===480,`${meta.id}: poster dimensions`);
  structures.push({id:meta.id,amcsdId:meta.amcsdId,sites:data.siteCount,metric:data.cell,operations:data.symmetryOperations.length,mixedSites:data.mixedSiteCount,cifReparse:true,glb:true,preview:true});
 }catch(error){errors.push(`${meta.id}: ${error.message}`);}
}
const photos=read('data/mineral-image-provenance.json').minerals;
check(photos.length===49,'49 mineral photo records required');
for(const photo of photos){
 check(photo.status==='downloaded',`${photo.id}: photo is not downloaded`);
 check(Boolean(photo.author&&photo.license&&photo.source),`${photo.id}: missing photo attribution`);
 const bytes=fs.readFileSync(local(photo.file));check(createHash('sha256').update(bytes).digest('hex')===photo.sha256,`${photo.id}: photo hash`);
}
let elementBindings=0,mineralBindings=0,photoBindings=0;
for(const meta of read('data/manifest.json')){
 const profile=read('data/'+meta.file);
 if(profile.structure.publishedCrystal){elementBindings++;check(profile.structure.publishedCrystal.id===catalog.elements[profile.symbol]?.id,`${profile.symbol}: element phase binding`);}
 const blocks=profile.mediaBlocks.filter(b=>b.type==='crystal');
 if(blocks.length)mineralBindings++;
 for(const block of blocks)check(catalog.structures.some(s=>s.id===block.crystal.id),`${profile.symbol}: unknown phase`);
 if(profile.images.some(im=>im.role==='natural-mineral'))photoBindings++;
 check(fs.existsSync(path.join(root,profile.review.crystalPhotoAudit)),`${profile.symbol}: missing named audit`);
 if(profile.general.state==='Khí'||profile.general.state==='Lỏng')check(!profile.structure.publishedCrystal,`${profile.symbol}: no solid-phase substitution for fluid`);
}
const report={valid:!errors.length,structures:structures.length,mineralPhotos:photos.length,elementBindings,mineralBindings,photoBindings,checks:structures,errors};
const reportFile=fs.existsSync(path.join(root,'data/wiki-crystal-models.json'))?'docs/application-crystal-review/2026-11-12/crystal-validation.json':'docs/library-crystal-upgrade/2026-11-11/crystal-validation.json';
fs.writeFileSync(path.join(root,reportFile),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,checks:undefined}));if(errors.length)process.exitCode=1;
