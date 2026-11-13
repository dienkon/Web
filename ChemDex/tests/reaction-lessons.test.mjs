import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {netIonicEquation,reactionLesson} from '../shared/chemistry/reaction-lesson.mjs';
import {resolveLabExperiment,isLinkableStudyEquation} from '../shared/chemistry/study-links.mjs';
import {documentFile} from '../shared/library-paths.mjs';
const json = file => JSON.parse(fs.readFileSync(file,'utf8'));
const catalog=json('shared/reaction-catalog.generated.json');

test('a referenced historical contributor gets a sourced local profile without being invented as an element discoverer',()=>{
  const refs=json('shared/study-references.generated.json');
  const slug=refs.scientistNames['Antoine Lavoisier'];assert.equal(slug,'nha-khoa-hoc-antoine-lavoisier');
  const profile=json(`trung-tam/src/data/docs/${slug}/index.json`);
  assert.ok(profile.content.includes('acs.org/education/whatischemistry/landmarks/lavoisier.html'));
  assert.ok(profile.content.includes('Không gán mọi phát hiện'));
  assert.equal(refs.discoverers['Antoine Lavoisier'],undefined);
});

test('peroxide decomposition has a specific source, a catalyst condition and the correct existing observation preset',()=>{
  const reaction=catalog.entries.find(r=>r.reactants.length===1&&r.reactants[0].formula==='H2O2');
  assert.ok(reaction);assert.equal(reaction.reactants[0].coefficient,2);
  assert.equal(reaction.conditions.catalyst,'MnO2');assert.equal(reaction.evidence.scope,'specific');
  assert.equal(resolveLabExperiment(reaction.equation)?.id,'catalytic_oxygen_prep');
  assert.equal(netIonicEquation(reaction),null);
  const text=reactionLesson(reaction,{sources:catalog.sources});
  assert.ok(text.includes('chem.washington.edu/lecture-demos/decomposition-h2o2-mno2'));
  assert.ok(!text.includes('Nguồn quy tắc của họ phản ứng'));
});

test('equation linking accepts balanced equilibria and ions without enabling unsupported laboratory presets',()=>{
  for(const equation of ['CH3COOH(l) + C2H5OH(l) ⇌ CH3COOC2H5(l) + H2O(l)','NH4^+(aq) + OH^-(aq) → NH3(g) + H2O(l)','2H2+O2->2H2O'])assert.equal(isLinkableStudyEquation(equation),true,equation);
  for(const equation of ['H2 + O2 -> H2O','H^2+(aq) + OH^-(aq) → H2O(l)','const a = x => x + 1;','return H2 + O2','H2 -> H2\nalert(1)'])assert.equal(isLinkableStudyEquation(equation),false,equation);
  assert.equal(resolveLabExperiment('CH3COOH + C2H5OH ⇌ CH3COOC2H5 + H2O'),null);
});

test('neutral esterification remains reversible and is not relabeled as an ionic equation',()=>{
  const r=catalog.entries.find(r=>r.family==='esterification');
  assert.equal(netIonicEquation(r),null);
  const text=reactionLesson(r,{sources:catalog.sources});
  assert.ok(text.includes(r.equation));assert.ok(text.includes(r.conditions.description_vi));
  assert.ok(text.includes('thuận nghịch'));assert.ok(text.includes('không phải biên bản đo riêng'));
  assert.ok(!/ion rút gọn|Berthelot|Fischer|tỏa nhiệt|ΔrH°/.test(text));
  assert.ok(!text.includes('/lab-3d/'));
});

