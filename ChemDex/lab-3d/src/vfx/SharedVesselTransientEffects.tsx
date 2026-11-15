import React from 'react';
import { useVesselVisualRuntime, useVesselVisualState } from '../simulation/render/VesselVisualContext';
import { VesselEffectsFrame } from '../simulation/render/VesselEffectsFrame';
import { vesselBodyTransform } from '../science/vesselScale';
import { vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';
import { LAB_PHYSICS } from '../engine/interactionEngine';
import { Sparks } from './particles/Sparks';
import { Foam } from './particles/Foam';
import { getReactionVfxRecipe, sampleRecipeProgress, type ReactionVfxRecipe } from './recipes/reactionVfx';
import { getGenericVfxRecipe } from './recipes/generic';
import { reactionIsEmitting, resolveReactionEmission } from './reactionActivity';
import { reactionSimulationEngine } from './reactions/ReactionSimulationEngine';

/** The same read-only per-vessel effects in either scene. Chemistry, manager
 * stepping, room exhaust and global event pools remain with their scene owner.
 * `body` mounts under the shared glass-body transform; `scene` mounts at the
 * vessel's unscaled world position, as the manual director does. */
export function SharedVesselTransientEffects({ vesselId, recipe, frame = 'scene' }: {
  vesselId: string; recipe?: ReactionVfxRecipe; frame?: 'scene' | 'body';
}) {
  const runtime = useVesselVisualRuntime();
  const vessel = useVesselVisualState(state => state.vessels[vesselId]);
  const kinetics = useVesselVisualState(state => state.activeKinetics[vesselId]);
  const paused = useVesselVisualState(state => state.isSimulationPaused);
  if (!vessel || vessel.isShattered) return null;
  const activeRecipe = recipe ?? (kinetics?.reactionId ? getReactionVfxRecipe(kinetics.reactionId) : null)
    ?? getGenericVfxRecipe(null, vessel);
  const sampled = sampleRecipeProgress(activeRecipe, kinetics?.progress ?? 1);
  const emission = resolveReactionEmission(vessel, kinetics, paused);
  const controller = runtime?.externallyStepped ? undefined : reactionSimulationEngine.getRuntime(vesselId);
  const hasSparks = reactionIsEmitting(kinetics) && (activeRecipe.sparks?.active || !!controller?.customData?.hasSparks);
  const foamRate = vessel.volume_ml > 0.5 && emission.running
    ? sampled.foamRate > 0 ? sampled.foamRate : activeRecipe.foam?.active ? 20 : 0 : 0;
  const body = vesselBodyTransform(vessel);
  const foam = ((vessel.foam_ml ?? 0) > 0.05 || foamRate > 0)
    ? <Foam vesselId={vesselId} capacity_ml={vessel.capacity_ml} active /> : null;
  const sceneEffects = <>
    {hasSparks && <Sparks origin={[0, vesselWorldLiquidSurfaceY(vessel), 0]}
      groundY={(runtime?.benchY ?? LAB_PHYSICS.TABLE_SURFACE_Y) - vessel.position[1]}
      rate={activeRecipe.sparks?.rate || 30} burstCount={activeRecipe.sparks?.burstCount || 15}
      color={activeRecipe.sparks?.color || (controller?.customData?.sparkColor as string) || '#f59e0b'} active />}
    {activeRecipe.specialEffect === 'frost' && vessel.temperature_c <= 0 && <mesh renderOrder={5} name={`vessel-frost-${vesselId}`}>
      <cylinderGeometry args={[0.99, 0.99, 1.8, 24, 1, true]} />
      <meshStandardMaterial color="#e0f2fe" roughness={0.9} metalness={0.1} transparent opacity={0.55} depthWrite={false} />
    </mesh>}
  </>;
  return <group name={`vessel-transient-effects-${vesselId}`}>
    {frame === 'body'
      ? <>{foam}<group position={[0, -body.offsetY / body.scale, 0]} scale={1 / body.scale}>{sceneEffects}</group></>
      : <>{foam && <VesselEffectsFrame vessel={vessel}>{foam}</VesselEffectsFrame>}{sceneEffects}</>}
  </group>;
}
