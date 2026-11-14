import type { ActiveExternalPour2D, ActivePour, EquipmentState, EquipmentType, SpillPuddle } from '../types/equipment';
import type { SimulationResult, SubstanceQuantity } from '../types/chemistry';
import type { LabLogEntry } from '../types/experiment';
import type { ActivePourVfxState, SimTimeScale } from '../store/labStoreTypes';
import {
  applyChemicalDoseDeltaOnVessel,
  applySimResultToEquipment,
  mergeEscapedGasMaps,
} from '../store/labStoreHelpers';
import { findChemicalById } from '../data/chemicals';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { prepareVesselSimulation, stepVesselKineticTick } from '../chemistry/reactions/kineticsSolver';
import { getIndicatorColor } from '../chemistry/equilibrium/acidBase';
import {
  appendBuretteTrace,
  type TitrationTraceSample,
} from '../chemistry/equilibrium/titrationEngine';
import {
  DEFAULT_LAB_ENVIRONMENT,
  isOxygenSupportingAtmosphere,
  LabEnvironment,
} from '../chemistry/physical/environmentPhysics';
import {
  calculateMixturePhysicalProperties,
  solubilityAtTemperature_g_100ml,
} from '../chemistry/physical/substanceProps';
import {
  aqueousBoilingPoint,
  BURNER_FUEL_CAPACITY_ML,
  BURNER_FUEL_RATE_ML_S,
  BURNER_MIN_EFFECTIVE_W,
  BURNER_PEAK_POWER_W,
  burnerHeatToVessel,
  hotPlateHeatToVessel,
  probeDipCoupling,
  separatoryFunnelDrain,
  stepMixing,
  stepPour,
  stepTemperatureSolubility,
  stepVesselThermal,
} from './simulationTick';
import { stepVesselPressureAndDamage } from './headspacePressure2D';
import { stepSpillPuddles } from './spillChemistry2D';
import {
  checkAcidDilutionHazard,
  evaluateWorkbenchSafety,
  PPEState2D,
  SafetyViolationAlert,
} from './safetyEngine2D';
import { soundEngine } from '../services/soundEngine';
import { reactionRuntime2D } from '../vfx/ReactionRuntime2D';

export interface LabWorldEffects {
  sound: Pick<
    typeof soundEngine,
    | 'ignite'
    | 'fizz'
    | 'success'
    | 'playWarningAlarm'
    | 'playExplosion'
    | 'playSolidDrop'
    | 'drip'
    | 'pour'
    | 'click'
    | 'playCorkPop'
    | 'playBumpingSurge'
    | 'playSpongeWipe'
  >;
  vfx: Pick<
    typeof reactionRuntime2D,
    'triggerColorMixing' | 'triggerController' | 'triggerGlassShatter'
  >;
}

const DEFAULT_EFFECTS: LabWorldEffects = {
  sound: soundEngine,
  vfx: reactionRuntime2D,
};

export interface LabWorldStepInput {
  equipment: Record<string, EquipmentState>;
  realtimeKinetics: boolean;
  simTimeScale: SimTimeScale;
  activePour: ActivePour | null;
  activePourVfx: ActivePourVfxState | null;
  activeExternalDoses: ActiveExternalPour2D[];
  workbenchEscapedGas_g: Record<string, number>;
  spillPuddles: SpillPuddle[];
  safetyAlerts: SafetyViolationAlert[];
  ppe: PPEState2D;
  titrationTrace?: TitrationTraceSample[];
}

export interface LabWorldStepResult {
  shouldApplyPatch: boolean;
  spillsOnlyChanged: boolean;
  patch: {
    equipment: Record<string, EquipmentState>;
    activePour: ActivePour | null;
    activePourVfx: ActivePourVfxState | null;
    activeExternalDoses: ActiveExternalPour2D[];
    workbenchEscapedGas_g: Record<string, number>;
    spillPuddles: SpillPuddle[];
    safetyAlerts: SafetyViolationAlert[];
    titrationTrace?: TitrationTraceSample[];
  };
  newLogs: LabLogEntry[];
  geminiCheckVesselIds: string[];
}

/**
 * Pure simulation step for the entire 2D workbench state over rawDt seconds.
 * Decoupled from Zustand so physics/kinetics progression can be unit-tested independently.
 */
