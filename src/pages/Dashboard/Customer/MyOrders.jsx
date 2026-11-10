import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaChevronRight,
  FaReceipt,
  FaFileInvoice,
  FaBoxes,
  FaChevronDown,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegCalendarAlt,
} from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function MyOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (!user?.email) return;

    const loadOrders = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_URL}/api/orders/my-orders/${encodeURIComponent(user.email)}`,
        );

        if (res.data?.success) {
          setOrders(res.data.orders || []);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Failed to load orders:", error);
        Swal.fire({
          icon: "error",
          title: "Failed to Load Orders",
          text:
            error.response?.data?.message || "Please check your connection.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  // টগল ডিটেইলস
  const toggleDetails = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // স্ট্যাটাস অনুসারে স্ক্রিনশটের মতো ব্যাজ
  const renderStatusBadge = (status) => {
    const s = (status || "Pending").toUpperCase();
    if (s === "COMPLETED" || s === "DELIVERED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black tracking-wider text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          DELIVERED
        </span>
      );
    }
    if (s === "PROCESSING") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black tracking-wider text-blue-600">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          PROCESSING
        </span>
      );
    }
    if (s === "CANCELLED") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black tracking-wider text-red-600">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
          CANCELLED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black tracking-wider text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        PENDING
      </span>
    );
  };

  // সুন্দর ফরম্যাটেড ডেট (যেমন: Sep 10, 2026 • 10:35 PM)
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const timeFormatted = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} • ${timeFormatted}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600"></div>
          <p className="text-xs font-bold text-slate-500">
            Loading your orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-xl">
        {/* TOP BAR / HEADER (স্ক্রিনশটের মতো ← Orders) */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs transition hover:bg-slate-100"
            >
              <FaArrowLeft size={14} />
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Orders
            </h1>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            {orders.length} {orders.length === 1 ? "Order" : "Orders"}
          </span>
        </div>

        {/* EMPTY STATE */}
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FaBoxes size={28} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-800">
              No Orders Yet
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              You haven't placed any medicine orders yet.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          /* ORDERS LIST (স্ক্রিনশট অনুযায়ী কার্ড স্টাইল) */
          <div className="space-y-4">
            {orders.map((order, index) => {
              const isExpanded = expandedOrderId === order._id;
              const totalQuantity = (order.items || []).reduce(
                (sum, item) => sum + Number(item.quantity || 1),
                0,
              );
              // স্ক্রিনশটের মতো সংক্ষিপ্ত অর্ডার নম্বর তৈরি (#26091012 স্টাইল)
              const displayOrderNo = order.invoiceNo
                ? order.invoiceNo.replace("INV-", "#")
                : `#${order._id.slice(-7)}`;

              return (
                <div
                  key={order._id}
                  className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition duration-200 hover:shadow-md"
                >
                  {/* CARD MAIN SECTION */}
                  <div
                    onClick={() => toggleDetails(order._id)}
                    className="cursor-pointer p-5 transition hover:bg-slate-50/50"
                  >
                    {/* Top Row: Icon + Order No + Date | Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <FaReceipt size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-tight">
                            Order {displayOrderNo}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatDate(order.orderDate)}
                          </p>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div className="shrink-0">
                        {renderStatusBadge(order.orderStatus)}
                      </div>
                    </div>

                    {/* Middle Row: 3 Columns (Items, Payment, Total) */}
                    <div className="mt-4 grid grid-cols-3 items-end gap-2 border-t border-slate-100 pt-3">
                      {/* Items Column */}
                      <div>
                        <span className="block text-[11px] font-medium text-slate-400">
                          Items
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {totalQuantity}{" "}
                          {totalQuantity === 1 ? "item" : "items"}
                        </span>
                      </div>

                      {/* Payment Column */}
                      <div>
                        <span className="block text-[11px] font-medium text-slate-400">
                          Payment
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {order.paymentMethod || "Cash on Delivery"}
                        </span>
                      </div>

                      {/* Total Column */}
                      <div className="text-right">
                        <span className="block text-[11px] font-medium text-slate-400">
                          Total
                        </span>
                        <span className="text-base font-black text-emerald-700">
                          ৳{Math.round(order.grandTotal || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Tap to view details link */}
                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-100 pt-2.5 text-xs font-semibold text-teal-600">
                      <span>Tap to view details</span>
                      {isExpanded ? (
                        <FaChevronDown size={11} className="text-teal-600" />
                      ) : (
                        <FaChevronRight size={11} className="text-teal-600" />
                      )}
                    </div>
                  </div>

                  {/* EXPANDABLE DETAILS ACCORDION */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-5">
                      {/* MEDICINES LIST */}
                      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Ordered Medicines ({order.items?.length || 0})
                      </h4>

                      <div className="divide-y divide-slate-200/70 rounded-xl border border-slate-200 bg-white">
                        {(order.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-1">
                                <img
                                  src={
                                    item.image ||
                                    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&auto=format&fit=crop&q=60"
                                  }
                                  alt={item.medicineName}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">
                                  {item.medicineName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {item.quantity} pcs × ৳
                                  {Number(item.unitPrice).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900">
                              ৳{Number(item.totalPrice).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* DELIVERY ADDRESS & NOTES */}
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-1.5">
                        <div className="flex items-start gap-2 text-slate-600">
                          <FaMapMarkerAlt className="mt-0.5 text-slate-400 shrink-0" />
                          <span>
                            <b>Address:</b>{" "}
                            {order.address || "No address provided"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <FaPhoneAlt className="text-slate-400 shrink-0" />
                          <span>
                            <b>Phone:</b> {order.phone || "N/A"}
                          </span>
                        </div>
                        {order.note && (
                          <p className="mt-1 rounded bg-amber-50 p-1.5 text-[11px] text-amber-800">
                            <b>Note:</b> {order.note}
                          </p>
                        )}
                      </div>

                      {/* INVOICE BUTTON */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Payment:{" "}
                          <b
                            className={
                              order.paymentStatus === "Paid"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }
                          >
                            {order.paymentStatus || "Unpaid"}
                          </b>
                        </span>

                        <Link
                          to={`/dashboard/invoice/${order._id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
                        >
                          <FaFileInvoice className="text-slate-400" />
                          <span>View Full Invoice</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyOrders;
