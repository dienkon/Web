import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { PlayerModel } from '../PlayerModel';
import { playerCoords, useStore } from '../../../store/useStore';
import { MirrorFrameAsset } from '../assets/ScenePropAssets';
import {useCoarsePointer} from '../../../systems/device/useCoarsePointer';
import {isSceneInputBlocked} from '../../../systems/input/sceneInput';

// A small planar reflection, updated only nearby at 30 Hz, contains the full avatar.
export function PlayerMirror() {
  const avatar = useRef<THREE.Group>(null);
  const view = useStore(s => s.view);
  const quality=useStore(s=>s.settings.graphicsQuality),coarse=useCoarsePointer();
  const compact=quality==='potato'||quality==='low'||quality==='auto'&&coarse;
  const rate=quality==='potato'?12:compact?20:30;
  const lastUpdate = useRef(-Infinity);
  const frameSpacing=coarse?(quality==='potato'?4:3):2;
  const skippedFrames=useRef(0);
  const direction = useRef(new THREE.Vector3());
  const frustum=useMemo(()=>new THREE.Frustum(),[]),projection=useMemo(()=>new THREE.Matrix4(),[]);
  const mirror = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(1.14, 2.04), { textureWidth: compact?256:512, textureHeight: compact?384:768, multisample: compact?0:2, color: 0xffffff, clipBias: 0.003 });
    r.name = 'player-mirror'; r.position.set(-.8,1.14,7.115); r.rotation.y = Math.PI;
    const renderReflection = r.onBeforeRender.bind(r);
    r.userData.renderReflection = renderReflection;
    r.userData.reflectionBudget={width:compact?256:512,height:compact?384:768,rate,frameSpacing};
    r.onBeforeRender = () => {};
    return r;
  }, [compact,rate,frameSpacing]);
  useEffect(() => () => { mirror.dispose(); mirror.geometry.dispose(); }, [mirror]);
  useFrame(({ gl, scene, camera, clock }) => {
    if (view !== 'game' || !avatar.current) return;
    const state=useStore.getState();if(state.runState!=='RUNNING'||isSceneInputBlocked(state))return;
    // A weak device must retain main-view frames between reflection passes.
    // A wall-clock cap alone renders the room twice on every slow frame.
    if(++skippedFrames.current<frameSpacing)return;
    const distance = Math.hypot(playerCoords.position[0]+.8,playerCoords.position[2]-7.115);
    if (distance > 4 || clock.elapsedTime - lastUpdate.current < 1 / rate) return;
    camera.getWorldDirection(direction.current);
    if (direction.current.z < 0.15) return;
    camera.updateMatrixWorld(true);projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
    if(!frustum.intersectsObject(mirror))return;
    skippedFrames.current=0;
    lastUpdate.current = clock.elapsedTime;
    mirror.userData.updateCount = (mirror.userData.updateCount ?? 0) + 1;
    const hands = scene.getObjectByName('fps-hands');
    const handsVisible = hands?.visible;
    if (hands) hands.visible = false;
    avatar.current.visible = true;
    avatar.current.position.set(...playerCoords.position);
    avatar.current.rotation.y = Math.atan2(direction.current.x, direction.current.z);
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    try { mirror.userData.renderReflection(gl, scene, camera); }
    finally { avatar.current.visible = false; if (hands && handsVisible !== undefined) hands.visible = handsVisible; }
  });
  return <group>
    <group userData={{labItem:{title:'Gương kiểm tra trang phục',kind:'mirror'}}} position={[-.8,0,7.15]} rotation={[0,Math.PI,0]}><MirrorFrameAsset/></group>
    <primitive object={mirror} />
    <group ref={avatar} name="mirror-avatar" visible={false}>
      <PlayerModel position={[0, 0, 0]} rotationY={0} followCameraLook />
    </group>
  </group>;
}
