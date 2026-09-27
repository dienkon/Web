import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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
import {
  claimUsernameApi,
  loginWithUsernameApi,
  isAdminAuthenticated,
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

  // Sync legacy localStorage keys to ensure complete backward compatibility with older components
  const syncLegacyStorage = (profile: UserProfile | null) => {
    if (!profile) {
      if (isAdminAuthenticated()) {
        return;
      }
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
        avatarUrl: profile.photoURL || "",
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
      if (isAdminAuthenticated()) {
        let savedInfo: any = {};
        try {
          const raw = localStorage.getItem("admin_info");
          if (raw) savedInfo = JSON.parse(raw);
        } catch {}
        setUserProfile({
          uid: "admin_local",
          displayName: savedInfo.displayName || "Dương Thanh Điền (Admin)",
          fullName: savedInfo.displayName || "Dương Thanh Điền (Admin)",
          email: savedInfo.email || "duongthanhdien3456@gmail.com",
          role: "admin",
          accountStatus: "active",
          provider: "password",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setLoading(false);
      setAuthInitialized(true);
      return;
    }

    // Safety watchdog: Guarantee loading finishes within 4.5s even if Firebase hangs
    const watchdogTimer = setTimeout(() => {
      setLoading((currLoading) => {
        if (currLoading) {
          console.warn("[AuthContext] Auth initialization timed out (watchdog). Forcing ready state.");
          setAuthInitialized(true);
          return false;
        }
        return false;
      });
    }, 4500);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Race profile fetch against a 3.5s timeout to prevent hanging on slow 3G/4G
          const profilePromise = fetchOrCreateProfile(currentUser);
          const timeoutPromise = new Promise<UserProfile>((resolve) => {
            setTimeout(() => {
              const basicProfile: UserProfile = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || "Thí sinh",
                fullName: currentUser.displayName || "Thí sinh",
                email: currentUser.email || "",
                role: isAdminEmail(currentUser.email) ? "admin" : "student",
                accountStatus: "active",
                provider: "password",
                emailVerified: Boolean(currentUser.emailVerified),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              resolve(basicProfile);
            }, 3500);
          });

          const profile = await Promise.race([profilePromise, timeoutPromise]);
          setUserProfile(profile);
        } catch (err) {
          console.error("[AuthContext] Error loading user profile:", err);
        }
      } else {
        if (isAdminAuthenticated()) {
          let savedInfo: any = {};
          try {
            const raw = localStorage.getItem("admin_info");
            if (raw) savedInfo = JSON.parse(raw);
          } catch {}

          const adminProfile: UserProfile = {
            uid: "admin_local",
            displayName: savedInfo.displayName || "Dương Thanh Điền (Admin)",
            fullName: savedInfo.displayName || "Dương Thanh Điền (Admin)",
            email: savedInfo.email || "duongthanhdien3456@gmail.com",
            role: "admin",
            accountStatus: "active",
            provider: "password",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(adminProfile);
        } else {
          setUserProfile(null);
          syncLegacyStorage(null);
        }
      }
      clearTimeout(watchdogTimer);
      setLoading(false);
      setAuthInitialized(true);
    });

    return () => {
      clearTimeout(watchdogTimer);
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
    // Force state update to re-evaluate gate
    setUser({ ...auth.currentUser });
    return isVerified;
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;
    const profile = await fetchOrCreateProfile(auth.currentUser);
    setUserProfile(profile);
    return profile;
  };

  const isAdmin =
    isAdminEmail(user?.email) ||
    isAdminEmail(userProfile?.email) ||
    isAdminAuthenticated();
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
