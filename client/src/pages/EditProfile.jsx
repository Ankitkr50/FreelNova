import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BasicInfoSection from "../components/profile/BasicInfoSection.jsx";
import BioSection from "../components/profile/BioSection.jsx";
import ExperienceSection from "../components/profile/ExperienceSection.jsx";
import PortfolioSection from "../components/profile/PortfolioSection.jsx";
import ProfileNavLinks from "../components/profile/ProfileNavLinks.jsx";
import SkillsSection from "../components/profile/SkillsSection.jsx";
import HourlyRateSection from "../components/profile/HourlyRateSection.jsx";
import WorkExperienceSection from "../components/profile/WorkExperienceSection.jsx";
import PortfolioItemsSection from "../components/profile/PortfolioItemsSection.jsx";
import { ROUTES } from "../constants/routes.js";
import { useProfileQuery, useUpdateProfileMutation } from "../hooks/useProfile.js";
import { authApi } from "../api/auth.api.js";
import { useAuth } from "../hooks/useAuth.js";
import http from "../api/http.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https?:\/\/.+/i;

function validateProfile(values) {
  const errors = {};

  if (values.fullName !== undefined && !values.fullName?.trim()) {
    errors.fullName = "Full name is required.";
  }
  if (values.username && values.username.trim()) {
    if (!/^[a-z0-9_-]{3,30}$/.test(values.username.trim())) {
      errors.username = "Username must be 3-30 characters, lowercase alphanumeric, underscore, or hyphen.";
    }
  }
  if (values.email && values.email.trim()) {
    if (!emailRegex.test(values.email)) errors.email = "Enter a valid email address.";
  }
  if (values.portfolioLinks?.some((link) => link && !urlRegex.test(link))) {
    errors.portfolioLinks = "Portfolio links must start with http:// or https://";
  }

  return errors;
}

