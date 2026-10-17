/**
 * Periodic Table Elements Registry for ChemDex
 * Structured for interactive periodic table grid rendering and educational lookup.
 */

export interface PeriodicElement {
  z: number; // Atomic number
  symbol: string;
  name_en: string;
  name_vi: string;
  mass: number;
  period: number; // 1 to 7
  group: number; // 1 to 18
  category:
    | 'alkali'
    | 'alkaline_earth'
    | 'transition_metal'
    | 'post_transition'
    | 'metalloid'
    | 'reactive_nonmetal'
    | 'halogen'
    | 'noble_gas';
  electronConfig: string;
  electronegativity?: number;
  oxidationStates: number[];
  phase_STP: 'solid' | 'liquid' | 'gas';
}

export const PERIODIC_ELEMENTS: PeriodicElement[] = [
  // Period 1
  { z: 1, symbol: 'H', name_en: 'Hydrogen', name_vi: 'Hiđro', mass: 1.008, period: 1, group: 1, category: 'reactive_nonmetal', electronConfig: '1s¹', electronegativity: 2.20, oxidationStates: [-1, 1], phase_STP: 'gas' },
  { z: 2, symbol: 'He', name_en: 'Helium', name_vi: 'Heli', mass: 4.003, period: 1, group: 18, category: 'noble_gas', electronConfig: '1s²', oxidationStates: [0], phase_STP: 'gas' },

  // Period 2
  { z: 3, symbol: 'Li', name_en: 'Lithium', name_vi: 'Liti', mass: 6.94, period: 2, group: 1, category: 'alkali', electronConfig: '[He] 2s¹', electronegativity: 0.98, oxidationStates: [1], phase_STP: 'solid' },
  { z: 4, symbol: 'Be', name_en: 'Beryllium', name_vi: 'Beri', mass: 9.012, period: 2, group: 2, category: 'alkaline_earth', electronConfig: '[He] 2s²', electronegativity: 1.57, oxidationStates: [2], phase_STP: 'solid' },
  { z: 5, symbol: 'B', name_en: 'Boron', name_vi: 'Bo', mass: 10.81, period: 2, group: 13, category: 'metalloid', electronConfig: '[He] 2s² 2p¹', electronegativity: 2.04, oxidationStates: [3], phase_STP: 'solid' },
  { z: 6, symbol: 'C', name_en: 'Carbon', name_vi: 'Cacbon', mass: 12.011, period: 2, group: 14, category: 'reactive_nonmetal', electronConfig: '[He] 2s² 2p²', electronegativity: 2.55, oxidationStates: [-4, -2, 2, 4], phase_STP: 'solid' },
  { z: 7, symbol: 'N', name_en: 'Nitrogen', name_vi: 'Nitơ', mass: 14.007, period: 2, group: 15, category: 'reactive_nonmetal', electronConfig: '[He] 2s² 2p³', electronegativity: 3.04, oxidationStates: [-3, -2, -1, 1, 2, 3, 4, 5], phase_STP: 'gas' },
  { z: 8, symbol: 'O', name_en: 'Oxygen', name_vi: 'Oxi', mass: 15.999, period: 2, group: 16, category: 'reactive_nonmetal', electronConfig: '[He] 2s² 2p⁴', electronegativity: 3.44, oxidationStates: [-2, -1], phase_STP: 'gas' },
  { z: 9, symbol: 'F', name_en: 'Fluorine', name_vi: 'Flo', mass: 18.998, period: 2, group: 17, category: 'halogen', electronConfig: '[He] 2s² 2p⁵', electronegativity: 3.98, oxidationStates: [-1], phase_STP: 'gas' },
  { z: 10, symbol: 'Ne', name_en: 'Neon', name_vi: 'Neon', mass: 20.180, period: 2, group: 18, category: 'noble_gas', electronConfig: '[He] 2s² 2p⁶', oxidationStates: [0], phase_STP: 'gas' },

  // Period 3
  { z: 11, symbol: 'Na', name_en: 'Sodium', name_vi: 'Natri', mass: 22.990, period: 3, group: 1, category: 'alkali', electronConfig: '[Ne] 3s¹', electronegativity: 0.93, oxidationStates: [1], phase_STP: 'solid' },
  { z: 12, symbol: 'Mg', name_en: 'Magnesium', name_vi: 'Magie', mass: 24.305, period: 3, group: 2, category: 'alkaline_earth', electronConfig: '[Ne] 3s²', electronegativity: 1.31, oxidationStates: [2], phase_STP: 'solid' },
  { z: 13, symbol: 'Al', name_en: 'Aluminium', name_vi: 'Nhôm', mass: 26.982, period: 3, group: 13, category: 'post_transition', electronConfig: '[Ne] 3s² 3p¹', electronegativity: 1.61, oxidationStates: [3], phase_STP: 'solid' },
  { z: 14, symbol: 'Si', name_en: 'Silicon', name_vi: 'Silic', mass: 28.085, period: 3, group: 14, category: 'metalloid', electronConfig: '[Ne] 3s² 3p²', electronegativity: 1.90, oxidationStates: [-4, 4], phase_STP: 'solid' },
  { z: 15, symbol: 'P', name_en: 'Phosphorus', name_vi: 'Photpho', mass: 30.974, period: 3, group: 15, category: 'reactive_nonmetal', electronConfig: '[Ne] 3s² 3p³', electronegativity: 2.19, oxidationStates: [-3, 3, 5], phase_STP: 'solid' },
  { z: 16, symbol: 'S', name_en: 'Sulfur', name_vi: 'Lưu huỳnh', mass: 32.06, period: 3, group: 16, category: 'reactive_nonmetal', electronConfig: '[Ne] 3s² 3p⁴', electronegativity: 2.58, oxidationStates: [-2, 4, 6], phase_STP: 'solid' },
  { z: 17, symbol: 'Cl', name_en: 'Chlorine', name_vi: 'Clo', mass: 35.45, period: 3, group: 17, category: 'halogen', electronConfig: '[Ne] 3s² 3p⁵', electronegativity: 3.16, oxidationStates: [-1, 1, 3, 5, 7], phase_STP: 'gas' },
  { z: 18, symbol: 'Ar', name_en: 'Argon', name_vi: 'Argon', mass: 39.948, period: 3, group: 18, category: 'noble_gas', electronConfig: '[Ne] 3s² 3p⁶', oxidationStates: [0], phase_STP: 'gas' },

  // Period 4
  { z: 19, symbol: 'K', name_en: 'Potassium', name_vi: 'Kali', mass: 39.098, period: 4, group: 1, category: 'alkali', electronConfig: '[Ar] 4s¹', electronegativity: 0.82, oxidationStates: [1], phase_STP: 'solid' },
  { z: 20, symbol: 'Ca', name_en: 'Calcium', name_vi: 'Canxi', mass: 40.078, period: 4, group: 2, category: 'alkaline_earth', electronConfig: '[Ar] 4s²', electronegativity: 1.00, oxidationStates: [2], phase_STP: 'solid' },
  { z: 21, symbol: 'Sc', name_en: 'Scandium', name_vi: 'Scandi', mass: 44.956, period: 4, group: 3, category: 'transition_metal', electronConfig: '[Ar] 3d¹ 4s²', electronegativity: 1.36, oxidationStates: [3], phase_STP: 'solid' },
  { z: 22, symbol: 'Ti', name_en: 'Titanium', name_vi: 'Titan', mass: 47.867, period: 4, group: 4, category: 'transition_metal', electronConfig: '[Ar] 3d² 4s²', electronegativity: 1.54, oxidationStates: [2, 3, 4], phase_STP: 'solid' },
  { z: 23, symbol: 'V', name_en: 'Vanadium', name_vi: 'Vanadi', mass: 50.942, period: 4, group: 5, category: 'transition_metal', electronConfig: '[Ar] 3d³ 4s²', electronegativity: 1.63, oxidationStates: [2, 3, 4, 5], phase_STP: 'solid' },
  { z: 24, symbol: 'Cr', name_en: 'Chromium', name_vi: 'Crom', mass: 51.996, period: 4, group: 6, category: 'transition_metal', electronConfig: '[Ar] 3d⁵ 4s¹', electronegativity: 1.66, oxidationStates: [2, 3, 6], phase_STP: 'solid' },
  { z: 25, symbol: 'Mn', name_en: 'Manganese', name_vi: 'Mangan', mass: 54.938, period: 4, group: 7, category: 'transition_metal', electronConfig: '[Ar] 3d⁵ 4s²', electronegativity: 1.55, oxidationStates: [2, 3, 4, 6, 7], phase_STP: 'solid' },
  { z: 26, symbol: 'Fe', name_en: 'Iron', name_vi: 'Sắt', mass: 55.845, period: 4, group: 8, category: 'transition_metal', electronConfig: '[Ar] 3d⁶ 4s²', electronegativity: 1.83, oxidationStates: [2, 3], phase_STP: 'solid' },
  { z: 27, symbol: 'Co', name_en: 'Cobalt', name_vi: 'Coban', mass: 58.933, period: 4, group: 9, category: 'transition_metal', electronConfig: '[Ar] 3d⁷ 4s²', electronegativity: 1.88, oxidationStates: [2, 3], phase_STP: 'solid' },
  { z: 28, symbol: 'Ni', name_en: 'Nickel', name_vi: 'Niken', mass: 58.693, period: 4, group: 10, category: 'transition_metal', electronConfig: '[Ar] 3d⁸ 4s²', electronegativity: 1.91, oxidationStates: [2, 3], phase_STP: 'solid' },
  { z: 29, symbol: 'Cu', name_en: 'Copper', name_vi: 'Đồng', mass: 63.546, period: 4, group: 11, category: 'transition_metal', electronConfig: '[Ar] 3d¹⁰ 4s¹', electronegativity: 1.90, oxidationStates: [1, 2], phase_STP: 'solid' },
  { z: 30, symbol: 'Zn', name_en: 'Zinc', name_vi: 'Kẽm', mass: 65.38, period: 4, group: 12, category: 'transition_metal', electronConfig: '[Ar] 3d¹⁰ 4s²', electronegativity: 1.65, oxidationStates: [2], phase_STP: 'solid' },
  { z: 31, symbol: 'Ga', name_en: 'Gallium', name_vi: 'Gali', mass: 69.723, period: 4, group: 13, category: 'post_transition', electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹', electronegativity: 1.81, oxidationStates: [3], phase_STP: 'solid' },
  { z: 32, symbol: 'Ge', name_en: 'Germanium', name_vi: 'Gecmani', mass: 72.63, period: 4, group: 14, category: 'metalloid', electronConfig: '[Ar] 3d¹⁰ 4s² 4p²', electronegativity: 2.01, oxidationStates: [2, 4], phase_STP: 'solid' },
  { z: 33, symbol: 'As', name_en: 'Arsenic', name_vi: 'Asen', mass: 74.922, period: 4, group: 15, category: 'metalloid', electronConfig: '[Ar] 3d¹⁰ 4s² 4p³', electronegativity: 2.18, oxidationStates: [-3, 3, 5], phase_STP: 'solid' },
  { z: 34, symbol: 'Se', name_en: 'Selenium', name_vi: 'Selen', mass: 78.971, period: 4, group: 16, category: 'reactive_nonmetal', electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴', electronegativity: 2.55, oxidationStates: [-2, 4, 6], phase_STP: 'solid' },
  { z: 35, symbol: 'Br', name_en: 'Bromine', name_vi: 'Brom', mass: 79.904, period: 4, group: 17, category: 'halogen', electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', electronegativity: 2.96, oxidationStates: [-1, 1, 3, 5], phase_STP: 'liquid' },
  { z: 36, symbol: 'Kr', name_en: 'Krypton', name_vi: 'Kripton', mass: 83.798, period: 4, group: 18, category: 'noble_gas', electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', oxidationStates: [0], phase_STP: 'gas' },

  // Key heavy curriculum elements
  { z: 47, symbol: 'Ag', name_en: 'Silver', name_vi: 'Bạc', mass: 107.868, period: 5, group: 11, category: 'transition_metal', electronConfig: '[Kr] 4d¹⁰ 5s¹', electronegativity: 1.93, oxidationStates: [1], phase_STP: 'solid' },
  { z: 53, symbol: 'I', name_en: 'Iodine', name_vi: 'Iot', mass: 126.904, period: 5, group: 17, category: 'halogen', electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', electronegativity: 2.66, oxidationStates: [-1, 1, 5, 7], phase_STP: 'solid' },
  { z: 56, symbol: 'Ba', name_en: 'Barium', name_vi: 'Bari', mass: 137.327, period: 6, group: 2, category: 'alkaline_earth', electronConfig: '[Xe] 6s²', electronegativity: 0.89, oxidationStates: [2], phase_STP: 'solid' },
  { z: 78, symbol: 'Pt', name_en: 'Platinum', name_vi: 'Bạch kim', mass: 195.084, period: 6, group: 10, category: 'transition_metal', electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', electronegativity: 2.28, oxidationStates: [2, 4], phase_STP: 'solid' },
  { z: 79, symbol: 'Au', name_en: 'Gold', name_vi: 'Vàng', mass: 196.967, period: 6, group: 11, category: 'transition_metal', electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', electronegativity: 2.54, oxidationStates: [1, 3], phase_STP: 'solid' },
  { z: 80, symbol: 'Hg', name_en: 'Mercury', name_vi: 'Thủy ngân', mass: 200.592, period: 6, group: 12, category: 'transition_metal', electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', electronegativity: 2.00, oxidationStates: [1, 2], phase_STP: 'liquid' },
  { z: 82, symbol: 'Pb', name_en: 'Lead', name_vi: 'Chì', mass: 207.2, period: 6, group: 14, category: 'post_transition', electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', electronegativity: 2.33, oxidationStates: [2, 4], phase_STP: 'solid' },
];

export const CATEGORY_COLORS: Record<PeriodicElement['category'], { bg: string; text: string; border: string }> = {
  alkali: { bg: 'bg-red-500/15', text: 'text-red-700', border: 'border-red-400' },
  alkaline_earth: { bg: 'bg-orange-500/15', text: 'text-orange-700', border: 'border-orange-400' },
  transition_metal: { bg: 'bg-amber-500/15', text: 'text-amber-700', border: 'border-amber-400' },
  post_transition: { bg: 'bg-emerald-500/15', text: 'text-emerald-700', border: 'border-emerald-400' },
  metalloid: { bg: 'bg-teal-500/15', text: 'text-teal-700', border: 'border-teal-400' },
  reactive_nonmetal: { bg: 'bg-blue-500/15', text: 'text-blue-700', border: 'border-blue-400' },
  halogen: { bg: 'bg-indigo-500/15', text: 'text-indigo-700', border: 'border-indigo-400' },
  noble_gas: { bg: 'bg-purple-500/15', text: 'text-purple-700', border: 'border-purple-400' },
};
