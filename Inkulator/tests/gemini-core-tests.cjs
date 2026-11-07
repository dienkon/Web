const assert=require("node:assert/strict"),core=require("../desktop/ai-core.cjs");
const png="data:image/png;base64,iVBORw0KGgo=";
for(const action of Object.keys(core.actions)){
 const body=core.request(action,png);assert.equal(body.contents[0].parts[1].inlineData.data,png.split(",")[1]);assert.equal(body.generationConfig.responseMimeType,"application/json");assert.ok(!JSON.stringify(body).includes("api-key"));
}
for(const [action,src]of [["__proto__",png],["constructor",png],["solve","https://example.com/secret"],["solve","data:text/html;base64,AAAA"],["solve","data:image/png;base64,"+"A".repeat(7000001)]])assert.throws(()=>core.request(action,src));
assert.throws(()=>core.cleanResult(null));assert.throws(()=>core.cleanResult([]));
const safe=core.cleanResult({title:"<script>alert(1)</script>",latex:"x^2",diagrams:[{kind:"shell-command",solid:true},{kind:"cube",solid:true,labels:["A","B"]}],steps:[null,{title:"A",text:"B",latex:"C"}],warnings:["test"]});assert.equal(safe.diagrams.length,1);assert.equal(safe.diagrams[0].kind,"cube");assert.equal(safe.steps[0].text,"");
console.log("PASS Gemini protocol: six bounded image-only actions, structured outputs, rejected unsafe actions and validated diagram allowlist");
