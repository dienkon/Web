import React, { createContext, useContext } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { useAppStore, type AppState } from '../../store/useAppStore';
import type { VesselSimulationManager } from '../core/SimulationEngine';
import type { LiquidAppearanceField } from '../effects/LiquidAppearanceField';

/** A scene may own its specimen and clock while using the exact bench renderers.
 * The automatic director steps these fields itself; drawing must not step them
 * again or insert its temporary specimen into the user's persistent workbench. */
export interface VesselVisualRuntime {
  store: StoreApi<AppState>;
  manager: VesselSimulationManager;
  appearance?: LiquidAppearanceField;
  externallyStepped: boolean;
  elapsed?: () => number;
}
const VisualContext = createContext<VesselVisualRuntime | null>(null);
export const VesselVisualProvider = VisualContext.Provider;
export function useVesselVisualRuntime() { return useContext(VisualContext); }
export function useVesselVisualStore() { return useVesselVisualRuntime()?.store ?? useAppStore; }
export function useVesselVisualState<T>(selector: (state: AppState) => T): T {
  return useStore(useVesselVisualStore(), selector);
}
