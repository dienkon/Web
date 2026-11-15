import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorialArticles} from './data/editorial-articles.mjs';
import {editorialBiographies} from './data/editorial-biographies.mjs';
import {editorialApplications} from './data/editorial-applications.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const write=(relative,value)=>{
  const target=path.join(root,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n');
};

// Curated Vietnamese manuscripts are the source of truth. This builder only
// assembles their sources, illustrations and metadata; it never expands a
// subject into multiple near-identical articles to satisfy a count target.
export function buildEditorialLibrary() {
  const photosPath=path.join(root,'scripts/data/story-photo-sources.json');
  const photoData=fs.existsSync(photosPath)?read('scripts/data/story-photo-sources.json'):[];
  const photos=Array.isArray(photoData)?photoData:(photoData.photos??photoData.entries??[]);
  const existing=['index.json','reference-index.generated.json','biography-index.generated.json'].flatMap(file=>read('trung-tam/src/data/'+file));
  const usedIds=new Set(existing.flatMap(doc=>[doc.id,doc.slug,...(doc.legacyIds??[])].filter(Boolean)));
  const titles=new Set(existing.map(doc=>doc.title));
  const routes=read('shared/library-routes.generated.json');
  const categories=new Set(read('trung-tam/src/data/config.json').categories.map(cat=>cat.id));
  const index=[];
  for(const article of [...editorialArticles,...editorialBiographies,...editorialApplications]) {
    if(!/^[a-z0-9-]+$/.test(article.id)||usedIds.has(article.id))throw Error('Duplicate or invalid editorial ID: '+article.id);
    if(titles.has(article.title)||!categories.has(article.category))throw Error('Duplicate title or unknown category: '+article.id);
    if(article.sections.length<3||article.sources.length<2)throw Error('Incomplete manuscript: '+article.id);
    const sources=article.sources.map(([title,url])=>({title,url}));
    for(const source of sources)if(!/^https:\/\//.test(source.url))throw Error('Invalid editorial source: '+article.id);
    const photo=article.photoKey?photos.find(p=>p.id===article.photoKey||p.key===article.photoKey):undefined;
    const image=photo?.image??photo?.localPath??article.image;
    if(!image||!fs.existsSync(path.join(root,'trung-tam/public',image)))throw Error('Missing editorial image: '+article.id+' '+image);
    const photoSource=photo?.sourceUrl??photo?.sourcePage;
    const license=photo?.licenseUrl?`[${photo.license}](${photo.licenseUrl.replace(/^http:/,'https:')})`:photo?.license??'';
    const credit=photo?.credit&&photo.credit!=='Own work'?`; ${photo.credit.replace(/https?:\/\/[^\s;]+/g,url=>`[Tư liệu gốc](${url})`)}`:'';
    const photoCaption=photo?`*${photo.caption??article.imageAlt} — ${photo.author??photo.artist??''}${credit}; ${license}${photoSource?`. [Nguồn ảnh](${photoSource})`:''}.*`:'';
    const sections=article.sections.map(([heading,text])=>`## ${heading}\n\n${text.trim()}`);
    sections.splice(1,0,`![${photo?.alt??article.imageAlt}](${image})${photoCaption?'\n\n'+photoCaption:''}`);
    const content=sections.join('\n\n')+'\n\n## Nguồn và đọc thêm\n\n'+sources.map(s=>`- [${s.title}](${s.url})`).join('\n');
    const meta={id:article.id,slug:article.id,documentPath:`docs/${article.id}/index.json`,title:article.title,summary:article.summary,category:article.category,author:'Ban biên tập ChemDex',image,tags:article.tags,aliases:article.aliases??[],documentKind:'story',readingMinutes:Math.max(3,Math.ceil(content.split(/\s+/).length/180))};
    const evidence={language:'vi',scope:article.scope??'chemical-family',contextLabel:article.title,reviewBasis:'Biên soạn theo các nguồn dẫn cuối bài; phân biệt kết quả đã thực hiện và hướng phát triển.',story:{status:'documented',section:'## '+article.sections[0][0],sources:sources.map(s=>s.url)},application:{status:'documented',section:'## '+article.sections.at(-1)[0],sources:sources.map(s=>s.url)}};
    meta.editorialEvidence=evidence;
    write('trung-tam/src/data/'+meta.documentPath,{...meta,content});
    index.push(meta);usedIds.add(meta.id);titles.add(meta.title);routes[meta.id]=meta.slug;
  }
  write('trung-tam/src/data/editorial-index.generated.json',index);
  write('shared/library-routes.generated.json',routes);
  console.log(`Editorial library: ${index.length} Vietnamese feature articles.`);
  return index;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildEditorialLibrary();
