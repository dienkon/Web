import {
  adminDb,
  getFirestoreRestDoc,
  queryFirestoreRestDocs,
  queryOrderedFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type {
  Course,
  CourseAccessInfo,
  CourseAccessMode,
  CourseEntitlement,
  CourseLesson,
  CoursePurchaseDetailItem,
  CoursePurchasesPageResult,
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
import {
  extractGoogleDriveFileId,
  extractYouTubeVideoId,
} from "../../src/utils/videoSourceHelper.js";

const COURSE_DOC_CACHE_TTL_MS = 60 * 1000;
const COURSE_ACCESS_CACHE_TTL_MS = 30 * 1000;
const COURSE_PURCHASES_CACHE_TTL_MS = 30 * 1000;
const COURSE_BUYER_META_TTL_MS = 10 * 60 * 1000;
export const MAX_COURSE_PURCHASES_PAGE_SIZE = 2;

const courseDocCache = new Map<string, { course: Course; ts: number }>();
const courseLessonCache = new Map<string, { lesson: CourseLesson; ts: number }>();
const courseAccessCache = new Map<string, { access: CourseAccessInfo; ts: number }>();
const coursePurchasesFirstPageCache = new Map<
  string,
  { result: CoursePurchasesPageResult; ts: number }
>();
const courseBuyerMetaCache = new Map<
  string,
  { fullName?: string; currentClass?: string; email?: string; username?: string; ts: number }
>();

export function invalidateCoursePurchasesCache(courseId?: string): void {
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

export function invalidateCourseServerCache(courseId?: string, uid?: string): void {
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
        ...(fullName ? { studentNameSnapshot: fullName } : {}),
        ...(currentClass ? { studentClassSnapshot: currentClass } : {}),
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
    ...(wallet.fullName ? { studentNameSnapshot: wallet.fullName } : {}),
    ...(wallet.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}),
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
      ...(wallet.fullName ? { studentNameSnapshot: wallet.fullName } : {}),
      ...(wallet.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}),
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
      ...(fullName ? { studentNameSnapshot: fullName } : {}),
      ...(currentClass ? { studentClassSnapshot: currentClass } : {}),
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
  let wallet: StudentWallet | null = null;
  try {
    wallet = await getOrCreateWallet(studentUid);
  } catch {}

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
    ...(wallet?.fullName ? { studentNameSnapshot: wallet.fullName } : {}),
    ...(wallet?.currentClass ? { studentClassSnapshot: wallet.currentClass } : {}),
  };

  if (adminDb) {
    await adminDb.collection("course_entitlements").doc(entitlementId).set(entitlement, { merge: true });
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bal = wallet ? sanitizeVnd(wallet.balanceVnd) : 0;
    const txDoc: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "admin_adjustment_credit",
      amountVnd: 0,
      balanceBeforeVnd: bal,
      balanceAfterVnd: bal,
      courseId,
      courseTitleSnapshot: course.title || "Khóa học",
      ...(lesson ? { lessonId: lesson.id, lessonTitleSnapshot: lesson.title } : {}),
      studentNameSnapshot: wallet?.fullName || "",
      studentClassSnapshot: wallet?.currentClass || "",
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

async function resolveBuyerMeta(
  uid: string,
  fallbackName?: string,
  fallbackClass?: string,
  fallbackEmail?: string
): Promise<{ fullName: string; currentClass?: string; email?: string; username?: string }> {
  const now = Date.now();
  const cached = courseBuyerMetaCache.get(uid);
  if (cached && now - cached.ts < COURSE_BUYER_META_TTL_MS) {
    return {
      fullName: cached.fullName || fallbackName || uid,
      currentClass: cached.currentClass || fallbackClass,
      email: cached.email || fallbackEmail,
      username: cached.username,
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
          const w = wSnap.data() as StudentWallet;
          fullName = w.fullName || w.verifiedName || "";
          currentClass = currentClass || w.currentClass || "";
        }
      }
      const uSnap = await adminDb.collection("users").doc(uid).get();
      if (uSnap.exists) {
        const u = uSnap.data() as any;
        fullName = fullName || u.displayName || u.fullName || u.name || "";
        currentClass = currentClass || u.currentClass || u.className || "";
        email = email || u.email || "";
        username = u.username || "";
      }
    } else {
      if (!fullName) {
        const w = await getFirestoreRestDoc("wallets", uid, true, 60000);
        if (w) {
          fullName = w.fullName || w.verifiedName || "";
          currentClass = currentClass || w.currentClass || "";
        }
      }
      const u = await getFirestoreRestDoc("users", uid, true, 60000);
      if (u) {
        fullName = fullName || u.displayName || u.fullName || u.name || "";
        currentClass = currentClass || u.currentClass || u.className || "";
        email = email || u.email || "";
        username = u.username || "";
      }
    }
  } catch {}

  const meta = {
    fullName: fullName || uid,
    currentClass: currentClass || undefined,
    email: email || undefined,
    username: username || undefined,
    ts: now,
  };
  courseBuyerMetaCache.set(uid, meta);
  return meta;
}

