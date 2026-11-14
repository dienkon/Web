import * as THREE from 'three';
import { LiquidAppearanceField } from '../../src/simulation/effects/LiquidAppearanceField';
import { createSpatialLiquidAppearance, shadeSpatialLiquid } from '../../src/vfx/materials/spatialLiquidAppearance';
import { getVesselProfile, VESSEL_PROFILES } from '../../src/pour/physics/profiles';

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(129, 129); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.01, 100);
const field = new LiquidAppearanceField(), appearance = createSpatialLiquidAppearance(field);
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
material.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 vLocal;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = (modelMatrix * vec4(position, 1.0)).xyz;');
  shader.fragmentShader = 'varying vec3 vLocal;\n' + shader.fragmentShader;
  shadeSpatialLiquid(shader, appearance.uniforms, 'vLocal', false);
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'gl_FragColor = vec4(vec3(suspension.a), 1.0);');
};
const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material); scene.add(plane);
Object.assign(window, { opticalGeometryReady: true, opticalGeometryTypes: Object.keys(VESSEL_PROFILES),
  opticalGeometryReference(options: { type: string; angle: number; height: number; x: number; vortex?: boolean; tilted?: boolean }) {
    const profile = getVesselProfile(options.type, 100), baseY = profile.baseY, depth = profile.H;
    const radius = Math.max(...profile.contour!.map(([r]) => r)), scale = Math.max(radius, depth);
    const direction = new THREE.Vector3(0, -Math.sin(options.angle), -Math.cos(options.angle));
    const target = new THREE.Vector3(options.x * radius, baseY + depth * options.height, 0);
    const origin = target.clone().addScaledVector(direction, -2 * scale);
    camera.position.copy(origin).addScaledVector(direction, -scale); camera.lookAt(target); camera.updateMatrixWorld();
    plane.position.copy(origin); plane.quaternion.copy(camera.quaternion); plane.updateMatrixWorld();
    const surfaceY = baseY + depth * 0.82;
    const vortex = options.vortex ? { coreRadius: radius * 0.28, amplitude: depth * 0.6,
      offset: baseY + depth * 0.2, radius, meanLevel: surfaceY, angularSpeed_rad_s: 20, phase_rad: 0 } : undefined;
    const bounds = { radius, liquidBottomY: baseY, surfaceY, vesselProfile: profile,
      surfacePlane: { normal: options.tilted ? [0.6, 0.8, 0] as const : [0, 1, 0] as const, offset: surfaceY, vortex } };
    field.reset();
    // Uniform atlas isolates ray/geometry clipping from parcel reconstruction.
    field.advance(0.1, { color: '#ffffff', turbidity: 0.5, radius, baseY, fillY: baseY + depth,
      suspensions: new Map([['reference', { cloudiness: 0.5, opticalDepth: 1, particles: [] }]]) });
    appearance.update('#ffffff', new THREE.Matrix4(), bounds);
    renderer.render(scene, camera);
    const gl = renderer.getContext(), pixel = new Uint8Array(4);
    gl.readPixels(64, 64, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    // Independent fine integration of the actual profile, not shader uniforms
    // or the production segment algorithm. 100000 midpoints bound length error.
    let length = 0;
    const ds = 4 * scale / 100000;
    for (let i = 0; i < 100000; i++) {
      const t = (i + 0.5) * ds, y = origin.y + direction.y * t;
      const x = origin.x, z = origin.z + direction.z * t, r2 = x * x + z * z;
      const top = vortex ? vortex.offset + vortex.amplitude * r2 / (vortex.coreRadius ** 2 + r2)
        : options.tilted ? (surfaceY - 0.6 * x) / 0.8 : surfaceY;
      if (y >= baseY && y <= baseY + depth && y <= top && r2 <= profile.r(y) ** 2) length += ds;
    }
    const expected = 1 - Math.exp(-length * profile.sceneScale);
    return { ...options, length, expected, measured: pixel[0] / 255, error: pixel[0] / 255 - expected };
  }, opticalGeometryBenchmark() {
    renderer.setSize(512, 512);
    const gl = renderer.getContext();
    for (let i = 0; i < 10; i++) renderer.render(scene, camera);
    const pixel = new Uint8Array(4);
    gl.readPixels(256, 256, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const elapsed = [];
    for (let i = 0; i < 40; i++) {
      const start = performance.now(); renderer.render(scene, camera);
      gl.readPixels(256, 256, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); elapsed.push(performance.now() - start);
    }
    elapsed.sort((a, b) => a - b); renderer.setSize(129, 129);
    return { median_ms: elapsed[20], p95_ms: elapsed[37], maximum_ms: elapsed[39],
      resolution: [512, 512], pixel: [...pixel],
      scope: 'Single full-screen optical quad: CPU submit and synchronous pixel readback; excludes React, chemistry, particles and glass. Not application FPS or isolated GPU timing.' };
  } });