test('ionic rendering requires conserved atoms and charge, removes spectators, and retains equilibrium',()=>{
  const ion=(formula,charge,coefficient=1,phase='aq')=>({formula,charge,coefficient,phase});
  const r={ionic:{reactants:[ion('Na',1),ion('OH',-1),ion('H',1),ion('Cl',-1)],products:[ion('Na',1),ion('Cl',-1),ion('H2O',0,1,'l')]}};
  assert.equal(netIonicEquation(r),'OH^-(aq) + H^+(aq) → H2O(l)');
  r.reversible=true;assert.ok(netIonicEquation(r).includes(' ⇌ '));
  r.ionic.products[2].coefficient=2;assert.equal(netIonicEquation(r),null);
  r.ionic.products[2].coefficient=1;r.ionic.reactants[2].charge=2;assert.equal(netIonicEquation(r),null);
  const acid=catalog.entries.find(r=>r.family==='esterification');
  const withCatalyst=structuredClone(acid);
  withCatalyst.ionic.reactants.push(ion('H',1));withCatalyst.ionic.products.push(ion('H',1));
  assert.equal(netIonicEquation(withCatalyst),null,'a catalytic spectator must not turn neutral molecules into an ionic transformation');
});

test('only supported, balanced equations receive a lab observation link; unspecified conditions and heat are not invented',()=>{
  const supported=catalog.entries.find(r=>resolveLabExperiment(r.equation));
  assert.ok(supported);
  const text=reactionLesson(supported,{sources:catalog.sources});
  assert.ok(text.includes(resolveLabExperiment(supported.equation).href));
  const unsupported={equation:'H2 + O2 -> H2O',effects:{deltaH_kJ_per_mol:-57.1,calibrated:false}};
  const unknown=reactionLesson(unsupported);
  assert.ok(!unknown.includes('/lab-3d/'));assert.ok(!unknown.includes('-57.1'));
  assert.ok(!/298|điều kiện phòng|tiêu chuẩn|tỏa nhiệt thuận lợi/.test(unknown));
});

test('all generated study guides keep reaction evidence tied to the actual selected entries and omit fabricated family history',()=>{
  const entries=new Map(catalog.entries.map(r=>[r.id,r]));
  const docs=json('trung-tam/src/data/reference-index.generated.json');
  const guides=docs.filter(d=>d.lessonKind==='substance-guide');assert.equal(guides.length,457);
  for(const meta of guides){
    const full=json(documentFile(meta));
    if(full.chemicalEvidence.material){assert.equal(meta.chemicalFormula,'Hỗn hợp',meta.id);assert.equal(full.chemicalEvidence.mass,null,meta.id);}
    assert.ok(!/Vũ điệu va chạm|Biên niên sử phản ứng|Kịch tính phòng thí nghiệm|mọi phản ứng trung hòa|toàn bộ tọa độ.*chuẩn xác/.test(full.content),meta.id);
    assert.ok(!full.content.includes('Lưu ý tránh bẫy đề thi'),meta.id);
    let expectedIonic=0;
    for(const id of full.chemicalEvidence.reactionIds){
      const r=entries.get(id);assert.ok(full.content.includes(r.equation),meta.id);
      assert.ok(full.content.includes(r.conditions.description_vi),meta.id);
      if(netIonicEquation(r))expectedIonic++;
    }
    assert.equal((full.content.match(/\*\*Phương trình ion rút gọn:\*\*/g)??[]).length,expectedIonic,meta.id);
  }
});

test('a substance with a supported laboratory reaction gets an observation example before generic family examples',()=>{
  const subjects=[...json('shared/compounds.json'),...json('shared/structure-catalog.generated.json')];
  let eligible=0;
  for(const meta of json('trung-tam/src/data/reference-index.generated.json').filter(d=>d.lessonKind==='substance-guide')){
    const full=json(documentFile(meta));if(full.chemicalEvidence.material)continue;
    const formulas=new Set(subjects.filter(s=>meta.substanceIds.includes(s.id)).map(s=>s.formula));
    const matches=catalog.entries.filter(r=>[...r.reactants,...r.products].some(t=>formulas.has(t.formula))&&resolveLabExperiment(r.equation));
    if(matches.length){eligible++;assert.ok(full.chemicalEvidence.reactionIds.includes(matches[0].id),meta.id);}
  }
  assert.ok(eligible>=10);
});
