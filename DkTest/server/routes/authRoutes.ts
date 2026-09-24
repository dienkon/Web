import { Router, type Request, type Response } from "express";
import { adminAuth, adminDb, getFirestoreRestDoc, setFirestoreRestDoc, getFirestoreRestDocs } from "../firebaseAdmin.js";

export const authRouter = Router();

// Reserved system usernames
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "moderator",
  "teacher",
  "official",
  "dktest",
  "staff",
  "guest",
  "null",
  "undefined",
  "superuser",
  "security",
  "help",
]);

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;

/**
 * Validate username format and availability
 * POST / GET /api/auth/check-username
 * Body or Query: { username: string }
 */
authRouter.all("/check-username", async (req: Request, res: Response) => {
  try {
    const rawUsername = (req.body?.username || req.query?.username) as string;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(400).json({
        available: false,
        message: "Vui lòng nhập tên đăng nhập.",
      });
    }

    const username = rawUsername.trim();

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        available: false,
        message: "Tên đăng nhập phải có từ 3 đến 30 ký tự.",
      });
    }

    if (/\s/.test(username)) {
      return res.status(400).json({
        available: false,
        message: "Tên đăng nhập không được chứa khoảng trắng.",
      });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        available: false,
        message: "Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới (_), gạch ngang (-) và dấu chấm (.).",
      });
    }

    const usernameNormalized = username.toLowerCase();

    if (RESERVED_USERNAMES.has(usernameNormalized)) {
      return res.status(400).json({
        available: false,
        message: "Tên đăng nhập này thuộc danh mục hệ thống bảo lưu, vui lòng chọn tên khác.",
      });
    }

    // Check availability in Firestore
    if (adminDb) {
      try {
        const usernameDoc = await adminDb.collection("usernames").doc(usernameNormalized).get();
        if (usernameDoc.exists) {
          return res.status(200).json({
            available: false,
            message: "Tên đăng nhập này đã được sử dụng.",
          });
        }

        const userQuery = await adminDb
          .collection("users")
          .where("usernameNormalized", "==", usernameNormalized)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          return res.status(200).json({
            available: false,
            message: "Tên đăng nhập này đã được sử dụng.",
          });
        }
      } catch (err: any) {
        console.warn("[check-username] Error querying Firestore via Admin SDK:", err?.message || err);
      }
    } else {
      // REST API fallback
      const existing = await getFirestoreRestDoc("usernames", usernameNormalized);
      if (existing) {
        return res.status(200).json({
          available: false,
          message: "Tên đăng nhập này đã được sử dụng.",
        });
      }
    }

    return res.status(200).json({
      available: true,
      usernameNormalized,
      message: "Tên đăng nhập hợp lệ và có thể sử dụng.",
    });
  } catch (err: any) {
    console.error("[check-username] Unexpected error:", err);
    return res.status(500).json({
      available: false,
      message: "Lỗi hệ thống khi kiểm tra tên đăng nhập.",
    });
  }
});

/**
 * Claim and link username to an authenticated user
 * POST /api/auth/claim-username
 * Body: { username: string, uid: string, email: string, fullName: string }
 */
