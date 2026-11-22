import * as XLSX from "xlsx";
import type {
  AiCustomer,
  AiCustomerFinancialSummary,
  AiOrder,
  AiOrderFinancialSummary,
  AiPayment,
  AiServiceItem,
  AiShopBootstrapPayload,
} from "../../types/aiShop";
import {
  BILLING_STATUS_META,
  PAYMENT_METHOD_LABELS,
  formatVnDate,
  isValidIsoDate,
  toIntVnd,
} from "./billingEngine";

export interface ExcelColumnMapping {
  customerCode: string;
  fullName: string;
  phoneZalo: string;
  email: string;
  serviceName: string;
  accountSlot: string;
  quantity: string;
  startDate: string;
  stopDate: string;
  billingType: string;
  firstCyclePriceVnd: string;
  recurringPriceVnd: string;
  paidAmountVnd: string;
  paidDate: string;
  note: string;
}

export interface ParsedExcelRowPreview {
  rowIndex: number; // 1-based Excel row number (excluding header)
  raw: Record<string, any>;
  customerCode: string;
  fullName: string;
  phoneZalo: string;
  email: string;
  serviceName: string;
  matchedServiceId: string | null;
  accountSlot: string;
  quantity: number;
  startDate: string;
  stopDate: string | null;
  billingType: "one_time" | "monthly";
  firstCyclePriceVnd: number | null;
  recurringPriceVnd: number | null;
  paidAmountVnd: number;
  paidDate: string;
  note: string;
  importRowKey: string;
  errors: string[];
  warnings: string[];
  isDuplicateOrder: boolean;
  existingCustomerId: string | null;
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeLookup(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Parses dd/mm/yyyy, yyyy-mm-dd, or Excel serial date numbers into canonical YYYY-MM-DD.
 */
export function parseFlexibleDateToIso(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    // Excel serial date (1900 epoch)
    const utcMs = Math.round((value - 25569) * 86400 * 1000);
    const dt = new Date(utcMs);
    const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    return isValidIsoDate(iso) ? iso : "";
  }
  const str = String(value).trim();
  if (isValidIsoDate(str)) return str;

  // dd/mm/yyyy or d/m/yyyy or dd-mm-yyyy
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(str);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    const iso = `${y}-${m}-${d}`;
    return isValidIsoDate(iso) ? iso : "";
  }
  // yyyy/mm/dd
  const ymd = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/.exec(str);
  if (ymd) {
    const iso = `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    return isValidIsoDate(iso) ? iso : "";
  }
  return "";
}

export function parseNullablePriceVnd(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  // Support shorthand like "185k" -> 185000
  const kMatch = /^(\d+(?:[.,]\d+)?)\s*k$/i.exec(str);
  if (kMatch) {
    const num = Number(kMatch[1].replace(",", "."));
    return Number.isFinite(num) && num >= 0 ? Math.round(num * 1000) : null;
  }
  const cleaned = str.replace(/[.,\sđvnd]/gi, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function buildImportRowKey(parts: {
  customerIdentity: string;
  serviceName: string;
  accountSlot: string;
  startDate: string;
  firstCyclePriceVnd: number;
  quantity: number;
}): string {
  const raw = [
    normalizeLookup(parts.customerIdentity),
    normalizeLookup(parts.serviceName),
    normalizeLookup(parts.accountSlot),
    parts.startDate,
    String(parts.firstCyclePriceVnd),
    String(parts.quantity),
  ].join("|");
  // Deterministic lightweight hash
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `imp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function autoGuessColumnMapping(headers: string[]): ExcelColumnMapping {
  const find = (patterns: RegExp[]): string => {
    for (const h of headers) {
      const norm = normalizeLookup(h);
      if (patterns.some((p) => p.test(norm))) return h;
    }
    return "";
  };

  return {
    customerCode: find([/^ma kh/, /customer.?code/, /^mkh$/]),
    fullName: find([/ten kh/, /ho.?ten/, /khach hang/, /customer.?name/, /^ten$/]),
    phoneZalo: find([/sdt/, /dien thoai/, /zalo/, /phone/]),
    email: find([/email khach/, /^email$/]),
    serviceName: find([/dich vu/, /san pham/, /goi/, /service/]),
    accountSlot: find([/tai khoan/, /slot/, /acc/, /account/]),
    quantity: find([/so luong/, /^sl$/, /qty/, /quantity/]),
    startDate: find([/ngay mua/, /ngay bat dau/, /start/, /^ngay$/]),
    stopDate: find([/ngay dung/, /stop/]),
    billingType: find([/loai thu/, /ky thu/, /chu ky/, /billing/]),
    firstCyclePriceVnd: find([/gia ky dau/, /gia dau/, /don gia/, /^gia$/, /price/]),
    recurringPriceVnd: find([/gia ky sau/, /gia gia han/, /gia thang sau/, /recurring/]),
    paidAmountVnd: find([/da thu/, /thanh toan/, /da tra/, /paid/]),
    paidDate: find([/ngay thu/, /ngay thanh toan/, /paid.?date/]),
    note: find([/ghi chu/, /note/]),
  };
}

export function parseWorkbookBuffer(buffer: ArrayBuffer): {
  headers: string[];
  rows: Record<string, any>[];
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const headerSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => headerSet.add(k));
  }
  return { headers: Array.from(headerSet), rows };
}

