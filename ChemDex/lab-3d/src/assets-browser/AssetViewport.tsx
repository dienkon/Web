import React, { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Canvas, events, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Box3, Group, Material, Mesh, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as Models from '../components/three/Vessels';
import { AlcoholBurner } from '../components/three/AlcoholBurner';
import { RetortStand } from '../apparatus/Stand';
import { RetortClamp } from '../apparatus/Clamp';
import { Stopper } from '../apparatus/Stopper';
import { HotPlate } from '../apparatus/HotPlate';
import { PneumaticTrough } from '../apparatus/Trough';
import { InteractivePipette } from '../components/three/interactions/InteractivePipette';
import { InteractiveThermometer } from '../components/three/interactions/InteractiveThermometer';
import { InteractivePhMeter } from '../components/three/interactions/InteractivePhMeter';
import { InteractiveSpatula } from '../components/three/interactions/InteractiveSpatula';
import { InteractiveStirringRod } from '../components/three/interactions/InteractiveStirringRod';
import { InteractiveSponge } from '../components/three/interactions/InteractiveSponge';
import { SolidContentsRenderer } from '../components/three/SolidContentsRenderer';
import { useAppStore } from '../store/useAppStore';
import { useToolDockStore } from '../handling/toolDock';
import type { VesselState } from '../types/chemistry';
import type { Asset } from './catalog';

const origin: [number, number, number] = [0, 0, 0];
const previewId = '__asset_preview__';

// Raw setState deliberately avoids lab actions, history and local persistence.
function PreviewState({ asset, children }: { asset: Asset; children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  useLayoutEffect(() => {
    const previous = useAppStore.getState();
    const previousDock = useToolDockStore.getState();
    const chemical = asset.chemical;
    const solid = chemical?.type === 'solid';
    const mass = solid ? 8 : 0;
    const specimen: VesselState = {
      id: previewId, type: asset.type ?? 'beaker', name: asset.name, capacity_ml: asset.capacity ?? 100,
      position: origin, rotationY: 0, isLocked: true, substances: chemical ? [chemical.formula] : [],
      contents: solid ? [{ formula: chemical.formula, mass_g: mass, initialMass_g: mass, moles: mass / chemical.molarMass, phase: 's' }] : [],
      volume: 0, volume_ml: 0, mass_g: mass, temperature_c: 25, ph: 7,
      hasPrecipitate: false, isBoiling: false, hasGas: false, solidMorphology: chemical?.solidMorphology,
    };
    useAppStore.setState({ vessels: { [previewId]: specimen }, vesselIds: [previewId], burners: {}, burnerIds: [],
      selectedVesselId: null, hoveredVesselId: null, draggingVesselId: null, nearestPourTargetId: null,
      stirringVesselId: null, isDraggingChemical: null, activeTool: 'none', moveMode: true,
      isSimulationPaused: true, spills: {},
      burette: { ...previous.burette, position: origin, isDispensing: false },
    });
    useToolDockStore.setState({ positions: { pipette: origin, thermometer: origin, ph_meter: origin, spatula: origin, stirring_rod: origin, balance: origin, burette: origin }, dragging: null });
    setReady(true);
    return () => {
      useAppStore.setState(previous, true);
      useToolDockStore.setState(previousDock, true);
    };
  }, [asset]);
  return ready ? children : null;
}

function NativeModel({ asset }: { asset: Asset }) {
  if (asset.model) { const Model = asset.model; return <Model id={previewId} position={origin} />; }
  if (asset.chemical) {
    const c = asset.chemical;
    return c.type === 'solid'
      ? <SolidContentsRenderer vesselId={previewId} radius={0.82} baseY={0} />
      : <Models.Bottle position={origin} formula={c.formula} name={c.name_vi} color={c.color}
        hazard={c.hazards.includes('toxic') ? 'toxic' : c.hazards.includes('corrosive') ? 'corrosive' : c.hazards.includes('flammable') ? 'flammable' : c.hazards.includes('oxidizer') ? 'oxidizer' : 'safe'} />;
  }
  switch (asset.id) {
    case 'burette': return <Models.BuretteApparatus position={origin} />;
    case 'balance': return <Models.DigitalBalance position={origin} />;
    case 'alcohol_burner': return <AlcoholBurner id={previewId} position={origin} isOn={false} intensity={1} />;
    case 'bunsen_burner': return <Models.BunsenBurner id={previewId} position={origin} isOn={false} />;
    case 'hot_plate': return <HotPlate position={origin} />;
    case 'retort_stand': return <RetortStand position={origin} />;
    case 'retort_clamp': return <RetortClamp position={origin} />;
    case 'pneumatic_trough': return <PneumaticTrough position={origin} />;
    case 'stopper': return <Stopper position={origin} />;
    case 'cork_stopper': return <Stopper position={origin} material="cork" holes={2} />;
    case 'pipette': return <InteractivePipette position={origin} />;
    case 'thermometer': return <InteractiveThermometer position={origin} />;
    case 'ph_meter': return <InteractivePhMeter />;
    case 'stirring_rod': return <InteractiveStirringRod position={origin} />;
    case 'spatula': return <InteractiveSpatula position={origin} />;
    case 'sponge': return <InteractiveSponge preview />;
    case 'reagent_bottle': return <Models.Bottle position={origin} formula="H₂O" name="Nước cất" color="#e2f1fc" />;
    case 'amber_bottle': return <Models.Bottle position={origin} formula="Reagent" name="Chai bảo quản" color="#fde68a" isAmber />;
    default: return null;
  }
}

export interface ModelStats { meshes: number; triangles: number; }
function NormalizedModel({ asset, wireframe, onStats }: { asset: Asset; wireframe: boolean; onStats: (s: ModelStats) => void }) {
  const outer = useRef<Group>(null), inner = useRef<Group>(null), raw = useRef<Group>(null);
  const frame = useRef(0);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    const geometries = new Set<Mesh['geometry']>();
    const ownedMaterials = new Set<Material>();
    raw.current?.traverse(o => {
      if (!(o instanceof Mesh)) return;
      geometries.add(o.geometry);
      for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
        // JSX material instances belong to this model. Materials supplied as
        // props have no R3F parent and may be shared module-level resources.
        if ((material as any).__r3f?.parent) ownedMaterials.add(material);
      }
    });
    return () => { geometries.forEach(g => g.dispose()); ownedMaterials.forEach(m => m.dispose()); };
  }, [asset]);
  useEffect(() => {
    if (!raw.current) return;
    const originals = new Map<Mesh, Material | Material[]>();
    const clones: Material[] = [];
    raw.current.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (wireframe) {
        originals.set(object, object.material);
        const convert = (original: Material) => {
          const clone = original.clone();
          Object.assign(clone, { wireframe: true, transparent: false, opacity: 1, depthWrite: true });
          clones.push(clone); return clone;
        };
        object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
      }
    });
    invalidate();
    return () => { originals.forEach((material, mesh) => { mesh.material = material; }); clones.forEach(m => m.dispose()); };
  }, [wireframe, asset, invalidate]);
  useFrame(() => {
    if (++frame.current > 36 || !raw.current || !inner.current || !outer.current) return;
    raw.current.traverse(o => { if ((o as any).isInstancedMesh) (o as any).computeBoundingBox(); });
    outer.current.scale.setScalar(1); inner.current.position.set(0, 0, 0);
    outer.current.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(raw.current);
    if (box.isEmpty()) { invalidate(); return; }
    const size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
    inner.current.position.copy(center.negate());
    outer.current.scale.setScalar(3 / Math.max(size.x, size.y, size.z, 0.01));
    if (frame.current === 36) {
      let meshes = 0, triangles = 0;
      raw.current.traverse(o => { if (o instanceof Mesh && o.visible) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position?.count ?? 0) / 3 * ((o as any).isInstancedMesh ? (o as any).count : 1); } });
      onStats({ meshes, triangles: Math.round(triangles) });
    }
    invalidate();
  });
  // Disposal above releases model geometry while preserving shared materials/textures.
  return <group ref={outer} dispose={null}><group ref={inner}><group ref={raw}><NativeModel asset={asset} /></group></group></group>;
}

