import {
  adminDb,
  getFirestoreRestDoc,
  getFirestoreRestDocs,
  setFirestoreRestDoc,
  clearServerRestCache,
} from "../firebaseAdmin.js";
import type {
  StudentWallet,
  WalletTransaction,
  DepositRequest,
  ExamEntitlement,
  DebtRecord,
  StudentDebtSummary,
  Exam,
} from "../../src/types/index.js";

// Helper to sanitize positive integer VND
export function sanitizeVnd(val: any): number {
  if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
    val = parseInt(String(val || 0), 10);
  }
  if (isNaN(val) || !isFinite(val) || val < 0) return 0;
  return Math.floor(val);
}

// -------------------------------------------------------------
// 1. WALLET PROFILE & RETRIEVAL
// -------------------------------------------------------------

export async function getOrCreateWallet(
  uid: string,
  initialData?: { fullName?: string; currentClass?: string }
): Promise<StudentWallet> {
  if (!uid || typeof uid !== "string") {
    throw new Error("UID không hợp lệ.");
  }

  const cleanUid = uid.trim();

  if (adminDb) {
    const walletRef = adminDb.collection("wallets").doc(cleanUid);
    const snap = await walletRef.get();

    if (snap.exists) {
      const data = snap.data() as StudentWallet;
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
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      }
    }

    // Secondary search: check if user has another wallet ID (e.g. cleanUid is Auth UID -> look up by username, or cleanUid is username -> look up by Auth UID)
    let altDocId: string | null = null;
    let defaultName = initialData?.fullName || "";
    let defaultClass = initialData?.currentClass || "";

    try {
      // If cleanUid is Auth UID, check user doc to get username
      const uDoc = await adminDb.collection("users").doc(cleanUid).get();
      if (uDoc.exists) {
        const uData = uDoc.data();
        defaultName = defaultName || uData?.fullName || uData?.displayName || "";
        defaultClass = defaultClass || uData?.studentClass || "";
        if (uData?.username) altDocId = uData.username;
      } else {
        // If cleanUid might be username, check usernames doc
        const unSnap = await adminDb.collection("usernames").doc(cleanUid.toLowerCase()).get();
        if (unSnap.exists && unSnap.data()?.uid) {
          altDocId = unSnap.data()!.uid;
        }
      }
    } catch (_) {}

    if (altDocId && altDocId !== cleanUid) {
      try {
        const altSnap = await adminDb.collection("wallets").doc(altDocId).get();
        if (altSnap.exists) {
          const altData = altSnap.data() as StudentWallet;
          const altBal = sanitizeVnd(altData.balanceVnd);
          if (altBal > 0) {
            // Found wallet under alternative ID with positive balance! Sync it to primary cleanUid so both resolve properly
            const now = new Date().toISOString();
            const syncedWallet: StudentWallet = {
              uid: cleanUid,
              balanceVnd: altBal,
              totalCreditedVnd: sanitizeVnd(altData.totalCreditedVnd),
              totalSpentVnd: sanitizeVnd(altData.totalSpentVnd),
              profileCompleted: Boolean(altData.profileCompleted || (defaultName && defaultClass)),
              fullName: altData.fullName || defaultName,
              currentClass: altData.currentClass || defaultClass,
              verifiedName: altData.verifiedName,
              isVerified: altData.isVerified,
              createdAt: altData.createdAt || now,
              updatedAt: now,
            };
            await walletRef.set(syncedWallet, { merge: true });
            return await autoApprovePendingRequestsForUser(cleanUid, syncedWallet);
          }
        }
      } catch (_) {}
    }

    // If cleanUid was found initially with 0 balance
    if (snap.exists) {
      const data = snap.data() as StudentWallet;
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
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    }

    const now = new Date().toISOString();
    const newWallet: StudentWallet = {
      uid: cleanUid,
      balanceVnd: 0,
      totalCreditedVnd: 0,
      totalSpentVnd: 0,
      profileCompleted: Boolean(defaultName && defaultClass),
      fullName: defaultName,
      currentClass: defaultClass,
      createdAt: now,
      updatedAt: now,
    };

    await walletRef.set(newWallet);
    return await autoApprovePendingRequestsForUser(cleanUid, newWallet);
  }

  // REST fallback
  const existing = await getFirestoreRestDoc("wallets", cleanUid);
  if (existing) {
    const existingBal = sanitizeVnd(existing.balanceVnd);
    if (existingBal > 0) {
      const w: StudentWallet = {
        uid: cleanUid,
        balanceVnd: existingBal,
        totalCreditedVnd: sanitizeVnd(existing.totalCreditedVnd),
        totalSpentVnd: sanitizeVnd(existing.totalSpentVnd),
        profileCompleted: Boolean(existing.profileCompleted),
        fullName: existing.fullName || "",
        currentClass: existing.currentClass || "",
        verifiedName: existing.verifiedName,
        isVerified: existing.isVerified,
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: existing.updatedAt || new Date().toISOString(),
      };
      return await autoApprovePendingRequestsForUser(cleanUid, w);
    }
  }

  // REST alternative ID check
  let altDocIdRest: string | null = null;
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
  } catch (_) {}

  if (altDocIdRest && altDocIdRest !== cleanUid) {
    try {
      const altExisting = await getFirestoreRestDoc("wallets", altDocIdRest);
      if (altExisting && sanitizeVnd(altExisting.balanceVnd) > 0) {
        const altBal = sanitizeVnd(altExisting.balanceVnd);
        const now = new Date().toISOString();
        const syncedWallet: StudentWallet = {
          uid: cleanUid,
          balanceVnd: altBal,
          totalCreditedVnd: sanitizeVnd(altExisting.totalCreditedVnd),
          totalSpentVnd: sanitizeVnd(altExisting.totalSpentVnd),
          profileCompleted: Boolean(altExisting.profileCompleted || (restDefaultName && restDefaultClass)),
          fullName: altExisting.fullName || restDefaultName,
          currentClass: altExisting.currentClass || restDefaultClass,
          verifiedName: altExisting.verifiedName,
          isVerified: altExisting.isVerified,
          createdAt: altExisting.createdAt || now,
          updatedAt: now,
        };
        await setFirestoreRestDoc("wallets", cleanUid, syncedWallet);
        return await autoApprovePendingRequestsForUser(cleanUid, syncedWallet);
      }
    } catch (_) {}
  }

  if (existing) {
    const w: StudentWallet = {
      uid: cleanUid,
      balanceVnd: sanitizeVnd(existing.balanceVnd),
      totalCreditedVnd: sanitizeVnd(existing.totalCreditedVnd),
      totalSpentVnd: sanitizeVnd(existing.totalSpentVnd),
      profileCompleted: Boolean(existing.profileCompleted),
      fullName: existing.fullName || restDefaultName,
      currentClass: existing.currentClass || restDefaultClass,
      verifiedName: existing.verifiedName,
      isVerified: existing.isVerified,
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: existing.updatedAt || new Date().toISOString(),
    };
    return await autoApprovePendingRequestsForUser(cleanUid, w);
  }

  const now = new Date().toISOString();
  const newWallet: StudentWallet = {
    uid: cleanUid,
    balanceVnd: 0,
    totalCreditedVnd: 0,
    totalSpentVnd: 0,
    profileCompleted: Boolean(restDefaultName && restDefaultClass),
    fullName: restDefaultName,
    currentClass: restDefaultClass,
    createdAt: now,
    updatedAt: now,
  };

  await setFirestoreRestDoc("wallets", cleanUid, newWallet);
  return await autoApprovePendingRequestsForUser(cleanUid, newWallet);
}

