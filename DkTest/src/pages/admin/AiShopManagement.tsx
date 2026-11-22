import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Banknote,
  Package,
  BarChart3,
  Settings,
  UserPlus,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import type {
  AiBillingStatus,
  AiCustomer,
  AiOrder,
  AiOrderAttachment,
  AiPayment,
  AiShopBootstrapPayload,
} from "../../types/aiShop";
import {
  computeCustomerFinancialSummaries,
  computeDashboardSummary,
  getTodayVnDate,
} from "../../services/aiShop/billingEngine";
import {
  archiveAiCustomerApi,
  deleteAiCustomerApi,
  fetchAdminAiShopBootstrap,
  updateAiOrderApi,
  voidAiPaymentApi,
} from "../../services/aiShopClientService";
import { CustomerFormModal } from "../../components/ai-shop/CustomerFormModal";
import { OrderFormModal } from "../../components/ai-shop/OrderFormModal";
import { PaymentFormModal } from "../../components/ai-shop/PaymentFormModal";
import { AiShopDashboardTab } from "../../components/ai-shop/AiShopDashboardTab";
import { AiShopCustomersTab } from "../../components/ai-shop/AiShopCustomersTab";
import { AiShopOrdersTab } from "../../components/ai-shop/AiShopOrdersTab";
import { AiShopPaymentsTab } from "../../components/ai-shop/AiShopPaymentsTab";
import { AiShopServicesTab } from "../../components/ai-shop/AiShopServicesTab";
import { AiShopReportsTab } from "../../components/ai-shop/AiShopReportsTab";
import { AiShopSettingsTab } from "../../components/ai-shop/AiShopSettingsTab";

type AdminAiTab =
  | "overview"
  | "customers"
  | "orders"
  | "payments"
  | "services"
  | "reports"
  | "settings";

const TABS: Array<{ id: AdminAiTab; label: string; icon: React.ComponentType<any> }> = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "customers", label: "Khách hàng", icon: Users },
  { id: "orders", label: "Đơn hàng", icon: ShoppingBag },
  { id: "payments", label: "Thu tiền", icon: Banknote },
  { id: "services", label: "Dịch vụ", icon: Package },
  { id: "reports", label: "Báo cáo", icon: BarChart3 },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

