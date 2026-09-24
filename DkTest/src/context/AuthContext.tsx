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
import type { UserProfile, UserRole, AccountStatus } from "../types";
import { STORAGE_KEYS, setStoredItem, removeStoredItem } from "../utils/storage";
import { claimUsernameApi, loginWithUsernameApi } from "../services/authService";

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

    const role = profile.role || "student";
    localStorage.setItem("auth_role", role);
    setStoredItem(STORAGE_KEYS.AUTH_ROLE, role);

    if (role === "admin" || role === "super_admin") {
      const token = `dk_admin_${Date.now()}`;
      localStorage.setItem("admin_token", token);
      setStoredItem(STORAGE_KEYS.ADMIN_TOKEN, token);
    } else if (role === "parent") {
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

    if (userSnap.exists()) {
      const existing = userSnap.data() as UserProfile;
      // Update lastLoginAt and login count
      const rawUpdate: Record<string, any> = {
        lastLoginAt: now,
        lastSeenAt: now,
        emailVerified: firebaseUser.emailVerified,
        photoURL: firebaseUser.photoURL || existing.photoURL || "",
        loginCount: (existing.loginCount || 0) + 1,
        ...extraFields,
      };

      const updatedData: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawUpdate)) {
        if (v !== undefined) {
          updatedData[k] = v;
        }
      }

      try {
        await updateDoc(userRef, updatedData);
      } catch (e) {
        console.warn("[AuthContext] Could not update user document:", e);
      }

      const fullProfile: UserProfile = {
        ...existing,
        ...updatedData,
        uid: firebaseUser.uid,
        email: firebaseUser.email || existing.email,
        displayName: existing.displayName || firebaseUser.displayName || "Người dùng",
      };

      syncLegacyStorage(fullProfile);
      return fullProfile;
    } else {
      // Create new profile in Firestore
      const newRole: UserRole = intendedRole || "student";
      const username = extraFields?.username || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "");
      const usernameNormalized = username.toLowerCase();
      const displayName = extraFields?.displayName || firebaseUser.displayName || username || "Người dùng";

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
        emailVerified: Boolean(extraFields?.emailVerified) || firebaseUser.email?.endsWith("@dktest.local") || firebaseUser.emailVerified,
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

      // Create role-specific document
      if (newRole === "student") {
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await fetchOrCreateProfile(currentUser);
          setUserProfile(profile);
        } catch (err) {
          console.error("[AuthContext] Error loading user profile:", err);
        }
      } else {
        setUserProfile(null);
        syncLegacyStorage(null);
      }
      setLoading(false);
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (forceRefresh = false): Promise<string> => {
    if (!auth.currentUser) return "";
    return await auth.currentUser.getIdToken(forceRefresh);
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
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    syncLegacyStorage(null);
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

  const currentRole = userProfile?.role || (user ? "student" : "guest");
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
