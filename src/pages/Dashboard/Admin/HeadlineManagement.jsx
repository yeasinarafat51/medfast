import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaBullhorn,
  FaSave,
  FaTimes,
  FaRedo,
  FaToggleOn,
  FaToggleOff,
  FaExternalLinkAlt,
  FaFire,
} from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

const PRESET_TAGS = [
  { label: "জরুরি নোটিশ", color: "rose" },
  { label: "বিশেষ অফার", color: "amber" },
  { label: "ডেলিভারি সেবা", color: "sky" },
  { label: "২৪/৭ হেল্পলাইন", color: "emerald" },
  { label: "প্রেসক্রিপশন নোটিশ", color: "rose" },
];

const initialForm = {
  text: "",
  tag: "জরুরি নোটিশ",
  tagColor: "rose",
  link: "",
  linkLabel: "",
  isActive: true,
  isUrgent: false,
  order: 0,
};

function HeadlineManagement() {
  const { user } = useAuth ? useAuth() : { user: null };
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [showAddForm, setShowAddForm] = useState(false);

  const getAuthConfig = async () => {
    try {
      if (user && typeof user.getIdToken === "function") {
        const token = await user.getIdToken();
        return { headers: { Authorization: `Bearer ${token}` } };
      }
    } catch (e) {
      console.warn("Auth token warning:", e);
    }
    return {};
  };

  const loadHeadlines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/headlines`);
      const list = Array.isArray(res.data?.headlines)
        ? res.data.headlines
        : Array.isArray(res.data)
          ? res.data
          : [];
      setHeadlines(list);
    } catch (error) {
      console.error("Load Headlines Error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Headlines",
        text: error?.response?.data?.message || "Unable to fetch headlines",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeadlines();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      text: item.text || "",
      tag: item.tag || "জরুরি নোটিশ",
      tagColor: item.tagColor || "rose",
      link: item.link || "",
      linkLabel: item.linkLabel || "",
      isActive: item.isActive !== false,
      isUrgent: Boolean(item.isUrgent),
      order: item.order || 0,
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) {
      Swal.fire({
        icon: "warning",
        title: "শিরোনাম লিখুন",
        text: "শিরোনাম টেক্সট বাধ্যতামূলক।",
      });
      return;
    }

    try {
      setSaving(true);
      const authConfig = await getAuthConfig();

      if (editingId) {
        await axios.put(
          `${API_URL}/api/headlines/${editingId}`,
          form,
          authConfig,
        );
        Swal.fire({
          icon: "success",
          title: "আপডেট সম্পন্ন!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await axios.post(`${API_URL}/api/headlines`, form, authConfig);
        Swal.fire({
          icon: "success",
          title: "নতুন শিরোনাম যুক্ত হয়েছে!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      handleCancel();
      loadHeadlines();
    } catch (error) {
      console.error("Save headline error:", error);
      Swal.fire({
        icon: "error",
        title: "সংরক্ষণে ব্যর্থ",
        text: error?.response?.data?.message || "সার্ভারে সংরক্ষিত করা যায়নি।",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const authConfig = await getAuthConfig();
      await axios.patch(
        `${API_URL}/api/headlines/${id}/toggle`,
        {},
        authConfig,
      );
      setHeadlines((prev) =>
        prev.map((h) => (h._id === id ? { ...h, isActive: !h.isActive } : h)),
      );
    } catch (error) {
      console.error("Toggle error:", error);
      Swal.fire({ icon: "error", title: "স্ট্যাটাস পরিবর্তন ব্যর্থ" });
    }
  };

  const handleDelete = async (id, text) => {
    const result = await Swal.fire({
      title: "শিরোনাম মুছে ফেলতে চান?",
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "হ্যাঁ, মুছুন",
      cancelButtonText: "বাতিল",
    });

    if (result.isConfirmed) {
      try {
        const authConfig = await getAuthConfig();
        await axios.delete(`${API_URL}/api/headlines/${id}`, authConfig);
        Swal.fire({
          icon: "success",
          title: "মুছে ফেলা হয়েছে!",
          timer: 1200,
          showConfirmButton: false,
        });
        loadHeadlines();
      } catch (error) {
        Swal.fire({ icon: "error", title: "ডিলিট করতে ব্যর্থ" });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-slate-950 shadow-lg shadow-emerald-500/30">
            <FaBullhorn />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              NovaCare হেডলাইন ও নোটিশ পরিচালনা
            </h1>
            <p className="text-xs text-slate-300">
              ওয়েবসাইটের উপরের ব্রেকিং নোটিশ বার সম্পূর্ণ নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHeadlines}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-white/20 transition"
          >
            <FaRedo className={loading ? "animate-spin" : ""} />
            <span>রিফ্রেশ</span>
          </button>
          {!showAddForm && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition"
            >
              <FaPlus />
              <span>নতুন শিরোনাম</span>
            </button>
          )}
        </div>
      </div>

      {/* FORM */}
      {showAddForm && (
        <div className="rounded-3xl border border-emerald-500/30 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-800">
              {editingId
                ? "শিরোনাম সংশোধন করুন (Edit)"
                : "নতুন শিরোনাম যোগ করুন (Add)"}
            </h2>
            <button
              onClick={handleCancel}
              className="text-slate-400 hover:text-slate-600"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                শিরোনাম বা নোটিশ টেক্সট *
              </label>
              <textarea
                name="text"
                rows="2"
                value={form.text}
                onChange={handleChange}
                placeholder="যেমন: NovaCare হেলথকেয়ার বার্তা: অ্যান্টিবায়োটিক ক্রয়ে রেজিঃ প্রেসক্রিপশন আবশ্যক..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  ক্যাটেগরি / ট্যাগ
                </label>
                <input
                  type="text"
                  name="tag"
                  value={form.tag}
                  onChange={handleChange}
                  placeholder="যেমন: জরুরি নোটিশ"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {PRESET_TAGS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          tag: p.label,
                          tagColor: p.color,
                        }))
                      }
                      className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  লিংক (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  name="link"
                  value={form.link}
                  onChange={handleChange}
                  placeholder="/allproduct"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  বাটন লেবেল
                </label>
                <input
                  type="text"
                  name="linkLabel"
                  value={form.linkLabel}
                  onChange={handleChange}
                  placeholder="অর্ডার করুন"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>সরাসরি ওয়েবসাইটে লাইভ দেখান</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={form.isUrgent}
                  onChange={handleChange}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="flex items-center gap-1 text-rose-600">
                  <FaFire className="text-xs" /> জরুরি নোটিশ (হাইলাইট)
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
              >
                <FaSave />
                <span>
                  {saving
                    ? "সংরক্ষণ হচ্ছে..."
                    : editingId
                      ? "আপডেট করুন"
                      : "যোগ করুন"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIST */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-black text-slate-800 mb-4">
          বিদ্যমান হেডলাইনসমূহ ({headlines.length}টি)
        </h2>

        {loading ? (
          <div className="py-12 text-center text-slate-400">লোড হচ্ছে...</div>
        ) : headlines.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            কোনো হেডলাইন পাওয়া যায়নি।
          </div>
        ) : (
          <div className="space-y-3">
            {headlines.map((item) => (
              <div
                key={item._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                  item.isActive
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                      {item.isUrgent && "🔥 "}
                      {item.tag || "নোটিশ"}
                    </span>
                    {item.link && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <FaExternalLinkAlt className="text-[8px]" />
                        {item.linkLabel || item.link}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {item.text}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleToggle(item._id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                      item.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {item.isActive ? (
                      <FaToggleOn className="text-base" />
                    ) : (
                      <FaToggleOff className="text-base" />
                    )}
                    <span>{item.isActive ? "লাইভ" : "বন্ধ"}</span>
                  </button>

                  <button
                    onClick={() => handleEdit(item)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:bg-slate-50 transition"
                  >
                    <FaEdit />
                  </button>

                  <button
                    onClick={() => handleDelete(item._id, item.text)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HeadlineManagement;
