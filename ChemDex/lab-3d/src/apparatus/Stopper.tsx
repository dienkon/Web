import React from 'react';

interface StopperProps {
  position: [number, number, number];
  holes?: 1 | 2;
  material?: 'rubber' | 'cork';
  hasDeliveryTube?: boolean;
}

/**
 * Laboratory Stopper Component (K6.3)
 * Conical rubber/cork stopper with precision glass delivery tube bend.
 */
export const Stopper: React.FC<StopperProps> = React.memo(function Stopper({
  position,
  holes = 1,
  material = 'rubber',
  hasDeliveryTube = true
}) {
  const stopperColor = material === 'rubber' ? '#1e293b' : '#d97706';

  return (
    <group position={position}>
      {/* Conical Stopper Body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.22, 16]} />
        <meshStandardMaterial 
          color={stopperColor} 
          roughness={material === 'rubber' ? 0.7 : 0.85} 
        />
      </mesh>

      {/* Bent Glass Delivery Tube Insertion */}
      {hasDeliveryTube && (
        <group position={[0, 0.1, 0]}>
          {/* Vertical stem protruding from stopper */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.36, 12]} />
            <meshPhysicalMaterial 
              color="#f8fafc" 
              transmission={0.9} 
              roughness={0.1} 
              ior={1.48} 
              transparent 
            />
          </mesh>

          {/* 90-degree Glass Bend Horizontal Arm */}
          <mesh position={[0.25, 0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 12]} />
            <meshPhysicalMaterial 
              color="#f8fafc" 
              transmission={0.9} 
              roughness={0.1} 
              ior={1.48} 
              transparent 
            />
          </mesh>
        </group>
      )}
    </group>
  );
});
