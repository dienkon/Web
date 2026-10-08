import React from 'react';

interface BenchProps {
  id: string;
  position: [number, number, number];
  scenarioType?: 'acid_dilution' | 'alcohol_burner' | 'titration' | 'hotplate';
}

const IslandBench: React.FC<BenchProps> = ({ id, position, scenarioType }) => {
  return (
    <group position={position}>
      {/* Heavy epoxy black countertop: 2.4m W x 1.3m D x 0.05m H at Y = 0.875m */}
      <mesh position={[0, 0.875, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.05, 1.3]} />
        <meshStandardMaterial color="#1E2124" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Spill barrier lips around edges (15mm high lip) */}
      <mesh position={[0, 0.905, 0.64]}>
        <boxGeometry args={[2.4, 0.02, 0.02]} />
        <meshStandardMaterial color="#2B3036" />
      </mesh>
      <mesh position={[0, 0.905, -0.64]}>
        <boxGeometry args={[2.4, 0.02, 0.02]} />
        <meshStandardMaterial color="#2B3036" />
      </mesh>
      <mesh position={[1.19, 0.905, 0]}>
        <boxGeometry args={[0.02, 0.02, 1.3]} />
        <meshStandardMaterial color="#2B3036" />
      </mesh>
      <mesh position={[-1.19, 0.905, 0]}>
        <boxGeometry args={[0.02, 0.02, 1.3]} />
        <meshStandardMaterial color="#2B3036" />
      </mesh>

      {/* Under-bench steel base frame and drawers */}
      <mesh position={[0, 0.425, 0]} receiveShadow>
        <boxGeometry args={[2.3, 0.85, 1.1]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Central 2-tier chemical reagent shelf: 1.8m W x 0.25m D x 0.45m H */}
      <group position={[0, 0.9, 0]}>
        {/* Upright steel posts */}
        <mesh position={[-0.8, 0.225, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.45]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} />
        </mesh>
        <mesh position={[0.8, 0.225, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.45]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} />
        </mesh>
        {/* Lower shelf */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.8, 0.02, 0.25]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.3} />
        </mesh>
        {/* Upper shelf */}
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[1.8, 0.02, 0.25]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.3} />
        </mesh>
      </group>

      {/* Small laboratory tap and sink at bench end (-1.0, 0.9, 0.4) */}
      <group position={[-1.0, 0.9, 0.4]}>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.25, 0.12, 0.25]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Gooseneck faucet */}
        <mesh position={[0, 0.12, -0.08]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Gas tap valves (Red knobs) in the center */}
      <group position={[0.4, 0.92, 0.35]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.015, 0.06]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.022]} />
          <meshStandardMaterial color="#EF4444" roughness={0.3} />
        </mesh>
      </group>

      {/* 4 Laboratory Stools around each bench */}
      {[
        [-0.8, -0.85],
        [0.8, -0.85],
        [-0.8, 0.85],
        [0.8, 0.85],
      ].map(([stoolX, stoolZ], i) => (
        <group key={i} position={[stoolX, 0, stoolZ]}>
          {/* Stool seat: Ø0.3m at height 0.6m */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
            <meshStandardMaterial color="#334155" roughness={0.5} />
          </mesh>
          {/* Central chrome column & ring footrest */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <torusGeometry args={[0.14, 0.01, 8, 24]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Specific Scenario Props on top of countertop */}
      {scenarioType === 'acid_dilution' && (
        <group position={[-0.2, 0.9, -0.3]}>
          {/* 250ml Water beaker */}
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.05, 0.045, 0.14, 16]} />
            <meshPhysicalMaterial transparent opacity={0.35} roughness={0.05} color="#E0F2FE" />
          </mesh>
          {/* Water liquid level inside */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.046, 0.044, 0.08, 16]} />
            <meshPhysicalMaterial transparent opacity={0.6} color="#BAE6FD" />
          </mesh>
          {/* Glass stirring rod */}
          <mesh position={[0.02, 0.12, 0]} rotation={[0.2, 0, 0.3]}>
            <cylinderGeometry args={[0.003, 0.003, 0.18]} />
            <meshPhysicalMaterial transparent opacity={0.7} color="#F0F9FF" />
          </mesh>
          {/* Acid reagent bottle with yellow hazard label */}
          <mesh position={[0.2, 0.09, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.16, 16]} />
            <meshStandardMaterial color="#78350F" roughness={0.2} /> {/* Amber glass */}
          </mesh>
        </group>
      )}

      {scenarioType === 'alcohol_burner' && (
        <group position={[0.2, 0.9, -0.3]}>
          {/* Alcohol burner lamp */}
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshPhysicalMaterial transparent opacity={0.4} color="#E0F2FE" />
          </mesh>
          {/* Brass wick holder */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.03]} />
            <meshStandardMaterial color="#EAB308" metalness={0.8} />
          </mesh>
          {/* Small flame */}
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.015, 0.04, 8]} />
            <meshStandardMaterial emissive="#F97316" color="#FBBF24" emissiveIntensity={1.5} />
          </mesh>
        </group>
      )}

      {scenarioType === 'titration' && (
        <group position={[0, 0.9, -0.3]}>
          {/* Retort stand rod */}
          <mesh position={[-0.1, 0.25, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5]} />
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </mesh>
          {/* Burette tube */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.42, 12]} />
            <meshPhysicalMaterial transparent opacity={0.4} color="#E0F2FE" />
          </mesh>
          {/* Erlenmeyer flask below burette */}
          <mesh position={[0, 0.06, 0]}>
            <coneGeometry args={[0.05, 0.1, 16]} />
            <meshPhysicalMaterial transparent opacity={0.4} color="#FCE7F3" /> {/* Pink phenolphthalein */}
          </mesh>
        </group>
      )}

      {scenarioType === 'hotplate' && (
        <group position={[0.1, 0.9, -0.3]}>
          {/* Magnetic stirrer hotplate unit */}
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.22, 0.06, 0.24]} />
            <meshStandardMaterial color="#F1F5F9" roughness={0.3} />
          </mesh>
          {/* Ceramic top plate */}
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.01, 24]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.1} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const IslandBenches: React.FC = () => {
  return (
    <group>
      {/* Bench 1: (-2.1, -1.0) - Acid dilution */}
      <IslandBench id="bench_1" position={[-2.1, 0, -1.0]} scenarioType="acid_dilution" />
      {/* Bench 2: (+2.1, -1.0) - Alcohol burner fire B */}
      <IslandBench id="bench_2" position={[2.1, 0, -1.0]} scenarioType="alcohol_burner" />
      {/* Bench 3: (-2.1, +1.8) - Acid-base titration */}
      <IslandBench id="bench_3" position={[-2.1, 0, 1.8]} scenarioType="titration" />
      {/* Bench 4: (+2.1, +1.8) - Hotplate electrical */}
      <IslandBench id="bench_4" position={[2.1, 0, 1.8]} scenarioType="hotplate" />
    </group>
  );
};
