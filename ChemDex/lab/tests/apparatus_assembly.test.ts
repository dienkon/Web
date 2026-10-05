import { describe, it, expect } from 'vitest';
import { TubingNetwork, TubingNode } from '../src/apparatus/Tubing';
import { evaluateSnapTarget } from '../src/handling/snapping';

describe('Apparatus Assembly & Canary K5 (Stand, Clamp, Tubing, Trough, Suck-Back)', () => {
  it('correctly sets up apparatus assembly graph and snaps', () => {
    // Flask at retort stand
    const flaskPos: [number, number, number] = [0, 0.5, 0];
    const flaskNode = { id: 'reaction_flask', type: 'flask', position: flaskPos };

    // Snapping stopper/delivery tube into flask neck
    const snap = evaluateSnapTarget([0, 1.4, 0], 'filter_funnel', { reaction_flask: flaskNode }, {});
    expect(snap.isSnapped).toBe(true);
    expect(snap.targetId).toBe('reaction_flask');
  });

  it('transfers gas through delivery tube and spawns bubbles when submerged in water trough', () => {
    const network = new TubingNetwork();
    network.connect('flask_1', 'trough_1', true); // true = submerged under water

    const nodes: Record<string, TubingNode> = {
      flask_1: {
        id: 'flask_1',
        type: 'flask',
        position: [0, 0.5, 0],
        temperature_c: 25,
        internalPressure_atm: 1.85, // Gas generated from CaCO3 + HCl
        liquidVolume_ml: 60,
        substances: ['HCl', 'CaCO3', 'CaCl2']
      },
      trough_1: {
        id: 'trough_1',
        type: 'trough',
        position: [2.0, -0.135, 0],
        temperature_c: 20,
        internalPressure_atm: 1.0,
        liquidVolume_ml: 500,
        substances: ['H2O']
      }
    };

    const prevT: Record<string, number> = {
      flask_1: 25,
      trough_1: 20
    };

    const result = network.update(1 / 60, nodes, prevT);

    // Delivery tube must carry gas flow and produce bubbles in water
    expect(result.gasBubblesSpawned.length).toBeGreaterThan(0);
    expect(result.gasBubblesSpawned[0].pos).toEqual([2.0, -0.135, 0]);
    expect(result.suckBackTransfers.length).toBe(0);
  });

  it('triggers suck-back on cooling when flame is removed and tube is underwater (Canary K5)', () => {
    const network = new TubingNetwork();
    network.connect('heated_flask', 'water_trough', true); // submerged!

    // Heated flask is rapidly cooling down from 95°C to 80°C
    const nodes: Record<string, TubingNode> = {
      heated_flask: {
        id: 'heated_flask',
        type: 'flask',
        position: [0, 0.8, 0],
        temperature_c: 82, // current T
        internalPressure_atm: 1.0,
        liquidVolume_ml: 40,
        substances: ['KMnO4']
      },
      water_trough: {
        id: 'water_trough',
        type: 'trough',
        position: [1.8, -0.135, 0],
        temperature_c: 20,
        internalPressure_atm: 1.0,
        liquidVolume_ml: 450,
        substances: ['H2O']
      }
    };

    const prevT: Record<string, number> = {
      heated_flask: 95, // cooled by 13 K in dt
      water_trough: 20
    };

    const dt = 0.5; // seconds
    const result = network.update(dt, nodes, prevT);

    // Thermal contraction suck-back must occur!
    expect(result.suckBackTransfers.length).toBeGreaterThan(0);
    expect(result.suckBackTransfers[0].fromId).toBe('water_trough');
    expect(result.suckBackTransfers[0].toId).toBe('heated_flask');
    expect(result.suckBackTransfers[0].volume_ml).toBeGreaterThan(0);

    // Thermal shock risk must be flagged since cold water enters hot flask (82°C)
    expect(result.thermalShockRisk.length).toBeGreaterThan(0);
    expect(result.thermalShockRisk[0].vesselId).toBe('heated_flask');
  });
});
