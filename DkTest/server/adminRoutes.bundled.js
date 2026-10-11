var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/routes/adminRoutes.ts
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
var { adminApp, adminAuth, adminDb, isConfigured } = initFirebaseAdmin();
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
async function getFirestoreRestDoc(collectionName, docId, useCache = true, cacheTtlMs = 3e4) {
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
async function deleteFirestoreRestDoc(collectionName, docId) {
  const apiKey = getFirebaseApiKey();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;
    const res = await fetch(url, { method: "DELETE" });
    clearServerRestCache(collectionName);
    console.log(`[Server Firestore DELETE: 1 doc] Doc: "${collectionName}/${docId}" | Status: ${res.status}`);
    return res.ok;
  } catch (err) {
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
    if (adminAuth) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
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
async function requireAdmin(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      checkAdminPermission(req, res, next);
    });
  }
  return checkAdminPermission(req, res, next);
}
function checkAdminPermission(req, res, next) {
  const role = req.user?.role;
  if (role === "admin" || role === "super_admin") {
    return next();
  }
  return res.status(403).json({
    error: "permission_denied",
    message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB \u0111\u1EC3 th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
  });
}
async function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return requireAuth(req, res, () => {
      if (req.user?.role === "super_admin" || req.user?.role === "admin") {
        return next();
      }
      return res.status(403).json({
        error: "permission_denied",
        message: "Ch\u1EC9 Super Admin m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
      });
    });
  }
  if (req.user.role === "super_admin" || req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    error: "permission_denied",
    message: "Ch\u1EC9 Super Admin m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
  });
}

