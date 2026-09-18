import { create } from 'zustand';
import { VesselState, VesselType } from '../types/vessel';
import { ReactionResult, ReactionResolutionState } from '../types/reaction';
import { SafetyViolation } from '../types/safety';
import { LabHistorySnapshot } from '../types/action';
import { CHEMICAL_LIBRARY } from '../data/chemicals';
import { SafetyEngine } from '../engine/safety';
import { ChemistryEngine } from '../engine/chemistry';
import { createCanonicalReactionKey } from '../data/reactions/canonicalKey';
import { ReactionResolver, ResolverMetrics } from '../services/reactionResolver';

export interface BurnerState {
  isActive: boolean;
  targetVesselId: string | null;
  flameIntensity: number; // 0 to 1
  flameTempC: number;
}

export interface TitrationSession {
  isActive: boolean;
  buretteVesselId: string;
  receivingVesselId: string;
  titrantChemicalId: string;
  dispensedMl: number;
  flowMode: 'drop' | 'continuous' | 'off';
  dataPoints: { volumeAddedMl: number; ph: number }[];
}

interface SimulationStore {
  // Vessels
  vessels: VesselState[];
  selectedVesselId: string | null;

  // Reaction resolution state
  resolutionState: ReactionResolutionState;
  latestReaction: ReactionResult | null;
  activeSafetyViolation: SafetyViolation | null;

  // Physical equipment
  burner: BurnerState;
  titration: TitrationSession;

  // History & Undo/Redo
  history: LabHistorySnapshot[];
  future: LabHistorySnapshot[];

  // Observability & Metrics
  lastMetrics: ResolverMetrics | null;

  // Actions
  selectVessel: (id: string | null) => void;
  addVessel: (type: VesselType, position?: [number, number, number]) => void;
  removeVessel: (id: string) => void;
  clearVessel: (id: string) => void;
  resetAll: () => void;
  toggleHeating: (vesselId: string) => void;
  toggleStirring: (vesselId: string) => void;
  moveVesselPosition: (id: string, position: [number, number, number]) => void;

  // TWO-FLOW CHEMISTRY EXECUTION
  addSubstance: (
    vesselId: string,
    chemicalId: string,
    amount: number,
    unit?: 'mL' | 'g'
  ) => Promise<boolean>;

  pourVesselToVessel: (
    sourceVesselId: string,
    targetVesselId: string,
    amountMl: number
  ) => Promise<boolean>;

  // Titration Actions
  startTitration: (buretteId: string, receivingId: string, titrantId: string) => void;
  dispenseTitrantDrop: () => void;
  stopTitration: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  dismissSafetyViolation: () => void;
}

