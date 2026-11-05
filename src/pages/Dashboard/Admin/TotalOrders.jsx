import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaCalendarAlt,
  FaShoppingBag,
  FaSyncAlt,
  FaPrint,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaFileInvoice,
  FaCheckCircle,
  FaBoxes,
  FaPhoneAlt,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaFilter,
  FaTimes,
  FaShieldAlt,
} from "react-icons/fa";

// Dashboard.jsx এর মতো হুবহু useAuth হুক
import useAuth from "../../../hooks/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

const CACHE_KEY = "novacare_admin_orders_cache_v3";

export default function TotalOrders() {
  const { user } = useAuth(); // Dashboard থেকে লগইন করা ইউজার তথ্য

  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // টাইম রেঞ্জ ফিল্টার (ডিফল্ট: বিগত ৪ মাস)
  const [timeRange, setTimeRange] = useState("last-4-months"); // 'last-4-months' | 'last-3-months' | 'current-month' | 'all-time'
  const [activeTab, setActiveTab] = useState("monthly"); // 'monthly' | 'orders'
  const [expandedMonths, setExpandedMonths] = useState({});

  // =========================================================================
  // 1. DASHBOARD AUTH TOKEN সহ MONGODB থেকে অর্ডার লোড
  // =========================================================================
  const fetchOrders = async (showToast = false) => {
    try {
      setIsSyncing(true);
      if (orders.length === 0) setLoading(true);

      // Dashboard.jsx এর মতো Firebase ID Token সংগ্রহ
      const headers = {};
      if (user) {
        try {
          const token =
            typeof user.getIdToken === "function"
              ? await user.getIdToken()
              : "";
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        } catch (tokenErr) {
          console.warn("Token fetch failed:", tokenErr);
        }
      }

      const res = await axios.get(`${API_URL}/api/orders`, {
        headers,
        timeout: 20000,
      });

      let fetched = [];
      if (res.data?.success && Array.isArray(res.data.orders)) {
        fetched = res.data.orders;
      } else if (Array.isArray(res.data)) {
        fetched = res.data;
      } else if (Array.isArray(res.data?.orders)) {
        fetched = res.data.orders;
      }

      if (fetched.length > 0) {
        setOrders(fetched);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fetched));
        } catch (err) {
          // ignore
        }

        if (showToast) {
          Swal.fire({
            icon: "success",
            title: "অর্ডার লোড সফল!",
            text: `MongoDB থেকে মোট ${fetched.length} টি অর্ডারের ডেটা পাওয়া গেছে।`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
      } else {
        if (showToast) {
          Swal.fire({
            icon: "info",
            title: "কোনো অর্ডার পাওয়া যায়নি",
            text: "আপনার MongoDB ডাটাবেজে এই মুহূর্তে কোনো অর্ডার নেই।",
          });
        }
      }
    } catch (error) {
      console.error("Orders Load Error:", error);
      if (showToast) {
        Swal.fire({
          icon: "error",
          title: "সার্ভার এরর",
          text:
            error.response?.data?.message ||
            "অর্ডার লোড করতে সমস্যা হচ্ছে। রেন্ডার সার্ভার জেগে উঠছে কি না চেক করুন।",
        });
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // =========================================================================
  // 2. MONGODB ফিল্ড এক্সট্রাক্ট হেল্পার (ROBUST MONGODB SCHEMA EXTRACTORS)
  // =========================================================================
  const getOrderDate = (order) => {
    if (!order) return new Date();
    if (order.orderDate) {
      const d = new Date(order.orderDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (order.date) {
      const d = new Date(order.date);
      if (!isNaN(d.getTime())) return d;
    }
    // MongoDB ObjectId থেকে স্বয়ংক্রিয় টাইমস্ট্যাম্প রিড
    if (order._id && typeof order._id === "string" && order._id.length === 24) {
      try {
        const timestamp = parseInt(order._id.substring(0, 8), 16) * 1000;
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d;
      } catch (e) {
        // ignore
      }
    }
    return new Date();
  };

  const getOrderAmount = (order) => {
    if (!order) return 0;
    const grand = Number(
      order.grandTotal ??
        order.totalPrice ??
        order.totalAmount ??
        order.subtotal ??
        0,
    );
    if (grand > 0) return grand;

    const items = getOrderItems(order);
    if (items.length > 0) {
      return items.reduce((sum, it) => {
        const line = Number(
          it.totalPrice ??
            Number(it.unitPrice || it.sellingPrice || 0) *
              Number(it.quantity || 1),
        );
        return sum + (isNaN(line) ? 0 : line);
      }, 0);
    }
    return 0;
  };

  const getOrderItems = (order) => {
    if (!order) return [];
    if (Array.isArray(order.items) && order.items.length > 0)
      return order.items;
    if (Array.isArray(order.cart) && order.cart.length > 0) return order.cart;
    return [];
  };

  const getOrderUnits = (order) => {
    const items = getOrderItems(order);
    if (items.length > 0) {
      return items.reduce((sum, it) => sum + Number(it.quantity || 1), 0);
    }
    return Number(order?.quantity || 1);
  };

  // ২:০০ PM -> ২:০০ PM হিসাব চক্র
  const getDayAndMonthInfo = (order) => {
    const d = getOrderDate(order);
    const cycleStart = new Date(d);

    if (d.getHours() < 14) {
      cycleStart.setDate(cycleStart.getDate() - 1);
    }
    cycleStart.setHours(14, 0, 0, 0);

    const year = cycleStart.getFullYear();
    const month = String(cycleStart.getMonth() + 1).padStart(2, "0");
    const day = String(cycleStart.getDate()).padStart(2, "0");

    const dayKey = `${year}-${month}-${day}`;
    const monthKey = `${year}-${month}`;
    const monthLabel = cycleStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return {
      dayKey,
      monthKey,
      monthLabel,
      cycleDateObj: cycleStart,
    };
  };

  // =========================================================================
  // 3. টাইম রেঞ্জ ফিল্টারিং (বিগত ৩-৪ মাস ইত্যাদি)
  // =========================================================================
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((order) => {
      const orderTime = getOrderDate(order).getTime();

      // Time Range Filter
      if (timeRange === "current-month") {
        const startOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).getTime();
        if (orderTime < startOfCurrentMonth) return false;
      } else if (timeRange === "last-3-months") {
        const startOf3Months = new Date(
          now.getFullYear(),
          now.getMonth() - 2,
          1,
        ).getTime();
        if (orderTime < startOf3Months) return false;
      } else if (timeRange === "last-4-months") {
        const startOf4Months = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          1,
        ).getTime();
        if (orderTime < startOf4Months) return false;
      }

      // Status Filter
      if (statusFilter !== "all") {
        const st = String(
          order.orderStatus || order.status || "",
        ).toLowerCase();
        if (st !== statusFilter.toLowerCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = String(
          order.customerName || order.name || "",
        ).toLowerCase();
        const phone = String(order.phone || "").toLowerCase();
        const invoice = String(
          order.invoiceNo || order._id || "",
        ).toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !invoice.includes(q))
          return false;
      }

      return true;
    });
  }, [orders, timeRange, statusFilter, searchQuery]);

  // =========================================================================
  // 4. এক্সিকিউটিভ মেট্রিক্স (TOTAL SALES, ORDERS, UNITS, RATE)
  // =========================================================================
  const executiveKPIs = useMemo(() => {
    let totalSales = 0;
    let totalItems = 0;
    let completedCount = 0;

    filteredOrders.forEach((order) => {
      totalSales += getOrderAmount(order);
      totalItems += getOrderUnits(order);
      const st = String(order.orderStatus || "").toLowerCase();
      if (st === "completed" || st === "delivered") {
        completedCount++;
      }
    });

    const totalOrdersCount = filteredOrders.length;
    const avgOrderValue =
      totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;
    const completionRate =
      totalOrdersCount > 0
        ? Math.round((completedCount / totalOrdersCount) * 100)
        : 0;

    return {
      totalSales,
      totalOrdersCount,
      totalItems,
      avgOrderValue,
      completedCount,
      completionRate,
    };
  }, [filteredOrders]);

  // =========================================================================
  // 5. প্রতি মাসের আলাদা আলাদা বিক্রয় হিসাব (MONTH-BY-MONTH)
  // =========================================================================
  const monthlyReports = useMemo(() => {
    const monthMap = {};

    filteredOrders.forEach((order) => {
      const { monthKey, monthLabel, dayKey } = getDayAndMonthInfo(order);

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          monthLabel,
          totalSales: 0,
          orderCount: 0,
          completedCount: 0,
          customerSet: new Set(),
          daysMap: {},
        };
      }

      const m = monthMap[monthKey];
      const amount = getOrderAmount(order);
      m.totalSales += amount;
      m.orderCount += 1;

      const st = String(order.orderStatus || "").toLowerCase();
      if (st === "completed" || st === "delivered") {
        m.completedCount++;
      }

      const custKey =
        order.phone || order.customerEmail || order.customerName || order._id;
      if (custKey) m.customerSet.add(custKey);

      if (!m.daysMap[dayKey]) {
        m.daysMap[dayKey] = {
          dayKey,
          sales: 0,
          orderCount: 0,
          orders: [],
        };
      }
      m.daysMap[dayKey].sales += amount;
      m.daysMap[dayKey].orderCount += 1;
      m.daysMap[dayKey].orders.push(order);
    });

    const sorted = Object.keys(monthMap)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const item = monthMap[key];
        const sortedDays = Object.values(item.daysMap).sort((a, b) =>
          b.dayKey.localeCompare(a.dayKey),
        );

        return {
          ...item,
          customerCount: item.customerSet.size,
          days: sortedDays,
        };
      });

    // Month-over-Month Growth %
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i + 1];
      if (prev && prev.totalSales > 0) {
        const diff = current.totalSales - prev.totalSales;
        current.growthPercent = Math.round((diff / prev.totalSales) * 100);
      } else {
        current.growthPercent = null;
      }

      current.sharePercent =
        executiveKPIs.totalSales > 0
          ? Math.round((current.totalSales / executiveKPIs.totalSales) * 100)
          : 0;
    }

    return sorted;
  }, [filteredOrders, executiveKPIs.totalSales]);

  const toggleMonth = (mKey) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [mKey]: !prev[mKey],
    }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ===================================================================
          1. HEADER BANNER
      =================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 mb-2">
              <FaShieldAlt />
              <span>Admin Verified MongoDB Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              বিগত ৩-৪ মাসের সার্বিক বিক্রয় রিপোর্ট (Total Orders &amp; Sales)
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
              সার্বিক মোট বিক্রি, প্রতি মাসের আয় ও দৈনিক ২:০০ PM হিসাব চক্র।
            </p>
          </div>

          {/* Time Range Selector & Sync Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md border border-white/15">
              <FaFilter className="text-emerald-300 ml-2 text-xs" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent text-white text-xs font-bold px-2 py-1.5 focus:outline-none cursor-pointer rounded-xl"
              >
                <option
                  value="last-4-months"
                  className="text-slate-900 font-semibold"
                >
                  বিগত ৪ মাসের বিক্রয় (Last 4 Months)
                </option>
                <option
                  value="last-3-months"
                  className="text-slate-900 font-semibold"
                >
                  বিগত ৩ মাসের বিক্রয় (Last 3 Months)
                </option>
                <option
                  value="current-month"
                  className="text-slate-900 font-semibold"
                >
                  চলতি মাসের বিক্রয় (Current Month)
                </option>
                <option
                  value="all-time"
                  className="text-slate-900 font-semibold"
                >
                  সকল সময়ের বিক্রয় (All Time)
                </option>
              </select>
            </div>

            <button
              onClick={() => fetchOrders(true)}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FaSyncAlt className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "সিঙ্ক হচ্ছে..." : "MongoDB রিফ্রেশ"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          2. 4 EXECUTIVE KPI CARDS
      =================================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Sales */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              সর্বমোট বিক্রয় (Total Sales)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black text-lg">
              ৳
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              ৳ {executiveKPIs.totalSales.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">✓ নিট বিক্রয়</span> ·{" "}
            {timeRange}
          </p>
        </div>

        {/* Card 2: Total Orders */}
        <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              মোট অর্ডার সংখ্যা
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FaShoppingBag />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {executiveKPIs.totalOrdersCount.toLocaleString()} টি
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            গড় মান:{" "}
            <span className="font-bold text-slate-700">
              ৳ {executiveKPIs.avgOrderValue}
            </span>
          </p>
        </div>

        {/* Card 3: Items Sold */}
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ওষুধের মোট ইউনিট
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FaBoxes />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {executiveKPIs.totalItems.toLocaleString()} Pcs
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-500">
            সম্পন্ন অর্ডার:{" "}
            <span className="font-bold text-emerald-600">
              {executiveKPIs.completedCount} টি
            </span>
          </p>
        </div>

        {/* Card 4: Delivery Rate */}
        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ডেলিভারি সমাপ্তি হার
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FaCheckCircle />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {executiveKPIs.completionRate}%
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              সক্রিয়
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
              style={{ width: `${executiveKPIs.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ===================================================================
          3. TABS & SEARCH
      =================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "monthly"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FaCalendarAlt />
            <span>প্রতি মাসের মোট বিক্রয় ({monthlyReports.length} মাস)</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "orders"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FaShoppingBag />
            <span>সকল অর্ডার তালিকা ({filteredOrders.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="কাস্টমার নাম, ফোন বা ইনভয়েস নং..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* ===================================================================
          TAB 1: প্রতি মাসের আলাদা কার্ড (MONTHLY SALES CARDS)
      =================================================================== */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              মাসিক বিক্রয় বিশ্লেষণ ও তুলনামূলক কার্ড
            </h2>
            <span className="text-xs text-slate-500 hidden sm:inline">
              *মাসের কার্ডে ক্লিক করে ওই মাসের প্রতিদিনের ২:০০ PM হিসাব চক্র
              দেখুন
            </span>
          </div>

          {monthlyReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <FaShoppingBag className="mx-auto text-4xl text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">
                কোনো অর্ডার পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                আপনার নির্বাচিত ফিল্টারে কোনো অর্ডার নেই।
              </p>
              <button
                onClick={() => fetchOrders(true)}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
              >
                আবার রিফ্রেশ করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monthlyReports.map((month) => (
                <div
                  key={month.monthKey}
                  className="rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-br from-slate-900 to-teal-950 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        {month.monthLabel}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/10">
                        {month.sharePercent}% of Total
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-300 block">
                          মোট বিক্রয় (Total Sales)
                        </span>
                        <span className="text-2xl font-black text-emerald-400">
                          ৳ {month.totalSales.toLocaleString()}
                        </span>
                      </div>

                      {month.growthPercent !== null && (
                        <div
                          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${
                            month.growthPercent >= 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                          title="পূর্ববর্তী মাসের তুলনায় প্রবৃদ্ধি"
                        >
                          {month.growthPercent >= 0 ? (
                            <FaArrowUp />
                          ) : (
                            <FaArrowDown />
                          )}
                          <span>{Math.abs(month.growthPercent)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          মোট অর্ডার
                        </span>
                        <span className="text-sm font-black text-slate-800">
                          {month.orderCount} টি
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          মোট কাস্টমার
                        </span>
                        <span className="text-sm font-black text-slate-800">
                          {month.customerCount} জন
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          গড় মূল্য
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          ৳{" "}
                          {Math.round(
                            month.totalSales / (month.orderCount || 1),
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Daily Cycle Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => toggleMonth(month.monthKey)}
                        className="w-full flex items-center justify-between rounded-xl bg-slate-50 hover:bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                      >
                        <span>
                          দৈনিক ২:০০ PM হিসাব ({month.days.length} দিন)
                        </span>
                        {expandedMonths[month.monthKey] ? (
                          <FaChevronUp />
                        ) : (
                          <FaChevronDown />
                        )}
                      </button>

                      {expandedMonths[month.monthKey] && (
                        <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-2 space-y-1.5 text-xs">
                          {month.days.map((day) => (
                            <div
                              key={day.dayKey}
                              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-2xs border border-slate-100"
                            >
                              <span className="font-semibold text-slate-700">
                                {day.dayKey}
                              </span>
                              <span className="font-bold text-emerald-800">
                                ৳ {day.sales.toLocaleString()}{" "}
                                <span className="text-[10px] font-normal text-slate-400">
                                  ({day.orderCount} orders)
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 2: সকল অর্ডারের তালিকা (ALL ORDERS TABLE)
      =================================================================== */}
      {activeTab === "orders" && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ইনভয়েস / আইডি</th>
                  <th className="py-3 px-4">অর্ডারের তারিখ</th>
                  <th className="py-3 px-4">গ্রাহক তথ্য</th>
                  <th className="py-3 px-4">ওষুধ আইটেম</th>
                  <th className="py-3 px-4 text-right">মূল্য (৳)</th>
                  <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      কোনো অর্ডার তথ্য পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredOrders.slice(0, 100).map((ord) => {
                    const dateObj = getOrderDate(ord);
                    const amount = getOrderAmount(ord);
                    const items = getOrderItems(ord);

                    return (
                      <tr
                        key={ord._id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-emerald-700 block">
                            {ord.invoiceNo || ord._id}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {dateObj.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {ord.customerName || ord.name || "Customer"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {ord.phone || "N/A"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {items.length > 0 ? (
                            <span className="text-slate-700">
                              {items[0].medicineName}{" "}
                              {items.length > 1 && (
                                <span className="text-emerald-700 font-bold">
                                  +{items.length - 1} more
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">1 Item</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ৳ {amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              String(ord.orderStatus || "").toLowerCase() ===
                                "completed" ||
                              String(ord.orderStatus || "").toLowerCase() ===
                                "delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {ord.orderStatus || "Pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                          >
                            <FaFileInvoice className="text-xs" />
                            <span>রসিদ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          INVOICE MODAL
      =================================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  NovaCare Pharmacy Receipt
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedOrder.invoiceNo || "Invoice"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>গ্রাহক নাম:</span>
                <span className="font-bold text-slate-900">
                  {selectedOrder.customerName ||
                    selectedOrder.name ||
                    "Customer"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ফোন নম্বর:</span>
                <span className="font-bold text-slate-900">
                  {selectedOrder.phone || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>তারিখ:</span>
                <span className="font-bold text-slate-900">
                  {getOrderDate(selectedOrder).toLocaleString()}
                </span>
              </div>

              {/* Items */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-700 block mb-2">
                  ওষুধের তালিকা:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {getOrderItems(selectedOrder).map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded-xl"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {it.medicineName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {it.quantity} Pcs × ৳ {it.unitPrice || 0}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        ৳ {it.totalPrice || it.quantity * it.unitPrice || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-black text-slate-900">
                <span>সর্বমোট (Grand Total):</span>
                <span className="text-emerald-700 text-base">
                  ৳ {getOrderAmount(selectedOrder).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 text-xs font-bold transition cursor-pointer"
              >
                <FaPrint />
                <span>প্রিন্ট করুন</span>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
