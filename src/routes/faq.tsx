import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Search } from "lucide-react";

import { DataError, EmptyState } from "@/components/data-state";
import { PageHeader } from "@/components/page-parts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useFaqs } from "@/hooks/use-domain-data";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "Help & FAQ - StockFlow B2B" }] }),
  component: FaqPage,
});

function FaqPage() {
  const { data: faqs = [], isLoading, isError, error } = useFaqs();
  const categories = [
    ...new Set(
      faqs.map((faq) => faq.category).filter((category): category is string => Boolean(category)),
    ),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Help & FAQ"
        description="Search common questions or contact support for anything else."
        actions={
          <Button disabled>
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Contact Support
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-11 w-full rounded-lg border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          placeholder="Search FAQ..."
        />
      </div>

      {isError ? (
        <DataError message={`Failed to load FAQs: ${error.message}`} />
      ) : isLoading ? (
        <EmptyState message="Loading FAQs from backend..." />
      ) : faqs.length === 0 ? (
        <EmptyState message="No FAQs returned by backend." />
      ) : (
        <>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  disabled
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-2">
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.id ?? index} value={`q${index}`}>
                  <AccordionTrigger className="px-4 text-sm font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      )}
    </div>
  );
}
