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

/**
 * Set admin session
 */
export function setAdminSession(): void {
  const token = `dk_admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  setStoredItem(STORAGE_KEYS.AUTH_ROLE, "admin", "auth_role");
  setStoredItem(STORAGE_KEYS.ADMIN_TOKEN, token, "admin_token");
}

/**
 * Logout admin
 */
export function clearAdminSession(): void {
  removeStoredItem(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  removeStoredItem(STORAGE_KEYS.ADMIN_TOKEN, "admin_token");
}

/**
 * Checks if current user has valid admin session
 */
export function isAdminAuthenticated(): boolean {
  const role = getStoredItem<string>(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  const token = getStoredItem<string>(STORAGE_KEYS.ADMIN_TOKEN, "admin_token");
  return role === "admin" && !!token;
}

/**
 * Checks if student is authenticated
 */
export function isStudentAuthenticated(): boolean {
  const role = getStoredItem<string>(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  const studentInfo = getStoredItem<any>(STORAGE_KEYS.STUDENT_INFO, "student_info");
  return (role === "student" || role === "admin") && !!studentInfo?.username;
}

/**
 * Checks if parent is authenticated
 */
export function isParentAuthenticated(): boolean {
  const role = getStoredItem<string>(STORAGE_KEYS.AUTH_ROLE, "auth_role");
  const parentInfo = getStoredItem<any>(STORAGE_KEYS.PARENT_INFO, "parent_info");
  return (role === "parent" || role === "admin") && !!parentInfo?.username;
}

/**
 * Get current authenticated user profile
 */
export function getCurrentUser(): CurrentUser {
  if (isAdminAuthenticated()) {
    return {
      role: "admin",
      username: "admin",
      displayName: "Quản trị viên",
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
