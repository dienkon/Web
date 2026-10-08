export interface SmokeLayerState {
  density: number; // 0..1 (accumulated smoke)
  layerHeight: number; // 3.2m (ceiling) down to 1.0m
  visibility: number; // 1.0 down to 0.2
}

export function createSmokeLayer(): SmokeLayerState {
  return {
    density: 0,
    layerHeight: 3.2,
    visibility: 1.0,
  };
}

export function updateSmokeLayer(smoke: SmokeLayerState, activeFireCount: number, dt: number): void {
  if (activeFireCount > 0) {
    // Smoke accumulates upwards and descends
    smoke.density = Math.min(1.0, smoke.density + 0.02 * activeFireCount * dt);
    smoke.layerHeight = Math.max(1.1, 3.2 - smoke.density * 1.8);
    smoke.visibility = Math.max(0.2, 1.0 - smoke.density * 0.7);
  } else {
    // Dissipates slowly when fire is out
    smoke.density = Math.max(0, smoke.density - 0.015 * dt);
    smoke.layerHeight = Math.min(3.2, smoke.layerHeight + 0.2 * dt);
    smoke.visibility = Math.min(1.0, smoke.visibility + 0.05 * dt);
  }
}
