"use client";

import { CrmListPage } from "@/components/crm/crm-list-page";
import type { Lead } from "@/types/crm";

export default function LeadsPage() {
  return (
    <CrmListPage<Lead>
      entity="leads"
      title="Leads"
      description="Track and qualify inbound sales leads"
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "Enterprise SaaS opportunity" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "source", label: "Source", placeholder: "Website, referral, event…" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" },
            { value: "qualified", label: "Qualified" },
            { value: "converted", label: "Converted" },
            { value: "lost", label: "Lost" },
          ],
        },
        { key: "score", label: "Score", type: "number" },
        { key: "notes_summary", label: "Notes", type: "textarea" },
      ]}
      defaultValues={{ status: "new" }}
      renderItem={(lead) => ({
        title: lead.title,
        subtitle: [lead.email, lead.source].filter(Boolean).join(" · ") || undefined,
        badges: [
          lead.status,
          lead.score != null ? `Score ${lead.score}` : "",
        ].filter(Boolean),
      })}
      renderDetailFields={(lead) => [
        { label: "Email", value: lead.email },
        { label: "Phone", value: lead.phone },
        { label: "Source", value: lead.source },
        { label: "Status", value: lead.status },
        { label: "Score", value: lead.score != null ? String(lead.score) : null },
      ]}
    />
  );
}
