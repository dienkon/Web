import { describe,it,expect,vi,afterEach } from 'vitest';
import { draftFiles, readAgentStream } from '../src/practice/code-studio/agentStream';
import { validShareName } from '../src/practice/code-studio/shareName';
import { createProject } from '../src/practice/code-studio/project';
const { generateContentStream } = vi.hoisted(()=>({generateContentStream:vi.fn()}));
vi.mock('../src/services/ai/aiClient.js',()=>({getAiClient:()=>({models:{generateContentStream}})}));
import { generateStudioChanges } from '../server/codeStudioAi';
afterEach(()=>vi.restoreAllMocks());
describe('DkCode agent live drafts',()=>{
  it('decodes every partial prefix, escaped code, unicode and multiple files without showing JSON escapes',()=>{
    const files=[{path:'index.html',content:'<h1>Điền 😀</h1>\n<script>const x = "a\\b";</script>'},{path:'a.js',content:'console.log("ok");'}];
    const source=JSON.stringify({summary:'A fake "files": [] label',files,deletePaths:[]});
    for(let i=0;i<=source.length;i++) { const result=draftFiles(source.slice(0,i)); for(const f of result) { const expected=files.find(x=>x.path===f.path); expect(expected).toBeDefined(); expect(expected!.content.startsWith(f.content)).toBe(true); } }
    expect(draftFiles(source)).toEqual(files);
    expect(draftFiles('{"files":[{"path":"a.js","content":"\\u0061\\u00')).toEqual([{path:'a.js',content:'a'}]);
    expect(draftFiles('{"files":[{"path":"../bad","content":"x"}]}')).toEqual([]);
  });
  it('handles UTF8 and NDJSON split at every byte; requires terminal done and handles provider errors',async()=>{
    const changes={summary:'Đã sửa',files:[{path:'a.js',content:'// Tiếng Việt 😀'}],deletePaths:[]};
    const bytes=new TextEncoder().encode(JSON.stringify({type:'delta',text:JSON.stringify(changes)})+'\n'+JSON.stringify({type:'done',changes})+'\n');
    const response=new Response(new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}}));
    const draft=vi.fn(); const result=await readAgentStream(response,new AbortController().signal,draft);
    expect(result.changes).toEqual(changes);expect(draft).toHaveBeenLastCalledWith(changes.files);
    await expect(readAgentStream(new Response('{"type":"delta","text":"{}"}\n'),new AbortController().signal,()=>{})).rejects.toThrow('bị ngắt');
    await expect(readAgentStream(new Response('{"type":"error","error":"provider failed"}\n'),new AbortController().signal,()=>{})).rejects.toThrow('provider failed');
    const abort=new AbortController();abort.abort();await expect(readAgentStream(new Response(''),abort.signal,()=>{})).rejects.toThrow();
  });
  it('streams real provider chunks and validates the final changes before committing',async()=>{
    const changes={summary:'Sửa',files:[{path:'index.html',content:'<h1>Hello</h1>'}],deletePaths:[],entry:'index.html'},source=JSON.stringify(changes);
    generateContentStream.mockImplementationOnce(async()=> (async function*(){for(let i=0;i<source.length;i+=11)yield{text:source.slice(i,i+11)};})());
    const delta=vi.fn();const result=await generateStudioChanges({prompt:'Code',project:createProject()},'test',new AbortController().signal,delta);
    expect(delta.mock.calls.map(x=>x[0]).join('')).toBe(source);expect(result.changes).toEqual(changes);
    expect(generateContentStream.mock.calls[0][0].model).toBe('gemini-3.5-flash-lite');
    generateContentStream.mockImplementationOnce(async()=> (async function*(){yield{text:'{"files":['};})());
    await expect(generateStudioChanges({prompt:'Code',project:createProject()},'test',undefined,()=>{})).rejects.toThrow();
  });
});
describe('DkCode public names',()=>{
  it('accepts clean names and rejects traversal, suffixes, reserved names and invalid lengths',()=>{
    for(const name of ['my-site','abc','dien123','a'.repeat(42)])expect(validShareName(name)).toBe(true);
    for(const name of ['ab','a'.repeat(43),'-test','test-','Test','trang web','../test','site.0123456789abcdef','api','admin','dkcode'])expect(validShareName(name)).toBe(false);
  });
});
