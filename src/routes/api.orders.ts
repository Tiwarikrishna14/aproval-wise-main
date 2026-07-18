import { createFileRoute } from "@tanstack/react-router";

import { getSessionToken } from "@/lib/session-cookie";
import { orders } from "@/lib/sample-data";

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!getSessionToken(request)) {
          return Response.json({ message: "Not authenticated." }, { status: 401 });
        }

        return Response.json(orders);
      },
    },
  },
});
