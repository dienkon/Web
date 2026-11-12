import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const directory='.cache/cod-research';
await fs.mkdir(directory,{recursive:true});
let lastRequest=0;
for(const id of process.argv.slice(2)){
  if(!/^\d{7}$/.test(id))throw Error('Expected a COD identifier');
  const file=`${directory}/${id}.cif`,url=`https://cod.psdi.ac.uk/cod/${id}.cif`;
  let bytes;
  try {bytes=await fs.readFile(file);}catch{
    const pause=Math.max(0,10000-(Date.now()-lastRequest));
    if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
    lastRequest=Date.now();
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(`COD ${id}: HTTP ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>5000000 || !/(?:^|\n)data_/i.test(bytes.toString('utf8')) || /<!doctype html/i.test(bytes.toString('utf8')))throw Error('Invalid CIF for COD '+id);
    await fs.writeFile(file,bytes);
  }
  await fs.writeFile(`${directory}/${id}.transport.json`,JSON.stringify({id,url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},null,2)+'\n');
  console.log(JSON.stringify({id,bytes:bytes.length}));
}
