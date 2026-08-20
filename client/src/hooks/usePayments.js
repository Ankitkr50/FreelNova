import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../api/payments.api.js";

export function usePaymentStatsQuery() {
  return useQuery({
    queryKey: ["paymentStats"],
    queryFn: async () => {
      const response = await paymentsApi.getStats();
      return response?.data?.data || null;
    },
  });
}
