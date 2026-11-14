import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALL_COMPILED_REACTIONS,
  COMPILED_CATALOG_REACTIONS,
  COMPILED_CURRICULUM_REACTIONS,
  ensureCatalogCompiled,
  isCatalogReady,
} from '../chemistry/reactions/curriculumAndCatalogCompiler';
import { useLabStore } from '../store/useLabStore';

describe('Lazy Catalog Loading & Deferred Vessel Evaluation', () => {
  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
  });

  it('keeps 131 curriculum reactions eager, defers 1,300 catalog reactions, and re-evaluates vessels once loaded', async () => {
    expect(COMPILED_CURRICULUM_REACTIONS.length).toBe(131);
    expect(isCatalogReady()).toBe(false);
    expect(COMPILED_CATALOG_REACTIONS.length).toBe(0);
    expect(useLabStore.getState().catalogReady).toBe(false);

    // Prepare an unreacted vessel using a reaction present only in the 1,300 catalog (Na2Zn(OH)4 + 2HCl -> Zn(OH)2 + 2NaCl + 2H2O)
    const store = useLabStore.getState();
    const beakerId = store.addEquipment('beaker');
    store.injectCustomSubstance(beakerId, 'Na2Zn(OH)4', 'aq', 50, 5.0);
    store.injectCustomSubstance(beakerId, 'HCl', 'aq', 20, 0.1);

    const beforeVessel = useLabStore.getState().equipment[beakerId];
    expect(beforeVessel.contents.some((c) => c.formula === 'Zn(OH)2')).toBe(false);

    // Trigger concurrent loads to verify idempotency and single-compilation guarantee
    await Promise.all([ensureCatalogCompiled(), ensureCatalogCompiled()]);

    expect(isCatalogReady()).toBe(true);
    expect(useLabStore.getState().catalogReady).toBe(true);
    expect(COMPILED_CATALOG_REACTIONS.length).toBeGreaterThanOrEqual(1200);
    expect(ALL_COMPILED_REACTIONS.length).toBe(
      COMPILED_CURRICULUM_REACTIONS.length + COMPILED_CATALOG_REACTIONS.length
    );

    const afterVessel = useLabStore.getState().equipment[beakerId];
    expect(afterVessel.contents.some((c) => c.formula === 'Zn(OH)2')).toBe(true);
  });
});
