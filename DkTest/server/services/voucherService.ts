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

import {
  adminDb,
  getFirestoreRestDocs,
  getFirestoreRestDoc,
  setFirestoreRestDoc,
  deleteFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type { Voucher, VoucherType, VoucherUsage, StudentWallet, WalletTransaction } from "../../src/types/index.js";

function normalizeCode(code: string): string {
  return String(code || "").trim().toUpperCase();
}

export async function getVouchersList(): Promise<Voucher[]> {
  if (adminDb) {
    try {
      const snap = await adminDb.collection("vouchers").orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Voucher));
    } catch (err) {
      // If index is missing, fallback without orderBy
      const snap = await adminDb.collection("vouchers").get();
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Voucher));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return list;
    }
  }

  // REST fallback mode
  const docs = await getFirestoreRestDocs("vouchers", 100, false);
  const list = (docs || []).map((d) => ({ id: d.id, ...d } as Voucher));
  list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return list;
}

export async function createVoucher(data: Partial<Voucher>): Promise<Voucher> {
  const code = normalizeCode(data.code || "");
  if (!code || code.length < 3) {
    throw new Error("Mã voucher phải có ít nhất 3 ký tự (chữ hoặc số).");
  }

  // Check code uniqueness
  if (adminDb) {
    const existing = await adminDb.collection("vouchers").where("code", "==", code).limit(1).get();
    if (!existing.empty) {
      throw new Error(`Mã voucher "${code}" đã tồn tại trên hệ thống.`);
    }
  } else {
    const existingList = await getFirestoreRestDocs("vouchers", 100, false);
    if ((existingList || []).some((v: any) => normalizeCode(v.code) === code)) {
      throw new Error(`Mã voucher "${code}" đã tồn tại trên hệ thống.`);
    }
  }

  const now = new Date().toISOString();
  const id = `vouch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const voucher: Voucher = {
    id,
    code,
    name: data.name?.trim() || `Voucher ${code}`,
    type: (data.type as VoucherType) || "discount_fixed",
    value: Math.max(0, Number(data.value) || 0),
    maxDiscountVnd: data.maxDiscountVnd ? Math.max(0, Number(data.maxDiscountVnd)) : undefined,
    minOrderVnd: data.minOrderVnd ? Math.max(0, Number(data.minOrderVnd)) : 0,
    minDepositVnd: data.minDepositVnd ? Math.max(0, Number(data.minDepositVnd)) : 0,
    usageLimit: data.usageLimit !== undefined ? Math.max(0, Number(data.usageLimit)) : 0,
    usedCount: 0,
    perUserLimit: data.perUserLimit !== undefined ? Math.max(1, Number(data.perUserLimit)) : 1,
    expiresAt: data.expiresAt || null,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    description: data.description?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (adminDb) {
    await adminDb.collection("vouchers").doc(id).set(voucher);
  } else {
    await setFirestoreRestDoc("vouchers", id, voucher);
  }

  return voucher;
}

export async function updateVoucher(id: string, data: Partial<Voucher>): Promise<Voucher> {
  const now = new Date().toISOString();
  const updates: Partial<Voucher> = {
    ...data,
    updatedAt: now,
  };

  if (data.code) {
    updates.code = normalizeCode(data.code);
  }

  if (adminDb) {
    const docRef = adminDb.collection("vouchers").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error("Không tìm thấy voucher yêu cầu.");
    }
    await docRef.set(updates, { merge: true });
    const updatedSnap = await docRef.get();
    return { id, ...updatedSnap.data() } as Voucher;
  } else {
    const current = await getFirestoreRestDoc("vouchers", id, false);
    if (!current) {
      throw new Error("Không tìm thấy voucher yêu cầu.");
    }
    const merged = { ...current, ...updates };
    await setFirestoreRestDoc("vouchers", id, merged);
    return merged as Voucher;
  }
}

export async function deleteVoucher(id: string): Promise<void> {
  if (adminDb) {
    await adminDb.collection("vouchers").doc(id).delete();
  } else {
    await deleteFirestoreRestDoc("vouchers", id);
  }
}

export async function getVoucherUsagesList(voucherId?: string): Promise<VoucherUsage[]> {
  let list: VoucherUsage[] = [];
  if (adminDb) {
    try {
      let queryRef: any = adminDb.collection("voucher_usages");
      if (voucherId) {
        queryRef = queryRef.where("voucherId", "==", voucherId);
      }
      const snap = await queryRef.limit(500).get();
      list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as VoucherUsage));
    } catch (err) {
      console.warn("[voucherService] adminDb getVoucherUsagesList query error, fallback without where:", err);
      try {
        const snap = await adminDb.collection("voucher_usages").limit(500).get();
        list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as VoucherUsage));
        if (voucherId) {
          list = list.filter((u) => u.voucherId === voucherId || (u as any).code === voucherId);
        }
      } catch (_) {}
    }
  } else {
    const docs = await getFirestoreRestDocs("voucher_usages", 500, false);
    list = (docs || []).map((d: any) => ({ id: d.id, ...d } as VoucherUsage));
    if (voucherId) {
      list = list.filter((u) => u.voucherId === voucherId || (u as any).code === voucherId);
    }
  }

  // Sort newest first
  list.sort((a, b) => {
    const timeA = new Date(a.usedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.usedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return list;
}

export interface ValidateVoucherResult {
  valid: boolean;
  message?: string;
  voucher?: Voucher;
  discountVnd?: number;
  bonusVnd?: number;
  finalPriceVnd?: number;
}

export async function validateVoucher(params: {
  code: string;
  uid: string;
  context: "exam_unlock" | "deposit" | "gift_money";
  amountVnd?: number;
  examId?: string;
}): Promise<ValidateVoucherResult> {
  const code = normalizeCode(params.code);
  if (!code) {
    return { valid: false, message: "Vui lòng nhập mã voucher." };
  }

  let voucher: Voucher | null = null;
  if (adminDb) {
    const snap = await adminDb.collection("vouchers").where("code", "==", code).limit(1).get();
    if (!snap.empty) {
      voucher = { id: snap.docs[0].id, ...snap.docs[0].data() } as Voucher;
    }
  } else {
    const all = await getFirestoreRestDocs("vouchers", 100, false);
    const found = (all || []).find((v: any) => normalizeCode(v.code) === code);
    if (found) {
      voucher = found as Voucher;
    }
  }

  if (!voucher) {
    return { valid: false, message: `Mã voucher "${code}" không tồn tại hoặc đã hết hạn.` };
  }

  // 1. Check isActive
  if (!voucher.isActive) {
    return { valid: false, message: "Mã voucher này hiện đang bị tạm khóa." };
  }

  // 2. Check Expiration
  if (voucher.expiresAt) {
    const expTime = new Date(voucher.expiresAt).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      return { valid: false, message: "Mã voucher này đã hết hạn sử dụng." };
    }
  }

  // 3. Check System Usage Limit
  if (voucher.usageLimit && voucher.usageLimit > 0 && (voucher.usedCount || 0) >= voucher.usageLimit) {
    return { valid: false, message: "Mã voucher này đã hết lượt sử dụng." };
  }

  // 4. Check Per-User Usage Limit
  if (params.uid) {
    let userUsedCount = 0;
    if (adminDb) {
      const usagesSnap = await adminDb
        .collection("voucher_usages")
        .where("voucherId", "==", voucher.id)
        .where("uid", "==", params.uid)
        .get();
      userUsedCount = usagesSnap.size;
    } else {
      const allUsages = await getFirestoreRestDocs("voucher_usages", 100, false);
      userUsedCount = (allUsages || []).filter((u: any) => u.voucherId === voucher!.id && u.uid === params.uid).length;
    }

    const perUserLimit = voucher.perUserLimit || 1;
    if (userUsedCount >= perUserLimit) {
      return { valid: false, message: `Bạn đã sử dụng mã này ${userUsedCount}/${perUserLimit} lần tối đa.` };
    }
  }

  const baseAmount = Math.max(0, params.amountVnd || 0);

  // 5. Context Specific Validations
  if (params.context === "gift_money") {
    if (voucher.type !== "gift_money") {
      return { valid: false, message: "Mã này không phải mã quà tặng nạp tiền trực tiếp." };
    }
    return {
      valid: true,
      voucher,
      bonusVnd: voucher.value,
      message: `Mã hợp lệ! Nhận ngay +${voucher.value.toLocaleString("vi-VN")}đ vào ví.`,
    };
  }

  if (params.context === "exam_unlock") {
    if (voucher.type !== "discount_percent" && voucher.type !== "discount_fixed") {
      return { valid: false, message: "Mã này không áp dụng để giảm giá mở khóa bài thi." };
    }
    if (voucher.minOrderVnd && baseAmount < voucher.minOrderVnd) {
      return {
        valid: false,
        message: `Mã này chỉ áp dụng cho bài thi có giá từ ${voucher.minOrderVnd.toLocaleString("vi-VN")}đ trở lên.`,
      };
    }

    let discountVnd = 0;
    if (voucher.type === "discount_percent") {
      discountVnd = Math.round((baseAmount * voucher.value) / 100);
      if (voucher.maxDiscountVnd && discountVnd > voucher.maxDiscountVnd) {
        discountVnd = voucher.maxDiscountVnd;
      }
    } else {
      discountVnd = voucher.value;
    }

    // Discount cannot exceed base price
    discountVnd = Math.min(baseAmount, Math.max(0, discountVnd));
    const finalPriceVnd = Math.max(0, baseAmount - discountVnd);

    return {
      valid: true,
      voucher,
      discountVnd,
      finalPriceVnd,
      message: `Áp dụng thành công! Giảm ${discountVnd.toLocaleString("vi-VN")}đ (còn ${finalPriceVnd.toLocaleString("vi-VN")}đ).`,
    };
  }

  if (params.context === "deposit") {
    if (voucher.type !== "deposit_bonus_percent" && voucher.type !== "deposit_bonus_fixed") {
      return { valid: false, message: "Mã này không áp dụng ưu đãi khi nạp tiền." };
    }
    if (voucher.minDepositVnd && baseAmount < voucher.minDepositVnd) {
      return {
        valid: false,
        message: `Mã này chỉ áp dụng khi nạp từ ${voucher.minDepositVnd.toLocaleString("vi-VN")}đ trở lên.`,
      };
    }

    let bonusVnd = 0;
    if (voucher.type === "deposit_bonus_percent") {
      bonusVnd = Math.round((baseAmount * voucher.value) / 100);
    } else {
      bonusVnd = voucher.value;
    }

    return {
      valid: true,
      voucher,
      bonusVnd,
      message: `Mã nạp hợp lệ! Bạn sẽ được tặng thêm +${bonusVnd.toLocaleString("vi-VN")}đ vào ví.`,
    };
  }

  return { valid: false, message: "Loại ưu đãi không phù hợp." };
}

export async function redeemGiftVoucher(code: string, uid: string): Promise<{
  success: boolean;
  addedVnd: number;
  newBalanceVnd: number;
  voucher: Voucher;
}> {
  const validation = await validateVoucher({ code, uid, context: "gift_money" });
  if (!validation.valid || !validation.voucher || !validation.bonusVnd) {
    throw new Error(validation.message || "Mã quà tặng không hợp lệ.");
  }

  const voucher = validation.voucher;
  const addedVnd = validation.bonusVnd;
  const now = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const usageId = `vuse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let finalBalance = 0;

  if (adminDb) {
    await adminDb.runTransaction(async (transaction) => {
      // 1. Re-check voucher in transaction
      const vRef = adminDb.collection("vouchers").doc(voucher.id);
      const vSnap = await transaction.get(vRef);
      if (!vSnap.exists) throw new Error("Voucher không tồn tại.");
      const vData = vSnap.data() as Voucher;
      if (vData.usageLimit && vData.usageLimit > 0 && (vData.usedCount || 0) >= vData.usageLimit) {
        throw new Error("Mã quà tặng đã hết lượt sử dụng.");
      }

      // 2. Read student wallet
      const wRef = adminDb.collection("wallets").doc(uid);
      const wSnap = await transaction.get(wRef);
      let prevBalance = 0;
      let fullName = "";
      let currentClass = "";

      if (wSnap.exists) {
        const wData = wSnap.data() as StudentWallet;
        prevBalance = wData.balanceVnd || 0;
        fullName = wData.fullName || "";
        currentClass = wData.currentClass || "";
      }

      finalBalance = prevBalance + addedVnd;

      // 3. Update wallet
      transaction.set(
        wRef,
        {
          uid,
          balanceVnd: finalBalance,
          totalCreditedVnd: (wSnap.exists ? wSnap.data()?.totalCreditedVnd || 0 : 0) + addedVnd,
          updatedAt: now,
        },
        { merge: true }
      );

      // 4. Update voucher usedCount
      transaction.update(vRef, {
        usedCount: (vData.usedCount || 0) + 1,
        updatedAt: now,
      });

      // 5. Record voucher usage
      const usageRef = adminDb.collection("voucher_usages").doc(usageId);
      const usageDoc: VoucherUsage = {
        id: usageId,
        voucherId: voucher.id,
        voucherCode: voucher.code,
        uid,
        studentName: fullName,
        studentClass: currentClass,
        type: "gift_money",
        bonusVnd: addedVnd,
        usedAt: now,
        context: "gift_money",
      };
      transaction.set(usageRef, usageDoc);

      // 6. Record wallet transaction
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txDoc: WalletTransaction = {
        id: txId,
        uid,
        type: "deposit_credit",
        amountVnd: addedVnd,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: finalBalance,
        actorUid: "system",
        actorName: `Voucher: ${voucher.code}`,
        note: `Nhập mã quà tặng "${voucher.code}": +${addedVnd.toLocaleString("vi-VN")}đ`,
        createdAt: now,
      };
      transaction.set(txRef, txDoc);
    });
  } else {
    // REST API fallback mode
    const wData = await getFirestoreRestDoc("wallets", uid, false);
    const prevBalance = wData?.balanceVnd || 0;
    finalBalance = prevBalance + addedVnd;
    const fullName = wData?.fullName || "";
    const currentClass = wData?.currentClass || "";

    // 1. Update wallet
    await setFirestoreRestDoc("wallets", uid, {
      ...wData,
      uid,
      balanceVnd: finalBalance,
      totalCreditedVnd: (wData?.totalCreditedVnd || 0) + addedVnd,
      updatedAt: now,
    });

    // 2. Update voucher usedCount
    await setFirestoreRestDoc("vouchers", voucher.id, {
      ...voucher,
      usedCount: (voucher.usedCount || 0) + 1,
      updatedAt: now,
    });

    // 3. Record voucher usage
    const usageDoc: VoucherUsage = {
      id: usageId,
      voucherId: voucher.id,
      voucherCode: voucher.code,
      uid,
      studentName: fullName,
      studentClass: currentClass,
      type: "gift_money",
      bonusVnd: addedVnd,
      usedAt: now,
      context: "gift_money",
    };
    await setFirestoreRestDoc("voucher_usages", usageId, usageDoc);

    // 4. Record wallet transaction
    const txDoc: WalletTransaction = {
      id: txId,
      uid,
      type: "deposit_credit",
      amountVnd: addedVnd,
      balanceBeforeVnd: prevBalance,
      balanceAfterVnd: finalBalance,
      actorUid: "system",
      actorName: `Voucher: ${voucher.code}`,
      note: `Nhập mã quà tặng "${voucher.code}": +${addedVnd.toLocaleString("vi-VN")}đ`,
      createdAt: now,
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
  }

  return {
    success: true,
    addedVnd,
    newBalanceVnd: finalBalance,
    voucher,
  };
}
