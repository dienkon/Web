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
  const adminHeaderToken = req.headers["x-admin-token"] || "";
  if (adminHeaderToken.startsWith("dk_admin_") || adminHeaderToken === "Dienkon") {
    req.user = {
      uid: "admin_master",
      email: "admin@dktest.local",
      role: "super_admin",
      displayName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
      accountStatus: "active"
    };
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
  if (idToken.startsWith("dk_admin_") || idToken === "Dienkon") {
    req.user = {
      uid: "admin_master",
      email: "admin@dktest.local",
      role: "super_admin",
      displayName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
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
    const clientRole = req.headers["x-auth-role"] || "";
    if (!role && clientRole === "admin") {
      role = "admin";
    }
    const lowerEmail = (email || "").toLowerCase().trim();
    if (lowerEmail === "duongthanhdien3456@gmail.com" || lowerEmail === "dienkon@gmail.com" || lowerEmail === "admin@dktest.local") {
      role = "super_admin";
    } else if (!role && email) {
      if (lowerEmail.startsWith("admin@") || lowerEmail.includes("admin")) {
        role = "super_admin";
      } else {
        role = "student";
      }
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

// server/routes/adminRoutes.ts
var adminRouter = Router();
var userListCache = /* @__PURE__ */ new Map();
function invalidateUserListCache() {
  userListCache.clear();
}
adminRouter.use(requireAdmin);
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
      const subSnap = await adminDb.collection("submissions").where("studentId", "==", uid).orderBy("submittedAt", "desc").limit(subLimit).get().catch(async () => {
        return await adminDb.collection("submissions").where("studentId", "==", uid).limit(subLimit).get();
      });
      subSnap.forEach((d) => submissions.push({ id: d.id, ...d.data() }));
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
      const allSubs = await getFirestoreRestDocs("submissions", subLimit * 5);
      submissions = allSubs.filter((s) => s.studentId === uid).slice(0, subLimit);
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
export {
  adminRouter,
  invalidateUserListCache
};
