// Keep original URLs in questions and submission snapshots. Resolve only at render time,
// so media never inflates Firestore submissions or leaves expired blob URLs in drafts.
const mediaUrls = new Map<string, string>();
const activeVersions = new Set<string>();
export function activateOfflineMedia(media: Record<string, Blob>, version?: string) {
  if (version && activeVersions.has(version)) return;
  for (const [url, blob] of Object.entries(media)) {
    const previous = mediaUrls.get(url);
    if (previous) URL.revokeObjectURL(previous);
    mediaUrls.set(url, URL.createObjectURL(blob));
  }
  if (version) activeVersions.add(version);
}
export function clearOfflineMedia() {
  mediaUrls.forEach((url) => URL.revokeObjectURL(url));
  mediaUrls.clear();
  activeVersions.clear();
}
export function resolveOfflineUrl(url?: string) { return mediaUrls.get(url || '') || url || ''; }
export function resolveOfflineContent(content: string) {
  let result = content;
  // Longest first avoids replacing one URL that is a prefix of another.
  for (const [url, local] of [...mediaUrls].sort((a, b) => b[0].length - a[0].length)) {
    result = result.split(url).join(local);
    result = result.split(url.replace(/&/g, '&amp;')).join(local);
  }
  return result;
}

export function collectMediaUrls(value: unknown): string[] {
  const urls = new Set<string>();
  function add(url: string) {
    url = url.trim().replace(/&amp;/g, '&');
    if (url && !/^(data:|blob:|#)/i.test(url)) urls.add(url);
  }
  function visit(node: unknown, key = '') {
    if (typeof node === 'string') {
      if (/^(url|audioUrl|imageUrl|image|src|fileData|thumbnailUrl)$/i.test(key) && /^(https?:\/\/|\/)/.test(node)) add(node);
      for (const m of node.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) add(m[1]);
      for (const m of node.matchAll(/\b(?:src|poster)\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
      for (const m of node.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)) add(m[1]);
    } else if (Array.isArray(node)) node.forEach((item) => visit(item));
    else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => visit(v, k));
  }
  visit(value);
  return [...urls];
}
