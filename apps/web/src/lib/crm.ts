import { apiRequest } from "@/lib/api";
import type {
  Company,
  Contact,
  Deal,
  Lead,
  Note,
  Task,
} from "@/types/crm";

function crmPath(entity: string) {
  return `/api/v1/crm/${entity}`;
}

export function listCompanies(token: string) {
  return apiRequest<Company[]>(crmPath("companies"), { token });
}

export function createCompany(token: string, data: Partial<Company>) {
  return apiRequest<Company>(crmPath("companies"), {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export function deleteCompany(token: string, id: string) {
  return apiRequest<void>(`${crmPath("companies")}/${id}`, { method: "DELETE", token });
}

export function listContacts(token: string) {
  return apiRequest<Contact[]>(crmPath("contacts"), { token });
}

export function createContact(token: string, data: Partial<Contact>) {
  return apiRequest<Contact>(crmPath("contacts"), {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export function deleteContact(token: string, id: string) {
  return apiRequest<void>(`${crmPath("contacts")}/${id}`, { method: "DELETE", token });
}

export function listLeads(token: string) {
  return apiRequest<Lead[]>(crmPath("leads"), { token });
}

export function createLead(token: string, data: Partial<Lead>) {
  return apiRequest<Lead>(crmPath("leads"), {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export function deleteLead(token: string, id: string) {
  return apiRequest<void>(`${crmPath("leads")}/${id}`, { method: "DELETE", token });
}

export function listDeals(token: string) {
  return apiRequest<Deal[]>(crmPath("deals"), { token });
}

export function createDeal(token: string, data: Partial<Deal>) {
  return apiRequest<Deal>(crmPath("deals"), {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export function deleteDeal(token: string, id: string) {
  return apiRequest<void>(`${crmPath("deals")}/${id}`, { method: "DELETE", token });
}

export function listTasks(token: string) {
  return apiRequest<Task[]>(crmPath("tasks"), { token });
}

export function createTask(token: string, data: Partial<Task>) {
  return apiRequest<Task>(crmPath("tasks"), {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export function deleteTask(token: string, id: string) {
  return apiRequest<void>(`${crmPath("tasks")}/${id}`, { method: "DELETE", token });
}

export function listNotes(token: string) {
  return apiRequest<Note[]>(crmPath("notes"), { token });
}

export function createNote(token: string, data: Partial<Note>) {
  return apiRequest<Note>(crmPath("notes"), {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export function deleteNote(token: string, id: string) {
  return apiRequest<void>(`${crmPath("notes")}/${id}`, { method: "DELETE", token });
}
