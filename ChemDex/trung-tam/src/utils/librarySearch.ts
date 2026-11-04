import type {DocMeta} from '../types';

export function normalizeLibraryText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[₀-₉]/g, digit=>String('₀₁₂₃₄₅₆₇₈₉'.indexOf(digit))).toLowerCase().trim();
}
export function matchesLibraryDoc(doc: DocMeta, query: string): boolean {
  const text=normalizeLibraryText([doc.title,doc.summary,doc.author,doc.chemicalFormula??'',...(doc.aliases??[]),...doc.tags].join(' '));
  const words=text.split(/[^a-z0-9]+/).filter(Boolean);
  return normalizeLibraryText(query).split(/\s+/).filter(Boolean).every(term=>
    /^[a-z0-9]+$/.test(term) ? words.some(word=>/\d/.test(term)?word===term:word.startsWith(term)) : text.includes(term));
}
export function filterLibraryDocs(docs: DocMeta[], query: string): DocMeta[] {
  const normalized=normalizeLibraryText(query);
  const exact=normalized?docs.filter(doc=>[doc.chemicalFormula,doc.title,...(doc.aliases??[])].filter(Boolean).some(value=>normalizeLibraryText(value!)===normalized)):[];
  return exact.length?exact:docs.filter(doc=>matchesLibraryDoc(doc,query));
}
