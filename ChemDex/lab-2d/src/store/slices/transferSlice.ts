import { ActiveExternalPour2D } from '../../types/equipment';
import { SubstanceQuantity } from '../../types/chemistry';
import { LabLogEntry } from '../../types/experiment';
import { findChemicalByFormula, findChemicalById } from '../../data/chemicals';
import { computeMolarMass } from '../../chemistry/core/formula';
import { appendBuretteTrace } from '../../chemistry/equilibrium/titrationEngine';
import { prepareVesselSimulation } from '../../chemistry/reactions/kineticsSolver';
import { checkAcidDilutionHazard } from '../../engine/safetyEngine2D';
import { soundEngine } from '../../services/soundEngine';
import { reactionRuntime2D } from '../../vfx/ReactionRuntime2D';
import { useLabEnvironment } from '../useLabEnvironment';
import {
  applyChemicalDoseDeltaOnVessel,
  applySimResultToEquipment,
  detectExternalDeliveryMode,
  mergeEscapedGasMaps,
  pushSnapshot,
  updateInitialSolidMapOnAdd,
} from '../labStoreHelpers';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type TransferSlice = Pick<
  LabStoreState,
  | 'activeTool'
  | 'pipetteBuffer'
  | 'activePour'
  | 'activeExternalDoses'
  | 'spatulaScoop'
  | 'activeLitmusVesselId'
  | 'workbenchEscapedGas_g'
  | 'wasteMass_g'
  | 'activePourVfx'
  | 'setActiveTool'
  | 'setSpatulaScoop'
  | 'setActiveLitmusVesselId'
  | 'clearPipette'
  | 'drawWithPipette'
  | 'dispenseFromPipette'
  | 'triggerDirectPour'
  | 'injectCustomSubstance'
  | 'addChemicalToEquipment'
  | 'triggerExternalChemicalPour'
  | 'squirtWashBottle'
  | 'dispenseSpatulaToVessel'
  | 'transferMaterial'
  | 'toggleBuretteStopcock'
  | 'addDistilledWater'
>;

