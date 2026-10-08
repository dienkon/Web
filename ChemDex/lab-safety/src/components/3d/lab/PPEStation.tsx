import React from 'react';

export const PPEStation: React.FC = () => {
  return (
    <group position={[-3.0, 0, 7.1]}>
      {/* Heavy Stainless Steel & Epoxy Locker Bank: 3.0m W x 0.55m D x 2.1m H */}
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.55, 2.1]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.25} roughness={0.4} />
      </mesh>

      {/* Internal Display Cavity */}
      <mesh position={[0, 1.05, -0.06]}>
        <boxGeometry args={[2.9, 0.48, 1.95]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.6} />
      </mesh>

      {/* 1. Left Section: Lab Coats on Stainless Hanger Rail */}
      <group position={[-1.0, 1.35, -0.05]}>
        {/* Rail */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.8]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} />
        </mesh>
        {/* Hanging Clean White Lab Coats */}
        {[-0.25, 0, 0.25].map((cx, i) => (
          <group key={i} position={[cx, -0.4, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.18, 0.2, 0.75]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 2. Middle Section: UV Disinfection Goggles Cabinet */}
      <group position={[0, 1.25, 0.16]}>
        {/* Acrylic Display Stand */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.8, 0.35, 0.03]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.7} />
        </mesh>
        {/* 3 Pairs of Professional Safety Goggles */}
        {[-0.26, 0, 0.26].map((gx, idx) => (
          <group key={idx} position={[gx, 0.06, 0]}>
            <mesh>
              <boxGeometry args={[0.18, 0.09, 0.06]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <boxGeometry args={[0.16, 0.07, 0.04]} />
              <meshPhysicalMaterial transparent opacity={0.6} roughness={0.08} color="#38BDF8" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. Right Section: Nitrile Gloves Dispensers (S / M / L) */}
      <group position={[0.95, 1.25, 0.16]}>
        {/* Small (Blue) */}
        <mesh position={[-0.2, 0.05, 0]}>
          <boxGeometry args={[0.14, 0.24, 0.08]} />
          <meshStandardMaterial color="#0284C7" roughness={0.4} />
        </mesh>
        {/* Medium (Purple) */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.14, 0.24, 0.08]} />
          <meshStandardMaterial color="#7C3AED" roughness={0.4} />
        </mesh>
        {/* Large (Cyan) */}
        <mesh position={[0.2, 0.05, 0]}>
          <boxGeometry args={[0.14, 0.24, 0.08]} />
          <meshStandardMaterial color="#06B6D4" roughness={0.4} />
        </mesh>
      </group>

      {/* 4. Lower Shelf: Face Masks & Hair Ties Dispensers */}
      <group position={[0.5, 0.65, 0.16]}>
        <mesh position={[-0.2, 0, 0]}>
          <boxGeometry args={[0.26, 0.16, 0.12]} />
          <meshStandardMaterial color="#38BDF8" roughness={0.5} />
        </mesh>
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.14, 0.1]} />
          <meshStandardMaterial color="#EC4899" roughness={0.5} />
        </mesh>
      </group>

      {/* Full-Length Dressing Mirror on Wall Adjacent to PPE */}
      <group position={[0, 1.5, 0.28]}>
        <mesh>
          <boxGeometry args={[1.2, 0.03, 1.1]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <planeGeometry args={[1.14, 1.04]} />
          <meshStandardMaterial color="#DCE3EA" metalness={0.96} roughness={0.04} />
        </mesh>
      </group>
    </group>
  );
};
