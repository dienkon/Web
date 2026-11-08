import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ANDROID_APP_ID, APP_LINK_HOST, APP_LINK_ORIGIN, appRouteFromUrl, androidIntentForUrl } from './appLinks';

it.each([
  ['/', '/'], ['/student/exam/AbC', '/student/exam/AbC'],
  ['/student/exam/AbC/take', '/student/exam/AbC'], ['/exam/GK1', '/student/exam/GK1'],
  ['/?examId=AbC', '/student/exam/AbC'], ['/#/student/exam/AbC', '/student/exam/AbC'],
  ['/student/exam/e/result/s', '/student/exam/e/result/s'], ['/code-exam/c', '/code-exam/c'],
  ['/student/offline', '/student/offline'], ['/student/history', '/student/history'],
  ['/student/wallet?voucher=V1', '/student/wallet?voucher=V1'],
])('maps %s to the internal student route', (input, route) => {
  expect(appRouteFromUrl(APP_LINK_ORIGIN + input)).toBe(route);
});
it.each([
  'https://evil.test/student/exam/e', 'https://dk-test-v3.vercel.app.evil.test/student/exam/e',
  'javascript:alert(1)', 'dktest://student/exam/e', `${APP_LINK_ORIGIN}:444/student/exam/e`,
  `https://user:pass@${APP_LINK_HOST}/student/exam/e`, `${APP_LINK_ORIGIN}/admin/exams/e`,
  `${APP_LINK_ORIGIN}/api/wallet`, `${APP_LINK_ORIGIN}/student/exam/a%2Fb`,
  `${APP_LINK_ORIGIN}/student/exam/a%3Bpackage%3Devil`, `${APP_LINK_ORIGIN}/student/exam/%ZZ`,
])('rejects untrusted or unsupported URLs: %s', (input) => {
  expect(appRouteFromUrl(input)).toBeNull(); expect(androidIntentForUrl(input)).toBeNull();
});
it('upgrades only our declared HTTP host, and discards URL credentials/role/redirect parameters', () => {
  expect(appRouteFromUrl(`http://${APP_LINK_HOST}/student/exam/e`)).toBe('/student/exam/e');
  expect(appRouteFromUrl(`${APP_LINK_ORIGIN}/student/exam/e?role=admin&token=secret&redirect=https://evil.test`)).toBe('/student/exam/e');
});
it('targets the fixed Android package and keeps no-app fallback on HTTPS web without a loop', () => {
  const intent = androidIntentForUrl(`${APP_LINK_ORIGIN}/student/exam/e`)!;
  expect(intent).toContain(`intent://${APP_LINK_HOST}/student/exam/e#Intent;scheme=https;package=${ANDROID_APP_ID};`);
  const fallback = new URL(decodeURIComponent(/S.browser_fallback_url=([^;]+)/.exec(intent)![1]));
  expect(fallback.origin).toBe(APP_LINK_ORIGIN); expect(fallback.searchParams.get('dktest_web')).toBe('1');
});
it('publishes a valid certificate association and routes verification before SPA/crawler rewrites', () => {
  const association = JSON.parse(readFileSync('public/android-assetlinks.json', 'utf8'));
  expect(association[0].relation).toContain('delegate_permission/common.handle_all_urls');
  expect(association[0].target.package_name).toBe(ANDROID_APP_ID);
  for (const fingerprint of association[0].target.sha256_cert_fingerprints) expect(fingerprint).toMatch(/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/);
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  expect(manifest).toContain('android:autoVerify="true"'); expect(manifest).toContain(`android:host="${APP_LINK_HOST}"`);
  expect(manifest).toContain('android.intent.category.BROWSABLE'); expect(manifest).toContain('android:launchMode="singleTask"');
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  expect(config.rewrites[0]).toEqual({ source: '/.well-known/assetlinks.json', destination: '/android-assetlinks.json' });
});