export function buildExcelImportPreview(
  rows: Record<string, any>[],
  mapping: ExcelColumnMapping,
  existingCustomers: AiCustomer[],
  existingServices: AiServiceItem[],
  existingOrders: AiOrder[]
): ParsedExcelRowPreview[] {
  const customerByCode = new Map<string, AiCustomer>();
  const customerByPhone = new Map<string, AiCustomer>();
  const customerByEmail = new Map<string, AiCustomer>();
  for (const c of existingCustomers) {
    if (c.customerCode) customerByCode.set(c.customerCode.trim().toUpperCase(), c);
    if (c.phoneZalo) customerByPhone.set(normalizeLookup(c.phoneZalo), c);
    if (c.email) customerByEmail.set(normalizeLookup(c.email), c);
  }

  const serviceByNormName = new Map<string, AiServiceItem>();
  for (const s of existingServices) {
    serviceByNormName.set(normalizeLookup(s.name), s);
    serviceByNormName.set(normalizeLookup(s.code), s);
  }

  const existingRowKeys = new Set<string>();
  for (const o of existingOrders) {
    if (o.importRowKey) existingRowKeys.add(o.importRowKey);
  }
  const seenKeysInBatch = new Set<string>();

  return rows.map((raw, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const customerCode = mapping.customerCode ? normalizeText(raw[mapping.customerCode]).toUpperCase() : "";
    const fullName = mapping.fullName ? normalizeText(raw[mapping.fullName]) : "";
    const phoneZalo = mapping.phoneZalo ? normalizeText(raw[mapping.phoneZalo]) : "";
    const email = mapping.email ? normalizeText(raw[mapping.email]) : "";
    const serviceName = mapping.serviceName ? normalizeText(raw[mapping.serviceName]) : "";
    const accountSlot = mapping.accountSlot ? normalizeText(raw[mapping.accountSlot]) : "";
    const rawQty = mapping.quantity ? Number(raw[mapping.quantity]) : 1;
    const quantity = Number.isFinite(rawQty) && rawQty >= 1 ? Math.trunc(rawQty) : 1;
    const startDate = mapping.startDate ? parseFlexibleDateToIso(raw[mapping.startDate]) : "";
    const stopDateRaw = mapping.stopDate ? normalizeText(raw[mapping.stopDate]) : "";
    const stopDate = stopDateRaw ? parseFlexibleDateToIso(raw[mapping.stopDate]) : null;
    const note = mapping.note ? normalizeText(raw[mapping.note]) : "";

    const matchedCustomer =
      (customerCode && customerByCode.get(customerCode)) ||
      (phoneZalo && customerByPhone.get(normalizeLookup(phoneZalo))) ||
      (email && customerByEmail.get(normalizeLookup(email))) ||
      null;

    if (!fullName && !matchedCustomer) {
      errors.push("Thiếu tên khách hàng");
    }

    const matchedService = serviceName ? serviceByNormName.get(normalizeLookup(serviceName)) || null : null;
    if (!serviceName) {
      errors.push("Thiếu tên dịch vụ");
    } else if (!matchedService) {
      warnings.push("Dịch vụ chưa có trong danh mục — sẽ tạo mới khi xác nhận nhập");
    }

    const rawBilling = mapping.billingType ? normalizeLookup(raw[mapping.billingType]) : "";
    const billingType: "one_time" | "monthly" =
      rawBilling.includes("thang") || rawBilling.includes("monthly")
        ? "monthly"
        : rawBilling.includes("mot lan") || rawBilling.includes("one")
        ? "one_time"
        : matchedService?.billingType || "one_time";

    const parsedFirst = mapping.firstCyclePriceVnd
      ? parseNullablePriceVnd(raw[mapping.firstCyclePriceVnd])
      : null;
    const firstCyclePriceVnd = parsedFirst ?? matchedService?.defaultFirstPriceVnd ?? null;

    const parsedRecurring = mapping.recurringPriceVnd
      ? parseNullablePriceVnd(raw[mapping.recurringPriceVnd])
      : null;
    const recurringPriceVnd =
      billingType === "monthly"
        ? parsedRecurring ?? matchedService?.defaultRecurringPriceVnd ?? firstCyclePriceVnd
        : null;

    if (firstCyclePriceVnd === null) {
      errors.push("Chưa có giá kỳ đầu (bắt buộc nhập)");
    }
    if (billingType === "monthly" && recurringPriceVnd === null) {
      errors.push("Gói hàng tháng bắt buộc có giá kỳ sau");
    }
    if (!startDate) {
      errors.push("Ngày mua không hợp lệ (dùng dd/mm/yyyy hoặc yyyy-mm-dd)");
    }
    if (stopDateRaw && !stopDate) {
      errors.push("Ngày dừng không hợp lệ");
    }

    const paidAmountVnd = mapping.paidAmountVnd ? toIntVnd(parseNullablePriceVnd(raw[mapping.paidAmountVnd]) ?? 0) : 0;
    const paidDate =
      (mapping.paidDate ? parseFlexibleDateToIso(raw[mapping.paidDate]) : "") || startDate;

    const identity = customerCode || phoneZalo || email || fullName;
    const importRowKey = buildImportRowKey({
      customerIdentity: identity,
      serviceName: matchedService?.name || serviceName,
      accountSlot,
      startDate,
      firstCyclePriceVnd: firstCyclePriceVnd ?? 0,
      quantity,
    });

    const isDuplicateOrder = existingRowKeys.has(importRowKey) || seenKeysInBatch.has(importRowKey);
    if (isDuplicateOrder) {
      warnings.push("Đơn trùng với dữ liệu đã có — sẽ tự động bỏ qua để không tạo trùng");
    } else {
      seenKeysInBatch.add(importRowKey);
    }

    if (matchedCustomer) {
      warnings.push(`Khớp khách cũ: ${matchedCustomer.customerCode} (${matchedCustomer.fullName})`);
    }

    return {
      rowIndex: idx + 2,
      raw,
      customerCode: matchedCustomer?.customerCode || customerCode,
      fullName: fullName || matchedCustomer?.fullName || "",
      phoneZalo: phoneZalo || matchedCustomer?.phoneZalo || "",
      email: email || matchedCustomer?.email || "",
      serviceName: matchedService?.name || serviceName,
      matchedServiceId: matchedService?.id || null,
      accountSlot,
      quantity,
      startDate,
      stopDate,
      billingType,
      firstCyclePriceVnd,
      recurringPriceVnd,
      paidAmountVnd,
      paidDate,
      note,
      importRowKey,
      errors,
      warnings,
      isDuplicateOrder,
      existingCustomerId: matchedCustomer?.id || null,
    };
  });
}

