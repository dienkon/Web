import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { vesselBodyTransform } from '../../science/vesselScale';
import { renderedVesselBody } from './vesselBodyFrames';
import { FRAME_ORDER } from '../core/frameOrder';

/** Effects use the actual glass hierarchy, including live pour/drag/preview
 * poses. They never register another body or overwrite the original frame. */
export function VesselEffectsFrame({ vessel, children }: { vessel: VesselState; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const fallback = vesselBodyTransform(vessel);
  useFrame(() => {
    const target = group.current, body = renderedVesselBody(vessel.id);
    if (!target) return;
    if (body) {
      target.parent?.updateWorldMatrix(true, false);
      target.matrix.copy(target.parent?.matrixWorld ?? new THREE.Matrix4()).invert().multiply(body.matrixWorld);
    } else {
      target.position.set(0, fallback.offsetY, 0); target.scale.setScalar(fallback.scale);
      target.quaternion.identity(); target.updateMatrix();
    }
    target.updateWorldMatrix(false, true);
  }, FRAME_ORDER.effectsFrame);
  return <group ref={group} name={`vessel_effect_frame_${vessel.id}`} matrixAutoUpdate={false}>{children}</group>;
}
