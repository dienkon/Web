/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDPIztE_5W21dxSmPP3hx6wtMQIhnByi8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chemdex-1710b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chemdex-1710b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chemdex-1710b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "514538842769",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:514538842769:web:f2283b968401a1d2f2ed30",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LMTDS0NZRG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Anonymous login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};
