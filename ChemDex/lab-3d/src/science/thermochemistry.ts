// 298.15 K standard-state reference; not a concentration-dependent calorimeter model.
// ATcT v1.122: H2O2(aq), -190.75 kJ/mol. OpenStax Appendix G: H2O(l), -285.83 kJ/mol.
export const H2O2_AQ_REACTION_DH_KJ = Number((2 * (-285.83 - -190.75)).toFixed(2));
export const H2O2_DH_SOURCES = [
  'https://atct.anl.gov/Thermochemical%20Data/version%201.122/reaction/?c1=-1&c2=1&species_number%5B%5D=1155&species_number%5B%5D=847',
  'https://openstax.org/books/chemistry-2e/pages/g-standard-thermodynamic-properties-for-selected-substances',
];

// OKState formation-enthalpy worked example: -469.6 NaOH(aq), -285.83 H2O(l).
// Basis: 2Na + 2H2O -> 2NaOH + H2, 298.15 K; not a measured sample calorimetry fit.
export const SODIUM_WATER_DH_KJ = -367.54;
export const SODIUM_WATER_DH_SOURCES = ['https://genchem1.chem.okstate.edu/BDA/ACA20Response.php'];
