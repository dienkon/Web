export interface ExamEntry { kind: 'code' | 'exam' | 'code-exam'; value: string; }
const validIdentifier = (value: string) => /^[\p{L}\p{N}_.-]{1,128}$/u.test(value) && value !== '.' && value !== '..';

/** Parse locally; never navigate to or request the pasted host. */
export function parseExamEntry(input: string): ExamEntry | null {
  const text = input.trim();
  if (!text || text.length > 4096) return null;
  if (validIdentifier(text) && !text.startsWith('www.')) return { kind: 'code', value: text };
  try {
    const url = new URL(text.startsWith('www.') ? `https://${text}` : text, 'https://dktest.invalid');
    if (!['http:', 'https:'].includes(url.protocol) || (!/^https?:\/\//i.test(text) && !text.startsWith('/') && !text.startsWith('www.'))) return null;
    const pathname = url.hash.startsWith('#/') ? url.hash.slice(1).split('?')[0] : url.pathname;
    const match = /^\/(?:student\/|admin\/|parent\/)?(exams?|code-exam)\/([^/]+)(?:\/(?:take|result\/[^/]+))?\/?$/.exec(pathname);
    if (match) {
      const value = decodeURIComponent(match[2]);
      return validIdentifier(value) ? { kind: match[1] === 'code-exam' ? 'code-exam' : 'exam', value } : null;
    }
    if (!['/', '/exams', '/student/online', '/join'].includes(url.pathname)) return null;
    for (const [key, kind] of [['examId', 'exam'], ['examCode', 'code'], ['code', 'code']] as const) {
      const value = url.searchParams.get(key)?.trim();
      if (value) return validIdentifier(value) ? { kind, value } : null;
    }
  } catch { /* Invalid percent escapes or URLs are not exam entries. */ }
  return null;
}
