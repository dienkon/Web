import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../store/useAppStore';
import { acceptedFrameSeconds } from '../core/clock';
import { stockContainer, stockGroup } from './stockAdapter';
import { pendingStockContacts, acknowledgeStockContacts } from './stockContacts';
import { escapeStockGrain } from './stockEscape';
import type { StockBoundaryFrame, StockWorldSnapshot, StockSpillPose } from './stockTypes';
import { siPointToScene, scenePointToSI } from '../science/sceneUnits';
import { continueReactionAfterOutflow } from '../engine/reactionContinuation';
import { prepareStockAddition } from '../engine/stockAddition';
import { findChemical } from '../data/chemicals';
import { reactAliquotMixture } from '../engine/aliquotReaction';
import { mergeWorkbenchSpill } from '../engine/spillInventory';
import { PourController } from '../pour/controller/PourController';
import { usePhysicsStore } from './usePhysicsStore';
import { capturePhysicalLab } from './usePhysicsStore';
import { debounceSaveLocalState } from '../store/persistence';
import { shardManager } from '../damage/Shards';
import { isSuspensionRow } from '../science/precipitateInventory';
import { renderedVesselBody } from '../simulation/render/vesselBodyFrames';
import { Euler, Quaternion, Vector3 } from 'three';
import type { Quat, Vec3 } from './types';
import { publishStockPresentation, clearStockPresentation } from './stockPresentation';

/** A lazy Worker owns stock contacts. This bridge uploads commands/snapshots;
 * it does not integrate grain motion in a render callback. */
