import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const WATER_LEVEL = 0.12;
export const BALL_RADIUS = 0.36;
export function shoreRadius(a) {
  return (
    (1 / Math.sqrt((Math.cos(a) / 3.55) ** 2 + (Math.sin(a) / 2.55) ** 2)) *
    (1 + 0.065 * Math.sin(a * 3 + 0.8) + 0.035 * Math.sin(a * 5 - 0.5))
  );
}
export function pondDistance(x, z) {
  return Math.hypot(x, z) / shoreRadius(Math.atan2(z, x));
}
export const isWater = (x, z) => pondDistance(x, z) < 0.99;
const smooth = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export function groundHeight(x, z) {
  const r = pondDistance(x, z);
  return (
    -0.65 +
    0.98 * smooth(0.67, 1.1, r) +
    Math.sin(x * 1.9 + z) * Math.sin(z * 1.7) * 0.045 * smooth(1, 1.4, r)
  );
}
let seed = 8271;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const range = (a, b) => a + random() * (b - a);
const outerRadius = (a) =>
  (1 / Math.sqrt((Math.cos(a) / 7.15) ** 2 + (Math.sin(a) / 5.3) ** 2)) *
  (1 + Math.sin(a * 5) * 0.025 + Math.sin(a * 3) * 0.035);
export function physicalGroundHeight(x, z) {
  return Math.hypot(x, z) > outerRadius(Math.atan2(z, x))
    ? -1.02
    : groundHeight(x, z);
}

