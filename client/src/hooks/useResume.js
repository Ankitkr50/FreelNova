import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resumeApi } from "../api/resume.api.js";
import { PROFILE_QUERY_KEY } from "./useProfile.js";

export const RESUME_QUERY_KEY = ["resume"];

export function useResumeQuery() {
  return useQuery({
    queryKey: RESUME_QUERY_KEY,
    queryFn: async () => {
      const response = await resumeApi.getResume();
      return response?.data?.resume || null;
    },
  });
}

export function useUploadResumeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, username, onProgress }) => resumeApi.uploadResume({ file, username, onProgress }),
    onSuccess: (response) => {
      const resume = response?.data?.resume || null;
      queryClient.setQueryData(RESUME_QUERY_KEY, resume);
      queryClient.setQueryData(PROFILE_QUERY_KEY, (prev) => (prev ? { ...prev, resume } : prev));
    },
  });
}

