import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "@/services/dashboard-api.service";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  period: (days: number) => [...dashboardQueryKeys.all, days] as const,
};

export function useDashboard(days: number) {
  return useQuery({
    queryKey: dashboardQueryKeys.period(days),
    queryFn: async () => (await dashboardApi.get(days)).data,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
  });
}
