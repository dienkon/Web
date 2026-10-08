import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerState } from '../../types';
import { useStore, playerCoords } from '../../store/useStore';

interface PlayerModelProps {
  position?: [number, number, number];
  rotationY?: number;
  isMoving?: boolean;
  player?: PlayerState;
}

export const PlayerModel: React.FC<PlayerModelProps> = ({
  position,
  rotationY,
  isMoving: propIsMoving,
  player: propPlayer,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const storePlayer = useStore((s) => s.player);
  const character = useStore((s) => s.character);
  const player = propPlayer || storePlayer;

  // Limb pivot groups for natural biomechanical rotation
  const leftLegPivot = useRef<THREE.Group>(null);
  const rightLegPivot = useRef<THREE.Group>(null);
  const leftArmPivot = useRef<THREE.Group>(null);
  const rightArmPivot = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (rootGroupRef.current) {
      if (position) {
        rootGroupRef.current.position.set(position[0], position[1], position[2]);
      } else {
        rootGroupRef.current.position.set(
          playerCoords.position[0],
          playerCoords.position[1],
          playerCoords.position[2]
        );
      }
      rootGroupRef.current.rotation.y =
        rotationY !== undefined ? rotationY : playerCoords.rotationY;
    }

    const t = state.clock.getElapsedTime();
    const isMoving = propIsMoving !== undefined ? propIsMoving : playerCoords.isMoving;

    if (isMoving) {
      // Natural walking swing from hip and shoulder joints
      if (leftLegPivot.current) leftLegPivot.current.rotation.x = Math.sin(t * 11) * 0.55;
      if (rightLegPivot.current) rightLegPivot.current.rotation.x = -Math.sin(t * 11) * 0.55;

      if (leftArmPivot.current) leftArmPivot.current.rotation.x = -Math.sin(t * 11) * 0.5;
      if (rightArmPivot.current) rightArmPivot.current.rotation.x = Math.sin(t * 11) * 0.5;

      // Vertical bounce while walking
      if (modelRef.current) {
        modelRef.current.position.y = Math.abs(Math.sin(t * 22)) * 0.04;
      }
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 11) * 0.05;
      }
    } else {
      // Gentle breathing idle animation
      if (leftLegPivot.current) leftLegPivot.current.rotation.x = 0;
      if (rightLegPivot.current) rightLegPivot.current.rotation.x = 0;

      if (leftArmPivot.current) {
        leftArmPivot.current.rotation.x = Math.sin(t * 2) * 0.05;
        leftArmPivot.current.rotation.z = Math.sin(t * 2) * 0.02;
      }
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.sin(t * 2) * 0.05;
        rightArmPivot.current.rotation.z = -Math.sin(t * 2) * 0.02;
      }

      if (modelRef.current) {
        modelRef.current.position.y = Math.sin(t * 2) * 0.012;
      }
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 1.5) * 0.06;
      }
    }

    // Override arm poses if holding equipment
    if (player.inventory.hasSweeper) {
      if (leftArmPivot.current) {
        leftArmPivot.current.rotation.x = -Math.PI / 2.6;
        leftArmPivot.current.rotation.z = Math.PI / 7;
      }
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.PI / 2.8;
        rightArmPivot.current.rotation.z = -Math.PI / 7;
      }
    } else if (player.inventory.isHoldingTrash) {
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.PI / 2.3;
      }
    } else if (player.inventory.hasFireExtinguisher) {
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.PI / 3;
      }
      if (leftArmPivot.current) {
        leftArmPivot.current.rotation.x = -Math.PI / 4;
        leftArmPivot.current.rotation.z = Math.PI / 8;
      }
    }
  });

  const skinColor = character.skinTone || '#f7d3ba';
  const hairColor = character.hairColor || '#2b1d0c';
  const shirtColor = character.shirtColor || '#0ea5b7';
  const pantsColor = '#1e293b';

  return (
    <group ref={rootGroupRef}>
      <group ref={modelRef}>
        {/* Floating/Carried Trash indicator banner */}
        {player.inventory.isHoldingTrash && (
          <group position={[0, 2.05, 0]}>
            <Html center>
              <div className="bg-purple-600/95 backdrop-blur-sm text-white font-black text-[9px] px-2.5 py-1.5 rounded-xl shadow-lg border border-purple-400 whitespace-nowrap animate-bounce select-none flex items-center gap-1.5">
                <span className="text-sm">☣️</span> ĐANG CẦM RÁC HÓA CHẤT
              </div>
            </Html>
          </group>
        )}

        {/* ================= HEAD & NECK ASSEMBLY ================= */}
        <group position={[0, 1.48, 0]} ref={headGroupRef}>
          {/* Head Skull */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.18, 32, 32]} />
            <meshStandardMaterial color={skinColor} roughness={0.4} />
          </mesh>

          {/* Chin / Jaw Contour */}
          <mesh position={[0, -0.06, 0.05]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.12]} />
            <meshStandardMaterial color={skinColor} roughness={0.4} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.18, 0, 0]} castShadow>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
          <mesh position={[0.18, 0, 0]} castShadow>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>

          {/* Face Details: Eyes, Brows, Nose, Smile */}
          <group position={[0, 0, 0.14]}>
            {/* Eye Sockets / Whites */}
            <mesh position={[-0.065, 0.02, 0.03]}>
              <boxGeometry args={[0.038, 0.026, 0.01]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.065, 0.02, 0.03]}>
              <boxGeometry args={[0.038, 0.026, 0.01]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* Dark Pupils with Gloss Highlight */}
            <mesh position={[-0.065, 0.02, 0.038]}>
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} />
            </mesh>
            <mesh position={[-0.06, 0.025, 0.048]}>
              <sphereGeometry args={[0.005, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            <mesh position={[0.065, 0.02, 0.038]}>
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} />
            </mesh>
            <mesh position={[0.07, 0.025, 0.048]}>
              <sphereGeometry args={[0.005, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* Neat Eyebrows */}
            <mesh position={[-0.065, 0.05, 0.035]} rotation={[0, 0, 0.05]}>
              <boxGeometry args={[0.045, 0.008, 0.01]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>
            <mesh position={[0.065, 0.05, 0.035]} rotation={[0, 0, -0.05]}>
              <boxGeometry args={[0.045, 0.008, 0.01]} />
              <meshStandardMaterial color={hairColor} roughness={0.9} />
            </mesh>

            {/* Cute Nose Bridge */}
            <mesh position={[0, -0.01, 0.045]}>
              <coneGeometry args={[0.014, 0.03, 4]} />
              <meshStandardMaterial color={skinColor} roughness={0.4} />
            </mesh>

            {/* Friendly Smile */}
            <mesh position={[0, -0.05, 0.03]} rotation={[0.2, 0, 0]}>
              <torusGeometry args={[0.026, 0.006, 8, 16, Math.PI]} />
              <meshStandardMaterial color="#e11d48" roughness={0.3} />
            </mesh>
          </group>

          {/* ================= HAIR ASSEMBLY ================= */}
          {player.equipment.hairTied ? (
            /* Neat tied hair with safety band */
            <group>
              <mesh position={[0, 0.06, -0.02]} castShadow>
                <sphereGeometry args={[0.19, 32, 32]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
              {/* Combed-back front locks */}
              <mesh position={[0, 0.16, 0.06]} rotation={[-0.3, 0, 0]} castShadow>
                <boxGeometry args={[0.18, 0.06, 0.12]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
              {/* High tied ponytail tuft in back */}
              <group position={[0, 0.1, -0.19]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.055, 16, 16]} />
                  <meshStandardMaterial color={hairColor} roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.1, -0.03]} rotation={[0.4, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.035, 0.015, 0.18, 12]} />
                  <meshStandardMaterial color={hairColor} roughness={0.8} />
                </mesh>
                {/* Red elastic hair tie */}
                <mesh position={[0, 0.02, 0]}>
                  <torusGeometry args={[0.04, 0.012, 8, 20]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.3} />
                </mesh>
              </group>
            </group>
          ) : (
            /* Styled full-volume hair with stylish bangs */
            <group>
              <mesh position={[0, 0.06, -0.02]} castShadow>
                <sphereGeometry args={[0.195, 32, 32]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
              {/* Bangs / Front fringe */}
              <mesh position={[0, 0.14, 0.11]} rotation={[0.2, 0, 0]} castShadow>
                <boxGeometry args={[0.2, 0.09, 0.1]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
              {/* Sideburn locks */}
              <mesh position={[-0.17, 0.02, 0.05]} castShadow>
                <boxGeometry args={[0.03, 0.13, 0.06]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
              <mesh position={[0.17, 0.02, 0.05]} castShadow>
                <boxGeometry args={[0.03, 0.13, 0.06]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
              {/* Top texture strands */}
              <mesh position={[0, 0.21, 0.02]} rotation={[0.1, 0.05, 0]} castShadow>
                <boxGeometry args={[0.15, 0.06, 0.15]} />
                <meshStandardMaterial color={hairColor} roughness={0.8} />
              </mesh>
            </group>
          )}

          {/* ================= GOGGLES (When equipped) ================= */}
          {player.equipment.hasGoggles && (
            <group position={[0, 0.02, 0.14]}>
              {/* Transparent protective cyan lenses */}
              <mesh position={[-0.068, 0, 0.045]} castShadow>
                <boxGeometry args={[0.08, 0.056, 0.02]} />
                <meshPhysicalMaterial
                  color="#38bdf8"
                  opacity={0.6}
                  transparent
                  roughness={0.1}
                  metalness={0.1}
                />
              </mesh>
              <mesh position={[0.068, 0, 0.045]} castShadow>
                <boxGeometry args={[0.08, 0.056, 0.02]} />
                <meshPhysicalMaterial
                  color="#38bdf8"
                  opacity={0.6}
                  transparent
                  roughness={0.1}
                  metalness={0.1}
                />
              </mesh>
              {/* Frame outer rim */}
              <mesh position={[0, 0, 0.038]}>
                <boxGeometry args={[0.23, 0.075, 0.025]} />
                <meshStandardMaterial color="#0284c7" roughness={0.4} />
              </mesh>
              {/* Splash top and side shields */}
              <mesh position={[-0.12, 0, 0.02]} rotation={[0, -Math.PI / 4, 0]}>
                <boxGeometry args={[0.02, 0.07, 0.05]} />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} />
              </mesh>
              <mesh position={[0.12, 0, 0.02]} rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[0.02, 0.07, 0.05]} />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.4} />
              </mesh>
              {/* Head strap */}
              <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.18, 0.012, 8, 32]} />
                <meshStandardMaterial color="#0f172a" roughness={0.9} />
              </mesh>
            </group>
          )}

          {/* ================= MASK / RESPIRATOR (When equipped) ================= */}
          {player.equipment.hasMask && (
            <group position={[0, -0.08, 0.12]}>
              {/* Silicone face seal */}
              <mesh castShadow position={[0, 0, 0.02]}>
                <boxGeometry args={[0.14, 0.11, 0.07]} />
                <meshStandardMaterial color="#334155" roughness={0.7} />
              </mesh>
              {/* Central exhalation valve */}
              <mesh position={[0, -0.02, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.024, 0.024, 0.015, 16]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              {/* Dual chemical gas canisters */}
              <group position={[-0.075, -0.02, 0.035]} rotation={[0, -0.4, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.04, 16]} />
                  <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.001]}>
                  <cylinderGeometry args={[0.034, 0.034, 0.008, 16]} />
                  <meshStandardMaterial color="#ef4444" />
                </mesh>
              </group>
              <group position={[0.075, -0.02, 0.035]} rotation={[0, 0.4, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.032, 0.032, 0.04, 16]} />
                  <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.001]}>
                  <cylinderGeometry args={[0.034, 0.034, 0.008, 16]} />
                  <meshStandardMaterial color="#ef4444" />
                </mesh>
              </group>
            </group>
          )}
        </group>

        {/* ================= CONNECTING NECK ================= */}
        <mesh position={[0, 1.28, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 0.14, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} />
        </mesh>

        {/* ================= TORSO & CHEST ================= */}
        {player.equipment.hasLabCoat ? (
          /* Detailed Lab Coat Torso */
          <group position={[0, 0.9, 0]}>
            {/* Main Coat Body Cylinder */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.18, 0.22, 0.65, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.7} />
            </mesh>

            {/* Collar Lapel Left */}
            <mesh position={[-0.08, 0.24, 0.15]} rotation={[0, 0.2, -0.25]} castShadow>
              <boxGeometry args={[0.045, 0.16, 0.02]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>
            {/* Collar Lapel Right */}
            <mesh position={[0.08, 0.24, 0.15]} rotation={[0, -0.2, 0.25]} castShadow>
              <boxGeometry args={[0.045, 0.16, 0.02]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>

            {/* Inner school uniform tie & collar */}
            <mesh position={[0, 0.25, 0.14]}>
              <planeGeometry args={[0.08, 0.16]} />
              <meshStandardMaterial color={shirtColor} />
            </mesh>
            <mesh position={[0, 0.2, 0.145]}>
              <planeGeometry args={[0.028, 0.12]} />
              <meshStandardMaterial color="#dc2626" /> {/* Red tie */}
            </mesh>

            {/* Breast Pocket with Pen & Researcher ID */}
            <group position={[0.09, 0.08, 0.16]} rotation={[0, 0.25, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.07, 0.085, 0.01]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
              </mesh>
              {/* Blue pen */}
              <mesh position={[-0.015, 0.04, 0.008]} castShadow>
                <cylinderGeometry args={[0.004, 0.004, 0.04, 8]} />
                <meshStandardMaterial color="#1d4ed8" metalness={0.3} roughness={0.3} />
              </mesh>
              {/* Pen silver clip */}
              <mesh position={[-0.015, 0.02, 0.012]}>
                <boxGeometry args={[0.002, 0.02, 0.003]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
              </mesh>
              {/* ID Badge */}
              <mesh position={[0.02, 0.01, 0.008]} castShadow>
                <boxGeometry args={[0.032, 0.045, 0.003]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
            </group>

            {/* Center button placket with metallic buttons */}
            <mesh position={[0, 0, 0.185]}>
              <boxGeometry args={[0.012, 0.5, 0.008]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            {[-0.1, 0.05, 0.18].map((buttonY, idx) => (
              <mesh key={idx} position={[0, buttonY, 0.19]}>
                <sphereGeometry args={[0.012, 8, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
              </mesh>
            ))}
          </group>
        ) : (
          /* Standard School Shirt Torso */
          <group position={[0, 0.9, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.17, 0.2, 0.65, 16]} />
              <meshStandardMaterial color={shirtColor} roughness={0.5} />
            </mesh>
            {/* Shirt collar */}
            <mesh position={[0, 0.26, 0.12]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.12, 0.04, 0.04]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        )}

        {/* ================= SHOULDERS (ANATOMICAL BALL JOINTS) ================= */}
        {/* Left Shoulder Joint */}
        <mesh position={[-0.22, 1.15, 0]} castShadow>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial
            color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
            roughness={0.6}
          />
        </mesh>
        {/* Right Shoulder Joint */}
        <mesh position={[0.22, 1.15, 0]} castShadow>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial
            color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
            roughness={0.6}
          />
        </mesh>

        {/* ================= LEFT ARM PIVOT ================= */}
        <group position={[-0.22, 1.15, 0]} ref={leftArmPivot}>
          {/* Upper Arm */}
          <mesh position={[-0.04, -0.14, 0]} rotation={[0, 0, 0.1]} castShadow>
            <cylinderGeometry args={[0.048, 0.044, 0.24, 16]} />
            <meshStandardMaterial
              color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
              roughness={0.6}
            />
          </mesh>

          {/* Elbow Joint */}
          <mesh position={[-0.06, -0.26, 0]} castShadow>
            <sphereGeometry args={[0.046, 12, 12]} />
            <meshStandardMaterial
              color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
              roughness={0.6}
            />
          </mesh>

          {/* Forearm */}
          <mesh position={[-0.06, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.044, 0.04, 0.22, 16]} />
            <meshStandardMaterial
              color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
              roughness={0.6}
            />
          </mesh>

          {/* Wrist & Hand / Glove */}
          <group position={[-0.06, -0.51, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.052, 16, 16]} />
              <meshStandardMaterial
                color={player.equipment.hasGloves ? '#38bdf8' : skinColor}
                roughness={player.equipment.hasGloves ? 0.3 : 0.6}
              />
            </mesh>
            {/* Nitrile glove cuff rolled over sleeve */}
            {player.equipment.hasGloves && (
              <mesh position={[0, 0.04, 0]} castShadow>
                <cylinderGeometry args={[0.048, 0.046, 0.05, 16]} />
                <meshStandardMaterial color="#0284c7" roughness={0.4} />
              </mesh>
            )}
          </group>
        </group>

        {/* ================= RIGHT ARM PIVOT ================= */}
        <group position={[0.22, 1.15, 0]} ref={rightArmPivot}>
          {/* Upper Arm */}
          <mesh position={[0.04, -0.14, 0]} rotation={[0, 0, -0.1]} castShadow>
            <cylinderGeometry args={[0.048, 0.044, 0.24, 16]} />
            <meshStandardMaterial
              color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
              roughness={0.6}
            />
          </mesh>

          {/* Elbow Joint */}
          <mesh position={[0.06, -0.26, 0]} castShadow>
            <sphereGeometry args={[0.046, 12, 12]} />
            <meshStandardMaterial
              color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
              roughness={0.6}
            />
          </mesh>

          {/* Forearm */}
          <mesh position={[0.06, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.044, 0.04, 0.22, 16]} />
            <meshStandardMaterial
              color={player.equipment.hasLabCoat ? '#ffffff' : shirtColor}
              roughness={0.6}
            />
          </mesh>

          {/* Wrist & Hand / Glove */}
          <group position={[0.06, -0.51, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.052, 16, 16]} />
              <meshStandardMaterial
                color={player.equipment.hasGloves ? '#38bdf8' : skinColor}
                roughness={player.equipment.hasGloves ? 0.3 : 0.6}
              />
            </mesh>
            {/* Nitrile glove cuff rolled over sleeve */}
            {player.equipment.hasGloves && (
              <mesh position={[0, 0.04, 0]} castShadow>
                <cylinderGeometry args={[0.048, 0.046, 0.05, 16]} />
                <meshStandardMaterial color="#0284c7" roughness={0.4} />
              </mesh>
            )}

            {/* Held Item: Extinguisher in Right Hand */}
            {player.inventory.hasFireExtinguisher && (
              <group position={[0, -0.05, 0.15]} rotation={[0.3, 0, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.065, 0.065, 0.38, 16]} />
                  <meshStandardMaterial color="#dc2626" roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.22, 0]} castShadow>
                  <cylinderGeometry args={[0.02, 0.02, 0.08]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              </group>
            )}

            {/* Held Item: Trash piece in Right Hand */}
            {player.inventory.isHoldingTrash && (
              <group position={[0, -0.05, 0.08]}>
                <mesh castShadow>
                  <dodecahedronGeometry args={[0.055]} />
                  <meshStandardMaterial
                    color="#c084fc"
                    emissive="#a855f7"
                    emissiveIntensity={0.8}
                  />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* ================= WAIST & PELVIS (SEAMLESS TRUNK CONNECTION) ================= */}
        <group position={[0, 0.54, 0]}>
          {/* Pelvis block bridging torso to legs */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.17, 0.14, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>
          {/* Leather belt */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.205, 0.205, 0.03, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Silver buckle */}
          <mesh position={[0, 0.04, 0.205]}>
            <boxGeometry args={[0.04, 0.03, 0.01]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* ================= LEFT LEG ASSEMBLY (PIVOTED AT HIP) ================= */}
        <group position={[-0.1, 0.48, 0]} ref={leftLegPivot}>
          {/* Hip Ball Joint */}
          <mesh castShadow>
            <sphereGeometry args={[0.062, 16, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Thigh */}
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.055, 0.24, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Knee Joint */}
          <mesh position={[0, -0.27, 0]} castShadow>
            <sphereGeometry args={[0.054, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Shin / Calf */}
          <mesh position={[0, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.052, 0.046, 0.2, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Ankle Connection */}
          <mesh position={[0, -0.47, 0]} castShadow>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Foot / Shoe */}
          <group position={[0, -0.5, 0.03]}>
            {player.equipment.hasClosedShoes ? (
              /* High-safety Leather Work Boot */
              <group>
                {/* Thick treaded sole */}
                <mesh position={[0, -0.035, 0.02]} castShadow receiveShadow>
                  <boxGeometry args={[0.088, 0.025, 0.2]} />
                  <meshStandardMaterial color="#020617" roughness={0.95} />
                </mesh>
                {/* Boot leather upper */}
                <mesh position={[0, 0, 0.01]} castShadow>
                  <boxGeometry args={[0.082, 0.06, 0.17]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.8} />
                </mesh>
                {/* Reinforced steel-toe cap */}
                <mesh position={[0, 0, 0.09]} castShadow>
                  <sphereGeometry args={[0.04, 16, 16]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.7} />
                </mesh>
                {/* White bootlaces */}
                <mesh position={[0, 0.032, 0.02]}>
                  <boxGeometry args={[0.032, 0.005, 0.06]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ) : (
              /* Vulnerable open sandals */
              <group>
                <mesh position={[0, -0.035, 0.01]} castShadow>
                  <boxGeometry args={[0.08, 0.015, 0.17]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} />
                </mesh>
                <mesh position={[0, -0.015, 0.01]} castShadow>
                  <boxGeometry args={[0.074, 0.028, 0.15]} />
                  <meshStandardMaterial color={skinColor} roughness={0.5} />
                </mesh>
                {/* Red plastic straps */}
                <mesh position={[0, 0.005, 0]} rotation={[0.2, 0, 0.3]}>
                  <boxGeometry args={[0.015, 0.004, 0.1]} />
                  <meshStandardMaterial color="#ef4444" />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* ================= RIGHT LEG ASSEMBLY (PIVOTED AT HIP) ================= */}
        <group position={[0.1, 0.48, 0]} ref={rightLegPivot}>
          {/* Hip Ball Joint */}
          <mesh castShadow>
            <sphereGeometry args={[0.062, 16, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Thigh */}
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.055, 0.24, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Knee Joint */}
          <mesh position={[0, -0.27, 0]} castShadow>
            <sphereGeometry args={[0.054, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Shin / Calf */}
          <mesh position={[0, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.052, 0.046, 0.2, 16]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Ankle Connection */}
          <mesh position={[0, -0.47, 0]} castShadow>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.7} />
          </mesh>

          {/* Foot / Shoe */}
          <group position={[0, -0.5, 0.03]}>
            {player.equipment.hasClosedShoes ? (
              /* High-safety Leather Work Boot */
              <group>
                {/* Thick treaded sole */}
                <mesh position={[0, -0.035, 0.02]} castShadow receiveShadow>
                  <boxGeometry args={[0.088, 0.025, 0.2]} />
                  <meshStandardMaterial color="#020617" roughness={0.95} />
                </mesh>
                {/* Boot leather upper */}
                <mesh position={[0, 0, 0.01]} castShadow>
                  <boxGeometry args={[0.082, 0.06, 0.17]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.8} />
                </mesh>
                {/* Reinforced steel-toe cap */}
                <mesh position={[0, 0, 0.09]} castShadow>
                  <sphereGeometry args={[0.04, 16, 16]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.7} />
                </mesh>
                {/* White bootlaces */}
                <mesh position={[0, 0.032, 0.02]}>
                  <boxGeometry args={[0.032, 0.005, 0.06]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ) : (
              /* Vulnerable open sandals */
              <group>
                <mesh position={[0, -0.035, 0.01]} castShadow>
                  <boxGeometry args={[0.08, 0.015, 0.17]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} />
                </mesh>
                <mesh position={[0, -0.015, 0.01]} castShadow>
                  <boxGeometry args={[0.074, 0.028, 0.15]} />
                  <meshStandardMaterial color={skinColor} roughness={0.5} />
                </mesh>
                {/* Red plastic straps */}
                <mesh position={[0, 0.005, 0]} rotation={[0.2, 0, -0.3]}>
                  <boxGeometry args={[0.015, 0.004, 0.1]} />
                  <meshStandardMaterial color="#ef4444" />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
