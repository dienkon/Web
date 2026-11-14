import * as THREE from 'three';
import { LiquidAppearanceField } from '../../src/simulation/effects/LiquidAppearanceField';
import { createSpatialLiquidAppearance, shadeSpatialLiquid } from '../../src/vfx/materials/spatialLiquidAppearance';
import { getVesselProfile } from '../../src/pour/physics/profiles';

// Quantitative GPU fixture: the production shader outputs raw suspension alpha
// or color, with lighting, exposure and monitor transfer removed from the test.
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(128, 128); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
camera.position.set(0, 0.5, 4); camera.lookAt(0, 0.5, 0);
const field = new LiquidAppearanceField();
const appearance = createSpatialLiquidAppearance(field);
let diagnostic = 0;
const material = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
material.onBeforeCompile = shader => {
  shader.uniforms.uDiagnostic = { get value() { return diagnostic; } };
  shader.vertexShader = 'varying vec3 vLocal;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = (modelMatrix * vec4(position, 1.0)).xyz;');
  shader.fragmentShader = 'uniform float uDiagnostic; varying vec3 vLocal;\n' + shader.fragmentShader;
  shadeSpatialLiquid(shader, appearance.uniforms, 'vLocal', false);
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
    'gl_FragColor = vec4(uDiagnostic < 0.5 ? vec3(suspension.a) : suspension.rgb, 1.0);');
};
const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
plane.position.set(0, 0.5, 1); scene.add(plane);
const profile = getVesselProfile('beaker', 100);
const bounds = { radius: 1, liquidBottomY: 0, surfaceY: 1, vesselProfile: { ...profile, baseY: 0, H: 1, r: () => 1,
  contour: [[1, 0], [1, 1]] as [number, number][] } };
Object.assign(window, { opticalReady: true, opticalReference(options: {
  scale?: number; mixed?: boolean; reverse?: boolean; color?: boolean; orthographicOffset?: number; rayX?: number; opticalDepth?: number;
}) {
  field.reset();
  const particles = options.mixed ? [{ x: 0, y: 0.5, z: 0.55, mass_ug: 100 }] : [];
  const systems = new Map([['front', { cloudiness: 0.4, opticalDepth: options.opticalDepth, profile: { color: options.mixed ? '#ff0000' : '#ffffff' }, particles }]]);
  if (options.mixed) systems.set('back', { cloudiness: 0.4, opticalDepth: undefined, profile: { color: '#0000ff' }, particles: [{ x: 0, y: 0.5, z: -0.55, mass_ug: 100 }] });
  field.advance(0.1, { color: '#ffffff', turbidity: 0.4, radius: 1, baseY: 0, fillY: 1, suspensions: systems });
  bounds.vesselProfile.sceneScale = options.scale ?? 0.5;
  appearance.update('#ffffff', new THREE.Matrix4(), bounds);
  diagnostic = options.color ? 1 : 0;
  const direction = options.reverse ? -1 : 1, offset = options.orthographicOffset ?? 0;
  camera.position.set(offset, 0.5, direction * 4); camera.lookAt(offset, 0.5, 0);
  camera.left = -1 - offset + (options.rayX ?? 0); camera.right = 1 - offset + (options.rayX ?? 0); camera.updateProjectionMatrix();
  plane.position.z = direction;
  renderer.render(scene, camera);
  const pixel = new Uint8Array(4);
  renderer.getContext().readPixels(64, 64, 1, 1, renderer.getContext().RGBA, renderer.getContext().UNSIGNED_BYTE, pixel);
  return [...pixel];
} });
