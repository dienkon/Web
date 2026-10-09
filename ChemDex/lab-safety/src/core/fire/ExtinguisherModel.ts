import { Agent } from './FireClasses';

export interface ExtinguisherState {
  id: string;
  agent: Agent;
  pinPulled: boolean;
  sealBroken: boolean;
  pressure: number; // 0..1 (manometer needle in green zone = 0.8)
  agentLeft: number; // 0..1 discharge fraction
  isDischarging: boolean;
  recoil: number;
}

export function createExtinguisher(id: string, agent: Agent): ExtinguisherState {
  return {
    id,
    agent,
    pinPulled: false,
    sealBroken: false,
    pressure: 0.85,
    agentLeft: 1.0,
    isDischarging: false,
    recoil: 0,
  };
}

export function pullPin(state: ExtinguisherState): boolean {
  if (state.pinPulled) return false;
  state.pinPulled = true;
  state.sealBroken = true;
  return true;
}

export function dischargeExtinguisher(state: ExtinguisherState, dt: number): { discharged: boolean; remaining: number } {
  if (!state.pinPulled || state.agentLeft <= 0) {
    state.isDischarging = false;
    return { discharged: false, remaining: state.agentLeft };
  }

  // Discharge rates based on agent: full discharge takes ~12-16s
  const dischargeRate = state.agent === 'co2' ? 0.08 : state.agent === 'abc_powder' ? 0.07 : 0.06;
  state.isDischarging = true;
  state.agentLeft = Math.max(0, state.agentLeft - dischargeRate * dt);
  state.pressure = Math.max(0, state.pressure - dischargeRate * dt * 0.9);
  state.recoil = 0.04;

  if (state.agentLeft <= 0) {
    state.isDischarging = false;
  }

  return { discharged: true, remaining: state.agentLeft };
}