// ---------------------------------------------------------------------------
// EXPORTS: CSV, Multi-Sheet Excel (.xlsx), JSON Backup, Import Template
// ---------------------------------------------------------------------------

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFullExcelWorkbook(
  customerSummaries: AiCustomerFinancialSummary[],
  orderSummaries: AiOrderFinancialSummary[],
  payments: AiPayment[],
  services: AiServiceItem[],
  asOfDate: string
) {
  const wb = XLSX.utils.book_new();
  const customerById = new Map(customerSummaries.map((cs) => [cs.customer.id, cs.customer]));
  const orderById = new Map(orderSummaries.map((os) => [os.order.id, os.order]));

  const customerRows = customerSummaries.map((cs) => ({
    "Mã khách": cs.customer.customerCode,
    "Tên khách hàng": cs.customer.fullName,
    "SĐT / Zalo": cs.customer.phoneZalo,
    Email: cs.customer.email,
    "Trạng thái": cs.customer.status === "archived" ? "Đã lưu trữ" : "Đang hoạt động",
    "Số đơn đang chạy": cs.activeOrderCount,
    "Tổng đơn": cs.totalOrderCount,
    "Phải thu đến ngày xem (VNĐ)": cs.dueUpToAsOfDateVnd,
    "Đã thu (VNĐ)": cs.totalPaidVnd,
    "Còn nợ (VNĐ)": cs.debtUpToAsOfDateVnd,
    "Trả trước (VNĐ)": cs.prepaidVnd,
    "Ghi chú": cs.customer.note,
  }));

  const orderRows = orderSummaries.map((os) => {
    const cust = customerById.get(os.order.customerId);
    return {
      "Mã đơn": os.order.orderCode,
      "Mã khách": cust?.customerCode || os.order.customerCodeSnapshot,
      "Tên khách hàng": cust?.fullName || "",
      "Dịch vụ": os.order.serviceNameSnapshot,
      "Tài khoản / Slot": os.order.accountSlot,
      "Số lượng": os.order.quantity,
      "Loại thu": os.order.billingType === "monthly" ? "Hàng tháng" : "Một lần",
      "Ngày mua": formatVnDate(os.order.startDate),
      "Ngày dừng": formatVnDate(os.order.stopDate),
      "Hết hạn dịch vụ": formatVnDate(os.serviceExpiryDate),
      "Giá kỳ đầu (VNĐ)": os.order.firstCyclePriceVnd,
      "Giá kỳ sau (VNĐ)": os.order.recurringPriceVnd ?? "",
      "Phải thu (VNĐ)": os.dueUpToAsOfDateVnd,
      "Đã thu (VNĐ)": os.totalPaidVnd,
      "Còn nợ (VNĐ)": os.debtUpToAsOfDateVnd,
      "Trả trước (VNĐ)": os.prepaidVnd,
      "Trạng thái": BILLING_STATUS_META[os.status].label,
      "Nguồn đơn": os.order.source === "student_auto" ? "Học sinh tự mua" : os.order.source === "excel_import" ? "Nhập Excel" : "Admin tạo",
      "Ghi chú": os.order.note,
    };
  });

  const paymentRows = payments.map((p) => {
    const cust = customerById.get(p.customerId);
    const ord = orderById.get(p.orderId);
    return {
      "Mã giao dịch": p.paymentCode,
      "Ngày thu": formatVnDate(p.paidDate),
      "Mã khách": cust?.customerCode || "",
      "Tên khách": cust?.fullName || "",
      "Mã đơn": ord?.orderCode || p.orderId,
      "Dịch vụ": ord?.serviceNameSnapshot || "",
      "Số tiền thực thu (VNĐ)": p.amountVnd,
      "Phương thức": PAYMENT_METHOD_LABELS[p.method] || p.method,
      "Trạng thái": p.status === "voided" ? "Đã hủy" : "Hợp lệ",
      "Lý do hủy": p.voidReason || "",
      "Ghi chú": p.note,
    };
  });

  const serviceRows = services.map((s) => ({
    "Mã dịch vụ": s.code,
    "Tên dịch vụ": s.name,
    "Loại thu": s.billingType === "monthly" ? "Hàng tháng" : "Một lần",
    "Giá kỳ đầu mặc định (VNĐ)": s.defaultFirstPriceVnd ?? "",
    "Giá kỳ sau mặc định (VNĐ)": s.defaultRecurringPriceVnd ?? "",
    "Thời hạn": s.durationValue && s.durationUnit ? `${s.durationValue} ${s.durationUnit === "days" ? "ngày" : "tháng"}` : "",
    "Trạng thái": s.status === "discontinued" ? "Ngừng bán" : "Đang bán",
    "Hiện cho học sinh": s.studentVisible ? "Có" : "Không",
    "Điều kiện / Ghi chú": s.conditions,
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerRows), "KhachHang_CongNo");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "DonHang");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), "GiaoDichThuTien");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serviceRows), "BangGiaDichVu");

  XLSX.writeFile(wb, `DkTEST_AI_Shop_BaoCao_${asOfDate}.xlsx`);
}

