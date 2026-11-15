import configData from '../data/config.json';
import indexData from '../data/index.json';
import referenceIndex from '../data/reference-index.generated.json';
import biographyIndex from '../data/biography-index.generated.json';
import editorialIndex from '../data/editorial-index.generated.json';
import { CategoryConfig, DocMeta, DocFull } from '../types';

export type { CategoryConfig, DocMeta, DocFull };

export const categories: CategoryConfig[] = configData.categories;
export const libraryDocs: DocMeta[] = [...editorialIndex,...indexData,...biographyIndex,...referenceIndex];
export const categoryCounts = Object.fromEntries(categories.map(category => [category.id,libraryDocs.filter(doc=>doc.category===category.id).length]));
const docsById = new Map(libraryDocs.map(doc=>[doc.id,doc]));
const documentAliases = new Map(libraryDocs.flatMap(doc=>[doc.id,doc.slug,...(doc.legacyIds??[])].filter((alias): alias is string=>Boolean(alias)).map(alias=>[alias,doc.id] as const)));

export function getCategoryConfig(categoryId: string): CategoryConfig | undefined {
  return categories.find(c => c.id === categoryId);
}

// Vite dynamic imports for JSON docs
const docModules = import.meta.glob('../data/docs/**/index.json');
const referenceModules = import.meta.glob('../data/reference/**/index.json');

export function resolveDocId(value: string): string | null {
  return documentAliases.get(value) ?? null;
}

export const docURL = (id: string) => {
  const doc = docsById.get(resolveDocId(id) ?? '');
  return `/trung-tam/tai-lieu-so/${encodeURIComponent(doc?.slug ?? id)}/`;
};

export async function fetchDocFull(docId: string): Promise<DocFull | null> {
  const doc = docsById.get(resolveDocId(docId) ?? '');
  const path = `../data/${doc?.documentPath}`;
  const loader = docModules[path] ?? referenceModules[path];
  if (loader) {
    try {
      const module: any = await loader();
      return module.default as DocFull;
    } catch (e) {
      console.error(`Error loading doc ${docId}:`, e);
      return null;
    }
  }
  return null;
}
