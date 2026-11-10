import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

const ORDERS_CACHE_KEY = "novacare_orders_cache_v1";

function InvoiceDetails() {
  const { id } = useParams();
  const location = useLocation();

  // ১. AllOrders থেকে পাঠানো ডাটা অথবা রিলোড দিলে sessionStorage থেকে রিকভার করা
  const [order, setOrder] = useState(() => {
    if (location.state?.combinedOrder) {
      return location.state.combinedOrder;
    }
    if (id) {
      try {
        const savedSession = sessionStorage.getItem(`novacare_invoice_${id}`);
        if (savedSession) return JSON.parse(savedSession);
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => !order);

  // ============================================
  // SAVE PASSED ORDER TO SESSION & LOAD IF NEEDED
  // ============================================
  useEffect(() => {
    if (location.state?.combinedOrder) {
      const passed = location.state.combinedOrder;
      setOrder(passed);
      setLoading(false);
      if (id) {
        try {
          sessionStorage.setItem(
            `novacare_invoice_${id}`,
            JSON.stringify(passed),
          );
        } catch {
          // ignore
        }
      }
      return;
    }

    if (order) {
      setLoading(false);
      return;
    }

    if (!id) {
      setLoading(false);
      return;
    }

    loadOrder();
  }, [id, location.state]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/orders/${id}`);

      if (res.data?.success && res.data?.order) {
        setOrder(res.data.order);
      } else if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        // ক্যাশ থেকে ফলব্যাক চেক
        const cached = localStorage.getItem(ORDERS_CACHE_KEY);
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((o) => String(o._id) === String(id));
          if (found) {
            setOrder(found);
            return;
          }
        }
        setOrder(null);
      }
    } catch (error) {
      console.error("Invoice Load Error:", error);
      // অফলাইন বা এরর হলে লোকাল ক্যাশ থেকে খোঁজা
      try {
        const cached = localStorage.getItem(ORDERS_CACHE_KEY);
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((o) => String(o._id) === String(id));
          if (found) {
            setOrder(found);
            return;
          }
        }
      } catch {
        // ignore
      }
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PRINT ACTION
  // ============================================
  const handlePrint = () => {
    window.print();
  };

  // ============================================
  // DOWNLOAD PDF (2-PASS EXACT HEIGHT + CRISP PURE BLACK)
  // ============================================
  const downloadPDF = () => {
    if (!order) return;

    try {
      const items = order.items || [];
      const pageWidth = 80;
      const margin = 4;
      const contentWidth = pageWidth - margin * 2;

      const invoiceNumber =
        order.invoiceNo ||
        order.orderNo ||
        `INV-${String(order._id || "")
          .slice(-6)
          .toUpperCase()}`;

      const orderDate = order.orderDate
        ? new Date(order.orderDate)
        : new Date();

      const customerName = order.customerName || "Walk-in Customer";
      const customerPhone = order.phone || "N/A";
      const customerAddress = order.address || "N/A";
      const paymentMethod =
        order.paymentMethod || order.paymentStatus || "Cash on Delivery";

      const totalUnits = items.reduce(
        (sum, it) => sum + Number(it.quantity || 0),
        0,
      );

      const subtotal = items.reduce((sum, item) => {
        const unitPrice =
          Number(item.unitPrice) ||
          Number(item.sellingPrice) ||
          Number(item.price) ||
          0;
        const quantity = Number(item.quantity) || 0;
        const total = Number(item.totalPrice) || unitPrice * quantity;
        return sum + total;
      }, 0);

      const discount = Number(order.discount || 0);
      const grandTotal = Number(order.grandTotal) || subtotal - discount;
      const totalPaid =
        Number(order.totalPaid) ||
        Number(order.paidAmount) ||
        (order.paymentStatus === "Paid" ? grandTotal : 0);
      const dueAmount = Math.max(grandTotal - totalPaid, 0);

      // রিসিপ্ট ড্র করার ফাংশন (Pass 1 এ উচ্চতা মাপে, Pass 2 তে আসল PDF আঁকে)
      const renderReceipt = (pdf) => {
        let y = 7.5;

        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);

        // HEADER
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15.5);
        pdf.text("NOVACARE", pageWidth / 2, y, { align: "center" });

        y += 4.8;
        pdf.setFontSize(8);
        pdf.text("Pharmacy Management System", pageWidth / 2, y, {
          align: "center",
        });

        y += 3.8;
        pdf.text("WhatsApp: 01620316751", pageWidth / 2, y, {
          align: "center",
        });

        y += 3.6;
        pdf.setLineWidth(0.4);
        pdf.line(margin, y, pageWidth - margin, y);

        y += 4.6;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text("RETAIL INVOICE", pageWidth / 2, y, { align: "center" });

        if (order.orderCount && order.orderCount > 1) {
          y += 3.8;
          pdf.setFontSize(7.5);
          pdf.text(
            `[COMBINED: ${order.orderCount} ORDERS IN 1 INVOICE]`,
            pageWidth / 2,
            y,
            { align: "center" },
          );
        }

        y += 4.6;
        pdf.setFontSize(7.8);
        pdf.text(`ORDER: ${invoiceNumber}`, margin, y);

        y += 3.8;
        pdf.text(
          `DATE: ${orderDate.toLocaleDateString()}   TIME: ${orderDate.toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" },
          )}`,
          margin,
          y,
        );

        y += 4;
        const customerText = pdf.splitTextToSize(
          `CUSTOMER: ${customerName}`,
          contentWidth,
        );
        pdf.text(customerText, margin, y);
        y += 3.6 * customerText.length;

        pdf.text(`PHONE: ${customerPhone}`, margin, y);
        y += 3.8;

        const addressText = pdf.splitTextToSize(
          `ADDRESS: ${customerAddress}`,
          contentWidth,
        );
        pdf.text(addressText, margin, y);
        y += 3.6 * addressText.length;

        if (order.note || (order.notes && order.notes.length > 0)) {
          const noteStr = order.notes?.length
            ? order.notes.join(" | ")
            : order.note;
          const noteLines = pdf.splitTextToSize(
            `NOTE: ${noteStr}`,
            contentWidth,
          );
          pdf.text(noteLines, margin, y);
          y += 3.5 * noteLines.length;
        }

        y += 1.5;
        pdf.setLineWidth(0.4);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 4;

        // TABLE HEADER (Non-overlapping columns)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text("SL", margin, y);
        pdf.text("ITEM", margin + 5.5, y);
        pdf.text("RATE", 50, y, { align: "right" });
        pdf.text("QTY", 59, y, { align: "right" });
        pdf.text("TOTAL", 76, y, { align: "right" });

        y += 2;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 3.8;

        // MEDICINES ROWS
        items.forEach((item, index) => {
          const unitPrice =
            Number(item.unitPrice) ||
            Number(item.sellingPrice) ||
            Number(item.price) ||
            0;
          const quantity = Number(item.quantity) || 0;
          const totalPrice = Number(item.totalPrice) || unitPrice * quantity;
          const medicineName = String(
            item.medicineName || item.name || "Medicine",
          ).toUpperCase();

          // Max width 30mm so ITEM text never touches RATE column
          const itemLines = pdf.splitTextToSize(medicineName, 30);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.6);
          pdf.text(`${index + 1}.`, margin, y);
          pdf.text(itemLines, margin + 5.5, y);
          pdf.text(unitPrice.toFixed(2), 50, y, { align: "right" });
          pdf.text(String(quantity), 59, y, { align: "right" });
          pdf.text(totalPrice.toFixed(2), 76, y, { align: "right" });

          y += itemLines.length * 3.4;

          if (item.company) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(6.5);
            const companyLines = pdf.splitTextToSize(String(item.company), 30);
            pdf.text(companyLines, margin + 5.5, y);
            y += companyLines.length * 3;
          }

          y += 1.4;
        });

        pdf.setLineWidth(0.4);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 4;

        // TOTALS
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(`Total Items: ${items.length} (${totalUnits} pcs)`, margin, y);
        y += 4;

        pdf.setFontSize(8.2);
        pdf.text("Subtotal:", 42, y);
        pdf.text(`TK ${subtotal.toFixed(2)}`, 76, y, { align: "right" });

        if (discount > 0) {
          y += 4;
          pdf.text("Discount:", 42, y);
          pdf.text(`- TK ${discount.toFixed(2)}`, 76, y, { align: "right" });
        }

        y += 4.8;
        pdf.setFontSize(10);
        pdf.text("NET AMOUNT:", 34, y);
        pdf.text(`TK ${grandTotal.toFixed(2)}`, 76, y, { align: "right" });

        y += 4.2;
        pdf.setFontSize(8.2);
        pdf.text("Total Paid:", 42, y);
        pdf.text(`TK ${totalPaid.toFixed(2)}`, 76, y, { align: "right" });

        y += 4;
        pdf.text("Due Amount:", 42, y);
        pdf.text(`TK ${dueAmount.toFixed(2)}`, 76, y, { align: "right" });

        y += 3.8;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 4.2;

        pdf.setFontSize(8.2);
        pdf.text(`Paid By: ${paymentMethod}`, pageWidth / 2, y, {
          align: "center",
        });

        y += 5;
        pdf.setFontSize(8.2);
        pdf.text("Thank you for choosing NovaCare!", pageWidth / 2, y, {
          align: "center",
        });

        y += 3.6;
        pdf.setFontSize(6.8);
        pdf.text("Powered and Managed by NovaCare", pageWidth / 2, y, {
          align: "center",
        });

        return y + 6;
      };

      // Pass 1: Measure exact required height
      const measureDoc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 500],
      });
      const exactHeight = Math.max(145, Math.ceil(renderReceipt(measureDoc)));

      // Pass 2: Render final PDF with exact height
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, exactHeight],
      });
      renderReceipt(pdf);

      pdf.save(`Invoice-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-emerald-600" />
          <h2 className="mt-3 text-lg font-bold text-gray-700">
            Loading Invoice...
          </h2>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg max-w-sm w-full">
          <div className="text-4xl mb-2">📄</div>
          <h2 className="text-xl font-bold text-red-600">Invoice Not Found</h2>
          <p className="mt-2 text-xs text-gray-600">
            Could not retrieve order details.
          </p>
          <Link
            to="/dashboard/all-orders"
            className="mt-4 inline-block rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const isCombined = Boolean(order.orderCount && order.orderCount > 1);

  const invoiceNumber =
    order.invoiceNo ||
    order.orderNo ||
    `INV-${String(order._id || "")
      .slice(-6)
      .toUpperCase()}`;

  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();

  const totalUnits = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0),
    0,
  );

  const subtotal = items.reduce((sum, item) => {
    const unitPrice =
      Number(item.unitPrice) ||
      Number(item.sellingPrice) ||
      Number(item.price) ||
      0;
    const quantity = Number(item.quantity) || 0;
    const total = Number(item.totalPrice) || unitPrice * quantity;
    return sum + total;
  }, 0);

  const discount = Number(order.discount || 0);
  const grandTotal = Number(order.grandTotal) || subtotal - discount;
  const totalPaid =
    Number(order.totalPaid) ||
    Number(order.paidAmount) ||
    (order.paymentStatus === "Paid" ? grandTotal : 0);
  const dueAmount = Math.max(grandTotal - totalPaid, 0);
  const paymentMethod =
    order.paymentMethod || order.paymentStatus || "Cash on Delivery";

  return (
    <>
      <div className="invoice-page min-h-screen bg-slate-200 px-3 py-6">
        {/* TOP NAVIGATION & PRINT ACTIONS (HIDDEN IN PRINT) */}
        <div className="print-hidden mx-auto mb-3 flex max-w-[380px] items-center justify-between gap-2">
          <Link
            to="/dashboard/all-orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-slate-800 shadow-xs hover:bg-slate-100"
          >
            ← Back to Orders
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
            >
              🖨️ Print
            </button>
            <button
              onClick={downloadPDF}
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              📄 PDF
            </button>
          </div>
        </div>

        {/* COMBINED BADGE ON SCREEN */}
        {isCombined && (
          <div className="print-hidden mx-auto mb-3 max-w-[380px] rounded-xl bg-purple-700 p-3 text-center text-xs font-bold text-white shadow-md">
            ✨ {order.orderCount} Orders from 2 PM - 2 PM cycle combined into
            this single invoice!
          </div>
        )}

        {/* =====================================================
            INVOICE CONTAINER (100% Pure Black & High Contrast)
        ===================================================== */}
        <div
          id="invoice"
          className="invoice mx-auto w-full max-w-[380px] bg-white px-4 py-5 text-black shadow-lg rounded-xl"
        >
          {/* HEADER */}
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-wider text-black">
              NOVACARE
            </h1>
            <p className="mt-0.5 text-xs font-bold text-black">
              Pharmacy Management System
            </p>
            <p className="text-xs font-bold text-black">
              WhatsApp: 01620316751
            </p>
          </div>

          <div className="my-2.5 border-t-2 border-dashed border-black" />

          {/* TITLE */}
          <div className="text-center">
            <h2 className="text-lg font-black tracking-tight text-black">
              RETAIL INVOICE
            </h2>
            {isCombined ? (
              <p className="mt-0.5 text-[11px] font-black text-black uppercase">
                [COMBINED 1-INVOICE: {order.orderCount} ORDERS]
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] font-bold text-black uppercase">
                [SINGLE ORDER INVOICE]
              </p>
            )}
          </div>

          {/* ORDER & CUSTOMER INFO */}
          <div className="mt-3 space-y-1 text-xs font-bold text-black">
            <div className="flex justify-between">
              <span>ORDER: {invoiceNumber}</span>
              <span>{orderDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>
                TIME:{" "}
                {orderDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span>PHONE: {order.phone || "N/A"}</span>
            </div>
            <div className="pt-1 border-t border-dotted border-black">
              <p className="break-words">
                <span className="font-black">CUSTOMER:</span>{" "}
                {order.customerName || "Walk-in Customer"}
              </p>
              <p className="break-words mt-0.5 leading-snug">
                <span className="font-black">ADDRESS:</span>{" "}
                {order.address || "N/A"}
              </p>
              {(order.note || (order.notes && order.notes.length > 0)) && (
                <p className="break-words mt-0.5 leading-snug">
                  <span className="font-black">NOTE:</span>{" "}
                  {order.notes?.length ? order.notes.join(" | ") : order.note}
                </p>
              )}
            </div>
          </div>

          <div className="my-2.5 border-t-2 border-dashed border-black" />

          {/* TABLE HEADER */}
          <div className="grid grid-cols-[22px_1fr_46px_28px_56px] gap-1 text-[11px] font-black uppercase text-black">
            <div>SL</div>
            <div>ITEM</div>
            <div className="text-right">RATE</div>
            <div className="text-right">QTY</div>
            <div className="text-right">TOTAL</div>
          </div>

          <div className="my-1.5 border-t-2 border-dashed border-black" />

          {/* MEDICINES LIST */}
          <div className="divide-y divide-dotted divide-black">
            {items.map((item, index) => {
              const unitPrice =
                Number(item.unitPrice) ||
                Number(item.sellingPrice) ||
                Number(item.price) ||
                0;
              const quantity = Number(item.quantity) || 0;
              const totalPrice =
                Number(item.totalPrice) || unitPrice * quantity;

              return (
                <div
                  key={item._id || item.medicineId || index}
                  className="grid grid-cols-[22px_1fr_46px_28px_56px] gap-1 py-1.5 text-xs font-bold text-black items-start"
                >
                  <div className="font-black">{index + 1}.</div>

                  <div className="min-w-0 pr-1">
                    <p className="break-words font-black uppercase text-black leading-tight">
                      {item.medicineName || item.name || "Medicine"}
                    </p>
                    {item.company && (
                      <p className="text-[10px] font-bold text-black mt-0.5">
                        {item.company}
                      </p>
                    )}
                  </div>

                  <div className="text-right font-bold">
                    {unitPrice.toFixed(2)}
                  </div>
                  <div className="text-right font-black">{quantity}</div>
                  <div className="text-right font-black">
                    {totalPrice.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="my-2 border-t-2 border-dashed border-black" />

          {/* TOTAL AMOUNTS */}
          <div className="mt-2 space-y-1 text-xs font-bold text-black">
            <div className="flex justify-between">
              <span>Total Items:</span>
              <span>
                {items.length} items ({totalUnits} pcs)
              </span>
            </div>

            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>TK {subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>- TK {discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black border-y-2 border-dashed border-black py-1.5 my-1">
              <span>NET AMOUNT:</span>
              <span>TK {grandTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Total Paid:</span>
              <span>TK {totalPaid.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-black">
              <span>Due Amount:</span>
              <span>TK {dueAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="my-2.5 border-t-2 border-dashed border-black" />

          {/* PAYMENT METHOD */}
          <div className="text-center text-xs font-black text-black">
            Paid By: {paymentMethod}
          </div>

          <div className="my-2.5 border-t-2 border-dashed border-black" />

          {/* FOOTER */}
          <div className="text-center text-black">
            <p className="text-xs font-black">
              Thank you for choosing NovaCare!
            </p>
            <p className="mt-0.5 text-[10px] font-bold">
              Powered and Managed by NovaCare
            </p>
          </div>
        </div>

        {/* BOTTOM PRINT & DOWNLOAD BUTTONS */}
        <div className="print-hidden mx-auto mt-5 flex max-w-[380px] gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-md transition hover:bg-slate-800"
          >
            🖨️ Print Invoice
          </button>

          <button
            onClick={downloadPDF}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700"
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* =====================================================
          ULTRA-CRISP THERMAL PRINT CSS (MULTI-ITEM SAFE, NO CUTOFF)
      ===================================================== */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }

          * {
            box-sizing: border-box;
            color: #000000 !important;
            border-color: #000000 !important;
            background: transparent !important;
            text-shadow: none !important;
            -webkit-font-smoothing: none !important;
            font-smoothing: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Dashboard এর স্ক্রল কন্টেইনার যাতে লম্বা মেমো কেটে না দেয় */
          html,
          body,
          #root,
          main,
          .invoice-page {
            width: 80mm !important;
            max-width: 80mm !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            background: #ffffff !important;
          }

          aside,
          header,
          nav,
          .print-hidden {
            display: none !important;
            visibility: hidden !important;
          }

          #invoice {
            position: static !important;
            width: 74mm !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
            padding: 2mm 2.5mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            page-break-inside: auto !important;
            font-family: "Courier New", Courier, Arial, sans-serif !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            line-height: 1.35 !important;
          }

          #invoice h1 {
            font-size: 20px !important;
            font-weight: 900 !important;
          }

          #invoice h2 {
            font-size: 14px !important;
            font-weight: 900 !important;
          }

          #invoice p,
          #invoice span,
          #invoice div {
            font-weight: 700 !important;
            color: #000000 !important;
            overflow-wrap: anywhere !important;
          }
        }
      `}</style>
    </>
  );
}

export default InvoiceDetails;
