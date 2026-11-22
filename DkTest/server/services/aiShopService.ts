import { z } from "zod";
import {
  adminDb,
  deleteFirestoreRestDoc,
  getFirestoreRestDoc,
  getFirestoreRestDocs,
  queryFirestoreRestDocs,
  setFirestoreRestDoc,
} from "../firebaseAdmin.js";
import type {
  AiAuditAction,
  AiAuditLog,
  AiCustomer,
  AiOrder,
  AiPayment,
  AiServiceItem,
  AiShopBootstrapPayload,
} from "../../src/types/aiShop.js";
import type { StudentWallet, WalletTransaction } from "../../src/types/index.js";
import {
  buildSeedServiceRecords,
  resolveServiceStorefrontMeta,
} from "../../src/services/aiShop/initialCatalog.js";
import {
  addMonthsAnchored,
  computeOrderFinancialSummary,
  getTodayVnDate,
  isValidIsoDate,
  toIntVnd,
} from "../../src/services/aiShop/billingEngine.js";
import { publishDeviceNotification } from "./notificationPushService.js";
import {
  getOrCreateWallet,
  invalidateGlobalSpendingCache,
  invalidateStudentDetailsCache,
  invalidateWalletOverviewCache,
  sanitizeVnd,
} from "./walletService.js";

const COL_SERVICES = "ai_services";
const COL_CUSTOMERS = "ai_customers";
const COL_ORDERS = "ai_orders";
const COL_PAYMENTS = "ai_payments";
const COL_AUDIT_LOGS = "ai_audit_logs";
const COL_IDEMPOTENCY = "ai_idempotency_keys";

const BOOTSTRAP_CACHE_TTL_MS = 30 * 1000;
let bootstrapCache: { data: AiShopBootstrapPayload; ts: number } | null = null;
const inFlightIdempotency = new Map<string, Promise<any>>();

export function invalidateAiShopCache() {
  bootstrapCache = null;
}

// ---------------------------------------------------------------------------
// ZOD VALIDATION SCHEMAS
// ---------------------------------------------------------------------------

const isoDateSchema = z.string().refine(isValidIsoDate, {
  message: "Ngày không hợp lệ (định dạng YYYY-MM-DD).",
});

const nullableIsoDateSchema = z
  .union([isoDateSchema, z.null(), z.literal("")])
  .transform((v) => (v ? v : null));

const intVndSchema = z.number().int().min(0, "Số tiền phải là số nguyên VNĐ không âm.");

const positiveIntVndSchema = z.number().int().min(1, "Số tiền phải lớn hơn 0 VNĐ.");

const nullableIntVndSchema = z.union([intVndSchema, z.null()]);

export const createServiceSchema = z.object({
  code: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(2, "Tên dịch vụ phải có ít nhất 2 ký tự.").max(140),
  billingType: z.enum(["one_time", "monthly"]),
  defaultFirstPriceVnd: nullableIntVndSchema,
  defaultRecurringPriceVnd: nullableIntVndSchema.optional().default(null),
  durationValue: z.union([z.number().int().min(1).max(3650), z.null()]).optional().default(null),
  durationUnit: z.union([z.enum(["days", "months"]), z.null()]).optional().default(null),
  conditions: z.string().trim().max(1000).optional().default(""),
  status: z.enum(["active", "discontinued"]).optional().default("active"),
  studentVisible: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(100),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập tên khách hàng.").max(140),
  phoneZalo: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  otherContact: z.string().trim().max(160).optional().default(""),
  note: z.string().trim().max(1000).optional().default(""),
  linkedUid: z.string().trim().max(128).nullable().optional().default(null),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Tên khách hàng không được để trống.").max(140).optional(),
  phoneZalo: z.string().trim().max(80).optional(),
  email: z.string().trim().max(160).optional(),
  otherContact: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().trim().min(1, "Vui lòng chọn khách hàng."),
  serviceId: z.string().trim().min(1, "Vui lòng chọn dịch vụ."),
  accountSlot: z.string().trim().max(240).optional().default(""),
  quantity: z.number().int().min(1, "Số lượng phải tối thiểu là 1.").max(999).default(1),
  startDate: isoDateSchema,
  stopDate: nullableIsoDateSchema.optional().default(null),
  billingType: z.enum(["one_time", "monthly"]),
  firstCyclePriceVnd: intVndSchema,
  recurringPriceVnd: nullableIntVndSchema.optional().default(null),
  durationValue: z.union([z.number().int().min(1).max(3650), z.null()]).optional().default(null),
  durationUnit: z.union([z.enum(["days", "months"]), z.null()]).optional().default(null),
  note: z.string().trim().max(1000).optional().default(""),
  fulfillmentStatus: z.enum(["pending_delivery", "delivered"]).optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
});

const orderAttachmentSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().url("Đường dẫn tệp đính kèm không hợp lệ.").max(2048),
  mimeType: z.string().trim().max(120).default("application/octet-stream"),
  size: z.number().int().min(0).optional(),
  uploadedAt: z.string().trim().max(60),
});

export const updateOrderSchema = z.object({
  serviceId: z.string().trim().min(1).optional(),
  confirmServiceChange: z.boolean().optional(),
  accountSlot: z.string().trim().max(240).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
  startDate: isoDateSchema.optional(),
  stopDate: nullableIsoDateSchema.optional(),
  billingType: z.enum(["one_time", "monthly"]).optional(),
  firstCyclePriceVnd: intVndSchema.optional(),
  recurringPriceVnd: nullableIntVndSchema.optional(),
  durationValue: z.union([z.number().int().min(1).max(3650), z.null()]).optional(),
  durationUnit: z.union([z.enum(["days", "months"]), z.null()]).optional(),
  note: z.string().trim().max(1000).optional(),
  contactPhoneZalo: z.string().trim().max(80).optional(),
  targetUpgradeEmail: z.string().trim().max(160).optional(),
  adminDeliveryNote: z.string().trim().max(2000).optional(),
  adminAttachments: z.array(orderAttachmentSchema).max(10).optional(),
  fulfillmentStatus: z.enum(["pending_delivery", "delivered"]).optional(),
});

