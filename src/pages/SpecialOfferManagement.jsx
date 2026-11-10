import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaTag,
  FaCalendarAlt,
} from "react-icons/fa";

const API_URL = " http://localhost:5000";

const initialForm = {
  medicineId: "",
  offerPrice: "",
  startDate: "",
  endDate: "",
  isActive: true,
  order: 1,
};

const SpecialOfferManagement = () => {
  const [medicines, setMedicines] = useState([]);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =====================================================
  // LOAD MEDICINES
  // =====================================================

  const loadMedicines = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/medicines`);

      setMedicines(response.data?.medicines || []);
    } catch (error) {
      console.error("Medicine Load Error:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Medicine load করা যায়নি",
      });
    }
  };

  // =====================================================
  // LOAD OFFERS
  // =====================================================

  const loadOffers = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/api/special-offers`);

      setOffers(response.data?.offers || []);
    } catch (error) {
      console.error("Offer Load Error:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Special Offer load করা যায়নি",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
    loadOffers();
  }, []);

  // =====================================================
  // SELECTED MEDICINE
  // =====================================================

  const selectedMedicine = useMemo(() => {
    return medicines.find((medicine) => medicine._id === form.medicineId);
  }, [medicines, form.medicineId]);

  // =====================================================
  // DISCOUNT
  // =====================================================

  const discountPercent = useMemo(() => {
    const regularPrice = Number(selectedMedicine?.sellingPrice || 0);

    const offerPrice = Number(form.offerPrice || 0);

    if (regularPrice <= 0 || offerPrice <= 0 || offerPrice >= regularPrice) {
      return 0;
    }

    return Number(
      (((regularPrice - offerPrice) / regularPrice) * 100).toFixed(2),
    );
  }, [selectedMedicine, form.offerPrice]);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.medicineId) {
      Swal.fire({
        icon: "warning",
        title: "Medicine Select করুন",
      });
      return;
    }

    if (!form.offerPrice) {
      Swal.fire({
        icon: "warning",
        title: "Offer Price দিন",
      });
      return;
    }

    if (!form.startDate || !form.endDate) {
      Swal.fire({
        icon: "warning",
        title: "Date দিন",
      });
      return;
    }

    const regularPrice = Number(selectedMedicine?.sellingPrice || 0);

    const offerPrice = Number(form.offerPrice);

    if (offerPrice <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Offer price must be greater than 0",
      });
      return;
    }

    if (offerPrice >= regularPrice) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Offer Price",
        text: `Offer price অবশ্যই regular price ৳${regularPrice} থেকে কম হতে হবে।`,
      });
      return;
    }

    if (new Date(form.endDate) <= new Date(form.startDate)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "End date অবশ্যই Start date-এর পরে হতে হবে।",
      });
      return;
    }

    try {
      setSaving(true);

      const data = {
        medicineId: form.medicineId,
        offerPrice: Number(form.offerPrice),
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive,
        order: Number(form.order) || 1,
      };

      if (editingId) {
        await axios.put(`${API_URL}/api/special-offers/${editingId}`, data);

        await Swal.fire({
          icon: "success",
          title: "Updated Successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await axios.post(`${API_URL}/api/special-offers`, data);

        await Swal.fire({
          icon: "success",
          title: "Offer Added Successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setForm(initialForm);
      setEditingId(null);

      await loadOffers();
    } catch (error) {
      console.error("Save Offer Error:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Special Offer save করা যায়নি",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (offer) => {
    setEditingId(offer._id);

    setForm({
      medicineId: offer.medicineId?.toString() || "",
      offerPrice: offer.offerPrice || "",
      startDate: formatDateTime(offer.startDate),
      endDate: formatDateTime(offer.endDate),
      isActive: offer.isActive,
      order: offer.order || 1,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete Offer?",
      text: "এই Special Offer delete করা হবে।",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/special-offers/${id}`);

      await Swal.fire({
        icon: "success",
        title: "Deleted Successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadOffers();
    } catch (error) {
      console.error("Delete Error:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Offer delete করা যায়নি",
      });
    }
  };

  // =====================================================
  // TOGGLE
  // =====================================================

  const handleToggle = async (id) => {
    try {
      await axios.patch(`${API_URL}/api/special-offers/${id}/toggle`);

      await loadOffers();
    } catch (error) {
      console.error("Toggle Error:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Offer status পরিবর্তন করা যায়নি",
      });
    }
  };

  // =====================================================
  // CANCEL
  // =====================================================

  const handleCancel = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDateTime = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    const hours = String(date.getHours()).padStart(2, "0");

    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
                <FaTag />
                Special Offer
              </h1>

              <p className="mt-2 text-blue-100">
                Medicine-এর জন্য special offer manage করুন
              </p>
            </div>

            <div className="rounded-xl bg-white/20 px-6 py-3 text-center">
              <div className="text-sm">Total Offers</div>

              <div className="text-2xl font-bold">{offers.length}</div>
            </div>
          </div>
        </div>

        {/* FORM */}

        <div className="mb-8 rounded-2xl bg-white p-5 shadow-md md:p-7">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              {editingId ? "Edit Special Offer" : "Add Special Offer"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            {/* MEDICINE */}

            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold text-gray-700">
                Select Medicine
              </label>

              <select
                name="medicineId"
                value={form.medicineId}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">-- Select Medicine --</option>

                {medicines.map((medicine) => (
                  <option key={medicine._id} value={medicine._id}>
                    {medicine.medicineName} - ৳{medicine.sellingPrice}
                  </option>
                ))}
              </select>
            </div>

            {/* REGULAR PRICE */}

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Regular Price
              </label>

              <div className="rounded-xl bg-gray-100 px-4 py-3 text-lg font-bold text-gray-700">
                ৳ {selectedMedicine?.sellingPrice || 0}
              </div>
            </div>

            {/* OFFER PRICE */}

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Offer Price
              </label>

              <input
                type="number"
                name="offerPrice"
                value={form.offerPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="Enter offer price"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500"
              />
            </div>

            {/* DISCOUNT */}

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Extra Discount
              </label>

              <div className="rounded-xl bg-green-50 px-4 py-3 text-lg font-bold text-green-700">
                {discountPercent}%
              </div>
            </div>

            {/* START DATE */}

            <div>
              <label className="mb-2 flex items-center gap-2 font-semibold text-gray-700">
                <FaCalendarAlt />
                Start Date
              </label>

              <input
                type="datetime-local"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* END DATE */}

            <div>
              <label className="mb-2 flex items-center gap-2 font-semibold text-gray-700">
                <FaCalendarAlt />
                End Date
              </label>

              <input
                type="datetime-local"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* ORDER */}

            <div>
              <label className="mb-2 block font-semibold text-gray-700">
                Display Order
              </label>

              <input
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                min="1"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* ACTIVE */}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-5 w-5"
              />

              <span className="font-semibold text-gray-700">Active Offer</span>
            </div>

            {/* BUTTON */}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaPlus />

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Offer"
                    : "Add Offer"}
              </button>
            </div>
          </form>
        </div>

        {/* OFFER LIST */}

        <div className="rounded-2xl bg-white p-5 shadow-md md:p-7">
          <h2 className="mb-6 text-xl font-bold text-gray-800">
            All Special Offers
          </h2>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading...</div>
          ) : offers.length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-12 text-center text-gray-500">
              <FaTag className="mx-auto mb-3 text-4xl text-gray-300" />

              <p className="font-semibold">No Special Offer Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer) => {
                const medicine = offer.medicine;

                const regularPrice = Number(medicine?.sellingPrice) || 0;

                const offerPrice = Number(offer.offerPrice) || 0;

                const discount =
                  regularPrice > 0
                    ? Number(
                        (
                          ((regularPrice - offerPrice) / regularPrice) *
                          100
                        ).toFixed(2),
                      )
                    : 0;

                return (
                  <div
                    key={offer._id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    {/* IMAGE */}

                    <div className="relative flex h-52 items-center justify-center bg-gray-100">
                      {medicine?.image ? (
                        <img
                          src={medicine.image}
                          alt={medicine.medicineName}
                          className="h-full w-full object-contain p-4"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <FaTag className="text-5xl text-gray-300" />
                      )}

                      <span className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
                        -{discount}%
                      </span>

                      <span
                        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white ${
                          offer.isActive ? "bg-green-500" : "bg-gray-500"
                        }`}
                      >
                        {offer.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    {/* CONTENT */}

                    <div className="p-5">
                      <h3 className="line-clamp-2 text-lg font-bold text-gray-800">
                        {medicine?.medicineName || "Medicine"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {medicine?.company || ""}
                      </p>

                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-sm text-gray-400 line-through">
                          ৳ {regularPrice}
                        </span>

                        <span className="text-2xl font-bold text-green-600">
                          ৳ {offerPrice}
                        </span>
                      </div>

                      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
                        <p>
                          Start: {new Date(offer.startDate).toLocaleString()}
                        </p>

                        <p className="mt-1">
                          End: {new Date(offer.endDate).toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(offer._id)}
                          className={`flex items-center justify-center rounded-lg py-2 text-white ${
                            offer.isActive
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-500 hover:bg-gray-600"
                          }`}
                        >
                          {offer.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(offer)}
                          className="flex items-center justify-center rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700"
                        >
                          <FaEdit />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(offer._id)}
                          className="flex items-center justify-center rounded-lg bg-red-600 py-2 text-white hover:bg-red-700"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialOfferManagement;
