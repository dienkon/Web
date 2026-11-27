import { parseExamEntry } from '../utils/examInvite';
import { GENERATED_RELEASE_META } from './server/generatedReleaseMeta';

export const ANDROID_APP_ID = 'vn.dktest.student';
export const APP_LINK_ORIGIN = 'https://dk-test-v3.vercel.app';
export const APP_LINK_HOST = 'dk-test-v3.vercel.app';
export const GITHUB_RELEASES_URL = 'https://github.com/dienkon/Web/releases';
export const APP_DOWNLOAD_API_PATH = '/api/app-download';
const identifier = /^[\p{L}\p{N}_.-]{1,128}$/u;

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports Macintosh with multi-touch points
  return /Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = Boolean((window.navigator as any)?.standalone);
  const displayStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return iosStandalone || displayStandalone;
}

export function getAppVersionMetadata() {
  const version =
    typeof __DK_APP_VERSION__ === 'string' && __DK_APP_VERSION__
      ? __DK_APP_VERSION__
      : GENERATED_RELEASE_META.version;
  const androidVersionCode =
    typeof __DK_ANDROID_VERSION_CODE__ === 'number' && Number.isFinite(__DK_ANDROID_VERSION_CODE__)
      ? __DK_ANDROID_VERSION_CODE__
      : GENERATED_RELEASE_META.androidVersionCode;
  const releaseDate =
    typeof __DK_RELEASE_DATE__ === 'string' && __DK_RELEASE_DATE__
      ? __DK_RELEASE_DATE__
      : GENERATED_RELEASE_META.date;
  const apkFileName = `DkTEST-${version}-debug.apk`;
  const iosProfileFileName = `DkTEST-iOS-v${version}.mobileconfig`;
  const iosIpaFileName = `DkTEST-${version}-ios-unsigned.ipa`;
  const configuredUrl =
    typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ANDROID_APK_URL
      ? String((import.meta as any).env.VITE_ANDROID_APK_URL).trim()
      : '';
  const downloadUrl = configuredUrl || APP_DOWNLOAD_API_PATH;
  return {
    version,
    androidVersionCode,
    releaseDate,
    apkFileName,
    downloadUrl,
    iosProfileFileName,
    iosProfileUrl: `${APP_DOWNLOAD_API_PATH}?platform=ios`,
    iosInstallPageUrl: `${APP_DOWNLOAD_API_PATH}?platform=ios&format=html`,
    iosIpaFileName,
    iosIpaDownloadUrl: `${APP_DOWNLOAD_API_PATH}?platform=ios&format=ipa`,
    releasesPageUrl: GITHUB_RELEASES_URL,
  };
}

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
    const exact = ['/', '/exams', '/courses', '/documents', '/tai-lieu', '/journey', '/arena', '/practice', '/ai-shop', '/minigame', '/legal-policy'];
    const allowed = exact.includes(pathname) || /^\/student\//.test(pathname) || /^\/(?:practice|arena|voucher|vouchers|courses|documents|tai-lieu)\//.test(pathname);
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
