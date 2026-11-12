import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateStructure,toSDF,structureFormula} from '../shared/chemistry/structure-generator.mjs';
import {parseFormula} from '../shared/chemistry/formula.mjs';
import {readSDF} from '../platform/viewer-canvas.js';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const catalog=json('shared/structure-catalog.generated.json');
test('every lab identity remains addressable, including indicators and mixtures',()=>{
  const coverage=json('shared/lab-structure-coverage.json');
  for(const c of coverage) assert.ok(catalog.some(r=>r.id===c.chemicalId),c.chemicalId);
  assert.equal(json('shared/structure-generation-report.json').rejected.length,0);
  for(const r of catalog.filter(r=>r.material)) {
    assert.ok(r.modelNote.includes('không'));
    assert.equal(r.structure,undefined);
    assert.equal(r.molarMass,null);
  }
  assert.ok(!catalog.find(r=>r.id==='chem-litmus').aliases.includes('Distilled Water'));
  assert.ok(catalog.find(r=>r.id==='chem-h2o').aliases.includes('Distilled Water'));
});
test('generated representations retain every atom of every catalog formula',()=>{
  for(const r of catalog){
    const model=generateStructure(r),actual={};
    for(const a of model.atoms){actual[a.elem]=(actual[a.elem]??0)+1;assert.ok([a.x,a.y,a.z].every(Number.isFinite),r.id);}
    assert.deepEqual(actual,parseFormula(r.formula),r.id);
    for(const b of model.bonds)assert.ok(b.a>=0&&b.b>=0&&b.a<model.atoms.length&&b.b<model.atoms.length,r.id);
    assert.ok(model.note.length>30);
  }
});
test('newly sourced indicator coordinates match their registered formula',()=>{
  for(const r of catalog.filter(r=>r.structure?.format==='sdf')) {
    const model=readSDF(fs.readFileSync('.'+r.structure.url,'utf8')),actual={};
    for(const a of model.atoms) actual[a.elem]=(actual[a.elem]??0)+1;
    assert.deepEqual(actual,parseFormula(r.formula),r.id);
  }
});
test('hydrates, nested groups, Unicode subscripts and all 118 elements are supported',()=>{
  for(const formula of ['CuSO4·5H2O','Al2(SO4)3','K4[Fe(CN)6]','C₆H₁₂O₆','NaOH (solid)']) {
    const model=generateStructure({formula});
    assert.equal(model.atoms.length,Object.values(parseFormula(structureFormula(formula))).reduce((a,b)=>a+b,0));
  }
  const all=[...json('shared/compounds.json'),...catalog];
  for(const e of json('shared/elements.json'))assert.ok(all.some(r=>r.formula===e.symbol),e.symbol);
});
test('molecular illustrations remain connected while components keep separate ion groups and isomer provenance',()=>{
  for(const r of catalog.filter(r=>['HCOOCH3','CH3OCH3','C6H12'].includes(r.formula)))assert.equal(r.structure,undefined,r.formula);
  for(const r of catalog.filter(r=>r.atomCount>1)){
    const model=generateStructure(r);
    if(model.componentLayout){
      assert.ok(model.groups.length);
      for(const b of model.bonds)assert.equal(model.atoms[b.a].componentGroup,model.atoms[b.b].componentGroup,r.id);
    }else if(model.mode==='idealized'){
      const seen=new Set(),visit=i=>{if(seen.has(i))return;seen.add(i);for(const b of model.bonds){if(b.a===i)visit(b.b);else if(b.b===i)visit(b.a);}};visit(0);
      assert.equal(seen.size,model.atoms.length,r.id);
    }
  }
  const butane=generateStructure({formula:'C4H10'});
  assert.equal(butane.mode,'idealized');assert.equal(butane.bonds.length,13);
  const salt=catalog.find(r=>r.formula==='Al2(SO4)3');
  const ionic=generateStructure(salt);assert.equal(ionic.mode,'ions');assert.equal(ionic.atoms.length,17);assert.equal(ionic.bonds.length,12);assert.equal(ionic.groups.length,5);
});

test('salts, mixed-valence oxides and hydrates preserve composition and charge without invented inter-group bonds',()=>{
  const definitions=json('shared/ionic-components.generated.json').entries;
  for(const [formula,parts]of Object.entries(definitions)){
    const model=generateStructure({formula}),actual={};
    assert.ok(model.componentLayout,formula);
    for(const a of model.atoms)actual[a.elem]=(actual[a.elem]??0)+1;
    assert.deepEqual(actual,parseFormula(formula));
    assert.equal(model.groups.reduce((n,g)=>n+g.charge,0),0,formula);
    for(const b of model.bonds)assert.equal(model.atoms[b.a].componentGroup,model.atoms[b.b].componentGroup,formula);
  }
  const oxide=generateStructure({formula:'Fe3O4'});assert.deepEqual(oxide.groups.filter(g=>g.formula==='Fe').map(g=>g.charge),[2,3,3]);
  const hydrate=generateStructure({formula:'CuSO4·5H2O'});assert.equal(hydrate.groups.length,7);assert.equal(hydrate.bonds.length,14);
  assert.equal(hydrate.groups.filter(g=>g.formula==='H2O').length,5);
  for(const group of hydrate.groups.filter(g=>g.formula==='H2O'))for(const i of group.atomIndices.filter(i=>hydrate.atoms[i].elem==='H'))assert.equal(hydrate.bonds.filter(b=>b.a===i||b.b===i).length,1);
  const peroxide=generateStructure({formula:'Na2O2'});assert.equal(peroxide.bonds.length,1);assert.equal(peroxide.bonds[0].order,1);
  const network=generateStructure({formula:'SiO2'});assert.equal(network.bonds.length,0);assert.equal(network.mode,'composition');
});

test('component SDF exports restore whole-group charges and invalid optional metadata cannot relabel atoms',()=>{
  const model=generateStructure({formula:'Al2(SO4)3'}),raw=toSDF(model),restored=readSDF(raw);
  assert.deepEqual(restored.groups,model.groups);
  assert.ok(restored.componentLayout);assert.equal(restored.bonds.length,12);
  const broken=raw.replace(JSON.stringify(model.groups),'[{"id":0,"formula":"Na","charge":1,"atomIndices":[999999]}]');
  assert.equal(readSDF(broken).groups,undefined);
  const badDefinition=generateStructure({formula:'NaCl',ions:[{formula:'Na',count:1,charge:2},{formula:'Cl',count:1,charge:-1}]});
  assert.equal(badDefinition.mode,'composition');assert.equal(badDefinition.bonds.length,0);
});
test('large valid models export every atom using V3000; invalid input fails safely',()=>{
  const m=generateStructure({formula:'C1000H1000'}),sdf=toSDF(m);
  assert.match(sdf,/COUNTS 2000 0/);assert.match(sdf,/M  V30 2000 H /);
  for(const formula of ['C1001H1000','Xx2','<img src=x onerror=alert(1)>','Na(OH',''])assert.throws(()=>generateStructure({formula}));
});
test('recognized VSEPR and organic families generate bonded spatial models with accurate bond orders',()=>{
  for(const formula of ['SF6','PCl5','XeF4','BF3','ClF3','NH3']){
    const model=generateStructure({formula});
    assert.equal(model.mode,'idealized',formula);
    assert.equal(model.bonds.length,model.atoms.length-1);
  }
  assert.ok(generateStructure({formula:'CO2'}).bonds.every(b=>b.order===2));
  assert.ok(generateStructure({formula:'N2'}).bonds.some(b=>b.order===3));
  assert.ok(generateStructure({formula:'C3H4'}).bonds.some(b=>b.order===3));
});
