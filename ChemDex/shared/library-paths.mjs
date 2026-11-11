// Human-readable substance names are the canonical file and URL identity.
export const substanceSlug = value => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function documentFile(meta) {
  if (meta.documentPath) {
    if (!/^(?:reference|docs)\/[a-z0-9-]+\/index\.json$/.test(meta.documentPath))
      throw new Error(`Invalid document path: ${meta.documentPath}`);
    return `trung-tam/src/data/${meta.documentPath}`;
  }
  return `trung-tam/src/data/${meta.documentKind === 'reference' ? 'reference' : 'docs'}/${meta.id}.json`;
}

export const documentURL = meta => `/trung-tam/tai-lieu-so/${encodeURIComponent(meta.slug ?? meta.id)}/`;
