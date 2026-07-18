import { useQuery } from "@tanstack/react-query";

import { ordersService } from "@/services/orders.service";

export const ordersQueryKeys = {
  all: ["orders"] as const,
  detail: (id: string) => ["orders", id] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: ordersQueryKeys.all,
    queryFn: ordersService.getOrders,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ordersQueryKeys.detail(id),
    queryFn: () => ordersService.getOrderById(id),
    enabled: Boolean(id),
  });
}
