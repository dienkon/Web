import type { ChemicalDefinition, SubstanceContent, VesselState } from '../types/chemistry';
import { isImmiscibleOrganic } from '../data/chemicals';
import { dispenseAliquot, withdrawAliquot, type LiquidAliquot } from '../handling/aliquot';
import { solidDisplacementAtSurface } from '../handling/solidOccupancy';
import { refreshFlowInventory } from './funnelFlow';

/** Build one finite stock dose, including its solvent. Stock density/molarity
 * are catalog inputs, not inferred measurements of the resulting mixture. */
export function stockLiquidAliquot(chemical: ChemicalDefinition, formula: string, amount_ml: number,
  temperature_c: number): LiquidAliquot {
  const density = chemical.density;
  if (chemical.type !== 'liquid' || !Number.isFinite(amount_ml) || amount_ml <= 0
    || !Number.isFinite(density) || !(density! > 0) || !(chemical.molarMass > 0)) {
    throw new Error('Thuốc thử chưa có khối lượng riêng hoặc lượng cấp hợp lệ.');
  }
  const mass_g = amount_ml * density!;
  const molarity = chemical.defaultConcentration;
  const aqueous = molarity !== undefined && molarity > 0 && formula !== 'H2O';
  const moles = aqueous ? amount_ml / 1000 * molarity : mass_g / chemical.molarMass;
  const soluteMass = aqueous ? moles * chemical.molarMass : mass_g;
  if (!Number.isFinite(moles) || soluteMass > mass_g + 1e-9) {
    throw new Error('Nồng độ và khối lượng riêng của thuốc thử không khớp; chưa thể cấp lượng chất.');
  }
  const organic = isImmiscibleOrganic(formula);
  const contents: SubstanceContent[] = [{ formula, phase: aqueous ? 'aq' : 'l',
    moles, mass_g: soluteMass, volume_ml: amount_ml,
    ...(organic ? { liquidLayer: 'organic' as const } : {}) }];
  if (aqueous && mass_g > soluteMass) contents.push({ formula: 'H2O', phase: 'l',
    mass_g: mass_g - soluteMass, moles: (mass_g - soluteMass) / 18.015 });
  return { volume_ml: amount_ml, mass_g, temperature_c, color: chemical.color, contents,
    substances: contents.map(item => item.formula),
    ...(organic ? { organicVolume_ml: amount_ml, organicColor: chemical.color } : {}) };
}

export function prepareStockAddition(input: VesselState, chemical: ChemicalDefinition, formula: string,
  amount: number, temperature_c: number) {
  if (!Number.isFinite(amount) || amount <= 0 || input.isSealed || input.isShattered
    || !Number.isFinite(input.capacity_ml) || input.capacity_ml <= 0) return null;
  if (chemical.type === 'gas') throw new Error('Cấp khí cần đường dẫn khí; không được quy đổi khí thành dung dịch.');
  if (chemical.type === 'liquid') {
    const incoming = stockLiquidAliquot(chemical, formula, amount, temperature_c);
    const transfer = dispenseAliquot(input, incoming, amount);
    return { vessel: refreshFlowInventory(transfer.vessel), incoming,
      acceptedAmount: transfer.dispensed_ml,
      spill: transfer.sample.volume_ml > 1e-12 ? transfer.sample : undefined };
  }
  if (!Number.isFinite(chemical.molarMass) || chemical.molarMass <= 0) return null;
  const contents = input.contents.map(item => ({ ...item }));
  const moles = amount / chemical.molarMass;
  const existing = contents.find(item => item.formula === formula
    && !item.solidOrigin && ['s', 'solid'].includes(item.phase ?? item.state ?? '') && (item.location ?? 'bulk') === 'bulk');
  if (existing) {
    existing.initialMoles = (existing.initialMoles ?? existing.moles) + moles;
    existing.initialMass_g = (existing.initialMass_g ?? existing.mass_g) + amount;
    existing.moles += moles;
    existing.mass_g += amount;
  } else contents.push({ formula, phase: 's', mass_g: amount, moles,
    initialMass_g: amount, initialMoles: moles });
  const withSolid = { ...input, contents, mass_g: input.mass_g + amount };
  // A solid displaces existing liquid; it is never itself fabricated as spill.
  const displaced = solidDisplacementAtSurface(withSolid, input.capacity_ml);
  const excess = Math.min(input.volume_ml, Math.max(0, input.volume_ml + displaced - input.capacity_ml));
  const drained = withdrawAliquot(withSolid, excess);
  return { vessel: refreshFlowInventory(drained.vessel), incoming: undefined,
    acceptedAmount: amount, spill: excess > 1e-12 ? drained.sample : undefined };
}
