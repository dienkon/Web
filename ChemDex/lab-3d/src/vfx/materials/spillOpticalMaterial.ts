import * as THREE from 'three';
import { METERS_PER_SCENE_UNIT as U } from '../../science/sceneUnits';
import { SPILL_COLOR_REFERENCE_M, SPILL_WATERLIKE_IOR } from '../../science/spillOptics';

type Shader = Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0];

/** Meshes remain on a horizontal support, in scene length units. Optical
 * height comes from the actual volume mesh; never inflate the contact line. */
export function shadeSpillVolume(shader: Shader, maxPath: { value: number }) {
  shader.uniforms.uSpillMaxPath = maxPath;
  shader.vertexShader = `varying float vSpillHeight;\n${shader.vertexShader}`.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvSpillHeight = max(0.0, position.y);');
  shader.fragmentShader = `varying float vSpillHeight;\nuniform float uSpillMaxPath;\n${shader.fragmentShader}`
    .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace('vec4 transmitted =', `
      vec3 spillRay = refract(-v, n, 1.0 / material.ior);
      material.thickness = min(uSpillMaxPath, vSpillHeight / max(0.0001, abs(spillRay.y)));
      vec4 transmitted =`));
}

const absorptionVertex = `
varying vec3 vSpillWorldPosition;
varying vec3 vSpillNormal;
varying float vSpillHeight;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vSpillWorldPosition = world.xyz;
  vSpillNormal = normalize(mat3(modelMatrix) * normal);
  vSpillHeight = max(position.y, 0.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const absorptionFragment = `
uniform vec3 uSpillAbsorption;
uniform float uSpillMaxPath;
uniform float uSpillIor;
varying vec3 vSpillWorldPosition;
varying vec3 vSpillNormal;
varying float vSpillHeight;
void main() {
  vec3 view = normalize(cameraPosition - vSpillWorldPosition);
  vec3 normal = normalize(vSpillNormal);
  float f0 = pow((uSpillIor - 1.0) / (uSpillIor + 1.0), 2.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 5.0);
  vec3 ray = refract(-view, normal, 1.0 / uSpillIor);
  float path = min(uSpillMaxPath, vSpillHeight / max(abs(ray.y), 0.0001));
  vec3 transmittance = exp(-uSpillAbsorption * path) * (1.0 - fresnel);
  // Multiplication occurs in the display framebuffer. Gamma-compensate the
  // factor; unlike full transmission this remains a display approximation.
  gl_FragColor = vec4(pow(transmittance, vec3(1.0 / 2.2)), 1.0);
}`;

/** Low tiers multiply the existing opaque backdrop, then add surface specular.
 * They do not request Three's full-scene transmission render target. */
export function createSpillOpticalMaterials(refractive: boolean) {
  const maxPath = { value: 1 }, absorption = { value: new THREE.Vector3() };
  const volume = refractive ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1,
    opacity: 1, roughness: 0.025, ior: SPILL_WATERLIKE_IOR, clearcoat: 0, depthWrite: false,
    attenuationDistance: SPILL_COLOR_REFERENCE_M / U }) : new THREE.ShaderMaterial({
    uniforms: { uSpillAbsorption: absorption, uSpillMaxPath: maxPath, uSpillIor: { value: SPILL_WATERLIKE_IOR } },
    vertexShader: absorptionVertex, fragmentShader: absorptionFragment, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, toneMapped: false });
  if (volume instanceof THREE.MeshPhysicalMaterial) {
    volume.onBeforeCompile = shader => shadeSpillVolume(shader, maxPath);
    volume.customProgramCacheKey = () => 'spill-volume-path-v1';
  }
  const reflection = refractive ? null : new THREE.MeshPhysicalMaterial({ color: '#000000',
    roughness: 0.025, ior: SPILL_WATERLIKE_IOR, clearcoat: 0, transmission: 0,
    transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  return { volume, reflection,
    update(absorption_per_m: readonly number[], maxChord_m: number) {
      maxPath.value = maxChord_m / U;
      absorption.value.fromArray(absorption_per_m.map(a => a * U));
      if (volume instanceof THREE.MeshPhysicalMaterial) volume.attenuationColor.setRGB(
        ...absorption_per_m.map(a => Math.exp(-a * SPILL_COLOR_REFERENCE_M)) as [number, number, number]);
    },
    dispose() { volume.dispose(); reflection?.dispose(); } };
}
