import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "Help & FAQ — StockFlow B2B" }] }),
  component: FaqPage,
});

const CATEGORIES = ["Orders", "Approvals", "Inventory", "Deliveries", "Returns", "Billing", "Account"];

const QAS = [
  { q: "How do I create an order?", a: "Go to Orders > Create Order. Fill in delivery info, add products, and submit for approval." },
  { q: "Who approves my order?", a: "Approval steps depend on your organization's configured workflow. Typical flow: Order Review > Stock Verification > Finance > Final Approval." },
  { q: "How is a low-stock threshold set?", a: "Thresholds are set per SKU on the Stock Details page under Settings. You can also request a change from your administrator." },
  { q: "Can I archive stock I no longer need?", a: "Yes. Open any inventory item and choose Archive. History remains available but the item is hidden from active views." },
  { q: "What happens when a stock request is partially approved?", a: "The approved portion converts to an order; the remaining quantity closes with a reason logged in the audit trail." },
];

function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Help & FAQ" description="Search common questions or contact support for anything else." actions={<Button><MessageCircle className="mr-1.5 h-4 w-4" />Contact Support</Button>} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className="h-11 w-full rounded-lg border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15" placeholder="Search FAQ…" />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c, i) => (
          <button key={c} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${i === 0 ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface"}`}>{c}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-2">
        <Accordion type="single" collapsible defaultValue="q0">
          {QAS.map((qa, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="px-4 text-sm font-medium">{qa.q}</AccordionTrigger>
              <AccordionContent className="px-4 text-sm text-muted-foreground">{qa.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
