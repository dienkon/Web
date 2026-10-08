import React, { useMemo, useEffect } from 'react';
import { Box, Cylinder, Sphere, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const TeacherFallbackModel: React.FC = () => {
  return (
    <>
      {/* Shoes - Left & Right */}
      <mesh position={[-0.14, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.1, 0.28]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.5} /> {/* Leather shoes */}
      </mesh>
      <mesh position={[0.14, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 0.1, 0.28]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.5} />
      </mesh>

      {/* Legs / Pants - Left & Right */}
      <mesh position={[-0.14, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.8, 16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.8} /> {/* Blue trousers */}
      </mesh>
      <mesh position={[0.14, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.8, 16]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
      </mesh>

      {/* Pelvis region */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.15, 0.25]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>

      {/* Body/Coat */}
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.29, 0.9, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} /> {/* White Lab Coat */}
      </mesh>

      {/* Shirt/Tie underneath */}
      <mesh position={[0, 1.62, 0.25]} castShadow receiveShadow>
        <planeGeometry args={[0.14, 0.25]} />
        <meshStandardMaterial color="#38bdf8" /> {/* Light blue Shirt */}
      </mesh>
      {/* Dark Red Tie */}
      <mesh position={[0, 1.55, 0.261]} castShadow receiveShadow>
        <planeGeometry args={[0.045, 0.24]} />
        <meshStandardMaterial color="#991b1b" />
      </mesh>

      {/* Coat Collar details (Visual overlap) */}
      <mesh position={[-0.12, 1.6, 0.22]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.18, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0.12, 1.6, 0.22]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.18, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#fcd34d" roughness={0.4} /> {/* Skin */}
      </mesh>

      {/* Detailed Black Glasses frames */}
      <group position={[0, 2.0, 0.21]}>
        {/* Bridge */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.02, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Lens frames */}
        <mesh position={[-0.09, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.09, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.09, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.09, 0.02]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Lenses glass */}
        <mesh position={[-0.09, 0, 0.011]}>
          <planeGeometry args={[0.1, 0.07]} />
          <meshStandardMaterial color="#0284c7" opacity={0.4} transparent roughness={0.1} />
        </mesh>
        <mesh position={[0.09, 0, 0.011]}>
          <planeGeometry args={[0.1, 0.07]} />
          <meshStandardMaterial color="#0284c7" opacity={0.4} transparent roughness={0.1} />
        </mesh>
      </group>

      {/* Hair block */}
      <mesh position={[0, 2.1, -0.04]} castShadow receiveShadow>
        <sphereGeometry args={[0.23, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3f2305" roughness={0.9} /> {/* Brown styled hair */}
      </mesh>
      {/* Hair sides locks */}
      <mesh position={[-0.18, 2.0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.12, 0.1]} />
        <meshStandardMaterial color="#3f2305" />
      </mesh>
      <mesh position={[0.18, 2.0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.12, 0.1]} />
        <meshStandardMaterial color="#3f2305" />
      </mesh>

      {/* Teacher's Arms with joint nodes */}
      {/* Left Arm holding clipboard */}
      <group position={[-0.34, 1.45, 0]}>
        {/* Shoulder */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Upper arm */}
        <mesh position={[-0.08, -0.2, 0.08]} rotation={[0.4, 0, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.06, 0.4, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Forearm bent forward */}
        <mesh position={[-0.12, -0.32, 0.28]} rotation={[-1.1, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.35, 16]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
        {/* Clipboard item */}
        <group position={[-0.15, -0.32, 0.44]} rotation={[0, -0.4, -0.2]}>
          {/* Clipboard wood */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.32, 0.015]} />
            <meshStandardMaterial color="#b45309" roughness={0.6} />
          </mesh>
          {/* White paper sheet */}
          <mesh position={[0, 0.02, 0.01]}>
            <planeGeometry args={[0.18, 0.26]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Metal clip */}
          <mesh position={[0, 0.13, 0.015]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.04, 0.02]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Right Arm waving or gesturing */}
      <group position={[0.34, 1.45, 0]}>
        {/* Shoulder */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0.08, -0.15, 0.04]} rotation={[-0.2, 0, 0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.065, 0.06, 0.4, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Forearm gesturing */}
        <mesh position={[0.14, -0.24, 0.22]} rotation={[-0.6, -0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.35, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* Right hand */}
        <mesh position={[0.18, -0.28, 0.34]} castShadow receiveShadow>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#fcd34d" />
        </mesh>
      </group>
    </>
  );
};

const TeacherGLTF: React.FC = () => {
  const { scene } = useGLTF('/teacher.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as any).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if ((child as any).material) {
          (child as any).material.roughness = 0.5;
          (child as any).material.metalness = 0.15;
        }
      }
    });
  }, [clonedScene]);

  return (
    <group position={[0, 0.42, 0]} rotation={[0, 0, 0]}>
      <primitive object={clonedScene} scale={1.2} />
    </group>
  );
};

class TeacherErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn("Failed to load teacher.glb model, using fallbacks", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const TeacherModel: React.FC = () => {
  return (
    <TeacherErrorBoundary fallback={<TeacherFallbackModel />}>
      <React.Suspense fallback={<TeacherFallbackModel />}>
        <TeacherGLTF />
      </React.Suspense>
    </TeacherErrorBoundary>
  );
};

try {
  useGLTF.preload('/teacher.glb');
} catch (e) {}

interface SideTableProps {
  position: [number, number, number];
}

export const SideTable: React.FC<SideTableProps> = ({ position }) => {
  return (
    <group position={position}>
      {/* Table Top */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.1, 1.2]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} metalness={0.1} /> {/* Sleek gray surface */}
      </mesh>
      {/* Under table wooden shelf */}
      <mesh castShadow receiveShadow position={[0, -0.3, 0]}>
        <boxGeometry args={[1.6, 0.04, 1.0]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      {/* Table Legs */}
      <mesh castShadow receiveShadow position={[-0.75, -0.45, -0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.75, -0.45, -0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.75, -0.45, 0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.75, -0.45, 0.45]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
    </group>
  );
};

