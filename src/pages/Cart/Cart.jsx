import { useEffect, useState } from "react";
import useCart from "../../hooks/useCart";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaMinus,
  FaTrashAlt,
  FaArrowLeft,
  FaShoppingBag,
  FaShieldAlt,
  FaTruck,
  FaRegCheckCircle,
  FaLock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Cart() {
  const { cart, increaseQuantity, decreaseQuantity, removeFromCart } =
    useCart();
  const navigate = useNavigate();

  // সার্ভার থেকে সর্বশেষ স্টক রাখার স্টেট (যদি কার্ট আইটেমে stock না থাকে বা আপডেট হয়)
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    const fetchLatestStock = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/medicines?limit=1000`);
        const list = res.data?.medicines || res.data || [];
        if (Array.isArray(list)) {
          const map = {};
          list.forEach((med) => {
            if (med?._id !== undefined && med?.stock !== undefined) {
              map[med._id] = Number(med.stock);
            }
          });
          setStockMap(map);
        }
      } catch (err) {
        console.error("Stock check error:", err);
      }
    };

    if (cart.length > 0) {
      fetchLatestStock();
    }
  }, [cart.length]);

  // নির্দিষ্ট আইটেমের সর্বোচ্চ স্টক বের করার ফাংশন
  const getAvailableStock = (item) => {
    if (stockMap[item._id] !== undefined) {
      return Number(stockMap[item._id]);
    }
    if (item.stock !== undefined && item.stock !== null) {
      return Number(item.stock);
    }
    if (item.availableStock !== undefined) {
      return Number(item.availableStock);
    }
    return null; // স্টক ডাটা না পাওয়া গেলে
  };

  // স্টক চেক করে Quantity বাড়ানোর ফাংশন
  const handleIncreaseQuantity = (item) => {
    const maxStock = getAvailableStock(item);
    const currentQty = Number(item.quantity || 0);

    if (maxStock !== null && currentQty >= maxStock) {
      Swal.fire({
        icon: "warning",
        title: "Stock Limit Reached!",
        text: `"${item.medicineName}" স্টকে সর্বোচ্চ ${maxStock} টি আছে। এর বেশি নেওয়া যাবে না।`,
        confirmButtonColor: "#059669",
      });
      return;
    }

    increaseQuantity(item._id);
  };

  // কোনো আইটেম স্টকের চেয়ে বেশি আছে কিনা চেক
  const hasOverStockItem = cart.some((item) => {
    const maxStock = getAvailableStock(item);
    return maxStock !== null && Number(item.quantity || 0) > maxStock;
  });

  // চেকআউট বাটনে ক্লিক করলে স্টক ভ্যালিডেশন
  const handleProceedCheckout = (e) => {
    e.preventDefault();

    const invalidItem = cart.find((item) => {
      const maxStock = getAvailableStock(item);
      return maxStock !== null && Number(item.quantity || 0) > maxStock;
    });

    if (invalidItem) {
      const maxStock = getAvailableStock(invalidItem);
      Swal.fire({
        icon: "error",
        title: "স্টকের চেয়ে বেশি পরিমাণ!",
        text: `"${invalidItem.medicineName}" স্টকে আছে ${maxStock} টি, কিন্তু আপনার কার্টে আছে ${invalidItem.quantity} টি। অনুগ্রহ করে পরিমাণ কমান।`,
        confirmButtonColor: "#059669",
      });
      return;
    }

    navigate("/checkout");
  };

  // গ্র্যান্ড টোটাল
  const grandTotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.sellingPrice || 0) * Number(item.quantity || 0),
    0,
  );

  // মোট আইটেম সংখ্যা
  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  // ==========================================
  // EMPTY CART STATE
  // ==========================================
  if (cart.length === 0) {
    return (
      <div className="min-h-[80vh] bg-[#f8fafc] px-4 py-16 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:p-12">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FaShoppingBag className="text-4xl" />
          </div>

          <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
            Your Cart is Currently Empty
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm">
            You haven't added any medicines yet. Enjoy free delivery on all
            orders!
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-xs font-bold text-white shadow-md shadow-emerald-200 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 active:scale-95 sm:text-sm"
          >
            <FaArrowLeft />
            <span>Browse Medicine Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN CART LAYOUT
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <FaShoppingBag className="text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Order Review
                </h1>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                  {totalItems} {totalItems === 1 ? "Unit" : "Units"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Verified pharmaceutical orders processed by licensed pharmacists
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <FaArrowLeft className="text-xs" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* 🚀 FREE DELIVERY BANNER */}
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <FaTruck className="text-base" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 sm:text-sm">
                100% Free Home Delivery Applied!
              </h3>
              <p className="text-[11px] text-emerald-700">
                No minimum order amount required. Fast doorstep delivery is on
                us.
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black uppercase text-white sm:inline-block">
            Free Shipping
          </span>
        </div>

        {/* GRID LAYOUT: ITEMS LIST + SUMMARY */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ========================================================
              LEFT COLUMN: CART ITEMS (TABLE / CARDS)
          ======================================================== */}
          <div className="lg:col-span-8">
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs md:block">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Medicine Info</th>
                    <th className="px-6 py-4">Unit Price</th>
                    <th className="px-6 py-4 text-center">Quantity</th>
                    <th className="px-6 py-4 text-right">Subtotal</th>
                    <th className="px-6 py-4 text-center">Remove</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {cart.map((item) => {
                    const itemTotal =
                      Number(item.sellingPrice || 0) *
                      Number(item.quantity || 0);
                    const maxStock = getAvailableStock(item);
                    const isAtMaxStock =
                      maxStock !== null && Number(item.quantity) >= maxStock;
                    const isOverStock =
                      maxStock !== null && Number(item.quantity) > maxStock;

                    return (
                      <tr
                        key={item._id}
                        className="transition hover:bg-slate-50/60"
                      >
                        {/* PRODUCT DETAILS */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1">
                              <img
                                src={
                                  item.image ||
                                  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60"
                                }
                                alt={item.medicineName}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60";
                                }}
                              />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 leading-snug">
                                {item.medicineName}
                              </h3>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {item.company || "Certified Generic"}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                  <FaRegCheckCircle className="text-[8px]" />
                                  {maxStock !== null
                                    ? `Stock: ${maxStock}`
                                    : "In Stock"}
                                </span>

                                {isAtMaxStock && (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                    <FaExclamationTriangle className="text-[8px]" />
                                    Max Stock Reached
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* PRICE */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700">
                            ৳ {Number(item.sellingPrice || 0).toFixed(2)}
                          </span>
                        </td>

                        {/* QUANTITY CONTROL */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-1 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(item._id)}
                                disabled={item.quantity <= 1}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-2xs transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <FaMinus size={9} />
                              </button>
                              <span className="min-w-[32px] text-center font-black text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleIncreaseQuantity(item)}
                                disabled={isAtMaxStock}
                                title={
                                  isAtMaxStock
                                    ? `Maximum available stock is ${maxStock}`
                                    : "Increase quantity"
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-2xs transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <FaPlus size={9} />
                              </button>
                            </div>

                            {isOverStock && (
                              <span className="text-[10px] font-bold text-red-600">
                                স্টকে আছে {maxStock} টি!
                              </span>
                            )}
                          </div>
                        </td>

                        {/* SUBTOTAL */}
                        <td className="px-6 py-4 text-right">
                          <span className="font-black text-emerald-700 text-sm">
                            ৳ {itemTotal.toFixed(2)}
                          </span>
                        </td>

                        {/* DELETE */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item._id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Remove from cart"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS (< 768px) */}
            <div className="space-y-3 md:hidden">
              {cart.map((item) => {
                const itemTotal =
                  Number(item.sellingPrice || 0) * Number(item.quantity || 0);
                const maxStock = getAvailableStock(item);
                const isAtMaxStock =
                  maxStock !== null && Number(item.quantity) >= maxStock;
                const isOverStock =
                  maxStock !== null && Number(item.quantity) > maxStock;

                return (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                  >
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1">
                        <img
                          src={
                            item.image ||
                            "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60"
                          }
                          alt={item.medicineName}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="line-clamp-1 text-xs font-bold text-slate-800">
                            {item.medicineName}
                          </h3>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item._id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {item.company || "Medicine"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs font-black text-emerald-700">
                            ৳ {Number(item.sellingPrice || 0).toFixed(2)}
                          </p>
                          {maxStock !== null && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              Stock: {maxStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item._id)}
                            disabled={item.quantity <= 1}
                            className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FaMinus size={8} />
                          </button>
                          <span className="min-w-[24px] text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncreaseQuantity(item)}
                            disabled={isAtMaxStock}
                            className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FaPlus size={8} />
                          </button>
                        </div>

                        {isAtMaxStock && (
                          <span className="text-[10px] font-bold text-amber-600">
                            {isOverStock
                              ? `স্টকে আছে ${maxStock} টি!`
                              : "Max Stock"}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">
                          Total:{" "}
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          ৳ {itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: ORDER SUMMARY (FREE SHIPPING)
          ======================================================== */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black tracking-tight text-slate-800">
                  Payment Summary
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <FaShieldAlt /> 100% Secure
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-bold text-slate-800">
                    ৳ {grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* সর্বাবস্থায় ফ্রি ডেলিভারি */}
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <FaTruck className="text-emerald-600 text-xs" />
                    Delivery Charges
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 line-through text-[11px]">
                      ৳ 50.00
                    </span>
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      FREE
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-800">
                      Total Payable
                    </span>
                    <span className="text-2xl font-black text-emerald-700">
                      ৳ {grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Zero delivery charge added to your invoice
                  </p>
                </div>
              </div>

              {hasOverStockItem && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] font-bold text-red-600">
                  আপনার কার্টে স্টকের চেয়ে বেশি ওষুধ রয়েছে। অনুগ্রহ করে পরিমাণ
                  কমিয়ে চেকআউট করুন।
                </div>
              )}

              {/* CHECKOUT BUTTON */}
              <button
                type="button"
                onClick={handleProceedCheckout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-200 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 active:scale-95"
              >
                <FaLock className="text-xs" />
                <span>Proceed to Checkout</span>
              </button>

              {/* TRUST BADGES */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <ul className="space-y-2 text-[11px] text-slate-500">
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-bold">
                      ✓
                    </span>
                    <span>100% Free Home Delivery Nationwide</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-bold">
                      ✓
                    </span>
                    <span>100% Original & Unexpired Medicines</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-[9px] font-bold">
                      ✓
                    </span>
                    <span>Cash on Delivery & Digital Payment Available</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