async function autoApprovePendingRequestsForUser(uid: string, wallet: StudentWallet): Promise<StudentWallet> {
  try {
    const pendingRequests = await getStudentDepositRequests(uid);
    const unapproved = pendingRequests.filter((r) => r.status === "pending");
    if (unapproved.length === 0) return wallet;

    let balanceAdd = 0;
    const now = new Date().toISOString();

    for (const req of unapproved) {
      const amt = sanitizeVnd(req.amountVnd);
      if (amt <= 0) continue;
      balanceAdd += amt;

      const approvedReq: DepositRequest = {
        ...req,
        status: "approved",
        processedAt: now,
        processedBy: "system",
        processedByName: "Hệ thống tự động duyệt",
        externalCollectionNote: "Đã cộng ví ảo tự động. Cần thu tiền mặt ngoài đời.",
      };

      if (adminDb) {
        await adminDb.collection("deposit_requests").doc(req.id).set(approvedReq, { merge: true });
      } else {
        await setFirestoreRestDoc("deposit_requests", req.id, approvedReq);
      }

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const ledgerEntry: WalletTransaction = {
        id: txId,
        uid,
        type: "deposit_credit",
        amountVnd: amt,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: wallet.balanceVnd + balanceAdd,
        depositRequestId: req.id,
        idempotencyKey: req.id,
        actorUid: "system",
        actorName: "Hệ thống tự động duyệt",
        note: `Nạp tiền tự động: +${amt.toLocaleString("vi-VN")}đ (chờ thu tiền mặt ngoài đời)`,
        createdAt: now,
      };

      const debtEntry: DebtRecord = {
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
        note: `Tiền nạp ví tự động #${req.id} (cần thu ngoài đời)`,
        createdAt: now,
        updatedAt: now,
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
      const updatedWallet: StudentWallet = {
        ...wallet,
        balanceVnd: sanitizeVnd(wallet.balanceVnd) + balanceAdd,
        totalCreditedVnd: sanitizeVnd(wallet.totalCreditedVnd) + balanceAdd,
        updatedAt: now,
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

export async function updateWalletProfile(
  uid: string,
  data: { fullName: string; currentClass: string }
): Promise<StudentWallet> {
  const fullName = String(data.fullName || "").trim();
  const currentClass = String(data.currentClass || "").trim().toUpperCase();

  if (!fullName || fullName.length < 2) {
    throw new Error("Họ và tên học sinh phải có ít nhất 2 ký tự.");
  }
  if (!currentClass || currentClass.length < 2) {
    throw new Error("Lớp học hiện tại không hợp lệ (ví dụ: 11A1, 12D2).");
  }

  const existing = await getOrCreateWallet(uid);
  const now = new Date().toISOString();

  const updates: Partial<StudentWallet> = {
    fullName,
    currentClass,
    profileCompleted: true,
    updatedAt: now,
  };

  if (adminDb) {
    await adminDb.collection("wallets").doc(uid).update(updates);
  } else {
    await setFirestoreRestDoc("wallets", uid, { ...existing, ...updates });
  }

  return { ...existing, ...updates };
}

// -------------------------------------------------------------
// 2. DEPOSIT REQUESTS
// -------------------------------------------------------------

async function sendDiscordDepositAlert(params: {
  studentName: string;
  studentClass: string;
  amountVnd: number;
  requestId: string;
  uid: string;
}) {
  const webhookUrl =
    process.env.DISCORD_REPORT_WEBHOOK_URL ||
    "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";

  const payload = {
    embeds: [
      {
        title: "💵 HỌC SINH NẠP TIỀN VÍ ẢO (TỰ ĐỘNG DUYỆT)",
        color: 0x10b981,
        description:
          "Học sinh đã nạp tiền vào ví ảo để mở khóa bài thi. Khoản tiền đã được ghi vào **Sổ công nợ**, vui lòng kiểm tra và thu tiền mặt ngoài đời!",
        fields: [
          {
            name: "👤 Học sinh",
            value: `**${params.studentName || "N/A"}**`,
            inline: true,
          },
          {
            name: "🏫 Lớp",
            value: `\`${params.studentClass || "Chưa rõ"}\``,
            inline: true,
          },
          {
            name: "💰 Số tiền nạp",
            value: `**+${params.amountVnd.toLocaleString("vi-VN")}đ**`,
            inline: true,
          },
          {
            name: "🆔 Mã yêu cầu nạp",
            value: `\`${params.requestId}\``,
            inline: false,
          },
          {
            name: "⚡ Trạng thái",
            value: "✅ **Đã cộng ví tự động** — ⏳ **Cần thu tiền mặt ngoài đời**",
            inline: false,
          },
        ],
        footer: {
          text: "Hệ thống Ví & Công nợ DkTEST",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.warn(`[DiscordWebhook] Gửi thông báo nạp tiền thất bại: HTTP ${resp.status}`);
    } else {
      console.log(`[DiscordWebhook] Đã gửi thông báo nạp tiền cho học sinh ${params.studentName}`);
    }
  } catch (err: any) {
    console.warn("[DiscordWebhook] Không thể gửi Discord alert:", err?.message || err);
  }
}

export async function createDepositRequest(
  uid: string,
  amountVnd: number,
  idempotencyKey?: string
): Promise<DepositRequest> {
  const cleanAmount = sanitizeVnd(amountVnd);

  if (cleanAmount < 1000) {
    throw new Error("Số tiền nạp tối thiểu là 1.000đ.");
  }
  if (cleanAmount > 500000) {
    throw new Error("Số tiền nạp tối đa cho mỗi yêu cầu là 500.000đ.");
  }

  const wallet = await getOrCreateWallet(uid);
  if (!wallet.profileCompleted || !wallet.fullName || !wallet.currentClass) {
    throw new Error("Vui lòng hoàn thành hồ sơ họ tên và lớp trước khi tạo yêu cầu nạp tiền.");
  }

  const cleanKey = idempotencyKey ? String(idempotencyKey).trim() : "";
  const now = new Date().toISOString();

  if (cleanKey && adminDb) {
    // Check existing request by idempotency key
    const existingSnap = await adminDb
      .collection("deposit_requests")
      .where("idempotencyKey", "==", cleanKey)
      .where("uid", "==", uid)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return existingSnap.docs[0].data() as DepositRequest;
    }
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Yêu cầu nạp được hệ thống tự động duyệt ngay lập tức (Auto-Approved)
  const requestDoc: DepositRequest = {
    id: requestId,
    uid,
    amountVnd: cleanAmount,
    status: "approved",
    studentNameSnapshot: wallet.fullName,
    studentClassSnapshot: wallet.currentClass,
    createdAt: now,
    processedAt: now,
    processedBy: "system",
    processedByName: "Hệ thống tự động duyệt",
    externalCollectionNote: "Đã cộng ví ảo tự động. Cần thu tiền mặt ngoài đời.",
    idempotencyKey: cleanKey || requestId,
  };

  if (adminDb) {
    await adminDb.runTransaction(async (transaction) => {
      // 1. Đọc số dư ví mới nhất trong transaction
      const walletRef = adminDb.collection("wallets").doc(uid);
      const walletSnap = await transaction.get(walletRef);

      let prevBalance = 0;
      let totalCredited = 0;
      let totalSpent = 0;
      let fullName = wallet.fullName;
      let currentClass = wallet.currentClass;

      if (walletSnap.exists) {
        const wData = walletSnap.data() as StudentWallet;
        prevBalance = sanitizeVnd(wData.balanceVnd);
        totalCredited = sanitizeVnd(wData.totalCreditedVnd);
        totalSpent = sanitizeVnd(wData.totalSpentVnd);
        fullName = wData.fullName || fullName;
        currentClass = wData.currentClass || currentClass;
      }

      const newBalance = prevBalance + cleanAmount;
      const newTotalCredited = totalCredited + cleanAmount;

      // 2. Lưu yêu cầu nạp với trạng thái đã duyệt
      const reqRef = adminDb.collection("deposit_requests").doc(requestId);
      transaction.set(reqRef, requestDoc);

      // 3. Cộng ngay số dư ví
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
          updatedAt: now,
        },
        { merge: true }
      );

      // 4. Ghi sổ cái giao dịch ví
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const ledgerEntry: WalletTransaction = {
        id: txId,
        uid,
        type: "deposit_credit",
        amountVnd: cleanAmount,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        depositRequestId: requestId,
        idempotencyKey: cleanKey || requestId,
        actorUid: "system",
        actorName: "Hệ thống tự động duyệt",
        note: `Nạp tiền tự động: +${cleanAmount.toLocaleString("vi-VN")}đ (chờ thu tiền mặt ngoài đời)`,
        createdAt: now,
      };
      transaction.set(txRef, ledgerEntry);

      // 5. Ghi vào sổ công nợ để theo dõi khoản phải thu ngoài đời
      const debtRef = adminDb.collection("debt_records").doc(debtId);
      const debtEntry: DebtRecord = {
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
        note: `Tiền nạp ví tự động #${requestId} (cần thu ngoài đời)`,
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(debtRef, debtEntry);

      // 6. Gửi thông báo hệ thống cho Admin
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const notifRef = adminDb.collection("notifications").doc(notifId);
      transaction.set(notifRef, {
        id: notifId,
        recipientUid: "admin",
        title: `💵 Học sinh nạp tiền: ${fullName || wallet.fullName || "Học sinh"} (+${cleanAmount.toLocaleString("vi-VN")}đ)`,
        content: `Học sinh ${fullName || wallet.fullName || "Học sinh"} (${currentClass || wallet.currentClass || "Chưa rõ"}) vừa nạp ${cleanAmount.toLocaleString("vi-VN")}đ vào ví ảo. Hệ thống đã tự động duyệt & ghi nợ. Vui lòng thu tiền mặt ngoài đời!`,
        type: "system",
        read: false,
        link: "/admin/wallets",
        createdAt: now,
      });
    });
  } else {
    // REST fallback mode
    const prevBalance = sanitizeVnd(wallet.balanceVnd);
    const newBalance = prevBalance + cleanAmount;
    const newTotalCredited = sanitizeVnd(wallet.totalCreditedVnd) + cleanAmount;

    await setFirestoreRestDoc("deposit_requests", requestId, requestDoc);

    await setFirestoreRestDoc("wallets", uid, {
      ...wallet,
      balanceVnd: newBalance,
      totalCreditedVnd: newTotalCredited,
      updatedAt: now,
    });

    const ledgerEntry: WalletTransaction = {
      id: txId,
      uid,
      type: "deposit_credit",
      amountVnd: cleanAmount,
      balanceBeforeVnd: prevBalance,
      balanceAfterVnd: newBalance,
      depositRequestId: requestId,
      idempotencyKey: cleanKey || requestId,
      actorUid: "system",
      actorName: "Hệ thống tự động duyệt",
      note: `Nạp tiền tự động: +${cleanAmount.toLocaleString("vi-VN")}đ (chờ thu tiền mặt ngoài đời)`,
      createdAt: now,
    };
    await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);

    const debtEntry: DebtRecord = {
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
      note: `Tiền nạp ví tự động #${requestId} (cần thu ngoài đời)`,
      createdAt: now,
      updatedAt: now,
    };
    await setFirestoreRestDoc("debt_records", debtId, debtEntry);

    // Gửi thông báo hệ thống cho Admin trong REST fallback
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await setFirestoreRestDoc("notifications", notifId, {
      id: notifId,
      recipientUid: "admin",
      title: `💵 Học sinh nạp tiền: ${wallet.fullName || "Học sinh"} (+${cleanAmount.toLocaleString("vi-VN")}đ)`,
      content: `Học sinh ${wallet.fullName || "Học sinh"} (${wallet.currentClass || "Chưa rõ"}) vừa nạp ${cleanAmount.toLocaleString("vi-VN")}đ vào ví ảo. Hệ thống đã tự động duyệt & ghi nợ. Vui lòng thu tiền mặt ngoài đời!`,
      type: "system",
      read: false,
      link: "/admin/wallets",
      createdAt: now,
    });
  }

  // Gửi thông báo Discord Webhook tức thì cho Admin (non-blocking)
  sendDiscordDepositAlert({
    studentName: wallet.fullName || "Học sinh",
    studentClass: wallet.currentClass || "Chưa rõ",
    amountVnd: cleanAmount,
    requestId,
    uid,
  }).catch((err) => {
    console.warn("[walletService] Lỗi gửi Discord webhook:", err);
  });

  return requestDoc;
}

export async function approveDepositRequest(
  requestId: string,
  adminUid: string,
  adminName: string,
  externalCollectionNote?: string
): Promise<{ success: boolean; newBalanceVnd: number; transactionId: string }> {
  if (!requestId) throw new Error("Mã yêu cầu nạp không hợp lệ.");

  const now = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (adminDb) {
    return await adminDb.runTransaction(async (transaction) => {
      const reqRef = adminDb.collection("deposit_requests").doc(requestId);
      const reqDoc = await transaction.get(reqRef);

      if (!reqDoc.exists) {
        throw new Error("Không tìm thấy yêu cầu nạp tiền.");
      }

      const reqData = reqDoc.data() as DepositRequest;
      if (reqData.status === "approved") {
        // Idempotent: Already approved!
        const wDoc = await transaction.get(adminDb.collection("wallets").doc(reqData.uid));
        const currentBal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
        return { success: true, newBalanceVnd: currentBal, transactionId: "" };
      }

      if (reqData.status !== "pending") {
        throw new Error(`Yêu cầu nạp không thể duyệt (trạng thái hiện tại: ${reqData.status}).`);
      }

      const amount = sanitizeVnd(reqData.amountVnd);
      const walletRef = adminDb.collection("wallets").doc(reqData.uid);
      const walletDoc = await transaction.get(walletRef);

      let prevBalance = 0;
      let totalCredited = 0;
      let totalSpent = 0;
      let fullName = reqData.studentNameSnapshot || "";
      let currentClass = reqData.studentClassSnapshot || "";

      if (walletDoc.exists) {
        const wData = walletDoc.data() as StudentWallet;
        prevBalance = sanitizeVnd(wData.balanceVnd);
        totalCredited = sanitizeVnd(wData.totalCreditedVnd);
        totalSpent = sanitizeVnd(wData.totalSpentVnd);
        fullName = wData.fullName || fullName;
        currentClass = wData.currentClass || currentClass;
      }

      const newBalance = prevBalance + amount;
      const newTotalCredited = totalCredited + amount;

      // 1. Update wallet balance
      transaction.set(
        walletRef,
        {
          uid: reqData.uid,
          balanceVnd: newBalance,
          totalCreditedVnd: newTotalCredited,
          totalSpentVnd: totalSpent,
          profileCompleted: true,
          fullName,
          currentClass,
          updatedAt: now,
        },
        { merge: true }
      );

      // 2. Update deposit request status
      transaction.update(reqRef, {
        status: "approved",
        processedAt: now,
        processedBy: adminUid,
        processedByName: adminName,
        externalCollectionNote: externalCollectionNote || "Admin xác nhận đã thu tiền ngoài đời.",
      });

      // 3. Create ledger entry
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const ledgerEntry: WalletTransaction = {
        id: txId,
        uid: reqData.uid,
        type: "deposit_credit",
        amountVnd: amount,
        balanceBeforeVnd: prevBalance,
        balanceAfterVnd: newBalance,
        depositRequestId: requestId,
        idempotencyKey: requestId,
        actorUid: adminUid,
        actorName: adminName,
        note: `Nạp tiền ảo qua yêu cầu #${requestId}: +${amount.toLocaleString("vi-VN")}đ`,
        createdAt: now,
      };
      transaction.set(txRef, ledgerEntry);

      return {
        success: true,
        newBalanceVnd: newBalance,
        transactionId: txId,
      };
    });
  }

  // Fallback REST mode
  const reqData = await getFirestoreRestDoc("deposit_requests", requestId);
  if (!reqData) throw new Error("Không tìm thấy yêu cầu nạp tiền.");
  if (reqData.status === "approved") {
    const w = await getOrCreateWallet(reqData.uid);
    return { success: true, newBalanceVnd: w.balanceVnd, transactionId: "" };
  }
  if (reqData.status !== "pending") {
    throw new Error(`Yêu cầu nạp không thể duyệt (trạng thái: ${reqData.status}).`);
  }

  const amount = sanitizeVnd(reqData.amountVnd);
  const wallet = await getOrCreateWallet(reqData.uid);
  const newBalance = wallet.balanceVnd + amount;

  await setFirestoreRestDoc("wallets", reqData.uid, {
    ...wallet,
    balanceVnd: newBalance,
    totalCreditedVnd: wallet.totalCreditedVnd + amount,
    updatedAt: now,
  });

  await setFirestoreRestDoc("deposit_requests", requestId, {
    ...reqData,
    status: "approved",
    processedAt: now,
    processedBy: adminUid,
    processedByName: adminName,
    externalCollectionNote: externalCollectionNote || "Admin xác nhận thu tiền",
  });

  const ledgerEntry: WalletTransaction = {
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
    note: `Nạp tiền ảo qua yêu cầu #${requestId}: +${amount.toLocaleString("vi-VN")}đ`,
    createdAt: now,
  };
  await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);

  return { success: true, newBalanceVnd: newBalance, transactionId: txId };
}

export async function rejectDepositRequest(
  requestId: string,
  adminUid: string,
  adminName: string,
  reason: string
): Promise<DepositRequest> {
  if (!requestId) throw new Error("Mã yêu cầu nạp không hợp lệ.");
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Vui lòng nhập lý do từ chối yêu cầu.");

  const now = new Date().toISOString();

  if (adminDb) {
    const reqRef = adminDb.collection("deposit_requests").doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) throw new Error("Không tìm thấy yêu cầu nạp.");

    const data = snap.data() as DepositRequest;
    if (data.status !== "pending") {
      throw new Error(`Không thể từ chối yêu cầu ở trạng thái "${data.status}".`);
    }

    const updates: Partial<DepositRequest> = {
      status: "rejected",
      rejectionReason: cleanReason,
      processedAt: now,
      processedBy: adminUid,
      processedByName: adminName,
    };

    await reqRef.update(updates);
    return { ...data, ...updates };
  }

  const data = await getFirestoreRestDoc("deposit_requests", requestId);
  if (!data) throw new Error("Không tìm thấy yêu cầu nạp.");
  if (data.status !== "pending") {
    throw new Error(`Không thể từ chối yêu cầu ở trạng thái "${data.status}".`);
  }

  const updated: DepositRequest = {
    ...data,
    status: "rejected",
    rejectionReason: cleanReason,
    processedAt: now,
    processedBy: adminUid,
    processedByName: adminName,
  };
  await setFirestoreRestDoc("deposit_requests", requestId, updated);
  return updated;
}

// -------------------------------------------------------------
// 3. EXAM ACCESS & UNLOCK TRANSACTION
// -------------------------------------------------------------

export async function checkExamAccess(
  uid: string | null,
  examId: string,
  userRole?: string
): Promise<{
  hasAccess: boolean;
  isFree: boolean;
  unlocked: boolean;
  priceVnd: number;
  accessMode: "free" | "paid";
  salesEnabled: boolean;
  userBalance: number;
  missingVnd: number;
  canUnlock: boolean;
  examTitle: string;
  rejectionReason?: string;
  parentExamId?: string;
  parentExamTitle?: string;
  message?: string;
}> {
  if (!examId) throw new Error("Mã bài thi không hợp lệ.");

  // Fetch exam metadata
  let examData: Partial<Exam> | null = null;
  if (adminDb) {
    const snap = await adminDb.collection("exams").doc(examId).get();
    if (snap.exists) examData = snap.data() as Exam;
  } else {
    examData = await getFirestoreRestDoc("exams", examId);
  }

  if (!examData) {
    throw new Error("Không tìm thấy bài thi.");
  }

  const accessMode = (examData.accessMode as "free" | "paid") || "free";
  const priceVnd = sanitizeVnd(examData.priceVnd);
  const salesEnabled = examData.salesEnabled !== false;
  const isFree = accessMode === "free" || priceVnd <= 0;
  const examTitle = examData.title || "Bài thi";

  // Admins always have access
  if (userRole === "admin" || userRole === "super_admin") {
    return {
      hasAccess: true,
      isFree,
      unlocked: true,
      priceVnd,
      accessMode,
      salesEnabled,
      userBalance: 9999999,
      missingVnd: 0,
      canUnlock: true,
      examTitle,
    };
  }

  // ------------------------------------------------------------------
  // SECURITY CHECK: RETAKE / PERSONAL / DERIVED EXAMS LOCKDOWN
  // Ngăn chặn hoàn toàn việc lách luật đề trả phí qua tính năng Retake
  // ------------------------------------------------------------------
  const isPersonalRetakeExam = Boolean(
    (examData as any).isPersonalRetake === true ||
    (examData.isRetake && (examData as any).creatorRole === "student") ||
    (examData as any).isAggregatedReview === true
  );

  if (isPersonalRetakeExam) {
    // Collect all parent exams to inspect (supports single originalExamId or multi-source aggregated review)
    const parentExamIds: string[] = [];
    if ((examData as any).originalExamId) {
      parentExamIds.push((examData as any).originalExamId);
    }
    if (Array.isArray((examData as any).sourceExamIds)) {
      for (const sid of (examData as any).sourceExamIds) {
        if (sid && !parentExamIds.includes(sid)) parentExamIds.push(sid);
      }
    }

    // Determine if any source/original exam is paid
    let hasPaidSource = Boolean((examData as any).isDerivedFromPaidExam);
    const paidSources: { id: string; title: string; price: number }[] = [];

    for (const pId of parentExamIds) {
      let pData: any = null;
      if (adminDb) {
        const snap = await adminDb.collection("exams").doc(pId).get();
        if (snap.exists) pData = snap.data();
      } else {
        pData = await getFirestoreRestDoc("exams", pId);
      }
      if (pData) {
        const pPrice = sanitizeVnd(pData.priceVnd);
        const pMode = (pData.accessMode as "free" | "paid") || "free";
        if (pMode === "paid" || pPrice > 0) {
          hasPaidSource = true;
          paidSources.push({ id: pId, title: pData.title || "Đề thi gốc", price: pPrice });
        }
      }
    }

    // 1. If derived from paid exams, visitor MUST be authenticated
    if (hasPaidSource && !uid) {
      return {
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
        message: "Vui lòng đăng nhập để truy cập bài làm lại cá nhân.",
      };
    }

    // 2. Personal Ownership Gate (Chặn thí sinh khác dùng liên kết/mã đề làm lại của nhau)
    const creatorUid = (examData as any).creatorUid;
    const allowedUid = (examData as any).allowedUid;
    const creatorUsername = (examData as any).creatorUsername;

    if (uid && (creatorUid || allowedUid || creatorUsername)) {
      const uidMatches = Boolean(
        (creatorUid && uid === creatorUid) ||
        (allowedUid && uid === allowedUid)
      );

      let usernameMatches = false;
      if (creatorUsername) {
        let currentUsername = "";
        if (adminDb) {
          const uSnap = await adminDb.collection("users").doc(uid).get();
          if (uSnap.exists) currentUsername = (uSnap.data() as any)?.username || "";
        } else {
          const uDoc = await getFirestoreRestDoc("users", uid);
          if (uDoc) currentUsername = uDoc.username || "";
        }
        if (currentUsername && currentUsername.trim().toLowerCase() === creatorUsername.trim().toLowerCase()) {
          usernameMatches = true;
        }
      }

      // If owner is explicitly recorded and neither UID nor username matches:
      if ((creatorUid || allowedUid) && !uidMatches && !usernameMatches) {
        return {
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
          message: "Đây là bài làm lại cá nhân của thí sinh khác. Bạn không thể sử dụng mã đề hoặc liên kết này.",
        };
      }
    }

    // 3. Original Exam Entitlement Gate: Student must own all paid source/parent exams
    if (hasPaidSource && uid) {
      for (const p of paidSources) {
        const parentEntitlementId = `${uid}_${p.id}`;
        let parentEntitlement: ExamEntitlement | null = null;
        if (adminDb) {
          const peSnap = await adminDb.collection("exam_entitlements").doc(parentEntitlementId).get();
          if (peSnap.exists) parentEntitlement = peSnap.data() as ExamEntitlement;
        } else {
          parentEntitlement = await getFirestoreRestDoc("exam_entitlements", parentEntitlementId);
        }

        const isParentUnlocked = Boolean(parentEntitlement && parentEntitlement.status === "active");
        if (!isParentUnlocked) {
          const wallet = await getOrCreateWallet(uid);
          const userBalance = sanitizeVnd(wallet.balanceVnd);
          return {
            hasAccess: false,
            isFree: false,
            unlocked: false,
            priceVnd: p.price,
            accessMode: "paid",
            salesEnabled: false,
            userBalance,
            missingVnd: Math.max(0, p.price - userBalance),
            canUnlock: userBalance >= p.price,
            examTitle,
            parentExamId: p.id,
            parentExamTitle: p.title,
            rejectionReason: "parent_exam_locked",
            message: `Bài thi ôn tập/làm lại này thuộc về đề thi trả phí [${p.title}]. Bạn cần sở hữu đề thi gốc trước khi có thể làm bài!`,
          };
        }
      }
    }

    // If passed all personal retake verification checks, grant immediate access!
    return {
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
      parentExamId: (examData as any).originalExamId,
    };
  }

  // If free (and not blocked by retake rules), all authenticated students have access
  if (isFree) {
    return {
      hasAccess: true,
      isFree: true,
      unlocked: true,
      priceVnd: 0,
      accessMode: "free",
      salesEnabled,
      userBalance: 0,
      missingVnd: 0,
      canUnlock: true,
      examTitle,
    };
  }

  // If paid and unauthenticated
  if (!uid) {
    return {
      hasAccess: false,
      isFree: false,
      unlocked: false,
      priceVnd,
      accessMode: "paid",
      salesEnabled,
      userBalance: 0,
      missingVnd: priceVnd,
      canUnlock: false,
      examTitle,
    };
  }

  // Check entitlement: document ID format: `${uid}_${examId}`
  const entitlementId = `${uid}_${examId}`;
  let entitlement: ExamEntitlement | null = null;

  if (adminDb) {
    const entSnap = await adminDb.collection("exam_entitlements").doc(entitlementId).get();
    if (entSnap.exists) entitlement = entSnap.data() as ExamEntitlement;
  } else {
    entitlement = await getFirestoreRestDoc("exam_entitlements", entitlementId);
  }

  const isUnlocked = Boolean(entitlement && entitlement.status === "active");

  const wallet = await getOrCreateWallet(uid);
  const userBalance = sanitizeVnd(wallet.balanceVnd);
  const missingVnd = Math.max(0, priceVnd - userBalance);
  const canUnlock = userBalance >= priceVnd;

  return {
    hasAccess: isUnlocked,
    isFree: false,
    unlocked: isUnlocked,
    priceVnd,
    accessMode: "paid",
    salesEnabled,
    userBalance,
    missingVnd,
    canUnlock,
    examTitle,
  };
}

export async function unlockExam(
  uid: string,
  examId: string,
  idempotencyKey?: string
): Promise<{
  success: boolean;
  newBalanceVnd: number;
  entitlement: ExamEntitlement;
  alreadyUnlocked?: boolean;
}> {
  if (!uid) throw new Error("Chưa đăng nhập.");
  if (!examId) throw new Error("Mã bài thi không hợp lệ.");

  const entitlementId = `${uid}_${examId}`;
  const now = new Date().toISOString();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (adminDb) {
    return await adminDb.runTransaction(async (transaction) => {
      // 1. Read exam
      const examRef = adminDb.collection("exams").doc(examId);
      const examDoc = await transaction.get(examRef);
      if (!examDoc.exists) throw new Error("Không tìm thấy bài thi.");

      const examData = examDoc.data() as Exam;
      const accessMode = (examData.accessMode as "free" | "paid") || "free";
      const priceVnd = sanitizeVnd(examData.priceVnd);
      const salesEnabled = examData.salesEnabled !== false;

      if (accessMode === "free" || priceVnd <= 0) {
        // Free exam doesn't require payment, create entitlement record for free
        const entRef = adminDb.collection("exam_entitlements").doc(entitlementId);
        const freeEnt: ExamEntitlement = {
          id: entitlementId,
          uid,
          examId,
          status: "active",
          source: "free_migration",
          pricePaidVnd: 0,
          grantedAt: now,
          examTitleSnapshot: examData.title,
        };
        transaction.set(entRef, freeEnt, { merge: true });
        const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
        const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
        return { success: true, newBalanceVnd: bal, entitlement: freeEnt, alreadyUnlocked: true };
      }

      if (!salesEnabled) {
        throw new Error("Bài thi hiện đang tạm ngừng bán quyền truy cập.");
      }

      // 2. Check entitlement
      const entRef = adminDb.collection("exam_entitlements").doc(entitlementId);
      const entDoc = await transaction.get(entRef);
      if (entDoc.exists) {
        const entData = entDoc.data() as ExamEntitlement;
        if (entData.status === "active") {
          // Idempotent: already unlocked!
          const wDoc = await transaction.get(adminDb.collection("wallets").doc(uid));
          const bal = wDoc.exists ? sanitizeVnd(wDoc.data()?.balanceVnd) : 0;
          return { success: true, newBalanceVnd: bal, entitlement: entData, alreadyUnlocked: true };
        }
      }

      // 3. Check wallet balance
      const walletRef = adminDb.collection("wallets").doc(uid);
      const walletDoc = await transaction.get(walletRef);
      let currentBal = 0;
      let totalSpent = 0;
      let totalCredited = 0;
      let fullName = "";
      let currentClass = "";

      if (walletDoc.exists) {
        const w = walletDoc.data() as StudentWallet;
        currentBal = sanitizeVnd(w.balanceVnd);
        totalSpent = sanitizeVnd(w.totalSpentVnd);
        totalCredited = sanitizeVnd(w.totalCreditedVnd);
        fullName = w.fullName || "";
        currentClass = w.currentClass || "";
      }

      if (currentBal < priceVnd) {
        throw new Error(
          `Số dư không đủ để mở khóa đề thi. Cần ${priceVnd.toLocaleString("vi-VN")}đ, hiện có ${currentBal.toLocaleString("vi-VN")}đ (thiếu ${(priceVnd - currentBal).toLocaleString("vi-VN")}đ).`
        );
      }

      const newBalance = currentBal - priceVnd;
      const newTotalSpent = totalSpent + priceVnd;

      // 4. Deduct wallet
      transaction.set(
        walletRef,
        {
          uid,
          balanceVnd: newBalance,
          totalSpentVnd: newTotalSpent,
          totalCreditedVnd: totalCredited,
          updatedAt: now,
        },
        { merge: true }
      );

      // 5. Create entitlement
      const entitlement: ExamEntitlement = {
        id: entitlementId,
        uid,
        examId,
        status: "active",
        source: "purchase",
        pricePaidVnd: priceVnd,
        transactionId: txId,
        grantedAt: now,
        grantedBy: uid,
        examTitleSnapshot: examData.title || "Bài thi",
      };
      transaction.set(entRef, entitlement);

      // 6. Record transaction ledger
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const ledgerEntry: WalletTransaction = {
        id: txId,
        uid,
        type: "exam_unlock_debit",
        amountVnd: priceVnd,
        balanceBeforeVnd: currentBal,
        balanceAfterVnd: newBalance,
        examId,
        examTitleSnapshot: examData.title || "Bài thi",
        idempotencyKey: idempotencyKey || txId,
        actorUid: uid,
        actorName: fullName || "Thí sinh",
        note: `Mở khóa vĩnh viễn bài thi "${examData.title}": -${priceVnd.toLocaleString("vi-VN")}đ`,
        createdAt: now,
      };
      transaction.set(txRef, ledgerEntry);

      return {
        success: true,
        newBalanceVnd: newBalance,
        entitlement,
      };
    });
  }

  // REST fallback
  const examData = await getFirestoreRestDoc("exams", examId);
  if (!examData) throw new Error("Không tìm thấy bài thi.");
  const priceVnd = sanitizeVnd(examData.priceVnd);

  const existingEnt = await getFirestoreRestDoc("exam_entitlements", entitlementId);
  if (existingEnt && existingEnt.status === "active") {
    const w = await getOrCreateWallet(uid);
    return { success: true, newBalanceVnd: w.balanceVnd, entitlement: existingEnt, alreadyUnlocked: true };
  }

  const wallet = await getOrCreateWallet(uid);
  if (wallet.balanceVnd < priceVnd) {
    throw new Error(`Số dư không đủ để mở khóa đề thi.`);
  }

  const newBalance = wallet.balanceVnd - priceVnd;
  await setFirestoreRestDoc("wallets", uid, {
    ...wallet,
    balanceVnd: newBalance,
    totalSpentVnd: wallet.totalSpentVnd + priceVnd,
    updatedAt: now,
  });

  const entitlement: ExamEntitlement = {
    id: entitlementId,
    uid,
    examId,
    status: "active",
    source: "purchase",
    pricePaidVnd: priceVnd,
    transactionId: txId,
    grantedAt: now,
    grantedBy: uid,
    examTitleSnapshot: examData.title,
  };
  await setFirestoreRestDoc("exam_entitlements", entitlementId, entitlement);

  const ledgerEntry: WalletTransaction = {
    id: txId,
    uid,
    type: "exam_unlock_debit",
    amountVnd: priceVnd,
    balanceBeforeVnd: wallet.balanceVnd,
    balanceAfterVnd: newBalance,
    examId,
    examTitleSnapshot: examData.title,
    actorUid: uid,
    note: `Mở khóa đề thi "${examData.title}"`,
    createdAt: now,
  };
  await setFirestoreRestDoc("wallet_transactions", txId, ledgerEntry);

  return { success: true, newBalanceVnd: newBalance, entitlement };
}

// -------------------------------------------------------------
// 4. MANUAL CASH COLLECTION & DEBT MANAGEMENT (ADMIN)
// -------------------------------------------------------------

export async function recordManualCashCollection(
  adminUid: string,
  adminName: string,
  studentUid: string,
  data: {
    amountVnd: number;
    collectionDate?: string;
    paymentMethod?: string; // "Tiền mặt" | "Chuyển khoản" | "Khác"
    referenceCode?: string;
    note?: string;
    creditToWallet?: boolean; // If true, also adds to wallet balance
  }
): Promise<{ success: boolean; debtRecordId: string; newBalanceVnd?: number }> {
  const amount = sanitizeVnd(data.amountVnd);
  if (amount <= 0) throw new Error("Số tiền thu phải lớn hơn 0đ.");

  const now = new Date().toISOString();
  const collDate = data.collectionDate || now;
  const paymentMethod = data.paymentMethod || "Tiền mặt";
  const note = String(data.note || "").trim();

  const wallet = await getOrCreateWallet(studentUid);
  const recordId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (adminDb) {
    // 1. Look for unpaid receivables for this student to allocate against
    const receivablesSnap = await adminDb
      .collection("debt_records")
      .where("uid", "==", studentUid)
      .get();

    const unpaidDocs = receivablesSnap.docs
      .filter((d) => {
        const status = d.data().status;
        return status === "unpaid" || status === "partial";
      })
      .sort((a, b) => {
        const tA = new Date(a.data().createdAt || 0).getTime();
        const tB = new Date(b.data().createdAt || 0).getTime();
        return tA - tB;
      });

    let remainingToAllocate = amount;
    const batch = adminDb.batch();

    for (const doc of unpaidDocs) {
      if (remainingToAllocate <= 0) break;
      const rec = doc.data() as DebtRecord;
      const currentRemaining = sanitizeVnd(rec.remainingVnd);
      if (currentRemaining <= 0) continue;

      const allocation = Math.min(remainingToAllocate, currentRemaining);
      const newRemaining = currentRemaining - allocation;
      const newCollected = sanitizeVnd(rec.collectedVnd) + allocation;
      const newStatus = newRemaining === 0 ? "paid" : "partial";

      batch.update(doc.ref, {
        collectedVnd: newCollected,
        remainingVnd: newRemaining,
        status: newStatus,
        updatedAt: now,
      });

      remainingToAllocate -= allocation;
    }

    // 2. If creditToWallet is requested OR surplus remains, credit wallet
    let newBal = wallet.balanceVnd;
    if (data.creditToWallet) {
      newBal = wallet.balanceVnd + amount;
      const walletRef = adminDb.collection("wallets").doc(studentUid);
      batch.update(walletRef, {
        balanceVnd: newBal,
        totalCreditedVnd: sanitizeVnd(wallet.totalCreditedVnd) + amount,
        updatedAt: now,
      });

      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txEntry: WalletTransaction = {
        id: txId,
        uid: studentUid,
        type: "deposit_credit",
        amountVnd: amount,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: newBal,
        actorUid: adminUid,
        actorName: adminName,
        note: `Thu tiền thực tế (${paymentMethod}): +${amount.toLocaleString("vi-VN")}đ vào ví. ${note}`,
        createdAt: now,
      };
      batch.set(txRef, txEntry);
    } else {
      // Record payment transaction without altering wallet balance
      const txRef = adminDb.collection("wallet_transactions").doc(txId);
      const txEntry: WalletTransaction = {
        id: txId,
        uid: studentUid,
        type: "debt_payment",
        amountVnd: amount,
        balanceBeforeVnd: wallet.balanceVnd,
        balanceAfterVnd: wallet.balanceVnd,
        actorUid: adminUid,
        actorName: adminName,
        note: `Ghi nhận thu tiền ngoài đời (${paymentMethod}): ${amount.toLocaleString("vi-VN")}đ. ${note}`,
        createdAt: now,
      };
      batch.set(txRef, txEntry);
    }

    // 3. Record debt record for audit
    const debtRef = adminDb.collection("debt_records").doc(recordId);
    const debtEntry: DebtRecord = {
      id: recordId,
      uid: studentUid,
      studentNameSnapshot: wallet.fullName || "",
      studentClassSnapshot: wallet.currentClass || "",
      type: "manual_receivable",
      amountVnd: amount,
      collectedVnd: amount,
      allocatedVnd: amount - remainingToAllocate,
      remainingVnd: 0,
      adjustedVnd: 0,
      transactionId: txId,
      status: "paid",
      note: `Ghi nhận thu trực tiếp: ${paymentMethod}${data.referenceCode ? ` (Mã: ${data.referenceCode})` : ""}. ${note}`,
      createdAt: collDate,
      updatedAt: now,
    };
    batch.set(debtRef, debtEntry);

    await batch.commit();
    return { success: true, debtRecordId: recordId, newBalanceVnd: newBal };
  }

  // REST fallback mode
  const allDebts = await getFirestoreRestDocs("debt_records", 100);
  const studentDebts = (allDebts as DebtRecord[]).filter((d) => d.uid === studentUid && (d.status === "unpaid" || d.status === "partial"));
  studentDebts.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

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
      updatedAt: now,
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
      updatedAt: now,
    });

    const txEntry: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "deposit_credit",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: newBal,
      actorUid: adminUid,
      actorName: adminName,
      note: `Thu tiền thực tế (${paymentMethod}): +${amount.toLocaleString("vi-VN")}đ vào ví. ${note}`,
      createdAt: now,
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txEntry);
  } else {
    const txEntry: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "debt_payment",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      actorUid: adminUid,
      actorName: adminName,
      note: `Ghi nhận thu tiền ngoài đời (${paymentMethod}): ${amount.toLocaleString("vi-VN")}đ. ${note}`,
      createdAt: now,
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txEntry);
  }

  const debtEntry: DebtRecord = {
    id: recordId,
    uid: studentUid,
    studentNameSnapshot: wallet.fullName || "",
    studentClassSnapshot: wallet.currentClass || "",
    type: "manual_receivable",
    amountVnd: amount,
    collectedVnd: amount,
    allocatedVnd: amount - remainingToAllocate,
    remainingVnd: 0,
    adjustedVnd: 0,
    transactionId: txId,
    status: "paid",
    note: `Ghi nhận thu trực tiếp: ${paymentMethod}${data.referenceCode ? ` (Mã: ${data.referenceCode})` : ""}. ${note}`,
    createdAt: collDate,
    updatedAt: now,
  };
  await setFirestoreRestDoc("debt_records", recordId, debtEntry);

  return { success: true, debtRecordId: recordId, newBalanceVnd: newBal };
}

