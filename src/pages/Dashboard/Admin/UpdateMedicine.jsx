import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";

const API = "http://localhost:5000";

const companies = [
  "Square",
  "Unimed Unihealth",
  "Aci",
  "Opsonin",
  "Popular",
  "Ibnsina",
  "SKF",
  "Radiant",
  "Aristopharma",
];

const categories = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Drop",
  "Injection",
  "Ointment",
  "Inhaler",
  "Suspension",
  "General",
];

const UpdateMedicine = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ১. আগের সার্চ, কোম্পানি, পেজ ও ফিল্টার তথ্য রিকভার (location.state অথবা sessionStorage থেকে)
  const returnSearch =
    location.state?.search ??
    sessionStorage.getItem("novacare_admin_med_search") ??
    "";
  const returnCompany =
    location.state?.company ??
    sessionStorage.getItem("novacare_admin_med_company") ??
    "";
  const returnSort =
    location.state?.sort ??
    sessionStorage.getItem("novacare_admin_med_sort") ??
    "asc";
  const returnPage =
    Number(
      location.state?.page ??
        sessionStorage.getItem("novacare_admin_med_page") ??
        1,
    ) || 1;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    medicineName: "",
    genericName: "",
    company: "",
    category: "Tablet",
    strength: "",
    purchasePrice: 0,
    mrpePrice: 0,
    bikriPercent: 0,
    sellingPrice: 0,
    stock: 0,
    boxQuantity: 1,
    image: "",
    description: "",
  });

  // ২. মেডিসিনের বর্তমান ডাটা ডাটাবেজ থেকে ফেচ করা
  useEffect(() => {
    let isMounted = true;

    const fetchMedicine = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/medicines/${id}`);
        const med = res.data?.medicine || res.data;

        if (isMounted && med) {
          const purchase = Number(med.purchasePrice || 0);
          const mrp = Number(med.mrpePrice ?? med.mrp ?? 0);
          const bikri = Number(med.bikriPercent ?? med.discount ?? 0);
          const selling =
            Number(med.sellingPrice) ||
            (mrp > 0 ? parseFloat((mrp - (mrp * bikri) / 100).toFixed(2)) : 0);

          setFormData({
            medicineName: med.medicineName || "",
            genericName: med.genericName || "",
            company: med.company || "",
            category: med.category || "Tablet",
            strength: med.strength || "",
            purchasePrice: purchase,
            mrpePrice: mrp,
            bikriPercent: bikri,
            sellingPrice: selling,
            stock: Number(med.stock || 0),
            boxQuantity: Number(med.boxQuantity || 1),
            image: med.image || "",
            description: med.description || "",
          });
        }
      } catch (err) {
        console.error("Fetch Medicine Error:", err);
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "ওষুধের ডাটা লোড করা যায়নি!",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchMedicine();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // ৩. ইনপুট হ্যান্ডলার এবং অটোমেটিক সেলিং প্রাইস ক্যালকুলেশন
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // MRP বা Bikri % পরিবর্তন হলে Selling Price অটো হিসেব হবে
      if (name === "mrpePrice" || name === "bikriPercent") {
        const mrp =
          parseFloat(name === "mrpePrice" ? value : updated.mrpePrice) || 0;
        const bikri =
          parseFloat(name === "bikriPercent" ? value : updated.bikriPercent) ||
          0;
        if (mrp > 0) {
          updated.sellingPrice = parseFloat(
            (mrp - (mrp * bikri) / 100).toFixed(2),
          );
        }
      }

      return updated;
    });
  };

  // ৪. সফল এডিটের পর আগের সার্চ ও পেজে ফিরে যাওয়ার নেভিগেশন হেল্পার
  const navigateBackWithState = (editedId = id) => {
    sessionStorage.setItem("novacare_admin_last_edited_id", editedId);
    sessionStorage.setItem("novacare_admin_med_search", returnSearch);
    sessionStorage.setItem("novacare_admin_med_company", returnCompany);
    sessionStorage.setItem("novacare_admin_med_page", String(returnPage));
    sessionStorage.setItem("novacare_admin_med_sort", returnSort);

    const targetRoute = location.state?.from || "/dashboard/all-medicines";

    navigate(targetRoute, {
      state: {
        search: returnSearch,
        company: returnCompany,
        page: returnPage,
        sort: returnSort,
        lastEditedId: editedId,
      },
      replace: true,
    });
  };

  // ৫. সাবমিট ও সার্ভার আপডেট
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload = {
        medicineName: formData.medicineName.trim(),
        genericName: formData.genericName.trim(),
        company: formData.company.trim(),
        category: formData.category,
        strength: formData.strength.trim(),
        purchasePrice: Number(formData.purchasePrice) || 0,
        mrpePrice: Number(formData.mrpePrice) || 0,
        bikriPercent: Number(formData.bikriPercent) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        stock: Number(formData.stock) || 0,
        boxQuantity: Number(formData.boxQuantity) || 1,
        image: formData.image.trim(),
        description: formData.description.trim(),
      };

      const res = await axios.put(`${API}/api/medicines/${id}`, payload);

      if (res.data?.success || res.status === 200) {
        // ফ্রন্টএন্ড লোকাল ক্যাশ ক্লিয়ার করা যাতে সাথে সাথে নতুন MRP দেখায়
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("meds_v2_") || key.includes("medicines")) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn("Storage cache clear error", e);
        }

        await Swal.fire({
          icon: "success",
          title: "আপডেট সফল হয়েছে! 🎉",
          text: `"${payload.medicineName}" এর তথ্য ডাটাবেজে সেভ হয়েছে। আগের তালিকায় নিয়ে যাওয়া হচ্ছে...`,
          timer: 1500,
          showConfirmButton: false,
        });

        // ঠিক আগের সার্চ ও ওষুধটিতে ফিরে যাওয়া
        navigateBackWithState(id);
      } else {
        Swal.fire({
          icon: "error",
          title: "ব্যর্থ হয়েছে!",
          text: res.data?.message || "সার্ভার এরর, আবার চেষ্টা করুন।",
        });
      }
    } catch (error) {
      console.error("Update Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text:
          error?.response?.data?.message || error.message || "আপডেট করা যায়নি!",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p className="text-xs font-bold text-slate-500">
          মেডিসিনের ডাটা লোড হচ্ছে...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      {/* HEADER & BACK BUTTON */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigateBackWithState()}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition"
          >
            <span>← আগের সার্চে ফিরে যান</span>
            {returnSearch && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-bold">
                (সার্চ: &quot;{returnSearch}&quot;)
              </span>
            )}
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Update Medicine: {formData.medicineName}
          </h1>
          <p className="text-xs text-slate-500">
            MRP, Bikri %, Selling Price ও স্টক পরিবর্তন করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateBackWithState()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {/* FORM CARD */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs md:p-8"
      >
        {/* ROW 1: NAME & GENERIC */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Medicine Name *
            </label>
            <input
              type="text"
              name="medicineName"
              required
              value={formData.medicineName}
              onChange={handleChange}
              placeholder="e.g. Napa Extra, Neurolin 50"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Generic Name
            </label>
            <input
              type="text"
              name="genericName"
              value={formData.genericName}
              onChange={handleChange}
              placeholder="e.g. Paracetamol + Caffeine"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* ROW 2: COMPANY, CATEGORY, STRENGTH */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Company *
            </label>
            <input
              type="text"
              name="company"
              required
              list="company-list"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Square, SKF, Aci"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            />
            <datalist id="company-list">
              {companies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Strength
            </label>
            <input
              type="text"
              name="strength"
              value={formData.strength}
              onChange={handleChange}
              placeholder="e.g. 500mg, 10ml"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* ROW 3: PRICING SECTION (MRP, BIKRI %, SELLING, PURCHASE) */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-emerald-950">
            দাম ও ডিসকাউন্ট হিসেব (Auto Calculation)
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-700">
                Purchase Price (৳)
              </label>
              <input
                type="number"
                step="0.01"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white p-2 font-mono text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black text-slate-900">
                MRP (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                name="mrpePrice"
                value={formData.mrpePrice}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-400 bg-white p-2 font-mono text-xs font-black text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black text-rose-600">
                Bikri % OFF *
              </label>
              <input
                type="number"
                step="0.1"
                name="bikriPercent"
                value={formData.bikriPercent}
                onChange={handleChange}
                placeholder="e.g. 16, 21.5"
                className="w-full rounded-xl border border-rose-300 bg-white p-2 font-mono text-xs font-black text-rose-700 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black text-emerald-700">
                Selling Price (৳)
              </label>
              <input
                type="number"
                step="0.01"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="w-full rounded-xl border border-emerald-400 bg-emerald-100/60 p-2 font-mono text-xs font-black text-emerald-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-emerald-800">
            💡 টিপস: MRP বা Bikri % পরিবর্তন করলেই Selling Price স্বয়ংক্রিয়ভাবে
            আপডেট হয়ে যাবে।
          </p>
        </div>

        {/* ROW 4: STOCK & BOX QUANTITY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Stock Quantity (Pcs)
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-700">
              Box Quantity (বক্সে যত পিস থাকে)
            </label>
            <input
              type="number"
              name="boxQuantity"
              value={formData.boxQuantity}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* ROW 5: IMAGE URL */}
        <div>
          <label className="mb-1 block text-xs font-black text-slate-700">
            Medicine Image URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/medicine.jpg"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
            {formData.image && (
              <img
                src={formData.image}
                alt="preview"
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover bg-slate-50 p-0.5"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigateBackWithState()}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Saving to Database...</span>
              </>
            ) : (
              <span>Update Medicine & Return →</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateMedicine;
