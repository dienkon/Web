/**
 * Reactive Lab Environment Store (lab-3d parity):
 * Controls ambient temperature, atmospheric pressure, oxygen fraction (Air vs N2/Ar Inert),
 * fume hood airflow speed, relative humidity, and Lab Theme (Light / Dark laboratory workspace).
 */

import { create } from 'zustand';
import {
  DEFAULT_LAB_ENVIRONMENT,
  LabEnvironment,
  waterBoilingPointAtPressure,
  waterDewPointC,
} from '../chemistry/physical/environmentPhysics';

export type LabTheme = 'light' | 'dark';

export interface LabEnvironmentState {
  environment: LabEnvironment;
  labTheme: LabTheme;
  setTemperature: (temperature_c: number) => void;
  setPressure: (pressure_atm: number) => void;
  setAtmosphere: (mode: 'air' | 'inert') => void;
  setOxygenFraction: (fraction: number) => void;
  setAirSpeed: (airSpeed_m_s: number) => void;
  setRelativeHumidity: (relativeHumidity: number) => void;
  setLabTheme: (theme: LabTheme) => void;
  toggleLabTheme: () => void;
  resetEnvironment: () => void;
  getDerivedMetrics: () => {
    boilingPointWater_c: number;
    dewPoint_c: number;
    atmosphereLabel: 'Air' | 'Inert';
  };
}

export const useLabEnvironment = create<LabEnvironmentState>((set, get) => ({
  environment: { ...DEFAULT_LAB_ENVIRONMENT },
  labTheme: 'light',

  setTemperature: (temperature_c) =>
    set(s => ({
      environment: {
        ...s.environment,
        temperature_c: Math.max(10, Math.min(40, Math.round(temperature_c * 10) / 10)),
      },
    })),

  setPressure: (pressure_atm) =>
    set(s => ({
      environment: {
        ...s.environment,
        pressure_atm: Math.max(0.6, Math.min(1.2, Math.round(pressure_atm * 100) / 100)),
      },
    })),

  setAtmosphere: (mode) =>
    set(s => ({
      environment: {
        ...s.environment,
        oxygenFraction: mode === 'inert' ? 0 : 0.2095,
      },
    })),

  setOxygenFraction: (fraction) =>
    set(s => ({
      environment: {
        ...s.environment,
        oxygenFraction: Math.max(0, Math.min(1, fraction)),
      },
    })),

  setAirSpeed: (airSpeed_m_s) =>
    set(s => ({
      environment: {
        ...s.environment,
        airSpeed_m_s: Math.max(0, Math.min(1.5, Math.round(airSpeed_m_s * 100) / 100)),
      },
    })),

  setRelativeHumidity: (relativeHumidity) =>
    set(s => ({
      environment: {
        ...s.environment,
        relativeHumidity: Math.max(0.05, Math.min(0.95, Math.round(relativeHumidity * 100) / 100)),
      },
    })),

  setLabTheme: (labTheme) => set({ labTheme }),
  toggleLabTheme: () => set(s => ({ labTheme: s.labTheme === 'light' ? 'dark' : 'light' })),
  resetEnvironment: () => set({ environment: { ...DEFAULT_LAB_ENVIRONMENT } }),

  getDerivedMetrics: () => {
    const { environment } = get();
    return {
      boilingPointWater_c: Math.round(waterBoilingPointAtPressure(environment.pressure_atm) * 10) / 10,
      dewPoint_c: Math.round(waterDewPointC(environment.temperature_c, environment.relativeHumidity) * 10) / 10,
      atmosphereLabel: environment.oxygenFraction >= 0.12 ? 'Air' : 'Inert',
    };
  },
}));
