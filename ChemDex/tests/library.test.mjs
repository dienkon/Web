import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {auditLibrary} from '../scripts/audit-library.mjs';
const bundle=await build({entryPoints:['trung-tam/src/utils/librarySearch.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {matchesLibraryDoc}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const docs=JSON.parse(fs.readFileSync('trung-tam/src/data/index.json','utf8'));
test('library metadata, files and explicit chemical identities stay in sync',()=>{
  const report=auditLibrary();assert.deepEqual(report.errors,[]);
  assert.equal(report.subjects.length,report.subjectCount);
  assert.equal(new Set(report.subjects.map(s=>s.id)).size,report.subjectCount);
  assert.equal(report.linkedSubjectCount+report.missingSubjectCount,report.subjectCount);
  for(const s of report.subjects)for(const id of s.articleIds)assert.ok(docs.some(d=>d.id===id));
});
test('library search handles Vietnamese accents, molecular subscripts and combined terms',()=>{
  const find=q=>docs.filter(d=>matchesLibraryDoc(d,q)).map(d=>d.id);
  assert.ok(find('nuoc').includes('chat-nuoc'));
  assert.ok(find('H₂O').includes('chat-nuoc'));
  assert.ok(find('sodium chloride').includes('chat-natri-clorua'));
  assert.ok(find('amoniac NH3').includes('chat-amoniac'));
  assert.deepEqual(find('nonexistent molecule 987654'),[]);
});
