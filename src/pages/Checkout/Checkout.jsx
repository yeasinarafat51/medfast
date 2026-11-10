import { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, Link } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaStickyNote,
  FaShieldAlt,
  FaTruck,
  FaArrowLeft,
  FaCheckCircle,
  FaLock,
  FaMoneyBillWave,
  FaShoppingBag,
} from "react-icons/fa";
import useCart from "../../hooks/useCart";
import useAuth from "../../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod"); // Cash on Delivery

  // Load Address & Phone from Database
  useEffect(() => {
    const loadUser = async () => {
      if (!user?.email) return;

      try {
        const res = await axios.get(
          `${API_URL}/api/users/email/${encodeURIComponent(user.email)}`,
        );

        if (res.data.success && res.data.user) {
          setAddress(res.data.user.address || "");
          setPhone(res.data.user.phone || "");
        }
      } catch (error) {
        console.error("User details fetch error:", error);
      }
    };

    loadUser();
  }, [user]);

  // মোট বিক্রয়মূল্য
  const grandTotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.sellingPrice || 0) * Number(item.quantity || 0),
    0,
  );

  // মোট MRP মূল্য (ডিসকাউন্ট কত হলো তা দেখাতে)
  const totalMRP = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.mrpePrice || item.sellingPrice || 0) *
        Number(item.quantity || 0),
    0,
  );

  // মোট সেভিংস বা ডিসকাউন্ট
  const totalSavings = Math.max(0, totalMRP - grandTotal);

  // মোট আইটেম সংখ্যা
  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  // ==========================================
  // HANDLE ORDER SUBMISSION
  // ==========================================
  const handleOrder = async (e) => {
    if (e) e.preventDefault();

    if (cart.length === 0) {
      return Swal.fire({
        icon: "warning",
        title: "Your Cart is Empty",
        text: "Please add medicines to your cart before proceeding to checkout.",
      });
    }

    if (!address.trim() || !phone.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Required Information Missing",
        text: "Please provide a valid delivery address and active phone number.",
      });
    }

    try {
      setLoading(true);

      // সর্বশেষ অ্যাড্রেস ও ফোন প্রোফাইলে আপডেট করে রাখা
      if (user?.email) {
        try {
          await axios.put(
            `${API_URL}/api/users/email/${encodeURIComponent(user.email)}`,
            { address, phone },
          );
        } catch (err) {
          console.warn("Could not sync user profile:", err);
        }
      }

      const orderData = {
        customerName: user?.displayName || "Valued Customer",
        customerEmail: user?.email || "customer@medpharm.com",
        uid: user?.uid || "",
        address,
        phone,
        note,
        items: cart.map((item) => ({
          medicineId: item._id,
          medicineName: item.medicineName,
          company: item.company || "Medicine",
          quantity: Number(item.quantity),
          mrp: Number(item.mrpePrice || item.sellingPrice),
          discount: Number(item.bikriPercent || 0),
          unitPrice: Number(item.sellingPrice),
          totalPrice: Number(item.sellingPrice) * Number(item.quantity),
        })),
        grandTotal: Number(grandTotal.toFixed(2)),
        paymentStatus: "Unpaid",
        paymentMethod: "Cash on Delivery",
        orderStatus: "Pending",
        orderDate: new Date(),
      };

      const res = await axios.post(`${API_URL}/api/orders`, orderData);

      if (res.data.success) {
        clearCart();

        Swal.fire({
          icon: "success",
          title: "Order Placed Successfully!",
          html: `
            <p class="text-sm text-slate-600">Your order has been confirmed.</p>
            <p class="text-xs font-bold text-emerald-600 mt-2">Invoice: ${res.data.invoiceNo || "Generated"}</p>
          `,
          confirmButtonColor: "#059669",
        });

        navigate("/my-orders");
      }
    } catch (error) {
      console.error("Order placement error:", error);
      Swal.fire({
        icon: "error",
        title: "Order Failed",
        text:
          error.response?.data?.message ||
          "An error occurred while placing your order. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // যদি কার্ট খালি থাকে
  if (cart.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#f8fafc] px-4 py-16 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FaShoppingBag className="text-3xl" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-800">
            No Items to Checkout
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            Your shopping cart is empty. Browse medicines to place an order.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700"
          >
            <FaArrowLeft />
            <span>Browse Medicines</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Final Step
              </span>
              <span className="text-xs text-slate-400">Step 2 of 2</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Shipping & Checkout
            </h1>
            <p className="text-xs text-slate-500">
              Provide delivery address and confirm your pharmaceutical order.
            </p>
          </div>

          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Return to Cart</span>
          </Link>
        </div>

        {/* MAIN 2-COLUMN GRID */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ========================================================
              LEFT COLUMN: DELIVERY & PAYMENT DETAILS (7 Cols)
          ======================================================== */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. SHIPPING ADDRESS CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-7">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FaMapMarkerAlt className="text-sm" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Delivery Address
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Where should we deliver your medications?
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* ADDRESS FIELD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Street Address / House / Area{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. House #12, Road #4, Sector #11, Uttara, Dhaka"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                {/* PHONE NUMBER FIELD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Contact Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <FaPhoneAlt className="text-xs" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Our delivery agent will call this number prior to arrival.
                  </p>
                </div>

                {/* SPECIAL DELIVERY NOTE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Optional Delivery Instructions
                  </label>
                  <div className="relative mt-1.5">
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Ring the bell twice, or leave with security"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. PAYMENT METHOD CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-7">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FaMoneyBillWave className="text-sm" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Payment Method
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Select your preferred payment option
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {/* Cash on Delivery (Active) */}
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 p-4 transition">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Cash on Delivery (COD)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pay in cash when your medicines are delivered to your
                        doorstep.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                    Recommended
                  </span>
                </label>

                {/* Digital / Online Payment Note */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                  <p className="text-[11px] text-slate-400">
                    bKash / Nagad / Card payment available directly to rider
                    upon delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: ORDER SUMMARY & CONFIRMATION (5 Cols)
          ======================================================== */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Order Summary
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {totalItems} medicines in order
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {cart.length} Products
                </span>
              </div>

              {/* ITEMS MINI-LIST */}
              <div className="mt-4 max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 text-xs">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="truncate font-bold text-slate-800">
                        {item.medicineName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity} x ৳
                        {Number(item.sellingPrice).toFixed(2)}
                        {item.bikriPercent > 0 && (
                          <span className="ml-1 text-emerald-600 font-bold">
                            ({item.bikriPercent}% off)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800">
                      ৳{(item.quantity * item.sellingPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* FREE SHIPPING BADGE */}
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50/80 p-2.5 text-emerald-800 border border-emerald-100">
                <FaTruck className="text-emerald-600 text-xs shrink-0" />
                <span className="text-[11px] font-bold">
                  Free Express Delivery Applied (৳0.00)
                </span>
              </div>

              {/* PRICE CALCULATIONS */}
              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total MRP</span>
                  <span className="text-slate-400 line-through">
                    ৳{totalMRP.toFixed(2)}
                  </span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount Savings</span>
                    <span>- ৳{totalSavings.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  <span className="font-black text-emerald-600">FREE</span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Grand Total
                    </span>
                    <span className="text-2xl font-black text-emerald-700">
                      ৳{grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    No hidden or extra convenience fees
                  </p>
                </div>
              </div>

              {/* CONFIRM ORDER BUTTON */}
              <button
                type="button"
                onClick={handleOrder}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-200 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <FaLock className="text-xs" />
                    <span>Confirm Order (৳{grandTotal.toFixed(2)})</span>
                  </>
                )}
              </button>

              {/* TRUST & COMPLIANCE */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <FaShieldAlt className="text-emerald-600" />
                <span>Encrypted 256-bit Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
