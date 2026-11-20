export const BURETTE_STOCKS = [
  { id: 'naoh-005', reagentFormula: 'NaOH', concentration_M: 0.05 },
  { id: 'naoh-010', reagentFormula: 'NaOH', concentration_M: 0.1 },
  { id: 'hcl-005', reagentFormula: 'HCl (dil)', concentration_M: 0.05 },
  { id: 'hcl-010', reagentFormula: 'HCl (dil)', concentration_M: 0.1 },
] as const;

export type BuretteStockId = (typeof BURETTE_STOCKS)[number]['id'];
