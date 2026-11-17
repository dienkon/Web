import {
  adminDb,
  getFirestoreRestDoc,
  queryFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type {
  Course,
  CourseAccessInfo,
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

function isAdminRole(role?: string): boolean {
  return role === "admin" || role === "super_admin";
}

function isLessonFreeEffective(course: Course, lesson: { accessType?: string; order?: number }): boolean {
  if (course.accessMode !== "paid" && sanitizeVnd(course.priceVnd) <= 0) return true;
  const accessType = lesson.accessType || "inherit_first_n";
  if (accessType === "free") return true;
  if (accessType === "paid") return false;
  const freeCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  return Number(lesson.order ?? 999999) < freeCount;
}

async function fetchCourseDoc(courseId: string): Promise<Course | null> {
  if (adminDb) {
    const snap = await adminDb.collection("courses").doc(courseId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Course) : null;
  }
  const rest = await getFirestoreRestDoc("courses", courseId, false);
  return rest ? ({ id: courseId, ...rest } as Course) : null;
}

async function fetchLessonDoc(courseId: string, lessonId: string): Promise<CourseLesson | null> {
  if (adminDb) {
    const snap = await adminDb.collection("courses").doc(courseId).collection("lessons").doc(lessonId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as CourseLesson) : null;
  }
  const rest = await getFirestoreRestDoc(`courses/${courseId}/lessons`, lessonId, false);
  return rest ? ({ id: lessonId, ...rest } as CourseLesson) : null;
}

export async function checkCourseAccess(
  uid: string,
  courseId: string,
  role?: string
): Promise<CourseAccessInfo> {
  const course = await fetchCourseDoc(courseId);
  if (!course) {
    throw new Error("Không tìm thấy khóa học.");
  }

  const priceVnd = sanitizeVnd(course.priceVnd);
  const accessMode = course.accessMode === "paid" || priceVnd > 0 ? "paid" : "free";
  const isFreeCourse = accessMode === "free";
  const salesEnabled = course.salesEnabled !== false;
  const unlockFullPolicy = course.unlockFullPolicy || "unlock_all_videos";
  const freePreviewCount = Math.max(0, Math.floor(Number(course.freePreviewCount) || 0));
  const allowSingleLessonPurchase = Boolean(course.allowSingleLessonPurchase);

  let userBalance = 0;
  let unlockedCourse = false;
  let unlockedLessonIds: string[] = [];

  if (uid) {
    try {
      const wallet = await getOrCreateWallet(uid);
      userBalance = sanitizeVnd(wallet.balanceVnd);
    } catch (_) {}

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
  }

  const hasCourseAccess = isAdminRole(role) || isFreeCourse || unlockedCourse;
  const missingVnd = hasCourseAccess ? 0 : Math.max(0, priceVnd - userBalance);
  const canUnlockCourse = !hasCourseAccess && salesEnabled && userBalance >= priceVnd;

  return {
    hasCourseAccess,
    isFreeCourse,
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
      const priceVnd = sanitizeVnd(course.priceVnd);
      const isPaid = course.accessMode === "paid" || priceVnd > 0;

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

      if (!isPaid) {
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
        const wDoc = await transaction.get(adminDb!.collection("wallets").doc(uid));
        const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
        return {
          success: true,
          newBalanceVnd: bal,
          entitlement: freeEnt,
          alreadyUnlocked: false,
          effectivePrice: 0,
          appliedVoucher: null as Voucher | null,
        };
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
  const course = await fetchCourseDoc(courseId);
  if (!course) throw new Error("Không tìm thấy khóa học.");
  const existingEnt = await getFirestoreRestDoc("course_entitlements", entitlementId, false);
  if (existingEnt && existingEnt.status === "active") {
    const w = await getOrCreateWallet(uid);
    return { success: true, newBalanceVnd: w.balanceVnd, entitlement: existingEnt, alreadyUnlocked: true };
  }

  const priceVnd = sanitizeVnd(course.priceVnd);
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

  const effectivePrice = course.accessMode === "paid" || priceVnd > 0 ? Math.max(0, priceVnd - discountVnd) : 0;
  const wallet = await getOrCreateWallet(uid);
  if (wallet.balanceVnd < effectivePrice) {
    throw new Error("Số dư không đủ để mở khóa khóa học.");
  }

  const newBalance = wallet.balanceVnd - effectivePrice;
  await setFirestoreRestDoc("wallets", uid, {
    ...wallet,
    balanceVnd: newBalance,
    totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + effectivePrice,
    updatedAt: now,
  });

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
    const course = await fetchCourseDoc(courseId);
    const lesson = await fetchLessonDoc(courseId, lessonId);
    if (!course || !lesson) throw new Error("Không tìm thấy khóa học hoặc bài giảng.");
    if (!course.allowSingleLessonPurchase) throw new Error("Khóa học này không bật mua lẻ từng bài giảng.");
    const priceVnd = sanitizeVnd(lesson.priceVnd);
    const wallet = await getOrCreateWallet(uid);
    if (wallet.balanceVnd < priceVnd) throw new Error("Số dư không đủ.");
    const newBalance = wallet.balanceVnd - priceVnd;
    await setFirestoreRestDoc("wallets", uid, {
      ...wallet,
      balanceVnd: newBalance,
      totalSpentVnd: sanitizeVnd(wallet.totalSpentVnd) + priceVnd,
      updatedAt: now,
    });
    const entitlement: CourseEntitlement = {
      id: entitlementId,
      uid,
      courseId,
      lessonId,
      scope: "lesson",
      status: "active",
      source: "purchase",
      pricePaidVnd: priceVnd,
      transactionId: txId,
      grantedAt: now,
      grantedBy: uid,
      courseTitleSnapshot: course.title,
      lessonTitleSnapshot: lesson.title,
    };
    await setFirestoreRestDoc("course_entitlements", entitlementId, entitlement);
    await setFirestoreRestDoc("wallet_transactions", txId, {
      id: txId,
      uid,
      type: "course_lesson_unlock_debit",
      amountVnd: priceVnd,
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
      note: `Mở khóa bài giảng "${lesson.title}" (${course.title}): -${priceVnd.toLocaleString("vi-VN")}đ`,
      createdAt: now,
    });
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

    if (!course.allowSingleLessonPurchase) {
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
          ? `Mở khóa bài giảng "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}đ (giảm ${discountVnd.toLocaleString("vi-VN")}đ nhờ voucher ${appliedVoucher?.code})`
          : `Mở khóa bài giảng "${lesson.title}" (${course.title}): -${effectivePrice.toLocaleString("vi-VN")}đ`,
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

  const course = await fetchCourseDoc(courseId);
  if (!course) throw new Error("Không tìm thấy khóa học.");
  const lesson = lessonId ? await fetchLessonDoc(courseId, lessonId) : null;

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

  invalidateStudentDetailsCache(studentUid);
  return { success: true, entitlement };
}
