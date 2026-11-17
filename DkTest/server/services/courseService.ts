import {
  adminDb,
  getFirestoreRestDoc,
  queryFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type {
  Course,
  CourseAccessInfo,
  CourseAccessMode,
  CourseEntitlement,
  CourseLesson,
  StudentWallet,
  Voucher,
  WalletTransaction,
} from "../../src/types/index.js";
import { validateVoucher, invalidateVouchersCache, invalidateVoucherUsagesCache } from "./voucherService.js";
import {
  getOrCreateWallet,
  invalidateGlobalSpendingCache,
  invalidateStudentDetailsCache,
  invalidateWalletOverviewCache,
  sanitizeVnd,
  updateWalletOverviewAggregates,
} from "./walletService.js";
import { validateUrlForSsrf } from "./webImporter/ssrfGuard.js";

const COURSE_DOC_CACHE_TTL_MS = 60 * 1000;
const COURSE_ACCESS_CACHE_TTL_MS = 30 * 1000;

const courseDocCache = new Map<string, { course: Course; ts: number }>();
const courseLessonCache = new Map<string, { lesson: CourseLesson; ts: number }>();
const courseAccessCache = new Map<string, { access: CourseAccessInfo; ts: number }>();

export function invalidateCourseServerCache(courseId?: string, uid?: string): void {
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

function isAdminRole(role?: string): boolean {
  return role === "admin" || role === "super_admin";
}

function resolveCourseAccessModeServer(course: Course): CourseAccessMode {
  if (course.accessMode === "per_video") return "per_video";
  if (course.accessMode === "paid") return "paid";
  if (course.accessMode === "free") return "free";
  return sanitizeVnd(course.priceVnd) > 0 ? "paid" : "free";
}

function isLessonFreeEffective(course: Course, lesson: { accessType?: string; order?: number }): boolean {
  const mode = resolveCourseAccessModeServer(course);
  if (mode === "free") return true;
  const accessType = lesson.accessType || "inherit_first_n";
  if (accessType === "free") return true;
  if (accessType === "paid") return false;
  const freeCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  return Number(lesson.order ?? 999999) < freeCount;
}

async function fetchCourseDoc(courseId: string, force = false): Promise<Course | null> {
  const now = Date.now();
  if (!force) {
    const cached = courseDocCache.get(courseId);
    if (cached && now - cached.ts < COURSE_DOC_CACHE_TTL_MS) {
      return cached.course;
    }
  }
  let course: Course | null = null;
  if (adminDb) {
    const snap = await adminDb.collection("courses").doc(courseId).get();
    course = snap.exists ? ({ id: snap.id, ...snap.data() } as Course) : null;
  } else {
    const rest = await getFirestoreRestDoc("courses", courseId, false);
    course = rest ? ({ id: courseId, ...rest } as Course) : null;
  }
  if (course) {
    courseDocCache.set(courseId, { course, ts: now });
  }
  return course;
}

async function fetchLessonDoc(courseId: string, lessonId: string, force = false): Promise<CourseLesson | null> {
  const cacheKey = `${courseId}::${lessonId}`;
  const now = Date.now();
  if (!force) {
    const cached = courseLessonCache.get(cacheKey);
    if (cached && now - cached.ts < COURSE_DOC_CACHE_TTL_MS) {
      return cached.lesson;
    }
  }
  let lesson: CourseLesson | null = null;
  if (adminDb) {
    const snap = await adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId).get();
    lesson = snap.exists ? ({ id: snap.id, ...snap.data() } as CourseLesson) : null;
  } else {
    const rest = await getFirestoreRestDoc(`courses/${courseId}/lessons`, lessonId, false);
    lesson = rest ? ({ id: lessonId, ...rest } as CourseLesson) : null;
  }
  if (lesson) {
    courseLessonCache.set(cacheKey, { lesson, ts: now });
  }
  return lesson;
}

export async function checkCourseAccess(
  uid: string,
  courseId: string,
  role?: string,
  force = false
): Promise<CourseAccessInfo> {
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
    throw new Error("Không tìm thấy khóa học.");
  }

  const accessMode = resolveCourseAccessModeServer(course);
  const priceVnd = accessMode === "paid" ? sanitizeVnd(course.priceVnd) : 0;
  const isFreeCourse = accessMode === "free";
  const salesEnabled = course.salesEnabled !== false;
  const unlockFullPolicy = course.unlockFullPolicy || "unlock_all_videos";
  const freePreviewCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  const allowSingleLessonPurchase =
    accessMode === "per_video" ? true : Boolean(course.allowSingleLessonPurchase);

  // Short-circuit 0 entitlement/wallet reads for completely free courses or admins
  if (isAdminRole(role) || isFreeCourse) {
    const quick: CourseAccessInfo = {
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
      courseTitle: course.title || "Khóa học",
    };
    return quick;
  }

  let userBalance = 0;
  let unlockedCourse = false;
  let unlockedLessonIds: string[] = [];

  if (uid) {
    if (adminDb) {
      const entsSnap = await adminDb
        .collection("course_entitlements")
        .where("uid", "==", uid)
        .where("courseId", "==", courseId)
        .get();
      entsSnap.docs.forEach((docSnap) => {
        const ent = docSnap.data() as CourseEntitlement;
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
      (ents as CourseEntitlement[]).forEach((ent) => {
        if (ent.courseId === courseId && ent.status === "active") {
          if (ent.scope === "course" || !ent.lessonId) {
            unlockedCourse = true;
          } else if (ent.lessonId) {
            unlockedLessonIds.push(ent.lessonId);
          }
        }
      });
    }

    // Only read wallet balance if user might purchase course or per-video lessons
    if (salesEnabled && (!unlockedCourse || accessMode === "per_video")) {
      try {
        const wallet = await getOrCreateWallet(uid);
        userBalance = sanitizeVnd(wallet.balanceVnd);
      } catch (_) {}
    }
  }

  const hasCourseAccess = unlockedCourse;
  const missingVnd = accessMode === "paid" && !hasCourseAccess ? Math.max(0, priceVnd - userBalance) : 0;
  const canUnlockCourse =
    accessMode === "paid" && !hasCourseAccess && priceVnd > 0 && salesEnabled && userBalance >= priceVnd;

  const info: CourseAccessInfo = {
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
    courseTitle: course.title || "Khóa học",
  };

  courseAccessCache.set(cacheKey, { access: info, ts: now });
  return info;
}

export async function unlockCourse(
  uid: string,
  courseId: string,
  idempotencyKey?: string,
  voucherCode?: string
): Promise<{
  success: boolean;
  newBalanceVnd: number;
  entitlement: CourseEntitlement;
  alreadyUnlocked?: boolean;
}> {
  if (!uid) throw new Error("Chưa đăng nhập.");
  if (!courseId) throw new Error("Mã khóa học không hợp lệ.");

  const entitlementId = `${uid}_${courseId}`;
  const now = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (adminDb) {
    const result = await adminDb.runTransaction(async (transaction) => {
      const courseRef = adminDb!.collection("courses").doc(courseId);
      const courseSnap = await transaction.get(courseRef);
      if (!courseSnap.exists) throw new Error("Không tìm thấy khóa học.");

      const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
      const mode = resolveCourseAccessModeServer(course);
      const priceVnd = sanitizeVnd(course.priceVnd);

      if (mode === "per_video") {
        throw new Error(
          "Khóa học này áp dụng thu phí theo từng video. Vui lòng chọn mở khóa từng video bài giảng!"
        );
      }

      const entRef = adminDb!.collection("course_entitlements").doc(entitlementId);
      const entSnap = await transaction.get(entRef);
      if (entSnap.exists) {
        const existing = entSnap.data() as CourseEntitlement;
        if (existing.status === "active") {
          const wDoc = await transaction.get(adminDb!.collection("wallets").doc(uid));
          const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
          return {
            success: true,
            newBalanceVnd: bal,
            entitlement: existing,
            alreadyUnlocked: true,
            effectivePrice: 0,
            appliedVoucher: null as Voucher | null,
          };
        }
      }

      if (mode === "free") {
        const freeEnt: CourseEntitlement = {
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
          courseTitleSnapshot: course.title || "Khóa học",
        };
        transaction.set(entRef, freeEnt, { merge: true });
        return {
          success: true,
          newBalanceVnd: 0,
          entitlement: freeEnt,
          alreadyUnlocked: false,
          effectivePrice: 0,
          appliedVoucher: null as Voucher | null,
        };
      }

      if (priceVnd <= 0) {
        throw new Error("Khóa học chưa cấu hình học phí trọn khóa hợp lệ.");
      }

      if (course.salesEnabled === false) {
        throw new Error("Khóa học hiện đang tạm ngừng mở khóa.");
      }

      let discountVnd = 0;
      let appliedVoucher: Voucher | null = null;
      if (voucherCode && String(voucherCode).trim()) {
        const vRes = await validateVoucher({
          code: String(voucherCode).trim(),
          uid,
          context: "course_unlock",
          amountVnd: priceVnd,
          courseId,
        });
        if (!vRes.valid || !vRes.voucher) {
          throw new Error(vRes.message || "Mã voucher không hợp lệ cho khóa học này.");
        }
        discountVnd = vRes.discountVnd || 0;
        appliedVoucher = vRes.voucher;
      }

      const effectivePrice = Math.max(0, priceVnd - discountVnd);

      const walletRef = adminDb!.collection("wallets").doc(uid);
      const walletDoc = await transaction.get(walletRef);
      const walletData = walletDoc.exists ? (walletDoc.data() as StudentWallet) : null;
      const currentBal = walletData ? sanitizeVnd(walletData.balanceVnd) : 0;
      const totalSpent = walletData ? sanitizeVnd(walletData.totalSpentVnd) : 0;
      const totalCredited = walletData ? sanitizeVnd(walletData.totalCreditedVnd) : 0;
      const fullName = walletData?.fullName || "";
      const currentClass = walletData?.currentClass || "";

      if (currentBal < effectivePrice) {
        throw new Error(
          `Số dư không đủ để mở khóa khóa học. Cần ${effectivePrice.toLocaleString("vi-VN")}đ, hiện có ${currentBal.toLocaleString("vi-VN")}đ (thiếu ${(effectivePrice - currentBal).toLocaleString("vi-VN")}đ).`
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
          updatedAt: now,
        },
        { merge: true }
      );

      const entitlement: CourseEntitlement = {
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
        courseTitleSnapshot: course.title || "Khóa học",
      };
      transaction.set(entRef, entitlement);

      const txRef = adminDb!.collection("wallet_transactions").doc(txId);
      const ledgerEntry: WalletTransaction = {
        id: txId,
        uid,
        type: "course_unlock_debit",
        amountVnd: effectivePrice,
        balanceBeforeVnd: currentBal,
        balanceAfterVnd: newBalance,
        courseId,
        courseTitleSnapshot: course.title || "Khóa học",
        studentNameSnapshot: fullName || "Học sinh",
        studentClassSnapshot: currentClass || "",
        idempotencyKey: idempotencyKey || txId,
        actorUid: uid,
        actorName: fullName || "Học sinh",
        note:
          discountVnd > 0
            ? `Mở khóa trọn khóa học "${course.title}": -${effectivePrice.toLocaleString("vi-VN")}đ (giảm ${discountVnd.toLocaleString("vi-VN")}đ nhờ voucher ${appliedVoucher?.code})`
            : `Mở khóa trọn khóa học "${course.title}": -${effectivePrice.toLocaleString("vi-VN")}đ`,
        createdAt: now,
      };
      transaction.set(txRef, ledgerEntry);

      if (appliedVoucher) {
        const vRef = adminDb!.collection("vouchers").doc(appliedVoucher.id);
        const vSnap = await transaction.get(vRef);
        if (vSnap.exists) {
          const vData = vSnap.data() as Voucher;
          transaction.update(vRef, {
            usedCount: (vData.usedCount || 0) + 1,
            updatedAt: now,
          });
        }
        const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        transaction.set(adminDb!.collection("voucher_usages").doc(usageId), {
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
          referenceId: courseId,
        });
      }

      return {
        success: true,
        newBalanceVnd: newBalance,
        entitlement,
        alreadyUnlocked: false,
        effectivePrice,
        appliedVoucher,
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
        deltaUnlockedSpendingVnd: result.effectivePrice,
      }).catch(() => {});
    }

    return {
      success: result.success,
      newBalanceVnd: result.newBalanceVnd,
      entitlement: result.entitlement,
      alreadyUnlocked: result.alreadyUnlocked,
    };
  }

  // REST fallback
  const course = await fetchCourseDoc(courseId, true);
  if (!course) throw new Error("Không tìm thấy khóa học.");
  const mode = resolveCourseAccessModeServer(course);
  if (mode === "per_video") {
    throw new Error("Khóa học này áp dụng thu phí theo từng video. Vui lòng mở khóa từng video bài giảng!");
  }
  const existingEnt = await getFirestoreRestDoc("course_entitlements", entitlementId, false);
  if (existingEnt && existingEnt.status === "active") {
    const w = await getOrCreateWallet(uid);
    return { success: true, newBalanceVnd: w.balanceVnd, entitlement: existingEnt, alreadyUnlocked: true };
  }

  const priceVnd = sanitizeVnd(course.priceVnd);
  if (mode === "paid" && priceVnd <= 0) {
    throw new Error("Khóa học chưa cấu hình học phí trọn khóa hợp lệ.");
  }

  let discountVnd = 0;
  let appliedVoucher: Voucher | null = null;
  if (mode === "paid" && voucherCode && String(voucherCode).trim()) {
    const vRes = await validateVoucher({
      code: String(voucherCode).trim(),
      uid,
      context: "course_unlock",
      amountVnd: priceVnd,
      courseId,
    });
    if (!vRes.valid || !vRes.voucher) {
      throw new Error(vRes.message || "Mã voucher không hợp lệ.");
    }
    discountVnd = vRes.discountVnd || 0;
    appliedVoucher = vRes.voucher;
  }

  const effectivePrice = mode === "paid" ? Math.max(0, priceVnd - discountVnd) : 0;
  const wallet = await getOrCreateWallet(uid);
  if (wallet.balanceVnd < effectivePrice) {
    throw new Error("Số dư không đủ để mở khóa khóa học.");
  }

  const newBalance = wallet.balanceVnd - effectivePrice;
  if (effectivePrice > 0) {
    await setFirestoreRestDoc("wallets", uid, {
      ...wallet,
      balanceVnd: newBalance,
      totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + effectivePrice,
      updatedAt: now,
    });
  }

  const entitlement: CourseEntitlement = {
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
    courseTitleSnapshot: course.title || "Khóa học",
  };
  await setFirestoreRestDoc("course_entitlements", entitlementId, entitlement);

  if (effectivePrice > 0) {
    const ledgerEntry: WalletTransaction = {
      id: txId,
      uid,
      type: "course_unlock_debit",
      amountVnd: effectivePrice,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: newBalance,
      courseId,
      courseTitleSnapshot: course.title || "Khóa học",
      studentNameSnapshot: wallet.fullName || "Học sinh",
      studentClassSnapshot: wallet.currentClass || "",
      actorUid: uid,
      actorName: wallet.fullName || "Học sinh",
      note: `Mở khóa trọn khóa học "${course.title}": -${effectivePrice.toLocaleString("vi-VN")}đ`,
      createdAt: now,
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
      deltaUnlockedSpendingVnd: effectivePrice,
    }).catch(() => {});
  }
  return { success: true, newBalanceVnd: newBalance, entitlement };
}

export async function unlockCourseLesson(
  uid: string,
  courseId: string,
  lessonId: string,
  idempotencyKey?: string,
  voucherCode?: string
): Promise<{
  success: boolean;
  newBalanceVnd: number;
  entitlement: CourseEntitlement;
  alreadyUnlocked?: boolean;
}> {
  if (!uid) throw new Error("Chưa đăng nhập.");
  if (!courseId || !lessonId) throw new Error("Mã khóa học hoặc bài giảng không hợp lệ.");

  const entitlementId = `${uid}_${courseId}__${lessonId}`;
  const courseEntId = `${uid}_${courseId}`;
  const now = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!adminDb) {
    const [course, lesson] = await Promise.all([
      fetchCourseDoc(courseId, true),
      fetchLessonDoc(courseId, lessonId, true),
    ]);
    if (!course || !lesson) throw new Error("Không tìm thấy khóa học hoặc bài giảng.");
    const mode = resolveCourseAccessModeServer(course);
    if (mode !== "per_video" && !course.allowSingleLessonPurchase) {
      throw new Error("Khóa học này không bật mua lẻ từng bài giảng.");
    }
    if (course.salesEnabled === false) {
      throw new Error("Khóa học hiện đang tạm ngừng bán.");
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
        courseId,
      });
      if (!vRes.valid || !vRes.voucher) {
        throw new Error(vRes.message || "Mã voucher không hợp lệ.");
      }
      discountVnd = vRes.discountVnd || 0;
    }

    const effectivePrice = isLessonFreeEffective(course, lesson) ? 0 : Math.max(0, priceVnd - discountVnd);
    const wallet = await getOrCreateWallet(uid);
    if (wallet.balanceVnd < effectivePrice) {
      throw new Error("Số dư không đủ để mở khóa video bài giảng.");
    }

    const newBalance = wallet.balanceVnd - effectivePrice;
    if (effectivePrice > 0) {
      await setFirestoreRestDoc("wallets", uid, {
        ...wallet,
        balanceVnd: newBalance,
        totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + effectivePrice,
        updatedAt: now,
      });
    }

    const entitlement: CourseEntitlement = {
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
        studentNameSnapshot: wallet.fullName || "Học sinh",
        studentClassSnapshot: wallet.currentClass || "",
        actorUid: uid,
        actorName: wallet.fullName || "Học sinh",
        note: `Mở khóa video "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}đ`,
        createdAt: now,
      });
    }

    invalidateCourseServerCache(courseId, uid);
    invalidateWalletOverviewCache();
    invalidateGlobalSpendingCache();
    invalidateStudentDetailsCache(uid);
    return { success: true, newBalanceVnd: newBalance, entitlement };
  }

  const result = await adminDb.runTransaction(async (transaction) => {
    const courseRef = adminDb!.collection("courses").doc(courseId);
    const lessonRef = courseRef.collection("lessons").doc(lessonId);
    const courseEntRef = adminDb!.collection("course_entitlements").doc(courseEntId);
    const lessonEntRef = adminDb!.collection("course_entitlements").doc(entitlementId);

    const [courseSnap, lessonSnap, courseEntSnap, lessonEntSnap] = await Promise.all([
      transaction.get(courseRef),
      transaction.get(lessonRef),
      transaction.get(courseEntRef),
      transaction.get(lessonEntRef),
    ]);

    if (!courseSnap.exists || !lessonSnap.exists) {
      throw new Error("Không tìm thấy khóa học hoặc bài giảng.");
    }

    const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
    const lesson = { id: lessonSnap.id, ...lessonSnap.data() } as CourseLesson;
    const mode = resolveCourseAccessModeServer(course);

    if (lessonEntSnap.exists && (lessonEntSnap.data() as CourseEntitlement).status === "active") {
      const wDoc = await transaction.get(adminDb!.collection("wallets").doc(uid));
      const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
      return {
        success: true,
        newBalanceVnd: bal,
        entitlement: lessonEntSnap.data() as CourseEntitlement,
        alreadyUnlocked: true,
        effectivePrice: 0,
        appliedVoucher: null as Voucher | null,
      };
    }

    if (
      isLessonFreeEffective(course, lesson) ||
      (courseEntSnap.exists &&
        (courseEntSnap.data() as CourseEntitlement).status === "active" &&
        (course.unlockFullPolicy !== "unlock_course_only" || lesson.includedInCourseUnlock !== false))
    ) {
      const wDoc = await transaction.get(adminDb!.collection("wallets").doc(uid));
      const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
      const freeEnt: CourseEntitlement = {
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
        lessonTitleSnapshot: lesson.title,
      };
      return {
        success: true,
        newBalanceVnd: bal,
        entitlement: freeEnt,
        alreadyUnlocked: true,
        effectivePrice: 0,
        appliedVoucher: null as Voucher | null,
      };
    }

    if (mode !== "per_video" && !course.allowSingleLessonPurchase) {
      throw new Error("Khóa học này chỉ hỗ trợ mở khóa trọn khóa.");
    }
    if (course.salesEnabled === false) {
      throw new Error("Khóa học hiện đang tạm ngừng bán.");
    }

    const priceVnd = sanitizeVnd(lesson.priceVnd);
    let discountVnd = 0;
    let appliedVoucher: Voucher | null = null;
    if (voucherCode && String(voucherCode).trim()) {
      const vRes = await validateVoucher({
        code: String(voucherCode).trim(),
        uid,
        context: "course_unlock",
        amountVnd: priceVnd,
        courseId,
      });
      if (!vRes.valid || !vRes.voucher) {
        throw new Error(vRes.message || "Mã voucher không hợp lệ.");
      }
      discountVnd = vRes.discountVnd || 0;
      appliedVoucher = vRes.voucher;
    }

    const effectivePrice = Math.max(0, priceVnd - discountVnd);
    const walletRef = adminDb!.collection("wallets").doc(uid);
    const walletDoc = await transaction.get(walletRef);
    const walletData = walletDoc.exists ? (walletDoc.data() as StudentWallet) : null;
    const currentBal = walletData ? sanitizeVnd(walletData.balanceVnd) : 0;
    const totalSpent = walletData ? sanitizeVnd(walletData.totalSpentVnd) : 0;
    const totalCredited = walletData ? sanitizeVnd(walletData.totalCreditedVnd) : 0;
    const fullName = walletData?.fullName || "";
    const currentClass = walletData?.currentClass || "";

    if (currentBal < effectivePrice) {
      throw new Error(
        `Số dư không đủ để mở khóa bài giảng. Cần ${effectivePrice.toLocaleString("vi-VN")}đ, hiện có ${currentBal.toLocaleString("vi-VN")}đ.`
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
        updatedAt: now,
      },
      { merge: true }
    );

    const entitlement: CourseEntitlement = {
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
      courseTitleSnapshot: course.title || "Khóa học",
      lessonTitleSnapshot: lesson.title || "Bài giảng",
    };
    transaction.set(lessonEntRef, entitlement);

    const txRef = adminDb!.collection("wallet_transactions").doc(txId);
    const ledgerEntry: WalletTransaction = {
      id: txId,
      uid,
      type: "course_lesson_unlock_debit",
      amountVnd: effectivePrice,
      balanceBeforeVnd: currentBal,
      balanceAfterVnd: newBalance,
      courseId,
      courseTitleSnapshot: course.title || "Khóa học",
      lessonId,
      lessonTitleSnapshot: lesson.title || "Bài giảng",
      studentNameSnapshot: fullName || "Học sinh",
      studentClassSnapshot: currentClass || "",
      idempotencyKey: idempotencyKey || txId,
      actorUid: uid,
      actorName: fullName || "Học sinh",
      note:
        discountVnd > 0
          ? `Mở khóa video "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}đ (giảm ${discountVnd.toLocaleString("vi-VN")}đ nhờ voucher ${appliedVoucher?.code})`
          : `Mở khóa video "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}đ`,
      createdAt: now,
    };
    transaction.set(txRef, ledgerEntry);

    if (appliedVoucher) {
      const vRef = adminDb!.collection("vouchers").doc(appliedVoucher.id);
      const vSnap = await transaction.get(vRef);
      if (vSnap.exists) {
        const vData = vSnap.data() as Voucher;
        transaction.update(vRef, {
          usedCount: (vData.usedCount || 0) + 1,
          updatedAt: now,
        });
      }
      const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      transaction.set(adminDb!.collection("voucher_usages").doc(usageId), {
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
        referenceId: `${courseId}__${lessonId}`,
      });
    }

    return {
      success: true,
      newBalanceVnd: newBalance,
      entitlement,
      alreadyUnlocked: false,
      effectivePrice,
      appliedVoucher,
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
      deltaUnlockedSpendingVnd: result.effectivePrice,
    }).catch(() => {});
  }

  return {
    success: result.success,
    newBalanceVnd: result.newBalanceVnd,
    entitlement: result.entitlement,
    alreadyUnlocked: result.alreadyUnlocked,
  };
}

