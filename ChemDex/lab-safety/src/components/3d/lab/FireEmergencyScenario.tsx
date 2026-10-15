import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneHtml as Html } from '../SceneHtml';
import { playerCoords, useStore } from '../../../store/useStore';
import { fireSimulation } from '../../../core/fire/FireSim';
import { ExtinguisherStream } from '../fx/ExtinguisherStream';
import { toolControls } from '../../../systems/input/toolControls';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { interactionBus, INTERACTION_PRIORITY } from '../../../systems/input/InteractionBus';
import { spatialSound } from '../../../audio/SpatialSoundEngine';

export const FIRE_ORIGIN: [number, number, number] = [4.2, 0.95, -2.2];
export function pullTrainingPin() {
  const s = useStore.getState();
  if (isSceneInputBlocked(s) || s.activeTool !== 'extinguisher' || !s.player.inventory.hasFireExtinguisher || !s.player.flags.passTrained) return false;
  const pulled=fireSimulation.pullPin();
  if(pulled)spatialSound.playAt('snap',[...playerCoords.position]);
  return pulled;
}
export const FireEmergencyScenario = () => {
  const { camera, gl } = useThree();
  const phase = useStore(s => s.currentPhase);
  const tasks = useStore(s => s.tasks);
  const view = useStore(s => s.view);
  const cinematic = useStore(s => s.cinematic);
  const trained = useStore(s => !!s.player.flags.passTrained);
  const introSeen = useStore(s => !!s.player.flags.fireIntroSeen);
  const done = !!tasks.find(t => t.id === 'task_fire_extinguisher')?.completed;
  const [status, setStatus] = useState({ intensity: 0.8, spraying: false });
  const sample = useRef(0);
  const sweep = useRef(0);
  const lastDirection = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const ray = useRef(new THREE.Ray());
  const base = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -FIRE_ORIGIN[1]));
  useEffect(() => {
    if (view !== 'game' || phase !== 2 || done || !trained) return;
    if (!introSeen) {
      if (!isSceneInputBlocked()) useStore.getState().startCinematic('fire');
      return;
    }
    if (!fireSimulation.sources.some(s => s.id === 'bench_fire_b')) fireSimulation.spawnFire('bench_fire_b', 'B', FIRE_ORIGIN);
    if (!fireSimulation.currentExtinguisher) fireSimulation.equipExtinguisher('co2');
    sweep.current = 0;
  }, [phase, done, view, trained, introSeen, cinematic]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === 'KeyR' && !(e.target instanceof Element && e.target.closest('input,textarea'))) pullTrainingPin(); };
    const down = (e: PointerEvent) => {
      if (e.button === 0 && !isSceneInputBlocked() && useStore.getState().activeTool === 'extinguisher') toolControls.spraying = true;
    };
    const release = () => { toolControls.spraying = false; };
    window.addEventListener('keydown', key); gl.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); window.addEventListener('blur', release);
    const off = interactionBus.subscribe({ priority: INTERACTION_PRIORITY.TARGET + 10, isActive: () => {
      const state = useStore.getState();
      return state.currentPhase === 2 && !state.tasks.find(t => t.id === 'task_fire_extinguisher')?.completed
        && !isSceneInputBlocked(state) && state.activeTool === 'extinguisher'
        && !!fireSimulation.currentExtinguisher && !fireSimulation.currentExtinguisher.pinPulled;
    }, onInteract: pullTrainingPin });
    return () => { window.removeEventListener('keydown', key); gl.domElement.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); window.removeEventListener('blur', release); off(); release(); spatialSound.stopExtinguisherHiss(); spatialSound.setFire(false,0,FIRE_ORIGIN); };
  }, [gl]);
  useFrame((_, delta) => {
    const s = useStore.getState(), ext = fireSimulation.currentExtinguisher;
    const source = fireSimulation.sources.find(f => f.id === 'bench_fire_b');
    const activeFire = s.view === 'game' && !isSceneInputBlocked(s) && phase === 2 && !done && !!source;
    spatialSound.setFire(activeFire, source?.cells[0]?.intensity ?? 0, FIRE_ORIGIN);
    if (!activeFire) { toolControls.spraying = false; if(ext)ext.isDischarging=false; spatialSound.stopExtinguisherHiss(); return; }
    if (!ext || !source) return;
    const dt = Math.min(delta, 0.05);
    for (const cell of source.cells) cell.fuelLeft = Math.max(0.1, cell.fuelLeft);
    const spraying = !!s.player.flags.passTrained && !!s.player.inventory.hasFireExtinguisher && !isSceneInputBlocked(s) && s.activeTool === 'extinguisher' && toolControls.spraying && ext.pinPulled && ext.agentLeft > 0;
    ext.isDischarging = spraying;
    if (isSceneInputBlocked(s)) toolControls.spraying = false;
    camera.getWorldDirection(direction.current);
    if (spraying) {
      spatialSound.startExtinguisherHiss();
      const angle = lastDirection.current.lengthSq() ? lastDirection.current.angleTo(direction.current) : 0;
      sweep.current += Math.min(angle, 0.1);
      ray.current.set(camera.position, direction.current);
      const hit = ray.current.intersectPlane(base.current, target.current);
      const inRange = hit && camera.position.distanceTo(hit) <= 4.5 && Math.hypot(hit.x - FIRE_ORIGIN[0], hit.z - FIRE_ORIGIN[2]) < 0.8;
      const point = inRange ? target.current : target.current.set(100, 100, 100);
      fireSimulation.dischargeAtTarget([point.x, point.y, point.z], !!inRange, Math.min(1, sweep.current / 0.18), dt);
      if (sweep.current < 0.04) for (const cell of source.cells) cell.intensity = Math.max(0.06, cell.intensity);
    } else spatialSound.stopExtinguisherHiss();
    lastDirection.current.copy(direction.current);
    const intensity = Math.max(...source.cells.map(c => c.intensity));
    sample.current += dt;
    if (sample.current >= 0.1) { sample.current = 0; setStatus({ intensity: Math.round(intensity * 100) / 100, spraying }); }
    if (intensity <= 0.05 && sweep.current >= 0.04 && !s.tasks.find(t => t.id === 'task_fire_extinguisher')?.completed) {
      toolControls.spraying = false; ext.isDischarging = false;
      spatialSound.stopExtinguisherHiss(); spatialSound.setFire(false,0,FIRE_ORIGIN);
      useStore.setState({ player: { ...s.player, flags: { ...s.player.flags, fireExtinguished: true } } });
      s.completeTask('task_fire_extinguisher'); s.selectTool(null);
      s.startDialog(['Đám cháy đã được dập tắt bằng thao tác thực hành. Tiếp tục nhiệm vụ nhận diện nhãn hóa chất.']);
    }
  });
  if (view !== 'game' || phase !== 2 || done) return null;
  return <group>
    <ExtinguisherStream isDischarging={status.spraying && !isSceneInputBlocked()} />
    <Html position={[4.2, 1.65, -2.2]} center>
      <div className="rounded-xl bg-white/95 border border-orange-200 px-3 py-2 text-xs text-slate-800 shadow-sm">
        <strong>Đám cháy · {Math.round(status.intensity * 100)}%</strong>
        <div className="mt-1 h-1.5 rounded bg-orange-100"><div className="h-full rounded bg-orange-500" style={{ width: `${status.intensity * 100}%` }} /></div>
      </div>
    </Html>
  </group>;
};
