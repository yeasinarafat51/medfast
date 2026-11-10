import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
// frontpage
import {
  FaMinus,
  FaPlus,
  FaSearch,
  FaCapsules,
  FaBuilding,
  FaChevronDown,
  FaRegHeart,
  FaHeart,
} from "react-icons/fa";

import useAuth from "../../../hooks/useAuth";
import useCart from "../../../hooks/useCart";
import medisin from "../../../imges/medpharm_pharmacy.jpg";

function AllItemMedicine() {
  const { user } = useAuth();
  const { addToCart, cart, updateQuantity, removeFromCart } = useCart();

  // =====================================================
  // API URL
  // =====================================================
  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
  ).trim();

  // =====================================================
  // STATES
  // =====================================================
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");

  // ⚡ প্রতিটি প্রোডাক্টের কার্ট কোয়ান্টিটি ট্র্যাক করার স্টেট (card1 & card2)
  const [cartQuantities, setCartQuantities] = useState({});
  const [wishlist, setWishlist] = useState({});

  // প্রথমে ১২টি প্রোডাক্ট দেখানোর লিমিট
  const [visibleLimit, setVisibleLimit] = useState(12);
  const cancelSourceRef = useRef(null);

  // =====================================================
  // COMPANIES
  // =====================================================
  const companies = [
    { name: "All Medicines", value: "" },
    { name: "Square", value: "Square" },
    { name: "Unimed Unihealth", value: "Unimed Unihealth" },
    { name: "Aci", value: "Aci" },
    { name: "Opsonin", value: "Opsonin" },
    { name: "SKF", value: "SKF" },
    { name: "Radiant", value: "Radiant" },
    { name: "Aristopharma", value: "Aristopharma" },
    { name: "Popular", value: "Popular" },
    { name: "Ibn-Sina", value: "Ibnsina" },
  ];

  // =====================================================
  // LOAD MEDICINES
  // =====================================================
  const loadMedicine = async (
    searchValue = "",
    companyValue = selectedCompany,
    isFirstLoad = false,
  ) => {
    if (cancelSourceRef.current) {
      cancelSourceRef.current.cancel();
    }

    const source = axios.CancelToken.source();
    cancelSourceRef.current = source;

    try {
      if (isFirstLoad) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }

      const res = await axios.get(`${API_URL}/api/medicines`, {
        params: {
          search: searchValue.trim(),
          company: companyValue,
          sort: "asc",
        },
        timeout: 30000,
        cancelToken: source.token,
      });

      let medicineData = [];
      if (Array.isArray(res.data?.medicines)) {
        medicineData = res.data.medicines;
      } else if (Array.isArray(res.data)) {
        medicineData = res.data;
      }

      setMedicines(medicineData);
      setVisibleLimit(12);
    } catch (error) {
      if (axios.isCancel(error)) return;

      console.error("Medicine Load Error:", error);
      setMedicines([]);

      Swal.fire({
        icon: "error",
        title: "Failed to Load Medicines",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load medicines.",
      });
    } finally {
      if (isFirstLoad) {
        setLoading(false);
      }
      setSearchLoading(false);
    }
  };

  // =====================================================
  // SYNC CART QUANTITIES (যদি useCart-এ cart array থাকে)
  // =====================================================
  useEffect(() => {
    if (Array.isArray(cart) && cart.length > 0) {
      const qMap = {};
      cart.forEach((item) => {
        if (item?._id) {
          qMap[item._id] = item.quantity || 1;
        }
      });
      setCartQuantities((prev) => ({ ...prev, ...qMap }));
    }
  }, [cart]);

  // =====================================================
  // INITIAL LOAD & DEBOUNCE SEARCH
  // =====================================================
  useEffect(() => {
    loadMedicine("", "", true);

    return () => {
      if (cancelSourceRef.current) {
        cancelSourceRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicine(search, selectedCompany, false);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // =====================================================
  // FILTERS & WISHLIST
  // =====================================================
  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
    setSearch("");
    loadMedicine("", company, false);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const toggleWishlist = (medicineId) => {
    setWishlist((prev) => ({
      ...prev,
      [medicineId]: !prev[medicineId],
    }));
  };

  const getCartQuantity = (medicine) => {
    return cartQuantities[medicine._id] || 0;
  };

  // =====================================================
  // ⚡ কোয়ান্টিটি বাড়ানো ও কমানোর হ্যান্ডলারসমূহ (card1 & card2)
  // =====================================================
  // ১. Add to Cart চাপলে কোয়ান্টিটি ১ হবে এবং [- 1 +] দৃশ্যমান হবে
  const handleAddToCart = (medicine) => {
    if (!user) {
      Swal.fire({
        icon: "warning",
        title: "Please Login First",
        text: "You need to login before adding medicine to cart.",
        confirmButtonText: "Login",
      });
      return;
    }

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

    if (typeof addToCart === "function") {
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

  // ২. [+] চাপলে কোয়ান্টিটি বাড়বে
  const handleIncrease = (medicine, e) => {
    e?.stopPropagation?.();
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

  // ৩. [-] চাপলে কমবে; ১ থেকে মাইনাস করলে আবার 'Add to Cart' বাটনে ব্যাক করবে
  const handleDecrease = (medicine, e) => {
    e?.stopPropagation?.();
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
      // কোয়ান্টিটি ০ হয়ে গেলে 'Add to Cart' বাটনে ব্যাক করবে
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

  // =====================================================
  // ⚡ শুধুমাত্র স্টক থাকা ওষুধ ফিল্টার করা (stock > 0)
  // স্টক আউট (stock <= 0) ওষুধগুলো পেজে দেখাবে না;
  // যখন স্টক আসবে (stock > 0), তখন স্বয়ংক্রিয়ভাবে দেখাবে।
  // =====================================================
  const inStockMedicines = useMemo(() => {
    return medicines.filter((medicine) => {
      const stock = Number(medicine.stock) || 0;
      return stock > 0;
    });
  }, [medicines]);

  const handleSeeMore = () => {
    setVisibleLimit(inStockMedicines.length);
  };

  const displayedMedicines = inStockMedicines.slice(0, visibleLimit);

  // =====================================================
  // LOADING STATE
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#00897b]" />
          <h2 className="mt-4 text-lg font-bold text-slate-700">
            Loading Medicines...
          </h2>
          <p className="mt-1 text-sm text-slate-400">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 lg:px-6">
        {/* HEADER & SEARCH */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00897b] text-white shadow-md">
                <FaCapsules className="text-base" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-800 sm:text-2xl">
                  Medicines
                </h1>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Find genuine medicines from top pharmaceutical companies.
                </p>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search medicine..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs text-slate-700 shadow-sm outline-none transition focus:border-[#00897b] focus:ring-2 focus:ring-teal-100 sm:text-sm"
              />
              {searchLoading && (
                <div className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-[#00897b]" />
              )}
            </div>
          </div>
        </div>

        {/* COMPANIES */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <FaBuilding className="text-[#00897b] text-xs" />
            <h2 className="text-xs font-bold text-slate-700">Companies</h2>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {companies.map((company) => {
              const active = selectedCompany === company.value;
              return (
                <button
                  key={company.value || "all"}
                  type="button"
                  onClick={() => handleCompanyChange(company.value)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all duration-200 sm:px-4 sm:py-2 sm:text-xs ${
                    active
                      ? "bg-[#00897b] text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-[#00897b]"
                  }`}
                >
                  {company.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* FILTER COUNT */}
        {/* <div className="mb-3 flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-2">
          <p className="text-[11px] font-semibold text-teal-900">
            {selectedCompany ? `Company: ${selectedCompany}` : "All Companies"}
          </p>
          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-xs">
            Showing {displayedMedicines.length} of {inStockMedicines.length} in
            stock
          </span>
        </div> */}

        {/* EMPTY STATE (যদি কোনো ইন-স্টক প্রোডাক্ট না থাকে) */}
        {displayedMedicines.length === 0 && (
          <div className="my-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <FaCapsules className="mx-auto text-3xl text-teal-600 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">
              No in-stock medicines found
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Currently all medicines in this criteria are out of stock. They
              will appear as soon as restocked.
            </p>
          </div>
        )}

        {/* =================================================
            📱 MOBILE 3-COLUMN GRID (কার্ড ১ ও ২ এর হুবহু ডিজাইন)
        ================================================= */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:hidden">
          {displayedMedicines.map((medicine) => {
            const stock = Number(medicine.stock) || 0;
            const sellingPrice = Number(medicine.sellingPrice) || 0;
            const mrpPrice = Number(medicine.mrpePrice) || 0;
            const discount =
              Number(medicine.bikriPercent) ||
              (mrpPrice > sellingPrice && mrpPrice > 0
                ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100)
                : 0);

            const currentQty = getCartQuantity(medicine);
            const isWish = !!wishlist[medicine._id];

            return (
              <div
                key={medicine._id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition hover:shadow-md"
              >
                <div>
                  {/* TOP BADGE & WISHLIST HEART */}
                  <div className="relative mb-1 flex h-5 items-center justify-between">
                    {discount > 0 ? (
                      <span className="rounded bg-[#22c55e] px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                        {discount}% OFF
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleWishlist(medicine._id)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      {isWish ? (
                        <FaHeart className="text-[11px] text-red-500" />
                      ) : (
                        <FaRegHeart className="text-[11px] text-teal-600/70" />
                      )}
                    </button>
                  </div>

                  {/* IMAGE */}
                  <div className="relative mb-1.5 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                    <img
                      src={medicine.image || medisin}
                      alt={medicine.medicineName || "Medicine"}
                      className="h-full w-full object-contain p-1 transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = medisin;
                      }}
                    />
                  </div>

                  {/* TITLE */}
                  <h3 className="line-clamp-2 min-h-[28px] text-[10px] font-bold leading-tight text-slate-800">
                    {medicine.medicineName || "Unknown Medicine"}
                  </h3>

                  {/* PRICE (SELLING + MRP) */}
                  <div className="mt-1 flex flex-wrap items-baseline gap-1">
                    <span className="text-[11px] font-black text-[#00897b]">
                      ৳{sellingPrice.toFixed(2)}
                    </span>
                    {mrpPrice > sellingPrice && (
                      <span className="text-[9px] text-slate-400 line-through">
                        ৳{mrpPrice.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* =====================================================
                    ⚡ ACTION: ADD TO CART OR QUANTITY STEPPER (card1 vs card2)
                ===================================================== */}
                <div className="mt-2 w-full">
                  {currentQty === 0 ? (
                    /* card1: প্রাথমিক 'Add to Cart' বাটন */
                    <button
                      type="button"
                      onClick={() => handleAddToCart(medicine)}
                      className="w-full rounded-lg bg-[#00897b] py-1.5 text-[10px] font-bold text-white shadow-xs transition hover:bg-[#00796b] active:scale-95"
                    >
                      Add to Cart
                    </button>
                  ) : (
                    /* card2: ক্লিক করার পর [- 1 +] বাটন */
                    <div className="flex h-7 w-full items-center justify-between rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
                      {/* MINUS */}
                      <button
                        type="button"
                        onClick={(e) => handleDecrease(medicine, e)}
                        className="flex h-full w-7 items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition font-bold"
                        title="Decrease"
                      >
                        <FaMinus className="text-[8px]" />
                      </button>

                      {/* CURRENT QUANTITY */}
                      <span className="flex-1 text-center font-sans text-xs font-bold text-slate-800">
                        {currentQty}
                      </span>

                      {/* PLUS */}
                      <button
                        type="button"
                        onClick={(e) => handleIncrease(medicine, e)}
                        disabled={stock > 0 && currentQty >= stock}
                        className="flex h-full w-7 items-center justify-center bg-[#00897b] text-white hover:bg-[#00796b] active:scale-90 transition disabled:opacity-50"
                        title="Increase"
                      >
                        <FaPlus className="text-[8px]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* =================================================
            💻 DESKTOP 4-COLUMN GRID (একই কোয়ান্টিটি লজিক)
        ================================================= */}
        <div className="hidden gap-5 lg:grid lg:grid-cols-4">
          {displayedMedicines.map((medicine) => {
            const stock = Number(medicine.stock) || 0;
            const sellingPrice = Number(medicine.sellingPrice) || 0;
            const mrpPrice = Number(medicine.mrpePrice) || 0;
            const discount =
              Number(medicine.bikriPercent) ||
              (mrpPrice > sellingPrice && mrpPrice > 0
                ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100)
                : 0);
            const currentQty = getCartQuantity(medicine);

            return (
              <div
                key={medicine._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="relative overflow-hidden bg-slate-50">
                    <img
                      src={medicine.image || medisin}
                      alt={medicine.medicineName || "Medicine"}
                      className="h-52 w-full object-contain p-4 transition duration-500 hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = medisin;
                      }}
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-[#00897b] px-3 py-1 text-xs font-bold text-white">
                      {medicine.company || "Medicine"}
                    </span>
                    {discount > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-[#22c55e] px-2.5 py-1 text-xs font-black text-white">
                        {discount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="line-clamp-1 text-base font-black text-slate-800">
                      {medicine.medicineName || "Unknown Medicine"}
                    </h2>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">MRP</span>
                        <span className="text-xs text-slate-400 line-through">
                          ৳ {mrpPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-sm font-bold text-slate-700">
                          Price
                        </span>
                        <span className="text-xl font-black text-[#00897b]">
                          ৳ {sellingPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  {currentQty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(medicine)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00897b] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#00796b]"
                    >
                      <FaPlus className="text-xs" />
                      <span>Add To Cart</span>
                    </button>
                  ) : (
                    <div className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={(e) => handleDecrease(medicine, e)}
                        className="flex h-full w-12 items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
                      >
                        <FaMinus />
                      </button>
                      <span className="font-bold text-slate-800 text-base">
                        {currentQty}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleIncrease(medicine, e)}
                        disabled={stock > 0 && currentQty >= stock}
                        className="flex h-full w-12 items-center justify-center bg-[#00897b] text-white hover:bg-[#00796b] transition active:scale-95 disabled:opacity-50"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SEE MORE */}
        {visibleLimit < inStockMedicines.length && (
          <div className="mt-8 flex flex-col items-center justify-center pb-6">
            <button
              type="button"
              onClick={handleSeeMore}
              className="group flex items-center gap-2 rounded-xl bg-[#00897b] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00796b] active:scale-95 sm:text-sm"
            >
              <span>See More</span>
              <FaChevronDown className="transition-transform duration-300 group-hover:translate-y-0.5 text-xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AllItemMedicine;
