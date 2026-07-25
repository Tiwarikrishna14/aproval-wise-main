import { createFileRoute } from "@tanstack/react-router";

import type { AuthSession } from "@/services/auth.service";
import { createSessionCookie } from "@/lib/session-cookie";

function createDemoSession(email: string): AuthSession {
  return {
    user: {
      id: "user-001",
      name: "Rahul Sharma",
      email,
      initials: "RS",
      role: "customer",
    },
  };
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { email?: unknown; password?: unknown };
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const password = typeof body.password === "string" ? body.password.trim() : "";

        if (!email || !password) {
          return Response.json({ message: "Email and password are required." }, { status: 400 });
        }

        const dummyToken = `dummy-token-${Date.now()}`;
        const session = createDemoSession(email);

        return Response.json(session, {
          headers: {
            "Set-Cookie": createSessionCookie(dummyToken, request),
          },
        });
      },
    },
  },
});