export type CameraView = 'perspective' | 'front' | 'back' | 'side' | 'top' | 'detail' | 'in' | 'out';
export interface CameraCommand { view: CameraView; serial: number; }
function CameraRig({ command, rotate }: { command: CameraCommand; rotate: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate, size } = useThree();
  const aspect = size.width / Math.max(size.height, 1);
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  useEffect(() => {
    const views: Record<string, [number, number, number]> = {
      perspective: [5.5, 3.2, 6.5], front: [0, 0, 8], back: [0, 0, -8], side: [8, 0, 0], top: [0, 8, 0.001], detail: [2.5, 1.5, 3],
    };
    const target = new Vector3();
    let position: Vector3;
    if (command.view === 'in' || command.view === 'out') {
      target.copy(controls.current?.target ?? new Vector3());
      const offset = camera.position.clone().sub(target);
      const length = Math.max(0.3, Math.min(20, offset.length() * (command.view === 'in' ? 0.72 : 1.38)));
      position = offset.setLength(length).add(target);
    } else {
      position = new Vector3(...views[command.view]);
      if (command.view !== 'detail') position.multiplyScalar(Math.max(1, 0.8 / aspect));
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(position); controls.current?.target.copy(target); controls.current?.update(); goal.current = null;
    } else goal.current = { position, target };
    invalidate();
  }, [command, camera, invalidate, aspect]);
  useFrame((_, dt) => {
    if (goal.current && controls.current) {
      const alpha = 1 - Math.exp(-Math.min(dt, 0.05) * 10);
      camera.position.lerp(goal.current.position, alpha);
      controls.current.target.lerp(goal.current.target, alpha);
      controls.current.update();
      if (camera.position.distanceTo(goal.current.position) < 0.002 && controls.current.target.distanceTo(goal.current.target) < 0.002) goal.current = null;
      invalidate();
    }
    if (rotate) invalidate();
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.09} autoRotate={rotate} autoRotateSpeed={0.65}
    minDistance={0.3} maxDistance={20} zoomSpeed={0.8} rotateSpeed={0.65} onStart={() => { goal.current = null; }} />;
}

export function AssetViewport({ asset, wireframe, rotate, grid, background, lighting, quality, command, onStats, onCanvas }:
  { asset: Asset; wireframe: boolean; rotate: boolean; grid: boolean; background: string; lighting: number;
    quality: 'smooth' | 'detail'; command: CameraCommand; onStats: (s: ModelStats) => void; onCanvas: (canvas: HTMLCanvasElement) => void }) {
  return <Canvas frameloop="demand" dpr={quality === 'detail' ? [1, 2] : [1, 1.25]} camera={{ position: [5.5, 3.2, 6.5], fov: 35, near: 0.01, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      events={state => ({ ...events(state), filter: () => [] })}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; onCanvas(gl.domElement); }}>
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.65 * lighting} />
      <directionalLight position={[5, 7, 6]} intensity={2.6 * lighting} color="#e7f4ff" />
      <directionalLight position={[-4, 1, -3]} intensity={1.8 * lighting} color="#a7f3d0" />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <Lightformer position={[0, 5, -4]} scale={[8, 4, 1]} intensity={3} />
          <Lightformer position={[-4, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[3, 7, 1]} intensity={4} />
          <Lightformer position={[4, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[2, 6, 1]} intensity={3} />
        </Environment>
        <PreviewState key={asset.id} asset={asset}><NormalizedModel key={asset.id} asset={asset} wireframe={wireframe} onStats={onStats} /></PreviewState>
      </Suspense>
      {grid && <gridHelper args={[12, 24, '#284456', '#1b2e3d']} position={[0, -1.65, 0]} />}
      <CameraRig command={command} rotate={rotate} />
    </Canvas>;
}
