import { SedimentBedState, PrecipitationMorphology } from '../core/SimulationTypes';
import { getPrecipitateProfile } from '../core/SimulationConfig';

export class SedimentationSystem {
  /**
   * Initializes a sediment bed
   */
  public static createSedimentBed(color = '#f8fafc', morphology: PrecipitationMorphology = 'fine_powder'): SedimentBedState {
    return {
      amount_g: 0,
      thickness: 0,
      roughness: 0.85,
      color,
      morphology,
      resuspensionTurbidity: 0
    };
  }

  /**
   * Updates sediment accumulation and handles resuspension upon mechanical agitation
   */
  public static updateSediment(
    sediment: SedimentBedState,
    dt: number,
    vesselRadius: number,
    agitation: number = 0
  ): { resuspendedMass_g: number; turbidityBoost: number } {
    const profile = getPrecipitateProfile(sediment.morphology);
    const floorArea_m2 = Math.PI * (vesselRadius * vesselRadius);

    // Calculate physical bed thickness based on bulk packing density (~65% of crystal density)
    const bulkDensity_g_m3 = (profile.particleDensity_g_cm3 * 1e6) * 0.65;
    sediment.thickness = Math.min(0.22, sediment.amount_g / Math.max(0.001, floorArea_m2 * bulkDensity_g_m3));

    // Handle mechanical agitation / stirring resuspension
    let resuspendedMass_g = 0;
    let turbidityBoost = 0;

    if (agitation > 0.08 && sediment.amount_g > 0.001) {
      // Shear stress resuspends sediment into liquid column
      const resuspendRate = 0.18 * agitation; // fraction per second
      resuspendedMass_g = Math.min(sediment.amount_g, sediment.amount_g * resuspendRate * dt);
      sediment.amount_g = Math.max(0, sediment.amount_g - resuspendedMass_g);

      turbidityBoost = (resuspendedMass_g * profile.cloudinessFactor * 2.5);
      sediment.resuspensionTurbidity = Math.min(1.0, sediment.resuspensionTurbidity + turbidityBoost);
    } else {
      // Settles back when agitation stops
      sediment.resuspensionTurbidity = Math.max(0, sediment.resuspensionTurbidity - dt * 0.25);
    }

    return { resuspendedMass_g, turbidityBoost };
  }
}
