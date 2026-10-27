import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { PourController } from '../controller/PourController';
import { TransitStreamGeometry } from './transitGeometry';
import { pourAudio } from '../audio/PourAudio';
import { occupiedLiquidVolume } from '../../handling/solidOccupancy';
import { vfxBus } from '../../vfx/bus';
import { getVesselProfile } from '../physics/profiles';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { WallFilmGeometry } from './wallFilmGeometry';

const RIPPLE_COUNT = 8;

export const PourTransitRenderer = React.memo(function PourTransitRenderer() {
  const geometry = useMemo(() => new TransitStreamGeometry(), []);
  const wallGeometry = useMemo(() => new WallFilmGeometry(), []);
  const stream = useRef<THREE.Mesh>(null);
  const wall = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const impacts = useRef<{ point: [number, number, number]; color: string; time: number; radius: number }[]>([]);
  const sounding = useRef(false);
  const lastImpact = useRef(-Infinity);
  const epoch = useRef(useAppStore.getState().pourEpoch);
  const rendered = useRef<{ parcels: unknown; vessels: unknown }>({ parcels: null, vessels: null });

  useEffect(() => {
    const unsubscribe = vfxBus.on('pour:impact', event => {
      const session = PourController.getSession();
      if (session && ['STOCK_BOTTLE', 'DROPPER', 'SOLID'].includes(session.mode)) return;
      const now = PourController.getSimulationTime();
      const target = Object.values(useAppStore.getState().vessels).find(v => v.volume_ml > 0
        && Math.abs(v.position[1] + vesselLiquidSurfaceY(v) - event.position[1]) < 0.02
        && Math.hypot(v.position[0] - event.position[0], v.position[2] - event.position[2])
          < getVesselProfile(v.type, v.capacity_ml).r(event.position[1] - v.position[1]));
      if (!target) return;
      const margin = getVesselProfile(target.type, target.capacity_ml).r(event.position[1] - target.position[1])
        - Math.hypot(target.position[0] - event.position[0], target.position[2] - event.position[2]);
      impacts.current.push({ point: event.position, color: event.color ?? '#ffffff', time: now,
        radius: Math.min(0.18, Math.max(0.004, margin * 0.9)) });
      if (impacts.current.length > RIPPLE_COUNT) impacts.current.shift();
      lastImpact.current = now;
    });
    return () => { unsubscribe(); geometry.dispose(); wallGeometry.dispose(); if (sounding.current) pourAudio.stopPourStream(); };
  }, [geometry, wallGeometry]);

  useFrame(() => {
    const state = useAppStore.getState();
    if (epoch.current !== state.pourEpoch) {
      impacts.current = []; lastImpact.current = -Infinity; epoch.current = state.pourEpoch;
    }
    // Geometry reads the simulation's actual packet ages, including while paused.
    if (rendered.current.parcels !== state.inFlightPours) geometry.update(state.inFlightPours);
    if (rendered.current.parcels !== state.inFlightPours || rendered.current.vessels !== state.vessels) {
      wallGeometry.update(state.inFlightPours, state.vessels);
    }
    rendered.current.parcels = state.inFlightPours; rendered.current.vessels = state.vessels;
    if (stream.current) stream.current.visible = geometry.drawRange.count > 0 && state.inFlightPours.length > 0;
    if (wall.current) wall.current.visible = wallGeometry.drawRange.count > 0 && state.inFlightPours.length > 0;
    const now = PourController.getSimulationTime();
    const audible = !state.isSimulationPaused && now - lastImpact.current < 0.12;
    if (audible && !sounding.current) { pourAudio.startPourStream(320); sounding.current = true; }
    if (!audible && sounding.current) { pourAudio.stopPourStream(); sounding.current = false; }
    const session = PourController.getSession();
    const target = session?.targetId ? state.vessels[session.targetId] : null;
    if (audible && target) pourAudio.updateFillRatio(occupiedLiquidVolume(target) / target.capacity_ml, session?.flow_ml_s ?? 0);
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const mesh = rings.current[i], impact = impacts.current[i];
      if (!mesh) continue;
      const age = impact ? now - impact.time : Infinity;
      mesh.visible = age >= 0 && age < 0.35;
      if (!mesh.visible || !impact) continue;
      const progress = age / 0.35, radius = impact.radius * (0.15 + 0.85 * progress);
      mesh.position.set(impact.point[0], impact.point[1] + 0.003, impact.point[2]);
      mesh.scale.set(radius, radius, 1);
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.color.set(impact.color); material.opacity = 0.45 * (1 - progress);
    }
  });

  return <group name="finite_pour_transport">
    <mesh ref={stream} geometry={geometry} visible={false} frustumCulled={false} renderOrder={6}>
      <meshPhysicalMaterial color="#ffffff" vertexColors roughness={0.06} clearcoat={1}
        transmission={0.45} ior={1.333} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh ref={wall} geometry={wallGeometry} visible={false} frustumCulled={false} renderOrder={6}>
      <meshPhysicalMaterial color="#ffffff" vertexColors roughness={0.08} clearcoat={1}
        transmission={0.65} ior={1.333} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {Array.from({ length: RIPPLE_COUNT }, (_, i) => <mesh key={i} ref={node => { rings.current[i] = node; }}
      rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={5}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>)}
  </group>;
});
