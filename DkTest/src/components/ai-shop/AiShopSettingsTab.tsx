import React, { useMemo, useState } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Database,
  History,
} from "lucide-react";
import type {
  AiAuditLog,
  AiCustomer,
  AiOrder,
  AiServiceItem,
  AiShopBootstrapPayload,
} from "../../types/aiShop";
import {
  autoGuessColumnMapping,
  buildExcelImportPreview,
  downloadExcelImportTemplate,
  exportJsonBackup,
  parseWorkbookBuffer,
  type ExcelColumnMapping,
} from "../../services/aiShop/excelHelper";
import { formatVnDate, formatVnd } from "../../services/aiShop/billingEngine";
import {
  importAiShopExcelApi,
  makeIdempotencyKey,
} from "../../services/aiShopClientService";

interface AiShopSettingsTabProps {
  data: AiShopBootstrapPayload;
  asOfDate: string;
  onRefresh: () => Promise<void>;
  onNotify: (type: "success" | "error", msg: string) => void;
}

const MAPPING_FIELDS: Array<{ key: keyof ExcelColumnMapping; label: string; required?: boolean }> = [
  { key: "customerCode", label: "Mã khách hàng (nếu có)" },
  { key: "fullName", label: "Tên khách hàng", required: true },
  { key: "phoneZalo", label: "SĐT / Zalo" },
  { key: "email", label: "Email khách" },
  { key: "serviceName", label: "Tên dịch vụ", required: true },
  { key: "accountSlot", label: "Tài khoản / Slot đã giao" },
  { key: "quantity", label: "Số lượng" },
  { key: "startDate", label: "Ngày mua / bắt đầu", required: true },
  { key: "stopDate", label: "Ngày dừng" },
  { key: "billingType", label: "Loại thu (Một lần / Hàng tháng)" },
  { key: "firstCyclePriceVnd", label: "Giá kỳ đầu (VNĐ)" },
  { key: "recurringPriceVnd", label: "Giá kỳ sau (VNĐ)" },
  { key: "paidAmountVnd", label: "Đã thu (VNĐ)" },
  { key: "paidDate", label: "Ngày thu tiền" },
  { key: "note", label: "Ghi chú" },
];

