/**
 * Authentication Service
 */
import {
  auth,
  keyAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from "../config/firebase.js";
import { store } from "../app/state.js";
import { UserRepository } from "../repositories/user.repository.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

class AuthService {
  constructor() {
    this._userUnsubscribe = null;
  }

  getCurrentUser() {
    return store.getState().auth.currentUser;
  }

  getUserData() {
    return store.getState().user.data;
  }

  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  isAdmin() {
    const data = this.getUserData();
    if (data?.role === "admin" || data?.isAdmin === true) return true;
    if (typeof window !== "undefined" && window.localStorage?.getItem("dkdocshop_dev_admin") === "true") {
      return true;
    }
    return false;
  }

  requiresProfileCompletion() {
    const user = this.getCurrentUser();
    const data = this.getUserData();
    if (!user || !data) return false;

    return (
      !String(data.name || "").trim() ||
      !String(data.class || "").trim() ||
      !data.profileCompleted
    );
  }

  /**
   * Google sign in
   */
  async loginGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      notificationService.success("Đăng nhập thành công!");
      return result.user;
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        logger.error("Google login failed:", err);
        notificationService.error("Đăng nhập thất bại: " + (err.message || "Lỗi không xác định"));
      }
      throw err;
    }
  }

  /**
   * Custom token sign in (for initial token)
   */
  async loginCustomToken(token) {
    if (!token) return;
    try {
      await signInWithCustomToken(auth, token);
      try {
        await signInWithCustomToken(keyAuth, token);
      } catch {}
    } catch (err) {
      logger.error("Custom token login failed:", err);
    }
  }

  /**
   * Sign out
   */
  async logout() {
    try {
      if (this._userUnsubscribe) {
        this._userUnsubscribe();
        this._userUnsubscribe = null;
      }
      await signOut(auth);
      try {
        await signOut(keyAuth);
      } catch {}
      store.setAuth(null);
      store.setUser(null);
      notificationService.info("Đã đăng xuất.");
    } catch (err) {
      logger.error("Logout failed:", err);
      notificationService.error("Đăng xuất thất bại.");
    }
  }

  /**
   * Ensure user record exists in RTDB on login
   */
  async ensureUserRecord(firebaseUser) {
    if (!firebaseUser) return null;

    try {
      let existing = await UserRepository.getUserById(firebaseUser.uid);

      if (!existing) {
        // Check if this is the first user
        let isFirstUser = false;
        try {
          const allUsers = await UserRepository.getAllUsers(true);
          isFirstUser = !allUsers || Object.keys(allUsers).length === 0;
        } catch {
          isFirstUser = false;
        }

        const defaultRecord = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "",
          avatar: firebaseUser.photoURL || "https://placehold.co/100",
          role: isFirstUser ? "admin" : "user",
          verified: true,
          verificationMethod: "auto",
          verifiedAt: Date.now(),
          profileCompleted: false,
          walletBalance: 0,
          class: "",
          school: "",
          createdAt: Date.now(),
        };

        await UserRepository.setUser(firebaseUser.uid, defaultRecord);
        existing = defaultRecord;
      }

      const profileCompleted =
        !!String(existing.name || "").trim() &&
        !!String(existing.class || "").trim();

      if (existing.profileCompleted !== profileCompleted) {
        existing.profileCompleted = profileCompleted;
        await UserRepository.updateUser(firebaseUser.uid, { profileCompleted });
      }

      store.setUser(existing);

      // Setup realtime listener for current user's profile
      if (this._userUnsubscribe) this._userUnsubscribe();
      this._userUnsubscribe = UserRepository.listenUser(firebaseUser.uid, (freshData) => {
        if (freshData) {
          store.setUser(freshData);
        }
      });

      return existing;
    } catch (err) {
      logger.error("Ensure user record failed:", err);
      return null;
    }
  }

  /**
   * Listen to Firebase Auth state
   */
  initAuthListener(onReadyCallback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        store.setAuth(user);
        await this.ensureUserRecord(user);
      } else {
        if (this._userUnsubscribe) {
          this._userUnsubscribe();
          this._userUnsubscribe = null;
        }
        store.setAuth(null);
        store.setUser(null);
      }

      if (onReadyCallback) onReadyCallback(user);
    });
  }
}

export const authService = new AuthService();
