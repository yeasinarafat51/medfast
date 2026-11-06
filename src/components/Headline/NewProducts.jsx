import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link, useNavigate } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaShoppingBag,
  FaCapsules,
  FaBoxes,
  FaSearch,
  FaTimes,
  FaCheck,
  FaEye,
  FaBuilding,
  FaHeart,
  FaRegHeart,
  FaFire,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

// অফলাইন বা প্রাথমিক ফলব্যাক ডাটা
const FALLBACK_MEDICINES = [
  {
    _id: "med-new-1",
    medicineName: "Azithromax 500mg Tablet",
    genericName: "Azithromycin Dihydrate",
    company: "Square Pharmaceuticals",
    category: "Antibiotic & Infectious",
    sellingPrice: 35.0,
    mrpePrice: 40.0,
    stock: 120,
    dosageForm: "Tablet",
    strength: "500mg",
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
    description:
      "High potency broad-spectrum macrolide antibiotic with authentic batch traceability and DGDA compliance.",
    isNewProduct: true,
  },
  {
    _id: "med-new-2",
    medicineName: "Sergel 20mg Capsule",
    genericName: "Esomeprazole Magnesium Trihydrate",
    company: "Healthcare Pharmaceuticals",
    category: "Gastric & Acidity",
    sellingPrice: 8.5,
    mrpePrice: 10.0,
    stock: 95,
    dosageForm: "Capsule",
    strength: "20mg",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60",
    description:
      "Next-generation proton pump inhibitor offering 24-hour acid control and gastric protection.",
    isNewProduct: true,
  },
  {
    _id: "med-new-3",
    medicineName: "Napa Extra Tablet",
    genericName: "Paracetamol 500mg + Caffeine 65mg",
    company: "Beximco Pharmaceuticals",
    category: "Pain & Fever",
    sellingPrice: 2.75,
    mrpePrice: 3.2,
    stock: 250,
    dosageForm: "Tablet",
    strength: "565mg",
    image:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60",
    description:
      "Dual-action rapid relief formula for severe headache, muscle pain, and acute fever symptoms.",
    isNewProduct: true,
  },
  {
    _id: "med-new-4",
    medicineName: "Monas 10mg Chewable",
    genericName: "Montelukast Sodium",
    company: "Acme Laboratories Ltd.",
    category: "Respiratory & Cough",
    sellingPrice: 16.0,
    mrpePrice: 18.5,
    stock: 75,
    dosageForm: "Tablet",
    strength: "10mg",
    image:
      "https://images.unsplash.com/photo-1579165466791-788226ab77b4?w=500&auto=format&fit=crop&q=60",
    description:
      "Effective leukotriene receptor antagonist for chronic asthma control and seasonal allergic rhinitis.",
    isNewProduct: true,
  },
];

