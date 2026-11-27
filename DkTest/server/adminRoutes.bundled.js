var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/routes/adminRoutes.ts
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
async function queryOrderedFirestoreRestDocs(collectionName, options) {
  const safeLimit = Math.min(Math.max(options.limitCount || 5, 1), 100);
  const apiKey = getFirebaseApiKey();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const structuredQuery = {
    from: [{ collectionId: collectionName }],
    orderBy: [
      {
        field: { fieldPath: options.orderByField },
        direction: options.direction || "DESCENDING"
      }
    ],
    limit: safeLimit
  };
  if (options.whereField && Array.isArray(options.inValues) && options.inValues.length > 0) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: options.whereField },
        op: options.inValues.length === 1 ? "EQUAL" : "IN",
        value: options.inValues.length === 1 ? encodeFirestoreValue(options.inValues[0]) : { arrayValue: { values: options.inValues.map(encodeFirestoreValue) } }
      }
    };
  } else if (options.whereField && options.equalValue !== void 0) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: options.whereField },
        op: "EQUAL",
        value: encodeFirestoreValue(options.equalValue)
      }
    };
  }
  if (options.startAfterValue !== void 0 && options.startAfterValue !== null && options.startAfterValue !== "") {
    structuredQuery.startAt = {
      values: [encodeFirestoreValue(options.startAfterValue)],
      before: false
    };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery })
    });
    if (res.ok) {
      const raw = await res.json();
      const docs = (Array.isArray(raw) ? raw : []).filter((row) => row && row.document).map((row) => decodeFirestoreDocument(row.document)).filter(Boolean);
      return { docs, usedFallbackScan: false };
    }
    if (res.status === 400 && structuredQuery.where) {
      const fallbackQuery = {
        from: [{ collectionId: collectionName }],
        orderBy: structuredQuery.orderBy,
        limit: Math.min(safeLimit * 5, 25)
      };
      if (structuredQuery.startAt) fallbackQuery.startAt = structuredQuery.startAt;
      const res2 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredQuery: fallbackQuery })
      });
      if (res2.ok) {
        const raw2 = await res2.json();
        const docs2 = (Array.isArray(raw2) ? raw2 : []).filter((row) => row && row.document).map((row) => decodeFirestoreDocument(row.document)).filter(Boolean);
        return { docs: docs2, usedFallbackScan: true };
      }
    }
    return { docs: [], usedFallbackScan: true };
  } catch {
    return { docs: [], usedFallbackScan: true };
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
async function requireAdmin(req, res, next) {
  const check = () => ["admin", "super_admin"].includes(req.user?.role || "") ? next() : res.status(403).json({ error: "permission_denied", message: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n qu\u1EA3n tr\u1ECB." });
  return req.user ? check() : requireAuth(req, res, check);
}
async function requireSuperAdmin(req, res, next) {
  const check = () => req.user?.role === "super_admin" ? next() : res.status(403).json({ error: "permission_denied", message: "Ch\u1EC9 Super Admin c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y." });
  return req.user ? check() : requireAuth(req, res, check);
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
async function getVouchersList(forceRefresh = false) {
  if (!forceRefresh && cachedVouchersList && Date.now() - cachedVouchersList.timestamp < VOUCHERS_TTL_MS) {
    return cachedVouchersList.data;
  }
  let list = [];
  if (adminDb) {
    try {
      const snap = await adminDb.collection("vouchers").orderBy("createdAt", "desc").get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      const snap = await adminDb.collection("vouchers").get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
  } else {
    const docs = await getFirestoreRestDocs("vouchers", 100, true);
    list = (docs || []).map((d) => ({ id: d.id, ...d }));
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }
  cachedVouchersList = { data: list, timestamp: Date.now() };
  return list;
}
async function createVoucher(data) {
  const code = normalizeCode(data.code || "");
  if (!code || code.length < 3) {
    throw new Error("M\xE3 voucher ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 3 k\xFD t\u1EF1 (ch\u1EEF ho\u1EB7c s\u1ED1).");
  }
  const existing = await getVoucherByCode(code);
  if (existing) {
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
    description: data.description?.trim() || void 0,
    createdAt: now,
    updatedAt: now
  };
  if (adminDb) {
    await adminDb.collection("vouchers").doc(id).set(voucher);
  } else {
    await setFirestoreRestDoc("vouchers", id, voucher);
  }
  invalidateVouchersCache();
  return voucher;
}
async function updateVoucher(id, data) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updates = {
    ...data,
    updatedAt: now
  };
  if (data.code) {
    updates.code = normalizeCode(data.code);
  }
  let updatedVoucher;
  if (adminDb) {
    const docRef = adminDb.collection("vouchers").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error("Kh\xF4ng t\xECm th\u1EA5y voucher y\xEAu c\u1EA7u.");
    }
    await docRef.set(updates, { merge: true });
    const updatedSnap = await docRef.get();
    updatedVoucher = { id, ...updatedSnap.data() };
  } else {
    const current = await getFirestoreRestDoc("vouchers", id, false);
    if (!current) {
      throw new Error("Kh\xF4ng t\xECm th\u1EA5y voucher y\xEAu c\u1EA7u.");
    }
    const merged = { ...current, ...updates };
    await setFirestoreRestDoc("vouchers", id, merged);
    updatedVoucher = merged;
  }
  invalidateVouchersCache();
  return updatedVoucher;
}
async function deleteVoucher(id) {
  if (adminDb) {
    await adminDb.collection("vouchers").doc(id).delete();
  } else {
    await deleteFirestoreRestDoc("vouchers", id);
  }
  invalidateVouchersCache();
  invalidateVoucherUsagesCache();
}
async function getVoucherUsagesList(voucherId, forceRefresh = false) {
  const cacheKey = voucherId || "__all__";
  const cached = voucherUsagesCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < USAGES_TTL_MS) {
    return cached.data;
  }
  let list = [];
  if (adminDb) {
    try {
      let queryRef = adminDb.collection("voucher_usages");
      if (voucherId) {
        queryRef = queryRef.where("voucherId", "==", voucherId);
      }
      const snap = await queryRef.limit(200).get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("[voucherService] adminDb getVoucherUsagesList query error, fallback without where:", err);
      try {
        const snap = await adminDb.collection("voucher_usages").limit(200).get();
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (voucherId) {
          list = list.filter((u) => u.voucherId === voucherId || u.code === voucherId);
        }
      } catch (_) {
      }
    }
  } else {
    let docs;
    if (voucherId) {
      docs = await queryFirestoreRestDocs("voucher_usages", "voucherId", voucherId, 50);
    } else {
      docs = await getFirestoreRestDocs("voucher_usages", 50, true);
    }
    list = (docs || []).map((d) => ({ id: d.id, ...d }));
    if (voucherId) {
      list = list.filter((u) => u.voucherId === voucherId || u.code === voucherId);
    }
  }
  list.sort((a, b) => {
    const timeA = new Date(a.usedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.usedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  voucherUsagesCache.set(cacheKey, { data: list, timestamp: Date.now() });
  return list;
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
      invalidateWalletOverviewCache();
      invalidateDebtSummariesCache();
      invalidateDepositRequestsCache();
      invalidateStudentDetailsCache(reqData2.uid);
      updateWalletOverviewAggregates({
        deltaPendingRequestsCount: -1,
        deltaPendingRequestsTotalVnd: -amount2,
        deltaVirtualBalanceVnd: amount2,
        deltaConfirmedCreditedVnd: amount2
      }).catch(() => {
      });
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
  invalidateWalletOverviewCache();
  invalidateDebtSummariesCache();
  invalidateDepositRequestsCache();
  invalidateStudentDetailsCache(reqData.uid);
  updateWalletOverviewAggregates({
    deltaPendingRequestsCount: -1,
    deltaPendingRequestsTotalVnd: -amount,
    deltaVirtualBalanceVnd: amount,
    deltaConfirmedCreditedVnd: amount
  }).catch(() => {
  });
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
    invalidateWalletOverviewCache();
    invalidateDepositRequestsCache();
    invalidateStudentDetailsCache(data2.uid);
    updateWalletOverviewAggregates({
      deltaPendingRequestsCount: -1,
      deltaPendingRequestsTotalVnd: -sanitizeVnd(data2.amountVnd)
    }).catch(() => {
    });
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
  invalidateWalletOverviewCache();
  invalidateDepositRequestsCache();
  invalidateStudentDetailsCache(data.uid);
  updateWalletOverviewAggregates({
    deltaPendingRequestsCount: -1,
    deltaPendingRequestsTotalVnd: -sanitizeVnd(data.amountVnd)
  }).catch(() => {
  });
  return updated;
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
      const tA = parseTimestampMs(a.data().createdAt);
      const tB = parseTimestampMs(b.data().createdAt);
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
      type: "cash_collection",
      amountVnd: 0,
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
    invalidateDebtSummariesCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(studentUid);
    updateWalletOverviewAggregates({
      deltaOutstandingDebtVnd: -amount,
      ...data.creditToWallet ? { deltaVirtualBalanceVnd: amount, deltaConfirmedCreditedVnd: amount } : {}
    }).catch(() => {
    });
    return { success: true, debtRecordId: recordId, newBalanceVnd: newBal2 };
  }
  const allDebts = await queryFirestoreRestDocs("debt_records", "uid", studentUid, 50);
  const studentDebts = allDebts.filter((d) => d.status === "unpaid" || d.status === "partial");
  studentDebts.sort((a, b) => parseTimestampMs(a.createdAt) - parseTimestampMs(b.createdAt));
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
    type: "cash_collection",
    amountVnd: 0,
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
  invalidateDebtSummariesCache();
  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(studentUid);
  updateWalletOverviewAggregates({
    deltaOutstandingDebtVnd: -amount,
    ...data.creditToWallet ? { deltaVirtualBalanceVnd: amount, deltaConfirmedCreditedVnd: amount } : {}
  }).catch(() => {
  });
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
  invalidateDebtSummariesCache();
  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(studentUid);
  updateWalletOverviewAggregates({
    deltaOutstandingDebtVnd: amount * (data.type === "increase" ? 1 : -1)
  }).catch(() => {
  });
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
  invalidateStudentDetailsCache(studentUid);
  invalidateExamAccessCache(studentUid, examId);
  return { success: true, entitlement };
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
async function getWalletOverview(forceRefresh = false) {
  if (!forceRefresh && walletOverviewCache && Date.now() - walletOverviewCache.timestamp < WALLET_OVERVIEW_TTL_MS) {
    return walletOverviewCache.data;
  }
  if (!forceRefresh) {
    try {
      let overviewDoc = null;
      if (adminDb) {
        const snap = await adminDb.collection("system_stats").doc("wallet_overview").get();
        if (snap.exists) {
          overviewDoc = snap.data();
          console.log(`[Server Firestore READ_DOC: 1 doc] system_stats/wallet_overview (pre-aggregated)`);
        }
      } else {
        overviewDoc = await getFirestoreRestDoc("system_stats", "wallet_overview", true, 3e4);
      }
      if (overviewDoc && typeof overviewDoc.totalWallets === "number") {
        walletOverviewCache = { data: overviewDoc, timestamp: Date.now() };
        return overviewDoc;
      }
    } catch (e) {
      console.warn("[walletService] Could not read system_stats/wallet_overview doc:", e);
    }
  }
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
    try {
      const countSnap = await adminDb.collection("wallets").count().get();
      totalWallets = countSnap.data().count;
    } catch (_) {
    }
    const walletsSnap = await adminDb.collection("wallets").get();
    if (!totalWallets) totalWallets = walletsSnap.size;
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
      (a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)
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
  const freshOverview = {
    totalWallets,
    totalVirtualBalanceVnd,
    totalConfirmedCreditedVnd,
    totalUnlockedSpendingVnd,
    pendingRequestsTotalVnd,
    pendingRequestsCount,
    totalOutstandingDebtVnd,
    studentsInDebtCount,
    recentRequests,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    if (adminDb) {
      await adminDb.collection("system_stats").doc("wallet_overview").set(freshOverview);
    } else {
      await setFirestoreRestDoc("system_stats", "wallet_overview", freshOverview);
    }
  } catch (err) {
    console.warn("[walletService] Warning saving system_stats/wallet_overview:", err);
  }
  walletOverviewCache = { data: freshOverview, timestamp: Date.now() };
  return freshOverview;
}
var debtSummariesCache = null;
var DEBT_SUMMARIES_TTL_MS = 180 * 1e3;
var userMapCache = null;
var USER_MAP_TTL_MS = 10 * 60 * 1e3;
function invalidateDebtSummariesCache() {
  debtSummariesCache = null;
}
async function getStudentDebtSummaries(options) {
  const now = Date.now();
  let walletsList = [];
  let debtsList = [];
  let entsList = [];
  let userMap = /* @__PURE__ */ new Map();
  if (!options?.force && debtSummariesCache && now - debtSummariesCache.timestamp < DEBT_SUMMARIES_TTL_MS) {
    walletsList = debtSummariesCache.walletsList;
    debtsList = debtSummariesCache.debtsList;
    entsList = debtSummariesCache.entsList;
    userMap = debtSummariesCache.userMap;
  } else {
    let needUsers = true;
    if (userMapCache && now - userMapCache.timestamp < USER_MAP_TTL_MS) {
      userMap = userMapCache.map;
      needUsers = false;
    }
    if (adminDb) {
      const queries = [
        adminDb.collection("wallets").get(),
        adminDb.collection("debt_records").get(),
        adminDb.collection("exam_entitlements").where("status", "==", "active").get()
      ];
      if (needUsers) {
        queries.push(adminDb.collection("users").get());
      }
      const [walletsSnap, debtsSnap, entsSnap, usersSnap] = await Promise.all(queries);
      walletsList = walletsSnap.docs.map((d) => d.data());
      debtsList = debtsSnap.docs.map((d) => d.data());
      entsList = entsSnap.docs.map((d) => d.data());
      if (needUsers && usersSnap) {
        userMap = /* @__PURE__ */ new Map();
        usersSnap.docs.forEach((d) => {
          const u = d.data();
          userMap.set(d.id, {
            username: u.username || "",
            email: u.email || "",
            displayName: u.displayName || u.fullName || ""
          });
        });
        userMapCache = { map: userMap, timestamp: now };
      }
    } else {
      const queries = [
        getFirestoreRestDocs("wallets", 100),
        getFirestoreRestDocs("debt_records", 100),
        getFirestoreRestDocs("exam_entitlements", 100)
      ];
      if (needUsers) {
        queries.push(getFirestoreRestDocs("users", 100));
      }
      const [wallets, debts, ents, users] = await Promise.all(queries);
      walletsList = wallets;
      debtsList = debts;
      entsList = ents.filter((e) => e.status === "active");
      if (needUsers && users) {
        userMap = /* @__PURE__ */ new Map();
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
        userMapCache = { map: userMap, timestamp: now };
      }
    }
    debtSummariesCache = {
      walletsList,
      debtsList,
      entsList,
      userMap,
      timestamp: now
    };
  }
  const debtByUid = /* @__PURE__ */ new Map();
  debtsList.forEach((rec) => {
    const uid = rec.uid;
    if (!debtByUid.has(uid)) {
      debtByUid.set(uid, { totalReceivable: 0, totalCollected: 0, totalAdjusted: 0, remainingDebt: 0 });
    }
    const curr = debtByUid.get(uid);
    if (rec.type !== "cash_collection") {
      curr.totalReceivable += sanitizeVnd(rec.amountVnd);
      curr.totalCollected += sanitizeVnd(rec.collectedVnd);
      curr.remainingDebt += Math.max(0, sanitizeVnd(rec.remainingVnd));
    }
    if (rec.type === "adjustment" || rec.adjustedVnd) {
      curr.totalAdjusted += sanitizeVnd(rec.adjustedVnd);
    }
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
      totalAdjusted: 0,
      remainingDebt: 0
    };
    const hasManualDebt = w.debtManualOverride === true || w.remainingDebtVnd !== void 0;
    const remainingDebtVnd = hasManualDebt && w.remainingDebtVnd !== void 0 ? sanitizeVnd(w.remainingDebtVnd) : debtInfo.remainingDebt;
    const totalReceivableVnd = hasManualDebt && w.totalReceivableVnd !== void 0 ? sanitizeVnd(w.totalReceivableVnd) : w.totalReceivableVnd !== void 0 ? sanitizeVnd(w.totalReceivableVnd) : debtInfo.totalReceivable;
    const totalCollectedVnd = hasManualDebt && w.totalCollectedVnd !== void 0 ? sanitizeVnd(w.totalCollectedVnd) : w.totalCollectedVnd !== void 0 ? sanitizeVnd(w.totalCollectedVnd) : debtInfo.totalCollected;
    const totalAdjustmentsVnd = hasManualDebt && w.totalAdjustmentsVnd !== void 0 ? sanitizeVnd(w.totalAdjustmentsVnd) : w.totalAdjustmentsVnd !== void 0 ? sanitizeVnd(w.totalAdjustmentsVnd) : debtInfo.totalAdjusted;
    let debtStatus = "paid";
    if (w.debtStatus) {
      debtStatus = w.debtStatus;
    } else if (remainingDebtVnd > 0) {
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
      totalReceivableVnd,
      totalReceivablesVnd: totalReceivableVnd,
      totalCollectedVnd,
      totalAdjustmentsVnd,
      totalAdjustedVnd: totalAdjustmentsVnd,
      remainingDebtVnd,
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
  const limitCount = options?.limit !== void 0 ? Math.max(1, Number(options.limit)) : 10;
  const paged = summaries.slice(offset, offset + limitCount);
  return { items: paged, total };
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
async function getStudentWalletDetails(studentUid, force = false) {
  if (!studentUid) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh h\u1ECDc sinh.");
  if (!force && studentDetailsCache.has(studentUid)) {
    const cached = studentDetailsCache.get(studentUid);
    if (Date.now() - cached.timestamp < STUDENT_DETAILS_TTL_MS) {
      return cached.data;
    }
  }
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
    const [rawTxs, rawReqs, rawEnts, rawDebts, uData, sData] = await Promise.all([
      queryFirestoreRestDocs("wallet_transactions", "uid", studentUid, 20),
      queryFirestoreRestDocs("deposit_requests", "uid", studentUid, 20),
      queryFirestoreRestDocs("exam_entitlements", "uid", studentUid, 20),
      queryFirestoreRestDocs("debt_records", "uid", studentUid, 20),
      getFirestoreRestDoc("users", studentUid),
      getFirestoreRestDoc("students", studentUid)
    ]);
    transactions = rawTxs.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)).slice(0, 20);
    depositRequests = rawReqs.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)).slice(0, 20);
    entitlements = rawEnts.sort((a, b) => parseTimestampMs(b.grantedAt) - parseTimestampMs(a.grantedAt)).slice(0, 20);
    debtRecords = rawDebts.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt)).slice(0, 20);
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
  const result = {
    wallet,
    studentProfile,
    transactions,
    depositRequests,
    entitlements,
    debtRecords
  };
  studentDetailsCache.set(studentUid, { data: result, timestamp: Date.now() });
  return result;
}
var depositRequestsCache = /* @__PURE__ */ new Map();
function invalidateDepositRequestsCache() {
  depositRequestsCache.clear();
}
async function getDepositRequests(options) {
  const effectiveLimit = options?.limit ? Math.min(Math.max(options.limit, 1), 100) : 5;
  const cacheKey = `${options?.status || "all"}_${options?.search || ""}_${effectiveLimit}`;
  if (!options?.force && depositRequestsCache.has(cacheKey)) {
    const cached = depositRequestsCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 3e4) {
      return cached.data;
    }
  }
  let list = [];
  if (adminDb) {
    let q = adminDb.collection("deposit_requests");
    if (options?.status && options.status !== "all") {
      q = q.where("status", "==", options.status);
    }
    q = q.orderBy("createdAt", "desc").limit(effectiveLimit);
    const snap = await q.get();
    list = snap.docs.map((d) => d.data());
  } else {
    const safeLimit = effectiveLimit;
    let docs;
    if (options?.status && options.status !== "all") {
      docs = await queryFirestoreRestDocs("deposit_requests", "status", options.status, safeLimit);
    } else {
      docs = await getFirestoreRestDocs("deposit_requests", safeLimit);
    }
    list = docs || [];
    list.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
    list = list.slice(0, effectiveLimit);
  }
  if (options?.search) {
    const term = options.search.toLowerCase().trim();
    list = list.filter(
      (r) => (r.studentNameSnapshot || "").toLowerCase().includes(term) || (r.studentClassSnapshot || "").toLowerCase().includes(term) || (r.id || "").toLowerCase().includes(term) || (r.uid || "").toLowerCase().includes(term)
    );
  }
  depositRequestsCache.set(cacheKey, { data: list, timestamp: Date.now() });
  return list;
}
var GLOBAL_SPENDING_TYPES = [
  "exam_unlock_debit",
  "course_unlock_debit",
  "course_lesson_unlock_debit",
  "admin_adjustment_debit"
];
var spendingFirstPageCache = /* @__PURE__ */ new Map();
var spendingStudentMetaCache = /* @__PURE__ */ new Map();
var SPENDING_CACHE_TTL_MS = 45 * 1e3;
var SPENDING_STUDENT_META_TTL_MS = 10 * 60 * 1e3;
async function getGlobalSpendingHistory(options) {
  const pageSize = Math.min(20, Math.max(1, Math.floor(Number(options?.limit) || 5)));
  const cursor = options?.cursor ? String(options.cursor).trim() : "";
  const filterType = options?.filterType ? String(options.filterType).trim() : "all_spending";
  const cacheKey = `${filterType}_${pageSize}`;
  if (!cursor && !options?.force) {
    const cached = spendingFirstPageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SPENDING_CACHE_TTL_MS) {
      return cached.data;
    }
  }
  const targetTypes = filterType && filterType !== "all_spending" && GLOBAL_SPENDING_TYPES.includes(filterType) ? [filterType] : [...GLOBAL_SPENDING_TYPES];
  let rawItems = [];
  let nextCursor = null;
  let hasMore = false;
  if (adminDb) {
    const baseRef = adminDb.collection("wallet_transactions");
    try {
      let q = targetTypes.length === 1 ? baseRef.where("type", "==", targetTypes[0]) : baseRef.where("type", "in", targetTypes);
      q = q.orderBy("createdAt", "desc");
      if (cursor) {
        q = q.startAfter(cursor);
      }
      q = q.limit(pageSize);
      const snap = await q.get();
      console.log(`[Server Firestore READ: ${snap.size} docs] wallet_transactions global spending (limit ${pageSize})`);
      rawItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      hasMore = snap.size === pageSize;
      nextCursor = snap.docs.length > 0 ? String(snap.docs[snap.docs.length - 1].data().createdAt || "") : null;
    } catch (err) {
      console.warn("[walletService] Composite index fallback for global spending history:", err?.message || err);
      const collected = [];
      let scanCursor = cursor;
      let exhausted = false;
      const chunkSize = 15;
      for (let step = 0; step < 3 && collected.length < pageSize && !exhausted; step++) {
        let q = baseRef.orderBy("createdAt", "desc");
        if (scanCursor) {
          q = q.startAfter(scanCursor);
        }
        const snap = await q.limit(chunkSize).get();
        if (snap.empty) {
          exhausted = true;
          break;
        }
        for (const d of snap.docs) {
          const data = { id: d.id, ...d.data() };
          scanCursor = String(data.createdAt || "");
          const isMatch = targetTypes.includes(data.type) || filterType === "all_spending" && data.type === "admin_adjustment" && Number(data.balanceAfterVnd) < Number(data.balanceBeforeVnd);
          if (isMatch) {
            collected.push(data);
            if (collected.length >= pageSize) break;
          }
        }
        if (snap.size < chunkSize) {
          exhausted = true;
        }
      }
      rawItems = collected;
      nextCursor = scanCursor || null;
      hasMore = !exhausted && rawItems.length > 0;
    }
  } else {
    const { docs, usedFallbackScan } = await queryOrderedFirestoreRestDocs("wallet_transactions", {
      whereField: "type",
      inValues: targetTypes,
      orderByField: "createdAt",
      direction: "DESCENDING",
      startAfterValue: cursor || void 0,
      limitCount: pageSize
    });
    const filtered = docs.filter((data) => {
      const isMatch = targetTypes.includes(data.type) || filterType === "all_spending" && data.type === "admin_adjustment" && Number(data.balanceAfterVnd) < Number(data.balanceBeforeVnd);
      if (!isMatch) return false;
      if (cursor && String(data.createdAt || "") >= cursor) return false;
      return true;
    });
    rawItems = filtered.slice(0, pageSize);
    hasMore = usedFallbackScan ? filtered.length >= pageSize : docs.length === pageSize;
    nextCursor = rawItems.length > 0 ? String(rawItems[rawItems.length - 1].createdAt || "") : null;
  }
  const nowMs = Date.now();
  const enriched = rawItems.map((tx) => {
    const cachedMeta = spendingStudentMetaCache.get(tx.uid);
    const freshMeta = cachedMeta && nowMs - cachedMeta.ts < SPENDING_STUDENT_META_TTL_MS ? cachedMeta : void 0;
    return {
      ...tx,
      studentName: tx.studentNameSnapshot || freshMeta?.fullName || (tx.actorName && tx.actorName !== "Th\xED sinh" ? tx.actorName : void 0),
      studentClass: tx.studentClassSnapshot || freshMeta?.currentClass || void 0,
      studentUsername: userMapCache?.map.get(tx.uid)?.username || void 0
    };
  });
  const missingUids = Array.from(
    new Set(
      enriched.filter((item) => !item.studentName && item.uid).map((item) => item.uid)
    )
  );
  if (missingUids.length > 0 && adminDb) {
    try {
      const refs = missingUids.map((u) => adminDb.collection("wallets").doc(u));
      const walletSnaps = await adminDb.getAll(...refs);
      const wMap = /* @__PURE__ */ new Map();
      walletSnaps.forEach((snap) => {
        if (snap.exists) {
          const d = snap.data();
          const meta = { fullName: d.fullName, currentClass: d.currentClass };
          wMap.set(snap.id, meta);
          spendingStudentMetaCache.set(snap.id, { ...meta, ts: nowMs });
        }
      });
      enriched.forEach((item) => {
        if (!item.studentName) {
          const wInfo = wMap.get(item.uid);
          const uInfo = userMapCache?.map.get(item.uid);
          item.studentName = wInfo?.fullName || uInfo?.displayName || item.actorName || "H\u1ECDc sinh";
          item.studentClass = item.studentClass || wInfo?.currentClass || "";
          item.studentUsername = item.studentUsername || uInfo?.username || "";
        }
      });
    } catch (_) {
    }
  }
  const result = {
    items: enriched,
    nextCursor: hasMore ? nextCursor : null,
    hasMore
  };
  if (!cursor) {
    spendingFirstPageCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }
  return result;
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
  invalidateStudentDetailsCache(studentUid);
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
  if (createdCount > 0 || updatedCount > 0) {
    invalidateDebtSummariesCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache();
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
  const hasDebtEdit = payload.remainingDebtVnd !== void 0 || payload.totalReceivableVnd !== void 0 || payload.totalCollectedVnd !== void 0 || payload.totalAdjustmentsVnd !== void 0 || payload.debtStatus !== void 0;
  if (payload.totalReceivableVnd !== void 0) {
    updates.totalReceivableVnd = sanitizeVnd(payload.totalReceivableVnd);
    updates.totalReceivablesVnd = sanitizeVnd(payload.totalReceivableVnd);
    updates.debtManualOverride = true;
  }
  if (payload.totalCollectedVnd !== void 0) {
    updates.totalCollectedVnd = sanitizeVnd(payload.totalCollectedVnd);
    updates.debtManualOverride = true;
  }
  if (payload.totalAdjustmentsVnd !== void 0) {
    updates.totalAdjustmentsVnd = sanitizeVnd(payload.totalAdjustmentsVnd);
    updates.totalAdjustedVnd = sanitizeVnd(payload.totalAdjustmentsVnd);
    updates.debtManualOverride = true;
  }
  if (payload.remainingDebtVnd !== void 0) {
    updates.remainingDebtVnd = sanitizeVnd(payload.remainingDebtVnd);
    updates.debtManualOverride = true;
  }
  if (payload.debtStatus !== void 0) {
    updates.debtStatus = payload.debtStatus;
  }
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
    if (hasDebtEdit && payload.remainingDebtVnd !== void 0) {
      const targetRemaining = sanitizeVnd(payload.remainingDebtVnd);
      const debtSnap = await adminDb.collection("debt_records").where("uid", "==", cleanUid).get();
      const unpaidRecords = debtSnap.docs.map((d) => ({ ref: d.ref, id: d.id, data: d.data() })).filter(
        (d) => d.data.type !== "cash_collection" && (d.data.status === "unpaid" || d.data.status === "partial" || d.data.remainingVnd && d.data.remainingVnd > 0)
      );
      const currentUnpaidSum = unpaidRecords.reduce(
        (sum, d) => sum + sanitizeVnd(d.data.remainingVnd),
        0
      );
      if (targetRemaining === 0) {
        unpaidRecords.forEach((d) => {
          batch.set(
            d.ref,
            {
              remainingVnd: 0,
              status: "paid",
              updatedAt: now,
              note: (d.data.note ? d.data.note + " | " : "") + (payload.note || "Admin \u0111i\u1EC1u ch\u1EC9nh x\xF3a c\xF4ng n\u1EE3 v\u1EC1 0\u0111")
            },
            { merge: true }
          );
        });
      } else if (unpaidRecords.length > 0) {
        if (targetRemaining <= currentUnpaidSum) {
          let remAlloc = targetRemaining;
          unpaidRecords.forEach((d) => {
            const currentRecRem = sanitizeVnd(d.data.remainingVnd);
            if (remAlloc <= 0) {
              batch.set(
                d.ref,
                {
                  remainingVnd: 0,
                  status: "paid",
                  updatedAt: now,
                  note: (d.data.note ? d.data.note + " | " : "") + (payload.note || "Admin \u0111i\u1EC1u ch\u1EC9nh gi\u1EA3m c\xF4ng n\u1EE3")
                },
                { merge: true }
              );
            } else if (currentRecRem <= remAlloc) {
              remAlloc -= currentRecRem;
            } else {
              const newRem = remAlloc;
              remAlloc = 0;
              batch.set(
                d.ref,
                {
                  remainingVnd: newRem,
                  status: "partial",
                  updatedAt: now,
                  note: (d.data.note ? d.data.note + " | " : "") + (payload.note || "Admin \u0111i\u1EC1u ch\u1EC9nh c\xF4ng n\u1EE3")
                },
                { merge: true }
              );
            }
          });
        } else {
          const diff = targetRemaining - currentUnpaidSum;
          const lastRec = unpaidRecords[unpaidRecords.length - 1];
          batch.set(
            lastRec.ref,
            {
              remainingVnd: sanitizeVnd(lastRec.data.remainingVnd) + diff,
              amountVnd: Math.max(
                sanitizeVnd(lastRec.data.amountVnd),
                sanitizeVnd(lastRec.data.remainingVnd) + diff
              ),
              status: "partial",
              updatedAt: now,
              note: (lastRec.data.note ? lastRec.data.note + " | " : "") + (payload.note || `Admin t\u0103ng c\xF4ng n\u1EE3 +${diff.toLocaleString("vi-VN")}\u0111`)
            },
            { merge: true }
          );
        }
      } else {
        const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDebtRef = adminDb.collection("debt_records").doc(debtId);
        const newDebtDoc = {
          id: debtId,
          uid: cleanUid,
          studentNameSnapshot: (updates.fullName || currentWallet.fullName || "").trim(),
          studentClassSnapshot: (updates.currentClass || currentWallet.currentClass || "").trim(),
          type: "manual_receivable",
          amountVnd: targetRemaining,
          collectedVnd: 0,
          allocatedVnd: 0,
          remainingVnd: targetRemaining,
          adjustedVnd: 0,
          status: "unpaid",
          note: payload.note || `Admin thi\u1EBFt l\u1EADp c\xF4ng n\u1EE3 tr\u1EF1c ti\u1EBFp: ${targetRemaining.toLocaleString("vi-VN")}\u0111`,
          createdAt: now,
          updatedAt: now
        };
        batch.set(newDebtRef, newDebtDoc);
      }
      const debtTxId = `tx_debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const debtTxRef = adminDb.collection("wallet_transactions").doc(debtTxId);
      const debtTxDoc = {
        id: debtTxId,
        uid: cleanUid,
        type: "debt_adjustment",
        amountVnd: targetRemaining,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        actorUid: adminUid,
        actorName: adminName,
        note: payload.note || `Admin c\u1EADp nh\u1EADt ch\u1EC9 s\u1ED1 c\xF4ng n\u1EE3: C\xF2n l\u1EA1i ${targetRemaining.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      };
      batch.set(debtTxRef, debtTxDoc);
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
    if (hasDebtEdit && payload.remainingDebtVnd !== void 0) {
      const targetRemaining = sanitizeVnd(payload.remainingDebtVnd);
      const allDebts = await queryFirestoreRestDocs("debt_records", "uid", cleanUid, 50);
      const unpaidRecords = allDebts.filter(
        (d) => d.type !== "cash_collection" && (d.status === "unpaid" || d.status === "partial" || d.remainingVnd && d.remainingVnd > 0)
      );
      const currentUnpaidSum = unpaidRecords.reduce(
        (sum, d) => sum + sanitizeVnd(d.remainingVnd),
        0
      );
      if (targetRemaining === 0) {
        for (const d of unpaidRecords) {
          await setFirestoreRestDoc("debt_records", d.id, {
            ...d,
            remainingVnd: 0,
            status: "paid",
            updatedAt: now,
            note: (d.note ? d.note + " | " : "") + (payload.note || "Admin \u0111i\u1EC1u ch\u1EC9nh x\xF3a c\xF4ng n\u1EE3 v\u1EC1 0\u0111")
          });
        }
      } else if (unpaidRecords.length > 0) {
        if (targetRemaining <= currentUnpaidSum) {
          let remAlloc = targetRemaining;
          for (const d of unpaidRecords) {
            const currentRecRem = sanitizeVnd(d.remainingVnd);
            if (remAlloc <= 0) {
              await setFirestoreRestDoc("debt_records", d.id, {
                ...d,
                remainingVnd: 0,
                status: "paid",
                updatedAt: now,
                note: (d.note ? d.note + " | " : "") + (payload.note || "Admin \u0111i\u1EC1u ch\u1EC9nh gi\u1EA3m c\xF4ng n\u1EE3")
              });
            } else if (currentRecRem <= remAlloc) {
              remAlloc -= currentRecRem;
            } else {
              const newRem = remAlloc;
              remAlloc = 0;
              await setFirestoreRestDoc("debt_records", d.id, {
                ...d,
                remainingVnd: newRem,
                status: "partial",
                updatedAt: now,
                note: (d.note ? d.note + " | " : "") + (payload.note || "Admin \u0111i\u1EC1u ch\u1EC9nh c\xF4ng n\u1EE3")
              });
            }
          }
        } else {
          const diff = targetRemaining - currentUnpaidSum;
          const lastRec = unpaidRecords[unpaidRecords.length - 1];
          await setFirestoreRestDoc("debt_records", lastRec.id, {
            ...lastRec,
            remainingVnd: sanitizeVnd(lastRec.remainingVnd) + diff,
            amountVnd: Math.max(
              sanitizeVnd(lastRec.amountVnd),
              sanitizeVnd(lastRec.remainingVnd) + diff
            ),
            status: "partial",
            updatedAt: now,
            note: (lastRec.note ? lastRec.note + " | " : "") + (payload.note || `Admin t\u0103ng c\xF4ng n\u1EE3 +${diff.toLocaleString("vi-VN")}\u0111`)
          });
        }
      } else {
        const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDebtDoc = {
          id: debtId,
          uid: cleanUid,
          studentNameSnapshot: (updates.fullName || currentWallet.fullName || "").trim(),
          studentClassSnapshot: (updates.currentClass || currentWallet.currentClass || "").trim(),
          type: "manual_receivable",
          amountVnd: targetRemaining,
          collectedVnd: 0,
          allocatedVnd: 0,
          remainingVnd: targetRemaining,
          adjustedVnd: 0,
          status: "unpaid",
          note: payload.note || `Admin thi\u1EBFt l\u1EADp c\xF4ng n\u1EE3 tr\u1EF1c ti\u1EBFp: ${targetRemaining.toLocaleString("vi-VN")}\u0111`,
          createdAt: now,
          updatedAt: now
        };
        await setFirestoreRestDoc("debt_records", debtId, newDebtDoc);
      }
      const debtTxId = `tx_debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const debtTxDoc = {
        id: debtTxId,
        uid: cleanUid,
        type: "debt_adjustment",
        amountVnd: targetRemaining,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        actorUid: adminUid,
        actorName: adminName,
        note: payload.note || `Admin c\u1EADp nh\u1EADt ch\u1EC9 s\u1ED1 c\xF4ng n\u1EE3: C\xF2n l\u1EA1i ${targetRemaining.toLocaleString("vi-VN")}\u0111`,
        createdAt: now
      };
      await setFirestoreRestDoc("wallet_transactions", debtTxId, debtTxDoc);
    }
  }
  const updatedWallet = {
    ...currentWallet,
    ...updates
  };
  invalidateDebtSummariesCache();
  invalidateWalletOverviewCache();
  invalidateStudentDetailsCache(cleanUid);
  return {
    success: true,
    wallet: updatedWallet,
    message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin v\xED v\xE0 s\u1ED1 d\u01B0 th\xE0nh c\xF4ng!"
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
function extractYouTubeVideoId(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return null;
  const match = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i
  );
  return match?.[1] || null;
}
var GENERIC_VIDEO_TITLES = /* @__PURE__ */ new Set([
  "youtube",
  "google drive",
  "google docs",
  "google drive - virus scan warning",
  "virus scan warning",
  "google drive: sign-in",
  "sign in - google accounts",
  "meet google drive \u2013 one place for all your files",
  "meet google drive - one place for all your files",
  "access denied",
  "404 not found",
  "error",
  "untitled"
]);
function decodeBasicHtmlEntities(text) {
  return text.replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
  }).replace(/&#(\d+);/g, (_m, dec) => {
    const code = parseInt(dec, 10);
    return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
  }).replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
}
function cleanDetectedVideoTitle(rawTitle) {
  let title = String(rawTitle || "").trim();
  if (!title) return "";
  title = decodeBasicHtmlEntities(title).replace(/\s*[-–—|]\s*(YouTube|Google Drive|Google Docs)\s*$/i, "").replace(/\.(mp4|mov|mkv|webm|avi|m4v|flv|wmv|mpeg|mpg|3gp)$/i, "").replace(/\s+/g, " ").trim();
  if (!title || title.length < 2) return "";
  if (GENERIC_VIDEO_TITLES.has(title.toLowerCase())) return "";
  if (/^(google drive|sign in|đăng nhập|error \d{3})/i.test(title) && title.length < 40) {
    return "";
  }
  return title.slice(0, 180);
}

// server/services/courseService.ts
var COURSE_DOC_CACHE_TTL_MS = 60 * 1e3;
var COURSE_ACCESS_CACHE_TTL_MS = 30 * 1e3;
var COURSE_PURCHASES_CACHE_TTL_MS = 30 * 1e3;
var COURSE_BUYER_META_TTL_MS = 10 * 60 * 1e3;
var MAX_COURSE_PURCHASES_PAGE_SIZE = 2;
var courseDocCache = /* @__PURE__ */ new Map();
var courseLessonCache = /* @__PURE__ */ new Map();
var courseAccessCache = /* @__PURE__ */ new Map();
var coursePurchasesFirstPageCache = /* @__PURE__ */ new Map();
var courseBuyerMetaCache = /* @__PURE__ */ new Map();
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
async function grantOrRevokeCourseEntitlement(adminUid, adminName, studentUid, courseId, lessonId, action, reason) {
  if (!studentUid) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh h\u1ECDc sinh.");
  if (!courseId) throw new Error("Ch\u01B0a ch\u1EC9 \u0111\u1ECBnh kh\xF3a h\u1ECDc.");
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Vui l\xF2ng nh\u1EADp l\xFD do c\u1EA5p/thu h\u1ED3i quy\u1EC1n kh\xF3a h\u1ECDc.");
  const course = await fetchCourseDoc(courseId, true);
  if (!course) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xF3a h\u1ECDc.");
  const lesson = lessonId ? await fetchLessonDoc(courseId, lessonId, true) : null;
  let wallet = null;
  try {
    wallet = await getOrCreateWallet(studentUid);
  } catch {
  }
  const isLessonScope = Boolean(lessonId);
  const entitlementId = isLessonScope ? `${studentUid}_${courseId}__${lessonId}` : `${studentUid}_${courseId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const entitlement = {
    id: entitlementId,
    uid: studentUid,
    courseId,
    lessonId: lessonId || null,
    scope: isLessonScope ? "lesson" : "course",
    status: action === "grant" ? "active" : "revoked",
    source: "admin_grant",
    pricePaidVnd: 0,
    grantedAt: now,
    grantedBy: adminUid,
    courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
    ...lesson ? { lessonTitleSnapshot: lesson.title } : {},
    ...wallet?.fullName ? { studentNameSnapshot: wallet.fullName } : {},
    ...wallet?.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}
  };
  if (adminDb) {
    await adminDb.collection("course_entitlements").doc(entitlementId).set(entitlement, { merge: true });
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bal = wallet ? sanitizeVnd(wallet.balanceVnd) : 0;
    const txDoc = {
      id: txId,
      uid: studentUid,
      type: "admin_adjustment_credit",
      amountVnd: 0,
      balanceBeforeVnd: bal,
      balanceAfterVnd: bal,
      courseId,
      courseTitleSnapshot: course.title || "Kh\xF3a h\u1ECDc",
      ...lesson ? { lessonId: lesson.id, lessonTitleSnapshot: lesson.title } : {},
      studentNameSnapshot: wallet?.fullName || "",
      studentClassSnapshot: wallet?.currentClass || "",
      actorUid: adminUid,
      actorName: adminName,
      note: `${action === "grant" ? "C\u1EA5p quy\u1EC1n" : "Thu h\u1ED3i quy\u1EC1n"} ${isLessonScope ? `b\xE0i gi\u1EA3ng "${lesson?.title || lessonId}"` : `kh\xF3a h\u1ECDc "${course.title}"`}: ${cleanReason}`,
      createdAt: now
    };
    await adminDb.collection("wallet_transactions").doc(txId).set(txDoc);
  } else {
    await setFirestoreRestDoc("course_entitlements", entitlementId, entitlement);
  }
  invalidateCourseServerCache(courseId, studentUid);
  invalidateStudentDetailsCache(studentUid);
  return { success: true, entitlement };
}
async function resolveBuyerMeta(uid, fallbackName, fallbackClass, fallbackEmail) {
  const now = Date.now();
  const cached = courseBuyerMetaCache.get(uid);
  if (cached && now - cached.ts < COURSE_BUYER_META_TTL_MS) {
    return {
      fullName: cached.fullName || fallbackName || uid,
      currentClass: cached.currentClass || fallbackClass,
      email: cached.email || fallbackEmail,
      username: cached.username
    };
  }
  let fullName = fallbackName || "";
  let currentClass = fallbackClass || "";
  let email = fallbackEmail || "";
  let username = "";
  try {
    if (adminDb) {
      if (!fullName) {
        const wSnap = await adminDb.collection("wallets").doc(uid).get();
        if (wSnap.exists) {
          const w = wSnap.data();
          fullName = w.fullName || w.verifiedName || "";
          currentClass = currentClass || w.currentClass || "";
        }
      }
      const uSnap = await adminDb.collection("users").doc(uid).get();
      if (uSnap.exists) {
        const u = uSnap.data();
        fullName = fullName || u.displayName || u.fullName || u.name || "";
        currentClass = currentClass || u.currentClass || u.className || "";
        email = email || u.email || "";
        username = u.username || "";
      }
    } else {
      if (!fullName) {
        const w = await getFirestoreRestDoc("wallets", uid, true, 6e4);
        if (w) {
          fullName = w.fullName || w.verifiedName || "";
          currentClass = currentClass || w.currentClass || "";
        }
      }
      const u = await getFirestoreRestDoc("users", uid, true, 6e4);
      if (u) {
        fullName = fullName || u.displayName || u.fullName || u.name || "";
        currentClass = currentClass || u.currentClass || u.className || "";
        email = email || u.email || "";
        username = u.username || "";
      }
    }
  } catch {
  }
  const meta = {
    fullName: fullName || uid,
    currentClass: currentClass || void 0,
    email: email || void 0,
    username: username || void 0,
    ts: now
  };
  courseBuyerMetaCache.set(uid, meta);
  return meta;
}
async function getAdminCoursePurchases(options) {
  const pageSize = Math.min(
    MAX_COURSE_PURCHASES_PAGE_SIZE,
    Math.max(1, Math.floor(Number(options?.limit) || MAX_COURSE_PURCHASES_PAGE_SIZE))
  );
  const cleanCourseId = options?.courseId && options.courseId !== "all" ? String(options.courseId).trim() : "";
  const cursor = options?.cursor ? String(options.cursor).trim() : "";
  const scopeFilter = options?.scope || "all";
  const statusFilter = options?.status || "all";
  const cacheKey = `${cleanCourseId || "all"}::${scopeFilter}::${statusFilter}::${pageSize}`;
  if (!cursor && !options?.force) {
    const cached = coursePurchasesFirstPageCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < COURSE_PURCHASES_CACHE_TTL_MS) {
      return cached.result;
    }
  }
  const matchesFilter = (ent) => {
    if (cleanCourseId && ent.courseId !== cleanCourseId) return false;
    const entScope = ent.scope || (ent.lessonId ? "lesson" : "course");
    if (scopeFilter !== "all" && entScope !== scopeFilter) return false;
    if (statusFilter !== "all" && ent.status !== statusFilter) return false;
    return true;
  };
  let rawEntitlements = [];
  let nextCursor = null;
  let hasMore = false;
  if (adminDb) {
    const col = adminDb.collection("course_entitlements");
    const needsPostFilter = scopeFilter !== "all" || statusFilter !== "all";
    try {
      if (!needsPostFilter) {
        let q = cleanCourseId ? col.where("courseId", "==", cleanCourseId) : col;
        q = q.orderBy("grantedAt", "desc");
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.limit(pageSize).get();
        console.log(
          `[Server Firestore READ: ${snap.size} docs] course_entitlements purchases (${cleanCourseId || "all"}, limit ${pageSize})`
        );
        rawEntitlements = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        hasMore = snap.size === pageSize;
        nextCursor = snap.docs.length > 0 ? String(snap.docs[snap.docs.length - 1].data().grantedAt || "") : null;
      } else {
        const collected = [];
        let scanCursor = cursor;
        let exhausted = false;
        const chunkLimit = 6;
        for (let step = 0; step < 2 && collected.length < pageSize && !exhausted; step++) {
          let q = cleanCourseId ? col.where("courseId", "==", cleanCourseId) : col;
          q = q.orderBy("grantedAt", "desc");
          if (scanCursor) q = q.startAfter(scanCursor);
          const snap = await q.limit(chunkLimit).get();
          if (snap.empty) {
            exhausted = true;
            break;
          }
          for (const d of snap.docs) {
            const ent = { id: d.id, ...d.data() };
            scanCursor = String(ent.grantedAt || "");
            if (matchesFilter(ent)) {
              collected.push(ent);
              if (collected.length >= pageSize) break;
            }
          }
          if (snap.size < chunkLimit) {
            exhausted = true;
          }
        }
        rawEntitlements = collected;
        nextCursor = scanCursor || null;
        hasMore = !exhausted && rawEntitlements.length > 0;
      }
    } catch (err) {
      console.warn("[courseService] Course purchases index fallback:", err?.message || err);
      const collected = [];
      let scanCursor = cursor;
      let exhausted = false;
      const chunkLimit = 10;
      for (let step = 0; step < 2 && collected.length < pageSize && !exhausted; step++) {
        let q = col.orderBy("grantedAt", "desc");
        if (scanCursor) q = q.startAfter(scanCursor);
        const snap = await q.limit(chunkLimit).get();
        if (snap.empty) {
          exhausted = true;
          break;
        }
        for (const d of snap.docs) {
          const ent = { id: d.id, ...d.data() };
          scanCursor = String(ent.grantedAt || "");
          if (matchesFilter(ent)) {
            collected.push(ent);
            if (collected.length >= pageSize) break;
          }
        }
        if (snap.size < chunkLimit) exhausted = true;
      }
      rawEntitlements = collected;
      nextCursor = scanCursor || null;
      hasMore = !exhausted && rawEntitlements.length > 0;
    }
  } else {
    const { docs, usedFallbackScan } = await queryOrderedFirestoreRestDocs("course_entitlements", {
      whereField: cleanCourseId ? "courseId" : void 0,
      equalValue: cleanCourseId || void 0,
      orderByField: "grantedAt",
      direction: "DESCENDING",
      startAfterValue: cursor || void 0,
      limitCount: scopeFilter === "all" && statusFilter === "all" ? pageSize : pageSize * 3
    });
    const matched = docs.filter((ent) => {
      if (!matchesFilter(ent)) return false;
      if (cursor && String(ent.grantedAt || "") >= cursor) return false;
      return true;
    });
    rawEntitlements = matched.slice(0, pageSize);
    nextCursor = rawEntitlements.length > 0 ? String(rawEntitlements[rawEntitlements.length - 1].grantedAt || "") : null;
    hasMore = usedFallbackScan ? matched.length >= pageSize : docs.length >= pageSize;
  }
  const courseMap = /* @__PURE__ */ new Map();
  const uniqueCourseIds = Array.from(new Set(rawEntitlements.map((e) => e.courseId).filter(Boolean)));
  await Promise.all(
    uniqueCourseIds.map(async (cid) => {
      try {
        courseMap.set(cid, await fetchCourseDoc(cid));
      } catch {
        courseMap.set(cid, null);
      }
    })
  );
  const items = await Promise.all(
    rawEntitlements.map(async (ent) => {
      const course = courseMap.get(ent.courseId) || null;
      const outlineItem = ent.lessonId ? course?.lessonOutline?.find((item) => item.id === ent.lessonId) : void 0;
      const meta = await resolveBuyerMeta(
        ent.uid,
        ent.studentNameSnapshot,
        ent.studentClassSnapshot,
        ent.studentEmailSnapshot
      );
      const entScope = ent.scope || (ent.lessonId ? "lesson" : "course");
      return {
        id: ent.id,
        uid: ent.uid,
        studentName: meta.fullName || ent.uid,
        studentClass: meta.currentClass || ent.studentClassSnapshot,
        studentEmail: meta.email || ent.studentEmailSnapshot,
        studentUsername: meta.username,
        courseId: ent.courseId,
        courseTitle: ent.courseTitleSnapshot || course?.title || ent.courseId,
        scope: entScope,
        lessonId: ent.lessonId || null,
        lessonTitle: entScope === "lesson" ? outlineItem?.title || ent.lessonTitleSnapshot || ent.lessonId || "B\xE0i gi\u1EA3ng" : void 0,
        lessonOrder: outlineItem ? outlineItem.order : void 0,
        status: ent.status || "active",
        source: ent.source || "purchase",
        pricePaidVnd: Math.max(0, Number(ent.pricePaidVnd) || 0),
        transactionId: ent.transactionId,
        grantedAt: String(ent.grantedAt || ""),
        grantedBy: ent.grantedBy
      };
    })
  );
  const result = {
    items,
    nextCursor: hasMore ? nextCursor : null,
    hasMore: Boolean(hasMore && nextCursor),
    pageLimit: pageSize
  };
  if (!cursor) {
    coursePurchasesFirstPageCache.set(cacheKey, { result, ts: Date.now() });
  }
  return result;
}
function extractMp4DurationSeconds(buf) {
  if (!buf || buf.length < 32) return null;
  const idx = buf.indexOf("mvhd");
  if (idx < 4 || idx + 28 > buf.length) return null;
  const version = buf.readUInt8(idx + 4);
  if (version === 0) {
    if (idx + 24 > buf.length) return null;
    const timescale = buf.readUInt32BE(idx + 16);
    const duration = buf.readUInt32BE(idx + 20);
    if (!timescale || !isFinite(duration)) return null;
    const sec = Math.round(duration / timescale);
    return sec > 0 ? sec : null;
  }
  if (version === 1) {
    if (idx + 36 > buf.length) return null;
    const timescale = buf.readUInt32BE(idx + 24);
    const hi = buf.readUInt32BE(idx + 28);
    const lo = buf.readUInt32BE(idx + 32);
    const duration = hi * 4294967296 + lo;
    if (!timescale || !isFinite(duration)) return null;
    const sec = Math.round(duration / timescale);
    return sec > 0 ? sec : null;
  }
  return null;
}
function findMp4MoovOffset(buf) {
  if (!buf || buf.length < 16) return null;
  const firstType = buf.toString("ascii", 4, 8);
  if (firstType !== "ftyp") return null;
  let offset = 0;
  let sawMdat = false;
  for (let steps = 0; steps < 32 && offset + 8 <= buf.length; steps++) {
    const size32 = buf.readUInt32BE(offset);
    const boxType = buf.toString("ascii", offset + 4, offset + 8);
    if (boxType === "moov") return offset;
    if (boxType === "mdat") sawMdat = true;
    let boxSize = size32;
    if (size32 === 1) {
      if (offset + 16 > buf.length) return null;
      const hi = buf.readUInt32BE(offset + 8);
      const lo = buf.readUInt32BE(offset + 12);
      boxSize = hi * 4294967296 + lo;
    }
    if (!boxSize || boxSize < 8 || !Number.isFinite(boxSize)) return null;
    offset += boxSize;
  }
  if (sawMdat && offset >= buf.length) {
    return offset;
  }
  return null;
}
function extractMatroskaDurationSeconds(buf) {
  if (!buf || buf.length < 32) return null;
  if (buf[0] !== 26 || buf[1] !== 69 || buf[2] !== 223 || buf[3] !== 163) {
    return null;
  }
  let timecodeScaleNs = 1e6;
  const scaleIdx = buf.indexOf(Buffer.from([42, 215, 177]));
  if (scaleIdx >= 0 && scaleIdx + 4 < buf.length) {
    const vint = buf[scaleIdx + 3];
    const len = vint & 127;
    if ((vint & 128) !== 0 && len >= 1 && len <= 8 && scaleIdx + 4 + len <= buf.length) {
      let val = 0;
      for (let i = 0; i < len; i++) {
        val = val * 256 + buf[scaleIdx + 4 + i];
      }
      if (val > 0) timecodeScaleNs = val;
    }
  }
  let searchFrom = 0;
  while (searchFrom < buf.length - 8) {
    const durIdx = buf.indexOf(Buffer.from([68, 137]), searchFrom);
    if (durIdx < 0 || durIdx + 3 >= buf.length) break;
    const sizeByte = buf[durIdx + 2];
    const len = sizeByte & 127;
    if ((sizeByte & 128) !== 0 && (len === 4 || len === 8) && durIdx + 3 + len <= buf.length) {
      const rawDur = len === 4 ? buf.readFloatBE(durIdx + 3) : buf.readDoubleBE(durIdx + 3);
      if (Number.isFinite(rawDur) && rawDur > 0) {
        const seconds = Math.round(rawDur * timecodeScaleNs / 1e9);
        if (seconds > 0 && seconds < 86400 * 7) return seconds;
      }
    }
    searchFrom = durIdx + 2;
  }
  return null;
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
function unescapeGoogleHtmlPayload(raw) {
  return String(raw || "").replace(/\\u0026/gi, "&").replace(/\\u003d/gi, "=").replace(/\\u0022/gi, '"').replace(/\\x26/gi, "&").replace(/\\x3d/gi, "=").replace(/\\\//g, "/").replace(/\\"/g, '"');
}
function extractFilenameFromContentDisposition(header) {
  const raw = String(header || "").trim();
  if (!raw) return void 0;
  const starMatch = raw.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;\r\n]+)/i);
  if (starMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(starMatch[1].trim().replace(/^["']|["']$/g, ""));
      if (decoded.trim()) return decoded.trim();
    } catch {
    }
  }
  const quotedMatch = raw.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]?.trim()) return quotedMatch[1].trim();
  const bareMatch = raw.match(/filename\s*=\s*([^;\r\n]+)/i);
  if (bareMatch?.[1]?.trim()) return bareMatch[1].trim().replace(/^["']|["']$/g, "");
  return void 0;
}
function extractDriveTitleFromHtml(rawHtml) {
  const html = unescapeGoogleHtmlPayload(rawHtml);
  const ogTitle = html.match(/<meta\s+(?:property="og:title"|name="title")\s+content="([^"]*)"/i)?.[1];
  const tagTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*[-–—]\s*Google Drive\s*$/i, "").trim();
  const candidate = (ogTitle || tagTitle || "").trim();
  if (!candidate) return void 0;
  if (!cleanDetectedVideoTitle(candidate)) return void 0;
  return candidate;
}
function extractDriveDurationFromHtml(rawHtml) {
  const html = unescapeGoogleHtmlPayload(rawHtml);
  const title = extractDriveTitleFromHtml(rawHtml);
  const msPatterns = [
    /["']?(?:durationMs|duration_ms|durationMillis|approxDurationMs)["']?\s*[:=]\s*["']?(\d{4,10})["']?/i,
    /\["(?:durationMs|duration_ms|durationMillis|approxDurationMs)"\s*,\s*["']?(\d{4,10})["']?\]/i
  ];
  for (const re of msPatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const sec = Math.round(Number(m[1]) / 1e3);
      if (sec > 0) return { durationSeconds: sec, title };
    }
  }
  const secPatterns = [
    /["']?length_seconds["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)["']?/i,
    /\["length_seconds"\s*,\s*["']?(\d+(?:\.\d+)?)["']?\]/i,
    /(?:[?&]|%26|%3F)length_seconds(?:=|%3D)(\d+(?:\.\d+)?)/i,
    /[?&]dur=(\d+(?:\.\d+)?)/i,
    /%3F[^"'\s]*dur%3D(\d+(?:\.\d+)?)/i,
    /%26dur%3D(\d+(?:\.\d+)?)/i
  ];
  for (const re of secPatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const sec = Math.round(Number(m[1]));
      if (sec > 0 && sec < 86400 * 7) return { durationSeconds: sec, title };
    }
  }
  return null;
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
async function probeRemoteMediaRange(mediaUrl, options) {
  const baseHeaders = {
    "User-Agent": DEFAULT_BROWSER_UA,
    Range: "bytes=0-131071",
    ...options?.headers || {}
  };
  let { res: headRes, finalUrl } = await fetchWithSsrfCheckedRedirects(
    mediaUrl,
    { headers: baseHeaders, signal: AbortSignal.timeout(12e3) },
    { restrictToDriveHosts: options?.restrictToDriveHosts }
  );
  if (!headRes.ok) return null;
  let detectedFileName = extractFilenameFromContentDisposition(headRes.headers?.get?.("content-disposition"));
  const contentType = String(headRes.headers?.get?.("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    const html = (await readResponseChunkBounded(headRes, 131072)).toString("utf8");
    const confirmUrl = extractDriveConfirmationDownloadUrl(html, finalUrl);
    if (!confirmUrl) return null;
    const confirmed = await fetchWithSsrfCheckedRedirects(
      confirmUrl,
      { headers: baseHeaders, signal: AbortSignal.timeout(12e3) },
      { restrictToDriveHosts: true }
    );
    headRes = confirmed.res;
    finalUrl = confirmed.finalUrl;
    if (!headRes.ok) return null;
    detectedFileName = detectedFileName || extractFilenameFromContentDisposition(headRes.headers?.get?.("content-disposition"));
    const confirmedType = String(headRes.headers?.get?.("content-type") || "").toLowerCase();
    if (confirmedType.includes("text/html")) return null;
  }
  const headBuf = await readResponseChunkBounded(headRes, 262144);
  const headSec = extractMp4DurationSeconds(headBuf) ?? extractMatroskaDurationSeconds(headBuf);
  if (headSec) {
    return { durationSeconds: headSec, source: "mp4_head", ...detectedFileName ? { fileName: detectedFileName } : {} };
  }
  const cr = headRes.headers?.get?.("content-range");
  const totalMatch = cr?.match(/\/(\d+)$/);
  const totalBytes = totalMatch ? Number(totalMatch[1]) : 0;
  const moovOffset = findMp4MoovOffset(headBuf);
  if (moovOffset && moovOffset >= headBuf.length && (!totalBytes || moovOffset < totalBytes)) {
    const endByte = totalBytes ? Math.min(totalBytes - 1, moovOffset + 131071) : moovOffset + 131071;
    const { res: moovRes } = await fetchWithSsrfCheckedRedirects(
      finalUrl,
      {
        headers: { "User-Agent": DEFAULT_BROWSER_UA, Range: `bytes=${moovOffset}-${endByte}` },
        signal: AbortSignal.timeout(1e4)
      },
      { restrictToDriveHosts: options?.restrictToDriveHosts }
    );
    if (moovRes.ok) {
      const moovBuf = await readResponseChunkBounded(moovRes, 262144);
      const moovSec = extractMp4DurationSeconds(moovBuf);
      if (moovSec) {
        return { durationSeconds: moovSec, source: "mp4_moov", ...detectedFileName ? { fileName: detectedFileName } : {} };
      }
    }
  }
  if (totalBytes > 262144) {
    const start = Math.max(0, totalBytes - 262144);
    const { res: tailRes } = await fetchWithSsrfCheckedRedirects(
      finalUrl,
      {
        headers: { "User-Agent": DEFAULT_BROWSER_UA, Range: `bytes=${start}-${totalBytes - 1}` },
        signal: AbortSignal.timeout(1e4)
      },
      { restrictToDriveHosts: options?.restrictToDriveHosts }
    );
    if (tailRes.ok) {
      const tailArr = await readResponseChunkBounded(tailRes, 262144);
      const tailSec = extractMp4DurationSeconds(tailArr);
      if (tailSec) {
        return { durationSeconds: tailSec, source: "mp4_tail", ...detectedFileName ? { fileName: detectedFileName } : {} };
      }
    }
  }
  if (detectedFileName) {
    return { durationSeconds: 0, source: "content_disposition", fileName: detectedFileName };
  }
  return null;
}
async function probeVideoDuration(rawUrl) {
  const cleanUrl = String(rawUrl || "").trim();
  if (!cleanUrl) return null;
  await validateUrlForSsrf(cleanUrl);
  const ytId = extractYouTubeVideoId(cleanUrl);
  if (ytId) {
    let detectedSec = 0;
    let detectedTitle;
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}&hl=en`, {
        headers: {
          "User-Agent": DEFAULT_BROWSER_UA,
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(1e4)
      });
      if (watchRes.ok) {
        const html = await watchRes.text();
        const msMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
        const secMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        const metaTitle = html.match(/<meta\s+name="title"\s+content="([^"]*)"/i)?.[1] || html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1] || html.match(/<title>([^<]+)<\/title>/i)?.[1];
        const cleanedMetaTitle = cleanDetectedVideoTitle(metaTitle);
        if (cleanedMetaTitle) detectedTitle = cleanedMetaTitle;
        if (msMatch?.[1]) detectedSec = Math.round(Number(msMatch[1]) / 1e3);
        else if (secMatch?.[1]) detectedSec = Math.round(Number(secMatch[1]));
      }
    } catch {
    }
    if (!detectedTitle || detectedSec <= 0) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`,
          {
            headers: { "User-Agent": DEFAULT_BROWSER_UA, Accept: "application/json" },
            signal: AbortSignal.timeout(6e3)
          }
        );
        if (oembedRes.ok) {
          const oembedJson = await oembedRes.json().catch(() => null);
          const cleanedOembedTitle = cleanDetectedVideoTitle(oembedJson?.title);
          if (cleanedOembedTitle) detectedTitle = detectedTitle || cleanedOembedTitle;
        }
      } catch {
      }
    }
    if (detectedSec > 0) {
      return {
        durationSeconds: detectedSec,
        durationMinutes: Math.max(1, Math.round(detectedSec / 60)),
        ...detectedTitle ? { title: detectedTitle } : {},
        source: "youtube"
      };
    }
    if (detectedTitle) {
      return {
        durationSeconds: 0,
        durationMinutes: 0,
        title: detectedTitle,
        source: "youtube_oembed"
      };
    }
    return null;
  }
  const driveId = extractGoogleDriveFileId(cleanUrl);
  if (driveId) {
    let discoveredTitle;
    const driveApiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (driveApiKey) {
      try {
        const apiRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveId)}?fields=name,videoMediaMetadata(durationMillis)&key=${encodeURIComponent(driveApiKey)}`,
          { signal: AbortSignal.timeout(8e3) }
        );
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json?.name) discoveredTitle = String(json.name);
          const ms = Number(json?.videoMediaMetadata?.durationMillis || 0);
          if (ms > 0) {
            const sec = Math.round(ms / 1e3);
            return {
              durationSeconds: sec,
              durationMinutes: Math.max(1, Math.round(sec / 60)),
              title: discoveredTitle,
              source: "drive_api"
            };
          }
        }
      } catch {
      }
    }
    try {
      const infoRes = await fetch(
        `https://drive.google.com/get_video_info?docid=${encodeURIComponent(driveId)}`,
        {
          headers: { "User-Agent": DEFAULT_BROWSER_UA },
          signal: AbortSignal.timeout(1e4)
        }
      );
      if (infoRes.ok) {
        const body = await infoRes.text();
        const params = new URLSearchParams(body);
        const title = params.get("title") || void 0;
        if (title && cleanDetectedVideoTitle(title)) discoveredTitle = discoveredTitle || title;
        const lenSec = Number(params.get("length_seconds") || 0);
        if (lenSec > 0) {
          const sec = Math.round(lenSec);
          return {
            durationSeconds: sec,
            durationMinutes: Math.max(1, Math.round(sec / 60)),
            title: discoveredTitle,
            source: "drive_info"
          };
        }
        const streamMap = `${params.get("fmt_stream_map") || ""} ${params.get("url_encoded_fmt_stream_map") || ""}`;
        const durMatch = streamMap.match(/[?&]dur=(\d+(?:\.\d+)?)/i) || decodeURIComponent(streamMap).match(/[?&]dur=(\d+(?:\.\d+)?)/i);
        if (durMatch?.[1]) {
          const sec = Math.round(Number(durMatch[1]));
          if (sec > 0) {
            return {
              durationSeconds: sec,
              durationMinutes: Math.max(1, Math.round(sec / 60)),
              title: discoveredTitle,
              source: "drive_info_stream"
            };
          }
        }
      }
    } catch {
    }
    for (const suffix of ["preview", "view"]) {
      try {
        const prevRes = await fetch(
          `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/${suffix}`,
          {
            headers: {
              "User-Agent": DEFAULT_BROWSER_UA,
              "Accept-Language": "en-US,en;q=0.9"
            },
            signal: AbortSignal.timeout(1e4)
          }
        );
        if (prevRes.ok) {
          const html = await prevRes.text();
          const parsed = extractDriveDurationFromHtml(html);
          if (parsed?.title) discoveredTitle = discoveredTitle || parsed.title;
          if (parsed && parsed.durationSeconds > 0) {
            return {
              durationSeconds: parsed.durationSeconds,
              durationMinutes: Math.max(1, Math.round(parsed.durationSeconds / 60)),
              title: discoveredTitle,
              source: `drive_${suffix}`
            };
          }
          if (!discoveredTitle) {
            discoveredTitle = extractDriveTitleFromHtml(html);
          }
        }
      } catch {
      }
    }
    const driveDownloadCandidates = [
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`,
      `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(driveId)}`
    ];
    for (const downloadUrl of driveDownloadCandidates) {
      try {
        const mediaProbe = await probeRemoteMediaRange(downloadUrl, { restrictToDriveHosts: true });
        if (mediaProbe?.fileName && cleanDetectedVideoTitle(mediaProbe.fileName)) {
          discoveredTitle = discoveredTitle || mediaProbe.fileName;
        }
        if (mediaProbe && mediaProbe.durationSeconds > 0) {
          return {
            durationSeconds: mediaProbe.durationSeconds,
            durationMinutes: Math.max(1, Math.round(mediaProbe.durationSeconds / 60)),
            ...discoveredTitle ? { title: discoveredTitle } : {},
            source: `drive_${mediaProbe.source}`
          };
        }
      } catch {
      }
    }
    if (discoveredTitle) {
      return {
        durationSeconds: 0,
        durationMinutes: 0,
        title: discoveredTitle,
        source: "drive_title"
      };
    }
    return null;
  }
  try {
    const mediaProbe = await probeRemoteMediaRange(cleanUrl);
    if (mediaProbe && mediaProbe.durationSeconds > 0) {
      return {
        durationSeconds: mediaProbe.durationSeconds,
        durationMinutes: Math.max(1, Math.round(mediaProbe.durationSeconds / 60)),
        ...mediaProbe.fileName && cleanDetectedVideoTitle(mediaProbe.fileName) ? { title: mediaProbe.fileName } : {},
        source: mediaProbe.source
      };
    }
    if (mediaProbe?.fileName && cleanDetectedVideoTitle(mediaProbe.fileName)) {
      return {
        durationSeconds: 0,
        durationMinutes: 0,
        title: mediaProbe.fileName,
        source: "direct_title"
      };
    }
  } catch {
  }
  return null;
}
var DRIVE_STREAM_CACHE_TTL_MS = 15 * 60 * 1e3;

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

// server/routes/aiShopAdminRoutes.ts
import { Router } from "express";
import { ZodError } from "zod";

// server/services/aiShopService.ts
import { z as z2 } from "zod";

// src/services/aiShop/initialCatalog.ts
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

// server/services/notificationPushService.ts
import crypto from "node:crypto";
import { z } from "zod";
var COL_NOTIFS = "notifications";
var feedCache = null;
function invalidateNotificationFeedCache() {
  feedCache = null;
}
var broadcastNotificationSchema = z.object({
  title: z.string().trim().min(2, "Vui l\xF2ng nh\u1EADp ti\xEAu \u0111\u1EC1 th\xF4ng b\xE1o.").max(140),
  message: z.string().trim().min(2, "Vui l\xF2ng nh\u1EADp n\u1ED9i dung th\xF4ng b\xE1o.").max(600),
  route: z.string().trim().max(240).optional().default("/"),
  type: z.enum(["minigame_event", "minigame_reward", "ai_order_delivered", "feature_release", "system"]).optional().default("feature_release"),
  recipientUid: z.string().trim().max(128).optional().default("all")
});
async function publishDeviceNotification(params) {
  const now = /* @__PURE__ */ new Date();
  const invTs = String(Math.max(0, 9999999999999 - now.getTime())).padStart(13, "0");
  const id = `00_${invTs}_${crypto.randomBytes(3).toString("hex")}`;
  const item = {
    id,
    recipientUid: params.recipientUid || "all",
    type: params.type,
    title: params.title.slice(0, 140),
    message: params.message.slice(0, 600),
    route: params.route && params.route.startsWith("/") ? params.route : "/",
    read: false,
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
    actorName: params.actorName || "DkTEST"
  };
  try {
    if (adminDb) {
      await adminDb.collection(COL_NOTIFS).doc(id).set(item);
    } else {
      await setFirestoreRestDoc(COL_NOTIFS, id, item);
    }
    invalidateNotificationFeedCache();
  } catch (err) {
    console.warn("[notificationPushService] Failed to persist notification:", err);
  }
  return item;
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
async function removeDoc(col, id) {
  if (adminDb) {
    await adminDb.collection(col).doc(id).delete();
  } else {
    await deleteFirestoreRestDoc(col, id);
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
function makeServiceCode(name) {
  const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase().slice(0, 20);
  return slug || `SVC-${Date.now().toString(36).toUpperCase()}`;
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
async function createAiService(rawInput, actor) {
  const data = createServiceSchema.parse(rawInput);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = makeShortId("svc");
  const service = {
    id,
    code: data.code || makeServiceCode(data.name),
    name: data.name,
    billingType: data.billingType,
    defaultFirstPriceVnd: data.defaultFirstPriceVnd,
    defaultRecurringPriceVnd: data.billingType === "monthly" ? data.defaultRecurringPriceVnd : null,
    durationValue: data.durationValue,
    durationUnit: data.durationValue ? data.durationUnit : null,
    conditions: data.conditions,
    status: data.status,
    studentVisible: data.studentVisible,
    sortOrder: data.sortOrder,
    createdAt: now,
    updatedAt: now
  };
  await saveDoc(COL_SERVICES, id, service);
  await writeAuditLog({
    action: "service_create",
    entityType: "service",
    entityId: id,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Th\xEAm d\u1ECBch v\u1EE5 "${service.name}" (${service.billingType === "monthly" ? "H\xE0ng th\xE1ng" : "M\u1ED9t l\u1EA7n"}).`,
    after: service
  });
  invalidateAiShopCache();
  return service;
}
async function updateAiService(serviceId, rawInput, actor) {
  const existing = await getDocById(COL_SERVICES, serviceId);
  if (!existing) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y d\u1ECBch v\u1EE5.");
  }
  const patch = updateServiceSchema.parse(rawInput);
  const nextBillingType = patch.billingType ?? existing.billingType;
  const nextDurationValue = patch.durationValue !== void 0 ? patch.durationValue : existing.durationValue;
  const updated = {
    ...existing,
    ...patch,
    billingType: nextBillingType,
    defaultRecurringPriceVnd: nextBillingType === "monthly" ? patch.defaultRecurringPriceVnd !== void 0 ? patch.defaultRecurringPriceVnd : existing.defaultRecurringPriceVnd : null,
    durationValue: nextDurationValue,
    durationUnit: nextDurationValue ? patch.durationUnit !== void 0 ? patch.durationUnit : existing.durationUnit : null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDoc(COL_SERVICES, serviceId, updated);
  await writeAuditLog({
    action: "service_update",
    entityType: "service",
    entityId: serviceId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `C\u1EADp nh\u1EADt d\u1ECBch v\u1EE5 "${updated.name}" (kh\xF4ng \u1EA3nh h\u01B0\u1EDFng gi\xE1 c\xE1c \u0111\u01A1n c\u0169).`,
    before: existing,
    after: updated
  });
  invalidateAiShopCache();
  return updated;
}
async function getAdminAiShopBootstrap(force = false) {
  const now = Date.now();
  if (!force && bootstrapCache && now - bootstrapCache.ts < BOOTSTRAP_CACHE_TTL_MS) {
    return bootstrapCache.data;
  }
  let services = await listCollection(COL_SERVICES);
  if (services.length === 0) {
    services = await ensureInitialServicesSeeded();
  }
  const [customers, orders, payments, auditLogs] = await Promise.all([
    listCollection(COL_CUSTOMERS),
    listCollection(COL_ORDERS),
    listCollection(COL_PAYMENTS),
    listCollection(COL_AUDIT_LOGS)
  ]);
  const data = {
    services: services.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
    customers: customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    orders: orders.sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    payments: payments.sort((a, b) => b.paidDate.localeCompare(a.paidDate) || b.createdAt.localeCompare(a.createdAt)),
    auditLogs: auditLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200)
  };
  bootstrapCache = { data, ts: now };
  return data;
}
async function createAiCustomer(rawInput, actor) {
  const data = createCustomerSchema.parse(rawInput);
  return withIdempotency(data.idempotencyKey, "cust_create", async () => {
    const existing = await listCollection(COL_CUSTOMERS);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = makeShortId("cust");
    const customer = {
      id,
      customerCode: nextCustomerCode(existing),
      fullName: data.fullName,
      phoneZalo: data.phoneZalo,
      email: data.email,
      otherContact: data.otherContact,
      note: data.note,
      linkedUid: data.linkedUid ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    };
    await saveDoc(COL_CUSTOMERS, id, customer);
    await writeAuditLog({
      action: "customer_create",
      entityType: "customer",
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Th\xEAm kh\xE1ch h\xE0ng ${customer.customerCode} \u2014 ${customer.fullName}.`,
      after: customer
    });
    invalidateAiShopCache();
    return customer;
  });
}
async function updateAiCustomer(customerId, rawInput, actor) {
  const existing = await getDocById(COL_CUSTOMERS, customerId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xE1ch h\xE0ng.");
  const patch = updateCustomerSchema.parse(rawInput);
  const updated = {
    ...existing,
    ...patch,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDoc(COL_CUSTOMERS, customerId, updated);
  await writeAuditLog({
    action: "customer_update",
    entityType: "customer",
    entityId: customerId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `C\u1EADp nh\u1EADt th\xF4ng tin kh\xE1ch ${updated.customerCode} (${updated.fullName}).`,
    before: existing,
    after: updated
  });
  invalidateAiShopCache();
  return updated;
}
async function archiveOrRestoreAiCustomer(customerId, archive, actor) {
  const existing = await getDocById(COL_CUSTOMERS, customerId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xE1ch h\xE0ng.");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    status: archive ? "archived" : "active",
    archivedAt: archive ? now : null,
    updatedAt: now
  };
  await saveDoc(COL_CUSTOMERS, customerId, updated);
  await writeAuditLog({
    action: archive ? "customer_archive" : "customer_restore",
    entityType: "customer",
    entityId: customerId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: archive ? `L\u01B0u tr\u1EEF kh\xE1ch h\xE0ng ${updated.customerCode} (${updated.fullName}).` : `Kh\xF4i ph\u1EE5c kh\xE1ch h\xE0ng ${updated.customerCode} (${updated.fullName}).`,
    before: { status: existing.status },
    after: { status: updated.status }
  });
  invalidateAiShopCache();
  return updated;
}
async function deleteAiCustomerSafely(customerId, actor) {
  const existing = await getDocById(COL_CUSTOMERS, customerId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y kh\xE1ch h\xE0ng.");
  const [orders, payments] = await Promise.all([
    queryByField(COL_ORDERS, "customerId", customerId),
    queryByField(COL_PAYMENTS, "customerId", customerId)
  ]);
  if (orders.length > 0 || payments.length > 0) {
    const err = new Error(
      "Kh\xF4ng th\u1EC3 x\xF3a v\u0129nh vi\u1EC5n kh\xE1ch \u0111\xE3 c\xF3 \u0111\u01A1n h\xE0ng ho\u1EB7c giao d\u1ECBch. Vui l\xF2ng ch\u1ECDn L\u01B0u tr\u1EEF \u0111\u1EC3 b\u1EA3o to\xE0n l\u1ECBch s\u1EED."
    );
    err.statusCode = 409;
    throw err;
  }
  await removeDoc(COL_CUSTOMERS, customerId);
  await writeAuditLog({
    action: "customer_delete",
    entityType: "customer",
    entityId: customerId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `X\xF3a kh\xE1ch h\xE0ng ch\u01B0a ph\xE1t sinh giao d\u1ECBch ${existing.customerCode} (${existing.fullName}).`,
    before: existing
  });
  invalidateAiShopCache();
  return { deleted: true };
}
async function createAiOrder(rawInput, actor) {
  const data = createOrderSchema.parse(rawInput);
  if (data.billingType === "monthly" && data.recurringPriceVnd === null) {
    throw new Error("\u0110\u01A1n thu h\xE0ng th\xE1ng b\u1EAFt bu\u1ED9c ph\u1EA3i nh\u1EADp gi\xE1 k\u1EF3 sau.");
  }
  return withIdempotency(data.idempotencyKey, "order_create", async () => {
    const [customer, service, existingOrders] = await Promise.all([
      getDocById(COL_CUSTOMERS, data.customerId),
      getDocById(COL_SERVICES, data.serviceId),
      listCollection(COL_ORDERS)
    ]);
    if (!customer) throw new Error("Kh\xE1ch h\xE0ng kh\xF4ng t\u1ED3n t\u1EA1i.");
    if (!service) throw new Error("D\u1ECBch v\u1EE5 kh\xF4ng t\u1ED3n t\u1EA1i.");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const todayVn = getTodayVnDate();
    const id = makeShortId("ord");
    const order = {
      id,
      orderCode: makeOrderCode(todayVn, existingOrders.length),
      customerId: customer.id,
      customerCodeSnapshot: customer.customerCode,
      linkedUid: customer.linkedUid ?? null,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      serviceConditionsSnapshot: service.conditions,
      accountSlot: data.accountSlot,
      quantity: data.quantity,
      startDate: data.startDate,
      stopDate: data.stopDate,
      billingType: data.billingType,
      firstCyclePriceVnd: data.firstCyclePriceVnd,
      recurringPriceVnd: data.billingType === "monthly" ? data.recurringPriceVnd : null,
      durationValue: data.durationValue,
      durationUnit: data.durationValue ? data.durationUnit : null,
      note: data.note,
      source: "admin_manual",
      fulfillmentStatus: data.fulfillmentStatus ?? (data.accountSlot ? "delivered" : "pending_delivery"),
      importRowKey: null,
      idempotencyKey: data.idempotencyKey ?? null,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now
    };
    await saveDoc(COL_ORDERS, id, order);
    await writeAuditLog({
      action: "order_create",
      entityType: "order",
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `T\u1EA1o \u0111\u01A1n ${order.orderCode} cho ${customer.fullName} \u2014 ${service.name} (${order.firstCyclePriceVnd}\u0111).`,
      after: order
    });
    invalidateAiShopCache();
    return order;
  });
}
async function updateAiOrder(orderId, rawInput, actor) {
  const existing = await getDocById(COL_ORDERS, orderId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng.");
  const patch = updateOrderSchema.parse(rawInput);
  let serviceNameSnapshot = existing.serviceNameSnapshot;
  let serviceConditionsSnapshot = existing.serviceConditionsSnapshot;
  let action = "order_update";
  if (patch.serviceId && patch.serviceId !== existing.serviceId) {
    if (!patch.confirmServiceChange) {
      throw new Error(
        "\u0110\u1ED5i d\u1ECBch v\u1EE5 tr\xEAn \u0111\u01A1n h\xE0ng y\xEAu c\u1EA7u x\xE1c nh\u1EADn c\u1EADp nh\u1EADt gi\xE1 r\xF5 r\xE0ng \u0111\u1EC3 tr\xE1nh sai l\u1EC7ch c\xF4ng n\u1EE3."
      );
    }
    const newService = await getDocById(COL_SERVICES, patch.serviceId);
    if (!newService) throw new Error("D\u1ECBch v\u1EE5 m\u1EDBi kh\xF4ng t\u1ED3n t\u1EA1i.");
    serviceNameSnapshot = newService.name;
    serviceConditionsSnapshot = newService.conditions;
    action = "order_service_change";
  }
  const nextBillingType = patch.billingType ?? existing.billingType;
  const nextRecurring = nextBillingType === "monthly" ? patch.recurringPriceVnd !== void 0 ? patch.recurringPriceVnd : existing.recurringPriceVnd : null;
  if (nextBillingType === "monthly" && (nextRecurring === null || nextRecurring === void 0)) {
    throw new Error("\u0110\u01A1n thu h\xE0ng th\xE1ng b\u1EAFt bu\u1ED9c ph\u1EA3i c\xF3 gi\xE1 k\u1EF3 sau.");
  }
  const nextAccountSlot = patch.accountSlot !== void 0 ? patch.accountSlot : existing.accountSlot;
  const nextAdminDeliveryNote = patch.adminDeliveryNote !== void 0 ? patch.adminDeliveryNote : existing.adminDeliveryNote || "";
  const nextAdminAttachments = patch.adminAttachments !== void 0 ? patch.adminAttachments : existing.adminAttachments || [];
  const nextFulfillment = patch.fulfillmentStatus ?? (existing.fulfillmentStatus === "pending_delivery" && (nextAccountSlot.trim().length > 0 || nextAdminDeliveryNote.trim().length > 0 || nextAdminAttachments.length > 0) ? "delivered" : existing.fulfillmentStatus);
  const justDeliveredOrUpdatedDelivery = nextFulfillment === "delivered" && (existing.fulfillmentStatus !== "delivered" || patch.accountSlot !== void 0 || patch.adminDeliveryNote !== void 0 || patch.adminAttachments !== void 0);
  if (patch.stopDate !== void 0 && patch.stopDate !== existing.stopDate && action === "order_update") {
    action = "order_stop";
  } else if (justDeliveredOrUpdatedDelivery && action === "order_update") {
    action = "order_deliver";
  }
  const nextDurationValue = patch.durationValue !== void 0 ? patch.durationValue : existing.durationValue;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    serviceId: patch.serviceId ?? existing.serviceId,
    serviceNameSnapshot,
    serviceConditionsSnapshot,
    accountSlot: nextAccountSlot,
    quantity: patch.quantity ?? existing.quantity,
    startDate: patch.startDate ?? existing.startDate,
    stopDate: patch.stopDate !== void 0 ? patch.stopDate : existing.stopDate,
    billingType: nextBillingType,
    firstCyclePriceVnd: patch.firstCyclePriceVnd ?? existing.firstCyclePriceVnd,
    recurringPriceVnd: nextRecurring,
    durationValue: nextDurationValue,
    durationUnit: nextDurationValue ? patch.durationUnit !== void 0 ? patch.durationUnit : existing.durationUnit : null,
    note: patch.note !== void 0 ? patch.note : existing.note,
    contactPhoneZalo: patch.contactPhoneZalo !== void 0 ? patch.contactPhoneZalo : existing.contactPhoneZalo,
    targetUpgradeEmail: patch.targetUpgradeEmail !== void 0 ? patch.targetUpgradeEmail : existing.targetUpgradeEmail,
    adminDeliveryNote: nextAdminDeliveryNote,
    adminAttachments: nextAdminAttachments,
    fulfillmentStatus: nextFulfillment,
    deliveredAt: nextFulfillment === "delivered" ? existing.deliveredAt || nowIso : existing.deliveredAt ?? null,
    studentNotificationUnread: justDeliveredOrUpdatedDelivery ? true : existing.studentNotificationUnread ?? false,
    updatedAt: nowIso
  };
  await saveDoc(COL_ORDERS, orderId, updated);
  await writeAuditLog({
    action,
    entityType: "order",
    entityId: orderId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: action === "order_service_change" ? `\u0110\u1ED5i d\u1ECBch v\u1EE5 \u0111\u01A1n ${updated.orderCode}: "${existing.serviceNameSnapshot}" \u2192 "${updated.serviceNameSnapshot}" (gi\xE1 k\u1EF3 \u0111\u1EA7u ${updated.firstCyclePriceVnd}\u0111).` : action === "order_stop" ? `C\u1EADp nh\u1EADt ng\xE0y d\u1EEBng \u0111\u01A1n ${updated.orderCode}: ${updated.stopDate || "M\u1EDF l\u1EA1i \u0111\u01A1n"}.` : action === "order_deliver" ? `Giao t\xE0i kho\u1EA3n/slot cho \u0111\u01A1n ${updated.orderCode}: ${updated.accountSlot}.` : `C\u1EADp nh\u1EADt \u0111\u01A1n h\xE0ng ${updated.orderCode}.`,
    before: existing,
    after: updated
  });
  if (justDeliveredOrUpdatedDelivery && updated.linkedUid) {
    await publishDeviceNotification({
      recipientUid: updated.linkedUid,
      type: "ai_order_delivered",
      title: `\u2705 \u0110\u01A1n ${updated.orderCode} \u0111\xE3 x\u1EED l\xFD xong!`,
      message: updated.adminDeliveryNote || `Admin \u0111\xE3 ho\xE0n t\u1EA5t b\xE0n giao "${updated.serviceNameSnapshot}". B\u1EA5m \u0111\u1EC3 xem t\xE0i kho\u1EA3n/slot & t\u1EC7p \u0111\xEDnh k\xE8m.`,
      route: "/student/ai-shop",
      actorName: actor.displayName || "Admin"
    });
  }
  invalidateAiShopCache();
  return updated;
}
async function createAiPayment(rawInput, actor) {
  const data = createPaymentSchema.parse(rawInput);
  return withIdempotency(data.idempotencyKey, "pay_create", async () => {
    const [order, existingPayments] = await Promise.all([
      getDocById(COL_ORDERS, data.orderId),
      listCollection(COL_PAYMENTS)
    ]);
    if (!order) throw new Error("Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng li\xEAn quan.");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = makeShortId("pay");
    const payment = {
      id,
      paymentCode: makePaymentCode(data.paidDate, existingPayments.length),
      orderId: order.id,
      customerId: order.customerId,
      linkedUid: order.linkedUid ?? null,
      paidDate: data.paidDate,
      amountVnd: data.amountVnd,
      method: data.method,
      note: data.note,
      status: "active",
      voidReason: null,
      voidedAt: null,
      voidedByUid: null,
      walletTransactionId: null,
      idempotencyKey: data.idempotencyKey ?? null,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now
    };
    await saveDoc(COL_PAYMENTS, id, payment);
    await writeAuditLog({
      action: "payment_create",
      entityType: "payment",
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Thu ${payment.amountVnd}\u0111 cho \u0111\u01A1n ${order.orderCode} ng\xE0y ${payment.paidDate} (${payment.method}).`,
      after: payment
    });
    invalidateAiShopCache();
    return payment;
  });
}
async function updateAiPayment(paymentId, rawInput, actor) {
  const existing = await getDocById(COL_PAYMENTS, paymentId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch thu ti\u1EC1n.");
  if (existing.status === "voided") {
    throw new Error("Kh\xF4ng th\u1EC3 ch\u1EC9nh s\u1EEDa giao d\u1ECBch \u0111\xE3 h\u1EE7y.");
  }
  const patch = updatePaymentSchema.parse(rawInput);
  const updated = {
    ...existing,
    ...patch,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveDoc(COL_PAYMENTS, paymentId, updated);
  await writeAuditLog({
    action: "payment_update",
    entityType: "payment",
    entityId: paymentId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `S\u1EEDa giao d\u1ECBch ${updated.paymentCode}: ${existing.amountVnd}\u0111 \u2192 ${updated.amountVnd}\u0111 (${updated.paidDate}).`,
    before: existing,
    after: updated
  });
  invalidateAiShopCache();
  return updated;
}
async function voidAiPayment(paymentId, rawInput, actor) {
  const existing = await getDocById(COL_PAYMENTS, paymentId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y giao d\u1ECBch thu ti\u1EC1n.");
  if (existing.status === "voided") {
    return existing;
  }
  const { reason } = voidPaymentSchema.parse(rawInput);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updated = {
    ...existing,
    status: "voided",
    voidReason: reason,
    voidedAt: now,
    voidedByUid: actor.uid,
    updatedAt: now
  };
  await saveDoc(COL_PAYMENTS, paymentId, updated);
  await writeAuditLog({
    action: "payment_void",
    entityType: "payment",
    entityId: paymentId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `H\u1EE7y giao d\u1ECBch ${updated.paymentCode} (${updated.amountVnd}\u0111). L\xFD do: ${reason}`,
    before: existing,
    after: updated
  });
  invalidateAiShopCache();
  return updated;
}
async function importAiShopExcelRows(rawInput, actor) {
  const data = excelImportPayloadSchema.parse(rawInput);
  return withIdempotency(data.idempotencyKey, "excel_import", async () => {
    const [customers, services, orders, payments] = await Promise.all([
      listCollection(COL_CUSTOMERS),
      listCollection(COL_SERVICES),
      listCollection(COL_ORDERS),
      listCollection(COL_PAYMENTS)
    ]);
    const norm = (s) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    const customerByCode = /* @__PURE__ */ new Map();
    const customerByPhone = /* @__PURE__ */ new Map();
    const customerByEmail = /* @__PURE__ */ new Map();
    const customerByName = /* @__PURE__ */ new Map();
    for (const c of customers) {
      if (c.customerCode) customerByCode.set(c.customerCode.trim().toUpperCase(), c);
      if (c.phoneZalo) customerByPhone.set(norm(c.phoneZalo), c);
      if (c.email) customerByEmail.set(norm(c.email), c);
      customerByName.set(norm(c.fullName), c);
    }
    const serviceByNorm = /* @__PURE__ */ new Map();
    for (const s of services) {
      serviceByNorm.set(norm(s.name), s);
      serviceByNorm.set(norm(s.code), s);
    }
    const existingRowKeys = new Set(
      orders.map((o) => o.importRowKey).filter((k) => Boolean(k))
    );
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const todayVn = getTodayVnDate();
    let createdCustomers = 0;
    let createdServices = 0;
    let createdOrders = 0;
    let createdPayments = 0;
    let skippedDuplicateOrders = 0;
    let runningOrdersCount = orders.length;
    let runningPaymentsCount = payments.length;
    for (const row of data.rows) {
      if (existingRowKeys.has(row.importRowKey)) {
        skippedDuplicateOrders++;
        continue;
      }
      let customer = row.customerCode && customerByCode.get(row.customerCode.toUpperCase()) || row.phoneZalo && customerByPhone.get(norm(row.phoneZalo)) || row.email && customerByEmail.get(norm(row.email)) || (!row.phoneZalo && !row.email ? customerByName.get(norm(row.fullName)) : void 0) || null;
      if (!customer) {
        const custId = makeShortId("cust");
        const code = nextCustomerCode(customers);
        customer = {
          id: custId,
          customerCode: code,
          fullName: row.fullName,
          phoneZalo: row.phoneZalo,
          email: row.email,
          otherContact: "",
          note: "Nh\u1EADp t\u1EEB Excel",
          linkedUid: null,
          status: "active",
          createdAt: now,
          updatedAt: now,
          archivedAt: null
        };
        await saveDoc(COL_CUSTOMERS, custId, customer);
        customers.push(customer);
        customerByCode.set(code, customer);
        if (customer.phoneZalo) customerByPhone.set(norm(customer.phoneZalo), customer);
        if (customer.email) customerByEmail.set(norm(customer.email), customer);
        customerByName.set(norm(customer.fullName), customer);
        createdCustomers++;
      }
      let service = row.matchedServiceId && services.find((s) => s.id === row.matchedServiceId) || serviceByNorm.get(norm(row.serviceName)) || null;
      if (!service) {
        const svcId = makeShortId("svc");
        service = {
          id: svcId,
          code: makeServiceCode(row.serviceName),
          name: row.serviceName,
          billingType: row.billingType,
          defaultFirstPriceVnd: row.firstCyclePriceVnd,
          defaultRecurringPriceVnd: row.billingType === "monthly" ? row.recurringPriceVnd : null,
          durationValue: row.billingType === "monthly" ? 1 : null,
          durationUnit: row.billingType === "monthly" ? "months" : null,
          conditions: "T\u1EA1o t\u1EF1 \u0111\u1ED9ng t\u1EEB nh\u1EADp Excel",
          status: "active",
          studentVisible: false,
          sortOrder: services.length + 1,
          createdAt: now,
          updatedAt: now
        };
        await saveDoc(COL_SERVICES, svcId, service);
        services.push(service);
        serviceByNorm.set(norm(service.name), service);
        createdServices++;
      }
      const ordId = makeShortId("ord");
      const order = {
        id: ordId,
        orderCode: makeOrderCode(todayVn, runningOrdersCount++),
        customerId: customer.id,
        customerCodeSnapshot: customer.customerCode,
        linkedUid: customer.linkedUid ?? null,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        serviceConditionsSnapshot: service.conditions,
        accountSlot: row.accountSlot,
        quantity: row.quantity,
        startDate: row.startDate,
        stopDate: row.stopDate,
        billingType: row.billingType,
        firstCyclePriceVnd: row.firstCyclePriceVnd,
        recurringPriceVnd: row.billingType === "monthly" ? row.recurringPriceVnd ?? row.firstCyclePriceVnd : null,
        durationValue: service.durationValue,
        durationUnit: service.durationUnit,
        note: row.note,
        source: "excel_import",
        fulfillmentStatus: row.accountSlot ? "delivered" : "pending_delivery",
        importRowKey: row.importRowKey,
        idempotencyKey: null,
        createdByUid: actor.uid,
        createdAt: now,
        updatedAt: now
      };
      await saveDoc(COL_ORDERS, ordId, order);
      existingRowKeys.add(row.importRowKey);
      createdOrders++;
      if (row.paidAmountVnd > 0) {
        const payId = makeShortId("pay");
        const paidDate = row.paidDate || row.startDate;
        const payment = {
          id: payId,
          paymentCode: makePaymentCode(paidDate, runningPaymentsCount++),
          orderId: order.id,
          customerId: customer.id,
          linkedUid: customer.linkedUid ?? null,
          paidDate,
          amountVnd: row.paidAmountVnd,
          method: "bank_transfer",
          note: "Thu ti\u1EC1n nh\u1EADp t\u1EEB Excel",
          status: "active",
          voidReason: null,
          voidedAt: null,
          voidedByUid: null,
          walletTransactionId: null,
          idempotencyKey: null,
          createdByUid: actor.uid,
          createdAt: now,
          updatedAt: now
        };
        await saveDoc(COL_PAYMENTS, payId, payment);
        createdPayments++;
      }
    }
    await writeAuditLog({
      action: "excel_import",
      entityType: "import",
      entityId: makeShortId("imp"),
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Nh\u1EADp Excel: +${createdCustomers} kh\xE1ch, +${createdOrders} \u0111\u01A1n, +${createdPayments} giao d\u1ECBch (b\u1ECF qua ${skippedDuplicateOrders} \u0111\u01A1n tr\xF9ng).`,
      after: {
        createdCustomers,
        createdServices,
        createdOrders,
        createdPayments,
        skippedDuplicateOrders
      }
    });
    invalidateAiShopCache();
    return {
      createdCustomers,
      createdServices,
      createdOrders,
      createdPayments,
      skippedDuplicateOrders
    };
  });
}

// server/routes/aiShopAdminRoutes.ts
var aiShopAdminRouter = Router();
function formatError(err) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return {
      status: 400,
      error: "validation_error",
      message: first?.message || "D\u1EEF li\u1EC7u \u0111\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "ai_shop_error",
    message: err?.message || "\u0110\xE3 c\xF3 l\u1ED7i x\u1EA3y ra."
  };
}
aiShopAdminRouter.get("/bootstrap", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const data = await getAdminAiShopBootstrap(force);
    return res.json({ success: true, ...data });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status >= 400 ? e.status : 500).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/services/seed", async (req, res) => {
  try {
    const services = await ensureInitialServicesSeeded(
      req.user.uid,
      req.user.displayName || req.user.email || "Admin"
    );
    return res.json({ success: true, services });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/services", async (req, res) => {
  try {
    const service = await createAiService(req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.status(201).json({ success: true, service });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.patch("/services/:id", async (req, res) => {
  try {
    const service = await updateAiService(req.params.id, req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, service });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/customers", async (req, res) => {
  try {
    const customer = await createAiCustomer(req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.status(201).json({ success: true, customer });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.patch("/customers/:id", async (req, res) => {
  try {
    const customer = await updateAiCustomer(req.params.id, req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, customer });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/customers/:id/archive", async (req, res) => {
  try {
    const archive = req.body?.archive !== false;
    const customer = await archiveOrRestoreAiCustomer(req.params.id, archive, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, customer });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.delete("/customers/:id", async (req, res) => {
  try {
    await deleteAiCustomerSafely(req.params.id, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/orders", async (req, res) => {
  try {
    const order = await createAiOrder(req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.status(201).json({ success: true, order });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.patch("/orders/:id", async (req, res) => {
  try {
    const order = await updateAiOrder(req.params.id, req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, order });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/payments", async (req, res) => {
  try {
    const payment = await createAiPayment(req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.status(201).json({ success: true, payment });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.patch("/payments/:id", async (req, res) => {
  try {
    const payment = await updateAiPayment(req.params.id, req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, payment });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/payments/:id/void", async (req, res) => {
  try {
    const payment = await voidAiPayment(req.params.id, req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, payment });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
aiShopAdminRouter.post("/import", async (req, res) => {
  try {
    const result = await importAiShopExcelRows(req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const e = formatError(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// server/routes/minigameAdminRoutes.ts
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
var RACE_CHECKPOINTS = 12;
function createSeededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seededShuffle(items, seed) {
  const arr = [...items];
  const rng = createSeededRng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function simulateRaceHeat(laneUids, seed, durationMs = 14e3) {
  const rng = createSeededRng(seed ^ 2654435769);
  const n = laneUids.length;
  if (n === 0) {
    return { finishOrder: [], finishTimesMs: {}, speedProfiles: {} };
  }
  const shuffledOrder = seededShuffle(laneUids, seed + 17);
  const winnerTime = Math.round(durationMs * (0.86 + rng() * 0.04));
  const finishTimesMs = {};
  let prevTime = winnerTime;
  shuffledOrder.forEach((uid, idx) => {
    if (idx === 0) {
      finishTimesMs[uid] = winnerTime;
    } else {
      const gap = idx <= 2 ? Math.round(110 + rng() * 230) : Math.round(150 + rng() * 340);
      prevTime = Math.min(durationMs, prevTime + gap);
      finishTimesMs[uid] = prevTime;
    }
  });
  const finishOrder = [...laneUids].sort((a, b) => finishTimesMs[a] - finishTimesMs[b]);
  const speedProfiles = {};
  for (const uid of laneUids) {
    const rankIdx = finishOrder.indexOf(uid);
    const archetype = rng();
    const weights = [];
    for (let seg = 0; seg < RACE_CHECKPOINTS; seg++) {
      const frac = seg / (RACE_CHECKPOINTS - 1);
      let base = 1;
      if (archetype < 0.33) {
        base = 1.22 - frac * 0.34;
      } else if (archetype < 0.66) {
        base = 0.88 + Math.sin(frac * Math.PI) * 0.36;
      } else {
        base = 0.78 + Math.pow(frac, 1.8) * 0.58;
      }
      if (rankIdx <= 2 && seg >= 8) {
        base += 0.14 + rng() * 0.12;
      }
      const noise = 0.76 + rng() * 0.48;
      weights.push(Math.max(0.35, base * noise));
    }
    const sum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    const cumulative = [];
    for (let i = 0; i < RACE_CHECKPOINTS; i++) {
      acc += weights[i] / sum;
      cumulative.push(i === RACE_CHECKPOINTS - 1 ? 1 : Number(acc.toFixed(4)));
    }
    speedProfiles[uid] = cumulative;
  }
  return { finishOrder, finishTimesMs, speedProfiles };
}
function getRoundLabel(totalRacersInRound, heatCount, heatIndex) {
  if (heatCount === 1) return "Chung K\u1EBFt";
  if (heatCount === 2) return `B\xE1n K\u1EBFt \u2014 L\u01B0\u1EE3t ${heatIndex + 1}`;
  if (heatCount === 4 && totalRacersInRound >= 16) return `V\xF2ng Lo\u1EA1i \u2014 B\u1EA3ng ${heatIndex + 1}`;
  return `V\xF2ng Lo\u1EA1i \u2014 L\u01B0\u1EE3t ${heatIndex + 1}`;
}
function buildInitialRaceHeats(participantUids, racersPerHeat, seed, durationMs = 14e3) {
  const unique = Array.from(new Set(participantUids));
  if (unique.length < 2) {
    throw new Error("C\u1EA7n \xEDt nh\u1EA5t 2 ng\u01B0\u1EDDi tham gia \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u v\xF2ng \u0111ua.");
  }
  const perHeat = Math.max(2, Math.min(8, Math.trunc(racersPerHeat) || 4));
  const shuffled = seededShuffle(unique, seed);
  const heatCount = shuffled.length <= perHeat ? 1 : Math.max(1, Math.min(Math.ceil(shuffled.length / perHeat), Math.floor(shuffled.length / 2)));
  if (heatCount === 1) {
    return [
      {
        heatId: "r0_h0",
        roundIndex: 0,
        roundName: "Chung K\u1EBFt",
        heatIndex: 0,
        isFinal: true,
        status: "pending",
        laneUids: shuffled,
        advanceCount: shuffled.length,
        seed: seed + 101,
        startAtMs: null,
        durationMs,
        finishOrder: [],
        finishTimesMs: {},
        speedProfiles: {}
      }
    ];
  }
  const heats = [];
  const baseSize = Math.floor(shuffled.length / heatCount);
  const remainder = shuffled.length % heatCount;
  const advancePerHeat = Math.max(
    1,
    Math.min(
      Math.floor(baseSize / 2),
      perHeat >= 8 && heatCount === 2 ? 4 : 2
    )
  );
  let cursor = 0;
  for (let h = 0; h < heatCount; h++) {
    const size = baseSize + (h < remainder ? 1 : 0);
    const laneUids = shuffled.slice(cursor, cursor + size);
    cursor += size;
    heats.push({
      heatId: `r0_h${h}`,
      roundIndex: 0,
      roundName: getRoundLabel(shuffled.length, heatCount, h),
      heatIndex: h,
      isFinal: false,
      status: "pending",
      laneUids,
      advanceCount: Math.min(advancePerHeat, Math.max(1, laneUids.length - 1)),
      seed: seed + (h + 1) * 131,
      startAtMs: null,
      durationMs,
      finishOrder: [],
      finishTimesMs: {},
      speedProfiles: {}
    });
  }
  return heats;
}
function buildFullTournamentRanking(heats) {
  const maxRound = Math.max(...heats.map((h) => h.roundIndex));
  const ranked = [];
  const seen = /* @__PURE__ */ new Set();
  for (let r = maxRound; r >= 0; r--) {
    const roundHeats = heats.filter((h) => h.roundIndex === r);
    const entries = [];
    for (const h of roundHeats) {
      h.finishOrder.forEach((uid, pos) => {
        if (!seen.has(uid)) {
          entries.push({
            uid,
            pos,
            timeMs: h.finishTimesMs[uid] ?? Number.MAX_SAFE_INTEGER
          });
        }
      });
    }
    entries.sort((a, b) => a.pos - b.pos || a.timeMs - b.timeMs);
    for (const e of entries) {
      if (!seen.has(e.uid)) {
        seen.add(e.uid);
        ranked.push(e.uid);
      }
    }
  }
  return ranked;
}
function advanceRaceTournamentIfReady(heats, racersPerHeat, seed, durationMs = 14e3) {
  if (heats.length === 0) {
    return { heats, tournamentFinished: false, podiumUids: [], rankedUids: [] };
  }
  const maxRound = Math.max(...heats.map((h) => h.roundIndex));
  const currentRoundHeats = heats.filter((h) => h.roundIndex === maxRound).sort((a, b) => a.heatIndex - b.heatIndex);
  const allCompleted = currentRoundHeats.every((h) => h.status === "completed");
  if (!allCompleted) {
    return { heats, tournamentFinished: false, podiumUids: [], rankedUids: [] };
  }
  if (currentRoundHeats.length === 1 && currentRoundHeats[0].isFinal) {
    const rankedUids = buildFullTournamentRanking(heats);
    const podiumUids = currentRoundHeats[0].finishOrder.slice(0, 3);
    return { heats, tournamentFinished: true, podiumUids, rankedUids };
  }
  const qualifiers = [];
  for (const h of currentRoundHeats) {
    qualifiers.push(...h.finishOrder.slice(0, h.advanceCount));
  }
  const nextRound = maxRound + 1;
  const perHeat = Math.max(2, Math.min(8, Math.trunc(racersPerHeat) || 4));
  const nextHeats = [];
  const heatCount = qualifiers.length <= perHeat ? 1 : Math.max(1, Math.min(Math.ceil(qualifiers.length / perHeat), Math.floor(qualifiers.length / 2)));
  if (heatCount === 1) {
    nextHeats.push({
      heatId: `r${nextRound}_h0`,
      roundIndex: nextRound,
      roundName: "Chung K\u1EBFt",
      heatIndex: 0,
      isFinal: true,
      status: "pending",
      laneUids: qualifiers,
      advanceCount: qualifiers.length,
      seed: seed + nextRound * 997,
      startAtMs: null,
      durationMs,
      finishOrder: [],
      finishTimesMs: {},
      speedProfiles: {}
    });
  } else {
    const baseSize = Math.floor(qualifiers.length / heatCount);
    const remainder = qualifiers.length % heatCount;
    const advancePerHeat = Math.max(
      1,
      Math.min(
        Math.floor(baseSize / 2),
        perHeat >= 8 && heatCount === 2 ? 4 : 2
      )
    );
    let cursor = 0;
    for (let h = 0; h < heatCount; h++) {
      const size = baseSize + (h < remainder ? 1 : 0);
      const laneUids = qualifiers.slice(cursor, cursor + size);
      cursor += size;
      nextHeats.push({
        heatId: `r${nextRound}_h${h}`,
        roundIndex: nextRound,
        roundName: getRoundLabel(qualifiers.length, heatCount, h),
        heatIndex: h,
        isFinal: false,
        status: "pending",
        laneUids,
        advanceCount: Math.min(advancePerHeat, Math.max(1, laneUids.length - 1)),
        seed: seed + nextRound * 997 + (h + 1) * 53,
        startAtMs: null,
        durationMs,
        finishOrder: [],
        finishTimesMs: {},
        speedProfiles: {}
      });
    }
  }
  return {
    heats: [...heats, ...nextHeats],
    tournamentFinished: false,
    podiumUids: [],
    rankedUids: []
  };
}

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
var TREASURE_WINNING_COUNT = 2;
function getDefaultRankLabel(rank) {
  if (rank === 0) return "Gi\u1EA3i \u0111\u1ED3ng h\u1EA1ng";
  if (rank === 1) return "Gi\u1EA3i Nh\u1EA5t";
  if (rank === 2) return "Gi\u1EA3i Nh\xEC";
  if (rank === 3) return "Gi\u1EA3i Ba";
  if (rank === 4) return "Gi\u1EA3i T\u01B0";
  if (rank === 5) return "Gi\u1EA3i N\u0103m";
  return `Gi\u1EA3i H\u1EA1ng #${rank}`;
}
function buildRaceWinners(rankedUids, participants, prizes, finalFinishTimesMs) {
  const winners = [];
  rankedUids.forEach((uid, idx) => {
    const rank = idx + 1;
    const p = participants[uid];
    if (!p) return;
    const exactPrize = prizes.find((pr) => pr.rank === rank) || null;
    const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    const timeSec = finalFinishTimesMs[uid] ? `${(finalFinishTimesMs[uid] / 1e3).toFixed(2)}s` : "";
    winners.push({
      uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? rank : 0,
      prizeLabel: prize.label || getDefaultRankLabel(exactPrize ? rank : 0),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `V\u1EC1 \u0111\xEDch h\u1EA1ng #${rank}${timeSec ? ` (${timeSec})` : ""}`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return winners;
}
function evaluateTaiXiuWinners(dice, participants, prizes, revealedAtMs) {
  const sum = dice[0] + dice[1] + dice[2];
  const outcome = sum >= 11 ? "tai" : "xiu";
  const result = {
    revealedAtMs,
    dice,
    diceSum: sum,
    taiXiuOutcome: outcome
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };
  const matched = Object.values(participants).filter((p) => p.prediction === outcome).sort((a, b) => a.joinedAt - b.joinedAt);
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Ng\u01B0\u1EDDi d\u1EF1 \u0111o\xE1n \u0111\xFAng"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `\u0110o\xE1n \u0111\xFAng ${outcome === "tai" ? "T\xC0I" : "X\u1EC8U"} (T\u1ED5ng ${sum})`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return { result, winners };
}
function evaluateBauCuaWinners(faces, participants, prizes, revealedAtMs) {
  const result = {
    revealedAtMs,
    bauCuaFaces: faces
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };
  const faceLabel = (f) => BAU_CUA_FACES.find((x) => x.id === f)?.label || f;
  const matched = Object.values(participants).map((p) => {
    const count = faces.filter((f) => f === p.prediction).length;
    return { p, count };
  }).filter((item) => item.count > 0).sort((a, b) => b.count - a.count || a.p.joinedAt - b.p.joinedAt);
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners = [];
  matched.forEach(({ p, count }, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Tr\xFAng B\u1EA7u Cua"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Tr\xFAng ${faceLabel(p.prediction || "")} (x${count} vi\xEAn)`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return { result, winners };
}
function evaluateLuckyNumberWinners(luckyNumber, participants, prizes, revealedAtMs) {
  const cleanTarget = Math.max(0, Math.min(99, Math.trunc(luckyNumber)));
  const result = {
    revealedAtMs,
    luckyNumber: cleanTarget
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };
  const exactMatches = Object.values(participants).filter((p) => {
    if (p.prediction === void 0 || !/^\d{1,2}$/.test(p.prediction)) return false;
    return Number(p.prediction) === cleanTarget;
  }).sort((a, b) => a.joinedAt - b.joinedAt);
  const targetFormatted = String(cleanTarget).padStart(2, "0");
  const winners = [];
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  exactMatches.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Tr\xFAng S\u1ED1 May M\u1EAFn"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `\u0110o\xE1n tr\xFAng ch\xEDnh x\xE1c s\u1ED1 ${targetFormatted}!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return { result, winners };
}
function evaluateLuckyWheelWinners(sectorIndex, participants, prizes, revealedAtMs) {
  const safeIdx = (Math.trunc(sectorIndex) % LUCKY_WHEEL_SECTORS.length + LUCKY_WHEEL_SECTORS.length) % LUCKY_WHEEL_SECTORS.length;
  const sector = LUCKY_WHEEL_SECTORS[safeIdx];
  const result = {
    revealedAtMs,
    wheelSectorIndex: safeIdx,
    wheelSectorId: sector.id,
    wheelSectorLabel: `${sector.emoji} ${sector.label}`
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };
  const matched = Object.values(participants).filter((p) => p.prediction === sector.id).sort((a, b) => a.joinedAt - b.joinedAt);
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Tr\xFAng V\xF2ng Quay"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `Tr\xFAng \xF4 ${sector.emoji} ${sector.label}!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return { result, winners };
}
function evaluateTreasureFlipWinners(winningIndices, participants, prizes, revealedAtMs) {
  const uniqueSorted = Array.from(
    new Set(
      winningIndices.map((n) => Math.trunc(Number(n))).filter((n) => n >= 1 && n <= TREASURE_CHEST_COUNT)
    )
  ).sort((a, b) => a - b);
  const result = {
    revealedAtMs,
    treasureWinningIndices: uniqueSorted
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };
  const winSet = new Set(uniqueSorted.map(String));
  const matched = Object.values(participants).filter((p) => p.prediction && winSet.has(String(p.prediction))).sort((a, b) => a.joinedAt - b.joinedAt);
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Tr\xFAng Kho B\xE1u V\xE0ng"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `M\u1EDF tr\xFAng R\u01B0\u01A1ng Kho B\xE1u #${p.prediction}!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return { result, winners };
}
function evaluateMysteryBoxWinners(winningBox, participants, prizes, revealedAtMs) {
  const cleanBox = Math.max(1, Math.min(MYSTERY_BOXES.length, Math.trunc(winningBox)));
  const boxMeta = MYSTERY_BOXES.find((b) => b.boxNumber === cleanBox) || MYSTERY_BOXES[0];
  const result = {
    revealedAtMs,
    mysteryWinningBox: cleanBox
  };
  if (!prizes || prizes.length === 0) return { result, winners: [] };
  const matched = Object.values(participants).filter((p) => String(p.prediction) === String(cleanBox)).sort((a, b) => a.joinedAt - b.joinedAt);
  const collectivePrize = prizes.find((pr) => pr.rank === 0) || null;
  const winners = [];
  matched.forEach((p, idx) => {
    const pos = idx + 1;
    const exactPrize = prizes.find((pr) => pr.rank === pos) || null;
    const prize = exactPrize || collectivePrize;
    if (!prize) return;
    winners.push({
      uid: p.uid,
      displayName: p.displayName,
      isBot: Boolean(p.isBot),
      rank: exactPrize ? pos : 0,
      prizeLabel: prize.label || (exactPrize ? getDefaultRankLabel(pos) : "Tr\xFAng H\u1ED9p B\xED \u1EA8n"),
      prizeType: prize.type,
      amountVnd: prize.amountVnd,
      voucherCode: prize.voucherCode,
      customTitle: prize.customTitle,
      matchDetail: `\u0110\u1EADp tr\xFAng ${boxMeta.label} (#${cleanBox})!`,
      distributed: false,
      distributedAt: null,
      walletTransactionId: null
    });
  });
  return { result, winners };
}

// server/services/minigameService.ts
var COL_MINIGAMES = "minigame_events";
var liveCheersByEvent = /* @__PURE__ */ new Map();
var LIVE_CHAT_TTL_MS = 6 * 60 * 60 * 1e3;
var BOT_NAMES = [
  "Ng\u1EF1a Chi\u1EBFn \u0110\u1ECF",
  "Tia Ch\u1EDBp V\xE0ng",
  "B\xE3o T\u1ED1 Xanh",
  "Sao B\u0103ng",
  "H\u1ECFa Long",
  "B\u1EA1ch M\xE3",
  "H\u1EAFc Long",
  "Phong Th\u1EA7n",
  "L\xF4i V\u0169",
  "Th\u1EA7n T\u1ED1c",
  "Si\xEAu Ong M\u1EADt",
  "Ho\xE0ng Kim",
  "B\u1EA1ch H\u1ED5",
  "Thanh Long",
  "Chu T\u01B0\u1EDBc",
  "Huy\u1EC1n V\u0169",
  "Minh Kh\xF4i",
  "Gia Huy",
  "Kh\xE1nh Linh",
  "Th\u1EA3o Vy",
  "Anh Tu\u1EA5n",
  "B\u1EA3o Ng\u1ECDc",
  "\u0110\u1EE9c Anh",
  "H\u1EA3i \u0110\u0103ng",
  "Lan Anh",
  "Qu\u1ED1c B\u1EA3o",
  "Thanh Tr\xFAc",
  "Nh\u1EADt Minh",
  "Ph\u01B0\u01A1ng Nhi",
  "Tu\u1EA5n Ki\u1EC7t",
  "M\u1EF9 Duy\xEAn",
  "V\u0103n Ki\xEAn"
];
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
async function deleteEventRaw(id) {
  if (adminDb) {
    await adminDb.collection(COL_MINIGAMES).doc(id).delete();
  } else {
    await deleteFirestoreRestDoc(COL_MINIGAMES, id);
  }
}
function makeEventCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MG";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto2.randomInt(0, chars.length)];
  }
  return code;
}
function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto2.randomBytes(3).toString("hex")}`;
}
function isRaceGame(type) {
  return type === "horse_race" || type === "bee_race";
}
function normalizeScheduleFields(input) {
  let startIso = null;
  if (input.scheduledStartAt) {
    const ms = Date.parse(input.scheduledStartAt);
    if (!Number.isFinite(ms)) {
      throw new Error("Th\u1EDDi gian b\u1EAFt \u0111\u1EA7u s\u1EF1 ki\u1EC7n kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    startIso = new Date(ms).toISOString();
  }
  let endIso = null;
  if (input.scheduledEndAt) {
    const ms = Date.parse(input.scheduledEndAt);
    if (!Number.isFinite(ms)) {
      throw new Error("Th\u1EDDi gian k\u1EBFt th\xFAc s\u1EF1 ki\u1EC7n kh\xF4ng h\u1EE3p l\u1EC7.");
    }
    endIso = new Date(ms).toISOString();
  }
  const durationMinutes = typeof input.durationMinutes === "number" && input.durationMinutes > 0 ? Math.trunc(input.durationMinutes) : null;
  if (!endIso && durationMinutes) {
    const baseMs = startIso ? Date.parse(startIso) : Date.now();
    endIso = new Date(baseMs + durationMinutes * 6e4).toISOString();
  }
  if (startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)) {
    throw new Error("Th\u1EDDi gian k\u1EBFt th\xFAc ph\u1EA3i l\u1EDBn h\u01A1n th\u1EDDi gian b\u1EAFt \u0111\u1EA7u.");
  }
  return {
    scheduledStartAt: startIso,
    scheduledEndAt: endIso,
    durationMinutes
  };
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
async function createMinigameEvent(rawInput, actor) {
  const data = createMinigameSchema.parse(rawInput);
  let maxParticipants = data.maxParticipants;
  let racersPerHeat = data.racersPerHeat;
  if (isRaceGame(data.gameType)) {
    maxParticipants = Math.max(2, Math.min(64, Math.trunc(maxParticipants) || 2));
    racersPerHeat = Math.max(2, Math.min(8, Math.trunc(racersPerHeat) || 4));
    if (racersPerHeat > maxParticipants) racersPerHeat = maxParticipants;
  }
  const schedule = normalizeScheduleFields({
    scheduledStartAt: data.scheduledStartAt,
    scheduledEndAt: data.scheduledEndAt,
    durationMinutes: data.durationMinutes
  });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = makeId("mg");
  const event = {
    id,
    eventCode: makeEventCode(),
    title: data.title,
    description: data.description,
    gameType: data.gameType,
    status: "lobby",
    entryFeeVnd: 0,
    // Strictly free welfare event!
    maxParticipants,
    racersPerHeat,
    prizes: data.prizes,
    participants: {},
    heats: [],
    activeHeatId: null,
    partyResult: null,
    winners: [],
    prizesDistributedAt: null,
    scheduledStartAt: schedule.scheduledStartAt,
    scheduledEndAt: schedule.scheduledEndAt,
    durationMinutes: schedule.durationMinutes,
    raceDurationMs: data.raceDurationMs || 14e3,
    revealDurationMs: data.revealDurationMs || 3800,
    chatEnabled: data.chatEnabled !== false,
    createdByUid: actor.uid,
    createdByName: actor.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn",
    createdAt: now,
    updatedAt: now
  };
  await saveEventRaw(event);
  await publishDeviceNotification({
    recipientUid: "all",
    type: "minigame_event",
    title: `\u{1F389} Minigame m\u1EDBi: ${event.title}`,
    message: `Tham gia MI\u1EC4N PH\xCD 100% \u2014 nh\u1EADn qu\xE0 ph\xFAc l\u1EE3i tr\u1EF1c ti\u1EBFp t\u1EEB Admin! (${event.eventCode})`,
    route: `/student/minigame/${event.id}`,
    actorName: event.createdByName
  });
  return event;
}
async function updateMinigameSchedule(eventId, rawInput) {
  const data = updateMinigameScheduleSchema.parse(rawInput || {});
  const event = await getMinigameEvent(eventId);
  const schedule = normalizeScheduleFields({
    scheduledStartAt: data.scheduledStartAt !== void 0 ? data.scheduledStartAt : event.scheduledStartAt,
    scheduledEndAt: data.scheduledEndAt !== void 0 ? data.scheduledEndAt : event.scheduledEndAt,
    durationMinutes: data.durationMinutes !== void 0 ? data.durationMinutes : event.durationMinutes
  });
  const updated = {
    ...event,
    scheduledStartAt: schedule.scheduledStartAt,
    scheduledEndAt: schedule.scheduledEndAt,
    durationMinutes: schedule.durationMinutes,
    raceDurationMs: data.raceDurationMs ?? event.raceDurationMs ?? 14e3,
    revealDurationMs: data.revealDurationMs ?? event.revealDurationMs ?? 3800,
    chatEnabled: data.chatEnabled !== void 0 ? data.chatEnabled : event.chatEnabled !== false,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function fillMinigameWithBots(eventId, options) {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Ch\u1EC9 c\xF3 th\u1EC3 th\xEAm Bot \u1EA3o khi ph\xF2ng \u0111ang \u1EDF tr\u1EA1ng th\xE1i ch\u1EDD \u0111\u0103ng k\xFD.");
  }
  const participants = options?.clearFirst ? Object.fromEntries(
    Object.entries(event.participants || {}).filter(([, p]) => !p.isBot)
  ) : { ...event.participants || {} };
  const currentCount = Object.keys(participants).length;
  const remaining = Math.max(0, event.maxParticipants - currentCount);
  const toAdd = typeof options?.count === "number" && options.count > 0 ? Math.min(remaining, Math.trunc(options.count)) : remaining;
  if (toAdd <= 0) {
    return event;
  }
  const allFaces = BAU_CUA_FACES.map((f) => f.id);
  const baseNow = Date.now();
  for (let i = 0; i < toAdd; i++) {
    const idx = currentCount + i;
    const botUid = `bot_${event.id.slice(-5)}_${idx + 1}_${crypto2.randomBytes(2).toString("hex")}`;
    const botName = `\u{1F916} ${BOT_NAMES[idx % BOT_NAMES.length]} #${idx + 1}`;
    let prediction;
    if (event.gameType === "tai_xiu") {
      prediction = crypto2.randomInt(0, 2) === 0 ? "tai" : "xiu";
    } else if (event.gameType === "bau_cua") {
      prediction = allFaces[crypto2.randomInt(0, allFaces.length)];
    } else if (event.gameType === "lucky_number") {
      prediction = String(crypto2.randomInt(0, 100)).padStart(2, "0");
    } else if (event.gameType === "lucky_wheel") {
      prediction = LUCKY_WHEEL_SECTORS[crypto2.randomInt(0, LUCKY_WHEEL_SECTORS.length)].id;
    } else if (event.gameType === "treasure_flip") {
      prediction = String(crypto2.randomInt(1, TREASURE_CHEST_COUNT + 1));
    } else if (event.gameType === "mystery_box") {
      prediction = String(crypto2.randomInt(1, MYSTERY_BOXES.length + 1));
    }
    participants[botUid] = {
      uid: botUid,
      displayName: botName,
      joinedAt: baseNow + i * 25,
      isBot: true,
      ...prediction !== void 0 ? { prediction } : {},
      racerColor: RACER_PALETTE[idx % RACER_PALETTE.length],
      racerNumber: idx + 1
    };
  }
  const updated = {
    ...event,
    participants,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function clearMinigameBots(eventId) {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("Ch\u1EC9 c\xF3 th\u1EC3 x\xF3a Bot \u1EA3o khi ph\xF2ng \u0111ang \u1EDF tr\u1EA1ng th\xE1i ch\u1EDD.");
  }
  const realOnly = Object.fromEntries(
    Object.entries(event.participants || {}).filter(([, p]) => !p.isBot)
  );
  const updated = {
    ...event,
    participants: realOnly,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function resetMinigameForDemo(eventId) {
  const event = await getMinigameEvent(eventId);
  const hasRealPaidWinners = (event.winners || []).some(
    (w) => !w.isBot && w.distributed && w.prizeType === "wallet_vnd"
  );
  if (hasRealPaidWinners) {
    throw new Error("Kh\xF4ng th\u1EC3 \u0111\u1EB7t l\u1EA1i s\u1EF1 ki\u1EC7n \u0111\xE3 c\u1ED9ng th\u01B0\u1EDFng ti\u1EC1n th\u1EADt cho h\u1ECDc sinh.");
  }
  const updated = {
    ...event,
    status: "lobby",
    heats: [],
    activeHeatId: null,
    partyResult: null,
    winners: [],
    prizesDistributedAt: null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function startMinigameEvent(eventId) {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "lobby") {
    throw new Error("S\u1EF1 ki\u1EC7n kh\xF4ng \u1EDF tr\u1EA1ng th\xE1i m\u1EDF \u0111\u0103ng k\xFD.");
  }
  const participantUids = Object.keys(event.participants || {});
  if (isRaceGame(event.gameType)) {
    if (participantUids.length < 2) {
      throw new Error("C\u1EA7n \xEDt nh\u1EA5t 2 ng\u01B0\u1EDDi ch\u01A1i \u0111\u0103ng k\xFD \u0111\u1EC3 m\u1EDF \u0111\u01B0\u1EDDng \u0111ua.");
    }
    const seed = crypto2.randomInt(1e5, 999999999);
    const raceDurationMs = Math.max(6e3, Math.min(3e4, Number(event.raceDurationMs) || 14e3));
    const heats = buildInitialRaceHeats(participantUids, event.racersPerHeat, seed, raceDurationMs);
    const updated2 = {
      ...event,
      status: "running",
      heats,
      activeHeatId: heats[0]?.heatId || null,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveEventRaw(updated2);
    return updated2;
  }
  if (participantUids.length < 1) {
    throw new Error("C\u1EA7n \xEDt nh\u1EA5t 1 ng\u01B0\u1EDDi ch\u01A1i tham gia tr\u01B0\u1EDBc khi quay th\u01B0\u1EDFng.");
  }
  const revealDurationMs = Math.max(2e3, Math.min(1e4, Number(event.revealDurationMs) || 3800));
  const revealedAtMs = Date.now() + revealDurationMs;
  let partyResult = event.partyResult;
  let winners = event.winners;
  if (event.gameType === "tai_xiu") {
    const dice = [
      crypto2.randomInt(1, 7),
      crypto2.randomInt(1, 7),
      crypto2.randomInt(1, 7)
    ];
    const evalRes = evaluateTaiXiuWinners(dice, event.participants, event.prizes, revealedAtMs);
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "bau_cua") {
    const allFaces = BAU_CUA_FACES.map((f) => f.id);
    const faces = [
      allFaces[crypto2.randomInt(0, allFaces.length)],
      allFaces[crypto2.randomInt(0, allFaces.length)],
      allFaces[crypto2.randomInt(0, allFaces.length)]
    ];
    const evalRes = evaluateBauCuaWinners(faces, event.participants, event.prizes, revealedAtMs);
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "lucky_number") {
    const winningNum = crypto2.randomInt(0, 100);
    const evalRes = evaluateLuckyNumberWinners(
      winningNum,
      event.participants,
      event.prizes,
      revealedAtMs
    );
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "lucky_wheel") {
    const sectorIndex = crypto2.randomInt(0, LUCKY_WHEEL_SECTORS.length);
    const evalRes = evaluateLuckyWheelWinners(
      sectorIndex,
      event.participants,
      event.prizes,
      revealedAtMs
    );
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "treasure_flip") {
    const pool = Array.from({ length: TREASURE_CHEST_COUNT }, (_, i) => i + 1);
    const picked = [];
    while (picked.length < TREASURE_WINNING_COUNT && pool.length > 0) {
      const idx = crypto2.randomInt(0, pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    const evalRes = evaluateTreasureFlipWinners(
      picked,
      event.participants,
      event.prizes,
      revealedAtMs
    );
    partyResult = evalRes.result;
    winners = evalRes.winners;
  } else if (event.gameType === "mystery_box") {
    const winningBox = crypto2.randomInt(1, MYSTERY_BOXES.length + 1);
    const evalRes = evaluateMysteryBoxWinners(
      winningBox,
      event.participants,
      event.prizes,
      revealedAtMs
    );
    partyResult = evalRes.result;
    winners = evalRes.winners;
  }
  const updated = {
    ...event,
    status: "finished",
    partyResult,
    winners,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function launchRaceHeat(eventId, heatId) {
  const event = await getMinigameEvent(eventId);
  if (!isRaceGame(event.gameType) || event.status !== "running") {
    throw new Error("S\u1EF1 ki\u1EC7n \u0111ua hi\u1EC7n kh\xF4ng \u1EDF tr\u1EA1ng th\xE1i \u0111ang di\u1EC5n ra.");
  }
  const targetId = heatId || event.heats.find((h) => h.status === "pending")?.heatId || event.activeHeatId;
  const heatIdx = event.heats.findIndex((h) => h.heatId === targetId);
  if (heatIdx < 0) {
    throw new Error("Kh\xF4ng t\xECm th\u1EA5y l\u01B0\u1EE3t \u0111ua c\u1EA7n xu\u1EA5t ph\xE1t.");
  }
  const targetHeat = event.heats[heatIdx];
  if (targetHeat.status === "racing" || targetHeat.status === "completed") {
    return event;
  }
  const freshSeed = crypto2.randomInt(1e5, 999999999);
  const durationMs = targetHeat.durationMs || 14e3;
  const sim = simulateRaceHeat(targetHeat.laneUids, freshSeed, durationMs);
  const startAtMs = Date.now() + 3e3;
  const updatedHeat = {
    ...targetHeat,
    status: "racing",
    seed: freshSeed,
    startAtMs,
    durationMs,
    finishOrder: sim.finishOrder,
    finishTimesMs: sim.finishTimesMs,
    speedProfiles: sim.speedProfiles
  };
  const nextHeats = [...event.heats];
  nextHeats[heatIdx] = updatedHeat;
  const updated = {
    ...event,
    heats: nextHeats,
    activeHeatId: updatedHeat.heatId,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function completeRaceHeat(eventId, heatId) {
  const event = await getMinigameEvent(eventId);
  if (!isRaceGame(event.gameType) || event.status !== "running") {
    return event;
  }
  const targetId = heatId || event.activeHeatId;
  const heatIdx = event.heats.findIndex((h) => h.heatId === targetId);
  if (heatIdx < 0) throw new Error("Kh\xF4ng t\xECm th\u1EA5y l\u01B0\u1EE3t \u0111ua c\u1EA7n ch\u1ED1t.");
  const currentHeat = event.heats[heatIdx];
  if (currentHeat.status === "completed") {
    return event;
  }
  if (currentHeat.status === "pending") {
    return event;
  }
  const heatsCopy = [...event.heats];
  heatsCopy[heatIdx] = {
    ...currentHeat,
    status: "completed"
  };
  const seed = crypto2.randomInt(1e5, 999999999);
  const advanced = advanceRaceTournamentIfReady(
    heatsCopy,
    event.racersPerHeat,
    seed,
    currentHeat.durationMs || 14e3
  );
  let status = event.status;
  let winners = event.winners;
  let nextActiveHeatId = advanced.heats.find((h) => h.status === "pending")?.heatId || currentHeat.heatId;
  if (advanced.tournamentFinished) {
    status = "finished";
    const finalHeat = advanced.heats.find((h) => h.isFinal);
    const mergedFinishTimesMs = {};
    for (const h of [...advanced.heats].sort((a, b) => a.roundIndex - b.roundIndex)) {
      Object.assign(mergedFinishTimesMs, h.finishTimesMs || {});
    }
    winners = buildRaceWinners(
      advanced.rankedUids,
      event.participants,
      event.prizes,
      mergedFinishTimesMs
    );
    nextActiveHeatId = finalHeat?.heatId || currentHeat.heatId;
  }
  const updated = {
    ...event,
    status,
    heats: advanced.heats,
    activeHeatId: nextActiveHeatId,
    winners,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await saveEventRaw(updated);
  return updated;
}
async function distributeMinigamePrizes(eventId, actor) {
  const event = await getMinigameEvent(eventId);
  if (event.status !== "finished") {
    throw new Error("Ch\u1EC9 c\xF3 th\u1EC3 trao th\u01B0\u1EDFng khi s\u1EF1 ki\u1EC7n \u0111\xE3 k\u1EBFt th\xFAc v\xE0 c\xF3 danh s\xE1ch th\u1EAFng gi\u1EA3i.");
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let creditedCount = 0;
  let totalCreditedVnd = 0;
  const updatedWinners = [...event.winners || []];
  for (let i = 0; i < updatedWinners.length; i++) {
    const w = updatedWinners[i];
    if (w.distributed) continue;
    if (w.isBot || w.uid.startsWith("bot_")) {
      updatedWinners[i] = {
        ...w,
        isBot: true,
        distributed: true,
        distributedAt: now,
        matchDetail: `${w.matchDetail || ""} (Bot th\u1EED nghi\u1EC7m \u2014 kh\xF4ng c\u1ED9ng ti\u1EC1n th\u1EADt)`.trim()
      };
      continue;
    }
    if (w.prizeType === "wallet_vnd" && (w.amountVnd || 0) > 0) {
      const rewardVnd = sanitizeVnd(w.amountVnd);
      const walletTxId = `wtx_mg_${event.id}_${w.uid}_${w.rank}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
      const initialWallet = await getOrCreateWallet(w.uid, { fullName: w.displayName });
      if (adminDb) {
        await adminDb.runTransaction(async (tx) => {
          const txRef = adminDb.collection("wallet_transactions").doc(walletTxId);
          const existingTx = await tx.get(txRef);
          if (existingTx.exists) return;
          const walletRef = adminDb.collection("wallets").doc(w.uid);
          const walletSnap = await tx.get(walletRef);
          const currentWallet = walletSnap.exists ? walletSnap.data() : initialWallet;
          const before = sanitizeVnd(currentWallet.balanceVnd);
          const after = before + rewardVnd;
          tx.set(
            walletRef,
            {
              ...currentWallet,
              uid: w.uid,
              balanceVnd: after,
              totalCreditedVnd: sanitizeVnd(currentWallet.totalCreditedVnd) + rewardVnd,
              updatedAt: now
            },
            { merge: true }
          );
          const walletTx = {
            id: walletTxId,
            uid: w.uid,
            type: "minigame_reward_credit",
            amountVnd: rewardVnd,
            balanceBeforeVnd: before,
            balanceAfterVnd: after,
            studentNameSnapshot: currentWallet.fullName || w.displayName,
            studentClassSnapshot: currentWallet.currentClass || "",
            idempotencyKey: walletTxId,
            actorUid: actor.uid,
            actorName: actor.displayName || "Admin",
            note: `Th\u01B0\u1EDFng Minigame "${event.title}" \u2014 ${w.prizeLabel}`,
            description: `Th\u01B0\u1EDFng Minigame "${event.title}" \u2014 ${w.prizeLabel}`,
            createdAt: now,
            metadata: {
              minigameEventId: event.id,
              minigameCode: event.eventCode,
              rank: w.rank
            }
          };
          tx.set(txRef, walletTx);
        });
      } else {
        const existingTx = await getFirestoreRestDoc("wallet_transactions", walletTxId, false);
        if (!existingTx) {
          const currentWallet = await getFirestoreRestDoc("wallets", w.uid, false) || initialWallet;
          const before = sanitizeVnd(currentWallet.balanceVnd);
          const after = before + rewardVnd;
          await setFirestoreRestDoc("wallets", w.uid, {
            ...currentWallet,
            uid: w.uid,
            balanceVnd: after,
            totalCreditedVnd: sanitizeVnd(currentWallet.totalCreditedVnd) + rewardVnd,
            updatedAt: now
          });
          const walletTx = {
            id: walletTxId,
            uid: w.uid,
            type: "minigame_reward_credit",
            amountVnd: rewardVnd,
            balanceBeforeVnd: before,
            balanceAfterVnd: after,
            studentNameSnapshot: currentWallet.fullName || w.displayName,
            studentClassSnapshot: currentWallet.currentClass || "",
            idempotencyKey: walletTxId,
            actorUid: actor.uid,
            actorName: actor.displayName || "Admin",
            note: `Th\u01B0\u1EDFng Minigame "${event.title}" \u2014 ${w.prizeLabel}`,
            description: `Th\u01B0\u1EDFng Minigame "${event.title}" \u2014 ${w.prizeLabel}`,
            createdAt: now,
            metadata: {
              minigameEventId: event.id,
              minigameCode: event.eventCode,
              rank: w.rank
            }
          };
          await setFirestoreRestDoc("wallet_transactions", walletTxId, walletTx);
        }
      }
      updatedWinners[i] = {
        ...w,
        distributed: true,
        distributedAt: now,
        walletTransactionId: walletTxId
      };
      creditedCount++;
      totalCreditedVnd += rewardVnd;
      invalidateStudentDetailsCache(w.uid);
    } else {
      updatedWinners[i] = {
        ...w,
        distributed: true,
        distributedAt: now
      };
      creditedCount++;
    }
    await publishDeviceNotification({
      recipientUid: w.uid,
      type: "minigame_reward",
      title: `\u{1F3C6} Ch\xFAc m\u1EEBng tr\xFAng gi\u1EA3i: ${event.title}`,
      message: w.prizeType === "wallet_vnd" ? `B\u1EA1n v\u1EEBa nh\u1EADn +${(w.amountVnd || 0).toLocaleString("vi-VN")}\u0111 v\xE0o V\xED DkTEST (${w.prizeLabel})!` : w.prizeType === "voucher" ? `B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c m\xE3 Voucher ${w.voucherCode || ""} (${w.prizeLabel})!` : `B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c ph\u1EA7n qu\xE0: ${w.customTitle || w.prizeLabel}!`,
      route: `/student/minigame/${event.id}`,
      actorName: actor.displayName || "DkTEST"
    });
  }
  invalidateWalletOverviewCache();
  const updated = {
    ...event,
    winners: updatedWinners,
    prizesDistributedAt: now,
    updatedAt: now
  };
  await saveEventRaw(updated);
  return { event: updated, creditedCount, totalCreditedVnd };
}
async function cancelOrDeleteMinigameEvent(eventId, hardDelete = false) {
  const event = await getEventRaw(eventId);
  if (!event) return;
  if (hardDelete) {
    liveCheersByEvent.delete(event.id);
    await deleteEventRaw(event.id);
    return;
  }
  await saveEventRaw({
    ...event,
    status: "cancelled",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}

// server/routes/minigameAdminRoutes.ts
var minigameAdminRouter = Router2();
function formatError2(err) {
  if (err instanceof ZodError2) {
    return {
      status: 400,
      error: "validation_error",
      message: err.issues[0]?.message || "D\u1EEF li\u1EC7u s\u1EF1 ki\u1EC7n kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  return {
    status: Number(err?.statusCode) || 400,
    error: err?.code || "minigame_error",
    message: err?.message || "\u0110\xE3 c\xF3 l\u1ED7i x\u1EA3y ra."
  };
}
minigameAdminRouter.get("/", async (_req, res) => {
  try {
    const events = await listMinigameEvents();
    return res.json({ success: true, events });
  } catch (err) {
    const e = formatError2(err);
    return res.status(500).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.get("/:id", async (req, res) => {
  try {
    const event = await getMinigameEvent(req.params.id);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/", async (req, res) => {
  try {
    const event = await createMinigameEvent(req.body, {
      uid: req.user.uid,
      displayName: req.user.displayName || req.user.email
    });
    return res.status(201).json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/:id/bots/fill", async (req, res) => {
  try {
    const count = req.body?.count !== void 0 ? Number(req.body.count) : void 0;
    const clearFirst = Boolean(req.body?.clearFirst);
    const event = await fillMinigameWithBots(req.params.id, { count, clearFirst });
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/:id/bots/clear", async (req, res) => {
  try {
    const event = await clearMinigameBots(req.params.id);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/:id/reset-demo", async (req, res) => {
  try {
    const event = await resetMinigameForDemo(req.params.id);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.patch("/:id/schedule", async (req, res) => {
  try {
    const event = await updateMinigameSchedule(req.params.id, req.body);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/:id/start", async (req, res) => {
  try {
    const event = await startMinigameEvent(req.params.id);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/:id/heats/launch", async (req, res) => {
  try {
    const event = await launchRaceHeat(req.params.id, req.body?.heatId);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post("/:id/heats/complete", async (req, res) => {
  try {
    const event = await completeRaceHeat(req.params.id, req.body?.heatId);
    return res.json({ success: true, event });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});
minigameAdminRouter.post(
  "/:id/distribute-prizes",
  async (req, res) => {
    try {
      const result = await distributeMinigamePrizes(req.params.id, {
        uid: req.user.uid,
        displayName: req.user.displayName || req.user.email
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      const e = formatError2(err);
      return res.status(e.status).json({ error: e.error, message: e.message });
    }
  }
);
minigameAdminRouter.delete("/:id", async (req, res) => {
  try {
    await cancelOrDeleteMinigameEvent(req.params.id, req.query.hard === "true");
    return res.json({ success: true });
  } catch (err) {
    const e = formatError2(err);
    return res.status(e.status).json({ error: e.error, message: e.message });
  }
});

// server/routes/documentLibraryAdminRoutes.ts
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
  toanmath: {
    label: "TOANMATH \u2014 Kho \u0110\u1EC1 To\xE1n Tr\u01B0\u1EDDng S\u1EDF & H\u1ECDc K\u1EF3 (toanmath.com)",
    shortLabel: "TOANMATH",
    domain: "toanmath.com",
    description: "Kho \u0111\u1EC1 thi th\u1EED TN THPT Tr\u01B0\u1EDDng - S\u1EDF, Kh\u1EA3o s\xE1t ch\u1EA5t l\u01B0\u1EE3ng, \u0110\u1EC1 GK1, HK1, GK2, HK2, HSG & Chuy\xEAn \u0111\u1EC1 To\xE1n 10\u201312.",
    accentColor: "rose"
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
  tienganh: {
    label: "Kho \u0110\u1EC1 Ti\u1EBFng Anh THPT & To\xE0n C\u1EA5p (giaoandethitienganh.info)",
    shortLabel: "Kho \u0110\u1EC1 Ti\u1EBFng Anh",
    domain: "giaoandethitienganh.info",
    description: "Ng\xE2n h\xE0ng \u0111\u1EC1 thi Ti\u1EBFng Anh L\u1EDBp 12, THPT Qu\u1ED1c gia, L\u1EDBp 10\u201311, THCS & Tuy\u1EC3n sinh v\xE0o 10 k\xE8m \u0111\xE1p \xE1n.",
    accentColor: "teal"
  },
  multihub: {
    label: "Kho \u0110a M\xF4n THPT & \u0110GNL (H\u1ECDc T\u1EA1i \u2022 T\xE0i Li\u1EC7u \u0110\u1EC1 Thi \u2022 \u0110\u1EC1 Thi Th\u1EED)",
    shortLabel: "Kho \u0110a M\xF4n THPT",
    domain: "hoctai.vn",
    description: "T\u1ED5ng h\u1EE3p \u0111\u1EC1 thi ch\xEDnh th\u1EE9c & thi th\u1EED L\xFD, H\xF3a, Sinh, Anh, V\u0103n, S\u1EED, \u0110\u1ECBa, KTPL & \u0110GNL V-ACT / HSA.",
    accentColor: "indigo"
  },
  math_partners: {
    label: "Kho To\xE1n & Chuy\xEAn \u0110\u1EC1 M\u1EDF R\u1ED9ng (MathVN \u2022 Nguy\u1EC5n B\u1EA3o V\u01B0\u01A1ng \u2022 THPT.Math)",
    shortLabel: "To\xE1n M\u1EDF R\u1ED9ng",
    domain: "mathvn.com",
    description: "T\u1ED5ng h\u1EE3p to\xE0n b\u1ED9 \u0111\u1EC1 thi th\u1EED, kh\u1EA3o s\xE1t v\xE0 chuy\xEAn \u0111\u1EC1 To\xE1n THPT t\u1EEB MathVN, Nguy\u1EC5n B\u1EA3o V\u01B0\u01A1ng & THPT.Math.",
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
  if (s.includes("toanmath")) return "toanmath";
  if (s.includes("tailieuonthi.edu") || s.includes("\xF4n thi edu")) return "tlo_edu";
  if (s.includes("tailieuonthi.org") || s.includes("\xF4n thi org")) return "tlo_org";
  if (s.includes("ti\u1EBFng anh") || s.includes("giaoandethitienganh")) return "tienganh";
  if (s.includes("h\u1ECDc t\u1EA1i") || s.includes("hoctai") || s.includes("\u0111a m\xF4n")) return "multihub";
  return "math_partners";
}
function expandSeedUrl(u) {
  if (!u) return void 0;
  if (u.startsWith("gd:")) return `https://drive.google.com/file/d/${u.slice(3)}/view`;
  if (u.startsWith("gdf:")) return `https://drive.google.com/drive/folders/${u.slice(4)}`;
  if (u.startsWith("gds:")) return `https://docs.google.com/spreadsheets/d/${u.slice(4)}/edit`;
  if (u.startsWith("tm:")) return `https://toanmath.com/toanmath-pdf/${u.slice(3)}`;
  if (u.startsWith("tmw:")) return `https://toanmath.com/wp-content/uploads/${u.slice(4)}`;
  if (u.startsWith("eduu:")) return `https://tailieuonthi.edu.vn/wp-content/uploads/${u.slice(5)}`;
  if (u.startsWith("mf:")) return `https://www.mediafire.com/${u.slice(3)}`;
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
  if (pu.startsWith("tm:")) return `https://toanmath.com${pu.slice(3)}`;
  if (pu.startsWith("ga:")) return `https://www.giaoandethitienganh.info${pu.slice(3)}`;
  if (pu.startsWith("ht:")) return `https://hoctai.vn${pu.slice(3)}`;
  if (pu.startsWith("mv:")) return `https://www.mathvn.com${pu.slice(3)}`;
  return pu;
}
function expandCompactSeedDocument(item) {
  const grade = item.g || "grade_12";
  const category = item.c || "exam_test";
  const fileFormat = item.f || "pdf";
  const sourceKey = item.sk || inferSourceKeyFromLabel(item.src);
  const resolvedSourceName = item.src || DOCUMENT_SOURCE_META[sourceKey]?.shortLabel || "Kho T\xE0i Li\u1EC7u THPT";
  const gradeLabel = DOCUMENT_GRADE_META[grade]?.shortLabel || "THPT";
  const subjectLabel = DOCUMENT_SUBJECT_META[item.s]?.label || "T\u1ED5ng h\u1EE3p";
  const categoryLabel = DOCUMENT_CATEGORY_META[category]?.label || "T\xE0i li\u1EC7u";
  const subCount = item.sf?.length || item.sfc || 0;
  const primaryUrl = expandSeedUrl(item.u) || item.u;
  const answerUrl = expandSeedUrl(item.a);
  const videoUrl = expandSeedUrl(item.v);
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
    grade,
    subject: item.s,
    category,
    fileFormat,
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
    authorName: resolvedSourceName,
    authorRole: "seed",
    sourceName: resolvedSourceName,
    ...sourcePostUrl ? { sourcePostUrl } : {},
    status: "published",
    tags: item.tg || [],
    viewCount: 0,
    downloadCount: 0,
    publishedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
    createdAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-01T00:00:00.000Z",
    updatedAt: item.d ? `${item.d}T00:00:00.000Z` : "2026-01-27T00:00:00.000Z"
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
function invalidateDocumentSettingsCache() {
  cachedSettings = null;
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
async function updateDocumentLibrarySettings(patch) {
  const current = await getDocumentLibrarySettings(true);
  const next = {
    autoApproveUserUploads: typeof patch.autoApproveUserUploads === "boolean" ? patch.autoApproveUserUploads : current.autoApproveUserUploads,
    creatorRevenueSharePercent: typeof patch.creatorRevenueSharePercent === "number" ? Math.max(0, Math.min(100, Math.round(patch.creatorRevenueSharePercent))) : current.creatorRevenueSharePercent,
    maxUserPriceVnd: typeof patch.maxUserPriceVnd === "number" && patch.maxUserPriceVnd >= 1e3 ? Math.min(5e6, Math.floor(patch.maxUserPriceVnd)) : current.maxUserPriceVnd,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (adminDb) {
    await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).set(next, { merge: true });
  } else {
    await setFirestoreRestDoc(SETTINGS_COLLECTION, SETTINGS_DOC_ID, next);
  }
  invalidateDocumentSettingsCache();
  return next;
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
async function moderateLibraryDocument(adminActor, docId, patch) {
  const existing = await getDocumentByIdResolved(docId);
  if (!existing) throw new Error("Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u c\u1EA7n duy\u1EC7t.");
  const secrets = await getDocumentSecrets(docId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const nextAccessMode = patch.accessMode !== void 0 ? patch.accessMode : patch.priceVnd !== void 0 ? patch.priceVnd > 0 ? "paid" : "free" : existing.accessMode;
  const nextPrice = nextAccessMode === "paid" ? sanitizeVnd(patch.priceVnd !== void 0 ? patch.priceVnd : existing.priceVnd) : 0;
  const updated = sanitizePublicDocument({
    ...existing,
    ...nextAccessMode === "free" && secrets?.fileUrl ? { fileUrl: secrets.fileUrl } : {},
    ...patch.folderId !== void 0 ? { folderId: patch.folderId } : {},
    accessMode: nextAccessMode,
    priceVnd: nextPrice,
    status: patch.status || existing.status,
    ...patch.rejectionReason !== void 0 ? { rejectionReason: patch.rejectionReason } : {},
    ...patch.isFeatured !== void 0 ? { isFeatured: patch.isFeatured } : {},
    updatedAt: now
  });
  if (adminDb) {
    await adminDb.collection(DOCS_COLLECTION).doc(docId).set(updated);
  } else {
    await setFirestoreRestDoc(DOCS_COLLECTION, docId, updated);
  }
  if (patch.status && patch.status !== existing.status && existing.authorUid) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isApproved = patch.status === "published";
    const notifDoc = {
      id: notifId,
      userId: existing.authorUid,
      recipientUid: existing.authorUid,
      title: isApproved ? `\u2705 T\xE0i li\u1EC7u "${existing.title}" \u0111\xE3 \u0111\u01B0\u1EE3c duy\u1EC7t!` : `\u26A0\uFE0F T\xE0i li\u1EC7u "${existing.title}" c\u1EA7n ch\u1EC9nh s\u1EEDa`,
      content: isApproved ? `T\xE0i li\u1EC7u c\u1EE7a b\u1EA1n \u0111\xE3 xu\u1EA5t hi\u1EC7n c\xF4ng khai tr\xEAn Kho T\xE0i Li\u1EC7u DkTEST.` : `L\xFD do: ${patch.rejectionReason || "N\u1ED9i dung ch\u01B0a ph\xF9 h\u1EE3p ti\xEAu chu\u1EA9n c\u1ED9ng \u0111\u1ED3ng."}`,
      type: "system",
      read: false,
      link: `/student/documents/${encodeURIComponent(docId)}`,
      createdAt: now
    };
    try {
      if (adminDb) {
        await adminDb.collection("notifications").doc(notifId).set(notifDoc);
      } else {
        await setFirestoreRestDoc("notifications", notifId, notifDoc);
      }
    } catch {
    }
  }
  invalidateDocumentLibraryCache();
  return updated;
}
async function grantOrRevokeDocumentEntitlement(adminActor, params) {
  const cleanUid = String(params.uid || "").trim();
  const cleanDocId = String(params.docId || "").trim();
  if (!cleanUid || !cleanDocId) throw new Error("Thi\u1EBFu UID ng\u01B0\u1EDDi d\xF9ng ho\u1EB7c m\xE3 t\xE0i li\u1EC7u.");
  const doc = await getDocumentByIdResolved(cleanDocId);
  if (!doc) throw new Error("Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u.");
  const entId = `${cleanUid}_${cleanDocId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const ent = {
    id: entId,
    uid: cleanUid,
    docId: cleanDocId,
    docTitleSnapshot: doc.title,
    authorUid: doc.authorUid,
    pricePaidVnd: 0,
    creatorShareVnd: 0,
    platformFeeVnd: 0,
    status: params.action === "grant" ? "active" : "revoked",
    grantedBy: "admin_grant",
    createdAt: now,
    updatedAt: now
  };
  if (adminDb) {
    await adminDb.collection(ENTITLEMENTS_COLLECTION).doc(entId).set(ent, { merge: true });
  } else {
    await setFirestoreRestDoc(ENTITLEMENTS_COLLECTION, entId, ent);
  }
  return ent;
}
async function getAdminDocumentPurchases(limitCount = 100) {
  const safeLimit = Math.max(1, Math.min(250, limitCount));
  if (adminDb) {
    try {
      const snap = await adminDb.collection(ENTITLEMENTS_COLLECTION).orderBy("createdAt", "desc").limit(safeLimit).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      const snap = await adminDb.collection(ENTITLEMENTS_COLLECTION).limit(safeLimit).get();
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return items;
    }
  }
  const rest = await getFirestoreRestDocs(ENTITLEMENTS_COLLECTION, safeLimit, true) || [];
  rest.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return rest;
}

// server/routes/documentLibraryAdminRoutes.ts
var documentLibraryAdminRouter = Router3();
documentLibraryAdminRouter.get("/", async (_req, res) => {
  try {
    const [documents, folders, settings, purchases] = await Promise.all([
      getLiveLibraryDocuments({ includeNonPublished: true, forceRefresh: true }),
      getLiveLibraryFolders({ includeHidden: true, forceRefresh: true }),
      getDocumentLibrarySettings(true),
      getAdminDocumentPurchases(120)
    ]);
    return res.json({
      success: true,
      documents,
      folders,
      settings,
      purchases
    });
  } catch (err) {
    return res.status(500).json({
      error: "admin_documents_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch qu\u1EA3n tr\u1ECB t\xE0i li\u1EC7u."
    });
  }
});
documentLibraryAdminRouter.post("/", async (req, res) => {
  try {
    const doc = await createOrUpdateLibraryDocument(req.user, req.body || {});
    return res.status(201).json({
      success: true,
      document: doc,
      message: "\u0110\xE3 l\u01B0u t\xE0i li\u1EC7u v\xE0o Kho T\xE0i Li\u1EC7u!"
    });
  } catch (err) {
    const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 l\u01B0u t\xE0i li\u1EC7u.";
    return res.status(400).json({ error: "admin_doc_save_error", message: msg });
  }
});
documentLibraryAdminRouter.post("/folders", async (req, res) => {
  try {
    const folder = await createOrUpdateLibraryFolder(req.user, req.body || {});
    return res.status(201).json({
      success: true,
      folder,
      message: "\u0110\xE3 l\u01B0u th\u01B0 m\u1EE5c th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    const msg = err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 l\u01B0u th\u01B0 m\u1EE5c.";
    return res.status(400).json({ error: "admin_folder_save_error", message: msg });
  }
});
documentLibraryAdminRouter.delete(
  "/folders/:folderId",
  async (req, res) => {
    try {
      const result = await deleteLibraryFolder(req.user, req.params.folderId);
      return res.json({
        success: true,
        ...result,
        message: result.hiddenSeed ? "\u0110\xE3 \u1EA9n th\u01B0 m\u1EE5c g\u1ED1c kh\u1ECFi danh s\xE1ch hi\u1EC3n th\u1ECB." : "\u0110\xE3 x\xF3a th\u01B0 m\u1EE5c v\xE0 b\u1EA3o to\xE0n c\xE1c t\u1EC7p b\xEAn trong."
      });
    } catch (err) {
      return res.status(400).json({
        error: "admin_folder_delete_error",
        message: err?.message || "Kh\xF4ng th\u1EC3 x\xF3a th\u01B0 m\u1EE5c."
      });
    }
  }
);
documentLibraryAdminRouter.post("/bulk-move", async (req, res) => {
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
      error: "admin_bulk_move_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 di chuy\u1EC3n h\xE0ng lo\u1EA1t t\xE0i li\u1EC7u."
    });
  }
});
documentLibraryAdminRouter.patch("/settings", async (req, res) => {
  try {
    const settings = await updateDocumentLibrarySettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: "\u0110\xE3 l\u01B0u c\u1EA5u h\xECnh Kho T\xE0i Li\u1EC7u."
    });
  } catch (err) {
    return res.status(400).json({
      error: "admin_doc_settings_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt c\u1EA5u h\xECnh."
    });
  }
});
documentLibraryAdminRouter.post("/entitlements", async (req, res) => {
  try {
    const { uid, docId, action } = req.body || {};
    if (!uid || !docId || action !== "grant" && action !== "revoke") {
      return res.status(400).json({
        error: "invalid_params",
        message: "Vui l\xF2ng truy\u1EC1n \u0111\u1EA7y \u0111\u1EE7 uid, docId v\xE0 action (grant / revoke)."
      });
    }
    const entitlement = await grantOrRevokeDocumentEntitlement(req.user, { uid, docId, action });
    return res.json({
      success: true,
      entitlement,
      message: action === "grant" ? "\u0110\xE3 c\u1EA5p quy\u1EC1n truy c\u1EADp t\xE0i li\u1EC7u cho h\u1ECDc sinh!" : "\u0110\xE3 thu h\u1ED3i quy\u1EC1n truy c\u1EADp t\xE0i li\u1EC7u."
    });
  } catch (err) {
    return res.status(400).json({
      error: "admin_doc_entitlement_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt quy\u1EC1n truy c\u1EADp."
    });
  }
});
documentLibraryAdminRouter.post("/import-blogger", async (req, res) => {
  try {
    const rawSiteUrl = String(req.body?.siteUrl || "https://www.nganhangdethi.org").trim().replace(/\/+$/, "");
    const maxItems = Math.max(1, Math.min(30, Number(req.body?.limit) || 12));
    const targetFolderId = req.body?.folderId ? String(req.body.folderId).trim() : null;
    await validateUrlForSsrf(rawSiteUrl);
    let importedCount = 0;
    const wpUrl = `${rawSiteUrl}/wp-json/wp/v2/posts?per_page=${maxItems}`;
    const wpRes = await fetch(wpUrl, { signal: AbortSignal.timeout(12e3) }).catch(() => null);
    if (wpRes && wpRes.ok) {
      const posts = await wpRes.json();
      if (Array.isArray(posts)) {
        for (const post of posts) {
          const title = String(post?.title?.rendered || "").replace(/<[^>]+>/g, "").trim();
          const content = String(post?.content?.rendered || "");
          const driveMatch = content.match(
            /https?:\/\/drive\.google\.com\/(?:file\/d\/[a-zA-Z0-9_-]+(?:\/view)?|open\?id=[a-zA-Z0-9_-]+|drive\/folders\/[a-zA-Z0-9_-]+)/i
          );
          const fileUrl = driveMatch ? driveMatch[0] : "";
          if (!title || !fileUrl) continue;
          await createOrUpdateLibraryDocument(req.user, {
            title: title.slice(0, 200),
            description: `T\xE0i li\u1EC7u \u0111\u1ED3ng b\u1ED9 t\u1EEB ${new URL(rawSiteUrl).hostname}.`,
            grade: /\b(8|9)\b/.test(title) ? "thcs" : /\b10\b/.test(title) ? "grade_10" : /\b11\b/.test(title) ? "grade_11" : "grade_12",
            subject: "multi_subject",
            category: /ebook|sách/i.test(title) ? "ebook_book" : "exam_test",
            fileFormat: fileUrl.includes("/folders/") ? "folder" : "pdf",
            folderId: targetFolderId,
            space: targetFolderId ? void 0 : "sources",
            accessMode: "free",
            priceVnd: 0,
            fileUrl,
            status: "published"
          });
          importedCount++;
        }
      }
    } else {
      const feedUrl = `${rawSiteUrl}/feeds/posts/default?alt=json&max-results=${maxItems}`;
      const feedRes = await fetch(feedUrl, { signal: AbortSignal.timeout(15e3) });
      if (!feedRes.ok) {
        throw new Error(`Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i ngu\u1ED3n RSS/JSON (${feedRes.status}).`);
      }
      const feedJson = await feedRes.json();
      const entries = feedJson?.feed?.entry || [];
      for (const entry of entries) {
        const title = String(entry?.title?.["$t"] || "").trim();
        const content = String(entry?.content?.["$t"] || "");
        const deMatch = content.match(/\bde=['"](https?:\/\/[^'"]+)['"]/i) || content.match(
          /https?:\/\/drive\.google\.com\/(?:file\/d\/[a-zA-Z0-9_-]+(?:\/view)?|open\?id=[a-zA-Z0-9_-]+)/i
        );
        const fileUrl = deMatch ? deMatch[1] || deMatch[0] : "";
        if (!title || !fileUrl) continue;
        const daMatch = content.match(/\bda=['"](https?:\/\/[^'"]+)['"]/i);
        const answerUrl = daMatch && daMatch[1] !== fileUrl ? daMatch[1] : void 0;
        await createOrUpdateLibraryDocument(req.user, {
          title: title.slice(0, 200),
          description: `T\xE0i li\u1EC7u \u0111\u1ED3ng b\u1ED9 t\u1EEB ${new URL(rawSiteUrl).hostname}.`,
          grade: /10/.test(title) ? "grade_10" : /11/.test(title) ? "grade_11" : "grade_12",
          subject: "multi_subject",
          category: /ebook|sách/i.test(title) ? "ebook_book" : "exam_test",
          fileFormat: "pdf",
          folderId: targetFolderId || "sfold_nhdt",
          space: "sources",
          accessMode: "free",
          priceVnd: 0,
          fileUrl,
          answerUrl,
          status: "published"
        });
        importedCount++;
      }
    }
    return res.json({
      success: true,
      importedCount,
      message: `\u0110\xE3 \u0111\u1ED3ng b\u1ED9 th\xEAm ${importedCount} t\xE0i li\u1EC7u m\u1EDBi t\u1EEB ${new URL(rawSiteUrl).hostname}!`
    });
  } catch (err) {
    return res.status(400).json({
      error: "import_blogger_error",
      message: err?.message || "\u0110\u1ED3ng b\u1ED9 ngu\u1ED3n ngo\xE0i th\u1EA5t b\u1EA1i."
    });
  }
});
documentLibraryAdminRouter.patch(
  "/:docId/moderate",
  async (req, res) => {
    try {
      const updated = await moderateLibraryDocument(req.user, req.params.docId, req.body || {});
      return res.json({
        success: true,
        document: updated,
        message: "\u0110\xE3 c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i ki\u1EC3m duy\u1EC7t t\xE0i li\u1EC7u."
      });
    } catch (err) {
      return res.status(400).json({
        error: "admin_doc_moderate_error",
        message: err?.message || "Kh\xF4ng th\u1EC3 c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i t\xE0i li\u1EC7u."
      });
    }
  }
);
documentLibraryAdminRouter.delete("/:docId", async (req, res) => {
  try {
    const result = await deleteLibraryDocument(req.user, req.params.docId);
    return res.json({
      success: true,
      ...result,
      message: result.hiddenSeed ? "\u0110\xE3 \u1EA9n t\xE0i li\u1EC7u g\u1ED1c kh\u1ECFi danh s\xE1ch hi\u1EC3n th\u1ECB c\xF4ng khai." : "\u0110\xE3 x\xF3a t\xE0i li\u1EC7u v\u0129nh vi\u1EC5n."
    });
  } catch (err) {
    return res.status(400).json({
      error: "admin_doc_delete_error",
      message: err?.message || "Kh\xF4ng th\u1EC3 x\xF3a t\xE0i li\u1EC7u."
    });
  }
});

// server/routes/adminRoutes.ts
var adminRouter = Router4();
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
function parseTimestampMs2(val) {
  if (!val) return 0;
  if (typeof val?.toMillis === "function") return val.toMillis();
  if (typeof val?.toDate === "function") return val.toDate().getTime();
  if (typeof val?.seconds === "number") return val.seconds * 1e3;
  if (typeof val?._seconds === "number") return val._seconds * 1e3;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "number") {
    return val < 1e11 ? val * 1e3 : val;
  }
  const d = new Date(val);
  const ms = d.getTime();
  return isNaN(ms) ? 0 : ms;
}
function formatCalendarDateKey(dateOrVal) {
  const ms = parseTimestampMs2(dateOrVal);
  if (!ms) return "";
  const vnTime = new Date(ms + 7 * 60 * 60 * 1e3);
  const y = vnTime.getUTCFullYear();
  const m = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vnTime.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
async function computeSystemStats() {
  const now = /* @__PURE__ */ new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStartMs = today.getTime();
  const sevenDaysMs = todayStartMs - 6 * 24 * 60 * 60 * 1e3;
  const thirtyDaysMs = todayStartMs - 29 * 24 * 60 * 60 * 1e3;
  const todayKey = formatCalendarDateKey(today);
  const todayStart = new Date(todayStartMs).toISOString();
  const sevenDaysAgo = new Date(sevenDaysMs).toISOString();
  const thirtyDaysAgo = new Date(thirtyDaysMs).toISOString();
  let usersList = [];
  let totalExams = 0;
  let totalSubmissions = 0;
  let submissionsToday = 0;
  let submissions7Days = 0;
  let submissions30Days = 0;
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
    try {
      const countSnap = await submissionsRef.count().get();
      totalSubmissions = countSnap.data().count;
    } catch (cntErr) {
      console.warn("[computeSystemStats] Total submissions count() query failed:", cntErr);
    }
    try {
      const exSumSnap = await adminDb.collection("system_stats").doc("exams_summary").get();
      if (exSumSnap.exists) {
        const examsSummaryDoc = exSumSnap.data();
        if (Array.isArray(examsSummaryDoc?.exams)) {
          let attemptsSum = 0;
          examsSummaryDoc.exams.forEach((e) => {
            attemptsSum += e.attemptCount || e.submissionsCount || 0;
          });
          if (attemptsSum > totalSubmissions) {
            totalSubmissions = attemptsSum;
          }
        }
      }
    } catch (_) {
    }
    try {
      const todayDate = new Date(todayStartMs);
      const sevenDaysDate = new Date(sevenDaysMs);
      const thirtyDaysDate = new Date(thirtyDaysMs);
      const [todayCountSnap, sevenCountSnap, thirtyCountSnap] = await Promise.all([
        submissionsRef.where("submittedAt", ">=", todayDate).count().get().catch(() => null),
        submissionsRef.where("submittedAt", ">=", sevenDaysDate).count().get().catch(() => null),
        submissionsRef.where("submittedAt", ">=", thirtyDaysDate).count().get().catch(() => null)
      ]);
      if (todayCountSnap) submissionsToday = todayCountSnap.data().count;
      if (sevenCountSnap) submissions7Days = sevenCountSnap.data().count;
      if (thirtyCountSnap) submissions30Days = thirtyCountSnap.data().count;
    } catch (_) {
    }
    const subSnap = await submissionsRef.orderBy("submittedAt", "desc").limit(200).get();
    console.log(`[Server Firestore READ: ${subSnap.size} docs] Collection: "submissions" (limit: 200)`);
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
    subList = await getFirestoreRestDocs("submissions", 100);
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
  let totalScoreSum = 0;
  let validScoreCount = 0;
  let highestScore = 0;
  let lowestScore = 10;
  const studentTestedSet = /* @__PURE__ */ new Set();
  const todayMs = new Date(todayStart).getTime();
  const sevenMs = new Date(sevenDaysAgo).getTime();
  const thirtyMs = new Date(thirtyDaysAgo).getTime();
  let subListToday = 0;
  let subList7 = 0;
  let subList30 = 0;
  subList.forEach((sub) => {
    const ts = parseTimestampMs2(sub.submittedAt);
    if (ts >= todayMs) subListToday++;
    if (ts >= sevenMs) subList7++;
    if (ts >= thirtyMs) subList30++;
    if (typeof sub.score === "number") {
      totalScoreSum += sub.score;
      validScoreCount++;
      if (sub.score > highestScore) highestScore = sub.score;
      if (sub.score < lowestScore) lowestScore = sub.score;
    }
    if (sub.studentId) studentTestedSet.add(sub.studentId);
  });
  if (submissionsToday === 0 && subListToday > 0) submissionsToday = subListToday;
  if (submissions7Days === 0 && subList7 > 0) submissions7Days = subList7;
  if (submissions30Days === 0 && subList30 > 0) submissions30Days = subList30;
  if (totalSubmissions === 0) {
    try {
      if (adminDb) {
        const exSnap = await adminDb.collection("exams").get();
        exSnap.docs.forEach((doc) => {
          const e = doc.data();
          totalSubmissions += e.attemptCount || e.submissionsCount || 0;
        });
      }
    } catch (_) {
    }
  }
  if (totalSubmissions < subList.length) {
    totalSubmissions = subList.length;
  }
  const averageScore = validScoreCount > 0 ? Number((totalScoreSum / validScoreCount).toFixed(2)) : 0;
  const totalRelationships = relList.length;
  const pendingRelationships = relList.filter((r) => r.status === "pending").length;
  return {
    totalSubmissions,
    submissionsToday,
    submissions7Days,
    submissions30Days,
    averageScore,
    totalExams,
    totalAccounts,
    activeAccounts,
    classDistribution,
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
    const force = req.query.force === "true";
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
      if (overviewDoc && (overviewDoc.userStats || overviewDoc.totalAccounts !== void 0) && (overviewDoc.examStats || overviewDoc.totalSubmissions !== void 0)) {
        const todayVnKey = formatCalendarDateKey(Date.now());
        if (overviewDoc.dailySubmissions && typeof overviewDoc.dailySubmissions === "object") {
          const countToday = Number(overviewDoc.dailySubmissions[todayVnKey]) || 0;
          overviewDoc.submissionsToday = countToday;
          if (overviewDoc.examStats) overviewDoc.examStats.submissionsToday = countToday;
        }
        console.log(`[Server Stats] Served from dedicated doc "system_stats/overview" (1 doc read / authoritative)`);
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
var analyticsCache = /* @__PURE__ */ new Map();
var ANALYTICS_TTL_MS = 180 * 1e3;
function invalidateAnalyticsCache() {
  analyticsCache.clear();
}
adminRouter.get("/analytics", async (req, res) => {
  try {
    const range = req.query.range || "7d";
    const force = req.query.force === "true";
    if (!force && analyticsCache.has(range)) {
      const cached = analyticsCache.get(range);
      if (Date.now() - cached.timestamp < ANALYTICS_TTL_MS) {
        return res.json(cached.data);
      }
    }
    let days = 7;
    let queryLimitSubs = 300;
    let queryLimitUsers = 150;
    if (range === "30d") {
      days = 30;
      queryLimitSubs = 600;
      queryLimitUsers = 300;
    } else if (range === "90d") {
      days = 90;
      queryLimitSubs = 1e3;
      queryLimitUsers = 500;
    } else if (range === "1y") {
      days = 365;
      queryLimitSubs = 1500;
      queryLimitUsers = 800;
    }
    const nowMs = Date.now();
    const dateBuckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const targetMs = nowMs - i * 24 * 60 * 60 * 1e3;
      const key = formatCalendarDateKey(targetMs);
      const vnD = new Date(targetMs + 7 * 60 * 60 * 1e3);
      const label = `${vnD.getUTCDate()}/${vnD.getUTCMonth() + 1}`;
      dateBuckets[key] = { date: key, label, newUsers: 0, submissions: 0 };
    }
    let overviewDoc = null;
    try {
      if (adminDb) {
        const snap = await adminDb.collection("system_stats").doc("overview").get();
        if (snap.exists) overviewDoc = snap.data();
      } else {
        overviewDoc = await getFirestoreRestDoc("system_stats", "overview", true, 6e4);
      }
    } catch (_) {
    }
    const hasPreAggregatedDaily = overviewDoc?.dailySubmissions && typeof overviewDoc.dailySubmissions === "object";
    if (hasPreAggregatedDaily) {
      Object.keys(overviewDoc.dailySubmissions).forEach((dKey) => {
        if (dateBuckets[dKey]) {
          dateBuckets[dKey].submissions = Number(overviewDoc.dailySubmissions[dKey]) || 0;
        }
      });
    }
    let usersList = [];
    let subList = [];
    if (adminDb) {
      try {
        const usersSnap = await adminDb.collection("users").orderBy("createdAt", "desc").limit(queryLimitUsers).get();
        usersList = usersSnap.docs.map((doc) => doc.data());
      } catch {
        const usersSnap = await adminDb.collection("users").limit(100).get();
        usersList = usersSnap.docs.map((doc) => doc.data());
      }
      if (!hasPreAggregatedDaily) {
        try {
          const subSnap = await adminDb.collection("submissions").orderBy("submittedAt", "desc").limit(queryLimitSubs).get();
          subList = subSnap.docs.map((doc) => doc.data());
        } catch {
          const subSnap = await adminDb.collection("submissions").limit(200).get();
          subList = subSnap.docs.map((doc) => doc.data());
        }
      }
    } else {
      usersList = await getFirestoreRestDocs("users", queryLimitUsers, true, 6e4);
      if (!hasPreAggregatedDaily) {
        subList = await getFirestoreRestDocs("submissions", queryLimitSubs, true, 6e4);
      }
    }
    usersList.forEach((data) => {
      const ts = parseTimestampMs2(data.createdAt);
      if (ts) {
        const dKey = formatCalendarDateKey(ts);
        if (dateBuckets[dKey]) {
          dateBuckets[dKey].newUsers++;
        }
      }
    });
    if (!hasPreAggregatedDaily && subList.length > 0) {
      subList.forEach((data) => {
        const ts = parseTimestampMs2(data.submittedAt);
        if (ts) {
          const dKey = formatCalendarDateKey(ts);
          if (dateBuckets[dKey]) {
            dateBuckets[dKey].submissions++;
          }
        }
      });
    }
    const chartData = Object.values(dateBuckets);
    const result = { range, chartData };
    analyticsCache.set(range, { data: result, timestamp: Date.now() });
    return res.json(result);
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
    const isNoCache = req.query.force === "true";
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
    const force = req.query.force === "true";
    const overview = await getWalletOverview(force);
    return res.json({ success: true, overview });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.get("/wallet/spending-history", async (req, res) => {
  try {
    const limitParam = req.query.limit ? Number(req.query.limit) : 5;
    const cursor = req.query.cursor ? String(req.query.cursor) : void 0;
    const filterType = req.query.type ? String(req.query.type) : void 0;
    const force = req.query.force === "true";
    const result = await getGlobalSpendingHistory({
      limit: limitParam,
      cursor,
      filterType,
      force
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.post("/course-entitlements/grant", async (req, res) => {
  try {
    const { studentUid, courseId, lessonId, action, reason } = req.body || {};
    const adminUid = req.user?.uid || "admin";
    const adminName = req.user?.displayName || "Qu\u1EA3n tr\u1ECB vi\xEAn";
    const result = await grantOrRevokeCourseEntitlement(
      adminUid,
      adminName,
      studentUid,
      courseId,
      lessonId,
      action || "grant",
      reason
    );
    await recordAuditLog(
      req.user,
      action === "revoke" ? "REVOKE_COURSE_ENTITLEMENT" : "GRANT_COURSE_ENTITLEMENT",
      studentUid,
      "course_entitlement",
      { courseId, lessonId, action, reason },
      req
    );
    return res.json({
      success: true,
      message: action === "revoke" ? "\u0110\xE3 thu h\u1ED3i quy\u1EC1n truy c\u1EADp kh\xF3a h\u1ECDc." : "\u0110\xE3 c\u1EA5p quy\u1EC1n truy c\u1EADp kh\xF3a h\u1ECDc th\xE0nh c\xF4ng!",
      ...result
    });
  } catch (err) {
    return res.status(400).json({ error: "course_entitlement_error", message: err.message || String(err) });
  }
});
adminRouter.get("/wallet/students", async (req, res) => {
  try {
    const { search, filterStatus, className, limit, offset } = req.query;
    const isForce = req.query.force === "true";
    const result = await getStudentDebtSummaries({
      search,
      filterStatus,
      className,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      force: isForce
    });
    return res.json({ success: true, items: result.items, total: result.total });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.get("/wallet/students/:uid/details", async (req, res) => {
  try {
    const uid = req.params.uid;
    const force = req.query.force === "true";
    const details = await getStudentWalletDetails(uid, force);
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
    const isForce = req.query.force === "true";
    const requests = await getDepositRequests({
      status,
      search,
      limit: limit ? Number(limit) : 50,
      force: isForce
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
    const force = req.query.force === "true";
    const items = await getVouchersList(force);
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.get("/vouchers/usages", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const voucherId = req.query.voucherId || void 0;
    const items = await getVoucherUsagesList(voucherId, force);
    return res.json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ error: "server_error", message: err.message || String(err) });
  }
});
adminRouter.get("/vouchers/:id/usages", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const id = req.params.id;
    const items = await getVoucherUsagesList(id, force);
    return res.json({ success: true, items, total: items.length });
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
adminRouter.get("/courses/purchases", async (req, res) => {
  try {
    const rawLimit = req.query.limit ? Number(req.query.limit) : MAX_COURSE_PURCHASES_PAGE_SIZE;
    const limitParam = Math.min(MAX_COURSE_PURCHASES_PAGE_SIZE, Math.max(1, Math.floor(rawLimit || MAX_COURSE_PURCHASES_PAGE_SIZE)));
    const courseId = req.query.courseId ? String(req.query.courseId) : void 0;
    const cursor = req.query.cursor ? String(req.query.cursor) : void 0;
    const scope = req.query.scope === "course" || req.query.scope === "lesson" ? req.query.scope : "all";
    const status = req.query.status === "active" || req.query.status === "revoked" ? req.query.status : "all";
    const force = req.query.force === "true";
    const result = await getAdminCoursePurchases({
      courseId,
      limit: limitParam,
      cursor,
      scope,
      status,
      force
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: "course_purchases_error", message: err.message || String(err) });
  }
});
adminRouter.get("/courses/:courseId/purchases", async (req, res) => {
  try {
    const rawLimit = req.query.limit ? Number(req.query.limit) : MAX_COURSE_PURCHASES_PAGE_SIZE;
    const limitParam = Math.min(MAX_COURSE_PURCHASES_PAGE_SIZE, Math.max(1, Math.floor(rawLimit || MAX_COURSE_PURCHASES_PAGE_SIZE)));
    const courseId = req.params.courseId;
    const cursor = req.query.cursor ? String(req.query.cursor) : void 0;
    const scope = req.query.scope === "course" || req.query.scope === "lesson" ? req.query.scope : "all";
    const status = req.query.status === "active" || req.query.status === "revoked" ? req.query.status : "all";
    const force = req.query.force === "true";
    const result = await getAdminCoursePurchases({
      courseId,
      limit: limitParam,
      cursor,
      scope,
      status,
      force
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: "course_purchases_error", message: err.message || String(err) });
  }
});
adminRouter.post("/courses/probe-video", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "missing_url", message: "Thi\u1EBFu URL video c\u1EA7n \u0111o th\u1EDDi l\u01B0\u1EE3ng." });
    }
    const probe = await probeVideoDuration(url);
    return res.json({
      success: true,
      found: Boolean(probe && (probe.durationSeconds > 0 || probe.title)),
      ...probe || { durationSeconds: 0, durationMinutes: 0 }
    });
  } catch (err) {
    return res.status(400).json({ error: "probe_video_error", message: err.message || String(err) });
  }
});
adminRouter.use("/ai-shop", aiShopAdminRouter);
adminRouter.use("/minigames", minigameAdminRouter);
adminRouter.use("/documents", documentLibraryAdminRouter);
adminRouter.post("/notifications/broadcast", async (req, res) => {
  try {
    const parsed = broadcastNotificationSchema.parse(req.body || {});
    const item = await publishDeviceNotification({
      recipientUid: parsed.recipientUid || "all",
      type: parsed.type,
      title: parsed.title,
      message: parsed.message,
      route: parsed.route,
      actorName: req.user.displayName || req.user.email || "Admin"
    });
    return res.status(201).json({ success: true, notification: item });
  } catch (err) {
    return res.status(400).json({
      error: "broadcast_error",
      message: err?.issues?.[0]?.message || err?.message || "Kh\xF4ng th\u1EC3 g\u1EEDi th\xF4ng b\xE1o."
    });
  }
});
export {
  adminRouter,
  formatCalendarDateKey,
  invalidateAnalyticsCache,
  invalidateUserListCache,
  parseTimestampMs2 as parseTimestampMs
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
