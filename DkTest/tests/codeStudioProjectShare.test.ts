import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ main: { currentUser: null as any, authStateReady: async () => {}, app: { options: {} } }, guest: { currentUser: null as any, authStateReady: async () => {} }, signIn: vi.fn() }));
vi.mock('../src/services/firebase/config', () => ({ auth: state.main }));
vi.mock('firebase/app', () => ({ getApps: () => [{ name: 'code-studio-publisher' }], initializeApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: () => state.guest, signInAnonymously: state.signIn }));
import { ProjectShareBinding, readProjectShare, saveProjectShare, shareIdentity } from '../src/practice/code-studio/projectShare';
const binding: ProjectShareBinding = { ownerUid: 'owner', id: '0123456789abcdef', path: '/code/first-name.0123456789abcdef', mode: 'website', title: 'First', description: '' };
beforeEach(() => {
  const map = new Map(); vi.stubGlobal('localStorage', { getItem: (key: string) => map.get(key) || null, setItem: (key: string, value: string) => map.set(key,value) });
  state.main.currentUser = null; state.guest.currentUser = null; state.signIn.mockReset();
});
describe('Local project share identity', () => {
  it('keeps bindings per project, independent of names and cloned project contents', () => {
    saveProjectShare('project-a', binding); expect(readProjectShare('project-a')).toEqual(binding); expect(readProjectShare('project-copy')).toBeNull();
    saveProjectShare('project-a', { ...binding, title: 'Renamed', mode: 'editor' }); expect(readProjectShare('project-a')?.path).toBe(binding.path);
  });
  it('migrates an existing /s binding to /code without changing its document ID', () => {
    saveProjectShare('old-project',{...binding,path:binding.path.replace('/code/','/s/')});
    expect(readProjectShare('old-project')?.path).toBe(binding.path); expect(readProjectShare('old-project')?.id).toBe(binding.id);
  });
  it('uses a logged-in owner and never creates a guest session for them', async () => {
    const getIdToken = vi.fn().mockResolvedValue('owner-token');
    state.main.currentUser = { uid: 'owner', getIdToken };
    expect(await shareIdentity(binding)).toEqual({ uid: 'owner', token: 'owner-token' }); expect(state.signIn).not.toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalledWith(true);
  });
  it('keeps anonymous publishing separate from the application login', async () => {
    const getIdToken = vi.fn().mockResolvedValue('guest-token');
    state.signIn.mockImplementation(async () => { state.guest.currentUser = { uid: 'guest', getIdToken }; });
    expect(await shareIdentity(null)).toEqual({ uid: 'guest', token: 'guest-token' }); expect(state.main.currentUser).toBeNull();
    expect(getIdToken).toHaveBeenCalledWith(true);
  });
  it('rejects another account rather than silently creating a second URL', async () => {
    state.main.currentUser = { uid: 'other', getIdToken: async () => 'other-token' };
    await expect(shareIdentity(binding)).rejects.toThrow('đúng tài khoản'); expect(state.signIn).not.toHaveBeenCalled();
  });
});
