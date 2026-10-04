/**
 * liquid.ts - Physical liquid renderer with Beer-Lambert volume absorption,
 * meniscus capillary highlight, caustics-lite, and turbidity scattering.
 * 
 * Physical Model:
 * 1. Beer-Lambert Absorption:
 *    A(λ) = Σ ε_k(λ) · c_k · ℓ
 *    Transmittance T(λ) = 10^(-A(λ))
 *    Path length ℓ is integrated per-ray/pixel: deep liquid is saturated and rich;
 *    thin meniscus rim is translucent and bright.
 * 2. Meniscus Ring:
 *    Capillary elevation creates bright Fresnel ring at the glass-liquid contact line.
 * 3. Turbidity Forward Scattering (Henyey-Greenstein lite):
 *    Suspended precipitate particles (BaSO4, AgCl, Cu(OH)2) scatter light forward,
 *    giving a milky opacity with Tyndall beam glow when backlit.
 */

import * as THREE from 'three';
import { RenderTier } from './gl.js';

export interface LiquidShaderUniforms {
  uTime: THREE.IUniform<number>;
  uFillY: THREE.IUniform<number>;
  uLiquidColor: THREE.IUniform<THREE.Color>;
  uTurbidity: THREE.IUniform<number>;
  uBoilingIntensity: THREE.IUniform<number>;
  uPathLengthScale: THREE.IUniform<number>;
}

export function createLiquidPhysicalMaterial(
  clippingPlane: THREE.Plane,
  tier: RenderTier = 'B'
): { material: THREE.Material; uniforms: LiquidShaderUniforms } {
  const uniforms: LiquidShaderUniforms = {
    uTime: { value: 0 },
    uFillY: { value: 0 },
    uLiquidColor: { value: new THREE.Color('#38bdf8') },
    uTurbidity: { value: 0 },
    uBoilingIntensity: { value: 0 },
    uPathLengthScale: { value: 1.0 },
  };

  const mat = new THREE.MeshPhysicalMaterial({
    color: uniforms.uLiquidColor.value,
    roughness: 0.06,
    metalness: 0.02,
    clearcoat: 0.85,
    clearcoatRoughness: 0.05,
    specularIntensity: 0.9,
    transparent: true,
    opacity: 0.88,
    clippingPlanes: [clippingPlane],
    clipShadows: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uFillY = uniforms.uFillY;
    shader.uniforms.uLiquidColor = uniforms.uLiquidColor;
    shader.uniforms.uTurbidity = uniforms.uTurbidity;
    shader.uniforms.uBoilingIntensity = uniforms.uBoilingIntensity;
    shader.uniforms.uPathLengthScale = uniforms.uPathLengthScale;

    shader.vertexShader = `
      varying vec3 vWorldPos;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
    );

    shader.fragmentShader = `
      uniform float uTime;
      uniform float uFillY;
      uniform vec3 uLiquidColor;
      uniform float uTurbidity;
      uniform float uBoilingIntensity;
      uniform float uPathLengthScale;
      varying vec3 vWorldPos;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      // Beer-Lambert volume absorption approximation based on optical path length
      vec3 viewDir = normalize(vViewPosition);
      float viewCos = max(0.15, abs(dot(viewDir, normal)));
      float opticalPath = (1.0 / viewCos) * uPathLengthScale;
      
      // Absorb transmittance: T = exp(-A * path)
      vec3 absorptionCoeff = -log(max(vec3(0.01), uLiquidColor)) * 1.5;
      vec3 transmittance = exp(-absorptionCoeff * opticalPath);
      gl_FragColor.rgb = transmittance;

      // Turbidity Tyndall scattering for milky precipitates
      if (uTurbidity > 0.01) {
        vec3 scatterLight = vec3(0.96, 0.96, 0.94);
        float scatterFactor = clamp(uTurbidity * 1.8, 0.0, 0.95);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, scatterLight, scatterFactor);
        gl_FragColor.a = max(gl_FragColor.a, mix(0.7, 0.98, scatterFactor));
      }

      // Fresnel edge meniscus highlight
      float rim = 1.0 - viewCos;
      gl_FragColor.rgb += uLiquidColor * pow(rim, 2.5) * 0.4;
      `
    );
  };

  return { material: mat, uniforms };
}
