import { it,expect,vi,afterEach } from 'vitest';
vi.mock('../server/firebaseAdmin.js',()=>({adminDb:null,adminAuth:{verifyIdToken:async(token:string)=>({uid:token})},getFirebaseApiKey:()=> 'test',encodeFirestoreFields:(x:any)=>x,decodeFirestoreDocument:(x:any)=>x.fields}));
import { publishStudioShare, resolveStudioShareName, shareNameAvailable, readStudioShare } from '../server/codeStudioShares';
const sample={version:1,projectId:'project-one',mode:'website',title:'My website',description:'',payload:JSON.stringify({version:1,html:'<!DOCTYPE html><h1>Hello</h1>'}),customSlug:'my-website'};
function database(){
  const docs=new Map<string,any>();let revision=0;
  const fetcher=vi.fn(async(url:string,init?:RequestInit)=>{
    const parsed=new URL(url), key=parsed.pathname.split('/documents/')[1];
    if(parsed.pathname.endsWith('/documents:commit')){
      const {writes}=JSON.parse(String(init?.body));
      for(const w of writes){const key=w.update.name.split('/documents/')[1],old=docs.get(key);if(w.currentDocument?.exists===false&&old || w.currentDocument?.updateTime&&old?.updateTime!==w.currentDocument.updateTime)return Response.json({},{status:409});}
      for(const w of writes)docs.set(w.update.name.split('/documents/')[1],{fields:w.update.fields,updateTime:'r'+ ++revision});
      return Response.json({});
    }
    if(init?.method==='PATCH'){const old=docs.get(key);if(parsed.searchParams.has('currentDocument.updateTime')&&old?.updateTime!==parsed.searchParams.get('currentDocument.updateTime'))return Response.json({},{status:412});docs.set(key,{fields:JSON.parse(String(init.body)).fields,updateTime:'r'+ ++revision});return Response.json({});}
    return docs.has(key)?Response.json(docs.get(key)):Response.json({},{status:404});
  });vi.stubGlobal('fetch',fetcher);return{docs,fetcher};
}
afterEach(()=>vi.unstubAllGlobals());
it('atomically reserves a clean name and updates the same document, with public name resolution',async()=>{
  const {docs,fetcher}=database();expect(await shareNameAvailable('my-website')).toBe(true);
  const first=await publishStudioShare(sample,'owner');expect(first.path).toBe('/code/my-website');expect(docs.size).toBe(2);
  const commit=fetcher.mock.calls.find(([url])=>url.includes('documents:commit'))!;
  const writes=JSON.parse(String(commit[1]?.body)).writes;
  expect(writes).toHaveLength(2);expect(writes[0].update.name).toMatch(/^projects\/[^/]+\/databases\/\(default\)\/documents\/code_studio_shares\//);
  expect(writes[1].currentDocument).toEqual({exists:false});
  expect(await shareNameAvailable('my-website')).toBe(false);expect(await resolveStudioShareName('my-website')).toBe(first.id);
  const next=await publishStudioShare({...sample,shareId:first.id,title:'Changed'},'owner');expect(next.path).toBe(first.path);expect(docs.size).toBe(2);expect((await readStudioShare(first.id))?.title).toBe('Changed');
  await expect(publishStudioShare({...sample,projectId:'another'},'other')).rejects.toMatchObject({status:409});
  await expect(publishStudioShare({...sample,customSlug:'different-name'},'owner')).rejects.toThrow('cố định');
});
it('supports adding a name to an existing legacy link and preserves the same project ID',async()=>{
  const {customSlug:_,...old}=sample;database();const first=await publishStudioShare(old,'owner');
  const next=await publishStudioShare({...sample,shareId:first.id},'owner');expect(next.id).toBe(first.id);expect(next.path).toBe('/code/my-website');expect(await readStudioShare(first.id)).not.toBeNull();
});
it('rejects invalid names before reserving and fails closed on an atomic race or missing rules',async()=>{
  const {docs,fetcher}=database();await expect(shareNameAvailable('../bad')).rejects.toMatchObject({status:400});
  await expect(publishStudioShare({...sample,customSlug:'Bad Name'},'owner')).rejects.toMatchObject({status:400});expect(docs.size).toBe(0);
  const normal=fetcher.getMockImplementation()!;
  fetcher.mockImplementation(async(url,init)=>url.includes('documents:commit')?Response.json({},{status:409}):normal(url,init));
  await expect(publishStudioShare(sample,'owner')).rejects.toMatchObject({status:409});expect(docs.size).toBe(0);
  fetcher.mockImplementation(async(url,init)=>url.includes('documents:commit')?Response.json({},{status:403}):normal(url,init));
  await expect(publishStudioShare(sample,'owner')).rejects.toMatchObject({status:503});expect(docs.size).toBe(0);
});
