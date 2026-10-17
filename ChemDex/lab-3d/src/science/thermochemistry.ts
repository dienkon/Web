// 298.15 K standard-state reference; not a concentration-dependent calorimeter model.
// ATcT v1.122: H2O2(aq), -190.75 kJ/mol. OpenStax Appendix G: H2O(l), -285.83 kJ/mol.
export const H2O2_AQ_REACTION_DH_KJ = Number((2 * (-285.83 - -190.75)).toFixed(2));
export const H2O2_DH_SOURCES = [
  'https://atct.anl.gov/Thermochemical%20Data/version%201.122/reaction/?c1=-1&c2=1&species_number%5B%5D=1155&species_number%5B%5D=847',
  'https://openstax.org/books/chemistry-2e/pages/g-standard-thermodynamic-properties-for-selected-substances',
];
