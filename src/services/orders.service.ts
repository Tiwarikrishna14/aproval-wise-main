import type { Order } from "@/lib/sample-data";
import { apiGet } from "./api-client";

export const ordersService = {
  getOrders: () => apiGet<Order[]>("/api/orders"),

  getOrderById: (id: string) => apiGet<Order>(`/api/orders/${encodeURIComponent(id)}`),
};
