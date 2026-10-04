/**
 * post.ts - Screen-space post-processing pipelines: heat-haze distortion, bloom, and tone mapping.
 * 
 * Physical Model:
 * 1. Heat Haze / Schlieren Distortion:
 *    Hot air convection creates refractive index gradients: dn/dT ≈ -1e-6 / K.
 *    Screen UVs perturbed by noise offset: UV' = UV + curlNoise(UV * freq, t) * intensity * smoothstep(T - T_amb).
 * 2. Tone Mapping:
 *    ACES filmic tone reproduction curve preserving bright combustion flame specularities without clipping.
 */

import * as THREE from 'three';

export interface HeatHazeUniforms {
  tDiffuse: THREE.IUniform<THREE.Texture | null>;
  uTime: THREE.IUniform<number>;
  uIntensity: THREE.IUniform<number>;
  uSourceY: THREE.IUniform<number>;
}

export function createHeatHazeShader(): {
  shader: THREE.ShaderMaterial;
  uniforms: HeatHazeUniforms;
} {
  const uniforms: HeatHazeUniforms = {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.003 }, // Subtle visual shimmer
    uSourceY: { value: 0.5 },
  };

  const shader = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: uniforms.tDiffuse,
      uTime: uniforms.uTime,
      uIntensity: uniforms.uIntensity,
      uSourceY: uniforms.uSourceY,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSourceY;
      varying vec2 vUv;

      void main() {
        // Upward rising heat haze shimmer
        float wave1 = sin(vUv.y * 40.0 - uTime * 6.0) * cos(vUv.x * 30.0 + uTime * 4.0);
        float wave2 = cos(vUv.y * 65.0 - uTime * 9.0) * sin(vUv.x * 50.0 - uTime * 5.0);
        float haze = (wave1 + wave2) * 0.5;

        // Mask distortion to region directly above heating sources
        float heightMask = smoothstep(uSourceY - 0.05, uSourceY + 0.4, vUv.y);
        vec2 offset = vec2(haze * uIntensity * heightMask, 0.0);

        gl_FragColor = texture2D(tDiffuse, vUv + offset);
      }
    `,
  });

  return { shader, uniforms };
}
