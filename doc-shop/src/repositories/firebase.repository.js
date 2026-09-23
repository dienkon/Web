/**
 * Base Firebase Realtime Database Repository
 */
import {
  db,
  keyDb,
  dbPath,
  keyDbPath,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
} from "../config/firebase.js";
import { logger } from "../utils/logger.js";

export const FirebaseRepository = {
  /**
   * Get single item from main RTDB
   */
  async get(collection, id) {
    try {
      const snap = await get(ref(db, dbPath(collection, id)));
      return snap.exists() ? snap.val() : null;
    } catch (err) {
      logger.error(`Failed to get ${collection}/${id}:`, err);
      throw err;
    }
  },

  /**
   * Get all items from main RTDB
   */
  async getAll(collection) {
    try {
      const snap = await get(ref(db, dbPath(collection)));
      return snap.exists() ? snap.val() : {};
    } catch (err) {
      if (err?.message?.includes("Permission denied") || err?.code === "PERMISSION_DENIED") {
        logger.debug(`Firebase read permission restricted for ${collection}, using local fallback.`);
        return {};
      }
      logger.error(`Failed to getAll ${collection}:`, err);
      throw err;
    }
  },

  /**
   * Query items by child field value
   */
  async queryByChild(collection, childField, value) {
    try {
      const q = query(ref(db, dbPath(collection)), orderByChild(childField), equalTo(value));
      const snap = await get(q);
      return snap.exists() ? snap.val() : {};
    } catch (err) {
      logger.error(`Failed to queryByChild on ${collection} (${childField}=${value}):`, err);
      throw err;
    }
  },

  /**
   * Set item by specific ID
   */
  async set(collection, id, data) {
    try {
      await set(ref(db, dbPath(collection, id)), data);
      return true;
    } catch (err) {
      logger.error(`Failed to set ${collection}/${id}:`, err);
      throw err;
    }
  },

  /**
   * Push new item with auto-generated ID
   */
  async push(collection, data) {
    try {
      const newRef = push(ref(db, dbPath(collection)));
      await set(newRef, data);
      return newRef.key;
    } catch (err) {
      logger.error(`Failed to push into ${collection}:`, err);
      throw err;
    }
  },

  /**
   * Update item fields
   */
  async update(collection, id, partial) {
    try {
      await update(ref(db, dbPath(collection, id)), partial);
      return true;
    } catch (err) {
      logger.error(`Failed to update ${collection}/${id}:`, err);
      throw err;
    }
  },

  /**
   * Remove item
   */
  async remove(collection, id) {
    try {
      await remove(ref(db, dbPath(collection, id)));
      return true;
    } catch (err) {
      logger.error(`Failed to remove ${collection}/${id}:`, err);
      throw err;
    }
  },

  /**
   * Listen to targeted path
   */
  listen(collection, id, callback) {
    const targetRef = id ? ref(db, dbPath(collection, id)) : ref(db, dbPath(collection));
    return onValue(targetRef, (snap) => {
      callback(snap.exists() ? snap.val() : null);
    });
  },

  // --- Key Database Helpers ---

  async getKeyDb(collection, id = null) {
    try {
      const snap = await get(ref(keyDb, keyDbPath(collection, id)));
      return snap.exists() ? snap.val() : null;
    } catch (err) {
      logger.error(`Failed to getKeyDb ${collection}/${id}:`, err);
      throw err;
    }
  },

  async setKeyDb(collection, id, data) {
    try {
      await set(ref(keyDb, keyDbPath(collection, id)), data);
      return true;
    } catch (err) {
      logger.error(`Failed to setKeyDb ${collection}/${id}:`, err);
      throw err;
    }
  },

  async updateKeyDb(collection, id, partial) {
    try {
      await update(ref(keyDb, keyDbPath(collection, id)), partial);
      return true;
    } catch (err) {
      logger.error(`Failed to updateKeyDb ${collection}/${id}:`, err);
      throw err;
    }
  },

  async removeKeyDb(collection, id) {
    try {
      await remove(ref(keyDb, keyDbPath(collection, id)));
      return true;
    } catch (err) {
      logger.error(`Failed to removeKeyDb ${collection}/${id}:`, err);
      throw err;
    }
  },
};
