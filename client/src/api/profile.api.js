import http from "./http";

const normalizeProfile = (user) => {
  if (!user) return null;
  return {
    id: user._id || user.id,
    fullName: user.name || "",
    name: user.name || "",
    email: user.email || "",
    username: user.username || "",
    role: user.role || "freelancer",
    headline: user.headline || "",
    location: user.location || "",
    bio: user.bio || "",
    experienceYears: Number(user.experienceYears || 0),
    education: user.education || "",
    skills: user.skills || [],
    experience: user.experience || "",
    portfolioLinks: user.portfolioLinks || [],
    hourlyRate: Number(user.hourlyRate || 0),
    workExperience: user.workExperience || [],
    portfolioItems: user.portfolioItems || [],
    resume: user.resumeUrl
      ? {
          name: user.resumeName || "Resume.pdf",
          size: user.resumeSize || 0,
          mimeType: user.resumeMimeType || "application/pdf",
          uploadedAt: user.resumeUploadedAt || user.updatedAt || new Date().toISOString(),
          resumeUrl: user.resumeUrl,
        }
      : null,
    ratingAvg: Number(user.ratingAvg || 0),
    ratingCount: Number(user.ratingCount || 0),
    isEmailVerified: Boolean(user.isEmailVerified),
    bankAccountNo: user.bankAccountNo || "",
    bankIfsc: user.bankIfsc || "",
    bankName: user.bankName || "",
    bankHolderName: user.bankHolderName || "",
    upiId: user.upiId || "",
    category: user.category || "",
    phone: user.phone || "",
    aadhaarCard: user.aadhaarCard || "",
    aadhaarCardPhoto: user.aadhaarCardPhoto || "",
    panCard: user.panCard || "",
    companyName: user.companyName || "",
    companyId: user.companyId || "",
    schoolIdCard: user.schoolIdCard || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const toProfilePayload = (payload = {}) => ({
  name: payload.fullName ?? payload.name,
  username: payload.username,
  bio: payload.bio,
  skills: payload.skills,
  experience: payload.experience,
  experienceYears:
    payload.experienceYears !== undefined ? Number(payload.experienceYears || 0) : undefined,
  education: payload.education,
  headline: payload.headline,
  location: payload.location,
  portfolioLinks: payload.portfolioLinks,
  hourlyRate: payload.hourlyRate !== undefined ? Number(payload.hourlyRate || 0) : undefined,
  workExperience: payload.workExperience,
  portfolioItems: payload.portfolioItems,
  bankAccountNo: payload.bankAccountNo,
  bankIfsc: payload.bankIfsc,
  bankName: payload.bankName,
  bankHolderName: payload.bankHolderName,
  upiId: payload.upiId,
  category: payload.category,
  phone: payload.phone,
  aadhaarCard: payload.aadhaarCard,
  aadhaarCardPhoto: payload.aadhaarCardPhoto,
  panCard: payload.panCard,
  companyName: payload.companyName,
  companyId: payload.companyId,
  schoolIdCard: payload.schoolIdCard,
});

export const profileApi = {
  getProfile: async (userId) => {
    const url = userId ? `/users/profile?userId=${userId}` : "/users/profile";
    const response = await http.get(url);
    return {
      ...response,
      data: {
        ...response.data,
        profile: normalizeProfile(response?.data?.data),
      },
    };
  },
  updateProfile: async (payload) => {
    const response = await http.put("/users/profile", toProfilePayload(payload));
    return {
      ...response,
      data: {
        ...response.data,
        profile: normalizeProfile(response?.data?.data),
      },
    };
  },
  completeProfile: async (payload) => {
    const response = await http.put("/users/profile/complete", payload);
    return {
      ...response,
      data: {
        ...response.data,
        profile: normalizeProfile(response?.data?.data),
      },
    };
  },
};
