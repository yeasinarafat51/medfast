import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import useAuth from "../../../hooks/useAuth";
import useCart from "../../../hooks/useCart";
import medisin from "../../../imges/medicine.jpg";

function AllItemMedicine() {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [quantities, setQuantities] = useState({});

  const limit = 8;

  // ===============================
  // Load Medicines
  // ===============================

  const loadMedicine = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        ` http://localhost:5000/api/medicines?search=${search}&page=${page}&limit=${limit}&sort=asc`,
      );

      setMedicines(res.data.medicines);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Failed to Load Medicines",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicine();
  }, [search, page]);

  // ===============================
  // Quantity
  // ===============================

  const increaseQty = (medicine) => {
    setQuantities((prev) => {
      const current = prev[medicine._id] || 1;

      if (current >= medicine.stock) return prev;

      return {
        ...prev,
        [medicine._id]: current + 1,
      };
    });
  };

  const decreaseQty = (medicine) => {
    setQuantities((prev) => {
      const current = prev[medicine._id] || 1;

      if (current <= 1) return prev;

      return {
        ...prev,
        [medicine._id]: current - 1,
      };
    });
  };

  // ===============================
  // Add To Cart
  // ===============================

  const handleAddToCart = (medicine) => {
    const qty = quantities[medicine._id] || 1;

    addToCart({
      ...medicine,
      quantity: qty,
    });

    Swal.fire({
      icon: "success",
      title: "Added To Cart",
      text: `${qty} item added successfully`,
      timer: 1200,
      showConfirmButton: false,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">All Medicines</h1>

          <p className="text-gray-500">
            Browse medicines and add them to your cart.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search medicine..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600 md:w-96"
        />
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <>
          {/* Medicine Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
            {" "}
            {medicines.map((medicine) => (
              <div
                key={medicine._id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Mobile Layout */}
                <div className="flex p-3 lg:hidden">
                  {/* Image */}
                  <img
                    src={medicine.image || medisin}
                    alt={medicine.medicineName}
                    className="h-24 w-24 rounded-xl object-cover"
                  />

                  {/* Content */}
                  <div className="ml-3 flex flex-1 flex-col justify-between">
                    <div className="  gap-4">
                      <div className=" items-center justify-between gap-2">
                        <h2 className="line-clamp-1 flex-1 text-base font-bold text-gray-800">
                          {medicine.medicineName}
                        </h2>

                        <div className="flex">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 whitespace-nowrap">
                            {medicine.category}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500">
                          {medicine.company}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Selling Price
                        </span>

                        <span className="text-xl font-bold text-green-600">
                          ৳ {medicine.sellingPrice}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                          MRP ৳ {medicine.mrpePrice}
                        </span>

                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">
                          {medicine.bikriPercent}% OFF
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            medicine.stock > 10
                              ? "bg-green-100 text-green-700"
                              : medicine.stock > 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          Stock: {medicine.stock}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQty(medicine)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"
                        >
                          -
                        </button>

                        <span className="w-6 text-center font-bold">
                          {quantities[medicine._id] || 1}
                        </span>

                        <button
                          onClick={() => increaseQty(medicine)}
                          disabled={
                            (quantities[medicine._id] || 1) >= medicine.stock
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white disabled:bg-gray-400"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleAddToCart(medicine)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:block">
                  <div className="relative overflow-hidden">
                    <img
                      src={medicine.image || medisin}
                      alt={medicine.medicineName}
                      className="h-56 w-full object-cover transition duration-500 hover:scale-110"
                    />

                    <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      {medicine.category}
                    </span>

                    <span
                      className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${
                        medicine.stock > 10
                          ? "bg-green-600"
                          : medicine.stock > 0
                            ? "bg-yellow-500"
                            : "bg-red-600"
                      }`}
                    >
                      Stock {medicine.stock}
                    </span>
                  </div>

                  <div className="p-5">
                    <h2 className="line-clamp-1 text-xl font-bold">
                      {medicine.medicineName}
                    </h2>

                    <p className="text-gray-500">{medicine.company}</p>

                    <div className="mt-4 rounded-xl bg-gray-50 p-3">
                      <div className="flex justify-between">
                        <span>MRP</span>

                        <span className="line-through text-gray-400">
                          ৳ {medicine.mrpePrice}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between">
                        <span>Discount</span>

                        <span className="rounded-full bg-red-100 px-2 py-1 text-red-600">
                          {medicine.bikriPercent}% OFF
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between">
                        <span>Selling Price</span>

                        <span className="text-2xl font-bold text-green-600">
                          ৳ {medicine.sellingPrice}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-4">
                      <button
                        onClick={() => decreaseQty(medicine)}
                        className="h-10 w-10 rounded-full bg-red-500 text-xl text-white"
                      >
                        -
                      </button>

                      <span className="w-10 text-center text-xl font-bold">
                        {quantities[medicine._id] || 1}
                      </span>

                      <button
                        onClick={() => increaseQty(medicine)}
                        disabled={
                          (quantities[medicine._id] || 1) >= medicine.stock
                        }
                        className="h-10 w-10 rounded-full bg-green-600 text-xl text-white disabled:bg-gray-400"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleAddToCart(medicine)}
                      className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                      🛒 Add To Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>{" "}
          {/* Pagination */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg bg-gray-200 px-5 py-2 font-semibold transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <div className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white">
              {page}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AllItemMedicine;
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function InvoiceDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await axios.get(
        ` http://localhost:5000/api/orders/${id}`,
      );

      if (res.data.success) {
        setOrder(res.data.order);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const input = document.getElementById("invoice");

    const canvas = await html2canvas(input);

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const width = 210;

    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);

    pdf.save(`Invoice-${order._id}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <h2 className="text-3xl font-bold">Loading Invoice...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen items-center justify-center">
        <h2 className="text-3xl font-bold text-red-600">Invoice Not Found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div
        id="invoice"
        className="mx-auto max-w-6xl rounded-xl bg-white p-8 shadow-lg"
      >
        {/* Header */}

        <div className="flex justify-between border-b pb-6">
          <div>
            <h1 className="text-4xl font-bold text-blue-700">💊 NovaCare</h1>

            <p>Pharmacy Management System</p>
          </div>

          <div className="text-right">
            <h2 className="text-3xl font-bold">INVOICE</h2>

            <p>
              <strong>Invoice :</strong>

              {order.invoiceNo || `INV-${order._id.slice(-6)}`}
            </p>

            <p>
              <strong>Date :</strong>

              {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Customer */}

        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold mb-3">Customer</h2>

            <p>Name : {order.customerName}</p>

            <p>Email : {order.customerEmail}</p>

            <p>Phone : {order.phone}</p>

            <p>Address : {order.address}</p>
          </div>

          {/* <div>
            <h2 className="text-xl font-bold mb-3">Order Status</h2>

            <p>
              Payment :
              <span className="ml-2 font-bold">{order.paymentStatus}</span>
            </p>

            <p>
              Status :
              <span className="ml-2 font-bold">{order.orderStatus}</span>
            </p>
          </div> */}
        </div>

        {/* Table */}

        <div className="mt-10 overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th>#</th>
                <th>Medicine</th>
                {/* <th>Company</th> */}
                {/* <th>MRP</th> */}
                {/* <th>Discount</th> */}
                <th>Selling Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {(order.items || []).map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>

                  <td>{item.medicineName}</td>

                  {/* <td>{item.company}</td> */}

                  {/* <td>৳ {item.mrp}</td> */}

                  {/* <td>{item.discount}%</td> */}

                  {/* <td>৳ {item.unitPrice}</td> */}

                  <td>{item.quantity}</td>

                  <td>৳ {item.totalPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}

        <div className="mt-10 flex justify-end">
          <div className="w-80 rounded-lg border p-6">
            <div className="mb-3 flex justify-between">
              <span>Total Items</span>

              <span>{order.items?.length || 0}</span>
            </div>

            <div className="mb-3 flex justify-between">
              <span>Payment</span>

              <span>{order.paymentStatus}</span>
            </div>

            <hr />

            <div className="mt-3 flex justify-between text-2xl font-bold">
              <span>Grand Total</span>

              <span>৳ {order.grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}

        <div className="mt-10 flex gap-4">
          <button
            onClick={() => window.print()}
            className="rounded bg-blue-600 px-6 py-3 text-white"
          >
            Print Invoice
          </button>

          <button
            onClick={downloadPDF}
            className="rounded bg-green-600 px-6 py-3 text-white"
          >
            Download PDF
          </button>
        </div>

        <div className="mt-12 border-t pt-6 text-center text-gray-500">
          Thank you for choosing MedPharm.
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetails;
