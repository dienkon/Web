import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { PlayerModel } from '../PlayerModel';
import { playerCoords, useStore } from '../../../store/useStore';

// A small planar reflection, updated only nearby at 30 Hz, contains the full avatar.
export function PlayerMirror() {
  const avatar = useRef<THREE.Group>(null);
  const view = useStore(s => s.view);
  const lastUpdate = useRef(-Infinity);
  const direction = useRef(new THREE.Vector3());
  const mirror = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(1.14, 2.04), { textureWidth: 512, textureHeight: 768, multisample: 2, color: 0xffffff, clipBias: 0.003 });
    r.name = 'player-mirror'; r.position.set(-0.95, 1.03, 6.80); r.rotation.y = Math.PI;
    const renderReflection = r.onBeforeRender.bind(r);
    r.userData.renderReflection = renderReflection;
    r.onBeforeRender = () => {};
    return r;
  }, []);
  useEffect(() => () => { mirror.dispose(); mirror.geometry.dispose(); }, [mirror]);
  useFrame(({ gl, scene, camera, clock }) => {
    if (view !== 'game' || !avatar.current) return;
    const distance = Math.hypot(playerCoords.position[0] + 0.95, playerCoords.position[2] - 6.8);
    if (distance > 4 || clock.elapsedTime - lastUpdate.current < 1 / 30) return;
    camera.getWorldDirection(direction.current);
    if (direction.current.z < 0.15) return;
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
    <mesh userData={{labItem:{title:'Gương kiểm tra trang phục',kind:'mirror'}}} position={[-0.95, 1.03, 6.84]}><boxGeometry args={[1.24, 2.14, 0.06]} /><meshStandardMaterial color="#cbd5e1" roughness={0.8} /></mesh>
    <primitive object={mirror} />
    <group ref={avatar} name="mirror-avatar" visible={false}>
      <PlayerModel position={[0, 0, 0]} rotationY={0} followCameraLook />
    </group>
  </group>;
}
