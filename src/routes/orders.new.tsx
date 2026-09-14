import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { hasPermission, isCustomerAccountUser } from "@/lib/permissions";
import { ordersQueryKeys } from "@/hooks/use-orders";
import { ordersApi, type OrderMutationRequest } from "@/services/orders-api.service";

export const Route = createFileRoute("/orders/new")({
  head: () => ({ meta: [{ title: "Create Order - Akribiz B2B" }] }),
  component: CreateOrder,
});

function CreateOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canCreate = isCustomerAccountUser(user) || hasPermission(user, "ORDER_CREATE");
  const createOrder = useMutation({
    mutationFn: (body: OrderMutationRequest) => ordersApi.create(body),
    onSuccess: async (response) => {
      toast.success("Order saved successfully");
      await queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all });
      const orderId = response.data.id;
      if (orderId) {
        navigate({ to: "/orders/$id", params: { id: String(orderId) } });
      } else {
        navigate({ to: "/orders" });
      }
    },
    onError: (error) => toast.error(error.message),
  });

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-[1400px] rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        Order creation requires ORDER_CREATE.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/orders">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      <PageHeader
        title="Create Order"
        description="Add products and approvers. Empty products or approvers are saved as draft   rules."
      />

      <div className="rounded-xl border border-border bg-card p-5">
        <OrderForm
          mode="create"
          submitLabel="Save Order"
          isSubmitting={createOrder.isPending}
          error={createOrder.isError ? createOrder.error.message : ""}
          onSubmit={(payload) => createOrder.mutate(payload)}
        />
      </div>
    </div>
  );
}
