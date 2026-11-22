export type AiBillingType = "one_time" | "monthly";

export type AiDurationUnit = "days" | "months";

export type AiServiceStatus = "active" | "discontinued";

export type AiCustomerStatus = "active" | "archived";

export type AiOrderSource = "admin_manual" | "student_auto" | "excel_import";

export type AiOrderFulfillmentStatus = "pending_delivery" | "delivered";

export type AiPaymentMethod =
  | "bank_transfer"
  | "cash"
  | "momo"
  | "zalopay"
  | "dktest_wallet"
  | "other";

export type AiPaymentStatus = "active" | "voided";

/**
 * Period & order display status values.
 * UI renders Vietnamese labels & distinct colors for each state:
 * - paid: Đã thanh toán
 * - partial: Thanh toán một phần
 * - upcoming: Chưa đến hạn
 * - overdue: Quá hạn
 * - stopped: Đã dừng
 */
export type AiBillingStatus =
  | "paid"
  | "partial"
  | "upcoming"
  | "overdue"
  | "stopped";

export type AiServiceCategoryKey =
  | "chatgpt"
  | "gemini_pro_3m"
  | "gemini_plus_6m"
  | "gemini_pro_fam"
  | "yt_pre"
  | "verify_student"
  | "other";

export interface AiOrderAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size?: number;
  uploadedAt: string;
}

