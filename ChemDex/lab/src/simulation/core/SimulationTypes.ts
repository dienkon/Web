/**
 * PHYSICAL CHEMISTRY SIMULATION TYPES
 * Defines strict scientific models for thermodynamics, fluid dynamics,
 * phase transitions, nucleation, precipitation, and evaporation.
 */

export type MatterPhase = 
  | 'SOLID' 
  | 'LIQUID' 
  | 'GAS' 
  | 'AQUEOUS_SOLUTION' 
  | 'COLLOIDAL_SUSPENSION' 
  | 'PRECIPITATED_SEDIMENT';

export type BoilingStage = 
  | 'COLD_STABLE' 
  | 'WARMING_CONVECTION' 
  | 'MICROBUBBLE_NUCLEATION' 
  | 'BOILING_ONSET' 
  | 'ACTIVE_BOIL' 
  | 'INTENSE_ROLLING_BOIL';

export type EvaporationRegime = 
  | 'AMBIENT_DORMANT' 
  | 'LOW_EVAPORATION' 
  | 'MODERATE_EVAPORATION' 
  | 'HIGH_THERMAL_EVAPORATION' 
  | 'VAPOR_PLUME';

export type PrecipitationMorphology = 
  | 'fine_powder'   // e.g. BaSO4, AgCl (high cloudiness, very slow Stokes sedimentation)
  | 'crystalline'   // e.g. PbI2 "Golden Rain" (faceted plates, specular glint, rapid settling)
  | 'flocculent'    // e.g. Cu(OH)2 (gelatinous fluffy curd, high aggregation, moderate settling)
  | 'granular'      // e.g. CaCO3, MnO2 (micro-pellets, medium settling)
  | 'gel_like';     // e.g. Al(OH)3, silicic acid (translucent gelatinous suspension)

export interface PrecipitateProfile {
  id: string;
  morphology: PrecipitationMorphology;
  color: string;
  particleDensity_g_cm3: number; // e.g. 4.5 for BaSO4, 6.16 for PbI2, 3.37 for Cu(OH)2
  baseParticleRadius_mm: number; // e.g. 0.05 for powder, 0.4 for flocs
  aggregationRate: number;       // rate of flocculation (0.0 to 1.0)
  cloudinessFactor: number;      // optical turbidity contribution per gram
  specularReflectivity: number;  // 0.0 to 1.0 (PbI2 glittering vs matte chalk)
  roughness: number;             // surface roughness of bottom sediment bed
}

export interface PhysicalBubble {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;          // meters (scene scale)
  baseRadius: number;
  vx: number;
  vy: number;
  vz: number;
  buoyancy: number;
  growthRate: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  aspectRatio: number;      // vertical stretch due to hydrodynamic shear
  life: number;            // seconds alive
  maxLife: number;         // maximum seconds
  opacity: number;
  temperature: number;
  isPopping: boolean;
  popProgress: number;     // 0 to 1 during rapid burst
  merged: boolean;
}

export interface PhysicalPrecipitateParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;          // particle/cluster radius
  mass_ug: number;         // micrograms
  density: number;
  vx: number;
  vy: number;
  vz: number;
  sedimentationSpeed: number; // Stokes terminal velocity
  aggregationLevel: number;   // 1 to 5
  brownianSeed: number;
  opacity: number;
  age: number;
  settled: boolean;
}

export interface PhysicalEvaporationParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  baseSize: number;
  age: number;
  life: number;
  opacity: number;
  curlSeed: number;
}

export interface SedimentBedState {
  amount_g: number;         // total settled sediment mass
  thickness: number;        // physical bed thickness in meters
  roughness: number;
  color: string;
  morphology: PrecipitationMorphology;
  resuspensionTurbidity: number; // transient cloudiness released when agitated
}

export interface VesselSimulationState {
  vesselId: string;
  temperature_c: number;
  ambientTemp_c: number;
  boilingPoint_c: number;
  pressure_atm: number;
  
  volume_ml: number;
  solventVolume_ml: number;
  soluteMass_g: number;
  concentration_M: number;
  viscosity_mPa_s: number;  // Water ~1.0, increases with solutes/cooling
  density_g_ml: number;     // Water ~1.0
  
  heatPower_W: number;      // Incoming thermal wattage
  agitation: number;        // 0 (still) to 1.0 (vigorous stirring)
  
  boilingStage: BoilingStage;
  boilingIntensity: number; // 0 to 1.0
  
  evaporationRegime: EvaporationRegime;
  evaporationRate_ml_s: number;
  exposedSurfaceArea_cm2: number;
  
  cloudiness: number;       // 0 (crystal clear) to 1.0 (completely opaque)
  sedimentBed: SedimentBedState;
  
  hasPrecipitate: boolean;
  precipitateProfile?: PrecipitateProfile;
  
  convectionVelocityField: {
    circulationRate: number; // angular velocity of convection roll
    centerAscentSpeed: number;
    wallDescentSpeed: number;
  };
  
  airflowVector: [number, number, number]; // [airflowX, airflowY, airflowZ]
}