function NewProducts({ medicines: propMedicines, onAddToCart }) {
  const navigate = useNavigate();

  // ব্যাকএন্ড অথবা প্রপ্স থেকে ঔষধ লোড
  const [medicines, setMedicines] = useState(
    propMedicines && propMedicines.length > 0
      ? propMedicines
      : FALLBACK_MEDICINES,
  );
  const [loading, setLoading] = useState(false);

  // স্লাইডার ও ইন্টারঅ্যাকশন স্টেট
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [wishlist, setWishlist] = useState({});

  // কার্ড স্ক্রোল রেফারেন্স
  const scrollContainerRef = useRef(null);

  // কুইক অ্যাড মডাল স্টেট
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // নতুন ঔষধ ফর্ম স্টেট
  const [formData, setFormData] = useState({
    medicineName: "",
    genericName: "",
    company: "Square",
    category: "Antibiotic & Infectious",
    sellingPrice: "",
    mrpePrice: "",
    stock: "50",
    dosageForm: "Tablet",
    strength: "500mg",
    description: "",
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
  });

  const categories = [
    "All",
    "Antibiotic & Infectious",
    "Gastric & Acidity",
    "Pain & Fever",
    "Cardiovascular & Pressure",
    "Diabetes & Metabolic",
    "Vitamins & Minerals",
    "Respiratory & Cough",
  ];

  // API থেকে লাইভ ডাটা লোড (যদি প্যারেন্ট থেকে ডাটা না আসে)
  useEffect(() => {
    if (!propMedicines || propMedicines.length === 0) {
      setLoading(true);
      axios
        .get(`${API_URL}/api/medicines`, { timeout: 7000 })
        .then((res) => {
          let list = [];
          if (Array.isArray(res.data?.medicines)) list = res.data.medicines;
          else if (Array.isArray(res.data)) list = res.data;

          if (list.length > 0) {
            setMedicines(list);
          }
        })
        .catch((err) => {
          console.warn("Using offline fallback medicines:", err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [propMedicines]);

  // নতুন প্রোডাক্ট ফিল্টার ও শর্টিং (নতুন যুক্ত আইটেম স্লাইডারে ১ নম্বরে থাকবে)
  const newProductsList = useMemo(() => {
    return [...medicines].sort((a, b) => {
      const aNew = a.isNewProduct ? 1 : 0;
      const bNew = b.isNewProduct ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [medicines]);

  // সার্চ ও ক্যাটাগরি ফিল্টার
  const filteredProducts = useMemo(() => {
    return newProductsList.filter((m) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        m.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genericName &&
          m.genericName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.company.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategory === "All" ||
        (m.category &&
          m.category.toLowerCase().includes(selectedCategory.toLowerCase()));

      return matchSearch && matchCat;
    });
  }, [newProductsList, searchQuery, selectedCategory]);

  // ৪.৫ সেকেন্ড পর পর স্বয়ংক্রিয় স্লাইড ও লাইভ প্রগ্রেস বার
  useEffect(() => {
    if (isAutoPlayPaused || filteredProducts.length <= 1) return;

    setSliderProgress(0);
    const progressInterval = setInterval(() => {
      setSliderProgress((prev) => (prev >= 100 ? 0 : prev + 2.5));
    }, 112); // ~4.5 সেকেন্ডে ১০০%

    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % filteredProducts.length);
      setSliderProgress(0);
    }, 4500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(slideInterval);
    };
  }, [isAutoPlayPaused, filteredProducts.length, currentSlide]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? filteredProducts.length - 1 : prev - 1,
    );
    setSliderProgress(0);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % filteredProducts.length);
    setSliderProgress(0);
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  const toggleWishlist = (id) => {
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddToCart = (item) => {
    if (typeof onAddToCart === "function") {
      onAddToCart(item);
    }
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${item.medicineName} কার্টে যোগ হয়েছে!`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // মডাল থেকে সরাসরি নতুন ওষুধ অ্যাড
  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!formData.medicineName.trim()) {
      Swal.fire({ icon: "warning", title: "ঔষধের নাম প্রদান করুন" });
      return;
    }

    const sellingPrice = Number(formData.sellingPrice) || 10;
    const mrpePrice = Number(formData.mrpePrice) || sellingPrice * 1.15;
    const stock = Number(formData.stock) || 30;

    const newMed = {
      _id: `med-${Date.now()}`,
      medicineName: formData.medicineName.trim(),
      genericName:
        formData.genericName.trim() || "Certified DGDA Generic Formulation",
      company: formData.company.trim(),
      category: formData.category,
      sellingPrice,
      mrpePrice,
      stock,
      image:
        formData.image ||
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
      dosageForm: formData.dosageForm,
      strength: formData.strength,
      description:
        formData.description ||
        "Fresh batch verified pharmaceutical product with DGDA compliance.",
      isNewProduct: true,
      showInSlider: true,
      createdAt: new Date().toISOString(),
    };

    setIsSubmitting(true);

    try {
      try {
        await axios.post(`${API_URL}/api/medicines`, newMed, { timeout: 8000 });
      } catch (err) {
        console.warn("Backend offline or local only:", err.message);
      }

      // স্লাইডারে সবার শুরুতে যুক্ত করা
      setMedicines((prev) => [newMed, ...prev]);

      Swal.fire({
        icon: "success",
        title: "নতুন ঔষধ যুক্ত হয়েছে!",
        text: "এটি এখন স্লাইডারের ১ম স্থানে ঘুরছে এবং অল মেডিসিনেও রয়েছে।",
        timer: 2000,
        showConfirmButton: false,
      });

      // রিসেট ও মডাল ক্লোজ
      setFormData({
        medicineName: "",
        genericName: "",
        company: "Square",
        category: "Antibiotic & Infectious",
        sellingPrice: "",
        mrpePrice: "",
        stock: "50",
        dosageForm: "Tablet",
        strength: "500mg",
        description: "",
        image:
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
      });
      setIsAddModalOpen(false);
      setCurrentSlide(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const featuredItem = filteredProducts[currentSlide] || filteredProducts[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* =========================================================
          ১. টপ ব্যানার ও কুইক অ্যাকশন হেডার
      ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>New Arrivals &amp; Fresh Inbound Batches</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              নতুন প্রোডাক্টস ও ফ্রেশ ব্যাচ শোকেস
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              এখানে নতুন যুক্ত হওয়া সকল ওষুধ ইন্টারঅ্যাক্টিভ স্লাইডার আকারে দেখা
              যাবে এবং একই সাথে অল মেডিসিন ক্যাটালগেও স্বয়ংক্রিয়ভাবে থাকবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Add Medicine Page Link */}
            <button
              type="button"
              onClick={() => navigate("/add-medicine")}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-4 py-2.5 text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
            >
              <FaPlus />
              <span>+ ঔষধ যোগ ফর্ম (Add Medicine)</span>
            </button>

            {/* Quick Modal Popup */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold px-3.5 py-2.5 text-xs transition active:scale-95 cursor-pointer"
            >
              <span>কুইক পপআপ</span>
            </button>

            {/* All Medicines Link */}
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

      {/* =========================================================
          ২. আল্ট্রা-প্রিমিয়াম হিরো স্লাইডার (Hero Carousel)
      ========================================================= */}
      {filteredProducts.length > 0 && (
        <div
          className="relative rounded-3xl bg-white border border-slate-200/90 shadow-xl overflow-hidden transition-all duration-300"
          onMouseEnter={() => setIsAutoPlayPaused(true)}
          onMouseLeave={() => setIsAutoPlayPaused(false)}
        >
          {/* অটো-প্লে লাইভ প্রগ্রেস বার */}
          <div className="h-1 w-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 transition-all duration-150 ease-linear"
              style={{ width: `${sliderProgress}%` }}
            />
          </div>

          {/* স্লাইডার হেডার */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="uppercase tracking-wider text-[11px] font-black text-slate-900">
                Featured New Arrival
              </span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                Item {currentSlide + 1} of {filteredProducts.length}
              </span>
            </div>

            {/* স্লাইড নেভিগেশন বাটন */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
                title="Previous Slide"
              >
                <FaChevronLeft size={11} />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
                title="Next Slide"
              >
                <FaChevronRight size={11} />
              </button>
            </div>
          </div>

          {/* স্লাইড বডি */}
          {featuredItem && (
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* বাম পাশের ইমেজ বক্স */}
              <div className="md:col-span-5 relative flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 rounded-3xl p-6 border border-slate-100 min-h-[280px]">
                <span className="absolute top-4 left-4 z-10 rounded-full bg-emerald-600 text-white px-3 py-1 text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
                  <span>✨ NEW</span>
                </span>

                <button
                  type="button"
                  onClick={() => toggleWishlist(featuredItem._id)}
                  className="absolute top-4 right-4 z-10 rounded-full p-2.5 bg-white/90 text-rose-500 shadow-sm hover:scale-110 transition cursor-pointer"
                >
                  {wishlist[featuredItem._id] ? <FaHeart /> : <FaRegHeart />}
                </button>

                <img
                  src={
                    featuredItem.image ||
                    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
                  }
                  alt={featuredItem.medicineName}
                  className="h-56 sm:h-64 object-contain transition-transform duration-500 hover:scale-105 drop-shadow-md"
                  onError={(e) => {
                    e.target.src =
                      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60";
                  }}
                />
              </div>

              {/* ডান পাশের ঔষধের বিস্তারিত ও কার্ট অ্যাকশন */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-0.5 text-xs font-bold">
                    {featuredItem.company}
                  </span>
                  {featuredItem.dosageForm && (
                    <span className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">
                      {featuredItem.dosageForm} {featuredItem.strength}
                    </span>
                  )}
                  {featuredItem.category && (
                    <span className="rounded-lg bg-purple-50 text-purple-700 px-2.5 py-0.5 text-xs font-medium">
                      {featuredItem.category}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {featuredItem.medicineName}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    Generic:{" "}
                    <span className="text-slate-800 font-semibold">
                      {featuredItem.genericName}
                    </span>
                  </p>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {featuredItem.description ||
                    "Freshly stocked verified pharmaceutical product with authentic batch traceability and DGDA compliance."}
                </p>

                {/* মূল্য ও স্টক ইনফো */}
                <div className="flex flex-wrap items-baseline gap-4 pt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Selling Price
                    </span>
                    <span className="text-3xl font-black text-emerald-700">
                      ৳ {Number(featuredItem.sellingPrice || 0).toFixed(2)}
                    </span>
                  </div>

                  {Number(featuredItem.mrpePrice) >
                    Number(featuredItem.sellingPrice) && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        MRP Price
                      </span>
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        ৳ {Number(featuredItem.mrpePrice).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="ml-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block text-right">
                      Available Stock
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold text-xs ${
                        Number(featuredItem.stock) > 10
                          ? "text-emerald-700"
                          : "text-amber-600"
                      }`}
                    >
                      <FaBoxes className="text-[10px]" />
                      <span>{featuredItem.stock} pcs in stock</span>
                    </span>
                  </div>
                </div>

                {/* কার্ট অ্যাকশন বাটন */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(featuredItem)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
                  >
                    <FaShoppingBag />
                    <span>কার্টে যোগ করুন (Add to Cart)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/all-medicines")}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-4 py-3 text-xs transition cursor-pointer"
                  >
                    <FaEye />
                    <span>ক্যাটালগে দেখুন</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ডটস ইন্ডিকেটর স্ট্রিপ */}
          <div className="flex items-center justify-center gap-1.5 pb-4 pt-1 bg-slate-50/40">
            {filteredProducts.slice(0, 10).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setCurrentSlide(i);
                  setSliderProgress(0);
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === i
                    ? "w-8 bg-emerald-600"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                title={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          ৩. ক্যাটাগরি ফিল্টার পিলস (Category Filter Chips)
      ========================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
              selectedCategory === cat
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {cat === "All" ? "⚡ সকল নতুন পণ্য (All)" : cat}
          </button>
        ))}
      </div>

      {/* =========================================================
          ৪. ফাস্ট স্ক্রোল স্লাইডার শোকেস (Multi-Card Horizontal Carousel)
      ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
              ✨ ফাস্ট স্ক্রোল স্লাইডার শোকেস (Fast Carousel Strip)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScrollLeft}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
              title="Scroll Left"
            >
              <FaChevronLeft size={11} />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
              title="Scroll Right"
            >
              <FaChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* কার্ড স্ক্রোল ট্র্যাক */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth scrollbar-thin scrollbar-thumb-emerald-200"
        >
          {filteredProducts.map((med, idx) => (
            <div
              key={`strip-${med._id || idx}`}
              className="w-64 shrink-0 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative mb-2 h-32 w-full flex items-center justify-center rounded-xl bg-slate-50 p-2">
                  <span className="absolute top-1.5 left-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-2xs">
                    NEW
                  </span>
                  <img
                    src={
                      med.image ||
                      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
                    }
                    alt={med.medicineName}
                    className="max-h-28 object-contain"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60";
                    }}
                  />
                </div>

                <span className="text-[10px] font-bold text-teal-700 block truncate uppercase">
                  {med.company}
                </span>
                <h4 className="text-xs font-black text-slate-900 truncate mt-0.5">
                  {med.medicineName}
                </h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                  {med.genericName}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-700">
                    ৳ {Number(med.sellingPrice || 0).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddToCart(med)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold transition shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <FaShoppingBag size={9} />
                  <span>কার্ট</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          ৫. নতুন পণ্যের গ্রিড ক্যাটালগ (All New Products Grid)
      ========================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FaCapsules className="text-emerald-600" />
              <span>
                নতুন পণ্যের সম্পূর্ণ ক্যাটালগ ({filteredProducts.length} টি)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              যেকোনো ঔষধ সরাসরি অর্ডার করতে ক্লিক করুন অথবা কার্টে যুক্ত করুন
            </p>
          </div>

          {/* সার্চ ফিল্টার */}
          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="নতুন ঔষধ খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* কার্ড গ্রিড */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((med, index) => (
            <div
              key={med._id || index}
              className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative">
                {/* NEW ব্যাজ */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[9px] font-black uppercase shadow-xs">
                    NEW
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleWishlist(med._id)}
                  className="absolute top-2 right-2 z-10 rounded-full p-2 bg-white/80 text-rose-500 shadow-2xs hover:scale-110 transition cursor-pointer"
                >
                  {wishlist[med._id] ? (
                    <FaHeart size={12} />
                  ) : (
                    <FaRegHeart size={12} />
                  )}
                </button>

                {/* ইমেজ বক্স */}
                <div className="h-44 flex items-center justify-center p-3 bg-slate-50 rounded-2xl mb-3 overflow-hidden">
                  <img
                    src={
                      med.image ||
                      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
                    }
                    alt={med.medicineName}
                    className="max-h-36 object-contain group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60";
                    }}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-800 uppercase mb-1">
                  <span>{med.company}</span>
                  {med.dosageForm && <span>• {med.dosageForm}</span>}
                </div>

                <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                  {med.medicineName}
                </h4>

                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                  {med.genericName}
                </p>
              </div>

              {/* প্রাইস ও কার্ট বাটন */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                    মূল্য
                  </span>
                  <span className="text-base font-black text-slate-900">
                    ৳ {Number(med.sellingPrice || 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToCart(med)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
                >
                  <FaShoppingBag size={11} />
                  <span>কার্ট</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          ৬. কুইক অ্যাড মডাল (Quick Add Medicine Popup)
      ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Quick Product Entry
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  নতুন ঔষধ যুক্ত করুন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={handleCreateProduct}
              className="mt-5 space-y-4 text-xs font-medium"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঔষধের নাম (Medicine Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: Azithromax 500mg"
                  value={formData.medicineName}
                  onChange={(e) =>
                    setFormData({ ...formData, medicineName: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জেনেরিক নাম (Generic Name)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: Azithromycin Dihydrate"
                  value={formData.genericName}
                  onChange={(e) =>
                    setFormData({ ...formData, genericName: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কোম্পানি:
                  </label>
                  <select
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Square">Square Pharmaceuticals</option>
                    <option value="Beximco">Beximco Pharmaceuticals</option>
                    <option value="Incepta">Incepta Pharmaceuticals</option>
                    <option value="Opsonin">Opsonin Pharma</option>
                    <option value="SKF">Eskayef (SKF)</option>
                    <option value="Radiant">Radiant Pharmaceuticals</option>
                    <option value="Aristopharma">Aristopharma</option>
                    <option value="Popular">Popular Pharmaceuticals</option>
                    <option value="Ibnsina">Ibn-Sina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ক্যাটাগরি:
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Antibiotic & Infectious">
                      Antibiotic &amp; Infectious
                    </option>
                    <option value="Gastric & Acidity">
                      Gastric &amp; Acidity
                    </option>
                    <option value="Pain & Fever">Pain &amp; Fever</option>
                    <option value="Cardiovascular & Pressure">
                      Cardiovascular &amp; Pressure
                    </option>
                    <option value="Diabetes & Metabolic">
                      Diabetes &amp; Metabolic
                    </option>
                    <option value="Vitamins & Minerals">
                      Vitamins &amp; Minerals
                    </option>
                    <option value="Respiratory & Cough">
                      Respiratory &amp; Cough
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বিক্রয় মূল্য (৳):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="35.00"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-emerald-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    এমআরপি (৳):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="40.00"
                    value={formData.mrpePrice}
                    onChange={(e) =>
                      setFormData({ ...formData, mrpePrice: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    স্টক (Pcs):
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900 text-[11px] leading-relaxed">
                <b>ডুয়াল-রাউট সিঙ্ক:</b> সেভ করার সাথে সাথে আইটেমটি এই
                স্লাইডারের প্রথম স্থানে যোগ হবে এবং অল মেডিসিন ক্যাটালগেও
                দৃশ্যমান হবে।
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FaCheck />
                  <span>
                    {isSubmitting ? "সেভ হচ্ছে..." : "সেভ ও পাবলিশ করুন"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewProducts;