// server/services/voucherService.ts
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
async function getVouchersList() {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection("vouchers").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const snap = await adminDb.collection("vouchers").get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }
}
async function createVoucher(data) {
  if (!adminDb) throw new Error("Database not connected");
  const code = normalizeCode(data.code || "");
  if (!code || code.length < 3) {
    throw new Error("M\xE3 voucher ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 3 k\xFD t\u1EF1 (ch\u1EEF ho\u1EB7c s\u1ED1).");
  }
  const existing = await adminDb.collection("vouchers").where("code", "==", code).limit(1).get();
  if (!existing.empty) {
    throw new Error(`M\xE3 voucher "${code}" \u0111\xE3 t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng.`);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = `vouch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const voucher = {
    id,
    code,
    name: data.name?.trim() || `Voucher ${code}`,
    type: data.type || "discount_fixed",
    value: Math.max(0, Number(data.value) || 0),
    maxDiscountVnd: data.maxDiscountVnd ? Math.max(0, Number(data.maxDiscountVnd)) : void 0,
    minOrderVnd: data.minOrderVnd ? Math.max(0, Number(data.minOrderVnd)) : 0,
    minDepositVnd: data.minDepositVnd ? Math.max(0, Number(data.minDepositVnd)) : 0,
    usageLimit: data.usageLimit !== void 0 ? Math.max(0, Number(data.usageLimit)) : 0,
    usedCount: 0,
    perUserLimit: data.perUserLimit !== void 0 ? Math.max(1, Number(data.perUserLimit)) : 1,
    expiresAt: data.expiresAt || null,
    isActive: data.isActive !== void 0 ? Boolean(data.isActive) : true,
    createdAt: now,
    updatedAt: now
  };
  await adminDb.collection("vouchers").doc(id).set(voucher);
  return voucher;
}
async function updateVoucher(id, data) {
  if (!adminDb) throw new Error("Database not connected");
  const docRef = adminDb.collection("vouchers").doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y voucher y\xEAu c\u1EA7u.");
  }
  const current = snap.data();
  const updates = {
    ...data,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (data.code) {
    updates.code = normalizeCode(data.code);
  }
  await docRef.set(updates, { merge: true });
  const updatedSnap = await docRef.get();
  return { id, ...updatedSnap.data() };
}
async function deleteVoucher(id) {
  if (!adminDb) throw new Error("Database not connected");
  await adminDb.collection("vouchers").doc(id).delete();
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
  if (adminDb) {
    const walletRef = adminDb.collection("wallets").doc(cleanUid);
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
      const uDoc = await adminDb.collection("users").doc(cleanUid).get();
      if (uDoc.exists) {
        const uData = uDoc.data();
        defaultName = defaultName || uData?.fullName || uData?.displayName || "";
        defaultClass = defaultClass || uData?.studentClass || "";
        if (uData?.username) altDocId = uData.username;
      } else {
        const unSnap = await adminDb.collection("usernames").doc(cleanUid.toLowerCase()).get();
        if (unSnap.exists && unSnap.data()?.uid) {
          altDocId = unSnap.data().uid;
        }
      }
    } catch (_) {
    }
    if (altDocId && altDocId !== cleanUid) {
      try {
        const altSnap = await adminDb.collection("wallets").doc(altDocId).get();
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
  const existing = await getFirestoreRestDoc("wallets", cleanUid);
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
    const uDoc = await getFirestoreRestDoc("users", cleanUid);
    if (uDoc) {
      restDefaultName = restDefaultName || uDoc.fullName || uDoc.displayName || "";
      restDefaultClass = restDefaultClass || uDoc.studentClass || "";
      if (uDoc.username) altDocIdRest = uDoc.username;
    } else {
      const unDoc = await getFirestoreRestDoc("usernames", cleanUid.toLowerCase());
      if (unDoc?.uid) altDocIdRest = unDoc.uid;
    }
  } catch (_) {
  }
  if (altDocIdRest && altDocIdRest !== cleanUid) {
    try {
      const altExisting = await getFirestoreRestDoc("wallets", altDocIdRest);
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
      if (adminDb) {
        await adminDb.collection("deposit_requests").doc(req.id).set(approvedReq, { merge: true });
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
      if (adminDb) {
        await adminDb.collection("wallet_transactions").doc(txId).set(ledgerEntry);
        await adminDb.collection("debt_records").doc(debtId).set(debtEntry);
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
      if (adminDb) {
        await adminDb.collection("wallets").doc(uid).set(updatedWallet, { merge: true });
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
async function approveDepositRequest(requestId, adminUid, adminName, externalCollectionNote) {
  if (!requestId) throw new Error("M\xE3 y\xEAu c\u1EA7u n\u1EA1p kh\xF4ng h\u1EE3p l\u1EC7.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (adminDb) {
    return await adminDb.runTransaction(async (transaction) => {
      const reqRef = adminDb.collection("deposit_requests").doc(requestId);
      const reqDoc = await transaction.get(reqRef);
      if (!reqDoc.exists) {
        throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u n\u1EA1p ti\u1EC1n.");
      }
      const reqData2 = reqDoc.data();
      if (reqData2.status === "approved") {
        const wDoc = await transaction.get(adminDb.collection("wallets").doc(reqData2.uid));
        const currentBal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
        return { success: true, newBalanceVnd: currentBal, transactionId: "" };
      }
      if (reqData2.status !== "pending") {
        throw new Error(`Y\xEAu c\u1EA7u n\u1EA1p kh\xF4ng th\u1EC3 duy\u1EC7t (tr\u1EA1ng th\xE1i hi\u1EC7n t\u1EA1i: ${reqData2.status}).`);
      }
      const amount2 = sanitizeVnd(reqData2.amountVnd);
      const walletRef = adminDb.collection("wallets").doc(reqData2.uid);
      const walletDoc = await transaction.get(walletRef);
      let prevBalance = 0;
      let totalCredited = 0;
      let totalSpent = 0;
      let fullName = reqData2.studentNameSnapshot || "";
      let currentClass = reqData2.studentClassSnapshot || "";
      if (walletDoc.exists) {
        const wData = walletDoc.data();
        prevBalance = sanitizeVnd(wData.balanceVnd);
        totalCredited = sanitizeVnd(wData.totalCreditedVnd);
        totalSpent = sanitizeVnd(wData.totalSpentVnd);
        fullName = wData.fullName || fullName;
        currentClass = wData.currentClass || currentClass;
      }
      const newBalance2 = prevBalance + amount2;
      const newTotalCredited = totalCredited + amount2;
      transaction.set(
        walletRef,
        {
          uid: reqData2.uid,
          balanceVnd: newBalance2,
          totalCreditedVnd: newTotalCredited,
          totalSpentVnd: totalSpent,
          profileCompleted: true,
          fullName,
          currentClass,
          updatedAt: now
        },
        { merge: true }
      );
      transaction.update(reqRef, {
        status: "approved",
        processedAt: now,
        processedBy: adminUid,
        processedByName: adminName,
        externalCollectionNote: externalCollectionNote || "Admin x\xE1c nh\u1EADn \u0111\xE3 thu ti\u1EC1n ngo\xE0i \u0111\u1EDDi."
      });
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const ledgerEntry2 = {
        id: txId,
        uid: reqData2.uid,
        type: "deposit_credit",
        amountVnd: amount2,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance2,
        depositRequestId: requestId,
        idempotencyKey: requestId,
        actorUid: adminUid,
        actorName: adminName,
        note: `N\u1EA1p ti\u1EC1n \u1EA3o qua y\xEAu c\u1EA7u #${requestId}: +${amount2.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      };
      transaction.set(txRef, ledgerEntry2);
      return {
        success: true,
        newBalanceVnd: newBalance2,
        transactionId: txId
      };
    });
  }
  const reqData = await getFirestoreRestDoc("deposit_requests", requestId);
  if (!reqData) throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u n\u1EA1p ti\u1EC1n.");
  if (reqData.status === "approved") {
    const w = await getOrCreateWallet(reqData.uid);
    return { success: true, newBalanceVnd: w.balanceVnd, transactionId: "" };
  }
  if (reqData.status !== "pending") {
    throw new Error(`Y\xEAu c\u1EA7u n\u1EA1p kh\xF4ng th\u1EC3 duy\u1EC7t (tr\u1EA1ng th\xE1i: ${reqData.status}).`);
  }
  const amount = sanitizeVnd(reqData.amountVnd);
  const wallet = await getOrCreateWallet(reqData.uid);
  const newBalance = wallet.balanceVnd + amount;
  await setFirestoreRestDoc("wallets", reqData.uid, {
    ...wallet,
    balanceVnd: newBalance,
    totalCreditedVnd: wallet.totalCreditedVnd + amount,
    updatedAt: now
  });
  await setFirestoreRestDoc("deposit_requests", requestId, {
    ...reqData,
    status: "approved",
    processedAt: now,
    processedBy: adminUid,
    processedByName: adminName,
    externalCollectionNote: externalCollectionNote || "Admin x\xE1c nh\u1EADn thu ti\u1EC1n"
  });
  const ledgerEntry = {
    id: txId,
    uid: reqData.uid,
    type: "deposit_credit",
    amountVnd: amount,
    balanceBeforeVnd: wallet.balanceVnd,
    balanceAfterVnd: newBalance,
    depositRequestId: requestId,
    idempotencyKey: requestId,
    actorUid: adminUid,
    actorName: adminName,
    note: `N\u1EA1p ti\u1EC1n \u1EA3o qua y\xEAu c\u1EA7u #${requestId}: +${amount.toLocaleString("vi-VN")}\u0111`,
    createdAt: now
  };
  await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);
  return { success: true, newBalanceVnd: newBalance, transactionId: txId };
}
async function rejectDepositRequest(requestId, adminUid, adminName, reason) {
  if (!requestId) throw new Error("M\xE3 y\xEAu c\u1EA7u n\u1EA1p kh\xF4ng h\u1EE3p l\u1EC7.");
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Vui l\xF2ng nh\u1EADp l\xFD do t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (adminDb) {
    const reqRef = adminDb.collection("deposit_requests").doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u n\u1EA1p.");
    const data2 = snap.data();
    if (data2.status !== "pending") {
      throw new Error(`Kh\xF4ng th\u1EC3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u \u1EDF tr\u1EA1ng th\xE1i "${data2.status}".`);
    }
    const updates = {
      status: "rejected",
      rejectionReason: cleanReason,
      processedAt: now,
      processedBy: adminUid,
      processedByName: adminName
    };
    await reqRef.update(updates);
    return { ...data2, ...updates };
  }
  const data = await getFirestoreRestDoc("deposit_requests", requestId);
  if (!data) throw new Error("Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u n\u1EA1p.");
  if (data.status !== "pending") {
    throw new Error(`Kh\xF4ng th\u1EC3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u \u1EDF tr\u1EA1ng th\xE1i "${data.status}".`);
  }
  const updated = {
    ...data,
    status: "rejected",
    rejectionReason: cleanReason,
    processedAt: now,
    processedBy: adminUid,
    processedByName: adminName
  };
  await setFirestoreRestDoc("deposit_requests", requestId, updated);
  return updated;
}
async function recordManualCashCollection(adminUid, adminName, studentUid, data) {
  const amount = sanitizeVnd(data.amountVnd);
  if (amount <= 0) throw new Error("S\u1ED1 ti\u1EC1n thu ph\u1EA3i l\u1EDBn h\u01A1n 0\u0111.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const collDate = data.collectionDate || now;
  const paymentMethod = data.paymentMethod || "Ti\u1EC1n m\u1EB7t";
  const note = String(data.note || "").trim();
  const wallet = await getOrCreateWallet(studentUid);
  const recordId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (adminDb) {
    const receivablesSnap = await adminDb.collection("debt_records").where("uid", "==", studentUid).get();
    const unpaidDocs = receivablesSnap.docs.filter((d) => {
      const status = d.data().status;
      return status === "unpaid" || status === "partial";
    }).sort((a, b) => {
      const tA = new Date(a.data().createdAt || 0).getTime();
      const tB = new Date(b.data().createdAt || 0).getTime();
      return tA - tB;
    });
    let remainingToAllocate2 = amount;
    const batch = adminDb.batch();
    for (const doc of unpaidDocs) {
      if (remainingToAllocate2 <= 0) break;
      const rec = doc.data();
      const currentRemaining = sanitizeVnd(rec.remainingVnd);
      if (currentRemaining <= 0) continue;
      const allocation = Math.min(remainingToAllocate2, currentRemaining);
      const newRemaining = currentRemaining - allocation;
      const newCollected = sanitizeVnd(rec.collectedVnd) + allocation;
      const newStatus = newRemaining === 0 ? "paid" : "partial";
      batch.update(doc.ref, {
        collectedVnd: newCollected,
        remainingVnd: newRemaining,
        status: newStatus,
        updatedAt: now
      });
      remainingToAllocate2 -= allocation;
    }
    let newBal2 = wallet.balanceVnd;
    if (data.creditToWallet) {
      newBal2 = wallet.balanceVnd + amount;
      const walletRef = adminDb.collection("wallets").doc(studentUid);
      batch.update(walletRef, {
        balanceVnd: newBal2,
        totalCreditedVnd: sanitizeVnd(wallet.totalCreditedVnd) + amount,
        updatedAt: now
      });
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txEntry = {
        id: txId,
        uid: studentUid,
        type: "deposit_credit",
        amountVnd: amount,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: newBal2,
        actorUid: adminUid,
        actorName: adminName,
        note: `Thu ti\u1EC1n th\u1EF1c t\u1EBF (${paymentMethod}): +${amount.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED. ${note}`,
        createdAt: now
      };
      batch.set(txRef, txEntry);
    } else {
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txEntry = {
        id: txId,
        uid: studentUid,
        type: "debt_payment",
        amountVnd: amount,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: wallet.balanceVnd,
        actorUid: adminUid,
        actorName: adminName,
        note: `Ghi nh\u1EADn thu ti\u1EC1n ngo\xE0i \u0111\u1EDDi (${paymentMethod}): ${amount.toLocaleString("vi-VN")}\u0111. ${note}`,
        createdAt: now
      };
      batch.set(txRef, txEntry);
    }
    const debtRef = adminDb.collection("debt_records").doc(recordId);
    const debtEntry2 = {
      id: recordId,
      uid: studentUid,
      studentNameSnapshot: wallet.fullName || "",
      studentClassSnapshot: wallet.currentClass || "",
      type: "manual_receivable",
      amountVnd: amount,
      collectedVnd: amount,
      allocatedVnd: amount - remainingToAllocate2,
      remainingVnd: 0,
      adjustedVnd: 0,
      transactionId: txId,
      status: "paid",
      note: `Ghi nh\u1EADn thu tr\u1EF1c ti\u1EBFp: ${paymentMethod}${data.referenceCode ? ` (M\xE3: ${data.referenceCode})` : ""}. ${note}`,
      createdAt: collDate,
      updatedAt: now
    };
    batch.set(debtRef, debtEntry2);
    await batch.commit();
    return { success: true, debtRecordId: recordId, newBalanceVnd: newBal2 };
  }
  const allDebts = await getFirestoreRestDocs("debt_records", 100);
  const studentDebts = allDebts.filter((d) => d.uid === studentUid && (d.status === "unpaid" || d.status === "partial"));
  studentDebts.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  let remainingToAllocate = amount;
  for (const debt of studentDebts) {
    if (remainingToAllocate <= 0) break;
    const debtRem = Math.max(0, sanitizeVnd(debt.remainingVnd));
    if (debtRem <= 0) continue;
    const paymentPortion = Math.min(debtRem, remainingToAllocate);
    const newRem = debtRem - paymentPortion;
    const newCollected = sanitizeVnd(debt.collectedVnd) + paymentPortion;
    const newAllocated = sanitizeVnd(debt.allocatedVnd) + paymentPortion;
    const newStatus = newRem === 0 ? "paid" : "partial";
    await setFirestoreRestDoc("debt_records", debt.id, {
      ...debt,
      collectedVnd: newCollected,
      allocatedVnd: newAllocated,
      remainingVnd: newRem,
      status: newStatus,
      updatedAt: now
    });
    remainingToAllocate -= paymentPortion;
  }
  let newBal = wallet.balanceVnd;
  if (data.creditToWallet) {
    newBal = wallet.balanceVnd + amount;
    await setFirestoreRestDoc("wallets", studentUid, {
      ...wallet,
      balanceVnd: newBal,
      totalCreditedVnd: sanitizeVnd(wallet.totalCreditedVnd) + amount,
      updatedAt: now
    });
    const txEntry = {
      id: txId,
      uid: studentUid,
      type: "deposit_credit",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: newBal,
      actorUid: adminUid,
      actorName: adminName,
      note: `Thu ti\u1EC1n th\u1EF1c t\u1EBF (${paymentMethod}): +${amount.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED. ${note}`,
      createdAt: now
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txEntry);
  } else {
    const txEntry = {
      id: txId,
      uid: studentUid,
      type: "debt_payment",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      actorUid: adminUid,
      actorName: adminName,
      note: `Ghi nh\u1EADn thu ti\u1EC1n ngo\xE0i \u0111\u1EDDi (${paymentMethod}): ${amount.toLocaleString("vi-VN")}\u0111. ${note}`,
      createdAt: now
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txEntry);
  }
  const debtEntry = {
    id: recordId,
    uid: studentUid,
    studentNameSnapshot: wallet.fullName || "",
    studentClassSnapshot: wallet.currentClass || "",
    type: "manual_receivable",
    amountVnd: amount,
    collectedVnd: amount,
    allocatedVnd: amount - remainingToAllocate,
    remainingVnd: 0,
    adjustedVnd: 0,
    transactionId: txId,
    status: "paid",
    note: `Ghi nh\u1EADn thu tr\u1EF1c ti\u1EBFp: ${paymentMethod}${data.referenceCode ? ` (M\xE3: ${data.referenceCode})` : ""}. ${note}`,
    createdAt: collDate,
    updatedAt: now
  };
  await setFirestoreRestDoc("debt_records", recordId, debtEntry);
  return { success: true, debtRecordId: recordId, newBalanceVnd: newBal };
}
async function adjustStudentDebt(adminUid, adminName, studentUid, data) {
  const amount = sanitizeVnd(data.amountVnd);
  if (amount <= 0) throw new Error("S\u1ED1 ti\u1EC1n \u0111i\u1EC1u ch\u1EC9nh ph\u1EA3i l\u1EDBn h\u01A1n 0\u0111.");
  const reason = String(data.reason || "").trim();
  if (!reason) throw new Error("Vui l\xF2ng nh\u1EADp l\xFD do \u0111i\u1EC1u ch\u1EC9nh c\xF4ng n\u1EE3.");
  const wallet = await getOrCreateWallet(studentUid);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const recordId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (adminDb) {
    const batch = adminDb.batch();
    const debtRef = adminDb.collection("debt_records").doc(recordId);
    const debtDoc = {
      id: recordId,
      uid: studentUid,
      studentNameSnapshot: wallet.fullName || "",
      studentClassSnapshot: wallet.currentClass || "",
      type: "manual_receivable",
      amountVnd: data.type === "increase" ? amount : 0,
      collectedVnd: 0,
      allocatedVnd: 0,
      remainingVnd: data.type === "increase" ? amount : 0,
      adjustedVnd: data.type === "decrease" ? amount : 0,
      transactionId: txId,
      status: data.type === "increase" ? "unpaid" : "paid",
      note: `\u0110i\u1EC1u ch\u1EC9nh c\xF4ng n\u1EE3 (${data.type === "increase" ? "T\u0103ng n\u1EE3" : "Gi\u1EA3m n\u1EE3/Xo\xE1 n\u1EE3"}): ${reason}`,
      createdAt: now,
      updatedAt: now
    };
    batch.set(debtRef, debtDoc);
    const txRef = adminDb.collection("wallet_transactions").doc(txId);
    const txDoc = {
      id: txId,
      uid: studentUid,
      type: "debt_adjustment",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      actorUid: adminUid,
      actorName: adminName,
      note: `\u0110i\u1EC1u ch\u1EC9nh n\u1EE3 ${data.type === "increase" ? "+" : "-"}${amount.toLocaleString("vi-VN")}\u0111: ${reason}`,
      createdAt: now
    };
    batch.set(txRef, txDoc);
    await batch.commit();
  } else {
    const debtDoc = {
      id: recordId,
      uid: studentUid,
      studentNameSnapshot: wallet.fullName || "",
      studentClassSnapshot: wallet.currentClass || "",
      type: "manual_receivable",
      amountVnd: data.type === "increase" ? amount : 0,
      collectedVnd: 0,
      allocatedVnd: 0,
      remainingVnd: data.type === "increase" ? amount : 0,
      adjustedVnd: data.type === "decrease" ? amount : 0,
      transactionId: txId,
      status: data.type === "increase" ? "unpaid" : "paid",
      note: `\u0110i\u1EC1u ch\u1EC9nh c\xF4ng n\u1EE3 (${data.type === "increase" ? "T\u0103ng n\u1EE3" : "Gi\u1EA3m n\u1EE3/Xo\xE1 n\u1EE3"}): ${reason}`,
      createdAt: now,
      updatedAt: now
    };
    await setFirestoreRestDoc("debt_records", recordId, debtDoc);
    const txDoc = {
      id: txId,
      uid: studentUid,
      type: "debt_adjustment",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      actorUid: adminUid,
      actorName: adminName,
      note: `\u0110i\u1EC1u ch\u1EC9nh n\u1EE3 ${data.type === "increase" ? "+" : "-"}${amount.toLocaleString("vi-VN")}\u0111: ${reason}`,
      createdAt: now
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
  }
  return { success: true, recordId };
}
async function grantOrRevokeExamEntitlement(adminUid, adminName, studentUid, examId, action, reason) {
  if (!studentUid) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh h\u1ECDc sinh.");
  if (!examId) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh b\xE0i thi.");
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Vui l\xF2ng nh\u1EADp l\xFD do c\u1EA5p/thu h\u1ED3i quy\u1EC1n truy c\u1EADp.");
  const entitlementId = `${studentUid}_${examId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let examTitle = "B\xE0i thi";
  if (adminDb) {
    const eSnap = await adminDb.collection("exams").doc(examId).get();
    if (eSnap.exists) examTitle = eSnap.data()?.title || examTitle;
  }
  const entitlement = {
    id: entitlementId,
    uid: studentUid,
    examId,
    status: action === "grant" ? "active" : "revoked",
    source: "admin_grant",
    pricePaidVnd: 0,
    grantedAt: now,
    grantedBy: adminUid,
    examTitleSnapshot: examTitle
  };
  if (adminDb) {
    await adminDb.collection("exam_entitlements").doc(entitlementId).set(entitlement, { merge: true });
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txRef = adminDb.collection("wallet_transactions").doc(txId);
    const wallet = await getOrCreateWallet(studentUid);
    const txDoc = {
      id: txId,
      uid: studentUid,
      type: "admin_adjustment_credit",
      amountVnd: 0,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      examId,
      examTitleSnapshot: examTitle,
      actorUid: adminUid,
      actorName: adminName,
      note: `${action === "grant" ? "C\u1EA5p quy\u1EC1n truy c\u1EADp th\u1EE7 c\xF4ng" : "Thu h\u1ED3i quy\u1EC1n truy c\u1EADp"} \u0111\u1EC1 thi "${examTitle}": ${cleanReason}`,
      createdAt: now
    };
    await txRef.set(txDoc);
  } else {
    await setFirestoreRestDoc("exam_entitlements", entitlementId, entitlement);
  }
  return { success: true, entitlement };
}
async function getWalletOverview() {
  let totalWallets = 0;
  let totalVirtualBalanceVnd = 0;
  let totalConfirmedCreditedVnd = 0;
  let totalUnlockedSpendingVnd = 0;
  let pendingRequestsTotalVnd = 0;
  let pendingRequestsCount = 0;
  let totalOutstandingDebtVnd = 0;
  let studentsInDebtCount = 0;
  let recentRequests = [];
  if (adminDb) {
    const walletsSnap = await adminDb.collection("wallets").get();
    totalWallets = walletsSnap.size;
    walletsSnap.docs.forEach((doc) => {
      const w = doc.data();
      totalVirtualBalanceVnd += sanitizeVnd(w.balanceVnd);
      totalConfirmedCreditedVnd += sanitizeVnd(w.totalCreditedVnd);
      totalUnlockedSpendingVnd += sanitizeVnd(w.totalSpentVnd);
    });
    const pendingSnap = await adminDb.collection("deposit_requests").where("status", "==", "pending").get();
    pendingRequestsCount = pendingSnap.size;
    pendingSnap.docs.forEach((doc) => {
      pendingRequestsTotalVnd += sanitizeVnd(doc.data().amountVnd);
    });
    const recentSnap = await adminDb.collection("deposit_requests").orderBy("createdAt", "desc").limit(10).get();
    recentRequests = recentSnap.docs.map((d) => d.data());
    const debtsSnap = await adminDb.collection("debt_records").where("status", "in", ["unpaid", "partial"]).get();
    const studentsInDebtSet = /* @__PURE__ */ new Set();
    debtsSnap.docs.forEach((d) => {
      const rec = d.data();
      const rem = sanitizeVnd(rec.remainingVnd);
      if (rem > 0) {
        totalOutstandingDebtVnd += rem;
        studentsInDebtSet.add(rec.uid);
      }
    });
    studentsInDebtCount = studentsInDebtSet.size;
  } else {
    const [wallets, reqs, debts] = await Promise.all([
      getFirestoreRestDocs("wallets", 100),
      getFirestoreRestDocs("deposit_requests", 100),
      getFirestoreRestDocs("debt_records", 100)
    ]);
    totalWallets = wallets.length;
    wallets.forEach((w) => {
      totalVirtualBalanceVnd += sanitizeVnd(w.balanceVnd);
      totalConfirmedCreditedVnd += sanitizeVnd(w.totalCreditedVnd);
      totalUnlockedSpendingVnd += sanitizeVnd(w.totalSpentVnd);
    });
    const pendingReqs = reqs.filter((r) => r.status === "pending");
    pendingRequestsCount = pendingReqs.length;
    pendingReqs.forEach((r) => {
      pendingRequestsTotalVnd += sanitizeVnd(r.amountVnd);
    });
    const sortedReqs = [...reqs].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    recentRequests = sortedReqs.slice(0, 10);
    const studentsInDebtSet = /* @__PURE__ */ new Set();
    debts.forEach((rec) => {
      if (rec.status === "unpaid" || rec.status === "partial") {
        const rem = sanitizeVnd(rec.remainingVnd);
        if (rem > 0) {
          totalOutstandingDebtVnd += rem;
          studentsInDebtSet.add(rec.uid);
        }
      }
    });
    studentsInDebtCount = studentsInDebtSet.size;
  }
  return {
    totalWallets,
    totalVirtualBalanceVnd,
    totalConfirmedCreditedVnd,
    totalUnlockedSpendingVnd,
    pendingRequestsTotalVnd,
    pendingRequestsCount,
    totalOutstandingDebtVnd,
    studentsInDebtCount,
    recentRequests
  };
}
async function getStudentDebtSummaries(options) {
  let walletsList = [];
  let debtsList = [];
  let entsList = [];
  const userMap = /* @__PURE__ */ new Map();
  if (adminDb) {
    const [walletsSnap, debtsSnap, entsSnap, usersSnap] = await Promise.all([
      adminDb.collection("wallets").get(),
      adminDb.collection("debt_records").get(),
      adminDb.collection("exam_entitlements").where("status", "==", "active").get(),
      adminDb.collection("users").get()
    ]);
    walletsList = walletsSnap.docs.map((d) => d.data());
    debtsList = debtsSnap.docs.map((d) => d.data());
    entsList = entsSnap.docs.map((d) => d.data());
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      userMap.set(d.id, {
        username: u.username || "",
        email: u.email || "",
        displayName: u.displayName || u.fullName || ""
      });
    });
  } else {
    const [wallets, debts, ents, users] = await Promise.all([
      getFirestoreRestDocs("wallets", 100),
      getFirestoreRestDocs("debt_records", 100),
      getFirestoreRestDocs("exam_entitlements", 100),
      getFirestoreRestDocs("users", 100)
    ]);
    walletsList = wallets;
    debtsList = debts;
    entsList = ents.filter((e) => e.status === "active");
    users.forEach((u) => {
      const uid = u.id || u.uid;
      if (uid) {
        userMap.set(uid, {
          username: u.username || "",
          email: u.email || "",
          displayName: u.displayName || u.fullName || ""
        });
      }
    });
  }
  const debtByUid = /* @__PURE__ */ new Map();
  debtsList.forEach((rec) => {
    const uid = rec.uid;
    if (!debtByUid.has(uid)) {
      debtByUid.set(uid, { totalReceivable: 0, totalCollected: 0, remainingDebt: 0 });
    }
    const curr = debtByUid.get(uid);
    curr.totalReceivable += sanitizeVnd(rec.amountVnd);
    curr.totalCollected += sanitizeVnd(rec.collectedVnd);
    curr.remainingDebt += Math.max(0, sanitizeVnd(rec.remainingVnd));
  });
  const unlocksByUid = /* @__PURE__ */ new Map();
  entsList.forEach((d) => {
    const uid = d.uid;
    unlocksByUid.set(uid, (unlocksByUid.get(uid) || 0) + 1);
  });
  let summaries = [];
  walletsList.forEach((w) => {
    const debtInfo = debtByUid.get(w.uid) || {
      totalReceivable: 0,
      totalCollected: 0,
      remainingDebt: 0
    };
    let debtStatus = "paid";
    if (debtInfo.remainingDebt > 0) {
      debtStatus = "in_debt";
    } else if (w.balanceVnd > 0) {
      debtStatus = "has_credit";
    }
    const userInfo = userMap.get(w.uid);
    summaries.push({
      uid: w.uid,
      fullName: w.fullName || userInfo?.displayName || "Ch\u01B0a c\u1EADp nh\u1EADt",
      studentClass: w.currentClass || "\u2014",
      currentClass: w.currentClass || "\u2014",
      username: userInfo?.username || "",
      email: userInfo?.email || "",
      verifiedName: w.verifiedName || w.fullName || "",
      isVerified: Boolean(w.isVerified),
      balanceVnd: sanitizeVnd(w.balanceVnd),
      totalReceivableVnd: debtInfo.totalReceivable,
      totalReceivablesVnd: debtInfo.totalReceivable,
      totalCollectedVnd: debtInfo.totalCollected,
      totalAdjustmentsVnd: 0,
      totalAdjustedVnd: 0,
      remainingDebtVnd: debtInfo.remainingDebt,
      totalPurchasesCount: unlocksByUid.get(w.uid) || 0,
      debtStatus,
      lastActivityAt: w.updatedAt || w.createdAt
    });
  });
  if (options?.className && options.className !== "all") {
    summaries = summaries.filter(
      (s) => s.studentClass.toLowerCase() === options.className?.toLowerCase()
    );
  }
  if (options?.filterStatus && options.filterStatus !== "all") {
    summaries = summaries.filter((s) => s.debtStatus === options.filterStatus);
  }
  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    summaries = summaries.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.username && s.username.toLowerCase().includes(q) || s.verifiedName && s.verifiedName.toLowerCase().includes(q) || s.studentClass.toLowerCase().includes(q) || s.uid.toLowerCase().includes(q)
    );
  }
  summaries.sort((a, b) => {
    if (b.remainingDebtVnd !== a.remainingDebtVnd) {
      return b.remainingDebtVnd - a.remainingDebtVnd;
    }
    return b.balanceVnd - a.balanceVnd;
  });
  const total = summaries.length;
  const offset = options?.offset || 0;
  const limitCount = options?.limit || 50;
  const paged = summaries.slice(offset, offset + limitCount);
  return { items: paged, total };
}
async function getStudentWalletDetails(studentUid) {
  if (!studentUid) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh h\u1ECDc sinh.");
  const wallet = await getOrCreateWallet(studentUid);
  let transactions = [];
  let depositRequests = [];
  let entitlements = [];
  let debtRecords = [];
  let studentProfile = null;
  if (adminDb) {
    const [txSnap, reqSnap, entSnap, debtSnap, uDoc, sDoc] = await Promise.all([
      adminDb.collection("wallet_transactions").where("uid", "==", studentUid).orderBy("createdAt", "desc").limit(50).get(),
      adminDb.collection("deposit_requests").where("uid", "==", studentUid).orderBy("createdAt", "desc").limit(50).get(),
      adminDb.collection("exam_entitlements").where("uid", "==", studentUid).orderBy("grantedAt", "desc").limit(50).get(),
      adminDb.collection("debt_records").where("uid", "==", studentUid).orderBy("createdAt", "desc").limit(50).get(),
      adminDb.collection("users").doc(studentUid).get(),
      adminDb.collection("students").doc(studentUid).get()
    ]);
    transactions = txSnap.docs.map((d) => d.data());
    depositRequests = reqSnap.docs.map((d) => d.data());
    entitlements = entSnap.docs.map((d) => d.data());
    debtRecords = debtSnap.docs.map((d) => d.data());
    const uData = uDoc.exists ? uDoc.data() : null;
    const sData = sDoc.exists ? sDoc.data() : null;
    studentProfile = {
      uid: studentUid,
      username: uData?.username || sData?.username || "",
      displayName: uData?.displayName || uData?.fullName || sData?.displayName || wallet.fullName || "",
      email: uData?.email || sData?.email || "",
      phone: uData?.phone || sData?.phone || "",
      studentClass: uData?.studentClass || sData?.studentClass || wallet.currentClass || "",
      school: sData?.school || uData?.school || "",
      avatarUrl: uData?.photoURL || uData?.avatarUrl || sData?.avatarUrl || "",
      role: uData?.role || "student",
      status: uData?.status || "active",
      createdAt: uData?.createdAt || sData?.createdAt || wallet.createdAt,
      lastActive: uData?.lastLogin || uData?.updatedAt || wallet.updatedAt
    };
  } else {
    const [allTxs, allReqs, allEnts, allDebts, uData, sData] = await Promise.all([
      getFirestoreRestDocs("wallet_transactions", 100),
      getFirestoreRestDocs("deposit_requests", 100),
      getFirestoreRestDocs("exam_entitlements", 100),
      getFirestoreRestDocs("debt_records", 100),
      getFirestoreRestDoc("users", studentUid),
      getFirestoreRestDoc("students", studentUid)
    ]);
    transactions = allTxs.filter((t) => t.uid === studentUid).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 50);
    depositRequests = allReqs.filter((r) => r.uid === studentUid).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 50);
    entitlements = allEnts.filter((e) => e.uid === studentUid).sort((a, b) => new Date(b.grantedAt || 0).getTime() - new Date(a.grantedAt || 0).getTime()).slice(0, 50);
    debtRecords = allDebts.filter((d) => d.uid === studentUid).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 50);
    studentProfile = {
      uid: studentUid,
      username: uData?.username || sData?.username || "",
      displayName: uData?.displayName || uData?.fullName || sData?.displayName || wallet.fullName || "",
      email: uData?.email || sData?.email || "",
      phone: uData?.phone || sData?.phone || "",
      studentClass: uData?.studentClass || sData?.studentClass || wallet.currentClass || "",
      school: sData?.school || uData?.school || "",
      avatarUrl: uData?.photoURL || uData?.avatarUrl || sData?.avatarUrl || "",
      role: uData?.role || "student",
      status: uData?.status || "active",
      createdAt: uData?.createdAt || sData?.createdAt || wallet.createdAt,
      lastActive: uData?.lastLogin || uData?.updatedAt || wallet.updatedAt
    };
  }
  return {
    wallet,
    studentProfile,
    transactions,
    depositRequests,
    entitlements,
    debtRecords
  };
}
async function getDepositRequests(options) {
  let list = [];
  if (adminDb) {
    let q = adminDb.collection("deposit_requests");
    if (options?.status && options.status !== "all") {
      q = q.where("status", "==", options.status);
    }
    q = q.orderBy("createdAt", "desc").limit(options?.limit || 50);
    const snap = await q.get();
    list = snap.docs.map((d) => d.data());
  } else {
    const docs = await getFirestoreRestDocs("deposit_requests", 100);
    list = docs;
    if (options?.status && options.status !== "all") {
      list = list.filter((r) => r.status === options.status);
    }
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }
  }
  if (options?.search) {
    const term = options.search.toLowerCase().trim();
    list = list.filter(
      (r) => (r.studentNameSnapshot || "").toLowerCase().includes(term) || (r.studentClassSnapshot || "").toLowerCase().includes(term) || (r.id || "").toLowerCase().includes(term) || (r.uid || "").toLowerCase().includes(term)
    );
  }
  return list;
}
async function getStudentDepositRequests(uid, limitCount = 30) {
  if (adminDb) {
    const snap = await adminDb.collection("deposit_requests").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limitCount).get();
    return snap.docs.map((d) => d.data());
  }
  const docs = await getFirestoreRestDocs("deposit_requests", 100);
  const filtered = docs.filter((d) => d.uid === uid);
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return filtered.slice(0, limitCount);
}
async function updateStudentWalletProfile(studentUid, data) {
  if (!studentUid) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh h\u1ECDc sinh.");
  const wallet = await getOrCreateWallet(studentUid);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateFields = {
    updatedAt: now
  };
  if (data.fullName !== void 0) updateFields.fullName = String(data.fullName).trim();
  if (data.currentClass !== void 0) updateFields.currentClass = String(data.currentClass).trim();
  if (data.verifiedName !== void 0) updateFields.verifiedName = String(data.verifiedName).trim();
  if (data.isVerified !== void 0) {
    updateFields.isVerified = Boolean(data.isVerified);
    if (data.isVerified) {
      updateFields.verifiedAt = now;
      if (data.adminUid) updateFields.verifiedBy = data.adminUid;
    }
  }
  const updatedWallet = {
    ...wallet,
    ...updateFields
  };
  if (adminDb) {
    await adminDb.collection("wallets").doc(studentUid).set(updatedWallet, { merge: true });
  } else {
    await setFirestoreRestDoc("wallets", studentUid, updatedWallet);
  }
  return updatedWallet;
}
async function syncStudentsToWallets() {
  let createdCount = 0;
  let updatedCount = 0;
  const studentsMap = /* @__PURE__ */ new Map();
  if (adminDb) {
    const usersSnap = await adminDb.collection("users").get();
    usersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const role = data.role || "student";
      if (role === "student" || !role) {
        studentsMap.set(doc.id, {
          uid: doc.id,
          displayName: data.displayName || data.fullName || data.name || data.username || "",
          username: data.username || "",
          studentClass: data.studentClass || data.class || ""
        });
      }
    });
    const studentsSnap = await adminDb.collection("students").get();
    studentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const uid = doc.id;
      if (!studentsMap.has(uid)) {
        studentsMap.set(uid, {
          uid,
          displayName: data.displayName || data.fullName || data.name || data.username || "",
          username: data.username || "",
          studentClass: data.studentClass || data.class || ""
        });
      } else {
        const curr = studentsMap.get(uid);
        if (!curr.displayName && (data.displayName || data.fullName)) {
          curr.displayName = data.displayName || data.fullName;
        }
        if (!curr.studentClass && data.studentClass) {
          curr.studentClass = data.studentClass;
        }
      }
    });
    const walletsSnap = await adminDb.collection("wallets").get();
    const existingWallets = /* @__PURE__ */ new Map();
    walletsSnap.docs.forEach((doc) => {
      existingWallets.set(doc.id, doc.data());
    });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const batch = adminDb.batch();
    let opCount = 0;
    for (const [uid, student] of studentsMap.entries()) {
      const existing = existingWallets.get(uid);
      if (!existing) {
        const newWallet = {
          uid,
          balanceVnd: 0,
          totalCreditedVnd: 0,
          totalSpentVnd: 0,
          profileCompleted: Boolean(student.displayName && student.studentClass),
          fullName: student.displayName || student.username || `H\u1ECDc sinh #${uid.slice(0, 5)}`,
          currentClass: student.studentClass || "",
          verifiedName: student.displayName || "",
          isVerified: false,
          createdAt: now,
          updatedAt: now
        };
        batch.set(adminDb.collection("wallets").doc(uid), newWallet);
        createdCount++;
        opCount++;
      } else {
        let needUpdate = false;
        const updates = { updatedAt: now };
        if (!existing.fullName && student.displayName) {
          updates.fullName = student.displayName;
          needUpdate = true;
        }
        if (!existing.currentClass && student.studentClass) {
          updates.currentClass = student.studentClass;
          needUpdate = true;
        }
        if (!existing.verifiedName && (existing.fullName || student.displayName)) {
          updates.verifiedName = existing.fullName || student.displayName;
          needUpdate = true;
        }
        if (needUpdate) {
          batch.set(adminDb.collection("wallets").doc(uid), updates, { merge: true });
          updatedCount++;
          opCount++;
        }
      }
      if (opCount >= 400) {
        await batch.commit();
        opCount = 0;
      }
    }
    if (opCount > 0) {
      await batch.commit();
    }
  } else {
    const [usersList, studentsList, walletsList] = await Promise.all([
      getFirestoreRestDocs("users", 200),
      getFirestoreRestDocs("students", 200),
      getFirestoreRestDocs("wallets", 200)
    ]);
    usersList.forEach((data) => {
      const uid = data.id || data.uid;
      if (uid && (data.role === "student" || !data.role)) {
        studentsMap.set(uid, {
          uid,
          displayName: data.displayName || data.fullName || data.name || data.username || "",
          username: data.username || "",
          studentClass: data.studentClass || data.class || ""
        });
      }
    });
    studentsList.forEach((data) => {
      const uid = data.id || data.uid;
      if (uid) {
        if (!studentsMap.has(uid)) {
          studentsMap.set(uid, {
            uid,
            displayName: data.displayName || data.fullName || data.name || data.username || "",
            username: data.username || "",
            studentClass: data.studentClass || data.class || ""
          });
        }
      }
    });
    const existingWallets = /* @__PURE__ */ new Map();
    walletsList.forEach((w) => {
      const uid = w.id || w.uid;
      if (uid) existingWallets.set(uid, w);
    });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const [uid, student] of studentsMap.entries()) {
      const existing = existingWallets.get(uid);
      if (!existing) {
        const newWallet = {
          uid,
          balanceVnd: 0,
          totalCreditedVnd: 0,
          totalSpentVnd: 0,
          profileCompleted: Boolean(student.displayName && student.studentClass),
          fullName: student.displayName || student.username || `H\u1ECDc sinh #${uid.slice(0, 5)}`,
          currentClass: student.studentClass || "",
          verifiedName: student.displayName || "",
          isVerified: false,
          createdAt: now,
          updatedAt: now
        };
        await setFirestoreRestDoc("wallets", uid, newWallet);
        createdCount++;
      } else {
        let needUpdate = false;
        const updates = { ...existing, updatedAt: now };
        if (!existing.fullName && student.displayName) {
          updates.fullName = student.displayName;
          needUpdate = true;
        }
        if (!existing.currentClass && student.studentClass) {
          updates.currentClass = student.studentClass;
          needUpdate = true;
        }
        if (!existing.verifiedName && (existing.fullName || student.displayName)) {
          updates.verifiedName = existing.fullName || student.displayName;
          needUpdate = true;
        }
        if (needUpdate) {
          await setFirestoreRestDoc("wallets", uid, updates);
          updatedCount++;
        }
      }
    }
  }
  return {
    totalStudents: studentsMap.size,
    createdCount,
    updatedCount
  };
}
async function adminDirectEditWallet(adminUid, adminName, studentUid, payload) {
  if (!studentUid) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh h\u1ECDc sinh.");
  const cleanUid = studentUid.trim();
  const currentWallet = await getOrCreateWallet(cleanUid);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const updates = {
    updatedAt: now
  };
  if (payload.fullName !== void 0) updates.fullName = String(payload.fullName).trim();
  if (payload.currentClass !== void 0) updates.currentClass = String(payload.currentClass).trim().toUpperCase();
  if (payload.verifiedName !== void 0) updates.verifiedName = String(payload.verifiedName).trim();
  if (payload.isVerified !== void 0) {
    updates.isVerified = Boolean(payload.isVerified);
    if (payload.isVerified) {
      updates.verifiedAt = now;
      updates.verifiedBy = adminUid;
    }
  }
  if (payload.totalCreditedVnd !== void 0) updates.totalCreditedVnd = sanitizeVnd(payload.totalCreditedVnd);
  if (payload.totalSpentVnd !== void 0) updates.totalSpentVnd = sanitizeVnd(payload.totalSpentVnd);
  const prevBalance = sanitizeVnd(currentWallet.balanceVnd);
  const newBalance = payload.balanceVnd !== void 0 ? sanitizeVnd(payload.balanceVnd) : prevBalance;
  updates.balanceVnd = newBalance;
  const balanceChanged = newBalance !== prevBalance;
  if (adminDb) {
    const batch = adminDb.batch();
    const wRef = adminDb.collection("wallets").doc(cleanUid);
    batch.set(wRef, updates, { merge: true });
    if (balanceChanged) {
      const diff = newBalance - prevBalance;
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txDoc = {
        id: txId,
        uid: cleanUid,
        type: "admin_adjustment",
        amountVnd: Math.abs(diff),
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        actorUid: adminUid,
        actorName: adminName,
        note: payload.note || `Admin \u0111i\u1EC1u ch\u1EC9nh s\u1ED1 d\u01B0 tr\u1EF1c ti\u1EBFp (${diff >= 0 ? "+" : ""}${diff.toLocaleString("vi-VN")}\u0111)`,
        createdAt: now
      };
      batch.set(txRef, txDoc);
    }
    await batch.commit();
  } else {
    const mergedWallet = { ...currentWallet, ...updates };
    await setFirestoreRestDoc("wallets", cleanUid, mergedWallet);
    if (balanceChanged) {
      const diff = newBalance - prevBalance;
      const txDoc = {
        id: txId,
        uid: cleanUid,
        type: "admin_adjustment",
        amountVnd: Math.abs(diff),
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        actorUid: adminUid,
        actorName: adminName,
        note: payload.note || `Admin \u0111i\u1EC1u ch\u1EC9nh s\u1ED1 d\u01B0 tr\u1EF1c ti\u1EBFp (${diff >= 0 ? "+" : ""}${diff.toLocaleString("vi-VN")}\u0111)`,
        createdAt: now
      };
      await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
    }
  }
  const updatedWallet = {
    ...currentWallet,
    ...updates
  };
  return {
    success: true,
    wallet: updatedWallet,
    message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin v\xED v\xE0 s\u1ED1 d\u01B0 th\xE0nh c\xF4ng!"
  };
}

