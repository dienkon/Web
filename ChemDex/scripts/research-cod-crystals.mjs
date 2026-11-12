// Metadata discovery only: selections are reviewed separately, never first-hit.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const directory='.cache/cod-research';
await fs.mkdir(directory,{recursive:true});
const formulas={
  'silver-nitrate':'Ag N O3','potassium-permanganate':'K Mn O4',
  'sodium-hydroxide':'H Na O','potassium-hydroxide':'H K O','barium-hydroxide':'Ba H2 O2',
  'iron-hydroxide':'Fe H2 O2','cobalt-hydroxide':'Co H2 O2','nickel-hydroxide':'H2 Ni O2','manganese-hydroxide':'H2 Mn O2',
  'chromium-chloride':'Cl3 Cr','lead-nitrate':'N2 O6 Pb','copper-nitrate':'Cu N2 O6',
  'aluminium-chloride':'Al Cl3','aluminium-bromide':'Al Br3','aluminium-iodide':'Al I3',
  'sodium-thiosulfate':'Na2 O3 S2','methane':'C H4','ammonia':'H3 N','hydrogen-peroxide':'H2 O2',
  'benzene':'C6 H6','hexoses':'C6 H12 O6','sucrose':'C12 H22 O11','ethanol':'C2 H6 O','methanol':'C H4 O',
  'acetone':'C3 H6 O','acetic-acid':'C2 H4 O2','formic-acid':'C H2 O2','aspirin':'C9 H8 O4',
  'caffeine':'C8 H10 N4 O2','naphthalene':'C10 H8','phenol':'C6 H6 O','sodium-acetate':'C2 H3 Na O2',
};
const audit=[];
let lastRequest=0;
for(const [name,formula] of Object.entries(formulas)){
  const url='https://www.crystallography.net/cod/result?'+new URLSearchParams({formula,format:'json'});
  const file=`${directory}/query-${name}.json`;
  try {
    let raw;
    try {raw=await fs.readFile(file,'utf8');}catch{
      const pause=Math.max(0,10000-(Date.now()-lastRequest));
      if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
      lastRequest=Date.now();
      const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
      if(!response.ok)throw Error('COD metadata HTTP '+response.status);
      raw=await response.text();JSON.parse(raw);await fs.writeFile(file,raw);
    }
    const data=JSON.parse(raw);
    audit.push({name,formula,url,count:data.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')});
    console.log(JSON.stringify({name,candidates:data.length}));
  }catch(error){audit.push({name,formula,url,error:error.message});console.log(JSON.stringify({name,error:error.message}));}
}
await fs.writeFile(directory+'/query-audit.json',JSON.stringify(audit,null,2)+'\n');
