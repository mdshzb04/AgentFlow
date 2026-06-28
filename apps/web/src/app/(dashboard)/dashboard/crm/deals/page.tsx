"use client";

import { CrmListPage } from "@/components/crm/crm-list-page";
import type { Deal } from "@/types/crm";

export default function DealsPage() {
  return (
    <CrmListPage<Deal>
      entity="deals"
      title="Deals"
      description="Opportunities and revenue pipeline"
      fields={[
        { key: "name", label: "Deal name", required: true },
        {
          key: "stage",
          label: "Stage",
          type: "select",
          options: [
            { value: "prospecting", label: "Prospecting" },
            { value: "qualification", label: "Qualification" },
            { value: "proposal", label: "Proposal" },
            { value: "negotiation", label: "Negotiation" },
            { value: "closed_won", label: "Closed won" },
            { value: "closed_lost", label: "Closed lost" },
          ],
        },
        { key: "amount", label: "Amount", type: "number" },
        { key: "probability", label: "Probability %", type: "number" },
        { key: "close_date", label: "Close date", type: "date" },
      ]}
      defaultValues={{ stage: "prospecting", currency: "USD" }}
      renderItem={(deal) => ({
        title: deal.name,
        subtitle:
          deal.amount != null
            ? `${deal.currency} ${Number(deal.amount).toLocaleString()}`
            : undefined,
        badges: [deal.stage, deal.probability != null ? `${deal.probability}%` : ""].filter(
          Boolean,
        ),
      })}
      renderDetailFields={(deal) => [
        { label: "Stage", value: deal.stage },
        {
          label: "Amount",
          value:
            deal.amount != null ? `${deal.currency} ${Number(deal.amount).toLocaleString()}` : null,
        },
        {
          label: "Probability",
          value: deal.probability != null ? `${deal.probability}%` : null,
        },
        { label: "Close date", value: deal.close_date },
      ]}
    />
  );
}
