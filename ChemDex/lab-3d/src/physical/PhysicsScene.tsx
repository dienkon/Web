import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, Quaternion } from 'three';
import { useAppStore } from '../store/useAppStore';
import { usePhysicsStore, capturePhysicalLab } from './usePhysicsStore';
import { PhysicsClient } from './PhysicsClient';
import { inputFromVessel } from './sceneAdapter';
import { scenePointToSI, siPointToScene, metersToScene } from '../science/sceneUnits';
import { materialProperties } from './materials';
import { PourController } from '../pour/controller/PourController';
import type { Quat, SimulationCommand, SimulationSnapshot } from './types';
import { evaluateDropImpact } from '../damage/DamageModel';
import { CONSTANTS } from '../core/units';
import { acceptedFrameSeconds } from '../core/clock';
import { seedForLabel } from '../core/rng';
import { debounceSaveLocalState } from '../store/persistence';
import { vesselTareG } from '../core/labGeometry';
import { shardManager } from '../damage/Shards';
import { gravityPour } from './gravityPour';

/** Only the bridge mutates persisted poses; renderers read/interpolate them. */
export function PhysicsScene() {
  const enabled = usePhysicsStore(s => s.enabled), revision = usePhysicsStore(s => s.revision);
  const client = useRef<PhysicsClient | null>(null), busy = useRef(false), pending = useRef(0);
  const held = useRef(new Set<string>()), lastPositions = useRef(new Map<string, string>());
  const ready = useRef(false), generation = useRef(0);
  const targets = useRef(new Map<string, { position: [number, number, number]; rotation: Quat }>());
  const experimentInputs = useRef(new Map<string, object>());
  const previouslyDragged = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const epoch = ++generation.current;
    ready.current = false; pending.current = 0; busy.current = false; held.current.clear(); lastPositions.current.clear(); targets.current.clear();
    experimentInputs.current.clear();
    const accept = (snapshot: SimulationSnapshot) => {
      if (epoch !== generation.current || revision !== usePhysicsStore.getState().revision || !usePhysicsStore.getState().enabled) return;
      const ui = usePhysicsStore.getState();
      usePhysicsStore.setState({ previous: ui.snapshot ?? snapshot, snapshot, receivedAt: performance.now(), status: 'running' });
      const app = useAppStore.getState(), vessels = { ...app.vessels };
      let changed = false;
      for (const o of snapshot.objects) {
        const v = vessels[o.id]; if (!v || v.isShattered) continue;
        const e = new Euler().setFromQuaternion(new Quaternion(...o.rotation), 'YXZ');
        const position = siPointToScene(o.position_m);
        const manipulating = app.draggingVesselId === o.id || PourController.getSession()?.sourceId === o.id;
        const dynamicSolids = (snapshot.fluidForces ?? []).filter(f => f.ownerId === o.id && f.solid).map(f => f.solid!);
        const dynamicLoad_g = (snapshot.fluidForces ?? []).filter(f => f.ownerId === o.id).reduce((load, f) => {
          const pose = snapshot.objects.find(p => p.id === f.id), input = ui.expansions.find(p => p.id === f.id);
          return load + (pose?.contacts.includes(o.id) && !pose.held && input
            ? (input.definition.mass_kg + input.contentsMass_kg) * 1000 : f.buoyancy_N / CONSTANTS.g * 1000);
        }, 0);
        vessels[o.id] = { ...v, ...(manipulating ? {} : { position, rotationY: e.y, rotationZ: e.z }),
          dynamicSolids, dynamicLoad_g,
          physicalMotion: { rotation: o.rotation, velocity_m_s: o.velocity_m_s, angularVelocity_rad_s: o.angularVelocity_rad_s, tick: snapshot.tick } };
        if (!manipulating) lastPositions.current.set(o.id, JSON.stringify([position, e.y, e.z]));
        changed = true;
      }
      if (changed) useAppStore.setState({ vessels });
      const elapsed = Math.max(0, (snapshot.tick - (ui.snapshot?.tick ?? snapshot.tick)) / 120);
      if (elapsed > 0 && !app.isSimulationPaused) for (const o of snapshot.objects) {
        const live = useAppStore.getState(), v = live.vessels[o.id];
        if (!v || PourController.getSession()?.sourceId === o.id || live.vesselPourAnimation?.fromId === o.id) continue;
        const release = gravityPour(v, Object.values(live.vessels), elapsed, snapshot.tick);
        if (release) live.releasePourLiquid(release.draft, release.released_ml);
      }
      const unique = new Map<string, SimulationSnapshot['impacts'][number]>();
      for (const impact of snapshot.impacts) if ((unique.get(impact.id)?.energy_J ?? -1) < impact.energy_J) unique.set(impact.id, impact);
      for (const [id, impact] of unique) {
        const v = useAppStore.getState().vessels[id]; if (!v || v.isShattered || v.type === 'wash_bottle') continue;
        const mass = (vesselTareG(v.type, v.tare_g) + v.mass_g) / 1000;
        const material = ['crucible', 'evaporating_dish', 'mortar_pestle'].includes(v.type) ? 'porcelain' : 'borosilicate';
        const damage = evaluateDropImpact(impact.energy_J / (mass * CONSTANTS.g), mass, material, impact.surface, seedForLabel(`${id}:${snapshot.tick}`));
        if (damage.shattered) useAppStore.getState().shatterVessel(id, 'Va chạm cơ học (mô hình sức bền ước lượng)');
      }
    };
    const c = new PhysicsClient(accept, error => {
      if (epoch === generation.current) usePhysicsStore.setState({ status: 'error', error });
    });
    client.current = c;
    const saved = usePhysicsStore.getState();
    c.initialize(saved.seed, saved.resumeTick).then(() => { if (epoch === generation.current) ready.current = true; }).catch(() => {});
    return () => {
      const state = usePhysicsStore.getState();
      if (state.enabled && state.revision === revision) {
        const saved = capturePhysicalLab();
        usePhysicsStore.setState({ expansions: saved.expansions, experiments: saved.experiments ?? [], resumeTick: saved.tick });
      }
      generation.current++; ready.current = false; c.dispose(); if (client.current === c) client.current = null;
    };
  }, [enabled, revision]);

  useFrame((_, delta) => {
    const c = client.current, app = useAppStore.getState(), ui = usePhysicsStore.getState();
    if (!enabled || !ready.current || !c || ui.status === 'error') return;
    if (!app.isSimulationPaused) pending.current += acceptedFrameSeconds(delta);
    if (busy.current || (pending.current < 1 / 30 && !app.isSimulationPaused && ui.snapshot)) return;
    const inputs = Object.values(app.vessels).map(inputFromVessel).filter(v => v !== null);
    inputs.push(...ui.expansions);
    const commands: SimulationCommand[] = [c.command({ kind: 'sync', bodies: inputs })];
    for (const experiment of ui.experiments) if (experimentInputs.current.get(experiment.id) !== experiment) {
      commands.push(c.command({ kind: 'experiment', experiment })); experimentInputs.current.set(experiment.id, experiment);
    }
    const nextHeld = new Set<string>(), session = PourController.getSession();
    if (previouslyDragged.current && previouslyDragged.current !== app.draggingVesselId
      && session?.sourceId !== previouslyDragged.current) targets.current.delete(previouslyDragged.current);
    previouslyDragged.current = app.draggingVesselId;
    for (const input of inputs) {
      const v = app.vessels[input.id]; if (!v) continue;
      const poseKey = JSON.stringify([v.position, v.rotationY, v.rotationZ ?? 0]);
      const previousKey = lastPositions.current.get(input.id);
      const existingTarget = targets.current.get(input.id);
      const pose = ui.snapshot?.objects.find(o => o.id === input.id);
      if (existingTarget && pose && app.draggingVesselId !== input.id && session?.sourceId !== input.id
        && Math.hypot(...pose.position_m.map((x, i) => x - existingTarget.position[i])) < 0.0005) targets.current.delete(input.id);
      if (app.draggingVesselId === input.id || session?.sourceId === input.id || (previousKey !== undefined && previousKey !== poseKey)) {
        const q = new Quaternion().setFromEuler(new Euler(0, v.rotationY ?? 0, v.rotationZ ?? 0, 'YXZ'));
        const p = session?.sourceId === input.id && session.sourcePos ? session.sourcePos : v.position;
        if (session?.sourceId === input.id) q.setFromEuler(new Euler(0, v.rotationY ?? 0, session.sourceRotationZ ?? -session.tilt, 'YXZ'));
        targets.current.set(input.id, { position: scenePointToSI([p[0], p[1] + (app.draggingVesselId === input.id ? 0.35 : 0), p[2]]), rotation: q.toArray() as Quat });
        lastPositions.current.set(input.id, poseKey);
      }
      const target = targets.current.get(input.id);
      if (target) { commands.push(c.command({ kind: 'hold', id: input.id, target_m: target.position, rotation: target.rotation })); nextHeld.add(input.id); }
    }
    for (const id of held.current) if (!nextHeld.has(id)) commands.push(c.command({ kind: 'release', id }));
    held.current = nextHeld;
    let seconds = app.isSimulationPaused ? 0 : pending.current;
    pending.current = 0;
    do {
      const slice = Math.min(0.1, seconds);
      commands.push(c.command({ kind: 'advance', seconds: slice, timeScale: app.timeScale, paused: app.isSimulationPaused }));
      seconds -= slice;
    } while (seconds > 1e-9);
    busy.current = true;
    c.batch(commands).catch(() => {}).finally(() => { if (client.current === c) busy.current = false; });
  }, -3.5);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const s = useAppStore.getState();
      // Full specimen and pose are saved together; the existing material snapshot
      // argument is supplied so motion autosave cannot erase in-flight matter.
      debounceSaveLocalState(s.vessels, s.burners, { inFlightPours: s.inFlightPours, spills: s.spills,
        wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents, workbenchEscapedGas_g: s.workbenchEscapedGas_g,
        pipetteSample: s.pipetteSample, glassDebris: shardManager.snapshot(), physics: capturePhysicalLab() });
    }, 2000);
    return () => clearInterval(timer);
  }, [enabled]);
  return <ExpansionBodies />;
}

function ExpansionBodies() {
  const enabled = usePhysicsStore(s => s.enabled), expansions = usePhysicsStore(s => s.expansions);
  const snapshot = usePhysicsStore(s => s.snapshot);
  if (!enabled) return null;
  return <>{expansions.map(input => {
    const pose = snapshot?.objects.find(o => o.id === input.id), d = input.definition, m = materialProperties(d.materialId);
    return <mesh key={input.id} name={`physical_sample_${input.id}`} position={siPointToScene(pose?.position_m ?? input.position_m)}
      quaternion={pose?.rotation ?? input.rotation} castShadow receiveShadow>
      <boxGeometry args={d.dimensions_m.map(metersToScene) as [number, number, number]} />
      <meshStandardMaterial color={m.color} roughness={0.3} metalness={['steel', 'aluminum'].includes(m.id) ? 0.75 : 0}
        transparent={['ice', 'borosilicate'].includes(m.id)} opacity={['ice', 'borosilicate'].includes(m.id) ? 0.65 : 1} />
    </mesh>;
  })}</>;
}
