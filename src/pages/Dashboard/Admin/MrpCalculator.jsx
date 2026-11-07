import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaCalculator,
  FaSearch,
  FaPlus,
  FaMinus,
  FaTrash,
  FaUndo,
  FaPrint,
  FaCopy,
  FaShareAlt,
  FaBoxes,
  FaPercent,
  FaTimes,
  FaSyncAlt,
  FaDatabase,
  FaPills,
} from "react-icons/fa";

// NovaCare BD লাইভ মেডিসিন এপিআই
const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

// কুইক ডিসকাউন্ট পার্সেন্টেজ প্রিসেট
const QUICK_DISCOUNTS = [0, 5, 8, 10, 12, 14, 15, 16, 18, 20];

// অফলাইন বা প্রাথমিক ফলব্যাক ওষুধ (Rosuva সহ নিশ্চিত উপস্থিতি)
const FALLBACK_MEDICINES = [
  {
    _id: "6a9c3ae0ea51058eeec66cbf",
    medicineName: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    company: "Square",
    category: "Tablet",
    mrpePrice: 502,
    sellingPrice: 421.68,
    boxQuantity: 20,
    stock: 50,
  },
  {
    _id: "6aa97414661254b9ef3dc2a5",
    medicineName: "Rosuva 10",
    genericName: "Rosuvastatin Calcium",
    company: "Square",
    category: "Tablet",
    mrpePrice: 660,
    sellingPrice: 554.4,
    boxQuantity: 10,
    stock: 18,
  },
  {
    _id: "6aba85f8844d360f5cf639f5",
    medicineName: "Rosuva 20",
    genericName: "Rosuvastatin Calcium",
    company: "Square",
    category: "Tablet",
    mrpePrice: 640,
    sellingPrice: 537.6,
    boxQuantity: 10,
    stock: 10,
  },
  {
    _id: "6aba867c844d360f5cf639f6",
    medicineName: "Rosuva 5",
    genericName: "Rosuvastatin Calcium",
    company: "Square",
    category: "Tablet",
    mrpePrice: 600,
    sellingPrice: 504,
    boxQuantity: 10,
    stock: 8,
  },
  {
    _id: "6ac9b1ae844d360f5cf63ae8",
    medicineName: "Rosuva Ez 10/10",
    genericName: "Rosuvastatin + Ezetimibe",
    company: "Square",
    category: "Tablet",
    mrpePrice: 750,
    sellingPrice: 630,
    boxQuantity: 10,
    stock: 15,
  },
  {
    _id: "6accfaa26141ff24c3d69ef0",
    medicineName: "Rosuva Ez 20/10",
    genericName: "Rosuvastatin + Ezetimibe",
    company: "Square",
    category: "Tablet",
    mrpePrice: 660,
    sellingPrice: 554.4,
    boxQuantity: 10,
    stock: 12,
  },
  {
    _id: "6acbefa9844d360f5cf63b11",
    medicineName: "Ace Duo",
    genericName: "Paracetamol + Pamabrom",
    company: "Square",
    category: "Tablet",
    mrpePrice: 63,
    sellingPrice: 52.92,
    boxQuantity: 10,
    stock: 45,
  },
  {
    _id: "6a81a0f6757eeb1e4337f7a5",
    medicineName: "Ace 500 (250 tab)",
    genericName: "Paracetamol 500mg",
    company: "Square",
    category: "Tablet",
    mrpePrice: 300,
    sellingPrice: 252,
    boxQuantity: 10,
    stock: 120,
  },
  {
    _id: "6a7f20447db8aabb294959d7",
    medicineName: "AREDS Softgel Capsule",
    genericName: "Antioxidants + Minerals",
    company: "Aristopharma",
    category: "Capsule",
    mrpePrice: 1260,
    sellingPrice: 1058.4,
    boxQuantity: 10,
    stock: 30,
  },
  {
    _id: "6ab83b70860d5bfa7a6c9869",
    medicineName: "Adomide 100",
    genericName: "S-Adenosyl-L-Methionine",
    company: "Square",
    category: "Tablet",
    mrpePrice: 200,
    sellingPrice: 168,
    boxQuantity: 10,
    stock: 40,
  },
];

