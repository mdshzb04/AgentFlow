import type {
  CompanyFieldsFragment,
  ContactFieldsFragment,
  DealFieldsFragment,
  LeadFieldsFragment,
  NoteFieldsFragment,
  TaskFieldsFragment,
} from "@/graphql/generated/graphql";
import type { Company, Contact, Deal, Lead, Note, Task } from "@/types/crm";

export function mapCompany(node: CompanyFieldsFragment): Company {
  return {
    id: node.id,
    user_id: "",
    name: node.name,
    domain: node.domain ?? null,
    industry: node.industry ?? null,
    size: node.size ?? null,
    website: node.website ?? null,
    phone: node.phone ?? null,
    address: node.address ?? null,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function mapContact(node: ContactFieldsFragment): Contact {
  return {
    id: node.id,
    user_id: "",
    company_id: node.companyId ?? null,
    first_name: node.firstName,
    last_name: node.lastName,
    email: node.email ?? null,
    phone: node.phone ?? null,
    title: node.title ?? null,
    status: node.status,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function mapLead(node: LeadFieldsFragment): Lead {
  return {
    id: node.id,
    user_id: "",
    company_id: node.companyId ?? null,
    contact_id: node.contactId ?? null,
    title: node.title,
    source: node.source ?? null,
    status: node.status,
    score: node.score ?? null,
    value: node.value ?? null,
    email: node.email ?? null,
    phone: node.phone ?? null,
    notes_summary: node.notesSummary ?? null,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function mapDeal(node: DealFieldsFragment): Deal {
  return {
    id: node.id,
    user_id: "",
    company_id: node.companyId ?? null,
    contact_id: node.contactId ?? null,
    name: node.name,
    stage: node.stage,
    amount: node.amount ?? null,
    currency: node.currency,
    probability: node.probability ?? null,
    close_date: node.closeDate ?? null,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function mapTask(node: TaskFieldsFragment): Task {
  return {
    id: node.id,
    user_id: "",
    title: node.title,
    description: node.description ?? null,
    status: node.status,
    priority: node.priority,
    due_date: node.dueDate ?? null,
    related_type: node.relatedType ?? null,
    related_id: node.relatedId ?? null,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}

export function mapNote(node: NoteFieldsFragment): Note {
  return {
    id: node.id,
    user_id: "",
    body: node.body,
    related_type: node.relatedType,
    related_id: node.relatedId,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
  };
}
