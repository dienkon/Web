import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, Grid, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { PostFX } from '../../vfx/post/PostFX';
import { useQualityStore, getQualitySettings, QualityTier } from '../../vfx/quality';
import { getLaboratoryTileTexture, getSkyGradientTexture, getSunbeamTexture, getNoiseTexture } from '../../vfx/textures';
import { SunbeamDust } from '../../vfx/environment/SunbeamDust';
import { 
  Beaker, Flask, TestTube, GraduatedCylinder, WatchGlass, EvaporatingDish, Crucible, PetriDish, 
  VolumetricFlask, SeparatoryFunnel, FilterFunnel, MortarPestle, LiebigCondenser, TestTubeRack, WashBottle, LabTongs,
  Bottle, BuretteApparatus, DigitalBalance 
} from './Vessels';
import { AlcoholBurner } from './AlcoholBurner';
import { AddingAnimation, VesselPourAnimation } from './PouringBottle';
import { PerformanceHUD } from './PerformanceHUD';
import { CameraControls } from './CameraControls';
import { InteractivePipette } from './interactions/InteractivePipette';
import { InteractiveStirringRod } from './interactions/InteractiveStirringRod';
import { InteractiveThermometer } from './interactions/InteractiveThermometer';
import { InteractiveSpatula } from './interactions/InteractiveSpatula';
import { InteractiveSponge } from './interactions/InteractiveSponge';
import { WorkbenchSpills } from './WorkbenchSpills';
import { useAppStore } from '../../store/useAppStore';
import { VfxDirector } from '../../vfx/director';
import { PhysicalStreamRenderer } from '../../pour/render/PhysicalStreamRenderer';
import { SimulationDebugGizmos } from '../../simulation/render/SimulationDebugGizmos';
import { PourController } from '../../pour/controller/PourController';
import { wheelRouter } from '../../input/WheelRouter';
import { HandRig } from '../../handling/HandRig';
import { ShardsRenderer } from './ShardsRenderer';
import { RetortStand } from '../../apparatus/Stand';
import { RetortClamp } from '../../apparatus/Clamp';
import { Stopper } from '../../apparatus/Stopper';
import { PneumaticTrough } from '../../apparatus/Trough';
import { HotPlate } from '../../apparatus/HotPlate';
import { openRadialMenu } from '../../ui/RadialMenu';
import { TouchGestureRecognizer } from '../../input/TouchGestures';
import { getVesselGripSpec } from '../../handling/gripPoints';
import { clampLift } from '../../handling/limits';
import { VesselFloorRing } from './Vessels';

