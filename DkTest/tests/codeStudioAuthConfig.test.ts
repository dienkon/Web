import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/firebaseAdmin.js', async importOriginal => ({ ...await importOriginal<typeof import('../server/firebaseAdmin')>(), adminAuth: null, adminDb: null }));
import { publishStudioShare } from '../server/codeStudioShares';
import { getFirebaseApiKey } from '../server/firebaseAdmin';
const fixture = { version: 1, projectId: 'auth-config-fixture', mode: 'website', title: 'Auth test', description: '', payload: JSON.stringify({ version: 1, title: 'Auth test', html: '<!DOCTYPE html><body>Test</body>' }) };
beforeEach(() => { vi.stubEnv('VITE_FIREBASE_API_KEY', ''); vi.stubEnv('FIREBASE_API_KEY', ''); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function provider(expectedKey: string) {
  const writes: any[] = [];
  const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    if (url.hostname === 'identitytoolkit.googleapis.com') return url.searchParams.get('key') === expectedKey && expectedKey
      ? Response.json({ users: [{ localId: 'verified-owner' }] }) : Response.json({ error: { message: 'API_KEY_INVALID' } }, { status: 400 });
    if (init?.method === 'PATCH') { writes.push(JSON.parse(String(init.body))); return Response.json({}); }
    return Response.json({}, { status: 404 });
  });
  vi.stubGlobal('fetch', fetcher); return { fetcher, writes };
}
describe('Code Studio Firebase REST auth configuration', () => {
  it('uses the application default key when runtime environment keys are absent', async () => {
    const key = getFirebaseApiKey(); expect(key).toMatch(/^AIza/);
    const { writes } = provider(key);
    expect((await publishStudioShare(fixture, 'test-id-token')).path).toMatch(/^\/code\/auth-test\./); expect(writes).toHaveLength(1);
  });
  it('uses the same VITE key precedence as the existing username-login REST route', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'correct-web-key'); vi.stubEnv('FIREBASE_API_KEY', 'different-server-key');
    const { writes } = provider('correct-web-key');
    await publishStudioShare(fixture, 'test-id-token'); expect(writes).toHaveLength(1);
  });
  it.each([
    [400, { message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] }],
    [403, { message: 'Requests from referer <empty> are blocked.', details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] }],
  ])('reports provider configuration errors as 503 instead of telling users to log in again (%s)', async (status, error) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error }, { status })); vi.stubGlobal('fetch', fetcher);
    await expect(publishStudioShare(fixture, 'private-id-token')).rejects.toMatchObject({ status: 503, code: 'SHARE_AUTH_SERVER_CONFIG' });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(JSON.stringify(warn.mock.calls)).not.toContain('private-id-token'); expect(JSON.stringify(warn.mock.calls)).not.toContain(getFirebaseApiKey());
  });
  it.each(['TOKEN_EXPIRED', 'INVALID_ID_TOKEN', 'USER_DISABLED'])('rejects actual session failures without any Firestore write (%s)', async message => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: { message } }, { status: 400 })); vi.stubGlobal('fetch', fetcher);
    await expect(publishStudioShare(fixture, 'bad-token')).rejects.toMatchObject({ status: 401, code: 'SHARE_AUTH_SESSION' }); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
