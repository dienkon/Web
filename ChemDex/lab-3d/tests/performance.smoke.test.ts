/**
 * performance.smoke.test.ts — Headless Multi-Reaction Smoke & Performance Benchmark (§11.1 & §11.3)
 *
 * Verifies that 3 simultaneous heavy reactions (gas evolution, redox displacement,
 * and precipitation) run concurrently at 'high' quality tier within frame timing
 * and memory budgets without regressions or memory leaks.
 */

import { describe, it, expect } from 'vitest';
import { getProgramById } from '../src/vfx/programs/library/index';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { VesselState } from '../src/types/chemistry';
import { QUALITY_CONFIGS } from '../src/vfx/quality';

describe('Performance Smoke Benchmark (§11.1)', () => {
  it('executes 3 simultaneous heavy reactions at high quality tier within frame time and particle budgets', () => {
    // 1. Resolve 3 heavy reaction programs
    const progGas = getProgramById('caco3_hcl') || getProgramById('caco3_hcl_gas');
    const progRedox = getProgramById('zn_cuso4') || getProgramById('zn_cuso4_displacement');
    const progPrecip = getProgramById('bacl2_na2so4') || getProgramById('bacl2_na2so4_precip');

    expect(progGas, 'CaCO3 + HCl program must exist').toBeDefined();
    expect(progRedox, 'Zn + CuSO4 program must exist').toBeDefined();
    expect(progPrecip, 'BaCl2 + Na2SO4 program must exist').toBeDefined();

    // 2. High tier configuration inspection
    const highTierConfig = QUALITY_CONFIGS.high;
    expect(highTierConfig.maxLiveParticles).toBe(1800);
    expect(highTierConfig.particleMultiplier).toBe(0.85);

    // 3. Initialize 3 vessels with corresponding reactants
    let vesselGas: VesselState = {
      id: 'perf_vessel_gas',
      name: 'Gas Reaction Flask',
      type: 'flask',
      position: [-0.2, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.3,
      mass_g: 105.0,
      capacity_ml: 250,
      volume_ml: 100.0,
      temperature_c: 25.0,
      ph: 1.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      isSealed: false,
      substances: ['CaCO3', 'HCl'],
      contents: [
        { formula: 'CaCO3', moles: 0.05, mass_g: 5.0, phase: 's' },
        { formula: 'HCl', moles: 0.05, mass_g: 0.05 * computeMolarMass('HCl'), volume_ml: 50, concentration_M: 1.0 }
      ]
    };

    let vesselRedox: VesselState = {
      id: 'perf_vessel_redox',
      name: 'Redox Beaker',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.3,
      mass_g: 102.0,
      capacity_ml: 250,
      volume_ml: 100.0,
      temperature_c: 25.0,
      ph: 5.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      isSealed: false,
      substances: ['Zn', 'CuSO4'],
      contents: [
        { formula: 'Zn', moles: 0.02, mass_g: 0.02 * computeMolarMass('Zn'), phase: 's' },
        { formula: 'CuSO4', moles: 0.02, mass_g: 0.02 * computeMolarMass('CuSO4'), volume_ml: 100, concentration_M: 0.2 }
      ]
    };

    let vesselPrecip: VesselState = {
      id: 'perf_vessel_precip',
      name: 'Precipitation Beaker',
      type: 'beaker',
      position: [0.2, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.3,
      mass_g: 100.0,
      capacity_ml: 250,
      volume_ml: 100.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      isSealed: false,
      substances: ['BaCl2', 'Na2SO4'],
      contents: [
        { formula: 'BaCl2', moles: 0.01, mass_g: 0.01 * computeMolarMass('BaCl2'), volume_ml: 50, concentration_M: 0.2 },
        { formula: 'Na2SO4', moles: 0.01, mass_g: 0.01 * computeMolarMass('Na2SO4'), volume_ml: 50, concentration_M: 0.2 }
      ]
    };

    // 4. Initialize physical simulation managers at high tier
    const mgrGas = new VesselSimulationManager(vesselGas.id, 'high');
    const mgrRedox = new VesselSimulationManager(vesselRedox.id, 'high');
    const mgrPrecip = new VesselSimulationManager(vesselPrecip.id, 'high');

    // 5. Run 120-frame headless benchmark (approx 2.0 s at 60 FPS)
    const totalFrames = 120;
    const dt = 1.0 / 60.0; // 16.67 ms per frame
    const frameTimes: number[] = [];

    const memStart = process.memoryUsage().heapUsed;

    for (let frame = 0; frame < totalFrames; frame++) {
      const t0 = performance.now();
      const progress = (frame + 1) / totalFrames; // 0 to 1.0

      // Step Reaction 1: Gas
      const ledgerGas = applyProgramToLedger(progGas!, vesselGas, progress);
      Object.assign(vesselGas, ledgerGas);
      const resGas = mgrGas.step(vesselGas, dt, { reactionGasRate: 0.8 });
      expect(resGas).toBeDefined();

      // Step Reaction 2: Redox
      const ledgerRedox = applyProgramToLedger(progRedox!, vesselRedox, progress);
      Object.assign(vesselRedox, ledgerRedox);
      const resRedox = mgrRedox.step(vesselRedox, dt, { reactionPrecipitateActive: true });
      expect(resRedox).toBeDefined();

      // Step Reaction 3: Precipitate
      const ledgerPrecip = applyProgramToLedger(progPrecip!, vesselPrecip, progress);
      Object.assign(vesselPrecip, ledgerPrecip);
      const resPrecip = mgrPrecip.step(vesselPrecip, dt, {
        reactionPrecipitateActive: true,
        reactionPrecipitateSubstance: 'BaSO4'
      });
      expect(resPrecip).toBeDefined();

      // Evaluate active timeline atoms for all 3 programs
      let activeTimelineAtoms = 0;
      for (const p of [progGas!, progRedox!, progPrecip!]) {
        for (const atom of p.visual.timeline) {
          const [start, end] = atom.window;
          if (progress >= start && progress < end) {
            activeTimelineAtoms++;
          }
        }
      }
      expect(activeTimelineAtoms).toBeGreaterThanOrEqual(0);

      const t1 = performance.now();
      frameTimes.push(t1 - t0);
    }

    const memEnd = process.memoryUsage().heapUsed;
    const memDeltaMB = (memEnd - memStart) / (1024 * 1024);

    // Compute timing statistics
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxFrameTime = Math.max(...frameTimes);
    frameTimes.sort((a, b) => a - b);
    const p95FrameTime = frameTimes[Math.floor(frameTimes.length * 0.95)];

    // Headless logic budget: 60 FPS corresponds to 16.67ms total frame time.
    // Pure physics/chemistry step should take < 5ms average to leave >= 11ms for WebGL rendering.
    expect(avgFrameTime).toBeLessThan(5.0);
    expect(p95FrameTime).toBeLessThan(10.0);

    // Memory growth over 120 frames should be negligible (< 25 MB)
    expect(memDeltaMB).toBeLessThan(25.0);

    // Physical sanity: all 3 vessels progressed correctly
    expect(vesselGas.hasGas).toBe(true);
    expect(vesselPrecip.hasPrecipitate).toBe(true);
    expect(vesselPrecip.precipitateAmount_g).toBeGreaterThan(0);
    expect(vesselRedox.contents?.some(c => c.formula.toLowerCase() === 'cu')).toBe(true);
  });
});
