import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseFormula} from '../shared/chemistry/formula.mjs';
import {substanceSlug, documentFile} from '../shared/library-paths.mjs';
import {isomerGroupFor} from '../shared/chemistry/molecular-isomers.mjs';
import {resolveLabExperiment} from '../shared/chemistry/study-links.mjs';
import {isomerLesson, isomerCoverSVG} from './isomer-lesson.mjs';
import {substanceLesson} from './substance-lesson.mjs';
import {buildStudyReferences} from './build-study-references.mjs';
import ionicComponents from '../shared/ionic-components.generated.json' with {type:'json'};

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const subjects = [...read('shared/compounds.json'), ...read('shared/structure-catalog.generated.json')];
const authored = read('trung-tam/src/data/index.json');
const elements = read('shared/elements.json');
const byElement = new Map(elements.map(e=>[e.symbol,e]));
const reactionData = read('shared/reaction-catalog.generated.json');
const detailCache = new Map(read('data/manifest.json').filter(m=>m.symbol&&m.file&&fs.existsSync('data/'+m.file)).map(m=>[m.symbol,read('data/'+m.file)]));
const crystalLinks = read('shared/crystal-links.generated.json');
const crystals = new Map(['data/crystal-catalog.json','data/wiki-crystal-models.json','data/substance-crystal-models.json','data/cod-crystal-models.json'].flatMap(file=>read(file).structures).map(c=>[c.id,c]));
const output = path.resolve('trung-tam/src/data/reference');
if (path.dirname(output) !== path.resolve('trung-tam/src/data') || path.basename(output) !== 'reference') throw Error('Invalid generated-library directory');
fs.rmSync(output,{recursive:true,force:true}); fs.mkdirSync(output,{recursive:true});

