import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { loginAsync, registerAsync, clearAuthError } from "../features/auth/authSlice";

type Mode = "login" | "register";

export default function AuthModal() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    dispatch(clearAuthError());
  }, [mode, dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (mode === "register") {
      if (!name.trim()) return setValidationError("Name is required");
      if (!email.trim()) return setValidationError("Email is required");
      if (!emailRegex.test(email.trim())) return setValidationError("Please enter a valid email");
      if (password.length < 4) return setValidationError("Password must be at least 4 characters");
      if (password !== confirmPassword) return setValidationError("Passwords do not match");
      dispatch(registerAsync({ name: name.trim(), email: email.trim(), password }));
    } else {
      if (!email.trim()) return setValidationError("Email is required");
      if (!emailRegex.test(email.trim())) return setValidationError("Please enter a valid email");
      if (!password) return setValidationError("Password is required");
      dispatch(loginAsync({ email: email.trim(), password }));
    }
  };

  const displayError = validationError || error;

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>

        <form onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <div className="auth-field">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="auth-field">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus={mode === "login"}
            />
          </div>

          <div className="auth-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {displayError && <p className="auth-error">{displayError}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? mode === "login" ? "Signing in..." : "Creating account..."
              : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button type="button" className="link-btn" onClick={() => setMode("register")}>
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" className="link-btn" onClick={() => setMode("login")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
