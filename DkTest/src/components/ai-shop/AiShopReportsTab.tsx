import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type {
  AiCustomer,
  AiCustomerFinancialSummary,
  AiDashboardSummary,
  AiOrderFinancialSummary,
  AiPayment,
  AiServiceItem,
} from "../../types/aiShop";
import {
  PAYMENT_METHOD_LABELS,
  formatVnDate,
  formatVnd,
} from "../../services/aiShop/billingEngine";
import {
  exportCsvReport,
  exportFullExcelWorkbook,
} from "../../services/aiShop/excelHelper";

interface AiShopReportsTabProps {
  dashboard: AiDashboardSummary;
  customerSummaries: AiCustomerFinancialSummary[];
  orderSummaries: AiOrderFinancialSummary[];
  payments: AiPayment[];
  services: AiServiceItem[];
  customers: AiCustomer[];
  asOfDate: string;
}

export const AiShopReportsTab: React.FC<AiShopReportsTabProps> = ({
  dashboard,
  customerSummaries,
  orderSummaries,
  payments,
  services,
  customers,
  asOfDate,
}) => {
  const [fromDate, setFromDate] = useState(`${asOfDate.slice(0, 7)}-01`);
  const [toDate, setToDate] = useState(asOfDate);

  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const orderById = useMemo(
    () => new Map(orderSummaries.map((os) => [os.order.id, os.order])),
    [orderSummaries]
  );

  const paymentsInRange = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.status === "active" &&
          (!fromDate || p.paidDate >= fromDate) &&
          (!toDate || p.paidDate <= toDate)
      ),
    [payments, fromDate, toDate]
  );

  const totalActualCashInRange = useMemo(
    () => paymentsInRange.reduce((s, p) => s + p.amountVnd, 0),
    [paymentsInRange]
  );

  const byMethod = useMemo(() => {
    const map = new Map<string, { method: string; amount: number; count: number }>();
    for (const p of paymentsInRange) {
      const cur = map.get(p.method) || { method: p.method, amount: 0, count: 0 };
      cur.amount += p.amountVnd;
      cur.count += 1;
      map.set(p.method, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [paymentsInRange]);

  const handleExportDebtCsv = () => {
    exportCsvReport(
      customerSummaries.map((cs) => ({
        "Mã khách": cs.customer.customerCode,
        "Tên khách": cs.customer.fullName,
        "SĐT / Zalo": cs.customer.phoneZalo,
        "Số đơn": cs.totalOrderCount,
        "Phải thu (VNĐ)": cs.dueUpToAsOfDateVnd,
        "Đã thu (VNĐ)": cs.totalPaidVnd,
        "Còn nợ (VNĐ)": cs.debtUpToAsOfDateVnd,
        "Trả trước (VNĐ)": cs.prepaidVnd,
      })),
      `DkTEST_CongNo_${asOfDate}.csv`
    );
  };

  const handleExportCashCsv = () => {
    exportCsvReport(
      paymentsInRange.map((p) => {
        const cust = customerById.get(p.customerId);
        const ord = orderById.get(p.orderId);
        return {
          "Ngày thu": formatVnDate(p.paidDate),
          "Mã GD": p.paymentCode,
          "Khách hàng": cust?.fullName || "",
          "Đơn hàng": ord?.orderCode || p.orderId,
          "Dịch vụ": ord?.serviceNameSnapshot || "",
          "Phương thức": PAYMENT_METHOD_LABELS[p.method] || p.method,
          "Tiền thực thu (VNĐ)": p.amountVnd,
          "Ghi chú": p.note,
        };
      }),
      `DkTEST_TienThucThu_${fromDate}_${toDate}.csv`
    );
  };

  return (
    <div className="space-y-5">
      {/* Export Actions & Date Range */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-end justify-between gap-4 shadow-2xs">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Thực thu từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportFullExcelWorkbook(
                customerSummaries,
                orderSummaries,
                payments,
                services,
                asOfDate
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel đầy đủ (.xlsx)
          </button>
          <button
            type="button"
            onClick={handleExportDebtCsv}
            disabled={customerSummaries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> CSV Công nợ
          </button>
          <button
            type="button"
            onClick={handleExportCashCsv}
            disabled={paymentsInRange.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> CSV Tiền thực thu
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-4">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
            Tiền thực thu trong kỳ ({formatVnDate(fromDate)} – {formatVnDate(toDate)})
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {formatVnd(totalActualCashInRange)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {paymentsInRange.length} giao dịch hợp lệ • Tính theo ngày nhận tiền thực tế
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-4">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-400">
            Tổng công nợ đến {formatVnDate(asOfDate)}
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatVnd(dashboard.debtUpToAsOfDateVnd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {dashboard.debtorCustomers.length} khách đang còn nợ
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-sky-900/60 p-4">
          <div className="text-xs font-bold text-sky-700 dark:text-sky-400">
            Tổng tiền khách trả trước
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {formatVnd(dashboard.prepaidVnd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cộng riêng theo từng đơn, không tự bù nợ đơn khác
          </div>
        </div>
      </div>

      {/* Breakdown by Payment Method */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Tiền thực thu theo phương thức thanh toán
        </h3>
        {byMethod.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">Không có giao dịch trong khoảng thời gian đã chọn.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {byMethod.map((m) => (
              <div
                key={m.method}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {PAYMENT_METHOD_LABELS[m.method] || m.method}
                  </div>
                  <div className="text-[11px] text-slate-500">{m.count} giao dịch</div>
                </div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatVnd(m.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Service Report */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Tổng hợp theo từng dịch vụ (đến {formatVnDate(asOfDate)})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-left">
                <th className="py-2.5 px-2 font-bold">Dịch vụ</th>
                <th className="py-2.5 px-2 text-right font-bold">Đơn đang chạy / Tổng</th>
                <th className="py-2.5 px-2 text-right font-bold">Phải thu</th>
                <th className="py-2.5 px-2 text-right font-bold">Tiền thực thu</th>
                <th className="py-2.5 px-2 text-right font-bold">Còn nợ</th>
                <th className="py-2.5 px-2 text-right font-bold">Trả trước</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dashboard.serviceStats.map((s) => (
                <tr key={s.serviceId}>
                  <td className="py-2.5 px-2 font-bold text-slate-800 dark:text-slate-100">
                    {s.serviceName}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {s.activeOrderCount} / {s.totalOrderCount}
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold">
                    {formatVnd(s.dueUpToAsOfDateVnd)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-emerald-600">
                    {formatVnd(s.actualCollectedVnd)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-rose-600">
                    {formatVnd(s.debtUpToAsOfDateVnd)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-sky-600">
                    {formatVnd(s.prepaidVnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
