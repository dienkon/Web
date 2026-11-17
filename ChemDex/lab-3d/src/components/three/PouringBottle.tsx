import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical, getSolidMorphology, SolidMorphology } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { useQualityStore } from '../../vfx/quality';
import { getGlassMaterials, createVesselLatheGeometry } from '../../vfx/materials/glass';
import { vesselWorldLiquidSurfaceY } from '../../science/vesselGeometry';
import { dropSchedule, landedScheduledDropFraction, SCENE_GRAVITY, STOCK_RELEASE_START_S, STOCK_RELEASE_END_S } from '../../handling/doseTiming';
import { verticalDropFlight, dropFlightPosition, STOCK_DROPPER_TIP_LOCAL_Y, type VerticalDropFlight } from '../../handling/dropFlight';
import { liquidDosePlan, liquidDropAmount, volumeDropRadius_scene } from '../../handling/liquidDosePlan';
import { createStockSolidGeometry, stockSolidChunkCount } from './stockSolidGeometry';
import { stockSolidMaterial } from '../../science/stockAppearance';
import { liquidOpacity } from '../../science/liquidOptics';
import { getWorldVesselProfile } from '../../pour/physics/profiles';
import { vesselBodyTransform } from '../../science/vesselScale';
import { VesselBodyScale } from './VesselBodyScale';
import type { StockContactBirth } from '../../physical/stockTypes';
import { scenePointToSI, METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';
import { planSolidStockDose, solidStockFlightPosition, type SolidStockDose, type SolidStockFlight } from '../../handling/solidStockDose';
import { stockLiquidTarget, stockBottleDosePose, stockTargetLiquidPacket, stockTargetArrivedFraction,
  STOCK_BOTTLE_CLEARANCE, STOCK_BOTTLE_OUTLET_LOCAL_Y, type StockLiquidTarget } from '../../handling/stockDoseTarget';

// Reagent bottle glass material: highly transparent, specular clearcoat, non-occluding
const reagentBottleGlass = new THREE.MeshPhysicalMaterial({
  transparent: true,
  opacity: 0.28,
  roughness: 0.08,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  depthWrite: false,
});

const _scratchMat4 = new THREE.Matrix4();
const _scratchPos = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchScale = new THREE.Vector3();
const _scratchEuler = new THREE.Euler();

/**
 * REAGENT DISPENSING ANIMATION (Chemical Bottle, Indicator Dropper, or Solid Spatula)
 */
export const AddingAnimation = React.memo(function AddingAnimation({ 
  doseId,
  chemical, 
  targetId, 
  amount = 20,
  onComplete 
}: { 
  doseId: number;
  chemical: string; 
  targetId: string; 
  amount?: number;
  onComplete: () => void; 
}) {
  const chemData = getChemical(chemical);
  const color = chemData.color || '#38bdf8';
  const type = chemData.type;
  const isDropper = chemData.type === 'liquid' && liquidDosePlan(amount).mode === 'dropper';
  const morphology: SolidMorphology = getSolidMorphology(chemical);

  const groupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const dropRef = useRef<THREE.Mesh>(null);
  const solidInstancedRef = useRef<THREE.InstancedMesh>(null);
  const elapsedTime = useRef(0);
  const soundPlayedRef = useRef(false);
  const lastDropIndexRef = useRef(-1);
  const lastContactFraction = useRef(0);
  const deliveryRef = useRef<Promise<void>>(Promise.resolve());
  const completingRef = useRef(false);
  const stockStreamGeometry = useMemo(() => new THREE.CylinderGeometry(0.03, 0.03, 1, 12, 24, true), []);
  useEffect(() => () => stockStreamGeometry.dispose(), [stockStreamGeometry]);

  // Target vessel properties
  const targetVessel = useAppStore(state => state.vessels[targetId]);
  const targetX = targetVessel ? targetVessel.position[0] : 0;
  const targetY = targetVessel ? targetVessel.position[1] : -0.135;
  const targetZ = targetVessel ? targetVessel.position[2] : 0;

  const targetType = targetVessel?.type || 'beaker';
  const targetProfile = getWorldVesselProfile(targetType, targetVessel?.capacity_ml);
  const mouthRadius = targetProfile.mouthR;
  const dropFlightRef = useRef<VerticalDropFlight | null>(null);
  const liquidTargetRef = useRef<StockLiquidTarget | null>(null);
  const payloadRef = useRef<THREE.Group>(null);
  const payloadMeshRef = useRef<THREE.InstancedMesh>(null);
  const solidGeometry = useMemo(() => type === 'solid' ? createStockSolidGeometry(morphology, chemical) : null,
    [type, morphology, chemical]);
  useEffect(() => () => solidGeometry?.dispose(), [solidGeometry]);
  const solidMaterial = stockSolidMaterial(chemData, morphology);

  const solidChunkCount = stockSolidChunkCount(morphology);
  const solidDose = useRef<SolidStockDose | null>(null);
  const solidFlights = useRef(new Map<number, SolidStockFlight>());
  const solidArrivals = useRef(new Set<number>());

  useFrame((state, delta) => {
    const live = useAppStore.getState();
    if (completingRef.current) return;
    const receiver = live.vessels[targetId];
    if (!receiver || receiver.isShattered || receiver.isSealed) { onComplete(); return; }
    if (live.isSimulationPaused) return;
    elapsedTime.current += simulationFrameDt(delta, live);
    const elapsed = elapsedTime.current;
    const time = elapsed;
    const deliver = (fraction: number, contacts?: StockContactBirth[]) => {
      if (fraction <= lastContactFraction.current) return;
      lastContactFraction.current = fraction;
      deliveryRef.current = live.advancePourContact(doseId, fraction, contacts);
    };
    // A cloud/local resolver can finish after the last visual contact. Retain
    // the dose until its serialized writes have drained; a no-op contact must
    // not replace that pending promise with an already-resolved one.
    const complete = () => {
      if (lastContactFraction.current < 1) return;
      completingRef.current = true;
      void deliveryRef.current.then(onComplete);
    };

    // Each finite grain follows the same captured flight in the animation
    // and its contact receipt. The mechanical solver owns it after contact.
    if (type === 'solid') {
      if (!groupRef.current) return;
      if (!solidDose.current) solidDose.current = planSolidStockDose(receiver, chemical, amount);
      const plan = solidDose.current;
      if (!plan) { completingRef.current = true; onComplete(); return; }
      const releaseCount = plan.flights.filter(flight => elapsed >= flight.releaseAt).length;
      if (solidFlights.current.size < releaseCount) {
        // Capture the current receiving surface at release; later inventory
        // changes cannot move a grain that is already airborne.
        const current = planSolidStockDose(receiver, chemical, amount);
        if (!current) { completingRef.current = true; onComplete(); return; }
        for (let i = 0; i < releaseCount; i++) if (!solidFlights.current.has(i))
          solidFlights.current.set(i, current.flights[i]);
      }
      const arrived = [...solidFlights.current.entries()].filter(([, flight]) => elapsed >= flight.releaseAt + flight.flightTime);
      const contacts = arrived.filter(([index]) => !solidArrivals.current.has(index)).map(([index, flight]): StockContactBirth => {
        solidArrivals.current.add(index);
        return ({
        mass_g: flight.mass_g, position_m: scenePointToSI(flight.contact), rotation: [...flight.rotation],
        velocity_m_s: [0, -SCENE_GRAVITY * flight.flightTime * METERS_PER_SCENE_UNIT, 0],
        angularVelocity_rad_s: [0, 0, 0],
        });
      });
      deliver(arrived.length / solidChunkCount, contacts);
      const lastImpact = Math.max(...plan.flights.map((initial, i) => {
        const flight = solidFlights.current.get(i) ?? initial;
        return flight.releaseAt + flight.flightTime;
      }));
      const retractStart = Math.max(1.4, lastImpact + .1);
      const startY = plan.flights[0].start[1];
      if (payloadRef.current) payloadRef.current.visible = releaseCount < solidChunkCount;
      if (payloadMeshRef.current) {
        for (let i = 0; i < solidChunkCount; i++) {
          const release = plan.flights[i].start;
          _scratchPos.set(release[0] - targetX - .2, release[1] - startY + .06, release[2] - targetZ);
          _scratchQuat.fromArray(plan.flights[i].rotation);
          _scratchScale.setScalar(elapsed < plan.flights[i].releaseAt ? plan.scale : 0);
          _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
          payloadMeshRef.current.setMatrixAt(i, _scratchMat4);
        }
        payloadMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (elapsed < .25) {
        const t = THREE.MathUtils.smoothstep(elapsed / .25, 0, 1);
        groupRef.current.position.set(THREE.MathUtils.lerp(targetX + 1.8, targetX + .2, t),
          THREE.MathUtils.lerp(startY + 1.4, startY - .06, t), targetZ);
        groupRef.current.rotation.z = 0;
      } else if (elapsed < retractStart) {
        groupRef.current.position.set(targetX + .2, startY - .06, targetZ);
        groupRef.current.rotation.z = 0;
        if (!soundPlayedRef.current && releaseCount > 0) {
          soundPlayedRef.current = true;
          if (['POWDER', 'FILINGS'].includes(morphology)) labSound.playPowder(); else labSound.playTap();
        }
      } else if (elapsed < retractStart + .3) {
        const t = THREE.MathUtils.smoothstep((elapsed - retractStart) / .3, 0, 1);
        groupRef.current.position.set(THREE.MathUtils.lerp(targetX + .2, targetX + 2, t),
          THREE.MathUtils.lerp(startY - .06, startY + 1.8, t), targetZ);
      } else complete();
      let splash: SolidStockFlight | undefined;
      if (solidInstancedRef.current) {
        let airborne = 0;
        for (let i = 0; i < solidChunkCount; i++) {
          const flight = solidFlights.current.get(i), age = flight ? elapsed - flight.releaseAt : -1;
          const falling = !!flight && age >= 0 && age < flight.flightTime;
          if (flight && flight.contactKind === 'liquid' && age >= flight.flightTime && age < flight.flightTime + .15) splash = flight;
          _scratchPos.fromArray(falling ? solidStockFlightPosition(flight!, age) : [0, -9999, 0]);
          _scratchQuat.fromArray(flight?.rotation ?? [0, 0, 0, 1]);
          _scratchScale.setScalar(falling ? plan.scale : 0);
          _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
          solidInstancedRef.current.setMatrixAt(i, _scratchMat4);
          if (falling) airborne++;
        }
        solidInstancedRef.current.visible = airborne > 0;
        solidInstancedRef.current.instanceMatrix.needsUpdate = true;
      }
      if (rippleRef.current) {
        rippleRef.current.visible = !!splash;
        if (splash) {
          rippleRef.current.position.set(splash.contact[0], splash.liquidSurfaceY! + .005, splash.contact[2]);
          const pulse = mouthRadius * (.15 + (Math.sin(time * 24) * .5 + .5) * .25);
          rippleRef.current.scale.set(pulse, pulse, 1);
          (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = .85;
        }
      }
      return;
    }

    // ============================================================
    // 2. INDICATOR DROPPER / PIPETTE DISPENSING
    // ============================================================
    if (isDropper) {
      if (!groupRef.current) return;

      if (!liquidTargetRef.current) liquidTargetRef.current = stockLiquidTarget(receiver);
      const target = liquidTargetRef.current;
      if (!target) { onComplete(); return; }
      if (!dropFlightRef.current) dropFlightRef.current = verticalDropFlight(target.outlet, target.contact[1]);
      const flight = dropFlightRef.current;
      const schedule = dropSchedule(amount, flight.start[1] - flight.target[1], flight.gravity);
      const landedFraction = landedScheduledDropFraction(elapsed, amount, schedule);
      deliver(landedFraction);
      const exitStart = schedule.lastImpact + 0.25;
      const hoverY = flight.start[1] - STOCK_DROPPER_TIP_LOCAL_Y;
      if (elapsed < 0.6) {
        const t = THREE.MathUtils.smoothstep(elapsed / 0.6, 0, 1);
        groupRef.current.position.set(flight.start[0], THREE.MathUtils.lerp(target.mouth[1] + 3, hoverY, t), flight.start[2]);
        if (dropRef.current) dropRef.current.visible = false;
      } else if (elapsed < exitStart) {
        groupRef.current.position.set(flight.start[0], hoverY, flight.start[2]);
        const index = Math.min(schedule.count - 1, Math.max(0, Math.floor((elapsed - schedule.releaseStart) / schedule.period)));
        const fallTime = elapsed - schedule.releaseStart - index * schedule.period;
        const falling = fallTime >= 0 && fallTime < schedule.flightTime;
        if (index !== lastDropIndexRef.current && falling) {
          lastDropIndexRef.current = index; labSound.playDrop();
        }
        if (dropRef.current) {
          dropRef.current.visible = falling;
          dropRef.current.position.set(...dropFlightPosition(flight, fallTime));
          const stretch = 1 + Math.min(0.7, Math.max(0, fallTime));
          const radius = volumeDropRadius_scene(liquidDropAmount(amount, index));
          dropRef.current.scale.set(radius / Math.sqrt(stretch), radius * stretch, radius / Math.sqrt(stretch));
        }
        if (rippleRef.current) {
          const sinceImpact = fallTime - schedule.flightTime;
          rippleRef.current.visible = target.contactKind === 'liquid' && sinceImpact >= 0 && sinceImpact < 0.25 && (targetVessel?.volume_ml ?? 0) > 0;
          rippleRef.current.position.set(flight.target[0], flight.target[1] + 0.005, flight.target[2]);
          const f = Math.max(0, Math.min(1, sinceImpact / 0.25));
          rippleRef.current.scale.setScalar(0.04 + mouthRadius * f * 0.5);
          (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - f) * 0.5;
        }
      } else if (elapsed < exitStart + 0.6) {
        const t = THREE.MathUtils.smoothstep((elapsed - exitStart) / 0.6, 0, 1);
        groupRef.current.position.set(flight.start[0], THREE.MathUtils.lerp(hoverY, target.mouth[1] + 3.2, t), flight.start[2]);
        if (dropRef.current) dropRef.current.visible = false;
        if (rippleRef.current) rippleRef.current.visible = false;
      } else complete();
      return;
    }

    // ============================================================
    // 3. CHEMICAL REAGENT BOTTLE (Laminar Stream & Surface Ripple)
    // ============================================================
    if (!groupRef.current) return;

    if (!liquidTargetRef.current) liquidTargetRef.current = stockLiquidTarget(receiver, STOCK_BOTTLE_CLEARANCE);
    const target = liquidTargetRef.current;
    if (!target) { onComplete(); return; }
    const fractionAtSurface = stockTargetArrivedFraction(elapsed, target);
    deliver(fractionAtSurface);
    const finishTime = Math.max(2.95, stockTargetLiquidPacket(STOCK_RELEASE_END_S, target).impactTime + 0.1);
    // Render only packets that have actually left the lip and have not landed.
    // The front advances toward the liquid; the final tail falls after righting.
    const youngest = Math.min(elapsed, STOCK_RELEASE_END_S);
    const oldest = STOCK_RELEASE_START_S + fractionAtSurface * (STOCK_RELEASE_END_S - STOCK_RELEASE_START_S);
    const visibleStream = youngest > oldest && elapsed > STOCK_RELEASE_START_S && fractionAtSurface < 1;
    if (streamRef.current) {
      streamRef.current.visible = visibleStream;
      streamRef.current.position.set(0, 0, 0); streamRef.current.rotation.set(0, 0, 0); streamRef.current.scale.setScalar(1);
      if (visibleStream) {
        const vertices = stockStreamGeometry.attributes.position;
        for (let ring = 0; ring <= 24; ring++) {
          const release = youngest + (oldest - youngest) * ring / 24;
          const packet = stockTargetLiquidPacket(release, target);
          const age = Math.max(0, Math.min(packet.flightTime, elapsed - release));
          const [x, , z] = packet.start;
          const y = packet.start[1] + packet.vy * age - 0.5 * SCENE_GRAVITY * age * age;
          const speedRatio = Math.abs(packet.vy - SCENE_GRAVITY * age) / Math.abs(packet.vy);
          const radius = Math.min(target.apertureRadius * 0.2,
            Math.max(0.006, Math.min(0.06, 0.03 * Math.sqrt(amount / 20)) / Math.sqrt(speedRatio)));
          for (let side = 0; side <= 12; side++) {
            const angle = side / 12 * Math.PI * 2;
            vertices.setXYZ(ring * 13 + side, x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
          }
        }
        vertices.needsUpdate = true; stockStreamGeometry.computeVertexNormals();
      }
    }
    if (rippleRef.current) {
      rippleRef.current.visible = target.contactKind === 'liquid' && fractionAtSurface > 0 && fractionAtSurface < 1 && (targetVessel?.volume_ml ?? 0) > 0;
      rippleRef.current.position.set(target.contact[0], target.contact[1] + 0.005, target.contact[2]);
      rippleRef.current.scale.setScalar(mouthRadius * (0.22 + Math.sin(time * 16) * 0.04));
    }

    const pose = stockBottleDosePose(elapsed, target, finishTime);
    groupRef.current.position.set(...pose.position); groupRef.current.rotation.z = pose.angle;
    if (visibleStream && !soundPlayedRef.current) { soundPlayedRef.current = true; labSound.playPour(1.4); }
    if (elapsed >= finishTime) complete();
  });

  // Solid spatula mode
  if (type === 'solid') {
    return (
      <group name="solid-dose-animation">
        <group ref={groupRef}>
          {/* Laboratory Spatula Handle & Blade */}
          <mesh position={[0.4, 0.2, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
            <boxGeometry args={[1.5, 0.035, 0.16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.18} />
          </mesh>
          {/* Blade scoop with solid reagent resting on it matching authentic morphology */}
          <group ref={payloadRef}>
          <instancedMesh name="solid-dose-payload" ref={payloadMeshRef} args={[solidGeometry!, undefined, solidChunkCount]}>
            <meshStandardMaterial color={solidMaterial.color} roughness={solidMaterial.roughness} metalness={solidMaterial.metalness} />
          </instancedMesh>
          </group>
        </group>

        {/* Dynamic Falling Solid Particles (InstancedMesh, matches morphology) */}
        <instancedMesh
          name="solid-dose-airborne"
          ref={solidInstancedRef}
          args={[undefined, undefined, solidChunkCount]}
          renderOrder={5}
          visible={false}
        >
          <primitive object={solidGeometry!} attach="geometry" />
          <meshStandardMaterial color={solidMaterial.color} roughness={solidMaterial.roughness} metalness={solidMaterial.metalness} />
        </instancedMesh>

        {/* Dynamic Concentric Water Surface Ripple on Impact */}
        <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={4}>
          <ringGeometry args={[0.04, 0.25, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // Dropper / Pipette mode
  if (isDropper) {
    return (
      <group name="stock-dropper-dose">
        <group ref={groupRef} name="stock-dropper-tool">
          {/* Rubber Bulb */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.45} />
          </mesh>
          {/* Glass Pipette Tube */}
          <mesh material={reagentBottleGlass} position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 1.5, 16]} />
          </mesh>
          {/* Tapered Capillary Tip */}
          <mesh name="stock-dropper-outlet" material={reagentBottleGlass} position={[0, STOCK_DROPPER_TIP_LOCAL_Y + 0.125, 0]}>
            <cylinderGeometry args={[0.045, 0.015, 0.25, 16]} />
          </mesh>
          {/* Chemical Indicator inside Pipette Column */}
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.9, 16]} />
            <meshStandardMaterial color={color} transparent opacity={liquidOpacity(color, 0)} roughness={0.12} depthWrite={false} />
          </mesh>
        </group>

        {/* Falling Indicator Drop (World space) */}
        <mesh name="stock-dropper-drop" ref={dropRef} visible={false}>
          <sphereGeometry args={[1, 14, 14]} />
          <meshStandardMaterial color={color} transparent opacity={liquidOpacity(color, 0, true)} roughness={0.1} depthWrite={false} />
        </mesh>

        {/* Concentric Impact Ripple Ring on Liquid Surface */}
        <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.7, 1.0, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  // Liquid reagent bottle mode
  return (
    <group>
      {/* Reagent Bottle Assembly */}
      <group ref={groupRef} name="stock-bottle-tool">
        {/* Glass Bottle Body */}
        <mesh material={reagentBottleGlass} castShadow>
          <cylinderGeometry args={[0.34, 0.38, 1.15, 24]} />
        </mesh>
        {/* Bottle Neck */}
        <mesh material={reagentBottleGlass} position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.12, 0.28, 0.38, 24]} />
        </mesh>
        {/* Spout Rim */}
        <mesh name="stock-bottle-outlet" material={reagentBottleGlass} position={[0, STOCK_BOTTLE_OUTLET_LOCAL_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.11, 0.022, 8, 24]} />
        </mesh>
        {/* Chemical Liquid Inside Reagent Bottle */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.31, 0.35, 0.85, 24]} />
          <meshStandardMaterial color={color} transparent opacity={liquidOpacity(color, 0)} roughness={0.12} depthWrite={false} />
        </mesh>
        {/* Reagent Label */}
        <mesh position={[0, 0, 0.36]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.42, 0.28]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* World-space Laminar Flow Stream (Pinpoint Spout to Recipient Liquid Connection) */}
      <mesh ref={streamRef} geometry={stockStreamGeometry} frustumCulled={false} visible={false} dispose={null}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={liquidOpacity(color, 0, true)}
          roughness={0.08}
          metalness={0.04}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Impact Ripple Ring on Recipient Liquid Surface */}
      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

/**
 * INTER-VESSEL POURING ANIMATION (Pouring from Vessel A directly into Vessel B)
 */
export const VesselPourAnimation = React.memo(function VesselPourAnimation({
  fromId,
  toId,
  onComplete
}: {
  fromId: string;
  toId: string;
  onComplete: () => void;
}) {
  const fromVessel = useAppStore(state => state.vessels[fromId]);
  const toVessel = useAppStore(state => state.vessels[toId]);

  const groupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const liquidMeshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);

  const fromType = fromVessel?.type || 'beaker';
  const toType = toVessel?.type || 'beaker';
  const validFromType = (fromType === 'burette' ? 'cylinder' : fromType) as 'beaker' | 'flask' | 'test_tube' | 'cylinder';
  const latheGeom = useMemo(() => createVesselLatheGeometry(validFromType, 32), [validFromType]);

  const toProfile = getWorldVesselProfile(toType, toVessel?.capacity_ml);
  const fromProfile = getWorldVesselProfile(fromType, fromVessel?.capacity_ml);
  const toMetrics = { offset: toProfile.lipLocal[1], radius: toProfile.mouthR };
  const fromMetrics = { offset: fromProfile.lipLocal[1], radius: fromProfile.mouthR };

  if (!fromVessel || !toVessel) return null;

  const targetX = toVessel.position[0];
  const targetY = toVessel.position[1];
  const targetZ = toVessel.position[2];
  const liquidColor = fromVessel.liquidColor || '#38bdf8';

  const toMouthY = targetY + toMetrics.offset;
  const toMouthRadius = toMetrics.radius;

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const time = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    // Target liquid surface elevation
    const toLiquidSurfaceY = targetY + vesselWorldLiquidSurfaceY(toVessel);

    // Initial position on table
    const startX = fromVessel.position[0];
    const startY = fromVessel.position[1];
    const startZ = fromVessel.position[2];

    // Pour hover coordinates (resting spout lip over recipient mouth rim)
    const pourX = targetX - toMouthRadius * 0.7 - fromMetrics.radius * 0.5;
    const pourY = toMouthY + 0.45;

    if (elapsed < 0.65) {
      // Step 1: Smoothly lift source vessel from workbench to recipient rim
      const t = THREE.MathUtils.smoothstep(elapsed / 0.65, 0, 1);
      groupRef.current.position.set(
        THREE.MathUtils.lerp(startX, pourX, t),
        THREE.MathUtils.lerp(startY, pourY, t),
        THREE.MathUtils.lerp(startZ, targetZ, t)
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(0, -0.15, t);
      if (streamRef.current) streamRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
    } else if (elapsed < 2.3) {
      // Step 2: Pouring Phase (tilt steepness, laminar stream straight down)
      const t = (elapsed - 0.65) / 1.65;
      const pourAngle = THREE.MathUtils.smoothstep(Math.min(1, t * 1.8), 0, 1) * 1.25; // ~72° tilt
      groupRef.current.position.set(pourX, pourY, targetZ);
      groupRef.current.rotation.z = -pourAngle;

      const isStreaming = t > 0.08 && t < 0.94;

      // Lip position in world space
      const lipX = targetX - toMouthRadius * 0.35;
      const lipY = toMouthY + 0.22;

      if (streamRef.current) {
        if (isStreaming) {
          streamRef.current.visible = true;
          const dx = targetX - lipX;
          const dy = toLiquidSurfaceY - lipY;
          const streamLength = Math.hypot(dx, dy);
          const midX = (lipX + targetX) / 2;
          const midY = (lipY + toLiquidSurfaceY) / 2;
          const streamAngle = Math.atan2(dx, -dy);

          const wobble = Math.sin(time * 26) * 0.006;
          streamRef.current.position.set(midX, midY, targetZ);
          streamRef.current.rotation.z = streamAngle;
          streamRef.current.scale.set(1 + wobble, streamLength, 1 + wobble);
        } else {
          streamRef.current.visible = false;
        }
      }

      if (rippleRef.current) {
        if (isStreaming) {
          rippleRef.current.visible = true;
          rippleRef.current.position.set(targetX, toLiquidSurfaceY + 0.005, targetZ);
          const rippleRadius = toMouthRadius * (0.35 + Math.sin(time * 16) * 0.08);
          rippleRef.current.scale.set(rippleRadius, rippleRadius, 1);
        } else {
          rippleRef.current.visible = false;
        }
      }

      // Visually drain liquid from pouring container
      if (liquidMeshRef.current) {
        const drain = Math.max(0.04, (1 - t) * 0.9);
        liquidMeshRef.current.scale.set(drain, drain, drain);
      }
    } else if (elapsed < 2.9) {
      // Step 3: Un-tilt and settle gracefully onto workbench adjacent to recipient
      const t = THREE.MathUtils.smoothstep((elapsed - 2.3) / 0.6, 0, 1);
      const settleX = targetX - toMouthRadius - fromMetrics.radius - 0.5;
      groupRef.current.position.set(
        THREE.MathUtils.lerp(pourX, settleX, t),
        THREE.MathUtils.lerp(pourY, -0.135, t),
        targetZ
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(-1.25, 0, t);
      if (streamRef.current) streamRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
    } else {
      // Step 4: Pouring is complete -> fire reaction & volume transfer
      onComplete();
    }
  });

  return (
    <group>
      {/* Animated Pouring Source Vessel with Authentic Lathe Geometry */}
      <group ref={groupRef} position={fromVessel.position}>
        <VesselBodyScale vessel={fromVessel}>
        {/* Inner and Outer Glassware Shells */}
        <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
        <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

        {/* Draining Liquid inside Source Vessel */}
        <mesh ref={liquidMeshRef} position={[0, -0.3, 0]} renderOrder={3}>
          <cylinderGeometry args={[fromMetrics.radius / vesselBodyTransform(fromVessel).scale * 0.88, fromMetrics.radius / vesselBodyTransform(fromVessel).scale * 0.88, 0.8, 20]} />
          <meshStandardMaterial
            color={liquidColor}
            transparent
            opacity={liquidOpacity(liquidColor, fromVessel.turbidity ?? 0)}
            roughness={0.12}
            depthWrite={false}
          />
        </mesh>
        </VesselBodyScale>
      </group>

      {/* World-space Laminar Liquid Stream (Connecting Lip directly to Recipient Surface) */}
      <mesh ref={streamRef} visible={false}>
        <cylinderGeometry args={[0.048, 0.032, 1.0, 16]} />
        <meshStandardMaterial
          color={liquidColor}
          transparent
          opacity={liquidOpacity(liquidColor, fromVessel.turbidity ?? 0, true)}
          roughness={0.08}
          metalness={0.04}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Impact Ripple Ring on Recipient Surface */}
      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial color={liquidColor} transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});
