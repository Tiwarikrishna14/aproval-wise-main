import { ordersApi } from "./domain-api.service";

export const ordersService = {
  getOrders: ordersApi.list,
  getOrderById: ordersApi.get,
};