export default function MrpCalculator() {
  const [medicines, setMedicines] = useState(FALLBACK_MEDICINES);
  const [loadingDb, setLoadingDb] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(12);

  // লাইভ সার্ভার সার্চ রেজাল্ট স্টেট (যাতে Rosuva সহ ডাটাবেজের যেকোনো ঔষধ তাৎক্ষণিক পাওয়া যায়)
  const [serverResults, setServerResults] = useState([]);
  const [serverSearching, setServerSearching] = useState(false);

  // ক্যালকুলেটর আইটেম স্টেট (লোকাল স্টোরেজ ক্যাশিং সহ)
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("novacare_box_calc_items");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [
      {
        id: "item-1",
        medicineId: "6a9c3ae0ea51058eeec66cbf",
        medicineName: "Ace Plus",
        company: "Square",
        category: "Tablet",
        boxQuantity: 2,
        databaseMrp: 502,
        customMrp: 502,
        totalMrp: 1004,
      },
      {
        id: "item-2",
        medicineId: "6aa97414661254b9ef3dc2a5",
        medicineName: "Rosuva 10",
        company: "Square",
        category: "Tablet",
        boxQuantity: 1,
        databaseMrp: 660,
        customMrp: 660,
        totalMrp: 660,
      },
    ];
  });

  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "",
    company: "Square",
    boxQty: "1",
    mrp: "100",
  });

  const searchBoxRef = useRef(null);
  const searchCancelRef = useRef(null);

  // ১. লাইভ ডাটাবেজ থেকে সমস্ত ওষুধের প্রাথমিক তালিকা লোড
  const fetchMedicines = async () => {
    try {
      setLoadingDb(true);
      const res = await axios.get(`${API_URL}/api/medicines?limit=1000`, {
        timeout: 12000,
      });

      const list =
        res.data?.medicines || (Array.isArray(res.data) ? res.data : []);

      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((m) => ({
          ...m,
          mrpePrice: Number(m.mrpePrice || m.sellingPrice || 100),
        }));

        const existingIds = new Set(formatted.map((m) => m._id));
        const missingFallbacks = FALLBACK_MEDICINES.filter(
          (f) => !existingIds.has(f._id),
        );

        setMedicines([...formatted, ...missingFallbacks]);
      }
    } catch (err) {
      console.warn("Using offline medicines fallback:", err?.message || err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // ২. ⚡ লাইভ ডাটাবেজ সার্চ: ব্যবহারকারী টাইপ করলেই সরাসরি সার্ভার এপিআইতে কুয়েরি চলে যাবে
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setServerResults([]);
      setServerSearching(false);
      return;
    }

    if (searchCancelRef.current) {
      searchCancelRef.current.cancel("New search initiated");
    }
    const cancelSource = axios.CancelToken.source();
    searchCancelRef.current = cancelSource;

    setServerSearching(true);
    const delayTimer = setTimeout(() => {
      axios
        .get(`${API_URL}/api/medicines`, {
          params: { search: q },
          timeout: 8000,
          cancelToken: cancelSource.token,
        })
        .then((res) => {
          const list =
            res.data?.medicines || (Array.isArray(res.data) ? res.data : []);
          if (Array.isArray(list)) {
            const formatted = list.map((m) => ({
              ...m,
              mrpePrice: Number(m.mrpePrice || m.sellingPrice || 100),
            }));
            setServerResults(formatted);

            // নতুন পাওয়া ওষুধগুলোকে মেমরি ক্যাশেও স্টোর করে রাখা
            setMedicines((prev) => {
              const prevIds = new Set(prev.map((p) => p._id));
              const newItems = formatted.filter(
                (item) => !prevIds.has(item._id),
              );
              return newItems.length > 0 ? [...prev, ...newItems] : prev;
            });
          }
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            console.warn("Live server search fallback:", err?.message || err);
          }
        })
        .finally(() => {
          setServerSearching(false);
        });
    }, 200);

    return () => {
      clearTimeout(delayTimer);
      if (searchCancelRef.current) {
        searchCancelRef.current.cancel("Component unmount or new input");
      }
    };
  }, [searchQuery]);

  // লোকাল স্টোরেজে স্বয়ংক্রিয় সংরক্ষণ
  useEffect(() => {
    try {
      localStorage.setItem("novacare_box_calc_items", JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  // সার্চের বাইরে ক্লিক করলে ড্রপডাউন বন্ধ
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsSearching(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ৩. হাইব্রিড সার্চ রেজাল্ট: সার্ভার লাইভ রেজাল্ট + লোকাল মেমোরি ফিল্টার
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const map = new Map();

    serverResults.forEach((m) => {
      if (m && m._id) map.set(m._id, m);
    });

    medicines
      .filter(
        (m) =>
          (m.medicineName || "").toLowerCase().includes(q) ||
          (m.genericName || "").toLowerCase().includes(q) ||
          (m.company || "").toLowerCase().includes(q),
      )
      .forEach((m) => {
        if (!map.has(m._id)) map.set(m._id, m);
      });

    return Array.from(map.values()).slice(0, 15);
  }, [medicines, serverResults, searchQuery]);

  const totalBoxes = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.boxQuantity) || 0), 0),
    [items],
  );

  const totalGrossMrp = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.totalMrp) || 0), 0),
    [items],
  );

  const discountAmount = useMemo(() => {
    const pct = Math.max(0, Number(discountPercent) || 0);
    return (totalGrossMrp * pct) / 100;
  }, [totalGrossMrp, discountPercent]);

  const netPayable = useMemo(
    () => Math.max(0, totalGrossMrp - discountAmount),
    [totalGrossMrp, discountAmount],
  );

  const handleAddMedicine = (med) => {
    const dbMrp = Number(med.mrpePrice || med.sellingPrice || 100);
    const existingIndex = items.findIndex((i) => i.medicineId === med._id);

    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, idx) => {
          if (idx === existingIndex) {
            const newQty = item.boxQuantity + 1;
            return {
              ...item,
              boxQuantity: newQty,
              totalMrp: newQty * item.customMrp,
            };
          }
          return item;
        }),
      );
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: `${med.medicineName} এর বক্স সংখ্যা ১ বাড়ানো হয়েছে`,
        showConfirmButton: false,
        timer: 1500,
      });
    } else {
      const newItem = {
        id:
          "item-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        medicineId: med._id,
        medicineName: med.medicineName,
        genericName: med.genericName || "",
        company: med.company || "Square",
        category: med.category || "Tablet",
        boxQuantity: 1,
        databaseMrp: dbMrp,
        customMrp: dbMrp,
        totalMrp: dbMrp * 1,
      };
      setItems((prev) => [newItem, ...prev]);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${med.medicineName} যোগ করা হয়েছে! (MRP: ৳${dbMrp})`,
        showConfirmButton: false,
        timer: 1600,
      });
    }

    setSearchQuery("");
    setIsSearching(false);
  };

  const updateBoxQty = (id, newQty) => {
    const qty = Math.max(1, parseInt(String(newQty), 10) || 1);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              boxQuantity: qty,
              totalMrp: qty * item.customMrp,
            }
          : item,
      ),
    );
  };

  const updateCustomMrp = (id, newPrice) => {
    const price = Math.max(0, parseFloat(String(newPrice)) || 0);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              customMrp: price,
              totalMrp: item.boxQuantity * price,
            }
          : item,
      ),
    );
  };

  const resetToDbMrp = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              customMrp: item.databaseMrp,
              totalMrp: item.boxQuantity * item.databaseMrp,
            }
          : item,
      ),
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    Swal.fire({
      title: "আপনি কি নিশ্চিত?",
      text: "ক্যালকুলেটরের সকল আইটেম মুছে যাবে!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "হ্যাঁ, মুছে ফেলুন",
      cancelButtonText: "বাতিল",
    }).then((res) => {
      if (res.isConfirmed) {
        setItems([]);
      }
    });
  };

  const handleAddCustomMedicine = (e) => {
    e.preventDefault();
    if (!customForm.name.trim()) return;

    const mrp = parseFloat(customForm.mrp) || 100;
    const qty = parseInt(customForm.boxQty, 10) || 1;

    const newItem = {
      id: "custom-" + Date.now(),
      medicineId: "custom-" + Date.now(),
      medicineName: customForm.name.trim(),
      company: customForm.company || "Custom",
      category: "Medicine",
      boxQuantity: qty,
      databaseMrp: mrp,
      customMrp: mrp,
      totalMrp: qty * mrp,
    };

    setItems((prev) => [newItem, ...prev]);
    setCustomModalOpen(false);
    setCustomForm({ name: "", company: "Square", boxQty: "1", mrp: "100" });

    Swal.fire({
      icon: "success",
      title: "কাস্টম ওষুধ যোগ হয়েছে",
      timer: 1400,
      showConfirmButton: false,
    });
  };

  const handleCopySummary = () => {
    if (items.length === 0) {
      Swal.fire({
        icon: "info",
        title: "কোনো আইটেম নেই",
        text: "আগে ওষুধ যোগ করুন",
      });
      return;
    }

    let text = "📦 NovaCare BD — ওষুধের বক্স ও MRP হিসাব রশিদ\n";
    text += "তারিখ: " + new Date().toLocaleDateString("bn-BD") + "\n";
    text += "----------------------------------------\n";
    items.forEach((item, idx) => {
      text += `${idx + 1}. ${item.medicineName} (${item.company})\n`;
      text += `   বক্স সংখ্যা: ${item.boxQuantity} টি | প্রতি বক্স MRP: ৳${item.customMrp}\n`;
      text += `   মোট MRP: ৳${item.totalMrp.toFixed(2)}\n`;
    });
    text += "----------------------------------------\n";
    text += `সর্বমোট বক্স: ${totalBoxes} টি\n`;
    text += `সর্বমোট গ্রস MRP: ৳${totalGrossMrp.toFixed(2)}\n`;
    text += `ডিসকাউন্ট বাদ (${discountPercent}%): -৳${discountAmount.toFixed(2)}\n`;
    text += `ছাড় বাদে মোট প্রদেয়: ৳${netPayable.toFixed(2)}\n`;
    text += "----------------------------------------\n";
    text += "NovaCare BD (novocarebd.com) • ১০০% জেনুইন ওষুধ";

    navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "হিসাব ক্লিপবোর্ডে কপি হয়েছে!",
      text: "হোয়াটসঅ্যাপে পেস্ট করে পাঠাতে পারেন।",
      showConfirmButton: false,
      timer: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* শীর্ষ ব্যানার ও লাইভ ডাটাবেজ স্ট্যাটাস */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-5 sm:p-7 text-white shadow-xl border border-emerald-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg font-black text-xl">
                  <FaCalculator />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    NovaCare ওষুধের বক্স ও MRP ক্যালকুলেটর
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-300 font-medium">
                    লাইভ ডাটাবেজ থেকে MRP আসবে • বক্স কোয়ান্টিটি দিলে স্বয়ংক্রিয়
                    মোট হিসাব • % ডিসকাউন্ট বাদ
                  </p>
                </div>
              </div>

              {/* ডাটাবেজ স্ট্যাটাস ব্যাজ */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 font-bold text-emerald-300">
                  <FaDatabase className="text-[10px]" />
                  <span>ডাটাবেজ ওষুধ সংখ্যা: {medicines.length}+ টি</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 border border-teal-500/30 px-2.5 py-0.5 text-[11px] font-bold text-teal-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>লাইভ সার্চ সচল (যেমন: Rosuva, Napa, Ace)</span>
                </span>
                <button
                  type="button"
                  onClick={fetchMedicines}
                  disabled={loadingDb}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 text-slate-200 transition"
                >
                  <FaSyncAlt
                    className={`text-[10px] ${loadingDb ? "animate-spin text-emerald-400" : ""}`}
                  />
                  <span>
                    {loadingDb ? "সিঙ্ক হচ্ছে..." : "ডাটাবেজ রিফ্রেশ"}
                  </span>
                </button>
              </div>
            </div>

            {/* ডানপাশের কুইক অ্যাকশন বাটন */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md transition"
              >
                <FaPlus />
                <span>+ কাস্টম ওষুধ</span>
              </button>
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition"
              >
                <FaShareAlt className="text-emerald-400" />
                <span>কপি / শেয়ার</span>
              </button>
            </div>
          </div>
        </div>

        {/* সার্চ বক্স */}
        <div
          ref={searchBoxRef}
          className="relative rounded-2xl bg-white p-4 shadow-sm border border-slate-200"
        >
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black text-slate-800">
              🔍 ডাটাবেজ থেকে ওষুধ খুঁজুন (নাম বা জেনেরিক লিখলেই ডাটাবেজ MRP চলে
              আসবে):
            </label>
            {serverSearching && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <FaSyncAlt className="animate-spin text-[10px]" />
                <span>ডাটাবেজ অনুসন্ধান চলছে...</span>
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              placeholder="ওষুধের নাম লিখুন (যেমন: Rosuva, Ace, Napa, Sergel, Monas, Seclo, AREDS...)"
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <FaSearch className="absolute left-4 top-3.5 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* লাইভ সার্চ সাজেশন ও ডাটাবেজ MRP ড্রপডাউন */}
          {isSearching && searchQuery.trim() && (
            <div className="absolute left-4 right-4 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center border-b border-slate-100 pb-1">
                <span>
                  ডাটাবেজে পাওয়া গেছে ({searchResults.length} টি ওষুধ)
                </span>
                <span className="text-emerald-600 font-bold">
                  ক্লিক করে যোগ করুন ↵
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <p className="text-xs font-bold text-slate-600">
                    "{searchQuery}" নামে কোনো ওষুধ মেলেনি!
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    বানান চেক করুন অথবা উপরে <b>+ কাস্টম ওষুধ</b> বাটনে ক্লিক
                    করে যোগ করুন।
                  </p>
                </div>
              ) : (
                searchResults.map((med) => {
                  const dbPrice = Number(
                    med.mrpePrice || med.sellingPrice || 100,
                  );
                  return (
                    <div
                      key={med._id}
                      onClick={() => handleAddMedicine(med)}
                      className="flex items-center justify-between rounded-xl p-3 hover:bg-emerald-50/80 cursor-pointer border border-transparent hover:border-emerald-200 transition"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">
                            {med.medicineName}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {med.company || "Square"}
                          </span>
                          {med.category && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              {med.category}
                            </span>
                          )}
                        </div>
                        {med.genericName ? (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            জেনেরিক: {med.genericName}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="block text-[10px] font-bold uppercase text-slate-400">
                          ডাটাবেজ বক্স MRP
                        </span>
                        <span className="font-mono text-base font-black text-emerald-600">
                          ৳{dbPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ওষুধের টেবিল ও সামারি বক্স */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs">
                  <FaBoxes />
                </span>
                <h2 className="text-base font-black text-slate-900">
                  যুক্ত করা ওষুধের তালিকা ({items.length} টি আইটেম)
                </h2>
              </div>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                >
                  <FaTrash className="text-[10px]" />
                  <span>সব মুছুন</span>
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FaPills className="mx-auto text-4xl text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">
                  এখনো কোনো ওষুধ তালিকায় যুক্ত করা হয়নি!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  উপরের সার্চ বক্সে ওষুধের নাম লিখে সহজে ওষুধ যোগ করুন (যেমন:
                  Rosuva, Ace, Napa...)।
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 p-3.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-black text-slate-700">
                          {idx + 1}
                        </span>
                        <h3 className="font-black text-sm text-slate-900 truncate">
                          {item.medicineName}
                        </h3>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                          {item.company}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 pl-7">
                        <span>ডাটাবেজ মূল MRP: ৳{item.databaseMrp}</span>
                        {item.customMrp !== item.databaseMrp && (
                          <button
                            type="button"
                            onClick={() => resetToDbMrp(item.id)}
                            className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5"
                            title="মূল MRP-তে রিসেট করুন"
                          >
                            <FaUndo className="text-[9px]" /> রিসেট
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase text-slate-400">
                          বক্স সংখ্যা
                        </span>
                        <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-2xs overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateBoxQty(item.id, item.boxQuantity - 1)
                            }
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.boxQuantity}
                            onChange={(e) =>
                              updateBoxQty(item.id, e.target.value)
                            }
                            className="w-12 text-center text-xs font-mono font-black text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateBoxQty(item.id, item.boxQuantity + 1)
                            }
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-slate-400">
                          প্রতি বক্স MRP (৳)
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.customMrp}
                          onChange={(e) =>
                            updateCustomMrp(item.id, e.target.value)
                          }
                          className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="w-24 text-right">
                        <span className="block text-[9px] font-black uppercase text-slate-400">
                          মোট MRP
                        </span>
                        <span className="font-mono text-sm sm:text-base font-black text-emerald-700">
                          ৳{item.totalMrp.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="মুছে ফেলুন"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* % ডিসকাউন্ট ও চূড়ান্ত হিসাব কার্ড */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white font-black text-xs">
                  <FaPercent />
                </span>
                <h3 className="text-base font-black text-slate-900">
                  ডিসকাউন্ট ও মোট হিসাব
                </h3>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-700">
                    কত % ডিসকাউন্ট বাদ দেবেন?
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountPercent}
                      onChange={(e) =>
                        setDiscountPercent(parseFloat(e.target.value) || 0)
                      }
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center font-mono text-sm font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-sm font-black text-slate-700">%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_DISCOUNTS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                        discountPercent === pct
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-bold">আইটেম সংখ্যা:</span>
                  <span className="font-mono font-black">
                    {items.length} টি
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-bold">সর্বমোট বক্স সংখ্যা:</span>
                  <span className="font-mono font-black">{totalBoxes} টি</span>
                </div>

                <div className="flex items-center justify-between text-slate-800 border-t border-slate-200/80 pt-2 text-sm">
                  <span className="font-black">সর্বমোট গ্রস MRP:</span>
                  <span className="font-mono font-black">
                    ৳{totalGrossMrp.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-rose-600 font-bold">
                  <span>ডিসকাউন্ট ({discountPercent}% বাদ):</span>
                  <span className="font-mono font-black">
                    -৳{discountAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-emerald-600 p-3 text-white shadow-md">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                      ছাড় বাদে চূড়ান্ত প্রদেয়
                    </p>
                    <p className="text-lg font-black font-mono">
                      ৳{netPayable.toFixed(2)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-black">
                    NET TOTAL
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs font-black text-white shadow-md transition"
                >
                  <FaPrint />
                  <span>প্রিন্ট রসিদ / ক্যাশ মেমো</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 py-2.5 text-xs font-black text-emerald-800 transition"
                >
                  <FaCopy />
                  <span>সামারি কপি করুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* কাস্টম ওষুধ যুক্ত করার মডাল */}
        {customModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">
                  ম্যানুয়ালি ওষুধ যুক্ত করুন
                </h3>
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleAddCustomMedicine} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ওষুধের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={customForm.name}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, name: e.target.value })
                    }
                    placeholder="যেমন: Rosuva 10, Napa Extra, Finix 20..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      কোম্পানি
                    </label>
                    <input
                      type="text"
                      value={customForm.company}
                      onChange={(e) =>
                        setCustomForm({
                          ...customForm,
                          company: e.target.value,
                        })
                      }
                      placeholder="যেমন: Square, Beximco"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বক্স সংখ্যা
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customForm.boxQty}
                      onChange={(e) =>
                        setCustomForm({ ...customForm, boxQty: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রতি বক্সের MRP (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customForm.mrp}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, mrp: e.target.value })
                    }
                    placeholder="100.00"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700"
                  >
                    যোগ করুন
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
