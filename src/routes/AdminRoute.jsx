import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import useAuth from "../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || " http://localhost:5000";

function AdminRoute({ children, allowedRoles = ["admin", "super-admin"] }) {
  const { user, loading } = useAuth();

  const [roleLoading, setRoleLoading] = useState(true);
  const [role, setRole] = useState("");

  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const getRole = async () => {
      if (!user?.email) {
        if (isMounted) {
          setRole("");
          setRoleLoading(false);
        }

        return;
      }

      try {
        setRoleLoading(true);

        const token = await user.getIdToken();

        const res = await axios.get(
          `${API_URL}/api/users/email/${encodeURIComponent(user.email)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (isMounted) {
          setRole(res.data?.user?.role || "");
        }
      } catch (error) {
        console.error("Role Load Error:", error);

        if (isMounted) {
          setRole("");
        }
      } finally {
        if (isMounted) {
          setRoleLoading(false);
        }
      }
    };

    getRole();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>

          <h2 className="text-2xl font-bold text-blue-600">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!role) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default AdminRoute;