export const createPaymentSchema = z.object({
  orderId: z.string().trim().min(1, "Vui lòng chọn đơn hàng."),
  paidDate: isoDateSchema,
  amountVnd: positiveIntVndSchema,
  method: z.enum(["bank_transfer", "cash", "momo", "zalopay", "dktest_wallet", "other"]),
  note: z.string().trim().max(1000).optional().default(""),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export const updatePaymentSchema = z.object({
  paidDate: isoDateSchema.optional(),
  amountVnd: positiveIntVndSchema.optional(),
  method: z.enum(["bank_transfer", "cash", "momo", "zalopay", "dktest_wallet", "other"]).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(2, "Vui lòng nhập lý do hủy giao dịch.").max(500),
});

export const studentPurchaseSchema = z.object({
  serviceId: z.string().trim().min(1, "Vui lòng chọn dịch vụ."),
  quantity: z.number().int().min(1).max(10).default(1),
  contactPhoneZalo: z
    .string()
    .trim()
    .min(8, "Vui lòng nhập số điện thoại Zalo hợp lệ (tối thiểu 8 ký tự).")
    .max(80),
  targetUpgradeEmail: z.string().trim().max(160).optional().default(""),
  contactEmail: z.string().trim().max(160).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  idempotencyKey: z.string().trim().min(6, "Thiếu khóa chống gửi trùng.").max(120),
});

export const studentRenewOrderSchema = z.object({
  amountVnd: positiveIntVndSchema,
  note: z.string().trim().max(400).optional().default(""),
  idempotencyKey: z.string().trim().min(6, "Thiếu khóa chống gửi trùng.").max(120),
});

export const excelImportRowSchema = z.object({
  customerCode: z.string().trim().max(40).optional().default(""),
  fullName: z.string().trim().min(1).max(140),
  phoneZalo: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  serviceName: z.string().trim().min(1).max(140),
  matchedServiceId: z.string().trim().nullable().optional().default(null),
  accountSlot: z.string().trim().max(240).optional().default(""),
  quantity: z.number().int().min(1).max(999).default(1),
  startDate: isoDateSchema,
  stopDate: nullableIsoDateSchema.optional().default(null),
  billingType: z.enum(["one_time", "monthly"]),
  firstCyclePriceVnd: intVndSchema,
  recurringPriceVnd: nullableIntVndSchema.optional().default(null),
  paidAmountVnd: intVndSchema.optional().default(0),
  paidDate: isoDateSchema.optional(),
  note: z.string().trim().max(1000).optional().default(""),
  importRowKey: z.string().trim().min(4).max(120),
});

export const excelImportPayloadSchema = z.object({
  rows: z.array(excelImportRowSchema).min(1).max(500),
  idempotencyKey: z.string().trim().max(120).optional(),
});

// ---------------------------------------------------------------------------
// LOW-LEVEL FIRESTORE HELPERS (Admin SDK + REST Fallback)
// ---------------------------------------------------------------------------

async function listCollection<T>(col: string): Promise<T[]> {
  if (adminDb) {
    const snap = await adminDb.collection(col).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  }
  const docs = await getFirestoreRestDocs(col, 1000, false);
  return docs as T[];
}

async function getDocById<T>(col: string, id: string): Promise<T | null> {
  if (adminDb) {
    const snap = await adminDb.collection(col).doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as T) : null;
  }
  const doc = await getFirestoreRestDoc(col, id, false);
  return doc ? ({ id, ...doc } as T) : null;
}

async function saveDoc(col: string, id: string, data: Record<string, any>): Promise<void> {
  if (adminDb) {
    await adminDb.collection(col).doc(id).set(data, { merge: false });
  } else {
    await setFirestoreRestDoc(col, id, data);
  }
}

async function removeDoc(col: string, id: string): Promise<void> {
  if (adminDb) {
    await adminDb.collection(col).doc(id).delete();
  } else {
    await deleteFirestoreRestDoc(col, id);
  }
}

async function queryByField<T>(col: string, field: string, value: string): Promise<T[]> {
  if (adminDb) {
    const snap = await adminDb.collection(col).where(field, "==", value).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  }
  const docs = await queryFirestoreRestDocs(col, field, value, 500, false);
  return docs as T[];
}

function makeShortId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nextCustomerCode(existing: AiCustomer[]): string {
  let maxNum = 0;
  for (const c of existing) {
    const m = /^KH(\d+)$/i.exec(c.customerCode || "");
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  }
  return `KH${String(maxNum + 1).padStart(4, "0")}`;
}

function makeOrderCode(todayVn: string, existingCount: number): string {
  const compact = todayVn.replace(/-/g, "").slice(2); // YYMMDD
  const seq = String(existingCount + 1).padStart(3, "0");
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `DH${compact}-${seq}${rand}`;
}

function makePaymentCode(todayVn: string, existingCount: number): string {
  const compact = todayVn.replace(/-/g, "").slice(2);
  const seq = String(existingCount + 1).padStart(3, "0");
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `TT${compact}-${seq}${rand}`;
}

function makeServiceCode(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 20);
  return slug || `SVC-${Date.now().toString(36).toUpperCase()}`;
}

async function writeAuditLog(params: {
  action: AiAuditAction;
  entityType: AiAuditLog["entityType"];
  entityId: string;
  actorUid: string;
  actorName: string;
  summary: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
}) {
  const id = makeShortId("alog");
  const record: AiAuditLog = {
    id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    actorUid: params.actorUid,
    actorName: params.actorName || "Quản trị viên",
    summary: params.summary,
    before: params.before ?? null,
    after: params.after ?? null,
    createdAt: new Date().toISOString(),
  };
  await saveDoc(COL_AUDIT_LOGS, id, record);
}

