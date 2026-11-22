import type {
  AiBillingPeriod,
  AiBillingStatus,
  AiCustomer,
  AiCustomerFinancialSummary,
  AiDashboardSummary,
  AiDueAlertItem,
  AiExpiringServiceItem,
  AiMonthlyCashPoint,
  AiOrder,
  AiOrderFinancialSummary,
  AiPayment,
  AiServiceItem,
  AiServiceStatRow,
} from "../../types/aiShop";

export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const MAX_MONTHLY_PERIODS = 240;

// ---------------------------------------------------------------------------
// 1. PURE DATE & FORMATTING HELPERS (Asia/Ho_Chi_Minh civil dates YYYY-MM-DD)
// ---------------------------------------------------------------------------

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const maxDay = getDaysInMonth(y, m);
  return d >= 1 && d <= maxDay;
}

export function getDaysInMonth(year: number, month1To12: number): number {
  return new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
}

export function getTodayVnDate(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = formatter.format(now);
  if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    return formatted;
  }
  // Fallback using explicit UTC+7 offset
  const vnMs = now.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(vnMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function formatVnDate(isoDate: string | null | undefined): string {
  if (!isoDate || !isValidIsoDate(isoDate)) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function formatVnMonth(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split("-");
  return `${m}/${y}`;
}

export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "Chưa có giá";
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${formatted} đ`;
}

export function toIntVnd(value: unknown): number {
  const num = typeof value === "number" ? value : Number(String(value ?? "").replace(/[.,\sđvnd]/gi, ""));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.trunc(num);
}

/**
 * Adds `monthsToAdd` months to `anchorIsoDate`, clamping to the end of the target month
 * while preserving the original anchor day for subsequent months.
 * Example: 2026-01-31 + 1m -> 2026-02-28; + 2m -> 2026-03-31; + 3m -> 2026-04-30.
 */
export function addMonthsAnchored(anchorIsoDate: string, monthsToAdd: number): string {
  const [y, m, d] = anchorIsoDate.split("-").map(Number);
  const totalMonths = (m - 1) + monthsToAdd;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  const clampedDay = Math.min(d, getDaysInMonth(targetYear, targetMonth));
  return `${String(targetYear).padStart(4, "0")}-${String(targetMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${String(dt.getUTCFullYear()).padStart(4, "0")}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  const ms1 = Date.UTC(y1, m1 - 1, d1);
  const ms2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((ms2 - ms1) / 86400000);
}

export function computeOneTimeServiceExpiry(
  startDate: string,
  durationValue: number | null | undefined,
  durationUnit: "days" | "months" | null | undefined
): string | null {
  if (!isValidIsoDate(startDate) || !durationValue || durationValue <= 0 || !durationUnit) {
    return null;
  }
  if (durationUnit === "days") {
    return addDaysIso(startDate, Math.trunc(durationValue));
  }
  return addMonthsAnchored(startDate, Math.trunc(durationValue));
}

// ---------------------------------------------------------------------------
// 2. DETERMINISTIC BILLING SCHEDULE, ALLOCATION & ORDER DEBT ENGINE
// ---------------------------------------------------------------------------

/**
 * Computes the complete deterministic billing schedule, FIFO payment allocation,
 * debt, prepaid balance, and service expiry for a single order as of `asOfDate`.
 *
 * Guarantees:
 * - Pure & idempotent: calling repeatedly never duplicates periods.
 * - One-time orders generate at most 1 period.
 * - Monthly orders clamp day 29/30/31 to month-end and return to anchor day on subsequent months.
 * - No period is ever generated with `dueDate >= stopDate`.
 * - FIFO allocation applies active payments strictly to THIS order's oldest unpaid periods.
 * - No cross-order netting.
 * - Future periods (dueDate > asOfDate) are never marked overdue.
 */
export function computeOrderFinancialSummary(
  order: AiOrder,
  allPaymentsForOrder: AiPayment[],
  asOfDate: string = getTodayVnDate(),
  upcomingHorizonDays: number = 31
): AiOrderFinancialSummary {
  const qty = Math.max(1, Math.trunc(Number(order.quantity) || 1));
  const firstUnitPrice = toIntVnd(order.firstCyclePriceVnd);
  const recurringUnitPrice =
    order.billingType === "monthly"
      ? toIntVnd(order.recurringPriceVnd ?? order.firstCyclePriceVnd)
      : 0;

  const stopDate = order.stopDate && isValidIsoDate(order.stopDate) ? order.stopDate : null;

  // Only active payments linked to this exact order participate
  const activePayments = allPaymentsForOrder
    .filter((p) => p.orderId === order.id && p.status === "active" && toIntVnd(p.amountVnd) > 0)
    .sort((a, b) => {
      if (a.paidDate !== b.paidDate) return a.paidDate.localeCompare(b.paidDate);
      if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
      return a.id.localeCompare(b.id);
    });

  const totalPaidVnd = activePayments.reduce((sum, p) => sum + toIntVnd(p.amountVnd), 0);

  // Build raw periods deterministically
  interface RawPeriod {
    periodNumber: number;
    dueDate: string;
    coverageEndDate: string | null;
    amountVnd: number;
  }

  const rawPeriods: RawPeriod[] = [];

  if (order.billingType === "one_time") {
    const dueDate = order.startDate;
    const blockedByStop = Boolean(stopDate && dueDate >= stopDate);
    if (!blockedByStop && isValidIsoDate(dueDate)) {
      const naturalExpiry = computeOneTimeServiceExpiry(
        order.startDate,
        order.durationValue,
        order.durationUnit
      );
      const coverageEndDate =
        stopDate && naturalExpiry && stopDate < naturalExpiry
          ? stopDate
          : naturalExpiry ?? stopDate;
      rawPeriods.push({
        periodNumber: 1,
        dueDate,
        coverageEndDate,
        amountVnd: firstUnitPrice * qty,
      });
    }
  } else {
    // Monthly recurring order
    const horizonDate = addDaysIso(asOfDate, Math.max(0, upcomingHorizonDays));
    let remainingCoverPool = totalPaidVnd;
    let addedOneFuturePreview = false;

    for (let k = 0; k < MAX_MONTHLY_PERIODS; k++) {
      const dueDate = addMonthsAnchored(order.startDate, k);
      // Hard rule: never generate period with dueDate >= stopDate
      if (stopDate && dueDate >= stopDate) {
        break;
      }

      const amountVnd = (k === 0 ? firstUnitPrice : recurringUnitPrice) * qty;
      const isDueOrWithinHorizon = dueDate <= horizonDate;
      const neededForPrepaidAllocation = remainingCoverPool > 0 && amountVnd > 0;

      if (!isDueOrWithinHorizon && !neededForPrepaidAllocation) {
        if (!addedOneFuturePreview && rawPeriods.length === 0) {
          // Even for a future-starting order, include Period 1 so user can see upcoming schedule
          addedOneFuturePreview = true;
        } else {
          break;
        }
      }

      const nextCycleDate = addMonthsAnchored(order.startDate, k + 1);
      const coverageEndDate = stopDate && stopDate < nextCycleDate ? stopDate : nextCycleDate;

      rawPeriods.push({
        periodNumber: k + 1,
        dueDate,
        coverageEndDate,
        amountVnd,
      });

      remainingCoverPool = Math.max(0, remainingCoverPool - amountVnd);

      // If we've passed asOfDate AND exhausted prepaid pool AND passed horizonDate, stop
      if (dueDate > horizonDate && remainingCoverPool === 0) {
        break;
      }
    }
  }

  // FIFO allocation of totalPaidVnd to oldest periods of THIS order
  let pool = totalPaidVnd;
  const periods: AiBillingPeriod[] = rawPeriods.map((raw) => {
    const allocatedVnd = Math.min(pool, raw.amountVnd);
    pool -= allocatedVnd;
    const remainingVnd = raw.amountVnd - allocatedVnd;
    const isDue = raw.dueDate <= asOfDate;
    const isOverdue = raw.dueDate < asOfDate && remainingVnd > 0;
    const isDueToday = raw.dueDate === asOfDate && remainingVnd > 0;

    let status: AiBillingStatus;
    if (raw.amountVnd === 0 || remainingVnd === 0) {
      status = "paid";
    } else if (allocatedVnd > 0) {
      status = "partial";
    } else if (isOverdue) {
      status = "overdue";
    } else {
      status = "upcoming";
    }

    return {
      periodKey: `${order.id}__P${raw.periodNumber}`,
      orderId: order.id,
      periodNumber: raw.periodNumber,
      dueDate: raw.dueDate,
      coverageEndDate: raw.coverageEndDate,
      amountVnd: raw.amountVnd,
      allocatedVnd,
      remainingVnd,
      isDue,
      isOverdue,
      isDueToday,
      status,
    };
  });

  // Consistent debt & prepaid derivation from periods and payments
  let dueUpToAsOfDateVnd = 0;
  let allocatedToDueVnd = 0;
  let debtUpToAsOfDateVnd = 0;
  let hasOverdue = false;

  for (const p of periods) {
    if (p.isDue) {
      dueUpToAsOfDateVnd += p.amountVnd;
      allocatedToDueVnd += p.allocatedVnd;
      debtUpToAsOfDateVnd += p.remainingVnd;
    }
    if (p.isOverdue) {
      hasOverdue = true;
    }
  }

  // Prepaid = money already received but not used by due periods (dueDate <= asOfDate)
  const prepaidVnd = Math.max(0, totalPaidVnd - allocatedToDueVnd);

  const isStopped = Boolean(stopDate && stopDate <= asOfDate);

  // Determine service expiry date (distinct from payment due date)
  let serviceExpiryDate: string | null = null;
  if (order.billingType === "one_time") {
    const computedExpiry = computeOneTimeServiceExpiry(
      order.startDate,
      order.durationValue,
      order.durationUnit
    );
    if (stopDate && computedExpiry) {
      serviceExpiryDate = stopDate < computedExpiry ? stopDate : computedExpiry;
    } else {
      serviceExpiryDate = computedExpiry ?? stopDate;
    }
  } else {
    if (stopDate) {
      serviceExpiryDate = stopDate;
    } else {
      // Latest period that is either due or covered by prepaid
      const coveredOrDuePeriods = periods.filter((p) => p.isDue || p.allocatedVnd > 0);
      const refPeriod =
        coveredOrDuePeriods.length > 0
          ? coveredOrDuePeriods[coveredOrDuePeriods.length - 1]
          : periods[0];
      serviceExpiryDate = refPeriod?.coverageEndDate ?? null;
    }
  }

  // Is order active? Not stopped AND (for one-time with duration, expiry hasn't passed before asOfDate or still has unpaid debt)
  const isExpiredOneTime = Boolean(
    order.billingType === "one_time" && serviceExpiryDate && serviceExpiryDate < asOfDate
  );
  const isActive = !isStopped && !isExpiredOneTime;

  // Next unpaid period (for alerts & quick collect)
  const nextUnpaidPeriod = periods.find((p) => p.remainingVnd > 0) ?? null;

  // Determine overall order display status (5 canonical statuses)
  let status: AiBillingStatus;
  if (hasOverdue) {
    status = "overdue";
  } else if (isStopped && debtUpToAsOfDateVnd === 0) {
    status = "stopped";
  } else if (debtUpToAsOfDateVnd > 0 && allocatedToDueVnd > 0) {
    status = "partial";
  } else if (debtUpToAsOfDateVnd > 0) {
    // Due today and unpaid (0 allocated yet)
    status = "upcoming";
  } else if (dueUpToAsOfDateVnd > 0 || (periods.length > 0 && periods[0].remainingVnd === 0)) {
    status = "paid";
  } else {
    status = "upcoming";
  }

  return {
    order,
    periods,
    dueUpToAsOfDateVnd,
    totalPaidVnd,
    allocatedToDueVnd,
    debtUpToAsOfDateVnd,
    prepaidVnd,
    hasOverdue,
    isStopped,
    isActive,
    status,
    nextDueDate: nextUnpaidPeriod?.dueDate ?? null,
    nextDueAmountVnd: nextUnpaidPeriod?.remainingVnd ?? 0,
    serviceExpiryDate,
    activePaymentCount: activePayments.length,
  };
}

// ---------------------------------------------------------------------------
// 3. CUSTOMER & GLOBAL AGGREGATION (NO CROSS-ORDER OFFSETTING)
// ---------------------------------------------------------------------------

export function computeCustomerFinancialSummaries(
  customers: AiCustomer[],
  orders: AiOrder[],
  payments: AiPayment[],
  asOfDate: string = getTodayVnDate()
): {
  customerSummaries: AiCustomerFinancialSummary[];
  orderSummaries: AiOrderFinancialSummary[];
  orderSummaryById: Map<string, AiOrderFinancialSummary>;
  customerSummaryById: Map<string, AiCustomerFinancialSummary>;
} {
  const paymentsByOrder = new Map<string, AiPayment[]>();
  for (const payment of payments) {
    const list = paymentsByOrder.get(payment.orderId);
    if (list) list.push(payment);
    else paymentsByOrder.set(payment.orderId, [payment]);
  }

  const orderSummaryById = new Map<string, AiOrderFinancialSummary>();
  const ordersByCustomer = new Map<string, AiOrderFinancialSummary[]>();

  for (const order of orders) {
    const summary = computeOrderFinancialSummary(
      order,
      paymentsByOrder.get(order.id) ?? [],
      asOfDate
    );
    orderSummaryById.set(order.id, summary);
    const list = ordersByCustomer.get(order.customerId);
    if (list) list.push(summary);
    else ordersByCustomer.set(order.customerId, [summary]);
  }

  const customerSummaryById = new Map<string, AiCustomerFinancialSummary>();
  const customerSummaries: AiCustomerFinancialSummary[] = customers.map((customer) => {
    const custOrders = ordersByCustomer.get(customer.id) ?? [];
    let activeOrderCount = 0;
    let dueUpToAsOfDateVnd = 0;
    let totalPaidVnd = 0;
    let debtUpToAsOfDateVnd = 0;
    let prepaidVnd = 0;
    let overdueOrderCount = 0;
    let activePaymentCount = 0;

    for (const os of custOrders) {
      if (os.isActive) activeOrderCount++;
      dueUpToAsOfDateVnd += os.dueUpToAsOfDateVnd;
      totalPaidVnd += os.totalPaidVnd;
      // CRITICAL: Sum debt and prepaid separately per order — NEVER net across orders!
      debtUpToAsOfDateVnd += os.debtUpToAsOfDateVnd;
      prepaidVnd += os.prepaidVnd;
      if (os.hasOverdue) overdueOrderCount++;
      activePaymentCount += os.activePaymentCount;
    }

    const cs: AiCustomerFinancialSummary = {
      customer,
      orders: custOrders,
      activeOrderCount,
      totalOrderCount: custOrders.length,
      dueUpToAsOfDateVnd,
      totalPaidVnd,
      debtUpToAsOfDateVnd,
      prepaidVnd,
      hasOverdue: overdueOrderCount > 0,
      overdueOrderCount,
      activePaymentCount,
    };
    customerSummaryById.set(customer.id, cs);
    return cs;
  });

  return {
    customerSummaries,
    orderSummaries: Array.from(orderSummaryById.values()),
    orderSummaryById,
    customerSummaryById,
  };
}

// ---------------------------------------------------------------------------
// 4. DASHBOARD & REPORTING ENGINE
// ---------------------------------------------------------------------------

export interface AiDashboardFilter {
  asOfDate?: string;
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  serviceId?: string;
  status?: AiBillingStatus | "all";
}

export function computeDashboardSummary(
  customers: AiCustomer[],
  services: AiServiceItem[],
  orders: AiOrder[],
  payments: AiPayment[],
  filter: AiDashboardFilter = {}
): AiDashboardSummary {
  const asOfDate = filter.asOfDate && isValidIsoDate(filter.asOfDate) ? filter.asOfDate : getTodayVnDate();
  const currentMonthKey = asOfDate.slice(0, 7);

  // Filter orders by customer / service if specified
  const preFilteredOrders = orders.filter((o) => {
    if (filter.customerId && filter.customerId !== "all" && o.customerId !== filter.customerId) {
      return false;
    }
    if (filter.serviceId && filter.serviceId !== "all" && o.serviceId !== filter.serviceId) {
      return false;
    }
    return true;
  });

  const allowedOrderIds = new Set(preFilteredOrders.map((o) => o.id));
  const scopedPayments = payments.filter((p) => allowedOrderIds.has(p.orderId));

  const { customerSummaries, orderSummaries } = computeCustomerFinancialSummaries(
    customers.filter((c) => !filter.customerId || filter.customerId === "all" || c.id === filter.customerId),
    preFilteredOrders,
    scopedPayments,
    asOfDate
  );

  // Optional status filter applied to orders
  const filteredOrderSummaries =
    filter.status && filter.status !== "all"
      ? orderSummaries.filter((os) => os.status === filter.status)
      : orderSummaries;

  const finalOrderIdSet = new Set(filteredOrderSummaries.map((os) => os.order.id));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  let activeOrderCount = 0;
  let pendingDeliveryCount = 0;
  let dueUpToAsOfDateVnd = 0;
  let debtUpToAsOfDateVnd = 0;
  let prepaidVnd = 0;
  let overdueOrderCount = 0;

  for (const os of filteredOrderSummaries) {
    if (os.isActive) activeOrderCount++;
    if (os.order.fulfillmentStatus === "pending_delivery" && !os.isStopped) pendingDeliveryCount++;
    dueUpToAsOfDateVnd += os.dueUpToAsOfDateVnd;
    debtUpToAsOfDateVnd += os.debtUpToAsOfDateVnd;
    prepaidVnd += os.prepaidVnd;
    if (os.hasOverdue) overdueOrderCount++;
  }

  // Actual collected cash ("tiền thực thu") strictly by payment.paidDate
  const activeScopedPayments = scopedPayments.filter((p) => {
    if (p.status !== "active") return false;
    if (!finalOrderIdSet.has(p.orderId)) return false;
    if (filter.fromDate && isValidIsoDate(filter.fromDate) && p.paidDate < filter.fromDate) return false;
    if (filter.toDate && isValidIsoDate(filter.toDate) && p.paidDate > filter.toDate) return false;
    return true;
  });

  let actualCollectedMonthVnd = 0;
  let actualCollectedTotalVnd = 0;
  const monthlyMap = new Map<string, { actualCollectedVnd: number; paymentCount: number }>();

  // Pre-seed last 6 months up to asOfDate's month so chart always has clean continuous axis
  const anchorMonthDate = `${currentMonthKey}-01`;
  for (let i = 5; i >= 0; i--) {
    const mk = addMonthsAnchored(anchorMonthDate, -i).slice(0, 7);
    monthlyMap.set(mk, { actualCollectedVnd: 0, paymentCount: 0 });
  }

  const actualCollectedByService = new Map<string, number>();
  const orderById = new Map(orders.map((o) => [o.id, o]));

  for (const p of activeScopedPayments) {
    const amt = toIntVnd(p.amountVnd);
    actualCollectedTotalVnd += amt;
    const mk = p.paidDate.slice(0, 7);
    if (mk === currentMonthKey) {
      actualCollectedMonthVnd += amt;
    }
    const existingMonth = monthlyMap.get(mk);
    if (existingMonth) {
      existingMonth.actualCollectedVnd += amt;
      existingMonth.paymentCount += 1;
    } else {
      monthlyMap.set(mk, { actualCollectedVnd: amt, paymentCount: 1 });
    }

    const ord = orderById.get(p.orderId);
    if (ord) {
      actualCollectedByService.set(
        ord.serviceId,
        (actualCollectedByService.get(ord.serviceId) ?? 0) + amt
      );
    }
  }

  const monthlyCashSeries: AiMonthlyCashPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, val]) => ({
      monthKey,
      label: formatVnMonth(monthKey),
      actualCollectedVnd: val.actualCollectedVnd,
      paymentCount: val.paymentCount,
    }));

  // Service statistics
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const serviceStatMap = new Map<string, AiServiceStatRow>();
  for (const os of filteredOrderSummaries) {
    const sid = os.order.serviceId;
    const svc = serviceById.get(sid);
    let row = serviceStatMap.get(sid);
    if (!row) {
      row = {
        serviceId: sid,
        serviceName: svc?.name || os.order.serviceNameSnapshot,
        billingType: os.order.billingType,
        totalOrderCount: 0,
        activeOrderCount: 0,
        dueUpToAsOfDateVnd: 0,
        actualCollectedVnd: actualCollectedByService.get(sid) ?? 0,
        debtUpToAsOfDateVnd: 0,
        prepaidVnd: 0,
      };
      serviceStatMap.set(sid, row);
    }
    row.totalOrderCount += 1;
    if (os.isActive) row.activeOrderCount += 1;
    row.dueUpToAsOfDateVnd += os.dueUpToAsOfDateVnd;
    row.debtUpToAsOfDateVnd += os.debtUpToAsOfDateVnd;
    row.prepaidVnd += os.prepaidVnd;
  }

  const serviceStats = Array.from(serviceStatMap.values()).sort(
    (a, b) => b.actualCollectedVnd - a.actualCollectedVnd || b.totalOrderCount - a.totalOrderCount
  );

  // Customers with remaining debt
  const debtorCustomers = customerSummaries
    .filter((cs) => cs.debtUpToAsOfDateVnd > 0)
    .sort((a, b) => b.debtUpToAsOfDateVnd - a.debtUpToAsOfDateVnd);

  // Due today or within next 7 days (0 <= daysUntilDue <= 7)
  const dueSoonItems: AiDueAlertItem[] = [];
  const expiringServices: AiExpiringServiceItem[] = [];

  for (const os of filteredOrderSummaries) {
    const cust = customerMap.get(os.order.customerId);
    const customerName = cust?.fullName || os.order.customerCodeSnapshot;
    const customerCode = cust?.customerCode || os.order.customerCodeSnapshot;

    for (const period of os.periods) {
      if (period.remainingVnd <= 0) continue;
      const daysUntilDue = diffDaysIso(asOfDate, period.dueDate);
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        dueSoonItems.push({
          orderId: os.order.id,
          orderCode: os.order.orderCode,
          customerId: os.order.customerId,
          customerName,
          customerCode,
          serviceName: os.order.serviceNameSnapshot,
          accountSlot: os.order.accountSlot,
          periodNumber: period.periodNumber,
          dueDate: period.dueDate,
          remainingVnd: period.remainingVnd,
          daysUntilDue,
          isDueToday: daysUntilDue === 0,
        });
      }
    }

    // Expiring services within 7 days (including today) — distinct from payment due date!
    if (!os.isStopped && os.serviceExpiryDate) {
      const daysUntilExpiry = diffDaysIso(asOfDate, os.serviceExpiryDate);
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
        expiringServices.push({
          orderId: os.order.id,
          orderCode: os.order.orderCode,
          customerId: os.order.customerId,
          customerName,
          customerCode,
          serviceName: os.order.serviceNameSnapshot,
          accountSlot: os.order.accountSlot,
          serviceExpiryDate: os.serviceExpiryDate,
          daysUntilExpiry,
          billingType: os.order.billingType,
        });
      }
    }
  }

  dueSoonItems.sort((a, b) => a.daysUntilDue - b.daysUntilDue || b.remainingVnd - a.remainingVnd);
  expiringServices.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const totalActiveCustomers = customers.filter((c) => c.status === "active").length;
  const totalArchivedCustomers = customers.filter((c) => c.status === "archived").length;

  return {
    asOfDate,
    totalActiveCustomers,
    totalArchivedCustomers,
    activeOrderCount,
    pendingDeliveryCount,
    actualCollectedMonthVnd,
    actualCollectedTotalVnd,
    dueUpToAsOfDateVnd,
    debtUpToAsOfDateVnd,
    prepaidVnd,
    overdueOrderCount,
    monthlyCashSeries,
    serviceStats,
    debtorCustomers,
    dueSoonItems,
    expiringServices,
  };
}

export const BILLING_STATUS_META: Record<
  AiBillingStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  paid: {
    label: "Đã thanh toán",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
  },
  partial: {
    label: "Thanh toán một phần",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-500",
  },
  upcoming: {
    label: "Chưa đến hạn",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
    dotClass: "bg-sky-500",
  },
  overdue: {
    label: "Quá hạn",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    dotClass: "bg-rose-500",
  },
  stopped: {
    label: "Đã dừng",
    badgeClass:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
  },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Chuyển khoản",
  cash: "Tiền mặt",
  momo: "MoMo",
  zalopay: "ZaloPay",
  dktest_wallet: "Ví DkTEST",
  other: "Khác",
};
