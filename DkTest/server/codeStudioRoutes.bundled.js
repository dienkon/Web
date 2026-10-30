var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/routes/codeStudioRoutes.ts
import express from "express";

// server/codeStudioShares.ts
import { createHash } from "node:crypto";

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
function getFirebaseApiKey() {
  return process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyDp9p5hkQ6fVEou4znk5YZu81VhgZtM7h4";
}

// src/practice/code-studio/media.ts
var IMAGE_LIMIT = 8 * 1024 * 1024;
var VIDEO_LIMIT = 25 * 1024 * 1024;
var BATCH_LIMIT = 50 * 1024 * 1024;
var types = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
function validAsset(asset) {
  if (!asset || typeof asset.mime !== "string" || !Object.hasOwn(types, asset.mime)) return false;
  const kind = asset?.mime?.startsWith("video/") ? "video" : "image";
  return asset && types[asset.mime] && Number.isInteger(asset.bytes) && asset.bytes > 0 && asset.bytes <= (kind === "video" ? VIDEO_LIMIT : IMAGE_LIMIT) && typeof asset.url === "string" && asset.url.length <= 2048 && new RegExp(`^https://res\\.cloudinary\\.com/[A-Za-z0-9_-]+/${kind}/upload/[^\\s<>"']+$`).test(asset.url);
}

