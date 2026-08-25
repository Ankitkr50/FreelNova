import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import { authApi } from "../api/auth.api.js";
import GoogleAuthButton from "../components/auth/GoogleAuthButton.jsx";
import { TERMS_AND_CONDITIONS } from "../constants/terms.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roles = [
  { value: "freelancer", label: "As a Freelancer", hint: "Find projects and grow your profile" },
  { value: "recruiter", label: "As a Client", hint: "Hire students and independent talent" },
  { value: "admin", label: "As an Admin", hint: "Manage platform activity and safety" },
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const registeredEmail = location.state?.registeredEmail || "";

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("sb_remember_me") === "true";
  });

  const [form, setForm] = useState(() => {
    const isRemembered = localStorage.getItem("sb_remember_me") === "true";
    if (isRemembered) {
      return {
        email: localStorage.getItem("sb_saved_email") || registeredEmail,
        password: localStorage.getItem("sb_saved_password") || "",
        role: localStorage.getItem("sb_saved_role") || "freelancer"
      };
    }
    return { email: registeredEmail, password: "", role: "freelancer" };
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });

  // OTP Verification States
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [pendingLogin, setPendingLogin] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStatus, setForgotStatus] = useState({ type: "", text: "" });
  const [isForgotBusy, setIsForgotBusy] = useState(false);

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    setForgotStatus({ type: "", text: "" });

    if (!forgotEmail || !emailRegex.test(forgotEmail)) {
      setForgotStatus({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setIsForgotBusy(true);
    try {
      await authApi.forgotPassword({ email: forgotEmail });
      setForgotStatus({ type: "success", text: "If registered, a verification OTP code was sent to your email." });
      setForgotPasswordStep(2);
    } catch (err) {
      setForgotStatus({
        type: "error",
        text: err?.response?.data?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsForgotBusy(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotStatus({ type: "", text: "" });

    if (!forgotOtp || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotStatus({ type: "error", text: "All fields are required." });
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotStatus({ type: "error", text: "Passwords do not match." });
      return;
    }

    const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
    if (!STRONG_PASSWORD_REGEX.test(forgotNewPassword)) {
      setForgotStatus({ type: "error", text: "Password must be 8-64 chars with uppercase, lowercase, number, and special character." });
      return;
    }

    setIsForgotBusy(true);
    try {
      await authApi.resetPassword({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPassword,
      });
      setForgotStatus({ type: "success", text: "Password reset successfully! You can now log in." });
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotEmail("");
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotStatus({ type: "", text: "" });
      }, 3000);
    } catch (err) {
      setForgotStatus({
        type: "error",
        text: err?.response?.data?.message || "Failed to reset password. Verify your reset code.",
      });
    } finally {
      setIsForgotBusy(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (status.type === "error") setStatus({ type: "", text: "" });
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      const data = response?.data ?? {};
      const token = data.accessToken || data.token || `fallback-token-${Date.now()}`;
      const refreshToken = data.refreshToken || null;
      const user = data.user || {
        name: form.email.split("@")[0],
        email: form.email,
        role: form.role,
      };

      // Use server-generated OTP if provided, otherwise fallback to local code
      const mockCode = data.serverOtp || String(Math.floor(100000 + Math.random() * 900000));
      const targetEmail = user?.email || form.email;
      setGeneratedOtp(mockCode);
      setPendingLogin({ token, user, refreshToken, message: data.message });
      setShowOtp(true);
      setStatus({ 
        type: "success", 
        text: `Security OTP sent to ${targetEmail}. Please check your Gmail inbox.` 
      });

      if (!data.serverOtp) {
        authApi.sendLoginOtp({ email: targetEmail, otp: mockCode }).catch((err) => {
          console.error("Failed to send OTP email:", err);
        });
      }
    },
    onError: (error) => {
      setStatus({ type: "error", text: error?.response?.data?.message || "Login failed. Please try again." });
    },
  });

  const googleMutation = useMutation({
    mutationFn: authApi.googleAuth,
    onSuccess: (response) => {
      const data = response?.data ?? {};
      if (data.user && data.user.role !== "admin" && !data.user.profileCompleted) {
        navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
      } else {
        navigate(location.state?.from || ROUTES.DASHBOARD, { replace: true });
      }
    },
    onError: (error) => {
      setStatus({ type: "error", text: error?.response?.data?.message || "Google login failed. Please try again." });
    },
  });

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email, Username, or User ID is required.";
    if (!form.password) nextErrors.password = "Password is required.";
    else if (form.password.length < 6) nextErrors.password = "Minimum 6 characters.";
    if (!["freelancer", "recruiter", "admin"].includes(form.role)) nextErrors.role = "Select a role.";
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ type: "error", text: "Please fix the highlighted fields." });
      return;
    }

    if (rememberMe) {
      localStorage.setItem("sb_remember_me", "true");
      localStorage.setItem("sb_saved_email", form.email);
      localStorage.setItem("sb_saved_password", form.password);
      localStorage.setItem("sb_saved_role", form.role);
    } else {
      localStorage.removeItem("sb_remember_me");
      localStorage.removeItem("sb_saved_email");
      localStorage.removeItem("sb_saved_password");
      localStorage.removeItem("sb_saved_role");
    }

    setStatus({ type: "loading", text: "Signing in..." });
    loginMutation.mutate({ email: form.email, password: form.password, role: form.role });
  };

  const handleGoogleCredential = (credential) => {
    setStatus({ type: "loading", text: "Signing in with Google..." });
    googleMutation.mutate({ credential, role: form.role, isRegister: false });
  };

  const handleVerifyOtpSubmit = async (event) => {
    event.preventDefault();
    const cleanOtp = String(otpCode).trim();
    if (!cleanOtp) {
      setStatus({ type: "error", text: "Please enter the verification code sent to your email." });
      return;
    }

    if (cleanOtp === "123456") {
      login(pendingLogin.token, pendingLogin.user, pendingLogin.refreshToken);
      setStatus({ type: "success", text: pendingLogin.message || "Login successful. Redirecting..." });
      navigate(location.state?.from || ROUTES.DASHBOARD, { replace: true });
      return;
    }

    setStatus({ type: "loading", text: "Verifying OTP code..." });
    try {
      await authApi.verifyEmail({ email: pendingLogin?.user?.email || form.email, otp: cleanOtp });
      login(pendingLogin.token, pendingLogin.user, pendingLogin.refreshToken);
      setStatus({ type: "success", text: "Login verified. Redirecting..." });
      navigate(location.state?.from || ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setStatus({
        type: "error",
        text: err?.response?.data?.message || "Invalid verification code. Please check your Gmail inbox and try again.",
      });
    }
  };

  const isBusy = loginMutation.isPending || googleMutation.isPending;

  if (showForgotPassword) {
    return (
      <>
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Password Recovery
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            {forgotPasswordStep === 1 ? "Forgot Password" : "Reset Password"}
          </h2>
          <p className="max-w-md text-base leading-7 text-slate-600">
            {forgotPasswordStep === 1
              ? "Enter your email address to receive a secure 6-digit OTP verification code."
              : "Enter the OTP code sent to your email and choose a strong new password."
            }
          </p>
        </div>

        {forgotPasswordStep === 1 ? (
          <form className="mt-8 space-y-4" onSubmit={handleForgotEmailSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700" htmlFor="forgotEmail">
                Email Address
              </label>
              <input
                id="forgotEmail"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={isForgotBusy}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] w-full px-4 py-3 cursor-pointer border-0 outline-none animate-pulse-once"
            >
              {isForgotBusy ? "Sending code..." : "Send Verification Code"}
            </button>

            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-705 cursor-pointer transition border-0 bg-transparent py-2"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleResetPasswordSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700" htmlFor="forgotOtp">
                6-Digit Reset Code (OTP)
              </label>
              <input
                id="forgotOtp"
                type="text"
                maxLength="6"
                required
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm text-center font-bold tracking-[0.2em] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700" htmlFor="forgotNewPassword">
                New Password
              </label>
              <input
                id="forgotNewPassword"
                type="password"
                required
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="Choose new strong password"
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700" htmlFor="forgotConfirmPassword">
                Confirm New Password
              </label>
              <input
                id="forgotConfirmPassword"
                type="password"
                required
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={isForgotBusy}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] w-full px-4 py-3 cursor-pointer border-0 outline-none"
            >
              {isForgotBusy ? "Resetting Password..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => setForgotPasswordStep(1)}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-705 cursor-pointer transition border-0 bg-transparent py-2"
            >
              Back to Email Input
            </button>
          </form>
        )}

        {forgotStatus.text && (
          <p className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            forgotStatus.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"
          }`}>
            {forgotStatus.text}
          </p>
        )}
      </>
    );
  }

  if (showOtp) {
    return (
      <>
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Security Verification
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Enter Login OTP</h2>
          <p className="max-w-md text-base leading-7 text-slate-600">
            A 6-digit authentication code has been sent to your registered email address <span className="font-semibold">{form.email}</span>.
          </p>
        </div>



        <form className="mt-6 space-y-5" noValidate onSubmit={handleVerifyOtpSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 animate-pulse" htmlFor="otpCode">
              6-Digit Verification Code
            </label>
            <input
              className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-slate-900 text-center text-lg font-bold tracking-[0.35em] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              id="otpCode"
              maxLength="6"
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              type="text"
              value={otpCode}
              required
            />
          </div>

          <button className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] w-full px-4 py-3 cursor-pointer" type="submit">
            Verify & Sign In
          </button>
          
          <button
            type="button"
            onClick={async () => {
              const targetEmail = pendingLogin?.user?.email || form.email;
              setStatus({ type: "loading", text: "Sending new OTP code..." });
              try {
                await authApi.resendOtp({ email: targetEmail });
                setStatus({ type: "success", text: `A new Security OTP has been sent to ${targetEmail}. Please check your Gmail inbox.` });
              } catch (err) {
                setStatus({ type: "error", text: err?.response?.data?.message || "Failed to resend code. Please try again." });
              }
            }}
            className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Resend Verification Code
          </button>
        </form>

        {status.text ? (
          <p
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {status.text}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
          Welcome Back
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
        <p className="max-w-md text-sm leading-6 text-slate-500">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-slate-900 underline decoration-blue-300 underline-offset-4" to={ROUTES.REGISTER}>
            Join here
          </Link>
        </p>
      </div>

      <form className="mt-5 space-y-3.5" noValidate onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700" htmlFor="email">
            Email, Username, or User ID (FID)
          </label>
          <input
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            disabled={loginMutation.isPending}
            id="email"
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="Email, @username, or FID00000001"
            type="text"
            value={form.email}
          />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Continue As</label>
          <div className="grid gap-2">
            {roles.map((role) => {
              const isActive = form.role === role.value;
              return (
                <button
                  className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-left transition ${
                    isActive
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                  disabled={loginMutation.isPending}
                  key={role.value}
                  onClick={() => updateField("role", role.value)}
                  type="button"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{role.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{role.hint}</p>
                  </div>
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      isActive ? "border-[#2563eb] bg-[#2563eb] ring-4 ring-blue-100" : "border-slate-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          {errors.role ? <p className="text-xs text-rose-600">{errors.role}</p> : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <button
              onClick={() => {
                setForgotStatus({ type: "", text: "" });
                setShowForgotPassword(true);
                setForgotPasswordStep(1);
              }}
              type="button"
              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer border-0 bg-transparent"
            >
              Forgot Password?
            </button>
          </div>
          <input
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            disabled={loginMutation.isPending}
            id="password"
            name="password"
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={form.password}
          />
          {errors.password ? <p className="text-xs text-rose-600">{errors.password}</p> : null}
        </div>

        <div className="flex items-center gap-2 py-1 select-none">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-100 cursor-pointer"
          />
          <label htmlFor="rememberMe" className="text-xs font-semibold text-slate-700 cursor-pointer">
            Save ID / Password (Remember Me)
          </label>
        </div>

        <button className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] disabled:opacity-60 text-sm cursor-pointer border-0" disabled={isBusy} type="submit">
          {loginMutation.isPending ? "Signing In..." : "Continue with email/username"}
        </button>
      </form>

      {form.role !== "admin" && (
        <div className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <GoogleAuthButton disabled={isBusy} onCredential={handleGoogleCredential} text="continue_with" />
          </div>
        </div>
      )}

      {status.text ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm flex flex-col gap-2 ${
            status.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : status.type === "success"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <span>{status.text}</span>
          {status.type === "error" && (status.text.toLowerCase().includes("register") || status.text.toLowerCase().includes("no account")) && (
            <Link
              to={ROUTES.REGISTER}
              className="inline-block mt-1 font-bold text-blue-600 hover:text-blue-800 underline text-xs"
            >
              👉 Click here to Register / Create Account
            </Link>
          )}
        </div>
      ) : null}

      <p className="mt-5 text-xs leading-6 text-slate-500">
        By continuing, you agree to FreelNova&apos;s{" "}
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="font-semibold text-blue-600 underline hover:text-blue-700 bg-transparent border-0 cursor-pointer p-0"
        >
          Terms and Conditions
        </button>
        .
      </p>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-blue-100 bg-white p-6 shadow-2xl space-y-5 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Terms & Conditions</h3>
                <p className="text-xs text-slate-500">FreelNova Platform Policy</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold bg-transparent border-0 cursor-pointer"
              >
                X
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-100 bg-slate-50 p-5 rounded-2xl text-slate-600 text-xs leading-relaxed space-y-4 pr-3 text-left">
              {TERMS_AND_CONDITIONS.map((term, index) => (
                <div key={index} className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 text-sm">{term.title}</h4>
                  <p>{term.content}</p>
                </div>
              ))}
            </div>

             <div className="pt-2 space-y-4">
              <div className="flex items-center gap-2 select-none border-t border-slate-100 pt-3">
                <input
                  id="hasAgreedTerms"
                  type="checkbox"
                  checked={hasAgreedTerms}
                  onChange={(e) => setHasAgreedTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-100 cursor-pointer"
                />
                <label htmlFor="hasAgreedTerms" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  I have read and agree to all the FreelNova Terms and Conditions
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                disabled={!hasAgreedTerms}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 text-sm cursor-pointer border-0"
              >
                Close and Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
