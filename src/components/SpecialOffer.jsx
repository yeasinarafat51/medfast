import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaClock, FaTag, FaShoppingCart } from "react-icons/fa";
import { Link } from "react-router-dom";

const API_URL = " http://localhost:5000";

const SpecialOffer = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOffers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/special-offers/active`);

      setOffers(response.data?.offers || []);
    } catch (error) {
      console.error("Special Offer Error:", error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();

    const interval = setInterval(() => {
      loadOffers();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 h-8 w-56 animate-pulse rounded bg-gray-200" />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-80 animate-pulse rounded-2xl bg-gray-200"
            />
          ))}
        </div>
      </section>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <section className="bg-gradient-to-b from-red-50 to-white py-10">
      <div className="mx-auto max-w-7xl px-4">
        {/* HEADER */}

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-xl text-white shadow">
              <FaTag />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-gray-800 md:text-3xl">
                Special Offer
              </h2>

              <p className="text-sm text-gray-500">
                Limited time special discount
              </p>
            </div>
          </div>

          <Link
            to="/all-medicines"
            className="w-fit rounded-lg bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600"
          >
            View All Medicines
          </Link>
        </div>

        {/* PRODUCTS */}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {offers.map((offer) => {
            const medicine = offer.medicine;

            const regularPrice = Number(offer.regularPrice) || 0;

            const offerPrice = Number(offer.offerPrice) || 0;

            const discount = Number(offer.discountPercent) || 0;

            const savedAmount = regularPrice - offerPrice;

            return (
              <div
                key={offer._id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* DISCOUNT */}

                <div className="absolute left-2 top-2 z-10 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow">
                  -{discount}%
                </div>

                {/* IMAGE */}

                <div className="flex h-44 items-center justify-center bg-gray-50 p-4">
                  {medicine?.image ? (
                    <img
                      src={medicine.image}
                      alt={medicine.medicineName}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <FaTag className="text-5xl text-gray-300" />
                  )}
                </div>

                {/* CONTENT */}

                <div className="p-4">
                  <h3 className="line-clamp-2 min-h-[48px] text-sm font-bold text-gray-800 md:text-base">
                    {medicine?.medicineName || "Medicine"}
                  </h3>

                  {medicine?.company && (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {medicine.company}
                    </p>
                  )}

                  {/* PRICE */}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">
                      ৳ {regularPrice}
                    </span>

                    <span className="text-xl font-extrabold text-green-600">
                      ৳ {offerPrice}
                    </span>
                  </div>

                  {/* SAVING */}

                  <div className="mt-2 rounded-lg bg-green-50 px-2 py-1.5 text-center text-xs font-bold text-green-700">
                    Save ৳ {savedAmount.toFixed(2)}
                  </div>

                  {/* END DATE */}

                  <div className="mt-3 flex items-center gap-1 text-xs text-red-500">
                    <FaClock />

                    <span>
                      Ends {new Date(offer.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* BUTTON */}

                  <Link
                    to="/all-medicines"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-600"
                  >
                    <FaShoppingCart />
                    Shop Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpecialOffer;
