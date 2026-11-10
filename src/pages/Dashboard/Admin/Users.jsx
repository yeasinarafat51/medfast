import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import {
  FaSearch,
  FaPhone,
  FaMapMarkerAlt,
  FaEnvelope,
  FaTrash,
  FaUserShield,
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
} from "react-icons/fa";

function Users() {
  const [users, setUsers] = useState([]);

  // Full page loading
  const [loading, setLoading] = useState(true);

  // Search loading
  const [searching, setSearching] = useState(false);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [sort, setSort] = useState("asc");

  const limit = 10;

  // =====================================================
  // LOAD USERS
  // =====================================================

  const loadUsers = async (isSearch = false) => {
    try {
      // First page load হলে full loading
      if (isSearch) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      const res = await axios.get(
        ` http://localhost:5000/api/users?search=${encodeURIComponent(
          search.trim(),
        )}&page=${page}&limit=${limit}&sort=${sort}`,
      );

      setUsers(res.data.users || []);

      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.log("Load Users Error:", error);

      Swal.fire({
        icon: "error",
        title: "Failed to Load Users",
        text:
          error.response?.data?.message ||
          "Something went wrong while loading users.",
      });
    } finally {
      if (isSearch) {
        setSearching(false);
      } else {
        setLoading(false);
      }
    }
  };

  // =====================================================
  // SEARCH / SORT / PAGINATION
  // =====================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      const isSearchAction = search.trim() !== "";

      loadUsers(isSearchAction);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, page, sort]);

  // =====================================================
  // ROLE UPDATE
  // =====================================================

  const handleRoleUpdate = async (id, role) => {
    try {
      let nextRole;

      if (role === "customer") {
        nextRole = "admin";
      } else if (role === "admin") {
        nextRole = "super-admin";
      } else {
        nextRole = "customer";
      }

      const result = await Swal.fire({
        title: "Change User Role?",
        html: `
          <div style="font-size:14px;color:#6b7280">
            Change role from 
            <strong>${role}</strong>
            to
            <strong>${nextRole}</strong>?
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, Update",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      const res = await axios.patch(
        ` http://localhost:5000/api/users/${id}/role`,
        {
          role: nextRole,
        },
      );

      if (res.data.success) {
        await Swal.fire({
          icon: "success",
          title: "Role Updated!",
          text: `User role changed to ${nextRole}.`,
          timer: 1500,
          showConfirmButton: false,
        });

        // Reload without full loading screen
        loadUsers(true);
      }
    } catch (error) {
      console.log("Role Update Error:", error);

      Swal.fire({
        icon: "error",
        title: "Role Update Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Something went wrong.",
      });
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: "This user will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await axios.delete(` http://localhost:5000/api/users/${id}`);

      if (res.data.success) {
        await Swal.fire({
          icon: "success",
          title: "User Deleted!",
          text: "User has been removed successfully.",
          timer: 1500,
          showConfirmButton: false,
        });

        // Reload without full loading screen
        loadUsers(true);
      }
    } catch (error) {
      console.log("Delete User Error:", error);

      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Something went wrong.",
      });
    }
  };

  // =====================================================
  // ROLE STYLE
  // =====================================================

  const getRoleStyle = (role) => {
    if (role === "super-admin") {
      return {
        badge: "bg-purple-100 text-purple-700 border-purple-200",
        dot: "bg-purple-600",
      };
    }

    if (role === "admin") {
      return {
        badge: "bg-green-100 text-green-700 border-green-200",
        dot: "bg-green-600",
      };
    }

    return {
      badge: "bg-blue-100 text-blue-700 border-blue-200",
      dot: "bg-blue-600",
    };
  };

  // =====================================================
  // USER INITIAL
  // =====================================================

  const getInitial = (name) => {
    if (!name) return "U";

    return name.charAt(0).toUpperCase();
  };

  // =====================================================
  // FULL PAGE LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-gray-700">
            Loading Users...
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Please wait while we load user information.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <FaUsers className="text-xl" />
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight text-gray-800 sm:text-4xl">
                    User Management
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    Manage registered users, roles and account information.
                  </p>
                </div>
              </div>
            </div>

            {/* USER COUNT */}

            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FaUsers />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Current Users
                </p>

                <p className="text-xl font-black text-gray-800">
                  {users.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            SEARCH & SORT
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* SEARCH */}

            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-12 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />

              {/* SEARCH SPINNER */}

              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                </div>
              )}
            </div>

            {/* SORT */}

            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-semibold text-gray-500 sm:block">
                Sort:
              </span>

              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 sm:w-40"
              >
                <option value="asc">A-Z</option>
                <option value="desc">Z-A</option>
              </select>
            </div>
          </div>

          {/* SEARCH STATUS */}

          {searching && (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              Searching users...
            </div>
          )}
        </div>

        {/* =================================================
            DESKTOP TABLE
        ================================================= */}

        <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead>
                <tr className="border-b border-blue-700 bg-blue-600 text-white">
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    #
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Address
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">
                    Role
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <FaUsers className="text-2xl" />
                      </div>

                      <h3 className="mt-4 text-lg font-bold text-gray-700">
                        No Users Found
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Try searching with another name or email.
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => {
                    const roleStyle = getRoleStyle(user.role);

                    return (
                      <tr
                        key={user._id}
                        className="group transition hover:bg-blue-50/40"
                      >
                        {/* NUMBER */}

                        <td className="px-5 py-4 text-sm font-bold text-gray-400">
                          {(page - 1) * limit + index + 1}
                        </td>

                        {/* USER */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-black text-white shadow-sm">
                              {getInitial(user.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-gray-800">
                                {user.name || "N/A"}
                              </p>

                              <p className="text-xs text-gray-400">
                                User ID: {String(user._id).slice(-8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* CONTACT */}

                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FaEnvelope className="text-blue-500" />

                              <span>{user.email || "N/A"}</span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FaPhone className="text-green-500" />

                              <span>{user.phone || "N/A"}</span>
                            </div>
                          </div>
                        </td>

                        {/* ADDRESS */}

                        <td className="max-w-[220px] px-5 py-4">
                          <div className="flex items-start gap-2">
                            <FaMapMarkerAlt className="mt-1 shrink-0 text-red-500" />

                            <span className="line-clamp-2 text-sm leading-5 text-gray-600">
                              {user.address || "Address not available"}
                            </span>
                          </div>
                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide ${roleStyle.badge}`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${roleStyle.dot}`}
                            />

                            {user.role || "customer"}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={user.role === "super-admin"}
                              onClick={() =>
                                handleRoleUpdate(user._id, user.role)
                              }
                              title={
                                user.role === "super-admin"
                                  ? "Protected user"
                                  : "Change role"
                              }
                              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-sm transition ${
                                user.role === "super-admin"
                                  ? "cursor-not-allowed bg-gray-300"
                                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                              }`}
                            >
                              <FaUserShield />

                              {user.role === "customer"
                                ? "Admin"
                                : user.role === "admin"
                                  ? "Super Admin"
                                  : "Protected"}
                            </button>

                            <button
                              disabled={user.role === "super-admin"}
                              onClick={() => handleDelete(user._id)}
                              title={
                                user.role === "super-admin"
                                  ? "Protected user"
                                  : "Delete user"
                              }
                              className={`inline-flex items-center justify-center rounded-xl p-2.5 text-white shadow-sm transition ${
                                user.role === "super-admin"
                                  ? "cursor-not-allowed bg-gray-300"
                                  : "bg-red-500 hover:bg-red-600 hover:shadow-md"
                              }`}
                            >
                              <FaTrash />
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
        </div>

        {/* =================================================
            MOBILE CARDS
        ================================================= */}

        <div className="space-y-4 md:hidden">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <FaUsers className="text-2xl" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-gray-700">
                No Users Found
              </h3>

              <p className="mt-1 text-sm text-gray-500">Try another search.</p>
            </div>
          ) : (
            users.map((user, index) => {
              const roleStyle = getRoleStyle(user.role);

              return (
                <div
                  key={user._id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* CARD HEADER */}

                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-black text-white">
                        {getInitial(user.name)}
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-800">
                          {user.name || "N/A"}
                        </h3>

                        <p className="text-xs text-gray-400">
                          #{(page - 1) * limit + index + 1}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${roleStyle.badge}`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* CARD BODY */}

                  <div className="space-y-3 p-4">
                    {/* EMAIL */}

                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FaEnvelope />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Email
                        </p>

                        <p className="break-all text-sm font-medium text-gray-700">
                          {user.email || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* PHONE */}

                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                        <FaPhone />
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Phone
                        </p>

                        <p className="text-sm font-medium text-gray-700">
                          {user.phone || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* ADDRESS */}

                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                        <FaMapMarkerAlt />
                      </div>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          Address
                        </p>

                        <p className="text-sm leading-5 text-gray-700">
                          {user.address || "Address not available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CARD ACTIONS */}

                  <div className="flex gap-2 border-t border-gray-100 p-4">
                    <button
                      disabled={user.role === "super-admin"}
                      onClick={() => handleRoleUpdate(user._id, user.role)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold text-white transition ${
                        user.role === "super-admin"
                          ? "cursor-not-allowed bg-gray-300"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <FaUserShield />

                      {user.role === "customer"
                        ? "Make Admin"
                        : user.role === "admin"
                          ? "Make Super Admin"
                          : "Protected"}
                    </button>

                    <button
                      disabled={user.role === "super-admin"}
                      onClick={() => handleDelete(user._id)}
                      className={`flex w-12 items-center justify-center rounded-xl text-white transition ${
                        user.role === "super-admin"
                          ? "cursor-not-allowed bg-gray-300"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =================================================
            PAGINATION
        ================================================= */}

        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
          <div className="text-sm text-gray-500">
            Page <span className="font-bold text-gray-800">{page}</span> of{" "}
            <span className="font-bold text-gray-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FaChevronLeft />

              <span className="hidden sm:block">Previous</span>
            </button>

            <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm">
              {page}
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="hidden sm:block">Next</span>

              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Users;
