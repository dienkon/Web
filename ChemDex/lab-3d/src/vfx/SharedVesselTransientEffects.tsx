import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useVesselVisualRuntime, useVesselVisualState } from '../simulation/render/VesselVisualContext';
import { VesselEffectsFrame } from '../simulation/render/VesselEffectsFrame';
import { vesselBodyTransform } from '../science/vesselScale';
import { vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';
import { vesselContours } from '../science/vesselContours';
import { LAB_PHYSICS } from '../engine/interactionEngine';
import { NOISE_GLSL } from './glsl/noise.glsl';
import { Sparks } from './particles/Sparks';
import { Foam } from './particles/Foam';
import { getReactionVfxRecipe, sampleRecipeProgress, type ReactionVfxRecipe } from './recipes/reactionVfx';
import { getGenericVfxRecipe } from './recipes/generic';
import { reactionIsEmitting, resolveReactionEmission } from './reactionActivity';
import { reactionSimulationEngine } from './reactions/ReactionSimulationEngine';
import type { VesselType } from '../types/chemistry';

/** Vessel-conforming outer frost sheath for genuine sub-zero endothermic cooling.
 * Built from the same outer lathe contour as the glassware so flasks, test tubes,
 * cylinders, and beakers all frost flush to their actual walls without oversized cylinders. */
const EndothermicFrostSheath = React.memo(function EndothermicFrostSheath({
  vesselId,
  vesselType,
  temperature_c,
}: {
  vesselId: string;
  vesselType: VesselType;
  temperature_c: number;
}) {
  const { geometry, bounds } = useMemo(() => {
    const outer = vesselContours(vesselType).outer;
    const pts = outer
      .filter(([r]) => r > 0.005)
      .map(([r, y]) => new THREE.Vector2(r + 0.008, y));
    if (pts.length < 2) {
      return { geometry: null, bounds: { minY: -1, maxY: 1 } };
    }
    const minY = pts[0].y;
    const maxY = pts[pts.length - 1].y;
    return {
      geometry: new THREE.LatheGeometry(pts, 36),
      bounds: { minY, maxY },
    };
  }, [vesselType]);

  const frostStrength = Math.max(0.15, Math.min(1, (-temperature_c + 2) / 14));

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      roughness: 0.88,
      metalness: 0.06,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uMinY = { value: bounds.minY };
      shader.uniforms.uMaxY = { value: bounds.maxY };
      shader.vertexShader = `
        varying vec3 vFrostLocal;
        ${shader.vertexShader}
      `.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vFrostLocal = position;
      `);
      shader.fragmentShader = `
        uniform float uMinY;
        uniform float uMaxY;
        varying vec3 vFrostLocal;
        ${NOISE_GLSL}
        ${shader.fragmentShader}
      `.replace('#include <alphamap_fragment>', `
        #include <alphamap_fragment>
        float span = max(0.01, uMaxY - uMinY);
        float hNorm = clamp((vFrostLocal.y - uMinY) / span, 0.0, 1.0);
        float verticalMask = 1.0 - smoothstep(0.52, 0.96, hNorm);
        float crystals = snoise(vFrostLocal * 16.0) * 0.3 + snoise(vFrostLocal * 38.0) * 0.18;
        diffuseColor.a = clamp((0.46 * diffuseColor.a + crystals * 0.25) * verticalMask, 0.0, 0.72);
      `).replace('#include <dithering_fragment>', `
        #include <dithering_fragment>
        float sparkle = smoothstep(0.28, 0.72, snoise(vFrostLocal * 55.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.95, 0.985, 1.0), 0.55 + sparkle * 0.35);
      `);
    };
    mat.customProgramCacheKey = () => 'chemlab_endothermic_frost';
    return mat;
  }, [bounds.minY, bounds.maxY]);

  useEffect(() => () => { geometry?.dispose(); }, [geometry]);
  useEffect(() => () => { material.dispose(); }, [material]);

  if (!geometry) return null;
  return <mesh renderOrder={5} name={`vessel-frost-${vesselId}`} geometry={geometry} material={material} material-opacity={frostStrength} />;
});

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
  const hasFrost = vessel.temperature_c <= 0
    && (activeRecipe.specialEffect === 'frost'
      || Boolean(kinetics?.program?.visual?.timeline?.some(item => item.atom === 'endothermicFrost')));
  const hasFoam = (vessel.foam_ml ?? 0) > 0.05 || foamRate > 0;
  const body = vesselBodyTransform(vessel);
  const bodyEffects = (
    <>
      {hasFoam && <Foam vesselId={vesselId} capacity_ml={vessel.capacity_ml} active />}
      {hasFrost
        && <EndothermicFrostSheath vesselId={vesselId} vesselType={vessel.type} temperature_c={vessel.temperature_c} />}
    </>
  );
  const hasBodyEffects = hasFoam || hasFrost;
  const sceneEffects = (
    <>
      {hasSparks && <Sparks origin={[0, vesselWorldLiquidSurfaceY(vessel), 0]}
        groundY={(runtime?.benchY ?? LAB_PHYSICS.TABLE_SURFACE_Y) - vessel.position[1]}
        rate={activeRecipe.sparks?.rate || 30} burstCount={activeRecipe.sparks?.burstCount || 15}
        color={activeRecipe.sparks?.color || (controller?.customData?.sparkColor as string) || '#f59e0b'} active />}
    </>
  );
  return <group name={`vessel-transient-effects-${vesselId}`}>
    {frame === 'body'
      ? <>{hasBodyEffects && bodyEffects}<group position={[0, -body.offsetY / body.scale, 0]} scale={1 / body.scale}>{sceneEffects}</group></>
      : <>{hasBodyEffects && <VesselEffectsFrame vessel={vessel}>{bodyEffects}</VesselEffectsFrame>}{sceneEffects}</>}
  </group>;
}
