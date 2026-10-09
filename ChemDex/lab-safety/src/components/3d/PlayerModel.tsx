import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
  const player = propPlayer || storePlayer;

  // Limb pivot groups for smooth biomechanical animations
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
      if (leftLegPivot.current) leftLegPivot.current.rotation.x = Math.sin(t * 10) * 0.45;
      if (rightLegPivot.current) rightLegPivot.current.rotation.x = -Math.sin(t * 10) * 0.45;

      if (leftArmPivot.current) leftArmPivot.current.rotation.x = -Math.sin(t * 10) * 0.42;
      if (rightArmPivot.current) rightArmPivot.current.rotation.x = Math.sin(t * 10) * 0.42;

      if (modelRef.current) {
        modelRef.current.position.y = Math.abs(Math.sin(t * 20)) * 0.025;
      }
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 10) * 0.03;
      }
    } else {
      // Gentle breathing idle animation
      if (leftLegPivot.current) leftLegPivot.current.rotation.x = 0;
      if (rightLegPivot.current) rightLegPivot.current.rotation.x = 0;

      if (leftArmPivot.current) {
        leftArmPivot.current.rotation.x = Math.sin(t * 2) * 0.03;
        leftArmPivot.current.rotation.z = 0.28 + Math.sin(t * 2) * 0.015;
      }
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.sin(t * 2) * 0.03;
        rightArmPivot.current.rotation.z = -0.28 - Math.sin(t * 2) * 0.015;
      }

      if (modelRef.current) {
        modelRef.current.position.y = Math.sin(t * 2) * 0.008;
      }
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 1.5) * 0.025;
      }
    }
  });

  // Color Palette matching reference turnaround image:
  const skinColor = '#FAD9C0'; // Warm peach skin tone
  const hairColor = '#6A3B1F'; // Warm chestnut brown
  const shirtColor = '#3897DC'; // Soft sky blue collared polo
  const labCoatColor = '#FFFFFF';
  const pocketColor = '#F3F4F6';
  const pantsColor = '#243344'; // Navy slate trousers
  const cuffColor = '#304255'; // Rolled ankle cuff ring
  const shoeCanvasColor = '#2A3C50'; // Navy sneaker canvas
  const whiteTrim = '#FFFFFF'; // Rubber soles, toe caps, laces, lab coat
  const goggleFrame = '#FFFFFF';
  const goggleStrap = '#2B3746'; // Dark charcoal strap
  const goggleLens = '#E0F2FE';

  const hasGloves = player.equipment.hasGloves;
  const hasMask = player.equipment.hasMask;

  return (
    <group ref={rootGroupRef} position={position || [0, 0, 0]} rotation={[0, rotationY || 0, 0]}>
      <group ref={modelRef} scale={[0.85, 0.85, 0.85]}>
        
        {/* ================= 1. HIPS, LEGS & SNEAKERS ================= */}
        <group position={[0, 0.78, 0]}>
          {/* Pelvis connecting block */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[0.28, 0.12, 0.2]} />
            <meshStandardMaterial color={pantsColor} roughness={0.65} />
          </mesh>

          {/* LEFT LEG (Pivot at Hip X = -0.11) */}
          <group ref={leftLegPivot} position={[-0.11, -0.05, 0]}>
            {/* Smooth Trouser Leg (Tapered Cylinder) */}
            <mesh position={[0, -0.3, 0]} castShadow>
              <cylinderGeometry args={[0.072, 0.078, 0.58, 20]} />
              <meshStandardMaterial color={pantsColor} roughness={0.65} />
            </mesh>

            {/* Rolled Ankle Cuff (Thick clean ring) */}
            <mesh position={[0, -0.58, 0]} castShadow>
              <cylinderGeometry args={[0.088, 0.088, 0.055, 20]} />
              <meshStandardMaterial color={cuffColor} roughness={0.6} />
            </mesh>

            {/* Exposed Skin Ankle */}
            <mesh position={[0, -0.63, 0]}>
              <cylinderGeometry args={[0.058, 0.058, 0.05, 16]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>

            {/* LEFT SNEAKER */}
            <group position={[0, -0.68, 0.02]}>
              {/* White Rubber Outsole */}
              <mesh position={[0, -0.045, 0.03]} castShadow receiveShadow>
                <boxGeometry args={[0.138, 0.04, 0.27]} />
                <meshStandardMaterial color={whiteTrim} roughness={0.4} />
              </mesh>
              {/* Navy Canvas Upper */}
              <mesh position={[0, 0.015, 0.01]} castShadow>
                <boxGeometry args={[0.132, 0.08, 0.24]} />
                <meshStandardMaterial color={shoeCanvasColor} roughness={0.65} />
              </mesh>
              {/* White Rubber Toe Cap */}
              <mesh position={[0, -0.005, 0.12]} castShadow>
                <sphereGeometry args={[0.068, 16, 12, 0, Math.PI, 0, Math.PI / 2]} />
                <meshStandardMaterial color={whiteTrim} roughness={0.35} />
              </mesh>
              {/* White Laces */}
              {[-0.01, 0.025, 0.06].map((lz, idx) => (
                <mesh key={idx} position={[0, 0.06, lz]}>
                  <boxGeometry args={[0.08, 0.012, 0.016]} />
                  <meshStandardMaterial color={whiteTrim} roughness={0.3} />
                </mesh>
              ))}
            </group>
          </group>

          {/* RIGHT LEG (Pivot at Hip X = +0.11) */}
          <group ref={rightLegPivot} position={[0.11, -0.05, 0]}>
            {/* Smooth Trouser Leg */}
            <mesh position={[0, -0.3, 0]} castShadow>
              <cylinderGeometry args={[0.072, 0.078, 0.58, 20]} />
              <meshStandardMaterial color={pantsColor} roughness={0.65} />
            </mesh>

            {/* Rolled Ankle Cuff */}
            <mesh position={[0, -0.58, 0]} castShadow>
              <cylinderGeometry args={[0.088, 0.088, 0.055, 20]} />
              <meshStandardMaterial color={cuffColor} roughness={0.6} />
            </mesh>

            {/* Exposed Skin Ankle */}
            <mesh position={[0, -0.63, 0]}>
              <cylinderGeometry args={[0.058, 0.058, 0.05, 16]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>

            {/* RIGHT SNEAKER */}
            <group position={[0, -0.68, 0.02]}>
              {/* White Rubber Outsole */}
              <mesh position={[0, -0.045, 0.03]} castShadow receiveShadow>
                <boxGeometry args={[0.138, 0.04, 0.27]} />
                <meshStandardMaterial color={whiteTrim} roughness={0.4} />
              </mesh>
              {/* Navy Canvas Upper */}
              <mesh position={[0, 0.015, 0.01]} castShadow>
                <boxGeometry args={[0.132, 0.08, 0.24]} />
                <meshStandardMaterial color={shoeCanvasColor} roughness={0.65} />
              </mesh>
              {/* White Rubber Toe Cap */}
              <mesh position={[0, -0.005, 0.12]} castShadow>
                <sphereGeometry args={[0.068, 16, 12, 0, Math.PI, 0, Math.PI / 2]} />
                <meshStandardMaterial color={whiteTrim} roughness={0.35} />
              </mesh>
              {/* White Laces */}
              {[-0.01, 0.025, 0.06].map((lz, idx) => (
                <mesh key={idx} position={[0, 0.06, lz]}>
                  <boxGeometry args={[0.08, 0.012, 0.016]} />
                  <meshStandardMaterial color={whiteTrim} roughness={0.3} />
                </mesh>
              ))}
            </group>
          </group>
        </group>

        {/* ================= 2. TORSO, SHIRT & LAB COAT ================= */}
        <group position={[0, 1.08, 0]}>
          {/* Main Solid Torso with White Lab Coat Exterior */}
          <mesh position={[0, 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.24, 0.48, 24]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.4} />
          </mesh>

          {/* Inner Light-Blue Collared Shirt (Clean front inset) */}
          <mesh position={[0, 0.1, 0.1]}>
            <boxGeometry args={[0.16, 0.38, 0.08]} />
            <meshStandardMaterial color={shirtColor} roughness={0.55} />
          </mesh>

          {/* Blue Shirt Collar Lapels */}
          <group position={[0, 0.28, 0.13]}>
            <mesh position={[-0.045, -0.02, 0.015]} rotation={[0.2, -0.2, -0.3]}>
              <boxGeometry args={[0.065, 0.065, 0.015]} />
              <meshStandardMaterial color={shirtColor} roughness={0.5} />
            </mesh>
            <mesh position={[0.045, -0.02, 0.015]} rotation={[0.2, 0.2, 0.3]}>
              <boxGeometry args={[0.065, 0.065, 0.015]} />
              <meshStandardMaterial color={shirtColor} roughness={0.5} />
            </mesh>
          </group>

          {/* White Lab Coat Lapels (Flat, Clean Framing the Shirt) */}
          <group position={[0, 0.18, 0.13]}>
            <mesh position={[-0.1, 0, 0.01]} rotation={[0.1, -0.15, -0.15]}>
              <boxGeometry args={[0.09, 0.24, 0.02]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            <mesh position={[0.1, 0, 0.01]} rotation={[0.1, 0.15, 0.15]}>
              <boxGeometry args={[0.09, 0.24, 0.02]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
          </group>

          {/* Lower Coat Skirt (Mid-Thigh Length) */}
          <mesh position={[0, -0.28, 0]} castShadow>
            <cylinderGeometry args={[0.242, 0.27, 0.36, 24]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.4} />
          </mesh>

          {/* Front Coat Opening Seam Split */}
          <mesh position={[0, -0.28, 0.13]}>
            <boxGeometry args={[0.06, 0.36, 0.02]} />
            <meshStandardMaterial color={pantsColor} roughness={0.6} />
          </mesh>

          {/* Two Rectangular Front Patch Pockets */}
          <group position={[-0.145, -0.3, 0.135]} rotation={[0, -0.1, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.095, 0.135, 0.018]} />
              <meshStandardMaterial color={pocketColor} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.065, 0.005]}>
              <boxGeometry args={[0.098, 0.014, 0.02]} />
              <meshStandardMaterial color={whiteTrim} roughness={0.35} />
            </mesh>
          </group>
          <group position={[0.145, -0.3, 0.135]} rotation={[0, 0.1, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.095, 0.135, 0.018]} />
              <meshStandardMaterial color={pocketColor} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.065, 0.005]}>
              <boxGeometry args={[0.098, 0.014, 0.02]} />
              <meshStandardMaterial color={whiteTrim} roughness={0.35} />
            </mesh>
          </group>

          {/* ================= 3. SEAMLESS ARMS & HANDS ================= */}
          {/* LEFT ARM (Pivot at Shoulder X = -0.28, Y = 0.2, Z = 0) */}
          <group ref={leftArmPivot} position={[-0.28, 0.2, 0]}>
            {/* Seamless Arm: Full Natural Sleeve */}
            <mesh position={[-0.06, -0.16, 0]} rotation={[0, 0, 0.28]} castShadow>
              <cylinderGeometry args={[0.068, 0.062, 0.36, 18]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Forearm Sleeve */}
            <mesh position={[-0.15, -0.42, 0]} rotation={[0, 0, 0.28]} castShadow>
              <cylinderGeometry args={[0.062, 0.058, 0.3, 18]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Wrist Cuff Rim */}
            <mesh position={[-0.19, -0.54, 0]} rotation={[0, 0, 0.28]}>
              <cylinderGeometry args={[0.065, 0.065, 0.035, 18]} />
              <meshStandardMaterial color={pocketColor} roughness={0.4} />
            </mesh>

            {/* Natural Cartoon Hand */}
            <group position={[-0.22, -0.61, 0]} rotation={[0, 0, 0.28]}>
              <mesh castShadow>
                <boxGeometry args={[0.072, 0.09, 0.04]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.5} 
                />
              </mesh>
              {/* Rounded Thumb */}
              <mesh position={[0.04, -0.01, 0.01]} rotation={[0, 0, -0.4]} castShadow>
                <capsuleGeometry args={[0.016, 0.035, 8, 8]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.5} 
                />
              </mesh>
            </group>
          </group>

          {/* RIGHT ARM (Pivot at Shoulder X = +0.28, Y = 0.2, Z = 0) */}
          <group ref={rightArmPivot} position={[0.28, 0.2, 0]}>
            {/* Seamless Arm: Full Natural Sleeve */}
            <mesh position={[0.06, -0.16, 0]} rotation={[0, 0, -0.28]} castShadow>
              <cylinderGeometry args={[0.068, 0.062, 0.36, 18]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Forearm Sleeve */}
            <mesh position={[0.15, -0.42, 0]} rotation={[0, 0, -0.28]} castShadow>
              <cylinderGeometry args={[0.062, 0.058, 0.3, 18]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Wrist Cuff Rim */}
            <mesh position={[0.19, -0.54, 0]} rotation={[0, 0, -0.28]}>
              <cylinderGeometry args={[0.065, 0.065, 0.035, 18]} />
              <meshStandardMaterial color={pocketColor} roughness={0.4} />
            </mesh>

            {/* Natural Cartoon Hand */}
            <group position={[0.22, -0.61, 0]} rotation={[0, 0, -0.28]}>
              <mesh castShadow>
                <boxGeometry args={[0.072, 0.09, 0.04]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.5} 
                />
              </mesh>
              {/* Rounded Thumb */}
              <mesh position={[-0.04, -0.01, 0.01]} rotation={[0, 0, 0.4]} castShadow>
                <capsuleGeometry args={[0.016, 0.035, 8, 8]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.5} 
                />
              </mesh>
            </group>
          </group>

          {/* ================= 4. NECK & SMOOTH CUTE HEAD ================= */}
          {/* Smooth Neck connecting to body */}
          <mesh position={[0, 0.32, 0]} castShadow>
            <cylinderGeometry args={[0.082, 0.098, 0.16, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>

          {/* Head Group (Smooth Single Head Sphere, NO separate puffy cheek lumps) */}
          <group ref={headGroupRef} position={[0, 0.56, 0]}>
            {/* Cute Smooth Head */}
            <mesh castShadow>
              <sphereGeometry args={[0.245, 32, 32]} />
              <meshStandardMaterial color={skinColor} roughness={0.45} />
            </mesh>

            {/* Cute Soft Blush (Flat on skin) */}
            <mesh position={[-0.14, -0.04, 0.195]} rotation={[0, -0.32, 0]}>
              <circleGeometry args={[0.042, 16]} />
              <meshBasicMaterial color="#FB7185" transparent opacity={0.65} />
            </mesh>
            <mesh position={[0.14, -0.04, 0.195]} rotation={[0, 0.32, 0]}>
              <circleGeometry args={[0.042, 16]} />
              <meshBasicMaterial color="#FB7185" transparent opacity={0.65} />
            </mesh>

            {/* Tiny Cute Button Nose */}
            <mesh position={[0, -0.02, 0.245]}>
              <sphereGeometry args={[0.018, 12, 12]} />
              <meshStandardMaterial color="#FCA5A5" roughness={0.5} />
            </mesh>

            {/* Big Friendly Smiling Anime Eyes */}
            {/* Left Eye */}
            <group position={[-0.082, 0.04, 0.23]} rotation={[0, -0.18, 0]}>
              <mesh>
                <circleGeometry args={[0.036, 20]} />
                <meshBasicMaterial color="#291811" />
              </mesh>
              {/* White Specular Sparkle */}
              <mesh position={[0.01, 0.012, 0.002]}>
                <circleGeometry args={[0.012, 12]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              <mesh position={[-0.008, -0.008, 0.002]}>
                <circleGeometry args={[0.006, 10]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Eyebrow */}
              <mesh position={[0, 0.05, 0.002]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[0.06, 0.01, 0.002]} />
                <meshBasicMaterial color="#532E16" />
              </mesh>
            </group>

            {/* Right Eye */}
            <group position={[0.082, 0.04, 0.23]} rotation={[0, 0.18, 0]}>
              <mesh>
                <circleGeometry args={[0.036, 20]} />
                <meshBasicMaterial color="#291811" />
              </mesh>
              {/* White Specular Sparkle */}
              <mesh position={[0.006, 0.012, 0.002]}>
                <circleGeometry args={[0.012, 12]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              <mesh position={[-0.012, -0.008, 0.002]}>
                <circleGeometry args={[0.006, 10]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Eyebrow */}
              <mesh position={[0, 0.05, 0.002]} rotation={[0, 0, -0.1]}>
                <boxGeometry args={[0.06, 0.01, 0.002]} />
                <meshBasicMaterial color="#532E16" />
              </mesh>
            </group>

            {/* Happy Curved Smile */}
            <group position={[0, -0.08, 0.236]}>
              <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.03, 0.006, 8, 16, Math.PI]} />
                <meshBasicMaterial color="#581C20" />
              </mesh>
              <mesh position={[0, -0.012, 0]}>
                <circleGeometry args={[0.018, 14, Math.PI, Math.PI]} />
                <meshBasicMaterial color="#FB7185" />
              </mesh>
            </group>

            {/* Ears */}
            <mesh position={[-0.235, 0.02, 0]} rotation={[0, -0.25, 0]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>
            <mesh position={[0.235, 0.02, 0]} rotation={[0, 0.25, 0]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>

            {/* ================= 5. STYLED CHESTNUT HAIR (CLEAN VOLUME) ================= */}
            {/* Smooth Top & Back Hair Cap (No separate sausages) */}
            <mesh position={[0, 0.06, -0.03]} castShadow>
              <sphereGeometry args={[0.258, 28, 28]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            {/* Back Hair Rounding */}
            <mesh position={[0, -0.04, -0.09]} castShadow>
              <sphereGeometry args={[0.21, 20, 20]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>

            {/* Stylized Smooth Front Fringe Bangs (Hugging the brow naturally) */}
            <group position={[0, 0.14, 0.18]}>
              {/* Left Wing Bang */}
              <mesh position={[-0.11, 0, 0.01]} rotation={[0.2, -0.2, -0.35]}>
                <boxGeometry args={[0.11, 0.09, 0.04]} />
                <meshStandardMaterial color={hairColor} roughness={0.7} />
              </mesh>
              {/* Center Bang */}
              <mesh position={[-0.01, 0.02, 0.03]} rotation={[0.15, 0, -0.05]}>
                <boxGeometry args={[0.12, 0.1, 0.04]} />
                <meshStandardMaterial color={hairColor} roughness={0.7} />
              </mesh>
              {/* Right Wing Bang */}
              <mesh position={[0.1, 0, 0.01]} rotation={[0.2, 0.2, 0.35]}>
                <boxGeometry args={[0.11, 0.09, 0.04]} />
                <meshStandardMaterial color={hairColor} roughness={0.7} />
              </mesh>
            </group>

            {/* Sideburns framing the face */}
            <mesh position={[-0.22, 0.02, 0.09]} rotation={[0.1, 0, -0.15]}>
              <boxGeometry args={[0.04, 0.1, 0.05]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.22, 0.02, 0.09]} rotation={[0.1, 0, 0.15]}>
              <boxGeometry args={[0.04, 0.1, 0.05]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>

            {/* ================= 6. FOREHEAD GOGGLES (FLUSH & CLEAN) ================= */}
            <group position={[0, 0.19, 0.13]} rotation={[0.18, 0, 0]}>
              {/* White Curved Goggle Bezel */}
              <mesh castShadow>
                <boxGeometry args={[0.31, 0.11, 0.06]} />
                <meshStandardMaterial color={goggleFrame} roughness={0.3} />
              </mesh>
              {/* Clear Glass Visor Lens */}
              <mesh position={[0, 0, 0.025]}>
                <boxGeometry args={[0.27, 0.08, 0.03]} />
                <meshPhysicalMaterial 
                  color={goggleLens} 
                  transparent 
                  opacity={0.65} 
                  roughness={0.08}
                  reflectivity={0.9} 
                />
              </mesh>
              {/* Dark Charcoal Head Strap wrapping around head */}
              <mesh position={[-0.165, -0.015, -0.14]} rotation={[0, -0.22, 0]}>
                <boxGeometry args={[0.025, 0.038, 0.28]} />
                <meshStandardMaterial color={goggleStrap} roughness={0.8} />
              </mesh>
              <mesh position={[0.165, -0.015, -0.14]} rotation={[0, 0.22, 0]}>
                <boxGeometry args={[0.025, 0.038, 0.28]} />
                <meshStandardMaterial color={goggleStrap} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.045, -0.26]}>
                <boxGeometry args={[0.31, 0.038, 0.025]} />
                <meshStandardMaterial color={goggleStrap} roughness={0.8} />
              </mesh>
            </group>

            {/* Optional Surgical Mask when equipped */}
            {hasMask && (
              <group position={[0, -0.06, 0.22]}>
                <mesh castShadow>
                  <boxGeometry args={[0.2, 0.11, 0.05]} />
                  <meshStandardMaterial color="#38BDF8" roughness={0.6} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
