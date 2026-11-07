import React from 'react';
import { useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { vesselBodyTransform } from '../../science/vesselScale';
import { registerVesselBody } from '../../simulation/render/vesselBodyFrames';
import { useFrame } from '@react-three/fiber';
import { usePhysicsStore } from '../../physical/usePhysicsStore';
import { siPointToScene } from '../../science/sceneUnits';
import { Quaternion, Vector3 } from 'three';

/** One shared transform for the glass and EVERYTHING expressed in its local
 * model coordinates: liquid, graduations, solids and physical effects. */
export function VesselBodyScale({ vessel, children }: { vessel: Pick<VesselState, 'id' | 'type' | 'capacity_ml'>; children: React.ReactNode }) {
  const { scale, offsetY } = vesselBodyTransform(vessel);
  const body = useRef<THREE.Group>(null);
  const scratch = useRef({ position: new Vector3(), a: new Quaternion(), b: new Quaternion() });
  useFrame(() => {
    const state = usePhysicsStore.getState(), parent = body.current?.parent;
    if (!state.enabled || state.status !== 'running' || !parent) return;
    const current = state.snapshot?.objects.find(o => o.id === vessel.id);
    if (!current) return;
    const previous = state.previous?.objects.find(o => o.id === vessel.id) ?? current;
    const interval = Math.max(1 / 120, (state.snapshot?.time_s ?? 0) - (state.previous?.time_s ?? 0));
    const alpha = Math.min(1, Math.max(0, (performance.now() - state.receivedAt) / 1000 / interval));
    parent.position.fromArray(siPointToScene(previous.position_m));
    scratch.current.position.fromArray(siPointToScene(current.position_m));
    parent.position.lerp(scratch.current.position, alpha);
    scratch.current.a.fromArray(previous.rotation); scratch.current.b.fromArray(current.rotation);
    parent.quaternion.copy(scratch.current.a).slerp(scratch.current.b, alpha);
  }, -2.6);
  useLayoutEffect(() => body.current ? registerVesselBody(vessel.id, body.current) : undefined, [vessel.id]);
  return <group ref={body} name={`vessel_si_body_${vessel.id}`} scale={scale} position={[0, offsetY, 0]}>{children}</group>;
}
