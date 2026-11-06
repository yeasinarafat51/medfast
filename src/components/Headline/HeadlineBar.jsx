import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://medpharm-server-3.onrender.com"
).trim();

// ডিফল্ট শিরোনাম টেক্সট
const DEFAULT_HEADLINES = [
  "Welcome to MedPharm — 100% genuine certified medicines with fast delivery across Bangladesh.",
  "Temperature-controlled cold-chain logistics operational for all insulins, vaccines, and biologics.",
  "Orders placed before 2:00 PM qualify for same-day scheduled regional pharmacy delivery.",
  "24/7 dedicated pharmacy support desk and verified prescription assistance are active.",
];

function HeadlineBar() {
  const [headlines, setHeadlines] = useState(DEFAULT_HEADLINES);

  // ব্যাকএন্ড থেকে শুধু সক্রিয় শিরোনাম টেক্সটগুলো লোড করা
  useEffect(() => {
    let isMounted = true;

    axios
      .get(`${API_URL}/api/headlines/active`, { timeout: 10000 })
      .then((res) => {
        if (!isMounted) return;

        const data = res.data?.headlines || res.data;
        if (Array.isArray(data) && data.length > 0) {
          const extractedTexts = data
            .filter((item) => item && item.isActive !== false)
            .map((item) => {
              if (typeof item === "string") return item.trim();
              return String(item.text || item.title || "").trim();
            })
            .filter((t) => t.length > 0);

          if (extractedTexts.length > 0) {
            setHeadlines(extractedTexts);
          }
        }
      })
      .catch((err) => {
        console.warn("Headline feed offline, using defaults:", err?.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!headlines || headlines.length === 0) return null;

  // নিরবচ্ছিন্ন ৩X রিপিটেশন লুপ (যাতে স্ক্রলিংয়ে কোনো ফাঁকা না থাকে)
  const tickerItems = useMemo(() => {
    return [...headlines, ...headlines, ...headlines];
  }, [headlines]);

  return (
    <div
      aria-label="Headlines"
      className="relative z-40 bg-slate-950 text-slate-100 py-2 sm:py-2.5 px-4 overflow-hidden border-b border-emerald-500/20 select-none backdrop-blur-xl"
    >
      {/* দুই প্রান্তে মসৃণ ফেড শ্যাডো */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-slate-950 to-transparent z-10" />

      {/* শুধুমাত্র শিরোনামের লেখাগুলো */}
      <div className="relative flex overflow-x-hidden whitespace-nowrap">
        <div className="animate-tv-ticker inline-flex items-center gap-12 py-0.5 text-xs sm:text-[13px] font-medium tracking-wide text-slate-200 cursor-default">
          {tickerItems.map((text, idx) => (
            <span key={idx} className="inline-flex items-center gap-12">
              <span className="hover:text-emerald-400 transition-colors duration-200">
                {text}
              </span>
              <span className="text-emerald-500/50 select-none text-[9px]">
                ✦
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HeadlineBar;
