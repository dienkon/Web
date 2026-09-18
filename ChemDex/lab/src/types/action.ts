import { VesselState } from './vessel';

export type LabActionType =
  | 'ADD_VESSEL'
  | 'REMOVE_VESSEL'
  | 'SELECT_VESSEL'
  | 'MOVE_VESSEL'
  | 'ADD_SUBSTANCE'
  | 'POUR'
  | 'ADD_INDICATOR'
  | 'HEAT_TOGGLE'
  | 'STIR_TOGGLE'
  | 'CLEAR_VESSEL'
  | 'RESET_LAB'
  | 'TITRATE_DISPENSE';

export interface LabActionPayload {
  vesselId?: string;
  sourceVesselId?: string;
  targetVesselId?: string;
  chemicalId?: string;
  indicatorId?: string;
  amount?: number;
  unit?: 'mL' | 'g';
  position?: [number, number, number];
}

export interface LabHistorySnapshot {
  id: string;
  timestamp: number;
  descriptionVi: string;
  actionType: LabActionType;
  vessels: VesselState[];
}
