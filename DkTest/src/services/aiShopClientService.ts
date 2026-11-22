import { api } from "./apiClient";
import type {
  AiCustomer,
  AiOrder,
  AiOrderAttachment,
  AiPayment,
  AiPaymentMethod,
  AiServiceItem,
  AiShopBootstrapPayload,
} from "../types/aiShop";

export function makeIdempotencyKey(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

// ---------------------------------------------------------------------------
// ADMIN API CALLS
// ---------------------------------------------------------------------------

export async function fetchAdminAiShopBootstrap(force = false): Promise<AiShopBootstrapPayload> {
  const res = await api.get<{ success: boolean } & AiShopBootstrapPayload>(
    `/api/admin/ai-shop/bootstrap${force ? "?force=true" : ""}`
  );
  return {
    services: res.services || [],
    customers: res.customers || [],
    orders: res.orders || [],
    payments: res.payments || [],
    auditLogs: res.auditLogs || [],
  };
}

export async function seedInitialAiServicesApi(): Promise<AiServiceItem[]> {
  const res = await api.post<{ success: boolean; services: AiServiceItem[] }>(
    "/api/admin/ai-shop/services/seed"
  );
  return res.services || [];
}

export async function createAiServiceApi(payload: {
  code?: string;
  name: string;
  billingType: "one_time" | "monthly";
  defaultFirstPriceVnd: number | null;
  defaultRecurringPriceVnd: number | null;
  durationValue: number | null;
  durationUnit: "days" | "months" | null;
  conditions: string;
  studentVisible: boolean;
  sortOrder?: number;
}): Promise<AiServiceItem> {
  const res = await api.post<{ success: boolean; service: AiServiceItem }>(
    "/api/admin/ai-shop/services",
    payload
  );
  return res.service;
}

export async function updateAiServiceApi(
  id: string,
  payload: Partial<{
    code: string;
    name: string;
    billingType: "one_time" | "monthly";
    defaultFirstPriceVnd: number | null;
    defaultRecurringPriceVnd: number | null;
    durationValue: number | null;
    durationUnit: "days" | "months" | null;
    conditions: string;
    status: "active" | "discontinued";
    studentVisible: boolean;
    sortOrder: number;
  }>
): Promise<AiServiceItem> {
  const res = await api.patch<{ success: boolean; service: AiServiceItem }>(
    `/api/admin/ai-shop/services/${encodeURIComponent(id)}`,
    payload
  );
  return res.service;
}

export async function createAiCustomerApi(payload: {
  fullName: string;
  phoneZalo?: string;
  email?: string;
  otherContact?: string;
  note?: string;
  idempotencyKey: string;
}): Promise<AiCustomer> {
  const res = await api.post<{ success: boolean; customer: AiCustomer }>(
    "/api/admin/ai-shop/customers",
    payload
  );
  return res.customer;
}

export async function updateAiCustomerApi(
  id: string,
  payload: {
    fullName?: string;
    phoneZalo?: string;
    email?: string;
    otherContact?: string;
    note?: string;
  }
): Promise<AiCustomer> {
  const res = await api.patch<{ success: boolean; customer: AiCustomer }>(
    `/api/admin/ai-shop/customers/${encodeURIComponent(id)}`,
    payload
  );
  return res.customer;
}

export async function archiveAiCustomerApi(id: string, archive: boolean): Promise<AiCustomer> {
  const res = await api.post<{ success: boolean; customer: AiCustomer }>(
    `/api/admin/ai-shop/customers/${encodeURIComponent(id)}/archive`,
    { archive }
  );
  return res.customer;
}

export async function deleteAiCustomerApi(id: string): Promise<void> {
  await api.delete(`/api/admin/ai-shop/customers/${encodeURIComponent(id)}`);
}

export async function createAiOrderApi(payload: {
  customerId: string;
  serviceId: string;
  accountSlot: string;
  quantity: number;
  startDate: string;
  stopDate: string | null;
  billingType: "one_time" | "monthly";
  firstCyclePriceVnd: number;
  recurringPriceVnd: number | null;
  durationValue: number | null;
  durationUnit: "days" | "months" | null;
  note: string;
  fulfillmentStatus?: "pending_delivery" | "delivered";
  idempotencyKey: string;
}): Promise<AiOrder> {
  const res = await api.post<{ success: boolean; order: AiOrder }>(
    "/api/admin/ai-shop/orders",
    payload
  );
  return res.order;
}

export async function updateAiOrderApi(
  id: string,
  payload: Partial<{
    serviceId: string;
    confirmServiceChange: boolean;
    accountSlot: string;
    quantity: number;
    startDate: string;
    stopDate: string | null;
    billingType: "one_time" | "monthly";
    firstCyclePriceVnd: number;
    recurringPriceVnd: number | null;
    durationValue: number | null;
    durationUnit: "days" | "months" | null;
    note: string;
    contactPhoneZalo: string;
    targetUpgradeEmail: string;
    adminDeliveryNote: string;
    adminAttachments: AiOrderAttachment[];
    fulfillmentStatus: "pending_delivery" | "delivered";
  }>
): Promise<AiOrder> {
  const res = await api.patch<{ success: boolean; order: AiOrder }>(
    `/api/admin/ai-shop/orders/${encodeURIComponent(id)}`,
    payload
  );
  return res.order;
}

export async function createAiPaymentApi(payload: {
  orderId: string;
  paidDate: string;
  amountVnd: number;
  method: AiPaymentMethod;
  note: string;
  idempotencyKey: string;
}): Promise<AiPayment> {
  const res = await api.post<{ success: boolean; payment: AiPayment }>(
    "/api/admin/ai-shop/payments",
    payload
  );
  return res.payment;
}

export async function updateAiPaymentApi(
  id: string,
  payload: Partial<{
    paidDate: string;
    amountVnd: number;
    method: AiPaymentMethod;
    note: string;
  }>
): Promise<AiPayment> {
  const res = await api.patch<{ success: boolean; payment: AiPayment }>(
    `/api/admin/ai-shop/payments/${encodeURIComponent(id)}`,
    payload
  );
  return res.payment;
}

export async function voidAiPaymentApi(id: string, reason: string): Promise<AiPayment> {
  const res = await api.post<{ success: boolean; payment: AiPayment }>(
    `/api/admin/ai-shop/payments/${encodeURIComponent(id)}/void`,
    { reason }
  );
  return res.payment;
}

export async function importAiShopExcelApi(payload: {
  rows: Array<{
    customerCode?: string;
    fullName: string;
    phoneZalo?: string;
    email?: string;
    serviceName: string;
    matchedServiceId?: string | null;
    accountSlot?: string;
    quantity: number;
    startDate: string;
    stopDate?: string | null;
    billingType: "one_time" | "monthly";
    firstCyclePriceVnd: number;
    recurringPriceVnd?: number | null;
    paidAmountVnd?: number;
    paidDate?: string;
    note?: string;
    importRowKey: string;
  }>;
  idempotencyKey: string;
}): Promise<{
  createdCustomers: number;
  createdServices: number;
  createdOrders: number;
  createdPayments: number;
  skippedDuplicateOrders: number;
}> {
  return api.post("/api/admin/ai-shop/import", payload);
}

// ---------------------------------------------------------------------------
// STUDENT STOREFRONT API CALLS
// ---------------------------------------------------------------------------

export async function fetchStudentAiCatalogApi(): Promise<AiServiceItem[]> {
  const res = await api.get<{ success: boolean; services: AiServiceItem[] }>("/api/ai-shop/catalog");
  return res.services || [];
}

export async function fetchStudentAiOrdersApi(): Promise<{
  walletBalanceVnd: number;
  customer: AiCustomer | null;
  orders: AiOrder[];
  payments: AiPayment[];
}> {
  const res = await api.get<{
    success: boolean;
    walletBalanceVnd: number;
    customer: AiCustomer | null;
    orders: AiOrder[];
    payments: AiPayment[];
  }>("/api/ai-shop/my-orders");
  return {
    walletBalanceVnd: res.walletBalanceVnd || 0,
    customer: res.customer || null,
    orders: res.orders || [],
    payments: res.payments || [],
  };
}

export async function studentPurchaseAiServiceApi(payload: {
  serviceId: string;
  quantity: number;
  contactPhoneZalo: string;
  targetUpgradeEmail?: string;
  contactEmail?: string;
  note?: string;
  idempotencyKey: string;
}): Promise<{
  order: AiOrder;
  payment: AiPayment;
  customer: AiCustomer;
  newBalanceVnd: number;
  walletTransactionId: string;
}> {
  return api.post("/api/ai-shop/purchase", payload);
}

export async function ackStudentAiOrderNotificationApi(orderId: string): Promise<AiOrder> {
  const res = await api.post<{ success: boolean; order: AiOrder }>(
    `/api/ai-shop/orders/${encodeURIComponent(orderId)}/ack-notification`
  );
  return res.order;
}

export async function cancelSlotRenewalApi(orderId: string, reason?: string): Promise<AiOrder> {
  const res = await api.post<{ success: boolean; order: AiOrder }>(
    `/api/ai-shop/orders/${encodeURIComponent(orderId)}/cancel-renewal`,
    { reason: reason || "" }
  );
  return res.order;
}

export async function resumeSlotRenewalApi(orderId: string): Promise<AiOrder> {
  const res = await api.post<{ success: boolean; order: AiOrder }>(
    `/api/ai-shop/orders/${encodeURIComponent(orderId)}/resume-renewal`
  );
  return res.order;
}

export async function studentPayAiOrderWalletApi(
  orderId: string,
  payload: {
    amountVnd: number;
    note?: string;
    idempotencyKey: string;
  }
): Promise<{
  payment: AiPayment;
  newBalanceVnd: number;
  walletTransactionId: string;
}> {
  return api.post(`/api/ai-shop/orders/${encodeURIComponent(orderId)}/pay-wallet`, payload);
}
