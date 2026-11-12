import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {parseWikiInfobox} from '../shared/chemistry/wiki-infobox.mjs';
import {parseCIF} from '../shared/chemistry/cif.mjs';
import {applicationTopic} from '../scripts/application-image-topics.mjs';
import {applicationImageMarkup} from '../js/application-media.js';
import {buildPublishedCrystal,disposeCrystal,frameCrystal,fractionalPosition,nearestPeriodicDistance} from '../js/three/published-crystal.js';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const profiles=json('data/manifest.json').map(m=>json('data/'+m.file));
const extra=json('data/wiki-crystal-models.json');

test('Wiki infobox parameters preserve empty fields, nested references and inline properties',()=>{
 const fields=parseWikiInfobox(`before {{Infobox element
|phase=
|crystal structure=body-centered cubic
|lattice constant=''a''=286.65 pm<ref>{{cite book |author=Arblaster|year=2018}}</ref>|next=42
|other=[[Page|Caption]]
}} after`);
 assert.equal(fields.phase,'');assert.equal(fields['crystal structure'],'body-centered cubic');
 assert.match(fields['lattice constant'],/author=Arblaster\|year=2018/);assert.equal(fields.next,'42');assert.equal(fields.other,'[[Page|Caption]]');
 const wiki=json('data/wiki-crystal-reference.json').elements;assert.equal(wiki.length,118);
 assert.equal(new Set(wiki.map(r=>r.symbol)).size,118);assert.ok(wiki.every(r=>r.revisionId&&r.status==='available'));
});

test('additional cells retain complex bases and label ideal prototypes honestly',()=>{
 assert.equal(extra.structures.length,11);
 for(const [symbol,count] of Object.entries({Mn:58,Np:8,Pu:16,Am:4,Tc:2,Pm:4,Ra:2,Pa:2,Po:1,Cm:4,Bk:4})){
  const meta=extra.elements[symbol],data=json('.'+meta.data),parsed=parseCIF(fs.readFileSync('.'+meta.cif,'utf8'));
  assert.equal(data.siteCount,count,symbol);assert.equal(parsed.atoms.length,data.atoms.length,symbol);
  for(const atom of data.atoms)assert.ok(parsed.atoms.some(a=>a.elem===atom.element&&Math.hypot(a.x-atom.position[0],a.y-atom.position[1],a.z-atom.position[2])<.0003),`${symbol}: coordinate`);
  if(['Tc','Pm','Ra','Pa','Po','Cm','Bk'].includes(symbol)){assert.equal(meta.evidence,'reference-prototype');assert.equal(meta.amcsdId,null);assert.match(meta.limitations,/lý tưởng/);}
  else assert.ok(meta.amcsdId);
  const glb=fs.readFileSync('.'+meta.model),doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)));
  assert.ok(doc.nodes.some(n=>n.extras?.referenceId===meta.referenceId),symbol);
 }
 const pa=extra.elements.Pa.cell;assert.equal(pa.a,pa.b);assert.notEqual(pa.a,pa.c);
 const radium=extra.elements.Ra;assert.equal(radium.siteCount,2);assert.match(radium.note,/cF4/);
 // A BCC cell, not an FCC cell, is consistent with the stated Ra density.
 const density=2*226*1.66053906660/radium.volume;assert.ok(Math.abs(density-5.5)<.1);
 const reviews=json('data/wiki-crystal-review.json').elements;
 assert.equal(reviews.filter(r=>r.selectedModel).length,82);
 assert.deepEqual(reviews.filter(r=>r.status==='source-inconsistency').map(r=>r.symbol),['Ra']);
 assert.equal(reviews.filter(r=>r.status==='basis-count-needs-review').length,0);
 for(const symbol of ['P','I']){
  const review=reviews.find(r=>r.symbol===symbol);assert.ok(review.metrics.every(m=>m.relativeDifferencePercent<.5));
  assert.ok(review.metrics.some(m=>m.axis!==m.wikiAxis));assert.ok(review.notes.some(n=>n.includes('thứ tự trục')));
 }
 for(const symbol of ['H','He','N','O','Br','Hg','Og'])assert.ok(!profiles.find(p=>p.symbol===symbol).structure.publishedCrystal,symbol);
});

