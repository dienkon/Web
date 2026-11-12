import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'docs/application-crystal-review/2026-11-12');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const hash=file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
const photos=read('data/application-image-provenance.json'),wiki=read('data/wiki-crystal-reference.json');
const cells=[...read('data/crystal-catalog.json').structures,...read('data/wiki-crystal-models.json').structures];
let pictures=0,profilesWithPictures=0,applicationEntries=0;
for(const entry of read('data/manifest.json')){
 const p=read('data/'+entry.file),seen=new Set();let count=0;
 check(wiki.elements.some(w=>w.symbol===p.symbol&&w.revisionId),`${p.symbol}: missing Wiki reference`);
 check(fs.existsSync(path.join(root,p.review.applicationCrystalAudit)),`${p.symbol}: missing follow-up audit`);
 for(const app of p.applications){
  applicationEntries++;
  if(!app.applicationImage)continue;
  const image=app.applicationImage;count++;pictures++;
  check(!seen.has(image.topic),`${p.symbol}: duplicate topic image`);seen.add(image.topic);
  const source=photos.topics.find(s=>s.id===image.topic&&s.status==='downloaded');
  check(source&&source.file===image.src&&source.source===image.source&&source.author===image.author&&source.license===image.license,`${p.symbol}: image/source mismatch`);
 }
 if(count)profilesWithPictures++;
 if(p.structure.publishedCrystal){
  const cell=p.structure.publishedCrystal;
  check(cells.some(c=>c.id===cell.id),`${p.symbol}: unknown crystal`);
  if(cell.evidence==='reference-prototype')check(cell.amcsdId===null&&Boolean(cell.limitations),`${p.symbol}: prototype falsely identified as a measured record`);
 }
}
for(const photo of photos.topics)if(photo.status==='downloaded'){
 check(hash(photo.file.slice(1))===photo.sha256,`${photo.id}: image hash`);
 check(Boolean(photo.source&&photo.author&&photo.license),`${photo.id}: image attribution`);
}
const assets=[];
for(const cell of cells){
 const data=read(cell.data.slice(1));
 for(const key of ['data','cif','model','preview']){
  const file=cell[key].slice(1);
  try{assets.push({id:cell.id,kind:key,file,bytes:fs.statSync(path.join(root,file)).size,sha256:hash(file),source:cell.source,evidence:cell.evidence,amcsdId:cell.amcsdId,referenceId:cell.referenceId??null});}
  catch(error){errors.push(`${cell.id}: missing ${key}`);}
 }
 const name=cell.id;
 const lines=[`# ${cell.mineralName} — ${name}`,'',`- Loại chứng cứ: ${cell.evidence}.`,
  `- Định danh: ${cell.amcsdId?'AMCSD '+cell.amcsdId:cell.referenceId}.`,
  `- Nhóm không gian: ${cell.spaceGroup}; ${cell.siteCount} vị trí/ô; ${cell.mixedSiteCount} vị trí hỗn hợp.`,
  `- Thông số: ${JSON.stringify(cell.cell)}; V = ${cell.volume} Å³.`,
  `- [Nguồn](${cell.source}).`,
  `- Tài liệu: ${cell.reference.authors.join(', ')} (${cell.reference.year}), ${cell.reference.title}; ${[cell.reference.journal,cell.reference.volume,cell.reference.pages].filter(Boolean).join(' ')}.`,
  `- Lưu ý: ${cell.note||'Giữ bộ tọa độ và metric đã công bố.'}`,`- Giới hạn: ${cell.limitations||'Bán kính/màu cầu là quy ước; cấu trúc tuần hoàn không phải quét bề mặt mẫu.'}`,
  `- ${data.asymmetricSites.length} vị trí bất đối xứng; ${data.symmetryOperations.length} phép đối xứng.`,
  '- Khung nhìn dùng đủ metric, trục z hướng lên; fit theo cả chiều ngang và dọc màn hình. Nguyên tử trên biên lặp để khép ô, không làm tăng thống kê ô nửa mở.',
  '- Chế độ cầu tiếp xúc chỉ dành cho ô đơn chất có vị trí đầy; bán kính lấy nửa khoảng cách láng giềng gần nhất trong mạng tuần hoàn, không phải phép đo mật độ electron.',
  '- JSON/CIF/GLB/PNG và SHA-256 xem asset-manifest.json.',''];
 fs.mkdirSync(path.join(folder,'tinh-the',name),{recursive:true});fs.writeFileSync(path.join(folder,'tinh-the',name,'audit.md'),lines.join('\n'));
}
const render=read('docs/application-crystal-review/2026-11-12/crystal-render-verification.json');
check(render.models.length===cells.length,'Incomplete render verification');check(render.errors.length===0,'Render errors');
check(profilesWithPictures===118,'Missing element application illustrations');
const report={valid:errors.length===0,profiles:118,applicationEntries,illustratedEntries:pictures,profilesWithPictures,downloadedTopics:photos.topics.filter(p=>p.status==='downloaded').length,
 wikiReferences:wiki.elements.length,crystalStructures:cells.length,elementCrystals:read('docs/application-crystal-review/2026-11-12/summary.json').elementCrystalModels,referencePrototypes:cells.filter(c=>c.evidence==='reference-prototype').length,rendered:render.models.length,errors};
fs.writeFileSync(path.join(folder,'asset-manifest.json'),JSON.stringify(assets,null,2)+'\n');
fs.writeFileSync(path.join(folder,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(errors.length)process.exitCode=1;
