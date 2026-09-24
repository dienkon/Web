import { Router, type Response } from "express";
import type { Query } from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb,
  getFirestoreRestDocs,
  getFirestoreRestDoc,
  setFirestoreRestDoc,
  deleteFirestoreRestDoc,
  clearServerRestCache,
} from "../firebaseAdmin.js";
import { requireAdmin, requireSuperAdmin, type AuthenticatedRequest } from "../middleware/auth.js";

export const adminRouter = Router();

// In-memory cache for user list to drastically reduce Firestore reads (60s TTL, invalidated on write)
const userListCache = new Map<string, { data: any[]; timestamp: number }>();
export function invalidateUserListCache() {
  userListCache.clear();
}

// Apply requireAdmin to all admin routes
adminRouter.use(requireAdmin);

/**
 * Helper to record audit log
 */
async function recordAuditLog(
  actor: AuthenticatedRequest["user"],
  action: string,
  targetUid?: string,
  targetType?: string,
  metadata?: Record<string, any>,
  req?: AuthenticatedRequest
) {
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
    timestamp: new Date().toISOString(),
    userAgentSummary: req?.headers["user-agent"]?.slice(0, 150) || "",
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

// -------------------------------------------------------------
// 1. DASHBOARD STATS
// -------------------------------------------------------------
async function computeSystemStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let usersList: any[] = [];
  let totalExams = 0;
  let subList: any[] = [];
  let relList: any[] = [];

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
    } catch (e) {}
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

  const classDistribution: Record<string, number> = {};

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
  const studentTestedSet = new Set<string>();

  subList.forEach((sub) => {
    totalSubmissions++;
    const submittedAt = sub.submittedAt?.toDate
      ? sub.submittedAt.toDate().toISOString()
      : typeof sub.submittedAt === "string"
      ? sub.submittedAt
      : "";

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
      unverifiedAccounts,
    },
    studentStats: {
      totalStudents: studentAccounts,
      newToday: studentsToday,
      new7Days: students7Days,
      new30Days: students30Days,
      testedCount: studentTestedSet.size,
      notTestedCount: Math.max(0, studentAccounts - studentTestedSet.size),
      classDistribution,
    },
    parentStats: {
      totalParents: parentAccounts,
      totalRelationships,
      pendingRelationships,
    },
    examStats: {
      totalExams,
      totalSubmissions,
      submissionsToday,
      submissions7Days,
      submissions30Days,
      averageScore,
      highestScore: validScoreCount > 0 ? highestScore : 0,
      lowestScore: validScoreCount > 0 ? lowestScore : 0,
    },
    recentSubmissions: subList.slice(0, 10).map((s) => ({
      id: s.id || s.attemptId || "",
      examId: s.examId || "",
      examTitleSnapshot: s.examTitleSnapshot || s.examTitle || "",
      studentId: s.studentId || "",
      studentUsername: s.studentUsername || "",
      studentNameSnapshot: s.studentNameSnapshot || s.studentUsername || "Thí sinh",
      score: typeof s.score === "number" ? s.score : 0,
      maxScore: s.maxScore || 10,
      timeSpent: s.timeSpent || 0,
      submittedAt: s.submittedAt?.toDate ? s.submittedAt.toDate().toISOString() : s.submittedAt || "",
    })),
    lastUpdated: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// 1. DASHBOARD STATS (Optimized: Reads single doc system_stats/overview)
// -------------------------------------------------------------
adminRouter.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const force =
      req.query.force === "true" ||
      Boolean(req.query._t) ||
      Boolean(req.headers["cache-control"]?.includes("no-cache"));

    // Step 1: Attempt to read the dedicated pre-aggregated document (1 doc read!)
    if (!force) {
      let overviewDoc: any = null;
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
      const isFresh = Date.now() - lastUpdatedMs < 60000; // Fresh within 60 seconds

      if (overviewDoc && overviewDoc.userStats && overviewDoc.examStats && isFresh) {
        console.log(`[Server Stats] Served from dedicated doc "system_stats/overview" (1 doc read / fresh)`);
        return res.json(overviewDoc);
      }
    }

    // Step 2: If document does not exist yet (or forced), compute once and save
    console.log(`[Server Stats] Aggregated document not found. Building fresh system_stats/overview...`);
    const freshStats = await computeSystemStats();

    // Persist to system_stats/overview so all future reads are 1 single document read
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
  } catch (err: any) {
    console.error("[adminRoutes] /stats error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// Endpoint to rebuild stats on demand
adminRouter.post("/stats/rebuild", async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`[Server Stats] Admin manual rebuild requested...`);
    const freshStats = await computeSystemStats();
    if (adminDb) {
      await adminDb.collection("system_stats").doc("overview").set(freshStats);
    } else {
      await setFirestoreRestDoc("system_stats", "overview", freshStats);
    }
    return res.json({ success: true, message: "Đã tái tổng hợp số liệu và cập nhật system_stats/overview thành công.", data: freshStats });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 2. ANALYTICS CHARTS
// -------------------------------------------------------------
adminRouter.get("/analytics", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || "7d";
    let days = 7;
    if (range === "30d") days = 30;
    if (range === "90d") days = 90;
    if (range === "1y") days = 365;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Prepare date buckets (YYYY-MM-DD)
    const dateBuckets: Record<string, { date: string; label: string; newUsers: number; submissions: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      dateBuckets[key] = { date: key, label, newUsers: 0, submissions: 0 };
    }

    let usersList: any[] = [];
    let subList: any[] = [];

    if (adminDb) {
      const usersSnap = await adminDb.collection("users").limit(100).get();
      usersList = usersSnap.docs.map((doc) => doc.data());
      const subSnap = await adminDb.collection("submissions").limit(100).get();
      subList = subSnap.docs.map((doc) => doc.data());
    } else {
      usersList = await getFirestoreRestDocs("users", 100, true, 30000);
      subList = await getFirestoreRestDocs("submissions", 100, true, 30000);
    }

    // Populate user registrations
    usersList.forEach((data) => {
      if (data.createdAt) {
        const dStr = new Date(data.createdAt).toISOString().slice(0, 10);
        if (dateBuckets[dStr]) {
          dateBuckets[dStr].newUsers++;
        }
      }
    });

    // Populate submissions
    subList.forEach((data) => {
      const submittedAt = data.submittedAt?.toDate
        ? data.submittedAt.toDate().toISOString()
        : typeof data.submittedAt === "string"
        ? data.submittedAt
        : "";
      if (submittedAt) {
        const dStr = submittedAt.slice(0, 10);
        if (dateBuckets[dStr]) {
          dateBuckets[dStr].submissions++;
        }
      }
    });

    const chartData = Object.values(dateBuckets);
    return res.json({ range, chartData });
  } catch (err: any) {
    console.error("[adminRoutes] /analytics error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 3. USER MANAGEMENT (LIST WITH PAGINATION, SEARCH, FILTER, SORT)
// -------------------------------------------------------------
adminRouter.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 5));
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const roleFilter = (req.query.role as string) || "";
    const statusFilter = (req.query.status as string) || "";
    const providerFilter = (req.query.provider as string) || "";
    const verifiedFilter = (req.query.verified as string) || "";
    const classFilter = (req.query.class as string) || "";
    const sortField = (req.query.sort as string) || "createdAt";
    const sortOrder = (req.query.order as string) === "asc" ? "asc" : "desc";

    const isNoCache =
      req.query.force === "true" ||
      Boolean(req.query._t) ||
      Boolean(req.headers["cache-control"]?.includes("no-cache"));

    const cacheKey = `${roleFilter}__${statusFilter}`;
    const cached = userListCache.get(cacheKey);
    let users: any[] = [];

    if (!isNoCache && cached && Date.now() - cached.timestamp < 60000) {
      users = [...cached.data];
    } else {
      if (adminDb) {
        let query: Query = adminDb.collection("users");
        if (roleFilter) {
          query = query.where("role", "==", roleFilter);
        }
        if (statusFilter) {
          query = query.where("accountStatus", "==", statusFilter);
        }
        const snapshot = await query.get();
        users = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
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

    // In-memory filtering for compound / optional criteria
    if (search) {
      users = users.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(search) ||
          u.fullName?.toLowerCase().includes(search) ||
          u.username?.toLowerCase().includes(search) ||
          u.usernameNormalized?.includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.uid?.toLowerCase().includes(search) ||
          u.studentClass?.toLowerCase().includes(search) ||
          u.phone?.toLowerCase().includes(search)
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

    // Sorting
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
        hasMore: page < totalPages,
      },
    });
  } catch (err: any) {
    console.error("[adminRoutes] /users error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 4. USER DETAIL (/users/:uid)
// -------------------------------------------------------------
adminRouter.get("/users/:uid", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const subLimit = Math.min(50, Math.max(1, parseInt(req.query.subLimit as string) || 5));
    const logLimit = Math.min(50, Math.max(1, parseInt(req.query.logLimit as string) || 5));

    let userData: any = null;
    let studentProfile: any = null;
    let parentProfile: any = null;
    let relationships: any[] = [];
    let submissions: any[] = [];
    let auditLogs: any[] = [];

    if (adminDb) {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "not_found", message: "Không tìm thấy người dùng." });
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

      const subSnap = await adminDb
        .collection("submissions")
        .where("studentId", "==", uid)
        .orderBy("submittedAt", "desc")
        .limit(subLimit)
        .get()
        .catch(async () => {
          return await adminDb!.collection("submissions").where("studentId", "==", uid).limit(subLimit).get();
        });
      subSnap.forEach((d) => submissions.push({ id: d.id, ...d.data() }));

      const logSnap = await adminDb.collection("auditLogs").where("targetUid", "==", uid).limit(logLimit).get();
      logSnap.forEach((d) => auditLogs.push({ id: d.id, ...d.data() }));
    } else {
      userData = await getFirestoreRestDoc("users", uid);
      if (!userData) {
        return res.status(404).json({ error: "not_found", message: "Không tìm thấy người dùng." });
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
      auditLogs,
    });
  } catch (err: any) {
    console.error("[adminRoutes] /users/:uid error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 5. UPDATE USER PROFILE & STATUS
// -------------------------------------------------------------
adminRouter.patch("/users/:uid", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const updates = req.body || {};

    // Prevent modifying protected credentials
    delete updates.password;
    delete updates.passwordHash;
    delete updates.token;

    // Only super_admin can grant admin / super_admin role
    if (updates.role && (updates.role === "admin" || updates.role === "super_admin")) {
      if (req.user?.role !== "super_admin") {
        return res.status(403).json({
          error: "permission_denied",
          message: "Chỉ Super Admin mới có quyền cấp quyền Quản trị viên.",
        });
      }
    }

    updates.updatedAt = new Date().toISOString();

    if (adminDb) {
      const userRef = adminDb.collection("users").doc(uid);
      await userRef.set(updates, { merge: true });
    } else {
      await setFirestoreRestDoc("users", uid, updates);
    }

    // Update Custom Claims if role changed and adminAuth is ready
    if (updates.role && adminAuth) {
      try {
        await adminAuth.setCustomUserClaims(uid, { role: updates.role, accountStatus: updates.accountStatus || "active" });
      } catch (claimErr) {
        console.warn("[adminRoutes] Failed to update custom claims:", claimErr);
      }
    }

    invalidateUserListCache();
    await recordAuditLog(req.user, "PROFILE_UPDATED", uid, "user", updates, req);
    return res.json({ success: true, message: "Đã cập nhật thông tin người dùng thành công." });
  } catch (err: any) {
    console.error("[adminRoutes] PATCH /users/:uid error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 6. APPROVE / SUSPEND / REACTIVATE / DISABLE / DELETE USER
// -------------------------------------------------------------
adminRouter.post("/users/:uid/approve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const updateData = {
      accountStatus: "active",
      updatedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: req.user?.uid || "admin",
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
      } catch (e) {}
    }

    invalidateUserListCache();
    await recordAuditLog(req.user, "USER_APPROVED", uid, "user", { approvedBy: req.user?.uid }, req);
    return res.json({ success: true, message: "Đã phê duyệt tài khoản thành công." });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

adminRouter.post("/users/:uid/suspend", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body || {};
    const updateData = {
      accountStatus: "suspended",
      suspendedReason: reason || "Tạm khoá bởi Quản trị viên",
      updatedAt: new Date().toISOString(),
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
      } catch (e) {}
    }

    invalidateUserListCache();
    await recordAuditLog(req.user, "USER_SUSPENDED", uid, "user", { reason }, req);
    return res.json({ success: true, message: "Đã tạm khoá tài khoản thành công." });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

adminRouter.post("/users/:uid/reactivate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const updateData = {
      accountStatus: "active",
      updatedAt: new Date().toISOString(),
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
      } catch (e) {}
    }

    invalidateUserListCache();
    await recordAuditLog(req.user, "USER_REACTIVATED", uid, "user", {}, req);
    return res.json({ success: true, message: "Đã kích hoạt lại tài khoản thành công." });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// HELPER: HARD DELETE USER & ALL RELATED DATA
// -------------------------------------------------------------
async function hardDeleteUser(uid: string): Promise<{ success: boolean; reason?: string; username?: string; role?: string }> {
  try {
    let userData: any = null;
    if (adminDb) {
      const docSnap = await adminDb.collection("users").doc(uid).get();
      if (docSnap.exists) userData = docSnap.data();
    } else {
      userData = await getFirestoreRestDoc("users", uid, false);
    }

    const role = userData?.role || "";
    if (role === "super_admin") {
      return { success: false, reason: "Không thể xoá tài khoản Super Admin." };
    }

    const username = (userData?.username || userData?.usernameNormalized || "").toLowerCase();

    // 1. Delete from users collection
    if (adminDb) {
      await adminDb.collection("users").doc(uid).delete().catch(() => {});
    } else {
      await deleteFirestoreRestDoc("users", uid);
    }

    // 2. Delete from usernames registry
    if (username) {
      if (adminDb) {
        await adminDb.collection("usernames").doc(username).delete().catch(() => {});
      } else {
        await deleteFirestoreRestDoc("usernames", username);
      }
    }

    // 3. Delete from students collection (both by username and uid)
    if (adminDb) {
      if (username) await adminDb.collection("students").doc(username).delete().catch(() => {});
      await adminDb.collection("students").doc(uid).delete().catch(() => {});
    } else {
      if (username) await deleteFirestoreRestDoc("students", username);
      await deleteFirestoreRestDoc("students", uid);
    }

    // 4. Delete from parents collection (both by username and uid)
    if (adminDb) {
      if (username) await adminDb.collection("parents").doc(username).delete().catch(() => {});
      await adminDb.collection("parents").doc(uid).delete().catch(() => {});
    } else {
      if (username) await deleteFirestoreRestDoc("parents", username);
      await deleteFirestoreRestDoc("parents", uid);
    }

    // 5. Delete relationships
    if (adminDb) {
      try {
        const rels1 = await adminDb.collection("relationships").where("studentUid", "==", uid).get();
        for (const d of rels1.docs) await d.ref.delete().catch(() => {});
        const rels2 = await adminDb.collection("relationships").where("parentUid", "==", uid).get();
        for (const d of rels2.docs) await d.ref.delete().catch(() => {});
      } catch (e) {}
    } else {
      try {
        const allRels = await getFirestoreRestDocs("relationships", 100, false);
        for (const rel of allRels) {
          if (
            rel.studentUid === uid ||
            rel.parentUid === uid ||
            (username && (rel.studentUsername === username || rel.parentUsername === username))
          ) {
            await deleteFirestoreRestDoc("relationships", rel.id);
          }
        }
      } catch (e) {}
    }

    // 6. Delete parent_link_requests
    if (adminDb) {
      try {
        if (username) {
          const reqs1 = await adminDb.collection("parent_link_requests").where("studentUsername", "==", username).get();
          for (const d of reqs1.docs) await d.ref.delete().catch(() => {});
          const reqs2 = await adminDb.collection("parent_link_requests").where("parentUsername", "==", username).get();
          for (const d of reqs2.docs) await d.ref.delete().catch(() => {});
        }
      } catch (e) {}
    } else {
      try {
        const allReqs = await getFirestoreRestDocs("parent_link_requests", 100, false);
        for (const r of allReqs) {
          if (
            r.studentUid === uid ||
            r.parentUid === uid ||
            (username && (r.studentUsername === username || r.parentUsername === username))
          ) {
            await deleteFirestoreRestDoc("parent_link_requests", r.id);
          }
        }
      } catch (e) {}
    }

    // 7. Delete submissions associated with this student
    if (adminDb) {
      try {
        const subs1 = await adminDb.collection("submissions").where("studentId", "==", uid).get();
        for (const d of subs1.docs) await d.ref.delete().catch(() => {});
        const subs2 = await adminDb.collection("submissions").where("studentUid", "==", uid).get();
        for (const d of subs2.docs) await d.ref.delete().catch(() => {});
        if (username) {
          const subs3 = await adminDb.collection("submissions").where("studentId", "==", username).get();
          for (const d of subs3.docs) await d.ref.delete().catch(() => {});
        }
      } catch (e) {}
    } else {
      try {
        const allSubs = await getFirestoreRestDocs("submissions", 100, false);
        for (const s of allSubs) {
          if (s.studentId === uid || s.studentUid === uid || (username && s.studentId === username)) {
            await deleteFirestoreRestDoc("submissions", s.id);
          }
        }
      } catch (e) {}
    }

    // 8. Delete from Firebase Auth if adminAuth is configured
    if (adminAuth) {
      try {
        await adminAuth.deleteUser(uid);
      } catch (authErr) {
        console.warn(`[hardDeleteUser] Could not delete Firebase Auth user ${uid}:`, authErr);
      }
    }

    return { success: true, username, role };
  } catch (err: any) {
    console.error(`[hardDeleteUser] Error deleting user ${uid}:`, err);
    return { success: false, reason: err.message };
  }
}

adminRouter.delete("/users/:uid", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const result = await hardDeleteUser(uid);
    if (!result.success) {
      return res.status(403).json({ error: "forbidden", message: result.reason || "Không thể xoá tài khoản." });
    }

    invalidateUserListCache();
    clearServerRestCache();
    await recordAuditLog(req.user, "USER_DELETED", uid, "user", { username: result.username, hardDelete: true }, req);
    return res.json({ success: true, message: "Đã xoá vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan thành công." });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 7. BULK OPERATIONS
// -------------------------------------------------------------
adminRouter.post("/users/bulk", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, uids, payload } = req.body || {};

    if (!Array.isArray(uids) || uids.length === 0) {
      return res.status(400).json({ error: "invalid_input", message: "Danh sách UIDs không hợp lệ." });
    }

    let affectedCount = 0;
    const now = new Date().toISOString();

    if (action === "delete") {
      for (const uid of uids) {
        const delRes = await hardDeleteUser(uid);
        if (delRes.success) {
          affectedCount++;
        }
      }
      invalidateUserListCache();
      clearServerRestCache();
      await recordAuditLog(req.user, "BULK_DELETE", undefined, "system", { count: affectedCount, uids }, req);
      return res.json({
        success: true,
        message: `Đã xoá vĩnh viễn ${affectedCount} tài khoản và các dữ liệu liên quan.`,
        affectedCount,
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
        const patch: Record<string, any> = { updatedAt: now };
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
    await recordAuditLog(req.user, "BULK_OPERATION", undefined, "system", { action, count: affectedCount, uids }, req);

    return res.json({
      success: true,
      message: `Đã áp dụng thao tác "${action}" thành công cho ${affectedCount} tài khoản.`,
      affectedCount,
    });
  } catch (err: any) {
    console.error("[adminRoutes] /users/bulk error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 8. DATA HEALTH & RECONCILIATION
// -------------------------------------------------------------
adminRouter.get("/data-health", async (req: AuthenticatedRequest, res: Response) => {
  try {
    let healthDocData: any = null;
    if (adminDb) {
      const healthDoc = await adminDb.collection("system").doc("data_health_report").get();
      if (healthDoc.exists) healthDocData = healthDoc.data();
    } else {
      healthDocData = await getFirestoreRestDoc("system", "data_health_report");
    }

    if (healthDocData) {
      return res.json(healthDocData);
    }

    // Default response if never scanned
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
      issues: [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

adminRouter.post("/data-health/scan", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const issues: any[] = [];
    let totalAuthUsers = 0;
    const authUsersMap = new Map<string, any>();

    // 1. Fetch Auth users if Admin SDK is connected
    if (adminAuth) {
      try {
        let nextPageToken: string | undefined;
        do {
          const listResult = await adminAuth.listUsers(1000, nextPageToken);
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

    // 2. Fetch Firestore profiles
    let profilesList: any[] = [];
    if (adminDb) {
      const profilesSnap = await adminDb.collection("users").get();
      profilesList = profilesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      profilesList = await getFirestoreRestDocs("users");
    }

    const totalProfiles = profilesList.length;
    const profileMap = new Map<string, any>();
    const emailToUidMap = new Map<string, string[]>();

    profilesList.forEach((data) => {
      const uid = data.id || data.uid;
      profileMap.set(uid, data);

      if (data.email) {
        const cleanEmail = data.email.toLowerCase().trim();
        const existing = emailToUidMap.get(cleanEmail) || [];
        existing.push(uid);
        emailToUidMap.set(cleanEmail, existing);
      }

      // Check missing role
      if (!data.role) {
        issues.push({
          id: `missing_role_${uid}`,
          type: "MISSING_ROLE",
          severity: "warning",
          description: `Tài khoản ${data.displayName || uid} chưa có role.`,
          uid,
          email: data.email,
          displayName: data.displayName,
          source: "firestore",
          safeToAutoRepair: true,
          suggestedAction: "Gán role mặc định 'student'",
        });
      }

      // Check missing createdAt
      if (!data.createdAt) {
        issues.push({
          id: `missing_created_at_${uid}`,
          type: "INVALID_METADATA",
          severity: "info",
          description: `Profile ${uid} thiếu timestamp createdAt.`,
          uid,
          source: "firestore",
          safeToAutoRepair: true,
          suggestedAction: "Bổ sung thời gian tạo hiện tại",
        });
      }
    });

    // Check duplicate emails in Firestore
    for (const [email, uids] of emailToUidMap.entries()) {
      if (uids.length > 1) {
        issues.push({
          id: `duplicate_email_${email}`,
          type: "DATA_CONFLICT",
          severity: "error",
          description: `Email "${email}" bị trùng lặp trên ${uids.length} tài khoản (${uids.join(", ")}).`,
          email,
          source: "firestore",
          safeToAutoRepair: false,
          suggestedAction: "Kiểm tra thủ công và hợp nhất/xoá tài khoản trùng",
          details: { uids },
        });
      }
    }

    // Match Auth vs Firestore if Auth users were loaded
    let validUsersCount = 0;
    let authWithoutProfileCount = 0;
    let orphanProfileCount = 0;

    if (authUsersMap.size > 0) {
      // Check Auth users without profiles
      for (const [authUid, authUser] of authUsersMap.entries()) {
        if (!profileMap.has(authUid)) {
          authWithoutProfileCount++;
          issues.push({
            id: `auth_no_profile_${authUid}`,
            type: "AUTH_WITHOUT_PROFILE",
            severity: "warning",
            description: `Tài khoản Firebase Auth (${authUser.email || authUid}) chưa có profile trong Firestore.`,
            uid: authUid,
            email: authUser.email,
            displayName: authUser.displayName,
            source: "auth",
            safeToAutoRepair: true,
            suggestedAction: "Tạo profile cơ bản từ Auth data",
          });
        } else {
          validUsersCount++;
        }
      }

      // Check Orphan Firestore profiles (profile exists in Firestore, but no Auth record)
      for (const [profUid, profData] of profileMap.entries()) {
        if (!authUsersMap.has(profUid)) {
          orphanProfileCount++;
          issues.push({
            id: `orphan_profile_${profUid}`,
            type: "ORPHAN_PROFILE",
            severity: "warning",
            description: `Profile Firestore ${profUid} (${profData.displayName || profData.email || ""}) không có tài khoản Firebase Auth tương ứng.`,
            uid: profUid,
            email: profData.email,
            displayName: profData.displayName,
            source: "firestore",
            safeToAutoRepair: false,
            suggestedAction: "Xem xét lưu trữ (archive) hoặc xoá nếu là dữ liệu rác cũ",
          });
        }
      }
    } else {
      validUsersCount = totalProfiles;
    }

    // Check broken relationships
    let brokenRelationshipCount = 0;
    try {
      let relList: any[] = [];
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
            description: `Mối quan hệ liên kết ${rData.id} trỏ tới học sinh (${rData.studentUid}) hoặc phụ huynh (${rData.parentUid}) không tồn tại.`,
            source: "firestore",
            safeToAutoRepair: true,
            suggestedAction: "Đánh dấu trạng thái 'unlinked'",
            details: { relationshipId: rData.id, studentExists, parentExists },
          });
        }
      }
    } catch (e) {}

    const report = {
      scannedAt: new Date().toISOString(),
      totalAuthUsers,
      totalProfiles,
      validUsersCount,
      authWithoutProfileCount,
      orphanProfileCount,
      missingRoleCount: issues.filter((i) => i.type === "MISSING_ROLE").length,
      duplicateEmailCount: issues.filter((i) => i.type === "DATA_CONFLICT").length,
      brokenRelationshipCount,
      issues,
    };

    // Cache report to system collection
    if (adminDb) {
      await adminDb.collection("system").doc("data_health_report").set(report);
    } else {
      await setFirestoreRestDoc("system", "data_health_report", report);
    }
    await recordAuditLog(req.user, "DATA_REPAIRED", undefined, "system", { scannedIssuesCount: issues.length }, req);

    return res.json(report);
  } catch (err: any) {
    console.error("[adminRoutes] /data-health/scan error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

adminRouter.post("/data-health/repair", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { issueIds, dryRun = true } = req.body || {};

    let report: any = null;
    if (adminDb) {
      const healthDoc = await adminDb.collection("system").doc("data_health_report").get();
      if (healthDoc.exists) report = healthDoc.data();
    } else {
      report = await getFirestoreRestDoc("system", "data_health_report");
    }

    if (!report) {
      return res.status(400).json({ error: "no_scan", message: "Vui lòng thực hiện quét đối soát trước khi sửa lỗi." });
    }

    const allIssues = report.issues || [];
    const targetIssues = Array.isArray(issueIds) && issueIds.length > 0
      ? allIssues.filter((i: any) => issueIds.includes(i.id))
      : allIssues.filter((i: any) => i.safeToAutoRepair);

    const plannedRepairs: any[] = [];
    const now = new Date().toISOString();

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
            updatedAt: now,
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
            updatedAt: now,
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
      await recordAuditLog(req.user, "DATA_REPAIRED", undefined, "system", { repairsCount: plannedRepairs.length }, req);
    }

    return res.json({
      dryRun,
      plannedRepairsCount: plannedRepairs.length,
      repairs: plannedRepairs,
      message: dryRun
        ? `[Dry Run] Đã phát hiện ${plannedRepairs.length} tác vụ có thể sửa tự động an toàn.`
        : `Đã áp dụng sửa lỗi thành công cho ${plannedRepairs.length} mục.`,
    });
  } catch (err: any) {
    console.error("[adminRoutes] /data-health/repair error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 9. AUDIT LOGS
// -------------------------------------------------------------
adminRouter.get("/audit-logs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 5));
    const actionFilter = (req.query.action as string) || "";
    const actorFilter = (req.query.actor as string) || "";

    let logs: any[] = [];
    if (adminDb) {
      let q: Query = adminDb.collection("auditLogs");
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
  } catch (err: any) {
    console.error("[adminRoutes] /audit-logs error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

// -------------------------------------------------------------
// 10. SYSTEM HEALTH
// -------------------------------------------------------------
adminRouter.get("/system-health", async (req: AuthenticatedRequest, res: Response) => {
  let dbLatency = 0;
  let dbStatus = "ok";

  if (adminDb) {
    try {
      const pingStart = Date.now();
      await adminDb.collection("system").limit(1).get();
      dbLatency = Date.now() - pingStart;
    } catch (e: any) {
      dbStatus = "error";
    }
  } else {
    try {
      const pingStart = Date.now();
      await getFirestoreRestDocs("system", 1);
      dbLatency = Date.now() - pingStart;
      dbStatus = "ok";
    } catch (e: any) {
      dbStatus = "degraded";
    }
  }

  return res.json({
    status: dbStatus === "ok" ? "healthy" : "degraded",
    environment: process.env.NODE_ENV || "development",
    serverTimestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
      isFirebaseAdminConfigured: !!adminAuth,
      mode: adminDb ? "admin_sdk" : "rest_fallback",
    },
    version: "3.5.0-v3",
  });
});

// -------------------------------------------------------------
// 11. SYSTEM SETTINGS
// -------------------------------------------------------------
adminRouter.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    let settingsData: any = null;
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
      pageSize: 20,
    };
    return res.json(defaultSettings);
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

adminRouter.put("/settings", requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = req.body || {};
    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = req.user?.uid || "super_admin";

    if (adminDb) {
      await adminDb.collection("system").doc("settings").set(settings, { merge: true });
    } else {
      await setFirestoreRestDoc("system", "settings", settings);
    }

    await recordAuditLog(req.user, "ADMIN_LOGIN", undefined, "system", { updatedSettings: true }, req);

    return res.json({ success: true, message: "Đã lưu cài đặt hệ thống thành công." });
  } catch (err: any) {
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});
