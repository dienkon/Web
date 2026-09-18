import { ReactionResult } from '../../types/reaction';

const DB_NAME = 'ChemDexLabDB';
const DB_VERSION = 1;
const STORE_NAME = 'reactions';

class IndexedDbCache {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'canonicalKey' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('[IndexedDbCache] Open error, running in memory-only fallback.');
          resolve(null);
        };
      } catch (err) {
        console.warn('[IndexedDbCache] IndexedDB initialization failed:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public async get(canonicalKey: string): Promise<ReactionResult | null> {
    try {
      const db = await this.getDb();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(canonicalKey);
        req.onsuccess = () => {
          if (req.result) {
            resolve({ ...req.result, provenance: 'tier2_indexeddb' });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async set(canonicalKey: string, result: ReactionResult): Promise<void> {
    try {
      const db = await this.getDb();
      if (!db) return;

      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ ...result, canonicalKey, storedAt: Date.now() });
    } catch (err) {
      console.warn('[IndexedDbCache] Save failed:', err);
    }
  }
}

export const indexedDbReactionCache = new IndexedDbCache();
