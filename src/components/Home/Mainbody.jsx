import { Link } from "react-router-dom";
import {
  FaAndroid,
  FaDownload,
  FaShippingFast,
  FaShieldAlt,
  FaPills,
} from "react-icons/fa";
import HeroSlider from "./HeroSlider";
import AllitemMedicine from "../../pages/Dashboard/Customer/AllItemMedicine";
import NewProducts from "../Headline/NewProducts";

const APK_DOWNLOAD_URL =
  "https://web2apkpro.com/public_download.php?project_id=20811&token=6e0ada7cc4";

const Mainbody = () => {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      {/* =====================================================
          MOBILE APP TOP ANNOUNCEMENT / APP DOWNLOAD STRIP
      ===================================================== */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 px-3 py-2.5 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <FaAndroid className="text-lg" />
            </div>
            <div className="truncate">
              <p className="truncate text-xs font-extrabold tracking-wide text-white">
                NovaCare BD Mobile App
              </p>
              <p className="truncate text-[10px] text-emerald-200">
                ১০০% ফ্রি হোম ডেলিভারি • দ্রুত অর্ডার করুন
              </p>
            </div>
          </div>

          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-emerald-950 shadow-sm transition hover:bg-emerald-400 active:scale-95"
          >
            <FaDownload className="text-[10px]" />
            <span>Install App</span>
          </a>
        </div>
      </div>

      {/* =====================================================
          BANGLA DATE & NOTICE BADGE (VALOBAZAR STYLE)
      ===================================================== */}
      {/* <div className="mx-auto max-w-7xl px-2.5 pt-2 sm:px-4">
        <div className="flex items-center gap-2 rounded-xl bg-amber-50/90 border border-amber-200/80 px-3.5 py-2 text-xs text-amber-900 shadow-2xs">
          <span className="text-sm">🛒</span>
          <p className="font-bold text-[11px] sm:text-xs">
            আজকের অফার • সারা বাংলাদেশে ফ্রি হোম ডেলিভারি ও ১০০% অরিজিনাল ওষুধ
          </p>
        </div>
      </div> */}

      {/* =====================================================
          HERO SLIDER (CURVED CARD CAROUSEL LIKE VALOBAZAR)
      ===================================================== */}
      <div className="mx-auto max-w-7xl px-2.5 pt-2 sm:px-4">
        <HeroSlider />
        {/* <NewProducts /> */}
      </div>

      {/* =====================================================
          MOBILE APP TRUST & QUICK ACTION PILLS
      ===================================================== */}
      <div className="mx-auto max-w-7xl px-2.5 pt-3 sm:px-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white p-2.5 shadow-xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FaShippingFast className="text-sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-extrabold text-slate-800">
                Free Delivery
              </p>
              <p className="truncate text-[9px] text-slate-500">
                সারা বাংলাদেশে
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white p-2.5 shadow-xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FaShieldAlt className="text-sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-extrabold text-slate-800">
                100% Genuine
              </p>
              <p className="truncate text-[9px] text-slate-500">
                অরিজিনাল ওষুধ
              </p>
            </div>
          </div>

          <Link
            to="/allproduct"
            className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-white p-2.5 shadow-xs transition active:scale-95"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FaPills className="text-sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-extrabold text-slate-800">
                Up to 16% OFF
              </p>
              <p className="truncate text-[9px] text-emerald-600 font-bold">
                Order Now →
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* =====================================================
          ALL MEDICINES CATALOG SECTION
      ===================================================== */}
      <div className="mx-auto max-w-7xl pt-2">
        <AllitemMedicine />
      </div>
    </div>
  );
};

export default Mainbody;
