import type { CatalogIndex, ChainResult, ReactionCatalog } from '../../../../shared/chemistry/reaction-catalog.mjs';

let indexPromise: Promise<CatalogIndex> | null = null;
export function loadLocalCatalog(): Promise<CatalogIndex> {
  if (!indexPromise) indexPromise = Promise.all([
    import('../../../../shared/reaction-catalog.generated.json'),
    import('../../../../shared/chemistry/reaction-catalog.mjs'),
  ]).then(([data, chemistry]) => chemistry.createCatalogIndex(data.default as ReactionCatalog))
    .catch(error => { indexPromise = null; throw error; });
  return indexPromise;
}

export async function requestCatalogChain(body: {action:'analyze'|'generate';chain?:string;start?:string;end?:string;minSteps?:number}): Promise<ChainResult> {
  const [index, chemistry] = await Promise.all([loadLocalCatalog(), import('../../../../shared/chemistry/reaction-catalog.mjs')]);
  return chemistry.solveCatalogRequest(index, body);
}
