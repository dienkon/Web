import * as THREE from 'three';

export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function drawnTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function texturedSurface(base, accent, seed) {
  const rand = random(seed);
  return drawnTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      ctx.globalAlpha = rand() * .17;
      ctx.fillStyle = rand() > .45 ? accent : '#321721';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 2);
    }
  });
}

export function disposeTree(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of [object.material].flat()) materials.add(material);
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    for (const uniform of Object.values(material.uniforms ?? {})) {
      if (uniform.value?.isTexture) textures.add(uniform.value);
    }
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export function makeSky() {
  const material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { mood: { value: 0 }, clock: { value: 0 }, aspect: { value: 1 } },
    vertexShader: `
      varying vec2 coords;
      void main() { coords = uv; gl_Position = vec4(position.xy, .9999, 1.0); }
    `,
    fragmentShader: `
      uniform float mood, clock, aspect;
      varying vec2 coords;
      float hash(vec2 n) { return fract(sin(dot(n, vec2(12.9898,78.233))) * 43758.5453); }
      void main() {
        vec2 p = coords;
        vec3 sky = mix(vec3(.004,.008,.022), vec3(.018,.013,.045), p.y);
        vec2 q = (p-vec2(.66,.36))*vec2(aspect,1.0);
        float fog = exp(-dot(q,q)*3.0) * (1.0-smoothstep(.3,1.0,p.y));
        sky += fog*mix(vec3(.045,.024,.074),vec3(.17,.058,.095), mood);
        float horizon = exp(-abs(p.y-.31)*17.0)*exp(-dot(q,q)*1.7);
        sky += horizon*mix(vec3(.015,.008,.036),vec3(.21,.077,.078),mood);
        vec2 cell = p*vec2(125.0 * aspect,125.0);
        float seed = hash(floor(cell));
        vec2 star = fract(cell)-vec2(hash(floor(cell)+.19),hash(floor(cell)+.75));
        float shine = (1.0-smoothstep(.015,.16,length(star)))*step(.976,seed);
        sky += shine*(.16+.14*sin(clock*(.32+seed)+seed*121.0))*vec3(1.,.77,.65);
        gl_FragColor = vec4(sky,1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  sky.frustumCulled = false;
  sky.renderOrder = -50;
  return sky;
}

export function glow(color, radius = 1) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tint: { value: new THREE.Color(color) }, opacity: { value: .6 } },
    vertexShader: `
      varying vec2 coords;
      void main() { coords = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
    `,
    fragmentShader: `
      uniform vec3 tint; uniform float opacity; varying vec2 coords;
      void main() { float d = length(coords-.5)*2.; gl_FragColor=vec4(tint,exp(-d*d*5.)*(1.-smoothstep(.6,1.,d))*opacity); }
    `,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
}
