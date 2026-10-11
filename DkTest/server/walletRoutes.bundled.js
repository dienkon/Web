var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/routes/walletRoutes.ts
import { Router } from "express";

// server/firebaseAdmin.ts
import { createRequire } from "module";
function getNativeRequire() {
  if (typeof __require !== "undefined") return __require;
  try {
    return createRequire(import.meta.url);
  } catch {
    return null;
  }
}
var isInitialized = false;
var adminAppInstance = null;
var adminAuthInstance = null;
var adminDbInstance = null;
var isConfiguredState = false;
var FieldValue = {
  serverTimestamp: () => (/* @__PURE__ */ new Date()).toISOString(),
  delete: () => null
};
function initFirebaseAdmin() {
  if (isInitialized) {
    return {
      adminApp: adminAppInstance,
      adminAuth: adminAuthInstance,
      adminDb: adminDbInstance,
      isConfigured: isConfiguredState
    };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
  }
  try {
    const isRealPrivateKey = privateKey && !privateKey.includes("...") && privateKey.includes("-----BEGIN PRIVATE KEY-----");
    if (clientEmail && isRealPrivateKey) {
      try {
        const nativeRequire = getNativeRequire();
        if (!nativeRequire) {
          throw new Error("Unable to resolve require in current runtime environment");
        }
        const { initializeApp, getApps, cert } = nativeRequire("firebase-admin/app");
        const { getAuth } = nativeRequire("firebase-admin/auth");
        const { getFirestore, FieldValue: sdkFieldValue } = nativeRequire("firebase-admin/firestore");
        if (sdkFieldValue) FieldValue = sdkFieldValue;
        const existingApps = getApps();
        if (!existingApps.length) {
          adminAppInstance = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey
            }),
            projectId
          });
        } else {
          adminAppInstance = existingApps[0];
        }
        isInitialized = true;
        isConfiguredState = true;
        adminAuthInstance = getAuth(adminAppInstance);
        adminDbInstance = getFirestore(adminAppInstance);
        console.log(`[FirebaseAdmin] Successfully initialized with service account for project "${projectId}".`);
      } catch (sdkErr) {
        console.warn("[FirebaseAdmin] Failed to load firebase-admin SDK (falling back to REST mode):", sdkErr);
        isInitialized = true;
        isConfiguredState = false;
        adminAppInstance = null;
        adminAuthInstance = null;
        adminDbInstance = null;
      }
    } else {
      isInitialized = true;
      isConfiguredState = false;
      adminAppInstance = null;
      adminAuthInstance = null;
      adminDbInstance = null;
      console.log(`[FirebaseAdmin] Running in REST API fallback mode for project "${projectId}" (no service account private key).`);
    }
  } catch (err) {
    console.error("[FirebaseAdmin] Error initializing Firebase Admin SDK:", err);
    adminDbInstance = null;
    adminAuthInstance = null;
    isConfiguredState = false;
  }
  return {
    adminApp: adminAppInstance,
    adminAuth: adminAuthInstance,
    adminDb: adminDbInstance,
    isConfigured: isConfiguredState
  };
}
var { adminApp, adminAuth: adminAuth2, adminDb: adminDb2, isConfigured } = initFirebaseAdmin();
function decodeFirestoreValue(val) {
  if (!val || typeof val !== "object") return val;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    return (val.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ("mapValue" in val) {
    const obj = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = decodeFirestoreValue(v);
    }
    return obj;
  }
  return val;
}
function decodeFirestoreDocument(doc) {
  if (!doc) return null;
  const id = doc.name ? doc.name.split("/").pop() : "";
  const result = { id, uid: id };
  if (doc.fields) {
    for (const [key, val] of Object.entries(doc.fields)) {
      result[key] = decodeFirestoreValue(val);
    }
  }
  return result;
}
function encodeFirestoreValue(val) {
  if (val === void 0) return void 0;
  if (val === null) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(encodeFirestoreValue).filter((v) => v !== void 0)
      }
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      const enc = encodeFirestoreValue(v);
      if (enc !== void 0) fields[k] = enc;
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}
function encodeFirestoreFields(data) {
  const fields = {};
  for (const [key, val] of Object.entries(data)) {
    const enc = encodeFirestoreValue(val);
    if (enc !== void 0) {
      fields[key] = enc;
    }
  }
  return fields;
}
var serverRestCache = /* @__PURE__ */ new Map();
function clearServerRestCache(keyPattern) {
  if (!keyPattern) {
    serverRestCache.clear();
    return;
  }
  for (const key of serverRestCache.keys()) {
    if (key.includes(keyPattern)) {
      serverRestCache.delete(key);
    }
  }
}
function getFirebaseApiKey() {
  return process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4";
}
var UNCACHED_COLLECTIONS = /* @__PURE__ */ new Set([
  "wallets",
  "deposit_requests",
  "wallet_transactions",
  "debt_records",
  "exam_entitlements",
  "system_stats",
  "exams",
  "users",
  "notifications"
]);
async function getFirestoreRestDocs(collectionName, pageSize = 50, useCache = true, cacheTtlMs = 2e4) {
  const safePageSize = Math.min(pageSize, 100);
  const cacheKey = `docs_${collectionName}_${safePageSize}`;
  const now = Date.now();
  const shouldCache = useCache && !UNCACHED_COLLECTIONS.has(collectionName);
  if (shouldCache) {
    const cached = serverRestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log(`[Server Firestore CACHE_HIT: 0 reads] Collection: "${collectionName}" | Cached docs: ${cached.data.length} | TTL: ${Math.round((cached.expiresAt - now) / 1e3)}s`);
      return cached.data;
    }
  }
  const apiKey = getFirebaseApiKey();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  const t0 = Date.now();
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?key=${apiKey}&pageSize=${safePageSize}`;
    const res = await fetch(url);
    const elapsed = Date.now() - t0;
    if (!res.ok) {
      console.warn(`[Server Firestore READ_FAIL] Collection: "${collectionName}" | Status: ${res.status} | Elapsed: ${elapsed}ms`);
      return [];
    }
    const data = await res.json();
    const docs = (data.documents || []).map(decodeFirestoreDocument);
    console.log(`[Server Firestore READ: ${docs.length} docs] Collection: "${collectionName}" (limit: ${safePageSize}) | Elapsed: ${elapsed}ms`);
    if (shouldCache) {
      serverRestCache.set(cacheKey, { data: docs, expiresAt: now + cacheTtlMs });
    }
    return docs;
  } catch (err) {
    console.error(`[Server Firestore ERROR] Collection: "${collectionName}":`, err);
    return [];
  }
}
async function getFirestoreRestDoc2(collectionName, docId, useCache = true, cacheTtlMs = 3e4) {
  const cacheKey = `doc_${collectionName}_${docId}`;
  const now = Date.now();
  const shouldCache = useCache && !UNCACHED_COLLECTIONS.has(collectionName);
  if (shouldCache) {
    const cached = serverRestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log(`[Server Firestore CACHE_HIT: 0 reads] Doc: "${collectionName}/${docId}" | TTL: ${Math.round((cached.expiresAt - now) / 1e3)}s`);
      return cached.data;
    }
  }
  const apiKey = getFirebaseApiKey();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  const t0 = Date.now();
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;
    const res = await fetch(url);
    const elapsed = Date.now() - t0;
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const doc = decodeFirestoreDocument(data);
    console.log(`[Server Firestore READ_DOC: 1 doc] Doc: "${collectionName}/${docId}" | Found: ${!!doc} | Elapsed: ${elapsed}ms`);
    if (useCache && doc) {
      serverRestCache.set(cacheKey, { data: doc, expiresAt: now + cacheTtlMs });
    }
    return doc;
  } catch (err) {
    return null;
  }
}
async function setFirestoreRestDoc(collectionName, docId, data) {
  const apiKey = getFirebaseApiKey();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  const t0 = Date.now();
  try {
    const fields = encodeFirestoreFields(data);
    const updateMask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}&${updateMask}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    const elapsed = Date.now() - t0;
    console.log(`[Server Firestore WRITE: 1 doc] Doc: "${collectionName}/${docId}" | Status: ${res.status} | Elapsed: ${elapsed}ms`);
    clearServerRestCache(collectionName);
    return res.ok;
  } catch (err) {
    console.error(`[Server Firestore ERROR] Writing "${collectionName}/${docId}":`, err);
    return false;
  }
}

// server/middleware/auth.ts
async function requireAuth(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }
  const isAdminRoute = Boolean(
    req.baseUrl?.startsWith("/api/admin") || req.originalUrl?.startsWith("/api/admin") || req.path?.startsWith("/api/admin")
  );
  const configuredAdminKey = process.env.ADMIN_SECRET_KEY || process.env.DK_ADMIN_MASTER_KEY || "dk_admin_master_secret_2026";
  const adminHeaderToken = req.headers["x-admin-token"] || "";
  const clientAuthRole = req.headers["x-auth-role"] || "";
  const isValidAdminHeader = Boolean(
    configuredAdminKey && adminHeaderToken && adminHeaderToken === configuredAdminKey || adminHeaderToken && adminHeaderToken.startsWith("dk_admin_")
  );
  if (isAdminRoute && isValidAdminHeader) {
    req.user = {
      uid: "admin_master",
      email: process.env.SUPER_ADMIN_DEFAULT_EMAIL || "duongthanhdien3456@gmail.com",
      role: "super_admin",
      displayName: "Qu\u1EA3n tr\u1ECB vi\xEAn H\u1EC7 th\u1ED1ng",
      accountStatus: "active"
    };
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const studentUid = req.headers["x-student-uid"]?.trim() || req.query.studentUid?.trim();
    const studentUsername = req.headers["x-student-username"]?.trim() || req.query.studentUsername?.trim();
    if (studentUid || studentUsername) {
      req.user = {
        uid: studentUid || studentUsername,
        displayName: studentUsername || "H\u1ECDc sinh",
        role: "student",
        accountStatus: "active"
      };
      return next();
    }
    return res.status(401).json({
      error: "unauthorized",
      message: "Y\xEAu c\u1EA7u \u0111\u0103ng nh\u1EADp \u0111\u1EC3 ti\u1EBFp t\u1EE5c (thi\u1EBFu Bearer token)."
    });
  }
  const idToken = authHeader.split("Bearer ")[1].trim();
  if (!idToken) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Token \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7."
    });
  }
  if (idToken.startsWith("student_")) {
    const sUid = decodeURIComponent(idToken.slice(8));
    const sUsername = req.headers["x-student-username"]?.trim() || "";
    req.user = {
      uid: sUid,
      displayName: sUsername || "H\u1ECDc sinh",
      role: "student",
      accountStatus: "active"
    };
    return next();
  }
  const isValidBearerAdmin = Boolean(
    configuredAdminKey && idToken === configuredAdminKey || idToken && idToken.startsWith("dk_admin_")
  );
  if (isAdminRoute && isValidBearerAdmin) {
    req.user = {
      uid: "admin_master",
      email: process.env.SUPER_ADMIN_DEFAULT_EMAIL || "duongthanhdien3456@gmail.com",
      role: "super_admin",
      displayName: "Qu\u1EA3n tr\u1ECB vi\xEAn H\u1EC7 th\u1ED1ng",
      accountStatus: "active"
    };
    return next();
  }
  try {
    let uid = "";
    let email = "";
    let displayName = "";
    let role = "";
    let accountStatus = "active";
    if (adminAuth2) {
      const decodedToken = await adminAuth2.verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email || "";
      displayName = decodedToken.name || "";
      role = decodedToken.role || "";
      accountStatus = decodedToken.accountStatus || "active";
    } else {
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
          message: "Kh\xF4ng th\u1EC3 x\xE1c th\u1EF1c danh t\xEDnh."
        });
      }
    }
    if (!role && uid) {
      if (adminDb2) {
        try {
          const userDoc = await adminDb2.collection("users").doc(uid).get();
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
          const userData = await getFirestoreRestDoc2("users", uid);
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
    const envSuperAdmins = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const VERIFIED_SUPER_ADMIN_EMAILS = /* @__PURE__ */ new Set([
      ...envSuperAdmins,
      "admin@dktest.edu.vn",
      "admin@dktest.local",
      "duongthanhdien3456@gmail.com",
      "dienkon@gmail.com"
    ]);
    const lowerEmail = (email || "").toLowerCase().trim();
    if (VERIFIED_SUPER_ADMIN_EMAILS.has(lowerEmail)) {
      role = "super_admin";
    } else if (isAdminRoute && (adminHeaderToken.startsWith("dk_admin_") || clientAuthRole === "admin")) {
      role = role === "super_admin" ? "super_admin" : "admin";
    } else if (!role) {
      role = "student";
    }
    req.user = {
      uid,
      email,
      role: role || "student",
      displayName,
      accountStatus
    };
    if (accountStatus === "suspended" || accountStatus === "disabled" || accountStatus === "deleted") {
      return res.status(403).json({
        error: "account_suspended",
        message: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB t\u1EA1m kho\xE1 ho\u1EB7c v\xF4 hi\u1EC7u ho\xE1. Vui l\xF2ng li\xEAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\xEAn."
      });
    }
    return next();
  } catch (err) {
    const studentUid = req.headers["x-student-uid"]?.trim() || req.query.studentUid?.trim();
    const studentUsername = req.headers["x-student-username"]?.trim() || req.query.studentUsername?.trim();
    if (studentUid || studentUsername) {
      req.user = {
        uid: studentUid || studentUsername,
        displayName: studentUsername || "H\u1ECDc sinh",
        role: "student",
        accountStatus: "active"
      };
      return next();
    }
    console.error("[requireAuth] Token verification failed:", err?.message || err);
    return res.status(401).json({
      error: "invalid_token",
      message: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i."
    });
  }
}

// server/services/voucherService.ts
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
async function validateVoucher(params) {
  if (!adminDb2) throw new Error("Database not connected");
  const code = normalizeCode(params.code);
  if (!code) {
    return { valid: false, message: "Vui l\xF2ng nh\u1EADp m\xE3 voucher." };
  }
  const snap = await adminDb2.collection("vouchers").where("code", "==", code).limit(1).get();
  if (snap.empty) {
    return { valid: false, message: `M\xE3 voucher "${code}" kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n.` };
  }
  const voucher = { id: snap.docs[0].id, ...snap.docs[0].data() };
  if (!voucher.isActive) {
    return { valid: false, message: "M\xE3 voucher n\xE0y hi\u1EC7n \u0111ang b\u1ECB t\u1EA1m kh\xF3a." };
  }
  if (voucher.expiresAt) {
    const expTime = new Date(voucher.expiresAt).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      return { valid: false, message: "M\xE3 voucher n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng." };
    }
  }
  if (voucher.usageLimit && voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    return { valid: false, message: "M\xE3 voucher n\xE0y \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng." };
  }
  if (params.uid) {
    const usagesSnap = await adminDb2.collection("voucher_usages").where("voucherId", "==", voucher.id).where("uid", "==", params.uid).get();
    const userUsedCount = usagesSnap.size;
    const perUserLimit = voucher.perUserLimit || 1;
    if (userUsedCount >= perUserLimit) {
      return { valid: false, message: `B\u1EA1n \u0111\xE3 s\u1EED d\u1EE5ng m\xE3 n\xE0y ${userUsedCount}/${perUserLimit} l\u1EA7n t\u1ED1i \u0111a.` };
    }
  }
  const baseAmount = Math.max(0, params.amountVnd || 0);
  if (params.context === "gift_money") {
    if (voucher.type !== "gift_money") {
      return { valid: false, message: "M\xE3 n\xE0y kh\xF4ng ph\u1EA3i m\xE3 qu\xE0 t\u1EB7ng n\u1EA1p ti\u1EC1n tr\u1EF1c ti\u1EBFp." };
    }
    return {
      valid: true,
      voucher,
      bonusVnd: voucher.value,
      message: `M\xE3 h\u1EE3p l\u1EC7! Nh\u1EADn ngay +${voucher.value.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED.`
    };
  }
  if (params.context === "exam_unlock") {
    if (voucher.type !== "discount_percent" && voucher.type !== "discount_fixed") {
      return { valid: false, message: "M\xE3 n\xE0y kh\xF4ng \xE1p d\u1EE5ng \u0111\u1EC3 gi\u1EA3m gi\xE1 m\u1EDF kh\xF3a b\xE0i thi." };
    }
    if (voucher.minOrderVnd && baseAmount < voucher.minOrderVnd) {
      return {
        valid: false,
        message: `M\xE3 n\xE0y ch\u1EC9 \xE1p d\u1EE5ng cho b\xE0i thi c\xF3 gi\xE1 t\u1EEB ${voucher.minOrderVnd.toLocaleString("vi-VN")}\u0111 tr\u1EDF l\xEAn.`
      };
    }
    let discountVnd = 0;
    if (voucher.type === "discount_percent") {
      discountVnd = Math.round(baseAmount * voucher.value / 100);
      if (voucher.maxDiscountVnd && discountVnd > voucher.maxDiscountVnd) {
        discountVnd = voucher.maxDiscountVnd;
      }
    } else {
      discountVnd = voucher.value;
    }
    discountVnd = Math.min(baseAmount, Math.max(0, discountVnd));
    const finalPriceVnd = Math.max(0, baseAmount - discountVnd);
    return {
      valid: true,
      voucher,
      discountVnd,
      finalPriceVnd,
      message: `\xC1p d\u1EE5ng th\xE0nh c\xF4ng! Gi\u1EA3m ${discountVnd.toLocaleString("vi-VN")}\u0111 (c\xF2n ${finalPriceVnd.toLocaleString("vi-VN")}\u0111).`
    };
  }
  if (params.context === "deposit") {
    if (voucher.type !== "deposit_bonus_percent" && voucher.type !== "deposit_bonus_fixed") {
      return { valid: false, message: "M\xE3 n\xE0y kh\xF4ng \xE1p d\u1EE5ng \u01B0u \u0111\xE3i khi n\u1EA1p ti\u1EC1n." };
    }
    if (voucher.minDepositVnd && baseAmount < voucher.minDepositVnd) {
      return {
        valid: false,
        message: `M\xE3 n\xE0y ch\u1EC9 \xE1p d\u1EE5ng khi n\u1EA1p t\u1EEB ${voucher.minDepositVnd.toLocaleString("vi-VN")}\u0111 tr\u1EDF l\xEAn.`
      };
    }
    let bonusVnd = 0;
    if (voucher.type === "deposit_bonus_percent") {
      bonusVnd = Math.round(baseAmount * voucher.value / 100);
    } else {
      bonusVnd = voucher.value;
    }
    return {
      valid: true,
      voucher,
      bonusVnd,
      message: `M\xE3 n\u1EA1p h\u1EE3p l\u1EC7! B\u1EA1n s\u1EBD \u0111\u01B0\u1EE3c t\u1EB7ng th\xEAm +${bonusVnd.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED.`
    };
  }
  return { valid: false, message: "Lo\u1EA1i \u01B0u \u0111\xE3i kh\xF4ng ph\xF9 h\u1EE3p." };
}
async function redeemGiftVoucher(code, uid) {
  if (!adminDb2) throw new Error("Database not connected");
  const validation = await validateVoucher({ code, uid, context: "gift_money" });
  if (!validation.valid || !validation.voucher || !validation.bonusVnd) {
    throw new Error(validation.message || "M\xE3 qu\xE0 t\u1EB7ng kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const voucher = validation.voucher;
  const addedVnd = validation.bonusVnd;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let finalBalance = 0;
  await adminDb2.runTransaction(async (transaction) => {
    const vRef = adminDb2.collection("vouchers").doc(voucher.id);
    const vSnap = await transaction.get(vRef);
    if (!vSnap.exists) throw new Error("Voucher kh\xF4ng t\u1ED3n t\u1EA1i.");
    const vData = vSnap.data();
    if (vData.usageLimit && vData.usageLimit > 0 && vData.usedCount >= vData.usageLimit) {
      throw new Error("M\xE3 qu\xE0 t\u1EB7ng \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng.");
    }
    const wRef = adminDb2.collection("wallets").doc(uid);
    const wSnap = await transaction.get(wRef);
    let prevBalance = 0;
    let fullName = "";
    let currentClass = "";
    if (wSnap.exists) {
      const wData = wSnap.data();
      prevBalance = wData.balanceVnd || 0;
      fullName = wData.fullName || "";
      currentClass = wData.currentClass || "";
    }
    finalBalance = prevBalance + addedVnd;
    transaction.set(
      wRef,
      {
        uid,
        balanceVnd: finalBalance,
        totalCreditedVnd: (wSnap.exists ? wSnap.data()?.totalCreditedVnd || 0 : 0) + addedVnd,
        updatedAt: now
      },
      { merge: true }
    );
    transaction.update(vRef, {
      usedCount: (vData.usedCount || 0) + 1,
      updatedAt: now
    });
    const usageRef = adminDb2.collection("voucher_usages").doc(usageId);
    const usageDoc = {
      id: usageId,
      voucherId: voucher.id,
      voucherCode: voucher.code,
      uid,
      studentName: fullName,
      studentClass: currentClass,
      type: "gift_money",
      bonusVnd: addedVnd,
      usedAt: now,
      context: "gift_money"
    };
    transaction.set(usageRef, usageDoc);
    const txRef = adminDb2.collection("wallet_transactions").doc(txId);
    const txDoc = {
      id: txId,
      uid,
      type: "deposit_credit",
      amountVnd: addedVnd,
      balanceBeforeVnd: prevBalance,
      balanceAfterVnd: finalBalance,
      actorUid: "system",
      actorName: `Voucher: ${voucher.code}`,
      note: `Nh\u1EADp m\xE3 qu\xE0 t\u1EB7ng "${voucher.code}": +${addedVnd.toLocaleString("vi-VN")}\u0111`,
      createdAt: now
    };
    transaction.set(txRef, txDoc);
  });
  return {
    success: true,
    addedVnd,
    newBalanceVnd: finalBalance,
    voucher
  };
}

// server/services/walletService.ts
function sanitizeVnd(val) {
  if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
    val = parseInt(String(val || 0), 10);
  }
  if (isNaN(val) || !isFinite(val) || val < 0) return 0;
  return Math.floor(val);
}
async function getOrCreateWallet(uid, initialData) {
  if (!uid || typeof uid !== "string") {
    throw new Error("UID kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const cleanUid = uid.trim();
  if (adminDb2) {
    const walletRef = adminDb2.collection("wallets").doc(cleanUid);
    const snap = await walletRef.get();
    if (snap.exists) {
      const data = snap.data();
      const bal = sanitizeVnd(data.balanceVnd);
      if (bal > 0) {
        return await autoApprovePendingRequestsForUser(cleanUid, {
          uid: cleanUid,
          balanceVnd: bal,
          totalCreditedVnd: sanitizeVnd(data.totalCreditedVnd),
          totalSpentVnd: sanitizeVnd(data.totalSpentVnd),
          profileCompleted: Boolean(data.profileCompleted),
          fullName: data.fullName || "",
          currentClass: data.currentClass || "",
          verifiedName: data.verifiedName,
          isVerified: data.isVerified,
          createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: data.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    let altDocId = null;
    let defaultName = initialData?.fullName || "";
    let defaultClass = initialData?.currentClass || "";
    try {
      const uDoc = await adminDb2.collection("users").doc(cleanUid).get();
      if (uDoc.exists) {
        const uData = uDoc.data();
        defaultName = defaultName || uData?.fullName || uData?.displayName || "";
        defaultClass = defaultClass || uData?.studentClass || "";
        if (uData?.username) altDocId = uData.username;
      } else {
        const unSnap = await adminDb2.collection("usernames").doc(cleanUid.toLowerCase()).get();
        if (unSnap.exists && unSnap.data()?.uid) {
          altDocId = unSnap.data().uid;
        }
      }
    } catch (_) {
    }
    if (altDocId && altDocId !== cleanUid) {
      try {
        const altSnap = await adminDb2.collection("wallets").doc(altDocId).get();
        if (altSnap.exists) {
          const altData = altSnap.data();
          const altBal = sanitizeVnd(altData.balanceVnd);
          if (altBal > 0) {
            const now3 = (/* @__PURE__ */ new Date()).toISOString();
            const syncedWallet = {
              uid: cleanUid,
              balanceVnd: altBal,
              totalCreditedVnd: sanitizeVnd(altData.totalCreditedVnd),
              totalSpentVnd: sanitizeVnd(altData.totalSpentVnd),
              profileCompleted: Boolean(altData.profileCompleted || defaultName && defaultClass),
              fullName: altData.fullName || defaultName,
              currentClass: altData.currentClass || defaultClass,
              verifiedName: altData.verifiedName,
              isVerified: altData.isVerified,
              createdAt: altData.createdAt || now3,
              updatedAt: now3
            };
            await walletRef.set(syncedWallet, { merge: true });
            return await autoApprovePendingRequestsForUser(cleanUid, syncedWallet);
          }
        }
      } catch (_) {
      }
    }
    if (snap.exists) {
      const data = snap.data();
      return await autoApprovePendingRequestsForUser(cleanUid, {
        uid: cleanUid,
        balanceVnd: sanitizeVnd(data.balanceVnd),
        totalCreditedVnd: sanitizeVnd(data.totalCreditedVnd),
        totalSpentVnd: sanitizeVnd(data.totalSpentVnd),
        profileCompleted: Boolean(data.profileCompleted),
        fullName: data.fullName || defaultName,
        currentClass: data.currentClass || defaultClass,
        verifiedName: data.verifiedName,
        isVerified: data.isVerified,
        createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: data.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    const newWallet2 = {
      uid: cleanUid,
      balanceVnd: 0,
      totalCreditedVnd: 0,
      totalSpentVnd: 0,
      profileCompleted: Boolean(defaultName && defaultClass),
      fullName: defaultName,
      currentClass: defaultClass,
      createdAt: now2,
      updatedAt: now2
    };
    await walletRef.set(newWallet2);
    return await autoApprovePendingRequestsForUser(cleanUid, newWallet2);
  }
  const existing = await getFirestoreRestDoc2("wallets", cleanUid);
  if (existing) {
    const existingBal = sanitizeVnd(existing.balanceVnd);
    if (existingBal > 0) {
      const w = {
        uid: cleanUid,
        balanceVnd: existingBal,
        totalCreditedVnd: sanitizeVnd(existing.totalCreditedVnd),
        totalSpentVnd: sanitizeVnd(existing.totalSpentVnd),
        profileCompleted: Boolean(existing.profileCompleted),
        fullName: existing.fullName || "",
        currentClass: existing.currentClass || "",
        verifiedName: existing.verifiedName,
        isVerified: existing.isVerified,
        createdAt: existing.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: existing.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      return await autoApprovePendingRequestsForUser(cleanUid, w);
    }
  }
  let altDocIdRest = null;
  let restDefaultName = initialData?.fullName || "";
  let restDefaultClass = initialData?.currentClass || "";
  try {
    const uDoc = await getFirestoreRestDoc2("users", cleanUid);
    if (uDoc) {
      restDefaultName = restDefaultName || uDoc.fullName || uDoc.displayName || "";
      restDefaultClass = restDefaultClass || uDoc.studentClass || "";
      if (uDoc.username) altDocIdRest = uDoc.username;
    } else {
      const unDoc = await getFirestoreRestDoc2("usernames", cleanUid.toLowerCase());
      if (unDoc?.uid) altDocIdRest = unDoc.uid;
    }
  } catch (_) {
  }
  if (altDocIdRest && altDocIdRest !== cleanUid) {
    try {
      const altExisting = await getFirestoreRestDoc2("wallets", altDocIdRest);
      if (altExisting && sanitizeVnd(altExisting.balanceVnd) > 0) {
        const altBal = sanitizeVnd(altExisting.balanceVnd);
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        const syncedWallet = {
          uid: cleanUid,
          balanceVnd: altBal,
          totalCreditedVnd: sanitizeVnd(altExisting.totalCreditedVnd),
          totalSpentVnd: sanitizeVnd(altExisting.totalSpentVnd),
          profileCompleted: Boolean(altExisting.profileCompleted || restDefaultName && restDefaultClass),
          fullName: altExisting.fullName || restDefaultName,
          currentClass: altExisting.currentClass || restDefaultClass,
          verifiedName: altExisting.verifiedName,
          isVerified: altExisting.isVerified,
          createdAt: altExisting.createdAt || now2,
          updatedAt: now2
        };
        await setFirestoreRestDoc("wallets", cleanUid, syncedWallet);
        return await autoApprovePendingRequestsForUser(cleanUid, syncedWallet);
      }
    } catch (_) {
    }
  }
  if (existing) {
    const w = {
      uid: cleanUid,
      balanceVnd: sanitizeVnd(existing.balanceVnd),
      totalCreditedVnd: sanitizeVnd(existing.totalCreditedVnd),
      totalSpentVnd: sanitizeVnd(existing.totalSpentVnd),
      profileCompleted: Boolean(existing.profileCompleted),
      fullName: existing.fullName || restDefaultName,
      currentClass: existing.currentClass || restDefaultClass,
      verifiedName: existing.verifiedName,
      isVerified: existing.isVerified,
      createdAt: existing.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: existing.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    return await autoApprovePendingRequestsForUser(cleanUid, w);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newWallet = {
    uid: cleanUid,
    balanceVnd: 0,
    totalCreditedVnd: 0,
    totalSpentVnd: 0,
    profileCompleted: Boolean(restDefaultName && restDefaultClass),
    fullName: restDefaultName,
    currentClass: restDefaultClass,
    createdAt: now,
    updatedAt: now
  };
  await setFirestoreRestDoc("wallets", cleanUid, newWallet);
  return await autoApprovePendingRequestsForUser(cleanUid, newWallet);
}
async function autoApprovePendingRequestsForUser(uid, wallet) {
  try {
    const pendingRequests = await getStudentDepositRequests(uid);
    const unapproved = pendingRequests.filter((r) => r.status === "pending");
    if (unapproved.length === 0) return wallet;
    let balanceAdd = 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const req of unapproved) {
      const amt = sanitizeVnd(req.amountVnd);
      if (amt <= 0) continue;
      balanceAdd += amt;
      const approvedReq = {
        ...req,
        status: "approved",
        processedAt: now,
        processedBy: "system",
        processedByName: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
        externalCollectionNote: "\u0110\xE3 c\u1ED9ng v\xED \u1EA3o t\u1EF1 \u0111\u1ED9ng. C\u1EA7n thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi."
      };
      if (adminDb2) {
        await adminDb2.collection("deposit_requests").doc(req.id).set(approvedReq, { merge: true });
      } else {
        await setFirestoreRestDoc("deposit_requests", req.id, approvedReq);
      }
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry = {
        id: txId,
        uid,
        type: "deposit_credit",
        amountVnd: amt,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: wallet.balanceVnd + balanceAdd,
        depositRequestId: req.id,
        idempotencyKey: req.id,
        actorUid: "system",
        actorName: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
        note: `N\u1EA1p ti\u1EC1n t\u1EF1 \u0111\u1ED9ng: +${amt.toLocaleString("vi-VN")}\u0111 (ch\u1EDD thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi)`,
        createdAt: now
      };
      const debtEntry = {
        id: debtId,
        uid,
        studentNameSnapshot: wallet.fullName || "",
        studentClassSnapshot: wallet.currentClass || "",
        type: "manual_receivable",
        amountVnd: amt,
        collectedVnd: 0,
        allocatedVnd: 0,
        remainingVnd: amt,
        adjustedVnd: 0,
        transactionId: txId,
        status: "unpaid",
        note: `Ti\u1EC1n n\u1EA1p v\xED t\u1EF1 \u0111\u1ED9ng #${req.id} (c\u1EA7n thu ngo\xE0i \u0111\u1EDDi)`,
        createdAt: now,
        updatedAt: now
      };
      if (adminDb2) {
        await adminDb2.collection("wallet_transactions").doc(txId).set(ledgerEntry);
        await adminDb2.collection("debt_records").doc(debtId).set(debtEntry);
      } else {
        await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);
        await setFirestoreRestDoc("debt_records", debtId, debtEntry);
      }
    }
    if (balanceAdd > 0) {
      const updatedWallet = {
        ...wallet,
        balanceVnd: sanitizeVnd(wallet.balanceVnd) + balanceAdd,
        totalCreditedVnd: sanitizeVnd(wallet.totalCreditedVnd) + balanceAdd,
        updatedAt: now
      };
      if (adminDb2) {
        await adminDb2.collection("wallets").doc(uid).set(updatedWallet, { merge: true });
      } else {
        await setFirestoreRestDoc("wallets", uid, updatedWallet);
      }
      return updatedWallet;
    }
  } catch (err) {
    console.warn(`[AutoApprove] Error auto-approving pending requests for ${uid}:`, err);
  }
  return wallet;
}
async function updateWalletProfile(uid, data) {
  const fullName = String(data.fullName || "").trim();
  const currentClass = String(data.currentClass || "").trim().toUpperCase();
  if (!fullName || fullName.length < 2) {
    throw new Error("H\u1ECD v\xE0 t\xEAn h\u1ECDc sinh ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 2 k\xFD t\u1EF1.");
  }
  if (!currentClass || currentClass.length < 2) {
    throw new Error("L\u1EDBp h\u1ECDc hi\u1EC7n t\u1EA1i kh\xF4ng h\u1EE3p l\u1EC7 (v\xED d\u1EE5: 11A1, 12D2).");
  }
  const existing = await getOrCreateWallet(uid);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updates = {
    fullName,
    currentClass,
    profileCompleted: true,
    updatedAt: now
  };
  if (adminDb2) {
    await adminDb2.collection("wallets").doc(uid).update(updates);
  } else {
    await setFirestoreRestDoc("wallets", uid, { ...existing, ...updates });
  }
  return { ...existing, ...updates };
}
async function sendDiscordDepositAlert(params) {
  const webhookUrl = process.env.DISCORD_REPORT_WEBHOOK_URL || "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";
  const payload = {
    embeds: [
      {
        title: "\u{1F4B5} H\u1ECCC SINH N\u1EA0P TI\u1EC0N V\xCD \u1EA2O (T\u1EF0 \u0110\u1ED8NG DUY\u1EC6T)",
        color: 1096065,
        description: "H\u1ECDc sinh \u0111\xE3 n\u1EA1p ti\u1EC1n v\xE0o v\xED \u1EA3o \u0111\u1EC3 m\u1EDF kh\xF3a b\xE0i thi. Kho\u1EA3n ti\u1EC1n \u0111\xE3 \u0111\u01B0\u1EE3c ghi v\xE0o **S\u1ED5 c\xF4ng n\u1EE3**, vui l\xF2ng ki\u1EC3m tra v\xE0 thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi!",
        fields: [
          {
            name: "\u{1F464} H\u1ECDc sinh",
            value: `**${params.studentName || "N/A"}**`,
            inline: true
          },
          {
            name: "\u{1F3EB} L\u1EDBp",
            value: `\`${params.studentClass || "Ch\u01B0a r\xF5"}\``,
            inline: true
          },
          {
            name: "\u{1F4B0} S\u1ED1 ti\u1EC1n n\u1EA1p",
            value: `**+${params.amountVnd.toLocaleString("vi-VN")}\u0111**`,
            inline: true
          },
          {
            name: "\u{1F194} M\xE3 y\xEAu c\u1EA7u n\u1EA1p",
            value: `\`${params.requestId}\``,
            inline: false
          },
          {
            name: "\u26A1 Tr\u1EA1ng th\xE1i",
            value: "\u2705 **\u0110\xE3 c\u1ED9ng v\xED t\u1EF1 \u0111\u1ED9ng** \u2014 \u23F3 **C\u1EA7n thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi**",
            inline: false
          }
        ],
        footer: {
          text: "H\u1EC7 th\u1ED1ng V\xED & C\xF4ng n\u1EE3 DkTEST"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      console.warn(`[DiscordWebhook] G\u1EEDi th\xF4ng b\xE1o n\u1EA1p ti\u1EC1n th\u1EA5t b\u1EA1i: HTTP ${resp.status}`);
    } else {
      console.log(`[DiscordWebhook] \u0110\xE3 g\u1EEDi th\xF4ng b\xE1o n\u1EA1p ti\u1EC1n cho h\u1ECDc sinh ${params.studentName}`);
    }
  } catch (err) {
    console.warn("[DiscordWebhook] Kh\xF4ng th\u1EC3 g\u1EEDi Discord alert:", err?.message || err);
  }
}
async function createDepositRequest(uid, amountVnd, idempotencyKey, voucherCode) {
  const cleanAmount = sanitizeVnd(amountVnd);
  if (cleanAmount < 1e3) {
    throw new Error("S\u1ED1 ti\u1EC1n n\u1EA1p t\u1ED1i thi\u1EC3u l\xE0 1.000\u0111.");
  }
  if (cleanAmount > 5e5) {
    throw new Error("S\u1ED1 ti\u1EC1n n\u1EA1p t\u1ED1i \u0111a cho m\u1ED7i y\xEAu c\u1EA7u l\xE0 500.000\u0111.");
  }
  const wallet = await getOrCreateWallet(uid);
  if (!wallet.profileCompleted || !wallet.fullName || !wallet.currentClass) {
    throw new Error("Vui l\xF2ng ho\xE0n th\xE0nh h\u1ED3 s\u01A1 h\u1ECD t\xEAn v\xE0 l\u1EDBp tr\u01B0\u1EDBc khi t\u1EA1o y\xEAu c\u1EA7u n\u1EA1p ti\u1EC1n.");
  }
  let bonusVnd = 0;
  let appliedVoucher = null;
  if (voucherCode && String(voucherCode).trim()) {
    const vRes = await validateVoucher({
      code: String(voucherCode).trim(),
      uid,
      context: "deposit",
      amountVnd: cleanAmount
    });
    if (vRes.valid && vRes.voucher) {
      bonusVnd = vRes.bonusVnd || 0;
      appliedVoucher = vRes.voucher;
    } else {
      throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7 cho kho\u1EA3n n\u1EA1p n\xE0y.");
    }
  }
  const cleanKey = idempotencyKey ? String(idempotencyKey).trim() : "";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (cleanKey && adminDb2) {
    const existingSnap = await adminDb2.collection("deposit_requests").where("idempotencyKey", "==", cleanKey).where("uid", "==", uid).limit(1).get();
    if (!existingSnap.empty) {
      return existingSnap.docs[0].data();
    }
  }
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const totalCreditToAdd = cleanAmount + bonusVnd;
  const requestDoc = {
    id: requestId,
    uid,
    amountVnd: cleanAmount,
    status: "approved",
    studentNameSnapshot: wallet.fullName,
    studentClassSnapshot: wallet.currentClass,
    createdAt: now,
    processedAt: now,
    processedBy: "system",
    processedByName: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
    externalCollectionNote: bonusVnd > 0 ? `\u0110\xE3 c\u1ED9ng v\xED \u1EA3o t\u1EF1 \u0111\u1ED9ng ${cleanAmount.toLocaleString("vi-VN")}\u0111 (+${bonusVnd.toLocaleString("vi-VN")}\u0111 th\u01B0\u1EDFng voucher ${appliedVoucher?.code}). C\u1EA7n thu ${cleanAmount.toLocaleString("vi-VN")}\u0111 ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi.` : "\u0110\xE3 c\u1ED9ng v\xED \u1EA3o t\u1EF1 \u0111\u1ED9ng. C\u1EA7n thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi.",
    idempotencyKey: cleanKey || requestId
  };
  if (adminDb2) {
    await adminDb2.runTransaction(async (transaction) => {
      const walletRef = adminDb2.collection("wallets").doc(uid);
      const walletSnap = await transaction.get(walletRef);
      let prevBalance = 0;
      let totalCredited = 0;
      let totalSpent = 0;
      let fullName = wallet.fullName;
      let currentClass = wallet.currentClass;
      if (walletSnap.exists) {
        const wData = walletSnap.data();
        prevBalance = sanitizeVnd(wData.balanceVnd);
        totalCredited = sanitizeVnd(wData.totalCreditedVnd);
        totalSpent = sanitizeVnd(wData.totalSpentVnd);
        fullName = wData.fullName || fullName;
        currentClass = wData.currentClass || currentClass;
      }
      const newBalance = prevBalance + totalCreditToAdd;
      const newTotalCredited = totalCredited + totalCreditToAdd;
      const reqRef = adminDb2.collection("deposit_requests").doc(requestId);
      transaction.set(reqRef, requestDoc);
      transaction.set(
        walletRef,
        {
          uid,
          balanceVnd: newBalance,
          totalCreditedVnd: newTotalCredited,
          totalSpentVnd: totalSpent,
          profileCompleted: true,
          fullName,
          currentClass,
          updatedAt: now
        },
        { merge: true }
      );
      const txRef = adminDb2.collection("wallet_transactions").doc(txId);
      const ledgerEntry = {
        id: txId,
        uid,
        type: "deposit_credit",
        amountVnd: totalCreditToAdd,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        depositRequestId: requestId,
        idempotencyKey: cleanKey || requestId,
        actorUid: "system",
        actorName: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
        note: bonusVnd > 0 ? `N\u1EA1p ti\u1EC1n t\u1EF1 \u0111\u1ED9ng: +${cleanAmount.toLocaleString("vi-VN")}\u0111 (+${bonusVnd.toLocaleString("vi-VN")}\u0111 th\u01B0\u1EDFng voucher ${appliedVoucher?.code}) (ch\u1EDD thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi)` : `N\u1EA1p ti\u1EC1n t\u1EF1 \u0111\u1ED9ng: +${cleanAmount.toLocaleString("vi-VN")}\u0111 (ch\u1EDD thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi)`,
        createdAt: now
      };
      transaction.set(txRef, ledgerEntry);
      const debtRef = adminDb2.collection("debt_records").doc(debtId);
      const debtEntry = {
        id: debtId,
        uid,
        studentNameSnapshot: fullName || "",
        studentClassSnapshot: currentClass || "",
        type: "manual_receivable",
        amountVnd: cleanAmount,
        collectedVnd: 0,
        allocatedVnd: 0,
        remainingVnd: cleanAmount,
        adjustedVnd: 0,
        transactionId: txId,
        status: "unpaid",
        note: `Ti\u1EC1n n\u1EA1p v\xED t\u1EF1 \u0111\u1ED9ng #${requestId} (c\u1EA7n thu ngo\xE0i \u0111\u1EDDi)`,
        createdAt: now,
        updatedAt: now
      };
      transaction.set(debtRef, debtEntry);
      if (appliedVoucher) {
        const vRef = adminDb2.collection("vouchers").doc(appliedVoucher.id);
        const vSnap = await transaction.get(vRef);
        if (vSnap.exists) {
          const vData = vSnap.data();
          transaction.update(vRef, {
            usedCount: (vData.usedCount || 0) + 1,
            updatedAt: now
          });
        }
        const usageRef = adminDb2.collection("voucher_usages").doc(usageId);
        const usageDoc = {
          id: usageId,
          voucherId: appliedVoucher.id,
          voucherCode: appliedVoucher.code,
          uid,
          studentName: fullName,
          studentClass: currentClass,
          type: appliedVoucher.type,
          bonusVnd,
          usedAt: now,
          context: "deposit",
          referenceId: requestId
        };
        transaction.set(usageRef, usageDoc);
      }
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const notifRef = adminDb2.collection("notifications").doc(notifId);
      transaction.set(notifRef, {
        id: notifId,
        recipientUid: "admin",
        title: `\u{1F4B5} H\u1ECDc sinh n\u1EA1p ti\u1EC1n: ${fullName || wallet.fullName || "H\u1ECDc sinh"} (+${cleanAmount.toLocaleString("vi-VN")}\u0111${bonusVnd > 0 ? ` +${bonusVnd.toLocaleString("vi-VN")}\u0111 KM` : ""})`,
        content: `H\u1ECDc sinh ${fullName || wallet.fullName || "H\u1ECDc sinh"} (${currentClass || wallet.currentClass || "Ch\u01B0a r\xF5"}) v\u1EEBa n\u1EA1p ${cleanAmount.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED \u1EA3o${bonusVnd > 0 ? ` (\xE1p d\u1EE5ng voucher ${appliedVoucher?.code} th\u01B0\u1EDFng +${bonusVnd.toLocaleString("vi-VN")}\u0111)` : ""}. H\u1EC7 th\u1ED1ng \u0111\xE3 t\u1EF1 \u0111\u1ED9ng duy\u1EC7t & ghi n\u1EE3. Vui l\xF2ng thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi!`,
        type: "system",
        read: false,
        link: "/admin/wallets",
        createdAt: now
      });
    });
  } else {
    const prevBalance = sanitizeVnd(wallet.balanceVnd);
    const newBalance = prevBalance + totalCreditToAdd;
    const newTotalCredited = sanitizeVnd(wallet.totalCreditedVnd) + totalCreditToAdd;
    await setFirestoreRestDoc("deposit_requests", requestId, requestDoc);
    await setFirestoreRestDoc("wallets", uid, {
      ...wallet,
      balanceVnd: newBalance,
      totalCreditedVnd: newTotalCredited,
      updatedAt: now
    });
    const ledgerEntry = {
      id: txId,
      uid,
      type: "deposit_credit",
      amountVnd: totalCreditToAdd,
      balanceBeforeVnd: prevBalance,
      balanceAfterVnd: newBalance,
      depositRequestId: requestId,
      idempotencyKey: cleanKey || requestId,
      actorUid: "system",
      actorName: "H\u1EC7 th\u1ED1ng t\u1EF1 \u0111\u1ED9ng duy\u1EC7t",
      note: bonusVnd > 0 ? `N\u1EA1p ti\u1EC1n t\u1EF1 \u0111\u1ED9ng: +${cleanAmount.toLocaleString("vi-VN")}\u0111 (+${bonusVnd.toLocaleString("vi-VN")}\u0111 th\u01B0\u1EDFng voucher ${appliedVoucher?.code}) (ch\u1EDD thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi)` : `N\u1EA1p ti\u1EC1n t\u1EF1 \u0111\u1ED9ng: +${cleanAmount.toLocaleString("vi-VN")}\u0111 (ch\u1EDD thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi)`,
      createdAt: now
    };
    await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);
    const debtEntry = {
      id: debtId,
      uid,
      studentNameSnapshot: wallet.fullName || "",
      studentClassSnapshot: wallet.currentClass || "",
      type: "manual_receivable",
      amountVnd: cleanAmount,
      collectedVnd: 0,
      allocatedVnd: 0,
      remainingVnd: cleanAmount,
      adjustedVnd: 0,
      transactionId: txId,
      status: "unpaid",
      note: `Ti\u1EC1n n\u1EA1p v\xED t\u1EF1 \u0111\u1ED9ng #${requestId} (c\u1EA7n thu ngo\xE0i \u0111\u1EDDi)`,
      createdAt: now,
      updatedAt: now
    };
    await setFirestoreRestDoc("debt_records", debtId, debtEntry);
    if (appliedVoucher) {
      const usageDoc = {
        id: usageId,
        voucherId: appliedVoucher.id,
        voucherCode: appliedVoucher.code,
        uid,
        studentName: wallet.fullName,
        studentClass: wallet.currentClass,
        type: appliedVoucher.type,
        bonusVnd,
        usedAt: now,
        context: "deposit",
        referenceId: requestId
      };
      await setFirestoreRestDoc("voucher_usages", usageId, usageDoc);
    }
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setFirestoreRestDoc("notifications", notifId, {
      id: notifId,
      recipientUid: "admin",
      title: `\u{1F4B5} H\u1ECDc sinh n\u1EA1p ti\u1EC1n: ${wallet.fullName || "H\u1ECDc sinh"} (+${cleanAmount.toLocaleString("vi-VN")}\u0111${bonusVnd > 0 ? ` +${bonusVnd.toLocaleString("vi-VN")}\u0111 KM` : ""})`,
      content: `H\u1ECDc sinh ${wallet.fullName || "H\u1ECDc sinh"} (${wallet.currentClass || "Ch\u01B0a r\xF5"}) v\u1EEBa n\u1EA1p ${cleanAmount.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED \u1EA3o${bonusVnd > 0 ? ` (\xE1p d\u1EE5ng voucher ${appliedVoucher?.code} th\u01B0\u1EDFng +${bonusVnd.toLocaleString("vi-VN")}\u0111)` : ""}. H\u1EC7 th\u1ED1ng \u0111\xE3 t\u1EF1 \u0111\u1ED9ng duy\u1EC7t & ghi n\u1EE3. Vui l\xF2ng thu ti\u1EC1n m\u1EB7t ngo\xE0i \u0111\u1EDDi!`,
      type: "system",
      read: false,
      link: "/admin/wallets",
      createdAt: now
    });
  }
  sendDiscordDepositAlert({
    studentName: wallet.fullName || "H\u1ECDc sinh",
    studentClass: wallet.currentClass || "Ch\u01B0a r\xF5",
    amountVnd: cleanAmount,
    requestId,
    uid
  }).catch((err) => {
    console.warn("[walletService] L\u1ED7i g\u1EEDi Discord webhook:", err);
  });
  return requestDoc;
}
async function checkExamAccess(uid, examId, userRole) {
  if (!examId) throw new Error("M\xE3 b\xE0i thi kh\xF4ng h\u1EE3p l\u1EC7.");
  let examData = null;
  if (adminDb2) {
    const snap = await adminDb2.collection("exams").doc(examId).get();
    if (snap.exists) examData = snap.data();
  } else {
    examData = await getFirestoreRestDoc2("exams", examId);
  }
  if (!examData) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi.");
  }
  const accessMode = examData.accessMode || "free";
  const priceVnd = sanitizeVnd(examData.priceVnd);
  const salesEnabled = examData.salesEnabled !== false;
  const isFree = accessMode === "free" || priceVnd <= 0;
  const examTitle = examData.title || "B\xE0i thi";
  if (userRole === "admin" || userRole === "super_admin") {
    return {
      hasAccess: true,
      isFree,
      unlocked: true,
      priceVnd,
      accessMode,
      salesEnabled,
      userBalance: 9999999,
      missingVnd: 0,
      canUnlock: true,
      examTitle
    };
  }
  const isPersonalRetakeExam = Boolean(
    examData.isPersonalRetake === true || examData.isRetake && examData.creatorRole === "student" || examData.isAggregatedReview === true
  );
  if (isPersonalRetakeExam) {
    const parentExamIds = [];
    if (examData.originalExamId) {
      parentExamIds.push(examData.originalExamId);
    }
    if (Array.isArray(examData.sourceExamIds)) {
      for (const sid of examData.sourceExamIds) {
        if (sid && !parentExamIds.includes(sid)) parentExamIds.push(sid);
      }
    }
    let hasPaidSource = Boolean(examData.isDerivedFromPaidExam);
    const paidSources = [];
    for (const pId of parentExamIds) {
      let pData = null;
      if (adminDb2) {
        const snap = await adminDb2.collection("exams").doc(pId).get();
        if (snap.exists) pData = snap.data();
      } else {
        pData = await getFirestoreRestDoc2("exams", pId);
      }
      if (pData) {
        const pPrice = sanitizeVnd(pData.priceVnd);
        const pMode = pData.accessMode || "free";
        if (pMode === "paid" || pPrice > 0) {
          hasPaidSource = true;
          paidSources.push({ id: pId, title: pData.title || "\u0110\u1EC1 thi g\u1ED1c", price: pPrice });
        }
      }
    }
    if (hasPaidSource && !uid) {
      return {
        hasAccess: false,
        isFree: false,
        unlocked: false,
        priceVnd: priceVnd || (paidSources[0]?.price || 0),
        accessMode: "paid",
        salesEnabled: false,
        userBalance: 0,
        missingVnd: priceVnd || (paidSources[0]?.price || 0),
        canUnlock: false,
        examTitle,
        rejectionReason: "personal_retake_unauthenticated",
        message: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 truy c\u1EADp b\xE0i l\xE0m l\u1EA1i c\xE1 nh\xE2n."
      };
    }
    const creatorUid = examData.creatorUid;
    const allowedUid = examData.allowedUid;
    const creatorUsername = examData.creatorUsername;
    if (uid && (creatorUid || allowedUid || creatorUsername)) {
      const uidMatches = Boolean(
        creatorUid && uid === creatorUid || allowedUid && uid === allowedUid
      );
      let usernameMatches = false;
      if (creatorUsername) {
        let currentUsername = "";
        if (adminDb2) {
          const uSnap = await adminDb2.collection("users").doc(uid).get();
          if (uSnap.exists) currentUsername = uSnap.data()?.username || "";
        } else {
          const uDoc = await getFirestoreRestDoc2("users", uid);
          if (uDoc) currentUsername = uDoc.username || "";
        }
        if (currentUsername && currentUsername.trim().toLowerCase() === creatorUsername.trim().toLowerCase()) {
          usernameMatches = true;
        }
      }
      if ((creatorUid || allowedUid) && !uidMatches && !usernameMatches) {
        return {
          hasAccess: false,
          isFree: false,
          unlocked: false,
          priceVnd,
          accessMode: "paid",
          salesEnabled: false,
          userBalance: 0,
          missingVnd: 0,
          canUnlock: false,
          examTitle,
          rejectionReason: "personal_retake_forbidden",
          message: "\u0110\xE2y l\xE0 b\xE0i l\xE0m l\u1EA1i c\xE1 nh\xE2n c\u1EE7a th\xED sinh kh\xE1c. B\u1EA1n kh\xF4ng th\u1EC3 s\u1EED d\u1EE5ng m\xE3 \u0111\u1EC1 ho\u1EB7c li\xEAn k\u1EBFt n\xE0y."
        };
      }
    }
    if (hasPaidSource && uid) {
      for (const p of paidSources) {
        const parentEntitlementId = `${uid}_${p.id}`;
        let parentEntitlement = null;
        if (adminDb2) {
          const peSnap = await adminDb2.collection("exam_entitlements").doc(parentEntitlementId).get();
          if (peSnap.exists) parentEntitlement = peSnap.data();
        } else {
          parentEntitlement = await getFirestoreRestDoc2("exam_entitlements", parentEntitlementId);
        }
        const isParentUnlocked = Boolean(parentEntitlement && parentEntitlement.status === "active");
        if (!isParentUnlocked) {
          const wallet2 = await getOrCreateWallet(uid);
          const userBalance2 = sanitizeVnd(wallet2.balanceVnd);
          return {
            hasAccess: false,
            isFree: false,
            unlocked: false,
            priceVnd: p.price,
            accessMode: "paid",
            salesEnabled: false,
            userBalance: userBalance2,
            missingVnd: Math.max(0, p.price - userBalance2),
            canUnlock: userBalance2 >= p.price,
            examTitle,
            parentExamId: p.id,
            parentExamTitle: p.title,
            rejectionReason: "parent_exam_locked",
            message: `B\xE0i thi \xF4n t\u1EADp/l\xE0m l\u1EA1i n\xE0y thu\u1ED9c v\u1EC1 \u0111\u1EC1 thi tr\u1EA3 ph\xED [${p.title}]. B\u1EA1n c\u1EA7n s\u1EDF h\u1EEFu \u0111\u1EC1 thi g\u1ED1c tr\u01B0\u1EDBc khi c\xF3 th\u1EC3 l\xE0m b\xE0i!`
          };
        }
      }
    }
    return {
      hasAccess: true,
      isFree: true,
      unlocked: true,
      priceVnd: 0,
      accessMode: "free",
      salesEnabled: false,
      userBalance: 0,
      missingVnd: 0,
      canUnlock: true,
      examTitle,
      parentExamId: examData.originalExamId
    };
  }
  if (isFree) {
    return {
      hasAccess: true,
      isFree: true,
      unlocked: true,
      priceVnd: 0,
      accessMode: "free",
      salesEnabled,
      userBalance: 0,
      missingVnd: 0,
      canUnlock: true,
      examTitle
    };
  }
  if (!uid) {
    return {
      hasAccess: false,
      isFree: false,
      unlocked: false,
      priceVnd,
      accessMode: "paid",
      salesEnabled,
      userBalance: 0,
      missingVnd: priceVnd,
      canUnlock: false,
      examTitle
    };
  }
  const entitlementId = `${uid}_${examId}`;
  let entitlement = null;
  if (adminDb2) {
    const entSnap = await adminDb2.collection("exam_entitlements").doc(entitlementId).get();
    if (entSnap.exists) entitlement = entSnap.data();
  } else {
    entitlement = await getFirestoreRestDoc2("exam_entitlements", entitlementId);
  }
  const isUnlocked = Boolean(entitlement && entitlement.status === "active");
  const wallet = await getOrCreateWallet(uid);
  const userBalance = sanitizeVnd(wallet.balanceVnd);
  const missingVnd = Math.max(0, priceVnd - userBalance);
  const canUnlock = userBalance >= priceVnd;
  return {
    hasAccess: isUnlocked,
    isFree: false,
    unlocked: isUnlocked,
    priceVnd,
    accessMode: "paid",
    salesEnabled,
    userBalance,
    missingVnd,
    canUnlock,
    examTitle
  };
}
async function unlockExam(uid, examId, idempotencyKey, voucherCode) {
  if (!uid) throw new Error("Ch\u01B0a \u0111\u0103ng nh\u1EADp.");
  if (!examId) throw new Error("M\xE3 b\xE0i thi kh\xF4ng h\u1EE3p l\u1EC7.");
  const entitlementId = `${uid}_${examId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (adminDb2) {
    return await adminDb2.runTransaction(async (transaction) => {
      const examRef = adminDb2.collection("exams").doc(examId);
      const examDoc = await transaction.get(examRef);
      if (!examDoc.exists) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi.");
      const examData2 = examDoc.data();
      const accessMode = examData2.accessMode || "free";
      const priceVnd2 = sanitizeVnd(examData2.priceVnd);
      const salesEnabled = examData2.salesEnabled !== false;
      if (accessMode === "free" || priceVnd2 <= 0) {
        const entRef2 = adminDb2.collection("exam_entitlements").doc(entitlementId);
        const freeEnt = {
          id: entitlementId,
          uid,
          examId,
          status: "active",
          source: "free_migration",
          pricePaidVnd: 0,
          grantedAt: now,
          examTitleSnapshot: examData2.title
        };
        transaction.set(entRef2, freeEnt, { merge: true });
        const wDoc = await transaction.get(adminDb2.collection("wallets").doc(uid));
        const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
        return { success: true, newBalanceVnd: bal, entitlement: freeEnt, alreadyUnlocked: true };
      }
      if (!salesEnabled) {
        throw new Error("B\xE0i thi hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng b\xE1n quy\u1EC1n truy c\u1EADp.");
      }
      const entRef = adminDb2.collection("exam_entitlements").doc(entitlementId);
      const entDoc = await transaction.get(entRef);
      if (entDoc.exists) {
        const entData = entDoc.data();
        if (entData.status === "active") {
          const wDoc = await transaction.get(adminDb2.collection("wallets").doc(uid));
          const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
          return { success: true, newBalanceVnd: bal, entitlement: entData, alreadyUnlocked: true };
        }
      }
      let discountVnd2 = 0;
      let appliedVoucher2 = null;
      if (voucherCode && String(voucherCode).trim()) {
        const vRes = await validateVoucher({
          code: String(voucherCode).trim(),
          uid,
          context: "exam_unlock",
          amountVnd: priceVnd2,
          examId
        });
        if (vRes.valid && vRes.voucher) {
          discountVnd2 = vRes.discountVnd || 0;
          appliedVoucher2 = vRes.voucher;
        } else {
          throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7 cho \u0111\u1EC1 thi n\xE0y.");
        }
      }
      const effectivePrice2 = Math.max(0, priceVnd2 - discountVnd2);
      const walletRef = adminDb2.collection("wallets").doc(uid);
      const walletDoc = await transaction.get(walletRef);
      let currentBal = 0;
      let totalSpent = 0;
      let totalCredited = 0;
      let fullName = "";
      let currentClass = "";
      if (walletDoc.exists) {
        const w = walletDoc.data();
        currentBal = sanitizeVnd(w.balanceVnd);
        totalSpent = sanitizeVnd(w.totalSpentVnd);
        totalCredited = sanitizeVnd(w.totalCreditedVnd);
        fullName = w.fullName || "";
        currentClass = w.currentClass || "";
      }
      if (currentBal < effectivePrice2) {
        throw new Error(
          `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a \u0111\u1EC1 thi. C\u1EA7n ${effectivePrice2.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${currentBal.toLocaleString("vi-VN")}\u0111 (thi\u1EBFu ${(effectivePrice2 - currentBal).toLocaleString("vi-VN")}\u0111).`
        );
      }
      const newBalance2 = currentBal - effectivePrice2;
      const newTotalSpent = totalSpent + effectivePrice2;
      transaction.set(
        walletRef,
        {
          uid,
          balanceVnd: newBalance2,
          totalSpentVnd: newTotalSpent,
          totalCreditedVnd: totalCredited,
          updatedAt: now
        },
        { merge: true }
      );
      const entitlement2 = {
        id: entitlementId,
        uid,
        examId,
        status: "active",
        source: "purchase",
        pricePaidVnd: effectivePrice2,
        transactionId: txId,
        grantedAt: now,
        grantedBy: uid,
        examTitleSnapshot: examData2.title || "B\xE0i thi"
      };
      transaction.set(entRef, entitlement2);
      const txRef = adminDb2.collection("wallet_transactions").doc(txId);
      const ledgerEntry2 = {
        id: txId,
        uid,
        type: "exam_unlock_debit",
        amountVnd: effectivePrice2,
        balanceBeforeVnd: currentBal,
        balanceAfterVnd: newBalance2,
        examId,
        examTitleSnapshot: examData2.title || "B\xE0i thi",
        idempotencyKey: idempotencyKey || txId,
        actorUid: uid,
        actorName: fullName || "Th\xED sinh",
        note: discountVnd2 > 0 ? `M\u1EDF kh\xF3a v\u0129nh vi\u1EC5n b\xE0i thi "${examData2.title}": -${effectivePrice2.toLocaleString("vi-VN")}\u0111 (\u0111\xE3 gi\u1EA3m ${discountVnd2.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher2?.code})` : `M\u1EDF kh\xF3a v\u0129nh vi\u1EC5n b\xE0i thi "${examData2.title}": -${effectivePrice2.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      };
      transaction.set(txRef, ledgerEntry2);
      if (appliedVoucher2) {
        const vRef = adminDb2.collection("vouchers").doc(appliedVoucher2.id);
        const vSnap = await transaction.get(vRef);
        if (vSnap.exists) {
          const vData = vSnap.data();
          transaction.update(vRef, {
            usedCount: (vData.usedCount || 0) + 1,
            updatedAt: now
          });
        }
        const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const usageRef = adminDb2.collection("voucher_usages").doc(usageId);
        transaction.set(usageRef, {
          id: usageId,
          voucherId: appliedVoucher2.id,
          voucherCode: appliedVoucher2.code,
          uid,
          studentName: fullName,
          studentClass: currentClass,
          type: appliedVoucher2.type,
          discountVnd: discountVnd2,
          usedAt: now,
          context: "exam_unlock",
          referenceId: examId
        });
      }
      return {
        success: true,
        newBalanceVnd: newBalance2,
        entitlement: entitlement2
      };
    });
  }
  const examData = await getFirestoreRestDoc2("exams", examId);
  if (!examData) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi.");
  const priceVnd = sanitizeVnd(examData.priceVnd);
  const existingEnt = await getFirestoreRestDoc2("exam_entitlements", entitlementId);
  if (existingEnt && existingEnt.status === "active") {
    const w = await getOrCreateWallet(uid);
    return { success: true, newBalanceVnd: w.balanceVnd, entitlement: existingEnt, alreadyUnlocked: true };
  }
  let discountVnd = 0;
  let appliedVoucher = null;
  if (voucherCode && String(voucherCode).trim()) {
    const vRes = await validateVoucher({
      code: String(voucherCode).trim(),
      uid,
      context: "exam_unlock",
      amountVnd: priceVnd,
      examId
    });
    if (vRes.valid && vRes.voucher) {
      discountVnd = vRes.discountVnd || 0;
      appliedVoucher = vRes.voucher;
    }
  }
  const effectivePrice = Math.max(0, priceVnd - discountVnd);
  const wallet = await getOrCreateWallet(uid);
  if (wallet.balanceVnd < effectivePrice) {
    throw new Error(`S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a \u0111\u1EC1 thi.`);
  }
  const newBalance = wallet.balanceVnd - effectivePrice;
  await setFirestoreRestDoc("wallets", uid, {
    ...wallet,
    balanceVnd: newBalance,
    totalSpentVnd: wallet.totalSpentVnd + effectivePrice,
    updatedAt: now
  });
  const entitlement = {
    id: entitlementId,
    uid,
    examId,
    status: "active",
    source: "purchase",
    pricePaidVnd: effectivePrice,
    transactionId: txId,
    grantedAt: now,
    grantedBy: uid,
    examTitleSnapshot: examData.title
  };
  await setFirestoreRestDoc("exam_entitlements", entitlementId, entitlement);
  const ledgerEntry = {
    id: txId,
    uid,
    type: "exam_unlock_debit",
    amountVnd: effectivePrice,
    balanceBeforeVnd: wallet.balanceVnd,
    balanceAfterVnd: newBalance,
    examId,
    examTitleSnapshot: examData.title,
    actorUid: uid,
    note: discountVnd > 0 ? `M\u1EDF kh\xF3a \u0111\u1EC1 thi "${examData.title}" (-${effectivePrice.toLocaleString("vi-VN")}\u0111, gi\u1EA3m ${discountVnd.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher?.code})` : `M\u1EDF kh\xF3a \u0111\u1EC1 thi "${examData.title}"`,
    createdAt: now
  };
  await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);
  if (appliedVoucher) {
    const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setFirestoreRestDoc("voucher_usages", usageId, {
      id: usageId,
      voucherId: appliedVoucher.id,
      voucherCode: appliedVoucher.code,
      uid,
      studentName: wallet.fullName,
      studentClass: wallet.currentClass,
      type: appliedVoucher.type,
      discountVnd,
      usedAt: now,
      context: "exam_unlock",
      referenceId: examId
    });
  }
  return { success: true, newBalanceVnd: newBalance, entitlement };
}
async function getStudentTransactions(uid, limitCount = 30) {
  if (adminDb2) {
    const snap = await adminDb2.collection("wallet_transactions").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limitCount).get();
    return snap.docs.map((d) => d.data());
  }
  const docs = await getFirestoreRestDocs("wallet_transactions", 100);
  const filtered = docs.filter((d) => d.uid === uid);
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return filtered.slice(0, limitCount);
}
async function getStudentDepositRequests(uid, limitCount = 30) {
  if (adminDb2) {
    const snap = await adminDb2.collection("deposit_requests").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limitCount).get();
    return snap.docs.map((d) => d.data());
  }
  const docs = await getFirestoreRestDocs("deposit_requests", 100);
  const filtered = docs.filter((d) => d.uid === uid);
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return filtered.slice(0, limitCount);
}
async function getStudentUnpaidDebt(uid) {
  if (!uid) return { totalDebtVnd: 0, unpaidCount: 0, records: [] };
  const cleanUid = uid.trim();
  let debts = [];
  if (adminDb2) {
    const snap = await adminDb2.collection("debt_records").where("uid", "==", cleanUid).get();
    debts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else {
    const docs = await getFirestoreRestDocs("debt_records", 200);
    debts = docs.filter((d) => d.uid === cleanUid);
  }
  const unpaid = debts.filter(
    (d) => d.status === "unpaid" || d.status === "partial" || d.remainingVnd && d.remainingVnd > 0
  );
  unpaid.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const totalDebtVnd = unpaid.reduce((sum, d) => sum + Math.max(0, sanitizeVnd(d.remainingVnd ?? d.amountVnd)), 0);
  return {
    totalDebtVnd,
    unpaidCount: unpaid.length,
    records: unpaid
  };
}

// server/routes/walletRoutes.ts
var walletRouter = Router();
walletRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});
walletRouter.get("/exams/:examId/access", async (req, res) => {
  try {
    const examId = req.params.examId;
    const authHeader = req.headers.authorization;
    let uid = null;
    let role = void 0;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      if (token) {
        const configuredAdminKey = process.env.ADMIN_SECRET_KEY || process.env.DK_ADMIN_MASTER_KEY || "dk_admin_master_secret_2026";
        if (token === configuredAdminKey || token.startsWith("dk_admin_")) {
          uid = "admin_master";
          role = "admin";
        } else {
          try {
            if (adminAuth) {
              const decoded = await adminAuth.verifyIdToken(token);
              uid = decoded.uid;
              role = decoded.role || (decoded.admin ? "admin" : "student");
            } else {
              const parts = token.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
                uid = payload.user_id || payload.sub || null;
                role = payload.role || void 0;
              }
            }
          } catch (e) {
          }
        }
      }
    }
    if (!uid) {
      const headerUid = req.headers["x-student-uid"]?.trim();
      const queryUid = req.query.studentUid?.trim();
      const headerUsername = req.headers["x-student-username"]?.trim();
      const queryUsername = req.query.studentUsername?.trim();
      if (headerUid || queryUid) {
        uid = headerUid || queryUid;
        role = role || "student";
      } else if (headerUsername || queryUsername) {
        const uName = (headerUsername || queryUsername).toLowerCase();
        if (adminDb) {
          try {
            const uSnap = await adminDb.collection("usernames").doc(uName).get();
            if (uSnap.exists && uSnap.data()?.uid) {
              uid = uSnap.data().uid;
            } else {
              const uQuery = await adminDb.collection("users").where("usernameNormalized", "==", uName).limit(1).get();
              if (!uQuery.empty) {
                uid = uQuery.docs[0].id;
              } else {
                uid = uName;
              }
            }
          } catch (_) {
            uid = uName;
          }
        } else {
          try {
            const uDoc = await getFirestoreRestDoc("usernames", uName);
            if (uDoc?.uid) {
              uid = uDoc.uid;
            } else {
              uid = uName;
            }
          } catch (_) {
            uid = uName;
          }
        }
        role = role || "student";
      }
    }
    const result = await checkExamAccess(uid, examId, role);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: "access_check_error", message: err.message || String(err) });
  }
});
walletRouter.get("/wallet/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const wallet = await getOrCreateWallet(uid, {
      fullName: req.user.displayName
    });
    return res.json({ success: true, wallet });
  } catch (err) {
    return res.status(500).json({ error: "wallet_error", message: err.message || String(err) });
  }
});
walletRouter.patch("/wallet/me/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { fullName, currentClass } = req.body || {};
    if (!fullName || !currentClass) {
      return res.status(400).json({
        error: "missing_fields",
        message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 h\u1ECD t\xEAn v\xE0 l\u1EDBp h\u1ECDc."
      });
    }
    const updated = await updateWalletProfile(uid, { fullName, currentClass });
    return res.json({ success: true, wallet: updated });
  } catch (err) {
    return res.status(400).json({ error: "profile_update_error", message: err.message || String(err) });
  }
});
walletRouter.get("/wallet/debt", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const debtSummary = await getStudentUnpaidDebt(uid);
    return res.json({ success: true, ...debtSummary });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
walletRouter.post("/wallet/deposit-requests", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { amountVnd, idempotencyKey, voucherCode } = req.body || {};
    const depositRequest = await createDepositRequest(uid, Number(amountVnd), idempotencyKey, voucherCode);
    return res.status(201).json({ success: true, depositRequest });
  } catch (err) {
    return res.status(400).json({ error: "deposit_request_error", message: err.message || String(err) });
  }
});
walletRouter.get("/wallet/deposit-requests", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const requests = await getStudentDepositRequests(uid);
    return res.json({ success: true, items: requests });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
walletRouter.get("/wallet/transactions", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const transactions = await getStudentTransactions(uid);
    return res.json({ success: true, items: transactions });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
walletRouter.post("/exams/:examId/unlock", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const examId = req.params.examId;
    const { idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockExam(uid, examId, idempotencyKey, voucherCode);
    return res.json({
      success: true,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
      message: result.alreadyUnlocked ? "\u0110\u1EC1 thi \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a tr\u01B0\u1EDBc \u0111\xF3." : "M\u1EDF kh\xF3a \u0111\u1EC1 thi v\u0129nh vi\u1EC5n th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "unlock_error", message: msg });
  }
});
walletRouter.post("/vouchers/validate", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { code, context, amountVnd, examId } = req.body || {};
    const result = await validateVoucher({
      code: String(code || "").trim(),
      uid,
      context: context || "exam_unlock",
      amountVnd: Number(amountVnd || 0),
      examId
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: "voucher_validate_error", message: err.message || String(err) });
  }
});
walletRouter.post("/vouchers/redeem-gift", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ error: "missing_code", message: "Vui l\xF2ng nh\u1EADp m\xE3 voucher qu\xE0 t\u1EB7ng." });
    }
    const result = await redeemGiftVoucher(String(code).trim(), uid);
    return res.json({
      success: true,
      message: `Nh\u1EADp m\xE3 qu\xE0 t\u1EB7ng th\xE0nh c\xF4ng! B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c +${result.addedVnd.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED.`,
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "redeem_error", message: err.message || String(err) });
  }
});
export {
  walletRouter
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Voucher & Promotion Service (DkTEST)
 * Supports:
 * 1. gift_money: Nhập mã nhận tiền trực tiếp vào ví
 * 2. discount_percent: Giảm giá mở khóa đề theo %
 * 3. discount_fixed: Giảm giá mở khóa đề theo số tiền cố định (VNĐ)
 * 4. deposit_bonus_percent: Thưởng nạp tiền theo %
 * 5. deposit_bonus_fixed: Thưởng nạp tiền cố định (VNĐ)
 */
