import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profile.api.js";

export const PROFILE_QUERY_KEY = ["profile"];

function normalizeProfileResponse(response) {
  return (
    response?.data?.profile ??
    response?.data?.data ??
    response?.profile ?? {
      fullName: "",
      email: "",
      role: "freelancer",
      bio: "",
      skills: [],
      experience: "",
      experienceYears: 0,
      education: "",
      headline: "",
      location: "",
      portfolioLinks: [],
      resume: null,
      ratingAvg: 0,
      ratingCount: 0,
    }
  );
}

export function useProfileQuery(userId) {
  return useQuery({
    queryKey: userId ? [...PROFILE_QUERY_KEY, userId] : PROFILE_QUERY_KEY,
    queryFn: async () => {
      const response = await profileApi.getProfile(userId);
      return normalizeProfileResponse(response);
    },
    staleTime: 60000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: (response) => {
      const updatedData = normalizeProfileResponse(response);
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedData);
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
