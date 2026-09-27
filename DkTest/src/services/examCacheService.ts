import { FirestoreCache } from "./firebase/firestoreCache";

/**
 * Invalidates home page cached queries for top attempted, newest, and filter lists.
 */
export function invalidateHomeTopCache(): void {
  try {
    FirestoreCache.invalidate("home:top:attempted");
    FirestoreCache.invalidate("home:top:newest");
    FirestoreCache.invalidatePrefix("home:filter:");
  } catch (err) {
    console.warn("[examCacheService] Error invalidating home cache:", err);
  }
}
