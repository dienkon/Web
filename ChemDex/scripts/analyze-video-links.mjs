import fs from 'node:fs';
const base = process.env.CHEMDEX_API_URL || 'http://127.0.0.1:4173';
const catalog = JSON.parse(fs.readFileSync('shared/video-catalog.json','utf8'));
const output = 'shared/video-questions.generated.json';
const prepared = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output,'utf8')) : {};
const errors=[];
// Keep only links and validated question metadata. No media files are retrieved.
for (let index=0; index<catalog.length; index+=2) {
  const results = await Promise.allSettled(catalog.slice(index,index+2).map(async video => {
    if (prepared[video.source]) return prepared[video.source];
    const res = await fetch(base+'/api/gemini/video-quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:video.source}),signal:AbortSignal.timeout(180000)});
    const data = await res.json();
    if (!res.ok) throw Error(`${video.id}: ${data.error || res.status}`);
    return { ...data, generatedAt: new Date().toISOString() };
  }));
  results.forEach((result,i)=>{
    const video=catalog[index+i];
    if(result.status==='fulfilled') {prepared[video.source]=result.value;console.log(`${video.id}: ${result.value.cues.length} checkpoints`);}
    else errors.push(String(result.reason));
  });
  fs.writeFileSync(output,JSON.stringify(prepared,null,2)+'\n');
}
if(errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
