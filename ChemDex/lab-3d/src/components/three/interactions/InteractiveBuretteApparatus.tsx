import {useQualityStore,getQualitySettings} from '../../../vfx/quality';
import React, { useMemo, useRef, useState } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { labSound } from '../../../utils/audio';
import { useToolDock } from '../../../handling/toolDock';
import { simulationFrameDt } from '../../../core/clock';
import { BuretteFlowClock } from '../../../handling/buretteFlow';
import { findChemical } from '../../../data/chemicals';
import { findBuretteReceiver } from '../../../handling/buretteTarget';
import { BURETTE_TIP_LOCAL_Y, MAX_BURETTE_PRESENTATIONS, burettePresentationView, buretteTargetUnchanged } from '../../../handling/burettePresentation';
import { useInstrumentStore } from '../../../handling/instrumentState';
import { BURETTE_BASE_SIZE, BURETTE_POST_Z, buretteStandSupport } from '../../../handling/burettePlacement';

const glassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.05,
  transmission: 0.94,
  thickness: 0.2,
  ior: 1.52,
  transparent: true,
  opacity: 0.82,
});

const lightweightGlass=new THREE.MeshStandardMaterial({color:'#e6f4ef',transparent:true,opacity:.18,roughness:.12,depthWrite:false});

export const InteractiveBuretteApparatus = React.memo(function InteractiveBuretteApparatus() {
  const transmission=useQualityStore(state=>getQualitySettings(state.effectiveTier).glassTransmission);
  const activeGlassMaterial=transmission?glassMaterial:lightweightGlass;
  const burette = useAppStore(state => state.burette);
  const scene = useThree(state => state.scene);
  const toggleStopcock = useAppStore(state => state.toggleBuretteStopcock);
  const dispenseDrop = useAppStore(state => state.dispenseBuretteDrop);
  const dock = useToolDock('burette', burette.position, next => useAppStore.getState().updateBurette({ position: next }), true);
  const standPos = dock.position;
  const support = buretteStandSupport(standPos[1]);

  const [isValveHovered, setIsValveHovered] = useState(false);
  const dropClock = useRef(new BuretteFlowClock());
  const epoch = useRef(-1);
  const dropsRef = useRef<THREE.InstancedMesh>(null);
  const ripplesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const fillRatio = Math.max(0, Math.min(1.0, burette.currentVolume_ml / burette.maxVolume_ml));

  useFrame((_, delta) => {
    const state = useAppStore.getState(), dt = simulationFrameDt(delta, state);
    const instrument = useInstrumentStore.getState();
    if (epoch.current !== state.pourEpoch) { dropClock.current = new BuretteFlowClock(); epoch.current = state.pourEpoch; }
    instrument.advanceBurettePresentation(dt, state.pourEpoch,
      receipt => buretteTargetUnchanged(receipt, state.vessels[receipt.targetId]));
    const open = state.burette.isDispensing && !state.moveMode && !state.draggingVesselId;
    const enabled = open && (dt === 0 || !!findBuretteReceiver(state.vessels, state.burette.position));
    dropClock.current.step(dt, enabled, state.burette.flowRate_ml_s, state.burette.currentVolume_ml, age_s => {
      const live = useAppStore.getState(), receiver = findBuretteReceiver(live.vessels, live.burette.position);
      if (!receiver) return 0;
      const before = live.burette.currentVolume_ml;
      dispenseDrop(receiver.id, age_s);
      const moved = before - useAppStore.getState().burette.currentVolume_ml;
      if (moved > 0) labSound.playDrop();
      return moved;
    });
    const receipts = useInstrumentStore.getState().burettePresentations;
    const drops = dropsRef.current, ripples = ripplesRef.current;
    if (!drops || !ripples) return;
    if (!receipts.length && !drops.visible && !ripples.visible) return;
    let dropCount = 0, rippleCount = 0;
    for (const receipt of receipts) {
      const view = burettePresentationView(receipt);
      color.set(receipt.color);
      if (view.visible) {
        dummy.position.fromArray(view.position); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(view.radius); dummy.updateMatrix();
        drops.setMatrixAt(dropCount, dummy.matrix); drops.setColorAt(dropCount++, color);
      } else if (view.impactProgress < 1) {
        dummy.position.fromArray(receipt.surface); dummy.position.y += 0.002;
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        const scale = view.radius * (1 + view.impactProgress * 2);
        dummy.scale.setScalar(scale); dummy.updateMatrix();
        ripples.setMatrixAt(rippleCount, dummy.matrix); ripples.setColorAt(rippleCount++, color);
      }
    }
    drops.count = dropCount; drops.visible = dropCount > 0; drops.instanceMatrix.needsUpdate = true;
    ripples.count = rippleCount; ripples.visible = rippleCount > 0; ripples.instanceMatrix.needsUpdate = true;
    if (drops.instanceColor) drops.instanceColor.needsUpdate = true;
    if (ripples.instanceColor) ripples.instanceColor.needsUpdate = true;
    drops.userData.receipts = receipts.filter(receipt => burettePresentationView(receipt).visible)
      .map(receipt => ({ id: receipt.id, targetId: receipt.targetId, volume_ml: receipt.volume_ml,
        color: receipt.color, outlet: receipt.outlet, surface: receipt.surface, elapsed_s: receipt.elapsed_s }));
  }, -1);

  const handleStopcockClick = (e: any) => {
    e.stopPropagation();
    if (dock.moveMode) return;
    labSound.playTap();
    toggleStopcock();
  };

  return (
    <group name="tool-burette" position={standPos} onPointerDown={dock.onPointerDown}>
      {/* Heavy Cast Iron Retort Base */}
      <mesh name="burette-stand-base" position={[0, support.baseCenterY, BURETTE_POST_Z]} receiveShadow castShadow>
        <boxGeometry args={BURETTE_BASE_SIZE} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Heavy Steel Vertical Retort Rod */}
      <mesh name="burette-stand-post" position={[0, support.postCenterY, BURETTE_POST_Z]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, support.postHeight, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Retort Rod Top Cap */}
      <mesh position={[0, support.capCenterY, BURETTE_POST_Z]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Cast Double Burette Clamp */}
      <group position={[0, 2.2, BURETTE_POST_Z / 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.09, -BURETTE_POST_Z]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.6} />
        </mesh>
        {/* Clamp Adjusting Screws */}
        <mesh position={[0, 0.12, -0.85]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.12, 0.85]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
      </group>

      {/* Lower Stabilizing Clamp */}
      <group position={[0, 1.1, BURETTE_POST_Z / 2]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.14, 0.07, -BURETTE_POST_Z]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.6} />
        </mesh>
      </group>

      {/* Burette Glass Column Body (3.2m scaled) */}
      <mesh material={activeGlassMaterial} position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 3.2, 24, 1, true]} />
      </mesh>

      {/* Burette Graduations Ring Texture / Rings along barrel */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, 0.7 + i * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.086, 0.089, 16]} />
          <meshBasicMaterial color="#ffffff" opacity={0.65} transparent />
        </mesh>
      ))}

      {/* Titrant Liquid Inside Burette */}
      {fillRatio > 0.005 && (
        <mesh name="burette-liquid-column" position={[0, 0.4 + (fillRatio * 3.0) / 2, 0]}>
          <cylinderGeometry args={[0.076, 0.076, fillRatio * 3.0, 16]} />
          <meshStandardMaterial 
            color={findChemical(burette.reagentFormula).color}
            transparent 
            opacity={0.8} 
            roughness={0.12} 
          />
        </mesh>
      )}

      {/* Titrant Curved Meniscus */}
      {fillRatio > 0.005 && (
        <mesh position={[0, 0.4 + fillRatio * 3.0, 0]}>
          <cylinderGeometry args={[0.076, 0.076, 0.02, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.1} />
        </mesh>
      )}

      {/* Precision PTFE / Glass Stopcock Valve */}
      <group
        name="burette-stopcock"
        position={[0, 0.35, 0]}
        onPointerDown={event => { if (dock.moveMode) dock.onPointerDown(event); else handleStopcockClick(event); }}
        onClick={event => event.stopPropagation()}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsValveHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setIsValveHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Stopcock Barrel Outer Collar */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.28, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Rotatable Stopcock Handle (Rotates 90 deg when open) */}
        <group rotation={[burette.isDispensing ? Math.PI / 2 : 0, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.36, 12]} />
            <meshStandardMaterial
              color={burette.isDispensing ? '#22c55e' : '#ef4444'}
              roughness={0.3}
            />
          </mesh>
          {/* Valve Wing Grip */}
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.04, 0.1, 0.16]} />
            <meshStandardMaterial
              color={isValveHovered ? '#3b82f6' : (burette.isDispensing ? '#16a34a' : '#dc2626')}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Burette Glass Capillary Delivery Tip */}
      <mesh name="burette-delivery-tip" material={activeGlassMaterial} position={[0, BURETTE_TIP_LOCAL_Y + 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.015, 0.4, 16]} />
      </mesh>

      {createPortal(<group name="burette-delivery-effects">
        <instancedMesh ref={dropsRef} name="burette-delivery-drops" args={[undefined, undefined, MAX_BURETTE_PRESENTATIONS]} frustumCulled={false} visible={false}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshPhysicalMaterial transparent opacity={0.85} transmission={0.4} roughness={0.08} ior={1.38} depthWrite={false} />
        </instancedMesh>
        <instancedMesh ref={ripplesRef} name="burette-delivery-ripples" args={[undefined, undefined, MAX_BURETTE_PRESENTATIONS]} frustumCulled={false} visible={false}>
          <ringGeometry args={[0.75, 1, 20]} />
          <meshBasicMaterial transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
        </instancedMesh>
      </group>, scene)}
    </group>
  );
});
