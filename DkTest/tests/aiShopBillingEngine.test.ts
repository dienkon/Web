import { describe, expect, it } from "vitest";
import type { AiCustomer, AiOrder, AiPayment, AiServiceItem } from "../src/types/aiShop";
import {
  addMonthsAnchored,
  computeCustomerFinancialSummaries,
  computeDashboardSummary,
  computeOrderFinancialSummary,
  formatVnDate,
  formatVnd,
} from "../src/services/aiShop/billingEngine";
import { buildSeedServiceRecords } from "../src/services/aiShop/initialCatalog";

const NOW = "2026-11-22T05:00:00.000Z";

function makeCustomer(overrides: Partial<AiCustomer> = {}): AiCustomer {
  return {
    id: "cust_1",
    customerCode: "KH0001",
    fullName: "Nguyễn Văn An",
    phoneZalo: "0901234567",
    email: "an@example.com",
    note: "",
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<AiOrder> = {}): AiOrder {
  return {
    id: "ord_1",
    orderCode: "DH-001",
    customerId: "cust_1",
    customerCodeSnapshot: "KH0001",
    serviceId: "svc_gemini_pro_slot_lom",
    serviceNameSnapshot: "Gemini Pro slot lỏm",
    serviceConditionsSnapshot: "15k tháng đầu, 5k các tháng sau",
    accountSlot: "slot01@gmail.com",
    quantity: 1,
    startDate: "2026-01-15",
    stopDate: null,
    billingType: "monthly",
    firstCyclePriceVnd: 15000,
    recurringPriceVnd: 5000,
    durationValue: 1,
    durationUnit: "months",
    note: "",
    source: "admin_manual",
    fulfillmentStatus: "delivered",
    createdByUid: "admin_1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makePayment(overrides: Partial<AiPayment> = {}): AiPayment {
  return {
    id: "pay_1",
    paymentCode: "TT-001",
    orderId: "ord_1",
    customerId: "cust_1",
    paidDate: "2026-01-15",
    amountVnd: 15000,
    method: "bank_transfer",
    note: "",
    status: "active",
    createdByUid: "admin_1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("AI Shop Billing Engine — Mandatory Section 9 Scenarios", () => {
  it("1. One customer buying two services at different prices aggregates accurately", () => {
    const cust = makeCustomer();
    const order1 = makeOrder({
      id: "ord_gpt",
      serviceId: "svc_chatgpt_plus_30d_shared",
      serviceNameSnapshot: "ChatGPT Plus 30D - chung",
      billingType: "one_time",
      firstCyclePriceVnd: 50000,
      recurringPriceVnd: null,
      durationValue: 30,
      durationUnit: "days",
      startDate: "2026-03-01",
    });
    const order2 = makeOrder({
      id: "ord_verify",
      serviceId: "svc_verify_student",
      serviceNameSnapshot: "Verify Student",
      billingType: "one_time",
      firstCyclePriceVnd: 20000,
      recurringPriceVnd: null,
      durationValue: null,
      durationUnit: null,
      startDate: "2026-03-02",
    });
    const pay1 = makePayment({ id: "pay_1", orderId: "ord_gpt", paidDate: "2026-03-01", amountVnd: 50000 });

    const { customerSummaryById } = computeCustomerFinancialSummaries(
      [cust],
      [order1, order2],
      [pay1],
      "2026-03-10"
    );
    const summary = customerSummaryById.get("cust_1")!;
    expect(summary.totalOrderCount).toBe(2);
    expect(summary.dueUpToAsOfDateVnd).toBe(70000);
    expect(summary.totalPaidVnd).toBe(50000);
    expect(summary.debtUpToAsOfDateVnd).toBe(20000);
    expect(summary.prepaidVnd).toBe(0);
  });

  it("2. One-time order NEVER generates recurring billing periods even months later", () => {
    const order = makeOrder({
      id: "ord_onetime",
      billingType: "one_time",
      firstCyclePriceVnd: 185000,
      recurringPriceVnd: null,
      startDate: "2026-01-10",
      durationValue: 30,
      durationUnit: "days",
    });

    const summary = computeOrderFinancialSummary(order, [], "2026-11-22");
    expect(summary.periods).toHaveLength(1);
    expect(summary.periods[0].dueDate).toBe("2026-01-10");
    expect(summary.periods[0].amountVnd).toBe(185000);
    expect(summary.dueUpToAsOfDateVnd).toBe(185000);
    // Distinct service expiry date (startDate + 30 days) vs dueDate (startDate)
    expect(summary.serviceExpiryDate).toBe("2026-02-09");
    expect(summary.serviceExpiryDate).not.toBe(summary.periods[0].dueDate);
  });

  it("3. Monthly plan with different first-cycle price vs recurring price (Gemini Pro slot lỏm: 15k -> 5k)", () => {
    const order = makeOrder({
      id: "ord_lom",
      billingType: "monthly",
      firstCyclePriceVnd: 15000,
      recurringPriceVnd: 5000,
      startDate: "2026-01-10",
    });

    // As of 2026-04-10 -> 4 due periods: Jan (15k), Feb (5k), Mar (5k), Apr (5k) = 30k
    const summary = computeOrderFinancialSummary(order, [], "2026-04-10", 0);
    expect(summary.periods).toHaveLength(4);
    expect(summary.periods.map((p) => p.amountVnd)).toEqual([15000, 5000, 5000, 5000]);
    expect(summary.dueUpToAsOfDateVnd).toBe(30000);
    expect(summary.debtUpToAsOfDateVnd).toBe(30000);
  });

  it("4. Purchase dates on 29, 30, 31 clamp to month-end and return to anchor day on subsequent months", () => {
    // Non-leap year 2026, anchor day 31
    expect(addMonthsAnchored("2026-01-31", 0)).toBe("2026-01-31");
    expect(addMonthsAnchored("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsAnchored("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsAnchored("2026-01-31", 3)).toBe("2026-04-30");
    expect(addMonthsAnchored("2026-01-31", 4)).toBe("2026-05-31");

    // Leap year 2024, anchor day 30
    expect(addMonthsAnchored("2024-01-30", 1)).toBe("2024-02-29");
    expect(addMonthsAnchored("2024-01-30", 2)).toBe("2024-03-30");

    // Anchor day 29 in non-leap vs leap year
    expect(addMonthsAnchored("2026-01-29", 1)).toBe("2026-02-28");
    expect(addMonthsAnchored("2026-01-29", 2)).toBe("2026-03-29");

    const order = makeOrder({
      startDate: "2026-01-31",
      billingType: "monthly",
      firstCyclePriceVnd: 25000,
      recurringPriceVnd: 25000,
    });
    const summary = computeOrderFinancialSummary(order, [], "2026-05-31", 0);
    expect(summary.periods.map((p) => p.dueDate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("5. Stop date equal to due date does NOT generate a charge for that date or later", () => {
    const order = makeOrder({
      startDate: "2026-01-15",
      stopDate: "2026-03-15", // Exact due date of period 3
      billingType: "monthly",
      firstCyclePriceVnd: 15000,
      recurringPriceVnd: 5000,
    });

    const summary = computeOrderFinancialSummary(order, [], "2026-06-01");
    // Only Jan 15 and Feb 15 should exist — Mar 15 is excluded because dueDate >= stopDate
    expect(summary.periods.map((p) => p.dueDate)).toEqual(["2026-01-15", "2026-02-15"]);
    expect(summary.dueUpToAsOfDateVnd).toBe(20000);
    expect(summary.isStopped).toBe(true);
    expect(summary.serviceExpiryDate).toBe("2026-03-15");
  });

  it("6. Partial payment and multi-period prepayment allocate FIFO to oldest periods", () => {
    const order = makeOrder({
      id: "ord_sub",
      startDate: "2026-01-10",
      billingType: "monthly",
      firstCyclePriceVnd: 15000,
      recurringPriceVnd: 5000,
    });

    // Case 6a: Partial payment (10,000đ out of 15,000đ due on Jan 10)
    const partialPay = makePayment({ id: "p_partial", orderId: "ord_sub", paidDate: "2026-01-10", amountVnd: 10000 });
    const partialSummary = computeOrderFinancialSummary(order, [partialPay], "2026-01-10", 0);
    expect(partialSummary.periods[0].allocatedVnd).toBe(10000);
    expect(partialSummary.periods[0].remainingVnd).toBe(5000);
    expect(partialSummary.periods[0].status).toBe("partial");
    expect(partialSummary.debtUpToAsOfDateVnd).toBe(5000);
    expect(partialSummary.prepaidVnd).toBe(0);

    // Case 6b: Prepayment covering 4 months (15k + 5k + 5k + 5k = 30k) while viewing on Jan 10
    const prepay = makePayment({ id: "p_prepay", orderId: "ord_sub", paidDate: "2026-01-10", amountVnd: 30000 });
    const prepaySummary = computeOrderFinancialSummary(order, [prepay], "2026-01-10", 0);
    expect(prepaySummary.dueUpToAsOfDateVnd).toBe(15000);
    expect(prepaySummary.allocatedToDueVnd).toBe(15000);
    expect(prepaySummary.debtUpToAsOfDateVnd).toBe(0);
    expect(prepaySummary.prepaidVnd).toBe(15000);
    // Periods 1..4 should all be marked paid
    expect(prepaySummary.periods.slice(0, 4).every((p) => p.status === "paid")).toBe(true);
  });

  it("7. One order with debt + another order with prepaid balance for same customer: NO cross-order netting", () => {
    const cust = makeCustomer();
    const ordDebt = makeOrder({
      id: "ord_debt",
      startDate: "2026-02-01",
      billingType: "one_time",
      firstCyclePriceVnd: 50000,
      recurringPriceVnd: null,
    });
    const ordPrepaid = makeOrder({
      id: "ord_prepaid",
      startDate: "2026-02-01",
      billingType: "monthly",
      firstCyclePriceVnd: 25000,
      recurringPriceVnd: 25000,
    });
    // Customer paid 75,000đ into ord_prepaid (25k due + 50k prepaid), and 0đ into ord_debt (50k debt)
    const pay = makePayment({
      id: "pay_pre",
      orderId: "ord_prepaid",
      paidDate: "2026-02-01",
      amountVnd: 75000,
    });

    const { customerSummaryById } = computeCustomerFinancialSummaries(
      [cust],
      [ordDebt, ordPrepaid],
      [pay],
      "2026-02-10"
    );

    const cs = customerSummaryById.get("cust_1")!;
    // Must stay separate: debt = 50,000 AND prepaid = 50,000 (NOT netted to 0!)
    expect(cs.debtUpToAsOfDateVnd).toBe(50000);
    expect(cs.prepaidVnd).toBe(50000);
    expect(cs.dueUpToAsOfDateVnd).toBe(75000);
    expect(cs.totalPaidVnd).toBe(75000);
  });

  it("8. Changing service catalog prices does NOT change existing orders' locked prices or debt", () => {
    const services: AiServiceItem[] = buildSeedServiceRecords(NOW);
    const oldOrder = makeOrder({
      id: "ord_locked",
      serviceId: "svc_gemini_pro_slot_ngon",
      serviceNameSnapshot: "Gemini Pro slot ngon",
      firstCyclePriceVnd: 25000,
      recurringPriceVnd: 25000,
      startDate: "2026-01-01",
    });

    // Mutate catalog price from 25k to 40k
    const updatedServices = services.map((s) =>
      s.id === "svc_gemini_pro_slot_ngon"
        ? { ...s, defaultFirstPriceVnd: 40000, defaultRecurringPriceVnd: 40000 }
        : s
    );

    const dashboard = computeDashboardSummary(
      [makeCustomer()],
      updatedServices,
      [oldOrder],
      [],
      { asOfDate: "2026-02-01" }
    );
    // Must still be 25k + 25k = 50k, NOT 80k
    expect(dashboard.dueUpToAsOfDateVnd).toBe(50000);
    expect(dashboard.debtUpToAsOfDateVnd).toBe(50000);
  });

  it("9. Voiding a payment recalculates period allocation and debt accurately", () => {
    const order = makeOrder({
      id: "ord_void_test",
      billingType: "one_time",
      firstCyclePriceVnd: 40000,
      recurringPriceVnd: null,
      startDate: "2026-03-01",
    });
    const activePayment = makePayment({
      id: "pay_v1",
      orderId: "ord_void_test",
      paidDate: "2026-03-01",
      amountVnd: 40000,
      status: "active",
    });

    const beforeVoid = computeOrderFinancialSummary(order, [activePayment], "2026-03-10");
    expect(beforeVoid.debtUpToAsOfDateVnd).toBe(0);
    expect(beforeVoid.status).toBe("paid");

    const voidedPayment: AiPayment = {
      ...activePayment,
      status: "voided",
      voidReason: "Nhập nhầm đơn",
      voidedAt: NOW,
    };
    const afterVoid = computeOrderFinancialSummary(order, [voidedPayment], "2026-03-10");
    expect(afterVoid.totalPaidVnd).toBe(0);
    expect(afterVoid.debtUpToAsOfDateVnd).toBe(40000);
    expect(afterVoid.status).toBe("overdue");
  });

  it("10. Re-running schedule generation / reload never duplicates billing periods", () => {
    const order = makeOrder({
      id: "ord_idem",
      startDate: "2026-01-15",
      billingType: "monthly",
      firstCyclePriceVnd: 15000,
      recurringPriceVnd: 5000,
    });
    const pay = makePayment({ id: "p_1", orderId: "ord_idem", amountVnd: 20000 });

    const run1 = computeOrderFinancialSummary(order, [pay], "2026-04-15");
    const run2 = computeOrderFinancialSummary(order, [pay], "2026-04-15");

    expect(run1.periods).toEqual(run2.periods);
    const keys = run1.periods.map((p) => p.periodKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("11. Future-dated order is NOT counted as overdue and cash metric follows paidDate", () => {
    const cust = makeCustomer();
    const futureOrder = makeOrder({
      id: "ord_future",
      startDate: "2026-12-10",
      billingType: "one_time",
      firstCyclePriceVnd: 50000,
      recurringPriceVnd: null,
    });
    const advancePay = makePayment({
      id: "pay_adv",
      orderId: "ord_future",
      paidDate: "2026-11-22",
      amountVnd: 50000,
    });

    const summaryUnpaid = computeOrderFinancialSummary(futureOrder, [], "2026-11-22");
    expect(summaryUnpaid.hasOverdue).toBe(false);
    expect(summaryUnpaid.dueUpToAsOfDateVnd).toBe(0);
    expect(summaryUnpaid.debtUpToAsOfDateVnd).toBe(0);
    expect(summaryUnpaid.status).toBe("upcoming");

    const dash = computeDashboardSummary(
      [cust],
      buildSeedServiceRecords(NOW),
      [futureOrder],
      [advancePay],
      { asOfDate: "2026-11-22" }
    );
    expect(dash.overdueOrderCount).toBe(0);
    expect(dash.actualCollectedMonthVnd).toBe(50000);
    expect(dash.prepaidVnd).toBe(50000);
    expect(dash.dueUpToAsOfDateVnd).toBe(0);
  });

  it("12. Formats Vietnamese dates dd/mm/yyyy and integer VND properly", () => {
    expect(formatVnDate("2026-11-22")).toBe("22/11/2026");
    expect(formatVnDate(null)).toBe("—");
    expect(formatVnd(185000)).toBe("185.000 đ");
    expect(formatVnd(null)).toBe("Chưa có giá");
  });
});
