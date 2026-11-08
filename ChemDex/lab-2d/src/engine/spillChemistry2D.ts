/**
 * Active Tabletop Spill Chemistry Engine for ChemDex 2D
 *
 * Brings lab-3d's spillChemistry.ts parity to lab-2d:
 * - Spill puddles retain full molar inventory (`contents`), temperature, and pH
 * - Overlapping or adjacent puddles coalesce and react via `runSimulationCycle`
 * - Acid/base spills can be neutralized (e.g. with NaHCO3 powder, producing CO2 fizzing)
 * - Sponge tool wipes and cleans up spill puddles on contact
 */

import { SpillPuddle } from '../types/equipment';
import { SubstanceQuantity } from '../types/chemistry';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { normalizeFormula, computeMolarMass } from '../chemistry/core/formula';

/**
 * Merges two overlapping spill puddles and executes instant reaction chemistry on their combined contents.
 */
export function mergeAndReactSpills(a: SpillPuddle, b: SpillPuddle): SpillPuddle {
  const combinedVolume = a.volume_ml + b.volume_ml;
  const combinedContents: SubstanceQuantity[] = [];

  const sourceList = [
    ...(a.contents ?? [
      {
        formula: a.formula || 'H2O',
        moles: Math.max(0.005, (a.volume_ml / 1000) * 0.5),
        mass_g: Math.max(0.1, a.volume_ml),
        state: 'aq' as const,
      },
    ]),
    ...(b.contents ?? [
      {
        formula: b.formula || 'H2O',
        moles: Math.max(0.005, (b.volume_ml / 1000) * 0.5),
        mass_g: Math.max(0.1, b.volume_ml),
        state: 'aq' as const,
      },
    ]),
  ];

  for (const item of sourceList) {
    const norm = normalizeFormula(item.formula);
    const existing = combinedContents.find(c => normalizeFormula(c.formula) === norm);
    if (existing) {
      existing.moles += item.moles;
      existing.mass_g += item.mass_g;
    } else {
      combinedContents.push({ ...item });
    }
  }

  const avgTemp =
    ((a.temperature_c ?? 25) * a.volume_ml + (b.temperature_c ?? 25) * b.volume_ml) /
    Math.max(0.1, combinedVolume);

  const sim = runSimulationCycle(combinedContents, combinedVolume, avgTemp, false, true);
  const isNeutral = sim.finalPh >= 6.0 && sim.finalPh <= 8.2;

  return {
    id: a.id,
    x: (a.x * a.volume_ml + b.x * b.volume_ml) / Math.max(0.1, combinedVolume),
    y: (a.y * a.volume_ml + b.y * b.volume_ml) / Math.max(0.1, combinedVolume),
    colorHex: sim.finalLiquidColorHex || a.colorHex,
    volume_ml: Math.round(combinedVolume * 100) / 100,
    formula: sim.updatedContents.find(c => normalizeFormula(c.formula) !== 'H2O')?.formula || a.formula,
    contents: sim.updatedContents,
    temperature_c: sim.finalTemperature_c,
    ph: sim.finalPh,
    isNeutralized: isNeutral,
    isEffervescing: sim.hasGas,
    hasFumes: sim.hasFumes,
    fumeColorHex: sim.fumeColorHex,
    hasGlassShards: Boolean(a.hasGlassShards || b.hasGlassShards),
    radius_px: Math.min(115, 22 + Math.sqrt(combinedVolume) * 5.2),
    timestamp: Date.now(),
  };
}

/**
 * Neutralizes a spill puddle with Sodium Bicarbonate (NaHCO3) powder, running stoichiometry.
 */
export function neutralizeSpillWithNaHCO3(spill: SpillPuddle, gramsAdded = 2.0): SpillPuddle {
  const mm = computeMolarMass('NaHCO3');
  const molesAdded = gramsAdded / mm;
  const baseContents: SubstanceQuantity[] = spill.contents
    ? spill.contents.map(c => ({ ...c }))
    : [
        {
          formula: spill.formula || 'HCl',
          moles: Math.max(0.01, (spill.volume_ml / 1000) * 1.0),
          mass_g: spill.volume_ml,
          state: 'aq',
        },
      ];

  baseContents.push({
    formula: 'NaHCO3',
    moles: molesAdded,
    mass_g: gramsAdded,
    state: 's',
  });

  const sim = runSimulationCycle(baseContents, Math.max(5, spill.volume_ml), spill.temperature_c ?? 25, false, true);
  return {
    ...spill,
    contents: sim.updatedContents,
    colorHex: sim.finalLiquidColorHex || '#e2e8f0',
    ph: sim.finalPh,
    temperature_c: sim.finalTemperature_c,
    isNeutralized: sim.finalPh >= 6.0 && sim.finalPh <= 8.5,
    isEffervescing: sim.hasGas,
    timestamp: Date.now(),
  };
}

/**
 * Steps all tabletop spill puddles: merges overlapping puddles and cools/decays transient effervescence.
 */
export function stepSpillPuddles(spills: SpillPuddle[], dt: number): SpillPuddle[] {
  if (spills.length === 0) return spills;
  const working = spills.map(s => ({ ...s }));

  // Check pairwise overlap for coalescence & contact reaction
  for (let i = 0; i < working.length; i++) {
    for (let j = i + 1; j < working.length; j++) {
      const a = working[i];
      const b = working[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rSum = (a.radius_px ?? 30) + (b.radius_px ?? 30);
      if (dist < rSum * 0.72) {
        working[i] = mergeAndReactSpills(a, b);
        working.splice(j, 1);
        j--;
      }
    }
  }

  // Cool puddles toward 25°C and clear transient effervescence after 4 seconds
  const now = Date.now();
  return working.map(s => {
    const temp = s.temperature_c ?? 25;
    const nextTemp = temp + (25 - temp) * Math.min(1, dt * 0.4);
    const stopFizz = s.isEffervescing && now - s.timestamp > 4500;
    return {
      ...s,
      temperature_c: Math.round(nextTemp * 10) / 10,
      isEffervescing: stopFizz ? false : s.isEffervescing,
    };
  });
}
