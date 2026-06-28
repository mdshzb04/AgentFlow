"use client";

import { CrmListPage } from "@/components/crm/crm-list-page";
import type { Contact } from "@/types/crm";

export default function ContactsPage() {
  return (
    <CrmListPage<Contact>
      entity="contacts"
      title="Contacts"
      description="People you work with across accounts"
      fields={[
        { key: "first_name", label: "First name", required: true },
        { key: "last_name", label: "Last name", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "title", label: "Job title" },
      ]}
      renderItem={(c) => ({
        title: `${c.first_name} ${c.last_name}`,
        subtitle: [c.title, c.email].filter(Boolean).join(" · ") || undefined,
        badges: [c.status],
      })}
      renderDetailFields={(c) => [
        { label: "Email", value: c.email },
        { label: "Phone", value: c.phone },
        { label: "Title", value: c.title },
        { label: "Status", value: c.status },
      ]}
    />
  );
}