authRouter.post("/claim-username", async (req: Request, res: Response) => {
  try {
    const { username, uid, email, fullName } = req.body || {};

    if (!username || !uid) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Thiếu thông tin tên đăng nhập hoặc UID người dùng.",
      });
    }

    const trimmed = String(username).trim();
    const usernameNormalized = trimmed.toLowerCase();

    if (!USERNAME_REGEX.test(trimmed) || RESERVED_USERNAMES.has(usernameNormalized)) {
      return res.status(400).json({
        error: "invalid_username",
        message: "Tên đăng nhập không hợp lệ hoặc thuộc danh mục cấm.",
      });
    }

    if (adminDb) {
      // Check if taken by another user
      const existing = await adminDb.collection("usernames").doc(usernameNormalized).get();
      if (existing.exists && existing.data()?.uid !== uid) {
        return res.status(409).json({
          error: "username_taken",
          message: "Tên đăng nhập này đã được tài khoản khác sử dụng.",
        });
      }

      const now = new Date().toISOString();
      const batch = adminDb.batch();

      const usernameRef = adminDb.collection("usernames").doc(usernameNormalized);
      batch.set(
        usernameRef,
        {
          username: trimmed,
          usernameNormalized,
          uid,
          email: email || "",
          fullName: fullName || "",
          claimedAt: now,
        },
        { merge: true }
      );

      const userRef = adminDb.collection("users").doc(uid);
      batch.set(
        userRef,
        {
          username: trimmed,
          usernameNormalized,
          fullName: fullName || "",
          displayName: fullName || trimmed,
          updatedAt: now,
        },
        { merge: true }
      );

      await batch.commit();
    } else {
      const now = new Date().toISOString();
      await setFirestoreRestDoc("usernames", usernameNormalized, {
        username: trimmed,
        usernameNormalized,
        uid,
        email: email || "",
        fullName: fullName || "",
        claimedAt: now,
      });
      await setFirestoreRestDoc("users", uid, {
        username: trimmed,
        usernameNormalized,
        fullName: fullName || "",
        displayName: fullName || trimmed,
        updatedAt: now,
      });
    }

    return res.status(200).json({
      success: true,
      username: trimmed,
      usernameNormalized,
    });
  } catch (err: any) {
    console.error("[claim-username] Error:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Không thể lưu thông tin tên đăng nhập.",
    });
  }
});

/**
 * Login with Username + Password
 * POST /api/auth/login-with-username
 * Body: { username: string, password: string }
 */
authRouter.post("/login-with-username", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: "missing_credentials",
        message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.",
      });
    }

    const trimmed = String(username).trim();
    const usernameNormalized = trimmed.toLowerCase();

    let targetEmail = "";
    let targetUid = "";

    // 1. Resolve username to email & UID securely on backend
    if (adminDb) {
      const usernameDoc = await adminDb.collection("usernames").doc(usernameNormalized).get();
      if (usernameDoc.exists) {
        const uData = usernameDoc.data();
        targetEmail = uData?.email || "";
        targetUid = uData?.uid || "";
      } else {
        // Fallback: search in users collection
        const userQuery = await adminDb
          .collection("users")
          .where("usernameNormalized", "==", usernameNormalized)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          const uDoc = userQuery.docs[0];
          targetEmail = uDoc.data()?.email || "";
          targetUid = uDoc.id;
        }
      }
    } else {
      // REST API fallback
      const uData = await getFirestoreRestDoc("usernames", usernameNormalized);
      if (uData) {
        targetEmail = uData.email || "";
        targetUid = uData.uid || "";
      } else {
        const allUsers = await getFirestoreRestDocs("users");
        const found = allUsers.find(
          (u) =>
            u.usernameNormalized === usernameNormalized ||
            u.username?.toLowerCase() === usernameNormalized
        );
        if (found) {
          targetEmail = found.email || "";
          targetUid = found.uid || found.id;
        }
      }
    }

    // If still not found, return generic auth error (prevent username enumeration)
    if (!targetEmail || !targetUid) {
      return res.status(401).json({
        error: "invalid_credential",
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
      });
    }

    // 2. Verify password with Firebase Identity Toolkit REST API
    const apiKey =
      process.env.VITE_FIREBASE_API_KEY ||
      process.env.FIREBASE_API_KEY ||
      "AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4";

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          password: String(password),
          returnSecureToken: true,
        }),
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.idToken) {
      const code = verifyData?.error?.message || "";
      console.warn(`[login-with-username] Firebase Auth verification failed for user "${usernameNormalized}": ${code}`);
      return res.status(401).json({
        error: "invalid_credential",
        message: "Tên đăng nhập hoặc mật khẩu không chính xác.",
      });
    }

    // 3. Generate Custom Token if Admin SDK available, or return auth tokens
    let customToken = "";
    if (adminAuth) {
      try {
        customToken = await adminAuth.createCustomToken(targetUid);
      } catch (tokenErr) {
        console.warn("[login-with-username] Could not create custom token:", tokenErr);
      }
    }

    return res.status(200).json({
      success: true,
      customToken,
      email: targetEmail,
      idToken: verifyData.idToken,
      refreshToken: verifyData.refreshToken,
      expiresIn: verifyData.expiresIn,
      uid: targetUid,
      username: trimmed,
    });
  } catch (err: any) {
    console.error("[login-with-username] Unexpected error:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Lỗi xử lý xác thực tên đăng nhập từ máy chủ.",
    });
  }
});
