import { mkdir, writeFile } from 'node:fs/promises';
import { send, evaluate, ev, check, wait, delay, click, errors, checks, socket, target, cdp, app } from './practical-browser-driver.mjs';

const output = '.browser-review/hand-orientation';
const snapshots = [];
const inspect = () => evaluate(`(async () => {
  const fiberURL = performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === '/node_modules/.vite/deps/@react-three_fiber.js').name;
  const { _roots } = await import(fiberURL);
  const state = [..._roots.values()].map(root => root.store.getState()).find(s => s.scene.getObjectByName('fps-hands'));
  const { scene, camera } = state;
  scene.updateMatrixWorld(true);
  const vector = () => camera.position.clone().set(0, 0, 0);
  const world = object => object.getWorldPosition(vector());
  const fps = scene.getObjectByName('fps-hands');
  const arms = ['left', 'right'].map(side => {
    const palm = fps.getObjectByName('held-' + side + '-palm');
    const hand = palm.getObjectByName('asset-grip-hand');
    const sleeve = fps.getObjectByName('held-' + side + '-sleeve');
    const origin = fps.worldToLocal(world(hand));
    const thumb = fps.worldToLocal(world(hand.getObjectByName('hand-thumb')));
    const wrist = world(hand.getObjectByName('hand-wrist'));
    const fingers = world(hand.getObjectByName('hand-fingers'));
    const extension = sleeve.localToWorld(vector().set(0, .3, 0)).sub(world(sleeve)).normalize();
    return { side, ...hand.userData.wardrobe, thumbX: thumb.x - origin.x,
      wristGap: wrist.distanceTo(world(sleeve)),
      fingerDirection: fingers.sub(wrist).normalize().dot(extension) };
  });
  let invalid = 0, reversed = 0;
  fps.traverse(object => {
    if (!object.isMesh) return;
    if (object.matrixWorld.determinant() <= 0) reversed++;
    for (const name of ['position', 'normal']) {
      const attribute = object.geometry.getAttribute(name);
      if (attribute) for (const value of attribute.array) if (!Number.isFinite(value)) invalid++;
    }
  });
  const anchors = [['held-pan-grip','held-right-palm'], ['held-brush-grip','held-left-palm'],
    ['held-extinguisher-grip','held-right-palm'], ['held-nozzle-port','held-left-palm'],
    ['held-waste-grip','held-right-palm']].flatMap(([grip,palm]) => {
      const object = fps.getObjectByName(grip);
      return object ? [{ grip, gap: world(object).distanceTo(world(fps.getObjectByName(palm))) }] : [];
    });
  const avatar = scene.getObjectByName('asset-character');
  let mirror;
  if (avatar) {
    const right = avatar.getObjectByName('avatar-right-palm'), left = avatar.getObjectByName('avatar-left-palm');
    mirror = { rightX: avatar.worldToLocal(world(right)).x, leftX: avatar.worldToLocal(world(left)).x,
      rightIsLeft: right.getObjectByName('asset-grip-hand').userData.wardrobe.left,
      leftIsLeft: left.getObjectByName('asset-grip-hand').userData.wardrobe.left,
      anchors: [['held-mirror-extinguisher-grip',right],['held-mirror-nozzle-port',left],
        ['held-mirror-pan-grip',right],['held-mirror-brush-grip',left],['held-mirror-waste-grip',right]]
        .flatMap(([name,palm])=>{const grip=avatar.getObjectByName(name);return grip?[{name,gap:world(grip).distanceTo(world(palm))}]:[];}) };
  }
  return { arms, anchors, invalid, reversed, mirror };
})()`);

