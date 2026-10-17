import React from 'react';

interface HotPlateProps {
  position: [number, number, number];
  temperature_c?: number;
  setPoint_c?: number;
  stirrerRpm?: number;
  isOn?: boolean;
}

/**
 * HotPlate & Magnetic Stirrer Component (K6.9)
 * Laboratory ceramic-top heating plate with magnetic stirring speed controls.
 */
export const HotPlate: React.FC<HotPlateProps> = React.memo(function HotPlate({
  position,
  temperature_c = 25,
  setPoint_c = 100,
  stirrerRpm = 450,
  isOn = true
}) {
  const isHeating = isOn && temperature_c > 60;
  // Ceramic plate glows slightly orange/amber at very high temperatures
  const topPlateColor = temperature_c > 200 ? '#ea580c' : '#f8fafc';

  return (
    <group position={position}>
      {/* Main Base Housing */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.5, 0.24, 1.5]} />
        <meshStandardMaterial color="#334155" roughness={0.35} metalness={0.6} />
      </mesh>

      {/* Chemical-Resistant Ceramic Top Plate */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.4, 0.04, 1.4]} />
        <meshStandardMaterial 
          color={topPlateColor} 
          roughness={0.2} 
          emissive={isHeating ? '#f97316' : '#000000'}
          emissiveIntensity={isHeating ? Math.min(0.6, (temperature_c - 60) / 200) : 0}
        />
      </mesh>

      {/* Front Control Dials */}
      <group position={[0, 0.12, 0.76]}>
        {/* Temp Dial */}
        <mesh position={[-0.35, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Stirrer RPM Dial */}
        <mesh position={[0.35, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* LED Digital Display */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.32, 0.1, 0.02]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>
    </group>
  );
});
