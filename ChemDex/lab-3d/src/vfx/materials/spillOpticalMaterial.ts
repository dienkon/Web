import * as THREE from 'three';
import { METERS_PER_SCENE_UNIT as U } from '../../science/sceneUnits';
import { SPILL_COLOR_REFERENCE_M, SPILL_WATERLIKE_IOR } from '../../science/spillOptics';

type Shader = Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0];

/** Meshes remain on a horizontal support, in scene length units. Optical
 * height comes from the actual volume mesh; never inflate the contact line. */
export function shadeSpillVolume(shader: Shader, maxPath: { value: number },
  scattering = { value: 0 }, cloud = { value: new THREE.Color('#ffffff') }) {
  shader.uniforms.uSpillMaxPath = maxPath;
  shader.uniforms.uSpillScattering = scattering; shader.uniforms.uSpillCloud = cloud;
  shader.vertexShader = `varying float vSpillHeight;\n${shader.vertexShader}`.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvSpillHeight = max(0.0, position.y);');
  shader.fragmentShader = `varying float vSpillHeight;\nuniform float uSpillMaxPath;\nuniform float uSpillScattering;\nuniform vec3 uSpillCloud;\n${shader.fragmentShader}`
    .replace('#include <transmission_fragment>', `vec3 spillScatteredLight = totalDiffuse * uSpillCloud;\n` + THREE.ShaderChunk.transmission_fragment.replace('vec4 transmitted =', `
      vec3 spillRay = refract(-v, n, 1.0 / material.ior);
      material.thickness = min(uSpillMaxPath, vSpillHeight / max(0.0001, abs(spillRay.y)));
      vec4 transmitted =`) + `\ntotalDiffuse += spillScatteredLight * (1.0 - exp(-uSpillScattering * material.thickness));`);
}

function shadeSpillCloud(shader: Shader, maxPath: { value: number }, scattering: { value: number }) {
  Object.assign(shader.uniforms, { uSpillMaxPath: maxPath, uSpillScattering: scattering });
  shader.vertexShader = `varying float vSpillHeight;\nvarying vec3 vSpillPosition;\n${shader.vertexShader}`
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSpillHeight = max(position.y, 0.0);\nvSpillPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
  shader.fragmentShader = `varying float vSpillHeight;\nvarying vec3 vSpillPosition;\nuniform float uSpillMaxPath;\nuniform float uSpillScattering;\n${shader.fragmentShader}`
    .replace('#include <opaque_fragment>', `
      vec3 spillView = normalize(cameraPosition - vSpillPosition);
      vec3 spillNormal = transformNormalByInverseViewMatrix(normal, viewMatrix);
      vec3 spillRay = refract(-spillView, spillNormal, 1.0 / 1.333);
      float spillPath = min(uSpillMaxPath, vSpillHeight / max(abs(spillRay.y), 0.0001));
      diffuseColor.a *= 1.0 - exp(-uSpillScattering * spillPath);
      #include <opaque_fragment>`);
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
  const scattering = { value: 0 }, cloud = { value: new THREE.Color('#ffffff') };
  const volume = refractive ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1,
    opacity: 1, roughness: 0.025, ior: SPILL_WATERLIKE_IOR, clearcoat: 0, depthWrite: false,
    attenuationDistance: SPILL_COLOR_REFERENCE_M / U }) : new THREE.ShaderMaterial({
    uniforms: { uSpillAbsorption: absorption, uSpillMaxPath: maxPath, uSpillIor: { value: SPILL_WATERLIKE_IOR } },
    vertexShader: absorptionVertex, fragmentShader: absorptionFragment, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, toneMapped: false });
  if (volume instanceof THREE.MeshPhysicalMaterial) {
    volume.onBeforeCompile = shader => shadeSpillVolume(shader, maxPath, scattering, cloud);
    volume.customProgramCacheKey = () => 'spill-volume-path-v2';
  }
  const reflection = refractive ? null : new THREE.MeshPhysicalMaterial({ color: '#000000',
    roughness: 0.025, ior: SPILL_WATERLIKE_IOR, clearcoat: 0, transmission: 0,
    transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const cloudMaterial = refractive ? null : new THREE.MeshPhysicalMaterial({ color: '#ffffff',
    roughness: 1, ior: SPILL_WATERLIKE_IOR, specularIntensity: 0, transmission: 0, transparent: true, depthWrite: false });
  if (cloudMaterial) { cloudMaterial.onBeforeCompile = shader => shadeSpillCloud(shader, maxPath, scattering);
    cloudMaterial.customProgramCacheKey = () => 'spill-cloud-opacity-v1'; }
  return { volume, reflection, cloudMaterial,
    update(absorption_per_m: readonly number[], maxChord_m: number, scattering_per_m = 0, cloudColor?: THREE.Color) {
      maxPath.value = maxChord_m / U;
      scattering_per_m = Math.min(1e8, Math.max(0, scattering_per_m));
      scattering.value = Math.max(0, scattering_per_m) * U;
      if (cloudColor) cloud.value.copy(cloudColor); else cloud.value.set('#ffffff');
      cloudMaterial?.color.copy(cloud.value);
      absorption.value.fromArray(absorption_per_m.map(a => a * U));
      if (volume instanceof THREE.MeshPhysicalMaterial) volume.attenuationColor.setRGB(
        ...absorption_per_m.map(a => Math.exp(-Math.min(80, (a + Math.max(0, scattering_per_m)) * SPILL_COLOR_REFERENCE_M))) as [number, number, number]);
    },
    dispose() { volume.dispose(); reflection?.dispose(); cloudMaterial?.dispose(); } };
}
