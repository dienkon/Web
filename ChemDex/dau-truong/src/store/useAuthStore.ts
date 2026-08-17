import { create } from 'zustand';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  createdAt: any;
  lastLoginAt: any;
  rank: string;
  xp: number;
  winCount: number;
  lossCount: number;
  totalMatches: number;
  isAnonymous?: boolean;
  guestExpired?: boolean;
  activityStreak?: number;
  lastActiveDate?: string;
  equippedTitle?: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null, profile: UserProfile | null) => void;
  init: () => void;
  updateStats: (earnedXp: number, isWin: boolean) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
  updateEquippedTitle: (title: string) => Promise<void>;
}

export function checkAndUpdateStreak(currentStreak: number, lastActiveStr: string | undefined): { streak: number, updatedDate: string, changed: boolean } {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (!lastActiveStr) {
    return { streak: 1, updatedDate: todayStr, changed: true };
  }
  if (lastActiveStr === todayStr) {
    return { streak: currentStreak || 1, updatedDate: todayStr, changed: false };
  }

  try {
    const lastActive = new Date(lastActiveStr);
    const currentDate = new Date(todayStr);
    
    const diffTime = currentDate.getTime() - lastActive.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return { streak: (currentStreak || 0) + 1, updatedDate: todayStr, changed: true };
    } else if (diffDays > 1) {
      return { streak: 1, updatedDate: todayStr, changed: true };
    } else {
      return { streak: currentStreak || 1, updatedDate: todayStr, changed: false };
    }
  } catch (e) {
    return { streak: 1, updatedDate: todayStr, changed: true };
  }
}

export function calculateRank(xp: number): string {
  if (xp >= 18000) return 'Huyền Thoại Graphene (C_sp²)';
  if (xp >= 14000) return 'Kim Cương Hóa Học (C)';
  if (xp >= 10500) return 'Rubi Lửa (Cr-Al2O3)';
  if (xp >= 7500) return 'Saphia Tinh Khiết (Al2O3)';
  if (xp >= 5000) return 'Hợp Kim Titan (Ti-Al)';
  if (xp >= 3000) return 'Bạch Kim (Pt)';
  if (xp >= 1500) return 'Vàng Ròng (Au)';
  if (xp >= 700) return 'Bạc Nguyên Chất (Ag)';
  if (xp >= 300) return 'Đồng Đỏ (Cu)';
  return 'Sắt Thô (Fe)';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user, profile) => set({ user, profile, loading: false }),
  init: () => {
    set({ loading: true });
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        let profileData: UserProfile;
        
        if (userSnap.exists()) {
          const raw = userSnap.data();
          
          let createdMillis = Date.now();
          if (raw.createdAt) {
            if (typeof raw.createdAt.toMillis === 'function') {
              createdMillis = raw.createdAt.toMillis();
            } else if (raw.createdAt.seconds) {
              createdMillis = raw.createdAt.seconds * 1000;
            } else {
              createdMillis = new Date(raw.createdAt).getTime() || Date.now();
            }
          }

          // Check 3-day guest limit (3 * 24 * 60 * 60 * 1000 = 259200000 ms)
          const isAnon = firebaseUser.isAnonymous || raw.isAnonymous || false;
          const guestExpired = isAnon && (Date.now() - createdMillis > 259200000);

          const streakResult = checkAndUpdateStreak(raw.activityStreak || 0, raw.lastActiveDate);

          profileData = {
            uid: firebaseUser.uid,
            displayName: raw.displayName || (isAnon ? 'Khách Đấu Sĩ' : firebaseUser.displayName) || 'Khách Đấu Sĩ',
            photoURL: raw.photoURL || firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
            email: raw.email || firebaseUser.email || '',
            createdAt: raw.createdAt || serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            xp: raw.xp || 0,
            winCount: raw.winCount || 0,
            lossCount: raw.lossCount || 0,
            totalMatches: raw.totalMatches || ((raw.winCount || 0) + (raw.lossCount || 0)),
            rank: calculateRank(raw.xp || 0),
            isAnonymous: isAnon,
            guestExpired: guestExpired,
            activityStreak: streakResult.streak,
            lastActiveDate: streakResult.updatedDate,
            equippedTitle: raw.equippedTitle || '',
          };
          
          // Update last login and streak
          const updateObj: any = { lastLoginAt: serverTimestamp(), isAnonymous: isAnon };
          if (streakResult.changed) {
            updateObj.activityStreak = streakResult.streak;
            updateObj.lastActiveDate = streakResult.updatedDate;
          }
          await setDoc(userRef, updateObj, { merge: true });
        } else {
          const isAnon = firebaseUser.isAnonymous || false;
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const todayStr = `${yyyy}-${mm}-${dd}`;

          // Create new user profile
          profileData = {
            uid: firebaseUser.uid,
            displayName: isAnon ? 'Khách Đấu Sĩ' : (firebaseUser.displayName || 'Hóa thủ'),
            photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
            email: firebaseUser.email || '',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            rank: 'Electron Tự Do',
            xp: 0,
            winCount: 0,
            lossCount: 0,
            totalMatches: 0,
            isAnonymous: isAnon,
            guestExpired: false,
            activityStreak: 1,
            lastActiveDate: todayStr,
            equippedTitle: '',
          };
          await setDoc(userRef, profileData);
        }
        
        set({ user: firebaseUser, profile: profileData, loading: false, initialized: true });
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }
    });
  },

  updateStats: async (earnedXp: number, isWin: boolean) => {
    const { profile, user } = get();
    if (!profile || !user) return;

    const streakResult = checkAndUpdateStreak(profile.activityStreak || 0, profile.lastActiveDate);

    const newXp = (profile.xp || 0) + Math.max(0, earnedXp);
    const newWinCount = (profile.winCount || 0) + (isWin ? 1 : 0);
    const newLossCount = (profile.lossCount || 0) + (!isWin ? 1 : 0);
    const newTotalMatches = (profile.totalMatches || 0) + 1;
    const newRank = calculateRank(newXp);

    const updatedProfile: UserProfile = {
      ...profile,
      xp: newXp,
      winCount: newWinCount,
      lossCount: newLossCount,
      totalMatches: newTotalMatches,
      rank: newRank,
      activityStreak: streakResult.streak,
      lastActiveDate: streakResult.updatedDate,
    };

    set({ profile: updatedProfile });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        xp: newXp,
        winCount: newWinCount,
        lossCount: newLossCount,
        totalMatches: newTotalMatches,
        rank: newRank,
        activityStreak: streakResult.streak,
        lastActiveDate: streakResult.updatedDate,
      });
    } catch (err) {
      console.error("Lỗi cập nhật thăng tiến XP / Rank:", err);
    }
  },

  updateProfileName: async (newName: string) => {
    const { profile, user } = get();
    if (!profile || !user) return;

    const updatedProfile = { ...profile, displayName: newName };
    set({ profile: updatedProfile });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName: newName });
    } catch (err) {
      console.error("Lỗi đổi tên hiển thị:", err);
    }
  },

  updateEquippedTitle: async (title: string) => {
    const { profile, user } = get();
    if (!profile || !user) return;

    const updatedProfile = { ...profile, equippedTitle: title };
    set({ profile: updatedProfile });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { equippedTitle: title });
    } catch (err) {
      console.error("Lỗi trang bị danh hiệu:", err);
    }
  }
}));
