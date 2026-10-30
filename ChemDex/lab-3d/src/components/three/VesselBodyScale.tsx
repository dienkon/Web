import React from 'react';
import { useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { vesselBodyTransform } from '../../science/vesselScale';
import { registerVesselBody } from '../../simulation/render/vesselBodyFrames';

/** One shared transform for the glass and EVERYTHING expressed in its local
 * model coordinates: liquid, graduations, solids and physical effects. */
export function VesselBodyScale({ vessel, children }: { vessel: Pick<VesselState, 'id' | 'type' | 'capacity_ml'>; children: React.ReactNode }) {
  const { scale, offsetY } = vesselBodyTransform(vessel);
  const body = useRef<THREE.Group>(null);
  useLayoutEffect(() => body.current ? registerVesselBody(vessel.id, body.current) : undefined, [vessel.id]);
  return <group ref={body} name={`vessel_si_body_${vessel.id}`} scale={scale} position={[0, offsetY, 0]}>{children}</group>;
}
