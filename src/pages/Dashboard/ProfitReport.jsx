import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaSearch,
  FaRedo,
  FaCalendarAlt,
  FaPrint,
  FaChartLine,
  FaBoxes,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaUserShield,
  FaLock,
} from "react-icons/fa";
import useAuth from "../../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ProfitReport = () => {
  const { user, loading: authLoading } = useAuth();

  // রোল ও পারমিশন স্টেট
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // রিপোর্ট ডাটা স্টেট
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({
    totalPurchaseAmount: 0,
    totalSalesAmount: 0,
    totalProfit: 0,
    totalQuantity: 0,
    totalMedicines: 0,
  });

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // ১. ইউজারের রোল চেক করা (শুধুমাত্র super-admin অনুমতি পাবে)
  // =====================================================
  useEffect(() => {
    let isMounted = true;

    const checkUserRole = async () => {
      if (!user?.email) {
        if (isMounted) {
          setUserRole(null);
          setRoleLoading(false);
        }
        return;
      }

      try {
        setRoleLoading(true);
        const token = await user.getIdToken();
        const res = await axios.get(
          `${API_URL}/api/users/email/${encodeURIComponent(user.email)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (isMounted) {
          const role = res.data?.user?.role || "customer";
          setUserRole(role);
        }
      } catch (error) {
        console.error("Role Check Error:", error);
        if (isMounted) setUserRole(null);
      } finally {
        if (isMounted) setRoleLoading(false);
      }
    };

    if (!authLoading) {
      checkUserRole();
    }

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // =====================================================
  // ২. প্রফিট রিপোর্ট লোড করা (শুধুমাত্র super-admin হলে কল হবে)
  // =====================================================
  const loadProfitReport = useCallback(
    async (customSearch = search, customFrom = from, customTo = to) => {
      // super-admin না হলে কোনো রিকোয়েস্ট পাঠাবে না
      if (!user || userRole !== "super-admin") {
        return;
      }

      try {
        setLoading(true);

        const token = await user.getIdToken();

        const params = new URLSearchParams();
        if (customSearch.trim()) params.append("search", customSearch.trim());
        if (customFrom) params.append("from", customFrom);
        if (customTo) params.append("to", customTo);

        const queryString = params.toString();
        const url = queryString
          ? `${API_URL}/api/profit/report?${queryString}`
          : `${API_URL}/api/profit/report`;

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data?.success) {
          setReports(response.data.reports || []);
          setSummary({
            totalPurchaseAmount: Number(
              response.data.summary?.totalPurchaseAmount || 0,
            ),
            totalSalesAmount: Number(
              response.data.summary?.totalSalesAmount || 0,
            ),
            totalProfit: Number(response.data.summary?.totalProfit || 0),
            totalQuantity: Number(response.data.summary?.totalQuantity || 0),
            totalMedicines: Number(response.data.summary?.totalMedicines || 0),
          });
        } else {
          setReports([]);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: response.data?.message || "Failed to load profit report.",
          });
        }
      } catch (error) {
        console.error("Profit Report Error:", error);
        Swal.fire({
          icon: "error",
          title: "Error Loading Data",
          text:
            error.response?.data?.message ||
            "Failed to load profit report. Ensure your role is verified in server.",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, userRole, search, from, to],
  );

  // রোল super-admin নিশ্চিত হলে স্বয়ংক্রিয় রিপোর্ট লোড
  useEffect(() => {
    if (userRole === "super-admin") {
      loadProfitReport();
    }
  }, [userRole, loadProfitReport]);

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProfitReport(search, from, to);
  };

  const clearFilter = () => {
    setSearch("");
    setFrom("");
    setTo("");
    loadProfitReport("", "", "");
  };

  // ================= AUTH বা ROLE চেকিং লোডার =================
  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f9fa]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
          <h2 className="text-base font-bold text-slate-700">
            Verifying Super Admin Authorization...
          </h2>
          <p className="mt-1 text-xs text-slate-400">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // ================= লগইন না থাকলে =================
  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f9fa] p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <FaLock className="text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Login Required</h2>
          <p className="mt-2 text-xs text-slate-500">
            Please log in with a Super Admin account to access this page.
          </p>
        </div>
      </div>
    );
  }

  // ================= SUPER ADMIN না হলে (FORBIDDEN UI) =================
  if (userRole !== "super-admin") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f8f9fa] p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <FaUserShield className="text-3xl" />
          </div>
          <h2 className="text-xl font-black text-slate-800">
            Access Restricted (Super Admin Only)
          </h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            This confidential financial report is strictly restricted to{" "}
            <span className="font-bold text-red-600">Super Admin</span>{" "}
            accounts.
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
            Logged in as: <span className="font-semibold">{user.email}</span>
            <br />
            Current Role:{" "}
            <span className="font-bold uppercase text-amber-600">
              {userRole || "customer"}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            If you require access, please contact the system owner to elevate
            your permissions.
          </p>
        </div>
      </div>
    );
  }

  // ================= SUPER ADMIN ইন্টারফেস =================
  return (
    <div className="min-h-screen bg-[#f8f9fa] p-3 sm:p-5 lg:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm print:hidden">
                <FaChartLine className="text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
                    Profit & Loss Report
                  </h1>
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Track purchasing costs, total sales revenue, and net profit
                  margins.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              <FaPrint className="text-slate-400" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => loadProfitReport()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaRedo className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 SUMMARY METRICS */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 print:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Total Purchase
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 print:hidden">
                <FaBoxes className="text-xs" />
              </div>
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-800 sm:text-2xl">
              ৳ {formatCurrency(summary.totalPurchaseAmount)}
            </h2>
            <p className="mt-1 text-[11px] font-medium text-red-500">
              Cost of goods
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Total Sales
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 print:hidden">
                <FaFileInvoiceDollar className="text-xs" />
              </div>
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-800 sm:text-2xl">
              ৳ {formatCurrency(summary.totalSalesAmount)}
            </h2>
            <p className="mt-1 text-[11px] font-medium text-blue-500">
              Gross revenue
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">
                Net Profit
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white print:hidden">
                <FaMoneyBillWave className="text-xs" />
              </div>
            </div>
            <h2 className="mt-2 text-lg font-black text-emerald-700 sm:text-2xl">
              ৳ {formatCurrency(summary.totalProfit)}
            </h2>
            <p className="mt-1 text-[11px] font-bold text-emerald-600">
              Margin:{" "}
              {summary.totalSalesAmount > 0
                ? (
                    (summary.totalProfit / summary.totalSalesAmount) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Units Sold
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-500 print:hidden">
                <FaBoxes className="text-xs" />
              </div>
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-800 sm:text-2xl">
              {Number(summary.totalQuantity || 0).toLocaleString()} pcs
            </h2>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Across {summary.totalMedicines || reports.length} medicines
            </p>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs sm:p-4 print:hidden">
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicine or company..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:text-sm"
              />
            </div>

            <div className="relative">
              <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:text-sm"
              />
            </div>

            <div className="relative">
              <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {loading ? "Searching..." : "Apply Filter"}
            </button>

            <button
              type="button"
              onClick={clearFilter}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              Reset
            </button>
          </form>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 sm:text-base">
                Medicine Breakdown
              </h2>
              <p className="text-[11px] text-slate-400">
                {reports.length} records found
              </p>
            </div>
            {(from || to || search) && (
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                Filtered View
              </span>
            )}
          </div>

          {/* MOBILE LIST */}
          <div className="divide-y divide-slate-100 md:hidden">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="mt-3 text-xs text-slate-400">
                  Loading records...
                </p>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No profit records found for the selected filter.
              </div>
            ) : (
              reports.map((item, index) => (
                <div key={`mob-${item.medicineId}-${index}`} className="p-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        {item.medicineName || "Unknown Medicine"}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {item.company || "N/A"}
                      </p>
                    </div>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">
                      ৳ {formatCurrency(item.profit)}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-[10px]">
                    <div>
                      <p className="text-slate-400">Sold Qty</p>
                      <p className="font-bold text-slate-700">
                        {item.soldQuantity} pcs
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Purchase</p>
                      <p className="font-bold text-red-500">
                        ৳ {formatCurrency(item.purchaseAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Sales</p>
                      <p className="font-bold text-blue-600">
                        ৳ {formatCurrency(item.salesAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">#</th>
                  <th className="px-4 py-3.5">Medicine Name</th>
                  <th className="px-4 py-3.5">Company</th>
                  <th className="px-4 py-3.5 text-right">Purchase Price</th>
                  <th className="px-4 py-3.5 text-right">Selling Price</th>
                  <th className="px-4 py-3.5 text-right">Sold Qty</th>
                  <th className="px-4 py-3.5 text-right">Total Purchase</th>
                  <th className="px-4 py-3.5 text-right">Total Sales</th>
                  <th className="px-4 py-3.5 text-right">Net Profit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-16 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                        <span className="text-slate-500">
                          Calculating profit margins...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-4 py-16 text-center text-slate-400"
                    >
                      No profit records found.
                    </td>
                  </tr>
                ) : (
                  reports.map((item, index) => (
                    <tr
                      key={`${item.medicineId}-${index}`}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {item.medicineName || "Unknown Medicine"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {item.company || "N/A"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600">
                        ৳ {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600">
                        ৳ {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                        {Number(item.soldQuantity || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-red-500">
                        ৳ {formatCurrency(item.purchaseAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-blue-600">
                        ৳ {formatCurrency(item.salesAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-emerald-600">
                        ৳ {formatCurrency(item.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {!loading && reports.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 text-xs font-bold text-slate-800">
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-3.5 text-right uppercase"
                    >
                      Total Summary:
                    </td>
                    <td className="px-4 py-3.5 text-right font-black">
                      {Number(summary.totalQuantity || 0).toLocaleString()} pcs
                    </td>
                    <td className="px-4 py-3.5 text-right text-red-600">
                      ৳ {formatCurrency(summary.totalPurchaseAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-blue-600">
                      ৳ {formatCurrency(summary.totalSalesAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-black text-emerald-700">
                      ৳ {formatCurrency(summary.totalProfit)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitReport;