function EditProfile() {
  const { user, setUser } = useAuth();
  const { data: profile, isLoading, isError } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const [draft, setDraft] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [portfolioInput, setPortfolioInput] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    holderName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });
  const [bankStatus, setBankStatus] = useState({ type: "", text: "" });

  const [isAadhaarUploading, setIsAadhaarUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setBankDetails({
        bankName: profile.bankName || "",
        holderName: profile.bankHolderName || "",
        accountNumber: profile.bankAccountNo || "",
        ifscCode: profile.bankIfsc || "",
        upiId: profile.upiId || "",
      });
    }
  }, [profile]);

  const form = useMemo(() => {
    const raw = draft || profile || {};
    return {
      ...raw,
      fullName: raw.fullName || raw.name || "",
      username: raw.username || "",
      email: raw.email || "",
      headline: raw.headline || "",
      location: raw.location || "",
      bio: raw.bio || "",
      hourlyRate: raw.hourlyRate ?? 1500,
      experienceYears: raw.experienceYears ?? 0,
      education: raw.education || "",
      skills: Array.isArray(raw.skills) ? raw.skills : [],
      portfolioLinks: Array.isArray(raw.portfolioLinks) ? raw.portfolioLinks : [],
      workExperience: Array.isArray(raw.workExperience) ? raw.workExperience : [],
      portfolioItems: Array.isArray(raw.portfolioItems) ? raw.portfolioItems : [],
    };
  }, [draft, profile]);

  const handleSaveBankDetails = (e) => {
    e.preventDefault();
    setBankStatus({ type: "", text: "" });
    if (!bankDetails.holderName || !bankDetails.upiId) {
      setBankStatus({ type: "error", text: "Account Holder Name and UPI ID are required." });
      return;
    }
    
    setBankStatus({ type: "loading", text: "Saving bank details..." });
    updateProfileMutation.mutate(
      {
        ...form,
        bankName: bankDetails.bankName,
        bankHolderName: bankDetails.holderName,
        bankAccountNo: bankDetails.accountNumber,
        bankIfsc: bankDetails.ifscCode,
        upiId: bankDetails.upiId,
      },
      {
        onSuccess: () => {
          setBankStatus({ type: "success", text: "Bank details saved successfully to database!" });
        },
        onError: (err) => {
          setBankStatus({
            type: "error",
            text: err?.response?.data?.message || "Failed to save bank details.",
          });
        },
      }
    );
  };

  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: "", text: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: "", text: "" });

    if (!changePasswordForm.oldPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      setPasswordStatus({ type: "error", text: "All password fields are required." });
      return;
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setPasswordStatus({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
    if (!STRONG_PASSWORD_REGEX.test(changePasswordForm.newPassword)) {
      setPasswordStatus({ type: "error", text: "Password must be 8-64 chars with uppercase, lowercase, number, and special character." });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        oldPassword: changePasswordForm.oldPassword,
        newPassword: changePasswordForm.newPassword,
      });
      setPasswordStatus({ type: "success", text: "Password changed successfully!" });
      setChangePasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordStatus({
        type: "error",
        text: err?.response?.data?.message || "Failed to change password. Please verify credentials.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setDraft((prev) => ({ ...(prev || profile), [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (status.type === "error") setStatus({ type: "", text: "" });
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || !form) return;

    const alreadyExists = form.skills.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) return;

    setDraft((prev) => ({ ...(prev || profile), skills: [...(form.skills || []), trimmed] }));
    setSkillInput("");
    setErrors((prev) => ({ ...prev, skills: "" }));
  };

  const handleRemoveSkill = (skill) => {
    if (!form) return;
    setDraft((prev) => ({ ...(prev || profile), skills: form.skills.filter((item) => item !== skill) }));
  };

  const handleAddPortfolioLink = () => {
    const trimmed = portfolioInput.trim();
    if (!trimmed || !form) return;

    if (!urlRegex.test(trimmed)) {
      setErrors((prev) => ({ ...prev, portfolioLinks: "Use full URL format: https://..." }));
      return;
    }

    const alreadyExists = form.portfolioLinks?.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) return;

    setDraft((prev) => ({ ...(prev || profile), portfolioLinks: [...(form.portfolioLinks || []), trimmed] }));
    setPortfolioInput("");
    setErrors((prev) => ({ ...prev, portfolioLinks: "" }));
  };

  const handleRemovePortfolioLink = (link) => {
    if (!form) return;
    setDraft((prev) => ({
      ...(prev || profile),
      portfolioLinks: (form.portfolioLinks || []).filter((item) => item !== link),
    }));
  };

  const handleSetUsername = () => {
    if (!form) return;
    const usernameVal = form.username?.trim();
    if (!usernameVal) {
      alert("Please enter a username first.");
      return;
    }
    if (!/^[a-z0-9_-]{3,30}$/.test(usernameVal)) {
      alert("Username must be 3-30 characters, lowercase, alphanumeric, underscore or hyphen.");
      return;
    }
    if (!window.confirm(`Are you sure you want to set your username to '@${usernameVal}'? This can only be set ONCE and cannot be changed later.`)) {
      return;
    }

    setStatus({ type: "loading", text: "Saving username..." });
    updateProfileMutation.mutate(
      { ...form, username: usernameVal },
      {
        onSuccess: (response) => {
          setDraft(null);
          setStatus({ type: "success", text: "Username set successfully! It is now locked." });
          if (user) {
            setUser({
              ...user,
              username: response?.data?.data?.username || usernameVal,
            });
          }
        },
        onError: (error) => {
          setStatus({ type: "error", text: error?.response?.data?.message || "Failed to set username. It may be taken." });
        },
      }
    );
  };

  const handleAadhaarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAadhaarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileName", `${(form?.username || "user").trim().toLowerCase()}_aadhaar`);
      const res = await http.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.url) {
        handleFieldChange("aadhaarCardPhoto", res.data.url);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload Aadhaar card image. Please try again.");
    } finally {
      setIsAadhaarUploading(false);
    }
  };

  const handleSave = () => {
    if (!form) return;

    const validationErrors = validateProfile(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      setStatus({ type: "error", text: "Please fix highlighted profile fields before saving." });
      return;
    }

    // AUTO-FLUSH any pending typed skill or portfolio URL before saving so user doesn't lose typed inputs!
    let nextSkills = [...(form.skills || [])];
    if (skillInput.trim()) {
      const trimmedSkill = skillInput.trim();
      if (!nextSkills.some((s) => s.toLowerCase() === trimmedSkill.toLowerCase())) {
        nextSkills.push(trimmedSkill);
      }
      setSkillInput("");
    }

    let nextPortfolioLinks = [...(form.portfolioLinks || [])];
    if (portfolioInput.trim()) {
      const trimmedUrl = portfolioInput.trim();
      if (urlRegex.test(trimmedUrl) && !nextPortfolioLinks.some((l) => l.toLowerCase() === trimmedUrl.toLowerCase())) {
        nextPortfolioLinks.push(trimmedUrl);
      }
      setPortfolioInput("");
    }

    // Merge bank details and flushed inputs into payload so master save saves everything from top to bottom
    const payload = {
      ...form,
      skills: nextSkills,
      portfolioLinks: nextPortfolioLinks,
      bankName: bankDetails.bankName || form.bankName,
      bankHolderName: bankDetails.holderName || form.bankHolderName,
      bankAccountNo: bankDetails.accountNumber || form.bankAccountNo,
      bankIfsc: bankDetails.ifscCode || form.bankIfsc,
      upiId: bankDetails.upiId || form.upiId,
    };

    if (profile?.username && payload.username === profile.username) {
      delete payload.username;
    }

    setStatus({ type: "loading", text: "Saving all profile updates..." });
    updateProfileMutation.mutate(payload, {
      onSuccess: (response) => {
        setDraft(null);
        setStatus({ type: "success", text: response?.data?.message || "🎉 All profile & verification details updated successfully!" });
        if (user) {
          setUser({
            ...user,
            name: response?.data?.data?.name || user.name,
            username: response?.data?.data?.username || user.username,
          });
        }
      },
      onError: (error) => {
        setStatus({ type: "error", text: error?.response?.data?.message || "Failed to update profile. Try again." });
      },
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[2rem] bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] p-6 shadow-md md:p-8 text-white">
        <div>
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-50">
            Profile Editor
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Edit Profile</h1>
          <p className="mt-2 text-blue-100/90 text-sm">Update your personal details, skills, and professional summary.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20" to={ROUTES.PROFILE}>
            Cancel
          </Link>
          <button
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer flex items-center gap-2"
            disabled={updateProfileMutation.isPending || isLoading || !form}
            onClick={handleSave}
            type="button"
          >
            <img src="https://cdn-icons-png.flaticon.com/128/907/907027.png" alt="Save" className="h-4 w-4 object-contain shrink-0" />
            <span>{updateProfileMutation.isPending ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      <ProfileNavLinks />

      {isLoading ? <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">Loading profile form...</p> : null}
      {isError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">Unable to load editable profile data.</p> : null}

      {form ? (
        <div className="grid gap-4">
          <BasicInfoSection
            editable
            errors={errors}
            onChange={handleFieldChange}
            values={form}
            isUsernameSet={Boolean(profile?.username)}
            onSetUsername={handleSetUsername}
          />
          <SkillsSection
            editable
            errors={errors}
            onAddSkill={handleAddSkill}
            onRemoveSkill={handleRemoveSkill}
            onSkillInputChange={setSkillInput}
            skillInput={skillInput}
            skills={form.skills}
          />
          <BioSection bio={form.bio} editable errors={errors} onChange={handleFieldChange} />
          {user?.role === "freelancer" && (
            <HourlyRateSection
              hourlyRate={form.hourlyRate}
              editable
              errors={errors}
              onChange={handleFieldChange}
            />
          )}
          <ExperienceSection
            education={form.education}
            editable
            errors={errors}
            experienceYears={form.experienceYears}
            onChange={handleFieldChange}
          />
          {user?.role === "freelancer" && (
            <WorkExperienceSection
              experience={form.workExperience}
              editable
              onChange={handleFieldChange}
            />
          )}
          <PortfolioSection
            editable
            errors={errors}
            links={form.portfolioLinks || []}
            onAddPortfolioLink={handleAddPortfolioLink}
            onPortfolioInputChange={setPortfolioInput}
            onRemovePortfolioLink={handleRemovePortfolioLink}
            portfolioInput={portfolioInput}
          />
          {user?.role === "freelancer" && (
            <PortfolioItemsSection
              portfolioItems={form.portfolioItems}
              editable
              onChange={handleFieldChange}
            />
          )}
        </div>
      ) : null}

      {/* Onboarding Verification Details Card */}
      {user?.role !== "admin" && form && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8 mt-6">
          <h2 className="text-xl font-bold text-slate-900">Onboarding Verification Details</h2>
          <p className="mt-1 text-xs text-slate-500">Edit your verification credentials, category, card details, or Drive link.</p>
          
          <div className="mt-6 space-y-4 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Profile Category</label>
                <select
                  value={form.category || ""}
                  onChange={(e) => handleFieldChange("category", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                >
                  <option value="">Select Category...</option>
                  <option value="Employee">Employee</option>
                  <option value="Student">Student</option>
                  <option value="Organisation">Organisation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone || ""}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  placeholder="e.g. 7004677544"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Aadhaar Card Number</label>
                <input
                  type="text"
                  value={form.aadhaarCard || ""}
                  onChange={(e) => handleFieldChange("aadhaarCard", e.target.value)}
                  placeholder="e.g. 123254564568"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Aadhaar Photo</label>
                <div className="space-y-2 mt-1">
                  {form.aadhaarCardPhoto ? (
                    <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <img
                        src={form.aadhaarCardPhoto}
                        alt="Aadhaar Card Preview"
                        className="h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleFieldChange("aadhaarCardPhoto", "")}
                        className="absolute top-2 right-2 rounded-full bg-rose-600 p-1.5 text-white hover:bg-rose-700 transition"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 w-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                      <p className="text-xs">No Aadhaar Photo Uploaded</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAadhaarUpload}
                    disabled={isAadhaarUploading}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                  />
                  {isAadhaarUploading && <p className="text-[10px] text-blue-600 font-bold animate-pulse">Uploading photo to server...</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">PAN Card Number</label>
                <input
                  type="text"
                  value={form.panCard || ""}
                  onChange={(e) => handleFieldChange("panCard", e.target.value)}
                  placeholder="e.g. LUEPK7563H"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company Name</label>
                <input
                  type="text"
                  value={form.companyName || ""}
                  onChange={(e) => handleFieldChange("companyName", e.target.value)}
                  placeholder="e.g. Accenture"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company / Employee ID</label>
                <input
                  type="text"
                  value={form.companyId || ""}
                  onChange={(e) => handleFieldChange("companyId", e.target.value)}
                  placeholder="e.g. Ut34234234"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Verification ID / Drive Link</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.schoolIdCard || ""}
                    onChange={(e) => handleFieldChange("schoolIdCard", e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                  />
                  {form.schoolIdCard && (
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
                      <span className="text-sm">🌐</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Submitted Document Link</p>
                        <a
                          href={form.schoolIdCard}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium block truncate"
                        >
                          {form.schoolIdCard}
                        </a>
                      </div>
                      <a
                        href={form.schoolIdCard}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-600 hover:bg-blue-750 text-white font-semibold text-[10px] px-2.5 py-1.5 transition text-center shrink-0"
                      >
                        Open Link
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-3 cursor-pointer transition shadow-[0_12px_24px_rgba(37,99,235,0.2)] border-0 outline-none disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Verification Details"}
              </button>
              {status.text && (
                <span className={`text-xs font-bold ${status.type === "success" ? "text-emerald-600" : status.type === "error" ? "text-rose-600" : "text-blue-600"}`}>
                  {status.text}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout & Bank Details Card */}
      {user?.role !== "admin" && form && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8 mt-6">
          <h2 className="text-xl font-bold text-slate-900">Payout & Bank Details</h2>
          <p className="mt-1 text-xs text-slate-500">Provide details for receiving payouts when withdrawing earnings.</p>
          
          <form onSubmit={handleSaveBankDetails} className="mt-6 space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bank Name</label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="e.g. State Bank of India"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={bankDetails.holderName}
                onChange={(e) => setBankDetails(prev => ({ ...prev, holderName: e.target.value }))}
                placeholder="e.g. John Doe"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="e.g. 10023940192"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankDetails.ifscCode}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, ifscCode: e.target.value }))}
                  placeholder="e.g. SBIN0001234"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">UPI ID (Fastest Payouts)</label>
              <input
                type="text"
                value={bankDetails.upiId}
                onChange={(e) => setBankDetails(prev => ({ ...prev, upiId: e.target.value }))}
                placeholder="e.g. john@okaxis"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
                required
              />
            </div>

            {bankStatus.text && (
              <p className={`text-xs font-bold p-3 rounded-xl border ${
                bankStatus.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}>
                {bankStatus.text}
              </p>
            )}

            <button
              type="submit"
              className="rounded-2xl bg-blue-600 hover:bg-blue-750 text-white font-semibold text-xs px-5 py-3 cursor-pointer transition shadow-[0_12px_24px_rgba(37,99,235,0.2)] border-0 outline-none"
            >
              Save Bank Details
            </button>
          </form>
        </div>
      )}

      {/* Master Save All Profile Changes Card */}
      {form && (
        <div className="rounded-[2rem] border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-blue-50/90 p-6 md:p-8 shadow-sm flex flex-wrap items-center justify-between gap-4 mt-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-600 animate-pulse" />
              Save All Profile Changes
            </h3>
            <p className="text-xs text-slate-600 max-w-xl">
              Finished editing your Basic Info, Skills, Bio, Work History, Verification details, or Bank Payouts above? Click here to save everything in one single click.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {status.text && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-200 bg-blue-50 text-blue-700"
              }`}>
                {status.text}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm px-8 py-4 cursor-pointer transition shadow-lg shadow-blue-500/25 border-0 outline-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <img src="https://cdn-icons-png.flaticon.com/128/907/907027.png" alt="Save" className="h-5 w-5 object-contain shrink-0" />
              <span>{updateProfileMutation.isPending ? "Saving Everything..." : "Save All Profile Changes"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Change Password Card */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8 mt-6">
        <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
        <p className="mt-1 text-xs text-slate-500">Secure your account by updating your password credentials.</p>
        
        <form onSubmit={handleChangePasswordSubmit} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Old Password</label>
            <input
              type="password"
              value={changePasswordForm.oldPassword}
              onChange={(e) => setChangePasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
              placeholder="Enter current password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">New Password</label>
            <input
              type="password"
              value={changePasswordForm.newPassword}
              onChange={(e) => setChangePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Enter new strong password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={changePasswordForm.confirmPassword}
              onChange={(e) => setChangePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Re-enter new password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
            />
          </div>

          {passwordStatus.text && (
            <p className={`text-xs font-bold p-3 rounded-xl border ${
              passwordStatus.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}>
              {passwordStatus.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="rounded-2xl bg-blue-600 hover:bg-blue-750 text-white font-semibold text-xs px-5 py-3 cursor-pointer transition shadow-[0_12px_24px_rgba(37,99,235,0.2)] disabled:opacity-60 border-0 outline-none"
          >
            {isChangingPassword ? "Updating Password..." : "Update Password"}
          </button>
        </form>
      </div>

      {status.text ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : status.type === "success"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-100 text-slate-700"
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </section>
  );
}

export default EditProfile;