export async function adjustStudentDebt(
  adminUid: string,
  adminName: string,
  studentUid: string,
  data: {
    amountVnd: number;
    type: "increase" | "decrease";
    reason: string;
  }
): Promise<{ success: boolean; recordId: string }> {
  const amount = sanitizeVnd(data.amountVnd);
  if (amount <= 0) throw new Error("Số tiền điều chỉnh phải lớn hơn 0đ.");
  const reason = String(data.reason || "").trim();
  if (!reason) throw new Error("Vui lòng nhập lý do điều chỉnh công nợ.");

  const wallet = await getOrCreateWallet(studentUid);
  const now = new Date().toISOString();
  const recordId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (adminDb) {
    const batch = adminDb.batch();
    const debtRef = adminDb.collection("debt_records").doc(recordId);

    const debtDoc: DebtRecord = {
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
      note: `Điều chỉnh công nợ (${data.type === "increase" ? "Tăng nợ" : "Giảm nợ/Xoá nợ"}): ${reason}`,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(debtRef, debtDoc);

    const txRef = adminDb.collection("wallet_transactions").doc(txId);
    const txDoc: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "debt_adjustment",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      actorUid: adminUid,
      actorName: adminName,
      note: `Điều chỉnh nợ ${data.type === "increase" ? "+" : "-"}${amount.toLocaleString("vi-VN")}đ: ${reason}`,
      createdAt: now,
    };
    batch.set(txRef, txDoc);

    await batch.commit();
  } else {
    // REST fallback mode
    const debtDoc: DebtRecord = {
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
      note: `Điều chỉnh công nợ (${data.type === "increase" ? "Tăng nợ" : "Giảm nợ/Xoá nợ"}): ${reason}`,
      createdAt: now,
      updatedAt: now,
    };
    await setFirestoreRestDoc("debt_records", recordId, debtDoc);

    const txDoc: WalletTransaction = {
      id: txId,
      uid: studentUid,
      type: "debt_adjustment",
      amountVnd: amount,
      balanceBeforeVnd: wallet.balanceVnd,
      balanceAfterVnd: wallet.balanceVnd,
      actorUid: adminUid,
      actorName: adminName,
      note: `Điều chỉnh nợ ${data.type === "increase" ? "+" : "-"}${amount.toLocaleString("vi-VN")}đ: ${reason}`,
      createdAt: now,
    };
    await setFirestoreRestDoc("wallet_transactions", txId, txDoc);
  }

  return { success: true, recordId };
}

