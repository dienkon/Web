import React from 'react';

export const FumeHood: React.FC = () => {
  return (
    <group position={[8.8, 0, -3.5]}>
      {/* Heavy Steel Dual-Chamber Industrial Chemical Fume Hood (2.4m W x 1.1m D x 2.6m H) */}
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 2.6, 1.1]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.35} metalness={0.2} />
      </mesh>

      {/* Internal Working Chamber Cavity */}
      <mesh position={[0, 1.55, 0.05]}>
        <boxGeometry args={[2.2, 1.45, 0.95]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} />
      </mesh>

      {/* Chemical-Resistant Dished Black Epoxy Work Surface */}
      <mesh position={[0, 0.84, 0.05]}>
        <boxGeometry args={[2.2, 0.06, 0.95]} />
        <meshStandardMaterial color="#0F172A" roughness={0.15} />
      </mesh>

      {/* Sash Maximum Operating Height Line (Red 45cm Indicator) */}
      <mesh position={[0, 1.28, 0.54]}>
        <boxGeometry args={[2.18, 0.015, 0.005]} />
        <meshStandardMaterial color="#EF4444" />
      </mesh>

      {/* Digital Airflow Velocity Monitor & Alarm Panel */}
      <group position={[1.0, 2.1, 0.56]}>
        <mesh>
          <boxGeometry args={[0.26, 0.18, 0.03]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
        {/* Digital Green Face Velocity Readout (100 FPM) */}
        <mesh position={[0, 0.03, 0.02]}>
          <planeGeometry args={[0.18, 0.06]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        {/* Status Indicators */}
        <mesh position={[-0.06, -0.04, 0.02]}>
          <sphereGeometry args={[0.012]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[0.06, -0.04, 0.02]}>
          <sphereGeometry args={[0.012]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      </group>

      {/* Internal Vapor-Proof LED Lighting */}
      <pointLight position={[0, 2.2, 0]} intensity={0.9} color="#F8FAFC" distance={4.0} />
    </group>
  );
};
