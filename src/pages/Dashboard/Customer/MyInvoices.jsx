import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../../../hooks/useAuth";

function MyInvoices() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.email) return;

      try {
        const res = await axios.get(
          ` http://localhost:5000/api/orders/my-orders/${user.email}`,
        );

        if (res.data.success) {
          setOrders(res.data.orders || []);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.log(error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <h2 className="text-2xl font-bold">Loading...</h2>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-8 text-4xl font-bold text-blue-700">Order Invoices</h1>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="table w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th>#</th>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Order Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {orders.length > 0 ? (
              orders.map((order, index) => (
                <tr key={order._id}>
                  <td>{index + 1}</td>

                  <td>{order.invoiceNo || `INV-${order._id.slice(-6)}`}</td>

                  <td>{new Date(order.orderDate).toLocaleDateString()}</td>

                  <td className="font-bold text-green-600">
                    ৳ {order.grandTotal}
                  </td>

                  <td>
                    <span
                      className={`rounded-full px-3 py-1 text-white ${
                        order.paymentStatus === "Paid"
                          ? "bg-green-600"
                          : "bg-red-600"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`rounded-full px-3 py-1 text-white ${
                        order.orderStatus === "Pending"
                          ? "bg-yellow-500"
                          : order.orderStatus === "Processing"
                            ? "bg-blue-600"
                            : "bg-green-600"
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </td>

                  <td>
                    <Link
                      to={`/dashboard/invoice/${order._id}`}
                      className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                    >
                      View Invoice
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-8 text-center">
                  No Orders Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyInvoices;
