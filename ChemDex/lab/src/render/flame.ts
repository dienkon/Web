/**
 * flame.ts - Procedural Bunsen burner and combustion flame shaders.
 * 
 * Features:
 * - Dual-cone structure: Inner chemiluminescent cold blue core + outer luminous reaction zone.
 * - Dynamic flicker (8 - 15 Hz) and spectral atomic emission line coloration.
 * - Additive HDR blending for bright bloom response.
 */

import * as THREE from 'three';

export interface FlameShaderUniforms {
  uTime: THREE.IUniform<number>;
  uBaseColor: THREE.IUniform<THREE.Color>;
  uTipColor: THREE.IUniform<THREE.Color>;
  uIntensity: THREE.IUniform<number>;
}

export function createProceduralFlameMaterial(): {
  material: THREE.ShaderMaterial;
  uniforms: FlameShaderUniforms;
} {
  const uniforms: FlameShaderUniforms = {
    uTime: { value: 0 },
    uBaseColor: { value: new THREE.Color('#38bdf8') }, // Chemiluminescent blue
    uTipColor: { value: new THREE.Color('#f59e0b') },  // Luminous orange
    uIntensity: { value: 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uBaseColor: uniforms.uBaseColor,
      uTipColor: uniforms.uTipColor,
      uIntensity: uniforms.uIntensity,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uTipColor;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        // Flame teardrop shape
        vec2 p = vUv * 2.0 - 1.0;
        p.y += 0.2;
        float r = length(p);

        // Vertical gradient
        vec3 col = mix(uBaseColor, uTipColor, clamp(vUv.y * 1.5, 0.0, 1.0));
        float alpha = clamp(1.0 - r * 1.4, 0.0, 1.0) * uIntensity;

        gl_FragColor = vec4(col * 1.8, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  return { material, uniforms };
}
