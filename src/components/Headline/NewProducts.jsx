import React, { useRef, useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaMinus,
  FaHeart,
  FaRegHeart,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import useCart from "../../hooks/useCart";
import medisin from "../../imges/medpharm_pharmacy.jpg";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

// Fallback in-stock medicines when offline
const INITIAL_FALLBACK = [
  {
    _id: "med-new-1",
    medicineName: "Azithromax 500mg Tablet",
    genericName: "Azithromycin Dihydrate",
    company: "Square Pharmaceuticals Ltd.",
    category: "Antibiotic",
    sellingPrice: 35.0,
    mrpePrice: 40.0,
    bikriPercent: 12.5,
    stock: 120,
    dosageForm: "Tablet",
    strength: "500mg",
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60",
    isNewProduct: true,
  },
  {
    _id: "med-new-2",
    medicineName: "Sergel 20mg Capsule",
    genericName: "Esomeprazole Magnesium Trihydrate",
    company: "Healthcare Pharmaceuticals",
    category: "Capsule",
    sellingPrice: 8.5,
    mrpePrice: 10.0,
    bikriPercent: 15.0,
    stock: 95,
    dosageForm: "Capsule",
    strength: "20mg",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=60",
    isNewProduct: true,
  },
  {
    _id: "med-new-3",
    medicineName: "Napa Extra Tablet",
    genericName: "Paracetamol + Caffeine",
    company: "Beximco Pharmaceuticals Ltd.",
    category: "Tablet",
    sellingPrice: 2.75,
    mrpePrice: 3.2,
    bikriPercent: 14.0,
    stock: 250,
    dosageForm: "Tablet",
    strength: "565mg",
    image:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60",
    isNewProduct: true,
  },
  {
    _id: "med-new-4",
    medicineName: "Monas 10mg Chewable",
    genericName: "Montelukast Sodium",
    company: "Acme Laboratories Ltd.",
    category: "Tablet",
    sellingPrice: 16.0,
    mrpePrice: 18.5,
    bikriPercent: 13.5,
    stock: 75,
    dosageForm: "Tablet",
    strength: "10mg",
    image:
      "https://images.unsplash.com/photo-1579165466791-788226ab77b4?w=500&auto=format&fit=crop&q=60",
    isNewProduct: true,
  },
];

export function NewProducts({
  medicines: propMedicines,
  onAddToCart: propAddToCart,
  onProductClick,
}) {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const sliderRef = useRef(null);

  const [internalMedicines, setInternalMedicines] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [wishlist, setWishlist] = useState({});

  // 1. Fetch from backend API
  useEffect(() => {
    if (!propMedicines || propMedicines.length === 0) {
      axios
        .get(`${API_URL}/api/medicines`, { timeout: 7000 })
        .then((res) => {
          let list = [];
          if (Array.isArray(res.data?.medicines)) list = res.data.medicines;
          else if (Array.isArray(res.data)) list = res.data;

          if (list.length > 0) {
            setInternalMedicines(list);
          }
        })
        .catch((err) => {
          console.warn("Using offline fallback:", err.message);
        });
    }
  }, [propMedicines]);

  // 2. Synchronize cart state with button quantities (card1 & card2)
  useEffect(() => {
    if (Array.isArray(cart) && cart.length > 0) {
      const qMap = {};
      cart.forEach((item) => {
        if (item?._id) {
          qMap[item._id] = item.quantity || 1;
        }
      });
      setCartQuantities((prev) => ({ ...prev, ...qMap }));
    } else if (Array.isArray(cart) && cart.length === 0) {
      setCartQuantities({});
    }
  }, [cart]);

  // 3. Instant auto-sync when a new medicine is added
  useEffect(() => {
    const handleCustomMedicineAdd = (event) => {
      const newMed = event.detail;
      if (newMed && newMed._id) {
        setInternalMedicines((prev) => [
          newMed,
          ...prev.filter((m) => m._id !== newMed._id),
        ]);
        if (sliderRef.current) {
          sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }
      }
    };

    window.addEventListener("novacare_medicine_added", handleCustomMedicineAdd);
    return () => {
      window.removeEventListener(
        "novacare_medicine_added",
        handleCustomMedicineAdd,
      );
    };
  }, []);

  const sourceList =
    propMedicines && propMedicines.length > 0
      ? propMedicines
      : internalMedicines.length > 0
        ? internalMedicines
        : INITIAL_FALLBACK;

  // 4. Filter out stock out products (stock <= 0) and sort with newest on top
  const newProducts = useMemo(() => {
    const inStockList = sourceList.filter((med) => {
      const stock = Number(med.stock);
      return !isNaN(stock) && stock > 0;
    });

    const list = [...inStockList].sort((a, b) => {
      const aNew = a.isNewProduct ? 1 : 0;
      const bNew = b.isNewProduct ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;

      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return list.slice(0, 16);
  }, [sourceList]);

  // Scroll to index 0 on new item
  const firstItemId = newProducts[0]?._id;
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [firstItemId]);

  // Auto-play horizontal scroll (pauses on hover and touch)
  useEffect(() => {
    if (isPaused || newProducts.length <= 3) return;

    const interval = setInterval(() => {
      if (sliderRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          sliderRef.current.scrollBy({ left: 260, behavior: "smooth" });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, newProducts.length]);

  const handleScrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -280, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 280, behavior: "smooth" });
    }
  };

  const toggleWishlist = (id, e) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCartQuantity = (medicineId) => {
    return cartQuantities[medicineId] || 0;
  };

  // =====================================================
  // ⚡ ACTION LOGIC (card1 vs card2)
  // =====================================================
  const handleAddToCart = (medicine, e) => {
    e.stopPropagation();

    const stock = Number(medicine.stock) || 0;
    if (stock <= 0) {
      Swal.fire({
        icon: "error",
        title: "Out of Stock",
        text: "This medicine is currently out of stock.",
      });
      return;
    }

    setCartQuantities((prev) => ({
      ...prev,
      [medicine._id]: 1,
    }));

    if (propAddToCart) {
      propAddToCart(medicine);
    } else if (typeof addToCart === "function") {
      addToCart({
        ...medicine,
        quantity: 1,
      });
    }

    Swal.fire({
      icon: "success",
      title: "Added To Cart",
      text: `${medicine.medicineName || "Medicine"} added to cart.`,
      timer: 800,
      showConfirmButton: false,
    });
  };

  const handleIncrease = (medicine, e) => {
    e.stopPropagation();
    const stock = Number(medicine.stock) || 0;
    const currentQty = cartQuantities[medicine._id] || 1;

    if (stock > 0 && currentQty >= stock) {
      Swal.fire({
        icon: "warning",
        title: "Max Stock Reached",
        text: `Only ${stock} items available in stock.`,
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    const newQty = currentQty + 1;
    setCartQuantities((prev) => ({
      ...prev,
      [medicine._id]: newQty,
    }));

    if (typeof updateQuantity === "function") {
      updateQuantity(medicine._id, newQty);
    } else if (typeof addToCart === "function") {
      addToCart({
        ...medicine,
        quantity: 1,
      });
    }
  };

  const handleDecrease = (medicine, e) => {
    e.stopPropagation();
    const currentQty = cartQuantities[medicine._id] || 1;

    if (currentQty > 1) {
      const newQty = currentQty - 1;
      setCartQuantities((prev) => ({
        ...prev,
        [medicine._id]: newQty,
      }));

      if (typeof updateQuantity === "function") {
        updateQuantity(medicine._id, newQty);
      }
    } else {
      setCartQuantities((prev) => {
        const next = { ...prev };
        delete next[medicine._id];
        return next;
      });

      if (typeof removeFromCart === "function") {
        removeFromCart(medicine._id);
      }

      Swal.fire({
        icon: "info",
        title: "Removed from Cart",
        text: `${medicine.medicineName || "Item"} removed from cart.`,
        timer: 800,
        showConfirmButton: false,
      });
    }
  };

  if (newProducts.length === 0) return null;

  return (
    <div className="mb-6 rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-emerald-50/70 p-4 sm:p-5 shadow-sm">
      {/* 1. Header Section */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00897b] to-emerald-600 text-white shadow-md shadow-teal-700/20">
            <span className="text-base">✨</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                New Arrivals (Fresh Batches)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#00897b] px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                <span>1-Row Live Carousel</span>
              </span>
              <span className="rounded-md bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {newProducts.length} Items
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time automated sync with recently added medicines
            </p>
          </div>
        </div>

        {/* Right Navigation: Scroll arrows only (Add Medicine button removed) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
            title="Previous"
          >
            <FaChevronLeft size={11} />
          </button>
          <button
            type="button"
            onClick={handleScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
            title="Next"
          >
            <FaChevronRight size={11} />
          </button>
        </div>
      </div>

      {/* 2. Strict 1-Row Horizontal Slider Track (Ultra-Smooth for Mobile) */}
      <div
        ref={sliderRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth select-none [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {newProducts.map((med, idx) => {
          const sellingPrice = Number(med.sellingPrice || 0);
          const mrpPrice = Number(med.mrpePrice || 0);
          const hasDiscount = mrpPrice > sellingPrice && mrpPrice > 0;
          const discountPercent =
            Number(med.bikriPercent) ||
            (hasDiscount
              ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100)
              : 0);
          const isWish = !!wishlist[med._id];
          const currentQty = getCartQuantity(med._id);
          const stock = Number(med.stock) || 0;

          return (
            <div
              key={med._id || `slider-${idx}`}
              onClick={() => onProductClick?.(med)}
              className="group relative w-48 sm:w-60 md:w-64 shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-teal-300 flex flex-col justify-between cursor-pointer active:scale-[0.99]"
              style={{ scrollSnapAlign: "start" }}
            >
              <div>
                {/* Product Image & Badges (Matches AllItemMedicine exactly with medisin fallback) */}
                <div className="relative overflow-hidden bg-slate-50 flex items-center justify-center">
                  <img
                    src={med.image || medisin}
                    alt={med.medicineName || "Medicine"}
                    className="h-36 sm:h-44 md:h-48 w-full object-contain p-2 sm:p-3 transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = medisin;
                    }}
                  />

                  {/* Top-left: Company & NEW Badge */}
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-[#00897b] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs uppercase tracking-wider truncate max-w-[110px]">
                      {med.company || "Medicine"}
                    </span>
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                      ✨ NEW
                    </span>
                  </div>

                  {/* Top-right: Discount & Wishlist */}
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                    {discountPercent > 0 && (
                      <span className="rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                        {discountPercent}% OFF
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(med._id, e)}
                      className="rounded-full bg-white/90 p-1.5 text-slate-400 hover:text-red-500 shadow-2xs backdrop-blur-xs transition cursor-pointer"
                      title="Wishlist"
                    >
                      {isWish ? (
                        <FaHeart className="text-red-500 text-xs" />
                      ) : (
                        <FaRegHeart className="text-slate-400 text-xs" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Section (No Stock, No Box) */}
                <div className="p-3 sm:p-3.5 pb-2">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 mb-1">
                    <span className="truncate max-w-[130px] sm:max-w-[150px]">
                      {med.genericName || "Certified Formulation"}
                    </span>
                    {med.dosageForm && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold text-slate-600 shrink-0">
                        {med.dosageForm} {med.strength || ""}
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-1 text-xs sm:text-sm font-black text-slate-800 group-hover:text-[#00897b] transition">
                    {med.medicineName || "Unknown Medicine"}
                  </h3>

                  {/* Price Box */}
                  <div className="mt-2 rounded-xl bg-slate-50 p-2 sm:p-2.5 border border-slate-100">
                    {hasDiscount ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                          MRP
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 line-through">
                          ৳ {mrpPrice.toFixed(2)}
                        </span>
                      </div>
                    ) : null}
                    <div
                      className={`flex items-center justify-between ${
                        hasDiscount
                          ? "mt-1 border-t border-slate-200/60 pt-1"
                          : ""
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-bold text-slate-700">
                        Price
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#00897b]">
                        ৳ {sellingPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action: Add to Cart or Stepper */}
              <div className="p-3 sm:p-3.5 pt-1 w-full">
                {currentQty === 0 ? (
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(med, e)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00897b] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#00796b] active:scale-95 cursor-pointer"
                  >
                    <FaPlus className="text-[10px]" />
                    <span>Add to Cart</span>
                  </button>
                ) : (
                  <div className="flex h-8 w-full items-center justify-between rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={(e) => handleDecrease(med, e)}
                      className="flex h-full w-8 items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition font-bold cursor-pointer"
                      title="Decrease"
                    >
                      <FaMinus className="text-[9px]" />
                    </button>

                    <span className="flex-1 text-center font-sans text-xs font-black text-slate-800">
                      {currentQty}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleIncrease(med, e)}
                      disabled={stock > 0 && currentQty >= stock}
                      className="flex h-full w-8 items-center justify-center bg-[#00897b] text-white hover:bg-[#00796b] active:scale-90 transition disabled:opacity-50 cursor-pointer"
                      title="Increase"
                    >
                      <FaPlus className="text-[9px]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NewProducts;
