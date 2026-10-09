import React from 'react';
import * as THREE from 'three';

interface BenchProps {
  id: string;
  position: [number, number, number];
  scenarioType?: 'analytical' | 'heating' | 'reagents' | 'acid_spill';
}

const IslandBench: React.FC<BenchProps> = ({ id, position, scenarioType }) => {
  return (
    <group position={position}>
      {/* Heavy Black Chemical-Resistant Epoxy Resin Countertop (3.2m x 1.4m x 0.05m) */}
      <mesh position={[0, 0.875, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.05, 1.4]} />
        <meshStandardMaterial color="#181B1E" roughness={0.18} metalness={0.1} />
      </mesh>

      {/* Marine Edge Spill Containment Lip (Raised 15mm perimeter rim) */}
      <mesh position={[0, 0.905, 0.69]}>
        <boxGeometry args={[3.2, 0.02, 0.02]} />
        <meshStandardMaterial color="#272A2E" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.905, -0.69]}>
        <boxGeometry args={[3.2, 0.02, 0.02]} />
        <meshStandardMaterial color="#272A2E" roughness={0.3} />
      </mesh>
      <mesh position={[1.59, 0.905, 0]}>
        <boxGeometry args={[0.02, 0.02, 1.4]} />
        <meshStandardMaterial color="#272A2E" roughness={0.3} />
      </mesh>
      <mesh position={[-1.59, 0.905, 0]}>
        <boxGeometry args={[0.02, 0.02, 1.4]} />
        <meshStandardMaterial color="#272A2E" roughness={0.3} />
      </mesh>

      {/* Heavy Steel Under-Bench Modular Cabinet with Drawers */}
      <mesh position={[0, 0.425, 0]} receiveShadow>
        <boxGeometry args={[3.1, 0.85, 1.2]} />
        <meshStandardMaterial color="#CBD5E1" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Brushed Aluminum Handles for Drawers */}
      {[-1.0, 0, 1.0].map((hx, i) => (
        <group key={i}>
          <mesh position={[hx, 0.65, 0.605]}>
            <boxGeometry args={[0.3, 0.03, 0.02]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.9} />
          </mesh>
          <mesh position={[hx, 0.35, 0.605]}>
            <boxGeometry args={[0.3, 0.03, 0.02]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Central 2-Tier Chemical Reagent Rack (2.4m W x 0.28m D x 0.55m H) */}
      <group position={[0, 0.9, 0]}>
        {/* Stainless Steel Upright Support Columns */}
        {[-1.1, 0, 1.1].map((cx, i) => (
          <mesh key={i} position={[cx, 0.28, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.56]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
        {/* Lower Reagent Shelf */}
        <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.02, 0.28]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.3} />
        </mesh>
        {/* Upper Reagent Shelf */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.02, 0.28]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.3} />
        </mesh>
        {/* Electrical Service Raceways (Double GPO sockets) */}
        {[-0.6, 0.6].map((ex, i) => (
          <mesh key={i} position={[ex, 0.1, 0.12]}>
            <boxGeometry args={[0.16, 0.08, 0.04]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* Integral End-Bench Sink (Polypropylene acid-resistant basin & Gooseneck faucet) */}
      <group position={[-1.35, 0.9, 0.38]}>
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.35, 0.14, 0.35]} />
          <meshStandardMaterial color="#475569" roughness={0.4} />
        </mesh>
        {/* Brass Chrome-Plated Swan-Neck Laboratory Tap */}
        <mesh position={[0, 0.16, -0.1]}>
          <cylinderGeometry args={[0.012, 0.014, 0.28]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Gas Turrets with Dual Valves */}
      <group position={[0.7, 0.92, 0.4]}>
        <mesh>
          <cylinderGeometry args={[0.016, 0.018, 0.07]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} />
        </mesh>
        <mesh position={[-0.03, 0.04, 0]}>
          <sphereGeometry args={[0.018]} />
          <meshStandardMaterial color="#EF4444" roughness={0.3} /> {/* Red gas valve */}
        </mesh>
      </group>

      {/* 4 Laboratory Swivel Stools around Bench */}
      {[
        [-1.0, -1.0], [1.0, -1.0],
        [-1.0, 1.0], [1.0, 1.0],
      ].map(([sx, sz], i) => (
        <group key={i} position={[sx, 0, sz]}>
          {/* Black PU Seat */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.045, 24]} />
            <meshStandardMaterial color="#1E293B" roughness={0.7} />
          </mesh>
          {/* Chrome Stem */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.9} />
          </mesh>
          {/* 5-Star Base Ring */}
          <mesh position={[0, 0.08, 0]}>
            <torusGeometry args={[0.22, 0.014, 12, 24]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ================= DETAILED REALISTIC BENCH APPARATUS ================= */}
      {/* 1. BENCH 1: ANALYTICAL & PHYSICAL INSTRUMENTS */}
      {scenarioType === 'analytical' && (
        <group position={[0, 0.9, 0]}>
          {/* Analytical Balance with Glass Draft Shield (0.1mg precision) */}
          <group position={[-0.5, 0, 0.4]}>
            {/* White Body Base */}
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.32, 0.08, 0.36]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
            </mesh>
            {/* Glass Draft Shield Enclosure */}
            <mesh position={[0, 0.19, 0]}>
              <boxGeometry args={[0.28, 0.22, 0.3]} />
              <meshPhysicalMaterial transparent opacity={0.25} roughness={0.05} color="#BAE6FD" />
            </mesh>
            {/* Stainless Weighing Pan */}
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.008, 24]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.95} />
            </mesh>
            {/* Green Digital LED Readout */}
            <mesh position={[0, 0.06, 0.182]}>
              <planeGeometry args={[0.14, 0.035]} />
              <meshBasicMaterial color="#22C55E" />
            </mesh>
          </group>

          {/* Magnetic Hotplate Stirrer with Active Vortex Erlenmeyer Flask */}
          <group position={[0.4, 0, 0.4]}>
            {/* White Ceramic Hotplate Body */}
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.24, 0.08, 0.26]} />
              <meshStandardMaterial color="#F1F5F9" roughness={0.3} />
            </mesh>
            {/* Circular Heating Plate Surface */}
            <mesh position={[0, 0.082, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.006, 24]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            {/* Erlenmeyer Flask with Liquid & Vortex */}
            <mesh position={[0, 0.18, 0]}>
              <coneGeometry args={[0.065, 0.16, 20]} />
              <meshPhysicalMaterial transparent opacity={0.4} color="#67E8F9" roughness={0.1} />
            </mesh>
            {/* Flask Neck */}
            <mesh position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.08, 16]} />
              <meshPhysicalMaterial transparent opacity={0.4} color="#67E8F9" roughness={0.1} />
            </mesh>
          </group>

          {/* Precision Digital pH Meter with Articulated Electrode Arm */}
          <group position={[1.0, 0, 0.35]}>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.18, 0.06, 0.18]} />
              <meshStandardMaterial color="#1E293B" roughness={0.4} />
            </mesh>
            {/* LCD Screen */}
            <mesh position={[0, 0.062, 0.02]} rotation={[-0.3, 0, 0]}>
              <planeGeometry args={[0.12, 0.06]} />
              <meshBasicMaterial color="#38BDF8" />
            </mesh>
            {/* Articulated Electrode Arm */}
            <mesh position={[-0.08, 0.12, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.2]} />
              <meshStandardMaterial color="#64748B" metalness={0.9} />
            </mesh>
          </group>
        </group>
      )}

      {/* 2. BENCH 2: ORGANIC SYNTHESIS & HEATING */}
      {scenarioType === 'heating' && (
        <group position={[0, 0.9, 0]}>
          {/* Bunsen Burner with Realistic Dual Blue Flame Core */}
          <group position={[-0.5, 0, 0.4]}>
            {/* Hexagonal Brass Base */}
            <mesh position={[0, 0.015, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.065, 0.03, 6]} />
              <meshStandardMaterial color="#D97706" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Vertical Mixing Chimney Tube */}
            <mesh position={[0, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.16]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.9} />
            </mesh>
            {/* Gas Supply Hose (Orange Ribbed Tube to gas tap) */}
            <mesh position={[0.1, 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.16]} />
              <meshStandardMaterial color="#EA580C" roughness={0.7} />
            </mesh>
            {/* Blue Inner Cone Flame */}
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.018, 0.07, 16]} />
              <meshBasicMaterial color="#38BDF8" transparent opacity={0.85} />
            </mesh>
            {/* Outer Cyan Faint Glow Flame */}
            <mesh position={[0, 0.235, 0]}>
              <coneGeometry args={[0.026, 0.11, 16]} />
              <meshBasicMaterial color="#0284C7" transparent opacity={0.5} />
            </mesh>
          </group>

          {/* Titration Retort Stand & Precision Graduated Burette */}
          <group position={[0.4, 0, 0.38]}>
            {/* Cast Iron Heavy Retort Base */}
            <mesh position={[0, 0.01, 0]} castShadow>
              <boxGeometry args={[0.22, 0.02, 0.3]} />
              <meshStandardMaterial color="#1E293B" roughness={0.8} />
            </mesh>
            {/* Vertical Chrome Rod */}
            <mesh position={[0.07, 0.32, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.62]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.95} />
            </mesh>
            {/* Double Burette Clamp */}
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.15, 0.03, 0.03]} />
              <meshStandardMaterial color="#64748B" metalness={0.8} />
            </mesh>
            {/* 50mL Glass Burette with Graduation Rings */}
            <mesh position={[-0.04, 0.35, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.48]} />
              <meshPhysicalMaterial transparent opacity={0.4} roughness={0.05} color="#BAE6FD" />
            </mesh>
            {/* Red PTFE Stopcock Valve */}
            <mesh position={[-0.04, 0.13, 0]}>
              <boxGeometry args={[0.03, 0.015, 0.015]} />
              <meshStandardMaterial color="#DC2626" />
            </mesh>
            {/* Conical Receiver Flask Below Burette */}
            <mesh position={[-0.04, 0.06, 0]}>
              <coneGeometry args={[0.05, 0.1, 16]} />
              <meshPhysicalMaterial transparent opacity={0.4} roughness={0.1} color="#FDA4AF" /> {/* Pink phenolphthalein end point */}
            </mesh>
          </group>
        </group>
      )}

      {/* 3. BENCH 3: INORGANIC REAGENTS & GLASSWARE */}
      {scenarioType === 'reagents' && (
        <group position={[0, 0.9, 0]}>
          {/* Test Tube Rack with 6 Colorful Solution Tubes */}
          <group position={[-0.5, 0, 0.35]}>
            {/* Wooden / Polycarbonate Rack Frame */}
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.32, 0.1, 0.1]} />
              <meshStandardMaterial color="#B45309" roughness={0.6} />
            </mesh>
            {/* 6 Tubes with Assorted Chemical Colors */}
            {[-0.12, -0.07, -0.02, 0.03, 0.08, 0.13].map((tx, idx) => {
              const colors = ['#38BDF8', '#818CF8', '#A855F7', '#F59E0B', '#10B981', '#EF4444'];
              return (
                <group key={idx} position={[tx, 0.06, 0]}>
                  {/* Glass tube */}
                  <mesh>
                    <cylinderGeometry args={[0.011, 0.011, 0.12, 12]} />
                    <meshPhysicalMaterial transparent opacity={0.35} roughness={0.08} color="#FFFFFF" />
                  </mesh>
                  {/* Colored Liquid */}
                  <mesh position={[0, -0.02, 0]}>
                    <cylinderGeometry args={[0.009, 0.009, 0.07, 12]} />
                    <meshStandardMaterial color={colors[idx % colors.length]} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}
          </group>

          {/* Graduated Glass Cylinders (100ml & 250ml) */}
          <group position={[0.3, 0, 0.38]}>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.28, 16]} />
              <meshPhysicalMaterial transparent opacity={0.35} roughness={0.05} color="#BAE6FD" />
            </mesh>
            {/* Liquid Meniscus Inside Cylinder */}
            <mesh position={[0, 0.09, 0]}>
              <cylinderGeometry args={[0.019, 0.019, 0.17, 16]} />
              <meshStandardMaterial color="#0284C7" transparent opacity={0.7} />
            </mesh>
          </group>
        </group>
      )}

      {/* 4. BENCH 4: ACID DILUTION & SPILL SCENARIO (Interactive Area) */}
      {scenarioType === 'acid_spill' && (
        <group position={[0, 0.9, 0]}>
          {/* Concentrated H2SO4 Beaker with Safety Warning Label */}
          <group position={[-0.4, 0, 0.35]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.16, 20]} />
              <meshPhysicalMaterial transparent opacity={0.4} roughness={0.08} color="#BAE6FD" />
            </mesh>
            {/* Dense Acid Liquid */}
            <mesh position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.1, 20]} />
              <meshStandardMaterial color="#0284C7" transparent opacity={0.75} roughness={0.2} />
            </mesh>
            {/* Glass Stirring Rod placed inside */}
            <mesh position={[0.02, 0.12, 0]} rotation={[0, 0, 0.25]}>
              <cylinderGeometry args={[0.004, 0.004, 0.22]} />
              <meshPhysicalMaterial transparent opacity={0.6} roughness={0.05} color="#FFFFFF" />
            </mesh>
            {/* GHS Corrosive Diamond Symbol */}
            <mesh position={[0, 0.08, 0.062]}>
              <planeGeometry args={[0.04, 0.04]} />
              <meshStandardMaterial color="#DC2626" roughness={0.3} />
            </mesh>
          </group>

          {/* Water Beaker for Dilution Rule (Acid into Water, never water into acid) */}
          <group position={[0.3, 0, 0.35]}>
            <mesh position={[0, 0.09, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.18, 20]} />
              <meshPhysicalMaterial transparent opacity={0.35} roughness={0.05} color="#BAE6FD" />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.066, 0.066, 0.12, 20]} />
              <meshStandardMaterial color="#E0F2FE" transparent opacity={0.6} roughness={0.1} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

export const IslandBenches: React.FC = () => {
  return (
    <group>
      {/* Bench 1 (North-West): Analytical & Balances */}
      <IslandBench id="bench_nw" position={[-4.2, 0, -2.2]} scenarioType="analytical" />

      {/* Bench 2 (North-East): Heating & Synthesis */}
      <IslandBench id="bench_ne" position={[4.2, 0, -2.2]} scenarioType="heating" />

      {/* Bench 3 (South-West): Inorganic Reagents */}
      <IslandBench id="bench_sw" position={[-4.2, 0, 2.2]} scenarioType="reagents" />

      {/* Bench 4 (South-East): Acid Dilution & Spill Scenario */}
      <IslandBench id="bench_se" position={[4.2, 0, 2.2]} scenarioType="acid_spill" />
    </group>
  );
};
