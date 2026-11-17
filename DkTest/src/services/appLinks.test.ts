import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANDROID_APP_ID,
  APP_DOWNLOAD_API_PATH,
  APP_LINK_HOST,
  APP_LINK_ORIGIN,
  appRouteFromUrl,
  androidIntentForUrl,
  getAppVersionMetadata,
} from './appLinks';
import {
  renderFallbackDownloadHtml,
  resolveAndroidApkDownload,
} from './server/appDownload';

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

it('exposes app version metadata and resolves APK download URL from env or GitHub releases', async () => {
  const meta = getAppVersionMetadata();
  const rel = JSON.parse(readFileSync('release.json', 'utf8'));
  expect(meta.version).toBe(rel.version);
  expect(meta.androidVersionCode).toBe(rel.androidVersionCode);
  expect(meta.apkFileName).toBe(`DkTEST-${rel.version}-debug.apk`);
  expect(meta.downloadUrl).toBe(APP_DOWNLOAD_API_PATH);

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          tag_name: `dktest-v${rel.version}`,
          assets: [
            {
              name: `DkTEST-${rel.version}-debug.apk`,
              browser_download_url: `https://github.com/dienkon/Web/releases/download/dktest-v${rel.version}/DkTEST-${rel.version}-debug.apk`,
            },
          ],
        },
      ],
    }) as any;

    const resolved = await resolveAndroidApkDownload();
    expect(resolved.source).toBe('github_release');
    expect(resolved.downloadUrl).toContain(`DkTEST-${rel.version}-debug.apk`);

    const html = renderFallbackDownloadHtml({ ...resolved, downloadUrl: null, source: 'fallback' });
    expect(html).toContain(`v${rel.version}`);
    expect(html).toContain(resolved.releasesPageUrl);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
