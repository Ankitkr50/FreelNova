import { useMemo, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { authApi } from "../api/auth.api.js";
import GoogleAuthButton from "../components/auth/GoogleAuthButton.jsx";
import { TERMS_AND_CONDITIONS } from "../constants/terms.js";
import { useAuth } from "../hooks/useAuth.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\S]{8,64}$/;

const roles = [
  { value: "freelancer", label: "As a Freelancer", hint: "Apply to projects, build your profile, and get hired." },
  { value: "recruiter", label: "As a Client", hint: "Post work, review applicants, and hire talent quickly." },
];

function OtpInput({ value, onChange, disabled }) {
  const inputRefs = useRef([]);
  const digits = `${value || ""}      `.slice(0, 6).split("");

  const handleKeyDown = (index, event) => {
    if (event.key !== "Backspace") return;

    event.preventDefault();
    const next = [...digits];

    if (next[index]?.trim()) {
      next[index] = "";
      onChange(next.join("").trimEnd());
      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
      next[index - 1] = "";
      onChange(next.join("").trimEnd());
    }
  };

  const handleChange = (index, event) => {
    const char = event.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;

    const next = [...digits];
    next[index] = char;
    onChange(next.join("").trim());

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-3">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          className={`h-14 w-12 rounded-2xl border-2 text-center text-2xl font-bold text-slate-900 outline-none transition ${
            digits[index]?.trim()
              ? "border-blue-400 bg-blue-50"
              : "border-blue-100 bg-slate-50"
          } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50`}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          pattern="\d"
          type="text"
          value={digits[index]?.trim() || ""}
        />
      ))}
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  const defaultRole = useMemo(() => {
    const role = searchParams.get("role");
    return roles.some((item) => item.value === role) ? role : "freelancer";
  }, [searchParams]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: defaultRole,
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);

  const [serverOtpHint, setServerOtpHint] = useState("");

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      const registeredEmail = response?.data?.data?.email || form.email;
      const mockOtp = response?.data?.data?.mockOtp;
      if (mockOtp) setServerOtpHint(mockOtp);
      setStep(2);
      setOtp("");
      setStatus({
        type: "success",
        text: `OTP sent to ${registeredEmail}. Check your inbox or use code below.`,
      });
      startResendCooldown();
    },
    onError: (error) => {
      setStatus({
        type: "error",
        text: error?.response?.data?.message || "Registration failed. Please try again.",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (response) => {
      const respData = response?.data ?? {};
      const actualData = respData.data || respData;
      
      const token = actualData.accessToken || actualData.token;
      const userPayload = actualData.user;
      const refreshTok = actualData.refreshToken;

      if (token && userPayload) {
        login(token, userPayload, refreshTok);
        setStatus({ type: "success", text: "🎉 Email verified successfully! Logging you in..." });
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }, 1200);
      } else {
        setStatus({ type: "success", text: "Email verified. Redirecting to login..." });
        setTimeout(() => {
          navigate(ROUTES.LOGIN, {
            replace: true,
            state: { registeredEmail: form.email },
          });
        }, 1200);
      }
    },
    onError: (error) => {
      setStatus({
        type: "error",
        text: error?.response?.data?.message || "Invalid OTP. Please try again.",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: () => {
      setOtp("");
      setStatus({ type: "success", text: "New OTP sent to your email." });
      startResendCooldown();
    },
    onError: (error) => {
      setStatus({
        type: "error",
        text: error?.response?.data?.message || "Could not resend OTP.",
      });
    },
  });

  const googleMutation = useMutation({
    mutationFn: authApi.googleAuth,
    onSuccess: (response) => {
      const data = response?.data ?? {};
      login(data.accessToken, data.user, data.refreshToken);
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    onError: (error) => {
      setStatus({
        type: "error",
        text: error?.response?.data?.message || "Google signup failed. Please try again.",
      });
    },
  });

  const startResendCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (status.type === "error") {
      setStatus({ type: "", text: "" });
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if (!strongPasswordRegex.test(form.password)) {
      nextErrors.password = "Min 8 chars with uppercase, lowercase, number, and special character.";
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!roles.some((item) => item.value === form.role)) {
      nextErrors.role = "Select account type.";
    }

    return nextErrors;
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus({ type: "error", text: "Please fix the highlighted fields." });
      return;
    }

    setStatus({ type: "loading", text: "Sending OTP..." });
    registerMutation.mutate({
      fullName: form.fullName,
      email: form.email,
      password: form.password,
      role: form.role,
    });
  };

  const handleVerifySubmit = (event) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setStatus({ type: "error", text: "Enter the complete 6-digit OTP." });
      return;
    }

    setStatus({ type: "loading", text: "Verifying OTP..." });
    verifyMutation.mutate({ email: form.email, otp: otp.trim() });
  };

  const isBusy =
    registerMutation.isPending ||
    verifyMutation.isPending ||
    resendMutation.isPending ||
    googleMutation.isPending;

  if (step === 2) {
    return (
      <>
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Verify Email
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Check your inbox</h2>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            We sent a 6-digit code to <span className="font-semibold text-slate-800">{form.email}</span>.
          </p>
        </div>



        <form className="mt-6 space-y-6" noValidate onSubmit={handleVerifySubmit}>
          <div className="space-y-3">
            <label className="block text-center text-sm font-semibold text-slate-700">
              Enter 6-digit OTP
            </label>
            <OtpInput disabled={isBusy} onChange={setOtp} value={otp} />
          </div>

          <button
            className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] disabled:opacity-60"
            disabled={isBusy || otp.trim().length < 6}
            type="submit"
          >
            {verifyMutation.isPending ? "Verifying..." : "Verify and Continue"}
          </button>
        </form>

        {status.text ? (
          <p
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {status.text}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            className="text-slate-500 underline underline-offset-4 transition hover:text-slate-700 disabled:opacity-40"
            disabled={isBusy}
            onClick={() => {
              setStep(1);
              setOtp("");
              setStatus({ type: "", text: "" });
            }}
            type="button"
          >
            Change email
          </button>
          <button
            className="font-semibold text-blue-700 transition hover:text-blue-800 disabled:opacity-40"
            disabled={isBusy || resendCooldown > 0}
            onClick={() => resendMutation.mutate({ email: form.email })}
            type="button"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="py-2 space-y-4">
      <div className="space-y-1.5">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
          Get Started
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create your account</h2>
        <p className="max-w-md text-sm leading-6 text-slate-500">
          Already have an account?{" "}
          <Link
            className="font-semibold text-slate-900 underline decoration-blue-300 underline-offset-4"
            to={ROUTES.LOGIN}
          >
            Sign in here
          </Link>
        </p>
      </div>

      <form className="mt-4 space-y-3.5" noValidate onSubmit={handleRegisterSubmit}>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700" htmlFor="fullName">
            Full Name
          </label>
          <input
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            disabled={isBusy}
            id="fullName"
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Ankit Sharma"
            type="text"
            value={form.fullName}
          />
          {errors.fullName ? <p className="text-xs text-rose-600">{errors.fullName}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">I want to join as</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => {
              const isActive = form.role === role.value;
              return (
                <button
                  className={`rounded-2xl border px-3.5 py-2.5 text-left transition ${
                    isActive
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                  }`}
                  disabled={isBusy}
                  key={role.value}
                  onClick={() => updateField("role", role.value)}
                  type="button"
                >
                  <p className="text-sm font-semibold text-slate-900">{role.label}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{role.hint}</p>
                </button>
              );
            })}
          </div>
          {errors.role ? <p className="text-xs text-rose-600">{errors.role}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700" htmlFor="email">
            Email Address
          </label>
          <input
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            disabled={isBusy}
            id="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={form.email}
          />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              disabled={isBusy}
              id="password"
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Min 8 chars, A-Z, 0-9, & special"
              type="password"
              value={form.password}
            />
            {errors.password ? <p className="text-xs text-rose-600">{errors.password}</p> : null}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              disabled={isBusy}
              id="confirmPassword"
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Re-enter password"
              type="password"
              value={form.confirmPassword}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-rose-600">{errors.confirmPassword}</p>
            ) : null}
          </div>
        </div>

        <button
          className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:brightness-[1.02] disabled:opacity-60 text-sm cursor-pointer border-0"
          disabled={isBusy}
          type="submit"
        >
          {registerMutation.isPending ? "Sending OTP..." : "Continue - Get OTP"}
        </button>
      </form>

      <div className="mt-4 w-full">
        <div className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-center shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <GoogleAuthButton
            disabled={isBusy}
            onCredential={(credential) => {
              setStatus({ type: "loading", text: "Creating account with Google..." });
              googleMutation.mutate({ credential, role: form.role, isRegister: true });
            }}
            text="signup_with"
          />
        </div>
      </div>

      {status.text ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : status.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {status.text}
        </p>
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
    </div>
  );
}

export default Register;
