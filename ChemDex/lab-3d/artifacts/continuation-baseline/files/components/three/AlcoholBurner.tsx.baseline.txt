import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { ProceduralFlame } from '../../vfx/materials/flame';
import { useQualityStore } from '../../vfx/quality';
import { labSound } from '../../utils/audio';

interface AlcoholBurnerProps {
  id: string;
  position: [number, number, number];
  isOn: boolean;
  intensity: number;
}

// High-clarity borosilicate glass material for the alcohol lamp reservoir
const burnerGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#f8fafc',
  transmission: 0.88,
  opacity: 1,
  transparent: true,
  roughness: 0.1,
  ior: 1.5,
  thickness: 0.35,
  specularIntensity: 1.0,
  clearcoat: 0.8,
  depthWrite: false,
});

// Alcohol liquid material (pale clear ethanol 96°)
const ethanolLiquidMaterial = new THREE.MeshStandardMaterial({
  color: '#e0f2fe',
  transparent: true,
  opacity: 0.65,
  roughness: 0.12,
  metalness: 0.05,
  depthWrite: false,
});

export const AlcoholBurner = React.memo(function AlcoholBurner({
  id,
  position,
  isOn,
  intensity = 3,
}: AlcoholBurnerProps) {
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const moveMode = useAppStore(state => state.moveMode);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const toggleBurner = useAppStore(state => state.toggleBurner);
  const setBurnerIntensity = useAppStore(state => state.setBurnerIntensity);
  const burner = useAppStore(state => state.burners[id]);

  const [isHovered, setIsHovered] = useState(false);

  const gauzeRef = useRef<THREE.Mesh>(null);
  const liquidRef = useRef<THREE.Mesh>(null);

  // Fuel level calculations
  const fuelLevel = burner?.fuelLevel_ml ?? 120;
  const maxFuel = burner?.maxFuel_ml ?? 150;
  const fuelFraction = Math.max(0.05, Math.min(1.0, fuelLevel / maxFuel));

  // Determine physical flame state
  const flameState = burner?.flameState || (isOn ? (intensity === 1 ? 'LOW_FLAME' : (intensity >= 4 ? 'HIGH_FLAME' : 'MEDIUM_FLAME')) : 'UNLIT');
  const isFlameActive = isOn && fuelLevel > 0;

  // Real-time reservoir update
  useFrame(() => {
    // Dynamic liquid fuel reservoir level in glass lamp
    if (liquidRef.current) {
      const targetY = 0.12 + 0.28 * fuelFraction;
      const targetScaleY = fuelFraction;
      liquidRef.current.position.y = targetY;
      liquidRef.current.scale.y = Math.max(0.05, targetScaleY);
    }
  });

  const renderPos: [number, number, number] = isDragging
    ? [position[0], position[1] + 0.35, position[2]]
    : position;

  return (
    <group
      position={renderPos}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = moveMode ? 'grab' : 'pointer';
      }}
      onPointerOut={() => {
        setIsHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onPointerDown={(e) => {
        if (moveMode) {
          e.stopPropagation();
          setDraggingVesselId(id);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!moveMode) {
          // Direct physical click toggles burner ignition / snuffing
          toggleBurner(id);
        }
      }}
    >
      {/* Subtle hover highlight ring on table without blocking UI */}
      {isHovered && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.78, 32]} />
          <meshBasicMaterial color={isFlameActive ? '#f59e0b' : '#38bdf8'} transparent opacity={0.4} />
        </mesh>
      )}

      {/* ============================================================ */}
      {/* 1. STAINLESS STEEL TRIPOD STAND WITH CERAMIC WIRE GAUZE     */}
      {/* ============================================================ */}
      <group position={[0, 0, 0]}>
        {/* Top Triangular/Circular Steel Ring */}
        <mesh position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.7, 0.04, 16, 32]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>

        {/* Wire Gauze Mesh Platform */}
        <mesh position={[0, 1.48, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.3, 1.3]} />
          <meshStandardMaterial
            color="#94a3b8"
            roughness={0.6}
            metalness={0.7}
            wireframe={true}
          />
        </mesh>

        {/* Ceramic Thermal Diffuser Center (Lưới amiăng tản nhiệt) */}
        <mesh ref={gauzeRef} position={[0, 1.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 32]} />
          <meshStandardMaterial
            color={isFlameActive ? '#ffedd5' : '#f8fafc'}
            emissive={isFlameActive ? '#ea580c' : '#000000'}
            emissiveIntensity={isFlameActive ? 0.45 * (intensity / 3) : 0}
            roughness={0.9}
          />
        </mesh>

        {/* Tripod Legs (3 Stainless Steel Rods) */}
        {[-Math.PI / 6, Math.PI / 2, (7 * Math.PI) / 6].map((angle, i) => {
          const r = 0.62;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          return (
            <group key={i} position={[x, 0.7, z]}>
              <mesh
                rotation={[
                  -Math.sin(angle) * 0.12,
                  0,
                  Math.cos(angle) * 0.12
                ]}
                castShadow
              >
                <cylinderGeometry args={[0.04, 0.045, 1.55, 16]} />
                <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.85} />
              </mesh>
              {/* Rubber foot pad */}
              <mesh position={[0, -0.78, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.05, 16]} />
                <meshStandardMaterial color="#1e293b" roughness={0.9} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ============================================================ */}
      {/* 2. AUTHENTIC GLASS ALCOHOL BURNER VESSEL (ĐÈN CỒN THỦY TINH) */}
      {/* ============================================================ */}
      <group position={[0, 0, 0]}>
        {/* Glass Base Foot Ring for anti-tip stability */}
        <mesh position={[0, 0.03, 0]} material={burnerGlassMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.62, 0.06, 32]} />
        </mesh>

        {/* Conical/Spherical Borosilicate Flask Body */}
        <mesh position={[0, 0.35, 0]} material={burnerGlassMaterial} castShadow>
          <sphereGeometry args={[0.52, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.85]} />
        </mesh>

        {/* Liquid Ethanol inside burner with dynamic fuel level */}
        <mesh ref={liquidRef} position={[0, 0.28, 0]} material={ethanolLiquidMaterial}>
          <cylinderGeometry args={[0.44, 0.48, 0.42, 24]} />
        </mesh>

        {/* Brass / Collar Neck */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.12, 24]} />
          <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.85} />
        </mesh>

        {/* Ceramic Wick Holder Bushing */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.14, 0.09, 24]} />
          <meshStandardMaterial 
            color="#e2e8f0" 
            emissive={isHovered ? '#38bdf8' : '#000000'}
            emissiveIntensity={isHovered ? 0.2 : 0}
            roughness={0.6} 
            metalness={0.1} 
          />
        </mesh>

        {/* Braided Cotton Wick */}
        <mesh position={[0, 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
          <meshStandardMaterial
            color={isFlameActive ? '#1e293b' : '#f1f5f9'}
            emissive={isFlameActive ? '#ea580c' : '#000000'}
            emissiveIntensity={isFlameActive ? 0.8 : 0}
            roughness={0.8}
          />
        </mesh>

        {/* Submerged Wick inside ethanol reservoir */}
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.55, 12]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>

        {/* ======================================================== */}
        {/* 3. SAFETY SNUFFER CAP                                     */}
        {/* ======================================================== */}
        {!isFlameActive ? (
          // Cap is ON the burner: Snuffs flame
          <group 
            position={[0, 0.86, 0]}
            onClick={(e) => {
              e.stopPropagation();
              toggleBurner(id);
            }}
          >
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.15, 0.28, 24]} />
              <meshPhysicalMaterial
                color="#f8fafc"
                roughness={0.2}
                metalness={0.2}
                clearcoat={0.6}
              />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <sphereGeometry args={[0.065, 16, 16]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        ) : (
          // Cap is OFF: Resting safely on bench surface beside burner
          <group 
            position={[0.75, 0.08, 0.35]} 
            rotation={[0, 0.4, 0]}
            onClick={(e) => {
              e.stopPropagation();
              toggleBurner(id);
            }}
          >
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.15, 0.28, 24]} />
              <meshPhysicalMaterial
                color="#f8fafc"
                roughness={0.2}
                metalness={0.2}
                clearcoat={0.6}
              />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <sphereGeometry args={[0.065, 16, 16]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        )}

        {/* ======================================================== */}
        {/* 4. MULTI-LAYER REALISTIC ALCOHOL FLAME                   */}
        {/* ======================================================== */}
        {isFlameActive && (
          <ProceduralFlame intensity={intensity} position={[0, 0.88, 0]} />
        )}
      </group>
    </group>
  );
});

export default AlcoholBurner;
