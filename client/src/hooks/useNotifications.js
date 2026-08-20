import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api.js";

export function useNotificationsQuery(params = {}) {
  const { enabled = true, ...queryParams } = params;
  return useQuery({
    queryKey: ["notifications", queryParams],
    queryFn: async () => {
      const response = await notificationsApi.list(queryParams);
      return {
        items: response?.data?.data || [],
        meta: response?.data?.meta || {},
      };
    },
    enabled,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useBroadcastAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => notificationsApi.broadcast(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRecipientsQuery(params = {}) {
  const { enabled = true, ...queryParams } = params;
  return useQuery({
    queryKey: ["notification-recipients", queryParams],
    queryFn: async () => {
      const response = await notificationsApi.searchRecipients(queryParams);
      return response?.data?.data || [];
    },
    enabled,
  });
}

