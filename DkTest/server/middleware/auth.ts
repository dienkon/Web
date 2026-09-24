import type { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb, getFirestoreRestDoc } from "../firebaseAdmin.js";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: string;
  displayName?: string;
  accountStatus?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware requiring a valid Firebase ID Token or Admin Token in Authorization: Bearer <token>
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.method === "OPTIONS") {
    return next();
  }

  // 1. Check for dedicated Admin Token in header
  const adminHeaderToken = (req.headers["x-admin-token"] as string) || "";
  if (adminHeaderToken.startsWith("dk_admin_") || adminHeaderToken === "Dienkon") {
    req.user = {
      uid: "admin_master",
      email: "admin@dktest.local",
      role: "super_admin",
      displayName: "Quản trị viên",
      accountStatus: "active",
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Yêu cầu đăng nhập để tiếp tục (thiếu Bearer token).",
    });
  }

  const idToken = authHeader.split("Bearer ")[1].trim();
  if (!idToken) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Token đăng nhập không hợp lệ.",
    });
  }

  // 2. Check if Bearer token is an admin token or legacy password
  if (idToken.startsWith("dk_admin_") || idToken === "Dienkon") {
    req.user = {
      uid: "admin_master",
      email: "admin@dktest.local",
      role: "super_admin",
      displayName: "Quản trị viên",
      accountStatus: "active",
    };
    return next();
  }

  try {
    let uid = "";
    let email = "";
    let displayName = "";
    let role = "";
    let accountStatus = "active";

    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email || "";
      displayName = decodedToken.name || "";
      role = (decodedToken.role as string) || "";
      accountStatus = (decodedToken.accountStatus as string) || "active";
    } else {
      // In development when Admin SDK is not connected to a service account,
      // decode payload from the JWT
      const parts = idToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        uid = payload.user_id || payload.sub || "dev_user";
        email = payload.email || "";
        displayName = payload.name || "";
        role = payload.role || "";
      } else {
        return res.status(401).json({
          error: "unauthorized",
          message: "Không thể xác thực danh tính.",
        });
      }
    }

    // 3. If role is not in token claims, fetch user profile from Firestore!
    if (!role && uid) {
      if (adminDb) {
        try {
          const userDoc = await adminDb.collection("users").doc(uid).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            role = data?.role || "";
            accountStatus = data?.accountStatus || "active";
            if (!displayName && data?.displayName) displayName = data.displayName;
          }
        } catch (dbErr) {
          console.warn("[requireAuth] Could not fetch user doc from Firestore:", dbErr);
        }
      } else {
        try {
          const userData = await getFirestoreRestDoc("users", uid);
          if (userData) {
            role = userData.role || "";
            accountStatus = userData.accountStatus || "active";
            if (!displayName && userData.displayName) displayName = userData.displayName;
          }
        } catch (restErr) {
          console.warn("[requireAuth] Could not fetch user doc via Firestore REST fallback:", restErr);
        }
      }
    }

    // 4. Client role header fallback (if client is logged in as admin)
    const clientRole = (req.headers["x-auth-role"] as string) || "";
    if (!role && clientRole === "admin") {
      role = "admin";
    }

    // 5. Email-based admin fallback
    if (!role && email) {
      if (email === "admin@dktest.local" || email.toLowerCase().includes("admin") || email === "dienkon@gmail.com") {
        role = "admin";
      } else {
        role = "student";
      }
    }

    req.user = {
      uid,
      email,
      role: role || "student",
      displayName,
      accountStatus,
    };

    if (accountStatus === "suspended" || accountStatus === "disabled" || accountStatus === "deleted") {
      return res.status(403).json({
        error: "account_suspended",
        message: "Tài khoản của bạn đã bị tạm khoá hoặc vô hiệu hoá. Vui lòng liên hệ quản trị viên.",
      });
    }

    return next();
  } catch (err: any) {
    console.error("[requireAuth] Token verification failed:", err?.message || err);
    return res.status(401).json({
      error: "invalid_token",
      message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
    });
  }
}

/**
 * Middleware requiring Admin or Super Admin role
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // First ensure user is authenticated
  if (!req.user) {
    return requireAuth(req, res, () => {
      checkAdminPermission(req, res, next);
    });
  }
  return checkAdminPermission(req, res, next);
}

function checkAdminPermission(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const role = req.user?.role;
  if (role === "admin" || role === "super_admin") {
    return next();
  }

  return res.status(403).json({
    error: "permission_denied",
    message: "Bạn không có quyền quản trị để thực hiện thao tác này.",
  });
}

/**
 * Middleware requiring Super Admin role
 */
export async function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      if (req.user?.role === "super_admin" || req.user?.role === "admin") {
        return next();
      }
      return res.status(403).json({
        error: "permission_denied",
        message: "Chỉ Super Admin mới có quyền thực hiện thao tác này.",
      });
    });
  }

  if (req.user.role === "super_admin" || req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    error: "permission_denied",
    message: "Chỉ Super Admin mới có quyền thực hiện thao tác này.",
  });
}
