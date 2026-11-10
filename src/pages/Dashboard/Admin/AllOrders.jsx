import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import {
  FaUndo,
  FaFileInvoice,
  FaBoxes,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaReceipt,
  FaLayerGroup,
  FaPrint,
  FaSyncAlt,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

const ORDERS_CACHE_KEY = "novacare_orders_cache_v1";

function AllOrders() {
  // ১. শুরুতেই ক্যাশ থেকে ডাটা নিয়ে নেওয়া হচ্ছে, যাতে লোডিং ছাড়াই সাথে সাথে দেখায়!
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_CACHE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem(ORDERS_CACHE_KEY);
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const [expandedDays, setExpandedDays] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});

  // =============================
  // Load Orders (Instant Cache + Background Sync)
  // =============================
  const loadOrders = async (showSpinner = false) => {
    try {
      if (showSpinner && orders.length === 0) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }

      const res = await axios.get(`${API_URL}/api/orders`);

      if (res.data?.success) {
        const fetchedOrders = res.data.orders || [];
        setOrders(fetchedOrders);
        try {
          localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(fetchedOrders));
        } catch (e) {
          console.warn("Storage quota exceeded", e);
        }
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      if (orders.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Failed to load orders",
          text: error.response?.data?.message || "Server connection error",
        });
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // =========================================================================
  // লজিক ১: দুপুর ২:০০ টা (14:00) থেকে পরের দিন দুপুর ২:০০ টা বিজনেস সাইকেল
  // =========================================================================
  const getCustomDayCycle = (dateString) => {
    const d = new Date(dateString);
    const cycleStart = new Date(d);
    if (d.getHours() < 14) {
      cycleStart.setDate(cycleStart.getDate() - 1);
    }
    cycleStart.setHours(14, 0, 0, 0);

    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 1);

    const key = cycleStart.toISOString().split("T")[0];

    const formatTimeDate = (date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    const label = `${formatTimeDate(cycleStart)} 02:00 PM  →  ${formatTimeDate(
      cycleEnd,
    )} 02:00 PM`;

    return { key, cycleStart, cycleEnd, label };
  };

  // =========================================================================
  // লজিক ২: একই দিনে একই কাস্টমারের একাধিক অর্ডার রাখা + আলাদা লিস্ট সংরক্ষণ
  // =========================================================================
  const groupedOrders = useMemo(() => {
    const dayGroups = {};

    // যেসব অর্ডারে অন্তত ১টি আইটেম ও দাম আছে সেগুলোই অ্যাক্টিভ তালিকায় থাকবে
    const activeOrders = orders.filter(
      (o) =>
        Array.isArray(o.items) &&
        o.items.length > 0 &&
        o.items.some((it) => Number(it.quantity || 0) > 0) &&
        Number(o.grandTotal || 0) > 0,
    );

    activeOrders.forEach((order) => {
      const { key, label, cycleStart } = getCustomDayCycle(order.orderDate);

      if (!dayGroups[key]) {
        dayGroups[key] = {
          cycleKey: key,
          label,
          startTime: cycleStart.getTime(),
          customerMap: {},
          totalValue: 0,
        };
      }

      const customerKey = (
        order.customerEmail ||
        order.phone ||
        order.customerName ||
        "walk-in-customer"
      )
        .toLowerCase()
        .trim();

      if (!dayGroups[key].customerMap[customerKey]) {
        dayGroups[key].customerMap[customerKey] = {
          ...order,
          originalOrderIds: [order._id],
          orderCount: 1,
          items: (order.items || []).map((it) => ({ ...it })),
          notes: order.note ? [order.note] : [],
          grandTotal: Number(order.grandTotal || 0),
          individualOrders: [{ ...order }],
        };
      } else {
        const existing = dayGroups[key].customerMap[customerKey];
        existing.originalOrderIds.push(order._id);
        existing.orderCount += 1;
        existing.grandTotal += Number(order.grandTotal || 0);
        existing.individualOrders.push({ ...order });

        (order.items || []).forEach((newItem) => {
          const found = existing.items.find(
            (it) =>
              String(it.medicineId || it._id || it.medicineName || it.name) ===
              String(
                newItem.medicineId ||
                  newItem._id ||
                  newItem.medicineName ||
                  newItem.name,
              ),
          );
          if (found) {
            found.quantity =
              Number(found.quantity || 0) + Number(newItem.quantity || 0);
            found.totalPrice =
              Number(found.totalPrice || 0) + Number(newItem.totalPrice || 0);
          } else {
            existing.items.push({ ...newItem });
          }
        });

        if (order.note && !existing.notes.includes(order.note)) {
          existing.notes.push(order.note);
        }

        if (order.address) existing.address = order.address;
        if (order.phone) existing.phone = order.phone;
      }

      dayGroups[key].totalValue += Number(order.grandTotal || 0);
    });

    return Object.values(dayGroups)
      .map((day) => ({
        ...day,
        mergedOrders: Object.values(day.customerMap).sort(
          (a, b) => new Date(b.orderDate) - new Date(a.orderDate),
        ),
      }))
      .sort((a, b) => b.startTime - a.startTime);
  }, [orders]);

  const toggleDay = (key) => {
    setExpandedDays((prev) => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }));
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // =========================================================================
  // স্ট্যাটাস ও পেমেন্ট আপডেট (একাধিক মার্জড অর্ডার থাকলেও সবগুলোর আপডেট হবে)
  // =========================================================================
  const updateStatus = async (order, orderStatus) => {
    const targetIds = order.originalOrderIds?.length
      ? order.originalOrderIds
      : [order._id];

    setOrders((prev) =>
      prev.map((o) => (targetIds.includes(o._id) ? { ...o, orderStatus } : o)),
    );

    try {
      await Promise.all(
        targetIds.map((id) =>
          axios.patch(`${API_URL}/api/orders/${id}`, { orderStatus }),
        ),
      );

      Swal.fire({
        icon: "success",
        title: "Order Status Updated",
        timer: 1000,
        showConfirmButton: false,
      });
      loadOrders();
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Update Failed" });
      loadOrders();
    }
  };

  const updatePayment = async (order, paymentStatus) => {
    const targetIds = order.originalOrderIds?.length
      ? order.originalOrderIds
      : [order._id];

    setOrders((prev) =>
      prev.map((o) =>
        targetIds.includes(o._id) ? { ...o, paymentStatus } : o,
      ),
    );

    try {
      await Promise.all(
        targetIds.map((id) =>
          axios.patch(`${API_URL}/api/orders/payment/${id}`, { paymentStatus }),
        ),
      );

      Swal.fire({
        icon: "success",
        title: "Payment Status Updated",
        timer: 1000,
        showConfirmButton: false,
      });
      loadOrders();
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: "Payment Update Failed" });
      loadOrders();
    }
  };

  // =========================================================================
  // লজিক ৩: একক ওষুধ রিটার্ন (মার্জড অর্ডারে একাধিক সাব-অর্ডার থাকলেও কাজ করবে)
  // =========================================================================
  const handleReturnItem = async (order, item) => {
    const medId = item.medicineId || item._id;
    const medName = item.medicineName || item.name;
    const currentQty = Number(item.quantity || 0);

    const { value: returnQty } = await Swal.fire({
      title: `Return Medicine`,
      html: `
        <div class="text-left text-sm space-y-2">
          <p class="font-bold text-slate-800">${medName}</p>
          <p class="text-slate-500">Ordered Quantity: <b>${currentQty} pcs</b></p>
          <p class="text-slate-500">Unit Price: <b>৳${item.unitPrice}</b></p>
          <hr class="my-2"/>
          <label class="block text-xs font-bold text-slate-700">কত পিস রিটার্ন করতে চান? (সবগুলো করতে ${currentQty} লিখুন)</label>
        </div>
      `,
      input: "number",
      inputValue: currentQty,
      inputAttributes: { min: 1, max: currentQty, step: 1 },
      showCancelButton: true,
      confirmButtonText: "Confirm Return",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value || value <= 0) return "Please enter a valid quantity!";
        if (Number(value) > currentQty)
          return `You cannot return more than ${currentQty} units!`;
      },
    });

    if (!returnQty) return;

    try {
      Swal.fire({
        title: "Processing Return...",
        text: "Updating invoice and restoring medicine stock...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      let remainingToReturn = Number(returnQty);
      const subOrders = order.individualOrders?.length
        ? order.individualOrders
        : [order];

      for (const singleOrd of subOrders) {
        if (remainingToReturn <= 0) break;

        const matchingItem = (singleOrd.items || []).find(
          (it) =>
            String(it.medicineId || it._id) === String(medId) ||
            (it.medicineName || it.name) === medName,
        );

        if (matchingItem && Number(matchingItem.quantity) > 0) {
          const takeQty = Math.min(
            remainingToReturn,
            Number(matchingItem.quantity),
          );
          const targetMedId =
            matchingItem.medicineId || matchingItem._id || medId;

          await axios.put(
            `${API_URL}/api/orders/${singleOrd._id}/return-item`,
            {
              medicineId: targetMedId,
              returnQuantity: takeQty,
            },
          );

          remainingToReturn -= takeQty;
        }
      }

      Swal.fire({
        icon: "success",
        title: "Product Returned Successfully!",
        text: `${returnQty} pcs ${medName} স্টকে ফেরত যোগ হয়েছে।`,
        timer: 1800,
        showConfirmButton: false,
      });

      loadOrders();
    } catch (error) {
      console.error("Return error:", error);
      Swal.fire({
        icon: "error",
        title: "Return Error",
        text: error.response?.data?.message || "Could not process return.",
      });
      loadOrders();
    }
  };

  // =========================================================================
  // লজিক ৪: একজন ব্যক্তির সারাদিনের সব অর্ডার ১ ক্লিকে FULL RETURN!
  // =========================================================================
  const handleFullCustomerReturn = async (order, e) => {
    if (e) e.stopPropagation();

    const subOrders = order.individualOrders?.length
      ? order.individualOrders
      : [order];

    const totalUnits = (order.items || []).reduce(
      (sum, it) => sum + Number(it.quantity || 0),
      0,
    );

    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "সারাদিনের সম্পূর্ণ অর্ডার Full Return করবেন?",
      html: `
        <div class="text-left text-sm space-y-2 text-slate-700">
          <div class="rounded-xl bg-red-50 border border-red-200 p-3 space-y-1">
            <p><b>কাস্টমারের নাম:</b> ${order.customerName}</p>
            <p><b>আজকের মোট অর্ডার:</b> ${subOrders.length} টি অর্ডার</p>
            <p><b>মোট ওষুধের সংখ্যা:</b> ${order.items?.length || 0} আইটেম (${totalUnits} পিস)</p>
            <p><b>মোট রিটার্ন অ্যামাউন্ট:</b> <span class="text-red-600 font-black">৳${Number(
              order.grandTotal || 0,
            ).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</span></p>
          </div>
          <p class="text-xs text-emerald-700 font-bold pt-1">
            ✓ রিটার্ন কনফার্ম করলে এই কাস্টমারের সারাদিনের সবগুলো ওষুধের স্টক অটোমেটিক আপনার ইনভেন্টরিতে (Medicine Stock) ফেরত যোগ হয়ে যাবে!
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#475569",
      confirmButtonText: "হ্যাঁ, Full Return করুন",
      cancelButtonText: "না, বাতিল করুন",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      Swal.fire({
        title: "Full Return প্রসেস হচ্ছে...",
        html: `<b>${order.customerName}</b>-এর সারাদিনের সব ওষুধ স্টকে ফেরত পাঠানো হচ্ছে...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // প্রতিটি সাব-অর্ডারের প্রতিটি ওষুধ ফুল কোয়ান্টিটি রিটার্ন করা হচ্ছে
      for (const singleOrd of subOrders) {
        const itemsToReturn = [...(singleOrd.items || [])];
        for (const item of itemsToReturn) {
          const medId = item.medicineId || item._id;
          const qty = Number(item.quantity || 0);

          if (medId && qty > 0) {
            await axios.put(
              `${API_URL}/api/orders/${singleOrd._id}/return-item`,
              {
                medicineId: medId,
                returnQuantity: qty,
              },
            );
          }
        }
      }

      // সাথে সাথে লোকাল স্টেট ও ক্যাশ থেকে এই কাস্টমারের রিটার্ন হওয়া অর্ডারগুলো সরিয়ে দেওয়া
      const returnedIds = subOrders.map((o) => o._id);
      setOrders((prev) => {
        const updated = prev.filter((o) => !returnedIds.includes(o._id));
        try {
          localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      Swal.fire({
        icon: "success",
        title: "Full Return সফল হয়েছে!",
        text: `${order.customerName}-এর সারাদিনের সম্পূর্ণ অর্ডার (${totalUnits} পিস ওষুধ) রিটার্ন হয়ে স্টকে যোগ হয়েছে।`,
        timer: 2200,
        showConfirmButton: false,
      });

      loadOrders();
    } catch (error) {
      console.error("Full Return Error:", error);
      Swal.fire({
        icon: "error",
        title: "Full Return সম্পূর্ণ হয়নি",
        text:
          error.response?.data?.message ||
          "কিছু আইটেম রিটার্ন করতে সমস্যা হয়েছে, পেজটি রিফ্রেশ হচ্ছে।",
      });
      loadOrders();
    }
  };

  // =========================================================================
  // লজিক ৫: একাধিক অর্ডারের মধ্যে যেকোনো ১টি নির্দিষ্ট অর্ডার Full Return
  // =========================================================================
  const handleReturnSingleOrder = async (singleOrd, orderIndex) => {
    const totalUnits = (singleOrd.items || []).reduce(
      (sum, it) => sum + Number(it.quantity || 0),
      0,
    );

    const confirmResult = await Swal.fire({
      icon: "warning",
      title: `Order #${orderIndex + 1} Full Return করবেন?`,
      html: `
        <div class="text-left text-xs space-y-1.5 text-slate-700">
          <p><b>কাস্টমার:</b> ${singleOrd.customerName}</p>
          <p><b>ওষুধ সংখ্যা:</b> ${singleOrd.items?.length || 0} টি (${totalUnits} পিস)</p>
          <p><b>মোট টাকা:</b> <b class="text-red-600">৳${singleOrd.grandTotal}</b></p>
          <p class="text-emerald-700 font-bold pt-1">✓ এই অর্ডারের সব ওষুধ স্টকে ফেরত যোগ হয়ে যাবে।</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: `হ্যাঁ, Order #${orderIndex + 1} রিটার্ন করুন`,
      cancelButtonText: "বাতিল",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      Swal.fire({
        title: `Order #${orderIndex + 1} রিটার্ন হচ্ছে...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      for (const item of singleOrd.items || []) {
        const medId = item.medicineId || item._id;
        const qty = Number(item.quantity || 0);
        if (medId && qty > 0) {
          await axios.put(
            `${API_URL}/api/orders/${singleOrd._id}/return-item`,
            {
              medicineId: medId,
              returnQuantity: qty,
            },
          );
        }
      }

      Swal.fire({
        icon: "success",
        title: `Order #${orderIndex + 1} Returned!`,
        timer: 1600,
        showConfirmButton: false,
      });

      loadOrders();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Return Error",
        text: error.response?.data?.message || "Could not return this order.",
      });
      loadOrders();
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
          <h2 className="text-xl font-bold text-slate-700">
            Loading Orders...
          </h2>
        </div>
      </div>
    );
  }

  const allTimeTotal = groupedOrders.reduce(
    (sum, day) => sum + Number(day.totalValue || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                2 PM - 2 PM Business Cycle
              </span>
              {isSyncing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-200">
                  <FaSyncAlt className="animate-spin" size={9} />
                  Syncing Latest...
                </span>
              )}
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
              Orders Management
            </h1>
            <p className="text-xs text-slate-500">
              Instant cached view. Print combined daily invoice or 1-click Full
              Day Order Return!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadOrders()}
              className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100 shadow-2xs transition"
              title="Refresh Orders"
            >
              <FaSyncAlt
                className={isSyncing ? "animate-spin text-emerald-600" : ""}
              />
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-2xs text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Active Orders
              </span>
              <span className="text-lg font-black text-slate-800">
                {orders.length} Orders
              </span>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 shadow-2xs text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                Total Revenue
              </span>
              <span className="text-lg font-black text-emerald-800">
                ৳{" "}
                {allTimeTotal.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {groupedOrders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <FaBoxes className="mx-auto text-5xl text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-700">
              No Orders Found
            </h2>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedOrders.map((dayGroup, groupIdx) => {
              const isCollapsed = expandedDays[dayGroup.cycleKey] === false;

              return (
                <div
                  key={dayGroup.cycleKey}
                  className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden"
                >
                  {/* DAY BANNER */}
                  <div
                    onClick={() => toggleDay(dayGroup.cycleKey)}
                    className="cursor-pointer bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white transition hover:opacity-95"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <FaClock size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                              Day #{groupedOrders.length - groupIdx}
                            </span>
                            <span className="text-xs text-slate-400">
                              24-Hr Cycle (2:00 PM - 2:00 PM)
                            </span>
                          </div>
                          <h2 className="text-base font-black tracking-wide sm:text-lg">
                            {dayGroup.label}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Unique Invoices
                          </span>
                          <span className="text-base font-black text-white">
                            {dayGroup.mergedOrders.length} Invoices
                          </span>
                        </div>

                        <div className="text-right border-l border-slate-700 pl-4 sm:pl-6">
                          <span className="block text-[10px] font-bold uppercase text-emerald-400">
                            Day&apos;s Total Value
                          </span>
                          <span className="text-xl font-black text-emerald-400 sm:text-2xl">
                            ৳{" "}
                            {dayGroup.totalValue.toLocaleString("en-BD", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400"
                        >
                          {isCollapsed ? (
                            <FaChevronDown size={14} />
                          ) : (
                            <FaChevronUp size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ORDERS LIST IN THIS CYCLE */}
                  {!isCollapsed && (
                    <div className="p-5 sm:p-6 space-y-4 bg-slate-50/50">
                      {dayGroup.mergedOrders.map((order) => {
                        const isExpanded = !!expandedOrders[order._id];
                        const isMultiOrder = order.orderCount > 1;

                        const totalQuantity = (order.items || []).reduce(
                          (sum, it) => sum + Number(it.quantity || 0),
                          0,
                        );

                        return (
                          <div
                            key={order._id}
                            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition duration-200 hover:shadow-md"
                          >
                            {/* CLICKABLE CARD HEADER */}
                            <div
                              onClick={() => toggleOrderDetails(order._id)}
                              className="cursor-pointer p-4 sm:p-5 transition hover:bg-slate-50/70"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3.5">
                                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <FaReceipt size={18} />
                                  </div>

                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-base font-black text-slate-900">
                                        {order.customerName}
                                      </h3>

                                      {isMultiOrder ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-800 border border-purple-200">
                                          <FaLayerGroup size={10} />
                                          {order.orderCount} Orders Today
                                        </span>
                                      ) : (
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                          1 Single Order
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                                        <FaPhoneAlt className="text-slate-400 text-[10px]" />
                                        {order.phone || "No phone"}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {order.items?.length || 0} medicines (
                                        {totalQuantity} units)
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {new Date(
                                          order.orderDate,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                                  <div className="text-left sm:text-right">
                                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                                      Total Invoice Payable
                                    </span>
                                    <span className="text-xl font-black text-emerald-700">
                                      ৳{" "}
                                      {Number(order.grandTotal).toLocaleString(
                                        "en-BD",
                                        { minimumFractionDigits: 2 },
                                      )}
                                    </span>
                                  </div>

                                  {/* 1-CLICK FULL DAY ORDER RETURN BUTTON */}
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleFullCustomerReturn(order, e)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 shadow-2xs transition hover:bg-red-600 hover:text-white active:scale-95"
                                    title="এই কাস্টমারের সারাদিনের সব অর্ডার এক ক্লিকে ফুল রিটার্ন করুন"
                                  >
                                    <FaUndo size={11} />
                                    <span>Full Day Return</span>
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <span className="hidden sm:inline rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                                      {isExpanded ? "Hide" : "Details"}
                                    </span>
                                    <button
                                      type="button"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                                    >
                                      {isExpanded ? (
                                        <FaChevronUp size={12} />
                                      ) : (
                                        <FaChevronDown size={12} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* FULL DETAILS VIEW */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/80 p-5 space-y-5">
                                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                                  <div>
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                      Delivery Address & Info
                                    </h4>
                                    <div className="space-y-1.5 text-xs text-slate-700">
                                      <p className="flex items-start gap-2">
                                        <FaMapMarkerAlt className="mt-0.5 text-slate-400 shrink-0" />
                                        <span>
                                          <b>Address:</b>{" "}
                                          {order.address ||
                                            "No delivery address"}
                                        </span>
                                      </p>
                                      <p className="text-slate-500">
                                        <b>Email:</b> {order.customerEmail}
                                      </p>
                                      {order.notes?.length > 0 && (
                                        <div className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900 border border-amber-200">
                                          <b>Customer Instructions / Notes:</b>
                                          <ul className="list-disc list-inside mt-0.5">
                                            {order.notes.map((n, i) => (
                                              <li key={i}>{n}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                      Update Order Status
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500">
                                          Payment Status
                                        </label>
                                        <select
                                          value={order.paymentStatus}
                                          onChange={(e) =>
                                            updatePayment(order, e.target.value)
                                          }
                                          className={`mt-1 w-full rounded-xl border p-2 text-xs font-bold outline-none ${
                                            order.paymentStatus === "Paid"
                                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                              : "border-red-200 bg-red-50 text-red-600"
                                          }`}
                                        >
                                          <option value="Unpaid">Unpaid</option>
                                          <option value="Paid">Paid</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500">
                                          Delivery Status
                                        </label>
                                        <select
                                          value={order.orderStatus}
                                          onChange={(e) =>
                                            updateStatus(order, e.target.value)
                                          }
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold outline-none focus:border-emerald-500 focus:bg-white"
                                        >
                                          <option value="Pending">
                                            Pending
                                          </option>
                                          <option value="Processing">
                                            Processing
                                          </option>
                                          <option value="Completed">
                                            Completed
                                          </option>
                                          <option value="Cancelled">
                                            Cancelled
                                          </option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* প্রতি অর্ডারের আলাদা আলাদা ইনভয়েস ও একক অর্ডার ফুল রিটার্ন বাটন */}
                                {isMultiOrder && (
                                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
                                    <h4 className="text-xs font-black uppercase text-purple-950 mb-2.5 flex items-center gap-1.5">
                                      <FaPrint className="text-purple-700" />
                                      Individual Orders Today (
                                      {order.individualOrders?.length} Orders)
                                    </h4>
                                    <p className="text-[11px] text-purple-800 mb-3">
                                      নিচে এই কাস্টমারের আজকের প্রতিটি আলাদা
                                      অর্ডারের তালিকা দেওয়া হলো। আপনি চাইলে
                                      যেকোনো অর্ডারের একক মেমো প্রিন্ট বা একক
                                      অর্ডার রিটার্ন করতে পারেন:
                                    </p>

                                    <div className="grid gap-2.5 sm:grid-cols-2">
                                      {order.individualOrders?.map(
                                        (singleOrd, sIdx) => (
                                          <div
                                            key={singleOrd._id || sIdx}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-white p-3 shadow-2xs"
                                          >
                                            <div>
                                              <div className="flex items-center gap-1.5">
                                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-800">
                                                  #{sIdx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800">
                                                  {singleOrd.items?.length || 0}{" "}
                                                  Products
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                                Time:{" "}
                                                {new Date(
                                                  singleOrd.orderDate,
                                                ).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })}{" "}
                                                • Total: ৳{singleOrd.grandTotal}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleReturnSingleOrder(
                                                    singleOrd,
                                                    sIdx,
                                                  )
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-600 transition hover:bg-red-600 hover:text-white"
                                              >
                                                <FaUndo size={9} />
                                                <span>Return #{sIdx + 1}</span>
                                              </button>

                                              <Link
                                                to={`/dashboard/invoice/${singleOrd._id}`}
                                                state={{
                                                  combinedOrder: singleOrd,
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-purple-700"
                                              >
                                                <FaFileInvoice size={11} />
                                                <span>Invoice</span>
                                              </Link>
                                            </div>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* COMBINED MEDICINE ITEMS LIST */}
                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                      Medicines in this Combined Invoice (
                                      {order.items?.length || 0})
                                    </h4>
                                    <span className="text-xs font-bold text-emerald-700">
                                      Total Units: {totalQuantity} pcs
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                                    <table className="w-full text-left text-xs">
                                      <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase text-slate-400">
                                        <tr>
                                          <th className="px-4 py-3">
                                            Medicine Name
                                          </th>
                                          <th className="px-4 py-3">Company</th>
                                          <th className="px-4 py-3 text-center">
                                            Total Quantity
                                          </th>
                                          <th className="px-4 py-3 text-right">
                                            Unit Price
                                          </th>
                                          <th className="px-4 py-3 text-right">
                                            Subtotal
                                          </th>
                                          <th className="px-4 py-3 text-center">
                                            Action
                                          </th>
                                        </tr>
                                      </thead>

                                      <tbody className="divide-y divide-slate-100">
                                        {(order.items || []).map(
                                          (item, itemIdx) => (
                                            <tr
                                              key={itemIdx}
                                              className="hover:bg-slate-50/60"
                                            >
                                              <td className="px-4 py-3 font-bold text-slate-800">
                                                {item.medicineName || item.name}
                                              </td>
                                              <td className="px-4 py-3 text-slate-400">
                                                {item.company ||
                                                  "Certified Generic"}
                                              </td>
                                              <td className="px-4 py-3 text-center font-bold text-slate-700">
                                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-100">
                                                  {item.quantity} pcs
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-right text-slate-600">
                                                ৳{" "}
                                                {Number(item.unitPrice).toFixed(
                                                  2,
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-right font-black text-emerald-700">
                                                ৳{" "}
                                                {Number(
                                                  item.totalPrice,
                                                ).toFixed(2)}
                                              </td>
                                              <td className="px-4 py-3 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleReturnItem(
                                                      order,
                                                      item,
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600 transition hover:bg-red-600 hover:text-white"
                                                >
                                                  <FaUndo size={9} />
                                                  <span>Return</span>
                                                </button>
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* COMBINED INVOICE FOOTER */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                                  <div className="text-xs text-slate-500">
                                    {isMultiOrder ? (
                                      <span>
                                        Merged Database Order IDs:{" "}
                                        <b>
                                          {order.originalOrderIds.join(", ")}
                                        </b>
                                      </span>
                                    ) : (
                                      <span>
                                        Order ID: <b>{order._id}</b>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleFullCustomerReturn(order, e)
                                      }
                                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-xs transition hover:bg-red-700 active:scale-95"
                                    >
                                      <FaUndo />
                                      <span>
                                        {isMultiOrder
                                          ? `Full Return All (${order.orderCount} Orders)`
                                          : "Full Order Return"}
                                      </span>
                                    </button>

                                    <Link
                                      to={`/dashboard/invoice/${order._id}`}
                                      state={{ combinedOrder: order }}
                                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white shadow-xs transition hover:bg-slate-800"
                                    >
                                      <FaFileInvoice className="text-emerald-400" />
                                      <span>
                                        {isMultiOrder
                                          ? "Print Combined 1 Invoice"
                                          : "Print Invoice"}
                                      </span>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

export default AllOrders;
