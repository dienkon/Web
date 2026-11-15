import React, { useRef, useMemo } from 'react';
import { simulationFrameDt } from '../../../core/clock';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { useToolDock } from '../../../handling/toolDock';
import { instrumentHome } from '../../../handling/instrumentCatalog';
import { useInstrumentStore } from '../../../handling/instrumentState';
import { aspiratePipette, dispensePipette } from '../../../handling/instrumentOperations';
import { getWorldVesselProfile } from '../../../pour/physics/profiles';
import { HANDHELD_PIPETTE_TIP_LOCAL_Y } from '../../../handling/dropFlight';
import { RinsePoseMotion, rinseToolPose } from '../../../handling/instrumentRinseVisual';
import { pipettePresentationView, pipetteTargetUnchanged, type PipettePresentation } from '../../../handling/pipettePresentation';
import { pipetteHasRinseSample } from '../../../handling/instrumentRinse';
import { SCENE_GRAVITY, streamRadiusForFlow } from '../../../science/sceneUnits';

const glassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.05,
  transmission: 0.94,
  thickness: 0.15,
  ior: 1.5,
  transparent: true,
  opacity: 0.85,
});

export const InteractivePipette = React.memo(function InteractivePipette({
  targetVesselId,
  position: initialPosition = instrumentHome('pipette'),
}: {
  targetVesselId?: string | null;
  position?: [number, number, number];
}) {
  const dock = useToolDock('pipette', initialPosition);
  const scene = useThree(state => state.scene);
  const position = dock.position;
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const rinsing = useAppStore(state => state.instrumentRinse?.tool === 'pipette');

  const presenting = useInstrumentStore(state => state.pipettePresentations.length > 0);

  const pipetteGroupRef = useRef<THREE.Group>(null);
  const rinseMotion = useRef(new RinsePoseMotion());
  const columnRef = useRef<THREE.Mesh>(null);
  const bulbRef = useRef<THREE.Group>(null);
  const effectRef = useRef<THREE.Group>(null);
  const jetRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const dropsRef = useRef<THREE.InstancedMesh>(null);
  const receiptMotion = useRef<{ id: number; from: THREE.Vector3; rotation: THREE.Quaternion } | null>(null);
  const scratch = useMemo(() => ({ start: new THREE.Vector3(), end: new THREE.Vector3(), target: new THREE.Vector3(),
    rotation: new THREE.Quaternion(), dummy: new THREE.Object3D() }), []);
  const targetId = targetVesselId ?? selectedVesselId;
  const targetVessel = useAppStore(state => targetId ? state.vessels[targetId] : undefined);

  // Active if selected in toolbar or clicked
  const isActive = activeTool === 'pipette' && !dock.moveMode && !rinsing;

  // Position: either hovering above the active vessel or at resting rack position
  const targetWorldPos = useMemo(() => {
    if (isActive && targetVessel) {
      return new THREE.Vector3(targetVessel.position[0], targetVessel.position[1]
        + getWorldVesselProfile(targetVessel.type, targetVessel.capacity_ml).lipLocal[1] + 0.1 - HANDHELD_PIPETTE_TIP_LOCAL_Y, targetVessel.position[2]);
    }
    return new THREE.Vector3(...position);
  }, [isActive, targetVessel, position]);

  useFrame((_, delta) => {
    const group = pipetteGroupRef.current;
    if (!group) return;
    const app = useAppStore.getState(), dt = simulationFrameDt(delta, app);
    const instrument = useInstrumentStore.getState();
    instrument.advancePipettePresentation(dt, app.pourEpoch, receipt => pipetteTargetUnchanged(receipt, app.vessels[receipt.targetId]));
    const receipt = useInstrumentStore.getState().pipettePresentations[0];
    const view = receipt ? pipettePresentationView(receipt) : null;
    const inventory = view?.inventory ?? { volume_ml: app.pipetteSample?.volume_ml ?? 0, color: app.pipetteSample?.color ?? null };
    if (columnRef.current) {
      const fill = Math.min(1, Math.max(0, inventory.volume_ml / 10));
      columnRef.current.visible = fill > 0 && !!inventory.color;
      columnRef.current.scale.y = fill * 1.2;
      columnRef.current.position.y = -0.65 + fill * 0.6;
      if (inventory.color) (columnRef.current.material as THREE.MeshStandardMaterial).color.set(inventory.color);
    }
    if (bulbRef.current) bulbRef.current.scale.y = view?.phase === 'transferring'
      ? receipt?.direction === 'dispense' ? 0.65 : 0.65 + view.progress * 0.35 : 1;
    if (effectRef.current) effectRef.current.visible = !!receipt && receipt.direction === 'dispense' && view?.phase !== 'positioning';
    if (receipt && view) {
      group.visible = true;
      group.userData.pipetteReceipt = { id: receipt.id, targetId: receipt.targetId, direction: receipt.direction,
        volume_ml: receipt.volume_ml, color: receipt.color, elapsed_s: receipt.elapsed_s, phase: view.phase };
      if (receiptMotion.current?.id !== receipt.id) receiptMotion.current = {
        id: receipt.id, from: group.position.clone(), rotation: group.quaternion.clone(),
      };
      const t = Math.min(1, receipt.elapsed_s / receipt.position_s), progress = t * t * (3 - 2 * t);
      group.position.lerpVectors(receiptMotion.current.from, scratch.target.fromArray(receipt.toolPosition), progress);
      scratch.rotation.fromArray(receipt.toolRotation);
      group.quaternion.slerpQuaternions(receiptMotion.current.rotation, scratch.rotation, progress);
      drawReceipt(receipt, view);
      return;
    }
    if (effectRef.current) effectRef.current.visible = false;
    if (jetRef.current) jetRef.current.visible = false;
    if (dropsRef.current) dropsRef.current.visible = false;
    if (rippleRef.current) rippleRef.current.visible = false;
    delete group.userData.pipetteReceipt;
    receiptMotion.current = null;
    const rinse = app.instrumentRinse?.tool === 'pipette' ? app.instrumentRinse : null;
    if (rinseMotion.current.apply(group, rinse, rinse && rinseToolPose(rinse), {
      position: [targetWorldPos.x, targetWorldPos.y, targetWorldPos.z],
      rotation: [isActive && targetVessel ? 0 : -Math.PI / 2, 0, 0],
    }, dt, app.pourEpoch)) { group.visible = true; return; }
    group.visible = dock.visible;
    group.position.lerp(targetWorldPos, 1 - Math.exp(-dt * 8));
    scratch.rotation.setFromEuler(new THREE.Euler(isActive && targetVessel ? 0 : -Math.PI / 2, 0, 0));
    group.quaternion.slerp(scratch.rotation, 1 - Math.exp(-dt * 12));
  }, -1);

  function drawReceipt(receipt: PipettePresentation, view: ReturnType<typeof pipettePresentationView>) {
    const jet = jetRef.current, ripple = rippleRef.current, drops = dropsRef.current;
    if (jet) {
      jet.visible = view.stream;
      if (view.stream) {
        scratch.start.fromArray(receipt.outlet); scratch.end.fromArray(receipt.surface);
        jet.position.copy(scratch.start).add(scratch.end).multiplyScalar(0.5);
        jet.lookAt(scratch.end); jet.rotateX(Math.PI / 2);
        const length = scratch.start.distanceTo(scratch.end);
        const speed = Math.sqrt(2 * SCENE_GRAVITY * Math.max(0.005, (receipt.outlet[1] - receipt.surface[1]) / 2));
        const radius = streamRadiusForFlow(view.flowRate_ml_s, speed);
        jet.scale.set(radius, length, radius);
        (jet.material as THREE.MeshPhysicalMaterial).color.set(receipt.color);
      }
    }
    if (drops) {
      drops.visible = receipt.drops.length > 0;
      (drops.material as THREE.MeshPhysicalMaterial).color.set(receipt.color);
      for (let i = 0; i < 4; i++) {
        const drop = view.drops[i];
        scratch.dummy.position.fromArray(drop?.position ?? receipt.outlet);
        scratch.dummy.scale.setScalar(drop?.visible ? drop.radius : 0);
        scratch.dummy.updateMatrix(); drops.setMatrixAt(i, scratch.dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
    if (ripple) {
      const age = receipt.elapsed_s - receipt.position_s - receipt.transfer_s;
      ripple.visible = age >= 0 && age < receipt.drain_s;
      if (ripple.visible) {
        ripple.position.fromArray(receipt.surface); ripple.position.y += 0.002;
        const radius = Math.cbrt(receipt.volume_ml) * (0.04 + age * 0.5);
        ripple.scale.setScalar(radius);
        const material = ripple.material as THREE.MeshBasicMaterial;
        material.color.set(receipt.color); material.opacity = (1 - age / receipt.drain_s) * 0.4;
      }
    }
  }

  const handleBulbClick = (e: any) => {
    e.stopPropagation();
    if (dock.moveMode || rinsing || rinseMotion.current.hasPose) return;
    if (!isActive) { setActiveTool('pipette'); return; }
    if (targetVesselId) useAppStore.getState().setSelectedVesselId(targetVesselId);
    if (!pipetteHasRinseSample(useAppStore.getState().pipetteSample)) {
      aspiratePipette(10);
    } else {
      dispensePipette(2.5);
    }
  };

  if (!dock.visible && !rinsing && !rinseMotion.current.hasPose && !presenting) return null;

  return (
    <><group
      ref={pipetteGroupRef}
      name="tool-pipette" visible={dock.visible || rinsing || rinseMotion.current.hasPose || presenting}
      position={position} rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={event => { if (rinsing || rinseMotion.current.hasPose || presenting) event.stopPropagation(); else dock.onPointerDown(event); }}
      onClick={(e) => {
        e.stopPropagation();
        if (dock.moveMode || rinsing || rinseMotion.current.hasPose) return;
        setActiveTool(isActive ? 'none' : 'pipette');
      }}
      onPointerOver={() => { document.body.style.cursor = rinsing || rinseMotion.current.hasPose || presenting ? 'wait' : dock.moveMode ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
{/* Glass Barrel Stem */}
      <mesh material={glassMaterial} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1.4, 16, 1, true]} />
      </mesh>

      {/* Graduation Markings */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -0.4 + i * 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.046, 0.048, 12]} />
          <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}

      {/* Drawn Liquid Column Inside Capillary */}
      <mesh ref={columnRef} name="pipette-liquid-column" visible={false}>
        <cylinderGeometry args={[0.038, 0.038, 1, 12]} />
        <meshStandardMaterial transparent opacity={0.8} roughness={0.1} />
      </mesh>

      {/* Narrow Drawn Tapered Delivery Tip */}
      <mesh name="tool-pipette-outlet" material={glassMaterial} position={[0, HANDHELD_PIPETTE_TIP_LOCAL_Y + 0.175, 0]}>
        <cylinderGeometry args={[0.045, 0.012, 0.35, 16]} />
      </mesh>

      {/* Compressible Rubber Suction Bulb */}
      <group
        ref={bulbRef}
        name="pipette-bulb"
        position={[0, 0.85, 0]}
        onPointerDown={(event) => {
          if (rinsing || rinseMotion.current.hasPose) { event.stopPropagation(); return; }
          if (dock.moveMode && presenting) { event.stopPropagation(); return; }
          if (dock.moveMode) dock.onPointerDown(event);
          else handleBulbClick(event);
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.65} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.07, 0.05, 0.12, 16]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.7} />
        </mesh>
      </group>

    </group>
      {createPortal(<group ref={effectRef} name="pipette-stream" visible={false}>
        <mesh ref={jetRef} name="pipette-stream-jet" visible={false}>
          <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
          <meshPhysicalMaterial transparent opacity={0.82} transmission={0.4} roughness={0.06} ior={1.38} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <instancedMesh ref={dropsRef} name="pipette-transfer-drops" args={[undefined, undefined, 4]} frustumCulled={false} visible={false}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshPhysicalMaterial transparent opacity={0.85} transmission={0.4} roughness={0.08} ior={1.38} depthWrite={false} />
        </instancedMesh>
        <mesh ref={rippleRef} name="pipette-transfer-ripple" visible={false} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 1, 20]} />
          <meshBasicMaterial transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>, scene)}
    </>
  );
});
