import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  remove,
  limitToLast,
} from "firebase/database";
import { ENV } from "./environment.js";

// Initialize primary DkDocShop Firebase instance
export const app = initializeApp(ENV.FIREBASE);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Initialize secondary UniqueKey Firebase instance
export const keyApp = initializeApp(ENV.KEY_FIREBASE, "key-app");
export const keyAuth = getAuth(keyApp);
export const keyDb = getDatabase(keyApp);

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  get,
  update,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  remove,
  limitToLast,
};

/**
 * Returns path inside main database
 */
export const dbPath = (collection, docId = null) => {
  let path = `artifacts/${ENV.APP_ID}/public/data/${collection}`;
  if (docId) path += `/${docId}`;
  return path;
};

/**
 * Returns path inside key database
 */
export const keyDbPath = (collection, docId = null) => {
  let path = `artifacts/${ENV.APP_ID}/public/data/${collection}`;
  if (docId) path += `/${docId}`;
  return path;
};
