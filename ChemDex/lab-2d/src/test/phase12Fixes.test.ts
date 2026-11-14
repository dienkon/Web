import { describe, expect, it } from 'vitest';
import {
  REACTION_DATABASE,
  findMatchingVesselReactions,
  resolveReactionEquationById,
} from '../chemistry/reactions/reactionDatabase';
import {
  COMPILED_CATALOG_REACTIONS,
  ensureCatalogCompiled,
} from '../chemistry/reactions/curriculumAndCatalogCompiler';
import { shouldIgnoreWorkbenchGlobalKey } from '../components/workspace/equipmentA11y';

function makeMockTarget(opts: {
  tagName?: string;
  isContentEditable?: boolean;
  insideSelector?: string | null;
}) {
  return {
    tagName: opts.tagName ?? 'DIV',
    isContentEditable: opts.isContentEditable ?? false,
    closest(selector: string) {
      if (!opts.insideSelector) return null;
      return selector.includes(opts.insideSelector) ? {} : null;
    },
  } as unknown as EventTarget;
}

describe('Phase 12 UI keyboard guard', () => {
  it('ignores workbench global keys for form controls, contentEditable, dialogs, and prevented events', () => {
    expect(
      shouldIgnoreWorkbenchGlobalKey({
        defaultPrevented: true,
        target: makeMockTarget({ tagName: 'DIV' }),
      })
    ).toBe(true);

    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(
        shouldIgnoreWorkbenchGlobalKey({
          target: makeMockTarget({ tagName }),
        })
      ).toBe(true);
    }

    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: makeMockTarget({ tagName: 'DIV', isContentEditable: true }),
      })
    ).toBe(true);

    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: makeMockTarget({ tagName: 'SPAN', insideSelector: '[contenteditable="true"]' }),
      })
    ).toBe(true);

    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: makeMockTarget({ tagName: 'BUTTON', insideSelector: '[role="dialog"]' }),
      })
    ).toBe(true);

    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: makeMockTarget({ tagName: 'DIV', insideSelector: '[aria-modal="true"]' }),
      })
    ).toBe(true);
  });

  it('allows global workbench keys on canvas vessels and non-modal controls', () => {
    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: null,
      })
    ).toBe(false);

    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: makeMockTarget({ tagName: 'DIV', insideSelector: null }),
      })
    ).toBe(false);

    expect(
      shouldIgnoreWorkbenchGlobalKey({
        target: makeMockTarget({ tagName: 'BUTTON', insideSelector: null }),
      })
    ).toBe(false);
  });
});

describe('Phase 12 reaction lookup across curated, curriculum, and catalog databases', () => {
  it('matches vessel reactions with formula/phase normalization and excludes empty species', () => {
    const matches = findMatchingVesselReactions(
      [
        { formula: 'cuso4(aq)', moles: 0.01 },
        { formula: 'NaOH(aq)', moles: 0.02 },
      ],
      6
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].reactants.every((r) => ['CuSO4', 'NaOH'].includes(r.formula))).toBe(true);

    const zeroMolesMatches = findMatchingVesselReactions(
      [
        { formula: 'CuSO4', moles: 0 },
        { formula: 'NaOH', moles: 0 },
      ],
      6
    );
    expect(zeroMolesMatches).toEqual([]);
  });

  it('finds lazy-compiled catalog reactions and resolves notebook equations by ID', async () => {
    await ensureCatalogCompiled();
    expect(COMPILED_CATALOG_REACTIONS.length).toBeGreaterThan(0);

    const curatedIds = new Set(REACTION_DATABASE.map((r) => r.id));
    const catalogOnlyRx = COMPILED_CATALOG_REACTIONS.find(
      (rx) => !curatedIds.has(rx.id) && rx.reactants.length > 0
    );
    expect(catalogOnlyRx).toBeDefined();

    if (catalogOnlyRx) {
      expect(resolveReactionEquationById(catalogOnlyRx.id)).toBe(catalogOnlyRx.equation);

      const vesselContents = catalogOnlyRx.reactants.map((r) => ({
        formula: r.formula,
        moles: 0.05,
      }));
      const matchedIds = findMatchingVesselReactions(vesselContents, 20).map((r) => r.id);
      expect(matchedIds).toContain(catalogOnlyRx.id);
    }

    const firstCurated = REACTION_DATABASE[0];
    expect(resolveReactionEquationById(firstCurated.id)).toBe(firstCurated.equation);
    expect(resolveReactionEquationById('non-existent-reaction-id-999')).toBeUndefined();
  });
});