async function withIdempotency<T>(
  key: string | undefined,
  scope: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!key || !key.trim()) {
    return fn();
  }
  const safeKey = `${scope}_${key.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}`;

  const existingPromise = inFlightIdempotency.get(safeKey);
  if (existingPromise) {
    return existingPromise;
  }

  const stored = await getDocById<{ result: T }>(COL_IDEMPOTENCY, safeKey);
  if (stored && stored.result !== undefined) {
    return stored.result;
  }

  const runPromise = (async () => {
    try {
      const result = await fn();
      try {
        await saveDoc(COL_IDEMPOTENCY, safeKey, {
          key: safeKey,
          scope,
          result,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("[aiShopService] Failed to persist idempotency key:", err);
      }
      return result;
    } finally {
      inFlightIdempotency.delete(safeKey);
    }
  })();

  inFlightIdempotency.set(safeKey, runPromise);
  return runPromise;
}

// ---------------------------------------------------------------------------
// SERVICES CATALOG
// ---------------------------------------------------------------------------

export async function ensureInitialServicesSeeded(
  actorUid = "system",
  actorName = "Hệ thống"
): Promise<AiServiceItem[]> {
  const existing = await listCollection<AiServiceItem>(COL_SERVICES);
  if (existing.length > 0) {
    return existing.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }

  const now = new Date().toISOString();
  const seeds = buildSeedServiceRecords(now);
  await Promise.all(seeds.map((svc) => saveDoc(COL_SERVICES, svc.id, svc)));
  await writeAuditLog({
    action: "service_seed",
    entityType: "service",
    entityId: "seed_initial",
    actorUid,
    actorName,
    summary: `Khởi tạo danh mục ban đầu (${seeds.length} dịch vụ AI).`,
  });
  invalidateAiShopCache();
  return seeds;
}

export async function createAiService(
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiServiceItem> {
  const data = createServiceSchema.parse(rawInput);
  const now = new Date().toISOString();
  const id = makeShortId("svc");
  const service: AiServiceItem = {
    id,
    code: data.code || makeServiceCode(data.name),
    name: data.name,
    billingType: data.billingType,
    defaultFirstPriceVnd: data.defaultFirstPriceVnd,
    defaultRecurringPriceVnd:
      data.billingType === "monthly" ? data.defaultRecurringPriceVnd : null,
    durationValue: data.durationValue,
    durationUnit: data.durationValue ? data.durationUnit : null,
    conditions: data.conditions,
    status: data.status,
    studentVisible: data.studentVisible,
    sortOrder: data.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  await saveDoc(COL_SERVICES, id, service);
  await writeAuditLog({
    action: "service_create",
    entityType: "service",
    entityId: id,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Thêm dịch vụ "${service.name}" (${service.billingType === "monthly" ? "Hàng tháng" : "Một lần"}).`,
    after: service,
  });
  invalidateAiShopCache();
  return service;
}

export async function updateAiService(
  serviceId: string,
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiServiceItem> {
  const existing = await getDocById<AiServiceItem>(COL_SERVICES, serviceId);
  if (!existing) {
    throw new Error("Không tìm thấy dịch vụ.");
  }
  const patch = updateServiceSchema.parse(rawInput);
  const nextBillingType = patch.billingType ?? existing.billingType;
  const nextDurationValue =
    patch.durationValue !== undefined ? patch.durationValue : existing.durationValue;
  const updated: AiServiceItem = {
    ...existing,
    ...patch,
    billingType: nextBillingType,
    defaultRecurringPriceVnd:
      nextBillingType === "monthly"
        ? patch.defaultRecurringPriceVnd !== undefined
          ? patch.defaultRecurringPriceVnd
          : existing.defaultRecurringPriceVnd
        : null,
    durationValue: nextDurationValue,
    durationUnit: nextDurationValue
      ? patch.durationUnit !== undefined
        ? patch.durationUnit
        : existing.durationUnit
      : null,
    updatedAt: new Date().toISOString(),
  };

  // IMPORTANT: Updating a service NEVER alters existing orders (price & terms remain snapshotted on old orders).
  await saveDoc(COL_SERVICES, serviceId, updated);
  await writeAuditLog({
    action: "service_update",
    entityType: "service",
    entityId: serviceId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Cập nhật dịch vụ "${updated.name}" (không ảnh hưởng giá các đơn cũ).`,
    before: existing,
    after: updated,
  });
  invalidateAiShopCache();
  return updated;
}

// ---------------------------------------------------------------------------
// ADMIN BOOTSTRAP
// ---------------------------------------------------------------------------

export async function getAdminAiShopBootstrap(force = false): Promise<AiShopBootstrapPayload> {
  const now = Date.now();
  if (!force && bootstrapCache && now - bootstrapCache.ts < BOOTSTRAP_CACHE_TTL_MS) {
    return bootstrapCache.data;
  }

  let services = await listCollection<AiServiceItem>(COL_SERVICES);
  if (services.length === 0) {
    services = await ensureInitialServicesSeeded();
  }

  const [customers, orders, payments, auditLogs] = await Promise.all([
    listCollection<AiCustomer>(COL_CUSTOMERS),
    listCollection<AiOrder>(COL_ORDERS),
    listCollection<AiPayment>(COL_PAYMENTS),
    listCollection<AiAuditLog>(COL_AUDIT_LOGS),
  ]);

  const data: AiShopBootstrapPayload = {
    services: services.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
    customers: customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    orders: orders.sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    payments: payments.sort((a, b) => b.paidDate.localeCompare(a.paidDate) || b.createdAt.localeCompare(a.createdAt)),
    auditLogs: auditLogs
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200),
  };

  bootstrapCache = { data, ts: now };
  return data;
}

// ---------------------------------------------------------------------------
// CUSTOMERS
// ---------------------------------------------------------------------------

export async function createAiCustomer(
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiCustomer> {
  const data = createCustomerSchema.parse(rawInput);
  return withIdempotency(data.idempotencyKey, "cust_create", async () => {
    const existing = await listCollection<AiCustomer>(COL_CUSTOMERS);
    const now = new Date().toISOString();
    const id = makeShortId("cust");
    const customer: AiCustomer = {
      id,
      customerCode: nextCustomerCode(existing),
      fullName: data.fullName,
      phoneZalo: data.phoneZalo,
      email: data.email,
      otherContact: data.otherContact,
      note: data.note,
      linkedUid: data.linkedUid ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await saveDoc(COL_CUSTOMERS, id, customer);
    await writeAuditLog({
      action: "customer_create",
      entityType: "customer",
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Thêm khách hàng ${customer.customerCode} — ${customer.fullName}.`,
      after: customer,
    });
    invalidateAiShopCache();
    return customer;
  });
}

export async function updateAiCustomer(
  customerId: string,
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiCustomer> {
  const existing = await getDocById<AiCustomer>(COL_CUSTOMERS, customerId);
  if (!existing) throw new Error("Không tìm thấy khách hàng.");
  const patch = updateCustomerSchema.parse(rawInput);
  const updated: AiCustomer = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveDoc(COL_CUSTOMERS, customerId, updated);
  await writeAuditLog({
    action: "customer_update",
    entityType: "customer",
    entityId: customerId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Cập nhật thông tin khách ${updated.customerCode} (${updated.fullName}).`,
    before: existing,
    after: updated,
  });
  invalidateAiShopCache();
  return updated;
}

export async function archiveOrRestoreAiCustomer(
  customerId: string,
  archive: boolean,
  actor: { uid: string; displayName?: string }
): Promise<AiCustomer> {
  const existing = await getDocById<AiCustomer>(COL_CUSTOMERS, customerId);
  if (!existing) throw new Error("Không tìm thấy khách hàng.");
  const now = new Date().toISOString();
  const updated: AiCustomer = {
    ...existing,
    status: archive ? "archived" : "active",
    archivedAt: archive ? now : null,
    updatedAt: now,
  };
  await saveDoc(COL_CUSTOMERS, customerId, updated);
  await writeAuditLog({
    action: archive ? "customer_archive" : "customer_restore",
    entityType: "customer",
    entityId: customerId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: archive
      ? `Lưu trữ khách hàng ${updated.customerCode} (${updated.fullName}).`
      : `Khôi phục khách hàng ${updated.customerCode} (${updated.fullName}).`,
    before: { status: existing.status },
    after: { status: updated.status },
  });
  invalidateAiShopCache();
  return updated;
}

export async function deleteAiCustomerSafely(
  customerId: string,
  actor: { uid: string; displayName?: string }
): Promise<{ deleted: true }> {
  const existing = await getDocById<AiCustomer>(COL_CUSTOMERS, customerId);
  if (!existing) throw new Error("Không tìm thấy khách hàng.");

  const [orders, payments] = await Promise.all([
    queryByField<AiOrder>(COL_ORDERS, "customerId", customerId),
    queryByField<AiPayment>(COL_PAYMENTS, "customerId", customerId),
  ]);
  if (orders.length > 0 || payments.length > 0) {
    const err: any = new Error(
      "Không thể xóa vĩnh viễn khách đã có đơn hàng hoặc giao dịch. Vui lòng chọn Lưu trữ để bảo toàn lịch sử."
    );
    err.statusCode = 409;
    throw err;
  }

  await removeDoc(COL_CUSTOMERS, customerId);
  await writeAuditLog({
    action: "customer_delete",
    entityType: "customer",
    entityId: customerId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Xóa khách hàng chưa phát sinh giao dịch ${existing.customerCode} (${existing.fullName}).`,
    before: existing,
  });
  invalidateAiShopCache();
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

export async function createAiOrder(
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiOrder> {
  const data = createOrderSchema.parse(rawInput);
  if (data.billingType === "monthly" && data.recurringPriceVnd === null) {
    throw new Error("Đơn thu hàng tháng bắt buộc phải nhập giá kỳ sau.");
  }

  return withIdempotency(data.idempotencyKey, "order_create", async () => {
    const [customer, service, existingOrders] = await Promise.all([
      getDocById<AiCustomer>(COL_CUSTOMERS, data.customerId),
      getDocById<AiServiceItem>(COL_SERVICES, data.serviceId),
      listCollection<AiOrder>(COL_ORDERS),
    ]);

    if (!customer) throw new Error("Khách hàng không tồn tại.");
    if (!service) throw new Error("Dịch vụ không tồn tại.");

    const now = new Date().toISOString();
    const todayVn = getTodayVnDate();
    const id = makeShortId("ord");
    const order: AiOrder = {
      id,
      orderCode: makeOrderCode(todayVn, existingOrders.length),
      customerId: customer.id,
      customerCodeSnapshot: customer.customerCode,
      linkedUid: customer.linkedUid ?? null,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      serviceConditionsSnapshot: service.conditions,
      accountSlot: data.accountSlot,
      quantity: data.quantity,
      startDate: data.startDate,
      stopDate: data.stopDate,
      billingType: data.billingType,
      firstCyclePriceVnd: data.firstCyclePriceVnd,
      recurringPriceVnd: data.billingType === "monthly" ? data.recurringPriceVnd : null,
      durationValue: data.durationValue,
      durationUnit: data.durationValue ? data.durationUnit : null,
      note: data.note,
      source: "admin_manual",
      fulfillmentStatus: data.fulfillmentStatus ?? (data.accountSlot ? "delivered" : "pending_delivery"),
      importRowKey: null,
      idempotencyKey: data.idempotencyKey ?? null,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
    };

    await saveDoc(COL_ORDERS, id, order);
    await writeAuditLog({
      action: "order_create",
      entityType: "order",
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Tạo đơn ${order.orderCode} cho ${customer.fullName} — ${service.name} (${order.firstCyclePriceVnd}đ).`,
      after: order,
    });
    invalidateAiShopCache();
    return order;
  });
}

export async function updateAiOrder(
  orderId: string,
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiOrder> {
  const existing = await getDocById<AiOrder>(COL_ORDERS, orderId);
  if (!existing) throw new Error("Không tìm thấy đơn hàng.");

  const patch = updateOrderSchema.parse(rawInput);

  let serviceNameSnapshot = existing.serviceNameSnapshot;
  let serviceConditionsSnapshot = existing.serviceConditionsSnapshot;
  let action: AiAuditAction = "order_update";

  if (patch.serviceId && patch.serviceId !== existing.serviceId) {
    if (!patch.confirmServiceChange) {
      throw new Error(
        "Đổi dịch vụ trên đơn hàng yêu cầu xác nhận cập nhật giá rõ ràng để tránh sai lệch công nợ."
      );
    }
    const newService = await getDocById<AiServiceItem>(COL_SERVICES, patch.serviceId);
    if (!newService) throw new Error("Dịch vụ mới không tồn tại.");
    serviceNameSnapshot = newService.name;
    serviceConditionsSnapshot = newService.conditions;
    action = "order_service_change";
  }

  const nextBillingType = patch.billingType ?? existing.billingType;
  const nextRecurring =
    nextBillingType === "monthly"
      ? patch.recurringPriceVnd !== undefined
        ? patch.recurringPriceVnd
        : existing.recurringPriceVnd
      : null;

  if (nextBillingType === "monthly" && (nextRecurring === null || nextRecurring === undefined)) {
    throw new Error("Đơn thu hàng tháng bắt buộc phải có giá kỳ sau.");
  }

  const nextAccountSlot = patch.accountSlot !== undefined ? patch.accountSlot : existing.accountSlot;
  const nextAdminDeliveryNote =
    patch.adminDeliveryNote !== undefined ? patch.adminDeliveryNote : existing.adminDeliveryNote || "";
  const nextAdminAttachments =
    patch.adminAttachments !== undefined ? patch.adminAttachments : existing.adminAttachments || [];

  const nextFulfillment =
    patch.fulfillmentStatus ??
    (existing.fulfillmentStatus === "pending_delivery" &&
    (nextAccountSlot.trim().length > 0 || nextAdminDeliveryNote.trim().length > 0 || nextAdminAttachments.length > 0)
      ? "delivered"
      : existing.fulfillmentStatus);

  const justDeliveredOrUpdatedDelivery =
    nextFulfillment === "delivered" &&
    (existing.fulfillmentStatus !== "delivered" ||
      patch.accountSlot !== undefined ||
      patch.adminDeliveryNote !== undefined ||
      patch.adminAttachments !== undefined);

  if (patch.stopDate !== undefined && patch.stopDate !== existing.stopDate && action === "order_update") {
    action = "order_stop";
  } else if (justDeliveredOrUpdatedDelivery && action === "order_update") {
    action = "order_deliver";
  }

  const nextDurationValue =
    patch.durationValue !== undefined ? patch.durationValue : existing.durationValue;

  const nowIso = new Date().toISOString();
  const updated: AiOrder = {
    ...existing,
    serviceId: patch.serviceId ?? existing.serviceId,
    serviceNameSnapshot,
    serviceConditionsSnapshot,
    accountSlot: nextAccountSlot,
    quantity: patch.quantity ?? existing.quantity,
    startDate: patch.startDate ?? existing.startDate,
    stopDate: patch.stopDate !== undefined ? patch.stopDate : existing.stopDate,
    billingType: nextBillingType,
    firstCyclePriceVnd: patch.firstCyclePriceVnd ?? existing.firstCyclePriceVnd,
    recurringPriceVnd: nextRecurring,
    durationValue: nextDurationValue,
    durationUnit: nextDurationValue
      ? patch.durationUnit !== undefined
        ? patch.durationUnit
        : existing.durationUnit
      : null,
    note: patch.note !== undefined ? patch.note : existing.note,
    contactPhoneZalo:
      patch.contactPhoneZalo !== undefined ? patch.contactPhoneZalo : existing.contactPhoneZalo,
    targetUpgradeEmail:
      patch.targetUpgradeEmail !== undefined ? patch.targetUpgradeEmail : existing.targetUpgradeEmail,
    adminDeliveryNote: nextAdminDeliveryNote,
    adminAttachments: nextAdminAttachments,
    fulfillmentStatus: nextFulfillment,
    deliveredAt:
      nextFulfillment === "delivered"
        ? existing.deliveredAt || nowIso
        : existing.deliveredAt ?? null,
    studentNotificationUnread: justDeliveredOrUpdatedDelivery
      ? true
      : existing.studentNotificationUnread ?? false,
    updatedAt: nowIso,
  };

  await saveDoc(COL_ORDERS, orderId, updated);
  await writeAuditLog({
    action,
    entityType: "order",
    entityId: orderId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary:
      action === "order_service_change"
        ? `Đổi dịch vụ đơn ${updated.orderCode}: "${existing.serviceNameSnapshot}" → "${updated.serviceNameSnapshot}" (giá kỳ đầu ${updated.firstCyclePriceVnd}đ).`
        : action === "order_stop"
        ? `Cập nhật ngày dừng đơn ${updated.orderCode}: ${updated.stopDate || "Mở lại đơn"}.`
        : action === "order_deliver"
        ? `Giao tài khoản/slot cho đơn ${updated.orderCode}: ${updated.accountSlot}.`
        : `Cập nhật đơn hàng ${updated.orderCode}.`,
    before: existing,
    after: updated,
  });

  if (justDeliveredOrUpdatedDelivery && updated.linkedUid) {
    await publishDeviceNotification({
      recipientUid: updated.linkedUid,
      type: "ai_order_delivered",
      title: `✅ Đơn ${updated.orderCode} đã xử lý xong!`,
      message:
        updated.adminDeliveryNote ||
        `Admin đã hoàn tất bàn giao "${updated.serviceNameSnapshot}". Bấm để xem tài khoản/slot & tệp đính kèm.`,
      route: "/student/ai-shop",
      actorName: actor.displayName || "Admin",
    });
  }

  invalidateAiShopCache();
  return updated;
}

// ---------------------------------------------------------------------------
// PAYMENTS (CREATE / EDIT / VOID WITH AUDIT TRAIL)
// ---------------------------------------------------------------------------

export async function createAiPayment(
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiPayment> {
  const data = createPaymentSchema.parse(rawInput);

  return withIdempotency(data.idempotencyKey, "pay_create", async () => {
    const [order, existingPayments] = await Promise.all([
      getDocById<AiOrder>(COL_ORDERS, data.orderId),
      listCollection<AiPayment>(COL_PAYMENTS),
    ]);
    if (!order) throw new Error("Không tìm thấy đơn hàng liên quan.");

    const now = new Date().toISOString();
    const id = makeShortId("pay");
    const payment: AiPayment = {
      id,
      paymentCode: makePaymentCode(data.paidDate, existingPayments.length),
      orderId: order.id,
      customerId: order.customerId,
      linkedUid: order.linkedUid ?? null,
      paidDate: data.paidDate,
      amountVnd: data.amountVnd,
      method: data.method,
      note: data.note,
      status: "active",
      voidReason: null,
      voidedAt: null,
      voidedByUid: null,
      walletTransactionId: null,
      idempotencyKey: data.idempotencyKey ?? null,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
    };

    await saveDoc(COL_PAYMENTS, id, payment);
    await writeAuditLog({
      action: "payment_create",
      entityType: "payment",
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Thu ${payment.amountVnd}đ cho đơn ${order.orderCode} ngày ${payment.paidDate} (${payment.method}).`,
      after: payment,
    });
    invalidateAiShopCache();
    return payment;
  });
}

export async function updateAiPayment(
  paymentId: string,
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiPayment> {
  const existing = await getDocById<AiPayment>(COL_PAYMENTS, paymentId);
  if (!existing) throw new Error("Không tìm thấy giao dịch thu tiền.");
  if (existing.status === "voided") {
    throw new Error("Không thể chỉnh sửa giao dịch đã hủy.");
  }

  const patch = updatePaymentSchema.parse(rawInput);
  const updated: AiPayment = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await saveDoc(COL_PAYMENTS, paymentId, updated);
  await writeAuditLog({
    action: "payment_update",
    entityType: "payment",
    entityId: paymentId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Sửa giao dịch ${updated.paymentCode}: ${existing.amountVnd}đ → ${updated.amountVnd}đ (${updated.paidDate}).`,
    before: existing,
    after: updated,
  });
  invalidateAiShopCache();
  return updated;
}

export async function voidAiPayment(
  paymentId: string,
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<AiPayment> {
  const existing = await getDocById<AiPayment>(COL_PAYMENTS, paymentId);
  if (!existing) throw new Error("Không tìm thấy giao dịch thu tiền.");
  if (existing.status === "voided") {
    return existing;
  }

  const { reason } = voidPaymentSchema.parse(rawInput);
  const now = new Date().toISOString();
  const updated: AiPayment = {
    ...existing,
    status: "voided",
    voidReason: reason,
    voidedAt: now,
    voidedByUid: actor.uid,
    updatedAt: now,
  };

  await saveDoc(COL_PAYMENTS, paymentId, updated);
  await writeAuditLog({
    action: "payment_void",
    entityType: "payment",
    entityId: paymentId,
    actorUid: actor.uid,
    actorName: actor.displayName || "Admin",
    summary: `Hủy giao dịch ${updated.paymentCode} (${updated.amountVnd}đ). Lý do: ${reason}`,
    before: existing,
    after: updated,
  });
  invalidateAiShopCache();
  return updated;
}

// ---------------------------------------------------------------------------
// EXCEL BATCH IMPORT (DEDUPLICATED)
// ---------------------------------------------------------------------------

export async function importAiShopExcelRows(
  rawInput: unknown,
  actor: { uid: string; displayName?: string }
): Promise<{
  createdCustomers: number;
  createdServices: number;
  createdOrders: number;
  createdPayments: number;
  skippedDuplicateOrders: number;
}> {
  const data = excelImportPayloadSchema.parse(rawInput);

  return withIdempotency(data.idempotencyKey, "excel_import", async () => {
    const [customers, services, orders, payments] = await Promise.all([
      listCollection<AiCustomer>(COL_CUSTOMERS),
      listCollection<AiServiceItem>(COL_SERVICES),
      listCollection<AiOrder>(COL_ORDERS),
      listCollection<AiPayment>(COL_PAYMENTS),
    ]);

    const norm = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

    const customerByCode = new Map<string, AiCustomer>();
    const customerByPhone = new Map<string, AiCustomer>();
    const customerByEmail = new Map<string, AiCustomer>();
    const customerByName = new Map<string, AiCustomer>();
    for (const c of customers) {
      if (c.customerCode) customerByCode.set(c.customerCode.trim().toUpperCase(), c);
      if (c.phoneZalo) customerByPhone.set(norm(c.phoneZalo), c);
      if (c.email) customerByEmail.set(norm(c.email), c);
      customerByName.set(norm(c.fullName), c);
    }

    const serviceByNorm = new Map<string, AiServiceItem>();
    for (const s of services) {
      serviceByNorm.set(norm(s.name), s);
      serviceByNorm.set(norm(s.code), s);
    }

    const existingRowKeys = new Set<string>(
      orders.map((o) => o.importRowKey).filter((k): k is string => Boolean(k))
    );

    const now = new Date().toISOString();
    const todayVn = getTodayVnDate();

    let createdCustomers = 0;
    let createdServices = 0;
    let createdOrders = 0;
    let createdPayments = 0;
    let skippedDuplicateOrders = 0;
    let runningOrdersCount = orders.length;
    let runningPaymentsCount = payments.length;

    for (const row of data.rows) {
      if (existingRowKeys.has(row.importRowKey)) {
        skippedDuplicateOrders++;
        continue;
      }

      // 1. Find or create customer (never duplicate!)
      let customer =
        (row.customerCode && customerByCode.get(row.customerCode.toUpperCase())) ||
        (row.phoneZalo && customerByPhone.get(norm(row.phoneZalo))) ||
        (row.email && customerByEmail.get(norm(row.email))) ||
        (!row.phoneZalo && !row.email ? customerByName.get(norm(row.fullName)) : undefined) ||
        null;

      if (!customer) {
        const custId = makeShortId("cust");
        const code = nextCustomerCode(customers);
        customer = {
          id: custId,
          customerCode: code,
          fullName: row.fullName,
          phoneZalo: row.phoneZalo,
          email: row.email,
          otherContact: "",
          note: "Nhập từ Excel",
          linkedUid: null,
          status: "active",
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };
        await saveDoc(COL_CUSTOMERS, custId, customer);
        customers.push(customer);
        customerByCode.set(code, customer);
        if (customer.phoneZalo) customerByPhone.set(norm(customer.phoneZalo), customer);
        if (customer.email) customerByEmail.set(norm(customer.email), customer);
        customerByName.set(norm(customer.fullName), customer);
        createdCustomers++;
      }

      // 2. Find or create service
      let service =
        (row.matchedServiceId && services.find((s) => s.id === row.matchedServiceId)) ||
        serviceByNorm.get(norm(row.serviceName)) ||
        null;

      if (!service) {
        const svcId = makeShortId("svc");
        service = {
          id: svcId,
          code: makeServiceCode(row.serviceName),
          name: row.serviceName,
          billingType: row.billingType,
          defaultFirstPriceVnd: row.firstCyclePriceVnd,
          defaultRecurringPriceVnd: row.billingType === "monthly" ? row.recurringPriceVnd : null,
          durationValue: row.billingType === "monthly" ? 1 : null,
          durationUnit: row.billingType === "monthly" ? "months" : null,
          conditions: "Tạo tự động từ nhập Excel",
          status: "active",
          studentVisible: false,
          sortOrder: services.length + 1,
          createdAt: now,
          updatedAt: now,
        };
        await saveDoc(COL_SERVICES, svcId, service);
        services.push(service);
        serviceByNorm.set(norm(service.name), service);
        createdServices++;
      }

      // 3. Create order
      const ordId = makeShortId("ord");
      const order: AiOrder = {
        id: ordId,
        orderCode: makeOrderCode(todayVn, runningOrdersCount++),
        customerId: customer.id,
        customerCodeSnapshot: customer.customerCode,
        linkedUid: customer.linkedUid ?? null,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        serviceConditionsSnapshot: service.conditions,
        accountSlot: row.accountSlot,
        quantity: row.quantity,
        startDate: row.startDate,
        stopDate: row.stopDate,
        billingType: row.billingType,
        firstCyclePriceVnd: row.firstCyclePriceVnd,
        recurringPriceVnd:
          row.billingType === "monthly"
            ? row.recurringPriceVnd ?? row.firstCyclePriceVnd
            : null,
        durationValue: service.durationValue,
        durationUnit: service.durationUnit,
        note: row.note,
        source: "excel_import",
        fulfillmentStatus: row.accountSlot ? "delivered" : "pending_delivery",
        importRowKey: row.importRowKey,
        idempotencyKey: null,
        createdByUid: actor.uid,
        createdAt: now,
        updatedAt: now,
      };
      await saveDoc(COL_ORDERS, ordId, order);
      existingRowKeys.add(row.importRowKey);
      createdOrders++;

      // 4. Optional initial payment from Excel
      if (row.paidAmountVnd > 0) {
        const payId = makeShortId("pay");
        const paidDate = row.paidDate || row.startDate;
        const payment: AiPayment = {
          id: payId,
          paymentCode: makePaymentCode(paidDate, runningPaymentsCount++),
          orderId: order.id,
          customerId: customer.id,
          linkedUid: customer.linkedUid ?? null,
          paidDate,
          amountVnd: row.paidAmountVnd,
          method: "bank_transfer",
          note: "Thu tiền nhập từ Excel",
          status: "active",
          voidReason: null,
          voidedAt: null,
          voidedByUid: null,
          walletTransactionId: null,
          idempotencyKey: null,
          createdByUid: actor.uid,
          createdAt: now,
          updatedAt: now,
        };
        await saveDoc(COL_PAYMENTS, payId, payment);
        createdPayments++;
      }
    }

    await writeAuditLog({
      action: "excel_import",
      entityType: "import",
      entityId: makeShortId("imp"),
      actorUid: actor.uid,
      actorName: actor.displayName || "Admin",
      summary: `Nhập Excel: +${createdCustomers} khách, +${createdOrders} đơn, +${createdPayments} giao dịch (bỏ qua ${skippedDuplicateOrders} đơn trùng).`,
      after: {
        createdCustomers,
        createdServices,
        createdOrders,
        createdPayments,
        skippedDuplicateOrders,
      },
    });
    invalidateAiShopCache();

    return {
      createdCustomers,
      createdServices,
      createdOrders,
      createdPayments,
      skippedDuplicateOrders,
    };
  });
}

// ---------------------------------------------------------------------------
// STUDENT STOREFRONT (CATALOG, MY ORDERS, ATOMIC WALLET PURCHASE & RENEWAL)
// ---------------------------------------------------------------------------

export async function getStudentAiCatalog(): Promise<AiServiceItem[]> {
  let services = await listCollection<AiServiceItem>(COL_SERVICES);
  if (services.length === 0) {
    services = await ensureInitialServicesSeeded();
  }
  return services
    .filter((s) => s.status === "active" && s.studentVisible)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export async function getStudentAiOrdersAndWallet(
  uid: string,
  displayName?: string
): Promise<{
  walletBalanceVnd: number;
  customer: AiCustomer | null;
  orders: AiOrder[];
  payments: AiPayment[];
}> {
  const [wallet, linkedCustomers, orders, payments] = await Promise.all([
    getOrCreateWallet(uid, { fullName: displayName }),
    queryByField<AiCustomer>(COL_CUSTOMERS, "linkedUid", uid),
    queryByField<AiOrder>(COL_ORDERS, "linkedUid", uid),
    queryByField<AiPayment>(COL_PAYMENTS, "linkedUid", uid),
  ]);

  return {
    walletBalanceVnd: sanitizeVnd(wallet.balanceVnd),
    customer: linkedCustomers[0] ?? null,
    orders: orders.sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    payments: payments.sort((a, b) => b.paidDate.localeCompare(a.paidDate) || b.createdAt.localeCompare(a.createdAt)),
  };
}

async function sendDiscordNewAiOrderAlert(params: {
  order: AiOrder;
  customer: AiCustomer;
  totalCostVnd: number;
  originBaseUrl?: string;
}): Promise<void> {
  const webhookUrl =
    process.env.DISCORD_AI_SHOP_WEBHOOK_URL ||
    process.env.DISCORD_REPORT_WEBHOOK_URL ||
    "https://discord.com/api/webhooks/1500812404190085120/R1oclYbsjomTS5AUdbVkCD1hw1FqZZhb8LzvrfsyJVozADVmXWDlf4Mk3HlGUKqRI8zn";

  if (!webhookUrl) return;

  const baseUrl = (
    params.originBaseUrl ||
    process.env.PUBLIC_APP_URL ||
    "https://dk-test-v3.vercel.app"
  ).replace(/\/+$/, "");

  const adminOrderUrl = `${baseUrl}/admin/ai-shop?tab=orders&orderId=${encodeURIComponent(
    params.order.id
  )}`;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "👤 Khách hàng",
      value: `**${params.customer.fullName}** (\`${params.customer.customerCode}\`)`,
      inline: true,
    },
    {
      name: "📱 SĐT Zalo",
      value: `\`${params.order.contactPhoneZalo || params.customer.phoneZalo || "Chưa cung cấp"}\``,
      inline: true,
    },
    {
      name: "📦 Dịch vụ đặt mua",
      value: `**${params.order.serviceNameSnapshot}** × ${params.order.quantity}`,
      inline: false,
    },
    {
      name: "💰 Đã thanh toán (Ví DkTEST)",
      value: `**${params.totalCostVnd.toLocaleString("vi-VN")} đ**`,
      inline: true,
    },
    {
      name: "🔖 Mã đơn hàng",
      value: `\`${params.order.orderCode}\``,
      inline: true,
    },
  ];

  if (params.order.targetUpgradeEmail) {
    fields.push({
      name: "📧 Email cần nâng cấp (Mail cần up)",
      value: `\`${params.order.targetUpgradeEmail}\``,
      inline: false,
    });
  }

  if (params.order.note) {
    fields.push({
      name: "📝 Ghi chú khách hàng",
      value: params.order.note.slice(0, 400),
      inline: false,
    });
  }

  fields.push({
    name: "🔗 Xử lý đơn ngay",
    value: `[👉 Bấm vào đây để mở trang Admin xử lý & giao đơn](${adminOrderUrl})`,
    inline: false,
  });

  const payload = {
    embeds: [
      {
        title: `🛒 ĐƠN MUA ACC AI MỚI — ${params.order.orderCode}`,
        url: adminOrderUrl,
        color: 3447003,
        fields,
        footer: {
          text: "DkTEST AI Shop • Thanh toán tự động qua Ví DkTEST",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.warn("[aiShopService] Failed to send Discord webhook notification:", err);
  }
}

export async function studentPurchaseAiService(
  user: { uid: string; email?: string; displayName?: string },
  rawInput: unknown,
  originBaseUrl?: string
): Promise<{
  order: AiOrder;
  payment: AiPayment;
  customer: AiCustomer;
  newBalanceVnd: number;
  walletTransactionId: string;
}> {
  const data = studentPurchaseSchema.parse(rawInput);

  return withIdempotency(data.idempotencyKey, `stu_buy_${user.uid}`, async () => {
    const service = await getDocById<AiServiceItem>(COL_SERVICES, data.serviceId);
    if (!service || service.status !== "active" || !service.studentVisible) {
      throw new Error("Dịch vụ này hiện không còn mở bán tự động.");
    }
    if (service.defaultFirstPriceVnd === null || service.defaultFirstPriceVnd <= 0) {
      throw new Error("Dịch vụ này chưa có giá cố định, vui lòng liên hệ Admin để đặt đơn.");
    }
    if (
      service.billingType === "monthly" &&
      (service.defaultRecurringPriceVnd === null || service.defaultRecurringPriceVnd < 0)
    ) {
      throw new Error("Dịch vụ hàng tháng chưa cấu hình giá kỳ sau.");
    }

    const storeMeta = resolveServiceStorefrontMeta(service);
    const upgradeEmail = (data.targetUpgradeEmail || "").trim();
    if (storeMeta.requiresUpgradeEmail) {
      if (!upgradeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(upgradeEmail)) {
        throw new Error(
          `Gói ${storeMeta.categoryLabel} bắt buộc nhập địa chỉ Email cần nâng cấp hợp lệ.`
        );
      }
    }

    const totalCostVnd = toIntVnd(service.defaultFirstPriceVnd) * data.quantity;
    if (totalCostVnd <= 0) {
      throw new Error("Giá dịch vụ không hợp lệ.");
    }

    // Ensure wallet exists before atomic debit
    const initialWallet = await getOrCreateWallet(user.uid, { fullName: user.displayName });

    // Find or prepare customer for this student
    const [existingLinkedCustomers, allCustomers, allOrders, allPayments] = await Promise.all([
      queryByField<AiCustomer>(COL_CUSTOMERS, "linkedUid", user.uid),
      listCollection<AiCustomer>(COL_CUSTOMERS),
      listCollection<AiOrder>(COL_ORDERS),
      listCollection<AiPayment>(COL_PAYMENTS),
    ]);

    const now = new Date().toISOString();
    const todayVn = getTodayVnDate();

    let customer: AiCustomer;
    let isNewCustomer = false;
    if (existingLinkedCustomers.length > 0) {
      customer = {
        ...existingLinkedCustomers[0],
        phoneZalo: data.contactPhoneZalo || existingLinkedCustomers[0].phoneZalo,
        email: upgradeEmail || data.contactEmail || existingLinkedCustomers[0].email || user.email || "",
        updatedAt: now,
      };
    } else {
      isNewCustomer = true;
      customer = {
        id: makeShortId("cust"),
        customerCode: nextCustomerCode(allCustomers),
        fullName: initialWallet.fullName || user.displayName || user.email?.split("@")[0] || "Học sinh DkTEST",
        phoneZalo: data.contactPhoneZalo,
        email: upgradeEmail || data.contactEmail || user.email || "",
        otherContact: initialWallet.currentClass ? `Lớp ${initialWallet.currentClass}` : "",
        note: "Khách tự đăng ký qua Cửa hàng Acc AI DkTEST",
        linkedUid: user.uid,
        status: "active",
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
    }

    const orderId = makeShortId("ord");
    const paymentId = makeShortId("pay");
    const walletTxId = makeShortId("wtx_ai");

    const order: AiOrder = {
      id: orderId,
      orderCode: makeOrderCode(todayVn, allOrders.length),
      customerId: customer.id,
      customerCodeSnapshot: customer.customerCode,
      linkedUid: user.uid,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      serviceConditionsSnapshot: service.conditions,
      accountSlot: upgradeEmail || "",
      quantity: data.quantity,
      startDate: todayVn,
      stopDate: null,
      billingType: service.billingType,
      firstCyclePriceVnd: toIntVnd(service.defaultFirstPriceVnd),
      recurringPriceVnd:
        service.billingType === "monthly"
          ? toIntVnd(service.defaultRecurringPriceVnd ?? service.defaultFirstPriceVnd)
          : null,
      durationValue: service.durationValue,
      durationUnit: service.durationUnit,
      note: data.note || "Học sinh mua tự động qua Ví DkTEST",
      contactPhoneZalo: data.contactPhoneZalo,
      targetUpgradeEmail: upgradeEmail || "",
      adminDeliveryNote: "",
      adminAttachments: [],
      deliveredAt: null,
      studentNotificationUnread: false,
      studentNotificationReadAt: null,
      source: "student_auto",
      fulfillmentStatus: "pending_delivery",
      importRowKey: null,
      idempotencyKey: data.idempotencyKey,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now,
    };

    const payment: AiPayment = {
      id: paymentId,
      paymentCode: makePaymentCode(todayVn, allPayments.length),
      orderId: order.id,
      customerId: customer.id,
      linkedUid: user.uid,
      paidDate: todayVn,
      amountVnd: totalCostVnd,
      method: "dktest_wallet",
      note: `Thanh toán tự động đơn ${order.orderCode} qua Ví DkTEST`,
      status: "active",
      voidReason: null,
      voidedAt: null,
      voidedByUid: null,
      walletTransactionId: walletTxId,
      idempotencyKey: data.idempotencyKey,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now,
    };

    let newBalanceVnd = 0;

    if (adminDb) {
      // Atomic Firestore transaction: wallet debit + wallet tx + customer + order + payment
      await adminDb.runTransaction(async (tx) => {
        const walletRef = adminDb!.collection("wallets").doc(user.uid);
        const walletSnap = await tx.get(walletRef);
        const currentWallet = (walletSnap.exists ? walletSnap.data() : initialWallet) as StudentWallet;
        const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
        if (balanceBefore < totalCostVnd) {
          const err: any = new Error(
            `Số dư Ví DkTEST không đủ. Cần ${totalCostVnd.toLocaleString("vi-VN")}đ, hiện có ${balanceBefore.toLocaleString("vi-VN")}đ.`
          );
          err.statusCode = 400;
          err.code = "insufficient_balance";
          err.missingVnd = totalCostVnd - balanceBefore;
          throw err;
        }

        const balanceAfter = balanceBefore - totalCostVnd;
        newBalanceVnd = balanceAfter;

        tx.set(
          walletRef,
          {
            ...currentWallet,
            uid: user.uid,
            balanceVnd: balanceAfter,
            totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + totalCostVnd,
            updatedAt: now,
          },
          { merge: true }
        );

        const walletTx: WalletTransaction = {
          id: walletTxId,
          uid: user.uid,
          type: "ai_service_purchase_debit",
          amountVnd: totalCostVnd,
          balanceBeforeVnd: balanceBefore,
          balanceAfterVnd: balanceAfter,
          studentNameSnapshot: currentWallet.fullName || customer.fullName,
          studentClassSnapshot: currentWallet.currentClass || "",
          idempotencyKey: data.idempotencyKey,
          actorUid: user.uid,
          actorName: customer.fullName,
          note: `Mua dịch vụ AI: ${service.name} x${data.quantity} (${order.orderCode})`,
          description: `Mua dịch vụ AI: ${service.name} x${data.quantity} (${order.orderCode})`,
          createdAt: now,
          metadata: {
            aiOrderId: order.id,
            aiOrderCode: order.orderCode,
            aiServiceId: service.id,
            aiPaymentId: payment.id,
          },
        };

        tx.set(adminDb!.collection("wallet_transactions").doc(walletTxId), walletTx);
        tx.set(adminDb!.collection(COL_CUSTOMERS).doc(customer.id), customer, { merge: !isNewCustomer });
        tx.set(adminDb!.collection(COL_ORDERS).doc(order.id), order);
        tx.set(adminDb!.collection(COL_PAYMENTS).doc(payment.id), payment);
      });
    } else {
      // REST fallback mode
      const currentWallet = (await getFirestoreRestDoc("wallets", user.uid, false)) || initialWallet;
      const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
      if (balanceBefore < totalCostVnd) {
        const err: any = new Error(
          `Số dư Ví DkTEST không đủ. Cần ${totalCostVnd.toLocaleString("vi-VN")}đ, hiện có ${balanceBefore.toLocaleString("vi-VN")}đ.`
        );
        err.statusCode = 400;
        err.code = "insufficient_balance";
        err.missingVnd = totalCostVnd - balanceBefore;
        throw err;
      }
      newBalanceVnd = balanceBefore - totalCostVnd;

      await setFirestoreRestDoc("wallets", user.uid, {
        ...currentWallet,
        uid: user.uid,
        balanceVnd: newBalanceVnd,
        totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + totalCostVnd,
        updatedAt: now,
      });

      const walletTx: WalletTransaction = {
        id: walletTxId,
        uid: user.uid,
        type: "ai_service_purchase_debit",
        amountVnd: totalCostVnd,
        balanceBeforeVnd: balanceBefore,
        balanceAfterVnd: newBalanceVnd,
        studentNameSnapshot: currentWallet.fullName || customer.fullName,
        studentClassSnapshot: currentWallet.currentClass || "",
        idempotencyKey: data.idempotencyKey,
        actorUid: user.uid,
        actorName: customer.fullName,
        note: `Mua dịch vụ AI: ${service.name} x${data.quantity} (${order.orderCode})`,
        description: `Mua dịch vụ AI: ${service.name} x${data.quantity} (${order.orderCode})`,
        createdAt: now,
        metadata: {
          aiOrderId: order.id,
          aiOrderCode: order.orderCode,
          aiServiceId: service.id,
          aiPaymentId: payment.id,
        },
      };
      await Promise.all([
        setFirestoreRestDoc("wallet_transactions", walletTxId, walletTx),
        saveDoc(COL_CUSTOMERS, customer.id, customer),
        saveDoc(COL_ORDERS, order.id, order),
        saveDoc(COL_PAYMENTS, payment.id, payment),
      ]);
    }

    await writeAuditLog({
      action: "student_auto_purchase",
      entityType: "order",
      entityId: order.id,
      actorUid: user.uid,
      actorName: customer.fullName,
      summary: `Học sinh ${customer.fullName} tự mua ${service.name} x${data.quantity} (${totalCostVnd}đ qua Ví DkTEST, đơn ${order.orderCode}).`,
      after: { orderCode: order.orderCode, totalCostVnd, walletTxId },
    });

    invalidateAiShopCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(user.uid);
    invalidateGlobalSpendingCache();

    // Notify Admin via Discord webhook with direct processing link (non-blocking fail-safe)
    await sendDiscordNewAiOrderAlert({
      order,
      customer,
      totalCostVnd,
      originBaseUrl,
    });

    return {
      order,
      payment,
      customer,
      newBalanceVnd,
      walletTransactionId: walletTxId,
    };
  });
}

export async function acknowledgeStudentOrderNotification(
  uid: string,
  orderId: string
): Promise<AiOrder> {
  const existing = await getDocById<AiOrder>(COL_ORDERS, orderId);
  if (!existing || existing.linkedUid !== uid) {
    const err: any = new Error("Không tìm thấy đơn hàng thuộc tài khoản của bạn.");
    err.statusCode = 404;
    throw err;
  }
  const now = new Date().toISOString();
  const updated: AiOrder = {
    ...existing,
    studentNotificationUnread: false,
    studentNotificationReadAt: now,
    updatedAt: now,
  };
  await saveDoc(COL_ORDERS, orderId, updated);
  invalidateAiShopCache();
  return updated;
}

/**
 * Allows a student to cancel renewal on a monthly slot subscription.
 * Keeps service active through the end of the already-paid/current cycle and sets `stopDate`
 * so NO future billing periods will be generated from `stopDate` onward.
 */
export async function studentCancelSlotRenewal(
  user: { uid: string; displayName?: string },
  orderId: string,
  reason?: string
): Promise<AiOrder> {
  const existing = await getDocById<AiOrder>(COL_ORDERS, orderId);
  if (!existing || existing.linkedUid !== user.uid) {
    const err: any = new Error("Không tìm thấy đơn hàng thuộc tài khoản của bạn.");
    err.statusCode = 404;
    throw err;
  }
  if (existing.billingType !== "monthly") {
    throw new Error("Chỉ các gói slot gia hạn hàng tháng mới hỗ trợ hủy gia hạn.");
  }

  const todayVn = getTodayVnDate();
  const orderPayments = await queryByField<AiPayment>(COL_PAYMENTS, "orderId", orderId);
  const summary = computeOrderFinancialSummary(existing, orderPayments, todayVn);

  // Determine exact effective stopDate (start of next unpaid future period so current paid coverage remains intact)
  let effectiveStopDate: string;
  const coveredPeriods = summary.periods.filter((p) => p.allocatedVnd > 0 || p.isDue);
  if (coveredPeriods.length > 0) {
    const lastCovered = coveredPeriods[coveredPeriods.length - 1];
    effectiveStopDate =
      lastCovered.coverageEndDate || addMonthsAnchored(existing.startDate, lastCovered.periodNumber);
  } else {
    // Future-starting order not yet due -> stop immediately on startDate
    effectiveStopDate = existing.startDate;
  }

  const now = new Date().toISOString();
  const cleanReason = String(reason || "").trim().slice(0, 400);
  const updated: AiOrder = {
    ...existing,
    stopDate: effectiveStopDate,
    autoRenewCancelled: true,
    autoRenewCancelledAt: now,
    autoRenewCancelReason: cleanReason,
    updatedAt: now,
  };

  await saveDoc(COL_ORDERS, orderId, updated);
  await writeAuditLog({
    action: "order_stop",
    entityType: "order",
    entityId: orderId,
    actorUid: user.uid,
    actorName: user.displayName || "Học sinh",
    summary: `Học sinh hủy gia hạn gói slot ${existing.orderCode} (${existing.serviceNameSnapshot}) — dừng từ ${effectiveStopDate}.${cleanReason ? ` Lý do: ${cleanReason}` : ""}`,
    before: { stopDate: existing.stopDate, autoRenewCancelled: existing.autoRenewCancelled },
    after: { stopDate: effectiveStopDate, autoRenewCancelled: true },
  });
  invalidateAiShopCache();
  return updated;
}

export async function studentResumeSlotRenewal(
  user: { uid: string; displayName?: string },
  orderId: string
): Promise<AiOrder> {
  const existing = await getDocById<AiOrder>(COL_ORDERS, orderId);
  if (!existing || existing.linkedUid !== user.uid) {
    const err: any = new Error("Không tìm thấy đơn hàng thuộc tài khoản của bạn.");
    err.statusCode = 404;
    throw err;
  }
  if (existing.billingType !== "monthly") {
    throw new Error("Đơn hàng này không phải gói gia hạn hàng tháng.");
  }
  const todayVn = getTodayVnDate();
  if (existing.stopDate && existing.stopDate <= todayVn) {
    throw new Error("Gói này đã hết hạn dừng. Vui lòng đặt mua gói mới hoặc liên hệ Admin.");
  }

  const now = new Date().toISOString();
  const updated: AiOrder = {
    ...existing,
    stopDate: null,
    autoRenewCancelled: false,
    autoRenewCancelledAt: null,
    autoRenewCancelReason: "",
    updatedAt: now,
  };

  await saveDoc(COL_ORDERS, orderId, updated);
  await writeAuditLog({
    action: "order_stop",
    entityType: "order",
    entityId: orderId,
    actorUid: user.uid,
    actorName: user.displayName || "Học sinh",
    summary: `Học sinh bật lại gia hạn gói slot ${existing.orderCode} (${existing.serviceNameSnapshot}).`,
    before: { stopDate: existing.stopDate, autoRenewCancelled: existing.autoRenewCancelled },
    after: { stopDate: null, autoRenewCancelled: false },
  });
  invalidateAiShopCache();
  return updated;
}

export async function studentPayOrderWithWallet(
  user: { uid: string; displayName?: string },
  orderId: string,
  rawInput: unknown
): Promise<{
  payment: AiPayment;
  newBalanceVnd: number;
  walletTransactionId: string;
}> {
  const data = studentRenewOrderSchema.parse(rawInput);

  return withIdempotency(data.idempotencyKey, `stu_pay_${user.uid}_${orderId}`, async () => {
    const order = await getDocById<AiOrder>(COL_ORDERS, orderId);
    if (!order || order.linkedUid !== user.uid) {
      const err: any = new Error("Không tìm thấy đơn hàng thuộc tài khoản của bạn.");
      err.statusCode = 404;
      throw err;
    }

    const orderPayments = await queryByField<AiPayment>(COL_PAYMENTS, "orderId", orderId);
    const summary = computeOrderFinancialSummary(order, orderPayments, getTodayVnDate());
    if (summary.isStopped && summary.debtUpToAsOfDateVnd === 0) {
      throw new Error("Đơn hàng này đã dừng và không còn công nợ cần thanh toán.");
    }

    const allPayments = await listCollection<AiPayment>(COL_PAYMENTS);
    const initialWallet = await getOrCreateWallet(user.uid, { fullName: user.displayName });

    const now = new Date().toISOString();
    const todayVn = getTodayVnDate();
    const paymentId = makeShortId("pay");
    const walletTxId = makeShortId("wtx_airen");

    const payment: AiPayment = {
      id: paymentId,
      paymentCode: makePaymentCode(todayVn, allPayments.length),
      orderId: order.id,
      customerId: order.customerId,
      linkedUid: user.uid,
      paidDate: todayVn,
      amountVnd: data.amountVnd,
      method: "dktest_wallet",
      note: data.note || `Học sinh thanh toán / gia hạn đơn ${order.orderCode} qua Ví DkTEST`,
      status: "active",
      voidReason: null,
      voidedAt: null,
      voidedByUid: null,
      walletTransactionId: walletTxId,
      idempotencyKey: data.idempotencyKey,
      createdByUid: user.uid,
      createdAt: now,
      updatedAt: now,
    };

    let newBalanceVnd = 0;

    if (adminDb) {
      await adminDb.runTransaction(async (tx) => {
        const walletRef = adminDb!.collection("wallets").doc(user.uid);
        const walletSnap = await tx.get(walletRef);
        const currentWallet = (walletSnap.exists ? walletSnap.data() : initialWallet) as StudentWallet;
        const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
        if (balanceBefore < data.amountVnd) {
          const err: any = new Error(
            `Số dư Ví DkTEST không đủ. Cần ${data.amountVnd.toLocaleString("vi-VN")}đ, hiện có ${balanceBefore.toLocaleString("vi-VN")}đ.`
          );
          err.statusCode = 400;
          err.code = "insufficient_balance";
          err.missingVnd = data.amountVnd - balanceBefore;
          throw err;
        }
        const balanceAfter = balanceBefore - data.amountVnd;
        newBalanceVnd = balanceAfter;

        tx.set(
          walletRef,
          {
            ...currentWallet,
            uid: user.uid,
            balanceVnd: balanceAfter,
            totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + data.amountVnd,
            updatedAt: now,
          },
          { merge: true }
        );

        const walletTx: WalletTransaction = {
          id: walletTxId,
          uid: user.uid,
          type: "ai_service_purchase_debit",
          amountVnd: data.amountVnd,
          balanceBeforeVnd: balanceBefore,
          balanceAfterVnd: balanceAfter,
          studentNameSnapshot: currentWallet.fullName || user.displayName || "",
          studentClassSnapshot: currentWallet.currentClass || "",
          idempotencyKey: data.idempotencyKey,
          actorUid: user.uid,
          actorName: currentWallet.fullName || user.displayName || "",
          note: `Gia hạn / thanh toán dịch vụ AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
          description: `Gia hạn / thanh toán dịch vụ AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
          createdAt: now,
          metadata: {
            aiOrderId: order.id,
            aiOrderCode: order.orderCode,
            aiPaymentId: payment.id,
          },
        };

        tx.set(adminDb!.collection("wallet_transactions").doc(walletTxId), walletTx);
        tx.set(adminDb!.collection(COL_PAYMENTS).doc(payment.id), payment);
      });
    } else {
      const currentWallet = (await getFirestoreRestDoc("wallets", user.uid, false)) || initialWallet;
      const balanceBefore = sanitizeVnd(currentWallet.balanceVnd);
      if (balanceBefore < data.amountVnd) {
        const err: any = new Error(
          `Số dư Ví DkTEST không đủ. Cần ${data.amountVnd.toLocaleString("vi-VN")}đ, hiện có ${balanceBefore.toLocaleString("vi-VN")}đ.`
        );
        err.statusCode = 400;
        err.code = "insufficient_balance";
        err.missingVnd = data.amountVnd - balanceBefore;
        throw err;
      }
      newBalanceVnd = balanceBefore - data.amountVnd;

      await setFirestoreRestDoc("wallets", user.uid, {
        ...currentWallet,
        uid: user.uid,
        balanceVnd: newBalanceVnd,
        totalSpentVnd: sanitizeVnd(currentWallet.totalSpentVnd) + data.amountVnd,
        updatedAt: now,
      });

      const walletTx: WalletTransaction = {
        id: walletTxId,
        uid: user.uid,
        type: "ai_service_purchase_debit",
        amountVnd: data.amountVnd,
        balanceBeforeVnd: balanceBefore,
        balanceAfterVnd: newBalanceVnd,
        studentNameSnapshot: currentWallet.fullName || user.displayName || "",
        studentClassSnapshot: currentWallet.currentClass || "",
        idempotencyKey: data.idempotencyKey,
        actorUid: user.uid,
        actorName: currentWallet.fullName || user.displayName || "",
        note: `Gia hạn / thanh toán dịch vụ AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
        description: `Gia hạn / thanh toán dịch vụ AI: ${order.serviceNameSnapshot} (${order.orderCode})`,
        createdAt: now,
        metadata: {
          aiOrderId: order.id,
          aiOrderCode: order.orderCode,
          aiPaymentId: payment.id,
        },
      };
      await Promise.all([
        setFirestoreRestDoc("wallet_transactions", walletTxId, walletTx),
        saveDoc(COL_PAYMENTS, payment.id, payment),
      ]);
    }

    await writeAuditLog({
      action: "student_auto_renew",
      entityType: "payment",
      entityId: payment.id,
      actorUid: user.uid,
      actorName: user.displayName || "Học sinh",
      summary: `Học sinh thanh toán/gia hạn đơn ${order.orderCode} số tiền ${data.amountVnd}đ qua Ví DkTEST.`,
      after: { orderCode: order.orderCode, amountVnd: data.amountVnd, walletTxId },
    });

    invalidateAiShopCache();
    invalidateWalletOverviewCache();
    invalidateStudentDetailsCache(user.uid);
    invalidateGlobalSpendingCache();

    return { payment, newBalanceVnd, walletTransactionId: walletTxId };
  });
}
