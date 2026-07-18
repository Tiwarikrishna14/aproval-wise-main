import { createFileRoute } from "@tanstack/react-router";

import type { AuthSession } from "@/services/auth.service";
import { getSessionToken } from "@/lib/session-cookie";

function createDemoSession(): AuthSession {
  return {
    user: {
      id: "user-001",
      name: "Rahul Sharma",
      email: "rahul@acmeretail.in",
      initials: "RS",
      role: "customer",
    },
  };
}

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getSessionToken(request);

        if (!token) {
          return Response.json({ message: "Not authenticated." }, { status: 401 });
        }

        return Response.json(createDemoSession());
      },
    },
  },
});
