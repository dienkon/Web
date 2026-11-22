import React from "react";
import {
  Users,
  ShoppingBag,
  Banknote,
  CalendarClock,
  AlertCircle,
  Wallet,
  Clock,
  Sparkles,
  UserPlus,
  PlusCircle,
  TrendingUp,
  BellRing,
  PackageCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type {
  AiBillingStatus,
  AiCustomer,
  AiDashboardSummary,
  AiServiceItem,
} from "../../types/aiShop";
import { formatVnDate, formatVnd } from "../../services/aiShop/billingEngine";

interface AiShopDashboardTabProps {
  dashboard: AiDashboardSummary;
  customers: AiCustomer[];
  services: AiServiceItem[];
  hasAnyOrders: boolean;
  asOfDate: string;
  filterCustomerId: string;
  filterServiceId: string;
  filterStatus: AiBillingStatus | "all";
  onChangeAsOfDate: (date: string) => void;
  onChangeFilterCustomerId: (id: string) => void;
  onChangeFilterServiceId: (id: string) => void;
  onChangeFilterStatus: (status: AiBillingStatus | "all") => void;
  onQuickAddCustomer: () => void;
  onQuickAddOrder: () => void;
  onQuickAddPayment: (orderId?: string, customerId?: string) => void;
  onInspectCustomer: (customerId: string) => void;
  onInspectOrder: (orderId: string) => void;
}

export const AiShopDashboardTab: React.FC<AiShopDashboardTabProps> = ({
  dashboard,
  customers,
  services,
  hasAnyOrders,
  asOfDate,
  filterCustomerId,
  filterServiceId,
  filterStatus,
  onChangeAsOfDate,
  onChangeFilterCustomerId,
  onChangeFilterServiceId,
  onChangeFilterStatus,
  onQuickAddCustomer,
  onQuickAddOrder,
  onQuickAddPayment,
  onInspectCustomer,
  onInspectOrder,
}) => {
  // Empty state onboarding (NEVER display fabricated numbers!)
  if (customers.length === 0 && !hasAnyOrders) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Bắt đầu quản lý bán Acc AI & Công nợ thay cho Excel
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hệ thống chưa có khách hàng hoặc đơn hàng nào. Thực hiện 3 bước sau để bắt đầu theo dõi lịch thu, tiền thực thu và công nợ tự động:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="text-xs font-black text-blue-600 dark:text-blue-400">BƯỚC 1</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">Thêm khách hàng</div>
            <p className="text-xs text-slate-500">
              Hoặc học sinh tự mua trên tab Cửa hàng Acc AI sẽ tự tạo hồ sơ khách.
            </p>
            <button
              type="button"
              onClick={onQuickAddCustomer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Thêm khách ngay
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">BƯỚC 2</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">Tạo đơn & chọn dịch vụ</div>
            <p className="text-xs text-slate-500">
              Bảng giá 10 dịch vụ AI đã sẵn sàng. Có thể chốt giá riêng cho từng đơn.
            </p>
            <button
              type="button"
              onClick={onQuickAddOrder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Tạo đơn đầu tiên
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">BƯỚC 3</div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">Ghi nhận thu tiền</div>
            <p className="text-xs text-slate-500">
              Hoặc vào tab Cài đặt để nhập toàn bộ dữ liệu từ file Excel hiện có.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-end gap-3 shadow-2xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">
            Tính công nợ đến ngày (VN)
          </label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => onChangeAsOfDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
          />
        </div>

        <div className="min-w-[170px] flex-1 sm:flex-none">
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Khách hàng</label>
          <select
            value={filterCustomerId}
            onChange={(e) => onChangeFilterCustomerId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="all">Tất cả khách hàng</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerCode} — {c.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[170px] flex-1 sm:flex-none">
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Dịch vụ</label>
          <select
            value={filterServiceId}
            onChange={(e) => onChangeFilterServiceId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="all">Tất cả dịch vụ</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px] flex-1 sm:flex-none">
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái đơn</label>
          <select
            value={filterStatus}
            onChange={(e) => onChangeFilterStatus(e.target.value as AiBillingStatus | "all")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="paid">Đã thanh toán</option>
            <option value="partial">Thanh toán một phần</option>
            <option value="upcoming">Chưa đến hạn</option>
            <option value="overdue">Quá hạn</option>
            <option value="stopped">Đã dừng</option>
          </select>
        </div>
      </div>

      {/* 7 Required KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1.5">
            <span>Tổng khách hàng</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {dashboard.totalActiveCustomers}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {dashboard.totalArchivedCustomers > 0
              ? `+ ${dashboard.totalArchivedCustomers} đã lưu trữ`
              : "Khách đang hoạt động"}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1.5">
            <span>Đơn / Dịch vụ đang chạy</span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {dashboard.activeOrderCount}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
            {dashboard.pendingDeliveryCount > 0
              ? `${dashboard.pendingDeliveryCount} đơn chờ giao tài khoản/slot`
              : "Tất cả đơn đã giao đủ"}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1.5">
            <span>Tiền thực thu trong tháng</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {formatVnd(dashboard.actualCollectedMonthVnd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Theo ngày nhận tiền thực tế (tháng {asOfDate.slice(5, 7)}/{asOfDate.slice(0, 4)})
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1.5">
            <span>Phải thu đến {formatVnDate(asOfDate)}</span>
            <CalendarClock className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatVnd(dashboard.dueUpToAsOfDateVnd)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tổng các kỳ có ngày đến hạn ≤ {formatVnDate(asOfDate)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold mb-1.5">
            <span>Còn nợ đến {formatVnDate(asOfDate)}</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatVnd(dashboard.debtUpToAsOfDateVnd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cộng riêng từng đơn (không bù trừ trả trước)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200/80 dark:border-sky-900/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-bold mb-1.5">
            <span>Tiền khách trả trước</span>
            <Wallet className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
            {formatVnd(dashboard.prepaidVnd)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tiền đã nhận chưa dùng cho kỳ đã đến hạn
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs col-span-2 lg:col-span-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
              <Clock className="w-4 h-4 text-rose-500" />
              <span>Số đơn quá hạn</span>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {dashboard.overdueOrderCount}{" "}
              <span className="text-sm font-semibold text-slate-500">đơn</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Không tính các đơn bắt đầu trong tương lai là quá hạn
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-500">Tổng thực thu (toàn bộ)</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100">
              {formatVnd(dashboard.actualCollectedTotalVnd)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Service Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Biểu đồ tiền thực thu theo tháng
              </h3>
              <p className="text-[11px] text-slate-500">
                Thống kê theo ngày nhận tiền thực tế (không đồng nhất với doanh thu kế toán)
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.monthlyCashSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  formatter={(value: any) => [formatVnd(Number(value)), "Tiền thực thu"]}
                  labelFormatter={(label) => `Tháng ${label}`}
                />
                <Bar dataKey="actualCollectedVnd" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Thống kê theo dịch vụ
          </h3>
          {dashboard.serviceStats.length === 0 ? (
            <div className="text-xs text-slate-400 py-10 text-center">
              Chưa có đơn hàng nào khớp bộ lọc.
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 text-left">
                    <th className="py-2 pr-2 font-semibold">Dịch vụ</th>
                    <th className="py-2 px-2 text-right font-semibold">Đơn</th>
                    <th className="py-2 px-2 text-right font-semibold">Thực thu</th>
                    <th className="py-2 pl-2 text-right font-semibold">Còn nợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dashboard.serviceStats.map((row) => (
                    <tr key={row.serviceId}>
                      <td className="py-2 pr-2 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{row.serviceName}</div>
                        <div className="text-[10px] text-slate-400">
                          {row.billingType === "monthly" ? "Hàng tháng" : "Một lần"}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300">
                        {row.activeOrderCount}/{row.totalOrderCount}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVnd(row.actualCollectedVnd)}
                      </td>
                      <td className="py-2 pl-2 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatVnd(row.debtUpToAsOfDateVnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Actionable Lists: Debtors, Due Soon (Today / 7d), Expiring Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Debtors */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              Khách còn nợ ({dashboard.debtorCustomers.length})
            </h3>
          </div>
          {dashboard.debtorCustomers.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Không có khách nào còn nợ đến ngày {formatVnDate(asOfDate)}.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {dashboard.debtorCustomers.map((cs) => (
                <div
                  key={cs.customer.id}
                  className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onInspectCustomer(cs.customer.id)}
                    className="text-left min-w-0 cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-blue-600">
                      {cs.customer.fullName}{" "}
                      <span className="text-[10px] text-slate-400">({cs.customer.customerCode})</span>
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                      Nợ: {formatVnd(cs.debtUpToAsOfDateVnd)}
                      {cs.prepaidVnd > 0 && (
                        <span className="text-sky-600 ml-1.5 font-medium">
                          (Trả trước đơn khác: {formatVnd(cs.prepaidVnd)})
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAddPayment(undefined, cs.customer.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Thu tiền
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due Today / Next 7 Days */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
            <BellRing className="w-4 h-4 text-amber-500" />
            Cần thu hôm nay / 7 ngày tới ({dashboard.dueSoonItems.length})
          </h3>
          {dashboard.dueSoonItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Không có kỳ nào đến hạn trong 7 ngày tới.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {dashboard.dueSoonItems.map((item) => (
                <div
                  key={`${item.orderId}_${item.periodNumber}`}
                  className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onInspectOrder(item.orderId)}
                    className="text-left min-w-0 cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.customerName} — {item.serviceName}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Kỳ #{item.periodNumber} • Hạn{" "}
                      <b className={item.isDueToday ? "text-rose-600" : "text-amber-700 dark:text-amber-400"}>
                        {formatVnDate(item.dueDate)} {item.isDueToday ? "(Hôm nay)" : `(còn ${item.daysUntilDue} ngày)`}
                      </b>
                    </div>
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      Cần thu: {formatVnd(item.remainingVnd)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAddPayment(item.orderId, item.customerId)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    Thu
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Services */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
            <PackageCheck className="w-4 h-4 text-indigo-500" />
            Dịch vụ sắp hết hạn ({dashboard.expiringServices.length})
          </h3>
          {dashboard.expiringServices.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Không có gói dịch vụ nào hết hạn trong 7 ngày tới.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {dashboard.expiringServices.map((item) => (
                <button
                  key={item.orderId}
                  type="button"
                  onClick={() => onInspectOrder(item.orderId)}
                  className="w-full text-left p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.customerName} — {item.serviceName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Slot/Acc: {item.accountSlot || "Chưa gán"}
                  </div>
                  <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                    Hết hạn dịch vụ: {formatVnDate(item.serviceExpiryDate)}{" "}
                    {item.daysUntilExpiry === 0 ? "(Hôm nay)" : `(còn ${item.daysUntilExpiry} ngày)`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