/**
 * Paginated course/lesson buyer details strictly capped at max 2 records per load to preserve Firestore read budget.
 */
export async function getAdminCoursePurchases(options?: {
  courseId?: string;
  limit?: number;
  cursor?: string;
  scope?: "all" | "course" | "lesson";
  status?: "all" | "active" | "revoked";
  force?: boolean;
}): Promise<CoursePurchasesPageResult> {
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

  const matchesFilter = (ent: CourseEntitlement): boolean => {
    if (cleanCourseId && ent.courseId !== cleanCourseId) return false;
    const entScope = ent.scope || (ent.lessonId ? "lesson" : "course");
    if (scopeFilter !== "all" && entScope !== scopeFilter) return false;
    if (statusFilter !== "all" && ent.status !== statusFilter) return false;
    return true;
  };

  let rawEntitlements: CourseEntitlement[] = [];
  let nextCursor: string | null = null;
  let hasMore = false;

  if (adminDb) {
    const col = adminDb.collection("course_entitlements");
    const needsPostFilter = scopeFilter !== "all" || statusFilter !== "all";
    try {
      if (!needsPostFilter) {
        let q: FirebaseFirestore.Query = cleanCourseId
          ? col.where("courseId", "==", cleanCourseId)
          : col;
        q = q.orderBy("grantedAt", "desc");
        if (cursor) q = q.startAfter(cursor);
        const snap = await q.limit(pageSize).get();
        console.log(
          `[Server Firestore READ: ${snap.size} docs] course_entitlements purchases (${cleanCourseId || "all"}, limit ${pageSize})`
        );
        rawEntitlements = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CourseEntitlement));
        hasMore = snap.size === pageSize;
        nextCursor =
          snap.docs.length > 0 ? String(snap.docs[snap.docs.length - 1].data().grantedAt || "") : null;
      } else {
        const collected: CourseEntitlement[] = [];
        let scanCursor = cursor;
        let exhausted = false;
        const chunkLimit = 6;
        for (let step = 0; step < 2 && collected.length < pageSize && !exhausted; step++) {
          let q: FirebaseFirestore.Query = cleanCourseId
            ? col.where("courseId", "==", cleanCourseId)
            : col;
          q = q.orderBy("grantedAt", "desc");
          if (scanCursor) q = q.startAfter(scanCursor);
          const snap = await q.limit(chunkLimit).get();
          if (snap.empty) {
            exhausted = true;
            break;
          }
          for (const d of snap.docs) {
            const ent = { id: d.id, ...(d.data() as any) } as CourseEntitlement;
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
    } catch (err: any) {
      // Composite index (courseId ASC, grantedAt DESC) fallback: bounded read <= 25 docs
      console.warn("[courseService] Course purchases index fallback:", err?.message || err);
      const collected: CourseEntitlement[] = [];
      let scanCursor = cursor;
      let exhausted = false;
      const chunkLimit = 10;
      for (let step = 0; step < 2 && collected.length < pageSize && !exhausted; step++) {
        let q: FirebaseFirestore.Query = col.orderBy("grantedAt", "desc");
        if (scanCursor) q = q.startAfter(scanCursor);
        const snap = await q.limit(chunkLimit).get();
        if (snap.empty) {
          exhausted = true;
          break;
        }
        for (const d of snap.docs) {
          const ent = { id: d.id, ...(d.data() as any) } as CourseEntitlement;
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
      whereField: cleanCourseId ? "courseId" : undefined,
      equalValue: cleanCourseId || undefined,
      orderByField: "grantedAt",
      direction: "DESCENDING",
      startAfterValue: cursor || undefined,
      limitCount: scopeFilter === "all" && statusFilter === "all" ? pageSize : pageSize * 3,
    });
    const matched = (docs as CourseEntitlement[]).filter((ent) => {
      if (!matchesFilter(ent)) return false;
      if (cursor && String(ent.grantedAt || "") >= cursor) return false;
      return true;
    });
    rawEntitlements = matched.slice(0, pageSize);
    nextCursor =
      rawEntitlements.length > 0 ? String(rawEntitlements[rawEntitlements.length - 1].grantedAt || "") : null;
    hasMore = usedFallbackScan ? matched.length >= pageSize : docs.length >= pageSize;
  }

  // Enrich course titles, lesson metadata (cached) and buyer details (<= 2 unique UIDs)
  const courseMap = new Map<string, Course | null>();
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

  const items: CoursePurchaseDetailItem[] = await Promise.all(
    rawEntitlements.map(async (ent) => {
      const course = courseMap.get(ent.courseId) || null;
      const outlineItem = ent.lessonId
        ? course?.lessonOutline?.find((item) => item.id === ent.lessonId)
        : undefined;
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
        lessonTitle: entScope === "lesson" ? outlineItem?.title || ent.lessonTitleSnapshot || ent.lessonId || "Bài giảng" : undefined,
        lessonOrder: outlineItem ? outlineItem.order : undefined,
        status: ent.status || "active",
        source: ent.source || "purchase",
        pricePaidVnd: Math.max(0, Number(ent.pricePaidVnd) || 0),
        transactionId: ent.transactionId,
        grantedAt: String(ent.grantedAt || ""),
        grantedBy: ent.grantedBy,
      };
    })
  );

  const result: CoursePurchasesPageResult = {
    items,
    nextCursor: hasMore ? nextCursor : null,
    hasMore: Boolean(hasMore && nextCursor),
    pageLimit: pageSize,
  };

  if (!cursor) {
    coursePurchasesFirstPageCache.set(cacheKey, { result, ts: Date.now() });
  }
  return result;
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
 * Walks top-level ISO BMFF MP4 boxes from offset 0 to locate `moov` byte offset when stored inside or right after `mdat`.
 */
export function findMp4MoovOffset(buf: Buffer): number | null {
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

/**
 * Pure binary parser for Matroska / WebM EBML Segment Info `TimecodeScale` (0x2AD7B1) + `Duration` (0x4489).
 */
export function extractMatroskaDurationSeconds(buf: Buffer): number | null {
  if (!buf || buf.length < 32) return null;
  // EBML header magic 0x1A 0x45 0xDF 0xA3
  if (buf[0] !== 0x1a || buf[1] !== 0x45 || buf[2] !== 0xdf || buf[3] !== 0xa3) {
    return null;
  }

  let timecodeScaleNs = 1_000_000; // Matroska default 1ms per tick
  const scaleIdx = buf.indexOf(Buffer.from([0x2a, 0xd7, 0xb1]));
  if (scaleIdx >= 0 && scaleIdx + 4 < buf.length) {
    const vint = buf[scaleIdx + 3];
    const len = vint & 0x7f;
    if ((vint & 0x80) !== 0 && len >= 1 && len <= 8 && scaleIdx + 4 + len <= buf.length) {
      let val = 0;
      for (let i = 0; i < len; i++) {
        val = val * 256 + buf[scaleIdx + 4 + i];
      }
      if (val > 0) timecodeScaleNs = val;
    }
  }

  let searchFrom = 0;
  while (searchFrom < buf.length - 8) {
    const durIdx = buf.indexOf(Buffer.from([0x44, 0x89]), searchFrom);
    if (durIdx < 0 || durIdx + 3 >= buf.length) break;
    const sizeByte = buf[durIdx + 2];
    const len = sizeByte & 0x7f;
    if ((sizeByte & 0x80) !== 0 && (len === 4 || len === 8) && durIdx + 3 + len <= buf.length) {
      const rawDur =
        len === 4 ? buf.readFloatBE(durIdx + 3) : buf.readDoubleBE(durIdx + 3);
      if (Number.isFinite(rawDur) && rawDur > 0) {
        const seconds = Math.round((rawDur * timecodeScaleNs) / 1_000_000_000);
        if (seconds > 0 && seconds < 86400 * 7) return seconds;
      }
    }
    searchFrom = durIdx + 2;
  }
  return null;
}

const DEFAULT_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function isAllowedDriveHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "drive.google.com" ||
    lower === "docs.google.com" ||
    lower === "drive.usercontent.google.com" ||
    lower.endsWith(".googleusercontent.com")
  );
}

async function readResponseChunkBounded(res: Response, maxBytes = 262144): Promise<Buffer> {
  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
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
          await reader.cancel().catch(() => {});
          break;
        }
      }
    } catch {}
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  const arr = Buffer.from(await res.arrayBuffer());
  return arr.length > maxBytes ? arr.subarray(0, maxBytes) : arr;
}

