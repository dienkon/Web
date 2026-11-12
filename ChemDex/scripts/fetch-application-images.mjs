import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applicationTopics,applicationTopic} from './application-image-topics.mjs';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/manifest.json'),'utf8'));
const profiles=await Promise.all(manifest.map(async m=>JSON.parse(await fs.readFile(path.join(root,'data',m.file),'utf8'))));
const used=new Set(profiles.flatMap(p=>p.applications.map(a=>applicationTopic(a,p.symbol)?.[0])).filter(Boolean));
const topics=applicationTopics.filter(([id])=>used.has(id));
const reportPath=path.join(root,'data/application-image-provenance.json');
const previous=JSON.parse(await fs.readFile(reportPath,'utf8').catch(()=>'{}'));
const clean=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pages=new Map(),metadata=new Map();
const fileOverrides={'refinery':'Anacortes Refinery 31911.JPG','vacuum':'Helium leak detectors - geograph.org.uk - 6070876.jpg','magnetic-material':'Magnetostriction by Zureks.gif',
 'mri':'MRI-Philips.JPG','ammonia':'Haber-Bosch-En.svg','radiation-shield':'Lead shielding.jpg','reactor':'Advanced Test Reactor 001.jpg','research':'Part of UNILAC GSI.jpg'};
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(40000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
for(let i=0;i<topics.length;i+=40){
 const params=new URLSearchParams({action:'query',format:'json',prop:'pageimages',piprop:'name',redirects:'1',titles:topics.slice(i,i+40).map(t=>t[1]).join('|')});
 const data=await json('https://en.wikipedia.org/w/api.php?'+params);
 for(const p of Object.values(data.query.pages))pages.set(p.title.toLowerCase(),p);
 const aliases=[...(data.query.normalized??[]),...(data.query.redirects??[])];
 for(let pass=0;pass<3;pass++)for(const r of aliases){const target=pages.get(r.to.toLowerCase());if(target)pages.set(r.from.toLowerCase(),target);}
 await sleep(3000);
}
const filenames=[...new Set([...Object.values(fileOverrides),...[...pages.values()].map(p=>p.pageimage).filter(Boolean)])];
for(let i=0;i<filenames.length;i+=40){
 const data=await json('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'imageinfo',titles:filenames.slice(i,i+40).map(f=>'File:'+f).join('|'),iiprop:'url|extmetadata',iiurlwidth:'800'}));
 for(const p of Object.values(data.query.pages))metadata.set(p.title.slice(5).replaceAll(' ','_'),p.imageinfo?.[0]);
 await sleep(3000);
}
const results=[];
await fs.mkdir(path.join(root,'assets/periodic-table/applications'),{recursive:true});
for(const [id,title] of topics){
 const prior=previous.topics?.find(r=>r.id===id&&r.status==='downloaded');
 if(prior&&prior.topic===title&&(!fileOverrides[id]||prior.filename===fileOverrides[id])){results.push(prior);continue;}
 const page=pages.get(title.toLowerCase()),filename=fileOverrides[id]??page?.pageimage,image=metadata.get(filename?.replaceAll(' ','_')),meta=image?.extmetadata;
 const row={id,topic:title,status:'link',article:`https://en.wikipedia.org/wiki/${encodeURIComponent(page?.title??title)}`,source:image?.descriptionurl??`https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=${encodeURIComponent(title)}`};
 try{
  if(!image)throw Error('Chưa có ảnh đại diện kèm metadata đã xác minh.');
  row.filename=filename;row.description=clean(meta.ImageDescription?.value);row.author=clean(meta.Artist?.value)||clean(meta.Credit?.value)||'Tác giả không ghi trong metadata';row.license=clean(meta.LicenseShortName?.value);row.licenseUrl=clean(meta.LicenseUrl?.value);row.original=image.url;
  if(!/CC BY|CC0|Public domain/i.test(row.license))throw Error('Chỉ liên kết nguồn: chưa chọn giấy phép phù hợp để lưu cục bộ.');
  const url=image.thumburl??image.url;if(!/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url))throw Error('Không tải định dạng video/tài liệu không có preview phù hợp.');
  await sleep(1800);
  const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error(`Ảnh HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  const extension=/gif/.test(response.headers.get('content-type'))?'gif':/png/.test(response.headers.get('content-type'))?'png':/webp/.test(response.headers.get('content-type'))?'webp':'jpg';
  row.file=`/assets/periodic-table/applications/${id}.${extension}`;await fs.writeFile(path.join(root,row.file.slice(1)),bytes);
  row.status='downloaded';row.sha256=createHash('sha256').update(bytes).digest('hex');row.bytes=bytes.length;
 }catch(error){row.reason=error.message;}
 results.push(row);
 await fs.writeFile(reportPath,JSON.stringify({date:'2026-11-12',policy:'Application-field illustrations with Commons source, creator and license. The picture does not certify elemental composition of a depicted product. Research-only entries are not labelled industrial applications.',topics:results},null,2)+'\n');
 console.log(`${id}: ${row.status}${row.reason?' — '+row.reason:''}`);
}
await fs.writeFile(reportPath,JSON.stringify({date:'2026-11-12',policy:'Application-field illustrations with Commons source, creator and license. The picture does not certify elemental composition of a depicted product. Research-only entries are not labelled industrial applications.',topics:results},null,2)+'\n');
console.log(JSON.stringify({topics:results.length,downloaded:results.filter(r=>r.status==='downloaded').length}));
