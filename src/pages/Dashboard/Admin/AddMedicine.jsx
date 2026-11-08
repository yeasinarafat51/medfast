import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  FaCapsules,
  FaBuilding,
  FaTags,
  FaMoneyBillWave,
  FaBoxes,
  FaCalendarAlt,
  FaImage,
  FaArrowRight,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

function AddMedicine({ onMedicineAdded }) {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      category: "Tablet",
      dosageForm: "Tablet",
      image: "", // ⚡ ছবি ডিফল্টভাবে খালি থাকবে
    },
  });

  const image = watch("image");

  // ==========================================
  // PRICE & STOCK STATES (আগে থেকে সম্পূর্ণ খালি)
  // ==========================================
  const [mrpePrice, setMrpePrice] = useState("");
  const [bikriPercent, setBikriPercent] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [profitPercent, setProfitPercent] = useState("");
  const [stock, setStock] = useState("");
  const [boxQuantity, setBoxQuantity] = useState("");

  // Slider & New Arrival Switches
  const [showInSlider, setShowInSlider] = useState(true);
  const [isFeaturedNew, setIsFeaturedNew] = useState(true);

  const [loading, setLoading] = useState(false);

  // =========================
  // LIVE MATH CALCULATION
  // =========================
  const mrpNumber = parseFloat(mrpePrice) || 0;
  const bikriNumber = parseFloat(bikriPercent) || 0;
  const purchaseNumber = parseFloat(purchasePrice) || 0;
  const stockNumber = parseInt(stock, 10) || 0;

  // Selling Price = MRP - (MRP * Bikri% / 100)
  const sellingPrice =
    mrpNumber > 0 ? mrpNumber - (mrpNumber * bikriNumber) / 100 : 0;
  const unitProfit =
    sellingPrice > purchaseNumber ? sellingPrice - purchaseNumber : 0;
  const estimatedTotalProfit = unitProfit * stockNumber;

  // =========================
  // DECIMAL INPUT HANDLER
  // =========================
  const handleDecimalChange = (value, setter) => {
    if (value === "") {
      setter("");
      return;
    }
    if (/^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  // Quick Preset Images
  const sampleImages = [
    {
      label: "Capsule (ক্যাপসুল)",
      url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
    },
    {
      label: "Tablet (ট্যাবলেট)",
      url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60",
    },
    {
      label: "Syrup Bottle (সিরাপ)",
      url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60",
    },
    {
      label: "Vial / Injection (ইনজেকশন)",
      url: "https://images.unsplash.com/photo-1579165466791-788226ab77b4?w=500&auto=format&fit=crop&q=60",
    },
  ];

  // =========================
  // SUBMIT HANDLER
  // =========================
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const computedSellingPrice = Number(sellingPrice.toFixed(2));
      const parsedPurchasePrice = parseFloat(purchasePrice) || 0;
      const parsedMrpePrice = parseFloat(mrpePrice) || 0;
      const parsedProfitPercent = parseFloat(profitPercent) || 0;
      const parsedBikriPercent = parseFloat(bikriPercent) || 0;
      const parsedStock = parseInt(stock, 10) || 0;
      const parsedBoxQuantity = parseInt(boxQuantity, 10) || 0;

      // New product payload with dual-channel metadata
      const medicineData = {
        ...data,
        purchasePrice: parsedPurchasePrice,
        mrpePrice: parsedMrpePrice,
        profitPercent: parsedProfitPercent,
        bikriPercent: parsedBikriPercent,
        stock: parsedStock,
        boxQuantity: parsedBoxQuantity,
        sellingPrice: computedSellingPrice,

        // 🌟 গুরুত্বপূর্ণ ফ্ল্যাগসমূহ যা স্লাইডার ও অল মেডিসিনে পাঠায়:
        isNewProduct: isFeaturedNew,
        showInSlider: showInSlider,
        createdAt: new Date().toISOString(),
      };

      console.log("Submitting Medicine:", medicineData);

      // ১. ব্যাকএন্ড ডাটাবেজে সংরক্ষণ
      const res = await axios.post(`${API_URL}/api/medicines`, medicineData);
      const insertedMed = res.data?.insertedMedicine || {
        ...medicineData,
        _id: res.data?.insertedId || `med-${Date.now()}`,
      };

      // ২. ফ্রন্টএন্ড স্টেট থাকলে সাথে সাথে New Products Slider এবং All Medicines-এ পুশ
      if (typeof onMedicineAdded === "function") {
        onMedicineAdded(insertedMed);
      }

      // ৩. প্রিমিয়াম সুইটঅ্যালার্ট সহ রুট ন্যাভিগেশন বাটন
      await Swal.fire({
        icon: "success",
        title: "ঔষধ সফলভাবে যুক্ত হয়েছে!",
        html: `
          <div class="text-left text-xs space-y-2 text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 mt-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-slate-900">${medicineData.medicineName}</span>
              <span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">NEW ARRIVAL</span>
            </div>
            <p><b>কোম্পানি:</b> ${medicineData.company || "NovaCare Pharma"} (${medicineData.category})</p>
            <p><b>বিক্রয় মূল্য:</b> ৳${computedSellingPrice} | <b>MRP:</b> ৳${parsedMrpePrice}</p>
            <p><b>স্টক:</b> ${parsedStock} Pcs (বক্স: ${parsedBoxQuantity})</p>
            <hr class="border-slate-200 my-1" />
            <div class="text-emerald-700 font-bold flex items-start gap-1.5 pt-1">
              <span>✓</span>
              <span><strong>New Products স্লাইডার</strong> এবং <strong>All Medicines ক্যাটালগ</strong> উভয় স্থানেই রিয়েলটাইমে যুক্ত হয়েছে!</span>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: "#059669",
        cancelButtonColor: "#0f766e",
        confirmButtonText: "✨ স্লাইডারে দেখুন (New Products)",
        cancelButtonText: "💊 ক্যাটালগে দেখুন (All Medicines)",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/new-products");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          navigate("/all-medicines");
        }
      });

      // ফর্ম রিসেট
      reset({
        medicineName: "",
        genericName: "",
        company: "",
        category: "Tablet",
        dosageForm: "Tablet",
        strength: "",
        expireDate: "",
        image: "",
        description: "",
      });
      setPurchasePrice("");
      setMrpePrice("");
      setBikriPercent("");
      setProfitPercent("");
      setStock("");
      setBoxQuantity("");
    } catch (error) {
      console.error("Add Medicine Error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: error.response?.data?.message || "Medicine add করা যায়নি!",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* =========================
          TOP BANNER
      ========================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>
                Dual-Channel Auto Sync (New Products Slider &amp; Catalog)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              💊 Add New Medicine &amp; Publish to Slider
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              এখানে যেকোনো নতুন ঔষধ সেভ করলে তা স্বয়ংক্রিয়ভাবে{" "}
              <span className="text-amber-300 font-bold">
                New Product Route
              </span>
              -এ আকর্ষণীয় স্লাইডার হিসেবে প্রদর্শিত হবে এবং{" "}
              <span className="text-emerald-300 font-bold">All Medicines</span>{" "}
              ক্যাটালগেও যুক্ত হবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/new-products")}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-4 py-2.5 text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
            >
              <span>✨ স্লাইডারে যান (New Products)</span>
              <FaArrowRight size={10} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/all-medicines")}
              className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold px-4 py-2.5 text-xs transition active:scale-95 cursor-pointer"
            >
              <FaCapsules className="text-emerald-300" />
              <span>সকল ঔষধ ক্যাটালগ</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          MAIN FORM
      ========================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                1
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                মৌলিক তথ্য (Basic Medicine Information)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Medicine Name */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaCapsules className="text-emerald-600" />
                  <span>ঔষধের নাম (Medicine Name)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Napa Extra 500mg/65mg"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...register("medicineName", {
                    required: "Medicine Name is required",
                  })}
                />
                {errors.medicineName && (
                  <p className="mt-1.5 text-xs text-rose-500 font-bold">
                    {errors.medicineName.message}
                  </p>
                )}
              </div>

              {/* Generic Name */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaInfoCircle className="text-teal-600" />
                  <span>জেনেরিক নাম (Generic Name)</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Paracetamol + Caffeine"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...register("genericName")}
                />
              </div>

              {/* Company */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaBuilding className="text-emerald-600" />
                  <span>ফার্মাসিউটিক্যাল কোম্পানি (Company)</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Beximco Pharmaceuticals Ltd."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...register("company")}
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaTags className="text-emerald-600" />
                  <span>ঔষধের ক্যাটাগরি (Category)</span>
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 cursor-pointer"
                  {...register("category")}
                >
                  <option value="Tablet">Tablet (ট্যাবলেট)</option>
                  <option value="Capsule">Capsule (ক্যাপসুল)</option>
                  <option value="Syrup">Syrup (সিরাপ / সাসপেনশন)</option>
                  <option value="Injection">
                    Injection (ইনজেকশন / স্যালাইন)
                  </option>
                  <option value="Drop">Drop (আই / ইয়ার ড্রপ)</option>
                  <option value="Ointment">Ointment (মলম / ক্রিম)</option>
                  <option value="Inhaler">Inhaler / Respules</option>
                  <option value="Suppository">Suppository</option>
                </select>
              </div>

              {/* Strength */}
              <div>
                <label className="mb-2 block font-bold text-xs text-slate-700">
                  পাওয়ার বা স্ট্রেংথ (Strength / Dosage)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 500 mg বা 20 ml"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...register("strength")}
                />
              </div>

              {/* Expire Date */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaCalendarAlt className="text-rose-500" />
                  <span>মেয়াদ উত্তীর্ণের তারিখ (Expire Date)</span>
                </label>
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-all outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  {...register("expireDate")}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Stock Math */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-black">
                2
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                মূল্য ও স্টক হিসাব (Pricing, Discounts &amp; Inventory)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* MRP Price */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaMoneyBillWave className="text-teal-600" />
                  <span>এমআরপি মূল্য (MRP Price ৳)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={mrpePrice}
                  onChange={(e) =>
                    handleDecimalChange(e.target.value, setMrpePrice)
                  }
                  placeholder="যেমন: 120.00"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 placeholder:text-slate-400 placeholder:font-normal"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  উদাহরণ: 120.00 বা 55.50
                </p>
              </div>

              {/* Bikri Percentage */}
              <div>
                <label className="mb-2 font-bold text-xs text-slate-700">
                  বিক্রি ছাড় বা ডিসকাউন্ট (Bikri % Discount)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bikriPercent}
                  onChange={(e) =>
                    handleDecimalChange(e.target.value, setBikriPercent)
                  }
                  placeholder="যেমন: 12.5"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 placeholder:text-slate-400 placeholder:font-normal"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  উদাহরণ: 10% বা 12.5%
                </p>
              </div>

              {/* Purchase Price */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaMoneyBillWave className="text-emerald-600" />
                  <span>ক্রয় মূল্য (Purchase Price ৳)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={purchasePrice}
                  onChange={(e) =>
                    handleDecimalChange(e.target.value, setPurchasePrice)
                  }
                  placeholder="যেমন: 85.00"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400 placeholder:font-normal"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  কোম্পানি ইনভয়েস রেট
                </p>
              </div>

              {/* Stock */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaBoxes className="text-teal-600" />
                  <span>স্টক পরিমাণ (Stock in Pcs)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) setStock(e.target.value);
                  }}
                  placeholder="যেমন: 100"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Box Quantity */}
              <div>
                <label className="mb-2 font-bold text-xs text-slate-700">
                  বক্স সাইজ / পাতা (Box Quantity)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={boxQuantity}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value))
                      setBoxQuantity(e.target.value);
                  }}
                  placeholder="যেমন: 10"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Profit Percentage */}
              <div>
                <label className="mb-2 font-bold text-xs text-slate-700">
                  প্রত্যাশিত প্রফিট মার্জিন (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={profitPercent}
                  onChange={(e) =>
                    handleDecimalChange(e.target.value, setProfitPercent)
                  }
                  placeholder="যেমন: 23.5"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* LIVE AUTO-CALCULATED FINANCIAL CARD */}
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    নিট বিক্রয় মূল্য (Selling Price)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-700">
                      ৳ {sellingPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-600 font-bold">
                      / পিস
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    হিসাব: MRP − বিক্রি ছাড় %
                  </p>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-emerald-200/70 md:pl-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    প্রতি পিসে লাভ (Unit Profit)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-teal-800">
                      ৳ {unitProfit.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    বিক্রয় মূল্য − ক্রয় মূল্য
                  </p>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-emerald-200/70 md:pl-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    পুরো স্টকে আনুমানিক প্রফিট
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      ৳ {estimatedTotalProfit.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {stockNumber} পিস স্টক বিক্রিতে মোট প্রফিট
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Dual-Route Visibility Controls */}
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 p-6">
            <div className="flex items-center gap-2 border-b border-amber-200/60 pb-3 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950 text-xs font-black">
                ✨
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                স্লাইডার ও রাউটিং নিয়ন্ত্রণ (Slider &amp; Catalog Routing Sync)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-amber-200 cursor-pointer hover:border-amber-400 transition shadow-xs">
                <input
                  type="checkbox"
                  checked={showInSlider}
                  onChange={(e) => setShowInSlider(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    ✨ New Products স্লাইডারে প্রদর্শন করুন (Show in Carousel)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    এই অপশন অন থাকলে ঔষধটি /new-products রুটের শীর্ষ স্লাইডারে
                    এবং Featured কার্ড হিসেবে ঘুরবে।
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-amber-200 cursor-pointer hover:border-amber-400 transition shadow-xs">
                <input
                  type="checkbox"
                  checked={isFeaturedNew}
                  onChange={(e) => setIsFeaturedNew(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    🏷️ "NEW" ব্যাজ যুক্ত করুন এবং All Medicines-এ শীর্ষে রাখুন
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    অল মেডিসিন ক্যাটালগ ও স্টোরে এটি নতুন পণ্য হিসেবে হাইলাইট
                    হয়ে প্রথম সারিতে যুক্ত হবে।
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Image & Visual Presentation */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-800 text-xs font-black">
                3
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                ছবির লিংক ও লাইভ প্রিভিউ (Image &amp; Visuals)
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-3">
                <label className="flex items-center gap-2 font-bold text-xs text-slate-700">
                  <FaImage className="text-purple-600" />
                  <span>ঔষধের ছবির লিংক (Image URL)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/medicine-image.jpg"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                  {...register("image")}
                />

                {/* Quick Sample Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    ক্লিক করে স্যাম্পল ছবি বসান:
                  </span>
                  {sampleImages.map((samp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setValue("image", samp.url)}
                      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-purple-700 transition cursor-pointer"
                    >
                      {samp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Live Medicine Preview
                </span>
                <div className="h-40 w-40 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-inner">
                  <img
                    src={
                      image ||
                      "https://placehold.co/400x300?text=Medicine+Image"
                    }
                    alt="Medicine Preview"
                    className="max-h-36 max-w-36 object-contain"
                    onError={(e) => {
                      e.target.src =
                        "https://placehold.co/400x300?text=Medicine+Image";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Description */}
          <div>
            <label className="mb-2 block font-bold text-xs text-slate-700">
              ঔষধের বিবরণ ও ব্যবহারবিধি (Description / Indications)
            </label>
            <textarea
              rows={4}
              placeholder="ঔষধের কাজ, ব্যবহারের নিয়ম ও বিশেষ নির্দেশনা লিখুন..."
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              {...register("description")}
            />
          </div>

          {/* =========================
              SUBMIT BUTTON
          ========================= */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 py-4 text-base font-black text-white shadow-xl shadow-emerald-700/20 transition hover:scale-[1.01] hover:from-emerald-700 hover:to-slate-950 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaCapsules className="text-amber-300" />
              <span>
                {loading
                  ? "ঔষধ সেভ ও পাবলিশ হচ্ছে..."
                  : "💊 Add Medicine & Publish to Slider + All Medicines"}
              </span>
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              ✓ সেভ বাটনে চাপার সাথে সাথে আইটেমটি <b>New Products Slider</b> এবং{" "}
              <b>All Medicines Catalog</b> উভয় জায়গায় তাৎক্ষণিকভাবে দৃশ্যমান
              হবে।
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMedicine;
