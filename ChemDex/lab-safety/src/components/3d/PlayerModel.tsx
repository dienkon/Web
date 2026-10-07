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

export const PlayerModel: React.FC<PlayerModelProps> = ({ position, rotationY, isMoving: propIsMoving, player: propPlayer }) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const storePlayer = useStore(s => s.player);
  const character = useStore(s => s.character);
  const player = propPlayer || storePlayer;
  
  // Animation refs
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const hairTieRef = useRef<THREE.Group>(null);

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
      rootGroupRef.current.rotation.y = rotationY !== undefined ? rotationY : playerCoords.rotationY;
    }

    const t = state.clock.getElapsedTime();
    const isMoving = propIsMoving !== undefined ? propIsMoving : playerCoords.isMoving;
    
    if (isMoving) {
      // Swing legs
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * 12) * 0.5;
      
      // Swing arms
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * 12) * 0.5;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * 12) * 0.5;
      
      // Bob body slightly
      if (modelRef.current) {
        modelRef.current.position.y = Math.abs(Math.sin(t * 24)) * 0.05;
      }
    } else {
      // Idle breathing animation
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 2) * 0.05;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 2) * 0.05;
      
      if (modelRef.current) {
        modelRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2) * 0.01;
      }
    }
    
    // Override arm poses if holding tools or trash
    if (player.hasSweeper) {
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -Math.PI / 2.5;
        leftArmRef.current.rotation.z = Math.PI / 8;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -Math.PI / 3;
        rightArmRef.current.rotation.z = -Math.PI / 8;
      }
    } else if (player.isHoldingTrash) {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -Math.PI / 2;
      }
    }
  });

  const skinColor = character.skinTone || '#f7d3ba';
  const hairColor = character.hairColor || '#2b1d0c';
  const shirtColor = character.shirtColor || '#0ea5b7';

  return (
    <group ref={rootGroupRef}>
      <group ref={modelRef}>
        {/* Floating/Carried Trash indicator banner */}
        {player.isHoldingTrash && (
          <group position={[0, 1.9, 0]}>
            <Html center>
              <div className="bg-purple-600/95 backdrop-blur-sm text-white font-black text-[9px] px-2.5 py-1.5 rounded-xl shadow-lg border border-purple-400 whitespace-nowrap animate-bounce select-none flex items-center gap-1.5">
                <span className="text-sm">☣️</span> ĐANG CẦM RÁC HOÁ CHẤT
              </div>
            </Html>
          </group>
        )}

        {/* Head */}
        <mesh position={[0, 1.45, 0]} castShadow>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color={skinColor} roughness={0.4} /> {/* skin */}
        </mesh>

        {/* Eyes / Face Details */}
        <group position={[0, 1.45, 0.15]}>
          {/* Eyes */}
          <mesh position={[-0.07, 0.03, 0.04]} castShadow>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.07, 0.03, 0.04]} castShadow>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          
          {/* Smile */}
          <mesh position={[0, -0.05, 0.04]} rotation={[0.2, 0, 0]}>
            <torusGeometry args={[0.03, 0.008, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#e11d48" />
          </mesh>
        </group>

        {/* Goggles (Conditional render) */}
        {player.hasGoggles && (
          <group position={[0, 1.48, 0.14]}>
            {/* Cyan lenses */}
            <mesh position={[-0.07, 0, 0.05]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.02]} />
              <meshStandardMaterial color="#22d3ee" opacity={0.65} transparent roughness={0.1} metalness={0.2} />
            </mesh>
            <mesh position={[0.07, 0, 0.05]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.02]} />
              <meshStandardMaterial color="#22d3ee" opacity={0.65} transparent roughness={0.1} metalness={0.2} />
            </mesh>
            {/* Lense Reflective Highlights */}
            <mesh position={[-0.05, 0.015, 0.062]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.015, 0.03, 0.001]} />
              <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
            </mesh>
            <mesh position={[0.09, 0.015, 0.062]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.015, 0.03, 0.001]} />
              <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
            </mesh>
            {/* Goggles Frame - Bold Professional Look */}
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[0.22, 0.08, 0.03]} />
              <meshStandardMaterial color="#0e7490" roughness={0.4} metalness={0.1} />
            </mesh>
            {/* High-visibility safety-yellow frame accents */}
            <mesh position={[0, 0.041, 0.042]}>
              <boxGeometry args={[0.23, 0.012, 0.028]} />
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.2} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.041, 0.042]}>
              <boxGeometry args={[0.23, 0.012, 0.028]} />
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.2} roughness={0.5} />
            </mesh>
            {/* Chemical splash side guards */}
            <mesh position={[-0.11, 0, 0.02]} rotation={[0, -Math.PI / 4, 0]}>
              <boxGeometry args={[0.02, 0.078, 0.05]} />
              <meshStandardMaterial color="#ffffff" opacity={0.4} transparent roughness={0.3} />
            </mesh>
            <mesh position={[0.11, 0, 0.02]} rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[0.02, 0.078, 0.05]} />
              <meshStandardMaterial color="#ffffff" opacity={0.4} transparent roughness={0.3} />
            </mesh>
            {/* Inner Dark Rim */}
            <mesh position={[0, 0, 0.035]}>
              <boxGeometry args={[0.23, 0.085, 0.01]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
            {/* Strap around head */}
            <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.015, 8, 32]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        )}

        {/* Industrial Respirator Mask (Conditional render) */}
        {player.hasMask && (
          <group position={[0, 1.36, 0.13]}>
            {/* Main mask seal wedge covering mouth and nose */}
            <mesh castShadow position={[0, 0, 0.02]}>
              <boxGeometry args={[0.15, 0.12, 0.07]} />
              <meshStandardMaterial color="#334155" roughness={0.8} /> {/* Dark Slate Face Seal */}
            </mesh>
            {/* Central inhalation/exhalation valve */}
            <mesh position={[0, -0.02, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 0.015, 16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.02, 0.068]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.002, 16]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} /> {/* Red accents */}
            </mesh>
            {/* Dual Chemical Filter Canisters - Left */}
            <group position={[-0.08, -0.02, 0.04]} rotation={[0, -0.5, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.7} /> {/* Gold Filters */}
              </mesh>
              {/* 3M safety stripe label detail */}
              <mesh position={[0, 0, 0.001]}>
                <cylinderGeometry args={[0.036, 0.036, 0.01, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0, 0.001]}>
                <cylinderGeometry args={[0.037, 0.037, 0.004, 16]} />
                <meshStandardMaterial color="#ef4444" roughness={0.4} /> {/* Active gas absorption indicator */}
              </mesh>
              <mesh position={[0, 0.021, 0]}>
                <cylinderGeometry args={[0.037, 0.037, 0.005, 16]} />
                <meshStandardMaterial color="#1e293b" roughness={0.7} />
              </mesh>
            </group>
            {/* Dual Chemical Filter Canisters - Right */}
            <group position={[0.08, -0.02, 0.04]} rotation={[0, 0.5, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.7} />
              </mesh>
              {/* 3M safety stripe label detail */}
              <mesh position={[0, 0, 0.001]}>
                <cylinderGeometry args={[0.036, 0.036, 0.01, 16]} />
                <meshStandardMaterial color="#ffffff" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0, 0.001]}>
                <cylinderGeometry args={[0.037, 0.037, 0.004, 16]} />
                <meshStandardMaterial color="#ef4444" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.021, 0]}>
                <cylinderGeometry args={[0.037, 0.037, 0.005, 16]} />
                <meshStandardMaterial color="#1e293b" roughness={0.7} />
              </mesh>
            </group>
            {/* Elastic Face Harness Straps around ears/neck */}
            <mesh position={[-0.09, 0, -0.04]} rotation={[0, -0.2, 0]}>
              <boxGeometry args={[0.008, 0.015, 0.12]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0.09, 0, -0.04]} rotation={[0, 0.2, 0]}>
              <boxGeometry args={[0.008, 0.015, 0.12]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        )}

        {/* Hair Styles (Handsome Male Style) */}
        {player.hairTied ? (
          /* Neat Male Hair: Styled back with a black safety headband */
          <group position={[0, 1.45, 0]}>
            {/* Base Hair on Head */}
            <mesh position={[0, 0.06, -0.01]} castShadow>
              <sphereGeometry args={[0.21, 32, 32]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Front Fringe (Neat, combed back/up) */}
            <mesh position={[0, 0.18, 0.08]} rotation={[-0.3, 0, 0]} castShadow>
              <boxGeometry args={[0.18, 0.06, 0.12]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Sporty Headband / Hair band for safety */}
            <mesh position={[0, 0.08, 0.05]} rotation={[0.2, 0, 0]} castShadow>
              <torusGeometry args={[0.21, 0.02, 8, 32]} />
              <meshStandardMaterial color="#ef4444" emissive="#b91c1c" emissiveIntensity={0.2} /> {/* Red Safety Headband */}
            </mesh>
          </group>
        ) : (
          /* Default Handsome Male Hair: Slightly fluffy/messy short hair with a modern fringe */
          <group position={[0, 1.45, 0]}>
            {/* Base Hair */}
            <mesh position={[0, 0.06, -0.01]} castShadow>
              <sphereGeometry args={[0.21, 32, 32]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Fluffy Front Fringe/Bangs */}
            <mesh position={[0, 0.15, 0.12]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.2, 0.1, 0.1]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Cool hair spikes/fluff on top */}
            <mesh position={[0, 0.22, 0.02]} rotation={[0.1, 0.1, 0]} castShadow>
              <boxGeometry args={[0.14, 0.08, 0.14]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            {/* Neat short sideburns */}
            <mesh position={[-0.19, 0.02, 0.05]} castShadow>
              <boxGeometry args={[0.03, 0.12, 0.05]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
            <mesh position={[0.19, 0.02, 0.05]} castShadow>
              <boxGeometry args={[0.03, 0.12, 0.05]} />
              <meshStandardMaterial color={hairColor} roughness={0.85} />
            </mesh>
          </group>
        )}

        {/* Torso: Shirt or Lab Coat */}
        {player.hasLabCoat ? (
          /* Lab Coat Torso (White, premium boxy style) */
          <group position={[0, 0.85, 0]}>
            {/* Main Lab Coat Outer Shell */}
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.22, 0.7, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.8} /> {/* White Coat */}
            </mesh>
            {/* Left Collar Lapel */}
            <mesh position={[-0.08, 0.22, 0.16]} rotation={[0, 0.2, -0.2]} castShadow>
              <boxGeometry args={[0.04, 0.16, 0.02]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.7} />
            </mesh>
            {/* Right Collar Lapel */}
            <mesh position={[0.08, 0.22, 0.16]} rotation={[0, -0.2, 0.2]} castShadow>
              <boxGeometry args={[0.04, 0.16, 0.02]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.7} />
            </mesh>
            {/* Breast Pocket on Left Chest */}
            <group position={[0.09, 0.05, 0.16]} rotation={[0, 0.3, 0]}>
              {/* Pocket body */}
              <mesh castShadow>
                <boxGeometry args={[0.07, 0.09, 0.01]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
              </mesh>
              {/* Blue Pen clipped inside pocket */}
              <mesh position={[-0.015, 0.04, 0.008]} castShadow>
                <cylinderGeometry args={[0.005, 0.005, 0.04, 8]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.3} /> {/* Navy Blue Pen */}
              </mesh>
              <mesh position={[-0.015, 0.02, 0.012]} castShadow>
                <boxGeometry args={[0.002, 0.02, 0.004]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.8} /> {/* Silver Pen Clip */}
              </mesh>
              {/* Student Researcher ID Badge */}
              <group position={[0.02, 0.01, 0.008]} rotation={[0, 0, -0.05]}>
                <mesh castShadow>
                  <boxGeometry args={[0.03, 0.045, 0.004]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.5} />
                </mesh>
                {/* ID photo placeholder */}
                <mesh position={[0, 0.01, 0.003]}>
                  <planeGeometry args={[0.02, 0.018]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                {/* Green safety clip */}
                <mesh position={[0, 0.026, -0.002]}>
                  <boxGeometry args={[0.01, 0.01, 0.01]} />
                  <meshStandardMaterial color="#22c55e" />
                </mesh>
              </group>
            </group>
            {/* Inner Shirt Detail visible at Collar */}
            <mesh position={[0, 0.25, 0.15]} rotation={[0, 0, 0]}>
              <planeGeometry args={[0.1, 0.2]} />
              <meshStandardMaterial color="#0284c7" /> {/* Blue school shirt */}
            </mesh>
            {/* Red school tie */}
            <mesh position={[0, 0.2, 0.151]}>
              <planeGeometry args={[0.03, 0.15]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            {/* Buttoned lab coat seam */}
            <mesh position={[0, 0, 0.19]}>
              <boxGeometry args={[0.01, 0.5, 0.01]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            {/* Small shiny silver buttons */}
            <mesh position={[0, 0.1, 0.195]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.1, 0.195]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ) : (
          /* Standard School uniform Shirt (Blue/white) */
          <mesh position={[0, 0.85, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.7, 16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.6} />
          </mesh>
        )}

        {/* Arms and Hands */}
        {/* Left Arm */}
        <mesh 
          ref={leftArmRef} 
          position={[-0.26, 0.95, 0]} 
          rotation={[0, 0, 0.15]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.05, 0.45, 16]} />
          <meshStandardMaterial color={player.hasLabCoat ? "#ffffff" : shirtColor} roughness={0.8} />
          
          {/* Hand / Glove */}
          <group position={[0, -0.25, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial 
                color={player.hasGloves ? "#22d3ee" : skinColor} 
                roughness={player.hasGloves ? 0.3 : 0.6} 
              />
            </mesh>
            {/* Glove safety cuff extending up the forearm */}
            {player.hasGloves && (
              <mesh position={[0, 0.08, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.052, 0.12, 16]} />
                <meshStandardMaterial color="#22d3ee" roughness={0.4} />
              </mesh>
            )}

            {/* HIGHLY DETAILED DUSTPAN (Đồ hốt rác on Left Hand) */}
            {player.hasSweeper && (
              <group position={[0, -0.05, 0.1]} rotation={[Math.PI / 6, 0, 0]}>
                {/* Dustpan Handle */}
                <mesh castShadow position={[0, 0.08, -0.05]} rotation={[-Math.PI / 4, 0, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
                  <meshStandardMaterial color="#475569" roughness={0.5} />
                </mesh>
                {/* Dustpan Base Scoop */}
                <mesh castShadow position={[0, -0.05, 0.1]}>
                  <boxGeometry args={[0.22, 0.02, 0.22]} />
                  <meshStandardMaterial color="#0284c7" roughness={0.4} />
                </mesh>
                {/* Dustpan Left Wall */}
                <mesh castShadow position={[-0.11, -0.01, 0.1]}>
                  <boxGeometry args={[0.02, 0.06, 0.22]} />
                  <meshStandardMaterial color="#0369a1" roughness={0.4} />
                </mesh>
                {/* Dustpan Right Wall */}
                <mesh castShadow position={[0.11, -0.01, 0.1]}>
                  <boxGeometry args={[0.02, 0.06, 0.22]} />
                  <meshStandardMaterial color="#0369a1" roughness={0.4} />
                </mesh>
                {/* Dustpan Back Wall */}
                <mesh castShadow position={[0, -0.01, -0.01]}>
                  <boxGeometry args={[0.22, 0.06, 0.02]} />
                  <meshStandardMaterial color="#0369a1" roughness={0.4} />
                </mesh>

                {/* If holding trash AND has sweeper, the chemical trash piece sits directly on the scoop! */}
                {player.isHoldingTrash && (
                  <>
                    {(!player.heldTrashType || player.heldTrashType === 'chemical') && (
                      <mesh position={[0, 0.05, 0.08]} castShadow>
                        <dodecahedronGeometry args={[0.06]} />
                        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.8} roughness={0.2} />
                      </mesh>
                    )}
                    {player.heldTrashType === 'domestic' && (
                      <mesh position={[0, 0.05, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                        <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
                        <meshStandardMaterial color="#94a3b8" roughness={0.3} opacity={0.7} transparent />
                      </mesh>
                    )}
                    {player.heldTrashType === 'sharps' && (
                      <mesh position={[0, 0.05, 0.08]} rotation={[0, 0, Math.PI / 4]} castShadow>
                        <cylinderGeometry args={[0.015, 0.01, 0.1, 6]} />
                        <meshStandardMaterial color="#cbd5e1" roughness={0.1} opacity={0.9} transparent />
                      </mesh>
                    )}
                  </>
                )}
              </group>
            )}
          </group>
        </mesh>

        {/* Right Arm */}
        <mesh 
          ref={rightArmRef} 
          position={[0.26, 0.95, 0]} 
          rotation={[0, 0, -0.15]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.05, 0.45, 16]} />
          <meshStandardMaterial color={player.hasLabCoat ? "#ffffff" : shirtColor} roughness={0.8} />
          
          {/* Hand / Glove */}
          <group position={[0, -0.25, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial 
                color={player.hasGloves ? "#22d3ee" : skinColor} 
                roughness={player.hasGloves ? 0.3 : 0.6} 
              />
            </mesh>
            {/* Glove safety cuff extending up the forearm */}
            {player.hasGloves && (
              <mesh position={[0, 0.08, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.052, 0.12, 16]} />
                <meshStandardMaterial color="#22d3ee" roughness={0.4} />
              </mesh>
            )}

            {/* HIGHLY DETAILED BROOM (Chổi quét on Right Hand) */}
            {player.hasSweeper && (
              <group position={[0, -0.05, 0.1]} rotation={[Math.PI / 4, 0, -Math.PI / 12]}>
                {/* Broom Stick/Handle */}
                <mesh castShadow position={[0, 0.15, -0.05]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
                  <meshStandardMaterial color="#d97706" roughness={0.6} /> {/* Wooden stick */}
                </mesh>
                {/* Broom Connector Cap */}
                <mesh castShadow position={[0, -0.1, -0.05]}>
                  <cylinderGeometry args={[0.025, 0.02, 0.06, 8]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.4} />
                </mesh>
                {/* Broom Bristles */}
                <mesh castShadow position={[0, -0.16, -0.05]} rotation={[0, 0, 0]}>
                  <coneGeometry args={[0.06, 0.12, 8]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.8} /> {/* Yellow fibers */}
                </mesh>
              </group>
            )}

            {/* If holding trash but barehanded (no sweeper), trash piece sits in the right hand! */}
            {player.isHoldingTrash && !player.hasSweeper && (
              <>
                {(!player.heldTrashType || player.heldTrashType === 'chemical') && (
                  <mesh position={[0, -0.08, 0.05]} castShadow>
                    <dodecahedronGeometry args={[0.06]} />
                    <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.8} roughness={0.2} />
                  </mesh>
                )}
                {player.heldTrashType === 'domestic' && (
                  <mesh position={[0, -0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.03, 0.03, 0.1, 12]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.3} opacity={0.7} transparent />
                  </mesh>
                )}
                {player.heldTrashType === 'sharps' && (
                  <mesh position={[0, -0.08, 0.05]} rotation={[0, 0, Math.PI / 4]} castShadow>
                    <cylinderGeometry args={[0.015, 0.01, 0.1, 6]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.1} opacity={0.9} transparent />
                  </mesh>
                )}
              </>
            )}
          </group>
        </mesh>

        {/* Legs and Shoes */}
        {/* Left Leg */}
        <mesh 
          ref={leftLegRef} 
          position={[-0.1, 0.3, 0]} 
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} /> {/* Slate pants */}
          
          {/* Shoe / Feet */}
          <group position={[0, -0.28, 0.04]}>
            {player.hasClosedShoes ? (
              /* Highly detailed safety leather boot */
              <group>
                {/* Boot sole */}
                <mesh position={[0, -0.04, 0.01]} castShadow>
                  <boxGeometry args={[0.085, 0.02, 0.19]} />
                  <meshStandardMaterial color="#020617" roughness={0.9} />
                </mesh>
                {/* Boot main upper */}
                <mesh position={[0, -0.01, 0.01]} castShadow>
                  <boxGeometry args={[0.08, 0.06, 0.18]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.8} /> {/* Black Leather */}
                </mesh>
                {/* Boot steel toe curve */}
                <mesh position={[0, -0.01, 0.09]} castShadow>
                  <sphereGeometry args={[0.038, 16, 16]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.8} />
                </mesh>
                {/* Visual white laces */}
                <mesh position={[0, 0.022, 0.02]} rotation={[0, 0, 0]} castShadow>
                  <boxGeometry args={[0.03, 0.005, 0.06]} />
                  <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
                </mesh>
              </group>
            ) : (
              /* High hazard open sandals displaying vulnerable toes */
              <group>
                {/* Sandal Sole */}
                <mesh position={[0, -0.03, 0.01]} castShadow>
                  <boxGeometry args={[0.075, 0.015, 0.15]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} /> {/* Brown Sole */}
                </mesh>
                {/* Bare foot skin box */}
                <mesh position={[0, -0.01, 0.01]} castShadow>
                  <boxGeometry args={[0.07, 0.03, 0.14]} />
                  <meshStandardMaterial color="#fcd34d" roughness={0.6} />
                </mesh>
                {/* Exposed Toes (5 funny little spheres) */}
                <group position={[0, -0.01, 0.08]}>
                  <mesh position={[-0.024, 0, 0]} castShadow><sphereGeometry args={[0.012, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[-0.012, -0.002, 0]} castShadow><sphereGeometry args={[0.009, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[0, -0.003, 0]} castShadow><sphereGeometry args={[0.008, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[0.012, -0.004, 0]} castShadow><sphereGeometry args={[0.007, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[0.024, -0.005, 0]} castShadow><sphereGeometry args={[0.006, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                </group>
                {/* Criss-cross red plastic straps */}
                <mesh position={[0, 0.01, 0]} rotation={[0.2, 0, 0.3]} castShadow>
                  <boxGeometry args={[0.015, 0.004, 0.1]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.01, 0]} rotation={[0.2, 0, -0.3]} castShadow>
                  <boxGeometry args={[0.015, 0.004, 0.1]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.4} />
                </mesh>
              </group>
            )}
          </group>
        </mesh>

        {/* Right Leg */}
        <mesh 
          ref={rightLegRef} 
          position={[0.1, 0.3, 0]} 
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} /> {/* Slate pants */}
          
          {/* Shoe / Feet */}
          <group position={[0, -0.28, 0.04]}>
            {player.hasClosedShoes ? (
              /* Highly detailed safety leather boot */
              <group>
                {/* Boot sole */}
                <mesh position={[0, -0.04, 0.01]} castShadow>
                  <boxGeometry args={[0.085, 0.02, 0.19]} />
                  <meshStandardMaterial color="#020617" roughness={0.9} />
                </mesh>
                {/* Boot main upper */}
                <mesh position={[0, -0.01, 0.01]} castShadow>
                  <boxGeometry args={[0.08, 0.06, 0.18]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.8} />
                </mesh>
                {/* Boot steel toe curve */}
                <mesh position={[0, -0.01, 0.09]} castShadow>
                  <sphereGeometry args={[0.038, 16, 16]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.8} />
                </mesh>
                {/* Visual white laces */}
                <mesh position={[0, 0.022, 0.02]} rotation={[0, 0, 0]} castShadow>
                  <boxGeometry args={[0.03, 0.005, 0.06]} />
                  <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
                </mesh>
              </group>
            ) : (
              /* High hazard open sandals displaying vulnerable toes */
              <group>
                {/* Sandal Sole */}
                <mesh position={[0, -0.03, 0.01]} castShadow>
                  <boxGeometry args={[0.075, 0.015, 0.15]} />
                  <meshStandardMaterial color="#78350f" roughness={0.9} />
                </mesh>
                {/* Bare foot skin box */}
                <mesh position={[0, -0.01, 0.01]} castShadow>
                  <boxGeometry args={[0.07, 0.03, 0.14]} />
                  <meshStandardMaterial color="#fcd34d" roughness={0.6} />
                </mesh>
                {/* Exposed Toes (5 funny little spheres) */}
                <group position={[0, -0.01, 0.08]}>
                  <mesh position={[-0.024, 0, 0]} castShadow><sphereGeometry args={[0.012, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[-0.012, -0.002, 0]} castShadow><sphereGeometry args={[0.009, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[0, -0.003, 0]} castShadow><sphereGeometry args={[0.008, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[0.012, -0.004, 0]} castShadow><sphereGeometry args={[0.007, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                  <mesh position={[0.024, -0.005, 0]} castShadow><sphereGeometry args={[0.006, 8, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
                </group>
                {/* Criss-cross red plastic straps */}
                <mesh position={[0, 0.01, 0]} rotation={[0.2, 0, 0.3]} castShadow>
                  <boxGeometry args={[0.015, 0.004, 0.1]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.01, 0]} rotation={[0.2, 0, -0.3]} castShadow>
                  <boxGeometry args={[0.015, 0.004, 0.1]} />
                  <meshStandardMaterial color="#ef4444" roughness={0.4} />
                </mesh>
              </group>
            )}
          </group>
        </mesh>
      </group>
    </group>
  );
};
