import { VesselProfile, getWorldVesselProfile } from './profiles';
import { FlowResult } from './flow';
import { calculateVesselWeirFlow } from './vesselFlow';
import { calculateStreamBallistics, BallisticsResult, LandingKind } from './ballistics';
import { transferFluidIncrement, MixingState } from './mixing';
import { vesselWorldLiquidSurfaceY } from '../../science/vesselGeometry';
import { LAB_PHYSICS } from '../../engine/interactionEngine';
import type { SubstanceContent, VesselState } from '../../types/chemistry';
import { availableLiquidVolume, liquidInventoryMass } from '../../handling/solidOccupancy';
import { decantLiquid } from '../../engine/decantTransfer';
import { dispenseAliquot } from '../../handling/aliquot';
import { refreshFlowInventory } from '../../engine/funnelFlow';
import type { MobileSolidInventory } from '../../science/suspensionTransport';

export interface PourEvent {
  type: 'flow:start' | 'flow:impact' | 'spill' | 'bottle:glug' | 'wall:drip' | 'flow:end';
  position: [number, number, number];
  color: string;
  volume_ml: number;
  flowRate_ml_s: number;
  landingKind?: LandingKind;
  targetVesselId?: string | null;
}

export interface SimVessel {
  id: string;
  type: string;
  position: [number, number, number];
  rotationZ: number;
  rotationY?: number;
  volume_ml: number;
  capacity_ml: number;
  mass_g: number;
  density_g_ml: number;
  temperature_c: number;
  colorHex: string;
  substances: string[];
  contents?: SubstanceContent[];
  isSealed?: boolean;
  isShattered?: boolean;
}

export interface PourPhysicsSession {
  sourceId: string;
  targetId: string | null;
  sourcePos?: [number, number, number];
  tilt: number;
  sourceRotationZ?: number;
  isStreaming: boolean;
  totalTransferred_ml: number;
  totalSpilled_ml: number;
  lastFlowRate: number;
  assist?: 'off' | 'low' | 'high';
}

const snapshot = (vessel: SimVessel): VesselState => ({ name: vessel.id, isLocked: false,
  hasGas: false, hasPrecipitate: false, isBoiling: false, ph: 7, rotationY: 0,
  volume: vessel.volume_ml / vessel.capacity_ml, ...vessel,
  type: vessel.type as VesselState['type'], contents: vessel.contents ?? [], liquidColor: vessel.colorHex });

/**
 * Pure simulation reducer: updates physics for 1 fixed sub-step dt (e.g. 1/60s).
 */
