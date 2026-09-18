import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/simulationStore';
import { useUiStore } from '../../store/uiStore';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';
import { Lock, Unlock, Move } from 'lucide-react';

interface PourAnimationState {
  isPouring: boolean;
  sourceId: string;
  targetId: string;
  progress: number; // 0 to 1
  tiltAngle: number;
  isStreamFlowing: boolean;
  streamColor: THREE.Color;
  streamStart: THREE.Vector3;
  streamEnd: THREE.Vector3;
}

interface DispenseAnimationState {
  isActive: boolean;
  vesselId: string;
  chemicalId: string;
  progress: number;
  isSolid: boolean;
  color: THREE.Color;
  amount: number;
}

export const LabScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    vessels,
    selectedVesselId,
    selectVessel,
    burner,
    moveVesselPosition,
    pourVesselToVessel,
    addSubstance
  } = useSimulationStore();

  const {
    isMoveVesselMode,
    isCameraLocked,
    toggleCameraLock,
    isReacting,
    setIsReacting,
    pendingPour,
    clearPendingPour
  } = useUiStore();

  // Hover target during drag & drop chemical or moving vessel
  const [hoveredVesselId, setHoveredVesselId] = useState<string | null>(null);
  const [pourProximityTarget, setPourProximityTarget] = useState<{ sourceId: string; targetId: string } | null>(null);

  // Active animations
  const [pourAnim, setPourAnim] = useState<PourAnimationState | null>(null);
  const [dispenseAnim, setDispenseAnim] = useState<DispenseAnimationState | null>(null);

  // Real-time visual overrides during active pouring animations
  const visualVolumeOverridesRef = useRef<Map<string, number>>(new Map());
  const visualColorOverridesRef = useRef<Map<string, THREE.Color>>(new Map());
  const [, setAnimTick] = useState(0);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vesselsGroupRef = useRef<THREE.Group | null>(null);
  const burnerGroupRef = useRef<THREE.Group | null>(null);
  const effectsGroupRef = useRef<THREE.Group | null>(null);

  // Camera Orbit & Pan State
  const isOrbitingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isDraggingVesselRef = useRef(false);
  const draggedVesselIdRef = useRef<string | null>(null);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: 0, phi: 1.15, radius: 8.2 });
  const cameraTarget = useRef(new THREE.Vector3(0, 0.6, 0));

  // Ground plane for raycasting $(x, 0, z)$ on table
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Smooth radial gradient drop shadow texture (Zero triangle-fan artifacts!)
  const shadowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.24)');
      grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  const updateCamera = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngle.current;
    const x = cameraTarget.current.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = cameraTarget.current.y + radius * Math.cos(phi);
    const z = cameraTarget.current.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTarget.current);
  };

  // Helper: Get vessel by pointer raycast
  const getVesselAtPointer = (clientX: number, clientY: number): string | null => {
    if (!containerRef.current || !cameraRef.current || !vesselsGroupRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(vesselsGroupRef.current.children, true);

    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object;
      while (topObj && !topObj.userData.vesselId && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj && topObj.userData.vesselId) {
        return topObj.userData.vesselId;
      }
    }
    return null;
  };

  // Helper: Get bench position $(x, 0, z)$ at pointer
  const getBenchPointAtPointer = (clientX: number, clientY: number): THREE.Vector3 | null => {
    if (!containerRef.current || !cameraRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      return intersectionPoint;
    }
    return null;
  };

  // 1. INITIALIZE THREE.JS SCENE: EYE-FRIENDLY WARM PASTEL BENCH & LAB SCENERY
  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE - Deep Modern Laboratory Room
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c1322');
    sceneRef.current = scene;

    // CAMERA
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCamera();

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Main Studio Softbox Downlight
    const mainLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    mainLight.position.set(2, 9, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // Cyan/Sky Blue Rim Accent Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-6, 5, -5);
    scene.add(rimLight);

    // Warm Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xfef3c7, 0.45);
    fillLight.position.set(6, 3, 1);
    scene.add(fillLight);

    // --- LABORATORY ENVIRONMENT SCENERY ---
    const envGroup = new THREE.Group();

    // A. Back Lab Wall in Slate Tile
    const wallGeom = new THREE.PlaneGeometry(30, 14);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.88,
      metalness: 0.08
    });
    const backWall = new THREE.Mesh(wallGeom, wallMat);
    backWall.position.set(0, 4.5, -5);
    envGroup.add(backWall);

    // B. Subtle Cyan LED Accent Seam
    const seamGeom = new THREE.BoxGeometry(30, 0.04, 0.03);
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6
    });
    const wallSeam = new THREE.Mesh(seamGeom, seamMat);
    wallSeam.position.set(0, 2.3, -4.98);
    envGroup.add(wallSeam);

    // C. EYE-FRIENDLY WARM LIGHT SAND/PASTEL YELLOW COUNTERTOP (Dịu mắt, sang trọng)
    const benchGeom = new THREE.BoxGeometry(22, 0.22, 10);
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a, // Soft warm pastel yellow / light cream birch (Dịu mắt, dễ nhìn!)
      roughness: 0.45,
      metalness: 0.04
    });
    const benchMesh = new THREE.Mesh(benchGeom, benchMat);
    benchMesh.position.set(0, -0.11, 0);
    benchMesh.receiveShadow = true;
    envGroup.add(benchMesh);

    // D. Beveled Soft Champagne Gold Front Edge Trim
    const frontTrimGeom = new THREE.BoxGeometry(22, 0.24, 0.06);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xa16207,
      metalness: 0.4,
      roughness: 0.35
    });
    const frontTrim = new THREE.Mesh(frontTrimGeom, trimMat);
    frontTrim.position.set(0, -0.11, 5.03);
    envGroup.add(frontTrim);

    // E. Reagent Shelf on Back Wall with Bottles
    const shelfGeom = new THREE.BoxGeometry(16, 0.12, 0.9);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
    const shelf = new THREE.Mesh(shelfGeom, shelfMat);
    shelf.position.set(0, 3.4, -4.5);
    envGroup.add(shelf);

    // Reagent bottles on shelf
    const bottleColors = [0xb45309, 0x1d4ed8, 0x047857, 0x7c3aed, 0x475569, 0x0369a1, 0xd97706, 0x059669];
    for (let i = 0; i < 8; i++) {
      const bGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.55, 20);
      const bMat = new THREE.MeshStandardMaterial({
        color: bottleColors[i % bottleColors.length],
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85
      });
      const bMesh = new THREE.Mesh(bGeom, bMat);
      bMesh.position.set(-5.5 + i * 1.5, 3.75, -4.5);
      envGroup.add(bMesh);

      // White cap
      const capGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.set(-5.5 + i * 1.5, 4.08, -4.5);
      envGroup.add(cap);
    }

    // F. Suspended Overhead LED Studio Lights
    const lightBarGeom = new THREE.BoxGeometry(6.5, 0.08, 0.3);
    const lightBarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.9
    });
    const leftLightBar = new THREE.Mesh(lightBarGeom, lightBarMat);
    leftLightBar.position.set(-3.5, 6.2, 0);
    envGroup.add(leftLightBar);

    const rightLightBar = new THREE.Mesh(lightBarGeom, lightBarMat);
    rightLightBar.position.set(3.5, 6.2, 0);
    envGroup.add(rightLightBar);

    // G. Fume Hood Canopy Outline at Top Rear
    const hoodGeom = new THREE.BoxGeometry(18, 0.8, 2.5);
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const hood = new THREE.Mesh(hoodGeom, hoodMat);
    hood.position.set(0, 6.8, -3.8);
    envGroup.add(hood);

    scene.add(envGroup);

    // Interactive Groups
    const vesselsGroup = new THREE.Group();
    scene.add(vesselsGroup);
    vesselsGroupRef.current = vesselsGroup;

    const burnerGroup = new THREE.Group();
    scene.add(burnerGroup);
    burnerGroupRef.current = burnerGroup;

    const effectsGroup = new THREE.Group();
    scene.add(effectsGroup);
    effectsGroupRef.current = effectsGroup;

    // RENDER LOOP
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 2. REBUILD 3D VESSELS WITH SMOOTH CIRCULAR CYLINDERS (ZERO TRIANGLE/GRID ARTIFACTS!)
  useEffect(() => {
    if (!vesselsGroupRef.current || !sceneRef.current) return;

    while (vesselsGroupRef.current.children.length > 0) {
      const child = vesselsGroupRef.current.children[0];
      vesselsGroupRef.current.remove(child);
    }

    // High refractive borosilicate glass
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.03,
      metalness: 0.08,
      transmission: 0.96,
      ior: 1.52,
      thickness: 0.12,
      depthWrite: false
    });

    vessels.forEach((vessel) => {
      const vesselGroup = new THREE.Group();
      vesselGroup.position.set(...vessel.position);
      vesselGroup.userData = { vesselId: vessel.id };

      // Real-time visual volume override (during active pouring)
      const currentVol = visualVolumeOverridesRef.current.has(vessel.id)
        ? (visualVolumeOverridesRef.current.get(vessel.id) ?? vessel.currentVolumeMl)
        : vessel.currentVolumeMl;

      const fillFraction = Math.min(1.0, Math.max(0, currentVol / vessel.capacityMl));
      const hasLiquid = fillFraction > 0.002;

      // Color with reaction kinetics transition support
      const colorHex = vessel.liquidColor.hex || '#e0f2fe';
      const isColorless = vessel.contents.length > 0 &&
        vessel.contents.every(c => ['HCl', 'NaOH', 'NaCl', 'H2O', 'H2SO4'].includes(c.chemicalId)) &&
        !vessel.indicator;

      let liquidColor = new THREE.Color(isColorless ? '#e8f4fc' : colorHex);
      if (visualColorOverridesRef.current.has(vessel.id)) {
        liquidColor = visualColorOverridesRef.current.get(vessel.id)!;
      }

      // Smooth liquid material (Zero faceted triangles!)
      const liquidMaterial = new THREE.MeshPhysicalMaterial({
        color: liquidColor,
        transparent: true,
        opacity: isColorless ? 0.42 : Math.min(0.95, Math.max(0.65, vessel.liquidColor.a)),
        roughness: 0.05,
        metalness: 0.04,
        transmission: isColorless ? 0.88 : 0.35,
        ior: 1.333
      });

      // Meniscus rim highlight material (Smooth Torus ring)
      const meniscusHighlightMat = new THREE.MeshStandardMaterial({
        color: liquidColor.clone().offsetHSL(0, 0, 0.15),
        transparent: true,
        opacity: 0.8,
        roughness: 0.08
      });

      // 1. SOFT GRADIENT DROP SHADOW (Smooth blurred texture, NO polygon triangle edges!)
      const shadowPlaneGeom = new THREE.PlaneGeometry(1.2, 1.2);
      const shadowPlaneMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = 0.003;
      vesselGroup.add(shadowPlane);

      // 2. SELECTION & DRAG HOVER GLOWING RING
      const isSelected = vessel.id === selectedVesselId;
      const isHovered = vessel.id === hoveredVesselId || pourProximityTarget?.targetId === vessel.id;

      if (isSelected || isHovered) {
        // High-segment smooth ring (64 segments)
        const ringGeom = new THREE.RingGeometry(0.62, 0.72, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: isHovered ? 0x10b981 : 0x0284c7,
          side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.position.set(0, 0.01, 0);
        ringMesh.rotation.x = -Math.PI / 2;
        vesselGroup.add(ringMesh);
      }

      // --- VESSEL BODY GEOMETRIES (64 RADIAL SEGMENTS FOR SILKY SMOOTH CURVES) ---
      if (vessel.type === 'beaker') {
        // High-res outer glass (64 segments, smooth normals)
        const glassGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.05, 64, 1, true);
        glassGeom.computeVertexNormals();
        const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
        glassMesh.position.y = 0.525;
        vesselGroup.add(glassMesh);

        const bottomGeom = new THREE.CylinderGeometry(0.49, 0.49, 0.02, 64);
        bottomGeom.computeVertexNormals();
        const bottomMesh = new THREE.Mesh(bottomGeom, glassMaterial);
        bottomMesh.position.y = 0.01;
        vesselGroup.add(bottomMesh);

        // Flared Rim
        const rimGeom = new THREE.TorusGeometry(0.5, 0.025, 16, 64);
        const rimMesh = new THREE.Mesh(rimGeom, glassMaterial);
        rimMesh.position.y = 1.05;
        rimMesh.rotation.x = Math.PI / 2;
        vesselGroup.add(rimMesh);

        if (hasLiquid) {
          const liqHeight = 1.0 * fillFraction;
          // Closed cylinder for liquid with flat circular ends (Zero triangle-fan artifacts!)
          const liqGeom = new THREE.CylinderGeometry(0.485, 0.485, liqHeight, 64, 1, false);
          liqGeom.computeVertexNormals();
          const liqMesh = new THREE.Mesh(liqGeom, liquidMaterial);
          liqMesh.position.y = liqHeight / 2 + 0.01;
          vesselGroup.add(liqMesh);

          // Subtle silky circular meniscus rim ring
          const meniscusRimGeom = new THREE.TorusGeometry(0.48, 0.008, 12, 64);
          const meniscusRim = new THREE.Mesh(meniscusRimGeom, meniscusHighlightMat);
          meniscusRim.position.y = liqHeight + 0.01;
          meniscusRim.rotation.x = Math.PI / 2;
          vesselGroup.add(meniscusRim);
        }
      } else if (vessel.type === 'erlenmeyer') {
        const coneGeom = new THREE.CylinderGeometry(0.22, 0.58, 0.8, 64, 1, true);
        coneGeom.computeVertexNormals();
        const coneMesh = new THREE.Mesh(coneGeom, glassMaterial);
        coneMesh.position.y = 0.48;
        vesselGroup.add(coneMesh);

        const neckGeom = new THREE.CylinderGeometry(0.19, 0.19, 0.4, 64, 1, true);
        neckGeom.computeVertexNormals();
        const neckMesh = new THREE.Mesh(neckGeom, glassMaterial);
        neckMesh.position.y = 1.08;
        vesselGroup.add(neckMesh);

        if (hasLiquid) {
          const liqHeight = 0.75 * fillFraction;
          const topR = 0.58 - 0.36 * fillFraction;
          // Smooth closed cylinder for liquid
          const liqGeom = new THREE.CylinderGeometry(topR, 0.575, liqHeight, 64, 1, false);
          liqGeom.computeVertexNormals();
          const liqMesh = new THREE.Mesh(liqGeom, liquidMaterial);
          liqMesh.position.y = liqHeight / 2 + 0.01;
          vesselGroup.add(liqMesh);

          const meniscusRimGeom = new THREE.TorusGeometry(topR, 0.008, 12, 64);
          const meniscusRim = new THREE.Mesh(meniscusRimGeom, meniscusHighlightMat);
          meniscusRim.position.y = liqHeight + 0.01;
          meniscusRim.rotation.x = Math.PI / 2;
          vesselGroup.add(meniscusRim);
        }
      } else if (vessel.type === 'test_tube') {
        // Wooden Tube Stand Base
        const rackBaseGeom = new THREE.BoxGeometry(0.45, 0.06, 0.45);
        const rackBaseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
        const rackBase = new THREE.Mesh(rackBaseGeom, rackBaseMat);
        rackBase.position.y = 0.03;
        vesselGroup.add(rackBase);

        const tubeGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.95, 48, 1, true);
        tubeGeom.computeVertexNormals();
        const tubeMesh = new THREE.Mesh(tubeGeom, glassMaterial);
        tubeMesh.position.y = 0.65;
        vesselGroup.add(tubeMesh);

        if (hasLiquid) {
          const liqHeight = 0.85 * fillFraction;
          const liqGeom = new THREE.CylinderGeometry(0.148, 0.148, liqHeight, 48, 1, false);
          liqGeom.computeVertexNormals();
          const liqMesh = new THREE.Mesh(liqGeom, liquidMaterial);
          liqMesh.position.y = 0.18 + liqHeight / 2;
          vesselGroup.add(liqMesh);
        }
      } else if (vessel.type === 'burette') {
        const standGeom = new THREE.BoxGeometry(0.75, 0.06, 0.55);
        const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const stand = new THREE.Mesh(standGeom, standMat);
        stand.position.set(0.45, 0.03, 0);
        vesselGroup.add(stand);

        const poleGeom = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 24);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.set(0.45, 1.25, 0);
        vesselGroup.add(pole);

        const tubeGeom = new THREE.CylinderGeometry(0.075, 0.075, 1.85, 36, 1, true);
        tubeGeom.computeVertexNormals();
        const tube = new THREE.Mesh(tubeGeom, glassMaterial);
        tube.position.y = 1.25;
        vesselGroup.add(tube);

        const valveGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.15, 20);
        const valveMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const valve = new THREE.Mesh(valveGeom, valveMat);
        valve.position.set(0, 0.3, 0);
        valve.rotation.z = Math.PI / 2;
        vesselGroup.add(valve);

        if (hasLiquid) {
          const liqHeight = 1.6 * fillFraction;
          const liqGeom = new THREE.CylinderGeometry(0.068, 0.068, liqHeight, 36, 1, false);
          liqGeom.computeVertexNormals();
          const liqMesh = new THREE.Mesh(liqGeom, liquidMaterial);
          liqMesh.position.y = 0.32 + liqHeight / 2;
          vesselGroup.add(liqMesh);
        }
      } else {
        // Cylinder
        const cylGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.95, 48, 1, true);
        cylGeom.computeVertexNormals();
        const cylMesh = new THREE.Mesh(cylGeom, glassMaterial);
        cylMesh.position.y = 0.48;
        vesselGroup.add(cylMesh);

        if (hasLiquid) {
          const liqHeight = 0.88 * fillFraction;
          const liqGeom = new THREE.CylinderGeometry(0.365, 0.365, liqHeight, 48, 1, false);
          liqGeom.computeVertexNormals();
          const liqMesh = new THREE.Mesh(liqGeom, liquidMaterial);
          liqMesh.position.y = liqHeight / 2 + 0.01;
          vesselGroup.add(liqMesh);
        }
      }

      // --- SOLID SUBSTANCES (REALISTIC CHUNKS, CUBES, GRANULAR PILES) ---
      const solidSubstances = vessel.contents.filter(sub => {
        const chem = CHEMICAL_LIBRARY[sub.chemicalId];
        return chem?.phase === 'solid';
      });

      if (solidSubstances.length > 0) {
        solidSubstances.forEach(sub => {
          const chem = CHEMICAL_LIBRARY[sub.chemicalId];
          const isMetal = chem?.category === 'metal';

          if (isMetal) {
            // METALLIC CHUNKS (e.g. Na cut cube, Cu turnings, Zn mossy pieces)
            const count = Math.min(6, Math.max(2, Math.round(sub.amount)));
            const chunkGeom = new THREE.DodecahedronGeometry(0.06, 0);
            const chunkMat = new THREE.MeshStandardMaterial({
              color: chem?.defaultColor.hex || '#94a3b8',
              metalness: 0.9,
              roughness: 0.25
            });

            for (let i = 0; i < count; i++) {
              const chunk = new THREE.Mesh(chunkGeom, chunkMat);
              chunk.position.set(
                (Math.sin(i * 1.7) * 0.18),
                0.035,
                (Math.cos(i * 1.7) * 0.18)
              );
              chunk.rotation.set(i * 0.4, i * 0.8, 0);
              vesselGroup.add(chunk);
            }
          } else {
            // GRANULAR PILE (e.g. CaCO3 marble chips, solid salts)
            const count = 10;
            const granGeom = new THREE.TetrahedronGeometry(0.045, 0);
            const granMat = new THREE.MeshStandardMaterial({
              color: chem?.defaultColor.hex || '#ffffff',
              roughness: 0.8,
              metalness: 0.05
            });

            for (let i = 0; i < count; i++) {
              const gran = new THREE.Mesh(granGeom, granMat);
              gran.position.set(
                (Math.sin(i * 1.2) * 0.22),
                0.025 + (i % 2) * 0.02,
                (Math.cos(i * 1.2) * 0.22)
              );
              gran.rotation.set(i * 0.5, i * 0.9, i * 0.2);
              vesselGroup.add(gran);
            }
          }
        });
      }

      // PRECIPITATE (Gelatinous flocculent or crystalline bottom layer)
      if (vessel.precipitate && hasLiquid) {
        const pptGeom = new THREE.CylinderGeometry(0.44, 0.46, 0.09, 48);
        pptGeom.computeVertexNormals();
        const pptMat = new THREE.MeshStandardMaterial({
          color: vessel.precipitate.colorHex,
          roughness: 0.55,
          metalness: vessel.precipitate.type === 'metallic' ? 0.8 : 0.1
        });
        const pptMesh = new THREE.Mesh(pptGeom, pptMat);
        pptMesh.position.y = 0.045;
        vesselGroup.add(pptMesh);
      }

      // REALISTIC GAS BUBBLES & VIGOROUS EFFERVESCENCE
      if (vessel.gas || vessel.isHeating) {
        const count = vessel.gas ? 24 : 10;
        const bubbleGeom = new THREE.SphereGeometry(0.025, 12, 12);
        const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
        for (let i = 0; i < count; i++) {
          const bMesh = new THREE.Mesh(bubbleGeom, bubbleMat);
          const bubbleHeight = 0.08 + Math.random() * (0.85 * fillFraction);
          bMesh.position.set(
            (Math.random() - 0.5) * 0.42,
            bubbleHeight,
            (Math.random() - 0.5) * 0.42
          );
          vesselGroup.add(bMesh);
        }

        // Rising vapor mist particles when heating
        if (vessel.isHeating || (vessel.temperatureC && vessel.temperatureC > 45)) {
          const steamGeom = new THREE.SphereGeometry(0.04, 8, 8);
          const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
          for (let s = 0; s < 4; s++) {
            const steam = new THREE.Mesh(steamGeom, steamMat);
            steam.position.set(
              (Math.random() - 0.5) * 0.2,
              1.15 + s * 0.18,
              (Math.random() - 0.5) * 0.2
            );
            vesselGroup.add(steam);
          }
        }
      }

      vesselsGroupRef.current?.add(vesselGroup);
    });
  }, [vessels, selectedVesselId, hoveredVesselId, pourProximityTarget, shadowTexture]);

  // 3. BURNER 3D OBJECT
  useEffect(() => {
    if (!burnerGroupRef.current) return;
    while (burnerGroupRef.current.children.length > 0) {
      burnerGroupRef.current.remove(burnerGroupRef.current.children[0]);
    }

    if (burner.isActive && burner.targetVesselId) {
      const targetVessel = vessels.find(v => v.id === burner.targetVesselId);
      if (targetVessel) {
        const burnerPos: [number, number, number] = [targetVessel.position[0], 0, targetVessel.position[2]];
        const group = new THREE.Group();
        group.position.set(...burnerPos);

        const baseGeom = new THREE.CylinderGeometry(0.35, 0.45, 0.1, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.6 });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.position.y = 0.05;
        group.add(baseMesh);

        const stemGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 16);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const stemMesh = new THREE.Mesh(stemGeom, stemMat);
        stemMesh.position.y = 0.325;
        group.add(stemMesh);

        const flameGeom = new THREE.ConeGeometry(0.09, 0.25, 16);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85 });
        const flameMesh = new THREE.Mesh(flameGeom, flameMat);
        flameMesh.position.y = 0.65;
        group.add(flameMesh);

        const flameLight = new THREE.PointLight(0x38bdf8, 1.8, 2.5);
        flameLight.position.y = 0.7;
        group.add(flameLight);

        burnerGroupRef.current.add(group);
      }
    }
  }, [burner, vessels]);

  // 4. HIGH-REALISM FLUID STREAM & DISPENSING RENDERING (Gravity Tapering & Ripple Dynamics)
  useEffect(() => {
    if (!effectsGroupRef.current) return;
    while (effectsGroupRef.current.children.length > 0) {
      effectsGroupRef.current.remove(effectsGroupRef.current.children[0]);
    }

    // A. Dynamic Tapering Pouring Stream (Thick at spout, tapering downward by gravity!)
    if (pourAnim && pourAnim.isStreamFlowing) {
      const tgt = vessels.find(v => v.id === pourAnim.targetId);

      if (tgt) {
        const startPoint = pourAnim.streamStart || new THREE.Vector3(tgt.position[0] - 0.22, 1.25, tgt.position[2]);
        const endPoint = pourAnim.streamEnd || new THREE.Vector3(tgt.position[0], 0.45, tgt.position[2]);
        const midPoint = new THREE.Vector3(
          (startPoint.x + endPoint.x) / 2 - 0.04,
          (startPoint.y + endPoint.y) / 2 + 0.08,
          (startPoint.z + endPoint.z) / 2
        );

        // Parabolic fluid curve
        const curve = new THREE.QuadraticBezierCurve3(startPoint, midPoint, endPoint);
        const tubeGeom = new THREE.TubeGeometry(curve, 24, 0.036, 12, false);
        const streamMat = new THREE.MeshPhysicalMaterial({
          color: pourAnim.streamColor,
          transparent: true,
          opacity: 0.88,
          roughness: 0.05,
          transmission: 0.4
        });
        const streamMesh = new THREE.Mesh(tubeGeom, streamMat);
        effectsGroupRef.current.add(streamMesh);

        // Fluid Surface Concentric Ripples (Gợn sóng lan tỏa trên mặt dung dịch nhận)
        const rippleGeom = new THREE.RingGeometry(0.08, 0.12, 32);
        const rippleMat = new THREE.MeshBasicMaterial({
          color: pourAnim.streamColor.clone().offsetHSL(0, 0, 0.2),
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const ripple = new THREE.Mesh(rippleGeom, rippleMat);
        ripple.position.set(endPoint.x, endPoint.y + 0.008, endPoint.z);
        ripple.rotation.x = -Math.PI / 2;
        effectsGroupRef.current.add(ripple);

        // Splashing drops in target vessel
        const dropGeom = new THREE.SphereGeometry(0.028, 8, 8);
        const dropMat = new THREE.MeshBasicMaterial({ color: pourAnim.streamColor });
        for (let i = 0; i < 6; i++) {
          const drop = new THREE.Mesh(dropGeom, dropMat);
          drop.position.set(
            endPoint.x + (Math.random() - 0.5) * 0.22,
            endPoint.y + 0.04 + Math.random() * 0.28,
            endPoint.z + (Math.random() - 0.5) * 0.22
          );
          effectsGroupRef.current.add(drop);
        }
      }
    }

    // B. Reagent Dispensing: Bottle or Spatula with Particles
    if (dispenseAnim && dispenseAnim.isActive) {
      const target = vessels.find(v => v.id === dispenseAnim.vesselId);
      if (target) {
        if (dispenseAnim.isSolid) {
          // SOLID CHEMICAL DISPENSER: Spatula with falling granular particles
          const spatulaGroup = new THREE.Group();
          spatulaGroup.position.set(target.position[0] - 0.55, 1.45, target.position[2]);
          spatulaGroup.rotation.z = -0.55;

          const bladeGeom = new THREE.BoxGeometry(0.5, 0.015, 0.12);
          const bladeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
          const blade = new THREE.Mesh(bladeGeom, bladeMat);
          spatulaGroup.add(blade);

          effectsGroupRef.current.add(spatulaGroup);

          // Falling solid particles raining down into vessel
          const pGeom = new THREE.DodecahedronGeometry(0.03, 0);
          const pMat = new THREE.MeshStandardMaterial({ color: dispenseAnim.color, roughness: 0.3, metalness: 0.8 });
          for (let p = 0; p < 7; p++) {
            const particle = new THREE.Mesh(pGeom, pMat);
            const pY = 1.3 - (dispenseAnim.progress * 0.8 + p * 0.1) % 0.85;
            particle.position.set(
              target.position[0] - 0.2 + (Math.random() - 0.5) * 0.15,
              pY,
              target.position[2] + (Math.random() - 0.5) * 0.15
            );
            particle.rotation.set(p * 0.7, p * 1.2, 0);
            effectsGroupRef.current.add(particle);
          }
        } else {
          // LIQUID REAGENT DISPENSER: Reagent Bottle with Liquid Stream
          const bottleGroup = new THREE.Group();
          bottleGroup.position.set(target.position[0] - 0.65, 1.35, target.position[2]);
          bottleGroup.rotation.z = -0.78;

          const bottleGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.65, 32);
          const bottleMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
            roughness: 0.08,
            transmission: 0.9
          });
          const bottleMesh = new THREE.Mesh(bottleGeom, bottleMat);
          bottleGroup.add(bottleMesh);

          const bottleLiqGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.45 * (1 - dispenseAnim.progress * 0.6), 32);
          const bottleLiqMat = new THREE.MeshStandardMaterial({
            color: dispenseAnim.color,
            transparent: true,
            opacity: 0.85
          });
          const bottleLiq = new THREE.Mesh(bottleLiqGeom, bottleLiqMat);
          bottleLiq.position.y = -0.05;
          bottleGroup.add(bottleLiq);

          effectsGroupRef.current.add(bottleGroup);

          const startPoint = new THREE.Vector3(target.position[0] - 0.25, 1.25, target.position[2]);
          const endPoint = new THREE.Vector3(target.position[0], 0.5, target.position[2]);
          const midPoint = new THREE.Vector3(target.position[0] - 0.12, 0.95, target.position[2]);

          const curve = new THREE.QuadraticBezierCurve3(startPoint, midPoint, endPoint);
          const streamGeom = new THREE.TubeGeometry(curve, 16, 0.032, 8, false);
          const streamMat = new THREE.MeshStandardMaterial({
            color: dispenseAnim.color,
            transparent: true,
            opacity: 0.9
          });
          const stream = new THREE.Mesh(streamGeom, streamMat);
          effectsGroupRef.current.add(stream);
        }
      }
    }
  }, [pourAnim, dispenseAnim, vessels]);

  // ANIMATION DRIVER: ORGANIC 4-PHASE GRADUAL POURING (Smooth Lift Arc -> Slow Tilt -> Flow -> Graceful Return)
  const executePourAnimation = async (sourceId: string, targetId: string, amount: number = 20) => {
    const src = vessels.find(v => v.id === sourceId);
    const tgt = vessels.find(v => v.id === targetId);
    if (!src || !tgt || src.currentVolumeMl <= 0 || isReacting) return;

    // 1. Lock system completely during pouring
    setIsReacting(true);

    const transferAmount = Math.min(src.currentVolumeMl, amount);
    const initialSrcVol = src.currentVolumeMl;
    const initialTgtVol = tgt.currentVolumeMl;
    const streamColor = new THREE.Color(src.liquidColor.hex || '#0284c7');

    const srcOriginalPos = new THREE.Vector3(src.position[0], src.position[1], src.position[2]);
    const pourTargetPos = new THREE.Vector3(tgt.position[0] - 0.65, 1.35, tgt.position[2]);

    const srcMeshGroup = vesselsGroupRef.current?.children.find(
      c => c.userData.vesselId === sourceId
    ) as THREE.Group | undefined;

    // Smoothstep interpolation helper
    const smoothstep = (t: number) => t * t * (3 - 2 * t);

    // Duration: 3200ms for realistic, dignified, fluid laboratory motion
    const startTime = performance.now();
    const duration = 3200;

    await new Promise<void>((resolve) => {
      const step = () => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1.0, elapsed / duration);

        let currentTilt = 0;
        let isStreamFlowing = false;
        let spoutPos = new THREE.Vector3();
        let targetSurfacePos = new THREE.Vector3();

        if (srcMeshGroup) {
          if (p < 0.25) {
            // --- PHASE 1: SMOOTH 3D LIFT & APPROACH ARC (0 to 0.25) ---
            const t1 = p / 0.25;
            const s1 = smoothstep(t1);
            // Parabolic upward lift arc
            const arcHeight = Math.sin(t1 * Math.PI) * 0.35;
            srcMeshGroup.position.x = srcOriginalPos.x + (pourTargetPos.x - srcOriginalPos.x) * s1;
            srcMeshGroup.position.y = srcOriginalPos.y + (pourTargetPos.y - srcOriginalPos.y) * s1 + arcHeight;
            srcMeshGroup.position.z = srcOriginalPos.z + (pourTargetPos.z - srcOriginalPos.z) * s1;
            srcMeshGroup.rotation.z = 0; // Remains upright during carry!
          } else if (p < 0.42) {
            // --- PHASE 2: GRADUAL NATURAL TILT (0.25 to 0.42) ---
            const t2 = (p - 0.25) / 0.17;
            const s2 = smoothstep(t2);
            currentTilt = -1.02 * s2; // Tilts to -58.5 degrees
            srcMeshGroup.position.copy(pourTargetPos);
            // Minor natural pivot compensation
            srcMeshGroup.position.x += 0.08 * s2;
            srcMeshGroup.position.y += 0.03 * s2;
            srcMeshGroup.rotation.z = currentTilt;
            // No stream yet! Liquid is creeping towards the spout
          } else if (p < 0.80) {
            // --- PHASE 3: FLUID STREAM & DYNAMIC VOLUME EXCHANGE (0.42 to 0.80) ---
            currentTilt = -1.02;
            srcMeshGroup.position.set(pourTargetPos.x + 0.08, pourTargetPos.y + 0.03, pourTargetPos.z);
            srcMeshGroup.rotation.z = currentTilt;

            isStreamFlowing = true;
            const t3 = (p - 0.42) / 0.38;
            const s3 = t3;

            const currentSrcVol = Math.max(0, initialSrcVol - transferAmount * s3);
            const currentTgtVol = Math.min(tgt.capacityMl, initialTgtVol + transferAmount * s3);

            visualVolumeOverridesRef.current.set(sourceId, currentSrcVol);
            visualVolumeOverridesRef.current.set(targetId, currentTgtVol);
            setAnimTick(t => t + 1);

            // Calculate precise 3D spout coordinates from tilted beaker
            spoutPos.set(srcMeshGroup.position.x + 0.38, srcMeshGroup.position.y + 0.05, srcMeshGroup.position.z);
            const tgtFillFrac = currentTgtVol / tgt.capacityMl;
            targetSurfacePos.set(tgt.position[0], 0.02 + 1.0 * tgtFillFrac, tgt.position[2]);
          } else {
            // --- PHASE 4: PINCH-OFF & GRACEFUL RETURN (0.80 to 1.0) ---
            isStreamFlowing = false;
            const t4 = (p - 0.80) / 0.20;
            const s4 = smoothstep(t4);

            // Rotate back upright in the first half of return
            if (t4 < 0.45) {
              const rFactor = t4 / 0.45;
              currentTilt = -1.02 * (1 - smoothstep(rFactor));
            } else {
              currentTilt = 0;
            }
            srcMeshGroup.rotation.z = currentTilt;

            // Arc glide back down onto the bench table
            const arcReturn = Math.sin(t4 * Math.PI) * 0.25;
            srcMeshGroup.position.x = pourTargetPos.x + (srcOriginalPos.x - pourTargetPos.x) * s4;
            srcMeshGroup.position.y = pourTargetPos.y + (srcOriginalPos.y - pourTargetPos.y) * s4 + arcReturn;
            srcMeshGroup.position.z = pourTargetPos.z + (srcOriginalPos.z - pourTargetPos.z) * s4;
          }
        }

        setPourAnim({
          isPouring: true,
          sourceId,
          targetId,
          progress: p,
          tiltAngle: currentTilt,
          isStreamFlowing,
          streamColor,
          streamStart: spoutPos,
          streamEnd: targetSurfacePos
        });

        if (p < 1.0) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      step();
    });

    // Reset source vessel to exact original position and angle
    if (srcMeshGroup) {
      srcMeshGroup.rotation.z = 0;
      srcMeshGroup.position.copy(srcOriginalPos);
    }

    setPourAnim(null);
    visualVolumeOverridesRef.current.delete(sourceId);
    visualVolumeOverridesRef.current.delete(targetId);

    // Commit chemistry resolution
    await pourVesselToVessel(sourceId, targetId, transferAmount);

    // 1:1 REALISTIC REACTION KINETICS TWEEN
    const updatedTarget = useSimulationStore.getState().vessels.find(v => v.id === targetId);
    if (updatedTarget && updatedTarget.liquidColor) {
      const startCol = streamColor.clone();
      const endCol = new THREE.Color(updatedTarget.liquidColor.hex || '#0284c7');

      const kineticsStart = performance.now();
      const kineticsDuration = 1800;

      await new Promise<void>((res) => {
        const kStep = () => {
          const kElapsed = performance.now() - kineticsStart;
          const kp = Math.min(1.0, kElapsed / kineticsDuration);
          const lerpedCol = startCol.clone().lerp(endCol, kp);

          visualColorOverridesRef.current.set(targetId, lerpedCol);
          setAnimTick(t => t + 1);

          if (kp < 1.0) {
            requestAnimationFrame(kStep);
          } else {
            res();
          }
        };
        kStep();
      });
      visualColorOverridesRef.current.delete(targetId);
    }

    setIsReacting(false);
  };

  // ANIMATION DRIVER: Reagent dispensing execution with Solid/Liquid differentiation
  const executeDispenseAnimation = async (vesselId: string, chemicalId: string, amount: number = 20) => {
    const target = vessels.find(v => v.id === vesselId);
    if (!target || isReacting) return;

    setIsReacting(true);

    const chem = CHEMICAL_LIBRARY[chemicalId];
    const isSolid = chem?.phase === 'solid';
    const color = new THREE.Color(chem?.defaultColor.hex || '#0284c7');
    const initialTgtVol = target.currentVolumeMl;

    setDispenseAnim({
      isActive: true,
      vesselId,
      chemicalId,
      progress: 0,
      isSolid,
      color,
      amount
    });

    const startTime = performance.now();
    const duration = isSolid ? 1600 : 1400;

    await new Promise<void>((resolve) => {
      const step = () => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1.0, elapsed / duration);

        if (!isSolid) {
          const currentTgtVol = Math.min(target.capacityMl, initialTgtVol + amount * p);
          visualVolumeOverridesRef.current.set(vesselId, currentTgtVol);
        }
        setAnimTick(t => t + 1);

        setDispenseAnim(prev => prev ? { ...prev, progress: p } : null);

        if (p < 1.0) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      step();
    });

    setDispenseAnim(null);
    visualVolumeOverridesRef.current.delete(vesselId);

    await addSubstance(vesselId, chemicalId, amount, isSolid ? 'g' : 'mL');
    setIsReacting(false);
  };

  // Listen for external triggerPour requests
  useEffect(() => {
    if (pendingPour && !isReacting) {
      const { sourceId, targetId, amount } = pendingPour;
      clearPendingPour();
      executePourAnimation(sourceId, targetId, amount || 20);
    }
  }, [pendingPour, isReacting]);

  // 5. POINTER INTERACTIONS: CONTROLLED SLOW ORBIT & PAN, LOCKED VIEWPORT RESTRICTIONS
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCameraLocked) {
      if (e.button === 0) {
        const clickedId = getVesselAtPointer(e.clientX, e.clientY);
        if (clickedId) {
          selectVessel(clickedId);
        }
      }
      return;
    }

    if (e.button === 2) {
      isPanningRef.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isMoveVesselMode && e.button === 0) {
      const clickedVesselId = getVesselAtPointer(e.clientX, e.clientY);
      if (clickedVesselId) {
        isDraggingVesselRef.current = true;
        draggedVesselIdRef.current = clickedVesselId;
        selectVessel(clickedVesselId);
        return;
      }
    }

    if (e.button === 0) {
      isOrbitingRef.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCameraLocked) return;

    if (isPanningRef.current && cameraRef.current) {
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };

      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, cameraRef.current.up).normalize();
      const up = cameraRef.current.up.clone().normalize();

      const panSpeed = 0.0016 * cameraAngle.current.radius;
      cameraTarget.current.addScaledVector(right, -deltaX * panSpeed);
      cameraTarget.current.addScaledVector(up, deltaY * panSpeed);

      cameraTarget.current.x = Math.max(-8, Math.min(8, cameraTarget.current.x));
      cameraTarget.current.y = Math.max(0.2, Math.min(3.8, cameraTarget.current.y));
      cameraTarget.current.z = Math.max(-4, Math.min(4, cameraTarget.current.z));

      updateCamera();
      return;
    }

    if (isDraggingVesselRef.current && draggedVesselIdRef.current) {
      const benchPoint = getBenchPointAtPointer(e.clientX, e.clientY);
      if (benchPoint) {
        const clampedX = Math.max(-8.0, Math.min(8.0, benchPoint.x));
        const clampedZ = Math.max(-3.5, Math.min(3.5, benchPoint.z));
        moveVesselPosition(draggedVesselIdRef.current, [clampedX, 0, clampedZ]);

        const currentDragged = vessels.find(v => v.id === draggedVesselIdRef.current);
        if (currentDragged && currentDragged.currentVolumeMl > 0) {
          let nearestTarget: string | null = null;
          let minDistance = 1.8;

          for (const other of vessels) {
            if (other.id === currentDragged.id) continue;
            const dist = Math.hypot(
              other.position[0] - clampedX,
              other.position[2] - clampedZ
            );
            if (dist < minDistance) {
              minDistance = dist;
              nearestTarget = other.id;
            }
          }

          if (nearestTarget) {
            setPourProximityTarget({
              sourceId: currentDragged.id,
              targetId: nearestTarget
            });
          } else {
            setPourProximityTarget(null);
          }
        }
      }
      return;
    }

    if (!isOrbitingRef.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    cameraAngle.current.theta -= deltaX * 0.0035;
    cameraAngle.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, cameraAngle.current.phi - deltaY * 0.0035));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
    updateCamera();
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (e.button === 2 || isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDraggingVesselRef.current && pourProximityTarget) {
      const { sourceId, targetId } = pourProximityTarget;
      setPourProximityTarget(null);
      isDraggingVesselRef.current = false;
      draggedVesselIdRef.current = null;

      await executePourAnimation(sourceId, targetId, 20);
      return;
    }

    if (isDraggingVesselRef.current) {
      isDraggingVesselRef.current = false;
      draggedVesselIdRef.current = null;
      return;
    }

    isOrbitingRef.current = false;

    const clickedId = getVesselAtPointer(e.clientX, e.clientY);
    if (clickedId) {
      selectVessel(clickedId);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isCameraLocked) return;
    cameraAngle.current.radius = Math.max(3.2, Math.min(13, cameraAngle.current.radius + e.deltaY * 0.0035));
    updateCamera();
  };

  // 6. DRAG & DROP CHEMICALS FROM SIDEBAR
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isReacting) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'copy';

    const vesselId = getVesselAtPointer(e.clientX, e.clientY);
    if (vesselId !== hoveredVesselId) {
      setHoveredVesselId(vesselId);
    }
  };

  const handleDragLeave = () => {
    setHoveredVesselId(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (isReacting) return;

    const targetVesselId = getVesselAtPointer(e.clientX, e.clientY);
    setHoveredVesselId(null);

    const chemicalId = e.dataTransfer.getData('text/plain');
    if (!targetVesselId || !chemicalId) return;

    await executeDispenseAnimation(targetVesselId, chemicalId, 20);
  };

  // Preset Views
  const resetCamera = () => {
    cameraTarget.current.set(0, 0.6, 0);
    cameraAngle.current = { theta: 0, phi: Math.PI / 4.2, radius: 7.2 };
    updateCamera();
  };

  const topView = () => {
    cameraTarget.current.set(0, 0.6, 0);
    cameraAngle.current = { theta: 0, phi: 0.15, radius: 7.5 };
    updateCamera();
  };

  const hoveredVessel = vessels.find(v => v.id === hoveredVesselId);
  const proximityTargetVessel = vessels.find(v => v.id === pourProximityTarget?.targetId);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`w-full h-full relative select-none overflow-hidden ${
        isMoveVesselMode ? 'cursor-move' : isCameraLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual Proximity Pouring Affordance Overlay */}
      {pourProximityTarget && proximityTargetVessel && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg shadow-emerald-600/30 flex items-center gap-2 animate-bounce pointer-events-none">
          <span>💧 Thả chuột để rót dung dịch vào {proximityTargetVessel.name}!</span>
        </div>
      )}

      {/* Chemical Drop Target Glow Indicator */}
      {hoveredVessel && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-sky-600 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg shadow-sky-600/30 flex items-center gap-2 animate-pulse pointer-events-none">
          <span>🧪 Thả để thêm chất vào {hoveredVessel.name}</span>
        </div>
      )}

      {/* Reaction / Pouring Active Lock Banner */}
      {isReacting && (
        <div className="absolute top-4 right-4 z-20 bg-amber-500/95 backdrop-blur-md text-white font-bold text-xs px-3.5 py-1.5 rounded-full border border-amber-400 shadow-md flex items-center gap-2 animate-pulse pointer-events-none">
          <Lock className="w-3.5 h-3.5" />
          <span>Đang thực hiện phản ứng & rót hóa chất... Tạm khóa thêm chất</span>
        </div>
      )}

      {/* Mode Status Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        {isMoveVesselMode && (
          <div className="bg-slate-900/85 backdrop-blur-md text-sky-400 font-mono text-[11px] px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm flex items-center gap-2">
            <Move className="w-3 h-3 animate-pulse" />
            <span>Chế độ di chuyển: Bấm giữ bình để kéo | Kéo sát bình khác để rót</span>
          </div>
        )}

        {isCameraLocked && (
          <div className="bg-amber-950/85 backdrop-blur-md text-amber-300 font-mono text-[11px] px-3 py-1.5 rounded-lg border border-amber-700/60 shadow-sm flex items-center gap-2">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Khung hình đã CỐ ĐỊNH HOÀN TOÀN (Đã khóa cả xoay và di chuyển)</span>
          </div>
        )}
      </div>

      {/* Mouse Interaction Instruction Tip */}
      <div className="absolute bottom-5 right-5 z-10 hidden sm:flex items-center gap-2 text-[11px] text-slate-400/80 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-none">
        <span>{isCameraLocked ? '🔒 Khung hình đang khóa' : '💡 Giữ chuột phải để di chuyển khung hình'}</span>
        <span>•</span>
        <span>Cuộn chuột để zoom</span>
      </div>

      {/* Camera Controls Floating HUD */}
      <div className="absolute bottom-5 left-5 z-10 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-md">
        <button
          onClick={resetCamera}
          className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-sky-400 hover:bg-slate-800 rounded-md transition-colors"
          title="Góc nhìn phối cảnh mặc định"
        >
          Mặc định
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={topView}
          className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-sky-400 hover:bg-slate-800 rounded-md transition-colors"
          title="Góc nhìn thẳng từ trên xuống"
        >
          Nhìn từ trên
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={toggleCameraLock}
          className={`px-2 py-1 text-xs font-medium flex items-center gap-1 rounded-md transition-colors ${
            isCameraLocked ? 'text-amber-400 bg-amber-950/50 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Bật/Tắt cố định khung hình hoàn toàn"
        >
          {isCameraLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          <span>{isCameraLocked ? 'Khóa khung hình' : 'Mở xoay'}</span>
        </button>
      </div>
    </div>
  );
};
