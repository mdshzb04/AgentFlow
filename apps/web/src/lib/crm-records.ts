import { CrmRecordLabelsDocument, type CrmRecordLabelsQuery } from "@/graphql/generated/graphql";
import { getApolloClient } from "@/lib/apollo/client";

export type CrmRelatedType = "lead" | "contact" | "company" | "deal" | "task";

export const CRM_RELATED_TYPE_OPTIONS: { value: CrmRelatedType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
  { value: "deal", label: "Deal" },
  { value: "task", label: "Task" },
];

export interface CrmRecordOption {
  id: string;
  label: string;
  subtitle?: string;
}

const RELATED_TYPE_KEY: Record<CrmRelatedType, keyof CrmRecordLabelsResult> = {
  company: "companies",
  contact: "contacts",
  lead: "leads",
  deal: "deals",
  task: "tasks",
};

type CrmRecordLabelsResult = {
  companies: CrmRecordOption[];
  contacts: CrmRecordOption[];
  leads: CrmRecordOption[];
  deals: CrmRecordOption[];
  tasks: CrmRecordOption[];
};

type RecordLabelRow = CrmRecordLabelsQuery["crmRecordLabels"]["companies"][number];

async function fetchCrmRecordLabels(): Promise<CrmRecordLabelsResult> {
  const { data } = await getApolloClient().query({
    query: CrmRecordLabelsDocument,
    fetchPolicy: "cache-first",
  });

  const labels = data.crmRecordLabels;
  const mapRows = (rows: RecordLabelRow[]): CrmRecordOption[] =>
    rows.map((row) => ({
      id: row.id,
      label: row.label,
      subtitle: row.subtitle ?? undefined,
    }));

  return {
    companies: mapRows(labels.companies),
    contacts: mapRows(labels.contacts),
    leads: mapRows(labels.leads),
    deals: mapRows(labels.deals),
    tasks: mapRows(labels.tasks),
  };
}

export async function listRelatedRecordOptions(
  relatedType: CrmRelatedType,
): Promise<CrmRecordOption[]> {
  const labels = await fetchCrmRecordLabels();
  return labels[RELATED_TYPE_KEY[relatedType]];
}

/** Single GraphQL query replaces five parallel REST list requests. */
export async function buildRecordLabelMap(): Promise<Map<string, string>> {
  const labels = await fetchCrmRecordLabels();
  const map = new Map<string, string>();

  for (const group of Object.values(labels)) {
    for (const row of group) {
      map.set(row.id, row.label);
    }
  }

  return map;
}

export function relatedTypeLabel(relatedType: string) {
  return CRM_RELATED_TYPE_OPTIONS.find((opt) => opt.value === relatedType)?.label ?? relatedType;
}
