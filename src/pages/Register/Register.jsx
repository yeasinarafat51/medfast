import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";

import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaShieldAlt,
  FaCheckCircle,
  FaPills,
} from "react-icons/fa";

import useAuth from "../../hooks/useAuth";

function Register() {
  const { createUser, updateUserProfile, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registering, setRegistering] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const password = watch("password", "");

  // ==========================================
  // REGISTER
  // ==========================================

  const onSubmit = async (data) => {
    try {
      setRegistering(true);

      // Password match
      if (data.password !== data.confirmPassword) {
        Swal.fire({
          icon: "error",
          title: "Password Mismatch",
          text: "Password and confirm password must be the same.",
          confirmButtonColor: "#2563eb",
        });

        setRegistering(false);
        return;
      }

      // ========================================
      // Firebase Create User
      // ========================================

      const result = await createUser(data.email, data.password);

      // ========================================
      // Update Firebase Profile
      // ========================================

      await updateUserProfile(data.name, "");

      // ========================================
      // Get Firebase Token
      // ========================================

      const token = await result.user.getIdToken();

      // ========================================
      // Save User To MongoDB
      // ========================================

      await axios.post(
        " http://localhost:5000/api/users",
        {
          name: data.name.trim(),
          address: data.address.trim(),
          phone: data.phone.trim(),
          email: data.email.trim().toLowerCase(),
          photo: "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // ========================================
      // Email Verification
      // ========================================

      await verifyEmail();

      // ========================================
      // Success
      // ========================================

      await Swal.fire({
        icon: "success",
        title: "Welcome to NovaCare!",
        text: "Your account has been created successfully. Please verify your email.",
        confirmButtonText: "Continue",
        confirmButtonColor: "#2563eb",
      });

      reset();

      navigate("/");
    } catch (error) {
      console.error("Registration Error:", error);

      let errorMessage = "Something went wrong. Please try again.";

      // Firebase errors
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: errorMessage,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setRegistering(false);
    }
  };

  // ==========================================
  // INPUT COMPONENT STYLE
  // ==========================================

  const inputClass = (hasError) =>
    `
    w-full
    rounded-xl
    border
    ${hasError ? "border-red-400" : "border-slate-200"}
    bg-slate-50
    py-3.5
    pl-11
    pr-4
    text-sm
    text-slate-800
    outline-none
    transition-all
    duration-300
    placeholder:text-slate-400
    hover:border-slate-300
    focus:border-blue-500
    focus:bg-white
    focus:ring-4
    focus:ring-blue-500/10
    `;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* ======================================
          BACKGROUND DECORATION
      ====================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 animate-pulse rounded-full bg-blue-200/30 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 animate-pulse rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-100/20 blur-3xl" />
      </div>

      {/* ======================================
          MAIN
      ====================================== */}

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="
          grid
          w-full
          max-w-6xl
          overflow-hidden
          rounded-[2rem]
          border
          border-white
          bg-white
          shadow-[0_25px_80px_-20px_rgba(15,23,42,0.25)]
          lg:grid-cols-2
        "
        >
          {/* ==================================
              LEFT SIDE
          ================================== */}

          <div
            className="
            relative
            hidden
            overflow-hidden
            bg-gradient-to-br
            from-blue-700
            via-blue-600
            to-cyan-500
            p-10
            text-white
            lg:flex
            lg:flex-col
            lg:justify-between
          "
          >
            {/* Background circles */}

            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[40px] border-white/10" />

            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border-[50px] border-white/10" />

            {/* Top */}

            <div className="relative z-10">
              {/* Logo */}

              <div className="mb-10 flex items-center gap-3">
                <div
                  className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white
                  text-blue-600
                  shadow-lg
                "
                >
                  <FaPills className="text-2xl" />
                </div>

                <div>
                  <h1 className="text-2xl font-black tracking-tight">
                    NovaCare
                  </h1>

                  <p className="text-xs font-medium text-blue-100">
                    Pharmacy & Healthcare
                  </p>
                </div>
              </div>

              <div className="max-w-md">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                  Your Health. Our Care.
                </p>

                <h2 className="text-4xl font-black leading-tight xl:text-5xl">
                  Your trusted
                  <span className="block text-cyan-100">
                    healthcare partner.
                  </span>
                </h2>

                <p className="mt-6 text-base leading-7 text-blue-100">
                  Create your NovaCare account and enjoy a simple, secure and
                  convenient pharmacy experience.
                </p>
              </div>

              {/* Features */}

              <div className="mt-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <FaCheckCircle />
                  </div>

                  <span className="text-sm font-medium">
                    Easy online medicine ordering
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <FaShieldAlt />
                  </div>

                  <span className="text-sm font-medium">
                    Secure and protected account
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <FaCheckCircle />
                  </div>

                  <span className="text-sm font-medium">
                    Track your orders easily
                  </span>
                </div>
              </div>
            </div>

            {/* Illustration */}

            <div className="relative z-10 mt-10 flex justify-center">
              <div
                className="
                flex
                h-52
                w-52
                items-center
                justify-center
                rounded-full
                bg-white/10
                shadow-inner
                backdrop-blur-sm
              "
              >
                <div
                  className="
                  flex
                  h-36
                  w-36
                  animate-bounce
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                  text-blue-600
                  shadow-2xl
                "
                  style={{
                    animationDuration: "3s",
                  }}
                >
                  <FaPills className="text-7xl" />
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 text-xs text-blue-100">
              © {new Date().getFullYear()} NovaCare. All rights reserved.
            </div>
          </div>

          {/* ==================================
              RIGHT SIDE
          ================================== */}

          <div className="p-6 sm:p-8 md:p-10 lg:p-12">
            {/* Mobile Logo */}

            <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                <FaPills className="text-xl" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-blue-700">NovaCare</h1>

                <p className="text-[10px] font-medium text-slate-500">
                  Pharmacy & Healthcare
                </p>
              </div>
            </div>

            {/* Heading */}

            <div className="mb-7">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
                Get Started
              </p>

              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Create your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Join NovaCare and manage your healthcare needs with ease.
              </p>
            </div>

            {/* ==================================
                FORM
            ================================== */}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Pharmacy Name
                </label>

                <div className="relative">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Enter your full Pharmacy  name"
                    autoComplete="name"
                    className={inputClass(errors.name)}
                    {...register("name", {
                      required: "Full name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                  />
                </div>

                {errors.name && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={inputClass(errors.email)}
                    {...register("email", {
                      required: "Email address is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                  />
                </div>

                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Address */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-4 top-4 text-slate-400" />

                  <textarea
                    placeholder="Enter your full address"
                    rows="2"
                    className={`${inputClass(errors.address)} resize-none`}
                    {...register("address", {
                      required: "Address is required",
                    })}
                  />
                </div>

                {errors.address && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* Phone */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>

                <div className="relative">
                  <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    autoComplete="tel"
                    className={inputClass(errors.phone)}
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^01[3-9]\d{8}$/,
                        message: "Enter a valid Bangladesh phone number",
                      },
                    })}
                  />
                </div>

                {errors.phone && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Password Grid */}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Password */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`${inputClass(errors.password)} pr-11`}
                      {...register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Minimum 6 characters",
                        },
                      })}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm Password
                  </label>

                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={`${inputClass(errors.confirmPassword)} pr-11`}
                      {...register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (value) =>
                          value === password || "Passwords do not match",
                      })}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Hint */}

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <div className="flex items-start gap-2">
                  <FaShieldAlt className="mt-0.5 text-blue-600" />

                  <p className="text-xs leading-5 text-blue-700">
                    Use at least 6 characters for a stronger password.
                  </p>
                </div>
              </div>

              {/* Register Button */}

              <button
                type="submit"
                disabled={registering}
                className="
                  group
                  relative
                  mt-2
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-3
                  overflow-hidden
                  rounded-xl
                  bg-gradient-to-r
                  from-blue-600
                  to-cyan-500
                  px-5
                  py-3.5
                  font-bold
                  text-white
                  shadow-lg
                  shadow-blue-500/20
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:shadow-xl
                  hover:shadow-blue-500/30
                  disabled:cursor-not-allowed
                  disabled:opacity-70
                "
              >
                {/* Button Shine */}

                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {registering ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create NovaCare Account</span>

                    <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Login */}

            <div className="mt-7 text-center">
              <p className="text-sm text-slate-500">
                Already have a NovaCare account?
              </p>

              <Link
                to="/login"
                className="
                  mt-2
                  inline-flex
                  items-center
                  gap-2
                  font-bold
                  text-blue-600
                  transition
                  hover:text-blue-700
                "
              >
                Sign in to your account
                <FaArrowRight className="text-xs" />
              </Link>
            </div>

            {/* Security */}

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
              <FaShieldAlt className="text-green-500" />

              <span>Your information is securely protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
