import {documentFile} from '../shared/library-paths.mjs';
import {documentURL} from '../shared/library-paths.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {auditLibrary} from '../scripts/audit-library.mjs';
import {parseFormula} from '../shared/chemistry/formula.mjs';
const bundle=await build({entryPoints:['trung-tam/src/utils/librarySearch.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {matchesLibraryDoc,filterLibraryDocs}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const docs=['trung-tam/src/data/index.json','trung-tam/src/data/reference-index.generated.json'].flatMap(p=>JSON.parse(fs.readFileSync(p,'utf8')));
test('substance-named directories and canonical URLs preserve all former document links',()=>{
  const routes=JSON.parse(fs.readFileSync('shared/library-routes.generated.json','utf8'));
  assert.equal(new Set(docs.map(d=>d.slug)).size,docs.length);
  for(const doc of docs){
    assert.match(doc.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!doc.slug.startsWith('ho-so-'));
    assert.match(documentFile(doc),new RegExp(`/${doc.slug}/index.json$`));
    assert.equal(documentURL(doc),`/trung-tam/tai-lieu-so/${doc.slug}/`);
    for(const alias of [doc.id,...(doc.legacyIds??[])])assert.equal(routes[alias],doc.slug);
  }
  assert.equal(Object.keys(routes).filter(id=>id.startsWith('ho-so-')).length,468);
});
test('library metadata, files and explicit chemical identities stay in sync',()=>{
  const report=auditLibrary();assert.deepEqual(report.errors,[]);
  assert.equal(report.subjects.length,report.subjectCount);
  assert.equal(new Set(report.subjects.map(s=>s.id)).size,report.subjectCount);
  assert.equal(report.linkedSubjectCount+report.missingSubjectCount,report.subjectCount);
  assert.equal(report.missingSubjectCount,0);
  for(const s of report.subjects)for(const id of s.articleIds)assert.ok(docs.some(d=>d.id===id));
});
test('every primary subject article is substantive, structured, sourced and includes an explained answer',()=>{
  const links=JSON.parse(fs.readFileSync('shared/library-links.generated.json','utf8'));
  for(const meta of docs){
    const folder=meta.documentKind==='reference'?'reference':'docs';
    const article=JSON.parse(fs.readFileSync(documentFile(meta),'utf8'));
    const wordCount=article.content.trim().split(/\s+/).length;
    if(meta.lessonKind==='isomer-comparison'){
      assert.ok(wordCount>=300&&wordCount<=900,`${meta.id}: keep the isomer lesson concise`);
      assert.match(article.content,/cùng công thức phân tử/);
      assert.match(article.content,/## So sánh các ví dụ/);
      assert.ok(article.chemicalEvidence.exampleCids.length>=2);
    }else if(meta.lessonKind==='substance-guide'){
      assert.ok(wordCount>=250&&wordCount<=1800,`${meta.id}: keep a substantive, concise guide (${wordCount} words)`);
      assert.ok(!/Biên niên sử phản ứng|Vũ điệu va chạm|độ tinh khiết 99,99|toàn bộ tọa độ.*chuẩn xác/.test(article.content),meta.id);
      assert.ok(!/phân tử nước[₀-₉]/.test(meta.title),meta.id);
    }else assert.ok(wordCount>=250,meta.id);
  }
  for(const id of new Set(Object.values(links))){
    const meta=docs.find(doc=>doc.id===id);assert.ok(meta,id);
    const folder=meta.documentKind==='reference'?'reference':'docs';
    const article=JSON.parse(fs.readFileSync(documentFile(meta),'utf8'));
    assert.ok(article.content.length>=(meta.lessonKind==='substance-guide'?1200:2500),id);
    assert.ok((article.content.match(/^## /gm)??[]).length>=4,id);
    assert.match(article.content,/<details>/,id);
    assert.match(article.content,/\]\((?:https?:\/\/|\/)/,id);
  }
});
test('every generated dossier has specific formula evidence, working model links and a solved exercise',()=>{
  const subjects=[...JSON.parse(fs.readFileSync('shared/compounds.json','utf8')),...JSON.parse(fs.readFileSync('shared/structure-catalog.generated.json','utf8'))];
  const ids=new Set(subjects.map(s=>s.id));
  for(const meta of docs.filter(d=>d.documentKind==='reference')){
    const full=JSON.parse(fs.readFileSync(documentFile(meta),'utf8'));
    assert.equal(full.id,meta.id);
    if(meta.lessonKind==='isomer-comparison'){
      assert.ok(full.content.includes('## Tự quan sát trong mô hình 3D'));
      assert.ok(!full.content.includes('## Câu chuyện:'));
    }else{
      assert.ok(full.content.includes('## Nhận diện '));
      assert.ok(full.content.includes('## Đọc mô hình 3D'));
      assert.ok(full.content.includes('## Phản ứng liên quan'));
    }
    assert.ok(full.content.includes('<details>'));
    assert.ok(!/\b(?:undefined|NaN)\b|\[object Object\]/.test(full.content),meta.id);
    assert.ok(full.substanceIds.length);
    for(const id of full.substanceIds)assert.ok(ids.has(id),meta.id);
    for(const match of full.content.matchAll(/\/tien-ich\/cau-truc-3d\/\?compound=([^\s)&]+)/g))assert.ok(ids.has(decodeURIComponent(match[1])),meta.id);
  }
});
test('all dossier calculations and chosen reaction contexts agree with the underlying chemistry records',()=>{
  const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
  const subjects=[...json('shared/compounds.json'),...json('shared/structure-catalog.generated.json')];
  const weights=new Map(json('shared/elements.json').map(e=>[e.symbol,e.mass]));
  const reactions=new Map(json('shared/reaction-catalog.generated.json').entries.map(r=>[r.id,r]));
  const links=json('shared/library-links.generated.json');
  for(const meta of docs.filter(d=>d.documentKind==='reference')){
    const full=json(documentFile(meta)),proof=full.chemicalEvidence;
    const subject=subjects.find(s=>s.id===proof.representativeId);
    assert.ok(subject,meta.id);
    assert.equal(proof.formula,subject.formula);
    assert.deepEqual(proof.counts,parseFormula(subject.formula));
    if(proof.mass!==null){
      assert.ok(!proof.material,meta.id);
      const independentlySummed=Object.entries(parseFormula(subject.formula)).reduce((n,[symbol,count])=>n+weights.get(symbol)*count,0);
      assert.ok(Math.abs(proof.mass-independentlySummed)<1e-8,meta.id);
    }
    for(const id of proof.reactionIds){
      const reaction=reactions.get(id);assert.ok(reaction,meta.id);
      const relevant=full.substanceIds.map(id=>subjects.find(s=>s.id===id)?.formula);
      assert.ok([...reaction.reactants,...reaction.products].some(row=>relevant.includes(row.formula)),meta.id);
      assert.ok(full.content.includes(reaction.equation),meta.id);
    }
  }
  assert.notEqual(links['cid-7843'],links['cid-6360'],'butane and isobutane must keep separate articles');
  assert.notEqual(links['cid-5793'],links['cid-5984'],'glucose and fructose must keep separate articles');
  assert.notEqual(links['chem-litmus'],links['cid-962'],'litmus is not water');
});
test('library search handles Vietnamese accents, molecular subscripts and combined terms',()=>{
  const find=q=>docs.filter(d=>matchesLibraryDoc(d,q)).map(d=>d.id);
  assert.ok(find('nuoc').includes('chat-nuoc'));
  assert.ok(find('H₂O').includes('chat-nuoc'));
  assert.ok(find('sodium chloride').includes('chat-natri-clorua'));
  assert.ok(find('amoniac NH3').includes('chat-amoniac'));
  assert.deepEqual(find('ethanol'),['chat-etanol']);
  assert.deepEqual(find('H2O'),['chat-nuoc']);
  assert.deepEqual(filterLibraryDocs(docs,'metan').map(d=>d.id),['chat-metan']);
  assert.deepEqual(filterLibraryDocs(docs,'H₂O').map(d=>d.id),['chat-nuoc']);
  assert.deepEqual(find('nonexistent molecule 987654'),[]);
});
