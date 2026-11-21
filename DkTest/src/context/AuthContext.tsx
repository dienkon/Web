import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase/config";
import { FirestoreCache } from "../services/firebase/firestoreCache";
import type { UserProfile, UserRole, AccountStatus } from "../types";
import { STORAGE_KEYS, setStoredItem, removeStoredItem } from "../utils/storage";
import { clearNativeSyncSession, enableNativeSyncSession } from '../services/offline/sync';
import { clearOfflineMedia } from '../services/offline/media';

function savedCachedProfile(uid: string): UserProfile | null {
  try {
    const raw =
      localStorage.getItem(`dktest_cached_profile_${uid}`) ||
      localStorage.getItem(`dktest_offline_profile_${uid}`);
    const profile = JSON.parse(raw || "null");
    return profile?.uid === uid && profile?.role ? profile : null;
  } catch {
    return null;
  }
}

function persistCachedProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(`dktest_cached_profile_${profile.uid}`, JSON.stringify(profile));
    if (profile.role === "student") {
      localStorage.setItem(`dktest_offline_profile_${profile.uid}`, JSON.stringify(profile));
    }
  } catch {}
}

function removeCachedProfile(uid?: string | null): void {
  if (!uid) return;
  try {
    localStorage.removeItem(`dktest_cached_profile_${uid}`);
  } catch {}
}
import {
  claimUsernameApi,
  loginWithUsernameApi,
  loginAdminWithPasswordApi,
  setAdminSession,
  isAdminEmail,
  ADMIN_EMAILS,
  clearAdminSession,
  clearParentSession,
  clearStudentSession,
} from "../services/authService";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole | "guest";
  accountStatus: AccountStatus | null;
  loading: boolean;
  authInitialized: boolean;
  emailVerified: boolean;
  isPendingApproval: boolean;
  isSuspended: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  loginWithGoogle: (intendedRole?: "student" | "parent") => Promise<UserProfile>;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  loginWithUsername: (username: string, password: string) => Promise<UserProfile>;
  loginWithAdminPassword: (password: string, email?: string) => Promise<UserProfile>;
  registerWithUsername: (params: {
    username: string;
    password: string;
    displayName: string;
    role: "student" | "parent";
    studentClass?: string;
    phone?: string;
  }) => Promise<UserProfile>;
  registerWithEmail: (params: {
    email: string;
    password: string;
    displayName: string;
    role: "student" | "parent";
    studentClass?: string;
    phone?: string;
    username?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [, setVerificationTick] = useState(0);
  const authEventSeqRef = useRef(0);
  const lastActiveUidRef = useRef<string | null>(null);

  // Sync legacy localStorage keys to ensure complete backward compatibility with older components
  const syncLegacyStorage = (profile: UserProfile | null) => {
    if (profile) {
      persistCachedProfile(profile);
    }
    if (!profile) {
      clearAdminSession();
      localStorage.removeItem("auth_role");
      localStorage.removeItem("admin_token");
      localStorage.removeItem("parent_info");
      localStorage.removeItem("student_info");
      localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.PARENT_INFO);
      localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
      return;
    }

    const isExplicitAdmin =
      profile.role === "admin" ||
      profile.role === "super_admin" ||
      isAdminEmail(profile.email);

    if (isExplicitAdmin) {
      setAdminSession({
        displayName: profile.displayName || "Dương Thanh Điền (Admin)",
        email: profile.email || "duongthanhdien3456@gmail.com",
      });
      return;
    }

    // Clear stale local admin flags whenever a non-admin account signs in
    clearAdminSession();
    const role = profile.role || "student";
    localStorage.setItem("auth_role", role);
    setStoredItem(STORAGE_KEYS.AUTH_ROLE, role);

    if (role === "parent") {
      const pInfo = {
        username: profile.username || (profile.email ? profile.email.split("@")[0] : profile.uid),
        displayName: profile.displayName || "Phụ huynh",
        phone: profile.phone || "",
        uid: profile.uid,
        email: profile.email,
      };
      localStorage.setItem("parent_info", JSON.stringify(pInfo));
      setStoredItem(STORAGE_KEYS.PARENT_INFO, pInfo);
    } else if (role === "student") {
      const sInfo = {
        username: profile.username || (profile.email ? profile.email.split("@")[0] : profile.uid),
        displayName: profile.displayName || "Học sinh",
        studentClass: profile.studentClass || "",
        avatarUrl: profile.photoURL || (profile as any).avatarUrl || "",
        photoURL: profile.photoURL || (profile as any).avatarUrl || "",
        uid: profile.uid,
        email: profile.email,
      };
      localStorage.setItem("student_info", JSON.stringify(sInfo));
      setStoredItem(STORAGE_KEYS.STUDENT_INFO, sInfo);
    }
  };

  const fetchOrCreateProfile = async (
    firebaseUser: User,
    intendedRole?: "student" | "parent",
    extraFields?: Record<string, any>
  ): Promise<UserProfile> => {
    const saved = savedCachedProfile(firebaseUser.uid);
    if (!navigator.onLine && saved) {
      syncLegacyStorage(saved);
      return saved;
    }
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    const now = new Date().toISOString();
    const isAdmin = isAdminEmail(firebaseUser.email);

    if (userSnap.exists()) {
      const existing = userSnap.data() as UserProfile;
      const targetRole: UserRole = isAdmin ? "admin" : (existing.role || intendedRole || "student");

      // Update lastLoginAt, role and login count ONLY if role changed, extra fields supplied, or lastLoginAt > 30 minutes ago (Directive 9)
      const lastLoginMs = existing.lastLoginAt ? new Date(existing.lastLoginAt).getTime() : 0;
      const shouldUpdate =
        !lastLoginMs ||
        Date.now() - lastLoginMs > 30 * 60 * 1000 ||
        existing.role !== targetRole ||
        (extraFields && Object.keys(extraFields).length > 0);

      const rawUpdate: Record<string, any> = {
        role: targetRole,
        emailVerified: isAdmin ? true : firebaseUser.emailVerified,
        photoURL: firebaseUser.photoURL || existing.photoURL || "",
        ...extraFields,
      };

      if (shouldUpdate) {
        rawUpdate.lastLoginAt = now;
        rawUpdate.lastSeenAt = now;
        rawUpdate.loginCount = (existing.loginCount || 0) + 1;
      }

      const updatedData: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawUpdate)) {
        if (v !== undefined) {
          updatedData[k] = v;
        }
      }

      if (shouldUpdate) {
        try {
          await updateDoc(userRef, updatedData);
        } catch (e) {
          console.warn("[AuthContext] Could not update user document:", e);
        }
      }

      const fullProfile: UserProfile = {
        ...existing,
        ...updatedData,
        role: targetRole,
        uid: firebaseUser.uid,
        email: firebaseUser.email || existing.email,
        displayName: existing.displayName || firebaseUser.displayName || (isAdmin ? "Dương Thanh Điền (Admin)" : "Người dùng"),
      };

      if (isAdmin) {
        setAdminSession({
          displayName: fullProfile.displayName || "Dương Thanh Điền (Admin)",
          email: fullProfile.email || "duongthanhdien3456@gmail.com",
        });
      }

      syncLegacyStorage(fullProfile);
      return fullProfile;
    } else {
      // Create new profile in Firestore
      const newRole: UserRole = isAdmin ? "admin" : (intendedRole || "student");
      const username = extraFields?.username || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "");
      const usernameNormalized = username.toLowerCase();
      const displayName = extraFields?.displayName || firebaseUser.displayName || (isAdmin ? "Dương Thanh Điền (Admin)" : username) || "Người dùng";

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        username,
        usernameNormalized,
        email: firebaseUser.email || "",
        displayName,
        fullName: displayName,
        photoURL: firebaseUser.photoURL || "",
        role: newRole,
        accountStatus: "active",
        provider: extraFields?.authProvider === "username" || firebaseUser.email?.endsWith("@dktest.local") ? "username" : (firebaseUser.providerData?.[0]?.providerId === "google.com" ? "google" : "password"),
        authProvider: extraFields?.authProvider || (firebaseUser.email?.endsWith("@dktest.local") ? "username" : (firebaseUser.providerData?.[0]?.providerId === "google.com" ? "google" : "password")),
        emailVerified: isAdmin || Boolean(extraFields?.emailVerified) || firebaseUser.email?.endsWith("@dktest.local") || firebaseUser.emailVerified,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        lastSeenAt: now,
        loginCount: 1,
        profileCompleted: 60,
        studentClass: extraFields?.studentClass || "",
        phone: extraFields?.phone || "",
        studentOnboardingStatus: newRole === "student" ? "pending" : undefined,
      };

      await setDoc(userRef, newProfile);

      if (isAdmin) {
        setAdminSession({
          displayName: newProfile.displayName,
          email: newProfile.email || "duongthanhdien3456@gmail.com",
        });
      } else if (newRole === "student") {
        try {
          await setDoc(
            doc(db, "students", firebaseUser.uid),
            {
              uid: firebaseUser.uid,
              name: newProfile.displayName,
              username: newProfile.username,
              email: newProfile.email,
              studentClass: newProfile.studentClass,
              avatarUrl: newProfile.photoURL,
              createdAt: now,
              updatedAt: now,
            },
            { merge: true }
          );
        } catch (e) {}
      } else if (newRole === "parent") {
        try {
          await setDoc(
            doc(db, "parents", firebaseUser.uid),
            {
              uid: firebaseUser.uid,
              fullName: newProfile.displayName,
              username: newProfile.username,
              email: newProfile.email,
              phone: newProfile.phone,
              childIds: [],
              createdAt: now,
              updatedAt: now,
            },
            { merge: true }
          );
        } catch (e) {}
      }

      syncLegacyStorage(newProfile);
      return newProfile;
    }
  };

  useEffect(() => {
    if (!auth) {
      console.warn("[AuthContext] Firebase Auth instance not available. Operating in offline/guest mode.");
      clearAdminSession();
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      setAuthInitialized(true);
      return;
    }

    let isMounted = true;
    let authReadySettled = false;
    const authReadyPromise: Promise<void> =
      typeof auth.authStateReady === "function"
        ? auth.authStateReady().then(() => {
            authReadySettled = true;
          }).catch(() => {
            authReadySettled = true;
          })
        : Promise.resolve().then(() => {
            authReadySettled = true;
          });

    // Safety watchdog: Guarantee loading finishes within 12s even if Firebase persistence hangs,
    // without wiping localStorage or kicking out active sessions prematurely.
    const watchdogTimer = setTimeout(() => {
      if (!isMounted) return;
      setLoading((currLoading) => {
        if (currLoading) {
          console.warn("[AuthContext] Auth initialization timed out (watchdog). Forcing ready state.");
          setAuthInitialized(true);
          return false;
        }
        return false;
      });
    }, 12000);

    const buildBasicProfile = (firebaseUser: User): UserProfile => ({
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || (isAdminEmail(firebaseUser.email) ? "Dương Thanh Điền (Admin)" : "Thí sinh"),
      fullName: firebaseUser.displayName || (isAdminEmail(firebaseUser.email) ? "Dương Thanh Điền (Admin)" : "Thí sinh"),
      email: firebaseUser.email || "",
      role: isAdminEmail(firebaseUser.email) ? "admin" : "student",
      accountStatus: "active",
      provider: firebaseUser.email?.endsWith("@dktest.local") ? "username" : "password",
      authProvider: firebaseUser.email?.endsWith("@dktest.local") ? "username" : "password",
      emailVerified: Boolean(firebaseUser.emailVerified || isAdminEmail(firebaseUser.email) || firebaseUser.email?.endsWith("@dktest.local")),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const eventSeq = ++authEventSeqRef.current;
      if (!isMounted) return;

      if (currentUser) {
        lastActiveUidRef.current = currentUser.uid;
        setUser(currentUser);
        enableNativeSyncSession(currentUser.uid);

        // Immediately hydrate from cached profile (works for admin, parent, and student)
        // so RequireAuth never misclassifies role or flashes redirects during Firestore latency.
        const saved = savedCachedProfile(currentUser.uid);
        if (saved) {
          setUserProfile(saved);
          syncLegacyStorage(saved);
          clearTimeout(watchdogTimer);
          setLoading(false);
          setAuthInitialized(true);
        }

        const fallbackProfile = saved || buildBasicProfile(currentUser);

        // Start Firestore profile fetch and ALWAYS apply its fresh result when it arrives
        // (never discard a slower-than-3.5s Firestore response!).
        const profilePromise = fetchOrCreateProfile(currentUser)
          .then((freshProfile) => {
            if (isMounted && authEventSeqRef.current === eventSeq) {
              setUserProfile(freshProfile);
              syncLegacyStorage(freshProfile);
            }
            return freshProfile;
          })
          .catch((err) => {
            console.error("[AuthContext] Error loading user profile (using cached/fallback profile):", err);
            if (isMounted && authEventSeqRef.current === eventSeq) {
              setUserProfile((prev) => prev || fallbackProfile);
              syncLegacyStorage(fallbackProfile);
            }
            return fallbackProfile;
          });

        if (!saved) {
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const timeoutPromise = new Promise<UserProfile>((resolve) => {
            timeoutId = setTimeout(() => resolve(fallbackProfile), 4500);
          });
          const initialProfile = await Promise.race([profilePromise, timeoutPromise]);
          if (timeoutId) clearTimeout(timeoutId);
          if (isMounted && authEventSeqRef.current === eventSeq) {
            setUserProfile((prev) => prev || initialProfile);
            syncLegacyStorage(initialProfile);
            clearTimeout(watchdogTimer);
            setLoading(false);
            setAuthInitialized(true);
          }
        }
      } else {
        // Wait for Firebase Auth persistence hydration to complete before treating null as signed-out.
        if (!authReadySettled) {
          await Promise.race([
            authReadyPromise,
            new Promise<void>((resolve) => setTimeout(resolve, 4000)),
          ]);
        }
        if (!isMounted || authEventSeqRef.current !== eventSeq) return;
        // Re-check auth.currentUser after authStateReady in case session hydrated during await
        if (auth.currentUser) return;

        lastActiveUidRef.current = null;
        setUser(null);
        setUserProfile(null);
        syncLegacyStorage(null);
        clearTimeout(watchdogTimer);
        setLoading(false);
        setAuthInitialized(true);
      }
    });

    // Proactive token keep-alive when tab wakes up, regains focus, reconnects, or runs long sessions (>45m)
    let lastRefreshCheckMs = Date.now();
    const keepSessionAlive = () => {
      if (!auth?.currentUser || (typeof navigator !== "undefined" && !navigator.onLine)) return;
      const now = Date.now();
      // Only refresh if >= 10 minutes elapsed since last check to avoid unnecessary token traffic
      if (now - lastRefreshCheckMs < 10 * 60 * 1000) return;
      lastRefreshCheckMs = now;
      auth.currentUser.getIdToken(false).catch(() => {
        auth.currentUser?.getIdToken(true).catch(() => {});
      });
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        keepSessionAlive();
      }
    };
    const keepAliveInterval = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        if (auth?.currentUser && (typeof navigator === "undefined" || navigator.onLine)) {
          lastRefreshCheckMs = Date.now();
          auth.currentUser.getIdToken(true).catch(() => {});
        }
      }
    }, 45 * 60 * 1000);

    if (typeof window !== "undefined") {
      window.addEventListener("focus", keepSessionAlive);
      window.addEventListener("online", keepSessionAlive);
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      clearTimeout(watchdogTimer);
      clearInterval(keepAliveInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", keepSessionAlive);
        window.removeEventListener("online", keepSessionAlive);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      unsubscribe();
    };
  }, []);

  const getIdToken = async (forceRefresh = false): Promise<string> => {
    try {
      if (!auth?.currentUser) return "";
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (err) {
      console.warn("[AuthContext] getIdToken error:", err);
      return "";
    }
  };

  const loginWithGoogle = async (intendedRole?: "student" | "parent"): Promise<UserProfile> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const profile = await fetchOrCreateProfile(result.user, intendedRole);
    setUser(result.user);
    setUserProfile(profile);
    return profile;
  };

  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const profile = await fetchOrCreateProfile(cred.user);
    setUser(cred.user);
    setUserProfile(profile);
    return profile;
  };

  const loginWithUsername = async (username: string, pass: string): Promise<UserProfile> => {
    try {
      const res = await loginWithUsernameApi(username, pass);
      let currentUser: User;

      if (res.customToken) {
        const cred = await signInWithCustomToken(auth, res.customToken);
        currentUser = cred.user;
      } else if (res.email) {
        const cred = await signInWithEmailAndPassword(auth, res.email, pass);
        currentUser = cred.user;
      } else {
        if (!auth.currentUser) {
          throw new Error("Không thể khởi tạo phiên đăng nhập với tên đăng nhập này.");
        }
        currentUser = auth.currentUser;
      }

      const profile = await fetchOrCreateProfile(currentUser);
      setUser(currentUser);
      setUserProfile(profile);
      return profile;
    } catch (apiErr: any) {
      console.warn("[loginWithUsername] API login failed, trying direct Firebase Auth fallback:", apiErr);
      // Attempt direct client fallback for username accounts: <username>@dktest.local
      try {
        const directEmail = `${username.trim().toLowerCase()}@dktest.local`;
        const cred = await signInWithEmailAndPassword(auth, directEmail, pass);
        const profile = await fetchOrCreateProfile(cred.user);
        setUser(cred.user);
        setUserProfile(profile);
        return profile;
      } catch (fallbackErr) {
        // If direct fallback also failed, re-throw original error
        throw apiErr;
      }
    }
  };

  const loginWithAdminPassword = async (pass: string, targetEmail?: string): Promise<UserProfile> => {
    clearAdminSession();
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }

    const res = await loginAdminWithPasswordApi(pass, targetEmail);
    let currentUser: User;

    if (res.customToken) {
      const cred = await signInWithCustomToken(auth, res.customToken);
      currentUser = cred.user;
    } else if (res.email) {
      const cred = await signInWithEmailAndPassword(auth, res.email, pass);
      currentUser = cred.user;
    } else {
      throw new Error("Không khởi tạo được phiên Firebase Quản trị viên.");
    }

    const profile = await fetchOrCreateProfile(currentUser);
    if (profile.role !== "admin" && profile.role !== "super_admin") {
      await signOut(auth).catch(() => {});
      clearAdminSession();
      throw new Error("Tài khoản này chưa được cấp quyền Quản trị viên trong hệ thống.");
    }

    setUser(currentUser);
    setUserProfile(profile);
    return profile;
  };

  const registerWithUsername = async ({
    username,
    password: pass,
    displayName,
    role,
    studentClass,
    phone,
  }: {
    username: string;
    password: string;
    displayName: string;
    role: "student" | "parent";
    studentClass?: string;
    phone?: string;
  }): Promise<UserProfile> => {
    const trimmedUser = username.trim();
    const normalized = trimmedUser.toLowerCase();
    const internalEmail = `${normalized}@dktest.local`;
    const cred = await createUserWithEmailAndPassword(auth, internalEmail, pass);

    if (displayName) {
      try {
        await updateFirebaseProfile(cred.user, { displayName });
      } catch (e) {}
    }

    // Claim username on backend
    try {
      await claimUsernameApi({
        username: trimmedUser,
        uid: cred.user.uid,
        email: internalEmail,
        fullName: displayName,
      });
    } catch (uErr) {
      console.warn("[registerWithUsername] Could not claim username on backend:", uErr);
    }

    const profile = await fetchOrCreateProfile(cred.user, role, {
      displayName,
      fullName: displayName,
      username: trimmedUser,
      usernameNormalized: normalized,
      studentClass,
      phone,
      authProvider: "username",
      emailVerified: true,
    });

    setUser(cred.user);
    setUserProfile(profile);
    return profile;
  };

  const registerWithEmail = async ({
    email,
    password: pass,
    displayName,
    role,
    studentClass,
    phone,
    username,
  }: {
    email: string;
    password: string;
    displayName: string;
    role: "student" | "parent";
    studentClass?: string;
    phone?: string;
    username?: string;
  }): Promise<UserProfile> => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);

    if (displayName) {
      try {
        await updateFirebaseProfile(cred.user, { displayName });
      } catch (e) {}
    }

    try {
      await sendEmailVerification(cred.user);
    } catch (e) {
      console.warn("Could not send email verification immediately:", e);
    }

    // Claim username if provided
    if (username) {
      try {
        await claimUsernameApi({
          username,
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          fullName: displayName,
        });
      } catch (uErr) {
        console.warn("[registerWithEmail] Could not claim username on backend:", uErr);
      }
    }

    const profile = await fetchOrCreateProfile(cred.user, role, {
      displayName,
      fullName: displayName,
      username: username || "",
      usernameNormalized: username ? username.toLowerCase() : "",
      studentClass: studentClass || "",
      phone: phone || "",
    });

    setUser(cred.user);
    setUserProfile(profile);
    return profile;
  };

  const logout = async (): Promise<void> => {
    const prevUid = auth?.currentUser?.uid || user?.uid || lastActiveUidRef.current;
    removeCachedProfile(prevUid);
    await clearNativeSyncSession();
    clearOfflineMedia();
    try {
      await signOut(auth);
    } catch (e) {}
    clearAdminSession();
    clearParentSession();
    clearStudentSession();
    setUser(null);
    setUserProfile(null);
    localStorage.removeItem("auth_role");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_info");
    localStorage.removeItem("parent_info");
    localStorage.removeItem("student_info");
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PARENT_INFO);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const isVerified = auth.currentUser.emailVerified;
    if (isVerified && userProfile && !userProfile.emailVerified) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { emailVerified: true });
        setUserProfile((prev) => (prev ? { ...prev, emailVerified: true } : null));
      } catch (e) {
        console.warn("[checkEmailVerification] Could not update Firestore emailVerified:", e);
      }
    }
    // Keep real Firebase User instance intact (never shallow-spread User prototype!) and trigger re-render
    setUser(auth.currentUser);
    setVerificationTick((t) => t + 1);
    return isVerified;
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;
    const profile = await fetchOrCreateProfile(auth.currentUser);
    setUserProfile(profile);
    return profile;
  };

  const isAdmin =
    Boolean(user) &&
    (userProfile?.role === "admin" ||
      userProfile?.role === "super_admin" ||
      isAdminEmail(user?.email) ||
      isAdminEmail(userProfile?.email));
  const currentRole: UserRole | "guest" = isAdmin
    ? "admin"
    : (userProfile?.role || (user ? "student" : "guest"));
  const accountStatus = userProfile?.accountStatus || (user ? "active" : null);
  const isPendingApproval = accountStatus === "pending";
  const isSuspended = accountStatus === "suspended" || accountStatus === "disabled" || accountStatus === "deleted";

  // Username accounts & Google accounts never require email verification!
  const isUsernameAccount =
    Boolean(user?.email?.endsWith("@dktest.local")) ||
    userProfile?.authProvider === "username" ||
    user?.providerData?.[0]?.providerId === "google.com";
  const emailVerified = isUsernameAccount ? true : (user?.emailVerified ?? false);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role: currentRole,
        accountStatus,
        loading: loading || !authInitialized,
        authInitialized,
        emailVerified,
        isPendingApproval,
        isSuspended,
        getIdToken,
        loginWithGoogle,
        loginWithEmail,
        loginWithUsername,
        loginWithAdminPassword,
        registerWithUsername,
        registerWithEmail,
        logout,
        sendPasswordReset,
        resendVerificationEmail,
        checkEmailVerification,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
