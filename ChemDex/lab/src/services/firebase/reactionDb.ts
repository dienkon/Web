import { ReactionResult } from '../../types/reaction';

export class FirestoreReactionDb {
  /**
   * Queries remote reaction knowledge database
   */
  public static async get(canonicalKey: string): Promise<ReactionResult | null> {
    try {
      const response = await fetch(`/api/reaction/${encodeURIComponent(canonicalKey)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.canonicalKey) {
        return { ...data, provenance: 'tier3_firestore' };
      }
      return null;
    } catch {
      // Remote DB offline or network error
      return null;
    }
  }

  /**
   * Persists validated reaction into remote database
   */
  public static async save(result: ReactionResult): Promise<void> {
    try {
      await fetch('/api/reaction/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    } catch (err) {
      console.warn('[FirestoreReactionDb] Async save failed:', err);
    }
  }
}
