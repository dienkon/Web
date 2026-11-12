import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import groups from '../shared/molecular-isomers.json' with {type:'json'};
import {isomerGroupFor,resolveMolecularExample} from '../shared/chemistry/molecular-isomers.mjs';
import {verifyMolecularExample} from '../scripts/audit-isomer-examples.mjs';

test('every named example retains its sourced composition, bonds, branch/ring topology and stereochemistry',()=>{
  const docs=JSON.parse(fs.readFileSync('trung-tam/src/data/reference-index.generated.json','utf8'));
  for(const [formula,group] of Object.entries(groups)){
    assert.equal(group.formula,formula);assert.equal(group.exhaustive,false);
    assert.ok(group.examples.length>=2);
    for(const example of group.examples){
      assert.equal(example.formula,formula);
      verifyMolecularExample(example,fs.readFileSync('.'+example.structure.url,'utf8'));
    }
    const meta=docs.find(d=>d.lessonKind==='isomer-comparison'&&d.substanceIds.includes('formula-'+formula));
    assert.ok(meta,formula);
    const lesson=JSON.parse(fs.readFileSync('trung-tam/src/data/'+meta.documentPath,'utf8'));
    assert.deepEqual(lesson.chemicalEvidence.exampleCids,group.examples.map(e=>e.cid));
    for(const example of group.examples)assert.ok(lesson.content.includes(`&isomer=${example.id})`),example.id);
  }
});

test('formula examples never replace an identified substance or a mixture',()=>{
  const catalog=JSON.parse(fs.readFileSync('shared/structure-catalog.generated.json','utf8'));
  for(const r of catalog.filter(r=>r.isomerGroup))assert.equal(r.name_vi,r.formula,r.id);
  for(const record of [
    {formula:'C4H8',name_vi:'Cyclobutane'},
    {formula:'C4H8',name_vi:'C4H8',cid:9250},
    {formula:'C4H8',name_vi:'C4H8',structure:{url:'/a.sdf'}},
    {formula:'C4H8',name_vi:'C4H8',material:true},
    {formula:'C9H20',name_vi:'C9H20'},
  ]){assert.equal(isomerGroupFor(record),null);assert.equal(resolveMolecularExample(record),record);}
});

test('selection stays within the current formula and survives a graphics reload',()=>{
  const parent={id:'formula-C4H8',formula:'C4H8',name_vi:'C4H8'};
  const cis=resolveMolecularExample(parent,'pubchem-5287573');
  assert.equal(cis.cid,5287573);assert.equal(cis.formula,parent.formula);assert.equal(cis.id,parent.id);
  assert.equal(resolveMolecularExample(cis).cid,5287573);
  assert.equal(resolveMolecularExample(cis,'pubchem-62695').cid,62695);
  assert.equal(resolveMolecularExample(parent,'pubchem-12309').cid,7844);
  assert.deepEqual(parent,{id:'formula-C4H8',formula:'C4H8',name_vi:'C4H8'});
});
