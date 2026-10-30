import { atomBalance, equationKey, formatEquation, gcd, normalizeFormula, parseFormula } from './formula.mjs';
import { ionicBalance, netIonicEquation } from './ionic.mjs';
import { chemicalConstraintErrors } from './chemical-constraints.mjs';

export function validateCatalog(catalog) {
  const errors=[],ids=new Set(),equations=new Set(),registry=new Map((catalog.species??[]).map(s=>[s.formula,s]));
  if(catalog.schema!=='chemdex.catalog/2')errors.push('Unsupported catalog schema');
  if(catalog.count!==catalog.entries?.length)errors.push('Catalog count does not match entries');
  for(const species of registry.values()) if(species.ions){
    try {
      if(species.ions.some(part=>!Number.isSafeInteger(part.count)||part.count<1||!Number.isSafeInteger(part.charge)||part.charge===0))errors.push(`Invalid ionic charge/count: ${species.formula}`);
      const parts=species.ions.map(part=>({formula:part.formula,coefficient:part.count}));
      if(Object.keys(atomBalance([{formula:species.formula,coefficient:1}],parts)).length||species.ions.reduce((n,p)=>n+p.charge*p.count,0)!==0)errors.push(`Invalid ion composition: ${species.formula}`);
    }catch(error){errors.push(`Species ${species.formula}: ${error.message}`);}
  }
  for(const entry of catalog.entries??[])try{
    const fail=message=>errors.push(`${entry.id}: ${message}`);
    if(!entry.id||ids.has(entry.id))fail('Missing/duplicate ID');ids.add(entry.id);
    if(entry.variantOf||entry.cascade)fail('Padded variants and synthetic cascades are not reaction entries');
    if(!entry.reactants?.length||!entry.products?.length)throw new Error('Both sides are required');
    for(const side of [entry.reactants,entry.products]){
      const keys=new Set();
      for(const row of side){
        parseFormula(row.formula);
        if(normalizeFormula(row.formula)!==row.formula||!registry.has(row.formula))fail(`Unregistered/noncanonical formula ${row.formula}`);
        if(!Number.isSafeInteger(row.coefficient)||row.coefficient<1)fail('Invalid coefficient');
        if(!['s','l','g','aq'].includes(row.phase))fail('Invalid phase');
        if(keys.has(row.formula))fail('Duplicate species on one side');keys.add(row.formula);
      }
    }
    if(entry.reactants.some(r=>entry.products.some(p=>p.formula===r.formula)))fail('Uncancelled unchanged molecular species');
    if(Object.keys(atomBalance(entry.reactants,entry.products)).length)fail('Atoms are not conserved');
    if([...entry.reactants,...entry.products].reduce((n,r)=>gcd(n,r.coefficient),0)!==1)fail('Coefficients are not primitive');
    const key=equationKey(entry.reactants,entry.products);if(equations.has(key))fail('Duplicate molecular equation');equations.add(key);
    if(entry.equation!==formatEquation(entry.reactants,entry.products,entry.reversible))fail('Display equation disagrees with structured data');
    if(!entry.conditions?.description_vi?.trim()||!entry.explanation_vi?.trim())fail('Missing conditions or explanation');
    if(!entry.evidence?.sourceIds?.length||entry.evidence.sourceIds.some(id=>!catalog.sources?.[id]?.url?.startsWith('https://')))fail('Missing source references');
    if(entry.evidence?.scope!=='family'&&entry.evidence?.scope!=='specific')fail('Missing evidence scope');
    const ionic=netIonicEquation(entry,registry),balance=ionicBalance(ionic);
    if(!ionic.reactants.length||!ionic.products.length)fail('No net chemical change');
    if(Object.keys(balance.atoms).length||balance.charge!==0)fail('Ionic atoms or charge are not conserved');
    if(entry.ionic?.key!==ionic.key||entry.netTransformation!==ionic.key)fail('Stored net ionic equation disagrees with ion registry');
    for(const edge of entry.transfers??[]){
      if(!entry.reactants.some(r=>r.formula===edge.from)||!entry.products.some(p=>p.formula===edge.to)||edge.from===edge.to)fail('Broken chain transfer');
      if(!parseFormula(edge.from)[edge.carrier]||!parseFormula(edge.to)[edge.carrier])fail('Chain transfer does not carry the declared element');
      if(!edge.workup?.trim())fail('Missing chain separation/handling note');
    }
    if(entry.effects?.deltaH_kJ_per_mol!==null&&!entry.thermochemistrySource)fail('Unreferenced reaction heat');
    for(const error of chemicalConstraintErrors(entry))fail(error);
  }catch(error){errors.push(`${entry.id}: ${error.message}`);}
  const netTransformations=new Set((catalog.entries??[]).map(r=>r.netTransformation)).size;
  if(catalog.counts?.molecularReactions!==equations.size||catalog.counts?.netTransformations!==netTransformations)errors.push('Summary reaction/net ionic counts disagree with data');
  const families=Object.fromEntries([...new Set((catalog.entries??[]).map(r=>r.family))].map(f=>[f,catalog.entries.filter(r=>r.family===f).length]));
  if(Object.keys(families).length!==Object.keys(catalog.counts?.families??{}).length||Object.entries(families).some(([f,count])=>catalog.counts?.families?.[f]!==count))errors.push('Family count summary disagrees with data');
  return {valid:errors.length===0,errors,reactions:equations.size,netTransformations};
}

