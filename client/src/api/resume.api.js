import http from "./http";

function mapResumeFromProfile(profile) {
  if (!profile || !profile.resumeUrl) return null;
  return {
    name: profile.resumeName || "Resume.pdf",
    size: profile.resumeSize || 0,
    mimeType: profile.resumeMimeType || "application/pdf",
    uploadedAt: profile.resumeUploadedAt || profile.updatedAt || new Date().toISOString(),
    resumeUrl: profile.resumeUrl,
  };
}

function buildPseudoResumeUrl(file) {
  const safeName = encodeURIComponent(file.name || "resume.pdf");
  return `https://cdn.freelnova.local/resume/${safeName}`;
}

export const resumeApi = {
  getResume: async () => {
    const response = await http.get("/users/profile");
    const resume = mapResumeFromProfile(response?.data?.data);
    return {
      ...response,
      data: {
        ...response.data,
        resume,
      },
    };
  },
  uploadResume: async ({ file, username = "user", onProgress }) => {
    if (onProgress) onProgress(15);
    const safeUsername = username.trim().toLowerCase();
    const formattedName = `${safeUsername}_resume.pdf`;
    const payload = {
      resumeUrl: `https://cdn.freelnova.local/resume/${formattedName}`,
      resumeName: formattedName,
      resumeMimeType: file.type || "application/pdf",
      resumeSize: file.size || 0,
      resumePublicId: "",
    };
    const response = await http.put("/users/profile/resume", payload);
    if (onProgress) onProgress(100);
    return {
      ...response,
      data: {
        ...response.data,
        resume: mapResumeFromProfile(response?.data?.data),
      },
    };
  },
};