export function stepPourSimulation(
  session: PourPhysicsSession,
  vessels: Record<string, SimVessel>,
  dt: number,
  simTime: number,
  maxOutflow_ml: number = Infinity,
  mobileSolids: MobileSolidInventory = {}
): {
  nextSession: PourPhysicsSession;
  updatedSource: SimVessel;
  updatedTarget: SimVessel | null;
  events: PourEvent[];
  trajectory?: BallisticsResult;
} {
  const source = vessels[session.sourceId];
  const target = session.targetId ? vessels[session.targetId] : null;
  const events: PourEvent[] = [];
  const stopped = () => ({ nextSession: { ...session, isStreaming: false, lastFlowRate: 0 },
    updatedSource: source, updatedTarget: target ?? null, events: [] as PourEvent[] });

  if (!source || source.isSealed || source.isShattered || !(source.volume_ml > 0)
    || !Number.isFinite(source.volume_ml) || !Number.isFinite(dt) || dt <= 0 || !(maxOutflow_ml > 0)
    || (session.targetId && (!target || target.id === source.id || target.isSealed || target.isShattered))) return stopped();

  const profile = getWorldVesselProfile(source.type, source.capacity_ml);
  const flow: FlowResult = calculateVesselWeirFlow(
    snapshot(source),
    session.tilt,
    simTime, 1, mobileSolids
  );

  if (!flow.isPouring || flow.flowRate_ml_s <= 0) {
    const wasStreaming = session.isStreaming;
    return {
      nextSession: {
        ...session,
        isStreaming: false,
        lastFlowRate: 0
      },
      updatedSource: { ...source },
      updatedTarget: target ? { ...target } : null,
      events: wasStreaming ? [{
        type: 'flow:end',
        position: source.position,
        color: source.colorHex,
        volume_ml: 0,
        flowRate_ml_s: 0
      }] : []
    };
  }

  // Ballistics calculation
  const targetMetrics = target ? {
    id: target.id,
    position: target.position,
    mouthR: getWorldVesselProfile(target.type, target.capacity_ml).mouthR,
    mouthY: target.position[1] + getWorldVesselProfile(target.type, target.capacity_ml).lipLocal[1],
    profile: getWorldVesselProfile(target.type, target.capacity_ml),
    liquidSurfaceY: target.position[1] + vesselWorldLiquidSurfaceY({ ...target,
      type: target.type as import('../../types/chemistry').VesselType, contents: target.contents ?? [] })
  } : null;

  const actualSourcePos = session.sourcePos || source.position;
  const assistMode = session.assist || (session.targetId ? 'high' : 'off');
  const rotZ = session.sourceRotationZ !== undefined ? session.sourceRotationZ : -session.tilt;

  const ballistics: BallisticsResult = calculateStreamBallistics(
    actualSourcePos,
    rotZ,
    profile,
    flow.head_cm,
    targetMetrics,
    LAB_PHYSICS.TABLE_SURFACE_Y,
    source.rotationY || 0,
    assistMode
  );

  const dV = Number.isFinite(dt) && dt > 0 && maxOutflow_ml > 0
    ? Math.min(flow.flowRate_ml_s * dt, maxOutflow_ml, flow.excessVolume_ml, source.volume_ml) : 0;
  const sourceDensity = source.contents && source.volume_ml > 0
    ? liquidInventoryMass({ contents: source.contents }) / source.volume_ml : source.density_g_ml || 1;
  let accepted_ml = 0;
  let spilled_ml = 0;

  const sourceMix: MixingState = {
    volume_ml: source.volume_ml,
    mass_g: source.mass_g || source.volume_ml * source.density_g_ml,
    density_g_ml: sourceDensity,
    temperature_c: source.temperature_c,
    colorHex: source.colorHex,
    contents: {}
  };

  let newSourceVessel = { ...source };
  let newTargetVessel = target ? { ...target } : null;

  const landsInTarget = ballistics.landingKind === 'inside' && target !== null;
  if (landsInTarget && target) {
    const targetMix: MixingState = {
      volume_ml: target.volume_ml,
      mass_g: target.mass_g || target.volume_ml * target.density_g_ml,
      density_g_ml: target.density_g_ml || 1.0,
      temperature_c: target.temperature_c,
      colorHex: target.colorHex,
      contents: {}
    };

    const actualDV = Math.max(0, Math.min(source.volume_ml, dV));
    const availableCapacity = availableLiquidVolume({ ...target,
      type: target.type as VesselState['type'], contents: target.contents ?? [] }, sourceDensity);

    let targetIntakeDV = actualDV;

    // Only apply neck choke & turbulent splashing if precision assist is explicitly turned off
    if (assistMode === 'off') {
      const targetProfile = getWorldVesselProfile(target.type, target.capacity_ml);
      const maxIntakeRate = Math.max(24, (targetProfile.mouthR || 0.15) * 160);
      if (flow.flowRate_ml_s > maxIntakeRate) {
        const surplusRate = flow.flowRate_ml_s - maxIntakeRate;
        const surplus_ml = Math.min(actualDV, surplusRate * dt);
        targetIntakeDV = Math.max(0, actualDV - surplus_ml);
      }
      if (flow.flowRate_ml_s > 30) {
        const splashFrac = Math.min(0.12, (flow.flowRate_ml_s - 30) * 0.0022);
        const turbulentSplash_ml = targetIntakeDV * splashFrac;
        targetIntakeDV = Math.max(0, targetIntakeDV - turbulentSplash_ml);
      }
    }

    const result = transferFluidIncrement(sourceMix, targetMix, targetIntakeDV, target.volume_ml + availableCapacity);
    accepted_ml = result.accepted_ml;
    spilled_ml = Math.max(0, actualDV - accepted_ml);

    const transferredMass_g = actualDV * sourceDensity;
    newSourceVessel = {
      ...source,
      volume_ml: Math.max(0, source.volume_ml - actualDV),
      mass_g: Math.max(0, (source.mass_g || (source.volume_ml * (source.density_g_ml || 1.0))) - transferredMass_g),
      density_g_ml: result.newSource.density_g_ml || source.density_g_ml
    };

    newTargetVessel = {
      ...target,
      volume_ml: result.newRecipient.volume_ml,
      mass_g: result.newRecipient.mass_g,
      density_g_ml: result.newRecipient.density_g_ml,
      temperature_c: result.newRecipient.temperature_c,
      colorHex: result.newRecipient.colorHex,
      substances: Array.from(new Set([...target.substances, ...source.substances]))
    };

    // A full phase inventory uses the same pure aliquot plan as the store.
    // Solids/headspace stay in the source; prediction must not leave stale moles.
    if (source.contents && target.contents) {
      // Withdraw one authorized sample, then partition its arrival. Sampling
      // twice would reuse a stale suspension snapshot for the splash share.
      const released = decantLiquid(snapshot(source), null, actualDV, mobileSolids);
      if (!released?.spill) return stopped();
      const into = dispenseAliquot(snapshot(target), released.spill, targetIntakeDV);
      const receiver = refreshFlowInventory(into.vessel);
      newSourceVessel = { ...source, ...released.source, colorHex: source.colorHex };
      newTargetVessel = { ...target, ...receiver, colorHex: receiver.liquidColor ?? target.colorHex };
      accepted_ml = into.dispensed_ml;
      spilled_ml = released.moved_ml - accepted_ml;
    }

    events.push({
      type: 'flow:impact',
      position: ballistics.impactPos,
      color: source.colorHex,
      volume_ml: accepted_ml,
      flowRate_ml_s: flow.flowRate_ml_s,
      landingKind: 'inside',
      targetVesselId: target.id
    });
  } else {
    // Spilled onto rim or table
    spilled_ml = Math.min(source.volume_ml, dV);
    newSourceVessel = {
      ...source,
      volume_ml: Math.max(0, source.volume_ml - spilled_ml),
      mass_g: Math.max(0, (source.mass_g || source.volume_ml) - spilled_ml * source.density_g_ml)
    };
    if (source.contents) {
      const plan = decantLiquid(snapshot(source), null, spilled_ml, mobileSolids);
      if (!plan) return stopped();
      if (plan) newSourceVessel = { ...source, ...plan.source, colorHex: source.colorHex };
    }
  }

  if (spilled_ml > 0.001) {
    events.push({
      type: 'spill',
      position: ballistics.impactPos,
      color: source.colorHex,
      volume_ml: spilled_ml,
      flowRate_ml_s: flow.flowRate_ml_s,
      landingKind: ballistics.landingKind
    });
  }

  if (flow.isGlugging && flow.glugPulse > 0.8) {
    events.push({
      type: 'bottle:glug',
      position: ballistics.exitPos,
      color: source.colorHex,
      volume_ml: dV,
      flowRate_ml_s: flow.flowRate_ml_s
    });
  }

  return {
    nextSession: {
      ...session,
      isStreaming: true,
      totalTransferred_ml: session.totalTransferred_ml + accepted_ml,
      totalSpilled_ml: session.totalSpilled_ml + spilled_ml,
      lastFlowRate: flow.flowRate_ml_s
    },
    updatedSource: newSourceVessel,
    updatedTarget: newTargetVessel,
    events,
    trajectory: ballistics
  };
}