export function StockMechanicsScene() {
  const runtime = useRef<{ worker: Worker; busy: boolean; pending: number; path: StockBoundaryFrame[]; id: number; escaped: string[]; signature: string; sentAt: number } | null>(null);
  const failure = useRef({ count: 0, retryAt: 0 }), dirty = useRef(false);
  const previousTick = useRef(0);
  const last = useRef(new Map<string, object>()), revisions = useRef(new Map<string, number>());
  const request = useRef(new Map<string, { motion: unknown; revision: number }>());
  const lastSpills = useRef(new Map<string, StockSpillPose>()), requestedSpills = useRef(new Map<string, StockSpillPose>());
  const sameTrajectory = (a: StockSpillPose | undefined, b: StockSpillPose | undefined) => a === b
    || !!a && !!b && a.position_m === b.position_m && a.rotation === b.rotation
    && a.velocity_m_s === b.velocity_m_s && a.angularVelocity_rad_s === b.angularVelocity_rad_s;
  useEffect(() => () => { runtime.current?.worker.terminate(); runtime.current = null; clearStockPresentation(); }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!dirty.current || usePhysicsStore.getState().enabled) return;
      dirty.current = false;
      const s = useAppStore.getState();
      debounceSaveLocalState(s.vessels, s.burners, { inFlightPours: s.inFlightPours, spills: s.spills,
        wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents, workbenchEscapedGas_g: s.workbenchEscapedGas_g,
        pipetteSample: s.pipetteSample, glassDebris: shardManager.snapshot(), physics: capturePhysicalLab() });
    }, 2000);
    return () => clearInterval(timer);
  }, []);
  useFrame((_, delta) => {
    const app = useAppStore.getState();
    const hasStock = Object.values(app.vessels).some(v => !v.isShattered && v.contents.some(c => c.phase === 's'
      && !['Na', 'K', 'H2O'].includes(c.formula) && c.mass_g > 1e-10 && c.location !== 'filter' && c.location !== 'foam'
      && c.solidOrigin !== 'precipitate' && !(v.volume_ml > 0.05 && isSuspensionRow(c, v.contents, v.precipitateSubstance))))
      || Object.values(app.spills).some(s => s.stockMotion);
    if (!hasStock) {
      if (runtime.current && !runtime.current.busy) { runtime.current.worker.terminate(); runtime.current = null; }
      lastSpills.current.clear(); requestedSpills.current.clear();
      return;
    }
    if (failure.current.count >= 3 || performance.now() < failure.current.retryAt) return;
    if (!runtime.current) {
      const worker = new Worker(new URL('./stock.worker.ts', import.meta.url), { type: 'module', name: 'chemdex-stock-contacts' });
      const state = { worker, busy: false, pending: 0, path: [] as StockBoundaryFrame[], id: 0, escaped: [] as string[], signature: '', sentAt: 0 }; runtime.current = state;
      const fail = (message: string) => {
        console.error('Stock mechanics:', message); worker.terminate();
        if (runtime.current === state) runtime.current = null;
        failure.current = { count: failure.current.count + 1, retryAt: performance.now() + 10000 };
      };
      worker.onmessage = (event: MessageEvent<{ snapshot?: StockWorldSnapshot; error?: string }>) => {
        if (runtime.current !== state) return;
        state.busy = false;
        if (event.data.error) { fail(event.data.error); return; }
        const snapshot = event.data.snapshot!;
        acknowledgeStockContacts(snapshot.appliedContacts);
        const live = useAppStore.getState(), vessels = { ...live.vessels }, activeKinetics = { ...live.activeKinetics };
        let spills = { ...live.spills };
        const validSpills = new Set(Object.values(spills).filter(s => s.stockMotion
          && sameTrajectory(s.stockMotion, requestedSpills.current.get(s.stockMotion.id))).map(s => s.stockMotion!.id));
        const valid = new Set<string>();
        let changed = false;
        for (const [id, v] of Object.entries(vessels)) {
          const expected = request.current.get(id);
          if (!expected || expected.motion !== v.stockMotion || expected.revision !== (v.effectSampleRevision ?? 0)) continue;
          valid.add(id);
          const grains = snapshot.grains.filter(g => g.vesselId === id && !spills[`stock_spill_${g.pose.id}`]).map(g => g.pose);
          if (!grains.length && !v.stockMotion) continue;
          const motion = { tick: snapshot.tick, grains }; last.current.set(id, motion);
          vessels[id] = { ...v, stockMotion: motion }; changed = true;
        }
        for (const escaped of snapshot.escapes) {
          const v = vessels[escaped.vesselId], expected = request.current.get(escaped.vesselId);
          if (!v || !expected || !valid.has(v.id) || expected.revision !== (v.effectSampleRevision ?? 0)) continue;
          const transfer = escapeStockGrain(v, spills, escaped.pose);
          if (transfer) { vessels[v.id] = transfer.vessel; if (transfer.vessel.stockMotion) last.current.set(v.id, transfer.vessel.stockMotion);
            const continued = continueReactionAfterOutflow(activeKinetics[v.id], transfer.vessel, live.language);
            if (continued) activeKinetics[v.id] = continued; else delete activeKinetics[v.id];
            spills[transfer.spill.id] = transfer.spill; changed = true; state.escaped.push(escaped.pose.id); }
          if (transfer) validSpills.add(escaped.pose.id);
        }
        for (const grain of snapshot.grains) {
          const id = `stock_spill_${grain.pose.id}`, spill = spills[id];
          if (spill?.stockMotion && validSpills.has(grain.pose.id)) {
            const mass = (spill.contents ?? []).filter(c => c.formula === grain.pose.formula && c.phase === 's').reduce((s, c) => s + c.mass_g, 0);
            spills[id] = { ...spill, position: siPointToScene(grain.pose.position_m), stockMotion: { ...grain.pose, mass_g: mass,
              scale_m: grain.pose.scale_m * Math.cbrt(mass / grain.pose.mass_g), vesselId: grain.vesselId } };
            lastSpills.current.set(grain.pose.id, spills[id].stockMotion!); changed = true;
          }
        }
        for (const capture of snapshot.captures) {
          const key = `stock_spill_${capture.pose.id}`, sample = spills[key], receiver = vessels[capture.vesselId];
          if (!sample?.stockMotion || !validSpills.has(capture.pose.id) || !receiver || !valid.has(receiver.id) || receiver.isSealed || receiver.isShattered) continue;
          const motion = { tick: snapshot.tick, grains: [...(receiver.stockMotion?.grains ?? []).filter(p => p.id !== capture.pose.id), { ...capture.pose, mass_g: sample.mass_g }] };
          const prepared = prepareStockAddition({ ...receiver, stockMotion: motion }, findChemical(capture.pose.formula), capture.pose.formula, sample.mass_g, sample.temperature_c ?? 25);
          if (!prepared) continue;
          const reacted = reactAliquotMixture(prepared.vessel, live.language, false);
          vessels[receiver.id] = reacted.vessel; if (reacted.vessel.stockMotion) last.current.set(receiver.id, reacted.vessel.stockMotion);
          if (reacted.kinetics) activeKinetics[receiver.id] = reacted.kinetics;
          delete spills[key]; changed = true;
          if (prepared.spill) {
            const liquid = prepared.spill;
            spills = mergeWorkbenchSpill(spills, receiver.position, liquid.volume_ml, liquid.substances, liquid.color,
              receiver.name, liquid.mass_g, liquid.contents, liquid.temperature_c, liquid.optics);
          }
        }
        if (changed) {
          const interval = live.isSimulationPaused ? 0 : Math.max(0, snapshot.tick - previousTick.current) / 120 / live.timeScale;
          publishStockPresentation([...Object.values(vessels).flatMap(v => v.stockMotion?.grains ?? []),
            ...Object.values(spills).flatMap(s => s.stockMotion ? [s.stockMotion] : [])], interval);
          useAppStore.setState({ vessels, spills, activeKinetics }); dirty.current = true;
        }
        for (const id of lastSpills.current.keys()) if (!spills[`stock_spill_${id}`]) lastSpills.current.delete(id);
        previousTick.current = snapshot.tick;
      };
      worker.onerror = error => fail(error.message);
    }
    const state = runtime.current;
    if (state.busy && performance.now() - state.sentAt > 30000) {
      console.error('Stock mechanics: worker request timed out'); state.worker.terminate(); runtime.current = null;
      failure.current = { count: failure.current.count + 1, retryAt: performance.now() + 10000 }; return;
    }
    // Legacy gesture poses include the held lift and PourController transform.
    // Read them only at the command boundary, never integrate from the mesh.
    const posedVessels = Object.values(app.vessels).map(v => {
      if (usePhysicsStore.getState().enabled) return v;
      const parent = renderedVesselBody(v.id)?.parent;
      if (!parent) return v;
      const rotation = parent.getWorldQuaternion(new Quaternion()).toArray() as Quat;
      return { ...v, position: parent.getWorldPosition(new Vector3()).toArray() as Vec3,
        physicalMotion: { tick: v.physicalMotion?.tick ?? 0, velocity_m_s: v.physicalMotion?.velocity_m_s ?? [0, 0, 0] as Vec3,
          angularVelocity_rad_s: v.physicalMotion?.angularVelocity_rad_s ?? [0, 0, 0] as Vec3, rotation } };
    });
    if (app.isSimulationPaused) { state.pending = 0; state.path.length = 0; }
    else {
      const seconds = acceptedFrameSeconds(delta) * app.timeScale;
      state.pending += seconds;
      if (seconds > 0) state.path.push({ seconds, containers: posedVessels.map(v => ({ id: v.id,
        position_m: scenePointToSI(v.position), rotation: v.physicalMotion?.rotation
          ?? new Quaternion().setFromEuler(new Euler(0, v.rotationY ?? 0, v.rotationZ ?? 0, 'YXZ')).toArray() as Quat })) });
    }
    if (state.busy || !app.isSimulationPaused && state.pending < 1 / 30) return;
    const signature = JSON.stringify([posedVessels.map(v => [v.id, v.type, v.capacity_ml, v.position, v.rotationY, v.rotationZ,
      v.physicalMotion?.rotation, v.effectSampleRevision, v.contents, v.stockMotion && v.stockMotion !== last.current.get(v.id) ? v.stockMotion.tick : null]),
      Object.values(app.spills).map(s => [s.id, s.stockMotion?.mass_g,
        s.stockMotion && !sameTrajectory(s.stockMotion, lastSpills.current.get(s.stockMotion.id)) ? s.stockMotion : null]), pendingStockContacts(), PourController.getSession()?.sourcePos,
      PourController.getSession()?.sourceRotationZ, PourController.getSession()?.tilt]);
    if (app.isSimulationPaused && signature === state.signature) return;
    state.signature = signature;
    const containers = posedVessels.map(v => {
      const restore = v.stockMotion !== undefined && v.stockMotion !== last.current.get(v.id)
        || revisions.current.has(v.id) && revisions.current.get(v.id) !== (v.effectSampleRevision ?? 0);
      revisions.current.set(v.id, v.effectSampleRevision ?? 0);
      request.current.set(v.id, { motion: v.stockMotion, revision: v.effectSampleRevision ?? 0 });
      return stockContainer(v, restore);
    }).filter(v => v !== null);
    requestedSpills.current.clear();
    const spills = Object.values(app.spills).flatMap(s => {
      if (!s.stockMotion) return [];
      const p = s.stockMotion;
      requestedSpills.current.set(p.id, p);
      return [{ ...p, restore: !sameTrajectory(p, lastSpills.current.get(p.id)), group: stockGroup(p.formula, p.mass_g) ?? undefined }];
    });
    // A slow drawing frame may represent >1/30 s of accepted simulation time.
    // Advance those fixed steps together; otherwise gestures outrun the grains
    // and compress a long cup movement into a much shorter physical interval.
    const path: StockBoundaryFrame[] = []; let seconds = 0;
    while (state.path.length && (seconds + state.path[0].seconds <= 1 || !path.length)) {
      const frame = state.path.shift()!; path.push(frame); seconds += frame.seconds;
    }
    state.pending = Math.max(0, state.pending - seconds);
    state.busy = true; state.sentAt = performance.now();
    state.worker.postMessage({ id: ++state.id, input: { containers, contacts: pendingStockContacts(), spills }, path,
      paused: app.isSimulationPaused, escaped: state.escaped.splice(0) });
  }, -2.4);
  return null;
}
