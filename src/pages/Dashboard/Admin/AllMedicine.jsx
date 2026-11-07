import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Link, useLocation } from "react-router-dom";

const API = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

const companies = [
  { name: "All Medicines", value: "" },
  { name: "Square", value: "Square" },
  { name: "Unimed Unihealth", value: "Unimed Unihealth" },
  { name: "Aci", value: "Aci" },
  { name: "Opsonin", value: "Opsonin" },
  { name: "Popular", value: "Popular" },
  { name: "Ibn-Sina", value: "Ibnsina" },
  { name: "SKF", value: "SKF" },
  { name: "Radiant", value: "Radiant" },
  { name: "Aristopharma", value: "Aristopharma" },
];

const AllMedicine = () => {
  const location = useLocation();

  // ১. আগের সার্চrr, কোম্পানি ও পেজ রিকভার
  const savedSearch =
    location.state?.search ??
    sessionStorage.getItem("novacare_admin_med_search") ??
    "";
  const savedCompany =
    location.state?.company ??
    sessionStorage.getItem("novacare_admin_med_company") ??
    "";
  const savedSort =
    location.state?.sort ??
    sessionStorage.getItem("novacare_admin_med_sort") ??
    "asc";
  const savedPage =
    Number(
      location.state?.page ??
        sessionStorage.getItem("novacare_admin_med_page") ??
        1,
    ) || 1;

  const [lastEditedId, setLastEditedId] = useState(
    location.state?.lastEditedId ??
      sessionStorage.getItem("novacare_admin_last_edited_id") ??
      null,
  );

  const [allMedicines, setAllMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // সার্চ ও ফিল্টার স্টেট
  const [search, setSearch] = useState(savedSearch);
  const [company, setCompany] = useState(savedCompany);
  const [sort, setSort] = useState(savedSort);
  const [page, setPage] = useState(savedPage);

  // পেজ প্রতি আইটেম সংখ্যা (চাইলে পরিবর্তন করতে পারেন)
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // কুইক এডিট মোডাল স্টেট
  const [quickEditMed, setQuickEditMed] = useState(null);
  const [quickEditForm, setQuickEditForm] = useState({
    medicineName: "",
    genericName: "",
    company: "",
    purchasePrice: 0,
    mrpePrice: 0,
    bikriPercent: 0,
    sellingPrice: 0,
    stock: 0,
  });
  const [isUpdatingQuick, setIsUpdatingQuick] = useState(false);

  // সেশন সংরক্ষণ
  useEffect(() => {
    sessionStorage.setItem("novacare_admin_med_search", search);
    sessionStorage.setItem("novacare_admin_med_company", company);
    sessionStorage.setItem("novacare_admin_med_page", String(page));
    sessionStorage.setItem("novacare_admin_med_sort", sort);
  }, [search, company, page, sort]);

  // ২. ⚡ ডাটাবেজ থেকে সম্পূর্ণ মেডিসিন লোড (আনলিমিটেড)
  const fetchAllMedicines = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setIsSyncing(true);

      const response = await axios.get(`${API}/api/medicines`);
      const meds =
        response.data?.medicines ||
        (Array.isArray(response.data) ? response.data : []);

      if (Array.isArray(meds)) {
        setAllMedicines(meds);
      }
    } catch (error) {
      console.error("Medicine Load Error:", error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAllMedicines(true);
  }, []);

  // ৩. লাইভ ফিল্টারিং ও শর্টিং (সকল মেডিসিনের ওপর কাজ করবে)
  const filteredMedicines = useMemo(() => {
    let result = [...allMedicines];

    // কোম্পানি ফিল্টার
    if (company) {
      const compLower = company.toLowerCase();
      result = result.filter(
        (m) =>
          (m.company || "").toLowerCase() === compLower ||
          (compLower === "ibnsina" &&
            (m.company || "").toLowerCase().includes("ibn")),
      );
    }

    // সার্চ ফিল্টার
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          (m.medicineName || "").toLowerCase().includes(q) ||
          (m.genericName || "").toLowerCase().includes(q) ||
          (m.company || "").toLowerCase().includes(q),
      );
    }

    // সর্টিং (A-Z / Z-A)
    result.sort((a, b) => {
      const nameA = (a.medicineName || "").toLowerCase();
      const nameB = (b.medicineName || "").toLowerCase();
      if (sort === "asc") return nameA.localeCompare(nameB);
      return nameB.localeCompare(nameA);
    });

    return result;
  }, [allMedicines, company, search, sort]);

  // ৪. পেজিনেশন ক্যালকুলেশন
  const totalPages = Math.max(
    1,
    Math.ceil(filteredMedicines.length / itemsPerPage),
  );

  // বর্তমান পেজের মেডিসিন স্লাইস
  const displayedMedicines = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredMedicines.slice(start, start + itemsPerPage);
  }, [filteredMedicines, page, itemsPerPage]);

  // পেজ অ্যাডজাস্টমেন্ট
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages]);

  // এডিট করার পর স্বয়ংক্রিয় স্ক্রল ও হাইলাইট
  useEffect(() => {
    if (!lastEditedId || displayedMedicines.length === 0) return;

    const timer = setTimeout(() => {
      const targetElement = document.getElementById(
        "medicine-row-" + lastEditedId,
      );
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

        const clearTimer = setTimeout(() => {
          setLastEditedId(null);
          sessionStorage.removeItem("novacare_admin_last_edited_id");
        }, 5000);

        return () => clearTimeout(clearTimer);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [displayedMedicines, lastEditedId]);

  // ফিল্টার হ্যান্ডলার
  const handleCompanyChange = (companyValue) => {
    setCompany(companyValue);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCompany("");
    setPage(1);
    sessionStorage.removeItem("novacare_admin_med_search");
    sessionStorage.removeItem("novacare_admin_med_company");
    sessionStorage.removeItem("novacare_admin_med_page");
  };

  // ডিলিট হ্যান্ডলার
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "এই medicine delete করলে আর ফিরে পাওয়া যাবে না!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    const previousMedicines = [...allMedicines];
    setAllMedicines((prev) => prev.filter((item) => item._id !== id));

    try {
      const response = await axios.delete(`${API}/api/medicines/${id}`);
      if (response.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Medicine successfully deleted.",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        setAllMedicines(previousMedicines);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: response.data?.message || "Delete failed!",
        });
      }
    } catch (error) {
      console.error("Delete Medicine Error:", error);
      setAllMedicines(previousMedicines);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Medicine delete করা যায়নি!",
      });
    }
  };

  // কুইক এডিট হ্যান্ডলার
  const handleOpenQuickEdit = (med) => {
    setQuickEditMed(med);
    const purchase = Number(med.purchasePrice || 0);
    const mrp = Number(med.mrpePrice ?? med.mrp ?? 0);
    const bikri = Number(med.bikriPercent ?? med.discount ?? 0);
    const selling = Number(
      med.sellingPrice || (mrp > 0 ? mrp - (mrp * bikri) / 100 : 0),
    );

    setQuickEditForm({
      medicineName: med.medicineName || "",
      genericName: med.genericName || "",
      company: med.company || "",
      purchasePrice: purchase,
      mrpePrice: mrp,
      bikriPercent: bikri,
      sellingPrice: selling,
      stock: Number(med.stock || 0),
    });
  };

  const handleQuickEditChange = (field, value) => {
    setQuickEditForm((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "mrpePrice" || field === "bikriPercent") {
        const mrp =
          parseFloat(field === "mrpePrice" ? value : updated.mrpePrice) || 0;
        const bikri =
          parseFloat(field === "bikriPercent" ? value : updated.bikriPercent) ||
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

  const handleSaveQuickEdit = async (e) => {
    e.preventDefault();
    if (!quickEditMed) return;

    try {
      setIsUpdatingQuick(true);
      const payload = {
        medicineName: quickEditForm.medicineName,
        genericName: quickEditForm.genericName,
        company: quickEditForm.company,
        purchasePrice: Number(quickEditForm.purchasePrice) || 0,
        mrpePrice: Number(quickEditForm.mrpePrice) || 0,
        bikriPercent: Number(quickEditForm.bikriPercent) || 0,
        sellingPrice: Number(quickEditForm.sellingPrice) || 0,
        stock: Number(quickEditForm.stock) || 0,
      };

      const res = await axios.put(
        `${API}/api/medicines/${quickEditMed._id}`,
        payload,
      );

      if (res.data?.success || res.status === 200) {
        setAllMedicines((prev) =>
          prev.map((item) =>
            item._id === quickEditMed._id ? { ...item, ...payload } : item,
          ),
        );

        setLastEditedId(quickEditMed._id);
        sessionStorage.setItem(
          "novacare_admin_last_edited_id",
          quickEditMed._id,
        );
        setQuickEditMed(null);

        Swal.fire({
          icon: "success",
          title: "আপডেট সফল হয়েছে!",
          text: `${payload.medicineName} এর তথ্য সেভ হয়েছে।`,
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "আপডেট হয়নি",
          text: res.data?.message || "সার্ভার এরর",
        });
      }
    } catch (err) {
      console.error("Quick edit save error:", err);
      Swal.fire({
        icon: "error",
        title: "আপডেট ব্যর্থ",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setIsUpdatingQuick(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              All Medicines
            </h1>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              মোট: {filteredMedicines.length} টি
            </span>
            {isSyncing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping"></span>
                Syncing...
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Exact MRP, Bikri Discount (%) & Selling Price overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAllMedicines(false)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            title="ডাটাবেজ রিফ্রেশ"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <Link
            to="/dashboard/add-medicine"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
          >
            <span>+ Add Medicine</span>
          </Link>
        </div>
      </div>

      {/* COMPANY FILTER BUTTONS */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 mb-5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Filter By Company
        </h2>
        <div className="flex flex-wrap gap-2">
          {companies.map((companyItem) => (
            <button
              key={companyItem.value || "all"}
              type="button"
              onClick={() => handleCompanyChange(companyItem.value)}
              className={
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " +
                (company === companyItem.value
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {companyItem.name}
            </button>
          ))}
        </div>
      </div>

      {/* LIVE SEARCH & SORT */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 mb-5">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col md:flex-row gap-3 items-center"
        >
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Type medicine, company, or generic name to search instantly (e.g. Rosuva, Napa, Ace)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
            />
            <span className="absolute left-3.5 top-3 text-slate-400 text-xs">
              🔍
            </span>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700 bg-slate-200/80 rounded-full h-5 w-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>

            {/* পেজ প্রতি কত আইটেম দেখাবে */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="w-full md:w-auto px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            {(search || company) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="whitespace-nowrap px-3 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ACTIVE SEARCH / FILTER BADGES */}
      {(search || company || lastEditedId) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {search && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-xl font-bold">
              <span>
                সার্চ: <b>&quot;{search}&quot;</b> ({filteredMedicines.length}{" "}
                টি পাওয়া গেছে)
              </span>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="hover:text-red-600 font-black ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {company && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl font-bold">
              <span>
                কোম্পানি:{" "}
                <b>
                  {companies.find((c) => c.value === company)?.name || company}
                </b>
              </span>
              <button
                type="button"
                onClick={() => setCompany("")}
                className="hover:text-red-600 font-black ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {lastEditedId && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-800 px-3 py-1 rounded-xl font-bold animate-pulse">
              <span>✨ এডিট করা মেডিসিন হাইলাইট করা হয়েছে</span>
            </div>
          )}
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Purchase (৳)</th>
                <th className="px-4 py-3 text-right font-bold text-slate-700">
                  MRP (৳)
                </th>
                <th className="px-4 py-3 text-center font-bold text-rose-600">
                  Bikri Discount (%)
                </th>
                <th className="px-4 py-3 text-right font-black text-emerald-700">
                  Selling Price (৳)
                </th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-12">
                    <div className="flex flex-col justify-center items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-400">
                        Loading all medicines...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : displayedMedicines.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400">
                    <p className="text-base font-bold text-slate-600">
                      No medicines found.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      অন্য কোনো ফিল্টার বা সার্চ দিয়ে চেষ্টা করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                displayedMedicines.map((medicine, index) => {
                  const purchasePrice = Number(medicine.purchasePrice || 0);
                  const rawMrp = Number(
                    medicine.mrpePrice ?? medicine.mrp ?? 0,
                  );
                  const rawSelling = Number(medicine.sellingPrice || 0);
                  const rawBikriPercent = Number(
                    medicine.bikriPercent ?? medicine.discount ?? 0,
                  );

                  const mrpPrice =
                    rawMrp > 0
                      ? rawMrp
                      : rawBikriPercent > 0 && rawSelling > 0
                        ? Number(
                            (rawSelling / (1 - rawBikriPercent / 100)).toFixed(
                              2,
                            ),
                          )
                        : rawSelling;

                  const discountVal =
                    rawBikriPercent > 0
                      ? Number(rawBikriPercent.toFixed(2))
                      : mrpPrice > rawSelling && mrpPrice > 0
                        ? Number(
                            (
                              ((mrpPrice - rawSelling) / mrpPrice) *
                              100
                            ).toFixed(2),
                          )
                        : 0;

                  const sellingPrice =
                    rawSelling > 0
                      ? rawSelling
                      : mrpPrice > 0 && discountVal > 0
                        ? Number(
                            (mrpPrice - (mrpPrice * discountVal) / 100).toFixed(
                              2,
                            ),
                          )
                        : mrpPrice;

                  const isJustEdited = medicine._id === lastEditedId;

                  return (
                    <tr
                      key={medicine._id}
                      id={"medicine-row-" + medicine._id}
                      className={
                        "transition-all duration-300 " +
                        (isJustEdited
                          ? "bg-emerald-50/90 ring-2 ring-emerald-500 shadow-md font-semibold"
                          : "hover:bg-slate-50/70")
                      }
                    >
                      <td className="px-4 py-3.5 text-slate-400 font-medium">
                        {(page - 1) * itemsPerPage + index + 1}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              medicine.image ||
                              "https://placehold.co/60x60?text=Medicine"
                            }
                            alt={medicine.medicineName || "Medicine"}
                            loading="lazy"
                            className="w-10 h-10 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1 shrink-0"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/60x60?text=Medicine";
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900 leading-tight">
                                {medicine.medicineName || "N/A"}
                              </p>
                              {isJustEdited && (
                                <span className="inline-flex items-center rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                                  ✨ Updated
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {medicine.genericName || "No generic name"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {medicine.company || "N/A"}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px]">
                          {medicine.category || "General"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                        ৳{purchasePrice.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {mrpPrice > sellingPrice ? (
                          <span className="line-through decoration-slate-400 text-slate-600">
                            ৳{mrpPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span>৳{mrpPrice.toFixed(2)}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {discountVal > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-black text-rose-600">
                            {discountVal}% OFF
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">0%</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-sm">
                        ৳{sellingPrice.toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black " +
                            (Number(medicine.stock || 0) > 10
                              ? "bg-emerald-100 text-emerald-800"
                              : Number(medicine.stock || 0) > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800")
                          }
                        >
                          {medicine.stock || 0} pcs
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEdit(medicine)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition"
                            title="পেজ না ছেড়ে দ্রুত এডিট করুন"
                          >
                            Quick Edit
                          </button>

                          <Link
                            to={"/dashboard/update-medicine/" + medicine._id}
                            state={{
                              search,
                              company,
                              page,
                              sort,
                              lastEditedId: medicine._id,
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                          >
                            Full Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(medicine._id)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION (এখন সম্পূর্ণ সক্রিয় ও কাজ করবে) */}
        {filteredMedicines.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <b className="text-slate-800">{(page - 1) * itemsPerPage + 1}</b>{" "}
              to{" "}
              <b className="text-slate-800">
                {Math.min(page * itemsPerPage, filteredMedicines.length)}
              </b>{" "}
              of <b className="text-slate-800">{filteredMedicines.length}</b>{" "}
              medicines
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                First
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                Previous
              </button>

              <span className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                Next
              </button>

              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK EDIT MODAL */}
      {quickEditMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Quick Edit: {quickEditMed.medicineName}
                </h3>
                <p className="text-xs text-slate-400">
                  সরাসরি MRP, Bikri %, Selling Price ও Stock পরিবর্তন করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditMed(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Medicine Name
                </label>
                <input
                  type="text"
                  required
                  value={quickEditForm.medicineName}
                  onChange={(e) =>
                    handleQuickEditChange("medicineName", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={quickEditForm.company}
                    onChange={(e) =>
                      handleQuickEditChange("company", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stock (Pcs)
                  </label>
                  <input
                    type="number"
                    value={quickEditForm.stock}
                    onChange={(e) =>
                      handleQuickEditChange("stock", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    MRP (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickEditForm.mrpePrice}
                    onChange={(e) =>
                      handleQuickEditChange("mrpePrice", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-600 mb-1">
                    Bikri % OFF
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={quickEditForm.bikriPercent}
                    onChange={(e) =>
                      handleQuickEditChange("bikriPercent", e.target.value)
                    }
                    className="w-full rounded-xl border border-rose-300 p-2 text-xs font-mono font-bold text-rose-700 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                    Selling (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickEditForm.sellingPrice}
                    onChange={(e) =>
                      handleQuickEditChange("sellingPrice", e.target.value)
                    }
                    className="w-full rounded-xl border border-emerald-300 p-2 text-xs font-mono font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickEditMed(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingQuick}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm"
                >
                  {isUpdatingQuick ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMedicine;
