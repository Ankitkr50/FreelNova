import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api.js";
import { getAccessToken } from "../utils/authStorage.js";

export function useDashboardQuery(role) {
  const token = getAccessToken();
  return useQuery({
    queryKey: ["dashboard", role],
    queryFn: async () => {
      const response = await dashboardApi.getDashboard(role);
      return response?.data || {};
    },
    enabled: Boolean(role && token),
    staleTime: 30000,
  });
}

