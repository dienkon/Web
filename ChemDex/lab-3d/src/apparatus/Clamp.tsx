import React from 'react';

interface RetortClampProps {
  position: [number, number, number];
  angle?: number;
  armLength?: number;
}

/**
 * RetortClamp Component (K6.1)
 * Cast bosshead screw clamp with rubberized jaws for holding flasks, condensers, or burettes.
 */
export const RetortClamp: React.FC<RetortClampProps> = React.memo(function RetortClamp({
  position,
  angle = 0,
  armLength = 0.55
}) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      {/* Bosshead clamp block */}
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Tightening screw handle */}
      <mesh position={[-0.06, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>

      {/* Extension Arm */}
      <mesh position={[armLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, armLength, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.85} />
      </mesh>

      {/* Rubber-coated clamp jaws */}
      <group position={[armLength, 0, 0]}>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.04]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.6} /> {/* Red cork/rubber lining */}
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.04]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
});
