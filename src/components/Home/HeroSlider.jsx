import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).trim();

// উচ্চমানের ডিফল্ট ব্যানার (যদি ডাটাবেস লোড হতে সময় নেয় বা খালি থাকে)
const DEFAULT_SLIDERS = [
  {
    _id: "default-1",
    title: "UniMed UniHealth — FLAT 16% OFF",
    description:
      "সব ধরনের ওষুধে বিশেষ ছাড় ও সারা বাংলাদেশে দ্রুত ফ্রি ডেলিভারি",
    image: "https://iili.io/na9JoQ4.jpg",
    buttonText: "Shop Now",
    buttonLink: "/allproduct",
  },
  {
    _id: "default-2",
    title: "Square Pharmaceuticals — Genuine Supply",
    description: "১০০% অরিজিনাল ও সঠিক তাপমাত্রায় সংরক্ষিত ওষুধ",
    image: "https://i.ibb.co/L9Hw3YQ/square-banner.jpg",
    buttonText: "Explore Now",
    buttonLink: "/allproduct",
  },
];

function HeroSlider() {
  const [sliders, setSliders] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // মোবাইলে আঙুল দিয়ে সোয়াইপ করার সাপোর্ট (Touch Swipe)
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // =====================================================
  // LOAD ACTIVE SLIDERS FROM API
  // =====================================================
  useEffect(() => {
    let mounted = true;

    const loadSliders = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/sliders/active`, {
          timeout: 12000,
        });

        if (!mounted) return;

        const data = Array.isArray(res.data?.sliders) ? res.data.sliders : [];
        setSliders(data.length > 0 ? data : DEFAULT_SLIDERS);
      } catch (error) {
        console.error("Slider Load Error:", error);
        if (mounted) {
          setSliders(DEFAULT_SLIDERS);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSliders();

    return () => {
      mounted = false;
    };
  }, []);

  const activeSlides = sliders.length > 0 ? sliders : DEFAULT_SLIDERS;
  const total = activeSlides.length;

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (idx) => {
    setCurrent(idx);
  };

  // অটো-স্লাইড (প্রতি ৪ সেকেন্ড পর পর) + হোভারে পজ
  useEffect(() => {
    if (isPaused || total <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(timer);
  }, [current, isPaused, total]);

  // মোবাইলে আঙুল দিয়ে সোয়াইপ হ্যান্ডলার
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      nextSlide(); // বামে সোয়াইপ -> পরের স্লাইড
    } else if (distance < -45) {
      prevSlide(); // ডানে সোয়াইপ -> আগের স্লাইড
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* =====================================================
          CURVED CARD BANNER (VALOBAZAR / E-COMMERCE STYLE)
      ===================================================== */}
      <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm ring-1 ring-slate-200/80 bg-slate-100 aspect-[2.1/1] sm:aspect-[16/7] md:aspect-[16/6]">
        {/* SLIDING ANIMATION TRACK */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {activeSlides.map((slide, idx) => {
            const link = slide.buttonLink || "/allproduct";
            const isExternal = link.startsWith("http");

            const SlideContent = (
              <div className="relative h-full w-full shrink-0 cursor-pointer overflow-hidden">
                <img
                  src={slide.image || "https://iili.io/na9JoQ4.jpg"}
                  alt={slide.title || "Banner"}
                  className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-102"
                />

                {/* অপশনাল ক্যাপশন টেক্সট (যদি টাইটেল থাকে) */}
                {slide.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 sm:p-5 pt-8 text-white">
                    <p className="line-clamp-1 text-xs font-black sm:text-base md:text-lg drop-shadow-sm">
                      {slide.title}
                    </p>
                    {slide.description && (
                      <p className="line-clamp-1 text-[10px] text-white/90 sm:text-xs drop-shadow-sm mt-0.5">
                        {slide.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );

            return isExternal ? (
              <a
                key={slide._id || idx}
                href={link}
                target="_blank"
                rel="noreferrer"
                className="h-full w-full shrink-0"
              >
                {SlideContent}
              </a>
            ) : (
              <Link
                key={slide._id || idx}
                to={link}
                className="h-full w-full shrink-0"
              >
                {SlideContent}
              </Link>
            );
          })}
        </div>

        {/* =====================================================
            LEFT & RIGHT CHEVRONS (SLEEK GLASS CIRCLE BUTTONS)
        ===================================================== */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Previous Slide"
              className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/30 hover:bg-black/55 text-white backdrop-blur-xs border border-white/20 shadow-md transition active:scale-90"
            >
              <FaChevronLeft className="text-xs sm:text-sm -ml-0.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Next Slide"
              className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/30 hover:bg-black/55 text-white backdrop-blur-xs border border-white/20 shadow-md transition active:scale-90"
            >
              <FaChevronRight className="text-xs sm:text-sm -mr-0.5" />
            </button>
          </>
        )}

        {/* =====================================================
            PAGINATION PILL DOTS (SLEEK EXPANDING PILL)
        ===================================================== */}
        {total > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-xs border border-white/10">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  current === idx
                    ? "w-6 bg-emerald-400 shadow-xs"
                    : "w-1.5 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HeroSlider;
