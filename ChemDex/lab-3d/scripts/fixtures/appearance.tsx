// Development QA fixture only; excluded from the production entry point.
// Reuses actual vessel, liquid, stock and particle renderers, not screenshots
// or an alternate approximation of what the lab draws.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Beaker } from '../../src/components/three/Vessels';
import { PhysicalSimulationRenderer } from '../../src/simulation/render/PhysicalSimulationRenderer';
import { VesselEffectsFrame } from '../../src/simulation/render/VesselEffectsFrame';
import { getVesselProfile } from '../../src/pour/physics/profiles';
import { CHEMICAL_DATABASE } from '../../src/data/chemicals';
import { stockLiquidAliquot, prepareStockAddition } from '../../src/engine/stockAddition';
import { stockPhase } from '../../src/science/stockAppearance';
import { useAppStore } from '../../src/store/useAppStore';
import { useQualityStore } from '../../src/vfx/quality';
import { getPrecipitateProfile, PRECIPITATE_PROFILES } from '../../src/simulation/core/SimulationConfig';
import { computeMolarMass } from '../../src/engine/ledger';
import { SimulationEngine } from '../../src/simulation/core/SimulationEngine';
import type { VesselState } from '../../src/types/chemistry';

type Specimen = { formula: string; mode?: 'stock' | 'product'; formation?: string; wet?: boolean; grams?: number;
  agitation?: number;
  deposit?: { formula: string; mass_g: number; reactionId: string } };
const root = createRoot(document.getElementById('root')!);
function ControlledCarrier({ id }: { id: string }) {
  const vessel = useAppStore(state => state.vessels[id]);
  if (!vessel) return null;
  const profile = getVesselProfile(vessel.type, vessel.capacity_ml);
  return <VesselEffectsFrame vessel={vessel}><PhysicalSimulationRenderer vesselId={id}
    baseY={profile.baseY} mouthY={profile.baseY + profile.H} radius={profile.r(profile.baseY + profile.H / 2)} mouthRadius={profile.mouthR}
    agitationOverride={vessel.stirringIntensity} /></VesselEffectsFrame>;
}
let serial = 0;
function Labels({ labels, specimens, ids }: { labels: React.RefObject<HTMLDivElement | null>[]; specimens: Specimen[]; ids: string[] }) {
  const point = new THREE.Vector3();
  useFrame(({ camera, size }) => labels.forEach((ref, i) => {
    point.set((i % 3 - 1) * 4.9, -0.8, (Math.floor(i / 3) - 0.5) * 5.4 + 1.75).project(camera);
    if (ref.current) {
      ref.current.style.left = `${(point.x + 1) * size.width / 2}px`;
      ref.current.style.top = `${(1 - point.y) * size.height / 2}px`;
      const vessel = useAppStore.getState().vessels[ids[i]], spec = specimens[i];
      if (vessel && spec.mode === 'product') {
        const mass = vessel.contents.filter(c => c.formula === spec.formula && c.phase === 's').reduce((sum, c) => sum + c.mass_g, 0);
        ref.current.textContent = `${spec.formula} · ${Number(mass.toPrecision(4))} g / ${vessel.volume_ml} mL`
          + (spec.formation ? ` · ${spec.formation}` : '')
          + (vessel.stirringIntensity !== undefined ? ` · khuấy ${vessel.stirringIntensity}` : '');
      }
    }
  }));
  return null;
}
function empty(id: string): VesselState {
  return { id, name: id, type: 'beaker', position: [0, 0, 0], capacity_ml: 50,
    rotationY: 0, isLocked: true, volume_ml: 0, volume: 0, contents: [], substances: [], mass_g: 0,
    temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false, liquidColor: '#ffffff' };
}