async function fetchWithSsrfCheckedRedirects(
  targetUrl: string,
  init: RequestInit,
  options?: { restrictToDriveHosts?: boolean }
): Promise<{ res: Response; finalUrl: string }> {
  let currentUrl = targetUrl;
  for (let hop = 0; hop < 4; hop++) {
    const validated = await validateUrlForSsrf(currentUrl);
    if (options?.restrictToDriveHosts && !isAllowedDriveHost(validated.url.hostname)) {
      throw new Error("Redirect outside allowed Google Drive domains.");
    }
    const res = await fetch(currentUrl, {
      ...init,
      redirect: "manual",
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

function unescapeGoogleHtmlPayload(raw: string): string {
  return String(raw || "")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003d/gi, "=")
    .replace(/\\u0022/gi, '"')
    .replace(/\\x26/gi, "&")
    .replace(/\\x3d/gi, "=")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

function extractDriveTitleFromHtml(rawHtml: string): string | undefined {
  const html = unescapeGoogleHtmlPayload(rawHtml);
  const ogTitle = html.match(/<meta\s+(?:property="og:title"|name="title")\s+content="([^"]*)"/i)?.[1];
  const tagTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*-\s*Google Drive\s*$/i, "").trim();
  return (ogTitle || tagTitle || "").trim() || undefined;
}

function extractDriveDurationFromHtml(
  rawHtml: string
): { durationSeconds: number; title?: string } | null {
  const html = unescapeGoogleHtmlPayload(rawHtml);
  const title = extractDriveTitleFromHtml(rawHtml);

  const msPatterns = [
    /["']?(?:durationMs|duration_ms|durationMillis|approxDurationMs)["']?\s*[:=]\s*["']?(\d{4,10})["']?/i,
    /\["(?:durationMs|duration_ms|durationMillis|approxDurationMs)"\s*,\s*["']?(\d{4,10})["']?\]/i,
  ];
  for (const re of msPatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const sec = Math.round(Number(m[1]) / 1000);
      if (sec > 0) return { durationSeconds: sec, title };
    }
  }

  const secPatterns = [
    /["']?length_seconds["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)["']?/i,
    /\["length_seconds"\s*,\s*["']?(\d+(?:\.\d+)?)["']?\]/i,
    /(?:[?&]|%26|%3F)length_seconds(?:=|%3D)(\d+(?:\.\d+)?)/i,
    /[?&]dur=(\d+(?:\.\d+)?)/i,
    /%3F[^"'\s]*dur%3D(\d+(?:\.\d+)?)/i,
    /%26dur%3D(\d+(?:\.\d+)?)/i,
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

function extractDriveConfirmationDownloadUrl(html: string, baseUrl: string): string | null {
  const formMatch = html.match(/<form[^>]*id=["']download-form["'][^>]*action=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/i)
    || html.match(/<form[^>]*action=["'](https:\/\/drive\.usercontent\.google\.com\/download[^"']*)["'][^>]*>([\s\S]*?)<\/form>/i);
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

async function probeRemoteMediaRange(
  mediaUrl: string,
  options?: { restrictToDriveHosts?: boolean; headers?: Record<string, string> }
): Promise<{ durationSeconds: number; source: string } | null> {
  const baseHeaders: Record<string, string> = {
    "User-Agent": DEFAULT_BROWSER_UA,
    Range: "bytes=0-131071",
    ...(options?.headers || {}),
  };

  let { res: headRes, finalUrl } = await fetchWithSsrfCheckedRedirects(
    mediaUrl,
    { headers: baseHeaders, signal: AbortSignal.timeout(12000) },
    { restrictToDriveHosts: options?.restrictToDriveHosts }
  );
  if (!headRes.ok) return null;

  const contentType = String(headRes.headers?.get?.("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    const html = (await readResponseChunkBounded(headRes, 131072)).toString("utf8");
    const confirmUrl = extractDriveConfirmationDownloadUrl(html, finalUrl);
    if (!confirmUrl) return null;
    const confirmed = await fetchWithSsrfCheckedRedirects(
      confirmUrl,
      { headers: baseHeaders, signal: AbortSignal.timeout(12000) },
      { restrictToDriveHosts: true }
    );
    headRes = confirmed.res;
    finalUrl = confirmed.finalUrl;
    if (!headRes.ok) return null;
    const confirmedType = String(headRes.headers?.get?.("content-type") || "").toLowerCase();
    if (confirmedType.includes("text/html")) return null;
  }

  const headBuf = await readResponseChunkBounded(headRes, 262144);
  const headSec = extractMp4DurationSeconds(headBuf) ?? extractMatroskaDurationSeconds(headBuf);
  if (headSec) {
    return { durationSeconds: headSec, source: "mp4_head" };
  }

  const cr = headRes.headers?.get?.("content-range");
  const totalMatch = cr?.match(/\/(\d+)$/);
  const totalBytes = totalMatch ? Number(totalMatch[1]) : 0;

  // Check if MP4 has a top-level `moov` box after `mdat` and jump directly to it
  const moovOffset = findMp4MoovOffset(headBuf);
  if (moovOffset && moovOffset >= headBuf.length && (!totalBytes || moovOffset < totalBytes)) {
    const endByte = totalBytes ? Math.min(totalBytes - 1, moovOffset + 131071) : moovOffset + 131071;
    const { res: moovRes } = await fetchWithSsrfCheckedRedirects(
      finalUrl,
      {
        headers: { "User-Agent": DEFAULT_BROWSER_UA, Range: `bytes=${moovOffset}-${endByte}` },
        signal: AbortSignal.timeout(10000),
      },
      { restrictToDriveHosts: options?.restrictToDriveHosts }
    );
    if (moovRes.ok) {
      const moovBuf = await readResponseChunkBounded(moovRes, 262144);
      const moovSec = extractMp4DurationSeconds(moovBuf);
      if (moovSec) {
        return { durationSeconds: moovSec, source: "mp4_moov" };
      }
    }
  }

  // Tail fallback for non-faststart MP4 when totalBytes is known
  if (totalBytes > 262144) {
    const start = Math.max(0, totalBytes - 262144);
    const { res: tailRes } = await fetchWithSsrfCheckedRedirects(
      finalUrl,
      {
        headers: { "User-Agent": DEFAULT_BROWSER_UA, Range: `bytes=${start}-${totalBytes - 1}` },
        signal: AbortSignal.timeout(10000),
      },
      { restrictToDriveHosts: options?.restrictToDriveHosts }
    );
    if (tailRes.ok) {
      const tailArr = await readResponseChunkBounded(tailRes, 262144);
      const tailSec = extractMp4DurationSeconds(tailArr);
      if (tailSec) {
        return { durationSeconds: tailSec, source: "mp4_tail" };
      }
    }
  }

  return null;
}

/**
 * SSRF-guarded video duration prober supporting YouTube, Google Drive (metadata + direct Range MP4/MKV), and direct MP4/Cloudinary URLs.
 */
export async function probeVideoDuration(
  rawUrl: string
): Promise<{ durationSeconds: number; durationMinutes: number; title?: string; source: string } | null> {
  const cleanUrl = String(rawUrl || "").trim();
  if (!cleanUrl) return null;
  await validateUrlForSsrf(cleanUrl);

  const ytId = extractYouTubeVideoId(cleanUrl);
  if (ytId) {
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(ytId)}&hl=en`, {
        headers: {
          "User-Agent": DEFAULT_BROWSER_UA,
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

  const driveId = extractGoogleDriveFileId(cleanUrl);
  if (driveId) {
    let discoveredTitle: string | undefined;

    // 1. Optional Google Drive v3 API if GOOGLE_DRIVE_API_KEY is configured
    const driveApiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (driveApiKey) {
      try {
        const apiRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveId)}?fields=name,videoMediaMetadata(durationMillis)&key=${encodeURIComponent(driveApiKey)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (apiRes.ok) {
          const json: any = await apiRes.json();
          if (json?.name) discoveredTitle = String(json.name);
          const ms = Number(json?.videoMediaMetadata?.durationMillis || 0);
          if (ms > 0) {
            const sec = Math.round(ms / 1000);
            return {
              durationSeconds: sec,
              durationMinutes: Math.max(1, Math.round(sec / 60)),
              title: discoveredTitle,
              source: "drive_api",
            };
          }
        }
      } catch {}
    }

    // 2. Drive get_video_info endpoint (length_seconds or embedded fmt_stream_map dur=)
    try {
      const infoRes = await fetch(
        `https://drive.google.com/get_video_info?docid=${encodeURIComponent(driveId)}`,
        {
          headers: { "User-Agent": DEFAULT_BROWSER_UA },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (infoRes.ok) {
        const body = await infoRes.text();
        const params = new URLSearchParams(body);
        const title = params.get("title") || undefined;
        if (title) discoveredTitle = discoveredTitle || title;
        const lenSec = Number(params.get("length_seconds") || 0);
        if (lenSec > 0) {
          const sec = Math.round(lenSec);
          return {
            durationSeconds: sec,
            durationMinutes: Math.max(1, Math.round(sec / 60)),
            title: discoveredTitle,
            source: "drive_info",
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
              source: "drive_info_stream",
            };
          }
        }
      }
    } catch {}

    // 3. Drive /preview and /view HTML metadata parser (handles escaped JSON & URL-encoded duration tokens)
    for (const suffix of ["preview", "view"]) {
      try {
        const prevRes = await fetch(
          `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/${suffix}`,
          {
            headers: {
              "User-Agent": DEFAULT_BROWSER_UA,
              "Accept-Language": "en-US,en;q=0.9",
            },
            signal: AbortSignal.timeout(10000),
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
              source: `drive_${suffix}`,
            };
          }
          if (!discoveredTitle) {
            discoveredTitle = extractDriveTitleFromHtml(html);
          }
        }
      } catch {}
    }

    // 4. Direct Range MP4 / WebM probe on public Drive download endpoints (reads <= 256KB/chunk)
    const driveDownloadCandidates = [
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`,
      `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(driveId)}`,
    ];
    for (const downloadUrl of driveDownloadCandidates) {
      try {
        const mediaProbe = await probeRemoteMediaRange(downloadUrl, { restrictToDriveHosts: true });
        if (mediaProbe && mediaProbe.durationSeconds > 0) {
          return {
            durationSeconds: mediaProbe.durationSeconds,
            durationMinutes: Math.max(1, Math.round(mediaProbe.durationSeconds / 60)),
            ...(discoveredTitle ? { title: discoveredTitle } : {}),
            source: `drive_${mediaProbe.source}`,
          };
        }
      } catch {}
    }

    return null;
  }

  // Direct MP4 / WebM / Cloudinary HTTP Range header probe (reads <= 256KB max)
  try {
    const mediaProbe = await probeRemoteMediaRange(cleanUrl);
    if (mediaProbe && mediaProbe.durationSeconds > 0) {
      return {
        durationSeconds: mediaProbe.durationSeconds,
        durationMinutes: Math.max(1, Math.round(mediaProbe.durationSeconds / 60)),
        source: mediaProbe.source,
      };
    }
  } catch {}

  return null;
}

const driveStreamUrlCache = new Map<string, { streamUrl: string | null; ts: number }>();
const DRIVE_STREAM_CACHE_TTL_MS = 15 * 60 * 1000;

function looksLikePlayableVideoMagic(buf: Buffer): boolean {
  if (!buf || buf.length < 12) return false;
  // MP4 / ISO BMFF `ftyp`
  if (buf.toString("ascii", 4, 8) === "ftyp") return true;
  // WebM / Matroska EBML header
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true;
  // Ogg `OggS`
  if (buf.toString("ascii", 0, 4) === "OggS") return true;
  return false;
}

/**
 * Resolves a direct streamable Google Drive download URL (including >100MB confirmation tokens)
 * so DkCourseVideoPlayer can play public MP4/WebM Drive files natively with custom controls.
 */
export async function resolveDriveDirectStreamUrl(driveId: string): Promise<string | null> {
  const cleanId = String(driveId || "").trim();
  if (!cleanId || !/^[a-zA-Z0-9_-]{10,120}$/.test(cleanId)) return null;

  const now = Date.now();
  const cached = driveStreamUrlCache.get(cleanId);
  if (cached && now - cached.ts < DRIVE_STREAM_CACHE_TTL_MS) {
    return cached.streamUrl;
  }

  const candidates = [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(cleanId)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(cleanId)}`,
  ];

  const baseHeaders: Record<string, string> = {
    "User-Agent": DEFAULT_BROWSER_UA,
    Range: "bytes=0-1023",
  };

  for (const candidate of candidates) {
    try {
      let { res, finalUrl } = await fetchWithSsrfCheckedRedirects(
        candidate,
        { headers: baseHeaders, signal: AbortSignal.timeout(4000) },
        { restrictToDriveHosts: true }
      );
      if (!res.ok) continue;

      let ct = String(res.headers?.get?.("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        const html = (await readResponseChunkBounded(res, 131072)).toString("utf8");
        const confirmUrl = extractDriveConfirmationDownloadUrl(html, finalUrl);
        if (!confirmUrl) continue;
        const confirmed = await fetchWithSsrfCheckedRedirects(
          confirmUrl,
          { headers: baseHeaders, signal: AbortSignal.timeout(4000) },
          { restrictToDriveHosts: true }
        );
        res = confirmed.res;
        finalUrl = confirmed.finalUrl;
        if (!res.ok) continue;
        ct = String(res.headers?.get?.("content-type") || "").toLowerCase();
        if (ct.includes("text/html")) continue;
      }

      const headBuf = await readResponseChunkBounded(res, 1024);
      const isDirectVideoMime = ct.startsWith("video/");
      const isStreamableBinary =
        (ct.includes("application/octet-stream") || ct.includes("binary/octet-stream")) &&
        looksLikePlayableVideoMagic(headBuf);

      if (isDirectVideoMime || isStreamableBinary) {
        driveStreamUrlCache.set(cleanId, { streamUrl: finalUrl, ts: now });
        return finalUrl;
      }
    } catch {}
  }

  driveStreamUrlCache.set(cleanId, { streamUrl: null, ts: now });
  return null;
}