try {
  await mkdir(output, { recursive: true });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: app });
  await wait("document.querySelector('.start-shell')", 'start screen');
  await ev(`useStore.getState().startGame();useStore.setState(s => ({view:'game',runState:'RUNNING',cinematic:null,currentPhase:4,
    tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},
    player:{...s.player,equipment:{hasGoggles:false,hasLabCoat:true,hasGloves:false,hasMask:false,hairTied:true,hasClosedShoes:true},
      inventory:{...s.player.inventory,hasSweeper:true,hasFireExtinguisher:true,isHoldingTrash:true,heldTrashType:'chemical'}}}));return true;`);
  await wait('window.__LAB_INSPECT_MODELS__', 'game scene');
  for (const gloved of [false, true]) for (const tool of [null, 'spillKit', 'extinguisher', 'waste']) {
    await ev(`useStore.setState(s=>({activeTool:${JSON.stringify(tool)},player:{...s.player,equipment:{...s.player.equipment,hasGloves:${gloved}}}}));return true;`);
    await delay(700);
    const snapshot = await inspect();
    snapshots.push({ gloved, tool, ...snapshot });
    for (const hand of snapshot.arms) {
      const label = [gloved ? 'gloved' : 'bare', tool ?? 'idle', hand.side].join('/');
      check(hand.left === (hand.side === 'left'), 'correct hand identity: ' + label);
      check(hand.side === 'right' ? hand.thumbX < -.02 : hand.thumbX > .02, 'thumb points inward: ' + label);
      check(hand.wristGap < .005, 'wrist meets sleeve within 5 mm: ' + label);
      check(hand.fingerDirection < -.8, 'fingers extend away from sleeve: ' + label);
      check(hand.pose === (!tool || (tool === 'waste' && hand.side === 'left') ? 'relaxed' : 'grip'), 'only occupied hands grip: ' + label);
    }
    check(snapshot.invalid === 0 && snapshot.reversed === 0, 'finite geometry and positive transforms: ' + gloved + '/' + tool);
    for (const anchor of snapshot.anchors) check(anchor.gap < .035, 'tool meets palm: ' + anchor.grip);
    if (snapshot.mirror) {
      check(snapshot.mirror.rightX < 0 && snapshot.mirror.leftX > 0, 'avatar hands agree with forward-facing anatomy');
      check(!snapshot.mirror.rightIsLeft && snapshot.mirror.leftIsLeft, 'avatar hand geometry matches arm identity');
      for (const anchor of snapshot.mirror.anchors) check(anchor.gap < .035, 'mirror tool meets correct palm: ' + anchor.name);
    }
    if (tool !== 'waste') {
      const image = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(output + '/' + (gloved ? 'gloved-' : 'bare-') + (tool ?? 'idle') + '.png', Buffer.from(image.data, 'base64'));
    }
  }
  await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');
    playerCoords.position=[-.8,0,5.2];inputManager.resetAll();
    const rotation=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;
    inputManager.addMouseLook((rotation[1]-Math.PI)/(.0022*s.cameraSensitivity),rotation[0]/(.0022*s.cameraSensitivity));
    useStore.setState({activeTool:'extinguisher'});return true;`);
  await delay(1300);
  const mirrorImage = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(output + '/mirror-extinguisher.png', Buffer.from(mirrorImage.data, 'base64'));
  // Exercise the actual viewmodel callback with uneven frame times, without
  // depending on a particular GPU or throttling the rest of the simulation.
  const recoil = await evaluate(`(async()=>{
    const { _roots } = await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name);
    const state=[..._roots.values()].map(root=>root.store.getState()).find(s=>s.scene.getObjectByName('fps-hands'));
    const { fireSimulation }=await import('/src/core/fire/FireSim.ts');
    const { createExtinguisher }=await import('/src/core/fire/ExtinguisherModel.ts');
    const { toolControls }=await import('/src/systems/input/toolControls.ts');
    const callback=state.internal.subscribers.find(s=>s.ref.current.toString().includes('walkBobTimer')).ref.current;
    const arm=state.scene.getObjectByName('held-right-palm').parent;
    const originalExtinguisher=fireSimulation.currentExtinguisher,originalSpray=toolControls.spraying;
    const sample=()=>{const values=[];for(const delta of [.05,.016,.1,.008,.2,.033,.05]){callback(state,delta);values.push(arm.position.z);}return values;};
    try{
      fireSimulation.currentExtinguisher=createExtinguisher('viewmodel-regression','co2');
      fireSimulation.currentExtinguisher.isDischarging=true;toolControls.spraying=true;
      const squeezing=sample();toolControls.spraying=false;const released=sample();
      return {squeezing,released};
    }finally{fireSimulation.currentExtinguisher=originalExtinguisher;toolControls.spraying=originalSpray;}
  })()`);
  check([...recoil.squeezing,...recoil.released].every(z=>z>=-.7550001&&z<=-.7199999), 'uneven 8–200 ms frames keep recoil inside its physical range');
  check(recoil.squeezing.every((z,i)=>i===0||z<=recoil.squeezing[i-1])&&recoil.released.every((z,i)=>i===0||z>=recoil.released[i-1]), 'spray and release approach targets without overshoot or oscillation');
  snapshots.push({ recoil });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await ev("useStore.setState({activeTool:'spillKit'});return true;"); await delay(900);
  if (await evaluate("Boolean(document.querySelector('.orientation-gate'))")) await click('Mở toàn màn hình');
  await wait("!document.querySelector('.orientation-gate')", 'mobile landscape admission');
  await delay(500);
  const image = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(output + '/mobile-spillKit.png', Buffer.from(image.data, 'base64'));
  check(errors.length === 0, 'no runtime exceptions during bare/gloved/tool transitions');
  await writeFile(output + '/audit.json', JSON.stringify({ passed: true, checks, snapshots, errors }, null, 2));
} catch (error) {
  await writeFile(output + '/audit.json', JSON.stringify({ passed: false, checks, snapshots, errors, error: String(error) }, null, 2));
  throw error;
} finally {
  socket.close();
  await fetch(cdp + '/json/close/' + target.id);
}