export function stepLabWorld(
  state: Readonly<LabWorldStepInput>,
  rawDt: number,
  env: LabEnvironment = DEFAULT_LAB_ENVIRONMENT,
  effects: LabWorldEffects = DEFAULT_EFFECTS,
  nowMs: number = Date.now()
): LabWorldStepResult {
  const currentEquipment = state.equipment;
  const dt = Math.max(0.001, rawDt * (state.simTimeScale || 1));

  let hasChanged = false;
  const nextEquipment: Record<string, EquipmentState> = { ...currentEquipment };
  let nextActivePour = state.activePour;
  let nextActivePourVfx = state.activePourVfx;
  const prevExternalDoses = state.activeExternalDoses;
  const remainingExternalDoses: ActiveExternalPour2D[] = [];
  let externalDoseChanged = false;
  let nextWorkbenchEscapedGas = state.workbenchEscapedGas_g;
  let nextTitrationTrace = state.titrationTrace ?? [];
  let titrationTraceChanged = false;
  const newLogs: LabLogEntry[] = [];
  const newlyTriggeredAlerts: SafetyViolationAlert[] = [];
  const geminiCheckVesselIds = new Set<string>();

  const allEqList = Object.values(currentEquipment);
  const activeBurners = allEqList.filter(e => e.type === 'bunsen_burner' && e.isOn);
  const activeHotPlates = allEqList.filter(e => e.type === 'hot_plate' && e.isOn);
  const activeCondensers = allEqList.filter(e => e.type === 'condenser' && e.condenserCooling?.coolingEnabled);
  const openBurettes = allEqList.filter(e => e.type === 'burette' && e.stopcockOpen && e.volume_ml > 0);
  const newlyCreatedSpills: SpillPuddle[] = [];

  // Extinguish flames automatically under Inert (0% O2) atmosphere
  if (!isOxygenSupportingAtmosphere(env)) {
    for (const burner of activeBurners) {
      nextEquipment[burner.id] = { ...burner, isOn: false, gasColorHex: undefined };
      hasChanged = true;
    }
  }

  // 0. Process Continuous Drag/Button Pour Stream
  if (nextActivePour) {
    const srcEq = nextEquipment[nextActivePour.sourceId];
    const tgtEq = nextEquipment[nextActivePour.targetId];
    if (
      !srcEq ||
      !tgtEq ||
      !tgtEq.isContainer ||
      srcEq.volume_ml <= 0.05 ||
      (nextActivePour.remaining_ml !== undefined && nextActivePour.remaining_ml <= 0.05)
    ) {
      nextActivePour = null;
      nextActivePourVfx = null;
      hasChanged = true;
    } else {
      const capRemaining = nextActivePour.remaining_ml ?? srcEq.volume_ml;
      const maxStepRate = Math.min(nextActivePour.rate_ml_s, capRemaining / Math.max(0.005, dt));
      const { moved_ml, spill_ml, done } = stepPour(srcEq, tgtEq, dt, maxStepRate);
      const totalRemoved = moved_ml + spill_ml;
      if (totalRemoved > 1e-4 && srcEq.volume_ml > 0) {
        hasChanged = true;
        const frac = Math.min(1, totalRemoved / srcEq.volume_ml);
        const movedFrac = totalRemoved > 0 ? moved_ml / totalRemoved : 1;
        const newSrcVol = Math.max(0, srcEq.volume_ml - totalRemoved);
        const remSrcContents: SubstanceQuantity[] = [];
        const transferred: SubstanceQuantity[] = [];

        for (const item of srcEq.contents) {
          if (item.state === 's') {
            remSrcContents.push({ ...item });
            continue;
          }
          const totalItemMove = item.moles * frac;
          const totalMassMove = item.mass_g * frac;
          const tgtMoles = totalItemMove * movedFrac;
          const tgtMass = totalMassMove * movedFrac;
          if (tgtMoles > 1e-9) transferred.push({ ...item, moles: tgtMoles, mass_g: tgtMass });
          const remM = item.moles - totalItemMove;
          if (remM > 1e-8 || item.formula === 'H2O') {
            remSrcContents.push({ ...item, moles: remM, mass_g: item.mass_g - totalMassMove });
          }
        }

        const srcProps = calculateMixturePhysicalProperties(remSrcContents, newSrcVol, srcEq.temperature_c);
        const srcMass = (srcEq.tare_g || 0) + remSrcContents.reduce((s, c) => s + c.mass_g, 0);
        nextEquipment[srcEq.id] = {
          ...srcEq,
          volume_ml: Math.round(newSrcVol * 10) / 10,
          mass_g: Math.round(srcMass * 100) / 100,
          contents: remSrcContents,
          viscosity_mPa_s: srcProps.viscosity_mPa_s,
          surfaceTension_N_m: srcProps.surfaceTension_N_m,
          density_g_ml: srcProps.density_g_ml,
        };

        if (spill_ml > 0.15) {
          newlyCreatedSpills.push({
            id: `spill_pour_${nowMs}_${Math.random().toString(36).slice(2, 5)}`,
            x: srcEq.x + srcEq.width * 0.78,
            y: tgtEq.y + tgtEq.height - 4,
            volume_ml: spill_ml,
            colorHex: srcEq.liquidColorHex || '#38bdf8',
            formula: srcEq.contents[0]?.formula || 'H2O',
            ph: srcEq.ph,
            radius_px: Math.min(60, 14 + Math.sqrt(spill_ml) * 5),
            timestamp: nowMs,
          });
        }

        if (moved_ml > 1e-4) {
          const newTgtVol = Math.min(tgtEq.capacity_ml, tgtEq.volume_ml + moved_ml);
          const mergedTgt = tgtEq.contents.map(c => ({ ...c }));
          for (const item of transferred) {
            const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
            if (ex) {
              ex.moles += item.moles;
              ex.mass_g += item.mass_g;
            } else {
              mergedTgt.push({ ...item });
            }
          }
          const prevTgtColor = tgtEq.liquidColorHex || '#f8fafc';
          const tgtPrep = prepareVesselSimulation(
            tgtEq,
            mergedTgt,
            newTgtVol,
            tgtEq.temperature_c,
            tgtEq.isOn || false,
            !tgtEq.isSealed,
            { oxygenFraction: env.oxygenFraction },
            state.realtimeKinetics
          );
          const tgtSim = tgtPrep.simResult;
          const tgtMass = (tgtEq.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
          const contactX = Math.max(
            -0.85,
            Math.min(0.85, (srcEq.x + srcEq.width / 2 - (tgtEq.x + tgtEq.width / 2)) / Math.max(40, tgtEq.width * 0.5))
          );
          const updatedTgt = applySimResultToEquipment(tgtEq, newTgtVol, tgtMass, tgtSim, {
            pourContactX: contactX,
            mixedness: Math.min(tgtEq.mixedness ?? 0.65, 0.3),
            activeReactionLabel: tgtPrep.activeReactionLabel,
            activeReactionProgress: tgtPrep.activeReactionProgress,
            silverMirrorProgress: tgtPrep.silverMirrorProgress,
          });
          nextEquipment[tgtEq.id] = updatedTgt;
          effects.vfx.triggerColorMixing(
            updatedTgt,
            prevTgtColor,
            tgtSim.finalLiquidColorHex,
            contactX,
            srcEq.liquidColorHex || '#38bdf8'
          );
          if (tgtSim.activeControllerIds?.length) {
            const hasPhenol = mergedTgt.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
            for (const cid of tgtSim.activeControllerIds) {
              effects.vfx.triggerController(updatedTgt, cid, {
                hasPhenolphthalein: hasPhenol,
                targetColorHex: tgtSim.finalLiquidColorHex,
              });
            }
          }
        }

        const remTarget =
          nextActivePour.remaining_ml !== undefined ? Math.max(0, nextActivePour.remaining_ml - totalRemoved) : undefined;
        if (done || (remTarget !== undefined && remTarget <= 0.05) || newSrcVol <= 0.05) {
          nextActivePour = null;
          nextActivePourVfx = null;
        } else {
          nextActivePour = { ...nextActivePour, remaining_ml: remTarget };
          nextActivePourVfx = {
            sourceId: srcEq.id,
            targetId: tgtEq.id,
            startX: srcEq.x + srcEq.width / 2,
            startY: srcEq.y + 15,
            endX: tgtEq.x + tgtEq.width / 2,
            endY: tgtEq.y + Math.max(24, tgtEq.height * 0.35),
            liquidColorHex: srcEq.liquidColorHex || '#38bdf8',
          };
        }
      }
    }
  }

  // 0b. Process External Chemical Pour / Dropper / Spatula Animation & Incremental Dose Delivery
  if (prevExternalDoses.length > 0) {
    for (const dose of prevExternalDoses) {
      const tgtEq = nextEquipment[dose.targetId];
      const chem = findChemicalById(dose.chemicalId);
      if (!tgtEq || !tgtEq.isContainer || !chem) {
        externalDoseChanged = true;
        continue;
      }

      const nextApproach = Math.min(1, dose.approachProgress + dt / 0.16);
      if (nextApproach < 0.85) {
        externalDoseChanged = true;
        remainingExternalDoses.push({
          ...dose,
          approachProgress: nextApproach,
        });
        continue;
      }

      const nextFrac = Math.min(1, dose.deliveredFraction + dt / Math.max(0.15, dose.totalTime_s));
      const deltaFrac = Math.max(0, nextFrac - dose.deliveredFraction);
      const deltaMl = dose.totalAmount_ml * deltaFrac;
      const deltaG = dose.totalAmount_g * deltaFrac;

      let hazardChecked = dose.hazardChecked;
      if (!hazardChecked) {
        hazardChecked = true;
        const acidDilutionAlert = checkAcidDilutionHazard(chem.formula, tgtEq);
        if (acidDilutionAlert) {
          effects.sound.playWarningAlarm();
          effects.vfx.triggerController(tgtEq, 'water_into_conc_h2so4_explosion');
          newlyTriggeredAlerts.push(acidDilutionAlert);
        }
      }

      let simResForDone: SimulationResult | null = null;
      if (deltaMl > 1e-5 || deltaG > 1e-5 || nextFrac >= 1 - 1e-4) {
        const delivered = applyChemicalDoseDeltaOnVessel(
          tgtEq,
          chem,
          deltaMl,
          deltaG,
          dose.contactXNorm,
          { oxygenFraction: env.oxygenFraction },
          state.realtimeKinetics,
          !dose.firstBurstTriggered,
          effects.vfx
        );
        nextEquipment[tgtEq.id] = delivered.updatedVessel;
        simResForDone = delivered.simResult;
        hasChanged = true;
        nextWorkbenchEscapedGas = mergeEscapedGasMaps(nextWorkbenchEscapedGas, delivered.simResult.escapedGas_g);

        if (delivered.overflow_ml > 0.15) {
          newlyCreatedSpills.push({
            id: `spill_ext_${nowMs}_${Math.random().toString(36).slice(2, 5)}`,
            x: tgtEq.x + tgtEq.width * 0.5,
            y: tgtEq.y + tgtEq.height - 4,
            volume_ml: delivered.overflow_ml,
            colorHex: tgtEq.liquidColorHex || chem.colorHex || '#38bdf8',
            formula: chem.formula,
            ph: tgtEq.ph,
            radius_px: Math.min(60, 14 + Math.sqrt(delivered.overflow_ml) * 5),
            timestamp: nowMs,
          });
        }

        if (!dose.firstBurstTriggered) {
          if (delivered.simResult.reactionsOccurred.length > 0) {
            if (delivered.simResult.isExplosion) effects.sound.playExplosion(1.0);
            else if (delivered.simResult.hasGas) effects.sound.fizz(1.25);
            else effects.sound.success();
          } else if (dose.deliveryMode === 'spatula') {
            effects.sound.playSolidDrop();
          } else if (dose.deliveryMode === 'dropper') {
            effects.sound.drip();
          } else {
            effects.sound.pour(0.45);
          }
        }

        if (delivered.simResult.reactionsOccurred.length > 0) {
          for (const rx of delivered.simResult.reactionsOccurred) {
            const alreadyLogged = newLogs.some(l => l.vesselId === tgtEq.id && l.reactionId === rx.reactionId);
            if (!alreadyLogged) {
              newLogs.push({
                id: `log_rx_${nowMs}_${Math.random().toString(36).substr(2, 4)}`,
                timestamp: nowMs,
                actionType: 'REACTION',
                reactionId: rx.reactionId,
                details_en: `Reaction: ${rx.name_en || rx.observable_en || rx.equation} (${rx.equation})`,
                details_vi: `Phản ứng: ${rx.name_vi || rx.observable_vi || rx.equation} (${rx.equation})`,
                vesselId: tgtEq.id,
                measurements: {
                  volume_ml: delivered.updatedVessel.volume_ml,
                  temperature_c: delivered.simResult.finalTemperature_c,
                  ph: delivered.simResult.finalPh,
                },
              });
            }
          }
        }
      }

      if (nextFrac < 1 - 1e-4) {
        externalDoseChanged = true;
        remainingExternalDoses.push({
          ...dose,
          approachProgress: nextApproach,
          deliveredFraction: nextFrac,
          hazardChecked,
          firstBurstTriggered: true,
        });
      } else {
        externalDoseChanged = true;
        const finalEq = nextEquipment[tgtEq.id] || tgtEq;
        const isLiquidDose = dose.totalAmount_ml > 0;
        newLogs.push({
          id: `log_dose_${nowMs}_${Math.random().toString(36).slice(2, 5)}`,
          timestamp: nowMs,
          actionType: 'ADD_CHEMICAL',
          details_en: `Added ${isLiquidDose ? `${Math.round(dose.totalAmount_ml * 10) / 10} mL` : `${Math.round(dose.totalAmount_g * 100) / 100} g`} of ${dose.name_en} to ${finalEq.name}`,
          details_vi: `Đã thêm ${isLiquidDose ? `${Math.round(dose.totalAmount_ml * 10) / 10} mL` : `${Math.round(dose.totalAmount_g * 100) / 100} g`} ${dose.name_vi} vào ${finalEq.name_vi}`,
          vesselId: finalEq.id,
          measurements: {
            volume_ml: finalEq.volume_ml,
            temperature_c: finalEq.temperature_c,
            ph: finalEq.ph,
          },
        });
        if (simResForDone && simResForDone.reactionsOccurred.length === 0 && simResForDone.updatedContents.length >= 2) {
          geminiCheckVesselIds.add(tgtEq.id);
        }
      }
    }
  }

  // 1. Process continuous Burette dropwise titration
  for (const burette of openBurettes) {
    const dropRate = burette.dispenseRate_ml_s || 0.35; // mL per second
    const dropAmount = Math.min(burette.volume_ml, dropRate * dt);
    if (dropAmount > 1e-4) {
      hasChanged = true;
      const newBurVol = Math.max(0, burette.volume_ml - dropAmount);
      const frac = dropAmount / burette.volume_ml;
      const transferred: SubstanceQuantity[] = [];
      const remBurContents: SubstanceQuantity[] = [];

      for (const item of burette.contents) {
        const mMove = item.moles * frac;
        const gMove = item.mass_g * frac;
        if (mMove > 0) transferred.push({ ...item, moles: mMove, mass_g: gMove });
        const remMoles = item.moles - mMove;
        if (remMoles > 1e-7) {
          remBurContents.push({ ...item, moles: remMoles, mass_g: item.mass_g - gMove });
        }
      }

      const burMass = (burette.tare_g || 0) + remBurContents.reduce((s, c) => s + c.mass_g, 0);
      nextEquipment[burette.id] = {
        ...burette,
        volume_ml: Math.round(newBurVol * 1000) / 1000,
        mass_g: Math.round(burMass * 100) / 100,
        contents: remBurContents,
      };

      // Find receiving vessel placed underneath burette
      const target = allEqList.find(
        e => e.id !== burette.id && e.isContainer && Math.abs(e.x + e.width / 2 - (burette.x + burette.width / 2)) < 70 && e.y > burette.y
      );

      if (target) {
        const tgtEq = nextEquipment[target.id] || target;
        const newTgtVol = Math.min(tgtEq.capacity_ml, tgtEq.volume_ml + dropAmount);
        const mergedTgt = [...tgtEq.contents];

        for (const item of transferred) {
          const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
          if (ex) {
            ex.moles += item.moles;
            ex.mass_g += item.mass_g;
          } else {
            mergedTgt.push({ ...item });
          }
        }

        const prevTgtColor = tgtEq.liquidColorHex || '#f8fafc';
        const tgtPrep = prepareVesselSimulation(
          tgtEq,
          mergedTgt,
          newTgtVol,
          tgtEq.temperature_c,
          tgtEq.isOn || false,
          !tgtEq.isSealed,
          { oxygenFraction: env.oxygenFraction },
          state.realtimeKinetics
        );
        const tgtSim = tgtPrep.simResult;
        const tgtMass = (tgtEq.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
        const updatedTgt = applySimResultToEquipment(tgtEq, newTgtVol, tgtMass, tgtSim, {
          pourContactX: 0,
          mixedness: Math.min(tgtEq.mixedness ?? 0.65, 0.45),
          activeReactionLabel: tgtPrep.activeReactionLabel,
          activeReactionProgress: tgtPrep.activeReactionProgress,
          silverMirrorProgress: tgtPrep.silverMirrorProgress,
        });
        nextEquipment[target.id] = updatedTgt;

        const traceUpdate = appendBuretteTrace(
          nextTitrationTrace,
          burette,
          tgtEq,
          updatedTgt,
          dropAmount
        );
        if (traceUpdate.nextTrace.length !== nextTitrationTrace.length ||
            traceUpdate.nextTrace[traceUpdate.nextTrace.length - 1] !== nextTitrationTrace[nextTitrationTrace.length - 1]) {
          nextTitrationTrace = traceUpdate.nextTrace;
          titrationTraceChanged = true;
        }
        nextEquipment[burette.id] = {
          ...nextEquipment[burette.id],
          cumulativeTitrated_ml: traceUpdate.nextCumulative_ml,
        };
        const isBasicDrop =
          mergedTgt.some(c => c.formula.toLowerCase().includes('phenolphthalein')) &&
          burette.contents.some(c => ['NAOH', 'KOH', 'NH3'].includes(c.formula.toUpperCase())) &&
          tgtSim.finalLiquidColorHex === '#f8fafc';
        if (tgtSim.finalLiquidColorHex !== prevTgtColor || isBasicDrop) {
          effects.vfx.triggerColorMixing(
            updatedTgt,
            prevTgtColor,
            tgtSim.finalLiquidColorHex,
            0,
            isBasicDrop ? '#ec4899' : burette.liquidColorHex || '#38bdf8'
          );
        }
      }
    }
  }

  // 2. Process thermal physics: continuous Heating & Cooling by position
  const activeBurnerFlameColors: Record<string, string | undefined> = {};
  const coupledCondenserVesselMap = new Map<string, EquipmentState>();
  for (const cond of activeCondensers) {
    let bestVessel: EquipmentState | null = null;
    let bestDx = Infinity;
    for (const eq of allEqList) {
      if (!eq.isContainer) continue;
      const curV = nextEquipment[eq.id] || eq;
      const dx = Math.abs(cond.x + cond.width / 2 - (curV.x + curV.width / 2));
      if (dx <= Math.max(curV.width * 0.65, 55) && cond.y + cond.height >= curV.y - 60 && cond.y <= curV.y + 45) {
        if (dx < bestDx) {
          bestDx = dx;
          bestVessel = curV;
        }
      }
    }
    if (bestVessel) {
      coupledCondenserVesselMap.set(cond.id, bestVessel);
    }
  }

  // Share each active burner's rated power proportionally across all aligned vessels
  const burnerAllocatedPower = new Map<string, number>();
  for (const burner of activeBurners) {
    const intensity = Math.max(0.1, burner.heatIntensity ?? 1);
    const maxBudget_W = BURNER_PEAK_POWER_W * intensity;
    const coupled: Array<{ vesselId: string; raw_W: number }> = [];
    let totalRaw_W = 0;
    for (const vessel of allEqList) {
      if (!vessel.isContainer) continue;
      const curV = nextEquipment[vessel.id] || vessel;
      const raw_W = burnerHeatToVessel(burner, curV, env);
      if (raw_W >= BURNER_MIN_EFFECTIVE_W) {
        coupled.push({ vesselId: curV.id, raw_W });
        totalRaw_W += raw_W;
      }
    }
    const scale = totalRaw_W > maxBudget_W && totalRaw_W > 0 ? maxBudget_W / totalRaw_W : 1;
    for (const item of coupled) {
      burnerAllocatedPower.set(`${burner.id}::${item.vesselId}`, item.raw_W * scale);
    }
  }

  for (const eq of allEqList) {
    if (!eq.isContainer) continue;
    const currentEq = nextEquipment[eq.id] || eq;

    let heatPower_W = 0;
    let heatingBurnerId: string | null = null;
    let burnerAligned = false;

    for (const burner of activeBurners) {
      const power = burnerAllocatedPower.get(`${burner.id}::${currentEq.id}`) ?? 0;
      if (power > 0) {
        heatPower_W += power;
        heatingBurnerId = burner.id;
        burnerAligned = true;
      }
    }
    for (const plate of activeHotPlates) {
      heatPower_W += hotPlateHeatToVessel(plate, currentEq);
    }

    const isBeingHeated = heatPower_W >= BURNER_MIN_EFFECTIVE_W;
    const hasOpenFlame = burnerAligned && isBeingHeated;
    const heatingStateChanged =
      Boolean(currentEq.isBeingHeated) !== isBeingHeated ||
      Boolean(currentEq.hasOpenFlame) !== hasOpenFlame;
    const mixState =
      (currentEq.mixedness ?? 1) < 0.995 || (currentEq.stirIntensity ?? 0) > 0.02
        ? stepMixing(currentEq, dt)
        : null;
    const nextStirIntensity = currentEq.isStirred
      ? Math.min(1, Math.max(0.7, currentEq.stirIntensity ?? 0.85))
      : Math.max(0, (currentEq.stirIntensity ?? 0) - dt * 0.45);

    const tempAwayFromAmbient = Math.abs(currentEq.temperature_c - env.temperature_c) > 0.2;
    const hasIce = currentEq.contents.some(c => c.formula.toUpperCase() === 'H2O' && c.state === 's');
    const hasTempSensitiveSalt = currentEq.contents.some(
      c =>
        (c.state === 's' || c.state === 'aq') &&
        solubilityAtTemperature_g_100ml(c.formula, currentEq.temperature_c) !== null
    );

    if (heatPower_W > 0 || tempAwayFromAmbient || heatingStateChanged || hasTempSensitiveSalt || hasIce || mixState) {
      const therm = stepVesselThermal(currentEq, dt, heatPower_W, env.temperature_c, env);
      // Apply reflux condensation if an active cooling condenser is mounted above this vessel
      const mountedCondenser = activeCondensers.find(c => coupledCondenserVesselMap.get(c.id)?.id === currentEq.id);
      if (mountedCondenser && therm.evaporatedStep_g > 0) {
        const refluxRecovery_g = therm.evaporatedStep_g * 0.92;
        therm.evaporatedStep_g = Math.max(0, therm.evaporatedStep_g - refluxRecovery_g);
        therm.volume_ml = Math.min(currentEq.capacity_ml, therm.volume_ml + refluxRecovery_g);
        therm.mass_g += refluxRecovery_g;
        const h2o = therm.contents.find(c => c.formula.toUpperCase() === 'H2O' && c.state !== 's');
        if (h2o) {
          h2o.mass_g += refluxRecovery_g;
          h2o.moles += refluxRecovery_g / 18.015;
        } else if (refluxRecovery_g > 1e-4) {
          therm.contents.push({ formula: 'H2O', moles: refluxRecovery_g / 18.015, mass_g: refluxRecovery_g, state: 'l' });
        }
      }
      const solStep = hasTempSensitiveSalt
        ? stepTemperatureSolubility(therm.contents, therm.volume_ml, therm.temperature_c, dt)
        : { contents: therm.contents };
      const tempDiff = Math.abs(therm.temperature_c - currentEq.temperature_c);
      const boilChanged = therm.isBoiling !== currentEq.isBoiling;
      const evap = therm.evaporatedStep_g > 0;
      const iceChanged = therm.contents !== currentEq.contents;
      const solChanged = solStep.contents !== therm.contents;

      if (tempDiff > 0.05 || boilChanged || evap || iceChanged || heatingStateChanged || solChanged) {
        hasChanged = true;
        const realtime = state.realtimeKinetics;

        // Computing thermal state first; in realtime kinetics mode, chemical stoichiometry advances gradually in step 2b below
        const sim = realtime
          ? null
          : runSimulationCycle(
              solStep.contents,
              therm.volume_ml,
              therm.temperature_c,
              currentEq.isOn || heatPower_W > 10,
              !currentEq.isSealed,
              { oxygenFraction: env.oxygenFraction }
            );

        // Check if any synchronous thermal reactions occurred during this tick
        if (sim && sim.reactionsOccurred.length > 0) {
          for (const rx of sim.reactionsOccurred) {
            newLogs.push({
              id: `log_thermal_rx_${nowMs}_${Math.random().toString(36).substr(2, 4)}`,
              timestamp: nowMs,
              actionType: 'REACTION',
              details_en: `Thermal Reaction: ${rx.name_en || rx.equation} (${rx.equation})`,
              details_vi: `Phản ứng nhiệt: ${rx.name_vi || rx.equation} (${rx.equation})`,
              vesselId: eq.id,
              measurements: {
                volume_ml: therm.volume_ml,
                temperature_c: therm.temperature_c,
                ph: sim.finalPh,
              },
            });
          }
          if (sim.hasGas) effects.sound.fizz(1.2);
          else effects.sound.success();
        }

        // If vessel is over burner and contains characteristic flame test elements, register flame color
        const flameColorHex = sim?.flameTestColorHex ?? currentEq.flameTestColorHex;
        if (heatingBurnerId && flameColorHex) {
          activeBurnerFlameColors[heatingBurnerId] = flameColorHex;
        }

        const heatingRate = Math.round(((therm.temperature_c - currentEq.temperature_c) / Math.max(0.01, dt)) * 10) / 10;
        const showTripod =
          hasOpenFlame && (eq.type === 'beaker' || eq.type === 'erlenmeyer_flask' || eq.type === 'evaporating_dish');

        let corkPopped = false;
        if (
          currentEq.isSealed &&
          (therm.temperature_c >= aqueousBoilingPoint(solStep.contents, therm.volume_ml, env.pressure_atm) - 0.5 ||
            therm.isBoiling ||
            sim?.gasInfo?.effervescenceSpeed === 'instant')
        ) {
          corkPopped = true;
          effects.sound.ignite();
          newLogs.push({
            id: `log_${nowMs}`,
            timestamp: nowMs,
            actionType: 'HEAT',
            details_en: `⚠️ Cork popped from ${currentEq.name} due to internal vapor pressure!`,
            details_vi: `⚠️ Nút đậy bật tung khỏi ${currentEq.name_vi} do áp suất hơi tăng cao!`,
            vesselId: eq.id,
          });
        }

        const updatedThermalEq: EquipmentState = sim
          ? applySimResultToEquipment(currentEq, therm.volume_ml, therm.mass_g, sim, {
              isBoiling: therm.isBoiling,
              boilingIntensity: therm.boilingIntensity,
              hasFumes: sim.hasFumes || therm.isBoiling || therm.temperature_c > env.temperature_c + 28,
              fumeType: sim.fumeType || (therm.isBoiling || therm.temperature_c > env.temperature_c + 28 ? 'steam' : undefined),
              fumeColorHex: sim.fumeColorHex || '#ffffff',
              isBeingHeated,
              hasOpenFlame,
              absorbedPower_W: isBeingHeated ? Math.round(heatPower_W) : 0,
              heatingRate_c_s: heatingRate,
              hasTripod: showTripod,
              isSealed: corkPopped ? false : currentEq.isSealed,
              totalEvaporated_ml: (currentEq.totalEvaporated_ml ?? 0) + therm.evaporatedStep_g,
              mixedness: mixState?.mixedness ?? currentEq.mixedness,
              dissolvingRate: mixState?.dissolvingRate ?? currentEq.dissolvingRate,
              stirIntensity: nextStirIntensity,
            })
          : {
              ...currentEq,
              contents: solStep.contents,
              volume_ml: therm.volume_ml,
              mass_g: therm.mass_g,
              temperature_c: therm.temperature_c,
              isBoiling: therm.isBoiling,
              boilingIntensity: therm.boilingIntensity,
              hasFumes: Boolean(currentEq.hasFumes) || therm.isBoiling || therm.temperature_c > env.temperature_c + 28,
              fumeType: currentEq.fumeType || (therm.isBoiling || therm.temperature_c > env.temperature_c + 28 ? 'steam' : undefined),
              fumeColorHex: currentEq.fumeColorHex || '#ffffff',
              isBeingHeated,
              hasOpenFlame,
              absorbedPower_W: isBeingHeated ? Math.round(heatPower_W) : 0,
              heatingRate_c_s: heatingRate,
              hasTripod: showTripod,
              isSealed: corkPopped ? false : currentEq.isSealed,
              totalEvaporated_ml: (currentEq.totalEvaporated_ml ?? 0) + therm.evaporatedStep_g,
              mixedness: mixState?.mixedness ?? currentEq.mixedness,
              dissolvingRate: mixState?.dissolvingRate ?? currentEq.dissolvingRate,
              stirIntensity: nextStirIntensity,
            };
        if (solStep.recrystallizedFormula === 'PbI2') {
          effects.vfx.triggerController(updatedThermalEq, 'pbi2_golden_rain', {
            targetColorHex: sim?.finalLiquidColorHex ?? updatedThermalEq.liquidColorHex,
          });
        }
        nextEquipment[eq.id] = updatedThermalEq;
      } else if (mixState || Math.abs(nextStirIntensity - (currentEq.stirIntensity ?? 0)) > 0.02) {
        hasChanged = true;
        nextEquipment[eq.id] = {
          ...currentEq,
          mixedness: mixState?.mixedness ?? currentEq.mixedness,
          dissolvingRate: mixState?.dissolvingRate ?? currentEq.dissolvingRate,
          stirIntensity: nextStirIntensity,
        };
      }
    }
  }

  // 2a-condenser. Update Condenser cooling telemetry
  for (const cond of activeCondensers) {
    const cfg = cond.condenserCooling!;
    const targetVessel = coupledCondenserVesselMap.get(cond.id);
    const hotVessel = targetVessel ? nextEquipment[targetVessel.id] || targetVessel : null;
    const mdot_kg_s = Math.max(0.05, cfg.flowRate_ml_s) / 1000;
    const Cmin = mdot_kg_s * 4184;
    const NTU = cfg.conductance_W_K / Math.max(0.1, Cmin);
    const eps = 1 - Math.exp(-Math.min(10, NTU));
    const vesselTemp = hotVessel ? hotVessel.temperature_c : cfg.coolantInletTemp_c;
    const driveTemp = Math.max(0, vesselTemp - cfg.coolantInletTemp_c);
    const dutyScale = hotVessel?.isBoiling ? 0.85 : hotVessel && vesselTemp > cfg.coolantInletTemp_c + 5 ? 0.25 : 0;
    const coolingPower_W = Math.round(eps * Cmin * driveTemp * dutyScale * 10) / 10;
    const outletTemp_c = Math.min(99, Math.round((cfg.coolantInletTemp_c + coolingPower_W / Math.max(0.1, Cmin)) * 10) / 10);
    const passedMl = (cond.coolantPassed_ml ?? 0) + cfg.flowRate_ml_s * dt;
    const heatReceivedJ = (cond.coolantHeatReceived_J ?? 0) + coolingPower_W * dt;
    hasChanged = true;
    nextEquipment[cond.id] = {
      ...(nextEquipment[cond.id] || cond),
      coolantOutletTemperature_c: outletTemp_c,
      condenserCoolingPower_W: coolingPower_W,
      coolantPassed_ml: Math.round(passedMl * 10) / 10,
      coolantHeatReceived_J: Math.round(heatReceivedJ * 10) / 10,
    };
  }

  // 2b. Step gradual reaction kinetics for live workbench vessels
  if (state.realtimeKinetics) {
    for (const eq of allEqList) {
      if (!eq.isContainer) continue;
      const curEq = nextEquipment[eq.id] || eq;
      const kTick = stepVesselKineticTick(curEq, dt, !curEq.isSealed, {
        oxygenFraction: env.oxygenFraction,
      });
      if (kTick.changed && kTick.simPartial) {
        hasChanged = true;
        nextWorkbenchEscapedGas = mergeEscapedGasMaps(nextWorkbenchEscapedGas, kTick.stepEscapedGas_g);
        const nextEq: EquipmentState = {
          ...curEq,
          ...kTick.simPartial,
        };
        nextEquipment[eq.id] = nextEq;

        if (kTick.simPartial.activeControllerIds?.length) {
          const prevPct = curEq.activeReactionProgress ?? 0;
          const nextPct = nextEq.activeReactionProgress ?? 1;
          if (prevPct === 0 && nextPct > 0) {
            const hasPhenol = nextEq.contents.some(c => c.formula.toUpperCase() === 'PHENOLPHTHALEIN');
            for (const cid of kTick.simPartial.activeControllerIds) {
              effects.vfx.triggerController(nextEq, cid, {
                hasPhenolphthalein: hasPhenol,
                targetColorHex: nextEq.liquidColorHex,
              });
            }
          }
        }

        if (kTick.shouldPlayFizz) effects.sound.fizz(0.9);
        if (kTick.shouldPlaySuccess) effects.sound.success();

        if (kTick.completedReactions.length > 0) {
          for (const rx of kTick.completedReactions) {
            newLogs.push({
              id: `log_kinetic_rx_${nowMs}_${Math.random().toString(36).substr(2, 4)}`,
              timestamp: nowMs,
              actionType: 'REACTION',
              details_en: `Completed: ${rx.name_en || rx.equation} (${rx.equation})`,
              details_vi: `Hoàn tất: ${rx.name_vi || rx.equation} (${rx.equation})`,
              vesselId: eq.id,
              measurements: {
                volume_ml: nextEq.volume_ml,
                temperature_c: nextEq.temperature_c,
                ph: nextEq.ph,
              },
            });
          }
        }
      }
    }
  }

  // Update flame test colors and deplete burner fuel
  for (const burner of activeBurners) {
    const baseBurner = nextEquipment[burner.id] || burner;
    const intensity = Math.max(0.1, baseBurner.heatIntensity ?? 1);
    const currentFuel = baseBurner.fuelLevel_ml ?? BURNER_FUEL_CAPACITY_ML;
    const nextFuel = Math.max(0, currentFuel - BURNER_FUEL_RATE_ML_S * intensity * dt);
    const ranOutOfFuel = nextFuel <= 0 && Boolean(baseBurner.isOn);
    const targetFlameColor = nextFuel > 0 ? activeBurnerFlameColors[burner.id] || undefined : undefined;

    if (
      baseBurner.gasColorHex !== targetFlameColor ||
      Math.abs(nextFuel - currentFuel) > 1e-6 ||
      ranOutOfFuel
    ) {
      hasChanged = true;
      nextEquipment[burner.id] = {
        ...baseBurner,
        fuelLevel_ml: nextFuel,
        gasColorHex: targetFlameColor,
        ...(ranOutOfFuel
          ? {
              isOn: false,
              flameState: 'OUT_OF_FUEL' as const,
            }
          : {}),
      };
    }
  }

  // 3. Process hot plate magnetic stirring & acceleration
  for (const eq of allEqList) {
    if (!eq.isContainer) continue;
    const currentEq = nextEquipment[eq.id] || eq;
    let onHotPlate = false;
    for (const plate of activeHotPlates) {
      const dx = Math.abs(currentEq.x + currentEq.width / 2 - (plate.x + plate.width / 2));
      const dy = Math.abs(currentEq.y + currentEq.height - plate.y);
      if (dx <= plate.width * 0.55 && dy <= 30) {
        onHotPlate = true;
        break;
      }
    }

    if (Boolean(currentEq.isStirred) !== onHotPlate) {
      hasChanged = true;
      nextEquipment[eq.id] = {
        ...currentEq,
        isStirred: onHotPlate,
        stirringSpeed: onHotPlate ? 0.85 : 0,
      };
    }
  }

  // 4. Process Funnel Filtration (retains precipitate, passes filtrate)
  const activeFunnels = allEqList.filter(e => e.type === 'funnel' && e.volume_ml > 0);
  for (const funnel of activeFunnels) {
    const currentFunnel = nextEquipment[funnel.id] || funnel;
    const filterRate = 0.35; // mL per second
    const dripAmount = Math.min(currentFunnel.volume_ml, filterRate * dt);
    if (dripAmount > 1e-4) {
      hasChanged = true;
      const newFunnelVol = Math.max(0, currentFunnel.volume_ml - dripAmount);

      const receiver = allEqList.find(
        e => e.id !== funnel.id && e.isContainer && Math.abs(e.x + e.width / 2 - (funnel.x + funnel.width / 2)) < 60 && e.y > funnel.y
      );

      const solids = currentFunnel.contents.filter(c => c.state === 's');
      const aqueous = currentFunnel.contents.filter(c => c.state !== 's');
      const frac = currentFunnel.volume_ml > 0 ? dripAmount / currentFunnel.volume_ml : 1.0;

      const filtratePassed: SubstanceQuantity[] = [];
      const remAqueous: SubstanceQuantity[] = [];
      for (const item of aqueous) {
        const mPass = item.moles * frac;
        const gPass = item.mass_g * frac;
        if (mPass > 0) filtratePassed.push({ ...item, moles: mPass, mass_g: gPass });
        const remM = item.moles - mPass;
        if (remM > 1e-6) remAqueous.push({ ...item, moles: remM, mass_g: item.mass_g - gPass });
      }

      const primarySolid = solids[0];
      nextEquipment[funnel.id] = {
        ...currentFunnel,
        volume_ml: Math.round(newFunnelVol * 10) / 10,
        contents: [...solids, ...remAqueous],
        filterResidueFormula: primarySolid ? primarySolid.formula : currentFunnel.filterResidueFormula,
        filterResidue_g: solids.reduce((sum, s) => sum + s.mass_g, 0),
        filtrate_ml: (currentFunnel.filtrate_ml || 0) + dripAmount,
      };

      if (receiver) {
        const tgt = nextEquipment[receiver.id] || receiver;
        const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + dripAmount);
        const mergedTgt = [...tgt.contents];
        for (const item of filtratePassed) {
          const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
          if (ex) {
            ex.moles += item.moles;
            ex.mass_g += item.mass_g;
          } else {
            mergedTgt.push({ ...item });
          }
        }
        const tgtPrep = prepareVesselSimulation(
          tgt,
          mergedTgt,
          newTgtVol,
          tgt.temperature_c,
          tgt.isOn || false,
          !tgt.isSealed,
          { oxygenFraction: env.oxygenFraction },
          state.realtimeKinetics
        );
        const tgtSim = tgtPrep.simResult;
        const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);

        nextEquipment[receiver.id] = applySimResultToEquipment(tgt, newTgtVol, tgtMass, tgtSim, {
          activeReactionLabel: tgtPrep.activeReactionLabel,
          activeReactionProgress: tgtPrep.activeReactionProgress,
          silverMirrorProgress: tgtPrep.silverMirrorProgress,
        });
      }
    }
  }

  // 5. Process Separatory Funnel Drainage (Liquid-liquid phase extraction)
  const activeSepFunnels = allEqList.filter(e => e.type === 'separatory_funnel' && e.stopcockOpen && e.volume_ml > 0);
  for (const sep of activeSepFunnels) {
    const currentSep = nextEquipment[sep.id] || sep;
    const { drainedAqueous_ml, closedAfterDrain } = separatoryFunnelDrain(currentSep, dt);
    if (drainedAqueous_ml > 1e-4) {
      hasChanged = true;
      const newSepVol = Math.max(0, currentSep.volume_ml - drainedAqueous_ml);
      const receiver = allEqList.find(
        e => e.id !== sep.id && e.isContainer && Math.abs(e.x + e.width / 2 - (sep.x + sep.width / 2)) < 70 && e.y > sep.y
      );

      const frac = currentSep.volume_ml > 0 ? drainedAqueous_ml / currentSep.volume_ml : 1.0;
      const drainedContents: SubstanceQuantity[] = [];
      const remContents: SubstanceQuantity[] = [];

      for (const item of currentSep.contents) {
        const mPass = item.moles * frac;
        const gPass = item.mass_g * frac;
        if (mPass > 0) drainedContents.push({ ...item, moles: mPass, mass_g: gPass });
        const remM = item.moles - mPass;
        if (remM > 1e-6) remContents.push({ ...item, moles: remM, mass_g: item.mass_g - gPass });
      }

      nextEquipment[sep.id] = {
        ...currentSep,
        volume_ml: Math.round(newSepVol * 10) / 10,
        contents: remContents,
        stopcockOpen: closedAfterDrain ? false : currentSep.stopcockOpen,
        hasPhaseSeparation: newSepVol > (currentSep.organicLayerVolume_ml || 0),
      };

      if (closedAfterDrain) {
        effects.sound.click();
      }

      if (receiver) {
        const tgt = nextEquipment[receiver.id] || receiver;
        const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + drainedAqueous_ml);
        const mergedTgt = [...tgt.contents];
        for (const item of drainedContents) {
          const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
          if (ex) {
            ex.moles += item.moles;
            ex.mass_g += item.mass_g;
          } else {
            mergedTgt.push({ ...item });
          }
        }
        const tgtPrep = prepareVesselSimulation(
          tgt,
          mergedTgt,
          newTgtVol,
          tgt.temperature_c,
          tgt.isOn || false,
          !tgt.isSealed,
          { oxygenFraction: env.oxygenFraction },
          state.realtimeKinetics
        );
        const tgtSim = tgtPrep.simResult;
        const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);

        nextEquipment[receiver.id] = applySimResultToEquipment(tgt, newTgtVol, tgtMass, tgtSim, {
          activeReactionLabel: tgtPrep.activeReactionLabel,
          activeReactionProgress: tgtPrep.activeReactionProgress,
          silverMirrorProgress: tgtPrep.silverMirrorProgress,
        });
      }
    }
  }

  // 6. Process Measurement Probes Dip Coupling (pH meter, thermometer, stirring rod, pH paper)
  const probeTypes: EquipmentType[] = ['ph_meter', 'thermometer', 'stirring_rod', 'ph_paper'];
  const activeProbes = allEqList.filter(e => probeTypes.includes(e.type));
  const allContainersList = Object.values(nextEquipment).filter(e => e.isContainer);

  for (const probe of activeProbes) {
    const currentProbe = nextEquipment[probe.id] || probe;
    const dip = probeDipCoupling(currentProbe, allContainersList, dt);

    let probeChanged = false;
    const updatedProbe: EquipmentState = { ...currentProbe };

    if (Boolean(currentProbe.isSubmerged) !== Boolean(dip.isSubmerged)) {
      updatedProbe.isSubmerged = dip.isSubmerged;
      updatedProbe.submergedInVesselId = dip.submergedInVesselId;
      probeChanged = true;
    }

    if (currentProbe.type === 'ph_meter' && dip.measuredPh !== undefined) {
      if (Math.abs((currentProbe.ph ?? 7.0) - dip.measuredPh) > 0.02) {
        updatedProbe.ph = dip.measuredPh;
        probeChanged = true;
      }
    } else if (currentProbe.type === 'thermometer' && dip.measuredTemp_c !== undefined) {
      if (Math.abs((currentProbe.temperature_c ?? 25.0) - dip.measuredTemp_c) > 0.1) {
        updatedProbe.temperature_c = dip.measuredTemp_c;
        probeChanged = true;
      }
    } else if (currentProbe.type === 'ph_paper' && dip.isSubmerged && dip.measuredPh !== undefined) {
      const paperColor = getIndicatorColor('universal', dip.measuredPh);
      if (currentProbe.paperColorHex !== paperColor || currentProbe.ph !== dip.measuredPh) {
        updatedProbe.ph = dip.measuredPh;
        updatedProbe.paperColorHex = paperColor;
        probeChanged = true;
      }
    } else if (dip.triggerStir && dip.submergedInVesselId) {
      const targetVessel = nextEquipment[dip.submergedInVesselId];
      if (targetVessel && !targetVessel.isStirred) {
        nextEquipment[dip.submergedInVesselId] = {
          ...targetVessel,
          isStirred: true,
          stirringSpeed: 1.0,
        };
        hasChanged = true;
      }
    }

    if (probeChanged) {
      nextEquipment[probe.id] = updatedProbe;
      hasChanged = true;
    }
  }

  // 7. Process Headspace Pressure (PV=nRT), Cork Pop, Thermal Shock Glass Shatter, Condensation & Bumping
  for (const eq of Object.values(nextEquipment)) {
    if (!eq.isContainer) continue;
    const prevEq = currentEquipment[eq.id] || eq;
    const bp = aqueousBoilingPoint(eq.contents, eq.volume_ml, env.pressure_atm);
    const phys = stepVesselPressureAndDamage(eq, dt, prevEq.temperature_c, bp, env);

    if (phys.corkPopped) {
      effects.sound.playCorkPop();
      hasChanged = true;
    }
    if (phys.isShattered && !prevEq.isShattered) {
      effects.vfx.triggerGlassShatter(eq);
      hasChanged = true;
      if (phys.spillCreated) newlyCreatedSpills.push(phys.spillCreated);
    }
    if (phys.bumpingIntensity > 0.3) {
      effects.sound.playBumpingSurge();
    }

    if (
      Math.abs((eq.internalPressure_atm ?? env.pressure_atm) - phys.internalPressure_atm) > 0.01 ||
      Boolean(eq.isSealed) !== phys.isSealed ||
      Boolean(eq.isShattered) !== phys.isShattered ||
      Math.abs((eq.wallCondensation ?? 0) - phys.wallCondensation) > 0.02
    ) {
      hasChanged = true;
      nextEquipment[eq.id] = {
        ...eq,
        internalPressure_atm: phys.internalPressure_atm,
        freeGasMoles: phys.freeGasMoles,
        isSealed: phys.isSealed,
        isShattered: phys.isShattered,
        wallCondensation: phys.wallCondensation,
        bumpingIntensity: phys.bumpingIntensity,
        superheat_c: phys.superheat_c,
        evaporativeStain: phys.evaporativeStain ?? eq.evaporativeStain,
        volume_ml: phys.isShattered ? 0 : eq.volume_ml,
        contents: phys.isShattered ? [] : eq.contents,
      };
    }
  }

  // 9. Process Sponge Wiping & Active Spill Puddle Chemistry on Workbench
  const prevSpills = state.spillPuddles;
  let currentSpills = newlyCreatedSpills.length > 0 ? [...prevSpills, ...newlyCreatedSpills] : prevSpills;
  const sponges = Object.values(nextEquipment).filter(e => e.type === 'sponge');
  if (sponges.length > 0 && currentSpills.length > 0) {
    const beforeCount = currentSpills.length;
    currentSpills = currentSpills.filter(sp => {
      const wiped = sponges.some(
        s => Math.hypot(s.x + s.width / 2 - sp.x, s.y + s.height / 2 - sp.y) < (sp.radius_px ?? 35) + 28
      );
      return !wiped;
    });
    if (currentSpills.length < beforeCount) {
      effects.sound.playSpongeWipe();
    }
  }
  const steppedSpills = stepSpillPuddles(currentSpills, dt);

  // 10. Evaluate live safety alerts and auto-clear resolved runtime warnings
  const activeSafetyAlerts = evaluateWorkbenchSafety(Object.values(nextEquipment), state.ppe);
  const transientAlerts = state.safetyAlerts.filter(
    a => a.code === 'SAFE_ACID_DILUTION' && nowMs - a.timestamp < 6500
  );
  const nextSafetyAlerts = [...transientAlerts, ...newlyTriggeredAlerts, ...activeSafetyAlerts];
  const prevAlerts = state.safetyAlerts;
  const alertsChanged =
    nextSafetyAlerts.length !== prevAlerts.length ||
    nextSafetyAlerts.some((a, i) => prevAlerts[i]?.code !== a.code || prevAlerts[i]?.id !== a.id);

  const pourChanged =
    nextActivePour !== state.activePour ||
    nextActivePourVfx !== state.activePourVfx ||
    externalDoseChanged;

  const shouldApplyPatch =
    hasChanged ||
    pourChanged ||
    newlyCreatedSpills.length > 0 ||
    steppedSpills.length !== prevSpills.length ||
    alertsChanged;

  return {
    shouldApplyPatch,
    spillsOnlyChanged: !shouldApplyPatch && steppedSpills !== prevSpills,
    patch: {
      equipment: nextEquipment,
      activePour: nextActivePour,
      activePourVfx: nextActivePourVfx,
      activeExternalDoses: externalDoseChanged ? remainingExternalDoses : state.activeExternalDoses,
      workbenchEscapedGas_g: nextWorkbenchEscapedGas,
      spillPuddles: steppedSpills,
      safetyAlerts: nextSafetyAlerts,
      ...(titrationTraceChanged ? { titrationTrace: nextTitrationTrace } : {}),
    },
    newLogs,
    geminiCheckVesselIds: [...geminiCheckVesselIds],
  };
}