export async function getAuthorizedLessonContent(
  uid: string,
  courseId: string,
  lessonId: string,
  role?: string
): Promise<CourseLesson> {
  const [course, lesson] = await Promise.all([
    fetchCourseDoc(courseId),
    fetchLessonDoc(courseId, lessonId),
  ]);
  if (!course || !lesson) {
    throw new Error("Không tìm thấy bài giảng hoặc khóa học.");
  }

  if (isAdminRole(role) || isLessonFreeEffective(course, lesson)) {
    return lesson;
  }

  const access = await checkCourseAccess(uid, courseId, role);
  const unlockedByCourse =
    access.unlockedCourse &&
    (access.unlockFullPolicy === "unlock_all_videos" || lesson.includedInCourseUnlock !== false);
  const unlockedByLesson = access.unlockedLessonIds.includes(lessonId);

  if (!unlockedByCourse && !unlockedByLesson) {
    throw new Error("Bài giảng trả phí. Vui lòng mở khóa khóa học hoặc bài giảng để xem video.");
  }

  return lesson;
}

export async function grantOrRevokeCourseEntitlement(
  adminUid: string,
  adminName: string,
  studentUid: string,
  courseId: string,
  lessonId: string | null | undefined,
  action: "grant" | "revoke",
  reason: string
): Promise<{ success: boolean; entitlement: CourseEntitlement }> {
  if (!studentUid) throw new Error("Chưa chỉ định học sinh.");
  if (!courseId) throw new Error("Chưa chỉ định khóa học.");
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Vui lòng nhập lý do cấp/thu hồi quyền khóa học.");

  const course = await fetchCourseDoc(courseId, true);
  if (!course) throw new Error("Không tìm thấy khóa học.");
  const lesson = lessonId ? await fetchLessonDoc(courseId, lessonId, true) : null;

  const isLessonScope = Boolean(lessonId);
  const entitlementId = isLessonScope ? `${studentUid}_${courseId}__${lessonId}` : `${studentUid}_${courseId}`;
  const now = new Date().toISOString();

  const entitlement: CourseEntitlement = {
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
    courseTitleSnapshot: course.title || "Khóa học",
    ...(lesson ? { lessonTitleSnapshot: lesson.title } : {}),
  };

  if (adminDb) {
    await adminDb.collection("course_entitlements").doc(entitlementId).set(entitlement, { merge: true });
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const wallet = await getOrCreateWallet(studentUid);
    const txDoc: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "admin_adjustment_credit",
      amountVnd: 0,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      courseId,
      courseTitleSnapshot: course.title || "Khóa học",
      ...(lesson ? { lessonId: lesson.id, lessonTitleSnapshot: lesson.title } : {}),
      studentNameSnapshot: wallet.fullName || "",
      studentClassSnapshot: wallet.currentClass || "",
      actorUid: adminUid,
      actorName: adminName,
      note: `${action === "grant" ? "Cấp quyền" : "Thu hồi quyền"} ${isLessonScope ? `bài giảng "${lesson?.title || lessonId}"` : `khóa học "${course.title}"`}: ${cleanReason}`,
      createdAt: now,
    };
    await adminDb.collection("wallet_transactions").doc(txId).set(txDoc);
  } else {
    await setFirestoreRestDoc("course_entitlements", entitlementId, entitlement);
  }

  invalidateCourseServerCache(courseId, studentUid);
  invalidateStudentDetailsCache(studentUid);
  return { success: true, entitlement };
}

