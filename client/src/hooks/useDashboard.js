import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api.js";

export function useDashboardQuery(role) {
  return useQuery({
    queryKey: ["dashboard", role],
    queryFn: async () => {
      const response = await dashboardApi.getDashboard(role);
      return response?.data || {};
    },
    enabled: Boolean(role),
    staleTime: 30000,
  });
}

