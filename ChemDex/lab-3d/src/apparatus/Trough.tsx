import React from 'react';
import * as THREE from 'three';

interface PneumaticTroughProps {
  position: [number, number, number];
  waterLevel?: number;
  invertedTubeVolume_ml?: number;
}

/**
 * PneumaticTrough Component (K6.4)
 * Traditional water displacement pneumatic trough with beehive shelf
 * and inverted graduated gas collection jar/tube.
 */
export const PneumaticTrough: React.FC<PneumaticTroughProps> = React.memo(function PneumaticTrough({
  position,
  waterLevel = 0.6,
  invertedTubeVolume_ml = 35
}) {
  return (
    <group position={position}>
      {/* Rectangular / Cylindrical Acrylic Water Basin */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[1.8, 0.6, 1.2]} />
        <meshPhysicalMaterial 
          color="#e0f2fe" 
          transmission={0.88} 
          roughness={0.08} 
          ior={1.49} 
          transparent 
          opacity={0.8} 
        />
      </mesh>

      {/* Internal Water Volume */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.72, 0.48, 1.12]} />
        <meshPhysicalMaterial 
          color="#38bdf8" 
          transmission={0.85} 
          roughness={0.05} 
          ior={1.33} 
          transparent 
          opacity={0.7} 
        />
      </mesh>

      {/* Beehive Shelf (Earthenware / Ceramic pedestal with hole) */}
      <group position={[-0.35, -0.15, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.35, 0.25, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        {/* Central hole for delivery tube end */}
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* Inverted Gas Collection Tube standing over beehive shelf hole */}
        <group position={[0, 0.9, 0]} rotation={[Math.PI, 0, 0]}>
          {/* Glass tube walls */}
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.12, 1.4, 20]} />
            <meshPhysicalMaterial 
              color="#f8fafc" 
              transmission={0.92} 
              roughness={0.08} 
              ior={1.48} 
              transparent 
            />
          </mesh>

          {/* Displaced Water Level inside inverted tube (water level drops as gas collects) */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.8, 16]} />
            <meshPhysicalMaterial 
              color="#38bdf8" 
              transmission={0.85} 
              roughness={0.05} 
              transparent 
              opacity={0.65} 
            />
          </mesh>
        </group>
      </group>
    </group>
  );
});
