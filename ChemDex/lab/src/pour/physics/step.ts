import { VesselProfile, getVesselProfile } from './profiles';
import { calculateWeirFlow, FlowResult } from './flow';
import { calculateStreamBallistics, BallisticsResult } from './ballistics';
import { transferFluidIncrement, MixingState } from './mixing';

export interface PourEvent {
  type: 'flow:start' | 'flow:impact' | 'spill' | 'bottle:glug' | 'wall:drip' | 'flow:end';
  position: [number, number, number];
  color: string;
  volume_ml: number;
  flowRate_ml_s: number;
  landingKind?: 'inside' | 'rim' | 'table';
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
}

export interface PourPhysicsSession {
  sourceId: string;
  targetId: string | null;
  sourcePos?: [number, number, number];
  tilt: number;
  isStreaming: boolean;
  totalTransferred_ml: number;
  totalSpilled_ml: number;
  lastFlowRate: number;
}

/**
 * Pure simulation reducer: updates physics for 1 fixed sub-step dt (e.g. 1/60s).
 */
export function stepPourSimulation(
  session: PourPhysicsSession,
  vessels: Record<string, SimVessel>,
  dt: number,
  simTime: number
): {
  nextSession: PourPhysicsSession;
  updatedSource: SimVessel;
  updatedTarget: SimVessel | null;
  events: PourEvent[];
} {
  const source = vessels[session.sourceId];
  const target = session.targetId ? vessels[session.targetId] : null;
  const events: PourEvent[] = [];

  if (!source) {
    return {
      nextSession: { ...session, isStreaming: false },
      updatedSource: source,
      updatedTarget: target,
      events
    };
  }

  const profile = getVesselProfile(source.type);
  const flow: FlowResult = calculateWeirFlow(
    profile,
    source.volume_ml,
    session.tilt,
    simTime
  );

  if (!flow.isPouring || flow.flowRate_ml_s <= 0.001) {
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
    mouthR: getVesselProfile(target.type).mouthR,
    mouthY: target.position[1] + getVesselProfile(target.type).lipLocal[1],
    liquidSurfaceY: target.position[1] - 0.92 + Math.max(0.08, target.volume_ml / target.capacity_ml) * 1.8
  } : null;

  const actualSourcePos = session.sourcePos || source.position;
  const ballistics: BallisticsResult = calculateStreamBallistics(
    actualSourcePos,
    session.tilt,
    profile,
    flow.head_cm,
    targetMetrics,
    -0.135,
    source.rotationY || 0
  );

  const dV = flow.flowRate_ml_s * dt;
  let accepted_ml = 0;
  let spilled_ml = 0;

  const sourceMix: MixingState = {
    volume_ml: source.volume_ml,
    mass_g: source.mass_g || source.volume_ml * source.density_g_ml,
    density_g_ml: source.density_g_ml || 1.0,
    temperature_c: source.temperature_c,
    colorHex: source.colorHex,
    contents: {}
  };

  let newSourceVessel = { ...source };
  let newTargetVessel = target ? { ...target } : null;

  const landsInTarget = (ballistics.landingKind === 'inside' || ballistics.landingKind === 'rim') && target !== null;
  if (landsInTarget && target) {
    const targetMix: MixingState = {
      volume_ml: target.volume_ml,
      mass_g: target.mass_g || target.volume_ml * target.density_g_ml,
      density_g_ml: target.density_g_ml || 1.0,
      temperature_c: target.temperature_c,
      colorHex: target.colorHex,
      contents: {}
    };

    // Neck intake rate limit & turbulent splash-back physics:
    const targetProfile = getVesselProfile(target.type);
    const maxIntakeRate = Math.max(24, (targetProfile.mouthR || 0.15) * 160);
    const actualDV = Math.max(0, Math.min(source.volume_ml, dV));

    let intakeSurplus_ml = 0;
    if (flow.flowRate_ml_s > maxIntakeRate) {
      const surplusRate = flow.flowRate_ml_s - maxIntakeRate;
      intakeSurplus_ml = Math.min(actualDV, surplusRate * dt);
    }

    let targetIntakeDV = Math.max(0, actualDV - intakeSurplus_ml);
    let turbulentSplash_ml = 0;
    if (flow.flowRate_ml_s > 30) {
      const splashFrac = Math.min(0.12, (flow.flowRate_ml_s - 30) * 0.0022);
      turbulentSplash_ml = targetIntakeDV * splashFrac;
      targetIntakeDV = Math.max(0, targetIntakeDV - turbulentSplash_ml);
    }

    const result = transferFluidIncrement(sourceMix, targetMix, targetIntakeDV, target.capacity_ml);
    accepted_ml = result.accepted_ml;
    spilled_ml = Math.max(0, actualDV - accepted_ml);

    const transferredMass_g = actualDV * (source.density_g_ml || 1.0);
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
    events
  };
}