export default function AiShopManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminAiTab>(() => {
    const t = searchParams.get("tab") as AdminAiTab | null;
    if (t && TABS.some((x) => x.id === t)) return t;
    if (searchParams.get("orderId")) return "orders";
    return "overview";
  });
  const [data, setData] = useState<AiShopBootstrapPayload>({
    services: [],
    customers: [],
    orders: [],
    payments: [],
    auditLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dashboard filters
  const [asOfDate, setAsOfDate] = useState(getTodayVnDate());
  const [filterCustomerId, setFilterCustomerId] = useState("all");
  const [filterServiceId, setFilterServiceId] = useState("all");
  const [filterStatus, setFilterStatus] = useState<AiBillingStatus | "all">("all");

  // Selection states for detail drawers
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    () => searchParams.get("orderId") || null
  );

  // Deep-link handler (e.g. Admin clicks direct link from Discord webhook)
  useEffect(() => {
    const orderIdParam = searchParams.get("orderId");
    const tabParam = searchParams.get("tab") as AdminAiTab | null;
    if (tabParam && TABS.some((x) => x.id === tabParam)) {
      setActiveTab(tabParam);
    }
    if (orderIdParam) {
      setActiveTab("orders");
      setSelectedOrderId(orderIdParam);
    }
  }, [searchParams]);

  // Modals
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AiCustomer | null>(null);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<AiOrder | null>(null);
  const [orderDefaultCustomerId, setOrderDefaultCustomerId] = useState<string | undefined>(undefined);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<AiPayment | null>(null);
  const [paymentDefaultOrderId, setPaymentDefaultOrderId] = useState<string | undefined>(undefined);
  const [paymentDefaultCustomerId, setPaymentDefaultCustomerId] = useState<string | undefined>(
    undefined
  );

  const notify = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadData = useCallback(
    async (force = false) => {
      try {
        if (force) setRefreshing(true);
        else setLoading(true);
        const res = await fetchAdminAiShopBootstrap(force);
        setData(res);
      } catch (err: any) {
        notify("error", err?.message || "Không tải được dữ liệu quản lý Acc AI.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  // Derived deterministic financial state (NEVER manually entered totals!)
  const { customerSummaries, orderSummaries } = useMemo(
    () =>
      computeCustomerFinancialSummaries(
        data.customers,
        data.orders,
        data.payments,
        asOfDate
      ),
    [data.customers, data.orders, data.payments, asOfDate]
  );

  const dashboard = useMemo(
    () =>
      computeDashboardSummary(
        data.customers,
        data.services,
        data.orders,
        data.payments,
        {
          asOfDate,
          customerId: filterCustomerId,
          serviceId: filterServiceId,
          status: filterStatus,
        }
      ),
    [
      data.customers,
      data.services,
      data.orders,
      data.payments,
      asOfDate,
      filterCustomerId,
      filterServiceId,
      filterStatus,
    ]
  );

  const pendingDeliveryBadge = useMemo(
    () =>
      data.orders.filter((o) => o.fulfillmentStatus === "pending_delivery" && !o.stopDate).length,
    [data.orders]
  );

  // Handlers
  const openQuickAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerModalOpen(true);
  };

  const openQuickAddOrder = (customerId?: string) => {
    setEditingOrder(null);
    setOrderDefaultCustomerId(customerId);
    setOrderModalOpen(true);
  };

  const openQuickAddPayment = (orderId?: string, customerId?: string) => {
    setEditingPayment(null);
    setPaymentDefaultOrderId(orderId);
    setPaymentDefaultCustomerId(customerId);
    setPaymentModalOpen(true);
  };

  const handleArchiveCustomer = async (customer: AiCustomer, archive: boolean) => {
    try {
      await archiveAiCustomerApi(customer.id, archive);
      notify(
        "success",
        archive
          ? `Đã lưu trữ khách hàng ${customer.customerCode} (lịch sử giao dịch được bảo toàn).`
          : `Đã khôi phục khách hàng ${customer.customerCode}.`
      );
      await loadData(true);
    } catch (err: any) {
      notify("error", err?.message || "Không thể thay đổi trạng thái lưu trữ khách hàng.");
    }
  };

  const handleDeleteCustomer = async (customer: AiCustomer) => {
    if (
      !window.confirm(
        `Xóa khách hàng ${customer.customerCode} (${customer.fullName})? Thao tác này chỉ áp dụng cho khách chưa phát sinh giao dịch.`
      )
    ) {
      return;
    }
    try {
      await deleteAiCustomerApi(customer.id);
      notify("success", `Đã xóa khách hàng ${customer.customerCode}.`);
      await loadData(true);
    } catch (err: any) {
      notify("error", err?.message || "Không thể xóa khách hàng.");
    }
  };

  const handleQuickDeliverOrder = async (
    order: AiOrder,
    payload: {
      accountSlot: string;
      adminDeliveryNote: string;
      adminAttachments: AiOrderAttachment[];
      fulfillmentStatus: "pending_delivery" | "delivered";
    }
  ) => {
    try {
      await updateAiOrderApi(order.id, payload);
      notify(
        "success",
        `Đã hoàn tất đơn ${order.orderCode} và gửi thông báo kèm ghi chú/tệp đính kèm cho học sinh!`
      );
      await loadData(true);
    } catch (err: any) {
      notify("error", err?.message || "Không thể cập nhật bàn giao đơn.");
    }
  };

  const handleQuickStopOrder = async (order: AiOrder, stopDate: string | null) => {
    try {
      await updateAiOrderApi(order.id, { stopDate });
      notify(
        "success",
        stopDate
          ? `Đã dừng đơn ${order.orderCode} từ ngày ${stopDate} (không phát sinh kỳ thu từ ngày này trở đi).`
          : `Đã mở lại đơn ${order.orderCode}.`
      );
      await loadData(true);
    } catch (err: any) {
      notify("error", err?.message || "Không thể cập nhật ngày dừng đơn.");
    }
  };

  const handleVoidPayment = async (payment: AiPayment, reason: string) => {
    try {
      await voidAiPaymentApi(payment.id, reason);
      notify("success", `Đã hủy giao dịch ${payment.paymentCode} và tính lại công nợ.`);
      await loadData(true);
    } catch (err: any) {
      notify("error", err?.message || "Không thể hủy giao dịch.");
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-0.5 hover:bg-white/20 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header + Quick Action Buttons (Always Visible!) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 lg:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Quản lý Khách hàng, Dịch vụ AI & Công nợ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đồng bộ tự động với tab Học sinh mua Acc AI (Ví DkTEST) và quản lý đơn thủ công — múi giờ Asia/Ho_Chi_Minh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openQuickAddCustomer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Thêm khách
          </button>
          <button
            type="button"
            onClick={() => openQuickAddOrder()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Thêm đơn
          </button>
          <button
            type="button"
            onClick={() => openQuickAddPayment()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Banknote className="w-4 h-4" /> Thu tiền
          </button>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Tải lại dữ liệu mới nhất"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 7-Item Vietnamese Navigation Menu */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex items-center gap-1 overflow-x-auto shadow-2xs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.id === "orders" && pendingDeliveryBadge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? "bg-white text-blue-700" : "bg-amber-500 text-white"
                  }`}
                >
                  {pendingDeliveryBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-sm text-slate-500">
          Đang tải dữ liệu khách hàng, đơn hàng & công nợ...
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <AiShopDashboardTab
              dashboard={dashboard}
              customers={data.customers}
              services={data.services}
              hasAnyOrders={data.orders.length > 0}
              asOfDate={asOfDate}
              filterCustomerId={filterCustomerId}
              filterServiceId={filterServiceId}
              filterStatus={filterStatus}
              onChangeAsOfDate={setAsOfDate}
              onChangeFilterCustomerId={setFilterCustomerId}
              onChangeFilterServiceId={setFilterServiceId}
              onChangeFilterStatus={setFilterStatus}
              onQuickAddCustomer={openQuickAddCustomer}
              onQuickAddOrder={() => openQuickAddOrder()}
              onQuickAddPayment={openQuickAddPayment}
              onInspectCustomer={(cid) => {
                setSelectedCustomerId(cid);
                setActiveTab("customers");
              }}
              onInspectOrder={(oid) => {
                setSelectedOrderId(oid);
                setActiveTab("orders");
              }}
            />
          )}

          {activeTab === "customers" && (
            <AiShopCustomersTab
              customerSummaries={customerSummaries}
              payments={data.payments}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomerId={setSelectedCustomerId}
              onAddCustomer={openQuickAddCustomer}
              onEditCustomer={(cust) => {
                setEditingCustomer(cust);
                setCustomerModalOpen(true);
              }}
              onArchiveCustomer={handleArchiveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onQuickAddOrderForCustomer={(cid) => openQuickAddOrder(cid)}
              onQuickAddPayment={openQuickAddPayment}
              onInspectOrder={(oid) => {
                setSelectedCustomerId(null);
                setSelectedOrderId(oid);
                setActiveTab("orders");
              }}
            />
          )}

          {activeTab === "orders" && (
            <AiShopOrdersTab
              orderSummaries={orderSummaries}
              customers={data.customers}
              services={data.services}
              selectedOrderId={selectedOrderId}
              onSelectOrderId={(id) => {
                setSelectedOrderId(id);
                if (!id && searchParams.get("orderId")) {
                  const next = new URLSearchParams(searchParams);
                  next.delete("orderId");
                  setSearchParams(next, { replace: true });
                }
              }}
              onAddOrder={() => openQuickAddOrder()}
              onEditOrder={(ord) => {
                setEditingOrder(ord);
                setOrderModalOpen(true);
              }}
              onQuickDeliverOrder={handleQuickDeliverOrder}
              onQuickStopOrder={handleQuickStopOrder}
              onQuickAddPayment={(oid, cid) => openQuickAddPayment(oid, cid)}
            />
          )}

          {activeTab === "payments" && (
            <AiShopPaymentsTab
              payments={data.payments}
              customers={data.customers}
              orders={data.orders}
              onAddPayment={() => openQuickAddPayment()}
              onEditPayment={(pay) => {
                setEditingPayment(pay);
                setPaymentModalOpen(true);
              }}
              onVoidPayment={handleVoidPayment}
            />
          )}

          {activeTab === "services" && (
            <AiShopServicesTab
              services={data.services}
              onRefresh={() => loadData(true)}
              onNotify={notify}
            />
          )}

          {activeTab === "reports" && (
            <AiShopReportsTab
              dashboard={dashboard}
              customerSummaries={customerSummaries}
              orderSummaries={orderSummaries}
              payments={data.payments}
              services={data.services}
              customers={data.customers}
              asOfDate={asOfDate}
            />
          )}

          {activeTab === "settings" && (
            <AiShopSettingsTab
              data={data}
              asOfDate={asOfDate}
              onRefresh={() => loadData(true)}
              onNotify={notify}
            />
          )}
        </>
      )}

      {/* Shared Modals */}
      <CustomerFormModal
        open={customerModalOpen}
        editingCustomer={editingCustomer}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={async (customer, isEdit) => {
          notify(
            "success",
            isEdit
              ? `Đã cập nhật khách hàng ${customer.customerCode}.`
              : `Đã thêm khách hàng ${customer.customerCode} — ${customer.fullName}.`
          );
          await loadData(true);
        }}
      />

      <OrderFormModal
        open={orderModalOpen}
        editingOrder={editingOrder}
        defaultCustomerId={orderDefaultCustomerId}
        customers={data.customers}
        services={data.services}
        onClose={() => setOrderModalOpen(false)}
        onRequestQuickAddCustomer={() => {
          setOrderModalOpen(false);
          openQuickAddCustomer();
        }}
        onSaved={async (order, isEdit) => {
          notify(
            "success",
            isEdit
              ? `Đã cập nhật đơn ${order.orderCode}.`
              : `Đã tạo đơn ${order.orderCode} (${order.serviceNameSnapshot}).`
          );
          await loadData(true);
        }}
      />

      <PaymentFormModal
        open={paymentModalOpen}
        editingPayment={editingPayment}
        defaultOrderId={paymentDefaultOrderId}
        defaultCustomerId={paymentDefaultCustomerId}
        customers={data.customers}
        orderSummaries={orderSummaries}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={async (payment, isEdit) => {
          notify(
            "success",
            isEdit
              ? `Đã cập nhật giao dịch ${payment.paymentCode}.`
              : `Đã ghi nhận thu tiền ${payment.paymentCode} và phân bổ tự động vào lịch thu.`
          );
          await loadData(true);
        }}
      />
    </div>
  );
}
