import { getStoredItem, setStoredItem, removeStoredItem, STORAGE_KEYS } from "../utils/storage";

export interface CurrentUser {
  role: "admin" | "student" | "parent" | "guest";
  username: string;
  displayName: string;
  phone?: string;
  studentClass?: string;
}

const DEFAULT_ADMIN_PASS = "Dienkon";

/**
 * Validates admin password securely
 */
export function verifyAdminCredentials(inputPassword: string): boolean {
  const currentPassword = getStoredItem<string>(STORAGE_KEYS.ADMIN_PASSWORD, "admin_password") || DEFAULT_ADMIN_PASS;
  return inputPassword === currentPassword;
}

export const ADMIN_EMAILS = [
  "duongthanhdien3456@gmail.com",
  "dienkon@gmail.com",
  "admin@dktest.local",
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Set admin session and persist credentials permanently in localStorage
 */
export function setAdminSession(info?: { displayName?: string; email?: string }): void {
  const token = `dk_admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const adminData = {
    displayName: info?.displayName || "Dương Thanh Điền (Admin)",
    email: info?.email || "duongthanhdien3456@gmail.com",
    role: "admin",
    ...info,
  };
  setStoredItem(STORAGE_KEYS.AUTH_ROLE, "admin", "auth_role");
  setStoredItem(STORAGE_KEYS.ADMIN_TOKEN, token, "admin_token");
  localStorage.setItem("auth_role", "admin");
  localStorage.setItem("admin_token", token);
  localStorage.setItem("admin_info", JSON.stringify(adminData));
  localStorage.setItem("admin_persisted", "true");
}

/**
 * Logout admin
 */
export function clearAdminSession(): void {
  removeStoredItem(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  removeStoredItem(STORAGE_KEYS.ADMIN_TOKEN, "admin_token");
  localStorage.removeItem("auth_role");
  localStorage.removeItem("admin_token");
  localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
  localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  localStorage.removeItem("admin_info");
  localStorage.removeItem("admin_persisted");
}

/**
 * Logout parent
 */
export function clearParentSession(): void {
  removeStoredItem(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  removeStoredItem(STORAGE_KEYS.PARENT_INFO, "parent_info");
  localStorage.removeItem("auth_role");
  localStorage.removeItem("parent_info");
  localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
  localStorage.removeItem(STORAGE_KEYS.PARENT_INFO);
}

/**
 * Logout student
 */
export function clearStudentSession(): void {
  removeStoredItem(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  removeStoredItem(STORAGE_KEYS.STUDENT_INFO, "student_info");
  localStorage.removeItem("auth_role");
  localStorage.removeItem("student_info");
  localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
  localStorage.removeItem(STORAGE_KEYS.STUDENT_INFO);
  localStorage.removeItem("current_student_session");
  localStorage.removeItem("student_submission_history");
}

/**
 * Checks if current user has valid admin session (including remembered sessions)
 */
export function isAdminAuthenticated(): boolean {
  const legacyRole = localStorage.getItem("auth_role");
  const namespacedRole = localStorage.getItem(STORAGE_KEYS.AUTH_ROLE);
  const activeRole = legacyRole || namespacedRole;
  const token = localStorage.getItem("admin_token") || localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);

  if ((activeRole === "admin" || activeRole === "super_admin") && token) {
    return true;
  }

  // Check persisted admin session (user logged in once as admin)
  try {
    const raw = localStorage.getItem("admin_info");
    if (raw) {
      const info = JSON.parse(raw);
      const emailLower = (info.email || "").toLowerCase().trim();
      if (
        emailLower === "duongthanhdien3456@gmail.com" ||
        emailLower === "dienkon@gmail.com" ||
        emailLower === "admin@dktest.local" ||
        info.role === "admin" ||
        info.role === "super_admin"
      ) {
        // Auto-restore admin tokens if missing
        if (!token) {
          const restoredToken = `dk_admin_${Date.now()}_restored`;
          localStorage.setItem("admin_token", restoredToken);
          localStorage.setItem("auth_role", "admin");
          setStoredItem(STORAGE_KEYS.ADMIN_TOKEN, restoredToken);
          setStoredItem(STORAGE_KEYS.AUTH_ROLE, "admin");
        }
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Checks if student is authenticated
 */
export function isStudentAuthenticated(): boolean {
  const legacyRole = localStorage.getItem("auth_role");
  const namespacedRole = localStorage.getItem(STORAGE_KEYS.AUTH_ROLE);
  const activeRole = legacyRole || namespacedRole;

  const studentInfoStr = localStorage.getItem("student_info") || localStorage.getItem(STORAGE_KEYS.STUDENT_INFO);
  return activeRole === "student" && !!studentInfoStr;
}

/**
 * Checks if parent is authenticated
 */
export function isParentAuthenticated(): boolean {
  const legacyRole = localStorage.getItem("auth_role");
  const namespacedRole = localStorage.getItem(STORAGE_KEYS.AUTH_ROLE);
  const activeRole = legacyRole || namespacedRole;

  const parentInfoStr = localStorage.getItem("parent_info") || localStorage.getItem(STORAGE_KEYS.PARENT_INFO);
  return activeRole === "parent" && !!parentInfoStr;
}

/**
 * Get current authenticated user profile
 */
export function getCurrentUser(): CurrentUser {
  if (isAdminAuthenticated()) {
    let savedInfo: any = {};
    try {
      const raw = localStorage.getItem("admin_info");
      if (raw) savedInfo = JSON.parse(raw);
    } catch {}
    return {
      role: "admin",
      username: "admin",
      displayName: savedInfo.displayName || "Dương Thanh Điền (Admin)",
    };
  }

  const role = getStoredItem<string>(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  if (role === "parent") {
    const parent = getStoredItem<any>(STORAGE_KEYS.PARENT_INFO, "parent_info");
    if (parent?.username) {
      return {
        role: "parent",
        username: parent.username,
        displayName: parent.displayName || parent.username,
        phone: parent.phone,
      };
    }
  }

  const student = getStoredItem<any>(STORAGE_KEYS.STUDENT_INFO, "student_info");
  if (student?.username) {
    return {
      role: "student",
      username: student.username,
      displayName: student.displayName || student.username,
      studentClass: student.studentClass || student.class,
    };
  }

  return {
    role: "guest",
    username: "guest",
    displayName: "Khách",
  };
}

/**
 * Checks if a username is available via backend
 */
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; message?: string }> {
  const { api } = await import("./apiClient");
  return await api.post("/api/auth/check-username", { username }, { requiresAuth: false });
}

/**
 * Claims a username for an existing or newly registered user
 */
export async function claimUsernameApi(params: {
  username: string;
  uid: string;
  email: string;
  fullName: string;
}): Promise<{ success: boolean; username: string }> {
  const { api } = await import("./apiClient");
  return await api.post("/api/auth/claim-username", params, { requiresAuth: false });
}

/**
 * Log in using username and password via backend
 */
export async function loginWithUsernameApi(username: string, password: string): Promise<{
  success: boolean;
  customToken?: string;
  email?: string;
  idToken: string;
  refreshToken: string;
  uid: string;
  username: string;
}> {
  const { api } = await import("./apiClient");
  return await api.post("/api/auth/login-with-username", { username, password }, { requiresAuth: false });
}