export function createEnvironment(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const positions = [],
    colors = [],
    indices = [];
  const radial = 80,
    angular = 192;
  const green = new THREE.Color("#819c45"),
    lightGreen = new THREE.Color("#9eac61"),
    sand = new THREE.Color("#b9a77e"),
    bed = new THREE.Color("#6e9982");
  for (let j = 0; j <= radial; j++)
    for (let i = 0; i <= angular; i++) {
      const a = (i / angular) * Math.PI * 2,
        r = (outerRadius(a) * j) / radial;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r,
        h = groundHeight(x, z),
        pd = pondDistance(x, z);
      positions.push(x, h, z);
      const c =
        pd < 0.83
          ? bed.clone()
          : pd < 1.1
            ? sand.clone()
            : green
                .clone()
                .lerp(lightGreen, (Math.sin(x * 3 + z * 2) + 1) * 0.25);
      if (pd < 0.83) c.multiplyScalar(0.83 + random() * 0.25);
      colors.push(c.r, c.g, c.b);
      if (j < radial && i < angular) {
        const k = j * (angular + 1) + i;
        indices.push(
          k,
          k + 1,
          k + angular + 1,
          k + 1,
          k + angular + 2,
          k + angular + 1,
        );
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const land = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98 }),
  );
  land.receiveShadow = true;
  group.add(land);

  const sidePositions = [],
    sideIndices = [];
  for (let i = 0; i <= angular; i++) {
    const a = (i / angular) * Math.PI * 2,
      r = outerRadius(a),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    sidePositions.push(
      x,
      groundHeight(x, z) - 0.01,
      z,
      x * 0.96,
      -0.65,
      z * 0.96,
      x * 0.88,
      -0.95,
      z * 0.88,
    );
    if (i < angular) {
      const k = i * 3;
      sideIndices.push(
        k,
        k + 3,
        k + 1,
        k + 1,
        k + 3,
        k + 4,
        k + 1,
        k + 4,
        k + 2,
        k + 2,
        k + 4,
        k + 5,
      );
    }
  }
  const sideGeo = new THREE.BufferGeometry();
  sideGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(sidePositions, 3),
  );
  sideGeo.setIndex(sideIndices);
  sideGeo.computeVertexNormals();
  const side = new THREE.Mesh(
    sideGeo,
    new THREE.MeshStandardMaterial({ color: "#b3a081", roughness: 1 }),
  );
  side.castShadow = true;
  side.receiveShadow = true;
  group.add(side);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: "#e8e9de", roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // Each instance is a three-blade tuft; one draw call animates the whole meadow.
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.045, 0, 0, 0.045, 0, 0, 0.02, 0.7, 0.045, 0, 1, 0.12, -0.025, 0,
        0.015, 0.025, 0, -0.015, -0.16, 0.65, -0.04, -0.21, 0.85, -0.04, 0, 0,
        -0.04, 0, 0, 0.04, 0.16, 0.55, 0, 0.2, 0.78, 0.02,
      ],
      3,
    ),
  );
  blade.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11]);
  blade.computeVertexNormals();
  const grassUniforms = { time: { value: 0 }, wind: { value: 0.35 } };
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: "#9bb95c",
    side: THREE.DoubleSide,
    roughness: 0.94,
  });
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.time;
    shader.uniforms.uWind = grassUniforms.wind;
    shader.vertexShader =
      "uniform float uTime; uniform float uWind;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nfloat sway = sin(uTime * 1.8 + instanceMatrix[3].x * .8 + instanceMatrix[3].z * 1.2); transformed.x += sway * position.y * position.y * uWind * .38; transformed.z += cos(uTime + instanceMatrix[3].z) * position.y * position.y * uWind * .16;",
    );
  };
  const grass = new THREE.InstancedMesh(blade, grassMaterial, 18000);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  let count = 0;
  for (let i = 0; i < 30000 && count < 18000; i++) {
    const x = range(-7.1, 7.1),
      z = range(-5.3, 5.3),
      a = Math.atan2(z, x);
    if (Math.hypot(x, z) > outerRadius(a) - 0.09 || pondDistance(x, z) < 1.12)
      continue;
    dummy.position.set(x, groundHeight(x, z), z);
    dummy.rotation.set(0, range(0, Math.PI * 2), 0);
    const h = range(0.13, 0.36);
    dummy.scale.set(range(0.65, 1.15), h, range(0.65, 1.15));
    dummy.updateMatrix();
    grass.setMatrixAt(count, dummy.matrix);
    c.setHSL(range(0.225, 0.275), range(0.25, 0.39), range(0.27, 0.47));
    grass.setColorAt(count++, c);
  }
  grass.count = count;
  grass.receiveShadow = true;
  group.add(grass);

  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(rp, i);
    v.multiplyScalar(0.88 + 0.14 * Math.sin(v.x * 7 + v.z * 5));
    rp.setXYZ(i, v.x, v.y, v.z);
  }
  rockGeo.computeVertexNormals();
  const rocks = new THREE.InstancedMesh(
    rockGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.93, color: "#b4b5a9" }),
    100,
  );
  for (let i = 0; i < 100; i++) {
    const a = range(0, Math.PI * 2),
      r = shoreRadius(a) * range(1.035, 1.17),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const size = i < 12 ? range(0.22, 0.48) : range(0.06, 0.19);
    dummy.position.set(x, groundHeight(x, z) + size * 0.25, z);
    dummy.rotation.set(range(-0.5, 0.5), range(0, 6), range(-0.3, 0.3));
    dummy.scale.set(size * 1.4, size * 0.65, size);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(i, c.setHSL(0.13, 0.04, range(0.42, 0.68)));
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);
  const pebbles = new THREE.InstancedMesh(
    rockGeo,
    new THREE.MeshStandardMaterial({ color: "#819c85", roughness: 0.8 }),
    95,
  );
  for (let i = 0; i < 95; i++) {
    const a = range(0, 6.28),
      r = range(0.3, 0.96) * shoreRadius(a),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    dummy.position.set(x, groundHeight(x, z) + 0.035, z);
    dummy.scale.set(range(0.05, 0.14), 0.04, range(0.07, 0.16));
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  group.add(pebbles);

  const bark = new THREE.MeshStandardMaterial({
    color: "#7b6950",
    roughness: 1,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: "#739951",
    roughness: 0.9,
  });
  const staticDecorations = {
    branches: [],
    reeds: [],
    tips: [],
    pads: [],
    petals: [],
  };
  function branch(start, end, radius) {
    const dir = end.clone().sub(start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.65, radius, dir.length(), 7),
      bark,
    );
    mesh.position.copy(start).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    mesh.castShadow = true;
    group.add(mesh);
    staticDecorations.branches.push(mesh);
  }
  function tree(x, z, size) {
    const y = groundHeight(x, z);
    branch(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x + 0.12 * size, y + 2.3 * size, z),
      0.12 * size,
    );
    const leaves = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      leafMaterial,
      120,
    );
    for (let i = 0; i < 120; i++) {
      const a = range(0, 6.28),
        r = range(0.05, 1.1) * size,
        cy = y + (i < 84 ? 2.5 : 3.15) * size;
      const px = x + Math.cos(a) * r,
        pz = z + Math.sin(a) * r,
        py = cy + range(-0.35, 0.4) * size;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(range(0, 6), range(0, 6), 0);
      dummy.scale.set(
        range(0.24, 0.48) * size,
        range(0.25, 0.46) * size,
        range(0.25, 0.48) * size,
      );
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(
        i,
        c.setHSL(range(0.24, 0.3), range(0.2, 0.33), range(0.3, 0.47)),
      );
      if (i % 28 === 0)
        branch(
          new THREE.Vector3(x, y + 1.3 * size, z),
          new THREE.Vector3(px, py - 0.25, pz),
          0.04 * size,
        );
    }
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    group.add(leaves);
  }
  tree(-4.8, -1.65, 1.18);
  tree(-3.0, -3.8, 0.81);
  tree(4.55, -2.1, 0.88);

  const reedMat = new THREE.MeshStandardMaterial({
    color: "#586b34",
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  for (const [x, z] of [
    [3.25, -1.3],
    [-2.7, -1.8],
    [2.5, 2],
    [-3.6, 0.5],
  ]) {
    for (let i = 0; i < 9; i++) {
      const h = range(0.45, 1),
        px = x + range(-0.25, 0.25),
        pz = z + range(-0.2, 0.2);
      const reed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.019, h, 4),
        reedMat,
      );
      reed.position.set(px, groundHeight(px, pz) + h / 2, pz);
      reed.rotation.z = range(-0.22, 0.22);
      group.add(reed);
      staticDecorations.reeds.push(reed);
      if (i % 3 === 0) {
        const tip = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.032, 0.16, 2, 5),
          bark,
        );
        tip.position.copy(reed.position).add(new THREE.Vector3(0, h / 2, 0));
        group.add(tip);
        staticDecorations.tips.push(tip);
      }
    }
  }
  const lilyMat = new THREE.MeshStandardMaterial({
    color: "#5b904d",
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: "#fff1e3",
    roughness: 0.8,
  });
  for (let i = 0; i < 9; i++) {
    const x = range(1.3, 2.6),
      z = range(-1.3, -0.4);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(range(0.12, 0.25), 24, 0.17, Math.PI * 2 - 0.38),
      lilyMat,
    );
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = range(0, 6);
    pad.position.set(x, 0.15, z);
    pad.receiveShadow = true;
    group.add(pad);
    staticDecorations.pads.push(pad);
    if (i === 4) {
      const flower = new THREE.Group();
      for (let j = 0; j < 7; j++) {
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 8, 6),
          petalMaterial,
        );
        petal.scale.set(0.55, 0.55, 1.3);
        petal.position.set(
          Math.cos((j / 7) * 6.28) * 0.055,
          0.025,
          Math.sin((j / 7) * 6.28) * 0.055,
        );
        petal.rotation.y = (-j / 7) * 6.28;
        flower.add(petal);
        staticDecorations.petals.push(petal);
      }
      flower.position.copy(pad.position);
      group.add(flower);
    }
  }

  // Bake static decoration transforms into five batches. Keep shadow settings
  // separate even when the bark material is shared by branches and reed tips.
  group.updateWorldMatrix(true, true);
  const groupInverse = group.matrixWorld.clone().invert();
  for (const [name, meshes] of Object.entries(staticDecorations)) {
    const geometries = meshes.map((mesh) =>
      mesh.geometry
        .clone()
        .applyMatrix4(
          new THREE.Matrix4().multiplyMatrices(groupInverse, mesh.matrixWorld),
        ),
    );
    const geometry = mergeGeometries(geometries, false);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const batch = new THREE.Mesh(geometry, meshes[0].material);
    batch.name = `static-${name}`;
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    group.add(batch);
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    for (const sourceGeometry of geometries) sourceGeometry.dispose();
  }

  const pollenGeo = new THREE.BufferGeometry();
  const pollenPoints = [];
  for (let i = 0; i < 55; i++)
    pollenPoints.push(range(-6, 6), range(0.5, 4), range(-4, 4));
  pollenGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(pollenPoints, 3),
  );
  const pollen = new THREE.Points(
    pollenGeo,
    new THREE.PointsMaterial({
      color: "#fff9d6",
      size: 0.027,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  group.add(pollen);
  return {
    grass,
    update(time, wind) {
      grassUniforms.time.value = time;
      grassUniforms.wind.value = wind;
      pollen.rotation.y = time * 0.018;
    },
    setQuality(high) {
      grass.count = high ? count : Math.round(count * 0.55);
    },
  };
}

export function createBall() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c75d2c";
  ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 36000; i++) {
    const x = random() * 1024,
      y = random() * 512;
    ctx.fillStyle =
      random() > 0.5 ? "rgba(57,24,8,.17)" : "rgba(255,185,100,.22)";
    ctx.beginPath();
    ctx.arc(x, y, range(0.4, 1.7), 0, 6.3);
    ctx.fill();
  }
  ctx.strokeStyle = "#382d23";
  ctx.lineWidth = 9;
  for (const x of [0, 256, 512, 768, 1024]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 256);
  ctx.lineTo(1024, 256);
  ctx.stroke();
  for (const offset of [0, Math.PI]) {
    ctx.beginPath();
    for (let x = 0; x <= 1024; x += 2) {
      const y = 256 + Math.sin((x / 1024) * 2 * Math.PI + offset) * 164;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: 0.007,
    roughness: 0.77,
    metalness: 0,
  });
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 48, 32),
    material,
  );
  ball.castShadow = true;
  ball.receiveShadow = true;
  ball.rotation.set(0.2, 0.3, -0.5);
  return ball;
}
