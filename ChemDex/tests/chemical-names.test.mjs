import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {chemicalText,chemicalData,chemicalSource,chemicalHtml} from '../scripts/chemical-names.mjs';

test('all catalog display names are English and keep Vietnamese search aliases',()=>{
  for(const file of ['shared/elements.json','shared/compounds.json','shared/structure-catalog.generated.json']) {
    const original=JSON.parse(fs.readFileSync(file,'utf8')),output=chemicalData(original);
    output.forEach((row,i)=>{
      assert.ok(row.name_vi && !/[À-ỹ]/u.test(row.name_vi),`${file}: ${row.id??row.symbol} ${row.name_vi}`);
      assert.notEqual(row.name_vi,row.formula,`${row.id}: no formula-only names`);
      assert.ok(row.aliases.includes(original[i].name_vi));
      for(const field of ['id','formula','slug','symbol']) assert.equal(row[field],original[i][field]);
      assert.deepEqual(row.structure,original[i].structure);
    });
  }
});

test('names distinguish oxidation state, retained names and ambiguous sum formulas',()=>{
  assert.equal(chemicalText('sắt(II) clorua và sắt(III) clorua'),'iron(II) chloride và iron(III) chloride');
  assert.equal(chemicalData({name_vi:'Axit clohiđric',name_en:'Hydrochloric acid',formula:'HCl'}).name_vi,'Hydrochloric acid');
  assert.equal(chemicalData({name_vi:'HCl',formula:'HCl'}).name_vi,'hydrogen chloride');
  assert.equal(chemicalData({name_vi:'C4H8',formula:'C4H8'}).name_vi,'C4H8 isomers');
  assert.match(chemicalData({formula:'C7H8',defaultPhase:'l'}).name_vi,/isomers/);
  assert.match(chemicalData({formula:'C2H5COOC3H7',name_vi:'C2H5COOC3H7'}).name_vi,/ester isomers/);
  assert.equal(chemicalData({formula:'C7H8',name_vi:'Toluen',name_en:'toluene',cid:1140}).name_vi,'toluene');
  assert.equal(chemicalText('Nước (H₂O), Amoniac (NH₃), Axetilen'),'water (H₂O), ammonia (NH₃), ethyne');
});

test('naming preserves prose, citations, paths and saved document identities',()=>{
  const prose='Cộng đồng đồng thời đồng bộ. Nhà nước, các nước, nước ngoài, nước ta, nước Anh. Màu vàng, bo góc.';
  assert.equal(chemicalText(prose),prose);
  const input={id:'chat-nuoc',slug:'nuoc-h2o',documentPath:'docs/nuoc-h2o/index.json',title:'Nước (H₂O)',aliases:['Nước'],image:'/assets/nuoc-h2o.jpg',url:'https://example.org/Natri',content:'[Natri](https://example.org/Natri)'};
  const out=chemicalData(input);
  for(const key of ['id','slug','documentPath','aliases','image','url'])assert.deepEqual(out[key],input[key]);
  assert.equal(out.content,'[sodium](https://example.org/Natri)');
});

test('source transform preserves interpolation and chemical formulae without a runtime observer',()=>{
  const source='const formula="NaCl"; const amount=2; globalThis.answer=`Natri clorua: ${amount} × ${formula}; nước`;';
  const context={};vm.runInNewContext(chemicalSource(source),context);
  assert.equal(context.answer,'sodium chloride: 2 × NaCl; water');
  const catalog={};vm.runInNewContext(chemicalSource('globalThis.row={name_vi:"Nước",name_en:"Water",formula:"H2O"};'),catalog);
  assert.equal(catalog.row.name_vi,'water');assert.equal(catalog.row.name_search,'Nước');
});

test('Vietnamese editorial manuscripts and photo credits survive the production naming transform',()=>{
  const article={id:'nuoc-trong-doi-song',documentPath:'docs/nuoc-trong-doi-song/index.json',title:'Nước và đồng trong đời sống',summary:'Làm sao tạo nước?',content:'Tạo nước từ hydrogen. Ảnh: Đồng Minh; CC BY-SA 4.0.',editorialEvidence:{language:'vi'}};
  assert.deepEqual(chemicalData(article),article);
  assert.deepEqual(chemicalData([article]),[article]);
  assert.equal(chemicalData({name_vi:'Nước',name_en:'water',formula:'H2O'}).name_vi,'water','The catalog naming convention still applies outside editorial prose.');
});

test('chemical labels cannot rename HTML controls, source IDs, search aliases or selector arguments',()=>{
  const source='globalThis.row={id:"Nước",name_vi:"Nước",name_en:"water",aliases:["Nước"]}; document.getElementById("Nước"); const lookup={"Nước":1}; lookup["Nước"];';
  const output=chemicalSource(source);
  assert.match(output,/id:"Nước"/);assert.match(output,/aliases:\["Nước"\]/);assert.match(output,/getElementById\("Nước"\)/);assert.match(output,/lookup\["Nước"\]/);
  const html=chemicalHtml('<input id="Nước" placeholder="Nước (H₂O)"><script>document.getElementById("Nước"); const label="Nước";</script><p>Nước</p>');
  assert.match(html,/id="Nước"/);assert.match(html,/placeholder="water \(H₂O\)"/);assert.match(html,/getElementById\("Nước"\)/);assert.match(html,/<p>water<\/p>/);
});

test('story introductions contain evidence and hide the technical appendix',()=>{
  const rows=JSON.parse(fs.readFileSync('trung-tam/src/data/index.json','utf8'));
  const stories=rows.filter(r=>r.documentKind==='story');assert.equal(stories.length,17);
  for(const story of stories){
    const full=JSON.parse(fs.readFileSync('trung-tam/src/data/'+story.documentPath,'utf8'));
    const lead=full.content.split('<!-- chemistry-reference -->')[0];
    assert.match(lead,/## Bước ngoặt/);assert.match(lead,/## Nguồn của câu chuyện/);assert.match(lead,/https:\/\//);
    assert.ok(!/Vũ điệu|JSON|HTML|pipeline|schema|Giấc mơ của Mendeleev|phân lạc đà/.test(lead),story.id);
    assert.match(full.content,/<details><summary>Tra cứu công thức/);
  }
});

test('generated chemistry answers inherit English naming without dropping task instructions',async()=>{
  const bundled=await build({entryPoints:['server/routes/gemini/client.ts'],bundle:true,platform:'node',format:'cjs',write:false,packages:'external'});
  const context={module:{exports:{}},require:createRequire(import.meta.url)};
  vm.runInNewContext(bundled.outputFiles[0].text,context);
  const module=context.module.exports;
  const ai={models:{generateContent:async params=>params}};
  const params=await module.generateContentWithModelFallback(ai,'example',()=>({contents:'Hỏi về muối ăn',config:{systemInstruction:'Explain in Vietnamese.',temperature:0.2}}),[]);
  assert.match(params.config.systemInstruction,/Explain in Vietnamese/);
  assert.match(params.config.systemInstruction,/standard English.*IUPAC/);
  assert.equal(params.config.temperature,0.2);assert.equal(params.contents,'Hỏi về muối ăn');
});
