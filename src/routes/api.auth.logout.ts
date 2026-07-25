import { createFileRoute } from "@tanstack/react-router";

import { clearSessionCookie } from "@/lib/session-cookie";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        Response.json(
          { success: true },
          {
            headers: {
              "Set-Cookie": clearSessionCookie(request),
            },
          },
        ),
    },
  },
});
