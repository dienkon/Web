import * as THREE from 'three';
import { NOISE_GLSL } from '../glsl/noise.glsl';

export function createProceduralFlameMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying float vNoise;
      ${NOISE_GLSL}

      void main() {
        vUv = uv;
        vPosition = position;

        // Displace vertices with ascending 3D simplex noise
        float heightFactor = clamp((position.y + 0.2) / 0.8, 0.0, 1.0);
        vec3 noiseCoord = vec3(position.x * 5.0, position.y * 4.0 - uTime * 7.5, position.z * 5.0);
        float n = snoise(noiseCoord);
        vNoise = n;

        vec3 transformed = position;
        float wobble = n * pow(heightFactor, 1.5) * 0.14 * uIntensity;
        transformed.x += wobble;
        transformed.z += snoise(noiseCoord + 12.5) * pow(heightFactor, 1.5) * 0.12 * uIntensity;

        // Natural tapering elongation towards tip
        transformed.y += n * 0.05 * heightFactor;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vPosition;
      varying vec2 vUv;
      varying float vNoise;

      void main() {
        // Height parameter normalized from base (0.0) to flame tip (1.0)
        float h = clamp((vPosition.y + 0.15) / 0.65, 0.0, 1.0);

        // Core colors
        vec3 blueBase = vec3(0.08, 0.58, 0.98); // Combustion base
        vec3 yellowCore = vec3(0.98, 0.84, 0.12); // Reducing incandescent zone
        vec3 orangeTip = vec3(0.94, 0.32, 0.04); // Oxidizing amber tip

        vec3 color;
        if (h < 0.25) {
          float t = h / 0.25;
          color = mix(blueBase, yellowCore, t);
        } else {
          float t = (h - 0.25) / 0.75;
          color = mix(yellowCore, orangeTip, t);
        }

        // Core brightness boost
        color += vec3(0.2, 0.2, 0.1) * (1.0 - h);

        // Alpha falloff towards the edges and tip
        float edgeDist = length(vPosition.xz) * 6.5;
        float alpha = clamp(1.0 - edgeDist + vNoise * 0.35, 0.0, 1.0);
        alpha *= (1.0 - pow(h, 2.5));

        gl_FragColor = vec4(color * uIntensity, alpha * 0.88);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
