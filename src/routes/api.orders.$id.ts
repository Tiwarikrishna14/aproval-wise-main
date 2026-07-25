import { createFileRoute } from "@tanstack/react-router";

import { getSessionToken } from "@/lib/session-cookie";
import { orders } from "@/lib/sample-data";

export const Route = createFileRoute("/api/orders/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!getSessionToken(request)) {
          return Response.json({ message: "Not authenticated." }, { status: 401 });
        }

        const order = orders.find((item) => item.id === params.id);

        if (!order) {
          return Response.json({ message: "Order not found" }, { status: 404 });
        }

        return Response.json(order);
      },
    },
  },
});
