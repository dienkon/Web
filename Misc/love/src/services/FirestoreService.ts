import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  Firestore,
} from 'firebase/firestore';
import { LoveStory } from '../models/LoveStory';
import { StoryStorage } from './StoryStorage';

class FirestoreService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    if (apiKey && projectId && apiKey !== 'your_firebase_api_key') {
      try {
        const firebaseConfig = {
          apiKey,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        this.db = getFirestore(this.app);
        this.isConfigured = true;
      } catch (e) {
        console.warn('Firebase initialization skipped, using offline storage:', e);
      }
    }
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  // Save story to Firestore with fallback
  public async saveStory(story: LoveStory): Promise<'firestore' | 'local'> {
    story.updatedAt = Date.now();
    // Always persist to local first for instant offline readiness
    StoryStorage.saveStory(story);

    if (this.isConfigured && this.db) {
      try {
        const storyRef = doc(this.db, 'stories', story.id);
        await setDoc(storyRef, story, { merge: true });
        return 'firestore';
      } catch (err) {
        console.warn('Firestore write failed, saved locally:', err);
      }
    }
    return 'local';
  }

  // Load story by ID (checks Firestore, then falls back to LocalStorage or Demo)
  public async getStory(id: string): Promise<LoveStory | null> {
    if (this.isConfigured && this.db) {
      try {
        const storyRef = doc(this.db, 'stories', id);
        const snap = await getDoc(storyRef);
        if (snap.exists()) {
          const data = snap.data() as LoveStory;
          StoryStorage.saveStory(data);
          return data;
        }
      } catch (err) {
        console.warn('Firestore fetch failed, checking local storage:', err);
      }
    }
    return StoryStorage.getStory(id);
  }

  // Increment view counter
  public async recordStoryView(id: string): Promise<void> {
    if (this.isConfigured && this.db) {
      try {
        const storyRef = doc(this.db, 'stories', id);
        await updateDoc(storyRef, {
          'analytics.views': increment(1),
          'analytics.lastViewedAt': Date.now(),
        });
      } catch (e) {
        // silent fail
      }
    }
  }

  // Record story completion
  public async recordStoryCompleted(id: string): Promise<void> {
    if (this.isConfigured && this.db) {
      try {
        const storyRef = doc(this.db, 'stories', id);
        await updateDoc(storyRef, {
          'analytics.completedCount': increment(1),
        });
      } catch (e) {
        // silent fail
      }
    }
  }
}

export const firestoreService = new FirestoreService();