// src/practice/code-studio/project.ts
var MAX_PROJECT_BYTES = 1e6;
function cleanPath(value) {
  const path = value.trim().replace(/\\/g, "/");
  if (!path || path.length > 160 || path.startsWith("/") || /[\x00-\x1f<>:"|?*#]/.test(path) || path.split("/").some((p) => !p || p === "." || p === ".." || p.trim() !== p)) {
    throw new Error("\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng h\u1EE3p l\u1EC7. V\xED d\u1EE5: src/main.js");
  }
  return path;
}
function validateProject(input) {
  if (!input || typeof input !== "object") throw new Error("D\u1EF1 \xE1n kh\xF4ng h\u1EE3p l\u1EC7.");
  const p = input;
  if (p.version !== 1 || typeof p.name !== "string" || !p.name.trim() || p.name.length > 80 || !Array.isArray(p.files) || !p.files.length || p.files.length > 100 || !Array.isArray(p.folders) || p.folders.length > 100) throw new Error("D\u1EF1 \xE1n c\u1EA7n 1\u2013100 file v\xE0 t\xEAn t\u1ED1i \u0111a 80 k\xFD t\u1EF1.");
  const files = p.files.map((f) => {
    if (!f || typeof f.path !== "string" || typeof f.content !== "string") throw new Error("File kh\xF4ng h\u1EE3p l\u1EC7.");
    if (f.asset && (!validAsset(f.asset) || f.content !== "")) throw new Error("File media kh\xF4ng h\u1EE3p l\u1EC7.");
    return { path: cleanPath(f.path), content: f.content, ...f.asset ? { asset: { url: f.asset.url, mime: f.asset.mime, bytes: f.asset.bytes } } : {} };
  });
  if (files.reduce((total, file) => total + (file.asset?.bytes || 0), 0) > 80 * 1024 * 1024) throw new Error("T\u1ED5ng \u1EA3nh/video m\u1ED7i d\u1EF1 \xE1n t\u1ED1i \u0111a 80 MB \u0111\u1EC3 c\xF3 th\u1EC3 xu\u1EA5t ZIP tr\xEAn mobile.");
  const folders = [...new Set(p.folders.map((f) => {
    if (typeof f !== "string") throw new Error("Th\u01B0 m\u1EE5c kh\xF4ng h\u1EE3p l\u1EC7.");
    return cleanPath(f);
  }))];
  const paths = files.map((f) => f.path);
  if (new Set(paths).size !== paths.length || paths.some((path) => paths.some((other) => other.startsWith(path + "/")) || folders.some((folder) => folder === path || folder.startsWith(path + "/")))) throw new Error("File v\xE0 th\u01B0 m\u1EE5c b\u1ECB tr\xF9ng \u0111\u01B0\u1EDDng d\u1EABn.");
  const project = { version: 1, id: typeof p.id === "string" && /^[\w-]{1,80}$/.test(p.id) ? p.id : crypto.randomUUID(), name: p.name.trim(), files, folders, activeFile: paths.includes(p.activeFile) ? p.activeFile : paths[0], entry: paths.includes(p.entry) ? p.entry : paths.find((f) => /\.html?$/i.test(f)) || paths[0], updatedAt: Date.now() };
  if (new TextEncoder().encode(JSON.stringify(project)).length > MAX_PROJECT_BYTES) throw new Error("D\u1EF1 \xE1n qu\xE1 l\u1EDBn (t\u1ED1i \u0111a 1 MB).");
  return project;
}

// src/practice/code-studio/publishedShare.ts
function validatePublishedShare(input) {
  const p = input;
  if (!p || p.version !== 1 || !["website", "website-edit", "editor"].includes(p.mode) || typeof p.title !== "string" || !p.title.trim() || p.title.length > 160 || typeof p.description !== "string" || p.description.length > 300 || typeof p.payload !== "string" || new TextEncoder().encode(p.payload).length > 7e5) throw new Error("D\u1EEF li\u1EC7u chia s\u1EBB kh\xF4ng h\u1EE3p l\u1EC7 (m\xE3 ngu\u1ED3n t\u1ED1i \u0111a 700 KB, \u1EA3nh t\u1ED1i \u0111a 135 KB).");
  const data = JSON.parse(p.payload);
  if (p.imageUrl !== void 0 && (typeof p.imageUrl !== "string" || p.imageUrl !== "" && !isShareImageUrl(p.imageUrl))) throw new Error("\u1EA2nh chia s\u1EBB ph\u1EA3i l\xE0 URL \u1EA3nh HTTPS tr\xEAn Cloudinary.");
  if (p.imageDataUrl !== void 0) {
    if (typeof p.imageDataUrl !== "string" || p.imageDataUrl.length > 18e4 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.imageDataUrl)) throw new Error("\u1EA2nh chia s\u1EBB c\u0169 kh\xF4ng h\u1EE3p l\u1EC7.");
    const bytes = atob(p.imageDataUrl.split(",")[1]);
    if (bytes.length < 24 || bytes.charCodeAt(0) !== 255 || bytes.charCodeAt(1) !== 216) throw new Error("\u1EA2nh chia s\u1EBB ph\u1EA3i l\xE0 JPEG h\u1EE3p l\u1EC7.");
  }
  if (p.mode === "website") {
    if (data?.version !== 1 || typeof data.html !== "string" || !data.html.startsWith("<!DOCTYPE html>")) throw new Error("Website chia s\u1EBB kh\xF4ng h\u1EE3p l\u1EC7.");
  } else validateProject(data);
  const result = { version: 1, mode: p.mode, title: p.title.trim(), description: p.description, ...p.imageUrl ? { imageUrl: p.imageUrl } : {}, ...p.imageDataUrl ? { imageDataUrl: p.imageDataUrl } : {}, payload: p.payload, createdAt: typeof p.createdAt === "string" ? p.createdAt : "", ...typeof p.updatedAt === "string" ? { updatedAt: p.updatedAt } : {} };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 9e5) throw new Error("B\u1EA3n chia s\u1EBB qu\xE1 l\u1EDBn \u0111\u1EC3 l\u01B0u Firebase.");
  return result;
}
function shareSlug(title) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42).replace(/-$/, "") || "website";
}
function shareIdFromSlug(slug) {
  return /\.([a-f0-9]{16})$/.exec(slug)?.[1] || "";
}
function isShareImageUrl(value) {
  return value.length <= 2048 && /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/[^\s<>"']+$/.test(value);
}

// src/practice/code-studio/shareName.ts
function validShareName(name) {
  return typeof name === "string" && /^[a-z0-9](?:[a-z0-9-]{1,40}[a-z0-9])$/.test(name) && !["api", "admin", "practice", "login", "assets", "settings", "dkcode", "www"].includes(name);
}

// server/codeStudioShares.ts
var namesCollection = "code_studio_names";
var collection = "code_studio_shares";
var failure = (message, status) => Object.assign(new Error(message), { status });
function restUrl(id, targetCollection = collection) {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "exam-fd7a1";
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${targetCollection}/${id}?key=${encodeURIComponent(getFirebaseApiKey())}`;
}
async function readRawShare(id, targetCollection = collection) {
  const response = await fetch(restUrl(id, targetCollection), { signal: AbortSignal.timeout(1e4), cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw failure(targetCollection === namesCollection ? "Ch\u01B0a ki\u1EC3m tra \u0111\u01B0\u1EE3c t\xEAn link. C\u1EA7n c\u1EADp nh\u1EADt rules code_studio_names ho\u1EB7c c\u1EA5u h\xECnh Firebase Admin." : "Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c Firebase. Ki\u1EC3m tra rules code_studio_shares ho\u1EB7c Firebase Admin.", 503);
  const document = await response.json();
  return { data: decodeFirestoreDocument(document), updateTime: document.updateTime };
}
async function readStudioShare(id) {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  if (adminDb) {
    const doc = await adminDb.collection(collection).doc(id).get();
    return doc.exists ? validatePublishedShare(doc.data()) : null;
  }
  const document = await readRawShare(id);
  return document ? validatePublishedShare(document.data) : null;
}
async function resolveStudioShareName(name) {
  if (!validShareName(name)) return "";
  const data = adminDb ? (await adminDb.collection(namesCollection).doc(name).get()).data() : (await readRawShare(name, namesCollection))?.data;
  return typeof data?.shareId === "string" && /^[a-f0-9]{16}$/.test(data.shareId) ? data.shareId : "";
}
async function shareNameAvailable(name) {
  if (!validShareName(name)) throw failure("T\xEAn link kh\xF4ng h\u1EE3p l\u1EC7. D\xF9ng 3\u201342 ch\u1EEF th\u01B0\u1EDDng, s\u1ED1 ho\u1EB7c d\u1EA5u g\u1EA1ch ngang, kh\xF4ng \u0111\u1EB7t g\u1EA1ch ngang \u1EDF \u0111\u1EA7u/cu\u1ED1i.", 400);
  return !await resolveStudioShareName(name);
}
async function publisherUid(token) {
  if (!token) throw failure("Vui l\xF2ng \u0111\u0103ng nh\u1EADp ho\u1EB7c x\xE1c th\u1EF1c phi\xEAn chia s\u1EBB r\u1ED3i th\u1EED l\u1EA1i.", 401);
  if (adminAuth) {
    try {
      return (await adminAuth.verifyIdToken(token)).uid;
    } catch (error) {
      const code = error?.code;
      if (code === "auth/invalid-credential" || code === "app/invalid-credential" || code === "auth/insufficient-permission") throw Object.assign(failure("C\u1EA5u h\xECnh x\xE1c th\u1EF1c Firebase tr\xEAn server ch\u01B0a h\u1EE3p l\u1EC7. Ki\u1EC3m tra Firebase Admin v\xE0 project ID.", 503), { code: "SHARE_AUTH_SERVER_CONFIG" });
      if (code === "auth/internal-error" || code === "app/network-error") throw Object.assign(failure("D\u1ECBch v\u1EE5 x\xE1c th\u1EF1c Firebase t\u1EA1m th\u1EDDi kh\xF4ng ph\u1EA3n h\u1ED3i. Vui l\xF2ng th\u1EED l\u1EA1i.", 503), { code: "SHARE_AUTH_UNAVAILABLE" });
      throw Object.assign(failure("Phi\xEAn chia s\u1EBB kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.", 401), { code: "SHARE_AUTH_SESSION" });
    }
  }
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(getFirebaseApiKey())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(1e4) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const providerCode = typeof body?.error?.message === "string" ? body.error.message.split(/[ :]/)[0] : "";
    const reasons = Array.isArray(body?.error?.details) ? body.error.details.map((detail) => detail?.reason).filter((reason) => typeof reason === "string") : [];
    const sessionErrors = ["INVALID_ID_TOKEN", "TOKEN_EXPIRED", "USER_NOT_FOUND", "USER_DISABLED", "CREDENTIAL_TOO_OLD_LOGIN_AGAIN"];
    if (sessionErrors.includes(providerCode)) throw Object.assign(failure("Phi\xEAn chia s\u1EBB kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i.", 401), { code: "SHARE_AUTH_SESSION" });
    console.warn("[CodeStudioAuth] Verification service rejected request", { status: response.status, category: reasons.some((reason) => reason.startsWith("API_KEY_")) || providerCode === "API_KEY_INVALID" ? "api-key-config" : "provider-config-or-unavailable" });
    throw Object.assign(failure(response.status >= 500 || response.status === 429 ? "D\u1ECBch v\u1EE5 x\xE1c th\u1EF1c Firebase t\u1EA1m th\u1EDDi kh\xF4ng ph\u1EA3n h\u1ED3i. Vui l\xF2ng th\u1EED l\u1EA1i." : "C\u1EA5u h\xECnh x\xE1c th\u1EF1c Firebase tr\xEAn server ch\u01B0a h\u1EE3p l\u1EC7. Ki\u1EC3m tra API key c\xF9ng project v\u1EDBi web v\xE0 quy\u1EC1n Identity Toolkit API.", 503), { code: response.status >= 500 || response.status === 429 ? "SHARE_AUTH_UNAVAILABLE" : "SHARE_AUTH_SERVER_CONFIG" });
  }
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (typeof uid !== "string" || !uid) throw failure("Phi\xEAn chia s\u1EBB kh\xF4ng h\u1EE3p l\u1EC7.", 401);
  return uid;
}
async function publishStudioShare(input, token) {
  const share = validatePublishedShare(input);
  if (share.imageDataUrl) throw new Error("\u1EA2nh chia s\u1EBB m\u1EDBi ph\u1EA3i l\u01B0u qua Cloudinary. H\xE3y t\u1EA3i l\u1EA1i trang v\xE0 t\u1EA1o link l\u1EA1i.");
  const projectId = input.projectId;
  if (typeof projectId !== "string" || !/^[\w-]{1,80}$/.test(projectId)) throw failure("Thi\u1EBFu m\xE3 d\u1EF1 \xE1n. H\xE3y t\u1EA3i l\u1EA1i trang tr\u01B0\u1EDBc khi chia s\u1EBB.", 400);
  const ownerUid = await publisherUid(token);
  const id = createHash("sha256").update(ownerUid + "\0" + projectId).digest("hex").slice(0, 16);
  if (input.shareId !== void 0 && input.shareId !== id) throw failure("Link n\xE0y thu\u1ED9c d\u1EF1 \xE1n ho\u1EB7c t\xE0i kho\u1EA3n kh\xE1c. Kh\xF4ng th\u1EC3 ghi \u0111\xE8.", 403);
  const requestedName = input.customSlug;
  if (requestedName !== void 0 && !validShareName(requestedName)) throw failure("T\xEAn link kh\xF4ng h\u1EE3p l\u1EC7. D\xF9ng 3\u201342 ch\u1EEF th\u01B0\u1EDDng, s\u1ED1 v\xE0 d\u1EA5u g\u1EA1ch ngang.", 400);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const build = (existing) => {
    if (existing && (existing.ownerUid !== ownerUid || existing.projectId !== projectId)) throw failure("B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n c\u1EADp nh\u1EADt link n\xE0y.", 403);
    if (existing?.customSlug && requestedName && requestedName !== existing.customSlug) throw failure("M\u1ED7i d\u1EF1 \xE1n gi\u1EEF m\u1ED9t t\xEAn link c\u1ED1 \u0111\u1ECBnh \u0111\xE3 ch\u1ECDn.", 400);
    return { ...share, ownerUid, projectId, ...existing?.customSlug || requestedName ? { customSlug: existing?.customSlug || requestedName } : {}, slug: existing?.slug || shareSlug(share.title), createdAt: existing?.createdAt || now, updatedAt: now };
  };
  let saved;
  if (adminDb) {
    const ref = adminDb.collection(collection).doc(id);
    saved = await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const next = build(doc.exists ? doc.data() : null);
      if (next.customSlug) {
        const nameRef = adminDb.collection(namesCollection).doc(next.customSlug), nameDoc = await tx.get(nameRef);
        if (nameDoc.exists && nameDoc.data()?.shareId !== id) throw failure("T\xEAn link \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u1EB7t. H\xE3y ch\u1ECDn t\xEAn kh\xE1c.", 409);
        if (!nameDoc.exists) tx.create(nameRef, { shareId: id, ownerUid, projectId, slug: next.customSlug });
      }
      tx.set(ref, next);
      return next;
    });
  } else {
    const current = await readRawShare(id);
    saved = build(current?.data);
    if (saved.customSlug) {
      const alias = await readRawShare(saved.customSlug, namesCollection);
      if (alias && alias.data.shareId !== id) throw failure("T\xEAn link \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u1EB7t. H\xE3y ch\u1ECDn t\xEAn kh\xE1c.", 409);
      if (!alias) {
        const base = restUrl(id).split("/documents/")[0];
        const documentRoot = new URL(base).pathname.slice(4);
        const writes = [
          { update: { name: documentRoot + "/documents/" + collection + "/" + id, fields: encodeFirestoreFields(saved) }, currentDocument: current?.updateTime ? { updateTime: current.updateTime } : { exists: !!current } },
          { update: { name: documentRoot + "/documents/" + namesCollection + "/" + saved.customSlug, fields: encodeFirestoreFields({ shareId: id, ownerUid, projectId, slug: saved.customSlug }) }, currentDocument: { exists: false } }
        ];
        const response2 = await fetch(base + "/documents:commit?key=" + encodeURIComponent(getFirebaseApiKey()), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ writes }), signal: AbortSignal.timeout(15e3) });
        if (response2.status === 409 || response2.status === 412) throw failure("T\xEAn link v\u1EEBa \u0111\u01B0\u1EE3c \u0111\u1EB7t ho\u1EB7c d\u1EF1 \xE1n v\u1EEBa \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt. H\xE3y ki\u1EC3m tra v\xE0 th\u1EED l\u1EA1i.", 409);
        if (!response2.ok) throw failure("Ch\u01B0a l\u01B0u \u0111\u01B0\u1EE3c t\xEAn link. C\u1EA7n c\u1EA5u h\xECnh Firebase Admin ho\u1EB7c c\u1EADp nh\u1EADt rules DkCode.", 503);
        return { id, path: `/code/${saved.customSlug}`, title: saved.title, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
      }
    }
    const precondition = current?.updateTime ? "&currentDocument.updateTime=" + encodeURIComponent(current.updateTime) : "&currentDocument.exists=" + Boolean(current);
    const response = await fetch(restUrl(id) + precondition, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ fields: encodeFirestoreFields(saved) }), signal: AbortSignal.timeout(15e3) });
    if (response.status === 409 || response.status === 412) throw failure("D\u1EF1 \xE1n v\u1EEBa \u0111\u01B0\u1EE3c chia s\u1EBB \u1EDF phi\xEAn kh\xE1c. B\u1EA5m c\u1EADp nh\u1EADt l\u1EA1i \u0111\u1EC3 gi\u1EEF c\xF9ng link.", 409);
    if (!response.ok) throw failure("Firebase ch\u01B0a cho ph\xE9p c\u1EADp nh\u1EADt link. \xC1p d\u1EE5ng rules code_studio_shares ho\u1EB7c c\u1EA5u h\xECnh Firebase Admin.", 503);
  }
  return { id, path: saved.customSlug ? `/code/${saved.customSlug}` : `/code/${saved.slug}.${id}`, title: saved.title, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
}
var escape = (value) => value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
function renderStudioShareHtml(template, share, canonical, imageUrl = share.imageUrl || "") {
  const title = escape(share.title), description = escape(share.description), url = escape(canonical), image = escape(imageUrl);
  const clean = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "").replace(/<meta\b[^>]*(?:name|property)=["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>/gi, "").replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");
  const imageTags = image ? `<meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${image}">` : "";
  const tags = `<title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${title}">${imageTags}`;
  return clean.replace(/<\/head>/i, tags + "</head>");
}

// src/services/server/generatedHtmlTemplate.ts
var PRODUCTION_HTML_TEMPLATE = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />

    <title>DK TEST - H\u1EC7 th\u1ED1ng thi tr\u1EF1c tuy\u1EBFn</title>

    <meta
      name="description"
      content="DK TEST - H\u1EC7 th\u1ED1ng t\u1EA1o, qu\u1EA3n l\xFD v\xE0 tham gia c\xE1c b\xE0i ki\u1EC3m tra tr\u1EF1c tuy\u1EBFn."
    />
    <meta name="theme-color" content="#0f172a" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="DK TEST - H\u1EC7 th\u1ED1ng thi tr\u1EF1c tuy\u1EBFn" />
    <meta
      property="og:description"
      content="T\u1EA1o \u0111\u1EC1, t\u1ED5 ch\u1EE9c k\u1EF3 thi v\xE0 l\xE0m b\xE0i tr\u1EF1c tuy\u1EBFn v\u1EDBi DK TEST."
    />
    <meta property="og:site_name" content="DK TEST" />
    <meta property="og:url" content="https://dk-test-v3.vercel.app/" />
    <meta property="og:image" content="https://dk-test-v3.vercel.app/logo.png" />
    <meta property="og:image:secure_url" content="https://dk-test-v3.vercel.app/logo.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="768" />
    <meta property="og:image:height" content="768" />
    <meta property="og:locale" content="vi_VN" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="DK TEST - H\u1EC7 th\u1ED1ng thi tr\u1EF1c tuy\u1EBFn" />
    <meta
      name="twitter:description"
      content="T\u1EA1o \u0111\u1EC1, t\u1ED5 ch\u1EE9c k\u1EF3 thi v\xE0 l\xE0m b\xE0i tr\u1EF1c tuy\u1EBFn v\u1EDBi DK TEST."
    />
    <meta name="twitter:image" content="https://dk-test-v3.vercel.app/logo.png" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />

    <!-- Pre-Boot Resilience & Anti-Blank Screen Shield -->
    <script>
      (function() {
        // Theme Pre-boot initialization (avoids FOUC)
        try {
          var savedTheme = localStorage.getItem('dktest_theme');
          var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          var savedIntensity = localStorage.getItem('dktest_dark_intensity') || 'chrome';
          document.documentElement.setAttribute('data-dark-intensity', savedIntensity);
          if (savedTheme === 'dark' || ((!savedTheme || savedTheme === 'system') && systemDark)) {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
          }
        } catch (e) {}

        // 0. Ancient Browser Detection Guard (Pre-ES6 check)
        if (typeof Promise === 'undefined' || typeof Symbol === 'undefined' || typeof Map === 'undefined') {
          window.__DK_BROWSER_UNSUPPORTED__ = true;
          window.addEventListener('DOMContentLoaded', function() {
            var root = document.getElementById('root');
            if (root) {
              root.innerHTML = '<div style="min-height:100vh;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;"><div style="max-width:400px;background:#1e293b;border-radius:24px;padding:32px;border:1px solid #334155;"><h2 style="font-size:20px;font-weight:800;color:#f87171;margin-bottom:12px;">Tr\xECnh duy\u1EC7t qu\xE1 c\u0169</h2><p style="font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:20px;">Phi\xEAn b\u1EA3n tr\xECnh duy\u1EC7t c\u1EE7a b\u1EA1n kh\xF4ng c\xF2n \u0111\xE1p \u1EE9ng ti\xEAu chu\u1EA9n b\u1EA3o m\u1EADt cho k\u1EF3 thi tr\u1EF1c tuy\u1EBFn. Vui l\xF2ng m\u1EDF DkTEST b\u1EB1ng Google Chrome b\u1EA3n m\u1EDBi tr\xEAn CH Play ho\u1EB7c C\u1ED1c C\u1ED1c.</p><a href="https://www.google.com/chrome/" target="_blank" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:12px;text-decoration:none;font-size:13px;font-weight:700;">T\u1EA3i Google Chrome</a></div></div>';
            }
          });
          return;
        }

        // 1. Safe fetch property shim
        try {
          var originalFetch = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : undefined;
          if (typeof window !== 'undefined') {
            var proto = window;
            while (proto) {
              var desc = Object.getOwnPropertyDescriptor(proto, 'fetch');
              if (desc) {
                if (!desc.set && desc.configurable !== false) {
                  var activeFetch = originalFetch;
                  Object.defineProperty(window, 'fetch', {
                    get: function() { return activeFetch; },
                    set: function(val) { activeFetch = val; },
                    configurable: true,
                    enumerable: true
                  });
                }
                break;
              }
              proto = Object.getPrototypeOf(proto);
            }
          }
        } catch (e) {}

        // 2. Safe Storage Shim (handles Private Browsing / SecurityError on Chrome Android)
        try {
          var storageTest = window.localStorage;
          storageTest.setItem('__dk_test__', '1');
          storageTest.removeItem('__dk_test__');
        } catch (storageErr) {
          try {
            var mem = {};
            var createStoragePolyfill = function() {
              return {
                getItem: function(k) { return mem[k] !== undefined ? mem[k] : null; },
                setItem: function(k, v) { mem[k] = String(v); },
                removeItem: function(k) { delete mem[k]; },
                clear: function() { mem = {}; },
                get length() { return Object.keys(mem).length; },
                key: function(i) { return Object.keys(mem)[i] || null; }
              };
            };
            Object.defineProperty(window, 'localStorage', { value: createStoragePolyfill(), configurable: true });
            Object.defineProperty(window, 'sessionStorage', { value: createStoragePolyfill(), configurable: true });
          } catch (polyErr) {}
        }

        // 3. structuredClone shim
        if (typeof window !== 'undefined' && typeof window.structuredClone === 'undefined') {
          window.structuredClone = function(obj) {
            try {
              return JSON.parse(JSON.stringify(obj));
            } catch (err) {
              return obj;
            }
          };
        }

        // 4. crypto.randomUUID shim (Safe for HTTP / older Android WebViews)
        if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
          window.crypto.randomUUID = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { 
              var r = Math.random() * 16 | 0;
              var v = c === 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          };
        }

        // 5. AbortSignal.timeout shim (Added in Chrome 103, absent in Chrome 101)
        if (typeof AbortSignal !== 'undefined' && !AbortSignal.timeout) {
          AbortSignal.timeout = function(ms) {
            var controller = new AbortController();
            setTimeout(function() {
              try {
                controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
              } catch (e) {
                controller.abort();
              }
            }, ms);
            return controller.signal;
          };
        }

        // 6. URL.canParse shim (Added in Chrome 120, absent in Chrome 101)
        if (typeof URL !== 'undefined' && !URL.canParse) {
          URL.canParse = function(url, base) {
            try {
              new URL(url, base);
              return true;
            } catch (e) {
              return false;
            }
          };
        }

        // 7. Object.hasOwn shim (Chrome 93+)
        if (typeof Object !== 'undefined' && !Object.hasOwn) {
          Object.hasOwn = function(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
          };
        }

        // 8. Array.prototype.at & String.prototype.at shim (Chrome 92+)
        if (typeof Array !== 'undefined' && !Array.prototype.at) {
          Array.prototype.at = function(n) {
            n = Math.trunc(n) || 0;
            if (n < 0) n += this.length;
            if (n < 0 || n >= this.length) return undefined;
            return this[n];
          };
        }
        if (typeof String !== 'undefined' && !String.prototype.at) {
          String.prototype.at = function(n) {
            n = Math.trunc(n) || 0;
            if (n < 0) n += this.length;
            if (n < 0 || n >= this.length) return "";
            return this.charAt(n);
          };
        }

        // 9. ResizeObserver & IntersectionObserver safety shims for restricted WebViews
        if (typeof window !== 'undefined' && !window.ResizeObserver) {
          window.ResizeObserver = function() {
            this.observe = function() {};
            this.unobserve = function() {};
            this.disconnect = function() {};
          };
        }
        if (typeof window !== 'undefined' && !window.IntersectionObserver) {
          window.IntersectionObserver = function() {
            this.observe = function() {};
            this.unobserve = function() {};
            this.disconnect = function() {};
          };
        }

        // 10. navigator.clipboard shim
        if (typeof navigator !== 'undefined' && !navigator.clipboard) {
          navigator.clipboard = {
            writeText: function(text) {
              return new Promise(function(resolve, reject) {
                try {
                  var textarea = document.createElement('textarea');
                  textarea.value = String(text || '');
                  textarea.style.position = 'fixed';
                  textarea.style.opacity = '0';
                  textarea.style.pointerEvents = 'none';
                  document.body.appendChild(textarea);
                  textarea.focus();
                  textarea.select();
                  var success = document.execCommand('copy');
                  document.body.removeChild(textarea);
                  if (success) resolve(); else reject(new Error('execCommand copy failed'));
                } catch (e) {
                  reject(e);
                }
              });
            },
            readText: function() {
              return Promise.resolve('');
            }
          };
        }

        // 11. BroadcastChannel shim (for older WebViews)
        if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'undefined') {
          window.BroadcastChannel = function(name) {
            this.name = name;
            this.onmessage = null;
            this.onmessageerror = null;
            this.postMessage = function(data) {
              try {
                if (typeof window.localStorage !== 'undefined') {
                  window.localStorage.setItem('__dk_bc_' + name, JSON.stringify({ d: data, t: Date.now() }));
                }
              } catch(e) {}
            };
            this.close = function() {};
          };
        }

        // 12. Fullscreen API safe fallback shims
        if (typeof Element !== 'undefined' && !Element.prototype.requestFullscreen) {
          Element.prototype.requestFullscreen =
            Element.prototype.webkitRequestFullscreen ||
            Element.prototype.mozRequestFullScreen ||
            Element.prototype.msRequestFullscreen ||
            function() { return Promise.resolve(); };
        }
        if (typeof Document !== 'undefined' && !Document.prototype.exitFullscreen) {
          Document.prototype.exitFullscreen =
            Document.prototype.webkitExitFullscreen ||
            Document.prototype.mozCancelFullScreen ||
            Document.prototype.msExitFullscreen ||
            function() { return Promise.resolve(); };
        }

        // 13. requestIdleCallback shim
        if (typeof window !== 'undefined' && !window.requestIdleCallback) {
          window.requestIdleCallback = function(cb) {
            return setTimeout(function() {
              cb({ didTimeout: false, timeRemaining: function() { return 50; } });
            }, 1);
          };
          window.cancelIdleCallback = function(id) { clearTimeout(id); };
        }

        // 14. Early Zombie ServiceWorker Cleanup
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          try {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              for (var i = 0; i < regs.length; i++) {
                regs[i].unregister().catch(function() {});
              }
            }).catch(function() {});
          } catch (e) {}
        }

        // 9. Early ChunkLoadError auto-recovery listener
        var CHUNK_KEY = 'dk_last_chunk_recovery';
        var handleEarlyChunkError = function(msg) {
          var text = String(msg || '').toLowerCase();
          if (
            text.indexOf('chunk') !== -1 ||
            text.indexOf('dynamically imported module') !== -1 ||
            text.indexOf('loading css chunk') !== -1 ||
            text.indexOf('failed to fetch') !== -1
          ) {
            var last = sessionStorage.getItem(CHUNK_KEY);
            var now = Date.now();
            if (!last || (now - parseInt(last, 10)) > 30000) {
              sessionStorage.setItem(CHUNK_KEY, String(now));
              var clean = new URL(window.location.href);
              clean.searchParams.set('_r', String(now));
              window.location.replace(clean.toString());
            }
          }
        };

        window.addEventListener('error', function(e) {
          handleEarlyChunkError(e.message || (e.error && e.error.message));
        });
        window.addEventListener('unhandledrejection', function(e) {
          handleEarlyChunkError(e.reason && (e.reason.message || e.reason));
        });
      })();
    </script>

    <style>
      /* Zero-FOUC Initial App Shell */
      html, body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        -webkit-tap-highlight-color: transparent;
        text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
        overflow-x: hidden;
        max-width: 100vw;
      }
      .dk-boot-shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        text-align: center;
        background: #0f172a;
        box-sizing: border-box;
      }
      @supports (min-height: 100dvh) {
        .dk-boot-shell {
          min-height: 100dvh;
        }
      }
      .dk-boot-logo {
        width: 60px;
        height: 60px;
        border-radius: 18px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        animation: dk-pulse 2s infinite ease-in-out;
      }
      .dk-boot-title {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin-bottom: 6px;
      }
      .dk-boot-sub {
        font-size: 13px;
        color: #94a3b8;
        font-weight: 500;
        margin-bottom: 20px;
      }
      .dk-boot-bar {
        width: 140px;
        height: 4px;
        border-radius: 2px;
        background: #1e293b;
        overflow: hidden;
        position: relative;
      }
      .dk-boot-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 40%;
        background: #3b82f6;
        border-radius: 2px;
        animation: dk-slide 1.4s infinite ease-in-out;
      }
      @keyframes dk-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes dk-slide {
        0% { left: -40%; }
        50% { left: 40%; }
        100% { left: 100%; }
      }
    </style>
    <script type="module" crossorigin src="/assets/index-DRkXcuMV.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor-react-Cg2vLLvP.js">
    <link rel="modulepreload" crossorigin href="/assets/vendor-charts-Dtra7FLy.js">
    <link rel="modulepreload" crossorigin href="/assets/vendor-icons-C7bFuPwS.js">
    <link rel="modulepreload" crossorigin href="/assets/vendor-firebase-BJt7ZhnJ.js">
    <link rel="modulepreload" crossorigin href="/assets/vendor-katex-T051Jbj4.js">
    <link rel="stylesheet" crossorigin href="/assets/vendor-katex-Ddr6Z9Sf.css">
    <link rel="stylesheet" crossorigin href="/assets/index-jQ-45apZ.css">
  </head>

  <body>
    <!-- App Root with sleek Instant Boot Shell (Replaced instantly when React mounts) -->
    <div id="root">
      <div class="dk-boot-shell">
        <div class="dk-boot-logo">
          <svg style="width:32px;height:32px;color:#ffffff;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div class="dk-boot-title">DkTEST</div>
        <div class="dk-boot-sub">\u0110ang kh\u1EDFi \u0111\u1ED9ng h\u1EC7 th\u1ED1ng thi...</div>
        <div class="dk-boot-bar"></div>
      </div>
    </div>

  </body>
