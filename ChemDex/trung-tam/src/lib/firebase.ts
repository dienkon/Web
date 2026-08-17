import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDDPIztE_5W21dxSmPP3hx6wtMQIhnByi8",
  authDomain: "chemdex-1710b.firebaseapp.com",
  projectId: "chemdex-1710b",
  storageBucket: "chemdex-1710b.firebasestorage.app",
  messagingSenderId: "514538842769",
  appId: "1:514538842769:web:f2283b968401a1d2f2ed30",
  measurementId: "G-LMTDS0NZRG",
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
    console.error("Login failed", error);
    throw error;
  }
};
export const logout = () => signOut(auth);
