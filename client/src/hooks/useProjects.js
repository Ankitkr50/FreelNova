import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects.api.js";

export const PROJECTS_QUERY_KEY = ["projects"];

export function useProjectsQuery() {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const response = await projectsApi.getProjects();
      const list = response?.data?.projects || response?.data?.data || [];
      return Array.from(new Set(list.map((p) => p.id))).map((id) => list.find((p) => p.id === id));
    },
    staleTime: 5000,
  });
}

export function useProjectByIdQuery(projectId) {
  return useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, projectId],
    queryFn: async () => {
      const response = await projectsApi.getProjectById(projectId);
      return response?.data?.project || response?.data?.data || null;
    },
    enabled: Boolean(projectId),
    staleTime: 30000,
  });
}

export function useApplyToProjectMutation(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => projectsApi.applyToProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_QUERY_KEY, projectId] });
    },
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useUpdateProjectStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, status }) => projectsApi.updateProjectStatus(projectId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useProjectApplicantsQuery(projectId) {
  return useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, "applicants", projectId],
    queryFn: async () => {
      const response = await projectsApi.getProjectApplicants(projectId);
      return response?.data?.applicants || [];
    },
    enabled: Boolean(projectId),
  });
}

export function useReviewApplicantMutation(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ applicantId, action }) => projectsApi.reviewApplicant(projectId, applicantId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_QUERY_KEY, "applicants", projectId] });
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_QUERY_KEY, projectId] });
    },
  });
}

export function useSelectFreelancerMutation(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ freelancerId, contractTerms }) =>
      projectsApi.selectFreelancer(projectId, freelancerId, contractTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_QUERY_KEY, projectId] });
    },
  });
}

export function useUpdateMilestoneStatusMutation(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ milestoneIndex, status }) =>
      projectsApi.updateMilestoneStatus(projectId, milestoneIndex, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_QUERY_KEY, projectId] });
    },
  });
}

export function useProjectApplicationsQuery(projectId) {
  return useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, projectId, "applications"],
    queryFn: async () => {
      const response = await projectsApi.getProjectApplications(projectId);
      return response?.data?.applications || response?.data?.data || [];
    },
    enabled: Boolean(projectId),
    staleTime: 30000,
  });
}

export function useAppliedProjectsQuery() {
  return useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, "applied"],
    queryFn: async () => {
      const response = await projectsApi.getAppliedProjects();
      return response?.data?.data || [];
    },
  });
}

export function useFreelancersQuery(params) {
  return useQuery({
    queryKey: ["freelancers", params],
    queryFn: async () => {
      const response = await projectsApi.getFreelancers(params);
      return response?.data?.data || [];
    },
  });
}

