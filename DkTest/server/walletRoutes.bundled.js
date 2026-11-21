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
var UNCACHED_COLLECTIONS = /* @__PURE__ */ new Set();
async function queryFirestoreRestDocs(collectionName, field, value, limitCount = 20, useCache = true, cacheTtlMs = 2e4) {
  if (!collectionName || !field || value === void 0) {
    return [];
  }
  const safeLimit = Math.min(Math.max(limitCount, 1), 100);
  const cacheKey = `query_${collectionName}_${field}_${JSON.stringify(value)}_${safeLimit}`;
  const now = Date.now();
  const shouldCache = useCache && !UNCACHED_COLLECTIONS.has(collectionName);
  if (shouldCache) {
    const cached = serverRestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log(
        `[Server Firestore CACHE_HIT: 0 reads] Query: "${collectionName}" WHERE ${field} == ${JSON.stringify(value)} | Cached docs: ${cached.data.length} | TTL: ${Math.round((cached.expiresAt - now) / 1e3)}s`
      );
      return cached.data;
    }
  }
  const apiKey = getFirebaseApiKey();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  const t0 = Date.now();
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const structuredQuery = {
      from: [{ collectionId: collectionName }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: "EQUAL",
          value: encodeFirestoreValue(value)
        }
      },
      limit: safeLimit
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery })
    });
    const elapsed = Date.now() - t0;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        `[Server Firestore QUERY_FAIL] Collection: "${collectionName}" WHERE ${field} == ${JSON.stringify(value)} | Status: ${res.status} | Elapsed: ${elapsed}ms | Body: ${errText}`
      );
      return [];
    }
    const raw = await res.json();
    const docs = (Array.isArray(raw) ? raw : []).filter((row) => row && row.document).map((row) => decodeFirestoreDocument(row.document)).filter(Boolean);
    console.log(
      `[Server Firestore QUERY: ${docs.length} docs] Collection: "${collectionName}" WHERE ${field} == ${JSON.stringify(value)} (limit: ${safeLimit}) | Elapsed: ${elapsed}ms`
    );
    if (shouldCache) {
      serverRestCache.set(cacheKey, { data: docs, expiresAt: now + cacheTtlMs });
    }
    return docs;
  } catch (err) {
    console.error(`[Server Firestore QUERY ERROR] Collection: "${collectionName}":`, err);
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

// server/middleware/auth.ts
async function requireAuth(req, res, next) {
  if (req.method === "OPTIONS") return next();
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
  if (!token || /^(student_|dk_admin_)/.test(token)) return res.status(401).json({ error: "unauthorized", message: "C\u1EA7n \u0111\u0103ng nh\u1EADp b\u1EB1ng t\xE0i kho\u1EA3n Firebase h\u1EE3p l\u1EC7." });
  try {
    let identity;
    if (adminAuth) {
      const decoded = await adminAuth.verifyIdToken(token);
      identity = { uid: decoded.uid, email: decoded.email, name: decoded.name, role: decoded.role, accountStatus: decoded.accountStatus };
    } else {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(getFirebaseApiKey())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        signal: AbortSignal.timeout(1e4)
      });
      if (!response.ok) throw new Error("invalid_token");
      const account = (await response.json()).users?.[0];
      if (!account?.localId || account.disabled) throw new Error("invalid_token");
      identity = { uid: account.localId, email: account.email, name: account.displayName };
    }
    let profile = null;
    if (adminDb) {
      const snapshot = await adminDb.collection("users").doc(identity.uid).get();
      profile = snapshot.exists ? snapshot.data() : null;
    } else {
      const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
      const response = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${encodeURIComponent(identity.uid)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(1e4)
      });
      if (response.ok) profile = decodeFirestoreDocument(await response.json());
      else if (response.status !== 404) throw new Error("profile_unavailable");
    }
    const status = profile?.accountStatus || identity.accountStatus || "active";
    if (["suspended", "disabled", "deleted"].includes(status)) return res.status(403).json({ error: "account_suspended", message: "T\xE0i kho\u1EA3n \u0111\xE3 b\u1ECB v\xF4 hi\u1EC7u h\xF3a." });
    req.user = { uid: identity.uid, email: identity.email, role: profile?.role || identity.role || "student", displayName: profile?.displayName || identity.name, accountStatus: status };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token", message: "Kh\xF4ng x\xE1c minh \u0111\u01B0\u1EE3c phi\xEAn \u0111\u0103ng nh\u1EADp. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i." });
  }
}

