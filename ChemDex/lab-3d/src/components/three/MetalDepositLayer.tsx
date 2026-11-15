import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { attachedMetalMassForCarrier, DEPOSIT_DENSITY_G_ML, metalSurfaceAppearances } from '../../science/metalSurfaceAppearance';
import { DEPOSIT_AGGREGATES_PER_CARRIER, metalDepositAnchors, metalDepositPlacement, type MetalDepositAnchor } from '../../science/metalDepositGeometry';
import { sameMolecularFormula } from '../../science/speciesIdentity';
import { solidSceneVolume } from '../../science/vesselDimensions';
import { createPrecipitateGeometry } from '../../simulation/render/precipitateGeometry';
import { getPrecipitateProfile } from '../../simulation/core/SimulationConfig';
import { stockPointInAqueousLiquid } from '../../physical/stockLiquidContact';
import { METERS_PER_SCENE_UNIT } from '../../science/sceneUnits';

export interface DepositCarrier { id?: string; matrix: THREE.Matrix4; share: number }
export interface MetalDepositFrame { vessel: VesselState; geometry: THREE.BufferGeometry; carriers: DepositCarrier[];
  /** Bench spill matrices already use global scene units, outside a vessel. */
  worldSpace?: boolean; supportFloorY?: number }

/** Shared manual/automatic rendering. Each supported metal owns independent
 * instances, so a later deposit cannot recolor or erase an older metal. */
export function MetalDepositLayers({ substrate, readFrame, capacity }: {
  substrate: string; readFrame: () => MetalDepositFrame | null; capacity: number;
}) {
  const [products, setProducts] = useState<string[]>([]), productKey = useRef('');
  useFrame(() => {
    const frame = readFrame();
    const next = frame ? [...new Set(metalSurfaceAppearances(frame.vessel).filter(group =>
      sameMolecularFormula(group.substrate, substrate) && DEPOSIT_DENSITY_G_ML[group.product] > 0)
      .map(group => group.product))].sort() : [];
    const key = next.join('|');
    if (key !== productKey.current) { productKey.current = key; setProducts(next); }
  });
  // Register only metals that actually exist on this mechanical host. Silver
  // grown by consuming its copper coat therefore renders on an iron carrier,
  // without allocating every possible metal palette for each uncoated grain.
  return <>{products.map(product => <MetalDepositLayer key={product}
    substrate={substrate} product={product} readFrame={readFrame} capacity={capacity} />)}</>;
}

function MetalDepositLayer({ substrate, product, readFrame, capacity }: {
  substrate: string; product: string; readFrame: () => MetalDepositFrame | null; capacity: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => createPrecipitateGeometry(getPrecipitateProfile(product)), [product]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const cache = useRef(new Map<string, { source: THREE.BufferGeometry; anchors: MetalDepositAnchor[] }>());
  useFrame(() => {
    const target = mesh.current, frame = readFrame();
    if (!target) return;
    if (!frame) { target.count = 0; return; }
    const { vessel, carriers } = frame;
    const coating = metalSurfaceAppearances(vessel).find(group => group.product === product && sameMolecularFormula(group.substrate, substrate));
    if (!coating) { target.count = 0; cache.current.clear(); return; }
    const masses = carriers.map(carrier => carrier.id ? attachedMetalMassForCarrier(vessel, carrier.id, product)
      : coating.attachedMass_g * carrier.share);
    const alive = new Set<string>();
    let inLiquid: ReturnType<typeof stockPointInAqueousLiquid> | undefined;
    const matrices = carriers.flatMap((carrier, index) => {
      const ml = masses[index] / DEPOSIT_DENSITY_G_ML[product];
      const volume = frame.worldSpace ? ml * 1e-6 / METERS_PER_SCENE_UNIT ** 3 : solidSceneVolume(vessel, ml);
      if (!(volume > 0)) return [];
      const key = carrier.id ?? `static:${index}`; alive.add(key);
      let entry = cache.current.get(key);
      if (!entry || entry.source !== frame.geometry) {
        if (!frame.worldSpace) inLiquid ??= stockPointInAqueousLiquid(vessel);
        entry = { source: frame.geometry, anchors: metalDepositAnchors(frame.geometry, carrier.matrix, geometry, volume,
          frame.worldSpace ? undefined : vessel.type, DEPOSIT_AGGREGATES_PER_CARRIER, inLiquid, frame.supportFloorY) };
        cache.current.set(key, entry);
      }
      return entry.anchors.map(anchor => metalDepositPlacement(anchor, carrier.matrix, geometry, volume / entry!.anchors.length));
    });
    for (const key of cache.current.keys()) if (!alive.has(key)) cache.current.delete(key);
    target.count = Math.min(matrices.length, capacity * DEPOSIT_AGGREGATES_PER_CARRIER);
    for (let i = 0; i < target.count; i++) target.setMatrixAt(i, matrices[i]);
    target.instanceMatrix.needsUpdate = target.count > 0;
    target.userData.metalDeposit = { product, mass_g: masses.reduce((sum, mass) => sum + mass, 0),
      carrierIds: carriers.filter((_, i) => masses[i] > 0).map(carrier => carrier.id), support: 'stock-mesh-surface' };
  });
  return <instancedMesh ref={mesh} name={`stock_coating_${substrate}_${product}`} args={[geometry, undefined, capacity * DEPOSIT_AGGREGATES_PER_CARRIER]}
    count={0} frustumCulled={false} renderOrder={3}>
    <meshStandardMaterial color={product === 'Ag' ? '#cbd5e1' : product === 'Pb' ? '#676b70' : '#b87346'} metalness={0.9} roughness={0.6} />
  </instancedMesh>;
}
