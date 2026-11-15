import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { send, evaluate, ev, check, wait, delay, errors, checks, socket, target, cdp, app } from './practical-browser-driver.mjs';

const stage = process.argv[2] ?? 'after';
const directory = 'docs/movement-batching';
const snapshots = {};
try {
  await mkdir(directory, { recursive: true });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();' });
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await send('Page.navigate', { url: app });
  await wait("document.querySelector('.start-shell')", 'start screen');
  await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',runState:'RUNNING',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true}}));playerCoords.position=[0,0,4.5];return true;`);
  await wait('window.__LAB_INSPECT_BATCHES__', 'room render');
  if (await evaluate("Boolean(document.querySelector('.orientation-gate'))")) await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Mở toàn màn hình')).click();true;");
  await wait("window.__LAB_DEBUG_STATE__?.view==='game' && window.__LAB_DEBUG_STATE__?.runState==='RUNNING' && !window.__LAB_DEBUG_STATE__?.cinematic", 'active player');
  await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(playerCoords.rotationY/.0022,0);return true;`);
  await wait('Math.abs(window.__LAB_DEBUG_STATE__.cameraRotation[1])<.001', 'camera facing the room');
  await delay(1600);
  await evaluate(`(async()=>{const F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name);window.__STATIC_BATCH_ROOT__=[...F._roots.values()].map(r=>r.store.getState()).find(s=>s.scene.getObjectByName('lab-room'));return true;})()`);
  snapshots.room = await evaluate(`(()=>{const {scene,gl,camera}=window.__STATIC_BATCH_ROOT__,models={};for(const name of ['asset-stool','asset-drawer']){const objects=scene.getObjectsByProperty('name',name);let visible=0,source=0;for(const root of objects)root.traverse(o=>{if(o.isMesh){source++;if(o.visible)visible++;}});models[name]={count:objects.length,visible,source};}gl.info.reset();gl.render(scene,camera);const direct={...gl.info.render};return {direct,models,batches:window.__LAB_INSPECT_BATCHES__(),renderer:structuredClone(window.__LAB_RENDERER_INFO__),camera:camera.position.toArray()};})()`);
  console.log(JSON.stringify({ stage, direct: snapshots.room.direct, models: snapshots.room.models, batchCount: snapshots.room.batches.batches.length }));
  if (stage === 'before') {
    await writeFile(`${directory}/before.json`, JSON.stringify(snapshots, null, 2));
  } else {
    const before = JSON.parse(await readFile(`${directory}/before.json`, 'utf8')).room;
    check(snapshots.room.direct.calls < before.direct.calls, 'fewer main-scene draw calls at the same camera and resolution');
    check(snapshots.room.renderer.pixelRatio === before.renderer.pixelRatio, 'draw-call comparison keeps the same pixel ratio');
    check(snapshots.room.models['asset-stool'].count === 16 && snapshots.room.models['asset-stool'].visible < 176, 'all 16 stools keep their geometry with fewer draws');
    check(snapshots.room.models['asset-drawer'].count === 20 && snapshots.room.models['asset-drawer'].visible === 20, 'all 20 drawers render as one local batch each');
    snapshots.geometry = await evaluate(`(()=>{const scene=window.__STATIC_BATCH_ROOT__.scene;let batches=0,invalid=0,proxies=0,unhidden=0;scene.traverse(o=>{if(o.userData.staticRenderProxy){proxies++;if(o.visible)unhidden++;}if(o.name==='room-static-render-batch'){batches++;for(const name of ['position','normal','color']){const a=o.geometry.getAttribute(name);if(!a)invalid++;else for(const value of a.array)if(!Number.isFinite(value))invalid++;}if(!o.material.vertexColors||o.material.color.getHex()!==0xffffff)invalid++;}});return {batches,invalid,proxies,unhidden};})()`);
    check(snapshots.geometry.invalid === 0 && snapshots.geometry.unhidden === 0 && snapshots.geometry.proxies > 500, 'finite colored buffers preserve hidden named picking proxies');
    snapshots.control = await evaluate(`(()=>{const {scene,gl,camera}=window.__STATIC_BATCH_ROOT__,changed=[];scene.traverse(o=>{if(o.userData.staticRenderProxy||o.name==='room-static-render-batch'){changed.push([o,o.visible]);o.visible=!!o.userData.staticRenderProxy;}});gl.info.reset();gl.render(scene,camera);const original={...gl.info.render};for(const [object,visible] of changed)object.visible=visible;gl.info.reset();gl.render(scene,camera);return {original,batched:{...gl.info.render},camera:camera.position.toArray(),rotation:camera.rotation.toArray()};})()`);
    check(snapshots.control.batched.calls < snapshots.control.original.calls, 'same-frame A/B confirms reduced draws with original geometry, camera and lighting');
    snapshots.motion = await evaluate(`(async()=>{const scene=window.__STATIC_BATCH_ROOT__.scene,{useLabEquipment}=await import('/src/store/useLabEquipment.ts');let seat,drawer;scene.traverse(o=>{if(!seat&&o.userData.labItem?.kind==='seat')seat=o;if(!drawer&&o.userData.ownsDrawerMotion)drawer=o;});const seatBatch=seat.getObjectByName('room-static-render-batch'),drawerBatch=drawer.getObjectByName('room-static-render-batch'),slide=drawer.children[0];window.__BATCH_MOTION__={seat,drawer,seatBatch,drawerBatch,slide,seatMatrix:seatBatch.matrixWorld.clone(),drawerMatrix:drawerBatch.matrixWorld.clone(),seatGeometry:seatBatch.geometry,drawerGeometry:drawerBatch.geometry};useLabEquipment.getState().setActive((seat.userData.labItem.id??seat.uuid),true);useLabEquipment.getState().setActive((drawer.userData.labItem.id??drawer.uuid),true);return {seat:(seat.userData.labItem.id??seat.uuid),drawer:(drawer.userData.labItem.id??drawer.uuid)};})()`);
    await wait('Math.abs(window.__BATCH_MOTION__.seat.rotation.y-Math.PI/2)<.001 && Math.abs(window.__BATCH_MOTION__.slide.position.z-.22)<.001', 'seat and drawer animation');
    Object.assign(snapshots.motion, await evaluate(`(()=>{const m=window.__BATCH_MOTION__;window.__STATIC_BATCH_ROOT__.scene.updateMatrixWorld(true);return {seatRotated:Math.abs(m.seat.rotation.y-Math.PI/2)<.001,drawerOpened:Math.abs(m.slide.position.z-.22)<.001,seatBatchMoved:!m.seatMatrix.equals(m.seatBatch.matrixWorld),drawerBatchMoved:!m.drawerMatrix.equals(m.drawerBatch.matrixWorld),geometryRetained:m.seatGeometry===m.seatBatch.geometry&&m.drawerGeometry===m.drawerBatch.geometry};})()`));
    check(snapshots.motion.seatRotated && snapshots.motion.drawerOpened && snapshots.motion.seatBatchMoved && snapshots.motion.drawerBatchMoved && snapshots.motion.geometryRetained, 'actual stool rotation and drawer opening move local batches without rebuilding buffers');
    await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');const m=window.__BATCH_MOTION__;useLabEquipment.getState().setActive((m.seat.userData.labItem.id??m.seat.uuid),false);useLabEquipment.getState().setActive((m.drawer.userData.labItem.id??m.drawer.uuid),false);return true;`);
    snapshots.lifecycle = await evaluate(`(async()=>{
      const T=await import('/src/compat/three.ts');
      const {buildStaticGeometryBatch}=await import('/src/components/3d/lab/staticGeometryBatch.ts');
      const {gl}=window.__STATIC_BATCH_ROOT__,scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.1,20);camera.position.set(0,0,5);
      scene.add(new T.AmbientLight(0xffffff,2));const parent=new T.Group();scene.add(parent);
      const geometry=new T.BoxGeometry(.5,.5,.5),red=new T.MeshStandardMaterial({color:'#aa3322',roughness:.6,metalness:.2}),blue=new T.MeshStandardMaterial({color:'#2277aa',roughness:.6,metalness:.2});
      const a=new T.Mesh(geometry,red),b=new T.Mesh(geometry,blue);a.position.x=-.4;b.position.x=.4;parent.add(a,b);
      const ray=new T.Raycaster(new T.Vector3(-.4,0,3),new T.Vector3(0,0,-1));
      const cycles=[];let sourceDisposals=0;red.addEventListener('dispose',()=>sourceDisposals++);blue.addEventListener('dispose',()=>sourceDisposals++);geometry.addEventListener('dispose',()=>sourceDisposals++);
      for(let i=0;i<3;i++){
        const cleanup=buildStaticGeometryBatch(parent,'test'),batch=parent.getObjectByName('room-static-render-batch');let disposedGeometry=0,disposedMaterial=0;
        batch.geometry.addEventListener('dispose',()=>disposedGeometry++);batch.material.addEventListener('dispose',()=>disposedMaterial++);
        scene.updateMatrixWorld(true);const picking=ray.intersectObject(a,false).length>0;
        gl.info.reset();gl.render(scene,camera);const calls=gl.info.render.calls;
        const color=batch.geometry.getAttribute('color'),palette=new Set();for(let v=0;v<color.count;v++)palette.add([color.getX(v),color.getY(v),color.getZ(v)].join(','));
        cleanup();cleanup();cycles.push({calls,picking,palette:palette.size,disposedGeometry,disposedMaterial,sourceDisposals,restored:a.visible&&b.visible&&!a.userData.staticRenderProxy&&!b.userData.staticRenderProxy&&!parent.getObjectByName('room-static-render-batch')&&!parent.userData.renderBatch});
      }
      const special=new T.Group();const morph=new T.Mesh(geometry.clone(),red);morph.geometry.morphAttributes.position=[geometry.attributes.position.clone()];const skin=new T.SkinnedMesh(geometry,red);const colored=new T.InstancedMesh(geometry,blue,1);colored.setColorAt(0,new T.Color('red'));special.add(morph,skin,colored);
      const specialCleanup=buildStaticGeometryBatch(special,'unsupported');const exclusions=special.children.every(o=>o.visible&&!o.userData.staticRenderProxy);specialCleanup();morph.geometry.dispose();colored.dispose();
      const flags=new T.Group();for(const change of [{roughness:.9},{metalness:.8},{emissive:'#224466'},{depthWrite:false},{stencilWrite:true},{polygonOffset:true,polygonOffsetFactor:2}]){const material=red.clone();material.setValues(change);flags.add(new T.Mesh(geometry,material));}flags.add(new T.Mesh(geometry,red));const flagsCleanup=buildStaticGeometryBatch(flags,'flags');const distinctFlags=flags.children.every(o=>o.visible&&!o.userData.staticRenderProxy);flagsCleanup();for(const child of flags.children)if(child.material!==red)child.material.dispose();
      red.dispose();blue.dispose();geometry.dispose();gl.info.reset();gl.render(window.__STATIC_BATCH_ROOT__.scene,window.__STATIC_BATCH_ROOT__.camera);
      return {cycles,exclusions,distinctFlags};
    })()`);
    check(snapshots.lifecycle.cycles.every(c=>c.calls===1&&c.picking&&c.palette===2), 'colored batch renders in one draw and original hidden meshes remain raycastable');
    check(snapshots.lifecycle.cycles.every(c=>c.disposedGeometry===1&&c.disposedMaterial===1&&c.sourceDisposals===0&&c.restored), 'repeated cleanup releases owned geometry/materials once and restores source meshes without proxy leaks');
    check(snapshots.lifecycle.exclusions && snapshots.lifecycle.distinctFlags, 'skinned, morph and instance-colored meshes remain separate; differing material render flags never merge');
    check(errors.length === 0, 'no runtime exceptions while batching the room');
    await writeFile(`${directory}/after.json`, JSON.stringify({ passed: true, checks, errors, snapshots }, null, 2));
  }
} catch (error) {
  console.error(JSON.stringify({ errors, snapshots, error: String(error) }));
  throw error;
} finally {
  socket.close();
  await fetch(`${cdp}/json/close/${target.id}`);
}
