import { create } from 'zustand';
import { AcademyPreferences, AcademyProfile, GameResult, NotebookEntry } from './types';
import { applyResult, createProfile, loadProfile, parseProfile, saveProfile } from './profile';
import { scheduleReview } from './review';
import { randomId } from './random';

interface AcademyState {
  open: boolean;
  launchGameId: string | null;
  profile: AcademyProfile;
  storageAvailable: boolean;
  openHub: (gameId?: string) => void;
  closeHub: () => void;
  clearLaunch: () => void;
  recordResult: (result: GameResult) => void;
  answerCase: (caseId: string, correct: boolean) => void;
  updatePreferences: (update: Partial<AcademyPreferences>) => void;
  toggleBookmark: (gameId: string) => void;
  markRead: (id: string) => void;
  writeNote: (note: Pick<NotebookEntry, 'title' | 'text' | 'source'>, id?: string) => void;
  toggleNoteStar: (id: string) => void;
  deleteNote: (id: string) => void;
  importProfile: (input: unknown) => boolean;
  resetProgress: () => void;
}

export const useAcademy = create<AcademyState>((set, get) => {
  const updateProfile = (transform: (profile: AcademyProfile) => AcademyProfile) => {
    const profile = { ...transform(get().profile), updatedAt: new Date().toISOString() };
    const storageAvailable = saveProfile(profile);
    set({ profile, storageAvailable });
  };
  return {
    open: false,
    launchGameId: null,
    profile: loadProfile(),
    storageAvailable: true,
    openHub: gameId => set({ open: true, launchGameId: gameId ?? null }),
    closeHub: () => set({ open: false, launchGameId: null }),
    clearLaunch: () => set({ launchGameId: null }),
    recordResult: result => updateProfile(profile => applyResult(profile, result)),
    answerCase: (caseId, correct) => updateProfile(profile => ({
      ...profile,
      reviews: {
        ...profile.reviews,
        [caseId]: scheduleReview(profile.reviews[caseId], caseId, correct),
      },
    })),
    updatePreferences: update => updateProfile(profile => ({
      ...profile,
      preferences: {
        ...profile.preferences,
        ...update,
        learnerName: (update.learnerName ?? profile.preferences.learnerName).slice(0, 80),
      },
    })),
    toggleBookmark: gameId => updateProfile(profile => ({
      ...profile,
      bookmarks: profile.bookmarks.includes(gameId)
        ? profile.bookmarks.filter(id => id !== gameId)
        : [...profile.bookmarks, gameId],
    })),
    markRead: id => updateProfile(profile => ({
      ...profile,
      readGlossaryIds: profile.readGlossaryIds.includes(id)
        ? profile.readGlossaryIds
        : [...profile.readGlossaryIds, id],
    })),
    writeNote: (note, id) => updateProfile(profile => {
      const existing = id ? profile.notebook.find(entry => entry.id === id) : null;
      const now = new Date().toISOString();
      const entry: NotebookEntry = {
        id: existing?.id ?? randomId('note'),
        title: note.title.trim().slice(0, 120) || 'Ghi chú mới',
        text: note.text.slice(0, 4000),
        source: note.source.slice(0, 200),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        starred: existing?.starred ?? false,
      };
      return {
        ...profile,
        notebook: existing
          ? profile.notebook.map(candidate => candidate.id === existing.id ? entry : candidate)
          : [...profile.notebook, entry].slice(-100),
      };
    }),
    toggleNoteStar: id => updateProfile(profile => ({
      ...profile,
      notebook: profile.notebook.map(note => note.id === id ? { ...note, starred: !note.starred } : note),
    })),
    deleteNote: id => updateProfile(profile => ({
      ...profile,
      notebook: profile.notebook.filter(note => note.id !== id),
    })),
    importProfile: input => {
      const profile = parseProfile(input);
      if (!profile) return false;
      const storageAvailable = saveProfile(profile);
      set({ profile, storageAvailable });
      return true;
    },
    resetProgress: () => updateProfile(profile => ({
      ...createProfile(),
      preferences: profile.preferences,
    })),
  };
});
