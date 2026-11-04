import configData from '../data/config.json';
import indexData from '../data/index.json';
import referenceIndex from '../data/reference-index.generated.json';
import { CategoryConfig, DocMeta, DocFull } from '../types';

export type { CategoryConfig, DocMeta, DocFull };

export const categories: CategoryConfig[] = configData.categories;
export const libraryDocs: DocMeta[] = [...indexData.filter(doc=>doc.id.startsWith('chat-')),...referenceIndex,...indexData.filter(doc=>!doc.id.startsWith('chat-'))];

export function getCategoryConfig(categoryId: string): CategoryConfig | undefined {
  return categories.find(c => c.id === categoryId);
}

// Vite dynamic imports for JSON docs
const docModules = import.meta.glob('../data/docs/*.json');
const referenceModules = import.meta.glob('../data/reference/*.json');

export async function fetchDocFull(docId: string): Promise<DocFull | null> {
  const path = `../data/docs/${docId}.json`;
  const loader = docModules[path] ?? referenceModules[`../data/reference/${docId}.json`];
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
