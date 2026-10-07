import React from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { ppeService } from '../safety/Ppe';

interface HandRigProps {
  position: [number, number, number];
  visible: boolean;
  gripKind?: string;
  tiltAngle?: number;
}

/**
 * HandRig Component (K1.1 & K1.2)
 * Renders stylized laboratory hand/glove pivot indicator at the grip anchor.
 */
export const HandRig: React.FC<HandRigProps> = React.memo(function HandRig({
  position,
  visible,
  gripKind = 'body',
  tiltAngle = 0
}) {
  const ppe = ppeService.getState();
  const hasGloves = ppe.gloves;

  if (!visible) return null;

  // Nitrile lab blue/cyan if wearing gloves, natural flesh tone if barehanded
  const handColor = hasGloves ? '#38bdf8' : '#fed7aa';
  const sleeveColor = ppe.labCoat ? '#f8fafc' : '#475569';

  return (
    <group position={position} rotation={[0, 0, -tiltAngle]}>
      {/* Ghost Pivot Sphere Indicator */}
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial 
          color={handColor} 
          roughness={0.4} 
          metalness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Grip Finger Ring / Stylized Tongs Grip */}
      {gripKind === 'tongs' ? (
        <group>
          {/* Metal Tongs Jaws */}
          <mesh position={[-0.12, 0, 0]}>
            <boxGeometry args={[0.2, 0.04, 0.05]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <boxGeometry args={[0.2, 0.04, 0.05]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ) : (
        <group>
          {/* Stylized Glove / Hand Cuff */}
          <mesh position={[0.25, 0.08, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.06, 0.08, 0.28, 12]} />
            <meshStandardMaterial color={handColor} roughness={0.5} />
          </mesh>

          {/* Sleeve of Lab Coat */}
          <mesh position={[0.42, 0.22, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.09, 0.1, 0.22, 12]} />
            <meshStandardMaterial color={sleeveColor} roughness={0.7} />
          </mesh>
        </group>
      )}
    </group>
  );
});
