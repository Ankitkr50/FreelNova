import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { authApi } from "../api/auth.api.js";

// ─── 6-box OTP Input ─────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const digits = (value + "      ").slice(0, 6).split("");

  const handleKey = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]?.trim()) {
        next[index] = "";
        onChange(next.join("").trimEnd());
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        next[index - 1] = "";
        onChange(next.join("").trimEnd());
      }
    }
  };

  const handleChange = (index, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = [...digits];
    next[index] = char;
    onChange(next.join("").trim());
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          className={`h-14 w-12 rounded-2xl border-2 text-center text-2xl font-bold text-slate-900 outline-none transition
            ${digits[i]?.trim()
              ? "border-blue-400 bg-blue-50"
              : "border-blue-100 bg-slate-50"
            }
            focus:border-blue-500 focus:ring-4 focus:ring-blue-100
            disabled:opacity-50`}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          pattern="\d"
          type="text"
          value={digits[i]?.trim() || ""}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp]   = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [resendCooldown, setResendCooldown] = useState(0);

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      setStatus({ type: "success", text: "Email verified! Redirecting to login…" });
      setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 1300);
    },
    onError: (err) => {
      setStatus({ type: "error", text: err?.response?.data?.message || "Invalid OTP. Please try again." });
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: () => {
      setOtp("");
      setStatus({ type: "success", text: "New OTP sent to your email." });
      startCooldown();
    },
    onError: (err) => {
      setStatus({ type: "error", text: err?.response?.data?.message || "Could not resend OTP." });
    },
  });

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const isBusy = verifyMutation.isPending || resendMutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) { setStatus({ type: "error", text: "Enter your email address." }); return; }
    if (otp.trim().length !== 6) { setStatus({ type: "error", text: "Enter the complete 6-digit OTP." }); return; }
    setStatus({ type: "loading", text: "Verifying…" });
    verifyMutation.mutate({ email: email.trim(), otp: otp.trim() });
  };

  return (
    <>
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
          Final Step
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Verify your email</h2>
        <p className="max-w-md text-sm leading-6 text-slate-600">
          Enter the <strong>6-digit code</strong> we sent to your inbox to activate your account.
        </p>
      </div>

      <form className="mt-8 space-y-6" noValidate onSubmit={handleSubmit}>
        {/* Email — pre-filled from URL param, editable if needed */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="ve-email">
            Email Address
          </label>
          <input
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            disabled={isBusy}
            id="ve-email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </div>

        {/* OTP boxes */}
        <div className="space-y-3">
          <label className="block text-center text-sm font-semibold text-slate-700">
            6-digit OTP
          </label>
          <OtpInput disabled={isBusy} onChange={setOtp} value={otp} />
        </div>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] disabled:opacity-60"
          disabled={isBusy || otp.trim().length < 6}
          type="submit"
        >
          {verifyMutation.isPending ? "Verifying…" : "Verify & Activate Account"}
        </button>
      </form>

      {status.text ? (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          status.type === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-700"
        }`}>
          {status.text}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          className="text-slate-500 underline underline-offset-4 transition hover:text-slate-700"
          to={ROUTES.LOGIN}
        >
          ← Back to Login
        </Link>
        <button
          className="font-semibold text-blue-700 transition hover:text-blue-800 disabled:opacity-40"
          disabled={isBusy || resendCooldown > 0 || !email.trim()}
          onClick={() => resendMutation.mutate({ email: email.trim() })}
          type="button"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
        </button>
      </div>
    </>
  );
}

export default VerifyEmail;
