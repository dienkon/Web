import React from 'react';

export const FumeHood: React.FC = () => {
  return (
    <group position={[4.3, 0, -3.7]}>
      {/* Outer steel frame: 1.8m W x 0.9m D x 2.4m H */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 2.4, 0.9]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
      </mesh>

      {/* Internal exhaust working chamber cavity: 1.6m W x 0.8m D x 1.3m H */}
      <mesh position={[0, 1.45, 0.05]}>
        <boxGeometry args={[1.6, 1.3, 0.75]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
      </mesh>

      {/* Chemical-resistant black epoxy floor basin */}
      <mesh position={[0, 0.82, 0.05]}>
        <boxGeometry args={[1.6, 0.04, 0.75]} />
        <meshStandardMaterial color="#0F172A" roughness={0.15} />
      </mesh>

      {/* Safety Glass Sliding Sash with aerodynamic airfoil */}
      <mesh position={[0, 1.5, 0.43]}>
        <boxGeometry args={[1.6, 0.7, 0.02]} />
        <meshPhysicalMaterial transparent opacity={0.35} roughness={0.05} color="#BAE6FD" />
      </mesh>

      {/* Sash Maximum Safe Height indicator marker (45cm mark) */}
      <mesh position={[0, 1.15, 0.44]}>
        <boxGeometry args={[1.6, 0.015, 0.005]} />
        <meshStandardMaterial color="#EF4444" />
      </mesh>

      {/* Airflow Control Panel with Green/Red status LEDs */}
      <group position={[0.75, 1.9, 0.46]}>
        <mesh>
          <boxGeometry args={[0.2, 0.15, 0.02]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Green airflow normal indicator */}
        <mesh position={[-0.04, 0.02, 0.015]}>
          <sphereGeometry args={[0.012]} />
          <meshStandardMaterial emissive="#22C55E" color="#4ADE80" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Interior LED lighting fixture */}
      <pointLight position={[0, 2.0, 0]} intensity={0.6} color="#F8FAFC" distance={3.0} />
    </group>
  );
};