test('application matching respects Vietnamese word boundaries and concrete application context',()=>{
 assert.equal(applicationTopic({title:'Hàng không vũ trụ',desc:'Hydrogen lỏng làm nhiên liệu tên lửa.'},'H')[0],'rocket');
 assert.equal(applicationTopic({title:'Công nghiệp thực phẩm',desc:'Hydro hóa dầu thực vật.'},'H')[0],'margarine');
 assert.equal(applicationTopic({title:'Hàn',desc:'Dùng để hàn hồ quang.'},'Ar')[0],'welding');
 assert.notEqual(applicationTopic({title:'Hàng không',desc:'Là thành phần của hợp kim trong máy bay.'},'Ti')[0],'welding');
 assert.notEqual(applicationTopic({title:'Chất chống dính',desc:'Fluorine tạo polymer PTFE.'},'F')[0],'nuclear-fuel');
 assert.equal(applicationTopic({title:'Ứng dụng',desc:'Không có ứng dụng công nghiệp thông thường.'},'Og'),null);
});

test('all 118 profiles use attributed application images without duplicate topic cards',()=>{
 const photoData=json('data/application-image-provenance.json'),photos=new Map(photoData.topics.map(p=>[p.id,p]));
 const bindings=json('docs/application-crystal-review/2026-11-12/application-image-audit.json');assert.equal(bindings.length,676);
 let pictures=0;
 for(const photo of photos.values())if(photo.status==='downloaded'){
  assert.ok(photo.author&&photo.license&&photo.source);assert.match(photo.license,/CC BY|CC0|Public domain/i);
  assert.equal(createHash('sha256').update(fs.readFileSync('.'+photo.file)).digest('hex'),photo.sha256,photo.id);
 }
 for(const profile of profiles){
  const found=new Set();let count=0;
  for(const app of profile.applications){
   if(!app.applicationImage)continue;
   const image=app.applicationImage,photo=photos.get(image.topic);pictures++;count++;
   assert.ok(!found.has(image.topic),profile.symbol);found.add(image.topic);
   assert.equal(image.src,photo.file);assert.equal(image.source,photo.source);assert.equal(image.license,photo.license);
   assert.equal(image.role,'application-context');assert.ok(app.desc.trim());
  }
  assert.ok(count>0,`${profile.symbol}: no application illustration`);
 }
 assert.equal(pictures,458);
 assert.equal(photos.get('ammonia').filename,'Haber-Bosch-En.svg');
 assert.equal(photos.get('mri').filename,'MRI-Philips.JPG');
 assert.equal(photos.get('radiation-shield').filename,'Lead shielding.jpg');
});

test('image figures expose credits and safely escape captions without nested cropped cards',()=>{
 const markup=applicationImageMarkup({title:'Test',applicationImage:{src:'/photo.png',source:'https://commons.wikimedia.org/wiki/Test',alt:'<img onerror=alert(1)>',caption:'<script>bad</script>',author:'A',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'}});
 assert.match(markup,/<figure/);assert.match(markup,/<figcaption/);assert.match(markup,/Nguồn ảnh/);
 assert.ok(!markup.includes('<script>'));assert.match(markup,/&lt;script&gt;/);assert.ok(!/h-40|glass/.test(markup));
});

test('camera framing contains actual skew cell bounds on narrow and wide displays',()=>{
 for(const id of ['quartz','hematite','nguyen-to-mn','nguyen-to-pu']){
  const data=json(`assets/periodic-table/crystals/${id}.json`),group=buildPublishedCrystal(data,2);
  for(const aspect of [.65,1,2.8]){
   const camera=new THREE.PerspectiveCamera(36,aspect,.01,1000),controls={target:new THREE.Vector3(),update(){}};
   frameCrystal(camera,controls,group,aspect);camera.updateMatrixWorld();
   const box=new THREE.Box3().setFromObject(group);
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=1&&Math.abs(p.y)<=1,`${id}, aspect ${aspect}`);
   }
  }
  const repeated=group.children.find(n=>n.userData.kind==='atom'&&n.userData.fractional.some(v=>v>1));assert.ok(repeated);
  const expected=fractionalPosition(data,repeated.userData.fractional);assert.ok(expected.every((v,i)=>Math.abs(v-repeated.userData.position[i])<1e-6));
  disposeCrystal(group);
 }
});
test('touching-sphere mode uses the metric and periodic nearest neighbours of SC, BCC and FCC',()=>{
 for(const [id,factor] of [['nguyen-to-po',1],['nguyen-to-ra',Math.sqrt(3)/2],['nguyen-to-al',1/Math.sqrt(2)]]){
  const data=json(`assets/periodic-table/crystals/${id}.json`);
  assert.ok(Math.abs(nearestPeriodicDistance(data)-data.cell.a*factor)<1e-5,id);
 }
});
