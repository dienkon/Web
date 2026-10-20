import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyCompletion, getCompletions } from '../src/practice/code-studio/completions';
import { createProject, movePath, validateProject } from '../src/practice/code-studio/project';
import { IMAGE_LIMIT, validateMedia, validAsset, uploadProjectMedia } from '../src/practice/code-studio/media';
import { exportProjectZip } from '../src/practice/code-studio/projectZip';
import { applyAiChanges } from '../src/practice/code-studio/aiChanges';
function fixture(code: string, path='index.html') { return { ...createProject(), activeFile:path, entry:path, files:[{path,content:code}] }; }
const asset = { url:'https://res.cloudinary.com/demo/image/upload/v1/logo.png', mime:'image/png', bytes:24 };
afterEach(() => vi.unstubAllGlobals());
describe('Contextual coding suggestions', () => {
  it('replaces a partial tag instead of duplicating its opening bracket, placing the caret inside', () => {
    const p=fixture('<di'), suggestion=getCompletions(p,'index.html',3).find(i=>i.label==='div')!;
    expect(applyCompletion('<di',suggestion)).toEqual({code:'<div></div>',caret:5});
  });
  it('suggests attributes and preserves a typed suffix when completing in the middle', () => {
    const p=fixture('<input pla'); const suggestion=getCompletions(p,'index.html',10).find(i=>i.label==='placeholder')!;
    expect(applyCompletion(p.files[0].content,suggestion).code).toBe('<input placeholder=""');
    const middle=fixture('document.queSelector','app.js'); const item=getCompletions(middle,'app.js',12).find(i=>i.label==='querySelector')!;
    expect(applyCompletion(middle.files[0].content,item).code).toBe('document.querySelector("")');
  });
  it('understands embedded JavaScript and CSS property/value contexts', () => {
    const p=fixture('<script>document.que'); expect(getCompletions(p,'index.html',p.files[0].content.length)[0].label).toBe('querySelector');
    const css=fixture('display: fl','style.css'); expect(getCompletions(css,'style.css',11).map(i=>i.label)).toContain('flex');
    const property=fixture('colo','style.css'); expect(getCompletions(property,'style.css',4)[0].template).toBe('color: $0;');
  });
  it('offers relative media paths and indents multiline Python snippets', () => {
    const p=fixture('<img src="../ass','pages/index.html');p.files.push({path:'assets/logo.png',content:'',asset} as any);
    const item=getCompletions(p,p.activeFile,p.files[0].content.length)[0]; expect(item.label).toBe('../assets/logo.png');
    const py=fixture('    fo','main.py'); const loop=getCompletions(py,'main.py',6)[0]; expect(applyCompletion(py.files[0].content,loop).code).toContain('\n        ');
  });
  it('keeps automatic suggestions out of comments/strings and rejects stale replacements', () => {
    expect(getCompletions(fixture('// pri','app.js'),'app.js',6)).toEqual([]);
    expect(getCompletions(fixture('"pri','app.js'),'app.js',4)).toEqual([]);
    const item=getCompletions(fixture('pri','main.py'),'main.py',3)[0]; expect(()=>applyCompletion('private',item)).toThrow('thay đổi');
  });
  it('keeps existing attributes/closing tags and ranks the nearest unmatched closing tag first', () => {
    for (const code of ['<di>\n  </div>','<di class="hero"></div>']) {
      const p=fixture(code), item=getCompletions(p,'index.html',3).find(i=>i.label==='div')!;
      expect(applyCompletion(code,item).code).toBe(code.replace('<di','<div'));
    }
    const p=fixture('<main><section></');expect(getCompletions(p,'index.html',p.files[0].content.length)[0].label).toBe('section');
  });
  it('continues suggesting after completed string literals and skips open HTML comments', () => {
    const p=fixture('const label="Hello"; document.que','app.js');expect(getCompletions(p,'app.js',p.files[0].content.length)[0].label).toBe('querySelector');
    const comment=fixture('<!-- <di');expect(getCompletions(comment,'index.html',8)).toEqual([]);
  });
});
describe('Media project files', () => {
  it('accepts image/video signatures and rejects disguised HTML or oversized files before uploading', async () => {
    const file=(type:string,bytes:number[])=>({name:'file',type,size:bytes.length,slice:()=>({arrayBuffer:async()=>Uint8Array.from(bytes).buffer})}) as File;
    await validateMedia([file('image/png',[137,80,78,71,13,10,26,10]),file('video/webm',[26,69,223,163])]);
    await expect(validateMedia([file('image/png',[60,104,116,109,108])])).rejects.toThrow('khớp');
    await expect(validateMedia([{...file('image/png',[]),size:IMAGE_LIMIT+1}])).rejects.toThrow('8 MB');
  });
  it('preserves media metadata through validation and moves and protects it from AI text replacement', () => {
    const p=fixture('<img src="assets/logo.png">');p.files.push({path:'assets/logo.png',content:'',asset} as any);
    const valid=validateProject(p); expect(movePath(valid,'assets/logo.png','logo.png').files.find(f=>f.path==='logo.png')?.asset).toEqual(asset);
    expect(()=>applyAiChanges(valid,valid,{summary:'wrong',files:[{path:'assets/logo.png',content:'text'}],deletePaths:[]})).toThrow('mã nguồn');
    expect(validAsset({...asset,url:'https://evil.test/file.png'})).toBeFalsy();
  });
  it('validates the Cloudinary resource type and returned URL', async () => {
    const fetcher=vi.fn().mockResolvedValue(Response.json({resource_type:'image',secure_url:asset.url,bytes:asset.bytes}));vi.stubGlobal('fetch',fetcher);
    const file=new File([new Uint8Array(24)],'logo.png',{type:'image/png'}); expect(await uploadProjectMedia(file,new AbortController().signal)).toEqual(asset);
    expect(fetcher.mock.calls[0][0]).toContain('/image/upload');
    fetcher.mockResolvedValue(Response.json({resource_type:'video',secure_url:asset.url,bytes:24}));await expect(uploadProjectMedia(file,new AbortController().signal)).rejects.toThrow('Cloudinary');
  });
  it('bounds total media to keep full project archives feasible on mobile', () => {
    const p=fixture('Hello');for(let i=0;i<4;i++)p.files.push({path:`assets/${i}.mp4`,content:'',asset:{url:`https://res.cloudinary.com/demo/video/upload/${i}.mp4`,mime:'video/mp4',bytes:25*1024*1024}} as any);
    expect(()=>validateProject(p)).toThrow('80 MB');
  });
});
describe('Full project ZIP', () => {
  it('includes Unicode source paths, empty folders and actual media bytes', async () => {
    const p=fixture('Xin chào','src/chào.txt');p.folders=['empty'];p.files.push({path:'assets/logo.png',content:'',asset} as any);
    const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(bytes)));
    const progress=vi.fn(),zip=await exportProjectZip(p,new AbortController().signal,progress);const data=new Uint8Array(await zip.arrayBuffer());
    expect(new DataView(data.buffer).getUint32(0,true)).toBe(0x04034b50); const text=new TextDecoder().decode(data); expect(text).toContain('src/chào.txt');expect(text).toContain('empty/');expect(text).toContain('Xin chào');expect(progress).toHaveBeenLastCalledWith(2,2);
    expect(data.some((_,i)=>bytes.every((b,j)=>data[i+j]===b))).toBe(true);
  });
  it('fails rather than exporting a project with missing media and supports cancellation', async () => {
    const p=fixture('Hello');p.files.push({path:'assets/logo.png',content:'',asset} as any);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:404})));
    await expect(exportProjectZip(p,new AbortController().signal,()=>{})).rejects.toThrow('thiếu file');
    const controller=new AbortController();controller.abort();await expect(exportProjectZip(p,controller.signal,()=>{})).rejects.toBeTruthy();
  });
});
