import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";

import useAuth from "../../hooks/useAuth";

import {
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaLock,
  FaEnvelope,
  FaArrowRight,
  FaShieldAlt,
  FaUserPlus,
  FaCapsules,
} from "react-icons/fa";

function Login() {
  const { loginUser, googleLogin } = useAuth();

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // =========================================================
  // API URL
  // =========================================================

  const API_URL = " http://localhost:5000";

  // =========================================================
  // EMAIL / PASSWORD LOGIN
  // =========================================================

  const onSubmit = async (data) => {
    if (loginLoading) return;

    try {
      setLoginLoading(true);

      // -----------------------------------------------------
      // Firebase Login
      // -----------------------------------------------------

      const result = await loginUser(data.email, data.password);

      const firebaseUser = result.user;

      // -----------------------------------------------------
      // Get Firebase Token
      // -----------------------------------------------------

      const token = await firebaseUser.getIdToken(true);

      console.log("Firebase Login Successful");

      // -----------------------------------------------------
      // Backend Profile Check
      //
      // IMPORTANT:
      // Backend fail করলেও Firebase login fail ধরা হবে না।
      // -----------------------------------------------------

      try {
        const res = await axios.get(`${API_URL}/api/test/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },

          timeout: 10000,
        });

        console.log("Backend Profile:", res.data);
      } catch (backendError) {
        console.warn(
          "Backend profile check failed:",
          backendError?.response?.data || backendError.message,
        );

        // Backend error হলেও login successful
      }

      // -----------------------------------------------------
      // Success
      // -----------------------------------------------------

      await Swal.fire({
        icon: "success",
        title: "Welcome to NovaCare!",
        text: "You have logged in successfully.",
        timer: 1600,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-2xl",
        },
      });

      navigate("/");
    } catch (error) {
      console.error("Login Error:", error);

      let errorMessage = "Unable to login. Please try again.";

      // Firebase Errors
      if (error?.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      } else if (error?.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error?.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error?.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error?.code === "auth/too-many-requests") {
        errorMessage =
          "Too many login attempts. Please wait and try again later.";
      } else if (error?.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: errorMessage,
        confirmButtonText: "Try Again",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // =========================================================
  // GOOGLE LOGIN
  // =========================================================

  const handleGoogleLogin = async () => {
    if (googleLoading) return;

    try {
      setGoogleLoading(true);

      // -----------------------------------------------------
      // Firebase Google Login
      // -----------------------------------------------------

      const result = await googleLogin();

      const firebaseUser = result.user;

      // -----------------------------------------------------
      // Get Token
      // -----------------------------------------------------

      const token = await firebaseUser.getIdToken(true);

      console.log("Google Login Successful");

      // -----------------------------------------------------
      // Backend Check
      // -----------------------------------------------------

      try {
        const res = await axios.get(`${API_URL}/api/test/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },

          timeout: 10000,
        });

        console.log("Backend Profile:", res.data);
      } catch (backendError) {
        console.warn(
          "Backend profile check failed:",
          backendError?.response?.data || backendError.message,
        );

        // Backend fail হলেও Google login successful
      }

      // -----------------------------------------------------
      // Success
      // -----------------------------------------------------

      await Swal.fire({
        icon: "success",
        title: "Welcome to NovaCare!",
        text: "Google login successful.",
        timer: 1600,
        showConfirmButton: false,
      });

      navigate("/");
    } catch (error) {
      console.error("Google Login Error:", error);

      let errorMessage = "Google login failed. Please try again.";

      if (error?.code === "auth/popup-closed-by-user") {
        errorMessage = "Google login window was closed.";
      } else if (error?.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked by your browser.";
      } else if (error?.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: "error",
        title: "Google Login Failed",
        text: errorMessage,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/20 blur-3xl" />
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_25px_80px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:grid-cols-2">
          {/* =================================================
              LEFT BRAND SECTION
          ================================================= */}

          <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
            {/* Background circles */}

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[40px] border-white/10" />

            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border-[50px] border-white/10" />

            <div className="absolute right-20 top-1/2 h-24 w-24 rounded-full bg-white/10 blur-xl" />

            <div className="relative z-10">
              {/* Logo */}

              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl">
                  <FaCapsules className="text-3xl text-blue-600" />
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight">
                    NovaCare
                  </h1>

                  <p className="text-sm font-medium text-blue-100">
                    Pharmacy & Healthcare
                  </p>
                </div>
              </div>

              {/* Main text */}

              <div className="mt-20 max-w-lg">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                  <FaShieldAlt />
                  Trusted Healthcare Platform
                </p>

                <h2 className="text-5xl font-black leading-[1.08] xl:text-6xl">
                  Your Health.
                  <br />
                  <span className="text-cyan-100">Our Priority.</span>
                </h2>

                <p className="mt-6 max-w-md text-base leading-7 text-blue-100">
                  Access medicines, healthcare products and pharmacy services
                  from one secure and convenient platform.
                </p>
              </div>
            </div>

            {/* Features */}

            <div className="relative z-10 mt-12 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  ✓
                </div>

                <span className="text-sm font-medium">
                  Secure & reliable healthcare
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  ✓
                </div>

                <span className="text-sm font-medium">
                  Easy medicine ordering
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  ✓
                </div>

                <span className="text-sm font-medium">
                  Fast & convenient service
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT LOGIN SECTION
          ================================================= */}

          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
            <div className="w-full max-w-md">
              {/* Mobile Logo */}

              <div className="mb-8 flex items-center justify-center lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-200">
                    <FaCapsules className="text-2xl text-white" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-black text-slate-800">
                      NovaCare
                    </h1>

                    <p className="text-xs font-medium text-slate-500">
                      Pharmacy & Healthcare
                    </p>
                  </div>
                </div>
              </div>

              {/* Header */}

              <div className="mb-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <FaLock className="text-lg text-blue-600" />
                </div>

                <h2 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl">
                  Welcome Back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to your NovaCare account and continue your healthcare
                  journey.
                </p>
              </div>

              {/* =================================================
                  FORM
              ================================================= */}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...register("email", {
                        required: "Email address is required",

                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: "Please enter a valid email address",
                        },
                      })}
                      className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        errors.email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                  </div>

                  {errors.email && (
                    <p className="mt-2 text-xs font-semibold text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700">
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-blue-600 transition hover:text-blue-700"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...register("password", {
                        required: "Password is required",

                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                      className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        errors.password
                          ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-2 text-xs font-semibold text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Login Button */}

                <button
                  type="submit"
                  disabled={loginLoading || googleLoading}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Or continue with
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Google */}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loginLoading || googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaGoogle className="text-red-500" />
                    Continue with Google
                  </>
                )}
              </button>

              {/* Register */}

              <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">
                  Don't have a NovaCare account?
                </p>

                <Link
                  to="/register"
                  className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700"
                >
                  <FaUserPlus />
                  Create an account
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>

              {/* Security */}

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <FaShieldAlt className="text-green-500" />
                Your login is protected by secure authentication.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
