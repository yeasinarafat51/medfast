import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaHome,
  FaCapsules,
  FaUsers,
  FaShoppingCart,
  FaClipboardList,
  FaArrowLeft,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartBar,
  FaImages,
  FaTags,
  FaFileInvoice,
  FaChartLine,
  FaShieldAlt,
  FaBullhorn,
  FaStore,
} from "react-icons/fa";
import Swal from "sweetalert2";
import useAuth from "../../hooks/useAuth";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

function Dashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState("");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        if (!user?.email) {
          setRoleLoading(false);
          return;
        }

        const token = await user.getIdToken();

        const response = await axios.get(
          `${API_URL}/api/users/email/${encodeURIComponent(user.email)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.data?.success) {
          setRole(response.data.user?.role || "customer");
        }
      } catch (error) {
        console.error("Role Load Error:", error);

        if (error.response?.status === 401) {
          Swal.fire({
            icon: "error",
            title: "Authentication Failed",
            text: "Please login again.",
          });

          navigate("/login");
        } else if (error.response?.status === 403) {
          Swal.fire({
            icon: "error",
            title: "Access Denied",
            text: "You do not have permission to access dashboard.",
          });

          navigate("/");
        }
      } finally {
        setRoleLoading(false);
      }
    };

    loadUserRole();
  }, [user, navigate]);

  // =====================================================
  // ADMIN ROLE GUARD (FIXED):
  // Admin এখন all-orders এবং invoice প্রিন্ট পেজে যেতে পারবে!
  // =====================================================
  useEffect(() => {
    if (!roleLoading && role === "admin") {
      const isAllowedForAdmin =
        // location.pathname === "/dashboard/all-orders" ||
        // location.pathname === "/dashboard/total-orders" ||
        location.pathname === "/dashboard/order-list" ||
        location.pathname === "/dashboard/mrp-calculator" ||
        location.pathname.startsWith("/dashboard/invoice") ||
        location.pathname.startsWith("/dashboard/admin/invoice");

      if (!isAllowedForAdmin) {
        navigate("/dashboard/mrp-calculator", { replace: true });
      }
    }
  }, [role, roleLoading, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await logoutUser();

      Swal.fire({
        icon: "success",
        title: "Logout Successful",
        timer: 1500,
        showConfirmButton: false,
      });

      navigate("/login");
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Logout Failed",
      });
    }
  };

  // =====================================================
  // SIDEBAR MENU ITEM STYLE (PREMIUM DARK EMERALD/SLATE)
  // =====================================================
  const menuClass = ({ isActive }) =>
    `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
      isActive
        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  // =====================================================
  // MOBILE BOTTOM ADMIN TAB STYLE
  // =====================================================
  const mobileTabClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold transition ${
      isActive
        ? "text-emerald-600 scale-105"
        : "text-slate-500 hover:text-slate-800"
    }`;

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600"></div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Loading NovaCare Admin...
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Verifying security credentials
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* =====================================================
          MOBILE SIDEBAR BACKDROP
      ===================================================== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* =====================================================
          PREMIUM EXECUTIVE SIDEBAR (SCROLLABLE ON MOBILE & DESKTOP)
      ===================================================== */}
      <aside
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-72 flex-col
          bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950
          text-white shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-0 lg:translate-x-0
        `}
      >
        {/* SIDEBAR BRAND HEADER */}
        <div className="relative border-b border-white/10 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-slate-950 shadow-lg shadow-emerald-500/25">
                💊
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">
                  Nova<span className="text-emerald-400">Care</span>
                </h1>
                <p className="text-[11px] font-medium text-slate-400">
                  Pharmacy Control Center
                </p>
              </div>
            </div>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg text-slate-300 hover:bg-white/20 lg:hidden"
              onClick={closeSidebar}
              aria-label="Close Sidebar"
            >
              <FaTimes />
            </button>
          </div>

          {/* ROLE BADGE */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 border border-white/10">
            <FaShieldAlt
              className={
                role === "super-admin" ? "text-amber-400" : "text-emerald-400"
              }
            />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              {role === "super-admin"
                ? "Super Admin (Full Access)"
                : "Admin (Orders Only)"}
            </span>
          </div>
        </div>

        {/* =====================================================
            ROLE-BASED NAVIGATION LINKS
            - Admin: শুধুমাত্র All Orders দেখবে
            - Super Admin: সব অপশন দেখবে
        ===================================================== */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          {/* 1. ADMIN VIEW: ONLY ALL ORDERS */}
          {role === "admin" && (
            <>
              <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Order Management
              </p>

              {/* <NavLink
                to="/dashboard/all-orders"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaShoppingCart className="text-base" />
                <span>All Orders</span>
              </NavLink> */}
              {/* Admin এবং Super Admin উভয়েই এটি দেখবে */}
              <NavLink
                to="/dashboard/order-list"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaStore className="text-base" />
                <span>Order List (ফার্মেসি বাকি ও চালান)</span>
              </NavLink>
              <NavLink
                to="/dashboard/mrp-calculator"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaClipboardList className="text-base" />
                <span> 🧮 MRP ক্যালকুলেটর</span>
              </NavLink>
            </>
          )}

          {/* 2. SUPER ADMIN VIEW: FULL ACCESS TO ALL MODULES */}
          {role === "super-admin" && (
            <>
              <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Core Management
              </p>

              <NavLink
                to="/dashboard"
                end
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaHome className="text-base" />
                <span>Dashboard Overview</span>
              </NavLink>

              <NavLink
                to="/dashboard/add-medicine"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaCapsules className="text-base" />
                <span>Add Medicine</span>
              </NavLink>

              <NavLink
                to="/dashboard/all-medicine"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaClipboardList className="text-base" />
                <span>All Medicines</span>
              </NavLink>
              <NavLink
                to="/dashboard/stockout"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaClipboardList className="text-base" />
                <span>Stockout</span>
              </NavLink>
              <NavLink
                to="/dashboard/stock"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaClipboardList className="text-base" />
                <span>Stock</span>
              </NavLink>
              <NavLink
                to="/dashboard/mrp-calculator"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaClipboardList className="text-base" />
                <span> 🧮 MRP ক্যালকুলেটর</span>
              </NavLink>

              <NavLink
                to="/dashboard/all-orders"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaShoppingCart className="text-base" />
                <span>All Orders</span>
              </NavLink>
              {/* Admin এবং Super Admin উভয়েই এটি দেখবে */}
              <NavLink
                to="/dashboard/order-list"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaStore className="text-base" />
                <span>Order List (ফার্মেসি বাকি ও চালান)</span>
              </NavLink>
              <div className="pt-4 pb-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Super Admin & Finance
                </p>
              </div>

              <NavLink
                to="/dashboard/profit-report"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaChartLine className="text-base" />
                <span>Profit Report</span>
              </NavLink>

              <NavLink
                to="/dashboard/sales-report"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaChartBar className="text-base" />
                <span>Sales Report</span>
              </NavLink>

              <NavLink
                to="/dashboard/my-invoices"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaFileInvoice className="text-base" />
                <span>My Invoices</span>
              </NavLink>

              <NavLink
                to="/dashboard/special-offers"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaTags className="text-base" />
                <span>Special Offers</span>
              </NavLink>
              <NavLink
                to="/dashboard/total-orders"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaChartBar className="text-base" />
                <span>Total Order</span>
              </NavLink>
              <NavLink
                to="/dashboard/sliders"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaImages className="text-base" />
                <span>Slider Management</span>
              </NavLink>

              <NavLink
                to="/dashboard/users"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaUsers className="text-base" />
                <span>Manage Users</span>
              </NavLink>
              <NavLink
                to="/dashboard/headlines"
                className={menuClass}
                onClick={closeSidebar}
              >
                <FaBullhorn className="text-base" />
                <span>Headline Management</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* SIDEBAR FOOTER ACTIONS */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <NavLink
            to="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-white/15"
            onClick={closeSidebar}
          >
            <FaArrowLeft />
            <span>Back to Live Store</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/90 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-red-600"
          >
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT AREA
      ===================================================== */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        {/* STICKY TOP ADMIN APP BAR */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md shadow-2xs md:px-8 md:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700 active:scale-95 transition lg:hidden"
              aria-label="Open Sidebar"
            >
              <FaBars />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-2xl">
                  {role === "super-admin"
                    ? "Super Admin Panel"
                    : "Order Management"}
                </h2>
                <span
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                    role === "super-admin"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {role === "super-admin" ? "Super Admin" : "Admin"}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Welcome back,{" "}
                <span className="font-bold text-emerald-700">
                  {user?.displayName || user?.email || "Admin"}
                </span>
              </p>
            </div>
          </div>

          {/* RIGHT PROFILE & QUICK ACTIONS */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <FaArrowLeft className="text-[10px]" />
              <span>View Website</span>
            </NavLink>

            <img
              src={user?.photoURL || "https://i.ibb.co/4pDNDk1/avatar.png"}
              alt="Admin"
              className="h-9 w-9 rounded-xl border-2 border-emerald-500 object-cover md:h-10 md:w-10"
            />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 active:scale-95 md:px-4"
            >
              <FaSignOutAlt />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* PAGE CONTENT OUTLET */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* =====================================================
          MOBILE BOTTOM ADMIN BAR (ROLE-BASED)
      ===================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-1 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
        {role === "super-admin" ? (
          <div className="mx-auto grid max-w-md grid-cols-5 items-center">
            <NavLink
              to="/dashboard/add-medicine"
              className={mobileTabClass}
              onClick={closeSidebar}
            >
              <FaCapsules className="text-base" />
              <span>Add Med</span>
            </NavLink>

            <NavLink
              to="/dashboard/all-medicine"
              className={mobileTabClass}
              onClick={closeSidebar}
            >
              <FaClipboardList className="text-base" />
              <span>Medicines</span>
            </NavLink>

            <NavLink
              to="/dashboard/all-orders"
              className={mobileTabClass}
              onClick={closeSidebar}
            >
              <FaShoppingCart className="text-base" />
              <span>Orders</span>
            </NavLink>

            <NavLink
              to="/dashboard/profit-report"
              className={mobileTabClass}
              onClick={closeSidebar}
            >
              <FaChartLine className="text-base" />
              <span>Profit</span>
            </NavLink>

            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-600"
            >
              <FaBars className="text-base" />
              <span>More</span>
            </button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-md grid-cols-3 items-center">
            <NavLink
              to="/dashboard/order-list"
              className={mobileTabClass}
              onClick={closeSidebar}
            >
              <FaShoppingCart className="text-base" />
              <span>Order</span>
            </NavLink>

            <NavLink to="/" className={mobileTabClass} onClick={closeSidebar}>
              <FaHome className="text-base" />
              <span>Live Store</span>
            </NavLink>

            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-600"
            >
              <FaBars className="text-base" />
              <span>Menu</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}

export default Dashboard;