/**
 * Pure binary walker for ISO BMFF MP4 `mvhd` atom inside a partial buffer chunk.
 */
export function extractMp4DurationSeconds(buf: Buffer): number | null {
  if (!buf || buf.length < 32) return null;
  const idx = buf.indexOf("mvhd");
  if (idx < 4 || idx + 28 > buf.length) return null;
  const version = buf.readUInt8(idx + 4);
  if (version === 0) {
    // bytes +4(ver+flags), +4(creation), +4(mod), +4(timescale), +4(duration)
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

/**
 * SSRF-guarded video duration prober supporting YouTube, Google Drive, and direct MP4/Cloudinary URLs.
 */
export async function probeVideoDuration(
  rawUrl: string
): Promise<{ durationSeconds: number; durationMinutes: number; title?: string; source: string } | null> {
  const cleanUrl = String(rawUrl || "").trim();
  if (!cleanUrl) return null;
  await validateUrlForSsrf(cleanUrl);

  const ytMatch = cleanUrl.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/i
  );
  if (ytMatch?.[1]) {
    const ytId = ytMatch[1];
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}&hl=en`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (watchRes.ok) {
        const html = await watchRes.text();
        const msMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
        const secMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]*)"/i);
        let sec = 0;
        if (msMatch?.[1]) sec = Math.round(Number(msMatch[1]) / 1000);
        else if (secMatch?.[1]) sec = Math.round(Number(secMatch[1]));
        if (sec > 0) {
          return {
            durationSeconds: sec,
            durationMinutes: Math.max(1, Math.round(sec / 60)),
            title: titleMatch?.[1],
            source: "youtube",
          };
        }
      }
    } catch {}
    return null;
  }

  const drivePathMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i);
  const driveQueryMatch = cleanUrl.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([A-Za-z0-9_-]+)/i);
  const driveId = drivePathMatch?.[1] || driveQueryMatch?.[1];
  if (driveId) {
    try {
      const infoRes = await fetch(
        `https://drive.google.com/get_video_info?docid=${encodeURIComponent(driveId)}`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (infoRes.ok) {
        const body = await infoRes.text();
        const params = new URLSearchParams(body);
        const lenSec = Number(params.get("length_seconds") || 0);
        const title = params.get("title") || undefined;
        if (lenSec > 0) {
          return {
            durationSeconds: Math.round(lenSec),
            durationMinutes: Math.max(1, Math.round(lenSec / 60)),
            title,
            source: "drive_info",
          };
        }
      }
    } catch {}

    try {
      const prevRes = await fetch(
        `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (prevRes.ok) {
        const html = await prevRes.text();
        const msMatch = html.match(/["']?(?:durationMs|duration_ms)["']?\s*[:=]\s*["']?(\d{4,9})/i);
        const secMatch = html.match(/["']?length_seconds["']?\s*[:=]\s*["']?(\d{1,6})/i);
        const sec = msMatch?.[1]
          ? Math.round(Number(msMatch[1]) / 1000)
          : secMatch?.[1]
          ? Math.round(Number(secMatch[1]))
          : 0;
        if (sec > 0) {
          return {
            durationSeconds: sec,
            durationMinutes: Math.max(1, Math.round(sec / 60)),
            source: "drive_preview",
          };
        }
      }
    } catch {}
    return null;
  }

  // Direct MP4 / Cloudinary HTTP Range header probe (reads <= 256KB max)
  try {
    const headChunk = await fetch(cleanUrl, {
      headers: { Range: "bytes=0-131071" },
      signal: AbortSignal.timeout(10000),
    });
    if (headChunk.ok) {
      const arr = Buffer.from(await headChunk.arrayBuffer());
      const sec = extractMp4DurationSeconds(arr);
      if (sec) {
        return {
          durationSeconds: sec,
          durationMinutes: Math.max(1, Math.round(sec / 60)),
          source: "mp4_head",
        };
      }
      const cr = headChunk.headers.get("content-range");
      const totalMatch = cr?.match(/\/(\d+)$/);
      const totalBytes = totalMatch ? Number(totalMatch[1]) : 0;
      if (totalBytes > 262144) {
        const start = Math.max(0, totalBytes - 131072);
        const tailChunk = await fetch(cleanUrl, {
          headers: { Range: `bytes=${start}-${totalBytes - 1}` },
          signal: AbortSignal.timeout(10000),
        });
        if (tailChunk.ok) {
          const tailArr = Buffer.from(await tailChunk.arrayBuffer());
          const tailSec = extractMp4DurationSeconds(tailArr);
          if (tailSec) {
            return {
              durationSeconds: tailSec,
              durationMinutes: Math.max(1, Math.round(tailSec / 60)),
              source: "mp4_tail",
            };
          }
        }
      }
    }
  } catch {}

  return null;
}
