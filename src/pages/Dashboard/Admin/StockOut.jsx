import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link, useNavigate } from "react-router-dom";
import {
  FaExclamationTriangle,
  FaBoxes,
  FaSearch,
  FaSyncAlt,
  FaPlus,
  FaArrowLeft,
  FaCheckCircle,
  FaBuilding,
  FaEdit,
  FaSave,
  FaTimes,
  FaPills,
} from "react-icons/fa";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").trim();

// NovaCare কোম্পানির তালিকা
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

export function StockOut({
  onUpdateStock,
  onNavigateToStore,
  onNavigateToAdd,
}) {
  const navigate = useNavigate();

  const [allMedicines, setAllMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' (<=2) | 'zero' (=0) | 'low' (1 or 2)

  // কুইক এডিট মোডাল স্টেট (AllMedicine এর মতো)
  const [quickEditMed, setQuickEditMed] = useState(null);
  const [quickEditForm, setQuickEditForm] = useState({
    medicineName: "",
    genericName: "",
    company: "",
    purchasePrice: 0,
    mrpePrice: 0,
    bikriPercent: 0,
    sellingPrice: 0,
    stock: 0,
  });
  const [isUpdatingQuick, setIsUpdatingQuick] = useState(false);

  // ইন-লাইন স্টক এডিট স্টেট
  const [editingId, setEditingId] = useState(null);
  const [editStockValue, setEditStockValue] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  // ১. সার্ভার থেকে সম্পূর্ণ মেডিসিন লোড
  const fetchMedicines = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setIsSyncing(true);

      const res = await axios.get(`${API}/api/medicines`);
      const meds =
        res.data?.medicines || (Array.isArray(res.data) ? res.data : []);

      if (Array.isArray(meds)) {
        setAllMedicines(meds);
      }
    } catch (error) {
      console.error("StockOut Load Error:", error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchMedicines(true);
  }, []);

  // ২. ⚡ ক্রিটিক্যাল রুল: শুধুমাত্র স্টক ০ এবং ২ বা তার কম প্রোডাক্ট থাকবে
  // যখন কোনো প্রোডাক্টের স্টক ২ এর বেশি হবে, তা স্বয়ংক্রিয়ভাবে ফিল্টার আউট হয়ে যাবে!
  const stockOutMedicines = useMemo(() => {
    return allMedicines.filter((m) => {
      const stock = Number(m.stock) || 0;
      return stock <= 2;
    });
  }, [allMedicines]);

  // ফিল্টার ও সার্চিং প্রয়োগ
  const filteredMedicines = useMemo(() => {
    let result = [...stockOutMedicines];

    // ফিল্টার টাইপ (সব <=2, শুধু 0, অথবা শুধু 1-2)
    if (filterType === "zero") {
      result = result.filter((m) => (Number(m.stock) || 0) <= 0);
    } else if (filterType === "low") {
      result = result.filter((m) => {
        const s = Number(m.stock) || 0;
        return s === 1 || s === 2;
      });
    }

    // কোম্পানি ফিল্টার
    if (company) {
      const compLower = company.toLowerCase();
      result = result.filter(
        (m) =>
          (m.company || "").toLowerCase() === compLower ||
          (compLower === "ibnsina" &&
            (m.company || "").toLowerCase().includes("ibn")),
      );
    }

    // সার্চ ফিল্টার
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          (m.medicineName || "").toLowerCase().includes(q) ||
          (m.genericName || "").toLowerCase().includes(q) ||
          (m.company || "").toLowerCase().includes(q),
      );
    }

    // শর্টিং: স্টক ০ গুলো সবার উপরে, এরপর ১, এরপর ২
    result.sort((a, b) => {
      const stockA = Number(a.stock) || 0;
      const stockB = Number(b.stock) || 0;
      if (stockA !== stockB) return stockA - stockB;
      return (a.medicineName || "").localeCompare(b.medicineName || "");
    });

    return result;
  }, [stockOutMedicines, filterType, company, search]);

  // স্ট্যাটস কাউন্ট
  const totalZeroStock = useMemo(
    () => stockOutMedicines.filter((m) => (Number(m.stock) || 0) <= 0).length,
    [stockOutMedicines],
  );
  const totalLowStock = useMemo(
    () =>
      stockOutMedicines.filter((m) => {
        const s = Number(m.stock) || 0;
        return s === 1 || s === 2;
      }).length,
    [stockOutMedicines],
  );

  // ৩. ⚡ স্টক আপডেট হ্যান্ডলার: স্টক বাড়লে পেজ থেকে সরে যাবে
  const handleStockUpdate = async (med, newStock) => {
    const updatedQty = Math.max(0, parseInt(newStock, 10) || 0);

    try {
      setUpdatingId(med._id);

      // লোকাল স্টেট আপডেট
      setAllMedicines((prev) =>
        prev.map((item) =>
          item._id === med._id ? { ...item, stock: updatedQty } : item,
        ),
      );

      // প্যারেন্ট ফাংশন আপডেট
      if (onUpdateStock) {
        onUpdateStock(med._id, updatedQty);
      }

      // সার্ভার API কল
      await axios.put(`${API}/api/medicines/${med._id}`, {
        ...med,
        stock: updatedQty,
      });

      setEditingId(null);

      // নোটিফিকেশন
      if (updatedQty > 2) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `"${med.medicineName}" রিস্টক হয়েছে (${updatedQty} pcs)!`,
          text: "এটি এখন স্টক আউট পেজ থেকে সরে স্টোরে চলে গেছে।",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: `স্টক ${updatedQty} এ আপডেট হয়েছে`,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error("Stock update error:", error);
      Swal.fire({
        icon: "error",
        title: "স্টক আপডেট ব্যর্থ",
        text: error?.message || "সার্ভার এরর",
      });
      fetchMedicines(false);
    } finally {
      setUpdatingId(null);
    }
  };

  // কুইক এড বোতাম (+10, +25, +50)
  const handleQuickAdd = (med, amount) => {
    const current = Number(med.stock) || 0;
    handleStockUpdate(med, current + amount);
  };

  // ৪. কুইক এডিট মোডাল ওপেন ও সেভ
  const handleOpenQuickEdit = (med) => {
    setQuickEditMed(med);
    const purchase = Number(med.purchasePrice || 0);
    const mrp = Number(med.mrpePrice ?? med.mrp ?? 0);
    const bikri = Number(med.bikriPercent ?? med.discount ?? 0);
    const selling = Number(
      med.sellingPrice || (mrp > 0 ? mrp - (mrp * bikri) / 100 : 0),
    );

    setQuickEditForm({
      medicineName: med.medicineName || "",
      genericName: med.genericName || "",
      company: med.company || "",
      purchasePrice: purchase,
      mrpePrice: mrp,
      bikriPercent: bikri,
      sellingPrice: selling,
      stock: Number(med.stock || 0),
    });
  };

  const handleQuickEditChange = (field, value) => {
    setQuickEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "mrpePrice" || field === "bikriPercent") {
        const mrp =
          parseFloat(field === "mrpePrice" ? value : updated.mrpePrice) || 0;
        const bikri =
          parseFloat(field === "bikriPercent" ? value : updated.bikriPercent) ||
          0;
        if (mrp > 0) {
          updated.sellingPrice = parseFloat(
            (mrp - (mrp * bikri) / 100).toFixed(2),
          );
        }
      }
      return updated;
    });
  };

  const handleSaveQuickEdit = async (e) => {
    e.preventDefault();
    if (!quickEditMed) return;

    try {
      setIsUpdatingQuick(true);
      const newStock = Number(quickEditForm.stock) || 0;

      const payload = {
        medicineName: quickEditForm.medicineName,
        genericName: quickEditForm.genericName,
        company: quickEditForm.company,
        purchasePrice: Number(quickEditForm.purchasePrice) || 0,
        mrpePrice: Number(quickEditForm.mrpePrice) || 0,
        bikriPercent: Number(quickEditForm.bikriPercent) || 0,
        sellingPrice: Number(quickEditForm.sellingPrice) || 0,
        stock: newStock,
      };

      await axios.put(`${API}/api/medicines/${quickEditMed._id}`, payload);

      setAllMedicines((prev) =>
        prev.map((item) =>
          item._id === quickEditMed._id ? { ...item, ...payload } : item,
        ),
      );

      if (onUpdateStock) {
        onUpdateStock(quickEditMed._id, newStock);
      }

      setQuickEditMed(null);

      if (newStock > 2) {
        Swal.fire({
          icon: "success",
          title: "রিস্টক সফল হয়েছে!",
          text: `${payload.medicineName} এর স্টক ${newStock} হওয়ায় এটি স্টক-আউট তালিকা থেকে সরে গেছে।`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "তথ্য আপডেট হয়েছে",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      Swal.fire({
        icon: "error",
        title: "আপডেট ব্যর্থ",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setIsUpdatingQuick(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* =========================================================
            ১. হেডার ব্যানার ও লাইভ স্ট্যাটাস
        ========================================================= */}
        <div className="rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 p-5 sm:p-7 text-white shadow-xl border border-rose-500/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg font-black text-xl animate-pulse">
                  <FaExclamationTriangle />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      NovaCare স্টক আউট ও স্বল্প স্টক ম্যানেজার
                    </h1>
                    <span className="rounded-full bg-rose-600/30 border border-rose-500/50 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-300">
                      🚨 স্টক ≤ ২ রিস্টক রুম
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-200/90 font-medium mt-0.5">
                    যেসব পণ্যের স্টক ০ বা ২ এর কম—সেগুলো এখানে রয়েছে। রিস্টক
                    করলে সাথে সাথে এই তালিকা থেকে সরে যাবে।
                  </p>
                </div>
              </div>

              {/* স্ট্যাটাস কাউন্টার ব্যাজ */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 border border-rose-500/40 px-3 py-1 font-black text-rose-300 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span>স্টক আউট (০ স্টক): {totalZeroStock} টি</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/25 border border-amber-500/40 px-3 py-1 font-black text-amber-300 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>স্বল্প স্টক (১ বা ২ টি): {totalLowStock} টি</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 font-bold text-slate-200">
                  <FaBoxes className="text-[10px]" />
                  <span>মোট সতর্কতা: {stockOutMedicines.length} টি</span>
                </span>
              </div>
            </div>

            {/* অ্যাকশন বাটন */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchMedicines(false)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition active:scale-95"
              >
                <FaSyncAlt
                  className={loading ? "animate-spin text-rose-400" : ""}
                />
                <span>রিফ্রেশ</span>
              </button>

              {onNavigateToAdd ? (
                <button
                  type="button"
                  onClick={onNavigateToAdd}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  <FaPlus />
                  <span>+ নতুন ঔষধ যোগ</span>
                </button>
              ) : (
                <Link
                  to="/dashboard/add-medicine"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  <FaPlus />
                  <span>+ নতুন ঔষধ যোগ</span>
                </Link>
              )}

              {onNavigateToStore && (
                <button
                  type="button"
                  onClick={onNavigateToStore}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
                >
                  <FaArrowLeft />
                  <span>সকল ঔষধ স্টোর</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            ২. ফিল্টার ও লাইভ সার্চ
        ========================================================= */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* সার্চ বক্স */}
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="স্টক আউট বা স্বল্প স্টকের ঔষধ খুঁজুন (যেমন: Rosuva, Ace, Napa, Radiant...)"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-9 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50 focus:bg-white transition"
              />
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs bg-slate-200 rounded-full h-5 w-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ফিল্টার সুইচ: All (<=2) vs Zero (=0) vs Low (1-2) */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  filterType === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                সব (≤২ টি)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("zero")}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition flex items-center gap-1 ${
                  filterType === "zero"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>স্টক আউট (০)</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType("low")}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition flex items-center gap-1 ${
                  filterType === "low"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>স্বল্প স্টক (১-২)</span>
              </button>
            </div>
          </div>

          {/* কোম্পানি ফিল্টার বাটন */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <FaBuilding className="text-[10px]" />
              <span>কোম্পানি:</span>
            </span>
            {companies.map((c) => (
              <button
                key={c.value || "all"}
                type="button"
                onClick={() => setCompany(c.value)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  company === c.value
                    ? "bg-rose-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================
            ৩. প্রোডাক্ট লিস্ট ও লাইভ রিস্টক অপশন
        ========================================================= */}
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>স্টক আউট ও অতি স্বল্প স্টক পণ্য সমূহ</span>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-800">
                  {filteredMedicines.length} টি
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                সরাসরি +10, +25, +50 দিয়ে রিস্টক করুন। ২ এর বেশি স্টক হলে
                স্বয়ংক্রিয়ভাবে তালিকা থেকে সরে যাবে।
              </p>
            </div>

            <span className="text-xs text-slate-500">
              পাওয়া গেছে: <b>{filteredMedicines.length}</b> টি আইটেম
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-rose-600 border-t-transparent mb-3" />
              <p className="text-sm font-bold text-slate-600">
                মেডিসিন লোড হচ্ছে...
              </p>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FaCheckCircle className="mx-auto text-4xl text-emerald-500 mb-2" />
              <h3 className="text-base font-bold text-slate-800">
                {search || company || filterType !== "all"
                  ? "এই ফিল্টারে কোনো স্টক আউট বা লো স্টক পণ্য নেই!"
                  : "অসাধারণ! কোনো পণ্য স্টক আউট বা ২ এর নিচে নেই।"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {search || company
                  ? "অন্য কোনো কোম্পানি বা নাম দিয়ে সার্চ করে দেখুন।"
                  : "আপনার ফার্মেসির সকল পণ্য পর্যাপ্ত পরিমাণে স্টকে রয়েছে।"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMedicines.map((med, idx) => {
                const stock = Number(med.stock) || 0;
                const isZeroStock = stock <= 0;
                const mrpPrice = Number(med.mrpePrice ?? med.mrp ?? 0);
                const sellingPrice = Number(med.sellingPrice || 0);
                const bikriPercent = Number(
                  med.bikriPercent ?? med.discount ?? 0,
                );
                const purchasePrice = Number(med.purchasePrice || 0);

                const isUpdating = updatingId === med._id;
                const isEditing = editingId === med._id;

                return (
                  <div
                    key={med._id || `stockout-${idx}`}
                    className={`p-4 sm:p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 ${
                      isZeroStock
                        ? "bg-rose-50/20 border-l-4 border-l-rose-500"
                        : "bg-amber-50/15 border-l-4 border-l-amber-500"
                    }`}
                  >
                    {/* প্রোডাক্ট ইনফো */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* ছবি */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs">
                        <img
                          src={
                            med.image ||
                            "https://placehold.co/60x60?text=Medicine"
                          }
                          alt={med.medicineName || "Medicine"}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.target.src =
                              "https://placehold.co/60x60?text=Medicine";
                          }}
                        />
                        {isZeroStock && (
                          <div className="absolute inset-0 bg-rose-950/70 flex items-center justify-center">
                            <span className="text-[8px] font-black uppercase text-white px-1 py-0.5 rounded bg-rose-600">
                              OUT
                            </span>
                          </div>
                        )}
                      </div>

                      {/* টেক্সট ডিটেইলস */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
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
                        </div>

                        {med.genericName ? (
                          <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                            জেনেরিক: {med.genericName}
                          </p>
                        ) : null}

                        {/* মূল্য ও স্টক স্ট্যাটাস */}
                        <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">
                              বিক্রয় মূল্য:
                            </span>
                            <span className="font-mono font-black text-emerald-700">
                              ৳
                              {sellingPrice > 0
                                ? sellingPrice.toFixed(2)
                                : mrpPrice.toFixed(2)}
                            </span>
                            {mrpPrice > sellingPrice && (
                              <span className="text-[10px] text-slate-400 line-through">
                                ৳{mrpPrice.toFixed(2)}
                              </span>
                            )}
                            {bikriPercent > 0 && (
                              <span className="rounded bg-rose-50 text-rose-600 border border-rose-200 px-1 py-0.2 text-[9px] font-bold">
                                {bikriPercent}% ছাড়
                              </span>
                            )}
                          </div>

                          <span className="text-slate-300">•</span>

                          {/* বর্তমান স্টক ব্যাজ */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">
                              বর্তমান স্টক:
                            </span>
                            {isZeroStock ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-2xs">
                                <span>০ পিস (স্টক আউট)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow-2xs">
                                <span>মাত্র {stock} টি বাকি</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ডানপাশে: রিস্টক ও কুইক এডিট বাটন */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* ম্যানুয়াল ইনপুট এডিট মোড */}
                      {isEditing ? (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-rose-300 shadow-sm">
                          <span className="text-[11px] font-bold text-slate-600 pl-1">
                            স্টক:
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={editStockValue}
                            onChange={(e) =>
                              setEditStockValue(
                                parseInt(e.target.value, 10) || 0,
                              )
                            }
                            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center font-mono text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              handleStockUpdate(med, editStockValue)
                            }
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold flex items-center gap-1 transition"
                          >
                            <FaSave />
                            <span>{isUpdating ? "..." : "সেভ"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg text-slate-400 hover:text-slate-600 p-1"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* কুইক এড বোতামসমূহ */}
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 px-1">
                              যোগ:
                            </span>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickAdd(med, 10)}
                              className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-2 py-1 text-[11px] font-bold transition active:scale-95"
                              title="১০ টি যোগ করে রিস্টক করুন"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickAdd(med, 25)}
                              className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-2 py-1 text-[11px] font-bold transition active:scale-95"
                              title="২৫ টি যোগ করে রিস্টক করুন"
                            >
                              +25
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickAdd(med, 50)}
                              className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-2 py-1 text-[11px] font-bold transition active:scale-95"
                              title="৫০ টি যোগ করে রিস্টক করুন"
                            >
                              +50
                            </button>
                          </div>

                          {/* কাস্টম ইনপুট এডিট বাটন */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(med._id);
                              setEditStockValue(stock > 0 ? stock : 10);
                            }}
                            className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition active:scale-95"
                            title="নির্দিষ্ট স্টক লিখুন"
                          >
                            <FaEdit className="text-[10px]" />
                            <span>স্টক</span>
                          </button>

                          {/* AllMedicine এর মতো সম্পূর্ণ কুইক এডিট বাটন */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEdit(med)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition active:scale-95"
                            title="MRP, Bikri %, Selling Price ও Stock পরিবর্তন"
                          >
                            Quick Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================
            ৪. কুইক এডিট মোডাল (AllMedicine.jsx এর মতো)
        ========================================================= */}
        {quickEditMed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Quick Edit: {quickEditMed.medicineName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    স্টক ২ এর বেশি দিলে স্বয়ংক্রিয়ভাবে স্টক-আউট পেজ থেকে সরে
                    যাবে
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickEditMed(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveQuickEdit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    required
                    value={quickEditForm.medicineName}
                    onChange={(e) =>
                      handleQuickEditChange("medicineName", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      value={quickEditForm.company}
                      onChange={(e) =>
                        handleQuickEditChange("company", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Stock (Pcs) *
                    </label>
                    <input
                      type="number"
                      required
                      value={quickEditForm.stock}
                      onChange={(e) =>
                        handleQuickEditChange("stock", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-emerald-800 focus:border-emerald-500 focus:outline-none bg-emerald-50/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      MRP (৳)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quickEditForm.mrpePrice}
                      onChange={(e) =>
                        handleQuickEditChange("mrpePrice", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-rose-600 mb-1">
                      Bikri % OFF
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={quickEditForm.bikriPercent}
                      onChange={(e) =>
                        handleQuickEditChange("bikriPercent", e.target.value)
                      }
                      className="w-full rounded-xl border border-rose-300 p-2 text-xs font-mono font-bold text-rose-700 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                      Selling (৳)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quickEditForm.sellingPrice}
                      onChange={(e) =>
                        handleQuickEditChange("sellingPrice", e.target.value)
                      }
                      className="w-full rounded-xl border border-emerald-300 p-2 text-xs font-mono font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickEditMed(null)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingQuick}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm"
                  >
                    {isUpdatingQuick ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockOut;
