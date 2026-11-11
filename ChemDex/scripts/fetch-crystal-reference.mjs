import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const source='https://docs.xrayabsorption.org/databases/amcsd_cif2.db';
const expected='94e5486b763a77ebd3300e950786bc787bfce8f2722c9ba2c7c99048bee7a67e';
const destination=path.join(root,'.cache/crystal-research/amcsd_cif2.db');
let bytes=await fs.readFile(destination).catch(()=>null);
if(!bytes){
 const response=await fetch(source,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`Crystal reference HTTP ${response.status}`);
 bytes=Buffer.from(await response.arrayBuffer());
}
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!==expected)throw Error(`Reference snapshot changed (${sha256}); review before replacing the selected structures.`);
await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,bytes);
console.log(JSON.stringify({source,bytes:bytes.length,sha256}));