</html>`;

// server/routes/codeStudioRoutes.ts
var codeStudioRouter = express.Router();
var publishes = /* @__PURE__ */ new Map();
codeStudioRouter.post("/shares", express.json({ limit: "950kb" }), async (req, res) => {
  const ip = req.ip || "unknown";
  if ((publishes.get(ip) || 0) > Date.now() - 3e3) return res.status(429).json({ error: "Vui l\xF2ng \u0111\u1EE3i v\xE0i gi\xE2y tr\u01B0\u1EDBc khi t\u1EA1o link m\u1EDBi." });
  if (publishes.size > 2e3) publishes.clear();
  publishes.set(ip, Date.now());
  try {
    return res.status(201).json(await publishStudioShare(req.body, req.get("authorization")?.replace(/^Bearer /i, "")));
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message || "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c chia s\u1EBB.", ...typeof e.code === "string" && e.code.startsWith("SHARE_") ? { code: e.code } : {} });
  }
});
codeStudioRouter.get("/names/:name", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    return res.json({ available: await shareNameAvailable(req.params.name) });
  } catch (e) {
    return res.status(e.status || 503).json({ error: e.message });
  }
});
codeStudioRouter.get("/named/:name", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = await resolveStudioShareName(req.params.name), share = id ? await readStudioShare(id) : null;
    if (!share) return res.status(404).json({ error: "Link kh\xF4ng t\u1ED3n t\u1EA1i." });
    return res.json(share);
  } catch (e) {
    return res.status(e.status || 503).json({ error: e.message });
  }
});
codeStudioRouter.get("/shares/:id", async (req, res) => {
  try {
    const share = await readStudioShare(req.params.id);
    if (!share) return res.status(404).json({ error: "Link kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB g\u1EE1." });
    res.setHeader("Cache-Control", "no-store");
    return res.json(share);
  } catch (e) {
    return res.status(e.status || 503).json({ error: e.message });
  }
});
codeStudioRouter.get("/shares/:id/image.jpg", async (req, res) => {
  try {
    const share = await readStudioShare(req.params.id);
    if (!share) return res.status(404).end();
    if (share.imageUrl) {
      res.setHeader("Cache-Control", "no-store");
      return res.redirect(302, share.imageUrl);
    }
    if (!share.imageDataUrl) return res.status(404).end();
    const bytes = Buffer.from(share.imageDataUrl.split(",")[1], "base64");
    if (bytes[0] !== 255 || bytes[1] !== 216) return res.status(400).end();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(bytes);
  } catch {
    return res.status(503).end();
  }
});
codeStudioRouter.use((error, _req, res, _next) => {
  const status = error.type === "entity.too.large" ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 413 ? "B\u1EA3n chia s\u1EBB qu\xE1 l\u1EDBn." : status === 400 ? "D\u1EEF li\u1EC7u JSON g\u1EEDi l\xEAn kh\xF4ng h\u1EE3p l\u1EC7." : "M\xE1y ch\u1EE7 chia s\u1EBB g\u1EB7p l\u1ED7i. Vui l\xF2ng th\u1EED l\u1EA1i sau." });
});
async function handleStudioSharePage(req, res) {
  try {
    const slug = req.params.slug || String(req.query.slug || "");
    const id = shareIdFromSlug(slug) || await resolveStudioShareName(slug);
    const share = await readStudioShare(id);
    if (!share) return res.status(404).type("html").send('<!doctype html><meta charset="utf-8"><h1>Link kh\xF4ng t\u1ED3n t\u1EA1i</h1>');
    const host = String(req.get?.("host") || req.headers.host || "");
    if (!/^[a-zA-Z0-9.:-]+$/.test(host)) return res.status(400).end();
    const protocol = req.headers["x-forwarded-proto"] === "https" || req.protocol === "https" ? "https" : "http";
    const origin = `${protocol}://${host}`;
    res.setHeader("Cache-Control", "no-store");
    return res.type("html").send(renderStudioShareHtml(PRODUCTION_HTML_TEMPLATE, share, `${origin}/code/${encodeURIComponent(slug)}`, share.imageUrl || (share.imageDataUrl ? `${origin}/api/code-studio/shares/${id}/image.jpg` : "")));
  } catch {
    return res.status(503).type("html").send('<!doctype html><meta charset="utf-8"><h1>Ch\u01B0a th\u1EC3 t\u1EA3i link chia s\u1EBB</h1><p>Vui l\xF2ng ki\u1EC3m tra c\u1EA5u h\xECnh Firebase.</p>');
  }
}
export {
  codeStudioRouter,
  handleStudioSharePage
};
