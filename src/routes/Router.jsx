/* eslint-disable no-undef */
import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

// import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Dashboard from "../pages/Dashboard/Dashboard";
import ErrorPage from "../pages/ErrorPage/ErrorPage";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword";
// import Dashboard from "../pages/Dashboard/Dashboard";
import AddMedicine from "../pages/Dashboard/Admin/AddMedicine";
import AllMedicine from "../pages/Dashboard/Admin/AllMedicine";
import UpdateMedicine from "../pages/Dashboard/Admin/UpdateMedicine";
import SliderManagement from "../pages/Dashboard/Admin/SliderManagement";
import AllItemMedicine from "../pages/Dashboard/Customer/AllItemMedicine";
import AllOrders from "../pages/Dashboard/Admin/AllOrders";
import MyOrders from "../pages/Dashboard/Customer/MyOrders";
import DashboardHome from "../pages/Dashboard/Admin/DashboardHome";
import Users from "../pages/Dashboard/Admin/Users";
import SalesReport from "../pages/Dashboard/Admin/SalesReport";
import ProfitReport from "../pages/Dashboard/ProfitReport";
import AdminRoute from "./AdminRoute";
// import SpecialOfferManagement from "../pages/SpecialOfferManagement";
import MyInvoices from "../pages/Dashboard/Customer/MyInvoices";
import InvoiceDetails from "../pages/Dashboard/Customer/InvoiceDetails";
import Cart from "../pages/Cart/Cart";
import Checkout from "../pages/Checkout/Checkout";
import Mainbody from "../components/Home/Mainbody";
import SpecialOfferManagement from "../pages/SpecialOfferManagement";
import TotalOrders from "../pages/Dashboard/Admin/TotalOrders";
import HeadlineManagement from "../pages/Dashboard/Admin/HeadlineManagement";
import MrpCalculator from "../pages/Dashboard/Admin/MrpCalculator";
import OrderList from "../pages/Dashboard/Admin/OrderList";
import NewProducts from "../components/Headline/NewProducts";
// import Unauthorized from "./pages/Unauthorized";
// import Unauthorized from "./pages/Unauthorized";
const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Mainbody />,
      },
      {
        path: "allproduct",
        element: <AllItemMedicine />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "checkout",
        element: <Checkout />,
      },
      // {
      //   path: "all-item-medicine",
      //   element: <AllItemMedicine />,
      // },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      // {
      //   path: "dashboard",
      //   element: <Dashboard />,
      // },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "my-orders",
        element: <MyOrders />,
      },
      {
        path: "new-products",
        element: <NewProducts />,
      },
      // {
      //   path: "my-invoices",
      //   element: <MyInvoices />,
      // },
      {
        path: "/invoice/:invoiceNo",
        element: <InvoiceDetails />,
      },

      // {
      //   path: "/unauthorized",
      //   element: <Unauthorized />,
      // },
    ],
  },
  {
    path: "/dashboard",
    element: (
      <AdminRoute>
        <Dashboard />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardHome />,
      },

      {
        path: "add-medicine",
        element: <AddMedicine />,
      },
      {
        path: "special-offers",
        element: <SpecialOfferManagement />,
      },
      {
        path: "sliders",
        element: <SliderManagement />,
      },
      {
        path: "all-medicine",
        element: <AllMedicine />,
      },
      {
        path: "update-medicine/:id",
        element: <UpdateMedicine />,
      },
      {
        path: "my-invoices",
        element: <MyInvoices />,
      },
      // {
      //   path: "all-item-medicine",
      //   element: <AllItemMedicine />,
      // },
      {
        path: "all-orders",
        element: <AllOrders />,
      },
      // {
      //   path: "my-orders",
      //   element: <MyOrders />,
      // },
      {
        path: "users",
        element: <Users />,
      },
      // {
      //   path: "my-invoices",
      //   element: <MyInvoices />,
      // },
      {
        path: "invoice/:id",
        element: <InvoiceDetails />,
      },
      {
        path: "/dashboard/admin/invoice/:id",
        element: <MyInvoices />,
      },
      {
        path: "invoice/:id",
        element: <InvoiceDetails />,
      },
      {
        path: "profit-report",
        element: <ProfitReport />,
      },
      {
        path: "sales-report",
        element: <SalesReport />,
      },
      {
        path: "total-orders",
        element: <TotalOrders />,
      },
      {
        path: "order-list",
        element: <OrderList />,
      },
      {
        path: "headlines",
        element: <HeadlineManagement />,
      },
      {
        path: "mrp-calculator",
        element: <MrpCalculator />,
      },
    ],
  },
]);

export default router;
