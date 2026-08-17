import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore } from './store/authStore';
import { User } from './types';
import Layout from './components/Layout';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import ExamPlay from './pages/ExamPlay';
import ExamReview from './pages/ExamReview';
import AdminEditExam from './pages/AdminEditExam';

export default function App() {
  const { setUser, setLoading, user, loading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch custom user doc
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          // New user, create doc with no displayName yet
          const newUser: User = {
            uid: firebaseUser.uid,
            displayName: '',
            role: 'user', // Default role
            createdAt: Date.now(),
            lastLoginAt: Date.now()
          };
          await setDoc(userRef, newUser);
          setUser(newUser);
        }
      } else {
        // Sign in anonymously
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Error signing in anonymously", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Enforce profile setup
  if (user && !user.displayName) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<ProfileSetup />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/new" element={<AdminEditExam />} />
          <Route path="admin/edit/:id" element={<AdminEditExam />} />
        </Route>
        
        {/* Fullscreen player without generic layout wrapper */}
        <Route path="/exam/:id/play" element={<ExamPlay />} />
        <Route path="/exam/:id/review/:attemptId" element={<ExamReview />} />
      </Routes>
    </BrowserRouter>
  );
}