// server/services/examMergeService.ts
async function mergeExams(options) {
  const {
    title,
    description = "",
    subject = "Kh\xE1c",
    gradeCategory = "Kh\xE1c",
    folderId = null,
    timeLimit = 90,
    sourceExamIds,
    organizeMode = "by_source_exam",
    shuffleQuestions = false,
    shuffleOptions = false,
    actorUid = "admin",
    actorName = "Admin"
  } = options;
  if (!title || !title.trim()) {
    throw new Error("Vui l\xF2ng nh\u1EADp t\xEAn b\xE0i thi m\u1EDBi.");
  }
  if (!Array.isArray(sourceExamIds) || sourceExamIds.length < 2) {
    throw new Error("C\u1EA7n ch\u1ECDn \xEDt nh\u1EA5t 2 b\xE0i thi h\u1EE3p l\u1EC7 \u0111\u1EC3 th\u1EF1c hi\u1EC7n g\u1ED9p \u0111\u1EC1.");
  }
  const loadedSources = [];
  for (const srcId of sourceExamIds) {
    let examData = null;
    let sections = [];
    let questions = [];
    if (adminDb) {
      const examDoc = await adminDb.collection("exams").doc(srcId).get();
      if (!examDoc.exists) {
        throw new Error(`Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi ngu\u1ED3n v\u1EDBi ID: ${srcId}`);
      }
      examData = { id: examDoc.id, ...examDoc.data() };
      const secSnap = await adminDb.collection("exams").doc(srcId).collection("sections").orderBy("order", "asc").get();
      if (!secSnap.empty) {
        sections = secSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else if (Array.isArray(examData.sections) && examData.sections.length > 0) {
        sections = [...examData.sections];
      }
      const qSnap = await adminDb.collection("exams").doc(srcId).collection("questions").orderBy("order", "asc").get();
      if (!qSnap.empty) {
        questions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else if (Array.isArray(examData.questions) && examData.questions.length > 0) {
        questions = [...examData.questions];
      }
    } else {
      examData = await getFirestoreRestDoc("exams", srcId);
      if (!examData) {
        throw new Error(`Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi ngu\u1ED3n v\u1EDBi ID: ${srcId}`);
      }
      const restSecs = await getFirestoreRestDocs(`exams/${srcId}/sections`, 100);
      if (restSecs && restSecs.length > 0) {
        sections = restSecs;
      } else if (Array.isArray(examData.sections) && examData.sections.length > 0) {
        sections = [...examData.sections];
      }
      const restQs = await getFirestoreRestDocs(`exams/${srcId}/questions`, 100);
      if (restQs && restQs.length > 0) {
        questions = restQs;
      } else if (Array.isArray(examData.questions) && examData.questions.length > 0) {
        questions = [...examData.questions];
      }
    }
    loadedSources.push({
      exam: examData,
      sections,
      questions
    });
  }
  const newExamId = adminDb ? adminDb.collection("exams").doc().id : `exam_mrg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const generatedCode = options.code?.trim().toUpperCase() || `MERGED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  const newSections = [];
  const newQuestions = [];
  let globalQuestionOrder = 0;
  let globalSectionOrder = 0;
  let totalCalculatedPoints = 0;
  for (let sIdx = 0; sIdx < loadedSources.length; sIdx++) {
    const src = loadedSources[sIdx];
    const sourceExam = src.exam;
    if (organizeMode === "by_source_exam") {
      const parentSectionId = `sec_p_${newExamId}_${sIdx + 1}`;
      const parentSection = {
        id: parentSectionId,
        examId: newExamId,
        title: `Ph\u1EA7n ${sIdx + 1}: ${sourceExam.title}`,
        description: sourceExam.description || "",
        order: globalSectionOrder++,
        parentSectionId: null,
        depth: 0,
        questionCount: src.questions.length,
        enabled: true
      };
      newSections.push(parentSection);
      const sectionIdMap = /* @__PURE__ */ new Map();
      if (src.sections.length > 0) {
        src.sections.forEach((oldSec, idx) => {
          const childSecId = `sec_c_${newExamId}_${sIdx + 1}_${idx + 1}`;
          sectionIdMap.set(oldSec.id, childSecId);
          const childSec = {
            ...oldSec,
            id: childSecId,
            examId: newExamId,
            title: oldSec.title,
            description: oldSec.description || "",
            order: globalSectionOrder++,
            parentSectionId,
            depth: 1,
            questionCount: src.questions.filter((q) => q.sectionId === oldSec.id).length,
            enabled: true
          };
          newSections.push(childSec);
        });
      } else {
        const singleChildId = `sec_c_${newExamId}_${sIdx + 1}_sub`;
        sectionIdMap.set("default", singleChildId);
        newSections.push({
          id: singleChildId,
          examId: newExamId,
          title: sourceExam.subject ? `M\xF4n ${sourceExam.subject}` : "To\xE0n b\u1ED9 c\xE2u h\u1ECFi",
          order: globalSectionOrder++,
          parentSectionId,
          depth: 1,
          questionCount: src.questions.length,
          enabled: true
        });
      }
      src.questions.forEach((oldQ, qIdx) => {
        let assignedSectionId = oldQ.sectionId ? sectionIdMap.get(oldQ.sectionId) : sectionIdMap.get("default");
        if (!assignedSectionId && newSections.length > 0) {
          assignedSectionId = newSections[newSections.length - 1].id;
        }
        const newQId = `q_mrg_${newExamId}_${sIdx + 1}_${qIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const pts = typeof oldQ.points === "number" && !isNaN(oldQ.points) ? oldQ.points : 1;
        totalCalculatedPoints += pts;
        const clonedQuestion = {
          ...oldQ,
          id: newQId,
          examId: newExamId,
          sectionId: assignedSectionId,
          order: globalQuestionOrder++,
          points: pts,
          originalExamId: sourceExam.id,
          originalQuestionId: oldQ.id
        };
        newQuestions.push(clonedQuestion);
      });
    } else {
      const sectionIdMap = /* @__PURE__ */ new Map();
      src.sections.forEach((oldSec, idx) => {
        const mappedId = `sec_${newExamId}_${sIdx + 1}_${idx + 1}`;
        sectionIdMap.set(oldSec.id, mappedId);
        const clonedSec = {
          ...oldSec,
          id: mappedId,
          examId: newExamId,
          order: globalSectionOrder++,
          parentSectionId: null,
          depth: oldSec.depth ?? 0
        };
        newSections.push(clonedSec);
      });
      newSections.forEach((sec) => {
        if (sec.parentSectionId && sectionIdMap.has(sec.parentSectionId)) {
          sec.parentSectionId = sectionIdMap.get(sec.parentSectionId);
        }
      });
      src.questions.forEach((oldQ, qIdx) => {
        const assignedSectionId = oldQ.sectionId ? sectionIdMap.get(oldQ.sectionId) || null : null;
        const newQId = `q_mrg_${newExamId}_${sIdx + 1}_${qIdx + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const pts = typeof oldQ.points === "number" && !isNaN(oldQ.points) ? oldQ.points : 1;
        totalCalculatedPoints += pts;
        const clonedQuestion = {
          ...oldQ,
          id: newQId,
          examId: newExamId,
          sectionId: assignedSectionId,
          order: globalQuestionOrder++,
          points: pts,
          originalExamId: sourceExam.id,
          originalQuestionId: oldQ.id
        };
        newQuestions.push(clonedQuestion);
      });
    }
  }
  const now = /* @__PURE__ */ new Date();
  const newExam = {
    id: newExamId,
    title: title.trim(),
    code: generatedCode,
    description: description.trim(),
    timeLimit,
    duration: timeLimit,
    shuffleQuestions,
    shuffleOptions,
    status: "draft",
    folderId,
    subject,
    gradeCategory,
    questionCount: newQuestions.length,
    totalQuestions: newQuestions.length,
    maxScore: totalCalculatedPoints || 10,
    showResults: true,
    showScore: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 0,
    sourceExamIds,
    sourceExamCount: sourceExamIds.length,
    isAggregatedReview: false,
    accessMode: "free",
    priceVnd: 0,
    salesEnabled: true,
    sections: newSections,
    createdAt: now,
    updatedAt: now
  };
  if (adminDb) {
    const BATCH_SIZE = 400;
    const writeOps = [];
    writeOps.push({ ref: adminDb.collection("exams").doc(newExamId), data: newExam });
    for (const sec of newSections) {
      const secRef = adminDb.collection("exams").doc(newExamId).collection("sections").doc(sec.id);
      writeOps.push({ ref: secRef, data: sec });
    }
    for (const q of newQuestions) {
      const qRef = adminDb.collection("exams").doc(newExamId).collection("questions").doc(q.id);
      writeOps.push({ ref: qRef, data: q });
    }
    for (let i = 0; i < writeOps.length; i += BATCH_SIZE) {
      const chunk = writeOps.slice(i, i + BATCH_SIZE);
      const batch = adminDb.batch();
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  } else {
    await setFirestoreRestDoc("exams", newExamId, {
      ...newExam,
      sections: newSections,
      questions: newQuestions
    });
    for (const sec of newSections) {
      await setFirestoreRestDoc(`exams/${newExamId}/sections`, sec.id, sec);
    }
    for (const q of newQuestions) {
      await setFirestoreRestDoc(`exams/${newExamId}/questions`, q.id, q);
    }
  }
  try {
    const auditData = {
      actorUid,
      actorName,
      action: "MERGE_EXAMS",
      targetUid: newExamId,
      targetType: "exam",
      metadata: {
        newExamTitle: title,
        sourceExamIds,
        totalSections: newSections.length,
        totalQuestions: newQuestions.length
      },
      timestamp: now.toISOString()
    };
    if (adminDb) {
      const auditRef = adminDb.collection("auditLogs").doc();
      await auditRef.set({
        id: auditRef.id,
        ...auditData
      });
    } else {
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setFirestoreRestDoc("auditLogs", auditId, {
        id: auditId,
        ...auditData
      });
    }
  } catch (auditErr) {
    console.warn("[examMergeService] Failed to record merge audit log:", auditErr);
  }
  return {
    newExamId,
    exam: newExam,
    totalSections: newSections.length,
    totalQuestions: newQuestions.length,
    totalPoints: totalCalculatedPoints
  };
}

// server/routes/adminRoutes.ts
var adminRouter = Router();
var userListCache = /* @__PURE__ */ new Map();
function invalidateUserListCache() {
  userListCache.clear();
}
adminRouter.use(requireAdmin);
adminRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});
async function recordAuditLog(actor, action, targetUid, targetType, metadata, req) {
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const logData = {
    id: logId,
    actorUid: actor?.uid || "unknown",
    actorRole: actor?.role || "admin",
    actorEmail: actor?.email || "",
    actorName: actor?.displayName || "",
    action,
    targetUid: targetUid || "",
    targetType: targetType || "user",
    metadata: metadata || {},
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userAgentSummary: req?.headers["user-agent"]?.slice(0, 150) || ""
  };
  try {
    if (adminDb) {
      const logDoc = adminDb.collection("auditLogs").doc();
      logData.id = logDoc.id;
      await logDoc.set(logData);
    } else {
      await setFirestoreRestDoc("auditLogs", logId, logData);
    }
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
  }
}
async function computeSystemStats() {
  const now = /* @__PURE__ */ new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3).toISOString();
  let usersList = [];
  let totalExams = 0;
  let subList = [];
  let relList = [];
  if (adminDb) {
    const usersSnap = await adminDb.collection("users").get();
    console.log(`[Server Firestore READ: ${usersSnap.size} docs] Collection: "users"`);
    usersList = usersSnap.docs.map((doc) => doc.data());
    try {
      const examsSnap = await adminDb.collection("exams").count().get();
      totalExams = examsSnap.data().count;
    } catch (e) {
      const examsSnap = await adminDb.collection("exams").get();
      console.log(`[Server Firestore READ: ${examsSnap.size} docs] Collection: "exams"`);
      totalExams = examsSnap.size;
    }
    const submissionsRef = adminDb.collection("submissions");
    const subSnap = await submissionsRef.orderBy("submittedAt", "desc").limit(50).get();
    console.log(`[Server Firestore READ: ${subSnap.size} docs] Collection: "submissions" (limit: 50)`);
    subList = subSnap.docs.map((doc) => doc.data());
    try {
      const relSnap = await adminDb.collection("relationships").limit(50).get();
      console.log(`[Server Firestore READ: ${relSnap.size} docs] Collection: "relationships" (limit: 50)`);
      relList = relSnap.docs.map((doc) => doc.data());
    } catch (e) {
    }
  } else {
    usersList = await getFirestoreRestDocs("users", 100);
    const examsList = await getFirestoreRestDocs("exams", 50);
    totalExams = examsList.length;
    subList = await getFirestoreRestDocs("submissions", 50);
    relList = await getFirestoreRestDocs("relationships", 50);
  }
  let totalAccounts = 0;
  let studentAccounts = 0;
  let parentAccounts = 0;
  let teacherAccounts = 0;
  let adminAccounts = 0;
  let activeAccounts = 0;
  let pendingAccounts = 0;
  let suspendedAccounts = 0;
  let disabledAccounts = 0;
  let unverifiedAccounts = 0;
  let studentsToday = 0;
  let students7Days = 0;
  let students30Days = 0;
  const classDistribution = {};
  usersList.forEach((data) => {
    totalAccounts++;
    const role = data.role || "student";
    const status = data.accountStatus || "active";
    if (role === "student") studentAccounts++;
    else if (role === "parent") parentAccounts++;
    else if (role === "teacher") teacherAccounts++;
    else if (role === "admin" || role === "super_admin") adminAccounts++;
    if (status === "active") activeAccounts++;
    else if (status === "pending") pendingAccounts++;
    else if (status === "suspended") suspendedAccounts++;
    else if (status === "disabled") disabledAccounts++;
    if (!data.emailVerified) unverifiedAccounts++;
    const createdAt = data.createdAt ? new Date(data.createdAt).toISOString() : "";
    if (role === "student" && createdAt) {
      if (createdAt >= todayStart) studentsToday++;
      if (createdAt >= sevenDaysAgo) students7Days++;
      if (createdAt >= thirtyDaysAgo) students30Days++;
    }
    if (data.studentClass) {
      classDistribution[data.studentClass] = (classDistribution[data.studentClass] || 0) + 1;
    }
  });
  let totalSubmissions = 0;
  let submissionsToday = 0;
  let submissions7Days = 0;
  let submissions30Days = 0;
  let totalScoreSum = 0;
  let validScoreCount = 0;
  let highestScore = 0;
  let lowestScore = 10;
  const studentTestedSet = /* @__PURE__ */ new Set();
  subList.forEach((sub) => {
    totalSubmissions++;
    const submittedAt = sub.submittedAt?.toDate ? sub.submittedAt.toDate().toISOString() : typeof sub.submittedAt === "string" ? sub.submittedAt : "";
    if (submittedAt >= todayStart) submissionsToday++;
    if (submittedAt >= sevenDaysAgo) submissions7Days++;
    if (submittedAt >= thirtyDaysAgo) submissions30Days++;
    if (typeof sub.score === "number") {
      totalScoreSum += sub.score;
      validScoreCount++;
      if (sub.score > highestScore) highestScore = sub.score;
      if (sub.score < lowestScore) lowestScore = sub.score;
    }
    if (sub.studentId) studentTestedSet.add(sub.studentId);
  });
  const averageScore = validScoreCount > 0 ? Number((totalScoreSum / validScoreCount).toFixed(2)) : 0;
  const totalRelationships = relList.length;
  const pendingRelationships = relList.filter((r) => r.status === "pending").length;
  return {
    userStats: {
      totalAccounts,
      studentAccounts,
      parentAccounts,
      teacherAccounts,
      adminAccounts,
      activeAccounts,
      pendingAccounts,
      suspendedAccounts,
      disabledAccounts,
      unverifiedAccounts
    },
    studentStats: {
      totalStudents: studentAccounts,
      newToday: studentsToday,
      new7Days: students7Days,
      new30Days: students30Days,
      testedCount: studentTestedSet.size,
      notTestedCount: Math.max(0, studentAccounts - studentTestedSet.size),
      classDistribution
    },
    parentStats: {
      totalParents: parentAccounts,
      totalRelationships,
      pendingRelationships
    },
    examStats: {
      totalExams,
      totalSubmissions,
      submissionsToday,
      submissions7Days,
      submissions30Days,
      averageScore,
      highestScore: validScoreCount > 0 ? highestScore : 0,
      lowestScore: validScoreCount > 0 ? lowestScore : 0
    },
    recentSubmissions: subList.slice(0, 10).map((s) => ({
      id: s.id || s.attemptId || "",
      examId: s.examId || "",
      examTitleSnapshot: s.examTitleSnapshot || s.examTitle || "",
      studentId: s.studentId || "",
      studentUsername: s.studentUsername || "",
      studentNameSnapshot: s.studentNameSnapshot || s.studentUsername || "Th\xED sinh",
      score: typeof s.score === "number" ? s.score : 0,
      maxScore: s.maxScore || 10,
      timeSpent: s.timeSpent || 0,
      submittedAt: s.submittedAt?.toDate ? s.submittedAt.toDate().toISOString() : s.submittedAt || ""
    })),
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
adminRouter.get("/stats", async (req, res) => {
  try {
    const force = req.query.force === "true" || Boolean(req.query._t) || Boolean(req.headers["cache-control"]?.includes("no-cache"));
    if (!force) {
      let overviewDoc = null;
      if (adminDb) {
        const snap = await adminDb.collection("system_stats").doc("overview").get();
        if (snap.exists) {
          overviewDoc = snap.data();
          console.log(`[Server Firestore READ_DOC: 1 doc] system_stats/overview (pre-aggregated metrics)`);
        }
      } else {
        overviewDoc = await getFirestoreRestDoc("system_stats", "overview");
      }
      const lastUpdatedMs = overviewDoc?.lastUpdated ? new Date(overviewDoc.lastUpdated).getTime() : 0;
      const isFresh = Date.now() - lastUpdatedMs < 6e4;
      if (overviewDoc && overviewDoc.userStats && overviewDoc.examStats && isFresh) {
        console.log(`[Server Stats] Served from dedicated doc "system_stats/overview" (1 doc read / fresh)`);
        return res.json(overviewDoc);
      }
    }
    console.log(`[Server Stats] Aggregated document not found. Building fresh system_stats/overview...`);
    const freshStats = await computeSystemStats();
    try {
      if (adminDb) {
        await adminDb.collection("system_stats").doc("overview").set(freshStats);
      } else {
        await setFirestoreRestDoc("system_stats", "overview", freshStats);
      }
      console.log(`[Server Stats] Saved computed aggregates into "system_stats/overview"`);
    } catch (saveErr) {
      console.warn("[Server Stats] Warning saving system_stats/overview:", saveErr);
    }
    return res.json(freshStats);
  } catch (err) {
    console.error("[adminRoutes] /stats error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/stats/rebuild", async (req, res) => {
  try {
    console.log(`[Server Stats] Admin manual rebuild requested...`);
    const freshStats = await computeSystemStats();
    if (adminDb) {
      await adminDb.collection("system_stats").doc("overview").set(freshStats);
    } else {
      await setFirestoreRestDoc("system_stats", "overview", freshStats);
    }
    return res.json({ success: true, message: "\u0110\xE3 t\xE1i t\u1ED5ng h\u1EE3p s\u1ED1 li\u1EC7u v\xE0 c\u1EADp nh\u1EADt system_stats/overview th\xE0nh c\xF4ng.", data: freshStats });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/analytics", async (req, res) => {
  try {
    const range = req.query.range || "7d";
    let days = 7;
    if (range === "30d") days = 30;
    if (range === "90d") days = 90;
    if (range === "1y") days = 365;
    const now = /* @__PURE__ */ new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1e3);
    const dateBuckets = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1e3);
      const key = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      dateBuckets[key] = { date: key, label, newUsers: 0, submissions: 0 };
    }
    let usersList = [];
    let subList = [];
    if (adminDb) {
      const usersSnap = await adminDb.collection("users").limit(100).get();
      usersList = usersSnap.docs.map((doc) => doc.data());
      const subSnap = await adminDb.collection("submissions").limit(100).get();
      subList = subSnap.docs.map((doc) => doc.data());
    } else {
      usersList = await getFirestoreRestDocs("users", 100, true, 3e4);
      subList = await getFirestoreRestDocs("submissions", 100, true, 3e4);
    }
    usersList.forEach((data) => {
      if (data.createdAt) {
        const dStr = new Date(data.createdAt).toISOString().slice(0, 10);
        if (dateBuckets[dStr]) {
          dateBuckets[dStr].newUsers++;
        }
      }
    });
    subList.forEach((data) => {
      const submittedAt = data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : typeof data.submittedAt === "string" ? data.submittedAt : "";
      if (submittedAt) {
        const dStr = submittedAt.slice(0, 10);
        if (dateBuckets[dStr]) {
          dateBuckets[dStr].submissions++;
        }
      }
    });
    const chartData = Object.values(dateBuckets);
    return res.json({ range, chartData });
  } catch (err) {
    console.error("[adminRoutes] /analytics error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 5));
    const search = (req.query.search || "").trim().toLowerCase();
    const roleFilter = req.query.role || "";
    const statusFilter = req.query.status || "";
    const providerFilter = req.query.provider || "";
    const verifiedFilter = req.query.verified || "";
    const classFilter = req.query.class || "";
    const sortField = req.query.sort || "createdAt";
    const sortOrder = req.query.order === "asc" ? "asc" : "desc";
    const isNoCache = req.query.force === "true" || Boolean(req.query._t) || Boolean(req.headers["cache-control"]?.includes("no-cache"));
    const cacheKey = `${roleFilter}__${statusFilter}`;
    const cached = userListCache.get(cacheKey);
    let users = [];
    if (!isNoCache && cached && Date.now() - cached.timestamp < 6e4) {
      users = [...cached.data];
    } else {
      if (adminDb) {
        let query = adminDb.collection("users");
        if (roleFilter) {
          query = query.where("role", "==", roleFilter);
        }
        if (statusFilter) {
          query = query.where("accountStatus", "==", statusFilter);
        }
        const snapshot = await query.get();
        users = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data()
        }));
      } else {
        users = await getFirestoreRestDocs("users");
        if (roleFilter) {
          users = users.filter((u) => u.role === roleFilter);
        }
        if (statusFilter) {
          users = users.filter((u) => (u.accountStatus || "active") === statusFilter);
        }
      }
      userListCache.set(cacheKey, { data: users, timestamp: Date.now() });
    }
    if (search) {
      users = users.filter(
        (u) => u.displayName?.toLowerCase().includes(search) || u.fullName?.toLowerCase().includes(search) || u.username?.toLowerCase().includes(search) || u.usernameNormalized?.includes(search) || u.email?.toLowerCase().includes(search) || u.uid?.toLowerCase().includes(search) || u.studentClass?.toLowerCase().includes(search) || u.phone?.toLowerCase().includes(search)
      );
    }
    if (providerFilter) {
      users = users.filter((u) => u.provider === providerFilter);
    }
    if (verifiedFilter !== "") {
      const isVerified = verifiedFilter === "true";
      users = users.filter((u) => Boolean(u.emailVerified) === isVerified);
    }
    if (classFilter) {
      users = users.filter((u) => u.studentClass === classFilter);
    }
    users.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "createdAt" || sortField === "lastLoginAt") {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    const totalCount = users.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedUsers = users.slice((page - 1) * limit, page * limit);
    return res.json({
      items: paginatedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (err) {
    console.error("[adminRoutes] /users error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const subLimit = Math.min(50, Math.max(1, parseInt(req.query.subLimit) || 5));
    const logLimit = Math.min(50, Math.max(1, parseInt(req.query.logLimit) || 5));
    let userData = null;
    let studentProfile = null;
    let parentProfile = null;
    let relationships = [];
    let submissions = [];
    let auditLogs = [];
    if (adminDb) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "not_found", message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng." });
      }
      userData = { uid: userDoc.id, ...userDoc.data() };
      const studentDoc = await adminDb.collection("students").doc(uid).get();
      if (studentDoc.exists) studentProfile = { id: studentDoc.id, ...studentDoc.data() };
      const parentDoc = await adminDb.collection("parents").doc(uid).get();
      if (parentDoc.exists) parentProfile = { id: parentDoc.id, ...parentDoc.data() };
      const relStudentSnap = await adminDb.collection("relationships").where("studentUid", "==", uid).get();
      relStudentSnap.forEach((d) => relationships.push({ id: d.id, ...d.data() }));
      const relParentSnap = await adminDb.collection("relationships").where("parentUid", "==", uid).get();
      relParentSnap.forEach((d) => relationships.push({ id: d.id, ...d.data() }));
      const candidateIds = Array.from(
        new Set(
          [
            uid,
            userData.username,
            userData.email,
            userData.displayName,
            studentProfile?.username,
            studentProfile?.studentCode
          ].filter(Boolean)
        )
      );
      const subMap = /* @__PURE__ */ new Map();
      for (const cid of candidateIds) {
        try {
          const s1 = await adminDb.collection("submissions").where("studentId", "==", cid).limit(subLimit * 2).get();
          s1.forEach((d) => subMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (_) {
        }
        try {
          const s2 = await adminDb.collection("submissions").where("studentUsername", "==", cid).limit(subLimit * 2).get();
          s2.forEach((d) => subMap.set(d.id, { id: d.id, ...d.data() }));
        } catch (_) {
        }
      }
      submissions = Array.from(subMap.values());
      submissions.sort((a, b) => {
        const getMs = (val) => {
          if (!val) return 0;
          if (typeof val.toDate === "function") return val.toDate().getTime();
          if (typeof val.toMillis === "function") return val.toMillis();
          if (typeof val.seconds === "number") return val.seconds * 1e3;
          if (val instanceof Date) return val.getTime();
          return new Date(val).getTime() || 0;
        };
        return getMs(b.submittedAt) - getMs(a.submittedAt);
      });
      submissions = submissions.slice(0, subLimit);
      const logSnap = await adminDb.collection("auditLogs").where("targetUid", "==", uid).limit(logLimit).get();
      logSnap.forEach((d) => auditLogs.push({ id: d.id, ...d.data() }));
    } else {
      userData = await getFirestoreRestDoc("users", uid);
      if (!userData) {
        return res.status(404).json({ error: "not_found", message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng." });
      }
      studentProfile = await getFirestoreRestDoc("students", uid);
      parentProfile = await getFirestoreRestDoc("parents", uid);
      const allRels = await getFirestoreRestDocs("relationships");
      relationships = allRels.filter((r) => r.studentUid === uid || r.parentUid === uid);
      const candidateIds = Array.from(
        new Set(
          [
            uid,
            userData.username,
            userData.email,
            userData.displayName,
            studentProfile?.username,
            studentProfile?.studentCode
          ].filter(Boolean)
        )
      );
      const allSubs = await getFirestoreRestDocs("submissions", 100);
      submissions = allSubs.filter(
        (s) => candidateIds.includes(s.studentId) || candidateIds.includes(s.studentUsername)
      );
      submissions.sort((a, b) => {
        const timeA = new Date(a.submittedAt || 0).getTime();
        const timeB = new Date(b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      submissions = submissions.slice(0, subLimit);
      const allLogs = await getFirestoreRestDocs("auditLogs", logLimit * 5);
      auditLogs = allLogs.filter((l) => l.targetUid === uid).slice(0, logLimit);
    }
    return res.json({
      user: userData,
      studentProfile,
      parentProfile,
      relationships,
      submissions,
      auditLogs
    });
  } catch (err) {
    console.error("[adminRoutes] /users/:uid error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.patch("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body || {};
    delete updates.password;
    delete updates.passwordHash;
    delete updates.token;
    if (updates.role && (updates.role === "admin" || updates.role === "super_admin")) {
      if (req.user?.role !== "super_admin") {
        return res.status(403).json({
          error: "permission_denied",
          message: "Ch\u1EC9 Super Admin m\u1EDBi c\xF3 quy\u1EC1n c\u1EA5p quy\u1EC1n Qu\u1EA3n tr\u1ECB vi\xEAn."
        });
      }
    }
    updates.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (adminDb) {
      const userRef = adminDb.collection("users").doc(uid);
      await userRef.set(updates, { merge: true });
    } else {
      await setFirestoreRestDoc("users", uid, updates);
    }
    if (updates.role && adminAuth) {
      try {
        await adminAuth.setCustomUserClaims(uid, { role: updates.role, accountStatus: updates.accountStatus || "active" });
      } catch (claimErr) {
        console.warn("[adminRoutes] Failed to update custom claims:", claimErr);
      }
    }
    invalidateUserListCache();
    await recordAuditLog(req.user, "PROFILE_UPDATED", uid, "user", updates, req);
    return res.json({ success: true, message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng th\xE0nh c\xF4ng." });
  } catch (err) {
    console.error("[adminRoutes] PATCH /users/:uid error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/users/:uid/approve", async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = {
      accountStatus: "active",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
      approvedBy: req.user?.uid || "admin"
    };
    if (adminDb) {
      await adminDb.collection("users").doc(uid).update(updateData);
    } else {
      await setFirestoreRestDoc("users", uid, updateData);
    }
    if (adminAuth) {
      try {
        const user = await adminAuth.getUser(uid);
        const existingClaims = user.customClaims || {};
        await adminAuth.setCustomUserClaims(uid, { ...existingClaims, accountStatus: "active" });
      } catch (e) {
      }
    }
    invalidateUserListCache();
    await recordAuditLog(req.user, "USER_APPROVED", uid, "user", { approvedBy: req.user?.uid }, req);
    return res.json({ success: true, message: "\u0110\xE3 ph\xEA duy\u1EC7t t\xE0i kho\u1EA3n th\xE0nh c\xF4ng." });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/users/:uid/suspend", async (req, res) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body || {};
    const updateData = {
      accountStatus: "suspended",
      suspendedReason: reason || "T\u1EA1m kho\xE1 b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (adminDb) {
      await adminDb.collection("users").doc(uid).update(updateData);
    } else {
      await setFirestoreRestDoc("users", uid, updateData);
    }
    if (adminAuth) {
      try {
        const user = await adminAuth.getUser(uid);
        const existingClaims = user.customClaims || {};
        await adminAuth.setCustomUserClaims(uid, { ...existingClaims, accountStatus: "suspended" });
      } catch (e) {
      }
    }
    invalidateUserListCache();
    await recordAuditLog(req.user, "USER_SUSPENDED", uid, "user", { reason }, req);
    return res.json({ success: true, message: "\u0110\xE3 t\u1EA1m kho\xE1 t\xE0i kho\u1EA3n th\xE0nh c\xF4ng." });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/users/:uid/reactivate", async (req, res) => {
  try {
    const { uid } = req.params;
    const updateData = {
      accountStatus: "active",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (adminDb) {
      await adminDb.collection("users").doc(uid).update(updateData);
    } else {
      await setFirestoreRestDoc("users", uid, updateData);
    }
    if (adminAuth) {
      try {
        const user = await adminAuth.getUser(uid);
        const existingClaims = user.customClaims || {};
        await adminAuth.setCustomUserClaims(uid, { ...existingClaims, accountStatus: "active" });
      } catch (e) {
      }
    }
    invalidateUserListCache();
    await recordAuditLog(req.user, "USER_REACTIVATED", uid, "user", {}, req);
    return res.json({ success: true, message: "\u0110\xE3 k\xEDch ho\u1EA1t l\u1EA1i t\xE0i kho\u1EA3n th\xE0nh c\xF4ng." });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
async function hardDeleteUser(uid) {
  try {
    let userData = null;
    if (adminDb) {
      const docSnap = await adminDb.collection("users").doc(uid).get();
      if (docSnap.exists) userData = docSnap.data();
    } else {
      userData = await getFirestoreRestDoc("users", uid, false);
    }
    const role = userData?.role || "";
    if (role === "super_admin") {
      return { success: false, reason: "Kh\xF4ng th\u1EC3 xo\xE1 t\xE0i kho\u1EA3n Super Admin." };
    }
    const username = (userData?.username || userData?.usernameNormalized || "").toLowerCase();
    if (adminDb) {
      await adminDb.collection("users").doc(uid).delete().catch(() => {
      });
    } else {
      await deleteFirestoreRestDoc("users", uid);
    }
    if (username) {
      if (adminDb) {
        await adminDb.collection("usernames").doc(username).delete().catch(() => {
        });
      } else {
        await deleteFirestoreRestDoc("usernames", username);
      }
    }
    if (adminDb) {
      if (username) await adminDb.collection("students").doc(username).delete().catch(() => {
      });
      await adminDb.collection("students").doc(uid).delete().catch(() => {
      });
    } else {
      if (username) await deleteFirestoreRestDoc("students", username);
      await deleteFirestoreRestDoc("students", uid);
    }
    if (adminDb) {
      if (username) await adminDb.collection("parents").doc(username).delete().catch(() => {
      });
      await adminDb.collection("parents").doc(uid).delete().catch(() => {
      });
    } else {
      if (username) await deleteFirestoreRestDoc("parents", username);
      await deleteFirestoreRestDoc("parents", uid);
    }
    if (adminDb) {
      try {
        const rels1 = await adminDb.collection("relationships").where("studentUid", "==", uid).get();
        for (const d of rels1.docs) await d.ref.delete().catch(() => {
        });
        const rels2 = await adminDb.collection("relationships").where("parentUid", "==", uid).get();
        for (const d of rels2.docs) await d.ref.delete().catch(() => {
        });
      } catch (e) {
      }
    } else {
      try {
        const allRels = await getFirestoreRestDocs("relationships", 100, false);
        for (const rel of allRels) {
          if (rel.studentUid === uid || rel.parentUid === uid || username && (rel.studentUsername === username || rel.parentUsername === username)) {
            await deleteFirestoreRestDoc("relationships", rel.id);
          }
        }
      } catch (e) {
      }
    }
    if (adminDb) {
      try {
        if (username) {
          const reqs1 = await adminDb.collection("parent_link_requests").where("studentUsername", "==", username).get();
          for (const d of reqs1.docs) await d.ref.delete().catch(() => {
          });
          const reqs2 = await adminDb.collection("parent_link_requests").where("parentUsername", "==", username).get();
          for (const d of reqs2.docs) await d.ref.delete().catch(() => {
          });
        }
      } catch (e) {
      }
    } else {
      try {
        const allReqs = await getFirestoreRestDocs("parent_link_requests", 100, false);
        for (const r of allReqs) {
          if (r.studentUid === uid || r.parentUid === uid || username && (r.studentUsername === username || r.parentUsername === username)) {
            await deleteFirestoreRestDoc("parent_link_requests", r.id);
          }
        }
      } catch (e) {
      }
    }
    if (adminDb) {
      try {
        const subs1 = await adminDb.collection("submissions").where("studentId", "==", uid).get();
        for (const d of subs1.docs) await d.ref.delete().catch(() => {
        });
        const subs2 = await adminDb.collection("submissions").where("studentUid", "==", uid).get();
        for (const d of subs2.docs) await d.ref.delete().catch(() => {
        });
        if (username) {
          const subs3 = await adminDb.collection("submissions").where("studentId", "==", username).get();
          for (const d of subs3.docs) await d.ref.delete().catch(() => {
          });
        }
      } catch (e) {
      }
    } else {
      try {
        const allSubs = await getFirestoreRestDocs("submissions", 100, false);
        for (const s of allSubs) {
          if (s.studentId === uid || s.studentUid === uid || username && s.studentId === username) {
            await deleteFirestoreRestDoc("submissions", s.id);
          }
        }
      } catch (e) {
      }
    }
    if (adminAuth) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (authErr) {
        console.warn(`[hardDeleteUser] Could not delete Firebase Auth user ${uid}:`, authErr);
      }
    }
    return { success: true, username, role };
  } catch (err) {
    console.error(`[hardDeleteUser] Error deleting user ${uid}:`, err);
    return { success: false, reason: err.message };
  }
}
adminRouter.delete("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await hardDeleteUser(uid);
    if (!result.success) {
      return res.status(403).json({ error: "forbidden", message: result.reason || "Kh\xF4ng th\u1EC3 xo\xE1 t\xE0i kho\u1EA3n." });
    }
    invalidateUserListCache();
    clearServerRestCache();
    await recordAuditLog(req.user, "USER_DELETED", uid, "user", { username: result.username, hardDelete: true }, req);
    return res.json({ success: true, message: "\u0110\xE3 xo\xE1 v\u0129nh vi\u1EC5n t\xE0i kho\u1EA3n v\xE0 to\xE0n b\u1ED9 d\u1EEF li\u1EC7u li\xEAn quan th\xE0nh c\xF4ng." });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/users/bulk", async (req, res) => {
  try {
    const { action, uids, payload } = req.body || {};
    if (!Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({ error: "invalid_input", message: "Danh s\xE1ch UIDs kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    let affectedCount = 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (action === "delete") {
      for (const uid of uids) {
        const delRes = await hardDeleteUser(uid);
        if (delRes.success) {
          affectedCount++;
        }
      }
      invalidateUserListCache();
      clearServerRestCache();
      await recordAuditLog(req.user, "BULK_DELETE", void 0, "system", { count: affectedCount, uids }, req);
      return res.json({
        success: true,
        message: `\u0110\xE3 xo\xE1 v\u0129nh vi\u1EC5n ${affectedCount} t\xE0i kho\u1EA3n v\xE0 c\xE1c d\u1EEF li\u1EC7u li\xEAn quan.`,
        affectedCount
      });
    }
    if (adminDb) {
      const batch = adminDb.batch();
      for (const uid of uids) {
        const docRef = adminDb.collection("users").doc(uid);
        if (action === "approve") {
          batch.update(docRef, { accountStatus: "active", updatedAt: now, approvedBy: req.user?.uid });
          affectedCount++;
        } else if (action === "suspend") {
          batch.update(docRef, { accountStatus: "suspended", updatedAt: now, suspendedReason: payload?.reason || "Bulk suspend" });
          affectedCount++;
        } else if (action === "reactivate") {
          batch.update(docRef, { accountStatus: "active", updatedAt: now });
          affectedCount++;
        } else if (action === "assignClass" && payload?.className) {
          batch.update(docRef, { studentClass: payload.className, updatedAt: now });
          affectedCount++;
        } else if (action === "markTest") {
          batch.update(docRef, { isTestAccount: true, updatedAt: now });
          affectedCount++;
        }
      }
      await batch.commit();
    } else {
      for (const uid of uids) {
        const patch = { updatedAt: now };
        if (action === "approve") {
          patch.accountStatus = "active";
          patch.approvedBy = req.user?.uid;
        } else if (action === "suspend") {
          patch.accountStatus = "suspended";
          patch.suspendedReason = payload?.reason || "Bulk suspend";
        } else if (action === "reactivate") {
          patch.accountStatus = "active";
        } else if (action === "assignClass" && payload?.className) {
          patch.studentClass = payload.className;
        } else if (action === "markTest") {
          patch.isTestAccount = true;
        }
        await setFirestoreRestDoc("users", uid, patch);
        affectedCount++;
      }
    }
    invalidateUserListCache();
    await recordAuditLog(req.user, "BULK_OPERATION", void 0, "system", { action, count: affectedCount, uids }, req);
    return res.json({
      success: true,
      message: `\u0110\xE3 \xE1p d\u1EE5ng thao t\xE1c "${action}" th\xE0nh c\xF4ng cho ${affectedCount} t\xE0i kho\u1EA3n.`,
      affectedCount
    });
  } catch (err) {
    console.error("[adminRoutes] /users/bulk error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/data-health", async (req, res) => {
  try {
    let healthDocData = null;
    if (adminDb) {
      const healthDoc = await adminDb.collection("system").doc("data_health_report").get();
      if (healthDoc.exists) healthDocData = healthDoc.data();
    } else {
      healthDocData = await getFirestoreRestDoc("system", "data_health_report");
    }
    if (healthDocData) {
      return res.json(healthDocData);
    }
    return res.json({
      scannedAt: null,
      totalAuthUsers: 0,
      totalProfiles: 0,
      validUsersCount: 0,
      authWithoutProfileCount: 0,
      orphanProfileCount: 0,
      missingRoleCount: 0,
      duplicateEmailCount: 0,
      brokenRelationshipCount: 0,
      issues: []
    });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/data-health/scan", async (req, res) => {
  try {
    const issues = [];
    let totalAuthUsers = 0;
    const authUsersMap = /* @__PURE__ */ new Map();
    if (adminAuth) {
      try {
        let nextPageToken;
        do {
          const listResult = await adminAuth.listUsers(1e3, nextPageToken);
          listResult.users.forEach((u) => {
            totalAuthUsers++;
            authUsersMap.set(u.uid, u);
          });
          nextPageToken = listResult.pageToken;
        } while (nextPageToken);
      } catch (e) {
        console.warn("[dataHealthScan] listUsers failed:", e);
      }
    }
    let profilesList = [];
    if (adminDb) {
      const profilesSnap = await adminDb.collection("users").get();
      profilesList = profilesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      profilesList = await getFirestoreRestDocs("users");
    }
    const totalProfiles = profilesList.length;
    const profileMap = /* @__PURE__ */ new Map();
    const emailToUidMap = /* @__PURE__ */ new Map();
    profilesList.forEach((data) => {
      const uid = data.id || data.uid;
      profileMap.set(uid, data);
      if (data.email) {
        const cleanEmail = data.email.toLowerCase().trim();
        const existing = emailToUidMap.get(cleanEmail) || [];
        existing.push(uid);
        emailToUidMap.set(cleanEmail, existing);
      }
      if (!data.role) {
        issues.push({
          id: `missing_role_${uid}`,
          type: "MISSING_ROLE",
          severity: "warning",
          description: `T\xE0i kho\u1EA3n ${data.displayName || uid} ch\u01B0a c\xF3 role.`,
          uid,
          email: data.email,
          displayName: data.displayName,
          source: "firestore",
          safeToAutoRepair: true,
          suggestedAction: "G\xE1n role m\u1EB7c \u0111\u1ECBnh 'student'"
        });
      }
      if (!data.createdAt) {
        issues.push({
          id: `missing_created_at_${uid}`,
          type: "INVALID_METADATA",
          severity: "info",
          description: `Profile ${uid} thi\u1EBFu timestamp createdAt.`,
          uid,
          source: "firestore",
          safeToAutoRepair: true,
          suggestedAction: "B\u1ED5 sung th\u1EDDi gian t\u1EA1o hi\u1EC7n t\u1EA1i"
        });
      }
    });
    for (const [email, uids] of emailToUidMap.entries()) {
      if (uids.length > 1) {
        issues.push({
          id: `duplicate_email_${email}`,
          type: "DATA_CONFLICT",
          severity: "error",
          description: `Email "${email}" b\u1ECB tr\xF9ng l\u1EB7p tr\xEAn ${uids.length} t\xE0i kho\u1EA3n (${uids.join(", ")}).`,
          email,
          source: "firestore",
          safeToAutoRepair: false,
          suggestedAction: "Ki\u1EC3m tra th\u1EE7 c\xF4ng v\xE0 h\u1EE3p nh\u1EA5t/xo\xE1 t\xE0i kho\u1EA3n tr\xF9ng",
          details: { uids }
        });
      }
    }
    let validUsersCount = 0;
    let authWithoutProfileCount = 0;
    let orphanProfileCount = 0;
    if (authUsersMap.size > 0) {
      for (const [authUid, authUser] of authUsersMap.entries()) {
        if (!profileMap.has(authUid)) {
          authWithoutProfileCount++;
          issues.push({
            id: `auth_no_profile_${authUid}`,
            type: "AUTH_WITHOUT_PROFILE",
            severity: "warning",
            description: `T\xE0i kho\u1EA3n Firebase Auth (${authUser.email || authUid}) ch\u01B0a c\xF3 profile trong Firestore.`,
            uid: authUid,
            email: authUser.email,
            displayName: authUser.displayName,
            source: "auth",
            safeToAutoRepair: true,
            suggestedAction: "T\u1EA1o profile c\u01A1 b\u1EA3n t\u1EEB Auth data"
          });
        } else {
          validUsersCount++;
        }
      }
      for (const [profUid, profData] of profileMap.entries()) {
        if (!authUsersMap.has(profUid)) {
          orphanProfileCount++;
          issues.push({
            id: `orphan_profile_${profUid}`,
            type: "ORPHAN_PROFILE",
            severity: "warning",
            description: `Profile Firestore ${profUid} (${profData.displayName || profData.email || ""}) kh\xF4ng c\xF3 t\xE0i kho\u1EA3n Firebase Auth t\u01B0\u01A1ng \u1EE9ng.`,
            uid: profUid,
            email: profData.email,
            displayName: profData.displayName,
            source: "firestore",
            safeToAutoRepair: false,
            suggestedAction: "Xem x\xE9t l\u01B0u tr\u1EEF (archive) ho\u1EB7c xo\xE1 n\u1EBFu l\xE0 d\u1EEF li\u1EC7u r\xE1c c\u0169"
          });
        }
      }
    } else {
      validUsersCount = totalProfiles;
    }
    let brokenRelationshipCount = 0;
    try {
      let relList = [];
      if (adminDb) {
        const relSnap = await adminDb.collection("relationships").get();
        relList = relSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } else {
        relList = await getFirestoreRestDocs("relationships");
      }
      for (const rData of relList) {
        const studentExists = profileMap.has(rData.studentUid);
        const parentExists = profileMap.has(rData.parentUid);
        if (!studentExists || !parentExists) {
          brokenRelationshipCount++;
          issues.push({
            id: `broken_rel_${rData.id}`,
            type: "BROKEN_RELATIONSHIP",
            severity: "error",
            description: `M\u1ED1i quan h\u1EC7 li\xEAn k\u1EBFt ${rData.id} tr\u1ECF t\u1EDBi h\u1ECDc sinh (${rData.studentUid}) ho\u1EB7c ph\u1EE5 huynh (${rData.parentUid}) kh\xF4ng t\u1ED3n t\u1EA1i.`,
            source: "firestore",
            safeToAutoRepair: true,
            suggestedAction: "\u0110\xE1nh d\u1EA5u tr\u1EA1ng th\xE1i 'unlinked'",
            details: { relationshipId: rData.id, studentExists, parentExists }
          });
        }
      }
    } catch (e) {
    }
    const report = {
      scannedAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalAuthUsers,
      totalProfiles,
      validUsersCount,
      authWithoutProfileCount,
      orphanProfileCount,
      missingRoleCount: issues.filter((i) => i.type === "MISSING_ROLE").length,
      duplicateEmailCount: issues.filter((i) => i.type === "DATA_CONFLICT").length,
      brokenRelationshipCount,
      issues
    };
    if (adminDb) {
      await adminDb.collection("system").doc("data_health_report").set(report);
    } else {
      await setFirestoreRestDoc("system", "data_health_report", report);
    }
    await recordAuditLog(req.user, "DATA_REPAIRED", void 0, "system", { scannedIssuesCount: issues.length }, req);
    return res.json(report);
  } catch (err) {
    console.error("[adminRoutes] /data-health/scan error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.post("/data-health/repair", async (req, res) => {
  try {
    const { issueIds, dryRun = true } = req.body || {};
    let report = null;
    if (adminDb) {
      const healthDoc = await adminDb.collection("system").doc("data_health_report").get();
      if (healthDoc.exists) report = healthDoc.data();
    } else {
      report = await getFirestoreRestDoc("system", "data_health_report");
    }
    if (!report) {
      return res.status(400).json({ error: "no_scan", message: "Vui l\xF2ng th\u1EF1c hi\u1EC7n qu\xE9t \u0111\u1ED1i so\xE1t tr\u01B0\u1EDBc khi s\u1EEDa l\u1ED7i." });
    }
    const allIssues = report.issues || [];
    const targetIssues = Array.isArray(issueIds) && issueIds.length > 0 ? allIssues.filter((i) => issueIds.includes(i.id)) : allIssues.filter((i) => i.safeToAutoRepair);
    const plannedRepairs = [];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const issue of targetIssues) {
      if (issue.type === "MISSING_ROLE" && issue.uid) {
        plannedRepairs.push({ id: issue.id, type: "MISSING_ROLE", action: "Set default role 'student'", uid: issue.uid });
        if (!dryRun) {
          if (adminDb) {
            await adminDb.collection("users").doc(issue.uid).update({ role: "student", updatedAt: now });
          } else {
            await setFirestoreRestDoc("users", issue.uid, { role: "student", updatedAt: now });
          }
        }
      } else if (issue.type === "INVALID_METADATA" && issue.uid) {
        plannedRepairs.push({ id: issue.id, type: "INVALID_METADATA", action: "Add createdAt timestamp", uid: issue.uid });
        if (!dryRun) {
          if (adminDb) {
            await adminDb.collection("users").doc(issue.uid).update({ createdAt: now });
          } else {
            await setFirestoreRestDoc("users", issue.uid, { createdAt: now });
          }
        }
      } else if (issue.type === "AUTH_WITHOUT_PROFILE" && issue.uid) {
        plannedRepairs.push({ id: issue.id, type: "AUTH_WITHOUT_PROFILE", action: "Create skeleton Firestore profile", uid: issue.uid });
        if (!dryRun) {
          const profileData = {
            uid: issue.uid,
            email: issue.email || "",
            displayName: issue.displayName || issue.email?.split("@")[0] || "User",
            role: "student",
            accountStatus: "active",
            provider: "password",
            emailVerified: false,
            createdAt: now,
            updatedAt: now
          };
          if (adminDb) {
            await adminDb.collection("users").doc(issue.uid).set(profileData, { merge: true });
          } else {
            await setFirestoreRestDoc("users", issue.uid, profileData);
          }
        }
      } else if (issue.type === "BROKEN_RELATIONSHIP" && issue.details?.relationshipId) {
        plannedRepairs.push({ id: issue.id, type: "BROKEN_RELATIONSHIP", action: "Unlink broken relationship", relId: issue.details.relationshipId });
        if (!dryRun) {
          const updateData = {
            status: "unlinked",
            unlinkedReason: "Broken reference detected by Data Health Center",
            updatedAt: now
          };
          if (adminDb) {
            await adminDb.collection("relationships").doc(issue.details.relationshipId).update(updateData);
          } else {
            await setFirestoreRestDoc("relationships", issue.details.relationshipId, updateData);
          }
        }
      }
    }
    if (!dryRun && plannedRepairs.length > 0) {
      await recordAuditLog(req.user, "DATA_REPAIRED", void 0, "system", { repairsCount: plannedRepairs.length }, req);
    }
    return res.json({
      dryRun,
      plannedRepairsCount: plannedRepairs.length,
      repairs: plannedRepairs,
      message: dryRun ? `[Dry Run] \u0110\xE3 ph\xE1t hi\u1EC7n ${plannedRepairs.length} t\xE1c v\u1EE5 c\xF3 th\u1EC3 s\u1EEDa t\u1EF1 \u0111\u1ED9ng an to\xE0n.` : `\u0110\xE3 \xE1p d\u1EE5ng s\u1EEDa l\u1ED7i th\xE0nh c\xF4ng cho ${plannedRepairs.length} m\u1EE5c.`
    });
  } catch (err) {
    console.error("[adminRoutes] /data-health/repair error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 5));
    const actionFilter = req.query.action || "";
    const actorFilter = req.query.actor || "";
    let logs = [];
    if (adminDb) {
      let q = adminDb.collection("auditLogs");
      if (actionFilter) {
        q = q.where("action", "==", actionFilter);
      }
      if (actorFilter) {
        q = q.where("actorUid", "==", actorFilter);
      }
      const snap = await q.orderBy("timestamp", "desc").limit(limit).get().catch(async () => {
        return await q.limit(limit).get();
      });
      logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      logs = await getFirestoreRestDocs("auditLogs", limit * 5);
      if (actionFilter) {
        logs = logs.filter((l) => l.action === actionFilter);
      }
      if (actorFilter) {
        logs = logs.filter((l) => l.actorUid === actorFilter);
      }
      logs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      logs = logs.slice(0, limit);
    }
    return res.json({ items: logs, total: logs.length });
  } catch (err) {
    console.error("[adminRoutes] /audit-logs error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/system-health", async (req, res) => {
  let dbLatency = 0;
  let dbStatus = "ok";
  if (adminDb) {
    try {
      const pingStart = Date.now();
      await adminDb.collection("system").limit(1).get();
      dbLatency = Date.now() - pingStart;
    } catch (e) {
      dbStatus = "error";
    }
  } else {
    try {
      const pingStart = Date.now();
      await getFirestoreRestDocs("system", 1);
      dbLatency = Date.now() - pingStart;
      dbStatus = "ok";
    } catch (e) {
      dbStatus = "degraded";
    }
  }
  return res.json({
    status: dbStatus === "ok" ? "healthy" : "degraded",
    environment: process.env.NODE_ENV || "development",
    serverTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
      isFirebaseAdminConfigured: !!adminAuth,
      mode: adminDb ? "admin_sdk" : "rest_fallback"
    },
    version: "3.5.0-v3"
  });
});
adminRouter.get("/settings", async (req, res) => {
  try {
    let settingsData = null;
    if (adminDb) {
      const doc = await adminDb.collection("system").doc("settings").get();
      if (doc.exists) settingsData = doc.data();
    } else {
      settingsData = await getFirestoreRestDoc("system", "settings");
    }
    if (settingsData) {
      return res.json(settingsData);
    }
    const defaultSettings = {
      registrationEnabled: true,
      googleLoginEnabled: true,
      passwordLoginEnabled: true,
      requireEmailVerification: false,
      requireAdminApproval: false,
      defaultStudentStatus: "active",
      allowedEmailDomains: [],
      maintenanceMode: false,
      pageSize: 20
    };
    return res.json(defaultSettings);
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.put("/settings", requireSuperAdmin, async (req, res) => {
  try {
    const settings = req.body || {};
    settings.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    settings.updatedBy = req.user?.uid || "super_admin";
    if (adminDb) {
      await adminDb.collection("system").doc("settings").set(settings, { merge: true });
    } else {
      await setFirestoreRestDoc("system", "settings", settings);
    }
    await recordAuditLog(req.user, "ADMIN_LOGIN", void 0, "system", { updatedSettings: true }, req);
    return res.json({ success: true, message: "\u0110\xE3 l\u01B0u c\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng." });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
adminRouter.get("/wallet/overview", async (req, res) => {
  try {
    const overview = await getWalletOverview();
    return res.json({ success: true, overview });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.get("/wallet/students", async (req, res) => {
  try {
    const { search, filterStatus, className, limit, offset } = req.query;
    const result = await getStudentDebtSummaries({
      search,
      filterStatus,
      className,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });
    return res.json({ success: true, items: result.items, total: result.total });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.get("/wallet/students/:uid/details", async (req, res) => {
  try {
    const uid = req.params.uid;
    const details = await getStudentWalletDetails(uid);
    return res.json({ success: true, ...details });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.post("/wallet/sync-students", async (req, res) => {
  try {
    const result = await syncStudentsToWallets();
    await recordAuditLog(
      req.user,
      "SYNC_STUDENTS_TO_WALLETS",
      "wallets",
      "wallet_system",
      result,
      req
    );
    return res.json({
      success: true,
      message: `\u0110\u1ED3ng b\u1ED9 v\xED h\u1ECDc sinh th\xE0nh c\xF4ng! T\u1ED5ng c\u1ED9ng ${result.totalStudents} h\u1ECDc sinh (T\u1EA1o m\u1EDBi: ${result.createdCount}, C\u1EADp nh\u1EADt: ${result.updatedCount}).`,
      ...result
    });
  } catch (err) {
    return res.status(500).json({ error: "sync_error", message: err.message || String(err) });
  }
});
adminRouter.patch("/wallet/students/:uid/profile", async (req, res) => {
  try {
    const studentUid = req.params.uid;
    const { verifiedName, isVerified, fullName, currentClass } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const updated = await updateStudentWalletProfile(studentUid, {
      verifiedName,
      isVerified,
      fullName,
      currentClass,
      adminUid
    });
    await recordAuditLog(
      req.user,
      "UPDATE_STUDENT_WALLET_PROFILE",
      studentUid,
      "student_wallet",
      { verifiedName, isVerified, fullName, currentClass },
      req
    );
    return res.json({
      success: true,
      message: "C\u1EADp nh\u1EADt h\u1ED3 s\u01A1 v\xE0 t\xEAn x\xE1c th\u1EF1c v\xED h\u1ECDc sinh th\xE0nh c\xF4ng!",
      wallet: updated
    });
  } catch (err) {
    return res.status(400).json({ error: "profile_update_error", message: err.message || String(err) });
  }
});
adminRouter.get("/wallet/deposit-requests", async (req, res) => {
  try {
    const { status, search, limit } = req.query;
    const requests = await getDepositRequests({
      status,
      search,
      limit: limit ? Number(limit) : 50
    });
    return res.json({ success: true, items: requests });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.post("/wallet/deposit-requests/:id/approve", async (req, res) => {
  try {
    const requestId = req.params.id;
    const { externalCollectionNote } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await approveDepositRequest(requestId, adminUid, adminName, externalCollectionNote);
    await recordAuditLog(
      req.user,
      "APPROVE_DEPOSIT_REQUEST",
      requestId,
      "deposit_request",
      { newBalanceVnd: result.newBalanceVnd, externalCollectionNote },
      req
    );
    return res.json({
      success: true,
      message: "\u0110\xE3 ph\xEA duy\u1EC7t y\xEAu c\u1EA7u n\u1EA1p v\xE0 c\u1ED9ng ti\u1EC1n v\xE0o v\xED th\xE0nh c\xF4ng!",
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "approval_error", message: err.message || String(err) });
  }
});
adminRouter.post("/wallet/deposit-requests/:id/reject", async (req, res) => {
  try {
    const requestId = req.params.id;
    const { reason } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await rejectDepositRequest(requestId, adminUid, adminName, reason);
    await recordAuditLog(
      req.user,
      "REJECT_DEPOSIT_REQUEST",
      requestId,
      "deposit_request",
      { reason },
      req
    );
    return res.json({
      success: true,
      message: "\u0110\xE3 t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u n\u1EA1p ti\u1EC1n.",
      request: result
    });
  } catch (err) {
    return res.status(400).json({ error: "rejection_error", message: err.message || String(err) });
  }
});
adminRouter.post("/wallet/students/:uid/collections", async (req, res) => {
  try {
    const studentUid = req.params.uid;
    const { amountVnd, collectionDate, paymentMethod, referenceCode, note, creditToWallet } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await recordManualCashCollection(adminUid, adminName, studentUid, {
      amountVnd: Number(amountVnd),
      collectionDate,
      paymentMethod,
      referenceCode,
      note,
      creditToWallet: Boolean(creditToWallet)
    });
    await recordAuditLog(
      req.user,
      "MANUAL_CASH_COLLECTION",
      studentUid,
      "student_wallet",
      { amountVnd, paymentMethod, creditToWallet, note },
      req
    );
    return res.json({
      success: true,
      message: "\u0110\xE3 ghi nh\u1EADn kho\u1EA3n thu ti\u1EC1n ngo\xE0i h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng!",
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "collection_error", message: err.message || String(err) });
  }
});
adminRouter.post("/wallet/students/:uid/debt-adjustments", async (req, res) => {
  try {
    const studentUid = req.params.uid;
    const { amountVnd, type, reason } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await adjustStudentDebt(adminUid, adminName, studentUid, {
      amountVnd: Number(amountVnd),
      type,
      reason
    });
    await recordAuditLog(
      req.user,
      "ADJUST_STUDENT_DEBT",
      studentUid,
      "student_debt",
      { amountVnd, type, reason },
      req
    );
    return res.json({
      success: true,
      message: "\u0110\xE3 c\u1EADp nh\u1EADt \u0111i\u1EC1u ch\u1EC9nh c\xF4ng n\u1EE3 th\xE0nh c\xF4ng!",
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "debt_adjustment_error", message: err.message || String(err) });
  }
});
adminRouter.post("/exam-entitlements/grant", async (req, res) => {
  try {
    const { studentUid, examId, action, reason } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await grantOrRevokeExamEntitlement(
      adminUid,
      adminName,
      studentUid,
      examId,
      action || "grant",
      reason
    );
    await recordAuditLog(
      req.user,
      action === "revoke" ? "REVOKE_EXAM_ENTITLEMENT" : "GRANT_EXAM_ENTITLEMENT",
      studentUid,
      "exam_entitlement",
      { examId, action, reason },
      req
    );
    return res.json({
      success: true,
      message: action === "revoke" ? "\u0110\xE3 thu h\u1ED3i quy\u1EC1n truy c\u1EADp b\xE0i thi." : "\u0110\xE3 c\u1EA5p quy\u1EC1n truy c\u1EADp b\xE0i thi th\xE0nh c\xF4ng!",
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "entitlement_grant_error", message: err.message || String(err) });
  }
});
adminRouter.post("/exams/merge", async (req, res) => {
  try {
    const payload = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await mergeExams({
      ...payload,
      actorUid: adminUid,
      actorName: adminName
    });
    return res.status(201).json({
      success: true,
      message: `\u0110\xE3 g\u1ED9p ${payload.sourceExamIds?.length || 0} b\xE0i thi th\xE0nh c\xF4ng!`,
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "merge_error", message: err.message || String(err) });
  }
});
adminRouter.post("/wallets/:uid/direct-edit", async (req, res) => {
  try {
    const studentUid = req.params.uid;
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const payload = req.body || {};
    const result = await adminDirectEditWallet(adminUid, adminName, studentUid, payload);
    await recordAuditLog(
      req.user,
      "DIRECT_EDIT_WALLET",
      studentUid,
      "student_wallet",
      payload,
      req
    );
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: "wallet_edit_error", message: err.message || String(err) });
  }
});
adminRouter.get("/vouchers", async (req, res) => {
  try {
    const items = await getVouchersList();
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.post("/vouchers", async (req, res) => {
  try {
    const voucher = await createVoucher(req.body || {});
    await recordAuditLog(
      req.user,
      "CREATE_VOUCHER",
      voucher.id,
      "voucher",
      voucher,
      req
    );
    return res.status(201).json({ success: true, voucher, message: "T\u1EA1o voucher m\u1EDBi th\xE0nh c\xF4ng!" });
  } catch (err) {
    return res.status(400).json({ error: "create_voucher_error", message: err.message || String(err) });
  }
});
adminRouter.patch("/vouchers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const voucher = await updateVoucher(id, req.body || {});
    await recordAuditLog(
      req.user,
      "UPDATE_VOUCHER",
      id,
      "voucher",
      req.body,
      req
    );
    return res.json({ success: true, voucher, message: "C\u1EADp nh\u1EADt voucher th\xE0nh c\xF4ng!" });
  } catch (err) {
    return res.status(400).json({ error: "update_voucher_error", message: err.message || String(err) });
  }
});
adminRouter.delete("/vouchers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await deleteVoucher(id);
    await recordAuditLog(
      req.user,
      "DELETE_VOUCHER",
      id,
      "voucher",
      { id },
      req
    );
    return res.json({ success: true, message: "\u0110\xE3 x\xF3a voucher th\xE0nh c\xF4ng!" });
  } catch (err) {
    return res.status(400).json({ error: "delete_voucher_error", message: err.message || String(err) });
  }
});
export {
  adminRouter,
  invalidateUserListCache
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
