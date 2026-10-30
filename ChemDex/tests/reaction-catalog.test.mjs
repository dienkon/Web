import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildReactionCatalog } from '../scripts/generate-reaction-catalog.mjs';
import { buildReactionChains, validateReactionChains } from '../scripts/generate-reaction-chains.mjs';
import { parseFormula, atomBalance, balanceEquation, equationKey } from '../shared/chemistry/formula.mjs';
import { ionicBalance } from '../shared/chemistry/ionic.mjs';
import { chemicalConstraintErrors } from '../shared/chemistry/chemical-constraints.mjs';
import { validateCatalog, createCatalogIndex, analyzeChain, findChain, solveCatalogRequest, searchReactions, reactionStep } from '../shared/chemistry/reaction-catalog.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../shared/reaction-catalog.generated.json',import.meta.url),'utf8'));
const index=createCatalogIndex(catalog);
const matching=(left,right)=>catalog.entries.filter(entry=>left.every(formula=>entry.reactants.some(r=>r.formula===formula))&&right.every(formula=>entry.products.some(r=>r.formula===formula)));

test('formula parsing preserves identity, nested groups and hydrate atom counts',()=>{
  assert.deepEqual(parseFormula('Al2(SO4)3'),{Al:2,S:3,O:12});
  assert.deepEqual(parseFormula('CuSO4·5H2O'),{Cu:1,S:1,O:9,H:10});
  assert.deepEqual(parseFormula('Na2[Zn(OH)4]'),{Na:2,Zn:1,O:4,H:4});
  assert.deepEqual(parseFormula('Co'),{Co:1});assert.deepEqual(parseFormula('CO'),{C:1,O:1});
  for(const invalid of ['NaCljunk','Xx2','Al2(SO4','Ca()2','Cu0','(NH4))2SO4','2H2O'])assert.throws(()=>parseFormula(invalid));
});
test('rational balancing handles independently specified redox and polyvalent examples',()=>{
  const examples=[
    [['Al','HCl'],['AlCl3','H2'],[2,6,2,3]],
    [['Fe2(SO4)3','NaOH'],['Fe(OH)3','Na2SO4'],[1,6,2,3]],
    [['Cu','HNO3'],['Cu(NO3)2','NO','H2O'],[3,8,3,2,4]],
    [['CH3COOC2H5','NaOH'],['CH3COONa','C2H5OH'],[1,1,1,1]],
  ];
  for(const [left,right,expected] of examples){const r=balanceEquation(left,right);assert.deepEqual([...r.reactants,...r.products].map(s=>s.coefficient),expected);assert.deepEqual(atomBalance(r.reactants,r.products),{});}
  assert.throws(()=>balanceEquation(['NaCl'],['CuO']));
});
test('the shipped 1000+ catalog is deterministic, unique and fully balanced',()=>{
  assert.ok(catalog.count>1000);
  assert.equal(catalog.count,catalog.entries.length);
  assert.equal(new Set(catalog.entries.map(r=>r.id)).size,catalog.count);
  assert.equal(new Set(catalog.entries.map(r=>equationKey(r.reactants,r.products))).size,catalog.count);
  assert.deepEqual(buildReactionCatalog(),catalog);
  const result=validateCatalog(catalog);assert.deepEqual(result.errors,[]);
  assert.equal(result.reactions,catalog.count);
  assert.equal(result.netTransformations,catalog.counts.netTransformations);
  assert.ok(result.netTransformations<result.reactions,'Counterion variants must not be reported as independent ionic mechanisms');
  for(const r of catalog.entries){assert.deepEqual(atomBalance(r.reactants,r.products),{},r.id);assert.deepEqual(ionicBalance(r.ionic),{atoms:{},charge:0},r.id);assert.ok(r.transfers.length>0,r.id);assert.equal(r.runtime,'reference_only');assert.equal(r.effects.deltaH_kJ_per_mol,null);}
});
test('all rows have actual products, conditions, sources and a valid material link',()=>{
  for(const r of catalog.entries){
    assert.ok(r.conditions.description_vi.length>10,r.id);assert.ok(r.evidence.sourceIds.length,r.id);
    assert.ok(!r.variantOf&&!r.cascade,r.id);
    for(const id of r.evidence.sourceIds)assert.match(catalog.sources[id].url,/^https:\/\//);
    for(const link of r.transfers){assert.ok(r.reactants.some(s=>s.formula===link.from));assert.ok(r.products.some(s=>s.formula===link.to));assert.ok(parseFormula(link.from)[link.carrier]&&parseFormula(link.to)[link.carrier]);}
  }
});
test('spectator ions and counterions are balanced rather than borrowed from another preset',()=>{
  const r=matching(['Ba(NO3)2','K2SO4'],['BaSO4','KNO3'])[0];assert.ok(r);
  assert.equal(r.products.find(s=>s.formula==='KNO3').coefficient,2);
  assert.ok(!r.products.some(s=>s.formula.includes('Na')));
  const alternative=matching(['BaCl2','Na2SO4'],['BaSO4','NaCl'])[0];assert.equal(r.ionic.key,alternative.ionic.key);
  assert.ok(matching(['H2SO4','Al(OH)3'],['Al2(SO4)3','H2O']).length);
  const nh3=matching(['NH3','HCl'],['NH4Cl'])[0];assert.ok(nh3);assert.equal(nh3.products.length,1);
});
test('known balanced-looking but chemically misleading families are excluded',()=>{
  for(const r of catalog.entries)assert.deepEqual(chemicalConstraintErrors(r),[],r.equation);
  for(const impossible of ['AgOH','CuI2','FeI3','Al2(CO3)3','Fe2(CO3)3'])assert.ok(!catalog.entries.some(r=>[...r.reactants,...r.products].some(s=>s.formula===impossible)),impossible);
  assert.equal(matching(['Cu','HCl'],['H2']).length,0);
  assert.equal(matching(['Zn','HNO3'],['H2']).length,0);
  assert.equal(matching(['LiNO3'],['LiNO2']).length,0);
  assert.ok(matching(['LiNO3'],['Li2O','NO2','O2']).length);
  assert.ok(matching(['NaNO3'],['NaNO2','O2']).length);
  assert.equal(catalog.entries.filter(r=>r.family==='precipitation'&&r.products.some(s=>s.formula==='CuCO3')).length,0);
});
test('validator detects a poisoned catalog instead of trusting a count or manifest',()=>{
  const poison=structuredClone(catalog);poison.entries[0].products[0].coefficient++;
  assert.equal(validateCatalog(poison).valid,false);
  const broken=structuredClone(catalog);broken.entries[0].transfers[0].to='XeF6';
  assert.equal(validateCatalog(broken).valid,false);
  const duplicate=structuredClone(catalog);duplicate.entries.push(duplicate.entries[0]);duplicate.count++;
  assert.ok(validateCatalog(duplicate).errors.some(e=>e.includes('Duplicate molecular')));
  const source=structuredClone(catalog);source.entries[0].evidence.sourceIds=['invented-source'];assert.equal(validateCatalog(source).valid,false);
  const misleading=structuredClone(catalog);misleading.counts.netTransformations=misleading.count;assert.equal(validateCatalog(misleading).valid,false);
});
test('school chains use an actual reaction at every arrow and retain workup and sources',()=>{
  const examples=['Fe -> FeCl2 -> Fe(OH)2 -> Fe(OH)3 -> Fe2O3','Na -> NaOH -> NaCl -> AgCl','C -> CO2 -> CaCO3 -> CaO -> CaCl2','Al -> Al2O3 -> AlCl3 -> Al(OH)3 -> NaAlO2','CaCO3 -> CaO -> Ca(OH)2 -> CaCl2 -> CaCO3'];
  for(const input of examples){const r=analyzeChain(index,input);assert.equal(r.status,'found',r.error);assert.equal(r.steps.length,input.split('->').length-1);for(const step of r.steps){const source=index.byId.get(step.reactionId);assert.ok(source.reactants.some(s=>s.formula===step.from));assert.ok(source.products.some(s=>s.formula===step.to));assert.ok(step.workup);assert.ok(step.sourceReferences.length);}}
});
test('equation rendering distinguishes input gas from evolved gas and keeps full conditions',()=>{
  const r=analyzeChain(index,'Fe(OH)2 -> Fe(OH)3');assert.equal(r.status,'found');
  assert.match(r.steps[0].latex,/O_\{2\}\}\\,\(g\)/);
  assert.ok(!r.steps[0].latex.split('\\rightarrow')[0].includes('\\uparrow'));
  assert.ok(r.steps[0].condition.includes('Oxy hóa'));
  assert.ok(r.steps[0].latexWithCondition.length<r.steps[0].condition.length+r.steps[0].latex.length);
  const entry=catalog.entries.find(r=>r.family==='esterification');const step=reactionStep(index,{...entry.transfers[0],reactionId:entry.id});assert.match(step.latexWithCondition,/\\overset\{.*\\rightleftharpoons/);
});
test('generation respects minSteps, species order, finite bounds and no repeated filler reactions',()=>{
  for(const [start,end,min] of [['S','H2SO4',3],['Cu','Cu(OH)2',3],['Fe','Fe2O3',3],['CH4','CH3COOC2H5',5]]){
    const r=findChain(index,start,end,{minSteps:min});assert.equal(r.status,'found',r.error);assert.ok(r.steps.length>=min);assert.equal(r.substances[0],start);assert.equal(r.substances.at(-1),end);assert.equal(new Set(r.steps.map(s=>s.reactionId)).size,r.steps.length);
    assert.equal(analyzeChain(index,r.substances).status,'found');
  }
  assert.equal(findChain(index,'Cu','Cu(OH)2',{minSteps:0}).status,'invalid');
  assert.equal(findChain(index,'Cu','Cu(OH)2',{minSteps:8,maxVisited:1}).status,'limit');
  const cycle=findChain(index,'CaCO3','CaCO3',{minSteps:3});assert.equal(cycle.status,'found');assert.equal(cycle.substances[0],cycle.substances.at(-1));
});
test('unsupported links stay unknown; parser does not silently repair CO into cobalt',()=>{
  assert.equal(index.resolve('CO'),'CO');assert.equal(index.resolve('Co'),'Co');assert.equal(index.resolve('co'),null);
  assert.equal(index.resolve('H₂SO₄'),'H2SO4');
  for(const input of ['Cu -> NaOH','Xe -> Au','Cu -> <script>','Fe -> -> FeCl2'])assert.notEqual(analyzeChain(index,input).status,'found');
  const result=solveCatalogRequest(index,{action:'generate',start:'Xe',end:'Au',minSteps:3});assert.ok(result.error);assert.deepEqual(result.steps,[]);assert.equal(result.source,'catalog');
});
test('search supports Unicode formulas, accents, filters and bounded pagination',()=>{
  assert.ok(searchReactions(index,'CuSO₄').total>0);
  assert.ok(searchReactions(index,'dong(II) sunfat').total>0);
  const thermal=searchReactions(index,'nhiet phan',{family:'thermal',limit:5});assert.ok(thermal.total>5);assert.equal(thermal.entries.length,5);
  assert.ok(thermal.entries.every(r=>r.family==='thermal'));
  assert.ok(!searchReactions(index,'CuSO4',{limit:2,offset:0}).entries.some(r=>searchReactions(index,'CuSO4',{limit:2,offset:2}).entries.includes(r)));
  assert.equal(searchReactions(index,'<img onerror=x>').total,0);
});
test('the exported 1000+ three-step chains are distinct real material paths',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../shared/reaction-chains.generated.json',import.meta.url),'utf8'));
  assert.ok(data.count>1000);assert.deepEqual(validateReactionChains(catalog,data).errors,[]);
  assert.deepEqual(buildReactionChains(catalog),data);
  for(const chain of data.chains){const r=analyzeChain(index,chain.substances);assert.equal(r.status,'found',chain.id);assert.deepEqual(r.steps.map(s=>s.reactionId),chain.reactionIds,chain.id);}
  const poisoned=structuredClone(data);poisoned.chains[0].reactionIds[1]='does-not-exist';assert.equal(validateReactionChains(catalog,poisoned).valid,false);
});