// Preserve chemical identities, stable slugs and all existing document aliases.
function identity(s) {
  if (s.material) return 'material:'+s.materialLabel;
  if (s.kind === 'crystal') return s.id;
  if (s.cid) return 'cid:'+s.cid;
  if (/^[A-Z][a-z]?$/.test(s.formula)) return 'element:'+s.formula;
  return s.family === 'organic' ? 'named:'+s.formula+':'+s.name_vi : 'formula:'+s.formula;
}
const pretty = formula => formula.split(/[·.]/).map((part,i)=>{
  const prefix = i ? part.match(/^\d+/)?.[0] ?? '' : '';
  return prefix + part.slice(prefix.length).replace(/\d/g,n=>'₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
}).join('·');
const safeMeta = value => String(value ?? '').trim();
const existing = new Map();
for (const a of authored) {
  if (!fs.existsSync(documentFile(a))) continue;
  const full = read(documentFile(a));
  if (full.content.length < 2500 || !/^## /m.test(full.content) || !full.content.includes('<details>') || !full.content.includes('https://')) continue;
  for (const id of a.substanceIds ?? []) existing.set(id,a.id);
  if (a.id === '001_H') for (const s of subjects.filter(s=>s.formula==='H'&&!s.material)) existing.set(s.id,a.id);
}
const groups = new Map();
for (const s of subjects) { const key=identity(s); if(!groups.has(key))groups.set(key,[]); groups.get(key).push(s); }
const generated=[], links={}, usedSlugs=new Set(authored.map(a=>a.slug??a.id));
const assetDirs = ['trung-tam/public/assets/library/substances','assets/library/substances','public/assets/library/substances'];
if (fs.existsSync('dist')) assetDirs.push('dist/assets/library/substances');
for (const dir of assetDirs) fs.mkdirSync(dir,{recursive:true});

for (const [key,group] of groups) {
  const editorial=group.map(s=>existing.get(s.id)).find(Boolean);
  if (editorial) { for(const s of group)links[s.id]=editorial; continue; }
  const s=group.find(s=>s.structure)??group[0], formula=s.formula, counts=parseFormula(formula);
  const atomCount=Object.values(counts).reduce((a,b)=>a+b,0);
  const element=Object.keys(counts).length===1&&atomCount===1?byElement.get(formula):null;
  const detail=element?detailCache.get(element.symbol):null;
  const material=Boolean(s.material||s.modelNote?.includes('đơn vị lặp'));
  const hydrate=/^(.+?)[·.](\d*)H2O$/.exec(formula), base=hydrate&&ionicComponents.entries[hydrate[1]];
  const ions=base?[...base,{formula:'H2O',charge:0,count:Number(hydrate[2]||1)}]:s.ions??group.find(s=>s.ions)?.ions??ionicComponents.entries[formula];
  const formulas=new Set(group.map(s=>s.formula));
  const related=material?[]:reactionData.entries.filter(r=>[...r.reactants,...r.products].some(t=>formulas.has(t.formula)));
  const formation=related.filter(r=>r.products.some(t=>formulas.has(t.formula)));
  const consumption=related.filter(r=>r.reactants.some(t=>formulas.has(t.formula)));
  const selected=[];
  const observed=related.filter(r=>resolveLabExperiment(r.equation,r.kind??'chemical'));
  for(const r of [...observed,...formation,...consumption])if(!selected.some(a=>a.id===r.id)&&(!selected.some(a=>a.family===r.family)||selected.length<2)&&selected.length<4)selected.push(r);
  const massTerms=Object.entries(counts).map(([symbol,count])=>({symbol,count,element:byElement.get(symbol),mass:byElement.get(symbol)?.mass}));
  const mass=!material&&massTerms.every(t=>typeof t.mass==='number'&&Number.isFinite(t.mass))?massTerms.reduce((n,t)=>n+t.count*t.mass,0):null;
  const hash=createHash('sha256').update(key).digest('hex');
  const name=element?.name_vi??s.name_vi??s.name_en??formula;
  const baseSlug=substanceSlug(`${s.material?s.materialLabel:name} ${s.material?'':formula}`);
  let id=baseSlug;
  if(usedSlugs.has(id))id=`${baseSlug}-${substanceSlug(s.kind??s.family??'chat')}`;
  if(usedSlugs.has(id))id+=`-${substanceSlug(s.cid?'pubchem-'+s.cid:s.id)}`;
  if(usedSlugs.has(id))throw Error('Substance slug collision: '+id);
  usedSlugs.add(id);
  const isomers=isomerGroupFor(s), pFormula=pretty(formula), display=material?(s.materialLabel??name):safeMeta(pFormula);
  const modelURL='/tien-ich/cau-truc-3d/?compound='+encodeURIComponent(s.id).replace(/[()]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  const crystalIds=[...new Set(group.flatMap(s=>crystalLinks[s.id]??[]))];
  const lesson=isomers?null:substanceLesson({subject:{...s,material},name,prettyFormula:pFormula,counts,massTerms,mass,element,detail,ions,modelURL,crystals:crystalIds.map(id=>crystals.get(id)).filter(Boolean),reactions:selected,reactionSources:reactionData.sources,formulas});
  const sections=isomers?isomerLesson(isomers,modelURL,counts,mass):lesson.sections;
  const content=sections.join('\n\n'), wordCount=content.trim().split(/\s+/).length;
  const meta={
    id,slug:id,documentPath:`reference/${id}/index.json`,legacyIds:['ho-so-'+hash.slice(0,12)],
    title:isomers?`${display}: các đồng phân và cách đọc mô hình 3D`:safeMeta(`${name}${material?'':` (${pFormula})`}: thành phần, mô hình và phản ứng`),
    author:'ChemDex · Học cấu trúc',category:element?'nguyento':'hopchat',
    summary:isomers?`Phân biệt một số đồng phân ${display} qua tên, cấu tạo, mô hình 3D và câu hỏi có lời giải.`:safeMeta(`${name}: ${lesson.label.toLowerCase()}, cách đọc mô hình và nguồn dữ liệu. Phản ứng đi kèm điều kiện; câu hỏi có lời giải.`),
    image:`/assets/library/substances/${id}.svg`,chemicalFormula:material?'Hỗn hợp':pFormula,
    tags:[isomers?'Đồng phân & Cấu tạo':material?'Vật liệu & Hỗn hợp':element?'Nguyên tố':ions?'Thành phần ion':'Cấu trúc & Phản ứng',safeMeta(s.material?s.materialLabel:formula),...selected.slice(0,2).map(r=>safeMeta(r.topic_vi))],
    aliases:[...new Set(group.flatMap(r=>[r.name_vi,r.name_en,r.material?r.materialLabel:r.formula,...(r.aliases??[])]).filter(Boolean).map(a=>s.material&&/^H2O$/i.test(a)?s.materialLabel:a))],
    substanceIds:group.map(r=>r.id),documentKind:'reference',lessonKind:isomers?'isomer-comparison':'substance-guide',readingMinutes:Math.max(2,Math.ceil(wordCount/180)),
  };
  if(isomers)for(const dir of assetDirs)fs.writeFileSync(path.join(dir,`${id}.svg`),isomerCoverSVG(isomers));
  fs.mkdirSync(path.join(output,id),{recursive:true});
  fs.writeFileSync(path.join(output,id,'index.json'),JSON.stringify({...meta,chemicalEvidence:{formula,representativeId:s.id,counts,mass,material,reactionIds:isomers?[]:selected.map(r=>r.id),...(isomers?{exampleCids:isomers.examples.map(e=>e.cid)}:{})},content},null,2)+'\n');
  generated.push(meta);for(const row of group)links[row.id]=id;
}

for(const a of authored)if(fs.existsSync(`trung-tam/public/assets/library/substances/${a.slug??a.id}.svg`))a.image=`/assets/library/substances/${a.slug??a.id}.svg`;
fs.writeFileSync('trung-tam/src/data/index.json',JSON.stringify(authored,null,2)+'\n');
fs.writeFileSync('trung-tam/src/data/reference-index.generated.json',JSON.stringify(generated,null,2)+'\n');
fs.writeFileSync('shared/library-links.generated.json',JSON.stringify(links,null,2)+'\n');
const routes={};
for(const doc of [...authored,...generated])for(const alias of [doc.id,doc.slug??doc.id,...(doc.legacyIds??[])]){
  if(routes[alias]&&routes[alias]!==doc.slug)throw Error('Ambiguous document alias: '+alias);routes[alias]=doc.slug??doc.id;
}
fs.writeFileSync('shared/library-routes.generated.json',JSON.stringify(routes,null,2)+'\n');
buildStudyReferences();
console.log(`Reference library: ${generated.length} evidence-based lessons; ${Object.keys(links).length} subject links.`);
