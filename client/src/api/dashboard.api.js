import http from "./http";

const percent = (filled, total) => Math.round((filled / total) * 100);

function profileCompletion(profile = {}) {
  const fields = [
    profile.name,
    profile.email,
    profile.headline,
    profile.location,
    profile.bio,
    profile.education,
    profile.experienceYears,
    profile.skills?.length ? "skills" : "",
    profile.portfolioLinks?.length ? "portfolio" : "",
    profile.resumeUrl ? "resume" : "",
  ];
  const filled = fields.filter(Boolean).length;
  return percent(filled, fields.length);
}

export const dashboardApi = {
  getDashboard: async (role) => {
    if (role === "admin") {
      const [users, projects, payments, disputes] = await Promise.all([
        http.get("/admin/users?limit=1"),
        http.get("/admin/projects?limit=1"),
        http.get("/admin/payments?limit=1"),
        http.get("/admin/disputes?limit=1"),
      ]);

      return {
        data: {
          metrics: {
            users: users?.data?.meta?.total || 0,
            projects: projects?.data?.meta?.total || 0,
            applications: 0,
            payments: payments?.data?.meta?.total || 0,
            disputes: disputes?.data?.meta?.total || 0,
          },
        },
      };
    }

    const [profileResponse, projectResponse] = await Promise.all([
      http.get("/users/profile").catch(() => ({ data: { data: {} } })),
      http.get(
        role === "recruiter"
          ? "/projects?limit=15"
          : "/projects?limit=15"
      ).catch(() => ({ data: { data: [] } })),
    ]);

    const profile = profileResponse?.data?.data || {};
    const projects = projectResponse?.data?.data || [];

    if (role === "recruiter") {
      const postedProjects = projects.filter((project) => {
        const pRecId = typeof project.recruiterId === "object" ? project.recruiterId?.id : project.recruiterId;
        const profId = profile.id || profile._id;
        return String(pRecId) === String(profId);
      });
      const totalApplicants = postedProjects.reduce(
        (sum, project) => sum + Number(project.applicationCount || 0),
        0
      );

      return {
        data: {
          metrics: {
            postedProjects: postedProjects.length,
            totalApplicants,
            interviewsScheduled: 0,
          },
          postedProjects: postedProjects.slice(0, 5).map((project) => ({
            id: project.id || project._id,
            projectCode: project.projectCode || "",
            title: project.title,
            category: project.category,
            proposals: Number(project.applicationCount || 0),
            deadline: project.deadline,
          })),
          applicantsSummary: postedProjects.slice(0, 5).map((project) => ({
            id: project.id || project._id,
            projectCode: project.projectCode || "",
            title: project.title,
            applicants: Number(project.applicationCount || 0),
            status: project.status,
            budget: `${project.currency} ${project.budgetMin}-${project.budgetMax}`,
          })),
          quickActions: [
            { label: "Post New Project", path: "/post-project" },
            { label: "My Projects", path: "/my-projects" },
            { label: "Applicants List", path: "/recruiter/applicants" },
            { label: "Select Freelancer", path: "/recruiter/select-freelancer" },
          ],
        },
      };
    }

    return {
      data: {
        profileCompletion: profileCompletion(profile),
        appliedProjects: [],
        recommendedProjects: projects.slice(0, 4).map((project) => ({
          id: project.id || project._id,
          projectCode: project.projectCode || "",
          title: project.title,
          category: project.category,
          matchScore: "70%",
          budget: `${project.currency} ${project.budgetMin}-${project.budgetMax}`,
          skills: (project.skills || []).slice(0, 3),
        })),
      },
    };
  },
};

