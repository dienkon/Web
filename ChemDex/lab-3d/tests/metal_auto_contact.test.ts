import { expect, it } from 'vitest';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { stockGrainContacts } from '../src/physical/stockLiquidContact';
import { attachedMetalForCarrier } from '../src/science/metalSurfaceAppearance';

it('naturally delivered copper turnings stay in the beaker and grow finite silver after the aqueous dose', async () => {
  const experiment = new AutoExperiment('cu_agno3', true);
  await experiment.stocks.initialize();
  try {
    const unsupportedGrowth: { frame: number; mass_g: number }[] = [];
    for (let i = 0; i < 3600 && experiment.progress < 0.15 && !experiment.error; i++) {
      experiment.tick(1 / 60);
      // Each arriving turning must acquire its mechanical ID before silver
      // grows. A later fully populated snapshot must not hide a free-metal
      // flash caused by reacting one frame before that contact was accepted.
      const mass_g = experiment.sample.contents.filter(row => row.formula === 'Ag' && row.phase === 's'
        && (row.depositReleased || !row.depositCarrierId)).reduce((sum, row) => sum + row.mass_g, 0);
      if (mass_g > 1e-12) unsupportedGrowth.push({ frame: i, mass_g });
    }
    expect(unsupportedGrowth).toEqual([]);
    expect(experiment.error).toBeNull(); expect(experiment.progress).toBeGreaterThan(0.15);
    const contacts = stockGrainContacts(experiment.sample, 'Cu');
    expect(contacts).toHaveLength(12);
    expect(contacts.every(contact => contact.wetFraction > 0), JSON.stringify(contacts)).toBe(true);
    const silver = experiment.sample.contents.filter(row => row.formula === 'Ag' && row.phase === 's');
    const attached = experiment.sample.stockMotion!.grains.reduce((sum, pose) => sum + attachedMetalForCarrier(experiment.sample, pose.id).mass_g, 0);
    expect(attached).toBeGreaterThan(0); expect(attached).toBeCloseTo(silver.reduce((sum, row) => sum + row.mass_g, 0), 12);
    expect(silver.every(row => row.depositSubstrate === 'Cu' && !!row.depositCarrierId)).toBe(true);
  } finally { experiment.stocks.dispose(); }
}, 30_000);
