import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <div className="auth-card">
        <h1>Create account</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a password"
              required
              autoComplete="new-password"
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
