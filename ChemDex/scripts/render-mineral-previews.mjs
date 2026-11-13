import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
async function writeArtifact(file,bytes){
  const temp=file+'.tmp';
  for(let attempt=0;attempt<6;attempt++)try{await fs.writeFile(temp,bytes);await fs.rename(temp,file);return;}catch(error){if(attempt===5)throw error;await new Promise(resolve=>setTimeout(resolve,200*(attempt+1)));}
}
const allCrystals=process.argv.includes('--all-crystals');
const crystals = process.argv.includes('--crystals')||allCrystals;
const wiki = process.argv.includes('--wiki');
const substances = process.argv.includes('--substances');
const cod = process.argv.includes('--cod');
const review = process.argv.includes('--review');
const sourceCatalog = JSON.parse(await fs.readFile(path.join(root, cod ? 'data/cod-crystal-models.json' : substances ? 'data/substance-crystal-models.json' : wiki ? 'data/wiki-crystal-models.json' : crystals ? 'data/crystal-catalog.json' : 'data/mineral-models.json'), 'utf8'));
if(allCrystals)for(const file of ['wiki-crystal-models','substance-crystal-models','cod-crystal-models'])sourceCatalog.structures.push(...JSON.parse(await fs.readFile(path.join(root,`data/${file}.json`),'utf8')).structures);
if(review&&crystals&&!wiki)sourceCatalog.structures.push(...JSON.parse(await fs.readFile(path.join(root,'data/wiki-crystal-models.json'),'utf8')).structures);
const catalog = {models: crystals || wiki ? sourceCatalog.structures : sourceCatalog.models};
const onlyId=process.argv.find(arg=>arg.startsWith('--id='))?.slice(5);
const ids=(onlyId??process.argv.find(arg=>arg.startsWith('--ids='))?.slice(6))?.split(',');
if(ids){const unknown=ids.filter(id=>!catalog.models.some(model=>model.id===id));if(unknown.length)throw Error(`Unknown model IDs: ${unknown.join(', ')}`);catalog.models=catalog.models.filter(model=>ids.includes(model.id));}
const pageHTML = `<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/":"/node_modules/three/"}}</script><style>body{margin:0;background:${crystals||wiki?'#f5fafc':'#0c1520'}}canvas{display:block}</style></head><body><script type="module">
import * as THREE from 'three';
import {frameCrystal} from '/js/three/published-crystal.js';
import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from '/node_modules/three/examples/jsm/environments/RoomEnvironment.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,480);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('${crystals||wiki?'#f5fafc':'#0c1520'}');
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.4;
scene.add(new THREE.HemisphereLight('#d6ecff','#353047',.75));
for(const [position,intensity] of [[[4,7,5],2],[[-4,2,-2],1]]){const l=new THREE.DirectionalLight('#eef5ff',intensity);l.position.set(...position);scene.add(l);}
const camera=new THREE.PerspectiveCamera(36,640/480,.01,100);
const loader=new GLTFLoader();let current;
window.renderMineral=async url=>{
 if(current){scene.remove(current);current.traverse(n=>{n.geometry?.dispose();if(n.material){for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});}
 const loaded=await loader.loadAsync(url);current=loaded.scene;scene.add(current);
 const box=new THREE.Box3().setFromObject(current),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const distance=Math.max(size.x,size.y,size.z)/2/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.65;
 camera.position.copy(center).add(new THREE.Vector3(1.5,.85,2).normalize().multiplyScalar(distance));camera.lookAt(center);camera.updateProjectionMatrix();
 if(${crystals||wiki})frameCrystal(camera,{target:new THREE.Vector3(),update(){}},current,640/480);
 renderer.render(scene,camera);await new Promise(r=>requestAnimationFrame(r));renderer.render(scene,camera);
 return {meshes:current.children.length,bounds:size.toArray(),canvas:renderer.domElement.toDataURL('image/png')};
};window.ready=true;
</script></body></html>`;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(pageHTML);return;}
  if(!url.pathname.startsWith('/node_modules/three/')&&!url.pathname.startsWith('/js/three/')&&!url.pathname.startsWith('/shared/chemistry/')&&!url.pathname.startsWith('/assets/periodic-table/minerals/')&&!url.pathname.startsWith('/assets/periodic-table/crystals/')){res.writeHead(404).end();return;}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const body=await fs.readFile(file);res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':'model/gltf-binary');res.end(body);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const results=[];
try{
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:640,height:480}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready);
  for(const model of catalog.models){
    const result=await page.evaluate(url=>window.renderMineral(url),model.model);
    const png=Buffer.from(result.canvas.split(',')[1],'base64');
    await writeArtifact(path.join(root,model.preview.slice(1)),png);
    results.push({id:model.id,bounds:result.bounds,rendered:true,bytes:png.length});
  }
  if(errors.length)throw new Error(errors.join('\n'));
  const reportOverride=process.argv.find(arg=>arg.startsWith('--report-dir='))?.slice(13);
  const report=reportOverride||ids?path.join(root,reportOverride??`.cache/crystal-assets/${onlyId??'selected'}`,'crystal-render-verification.json'):path.join(root,allCrystals?'docs/crystal-display-fix/2026-11-12/crystal-render-verification.json':cod ? 'docs/molecular-crystal-upgrade/2026-11-12/crystal-render-verification.json' : substances ? 'docs/learning-expansion/2026-11-12/crystal-render-verification.json' : wiki||review ? 'docs/application-crystal-review/2026-11-12/crystal-render-verification.json' : crystals ? 'docs/library-crystal-upgrade/2026-11-11/crystal-render-verification.json' : 'docs/periodic-table-audit/2026-11-11/model-render-verification.json');
  await fs.mkdir(path.dirname(report),{recursive:true});
  await fs.writeFile(report,JSON.stringify({date:ids?new Date().toISOString().slice(0,10):allCrystals||cod||substances||wiki||review?'2026-11-12':'2026-11-11',renderer:'Chromium WebGL / Three.js',models:results,errors},null,2)+'\n');
  console.log(JSON.stringify({rendered:results.length,errors}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
