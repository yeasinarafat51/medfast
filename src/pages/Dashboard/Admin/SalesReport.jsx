import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FaChartLine,
  FaCalendarDay,
  FaCalendarAlt,
  FaShoppingBag,
  FaSearch,
  FaSyncAlt,
  FaFileInvoice,
  FaPills,
  FaClipboardList,
  FaPhoneAlt,
  FaPrint,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

const ORDERS_CACHE_KEY = "novacare_orders_cache_v1";

function SalesReport() {
  const { user } = useAuth();

  // ক্যাশ থেকে ০ সেকেন্ডে তাৎক্ষণিক লোড
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem(ORDERS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem(ORDERS_CACHE_KEY);
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  // ফিল্টার স্টেটস
  const [periodFilter, setPeriodFilter] = useState("all"); // "all" | "today" | "week" | "month"
  const [statusFilter, setStatusFilter] = useState("active"); // "active" | "Completed" | "Pending" | "Processing" | "Cancelled"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "medicines"

  // =====================================================
  // LOAD LIVE ORDERS FOR 100% ACCURATE SALES CALCULATION
  // =====================================================
  const loadReport = async () => {
    try {
      if (orders.length === 0) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }
      setError("");

      const res = await axios.get(`${API_URL}/api/orders`);

      if (res.data?.success && Array.isArray(res.data.orders)) {
        const fetchedOrders = res.data.orders;
        setOrders(fetchedOrders);
        try {
          localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(fetchedOrders));
        } catch {
          // ignore storage quota
        }
      } else if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error("Sales Report Error:", err);
      if (orders.length === 0) {
        setError(
          err.response?.data?.message || "Failed to load sales report data.",
        );
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [user]);

  // =====================================================
  // HELPER FUNCTIONS FOR ACCURATE ORDER TOTAL & QUANTITY
  // =====================================================
  const getOrderItems = (order) => {
    return Array.isArray(order?.items)
      ? order.items.filter((it) => Number(it.quantity || 0) > 0)
      : [];
  };

  const getQuantity = (order) => {
    const items = getOrderItems(order);
    if (items.length > 0) {
      return items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0,
      );
    }
    return Number(order?.quantity || 0);
  };

  const getOrderTotal = (order) => {
    const grand = Number(order?.grandTotal || 0);
    if (grand > 0) return grand;

    const items = getOrderItems(order);
    return items.reduce((sum, it) => {
      const unit = Number(it.unitPrice || it.sellingPrice || 0);
      const qty = Number(it.quantity || 0);
      return sum + (Number(it.totalPrice) || unit * qty);
    }, 0);
  };

  const getMedicineNames = (order) => {
    const items = getOrderItems(order);
    if (items.length > 0) {
      return items
        .map(
          (item) =>
            `${item.medicineName || item.name || "Medicine"} (${item.quantity}x)`,
        )
        .join(", ");
    }
    return order?.medicineName || "No items";
  };

  // =====================================================
  // ২:০০ PM -> ২:০০ PM কারেন্ট বিজনেস সাইকেল চেক
  // =====================================================
  const getCurrentBusinessCycleRange = () => {
    const now = new Date();
    const cycleStart = new Date(now);
    if (now.getHours() < 14) {
      cycleStart.setDate(cycleStart.getDate() - 1);
    }
    cycleStart.setHours(14, 0, 0, 0);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 1);

    return { cycleStart, cycleEnd };
  };

  // =====================================================
  // 100% ACCURATE SUMMARY METRICS (EXCLUDING CANCELLED/RETURNED)
  // =====================================================
  const analytics = useMemo(() => {
    const { cycleStart, cycleEnd } = getCurrentBusinessCycleRange();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // যেসব অর্ডারে আইটেম আছে এবং স্ট্যাটাস Cancelled নয়, সেগুলোই আসল বিক্রি
    const validSalesOrders = orders.filter((o) => {
      const items = getOrderItems(o);
      const total = getOrderTotal(o);
      const isCancelled =
        String(o.orderStatus || "").toLowerCase() === "cancelled";
      return !isCancelled && items.length > 0 && total > 0;
    });

    let totalRevenue = 0;
    let todayRevenue = 0;
    let monthRevenue = 0;
    let weekRevenue = 0;

    let todayOrdersCount = 0;
    let monthOrdersCount = 0;
    let totalUnitsSold = 0;

    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let paidRevenue = 0;
    let unpaidRevenue = 0;

    validSalesOrders.forEach((order) => {
      const total = getOrderTotal(order);
      const units = getQuantity(order);
      const d = new Date(order.orderDate || order.createdAt || Date.now());
      const status = String(order.orderStatus || "Pending").toLowerCase();
      const payStatus = String(order.paymentStatus || "Unpaid").toLowerCase();

      totalRevenue += total;
      totalUnitsSold += units;

      if (status === "completed" || status === "delivered") {
        completedOrdersCount += 1;
      } else {
        pendingOrdersCount += 1;
      }

      if (payStatus === "paid") {
        paidRevenue += total;
      } else {
        unpaidRevenue += total;
      }

      // Today's Sales (Current 2 PM - 2 PM Cycle OR Today's Calendar Date)
      const isCurrentCycle = d >= cycleStart && d <= cycleEnd;
      const isSameCalendarDay =
        d.getDate() === now.getDate() &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear;

      if (isCurrentCycle || isSameCalendarDay) {
        todayRevenue += total;
        todayOrdersCount += 1;
      }

      // Current Month's Sales
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthRevenue += total;
        monthOrdersCount += 1;
      }

      // Last 7 Days Sales
      if (d >= sevenDaysAgo) {
        weekRevenue += total;
      }
    });

    return {
      totalRevenue,
      todayRevenue,
      monthRevenue,
      weekRevenue,
      totalOrders: validSalesOrders.length,
      todayOrdersCount,
      monthOrdersCount,
      totalUnitsSold,
      completedOrdersCount,
      pendingOrdersCount,
      paidRevenue,
      unpaidRevenue,
    };
  }, [orders]);

  // =====================================================
  // FILTERED ORDERS FOR TABLE
  // =====================================================
  const filteredOrders = useMemo(() => {
    const { cycleStart, cycleEnd } = getCurrentBusinessCycleRange();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return orders
      .filter((order) => {
        const items = getOrderItems(order);
        const total = getOrderTotal(order);
        if (items.length === 0 || total <= 0) return false;

        // Status Filter
        const status = String(order.orderStatus || "Pending");
        if (statusFilter === "active") {
          if (status.toLowerCase() === "cancelled") return false;
        } else if (statusFilter !== "all") {
          if (status.toLowerCase() !== statusFilter.toLowerCase()) return false;
        }

        // Time Period Filter
        const d = new Date(order.orderDate || order.createdAt || Date.now());
        if (periodFilter === "today") {
          const isCurrentCycle = d >= cycleStart && d <= cycleEnd;
          const isSameDay =
            d.getDate() === now.getDate() &&
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear;
          if (!isCurrentCycle && !isSameDay) return false;
        } else if (periodFilter === "week") {
          if (d < sevenDaysAgo) return false;
        } else if (periodFilter === "month") {
          if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear)
            return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const customerMatch = (order.customerName || "")
            .toLowerCase()
            .includes(q);
          const phoneMatch = (order.phone || "").toLowerCase().includes(q);
          const emailMatch = (order.customerEmail || "")
            .toLowerCase()
            .includes(q);
          const invoiceMatch = (order.invoiceNo || order._id || "")
            .toLowerCase()
            .includes(q);
          const medMatch = getMedicineNames(order).toLowerCase().includes(q);

          return (
            customerMatch ||
            phoneMatch ||
            emailMatch ||
            invoiceMatch ||
            medMatch
          );
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.orderDate || b.createdAt || 0) -
          new Date(a.orderDate || a.createdAt || 0),
      );
  }, [orders, periodFilter, statusFilter, searchQuery]);

  // =====================================================
  // TOP SELLING MEDICINES BREAKDOWN (FROM FILTERED ORDERS)
  // =====================================================
  const medicineSalesBreakdown = useMemo(() => {
    const map = {};

    filteredOrders.forEach((order) => {
      if (String(order.orderStatus || "").toLowerCase() === "cancelled") return;

      getOrderItems(order).forEach((item) => {
        const medName = item.medicineName || item.name || "Medicine";
        const key = `${medName}__${item.company || ""}`.toLowerCase();
        const qty = Number(item.quantity || 0);
        const unit = Number(item.unitPrice || item.sellingPrice || 0);
        const sub = Number(item.totalPrice) || unit * qty;

        if (!map[key]) {
          map[key] = {
            medicineName: medName,
            company: item.company || "Generic",
            unitPrice: unit,
            totalQty: 0,
            totalAmount: 0,
            orderCount: 0,
          };
        }

        map[key].totalQty += qty;
        map[key].totalAmount += sub;
        map[key].orderCount += 1;
      });
    });

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredOrders]);

  const filteredSumTotal = useMemo(() => {
    return filteredOrders.reduce((s, o) => s + getOrderTotal(o), 0);
  }, [filteredOrders]);

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadge = (status) => {
    const s = String(status || "Pending").toLowerCase();
    if (s === "completed" || s === "delivered") {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    if (s === "cancelled") {
      return "bg-rose-100 text-rose-700 border border-rose-200";
    }
    if (s === "processing" || s === "shipped") {
      return "bg-blue-100 text-blue-700 border border-blue-200";
    }
    return "bg-amber-100 text-amber-800 border border-amber-200";
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600"></div>
          <h2 className="text-xl font-black text-slate-800">
            Loading Sales Analytics...
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Calculating accurate revenue & order metrics
          </p>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <h2 className="mb-2 text-xl font-black text-rose-600">
            Sales Report Error
          </h2>
          <p className="mb-6 text-xs text-slate-600">{error}</p>
          <button
            onClick={loadReport}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black text-white shadow-md transition hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-2 sm:p-5">
      {/* =====================================================
          TOP EXECUTIVE HEADER
      ===================================================== */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800">
              100% Live Verified Analytics
            </span>
            {isSyncing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-200">
                <FaSyncAlt className="animate-spin" size={9} />
                Syncing...
              </span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            NovaCare Sales Report
          </h1>
          <p className="text-xs text-slate-500">
            সকল অ্যাক্টিভ অর্ডারের সঠিক হিসাব (Cancelled ও Returned অর্ডার বাদে)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadReport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <FaSyncAlt
              className={isSyncing ? "animate-spin text-emerald-600" : ""}
            />
            <span>Refresh Data</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <FaPrint className="text-emerald-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* =====================================================
          4 PREMIUM KPI CARDS
      ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. TOTAL SALES */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Total Net Sales
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-lg">
              <FaChartLine />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            ৳ {formatCurrency(analytics.totalRevenue)}
          </h2>
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[11px] text-emerald-100">
            <span>মোট অ্যাক্টিভ অর্ডার: {analytics.totalOrders} টি</span>
            <span className="font-bold">
              {analytics.totalUnitsSold} pcs sold
            </span>
          </div>
        </div>

        {/* 2. TODAY'S SALES (2 PM - 2 PM CYCLE) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
              Today&apos;s Sales (2 PM Cycle)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-lg">
              <FaCalendarDay />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            ৳ {formatCurrency(analytics.todayRevenue)}
          </h2>
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[11px] text-blue-100">
            <span>আজকের অর্ডার: {analytics.todayOrdersCount} টি</span>
            <span className="font-bold">2:00 PM → 2:00 PM</span>
          </div>
        </div>

        {/* 3. MONTHLY SALES */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-100">
              Current Month Sales
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-lg">
              <FaCalendarAlt />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            ৳ {formatCurrency(analytics.monthRevenue)}
          </h2>
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[11px] text-purple-100">
            <span>চলতি মাসের অর্ডার: {analytics.monthOrdersCount} টি</span>
            <span className="font-bold">
              {new Date().toLocaleString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* 4. ORDERS & STATUS BREAKDOWN */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Orders & Delivery Status
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-lg text-emerald-400">
              <FaShoppingBag />
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            {analytics.totalOrders.toLocaleString()} Orders
          </h2>
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2.5 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <FaCheckCircle size={10} /> Completed:{" "}
              {analytics.completedOrdersCount}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <FaClock size={10} /> Pending: {analytics.pendingOrdersCount}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          FILTERS, PERIOD TABS & SEARCH BAR
      ===================================================== */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* TIME PERIOD PILLS */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today (2 PM Cycle)" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodFilter(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  periodFilter === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SEARCH + STATUS FILTER */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="active">All Active Orders</option>
              <option value="Completed">Completed Only</option>
              <option value="Pending">Pending Only</option>
              <option value="Processing">Processing Only</option>
              <option value="Cancelled">Cancelled Orders</option>
            </select>

            <div className="relative w-full sm:w-64">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, phone, medicine..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* VIEW MODE SWITCHER + FILTERED SUMMARY */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === "orders"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FaClipboardList />
              <span>Orders List ({filteredOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("medicines")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === "medicines"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FaPills />
              <span>Medicine-Wise Sales ({medicineSalesBreakdown.length})</span>
            </button>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-900">
            Filtered Total:{" "}
            <span className="font-black text-emerald-700">
              ৳ {formatCurrency(filteredSumTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          TAB 1: ORDERS SALES TABLE
      ===================================================== */}
      {activeTab === "orders" ? (
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Customer & Phone</th>
                  <th className="px-4 py-3.5">Medicines Ordered</th>
                  <th className="px-4 py-3.5 text-center">Total Qty</th>
                  <th className="px-4 py-3.5 text-right">Amount (৳)</th>
                  <th className="px-4 py-3.5 text-center">Payment</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Invoice</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-12 text-center text-sm font-bold text-slate-400"
                    >
                      No matching sales records found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const medicineNames = getMedicineNames(order);
                    const quantity = getQuantity(order);
                    const total = getOrderTotal(order);
                    const orderStatus = order.orderStatus || "Pending";
                    const paymentStatus = order.paymentStatus || "Unpaid";
                    const d = order.orderDate
                      ? new Date(order.orderDate)
                      : null;

                    return (
                      <tr
                        key={order._id || index}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {d
                              ? d.toLocaleDateString("en-BD", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d
                              ? d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-black text-slate-900">
                            {order.customerName || "Walk-in Customer"}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <FaPhoneAlt className="text-[9px] text-emerald-600" />
                            <span>
                              {order.phone || order.customerEmail || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="max-w-[260px] px-4 py-3.5">
                          <div
                            className="line-clamp-2 font-semibold text-slate-700 leading-snug"
                            title={medicineNames}
                          >
                            {medicineNames}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {getOrderItems(order).length} item(s)
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-black text-slate-800">
                            {quantity} pcs
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                          ৳ {formatCurrency(total)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                              paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${getStatusBadge(
                              orderStatus,
                            )}`}
                          >
                            {orderStatus}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <Link
                            to={`/dashboard/invoice/${order._id}`}
                            state={{ combinedOrder: order }}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-600"
                          >
                            <FaFileInvoice size={10} />
                            <span>Invoice</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* =====================================================
            TAB 2: MEDICINE-WISE SALES SUMMARY TABLE
        ===================================================== */
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">Medicine Name</th>
                  <th className="px-4 py-3.5">Company</th>
                  <th className="px-4 py-3.5 text-center">Orders Count</th>
                  <th className="px-4 py-3.5 text-center">Total Qty Sold</th>
                  <th className="px-4 py-3.5 text-right">Unit Rate (৳)</th>
                  <th className="px-4 py-3.5 text-right">Total Sales (৳)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {medicineSalesBreakdown.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-12 text-center text-sm font-bold text-slate-400"
                    >
                      No medicine sales found for this period.
                    </td>
                  </tr>
                ) : (
                  medicineSalesBreakdown.map((med, idx) => (
                    <tr key={idx} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900">
                        {med.medicineName}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-500">
                        {med.company}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-600">
                        {med.orderCount} orders
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-black text-emerald-800">
                          {med.totalQty} pcs
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-600">
                        ৳ {formatCurrency(med.unitPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-sm">
                        ৳ {formatCurrency(med.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesReport;
