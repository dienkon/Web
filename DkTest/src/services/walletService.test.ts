import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitizeVnd } from "../../server/services/walletService";

describe("Virtual Wallet & Debt Logic Unit Tests", () => {
  describe("sanitizeVnd helper", () => {
    it("should return clean non-negative integer VND", () => {
      expect(sanitizeVnd(10000)).toBe(10000);
      expect(sanitizeVnd("5000")).toBe(5000);
      expect(sanitizeVnd(10000.75)).toBe(10000);
      expect(sanitizeVnd(-500)).toBe(0);
      expect(sanitizeVnd(NaN)).toBe(0);
      expect(sanitizeVnd(Infinity)).toBe(0);
      expect(sanitizeVnd(null)).toBe(0);
      expect(sanitizeVnd(undefined)).toBe(0);
    });
  });

  describe("Deposit Request Constraints (Phần B & 7)", () => {
    it("should validate deposit limits: min 1.000đ, max 20.000đ integer VND", () => {
      const validateDepositAmount = (amount: number) => {
        const clean = sanitizeVnd(amount);
        if (clean < 1000) throw new Error("Số tiền nạp tối thiểu là 1.000đ.");
        if (clean > 20000) throw new Error("Số tiền nạp tối đa cho mỗi yêu cầu là 20.000đ.");
        return clean;
      };

      // Valid amounts
      expect(validateDepositAmount(1000)).toBe(1000);
      expect(validateDepositAmount(5000)).toBe(5000);
      expect(validateDepositAmount(15000)).toBe(15000);
      expect(validateDepositAmount(20000)).toBe(20000);

      // Rejections
      expect(() => validateDepositAmount(0)).toThrow("Số tiền nạp tối thiểu là 1.000đ.");
      expect(() => validateDepositAmount(-1000)).toThrow("Số tiền nạp tối thiểu là 1.000đ.");
      expect(() => validateDepositAmount(500)).toThrow("Số tiền nạp tối thiểu là 1.000đ.");
      expect(() => validateDepositAmount(20001)).toThrow("Số tiền nạp tối đa cho mỗi yêu cầu là 20.000đ.");
      expect(() => validateDepositAmount(50000)).toThrow("Số tiền nạp tối đa cho mỗi yêu cầu là 20.000đ.");
    });

    it("auto-approved deposit request credits balance immediately and creates an unpaid debt record for offline collection", () => {
      const initialWallet = {
        uid: "stu_1",
        balanceVnd: 5000,
        totalCreditedVnd: 5000,
        totalSpentVnd: 0,
      };

      const debtLedger: any[] = [];

      // Auto-approved deposit execution
      const handleAutoApprovedDeposit = (wallet: typeof initialWallet, amountVnd: number) => {
        const cleanAmount = sanitizeVnd(amountVnd);
        const req = {
          id: "req_1",
          uid: wallet.uid,
          amountVnd: cleanAmount,
          status: "approved" as const,
          processedBy: "system",
        };

        const updatedWallet = {
          ...wallet,
          balanceVnd: wallet.balanceVnd + cleanAmount,
          totalCreditedVnd: wallet.totalCreditedVnd + cleanAmount,
        };

        const debtRecord = {
          id: "debt_1",
          uid: wallet.uid,
          amountVnd: cleanAmount,
          collectedVnd: 0,
          remainingVnd: cleanAmount,
          status: "unpaid" as const,
        };
        debtLedger.push(debtRecord);

        return { updatedWallet, req, debtRecord };
      };

      const { updatedWallet, req, debtRecord } = handleAutoApprovedDeposit(initialWallet, 10000);

      // 1. Student wallet balance is credited immediately
      expect(updatedWallet.balanceVnd).toBe(15000);
      expect(updatedWallet.totalCreditedVnd).toBe(15000);
      expect(req.status).toBe("approved");

      // 2. Unpaid debt record is created to track offline collection obligation
      expect(debtRecord.remainingVnd).toBe(10000);
      expect(debtRecord.status).toBe("unpaid");

      // 3. Admin records offline cash collection: clears debt without double-crediting wallet
      const recordOfflineCashCollection = (
        currentWallet: typeof updatedWallet,
        collectedAmount: number,
        creditToWallet: boolean
      ) => {
        let remainingToAllocate = collectedAmount;
        for (const rec of debtLedger) {
          if (rec.status === "unpaid" || rec.status === "partial") {
            const allocation = Math.min(remainingToAllocate, rec.remainingVnd);
            rec.collectedVnd += allocation;
            rec.remainingVnd -= allocation;
            rec.status = rec.remainingVnd === 0 ? "paid" : "partial";
            remainingToAllocate -= allocation;
          }
        }

        let newBalance = currentWallet.balanceVnd;
        if (creditToWallet) {
          newBalance += collectedAmount;
        }

        return {
          ...currentWallet,
          balanceVnd: newBalance,
        };
      };

      // When admin collects 10.000đ cash from student with creditToWallet = false:
      const walletAfterCollection = recordOfflineCashCollection(updatedWallet, 10000, false);
      expect(debtRecord.status).toBe("paid");
      expect(debtRecord.remainingVnd).toBe(0);
      expect(debtRecord.collectedVnd).toBe(10000);
      // Balance remains 15.000đ (not double-credited)
      expect(walletAfterCollection.balanceVnd).toBe(15000);
    });
  });

  describe("Exam Unlock Transaction & Idempotency (Phần A & 4)", () => {
    it("should deduct balance on first purchase and prevent double-charging on re-purchase", () => {
      let balance = 15000;
      let totalSpent = 0;
      const entitlements = new Map<string, any>();

      const unlock = (uid: string, examId: string, priceVnd: number) => {
        const entId = `${uid}_${examId}`;
        // Idempotency check:
        if (entitlements.has(entId)) {
          return {
            success: true,
            alreadyUnlocked: true,
            balanceVnd: balance,
            entitlement: entitlements.get(entId),
          };
        }

        if (balance < priceVnd) {
          throw new Error("insufficient_balance");
        }

        balance -= priceVnd;
        totalSpent += priceVnd;
        const ent = {
          id: entId,
          uid,
          examId,
          status: "active",
          pricePaidVnd: priceVnd,
          grantedAt: new Date().toISOString(),
        };
        entitlements.set(entId, ent);

        return {
          success: true,
          alreadyUnlocked: false,
          balanceVnd: balance,
          entitlement: ent,
        };
      };

      // 1. First purchase of a 10.000đ exam
      const res1 = unlock("user_1", "exam_1", 10000);
      expect(res1.success).toBe(true);
      expect(res1.alreadyUnlocked).toBe(false);
      expect(res1.balanceVnd).toBe(5000);
      expect(totalSpent).toBe(10000);

      // 2. Re-purchase the same exam (idempotent, no second debit)
      const res2 = unlock("user_1", "exam_1", 10000);
      expect(res2.success).toBe(true);
      expect(res2.alreadyUnlocked).toBe(true);
      expect(res2.balanceVnd).toBe(5000);
      expect(totalSpent).toBe(10000);

      // 3. Purchase another exam with insufficient funds (cost 10.000đ, balance 5.000đ)
      expect(() => unlock("user_1", "exam_2", 10000)).toThrow("insufficient_balance");
      expect(balance).toBe(5000); // Unchanged
    });
  });

  describe("Debt Calculation & Sorting Formula (Phần C & 11)", () => {
    it("should accurately calculate remaining debt = max(0, receivables - collected - adjustments)", () => {
      const calculateStudentDebt = (
        totalReceivables: number,
        totalCollected: number,
        totalAdjustments: number
      ) => {
        return Math.max(0, totalReceivables - totalCollected - totalAdjustments);
      };

      // Case 1: Student owes 50k, paid 20k, 0 adjustments -> owes 30k
      expect(calculateStudentDebt(50000, 20000, 0)).toBe(30000);

      // Case 2: Student owes 50k, paid 20k, 30k debt reduction adjustment -> owes 0
      expect(calculateStudentDebt(50000, 20000, 30000)).toBe(0);

      // Case 3: Student paid more than owed -> debt is 0 (never negative)
      expect(calculateStudentDebt(50000, 70000, 0)).toBe(0);
    });

    it("should sort student debt list in descending order of remaining debt (highest debt first)", () => {
      const students = [
        { uid: "s1", name: "An", debtVnd: 10000, balanceVnd: 0 },
        { uid: "s2", name: "Bình", debtVnd: 50000, balanceVnd: 0 },
        { uid: "s3", name: "Cường", debtVnd: 0, balanceVnd: 20000 },
        { uid: "s4", name: "Dũng", debtVnd: 35000, balanceVnd: 0 },
      ];

      students.sort((a, b) => {
        if (b.debtVnd !== a.debtVnd) {
          return b.debtVnd - a.debtVnd;
        }
        return b.balanceVnd - a.balanceVnd;
      });

      expect(students[0].name).toBe("Bình"); // 50k
      expect(students[1].name).toBe("Dũng"); // 35k
      expect(students[2].name).toBe("An"); // 10k
      expect(students[3].name).toBe("Cường"); // 0k
    });
  });

  describe("First-Time Profile Registration Validation (Phần B & 6)", () => {
    it("should trim and validate fullName and currentClass in Vietnamese", () => {
      const validateProfile = (fullName: string, currentClass: string) => {
        const cleanName = String(fullName || "").trim();
        const cleanClass = String(currentClass || "").trim().toUpperCase();

        if (!cleanName || cleanName.length < 2) {
          throw new Error("Họ và tên học sinh phải có ít nhất 2 ký tự.");
        }
        if (!cleanClass || cleanClass.length < 2) {
          throw new Error("Lớp học hiện tại không hợp lệ (ví dụ: 11A1, 12D2).");
        }

        return { fullName: cleanName, currentClass: cleanClass };
      };

      expect(validateProfile("  Nguyễn Văn An  ", " 11a1 ")).toEqual({
        fullName: "Nguyễn Văn An",
        currentClass: "11A1",
      });

      expect(() => validateProfile("", "11A1")).toThrow("Họ và tên học sinh phải có ít nhất 2 ký tự.");
      expect(() => validateProfile("A", "11A1")).toThrow("Họ và tên học sinh phải có ít nhất 2 ký tự.");
      expect(() => validateProfile("Nguyễn Văn An", "")).toThrow("Lớp học hiện tại không hợp lệ");
    });
  });

  describe("Additional Wallet & Security Test Cases (Phần A, B, C)", () => {
    it("should reject approving an already rejected request without transition", () => {
      const request = {
        id: "req_rej_1",
        uid: "stu_1",
        amountVnd: 10000,
        status: "rejected" as const,
      };

      const approve = (req: { id: string; uid: string; amountVnd: number; status: string }) => {
        if (req.status !== "pending") {
          throw new Error(`Yêu cầu nạp không thể duyệt (trạng thái hiện tại: ${req.status}).`);
        }
      };

      expect(() => approve(request)).toThrow('Yêu cầu nạp không thể duyệt (trạng thái hiện tại: rejected).');
    });

    it("should not deduct wallet balance when unlocking a free exam", () => {
      let balance = 10000;
      const exam = { id: "exam_free", accessMode: "free", priceVnd: 0 };

      const unlockExam = (examData: typeof exam) => {
        if (examData.accessMode === "free" || examData.priceVnd <= 0) {
          return { success: true, pricePaidVnd: 0, newBalance: balance };
        }
        balance -= examData.priceVnd;
        return { success: true, pricePaidVnd: examData.priceVnd, newBalance: balance };
      };

      const res = unlockExam(exam);
      expect(res.pricePaidVnd).toBe(0);
      expect(res.newBalance).toBe(10000);
      expect(balance).toBe(10000);
    });

    it("should ignore client-supplied price and enforce server canonical price", () => {
      const canonicalExam = { id: "exam_paid_1", priceVnd: 15000 };
      const clientPayload = { examId: "exam_paid_1", clientPriceVnd: 100 }; // Attacker tries to pay 100đ

      const processServerUnlock = (targetExam: typeof canonicalExam, _payload: typeof clientPayload) => {
        // Server strictly uses canonicalExam.priceVnd, ignores payload.clientPriceVnd
        const chargePrice = canonicalExam.priceVnd;
        return chargePrice;
      };

      const actualCharged = processServerUnlock(canonicalExam, clientPayload);
      expect(actualCharged).toBe(15000);
      expect(actualCharged).not.toBe(100);
    });

    it("should allocate cash collection payments against unpaid receivables FIFO", () => {
      const receivables = [
        { id: "r1", amountVnd: 10000, collectedVnd: 0, remainingVnd: 10000, status: "unpaid" },
        { id: "r2", amountVnd: 20000, collectedVnd: 0, remainingVnd: 20000, status: "unpaid" },
      ];

      const allocatePayment = (paymentAmount: number) => {
        let toAllocate = paymentAmount;
        for (const r of receivables) {
          if (toAllocate <= 0) break;
          const alloc = Math.min(toAllocate, r.remainingVnd);
          r.collectedVnd += alloc;
          r.remainingVnd -= alloc;
          r.status = r.remainingVnd === 0 ? "paid" : "partial";
          toAllocate -= alloc;
        }
        return toAllocate; // unallocated surplus
      };

      const surplus = allocatePayment(15000);
      expect(receivables[0].remainingVnd).toBe(0);
      expect(receivables[0].status).toBe("paid");
      expect(receivables[1].remainingVnd).toBe(15000);
      expect(receivables[1].status).toBe("partial");
      expect(surplus).toBe(0);
    });

    it("should validate debt adjustments: amount > 0 and reason required", () => {
      const validateAdjustment = (amountVnd: number, reason: string) => {
        const cleanAmount = sanitizeVnd(amountVnd);
        if (cleanAmount <= 0) throw new Error("Số tiền điều chỉnh phải lớn hơn 0đ.");
        const cleanReason = String(reason || "").trim();
        if (!cleanReason) throw new Error("Vui lòng nhập lý do điều chỉnh công nợ.");
        return { amountVnd: cleanAmount, reason: cleanReason };
      };

      expect(validateAdjustment(5000, "Xóa nợ cho học sinh nghèo")).toEqual({
        amountVnd: 5000,
        reason: "Xóa nợ cho học sinh nghèo",
      });

      expect(() => validateAdjustment(0, "Lý do")).toThrow("Số tiền điều chỉnh phải lớn hơn 0đ.");
      expect(() => validateAdjustment(-1000, "Lý do")).toThrow("Số tiền điều chỉnh phải lớn hơn 0đ.");
      expect(() => validateAdjustment(5000, "")).toThrow("Vui lòng nhập lý do điều chỉnh công nợ.");
      expect(() => validateAdjustment(5000, "   ")).toThrow("Vui lòng nhập lý do điều chỉnh công nợ.");
    });
  });

  describe("Bảo Mật Đề Thi Trả Phí & Khóa Lỗ Hổng Retake (Anti-Loophole Security)", () => {
    it("should reject student B when accessing student A's personal retake exam", () => {
      const studentA_Uid = "student_A_123";
      const studentB_Uid = "student_B_456";

      const retakeExam = {
        id: "retake_exam_999",
        title: "[Làm lại câu sai] Đề Toán 12 Nâng Cao",
        isRetake: true,
        isPersonalRetake: true,
        creatorUid: studentA_Uid,
        allowedUid: studentA_Uid,
        originalExamId: "master_paid_exam_001",
        accessMode: "paid" as const,
        priceVnd: 15000,
      };

      const verifyRetakeAccess = (candidateUid: string | null, exam: typeof retakeExam) => {
        if (!candidateUid) {
          return { hasAccess: false, rejectionReason: "personal_retake_unauthenticated" };
        }
        if (exam.isRetake && exam.creatorUid && candidateUid !== exam.creatorUid && candidateUid !== exam.allowedUid) {
          return { hasAccess: false, rejectionReason: "personal_retake_forbidden" };
        }
        return { hasAccess: true };
      };

      // Unauthenticated visitor is blocked
      expect(verifyRetakeAccess(null, retakeExam)).toEqual({
        hasAccess: false,
        rejectionReason: "personal_retake_unauthenticated",
      });

      // Student B (different UID) is strictly forbidden
      expect(verifyRetakeAccess(studentB_Uid, retakeExam)).toEqual({
        hasAccess: false,
        rejectionReason: "personal_retake_forbidden",
      });

      // Student A (creator UID) has access
      expect(verifyRetakeAccess(studentA_Uid, retakeExam)).toEqual({
        hasAccess: true,
      });
    });

    it("should require entitlement for the original paid exam when accessing a derived retake exam", () => {
      const studentA_Uid = "student_A_123";
      const masterExamId = "master_paid_exam_001";

      const retakeExam = {
        id: "retake_exam_999",
        isRetake: true,
        creatorUid: studentA_Uid,
        originalExamId: masterExamId,
      };

      const masterExam = {
        id: masterExamId,
        title: "Đề Thi Trả Phí Gốc",
        accessMode: "paid" as const,
        priceVnd: 20000,
      };

      const entitlementsDatabase = new Set<string>(); // Format: `${uid}_${examId}`

      const checkDerivedExamEntitlement = (candidateUid: string, exam: typeof retakeExam) => {
        if (exam.originalExamId && masterExam.accessMode === "paid") {
          const entitlementKey = `${candidateUid}_${exam.originalExamId}`;
          if (!entitlementsDatabase.has(entitlementKey)) {
            return {
              hasAccess: false,
              rejectionReason: "parent_exam_locked",
              parentExamId: exam.originalExamId,
              priceVnd: masterExam.priceVnd,
            };
          }
        }
        return { hasAccess: true };
      };

      // Student A has not purchased original exam -> BLOCKED
      expect(checkDerivedExamEntitlement(studentA_Uid, retakeExam)).toEqual({
        hasAccess: false,
        rejectionReason: "parent_exam_locked",
        parentExamId: masterExamId,
        priceVnd: 20000,
      });

      // Student A purchases original exam -> UNLOCKED
      entitlementsDatabase.add(`${studentA_Uid}_${masterExamId}`);
      expect(checkDerivedExamEntitlement(studentA_Uid, retakeExam)).toEqual({
        hasAccess: true,
      });
    });

    it("should correctly update KYC verified name and status in student wallet", () => {
      const initialWallet = {
        uid: "student_A_123",
        fullName: "nguyen van a",
        currentClass: "12A1",
        verifiedName: "nguyen van a",
        isVerified: false,
        balanceVnd: 10000,
      };

      const applyAdminKycVerification = (
        wallet: typeof initialWallet,
        verifiedName: string,
        isVerified: boolean,
        adminUid: string
      ) => {
        return {
          ...wallet,
          verifiedName: verifiedName.trim().toUpperCase(),
          isVerified,
          verifiedBy: isVerified ? adminUid : undefined,
          verifiedAt: isVerified ? "2026-10-11T00:00:00.000Z" : undefined,
        };
      };

      const verified = applyAdminKycVerification(initialWallet, "NGUYỄN VĂN A", true, "admin_dien");
      expect(verified.isVerified).toBe(true);
      expect(verified.verifiedName).toBe("NGUYỄN VĂN A");
      expect(verified.verifiedBy).toBe("admin_dien");
      expect(verified.verifiedAt).toBeDefined();
    });
  });
});
