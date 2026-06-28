"use client";

import { CrmListPage } from "@/components/crm/crm-list-page";
import type { Company } from "@/types/crm";

export default function CompaniesPage() {
  return (
    <CrmListPage<Company>
      entity="companies"
      title="Companies"
      description="Organizations and accounts in your pipeline"
      fields={[
        { key: "name", label: "Company name", required: true },
        { key: "domain", label: "Domain", placeholder: "acme.com" },
        { key: "industry", label: "Industry" },
        { key: "size", label: "Size", placeholder: "1-50, 51-200…" },
        { key: "website", label: "Website" },
        { key: "phone", label: "Phone" },
      ]}
      renderItem={(co) => ({
        title: co.name,
        subtitle: [co.industry, co.domain].filter(Boolean).join(" · ") || undefined,
        badges: co.size ? [co.size] : undefined,
      })}
      renderDetailFields={(co) => [
        { label: "Domain", value: co.domain },
        { label: "Industry", value: co.industry },
        { label: "Size", value: co.size },
        { label: "Website", value: co.website },
        { label: "Phone", value: co.phone },
      ]}
    />
  );
}
