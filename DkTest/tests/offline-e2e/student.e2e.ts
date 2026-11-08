import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from 'vite';

test('cold offline launch, new attempt, draft resume, offline submit and result reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Local assets emulate APK-bundled resources. Every external request is blocked.
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') return route.abort('internetdisconnected');
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const relative = route.request().isNavigationRequest() ? 'index.html' : pathname.replace(/^\//, '');
    const root = path.resolve('dist-mobile');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) return route.abort();
    try {
      const contentType = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.json': 'application/json' } as Record<string, string>)[path.extname(file)] || 'application/octet-stream';
      await route.fulfill({ body: await readFile(file), contentType });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  await page.route('**/__offline_seed', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body>seed</body></html>' }));
  await page.goto('/__offline_seed');
  const env = loadEnv('mobile', process.cwd(), 'VITE_');
  await page.evaluate(async (firebaseConfig) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const uid = 'offline-ui-student';
    const profile = { uid, username: 'offline-student', displayName: 'Thí sinh Offline', role: 'student', accountStatus: 'active', authProvider: 'username', emailVerified: true, studentOnboardingStatus: 'completed' };
    localStorage.setItem(`dktest_offline_profile_${uid}`, JSON.stringify(profile));
    localStorage.setItem('dktest_onboarding_completed', 'true');
    localStorage.setItem(`dktest_student_onboarding_v1_${uid}`, JSON.stringify({ version: 'v1', status: 'completed' }));
    const firebaseDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('firebaseLocalStorageDb', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const token = `${btoa(JSON.stringify({ alg: 'none' }))}.${btoa(JSON.stringify({ sub: uid, user_id: uid, aud: firebaseConfig.projectId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
    await new Promise<void>((resolve, reject) => {
      const tx = firebaseDb.transaction('firebaseLocalStorage', 'readwrite');
      tx.objectStore('firebaseLocalStorage').put({ fbase_key: `firebase:authUser:${firebaseConfig.apiKey}:[DEFAULT]`, value: {
        uid, email: 'offline-student@dktest.local', emailVerified: true, isAnonymous: false, displayName: profile.displayName,
        providerData: [{ providerId: 'password', uid: 'offline-student@dktest.local', email: 'offline-student@dktest.local' }],
        stsTokenManager: { refreshToken: 'test-only-refresh-token', accessToken: token, expirationTime: Date.now() + 3600000 },
      } });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    firebaseDb.close();
    const offlineDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dktest-offline-v1', 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('exams', { keyPath: 'key' }).createIndex('uid', 'uid');
        request.result.createObjectStore('submissions', { keyPath: 'id' }).createIndex('uid', 'uid');
        request.result.createObjectStore('drafts', { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const pixel = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), (v) => v.charCodeAt(0));
    const pack = {
      key: `${uid}:offline-fixture`, uid,
      exam: { id: 'offline-fixture', title: 'Bài kiểm tra offline', code: 'OFF001', status: 'published', timeLimit: 30, duration: 30, shuffleQuestions: false, shuffleOptions: false, allowSubExam: false, maxAttempts: 0, showResults: true, showDetails: true, antiCheatEnabled: false, createdAt: null, updatedAt: null },
      questions: [
        { id: 'q1', type: 'single_choice', text: 'Hai cộng hai bằng bao nhiêu? ![hình offline](https://offline.test/image.png)', options: [{ id: 'a', text: 'Bốn' }, { id: 'b', text: 'Năm' }], correctOptionIds: ['a'], order: 1, points: 1 },
        { id: 'q2', type: 'short_answer', text: 'Điền số ba', acceptedAnswers: ['3'], order: 2, points: 1 },
      ], sections: [], media: { 'https://offline.test/image.png': new Blob([pixel], { type: 'image/png' }) }, downloadedAt: Date.now(), serverSubmissionIds: [],
    };
    await new Promise<void>((resolve, reject) => {
      const tx = offlineDb.transaction('exams', 'readwrite'); tx.objectStore('exams').put(pack);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    offlineDb.close();
  }, { apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4', projectId: env.VITE_FIREBASE_PROJECT_ID || 'exam-fd7a1' });
  await page.addInitScript(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  await page.goto('/student/offline');
  await expect(page.getByRole('heading', { name: 'Đề thi trên máy' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Bài kiểm tra offline', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Mở / tiếp tục làm bài' }).click();
  await expect(page.getByText('Hai cộng hai bằng bao nhiêu?', { exact: false })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('img[alt="hình offline"]')).toHaveJSProperty('naturalWidth', 1);
  await page.getByText('Bốn', { exact: true }).click();
  await page.reload();
  await expect(page.getByText('Hai cộng hai bằng bao nhiêu?', { exact: false })).toBeVisible({ timeout: 20000 });
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('dktest_temp_answers_offline-fixture_offline-student') || '{}'));
  expect(draft.q1).toBe('a');
  // Recover from the independent IndexedDB draft even if legacy localStorage copies disappear.
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open('dktest-offline-v1', 2); r.onsuccess = () => resolve(r.result); });
    const value = await new Promise<any>((resolve) => { const r = db.transaction('drafts').objectStore('drafts').get('offline-ui-student:offline-fixture'); r.onsuccess = () => resolve(r.result); });
    db.close(); return value?.session.answers.q1;
  })).toBe('a');
  await page.evaluate(() => {
    Object.keys(localStorage).filter((key) => key.includes('offline-fixture') || key === 'dktest:session:active' || key === 'active_exam_session').forEach((key) => localStorage.removeItem(key));
  });
  await page.reload();
  await expect(page.getByRole('button', { name: /Bốn/ })).toHaveClass(/border-blue-500/, { timeout: 20000 });
  await page.getByPlaceholder('Nhập đáp án ngắn vào đây...').fill('3');
  await page.getByRole('button', { name: /Nộp bài/ }).first().click();
  await page.getByRole('button', { name: /Xác nhận nộp|Nộp bài ngay|Đồng ý nộp/ }).click();
  await expect(page.getByText('Đã nộp và lưu bài trên thiết bị')).toBeVisible({ timeout: 20000 });
  await page.reload();
  await expect(page.getByText('Đã nộp và lưu bài trên thiết bị')).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: 'test-results/offline-result.png', fullPage: true });
  await page.goto('/student/offline');
  await expect(page.getByText('1 bài chờ đồng bộ')).toBeVisible({ timeout: 20000 });
  expect(errors).toEqual([]);
});
