/**
 * LEGACY ADAPTER LAYER (§1.8, §20 M0)
 * Bridges the new physically-grounded simulation engine (SI units, multi-phase contents, thermodynamics, kinetics)
 * to the existing Zustand store and UI components without regressions.
 *
 * Feature Flag:
 * - Controlled via URL parameter `?engine=v2` (default) vs `?engine=v1`
 * - Also provides manual programmatic override in settings
 */

import { VesselState, SubstanceContent } from '../types/chemistry';
import { MultiPhaseContents } from '../sim/contents';
import { VESSEL_GEOMETRIES } from '../sim/vessel';
import { SUBSTANCE_DATABASE } from '../chem/substances';
import { calculateMixtureColorRGB } from '../chem/optics';
import { mlToM3, m3ToMl, kgToGrams, gramsToKg, kelvinToCelsius, celsiusToKelvin } from '../core/units';

export class LegacyAdapter {
  private static engineMode: 'v1' | 'v2' = 'v2';

  static {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const engineParam = params.get('engine');
      if (engineParam === 'v1') {
        LegacyAdapter.engineMode = 'v1';
      } else {
        LegacyAdapter.engineMode = 'v2';
      }
    }
  }

  public static isV2(): boolean {
    return LegacyAdapter.engineMode === 'v2';
  }

  public static setEngineMode(mode: 'v1' | 'v2'): void {
    LegacyAdapter.engineMode = mode;
  }

  /**
   * Initializes or synchronizes a MultiPhaseContents instance from an existing legacy VesselState
   */
  public static syncContentsFromLegacyVessel(vessel: VesselState, target: MultiPhaseContents): void {
    target.vesselId = vessel.id;
    target.volume_m3 = mlToM3(vessel.volume_ml || 0);
    target.temperature_K = celsiusToKelvin(vessel.temperature_c ?? 25.0);
    target.ph = vessel.ph ?? 7.0;

    // Reset dissolved species and populate from contents
    target.dissolvedMoles = {};
    let solventMass_kg = 0;

    if (vessel.contents && vessel.contents.length > 0) {
      for (const item of vessel.contents) {
        if (item.formula === 'H2O') {
          solventMass_kg += gramsToKg(item.mass_g || (item.moles * 18.015));
        } else {
          target.dissolvedMoles[item.formula] = item.moles || 0;
        }
      }
    } else if (vessel.substances && vessel.substances.length > 0) {
      // Fallback: estimate moles from volume
      for (const sub of vessel.substances) {
        if (sub === 'H2O') {
          solventMass_kg += gramsToKg(vessel.volume_ml);
        } else {
          target.dissolvedMoles[sub] = (vessel.volume_ml / 1000.0) * 0.5;
        }
      }
    }

    target.solventMass_kg = solventMass_kg > 0 ? solventMass_kg : gramsToKg(vessel.volume_ml || 0);

    // Sync precipitate
    if (vessel.hasPrecipitate && vessel.precipitateAmount_g) {
      target.sediment = {
        substanceId: vessel.precipitateColor || 'Precipitate',
        mass_kg: gramsToKg(vessel.precipitateAmount_g),
        thickness_m: 0.005,
        porosity: 0.8,
        color: vessel.precipitateColor || '#ffffff'
      };
    }
  }

  /**
   * Translates a MultiPhaseContents state into a legacy VesselState update dictionary
   * for synchronized consumption by UI overlays and inspector panels.
   */
  public static exportToLegacyVessel(
    contents: MultiPhaseContents,
    existingVessel: VesselState
  ): Partial<VesselState> {
    const vol_ml = m3ToMl(contents.volume_m3);
    const mass_g = kgToGrams(contents.getTotalMass_kg());
    const temp_c = kelvinToCelsius(contents.temperature_K);
    const density_g_ml = contents.getDensity_kg_m3() / 1000.0;

    // Build contents vector
    const newContents: SubstanceContent[] = [];

    // Water
    if (contents.solventMass_kg > 1e-6) {
      newContents.push({
        formula: 'H2O',
        moles: contents.solventMass_kg / 0.018015,
        mass_g: kgToGrams(contents.solventMass_kg),
        volume_ml: vol_ml,
        concentration_M: 55.5
      });
    }

    // Solutes
    const opticalSpecies: { absorptivity_RGB: [number, number, number]; concentration_M: number }[] = [];
    const formulas: string[] = [];

    for (const [subId, moles] of Object.entries(contents.dissolvedMoles)) {
      if (moles <= 1e-7) continue;
      const sub = SUBSTANCE_DATABASE[subId];
      const mass_g = moles * (sub ? sub.molarMass * 1000 : 100);
      const conc_M = moles / Math.max(1e-4, contents.volume_m3 * 1000.0);

      newContents.push({
        formula: subId,
        moles,
        mass_g,
        concentration_M: conc_M
      });
      formulas.push(subId);

      if (sub && sub.optical) {
        opticalSpecies.push({
          absorptivity_RGB: sub.optical.absorptivity_RGB,
          concentration_M: conc_M
        });
      }
    }

    // Spectral color from Beer-Lambert
    const geom = VESSEL_GEOMETRIES[existingVessel.type] || VESSEL_GEOMETRIES.beaker;
    const opticalPath_cm = geom.radiusAtHeight(geom.heightAtVolume(contents.volume_m3)) * 200.0;
    const { colorHex } = calculateMixtureColorRGB(
      opticalSpecies,
      opticalPath_cm,
      contents.suspended ? contents.suspended.turbidityScatter : 0.0
    );

    // Precipitate
    const hasPrecip = (contents.sediment !== null && contents.sediment.mass_kg > 1e-6) ||
                      (contents.suspended !== null && contents.suspended.totalMass_kg > 1e-6);
    const precipAmount_g = (contents.sediment ? kgToGrams(contents.sediment.mass_kg) : 0) +
                           (contents.suspended ? kgToGrams(contents.suspended.totalMass_kg) : 0);

    return {
      volume_ml: Math.round(vol_ml * 100) / 100,
      volume: Math.min(1.0, vol_ml / existingVessel.capacity_ml),
      mass_g: Math.round(mass_g * 100) / 100,
      temperature_c: Math.round(temp_c * 10) / 10,
      ph: Math.round(contents.ph * 100) / 100,
      density_g_ml: Math.round(density_g_ml * 1000) / 1000,
      liquidColor: colorHex,
      contents: newContents,
      substances: Array.from(new Set(['H2O', ...formulas])),
      hasPrecipitate: hasPrecip,
      precipitateAmount_g: Math.round(precipAmount_g * 100) / 100,
      hasGas: contents.gasHeadspace.totalMolesProduced > 1e-5
    };
  }
}
