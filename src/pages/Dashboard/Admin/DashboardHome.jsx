import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaCapsules,
  FaShoppingCart,
  FaUsers,
  FaMoneyBillWave,
  FaExclamationTriangle,
} from "react-icons/fa";

function DashboardHome() {
  const [stats, setStats] = useState({
    totalMedicine: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    lowStock: 0,
  });

  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        " http://localhost:5000/api/dashboard/admin-stats",
      );

      setStats(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <h2 className="text-3xl font-bold text-blue-600">
          Loading Dashboard...
        </h2>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Medicines",
      value: stats.totalMedicine,
      icon: <FaCapsules className="text-4xl text-blue-600" />,
      bg: "bg-blue-100",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: <FaShoppingCart className="text-4xl text-green-600" />,
      bg: "bg-green-100",
    },
    {
      title: "Customers",
      value: stats.totalCustomers,
      icon: <FaUsers className="text-4xl text-purple-600" />,
      bg: "bg-purple-100",
    },
    {
      title: "Revenue",
      value: `৳ ${stats.totalRevenue}`,
      icon: <FaMoneyBillWave className="text-4xl text-yellow-600" />,
      bg: "bg-yellow-100",
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: <FaExclamationTriangle className="text-4xl text-red-600" />,
      bg: "bg-red-100",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-blue-700">Admin Dashboard</h1>

        <p className="mt-2 text-gray-500">
          Welcome to MedPharm Management System
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`${card.bg} rounded-2xl p-6 shadow-lg hover:shadow-xl transition`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-gray-600 font-medium">{card.title}</h3>

                <h2 className="text-3xl font-bold mt-2">{card.value}</h2>
              </div>

              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardHome;
