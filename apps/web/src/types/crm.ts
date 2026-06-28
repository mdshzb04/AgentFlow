export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type DealStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface Company {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  company_id: string | null;
  contact_id: string | null;
  title: string;
  source: string | null;
  status: LeadStatus;
  score: number | null;
  value: number | null;
  email: string | null;
  phone: string | null;
  notes_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  company_id: string | null;
  contact_id: string | null;
  name: string;
  stage: DealStage;
  amount: number | null;
  currency: string;
  probability: number | null;
  close_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  body: string;
  related_type: string;
  related_id: string;
  created_at: string;
  updated_at: string;
}

export type CrmEntity = "leads" | "contacts" | "companies" | "deals" | "tasks" | "notes";

export const CRM_ENTITIES: {
  key: CrmEntity;
  label: string;
  singular: string;
  href: string;
}[] = [
  { key: "leads", label: "Leads", singular: "Lead", href: "/dashboard/crm/leads" },
  { key: "contacts", label: "Contacts", singular: "Contact", href: "/dashboard/crm/contacts" },
  { key: "companies", label: "Companies", singular: "Company", href: "/dashboard/crm/companies" },
  { key: "deals", label: "Deals", singular: "Deal", href: "/dashboard/crm/deals" },
  { key: "tasks", label: "Tasks", singular: "Task", href: "/dashboard/crm/tasks" },
  { key: "notes", label: "Notes", singular: "Note", href: "/dashboard/crm/notes" },
];
