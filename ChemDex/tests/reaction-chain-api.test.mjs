import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['server/routes/gemini/chain.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {default:handler}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
async function request(body,method='POST'){
  const response={code:200,body:null,status(code){this.code=code;return this;},json(value){this.body=value;return this;},end(){return this;}};
  await handler({method,body},response);return response;
}
test('public chain API returns sourced local results without an AI key',async()=>{
  const r=await request({action:'generate',start:'S',end:'H2SO4',minSteps:3});assert.equal(r.code,200);assert.equal(r.body.status,'found');assert.equal(r.body.steps.length,3);assert.equal(r.body.source,'catalog');assert.ok(r.body.catalogCount>1000);assert.ok(r.body.steps.every(s=>s.reactionId&&s.sourceReferences.length));
});
test('public analyze API preserves the exact intermediates',async()=>{
  const r=await request(JSON.stringify({action:'analyze',chain:'CaCO3 -> CaO -> Ca(OH)2 -> CaCl2'}));assert.equal(r.code,200);assert.deepEqual(r.body.substances,['CaCO3','CaO','Ca(OH)2','CaCl2']);
});
test('unknown chemistry is reported as unknown, with no invented AI steps',async()=>{
  const r=await request({action:'generate',start:'Xe',end:'Au',minSteps:3});assert.equal(r.code,200);assert.equal(r.body.status,'not-found');assert.deepEqual(r.body.steps,[]);assert.match(r.body.error,/chưa|Chưa/);
});
test('API rejects malformed requests, invalid bounds and unsupported methods',async()=>{
  for(const body of ['{broken',{action:'other'},{action:'generate',start:'Cu',end:'CuO',minSteps:9},{action:'analyze',chain:'Cu -> -> CuO'},{action:'generate',start:'',end:'CuO',minSteps:1},{action:'analyze',chain:null}])assert.equal((await request(body)).code,400);
  assert.equal((await request(null,'GET')).code,405);assert.equal((await request(null,'OPTIONS')).code,200);
});
