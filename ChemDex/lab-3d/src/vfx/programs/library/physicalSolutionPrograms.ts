/**
 * physicalSolutionPrograms.ts — Physical Dissolution, Dilution & Phase Transition Reaction Programs
 */

import { ReactionProgram } from '../../../shared/programSchema';

export const PHYSICAL_SOLUTION_PROGRAMS: ReactionProgram[] = [
  // 1. NH4NO3 Dissolution (Endothermic Chilling & Wall Frosting)
  {
    schema: 'chemdex.program/1',
    id: 'nh4no3_dissolution',
    provenance: 'handcrafted',
    controller: 'nh4no3_cold',
    chemistry: {
      equation: 'NH4NO3(s) -> NH4NO3(aq)',
      species: [
        { formula: 'NH4NO3', role: 'reactant', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'NH4NO3', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff' }
      ],
      deltaH_kJ_per_mol: 25.7, // Endothermic (+25.7 kJ/mol)
      kinetics: { model: 'surface_limited', halfTime_s: 2.5 },
      hazards: []
    },
    visual: {
      duration_s: 5.5,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0.05, 0.55], intensity: 1.0, params: { speed: 1.4, color: '#f0f9ff' } },
        { id: 'frost', atom: 'endothermicFrost', anchor: 'outside', window: [0.2, 0.95], intensity: 1.6, params: { frostThickness_mm: 0.8, flaskTemperature_c: 2.0 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Muối amoni nitrat tan dần trong nước, thành cốc lạnh buốt và có thể xuất hiện một lớp sương/đóng băng mỏng bên ngoài.',
      observation_en: 'Ammonium nitrate crystals dissolve rapidly with strong chilling; condensation and frost form on the outer beaker wall.',
      why_vi: 'Quá trình phá vỡ mạng tinh thể ion thu nhiệt nhiều hơn năng lượng solvat hóa (ΔH_sol = +25.7 kJ/mol).',
      why_en: 'Lattice dissociation energy exceeds ion hydration enthalpy, causing pronounced endothermic cooling (ΔH_sol = +25.7 kJ/mol).'
    },
    confidence: 1.0
  },

  // 2. NaOH Pellet Dissolution (Exothermic Heating & Steam)
  {
    schema: 'chemdex.program/1',
    id: 'naoh_dissolution',
    provenance: 'handcrafted',
    controller: 'naoh_dissolution_heat',
    chemistry: {
      equation: 'NaOH(s) -> NaOH(aq)',
      species: [
        { formula: 'NaOH', role: 'reactant', coeff: 1, phase: 's', colorHex: '#ffffff', hazards: ['GHS05_corrosive'] },
        { formula: 'NaOH', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff', hazards: ['GHS05_corrosive'] }
      ],
      deltaH_kJ_per_mol: -44.5, // Exothermic (-44.5 kJ/mol)
      kinetics: { model: 'surface_limited', halfTime_s: 2.0 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0.05, 0.5], intensity: 1.0, params: { speed: 1.8 } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.2, 0.85], intensity: 0.8, params: { steamDensity: 0.65, temperature_c: 55 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Viên xút NaOH tan tỏa lượng nhiệt rất lớn, dung dịch nóng lên rõ rệt và bốc hơi nước nhẹ.',
      observation_en: 'Sodium hydroxide pellets dissolve exothermically, releasing intense heat that sharply warms the solution.',
      why_vi: 'Nhiệt solvat hóa ion Na+ và OH- giải phóng vượt xa năng lượng phá vỡ mạng tinh thể (ΔH_sol = -44.5 kJ/mol).',
      why_en: 'Hydration energy of Na+ and OH- ions strongly exceeds crystal lattice energy (ΔH_sol = -44.5 kJ/mol).'
    },
    confidence: 1.0
  },

  // 3. CaCl2 Anhydrous Dissolution (Exothermic)
  {
    schema: 'chemdex.program/1',
    id: 'cacl2_dissolution',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'CaCl2(s) -> CaCl2(aq)',
      species: [
        { formula: 'CaCl2', role: 'reactant', coeff: 1, phase: 's', colorHex: '#ffffff' },
        { formula: 'CaCl2', role: 'product', coeff: 1, phase: 'aq', colorHex: '#ffffff' }
      ],
      deltaH_kJ_per_mol: -81.3,
      kinetics: { model: 'surface_limited', halfTime_s: 1.8 },
      hazards: []
    },
    visual: {
      duration_s: 4.5,
      timeline: [
        { id: 'swirl', atom: 'liquidSwirl', anchor: 'pourPoint', window: [0.05, 0.5], intensity: 1.0, params: { speed: 1.5 } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.25, 0.75], intensity: 0.7, params: { steamDensity: 0.5, temperature_c: 48 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Bột canxi clorua khan tan mạnh trong nước và tỏa nhiều nhiệt.',
      observation_en: 'Anhydrous calcium chloride powder dissolves rapidly in water with significant heat release.',
      why_vi: 'Hydrat hóa ion Ca2+ có mật độ điện tích cao giải phóng enthalpy lớn (ΔH_sol = -81.3 kJ/mol).',
      why_en: 'Hydration of the doubly charged Ca2+ cation releases high enthalpy (ΔH_sol = -81.3 kJ/mol).'
    },
    confidence: 1.0
  },

  // 4. Concentrated H2SO4 Dilution (Extreme Exothermic)
  {
    schema: 'chemdex.program/1',
    id: 'h2so4_dilution',
    provenance: 'handcrafted',
    chemistry: {
      equation: 'H2SO4(l) + H2O(l) -> H2SO4(aq) + H2O(l)',
      species: [
        { formula: 'H2SO4', role: 'reactant', coeff: 1, phase: 'l', hazards: ['GHS05_corrosive'] },
        { formula: 'H2O', role: 'reactant', coeff: 1, phase: 'l' },
        { formula: 'H2SO4', role: 'product', coeff: 1, phase: 'aq', hazards: ['GHS05_corrosive'] },
        { formula: 'H2O', role: 'product', coeff: 1, phase: 'l' }
      ],
      deltaH_kJ_per_mol: -95.0,
      kinetics: { model: 'instant', halfTime_s: 0.1 },
      hazards: ['GHS05_corrosive']
    },
    visual: {
      duration_s: 5.0,
      timeline: [
        { id: 'swirl', atom: 'schlierenStreaks', anchor: 'bulk', window: [0.0, 0.5], intensity: 1.5, params: { intensity: 1.5, streakScale: 0.15, lifespan_s: 4.0 } },
        { id: 'steam', atom: 'thermalSteam', anchor: 'rim', window: [0.15, 0.85], intensity: 1.2, params: { steamDensity: 1.2, temperature_c: 85 } }
      ],
      after: {
        liquidColor: '#ffffff',
        liquidOpacity: 0.95,
        turbidity: 0.0,
        gasesOffgassed: []
      }
    },
    explain: {
      observation_vi: 'Khi pha loãng H2SO4 đặc, dung dịch nóng bỏng tức thì, có khói hơi nước bốc lên mạnh.',
      observation_en: 'Diluting concentrated sulfuric acid causes instantaneous extreme heating and strong steam evolution.',
      why_vi: 'Quá trình hydrat hóa H2SO4 tỏa nhiệt cực kỳ mãnh liệt (ΔH_dil = -95.0 kJ/mol).',
      why_en: 'Hydration of anhydrous sulfuric acid is extremely exothermic (ΔH_dil = -95.0 kJ/mol).'
    },
    confidence: 1.0
  }
];