export interface AiServiceItem {
  id: string;
  code: string;
  name: string;
  /** Storefront grouping category (e.g. CHAT GPT, Gemini Pro 3M, Gemini Pro (Add Fam)...) */
  categoryKey?: AiServiceCategoryKey;
  categoryLabel?: string;
  /** Variant label shown inside the category picker (e.g. "Sài riêng", "Dùng chung", "Link Offer", "Pay hộ") */
  variantLabel?: string;
  /** Whether student checkout MUST collect an email address to upgrade */
  requiresUpgradeEmail?: boolean;
  billingType: AiBillingType;
  /** Default price for cycle 1 in integer VND. Null means price not set -> must be entered when creating order. */
  defaultFirstPriceVnd: number | null;
  /** Default price for cycle 2+ (monthly only) in integer VND. Null means must be entered when creating monthly order. */
  defaultRecurringPriceVnd: number | null;
  durationValue: number | null;
  durationUnit: AiDurationUnit | null;
  conditions: string;
  status: AiServiceStatus;
  /** Whether students can see and auto-buy this service on /student/ai-shop */
  studentVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiCustomer {
  id: string;
  customerCode: string;
  fullName: string;
  phoneZalo: string;
  email: string;
  otherContact?: string;
  note: string;
  /** Firebase Auth UID if linked to a DkTEST student account */
  linkedUid?: string | null;
  status: AiCustomerStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface AiOrder {
  id: string;
  orderCode: string;
  customerId: string;
  customerCodeSnapshot: string;
  linkedUid?: string | null;
  serviceId: string;
  /** Snapshot of service name & conditions at order creation/confirmed change */
  serviceNameSnapshot: string;
  serviceConditionsSnapshot: string;
  /** Delivered account email or slot identifier ONLY — NEVER store passwords */
  accountSlot: string;
  quantity: number;
  /** Business start/purchase date YYYY-MM-DD (Asia/Ho_Chi_Minh) */
  startDate: string;
  /** Optional stop date YYYY-MM-DD (Asia/Ho_Chi_Minh). No charges generated with dueDate >= stopDate */
  stopDate: string | null;
  billingType: AiBillingType;
  /** Locked price per unit for period 1 in integer VND */
  firstCyclePriceVnd: number;
  /** Locked price per unit for period 2+ (monthly) in integer VND */
  recurringPriceVnd: number | null;
  durationValue: number | null;
  durationUnit: AiDurationUnit | null;
  note: string;
  /** Required Zalo phone number provided at checkout */
  contactPhoneZalo?: string;
  /** Required target email to upgrade for Gemini Pro (Add Fam), Yt Pre, Verify Student */
  targetUpgradeEmail?: string;
  /** Delivery note written by Admin when completing the order */
  adminDeliveryNote?: string;
  /** Images or files attached by Admin when completing the order (Cloudinary URLs) */
  adminAttachments?: AiOrderAttachment[];
  deliveredAt?: string | null;
  /** Unread notification flag on student side when Admin finishes delivering an order */
  studentNotificationUnread?: boolean;
  studentNotificationReadAt?: string | null;
  /** True when student opted to cancel renewal of a monthly slot subscription */
  autoRenewCancelled?: boolean;
  autoRenewCancelledAt?: string | null;
  autoRenewCancelReason?: string;
  source: AiOrderSource;
  fulfillmentStatus: AiOrderFulfillmentStatus;
  importRowKey?: string | null;
  idempotencyKey?: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiPayment {
  id: string;
  paymentCode: string;
  orderId: string;
  customerId: string;
  linkedUid?: string | null;
  /** Business payment date YYYY-MM-DD (Asia/Ho_Chi_Minh) */
  paidDate: string;
  /** Positive integer VND */
  amountVnd: number;
  method: AiPaymentMethod;
  note: string;
  status: AiPaymentStatus;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedByUid?: string | null;
  walletTransactionId?: string | null;
  idempotencyKey?: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export type AiAuditAction =
  | "service_seed"
  | "service_create"
  | "service_update"
  | "customer_create"
  | "customer_update"
  | "customer_archive"
  | "customer_restore"
  | "customer_delete"
  | "order_create"
  | "order_update"
  | "order_service_change"
  | "order_stop"
  | "order_deliver"
  | "payment_create"
  | "payment_update"
  | "payment_void"
  | "student_auto_purchase"
  | "student_auto_renew"
  | "excel_import";

export interface AiAuditLog {
  id: string;
  action: AiAuditAction;
  entityType: "service" | "customer" | "order" | "payment" | "import";
  entityId: string;
  actorUid: string;
  actorName: string;
  summary: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  createdAt: string;
}

export interface AiBillingPeriod {
  /** Deterministic key `${orderId}__P${periodNumber}` */
  periodKey: string;
  orderId: string;
  periodNumber: number;
  dueDate: string; // YYYY-MM-DD
  /** Service coverage end date for this period (distinct from dueDate) */
  coverageEndDate: string | null; // YYYY-MM-DD
  amountVnd: number;
  allocatedVnd: number;
  remainingVnd: number;
  /** Whether dueDate <= asOfDate */
  isDue: boolean;
  /** Strictly dueDate < asOfDate && remainingVnd > 0 */
  isOverdue: boolean;
  /** dueDate === asOfDate && remainingVnd > 0 */
  isDueToday: boolean;
  status: AiBillingStatus;
}

export interface AiOrderFinancialSummary {
  order: AiOrder;
  periods: AiBillingPeriod[];
  /** Sum of period amounts with dueDate <= asOfDate */
  dueUpToAsOfDateVnd: number;
  /** Sum of active payment amounts for this order */
  totalPaidVnd: number;
  /** Portion of totalPaidVnd used for periods with dueDate <= asOfDate */
  allocatedToDueVnd: number;
  /** Remaining unpaid portion of periods with dueDate <= asOfDate */
  debtUpToAsOfDateVnd: number;
  /** Money already received for this order not yet used by periods due <= asOfDate */
  prepaidVnd: number;
  /** True if at least one period has dueDate < asOfDate && remainingVnd > 0 */
  hasOverdue: boolean;
  /** True if order.stopDate && order.stopDate <= asOfDate */
  isStopped: boolean;
  /** True if order is currently active (not stopped as of asOfDate) */
  isActive: boolean;
  /** Overall display status */
  status: AiBillingStatus;
  /** Next due date with remainingVnd > 0 (or upcoming cycle dueDate) */
  nextDueDate: string | null;
  nextDueAmountVnd: number;
  /** Distinct service expiry date (based on package duration or stop date) */
  serviceExpiryDate: string | null;
  /** Number of active payments linked to this order */
  activePaymentCount: number;
}

export interface AiCustomerFinancialSummary {
  customer: AiCustomer;
  orders: AiOrderFinancialSummary[];
  activeOrderCount: number;
  totalOrderCount: number;
  dueUpToAsOfDateVnd: number;
  totalPaidVnd: number;
  /** Sum of debt across individual orders (NEVER offset against prepaid on other orders) */
  debtUpToAsOfDateVnd: number;
  /** Sum of prepaid across individual orders (NEVER offset against debt on other orders) */
  prepaidVnd: number;
  hasOverdue: boolean;
  overdueOrderCount: number;
  activePaymentCount: number;
}

export interface AiMonthlyCashPoint {
  monthKey: string; // YYYY-MM
  label: string; // MM/YYYY
  actualCollectedVnd: number;
  paymentCount: number;
}

export interface AiServiceStatRow {
  serviceId: string;
  serviceName: string;
  billingType: AiBillingType;
  totalOrderCount: number;
  activeOrderCount: number;
  dueUpToAsOfDateVnd: number;
  actualCollectedVnd: number;
  debtUpToAsOfDateVnd: number;
  prepaidVnd: number;
}

export interface AiDueAlertItem {
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  serviceName: string;
  accountSlot: string;
  periodNumber: number;
  dueDate: string;
  remainingVnd: number;
  daysUntilDue: number;
  isDueToday: boolean;
}

export interface AiExpiringServiceItem {
  orderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  serviceName: string;
  accountSlot: string;
  serviceExpiryDate: string;
  daysUntilExpiry: number;
  billingType: AiBillingType;
}

export interface AiDashboardSummary {
  asOfDate: string;
  totalActiveCustomers: number;
  totalArchivedCustomers: number;
  activeOrderCount: number;
  pendingDeliveryCount: number;
  /** Actual cash received in asOfDate's month (strictly by payment.paidDate) */
  actualCollectedMonthVnd: number;
  /** Actual cash received across selected date range or all time */
  actualCollectedTotalVnd: number;
  dueUpToAsOfDateVnd: number;
  debtUpToAsOfDateVnd: number;
  prepaidVnd: number;
  overdueOrderCount: number;
  monthlyCashSeries: AiMonthlyCashPoint[];
  serviceStats: AiServiceStatRow[];
  debtorCustomers: AiCustomerFinancialSummary[];
  dueSoonItems: AiDueAlertItem[];
  expiringServices: AiExpiringServiceItem[];
}

export interface AiShopBootstrapPayload {
  services: AiServiceItem[];
  customers: AiCustomer[];
  orders: AiOrder[];
  payments: AiPayment[];
  auditLogs: AiAuditLog[];
}
