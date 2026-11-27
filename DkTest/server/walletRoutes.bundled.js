var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/routes/walletRoutes.ts
import { Router as Router4 } from "express";

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
async function getFirestoreRestDocs(collectionName, pageSize = 50, useCache = true, cacheTtlMs = 6e4) {
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
      return "M\xE3 n\xE0y l\xE0 Voucher gi\u1EA3m gi\xE1 m\u1EDF kh\xF3a \u0111\u1EC1 thi / kh\xF3a h\u1ECDc / t\xE0i li\u1EC7u \u2014 kh\xF4ng \xE1p d\u1EE5ng khi n\u1EA1p ti\u1EC1n! Vui l\xF2ng d\xF9ng m\xE3 n\xE0y \u1EDF b\u01B0\u1EDBc m\u1EDF kh\xF3a.";
    }
    if (voucherType === "gift_money") {
      return "M\xE3 n\xE0y l\xE0 Voucher t\u1EB7ng ti\u1EC1n th\u1EB3ng v\xE0o v\xED \u2014 h\xE3y nh\u1EADp \u1EDF m\u1EE5c 'Nh\u1EADp m\xE3 Voucher qu\xE0 t\u1EB7ng' ph\xEDa tr\xEAn \u0111\u1EC3 nh\u1EADn ti\u1EC1n ngay!";
    }
    return "M\xE3 n\xE0y kh\xF4ng \xE1p d\u1EE5ng \u01B0u \u0111\xE3i khi n\u1EA1p ti\u1EC1n.";
  }
  if (context === "exam_unlock" || context === "course_unlock" || context === "document_unlock") {
    const itemLabel = context === "course_unlock" ? "kh\xF3a h\u1ECDc / b\xE0i gi\u1EA3ng" : context === "document_unlock" ? "t\xE0i li\u1EC7u" : "\u0111\u1EC1 thi";
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
  if (params.context === "exam_unlock" || params.context === "course_unlock" || params.context === "document_unlock") {
    const itemLabel = params.context === "course_unlock" ? "kh\xF3a h\u1ECDc / b\xE0i gi\u1EA3ng" : params.context === "document_unlock" ? "t\xE0i li\u1EC7u" : "b\xE0i thi";
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
async function getStudentTransactions(uid, limitCount = 5) {
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
async function getStudentDepositRequests(uid, limitCount = 5) {
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
function evaluateServerCourseResourceAccess(course, lesson, access, resourceKind) {
  const mode = resolveCourseAccessModeServer(course);
  if (mode === "free" || access.isFreeCourse) return true;
  const unlockedByCourse = access.unlockedCourse && (access.unlockFullPolicy === "unlock_all_videos" || lesson.includedInCourseUnlock !== false);
  if (unlockedByCourse) return true;
  const enabled = course.unlockResourcesWithVideo !== false;
  const kindEnabled = enabled && (resourceKind === "material" ? course.unlockMaterialsWithVideo !== false : course.unlockExamsWithVideo !== false);
  if (!kindEnabled) return false;
  const scope = course.resourceUnlockScope || "any_video_in_topic";
  const outline = Array.isArray(course.lessonOutline) && course.lessonOutline.length > 0 ? course.lessonOutline : [lesson];
  const isItemWatchedOrUnlocked = (item) => {
    const free = isLessonFreeEffective(course, item);
    const byCourse = access.unlockedCourse && (access.unlockFullPolicy === "unlock_all_videos" || item.includedInCourseUnlock !== false);
    const byLesson = access.unlockedLessonIds.includes(item.id);
    return {
      canWatch: free || byCourse || byLesson,
      paidUnlocked: byCourse || byLesson
    };
  };
  const chapterKey = (chId) => String(chId || "__other__").trim() || "__other__";
  const topicKey = (id, tp) => String(tp || "").trim() || `__single_${id}`;
  const targetChapter = chapterKey(lesson.chapterId);
  const targetTopic = topicKey(lesson.id, lesson.topicTitle);
  const selfState = isItemWatchedOrUnlocked(lesson);
  const topicItems = outline.filter(
    (item) => chapterKey(item.chapterId) === targetChapter && topicKey(item.id, item.topicTitle) === targetTopic
  );
  const effectiveTopicItems = topicItems.length > 0 ? topicItems : [lesson];
  const chapterItems = outline.filter((item) => chapterKey(item.chapterId) === targetChapter);
  const effectiveChapterItems = chapterItems.length > 0 ? chapterItems : [lesson];
  switch (scope) {
    case "same_lesson":
      return selfState.canWatch;
    case "any_video_in_topic":
      return selfState.canWatch || effectiveTopicItems.some((item) => isItemWatchedOrUnlocked(item).paidUnlocked);
    case "full_topic":
      return effectiveTopicItems.every((item) => isItemWatchedOrUnlocked(item).canWatch);
    case "full_chapter":
      return effectiveChapterItems.every((item) => isItemWatchedOrUnlocked(item).canWatch);
    case "full_course":
      return access.unlockedCourse || outline.every((item) => isItemWatchedOrUnlocked(item).canWatch);
    default:
      return selfState.canWatch || effectiveTopicItems.some((item) => isItemWatchedOrUnlocked(item).paidUnlocked);
  }
}
async function getAuthorizedLessonContent(uid, courseId, lessonId, role) {
  const [course, lesson] = await Promise.all([
    fetchCourseDoc(courseId),
    fetchLessonDoc(courseId, lessonId)
  ]);
  if (!course || !lesson) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y b\xE0i gi\u1EA3ng ho\u1EB7c kh\xF3a h\u1ECDc.");
  }
  if (isAdminRole(role)) {
    return lesson;
  }
  const access = await checkCourseAccess(uid, courseId, role);
  const isFree = isLessonFreeEffective(course, lesson);
  const unlockedByCourse = access.unlockedCourse && (access.unlockFullPolicy === "unlock_all_videos" || lesson.includedInCourseUnlock !== false);
  const unlockedByLesson = access.unlockedLessonIds.includes(lessonId);
  const canWatchVideo = isFree || unlockedByCourse || unlockedByLesson;
  const canAccessMaterials = evaluateServerCourseResourceAccess(course, lesson, access, "material");
  const canAccessExam = evaluateServerCourseResourceAccess(course, lesson, access, "exam");
  if (!canWatchVideo) {
    if (canAccessMaterials || canAccessExam) {
      return {
        ...lesson,
        videoUrl: "",
        materials: canAccessMaterials ? lesson.materials : [],
        linkedExamId: canAccessExam ? lesson.linkedExamId : void 0
      };
    }
    throw new Error("B\xE0i gi\u1EA3ng tr\u1EA3 ph\xED. Vui l\xF2ng m\u1EDF kh\xF3a kh\xF3a h\u1ECDc ho\u1EB7c b\xE0i gi\u1EA3ng \u0111\u1EC3 xem video.");
  }
  return {
    ...lesson,
    materials: canAccessMaterials ? lesson.materials : [],
    linkedExamId: canAccessExam ? lesson.linkedExamId : void 0
  };
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

// server/routes/aiShopStudentRoutes.ts
import { Router } from "express";
import { ZodError } from "zod";

// server/services/aiShopService.ts
import { z as z2 } from "zod";

// src/services/aiShop/initialCatalog.ts
var STOREFRONT_CATEGORIES = [
  {
    key: "chatgpt",
    title: "CHAT GPT",
    subtitle: "ChatGPT Plus 30 ng\xE0y \u2014 ch\u1ECDn g\xF3i S\xE0i ri\xEAng ho\u1EB7c D\xF9ng chung",
    badge: "OpenAI",
    gradient: "from-emerald-500 to-teal-600",
    requiresUpgradeEmail: false,
    sortOrder: 1
  },
  {
    key: "gemini_pro_3m",
    title: "Gemini Pro 3M",
    subtitle: "Gemini Pro ch\xEDnh ch\u1EE7 3 th\xE1ng \u2014 ch\u1ECDn Link Offer ho\u1EB7c Pay h\u1ED9",
    badge: "Google AI",
    gradient: "from-blue-600 to-indigo-600",
    requiresUpgradeEmail: false,
    sortOrder: 2
  },
  {
    key: "gemini_plus_6m",
    title: "Gemini Plus 6M",
    subtitle: "Gemini Plus ch\xEDnh ch\u1EE7 6 th\xE1ng \u2014 ch\u1ECDn Link Offer ho\u1EB7c Pay h\u1ED9",
    badge: "Google AI",
    gradient: "from-sky-500 to-blue-600",
    requiresUpgradeEmail: false,
    sortOrder: 3
  },
  {
    key: "gemini_pro_fam",
    title: "Gemini Pro (Add Fam)",
    subtitle: "Add Family theo th\xE1ng \u2014 ch\u1ECDn Slot L\u1ECFm (Web) ho\u1EB7c Slot Ngon (Full Antigravity)",
    badge: "Add Fam",
    gradient: "from-violet-600 to-purple-600",
    requiresUpgradeEmail: true,
    sortOrder: 4
  },
  {
    key: "yt_pre",
    title: "Yt Pre",
    subtitle: "YouTube Premium kh\xF4ng qu\u1EA3ng c\xE1o, ph\xE1t n\u1EC1n & YouTube Music \u2014 gia h\u1EA1n th\xE1ng",
    badge: "YouTube",
    gradient: "from-rose-500 to-red-600",
    requiresUpgradeEmail: true,
    sortOrder: 5
  },
  {
    key: "verify_student",
    title: "Verify Student",
    subtitle: "X\xE1c minh t\xE0i kho\u1EA3n sinh vi\xEAn theo l\u01B0\u1EE3t nhanh ch\xF3ng",
    badge: "Verify",
    gradient: "from-amber-500 to-orange-600",
    requiresUpgradeEmail: true,
    sortOrder: 6
  },
  {
    key: "other",
    title: "D\u1ECBch v\u1EE5 kh\xE1c",
    subtitle: "C\xE1c g\xF3i d\u1ECBch v\u1EE5 AI m\u1EDF r\u1ED9ng kh\xE1c t\u1EEB qu\u1EA3n tr\u1ECB vi\xEAn",
    badge: "Kh\xE1c",
    gradient: "from-slate-600 to-slate-700",
    requiresUpgradeEmail: false,
    sortOrder: 99
  }
];
var INITIAL_AI_SERVICES = [
  {
    id: "svc_chatgpt_plus_30d_private",
    code: "GPT-30D-RIENG",
    name: "ChatGPT Plus 30D - ri\xEAng",
    categoryKey: "chatgpt",
    categoryLabel: "CHAT GPT",
    variantLabel: "S\xE0i ri\xEAng (30 ng\xE0y)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 185e3,
    defaultRecurringPriceVnd: null,
    durationValue: 30,
    durationUnit: "days",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. T\xE0i kho\u1EA3n s\xE0i ri\xEAng 30 ng\xE0y. Gi\xE1 dao \u0111\u1ED9ng ~185.000\u0111 (c\xF3 th\u1EC3 ch\u1EC9nh khi t\u1EA1o \u0111\u01A1n).",
    studentVisible: true,
    sortOrder: 1
  },
  {
    id: "svc_chatgpt_plus_30d_shared",
    code: "GPT-30D-CHUNG",
    name: "ChatGPT Plus 30D - chung",
    categoryKey: "chatgpt",
    categoryLabel: "CHAT GPT",
    variantLabel: "D\xF9ng chung (30 ng\xE0y)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 5e4,
    defaultRecurringPriceVnd: null,
    durationValue: 30,
    durationUnit: "days",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. T\xE0i kho\u1EA3n d\xF9ng chung 30 ng\xE0y.",
    studentVisible: true,
    sortOrder: 2
  },
  {
    id: "svc_gemini_pro_3m_offer",
    code: "GEM-PRO-3M-OFFER",
    name: "Gemini Pro 3M - link offer",
    categoryKey: "gemini_pro_3m",
    categoryLabel: "Gemini Pro 3M",
    variantLabel: "Link Offer (3 th\xE1ng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 35e3,
    defaultRecurringPriceVnd: null,
    durationValue: 3,
    durationUnit: "months",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. Ch\xEDnh ch\u1EE7 3 th\xE1ng n\xE2ng b\u1EB1ng link offer.",
    studentVisible: true,
    sortOrder: 3
  },
  {
    id: "svc_gemini_pro_3m_payho",
    code: "GEM-PRO-3M-PAYHO",
    name: "Gemini Pro 3M - pay h\u1ED9",
    categoryKey: "gemini_pro_3m",
    categoryLabel: "Gemini Pro 3M",
    variantLabel: "Pay h\u1ED9 (3 th\xE1ng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 4e4,
    defaultRecurringPriceVnd: null,
    durationValue: 3,
    durationUnit: "months",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. Ch\xEDnh ch\u1EE7 3 th\xE1ng, shop pay h\u1ED9.",
    studentVisible: true,
    sortOrder: 4
  },
  {
    id: "svc_gemini_plus_6m_offer",
    code: "GEM-PLUS-6M-OFFER",
    name: "Gemini Plus 6M - link offer",
    categoryKey: "gemini_plus_6m",
    categoryLabel: "Gemini Plus 6M",
    variantLabel: "Link Offer (6 th\xE1ng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 25e3,
    defaultRecurringPriceVnd: null,
    durationValue: 6,
    durationUnit: "months",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. Ch\xEDnh ch\u1EE7 6 th\xE1ng n\xE2ng b\u1EB1ng link offer.",
    studentVisible: true,
    sortOrder: 5
  },
  {
    id: "svc_gemini_plus_6m_payho",
    code: "GEM-PLUS-6M-PAYHO",
    name: "Gemini Plus 6M - pay h\u1ED9",
    categoryKey: "gemini_plus_6m",
    categoryLabel: "Gemini Plus 6M",
    variantLabel: "Pay h\u1ED9 (6 th\xE1ng)",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: 3e4,
    defaultRecurringPriceVnd: null,
    durationValue: 6,
    durationUnit: "months",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. Ch\xEDnh ch\u1EE7 6 th\xE1ng, shop pay h\u1ED9.",
    studentVisible: true,
    sortOrder: 6
  },
  {
    id: "svc_gemini_pro_slot_lom",
    code: "GEM-PRO-SLOT-LOM",
    name: "Gemini Pro slot l\u1ECFm",
    categoryKey: "gemini_pro_fam",
    categoryLabel: "Gemini Pro (Add Fam)",
    variantLabel: "Slot L\u1ECFm (H\u1ED7 tr\u1EE3 t\u1ED1t Gemini Web)",
    requiresUpgradeEmail: true,
    billingType: "monthly",
    defaultFirstPriceVnd: 15e3,
    defaultRecurringPriceVnd: 5e3,
    durationValue: 1,
    durationUnit: "months",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. H\u1ED7 tr\u1EE3 t\u1ED1t Gemini Web. K\u1EF3 \u0111\u1EA7u 15.000\u0111, t\u1EEB k\u1EF3 2 ch\u1EC9 5.000\u0111/th\xE1ng.",
    studentVisible: true,
    sortOrder: 7
  },
  {
    id: "svc_gemini_pro_slot_ngon",
    code: "GEM-PRO-SLOT-NGON",
    name: "Gemini Pro slot ngon",
    categoryKey: "gemini_pro_fam",
    categoryLabel: "Gemini Pro (Add Fam)",
    variantLabel: "Slot Ngon (Full model Pro Antigravity)",
    requiresUpgradeEmail: true,
    billingType: "monthly",
    defaultFirstPriceVnd: 25e3,
    defaultRecurringPriceVnd: 25e3,
    durationValue: 1,
    durationUnit: "months",
    conditions: "Kh\xF4ng b\u1EA3o h\xE0nh. C\xF3 full c\xE1c model h\u1ED7 tr\u1EE3 g\xF3i Pro m\u1EDBi nh\u1EA5t trong Antigravity. 25.000\u0111/th\xE1ng.",
    studentVisible: true,
    sortOrder: 8
  },
  {
    id: "svc_youtube_premium_slot",
    code: "YT-PREM-SLOT",
    name: "YouTube Premium slot",
    categoryKey: "yt_pre",
    categoryLabel: "Yt Pre",
    variantLabel: "YouTube Premium Slot (1 th\xE1ng)",
    requiresUpgradeEmail: true,
    billingType: "monthly",
    defaultFirstPriceVnd: 25e3,
    defaultRecurringPriceVnd: 25e3,
    durationValue: 1,
    durationUnit: "months",
    conditions: "Slot YouTube Premium gia h\u1EA1n h\xE0ng th\xE1ng (25.000\u0111/th\xE1ng).",
    studentVisible: true,
    sortOrder: 9
  },
  {
    id: "svc_verify_student",
    code: "VERIFY-STUDENT",
    name: "Verify Student",
    categoryKey: "verify_student",
    categoryLabel: "Verify Student",
    variantLabel: "Verify Student (Theo l\u01B0\u1EE3t)",
    requiresUpgradeEmail: true,
    billingType: "one_time",
    defaultFirstPriceVnd: 2e4,
    defaultRecurringPriceVnd: null,
    durationValue: null,
    durationUnit: null,
    conditions: "Nh\u1EADn Verify Student theo l\u01B0\u1EE3t.",
    studentVisible: true,
    sortOrder: 10
  },
  {
    id: "svc_custom_quote",
    code: "GOI-KHAC",
    name: "G\xF3i kh\xE1c (b\xE1o gi\xE1 ri\xEAng)",
    categoryKey: "other",
    categoryLabel: "D\u1ECBch v\u1EE5 kh\xE1c",
    variantLabel: "B\xE1o gi\xE1 ri\xEAng",
    requiresUpgradeEmail: false,
    billingType: "one_time",
    defaultFirstPriceVnd: null,
    defaultRecurringPriceVnd: null,
    durationValue: null,
    durationUnit: null,
    conditions: "H\u1ED7 tr\u1EE3 c\xE1c g\xF3i kh\xE1c theo y\xEAu c\u1EA7u \u2014 ch\u01B0a c\xF3 gi\xE1 c\u1ED1 \u0111\u1ECBnh, b\u1EAFt bu\u1ED9c nh\u1EADp gi\xE1 khi t\u1EA1o \u0111\u01A1n.",
    studentVisible: false,
    sortOrder: 11
  }
];
function resolveServiceStorefrontMeta(service) {
  const seedMatch = INITIAL_AI_SERVICES.find((s) => s.id === service.id);
  const norm = `${service.name} ${service.code}`.toLowerCase();
  let categoryKey = service.categoryKey || seedMatch?.categoryKey || "other";
  if (!service.categoryKey && !seedMatch) {
    if (norm.includes("chatgpt") || norm.includes("gpt")) categoryKey = "chatgpt";
    else if (norm.includes("gemini pro") && norm.includes("3m")) categoryKey = "gemini_pro_3m";
    else if (norm.includes("gemini plus") && norm.includes("6m")) categoryKey = "gemini_plus_6m";
    else if (norm.includes("gemini pro") && (norm.includes("slot") || norm.includes("fam")))
      categoryKey = "gemini_pro_fam";
    else if (norm.includes("youtube") || norm.includes("yt")) categoryKey = "yt_pre";
    else if (norm.includes("verify") || norm.includes("student")) categoryKey = "verify_student";
  }
  const catDef = STOREFRONT_CATEGORIES.find((c) => c.key === categoryKey) || STOREFRONT_CATEGORIES[STOREFRONT_CATEGORIES.length - 1];
  const requiresUpgradeEmail = typeof service.requiresUpgradeEmail === "boolean" ? service.requiresUpgradeEmail : seedMatch?.requiresUpgradeEmail ?? catDef.requiresUpgradeEmail;
  const variantLabel = service.variantLabel || seedMatch?.variantLabel || service.name;
  return {
    categoryKey,
    categoryLabel: service.categoryLabel || seedMatch?.categoryLabel || catDef.title,
    variantLabel,
    requiresUpgradeEmail
  };
}
function buildSeedServiceRecords(nowIso) {
  return INITIAL_AI_SERVICES.map((item) => ({
    ...item,
    status: "active",
    createdAt: nowIso,
    updatedAt: nowIso
  }));
}

// src/services/aiShop/billingEngine.ts
var VN_TIMEZONE = "Asia/Ho_Chi_Minh";
var MAX_MONTHLY_PERIODS = 240;
function isValidIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const maxDay = getDaysInMonth(y, m);
  return d >= 1 && d <= maxDay;
}
function getDaysInMonth(year, month1To12) {
  return new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
}
function getTodayVnDate(now = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const formatted = formatter.format(now);
  if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    return formatted;
  }
  const vnMs = now.getTime() + 7 * 60 * 60 * 1e3;
  const d = new Date(vnMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function toIntVnd(value) {
  const num = typeof value === "number" ? value : Number(String(value ?? "").replace(/[.,\sđvnd]/gi, ""));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.trunc(num);
}
function addMonthsAnchored(anchorIsoDate, monthsToAdd) {
  const [y, m, d] = anchorIsoDate.split("-").map(Number);
  const totalMonths = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12 + 12) % 12 + 1;
  const clampedDay = Math.min(d, getDaysInMonth(targetYear, targetMonth));
  return `${String(targetYear).padStart(4, "0")}-${String(targetMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}
function addDaysIso(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${String(dt.getUTCFullYear()).padStart(4, "0")}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function computeOneTimeServiceExpiry(startDate, durationValue, durationUnit) {
  if (!isValidIsoDate(startDate) || !durationValue || durationValue <= 0 || !durationUnit) {
    return null;
  }
  if (durationUnit === "days") {
    return addDaysIso(startDate, Math.trunc(durationValue));
  }
  return addMonthsAnchored(startDate, Math.trunc(durationValue));
}
function computeOrderFinancialSummary(order, allPaymentsForOrder, asOfDate = getTodayVnDate(), upcomingHorizonDays = 31) {
  const qty = Math.max(1, Math.trunc(Number(order.quantity) || 1));
  const firstUnitPrice = toIntVnd(order.firstCyclePriceVnd);
  const recurringUnitPrice = order.billingType === "monthly" ? toIntVnd(order.recurringPriceVnd ?? order.firstCyclePriceVnd) : 0;
  const stopDate = order.stopDate && isValidIsoDate(order.stopDate) ? order.stopDate : null;
  const activePayments = allPaymentsForOrder.filter((p) => p.orderId === order.id && p.status === "active" && toIntVnd(p.amountVnd) > 0).sort((a, b) => {
    if (a.paidDate !== b.paidDate) return a.paidDate.localeCompare(b.paidDate);
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.id.localeCompare(b.id);
  });
  const totalPaidVnd = activePayments.reduce((sum, p) => sum + toIntVnd(p.amountVnd), 0);
  const rawPeriods = [];
  if (order.billingType === "one_time") {
    const dueDate = order.startDate;
    const blockedByStop = Boolean(stopDate && dueDate >= stopDate);
    if (!blockedByStop && isValidIsoDate(dueDate)) {
      const naturalExpiry = computeOneTimeServiceExpiry(
        order.startDate,
        order.durationValue,
        order.durationUnit
      );
      const coverageEndDate = stopDate && naturalExpiry && stopDate < naturalExpiry ? stopDate : naturalExpiry ?? stopDate;
      rawPeriods.push({
        periodNumber: 1,
        dueDate,
        coverageEndDate,
        amountVnd: firstUnitPrice * qty
      });
    }
  } else {
    const horizonDate = addDaysIso(asOfDate, Math.max(0, upcomingHorizonDays));
    let remainingCoverPool = totalPaidVnd;
    let addedOneFuturePreview = false;
    for (let k = 0; k < MAX_MONTHLY_PERIODS; k++) {
      const dueDate = addMonthsAnchored(order.startDate, k);
      if (stopDate && dueDate >= stopDate) {
        break;
      }
      const amountVnd = (k === 0 ? firstUnitPrice : recurringUnitPrice) * qty;
      const isDueOrWithinHorizon = dueDate <= horizonDate;
      const neededForPrepaidAllocation = remainingCoverPool > 0 && amountVnd > 0;
      if (!isDueOrWithinHorizon && !neededForPrepaidAllocation) {
        if (!addedOneFuturePreview && rawPeriods.length === 0) {
          addedOneFuturePreview = true;
        } else {
          break;
        }
      }
      const nextCycleDate = addMonthsAnchored(order.startDate, k + 1);
      const coverageEndDate = stopDate && stopDate < nextCycleDate ? stopDate : nextCycleDate;
      rawPeriods.push({
        periodNumber: k + 1,
        dueDate,
        coverageEndDate,
        amountVnd
      });
      remainingCoverPool = Math.max(0, remainingCoverPool - amountVnd);
      if (dueDate > horizonDate && remainingCoverPool === 0) {
        break;
      }
    }
  }
  let pool = totalPaidVnd;
  const periods = rawPeriods.map((raw) => {
    const allocatedVnd = Math.min(pool, raw.amountVnd);
    pool -= allocatedVnd;
    const remainingVnd = raw.amountVnd - allocatedVnd;
    const isDue = raw.dueDate <= asOfDate;
    const isOverdue = raw.dueDate < asOfDate && remainingVnd > 0;
    const isDueToday = raw.dueDate === asOfDate && remainingVnd > 0;
    let status2;
    if (raw.amountVnd === 0 || remainingVnd === 0) {
      status2 = "paid";
    } else if (allocatedVnd > 0) {
      status2 = "partial";
    } else if (isOverdue) {
      status2 = "overdue";
    } else {
      status2 = "upcoming";
    }
    return {
      periodKey: `${order.id}__P${raw.periodNumber}`,
      orderId: order.id,
      periodNumber: raw.periodNumber,
      dueDate: raw.dueDate,
      coverageEndDate: raw.coverageEndDate,
      amountVnd: raw.amountVnd,
      allocatedVnd,
      remainingVnd,
      isDue,
      isOverdue,
      isDueToday,
      status: status2
    };
  });
  let dueUpToAsOfDateVnd = 0;
  let allocatedToDueVnd = 0;
  let debtUpToAsOfDateVnd = 0;
  let hasOverdue = false;
  for (const p of periods) {
    if (p.isDue) {
      dueUpToAsOfDateVnd += p.amountVnd;
      allocatedToDueVnd += p.allocatedVnd;
      debtUpToAsOfDateVnd += p.remainingVnd;
    }
    if (p.isOverdue) {
      hasOverdue = true;
    }
  }
  const prepaidVnd = Math.max(0, totalPaidVnd - allocatedToDueVnd);
  const isStopped = Boolean(stopDate && stopDate <= asOfDate);
  let serviceExpiryDate = null;
  if (order.billingType === "one_time") {
    const computedExpiry = computeOneTimeServiceExpiry(
      order.startDate,
      order.durationValue,
      order.durationUnit
    );
    if (stopDate && computedExpiry) {
      serviceExpiryDate = stopDate < computedExpiry ? stopDate : computedExpiry;
    } else {
      serviceExpiryDate = computedExpiry ?? stopDate;
    }
  } else {
    if (stopDate) {
      serviceExpiryDate = stopDate;
    } else {
      const coveredOrDuePeriods = periods.filter((p) => p.isDue || p.allocatedVnd > 0);
      const refPeriod = coveredOrDuePeriods.length > 0 ? coveredOrDuePeriods[coveredOrDuePeriods.length - 1] : periods[0];
      serviceExpiryDate = refPeriod?.coverageEndDate ?? null;
    }
  }
  const isExpiredOneTime = Boolean(
    order.billingType === "one_time" && serviceExpiryDate && serviceExpiryDate < asOfDate
  );
  const isActive = !isStopped && !isExpiredOneTime;
  const nextUnpaidPeriod = periods.find((p) => p.remainingVnd > 0) ?? null;
  let status;
  if (hasOverdue) {
    status = "overdue";
  } else if (isStopped && debtUpToAsOfDateVnd === 0) {
    status = "stopped";
  } else if (debtUpToAsOfDateVnd > 0 && allocatedToDueVnd > 0) {
    status = "partial";
  } else if (debtUpToAsOfDateVnd > 0) {
    status = "upcoming";
  } else if (dueUpToAsOfDateVnd > 0 || periods.length > 0 && periods[0].remainingVnd === 0) {
    status = "paid";
  } else {
    status = "upcoming";
  }
  return {
    order,
    periods,
    dueUpToAsOfDateVnd,
    totalPaidVnd,
    allocatedToDueVnd,
    debtUpToAsOfDateVnd,
    prepaidVnd,
    hasOverdue,
    isStopped,
    isActive,
    status,
    nextDueDate: nextUnpaidPeriod?.dueDate ?? null,
    nextDueAmountVnd: nextUnpaidPeriod?.remainingVnd ?? 0,
    serviceExpiryDate,
    activePaymentCount: activePayments.length
  };
}

// server/services/notificationPushService.ts
import { z } from "zod";
var COL_NOTIFS = "notifications";
var FEED_CACHE_TTL_MS = 1e4;
var feedCache = null;
var broadcastNotificationSchema = z.object({
  title: z.string().trim().min(2, "Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1 th\xF4ng b\xE1o.").max(140),
  message: z.string().trim().min(2, "Vui l\xF2ng nh\u1EADp n\u1ED9i dung th\xF4ng b\xE1o.").max(600),
  route: z.string().trim().max(240).optional().default("/"),
  type: z.enum(["minigame_event", "minigame_reward", "ai_order_delivered", "feature_release", "system"]).optional().default("feature_release"),
  recipientUid: z.string().trim().max(128).optional().default("all")
});
function toMillis(val) {
  if (!val) return 0;
  if (typeof val === "number") return val < 1e11 ? val * 1e3 : val;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.seconds === "number") return val.seconds * 1e3;
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
async function fetchNotificationFeed(params) {
  const now = Date.now();
  let allItems;
  if (feedCache && now - feedCache.ts < FEED_CACHE_TTL_MS) {
    allItems = feedCache.items;
  } else {
    let raw = [];
    if (adminDb) {
      const snap = await adminDb.collection(COL_NOTIFS).orderBy("createdAtMs", "desc").limit(15).get();
      raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      raw = await getFirestoreRestDocs(COL_NOTIFS, 15, false);
    }
    allItems = raw.map((d) => {
      const ms = Number(d.createdAtMs) || toMillis(d.createdAt);
      return {
        id: String(d.id || ""),
        recipientUid: String(d.recipientUid || "all"),
        type: d.type || "system",
        title: String(d.title || "Th\xF4ng b\xE1o DkTEST"),
        message: String(d.message || d.body || ""),
        route: typeof d.route === "string" && d.route.startsWith("/") ? d.route : "/",
        read: Boolean(d.read),
        createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date(ms || now).toISOString(),
        createdAtMs: ms,
        actorName: d.actorName ? String(d.actorName) : "DkTEST"
      };
    }).filter((n) => n.id && n.title).sort((a, b) => b.createdAtMs - a.createdAtMs);
    feedCache = { items: allItems, ts: now };
  }
  const sinceMs = Number(params.sinceMs) || 0;
  const maxItems = Math.max(1, Math.min(10, Number(params.limitCount) || 5));
  const uid = params.uid || null;
  return allItems.filter((item) => {
    const targetOk = item.recipientUid === "all" || uid && item.recipientUid === uid;
    if (!targetOk) return false;
    if (sinceMs > 0 && item.createdAtMs <= sinceMs) return false;
    return true;
  }).slice(0, maxItems);
}

// server/services/aiShopService.ts
var COL_SERVICES = "ai_services";
var COL_CUSTOMERS = "ai_customers";
var COL_ORDERS = "ai_orders";
var COL_PAYMENTS = "ai_payments";
var COL_AUDIT_LOGS = "ai_audit_logs";
var COL_IDEMPOTENCY = "ai_idempotency_keys";
var BOOTSTRAP_CACHE_TTL_MS = 30 * 1e3;
var bootstrapCache = null;
var inFlightIdempotency = /* @__PURE__ */ new Map();
function invalidateAiShopCache() {
  bootstrapCache = null;
}
var isoDateSchema = z2.string().refine(isValidIsoDate, {
  message: "Ng\xE0y kh\xF4ng h\u1EE3p l\u1EC7 (\u0111\u1ECBnh d\u1EA1ng YYYY-MM-DD)."
});
var nullableIsoDateSchema = z2.union([isoDateSchema, z2.null(), z2.literal("")]).transform((v) => v ? v : null);
var intVndSchema = z2.number().int().min(0, "S\u1ED1 ti\u1EC1n ph\u1EA3i l\xE0 s\u1ED1 nguy\xEAn VN\u0110 kh\xF4ng \xE2m.");
var positiveIntVndSchema = z2.number().int().min(1, "S\u1ED1 ti\u1EC1n ph\u1EA3i l\u1EDBn h\u01A1n 0 VN\u0110.");
var nullableIntVndSchema = z2.union([intVndSchema, z2.null()]);
var createServiceSchema = z2.object({
  code: z2.string().trim().min(1).max(60).optional(),
  name: z2.string().trim().min(2, "T\xEAn d\u1ECBch v\u1EE5 ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 2 k\xFD t\u1EF1.").max(140),
  billingType: z2.enum(["one_time", "monthly"]),
  defaultFirstPriceVnd: nullableIntVndSchema,
  defaultRecurringPriceVnd: nullableIntVndSchema.optional().default(null),
  durationValue: z2.union([z2.number().int().min(1).max(3650), z2.null()]).optional().default(null),
  durationUnit: z2.union([z2.enum(["days", "months"]), z2.null()]).optional().default(null),
  conditions: z2.string().trim().max(1e3).optional().default(""),
  status: z2.enum(["active", "discontinued"]).optional().default("active"),
  studentVisible: z2.boolean().optional().default(true),
  sortOrder: z2.number().int().min(0).max(9999).optional().default(100)
});
var updateServiceSchema = createServiceSchema.partial();
var createCustomerSchema = z2.object({
  fullName: z2.string().trim().min(1, "Vui l\xF2ng nh\u1EADp t\xEAn kh\xE1ch h\xE0ng.").max(140),
  phoneZalo: z2.string().trim().max(80).optional().default(""),
  email: z2.string().trim().max(160).optional().default(""),
  otherContact: z2.string().trim().max(160).optional().default(""),
  note: z2.string().trim().max(1e3).optional().default(""),
  linkedUid: z2.string().trim().max(128).nullable().optional().default(null),
  idempotencyKey: z2.string().trim().max(120).optional()
});
var updateCustomerSchema = z2.object({
  fullName: z2.string().trim().min(1, "T\xEAn kh\xE1ch h\xE0ng kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng.").max(140).optional(),
  phoneZalo: z2.string().trim().max(80).optional(),
  email: z2.string().trim().max(160).optional(),
  otherContact: z2.string().trim().max(160).optional(),
  note: z2.string().trim().max(1e3).optional()
});
var createOrderSchema = z2.object({
  customerId: z2.string().trim().min(1, "Vui l\xF2ng ch\u1ECDn kh\xE1ch h\xE0ng."),
  serviceId: z2.string().trim().min(1, "Vui l\xF2ng ch\u1ECDn d\u1ECBch v\u1EE5."),
  accountSlot: z2.string().trim().max(240).optional().default(""),
  quantity: z2.number().int().min(1, "S\u1ED1 l\u01B0\u1EE3ng ph\u1EA3i t\u1ED1i thi\u1EC3u l\xE0 1.").max(999).default(1),
  startDate: isoDateSchema,
  stopDate: nullableIsoDateSchema.optional().default(null),
  billingType: z2.enum(["one_time", "monthly"]),
  firstCyclePriceVnd: intVndSchema,
  recurringPriceVnd: nullableIntVndSchema.optional().default(null),
  durationValue: z2.union([z2.number().int().min(1).max(3650), z2.null()]).optional().default(null),
  durationUnit: z2.union([z2.enum(["days", "months"]), z2.null()]).optional().default(null),
  note: z2.string().trim().max(1e3).optional().default(""),
  fulfillmentStatus: z2.enum(["pending_delivery", "delivered"]).optional(),
  idempotencyKey: z2.string().trim().max(120).optional()
});
var orderAttachmentSchema = z2.object({
  id: z2.string().trim().min(1).max(120),
  name: z2.string().trim().min(1).max(200),
  url: z2.string().trim().url("\u0110\u01B0\u1EDDng d\u1EABn t\u1EC7p \u0111\xEDnh k\xE8m kh\xF4ng h\u1EE3p l\u1EC7.").max(2048),
  mimeType: z2.string().trim().max(120).default("application/octet-stream"),
  size: z2.number().int().min(0).optional(),
  uploadedAt: z2.string().trim().max(60)
});
var updateOrderSchema = z2.object({
  serviceId: z2.string().trim().min(1).optional(),
  confirmServiceChange: z2.boolean().optional(),
  accountSlot: z2.string().trim().max(240).optional(),
  quantity: z2.number().int().min(1).max(999).optional(),
  startDate: isoDateSchema.optional(),
  stopDate: nullableIsoDateSchema.optional(),
  billingType: z2.enum(["one_time", "monthly"]).optional(),
  firstCyclePriceVnd: intVndSchema.optional(),
  recurringPriceVnd: nullableIntVndSchema.optional(),
  durationValue: z2.union([z2.number().int().min(1).max(3650), z2.null()]).optional(),
  durationUnit: z2.union([z2.enum(["days", "months"]), z2.null()]).optional(),
  note: z2.string().trim().max(1e3).optional(),
  contactPhoneZalo: z2.string().trim().max(80).optional(),
  targetUpgradeEmail: z2.string().trim().max(160).optional(),
  adminDeliveryNote: z2.string().trim().max(2e3).optional(),
  adminAttachments: z2.array(orderAttachmentSchema).max(10).optional(),
  fulfillmentStatus: z2.enum(["pending_delivery", "delivered"]).optional()
});
var createPaymentSchema = z2.object({
  orderId: z2.string().trim().min(1, "Vui l\xF2ng ch\u1ECDn \u0111\u01A1n h\xE0ng."),
  paidDate: isoDateSchema,
  amountVnd: positiveIntVndSchema,
  method: z2.enum(["bank_transfer", "cash", "momo", "zalopay", "dktest_wallet", "other"]),
  note: z2.string().trim().max(1e3).optional().default(""),
  idempotencyKey: z2.string().trim().max(120).optional()
});
var updatePaymentSchema = z2.object({
  paidDate: isoDateSchema.optional(),
  amountVnd: positiveIntVndSchema.optional(),
  method: z2.enum(["bank_transfer", "cash", "momo", "zalopay", "dktest_wallet", "other"]).optional(),
  note: z2.string().trim().max(1e3).optional()
});
var voidPaymentSchema = z2.object({
  reason: z2.string().trim().min(2, "Vui l\xF2ng nh\u1EADp l\xFD do h\u1EE7y giao d\u1ECBch.").max(500)
});
var studentPurchaseSchema = z2.object({
  serviceId: z2.string().trim().min(1, "Vui l\xF2ng ch\u1ECDn d\u1ECBch v\u1EE5."),
  quantity: z2.number().int().min(1).max(10).default(1),
  contactPhoneZalo: z2.string().trim().min(8, "Vui l\xF2ng nh\u1EADp s\u1ED1 \u0111i\u1EC7n tho\u1EA1i Zalo h\u1EE3p l\u1EC7 (t\u1ED1i thi\u1EC3u 8 k\xFD t\u1EF1).").max(80),
  targetUpgradeEmail: z2.string().trim().max(160).optional().default(""),
  contactEmail: z2.string().trim().max(160).optional().default(""),
  note: z2.string().trim().max(500).optional().default(""),
  idempotencyKey: z2.string().trim().min(6, "Thi\u1EBFu kh\xF3a ch\u1ED1ng g\u1EEDi tr\xF9ng.").max(120)
});
var studentRenewOrderSchema = z2.object({
  amountVnd: positiveIntVndSchema,
  note: z2.string().trim().max(400).optional().default(""),
  idempotencyKey: z2.string().trim().min(6, "Thi\u1EBFu kh\xF3a ch\u1ED1ng g\u1EEDi tr\xF9ng.").max(120)
});
var excelImportRowSchema = z2.object({
  customerCode: z2.string().trim().max(40).optional().default(""),
  fullName: z2.string().trim().min(1).max(140),
  phoneZalo: z2.string().trim().max(80).optional().default(""),
  email: z2.string().trim().max(160).optional().default(""),
  serviceName: z2.string().trim().min(1).max(140),
  matchedServiceId: z2.string().trim().nullable().optional().default(null),
  accountSlot: z2.string().trim().max(240).optional().default(""),
  quantity: z2.number().int().min(1).max(999).default(1),
  startDate: isoDateSchema,
  stopDate: nullableIsoDateSchema.optional().default(null),
  billingType: z2.enum(["one_time", "monthly"]),
  firstCyclePriceVnd: intVndSchema,
  recurringPriceVnd: nullableIntVndSchema.optional().default(null),
  paidAmountVnd: intVndSchema.optional().default(0),
  paidDate: isoDateSchema.optional(),
  note: z2.string().trim().max(1e3).optional().default(""),
  importRowKey: z2.string().trim().min(4).max(120)
});
var excelImportPayloadSchema = z2.object({
  rows: z2.array(excelImportRowSchema).min(1).max(500),
  idempotencyKey: z2.string().trim().max(120).optional()
});
async function listCollection(col) {
  if (adminDb) {
    const snap = await adminDb.collection(col).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const docs = await getFirestoreRestDocs(col, 1e3, false);
  return docs;
}
async function getDocById(col, id) {
  if (adminDb) {
    const snap = await adminDb.collection(col).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  const doc = await getFirestoreRestDoc(col, id, false);
  return doc ? { id, ...doc } : null;
}
async function saveDoc(col, id, data) {
  if (adminDb) {
    await adminDb.collection(col).doc(id).set(data, { merge: false });
  } else {
    await setFirestoreRestDoc(col, id, data);
  }
}
async function queryByField(col, field, value) {
  if (adminDb) {
    const snap = await adminDb.collection(col).where(field, "==", value).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const docs = await queryFirestoreRestDocs(col, field, value, 500, false);
  return docs;
}
function makeShortId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function nextCustomerCode(existing) {
  let maxNum = 0;
  for (const c of existing) {
    const m = /^KH(\d+)$/i.exec(c.customerCode || "");
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  }
  return `KH${String(maxNum + 1).padStart(4, "0")}`;
}
function makeOrderCode(todayVn, existingCount) {
  const compact = todayVn.replace(/-/g, "").slice(2);
  const seq = String(existingCount + 1).padStart(3, "0");
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `DH${compact}-${seq}${rand}`;
}
function makePaymentCode(todayVn, existingCount) {
  const compact = todayVn.replace(/-/g, "").slice(2);
  const seq = String(existingCount + 1).padStart(3, "0");
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `TT${compact}-${seq}${rand}`;
}
async function writeAuditLog(params) {
  const id = makeShortId("alog");
  const record = {
    id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    actorUid: params.actorUid,
    actorName: params.actorName || "Qu\u1EA3n tr\u1ECB vi\xEAn",
    summary: params.summary,
    before: params.before ?? null,
    after: params.after ?? null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDoc(COL_AUDIT_LOGS, id, record);
}
async function withIdempotency(key, scope, fn) {
  if (!key || !key.trim()) {
    return fn();
  }
  const safeKey = `${scope}_${key.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}`;
  const existingPromise = inFlightIdempotency.get(safeKey);
  if (existingPromise) {
    return existingPromise;
  }
  const stored = await getDocById(COL_IDEMPOTENCY, safeKey);
  if (stored && stored.result !== void 0) {
    return stored.result;
  }
  const runPromise = (async () => {
    try {
      const result = await fn();
      try {
        await saveDoc(COL_IDEMPOTENCY, safeKey, {
          key: safeKey,
          scope,
          result,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (err) {
        console.warn("[aiShopService] Failed to persist idempotency key:", err);
      }
      return result;
    } finally {
      inFlightIdempotency.delete(safeKey);
    }
  })();
  inFlightIdempotency.set(safeKey, runPromise);
  return runPromise;
}
async function ensureInitialServicesSeeded(actorUid = "system", actorName = "H\u1EC7 th\u1ED1ng") {
  const existing = await listCollection(COL_SERVICES);
  if (existing.length > 0) {
    return existing.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const seeds = buildSeedServiceRecords(now);
  await Promise.all(seeds.map((svc) => saveDoc(COL_SERVICES, svc.id, svc)));
  await writeAuditLog({
    action: "service_seed",
    entityType: "service",
    entityId: "seed_initial",
    actorUid,
    actorName,
    summary: `Kh\u1EDFi t\u1EA1o danh m\u1EE5c ban \u0111\u1EA7u (${seeds.length} d\u1ECBch v\u1EE5 AI).`
  });
  invalidateAiShopCache();
  return seeds;
}
async function getStudentAiCatalog() {
  let services = await listCollection(COL_SERVICES);
  if (services.length === 0) {
    services = await ensureInitialServicesSeeded();
  }
  return services.filter((s) => s.status === "active" && s.studentVisible).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}
async function getStudentAiOrdersAndWallet(uid, displayName) {
  const [wallet, linkedCustomers, orders, payments] = await Promise.all([
    getOrCreateWallet(uid, { fullName: displayName }),
    queryByField(COL_CUSTOMERS, "linkedUid", uid),
    queryByField(COL_ORDERS, "linkedUid", uid),
    queryByField(COL_PAYMENTS, "linkedUid", uid)
  ]);
  return {
    walletBalanceVnd: sanitizeVnd(wallet.balanceVnd),
    customer: linkedCustomers[0] ?? null,
    orders: orders.sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    payments: payments.sort((a, b) => b.paidDate.localeCompare(a.paidDate) || b.createdAt.localeCompare(a.createdAt))
  };
}
async function sendDiscordNewAiOrderAlert(params) {
  const webhookUrl = process.env.DISCORD_AI_SHOP_WEBHOOK_URL || process.env.DISCORD_REPORT_WEBHOOK_URL || "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";
  if (!webhookUrl) return;
  const baseUrl = (params.originBaseUrl || process.env.PUBLIC_APP_URL || "https://dk-test-v3.vercel.app").replace(/\/+$/, "");
  const adminOrderUrl = `${baseUrl}/admin/ai-shop?tab=orders&orderId=${encodeURIComponent(
    params.order.id
  )}`;
  const fields = [
    {
      name: "\u{1F464} Kh\xE1ch h\xE0ng",
      value: `**${params.customer.fullName}** (\`${params.customer.customerCode}\`)`,
      inline: true
    },
    {
      name: "\u{1F4F1} S\u0110T Zalo",
      value: `\`${params.order.contactPhoneZalo || params.customer.phoneZalo || "Ch\u01B0a cung c\u1EA5p"}\``,
      inline: true
    },
    {
      name: "\u{1F4E6} D\u1ECBch v\u1EE5 \u0111\u1EB7t mua",
      value: `**${params.order.serviceNameSnapshot}** \xD7 ${params.order.quantity}`,
      inline: false
    },
    {
      name: "\u{1F4B0} \u0110\xE3 thanh to\xE1n (V\xED DkTEST)",
      value: `**${params.totalCostVnd.toLocaleString("vi-VN")} \u0111**`,
      inline: true
    },
    {
      name: "\u{1F516} M\xE3 \u0111\u01A1n h\xE0ng",
      value: `\`${params.order.orderCode}\``,
      inline: true
    }
  ];
  if (params.order.targetUpgradeEmail) {
    fields.push({
      name: "\u{1F4E7} Email c\u1EA7n n\xE2ng c\u1EA5p (Mail c\u1EA7n up)",
      value: `\`${params.order.targetUpgradeEmail}\``,
      inline: false
    });
  }
  if (params.order.note) {
    fields.push({
      name: "\u{1F4DD} Ghi ch\xFA kh\xE1ch h\xE0ng",
      value: params.order.note.slice(0, 400),
      inline: false
    });
  }
  fields.push({
    name: "\u{1F517} X\u1EED l\xFD \u0111\u01A1n ngay",
    value: `[\u{1F449} B\u1EA5m v\xE0o \u0111\xE2y \u0111\u1EC3 m\u1EDF trang Admin x\u1EED l\xFD & giao \u0111\u01A1n](${adminOrderUrl})`,
    inline: false
  });
  const payload = {
    embeds: [
      {
        title: `\u{1F6D2} \u0110\u01A0N MUA ACC AI M\u1EDAI \u2014 ${params.order.orderCode}`,
        url: adminOrderUrl,
        color: 3447003,
        fields,
        footer: {
          text: "DkTEST AI Shop \u2022 Thanh to\xE1n t\u1EF1 \u0111\u1ED9ng qua V\xED DkTEST"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8e3)
    });
  } catch (err) {
    console.warn("[aiShopService] Failed to send Discord webhook notification:", err);
  }
}
async function studentPurchaseAiService(user, rawInput, originBaseUrl) {
  const data = studentPurchaseSchema.parse(rawInput);
  return withIdempotency(data.idempotencyKey, `stu_buy_${user.uid}`, async () => {
    const service = await getDocById(COL_SERVICES, data.serviceId);
    if (!service || service.status !== "active" || !service.studentVisible) {
      throw new Error("D\u1ECBch v\u1EE5 n\xE0y hi\u1EC7n kh\xF4ng c\xF2n m\u1EDF b\xE1n t\u1EF1 \u0111\u1ED9ng.");
    }
    if (service.defaultFirstPriceVnd === null || service.defaultFirstPriceVnd <= 0) {
      throw new Error("D\u1ECBch v\u1EE5 n\xE0y ch\u01B0a c\xF3 gi\xE1 c\u1ED1 \u0111\u1ECBnh, vui l\xF2ng li\xEAn h\u1EC7 Admin \u0111\u1EC3 \u0111\u1EB7t \u0111\u01A1n.");
    }
    if (service.billingType === "monthly" && (service.defaultRecurringPriceVnd === null || service.defaultRecurringPriceVnd < 0)) {
      throw new Error("D\u1ECBch v\u1EE5 h\xE0ng th\xE1ng ch\u01B0a c\u1EA5u h\xECnh gi\xE1 k\u1EF3 sau.");
    }
    const storeMeta = resolveServiceStorefrontMeta(service);
    const upgradeEmail = (data.targetUpgradeEmail || "").trim();
    if (storeMeta.requiresUpgradeEmail) {
      if (!upgradeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(upgradeEmail)) {
        throw new Error(
          `G\xF3i ${storeMeta.categoryLabel} b\u1EAFt bu\u1ED9c nh\u1EADp \u0111\u1ECBa ch\u1EC9 Email c\u1EA7n n\xE2ng c\u1EA5p h\u1EE3p l\u1EC7.`
        );
      }
    }
    const totalCostVnd = toIntVnd(service.defaultFirstPriceVnd) * data.quantity;
    if (totalCostVnd <= 0) {
      throw new Error("Gi\xE1 d\u1ECBch v\u1EE5 kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    const initialWallet = await getOrCreateWallet(user.uid, { fullName: user.displayName });
    const [existingLinkedCustomers, allCustomers, allOrders, allPayments] = await Promise.all([
      queryByField(COL_CUSTOMERS, "linkedUid", user.uid),
      listCollection(COL_CUSTOMERS),
      listCollection(COL_ORDERS),
      listCollection(COL_PAYMENTS)
    ]);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const todayVn = getTodayVnDate();
    let customer;
    let isNewCustomer = false;
    if (existingLinkedCustomers.length > 0) {
      customer = {
        ...existingLinkedCustomers[0],
        phoneZalo: data.contactPhoneZalo || existingLinkedCustomers[0].phoneZalo,
        email: upgradeEmail || data.contactEmail || existingLinkedCustomers[0].email || user.email || "",
        updatedAt: now
      };
    } else {
      isNewCustomer = true;
      customer = {
        id: makeShortId("cust"),
        customerCode: nextCustomerCode(allCustomers),
        fullName: initialWallet.fullName || user.displayName || user.email?.split("@")[0] || "H\u1ECDc sinh DkTEST",
        phoneZalo: data.contactPhoneZalo,
        email: upgradeEmail || data.contactEmail || user.email || "",
        otherContact: initialWallet.currentClass ? `L\u1EDBp ${initialWallet.currentClass}` : "",
        note: "Kh\xE1ch t\u1EF1 \u0111\u0103ng k\xFD qua C\u1EEDa h\xE0ng Acc AI DkTEST",
        linkedUid: user.uid,
        status: "active",
        createdAt: now,
        updatedAt: now,
        archivedAt: null
      };
    }
    const orderId = makeShortId("ord");
    const paymentId = makeShortId("pay");
    const walletTxId = makeShortId("wtx_ai");
    const order = {
      id: orderId,
      orderCode: makeOrderCode(todayVn, allOrders.length),
      customerId: customer.id,
      customerCodeSnapshot: customer.customerCode,
      linkedUid: user.uid,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      serviceConditionsSnapshot: service.conditions,
      accountSlot: upgradeEmail || "",
      quantity: data.quantity,
      startDate: todayVn,
      stopDate: null,
      billingType: service.billingType,
      firstCyclePriceVnd: toIntVnd(service.defaultFirstPriceVnd),
      recurringPriceVnd: service.billingType === "monthly" ? toIntVnd(service.defaultRecurringPriceVnd ?? service.defaultFirstPriceVnd) : null,
      durationValue: service.durationValue,
      durationUnit: service.durationUnit,
      note: data.note || "H\u1ECDc sinh mua t\u1EF1 \u0111\u1ED9ng qua V\xED DkTEST",
      contactPhoneZalo: data.contactPhoneZalo,
      targetUpgradeEmail: upgradeEmail || "",
      adminDeliveryNote: "",
      adminAttachments: [],
      deliveredAt: null,
      studentNotificationUnread: false,
      studentNotificationReadAt: null,
      source: "student_auto",
      fulfillmentStatus: "pending_delivery",
      importRowKey: null,
      idempotencyKey: data.idempotencyKey,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now
    };
    const payment = {
      id: paymentId,
      paymentCode: makePaymentCode(todayVn, allPayments.length),
      orderId: order.id,
      customerId: customer.id,
      linkedUid: user.uid,
      paidDate: todayVn,
      amountVnd: totalCostVnd,
      method: "dktest_wallet",
      note: `Thanh to\xE1n t\u1EF1 \u0111\u1ED9ng \u0111\u01A1n ${order.orderCode} qua V\xED DkTEST`,
      status: "active",
      voidReason: null,
      voidedAt: null,
      voidedByUid: null,
      walletTransactionId: walletTxId,
      idempotencyKey: data.idempotencyKey,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now
    };
    let newBalanceVnd = 0;
    if (adminDb) {
      await adminDb.runTransaction(async (tx) => {
        const walletRef = adminDb.collection("wallets").doc(user.uid);
        const walletSnap = await tx.get(walletRef);
        const currentWallet = walletSnap.exists ? walletSnap.data() : initialWallet;
        const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
        if (balanceBefore < totalCostVnd) {
          const err = new Error(
            `S\u1ED1 d\u01B0 V\xED DkTEST kh\xF4ng \u0111\u1EE7. C\u1EA7n ${totalCostVnd.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${balanceBefore.toLocaleString("vi-VN")}\u0111.`
          );
          err.statusCode = 400;
          err.code = "insufficient_balance";
          err.missingVnd = totalCostVnd - balanceBefore;
          throw err;
        }
        const balanceAfter = balanceBefore - totalCostVnd;
        newBalanceVnd = balanceAfter;
        tx.set(
          walletRef,
          {
            ...currentWallet,
            uid: user.uid,
            balanceVnd: balanceAfter,
            totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + totalCostVnd,
            updatedAt: now
          },
          { merge: true }
        );
        const walletTx = {
          id: walletTxId,
          uid: user.uid,
          type: "ai_service_purchase_debit",
          amountVnd: totalCostVnd,
          balanceBeforeVnd: balanceBefore,
          balanceAfterVnd: balanceAfter,
          studentNameSnapshot: currentWallet.fullName || customer.fullName,
          studentClassSnapshot: currentWallet.currentClass || "",
          idempotencyKey: data.idempotencyKey,
          actorUid: user.uid,
          actorName: customer.fullName,
          note: `Mua d\u1ECBch v\u1EE5 AI: ${service.name} x${data.quantity} (${order.orderCode})`,
          description: `Mua d\u1ECBch v\u1EE5 AI: ${service.name} x${data.quantity} (${order.orderCode})`,
          createdAt: now,
          metadata: {
            aiOrderId: order.id,
            aiOrderCode: order.orderCode,
            aiServiceId: service.id,
            aiPaymentId: payment.id
          }
        };
        tx.set(adminDb.collection("wallet_transactions").doc(walletTxId), walletTx);
        tx.set(adminDb.collection(COL_CUSTOMERS).doc(customer.id), customer, { merge: !isNewCustomer });
        tx.set(adminDb.collection(COL_ORDERS).doc(order.id), order);
        tx.set(adminDb.collection(COL_PAYMENTS).doc(payment.id), payment);
      });
    } else {
      const currentWallet = await getFirestoreRestDoc("wallets", user.uid, false) || initialWallet;
      const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
      if (balanceBefore < totalCostVnd) {
        const err = new Error(
          `S\u1ED1 d\u01B0 V\xED DkTEST kh\xF4ng \u0111\u1EE7. C\u1EA7n ${totalCostVnd.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${balanceBefore.toLocaleString("vi-VN")}\u0111.`
        );
        err.statusCode = 400;
        err.code = "insufficient_balance";
        err.missingVnd = totalCostVnd - balanceBefore;
        throw err;
      }
      newBalanceVnd = balanceBefore - totalCostVnd;
      await setFirestoreRestDoc("wallets", user.uid, {
        ...currentWallet,
        uid: user.uid,
        balanceVnd: newBalanceVnd,
        totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + totalCostVnd,
        updatedAt: now
      });
      const walletTx = {
        id: walletTxId,
        uid: user.uid,
        type: "ai_service_purchase_debit",
        amountVnd: totalCostVnd,
        balanceBeforeVnd: balanceBefore,
        balanceAfterVnd: newBalanceVnd,
        studentNameSnapshot: currentWallet.fullName || customer.fullName,
        studentClassSnapshot: currentWallet.currentClass || "",
        idempotencyKey: data.idempotencyKey,
        actorUid: user.uid,
        actorName: customer.fullName,
        note: `Mua d\u1ECBch v\u1EE5 AI: ${service.name} x${data.quantity} (${order.orderCode})`,
        description: `Mua d\u1ECBch v\u1EE5 AI: ${service.name} x${data.quantity} (${order.orderCode})`,
        createdAt: now,
        metadata: {
          aiOrderId: order.id,
          aiOrderCode: order.orderCode,
          aiServiceId: service.id,
          aiPaymentId: payment.id
        }
      };
      await Promise.all([
        setFirestoreRestDoc("wallet_transactions", walletTxId, walletTx),
        saveDoc(COL_CUSTOMERS, customer.id, customer),
        saveDoc(COL_ORDERS, order.id, order),
        saveDoc(COL_PAYMENTS, payment.id, payment)
      ]);
    }
    await writeAuditLog({
      action: "student_auto_purchase",
      entityType: "order",
      entityId: order.id,
      actorUid: user.uid,
      actorName: customer.fullName,
      summary: `H\u1ECDc sinh ${customer.fullName} t\u1EF1 mua ${service.name} x${data.quantity} (${totalCostVnd}\u0111 qua V\xED DkTEST, \u0111\u01A1n ${order.orderCode}).`,
      after: { orderCode: order.orderCode, totalCostVnd, walletTxId }
    });
    invalidateAiShopCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(user.uid);
    invalidateGlobalSpendingCache();
    await sendDiscordNewAiOrderAlert({
      order,
      customer,
      totalCostVnd,
      originBaseUrl
    });
    return {
      order,
      payment,
      customer,
      newBalanceVnd,
      walletTransactionId: walletTxId
    };
  });
}
async function acknowledgeStudentOrderNotification(uid, orderId) {
  const existing = await getDocById(COL_ORDERS, orderId);
  if (!existing || existing.linkedUid !== uid) {
    const err = new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng thu\u1ED9c t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.");
    err.statusCode = 404;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    studentNotificationUnread: false,
    studentNotificationReadAt: now,
    updatedAt: now
  };
  await saveDoc(COL_ORDERS, orderId, updated);
  invalidateAiShopCache();
  return updated;
}
async function studentCancelSlotRenewal(user, orderId, reason) {
  const existing = await getDocById(COL_ORDERS, orderId);
  if (!existing || existing.linkedUid !== user.uid) {
    const err = new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng thu\u1ED9c t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.");
    err.statusCode = 404;
    throw err;
  }
  if (existing.billingType !== "monthly") {
    throw new Error("Ch\u1EC9 c\xE1c g\xF3i slot gia h\u1EA1n h\xE0ng th\xE1ng m\u1EDBi h\u1ED7 tr\u1EE3 h\u1EE7y gia h\u1EA1n.");
  }
  const todayVn = getTodayVnDate();
  const orderPayments = await queryByField(COL_PAYMENTS, "orderId", orderId);
  const summary = computeOrderFinancialSummary(existing, orderPayments, todayVn);
  let effectiveStopDate;
  const coveredPeriods = summary.periods.filter((p) => p.allocatedVnd > 0 || p.isDue);
  if (coveredPeriods.length > 0) {
    const lastCovered = coveredPeriods[coveredPeriods.length - 1];
    effectiveStopDate = lastCovered.coverageEndDate || addMonthsAnchored(existing.startDate, lastCovered.periodNumber);
  } else {
    effectiveStopDate = existing.startDate;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanReason = String(reason || "").trim().slice(0, 400);
  const updated = {
    ...existing,
    stopDate: effectiveStopDate,
    autoRenewCancelled: true,
    autoRenewCancelledAt: now,
    autoRenewCancelReason: cleanReason,
    updatedAt: now
  };
  await saveDoc(COL_ORDERS, orderId, updated);
  await writeAuditLog({
    action: "order_stop",
    entityType: "order",
    entityId: orderId,
    actorUid: user.uid,
    actorName: user.displayName || "H\u1ECDc sinh",
    summary: `H\u1ECDc sinh h\u1EE7y gia h\u1EA1n g\xF3i slot ${existing.orderCode} (${existing.serviceNameSnapshot}) \u2014 d\u1EEBng t\u1EEB ${effectiveStopDate}.${cleanReason ? ` L\xFD do: ${cleanReason}` : ""}`,
    before: { stopDate: existing.stopDate, autoRenewCancelled: existing.autoRenewCancelled },
    after: { stopDate: effectiveStopDate, autoRenewCancelled: true }
  });
  invalidateAiShopCache();
  return updated;
}
async function studentResumeSlotRenewal(user, orderId) {
  const existing = await getDocById(COL_ORDERS, orderId);
  if (!existing || existing.linkedUid !== user.uid) {
    const err = new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng thu\u1ED9c t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.");
    err.statusCode = 404;
    throw err;
  }
  if (existing.billingType !== "monthly") {
    throw new Error("\u0110\u01A1n h\xE0ng n\xE0y kh\xF4ng ph\u1EA3i g\xF3i gia h\u1EA1n h\xE0ng th\xE1ng.");
  }
  const todayVn = getTodayVnDate();
  if (existing.stopDate && existing.stopDate <= todayVn) {
    throw new Error("G\xF3i n\xE0y \u0111\xE3 h\u1EBFt h\u1EA1n d\u1EEBng. Vui l\xF2ng \u0111\u1EB7t mua g\xF3i m\u1EDBi ho\u1EB7c li\xEAn h\u1EC7 Admin.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    stopDate: null,
    autoRenewCancelled: false,
    autoRenewCancelledAt: null,
    autoRenewCancelReason: "",
    updatedAt: now
  };
  await saveDoc(COL_ORDERS, orderId, updated);
  await writeAuditLog({
    action: "order_stop",
    entityType: "order",
    entityId: orderId,
    actorUid: user.uid,
    actorName: user.displayName || "H\u1ECDc sinh",
    summary: `H\u1ECDc sinh b\u1EADt l\u1EA1i gia h\u1EA1n g\xF3i slot ${existing.orderCode} (${existing.serviceNameSnapshot}).`,
    before: { stopDate: existing.stopDate, autoRenewCancelled: existing.autoRenewCancelled },
    after: { stopDate: null, autoRenewCancelled: false }
  });
  invalidateAiShopCache();
  return updated;
}
async function studentPayOrderWithWallet(user, orderId, rawInput) {
  const data = studentRenewOrderSchema.parse(rawInput);
  return withIdempotency(data.idempotencyKey, `stu_pay_${user.uid}_${orderId}`, async () => {
    const order = await getDocById(COL_ORDERS, orderId);
    if (!order || order.linkedUid !== user.uid) {
      const err = new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng thu\u1ED9c t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n.");
      err.statusCode = 404;
      throw err;
    }
    const orderPayments = await queryByField(COL_PAYMENTS, "orderId", orderId);
    const summary = computeOrderFinancialSummary(order, orderPayments, getTodayVnDate());
    if (summary.isStopped && summary.debtUpToAsOfDateVnd === 0) {
      throw new Error("\u0110\u01A1n h\xE0ng n\xE0y \u0111\xE3 d\u1EEBng v\xE0 kh\xF4ng c\xF2n c\xF4ng n\u1EE3 c\u1EA7n thanh to\xE1n.");
    }
    const allPayments = await listCollection(COL_PAYMENTS);
    const initialWallet = await getOrCreateWallet(user.uid, { fullName: user.displayName });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const todayVn = getTodayVnDate();
    const paymentId = makeShortId("pay");
    const walletTxId = makeShortId("wtx_airen");
    const payment = {
      id: paymentId,
      paymentCode: makePaymentCode(todayVn, allPayments.length),
      orderId: order.id,
      customerId: order.customerId,
      linkedUid: user.uid,
      paidDate: todayVn,
      amountVnd: data.amountVnd,
      method: "dktest_wallet",
      note: data.note || `H\u1ECDc sinh thanh to\xE1n / gia h\u1EA1n \u0111\u01A1n ${order.orderCode} qua V\xED DkTEST`,
      status: "active",
      voidReason: null,
      voidedAt: null,
      voidedByUid: null,
      walletTransactionId: walletTxId,
      idempotencyKey: data.idempotencyKey,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now
    };
    let newBalanceVnd = 0;
    if (adminDb) {
      await adminDb.runTransaction(async (tx) => {
        const walletRef = adminDb.collection("wallets").doc(user.uid);
        const walletSnap = await tx.get(walletRef);
        const currentWallet = walletSnap.exists ? walletSnap.data() : initialWallet;
        const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
        if (balanceBefore < data.amountVnd) {
          const err = new Error(
            `S\u1ED1 d\u01B0 V\xED DkTEST kh\xF4ng \u0111\u1EE7. C\u1EA7n ${data.amountVnd.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${balanceBefore.toLocaleString("vi-VN")}\u0111.`
          );
          err.statusCode = 400;
          err.code = "insufficient_balance";
          err.missingVnd = data.amountVnd - balanceBefore;
          throw err;
        }
        const balanceAfter = balanceBefore - data.amountVnd;
        newBalanceVnd = balanceAfter;
        tx.set(
          walletRef,
          {
            ...currentWallet,
            uid: user.uid,
            balanceVnd: balanceAfter,
            totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + data.amountVnd,
            updatedAt: now
          },
          { merge: true }
        );
        const walletTx = {
          id: walletTxId,
          uid: user.uid,
          type: "ai_service_purchase_debit",
          amountVnd: data.amountVnd,
          balanceBeforeVnd: balanceBefore,
          balanceAfterVnd: balanceAfter,
          studentNameSnapshot: currentWallet.fullName || user.displayName || "",
          studentClassSnapshot: currentWallet.currentClass || "",
          idempotencyKey: data.idempotencyKey,
          actorUid: user.uid,
          actorName: currentWallet.fullName || user.displayName || "",
          note: `Gia h\u1EA1n / thanh to\xE1n d\u1ECBch v\u1EE5 AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
          description: `Gia h\u1EA1n / thanh to\xE1n d\u1ECBch v\u1EE5 AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
          createdAt: now,
          metadata: {
            aiOrderId: order.id,
            aiOrderCode: order.orderCode,
            aiPaymentId: payment.id
          }
        };
        tx.set(adminDb.collection("wallet_transactions").doc(walletTxId), walletTx);
        tx.set(adminDb.collection(COL_PAYMENTS).doc(payment.id), payment);
      });
    } else {
      const currentWallet = await getFirestoreRestDoc("wallets", user.uid, false) || initialWallet;
      const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
      if (balanceBefore < data.amountVnd) {
        const err = new Error(
          `S\u1ED1 d\u01B0 V\xED DkTEST kh\xF4ng \u0111\u1EE7. C\u1EA7n ${data.amountVnd.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${balanceBefore.toLocaleString("vi-VN")}\u0111.`
        );
        err.statusCode = 400;
        err.code = "insufficient_balance";
        err.missingVnd = data.amountVnd - balanceBefore;
        throw err;
      }
      newBalanceVnd = balanceBefore - data.amountVnd;
      await setFirestoreRestDoc("wallets", user.uid, {
        ...currentWallet,
        uid: user.uid,
        balanceVnd: newBalanceVnd,
        totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + data.amountVnd,
        updatedAt: now
      });
      const walletTx = {
        id: walletTxId,
        uid: user.uid,
        type: "ai_service_purchase_debit",
        amountVnd: data.amountVnd,
        balanceBeforeVnd: balanceBefore,
        balanceAfterVnd: newBalanceVnd,
        studentNameSnapshot: currentWallet.fullName || user.displayName || "",
        studentClassSnapshot: currentWallet.currentClass || "",
        idempotencyKey: data.idempotencyKey,
        actorUid: user.uid,
        actorName: currentWallet.fullName || user.displayName || "",
        note: `Gia h\u1EA1n / thanh to\xE1n d\u1ECBch v\u1EE5 AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
        description: `Gia h\u1EA1n / thanh to\xE1n d\u1ECBch v\u1EE5 AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
        createdAt: now,
        metadata: {
          aiOrderId: order.id,
          aiOrderCode: order.orderCode,
          aiPaymentId: payment.id
        }
      };
      await Promise.all([
        setFirestoreRestDoc("wallet_transactions", walletTxId, walletTx),
        saveDoc(COL_PAYMENTS, payment.id, payment)
      ]);
    }
    await writeAuditLog({
      action: "student_auto_renew",
      entityType: "payment",
      entityId: payment.id,
      actorUid: user.uid,
      actorName: user.displayName || "H\u1ECDc sinh",
      summary: `H\u1ECDc sinh thanh to\xE1n/gia h\u1EA1n \u0111\u01A1n ${order.orderCode} s\u1ED1 ti\u1EC1n ${data.amountVnd}\u0111 qua V\xED DkTEST.`,
      after: { orderCode: order.orderCode, amountVnd: data.amountVnd, walletTxId }
    });
    invalidateAiShopCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(user.uid);
    invalidateGlobalSpendingCache();
    return { payment, newBalanceVnd, walletTransactionId: walletTxId };
  });
}

// server/routes/aiShopStudentRoutes.ts
var aiShopStudentRouter = Router();
function formatError(err) {
  if (err instanceof ZodError) {
    return {
      status: 400,
      error: "validation_error",
      message: err.issues[0]?.message || "D\u1EEF li\u1EC7u \u0111\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "ai_shop_error",
    message: err?.message || "\u0110\xE3 c\xF3 l\u1ED7i x\u1EA3y ra.",
    missingVnd: typeof err?.missingVnd === "number" ? err.missingVnd : void 0
  };
}
function resolveRequestOrigin(req) {
  const originHeader = req.headers.origin;
  if (typeof originHeader === "string" && /^https?:\/\//i.test(originHeader)) {
    return originHeader;
  }
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (host) return `${proto}://${host}`;
  return process.env.PUBLIC_APP_URL || "https://dk-test-v3.vercel.app";
}
aiShopStudentRouter.get("/catalog", requireAuth, async (_req, res) => {
  try {
    const services = await getStudentAiCatalog();
    return res.json({ success: true, services });
  } catch (err) {
    const e = formatError(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});
aiShopStudentRouter.get("/my-orders", requireAuth, async (req, res) => {
  try {
    const data = await getStudentAiOrdersAndWallet(req.user.uid, req.user.displayName);
    return res.json({ success: true, ...data });
  } catch (err) {
    const e = formatError(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});
aiShopStudentRouter.post("/purchase", requireAuth, async (req, res) => {
  try {
    const result = await studentPurchaseAiService(
      {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName
      },
      req.body,
      resolveRequestOrigin(req)
    );
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({
      error: e.error,
      message: e.message,
      ...e.missingVnd !== void 0 ? { missingVnd: e.missingVnd } : {}
    });
  }
});
aiShopStudentRouter.post(
  "/orders/:orderId/ack-notification",
  requireAuth,
  async (req, res) => {
    try {
      const order = await acknowledgeStudentOrderNotification(req.user.uid, req.params.orderId);
      return res.json({ success: true, order });
    } catch (err) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
aiShopStudentRouter.post(
  "/orders/:orderId/cancel-renewal",
  requireAuth,
  async (req, res) => {
    try {
      const order = await studentCancelSlotRenewal(
        { uid: req.user.uid, displayName: req.user.displayName },
        req.params.orderId,
        req.body?.reason
      );
      return res.json({ success: true, order });
    } catch (err) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
aiShopStudentRouter.post(
  "/orders/:orderId/resume-renewal",
  requireAuth,
  async (req, res) => {
    try {
      const order = await studentResumeSlotRenewal(
        { uid: req.user.uid, displayName: req.user.displayName },
        req.params.orderId
      );
      return res.json({ success: true, order });
    } catch (err) {
      const e = formatError(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
aiShopStudentRouter.post(
  "/orders/:orderId/pay-wallet",
  requireAuth,
  async (req, res) => {
    try {
      const result = await studentPayOrderWithWallet(
        {
          uid: req.user.uid,
          displayName: req.user.displayName
        },
        req.params.orderId,
        req.body
      );
      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      const e = formatError(err);
      return res.status(e.status).json({
        error: e.error,
        message: e.message,
        ...e.missingVnd !== void 0 ? { missingVnd: e.missingVnd } : {}
      });
    }
  }
);

// server/routes/minigameStudentRoutes.ts
import { Router as Router2 } from "express";
import { ZodError as ZodError2 } from "zod";

// server/services/minigameService.ts
import crypto2 from "node:crypto";
import { z as z3 } from "zod";

// src/services/minigame/raceEngine.ts
var RACER_PALETTE = [
  "#ef4444",
  // Red
  "#2563eb",
  // Blue
  "#f59e0b",
  // Amber
  "#10b981",
  // Emerald
  "#8b5cf6",
  // Violet
  "#ec4899",
  // Pink
  "#06b6d4",
  // Cyan
  "#f97316",
  // Orange
  "#84cc16",
  // Lime
  "#6366f1",
  // Indigo
  "#14b8a6",
  // Teal
  "#e11d48"
  // Rose
];

// src/services/minigame/gameLogic.ts
var BAU_CUA_FACES = [
  { id: "bau", label: "B\u1EA7u", emoji: "\u{1F350}", color: "from-emerald-500 to-green-600" },
  { id: "cua", label: "Cua", emoji: "\u{1F980}", color: "from-rose-500 to-red-600" },
  { id: "tom", label: "T\xF4m", emoji: "\u{1F990}", color: "from-orange-500 to-amber-600" },
  { id: "ca", label: "C\xE1", emoji: "\u{1F41F}", color: "from-sky-500 to-blue-600" },
  { id: "ga", label: "G\xE0", emoji: "\u{1F413}", color: "from-yellow-500 to-amber-500" },
  { id: "nai", label: "Nai", emoji: "\u{1F98C}", color: "from-violet-500 to-purple-600" }
];
var LUCKY_WHEEL_SECTORS = [
  { id: "kim_cuong", label: "Kim C\u01B0\u01A1ng", emoji: "\u{1F48E}", color: "from-cyan-500 to-blue-600", hex: "#0ea5e9" },
  { id: "vuong_mien", label: "V\u01B0\u01A1ng Mi\u1EC7n", emoji: "\u{1F451}", color: "from-amber-400 to-yellow-500", hex: "#f59e0b" },
  { id: "ngoi_sao", label: "Ng\xF4i Sao", emoji: "\u2B50", color: "from-violet-500 to-purple-600", hex: "#8b5cf6" },
  { id: "ten_lua", label: "T\xEAn L\u1EEDa", emoji: "\u{1F680}", color: "from-rose-500 to-pink-600", hex: "#f43f5e" },
  { id: "sam_set", label: "S\u1EA5m S\xE9t", emoji: "\u26A1", color: "from-orange-500 to-amber-600", hex: "#f97316" },
  { id: "co_bon_la", label: "C\u1ECF 4 L\xE1", emoji: "\u{1F340}", color: "from-emerald-500 to-green-600", hex: "#10b981" },
  { id: "phuc_loc", label: "Ph\xFAc L\u1ED9c", emoji: "\u{1F9E7}", color: "from-red-500 to-rose-600", hex: "#ef4444" },
  { id: "sieu_cup", label: "Si\xEAu C\xFAp", emoji: "\u{1F3C6}", color: "from-indigo-500 to-blue-600", hex: "#6366f1" }
];
var MYSTERY_BOXES = [
  { id: "1", boxNumber: 1, label: "H\u1ED9p Ruby", emoji: "\u{1F381}", gradient: "from-rose-500 to-red-600" },
  { id: "2", boxNumber: 2, label: "H\u1ED9p Ho\xE0ng Kim", emoji: "\u2728", gradient: "from-amber-400 to-orange-500" },
  { id: "3", boxNumber: 3, label: "H\u1ED9p Ng\u1ECDc L\u1EE5c", emoji: "\u{1F49A}", gradient: "from-emerald-500 to-teal-600" },
  { id: "4", boxNumber: 4, label: "H\u1ED9p \u0110\u1EA1i D\u01B0\u01A1ng", emoji: "\u{1F30A}", gradient: "from-sky-500 to-blue-600" },
  { id: "5", boxNumber: 5, label: "H\u1ED9p Pha L\xEA", emoji: "\u{1F52E}", gradient: "from-violet-500 to-purple-600" },
  { id: "6", boxNumber: 6, label: "H\u1ED9p Kim C\u01B0\u01A1ng", emoji: "\u{1F496}", gradient: "from-fuchsia-500 to-pink-600" }
];
var TREASURE_CHEST_COUNT = 9;

// server/services/minigameService.ts
var COL_MINIGAMES = "minigame_events";
var liveCheersByEvent = /* @__PURE__ */ new Map();
function addLiveMinigameCheer(eventId, cheer) {
  const msg = {
    id: makeId("ch"),
    uid: cheer.uid,
    displayName: (cheer.displayName || "Ng\u01B0\u1EDDi xem").slice(0, 60),
    emoji: (cheer.emoji || "\u{1F525}").slice(0, 8),
    text: (cheer.text || "").slice(0, 80),
    createdAt: Date.now()
  };
  const existing = liveCheersByEvent.get(eventId) || [];
  const next = [msg, ...existing.filter((m) => Date.now() - m.createdAt < 6e4)].slice(0, 24);
  liveCheersByEvent.set(eventId, next);
  return msg;
}
function listLiveMinigameCheers(eventId) {
  const existing = liveCheersByEvent.get(eventId) || [];
  const fresh = existing.filter((m) => Date.now() - m.createdAt < 6e4);
  liveCheersByEvent.set(eventId, fresh);
  return fresh.slice(0, 12);
}
var liveChatByEvent = /* @__PURE__ */ new Map();
var LIVE_CHAT_TTL_MS = 6 * 60 * 60 * 1e3;
var LIVE_CHAT_MAX_ITEMS = 80;
function addLiveMinigameChat(eventId, payload) {
  const cleanText = String(payload.message || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 280);
  if (!cleanText) {
    throw new Error("Vui l\xF2ng nh\u1EADp n\u1ED9i dung tin nh\u1EAFn.");
  }
  const msg = {
    id: makeId("chat"),
    uid: payload.uid,
    displayName: (payload.displayName || "H\u1ECDc sinh").slice(0, 60),
    avatarUrl: payload.avatarUrl ? String(payload.avatarUrl).slice(0, 512) : void 0,
    isAdmin: Boolean(payload.isAdmin),
    message: cleanText,
    createdAt: Date.now()
  };
  const now = Date.now();
  const existing = liveChatByEvent.get(eventId) || [];
  const next = [...existing.filter((m) => now - m.createdAt < LIVE_CHAT_TTL_MS), msg].slice(
    -LIVE_CHAT_MAX_ITEMS
  );
  liveChatByEvent.set(eventId, next);
  return msg;
}
function listLiveMinigameChat(eventId) {
  const now = Date.now();
  const existing = liveChatByEvent.get(eventId) || [];
  const fresh = existing.filter((m) => now - m.createdAt < LIVE_CHAT_TTL_MS);
  liveChatByEvent.set(eventId, fresh);
  return fresh.slice(-60);
}
var prizeSchema = z3.object({
  rank: z3.number().int().min(0).max(50),
  label: z3.string().trim().min(1).max(120),
  type: z3.enum(["wallet_vnd", "voucher", "custom_gift"]),
  amountVnd: z3.number().int().min(0).max(1e9).optional(),
  voucherCode: z3.string().trim().max(80).optional(),
  customTitle: z3.string().trim().max(200).optional()
});
var createMinigameSchema = z3.object({
  title: z3.string().trim().min(2, "Vui l\xF2ng nh\u1EADp t\xEAn s\u1EF1 ki\u1EC7n minigame.").max(160),
  description: z3.string().trim().max(1e3).optional().default(""),
  gameType: z3.enum([
    "horse_race",
    "bee_race",
    "tai_xiu",
    "bau_cua",
    "lucky_number",
    "lucky_wheel",
    "treasure_flip",
    "mystery_box"
  ]),
  maxParticipants: z3.number().int().min(2).max(200).default(8),
  racersPerHeat: z3.number().int().min(2).max(8).optional().default(4),
  scheduledStartAt: z3.string().trim().nullable().optional(),
  scheduledEndAt: z3.string().trim().nullable().optional(),
  durationMinutes: z3.number().int().min(1).max(10080).nullable().optional(),
  raceDurationMs: z3.number().int().min(6e3).max(3e4).optional(),
  revealDurationMs: z3.number().int().min(2e3).max(1e4).optional(),
  chatEnabled: z3.boolean().optional().default(true),
  prizes: z3.array(prizeSchema).min(1, "Vui l\xF2ng c\u1EA5u h\xECnh \xEDt nh\u1EA5t 1 gi\u1EA3i th\u01B0\u1EDFng ph\xFAc l\u1EE3i.").max(32, "T\u1ED1i \u0111a 32 gi\u1EA3i th\u01B0\u1EDFng trong m\u1ED9t s\u1EF1 ki\u1EC7n.")
});
var updateMinigameScheduleSchema = z3.object({
  scheduledStartAt: z3.string().trim().nullable().optional(),
  scheduledEndAt: z3.string().trim().nullable().optional(),
  durationMinutes: z3.number().int().min(1).max(10080).nullable().optional(),
  raceDurationMs: z3.number().int().min(6e3).max(3e4).optional(),
  revealDurationMs: z3.number().int().min(2e3).max(1e4).optional(),
  chatEnabled: z3.boolean().optional()
});
var joinMinigameSchema = z3.object({
  prediction: z3.string().trim().max(32).optional(),
  avatarUrl: z3.string().trim().max(1024).optional()
});
async function listEventsRaw() {
  if (adminDb) {
    const snap = await adminDb.collection(COL_MINIGAMES).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const docs = await getFirestoreRestDocs(COL_MINIGAMES, 200, false);
  return docs;
}
async function getEventRaw(id) {
  if (adminDb) {
    const snap = await adminDb.collection(COL_MINIGAMES).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  const doc = await getFirestoreRestDoc(COL_MINIGAMES, id, false);
  return doc ? { id, ...doc } : null;
}
async function saveEventRaw(event) {
  if (adminDb) {
    await adminDb.collection(COL_MINIGAMES).doc(event.id).set(event, { merge: false });
  } else {
    await setFirestoreRestDoc(COL_MINIGAMES, event.id, event);
  }
}
function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto2.randomBytes(3).toString("hex")}`;
}
function isRaceGame(type) {
  return type === "horse_race" || type === "bee_race";
}
function validatePredictionForGame(gameType, prediction) {
  if (isRaceGame(gameType)) return void 0;
  const clean = (prediction || "").trim().toLowerCase();
  if (gameType === "tai_xiu") {
    if (clean !== "tai" && clean !== "xiu") {
      throw new Error("Vui l\xF2ng ch\u1ECDn d\u1EF1 \u0111o\xE1n mi\u1EC5n ph\xED: T\xE0i ho\u1EB7c X\u1EC9u.");
    }
    return clean;
  }
  if (gameType === "bau_cua") {
    const valid = BAU_CUA_FACES.map((f) => f.id);
    if (!valid.includes(clean)) {
      throw new Error("Vui l\xF2ng ch\u1ECDn 1 linh v\u1EADt B\u1EA7u Cua h\u1EE3p l\u1EC7.");
    }
    return clean;
  }
  if (gameType === "lucky_number") {
    if (!/^\d{1,2}$/.test(clean)) {
      throw new Error("Vui l\xF2ng ch\u1ECDn s\u1ED1 may m\u1EAFn t\u1EEB 00 \u0111\u1EBFn 99.");
    }
    const num = Number(clean);
    if (num < 0 || num > 99) {
      throw new Error("S\u1ED1 may m\u1EAFn ph\u1EA3i n\u1EB1m trong kho\u1EA3ng 00 \u0111\u1EBFn 99.");
    }
    return String(num).padStart(2, "0");
  }
  if (gameType === "lucky_wheel") {
    const validIds = LUCKY_WHEEL_SECTORS.map((s) => s.id);
    if (!validIds.includes(clean)) {
      throw new Error("Vui l\xF2ng ch\u1ECDn 1 bi\u1EC3u t\u01B0\u1EE3ng h\u1EE3p l\u1EC7 tr\xEAn V\xF2ng Quay Si\xEAu T\u1ED1c.");
    }
    return clean;
  }
  if (gameType === "treasure_flip") {
    const idx = Number(clean);
    if (!Number.isInteger(idx) || idx < 1 || idx > TREASURE_CHEST_COUNT) {
      throw new Error(`Vui l\xF2ng ch\u1ECDn 1 r\u01B0\u01A1ng kho b\xE1u t\u1EEB #1 \u0111\u1EBFn #${TREASURE_CHEST_COUNT}.`);
    }
    return String(idx);
  }
  if (gameType === "mystery_box") {
    const box = Number(clean);
    if (!Number.isInteger(box) || box < 1 || box > MYSTERY_BOXES.length) {
      throw new Error(`Vui l\xF2ng ch\u1ECDn 1 h\u1ED9p qu\xE0 b\xED \u1EA9n t\u1EEB #1 \u0111\u1EBFn #${MYSTERY_BOXES.length}.`);
    }
    return String(box);
  }
  return void 0;
}
async function listMinigameEvents() {
  const all = await listEventsRaw();
  return all.sort((a, b) => {
    const priority = (s) => s === "running" ? 0 : s === "lobby" ? 1 : s === "finished" ? 2 : 3;
    const diff = priority(a.status) - priority(b.status);
    if (diff !== 0) return diff;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}
async function getMinigameEvent(idOrCode) {
  const clean = idOrCode.trim();
  const direct = await getEventRaw(clean);
  if (direct) return direct;
  const all = await listEventsRaw();
  const byCode = all.find((e) => e.eventCode.toUpperCase() === clean.toUpperCase());
  if (!byCode) {
    const err = new Error("Kh\xF4ng t\xECm th\u1EA5y s\u1EF1 ki\u1EC7n Minigame n\xE0y.");
    err.statusCode = 404;
    throw err;
  }
  return byCode;
}
async function joinOrUpdateMinigameParticipant(eventId, user, rawInput) {
  const data = joinMinigameSchema.parse(rawInput || {});
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("S\u1EF1 ki\u1EC7n \u0111\xE3 b\u1EAFt \u0111\u1EA7u ho\u1EB7c k\u1EBFt th\xFAc, kh\xF4ng th\u1EC3 \u0111\u0103ng k\xFD th\xEAm.");
  }
  const participants = { ...event.participants || {} };
  const existing = participants[user.uid];
  if (!existing && event.scheduledEndAt) {
    const endMs = Date.parse(event.scheduledEndAt);
    if (Number.isFinite(endMs) && Date.now() >= endMs) {
      throw new Error("\u0110\xE3 h\u1EBFt th\u1EDDi gian \u0111\u0103ng k\xFD tham gia s\u1EF1 ki\u1EC7n Minigame n\xE0y.");
    }
  }
  const prediction = validatePredictionForGame(event.gameType, data.prediction);
  if (!existing) {
    const currentCount = Object.keys(participants).length;
    if (currentCount >= event.maxParticipants) {
      throw new Error(
        `S\u1EF1 ki\u1EC7n \u0111\xE3 \u0111\u1EE7 t\u1ED1i \u0111a ${event.maxParticipants} ng\u01B0\u1EDDi tham gia. H\u1EB9n b\u1EA1n \u1EDF s\u1EF1 ki\u1EC7n ti\u1EBFp theo nh\xE9!`
      );
    }
    const racerNumber = currentCount + 1;
    const racerColor = RACER_PALETTE[currentCount % RACER_PALETTE.length];
    const participant = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || `H\u1ECDc sinh #${racerNumber}`,
      email: user.email || "",
      avatarUrl: data.avatarUrl || "",
      joinedAt: Date.now(),
      ...prediction !== void 0 ? { prediction } : {},
      racerColor,
      racerNumber
    };
    participants[user.uid] = participant;
  } else {
    participants[user.uid] = {
      ...existing,
      displayName: user.displayName || existing.displayName,
      ...prediction !== void 0 ? { prediction } : {}
    };
  }
  const updated = {
    ...event,
    entryFeeVnd: 0,
    participants,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function leaveMinigameEvent(eventId, uid) {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Ch\u1EC9 c\xF3 th\u1EC3 r\u1EDDi ph\xF2ng khi s\u1EF1 ki\u1EC7n \u0111ang m\u1EDF \u0111\u0103ng k\xFD.");
  }
  const participants = { ...event.participants || {} };
  delete participants[uid];
  const updated = {
    ...event,
    participants,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}

// server/routes/minigameStudentRoutes.ts
var minigameStudentRouter = Router2();
function formatError2(err) {
  if (err instanceof ZodError2) {
    return {
      status: 400,
      error: "validation_error",
      message: err.issues[0]?.message || "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "minigame_error",
    message: err?.message || "\u0110\xE3 c\xF3 l\u1ED7i x\u1EA3y ra."
  };
}
minigameStudentRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const events = await listMinigameEvents();
    return res.json({ success: true, events });
  } catch (err) {
    const e = formatError2(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});
minigameStudentRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const event = await getMinigameEvent(req.params.id);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameStudentRouter.post(
  "/:id/join",
  requireAuth,
  async (req, res) => {
    try {
      const event = await joinOrUpdateMinigameParticipant(
        req.params.id,
        {
          uid: req.user.uid,
          email: req.user.email,
          displayName: req.user.displayName
        },
        req.body
      );
      return res.json({ success: true, event });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
minigameStudentRouter.post(
  "/:id/leave",
  requireAuth,
  async (req, res) => {
    try {
      const event = await leaveMinigameEvent(req.params.id, req.user.uid);
      return res.json({ success: true, event });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
minigameStudentRouter.get(
  "/:id/cheers",
  requireAuth,
  async (req, res) => {
    try {
      const cheers = listLiveMinigameCheers(req.params.id);
      return res.json({ success: true, cheers });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
minigameStudentRouter.post(
  "/:id/cheer",
  requireAuth,
  async (req, res) => {
    try {
      const emoji = typeof req.body?.emoji === "string" ? req.body.emoji : "\u{1F525}";
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const cheer = addLiveMinigameCheer(req.params.id, {
        uid: req.user.uid,
        displayName: req.user.displayName || req.user.email?.split("@")[0] || "Ng\u01B0\u1EDDi xem",
        emoji,
        text
      });
      return res.json({ success: true, cheer, cheers: listLiveMinigameCheers(req.params.id) });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
minigameStudentRouter.get(
  "/:id/chat",
  requireAuth,
  async (req, res) => {
    try {
      const messages = listLiveMinigameChat(req.params.id);
      return res.json({ success: true, messages });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
minigameStudentRouter.post(
  "/:id/chat",
  requireAuth,
  async (req, res) => {
    try {
      const messageText = typeof req.body?.message === "string" ? req.body.message : "";
      const avatarUrl = typeof req.body?.avatarUrl === "string" ? req.body.avatarUrl : void 0;
      const role = String(req.user?.role || "").toLowerCase();
      const isAdmin = role === "admin" || role === "super_admin" || role === "teacher";
      const chatMessage = addLiveMinigameChat(req.params.id, {
        uid: req.user.uid,
        displayName: req.user.displayName || req.user.email?.split("@")[0] || "H\u1ECDc sinh",
        avatarUrl,
        isAdmin,
        message: messageText
      });
      return res.json({
        success: true,
        chatMessage,
        messages: listLiveMinigameChat(req.params.id)
      });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);

// server/routes/documentLibraryRoutes.ts
import { Router as Router3 } from "express";

// server/services/documentLibraryService.ts
import fs from "fs";
import path from "path";
import crypto3 from "crypto";
import { z as z4 } from "zod";

// src/types/documentLibrary.ts
var DOCUMENT_SOURCE_META = {
  dktest: {
    label: "T\xE0i li\u1EC7u \u0110\u1ED9c quy\u1EC1n DkTEST",
    shortLabel: "\u0110\u1ED9c quy\u1EC1n DkTEST",
    description: "B\u1ED9 \u0111\u1EC1 thi, chuy\xEAn \u0111\u1EC1 & Ebook bi\xEAn so\u1EA1n v\xE0 tuy\u1EC3n ch\u1ECDn \u0111\u1ED9c quy\u1EC1n b\u1EDFi \u0111\u1ED9i ng\u0169 DkTEST.",
    accentColor: "teal"
  },
  community: {
    label: "Th\u01B0 m\u1EE5c C\u1ED9ng \u0111\u1ED3ng & Gi\xE1o vi\xEAn",
    shortLabel: "C\u1ED9ng \u0111\u1ED3ng",
    description: "Kho th\u01B0 m\u1EE5c ri\xEAng do gi\xE1o vi\xEAn v\xE0 th\xE0nh vi\xEAn DkTEST \u0111\xF3ng g\xF3p, c\u1EADp nh\u1EADt li\xEAn t\u1EE5c.",
    accentColor: "indigo"
  },
  nhdt: {
    label: "Ng\xE2n H\xE0ng \u0110\u1EC1 Thi (nganhangdethi.org)",
    shortLabel: "Ng\xE2n H\xE0ng \u0110\u1EC1 Thi",
    domain: "nganhangdethi.org",
    description: "Kho \u0111\u1EC1 thi, Ebook Moon/Mapstudy & th\u01B0 m\u1EE5c t\xE0i li\u1EC7u 10, 11, 12, HSA, V-ACT, TSA ph\xE2n c\u1EA5p chu\u1EA9n nh\u01B0 g\u1ED1c.",
    accentColor: "blue"
  },
  tlo_edu: {
    label: "T\xE0i Li\u1EC7u \xD4n Thi EDU (tailieuonthi.edu.vn)",
    shortLabel: "T\xE0i Li\u1EC7u \xD4n Thi EDU",
    domain: "tailieuonthi.edu.vn",
    description: "H\u1EC7 th\u1ED1ng th\u01B0 m\u1EE5c THCS (L\u1EDBp 8, 9), THPT (10, 11, 12), \u0110\u1EC1 kh\u1EA3o s\xE1t S\u1EDF GD&\u0110T, \u0110GNL & \u0110GTD mi\u1EC5n ph\xED.",
    accentColor: "emerald"
  },
  tlo_org: {
    label: "T\xE0i Li\u1EC7u \xD4n Thi ORG (tailieuonthi.org)",
    shortLabel: "T\xE0i Li\u1EC7u \xD4n Thi ORG",
    domain: "tailieuonthi.org",
    description: "Chuy\xEAn trang t\xE0i li\u1EC7u c\xE1c k\u1EF3 thi THPT, HSA, TSA, V-ACT, SPT (S\u01B0 ph\u1EA1m), QDA & B\u1ED9 C\xF4ng An c\xF3 \u0111\xE1p \xE1n chi ti\u1EBFt.",
    accentColor: "amber"
  },
  math_partners: {
    label: "Kho To\xE1n & Chuy\xEAn \u0110\u1EC1 M\u1EDF R\u1ED9ng",
    shortLabel: "To\xE1n M\u1EDF R\u1ED9ng",
    domain: "mathvn.com",
    description: "T\u1ED5ng h\u1EE3p chuy\xEAn \u0111\u1EC1 v\xE0 \u0111\u1EC1 thi th\u1EED To\xE1n THPT t\u1EEB Nguy\u1EC5n B\u1EA3o V\u01B0\u01A1ng, MathVN & THPT.Math.",
    accentColor: "purple"
  }
};
var DOCUMENT_GRADE_META = {
  thcs: {
    label: "THCS (L\u1EDBp 6\u20139 & Thi v\xE0o 10)",
    shortLabel: "THCS (6\u20139)",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
  },
  grade_10: {
    label: "L\u1EDBp 10",
    shortLabel: "L\u1EDBp 10",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
  },
  grade_11: {
    label: "L\u1EDBp 11",
    shortLabel: "L\u1EDBp 11",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
  },
  grade_12: {
    label: "L\u1EDBp 12",
    shortLabel: "L\u1EDBp 12",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
  },
  thpt_qg: {
    label: "T\u1ED1t nghi\u1EC7p THPT",
    shortLabel: "THPT QG",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
  },
  dgnl_dgtd: {
    label: "\u0110GNL & \u0110GTD (HSA / V-ACT / TSA / SPT)",
    shortLabel: "\u0110GNL - \u0110GTD",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
  },
  general: {
    label: "\u0110\u1EA1i c\u01B0\u01A1ng & Ch\u1EE9ng ch\u1EC9",
    shortLabel: "\u0110\u1EA1i c\u01B0\u01A1ng",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }
};
var DOCUMENT_SUBJECT_META = {
  math: { label: "To\xE1n h\u1ECDc", bannerKey: "math", colorClass: "text-blue-600 dark:text-blue-400" },
  literature: { label: "Ng\u1EEF v\u0103n", bannerKey: "literature", colorClass: "text-rose-600 dark:text-rose-400" },
  english: { label: "Ti\u1EBFng Anh", bannerKey: "english", colorClass: "text-sky-600 dark:text-sky-400" },
  physics: { label: "V\u1EADt l\xFD", bannerKey: "physics", colorClass: "text-indigo-600 dark:text-indigo-400" },
  chemistry: { label: "H\xF3a h\u1ECDc", bannerKey: "chemistry", colorClass: "text-emerald-600 dark:text-emerald-400" },
  biology: { label: "Sinh h\u1ECDc", bannerKey: "biology", colorClass: "text-green-600 dark:text-green-400" },
  history: { label: "L\u1ECBch s\u1EED", bannerKey: "history", colorClass: "text-amber-700 dark:text-amber-400" },
  geography: { label: "\u0110\u1ECBa l\xFD", bannerKey: "geography", colorClass: "text-teal-600 dark:text-teal-400" },
  civics: { label: "KT & Ph\xE1p lu\u1EADt", bannerKey: "civics", colorClass: "text-purple-600 dark:text-purple-400" },
  informatics: { label: "Tin h\u1ECDc", bannerKey: "informatics", colorClass: "text-cyan-600 dark:text-cyan-400" },
  technology: { label: "C\xF4ng ngh\u1EC7", bannerKey: "technology", colorClass: "text-orange-600 dark:text-orange-400" },
  foreign_other: { label: "Ngo\u1EA1i ng\u1EEF kh\xE1c", bannerKey: "english", colorClass: "text-pink-600 dark:text-pink-400" },
  aptitude: { label: "\u0110\xE1nh gi\xE1 n\u0103ng l\u1EF1c", bannerKey: "dgnl", colorClass: "text-amber-600 dark:text-amber-400" },
  multi_subject: { label: "T\u1ED5ng h\u1EE3p \u0111a m\xF4n", bannerKey: "default", colorClass: "text-slate-600 dark:text-slate-400" }
};
var DOCUMENT_CATEGORY_META = {
  exam_test: { label: "\u0110\u1EC1 thi & \u0110\xE1p \xE1n", shortLabel: "\u0110\u1EC1 thi" },
  ebook_book: { label: "S\xE1ch & Ebook", shortLabel: "Ebook" },
  topic_guide: { label: "Chuy\xEAn \u0111\u1EC1 & L\xFD thuy\u1EBFt", shortLabel: "Chuy\xEAn \u0111\u1EC1" },
  formula_handbook: { label: "S\u1ED5 tay & C\xF4ng th\u1EE9c", shortLabel: "S\u1ED5 tay" },
  folder_pack: { label: "B\u1ED9 t\xE0i li\u1EC7u t\u1ED5ng h\u1EE3p", shortLabel: "Tr\u1ECDn b\u1ED9" }
};
function inferSourceKeyFromLabel(src) {
  const s = String(src || "").toLowerCase();
  if (s.includes("ng\xE2n h\xE0ng \u0111\u1EC1 thi") || s.includes("nganhangdethi")) return "nhdt";
  if (s.includes("tailieuonthi.edu") || s.includes("\xF4n thi edu")) return "tlo_edu";
  if (s.includes("tailieuonthi.org") || s.includes("\xF4n thi org")) return "tlo_org";
  return "math_partners";
}
function expandSeedUrl(u) {
  if (!u) return void 0;
  if (u.startsWith("gd:")) return `https://drive.google.com/file/d/${u.slice(3)}/view`;
  if (u.startsWith("gdf:")) return `https://drive.google.com/drive/folders/${u.slice(4)}`;
  if (u.startsWith("gds:")) return `https://docs.google.com/spreadsheets/d/${u.slice(4)}/edit`;
  return u;
}
function expandCompactSeedFolder(item) {
  const srcMeta = DOCUMENT_SOURCE_META[item.sk] || DOCUMENT_SOURCE_META.nhdt;
  return {
    id: item.id,
    name: item.n,
    parentId: item.p ?? null,
    space: "sources",
    sourceKey: item.sk,
    description: item.d || (item.p === null ? srcMeta.description : void 0),
    grade: item.g,
    subject: item.s,
    iconColor: item.ic || srcMeta.accentColor,
    ownerName: srcMeta.shortLabel,
    ownerRole: "seed",
    status: "published",
    sortOrder: item.o ?? 100,
    sourceUrl: item.u,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-11-27T00:00:00.000Z"
  };
}
function expandSeedPostUrl(pu) {
  if (!pu) return void 0;
  if (pu.startsWith("nh:")) return `https://www.nganhangdethi.org${pu.slice(3)}`;
  if (pu.startsWith("edu:")) return `https://tailieuonthi.edu.vn${pu.slice(4)}`;
  if (pu.startsWith("org:")) return `https://tailieuonthi.org${pu.slice(4)}`;
  return pu;
}
function expandCompactSeedDocument(item) {
  const gradeLabel = DOCUMENT_GRADE_META[item.g]?.shortLabel || "THPT";
  const subjectLabel = DOCUMENT_SUBJECT_META[item.s]?.label || "T\u1ED5ng h\u1EE3p";
  const categoryLabel = DOCUMENT_CATEGORY_META[item.c]?.label || "T\xE0i li\u1EC7u";
  const subCount = item.sf?.length || item.sfc || 0;
  const primaryUrl = expandSeedUrl(item.u) || item.u;
  const answerUrl = expandSeedUrl(item.a);
  const videoUrl = expandSeedUrl(item.v);
  const sourceKey = item.sk || inferSourceKeyFromLabel(item.src);
  const sourcePostUrl = expandSeedPostUrl(item.pu);
  const descParts = [
    `${categoryLabel} m\xF4n ${subjectLabel} (${gradeLabel})`,
    subCount > 0 ? `g\u1ED3m ${subCount} t\u1EC7p t\xE0i li\u1EC7u ch\u1ECDn l\u1ECDc ph\xE2n theo th\u01B0 m\u1EE5c` : "\u0111\u1ECBnh d\u1EA1ng chu\u1EA9n r\xF5 n\xE9t",
    answerUrl && answerUrl !== primaryUrl ? "k\xE8m file \u0111\xE1p \xE1n chi ti\u1EBFt" : "",
    videoUrl && videoUrl !== primaryUrl ? "k\xE8m video h\u01B0\u1EDBng d\u1EABn gi\u1EA3i" : ""
  ].filter(Boolean);
  return {
    id: item.id,
    title: item.t,
    description: `${descParts.join(", ")}. Xem tr\u1EF1c tuy\u1EBFn b\u1EB1ng tr\xECnh \u0111\u1ECDc PDF DkTEST ho\u1EB7c t\u1EA3i tr\u1ECDn b\u1ED9 v\u1EC1 m\xE1y mi\u1EC5n ph\xED.`,
    grade: item.g,
    subject: item.s,
    category: item.c,
    fileFormat: item.f,
    folderId: item.fid || `sfold_${sourceKey}`,
    ...item.tk ? { topicKey: item.tk } : {},
    space: "sources",
    sourceKey,
    accessMode: "free",
    priceVnd: 0,
    fileUrl: primaryUrl,
    answerUrl,
    videoUrl,
    ...subCount > 0 ? { subFileCount: subCount } : {},
    ...item.sf ? {
      subFiles: item.sf.map((sf) => ({
        name: sf.n,
        url: expandSeedUrl(sf.u) || sf.u,
        fileFormat: sf.f,
        ...sf.p ? { folderPath: sf.p } : {}
      }))
    } : {},
    authorName: item.src || "Kho T\xE0i Li\u1EC7u THPT",
    authorRole: "seed",
    sourceName: item.src,
    ...sourcePostUrl ? { sourcePostUrl } : {},
    status: "published",
    tags: item.tg || [],
    viewCount: 0,
    downloadCount: 0,
    publishedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
    createdAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
    updatedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z"
  };
}

// server/services/documentLibraryService.ts
var SETTINGS_COLLECTION = "system_settings";
var SETTINGS_DOC_ID = "document_library_config";
var FOLDERS_COLLECTION = "library_folders";
var DOCS_COLLECTION = "library_documents";
var SECRETS_COLLECTION = "library_document_secrets";
var ENTITLEMENTS_COLLECTION = "library_entitlements";
var LIVE_DOCS_TTL_MS = 45 * 1e3;
var SETTINGS_TTL_MS = 60 * 1e3;
var MAX_PROXY_BYTES = 44 * 1024 * 1024;
var MAX_FOLDER_DEPTH = 6;
var cachedLiveDocs = null;
var cachedLiveFolders = null;
var cachedSettings = null;
var cachedSeedBundle = null;
var cachedSeedPacks = null;
function loadSeedPacksCache() {
  if (cachedSeedPacks) return cachedSeedPacks;
  const candidates = [
    path.join(process.cwd(), "public", "data", "document-library-packs.json"),
    path.join(process.cwd(), "dist", "data", "document-library-packs.json")
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      cachedSeedPacks = JSON.parse(fs.readFileSync(filePath, "utf8")) || {};
      return cachedSeedPacks;
    } catch {
    }
  }
  cachedSeedPacks = {};
  return cachedSeedPacks;
}
function hydrateSeedDocPack(doc) {
  if (!doc) return null;
  if (doc.subFiles && doc.subFiles.length > 0) return doc;
  if (!doc.subFileCount || doc.subFileCount <= 1) return doc;
  const rawPack = loadSeedPacksCache()[doc.id];
  if (!Array.isArray(rawPack) || rawPack.length === 0) return doc;
  const subFiles = rawPack.map((sf) => ({
    name: sf.n,
    url: expandSeedUrl(sf.u) || sf.u,
    fileFormat: sf.f,
    ...sf.p ? { folderPath: sf.p } : {}
  }));
  return { ...doc, subFiles };
}
function invalidateDocumentLibraryCache() {
  cachedLiveDocs = null;
  cachedLiveFolders = null;
}
function loadSeedBundleCache() {
  if (cachedSeedBundle) return cachedSeedBundle;
  const docs = /* @__PURE__ */ new Map();
  const folders = /* @__PURE__ */ new Map();
  const candidates = [
    path.join(process.cwd(), "public", "data", "document-library-seed.json"),
    path.join(process.cwd(), "dist", "data", "document-library-seed.json")
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.folders)) {
        for (const f of parsed.folders) {
          if (f?.id) {
            folders.set(f.id, expandCompactSeedFolder(f));
          }
        }
      }
      if (Array.isArray(parsed?.items)) {
        for (const item of parsed.items) {
          if (item?.id) {
            docs.set(item.id, expandCompactSeedDocument(item));
          }
        }
        break;
      }
    } catch (err) {
      console.warn("[documentLibraryService] Failed to parse seed JSON:", err);
    }
  }
  cachedSeedBundle = { docs, folders };
  return cachedSeedBundle;
}
function getSeedDocumentById(docId) {
  const clean = String(docId || "").trim();
  if (!clean) return null;
  return hydrateSeedDocPack(loadSeedBundleCache().docs.get(clean) || null);
}
function getSeedFolderById(folderId) {
  const clean = String(folderId || "").trim();
  if (!clean) return null;
  return loadSeedBundleCache().folders.get(clean) || null;
}
async function getDocumentLibrarySettings(forceRefresh = false) {
  if (!forceRefresh && cachedSettings && Date.now() - cachedSettings.timestamp < SETTINGS_TTL_MS) {
    return cachedSettings.data;
  }
  const defaults = {
    autoApproveUserUploads: true,
    creatorRevenueSharePercent: 80,
    maxUserPriceVnd: 5e5,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    let raw = null;
    if (adminDb) {
      const snap = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
      if (snap.exists) raw = snap.data();
    } else {
      raw = await getFirestoreRestDoc(SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    }
    if (raw) {
      const merged = {
        autoApproveUserUploads: typeof raw.autoApproveUserUploads === "boolean" ? raw.autoApproveUserUploads : defaults.autoApproveUserUploads,
        creatorRevenueSharePercent: typeof raw.creatorRevenueSharePercent === "number" ? Math.max(0, Math.min(100, Math.round(raw.creatorRevenueSharePercent))) : defaults.creatorRevenueSharePercent,
        maxUserPriceVnd: typeof raw.maxUserPriceVnd === "number" && raw.maxUserPriceVnd >= 1e3 ? Math.floor(raw.maxUserPriceVnd) : defaults.maxUserPriceVnd,
        updatedAt: raw.updatedAt || defaults.updatedAt
      };
      cachedSettings = { data: merged, timestamp: Date.now() };
      return merged;
    }
  } catch (err) {
    console.warn("[documentLibraryService] Error loading settings, using defaults:", err);
  }
  cachedSettings = { data: defaults, timestamp: Date.now() };
  return defaults;
}
var gradeEnum = z4.enum([
  "thcs",
  "grade_10",
  "grade_11",
  "grade_12",
  "thpt_qg",
  "dgnl_dgtd",
  "general"
]);
var subjectEnum = z4.enum([
  "math",
  "literature",
  "english",
  "physics",
  "chemistry",
  "biology",
  "history",
  "geography",
  "civics",
  "informatics",
  "technology",
  "foreign_other",
  "aptitude",
  "multi_subject"
]);
var subFileSchema = z4.object({
  name: z4.string().trim().min(1).max(160),
  url: z4.string().trim().url().max(2048),
  fileFormat: z4.enum(["pdf", "docx", "doc", "pptx", "xlsx", "zip", "folder", "sheet", "other"]).default("pdf"),
  folderPath: z4.string().trim().max(160).optional()
});
var upsertFolderSchema = z4.object({
  id: z4.string().trim().min(3).max(96).optional(),
  name: z4.string().trim().min(2, "T\xEAn th\u01B0 m\u1EE5c ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 2 k\xFD t\u1EF1.").max(140),
  description: z4.string().trim().max(600).optional().default(""),
  parentId: z4.string().trim().max(96).nullable().optional().default(null),
  space: z4.enum(["dktest_exclusive", "community", "sources"]).optional(),
  grade: gradeEnum.optional(),
  subject: subjectEnum.optional(),
  iconColor: z4.enum(["teal", "blue", "indigo", "amber", "rose", "emerald", "purple", "slate"]).optional().default("teal"),
  coverImageUrl: z4.string().trim().url().max(2048).nullable().optional(),
  isPinned: z4.boolean().optional(),
  sortOrder: z4.number().int().min(0).max(9999).optional(),
  status: z4.enum(["published", "hidden"]).optional()
});
var upsertDocumentSchema = z4.object({
  id: z4.string().trim().min(3).max(96).optional(),
  title: z4.string().trim().min(3, "Ti\xEAu \u0111\u1EC1 ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 3 k\xFD t\u1EF1.").max(220),
  description: z4.string().trim().max(2e3).optional().default(""),
  grade: gradeEnum.default("grade_12"),
  subject: subjectEnum.default("math"),
  category: z4.enum(["exam_test", "ebook_book", "topic_guide", "formula_handbook", "folder_pack"]).default("exam_test"),
  fileFormat: z4.enum(["pdf", "docx", "doc", "pptx", "xlsx", "zip", "folder", "sheet", "other"]).default("pdf"),
  folderId: z4.string().trim().max(96).nullable().optional(),
  space: z4.enum(["dktest_exclusive", "community", "sources"]).optional(),
  pageCount: z4.number().int().min(0).max(5e3).optional(),
  fileSizeBytes: z4.number().int().min(0).max(1024 * 1024 * 500).optional(),
  coverImageUrl: z4.string().trim().url().max(2048).nullable().optional(),
  previewImageUrls: z4.array(z4.string().trim().url().max(2048)).max(5).optional(),
  accessMode: z4.enum(["free", "paid"]).default("free"),
  priceVnd: z4.number().min(0).max(5e6).default(0),
  previewPageCount: z4.number().int().min(0).max(10).optional().default(2),
  salesEnabled: z4.boolean().optional().default(true),
  fileUrl: z4.string().trim().url("Vui l\xF2ng t\u1EA3i t\u1EC7p l\xEAn ho\u1EB7c nh\u1EADp li\xEAn k\u1EBFt h\u1EE3p l\u1EC7.").max(2048).optional(),
  originalFileName: z4.string().trim().max(200).optional(),
  answerUrl: z4.string().trim().max(2048).optional(),
  videoUrl: z4.string().trim().max(2048).optional(),
  subFiles: z4.array(subFileSchema).max(120).optional(),
  topicKey: z4.string().trim().max(64).optional(),
  tags: z4.array(z4.string().trim().max(48)).max(12).optional().default([]),
  isFeatured: z4.boolean().optional(),
  status: z4.enum(["published", "pending", "rejected", "hidden"]).optional()
});
var supplementDocumentSchema = z4.object({
  appendSubFiles: z4.array(subFileSchema).max(120).optional(),
  replaceSubFiles: z4.array(subFileSchema).max(120).optional(),
  answerUrl: z4.string().trim().max(2048).nullable().optional(),
  videoUrl: z4.string().trim().max(2048).nullable().optional(),
  status: z4.enum(["published", "hidden"]).optional(),
  folderId: z4.string().trim().max(96).nullable().optional()
});
function sanitizePublicDocument(doc) {
  const isPaid = doc.accessMode === "paid" && sanitizeVnd(doc.priceVnd) > 0;
  if (!isPaid) return doc;
  const copy = { ...doc };
  delete copy.fileUrl;
  delete copy.answerUrl;
  delete copy.videoUrl;
  delete copy.subFiles;
  return copy;
}
async function getLiveLibraryFolders(options = {}) {
  if (!options.forceRefresh && cachedLiveFolders && Date.now() - cachedLiveFolders.timestamp < LIVE_DOCS_TTL_MS) {
    const all = cachedLiveFolders.items;
    return options.includeHidden ? all : all.filter((f) => f.status !== "hidden");
  }
  let list = [];
  if (adminDb) {
    try {
      const snap = await adminDb.collection(FOLDERS_COLLECTION).orderBy("updatedAt", "desc").limit(500).get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      const snap = await adminDb.collection(FOLDERS_COLLECTION).limit(500).get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    }
  } else {
    const docs = await getFirestoreRestDocs(FOLDERS_COLLECTION, 400, true);
    list = (docs || []).map((d) => ({ id: d.id, ...d }));
    list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  cachedLiveFolders = { items: list, timestamp: Date.now() };
  return options.includeHidden ? list : list.filter((f) => f.status !== "hidden");
}
async function getFolderByIdResolved(folderId) {
  const cleanId = String(folderId || "").trim();
  if (!cleanId) return null;
  let liveFolder = null;
  if (adminDb) {
    const snap = await adminDb.collection(FOLDERS_COLLECTION).doc(cleanId).get();
    if (snap.exists) {
      liveFolder = { id: snap.id, ...snap.data() };
    }
  } else {
    const rest = await getFirestoreRestDoc(FOLDERS_COLLECTION, cleanId);
    if (rest) {
      liveFolder = { id: cleanId, ...rest };
    }
  }
  if (liveFolder) return liveFolder;
  return getSeedFolderById(cleanId);
}
async function getMyLibraryFolders(uid) {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return [];
  const all = await getLiveLibraryFolders({ includeHidden: true });
  return all.filter((f) => f.ownerUid === cleanUid);
}
async function assertValidParentChain(folderId, parentId) {
  if (!parentId) return { parentFolder: null, depth: 0 };
  if (parentId === folderId) {
    throw new Error("Kh\xF4ng th\u1EC3 \u0111\u1EB7t th\u01B0 m\u1EE5c l\xE0m th\u01B0 m\u1EE5c con c\u1EE7a ch\xEDnh n\xF3.");
  }
  const firstParent = await getFolderByIdResolved(parentId);
  if (!firstParent || firstParent.status === "hidden") {
    throw new Error("Th\u01B0 m\u1EE5c cha kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB \u1EA9n.");
  }
  let cur = firstParent;
  let depth = 1;
  const visited = /* @__PURE__ */ new Set([folderId]);
  while (cur) {
    if (visited.has(cur.id)) {
      throw new Error("Ph\xE1t hi\u1EC7n v\xF2ng l\u1EB7p ph\xE2n c\u1EA5p th\u01B0 m\u1EE5c kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    visited.add(cur.id);
    if (depth >= MAX_FOLDER_DEPTH) {
      throw new Error(`C\xE2y th\u01B0 m\u1EE5c h\u1ED7 tr\u1EE3 t\u1ED1i \u0111a ${MAX_FOLDER_DEPTH} c\u1EA5p ph\xE2n nh\xE1nh.`);
    }
    if (!cur.parentId) break;
    cur = await getFolderByIdResolved(cur.parentId);
    depth++;
  }
  return { parentFolder: firstParent, depth };
}
async function createOrUpdateLibraryFolder(actor, rawInput) {
  const parsed = upsertFolderSchema.parse(rawInput);
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const existingId = parsed.id?.trim();
  let existingFolder = null;
  if (existingId) {
    existingFolder = await getFolderByIdResolved(existingId);
    if (existingFolder) {
      if (!isAdmin && existingFolder.ownerUid !== actor.uid) {
        throw new Error("B\u1EA1n ch\u1EC9 c\xF3 quy\u1EC1n ch\u1EC9nh s\u1EEDa th\u01B0 m\u1EE5c do ch\xEDnh m\xECnh t\u1EA1o.");
      }
      if (!isAdmin && existingFolder.ownerRole === "seed") {
        throw new Error("Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa th\u01B0 m\u1EE5c ngu\u1ED3n g\u1ED1c.");
      }
    }
  }
  const folderId = existingId || `lfold_${Date.now()}_${crypto3.randomBytes(3).toString("hex")}`;
  const cleanParentId = parsed.parentId?.trim() || null;
  const { parentFolder } = await assertValidParentChain(folderId, cleanParentId);
  if (!isAdmin && parentFolder) {
    if (parentFolder.ownerUid !== actor.uid) {
      throw new Error("B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 t\u1EA1o th\u01B0 m\u1EE5c con b\xEAn trong th\u01B0 m\u1EE5c c\u1EE7a ch\xEDnh m\xECnh.");
    }
  }
  let resolvedSpace = "community";
  let resolvedSourceKey = "community";
  if (parentFolder) {
    resolvedSpace = parentFolder.space;
    resolvedSourceKey = parentFolder.sourceKey || (parentFolder.space === "dktest_exclusive" ? "dktest" : "community");
  } else if (isAdmin) {
    resolvedSpace = parsed.space || existingFolder?.space || "dktest_exclusive";
    resolvedSourceKey = resolvedSpace === "dktest_exclusive" ? "dktest" : resolvedSpace === "sources" ? existingFolder?.sourceKey || "nhdt" : "community";
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const ownerName = existingFolder?.ownerName && existingFolder.ownerRole !== "seed" ? existingFolder.ownerName : actor.displayName || actor.email?.split("@")[0] || (isAdmin ? "Ban Qu\u1EA3n Tr\u1ECB DkTEST" : "Th\xE0nh vi\xEAn DkTEST");
  const folderDoc = {
    id: folderId,
    name: parsed.name.trim(),
    description: parsed.description?.trim() || "",
    parentId: cleanParentId,
    space: resolvedSpace,
    sourceKey: resolvedSourceKey,
    ...parsed.grade ? { grade: parsed.grade } : existingFolder?.grade ? { grade: existingFolder.grade } : {},
    ...parsed.subject ? { subject: parsed.subject } : existingFolder?.subject ? { subject: existingFolder.subject } : {},
    iconColor: parsed.iconColor || existingFolder?.iconColor || "teal",
    coverImageUrl: parsed.coverImageUrl !== void 0 ? parsed.coverImageUrl : existingFolder?.coverImageUrl || null,
    ownerUid: existingFolder?.ownerUid || actor.uid,
    ownerName,
    ownerRole: existingFolder?.ownerRole && existingFolder.ownerRole !== "seed" ? existingFolder.ownerRole : isAdmin ? "admin" : "community",
    status: isAdmin ? parsed.status || existingFolder?.status || "published" : "published",
    isPinned: isAdmin ? parsed.isPinned ?? existingFolder?.isPinned ?? false : false,
    sortOrder: parsed.sortOrder ?? existingFolder?.sortOrder ?? 50,
    createdAt: existingFolder?.createdAt || now,
    updatedAt: now
  };
  if (adminDb) {
    await adminDb.collection(FOLDERS_COLLECTION).doc(folderId).set(folderDoc);
  } else {
    await setFirestoreRestDoc(FOLDERS_COLLECTION, folderId, folderDoc);
  }
  invalidateDocumentLibraryCache();
  return folderDoc;
}
async function deleteLibraryFolder(actor, folderId) {
  const cleanId = String(folderId || "").trim();
  if (!cleanId) throw new Error("M\xE3 th\u01B0 m\u1EE5c kh\xF4ng h\u1EE3p l\u1EC7.");
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const existing = await getFolderByIdResolved(cleanId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y th\u01B0 m\u1EE5c.");
  if (!isAdmin && existing.ownerUid !== actor.uid) {
    throw new Error("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a th\u01B0 m\u1EE5c n\xE0y.");
  }
  const isSeed = Boolean(getSeedFolderById(cleanId));
  if (isSeed) {
    if (!isAdmin) throw new Error("Kh\xF4ng th\u1EC3 x\xF3a th\u01B0 m\u1EE5c g\u1ED1c c\u1EE7a h\u1EC7 th\u1ED1ng.");
    const hiddenOverride = {
      ...existing,
      status: "hidden",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (adminDb) {
      await adminDb.collection(FOLDERS_COLLECTION).doc(cleanId).set(hiddenOverride, { merge: true });
    } else {
      await setFirestoreRestDoc(FOLDERS_COLLECTION, cleanId, hiddenOverride);
    }
    invalidateDocumentLibraryCache();
    return { deleted: true, hiddenSeed: true, reparentedDocs: 0, reparentedFolders: 0 };
  }
  const fallbackParentId = existing.parentId ?? null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [liveFolders, liveDocs] = await Promise.all([
    getLiveLibraryFolders({ includeHidden: true, forceRefresh: true }),
    getLiveLibraryDocuments({ includeNonPublished: true, forceRefresh: true })
  ]);
  const childFolders = liveFolders.filter((f) => f.parentId === cleanId);
  const childDocs = liveDocs.filter((d) => d.folderId === cleanId);
  if (adminDb) {
    const batch = adminDb.batch();
    for (const cf of childFolders) {
      batch.set(
        adminDb.collection(FOLDERS_COLLECTION).doc(cf.id),
        { parentId: fallbackParentId, updatedAt: now },
        { merge: true }
      );
    }
    for (const cd of childDocs) {
      batch.set(
        adminDb.collection(DOCS_COLLECTION).doc(cd.id),
        { folderId: fallbackParentId, updatedAt: now },
        { merge: true }
      );
    }
    batch.delete(adminDb.collection(FOLDERS_COLLECTION).doc(cleanId));
    await batch.commit();
  } else {
    for (const cf of childFolders) {
      await setFirestoreRestDoc(FOLDERS_COLLECTION, cf.id, {
        ...cf,
        parentId: fallbackParentId,
        updatedAt: now
      });
    }
    for (const cd of childDocs) {
      await setFirestoreRestDoc(DOCS_COLLECTION, cd.id, {
        ...cd,
        folderId: fallbackParentId,
        updatedAt: now
      });
    }
    await deleteFirestoreRestDoc(FOLDERS_COLLECTION, cleanId);
  }
  invalidateDocumentLibraryCache();
  return {
    deleted: true,
    reparentedDocs: childDocs.length,
    reparentedFolders: childFolders.length
  };
}
async function getLiveLibraryDocuments(options = {}) {
  if (!options.forceRefresh && cachedLiveDocs && Date.now() - cachedLiveDocs.timestamp < LIVE_DOCS_TTL_MS) {
    const all = cachedLiveDocs.items;
    return options.includeNonPublished ? all : all.filter((d) => d.status === "published" || d.status === "hidden");
  }
  let list = [];
  if (adminDb) {
    try {
      const snap = await adminDb.collection(DOCS_COLLECTION).orderBy("updatedAt", "desc").limit(600).get();
      list = snap.docs.map((d) => sanitizePublicDocument({ id: d.id, ...d.data() }));
    } catch {
      const snap = await adminDb.collection(DOCS_COLLECTION).limit(600).get();
      list = snap.docs.map((d) => sanitizePublicDocument({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    }
  } else {
    const docs = await getFirestoreRestDocs(DOCS_COLLECTION, 400, true);
    list = (docs || []).map((d) => sanitizePublicDocument({ id: d.id, ...d }));
    list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  cachedLiveDocs = { items: list, timestamp: Date.now() };
  return options.includeNonPublished ? list : list.filter((d) => d.status === "published" || d.status === "hidden");
}
async function getDocumentByIdResolved(docId) {
  const cleanId = String(docId || "").trim();
  if (!cleanId) return null;
  let liveDoc = null;
  if (adminDb) {
    const snap = await adminDb.collection(DOCS_COLLECTION).doc(cleanId).get();
    if (snap.exists) {
      liveDoc = sanitizePublicDocument({ id: snap.id, ...snap.data() });
    }
  } else {
    const restDoc = await getFirestoreRestDoc(DOCS_COLLECTION, cleanId);
    if (restDoc) {
      liveDoc = sanitizePublicDocument({ id: cleanId, ...restDoc });
    }
  }
  if (liveDoc) return liveDoc;
  return getSeedDocumentById(cleanId);
}
async function getDocumentSecrets(docId) {
  if (adminDb) {
    const snap = await adminDb.collection(SECRETS_COLLECTION).doc(docId).get();
    return snap.exists ? snap.data() : null;
  }
  return await getFirestoreRestDoc(SECRETS_COLLECTION, docId);
}
async function getMyUploadedDocuments(uid) {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return [];
  const all = await getLiveLibraryDocuments({ includeNonPublished: true });
  return all.filter((d) => d.authorUid === cleanUid);
}
async function getMyUnlockedDocumentIds(uid) {
  const cleanUid = String(uid || "").trim();
  if (!cleanUid) return [];
  let ents = [];
  if (adminDb) {
    const snap = await adminDb.collection(ENTITLEMENTS_COLLECTION).where("uid", "==", cleanUid).limit(300).get();
    ents = snap.docs.map((d) => d.data());
  } else {
    ents = await queryFirestoreRestDocs(ENTITLEMENTS_COLLECTION, "uid", cleanUid, 300) || [];
  }
  return ents.filter((e) => e && e.status === "active" && e.docId).map((e) => String(e.docId));
}
async function createOrUpdateLibraryDocument(actor, rawInput) {
  const parsed = upsertDocumentSchema.parse(rawInput);
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const settings = await getDocumentLibrarySettings();
  const existingId = parsed.id?.trim();
  let existingDoc = null;
  let existingSecrets = null;
  if (existingId) {
    existingDoc = await getDocumentByIdResolved(existingId);
    if (existingDoc) {
      if (!isAdmin && existingDoc.authorUid !== actor.uid) {
        throw new Error("B\u1EA1n ch\u1EC9 c\xF3 quy\u1EC1n ch\u1EC9nh s\u1EEDa t\xE0i li\u1EC7u do ch\xEDnh m\xECnh \u0111\u0103ng t\u1EA3i.");
      }
      existingSecrets = await getDocumentSecrets(existingId);
    }
  }
  const resolvedFileUrl = parsed.fileUrl?.trim() || existingSecrets?.fileUrl || existingDoc?.fileUrl || "";
  if (!resolvedFileUrl) {
    throw new Error("Vui l\xF2ng t\u1EA3i t\u1EC7p t\xE0i li\u1EC7u l\xEAn Cloudinary ho\u1EB7c nh\u1EADp \u0111\u01B0\u1EDDng d\u1EABn h\u1EE3p l\u1EC7.");
  }
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(resolvedFileUrl)) {
    await validateUrlForSsrf(resolvedFileUrl);
  }
  const requestedFolderId = parsed.folderId !== void 0 ? parsed.folderId?.trim() || null : existingDoc?.folderId ?? null;
  let targetFolder = null;
  if (requestedFolderId) {
    targetFolder = await getFolderByIdResolved(requestedFolderId);
    if (!targetFolder || targetFolder.status === "hidden") {
      throw new Error("Th\u01B0 m\u1EE5c l\u01B0u tr\u1EEF kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB \u1EA9n.");
    }
    if (!isAdmin && targetFolder.ownerUid !== actor.uid) {
      throw new Error("B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 \u0111\u0103ng t\xE0i li\u1EC7u v\xE0o th\u01B0 m\u1EE5c c\u1EE7a ch\xEDnh m\xECnh.");
    }
  }
  const accessMode = parsed.accessMode === "paid" && parsed.priceVnd > 0 ? "paid" : "free";
  const priceVnd = accessMode === "paid" ? sanitizeVnd(parsed.priceVnd) : 0;
  if (accessMode === "paid") {
    if (priceVnd < 1e3) {
      throw new Error("M\u1EE9c ph\xED t\xE0i li\u1EC7u tr\u1EA3 ph\xED t\u1ED1i thi\u1EC3u l\xE0 1.000\u0111.");
    }
    const maxAllowed = isAdmin ? 5e6 : settings.maxUserPriceVnd;
    if (priceVnd > maxAllowed) {
      throw new Error(`M\u1EE9c ph\xED t\u1ED1i \u0111a cho ph\xE9p l\xE0 ${maxAllowed.toLocaleString("vi-VN")}\u0111.`);
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const docId = existingId || `ldoc_${Date.now()}_${crypto3.randomBytes(3).toString("hex")}`;
  let nextStatus = "published";
  if (isAdmin) {
    nextStatus = parsed.status || existingDoc?.status || "published";
  } else if (parsed.status === "hidden") {
    nextStatus = "hidden";
  } else if (existingDoc?.status === "rejected" && !settings.autoApproveUserUploads) {
    nextStatus = "pending";
  } else {
    nextStatus = settings.autoApproveUserUploads || existingDoc?.status === "published" ? "published" : "pending";
  }
  const cleanAnswerUrl = parsed.answerUrl !== void 0 ? parsed.answerUrl.trim() || void 0 : existingSecrets?.answerUrl || existingDoc?.answerUrl || void 0;
  const cleanVideoUrl = parsed.videoUrl !== void 0 ? parsed.videoUrl.trim() || void 0 : existingSecrets?.videoUrl || existingDoc?.videoUrl || void 0;
  const cleanSubFiles = parsed.subFiles !== void 0 ? parsed.subFiles : existingSecrets?.subFiles || existingDoc?.subFiles || void 0;
  const cleanOriginalFileName = parsed.originalFileName?.trim() || existingSecrets?.originalFileName || existingDoc?.originalFileName || void 0;
  const authorRole = existingDoc?.authorRole && existingDoc.authorRole !== "seed" ? existingDoc.authorRole : isAdmin ? "admin" : "community";
  const authorName = existingDoc?.authorName && existingDoc.authorRole !== "seed" ? existingDoc.authorName : actor.displayName || actor.email?.split("@")[0] || (isAdmin ? "Ban Qu\u1EA3n Tr\u1ECB DkTEST" : "Th\xE0nh vi\xEAn DkTEST");
  const resolvedSpace = targetFolder ? targetFolder.space : isAdmin ? parsed.space || existingDoc?.space || "dktest_exclusive" : "community";
  const resolvedSourceKey = targetFolder?.sourceKey ? targetFolder.sourceKey : resolvedSpace === "dktest_exclusive" ? "dktest" : existingDoc?.sourceKey || "community";
  const cleanTopicKey = parsed.topicKey?.trim() || existingDoc?.topicKey || void 0;
  const fullDoc = {
    id: docId,
    title: parsed.title,
    description: parsed.description?.trim() || `T\xE0i li\u1EC7u ${parsed.title} \u0111\u01B0\u1EE3c chia s\u1EBB tr\xEAn Kho T\xE0i Li\u1EC7u DkTEST.`,
    grade: parsed.grade,
    subject: parsed.subject,
    category: parsed.category,
    fileFormat: parsed.fileFormat,
    folderId: requestedFolderId,
    space: resolvedSpace,
    sourceKey: resolvedSourceKey,
    ...cleanTopicKey ? { topicKey: cleanTopicKey } : {},
    ...cleanSubFiles && cleanSubFiles.length > 1 ? { subFileCount: cleanSubFiles.length } : {},
    ...parsed.pageCount ? { pageCount: parsed.pageCount } : existingDoc?.pageCount ? { pageCount: existingDoc.pageCount } : {},
    ...parsed.fileSizeBytes ? { fileSizeBytes: parsed.fileSizeBytes } : existingDoc?.fileSizeBytes ? { fileSizeBytes: existingDoc.fileSizeBytes } : {},
    coverImageUrl: parsed.coverImageUrl !== void 0 ? parsed.coverImageUrl : existingDoc?.coverImageUrl || null,
    ...parsed.previewImageUrls?.length ? { previewImageUrls: parsed.previewImageUrls } : existingDoc?.previewImageUrls?.length ? { previewImageUrls: existingDoc.previewImageUrls } : {},
    accessMode,
    priceVnd,
    previewPageCount: parsed.previewPageCount ?? existingDoc?.previewPageCount ?? 2,
    salesEnabled: parsed.salesEnabled ?? existingDoc?.salesEnabled ?? true,
    ...accessMode === "free" ? {
      fileUrl: resolvedFileUrl,
      ...cleanOriginalFileName ? { originalFileName: cleanOriginalFileName } : {},
      ...cleanAnswerUrl ? { answerUrl: cleanAnswerUrl } : {},
      ...cleanVideoUrl ? { videoUrl: cleanVideoUrl } : {},
      ...cleanSubFiles?.length ? { subFiles: cleanSubFiles } : {}
    } : {},
    authorUid: existingDoc?.authorUid || actor.uid,
    authorName,
    authorRole,
    ...existingDoc?.sourceName ? { sourceName: existingDoc.sourceName } : {},
    ...existingDoc?.sourcePostUrl ? { sourcePostUrl: existingDoc.sourcePostUrl } : {},
    status: nextStatus,
    isFeatured: isAdmin ? parsed.isFeatured ?? existingDoc?.isFeatured ?? false : existingDoc?.isFeatured ?? false,
    tags: parsed.tags || existingDoc?.tags || [],
    viewCount: existingDoc?.viewCount || 0,
    downloadCount: existingDoc?.downloadCount || 0,
    purchaseCount: existingDoc?.purchaseCount || 0,
    totalRevenueVnd: existingDoc?.totalRevenueVnd || 0,
    publishedAt: existingDoc?.publishedAt || now,
    createdAt: existingDoc?.createdAt || now,
    updatedAt: now
  };
  const publicDoc = sanitizePublicDocument(fullDoc);
  const secretsPayload = {
    docId,
    fileUrl: resolvedFileUrl,
    ...cleanOriginalFileName ? { originalFileName: cleanOriginalFileName } : {},
    ...cleanAnswerUrl ? { answerUrl: cleanAnswerUrl } : {},
    ...cleanVideoUrl ? { videoUrl: cleanVideoUrl } : {},
    ...cleanSubFiles?.length ? { subFiles: cleanSubFiles } : {},
    updatedAt: now
  };
  if (adminDb) {
    const batch = adminDb.batch();
    batch.set(adminDb.collection(DOCS_COLLECTION).doc(docId), publicDoc);
    batch.set(adminDb.collection(SECRETS_COLLECTION).doc(docId), secretsPayload);
    await batch.commit();
  } else {
    await setFirestoreRestDoc(DOCS_COLLECTION, docId, publicDoc);
    await setFirestoreRestDoc(SECRETS_COLLECTION, docId, secretsPayload);
  }
  invalidateDocumentLibraryCache();
  return publicDoc;
}
async function supplementLibraryDocument(actor, docId, rawInput) {
  const cleanId = String(docId || "").trim();
  if (!cleanId) throw new Error("M\xE3 t\xE0i li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7.");
  const parsed = supplementDocumentSchema.parse(rawInput || {});
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const settings = await getDocumentLibrarySettings();
  const existingDoc = await getDocumentByIdResolved(cleanId);
  if (!existingDoc) throw new Error("Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u c\u1EA7n b\u1ED5 sung.");
  if (!isAdmin && existingDoc.authorUid !== actor.uid) {
    throw new Error("B\u1EA1n ch\u1EC9 c\xF3 quy\u1EC1n b\u1ED5 sung n\u1ED9i dung v\xE0o t\xE0i li\u1EC7u do ch\xEDnh m\xECnh \u0111\u0103ng t\u1EA3i.");
  }
  const existingSecrets = await getDocumentSecrets(cleanId);
  const primaryFileUrl = existingSecrets?.fileUrl || existingDoc.fileUrl || "";
  if (!primaryFileUrl) {
    throw new Error("T\xE0i li\u1EC7u g\u1ED1c ch\u01B0a c\xF3 \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p h\u1EE3p l\u1EC7.");
  }
  let nextSubFiles = Array.isArray(existingSecrets?.subFiles) ? [...existingSecrets.subFiles] : Array.isArray(existingDoc.subFiles) ? [...existingDoc.subFiles] : [];
  if (parsed.replaceSubFiles !== void 0) {
    for (const sf of parsed.replaceSubFiles) {
      if (!/^https:\/\/res\.cloudinary\.com\//i.test(sf.url)) {
        await validateUrlForSsrf(sf.url);
      }
    }
    nextSubFiles = parsed.replaceSubFiles.map((sf) => ({
      name: sf.name,
      url: sf.url,
      fileFormat: sf.fileFormat,
      ...sf.folderPath?.trim() ? { folderPath: sf.folderPath.trim() } : {}
    }));
  }
  if (parsed.appendSubFiles && parsed.appendSubFiles.length > 0) {
    for (const sf of parsed.appendSubFiles) {
      if (!/^https:\/\/res\.cloudinary\.com\//i.test(sf.url)) {
        await validateUrlForSsrf(sf.url);
      }
    }
    if (nextSubFiles.length === 0) {
      nextSubFiles.push({
        name: existingSecrets?.originalFileName || existingDoc.originalFileName || `${existingDoc.title} (B\u1EA3n g\u1ED1c)`,
        url: primaryFileUrl,
        fileFormat: existingDoc.fileFormat || "pdf"
      });
    }
    for (const sf of parsed.appendSubFiles) {
      if (nextSubFiles.length >= 120) break;
      if (nextSubFiles.some((x) => x.url === sf.url)) continue;
      nextSubFiles.push({
        name: sf.name,
        url: sf.url,
        fileFormat: sf.fileFormat,
        ...sf.folderPath?.trim() ? { folderPath: sf.folderPath.trim() } : {}
      });
    }
  }
  const nextAnswerUrl = parsed.answerUrl !== void 0 ? parsed.answerUrl?.trim() || void 0 : existingSecrets?.answerUrl || existingDoc.answerUrl || void 0;
  if (nextAnswerUrl && !/^https:\/\/res\.cloudinary\.com\//i.test(nextAnswerUrl)) {
    await validateUrlForSsrf(nextAnswerUrl);
  }
  const nextVideoUrl = parsed.videoUrl !== void 0 ? parsed.videoUrl?.trim() || void 0 : existingSecrets?.videoUrl || existingDoc.videoUrl || void 0;
  let nextFolderId = existingDoc.folderId ?? null;
  let nextSpace = existingDoc.space;
  let nextSourceKey = existingDoc.sourceKey;
  if (parsed.folderId !== void 0) {
    const cleanFid = parsed.folderId?.trim() || null;
    if (cleanFid) {
      const targetFolder = await getFolderByIdResolved(cleanFid);
      if (!targetFolder || targetFolder.status === "hidden") {
        throw new Error("Th\u01B0 m\u1EE5c l\u01B0u tr\u1EEF kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB \u1EA9n.");
      }
      if (!isAdmin && targetFolder.ownerUid !== actor.uid) {
        throw new Error("B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 di chuy\u1EC3n t\xE0i li\u1EC7u v\xE0o th\u01B0 m\u1EE5c c\u1EE7a ch\xEDnh m\xECnh.");
      }
      nextFolderId = cleanFid;
      nextSpace = targetFolder.space;
      nextSourceKey = targetFolder.sourceKey || nextSourceKey;
    } else {
      nextFolderId = null;
    }
  }
  let nextStatus = existingDoc.status;
  if (parsed.status === "hidden") {
    nextStatus = "hidden";
  } else if (parsed.status === "published") {
    if (isAdmin) {
      nextStatus = "published";
    } else if (existingDoc.status === "rejected" && !settings.autoApproveUserUploads) {
      nextStatus = "pending";
    } else {
      nextStatus = settings.autoApproveUserUploads ? "published" : "pending";
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const resolvedPrimaryUrl = nextSubFiles[0]?.url || primaryFileUrl;
  const fullDoc = {
    ...existingDoc,
    folderId: nextFolderId,
    space: nextSpace,
    sourceKey: nextSourceKey,
    status: nextStatus,
    fileUrl: resolvedPrimaryUrl,
    ...existingSecrets?.originalFileName || existingDoc.originalFileName ? { originalFileName: existingSecrets?.originalFileName || existingDoc.originalFileName } : {},
    ...nextAnswerUrl ? { answerUrl: nextAnswerUrl } : {},
    ...nextVideoUrl ? { videoUrl: nextVideoUrl } : {},
    ...nextSubFiles.length > 0 ? { subFiles: nextSubFiles } : {},
    ...nextSubFiles.length > 1 ? { subFileCount: nextSubFiles.length } : {},
    updatedAt: now
  };
  if (!nextAnswerUrl) delete fullDoc.answerUrl;
  if (!nextVideoUrl) delete fullDoc.videoUrl;
  if (nextSubFiles.length <= 1) delete fullDoc.subFileCount;
  if (nextSubFiles.length === 0) delete fullDoc.subFiles;
  const publicDoc = sanitizePublicDocument(fullDoc);
  const secretsPayload = {
    docId: cleanId,
    fileUrl: resolvedPrimaryUrl,
    ...existingSecrets?.originalFileName || existingDoc.originalFileName ? { originalFileName: existingSecrets?.originalFileName || existingDoc.originalFileName } : {},
    ...nextAnswerUrl ? { answerUrl: nextAnswerUrl } : {},
    ...nextVideoUrl ? { videoUrl: nextVideoUrl } : {},
    ...nextSubFiles.length > 0 ? { subFiles: nextSubFiles } : {},
    updatedAt: now
  };
  if (adminDb) {
    const batch = adminDb.batch();
    batch.set(adminDb.collection(DOCS_COLLECTION).doc(cleanId), publicDoc);
    batch.set(adminDb.collection(SECRETS_COLLECTION).doc(cleanId), secretsPayload);
    await batch.commit();
  } else {
    await setFirestoreRestDoc(DOCS_COLLECTION, cleanId, publicDoc);
    await setFirestoreRestDoc(SECRETS_COLLECTION, cleanId, secretsPayload);
  }
  invalidateDocumentLibraryCache();
  return {
    document: publicDoc,
    subFiles: nextSubFiles,
    answerUrl: nextAnswerUrl,
    videoUrl: nextVideoUrl
  };
}
async function moveDocumentsToFolder(actor, params) {
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const cleanIds = [...new Set((params.docIds || []).map((x) => String(x || "").trim()).filter(Boolean))].slice(
    0,
    60
  );
  if (cleanIds.length === 0) {
    throw new Error("Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t 1 t\xE0i li\u1EC7u \u0111\u1EC3 di chuy\u1EC3n.");
  }
  const cleanFolderId = params.folderId?.trim() || null;
  let targetFolder = null;
  if (cleanFolderId) {
    targetFolder = await getFolderByIdResolved(cleanFolderId);
    if (!targetFolder || targetFolder.status === "hidden") {
      throw new Error("Th\u01B0 m\u1EE5c \u0111\xEDch kh\xF4ng t\u1ED3n t\u1EA1i.");
    }
    if (!isAdmin && targetFolder.ownerUid !== actor.uid) {
      throw new Error("B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 di chuy\u1EC3n t\xE0i li\u1EC7u v\xE0o th\u01B0 m\u1EE5c c\u1EE7a ch\xEDnh m\xECnh.");
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let movedCount = 0;
  for (const docId of cleanIds) {
    const doc = await getDocumentByIdResolved(docId);
    if (!doc) continue;
    if (!isAdmin && doc.authorUid !== actor.uid) {
      throw new Error(`B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n di chuy\u1EC3n t\xE0i li\u1EC7u "${doc.title}".`);
    }
    const nextSpace = targetFolder ? targetFolder.space : doc.authorRole === "admin" ? "dktest_exclusive" : "community";
    const nextSourceKey = targetFolder?.sourceKey ? targetFolder.sourceKey : nextSpace === "dktest_exclusive" ? "dktest" : "community";
    const updated = sanitizePublicDocument({
      ...doc,
      folderId: cleanFolderId,
      space: nextSpace,
      sourceKey: nextSourceKey,
      updatedAt: now
    });
    if (adminDb) {
      await adminDb.collection(DOCS_COLLECTION).doc(docId).set(updated, { merge: true });
    } else {
      await setFirestoreRestDoc(DOCS_COLLECTION, docId, updated);
    }
    movedCount++;
  }
  invalidateDocumentLibraryCache();
  return { movedCount };
}
async function deleteLibraryDocument(actor, docId) {
  const cleanId = String(docId || "").trim();
  if (!cleanId) throw new Error("M\xE3 t\xE0i li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7.");
  const isAdmin = actor.role === "admin" || actor.role === "super_admin";
  const existing = await getDocumentByIdResolved(cleanId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u.");
  if (!isAdmin && existing.authorUid !== actor.uid) {
    throw new Error("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a t\xE0i li\u1EC7u n\xE0y.");
  }
  const isSeed = Boolean(getSeedDocumentById(cleanId));
  if (isSeed && isAdmin) {
    const hiddenOverride = {
      ...existing,
      status: "hidden",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (adminDb) {
      await adminDb.collection(DOCS_COLLECTION).doc(cleanId).set(hiddenOverride, { merge: true });
    } else {
      await setFirestoreRestDoc(DOCS_COLLECTION, cleanId, hiddenOverride);
    }
    invalidateDocumentLibraryCache();
    return { deleted: true, hiddenSeed: true };
  }
  if (adminDb) {
    const batch = adminDb.batch();
    batch.delete(adminDb.collection(DOCS_COLLECTION).doc(cleanId));
    batch.delete(adminDb.collection(SECRETS_COLLECTION).doc(cleanId));
    await batch.commit();
  } else {
    await deleteFirestoreRestDoc(DOCS_COLLECTION, cleanId);
    await deleteFirestoreRestDoc(SECRETS_COLLECTION, cleanId).catch(() => {
    });
  }
  invalidateDocumentLibraryCache();
  return { deleted: true };
}
async function checkDocumentAccess(uid, docId, role = "student") {
  const doc = await getDocumentByIdResolved(docId);
  const isAdmin = role === "admin" || role === "super_admin";
  const isOwner = Boolean(uid && doc?.authorUid && doc.authorUid === uid);
  if (!doc || doc.status === "hidden" && !isAdmin && !isOwner) {
    throw new Error("T\xE0i li\u1EC7u kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB g\u1EE1.");
  }
  const priceVnd = doc.accessMode === "paid" ? sanitizeVnd(doc.priceVnd) : 0;
  const isFree = priceVnd <= 0;
  if (isFree || isAdmin || isOwner) {
    return {
      hasAccess: true,
      isFree,
      isOwner: isOwner || isAdmin,
      unlocked: !isFree,
      priceVnd,
      previewPageCount: doc.previewPageCount ?? 2,
      userBalanceVnd: 0,
      missingVnd: 0,
      canUnlock: true
    };
  }
  if (!uid) {
    return {
      hasAccess: false,
      isFree: false,
      isOwner: false,
      unlocked: false,
      priceVnd,
      previewPageCount: doc.previewPageCount ?? 2,
      userBalanceVnd: 0,
      missingVnd: priceVnd,
      canUnlock: false
    };
  }
  const entId = `${uid}_${docId}`;
  let entDoc = null;
  if (adminDb) {
    const snap = await adminDb.collection(ENTITLEMENTS_COLLECTION).doc(entId).get();
    if (snap.exists) entDoc = snap.data();
  } else {
    entDoc = await getFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId);
  }
  if (entDoc && entDoc.status === "active") {
    return {
      hasAccess: true,
      isFree: false,
      isOwner: false,
      unlocked: true,
      priceVnd,
      previewPageCount: doc.previewPageCount ?? 2,
      userBalanceVnd: 0,
      missingVnd: 0,
      canUnlock: true
    };
  }
  const wallet = await getOrCreateWallet(uid);
  const balance = sanitizeVnd(wallet.balanceVnd);
  const missingVnd = Math.max(0, priceVnd - balance);
  return {
    hasAccess: false,
    isFree: false,
    isOwner: false,
    unlocked: false,
    priceVnd,
    previewPageCount: doc.previewPageCount ?? 2,
    userBalanceVnd: balance,
    missingVnd,
    canUnlock: balance >= priceVnd && doc.salesEnabled !== false
  };
}
async function getAuthorizedDocumentContent(uid, docId, role = "student") {
  const doc = await getDocumentByIdResolved(docId);
  if (!doc || doc.status === "hidden") {
    throw new Error("T\xE0i li\u1EC7u kh\xF4ng t\u1ED3n t\u1EA1i.");
  }
  const access = await checkDocumentAccess(uid, docId, role);
  if (!access.hasAccess) {
    throw new Error(
      `T\xE0i li\u1EC7u tr\u1EA3 ph\xED (${access.priceVnd.toLocaleString("vi-VN")}\u0111). Vui l\xF2ng m\u1EDF kh\xF3a \u0111\u1EC3 \u0111\u1ECDc tr\u1ECDn b\u1ED9 v\xE0 t\u1EA3i PDF g\u1ED1c.`
    );
  }
  const secrets = await getDocumentSecrets(docId);
  const fileUrl = secrets?.fileUrl || doc.fileUrl || "";
  if (!fileUrl) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p g\u1ED1c c\u1EE7a t\xE0i li\u1EC7u n\xE0y.");
  }
  return {
    docId,
    hasFullAccess: true,
    isPreviewOnly: false,
    previewPageCount: doc.previewPageCount ?? 2,
    fileUrl,
    originalFileName: secrets?.originalFileName || doc.originalFileName,
    answerUrl: secrets?.answerUrl || doc.answerUrl,
    videoUrl: secrets?.videoUrl || doc.videoUrl,
    subFiles: secrets?.subFiles || doc.subFiles
  };
}
async function resolveBatchAuthorizedDocuments(uid, role = "student", docIds) {
  const cleanIds = [...new Set((docIds || []).map((x) => String(x || "").trim()).filter(Boolean))].slice(
    0,
    80
  );
  const isAdmin = role === "admin" || role === "super_admin";
  const unlockedSet = uid && !isAdmin ? new Set(await getMyUnlockedDocumentIds(uid)) : /* @__PURE__ */ new Set();
  const items = [];
  const skippedLockedTitles = [];
  for (const id of cleanIds) {
    const seedDoc = getSeedDocumentById(id);
    if (seedDoc && (!cachedLiveDocs || !cachedLiveDocs.items.some((x) => x.id === id))) {
      if (seedDoc.fileUrl) {
        items.push({
          docId: seedDoc.id,
          title: seedDoc.title,
          fileFormat: seedDoc.fileFormat,
          hasFullAccess: true,
          isPreviewOnly: false,
          previewPageCount: 0,
          fileUrl: seedDoc.fileUrl,
          originalFileName: seedDoc.originalFileName,
          answerUrl: seedDoc.answerUrl,
          videoUrl: seedDoc.videoUrl,
          subFiles: seedDoc.subFiles
        });
      }
      continue;
    }
    const doc = await getDocumentByIdResolved(id);
    if (!doc || doc.status === "hidden") continue;
    const priceVnd = doc.accessMode === "paid" ? sanitizeVnd(doc.priceVnd) : 0;
    const isFree = priceVnd <= 0;
    const isOwner = Boolean(uid && doc.authorUid && doc.authorUid === uid);
    const hasAccess = isFree || isAdmin || isOwner || unlockedSet.has(doc.id);
    if (!hasAccess) {
      skippedLockedTitles.push(doc.title);
      continue;
    }
    const secrets = isFree && doc.fileUrl ? null : await getDocumentSecrets(doc.id);
    const fileUrl = secrets?.fileUrl || doc.fileUrl || "";
    if (!fileUrl) continue;
    items.push({
      docId: doc.id,
      title: doc.title,
      fileFormat: doc.fileFormat,
      hasFullAccess: true,
      isPreviewOnly: false,
      previewPageCount: doc.previewPageCount ?? 2,
      fileUrl,
      originalFileName: secrets?.originalFileName || doc.originalFileName,
      answerUrl: secrets?.answerUrl || doc.answerUrl,
      videoUrl: secrets?.videoUrl || doc.videoUrl,
      subFiles: secrets?.subFiles || doc.subFiles
    });
  }
  return {
    items,
    skippedLockedCount: skippedLockedTitles.length,
    skippedLockedTitles
  };
}
async function unlockLibraryDocument(uid, docId, idempotencyKey, voucherCode) {
  if (!uid) throw new Error("Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 m\u1EDF kh\xF3a t\xE0i li\u1EC7u.");
  const doc = await getDocumentByIdResolved(docId);
  if (!doc || doc.status !== "published") {
    throw new Error("T\xE0i li\u1EC7u kh\xF4ng kh\u1EA3 d\u1EE5ng \u0111\u1EC3 m\u1EDF kh\xF3a.");
  }
  if (doc.salesEnabled === false) {
    throw new Error("T\xE0i li\u1EC7u n\xE0y hi\u1EC7n \u0111ang t\u1EA1m d\u1EEBng m\u1EDF kh\xF3a.");
  }
  const basePriceVnd = doc.accessMode === "paid" ? sanitizeVnd(doc.priceVnd) : 0;
  const entId = `${uid}_${docId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (basePriceVnd <= 0 || doc.authorUid === uid) {
    const freeEnt = {
      id: entId,
      uid,
      docId,
      docTitleSnapshot: doc.title,
      authorUid: doc.authorUid,
      pricePaidVnd: 0,
      creatorShareVnd: 0,
      platformFeeVnd: 0,
      status: "active",
      grantedBy: "wallet_purchase",
      createdAt: now
    };
    const wallet = await getOrCreateWallet(uid);
    return {
      alreadyUnlocked: true,
      newBalanceVnd: sanitizeVnd(wallet.balanceVnd),
      entitlement: freeEnt,
      discountVnd: 0,
      finalPriceVnd: 0
    };
  }
  let discountVnd = 0;
  let appliedVoucher = null;
  if (voucherCode && String(voucherCode).trim()) {
    const vRes = await validateVoucher({
      code: String(voucherCode).trim(),
      uid,
      context: "document_unlock",
      amountVnd: basePriceVnd
    });
    if (!vRes.valid || !vRes.voucher) {
      throw new Error(vRes.message || "M\xE3 voucher kh\xF4ng h\u1EE3p l\u1EC7 cho t\xE0i li\u1EC7u n\xE0y.");
    }
    discountVnd = sanitizeVnd(vRes.discountVnd || 0);
    appliedVoucher = vRes.voucher;
  }
  const finalPriceVnd = Math.max(0, basePriceVnd - discountVnd);
  const settings = await getDocumentLibrarySettings();
  const isCommunityCreator = doc.authorRole === "community" && Boolean(doc.authorUid) && doc.authorUid !== uid;
  const creatorShareVnd = isCommunityCreator && finalPriceVnd > 0 ? Math.floor(finalPriceVnd * settings.creatorRevenueSharePercent / 100) : 0;
  const platformFeeVnd = Math.max(0, finalPriceVnd - creatorShareVnd);
  await getOrCreateWallet(uid);
  if (isCommunityCreator && doc.authorUid) {
    await getOrCreateWallet(doc.authorUid).catch(() => {
    });
  }
  const txDebitId = `tx_doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const txCreditId = `tx_docrev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const usageId = `vuse_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (adminDb) {
    const txRes = await adminDb.runTransaction(async (transaction) => {
      const entRef = adminDb.collection(ENTITLEMENTS_COLLECTION).doc(entId);
      const buyerWalletRef = adminDb.collection("wallets").doc(uid);
      const docRef = adminDb.collection(DOCS_COLLECTION).doc(docId);
      const [entSnap, buyerSnap, docSnap] = await Promise.all([
        transaction.get(entRef),
        transaction.get(buyerWalletRef),
        transaction.get(docRef)
      ]);
      const buyerData = buyerSnap.data() || {};
      const buyerBalance2 = sanitizeVnd(buyerData.balanceVnd);
      if (entSnap.exists && entSnap.data()?.status === "active") {
        return {
          alreadyUnlocked: true,
          newBalanceVnd: buyerBalance2,
          entitlement: entSnap.data()
        };
      }
      if (buyerBalance2 < finalPriceVnd) {
        throw new Error(
          `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 (c\u1EA7n ${finalPriceVnd.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${buyerBalance2.toLocaleString("vi-VN")}\u0111). Vui l\xF2ng n\u1EA1p th\xEAm v\xE0o V\xED DkTEST!`
        );
      }
      let creatorSnap = null;
      const creatorWalletRef = isCommunityCreator && doc.authorUid && creatorShareVnd > 0 ? adminDb.collection("wallets").doc(doc.authorUid) : null;
      if (creatorWalletRef) {
        creatorSnap = await transaction.get(creatorWalletRef);
      }
      const newBuyerBalance2 = buyerBalance2 - finalPriceVnd;
      transaction.set(
        buyerWalletRef,
        {
          balanceVnd: newBuyerBalance2,
          totalSpentVnd: sanitizeVnd(buyerData.totalSpentVnd) + finalPriceVnd,
          updatedAt: now
        },
        { merge: true }
      );
      const debitTx = {
        id: txDebitId,
        uid,
        type: "document_unlock_debit",
        amountVnd: finalPriceVnd,
        balanceBeforeVnd: buyerBalance2,
        balanceAfterVnd: newBuyerBalance2,
        idempotencyKey: idempotencyKey || entId,
        actorUid: uid,
        actorName: buyerData.fullName || "H\u1ECDc sinh",
        note: `M\u1EDF kh\xF3a t\xE0i li\u1EC7u: "${doc.title}"${appliedVoucher ? ` (Voucher ${appliedVoucher.code} -${discountVnd.toLocaleString("vi-VN")}\u0111)` : ""}`,
        createdAt: now
      };
      transaction.set(adminDb.collection("wallet_transactions").doc(txDebitId), debitTx);
      if (creatorWalletRef && doc.authorUid && creatorShareVnd > 0) {
        const cData = creatorSnap?.exists ? creatorSnap.data() : {};
        const cBefore = sanitizeVnd(cData.balanceVnd);
        const cAfter = cBefore + creatorShareVnd;
        transaction.set(
          creatorWalletRef,
          {
            uid: doc.authorUid,
            balanceVnd: cAfter,
            totalCreditedVnd: sanitizeVnd(cData.totalCreditedVnd) + creatorShareVnd,
            updatedAt: now
          },
          { merge: true }
        );
        const creditTx = {
          id: txCreditId,
          uid: doc.authorUid,
          type: "document_revenue_credit",
          amountVnd: creatorShareVnd,
          balanceBeforeVnd: cBefore,
          balanceAfterVnd: cAfter,
          idempotencyKey: `rev_${entId}`,
          actorUid: "system",
          actorName: "Kho T\xE0i Li\u1EC7u DkTEST",
          note: `Doanh thu t\xE1c gi\u1EA3 (${settings.creatorRevenueSharePercent}%): T\xE0i li\u1EC7u "${doc.title}" \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a`,
          createdAt: now
        };
        transaction.set(adminDb.collection("wallet_transactions").doc(txCreditId), creditTx);
        const notifId = `notif_docrev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        transaction.set(adminDb.collection("notifications").doc(notifId), {
          id: notifId,
          userId: doc.authorUid,
          recipientUid: doc.authorUid,
          title: `\u{1F389} T\xE0i li\u1EC7u c\u1EE7a b\u1EA1n v\u1EEBa c\xF3 ng\u01B0\u1EDDi mua! (+${creatorShareVnd.toLocaleString("vi-VN")}\u0111)`,
          content: `B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c +${creatorShareVnd.toLocaleString("vi-VN")}\u0111 v\xE0o V\xED DkTEST t\u1EEB l\u01B0\u1EE3t m\u1EDF kh\xF3a t\xE0i li\u1EC7u "${doc.title}".`,
          type: "system",
          read: false,
          link: "/student/documents?tab=mine",
          createdAt: now
        });
      }
      const entDoc2 = {
        id: entId,
        uid,
        docId,
        docTitleSnapshot: doc.title,
        authorUid: doc.authorUid,
        pricePaidVnd: finalPriceVnd,
        creatorShareVnd,
        platformFeeVnd,
        status: "active",
        grantedBy: "wallet_purchase",
        transactionId: txDebitId,
        ...appliedVoucher ? { voucherCode: appliedVoucher.code } : {},
        createdAt: now
      };
      transaction.set(entRef, entDoc2);
      if (docSnap.exists) {
        const curPurchases = Number(docSnap.data()?.purchaseCount || 0);
        const curRev = Number(docSnap.data()?.totalRevenueVnd || 0);
        transaction.update(docRef, {
          purchaseCount: curPurchases + 1,
          totalRevenueVnd: curRev + finalPriceVnd,
          updatedAt: now
        });
      }
      if (appliedVoucher) {
        const vRef = adminDb.collection("vouchers").doc(appliedVoucher.id);
        transaction.set(
          vRef,
          { usedCount: (appliedVoucher.usedCount || 0) + 1, updatedAt: now },
          { merge: true }
        );
        const usageDoc = {
          id: usageId,
          voucherId: appliedVoucher.id,
          voucherCode: appliedVoucher.code,
          uid,
          studentName: buyerData.fullName || "",
          studentClass: buyerData.currentClass || "",
          type: appliedVoucher.type,
          discountVnd,
          usedAt: now,
          context: "exam_unlock",
          referenceId: docId
        };
        transaction.set(adminDb.collection("voucher_usages").doc(usageId), usageDoc);
      }
      return {
        alreadyUnlocked: false,
        newBalanceVnd: newBuyerBalance2,
        entitlement: entDoc2
      };
    });
    if (appliedVoucher) {
      invalidateVouchersCache();
      invalidateVoucherUsagesCache();
    }
    invalidateDocumentLibraryCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(uid);
    if (doc.authorUid) invalidateStudentDetailsCache(doc.authorUid);
    return {
      ...txRes,
      discountVnd,
      finalPriceVnd
    };
  }
  const existingEnt = await getFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId);
  const buyerWallet = await getOrCreateWallet(uid);
  const buyerBalance = sanitizeVnd(buyerWallet.balanceVnd);
  if (existingEnt && existingEnt.status === "active") {
    return {
      alreadyUnlocked: true,
      newBalanceVnd: buyerBalance,
      entitlement: existingEnt,
      discountVnd: 0,
      finalPriceVnd
    };
  }
  if (buyerBalance < finalPriceVnd) {
    throw new Error(
      `S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7 (c\u1EA7n ${finalPriceVnd.toLocaleString("vi-VN")}\u0111, hi\u1EC7n c\xF3 ${buyerBalance.toLocaleString("vi-VN")}\u0111).`
    );
  }
  const newBuyerBalance = buyerBalance - finalPriceVnd;
  await setFirestoreRestDoc("wallets", uid, {
    ...buyerWallet,
    balanceVnd: newBuyerBalance,
    totalSpentVnd: sanitizeVnd(buyerWallet.totalSpentVnd) + finalPriceVnd,
    updatedAt: now
  });
  await setFirestoreRestDoc("wallet_transactions", txDebitId, {
    id: txDebitId,
    uid,
    type: "document_unlock_debit",
    amountVnd: finalPriceVnd,
    balanceBeforeVnd: buyerBalance,
    balanceAfterVnd: newBuyerBalance,
    idempotencyKey: idempotencyKey || entId,
    actorUid: uid,
    actorName: buyerWallet.fullName || "H\u1ECDc sinh",
    note: `M\u1EDF kh\xF3a t\xE0i li\u1EC7u: "${doc.title}"`,
    createdAt: now
  });
  if (isCommunityCreator && doc.authorUid && creatorShareVnd > 0) {
    const cWallet = await getOrCreateWallet(doc.authorUid);
    const cBefore = sanitizeVnd(cWallet.balanceVnd);
    await setFirestoreRestDoc("wallets", doc.authorUid, {
      ...cWallet,
      balanceVnd: cBefore + creatorShareVnd,
      totalCreditedVnd: sanitizeVnd(cWallet.totalCreditedVnd) + creatorShareVnd,
      updatedAt: now
    });
  }
  const entDoc = {
    id: entId,
    uid,
    docId,
    docTitleSnapshot: doc.title,
    authorUid: doc.authorUid,
    pricePaidVnd: finalPriceVnd,
    creatorShareVnd,
    platformFeeVnd,
    status: "active",
    grantedBy: "wallet_purchase",
    transactionId: txDebitId,
    createdAt: now
  };
  await setFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId, entDoc);
  invalidateDocumentLibraryCache();
  return {
    alreadyUnlocked: false,
    newBalanceVnd: newBuyerBalance,
    entitlement: entDoc,
    discountVnd,
    finalPriceVnd
  };
}
var ALLOWED_DOC_PROXY_HOST_PATTERNS = [
  /^res\.cloudinary\.com$/i,
  /^drive\.google\.com$/i,
  /^drive\.usercontent\.google\.com$/i,
  /^docs\.google\.com$/i,
  /\.googleusercontent\.com$/i,
  /^(?:www\.)?nganhangdethi\.org$/i,
  /^(?:www\.)?tailieuonthi\.edu\.vn$/i,
  /^(?:www\.)?tailieuonthi\.org$/i,
  /^(?:www\.)?mathvn\.com$/i,
  /^thpt\.math\.vn$/i,
  /\.blogspot\.com$/i
];
function isAllowedDocProxyHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return ALLOWED_DOC_PROXY_HOST_PATTERNS.some((re) => re.test(h));
}
function extractDriveIdServer(rawUrl) {
  const fileMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i);
  if (fileMatch) return fileMatch[1];
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.includes("drive.google.com") || parsed.hostname.includes("docs.google.com") || parsed.hostname.includes("drive.usercontent.google.com")) {
      const id = parsed.searchParams.get("id");
      if (id && /^[a-zA-Z0-9_-]{15,}$/.test(id)) return id;
    }
  } catch {
  }
  return null;
}
async function probeLegacyCloudinaryPagesServer(rawUrl) {
  const clean = String(rawUrl || "").trim().split(/[?#]/)[0];
  const match = clean.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[^/]+\/)*(v\d+\/.+)\.pdf$/i
  );
  if (!match) return 1;
  const probeUrl = `${match[1]}pg_99999,w_120,f_jpg/${match[2]}.jpg`;
  await validateUrlForSsrf(probeUrl);
  const res = await fetch(probeUrl, { signal: AbortSignal.timeout(1e4) });
  if (res.ok) return 99999;
  const cldErr = res.headers.get("x-cld-error") || "";
  const m = cldErr.match(/only has\s+(\d+)\s+pages?/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}
async function fetchProxiedPdfBuffer(rawUrl) {
  const clean = String(rawUrl || "").trim();
  const { url: validatedUrl } = await validateUrlForSsrf(clean);
  if (!isAllowedDocProxyHost(validatedUrl.hostname)) {
    throw new Error(
      `T\xEAn mi\u1EC1n l\u01B0u tr\u1EEF "${validatedUrl.hostname}" kh\xF4ng n\u1EB1m trong danh s\xE1ch cho ph\xE9p proxy.`
    );
  }
  const driveId = extractDriveIdServer(clean);
  const targetFetchUrl = driveId ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t` : clean;
  if (targetFetchUrl !== clean) {
    await validateUrlForSsrf(targetFetchUrl);
  }
  const upstream = await fetch(targetFetchUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 DkTEST-PDF-Reader/2.1",
      Accept: "application/pdf,application/octet-stream,*/*"
    },
    signal: AbortSignal.timeout(25e3)
  });
  if (!upstream.ok) {
    throw new Error(`Kho l\u01B0u tr\u1EEF ph\u1EA3n h\u1ED3i HTTP ${upstream.status}.`);
  }
  const contentType = upstream.headers.get("content-type") || "application/pdf";
  if (/text\/html/i.test(contentType)) {
    throw new Error("T\u1EC7p tr\xEAn kho l\u01B0u tr\u1EEF b\xEAn ngo\xE0i y\xEAu c\u1EA7u x\xE1c nh\u1EADn tr\xECnh duy\u1EC7t ho\u1EB7c l\xE0 th\u01B0 m\u1EE5c.");
  }
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > MAX_PROXY_BYTES) {
    const err = new Error(
      "T\u1EC7p v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n \u0111\u1ECDc tr\u1EF1c ti\u1EBFp 44MB, chuy\u1EC3n sang ch\u1EBF \u0111\u1ED9 xem nh\xFAng."
    );
    err.statusCode = 413;
    throw err;
  }
  const reader = upstream.body?.getReader();
  if (!reader) {
    const ab = await upstream.arrayBuffer();
    if (ab.byteLength > MAX_PROXY_BYTES) {
      const err = new Error("T\u1EC7p v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n \u0111\u1ECDc tr\u1EF1c ti\u1EBFp 44MB.");
      err.statusCode = 413;
      throw err;
    }
    return {
      buffer: Buffer.from(ab),
      contentType
    };
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_PROXY_BYTES) {
        await reader.cancel().catch(() => {
        });
        const err = new Error("T\u1EC7p v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n \u0111\u1ECDc tr\u1EF1c ti\u1EBFp 44MB.");
        err.statusCode = 413;
        throw err;
      }
      chunks.push(Buffer.from(value));
    }
  }
  return {
    buffer: Buffer.concat(chunks, total),
    contentType
  };
}

// server/routes/documentLibraryRoutes.ts
var documentLibraryRouter = Router3();
async function extractOptionalAuth(req) {
  if (req.user?.uid) {
    return { uid: req.user.uid, role: req.user.role || "student" };
  }
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
  if (token && !/^(student_|dk_admin_)/.test(token) && adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return { uid: decoded.uid, role: decoded.role || "student" };
    } catch {
    }
  }
  return { uid: null, role: "student" };
}
documentLibraryRouter.get("/live", async (_req, res) => {
  try {
    const [items, folders, settings] = await Promise.all([
      getLiveLibraryDocuments({ includeNonPublished: false }),
      getLiveLibraryFolders({ includeHidden: true }),
      getDocumentLibrarySettings()
    ]);
    return res.json({
      success: true,
      items,
      folders,
      settings: {
        autoApproveUserUploads: settings.autoApproveUserUploads,
        creatorRevenueSharePercent: settings.creatorRevenueSharePercent,
        maxUserPriceVnd: settings.maxUserPriceVnd
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: "documents_live_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch t\xE0i li\u1EC7u m\u1EDBi."
    });
  }
});
documentLibraryRouter.get("/pdf-proxy", async (req, res) => {
  try {
    const rawUrl = String(req.query?.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ error: "missing_url", message: "Thi\u1EBFu \u0111\u01B0\u1EDDng d\u1EABn t\u1EC7p." });
    }
    if (req.query?.action === "probe-pages") {
      const pageCount = await probeLegacyCloudinaryPagesServer(rawUrl);
      return res.json({ success: true, pageCount });
    }
    const { buffer, contentType } = await fetchProxiedPdfBuffer(rawUrl);
    const isDownload = req.query?.download === "1" || req.query?.download === "true";
    const rawFileName = String(req.query?.filename || "Tai_lieu_DkTEST.pdf").replace(/["\r\n]/g, "").trim();
    const asciiFallback = rawFileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/[^a-zA-Z0-9._-]+/g, "_");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType || "application/pdf");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${asciiFallback || "document.pdf"}"; filename*=UTF-8''${encodeURIComponent(rawFileName || "Tai_lieu_DkTEST.pdf")}`
    );
    return res.status(200).send(buffer);
  } catch (err) {
    const status = err?.statusCode === 413 ? 413 : 400;
    return res.status(status).json({
      error: "pdf_proxy_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 truy\u1EC1n t\u1EA3i t\u1EC7p t\xE0i li\u1EC7u n\xE0y."
    });
  }
});
documentLibraryRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const [uploaded, folders, unlockedIds, settings] = await Promise.all([
      getMyUploadedDocuments(uid),
      getMyLibraryFolders(uid),
      getMyUnlockedDocumentIds(uid),
      getDocumentLibrarySettings()
    ]);
    return res.json({
      success: true,
      uploaded,
      folders,
      unlockedIds,
      settings
    });
  } catch (err) {
    return res.status(500).json({
      error: "documents_me_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u t\xE0i li\u1EC7u c\xE1 nh\xE2n."
    });
  }
});
documentLibraryRouter.get("/folders/:folderId", async (req, res) => {
  try {
    const folder = await getFolderByIdResolved(req.params.folderId);
    if (!folder || folder.status === "hidden") {
      return res.status(404).json({ error: "not_found", message: "Kh\xF4ng t\xECm th\u1EA5y th\u01B0 m\u1EE5c." });
    }
    return res.json({ success: true, folder });
  } catch (err) {
    return res.status(400).json({
      error: "folder_get_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 t\u1EA3i th\xF4ng tin th\u01B0 m\u1EE5c."
    });
  }
});
documentLibraryRouter.post("/folders", requireAuth, async (req, res) => {
  try {
    const folder = await createOrUpdateLibraryFolder(req.user, req.body || {});
    return res.status(201).json({
      success: true,
      folder,
      message: "\u0110\xE3 t\u1EA1o th\u01B0 m\u1EE5c m\u1EDBi th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 t\u1EA1o th\u01B0 m\u1EE5c.";
    return res.status(400).json({ error: "folder_create_error", message: msg });
  }
});
documentLibraryRouter.patch(
  "/folders/:folderId",
  requireAuth,
  async (req, res) => {
    try {
      const folder = await createOrUpdateLibraryFolder(req.user, {
        ...req.body || {},
        id: req.params.folderId
      });
      return res.json({
        success: true,
        folder,
        message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin th\u01B0 m\u1EE5c."
      });
    } catch (err) {
      const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt th\u01B0 m\u1EE5c.";
      return res.status(400).json({ error: "folder_update_error", message: msg });
    }
  }
);
documentLibraryRouter.delete(
  "/folders/:folderId",
  requireAuth,
  async (req, res) => {
    try {
      const result = await deleteLibraryFolder(req.user, req.params.folderId);
      return res.json({
        success: true,
        ...result,
        message: "\u0110\xE3 x\xF3a th\u01B0 m\u1EE5c th\xE0nh c\xF4ng."
      });
    } catch (err) {
      return res.status(400).json({
        error: "folder_delete_error",
        message: err?.message || "Kh\xF4ng th\u1EC3 x\xF3a th\u01B0 m\u1EE5c."
      });
    }
  }
);
documentLibraryRouter.post(
  "/bulk-move",
  requireAuth,
  async (req, res) => {
    try {
      const { docIds, folderId } = req.body || {};
      const result = await moveDocumentsToFolder(req.user, {
        docIds: Array.isArray(docIds) ? docIds : [],
        folderId: folderId ? String(folderId) : null
      });
      return res.json({
        success: true,
        ...result,
        message: `\u0110\xE3 di chuy\u1EC3n ${result.movedCount} t\xE0i li\u1EC7u sang th\u01B0 m\u1EE5c \u0111\xEDch.`
      });
    } catch (err) {
      return res.status(400).json({
        error: "bulk_move_error",
        message: err?.message || "Kh\xF4ng th\u1EC3 di chuy\u1EC3n t\xE0i li\u1EC7u."
      });
    }
  }
);
documentLibraryRouter.post("/batch-resolve", async (req, res) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const docIds = Array.isArray(req.body?.docIds) ? req.body.docIds : [];
    const resolved = await resolveBatchAuthorizedDocuments(uid, role, docIds);
    return res.json({
      success: true,
      ...resolved
    });
  } catch (err) {
    return res.status(400).json({
      error: "batch_resolve_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 chu\u1EA9n b\u1ECB danh s\xE1ch t\u1EA3i h\xE0ng lo\u1EA1t."
    });
  }
});
documentLibraryRouter.post("/", requireAuth, async (req, res) => {
  try {
    const created = await createOrUpdateLibraryDocument(req.user, req.body || {});
    return res.status(201).json({
      success: true,
      document: created,
      message: created.status === "published" ? "\u0110\u0103ng t\u1EA3i t\xE0i li\u1EC7u l\xEAn Kho T\xE0i Li\u1EC7u DkTEST th\xE0nh c\xF4ng!" : "\u0110\xE3 g\u1EEDi t\xE0i li\u1EC7u! Qu\u1EA3n tr\u1ECB vi\xEAn s\u1EBD ki\u1EC3m duy\u1EC7t v\xE0 xu\u1EA5t b\u1EA3n s\u1EDBm nh\u1EA5t."
    });
  } catch (err) {
    const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 \u0111\u0103ng t\xE0i li\u1EC7u.";
    return res.status(400).json({ error: "document_create_error", message: msg });
  }
});
documentLibraryRouter.patch(
  "/:docId",
  requireAuth,
  async (req, res) => {
    try {
      const updated = await createOrUpdateLibraryDocument(req.user, {
        ...req.body || {},
        id: req.params.docId
      });
      return res.json({
        success: true,
        document: updated,
        message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin t\xE0i li\u1EC7u."
      });
    } catch (err) {
      const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt t\xE0i li\u1EC7u.";
      return res.status(400).json({ error: "document_update_error", message: msg });
    }
  }
);
documentLibraryRouter.post(
  "/:docId/supplement",
  requireAuth,
  async (req, res) => {
    try {
      const result = await supplementLibraryDocument(req.user, req.params.docId, req.body || {});
      return res.json({
        success: true,
        ...result,
        message: "\u0110\xE3 c\u1EADp nh\u1EADt & b\u1ED5 sung t\u1EC7p cho t\xE0i li\u1EC7u th\xE0nh c\xF4ng!"
      });
    } catch (err) {
      const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 b\u1ED5 sung t\xE0i li\u1EC7u.";
      return res.status(400).json({ error: "document_supplement_error", message: msg });
    }
  }
);
documentLibraryRouter.delete(
  "/:docId",
  requireAuth,
  async (req, res) => {
    try {
      const result = await deleteLibraryDocument(req.user, req.params.docId);
      return res.json({
        success: true,
        ...result,
        message: "\u0110\xE3 x\xF3a t\xE0i li\u1EC7u kh\u1ECFi h\u1EC7 th\u1ED1ng."
      });
    } catch (err) {
      return res.status(400).json({
        error: "document_delete_error",
        message: err?.message || "Kh\xF4ng th\u1EC3 x\xF3a t\xE0i li\u1EC7u."
      });
    }
  }
);
documentLibraryRouter.get("/:docId", async (req, res) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const doc = await getDocumentByIdResolved(req.params.docId);
    const isPrivileged = Boolean(
      uid && doc?.authorUid && doc.authorUid === uid || role === "admin" || role === "super_admin"
    );
    if (!doc || doc.status === "hidden" && !isPrivileged) {
      return res.status(404).json({ error: "not_found", message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u." });
    }
    return res.json({ success: true, document: doc });
  } catch (err) {
    return res.status(400).json({
      error: "document_get_error",
      message: err?.message || "L\u1ED7i t\u1EA3i th\xF4ng tin t\xE0i li\u1EC7u."
    });
  }
});
documentLibraryRouter.get("/:docId/access", async (req, res) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const access = await checkDocumentAccess(uid, req.params.docId, role);
    return res.json({ success: true, access });
  } catch (err) {
    return res.status(400).json({
      error: "document_access_error",
      message: err?.message || "Kh\xF4ng ki\u1EC3m tra \u0111\u01B0\u1EE3c quy\u1EC1n truy c\u1EADp t\xE0i li\u1EC7u."
    });
  }
});
documentLibraryRouter.get("/:docId/content", async (req, res) => {
  try {
    const { uid, role } = await extractOptionalAuth(req);
    const doc = await getDocumentByIdResolved(req.params.docId);
    const isPrivileged = Boolean(
      uid && doc?.authorUid && doc.authorUid === uid || role === "admin" || role === "super_admin"
    );
    if (!doc || doc.status === "hidden" && !isPrivileged) {
      return res.status(404).json({ error: "not_found", message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u." });
    }
    if (doc.accessMode === "paid" && doc.priceVnd > 0 && !uid) {
      return requireAuth(req, res, async () => {
        try {
          const content2 = await getAuthorizedDocumentContent(
            req.user.uid,
            req.params.docId,
            req.user.role
          );
          return res.json({ success: true, content: content2 });
        } catch (innerErr) {
          return res.status(403).json({
            error: "document_locked",
            message: innerErr?.message || "T\xE0i li\u1EC7u tr\u1EA3 ph\xED ch\u01B0a \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a."
          });
        }
      });
    }
    const content = await getAuthorizedDocumentContent(uid, req.params.docId, role);
    return res.json({ success: true, content });
  } catch (err) {
    const msg = err?.message || "Kh\xF4ng th\u1EC3 m\u1EDF n\u1ED9i dung t\xE0i li\u1EC7u.";
    const status = msg.includes("tr\u1EA3 ph\xED") ? 403 : 400;
    return res.status(status).json({ error: "document_content_error", message: msg });
  }
});
documentLibraryRouter.post(
  "/:docId/unlock",
  requireAuth,
  async (req, res) => {
    try {
      const uid = req.user.uid;
      const { idempotencyKey, voucherCode } = req.body || {};
      const result = await unlockLibraryDocument(uid, req.params.docId, idempotencyKey, voucherCode);
      return res.json({
        success: true,
        ...result,
        message: result.alreadyUnlocked ? "T\xE0i li\u1EC7u n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c m\u1EDF kh\xF3a tr\u01B0\u1EDBc \u0111\xF3." : "M\u1EDF kh\xF3a t\xE0i li\u1EC7u v\u0129nh vi\u1EC5n th\xE0nh c\xF4ng! B\u1EA1n c\xF3 th\u1EC3 \u0111\u1ECDc v\xE0 t\u1EA3i PDF ngay."
      });
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes("S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7")) {
        return res.status(402).json({ error: "insufficient_balance", message: msg });
      }
      return res.status(400).json({ error: "document_unlock_error", message: msg });
    }
  }
);

// server/routes/walletRoutes.ts
var walletRouter = Router4();
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
walletRouter.use("/ai-shop", aiShopStudentRouter);
walletRouter.use("/minigames", minigameStudentRouter);
walletRouter.use("/documents", documentLibraryRouter);
walletRouter.get("/notifications/feed", async (req, res) => {
  try {
    let uid = null;
    const authHeader = String(req.headers.authorization || "");
    const bearer = /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1];
    if (bearer && !/^(student_|dk_admin_)/.test(bearer)) {
      try {
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(bearer);
          uid = decoded.uid;
        }
      } catch {
      }
    }
    const sinceMs = Number(req.query.since) || 0;
    const limitCount = Number(req.query.limit) || 15;
    const notifications = await fetchNotificationFeed({ uid, sinceMs, limitCount });
    return res.json({ success: true, serverTimeMs: Date.now(), notifications });
  } catch (err) {
    return res.status(500).json({ error: "notif_feed_error", message: err?.message || "L\u1ED7i t\u1EA3i th\xF4ng b\xE1o." });
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