const fold=value=>String(value??'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const cost=entry=>entry.reactants.reduce((n,r)=>n+(/Li|Cd|Pb|Cr|Ba/.test(r.formula)?3:0)+(/KOH|KCl|KBr|KI/.test(r.formula)?1:0),0)+(/đặc|rất cao|công nghiệp/.test(entry.conditions.description_vi)?4:0);

export function createCatalogIndex(catalog){
  if(catalog.schema!=='chemdex.catalog/2')throw new Error('Unsupported catalog schema');
  const byId=new Map(),byReactants=new Map(),outgoing=new Map(),speciesByFormula=new Map(catalog.species.map(s=>[s.formula,s])),formulas=new Set(catalog.species.map(s=>s.formula)),folded=new Map();
  for(const formula of formulas){const key=formula.toLowerCase();folded.set(key,[...(folded.get(key)??[]),formula]);}
  const aliases=new Map([['CH3CH2OH','C2H5OH'],['NaCH3COO','CH3COONa'],['KCH3COO','CH3COOK'],['NaHCOO','HCOONa'],['KHCOO','HCOOK']]);
  for(const entry of catalog.entries){
    byId.set(entry.id,entry);const key=entry.reactants.map(r=>r.formula).sort().join('|');byReactants.set(key,[...(byReactants.get(key)??[]),entry]);
    for(const transfer of entry.transfers){const edges=outgoing.get(transfer.from)??[];edges.push({...transfer,reactionId:entry.id,entry,cost:cost(entry)});outgoing.set(transfer.from,edges);}
  }
  // Different soluble counterions can give the same transition. Retain a genuine
  // equation with common reagents instead of multiplying graph search branches.
  for(const [from,edges] of outgoing){const selected=new Map();for(const edge of edges.sort((a,b)=>a.cost-b.cost||a.reactionId.localeCompare(b.reactionId))){if(!selected.has(edge.to))selected.set(edge.to,edge);}outgoing.set(from,[...selected.values()]);}
  const resolve=value=>{const text=normalizeFormula(value);if(formulas.has(text))return text;if(aliases.has(text)&&formulas.has(aliases.get(text)))return aliases.get(text);const candidates=folded.get(text.toLowerCase())??[];return candidates.length===1?candidates[0]:null;};
  return {catalog,byId,byReactants,outgoing,speciesByFormula,resolve};
}

export function searchReactions(index,query='',{family='all',limit=100,offset=0}={}){
  const q=fold(normalizeFormula(query));
  const matched=index.catalog.entries.filter(r=>(family==='all'||r.family===family)&&(!q||fold(`${r.equation} ${r.title_vi} ${r.topic_vi} ${r.observation_vi} ${r.conditions.description_vi} ${[...r.reactants,...r.products].map(s=>index.speciesByFormula.get(s.formula)?.name_vi??'').join(' ')}`).replace(/\s+/g,'').includes(q.replace(/\s+/g,''))));
  return {total:matched.length,entries:matched.slice(offset,offset+Math.max(1,Math.min(limit,200)))};
}

const latexEscape=text=>String(text).replace(/[\\{}%#$&_]/g,s=>`\\${s}`);
const latexFormula=formula=>`\\mathrm{${formula.replace(/(\d+)/g,'_{$1}')}}`;
function arrowCondition(entry){
  if(entry.conditions.catalyst)return `${latexFormula(entry.conditions.catalyst)},\\;t^{\\circ}`;
  if(entry.conditions.activation==='light')return '\\text{ánh sáng}';
  if(entry.family==='thermal')return '\\Delta';
  if(entry.family==='precipitation')return entry.products.some(r=>r.formula==='Ag2O')?'\\text{dd kiềm}':'Q>K_{sp}';
  if(entry.family==='metal_acid')return `${latexFormula(entry.reactants.find(r=>['HCl','HBr','H2SO4'].includes(r.formula))?.formula??'HCl')}\\;\\text{loãng}`;
  if(['carbonate_acid','oxide_acid','neutralization'].includes(entry.family))return '\\text{acid đủ}';
  if(['ammonium_base','saponification'].includes(entry.family))return '\\text{kiềm, làm ấm}';
  if(entry.family==='esterification')return '\\text{acid, làm ấm}';
  if(entry.family==='combustion')return '\\text{mồi cháy, }O_2\\;\\text{dư}';
  return `\\text{${latexEscape('xem điều kiện')}}`;
}
export function reactionStep(index,edge){
  const entry=edge.entry??index.byId.get(edge.reactionId);
  const side=(rows,product)=>rows.map(r=>`${r.coefficient===1?'':r.coefficient}${latexFormula(r.formula)}${r.phase==='g'?(product?'\\uparrow':'\\,(g)'):r.phase==='s'?'\\,(s)':''}`).join(' + ');
  const left=side(entry.reactants,false),right=side(entry.products,true),arrow=entry.reversible?'\\rightleftharpoons':'\\rightarrow';
  const required=entry.reactants.filter(r=>r.formula!==edge.from).map(r=>r.formula);
  return {reactionId:entry.id,from:edge.from,to:edge.to,carrier:edge.carrier,equation:entry.equation,
    latex:`${left} ${arrow} ${right}`,latexWithCondition:`${left} ${entry.reversible?`\\overset{${arrowCondition(entry)}}{\\rightleftharpoons}`:`\\xrightarrow{${arrowCondition(entry)}}`} ${right}`,
    condition:entry.conditions.description_vi,explanation:`${entry.explanation_vi} ${required.length?`Chất bổ sung: ${required.join(', ')}. `:''}${edge.workup}`,
    workup:edge.workup,reagents:required,evidence:entry.evidence,sourceReferences:entry.evidence.sourceIds.map(id=>index.catalog.sources[id])};
}

export function analyzeChain(index,input){
  const items=Array.isArray(input)?input:String(input??'').split(/\s*(?:->|→|⇒|⟶)\s*/);
  if(items.length<2||items.length>13||items.some(item=>!String(item).trim()))return {status:'invalid',error:'Nhập từ 2 đến 13 chất, ngăn bằng -> hoặc →.',steps:[]};
  const substances=items.map(index.resolve);
  const unknown=items.filter((_,i)=>!substances[i]);
  if(unknown.length)return {status:'not-found',error:`Chưa có danh tính rõ ràng trong kho: ${unknown.join(', ')}. Chưa đủ dữ liệu để xác nhận chuỗi, không kết luận là bất khả thi.`,steps:[]};
  const edges=[];
  for(let i=0;i<substances.length-1;i++){
    const edge=index.outgoing.get(substances[i])?.find(edge=>edge.to===substances[i+1]);
    if(!edge)return {status:'not-found',error:`Chưa có bước đã lập dữ liệu từ ${substances[i]} đến ${substances[i+1]}. Không tự ghép hai phản ứng không nối sản phẩm–chất tham gia.`,steps:[]};
    edges.push(edge);
  }
  return {status:'found',substances,steps:edges.map(edge=>reactionStep(index,edge)),requiresWorkup:true};
}

export function findChain(index,startInput,endInput,{minSteps=1,maxSteps=Math.min(10,Math.max(6,minSteps+2)),maxVisited=40000}={}){
  if(!Number.isInteger(minSteps)||minSteps<1||minSteps>8||!Number.isInteger(maxSteps)||maxSteps<minSteps||maxSteps>10)return {status:'invalid',error:'Số bước tối thiểu cần từ 1 đến 8; giới hạn tìm kiếm tối đa 10 bước.',steps:[]};
  const start=index.resolve(startInput),end=index.resolve(endInput);
  if(!start||!end)return {status:'not-found',error:'Chất đầu/cuối chưa có danh tính rõ ràng trong kho; chưa thể xác nhận chuỗi.',steps:[]};
  const reverse=new Map();for(const [from,edges] of index.outgoing)for(const edge of edges){const previous=reverse.get(edge.to)??[];previous.push(from);reverse.set(edge.to,previous);}
  const distances=new Map([[end,0]]),queue=[end];for(let p=0;p<queue.length;p++)for(const previous of reverse.get(queue[p])??[])if(!distances.has(previous)){distances.set(previous,distances.get(queue[p])+1);queue.push(previous);}
  if(!distances.has(start))return {status:'not-found',error:'Chưa tìm thấy đường nối trong kho hiện tại; đây không phải bằng chứng các chất không thể chuyển hóa.',steps:[]};
  let visited=0,answer=null;
  for(let targetDepth=minSteps;targetDepth<=maxSteps&&!answer&&visited<maxVisited;targetDepth++){
    const path=[],seenSpecies=new Set([start]),seenReactions=new Set();
    function visit(current){
      if(++visited>maxVisited)return false;
      if(path.length===targetDepth){if(current===end){answer=[...path];return true;}return false;}
      if(!distances.has(current)||distances.get(current)>targetDepth-path.length)return false;
      const edges=[...(index.outgoing.get(current)??[])].sort((a,b)=>(distances.get(a.to)??999)-(distances.get(b.to)??999)||a.cost-b.cost||a.to.localeCompare(b.to));
      for(const edge of edges){
        if(seenReactions.has(edge.reactionId))continue;
        const final=path.length+1===targetDepth;
        if(edge.to===end&&!final)continue;
        if(seenSpecies.has(edge.to)&&!(final&&edge.to===end&&start===end))continue;
        path.push(edge);seenSpecies.add(edge.to);seenReactions.add(edge.reactionId);
        if(visit(edge.to))return true;
        path.pop();seenReactions.delete(edge.reactionId);seenSpecies.delete(edge.to);
        if(visited>=maxVisited)break;
      }
      return false;
    }
    visit(start);
  }
  if(!answer)return {status:visited>=maxVisited?'limit':'not-found',visited,error:visited>=maxVisited?'Đã đạt giới hạn tìm kiếm; thử giảm số bước hoặc nêu chất trung gian.':'Chưa có chuỗi đáp ứng số bước trong giới hạn tìm kiếm; không tạo vòng lặp để đủ số bước.',steps:[]};
  return {status:'found',visited,substances:[start,...answer.map(edge=>edge.to)],steps:answer.map(edge=>reactionStep(index,edge)),requiresWorkup:true};
}

export function solveCatalogRequest(index,body){
  let result;
  if(body?.action==='analyze')result=typeof body.chain==='string'&&body.chain.trim()?analyzeChain(index,body.chain):{status:'invalid',error:'Chuỗi phản ứng cần là một chuỗi ký tự không rỗng.',steps:[]};
  else if(body?.action==='generate')result=typeof body.start==='string'&&body.start.trim()&&typeof body.end==='string'&&body.end.trim()?findChain(index,body.start,body.end,{minSteps:Number(body.minSteps)}):{status:'invalid',error:'Chất đầu và chất cuối cần là công thức không rỗng.',steps:[]};
  else result={status:'invalid',error:'action phải là analyze hoặc generate.',steps:[]};
  return {...result,source:'catalog',catalogVersion:index.catalog.version,catalogCount:index.catalog.count,
    note:'Chuỗi là các phản ứng nối tiếp có thể cần tách, rửa, đổi môi trường hoặc nguồn năng lượng; không mặc định thực hiện trong cùng một bình.'};
}
