import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const catalog=JSON.parse(await fs.readFile(path.join(root,'data/mineral-models.json'),'utf8'));
const reportPath=path.join(root,'data/mineral-image-provenance.json');
const previous=JSON.parse(await fs.readFile(reportPath,'utf8').catch(()=>'{}'));
const clean=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fileOverrides={'native-platinum':'Platinum-274992.jpg'};
const titles={celestine:'Celestine (mineral)',apatite:'Apatite',sulfur:'Sulfur',lepidolite:'Lepidolite',xenotime:'Xenotime',columbite:'Columbite',tantalite:'Tantalite','native-gold':'Native gold','native-platinum':'Platinum',monazite:'Monazite'};
const pages=new Map(),metadata=new Map(),results=[];
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(35000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
for(let i=0;i<catalog.models.length;i+=40){
  const batch=catalog.models.slice(i,i+40);
  const data=await json(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({action:'query',format:'json',prop:'pageimages',piprop:'name',redirects:'1',titles:batch.map(m=>titles[m.id]??m.name.split(' (')[0]).join('|')})}`);
  for(const p of Object.values(data.query.pages))pages.set(p.title.toLowerCase(),p);
  for(const r of [...(data.query.redirects??[]),...(data.query.normalized??[])]){const target=pages.get(r.to.toLowerCase());if(target)pages.set(r.from.toLowerCase(),target);}
  await sleep(5000);
}
const files=[...new Set([...Object.values(fileOverrides),...[...pages.values()].map(p=>p.pageimage).filter(Boolean)])];
for(let i=0;i<files.length;i+=40){
 const data=await json(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({action:'query',format:'json',prop:'imageinfo',titles:files.slice(i,i+40).map(f=>'File:'+f).join('|'),iiprop:'url|extmetadata',iiurlwidth:'960'})}`);
 for(const p of Object.values(data.query.pages))metadata.set(p.title.slice(5).replaceAll(' ','_'),p.imageinfo?.[0]);
 await sleep(5000);
}
await fs.mkdir(path.join(root,'assets/periodic-table/mineral-photos'),{recursive:true});
for(const model of catalog.models){
 const retained=previous.minerals?.find(r=>r.id===model.id&&r.status==='downloaded');
 if(retained&&(!fileOverrides[model.id]||fileOverrides[model.id]===retained.filename)){results.push(retained);continue;}
 const name=titles[model.id]??model.name.split(' (')[0];
 const page=pages.get(name.toLowerCase());const filename=fileOverrides[model.id]??page?.pageimage;
 const image=metadata.get(filename?.replaceAll(' ','_'));const meta=image?.extmetadata;
 const result={id:model.id,name:model.name,query:name,status:'link',source:image?.descriptionurl??`https://en.wikipedia.org/wiki/${encodeURIComponent(page?.title??name)}`,filename};
 try{
  if(!image)throw Error('Không tìm được ảnh có metadata; giữ liên kết tra cứu.');
  const license=clean(meta?.LicenseShortName?.value);
  result.original=image.url;result.author=clean(meta.Artist?.value);result.license=license;result.licenseUrl=clean(meta.LicenseUrl?.value);result.description=clean(meta.ImageDescription?.value);
  if(!/CC BY|CC0|Public domain/i.test(license))throw Error('Giữ liên kết nguồn; chưa có giấy phép phù hợp để lưu ảnh cục bộ.');
  const url=image.thumburl??image.url;
  if(!/\.(jpe?g|png|webp)(\?|$)/i.test(url))throw Error('Ảnh động/vector: chỉ giữ trang nguồn.');
  await sleep(1800);
  const response=await fetch(url,{signal:AbortSignal.timeout(35000)});
  if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error(`Ảnh HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());const ext=/png/.test(response.headers.get('content-type'))?'png':/webp/.test(response.headers.get('content-type'))?'webp':'jpg';
  result.file=`/assets/periodic-table/mineral-photos/${model.id}.${ext}`;
  await fs.writeFile(path.join(root,result.file.slice(1)),bytes);
  result.status='downloaded';result.sha256=createHash('sha256').update(bytes).digest('hex');result.bytes=bytes.length;
 }catch(error){result.reason=error.message;}
 results.push(result);
 await fs.writeFile(reportPath,JSON.stringify({date:'2026-11-11',policy:'Ảnh mẫu thật tách biệt mô hình tinh thể; giữ tác giả, giấy phép và liên kết nguồn. Ảnh không khẳng định là cùng mẫu được đo CIF.',minerals:results},null,2)+'\n');
 console.log(`${model.id}: ${result.status}${result.reason?' — '+result.reason:''}`);
}
await fs.writeFile(reportPath,JSON.stringify({date:'2026-11-11',policy:'Ảnh mẫu thật tách biệt mô hình tinh thể; giữ tác giả, giấy phép và liên kết nguồn. Ảnh không khẳng định là cùng mẫu được đo CIF.',minerals:results},null,2)+'\n');
console.log(JSON.stringify({minerals:results.length,downloaded:results.filter(r=>r.status==='downloaded').length}));