function DragDropRaycaster() {
  const { camera, gl } = useThree();
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const setPendingDispense = useAppStore(state => state.setPendingDispense);
  const setIsDraggingChemical = useAppStore(state => state.setIsDraggingChemical);

  useEffect(() => {
    const canvasEl = gl.domElement;
    const raycaster = new THREE.Raycaster();
    // Table plane is at Y = -0.135 (table top surface is -1.175, vessel base sits at -0.135)
    const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.135);
    const intersectPoint = new THREE.Vector3();

    const getNearestVessel = (clientX: number, clientY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }

      // Convert client coordinates to normalized device coordinates (-1 to +1)
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      let closestId: string | null = null;
      let minDistance3D = 2.4; // 3D distance radius around vessel mouth

      const hasIntersect = raycaster.ray.intersectPlane(tablePlane, intersectPoint);
      const vessels = useAppStore.getState().vessels;

      if (hasIntersect) {
        for (const [id, vessel] of Object.entries(vessels)) {
          // Compare (X, Z) coordinates of intersection point with vessel position
          const dx = vessel.position[0] - intersectPoint.x;
          const dz = vessel.position[2] - intersectPoint.z;
          const dist3D = Math.hypot(dx, dz);
          if (dist3D < minDistance3D) {
            minDistance3D = dist3D;
            closestId = id;
          }
        }
      }

      // 2D screen projection verification if raycast missed plane boundary
      if (!closestId) {
        let minPixelDist = 130;
        const projVec = new THREE.Vector3();
        for (const [id, vessel] of Object.entries(vessels)) {
          projVec.set(vessel.position[0], vessel.position[1] + 0.6, vessel.position[2]);
          projVec.project(camera);
          if (projVec.z > 1) continue; // Behind camera

          const screenX = ((projVec.x + 1) / 2) * rect.width + rect.left;
          const screenY = ((-projVec.y + 1) / 2) * rect.height + rect.top;

          const dist = Math.hypot(clientX - screenX, clientY - screenY);
          if (dist < minPixelDist) {
            minPixelDist = dist;
            closestId = id;
          }
        }
      }

      return closestId;
    };

    let lastHoveredId: string | null = null;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      const nearestId = getNearestVessel(e.clientX, e.clientY);
      if (nearestId !== lastHoveredId) {
        lastHoveredId = nearestId;
        setHoveredVesselId(nearestId);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const formula = e.dataTransfer?.getData('chemical') || useAppStore.getState().isDraggingChemical;
      if (!formula) return;

      // STRICT SPATIAL MATCHING: ONLY assign to vessel where mouse was actually dropped!
      const targetId = getNearestVessel(e.clientX, e.clientY);

      if (targetId) {
        setPendingDispense({ chemical: formula, targetVesselId: targetId });
      }
      lastHoveredId = null;
      setHoveredVesselId(null);
      setIsDraggingChemical(null);
    };

    const handleDragLeave = () => {
      if (lastHoveredId !== null) {
        lastHoveredId = null;
        setHoveredVesselId(null);
      }
    };

    canvasEl.addEventListener('dragover', handleDragOver);
    canvasEl.addEventListener('drop', handleDrop);
    canvasEl.addEventListener('dragleave', handleDragLeave);

    return () => {
      canvasEl.removeEventListener('dragover', handleDragOver);
      canvasEl.removeEventListener('drop', handleDrop);
      canvasEl.removeEventListener('dragleave', handleDragLeave);
    };
  }, [camera, gl, setHoveredVesselId, setPendingDispense, setIsDraggingChemical]);

  return null;
}

// Interactive wrapper for apparatus pieces (stands, clamps, stoppers, troughs, hotplates)
const ApparatusInteractive = React.memo(function ApparatusInteractive({
  id,
  position,
  children
}: {
  id: string;
  position: [number, number, number];
  children: React.ReactNode;
}) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);
  const setSelectedVesselId = useAppStore(state => state.setSelectedVesselId);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  if (!vessel) return null;
  const renderPos = isDragging ? [position[0], position[1] + 0.25, position[2]] : position;

  return (
    <group
      position={renderPos as [number, number, number]}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        openVesselInfo(id);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing
        isSelected={isSelected}
        isDropTarget={false}
      />
      {children}
    </group>
  );
});

// Atomic vessel renderer that only updates when its specific vessel changes
const SceneVessel = React.memo(function SceneVessel({ id }: { id: string }) {
  const isCurrentlyPouring = useAppStore(state => state.vesselPourAnimation?.fromId === id);
  const type = useAppStore(state => state.vessels[id]?.type);
  const position = useAppStore(state => state.vessels[id]?.position);

  if (isCurrentlyPouring || !type || !position) return null;

  if (type === 'flask') {
    return <Flask position={position} id={id} />;
  } else if (type === 'test_tube') {
    return <TestTube position={position} id={id} />;
  } else if (type === 'cylinder') {
    return <GraduatedCylinder position={position} id={id} />;
  } else if (type === 'watch_glass') {
    return <WatchGlass position={position} id={id} />;
  } else if (type === 'evaporating_dish') {
    return <EvaporatingDish position={position} id={id} />;
  } else if (type === 'crucible') {
    return <Crucible position={position} id={id} />;
  } else if (type === 'petri_dish') {
    return <PetriDish position={position} id={id} />;
  } else if (type === 'volumetric_flask') {
    return <VolumetricFlask position={position} id={id} />;
  } else if (type === 'separatory_funnel') {
    return <SeparatoryFunnel position={position} id={id} />;
  } else if (type === 'filter_funnel') {
    return <FilterFunnel position={position} id={id} />;
  } else if (type === 'mortar_pestle') {
    return <MortarPestle position={position} id={id} />;
  } else if (type === 'condenser') {
    return <LiebigCondenser position={position} id={id} />;
  } else if (type === 'test_tube_rack') {
    return <TestTubeRack position={position} id={id} />;
  } else if (type === 'wash_bottle') {
    return <WashBottle position={position} id={id} />;
  } else if (type === 'tongs') {
    return <LabTongs position={position} id={id} />;
  } else if (type === 'retort_stand') {
    return <ApparatusInteractive id={id} position={position}><RetortStand position={[0, 0, 0]} /></ApparatusInteractive>;
  } else if (type === 'retort_clamp') {
    return <ApparatusInteractive id={id} position={position}><RetortClamp position={[0, 0, 0]} /></ApparatusInteractive>;
  } else if (type === 'stopper') {
    return <ApparatusInteractive id={id} position={position}><Stopper position={[0, 0, 0]} /></ApparatusInteractive>;
  } else if (type === 'pneumatic_trough') {
    return <ApparatusInteractive id={id} position={position}><PneumaticTrough position={[0, 0, 0]} /></ApparatusInteractive>;
  } else if (type === 'hot_plate') {
    return <ApparatusInteractive id={id} position={position}><HotPlate position={[0, 0, 0]} temperature_c={useAppStore.getState().vessels[id]?.temperature_c ?? 25} /></ApparatusInteractive>;
  }
  return <Beaker position={position} id={id} />;
});

