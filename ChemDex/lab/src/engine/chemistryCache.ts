import { MixResult } from '../shared/schemas';

const LOCAL_STORAGE_KEY = 'chemlab_deterministic_reactions_v1';
const MAX_MEMORY_ITEMS = 300;

/**
 * Normalizes chemical formula strings for consistent canonical hashing.
 * Removes redundant formatting, trims whitespace, standardizes known notations.
 */
export function normalizeFormula(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Standardize common variant names
  const lower = trimmed.toLowerCase();
  if (lower === 'distilled water' || lower === 'water') return 'H2O';
  if (lower === 'phenolphthalein') return 'Phenolphthalein';
  if (lower === 'litmus' || lower === 'litmus solution') return 'Litmus';
  return trimmed;
}

/**
 * Derives a canonical, deterministic reaction key from the sorted list of substances.
 * Ensures that ['HCl', 'NaOH'] and ['NaOH', 'HCl'] yield the exact same cache lookup.
 */
export function getCanonicalReactionKey(
  substances: string[],
  isHeated: boolean = false,
  temp_c: number = 25,
  lang: 'en' | 'vi' = 'vi'
): string {
  const normalized = substances
    .map(normalizeFormula)
    .filter(Boolean);

  // Deduplicate and sort alphabetically
  const uniqueSorted = Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
  const substanceKey = uniqueSorted.join('+');

  // Quantize temperature to 10°C bins to prevent cache misses on minor temperature fluctuations
  const tempBin = Math.round(temp_c / 10) * 10;
  const heatFlag = isHeated ? 1 : 0;

  return `rxn:${lang}:${substanceKey}|h:${heatFlag}|t:${tempBin}`;
}

/**
 * Production-ready tiered reaction cache:
 * Tier 1: Fast in-memory Map (zero serialization overhead)
 * Tier 2: Persistent browser localStorage wrapper with quota safety and graceful degradation
 */
class ReactionCacheService {
  private memoryCache = new Map<string, MixResult>();
  private isLocalStorageAvailable = false;

  constructor() {
    this.checkLocalStorage();
    this.hydrateFromLocalStorage();
  }

  private checkLocalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = '__chemlab_test_key__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        this.isLocalStorageAvailable = true;
      }
    } catch {
      this.isLocalStorageAvailable = false;
    }
  }

  private hydrateFromLocalStorage(): void {
    if (!this.isLocalStorageAvailable) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed: Record<string, MixResult> = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          if (val && typeof val === 'object' && val.equation) {
            this.memoryCache.set(key, val);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to hydrate chemistry cache from localStorage:', err);
    }
  }

  private persistToLocalStorage(): void {
    if (!this.isLocalStorageAvailable) return;
    try {
      // Limit saved items to top 150 to keep storage footprint minimal (<100KB)
      const dataToSave: Record<string, MixResult> = {};
      let count = 0;
      for (const [key, val] of this.memoryCache.entries()) {
        dataToSave[key] = val;
        count++;
        if (count >= 150) break;
      }
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      // Storage quota exceeded or disabled; fail silently without crashing
      console.warn('ReactionCache localStorage write skipped:', err);
    }
  }

  /**
   * Look up cached reaction result by canonical key
   */
  public get(canonicalKey: string): MixResult | null {
    // Check Tier 1: Memory
    const memHit = this.memoryCache.get(canonicalKey);
    if (memHit) {
      return memHit;
    }

    // Check Tier 2: LocalStorage fallback if memory was evicted
    if (this.isLocalStorageAvailable) {
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed[canonicalKey]) {
            const hit = parsed[canonicalKey] as MixResult;
            this.memoryCache.set(canonicalKey, hit);
            return hit;
          }
        }
      } catch {
        // Ignore read error
      }
    }

    return null;
  }

  /**
   * Store reaction result under canonical key
   */
  public set(canonicalKey: string, result: MixResult): void {
    if (this.memoryCache.size >= MAX_MEMORY_ITEMS) {
      // Evict oldest entry (first key in map)
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(canonicalKey, result);
    this.persistToLocalStorage();
  }

  public has(canonicalKey: string): boolean {
    return this.memoryCache.has(canonicalKey);
  }

  public clear(): void {
    this.memoryCache.clear();
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {}
    }
  }

  public size(): number {
    return this.memoryCache.size;
  }
}

export const chemistryCache = new ReactionCacheService();
