import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

const RIPPLE_COUNT = 12;
const reflectionMatrix = new THREE.Matrix4();

const waveGLSL = /* glsl */ `
  uniform float uTime;
  uniform float uWaves;
  uniform float uWind;
  uniform vec4 uRipples[${RIPPLE_COUNT}];

  vec3 waterSample(vec2 p) {
    float speed = 0.55 + uWind * 1.1;
    float t = uTime * speed;
    vec2 k1 = vec2(1.05, 0.53);
    vec2 k2 = vec2(-0.63, 1.63);
    vec2 k3 = vec2(2.21, -1.18);
    float phase1 = dot(p, k1) + t;
    float phase2 = dot(p, k2) - t * 0.71;
    float phase3 = dot(p, k3) + t * 1.15;
    float waveScale = 0.3 + uWaves * 1.35;
    float h = (sin(phase1) * 0.013 + sin(phase2) * 0.007 + sin(phase3) * 0.0035) * waveScale;
    vec2 gradient = vec2(0.0);
    #ifdef WATER_NORMALS
      gradient = (cos(phase1) * k1 * 0.013 + cos(phase2) * k2 * 0.007 + cos(phase3) * k3 * 0.0035) * waveScale;
    #endif
    for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
      float age = uTime - uRipples[i].z;
      if (age > 0.0 && age < 5.5) {
        vec2 offset = p - uRipples[i].xy;
        float d = length(offset);
        float front = d - age * 1.65;
        float envelope = exp(-front * front * 2.2 - age * 0.65);
        float originFade = smoothstep(0.0, 0.12, d);
        float ring = sin(front * 12.0);
        float amplitude = uRipples[i].w * 0.045;
        h += ring * envelope * originFade * amplitude;
        #ifdef WATER_NORMALS
          float originT = clamp(d / 0.12, 0.0, 1.0);
          float originDerivative = 6.0 * originT * (1.0 - originT) / 0.12;
          float radialDerivative = amplitude * envelope * (
            (12.0 * cos(front * 12.0) - 4.4 * front * ring) * originFade + ring * originDerivative
          );
          gradient += radialDerivative * offset / max(d, 0.0001);
        #endif
      }
    }
    return vec3(h, gradient);
  }
`;

const vertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  uniform mat4 uRefractionMatrix;
  uniform mat4 uRefractionViewMatrix;
  attribute float aRadial;
  varying vec4 vReflection;
  varying vec4 vScreenPosition;
  varying vec3 vWorldPosition;
  varying float vViewDepth;
  varying float vRadial;
  ${waveGLSL}
  void main() {
    vec3 p = position;
    vec3 initialWorld = (modelMatrix * vec4(p, 1.0)).xyz;
    float edgeFade = smoothstep(0.0, 0.10, 1.0 - aRadial);
    p.z += waterSample(initialWorld.xz).x * edgeFade;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    vWorldPosition = world.xyz;
    vReflection = textureMatrix * vec4(p, 1.0);
    vViewDepth = -(uRefractionViewMatrix * world).z;
    vRadial = aRadial;
    gl_Position = projectionMatrix * view;
    vScreenPosition = uRefractionMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  #define WATER_NORMALS
  uniform sampler2D tDiffuse;
  uniform sampler2D uRefraction;
  uniform sampler2D uDepth;
  uniform vec3 uWaterColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec2 uCameraRange;
  uniform vec2 uReflectionTexel;
  uniform float uRefractionReady;
  varying vec4 vReflection;
  varying vec4 vScreenPosition;
  varying vec3 vWorldPosition;
  varying float vViewDepth;
  varying float vRadial;
  ${waveGLSL}

  float viewDepth(float depth) {
    float near = uCameraRange.x;
    float far = uCameraRange.y;
    return near * far / (far - depth * (far - near));
  }

  void main() {
    vec2 p = vWorldPosition.xz;
    vec2 waveGradient = waterSample(p).yz;
    float dx = waveGradient.x;
    float dz = waveGradient.y;
    float capillary = (0.001 + uWind * 0.0015) * (0.3 + uWaves);
    dx += sin(p.x * 19.0 + p.y * 12.0 + uTime * 1.8) * capillary * 7.0;
    dz += cos(p.x * 13.0 - p.y * 17.0 - uTime * 1.1) * capillary * 7.0;
    float edgeFade = smoothstep(0.0, 0.1, 1.0 - vRadial);
    vec3 normal = normalize(vec3(-dx * edgeFade, 1.0, -dz * edgeFade));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = max(dot(normal, viewDirection), 0.0);
    float fresnel = 0.035 + 0.965 * pow(1.0 - facing, 4.5);

    vec2 screenUV = vScreenPosition.xy / vScreenPosition.w * 0.5 + 0.5;
    vec2 distortion = normal.xz * 0.022;
    vec2 refractUV = clamp(screenUV + distortion, vec2(0.002), vec2(0.998));
    float refractDistance = viewDepth(texture2D(uDepth, refractUV).x);
    // Keep foreground objects from bleeding into the refracted pond floor.
    if (refractDistance < vViewDepth - 0.015) {
      refractUV = screenUV;
      refractDistance = viewDepth(texture2D(uDepth, refractUV).x);
    }
    float depth = clamp((refractDistance - vViewDepth) * max(viewDirection.y, 0.2), 0.0, 2.5);
    vec3 bed = texture2D(uRefraction, refractUV).rgb;
    bed = mix(uWaterColor * 0.6, bed, uRefractionReady);
    float absorption = 1.0 - exp(-depth * 2.25);
    vec3 transmitted = mix(bed * vec3(0.83, 0.99, 0.96), uWaterColor, 0.26 + absorption * 0.64);

    // Soft moving caustic filaments remain visible only in the clear shallows.
    vec2 causticP = p * 3.7 + vec2(sin(p.y * 1.2 + uTime * 0.32), cos(p.x * 1.4 - uTime * 0.28)) * 0.35;
    float filaments = abs(sin(causticP.x + causticP.y) * sin(causticP.y - causticP.x * 0.7));
    float caustic = pow(1.0 - filaments, 15.0) * 0.035;
    transmitted += caustic * uSunColor * (1.0 - absorption * 0.6) * edgeFade;

    vec2 reflectionUV = vReflection.xy / vReflection.w;
    reflectionUV = clamp(reflectionUV + normal.xz * 0.028, vec2(0.004), vec2(0.996));
    vec2 blur = uReflectionTexel * 0.85;
    vec3 reflected = texture2D(tDiffuse, reflectionUV).rgb * 0.4;
    reflected += texture2D(tDiffuse, reflectionUV + vec2(blur.x, 0.0)).rgb * 0.15;
    reflected += texture2D(tDiffuse, reflectionUV - vec2(blur.x, 0.0)).rgb * 0.15;
    reflected += texture2D(tDiffuse, reflectionUV + vec2(0.0, blur.y)).rgb * 0.15;
    reflected += texture2D(tDiffuse, reflectionUV - vec2(0.0, blur.y)).rgb * 0.15;
    reflected = mix(reflected, uWaterColor, 0.1);
    vec3 color = mix(transmitted, reflected, clamp(fresnel * 0.82 + 0.13, 0.0, 0.92));
    vec3 halfDirection = normalize(normalize(uSunDirection) + viewDirection);
    float sun = pow(max(dot(normal, halfDirection), 0.0), 210.0);
    float broadSun = pow(max(dot(normal, halfDirection), 0.0), 28.0);
    color += uSunColor * (sun * 0.48 + broadSun * 0.025);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A radially subdivided surface keeps animated vertices evenly distributed. */
function createPondGeometry(shoreRadius) {
  const segments = 112;
  const rings = 32;
  const positions = [0, 0, 0];
  const radial = [0];
  const indices = [];
  for (let ring = 1; ring <= rings; ring++) {
    const fraction = ring / rings;
    for (let segment = 0; segment < segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const radius = shoreRadius(angle) * fraction;
      positions.push(Math.cos(angle) * radius, -Math.sin(angle) * radius, 0);
      radial.push(fraction);
    }
  }
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    indices.push(0, 1 + next, 1 + segment);
  }
  for (let ring = 1; ring < rings; ring++) {
    const inner = 1 + (ring - 1) * segments;
    const outer = inner + segments;
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      indices.push(inner + segment, inner + next, outer + segment);
      indices.push(inner + next, outer + next, outer + segment);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("aRadial", new THREE.Float32BufferAttribute(radial, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createWater({
  scene,
  renderer,
  camera,
  shoreRadius,
  waterLevel = 0.12,
  offscreenHidden = [],
}) {
  const boundary =
    shoreRadius ||
    ((angle) =>
      1 /
      Math.sqrt((Math.cos(angle) / 3.55) ** 2 + (Math.sin(angle) / 2.55) ** 2));
  const geometry = createPondGeometry(boundary);
  const refractionTarget = new THREE.WebGLRenderTarget(512, 512, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });
  refractionTarget.depthTexture = new THREE.DepthTexture(
    512,
    512,
    THREE.UnsignedIntType,
  );
  refractionTarget.texture.name = "Stillwater refraction";

  const mesh = new Reflector(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.003,
    multisample: 0,
    shader: {
      name: "StillwaterSurface",
      uniforms: {
        tDiffuse: { value: null },
        color: { value: new THREE.Color(0xffffff) },
        textureMatrix: { value: reflectionMatrix.clone() },
        uRefractionMatrix: { value: new THREE.Matrix4() },
        uRefractionViewMatrix: { value: new THREE.Matrix4() },
        uTime: { value: 0 },
        uWaves: { value: 0.45 },
        uWind: { value: 0.3 },
        uRipples: {
          value: Array.from(
            { length: RIPPLE_COUNT },
            () => new THREE.Vector4(0, 0, -100, 0),
          ),
        },
        uRefraction: { value: null },
        uDepth: { value: null },
        uWaterColor: { value: new THREE.Color("#1a7f79") },
        uSunDirection: { value: new THREE.Vector3(-3, 7, 4).normalize() },
        uSunColor: { value: new THREE.Color("#fff2ca") },
        uCameraRange: { value: new THREE.Vector2(camera.near, camera.far) },
        uReflectionTexel: { value: new THREE.Vector2(1 / 512, 1 / 512) },
        uRefractionReady: { value: 0 },
      },
      vertexShader,
      fragmentShader,
    },
  });
  mesh.name = "Pond water";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = waterLevel;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  // Assign live textures after Reflector clones the initial shader uniforms.
  const uniforms = mesh.material.uniforms;
  uniforms.uRefraction.value = refractionTarget.texture;
  uniforms.uDepth.value = refractionTarget.depthTexture;
  scene.add(mesh);

  let rippleIndex = 0;
  let currentTime = 0;
  let frame = 0;
  let reflectionReady = false;
  let refractionReady = false;
  let renderingRefraction = false;
  let disposed = false;
  let highQuality = true;
  const captureHidden = [...new Set(offscreenHidden)].filter(
    (object) => object?.isObject3D && object !== mesh,
  );

  function captureState() {
    const state = {
      target: renderer.getRenderTarget(),
      face: renderer.getActiveCubeFace(),
      mip: renderer.getActiveMipmapLevel(),
      visible: mesh.visible,
      xr: renderer.xr.enabled,
      shadowAutoUpdate: renderer.shadowMap.autoUpdate,
      viewport: renderer.getViewport(new THREE.Vector4()),
      scissor: renderer.getScissor(new THREE.Vector4()),
      scissorTest: renderer.getScissorTest(),
      autoClear: renderer.autoClear,
      hiddenVisibility: captureHidden.map((object) => object.visible),
    };
    for (const object of captureHidden) object.visible = false;
    return state;
  }

  function restoreState(state) {
    mesh.visible = state.visible;
    captureHidden.forEach((object, index) => {
      object.visible = state.hiddenVisibility[index];
    });
    renderer.xr.enabled = state.xr;
    renderer.shadowMap.autoUpdate = state.shadowAutoUpdate;
    renderer.autoClear = state.autoClear;
    renderer.setRenderTarget(state.target, state.face, state.mip);
    renderer.setViewport(state.viewport);
    renderer.setScissor(state.scissor);
    renderer.setScissorTest(state.scissorTest);
  }

  const reflectorRender = mesh.onBeforeRender;
  mesh.onBeforeRender = function (...args) {
    if (renderingRefraction || disposed) return;
    // Stagger the expensive passes instead of doing both on every other frame.
    if (!reflectionReady || frame % (highQuality ? 2 : 3) === 1) {
      const state = captureState();
      try {
        reflectorRender.apply(this, args);
        reflectionReady = true;
      } finally {
        restoreState(state);
      }
    }
  };

  function renderRefraction() {
    if (
      disposed ||
      renderingRefraction ||
      (refractionReady && frame % (highQuality ? 2 : 3) !== 0)
    )
      return;
    const state = captureState();
    renderingRefraction = true;
    try {
      mesh.visible = false;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.autoClear = true;
      renderer.setRenderTarget(refractionTarget);
      renderer.setScissorTest(false);
      camera.updateMatrixWorld();
      uniforms.uRefractionViewMatrix.value.copy(camera.matrixWorldInverse);
      uniforms.uRefractionMatrix.value.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      renderer.render(scene, camera);
      refractionReady = true;
      uniforms.uRefractionReady.value = 1;
    } finally {
      restoreState(state);
      renderingRefraction = false;
    }
  }

  return {
    mesh,
    addRipple(x, z, strength = 1) {
      const radius = Math.hypot(x, z);
      if (
        !Number.isFinite(radius) ||
        radius > boundary(Math.atan2(z, x)) + 0.15
      )
        return;
      uniforms.uRipples.value[rippleIndex].set(
        x,
        z,
        currentTime,
        THREE.MathUtils.clamp(strength, 0.05, 2.5),
      );
      rippleIndex = (rippleIndex + 1) % RIPPLE_COUNT;
    },
    update(time) {
      currentTime = time;
      uniforms.uTime.value = time;
      uniforms.uCameraRange.value.set(camera.near, camera.far);
      frame++;
    },
    setWaves(amount) {
      uniforms.uWaves.value = THREE.MathUtils.clamp(
        amount > 1 ? amount / 100 : amount,
        0,
        1,
      );
    },
    setWind(amount) {
      uniforms.uWind.value = THREE.MathUtils.clamp(
        amount > 1 ? amount / 100 : amount,
        0,
        1,
      );
    },
    setLighting(preset) {
      if (preset && typeof preset === "object") {
        if (preset.sunDirection)
          uniforms.uSunDirection.value.copy(preset.sunDirection).normalize();
        if (preset.sunColor) uniforms.uSunColor.value.set(preset.sunColor);
        if (preset.waterColor)
          uniforms.uWaterColor.value.set(preset.waterColor);
      } else {
        const name = String(preset).toLowerCase();
        const sunset = /gold|sunset|warm/.test(name);
        const dusk = /dusk|night|moon/.test(name);
        uniforms.uSunColor.value.set(
          dusk ? "#93adc7" : sunset ? "#ffce98" : "#fff2ca",
        );
        uniforms.uWaterColor.value.set(
          dusk ? "#164e55" : sunset ? "#247c71" : "#1a7f79",
        );
        uniforms.uSunDirection.value
          .set(-3, dusk ? 3 : sunset ? 2 : 7, 4)
          .normalize();
      }
      reflectionReady = false;
      refractionReady = false;
    },
    setQuality(high) {
      highQuality = Boolean(high);
      const size = highQuality ? 512 : 256;
      refractionTarget.setSize(size, size);
      mesh.getRenderTarget().setSize(size, size);
      uniforms.uReflectionTexel.value.set(1 / size, 1 / size);
      reflectionReady = false;
      refractionReady = false;
    },
    renderRefraction,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(mesh);
      refractionTarget.dispose();
      mesh.dispose();
      geometry.dispose();
    },
  };
}
