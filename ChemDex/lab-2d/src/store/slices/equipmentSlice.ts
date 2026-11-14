import { EquipmentState } from '../../types/equipment';
import { prepareVesselSimulation } from '../../chemistry/reactions/kineticsSolver';
import { kineticRuntime2D } from '../../chemistry/reactions/kineticsSolver';
import { reactionRuntime2D } from '../../vfx/ReactionRuntime2D';
import { soundEngine } from '../../services/soundEngine';
import { EQUIPMENT_SPECS, pushSnapshot } from '../labStoreHelpers';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type EquipmentSlice = Pick<
  LabStoreState,
  | 'equipment'
  | 'selectedEquipmentId'
  | 'selectEquipment'
  | 'addEquipment'
  | 'removeEquipment'
  | 'updatePosition'
  | 'toggleHeat'
  | 'tareEquipment'
  | 'emptyEquipment'
  | 'toggleStir'
  | 'toggleSeal'
  | 'setCondenserCooling'
>;

export const createEquipmentSlice: LabSliceCreator<EquipmentSlice> = (set, get) => ({
  equipment: {},
  selectedEquipmentId: null,

  selectEquipment: (id) => set({ selectedEquipmentId: id }),

  addEquipment: (type, customX, customY) => {
    const id = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const spec = EQUIPMENT_SPECS[type];
    const existingCount = Object.keys(get().equipment).length;
    const isHeater = type === 'bunsen_burner' || type === 'hot_plate';
    const slotsX = [290, 145, 435, 215];
    const x =
      customX !== undefined
        ? customX
        : isHeater
          ? 305 + (existingCount % 3 === 0 ? 0 : existingCount % 3 === 1 ? -145 : 145)
          : slotsX[existingCount % 4] + (Math.floor(existingCount / 4) % 2) * 35;
    const y =
      customY !== undefined
        ? customY
        : isHeater
          ? 295
          : 165 + Math.floor(existingCount / 4) * 40;

    const newEquipment: EquipmentState = {
      id,
      name: spec.name,
      name_vi: spec.name_vi,
      type,
      x,
      y,
      width: spec.width,
      height: spec.height,
      capacity_ml: spec.capacity_ml,
      isContainer: spec.isContainer,
      temperature_c: 25.0,
      contents: type === 'wash_bottle' ? [{ formula: 'H2O', moles: 250 / 18.015, mass_g: 250, state: 'l' }] : [],
      volume_ml: type === 'wash_bottle' ? 250 : 0,
      mass_g: type === 'wash_bottle' ? spec.tare_g + 250 : spec.tare_g,
      tare_g: spec.tare_g,
      ph: 7.0,
      isOn: false,
      paperColorHex: type === 'ph_paper' ? '#fbbf24' : undefined,
      condenserCooling:
        type === 'condenser'
          ? {
              coolingEnabled: true,
              flowRate_ml_s: 2.5,
              coolantInletTemp_c: 15.0,
              conductance_W_K: 42.0,
            }
          : undefined,
      washDose_ml: type === 'wash_bottle' ? 10 : undefined,
    };

    set(state => ({
      ...pushSnapshot(state),
      equipment: { ...state.equipment, [id]: newEquipment },
      selectedEquipmentId: id,
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'ADD_EQUIPMENT',
          details_en: `Added ${spec.name} to workbench`,
          details_vi: `Đã thêm ${spec.name_vi} vào bàn thí nghiệm`,
          vesselId: id,
        },
      ],
    }));

    get().checkStepProgress();
    return id;
  },

  removeEquipment: (id) => {
    const eq = get().equipment[id];
    if (!eq) return;

    set(state => {
      const next = { ...state.equipment };
      delete next[id];
      return {
        ...pushSnapshot(state),
        equipment: next,
        selectedEquipmentId: state.selectedEquipmentId === id ? null : state.selectedEquipmentId,
        history: [
          ...state.history,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'ADD_EQUIPMENT',
            details_en: `Removed ${eq.name}`,
            details_vi: `Đã dọn dẹp ${eq.name_vi}`,
            vesselId: id,
          },
        ],
      };
    });
  },

  updatePosition: (id, x, y) => {
    set(state => {
      if (!state.equipment[id]) return state;
      return {
        equipment: {
          ...state.equipment,
          [id]: { ...state.equipment[id], x, y },
        },
      };
    });
  },

  setCondenserCooling: (condenserId, patch) => {
    const eq = get().equipment[condenserId];
    if (!eq || eq.type !== 'condenser') return;
    set(state => ({
      equipment: {
        ...state.equipment,
        [condenserId]: {
          ...eq,
          condenserCooling: {
            coolingEnabled: eq.condenserCooling?.coolingEnabled ?? true,
            flowRate_ml_s: eq.condenserCooling?.flowRate_ml_s ?? 2.5,
            coolantInletTemp_c: eq.condenserCooling?.coolantInletTemp_c ?? 15,
            conductance_W_K: eq.condenserCooling?.conductance_W_K ?? 42,
            ...patch,
          },
        },
      },
    }));
  },

  toggleHeat: (id) => {
    const eq = get().equipment[id];
    if (!eq) return;
    const nextIsOn = !eq.isOn;

    if (eq.type === 'bunsen_burner') {
      if (nextIsOn) soundEngine.ignite();
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: { ...eq, isOn: nextIsOn },
        },
        history: [
          ...state.history,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'HEAT',
            details_en: nextIsOn ? `Lit Bunsen Burner flame` : `Turned off Bunsen Burner`,
            details_vi: nextIsOn ? `Châm lửa đèn Bunsen` : `Tắt đèn Bunsen`,
            vesselId: id,
          },
        ],
      }));
      return;
    }

    if (eq.type === 'hot_plate') {
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: { ...eq, isOn: nextIsOn, setPoint_c: 120.0 },
        },
        history: [
          ...state.history,
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            actionType: 'HEAT',
            details_en: nextIsOn ? `Switched on Hot Plate heater` : `Switched off Hot Plate`,
            details_vi: nextIsOn ? `Bật bếp gia nhiệt` : `Tắt bếp gia nhiệt`,
            vesselId: id,
          },
        ],
      }));
      return;
    }

    // Direct heating toggle on container vessel
    const newTemp = nextIsOn ? Math.max(eq.temperature_c, 85.0) : 25.0;
    const prep = prepareVesselSimulation(
      eq,
      eq.contents,
      eq.volume_ml,
      newTemp,
      nextIsOn,
      !eq.isSealed,
      undefined,
      get().realtimeKinetics
    );
    const sim = prep.simResult;

    set(state => ({
      ...pushSnapshot(state),
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          isOn: nextIsOn,
          temperature_c: sim.finalTemperature_c,
          liquidColorHex: sim.finalLiquidColorHex,
          ph: sim.finalPh,
          contents: sim.updatedContents,
          hasPrecipitate: sim.hasPrecipitate,
          precipitateColorHex: sim.precipitateInfo?.colorHex,
          precipitateSubstance: sim.precipitateInfo?.formula,
          precipitateMass_g: sim.precipitateInfo?.mass_g,
          precipitateMorphology: sim.precipitateInfo?.morphology,
          hasPhaseSeparation: sim.hasPhaseSeparation,
          organicLayerVolume_ml: sim.organicLayerVolume_ml,
          organicLayerColorHex: sim.organicLayerColorHex,
          hasFumes: sim.hasFumes,
          fumeType: sim.fumeType,
          fumeColorHex: sim.fumeColorHex,
          turbidity: sim.turbidity,
          foamHead_mm: sim.foamHead_mm,
          hasSilverMirror: sim.hasSilverMirror || eq.hasSilverMirror,
          silverMirrorProgress: prep.silverMirrorProgress ?? eq.silverMirrorProgress,
          activeReactionLabel: prep.activeReactionLabel,
          activeReactionProgress: prep.activeReactionProgress,
        },
      },
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'HEAT',
          details_en: nextIsOn ? `Turned on heating for ${eq.name}` : `Turned off heating for ${eq.name}`,
          details_vi: nextIsOn ? `Bật gia nhiệt cho ${eq.name_vi}` : `Tắt gia nhiệt cho ${eq.name_vi}`,
          vesselId: id,
          measurements: { temperature_c: sim.finalTemperature_c },
        },
      ],
    }));

    get().checkStepProgress();
  },

  tareEquipment: (id) => {
    const eq = get().equipment[id];
    if (!eq) return;

    if (eq.type === 'analytical_balance') {
      const allEq = Object.values(get().equipment);
      const panVessel = allEq.find(
        v =>
          v.id !== id &&
          v.isContainer &&
          Math.abs(v.x + v.width / 2 - (eq.x + eq.width / 2)) < eq.width * 0.45 &&
          Math.abs(v.y + v.height - (eq.y + 40)) < 45
      );
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: {
            ...eq,
            tare_g: panVessel ? panVessel.mass_g : 0,
          },
        },
      }));
    } else {
      set(state => ({
        equipment: {
          ...state.equipment,
          [id]: {
            ...eq,
            tare_g: eq.mass_g,
          },
        },
      }));
    }
  },

  emptyEquipment: (id) => {
    const eq = get().equipment[id];
    if (!eq || !eq.isContainer) return;

    const discardedMass = Math.max(0, (eq.mass_g || 0) - (eq.tare_g || 0));
    soundEngine.pour(0.3);
    reactionRuntime2D.clearVessel(id);
    kineticRuntime2D.clearVessel(id);
    set(state => ({
      ...pushSnapshot(state),
      wasteMass_g: Math.round((state.wasteMass_g + discardedMass) * 100) / 100,
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          contents: [],
          volume_ml: 0,
          mass_g: eq.tare_g || 0,
          ph: 7.0,
          liquidColorHex: '#f8fafc',
          hasPrecipitate: false,
          precipitateSubstance: undefined,
          precipitateMass_g: 0,
          precipitateColorHex: undefined,
          precipitateMorphology: undefined,
          precipitateLayers: [],
          solidChunks: [],
          initialSolidMassByFormula: undefined,
          escapedGas_g: undefined,
          totalEscapedGas_g: 0,
          hasGas: false,
          isBoiling: false,
          hasPhaseSeparation: false,
          organicLayerVolume_ml: undefined,
          hasFumes: false,
          turbidity: 0,
          foamHead_mm: 0,
          hasSilverMirror: false,
          silverMirrorProgress: 0,
          activeControllerIds: undefined,
          activeReactionLabel: undefined,
          activeReactionProgress: undefined,
          isStirred: false,
        },
      },
      history: [
        ...state.history,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actionType: 'TRANSFER',
          details_en: `Rinsed and emptied ${eq.name}`,
          details_vi: `Đã đổ bỏ và tráng rửa ${eq.name_vi}`,
          vesselId: id,
        },
      ],
    }));
    get().checkStepProgress();
  },

  toggleStir: (id) => {
    const eq = get().equipment[id];
    if (!eq || !eq.isContainer) return;

    const nextStirred = !eq.isStirred;
    soundEngine.drip();
    set(state => ({
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          isStirred: nextStirred,
          stirringSpeed: nextStirred ? 0.85 : 0,
          stirIntensity: nextStirred ? 1.0 : 0,
        },
      },
    }));
  },

  toggleSeal: (id) => {
    const eq = get().equipment[id];
    if (!eq || !eq.isContainer) return;

    soundEngine.click();
    set(state => ({
      equipment: {
        ...state.equipment,
        [id]: {
          ...eq,
          isSealed: !eq.isSealed,
        },
      },
    }));
  },
});
