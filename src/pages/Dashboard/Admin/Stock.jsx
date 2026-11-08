import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaBoxes,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaBuilding,
  FaCapsules,
  FaHistory,
  FaWarehouse,
  FaTruckLoading,
  FaCheckCircle,
} from "react-icons/fa";

// আপনার ব্যাকএন্ড API এর URL
const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

// ডিফল্ট মেডিসিন ইমেজ প্লেসহোল্ডার
const DEFAULT_MED_IMG =
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80";

// কোম্পানি ফিল্টারের তালিকা
const companies = [
  { name: "All Companies", value: "" },
  { name: "Square", value: "Square" },
  { name: "Unimed Unihealth", value: "Unimed Unihealth" },
  { name: "Aci", value: "Aci" },
  { name: "Opsonin", value: "Opsonin" },
  { name: "Popular", value: "Popular" },
  { name: "Ibn-Sina", value: "Ibnsina" },
  { name: "SKF", value: "SKF" },
  { name: "Radiant", value: "Radiant" },
  { name: "Aristopharma", value: "Aristopharma" },
];

export default function Stock({
  externalMedicines = [],
  onUpdateStock,
  onNavigateToStore,
  onNavigateToAdd,
  onNavigateToStockOut,
}) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // সার্চ ও কোম্পানি ফিল্টার স্টেট
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");

  // ⚡ ইনপুট বক্সের স্টেট (ডিফল্টভাবে আগে থেকে সম্পূর্ণ খালি থাকবে)
  const [addQtyMap, setAddQtyMap] = useState({});

  // শেষবার স্টক বাড়ানো ওষুধের হাইলাইট আইডি
  const [lastUpdatedId, setLastUpdatedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // রিসেন্ট স্টক পাঠানোর ইতিহাস (Local Storage)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("novacare_stock_history");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // ১. ডাটাবেজ থেকে সম্পূর্ণ মেডিসিন লোড
  const loadMedicines = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      else setIsSyncing(true);

      const res = await axios.get(`${API_URL}/api/medicines`, {
        timeout: 10000,
      });

      const list =
        res.data?.medicines || (Array.isArray(res.data) ? res.data : []);

      if (Array.isArray(list) && list.length > 0) {
        setMedicines(list);
      } else if (externalMedicines && externalMedicines.length > 0) {
        setMedicines(externalMedicines);
      }
    } catch (err) {
      console.warn("Using external medicines fallback:", err?.message);
      if (externalMedicines && externalMedicines.length > 0) {
        setMedicines(externalMedicines);
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadMedicines(true);
  }, []);

  // হিস্ট্রি লোকাল স্টোরেজে সংরক্ষণ
  useEffect(() => {
    try {
      localStorage.setItem(
        "novacare_stock_history",
        JSON.stringify(history.slice(0, 15)),
      );
    } catch (e) {}
  }, [history]);

  // ফিল্টার ও সার্চ প্রয়োগ
  const filteredMedicines = useMemo(() => {
    let result = [...medicines];

    if (selectedCompany) {
      const compLower = selectedCompany.toLowerCase();
      result = result.filter(
        (m) =>
          (m.company || "").toLowerCase() === compLower ||
          (compLower === "ibnsina" &&
            (m.company || "").toLowerCase().includes("ibn")),
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          (m.medicineName || "").toLowerCase().includes(q) ||
          (m.genericName || "").toLowerCase().includes(q) ||
          (m.company || "").toLowerCase().includes(q),
      );
    }

    // শেষ এডিট করা ওষুধ সবার আগে থাকবে, অন্যথায় নাম অনুসারে সাজানো
    result.sort((a, b) => {
      if (a._id === lastUpdatedId) return -1;
      if (b._id === lastUpdatedId) return 1;
      return (a.medicineName || "").localeCompare(b.medicineName || "");
    });

    return result;
  }, [medicines, selectedCompany, search, lastUpdatedId]);

  // ⚡ ইনপুট বক্সের ভ্যালু পাওয়ার হেল্পার (ডিফল্ট: খালি "")
  const getAddAmount = (id) => {
    return addQtyMap[id] !== undefined ? addQtyMap[id] : "";
  };

  const setAddAmount = (id, val) => {
    // শুধুমাত্র সংখ্যা অথবা খালি স্ট্রিং রাখা হবে
    if (val === "" || /^\d+$/.test(val)) {
      setAddQtyMap((prev) => ({ ...prev, [id]: val }));
    }
  };

  // ========================================================
  // ⚡ মূল স্টক বৃদ্ধি লজিক:
  // (যেমন: Ace 500 এ ১টি থাকলে ১টি পাঠালে AllMedicine-এ ২টি হবে)
  // ========================================================
  const handleAddStock = async (med, customAmount) => {
    let amountToAdd = 0;

    if (customAmount !== undefined) {
      amountToAdd = customAmount;
    } else {
      const rawVal = getAddAmount(med._id);
      amountToAdd = parseInt(rawVal, 10);

      // ইনপুট খালি থাকলে সতর্কবার্তা
      if (isNaN(amountToAdd) || amountToAdd <= 0) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "warning",
          title: "স্টক সংখ্যা লিখুন",
          text: "কত পিস পাঠাতে চান তা ইনপুট বক্সে লিখুন অথবা +১ বাটন চাপুন।",
          timer: 2200,
          showConfirmButton: false,
        });
        return;
      }
    }

    const currentStock = Number(med.stock) || 0;
    const newStock = currentStock + amountToAdd; // যেমন ১টি থাকলে ১+১ = ২টি হবে

    try {
      setUpdatingId(med._id);

      // ১. লোকাল স্টেটে সাথে সাথে আপডেট (Optimistic UI)
      setMedicines((prev) =>
        prev.map((item) =>
          item._id === med._id ? { ...item, stock: newStock } : item,
        ),
      );

      // ২. প্যারেন্ট অ্যাপে সিঙ্ক (AllMedicine ও Store পেজের স্টেট আপডেট)
      if (typeof onUpdateStock === "function") {
        onUpdateStock(med._id, newStock);
      }

      // ৩. গ্লোবাল উইন্ডো ইভেন্ট (যাতে AllMedicine.jsx পেজ রিলোড ছাড়াই সাথে সাথে আপডেট দেখে)
      window.dispatchEvent(
        new CustomEvent("novacare_stock_updated", {
          detail: { medicineId: med._id, newStock, addedAmount: amountToAdd },
        }),
      );

      // ৪. ডাটাবেজ আপডেট (PUT API)
      await axios.put(`${API_URL}/api/medicines/${med._id}`, {
        ...med,
        stock: newStock,
      });

      // শেষ আপডেটেড আইডি সেট
      setLastUpdatedId(med._id);

      // ৫. হিস্ট্রি রেকর্ড সংরক্ষণ
      const newEntry = {
        id: Date.now().toString(),
        medicineName: med.medicineName,
        company: med.company || "NovaCare",
        addedAmount: amountToAdd,
        oldStock: currentStock,
        newStock: newStock,
        time: new Date().toLocaleTimeString("bn-BD", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setHistory((prev) => [newEntry, ...prev.slice(0, 14)]);

      // ⚡ ইনপুট বক্স পুনরায় স্বয়ংক্রিয়ভাবে খালি করে দেওয়া হলো
      setAddQtyMap((prev) => ({ ...prev, [med._id]: "" }));

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `স্টক যুক্ত হয়েছে! (+${amountToAdd} pcs)`,
        text: `${med.medicineName}: ${currentStock} ➔ ${newStock} টি হয়েছে`,
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      console.error("Stock addition failed:", error);
      Swal.fire({
        icon: "error",
        title: "স্টক আপডেট ব্যর্থ",
        text: error?.message || "সার্ভারে কানেক্ট করা যায়নি!",
      });
      loadMedicines(false);
    } finally {
      setUpdatingId(null);
    }
  };

  // হিস্ট্রি পরিষ্কার করা
  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("novacare_stock_history");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* =========================================================
            ১. শীর্ষ ব্যানার (NovaCare Live Inventory Center)
        ========================================================= */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-950 p-5 sm:p-7 text-white shadow-xl border border-teal-500/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 shadow-lg font-black text-xl">
                  <FaWarehouse />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      NovaCare ওষুধ স্টক ইন ও রিস্টক রুম
                    </h1>
                    <span className="rounded-full bg-emerald-500/25 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                      ⚡ LIVE STOCK DISPATCH
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-teal-200/90 font-medium mt-0.5">
                    এখানে যে কোনো ওষুধে ১টি বা যত পিস পাঠাবেন—সাথে সাথে
                    AllMedicine ও স্টোরে স্টক বৃদ্ধি পাবে
                  </p>
                </div>
              </div>

              {/* স্ট্যাটাস ব্যাজ */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 font-black text-emerald-300">
                  <FaBoxes className="text-[11px]" />
                  <span>ডাটাবেজ ওষুধ সংখ্যা: {medicines.length} টি</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 border border-teal-500/30 px-3 py-1 font-bold text-teal-300">
                  <FaCheckCircle className="text-[10px] text-teal-400" />
                  <span>AllMedicine লাইভ সিঙ্ক অ্যাক্টিভ</span>
                </span>
              </div>
            </div>

            {/* অ্যাকশন বাটনসমূহ */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadMedicines(false)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition active:scale-95"
                title="ডাটাবেজ রিফ্রেশ"
              >
                <FaSyncAlt
                  className={
                    loading || isSyncing ? "animate-spin text-teal-300" : ""
                  }
                />
                <span>রিফ্রেশ</span>
              </button>

              {onNavigateToStore && (
                <button
                  type="button"
                  onClick={onNavigateToStore}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  <FaCapsules />
                  <span>💊 All Medicines ক্যাটালগ</span>
                </button>
              )}

              {onNavigateToStockOut && (
                <button
                  type="button"
                  onClick={onNavigateToStockOut}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  <span>🚨 স্টক আউট (≤২)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            ২. লাইভ সার্চ ও কোম্পানি ফিল্টার
        ========================================================= */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="যে ওষুধের স্টক পাঠাতে চান তা খুঁজুন (যেমন: Ace 500, Rosuva, Napa, Seclo, Square...)..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-slate-50 focus:bg-white transition"
              />
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs bg-slate-200 rounded-full h-5 w-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            {selectedCompany && (
              <button
                type="button"
                onClick={() => setSelectedCompany("")}
                className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 text-xs font-bold hover:bg-rose-100 transition whitespace-nowrap self-start md:self-auto"
              >
                রিসেট ফিল্টার
              </button>
            )}
          </div>

          {/* কোম্পানি বাটন */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <FaBuilding className="text-[10px]" />
              <span>কোম্পানি:</span>
            </span>
            {companies.map((c) => (
              <button
                key={c.value || "all"}
                type="button"
                onClick={() => setSelectedCompany(c.value)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  selectedCompany === c.value
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================
            ৩. মূল লেআউট: ওষুধের তালিকা ও লাইভ হিস্ট্রি
        ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* বাম পাশ: মেডিসিন তালিকা ও রিস্টক বাটন */}
          <div className="lg:col-span-8 rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>ঔষধের তালিকা ও স্টক পাঠানোর কন্ট্রোল</span>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-black text-teal-800">
                    {filteredMedicines.length} টি
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ইনপুট বক্সে সংখ্যা লিখে <b>+ স্টক পাঠান</b> চাপলে সাথে সাথে
                  AllMedicine-এ স্টক যোগ হয়ে যাবে
                </p>
              </div>

              <span className="text-xs font-medium text-slate-500">
                ফলাফল: <b>{filteredMedicines.length}</b> টি
              </span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-3 border-teal-600 border-t-transparent mb-3" />
                <p className="text-sm font-bold text-slate-600">
                  মেডিসিন ডাটাবেজ লোড হচ্ছে...
                </p>
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <FaBoxes className="mx-auto text-4xl text-slate-300 mb-2" />
                <h3 className="text-base font-bold text-slate-800">
                  কোনো ঔষধ মেলেনি!
                </h3>
                <p className="text-xs text-slate-400">
                  অন্য কোনো নাম বা কোম্পানি দিয়ে সার্চ করুন।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
                {filteredMedicines.map((med, idx) => {
                  const currentStock = Number(med.stock) || 0;
                  const isZeroStock = currentStock <= 0;
                  const mrpPrice = Number(
                    med.mrpePrice || med.sellingPrice || 0,
                  );
                  const isUpdating = updatingId === med._id;
                  const isJustUpdated = lastUpdatedId === med._id;
                  const currentAddAmount = getAddAmount(med._id);

                  return (
                    <div
                      key={med._id || `stock-item-${idx}`}
                      className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-teal-50/20 ${
                        isJustUpdated
                          ? "bg-emerald-50/80 ring-2 ring-emerald-500 shadow-md font-semibold"
                          : ""
                      }`}
                    >
                      {/* মেডিসিন ইনফো */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center">
                          <img
                            src={med.image || DEFAULT_MED_IMG}
                            alt={med.medicineName}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.target.src = DEFAULT_MED_IMG;
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-slate-900 leading-tight">
                              {med.medicineName}
                            </h3>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {med.company || "Square"}
                            </span>
                            {med.dosageForm && (
                              <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold text-teal-800">
                                {med.dosageForm} {med.strength || ""}
                              </span>
                            )}
                            {isJustUpdated && (
                              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white animate-pulse">
                                ✓ Updated
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs flex-wrap">
                            <span className="text-slate-400 text-[11px] truncate max-w-[170px]">
                              {med.genericName || "Certified formulation"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-emerald-700 font-bold">
                              MRP: ৳{mrpPrice.toFixed(2)}
                            </span>
                          </div>

                          {/* বর্তমান স্টক */}
                          <div className="mt-1.5 flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-bold">
                              বর্তমান স্টক:
                            </span>
                            <span
                              className={`rounded-lg px-2 py-0.5 text-xs font-black font-mono ${
                                isZeroStock
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : currentStock <= 2
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {currentStock} টি
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* স্টক বাড়ানোর কন্ট্রোল প্যানেল */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* কুইক +১, +৫, +১০ বাটন */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleAddStock(med, 1)}
                            className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 px-2.5 py-2 text-xs font-bold transition active:scale-95"
                            title="১টি স্টক পাঠান (১+১=২)"
                          >
                            <FaPlus className="text-[9px]" />
                            <span>+১ টি</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleAddStock(med, 5)}
                            className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 px-2.5 py-2 text-xs font-bold transition active:scale-95"
                          >
                            +৫
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleAddStock(med, 10)}
                            className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 px-2.5 py-2 text-xs font-bold transition active:scale-95"
                          >
                            +১০
                          </button>
                        </div>

                        {/* ⚡ নির্দিষ্ট সংখ্যা ইনপুট দিয়ে পাঠানোর কন্ট্রোল (আগে থেকে সম্পূর্ণ খালি থাকে) */}
                        <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:border-teal-500 transition">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="সংখ্যা"
                            value={currentAddAmount}
                            onChange={(e) =>
                              setAddAmount(med._id, e.target.value)
                            }
                            className="w-16 text-center text-xs font-mono font-bold text-slate-900 py-2 focus:outline-none bg-slate-50 focus:bg-white placeholder:text-slate-400 placeholder:font-normal"
                            title="কত পিস বাড়াতে চান লিখুন (আগে থেকে খালি থাকে)"
                          />

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleAddStock(med)}
                            className="flex items-center gap-1 bg-[#00897b] hover:bg-[#00796b] text-white px-3 py-2 text-xs font-black transition active:scale-95 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                          >
                            <FaTruckLoading className="text-xs" />
                            <span>
                              {isUpdating ? "পাঠাচ্ছে..." : "স্টক পাঠান"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ডান পাশ: লাইভ হিস্ট্রি */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-black text-xs">
                    <FaHistory />
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    রিসেন্ট স্টক পাঠানোর ইতিহাস
                  </h3>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    মুছুন
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <FaTruckLoading className="mx-auto text-3xl text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">
                    এখনো কোনো স্টক পাঠানো হয়নি
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    বাম পাশের তালিকা থেকে যে কোনো ওষুধে <b>+১ বা যত পিস</b>{" "}
                    পাঠাবেন, সাথে সাথে এখানে ও AllMedicine-এ আপডেট দেখতে পাবেন।
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3 text-xs space-y-1 transition hover:bg-teal-50/80"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 truncate max-w-[180px]">
                          {item.medicineName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{item.company}</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-slate-500">
                            {item.oldStock}
                          </span>
                          <span className="text-teal-600">➔</span>
                          <span className="text-emerald-700 font-black">
                            {item.newStock} টি
                          </span>
                          <span className="rounded bg-emerald-600 text-white px-1.5 py-0.2 text-[9px] font-black">
                            +{item.addedAmount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* কুইক অ্যাকশন বাটনসমূহ */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {onNavigateToStore && (
                  <button
                    type="button"
                    onClick={onNavigateToStore}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-black transition active:scale-95 shadow-md"
                  >
                    <span>💊 AllMedicine পেজে গিয়ে স্টক যাচাই করুন</span>
                  </button>
                )}

                {onNavigateToAdd && (
                  <button
                    type="button"
                    onClick={onNavigateToAdd}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 text-xs font-bold transition"
                  >
                    <FaPlus className="text-[10px]" />
                    <span>নতুন ওষুধ যোগ করুন (Add Medicine)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
