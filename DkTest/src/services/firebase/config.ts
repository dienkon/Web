import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { reportError } from "../errorReporter";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "exam-fd7a1.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://exam-fd7a1-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "exam-fd7a1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "603672592444",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:603672592444:web:8d7b493fc9848756bec339",
};

// Fail-safe initialization: A failure here MUST NOT crash module loading or blank the screen
let appInstance: FirebaseApp = null as any;
let dbInstance: Firestore = null as any;
let authInstance: Auth = null as any;
let rtdbInstance: Database = null as any;

try {
  appInstance = initializeApp(firebaseConfig);
} catch (err: any) {
  console.error("[FirebaseConfig] initializeApp failed:", err);
  reportError(err, { source: "firebase", action: "initializeApp" });
}

if (appInstance) {
  try {
    dbInstance = getFirestore(appInstance);
  } catch (err: any) {
    console.error("[FirebaseConfig] getFirestore failed:", err);
    reportError(err, { source: "firebase", action: "getFirestore" });
  }

  try {
    authInstance = getAuth(appInstance);
  } catch (err: any) {
    console.error("[FirebaseConfig] getAuth failed:", err);
    reportError(err, { source: "firebase", action: "getAuth" });
  }

  try {
    rtdbInstance = getDatabase(appInstance);
  } catch (err) {
    try {
      rtdbInstance = getDatabase(appInstance, firebaseConfig.databaseURL);
    } catch (err2: any) {
      console.warn("[FirebaseConfig] RTDB initialization warning:", err2);
      reportError(err2, { source: "firebase", action: "getDatabase" });
    }
  }
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const rtdb = rtdbInstance;
export const isFirebaseInitialized = Boolean(appInstance && dbInstance && authInstance);
