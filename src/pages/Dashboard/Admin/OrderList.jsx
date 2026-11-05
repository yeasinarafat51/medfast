import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaCalendarAlt,
  FaPrint,
  FaSearch,
  FaPhoneAlt,
  FaStore,
  FaEdit,
  FaSave,
  FaTimes,
  FaExclamationCircle,
  FaShieldAlt,
  FaSyncAlt,
  FaLayerGroup,
} from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

const CACHE_KEY = "novacare_pharmacy_orders_cache_24hr_v7";

export default function OrderList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'due' | 'delivered'
  const [selectedCycleFilter, setSelectedCycleFilter] = useState("all-30days"); // 'all-30days' | 'current-cycle'

  // বাকি ও নোট এডিট স্টেট
  const [editingPharmacy, setEditingPharmacy] = useState(null);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editDueAmount, setEditDueAmount] = useState(0);
  const [editDueNote, setEditDueNote] = useState("");
  const [editDeliveryStatus, setEditDeliveryStatus] = useState("Pending");
  const [isSavingDue, setIsSavingDue] = useState(false);

  // =========================================================================
  // 1. BACKEND থেকে অর্ডার ফেচ করা (Math Guarantee সহ)
  // =========================================================================
  const fetchOrders = async (showToast = false) => {
    try {
      setIsSyncing(true);
      if (orders.length === 0) setLoading(true);

      const headers = {};
      if (user) {
        try {
          const token =
            typeof user.getIdToken === "function"
              ? await user.getIdToken()
              : "";
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch (e) {
          console.warn("Token error:", e);
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
      }

      if (fetched.length > 0) {
        const normalized = fetched.map((ord) => {
          const grandTotal = Number(ord.grandTotal || ord.totalPrice || 0);
          const rawPaid =
            ord.paidAmount !== undefined && ord.paidAmount !== null
              ? Number(ord.paidAmount)
              : ord.paymentStatus === "Paid"
                ? grandTotal
                : 0;
          const paidAmount = isNaN(rawPaid) ? 0 : rawPaid;

          // গাণিতিক নিশ্চয়তা: Due সর্বদাই GrandTotal - PaidAmount
          const dueAmount = Math.max(0, grandTotal - paidAmount);

          return {
            ...ord,
            customerName: ord.customerName || ord.name || "ফার্মেসি নাম নেই",
            grandTotal,
            paidAmount,
            dueAmount,
            dueNote: ord.dueNote || ord.note || "",
            paymentStatus:
              dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid",
            orderStatus: ord.orderStatus || "Pending",
          };
        });

        setOrders(normalized);
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));

        if (showToast) {
          Swal.fire({
            icon: "success",
            title: "অর্ডার সিঙ্ক সম্পন্ন",
            text: `মোট ${normalized.length} টি অর্ডার সফলভাবে সিঙ্ক হয়েছে।`,
            timer: 1500,
            showConfirmButton: false,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to load orders:", err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Date Parser Helper
  const parseOrderDate = (order) => {
    if (order.orderDate) {
      const d = new Date(order.orderDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // =========================================================================
  // ⚡ 24-HR BUSINESS CYCLE HELPER (2:00 PM -> 2:00 PM)
  // =========================================================================
  const get24HrCycleInfo = (dateInput) => {
    const d = new Date(dateInput || Date.now());
    const cycleStart = new Date(d);

    // দুপুর ২:০০ টার আগের অর্ডার আগের দিনের শিফটের অন্তর্ভুক্ত
    if (d.getHours() < 14) {
      cycleStart.setDate(cycleStart.getDate() - 1);
    }
    cycleStart.setHours(14, 0, 0, 0);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 1);

    const year = cycleStart.getFullYear();
    const month = String(cycleStart.getMonth() + 1).padStart(2, "0");
    const day = String(cycleStart.getDate()).padStart(2, "0");
    const cycleKey = `${year}-${month}-${day}`;

    const formatShort = (dt) =>
      dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });

    const cycleLabel = `${formatShort(cycleStart)} ২:০০ PM → ${formatShort(cycleEnd)} ২:০০ PM`;
    const cycleDisplayTitle = `${cycleStart.toLocaleDateString("bn-BD", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;

    return {
      cycleKey,
      cycleStart,
      cycleEnd,
      cycleLabel,
      cycleDisplayTitle,
      cycleStartMs: cycleStart.getTime(),
    };
  };

  // =========================================================================
  // 2. 24-HR CYCLE অনুযায়ী প্রতিটি ফার্মেসির সমস্ত অর্ডার একীভূতকরণ
  // =========================================================================
  const consolidatedDayList = useMemo(() => {
    const now = new Date();
    const currentCycleInfo = get24HrCycleInfo(now);
    const activeCycleKey = currentCycleInfo.cycleKey;
    const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    // বিগত ৩০ দিনের ফিল্টার
    const recentOrders = orders.filter((o) => {
      const t = parseOrderDate(o).getTime();
      return t >= thirtyDaysAgoMs;
    });

    const dayPharmacyMap = {};

    recentOrders.forEach((order) => {
      const orderDate = parseOrderDate(order);
      const { cycleKey, cycleLabel, cycleDisplayTitle } =
        get24HrCycleInfo(orderDate);

      if (!dayPharmacyMap[cycleKey]) {
        dayPharmacyMap[cycleKey] = {
          cycleKey,
          dateLabel: cycleDisplayTitle,
          cycleLabel,
          isCurrentCycle: cycleKey === activeCycleKey,
          pharmacies: {},
        };
      }

      const pKey = (order.customerName || order.phone || order._id)
        .trim()
        .toLowerCase();
      const existing = dayPharmacyMap[cycleKey].pharmacies[pKey];

      const currentItems = Array.isArray(order.items) ? order.items : [];
      const orderTotal = Number(order.grandTotal || 0);
      const paid = Number(
        order.paidAmount ?? (order.paymentStatus === "Paid" ? orderTotal : 0),
      );
      const invNo = order.invoiceNo || order._id.substring(0, 8);

      if (!existing) {
        const singleDue = Math.max(0, orderTotal - paid);
        dayPharmacyMap[cycleKey].pharmacies[pKey] = {
          pharmacyKey: pKey,
          pharmacyName: order.customerName || "ফার্মেসি নাম নেই",
          phone: order.phone || "N/A",
          address: order.address || "",
          dateKey: cycleKey,
          dateLabel: `${cycleDisplayTitle} (${cycleLabel})`,
          cycleLabel,
          orderCount: 1,
          invoiceNumbers: [invNo],
          grandTotal: orderTotal,
          paidAmount: paid,
          dueAmount: singleDue, // সর্বদা মোট - পরিশোধিত
          dueNote: order.dueNote || "",
          deliveryStatus: ["delivered", "completed"].includes(
            String(order.orderStatus || "").toLowerCase(),
          )
            ? "Delivered"
            : "Pending",
          paymentStatus:
            singleDue <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
          allItems: [...currentItems],
          orderIds: [order._id],
        };
      } else {
        // একই ২৪-ঘণ্টা শিফটে ফার্মেসির একাধিক অর্ডার একীভূত করা
        existing.orderCount += 1;
        if (!existing.invoiceNumbers.includes(invNo)) {
          existing.invoiceNumbers.push(invNo);
        }
        existing.grandTotal += orderTotal;
        existing.paidAmount += paid;

        // 🔥 ৮০৪৫ - ৪০০০ = ৪০৪৫ গাণিতিক নিশ্চয়তা
        existing.dueAmount = Math.max(
          0,
          existing.grandTotal - existing.paidAmount,
        );

        if (order.dueNote && !existing.dueNote.includes(order.dueNote)) {
          existing.dueNote = existing.dueNote
            ? `${existing.dueNote}; ${order.dueNote}`
            : order.dueNote;
        }
        if (
          !["delivered", "completed"].includes(
            String(order.orderStatus || "").toLowerCase(),
          )
        ) {
          existing.deliveryStatus = "Pending";
        }
        existing.paymentStatus =
          existing.dueAmount <= 0
            ? "Paid"
            : existing.paidAmount > 0
              ? "Partial"
              : "Unpaid";
        existing.allItems = [...existing.allItems, ...currentItems];
        if (!existing.orderIds.includes(order._id)) {
          existing.orderIds.push(order._id);
        }
      }
    });

    // সাম্প্রতিক ২৪-ঘণ্টা চক্র অনুযায়ী সাজানো
    const sortedDays = Object.keys(dayPharmacyMap)
      .sort((a, b) => b.localeCompare(a))
      .map((cycleKey) => {
        const item = dayPharmacyMap[cycleKey];
        let pharmacyList = Object.values(item.pharmacies);

        // সার্চ ফিল্টার
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          pharmacyList = pharmacyList.filter(
            (p) =>
              p.pharmacyName.toLowerCase().includes(q) ||
              p.phone.toLowerCase().includes(q) ||
              p.invoiceNumbers.some((inv) => inv.toLowerCase().includes(q)),
          );
        }

        // স্ট্যাটাস ফিল্টার
        if (statusFilter === "due") {
          pharmacyList = pharmacyList.filter((p) => p.dueAmount > 0);
        } else if (statusFilter === "delivered") {
          pharmacyList = pharmacyList.filter(
            (p) => p.deliveryStatus === "Delivered",
          );
        }

        const dailyTotalSales = pharmacyList.reduce(
          (sum, p) => sum + p.grandTotal,
          0,
        );
        const dailyTotalPaid = pharmacyList.reduce(
          (sum, p) => sum + p.paidAmount,
          0,
        );
        const dailyTotalDue = Math.max(0, dailyTotalSales - dailyTotalPaid);
        const dailyTotalOrders = pharmacyList.reduce(
          (sum, p) => sum + p.orderCount,
          0,
        );

        return {
          dateKey: cycleKey,
          dateLabel: item.dateLabel,
          cycleLabel: item.cycleLabel,
          isCurrentCycle: item.isCurrentCycle,
          pharmacies: pharmacyList,
          dailyTotalSales,
          dailyTotalPaid,
          dailyTotalDue,
          dailyTotalOrders,
        };
      })
      .filter((day) => {
        if (selectedCycleFilter === "current-cycle") return day.isCurrentCycle;
        return true;
      });

    return sortedDays;
  }, [orders, searchQuery, statusFilter, selectedCycleFilter]);

  // বাকি এডিট মোডাল ওপেন
  const handleOpenEditDue = (p) => {
    setEditingPharmacy(p);
    const total = Number(p.grandTotal || 0);
    const paid = Number(p.paidAmount || 0);
    const due = Math.max(0, total - paid);
    setEditPaidAmount(paid);
    setEditDueAmount(due);
    setEditDueNote(p.dueNote || "");
    setEditDeliveryStatus(p.deliveryStatus || "Pending");
  };

  // লাইভ ইনপুট পরিবর্তনের সাথে সাথে ডিউ আপডেট
  const handlePaidChange = (newPaid) => {
    const validPaid = isNaN(Number(newPaid)) ? 0 : Math.max(0, Number(newPaid));
    setEditPaidAmount(validPaid);
    if (editingPharmacy) {
      const grandTotal = Number(editingPharmacy.grandTotal || 0);
      const newDue = Math.max(0, grandTotal - validPaid);
      setEditDueAmount(newDue);
    }
  };

  // =========================================================================
  // 3. বাকি ও নোট ব্যাকএন্ডে সেভ
  // =========================================================================
  const handleSaveDue = async () => {
    if (!editingPharmacy) return;
    setIsSavingDue(true);

    const targetPaid = Math.max(0, Number(editPaidAmount || 0));
    const targetDue = Math.max(
      0,
      Number(editingPharmacy.grandTotal || 0) - targetPaid,
    );
    const newPaymentStatus =
      targetDue <= 0 ? "Paid" : targetPaid > 0 ? "Partial" : "Unpaid";

    try {
      const headers = {};
      if (user) {
        try {
          const token =
            typeof user.getIdToken === "function"
              ? await user.getIdToken()
              : "";
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch (e) {
          console.warn("Token error:", e);
        }
      }

      // একাধিক অর্ডার থাকলে পেইড টাকা ক্রমানুসারে ভাগ করে পাঠানো
      let remainingPaid = targetPaid;
      const orderUpdates = {};

      for (let i = 0; i < editingPharmacy.orderIds.length; i++) {
        const orderId = editingPharmacy.orderIds[i];
        const matchOrd = orders.find((o) => o._id === orderId);
        const ordTotal = Number(matchOrd?.grandTotal || 0);

        let ordPaid = 0;
        if (i === editingPharmacy.orderIds.length - 1) {
          ordPaid = remainingPaid;
        } else {
          ordPaid = Math.min(ordTotal, remainingPaid);
        }
        remainingPaid = Math.max(0, remainingPaid - ordPaid);

        const ordDue = Math.max(0, ordTotal - ordPaid);
        const ordStatus =
          ordDue <= 0 ? "Paid" : ordPaid > 0 ? "Partial" : "Unpaid";

        orderUpdates[orderId] = {
          paid: ordPaid,
          due: ordDue,
          status: ordStatus,
        };

        try {
          await axios.patch(
            `${API_URL}/api/orders/${orderId}`,
            {
              paidAmount: ordPaid,
              dueAmount: ordDue,
              dueNote: editDueNote.trim(),
              orderStatus: editDeliveryStatus,
              paymentStatus: ordStatus,
            },
            { headers, timeout: 8000 },
          );
        } catch (e) {
          console.warn(`Order ${orderId} update failed:`, e);
        }
      }

      // লোকাল স্টেট আপডেট
      const updatedOrders = orders.map((o) => {
        if (orderUpdates[o._id]) {
          const upd = orderUpdates[o._id];
          return {
            ...o,
            paidAmount: upd.paid,
            dueAmount: upd.due,
            dueNote: editDueNote.trim(),
            orderStatus: editDeliveryStatus,
            paymentStatus: upd.status,
          };
        }
        return o;
      });

      setOrders(updatedOrders);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedOrders));

      Swal.fire({
        icon: "success",
        title: "বাকি ও হিসাব সেভ হয়েছে!",
        text: `${editingPharmacy.pharmacyName} এর অবশিষ্ট বাকি: ৳${targetDue}`,
        timer: 1500,
        showConfirmButton: false,
      });

      setEditingPharmacy(null);
    } catch (err) {
      console.warn("Update failed:", err);
    } finally {
      setIsSavingDue(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 mb-2">
              <FaShieldAlt />
              <span>Admin &amp; Super Admin Order Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ফার্মেসি সারাদিনের মোট অর্ডার ও প্রিন্ট লিস্ট
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              প্রতিটি ফার্মেসির ২৪-ঘণ্টার সকল অর্ডার একীভূত করে মোট মূল্য, আদায়,
              বাকি হিসাব ও সম্মিলিত ইনভয়েস প্রিন্ট করার ব্যবস্থা।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Shift Cycle Selector */}
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md border border-white/15">
              <FaCalendarAlt className="text-emerald-300 ml-2 text-xs" />
              <select
                value={selectedCycleFilter}
                onChange={(e) => setSelectedCycleFilter(e.target.value)}
                className="bg-transparent text-white text-xs font-bold px-2 py-1.5 focus:outline-none cursor-pointer rounded-xl"
              >
                <option
                  value="all-30days"
                  className="text-slate-900 font-semibold"
                >
                  বিগত ৩০ দিনের সকল ২৪-ঘণ্টা শিফট (All Cycles)
                </option>
                <option
                  value="current-cycle"
                  className="text-slate-900 font-semibold"
                >
                  চলতি ২৪-ঘণ্টা চক্র (Active 2:00 PM – 2:00 PM)
                </option>
              </select>
            </div>

            <button
              onClick={() => fetchOrders(true)}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FaSyncAlt className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "সিঙ্ক হচ্ছে..." : "রিফ্রেশ"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            সকল ফার্মেসি
          </button>
          <button
            onClick={() => setStatusFilter("due")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
              statusFilter === "due"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-600 hover:bg-rose-50"
            }`}
          >
            <FaExclamationCircle className="text-[11px]" />
            <span>শুধু বাকি (Due)</span>
          </button>
          <button
            onClick={() => setStatusFilter("delivered")}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition ${
              statusFilter === "delivered"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            ডেলিভারি সম্পন্ন
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="ফার্মেসির নাম, ফোন বা ইনভয়েস নং..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* 3. Daily 24-Hr Cycle Sections */}
      <div className="space-y-8">
        {consolidatedDayList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FaStore className="mx-auto text-4xl text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              কোনো ফার্মেসি অর্ডার পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              নির্বাচিত ফিল্টারে কোনো অর্ডার বিদ্যমান নেই।
            </p>
          </div>
        ) : (
          consolidatedDayList.map((day) => (
            <div
              key={day.dateKey}
              className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Daily Shift Strip */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm">
                    <FaCalendarAlt />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black tracking-tight">
                        {day.dateLabel}
                      </h2>
                      <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black tracking-wide shadow-2xs">
                        ⏰ {day.cycleLabel}
                      </span>
                      {day.isCurrentCycle && (
                        <span className="rounded-full bg-emerald-400 text-slate-950 px-2 py-0.5 text-[9px] font-black uppercase animate-pulse">
                          🟢 চলতি ২৪-ঘণ্টা শিফট
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-emerald-200/80 font-medium">
                      মোট {day.pharmacies.length} টি ফার্মেসি (
                      {day.dailyTotalOrders} টি অর্ডার একীভূত)
                    </span>
                  </div>
                </div>

                {/* Daily Total Badges */}
                <div className="flex flex-wrap items-center gap-4 text-xs mt-3 sm:mt-0">
                  <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
                    <span className="text-slate-300 block text-[10px] uppercase font-bold">
                      দিনের মোট বিক্রি
                    </span>
                    <span className="font-black text-emerald-300 text-sm">
                      ৳ {day.dailyTotalSales.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
                    <span className="text-slate-300 block text-[10px] uppercase font-bold">
                      দিনের মোট আদায়
                    </span>
                    <span className="font-bold text-white text-sm">
                      ৳ {day.dailyTotalPaid.toLocaleString()}
                    </span>
                  </div>

                  {day.dailyTotalDue > 0 && (
                    <div className="bg-rose-500/20 px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-300">
                      <span className="block text-[10px] uppercase font-bold">
                        দিনের মোট বাকি
                      </span>
                      <span className="font-black text-sm">
                        ৳ {day.dailyTotalDue.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">ফার্মেসির নাম ও যোগাযোগ</th>
                      <th className="py-3 px-4 text-center">
                        সারাদিনের অর্ডার
                      </th>
                      <th className="py-3 px-4 text-right">
                        সারাদিনের মোট মূল্য (৳)
                      </th>
                      <th className="py-3 px-4 text-right">পরিশোধিত (৳)</th>
                      <th className="py-3 px-4 text-right">বাকি / Due (৳)</th>
                      <th className="py-3 px-4 text-center">
                        পেমেন্ট স্ট্যাটাস
                      </th>
                      <th className="py-3 px-4 text-center">
                        ডেলিভারি স্ট্যাটাস
                      </th>
                      <th className="py-3 px-4 text-center">বাকি নোট</th>
                      <th className="py-3 px-4 text-center">প্রিন্ট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {day.pharmacies.map((pharmacy) => (
                      <tr
                        key={pharmacy.pharmacyKey}
                        className="hover:bg-slate-50/80 transition"
                      >
                        {/* Pharmacy Info */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                            <FaStore className="text-teal-600 text-xs shrink-0" />
                            <span>{pharmacy.pharmacyName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <FaPhoneAlt className="text-[9px] text-slate-400" />
                            <span>{pharmacy.phone}</span>
                          </div>
                          {pharmacy.address && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {pharmacy.address}
                            </div>
                          )}
                        </td>

                        {/* Order Count & Invoices */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                            <FaLayerGroup className="text-[10px]" />
                            <span>{pharmacy.orderCount} টি অর্ডার</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            {pharmacy.invoiceNumbers.join(", ")}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td className="py-3 px-4 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                          ৳ {pharmacy.grandTotal.toLocaleString()}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          ৳ {pharmacy.paidAmount.toLocaleString()}
                        </td>

                        {/* Due Amount (Strictly: grandTotal - paidAmount) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {pharmacy.dueAmount > 0 ? (
                            <span className="inline-block rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700">
                              ৳ {pharmacy.dueAmount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-block rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              ক্লিয়ার ✓
                            </span>
                          )}
                        </td>

                        {/* Payment Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              pharmacy.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : pharmacy.paymentStatus === "Partial"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {pharmacy.paymentStatus === "Paid"
                              ? "পরিশোধিত (Paid)"
                              : pharmacy.paymentStatus === "Partial"
                                ? "আংশিক পেইড"
                                : "বাকি (Unpaid)"}
                          </span>
                        </td>

                        {/* Delivery Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              pharmacy.deliveryStatus === "Delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {pharmacy.deliveryStatus === "Delivered"
                              ? "ডেলিভারি সম্পন্ন"
                              : "অপেক্ষমান"}
                          </span>
                        </td>

                        {/* Due Note */}
                        <td className="py-3 px-4 text-center max-w-[160px]">
                          {pharmacy.dueNote ? (
                            <span
                              className="inline-block rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-900 font-medium truncate max-w-[150px]"
                              title={pharmacy.dueNote}
                            >
                              {pharmacy.dueNote}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">
                              -
                            </span>
                          )}
                        </td>

                        {/* Actions (AllOrders.jsx এর মত প্রিন্ট লিংক) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Due & Note Button */}
                            <button
                              onClick={() => handleOpenEditDue(pharmacy)}
                              className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                              title="বাকি হিসাব ও নোট এডিট"
                            >
                              <FaEdit className="text-[10px]" />
                              <span>বাকি/নোট</span>
                            </button>

                            {/* Consolidated Day Invoice Print Button (AllOrders.jsx এর ইনভয়েস লিংক) */}
                            <Link
                              to={`/dashboard/invoice/${
                                pharmacy.orderIds?.[0] || pharmacy.pharmacyKey
                              }`}
                              state={{
                                combinedOrder: {
                                  _id:
                                    pharmacy.orderIds?.[0] ||
                                    pharmacy.pharmacyKey,
                                  customerName: pharmacy.pharmacyName,
                                  customerEmail: pharmacy.phone || "",
                                  phone: pharmacy.phone,
                                  address: pharmacy.address,
                                  items: pharmacy.allItems,
                                  grandTotal: pharmacy.grandTotal,
                                  paidAmount: pharmacy.paidAmount,
                                  dueAmount: pharmacy.dueAmount,
                                  dueNote: pharmacy.dueNote,
                                  orderStatus: pharmacy.deliveryStatus,
                                  paymentStatus: pharmacy.paymentStatus,
                                  orderDate: pharmacy.dateKey,
                                  originalOrderIds: pharmacy.orderIds,
                                  orderCount: pharmacy.orderCount,
                                  invoiceNumbers: pharmacy.invoiceNumbers,
                                  invoiceNo:
                                    pharmacy.invoiceNumbers?.join(", "),
                                  notes: pharmacy.dueNote
                                    ? [pharmacy.dueNote]
                                    : [],
                                },
                              }}
                              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                              title="ফার্মেসির সারাদিনের ইনভয়েস প্রিন্ট পেজে যান"
                            >
                              <FaPrint className="text-[10px]" />
                              <span>প্রিন্ট</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Edit Due & Note Modal */}
      {editingPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  ফার্মেসি বাকি ও স্ট্যাটাস আপডেট
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {editingPharmacy.pharmacyName}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {editingPharmacy.dateLabel}
                </span>
              </div>
              <button
                onClick={() => setEditingPharmacy(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3.5 flex justify-between items-center border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    সারাদিনের মোট অর্ডার বিল:
                  </span>
                  <span className="text-base font-black text-slate-900">
                    ৳ {editingPharmacy.grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">
                    মোট অর্ডার:
                  </span>
                  <span className="font-bold text-teal-800">
                    {editingPharmacy.orderCount} টি ইনভয়েস
                  </span>
                </div>
              </div>

              {/* Paid Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পরিশোধিত টাকা (Paid Amount ৳):
                </label>
                <input
                  type="number"
                  min="0"
                  max={editingPharmacy.grandTotal}
                  value={editPaidAmount}
                  onChange={(e) => handlePaidChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Due Amount Calculated */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অবশিষ্ট বাকি (Due Amount ৳ = মোট - পরিশোধিত):
                </label>
                <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                  <span className="font-black text-rose-700 text-sm">
                    ৳ {editDueAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">
                    {editDueAmount > 0 ? "বাকি বিদ্যমান" : "সম্পূর্ণ পরিশোধিত"}
                  </span>
                </div>
              </div>

              {/* Delivery Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ডেলিভারি স্ট্যাটাস:
                </label>
                <select
                  value={editDeliveryStatus}
                  onChange={(e) => setEditDeliveryStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="Delivered">
                    Delivered (ডেলিভারি সম্পন্ন)
                  </option>
                  <option value="Pending">Pending (অপেক্ষমান)</option>
                  <option value="Processing">
                    Processing (প্রস্তুত হচ্ছে)
                  </option>
                </select>
              </div>

              {/* Due / Payment Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বাকি সংক্রান্ত নোট বা মন্তব্য (Due Note):
                </label>
                <textarea
                  rows={2}
                  placeholder="যেমন: আগামী রবিবার বাকি দেবে, ৫০০ টাকা ক্যাশ বাকি ৫০০ টাকা..."
                  value={editDueNote}
                  onChange={(e) => setEditDueNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEditingPharmacy(null)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleSaveDue}
                disabled={isSavingDue}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FaSave />
                <span>{isSavingDue ? "সেভ হচ্ছে..." : "সেভ করুন"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
