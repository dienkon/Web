import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { labSound } from '../../../utils/audio';
import { useToolDock, useToolDockStore } from '../../../handling/toolDock';
import { instrumentHome } from '../../../handling/instrumentCatalog';
import { setRodContact, setRodInput, stirringTarget, vesselAgitation } from '../../../science/stirring';
import { stirringRodPose, STIRRING_ROD_LENGTH, STIRRING_ROD_RADIUS } from '../../../science/stirringRodPose';
import { SimulationEngine } from '../../../simulation/core/SimulationEngine';
import { vesselBodyTransform } from '../../../science/vesselScale';
import { FRAME_ORDER } from '../../../simulation/core/frameOrder';
import { simulationFrameDt } from '../../../core/clock';
import { PourController } from '../../../pour/controller/PourController';

const rodGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#d9edf1', roughness: 0.1, transmission: 0, thickness: 0.25,
  ior: 1.5, transparent: true, opacity: 0.62, clearcoat: 1,
});

export const InteractiveStirringRod = React.memo(function InteractiveStirringRod({
  position: initialPosition = instrumentHome('stirring_rod'),
}: { position?: [number, number, number] }) {
  const dock = useToolDock('stirring_rod', initialPosition);
  const { gl } = useThree();
  const position = dock.position;
  const animationTarget = useRef(new THREE.Vector3());
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const targetId = useAppStore(stirringTarget);
  const pulse = useAppStore(state => !!state.stirringVesselId);
  const groupRef = useRef<THREE.Group>(null);
  const isActive = (activeTool === 'stirring_rod' || pulse) && !dock.moveMode;
  const stirSpeedRef = useRef(0);
  const phase = useRef(0);
  const motion = useRef({ id: null as string | null, stage: 'lift' as 'lift' | 'travel' | 'lower' | 'stir',
    hoverY: 0, rimY: 0, touched: false });

  useEffect(() => {
    if (pulse) useToolDockStore.setState(state => ({ deployed: { ...state.deployed, stirring_rod: true } }));
  }, [pulse]);

  useEffect(() => {
    stirSpeedRef.current = 0;
    if (!isActive || !targetId) return;
    setRodContact(targetId, false);
    // Sample accumulated canvas motion. movementX from a single high-frequency
    // event under-counted motion; window listeners also stirred while using UI.
    let previous: { x: number; y: number; at: number } | undefined;
    const handlePointerMove = (event: PointerEvent) => {
      if (useAppStore.getState().isSimulationPaused) { previous = undefined; return; }
      const now = performance.now();
      if (!previous || now - previous.at > 250) {
        previous = { x: event.clientX, y: event.clientY, at: now }; return;
      }
      const dt = (now - previous.at) / 1000;
      if (dt < 0.016) return;
      const speed = Math.hypot(event.clientX - previous.x, event.clientY - previous.y) / dt / 700;
      stirSpeedRef.current = THREE.MathUtils.lerp(stirSpeedRef.current, Math.min(1, speed), 0.3);
      setRodInput(targetId, stirSpeedRef.current);
      previous = { x: event.clientX, y: event.clientY, at: now };
    };
    const clear = () => { previous = undefined; stirSpeedRef.current = 0; setRodInput(targetId); };
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('pointerleave', clear);
    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('pointerleave', clear);
      clear(); setRodContact(targetId);
    };
  }, [isActive, targetId, gl]);

  useFrame((_state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const app = useAppStore.getState();
    if (app.isSimulationPaused) return;
    const dt = Math.min(rawDelta, 0.05), nextId = stirringTarget(app);
    const vessel = isActive && nextId ? app.vessels[nextId] : undefined;
    const pose = vessel && PourController.getSession()?.sourceId !== vessel.id
      ? stirringRodPose(vessel, phase.current) : null;
    const current = motion.current;
    const id = pose && vessel ? vessel.id : null;
    if (current.id !== id) {
      if (current.id) { setRodContact(current.id); setRodInput(current.id); }
      current.hoverY = Math.max(group.position.y, current.rimY + 0.12, (pose?.rimY ?? position[1]) + 0.12);
      current.id = id; current.stage = 'lift'; current.touched = false;
    }
    if (pose && vessel) {
      current.rimY = pose.rimY;
      current.hoverY = Math.max(current.hoverY, pose.rimY + 0.12);
      // A vertical shaft keeps both the lower tip and the neck intersection
      // inside the vessel. The old centre-based tilt swept through tube walls.
      group.rotation.set(0, 0, 0);
      if (current.stage === 'lift') {
        group.position.y = THREE.MathUtils.damp(group.position.y, current.hoverY, 14, dt);
        if (Math.abs(group.position.y - current.hoverY) < 0.015) current.stage = 'travel';
      } else if (current.stage === 'travel') {
        group.position.lerp(animationTarget.current.set(pose.tip[0], current.hoverY, pose.tip[2]), 1 - Math.exp(-dt * 14));
        if (Math.hypot(group.position.x - pose.tip[0], group.position.z - pose.tip[2]) < 0.015) current.stage = 'lower';
      } else if (current.stage === 'lower') {
        group.position.x = pose.tip[0]; group.position.z = pose.tip[2];
        group.position.y = THREE.MathUtils.damp(group.position.y, pose.tip[1], 14, dt);
        if (Math.abs(group.position.y - pose.tip[1]) < 0.015) current.stage = 'stir';
      } else {
        group.position.set(...pose.tip);
        const vortex = SimulationEngine.findManager(vessel.id)?.vortex;
        const core = (vortex?.surface?.coreRadius ?? 0) * vesselBodyTransform(vessel).scale;
        // The vortex's central angular speed is not the rod's orbital speed.
        const speed = core > 0 ? (vortex?.angularSpeed_rad_s ?? 0) / (1 + (pose.orbitRadius / core) ** 2)
          : vesselAgitation(vessel, app) * 8 * (vessel.stirringDirection ?? 1);
        phase.current = (phase.current + speed * simulationFrameDt(rawDelta, app)) % (Math.PI * 2);
      }
      setRodContact(vessel.id, current.stage === 'stir');
      if (current.stage === 'stir' && !current.touched) {
        current.touched = true;
        if (vessel.substances[0]) app.touchToolChemical('stirring_rod', vessel.substances[0]);
      }
      if (current.stage === 'stir' && stirSpeedRef.current > 0.4 && Math.random() < dt * 1.5) labSound.playStir();
    } else {
      // Withdraw vertically before returning the tool horizontally to the rack.
      if (current.stage === 'lift' && group.position.y < current.hoverY - 0.015) {
        group.position.y = THREE.MathUtils.damp(group.position.y, current.hoverY, 14, dt);
      } else {
        current.stage = 'travel';
        group.position.lerp(animationTarget.current.set(position[0], position[1], position[2] + STIRRING_ROD_LENGTH / 2), 1 - Math.exp(-dt * 8));
        group.rotation.set(-Math.PI / 2, 0, 0);
      }
      if (vessel) setRodContact(vessel.id, false);
    }
    stirSpeedRef.current = Math.max(0, stirSpeedRef.current - dt * 0.6);
  }, FRAME_ORDER.effectsFrame + 0.1);

  if (!dock.visible && !pulse) return null;
  return (
    <group ref={groupRef} name="tool-stirring_rod" visible={dock.visible || pulse}
      position={[position[0], position[1], position[2] + STIRRING_ROD_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={dock.onPointerDown}
      onClick={event => {
        event.stopPropagation();
        if (dock.moveMode) return;
        if (isActive) useAppStore.getState().setStirringVesselId(null);
        setActiveTool(isActive ? 'none' : 'stirring_rod');
      }}
      onPointerOver={() => { document.body.style.cursor = dock.moveMode ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
      <mesh material={rodGlassMaterial} position={[0, STIRRING_ROD_LENGTH / 2, 0]} castShadow>
        <cylinderGeometry args={[STIRRING_ROD_RADIUS, STIRRING_ROD_RADIUS, STIRRING_ROD_LENGTH, 12]} />
      </mesh>
      <mesh material={rodGlassMaterial} position={[0, STIRRING_ROD_LENGTH, 0]}>
        <sphereGeometry args={[STIRRING_ROD_RADIUS, 10, 8]} />
      </mesh>
      <mesh material={rodGlassMaterial}>
        <sphereGeometry args={[STIRRING_ROD_RADIUS, 10, 8]} />
      </mesh>
    </group>
  );
});
