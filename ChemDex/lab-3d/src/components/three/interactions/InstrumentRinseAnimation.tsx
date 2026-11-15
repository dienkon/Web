import { useAppStore } from '../../../store/useAppStore';
import { RINSE_FLOW_ML_S } from '../../../handling/instrumentRinse';
import { rinseNozzleTarget, rinseToolContact } from '../../../handling/instrumentRinseVisual';
import { CENTIMETERS_PER_SCENE_UNIT } from '../../../science/sceneUnits';
import { ContinuousLiquidStream } from './ContinuousLiquidStream';

const TRAY_WIDTH = 1.15, TRAY_DEPTH = 0.85;

/** Collection tray and water only: the existing bottle and utensil move here. */
export function InstrumentRinseAnimation() {
  const session = useAppStore(state => state.instrumentRinse);
  const bottle = useAppStore(state => state.instrumentRinse ? state.vessels[state.instrumentRinse.bottleId] : undefined);
  if (!session || !bottle) return null;
  const waterHeight = session.dispensed_ml / (CENTIMETERS_PER_SCENE_UNIT ** 3 * TRAY_WIDTH * TRAY_DEPTH);
  return <group name="instrument-rinse" userData={{ tool: session.tool, bottleId: session.bottleId }}>
    <group position={session.anchor} name="instrument-rinse-tray">
      <mesh receiveShadow position={[0, -0.012, 0]}>
        <boxGeometry args={[TRAY_WIDTH + 0.08, 0.025, TRAY_DEPTH + 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.26} />
      </mesh>
      {[-1, 1].map(side => <mesh key={`side-${side}`} position={[side * (TRAY_WIDTH / 2 + 0.02), 0.075, 0]}>
        <boxGeometry args={[0.04, 0.18, TRAY_DEPTH + 0.08]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.26} />
      </mesh>)}
      {[-1, 1].map(side => <mesh key={`end-${side}`} position={[0, 0.075, side * (TRAY_DEPTH / 2 + 0.02)]}>
        <boxGeometry args={[TRAY_WIDTH, 0.18, 0.04]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.26} />
      </mesh>)}
      {waterHeight > 0 && <mesh name="instrument-rinse-collected-water" position={[0, waterHeight / 2 + 0.002, 0]}>
        <boxGeometry args={[TRAY_WIDTH, waterHeight, TRAY_DEPTH]} />
        <meshPhysicalMaterial color="#bae6fd" transparent opacity={0.6} transmission={0.45} roughness={0.12} depthWrite={false} />
      </mesh>}
    </group>
    <ContinuousLiquidStream name="instrument-rinse-stream" fromPos={rinseNozzleTarget(session, bottle)}
      toPos={rinseToolContact(session)} color="#bae6fd" flowRate={RINSE_FLOW_ML_S} thickness={0.018}
      active={session.phase === 'washing'} />
  </group>;
}
