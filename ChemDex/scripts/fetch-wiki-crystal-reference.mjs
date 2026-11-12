import fs from 'node:fs/promises';
import path from 'node:path';
import {parseWikiInfobox,cleanWikiValue as clean} from '../shared/chemistry/wiki-infobox.mjs';
const root=path.resolve(import.meta.dirname,'..');
const elements=JSON.parse(await fs.readFile(path.join(root,'shared/elements.json'),'utf8'));
const output=path.join(root,'data/wiki-crystal-reference.json');
const records=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const names={Al:'Aluminium',Cs:'Caesium'};
for(let offset=0;offset<elements.length;offset+=20){
 const batch=elements.slice(offset,offset+20);
 const titles=batch.map(e=>'Template:Infobox '+(names[e.symbol]??e.name_en).toLowerCase());
 const params=new URLSearchParams({action:'query',format:'json',prop:'revisions',rvprop:'ids|timestamp|content',rvslots:'main',redirects:'1',titles:titles.join('|')});
 const response=await fetch('https://en.wikipedia.org/w/api.php?'+params,{signal:AbortSignal.timeout(40000)});
 if(!response.ok)throw Error(`Wikipedia HTTP ${response.status}`);
 const result=await response.json(),pages=Object.values(result.query.pages);
 for(const element of batch){
  const title='Template:Infobox '+(names[element.symbol]??element.name_en).toLowerCase();
  const page=pages.find(p=>p.title.toLowerCase()===title.toLowerCase());
  const revision=page?.revisions?.[0],text=revision?.slots?.main?.['*']??'';
  const fields={};
  for(const [key,value] of Object.entries(parseWikiInfobox(text))){
   if(/^(?:crystal structure|lattice constant|space group|phase|allotropes)/.test(key))fields[key]={text:clean(value),raw:value};
  }
  const name=names[element.symbol]??element.name_en;
  records.push({symbol:element.symbol,number:element.z,name,article:`https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`,template:`https://en.wikipedia.org/wiki/${title.replaceAll(' ','_')}`,
   revisionId:revision?.revid??null,revisionTimestamp:revision?.timestamp??null,retrievedAt:new Date().toISOString(),status:text?'available':'missing-template',fields});
 }
 await fs.writeFile(output,JSON.stringify({schema:'chemdex.wikipedia-crystal-reference/1',policy:'Reference comparison requested by user. Published CIF remains authoritative for measured coordinates; Wikipedia prototypes and conditions are not silently substituted.',elements:records},null,2)+'\n');
 console.log(`Wikipedia crystal infoboxes: ${records.length}/118`);await sleep(2500);
}
