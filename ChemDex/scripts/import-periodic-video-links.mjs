import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const directory='.cache/learning-expansion';
await fs.mkdir(directory,{recursive:true});
const elements=JSON.parse(await fs.readFile('shared/elements.json','utf8'));
const original=JSON.parse(await fs.readFile('shared/video-catalog.json','utf8'));
const normalize=text=>text.toLowerCase().replace(/[^a-z]/g,'');
const names=new Map(elements.map(e=>[normalize(e.name_en),e.symbol]));
for(const [name,symbol] of Object.entries({aluminum:'Al',caesium:'Cs',caesiumorcesium:'Cs',sulphur:'S',ununtrium:'Nh',ununpentium:'Mc',ununseptium:'Ts',ununoctium:'Og',ununbium:'Cn'}))names.set(name,symbol);
const decode=text=>text.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const discovered=new Map(),pages=[];
for(let page=1;page<=12;page++){
  const source='https://ed.ted.com/ted_ed_collections/periodic-videos'+(page===1?'':`?page=${page}`);
  const file=`${directory}/ted-collection-${page}.html`;
  let html;
  try{html=await fs.readFile(file,'utf8');}catch{const res=await fetch(source,{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error(`TED-Ed page ${page}: ${res.status}`);html=await res.text();await fs.writeFile(file,html);}
  const records=[...html.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(match=>{
    const article=match[0],id=/i\.ytimg\.com\/vi\/([\w-]{11})\//.exec(article)?.[1];
    const heading=/<h2\b[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/.exec(article)?.[1];
    const lesson=/href="(\/best_of_web\/[^"?]+)/.exec(article)?.[1];
    const duration=/Lesson duration\s+(\d+:\d+)/.exec(article)?.[1];
    if(!id||!heading||!lesson)return null;
    const title=decode(heading),name=title.replace(/\s*[-–—]\s*Periodic Table (?:of )?Videos.*$/i,'').replace(/\s*\(or [^)]+\)/i,'').replace(/\s*\(.*?\)/g,'');
    return {id,title,symbol:names.get(normalize(name)),lesson:`https://ed.ted.com${lesson}`,durationSeconds:duration?duration.split(':').reduce((n,v)=>n*60+Number(v),0):null,collectionPage:source};
  }).filter(Boolean);
  pages.push({url:source,sha256:crypto.createHash('sha256').update(html).digest('hex'),lessonCount:records.length});
  let added=0;for(const record of records)if(!discovered.has(record.id)){discovered.set(record.id,record);added++;}
  console.log(`TED-Ed page ${page}: ${records.length} lessons, ${added} new`);
  if(!added||records.length<12)break;
}
// Lr has a lesson but is missing from the collection's paginated listing.
discovered.set('_zBsnnJOkyA',{id:'_zBsnnJOkyA',title:'Lawrencium - Periodic Table of Videos',symbol:'Lr',lesson:'https://ed.ted.com/best_of_web/O7MUVAir',durationSeconds:null,collectionPage:'https://ed.ted.com/periodic-videos'});
const audit=[],records=[...discovered.values()];let next=0;
await Promise.all(Array.from({length:4},async()=>{
  while(next<records.length){
    const item=records[next++];
    if(!item.symbol){audit.push({...item,status:'unmapped-title'});continue;}
    const file=`${directory}/youtube-${item.id}.json`;
    try{
      let metadata;try{metadata=JSON.parse(await fs.readFile(file,'utf8'));}catch{
        const url='https://www.youtube.com/oembed?url='+encodeURIComponent(`https://www.youtube.com/watch?v=${item.id}`)+'&format=json';
        const res=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error(`YouTube oEmbed ${res.status}`);
        metadata=await res.json();await fs.writeFile(file,JSON.stringify(metadata,null,2));
      }
      if(metadata.author_name!=='Periodic Videos')throw Error('Publisher mismatch');
      audit.push({...item,status:'verified-publisher',youtubeTitle:metadata.title,author:metadata.author_name});
    }catch(error){audit.push({...item,status:'unavailable',reason:error.message});}
  }
}));
audit.sort((a,b)=>(elements.find(e=>e.symbol===a.symbol)?.z??999)-(elements.find(e=>e.symbol===b.symbol)?.z??999));
const merged=original.map(v=>({...v}));
for(const item of audit.filter(r=>r.status==='verified-publisher')){
  const existing=merged.find(v=>v.id===item.id);
  const evidence={lessonSource:item.lesson,durationSeconds:item.durationSeconds,sourceTitle:item.title,publisherVerification:'YouTube oEmbed · Periodic Videos',archival:true};
  if(existing)Object.assign(existing,evidence);
  else merged.push({symbols:[item.symbol],id:item.id,title:item.youtubeTitle,publisher:'Periodic Videos · University of Nottingham',source:`https://www.youtube.com/watch?v=${item.id}`,...evidence});
}
const coverage=elements.map(e=>({symbol:e.symbol,videos:merged.filter(v=>v.symbols.includes(e.symbol)).map(v=>v.id)}));
await fs.writeFile('shared/video-catalog.json',JSON.stringify(merged,null,2)+'\n');
await fs.mkdir('docs/learning-expansion/2026-11-12',{recursive:true});
await fs.writeFile('docs/learning-expansion/2026-11-12/video-source-audit.json',JSON.stringify({date:'2026-11-12',pages,records:audit,coverage},null,2)+'\n');
console.log(JSON.stringify({videos:merged.length,elementsCovered:coverage.filter(e=>e.videos.length).length,missing:coverage.filter(e=>!e.videos.length).map(e=>e.symbol),unavailable:audit.filter(v=>v.status!=='verified-publisher')}));
