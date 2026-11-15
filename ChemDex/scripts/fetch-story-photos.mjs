import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const userAgent='ChemDexEducationalLibrary/1.0 (educational chemistry; Wikimedia source attribution retained)';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(url,binary=false) {
  for(let attempt=0;attempt<5;attempt++) {
    const response=await fetch(url,{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(45000)});
    if(response.status===429||response.status===503) {await sleep(2500*(attempt+1));continue;}
    if(!response.ok)throw Error(`${response.status} ${url}`);
    return binary?Buffer.from(await response.arrayBuffer()):response.json();
  }
  throw Error(`Rate limit: ${url}`);
}
// Replay the reviewed selection. Article builders should render author, license
// and source links alongside each image using this manifest's attribution.
{
  const sourceFile=path.join(root,'scripts/data/story-photo-sources.json');
  const data=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
  for(const record of data.photos) {
    if(!/^\/assets\/library\/photos\/stories\/[a-z0-9-]+\.(jpg|png)$/.test(record.image))throw Error(`Invalid asset path: ${record.image}`);
    if(!record.author||!record.license||!record.sourceUrl||!record.licenseUrl)throw Error(`Incomplete attribution: ${record.id}`);
    const destination=path.join(root,'assets',record.image.replace(/^\/assets\//,''));
    if(!fs.existsSync(destination)||process.argv.includes('--force')) {
      await sleep(1000);
      const bytes=await request(record.downloadUrl,true);
      if(!((bytes[0]===0xff&&bytes[1]===0xd8)||(bytes[0]===0x89&&bytes.toString('ascii',1,4)==='PNG')))throw Error(`Invalid image ${record.id}`);
      if(bytes.length>1_000_000)throw Error(`Select a smaller source thumbnail: ${record.id}`);
      fs.mkdirSync(path.dirname(destination),{recursive:true});
      fs.writeFileSync(destination,bytes);
    }
    const bytes=fs.readFileSync(destination);
    record.sha256=createHash('sha256').update(bytes).digest('hex');
    record.bytes=bytes.length;
    for(const relative of ['trung-tam/public','public']) {
      const copy=path.join(root,relative,record.image);
      fs.mkdirSync(path.dirname(copy),{recursive:true});fs.copyFileSync(destination,copy);
    }
    console.log(record.id,bytes.length);
  }
  fs.writeFileSync(sourceFile,JSON.stringify(data,null,2)+'\n');
}