export async function grantOrRevokeExamEntitlement(
  adminUid: string,
  adminName: string,
  studentUid: string,
  examId: string,
  action: "grant" | "revoke",
  reason: string
): Promise<{ success: boolean; entitlement: ExamEntitlement }> {
  if (!studentUid) throw new Error("Chưa chỉ định học sinh.");
  if (!examId) throw new Error("Chưa chỉ định bài thi.");
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("Vui lòng nhập lý do cấp/thu hồi quyền truy cập.");

  const entitlementId = `${studentUid}_${examId}`;
  const now = new Date().toISOString();

  let examTitle = "Bài thi";
  if (adminDb) {
    const eSnap = await adminDb.collection("exams").doc(examId).get();
    if (eSnap.exists) examTitle = eSnap.data()?.title || examTitle;
  }

  const entitlement: ExamEntitlement = {
    id: entitlementId,
    uid: studentUid,
    examId,
    status: action === "grant" ? "active" : "revoked",
    source: "admin_grant",
    pricePaidVnd: 0,
    grantedAt: now,
    grantedBy: adminUid,
    examTitleSnapshot: examTitle,
  };

  if (adminDb) {
    await adminDb.collection("exam_entitlements").doc(entitlementId).set(entitlement, { merge: true });

    // Record transaction entry for audit
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const txRef = adminDb.collection("wallet_transactions").doc(txId);
    const wallet = await getOrCreateWallet(studentUid);
    const txDoc: WalletTransaction = {
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
      note: `${action === "grant" ? "Cấp quyền truy cập thủ công" : "Thu hồi quyền truy cập"} đề thi "${examTitle}": ${cleanReason}`,
      createdAt: now,
    };
    await txRef.set(txDoc);
  } else {
    await setFirestoreRestDoc("exam_entitlements", entitlementId, entitlement);
  }

  return { success: true, entitlement };
}

