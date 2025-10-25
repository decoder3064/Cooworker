import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  async function handleLogout() {
    setProcessing(true);
    setError(null);
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to log out.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page-container">
      <div className="dashboard-card">
        <h1>Dashboard</h1>
        <p>Welcome, {user?.email}</p>
        {error && <div className="auth-error">{error}</div>}
        <button type="button" onClick={handleLogout} disabled={processing}>
          {processing ? "Logging out..." : "Log Out"}
        </button>
      </div>
    </div>
  );
}
