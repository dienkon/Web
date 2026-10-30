import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveFilm, SHOT_SECONDS, useFilmCaption } from '../../../data/cinematics';
import { useStore } from '../../../store/useStore';
import { fireSimulation } from '../../../core/fire/FireSim';
import { inputManager } from '../../../systems/input/InputManager';
import { PlayerModel } from '../PlayerModel';
import { ReagentBottleAsset } from '../assets/LabwareAssets';
import type { CinematicId, PlayerState, CharacterProfile } from '../../../types';
import { getCinematicBlocking } from '../../../data/scene/cinematicBlocking';
import { useReducedLabMotion } from '../../../systems/device/useReducedLabMotion';

const NPC_PPE: PlayerState = {
  equipment: { hasGoggles: true, hasLabCoat: true, hasGloves: true, hasMask: false, hairTied: true, hasClosedShoes: true },
  inventory: {}, flags: {},
};
const MINH: CharacterProfile = { name: 'Minh', gender: 'male', skinTone: '#edc4a3', hairStyle: 'short', hairColor: '#252326', shirtColor: '#0284c7' };
const LAN: CharacterProfile = { name: 'Lan', gender: 'female', skinTone: '#f2cdb8', hairStyle: 'ponytail', hairColor: '#332924', shirtColor: '#d97706' };

export function LabCinematic({ id }: { id: CinematicId }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const shotIndex = useRef(-1);
  const actor = useRef<THREE.Group>(null);
  const friend = useRef<THREE.Group>(null);
  const bottle = useRef<THREE.Group>(null);
  const initial = useRef({ position: camera.position.clone(), rotation: camera.quaternion.clone(), fov: (camera as THREE.PerspectiveCamera).fov });
  const target = useRef(new THREE.Vector3());
  const from = useRef(new THREE.Vector3());
  const to = useRef(new THREE.Vector3());
  const reduced = useReducedLabMotion();
  const caption = useFilmCaption(s => s.shot);
  const film = resolveFilm(id);
  const center = film.shots[0].target;
  const blocking = getCinematicBlocking(id);
  const initialLook=useRef(camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(camera.position.distanceTo(new THREE.Vector3(...center)))));
  const lookFrom=useRef(new THREE.Vector3());
  useEffect(() => {
    const saved = initial.current;
    inputManager.resetAll();
    if (document.pointerLockElement) document.exitPointerLock();
    useFilmCaption.setState({ id, shot: 0 });
    return () => {
      camera.position.copy(saved.position); camera.quaternion.copy(saved.rotation);
      if (camera instanceof THREE.PerspectiveCamera) { camera.fov = saved.fov; camera.updateProjectionMatrix(); }
      inputManager.resetAll();
    };
  }, [camera, id]);

  useFrame((_, delta) => {
    if (document.hidden || useStore.getState().runState !== 'RUNNING') return;
    elapsed.current += Math.min(delta, .1);
    const t = elapsed.current;
    const index = Math.min(film.shots.length - 1, Math.floor(t / SHOT_SECONDS));
    const shot = film.shots[index];
    const previous = film.shots[Math.max(0, index - 1)];
    const progress = THREE.MathUtils.smoothstep((t % SHOT_SECONDS) / SHOT_SECONDS, 0, 1);
    if (shotIndex.current !== index) {
      shotIndex.current = index;
      useFilmCaption.setState({ id, shot: index });
    }
    if (index === 0) from.current.copy(initial.current.position);
    else from.current.set(...previous.position);
    to.current.set(...shot.position);
    camera.position.copy(reduced ? to.current : from.current.lerp(to.current, progress));
    if(index===0)lookFrom.current.copy(initialLook.current);else lookFrom.current.set(...previous.target);
    target.current.set(...shot.target);
    camera.lookAt(reduced?target.current:lookFrom.current.lerp(target.current,progress));
    if (camera instanceof THREE.PerspectiveCamera) { camera.fov=index===0&&!reduced?THREE.MathUtils.lerp(initial.current.fov,52,progress):52; camera.updateProjectionMatrix(); }
    const movement=reduced?1:THREE.MathUtils.smoothstep(t,...blocking.move);
    // The middle shot is an equipment insert; narration continues off screen.
    const showActors=!(id.startsWith('scenario:')&&index===1);
    if (actor.current) {
      actor.current.visible=showActors;
      actor.current.position.set(center[0]+THREE.MathUtils.lerp(blocking.start[0],blocking.end[0],movement),0,center[2]+THREE.MathUtils.lerp(blocking.start[1],blocking.end[1],movement));
      actor.current.lookAt(center[0],0,center[2]);
    }
    if (friend.current) {
      friend.current.visible=showActors;
      friend.current.position.set(center[0]+blocking.friend[0],0,center[2]+blocking.friend[1]);
      friend.current.lookAt(center[0],0,center[2]);
    }
    if (bottle.current) {
      bottle.current.rotation.z = -THREE.MathUtils.smoothstep(t, 5.5, 7.5) * 1.45;
      bottle.current.position.x = center[0]+.068+THREE.MathUtils.smoothstep(t,5.5,8)*.25;
    }
    if (id === 'fire' && t >= 9 && !fireSimulation.sources.some(f => f.id === 'bench_fire_b')) {
      fireSimulation.spawnFire('bench_fire_b', 'B', [4.2, .95, -2.2]);
    }
    if (t >= film.shots.length * SHOT_SECONDS) useStore.getState().finishCinematic();
  });
  return <group name={`cinematic-${id}`}>
    <group ref={actor}><PlayerModel position={[0, 0, 0]} rotationY={0} isMoving={!reduced&&caption*SHOT_SECONDS>=blocking.move[0]&&caption*SHOT_SECONDS<blocking.move[1]&&(blocking.start[0]!==blocking.end[0]||blocking.start[1]!==blocking.end[1])} gesture={caption<2?blocking.gesture:undefined} player={NPC_PPE} character={MINH} /></group>
    <group ref={friend}><PlayerModel position={[0, 0, 0]} rotationY={0} isMoving={false} gesture={caption<2?blocking.friendGesture:undefined} player={NPC_PPE} character={LAN} /></group>
    {id === 'fire' && <group ref={bottle} position={[4.268,.901,-1.65]}>
      <group position={[-.068,0,0]}><ReagentBottleAsset amber/></group>
    </group>}
  </group>;
}
