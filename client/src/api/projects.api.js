import http from "./http";

const formatDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const parseTimelineDays = (timeline) => {
  if (typeof timeline === "number") return timeline;
  const str = String(timeline || "").trim().toLowerCase();
  const numMatch = str.match(/\d+/);
  if (!numMatch) return 14;
  const parsed = Number(numMatch[0]);
  if (!Number.isFinite(parsed) || parsed <= 0) return 14;
  
  if (str.includes("week")) {
    return parsed * 7;
  }
  if (str.includes("month")) {
    return parsed * 30;
  }
  return parsed;
};

const formatTimeline = (days) => {
  if (!days) return "N/A";
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  if (days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} week${weeks > 1 ? "s" : ""}`;
  }
  return `${days} day${days > 1 ? "s" : ""}`;
};

const normalizeProject = (project) => {
  if (!project) return null;
  const recruiter = project.recruiterId || {};
  return {
    id: project._id || project.id,
    projectCode: project.projectCode || "",
    title: project.title,
    description: project.description || "",
    category: project.category || "General",
    budgetMin: Number(project.budgetMin || 0),
    budgetMax: Number(project.budgetMax || 0),
    currency: project.currency || "INR",
    skills: project.skills || [],
    timeline: formatTimeline(project.timelineDays),
    timelineDays: Number(project.timelineDays || 0),
    deadline: formatDate(project.deadline),
    postedAt: project.createdAt || project.postedAt,
    proposalsCount: Number(project.applicationCount || 0),
    status: project.status || "posted",
    requirements: project.requirements || [],
    recruiter: {
      id: recruiter._id || recruiter.id || null,
      name: recruiter.name || "Recruiter",
      company: recruiter.companyName || recruiter.company || "FreelNova",
      rating: recruiter.ratingAvg !== undefined ? recruiter.ratingAvg : (recruiter.rating || 0),
      projectsPosted: recruiter.projectsPosted || 0,
      email: recruiter.email || "",
      isVerified: recruiter.isVerified || false,
      createdAt: recruiter.createdAt || null,
      totalSpent: recruiter.totalSpent || 0,
    },
  };
};

export const projectsApi = {
  getProjects: async (params = {}) => {
    const response = await http.get("/projects", { params });
    const rows = response?.data?.data || [];
    const normalized = rows.map(normalizeProject).filter(Boolean);
    const unique = Array.from(new Set(normalized.map((p) => p.id))).map((id) => normalized.find((p) => p.id === id));
    return {
      ...response,
      data: {
        ...response.data,
        projects: unique,
        data: unique,
      },
    };
  },
  getProjectById: async (projectId) => {
    const response = await http.get(`/projects/${projectId}`);
    return {
      ...response,
      data: {
        ...response.data,
        project: normalizeProject(response?.data?.data),
      },
    };
  },
  applyToProject: (projectId, payload) =>
    http.post(`/projects/${projectId}/apply`, {
      proposal: payload.proposal,
      bidAmount: payload.bidAmount,
      deliveryDays: payload.deliveryDays,
    }),
  createProject: async (payload) => {
    const response = await http.post("/projects", {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      budgetMin: Number(payload.budgetMin),
      budgetMax: Number(payload.budgetMax),
      currency: "INR",
      skills: payload.skills || [],
      timelineDays: parseTimelineDays(payload.timeline),
      deadline: payload.deadline,
      status: "posted",
    });

    return {
      ...response,
      data: {
        ...response.data,
        project: normalizeProject(response?.data?.data),
      },
    };
  },
  updateProjectStatus: (projectId, status) => http.patch(`/projects/${projectId}/status`, { status }),
  getProjectApplicants: async (projectId) => {
    const response = await http.get(`/projects/${projectId}/applicants`);
    return {
      ...response,
      data: {
        ...response.data,
        applicants: response?.data?.data?.applicants || [],
      },
    };
  },
  reviewApplicant: (projectId, applicantId, action) =>
    http.post(`/projects/${projectId}/applicants/${applicantId}/review`, { action }),
  getAppliedProjects: async () => {
    const response = await http.get("/projects/applied");
    return response;
  },
  getFreelancers: async (params = {}) => {
    const response = await http.get("/users", { params });
    return response;
  },
};

