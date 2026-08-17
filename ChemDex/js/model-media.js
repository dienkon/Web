import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import {
  buildCrystalGroup,
  createCubeOutline,
} from "./three/crystal-structures.js";
import {
  escapeHtml,
  resolveModelPath,
  getDetailMediaBlocks,
  getReactionMediaBlocks,
  createVideoQuizBlock,
  mediaToCards,
} from "./core.js";

function createModelViewerBlock(container, block, el) {
  const modelPath = resolveModelPath(el, block);
  container.innerHTML = `
          <div class="grid gap-3">
            <div class="detail-media-note flex flex-wrap items-center gap-2">
              <span class="visual-badge"><i class="fa-solid fa-cube"></i> 3D theo dữ liệu</span>
              <span class="visual-badge">${escapeHtml(el?.symbol || "")} • Nhóm ${escapeHtml(el?.general?.group || "?")} • Chu kì ${escapeHtml(el?.general?.period || "?")}</span>
            </div>
            <div class="model-shell" id="model-shell-${el.symbol}-${block._idx}"></div>
            ${block.desc ? `<div class="detail-media-note">${escapeHtml(block.desc)}</div>` : ""}
            <div class="detail-media-note" id="model-status-${el.symbol}-${block._idx}">Đang khởi tạo mô hình 3D...</div>
          </div>
        `;

  const shell = container.querySelector(
    `#model-shell-${el.symbol}-${block._idx}`,
  );
  const status = container.querySelector(
    `#model-status-${el.symbol}-${block._idx}`,
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08111d);
  scene.fog = new THREE.Fog(0x08111d, 8, 32);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
  camera.position.set(0, 1.5, 4);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  shell.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const dir1 = new THREE.DirectionalLight(0xffffff, 2.0);
  dir1.position.set(6, 8, 5);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0x9bb7ff, 0.8);
  dir2.position.set(-4, 2, -3);
  scene.add(dir2);
  const grid = new THREE.GridHelper(20, 20, 0x324055, 0x243042);
  grid.position.y = -1;
  scene.add(grid);

  let current = null;
  let currentURL = null;
  let raf = 0;
  let resizeObserver = null;

  function setStatus(msg) {
    if (status) status.textContent = msg;
  }

  function disposeNode(node) {
    if (!node) return;
    if (node.geometry) node.geometry.dispose?.();
    if (node.material) {
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      for (const mat of materials) {
        for (const key of Object.keys(mat)) {
          const value = mat[key];
          if (value && value.isTexture) value.dispose?.();
        }
        mat.dispose?.();
      }
    }
  }

  function clearModel() {
    if (current) {
      scene.remove(current);
      current.traverse(disposeNode);
      current = null;
    }
    if (currentURL) {
      URL.revokeObjectURL(currentURL);
      currentURL = null;
    }
  }

  function fit(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.8;

    const direction = new THREE.Vector3(0, 0, 1);
    camera.position.copy(center).add(direction.multiplyScalar(cameraZ));
    camera.near = Math.max(cameraZ / 100, 0.01);
    camera.far = cameraZ * 100;
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
    grid.position.y = center.y - size.y / 2 - 0.02;
  }

  function finalize(object3d) {
    clearModel();
    object3d.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material && child.material.map) {
          child.material.map.colorSpace = THREE.SRGBColorSpace;
        }
      }
    });
    scene.add(object3d);
    current = object3d;
    fit(object3d);
    setStatus(`Đã tải mô hình: ${modelPath}`);
  }

  async function loadModel() {
    clearModel();
    setStatus(`Đang tải: ${modelPath}`);
    const lower = modelPath.toLowerCase();

    try {
      if (lower.endsWith(".glb") || lower.endsWith(".gltf")) {
        const loader = new GLTFLoader();
        loader.load(
          modelPath,
          (gltf) => finalize(gltf.scene || gltf.scenes?.[0]),
          undefined,
          (err) => setStatus(`Không tải được GLB/GLTF: ${err?.message || err}`),
        );
      } else if (lower.endsWith(".obj")) {
        const loader = new OBJLoader();
        loader.load(
          modelPath,
          (obj) => finalize(obj),
          undefined,
          (err) => setStatus(`Không tải được OBJ: ${err?.message || err}`),
        );
      } else if (lower.endsWith(".fbx")) {
        const loader = new FBXLoader();
        loader.load(
          modelPath,
          (obj) => finalize(obj),
          undefined,
          (err) => setStatus(`Không tải được FBX: ${err?.message || err}`),
        );
      } else {
        setStatus(
          "Định dạng model chưa được hỗ trợ. Hãy dùng GLB/GLTF/OBJ/FBX.",
        );
      }
    } catch (err) {
      setStatus(`Lỗi tải model: ${err?.message || err}`);
    }
  }

  const resize = () => {
    const rect = shell.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(shell);
  resize();
  loadModel();

  const loop = () => {
    if (current) current.rotation.y += 0.0025;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  loop();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      controls.dispose();
      clearModel();
      renderer.dispose();
      container.innerHTML = "";
    },
  };
}

function mountMediaBlocks(el) {
  if (window.__detailMediaWidgets) {
    window.__detailMediaWidgets.forEach((item) => {
      try {
        item?.destroy?.();
      } catch {}
    });
  }
  window.__detailMediaWidgets = [];

  const blocks = getDetailMediaBlocks(el);
  blocks.forEach((block) => {
    const id = `detail-media-${el.symbol}-${block._idx}`;
    const container = document.getElementById(id);
    if (!container) return;
    let widget = null;
    if (block.type === "video")
      widget = createVideoQuizBlock(container, block, el);
    else if (block.type === "3d" || block.type === "model")
      widget = createModelViewerBlock(container, block, el);
    else if (block.type === "image" || block.type === "gallery") {
      const media = mediaToCards(
        block.items || block.src || block.images || block,
        {
          defaultTitle: block.title,
          emptyText: "Chưa có hình ảnh minh hoạ.",
          kindHint: "image",
        },
      );
      container.innerHTML = media.html || "";
    }
    if (widget) window.__detailMediaWidgets.push(widget);
  });

  const reactions = Array.isArray(el?.reactions) ? el.reactions : [];
  reactions.forEach((reaction, reactionIndex) => {
    getReactionMediaBlocks(reaction, reactionIndex).forEach((block, idx) => {
      const id = `reaction-media-${el.symbol || "el"}-${reactionIndex}-${idx}`;
      const container = document.getElementById(id);
      if (!container) return;
      let widget = null;
      if (block.type === "video")
        widget = createVideoQuizBlock(container, block, el);
      else if (block.type === "3d" || block.type === "model")
        widget = createModelViewerBlock(container, block, el);
      else if (block.type === "image" || block.type === "gallery") {
        const media = mediaToCards(
          block.items || block.src || block.images || block,
          {
            defaultTitle: block.title,
            emptyText: "Chưa có hình ảnh minh họa.",
            kindHint: "image",
          },
        );
        container.innerHTML = media.html || "";
      }
      if (widget) window.__detailMediaWidgets.push(widget);
    });
  });
}

export { createModelViewerBlock, mountMediaBlocks };
