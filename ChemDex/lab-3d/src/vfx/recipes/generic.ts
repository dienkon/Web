import { ReactionVfxRecipe, VfxRecipeLayer } from './reactionVfx';
import { MixResult } from '../../shared/schemas';
import { VesselState } from '../../types/chemistry';
import { normalizeMorphology, toRecipeStyle } from '../catalog/vocab';

/**
 * Derives dynamic procedural VFX recipe from MixResult or VesselState properties
 */
export function getGenericVfxRecipe(
  mixResult?: MixResult | null,
  vessel?: VesselState | null
): ReactionVfxRecipe {
  const hasGas = mixResult?.new_vessel_state?.has_gas ?? vessel?.hasGas ?? false;
  const gasColor = mixResult?.new_vessel_state?.gas_color ?? vessel?.gasColor ?? '#f1f5f9';

  const hasPrecipitate = mixResult?.new_vessel_state?.has_precipitate ?? vessel?.hasPrecipitate ?? false;
  const precipitateColor = mixResult?.new_vessel_state?.precipitate_color ?? vessel?.precipitateColor ?? '#cbd5e1';

  const rawMorph = vessel?.precipitateMorphology || (mixResult as any)?.program?.visual?.after?.precipitate?.morphology;
  const canonicalMorph = normalizeMorphology(rawMorph);
  const precipitateStyle = toRecipeStyle(canonicalMorph) as 'milky' | 'curdy' | 'flake-gold' | 'gel' | 'powder-black' | 'metal-copper';
  const precipitateMorphologySummary: 'flake' | 'curd' | 'gel' = precipitateStyle === 'gel' ? 'gel' : precipitateStyle === 'flake-gold' ? 'flake' : 'curd';

  const isExplosion = mixResult?.new_vessel_state?.is_explosion ?? vessel?.isExplosion ?? false;
  const temp = vessel?.temperature_c ?? 25;
  const isBoiling = (mixResult?.new_vessel_state?.is_boiling ?? vessel?.isBoiling ?? false) || temp >= 98;
  const isHeavyGas = gasColor.toLowerCase().includes('9a3412') || gasColor.toLowerCase().includes('b45309') || gasColor.toLowerCase().includes('brown') || gasColor.toLowerCase().includes('yellow');

  const layers: VfxRecipeLayer[] = [];

  if (hasGas || isBoiling) {
    layers.push({
      kind: 'bubbles',
      t: [0.0, 1.0],
      rate: isBoiling ? 38 : 20,
      color: isBoiling ? '#ffffff' : gasColor,
      emitter: 'bottom',
      gasType: isBoiling ? 'boil' : 'gas'
    });
  }

  if (hasGas) {
    layers.push({
      kind: 'gasPlume',
      t: [0.05, 0.95],
      color: gasColor,
      density: isHeavyGas ? 0.75 : 0.45,
      heavy: isHeavyGas,
      buoyancy: isHeavyGas ? -0.15 : 0.25
    });
  }

  if (isBoiling || temp >= 48) {
    layers.push({
      kind: 'steam',
      t: [0.1, 0.95],
      density: isBoiling ? 0.8 : Math.min(0.55, (temp - 48) / 50)
    });
  }

  if (hasPrecipitate) {
    layers.push({
      kind: 'precipitate',
      t: [0.0, 0.9],
      style: precipitateStyle,
      color: precipitateColor,
      settleTime: canonicalMorph === 'fine_powder' ? 15.0 : 6.0,
      substance: vessel?.precipitateSubstance || 'precipitate'
    });
  }

  if (isExplosion) {
    layers.push(
      { kind: 'burst', at: 0.1, droplets: 80, speed: 3.5, steam: 0.8, shockwave: true },
      { kind: 'flash', at: 0.1, color: '#fef08a', intensity: 2.5, duration: 0.3 },
      { kind: 'shake', t: [0.1, 0.5], trauma: 0.65 },
      { kind: 'slowmo', t: [0.1, 0.6], scale: 0.4 },
      { kind: 'sound', at: 0.1, id: 'alarm' }
    );
  } else if (hasGas) {
    layers.push({ kind: 'sound', at: 0.05, id: 'fizz' });
  } else if (isBoiling) {
    layers.push({ kind: 'sound', at: 0.05, id: 'boil' });
  }

  return {
    id: 'generic_procedural',
    name: 'Generic Reaction VFX',
    duration: isExplosion ? 2.5 : 5.0,
    layers,
    bubbles: (hasGas || isBoiling) ? {
      rate: isBoiling ? 38 : 18,
      color: isBoiling ? '#ffffff' : gasColor,
      gasType: isBoiling ? 'boil' : 'gas',
      emitter: 'bottom'
    } : undefined,

    gasPlume: hasGas ? {
      color: gasColor,
      density: isHeavyGas ? 'heavy' : 'neutral',
      rate: isHeavyGas ? 30 : 20,
      turbidity: 0.6,
      buoyancy: isHeavyGas ? -0.15 : 0.25
    } : undefined,

    steam: (isBoiling || temp >= 48) ? {
      active: true,
      rate: isBoiling ? 30 : Math.floor(6 + ((temp - 48) / 50) * 16),
    } : undefined,

    precipitate: hasPrecipitate ? {
      substance: vessel?.precipitateSubstance || 'precipitate',
      color: precipitateColor,
      morphology: precipitateMorphologySummary,
      rate: 20,
      settleTime: canonicalMorph === 'fine_powder' ? 15.0 : 6.0
    } : undefined,

    sparks: isExplosion ? {
      active: true,
      rate: 40,
      burstCount: 30,
      color: '#fbbf24',
    } : undefined,

    specialEffect: isExplosion ? 'explosion_burst' : undefined,
    soundEffect: isExplosion ? 'alarm' : (hasGas ? 'fizz' : (isBoiling ? 'boil' : undefined)),
  };
}