// Atomic alcohol burner renderer
const SceneBurner = React.memo(function SceneBurner({ id }: { id: string }) {
  const burner = useAppStore(state => state.burners[id]);
  if (!burner) return null;
  return (
    <AlcoholBurner 
      id={id} 
      position={burner.position} 
      isOn={burner.isOn} 
      intensity={burner.intensity || 3} 
    />
  );
});

function SceneEnvironmentSetup({ tier }: { tier: QualityTier }) {
  const { scene, gl } = useThree();
  const settings = getQualitySettings(tier);

  useEffect(() => {
    (scene as any).environmentIntensity = 0.9;
    gl.localClippingEnabled = true;
    if (!settings.usePostFX) {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
    } else {
      gl.toneMapping = THREE.NoToneMapping;
    }
  }, [scene, gl, settings.usePostFX]);

  return null;
}

function SimulationTicker() {
  const tickSimulation = useAppStore(state => state.tickSimulation);
  useFrame((_, delta) => {
    tickSimulation(delta);
    const state = useAppStore.getState();
    PourController.tick(delta, state.vessels as any, state.isSimulationPaused, state.timeScale);
  });
  return null;
}


export function LabScene() {
  const pouringChemical = useAppStore(state => state.pouringChemical);
  const clearPour = useAppStore(state => state.clearPour);
  const vesselPourAnimation = useAppStore(state => state.vesselPourAnimation);
  const startVesselPourAnimation = useAppStore(state => state.startVesselPourAnimation);
  const finishVesselPourAnimation = useAppStore(state => state.finishVesselPourAnimation);

  const vesselIds = useAppStore(state => state.vesselIds);
  const burnerIds = useAppStore(state => state.burnerIds);
  const snapToGrid = useAppStore(state => state.snapToGrid);
  
  const moveMode = useAppStore(state => state.moveMode);
  const draggingVesselId = useAppStore(state => state.draggingVesselId);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const updateVesselPosition = useAppStore(state => state.updateVesselPosition);
  const updateBurnerPosition = useAppStore(state => state.updateBurnerPosition);
  const setNearestPourTargetId = useAppStore(state => state.setNearestPourTargetId);
  const activeTool = useAppStore(state => state.activeTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);

  const handlePointerMove = (e: any) => {
    if (!draggingVesselId) return;
    
    if (draggingVesselId.startsWith('burner')) {
      const state = useAppStore.getState();
      const burner = state.burners[draggingVesselId];
      const newBurnerPos: [number, number, number] = [e.point.x, -0.975, e.point.z];
      updateBurnerPosition(draggingVesselId, newBurnerPos);

      // If a vessel is placed on this burner, move it together smoothly
      if (burner) {
        for (const [vId, v] of Object.entries(state.vessels)) {
          const dist = Math.hypot(v.position[0] - burner.position[0], v.position[2] - burner.position[2]);
          if (dist < 0.5 && v.position[1] > 0.5) {
            const vesselType = v.type;
            const vY = newBurnerPos[1] + (vesselType === 'test_tube' ? 2.31 : 2.49);
            updateVesselPosition(vId, [newBurnerPos[0], vY, newBurnerPos[2]]);
          }
        }
      }
      return;
    }

    // Physical snapping logic
    let targetX = e.point.x;
    let targetZ = e.point.z;
    let targetY = -0.135;

    // Check snapping to analytical balance pan
    const balanceX = 7.5;
    const balanceZ = -2.5;
    const distToBalance = Math.hypot(e.point.x - balanceX, e.point.z - balanceZ);

    if (distToBalance < 0.85) {
      targetX = balanceX;
      targetZ = balanceZ;
      targetY = -0.02;
    } else {
      // Check snapping to active alcohol burner wire gauze
      const state = useAppStore.getState();
      let snapped = false;
      for (const b of Object.values(state.burners)) {
        const distToBurner = Math.hypot(e.point.x - b.position[0], e.point.z - b.position[2]);
        if (distToBurner < 0.85) {
          targetX = b.position[0];
          targetZ = b.position[2];
          const vesselType = state.vessels[draggingVesselId]?.type;
          targetY = b.position[1] + (vesselType === 'test_tube' ? 2.31 : 2.49);
          snapped = true;
          break;
        }
      }

      // Snapping filter funnel to flask/beaker neck
      const draggedType = state.vessels[draggingVesselId]?.type;
      if (!snapped && draggedType === 'filter_funnel') {
        for (const [vId, other] of Object.entries(state.vessels)) {
          if (vId !== draggingVesselId && (other.type === 'flask' || other.type === 'beaker' || other.type === 'cylinder')) {
            const distToReceiver = Math.hypot(e.point.x - other.position[0], e.point.z - other.position[2]);
            if (distToReceiver < 0.75) {
              targetX = other.position[0];
              targetZ = other.position[2];
              targetY = other.position[1] + (other.type === 'flask' ? 1.35 : 1.15);
              snapped = true;
              break;
            }
          }
        }
      }

      // Snapping test tube vertically above test tube rack
      if (!snapped && draggedType === 'test_tube') {
        for (const r of Object.values(state.vessels)) {
          if (r.type === 'test_tube_rack') {
            const distToRack = Math.hypot(e.point.x - r.position[0], e.point.z - r.position[2]);
            if (distToRack < 1.2) {
              targetY = r.position[1] + 0.45;
              break;
            }
          }
        }
      }
    }

    const currentDragPos: [number, number, number] = [targetX, targetY, targetZ];
    updateVesselPosition(draggingVesselId, currentDragPos);

    // Precise spatial pour target recognition: calculate distance to all other vessels
    const state = useAppStore.getState();
    const dropRadius = 2.0;
    let closestTargetId: string | null = null;
    let closestDistance = dropRadius;

    for (const [id, target] of Object.entries(state.vessels)) {
      if (id !== draggingVesselId) {
        const dx = target.position[0] - currentDragPos[0];
        const dz = target.position[2] - currentDragPos[2];
        const dist = Math.hypot(dx, dz);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestTargetId = id;
        }
      }
    }

    setNearestPourTargetId(closestTargetId);
  };

  const handlePointerUp = () => {
    if (!draggingVesselId) return;
    
    if (draggingVesselId.startsWith('burner')) {
      setDraggingVesselId(null);
      return;
    }
    
    const state = useAppStore.getState();
    const nearestTarget = state.nearestPourTargetId;
    const draggedVessel = state.vessels[draggingVesselId];

    // Auto-slot test tube into rack when released near rack
    if (draggedVessel && draggedVessel.type === 'test_tube') {
      for (const [rId, r] of Object.entries(state.vessels)) {
        if (r.type === 'test_tube_rack' && !(r.slottedTestTubeIds || []).includes(draggingVesselId)) {
          const distToRack = Math.hypot(draggedVessel.position[0] - r.position[0], draggedVessel.position[2] - r.position[2]);
          if (distToRack < 1.0) {
            state.placeTestTubeInRack(rId, draggingVesselId);
            break;
          }
        }
      }
    }

    // Auto-grip crucible/beaker when tongs are released directly over them
    if (draggedVessel && draggedVessel.type === 'tongs' && !draggedVessel.grippedVesselId) {
      for (const [targetVId, targetV] of Object.entries(state.vessels)) {
        if (targetVId !== draggingVesselId && (targetV.type === 'crucible' || targetV.type === 'beaker' || targetV.type === 'test_tube')) {
          const distToTarget = Math.hypot(draggedVessel.position[0] - targetV.position[0], draggedVessel.position[2] - targetV.position[2]);
          if (distToTarget < 0.75) {
            state.toggleGripWithTongs(draggingVesselId, targetVId);
            break;
          }
        }
      }
    }

    if (nearestTarget && draggedVessel && state.vessels[nearestTarget]) {
      // Trigger real-time physical pouring pipeline with zero script delay
      PourController.beginPour({
        mode: 'ASSIST',
        sourceId: draggingVesselId,
        targetId: nearestTarget
      });
    }
    
    setNearestPourTargetId(null);
    setDraggingVesselId(null);
  };
  
  const selectedVessel = selectedVesselId ? vessels[selectedVesselId] : null;

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const handlePerformanceDecline = useQualityStore(state => state.handlePerformanceDecline);
  const handlePerformanceIncline = useQualityStore(state => state.handlePerformanceIncline);
  const qualitySettings = getQualitySettings(effectiveTier);

  // Procedural environment textures
  const { map: tileMap, normal: tileNormal } = useMemo(() => getLaboratoryTileTexture(), []);
  const skyMap = useMemo(() => getSkyGradientTexture(), []);
  const sunbeamMap = useMemo(() => getSunbeamTexture(), []);
  const noiseNormalMap = useMemo(() => getNoiseTexture(256, 256), []);

  const touchRecognizer = useMemo(() => new TouchGestureRecognizer({
    onTiltChange: (deltaRad) => {
      const session = PourController.getSession();
      const store = useAppStore.getState();
      const heldId = store.draggingVesselId || store.selectedVesselId;
      if (session) {
        PourController.setTilt(session.targetTilt + deltaRad);
      } else if (heldId) {
        PourController.beginPour({
          mode: 'HAND_TILT',
          sourceId: heldId,
          targetId: store.nearestPourTargetId || null
        });
        PourController.setTilt(deltaRad);
      }
    },
    onYawChange: (deltaRad) => {
      const store = useAppStore.getState();
      const heldId = store.draggingVesselId || store.selectedVesselId;
      if (heldId) {
        store.rotateVessel(heldId, deltaRad);
      }
    },
    onLiftChange: (deltaY) => {
      const store = useAppStore.getState();
      const heldId = store.draggingVesselId || store.selectedVesselId;
      const v = heldId ? store.vessels[heldId] : null;
      if (v && heldId) {
        const newLift = clampLift(v.type, v.position[1] + deltaY);
        store.updateVesselPosition(heldId, [v.position[0], newLift, v.position[2]]);
      }
    },
    onLongPress: (x, y) => {
      const store = useAppStore.getState();
      if (store.draggingVesselId) {
        store.setDraggingVesselId(null);
      } else if (store.selectedVesselId) {
        store.setDraggingVesselId(store.selectedVesselId);
      }
    },
    onDoubleTap: (x, y) => {
      const store = useAppStore.getState();
      const targetId = store.hoveredVesselId || store.selectedVesselId;
      if (targetId) {
        openRadialMenu(x, y, targetId);
      }
    }
  }), []);

  const containerRef = useRef<HTMLDivElement>(null);

  // Non-passive wheel listener for smooth parameter adjustment & camera zoom without warnings
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      wheelRouter.handleWheel(e);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Middle-mouse button click (auxclick / wheel button):
  // When 2 vessels are close to each other, clicking middle mouse locks/unlocks camera to allow wheel tilting without zooming
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1) { // Middle mouse wheel button
        const store = useAppStore.getState();
        const targetId = store.nearestPourTargetId;
        const sourceId = store.draggingVesselId || store.selectedVesselId;

        if (sourceId && targetId && sourceId !== targetId) {
          e.preventDefault();
          const nextLocked = !store.isPourTiltLocked;
          store.setPourTiltLocked(nextLocked);
          if (nextLocked) {
            PourController.beginPour({
              mode: 'HAND_TILT',
              sourceId,
              targetId
            });
            store.showToast(
              store.language === 'en'
                ? '🔒 Camera locked — Scroll mouse wheel to tilt & pour'
                : '🔒 Đã khóa góc nhìn — Lăn chuột để nghiêng bình rót',
              'info'
            );
          } else {
            const session = PourController.getSession();
            if (session) {
              PourController.setTilt(0);
            }
            store.showToast(
              store.language === 'en' ? '🔓 Camera unlocked' : '🔓 Đã mở khóa góc nhìn',
              'info'
            );
          }
        }
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative z-10 select-none" 
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={(e) => touchRecognizer.handleTouchStart(e.nativeEvent)}
      onTouchMove={(e) => touchRecognizer.handleTouchMove(e.nativeEvent)}
      onTouchEnd={(e) => touchRecognizer.handleTouchEnd(e.nativeEvent)}
    >
      {/* Non-intrusive lightweight FPS Performance HUD */}
      <PerformanceHUD />

      <Canvas 
        shadows="percentage"
        dpr={[1, qualitySettings.dprMax]}
        camera={{ position: [0, 5.2, 12], fov: 45, near: 0.1, far: 120 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.NoToneMapping,
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        onPointerMissed={(e) => {
          if (e.type === 'click') {
            useAppStore.getState().setSelectedVesselId(null);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PerformanceMonitor
          onDecline={handlePerformanceDecline}
          onIncline={handlePerformanceIncline}
        />
        <SceneEnvironmentSetup tier={effectiveTier} />

        {/* Procedural Laboratory Environment with fluorescent tube reflections */}
        <Environment resolution={256} frames={1}>
          {/* Main overhead softbox */}
          <Lightformer
            form="rect"
            intensity={3.0}
            color="#fffaf0"
            position={[0, 8, 0]}
            scale={[14, 10, 1]}
            target={[0, 0, 0]}
          />
          {/* Dual longitudinal fluorescent strips for authentic glassware reflection streaks */}
          <Lightformer
            form="rect"
            intensity={2.5}
            color="#ffffff"
            position={[-8, 4, 3]}
            scale={[0.6, 8, 1]}
            rotation={[0, Math.PI / 3, 0]}
          />
          <Lightformer
            form="rect"
            intensity={2.2}
            color="#f0f9ff"
            position={[8, 4, 3]}
            scale={[0.6, 8, 1]}
            rotation={[0, -Math.PI / 3, 0]}
          />
          {/* Pale window sky light */}
          <Lightformer
            form="rect"
            intensity={1.8}
            color="#bae6fd"
            position={[-10, 6, -5]}
            scale={[8, 6, 1]}
          />
          {/* Dark zone behind camera for glassware refraction contrast */}
          <Lightformer
            form="rect"
            intensity={0.0}
            color="#020617"
            position={[0, 4, 15]}
            scale={[16, 10, 1]}
          />
        </Environment>

        {/* Directional & shadow illumination - Pure Clean Laboratory Lighting */}
        <ambientLight intensity={0.5} color="#f8fafc" />
        <directionalLight 
          position={[6, 14, 7]} 
          intensity={2.0} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-camera-near={1}
          shadow-camera-far={32}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
          shadow-radius={2}
          color="#ffffff"
        />
        {/* Soft balanced laboratory fill lights */}
        <pointLight position={[-6, 7, 5]} intensity={0.4} color="#f1f5f9" />
        <pointLight position={[6, 6, -3]} intensity={0.35} color="#f1f5f9" />
        
        {/* Invisible Drag Interaction Plane */}
        {(moveMode || !!draggingVesselId) && (
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.135, 0]} 
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            visible={false}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial />
          </mesh>
        )}

        {/* High-Contrast Realistic Matte Slate Laboratory Workbench (Bàn thí nghiệm màu đen xám chống hóa chất chuẩn) */}
        <group position={[0, -1.35, 0]}>
          {/* Main Worktop Slab: Solid Chemical-Resistant Dark Slate Epoxy Resin */}
          <mesh 
            receiveShadow 
            castShadow 
            position={[0, 0, 0]}
            onPointerDown={(e) => {
              const state = useAppStore.getState();
              if (state.activeTool === 'sponge') {
                state.wipeSpillAt([e.point.x, -1.155, e.point.z], 0.75);
                return;
              }
              // Click on empty workbench clears vessel selection
              if (!state.draggingVesselId && !state.moveMode) {
                state.setSelectedVesselId(null);
              }
            }}
            onPointerMove={(e) => {
              const state = useAppStore.getState();
              if (state.activeTool === 'sponge' && e.buttons === 1) {
                state.wipeSpillAt([e.point.x, -1.155, e.point.z], 0.75);
              }
            }}
          >
            <boxGeometry args={[32, 0.35, 13.5]} />
            {/* Authentic Non-glare Monochromatic Chemical-Resistant Solid Phenolic Resin Workbench Top */}
            <meshStandardMaterial 
              color="#1e293b" 
              roughness={0.42} 
              metalness={0.06} 
            />
          </mesh>
          {/* Front Protective Stainless Steel Edge Trim */}
          <mesh position={[0, 0, 6.78]}>
            <boxGeometry args={[32, 0.38, 0.08]} />
            <meshPhysicalMaterial color="#475569" roughness={0.25} metalness={0.8} clearcoat={0.3} />
          </mesh>
          {/* Under-counter Clean Laboratory Cabinetry */}
          <mesh position={[0, -2.2, -0.2]} receiveShadow>
            <boxGeometry args={[31.6, 4.0, 12.8]} />
            <meshStandardMaterial color="#182230" roughness={0.45} metalness={0.15} />
          </mesh>
          {/* Cabinet Handles with authentic metallic highlight */}
          {[-10, -5, 0, 5, 10].map((xOffset, idx) => (
            <group key={idx} position={[xOffset, -1.8, 6.22]}>
              <mesh position={[0, 0.4, 0.04]}>
                <boxGeometry args={[1.2, 0.1, 0.08]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Snap-to-Grid visual guide on table */}
        {snapToGrid && (
          <group position={[0, -1.16, 0]}>
            <Grid 
              args={[30, 12]} 
              cellSize={0.5} 
              cellThickness={0.8} 
              cellColor="#cbd5e1" 
              sectionSize={2.0} 
              sectionThickness={1.4} 
              sectionColor="#f59e0b" 
              fadeDistance={25} 
            />
          </group>
        )}
        
        {/* Bright Background Walls & Lab Decor */}
        <group position={[0, 0, -7]}>
          <mesh position={[0, 8, 0]} receiveShadow>
            <planeGeometry args={[44, 20]} />
            <meshStandardMaterial 
              map={tileMap} 
              normalMap={tileNormal} 
              normalScale={new THREE.Vector2(0.3, 0.3)} 
              roughness={0.25} 
              metalness={0.05} 
            />
          </mesh>
          
          {/* Laboratory Window with bright sunny sky gradient and sunbeam */}
          <group position={[-9, 5.5, 0.1]}>
            <mesh>
              <planeGeometry args={[7.2, 5.2]} />
              <meshBasicMaterial map={skyMap} toneMapped={false} />
            </mesh>
            {/* Window Outer Metallic Frame */}
            <mesh position={[0, 0, 0.06]}>
              <boxGeometry args={[7.4, 5.4, 0.12]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Window Cross Muntins */}
            <mesh position={[0, 0, 0.08]}>
              <boxGeometry args={[0.08, 5.2, 0.08]} />
              <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.08]}>
              <boxGeometry args={[7.2, 0.08, 0.08]} />
              <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>

          {/* Safety & Standards Poster */}
          <group position={[6.5, 5.2, 0.1]}>
            <mesh>
              <planeGeometry args={[3.4, 4.4]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.5, 0.02]}>
              <planeGeometry args={[3.0, 0.8]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
            <mesh position={[0, -0.6, 0.02]}>
              <planeGeometry args={[3.0, 2.6]} />
              <meshBasicMaterial color="#f1f5f9" />
            </mesh>
          </group>

          {/* Wall Baseboard Trim */}
          <mesh position={[0, -1.0, 0.1]} receiveShadow>
            <boxGeometry args={[44, 0.4, 0.2]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
        </group>
        
        {/* Reagent Shelf */}
        <mesh position={[-9, 2.2, -6.0]} receiveShadow castShadow>
          <boxGeometry args={[7.5, 0.2, 1.2]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.4} />
        </mesh>
        
        {/* Reagent Shelf Stock Bottles with Authentic GHS Labels */}
        <Bottle position={[-11.5, 2.9, -6.0]} color="#f1f5f9" formula="HCl" name="Hydrochloric Acid 37%" hazard="corrosive" />
        <Bottle position={[-10.3, 2.9, -6.0]} color="#f8fafc" formula="NaOH" name="Sodium Hydroxide 2M" hazard="corrosive" />
        <Bottle position={[-9.1, 2.9, -6.0]} color="#0284c7" formula="CuSO4" name="Copper Sulfate 1M" hazard="toxic" />
        <Bottle position={[-7.9, 2.9, -6.0]} color="#fef08a" formula="KI" name="Potassium Iodide" hazard="safe" />
        <Bottle position={[-6.7, 2.9, -6.0]} color="#e0f2fe" formula="C2H5OH" name="Ethanol 96°" hazard="flammable" />
        <Bottle position={[-5.5, 2.9, -6.0]} color="#fef3c7" formula="HNO3" name="Nitric Acid Conc" hazard="oxidizer" isAmber />

        {/* Digital Analytical Balance */}
        <DigitalBalance position={[7.5, -0.3, -2.5]} />

        {/* Burette Apparatus */}
        <BuretteApparatus position={[5.0, 0.0, 1.5]} />

        <ContactShadows position={[0, -1.16, 0]} opacity={0.65} scale={24} blur={1.8} far={4.5} color="#0f172a" />
        
        {/* Realistic Workbench Spills & Overflows */}
        <WorkbenchSpills />
        {/* Procedural Glass Shards & Fracture Pool */}
        <ShardsRenderer />
        
        {/* Standard Laboratory Alcohol Burners (Đèn cồn thí nghiệm chuẩn) */}
        {burnerIds.map(bId => (
          <SceneBurner key={bId} id={bId} />
        ))}

        {/* Dynamic Interactive Vessels */}
        {vesselIds.map(id => (
          <SceneVessel key={id} id={id} />
        ))}

        {/* Stylized Hand Rig & Grip Pivot Indicator */}
        {draggingVesselId && vessels[draggingVesselId] && (
          <HandRig
            position={vessels[draggingVesselId].position}
            visible={true}
            gripKind={getVesselGripSpec(vessels[draggingVesselId].type).preferred}
            tiltAngle={PourController.getSession()?.sourceId === draggingVesselId ? (PourController.getSession()?.tilt || 0) : 0}
          />
        )}

        {/* Handheld Interactive Physical Laboratory Tools */}
        {activeTool === 'pipette' && (
          <InteractivePipette 
            targetVesselId={selectedVesselId || undefined}
            position={selectedVessel ? [selectedVessel.position[0], selectedVessel.position[1] + 1.8, selectedVessel.position[2]] : [0, 1.2, 0]}
          />
        )}

        {activeTool === 'stirring_rod' && (
          <InteractiveStirringRod 
            position={selectedVessel ? [selectedVessel.position[0], selectedVessel.position[1] + 1.4, selectedVessel.position[2]] : [0, 1.2, 0]}
          />
        )}

        {activeTool === 'thermometer' && (
          <InteractiveThermometer 
            position={selectedVessel ? [selectedVessel.position[0], selectedVessel.position[1] + 1.6, selectedVessel.position[2]] : [-2.5, 1.2, 0]}
          />
        )}

        {activeTool === 'spatula' && (
          <InteractiveSpatula 
            position={selectedVessel ? [selectedVessel.position[0], selectedVessel.position[1] + 1.45, selectedVessel.position[2]] : [-3.8, 1.2, 0]}
          />
        )}

        {activeTool === 'sponge' && (
          <InteractiveSponge />
        )}
        
        {/* Chemical Bottle/Dropper Pouring Animation */}
        {pouringChemical && (
          <AddingAnimation 
            chemical={pouringChemical.chemical} 
            targetId={pouringChemical.targetId} 
            amount={pouringChemical.amount}
            onComplete={clearPour} 
          />
        )}

        {/* Inter-Vessel Pouring Animation */}
        {vesselPourAnimation && (
          <VesselPourAnimation 
            fromId={vesselPourAnimation.fromId} 
            toId={vesselPourAnimation.toId} 
            onComplete={finishVesselPourAnimation} 
          />
        )}
        
        {/* Camera Controls for Rotate, Zoom, and Pan */}
        <CameraControls 
          enableRotate={true} 
          enableZoom={true} 
          enablePan={true} 
        />
        <DragDropRaycaster />
        <SimulationTicker />
        <PhysicalStreamRenderer />
        <SimulationDebugGizmos />
        <VfxDirector />
        <PostFX />
      </Canvas>
    </div>
  );
}
