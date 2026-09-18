import { ReactionResult } from '../../types/reaction';

class MemoryCache {
  private cache: Map<string, { result: ReactionResult; accessedAt: number }> = new Map();
  private maxEntries: number = 100;

  public get(canonicalKey: string): ReactionResult | null {
    const entry = this.cache.get(canonicalKey);
    if (!entry) return null;
    entry.accessedAt = Date.now();
    return { ...entry.result, provenance: 'tier1_memory' };
  }

  public set(canonicalKey: string, result: ReactionResult): void {
    if (this.cache.size >= this.maxEntries) {
      // LRU eviction
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, val] of this.cache.entries()) {
        if (val.accessedAt < oldestTime) {
          oldestTime = val.accessedAt;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(canonicalKey, { result, accessedAt: Date.now() });
  }

  public has(canonicalKey: string): boolean {
    return this.cache.has(canonicalKey);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const memoryReactionCache = new MemoryCache();
