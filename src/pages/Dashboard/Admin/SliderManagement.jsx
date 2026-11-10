import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaTimes,
  FaImages,
  FaRedo,
  FaChevronLeft,
  FaChevronRight,
  FaLayerGroup,
} from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

// এক ক্লিকে ব্যবহারের জন্য হাই-কোয়ালিটি ব্যানার লিংক
const SAMPLE_PRESETS = [
  {
    title: "UniMed UniHealth — FLAT 16% OFF",
    image: "https://iili.io/na9JoQ4.jpg",
    buttonLink: "/allproduct",
    description: "সব ধরনের ওষুধে বিশেষ ছাড় ও দ্রুত ফ্রি ডেলিভারি",
  },
  {
    title: "Square Pharmaceuticals — 100% Genuine",
    image: "https://i.ibb.co/L9Hw3YQ/square-banner.jpg",
    buttonLink: "/allproduct",
    description: "অরিজিনাল ও সঠিক তাপমাত্রায় সংরক্ষিত ওষুধ",
  },
];

const initialForm = {
  title: "",
  description: "",
  image: "",
  buttonText: "Shop Now",
  buttonLink: "/allproduct",
  isActive: true,
  order: "0",
};

function SliderManagement() {
  const { user } = useAuth ? useAuth() : { user: null };
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [previewIdx, setPreviewIdx] = useState(0);

  // =====================================================
  // AUTH CONFIG
  // =====================================================
  const getAuthConfig = async () => {
    try {
      if (user && typeof user.getIdToken === "function") {
        const token = await user.getIdToken();
        return {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      }
    } catch (e) {
      console.warn("Auth token warning:", e);
    }
    return {};
  };

  // =====================================================
  // LOAD ALL SLIDERS
  // =====================================================
  const loadSliders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/sliders`);
      const list = Array.isArray(res.data?.sliders)
        ? res.data.sliders
        : Array.isArray(res.data)
          ? res.data
          : [];
      list.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      setSliders(list);
    } catch (error) {
      console.error("Load Slider Error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Sliders",
        text: error?.response?.data?.message || "Unable to fetch sliders",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSliders();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      title: preset.title,
      image: preset.image,
      buttonLink: preset.buttonLink,
      description: preset.description,
    }));
  };

  // =====================================================
  // SUBMIT (CREATE OR UPDATE)
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.image.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Image URL Required",
        text: "Please provide a valid banner image URL (e.g., https://iili.io/na9JoQ4.jpg)",
      });
      return;
    }

    try {
      setSaving(true);
      const config = await getAuthConfig();

      const sliderData = {
        title: form.title.trim(),
        description: form.description.trim(),
        image: form.image.trim(),
        buttonText: (form.buttonText || "Shop Now").trim(),
        buttonLink: (form.buttonLink || "/allproduct").trim(),
        isActive: Boolean(form.isActive),
        order: form.order === "" ? 0 : Number(form.order),
      };

      if (editingId) {
        await axios.put(
          `${API_URL}/api/sliders/${editingId}`,
          sliderData,
          config,
        );
        Swal.fire({
          icon: "success",
          title: "Slider Updated!",
          text: "The banner changes are now live.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await axios.post(`${API_URL}/api/sliders`, sliderData, config);
        Swal.fire({
          icon: "success",
          title: "Slider Created!",
          text: "New banner added to carousel.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setForm(initialForm);
      setEditingId(null);
      loadSliders();
    } catch (error) {
      console.error("Save Slider Error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Save",
        text: error?.response?.data?.message || "Could not save slider",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (slider) => {
    setEditingId(slider._id);
    setForm({
      title: slider.title || "",
      description: slider.description || "",
      image: slider.image || "",
      buttonText: slider.buttonText || "Shop Now",
      buttonLink: slider.buttonLink || "/allproduct",
      isActive: slider.isActive ?? true,
      order: slider.order ?? "0",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This banner will be permanently deleted from carousel!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      const config = await getAuthConfig();
      await axios.delete(`${API_URL}/api/sliders/${id}`, config);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 1500,
        showConfirmButton: false,
      });
      loadSliders();
    } catch (error) {
      console.error("Delete Slider Error:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error?.response?.data?.message || "Could not delete slider",
      });
    }
  };

  const handleToggleStatus = async (slider) => {
    try {
      const config = await getAuthConfig();
      await axios.put(
        `${API_URL}/api/sliders/${slider._id}`,
        {
          ...slider,
          isActive: !slider.isActive,
        },
        config,
      );
      loadSliders();
    } catch (error) {
      console.error("Toggle Status Error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not update slider status",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  // লাইভ প্রিভিউতে ইমেজ
  const currentPreviewImage =
    form.image.trim() ||
    sliders[previewIdx]?.image ||
    "https://iili.io/na9JoQ4.jpg";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* HEADER & REFRESH */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <FaImages />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              Slider & Banner Management
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Create, preview, and arrange promotional hero banners exactly as
            they appear in Curasol
          </p>
        </div>

        <button
          type="button"
          onClick={loadSliders}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
        >
          <FaRedo className={loading ? "animate-spin text-emerald-600" : ""} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* =====================================================
          LIVE CAROUSEL PREVIEW (EXACT CURASOL CARD VIEW)
      ===================================================== */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white p-4 sm:p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-950">
              Live Carousel Preview (হোমপেজে কেমন দেখাবে)
            </h2>
          </div>
          <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            Valobazar / E-Commerce Style
          </span>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm ring-1 ring-slate-200/90 bg-slate-100 aspect-[2.1/1] sm:aspect-[16/7] md:aspect-[16/6]">
          <img
            src={currentPreviewImage}
            alt="Carousel Preview"
            className="h-full w-full object-cover object-center"
            onError={(e) => {
              e.currentTarget.src = "https://iili.io/na9JoQ4.jpg";
            }}
          />

          {/* Optional Caption Overlay */}
          {form.title && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 sm:p-5 pt-8 text-white">
              <p className="line-clamp-1 text-xs font-black sm:text-base md:text-lg drop-shadow">
                {form.title}
              </p>
              {form.description && (
                <p className="line-clamp-1 text-[10px] text-white/90 sm:text-xs drop-shadow mt-0.5">
                  {form.description}
                </p>
              )}
            </div>
          )}

          {/* Left Arrow */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs border border-white/20">
            <FaChevronLeft className="text-xs -ml-0.5" />
          </div>

          {/* Right Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-xs border border-white/20">
            <FaChevronRight className="text-xs -mr-0.5" />
          </div>

          {/* Bottom Pill Indicator */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-xs border border-white/10">
            <span className="h-1.5 w-6 rounded-full bg-emerald-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-500">
          * এই প্রিভিউতে যেমন দেখাচ্ছে, হোমপেজের{" "}
          <span className="font-bold text-slate-700">HeroSlider</span>-এ হুবহু
          এমন দেখা যাবে।
        </p>
      </div>

      {/* =====================================================
          ADD / EDIT SLIDER FORM
      ===================================================== */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
              {editingId ? (
                <FaEdit className="text-xs" />
              ) : (
                <FaPlus className="text-xs" />
              )}
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              {editingId ? "Edit Slide Banner" : "Add New Slide Banner"}
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              <FaTimes />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        {/* QUICK PRESET TEMPLATES */}
        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-xs font-black text-emerald-950">
            Quick Banner Templates (ক্লিক করলেই লিংক ও টাইটেল বসে যাবে):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 transition"
              >
                <span>🎁 {preset.title}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* IMAGE URL */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Banner Image Direct URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="https://iili.io/na9JoQ4.jpg (Direct image link)"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                ব্যানার ইমেজের সরাসরি লিঙ্ক (iili.io বা ImgBB থেকে আপলোড করে
                Direct Link পেস্ট করুন)
              </p>
            </div>

            {/* TITLE */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Title / Headline (অপশনাল)
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="যেমন: UniMed UniHealth — 16% OFF"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* BUTTON LINK */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Banner Click Target Link
              </label>
              <input
                type="text"
                name="buttonLink"
                value={form.buttonLink}
                onChange={handleChange}
                placeholder="/allproduct বা কোম্পানির লিংক"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Short Description / Tagline (অপশনাল)
              </label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="যেমন: সব ওষুধে ফ্রি হোম ডেলিভারি"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>

            {/* ORDER PRIORITY */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Display Order Priority (0 = First)
              </label>
              <input
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                placeholder="0, 1, 2, 3..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* ACTIVE TOGGLE */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="isActive"
              className="text-xs font-bold text-slate-800 cursor-pointer"
            >
              Active Banner (হোমপেজে স্লাইডারে দৃশ্যমান থাকবে)
            </label>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
            >
              <FaSave className="text-sm" />
              <span>
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Slider Banner"
                    : "Save Slider Banner"}
              </span>
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* =====================================================
          SLIDERS TABLE
      ===================================================== */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FaLayerGroup className="text-emerald-600" />
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Active Sliders List ({sliders.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-500">
            Loading banners from server...
          </div>
        ) : sliders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-bold text-slate-600">
              কোন স্লাইডার পাওয়া যায়নি
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              উপরের ফর্ম থেকে নতুন স্লাইডার ব্যানার যোগ করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Banner Preview</th>
                  <th className="px-4 py-3">Title & Link</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sliders.map((slider) => (
                  <tr key={slider._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">
                      #{slider.order ?? 0}
                    </td>

                    <td className="px-4 py-3">
                      <div className="h-12 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                        <img
                          src={slider.image}
                          alt={slider.title || "Banner"}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://iili.io/na9JoQ4.jpg";
                          }}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-bold text-slate-900 truncate">
                        {slider.title || "(No Title)"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {slider.buttonLink || "/allproduct"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(slider)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black transition ${
                          slider.isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                        }`}
                      >
                        {slider.isActive ? <FaEye /> : <FaEyeSlash />}
                        <span>{slider.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(slider)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          title="Edit"
                        >
                          <FaEdit className="text-xs" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(slider._id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SliderManagement;
