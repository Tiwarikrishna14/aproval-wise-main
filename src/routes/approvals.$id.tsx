import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/approvals/$id")({
  head: () => ({ meta: [{ title: "Approval Review - Akribiz B2B" }] }),
  component: ApprovalReviewBridge,
});

function ApprovalReviewBridge() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/orders/$id", params: { id }, replace: true });
  }, [id, navigate]);

  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      <div>Opening order review...</div>
      <div className="mt-4">
        <Button asChild>
          <Link to="/orders/$id" params={{ id }}>
            Open Order
          </Link>
        </Button>
      </div>
    </div>
  );
}
