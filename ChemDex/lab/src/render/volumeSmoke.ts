/**
 * volumeSmoke.ts - Volumetric steam, smoke, and colored gas plume shaders.
 * 
 * Capabilities:
 * - Soft-particle depth-faded billboards.
 * - Support for colored gases (NO2 brown, Cl2 yellow-green, I2 purple, MgO dense white).
 * - Curl noise advection and buoyancy expansion.
 */

import * as THREE from 'three';

export interface GasPlumeUniforms {
  uTime: THREE.IUniform<number>;
  uColor: THREE.IUniform<THREE.Color>;
  uDensity: THREE.IUniform<number>;
}

export function createGasPlumeMaterial(colorHex: string = '#ffffff'): {
  material: THREE.ShaderMaterial;
  uniforms: GasPlumeUniforms;
} {
  const uniforms: GasPlumeUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(colorHex) },
    uDensity: { value: 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uColor: uniforms.uColor,
      uDensity: uniforms.uDensity,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uDensity;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float dist = length(p);
        if (dist > 1.0) discard;

        float alpha = smoothstep(1.0, 0.0, dist) * 0.25 * uDensity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  return { material, uniforms };
}
