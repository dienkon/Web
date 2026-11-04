import type {DocMeta} from '../types';

export function normalizeLibraryText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[₀-₉]/g, digit=>String('₀₁₂₃₄₅₆₇₈₉'.indexOf(digit))).toLowerCase().trim();
}
export function matchesLibraryDoc(doc: DocMeta, query: string): boolean {
  const text=normalizeLibraryText([doc.title,doc.summary,doc.author,doc.chemicalFormula??'',...(doc.aliases??[]),...doc.tags].join(' '));
  return normalizeLibraryText(query).split(/\s+/).filter(Boolean).every(term=>text.includes(term));
}
