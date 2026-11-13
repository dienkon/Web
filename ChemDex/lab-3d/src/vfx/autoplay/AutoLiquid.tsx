import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AutoExperiment } from './AutoExperiment';
import { getVesselProfile } from '../../pour/physics/profiles';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { supernatantColor } from '../../science/supernatantAppearance';
import { liquidOpacity, suspensionColorWeight } from '../../science/liquidOptics';
import { VORTEX_GLSL } from '../../science/liquidVortex';

/** The actual beaker contour, with one volume-preserving pressure surface.
 * Render geometry never substitutes a smaller cylinder for the particle bounds. */
export function AutoLiquid({ experiment: e }: { experiment: AutoExperiment }) {
  const root = useRef<THREE.Group>(null), cap = useRef<THREE.Mesh>(null);
  const profile = useMemo(() => getVesselProfile('beaker', 100), []);
  const geometry = useMemo(() => new THREE.LatheGeometry([
    ...profile.contour!.map(([r, y]) => new THREE.Vector2(r, y)), new THREE.Vector2(0, profile.baseY + profile.H),
  ], 48), [profile]);
  const uniforms = useMemo(() => ({ uVortex: { value: new THREE.Vector4(1, 0, 0, 0) }, uFillY: { value: profile.baseY }, uPhase: { value: 0 } }), [profile]);
  const materials = useMemo(() => {
    const body = new THREE.MeshPhysicalMaterial({ color: 'white', transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.08, clearcoat: 0.7 });
    body.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vReservoir;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvReservoir = position;');
      shader.fragmentShader = `${VORTEX_GLSL}\nvarying vec3 vReservoir;\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vReservoir.y > vortexLevel(vReservoir.xz)) discard;');
    };
    body.customProgramCacheKey = () => 'auto-contoured-vortex-volume-v1';
    const surface = new THREE.MeshPhysicalMaterial({ color: 'white', transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.06, clearcoat: 1 });
    surface.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = `${VORTEX_GLSL}\nuniform float uFillY; uniform float uPhase;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float r2 = dot(position.xy, position.xy);
        float slope = 2.0 * uVortex.y * uVortex.x / max(1e-12, pow(uVortex.x + r2, 2.0));
        float wave = sin(length(position.xy) * 36.0 - uPhase * 0.3) * min(0.008, abs(uVortex.w) * 0.0002);
        objectNormal = normalize(vec3(-slope * position.xy + wave, 1.0));`);
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += vortexLevel(position.xy) - uFillY;');
    };
    surface.customProgramCacheKey = () => 'auto-vortex-surface-v1';
    return { body, surface };
  }, [uniforms]);
  const colors = useMemo(() => ({ base: new THREE.Color(), suspension: new THREE.Color() }), []);
  useEffect(() => () => { geometry.dispose(); materials.body.dispose(); materials.surface.dispose(); }, [geometry, materials]);
  useFrame(() => {
    if (!root.current || !cap.current) return;
    const sample = e.sample, fillY = vesselLiquidSurfaceY(sample), vortex = e.physics.vortex.surface;
    root.current.visible = sample.volume_ml > 0.01;
    cap.current.position.y = fillY;
    uniforms.uFillY.value = fillY; uniforms.uPhase.value = e.physics.vortex.phase_rad;
    uniforms.uVortex.value.set((vortex?.coreRadius ?? 1) ** 2, vortex?.amplitude ?? 0, vortex?.offset ?? fillY, e.physics.vortex.angularSpeed_rad_s);
    const base = supernatantColor(sample.contents, sample.volume_ml) ?? sample.liquidColor ?? '#f8fafc';
    const haze = e.physics.cloudiness;
    for (const [surface, material] of [[false, materials.body], [true, materials.surface]] as const) {
      colors.base.set(base).lerp(colors.suspension.set(e.physics.suspensionColor), suspensionColorWeight(base, haze, surface));
      material.color.copy(colors.base); material.opacity = liquidOpacity(base, haze, surface);
      material.roughness = 0.06 + haze * 0.35;
    }
  });
  return <group ref={root} name="auto_liquid">
    <mesh name="auto_liquid_volume" geometry={geometry} material={materials.body} renderOrder={2} dispose={null} />
    <mesh ref={cap} name="auto_liquid_surface" rotation={[-Math.PI / 2, 0, 0]} material={materials.surface} renderOrder={3}>
      <ringGeometry args={[0, 0.965, 64, 24]} />
    </mesh>
  </group>;
}
