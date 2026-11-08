import { parseExamEntry } from '../utils/examInvite';

export const ANDROID_APP_ID = 'vn.dktest.student';
export const APP_LINK_ORIGIN = 'https://dk-test-v3.vercel.app';
export const APP_LINK_HOST = 'dk-test-v3.vercel.app';
const identifier = /^[\p{L}\p{N}_.-]{1,128}$/u;

/** Accept only our HTTPS domain and student routes. Never trust URL identity/role fields. */
export function appRouteFromUrl(input: string): string | null {
  if (input.length > 4096) return null;
  try {
    const url = new URL(input);
    if (url.protocol === 'http:' && url.host === APP_LINK_HOST) url.protocol = 'https:';
    if (url.origin !== APP_LINK_ORIGIN || url.username || url.password) return null;
    const rawPath = url.hash.startsWith('#/') ? url.hash.slice(1).split('?')[0] : url.pathname;
    const parts = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts.some((part) => !identifier.test(part) || part === '.' || part === '..')) return null;
    const pathname = '/' + parts.map(encodeURIComponent).join('/');
    if (/^\/student\/exam\/[^/]+\/result\/[^/]+$/.test(pathname)) return pathname;
    // /take links go through preparation; an existing attempt is restored separately.
    if (!/^\/(?:admin|parent)\//.test(pathname)) {
      const entry = parseExamEntry(url.href);
      if (entry) return `/${entry.kind === 'code-exam' ? 'code-exam' : 'student/exam'}/${encodeURIComponent(entry.value)}`;
    }
    const exact = ['/', '/exams', '/journey', '/arena', '/practice', '/escape-room', '/legal-policy'];
    const allowed = exact.includes(pathname) || /^\/student\//.test(pathname) || /^\/(?:practice|arena|voucher|vouchers)\//.test(pathname);
    if (!allowed || /\/(?:take|result)(?:\/|$)/.test(pathname)) return null;
    if (pathname === '/student/wallet') {
      const voucher = url.searchParams.get('voucher') || url.searchParams.get('code');
      if (voucher && identifier.test(voucher)) return `${pathname}?voucher=${encodeURIComponent(voucher)}`;
    }
    return pathname;
  } catch { return null; }
}

/** Explicit user gesture fallback for browsers which keep an App Link on the web. */
export function androidIntentForUrl(input: string): string | null {
  const route = appRouteFromUrl(input);
  if (!route) return null;
  const fallback = new URL(route, APP_LINK_ORIGIN);
  fallback.searchParams.set('dktest_web', '1');
  return `intent://${APP_LINK_HOST}${route}#Intent;scheme=https;package=${ANDROID_APP_ID};S.browser_fallback_url=${encodeURIComponent(fallback.href)};end`;
}
