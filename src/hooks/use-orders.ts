import { useQuery } from "@tanstack/react-query";

import { ordersApi, type OrderListQuery } from "@/services/orders-api.service";

export const ordersQueryKeys = {
  all: ["orders"] as const,
  list: (query?: OrderListQuery) => ["orders", "list", query] as const,
  detail: (id: string) => ["orders", id] as const,
};

export function useOrders(query?: OrderListQuery) {
  return useQuery({
    queryKey: ordersQueryKeys.list(query),
    queryFn: async () => (await ordersApi.list(query)).data,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ordersQueryKeys.detail(id),
    queryFn: async () => (await ordersApi.get(id)).data,
    enabled: Boolean(id),
    retry: false,
  });
}
