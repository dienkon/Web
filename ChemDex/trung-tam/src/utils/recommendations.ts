import recommendationsData from '../data/recommendations.generated.json';
import { libraryDocs, DocMeta } from './config';

export interface RecommendedDoc {
  doc: DocMeta;
  label: string;
  type: 'group' | 'reaction' | 'pioneer' | 'family' | 'historical';
  color: 'rose' | 'amber' | 'emerald' | 'sky' | 'blue' | 'purple';
  desc: string;
}

const typedRecommendations = recommendationsData as Record<
  string,
  Array<{
    id: string;
    label: string;
    type: 'group' | 'reaction' | 'pioneer' | 'family' | 'historical';
    color: 'rose' | 'amber' | 'emerald' | 'sky' | 'blue' | 'purple';
    desc: string;
  }>
>;

export function getRecommendationsForDoc(docId: string | null | undefined): RecommendedDoc[] {
  if (!docId) return [];

  // Match by id or slug
  let entries = typedRecommendations[docId];
  if (!entries) {
    // Try finding by doc slug or legacy id
    const matched = libraryDocs.find(d => d.id === docId || d.slug === docId);
    if (matched) {
      entries = typedRecommendations[matched.id];
    }
  }

  if (!entries || entries.length === 0) return [];

  const results: RecommendedDoc[] = [];
  for (const entry of entries) {
    const targetDoc = libraryDocs.find(d => d.id === entry.id || d.slug === entry.id);
    if (targetDoc) {
      results.push({
        doc: targetDoc,
        label: entry.label,
        type: entry.type,
        color: entry.color,
        desc: entry.desc
      });
    }
  }

  return results;
}
