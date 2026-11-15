import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  createEnvironment,
  createBall,
  shoreRadius,
  physicalGroundHeight,
  isWater,
  WATER_LEVEL,
  BALL_RADIUS,
} from "./environment.js";
import { createWater } from "./water.js";
import { BallPhysics } from "./physics.js";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
let toastTimeout;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    2600,
  );
}

async function start() {
  const canvas = $("#scene");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e8e9de");
  scene.fog = new THREE.Fog("#e8e9de", 28, 75);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  const initialPosition = new THREE.Vector3(10.5, 10.5, 15.8);
  const initialTarget = new THREE.Vector3(0, 0.1, 0);
  camera.position.copy(initialPosition);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(initialTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 8;
  controls.maxDistance = 29;
  controls.maxPolarAngle = Math.PI * 0.465;
  controls.minPolarAngle = 0.22;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.update();

  const hemi = new THREE.HemisphereLight("#f3f5e8", "#ad9b78", 2.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffe0ae", 3.4);
  sun.position.set(-7, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 9,
    bottom: -9,
    near: 0.5,
    far: 35,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#c8e3f5", 0.6);
  fill.position.set(6, 6, -8);
  scene.add(fill);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environmentMap = pmrem.fromScene(room, 0.04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.35;
  room.dispose();
  pmrem.dispose();
  const environment = createEnvironment(scene);
  const ball = createBall();
  scene.add(ball);
  const water = createWater({
    scene,
    renderer,
    camera,
    shoreRadius,
    waterLevel: WATER_LEVEL,
    offscreenHidden: [environment.grass],
  });
  water.setWind(0.35);
  water.setWaves(0.4);

  const droplets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.025, 5, 4),
    new THREE.MeshStandardMaterial({
      color: "#b6e1d1",
      metalness: 0.2,
      roughness: 0.12,
    }),
    100,
  );
  droplets.count = 0;
  droplets.frustumCulled = false;
  scene.add(droplets);
  const splashParticles = [];
  const dummy = new THREE.Object3D();
  let rippleCount = 0;
  const physics = new BallPhysics({
    radius: BALL_RADIUS,
    waterLevel: WATER_LEVEL,
    groundHeight: physicalGroundHeight,
    isWater,
    onImpact(x, z, strength) {
      water.addRipple(x, z, strength);
      rippleCount++;
      if (strength > 0.38) {
        splash(x, z, strength);
        playSplash(strength);
      }
    },
  });
  ball.position.copy(physics.position);
  function splash(x, z, strength) {
    for (let i = 0; i < Math.min(30, Math.ceil(strength * 25)); i++) {
      const a = Math.random() * Math.PI * 2,
        v = 0.3 + Math.random() * 1.3;
      splashParticles.push({
        p: new THREE.Vector3(x, WATER_LEVEL + 0.05, z),
        v: new THREE.Vector3(
          Math.cos(a) * v,
          (1 + Math.random() * 1.8) * strength,
          Math.sin(a) * v,
        ),
        life: 0.45 + Math.random() * 0.4,
      });
    }
    if (splashParticles.length > 100)
      splashParticles.splice(0, splashParticles.length - 100);
  }
  function updateSplash(dt) {
    for (let i = splashParticles.length - 1; i >= 0; i--) {
      const p = splashParticles[i];
      p.life -= dt;
      p.v.y -= 9.81 * dt;
      p.p.addScaledVector(p.v, dt);
      if (p.life < 0 || p.p.y < WATER_LEVEL) {
        splashParticles.splice(i, 1);
        continue;
      }
    }
    droplets.count = splashParticles.length;
    splashParticles.forEach((p, i) => {
      dummy.position.copy(p.p);
      dummy.scale.setScalar(Math.min(1, p.life * 4));
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      droplets.setMatrixAt(i, dummy.matrix);
    });
    droplets.instanceMatrix.needsUpdate = true;
  }

  let wind = 0.35,
    paused = false,
    highQuality = true,
    renderScale = 1,
    elapsed = 0,
    qualityManual = false;
  function setPaused(value) {
    paused = value;
    $("#pause").setAttribute("aria-pressed", String(paused));
    $("#pause").setAttribute(
      "aria-label",
      paused ? "Resume animation" : "Pause animation",
    );
    $("#pause").title = paused ? "Resume animation" : "Pause animation";
    $("#pause use").setAttribute("href", paused ? "#i-play" : "#i-pause");
  }
  function setQuality(high, automatic = false) {
    highQuality = high;
    renderScale = high ? 1 : 0.85;
    renderer.setPixelRatio(
      high
        ? Math.min(devicePixelRatio, 1.5)
        : Math.min(devicePixelRatio, 1) * renderScale,
    );
    water.setQuality(high);
    environment.setQuality(high);
    $("#quality").innerHTML =
      '<span class="quality-dot"></span>' + (high ? "High" : "Balanced");
    $("#quality").setAttribute(
      "aria-label",
      "Rendering quality: " + (high ? "High" : "Balanced"),
    );
    resize();
    if (automatic)
      toast("Balanced rendering keeps this little world running smoothly.");
  }
  $("#quality").addEventListener("click", () => {
    qualityManual = true;
    setQuality(!highQuality);
  });
  $("#pause").addEventListener("click", () => setPaused(!paused));
  $("#reset-view").addEventListener("click", () => {
    controls.enableDamping = false;
    controls.update();
    camera.position.copy(initialPosition);
    controls.target.copy(initialTarget);
    controls.update();
    controls.enableDamping = true;
    toast("Back to your favorite spot.");
  });
  function drop() {
    if (dragging) release({ pointerId: activePointer }, true);
    setPaused(false);
    physics.dropIntoPond();
    toast("A little splash, just for you.");
  }
  function reset() {
    if (dragging) release({ pointerId: activePointer }, true);
    physics.reset();
    ball.position.copy(physics.position);
    renderer.shadowMap.needsUpdate = true;
    toast("Ready for another throw.");
  }
  $("#drop-ball").addEventListener("click", drop);
  $("#reset-ball").addEventListener("click", reset);
  $("#wind").addEventListener("input", (e) => {
    wind = Number(e.target.value);
    water.setWind(wind);
    e.target.style.setProperty("--range-fill", wind * 100 + "%");
    $("#wind-label").textContent =
      wind < 0.12
        ? "Perfectly still"
        : wind < 0.55
          ? "Gentle breeze"
          : "Fresh breeze";
  });
  $("#waves").addEventListener("input", (e) => {
    const amount = Number(e.target.value);
    water.setWaves(amount);
    e.target.style.setProperty("--range-fill", amount * 100 + "%");
    $("#waves-label").textContent =
      amount < 0.15
        ? "Quiet water"
        : amount < 0.65
          ? "Soft ripples"
          : "Playful waves";
  });
  const moods = {
    morning: {
      background: "#e6ece5",
      sun: "#fff4d9",
      intensity: 2.8,
      hemi: 1.9,
      position: [-5, 12, 5],
      exposure: 1.02,
    },
    golden: {
      background: "#e8e9de",
      sun: "#ffe4bb",
      intensity: 2.9,
      hemi: 1.9,
      position: [-7, 10, 6],
      exposure: 1.06,
    },
    dusk: {
      background: "#a9b8bd",
      sun: "#edc5b5",
      intensity: 1.5,
      hemi: 1.2,
      position: [-8, 5, -2],
      exposure: 1.05,
    },
  };
  function mood(name) {
    const m = moods[name];
    scene.background.set(m.background);
    scene.fog.color.set(m.background);
    sun.color.set(m.sun);
    sun.intensity = m.intensity;
    sun.position.fromArray(m.position);
    hemi.intensity = m.hemi;
    renderer.toneMappingExposure = m.exposure;
    renderer.shadowMap.needsUpdate = true;
    water.setLighting(name);
    water.setLighting({ sunDirection: sun.position, sunColor: m.sun });
    document.querySelectorAll("[data-light]").forEach((b) => {
      const active = b.dataset.light === name;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }
  document
    .querySelectorAll("[data-light]")
    .forEach((b) => b.addEventListener("click", () => mood(b.dataset.light)));
  mood("golden");

  function togglePanel() {
    const collapsed = $(".environment-panel").classList.toggle("collapsed");
    $("#panel-content").hidden = collapsed;
    $("#toggle-panel").setAttribute("aria-expanded", String(!collapsed));
  }
  $("#toggle-panel").addEventListener("click", togglePanel);
  if (innerWidth <= 600) togglePanel();
  $("#about").addEventListener("click", () => $("#about-dialog").showModal());
  $("#close-about").addEventListener("click", () => $("#about-dialog").close());
  $("#about-dialog").addEventListener("click", (e) => {
    if (e.target === $("#about-dialog")) {
      const rect = e.target.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        e.target.close();
    }
  });

  let audioContext,
    master,
    audioEnabled = false,
    birdTimer;
  function noiseBuffer(seconds) {
    const buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * seconds,
      audioContext.sampleRate,
    );
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      previous = (previous + Math.random() * 0.04 - 0.02) / 1.02;
      data[i] = previous * 4;
    }
    return buffer;
  }
  function bird() {
    if (!audioEnabled) return;
    const now = audioContext.currentTime;
    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator(),
        gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(2200 + i * 300, now + i * 0.15);
      oscillator.frequency.exponentialRampToValueAtTime(
        3500 + i * 100,
        now + i * 0.15 + 0.09,
      );
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.025, now + i * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.15);
      oscillator.connect(gain).connect(master);
      oscillator.start(now + i * 0.15);
      oscillator.stop(now + i * 0.15 + 0.2);
    }
  }
  async function toggleAudio() {
    try {
      if (!audioContext) {
        audioContext = new AudioContext();
        master = audioContext.createGain();
        master.gain.value = 0;
        master.connect(audioContext.destination);
        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer(4);
        noise.loop = true;
        const filter = audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 650;
        const gain = audioContext.createGain();
        gain.gain.value = 0.32;
        noise.connect(filter).connect(gain).connect(master);
        noise.start();
      }
      await audioContext.resume();
      audioEnabled = !audioEnabled;
      master.gain.setTargetAtTime(
        audioEnabled ? 0.32 : 0,
        audioContext.currentTime,
        0.3,
      );
      $("#sound").setAttribute("aria-pressed", String(audioEnabled));
      $("#sound").setAttribute(
        "aria-label",
        audioEnabled ? "Mute nature sounds" : "Enable nature sounds",
      );
      $("#sound span").textContent = audioEnabled ? "Sound on" : "Sound off";
      clearInterval(birdTimer);
      if (audioEnabled) {
        bird();
        birdTimer = setInterval(bird, 6500);
      }
    } catch {
      toast("Audio is unavailable in this browser.");
    }
  }
  function playSplash(strength) {
    if (!audioEnabled || !audioContext) return;
    const source = audioContext.createBufferSource(),
      gain = audioContext.createGain(),
      filter = audioContext.createBiquadFilter();
    source.buffer = noiseBuffer(0.5);
    filter.type = "lowpass";
    filter.frequency.value = 1500;
    gain.gain.setValueAtTime(strength * 0.8, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.45,
    );
    source.connect(filter).connect(gain).connect(master);
    source.start();
  }
  $("#sound").addEventListener("click", toggleAudio);

  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    dragPlane = new THREE.Plane(),
    hit = new THREE.Vector3(),
    offset = new THREE.Vector3();
  let dragging = false,
    activePointer = null,
    samples = [];
  function cast(event) {
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || dragging) return;
      cast(event);
      if (!raycaster.intersectObject(ball).length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dragging = true;
      activePointer = event.pointerId;
      controls.enabled = false;
      setPaused(false);
      physics.grab();
      const normal = camera.getWorldDirection(new THREE.Vector3());
      dragPlane.setFromNormalAndCoplanarPoint(normal, physics.position);
      raycaster.ray.intersectPlane(dragPlane, hit);
      offset.copy(physics.position).sub(hit);
      samples = [{ t: performance.now(), p: physics.position.clone() }];
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      $("#interaction-hint strong").textContent =
        "A little momentum goes a long way.";
    },
    { capture: true },
  );
  canvas.addEventListener("pointermove", (event) => {
    cast(event);
    if (dragging && event.pointerId === activePointer) {
      if (raycaster.ray.intersectPlane(dragPlane, hit)) {
        physics.moveHeld(hit.add(offset));
        ball.position.copy(physics.position);
        const now = performance.now();
        samples.push({ t: now, p: physics.position.clone() });
        samples = samples.filter((s) => now - s.t < 120);
      }
      return;
    }
    canvas.style.cursor = raycaster.intersectObject(ball).length
      ? "grab"
      : "default";
  });
  function release(event, cancelled = false) {
    if (!dragging || event.pointerId !== activePointer) return;
    const now = performance.now();
    const recent = samples.filter((s) => now - s.t < 130);
    let velocity = new THREE.Vector3();
    if (!cancelled && recent.length >= 2) {
      const first = recent[0],
        last = recent.at(-1);
      velocity
        .copy(last.p)
        .sub(first.p)
        .divideScalar(Math.max((last.t - first.t) / 1000, 0.016))
        .multiplyScalar(0.85);
    }
    physics.release(velocity);
    dragging = false;
    activePointer = null;
    controls.enabled = true;
    canvas.style.cursor = "grab";
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    $("#interaction-hint strong").textContent =
      "Grab the ball. Make some ripples.";
  }
  canvas.addEventListener("pointerup", (e) => release(e));
  canvas.addEventListener("pointercancel", (e) => release(e, true));
  canvas.addEventListener("lostpointercapture", (e) => release(e, true));
  document.addEventListener("keydown", (event) => {
    if (
      /INPUT|TEXTAREA|BUTTON/.test(event.target.tagName) ||
      $("#about-dialog").open
    )
      return;
    if (event.code === "Space") {
      event.preventDefault();
      drop();
    }
    if (event.code === "KeyR") reset();
    if (event.code === "KeyP") setPaused(!paused);
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    setPaused(true);
    toast("Graphics paused. Reload to restore the scene.");
  });

  function resize() {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 650 ? 70 : width < 1000 ? 45 : 37;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  const clock = new THREE.Clock();
  let fpsTime = 0,
    frames = 0,
    lowFrames = 0;
  const rollingAxis = new THREE.Vector3();
  function animate() {
    const frameDelta = clock.getDelta(),
      dt = Math.min(frameDelta, 0.1);
    controls.update();
    if (!paused && !document.hidden) {
      elapsed += dt;
      physics.update(dt);
      if (
        ball.position.distanceToSquared(physics.position) > 0.000001 ||
        dragging
      )
        renderer.shadowMap.needsUpdate = true;
      ball.position.copy(physics.position);
      const speed = Math.hypot(physics.velocity.x, physics.velocity.z);
      if (speed > 0.02) {
        rollingAxis.set(physics.velocity.z, 0, -physics.velocity.x).normalize();
        ball.rotateOnWorldAxis(rollingAxis, (speed * dt) / BALL_RADIUS);
      }
      environment.update(elapsed, wind);
      updateSplash(dt);
    }
    water.update(elapsed, dt);
    water.renderRefraction();
    renderer.render(scene, camera);
    frames++;
    fpsTime += frameDelta;
    if (fpsTime >= 1) {
      const fps = Math.round(frames / fpsTime);
      $("#fps").textContent = String(fps);
      lowFrames = fps < 55 ? lowFrames + 1 : 0;
      if (lowFrames >= 3 && !qualityManual) {
        if (highQuality) setQuality(false, true);
        else if (renderScale > 0.65) {
          renderScale = Math.max(0.65, renderScale - 0.1);
          renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * renderScale);
          resize();
        }
        lowFrames = 0;
      }
      fpsTime = 0;
      frames = 0;
    }
  }
  renderer.setAnimationLoop(animate);
  await renderer.compileAsync(scene, camera);
  $("#loading").classList.add("hidden");
  if (import.meta.env.DEV)
    window.__stillwater = {
      scene,
      camera,
      renderer,
      physics,
      water,
      controls,
      getState: () => ({
        paused,
        highQuality,
        renderScale,
        rippleCount,
        position: physics.position.toArray(),
        velocity: physics.velocity.toArray(),
        held: physics.held,
        elapsed,
        ballScreen: (() => {
          const p = ball.position.clone().project(camera),
            r = canvas.getBoundingClientRect();
          return {
            x: r.left + ((p.x + 1) * r.width) / 2,
            y: r.top + ((1 - p.y) * r.height) / 2,
          };
        })(),
      }),
    };
}
start().catch((error) => {
  console.error(error);
  $("#loading").innerHTML =
    "<strong>This little world needs WebGL.</strong><span>Enable hardware acceleration in your browser, then reload.</span>";
});
