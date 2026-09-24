// server/routes/authRoutes.ts
import { Router } from "express";

// server/firebaseAdmin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
var isInitialized = false;
var adminAppInstance = null;
var adminAuthInstance = null;
var adminDbInstance = null;
var isConfiguredState = false;
function initFirebaseAdmin() {
  const existingApps = getApps();
  if (isInitialized && existingApps.length > 0) {
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
function decodeFirestoreDocument(doc) {
  if (!doc) return null;
  const id = doc.name ? doc.name.split("/").pop() : "";
  const result = { id, uid: id };
  if (doc.fields) {
    for (const [key, val] of Object.entries(doc.fields)) {
      if ("stringValue" in val) result[key] = val.stringValue;
      else if ("booleanValue" in val) result[key] = val.booleanValue;
      else if ("integerValue" in val) result[key] = parseInt(val.integerValue, 10);
      else if ("doubleValue" in val) result[key] = val.doubleValue;
      else if ("timestampValue" in val) result[key] = val.timestampValue;
      else if ("nullValue" in val) result[key] = null;
      else if ("arrayValue" in val) {
        result[key] = (val.arrayValue.values || []).map(
          (v) => v.stringValue ?? v.integerValue ?? v.booleanValue ?? v
        );
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}
function encodeFirestoreFields(data) {
  const fields = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === void 0) continue;
    if (val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (typeof val === "number") {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((item) => ({ stringValue: String(item) }))
        }
      };
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
async function getFirestoreRestDocs(collectionName, pageSize = 50, useCache = true, cacheTtlMs = 2e4) {
  const safePageSize = Math.min(pageSize, 100);
  const cacheKey = `docs_${collectionName}_${safePageSize}`;
  const now = Date.now();
  if (useCache) {
    const cached = serverRestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log(`[Server Firestore CACHE_HIT: 0 reads] Collection: "${collectionName}" | Cached docs: ${cached.data.length} | TTL: ${Math.round((cached.expiresAt - now) / 1e3)}s`);
      return cached.data;
    }
  }
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
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
    if (useCache) {
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
  if (useCache) {
    const cached = serverRestCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log(`[Server Firestore CACHE_HIT: 0 reads] Doc: "${collectionName}/${docId}" | TTL: ${Math.round((cached.expiresAt - now) / 1e3)}s`);
      return cached.data;
    }
  }
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
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
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
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

// server/routes/authRoutes.ts
var authRouter = Router();
var RESERVED_USERNAMES = /* @__PURE__ */ new Set([
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
  "help"
]);
var USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;
authRouter.all("/check-username", async (req, res) => {
  try {
    const rawUsername = req.body?.username || req.query?.username;
    if (!rawUsername || typeof rawUsername !== "string") {
      return res.status(400).json({
        available: false,
        message: "Vui l\xF2ng nh\u1EADp t\xEAn \u0111\u0103ng nh\u1EADp."
      });
    }
    const username = rawUsername.trim();
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        available: false,
        message: "T\xEAn \u0111\u0103ng nh\u1EADp ph\u1EA3i c\xF3 t\u1EEB 3 \u0111\u1EBFn 30 k\xFD t\u1EF1."
      });
    }
    if (/\s/.test(username)) {
      return res.status(400).json({
        available: false,
        message: "T\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng \u0111\u01B0\u1EE3c ch\u1EE9a kho\u1EA3ng tr\u1EAFng."
      });
    }
    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        available: false,
        message: "T\xEAn \u0111\u0103ng nh\u1EADp ch\u1EC9 \u0111\u01B0\u1EE3c ch\u1EE9a ch\u1EEF c\xE1i, s\u1ED1, d\u1EA5u g\u1EA1ch d\u01B0\u1EDBi (_), g\u1EA1ch ngang (-) v\xE0 d\u1EA5u ch\u1EA5m (.)."
      });
    }
    const usernameNormalized = username.toLowerCase();
    if (RESERVED_USERNAMES.has(usernameNormalized)) {
      return res.status(400).json({
        available: false,
        message: "T\xEAn \u0111\u0103ng nh\u1EADp n\xE0y thu\u1ED9c danh m\u1EE5c h\u1EC7 th\u1ED1ng b\u1EA3o l\u01B0u, vui l\xF2ng ch\u1ECDn t\xEAn kh\xE1c."
      });
    }
    if (adminDb) {
      try {
        const usernameDoc = await adminDb.collection("usernames").doc(usernameNormalized).get();
        if (usernameDoc.exists) {
          return res.status(200).json({
            available: false,
            message: "T\xEAn \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng."
          });
        }
        const userQuery = await adminDb.collection("users").where("usernameNormalized", "==", usernameNormalized).limit(1).get();
        if (!userQuery.empty) {
          return res.status(200).json({
            available: false,
            message: "T\xEAn \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng."
          });
        }
      } catch (err) {
        console.warn("[check-username] Error querying Firestore via Admin SDK:", err?.message || err);
      }
    } else {
      const existing = await getFirestoreRestDoc("usernames", usernameNormalized);
      if (existing) {
        return res.status(200).json({
          available: false,
          message: "T\xEAn \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng."
        });
      }
    }
    return res.status(200).json({
      available: true,
      usernameNormalized,
      message: "T\xEAn \u0111\u0103ng nh\u1EADp h\u1EE3p l\u1EC7 v\xE0 c\xF3 th\u1EC3 s\u1EED d\u1EE5ng."
    });
  } catch (err) {
    console.error("[check-username] Unexpected error:", err);
    return res.status(500).json({
      available: false,
      message: "L\u1ED7i h\u1EC7 th\u1ED1ng khi ki\u1EC3m tra t\xEAn \u0111\u0103ng nh\u1EADp."
    });
  }
});
authRouter.post("/claim-username", async (req, res) => {
  try {
    const { username, uid, email, fullName } = req.body || {};
    if (!username || !uid) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Thi\u1EBFu th\xF4ng tin t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c UID ng\u01B0\u1EDDi d\xF9ng."
      });
    }
    const trimmed = String(username).trim();
    const usernameNormalized = trimmed.toLowerCase();
    if (!USERNAME_REGEX.test(trimmed) || RESERVED_USERNAMES.has(usernameNormalized)) {
      return res.status(400).json({
        error: "invalid_username",
        message: "T\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c thu\u1ED9c danh m\u1EE5c c\u1EA5m."
      });
    }
    if (adminDb) {
      const existing = await adminDb.collection("usernames").doc(usernameNormalized).get();
      if (existing.exists && existing.data()?.uid !== uid) {
        return res.status(409).json({
          error: "username_taken",
          message: "T\xEAn \u0111\u0103ng nh\u1EADp n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c t\xE0i kho\u1EA3n kh\xE1c s\u1EED d\u1EE5ng."
        });
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
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
          claimedAt: now
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
          updatedAt: now
        },
        { merge: true }
      );
      await batch.commit();
    } else {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await setFirestoreRestDoc("usernames", usernameNormalized, {
        username: trimmed,
        usernameNormalized,
        uid,
        email: email || "",
        fullName: fullName || "",
        claimedAt: now
      });
      await setFirestoreRestDoc("users", uid, {
        username: trimmed,
        usernameNormalized,
        fullName: fullName || "",
        displayName: fullName || trimmed,
        updatedAt: now
      });
    }
    return res.status(200).json({
      success: true,
      username: trimmed,
      usernameNormalized
    });
  } catch (err) {
    console.error("[claim-username] Error:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "Kh\xF4ng th\u1EC3 l\u01B0u th\xF4ng tin t\xEAn \u0111\u0103ng nh\u1EADp."
    });
  }
});
authRouter.post("/login-with-username", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        error: "missing_credentials",
        message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 t\xEAn \u0111\u0103ng nh\u1EADp v\xE0 m\u1EADt kh\u1EA9u."
      });
    }
    const trimmed = String(username).trim();
    const usernameNormalized = trimmed.toLowerCase();
    let targetEmail = "";
    let targetUid = "";
    if (adminDb) {
      const usernameDoc = await adminDb.collection("usernames").doc(usernameNormalized).get();
      if (usernameDoc.exists) {
        const uData = usernameDoc.data();
        targetEmail = uData?.email || "";
        targetUid = uData?.uid || "";
      } else {
        const userQuery = await adminDb.collection("users").where("usernameNormalized", "==", usernameNormalized).limit(1).get();
        if (!userQuery.empty) {
          const uDoc = userQuery.docs[0];
          targetEmail = uDoc.data()?.email || "";
          targetUid = uDoc.id;
        }
      }
    } else {
      const uData = await getFirestoreRestDoc("usernames", usernameNormalized);
      if (uData) {
        targetEmail = uData.email || "";
        targetUid = uData.uid || "";
      } else {
        const allUsers = await getFirestoreRestDocs("users");
        const found = allUsers.find(
          (u) => u.usernameNormalized === usernameNormalized || u.username?.toLowerCase() === usernameNormalized
        );
        if (found) {
          targetEmail = found.email || "";
          targetUid = found.uid || found.id;
        }
      }
    }
    if (!targetEmail || !targetUid) {
      return res.status(401).json({
        error: "invalid_credential",
        message: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c."
      });
    }
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "server_misconfigured",
        message: "Thi\u1EBFu c\u1EA5u h\xECnh Firebase API Key tr\xEAn m\xE1y ch\u1EE7."
      });
    }
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          password: String(password),
          returnSecureToken: true
        })
      }
    );
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.idToken) {
      const code = verifyData?.error?.message || "";
      console.warn(`[login-with-username] Firebase Auth verification failed for user "${usernameNormalized}": ${code}`);
      return res.status(401).json({
        error: "invalid_credential",
        message: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c."
      });
    }
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
      username: trimmed
    });
  } catch (err) {
    console.error("[login-with-username] Unexpected error:", err);
    return res.status(500).json({
      error: "internal_error",
      message: "L\u1ED7i x\u1EED l\xFD x\xE1c th\u1EF1c t\xEAn \u0111\u0103ng nh\u1EADp t\u1EEB m\xE1y ch\u1EE7."
    });
  }
});
export {
  authRouter
};
