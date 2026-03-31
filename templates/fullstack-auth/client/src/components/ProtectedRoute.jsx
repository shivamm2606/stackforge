import { Navigate } from "react-router-dom";
import { getToken } from "../services/auth";

// Redirect to /login when no token in localStorage.
export default function ProtectedRoute({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}
