import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, LockKeyhole, LogIn, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login - StockFlow B2B" },
      { name: "description", content: "Sign in to StockFlow B2B." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("rahul@acmeretail.in");
  const [password, setPassword] = useState("password");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate({ to: "/", replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
      <section className="hidden bg-navy px-10 py-8 text-navy-foreground lg:flex lg:flex-col">
        <Logo />
        <div className="mt-auto max-w-md">
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
            Approval operations
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            Sign in to manage orders, stock, and approvals.
          </h1>
          <p className="mt-4 text-sm leading-6 text-navy-foreground/75">
            Secure access keeps operational data available only to signed-in team members.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[420px] rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Login</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="mr-1.5 h-4 w-4" />
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