export function exportCsvReport(
  rows: Record<string, string | number | null | undefined>[],
  filename: string
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (val: unknown) => {
    const str = String(val ?? "");
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ];
  // UTF-8 BOM so Excel opens Vietnamese characters cleanly
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(blob, filename);
}

export function exportJsonBackup(data: AiShopBootstrapPayload, asOfDate: string) {
  const payload = {
    exportedAt: new Date().toISOString(),
    asOfDate,
    schemaVersion: 1,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  triggerBlobDownload(blob, `DkTEST_AI_Shop_Backup_${asOfDate}.json`);
}

export function downloadExcelImportTemplate() {
  const sampleRows = [
    {
      "Mã khách": "",
      "Tên khách hàng": "Nguyễn Văn A",
      "SĐT / Zalo": "0901234567",
      "Email khách": "nguyenvana@gmail.com",
      "Dịch vụ": "Gemini Pro slot lỏm",
      "Tài khoản / Slot": "slot-gem-01@gmail.com",
      "Số lượng": 1,
      "Ngày mua": "15/11/2026",
      "Ngày dừng": "",
      "Loại thu": "Hàng tháng",
      "Giá kỳ đầu": 15000,
      "Giá kỳ sau": 5000,
      "Đã thu": 15000,
      "Ngày thu": "15/11/2026",
      "Ghi chú": "Không lưu mật khẩu tài khoản",
    },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleRows), "MauNhapDon");
  XLSX.writeFile(wb, "DkTEST_AI_Shop_MauNhapExcel.xlsx");
}