const DEFAULT_VESSELS: VesselState[] = [
  {
    id: 'vessel_beaker_1',
    name: 'Cốc đốt 250 mL',
    type: 'beaker',
    capacityMl: 250,
    currentVolumeMl: 0,
    emptyMassG: 120,
    totalMassG: 120,
    temperatureC: 25.0,
    pH: null,
    liquidColor: { r: 245, g: 250, b: 255, a: 0.08, hex: '#f5faff' },
    opacity: 0.1,
    precipitate: null,
    gas: null,
    indicator: null,
    isHeating: false,
    isStirring: false,
    contents: [],
    position: [-1.2, 0, 0],
    rotation: [0, 0, 0],
    isOpen: true
  },
  {
    id: 'vessel_erlenmeyer_1',
    name: 'Bình tam giác 250 mL',
    type: 'erlenmeyer',
    capacityMl: 250,
    currentVolumeMl: 0,
    emptyMassG: 135,
    totalMassG: 135,
    temperatureC: 25.0,
    pH: null,
    liquidColor: { r: 245, g: 250, b: 255, a: 0.08, hex: '#f5faff' },
    opacity: 0.1,
    precipitate: null,
    gas: null,
    indicator: null,
    isHeating: false,
    isStirring: false,
    contents: [],
    position: [1.2, 0, 0],
    rotation: [0, 0, 0],
    isOpen: true
  }
];

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  vessels: DEFAULT_VESSELS,
  selectedVesselId: 'vessel_beaker_1',
  resolutionState: 'IDLE',
  latestReaction: null,
  activeSafetyViolation: null,
  burner: {
    isActive: false,
    targetVesselId: null,
    flameIntensity: 0,
    flameTempC: 350
  },
  titration: {
    isActive: false,
    buretteVesselId: '',
    receivingVesselId: '',
    titrantChemicalId: 'NaOH',
    dispensedMl: 0,
    flowMode: 'off',
    dataPoints: []
  },
  history: [],
  future: [],
  lastMetrics: null,

  selectVessel: (id) => set({ selectedVesselId: id }),

  addVessel: (type, position) => {
    const id = `vessel_${Date.now()}`;
    const names: Record<VesselType, { name: string; cap: number; mass: number }> = {
      beaker: { name: 'Cốc đốt 250 mL', cap: 250, mass: 120 },
      erlenmeyer: { name: 'Bình tam giác 250 mL', cap: 250, mass: 135 },
      test_tube: { name: 'Ống nghiệm 50 mL', cap: 50, mass: 25 },
      graduated_cylinder: { name: 'Ống đong 100 mL', cap: 100, mass: 90 },
      burette: { name: 'Buret chuẩn độ 50 mL', cap: 50, mass: 150 },
      watch_glass: { name: 'Kính đồng hồ', cap: 30, mass: 40 },
      evaporating_dish: { name: 'Bát sứ nung', cap: 80, mass: 70 },
      dropper: { name: 'Ống hút nhỏ giọt', cap: 5, mass: 10 },
      reagent_bottle: { name: 'Lọ chứa hóa chất 250 mL', cap: 250, mass: 180 }
    };

    const cfg = names[type] || { name: 'Dụng cụ thí nghiệm', cap: 250, mass: 100 };
    const defaultPos: [number, number, number] = position || [
      (get().vessels.length - 1) * 1.5,
      0,
      0
    ];

    const newVessel: VesselState = {
      id,
      name: cfg.name,
      type,
      capacityMl: cfg.cap,
      currentVolumeMl: 0,
      emptyMassG: cfg.mass,
      totalMassG: cfg.mass,
      temperatureC: 25.0,
      pH: null,
      liquidColor: { r: 245, g: 250, b: 255, a: 0.08, hex: '#f5faff' },
      opacity: 0.1,
      precipitate: null,
      gas: null,
      indicator: null,
      isHeating: false,
      isStirring: false,
      contents: [],
      position: defaultPos,
      rotation: [0, 0, 0],
      isOpen: true
    };

    set(state => ({
      vessels: [...state.vessels, newVessel],
      selectedVesselId: id
    }));
  },

  removeVessel: (id) => {
    set(state => ({
      vessels: state.vessels.filter(v => v.id !== id),
      selectedVesselId: state.selectedVesselId === id ? null : state.selectedVesselId
    }));
  },

  moveVesselPosition: (id, position) => {
    set(state => ({
      vessels: state.vessels.map(v => v.id === id ? { ...v, position } : v)
    }));
  },

  clearVessel: (id) => {
    set(state => ({
      vessels: state.vessels.map(v => {
        if (v.id !== id) return v;
        return {
          ...v,
          currentVolumeMl: 0,
          totalMassG: v.emptyMassG,
          temperatureC: 25.0,
          pH: null,
          liquidColor: { r: 245, g: 250, b: 255, a: 0.08, hex: '#f5faff' },
          opacity: 0.1,
          precipitate: null,
          gas: null,
          indicator: null,
          contents: []
        };
      }),
      latestReaction: state.selectedVesselId === id ? null : state.latestReaction,
      activeSafetyViolation: state.selectedVesselId === id ? null : state.activeSafetyViolation,
      resolutionState: state.selectedVesselId === id ? 'IDLE' : state.resolutionState
    }));
  },

  resetAll: () => {
    set({
      vessels: DEFAULT_VESSELS.map(v => ({ ...v, contents: [], currentVolumeMl: 0, totalMassG: v.emptyMassG })),
      selectedVesselId: 'vessel_beaker_1',
      latestReaction: null,
      activeSafetyViolation: null,
      resolutionState: 'IDLE',
      history: [],
      future: [],
      titration: {
        isActive: false,
        buretteVesselId: '',
        receivingVesselId: '',
        titrantChemicalId: 'NaOH',
        dispensedMl: 0,
        flowMode: 'off',
        dataPoints: []
      }
    });
  },

  toggleHeating: (vesselId) => {
    set(state => {
      const target = state.vessels.find(v => v.id === vesselId);
      if (!target) return state;
      const nextHeating = !target.isHeating;
      return {
        vessels: state.vessels.map(v => v.id === vesselId ? { ...v, isHeating: nextHeating } : v),
        burner: {
          isActive: nextHeating,
          targetVesselId: nextHeating ? vesselId : null,
          flameIntensity: nextHeating ? 0.8 : 0,
          flameTempC: 350
        }
      };
    });
  },

  toggleStirring: (vesselId) => {
    set(state => ({
      vessels: state.vessels.map(v => v.id === vesselId ? { ...v, isStirring: !v.isStirring } : v)
    }));
  },

  dismissSafetyViolation: () => set({ activeSafetyViolation: null }),

  /**
   * CENTRAL TWO-FLOW CHEMISTRY EXECUTION
   */
  addSubstance: async (vesselId, chemicalId, amount, unit = 'mL') => {
    const state = get();
    const target = state.vessels.find(v => v.id === vesselId);
    if (!target) return false;

    const chem = CHEMICAL_LIBRARY[chemicalId];
    if (!chem) return false;

    // --- STEP 1: SAFETY EVALUATION ---
    const safetyCheck = SafetyEngine.evaluate({
      targetVesselContents: target.contents,
      addedChemicalId: chemicalId,
      addedAmount: amount,
      isHeating: target.isHeating,
      isOpen: target.isOpen,
      targetVesselCapacityMl: target.capacityMl,
      currentVolumeMl: target.currentVolumeMl
    });

    if (safetyCheck) {
      set({ activeSafetyViolation: safetyCheck });
      if (safetyCheck.blocked) {
        set({ resolutionState: 'BLOCKED_BY_SAFETY' });
        return false;
      }
    }

    // Save snapshot for Undo
    const snapshot: LabHistorySnapshot = {
      id: `hist_${Date.now()}`,
      timestamp: Date.now(),
      descriptionVi: `Thêm ${amount} ${unit} ${chem.nameVi} vào ${target.name}`,
      actionType: 'ADD_SUBSTANCE',
      vessels: JSON.parse(JSON.stringify(state.vessels))
    };

    // Calculate chemical moles
    const isAqueous = chem.phase === 'aqueous' || chem.phase === 'liquid';
    const volumeMl = isAqueous ? amount : 0;
    const massG = isAqueous ? amount * (chem.density ?? 1.0) : amount;
    const concentration = chem.defaultConcentration ?? 1.0;
    const moles = isAqueous
      ? (amount / 1000) * concentration
      : amount / chem.molarMass;

    // --- FLOW A: FIRST ACTION IN AN EMPTY VESSEL ---
    // Instant local transaction. ZERO AI CALLS. ZERO DB QUERIES!
    if (target.contents.length === 0) {
      set({ resolutionState: 'INITIALIZING' });

      const newContents = [{
        chemicalId,
        amount,
        unit,
        concentrationM: isAqueous ? concentration : undefined,
        moles,
        addedAt: Date.now()
      }];

      const initialPh = chem.pHContribution ?? (isAqueous ? 7.0 : null);
      const initialColor = chem.defaultColor;

      const updatedVessel: VesselState = {
        ...target,
        currentVolumeMl: volumeMl,
        totalMassG: target.emptyMassG + massG,
        pH: initialPh,
        liquidColor: initialColor,
        opacity: Math.max(0.2, initialColor.a),
        contents: newContents,
        indicator: chem.isIndicator ? {
          id: chem.id,
          nameVi: chem.nameVi,
          colorHex: chem.defaultColor.hex || '#ffffff',
          appliedColor: chem.defaultColor
        } : target.indicator
      };

      set(prev => ({
        vessels: prev.vessels.map(v => v.id === vesselId ? updatedVessel : v),
        resolutionState: 'COMPLETED',
        history: [...prev.history, snapshot],
        future: []
      }));

      return true;
    }

    // --- FLOW B: SECOND AND SUBSEQUENT CHEMISTRY ACTIONS ---
    set({ resolutionState: 'LOCAL_RESOLUTION' });

    // Build candidate reaction query
    const existingChemicalIds = target.contents.map(c => c.chemicalId);
    const candidateChemicals = [...existingChemicalIds, chemicalId];
    const canonicalKey = createCanonicalReactionKey(candidateChemicals, {
      isHeating: target.isHeating
    });

    // Add substance to temporary vessel contents
    const mergedContents = [...target.contents];
    const existingSubstance = mergedContents.find(c => c.chemicalId === chemicalId);
    if (existingSubstance) {
      existingSubstance.amount += amount;
      existingSubstance.moles += moles;
    } else {
      mergedContents.push({
        chemicalId,
        amount,
        unit,
        concentrationM: isAqueous ? concentration : undefined,
        moles,
        addedAt: Date.now()
      });
    }

    const newVolumeMl = target.currentVolumeMl + volumeMl;
    const newMassG = target.totalMassG + massG;

    // Resolve Reaction through 5 Tiers
    set({ resolutionState: 'CACHE_LOOKUP' });
    const reactionResult = await ReactionResolver.resolve({
      canonicalKey,
      chemicalIds: candidateChemicals,
      isHeating: target.isHeating,
      currentPh: target.pH,
      temperatureC: target.temperatureC,
      contents: mergedContents
    });

    const metrics = ReactionResolver.getMetrics();

    if (reactionResult) {
      // Stoichiometric resolution
      set({ resolutionState: 'APPLYING' });
      const stoich = ChemistryEngine.solveStoichiometry(mergedContents, reactionResult);
      const mixedColor = ChemistryEngine.calculateMixedColor(
        stoich.remainingContents,
        stoich.resultingPh,
        target.indicator ? target.indicator.id : (chem.isIndicator ? chem.id : null)
      );

      const finalVessel: VesselState = {
        ...target,
        currentVolumeMl: newVolumeMl,
        totalMassG: newMassG,
        temperatureC: target.temperatureC + stoich.tempChange,
        pH: stoich.resultingPh,
        liquidColor: mixedColor,
        opacity: Math.max(0.3, mixedColor.a),
        contents: stoich.remainingContents,
        precipitate: reactionResult.observations.precipitate ? {
          ...reactionResult.observations.precipitate,
          massG: 2.5,
          settlingProgress: 0.1
        } : target.precipitate,
        gas: reactionResult.observations.gas ? {
          ...reactionResult.observations.gas,
          isBoiling: target.isHeating,
          evolutionTimeRemainingMs: 5000
        } : target.gas
      };

      set(prev => ({
        vessels: prev.vessels.map(v => v.id === vesselId ? finalVessel : v),
        latestReaction: reactionResult,
        resolutionState: 'COMPLETED',
        lastMetrics: metrics.lastMetrics,
        history: [...prev.history, snapshot],
        future: []
      }));

      // Update titration session if active
      const titr = get().titration;
      if (titr.isActive && titr.receivingVesselId === vesselId) {
        set({
          titration: {
            ...titr,
            dispensedMl: titr.dispensedMl + amount,
            dataPoints: [
              ...titr.dataPoints,
              { volumeAddedMl: titr.dispensedMl + amount, ph: stoich.resultingPh }
            ]
          }
        });
      }

      return true;
    } else {
      // No recognized reaction (or neutral dissolution/dilution)
      const mixedColor = ChemistryEngine.calculateMixedColor(
        mergedContents,
        target.pH,
        target.indicator ? target.indicator.id : (chem.isIndicator ? chem.id : null)
      );

      const finalVessel: VesselState = {
        ...target,
        currentVolumeMl: newVolumeMl,
        totalMassG: newMassG,
        liquidColor: mixedColor,
        contents: mergedContents
      };

      set(prev => ({
        vessels: prev.vessels.map(v => v.id === vesselId ? finalVessel : v),
        resolutionState: 'COMPLETED',
        lastMetrics: metrics.lastMetrics,
        history: [...prev.history, snapshot],
        future: []
      }));

      return true;
    }
  },

  pourVesselToVessel: async (sourceVesselId, targetVesselId, amountMl) => {
    const state = get();
    const source = state.vessels.find(v => v.id === sourceVesselId);
    const target = state.vessels.find(v => v.id === targetVesselId);
    if (!source || !target || source.currentVolumeMl <= 0) return false;

    const actualPour = Math.min(amountMl, source.currentVolumeMl);
    const fraction = actualPour / source.currentVolumeMl;

    // Deduct proportionally from source
    const transferredContents = source.contents.map(c => ({
      ...c,
      amount: c.amount * fraction,
      moles: c.moles * fraction
    }));

    const remainingSourceContents = source.contents.map(c => ({
      ...c,
      amount: c.amount * (1 - fraction),
      moles: c.moles * (1 - fraction)
    })).filter(c => c.amount > 0.001);

    // Update source vessel
    set(prev => ({
      vessels: prev.vessels.map(v => {
        if (v.id !== sourceVesselId) return v;
        return {
          ...v,
          currentVolumeMl: v.currentVolumeMl - actualPour,
          totalMassG: v.emptyMassG + (v.totalMassG - v.emptyMassG) * (1 - fraction),
          contents: remainingSourceContents
        };
      })
    }));

    // Transfer each substance sequentially into target
    for (const item of transferredContents) {
      const unit = item.unit === 'g' ? 'g' : 'mL';
      await get().addSubstance(targetVesselId, item.chemicalId, item.amount, unit);
    }

    return true;
  },

  startTitration: (buretteId, receivingId, titrantId) => {
    set({
      titration: {
        isActive: true,
        buretteVesselId: buretteId,
        receivingVesselId: receivingId,
        titrantChemicalId: titrantId,
        dispensedMl: 0,
        flowMode: 'drop',
        dataPoints: [{ volumeAddedMl: 0, ph: get().vessels.find(v => v.id === receivingId)?.pH ?? 1.0 }]
      }
    });
  },

  dispenseTitrantDrop: () => {
    const { titration, addSubstance } = get();
    if (!titration.isActive) return;
    addSubstance(titration.receivingVesselId, titration.titrantChemicalId, 1.0, 'mL');
  },

  stopTitration: () => {
    set(state => ({
      titration: { ...state.titration, isActive: false, flowMode: 'off' }
    }));
  },

  undo: () => {
    const { history, future, vessels } = get();
    if (history.length === 0) return;
    const lastSnapshot = history[history.length - 1];
    const currentSnapshot: LabHistorySnapshot = {
      id: `future_${Date.now()}`,
      timestamp: Date.now(),
      descriptionVi: 'Trạng thái hiện tại',
      actionType: 'RESET_LAB',
      vessels: JSON.parse(JSON.stringify(vessels))
    };

    set({
      vessels: lastSnapshot.vessels,
      history: history.slice(0, history.length - 1),
      future: [currentSnapshot, ...future],
      latestReaction: null
    });
  },

  redo: () => {
    const { history, future, vessels } = get();
    if (future.length === 0) return;
    const nextSnapshot = future[0];
    const currentSnapshot: LabHistorySnapshot = {
      id: `hist_${Date.now()}`,
      timestamp: Date.now(),
      descriptionVi: 'Quay lại',
      actionType: 'RESET_LAB',
      vessels: JSON.parse(JSON.stringify(vessels))
    };

    set({
      vessels: nextSnapshot.vessels,
      history: [...history, currentSnapshot],
      future: future.slice(1)
    });
  }
}));
