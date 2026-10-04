import { GoogleGenAI } from '@google/genai';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import fs from 'fs';
import path from 'path';
import { MixResult, MixResultSchema } from '../src/shared/schemas';
import { generateMixResult } from './ai';

// Initialize Firebase Admin Firestore instance
let firestoreDb: Firestore | null = null;

export function getFirestoreInstance(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    let databaseId: string | undefined;
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.firestoreDatabaseId) {
        databaseId = config.firestoreDatabaseId;
      }
    }

    const app = getApps().length > 0 ? getApps()[0] : initializeApp();
    firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    console.log(`[ChemistryDB] Connected to Firestore database: ${databaseId || '(default)'}`);
  } catch (err) {
    console.warn('[ChemistryDB] Firestore initialization note:', err);
  }

  return firestoreDb;
}

// Server In-Memory Cache
const MEMORY_CACHE = new Map<string, { result: MixResult; cachedAt: number }>();
const MAX_MEMORY_CACHE_ITEMS = 500;

/**
 * Generate a canonical, sanitized, order-independent key for a reaction.
 * Example: ['HCl', 'CaCO3'] + heated -> 'caco3_hcl_heated'
 */
export function getCanonicalReactionKey(substances: string[], isHeated: boolean = false): string {
  if (!substances || substances.length === 0) return 'empty_mixture';
  
  const normalized = Array.from(
    new Set(
      substances
        .map(s => s.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)
    )
  ).sort();

  const base = normalized.join('_') || 'unknown';
  return isHeated ? `${base}_heated` : base;
}

export interface ChemistryResolutionResponse {
  result: MixResult;
  source: 'memory_cache' | 'firestore' | 'gemini';
  canonicalKey: string;
}

/**
 * Layered Database-First Chemistry Resolution:
 * 1. Server In-Memory Cache -> Instant (<1ms)
 * 2. Firestore Document Database (reactions/{canonicalKey}) -> (<50ms)
 * 3. Gemini Fallback Intelligence Layer -> Validates and persists back to Firestore + Memory
 */
export async function resolveChemistryReaction(
  substances: string[],
  currentVolume: number = 0.5,
  lang: string = 'en',
  isHeated: boolean = false
): Promise<ChemistryResolutionResponse> {
  const canonicalKey = getCanonicalReactionKey(substances, isHeated);
  const memoryKey = `${canonicalKey}_${lang}`;

  // Layer 1: Server Memory Cache
  if (MEMORY_CACHE.has(memoryKey)) {
    const cached = MEMORY_CACHE.get(memoryKey)!;
    return {
      result: cached.result,
      source: 'memory_cache',
      canonicalKey
    };
  }

  const db = getFirestoreInstance();

  // Layer 2: Persistent Firestore Database Lookup
  if (db) {
    try {
      const docRef = db.collection('reactions').doc(canonicalKey);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const docData = docSnap.data();
        if (docData) {
          // Check for language-specific entry or direct fallback
          let candidate: any = docData.results?.[lang];
          if (!candidate && docData.lang === lang) {
            candidate = docData.result || docData;
          }

          if (candidate) {
            const parseResult = MixResultSchema.safeParse(candidate);
            if (parseResult.success) {
              // Cache in server memory
              MEMORY_CACHE.set(memoryKey, { result: parseResult.data, cachedAt: Date.now() });
              return {
                result: parseResult.data,
                source: 'firestore',
                canonicalKey
              };
            }
          }
        }
      }
    } catch (firestoreErr) {
      console.warn(`[ChemistryDB] Firestore lookup warning for ${canonicalKey}:`, firestoreErr);
    }
  }

  // Layer 3: Gemini Fallback Intelligence Layer
  console.log(`[ChemistryDB] Cache miss for [${canonicalKey}]. Calling Gemini fallback layer...`);
  const geminiResult = await generateMixResult(substances, currentVolume, lang, isHeated);
  const validated = MixResultSchema.parse(geminiResult);

  // Cache in server memory
  if (MEMORY_CACHE.size > MAX_MEMORY_CACHE_ITEMS) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    if (firstKey) MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(memoryKey, { result: validated, cachedAt: Date.now() });

  // Persist to Firestore for future sessions and other users
  if (db) {
    try {
      const docRef = db.collection('reactions').doc(canonicalKey);
      await docRef.set({
        canonicalKey,
        reactants: substances,
        isHeated,
        updatedAt: new Date().toISOString(),
        [`results.${lang}`]: validated,
        // Also keep top-level convenience fields for queryability
        lastEquation: validated.equation,
        lastSummary: validated.summary,
        is_dangerous: validated.is_dangerous || false
      }, { merge: true });
      console.log(`[ChemistryDB] Successfully persisted reaction [${canonicalKey}] to Firestore.`);
    } catch (saveErr) {
      console.warn(`[ChemistryDB] Failed to save reaction to Firestore:`, saveErr);
    }
  }

  return {
    result: validated,
    source: 'gemini',
    canonicalKey
  };
}
