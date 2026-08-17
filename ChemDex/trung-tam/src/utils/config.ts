import configData from '../data/config.json';
import indexData from '../data/index.json';
import { CategoryConfig, DocMeta, DocFull } from '../types';

export type { CategoryConfig, DocMeta, DocFull };

export const categories: CategoryConfig[] = configData.categories;
export const libraryDocs: DocMeta[] = indexData;

export function getCategoryConfig(categoryId: string): CategoryConfig | undefined {
  return categories.find(c => c.id === categoryId);
}

// Vite dynamic imports for JSON docs
const docModules = import.meta.glob('../data/docs/*.json');

export async function fetchDocFull(docId: string): Promise<DocFull | null> {
  const path = `../data/docs/${docId}.json`;
  if (path in docModules) {
    try {
      const module: any = await docModules[path]();
      return module.default as DocFull;
    } catch (e) {
      console.error(`Error loading doc ${docId}:`, e);
      return null;
    }
  }
  return null;
}
