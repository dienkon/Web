import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveFilm, SHOT_SECONDS, useFilmCaption } from '../../../data/cinematics';
import { useStore } from '../../../store/useStore';
import { fireSimulation } from '../../../core/fire/FireSim';
import { inputManager } from '../../../systems/input/InputManager';
import { PlayerModel } from '../PlayerModel';
import type { CinematicId, PlayerState, CharacterProfile } from '../../../types';

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
  const reduced = useStore(s => s.settings.reduceMotion);
  const caption = useFilmCaption(s => s.shot);
  const film = resolveFilm(id);
  const center = film.shots[0].target;
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
    target.current.set(...shot.target); camera.lookAt(target.current);
    if (camera instanceof THREE.PerspectiveCamera) { camera.fov = 52; camera.updateProjectionMatrix(); }
    // Minh approaches the bench, knocks the bottle, then both pupils withdraw.
    const retreat = THREE.MathUtils.smoothstep(t, 9, 13.5);
    if (actor.current) actor.current.position.set(center[0], 0, center[2] + 1.1 + retreat * 1.9);
    if (friend.current) friend.current.position.set(Math.min(9.4, center[0] + 1.5), 0, center[2] + 1.9 + retreat * 1.2);
    if (bottle.current) {
      bottle.current.rotation.z = -THREE.MathUtils.smoothstep(t, 5.5, 7.5) * 1.45;
      bottle.current.position.x = center[0] + THREE.MathUtils.smoothstep(t, 5.5, 8) * .25;
    }
    if (id === 'fire' && t >= 9 && !fireSimulation.sources.some(f => f.id === 'bench_fire_b')) {
      fireSimulation.spawnFire('bench_fire_b', 'B', [4.2, .95, -2.2]);
    }
    if (t >= film.shots.length * SHOT_SECONDS) useStore.getState().finishCinematic();
  });
  return <group name={`cinematic-${id}`}>
    <group ref={actor}><PlayerModel position={[0, 0, 0]} rotationY={Math.PI} isMoving={caption === 2} gesture={caption < 2 ? 'reach' : undefined} player={NPC_PPE} character={MINH} /></group>
    <group ref={friend}><PlayerModel position={[0, 0, 0]} rotationY={-2.5} isMoving={caption === 2} gesture={caption < 2 ? 'warn' : undefined} player={NPC_PPE} character={LAN} /></group>
    {id === 'fire' && <group ref={bottle} position={[4.2, .95, -1.65]}>
      <mesh position={[0, .14, 0]}><cylinderGeometry args={[.085, .085, .28, 16]} /><meshStandardMaterial color="#b7791f" roughness={.25} /></mesh>
      <mesh position={[0, .31, 0]}><cylinderGeometry args={[.035, .035, .08, 12]} /><meshStandardMaterial color="#27272a" /></mesh>
      <mesh position={[0, .15, .086]}><planeGeometry args={[.11, .13]} /><meshStandardMaterial color="#fff7ed" /></mesh>
      <mesh position={[0, .15, .088]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[.055, .055]} /><meshBasicMaterial color="#ef4444" /></mesh>
    </group>}
  </group>;
}
