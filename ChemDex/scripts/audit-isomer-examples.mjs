import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readSDF} from '../platform/viewer-canvas.js';
import {parseFormula} from '../shared/chemistry/formula.mjs';

export function verifyMolecularExample(example, raw) {
  const check=(ok,message)=>{if(!ok)throw Error(`${example.id}: ${message}`);};
  check(createHash('sha256').update(raw).digest('hex')===example.structure.sha256,'source bytes changed');
  check(Number(raw.split(/\r?\n/)[0])===example.cid,'CID mismatch');
  check(/<PUBCHEM_COMPOUND_CID>\r?\n(\d+)/.exec(raw)?.[1]===String(example.cid),'embedded CID mismatch');
  const model=readSDF(raw),counts={},valences=model.atoms.map(()=>0),adj=model.atoms.map(()=>[]);
  for(const atom of model.atoms){counts[atom.elem]=(counts[atom.elem]??0)+1;check([atom.x,atom.y,atom.z].every(Number.isFinite),'nonfinite coordinate');}
  check(JSON.stringify(Object.entries(counts).sort())===JSON.stringify(Object.entries(parseFormula(example.formula)).sort()),'composition mismatch');
  for(const {a,b,order} of model.bonds){
    check(a!==b&&adj[a]&&adj[b],'invalid bond index');
    adj[a].push(b);adj[b].push(a);valences[a]+=order;valences[b]+=order;
    const first=model.atoms[a],second=model.atoms[b],length=Math.hypot(first.x-second.x,first.y-second.y,first.z-second.z);
    check(length>.85&&length<1.8,'implausible C/H bond length');
  }
  check(model.atoms.every((a,i)=>valences[i]===(a.elem==='C'?4:1)),'carbon/hydrogen valence mismatch');
  const seen=new Set(),visit=i=>{if(seen.has(i))return;seen.add(i);adj[i].forEach(visit);};visit(0);
  check(seen.size===model.atoms.length,'disconnected molecule');
  const carbons=model.atoms.flatMap((a,i)=>a.elem==='C'?[i]:[]),carbonBonds=model.bonds.filter(b=>model.atoms[b.a].elem==='C'&&model.atoms[b.b].elem==='C');
  const topology={doubleBonds:carbonBonds.filter(b=>b.order===2).length,tripleBonds:carbonBonds.filter(b=>b.order===3).length,rings:carbonBonds.length-carbons.length+1,maxCarbonDegree:Math.max(...carbons.map(i=>adj[i].filter(j=>model.atoms[j].elem==='C').length))};
  for(const [key,value] of Object.entries(topology))check(value===example.topology[key],`${key} mismatch`);
  if(example.topology.stereochemistry){
    const double=carbonBonds.find(b=>b.order===2),a=model.atoms[double.a],b=model.atoms[double.b],axis=[b.x-a.x,b.y-a.y,b.z-a.z];
    const side=(i,other)=>{
      const start=model.atoms[i],end=model.atoms[adj[i].find(j=>j!==other&&model.atoms[j].elem==='C')];
      const v=[end.x-start.x,end.y-start.y,end.z-start.z],dot=v.reduce((n,x,k)=>n+x*axis[k],0)/axis.reduce((n,x)=>n+x*x,0);
      return v.map((x,k)=>x-dot*axis[k]);
    };
    const first=side(double.a,double.b),second=side(double.b,double.a),cos=first.reduce((n,x,k)=>n+x*second[k],0)/(Math.hypot(...first)*Math.hypot(...second));
    check(example.topology.stereochemistry==='cis'?cos>.99:cos<-.99,'cis/trans coordinates mismatch');
  }
  return {cid:example.cid,formula:example.formula,name:example.name,atoms:model.atoms.length,bonds:model.bonds.length,sha256:example.structure.sha256,...topology};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const groups=JSON.parse(fs.readFileSync('shared/molecular-isomers.json','utf8')),report=[];
  for(const group of Object.values(groups))for(const example of group.examples)report.push(verifyMolecularExample(example,fs.readFileSync('.'+example.structure.url,'utf8')));
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else console.log(`Verified ${report.length} sourced conformers across ${Object.keys(groups).length} formula groups, including cis/trans geometry.`);
}
