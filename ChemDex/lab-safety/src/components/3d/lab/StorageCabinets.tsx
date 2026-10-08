import React from 'react';

export const StorageCabinets: React.FC = () => {
  return (
    <group>
      {/* 1. Flammable Liquid Storage Cabinet (Safety Yellow) at (+9.4, 0, -0.6) */}
      <group position={[9.4, 0, -0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 1.8, 0.65]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} metalness={0.3} />
        </mesh>
        {/* Dual Red Flame Diamond Warning Signs */}
        <mesh position={[0, 1.35, 0.33]}>
          <planeGeometry args={[0.35, 0.2]} />
          <meshStandardMaterial color="#DC2626" />
        </mesh>
        {/* "FLAMMABLE - KEEP FIRE AWAY" Plaque */}
        <mesh position={[0, 1.05, 0.33]}>
          <planeGeometry args={[0.5, 0.12]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      </group>

      {/* 2. Acid & Corrosives Storage Cabinet (Safety Blue) at (+9.4, 0, 0.6) */}
      <group position={[9.4, 0, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 1.8, 0.65]} />
          <meshStandardMaterial color="#0284C7" roughness={0.35} metalness={0.2} />
        </mesh>
        {/* Corrosive Warning Pictogram */}
        <mesh position={[0, 1.35, 0.33]}>
          <planeGeometry args={[0.25, 0.25]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* 3. Base & Alkali Storage Cabinet (Segregated Unit, Teal) at (+9.4, 0, 1.8) */}
      <group position={[9.4, 0, 1.8]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.1, 1.8, 0.65]} />
          <meshStandardMaterial color="#0D9488" roughness={0.35} metalness={0.2} />
        </mesh>
      </group>

      {/* 4. Heavy-Duty Reagent & Glassware Shelving Rack at (+9.5, 0, 3.2) */}
      <group position={[9.5, 0, 3.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[1.2, 2.2, 0.45]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.5} metalness={0.6} wireframe />
        </mesh>
        {[0.4, 0.85, 1.3, 1.75].map((shelfY, i) => (
          <mesh key={i} position={[0, shelfY, 0]}>
            <boxGeometry args={[1.18, 0.03, 0.43]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
