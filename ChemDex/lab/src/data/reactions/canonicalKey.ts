import { normalizeChemicalId } from '../chemicals';

/**
 * Generates an order-independent, normalized canonical reaction key
 * e.g. ['NaOH', 'HCl'] -> 'HCl+NaOH'
 * ['CuSO4', 'Fe'] -> 'CuSO4+Fe'
 * with optional conditions like @heat
 */
export function createCanonicalReactionKey(
  chemicalIds: string[],
  options?: { isHeating?: boolean }
): string {
  const normalizedIds = chemicalIds
    .map(id => normalizeChemicalId(id) || id.trim())
    .filter(Boolean)
    // Deduplicate
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  let key = normalizedIds.join('+');
  if (options?.isHeating) {
    key += '@heat';
  }
  return key;
}
