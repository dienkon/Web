import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';

export const FPSHands: React.FC = () => {
  const { camera } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const extinguisherTriggerRef = useRef<THREE.Mesh>(null);

  const view = useStore((s) => s.view);
  const player = useStore((s) => s.player);
  const character = useStore((s) => s.character);
  const runState = useStore((s) => s.runState);
  const settings = useStore((s) => s.settings);

  // Dynamic PPE Materials
  const hasLabCoat = player.equipment.hasLabCoat;
  const hasGloves = player.equipment.hasGloves;
  const armColor = hasLabCoat ? '#FFFFFF' : character.shirtColor || '#0EA5B7';
  const handColor = hasGloves ? '#0284C7' : character.skinTone || '#F7D3BA';

  // Input states for weapon / item action
  const isLeftDown = useRef(false);
  const isRightDown = useRef(false);
  const recoilZ = useRef(0);
  const aimLerp = useRef(0);

  // Mouse inertia sway tracking
  const prevCamRot = useRef(new THREE.Euler().copy(camera.rotation));
  const swayOffset = useRef(new THREE.Vector2(0, 0));
  const walkBobTimer = useRef(0);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isLeftDown.current = true;
      if (e.button === 2) isRightDown.current = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isLeftDown.current = false;
      if (e.button === 2) isRightDown.current = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (view !== 'game' || runState === 'PAUSED' || !rootRef.current) return;

    // 1. Lock Viewmodel position & rotation to Camera
    rootRef.current.position.copy(camera.position);
    rootRef.current.quaternion.copy(camera.quaternion);

    // 2. Mouse Look Sway (Inertial lag behind camera turns)
    const dPitch = camera.rotation.x - prevCamRot.current.x;
    const dYaw = camera.rotation.y - prevCamRot.current.y;
    prevCamRot.current.copy(camera.rotation);

    const targetSwayX = THREE.MathUtils.clamp(-dYaw * 0.12, -0.04, 0.04);
    const targetSwayY = THREE.MathUtils.clamp(dPitch * 0.12, -0.04, 0.04);

    swayOffset.current.x = THREE.MathUtils.lerp(swayOffset.current.x, targetSwayX, delta * 10);
    swayOffset.current.y = THREE.MathUtils.lerp(swayOffset.current.y, targetSwayY, delta * 10);

    // 3. Movement Bobbing (harmonic walking figure-8)
    let bobX = 0;
    let bobY = 0;
    if (playerCoords.isMoving && !settings.reduceMotion) {
      walkBobTimer.current += delta * 10;
      bobX = Math.sin(walkBobTimer.current) * 0.012;
      bobY = Math.abs(Math.cos(walkBobTimer.current)) * 0.01 - 0.005;
    } else {
      walkBobTimer.current = 0;
      // Idle breathing sway
      const idleTime = performance.now() * 0.0018;
      bobX = Math.sin(idleTime) * 0.002;
      bobY = Math.cos(idleTime * 2) * 0.002;
    }

    // 4. Action Recoil & Aim lerp
    if (isLeftDown.current) {
      recoilZ.current = THREE.MathUtils.lerp(recoilZ.current, 0.035, delta * 25);
    } else {
      recoilZ.current = THREE.MathUtils.lerp(recoilZ.current, 0, delta * 15);
    }

    if (isRightDown.current) {
      aimLerp.current = THREE.MathUtils.lerp(aimLerp.current, 1, delta * 12);
    } else {
      aimLerp.current = THREE.MathUtils.lerp(aimLerp.current, 0, delta * 12);
    }

    // Extinguisher trigger handle animation
    if (extinguisherTriggerRef.current) {
      const triggerAngle = isLeftDown.current ? -0.22 : 0;
      extinguisherTriggerRef.current.rotation.x = THREE.MathUtils.lerp(
        extinguisherTriggerRef.current.rotation.x,
        triggerAngle,
        delta * 20
      );
    }

    // Apply combined transform to arms container
    const posX = swayOffset.current.x + bobX;
    const posY = -0.28 + swayOffset.current.y + bobY + (aimLerp.current * 0.04);
    const posZ = -0.46 - recoilZ.current + (aimLerp.current * 0.05);

    // Gentle arm sway rotation
    if (rightArmRef.current) {
      rightArmRef.current.position.set(0.18 + posX * 0.5, posY, posZ);
      rightArmRef.current.rotation.set(
        -0.25 + (isLeftDown.current ? 0.08 : 0) - (aimLerp.current * 0.1),
        0.15 - swayOffset.current.x * 2,
        -0.08
      );
    }

    if (leftArmRef.current) {
      leftArmRef.current.position.set(-0.2 + posX * 0.5, posY, posZ);
      leftArmRef.current.rotation.set(
        -0.28 + (aimLerp.current * 0.15),
        -0.18 + swayOffset.current.x * 2,
        0.08
      );
    }
  });

  if (view !== 'game') return null;

  return (
    <group ref={rootRef} renderOrder={999}>
      {/* ================= 1. RIGHT ARM (PRIMARY ACTION ARM) ================= */}
      <group ref={rightArmRef}>
        {/* Forearm Sleeve */}
        <mesh position={[0.06, -0.16, 0.08]} rotation={[-0.2, 0.1, -0.12]} castShadow={false}>
          <cylinderGeometry args={[0.042, 0.05, 0.32, 20]} />
          <meshStandardMaterial
            color={armColor}
            roughness={hasLabCoat ? 0.45 : 0.65}
            metalness={0.05}
          />
        </mesh>

        {/* Wrist Cuff Rim */}
        <mesh position={[0.04, -0.01, 0.19]} rotation={[-0.2, 0.1, -0.12]}>
          <cylinderGeometry args={[0.046, 0.046, 0.032, 20]} />
          <meshStandardMaterial
            color={hasLabCoat ? '#F1F5F9' : armColor}
            roughness={0.4}
          />
        </mesh>

        {/* Right Hand (Gloved Nitrile or Skin) */}
        <group position={[0.02, 0.04, 0.22]}>
          {/* Palm */}
          <mesh castShadow={false}>
            <boxGeometry args={[0.068, 0.052, 0.095]} />
            <meshStandardMaterial
              color={handColor}
              roughness={hasGloves ? 0.25 : 0.6}
              metalness={hasGloves ? 0.1 : 0.0}
            />
          </mesh>

          {/* Thumb */}
          <mesh position={[-0.038, 0.01, -0.01]} rotation={[0.2, 0.3, 0.4]}>
            <capsuleGeometry args={[0.014, 0.038, 8, 8]} />
            <meshStandardMaterial
              color={handColor}
              roughness={hasGloves ? 0.25 : 0.6}
            />
          </mesh>

          {/* Fingers Gripping */}
          {[0.015, -0.005, -0.025].map((fz, idx) => (
            <mesh key={idx} position={[0.036, -0.01, fz]} rotation={[0, 0, -0.3]}>
              <capsuleGeometry args={[0.012, 0.042, 8, 8]} />
              <meshStandardMaterial
                color={handColor}
                roughness={hasGloves ? 0.25 : 0.6}
              />
            </mesh>
          ))}

          {/* ---------------- ITEM 1: FIRE EXTINGUISHER ---------------- */}
          {player.inventory.hasFireExtinguisher && (
            <group position={[-0.04, -0.08, 0.12]} rotation={[0.42, -0.1, 0.05]}>
              {/* Cylinder Tank */}
              <mesh castShadow={false}>
                <cylinderGeometry args={[0.062, 0.062, 0.38, 24]} />
                <meshStandardMaterial
                  color="#DC2626"
                  roughness={0.2}
                  metalness={0.4}
                />
              </mesh>

              {/* Tank Base Ring */}
              <mesh position={[0, -0.19, 0]}>
                <cylinderGeometry args={[0.064, 0.064, 0.02, 24]} />
                <meshStandardMaterial color="#0F172A" roughness={0.6} />
              </mesh>

              {/* Inspection Label Decal */}
              <mesh position={[0, -0.02, 0.063]}>
                <planeGeometry args={[0.075, 0.14]} />
                <meshBasicMaterial color="#FEF08A" />
              </mesh>

              {/* Brass Valve Head */}
              <mesh position={[0, 0.21, 0]}>
                <cylinderGeometry args={[0.024, 0.035, 0.045, 16]} />
                <meshStandardMaterial color="#EAB308" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Pressure Gauge */}
              <group position={[0.028, 0.22, 0.02]} rotation={[0, 0.8, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.016, 0.016, 0.008, 16]} />
                  <meshStandardMaterial color="#E2E8F0" metalness={0.7} roughness={0.3} />
                </mesh>
                {/* Gauge Face (Green zone) */}
                <mesh position={[0, 0, 0.005]} rotation={[0, 0, 0]}>
                  <circleGeometry args={[0.012, 16]} />
                  <meshBasicMaterial color="#22C55E" />
                </mesh>
              </group>

              {/* Carrying Handle */}
              <mesh position={[-0.025, 0.24, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.07, 0.014, 0.02]} />
                <meshStandardMaterial color="#0F172A" roughness={0.5} />
              </mesh>

              {/* Squeeze Lever (Animated on Left Click) */}
              <mesh
                ref={extinguisherTriggerRef}
                position={[-0.025, 0.265, 0]}
                rotation={[0, 0, -0.1]}
              >
                <boxGeometry args={[0.075, 0.012, 0.022]} />
                <meshStandardMaterial color="#DC2626" roughness={0.4} />
              </mesh>

              {/* Safety Pull Pin Ring */}
              <mesh position={[0.018, 0.25, 0.015]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.014, 0.003, 8, 16]} />
                <meshStandardMaterial color="#FBBF24" metalness={0.9} roughness={0.1} />
              </mesh>

              {/* High-Pressure Discharge Hose & Horn Nozzle */}
              <group position={[0.035, 0.2, 0]}>
                {/* Hose */}
                <mesh position={[0.02, 0.02, 0.08]} rotation={[0.6, 0.2, 0]}>
                  <cylinderGeometry args={[0.009, 0.009, 0.18, 12]} />
                  <meshStandardMaterial color="#0F172A" roughness={0.7} />
                </mesh>
                {/* Discharge Horn Funnel */}
                <mesh position={[0.04, 0.08, 0.2]} rotation={[Math.PI / 2 + 0.3, 0, 0]}>
                  <coneGeometry args={[0.028, 0.1, 16]} />
                  <meshStandardMaterial color="#1E293B" roughness={0.4} />
                </mesh>
              </group>
            </group>
          )}

          {/* ---------------- ITEM 2: SPILL KIT SWEEPER & SCOOP ---------------- */}
          {player.inventory.hasSweeper && !player.inventory.hasFireExtinguisher && (
            <group position={[0, -0.06, 0.14]} rotation={[0.3, 0.1, 0]}>
              {/* Broom Pole */}
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.36, 12]} />
                <meshStandardMaterial color="#EAB308" roughness={0.4} />
              </mesh>
              {/* Sweeper Head */}
              <mesh position={[0, -0.14, 0.04]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[0.16, 0.04, 0.06]} />
                <meshStandardMaterial color="#CA8A04" roughness={0.6} />
              </mesh>
              {/* Bristles */}
              <mesh position={[0, -0.17, 0.05]} rotation={[0.4, 0, 0]}>
                <boxGeometry args={[0.15, 0.03, 0.04]} />
                <meshStandardMaterial color="#1E293B" roughness={0.9} />
              </mesh>
            </group>
          )}

          {/* ---------------- ITEM 3: HAZARD WASTE CONTAINER ---------------- */}
          {player.inventory.isHoldingTrash && !player.inventory.hasFireExtinguisher && (
            <group position={[0, 0.02, 0.15]} rotation={[0.2, 0, 0]}>
              <mesh castShadow={false}>
                <boxGeometry args={[0.12, 0.14, 0.12]} />
                <meshStandardMaterial color="#F59E0B" roughness={0.4} />
              </mesh>
              {/* Biohazard Symbol Label */}
              <mesh position={[0, 0, 0.062]}>
                <planeGeometry args={[0.08, 0.08]} />
                <meshBasicMaterial color="#78350F" />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* ================= 2. LEFT ARM (SUPPORT / STEADYING ARM) ================= */}
      <group ref={leftArmRef}>
        {/* Forearm Sleeve */}
        <mesh position={[-0.06, -0.16, 0.08]} rotation={[-0.2, -0.1, 0.12]} castShadow={false}>
          <cylinderGeometry args={[0.042, 0.05, 0.32, 20]} />
          <meshStandardMaterial
            color={armColor}
            roughness={hasLabCoat ? 0.45 : 0.65}
            metalness={0.05}
          />
        </mesh>

        {/* Wrist Cuff Rim */}
        <mesh position={[-0.04, -0.01, 0.19]} rotation={[-0.2, -0.1, 0.12]}>
          <cylinderGeometry args={[0.046, 0.046, 0.032, 20]} />
          <meshStandardMaterial
            color={hasLabCoat ? '#F1F5F9' : armColor}
            roughness={0.4}
          />
        </mesh>

        {/* Left Hand (Gloved Nitrile or Skin) */}
        <group position={[-0.02, 0.04, 0.22]}>
          {/* Palm */}
          <mesh castShadow={false}>
            <boxGeometry args={[0.068, 0.052, 0.095]} />
            <meshStandardMaterial
              color={handColor}
              roughness={hasGloves ? 0.25 : 0.6}
              metalness={hasGloves ? 0.1 : 0.0}
            />
          </mesh>

          {/* Thumb */}
          <mesh position={[0.038, 0.01, -0.01]} rotation={[0.2, -0.3, -0.4]}>
            <capsuleGeometry args={[0.014, 0.038, 8, 8]} />
            <meshStandardMaterial
              color={handColor}
              roughness={hasGloves ? 0.25 : 0.6}
            />
          </mesh>

          {/* Fingers */}
          {[-0.015, 0.005, 0.025].map((fz, idx) => (
            <mesh key={idx} position={[-0.036, -0.01, fz]} rotation={[0, 0, 0.3]}>
              <capsuleGeometry args={[0.012, 0.042, 8, 8]} />
              <meshStandardMaterial
                color={handColor}
                roughness={hasGloves ? 0.25 : 0.6}
              />
            </mesh>
          ))}

          {/* Steadying Pose support for Extinguisher (Left hand holding base/nozzle) */}
          {player.inventory.hasFireExtinguisher && (
            <group position={[0.08, -0.04, 0.16]} rotation={[0, 0.3, -0.2]}>
              {/* Steadying grip on hose */}
              <mesh>
                <capsuleGeometry args={[0.012, 0.06, 8, 8]} />
                <meshStandardMaterial color={handColor} roughness={hasGloves ? 0.25 : 0.6} />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  );
};
