import { ReactionResult, ReactionResolutionSource } from '../../types/reaction';
import { DETERMINISTIC_REACTIONS } from '../../data/reactions';
import { memoryReactionCache } from '../cache/memoryCache';
import { indexedDbReactionCache } from '../cache/indexedDbCache';
import { FirestoreReactionDb } from '../firebase/reactionDb';
import { GeminiReactionService } from '../gemini/client';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';

export interface ResolveReactionQuery {
  canonicalKey: string;
  chemicalIds: string[];
  isHeating: boolean;
  currentPh: number | null;
  temperatureC: number;
  contents: { chemicalId: string; amount: number; unit: string }[];
}

export interface ResolverMetrics {
  canonicalKey: string;
  source: ReactionResolutionSource;
  latencyMs: number;
  aiCalled: boolean;
  cacheHit: boolean;
}

export class ReactionResolver {
  private static aiCallCount: number = 0;
  private static cacheHitCount: number = 0;
  private static lastMetrics: ResolverMetrics | null = null;

  public static getMetrics(): {
    aiCallCount: number;
    cacheHitCount: number;
    lastMetrics: ResolverMetrics | null;
  } {
    return {
      aiCallCount: this.aiCallCount,
      cacheHitCount: this.cacheHitCount,
      lastMetrics: this.lastMetrics
    };
  }

  /**
   * Main reaction knowledge resolution pipeline (Tier 0 -> Tier 1 -> Tier 2 -> Tier 3 -> Tier 4)
   */
  public static async resolve(query: ResolveReactionQuery): Promise<ReactionResult | null> {
    const startTime = performance.now();
    const { canonicalKey, chemicalIds, isHeating, currentPh, temperatureC, contents } = query;

    // TIER 0: Deterministic local reaction registry
    const deterministic = DETERMINISTIC_REACTIONS[canonicalKey];
    if (deterministic) {
      const latencyMs = performance.now() - startTime;
      this.cacheHitCount++;
      this.lastMetrics = {
        canonicalKey,
        source: 'tier0_deterministic',
        latencyMs,
        aiCalled: false,
        cacheHit: true
      };
      return { ...deterministic, provenance: 'tier0_deterministic' };
    }

    // TIER 1: In-memory reaction cache
    const memCached = memoryReactionCache.get(canonicalKey);
    if (memCached) {
      const latencyMs = performance.now() - startTime;
      this.cacheHitCount++;
      this.lastMetrics = {
        canonicalKey,
        source: 'tier1_memory',
        latencyMs,
        aiCalled: false,
        cacheHit: true
      };
      return memCached;
    }

    // TIER 2: Persistent local browser cache (IndexedDB)
    const idbCached = await indexedDbReactionCache.get(canonicalKey);
    if (idbCached) {
      // Promote into in-memory cache for ultra-fast subsequent lookups
      memoryReactionCache.set(canonicalKey, idbCached);
      const latencyMs = performance.now() - startTime;
      this.cacheHitCount++;
      this.lastMetrics = {
        canonicalKey,
        source: 'tier2_indexeddb',
        latencyMs,
        aiCalled: false,
        cacheHit: true
      };
      return idbCached;
    }

    // TIER 3: Firestore reaction database
    const firestoreResult = await FirestoreReactionDb.get(canonicalKey);
    if (firestoreResult) {
      // Promote into local IndexedDB and memory cache
      await indexedDbReactionCache.set(canonicalKey, firestoreResult);
      memoryReactionCache.set(canonicalKey, firestoreResult);
      const latencyMs = performance.now() - startTime;
      this.cacheHitCount++;
      this.lastMetrics = {
        canonicalKey,
        source: 'tier3_firestore',
        latencyMs,
        aiCalled: false,
        cacheHit: true
      };
      return firestoreResult;
    }

    // TIER 4: Gemini Fallback
    this.aiCallCount++;
    const reactantsPayload = chemicalIds.map(id => {
      const def = CHEMICAL_LIBRARY[id];
      const item = contents.find(c => c.chemicalId === id);
      return {
        chemicalId: id,
        formula: def?.formula || id,
        amount: item?.amount || 10,
        unit: item?.unit || 'mL'
      };
    });

    const geminiResult = await GeminiReactionService.resolveUnknownReaction(canonicalKey, {
      reactants: reactantsPayload,
      isHeating,
      currentPh,
      temperatureC
    });

    const latencyMs = performance.now() - startTime;

    if (geminiResult) {
      // Persist new knowledge across all tiers!
      memoryReactionCache.set(canonicalKey, geminiResult);
      await indexedDbReactionCache.set(canonicalKey, geminiResult);
      FirestoreReactionDb.save(geminiResult).catch(() => {});

      this.lastMetrics = {
        canonicalKey,
        source: 'tier4_gemini',
        latencyMs,
        aiCalled: true,
        cacheHit: false
      };
      return geminiResult;
    }

    this.lastMetrics = {
      canonicalKey,
      source: 'tier4_gemini',
      latencyMs,
      aiCalled: true,
      cacheHit: false
    };

    return null;
  }
}
