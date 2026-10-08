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
  const character = useStore((s) => s.character);
  const player = propPlayer || storePlayer;

  // Limb pivot groups for biomechanical walking swing
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
      if (leftLegPivot.current) leftLegPivot.current.rotation.x = Math.sin(t * 11) * 0.52;
      if (rightLegPivot.current) rightLegPivot.current.rotation.x = -Math.sin(t * 11) * 0.52;

      if (leftArmPivot.current) leftArmPivot.current.rotation.x = -Math.sin(t * 11) * 0.48;
      if (rightArmPivot.current) rightArmPivot.current.rotation.x = Math.sin(t * 11) * 0.48;

      if (modelRef.current) {
        modelRef.current.position.y = Math.abs(Math.sin(t * 22)) * 0.035;
      }
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 11) * 0.04;
      }
    } else {
      // Gentle breathing idle animation
      if (leftLegPivot.current) leftLegPivot.current.rotation.x = 0;
      if (rightLegPivot.current) rightLegPivot.current.rotation.x = 0;

      if (leftArmPivot.current) {
        leftArmPivot.current.rotation.x = Math.sin(t * 2) * 0.04;
        leftArmPivot.current.rotation.z = Math.sin(t * 2) * 0.02;
      }
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.sin(t * 2) * 0.04;
        rightArmPivot.current.rotation.z = -Math.sin(t * 2) * 0.02;
      }

      if (modelRef.current) {
        modelRef.current.position.y = Math.sin(t * 2) * 0.01;
      }
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 1.5) * 0.03;
      }
    }

    // Equipment holding arm pose overrides
    if (player.inventory.hasSweeper) {
      if (leftArmPivot.current) {
        leftArmPivot.current.rotation.x = -Math.PI / 2.6;
        leftArmPivot.current.rotation.z = Math.PI / 8;
      }
      if (rightArmPivot.current) {
        rightArmPivot.current.rotation.x = -Math.PI / 2.8;
        rightArmPivot.current.rotation.z = -Math.PI / 8;
      }
    }
  });

  // Color Palette directly matching user's reference image:
  const skinColor = '#FBD3B6';
  const hairColor = '#7A482B';
  const shirtColor = '#4293D6'; // Soft sky blue collared shirt
  const labCoatColor = '#FFFFFF';
  const pocketColor = '#F1F5F9';
  const pantsColor = '#243242'; // Dark navy slate trousers
  const cuffColor = '#2D3D50'; // Rolled ankle cuffs
  const shoeCanvasColor = '#27384B'; // Navy sneaker canvas
  const shoeRubberWhite = '#FFFFFF'; // White sole, toe cap, laces
  const goggleFrameWhite = '#FFFFFF';
  const goggleStrapColor = '#2A3644'; // Charcoal dark grey strap
  const goggleLensColor = '#DCEBF8';

  const hasGloves = player.equipment.hasGloves;
  const hasMask = player.equipment.hasMask;

  return (
    <group ref={rootGroupRef} position={position || [0, 0, 0]} rotation={[0, rotationY || 0, 0]}>
      <group ref={modelRef} scale={[0.82, 0.82, 0.82]}>
        {/* ================= 1. LEGS, CUFFS & SNEAKERS ================= */}
        {/* Hip Center Base (Y = 0.82) */}
        <group position={[0, 0.82, 0]}>
          {/* LEFT LEG HINGE (X = -0.125) */}
          <group ref={leftLegPivot} position={[-0.125, 0, 0]}>
            {/* Trousers Upper & Lower (Navy Blue) */}
            <mesh position={[0, -0.32, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.082, 0.64, 16]} />
              <meshStandardMaterial color={pantsColor} roughness={0.65} />
            </mesh>

            {/* Rolled Trouser Cuff (Distinct thick ring at bottom) */}
            <mesh position={[0, -0.63, 0]} castShadow>
              <cylinderGeometry args={[0.092, 0.092, 0.065, 16]} />
              <meshStandardMaterial color={cuffColor} roughness={0.6} />
            </mesh>

            {/* Exposed Skin Ankle (Between cuff and sneaker) */}
            <mesh position={[0, -0.68, 0]}>
              <cylinderGeometry args={[0.06, 0.062, 0.05, 14]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>

            {/* LEFT SNEAKER (Matching Reference: Navy canvas, white toe cap & sole) */}
            <group position={[0, -0.74, 0.02]}>
              {/* Thick White Rubber Outsole */}
              <mesh position={[0, -0.05, 0.03]} castShadow receiveShadow>
                <boxGeometry args={[0.145, 0.045, 0.28]} />
                <meshStandardMaterial color={shoeRubberWhite} roughness={0.4} />
              </mesh>
              {/* Outsole bottom tread lip */}
              <mesh position={[0, -0.065, 0.03]}>
                <boxGeometry args={[0.148, 0.015, 0.285]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
              </mesh>

              {/* Navy Canvas Shoe Body */}
              <mesh position={[0, 0.01, 0.01]} castShadow>
                <boxGeometry args={[0.138, 0.085, 0.25]} />
                <meshStandardMaterial color={shoeCanvasColor} roughness={0.65} />
              </mesh>

              {/* White Rubber Toe Cap Shell (Front of sneaker) */}
              <group position={[0, -0.005, 0.12]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.072, 16, 12, 0, Math.PI, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={shoeRubberWhite} roughness={0.35} />
                </mesh>
              </group>

              {/* White Shoelaces (Horizontal stripes across tongue) */}
              {[-0.01, 0.025, 0.06].map((laceZ, idx) => (
                <mesh key={idx} position={[0, 0.056, laceZ]} rotation={[0.2, 0, 0]}>
                  <boxGeometry args={[0.085, 0.012, 0.018]} />
                  <meshStandardMaterial color={shoeRubberWhite} roughness={0.3} />
                </mesh>
              ))}

              {/* White Heel Patch */}
              <mesh position={[0, 0.02, -0.115]}>
                <boxGeometry args={[0.07, 0.065, 0.015]} />
                <meshStandardMaterial color={shoeRubberWhite} roughness={0.4} />
              </mesh>
            </group>
          </group>

          {/* RIGHT LEG HINGE (X = +0.125) */}
          <group ref={rightLegPivot} position={[0.125, 0, 0]}>
            {/* Trousers Upper & Lower (Navy Blue) */}
            <mesh position={[0, -0.32, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.082, 0.64, 16]} />
              <meshStandardMaterial color={pantsColor} roughness={0.65} />
            </mesh>

            {/* Rolled Trouser Cuff */}
            <mesh position={[0, -0.63, 0]} castShadow>
              <cylinderGeometry args={[0.092, 0.092, 0.065, 16]} />
              <meshStandardMaterial color={cuffColor} roughness={0.6} />
            </mesh>

            {/* Exposed Skin Ankle */}
            <mesh position={[0, -0.68, 0]}>
              <cylinderGeometry args={[0.06, 0.062, 0.05, 14]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>

            {/* RIGHT SNEAKER */}
            <group position={[0, -0.74, 0.02]}>
              {/* Thick White Rubber Outsole */}
              <mesh position={[0, -0.05, 0.03]} castShadow receiveShadow>
                <boxGeometry args={[0.145, 0.045, 0.28]} />
                <meshStandardMaterial color={shoeRubberWhite} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.065, 0.03]}>
                <boxGeometry args={[0.148, 0.015, 0.285]} />
                <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
              </mesh>

              {/* Navy Canvas Shoe Body */}
              <mesh position={[0, 0.01, 0.01]} castShadow>
                <boxGeometry args={[0.138, 0.085, 0.25]} />
                <meshStandardMaterial color={shoeCanvasColor} roughness={0.65} />
              </mesh>

              {/* White Rubber Toe Cap Shell */}
              <group position={[0, -0.005, 0.12]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.072, 16, 12, 0, Math.PI, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={shoeRubberWhite} roughness={0.35} />
                </mesh>
              </group>

              {/* White Shoelaces */}
              {[-0.01, 0.025, 0.06].map((laceZ, idx) => (
                <mesh key={idx} position={[0, 0.056, laceZ]} rotation={[0.2, 0, 0]}>
                  <boxGeometry args={[0.085, 0.012, 0.018]} />
                  <meshStandardMaterial color={shoeRubberWhite} roughness={0.3} />
                </mesh>
              ))}

              {/* White Heel Patch */}
              <mesh position={[0, 0.02, -0.115]}>
                <boxGeometry args={[0.07, 0.065, 0.015]} />
                <meshStandardMaterial color={shoeRubberWhite} roughness={0.4} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ================= 2. TORSO, SHIRT & LAB COAT ================= */}
        {/* Main Torso Center (Y = 1.12) */}
        <group position={[0, 1.12, 0]}>
          {/* Inner Light Blue Polo/Dress Shirt Core */}
          <mesh position={[0, 0.05, 0.01]} castShadow>
            <cylinderGeometry args={[0.21, 0.23, 0.52, 20]} />
            <meshStandardMaterial color={shirtColor} roughness={0.6} />
          </mesh>

          {/* Blue Shirt Collar & V-Neck Opening */}
          <group position={[0, 0.32, 0.12]}>
            {/* Left Collar Flap */}
            <mesh position={[-0.06, -0.04, 0.03]} rotation={[0.25, -0.3, -0.35]}>
              <boxGeometry args={[0.09, 0.09, 0.02]} />
              <meshStandardMaterial color={shirtColor} roughness={0.5} />
            </mesh>
            {/* Right Collar Flap */}
            <mesh position={[0.06, -0.04, 0.03]} rotation={[0.25, 0.3, 0.35]}>
              <boxGeometry args={[0.09, 0.09, 0.02]} />
              <meshStandardMaterial color={shirtColor} roughness={0.5} />
            </mesh>
          </group>

          {/* WHITE LAB COAT BODY (Thigh-Length, Clean White, Wide Lapels) */}
          {/* Back & Sides Shell */}
          <mesh position={[0, 0.03, -0.02]} castShadow>
            <cylinderGeometry args={[0.235, 0.265, 0.56, 20, 1, false, Math.PI * 0.2, Math.PI * 1.6]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.4} side={THREE.DoubleSide} />
          </mesh>

          {/* Front Left Coat Flap */}
          <mesh position={[-0.145, 0.01, 0.11]} rotation={[0, -0.15, 0]} castShadow>
            <boxGeometry args={[0.13, 0.56, 0.03]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.4} />
          </mesh>
          {/* Front Right Coat Flap */}
          <mesh position={[0.145, 0.01, 0.11]} rotation={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[0.13, 0.56, 0.03]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.4} />
          </mesh>

          {/* Lab Coat Lapels (Wide White Turned Collars on Left & Right) */}
          <mesh position={[-0.12, 0.24, 0.145]} rotation={[0.15, -0.25, -0.2]}>
            <boxGeometry args={[0.11, 0.17, 0.025]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.35} />
          </mesh>
          <mesh position={[0.12, 0.24, 0.145]} rotation={[0.15, 0.25, 0.2]}>
            <boxGeometry args={[0.11, 0.17, 0.025]} />
            <meshStandardMaterial color={labCoatColor} roughness={0.35} />
          </mesh>

          {/* LOWER LAB COAT SKIRT (Extending down to mid-thigh, Y = -0.32 to -0.52) */}
          <group position={[0, -0.32, 0]}>
            {/* Back/Side Skirt */}
            <mesh position={[0, 0, -0.02]} castShadow>
              <cylinderGeometry args={[0.265, 0.295, 0.38, 20, 1, false, Math.PI * 0.15, Math.PI * 1.7]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} side={THREE.DoubleSide} />
            </mesh>
            {/* Front Left Skirt */}
            <mesh position={[-0.16, 0, 0.12]} rotation={[0, -0.12, 0]} castShadow>
              <boxGeometry args={[0.13, 0.38, 0.025]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Front Right Skirt */}
            <mesh position={[0.16, 0, 0.12]} rotation={[0, 0.12, 0]} castShadow>
              <boxGeometry args={[0.13, 0.38, 0.025]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>

            {/* TWO LARGE FRONT PATCH POCKETS (Prominent in reference image) */}
            {/* Left Patch Pocket */}
            <group position={[-0.16, -0.04, 0.145]} rotation={[0, -0.1, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.105, 0.15, 0.02]} />
                <meshStandardMaterial color={pocketColor} roughness={0.45} />
              </mesh>
              {/* Pocket Top Seam Lip */}
              <mesh position={[0, 0.075, 0.005]}>
                <boxGeometry args={[0.108, 0.016, 0.024]} />
                <meshStandardMaterial color={labCoatColor} roughness={0.35} />
              </mesh>
            </group>

            {/* Right Patch Pocket */}
            <group position={[0.16, -0.04, 0.145]} rotation={[0, 0.1, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.105, 0.15, 0.02]} />
                <meshStandardMaterial color={pocketColor} roughness={0.45} />
              </mesh>
              {/* Pocket Top Seam Lip */}
              <mesh position={[0, 0.075, 0.005]}>
                <boxGeometry args={[0.108, 0.016, 0.024]} />
                <meshStandardMaterial color={labCoatColor} roughness={0.35} />
              </mesh>
            </group>
          </group>

          {/* ================= 3. ARMS, SLEEVES & HANDS ================= */}
          {/* LEFT ARM (Pivot at Shoulder X = -0.32, Y = 0.22, Z = 0) */}
          <group ref={leftArmPivot} position={[-0.32, 0.22, 0]}>
            {/* Shoulder Ball Joint */}
            <mesh castShadow>
              <sphereGeometry args={[0.078, 16, 16]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>

            {/* Upper Arm Sleeve (White Lab Coat) */}
            <mesh position={[-0.07, -0.16, 0]} rotation={[0, 0, 0.38]} castShadow>
              <cylinderGeometry args={[0.074, 0.07, 0.32, 16]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>

            {/* Forearm & Sleeve Cuff */}
            <mesh position={[-0.17, -0.42, 0]} rotation={[0, 0, 0.38]} castShadow>
              <cylinderGeometry args={[0.068, 0.065, 0.28, 16]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Sleeve Cuff Rim */}
            <mesh position={[-0.22, -0.53, 0]} rotation={[0, 0, 0.38]}>
              <cylinderGeometry args={[0.072, 0.072, 0.035, 16]} />
              <meshStandardMaterial color={pocketColor} roughness={0.35} />
            </mesh>

            {/* Hand (Peach Skin or Blue Nitrile Gloves when equipped) */}
            <group position={[-0.26, -0.61, 0]} rotation={[0, 0, 0.38]}>
              {/* Palm / Hand */}
              <mesh castShadow>
                <boxGeometry args={[0.08, 0.1, 0.045]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.55} 
                />
              </mesh>
              {/* Thumb */}
              <mesh position={[0.045, -0.01, 0.015]} rotation={[0, 0, -0.45]} castShadow>
                <capsuleGeometry args={[0.018, 0.04, 8, 8]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.55} 
                />
              </mesh>
              {/* Fingers (Rounded cartoon fingers) */}
              {[-0.024, -0.008, 0.008, 0.024].map((fX, i) => (
                <mesh key={i} position={[fX, -0.065, 0]} castShadow>
                  <capsuleGeometry args={[0.015, 0.038, 8, 8]} />
                  <meshStandardMaterial 
                    color={hasGloves ? '#0EA5E9' : skinColor} 
                    roughness={hasGloves ? 0.3 : 0.55} 
                  />
                </mesh>
              ))}
            </group>
          </group>

          {/* RIGHT ARM (Pivot at Shoulder X = +0.32, Y = 0.22, Z = 0) */}
          <group ref={rightArmPivot} position={[0.32, 0.22, 0]}>
            {/* Shoulder Ball Joint */}
            <mesh castShadow>
              <sphereGeometry args={[0.078, 16, 16]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>

            {/* Upper Arm Sleeve */}
            <mesh position={[0.07, -0.16, 0]} rotation={[0, 0, -0.38]} castShadow>
              <cylinderGeometry args={[0.074, 0.07, 0.32, 16]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>

            {/* Forearm & Sleeve Cuff */}
            <mesh position={[0.17, -0.42, 0]} rotation={[0, 0, -0.38]} castShadow>
              <cylinderGeometry args={[0.068, 0.065, 0.28, 16]} />
              <meshStandardMaterial color={labCoatColor} roughness={0.4} />
            </mesh>
            {/* Sleeve Cuff Rim */}
            <mesh position={[0.22, -0.53, 0]} rotation={[0, 0, -0.38]}>
              <cylinderGeometry args={[0.072, 0.072, 0.035, 16]} />
              <meshStandardMaterial color={pocketColor} roughness={0.35} />
            </mesh>

            {/* Hand */}
            <group position={[0.26, -0.61, 0]} rotation={[0, 0, -0.38]}>
              <mesh castShadow>
                <boxGeometry args={[0.08, 0.1, 0.045]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.55} 
                />
              </mesh>
              {/* Thumb */}
              <mesh position={[-0.045, -0.01, 0.015]} rotation={[0, 0, 0.45]} castShadow>
                <capsuleGeometry args={[0.018, 0.04, 8, 8]} />
                <meshStandardMaterial 
                  color={hasGloves ? '#0EA5E9' : skinColor} 
                  roughness={hasGloves ? 0.3 : 0.55} 
                />
              </mesh>
              {/* Fingers */}
              {[-0.024, -0.008, 0.008, 0.024].map((fX, i) => (
                <mesh key={i} position={[fX, -0.065, 0]} castShadow>
                  <capsuleGeometry args={[0.015, 0.038, 8, 8]} />
                  <meshStandardMaterial 
                    color={hasGloves ? '#0EA5E9' : skinColor} 
                    roughness={hasGloves ? 0.3 : 0.55} 
                  />
                </mesh>
              ))}
            </group>
          </group>

          {/* ================= 4. NECK & HEAD ================= */}
          {/* Neck (Connecting Torso to Head seamlessly) */}
          <mesh position={[0, 0.34, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.11, 0.16, 18]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>

          {/* HEAD GROUP (Big, Cute Stylized Head matching reference) */}
          <group ref={headGroupRef} position={[0, 0.58, 0]}>
            {/* Main Head Sphere (Radius 0.25) */}
            <mesh castShadow>
              <sphereGeometry args={[0.25, 24, 24]} />
              <meshStandardMaterial color={skinColor} roughness={0.45} />
            </mesh>

            {/* Cheek Chubby Contours */}
            <mesh position={[-0.14, -0.05, 0.09]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial color={skinColor} roughness={0.45} />
            </mesh>
            <mesh position={[0.14, -0.05, 0.09]}>
              <sphereGeometry args={[0.11, 16, 16]} />
              <meshStandardMaterial color={skinColor} roughness={0.45} />
            </mesh>

            {/* Cheerful Pink Blush Ovals on Cheeks */}
            <mesh position={[-0.155, -0.035, 0.185]} rotation={[0, -0.3, 0]}>
              <circleGeometry args={[0.045, 16]} />
              <meshBasicMaterial color="#F472B6" transparent opacity={0.65} />
            </mesh>
            <mesh position={[0.155, -0.035, 0.185]} rotation={[0, 0.3, 0]}>
              <circleGeometry args={[0.045, 16]} />
              <meshBasicMaterial color="#F472B6" transparent opacity={0.65} />
            </mesh>

            {/* Cute 3D Button Nose */}
            <mesh position={[0, -0.02, 0.25]} castShadow>
              <sphereGeometry args={[0.026, 14, 14]} />
              <meshStandardMaterial color="#F9A88F" roughness={0.5} />
            </mesh>

            {/* Big Friendly Anime Eyes */}
            {/* Left Eye */}
            <group position={[-0.088, 0.045, 0.232]} rotation={[0, -0.15, 0]}>
              {/* White Sclera */}
              <mesh>
                <circleGeometry args={[0.038, 18]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Dark Brown Pupil */}
              <mesh position={[0.003, -0.002, 0.002]}>
                <circleGeometry args={[0.028, 18]} />
                <meshBasicMaterial color="#2B1810" />
              </mesh>
              {/* Primary White Specular Sparkle */}
              <mesh position={[0.012, 0.012, 0.004]}>
                <circleGeometry args={[0.011, 12]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Secondary Specular Highlight */}
              <mesh position={[-0.008, -0.01, 0.004]}>
                <circleGeometry args={[0.006, 10]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Soft Eyebrow Arch */}
              <mesh position={[0, 0.055, 0.005]} rotation={[0, 0, 0.12]}>
                <boxGeometry args={[0.065, 0.012, 0.005]} />
                <meshBasicMaterial color="#5C331B" />
              </mesh>
            </group>

            {/* Right Eye */}
            <group position={[0.088, 0.045, 0.232]} rotation={[0, 0.15, 0]}>
              {/* White Sclera */}
              <mesh>
                <circleGeometry args={[0.038, 18]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Dark Brown Pupil */}
              <mesh position={[-0.003, -0.002, 0.002]}>
                <circleGeometry args={[0.028, 18]} />
                <meshBasicMaterial color="#2B1810" />
              </mesh>
              {/* Primary White Specular Sparkle */}
              <mesh position={[0.006, 0.012, 0.004]}>
                <circleGeometry args={[0.011, 12]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Secondary Specular Highlight */}
              <mesh position={[-0.012, -0.01, 0.004]}>
                <circleGeometry args={[0.006, 10]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
              {/* Soft Eyebrow Arch */}
              <mesh position={[0, 0.055, 0.005]} rotation={[0, 0, -0.12]}>
                <boxGeometry args={[0.065, 0.012, 0.005]} />
                <meshBasicMaterial color="#5C331B" />
              </mesh>
            </group>

            {/* Happy Smiling Open Mouth */}
            <group position={[0, -0.09, 0.24]}>
              {/* Dark Mouth Cavity */}
              <mesh>
                <cylinderGeometry args={[0.045, 0.045, 0.01, 16, 1, false, Math.PI, Math.PI]} />
                <meshBasicMaterial color="#5B161B" />
              </mesh>
              {/* Cute Pink Tongue */}
              <mesh position={[0, -0.015, 0.003]}>
                <circleGeometry args={[0.025, 14]} />
                <meshBasicMaterial color="#F472B6" />
              </mesh>
              {/* Upper White Teeth Rim */}
              <mesh position={[0, 0.003, 0.003]}>
                <boxGeometry args={[0.05, 0.009, 0.002]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>

            {/* Ears on Sides */}
            <mesh position={[-0.24, 0.02, 0]} rotation={[0, -0.3, 0]} castShadow>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>
            <mesh position={[0.24, 0.02, 0]} rotation={[0, 0.3, 0]} castShadow>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.5} />
            </mesh>

            {/* ================= 5. STYLED BROWN HAIR ================= */}
            {/* Main Hair Volume Dome */}
            <mesh position={[0, 0.08, -0.04]} castShadow>
              <sphereGeometry args={[0.265, 20, 20]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            {/* Back Hair Bulge */}
            <mesh position={[0, -0.02, -0.12]} castShadow>
              <sphereGeometry args={[0.21, 16, 16]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            {/* Top Crown Tuft / Cowlick */}
            <mesh position={[0.03, 0.28, -0.02]} rotation={[0.2, 0, -0.3]} castShadow>
              <coneGeometry args={[0.075, 0.16, 12]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>

            {/* Front Bangs Parting (Matching reference image) */}
            {/* Left Front Bang Chunk */}
            <mesh position={[-0.12, 0.18, 0.18]} rotation={[0.4, -0.2, -0.5]} castShadow>
              <capsuleGeometry args={[0.055, 0.14, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            {/* Center Front Bang Chunk */}
            <mesh position={[-0.02, 0.19, 0.21]} rotation={[0.3, 0.1, -0.1]} castShadow>
              <capsuleGeometry args={[0.052, 0.15, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            {/* Right Front Bang Chunk */}
            <mesh position={[0.1, 0.18, 0.18]} rotation={[0.4, 0.3, 0.45]} castShadow>
              <capsuleGeometry args={[0.052, 0.13, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>

            {/* Sideburns Framing Face */}
            <mesh position={[-0.23, 0.02, 0.11]} rotation={[0.2, 0, -0.15]} castShadow>
              <capsuleGeometry args={[0.035, 0.11, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.23, 0.02, 0.11]} rotation={[0.2, 0, 0.15]} castShadow>
              <capsuleGeometry args={[0.035, 0.11, 8, 8]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>

            {/* ================= 6. PROTECTIVE GOGGLES ON FOREHEAD ================= */}
            {/* Goggles resting high on forehead with dark strap around head (Matching Reference) */}
            <group position={[0, 0.18, 0.15]} rotation={[0.22, 0, 0]}>
              {/* White Protective Frame (Rounded Outer Rim) */}
              <mesh castShadow>
                <boxGeometry args={[0.32, 0.13, 0.08]} />
                <meshStandardMaterial color={goggleFrameWhite} roughness={0.25} />
              </mesh>

              {/* Visor Cutout / Transparent Glass Lens */}
              <mesh position={[0, 0, 0.025]}>
                <boxGeometry args={[0.27, 0.09, 0.05]} />
                <meshPhysicalMaterial 
                  color={goggleLensColor}
                  transmission={0.4}
                  transparent
                  opacity={0.65}
                  roughness={0.08}
                  metalness={0.1}
                  reflectivity={0.9}
                  clearcoat={1.0}
                  clearcoatRoughness={0.1}
                />
              </mesh>

              {/* Dark Charcoal Head Strap (Wrapping horizontally around back of head) */}
              {/* Left Temple Strap */}
              <mesh position={[-0.17, -0.02, -0.14]} rotation={[0, -0.25, 0]}>
                <boxGeometry args={[0.03, 0.045, 0.28]} />
                <meshStandardMaterial color={goggleStrapColor} roughness={0.8} />
              </mesh>
              {/* Right Temple Strap */}
              <mesh position={[0.17, -0.02, -0.14]} rotation={[0, 0.25, 0]}>
                <boxGeometry args={[0.03, 0.045, 0.28]} />
                <meshStandardMaterial color={goggleStrapColor} roughness={0.8} />
              </mesh>
              {/* Back Head Strap */}
              <mesh position={[0, -0.05, -0.27]}>
                <boxGeometry args={[0.32, 0.045, 0.03]} />
                <meshStandardMaterial color={goggleStrapColor} roughness={0.8} />
              </mesh>
            </group>

            {/* Optional Surgical Mask (When player equips mask) */}
            {hasMask && (
              <group position={[0, -0.06, 0.23]}>
                <mesh castShadow>
                  <boxGeometry args={[0.22, 0.12, 0.06]} />
                  <meshStandardMaterial color="#38BDF8" roughness={0.6} />
                </mesh>
                {/* Nose clip */}
                <mesh position={[0, 0.055, 0.03]}>
                  <boxGeometry args={[0.12, 0.015, 0.01]} />
                  <meshStandardMaterial color="#94A3B8" metalness={0.8} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
