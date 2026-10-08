import React from 'react';

export const StorageCabinets: React.FC = () => {
  return (
    <group>
      {/* 1. Flammable Liquid Storage Cabinet (Yellow) at (+5.45, 0, -2.0) */}
      <group position={[5.45, 0, -2.0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.825, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 1.65, 0.6]} />
          <meshStandardMaterial color="#EAB308" roughness={0.3} metalness={0.2} /> {/* Safety yellow */}
        </mesh>
        {/* Flame warning label */}
        <mesh position={[0, 1.2, 0.31]}>
          <boxGeometry args={[0.3, 0.15, 0.01]} />
          <meshStandardMaterial color="#DC2626" />
        </mesh>
      </group>

      {/* 2. Acid Storage Cabinet (Blue/White, spill sump tray) at (+5.45, 0, -0.9) */}
      <group position={[5.45, 0, -0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.825, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 1.65, 0.6]} />
          <meshStandardMaterial color="#0284C7" roughness={0.4} metalness={0.2} /> {/* Acid blue */}
        </mesh>
        {/* Corrosive pictogram symbol */}
        <mesh position={[0, 1.2, 0.31]}>
          <boxGeometry args={[0.2, 0.2, 0.01]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* 3. Base/Alkali Storage Cabinet (Separate segregated unit) at (+5.45, 0, 0.2) */}
      <group position={[5.45, 0, 0.2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.825, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 1.65, 0.6]} />
          <meshStandardMaterial color="#0D9488" roughness={0.4} metalness={0.2} /> {/* Teal */}
        </mesh>
      </group>

      {/* 4. General 4-Tier Glassware Storage Shelf at (+5.55, 0, 1.4) */}
      <group position={[5.55, 0, 1.4]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Steel rack frame */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[0.9, 2.0, 0.4]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.6} wireframe />
        </mesh>
        {/* 4 horizontal shelves */}
        {[0.4, 0.8, 1.2, 1.6].map((shelfY, i) => (
          <mesh key={i} position={[0, shelfY, 0]}>
            <boxGeometry args={[0.88, 0.02, 0.38]} />
            <meshStandardMaterial color="#CBD5E1" roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