// -------------------------------------------------------------
// 5. ADMIN OVERVIEW & DEBT LIST REPORTING
// -------------------------------------------------------------

export async function getWalletOverview(): Promise<{
  totalWallets: number;
  totalVirtualBalanceVnd: number;
  totalConfirmedCreditedVnd: number;
  totalUnlockedSpendingVnd: number;
  pendingRequestsTotalVnd: number;
  pendingRequestsCount: number;
  totalOutstandingDebtVnd: number;
  studentsInDebtCount: number;
  recentRequests: DepositRequest[];
}> {
  let totalWallets = 0;
  let totalVirtualBalanceVnd = 0;
  let totalConfirmedCreditedVnd = 0;
  let totalUnlockedSpendingVnd = 0;
  let pendingRequestsTotalVnd = 0;
  let pendingRequestsCount = 0;
  let totalOutstandingDebtVnd = 0;
  let studentsInDebtCount = 0;
  let recentRequests: DepositRequest[] = [];

  if (adminDb) {
    // 1. Wallets aggregate
    const walletsSnap = await adminDb.collection("wallets").get();
    totalWallets = walletsSnap.size;
    walletsSnap.docs.forEach((doc) => {
      const w = doc.data() as StudentWallet;
      totalVirtualBalanceVnd += sanitizeVnd(w.balanceVnd);
      totalConfirmedCreditedVnd += sanitizeVnd(w.totalCreditedVnd);
      totalUnlockedSpendingVnd += sanitizeVnd(w.totalSpentVnd);
    });

    // 2. Pending requests
    const pendingSnap = await adminDb
      .collection("deposit_requests")
      .where("status", "==", "pending")
      .get();
    pendingRequestsCount = pendingSnap.size;
    pendingSnap.docs.forEach((doc) => {
      pendingRequestsTotalVnd += sanitizeVnd(doc.data().amountVnd);
    });

    // 3. Recent requests
    const recentSnap = await adminDb
      .collection("deposit_requests")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    recentRequests = recentSnap.docs.map((d) => d.data() as DepositRequest);

    // 4. Debt records
    const debtsSnap = await adminDb
      .collection("debt_records")
      .where("status", "in", ["unpaid", "partial"])
      .get();
    const studentsInDebtSet = new Set<string>();
    debtsSnap.docs.forEach((d) => {
      const rec = d.data() as DebtRecord;
      const rem = sanitizeVnd(rec.remainingVnd);
      if (rem > 0) {
        totalOutstandingDebtVnd += rem;
        studentsInDebtSet.add(rec.uid);
      }
    });
    studentsInDebtCount = studentsInDebtSet.size;
  } else {
    // REST fallback mode
    const [wallets, reqs, debts] = await Promise.all([
      getFirestoreRestDocs("wallets", 100),
      getFirestoreRestDocs("deposit_requests", 100),
      getFirestoreRestDocs("debt_records", 100),
    ]);

    totalWallets = wallets.length;
    wallets.forEach((w: any) => {
      totalVirtualBalanceVnd += sanitizeVnd(w.balanceVnd);
      totalConfirmedCreditedVnd += sanitizeVnd(w.totalCreditedVnd);
      totalUnlockedSpendingVnd += sanitizeVnd(w.totalSpentVnd);
    });

    const pendingReqs = (reqs as DepositRequest[]).filter((r) => r.status === "pending");
    pendingRequestsCount = pendingReqs.length;
    pendingReqs.forEach((r) => {
      pendingRequestsTotalVnd += sanitizeVnd(r.amountVnd);
    });

    const sortedReqs = [...(reqs as DepositRequest[])].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    recentRequests = sortedReqs.slice(0, 10);

    const studentsInDebtSet = new Set<string>();
    (debts as DebtRecord[]).forEach((rec) => {
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

  return {
    totalWallets,
    totalVirtualBalanceVnd,
    totalConfirmedCreditedVnd,
    totalUnlockedSpendingVnd,
    pendingRequestsTotalVnd,
    pendingRequestsCount,
    totalOutstandingDebtVnd,
    studentsInDebtCount,
    recentRequests,
  };
}

export async function getStudentDebtSummaries(options?: {
  search?: string;
  filterStatus?: "all" | "in_debt" | "paid" | "has_credit";
  className?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  items: StudentDebtSummary[];
  total: number;
}> {
  let walletsList: StudentWallet[] = [];
  let debtsList: DebtRecord[] = [];
  let entsList: ExamEntitlement[] = [];
  const userMap = new Map<string, { username: string; email: string; displayName: string }>();

  if (adminDb) {
    const [walletsSnap, debtsSnap, entsSnap, usersSnap] = await Promise.all([
      adminDb.collection("wallets").get(),
      adminDb.collection("debt_records").get(),
      adminDb.collection("exam_entitlements").where("status", "==", "active").get(),
      adminDb.collection("users").get(),
    ]);
    walletsList = walletsSnap.docs.map((d) => d.data() as StudentWallet);
    debtsList = debtsSnap.docs.map((d) => d.data() as DebtRecord);
    entsList = entsSnap.docs.map((d) => d.data() as ExamEntitlement);
    usersSnap.docs.forEach((d) => {
      const u = d.data();
      userMap.set(d.id, {
        username: u.username || "",
        email: u.email || "",
        displayName: u.displayName || u.fullName || "",
      });
    });
  } else {
    // REST fallback mode
    const [wallets, debts, ents, users] = await Promise.all([
      getFirestoreRestDocs("wallets", 100),
      getFirestoreRestDocs("debt_records", 100),
      getFirestoreRestDocs("exam_entitlements", 100),
      getFirestoreRestDocs("users", 100),
    ]);
    walletsList = wallets as StudentWallet[];
    debtsList = debts as DebtRecord[];
    entsList = (ents as ExamEntitlement[]).filter((e) => e.status === "active");
    (users as any[]).forEach((u) => {
      const uid = u.id || u.uid;
      if (uid) {
        userMap.set(uid, {
          username: u.username || "",
          email: u.email || "",
          displayName: u.displayName || u.fullName || "",
        });
      }
    });
  }

  // Aggregate student debts
  const debtByUid = new Map<
    string,
    { totalReceivable: number; totalCollected: number; remainingDebt: number }
  >();

  debtsList.forEach((rec) => {
    const uid = rec.uid;
    if (!debtByUid.has(uid)) {
      debtByUid.set(uid, { totalReceivable: 0, totalCollected: 0, remainingDebt: 0 });
    }
    const curr = debtByUid.get(uid)!;
    curr.totalReceivable += sanitizeVnd(rec.amountVnd);
    curr.totalCollected += sanitizeVnd(rec.collectedVnd);
    curr.remainingDebt += Math.max(0, sanitizeVnd(rec.remainingVnd));
  });

  // Aggregate unlocks count
  const unlocksByUid = new Map<string, number>();
  entsList.forEach((d) => {
    const uid = d.uid;
    unlocksByUid.set(uid, (unlocksByUid.get(uid) || 0) + 1);
  });

  let summaries: StudentDebtSummary[] = [];

  walletsList.forEach((w) => {
    const debtInfo = debtByUid.get(w.uid) || {
      totalReceivable: 0,
      totalCollected: 0,
      remainingDebt: 0,
    };

    let debtStatus: "in_debt" | "paid" | "has_credit" = "paid";
    if (debtInfo.remainingDebt > 0) {
      debtStatus = "in_debt";
    } else if (w.balanceVnd > 0) {
      debtStatus = "has_credit";
    }

    const userInfo = userMap.get(w.uid);

    summaries.push({
      uid: w.uid,
      fullName: w.fullName || userInfo?.displayName || "Chưa cập nhật",
      studentClass: w.currentClass || "—",
      currentClass: w.currentClass || "—",
      username: userInfo?.username || "",
      email: userInfo?.email || "",
      verifiedName: (w as any).verifiedName || w.fullName || "",
      isVerified: Boolean((w as any).isVerified),
      balanceVnd: sanitizeVnd(w.balanceVnd),
      totalReceivableVnd: debtInfo.totalReceivable,
      totalReceivablesVnd: debtInfo.totalReceivable,
      totalCollectedVnd: debtInfo.totalCollected,
      totalAdjustmentsVnd: 0,
      totalAdjustedVnd: 0,
      remainingDebtVnd: debtInfo.remainingDebt,
      totalPurchasesCount: unlocksByUid.get(w.uid) || 0,
      debtStatus,
      lastActivityAt: w.updatedAt || w.createdAt,
    });
  });

  // Filter
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
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.verifiedName && s.verifiedName.toLowerCase().includes(q)) ||
        s.studentClass.toLowerCase().includes(q) ||
        s.uid.toLowerCase().includes(q)
    );
  }

  // Mandatory Sort: Remaining debt descending (students owing most come first!)
  summaries.sort((a, b) => {
    if (b.remainingDebtVnd !== a.remainingDebtVnd) {
      return b.remainingDebtVnd - a.remainingDebtVnd;
    }
    return b.balanceVnd - a.balanceVnd;
  });

  const total = summaries.length;
  const offset = options?.offset || 0;
  const limitCount = options?.limit || 50;
  const paged = summaries.slice(offset, offset + limitCount);

  return { items: paged, total };
}

export async function getStudentWalletDetails(studentUid: string): Promise<{
  wallet: StudentWallet;
  studentProfile?: any;
  transactions: WalletTransaction[];
  depositRequests: DepositRequest[];
  entitlements: ExamEntitlement[];
  debtRecords: DebtRecord[];
}> {
  if (!studentUid) throw new Error("Chưa chỉ định học sinh.");

  const wallet = await getOrCreateWallet(studentUid);

  let transactions: WalletTransaction[] = [];
  let depositRequests: DepositRequest[] = [];
  let entitlements: ExamEntitlement[] = [];
  let debtRecords: DebtRecord[] = [];
  let studentProfile: any = null;

  if (adminDb) {
    const [txSnap, reqSnap, entSnap, debtSnap, uDoc, sDoc] = await Promise.all([
      adminDb
        .collection("wallet_transactions")
        .where("uid", "==", studentUid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),
      adminDb
        .collection("deposit_requests")
        .where("uid", "==", studentUid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),
      adminDb
        .collection("exam_entitlements")
        .where("uid", "==", studentUid)
        .orderBy("grantedAt", "desc")
        .limit(50)
        .get(),
      adminDb
        .collection("debt_records")
        .where("uid", "==", studentUid)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),
      adminDb.collection("users").doc(studentUid).get(),
      adminDb.collection("students").doc(studentUid).get(),
    ]);

    transactions = txSnap.docs.map((d) => d.data() as WalletTransaction);
    depositRequests = reqSnap.docs.map((d) => d.data() as DepositRequest);
    entitlements = entSnap.docs.map((d) => d.data() as ExamEntitlement);
    debtRecords = debtSnap.docs.map((d) => d.data() as DebtRecord);

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
      lastActive: uData?.lastLogin || uData?.updatedAt || wallet.updatedAt,
    };
  } else {
    // REST fallback mode
    const [allTxs, allReqs, allEnts, allDebts, uData, sData] = await Promise.all([
      getFirestoreRestDocs("wallet_transactions", 100),
      getFirestoreRestDocs("deposit_requests", 100),
      getFirestoreRestDocs("exam_entitlements", 100),
      getFirestoreRestDocs("debt_records", 100),
      getFirestoreRestDoc("users", studentUid),
      getFirestoreRestDoc("students", studentUid),
    ]);

    transactions = (allTxs as WalletTransaction[])
      .filter((t) => t.uid === studentUid)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50);

    depositRequests = (allReqs as DepositRequest[])
      .filter((r) => r.uid === studentUid)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50);

    entitlements = (allEnts as ExamEntitlement[])
      .filter((e) => e.uid === studentUid)
      .sort((a, b) => new Date(b.grantedAt || 0).getTime() - new Date(a.grantedAt || 0).getTime())
      .slice(0, 50);

    debtRecords = (allDebts as DebtRecord[])
      .filter((d) => d.uid === studentUid)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 50);

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
      lastActive: uData?.lastLogin || uData?.updatedAt || wallet.updatedAt,
    };
  }

  return {
    wallet,
    studentProfile,
    transactions,
    depositRequests,
    entitlements,
    debtRecords,
  };
}