// server/services/voucherService.ts
var cachedVouchersList = null;
var VOUCHERS_TTL_MS = 60 * 1e3;
function invalidateVouchersCache() {
  cachedVouchersList = null;
}
var voucherUsagesCache = /* @__PURE__ */ new Map();
var USAGES_TTL_MS = 60 * 1e3;
function invalidateVoucherUsagesCache(voucherId) {
  if (voucherId) {
    voucherUsagesCache.delete(voucherId);
    voucherUsagesCache.delete("__all__");
  } else {
    voucherUsagesCache.clear();
  }
}
function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
async function getVoucherByCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  if (adminDb) {
    const snap = await adminDb.collection("vouchers").where("code", "==", code).limit(1).get();
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
  } else {
    const docs = await queryFirestoreRestDocs("vouchers", "code", code, 1);
    if (docs.length > 0) return docs[0];
  }
  return null;
}
function buildContextMismatchMessageServer(voucherType, context) {
  const isDiscount = voucherType === "discount_percent" || voucherType === "discount_fixed";
  const isDepositBonus = voucherType === "deposit_bonus_percent" || voucherType === "deposit_bonus_fixed";
  if (context === "deposit") {
    if (isDiscount) {
      return "M\xE3 n\xE0y l\xE0 Voucher gi\u1EA3m gi\xE1 m\u1EDF kh\xF3a \u0111\u1EC1 thi / kh\xF3a h\u1ECDc \u2014 kh\xF4ng \xE1p d\u1EE5ng khi n\u1EA1p ti\u1EC1n! Vui l\xF2ng d\xF9ng m\xE3 n\xE0y \u1EDF b\u01B0\u1EDBc m\u1EDF kh\xF3a \u0111\u1EC1 thi ho\u1EB7c kh\xF3a h\u1ECDc.";
    }
    if (voucherType === "gift_money") {
      return "M\xE3 n\xE0y l\xE0 Voucher t\u1EB7ng ti\u1EC1n th\u1EB3ng v\xE0o v\xED \u2014 h\xE3y nh\u1EADp \u1EDF m\u1EE5c 'Nh\u1EADp m\xE3 Voucher qu\xE0 t\u1EB7ng' ph\xEDa tr\xEAn \u0111\u1EC3 nh\u1EADn ti\u1EC1n ngay!";
    }
    return "M\xE3 n\xE0y kh\xF4ng \xE1p d\u1EE5ng \u01B0u \u0111\xE3i khi n\u1EA1p ti\u1EC1n.";
  }
  if (context === "exam_unlock" || context === "course_unlock") {
    const itemLabel = context === "course_unlock" ? "kh\xF3a h\u1ECDc / b\xE0i gi\u1EA3ng" : "\u0111\u1EC1 thi";
    if (isDepositBonus) {
      return `M\xE3 n\xE0y l\xE0 Voucher th\u01B0\u1EDFng n\u1EA1p ti\u1EC1n \u2014 kh\xF4ng \xE1p d\u1EE5ng \u0111\u1EC3 gi\u1EA3m gi\xE1 m\u1EDF kh\xF3a ${itemLabel}! Vui l\xF2ng d\xF9ng m\xE3 n\xE0y t\u1EA1i trang V\xED DkTEST khi n\u1EA1p ti\u1EC1n.`;
    }
    if (voucherType === "gift_money") {
      return `M\xE3 n\xE0y l\xE0 Voucher t\u1EB7ng ti\u1EC1n tr\u1EF1c ti\u1EBFp v\xE0o v\xED \u2014 h\xE3y v\xE0o trang V\xED DkTEST \u0111\u1EC3 nh\u1EADn ti\u1EC1n th\u1EB3ng v\xE0o v\xED tr\u01B0\u1EDBc r\u1ED3i m\u1EDF kh\xF3a ${itemLabel}!`;
    }
    return `M\xE3 n\xE0y kh\xF4ng \xE1p d\u1EE5ng \u0111\u1EC3 gi\u1EA3m gi\xE1 m\u1EDF kh\xF3a ${itemLabel}.`;
  }
  if (context === "gift_money") {
    if (isDiscount) {
      return "\u0110\xE2y l\xE0 Voucher gi\u1EA3m gi\xE1 m\u1EDF kh\xF3a \u0111\u1EC1 thi / kh\xF3a h\u1ECDc (kh\xF4ng ph\u1EA3i m\xE3 t\u1EB7ng ti\u1EC1n th\u1EB3ng). H\xE3y b\u1EA5m 'L\u01B0u voucher' \u0111\u1EC3 d\xF9ng khi m\u1EDF kh\xF3a!";
    }
    if (isDepositBonus) {
      return "\u0110\xE2y l\xE0 Voucher th\u01B0\u1EDFng khi n\u1EA1p ti\u1EC1n (kh\xF4ng ph\u1EA3i m\xE3 t\u1EB7ng ti\u1EC1n th\u1EB3ng). H\xE3y b\u1EA5m 'L\u01B0u voucher' \u0111\u1EC3 \xE1p d\u1EE5ng khi n\u1EA1p V\xED DkTEST!";
    }
    return "M\xE3 n\xE0y kh\xF4ng ph\u1EA3i m\xE3 qu\xE0 t\u1EB7ng n\u1EA1p ti\u1EC1n tr\u1EF1c ti\u1EBFp.";
  }
  return "Lo\u1EA1i \u01B0u \u0111\xE3i kh\xF4ng ph\xF9 h\u1EE3p.";
}
async function inspectVoucher(rawCode, uid) {
  const code = normalizeCode(rawCode);
  if (!code) {
    return { found: false, message: "Vui l\xF2ng nh\u1EADp m\xE3 voucher." };
  }
  const voucher = await getVoucherByCode(code);
  if (!voucher) {
    return { found: false, message: `M\xE3 voucher "${code}" kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a.` };
  }
  const expTime = voucher.expiresAt ? new Date(voucher.expiresAt).getTime() : NaN;
  const isExpired = !isNaN(expTime) && expTime < Date.now();
  const isOutOfStock = Boolean(
    voucher.usageLimit && voucher.usageLimit > 0 && (voucher.usedCount || 0) >= voucher.usageLimit
  );
  let userUsedCount = 0;
  if (uid) {
    if (adminDb) {
      const usagesSnap = await adminDb.collection("voucher_usages").where("voucherId", "==", voucher.id).where("uid", "==", uid).get();
      userUsedCount = usagesSnap.size;
    } else {
      const usages = await queryFirestoreRestDocs("voucher_usages", "voucherId", voucher.id, 50);
      userUsedCount = (usages || []).filter((u) => u.uid === uid).length;
    }
  }
  const perUserLimit = voucher.perUserLimit || 1;
  return {
    found: true,
    voucher,
    isExpired,
    isOutOfStock,
    userUsedCount,
    alreadyUsedByUser: userUsedCount >= perUserLimit
  };
}
async function recordVoucherSave(rawCode) {
  const voucher = await getVoucherByCode(rawCode);
  if (!voucher) {
    throw new Error(`M\xE3 voucher "${normalizeCode(rawCode)}" kh\xF4ng t\u1ED3n t\u1EA1i.`);
  }
  if (voucher.type === "gift_money") {
    throw new Error("M\xE3 n\xE0y l\xE0 voucher qu\xE0 t\u1EB7ng c\u1ED9ng ti\u1EC1n tr\u1EF1c ti\u1EBFp, kh\xF4ng c\u1EA7n l\u01B0u.");
  }
  if (!voucher.isActive) {
    throw new Error("M\xE3 voucher n\xE0y hi\u1EC7n \u0111ang b\u1ECB t\u1EA1m kh\xF3a.");
  }
  if (voucher.expiresAt) {
    const expTime = new Date(voucher.expiresAt).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      throw new Error("M\xE3 voucher n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng.");
    }
  }
  const nextSavedCount = Math.max(0, Number(voucher.savedCount) || 0) + 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (adminDb) {
    await adminDb.collection("vouchers").doc(voucher.id).set({ savedCount: nextSavedCount, updatedAt: now }, { merge: true });
  } else {
    await setFirestoreRestDoc("vouchers", voucher.id, {
      ...voucher,
      savedCount: nextSavedCount,
      updatedAt: now
    });
  }
  invalidateVouchersCache();
  return {
    success: true,
    voucher: { ...voucher, savedCount: nextSavedCount, updatedAt: now },
    savedCount: nextSavedCount
  };
}
async function validateVoucher(params) {
  const code = normalizeCode(params.code);
  if (!code) {
    return { valid: false, message: "Vui l\xF2ng nh\u1EADp m\xE3 voucher." };
  }
  const voucher = await getVoucherByCode(code);
  if (!voucher) {
    return { valid: false, message: `M\xE3 voucher "${code}" kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n.` };
  }
  if (!voucher.isActive) {
    return { valid: false, message: "M\xE3 voucher n\xE0y hi\u1EC7n \u0111ang b\u1ECB t\u1EA1m kh\xF3a." };
  }
  if (voucher.expiresAt) {
    const expTime = new Date(voucher.expiresAt).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      return { valid: false, message: "M\xE3 voucher n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n s\u1EED d\u1EE5ng." };
    }
  }
  if (voucher.usageLimit && voucher.usageLimit > 0 && (voucher.usedCount || 0) >= voucher.usageLimit) {
    return { valid: false, message: "M\xE3 voucher n\xE0y \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng." };
  }
  if (params.uid) {
    let userUsedCount = 0;
    if (adminDb) {
      const usagesSnap = await adminDb.collection("voucher_usages").where("voucherId", "==", voucher.id).where("uid", "==", params.uid).get();
      userUsedCount = usagesSnap.size;
    } else {
      const usages = await queryFirestoreRestDocs("voucher_usages", "voucherId", voucher.id, 50);
      userUsedCount = (usages || []).filter((u) => u.uid === params.uid).length;
    }
    const perUserLimit = voucher.perUserLimit || 1;
    if (userUsedCount >= perUserLimit) {
      return { valid: false, message: `B\u1EA1n \u0111\xE3 s\u1EED d\u1EE5ng m\xE3 n\xE0y ${userUsedCount}/${perUserLimit} l\u1EA7n t\u1ED1i \u0111a.` };
    }
  }
  const baseAmount = Math.max(0, params.amountVnd || 0);
  if (params.context === "gift_money") {
    if (voucher.type !== "gift_money") {
      return {
        valid: false,
        voucher,
        voucherType: voucher.type,
        message: buildContextMismatchMessageServer(voucher.type, "gift_money")
      };
    }
    return {
      valid: true,
      voucher,
      voucherType: voucher.type,
      bonusVnd: voucher.value,
      message: `M\xE3 h\u1EE3p l\u1EC7! Nh\u1EADn ngay +${voucher.value.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED.`
    };
  }
  if (params.context === "exam_unlock" || params.context === "course_unlock") {
    const itemLabel = params.context === "course_unlock" ? "kh\xF3a h\u1ECDc / b\xE0i gi\u1EA3ng" : "b\xE0i thi";
    if (voucher.type !== "discount_percent" && voucher.type !== "discount_fixed") {
      return {
        valid: false,
        voucher,
        voucherType: voucher.type,
        message: buildContextMismatchMessageServer(voucher.type, params.context)
      };
    }
    if (voucher.minOrderVnd && baseAmount < voucher.minOrderVnd) {
      return {
        valid: false,
        voucher,
        voucherType: voucher.type,
        message: `M\xE3 n\xE0y ch\u1EC9 \xE1p d\u1EE5ng cho ${itemLabel} c\xF3 gi\xE1 t\u1EEB ${voucher.minOrderVnd.toLocaleString("vi-VN")}\u0111 tr\u1EDF l\xEAn.`
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
      voucherType: voucher.type,
      discountVnd,
      finalPriceVnd,
      message: `\xC1p d\u1EE5ng th\xE0nh c\xF4ng! Gi\u1EA3m ${discountVnd.toLocaleString("vi-VN")}\u0111 (c\xF2n ${finalPriceVnd.toLocaleString("vi-VN")}\u0111).`
    };
  }
  if (params.context === "deposit") {
    if (voucher.type !== "deposit_bonus_percent" && voucher.type !== "deposit_bonus_fixed") {
      return {
        valid: false,
        voucher,
        voucherType: voucher.type,
        message: buildContextMismatchMessageServer(voucher.type, "deposit")
      };
    }
    if (voucher.minDepositVnd && baseAmount < voucher.minDepositVnd) {
      return {
        valid: false,
        voucher,
        voucherType: voucher.type,
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
      voucherType: voucher.type,
      bonusVnd,
      message: `M\xE3 n\u1EA1p h\u1EE3p l\u1EC7! B\u1EA1n s\u1EBD \u0111\u01B0\u1EE3c t\u1EB7ng th\xEAm +${bonusVnd.toLocaleString("vi-VN")}\u0111 v\xE0o v\xED.`
    };
  }
  return { valid: false, message: "Lo\u1EA1i \u01B0u \u0111\xE3i kh\xF4ng ph\xF9 h\u1EE3p." };
}
async function redeemGiftVoucher(code, uid) {
  const validation = await validateVoucher({ code, uid, context: "gift_money" });
  if (!validation.valid || !validation.voucher || !validation.bonusVnd) {
    const vCheck = await getVoucherByCode(code);
    if (vCheck && vCheck.type !== "gift_money") {
      const w = await getOrCreateWallet(uid);
      return {
        success: true,
        addedVnd: 0,
        newBalanceVnd: w.balanceVnd,
        voucher: vCheck
      };
    }
    throw new Error(validation.message || "M\xE3 qu\xE0 t\u1EB7ng kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const voucher = validation.voucher;
  const addedVnd = validation.bonusVnd;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let finalBalance = 0;
  if (adminDb) {
    await adminDb.runTransaction(async (transaction) => {
      const vRef = adminDb.collection("vouchers").doc(voucher.id);
      const vSnap = await transaction.get(vRef);
      if (!vSnap.exists) throw new Error("Voucher kh\xF4ng t\u1ED3n t\u1EA1i.");
      const vData = vSnap.data();
      if (vData.usageLimit && vData.usageLimit > 0 && (vData.usedCount || 0) >= vData.usageLimit) {
        throw new Error("M\xE3 qu\xE0 t\u1EB7ng \u0111\xE3 h\u1EBFt l\u01B0\u1EE3t s\u1EED d\u1EE5ng.");
      }
      const wRef = adminDb.collection("wallets").doc(uid);
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
      const usageRef = adminDb.collection("voucher_usages").doc(usageId);
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
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
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
  } else {
    const wData = await getFirestoreRestDoc("wallets", uid, false);
    const prevBalance = wData?.balanceVnd || 0;
    finalBalance = prevBalance + addedVnd;
    const fullName = wData?.fullName || "";
    const currentClass = wData?.currentClass || "";
    await setFirestoreRestDoc("wallets", uid, {
      ...wData,
      uid,
      balanceVnd: finalBalance,
      totalCreditedVnd: (wData?.totalCreditedVnd || 0) + addedVnd,
      updatedAt: now
    });
    await setFirestoreRestDoc("vouchers", voucher.id, {
      ...voucher,
      usedCount: (voucher.usedCount || 0) + 1,
      updatedAt: now
    });
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
    await setFirestoreRestDoc("voucher_usages", usageId, usageDoc);
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
    await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
  }
  invalidateVouchersCache();
  invalidateVoucherUsagesCache();
  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(uid);
  updateWalletOverviewAggregates({
    deltaVirtualBalanceVnd: addedVnd,
    deltaConfirmedCreditedVnd: addedVnd
  }).catch(() => {
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
function parseTimestampMs(val) {
  if (!val) return 0;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  if (typeof val?.seconds === "number") return val.seconds * 1e3 + Math.floor((val.nanoseconds || 0) / 1e6);
  if (typeof val?._seconds === "number") return val._seconds * 1e3 + Math.floor((val._nanoseconds || 0) / 1e6);
  if (val instanceof Date) return val.getTime();
  if (typeof val === "number") return val < 1e11 ? val * 1e3 : val;
  const d = new Date(val);
  const ms = d.getTime();
  return isNaN(ms) ? 0 : ms;
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
  if (adminDb) {
    await adminDb.collection("wallets").doc(uid).update(updates);
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
  if (cleanKey && adminDb) {
    const existingSnap = await adminDb.collection("deposit_requests").where("idempotencyKey", "==", cleanKey).where("uid", "==", uid).limit(1).get();
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
  if (adminDb) {
    await adminDb.runTransaction(async (transaction) => {
      const walletRef = adminDb.collection("wallets").doc(uid);
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
      const reqRef = adminDb.collection("deposit_requests").doc(requestId);
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
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
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
      const debtRef = adminDb.collection("debt_records").doc(debtId);
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
        const vRef = adminDb.collection("vouchers").doc(appliedVoucher.id);
        const vSnap = await transaction.get(vRef);
        if (vSnap.exists) {
          const vData = vSnap.data();
          transaction.update(vRef, {
            usedCount: (vData.usedCount || 0) + 1,
            updatedAt: now
          });
        }
        const usageRef = adminDb.collection("voucher_usages").doc(usageId);
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
      const notifRef = adminDb.collection("notifications").doc(notifId);
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
  if (appliedVoucher) {
    invalidateVouchersCache();
    invalidateVoucherUsagesCache();
  }
  invalidateWalletOverviewCache();
  invalidateDebtSummariesCache();
  invalidateDepositRequestsCache();
  invalidateStudentDetailsCache(uid);
  updateWalletOverviewAggregates({
    deltaVirtualBalanceVnd: totalCreditToAdd,
    deltaConfirmedCreditedVnd: totalCreditToAdd,
    deltaOutstandingDebtVnd: cleanAmount,
    newRecentRequest: requestDoc
  }).catch(() => {
  });
  return requestDoc;
}
var examAccessCache = /* @__PURE__ */ new Map();
var EXAM_ACCESS_TTL_MS = 60 * 1e3;
function invalidateExamAccessCache(uid, examId) {
  if (uid && examId) {
    for (const key of examAccessCache.keys()) {
      if (key.includes(examId) && key.includes(uid)) {
        examAccessCache.delete(key);
      }
    }
  } else if (examId) {
    for (const key of examAccessCache.keys()) {
      if (key.includes(examId)) {
        examAccessCache.delete(key);
      }
    }
  } else if (uid) {
    for (const key of examAccessCache.keys()) {
      if (key.startsWith(uid)) {
        examAccessCache.delete(key);
      }
    }
  } else {
    examAccessCache.clear();
  }
}
async function checkExamAccess(uid, examId, userRole, force = false) {
  if (!examId) throw new Error("M\xE3 b\xE0i thi kh\xF4ng h\u1EE3p l\u1EC7.");
  const cacheKey = `${uid || "anon"}_${examId}_${userRole || "student"}`;
  if (!force && examAccessCache.has(cacheKey)) {
    const entry = examAccessCache.get(cacheKey);
    if (Date.now() - entry.timestamp < EXAM_ACCESS_TTL_MS) {
      return entry.data;
    }
  }
  const cacheAndReturn = (result) => {
    examAccessCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  };
  let examData = null;
  if (adminDb) {
    const snap = await adminDb.collection("exams").doc(examId).get();
    if (snap.exists) examData = snap.data();
  } else {
    examData = await getFirestoreRestDoc("exams", examId);
  }
  if (!examData) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi.");
  }
  const accessMode = examData.accessMode || "free";
  const priceVnd = sanitizeVnd(examData.priceVnd);
  const salesEnabled = examData.salesEnabled !== false;
  const isFree = accessMode !== "paid" && priceVnd <= 0;
  const examTitle = examData.title || "B\xE0i thi";
  if (userRole === "admin" || userRole === "super_admin") {
    return cacheAndReturn({
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
    });
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
      if (adminDb) {
        const snap = await adminDb.collection("exams").doc(pId).get();
        if (snap.exists) pData = snap.data();
      } else {
        pData = await getFirestoreRestDoc("exams", pId);
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
      return cacheAndReturn({
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
      });
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
        if (adminDb) {
          const uSnap = await adminDb.collection("users").doc(uid).get();
          if (uSnap.exists) currentUsername = uSnap.data()?.username || "";
        } else {
          const uDoc = await getFirestoreRestDoc("users", uid);
          if (uDoc) currentUsername = uDoc.username || "";
        }
        if (currentUsername && currentUsername.trim().toLowerCase() === creatorUsername.trim().toLowerCase()) {
          usernameMatches = true;
        }
      }
      if ((creatorUid || allowedUid) && !uidMatches && !usernameMatches) {
        return cacheAndReturn({
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
        });
      }
    }
    if (hasPaidSource && uid) {
      for (const p of paidSources) {
        const parentEntitlementId = `${uid}_${p.id}`;
        let parentEntitlement = null;
        if (adminDb) {
          const peSnap = await adminDb.collection("exam_entitlements").doc(parentEntitlementId).get();
          if (peSnap.exists) parentEntitlement = peSnap.data();
        } else {
          parentEntitlement = await getFirestoreRestDoc("exam_entitlements", parentEntitlementId);
        }
        const isParentUnlocked = Boolean(parentEntitlement && parentEntitlement.status === "active");
        if (!isParentUnlocked) {
          const wallet2 = await getOrCreateWallet(uid);
          const userBalance2 = sanitizeVnd(wallet2.balanceVnd);
          return cacheAndReturn({
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
          });
        }
      }
    }
    return cacheAndReturn({
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
    });
  }
  if (isFree) {
    return cacheAndReturn({
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
    });
  }
  if (!uid) {
    return cacheAndReturn({
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
    });
  }
  const entitlementId = `${uid}_${examId}`;
  let entitlement = null;
  if (adminDb) {
    const entSnap = await adminDb.collection("exam_entitlements").doc(entitlementId).get();
    if (entSnap.exists) entitlement = entSnap.data();
  } else {
    entitlement = await getFirestoreRestDoc("exam_entitlements", entitlementId);
  }
  const isUnlocked = Boolean(entitlement && entitlement.status === "active");
  const wallet = await getOrCreateWallet(uid);
  const userBalance = sanitizeVnd(wallet.balanceVnd);
  const missingVnd = Math.max(0, priceVnd - userBalance);
  const canUnlock = userBalance >= priceVnd;
  return cacheAndReturn({
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
  });
}
async function unlockExam(uid, examId, idempotencyKey, voucherCode) {
  if (!uid) throw new Error("Ch\u01B0a \u0111\u0103ng nh\u1EADp.");
  if (!examId) throw new Error("M\xE3 b\xE0i thi kh\xF4ng h\u1EE3p l\u1EC7.");
  const entitlementId = `${uid}_${examId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (adminDb) {
    const txResult = await adminDb.runTransaction(async (transaction) => {
      const examRef = adminDb.collection("exams").doc(examId);
      const examDoc = await transaction.get(examRef);
      if (!examDoc.exists) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi.");
      const examData2 = examDoc.data();
      const accessMode = examData2.accessMode || "free";
      const priceVnd2 = sanitizeVnd(examData2.priceVnd);
      const salesEnabled = examData2.salesEnabled !== false;
      if (accessMode !== "paid" && priceVnd2 <= 0) {
        const entRef2 = adminDb.collection("exam_entitlements").doc(entitlementId);
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
        const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
        const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
        return { success: true, newBalanceVnd: bal, entitlement: freeEnt, alreadyUnlocked: true, effectivePrice: 0, appliedVoucher: null };
      }
      if (!salesEnabled) {
        throw new Error("B\xE0i thi hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng b\xE1n quy\u1EC1n truy c\u1EADp.");
      }
      const entRef = adminDb.collection("exam_entitlements").doc(entitlementId);
      const entDoc = await transaction.get(entRef);
      if (entDoc.exists) {
        const entData = entDoc.data();
        if (entData.status === "active") {
          const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
          const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
          return { success: true, newBalanceVnd: bal, entitlement: entData, alreadyUnlocked: true, effectivePrice: 0, appliedVoucher: null };
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
      const walletRef = adminDb.collection("wallets").doc(uid);
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
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const ledgerEntry2 = {
        id: txId,
        uid,
        type: "exam_unlock_debit",
        amountVnd: effectivePrice2,
        balanceBeforeVnd: currentBal,
        balanceAfterVnd: newBalance2,
        examId,
        examTitleSnapshot: examData2.title || "B\xE0i thi",
        studentNameSnapshot: fullName || "Th\xED sinh",
        studentClassSnapshot: currentClass || "",
        idempotencyKey: idempotencyKey || txId,
        actorUid: uid,
        actorName: fullName || "Th\xED sinh",
        note: discountVnd2 > 0 ? `M\u1EDF kh\xF3a v\u0129nh vi\u1EC5n b\xE0i thi "${examData2.title}": -${effectivePrice2.toLocaleString("vi-VN")}\u0111 (\u0111\xE3 gi\u1EA3m ${discountVnd2.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher2?.code})` : `M\u1EDF kh\xF3a v\u0129nh vi\u1EC5n b\xE0i thi "${examData2.title}": -${effectivePrice2.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      };
      transaction.set(txRef, ledgerEntry2);
      if (appliedVoucher2) {
        const vRef = adminDb.collection("vouchers").doc(appliedVoucher2.id);
        const vSnap = await transaction.get(vRef);
        if (vSnap.exists) {
          const vData = vSnap.data();
          transaction.update(vRef, {
            usedCount: (vData.usedCount || 0) + 1,
            updatedAt: now
          });
        }
        const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const usageRef = adminDb.collection("voucher_usages").doc(usageId);
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
        entitlement: entitlement2,
        effectivePrice: effectivePrice2,
        appliedVoucher: appliedVoucher2
      };
    });
    if (txResult.appliedVoucher) {
      invalidateVouchersCache();
      invalidateVoucherUsagesCache();
    }
    invalidateWalletOverviewCache();
    invalidateGlobalSpendingCache();
    invalidateStudentDetailsCache(uid);
    invalidateExamAccessCache(uid, examId);
    if (txResult.effectivePrice) {
      updateWalletOverviewAggregates({
        deltaVirtualBalanceVnd: -txResult.effectivePrice,
        deltaUnlockedSpendingVnd: txResult.effectivePrice
      }).catch(() => {
      });
    }
    return {
      success: txResult.success,
      newBalanceVnd: txResult.newBalanceVnd,
      entitlement: txResult.entitlement,
      alreadyUnlocked: txResult.alreadyUnlocked
    };
  }
  const examData = await getFirestoreRestDoc("exams", examId);
  if (!examData) throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i thi.");
  const priceVnd = sanitizeVnd(examData.priceVnd);
  const existingEnt = await getFirestoreRestDoc("exam_entitlements", entitlementId);
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
    invalidateVouchersCache();
    invalidateVoucherUsagesCache();
  }
  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(uid);
  invalidateExamAccessCache(uid, examId);
  updateWalletOverviewAggregates({
    deltaVirtualBalanceVnd: -effectivePrice,
    deltaUnlockedSpendingVnd: effectivePrice
  }).catch(() => {
  });
  return { success: true, newBalanceVnd: newBalance, entitlement };
}
var walletOverviewCache = null;
var WALLET_OVERVIEW_TTL_MS = 180 * 1e3;
function invalidateWalletOverviewCache() {
  walletOverviewCache = null;
}
async function updateWalletOverviewAggregates(delta) {
  walletOverviewCache = null;
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (adminDb) {
      const docRef = adminDb.collection("system_stats").doc("wallet_overview");
      await adminDb.runTransaction(async (t) => {
        const snap = await t.get(docRef);
        if (!snap.exists) return;
        const current = snap.data();
        let recent = current.recentRequests || [];
        if (delta.newRecentRequest) {
          recent = [delta.newRecentRequest, ...recent.filter((r) => r.id !== delta.newRecentRequest.id)].slice(0, 10);
        }
        const updated = {
          totalWallets: Math.max(0, (current.totalWallets || 0) + (delta.deltaWalletsCount || 0)),
          totalVirtualBalanceVnd: Math.max(0, (current.totalVirtualBalanceVnd || 0) + (delta.deltaVirtualBalanceVnd || 0)),
          totalConfirmedCreditedVnd: Math.max(0, (current.totalConfirmedCreditedVnd || 0) + (delta.deltaConfirmedCreditedVnd || 0)),
          totalUnlockedSpendingVnd: Math.max(0, (current.totalUnlockedSpendingVnd || 0) + (delta.deltaUnlockedSpendingVnd || 0)),
          pendingRequestsTotalVnd: Math.max(0, (current.pendingRequestsTotalVnd || 0) + (delta.deltaPendingRequestsTotalVnd || 0)),
          pendingRequestsCount: Math.max(0, (current.pendingRequestsCount || 0) + (delta.deltaPendingRequestsCount || 0)),
          totalOutstandingDebtVnd: Math.max(0, (current.totalOutstandingDebtVnd || 0) + (delta.deltaOutstandingDebtVnd || 0)),
          studentsInDebtCount: Math.max(0, (current.studentsInDebtCount || 0) + (delta.deltaStudentsInDebtCount || 0)),
          recentRequests: recent,
          lastUpdated: now
        };
        t.update(docRef, updated);
      });
    } else {
      const current = await getFirestoreRestDoc("system_stats", "wallet_overview", false);
      if (current) {
        let recent = current.recentRequests || [];
        if (delta.newRecentRequest) {
          recent = [delta.newRecentRequest, ...recent.filter((r) => r.id !== delta.newRecentRequest.id)].slice(0, 10);
        }
        const updated = {
          ...current,
          totalWallets: Math.max(0, (current.totalWallets || 0) + (delta.deltaWalletsCount || 0)),
          totalVirtualBalanceVnd: Math.max(0, (current.totalVirtualBalanceVnd || 0) + (delta.deltaVirtualBalanceVnd || 0)),
          totalConfirmedCreditedVnd: Math.max(0, (current.totalConfirmedCreditedVnd || 0) + (delta.deltaConfirmedCreditedVnd || 0)),
          totalUnlockedSpendingVnd: Math.max(0, (current.totalUnlockedSpendingVnd || 0) + (delta.deltaUnlockedSpendingVnd || 0)),
          pendingRequestsTotalVnd: Math.max(0, (current.pendingRequestsTotalVnd || 0) + (delta.deltaPendingRequestsTotalVnd || 0)),
          pendingRequestsCount: Math.max(0, (current.pendingRequestsCount || 0) + (delta.deltaPendingRequestsCount || 0)),
          totalOutstandingDebtVnd: Math.max(0, (current.totalOutstandingDebtVnd || 0) + (delta.deltaOutstandingDebtVnd || 0)),
          studentsInDebtCount: Math.max(0, (current.studentsInDebtCount || 0) + (delta.deltaStudentsInDebtCount || 0)),
          recentRequests: recent,
          lastUpdated: now
        };
        await setFirestoreRestDoc("system_stats", "wallet_overview", updated);
      }
    }
  } catch (err) {
    console.warn("[walletService] Warning updating wallet_overview aggregates:", err);
  }
}
var debtSummariesCache = null;
var DEBT_SUMMARIES_TTL_MS = 180 * 1e3;
var USER_MAP_TTL_MS = 10 * 60 * 1e3;
function invalidateDebtSummariesCache() {
  debtSummariesCache = null;
}
var studentDetailsCache = /* @__PURE__ */ new Map();
var STUDENT_DETAILS_TTL_MS = 60 * 1e3;
function invalidateStudentDetailsCache(studentUid) {
  if (studentUid) {
    studentDetailsCache.delete(studentUid);
  } else {
    studentDetailsCache.clear();
  }
}
var depositRequestsCache = /* @__PURE__ */ new Map();
function invalidateDepositRequestsCache() {
  depositRequestsCache.clear();
}
async function getStudentTransactions(uid, limitCount = 30) {
  if (adminDb) {
    const snap = await adminDb.collection("wallet_transactions").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limitCount).get();
    return snap.docs.map((d) => d.data());
  }
  const docs = await queryFirestoreRestDocs("wallet_transactions", "uid", uid, limitCount);
  const filtered = docs.sort(
    (a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)
  );
  return filtered.slice(0, limitCount);
}
var spendingFirstPageCache = /* @__PURE__ */ new Map();
var SPENDING_CACHE_TTL_MS = 45 * 1e3;
var SPENDING_STUDENT_META_TTL_MS = 10 * 60 * 1e3;
function invalidateGlobalSpendingCache() {
  spendingFirstPageCache.clear();
}
async function getStudentDepositRequests(uid, limitCount = 30) {
  if (adminDb) {
    const snap = await adminDb.collection("deposit_requests").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limitCount).get();
    return snap.docs.map((d) => d.data());
  }
  const docs = await queryFirestoreRestDocs("deposit_requests", "uid", uid, limitCount);
  const filtered = docs.sort(
    (a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)
  );
  return filtered.slice(0, limitCount);
}
async function getStudentUnpaidDebt(uid) {
  if (!uid) return { totalDebtVnd: 0, unpaidCount: 0, records: [] };
  const cleanUid = uid.trim();
  let debts = [];
  if (adminDb) {
    const snap = await adminDb.collection("debt_records").where("uid", "==", cleanUid).get();
    debts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else {
    const docs = await queryFirestoreRestDocs("debt_records", "uid", cleanUid, 50);
    debts = docs;
  }
  const unpaid = debts.filter(
    (d) => d.status === "unpaid" || d.status === "partial" || d.remainingVnd && d.remainingVnd > 0
  );
  unpaid.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
  const totalDebtVnd = unpaid.reduce((sum, d) => sum + Math.max(0, sanitizeVnd(d.remainingVnd ?? d.amountVnd)), 0);
  return {
    totalDebtVnd,
    unpaidCount: unpaid.length,
    records: unpaid
  };
}

// server/services/referralService.ts
import crypto from "crypto";
var REFERRAL_MIN_REWARD_VND = 100;
var REFERRAL_MAX_REWARD_VND = 1e3;
var REFERRAL_MIN_WITHDRAW_VND = 1e3;
var REFERRAL_MAX_DAILY_CLAIMS = 20;
var REFERRAL_IP_COOLDOWN_MS = 24 * 60 * 60 * 1e3;
var REFERRAL_IP_MAX_LIFETIME_CLAIMS = 2;
var REFERRAL_DEVICE_MAX_CLAIMS = 1;
var REFERRAL_NEW_ACCOUNT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
var CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function normalizeReferralCode(raw) {
  return String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function getVietnamDateKey(nowMs = Date.now()) {
  const vnDate = new Date(nowMs + 7 * 60 * 60 * 1e3);
  return vnDate.toISOString().slice(0, 10);
}
function extractClientIp(req) {
  const headers = req?.headers || {};
  const forwarded = headers["x-forwarded-for"];
  const rawForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  let candidate = "";
  if (rawForwarded && typeof rawForwarded === "string") {
    candidate = rawForwarded.split(",")[0]?.trim() || "";
  }
  if (!candidate) {
    const cfIp = headers["cf-connecting-ip"];
    candidate = (Array.isArray(cfIp) ? cfIp[0] : cfIp) || "";
  }
  if (!candidate) {
    const realIp = headers["x-real-ip"];
    candidate = (Array.isArray(realIp) ? realIp[0] : realIp) || "";
  }
  if (!candidate) {
    candidate = req?.ip || req?.socket?.remoteAddress || "";
  }
  let normalized = String(candidate || "").trim();
  if (normalized.startsWith("::ffff:")) {
    normalized = normalized.slice(7);
  }
  if (normalized === "::1") {
    normalized = "127.0.0.1";
  }
  return normalized;
}
function hashAntiFraudSignal(kind, rawValue) {
  const clean = String(rawValue || "").trim();
  if (!clean || clean.length < 3 || clean.toLowerCase() === "unknown") {
    return null;
  }
  const salt = process.env.REFERRAL_HASH_SALT || process.env.JWT_SECRET || process.env.ADMIN_API_SECRET || "dktest_referral_guard_v1";
  return crypto.createHmac("sha256", salt).update(`${kind}:${clean}`).digest("hex").slice(0, 32);
}
function generateRandomReferralRewardVnd() {
  return crypto.randomInt(REFERRAL_MIN_REWARD_VND, REFERRAL_MAX_REWARD_VND + 1);
}
function generateReferralCodeCandidate(uid, attempt = 0) {
  const digest = crypto.createHash("sha256").update(`dktest_ref_code:${uid}:${attempt}`).digest();
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CODE_ALPHABET[digest[i] % CODE_ALPHABET.length];
  }
  return `DK${suffix}`;
}
function sanitizeReferralProfile(uid, raw) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    uid,
    code: normalizeReferralCode(raw?.code || ""),
    referralBalanceVnd: sanitizeVnd(raw?.referralBalanceVnd),
    totalEarnedVnd: sanitizeVnd(raw?.totalEarnedVnd),
    totalWithdrawnVnd: sanitizeVnd(raw?.totalWithdrawnVnd),
    successfulReferralsCount: Math.max(0, Math.floor(Number(raw?.successfulReferralsCount || 0))),
    referredByUid: raw?.referredByUid || void 0,
    referredByCode: raw?.referredByCode || void 0,
    referredAt: raw?.referredAt || void 0,
    lastKnownIpHash: raw?.lastKnownIpHash || void 0,
    lastKnownDeviceHash: raw?.lastKnownDeviceHash || void 0,
    dailyClaimsDate: raw?.dailyClaimsDate || void 0,
    dailyClaimsCount: Math.max(0, Math.floor(Number(raw?.dailyClaimsCount || 0))),
    createdAt: raw?.createdAt || now,
    updatedAt: raw?.updatedAt || now
  };
}
function stripSensitiveProfileFields(profile) {
  const { lastKnownIpHash: _ip, lastKnownDeviceHash: _dev, ...safe } = profile;
  return safe;
}
async function allocateUniqueCodeForUid(uid) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateReferralCodeCandidate(uid, attempt);
    if (adminDb) {
      const codeRef = adminDb.collection("referral_codes").doc(candidate);
      const snap = await codeRef.get();
      if (!snap.exists) {
        await codeRef.set({
          code: candidate,
          uid,
          createdAt: now
        });
        return candidate;
      }
      if (snap.data()?.uid === uid) {
        return candidate;
      }
    } else {
      const existing = await getFirestoreRestDoc("referral_codes", candidate, false);
      if (!existing) {
        await setFirestoreRestDoc("referral_codes", candidate, {
          code: candidate,
          uid,
          createdAt: now
        });
        return candidate;
      }
      if (existing.uid === uid) {
        return candidate;
      }
    }
  }
  const fallback = `DK${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
  if (adminDb) {
    await adminDb.collection("referral_codes").doc(fallback).set({ code: fallback, uid, createdAt: now });
  } else {
    await setFirestoreRestDoc("referral_codes", fallback, { code: fallback, uid, createdAt: now });
  }
  return fallback;
}
async function getRecentReferralsForReferrer(referrerUid, limitCount = 20) {
  if (adminDb) {
    try {
      const snap = await adminDb.collection("referral_claims").where("referrerUid", "==", referrerUid).orderBy("createdAt", "desc").limit(limitCount).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      const snap = await adminDb.collection("referral_claims").where("referrerUid", "==", referrerUid).limit(50).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
      return rows.slice(0, limitCount);
    }
  } else {
    const docs = await queryFirestoreRestDocs("referral_claims", "referrerUid", referrerUid, 50);
    const rows = (docs || []).map((d) => ({ id: d.id, ...d }));
    rows.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
    return rows.slice(0, limitCount);
  }
}
async function getOrCreateReferralProfile(uid, signals) {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) {
    throw new Error("T\xE0i kho\u1EA3n kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  const ipHash = hashAntiFraudSignal("ip", signals?.ip);
  const deviceHash = hashAntiFraudSignal("device", signals?.deviceFingerprint);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let profile;
  if (adminDb) {
    const ref = adminDb.collection("referral_profiles").doc(cleanUid);
    const snap = await ref.get();
    if (snap.exists) {
      profile = sanitizeReferralProfile(cleanUid, snap.data());
      const patch = {};
      if (!profile.code) {
        profile.code = await allocateUniqueCodeForUid(cleanUid);
        patch.code = profile.code;
      }
      if (ipHash && profile.lastKnownIpHash !== ipHash) {
        profile.lastKnownIpHash = ipHash;
        patch.lastKnownIpHash = ipHash;
      }
      if (deviceHash && profile.lastKnownDeviceHash !== deviceHash) {
        profile.lastKnownDeviceHash = deviceHash;
        patch.lastKnownDeviceHash = deviceHash;
      }
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now;
        await ref.set(patch, { merge: true });
      }
    } else {
      const code = await allocateUniqueCodeForUid(cleanUid);
      profile = sanitizeReferralProfile(cleanUid, {
        uid: cleanUid,
        code,
        referralBalanceVnd: 0,
        totalEarnedVnd: 0,
        totalWithdrawnVnd: 0,
        successfulReferralsCount: 0,
        lastKnownIpHash: ipHash || void 0,
        lastKnownDeviceHash: deviceHash || void 0,
        createdAt: now,
        updatedAt: now
      });
      await ref.set(profile);
    }
  } else {
    const existing = await getFirestoreRestDoc("referral_profiles", cleanUid, false);
    if (existing) {
      profile = sanitizeReferralProfile(cleanUid, existing);
      let changed = false;
      if (!profile.code) {
        profile.code = await allocateUniqueCodeForUid(cleanUid);
        changed = true;
      }
      if (ipHash && profile.lastKnownIpHash !== ipHash) {
        profile.lastKnownIpHash = ipHash;
        changed = true;
      }
      if (deviceHash && profile.lastKnownDeviceHash !== deviceHash) {
        profile.lastKnownDeviceHash = deviceHash;
        changed = true;
      }
      if (changed) {
        profile.updatedAt = now;
        await setFirestoreRestDoc("referral_profiles", cleanUid, profile);
      }
    } else {
      const code = await allocateUniqueCodeForUid(cleanUid);
      profile = sanitizeReferralProfile(cleanUid, {
        uid: cleanUid,
        code,
        referralBalanceVnd: 0,
        totalEarnedVnd: 0,
        totalWithdrawnVnd: 0,
        successfulReferralsCount: 0,
        lastKnownIpHash: ipHash || void 0,
        lastKnownDeviceHash: deviceHash || void 0,
        createdAt: now,
        updatedAt: now
      });
      await setFirestoreRestDoc("referral_profiles", cleanUid, profile);
    }
  }
  const recentClaims = await getRecentReferralsForReferrer(cleanUid, 20);
  const safeRecentClaims = recentClaims.map(({ ipHash: _i, deviceHash: _d, ...rest }) => rest);
  return {
    profile: stripSensitiveProfileFields(profile),
    recentClaims: safeRecentClaims,
    rules: {
      minRewardVnd: REFERRAL_MIN_REWARD_VND,
      maxRewardVnd: REFERRAL_MAX_REWARD_VND,
      minWithdrawVnd: REFERRAL_MIN_WITHDRAW_VND,
      maxDailyClaims: REFERRAL_MAX_DAILY_CLAIMS
    }
  };
}
async function getUserAccountMeta(uid) {
  let doc = null;
  try {
    if (adminDb) {
      const snap = await adminDb.collection("users").doc(uid).get();
      if (snap.exists) doc = snap.data();
    } else {
      doc = await getFirestoreRestDoc("users", uid, false);
    }
  } catch {
    doc = null;
  }
  if (!doc) {
    return {
      exists: false,
      createdAtMs: 0,
      email: "",
      username: "",
      displayName: "",
      disabled: false
    };
  }
  return {
    exists: true,
    createdAtMs: parseTimestampMs(doc.createdAt),
    email: String(doc.email || "").trim().toLowerCase(),
    username: String(doc.username || "").trim().toLowerCase(),
    displayName: String(doc.fullName || doc.displayName || doc.username || "").trim(),
    disabled: Boolean(doc.disabled || doc.banned || doc.status === "banned" || doc.status === "suspended")
  };
}
function validateAntiFraudGuards(params) {
  const {
    nowMs,
    refereeUid,
    referrerUid,
    referrerProfile,
    refereeAlreadyClaimed,
    ipHash,
    deviceHash,
    ipGuard,
    deviceGuard,
    refereeMeta,
    referrerMeta
  } = params;
  if (referrerUid === refereeUid) {
    throw new Error("B\u1EA1n kh\xF4ng th\u1EC3 t\u1EF1 nh\u1EADp m\xE3 gi\u1EDBi thi\u1EC7u c\u1EE7a ch\xEDnh m\xECnh.");
  }
  if (refereeMeta.disabled) {
    throw new Error("T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n kh\xF4ng \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n tham gia ch\u01B0\u01A1ng tr\xECnh gi\u1EDBi thi\u1EC7u.");
  }
  if (referrerMeta.disabled) {
    throw new Error("M\xE3 gi\u1EDBi thi\u1EC7u n\xE0y hi\u1EC7n kh\xF4ng kh\u1EA3 d\u1EE5ng.");
  }
  if (refereeMeta.email && referrerMeta.email && refereeMeta.email === referrerMeta.email || refereeMeta.username && referrerMeta.username && refereeMeta.username === referrerMeta.username) {
    throw new Error("Ph\xE1t hi\u1EC7n tr\xF9ng th\xF4ng tin t\xE0i kho\u1EA3n gi\u1EEFa ng\u01B0\u1EDDi m\u1EDDi v\xE0 ng\u01B0\u1EDDi \u0111\u01B0\u1EE3c m\u1EDDi.");
  }
  if (refereeMeta.createdAtMs > 0 && nowMs - refereeMeta.createdAtMs > REFERRAL_NEW_ACCOUNT_MAX_AGE_MS) {
    throw new Error("Ch\u1EC9 t\xE0i kho\u1EA3n m\u1EDBi t\u1EA1o trong v\xF2ng 7 ng\xE0y m\u1EDBi \u0111\u01B0\u1EE3c nh\u1EADp m\xE3 gi\u1EDBi thi\u1EC7u.");
  }
  if (refereeAlreadyClaimed) {
    throw new Error("T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 x\xE1c nh\u1EADn m\xE3 gi\u1EDBi thi\u1EC7u tr\u01B0\u1EDBc \u0111\xF3 r\u1ED3i.");
  }
  if (referrerProfile.referredByUid && referrerProfile.referredByUid === refereeUid) {
    throw new Error("Kh\xF4ng th\u1EC3 gi\u1EDBi thi\u1EC7u ch\xE9o gi\u1EEFa 2 t\xE0i kho\u1EA3n \u0111\xE3 gi\u1EDBi thi\u1EC7u nhau.");
  }
  if (ipHash && referrerProfile.lastKnownIpHash && ipHash === referrerProfile.lastKnownIpHash) {
    throw new Error("H\u1EC7 th\u1ED1ng ch\u1ED1ng gian l\u1EADn: kh\xF4ng th\u1EC3 nh\u1EADn th\u01B0\u1EDFng khi d\xF9ng chung \u0111\u1ECBa ch\u1EC9 IP / m\u1EA1ng v\u1EDBi ng\u01B0\u1EDDi m\u1EDDi.");
  }
  if (deviceHash && referrerProfile.lastKnownDeviceHash && deviceHash === referrerProfile.lastKnownDeviceHash) {
    throw new Error("H\u1EC7 th\u1ED1ng ch\u1ED1ng gian l\u1EADn: kh\xF4ng th\u1EC3 nh\u1EADn th\u01B0\u1EDFng khi d\xF9ng chung thi\u1EBFt b\u1ECB v\u1EDBi ng\u01B0\u1EDDi m\u1EDDi.");
  }
  if (ipGuard) {
    const referrerList = Array.isArray(ipGuard.referrerUids) ? ipGuard.referrerUids : [];
    if (referrerList.includes(referrerUid)) {
      throw new Error("H\u1EC7 th\u1ED1ng ch\u1ED1ng gian l\u1EADn: \u0111\u1ECBa ch\u1EC9 IP n\xE0y \u0111\xE3 t\u1EEBng x\xE1c nh\u1EADn m\xE3 cho ng\u01B0\u1EDDi m\u1EDDi n\xE0y.");
    }
    if ((ipGuard.totalClaims || 0) >= REFERRAL_IP_MAX_LIFETIME_CLAIMS) {
      throw new Error("H\u1EC7 th\u1ED1ng ch\u1ED1ng gian l\u1EADn: \u0111\u1ECBa ch\u1EC9 IP n\xE0y \u0111\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t x\xE1c nh\u1EADn m\xE3 gi\u1EDBi thi\u1EC7u.");
    }
    const lastClaimMs = parseTimestampMs(ipGuard.lastClaimAt);
    if (lastClaimMs > 0 && nowMs - lastClaimMs < REFERRAL_IP_COOLDOWN_MS) {
      throw new Error("H\u1EC7 th\u1ED1ng ch\u1ED1ng gian l\u1EADn: \u0111\u1ECBa ch\u1EC9 IP n\xE0y v\u1EEBa x\xE1c nh\u1EADn m\xE3 gi\u1EDBi thi\u1EC7u g\u1EA7n \u0111\xE2y. Vui l\xF2ng th\u1EED l\u1EA1i sau 24 gi\u1EDD.");
    }
  }
  if (deviceGuard && (deviceGuard.totalClaims || 0) >= REFERRAL_DEVICE_MAX_CLAIMS) {
    throw new Error("H\u1EC7 th\u1ED1ng ch\u1ED1ng gian l\u1EADn: thi\u1EBFt b\u1ECB n\xE0y \u0111\xE3 t\u1EEBng x\xE1c nh\u1EADn m\xE3 gi\u1EDBi thi\u1EC7u tr\u01B0\u1EDBc \u0111\xF3.");
  }
  const todayVn = getVietnamDateKey(nowMs);
  if (referrerProfile.dailyClaimsDate === todayVn && (referrerProfile.dailyClaimsCount || 0) >= REFERRAL_MAX_DAILY_CLAIMS) {
    throw new Error("M\xE3 gi\u1EDBi thi\u1EC7u n\xE0y \u0111\xE3 \u0111\u1EA1t gi\u1EDBi h\u1EA1n l\u01B0\u1EE3t m\u1EDDi trong ng\xE0y h\xF4m nay.");
  }
}
async function claimReferralCode(refereeUid, rawCode, signals = {}) {
  const cleanRefereeUid = String(refereeUid || "").trim();
  const code = normalizeReferralCode(rawCode);
  if (!cleanRefereeUid) {
    throw new Error("Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 x\xE1c nh\u1EADn m\xE3 gi\u1EDBi thi\u1EC7u.");
  }
  if (!code || code.length < 4) {
    throw new Error("M\xE3 gi\u1EDBi thi\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  let codeDoc = null;
  if (adminDb) {
    const snap = await adminDb.collection("referral_codes").doc(code).get();
    if (snap.exists) codeDoc = snap.data();
  } else {
    codeDoc = await getFirestoreRestDoc("referral_codes", code, false);
  }
  if (!codeDoc || !codeDoc.uid) {
    throw new Error("M\xE3 gi\u1EDBi thi\u1EC7u kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng.");
  }
  const referrerUid = String(codeDoc.uid).trim();
  if (referrerUid === cleanRefereeUid) {
    throw new Error("B\u1EA1n kh\xF4ng th\u1EC3 t\u1EF1 nh\u1EADp m\xE3 gi\u1EDBi thi\u1EC7u c\u1EE7a ch\xEDnh m\xECnh.");
  }
  await getOrCreateReferralProfile(cleanRefereeUid, {
    ip: signals.ip,
    deviceFingerprint: signals.deviceFingerprint
  });
  const [refereeMeta, referrerMeta] = await Promise.all([
    getUserAccountMeta(cleanRefereeUid),
    getUserAccountMeta(referrerUid)
  ]);
  const ipHash = hashAntiFraudSignal("ip", signals.ip);
  const deviceHash = hashAntiFraudSignal("device", signals.deviceFingerprint);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const todayVn = getVietnamDateKey(nowMs);
  const rewardVnd = generateRandomReferralRewardVnd();
  const refereeDisplayName = String(signals.refereeName || refereeMeta.displayName || "H\u1ECDc sinh m\u1EDBi").trim();
  if (adminDb) {
    await adminDb.runTransaction(async (tx) => {
      const claimRef = adminDb.collection("referral_claims").doc(cleanRefereeUid);
      const referrerProfileRef = adminDb.collection("referral_profiles").doc(referrerUid);
      const refereeProfileRef = adminDb.collection("referral_profiles").doc(cleanRefereeUid);
      const ipGuardRef = ipHash ? adminDb.collection("referral_ip_guards").doc(ipHash) : null;
      const deviceGuardRef = deviceHash ? adminDb.collection("referral_device_guards").doc(deviceHash) : null;
      const [claimSnap, referrerSnap, refereeSnap, ipSnap, deviceSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(referrerProfileRef),
        tx.get(refereeProfileRef),
        ipGuardRef ? tx.get(ipGuardRef) : Promise.resolve(null),
        deviceGuardRef ? tx.get(deviceGuardRef) : Promise.resolve(null)
      ]);
      const referrerProfile = sanitizeReferralProfile(
        referrerUid,
        referrerSnap.exists ? referrerSnap.data() : { uid: referrerUid, code }
      );
      const refereeProfile = sanitizeReferralProfile(
        cleanRefereeUid,
        refereeSnap.exists ? refereeSnap.data() : { uid: cleanRefereeUid }
      );
      validateAntiFraudGuards({
        nowMs,
        refereeUid: cleanRefereeUid,
        referrerUid,
        referrerProfile,
        refereeAlreadyClaimed: claimSnap.exists || Boolean(refereeProfile.referredByUid),
        ipHash,
        deviceHash,
        ipGuard: ipSnap && ipSnap.exists ? ipSnap.data() : null,
        deviceGuard: deviceSnap && deviceSnap.exists ? deviceSnap.data() : null,
        refereeMeta,
        referrerMeta
      });
      const nextDailyCount = referrerProfile.dailyClaimsDate === todayVn ? (referrerProfile.dailyClaimsCount || 0) + 1 : 1;
      tx.set(
        referrerProfileRef,
        {
          uid: referrerUid,
          code: referrerProfile.code || code,
          referralBalanceVnd: referrerProfile.referralBalanceVnd + rewardVnd,
          totalEarnedVnd: referrerProfile.totalEarnedVnd + rewardVnd,
          successfulReferralsCount: referrerProfile.successfulReferralsCount + 1,
          dailyClaimsDate: todayVn,
          dailyClaimsCount: nextDailyCount,
          updatedAt: nowIso
        },
        { merge: true }
      );
      tx.set(
        refereeProfileRef,
        {
          uid: cleanRefereeUid,
          referredByUid: referrerUid,
          referredByCode: code,
          referredAt: nowIso,
          ...ipHash ? { lastKnownIpHash: ipHash } : {},
          ...deviceHash ? { lastKnownDeviceHash: deviceHash } : {},
          updatedAt: nowIso
        },
        { merge: true }
      );
      const claimDoc = {
        id: cleanRefereeUid,
        referrerUid,
        referrerCode: code,
        refereeUid: cleanRefereeUid,
        refereeName: refereeDisplayName,
        rewardVnd,
        status: "credited",
        ipHash: ipHash || void 0,
        deviceHash: deviceHash || void 0,
        createdAt: nowIso
      };
      tx.set(claimRef, claimDoc);
      if (ipGuardRef && ipHash) {
        const prevIp = ipSnap && ipSnap.exists ? ipSnap.data() : null;
        const nextReferrers = Array.from(/* @__PURE__ */ new Set([...prevIp?.referrerUids || [], referrerUid]));
        const nextReferees = Array.from(/* @__PURE__ */ new Set([...prevIp?.refereeUids || [], cleanRefereeUid]));
        tx.set(ipGuardRef, {
          id: ipHash,
          ipHash,
          totalClaims: (prevIp?.totalClaims || 0) + 1,
          lastClaimAt: nowIso,
          referrerUids: nextReferrers,
          refereeUids: nextReferees,
          updatedAt: nowIso
        });
      }
      if (deviceGuardRef && deviceHash) {
        const prevDev = deviceSnap && deviceSnap.exists ? deviceSnap.data() : null;
        const nextReferees = Array.from(/* @__PURE__ */ new Set([...prevDev?.refereeUids || [], cleanRefereeUid]));
        tx.set(deviceGuardRef, {
          id: deviceHash,
          deviceHash,
          totalClaims: (prevDev?.totalClaims || 0) + 1,
          lastClaimAt: nowIso,
          refereeUids: nextReferees,
          updatedAt: nowIso
        });
      }
    });
  } else {
    const [existingClaim, rawReferrer, rawReferee, rawIpGuard, rawDeviceGuard] = await Promise.all([
      getFirestoreRestDoc("referral_claims", cleanRefereeUid, false),
      getFirestoreRestDoc("referral_profiles", referrerUid, false),
      getFirestoreRestDoc("referral_profiles", cleanRefereeUid, false),
      ipHash ? getFirestoreRestDoc("referral_ip_guards", ipHash, false) : Promise.resolve(null),
      deviceHash ? getFirestoreRestDoc("referral_device_guards", deviceHash, false) : Promise.resolve(null)
    ]);
    const referrerProfile = sanitizeReferralProfile(
      referrerUid,
      rawReferrer || { uid: referrerUid, code }
    );
    const refereeProfile = sanitizeReferralProfile(
      cleanRefereeUid,
      rawReferee || { uid: cleanRefereeUid }
    );
    validateAntiFraudGuards({
      nowMs,
      refereeUid: cleanRefereeUid,
      referrerUid,
      referrerProfile,
      refereeAlreadyClaimed: Boolean(existingClaim) || Boolean(refereeProfile.referredByUid),
      ipHash,
      deviceHash,
      ipGuard: rawIpGuard || null,
      deviceGuard: rawDeviceGuard || null,
      refereeMeta,
      referrerMeta
    });
    const nextDailyCount = referrerProfile.dailyClaimsDate === todayVn ? (referrerProfile.dailyClaimsCount || 0) + 1 : 1;
    await setFirestoreRestDoc("referral_profiles", referrerUid, {
      ...referrerProfile,
      code: referrerProfile.code || code,
      referralBalanceVnd: referrerProfile.referralBalanceVnd + rewardVnd,
      totalEarnedVnd: referrerProfile.totalEarnedVnd + rewardVnd,
      successfulReferralsCount: referrerProfile.successfulReferralsCount + 1,
      dailyClaimsDate: todayVn,
      dailyClaimsCount: nextDailyCount,
      updatedAt: nowIso
    });
    await setFirestoreRestDoc("referral_profiles", cleanRefereeUid, {
      ...refereeProfile,
      referredByUid: referrerUid,
      referredByCode: code,
      referredAt: nowIso,
      ...ipHash ? { lastKnownIpHash: ipHash } : {},
      ...deviceHash ? { lastKnownDeviceHash: deviceHash } : {},
      updatedAt: nowIso
    });
    const claimDoc = {
      id: cleanRefereeUid,
      referrerUid,
      referrerCode: code,
      refereeUid: cleanRefereeUid,
      refereeName: refereeDisplayName,
      rewardVnd,
      status: "credited",
      ipHash: ipHash || void 0,
      deviceHash: deviceHash || void 0,
      createdAt: nowIso
    };
    await setFirestoreRestDoc("referral_claims", cleanRefereeUid, claimDoc);
    if (ipHash) {
      const prevIp = rawIpGuard || null;
      await setFirestoreRestDoc("referral_ip_guards", ipHash, {
        id: ipHash,
        ipHash,
        totalClaims: (prevIp?.totalClaims || 0) + 1,
        lastClaimAt: nowIso,
        referrerUids: Array.from(/* @__PURE__ */ new Set([...prevIp?.referrerUids || [], referrerUid])),
        refereeUids: Array.from(/* @__PURE__ */ new Set([...prevIp?.refereeUids || [], cleanRefereeUid])),
        updatedAt: nowIso
      });
    }
    if (deviceHash) {
      const prevDev = rawDeviceGuard || null;
      await setFirestoreRestDoc("referral_device_guards", deviceHash, {
        id: deviceHash,
        deviceHash,
        totalClaims: (prevDev?.totalClaims || 0) + 1,
        lastClaimAt: nowIso,
        refereeUids: Array.from(/* @__PURE__ */ new Set([...prevDev?.refereeUids || [], cleanRefereeUid])),
        updatedAt: nowIso
      });
    }
  }
  return {
    success: true,
    code,
    referrerUid,
    rewardVnd,
    message: `X\xE1c nh\u1EADn m\xE3 gi\u1EDBi thi\u1EC7u ${code} th\xE0nh c\xF4ng! Ng\u01B0\u1EDDi gi\u1EDBi thi\u1EC7u \u0111\xE3 nh\u1EADn th\u01B0\u1EDFng ng\u1EABu nhi\xEAn +${rewardVnd.toLocaleString("vi-VN")}\u0111.`
  };
}
async function withdrawReferralBalanceToWallet(uid, requestedAmountVnd) {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) {
    throw new Error("T\xE0i kho\u1EA3n kh\xF4ng h\u1EE3p l\u1EC7.");
  }
  await getOrCreateWallet(cleanUid);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_ref_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  let withdrawnVnd = 0;
  let remainingReferralBalanceVnd = 0;
  let newWalletBalanceVnd = 0;
  if (adminDb) {
    await adminDb.runTransaction(async (tx) => {
      const refProfileRef = adminDb.collection("referral_profiles").doc(cleanUid);
      const walletRef = adminDb.collection("wallets").doc(cleanUid);
      const [refSnap, walletSnap] = await Promise.all([tx.get(refProfileRef), tx.get(walletRef)]);
      if (!refSnap.exists) {
        throw new Error(`S\u1ED1 d\u01B0 th\u01B0\u1EDFng gi\u1EDBi thi\u1EC7u ch\u01B0a \u0111\u1EE7 m\u1EE9c t\u1ED1i thi\u1EC3u ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}\u0111 \u0111\u1EC3 r\xFAt.`);
      }
      const refData = sanitizeReferralProfile(cleanUid, refSnap.data());
      const available = refData.referralBalanceVnd;
      const amount = requestedAmountVnd !== void 0 && requestedAmountVnd !== null ? sanitizeVnd(requestedAmountVnd) : available;
      if (amount < REFERRAL_MIN_WITHDRAW_VND) {
        throw new Error(
          `S\u1ED1 ti\u1EC1n r\xFAt t\u1ED1i thi\u1EC3u l\xE0 ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}\u0111 (hi\u1EC7n c\xF3 ${available.toLocaleString("vi-VN")}\u0111).`
        );
      }
      if (amount > available) {
        throw new Error(
          `S\u1ED1 d\u01B0 th\u01B0\u1EDFng gi\u1EDBi thi\u1EC7u kh\xF4ng \u0111\u1EE7 (hi\u1EC7n c\xF3 ${available.toLocaleString("vi-VN")}\u0111).`
        );
      }
      const walletData = walletSnap.exists ? walletSnap.data() : null;
      const prevBalance = sanitizeVnd(walletData?.balanceVnd);
      newWalletBalanceVnd = prevBalance + amount;
      withdrawnVnd = amount;
      remainingReferralBalanceVnd = available - amount;
      tx.set(
        refProfileRef,
        {
          referralBalanceVnd: remainingReferralBalanceVnd,
          totalWithdrawnVnd: refData.totalWithdrawnVnd + amount,
          updatedAt: nowIso
        },
        { merge: true }
      );
      tx.set(
        walletRef,
        {
          uid: cleanUid,
          balanceVnd: newWalletBalanceVnd,
          totalCreditedVnd: sanitizeVnd(walletData?.totalCreditedVnd) + amount,
          updatedAt: nowIso
        },
        { merge: true }
      );
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txDoc = {
        id: txId,
        uid: cleanUid,
        type: "referral_withdraw_credit",
        amountVnd: amount,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newWalletBalanceVnd,
        actorUid: "system",
        actorName: "Th\u01B0\u1EDFng gi\u1EDBi thi\u1EC7u b\u1EA1n b\xE8",
        note: `R\xFAt ti\u1EC1n th\u01B0\u1EDFng m\u1EDDi b\u1EA1n b\xE8 (Ref) v\u1EC1 V\xED DkTEST: +${amount.toLocaleString("vi-VN")}\u0111`,
        createdAt: nowIso
      };
      tx.set(txRef, txDoc);
    });
  } else {
    const rawProfile = await getFirestoreRestDoc("referral_profiles", cleanUid, false);
    if (!rawProfile) {
      throw new Error(
        `S\u1ED1 d\u01B0 th\u01B0\u1EDFng gi\u1EDBi thi\u1EC7u ch\u01B0a \u0111\u1EE7 m\u1EE9c t\u1ED1i thi\u1EC3u ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}\u0111 \u0111\u1EC3 r\xFAt.`
      );
    }
    const refData = sanitizeReferralProfile(cleanUid, rawProfile);
    const available = refData.referralBalanceVnd;
    const amount = requestedAmountVnd !== void 0 && requestedAmountVnd !== null ? sanitizeVnd(requestedAmountVnd) : available;
    if (amount < REFERRAL_MIN_WITHDRAW_VND) {
      throw new Error(
        `S\u1ED1 ti\u1EC1n r\xFAt t\u1ED1i thi\u1EC3u l\xE0 ${REFERRAL_MIN_WITHDRAW_VND.toLocaleString("vi-VN")}\u0111 (hi\u1EC7n c\xF3 ${available.toLocaleString("vi-VN")}\u0111).`
      );
    }
    if (amount > available) {
      throw new Error(
        `S\u1ED1 d\u01B0 th\u01B0\u1EDFng gi\u1EDBi thi\u1EC7u kh\xF4ng \u0111\u1EE7 (hi\u1EC7n c\xF3 ${available.toLocaleString("vi-VN")}\u0111).`
      );
    }
    const walletData = await getFirestoreRestDoc("wallets", cleanUid, false);
    const prevBalance = sanitizeVnd(walletData?.balanceVnd);
    newWalletBalanceVnd = prevBalance + amount;
    withdrawnVnd = amount;
    remainingReferralBalanceVnd = available - amount;
    await setFirestoreRestDoc("referral_profiles", cleanUid, {
      ...refData,
      referralBalanceVnd: remainingReferralBalanceVnd,
      totalWithdrawnVnd: refData.totalWithdrawnVnd + amount,
      updatedAt: nowIso
    });
    await setFirestoreRestDoc("wallets", cleanUid, {
      ...walletData || {},
      uid: cleanUid,
      balanceVnd: newWalletBalanceVnd,
      totalCreditedVnd: sanitizeVnd(walletData?.totalCreditedVnd) + amount,
      updatedAt: nowIso
    });
    const txDoc = {
      id: txId,
      uid: cleanUid,
      type: "referral_withdraw_credit",
      amountVnd: amount,
      balanceBeforeVnd: prevBalance,
      balanceAfterVnd: newWalletBalanceVnd,
      actorUid: "system",
      actorName: "Th\u01B0\u1EDFng gi\u1EDBi thi\u1EC7u b\u1EA1n b\xE8",
      note: `R\xFAt ti\u1EC1n th\u01B0\u1EDFng m\u1EDDi b\u1EA1n b\xE8 (Ref) v\u1EC1 V\xED DkTEST: +${amount.toLocaleString("vi-VN")}\u0111`,
      createdAt: nowIso
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
  }
  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(cleanUid);
  updateWalletOverviewAggregates({
    deltaVirtualBalanceVnd: withdrawnVnd,
    deltaConfirmedCreditedVnd: withdrawnVnd
  }).catch(() => {
  });
  return {
    success: true,
    withdrawnVnd,
    remainingReferralBalanceVnd,
    newWalletBalanceVnd,
    transactionId: txId,
    message: `R\xFAt th\xE0nh c\xF4ng +${withdrawnVnd.toLocaleString("vi-VN")}\u0111 t\u1EEB Qu\u1EF9 gi\u1EDBi thi\u1EC7u v\xE0o V\xED DkTEST!`
  };
}

// server/services/webImporter/ssrfGuard.ts
import dns from "dns";
import net from "net";
var PRIVATE_IPV4_RANGES = [
  // 0.0.0.0/8 (Current network)
  { start: ipToLong("0.0.0.0"), end: ipToLong("0.255.255.255") },
  // 10.0.0.0/8 (Private network)
  { start: ipToLong("10.0.0.0"), end: ipToLong("10.255.255.255") },
  // 127.0.0.0/8 (Loopback)
  { start: ipToLong("127.0.0.0"), end: ipToLong("127.255.255.255") },
  // 169.254.0.0/16 (Link-local, AWS/GCP Metadata 169.254.169.254)
  { start: ipToLong("169.254.0.0"), end: ipToLong("169.254.255.255") },
  // 172.16.0.0/12 (Private network)
  { start: ipToLong("172.16.0.0"), end: ipToLong("172.31.255.255") },
  // 192.168.0.0/16 (Private network)
  { start: ipToLong("192.168.0.0"), end: ipToLong("192.168.255.255") },
  // 100.64.0.0/10 (Carrier-grade NAT)
  { start: ipToLong("100.64.0.0"), end: ipToLong("100.127.255.255") },
  // 224.0.0.0/4 (Multicast)
  { start: ipToLong("224.0.0.0"), end: ipToLong("239.255.255.255") },
  // 240.0.0.0/4 (Reserved)
  { start: ipToLong("240.0.0.0"), end: ipToLong("255.255.255.255") }
];
function ipToLong(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const long = ipToLong(ip);
    for (const range of PRIVATE_IPV4_RANGES) {
      if (long >= range.start && long <= range.end) {
        return true;
      }
    }
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    if (lower.startsWith("::ffff:")) {
      const v4Part = lower.replace("::ffff:", "");
      if (net.isIPv4(v4Part)) return isPrivateIp(v4Part);
    }
    return false;
  }
  return true;
}
async function validateUrlForSsrf(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`\u0110\u1ECBnh d\u1EA1ng URL kh\xF4ng h\u1EE3p l\u1EC7: "${rawUrl}"`);
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `Giao th\u1EE9c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3: "${parsedUrl.protocol}". Ch\u1EC9 ch\u1EA5p nh\u1EADn http: ho\u1EB7c https:`
    );
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "metadata.google.internal" || hostname === "169.254.169.254") {
    throw new Error(
      `Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i (SSRF Protection): Hostname n\u1ED9i b\u1ED9 "${hostname}" b\u1ECB c\u1EA5m.`
    );
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(
        `Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i (SSRF Protection): \u0110\u1ECBa ch\u1EC9 IP n\u1ED9i b\u1ED9 "${hostname}" b\u1ECB c\u1EA5m.`
      );
    }
    return { url: parsedUrl, resolvedIp: hostname };
  }
  try {
    const lookup = await dns.promises.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      throw new Error(`Kh\xF4ng th\u1EC3 ph\xE2n gi\u1EA3i t\xEAn mi\u1EC1n: "${hostname}"`);
    }
    for (const entry of lookup) {
      if (isPrivateIp(entry.address)) {
        throw new Error(
          `Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i (SSRF Protection): T\xEAn mi\u1EC1n "${hostname}" ph\xE2n gi\u1EA3i ra IP n\u1ED9i b\u1ED9 ${entry.address}.`
        );
      }
    }
    return { url: parsedUrl, resolvedIp: lookup[0].address };
  } catch (err) {
    if (err.message.includes("SSRF Protection")) throw err;
    throw new Error(`L\u1ED7i ki\u1EC3m tra DNS cho t\xEAn mi\u1EC1n "${hostname}": ${err.message}`);
  }
}

// src/utils/videoSourceHelper.ts
function extractGoogleDriveFileId(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return null;
  const pathMatch = url.match(
    /(?:drive|docs)\.google\.com\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{10,})/i
  );
  if (pathMatch?.[1]) return pathMatch[1];
  const queryMatch = url.match(
    /(?:drive\.google\.com\/(?:open|uc)|drive\.usercontent\.google\.com\/download)\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/i
  );
  if (queryMatch?.[1]) return queryMatch[1];
  return null;
}

// server/services/courseService.ts
var COURSE_DOC_CACHE_TTL_MS = 60 * 1e3;
var COURSE_ACCESS_CACHE_TTL_MS = 30 * 1e3;
var COURSE_PURCHASES_CACHE_TTL_MS = 30 * 1e3;
var COURSE_BUYER_META_TTL_MS = 10 * 60 * 1e3;
var courseDocCache = /* @__PURE__ */ new Map();
var courseLessonCache = /* @__PURE__ */ new Map();
var courseAccessCache = /* @__PURE__ */ new Map();
var coursePurchasesFirstPageCache = /* @__PURE__ */ new Map();
function invalidateCoursePurchasesCache(courseId) {
  if (!courseId) {
    coursePurchasesFirstPageCache.clear();
    return;
  }
  for (const key of coursePurchasesFirstPageCache.keys()) {
    if (key.startsWith(`${courseId}::`) || key.startsWith("all::")) {
      coursePurchasesFirstPageCache.delete(key);
    }
  }
}
function invalidateCourseServerCache(courseId, uid) {
  invalidateCoursePurchasesCache(courseId);
  if (!courseId) {
    courseDocCache.clear();
    courseLessonCache.clear();
    courseAccessCache.clear();
    return;
  }
  courseDocCache.delete(courseId);
  for (const key of courseLessonCache.keys()) {
    if (key.startsWith(`${courseId}::`)) courseLessonCache.delete(key);
  }
  for (const key of courseAccessCache.keys()) {
    if (uid) {
      if (key === `${uid}::${courseId}`) courseAccessCache.delete(key);
    } else if (key.endsWith(`::${courseId}`)) {
      courseAccessCache.delete(key);
    }
  }
}
function isAdminRole(role) {
  return role === "admin" || role === "super_admin";
}
function resolveCourseAccessModeServer(course) {
  if (course.accessMode === "per_video") return "per_video";
  if (course.accessMode === "paid") return "paid";
  if (course.accessMode === "free") return "free";
  return sanitizeVnd(course.priceVnd) > 0 ? "paid" : "free";
}
function isLessonFreeEffective(course, lesson) {
  const mode = resolveCourseAccessModeServer(course);
  if (mode === "free") return true;
  const accessType = lesson.accessType || "inherit_first_n";
  if (accessType === "free") return true;
  if (accessType === "paid") return false;
  const freeCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  return Number(lesson.order ?? 999999) < freeCount;
}
async function fetchCourseDoc(courseId, force = false) {
  const now = Date.now();
  if (!force) {
    const cached = courseDocCache.get(courseId);
    if (cached && now - cached.ts < COURSE_DOC_CACHE_TTL_MS) {
      return cached.course;
    }
  }
  let course = null;
  if (adminDb) {
    const snap = await adminDb.collection("courses").doc(courseId).get();
    course = snap.exists ? { id: snap.id, ...snap.data() } : null;
  } else {
    const rest = await getFirestoreRestDoc("courses", courseId, false);
    course = rest ? { id: courseId, ...rest } : null;
  }
  if (course) {
    courseDocCache.set(courseId, { course, ts: now });
  }
  return course;
}
async function fetchLessonDoc(courseId, lessonId, force = false) {
  const cacheKey = `${courseId}::${lessonId}`;
  const now = Date.now();
  if (!force) {
    const cached = courseLessonCache.get(cacheKey);
    if (cached && now - cached.ts < COURSE_DOC_CACHE_TTL_MS) {
      return cached.lesson;
    }
  }
  let lesson = null;
  if (adminDb) {
    const snap = await adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId).get();
    lesson = snap.exists ? { id: snap.id, ...snap.data() } : null;
  } else {
    const rest = await getFirestoreRestDoc(`courses/${courseId}/lessons`, lessonId, false);
    lesson = rest ? { id: lessonId, ...rest } : null;
  }
  if (lesson) {
    courseLessonCache.set(cacheKey, { lesson, ts: now });
  }
  return lesson;
}
async function checkCourseAccess(uid, courseId, role, force = false) {
  const now = Date.now();
  const cacheKey = uid ? `${uid}::${courseId}` : `guest::${courseId}`;
  if (!force && !isAdminRole(role)) {
    const cached = courseAccessCache.get(cacheKey);
    if (cached && now - cached.ts < COURSE_ACCESS_CACHE_TTL_MS) {
      return cached.access;
    }
  }
  const course = await fetchCourseDoc(courseId, force);
  if (!course) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc.");
  }
  const accessMode = resolveCourseAccessModeServer(course);
  const priceVnd = accessMode === "paid" ? sanitizeVnd(course.priceVnd) : 0;
  const isFreeCourse = accessMode === "free";
  const salesEnabled = course.salesEnabled !== false;
  const unlockFullPolicy = course.unlockFullPolicy || "unlock_all_videos";
  const freePreviewCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  const allowSingleLessonPurchase = accessMode === "per_video" ? true : Boolean(course.allowSingleLessonPurchase);
  if (isAdminRole(role) || isFreeCourse) {
    const quick = {
      hasCourseAccess: true,
      isFreeCourse,
      unlockedCourse: false,
      unlockedLessonIds: [],
      priceVnd: 0,
      accessMode,
      salesEnabled,
      unlockFullPolicy,
      freePreviewCount,
      allowSingleLessonPurchase,
      userBalance: 0,
      missingVnd: 0,
      canUnlockCourse: false,
      courseTitle: course.title || "Kh\xF3a h\u1ECDc"
    };
    return quick;
  }
  let userBalance = 0;
  let unlockedCourse = false;
  let unlockedLessonIds = [];
  if (uid) {
    if (adminDb) {
      const entsSnap = await adminDb.collection("course_entitlements").where("uid", "==", uid).where("courseId", "==", courseId).get();
      entsSnap.docs.forEach((docSnap) => {
        const ent = docSnap.data();
        if (ent.status === "active") {
          if (ent.scope === "course" || !ent.lessonId) {
            unlockedCourse = true;
          } else if (ent.lessonId) {
            unlockedLessonIds.push(ent.lessonId);
          }
        }
      });
    } else {
      const ents = await queryFirestoreRestDocs("course_entitlements", "uid", uid, 50);
      ents.forEach((ent) => {
        if (ent.courseId === courseId && ent.status === "active") {
          if (ent.scope === "course" || !ent.lessonId) {
            unlockedCourse = true;
          } else if (ent.lessonId) {
            unlockedLessonIds.push(ent.lessonId);
          }
        }
      });
    }
    if (salesEnabled && (!unlockedCourse || accessMode === "per_video")) {
      try {
        const wallet = await getOrCreateWallet(uid);
        userBalance = sanitizeVnd(wallet.balanceVnd);
      } catch (_) {
      }
    }
  }
  const hasCourseAccess = unlockedCourse;
  const missingVnd = accessMode === "paid" && !hasCourseAccess ? Math.max(0, priceVnd - userBalance) : 0;
  const canUnlockCourse = accessMode === "paid" && !hasCourseAccess && priceVnd > 0 && salesEnabled && userBalance >= priceVnd;
  const info = {
    hasCourseAccess,
    isFreeCourse: false,
    unlockedCourse,
    unlockedLessonIds: Array.from(new Set(unlockedLessonIds)),
    priceVnd,
    accessMode,
    salesEnabled,
    unlockFullPolicy,
    freePreviewCount,
    allowSingleLessonPurchase,
    userBalance,
    missingVnd,
    canUnlockCourse,
    courseTitle: course.title || "Kh\xF3a h\u1ECDc"
  };
  courseAccessCache.set(cacheKey, { access: info, ts: now });
  return info;
}
async function unlockCourse(uid, courseId, idempotencyKey, voucherCode) {
  if (!uid) throw new Error("Ch\u01B0a \u0111\u0103ng nh\u1EADp.");
  if (!courseId) throw new Error("M\xE3 kh\xF3a h\u1ECDc kh\xF4ng h\u1EE3p l\u1EC7.");
  const entitlementId = `${uid}_${courseId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (adminDb) {
    const result = await adminDb.runTransaction(async (transaction) => {
      const courseRef = adminDb.collection("courses").doc(courseId);
      const courseSnap = await transaction.get(courseRef);
      if (!courseSnap.exists) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc.");
      const course2 = { id: courseSnap.id, ...courseSnap.data() };
      const mode2 = resolveCourseAccessModeServer(course2);
      const priceVnd2 = sanitizeVnd(course2.priceVnd);
      if (mode2 === "per_video") {
        throw new Error(
          "Kh\xF3a h\u1ECDc n\xE0y \xE1p d\u1EE5ng thu ph\xED theo t\u1EEBng video. Vui l\xF2ng ch\u1ECDn m\u1EDF kh\xF3a t\u1EEBng video b\xE0i gi\u1EA3ng!"
        );
      }
      const entRef = adminDb.collection("course_entitlements").doc(entitlementId);
      const entSnap = await transaction.get(entRef);
      if (entSnap.exists) {
        const existing = entSnap.data();
        if (existing.status === "active") {
          const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
          const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
          return {
            success: true,
            newBalanceVnd: bal,
            entitlement: existing,
            alreadyUnlocked: true,
            effectivePrice: 0,
            appliedVoucher: null
          };
        }
      }
      if (mode2 === "free") {
        const freeEnt = {
          id: entitlementId,
          uid,
          courseId,
          lessonId: null,
          scope: "course",
          status: "active",
          source: "purchase",
          pricePaidVnd: 0,
          grantedAt: now,
          grantedBy: uid,
          courseTitleSnapshot: course2.title || "Kh\xF3a h\u1ECDc"
        };
        transaction.set(entRef, freeEnt, { merge: true });
        return {
          success: true,
          newBalanceVnd: 0,
          entitlement: freeEnt,
          alreadyUnlocked: false,
          effectivePrice: 0,
          appliedVoucher: null
        };
      }
      if (priceVnd2 <= 0) {
        throw new Error("Kh\xF3a h\u1ECDc ch\u01B0a c\u1EA5u h\xECnh h\u1ECDc ph\xED tr\u1ECDn kh\xF3a h\u1EE3p l\u1EC7.");
      }
      if (course2.salesEnabled === false) {
        throw new Error("Kh\xF3a h\u1ECDc hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng m\u1EDF kh\xF3a.");
      }
      let discountVnd2 = 0;
      let appliedVoucher2 = null;
      if (voucherCode && String(voucherCode).trim()) {
        const vRes = await validateVoucher({
          code: String(voucherCode).trim(),
          uid,
          context: "course_unlock",
          amountVnd: priceVnd2,
          courseId
        });
        if (!vRes.valid || !vRes.voucher) {
          throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7 cho kh\xF3a h\u1ECDc n\xE0y.");
        }
        discountVnd2 = vRes.discountVnd || 0;
        appliedVoucher2 = vRes.voucher;
      }
      const effectivePrice2 = Math.max(0, priceVnd2 - discountVnd2);
      const walletRef = adminDb.collection("wallets").doc(uid);
      const walletDoc = await transaction.get(walletRef);
      const walletData = walletDoc.exists ? walletDoc.data() : null;
      const currentBal = walletData ? sanitizeVnd(walletData.balanceVnd) : 0;
      const totalSpent = walletData ? sanitizeVnd(walletData.totalSpentVnd) : 0;
      const totalCredited = walletData ? sanitizeVnd(walletData.totalCreditedVnd) : 0;
      const fullName = walletData?.fullName || "";
      const currentClass = walletData?.currentClass || "";
      if (currentBal < effectivePrice2) {
        throw new Error(
          `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a kh\xF3a h\u1ECDc. C\u1EA7n ${effectivePrice2.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${currentBal.toLocaleString("vi-VN")}\u0111 (thi\u1EBFu ${(effectivePrice2 - currentBal).toLocaleString("vi-VN")}\u0111).`
        );
      }
      const newBalance2 = currentBal - effectivePrice2;
      transaction.set(
        walletRef,
        {
          uid,
          balanceVnd: newBalance2,
          totalSpentVnd: totalSpent + effectivePrice2,
          totalCreditedVnd: totalCredited,
          updatedAt: now
        },
        { merge: true }
      );
      const entitlement2 = {
        id: entitlementId,
        uid,
        courseId,
        lessonId: null,
        scope: "course",
        status: "active",
        source: "purchase",
        pricePaidVnd: effectivePrice2,
        transactionId: txId,
        grantedAt: now,
        grantedBy: uid,
        courseTitleSnapshot: course2.title || "Kh\xF3a h\u1ECDc",
        ...fullName ? { studentNameSnapshot: fullName } : {},
        ...currentClass ? { studentClassSnapshot: currentClass } : {}
      };
      transaction.set(entRef, entitlement2);
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const ledgerEntry = {
        id: txId,
        uid,
        type: "course_unlock_debit",
        amountVnd: effectivePrice2,
        balanceBeforeVnd: currentBal,
        balanceAfterVnd: newBalance2,
        courseId,
        courseTitleSnapshot: course2.title || "Kh\xF3a h\u1ECDc",
        studentNameSnapshot: fullName || "H\u1ECDc sinh",
        studentClassSnapshot: currentClass || "",
        idempotencyKey: idempotencyKey || txId,
        actorUid: uid,
        actorName: fullName || "H\u1ECDc sinh",
        note: discountVnd2 > 0 ? `M\u1EDF kh\xF3a tr\u1ECDn kh\xF3a h\u1ECDc "${course2.title}": -${effectivePrice2.toLocaleString("vi-VN")}\u0111 (gi\u1EA3m ${discountVnd2.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher2?.code})` : `M\u1EDF kh\xF3a tr\u1ECDn kh\xF3a h\u1ECDc "${course2.title}": -${effectivePrice2.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      };
      transaction.set(txRef, ledgerEntry);
      if (appliedVoucher2) {
        const vRef = adminDb.collection("vouchers").doc(appliedVoucher2.id);
        const vSnap = await transaction.get(vRef);
        if (vSnap.exists) {
          const vData = vSnap.data();
          transaction.update(vRef, {
            usedCount: (vData.usedCount || 0) + 1,
            updatedAt: now
          });
        }
        const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        transaction.set(adminDb.collection("voucher_usages").doc(usageId), {
          id: usageId,
          voucherId: appliedVoucher2.id,
          voucherCode: appliedVoucher2.code,
          uid,
          studentName: fullName,
          studentClass: currentClass,
          type: appliedVoucher2.type,
          discountVnd: discountVnd2,
          usedAt: now,
          context: "course_unlock",
          referenceId: courseId
        });
      }
      return {
        success: true,
        newBalanceVnd: newBalance2,
        entitlement: entitlement2,
        alreadyUnlocked: false,
        effectivePrice: effectivePrice2,
        appliedVoucher: appliedVoucher2
      };
    });
    if (result.appliedVoucher) {
      invalidateVouchersCache();
      invalidateVoucherUsagesCache();
    }
    invalidateCourseServerCache(courseId, uid);
    invalidateWalletOverviewCache();
    invalidateGlobalSpendingCache();
    invalidateStudentDetailsCache(uid);
    if (result.effectivePrice > 0) {
      updateWalletOverviewAggregates({
        deltaVirtualBalanceVnd: -result.effectivePrice,
        deltaUnlockedSpendingVnd: result.effectivePrice
      }).catch(() => {
      });
    }
    return {
      success: result.success,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked
    };
  }
  const course = await fetchCourseDoc(courseId, true);
  if (!course) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc.");
  const mode = resolveCourseAccessModeServer(course);
  if (mode === "per_video") {
    throw new Error("Kh\xF3a h\u1ECDc n\xE0y \xE1p d\u1EE5ng thu ph\xED theo t\u1EEBng video. Vui l\xF2ng m\u1EDF kh\xF3a t\u1EEBng video b\xE0i gi\u1EA3ng!");
  }
  const existingEnt = await getFirestoreRestDoc("course_entitlements", entitlementId, false);
  if (existingEnt && existingEnt.status === "active") {
    const w = await getOrCreateWallet(uid);
    return { success: true, newBalanceVnd: w.balanceVnd, entitlement: existingEnt, alreadyUnlocked: true };
  }
  const priceVnd = sanitizeVnd(course.priceVnd);
  if (mode === "paid" && priceVnd <= 0) {
    throw new Error("Kh\xF3a h\u1ECDc ch\u01B0a c\u1EA5u h\xECnh h\u1ECDc ph\xED tr\u1ECDn kh\xF3a h\u1EE3p l\u1EC7.");
  }
  let discountVnd = 0;
  let appliedVoucher = null;
  if (mode === "paid" && voucherCode && String(voucherCode).trim()) {
    const vRes = await validateVoucher({
      code: String(voucherCode).trim(),
      uid,
      context: "course_unlock",
      amountVnd: priceVnd,
      courseId
    });
    if (!vRes.valid || !vRes.voucher) {
      throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    discountVnd = vRes.discountVnd || 0;
    appliedVoucher = vRes.voucher;
  }
  const effectivePrice = mode === "paid" ? Math.max(0, priceVnd - discountVnd) : 0;
  const wallet = await getOrCreateWallet(uid);
  if (wallet.balanceVnd < effectivePrice) {
    throw new Error("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a kh\xF3a h\u1ECDc.");
  }
  const newBalance = wallet.balanceVnd - effectivePrice;
  if (effectivePrice > 0) {
    await setFirestoreRestDoc("wallets", uid, {
      ...wallet,
      balanceVnd: newBalance,
      totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + effectivePrice,
      updatedAt: now
    });
  }
  const entitlement = {
    id: entitlementId,
    uid,
    courseId,
    lessonId: null,
    scope: "course",
    status: "active",
    source: "purchase",
    pricePaidVnd: effectivePrice,
    transactionId: txId,
    grantedAt: now,
    grantedBy: uid,
    courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
    ...wallet.fullName ? { studentNameSnapshot: wallet.fullName } : {},
    ...wallet.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}
  };
  await setFirestoreRestDoc("course_entitlements", entitlementId, entitlement);
  if (effectivePrice > 0) {
    const ledgerEntry = {
      id: txId,
      uid,
      type: "course_unlock_debit",
      amountVnd: effectivePrice,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: newBalance,
      courseId,
      courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
      studentNameSnapshot: wallet.fullName || "H\u1ECDc sinh",
      studentClassSnapshot: wallet.currentClass || "",
      actorUid: uid,
      actorName: wallet.fullName || "H\u1ECDc sinh",
      note: `M\u1EDF kh\xF3a tr\u1ECDn kh\xF3a h\u1ECDc "${course.title}": -${effectivePrice.toLocaleString("vi-VN")}\u0111`,
      createdAt: now
    };
    await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);
  }
  invalidateCourseServerCache(courseId, uid);
  invalidateWalletOverviewCache();
  invalidateGlobalSpendingCache();
  invalidateStudentDetailsCache(uid);
  if (effectivePrice > 0) {
    updateWalletOverviewAggregates({
      deltaVirtualBalanceVnd: -effectivePrice,
      deltaUnlockedSpendingVnd: effectivePrice
    }).catch(() => {
    });
  }
  return { success: true, newBalanceVnd: newBalance, entitlement };
}
async function unlockCourseLesson(uid, courseId, lessonId, idempotencyKey, voucherCode) {
  if (!uid) throw new Error("Ch\u01B0a \u0111\u0103ng nh\u1EADp.");
  if (!courseId || !lessonId) throw new Error("M\xE3 kh\xF3a h\u1ECDc ho\u1EB7c b\xE0i gi\u1EA3ng kh\xF4ng h\u1EE3p l\u1EC7.");
  const entitlementId = `${uid}_${courseId}__${lessonId}`;
  const courseEntId = `${uid}_${courseId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  if (!adminDb) {
    const [course, lesson] = await Promise.all([
      fetchCourseDoc(courseId, true),
      fetchLessonDoc(courseId, lessonId, true)
    ]);
    if (!course || !lesson) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc ho\u1EB7c b\xE0i gi\u1EA3ng.");
    const mode = resolveCourseAccessModeServer(course);
    if (mode !== "per_video" && !course.allowSingleLessonPurchase) {
      throw new Error("Kh\xF3a h\u1ECDc n\xE0y kh\xF4ng b\u1EADt mua l\u1EBB t\u1EEBng b\xE0i gi\u1EA3ng.");
    }
    if (course.salesEnabled === false) {
      throw new Error("Kh\xF3a h\u1ECDc hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng b\xE1n.");
    }
    const existing = await getFirestoreRestDoc("course_entitlements", entitlementId, false);
    if (existing && existing.status === "active") {
      const w = await getOrCreateWallet(uid);
      return { success: true, newBalanceVnd: w.balanceVnd, entitlement: existing, alreadyUnlocked: true };
    }
    const priceVnd = sanitizeVnd(lesson.priceVnd);
    let discountVnd = 0;
    if (voucherCode && String(voucherCode).trim()) {
      const vRes = await validateVoucher({
        code: String(voucherCode).trim(),
        uid,
        context: "course_unlock",
        amountVnd: priceVnd,
        courseId
      });
      if (!vRes.valid || !vRes.voucher) {
        throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7.");
      }
      discountVnd = vRes.discountVnd || 0;
    }
    const effectivePrice = isLessonFreeEffective(course, lesson) ? 0 : Math.max(0, priceVnd - discountVnd);
    const wallet = await getOrCreateWallet(uid);
    if (wallet.balanceVnd < effectivePrice) {
      throw new Error("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a video b\xE0i gi\u1EA3ng.");
    }
    const newBalance = wallet.balanceVnd - effectivePrice;
    if (effectivePrice > 0) {
      await setFirestoreRestDoc("wallets", uid, {
        ...wallet,
        balanceVnd: newBalance,
        totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + effectivePrice,
        updatedAt: now
      });
    }
    const entitlement = {
      id: entitlementId,
      uid,
      courseId,
      lessonId,
      scope: "lesson",
      status: "active",
      source: "purchase",
      pricePaidVnd: effectivePrice,
      transactionId: txId,
      grantedAt: now,
      grantedBy: uid,
      courseTitleSnapshot: course.title,
      lessonTitleSnapshot: lesson.title,
      ...wallet.fullName ? { studentNameSnapshot: wallet.fullName } : {},
      ...wallet.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}
    };
    await setFirestoreRestDoc("course_entitlements", entitlementId, entitlement);
    if (effectivePrice > 0) {
      await setFirestoreRestDoc("wallet_transactions", txId, {
        id: txId,
        uid,
        type: "course_lesson_unlock_debit",
        amountVnd: effectivePrice,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: newBalance,
        courseId,
        courseTitleSnapshot: course.title,
        lessonId,
        lessonTitleSnapshot: lesson.title,
        studentNameSnapshot: wallet.fullName || "H\u1ECDc sinh",
        studentClassSnapshot: wallet.currentClass || "",
        actorUid: uid,
        actorName: wallet.fullName || "H\u1ECDc sinh",
        note: `M\u1EDF kh\xF3a video "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      });
    }
    invalidateCourseServerCache(courseId, uid);
    invalidateWalletOverviewCache();
    invalidateGlobalSpendingCache();
    invalidateStudentDetailsCache(uid);
    return { success: true, newBalanceVnd: newBalance, entitlement };
  }
  const result = await adminDb.runTransaction(async (transaction) => {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const lessonRef = courseRef.collection("lessons").doc(lessonId);
    const courseEntRef = adminDb.collection("course_entitlements").doc(courseEntId);
    const lessonEntRef = adminDb.collection("course_entitlements").doc(entitlementId);
    const [courseSnap, lessonSnap, courseEntSnap, lessonEntSnap] = await Promise.all([
      transaction.get(courseRef),
      transaction.get(lessonRef),
      transaction.get(courseEntRef),
      transaction.get(lessonEntRef)
    ]);
    if (!courseSnap.exists || !lessonSnap.exists) {
      throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc ho\u1EB7c b\xE0i gi\u1EA3ng.");
    }
    const course = { id: courseSnap.id, ...courseSnap.data() };
    const lesson = { id: lessonSnap.id, ...lessonSnap.data() };
    const mode = resolveCourseAccessModeServer(course);
    if (lessonEntSnap.exists && lessonEntSnap.data().status === "active") {
      const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
      const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
      return {
        success: true,
        newBalanceVnd: bal,
        entitlement: lessonEntSnap.data(),
        alreadyUnlocked: true,
        effectivePrice: 0,
        appliedVoucher: null
      };
    }
    if (isLessonFreeEffective(course, lesson) || courseEntSnap.exists && courseEntSnap.data().status === "active" && (course.unlockFullPolicy !== "unlock_course_only" || lesson.includedInCourseUnlock !== false)) {
      const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
      const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
      const freeEnt = {
        id: entitlementId,
        uid,
        courseId,
        lessonId,
        scope: "lesson",
        status: "active",
        source: "purchase",
        pricePaidVnd: 0,
        grantedAt: now,
        grantedBy: uid,
        courseTitleSnapshot: course.title,
        lessonTitleSnapshot: lesson.title
      };
      return {
        success: true,
        newBalanceVnd: bal,
        entitlement: freeEnt,
        alreadyUnlocked: true,
        effectivePrice: 0,
        appliedVoucher: null
      };
    }
    if (mode !== "per_video" && !course.allowSingleLessonPurchase) {
      throw new Error("Kh\xF3a h\u1ECDc n\xE0y ch\u1EC9 h\u1ED7 tr\u1EE3 m\u1EDF kh\xF3a tr\u1ECDn kh\xF3a.");
    }
    if (course.salesEnabled === false) {
      throw new Error("Kh\xF3a h\u1ECDc hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng b\xE1n.");
    }
    const priceVnd = sanitizeVnd(lesson.priceVnd);
    let discountVnd = 0;
    let appliedVoucher = null;
    if (voucherCode && String(voucherCode).trim()) {
      const vRes = await validateVoucher({
        code: String(voucherCode).trim(),
        uid,
        context: "course_unlock",
        amountVnd: priceVnd,
        courseId
      });
      if (!vRes.valid || !vRes.voucher) {
        throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7.");
      }
      discountVnd = vRes.discountVnd || 0;
      appliedVoucher = vRes.voucher;
    }
    const effectivePrice = Math.max(0, priceVnd - discountVnd);
    const walletRef = adminDb.collection("wallets").doc(uid);
    const walletDoc = await transaction.get(walletRef);
    const walletData = walletDoc.exists ? walletDoc.data() : null;
    const currentBal = walletData ? sanitizeVnd(walletData.balanceVnd) : 0;
    const totalSpent = walletData ? sanitizeVnd(walletData.totalSpentVnd) : 0;
    const totalCredited = walletData ? sanitizeVnd(walletData.totalCreditedVnd) : 0;
    const fullName = walletData?.fullName || "";
    const currentClass = walletData?.currentClass || "";
    if (currentBal < effectivePrice) {
      throw new Error(
        `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a b\xE0i gi\u1EA3ng. C\u1EA7n ${effectivePrice.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${currentBal.toLocaleString("vi-VN")}\u0111.`
      );
    }
    const newBalance = currentBal - effectivePrice;
    transaction.set(
      walletRef,
      {
        uid,
        balanceVnd: newBalance,
        totalSpentVnd: totalSpent + effectivePrice,
        totalCreditedVnd: totalCredited,
        updatedAt: now
      },
      { merge: true }
    );
    const entitlement = {
      id: entitlementId,
      uid,
      courseId,
      lessonId,
      scope: "lesson",
      status: "active",
      source: "purchase",
      pricePaidVnd: effectivePrice,
      transactionId: txId,
      grantedAt: now,
      grantedBy: uid,
      courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
      lessonTitleSnapshot: lesson.title || "B\xE0i gi\u1EA3ng",
      ...fullName ? { studentNameSnapshot: fullName } : {},
      ...currentClass ? { studentClassSnapshot: currentClass } : {}
    };
    transaction.set(lessonEntRef, entitlement);
    const txRef = adminDb.collection("wallet_transactions").doc(txId);
    const ledgerEntry = {
      id: txId,
      uid,
      type: "course_lesson_unlock_debit",
      amountVnd: effectivePrice,
      balanceBeforeVnd: currentBal,
      balanceAfterVnd: newBalance,
      courseId,
      courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
      lessonId,
      lessonTitleSnapshot: lesson.title || "B\xE0i gi\u1EA3ng",
      studentNameSnapshot: fullName || "H\u1ECDc sinh",
      studentClassSnapshot: currentClass || "",
      idempotencyKey: idempotencyKey || txId,
      actorUid: uid,
      actorName: fullName || "H\u1ECDc sinh",
      note: discountVnd > 0 ? `M\u1EDF kh\xF3a video "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}\u0111 (gi\u1EA3m ${discountVnd.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher?.code})` : `M\u1EDF kh\xF3a video "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}\u0111`,
      createdAt: now
    };
    transaction.set(txRef, ledgerEntry);
    if (appliedVoucher) {
      const vRef = adminDb.collection("vouchers").doc(appliedVoucher.id);
      const vSnap = await transaction.get(vRef);
      if (vSnap.exists) {
        const vData = vSnap.data();
        transaction.update(vRef, {
          usedCount: (vData.usedCount || 0) + 1,
          updatedAt: now
        });
      }
      const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(adminDb.collection("voucher_usages").doc(usageId), {
        id: usageId,
        voucherId: appliedVoucher.id,
        voucherCode: appliedVoucher.code,
        uid,
        studentName: fullName,
        studentClass: currentClass,
        type: appliedVoucher.type,
        discountVnd,
        usedAt: now,
        context: "course_unlock",
        referenceId: `${courseId}__${lessonId}`
      });
    }
    return {
      success: true,
      newBalanceVnd: newBalance,
      entitlement,
      alreadyUnlocked: false,
      effectivePrice,
      appliedVoucher
    };
  });
  if (result.appliedVoucher) {
    invalidateVouchersCache();
    invalidateVoucherUsagesCache();
  }
  invalidateCourseServerCache(courseId, uid);
  invalidateWalletOverviewCache();
  invalidateGlobalSpendingCache();
  invalidateStudentDetailsCache(uid);
  if (result.effectivePrice > 0) {
    updateWalletOverviewAggregates({
      deltaVirtualBalanceVnd: -result.effectivePrice,
      deltaUnlockedSpendingVnd: result.effectivePrice
    }).catch(() => {
    });
  }
  return {
    success: result.success,
    newBalanceVnd: result.newBalanceVnd,
    entitlement: result.entitlement,
    alreadyUnlocked: result.alreadyUnlocked
  };
}
function distributeChargedAmounts(prices, totalEffectiveVnd) {
  if (prices.length === 0) return [];
  const totalRaw = prices.reduce((acc, p) => acc + Math.max(0, p), 0);
  if (totalEffectiveVnd <= 0 || totalRaw <= 0) {
    return prices.map(() => 0);
  }
  if (totalEffectiveVnd === totalRaw) {
    return prices.map((p) => Math.max(0, Math.floor(p)));
  }
  const distributed = [];
  let allocated = 0;
  for (let i = 0; i < prices.length; i++) {
    if (i === prices.length - 1) {
      distributed.push(Math.max(0, totalEffectiveVnd - allocated));
    } else {
      const share = Math.floor(Math.max(0, prices[i]) / totalRaw * totalEffectiveVnd);
      distributed.push(share);
      allocated += share;
    }
  }
  return distributed;
}
function resolveBundleCandidateLessonIds(course, options) {
  const outline = [...course.lessonOutline || []].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const chapterIdsSet = new Set((course.chapters || []).map((c) => c.id));
  const chapterMap = new Map((course.chapters || []).map((c) => [c.id, c.title]));
  if (options.bundleType === "all_remaining") {
    return {
      candidateIds: outline.map((l) => l.id),
      bundleLabel: `to\xE0n b\u1ED9 video c\xF2n l\u1EA1i trong kh\xF3a "${course.title || "Kh\xF3a h\u1ECDc"}"`
    };
  }
  if (options.bundleType === "chapter") {
    const rawChapterId = options.chapterId ? String(options.chapterId).trim() : "__other__";
    if (rawChapterId === "__other__" || rawChapterId === "") {
      const ids2 = outline.filter((l) => !l.chapterId || !chapterIdsSet.has(l.chapterId)).map((l) => l.id);
      return {
        candidateIds: ids2,
        bundleLabel: `tr\u1ECDn ch\u01B0\u01A1ng "Chuy\xEAn \u0111\u1EC1 b\u1ED5 sung" (${course.title || "Kh\xF3a h\u1ECDc"})`
      };
    }
    const ids = outline.filter((l) => l.chapterId === rawChapterId).map((l) => l.id);
    const chTitle = chapterMap.get(rawChapterId) || "Ch\u01B0\u01A1ng h\u1ECDc";
    return {
      candidateIds: ids,
      bundleLabel: `tr\u1ECDn ch\u01B0\u01A1ng "${chTitle}" (${course.title || "Kh\xF3a h\u1ECDc"})`
    };
  }
  if (options.bundleType === "topic") {
    const requestedSet2 = new Set((options.lessonIds || []).map((id) => String(id).trim()).filter(Boolean));
    const cleanTopic = String(options.topicTitle || "").trim();
    const rawChapterId = options.chapterId ? String(options.chapterId).trim() : "";
    let matched2 = outline.filter((l) => {
      if (requestedSet2.size > 0) return requestedSet2.has(l.id);
      const topicMatches = cleanTopic && (l.topicTitle || "").trim().toLowerCase() === cleanTopic.toLowerCase();
      if (!topicMatches) return false;
      if (rawChapterId && rawChapterId !== "__other__") return l.chapterId === rawChapterId;
      return true;
    });
    return {
      candidateIds: matched2.map((l) => l.id),
      bundleLabel: `chuy\xEAn \u0111\u1EC1 "${cleanTopic || "B\xE0i gi\u1EA3ng"}" (${course.title || "Kh\xF3a h\u1ECDc"})`
    };
  }
  const requestedSet = new Set((options.lessonIds || []).map((id) => String(id).trim()).filter(Boolean));
  const matched = outline.filter((l) => requestedSet.has(l.id));
  return {
    candidateIds: matched.map((l) => l.id),
    bundleLabel: `g\xF3i video \u0111\xE3 ch\u1ECDn trong kh\xF3a "${course.title || "Kh\xF3a h\u1ECDc"}"`
  };
}
async function unlockCourseBundle(uid, courseId, options) {
  if (!uid) throw new Error("Ch\u01B0a \u0111\u0103ng nh\u1EADp.");
  if (!courseId) throw new Error("M\xE3 kh\xF3a h\u1ECDc kh\xF4ng h\u1EE3p l\u1EC7.");
  const validTypes = ["all_remaining", "chapter", "topic", "selected"];
  const bundleType = validTypes.includes(options.bundleType) ? options.bundleType : "selected";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const courseEntId = `${uid}_${courseId}`;
  const preloadedCourse = await fetchCourseDoc(courseId, true);
  if (!preloadedCourse) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc.");
  }
  const { candidateIds, bundleLabel } = resolveBundleCandidateLessonIds(preloadedCourse, {
    ...options,
    bundleType
  });
  const uniqueCandidateIds = Array.from(new Set(candidateIds)).slice(0, 150);
  if (uniqueCandidateIds.length === 0) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y video b\xE0i gi\u1EA3ng h\u1EE3p l\u1EC7 trong l\u1EF1a ch\u1ECDn n\xE0y.");
  }
  if (!adminDb) {
    const course = preloadedCourse;
    const mode = resolveCourseAccessModeServer(course);
    if (mode !== "per_video" && !course.allowSingleLessonPurchase && course.unlockFullPolicy !== "unlock_course_only") {
      throw new Error("Kh\xF3a h\u1ECDc n\xE0y ch\u1EC9 h\u1ED7 tr\u1EE3 m\u1EDF kh\xF3a tr\u1ECDn kh\xF3a.");
    }
    if (course.salesEnabled === false) {
      throw new Error("Kh\xF3a h\u1ECDc hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng b\xE1n.");
    }
    const [courseEnt, wallet, lessonDocs, existingEnts] = await Promise.all([
      getFirestoreRestDoc("course_entitlements", courseEntId, false),
      getOrCreateWallet(uid),
      Promise.all(uniqueCandidateIds.map((lid) => fetchLessonDoc(courseId, lid, true))),
      Promise.all(
        uniqueCandidateIds.map(
          (lid) => getFirestoreRestDoc("course_entitlements", `${uid}_${courseId}__${lid}`, false)
        )
      )
    ]);
    const hasCourseEnt = Boolean(courseEnt && courseEnt.status === "active");
    const lockedLessons = [];
    lessonDocs.forEach((lesson, idx) => {
      if (!lesson) return;
      const existing = existingEnts[idx];
      if (existing && existing.status === "active") return;
      if (isLessonFreeEffective(course, lesson)) return;
      if (hasCourseEnt && (course.unlockFullPolicy !== "unlock_course_only" || lesson.includedInCourseUnlock !== false)) {
        return;
      }
      if (mode === "paid" && !course.allowSingleLessonPurchase && !(course.unlockFullPolicy === "unlock_course_only" && lesson.includedInCourseUnlock === false)) {
        return;
      }
      lockedLessons.push(lesson);
    });
    if (lockedLessons.length === 0) {
      return {
        success: true,
        newBalanceVnd: sanitizeVnd(wallet.balanceVnd),
        unlockedLessonIds: [],
        unlockedCount: 0,
        totalChargedVnd: 0,
        entitlements: [],
        alreadyUnlocked: true
      };
    }
    const prices = lockedLessons.map((l) => sanitizeVnd(l.priceVnd));
    const subtotalVnd = prices.reduce((acc, p) => acc + p, 0);
    let discountVnd = 0;
    let appliedVoucher = null;
    if (options.voucherCode && String(options.voucherCode).trim()) {
      const vRes = await validateVoucher({
        code: String(options.voucherCode).trim(),
        uid,
        context: "course_unlock",
        amountVnd: subtotalVnd,
        courseId
      });
      if (!vRes.valid || !vRes.voucher) {
        throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7.");
      }
      discountVnd = vRes.discountVnd || 0;
      appliedVoucher = vRes.voucher;
    }
    const effectivePrice = Math.max(0, subtotalVnd - discountVnd);
    if (sanitizeVnd(wallet.balanceVnd) < effectivePrice) {
      throw new Error(
        `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a ${lockedLessons.length} video. C\u1EA7n ${effectivePrice.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${sanitizeVnd(wallet.balanceVnd).toLocaleString("vi-VN")}\u0111.`
      );
    }
    const newBalance = sanitizeVnd(wallet.balanceVnd) - effectivePrice;
    if (effectivePrice > 0) {
      await setFirestoreRestDoc("wallets", uid, {
        ...wallet,
        balanceVnd: newBalance,
        totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + effectivePrice,
        updatedAt: now
      });
    }
    const perLessonPaid = distributeChargedAmounts(prices, effectivePrice);
    const createdEntitlements = [];
    for (let i = 0; i < lockedLessons.length; i++) {
      const lesson = lockedLessons[i];
      const entId = `${uid}_${courseId}__${lesson.id}`;
      const ent = {
        id: entId,
        uid,
        courseId,
        lessonId: lesson.id,
        scope: "lesson",
        status: "active",
        source: "purchase",
        pricePaidVnd: perLessonPaid[i],
        transactionId: txId,
        grantedAt: now,
        grantedBy: uid,
        courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
        lessonTitleSnapshot: lesson.title || "B\xE0i gi\u1EA3ng",
        ...wallet.fullName ? { studentNameSnapshot: wallet.fullName } : {},
        ...wallet.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}
      };
      await setFirestoreRestDoc("course_entitlements", entId, ent);
      createdEntitlements.push(ent);
    }
    if (effectivePrice > 0) {
      await setFirestoreRestDoc("wallet_transactions", txId, {
        id: txId,
        uid,
        type: "course_lesson_unlock_debit",
        amountVnd: effectivePrice,
        balanceBeforeVnd: sanitizeVnd(wallet.balanceVnd),
        balanceAfterVnd: newBalance,
        courseId,
        courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
        studentNameSnapshot: wallet.fullName || "H\u1ECDc sinh",
        studentClassSnapshot: wallet.currentClass || "",
        idempotencyKey: options.idempotencyKey || txId,
        actorUid: uid,
        actorName: wallet.fullName || "H\u1ECDc sinh",
        note: discountVnd > 0 ? `M\u1EDF kh\xF3a ${lockedLessons.length} video (${bundleLabel}): -${effectivePrice.toLocaleString("vi-VN")}\u0111 (gi\u1EA3m ${discountVnd.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher?.code})` : `M\u1EDF kh\xF3a ${lockedLessons.length} video (${bundleLabel}): -${effectivePrice.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      });
    }
    if (appliedVoucher) {
      invalidateVouchersCache();
      invalidateVoucherUsagesCache();
    }
    invalidateCourseServerCache(courseId, uid);
    invalidateWalletOverviewCache();
    invalidateGlobalSpendingCache();
    invalidateStudentDetailsCache(uid);
    if (effectivePrice > 0) {
      updateWalletOverviewAggregates({
        deltaVirtualBalanceVnd: -effectivePrice,
        deltaUnlockedSpendingVnd: effectivePrice
      }).catch(() => {
      });
    }
    return {
      success: true,
      newBalanceVnd: newBalance,
      unlockedLessonIds: lockedLessons.map((l) => l.id),
      unlockedCount: lockedLessons.length,
      totalChargedVnd: effectivePrice,
      entitlements: createdEntitlements,
      alreadyUnlocked: false
    };
  }
  const result = await adminDb.runTransaction(async (transaction) => {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseEntRef = adminDb.collection("course_entitlements").doc(courseEntId);
    const walletRef = adminDb.collection("wallets").doc(uid);
    const lessonRefs = uniqueCandidateIds.map((lid) => courseRef.collection("lessons").doc(lid));
    const lessonEntRefs = uniqueCandidateIds.map(
      (lid) => adminDb.collection("course_entitlements").doc(`${uid}_${courseId}__${lid}`)
    );
    const [courseSnap, courseEntSnap, walletSnap, lessonSnaps, lessonEntSnaps] = await Promise.all([
      transaction.get(courseRef),
      transaction.get(courseEntRef),
      transaction.get(walletRef),
      Promise.all(lessonRefs.map((r) => transaction.get(r))),
      Promise.all(lessonEntRefs.map((r) => transaction.get(r)))
    ]);
    if (!courseSnap.exists) {
      throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc.");
    }
    const course = { id: courseSnap.id, ...courseSnap.data() };
    const mode = resolveCourseAccessModeServer(course);
    if (mode !== "per_video" && !course.allowSingleLessonPurchase && course.unlockFullPolicy !== "unlock_course_only") {
      throw new Error("Kh\xF3a h\u1ECDc n\xE0y ch\u1EC9 h\u1ED7 tr\u1EE3 m\u1EDF kh\xF3a tr\u1ECDn kh\xF3a.");
    }
    if (course.salesEnabled === false) {
      throw new Error("Kh\xF3a h\u1ECDc hi\u1EC7n \u0111ang t\u1EA1m ng\u1EEBng b\xE1n.");
    }
    const hasCourseEnt = courseEntSnap.exists && courseEntSnap.data().status === "active";
    const lockedLessons = [];
    lessonSnaps.forEach((lSnap, idx) => {
      if (!lSnap.exists) return;
      const lesson = { id: lSnap.id, ...lSnap.data() };
      const entSnap = lessonEntSnaps[idx];
      if (entSnap.exists && entSnap.data().status === "active") return;
      if (isLessonFreeEffective(course, lesson)) return;
      if (hasCourseEnt && (course.unlockFullPolicy !== "unlock_course_only" || lesson.includedInCourseUnlock !== false)) {
        return;
      }
      if (mode === "paid" && !course.allowSingleLessonPurchase && !(course.unlockFullPolicy === "unlock_course_only" && lesson.includedInCourseUnlock === false)) {
        return;
      }
      lockedLessons.push({ lesson, entRef: lessonEntRefs[idx] });
    });
    const walletData = walletSnap.exists ? walletSnap.data() : null;
    const currentBal = walletData ? sanitizeVnd(walletData.balanceVnd) : 0;
    const totalSpent = walletData ? sanitizeVnd(walletData.totalSpentVnd) : 0;
    const totalCredited = walletData ? sanitizeVnd(walletData.totalCreditedVnd) : 0;
    const fullName = walletData?.fullName || "";
    const currentClass = walletData?.currentClass || "";
    if (lockedLessons.length === 0) {
      return {
        success: true,
        newBalanceVnd: currentBal,
        unlockedLessonIds: [],
        unlockedCount: 0,
        totalChargedVnd: 0,
        entitlements: [],
        alreadyUnlocked: true,
        effectivePrice: 0,
        appliedVoucher: null
      };
    }
    const prices = lockedLessons.map((item) => sanitizeVnd(item.lesson.priceVnd));
    const subtotalVnd = prices.reduce((acc, p) => acc + p, 0);
    let discountVnd = 0;
    let appliedVoucher = null;
    if (options.voucherCode && String(options.voucherCode).trim()) {
      const vRes = await validateVoucher({
        code: String(options.voucherCode).trim(),
        uid,
        context: "course_unlock",
        amountVnd: subtotalVnd,
        courseId
      });
      if (!vRes.valid || !vRes.voucher) {
        throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7.");
      }
      discountVnd = vRes.discountVnd || 0;
      appliedVoucher = vRes.voucher;
    }
    const effectivePrice = Math.max(0, subtotalVnd - discountVnd);
    if (currentBal < effectivePrice) {
      throw new Error(
        `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 \u0111\u1EC3 m\u1EDF kh\xF3a ${lockedLessons.length} video. C\u1EA7n ${effectivePrice.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${currentBal.toLocaleString("vi-VN")}\u0111 (thi\u1EBFu ${(effectivePrice - currentBal).toLocaleString("vi-VN")}\u0111).`
      );
    }
    let voucherSnap = null;
    const voucherRef = appliedVoucher ? adminDb.collection("vouchers").doc(appliedVoucher.id) : null;
    if (voucherRef) {
      voucherSnap = await transaction.get(voucherRef);
    }
    const newBalance = currentBal - effectivePrice;
    transaction.set(
      walletRef,
      {
        uid,
        balanceVnd: newBalance,
        totalSpentVnd: totalSpent + effectivePrice,
        totalCreditedVnd: totalCredited,
        updatedAt: now
      },
      { merge: true }
    );
    const perLessonPaid = distributeChargedAmounts(prices, effectivePrice);
    const createdEntitlements = [];
    for (let i = 0; i < lockedLessons.length; i++) {
      const { lesson, entRef } = lockedLessons[i];
      const ent = {
        id: `${uid}_${courseId}__${lesson.id}`,
        uid,
        courseId,
        lessonId: lesson.id,
        scope: "lesson",
        status: "active",
        source: "purchase",
        pricePaidVnd: perLessonPaid[i],
        transactionId: txId,
        grantedAt: now,
        grantedBy: uid,
        courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
        lessonTitleSnapshot: lesson.title || "B\xE0i gi\u1EA3ng",
        ...fullName ? { studentNameSnapshot: fullName } : {},
        ...currentClass ? { studentClassSnapshot: currentClass } : {}
      };
      transaction.set(entRef, ent);
      createdEntitlements.push(ent);
    }
    const txRef = adminDb.collection("wallet_transactions").doc(txId);
    const ledgerEntry = {
      id: txId,
      uid,
      type: "course_lesson_unlock_debit",
      amountVnd: effectivePrice,
      balanceBeforeVnd: currentBal,
      balanceAfterVnd: newBalance,
      courseId,
      courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
      studentNameSnapshot: fullName || "H\u1ECDc sinh",
      studentClassSnapshot: currentClass || "",
      idempotencyKey: options.idempotencyKey || txId,
      actorUid: uid,
      actorName: fullName || "H\u1ECDc sinh",
      note: discountVnd > 0 ? `M\u1EDF kh\xF3a ${lockedLessons.length} video (${bundleLabel}): -${effectivePrice.toLocaleString("vi-VN")}\u0111 (gi\u1EA3m ${discountVnd.toLocaleString("vi-VN")}\u0111 nh\u1EDD voucher ${appliedVoucher?.code})` : `M\u1EDF kh\xF3a ${lockedLessons.length} video (${bundleLabel}): -${effectivePrice.toLocaleString("vi-VN")}\u0111`,
      createdAt: now
    };
    transaction.set(txRef, ledgerEntry);
    if (appliedVoucher && voucherRef) {
      if (voucherSnap?.exists) {
        const vData = voucherSnap.data();
        transaction.update(voucherRef, {
          usedCount: (vData.usedCount || 0) + 1,
          updatedAt: now
        });
      }
      const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(adminDb.collection("voucher_usages").doc(usageId), {
        id: usageId,
        voucherId: appliedVoucher.id,
        voucherCode: appliedVoucher.code,
        uid,
        studentName: fullName,
        studentClass: currentClass,
        type: appliedVoucher.type,
        discountVnd,
        usedAt: now,
        context: "course_unlock",
        referenceId: `${courseId}__bundle_${bundleType}`
      });
    }
    return {
      success: true,
      newBalanceVnd: newBalance,
      unlockedLessonIds: lockedLessons.map((item) => item.lesson.id),
      unlockedCount: lockedLessons.length,
      totalChargedVnd: effectivePrice,
      entitlements: createdEntitlements,
      alreadyUnlocked: false,
      effectivePrice,
      appliedVoucher
    };
  });
  if (result.appliedVoucher) {
    invalidateVouchersCache();
    invalidateVoucherUsagesCache();
  }
  invalidateCourseServerCache(courseId, uid);
  invalidateWalletOverviewCache();
  invalidateGlobalSpendingCache();
  invalidateStudentDetailsCache(uid);
  if (result.effectivePrice > 0) {
    updateWalletOverviewAggregates({
      deltaVirtualBalanceVnd: -result.effectivePrice,
      deltaUnlockedSpendingVnd: result.effectivePrice
    }).catch(() => {
    });
  }
  return {
    success: result.success,
    newBalanceVnd: result.newBalanceVnd,
    unlockedLessonIds: result.unlockedLessonIds,
    unlockedCount: result.unlockedCount,
    totalChargedVnd: result.totalChargedVnd,
    entitlements: result.entitlements,
    alreadyUnlocked: result.alreadyUnlocked
  };
}
async function getAuthorizedLessonContent(uid, courseId, lessonId, role) {
  const [course, lesson] = await Promise.all([
    fetchCourseDoc(courseId),
    fetchLessonDoc(courseId, lessonId)
  ]);
  if (!course || !lesson) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i gi\u1EA3ng ho\u1EB7c kh\xF3a h\u1ECDc.");
  }
  if (isAdminRole(role) || isLessonFreeEffective(course, lesson)) {
    return lesson;
  }
  const access = await checkCourseAccess(uid, courseId, role);
  const unlockedByCourse = access.unlockedCourse && (access.unlockFullPolicy === "unlock_all_videos" || lesson.includedInCourseUnlock !== false);
  const unlockedByLesson = access.unlockedLessonIds.includes(lessonId);
  if (!unlockedByCourse && !unlockedByLesson) {
    throw new Error("B\xE0i gi\u1EA3ng tr\u1EA3 ph\xED. Vui l\xF2ng m\u1EDF kh\xF3a kh\xF3a h\u1ECDc ho\u1EB7c b\xE0i gi\u1EA3ng \u0111\u1EC3 xem video.");
  }
  return lesson;
}
var DEFAULT_BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function isAllowedDriveHost(hostname) {
  const lower = hostname.toLowerCase();
  return lower === "drive.google.com" || lower === "docs.google.com" || lower === "drive.usercontent.google.com" || lower.endsWith(".googleusercontent.com");
}
async function readResponseChunkBounded(res, maxBytes = 262144) {
  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const remaining = maxBytes - total;
        const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
        chunks.push(slice);
        total += slice.byteLength;
        if (total >= maxBytes) {
          await reader.cancel().catch(() => {
          });
          break;
        }
      }
    } catch {
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  const arr = Buffer.from(await res.arrayBuffer());
  return arr.length > maxBytes ? arr.subarray(0, maxBytes) : arr;
}
async function fetchWithSsrfCheckedRedirects(targetUrl, init, options) {
  let currentUrl = targetUrl;
  for (let hop = 0; hop < 4; hop++) {
    const validated = await validateUrlForSsrf(currentUrl);
    if (options?.restrictToDriveHosts && !isAllowedDriveHost(validated.url.hostname)) {
      throw new Error("Redirect outside allowed Google Drive domains.");
    }
    const res = await fetch(currentUrl, {
      ...init,
      redirect: "manual"
    });
    const status = res.status;
    const location = res.headers?.get?.("location");
    if (status >= 300 && status < 400 && location) {
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return { res, finalUrl: currentUrl };
  }
  throw new Error("Too many redirects while probing video duration.");
}
function extractDriveConfirmationDownloadUrl(html, baseUrl) {
  const formMatch = html.match(/<form[^>]*id=["']download-form["'][^>]*action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i) || html.match(/<form[^>]*action=["'](https:\/\/drive\.usercontent\.google\.com\/download[^"']*)["'][^>]*>([\s\S]*?)<\/form>/i);
  if (!formMatch) return null;
  try {
    const actionUrl = new URL(formMatch[1].replace(/&amp;/g, "&"), baseUrl);
    if (!isAllowedDriveHost(actionUrl.hostname)) return null;
    const formBody = formMatch[2] || "";
    const inputTags = formBody.match(/<input\b[^>]*>/gi) || [];
    for (const tag of inputTags) {
      const nameMatch = tag.match(/\bname=["']([^"']+)["']/i);
      const valMatch = tag.match(/\bvalue=["']([^"']*)["']/i);
      if (nameMatch?.[1] && valMatch) {
        actionUrl.searchParams.set(nameMatch[1], valMatch[1]);
      }
    }
    return actionUrl.toString();
  } catch {
    return null;
  }
}
var driveStreamUrlCache = /* @__PURE__ */ new Map();
var DRIVE_STREAM_CACHE_TTL_MS = 15 * 60 * 1e3;
function looksLikePlayableVideoMagic(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) === "ftyp") return true;
  if (buf[0] === 26 && buf[1] === 69 && buf[2] === 223 && buf[3] === 163) return true;
  if (buf.toString("ascii", 0, 4) === "OggS") return true;
  return false;
}
async function resolveDriveDirectStreamUrl(driveId) {
  const cleanId = String(driveId || "").trim();
  if (!cleanId || !/^[a-zA-Z0-9_-]{10,120}$/.test(cleanId)) return null;
  const now = Date.now();
  const cached = driveStreamUrlCache.get(cleanId);
  if (cached && now - cached.ts < DRIVE_STREAM_CACHE_TTL_MS) {
    return cached.streamUrl;
  }
  const candidates = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(cleanId)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(cleanId)}`
  ];
  const baseHeaders = {
    "User-Agent": DEFAULT_BROWSER_UA,
    Range: "bytes=0-1023"
  };
  for (const candidate of candidates) {
    try {
      let { res, finalUrl } = await fetchWithSsrfCheckedRedirects(
        candidate,
        { headers: baseHeaders, signal: AbortSignal.timeout(2500) },
        { restrictToDriveHosts: true }
      );
      if (!res.ok) continue;
      let ct = String(res.headers?.get?.("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        const html = (await readResponseChunkBounded(res, 131072)).toString("utf8");
        try {
          void res.body?.cancel?.();
        } catch {
        }
        const confirmUrl = extractDriveConfirmationDownloadUrl(html, finalUrl);
        if (!confirmUrl) continue;
        const confirmed = await fetchWithSsrfCheckedRedirects(
          confirmUrl,
          { headers: baseHeaders, signal: AbortSignal.timeout(2500) },
          { restrictToDriveHosts: true }
        );
        res = confirmed.res;
        finalUrl = confirmed.finalUrl;
        if (!res.ok) continue;
        ct = String(res.headers?.get?.("content-type") || "").toLowerCase();
        if (ct.includes("text/html")) {
          try {
            void res.body?.cancel?.();
          } catch {
          }
          continue;
        }
      }
      const acceptRanges = String(res.headers?.get?.("accept-ranges") || "").toLowerCase();
      const supportsByteRange = res.status === 206 || acceptRanges.includes("bytes");
      const headBuf = await readResponseChunkBounded(res, 1024);
      try {
        void res.body?.cancel?.();
      } catch {
      }
      if (!supportsByteRange) {
        continue;
      }
      const isDirectVideoMime = ct.startsWith("video/");
      const isStreamableBinary = (ct.includes("application/octet-stream") || ct.includes("binary/octet-stream")) && looksLikePlayableVideoMagic(headBuf);
      if (isDirectVideoMime || isStreamableBinary) {
        driveStreamUrlCache.set(cleanId, { streamUrl: finalUrl, ts: now });
        return finalUrl;
      }
    } catch {
    }
  }
  driveStreamUrlCache.set(cleanId, { streamUrl: null, ts: now });
  return null;
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
walletRouter.get("/exams/:examId/access", requireAuth, async (req, res) => {
  try {
    const result = await checkExamAccess(req.user.uid, req.params.examId, req.user.role);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: "access_check_error", message: err.message || "Kh\xF4ng ki\u1EC3m tra \u0111\u01B0\u1EE3c quy\u1EC1n truy c\u1EADp." });
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
walletRouter.post(["/vouchers/validate", "/wallet/vouchers/validate", "/wallet/validate-voucher"], requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { code, context, amountVnd, examId, courseId } = req.body || {};
    const result = await validateVoucher({
      code: String(code || "").trim(),
      uid,
      context: context || "exam_unlock",
      amountVnd: Number(amountVnd || 0),
      examId,
      courseId
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: "voucher_validate_error", message: err.message || String(err) });
  }
});
walletRouter.get(
  ["/vouchers/inspect/:code", "/wallet/vouchers/inspect/:code"],
  async (req, res) => {
    try {
      const code = String(req.params.code || "").trim();
      let verifiedUid;
      const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
      if (token && !/^(student_|dk_admin_)/.test(token) && adminAuth) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          verifiedUid = decoded.uid;
        } catch {
          verifiedUid = void 0;
        }
      }
      const result = await inspectVoucher(code, verifiedUid);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: "voucher_inspect_error", message: err.message || String(err) });
    }
  }
);
walletRouter.post(
  ["/vouchers/save", "/wallet/vouchers/save"],
  requireAuth,
  async (req, res) => {
    try {
      const { code } = req.body || {};
      if (!code) {
        return res.status(400).json({ error: "missing_code", message: "Vui l\xF2ng cung c\u1EA5p m\xE3 voucher c\u1EA7n l\u01B0u." });
      }
      const result = await recordVoucherSave(String(code).trim());
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: "voucher_save_error", message: err.message || String(err) });
    }
  }
);
walletRouter.post(["/vouchers/redeem-gift", "/wallet/vouchers/redeem-gift", "/wallet/redeem-gift", "/redeem-gift"], requireAuth, async (req, res) => {
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
walletRouter.get(
  ["/referral/me", "/wallet/referral/me"],
  requireAuth,
  async (req, res) => {
    try {
      const uid = req.user.uid;
      const clientIp = extractClientIp(req);
      const deviceFingerprint = String(req.headers["x-device-fingerprint"] || "").trim() || null;
      const result = await getOrCreateReferralProfile(uid, {
        ip: clientIp,
        deviceFingerprint
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ error: "referral_profile_error", message: err.message || String(err) });
    }
  }
);
walletRouter.post(
  ["/referral/claim", "/wallet/referral/claim"],
  requireAuth,
  async (req, res) => {
    try {
      const uid = req.user.uid;
      const { code, deviceFingerprint: bodyFingerprint } = req.body || {};
      if (!code || !String(code).trim()) {
        return res.status(400).json({ error: "missing_code", message: "Vui l\xF2ng nh\u1EADp m\xE3 gi\u1EDBi thi\u1EC7u." });
      }
      const clientIp = extractClientIp(req);
      const deviceFingerprint = String(bodyFingerprint || req.headers["x-device-fingerprint"] || "").trim() || null;
      const result = await claimReferralCode(uid, String(code).trim(), {
        ip: clientIp,
        deviceFingerprint,
        refereeEmail: req.user.email || null,
        refereeName: req.user.displayName || null
      });
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: "referral_claim_error", message: err.message || String(err) });
    }
  }
);
walletRouter.post(
  ["/referral/withdraw", "/wallet/referral/withdraw"],
  requireAuth,
  async (req, res) => {
    try {
      const uid = req.user.uid;
      const { amountVnd } = req.body || {};
      const parsedAmount = amountVnd !== void 0 && amountVnd !== null && amountVnd !== "" ? Number(amountVnd) : void 0;
      const result = await withdrawReferralBalanceToWallet(uid, parsedAmount);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: "referral_withdraw_error", message: err.message || String(err) });
    }
  }
);
walletRouter.get("/courses/:courseId/access", requireAuth, async (req, res) => {
  try {
    const result = await checkCourseAccess(req.user.uid, req.params.courseId, req.user.role);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: "course_access_error", message: err.message || "Kh\xF4ng ki\u1EC3m tra \u0111\u01B0\u1EE3c quy\u1EC1n truy c\u1EADp kh\xF3a h\u1ECDc." });
  }
});
walletRouter.post("/courses/:courseId/unlock", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const courseId = req.params.courseId;
    const { idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockCourse(uid, courseId, idempotencyKey, voucherCode);
    return res.json({
      success: true,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
      message: result.alreadyUnlocked ? "Kh\xF3a h\u1ECDc \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a tr\u01B0\u1EDBc \u0111\xF3." : "M\u1EDF kh\xF3a tr\u1ECDn kh\xF3a h\u1ECDc th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "course_unlock_error", message: msg });
  }
});
walletRouter.post("/courses/:courseId/unlock-bundle", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const courseId = req.params.courseId;
    const { bundleType, chapterId, topicTitle, lessonIds, idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockCourseBundle(uid, courseId, {
      bundleType,
      chapterId,
      topicTitle,
      lessonIds: Array.isArray(lessonIds) ? lessonIds : void 0,
      idempotencyKey,
      voucherCode
    });
    return res.json({
      success: true,
      ...result,
      message: result.alreadyUnlocked ? "To\xE0n b\u1ED9 video trong g\xF3i n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a tr\u01B0\u1EDBc \u0111\xF3." : `M\u1EDF kh\xF3a th\xE0nh c\xF4ng ${result.unlockedCount} video b\xE0i gi\u1EA3ng!`
    });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "course_bundle_unlock_error", message: msg });
  }
});
walletRouter.post("/courses/:courseId/lessons/:lessonId/unlock", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { courseId, lessonId } = req.params;
    const { idempotencyKey, voucherCode } = req.body || {};
    const result = await unlockCourseLesson(uid, courseId, lessonId, idempotencyKey, voucherCode);
    return res.json({
      success: true,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
      message: result.alreadyUnlocked ? "B\xE0i gi\u1EA3ng \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a tr\u01B0\u1EDBc \u0111\xF3." : "M\u1EDF kh\xF3a b\xE0i gi\u1EA3ng th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7")) {
      return res.status(402).json({ error: "insufficient_balance", message: msg });
    }
    return res.status(400).json({ error: "lesson_unlock_error", message: msg });
  }
});
walletRouter.get("/courses/:courseId/lessons/:lessonId/content", requireAuth, async (req, res) => {
  try {
    const lesson = await getAuthorizedLessonContent(
      req.user.uid,
      req.params.courseId,
      req.params.lessonId,
      req.user.role
    );
    return res.json({ success: true, lesson });
  } catch (err) {
    const msg = err.message || String(err);
    const status = msg.includes("tr\u1EA3 ph\xED") ? 403 : 400;
    return res.status(status).json({ error: "lesson_access_error", message: msg });
  }
});
walletRouter.get("/courses/:courseId/lessons/:lessonId/stream", requireAuth, async (req, res) => {
  try {
    const lesson = await getAuthorizedLessonContent(
      req.user.uid,
      req.params.courseId,
      req.params.lessonId,
      req.user.role
    );
    const driveId = extractGoogleDriveFileId(lesson.videoUrl || "");
    if (!driveId) {
      return res.json({ success: true, streamUrl: null });
    }
    const streamUrl = await resolveDriveDirectStreamUrl(driveId);
    return res.json({ success: true, streamUrl });
  } catch (err) {
    const msg = err.message || String(err);
    const status = msg.includes("tr\u1EA3 ph\xED") ? 403 : 400;
    return res.status(status).json({ error: "lesson_stream_error", message: msg });
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
 * 
 * Fully supports dual modes:
 * - Admin SDK mode (when service account is available)
 * - REST API fallback mode (when running without service account private key)
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Referral & Anti-Fraud Service (DkTEST)
 * - Invite friends to use DkTEST and earn a server-generated random reward (100đ - 1,000đ)
 * - Minimum withdrawal from Referral Balance to DkTEST Wallet: 1,000đ
 * - Strict anti-fraud checks: IP hash guard, device fingerprint guard, self-referral check,
 *   mutual loop prevention, account age & status check, and daily velocity limit.
 *
 * Supports dual modes:
 * - Firebase Admin SDK (atomic Firestore transactions)
 * - Firestore REST API fallback (when running without service account key)
 */