export const createTransferSlice: LabSliceCreator<TransferSlice> = (set, get) => ({
  activeTool: 'select',
  pipetteBuffer: null,
  activePour: null,
  activeExternalDoses: [],
  spatulaScoop: null,
  activeLitmusVesselId: null,
  workbenchEscapedGas_g: {},
  wasteMass_g: 0,
  activePourVfx: null,

  setActiveTool: (activeTool) => set({ activeTool }),
  setSpatulaScoop: (spatulaScoop) => set({ spatulaScoop }),
  setActiveLitmusVesselId: (activeLitmusVesselId) => set({ activeLitmusVesselId }),
  clearPipette: () => set({ pipetteBuffer: null }),

  drawWithPipette: (vesselId, amount_ml = 10) => {
    const src = get().equipment[vesselId];
    if (!src || !src.isContainer || src.volume_ml <= 0.1) return;
    const drawVol = Math.min(amount_ml, src.volume_ml, 10);
    const frac = drawVol / src.volume_ml;
    const drawn: SubstanceQuantity[] = [];
    const remaining: SubstanceQuantity[] = [];
    for (const item of src.contents) {
      if (item.state === 's' || item.state === 'g') {
        remaining.push({ ...item });
        continue;
      }
      const mMove = item.moles * frac;
      const gMove = item.mass_g * frac;
      if (mMove > 1e-9) drawn.push({ ...item, moles: mMove, mass_g: gMove });
      const remM = item.moles - mMove;
      if (remM > 1e-8 || item.formula === 'H2O') {
        remaining.push({ ...item, moles: remM, mass_g: item.mass_g - gMove });
      }
    }
    const newSrcVol = Math.max(0, src.volume_ml - drawVol);
    const env = useLabEnvironment.getState().environment;
    const srcPrep = prepareVesselSimulation(
      src,
      remaining,
      newSrcVol,
      src.temperature_c,
      src.isOn || false,
      !src.isSealed,
      { oxygenFraction: env.oxygenFraction },
      get().realtimeKinetics
    );
    const srcSim = srcPrep.simResult;
    const srcMass = (src.tare_g || 0) + srcSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const primaryFormula = drawn.find(d => d.formula !== 'H2O')?.formula || 'H2O';
    soundEngine.drip();
    set(s => ({
      ...pushSnapshot(s),
      pipetteBuffer: {
        volume_ml: Math.round(drawVol * 10) / 10,
        colorHex: src.liquidColorHex || '#38bdf8',
        formula: primaryFormula,
        contents: drawn,
        sourceName: src.name_vi || src.name,
      },
      equipment: {
        ...s.equipment,
        [vesselId]: applySimResultToEquipment(src, newSrcVol, srcMass, srcSim, {
          activeReactionLabel: srcPrep.activeReactionLabel,
          activeReactionProgress: srcPrep.activeReactionProgress,
          silverMirrorProgress: srcPrep.silverMirrorProgress,
        }),
      },
    }));
  },

  dispenseFromPipette: (targetId, amount_ml, contactX = 0) => {
    const buf = get().pipetteBuffer;
    const tgt = get().equipment[targetId];
    if (!buf || buf.volume_ml <= 0 || !tgt || !tgt.isContainer) return;
    const dispenseVol = Math.min(buf.volume_ml, amount_ml ?? buf.volume_ml, Math.max(0, tgt.capacity_ml - tgt.volume_ml));
    if (dispenseVol <= 0.01) return;
    const frac = dispenseVol / buf.volume_ml;
    const mergedTgt = structuredClone(tgt.contents);
    const remBuf: SubstanceQuantity[] = [];
    for (const item of buf.contents) {
      const mAdd = item.moles * frac;
      const gAdd = item.mass_g * frac;
      const ex = mergedTgt.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
      if (ex) {
        ex.moles += mAdd;
        ex.mass_g += gAdd;
      } else {
        mergedTgt.push({ ...item, moles: mAdd, mass_g: gAdd });
      }
      if (item.moles - mAdd > 1e-8) {
        remBuf.push({ ...item, moles: item.moles - mAdd, mass_g: item.mass_g - gAdd });
      }
    }
    const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + dispenseVol);
    const env = useLabEnvironment.getState().environment;
    const tgtPrep = prepareVesselSimulation(
      tgt,
      mergedTgt,
      newTgtVol,
      tgt.temperature_c,
      tgt.isOn || false,
      !tgt.isSealed,
      { oxygenFraction: env.oxygenFraction },
      get().realtimeKinetics
    );
    const tgtSim = tgtPrep.simResult;
    const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const prevColor = tgt.liquidColorHex || '#f8fafc';
    const nextColor = tgtSim.finalLiquidColorHex;
    const updatedTarget = applySimResultToEquipment(tgt, newTgtVol, tgtMass, tgtSim, {
      pourContactX: Math.max(-0.85, Math.min(0.85, contactX)),
      mixedness: Math.min(tgt.mixedness ?? 0.65, 0.35),
      activeReactionLabel: tgtPrep.activeReactionLabel,
      activeReactionProgress: tgtPrep.activeReactionProgress,
      silverMirrorProgress: tgtPrep.silverMirrorProgress,
    });
    reactionRuntime2D.triggerColorMixing(updatedTarget, prevColor, nextColor, contactX, buf.colorHex);
    if (tgtSim.activeControllerIds?.length) {
      const hasPhenol = mergedTgt.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
      for (const cid of tgtSim.activeControllerIds) {
        reactionRuntime2D.triggerController(updatedTarget, cid, { hasPhenolphthalein: hasPhenol, targetColorHex: nextColor });
      }
    }
    soundEngine.drip();
    const remVol = Math.max(0, buf.volume_ml - dispenseVol);
    set(s => ({
      ...pushSnapshot(s),
      pipetteBuffer: remVol > 0.05 ? { ...buf, volume_ml: Math.round(remVol * 10) / 10, contents: remBuf } : null,
      equipment: {
        ...s.equipment,
        [targetId]: updatedTarget,
      },
    }));
    get().checkStepProgress();
  },

  triggerDirectPour: (sourceId, targetId) => {
    const src = get().equipment[sourceId];
    const tgt = get().equipment[targetId];
    if (!src || !tgt || !tgt.isContainer || src.volume_ml <= 0) return;

    const pourAmount = Math.min(src.volume_ml, 25);
    const contactX = Math.max(-0.75, Math.min(0.75, (src.x + src.width / 2 - (tgt.x + tgt.width / 2)) / Math.max(40, tgt.width * 0.5)));
    set({
      activePour: {
        sourceId,
        targetId,
        rate_ml_s: 36,
        remaining_ml: pourAmount,
        startedAt: Date.now(),
        tilt_deg: 56,
      },
      activePourVfx: {
        sourceId,
        targetId,
        startX: src.x + src.width / 2,
        startY: src.y + 15,
        endX: tgt.x + tgt.width / 2 + contactX * tgt.width * 0.28,
        endY: tgt.y + Math.max(24, tgt.height * 0.35),
        liquidColorHex: src.liquidColorHex || '#38bdf8',
      },
    });
    soundEngine.pour(0.7);
  },

  injectCustomSubstance: (equipmentId, formula, phaseState, amount_ml = 20, amount_g = 1.0, colorHex = '#f8fafc') => {
    const existing = findChemicalByFormula(formula);
    if (existing) {
      get().addChemicalToEquipment(equipmentId, existing.id, amount_ml, amount_g);
      return;
    }

    const eq = get().equipment[equipmentId];
    if (!eq || !eq.isContainer) return;

    const isLiquid = phaseState === 'aq' || phaseState === 'l';
    const volumeAdded = isLiquid ? Math.min(Math.max(5, amount_ml), Math.max(0, eq.capacity_ml - eq.volume_ml)) : 0;
    const molarMass = computeMolarMass(formula) || 60;
    const soluteMoles = isLiquid ? 0.2 * (volumeAdded / 1000) : Math.max(0.01, amount_g) / molarMass;
    const soluteMass = soluteMoles * molarMass;
    const newVolume = eq.volume_ml + volumeAdded;
    const nextContents = eq.contents.map((c) => ({ ...c }));

    const ex = nextContents.find((c) => c.formula.toUpperCase() === formula.toUpperCase() && c.state === phaseState);
    if (ex) {
      ex.moles += soluteMoles;
      ex.mass_g += soluteMass;
    } else {
      nextContents.push({
        formula,
        state: phaseState,
        moles: soluteMoles,
        mass_g: soluteMass,
        concentration_M: phaseState === 'aq' && newVolume > 0 ? (soluteMoles * 1000) / newVolume : undefined,
      });
    }

    if (phaseState === 'aq' && volumeAdded > 0) {
      const solventMass = Math.max(0, volumeAdded - soluteMass);
      if (solventMass > 0) {
        const wEx = nextContents.find((c) => c.formula.toUpperCase() === 'H2O');
        const wMoles = solventMass / 18.015;
        if (wEx) {
          wEx.moles += wMoles;
          wEx.mass_g += solventMass;
        } else {
          nextContents.push({ formula: 'H2O', state: 'l', moles: wMoles, mass_g: solventMass });
        }
      }
    }

    const env = useLabEnvironment.getState().environment;
    const prevColor = eq.liquidColorHex || '#f8fafc';
    const nextInitSolidMap = updateInitialSolidMapOnAdd(
      eq.initialSolidMassByFormula,
      eq.contents,
      formula,
      soluteMass,
      phaseState === 's'
    );
    const prep = prepareVesselSimulation(
      { ...eq, initialSolidMassByFormula: nextInitSolidMap },
      nextContents,
      newVolume,
      eq.temperature_c,
      eq.isOn || false,
      !eq.isSealed,
      { oxygenFraction: env.oxygenFraction },
      get().realtimeKinetics
    );
    const simResult = prep.simResult;
    const newTotalMass = (eq.tare_g || 0) + simResult.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const updatedVessel = applySimResultToEquipment(eq, newVolume, newTotalMass, simResult, {
      initialSolidMassByFormula: nextInitSolidMap,
      pourContactX: 0,
      mixedness: Math.min(eq.mixedness ?? 0.6, 0.35),
      activeReactionLabel: prep.activeReactionLabel,
      activeReactionProgress: prep.activeReactionProgress,
      silverMirrorProgress: prep.silverMirrorProgress,
    });

    reactionRuntime2D.triggerColorMixing(updatedVessel, prevColor, simResult.finalLiquidColorHex, 0, colorHex);
    if (simResult.activeControllerIds?.length) {
      const hasPhenol = nextContents.some((c) => c.formula.toLowerCase().includes('phenolphthalein'));
      for (const cid of simResult.activeControllerIds) {
        reactionRuntime2D.triggerController(updatedVessel, cid, {
          hasPhenolphthalein: hasPhenol,
          targetColorHex: simResult.finalLiquidColorHex,
        });
      }
    }

    set((state) => ({
      ...pushSnapshot(state),
      workbenchEscapedGas_g: mergeEscapedGasMaps(state.workbenchEscapedGas_g, simResult.escapedGas_g),
      equipment: {
        ...state.equipment,
        [equipmentId]: updatedVessel,
      },
      history: [
        ...state.history,
        {
          id: `log_custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          timestamp: Date.now(),
          actionType: 'ADD_CHEMICAL',
          details_en: `Added ${formula} to ${eq.name}`,
          details_vi: `Thêm ${formula} vào ${eq.name_vi}`,
          vesselId: equipmentId,
        },
      ],
    }));
    get().checkStepProgress();
  },

  addChemicalToEquipment: (equipmentId, chemicalId, amount_ml = 20, amount_g = 1.0) => {
    const eq = get().equipment[equipmentId];
    const chem = findChemicalById(chemicalId);
    if (!eq || !chem || !eq.isContainer) return;
    if (!Number.isFinite(amount_ml) || !Number.isFinite(amount_g) || amount_ml < 0 || amount_g < 0) return;

    const acidDilutionAlert = checkAcidDilutionHazard(chem.formula, eq);
    if (acidDilutionAlert) {
      soundEngine.playWarningAlarm();
      reactionRuntime2D.triggerController(eq, 'water_into_conc_h2so4_explosion');
      set(s => ({ safetyAlerts: [...s.safetyAlerts.slice(-4), acidDilutionAlert] }));
    }

    const env = useLabEnvironment.getState().environment;
    const {
      updatedVessel,
      simResult,
      volumeAdded,
      isLiquid,
    } = applyChemicalDoseDeltaOnVessel(
      eq,
      chem,
      amount_ml,
      amount_g,
      0.0,
      { oxygenFraction: env.oxygenFraction },
      get().realtimeKinetics,
      true
    );

    if (simResult.reactionsOccurred.length > 0) {
      if (simResult.isExplosion) {
        soundEngine.playExplosion(1.0);
      } else if (simResult.hasGas) {
        soundEngine.fizz(1.3);
      } else {
        soundEngine.success();
      }
    } else if (!isLiquid) {
      soundEngine.playSolidDrop();
    } else {
      soundEngine.pour(0.4);
    }

    const rxLogs: LabLogEntry[] = simResult.reactionsOccurred.map(rx => ({
      id: `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      actionType: 'REACTION' as const,
      reactionId: rx.reactionId,
      details_en: `Reaction: ${rx.name_en || rx.observable_en || rx.equation} (${rx.equation})`,
      details_vi: `Phản ứng: ${rx.name_vi || rx.observable_vi || rx.equation} (${rx.equation})`,
      vesselId: equipmentId,
      measurements: {
        volume_ml: updatedVessel.volume_ml,
        temperature_c: simResult.finalTemperature_c,
        ph: simResult.finalPh,
      },
    }));

    set(state => ({
      ...pushSnapshot(state),
      workbenchEscapedGas_g: mergeEscapedGasMaps(state.workbenchEscapedGas_g, simResult.escapedGas_g),
      equipment: {
        ...state.equipment,
        [equipmentId]: updatedVessel,
      },
      history: [
        ...state.history,
        ...rxLogs,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'ADD_CHEMICAL',
          details_en: `Added ${isLiquid ? `${amount_ml} mL` : `${amount_g} g`} of ${chem.name_en} to ${eq.name}`,
          details_vi: `Đã thêm ${isLiquid ? `${amount_ml} mL` : `${amount_g} g`} ${chem.name_vi} vào ${eq.name_vi}`,
          vesselId: equipmentId,
          measurements: {
            volume_ml: updatedVessel.volume_ml || volumeAdded,
            temperature_c: simResult.finalTemperature_c,
            ph: simResult.finalPh,
          },
        },
      ],
    }));

    get().checkStepProgress();

    if (simResult.reactionsOccurred.length === 0 && simResult.updatedContents.length >= 2) {
      get().triggerGeminiReactionCheck(equipmentId);
    }
  },

  triggerExternalChemicalPour: (equipmentId, chemicalId, amount_ml = 20, amount_g = 1.0, contactXNorm = 0) => {
    const eq = get().equipment[equipmentId];
    const chem = findChemicalById(chemicalId);
    if (!eq || !chem || !eq.isContainer) return;
    if (!Number.isFinite(amount_ml) || !Number.isFinite(amount_g) || amount_ml < 0 || amount_g < 0) return;

    const isLiquid = chem.phase_STP === 'aqueous' || chem.phase_STP === 'liquid';
    const deliveryMode = detectExternalDeliveryMode(chem, amount_ml, isLiquid);
    const totalAmount_ml = isLiquid ? Math.max(0.2, Math.min(amount_ml, Math.max(0, eq.capacity_ml - eq.volume_ml + 5))) : 0;
    const totalAmount_g = isLiquid ? 0 : Math.max(0.05, amount_g);
    const totalTime_s =
      deliveryMode === 'dropper'
        ? 1.05
        : deliveryMode === 'spatula'
          ? 0.95
          : Math.max(0.9, Math.min(1.75, 0.7 + totalAmount_ml / 80));

    const dose: ActiveExternalPour2D = {
      id: `ext_pour_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      targetId: equipmentId,
      chemicalId: chem.id,
      formula: chem.formula,
      name_vi: chem.name_vi,
      name_en: chem.name_en,
      colorHex: chem.colorHex || '#38bdf8',
      deliveryMode,
      totalAmount_ml,
      totalAmount_g,
      deliveredFraction: 0,
      approachProgress: 0,
      totalTime_s,
      contactXNorm: Math.max(-0.75, Math.min(0.75, contactXNorm)),
      startedAt: Date.now(),
      hazardChecked: false,
      firstBurstTriggered: false,
    };

    set(state => ({
      ...pushSnapshot(state),
      simulationPaused: false,
      activeExternalDoses: [
        ...state.activeExternalDoses.filter(d => d.targetId !== equipmentId || d.deliveredFraction > 0.95),
        dose,
      ],
    }));
  },

  squirtWashBottle: (washBottleId, targetId, amount_ml) => {
    const wb = get().equipment[washBottleId];
    const tgt = get().equipment[targetId];
    if (!wb || !tgt || wb.type !== 'wash_bottle' || !tgt.isContainer) return;
    const squirtMl = Math.min(wb.volume_ml, Math.max(0.5, amount_ml ?? wb.washDose_ml ?? 10));
    if (squirtMl <= 0.05) return;

    const remainingVol = Math.max(0, wb.volume_ml - squirtMl);
    const remWaterMass = remainingVol;
    set(state => ({
      equipment: {
        ...state.equipment,
        [washBottleId]: {
          ...wb,
          volume_ml: Math.round(remainingVol * 10) / 10,
          mass_g: Math.round(((wb.tare_g || 0) + remWaterMass) * 100) / 100,
          contents: remWaterMass > 0.01 ? [{ formula: 'H2O', moles: remWaterMass / 18.015, mass_g: remWaterMass, state: 'l' }] : [],
          washTargetId: targetId,
          washDose_ml: squirtMl,
        },
      },
    }));
    get().triggerExternalChemicalPour(targetId, 'chem-h2o', squirtMl, 0, 0.15);
  },

  dispenseSpatulaToVessel: (vesselId, amount_g, contactXNorm = 0) => {
    const scoop = get().spatulaScoop;
    if (!scoop) return;
    const doseG = Math.min(scoop.mass_g, Math.max(0.1, amount_g ?? scoop.mass_g));
    get().triggerExternalChemicalPour(vesselId, scoop.chemicalId, 0, doseG, contactXNorm);
    const remainingG = Math.round((scoop.mass_g - doseG) * 100) / 100;
    set({
      spatulaScoop: remainingG > 0.05 ? { ...scoop, mass_g: remainingG } : null,
    });
  },

  transferMaterial: (sourceId, targetId, amount_ml, _amount_g, transferAll = false) => {
    const src = get().equipment[sourceId];
    const tgt = get().equipment[targetId];
    if (!src || !tgt || !tgt.isContainer || src.contents.length === 0) return;

    const transferVol = transferAll
      ? src.volume_ml
      : Math.min(src.volume_ml, amount_ml !== undefined ? amount_ml : src.volume_ml);

    if (transferVol <= 0 && src.contents.every(c => c.state === 'aq')) return;

    const fraction = src.volume_ml > 0 ? Math.min(1.0, transferVol / src.volume_ml) : 1.0;

    const transferredItems: SubstanceQuantity[] = [];
    const remainingSrcItems: SubstanceQuantity[] = [];

    for (const item of src.contents) {
      const molesToMove = item.moles * fraction;
      const massToMove = item.mass_g * fraction;

      if (molesToMove > 0) {
        transferredItems.push({
          ...item,
          moles: molesToMove,
          mass_g: massToMove,
        });
      }

      const remainingMoles = item.moles - molesToMove;
      if (remainingMoles > 1e-6) {
        remainingSrcItems.push({
          ...item,
          moles: remainingMoles,
          mass_g: item.mass_g - massToMove,
        });
      }
    }

    const newSrcVol = Math.max(0, src.volume_ml - transferVol);
    const srcMass = (src.tare_g || 0) + remainingSrcItems.reduce((s, c) => s + c.mass_g, 0);

    const newTgtVol = Math.min(tgt.capacity_ml, tgt.volume_ml + transferVol);
    const mergedTgtContents: SubstanceQuantity[] = [...tgt.contents];

    for (const item of transferredItems) {
      const existing = mergedTgtContents.find(c => c.formula.toUpperCase() === item.formula.toUpperCase());
      if (existing) {
        existing.moles += item.moles;
        existing.mass_g += item.mass_g;
      } else {
        mergedTgtContents.push({ ...item });
      }
    }

    const primarySourceFormula = src.contents[0]?.formula || 'H2O';
    const acidDilutionAlert = checkAcidDilutionHazard(primarySourceFormula, tgt);
    if (acidDilutionAlert) {
      soundEngine.playWarningAlarm();
      reactionRuntime2D.triggerController(tgt, 'water_into_conc_h2so4_explosion');
      set(s => ({ safetyAlerts: [...s.safetyAlerts.slice(-4), acidDilutionAlert] }));
    }

    const overflow_ml = Math.max(0, tgt.volume_ml + transferVol - tgt.capacity_ml);
    if (overflow_ml > 0.2) {
      get().addSpillPuddle(
        tgt.x + tgt.width / 2,
        tgt.y + tgt.height - 4,
        overflow_ml,
        src.liquidColorHex || '#38bdf8',
        primarySourceFormula,
        src.ph
      );
    }

    const env = useLabEnvironment.getState().environment;
    const prevTgtColor = tgt.liquidColorHex || '#f8fafc';
    const tgtPrep = prepareVesselSimulation(
      tgt,
      mergedTgtContents,
      newTgtVol,
      tgt.temperature_c,
      tgt.isOn || false,
      !tgt.isSealed,
      { oxygenFraction: env.oxygenFraction },
      get().realtimeKinetics
    );
    const tgtSim = tgtPrep.simResult;
    const tgtMass = (tgt.tare_g || 0) + tgtSim.updatedContents.reduce((s, c) => s + c.mass_g, 0);
    const contactX = Math.max(-0.85, Math.min(0.85, (src.x + src.width / 2 - (tgt.x + tgt.width / 2)) / Math.max(40, tgt.width * 0.5)));
    const updatedTargetEq = applySimResultToEquipment(tgt, newTgtVol, tgtMass, tgtSim, {
      pourContactX: contactX,
      mixedness: Math.min(tgt.mixedness ?? 0.65, 0.35),
      activeReactionLabel: tgtPrep.activeReactionLabel,
      activeReactionProgress: tgtPrep.activeReactionProgress,
      silverMirrorProgress: tgtPrep.silverMirrorProgress,
    });

    reactionRuntime2D.triggerColorMixing(updatedTargetEq, prevTgtColor, tgtSim.finalLiquidColorHex, contactX, src.liquidColorHex || '#38bdf8');

    if (tgtSim.activeControllerIds?.length) {
      const hasPhenol = mergedTgtContents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
      for (const cid of tgtSim.activeControllerIds) {
        reactionRuntime2D.triggerController(updatedTargetEq, cid, {
          hasPhenolphthalein: hasPhenol,
          targetColorHex: tgtSim.finalLiquidColorHex,
        });
      }
    }

    if (tgtSim.reactionsOccurred.length > 0) {
      if (tgtSim.isExplosion) {
        soundEngine.playExplosion(1.0);
      } else if (tgtSim.hasGas) {
        soundEngine.fizz(1.3);
      } else {
        soundEngine.success();
      }
    } else {
      soundEngine.pour(0.5);
    }

    const rxLogs: LabLogEntry[] = tgtSim.reactionsOccurred.map(rx => ({
      id: `log_rx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      actionType: 'REACTION' as const,
      reactionId: rx.reactionId,
      details_en: `Reaction: ${rx.name_en || rx.observable_en || rx.equation} (${rx.equation})`,
      details_vi: `Phản ứng: ${rx.name_vi || rx.observable_vi || rx.equation} (${rx.equation})`,
      vesselId: targetId,
      measurements: {
        volume_ml: newTgtVol,
        temperature_c: tgtSim.finalTemperature_c,
        ph: tgtSim.finalPh,
      },
    }));

    set(state => {
      const buretteTraceUpdate =
        src.type === 'burette' && transferVol > 0
          ? appendBuretteTrace(state.titrationTrace, src, tgt, updatedTargetEq, transferVol)
          : null;

      return {
        ...pushSnapshot(state),
        equipment: {
          ...state.equipment,
          [sourceId]: {
            ...src,
            volume_ml: Math.round(newSrcVol * 1000) / 1000,
            mass_g: Math.round(srcMass * 100) / 100,
            contents: remainingSrcItems,
            hasPrecipitate: remainingSrcItems.some(c => c.state === 's'),
            ...(buretteTraceUpdate ? { cumulativeTitrated_ml: buretteTraceUpdate.nextCumulative_ml } : {}),
          },
          [targetId]: updatedTargetEq,
        },
        ...(buretteTraceUpdate ? { titrationTrace: buretteTraceUpdate.nextTrace } : {}),
        isTransferModalOpen: false,
        history: [
          ...state.history,
          ...rxLogs,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'TRANSFER',
            details_en: `Poured ${transferVol.toFixed(1)} mL from ${src.name} to ${tgt.name}`,
            details_vi: `Đã rót ${transferVol.toFixed(1)} mL từ ${src.name_vi} sang ${tgt.name_vi}`,
            vesselId: targetId,
            measurements: {
              volume_ml: newTgtVol,
              temperature_c: tgtSim.finalTemperature_c,
              ph: tgtSim.finalPh,
            },
          },
        ],
      };
    });

    get().checkStepProgress();

    if (tgtSim.reactionsOccurred.length === 0 && tgtSim.updatedContents.length >= 2) {
      get().triggerGeminiReactionCheck(targetId);
    }
  },

  toggleBuretteStopcock: (id) => {
    const item = get().equipment[id];
    if (!item || (item.type !== 'burette' && item.type !== 'separatory_funnel')) return;

    const nextOpen = !item.stopcockOpen;
    if (nextOpen) soundEngine.drip();

    const allEq = Object.values(get().equipment);
    const target = allEq.find(
      e => e.id !== id && e.isContainer && Math.abs(e.x + e.width / 2 - (item.x + item.width / 2)) < 80 && e.y > item.y
    );

    if (target && item.volume_ml > 0 && item.type === 'burette') {
      get().transferMaterial(id, target.id, 1.0, undefined, false);
    }

    set(state => ({
      equipment: {
        ...state.equipment,
        [id]: {
          ...state.equipment[id],
          stopcockOpen: nextOpen,
        },
      },
    }));
  },

  addDistilledWater: (id, amount_ml = 25) => {
    get().addChemicalToEquipment(id, 'chem-h2o', amount_ml);
  },
});