export const AiShopSettingsTab: React.FC<AiShopSettingsTabProps> = ({
  data,
  asOfDate,
  onRefresh,
  onNotify,
}) => {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ExcelColumnMapping | null>(null);
  const [importing, setImporting] = useState(false);

  const previews = useMemo(() => {
    if (!mapping || rawRows.length === 0) return [];
    return buildExcelImportPreview(
      rawRows,
      mapping,
      data.customers as AiCustomer[],
      data.services as AiServiceItem[],
      data.orders as AiOrder[]
    );
  }, [rawRows, mapping, data.customers, data.services, data.orders]);

  const validImportableRows = useMemo(
    () => previews.filter((r) => r.errors.length === 0 && !r.isDuplicateOrder),
    [previews]
  );
  const errorRows = useMemo(() => previews.filter((r) => r.errors.length > 0), [previews]);
  const duplicateRows = useMemo(
    () => previews.filter((r) => r.errors.length === 0 && r.isDuplicateOrder),
    [previews]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseWorkbookBuffer(buf);
      if (parsed.rows.length === 0) {
        onNotify("error", "File Excel không có dòng dữ liệu nào.");
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(autoGuessColumnMapping(parsed.headers));
      onNotify("success", `Đã đọc ${parsed.rows.length} dòng từ "${file.name}". Kiểm tra ánh xạ cột bên dưới.`);
    } catch (err: any) {
      onNotify("error", err?.message || "Không thể đọc file Excel/CSV.");
    } finally {
      e.target.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (importing || validImportableRows.length === 0) return;
    setImporting(true);
    try {
      const res = await importAiShopExcelApi({
        rows: validImportableRows.map((r) => ({
          customerCode: r.customerCode,
          fullName: r.fullName,
          phoneZalo: r.phoneZalo,
          email: r.email,
          serviceName: r.serviceName,
          matchedServiceId: r.matchedServiceId,
          accountSlot: r.accountSlot,
          quantity: r.quantity,
          startDate: r.startDate,
          stopDate: r.stopDate,
          billingType: r.billingType,
          firstCyclePriceVnd: r.firstCyclePriceVnd ?? 0,
          recurringPriceVnd: r.recurringPriceVnd,
          paidAmountVnd: r.paidAmountVnd,
          paidDate: r.paidDate || r.startDate,
          note: r.note,
          importRowKey: r.importRowKey,
        })),
        idempotencyKey: makeIdempotencyKey("imp"),
      });
      onNotify(
        "success",
        `Nhập Excel thành công: +${res.createdCustomers} khách, +${res.createdOrders} đơn, +${res.createdPayments} giao dịch (bỏ qua ${res.skippedDuplicateOrders} đơn trùng).`
      );
      setRawRows([]);
      setHeaders([]);
      setMapping(null);
      setFileName("");
      await onRefresh();
    } catch (err: any) {
      onNotify("error", err?.message || "Lỗi khi ghi dữ liệu nhập Excel.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Backup & Excel Template */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              Sao lưu dữ liệu & Nhập từ Excel (.xlsx / .csv)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu được lưu bền vững trên Firebase Firestore. Nhập Excel có bước ánh xạ cột, kiểm lỗi, tự lọc trùng và xác nhận trước khi ghi.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadExcelImportTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Tải file Excel mẫu
            </button>
            <button
              type="button"
              onClick={() => exportJsonBackup(data, asOfDate)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Download className="w-4 h-4" /> Sao lưu JSON toàn bộ
            </button>
          </div>
        </div>

        {/* Upload Step */}
        <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <div className="font-bold text-slate-800 dark:text-slate-100">
              Bước 1: Chọn file Excel (.xlsx) hoặc CSV cần nhập
            </div>
            <div className="text-[11px] text-slate-500">
              {fileName
                ? `Đang xem trước: ${fileName} (${rawRows.length} dòng)`
                : "Hệ thống sẽ không tạo trùng khách hàng hoặc trùng đơn khi nhập lại cùng file."}
            </div>
          </div>
          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
            <Upload className="w-4 h-4" /> Chọn file Excel / CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Step 2: Column Mapping */}
        {mapping && headers.length > 0 && (
          <div className="space-y-4 pt-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Bước 2: Ánh xạ cột từ file Excel
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {MAPPING_FIELDS.map((field) => (
                  <div key={field.key} className="text-xs">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      value={mapping[field.key]}
                      onChange={(e) =>
                        setMapping((prev) =>
                          prev ? { ...prev, [field.key]: e.target.value } : prev
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    >
                      <option value="">-- Bỏ qua cột này --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Preview & Validation */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Bước 3: Xem trước & kiểm tra lỗi ({previews.length} dòng)
                </h4>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Hợp lệ sẵn sàng ghi: {validImportableRows.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    Trùng (sẽ bỏ qua): {duplicateRows.length}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                    Dòng lỗi: {errorRows.length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 text-left">
                    <tr>
                      <th className="py-2 px-2">Dòng</th>
                      <th className="py-2 px-2">Khách hàng</th>
                      <th className="py-2 px-2">Dịch vụ / Slot</th>
                      <th className="py-2 px-2">Ngày mua</th>
                      <th className="py-2 px-2 text-right">Giá kỳ đầu</th>
                      <th className="py-2 px-2 text-right">Đã thu</th>
                      <th className="py-2 px-2">Kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previews.slice(0, 100).map((row) => (
                      <tr
                        key={`${row.rowIndex}_${row.importRowKey}`}
                        className={
                          row.errors.length > 0
                            ? "bg-rose-50/60 dark:bg-rose-950/20"
                            : row.isDuplicateOrder
                            ? "bg-amber-50/40 dark:bg-amber-950/10 opacity-75"
                            : ""
                        }
                      >
                        <td className="py-2 px-2 font-mono">{row.rowIndex}</td>
                        <td className="py-2 px-2">
                          <div className="font-bold">{row.fullName || "—"}</div>
                          <div className="text-slate-400">{row.phoneZalo || row.email}</div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="font-semibold">{row.serviceName || "—"}</div>
                          <div className="font-mono text-slate-400">{row.accountSlot || "—"}</div>
                        </td>
                        <td className="py-2 px-2">{formatVnDate(row.startDate)}</td>
                        <td className="py-2 px-2 text-right font-bold">
                          {formatVnd(row.firstCyclePriceVnd)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-emerald-600">
                          {formatVnd(row.paidAmountVnd)}
                        </td>
                        <td className="py-2 px-2">
                          {row.errors.length > 0 ? (
                            <div className="text-rose-600 font-bold flex items-start gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{row.errors.join("; ")}</span>
                            </div>
                          ) : row.isDuplicateOrder ? (
                            <span className="text-amber-600 font-bold">Trùng — bỏ qua</span>
                          ) : (
                            <div className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Hợp lệ {row.warnings.length ? `(${row.warnings[0]})` : ""}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 4: Confirm Write */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRawRows([]);
                    setHeaders([]);
                    setMapping(null);
                    setFileName("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy xem trước
                </button>
                <button
                  type="button"
                  disabled={importing || validImportableRows.length === 0}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {importing
                    ? "Đang nhập dữ liệu..."
                    : `Bước 4: Xác nhận nhập ${validImportableRows.length} đơn hợp lệ`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Audit Log History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-indigo-500" />
          Nhật ký thao tác & Kiểm toán ({data.auditLogs.length})
        </h3>
        {data.auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có lịch sử thao tác nào.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {data.auditLogs.map((log: AiAuditLog) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{log.summary}</span>
                  <div className="text-[11px] text-slate-500">
                    Người thực hiện: <b>{log.actorName}</b> • Hành động: <code>{log.action}</code>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 font-mono">
                  {new Date(log.createdAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