export async function getDepositRequests(options?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<DepositRequest[]> {
  let list: DepositRequest[] = [];

  if (adminDb) {
    let q = adminDb.collection("deposit_requests") as FirebaseFirestore.Query;
    if (options?.status && options.status !== "all") {
      q = q.where("status", "==", options.status);
    }
    q = q.orderBy("createdAt", "desc").limit(options?.limit || 50);

    const snap = await q.get();
    list = snap.docs.map((d) => d.data() as DepositRequest);
  } else {
    // REST fallback mode
    const docs = await getFirestoreRestDocs("deposit_requests", 100);
    list = docs as DepositRequest[];
    if (options?.status && options.status !== "all") {
      list = list.filter((r) => r.status === options.status);
    }
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (options?.limit) {
      list = list.slice(0, options.limit);
    }
  }

  if (options?.search) {
    const term = options.search.toLowerCase().trim();
    list = list.filter(
      (r) =>
        (r.studentNameSnapshot || "").toLowerCase().includes(term) ||
        (r.studentClassSnapshot || "").toLowerCase().includes(term) ||
        (r.id || "").toLowerCase().includes(term) ||
        (r.uid || "").toLowerCase().includes(term)
    );
  }

  return list;
}

export async function getStudentTransactions(uid: string, limitCount = 30): Promise<WalletTransaction[]> {
  if (adminDb) {
    const snap = await adminDb
      .collection("wallet_transactions")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snap.docs.map((d) => d.data() as WalletTransaction);
  }

  // REST fallback mode
  const docs = await getFirestoreRestDocs("wallet_transactions", 100);
  const filtered = (docs as WalletTransaction[]).filter((d) => d.uid === uid);
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return filtered.slice(0, limitCount);
}

export async function getStudentDepositRequests(uid: string, limitCount = 30): Promise<DepositRequest[]> {
  if (adminDb) {
    const snap = await adminDb
      .collection("deposit_requests")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snap.docs.map((d) => d.data() as DepositRequest);
  }

  // REST fallback mode
  const docs = await getFirestoreRestDocs("deposit_requests", 100);
  const filtered = (docs as DepositRequest[]).filter((d) => d.uid === uid);
  filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return filtered.slice(0, limitCount);
}

export async function updateStudentWalletProfile(
  studentUid: string,
  data: {
    verifiedName?: string;
    isVerified?: boolean;
    fullName?: string;
    currentClass?: string;
    adminUid?: string;
  }
): Promise<StudentWallet> {
  if (!studentUid) throw new Error("Chưa chỉ định học sinh.");
  const wallet = await getOrCreateWallet(studentUid);
  const now = new Date().toISOString();

  const updateFields: Partial<StudentWallet> = {
    updatedAt: now,
  };
  if (data.fullName !== undefined) updateFields.fullName = String(data.fullName).trim();
  if (data.currentClass !== undefined) updateFields.currentClass = String(data.currentClass).trim();
  if (data.verifiedName !== undefined) (updateFields as any).verifiedName = String(data.verifiedName).trim();
  if (data.isVerified !== undefined) {
    (updateFields as any).isVerified = Boolean(data.isVerified);
    if (data.isVerified) {
      (updateFields as any).verifiedAt = now;
      if (data.adminUid) (updateFields as any).verifiedBy = data.adminUid;
    }
  }

  const updatedWallet: StudentWallet = {
    ...wallet,
    ...updateFields,
  };

  if (adminDb) {
    await adminDb.collection("wallets").doc(studentUid).set(updatedWallet, { merge: true });
  } else {
    await setFirestoreRestDoc("wallets", studentUid, updatedWallet);
  }

  return updatedWallet;
}

export async function syncStudentsToWallets(): Promise<{
  totalStudents: number;
  createdCount: number;
  updatedCount: number;
}> {
  let createdCount = 0;
  let updatedCount = 0;
  const studentsMap = new Map<string, { uid: string; displayName: string; username: string; studentClass: string }>();

  if (adminDb) {
    // 1. Quét collection users với role === 'student'
    const usersSnap = await adminDb.collection("users").get();
    usersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const role = data.role || "student";
      if (role === "student" || !role) {
        studentsMap.set(doc.id, {
          uid: doc.id,
          displayName: data.displayName || data.fullName || data.name || data.username || "",
          username: data.username || "",
          studentClass: data.studentClass || data.class || "",
        });
      }
    });

    // 2. Quét collection students
    const studentsSnap = await adminDb.collection("students").get();
    studentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const uid = doc.id;
      if (!studentsMap.has(uid)) {
        studentsMap.set(uid, {
          uid,
          displayName: data.displayName || data.fullName || data.name || data.username || "",
          username: data.username || "",
          studentClass: data.studentClass || data.class || "",
        });
      } else {
        const curr = studentsMap.get(uid)!;
        if (!curr.displayName && (data.displayName || data.fullName)) {
          curr.displayName = data.displayName || data.fullName;
        }
        if (!curr.studentClass && data.studentClass) {
          curr.studentClass = data.studentClass;
        }
      }
    });

    // 3. Quét các ví hiện có
    const walletsSnap = await adminDb.collection("wallets").get();
    const existingWallets = new Map<string, StudentWallet>();
    walletsSnap.docs.forEach((doc) => {
      existingWallets.set(doc.id, doc.data() as StudentWallet);
    });

    const now = new Date().toISOString();
    const batch = adminDb.batch();
    let opCount = 0;

    for (const [uid, student] of studentsMap.entries()) {
      const existing = existingWallets.get(uid);
      if (!existing) {
        // Tạo mới ví cho học sinh
        const newWallet: StudentWallet = {
          uid,
          balanceVnd: 0,
          totalCreditedVnd: 0,
          totalSpentVnd: 0,
          profileCompleted: Boolean(student.displayName && student.studentClass),
          fullName: student.displayName || student.username || `Học sinh #${uid.slice(0, 5)}`,
          currentClass: student.studentClass || "",
          verifiedName: student.displayName || "",
          isVerified: false,
          createdAt: now,
          updatedAt: now,
        } as any;
        batch.set(adminDb.collection("wallets").doc(uid), newWallet);
        createdCount++;
        opCount++;
      } else {
        // Cập nhật thông tin nếu thiếu
        let needUpdate = false;
        const updates: Partial<StudentWallet> = { updatedAt: now };
        if (!existing.fullName && student.displayName) {
          updates.fullName = student.displayName;
          needUpdate = true;
        }
        if (!existing.currentClass && student.studentClass) {
          updates.currentClass = student.studentClass;
          needUpdate = true;
        }
        if (!(existing as any).verifiedName && (existing.fullName || student.displayName)) {
          (updates as any).verifiedName = existing.fullName || student.displayName;
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
    // REST fallback mode
    const [usersList, studentsList, walletsList] = await Promise.all([
      getFirestoreRestDocs("users", 200),
      getFirestoreRestDocs("students", 200),
      getFirestoreRestDocs("wallets", 200),
    ]);

    usersList.forEach((data: any) => {
      const uid = data.id || data.uid;
      if (uid && (data.role === "student" || !data.role)) {
        studentsMap.set(uid, {
          uid,
          displayName: data.displayName || data.fullName || data.name || data.username || "",
          username: data.username || "",
          studentClass: data.studentClass || data.class || "",
        });
      }
    });

    studentsList.forEach((data: any) => {
      const uid = data.id || data.uid;
      if (uid) {
        if (!studentsMap.has(uid)) {
          studentsMap.set(uid, {
            uid,
            displayName: data.displayName || data.fullName || data.name || data.username || "",
            username: data.username || "",
            studentClass: data.studentClass || data.class || "",
          });
        }
      }
    });

    const existingWallets = new Map<string, any>();
    walletsList.forEach((w: any) => {
      const uid = w.id || w.uid;
      if (uid) existingWallets.set(uid, w);
    });

    const now = new Date().toISOString();
    for (const [uid, student] of studentsMap.entries()) {
      const existing = existingWallets.get(uid);
      if (!existing) {
        const newWallet: StudentWallet = {
          uid,
          balanceVnd: 0,
          totalCreditedVnd: 0,
          totalSpentVnd: 0,
          profileCompleted: Boolean(student.displayName && student.studentClass),
          fullName: student.displayName || student.username || `Học sinh #${uid.slice(0, 5)}`,
          currentClass: student.studentClass || "",
          verifiedName: student.displayName || "",
          isVerified: false,
          createdAt: now,
          updatedAt: now,
        } as any;
        await setFirestoreRestDoc("wallets", uid, newWallet);
        createdCount++;
      } else {
        let needUpdate = false;
        const updates: any = { ...existing, updatedAt: now };
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

  return {
    totalStudents: studentsMap.size,
    createdCount,
    updatedCount,
  };
}