function renderSpecimens(specimens: Specimen[]) {
  const batch = ++serial;
  SimulationEngine.clearAll();
  const captions: string[] = [];
  const vessels = Object.fromEntries(specimens.map((spec, i) => {
    const id = `appearance-${batch}-${i}`;
    let vessel = empty(id);
    if (spec.mode === 'product') {
      const profile = getPrecipitateProfile(spec.formula, spec.formation), mass = spec.grams ?? 0.05;
      vessel.contents = [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 },
        { formula: spec.formula, phase: 's', solidOrigin: 'precipitate', precipitateFormation: spec.formation,
          mass_g: mass, moles: mass / computeMolarMass(spec.formula) }];
      Object.assign(vessel, { volume_ml: 30, volume: 0.6, mass_g: 30 + mass,
        substances: ['H2O', spec.formula], hasPrecipitate: true, precipitateAmount_g: mass,
        precipitateSubstance: spec.formula, precipitateColor: profile.color, precipitateMorphology: spec.formation });
      captions.push(`${spec.formula} · ${profile.morphology} · ${mass} g / 30 mL${spec.formation ? ' · ' + spec.formation : ''}`);
    } else {
      const chemical = CHEMICAL_DATABASE.find(c => c.formula === spec.formula);
      if (!chemical) throw new Error(`Missing stock: ${spec.formula}`);
      const amount = chemical.type === 'solid' ? spec.grams ?? (['Na', 'K'].includes(spec.formula) ? 0.05 : 5) : 30;
      vessel = prepareStockAddition(vessel, chemical, chemical.formula, amount, 25)!.vessel;
      if (spec.wet) {
        const water = CHEMICAL_DATABASE.find(c => c.formula === 'H2O')!;
        const dose = stockLiquidAliquot(water, 'H2O', 30, 25);
        vessel.contents.push(...dose.contents); vessel.volume_ml = 30; vessel.mass_g += 30;
        vessel.substances.push('H2O'); vessel.liquidColor = '#ffffff';
      }
      captions.push(`${chemical.formula} · ${stockPhase(chemical)} · ${amount}${chemical.type === 'solid' ? ' g' : ' mL'}${spec.wet ? ' + 30 mL H₂O' : ''}`);
      if (spec.deposit) {
        const d = spec.deposit;
        vessel.contents.push({ formula: d.formula, phase: 's', solidOrigin: 'precipitate', mass_g: d.mass_g,
          moles: d.mass_g / computeMolarMass(d.formula) });
        vessel.substances.push(d.formula); vessel.mass_g += d.mass_g;
        Object.assign(vessel, { lastReactionId: d.reactionId, precipitateSubstance: d.formula,
          hasPrecipitate: true, precipitateAmount_g: d.mass_g });
        captions[captions.length - 1] += ` · bám ${d.mass_g} g ${d.formula}`;
      }
    }
    if (spec.agitation !== undefined) {
      vessel.stirringIntensity = spec.agitation;
      captions[captions.length - 1] += ` · khuấy ${spec.agitation}`;
    }
    return [id, vessel];
  }));
  useQualityStore.getState().setPreference('high');
  useAppStore.setState({ vessels, activeKinetics: {}, isSimulationPaused: false,
    leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null, hoveredVesselId: null });
  const labels = specimens.map(() => React.createRef<HTMLDivElement>());
  root.render(<div style={{ width: '100vw', height: '100vh', background: '#e4e9ed', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ position: 'absolute', zIndex: 2, top: 20, left: 28, color: '#263844' }}>
      <b>ChemDex · Kiểm tra vật liệu trong renderer của lab</b>
      <div style={{ fontSize: 13, marginTop: 6 }}>25 °C · cốc 50 mL · lượng chất ghi riêng trên từng mẫu · RGB và bông kết tủa là minh họa</div>
    </div>
    <Canvas orthographic camera={{ position: [0, 11, 17], zoom: 73, near: 0.1, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
      onCreated={({ camera, gl, scene }) => { camera.lookAt(0, 0, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1;
        Object.assign(window, { specimenScene: scene }); }}>
      <color attach="background" args={['#e4e9ed']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 10, 6]} intensity={2} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 6, 1]} scale={[12, 6, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1} position={[-5, 1, 3]} scale={[4, 6, 1]} />
      </Environment>
      <Labels labels={labels} specimens={specimens} ids={Object.keys(vessels)} />
      {specimens.map((spec, i) => {
        const x = (i % 3 - 1) * 4.9, z = (Math.floor(i / 3) - 0.5) * 5.4, id = `appearance-${batch}-${i}`;
        return <group key={`${id}-${spec.formula}-${spec.formation}`} position={[x, 0, z]}>
          <Beaker id={id} position={[0, 0, 0]} />
          {(spec.mode === 'product' || spec.deposit) && <ControlledCarrier id={id} />}
          <mesh position={[0, -1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.5, 4.6]} /><meshStandardMaterial color="#cbd3da" roughness={1} />
          </mesh>
        </group>;
      })}
    </Canvas>
    {captions.map((caption, i) => <div key={`${batch}-${i}`} ref={labels[i]} style={{ position: 'absolute', zIndex: 2,
      transform: 'translateX(-50%)', width: 330, textAlign: 'center', fontSize: 14, color: '#24343f' }}>{caption}</div>)}
  </div>);
  return { captions, vessels: Object.values(vessels).map(v => ({ id: v.id, contents: v.contents, volume_ml: v.volume_ml })) };
}

Object.assign(window, { renderSpecimens, stockFormulas: CHEMICAL_DATABASE.map(c => c.formula),
  productFormulas: Object.keys(PRECIPITATE_PROFILES), appearanceReady: true,
  specimenStore: useAppStore,
  inspectSpecimens: () => Object.values(useAppStore.getState().vessels).map(v => {
    const manager = SimulationEngine.findManager(v.id);
    return { id: v.id, contents: v.contents, systems: [...(manager?.precipitationSystems ?? [])].map(([formula, s]) => ({
      formula, clock: s.clock, flocculation: s.flocculation, representedMass_g: s.representedMass_g,
      sediment_g: s.sedimentBed.amount_g, glyphCount: s.particles.length,
      particles: s.particles.slice(0, 8).map(p => ({ x: p.x, y: p.y, z: p.z, radius: p.radius,
        physicalRadius_m: p.physicalRadius_m, density: p.density, aggregationLevel: p.aggregationLevel })),
    })) };
  }),
});
renderSpecimens(['Fe (nail)', 'Al (foil)', 'Mg (ribbon)', 'Cu (turnings)', 'CuSO4·5H2O', 'I2'].map(formula => ({ formula })));
