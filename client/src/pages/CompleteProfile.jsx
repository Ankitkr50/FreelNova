import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { useAuth } from "../hooks/useAuth.js";
import http from "../api/http.js";

const typeToCategory = {
  // Freelancer types
  student: "student",
  professional: "employee",
  agency: "company",
  // Client types
  company: "company",
  individual: "employee",
  startup: "company",
};

function CompleteProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState("");
  const category = typeToCategory[selectedType] || "";
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    isInternational: false,
    schoolOrCollege: "",
    schoolResult: "",
    schoolIdCard: "",
    aadhaarCard: "",
    panCard: "",
    bankAccountNo: "",
    bankIfsc: "",
    bankName: "",
    companyName: "",
    companyId: "",
    passportOrNationalId: "",
    passportPhoto: "",
    taxIdNumber: "",
    swiftBic: "",
    ibanAccountNo: "",
    timezone: "UTC",
    upiId: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aadhaarPhotoFile, setAadhaarPhotoFile] = useState(null);
  const [aadhaarPhotoPreview, setAadhaarPhotoPreview] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null); // 'checking' | 'available' | 'taken' | 'invalid' | 'too_short' | null
  const [checkingTimer, setCheckingTimer] = useState(null);



  const getCompanyNameLabel = () => {
    if (selectedType === "professional") return "Freelance Brand or Company Name";
    if (selectedType === "individual") return "Brand or Company Name (Optional)";
    if (selectedType === "agency") return "Agency Name";
    if (selectedType === "startup") return "Startup Name";
    return "Company Name";
  };

  const getCompanyIdLabel = () => {
    if (selectedType === "professional") return "Professional Registration / ID Number";
    if (selectedType === "individual") return "Government ID / Personal Tax ID Number";
    if (selectedType === "agency") return "Agency Registration ID";
    if (selectedType === "startup") return "Startup Registration ID";
    return "Company Registration ID";
  };

  const getIdCardLabel = () => {
    if (selectedType === "professional") return "Professional/Employee ID Card Photo Link (Google Drive / Direct URL)";
    if (selectedType === "individual") return "Individual/Employee ID Card Photo Link (Google Drive / Direct URL)";
    return "ID Card Photo Link";
  };

  const handleCategorySelect = (selectedCategory) => {
    setSelectedType(selectedCategory);
    setErrors({});
    setServerError("");
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleUsernameChange = (val) => {
    const cleanVal = val.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    setFormData((prev) => ({ ...prev, username: cleanVal }));
    setErrors((prev) => ({ ...prev, username: "" }));

    if (checkingTimer) clearTimeout(checkingTimer);

    if (cleanVal.length === 0) {
      setUsernameStatus(null);
      return;
    }

    if (cleanVal.length < 3) {
      setUsernameStatus("too_short");
      return;
    }

    if (!/^[a-z0-9_-]{3,30}$/.test(cleanVal)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const res = await http.get(`/users/check-username?username=${cleanVal}`);
        if (res.data.success) {
          if (res.data.data.available) {
            setUsernameStatus("available");
          } else {
            setUsernameStatus(res.data.data.reason === "taken" ? "taken" : "invalid");
          }
        }
      } catch (err) {
        console.error(err);
        setUsernameStatus(null);
      }
    }, 500);
    setCheckingTimer(timer);
  };

  const validateForm = () => {
    const nextErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      nextErrors.username = "Username is required.";
    } else if (usernameStatus === "too_short") {
      nextErrors.username = "Must be at least 3 characters.";
    } else if (usernameStatus === "invalid") {
      nextErrors.username = "Must be lowercase alphanumeric, underscore, or hyphen.";
    } else if (usernameStatus === "taken") {
      nextErrors.username = "Username is already taken by another user.";
    } else if (usernameStatus !== "available" && usernameStatus !== "checking") {
      nextErrors.username = "Please choose a valid and available username.";
    } else if (usernameStatus === "checking") {
      nextErrors.username = "Checking username availability, please wait...";
    }

    // Phone validation
    if (formData.isInternational) {
      if (!formData.phone.trim()) {
        nextErrors.phone = "Phone number is required.";
      } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.trim())) {
        nextErrors.phone = "Must be a valid international number with country code (e.g. +14155552671).";
      }
    } else {
      if (!formData.phone.trim()) {
        nextErrors.phone = "Phone number is required.";
      } else if (!/^\d{10}$/.test(formData.phone.trim())) {
        nextErrors.phone = "Phone number must be a valid 10-digit number.";
      }
    }



    if (!formData.bankName.trim()) {
      nextErrors.bankName = "Bank Name is required.";
    }

    if (formData.isInternational) {
      if (!formData.passportOrNationalId.trim()) {
        nextErrors.passportOrNationalId = "Passport or National ID is required.";
      }
      if (!formData.passportPhoto.trim()) {
        nextErrors.passportPhoto = "Passport / National ID photo link is required.";
      } else if (!/^https?:\/\/.+/i.test(formData.passportPhoto.trim())) {
        nextErrors.passportPhoto = "Must be a valid URL link (e.g. starting with http:// or https://).";
      }
      if (!formData.taxIdNumber.trim()) {
        nextErrors.taxIdNumber = "Tax ID or SSN is required.";
      }
      if (!formData.swiftBic.trim()) {
        nextErrors.swiftBic = "SWIFT/BIC Code is required.";
      } else if (!/^[A-Z0-9]{8,11}$/i.test(formData.swiftBic.trim())) {
        nextErrors.swiftBic = "SWIFT Code must be a valid 8 or 11 character code.";
      }
      if (!formData.ibanAccountNo.trim()) {
        nextErrors.ibanAccountNo = "IBAN account number is required.";
      } else if (formData.ibanAccountNo.trim().length < 15 || formData.ibanAccountNo.trim().length > 34) {
        nextErrors.ibanAccountNo = "IBAN must be between 15 and 34 characters.";
      }
    } else {
      if (!formData.aadhaarCard.trim()) {
        nextErrors.aadhaarCard = "Aadhaar Card number is required.";
      } else if (!/^\d{12}$/.test(formData.aadhaarCard.trim())) {
        nextErrors.aadhaarCard = "Aadhaar must be a valid 12-digit numeric number.";
      }
      if (!aadhaarPhotoFile) {
        nextErrors.aadhaarCardPhoto = "Aadhaar Card photo file is required.";
      }
      if (!formData.panCard.trim()) {
        nextErrors.panCard = "PAN Card is required.";
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(formData.panCard.trim())) {
        nextErrors.panCard = "PAN must be a valid 10-character alphanumeric PAN format (e.g. ABCDE1234F).";
      }
      if (!formData.bankAccountNo.trim()) {
        nextErrors.bankAccountNo = "Bank account number is required.";
      } else if (!/^\d{9,18}$/.test(formData.bankAccountNo.trim())) {
        nextErrors.bankAccountNo = "Bank Account number must be between 9 and 18 digits.";
      }
      if (!formData.bankIfsc.trim()) {
        nextErrors.bankIfsc = "IFSC code is required.";
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.bankIfsc.trim())) {
        nextErrors.bankIfsc = "IFSC code must be a valid 11-character code (e.g. SBIN0001234).";
      }
      if (!formData.upiId.trim()) {
        nextErrors.upiId = "UPI ID is required.";
      } else if (!/^[a-zA-Z0-9.\-_]{3,256}@[a-zA-Z]{2,64}$/.test(formData.upiId.trim())) {
        nextErrors.upiId = "UPI ID must be a valid format (e.g. user@bank).";
      }
    }

    // Category specific validation
    if (selectedType === "student") {
      if (!formData.schoolOrCollege.trim()) {
        nextErrors.schoolOrCollege = "School or College name is required.";
      }
      if (!formData.schoolResult.trim()) {
        nextErrors.schoolResult = "School result/grade is required.";
      }
      if (!formData.schoolIdCard.trim()) {
        nextErrors.schoolIdCard = "School/College ID Card photo link (e.g. Google Drive) is required.";
      } else if (!/^https?:\/\/.+/i.test(formData.schoolIdCard.trim())) {
        nextErrors.schoolIdCard = "Must be a valid URL link (e.g. starting with http:// or https://).";
      }
    } else if (selectedType === "agency" || selectedType === "company" || selectedType === "startup") {
      if (!formData.companyName.trim()) {
        nextErrors.companyName = "Name is required.";
      }
      if (!formData.companyId.trim()) {
        nextErrors.companyId = "Registration ID is required.";
      }
    } else if (selectedType === "professional" || selectedType === "individual") {
      if (!formData.companyName.trim()) {
        nextErrors.companyName = "Company/Brand name is required.";
      }
      if (!formData.companyId.trim()) {
        nextErrors.companyId = "ID is required.";
      }
      if (!formData.schoolIdCard.trim()) {
        nextErrors.schoolIdCard = "ID Card photo link is required.";
      } else if (!/^https?:\/\/.+/i.test(formData.schoolIdCard.trim())) {
        nextErrors.schoolIdCard = "Must be a valid URL link (e.g. starting with http:// or https://).";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let aadhaarCardPhotoUrl = "";
      if (aadhaarPhotoFile) {
        const fd = new FormData();
        fd.append("file", aadhaarPhotoFile);
        fd.append("fileName", `${formData.username.trim().toLowerCase()}_aadhaar`);
        const uploadRes = await http.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        aadhaarCardPhotoUrl = uploadRes.data.url;
      }

      const passportPhotoUrl = formData.passportPhoto.trim();

      const payload = {
        category,
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
        isInternational: formData.isInternational,
        bankName: formData.bankName.trim(),
        timezone: formData.timezone.trim() || "UTC",
      };

      if (formData.isInternational) {
        payload.passportOrNationalId = formData.passportOrNationalId.trim();
        payload.passportPhoto = passportPhotoUrl;
        payload.taxIdNumber = formData.taxIdNumber.trim().toUpperCase();
        payload.swiftBic = formData.swiftBic.trim().toUpperCase();
        payload.ibanAccountNo = formData.ibanAccountNo.trim().toUpperCase();
      } else {
        payload.aadhaarCard = formData.aadhaarCard.trim();
        payload.aadhaarCardPhoto = aadhaarCardPhotoUrl;
        payload.panCard = formData.panCard.trim().toUpperCase();
        payload.bankAccountNo = formData.bankAccountNo.trim();
        payload.bankIfsc = formData.bankIfsc.trim().toUpperCase();
        payload.upiId = formData.upiId.trim();
      }

      if (category === "student") {
        payload.schoolOrCollege = formData.schoolOrCollege.trim();
        payload.schoolResult = formData.schoolResult.trim();
        payload.schoolIdCard = formData.schoolIdCard.trim();
      } else {
        payload.companyName = formData.companyName.trim();
        payload.companyId = formData.companyId.trim();
        if (category === "employee") {
          payload.schoolIdCard = formData.schoolIdCard.trim();
        }
      }

      const res = await http.put("/users/profile/complete", payload);
      if (res.data.success) {
        // Update local auth context
        setUser(res.data.data);
        navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        setServerError(res.data.message || "Failed to update profile.");
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || "Something went wrong while completing your profile."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-2xl w-full mx-auto bg-white border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)] rounded-[2.5rem] overflow-hidden">

        {/* Dynamic Gradient Header */}
        <div className="bg-[linear-gradient(135deg,#0f274f_0%,#163d7a_52%,#2563eb_100%)] p-8 text-white text-center">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-50">
            Account Activation
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            {user?.role === "freelancer" ? "Complete Your Freelancer Profile" : "Complete Your Client Profile"}
          </h2>
          <p className="mt-2 text-sm text-blue-100/90 max-w-md mx-auto">
            {user?.role === "freelancer"
              ? "Complete your verification to start applying for projects and receiving payments."
              : "Verify your account to start hiring trusted talent."}
          </p>
        </div>

        <div className="p-8 sm:p-10 space-y-8">
          {serverError && !serverError.includes("cannot be changed") && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 animate-pulse">
              ⚠️ {serverError}
            </div>
          )}

          {/* STEP 1: Select Category */}
          {!selectedType ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Choose Your Account Type</h3>
                <p className="text-xs text-slate-500 mt-1">Tell Us About Yourself</p>
              </div>

              {user?.role === "freelancer" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Student Card */}
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("student")}
                    className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xs hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-650 transition-colors text-2xl mb-4">
                      🎓
                    </span>
                    <h4 className="text-sm font-bold text-slate-950">Student</h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-normal">Learning, internships, and freelance opportunities.</p>
                  </button>

                  {/* Professional Card */}
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("professional")}
                    className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xs hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 transition-colors text-2xl mb-4">
                      💼
                    </span>
                    <h4 className="text-sm font-bold text-slate-950">Professional</h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-normal">Working professionals and independent freelancers.</p>
                  </button>

                  {/* Agency Card */}
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("agency")}
                    className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xs hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 transition-colors text-2xl mb-4">
                      🏢
                    </span>
                    <h4 className="text-sm font-bold text-slate-950">Agency</h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-normal">Manage a team and deliver projects together.</p>
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Company Card */}
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("company")}
                    className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xs hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 transition-colors text-2xl mb-4">
                      🏢
                    </span>
                    <h4 className="text-sm font-bold text-slate-950">Company</h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-normal">Registered businesses, startups, and enterprises.</p>
                  </button>

                  {/* Individual Card */}
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("individual")}
                    className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xs hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 transition-colors text-2xl mb-4">
                      👤
                    </span>
                    <h4 className="text-sm font-bold text-slate-950">Individual</h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-normal">Hire freelancers for personal or business projects.</p>
                  </button>

                  {/* Startup Card */}
                  <button
                    type="button"
                    onClick={() => handleCategorySelect("startup")}
                    className="flex flex-col items-center text-center p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xs hover:border-blue-400 hover:bg-blue-50/20 hover:shadow-md transition-all duration-300 group cursor-pointer"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 group-hover:bg-orange-100 text-orange-650 transition-colors text-2xl mb-4">
                      🚀
                    </span>
                    <h4 className="text-sm font-bold text-slate-950">Startup</h4>
                    <p className="mt-1 text-[10px] text-slate-500 leading-normal">Growing teams looking for flexible talent.</p>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Fill Form */
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Category Breadcrumb & Change Button */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3">
                <span className="text-xs text-slate-600">
                  Selected Account Type: <strong className="capitalize text-slate-900">{selectedType}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleCategorySelect("")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-transparent border-0 cursor-pointer"
                >
                  Change Category
                </button>
              </div>

              {/* General Fields Section */}
              <div className="border-b border-slate-150 pb-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Personal & Identity Details</h3>

                {/* International Toggle Switch */}
                <div className="mb-6 flex items-center justify-between bg-blue-50/40 border border-blue-100 rounded-2xl p-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Global Account Verification</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Toggle if you register using international credentials (Passport / Tax ID).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange("isInternational", !formData.isInternational)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${formData.isInternational ? "bg-blue-600" : "bg-slate-200"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${formData.isInternational ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">Choose Username (Unique)</label>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        ✏️ Editable now • Locks after onboarding
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition lowercase font-medium"
                        placeholder="e.g. ankit_123"
                        value={formData.username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center select-none pointer-events-none">
                        {usernameStatus === "checking" && (
                          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        )}
                        {usernameStatus === "available" && (
                          <span className="text-emerald-500 text-sm font-extrabold">✓</span>
                        )}
                        {(usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "too_short") && (
                          <span className="text-rose-500 text-sm font-extrabold">✗</span>
                        )}
                      </div>
                    </div>
                    {errors.username && <p className="text-[10px] font-medium text-rose-600">{errors.username}</p>}
                    {!errors.username && usernameStatus === "available" && (
                      <p className="text-[10px] font-bold text-emerald-600">✓ Username is available</p>
                    )}
                    {!errors.username && usernameStatus === "taken" && (
                      <p className="text-[10px] font-bold text-rose-600">✗ Username is already taken</p>
                    )}
                    {!errors.username && usernameStatus === "too_short" && (
                      <p className="text-[10px] font-semibold text-amber-600">⚠️ Must be at least 3 characters</p>
                    )}
                    {!errors.username && usernameStatus === "invalid" && (
                      <p className="text-[10px] font-semibold text-amber-600">⚠️ Must be lowercase alphanumeric, underscore, or hyphen</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                      placeholder={formData.isInternational ? "e.g. +14155552671" : "10-digit mobile number"}
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", formData.isInternational ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                    {errors.phone && <p className="text-[10px] font-medium text-rose-600">{errors.phone}</p>}
                  </div>

                  {formData.isInternational ? (
                    <>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Passport / National ID</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                          placeholder="ID / Passport Number"
                          value={formData.passportOrNationalId}
                          onChange={(e) => handleInputChange("passportOrNationalId", e.target.value)}
                        />
                        {errors.passportOrNationalId && <p className="text-[10px] font-medium text-rose-600">{errors.passportOrNationalId}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Passport Photo Link (Google Drive / Direct URL)</label>
                        <input
                          type="url"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                          placeholder="e.g. https://drive.google.com/..."
                          value={formData.passportPhoto}
                          onChange={(e) => handleInputChange("passportPhoto", e.target.value)}
                        />
                        {errors.passportPhoto && <p className="text-[10px] font-medium text-rose-600">{errors.passportPhoto}</p>}
                        {formData.username && (
                          <p className="mt-1 text-[10px] text-rose-600 font-bold tracking-wide block">
                            * Name file as: <span className="font-mono bg-rose-50 border border-rose-200 px-1 py-0.5 rounded text-rose-700 font-bold">{formData.username.toLowerCase()}_passport</span> in drive before linking
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Tax ID Number / SSN</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition uppercase"
                          placeholder="e.g. 12-3456789"
                          value={formData.taxIdNumber}
                          onChange={(e) => handleInputChange("taxIdNumber", e.target.value)}
                        />
                        {errors.taxIdNumber && <p className="text-[10px] font-medium text-rose-600">{errors.taxIdNumber}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Local Timezone</label>
                        <select
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition cursor-pointer"
                          value={formData.timezone}
                          onChange={(e) => handleInputChange("timezone", e.target.value)}
                        >
                          <option value="EST">EST (Eastern Standard Time)</option>
                          <option value="GMT">GMT (Greenwich Mean Time)</option>
                          <option value="CET">CET (Central European Time)</option>
                          <option value="GST">GST (Gulf Standard Time)</option>
                          <option value="UTC">UTC (Universal Time Coordinated)</option>
                          <option value="IST">IST (Indian Standard Time)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Aadhaar Card Number</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                          placeholder="12-digit Aadhaar number"
                          value={formData.aadhaarCard}
                          onChange={(e) => handleInputChange("aadhaarCard", e.target.value.replace(/\D/g, "").slice(0, 12))}
                        />
                        {errors.aadhaarCard && <p className="text-[10px] font-medium text-rose-600">{errors.aadhaarCard}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Aadhaar Card Photo (JPEG/PNG)</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const cleanUsername = formData.username.trim().toLowerCase();
                              if (!cleanUsername) {
                                alert("Please enter your username first before selecting the file.");
                                e.target.value = "";
                                return;
                              }
                              const expectedName = `${cleanUsername}_aadhaar`;
                              const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                              if (nameWithoutExt.toLowerCase() !== expectedName) {
                                alert(`Invalid file name! The selected file must be named exactly: ${expectedName}${file.name.substring(file.name.lastIndexOf('.'))}`);
                                e.target.value = "";
                                return;
                              }
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Photo size must be less than 2 MB.");
                                return;
                              }
                              setAadhaarPhotoFile(file);
                              setAadhaarPhotoPreview(URL.createObjectURL(file));
                              setErrors((prev) => ({ ...prev, aadhaarCardPhoto: "" }));
                            }
                          }}
                        />
                        {aadhaarPhotoPreview && (
                          <div className="mt-2 relative inline-block">
                            <img
                              src={aadhaarPhotoPreview}
                              alt="Aadhaar Preview"
                              className="h-20 w-32 object-cover rounded-lg border border-slate-200"
                            />
                            <span className="absolute bottom-1 right-1 rounded bg-slate-900/60 px-1 py-0.5 text-[8px] font-semibold text-white">
                              Preview
                            </span>
                          </div>
                        )}
                        {errors.aadhaarCardPhoto && <p className="text-[10px] font-medium text-rose-600">{errors.aadhaarCardPhoto}</p>}
                        {formData.username && (
                          <p className="mt-1 text-[10px] text-rose-600 font-bold tracking-wide block">
                            * Name file as: <span className="font-mono bg-rose-50 border border-rose-200 px-1 py-0.5 rounded text-rose-700 font-bold">{formData.username.toLowerCase()}_aadhaar</span> before upload
                          </p>
                        )}
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700">PAN Card Number</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition uppercase"
                          placeholder="10-character alphanumeric PAN"
                          value={formData.panCard}
                          onChange={(e) => handleInputChange("panCard", e.target.value.slice(0, 10))}
                        />
                        {errors.panCard && <p className="text-[10px] font-medium text-rose-600">{errors.panCard}</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedType === "student" && (
                <div className="border-b border-slate-150 pb-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Academic Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 min-h-[32px] flex items-end pb-1">School or College Name</label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                        placeholder="e.g. Indian Institute of Technology"
                        value={formData.schoolOrCollege}
                        onChange={(e) => handleInputChange("schoolOrCollege", e.target.value)}
                      />
                      {errors.schoolOrCollege && <p className="text-[10px] font-medium text-rose-600">{errors.schoolOrCollege}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 min-h-[32px] flex items-end pb-1">Result of School (CGPA/Percentage)</label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                        placeholder="e.g. 9.2 CGPA or 85%"
                        value={formData.schoolResult}
                        onChange={(e) => handleInputChange("schoolResult", e.target.value)}
                      />
                      {errors.schoolResult && <p className="text-[10px] font-medium text-rose-600">{errors.schoolResult}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 min-h-[32px] flex items-end pb-1">School/College ID Card Photo Link (Google Drive / Direct URL)</label>
                      <input
                        type="url"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                        placeholder="e.g. https://drive.google.com/..."
                        value={formData.schoolIdCard}
                        onChange={(e) => handleInputChange("schoolIdCard", e.target.value)}
                      />
                      {errors.schoolIdCard && <p className="text-[10px] font-medium text-rose-600">{errors.schoolIdCard}</p>}
                      {formData.username && (
                        <p className="mt-1 text-[10px] text-rose-600 font-bold tracking-wide block">
                          * Name file as: <span className="font-mono bg-rose-50 border border-rose-200 px-1 py-0.5 rounded text-rose-700 font-bold">{formData.username.toLowerCase()}_school_id</span> in drive before linking
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(selectedType === "agency" || selectedType === "company" || selectedType === "startup" || selectedType === "professional" || selectedType === "individual") && (
                <div className="border-b border-slate-150 pb-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">
                    {selectedType === "professional" ? "Professional & Business Details" : selectedType === "individual" ? "Client Identity Details" : "Organization Details"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {getCompanyNameLabel()}
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                        placeholder="e.g. Google India Pvt Ltd"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                      />
                      {errors.companyName && <p className="text-[10px] font-medium text-rose-600">{errors.companyName}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {getCompanyIdLabel()}
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                        placeholder="e.g. U72200DL2020PTC364589"
                        value={formData.companyId}
                        onChange={(e) => handleInputChange("companyId", e.target.value)}
                      />
                      {errors.companyId && <p className="text-[10px] font-medium text-rose-600">{errors.companyId}</p>}
                    </div>

                    {(selectedType === "professional" || selectedType === "individual") && (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          {getIdCardLabel()}
                        </label>
                        <input
                          type="url"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                          placeholder="e.g. https://drive.google.com/..."
                          value={formData.schoolIdCard}
                          onChange={(e) => handleInputChange("schoolIdCard", e.target.value)}
                        />
                        {errors.schoolIdCard && <p className="text-[10px] font-medium text-rose-600">{errors.schoolIdCard}</p>}
                        {formData.username && (
                          <p className="mt-1 text-[10px] text-rose-600 font-bold tracking-wide block">
                            * Name file as: <span className="font-mono bg-rose-50 border border-rose-200 px-1 py-0.5 rounded text-rose-700 font-bold">{formData.username.toLowerCase()}_{selectedType === "professional" ? "employee_id" : "individual_id"}</span> in drive before linking
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Details Section */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4">Bank Details (For Payments)</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {formData.isInternational ? (
                    <>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700">IBAN Bank Account Number</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition uppercase"
                          placeholder="IBAN (up to 34 characters)"
                          value={formData.ibanAccountNo}
                          onChange={(e) => handleInputChange("ibanAccountNo", e.target.value.slice(0, 34))}
                        />
                        {errors.ibanAccountNo && <p className="text-[10px] font-medium text-rose-600">{errors.ibanAccountNo}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">SWIFT / BIC Code</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition uppercase"
                          placeholder="SWIFT BIC (8 or 11 characters)"
                          value={formData.swiftBic}
                          onChange={(e) => handleInputChange("swiftBic", e.target.value.slice(0, 11))}
                        />
                        {errors.swiftBic && <p className="text-[10px] font-medium text-rose-600">{errors.swiftBic}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700">Bank Account Number</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                          placeholder="Account number (9 to 18 digits)"
                          value={formData.bankAccountNo}
                          onChange={(e) => handleInputChange("bankAccountNo", e.target.value.replace(/\D/g, "").slice(0, 18))}
                        />
                        {errors.bankAccountNo && <p className="text-[10px] font-medium text-rose-600">{errors.bankAccountNo}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">IFSC Code</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition uppercase"
                          placeholder="e.g. SBIN0001234"
                          value={formData.bankIfsc}
                          onChange={(e) => handleInputChange("bankIfsc", e.target.value.slice(0, 11))}
                        />
                        {errors.bankIfsc && <p className="text-[10px] font-medium text-rose-600">{errors.bankIfsc}</p>}
                      </div>

                      <div className="space-y-1 sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700">UPI ID</label>
                        <input
                          type="text"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                          placeholder="e.g. username@okhdfcbank"
                          value={formData.upiId}
                          onChange={(e) => handleInputChange("upiId", e.target.value)}
                        />
                        {errors.upiId && <p className="text-[10px] font-medium text-rose-600">{errors.upiId}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700">Bank Name</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-slate-950 text-xs outline-none focus:border-blue-400 focus:bg-white transition"
                      placeholder="e.g. Citibank, HSBC, Barclays"
                      value={formData.bankName}
                      onChange={(e) => handleInputChange("bankName", e.target.value)}
                    />
                    {errors.bankName && <p className="text-[10px] font-medium text-rose-600">{errors.bankName}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => handleCategorySelect("")}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-3.5 transition cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold py-3.5 shadow-lg shadow-blue-500/20 hover:brightness-105 hover:-translate-y-0.5 transition cursor-pointer border-0"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Activating Profile..." : "Verify & Complete Onboarding"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompleteProfile;
