import type { SubstanceContent } from '../types/chemistry';
import { identifySpecies, sameMolecularFormula } from './speciesIdentity';
import { liquidWaterViscosity_Pa_s } from './liquidTransport';
import type { ConvectionFluidModel } from './convectionForcing';
export type SuspensionCarrierMode = 'liquid' | 'dry-residue' | 'frozen-matrix';

export function suspensionFluidProperties(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  const liquid = contents.filter(item => item.mass_g > 0 && Number.isFinite(item.mass_g)
    && (!item.location || item.location === 'bulk')
    && ['l', 'aq'].includes(item.phase ?? identifySpecies(item.formula).phase ?? ''));
  const hasWater = liquid.some(item => sameMolecularFormula(item.formula, 'H2O'));
  const unknownPhase = contents.some(item => item.mass_g > 0 && (!item.location || item.location === 'bulk')
    && !(item.phase ?? identifySpecies(item.formula).phase));
  const pureWater = hasWater && !unknownPhase && liquid.every(item => sameMolecularFormula(item.formula, 'H2O'));
  const waterViscosity = hasWater ? liquidWaterViscosity_Pa_s(temperature_c) : null;
  const liquidMass = liquid.reduce((sum, item) => sum + item.mass_g, 0);
  const hasIce = contents.some(item => Number.isFinite(item.mass_g) && item.mass_g>0
    && (!item.location || item.location==='bulk') && sameMolecularFormula(item.formula,'H2O')
    && (item.phase ?? identifySpecies(item.formula).phase)==='s');
  const hasVolume = Number.isFinite(volume_ml) && volume_ml>0;
  const carrierMode: SuspensionCarrierMode = hasVolume && (liquidMass>0 || unknownPhase) ? 'liquid'
    : hasIce ? 'frozen-matrix' : 'dry-residue';
  const hasDensity = !unknownPhase && volume_ml > 0 && Number.isFinite(volume_ml) && liquidMass > 0;
  return {
    carrierMode,
    carrierModel: carrierMode==='frozen-matrix' ? 'ice-matrix-hold' as const
      : carrierMode==='dry-residue' ? 'dry-bulk-bed-projection' as const
      : unknownPhase ? 'unknown-phase-liquid-proxy' as const : 'bulk-liquid-inventory' as const,
    liquidMass_g: liquidMass,
    convectionFluidModel: (!hasWater || unknownPhase ? 'unavailable'
      : pureWater ? 'pure-water-reference' : 'aqueous-water-proxy') as ConvectionFluidModel,
    // Mixtures require species-specific transport data. Do not invent a
    // universal Jones–Dole coefficient from a mass concentration in g/mL.
    viscosity_mPa_s: 1000 * (waterViscosity ?? liquidWaterViscosity_Pa_s(25)!),
    viscosityModel: waterViscosity === null ? 'reference_water_proxy' as const
      : pureWater ? 'iapws_pure_water' as const : 'aqueous_water_proxy' as const,
    density_g_ml: hasDensity ? liquidMass / volume_ml : 1,
    densityModel: hasDensity ? 'liquid_inventory' as const : 'reference_water_proxy' as const,
  };
}
