import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "exam-fd7a1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "exam-fd7a1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "603672592444",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:603672592444:web:8d7b493fc9848756bec339",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
