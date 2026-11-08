import type * as THREE from 'three';
import { NOISE_GLSL } from '../glsl/noise.glsl';

/** A wet surface needs actual liquid contact in this pure-water specimen.
 * Internal clouding is a fixed illustrative texture, not temperature-derived
 * crystallography or a prediction of stress cracks. */
export function iceSurfaceFinish(temperature_c: number, liquid_g: number) {
  const wet = liquid_g > 1e-10 && temperature_c >= 0;
  return { wet, roughness: wet ? 0.09 : 0.3, clearcoat: wet ? 0.55 : 0.08,
    clearcoatRoughness: wet ? 0.05 : 0.22 };
}

export function shadeIceInterior(shader: Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0]) {
  shader.vertexShader = `varying vec3 vIcePoint;\n${shader.vertexShader}`
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIcePoint = position;');
  shader.fragmentShader = `varying vec3 vIcePoint;\n${NOISE_GLSL}\n${shader.fragmentShader}`
    .replace('#include <color_fragment>', `
      #include <color_fragment>
      float iceCloud = 0.5 + 0.5 * snoise(vIcePoint * 9.0);
      float iceCore = 1.0 - smoothstep(0.05, 0.52, length(vIcePoint.xz));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.98, 1.0), 0.12 * iceCloud + 0.08 * iceCore);
    `);
}
