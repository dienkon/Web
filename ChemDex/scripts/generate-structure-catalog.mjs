import fs from 'node:fs';
import { build } from 'esbuild';
import { structureFormula, compositionKey, generateStructure } from '../shared/chemistry/structure-generator.mjs';
const json = p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const bundle=await build({entryPoints:['lab-3d/src/data/chemicals.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {CHEMICAL_DATABASE}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const curated=json('shared/compounds.json'), coverage=json('shared/lab-structure-coverage.json');
const species=json('shared/reaction-catalog.generated.json').species;
const records=[], rejected=[];
const identities=json('shared/structure-identities.json');
function add(row) {
  try {
    const identity=identities[row.formula];
    const formula=identity?.formula ?? structureFormula(row.formula), key=compositionKey(formula);
    const exact=curated.filter(c=>structureFormula(c.formula)===formula);
    const candidates=exact.length ? exact : curated.filter(c=>compositionKey(c.formula)===key);
    const condensed={CH3COOH:'cid-176',C2H5OH:'cid-702',CH3OH:'cid-887',CH3COCH3:'cid-180',C6H5OH:'cid-996',C6H5NH2:'cid-6115',HCHO:'cid-712',CH3CHO:'cid-177',HCOOH:'cid-284',CH3COOC2H5:'cid-885'};
    const named=candidates.find(c=>c.name_vi===row.name_vi || c.name_en===row.name_en || c.id===condensed[formula] || c.aliases?.includes(row.formula));
    // Organic sum formulas cannot distinguish isomers. Never silently attach
    // acetic-acid coordinates to methyl formate, or cyclohexane to a hexene.
    const organic=/C(?![a-z])/.test(formula)&&/H/.test(formula);
    const match=identity?.material ? null : named ?? (!organic && candidates.length===1 ? candidates[0] : null);
    const salt=species.find(s=>structureFormula(s.formula)===formula);
    const localIdentity = identity?.cid && fs.existsSync(`shared/structures/${identity.cid}.sdf`);
    const record={...row,formula,kind:match?.kind??row.kind??(salt?.ions ? 'components':'composition'),family:/C(?![a-z])/.test(formula)&&/H/.test(formula)?'organic':'inorganic',...(match?{structure:match.structure,cid:match.cid,atomCount:match.atomCount}:{}),...(salt?.ions?{ions:salt.ions}:{}),aliases:[row.formula,...(row.aliases??[])]};
    if(identity?.note) record.modelNote=identity.note;
    if(identity?.material) {record.material=true;record.materialLabel=row.formula;record.molarMass=null;}
    if(identity?.source) record.identitySource=identity.source;
    if(localIdentity) {record.cid=identity.cid;record.kind='molecule';record.structure={url:`/shared/structures/${identity.cid}.sdf`,dimension:'3d',format:'sdf',source:identity.source,provenance:'PubChem computed 3D conformer'};}
    const generated=generateStructure(record);
    record.atomCount??=generated.atoms.length;
    records.push(record);
  } catch(error) { rejected.push({formula:row.formula,reason:error.message}); }
}
for(const c of coverage) add({...c,id:c.chemicalId,lab:true});
for(const s of species) if(![...curated,...records].some(c=>c.formula===s.formula)) add({...s,id:`formula-${s.formula}`,name_vi:s.name_vi??s.formula});
for(const s of CHEMICAL_DATABASE) {
  let formula;try{formula=identities[s.formula]?.formula??structureFormula(s.formula);compositionKey(formula);}catch{rejected.push({formula:s.formula,reason:'Nhãn vật liệu hoặc hỗn hợp, không phải công thức phân tử xác định.'});continue;}
  const existing=records.find(c=> identities[s.formula] ? c.aliases.includes(s.formula) : !c.material && c.formula===formula);
  if(existing) {existing.aliases.push(s.formula,s.name_vi,s.name_en);existing.lab=true;continue;}
  add({...s,id:`lab3d-${records.length}`,name_vi:s.name_vi,name_en:s.name_en,lab:true});
}
for(const e of json('shared/elements.json')) if(![...curated,...records].some(c=>c.formula===e.symbol)) add({id:`atom-${e.symbol}`,formula:e.symbol,name_vi:e.name_vi??e.nameVi??e.name,name_en:e.name_en??e.nameEn,kind:'atom',family:'inorganic'});
fs.writeFileSync('shared/structure-catalog.generated.json',JSON.stringify(records,null,2)+'\n');
fs.writeFileSync('shared/structure-generation-report.json',JSON.stringify({curated:curated.length,additional:records.length,formulaComplete:records.filter(r=>!r.material).length,materialIllustrations:records.filter(r=>r.material).map(r=>r.id),labIdentityCount:coverage.length,rejected},null,2)+'\n');
console.log(`3D catalog: ${curated.length} sourced + ${records.length} additional records; ${rejected.length} material labels without a molecular formula.`);
