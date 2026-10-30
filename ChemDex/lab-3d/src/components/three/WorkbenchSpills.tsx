import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { SpillState } from '../../types/chemistry';
import { SpilledSolids } from './SpilledSolids';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import { solveSessileDrop } from '../../science/sessileDrop';
import { createSpillGeometry } from '../../pour/render/spillGeometry';

export const WorkbenchSpills = React.memo(function WorkbenchSpills() {
  const spills = useAppStore(state => state.spills);
  return <group>{Object.values(spills || {}).map(spill => <SpillPuddle key={spill.id} spill={spill} />)}</group>;
});

function SpillPuddle({ spill }: { spill: SpillState }) {
  // Deposition coordinates belong to the inventory, including after remount.
  const position: [number, number, number] = [spill.position[0], LAB_PHYSICS.TABLE_SURFACE_Y + 0.001, spill.position[2]];
  const drop = useMemo(() => solveSessileDrop(spill.volume_ml), [spill.volume_ml]);
  const geometry = useMemo(() => drop ? createSpillGeometry(drop) : null, [drop]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return <group position={position}>
    <SpilledSolids spill={spill} />
    {geometry && <mesh geometry={geometry} receiveShadow>
      <meshPhysicalMaterial color={spill.color || '#38bdf8'} transparent opacity={0.88}
        roughness={0.03} transmission={0.86} ior={1.333} clearcoat={1} clearcoatRoughness={0.02}
        depthWrite={false} />
    </mesh>}
  </group>;
}

export default WorkbenchSpills;
